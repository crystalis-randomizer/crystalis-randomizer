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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2pzL3JvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDN0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRXZDLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUUvQyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUM3QyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDckMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUM1QyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQWMsWUFBWSxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDL0QsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFFbEMsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFB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QUssTUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksV0FBVyxFQUFFO1lBQy9DLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHO2dCQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDO1NBQzFEO1FBaUJELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLElBQUksR0FB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QUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBR3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFHckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBR3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7Q0FDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IHtBc3NlbWJsZXJ9IGZyb20gJy4vYXNtL2Fzc2VtYmxlci5qcyc7XG5pbXBvcnQge0Fzc2VtYmxlcn0gZnJvbSAnLi9hc20vYXNzZW1ibGVyLmpzJztcbmltcG9ydCB7TGlua2VyfSBmcm9tICcuL2FzbS9saW5rZXIuanMnO1xuaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4vYXNtL21vZHVsZS5qcyc7XG5pbXBvcnQge0FkSG9jU3Bhd259IGZyb20gJy4vcm9tL2FkaG9jc3Bhd24uanMnO1xuLy9pbXBvcnQge0FyZWFzfSBmcm9tICcuL3JvbS9hcmVhLmpzJztcbmltcG9ydCB7Qm9zc0tpbGx9IGZyb20gJy4vcm9tL2Jvc3NraWxsLmpzJztcbmltcG9ydCB7Qm9zc2VzfSBmcm9tICcuL3JvbS9ib3NzZXMuanMnO1xuaW1wb3J0IHtDb2luRHJvcHN9IGZyb20gJy4vcm9tL2NvaW5kcm9wcy5qcyc7XG5pbXBvcnQge0ZsYWdzfSBmcm9tICcuL3JvbS9mbGFncy5qcyc7XG5pbXBvcnQge0hpdGJveH0gZnJvbSAnLi9yb20vaGl0Ym94LmpzJztcbmltcG9ydCB7SXRlbXN9IGZyb20gJy4vcm9tL2l0ZW0uanMnO1xuaW1wb3J0IHtJdGVtR2V0c30gZnJvbSAnLi9yb20vaXRlbWdldC5qcyc7XG5pbXBvcnQge0xvY2F0aW9uc30gZnJvbSAnLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtNZXNzYWdlc30gZnJvbSAnLi9yb20vbWVzc2FnZXMuanMnO1xuaW1wb3J0IHtNZXRhc2NyZWVuc30gZnJvbSAnLi9yb20vbWV0YXNjcmVlbnMuanMnO1xuaW1wb3J0IHtNZXRhc3ByaXRlfSBmcm9tICcuL3JvbS9tZXRhc3ByaXRlLmpzJztcbmltcG9ydCB7TWV0YXRpbGVzZXQsIE1ldGF0aWxlc2V0c30gZnJvbSAnLi9yb20vbWV0YXRpbGVzZXQuanMnO1xuaW1wb3J0IHtNb25zdGVyfSBmcm9tICcuL3JvbS9tb25zdGVyLmpzJztcbmltcG9ydCB7TnBjc30gZnJvbSAnLi9yb20vbnBjLmpzJztcbmltcG9ydCB7T2JqZWN0RGF0YX0gZnJvbSAnLi9yb20vb2JqZWN0ZGF0YS5qcyc7XG5pbXBvcnQge09iamVjdHN9IGZyb20gJy4vcm9tL29iamVjdHMuanMnO1xuaW1wb3J0IHtSb21PcHRpb259IGZyb20gJy4vcm9tL29wdGlvbi5qcyc7XG5pbXBvcnQge1BhbGV0dGV9IGZyb20gJy4vcm9tL3BhbGV0dGUuanMnO1xuaW1wb3J0IHtQYXR0ZXJufSBmcm9tICcuL3JvbS9wYXR0ZXJuLmpzJztcbmltcG9ydCB7UmFuZG9tTnVtYmVyc30gZnJvbSAnLi9yb20vcmFuZG9tbnVtYmVycy5qcyc7XG5pbXBvcnQge1NjYWxpbmd9IGZyb20gJy4vcm9tL3NjYWxpbmcuanMnO1xuaW1wb3J0IHtTY3JlZW4sIFNjcmVlbnN9IGZyb20gJy4vcm9tL3NjcmVlbi5qcyc7XG5pbXBvcnQge1Nob3BzfSBmcm9tICcuL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7U2xvdHN9IGZyb20gJy4vcm9tL3Nsb3RzLmpzJztcbmltcG9ydCB7U3BvaWxlcn0gZnJvbSAnLi9yb20vc3BvaWxlci5qcyc7XG5pbXBvcnQge1RlbGVwYXRoeX0gZnJvbSAnLi9yb20vdGVsZXBhdGh5LmpzJztcbmltcG9ydCB7VGlsZUFuaW1hdGlvbn0gZnJvbSAnLi9yb20vdGlsZWFuaW1hdGlvbi5qcyc7XG5pbXBvcnQge1RpbGVFZmZlY3RzfSBmcm9tICcuL3JvbS90aWxlZWZmZWN0cy5qcyc7XG5pbXBvcnQge1RpbGVzZXRzfSBmcm9tICcuL3JvbS90aWxlc2V0LmpzJztcbmltcG9ydCB7VG93bldhcnB9IGZyb20gJy4vcm9tL3Rvd253YXJwLmpzJztcbmltcG9ydCB7VHJpZ2dlcn0gZnJvbSAnLi9yb20vdHJpZ2dlci5qcyc7XG5pbXBvcnQge1NlZ21lbnQsIGhleCwgc2VxLCBmcmVlfSBmcm9tICcuL3JvbS91dGlsLmpzJztcbmltcG9ydCB7V2lsZFdhcnB9IGZyb20gJy4vcm9tL3dpbGR3YXJwLmpzJztcbmltcG9ydCB7VW5pb25GaW5kfSBmcm9tICcuL3VuaW9uZmluZC5qcyc7XG5cbmNvbnN0IHskMGUsICQwZiwgJDEwfSA9IFNlZ21lbnQ7XG5cbi8vIEEga25vd24gbG9jYXRpb24gZm9yIGRhdGEgYWJvdXQgc3RydWN0dXJhbCBjaGFuZ2VzIHdlJ3ZlIG1hZGUgdG8gdGhlIHJvbS5cbi8vIFRoZSB0cmljayBpcyB0byBmaW5kIGEgc3VpdGFibGUgcmVnaW9uIG9mIFJPTSB0aGF0J3MgYm90aCB1bnVzZWQgKmFuZCpcbi8vIGlzIG5vdCBwYXJ0aWN1bGFybHkgKnVzYWJsZSogZm9yIG91ciBwdXJwb3Nlcy4gIFRoZSBib3R0b20gMyByb3dzIG9mIHRoZVxuLy8gdmFyaW91cyBzaW5nbGUtc2NyZWVuIG1hcHMgYXJlIGFsbCBlZmZlY3RpdmVseSB1bnVzZWQsIHNvIHRoYXQgZ2l2ZXMgNDhcbi8vIGJ5dGVzIHBlciBtYXAuICBTaG9wcyAoMTQwMDAuLjE0MmZmKSBhbHNvIGhhdmUgYSBnaWFudCBhcmVhIHVwIHRvcCB0aGF0XG4vLyBjb3VsZCBwb3NzaWJseSBiZSB1c2FibGUsIHRob3VnaCB3ZSdkIG5lZWQgdG8gdGVhY2ggdGhlIHRpbGUtcmVhZGluZyBjb2RlXG4vLyB0byBpZ25vcmUgd2hhdGV2ZXIncyB3cml0dGVuIHRoZXJlLCBzaW5jZSBpdCAqaXMqIHZpc2libGUgYmVmb3JlIHRoZSBtZW51XG4vLyBwb3BzIHVwLiAgVGhlc2UgYXJlIGJpZyBlbm91Z2ggcmVnaW9ucyB0aGF0IHdlIGNvdWxkIGV2ZW4gY29uc2lkZXIgdXNpbmdcbi8vIHRoZW0gdmlhIHBhZ2Utc3dhcHBpbmcgdG8gZ2V0IGV4dHJhIGRhdGEgaW4gYXJiaXRyYXJ5IGNvbnRleHRzLlxuXG4vLyBTaG9wcyBhcmUgcGFydGljdWxhcmx5IG5pY2UgYmVjYXVzZSB0aGV5J3JlIGFsbCAwMCBpbiB2YW5pbGxhLlxuLy8gT3RoZXIgcG9zc2libGUgcmVnaW9uczpcbi8vICAgLSA0OCBieXRlcyBhdCAkZmZjMCAobWV6YW1lIHNocmluZSkgPT4gJGZmZTAgaXMgYWxsICRmZiBpbiB2YW5pbGxhLlxuXG5leHBvcnQgY2xhc3MgUm9tIHtcblxuICAvLyBUaGVzZSB2YWx1ZXMgY2FuIGJlIHF1ZXJpZWQgdG8gZGV0ZXJtaW5lIGhvdyB0byBwYXJzZSBhbnkgZ2l2ZW4gcm9tLlxuICAvLyBUaGV5J3JlIGFsbCBhbHdheXMgemVybyBmb3IgdmFuaWxsYVxuICBzdGF0aWMgcmVhZG9ubHkgT01JVF9JVEVNX0dFVF9EQVRBX1NVRkZJWCAgICA9IFJvbU9wdGlvbi5iaXQoMHgxNDJjMCwgMCk7XG4gIHN0YXRpYyByZWFkb25seSBPTUlUX0xPQ0FMX0RJQUxPR19TVUZGSVggICAgID0gUm9tT3B0aW9uLmJpdCgweDE0MmMwLCAxKTtcbiAgc3RhdGljIHJlYWRvbmx5IENPTVBSRVNTRURfTUFQREFUQSAgICAgICAgICAgPSBSb21PcHRpb24uYml0KDB4MTQyYzAsIDIpO1xuICBzdGF0aWMgcmVhZG9ubHkgU0hPUF9DT1VOVCAgICAgICAgICAgICAgICAgICA9IFJvbU9wdGlvbi5ieXRlKDB4MTQyYzEpO1xuICBzdGF0aWMgcmVhZG9ubHkgU0NBTElOR19MRVZFTFMgICAgICAgICAgICAgICA9IFJvbU9wdGlvbi5ieXRlKDB4MTQyYzIpO1xuICBzdGF0aWMgcmVhZG9ubHkgVU5JUVVFX0lURU1fVEFCTEUgICAgICAgICAgICA9IFJvbU9wdGlvbi5hZGRyZXNzKDB4MTQyZDApO1xuICBzdGF0aWMgcmVhZG9ubHkgU0hPUF9EQVRBX1RBQkxFUyAgICAgICAgICAgICA9IFJvbU9wdGlvbi5hZGRyZXNzKDB4MTQyZDMpO1xuICBzdGF0aWMgcmVhZG9ubHkgVEVMRVBBVEhZX1RBQkxFUyAgICAgICAgICAgICA9IFJvbU9wdGlvbi5hZGRyZXNzKDB4MTQyZDYpO1xuXG4gIHJlYWRvbmx5IHByZzogVWludDhBcnJheTtcbiAgcmVhZG9ubHkgY2hyOiBVaW50OEFycmF5O1xuXG4gIC8vIFRPRE8gLSB3b3VsZCBiZSBuaWNlIHRvIGVsaW1pbmF0ZSB0aGUgZHVwbGljYXRpb24gYnkgbW92aW5nXG4gIC8vIHRoZSBjdG9ycyBoZXJlLCBidXQgdGhlcmUncyBsb3RzIG9mIHByZXJlcXMgYW5kIGRlcGVuZGVuY3lcbiAgLy8gb3JkZXJpbmcsIGFuZCB3ZSBuZWVkIHRvIG1ha2UgdGhlIEFESlVTVE1FTlRTLCBldGMuXG4gIC8vcmVhZG9ubHkgYXJlYXM6IEFyZWFzO1xuICByZWFkb25seSBzY3JlZW5zOiBTY3JlZW5zO1xuICByZWFkb25seSB0aWxlc2V0czogVGlsZXNldHM7XG4gIHJlYWRvbmx5IHRpbGVFZmZlY3RzOiBUaWxlRWZmZWN0c1tdO1xuICByZWFkb25seSB0cmlnZ2VyczogVHJpZ2dlcltdO1xuICByZWFkb25seSBwYXR0ZXJuczogUGF0dGVybltdO1xuICByZWFkb25seSBwYWxldHRlczogUGFsZXR0ZVtdO1xuICByZWFkb25seSBsb2NhdGlvbnM6IExvY2F0aW9ucztcbiAgcmVhZG9ubHkgdGlsZUFuaW1hdGlvbnM6IFRpbGVBbmltYXRpb25bXTtcbiAgcmVhZG9ubHkgaGl0Ym94ZXM6IEhpdGJveFtdO1xuICByZWFkb25seSBvYmplY3RzOiBPYmplY3RzO1xuICByZWFkb25seSBhZEhvY1NwYXduczogQWRIb2NTcGF3bltdO1xuICByZWFkb25seSBtZXRhc2NyZWVuczogTWV0YXNjcmVlbnM7XG4gIHJlYWRvbmx5IG1ldGFzcHJpdGVzOiBNZXRhc3ByaXRlW107XG4gIHJlYWRvbmx5IG1ldGF0aWxlc2V0czogTWV0YXRpbGVzZXRzO1xuICByZWFkb25seSBpdGVtR2V0czogSXRlbUdldHM7XG4gIHJlYWRvbmx5IGl0ZW1zOiBJdGVtcztcbiAgcmVhZG9ubHkgc2hvcHM6IFNob3BzO1xuICByZWFkb25seSBzbG90czogU2xvdHM7XG4gIHJlYWRvbmx5IG5wY3M6IE5wY3M7XG4gIHJlYWRvbmx5IGJvc3NLaWxsczogQm9zc0tpbGxbXTtcbiAgcmVhZG9ubHkgYm9zc2VzOiBCb3NzZXM7XG4gIHJlYWRvbmx5IHdpbGRXYXJwOiBXaWxkV2FycDtcbiAgcmVhZG9ubHkgdG93bldhcnA6IFRvd25XYXJwO1xuICByZWFkb25seSBmbGFnczogRmxhZ3M7XG4gIHJlYWRvbmx5IGNvaW5Ecm9wczogQ29pbkRyb3BzO1xuICByZWFkb25seSBzY2FsaW5nOiBTY2FsaW5nO1xuICByZWFkb25seSByYW5kb21OdW1iZXJzOiBSYW5kb21OdW1iZXJzO1xuXG4gIHJlYWRvbmx5IHRlbGVwYXRoeTogVGVsZXBhdGh5O1xuICByZWFkb25seSBtZXNzYWdlczogTWVzc2FnZXM7XG5cbiAgcmVhZG9ubHkgbW9kdWxlczogTW9kdWxlW10gPSBbXTtcblxuICBzcG9pbGVyPzogU3BvaWxlcjtcblxuICAvLyBOT1RFOiBUaGUgZm9sbG93aW5nIHByb3BlcnRpZXMgbWF5IGJlIGNoYW5nZWQgYmV0d2VlbiByZWFkaW5nIGFuZCB3cml0aW5nXG4gIC8vIHRoZSByb20uICBJZiB0aGlzIGhhcHBlbnMsIHRoZSB3cml0dGVuIHJvbSB3aWxsIGhhdmUgZGlmZmVyZW50IG9wdGlvbnMuXG4gIC8vIFRoaXMgaXMgYW4gZWZmZWN0aXZlIHdheSB0byBjb252ZXJ0IGJldHdlZW4gdHdvIHN0eWxlcy5cblxuICAvLyBNYXggbnVtYmVyIG9mIHNob3BzLiAgVmFyaW91cyBibG9ja3Mgb2YgbWVtb3J5IHJlcXVpcmUga25vd2luZyB0aGlzIG51bWJlclxuICAvLyB0byBhbGxvY2F0ZS5cbiAgc2hvcENvdW50OiBudW1iZXI7XG4gIC8vIE51bWJlciBvZiBzY2FsaW5nIGxldmVscy4gIERldGVybWluZXMgdGhlIHNpemUgb2YgdGhlIHNjYWxpbmcgdGFibGVzLlxuICBzY2FsaW5nTGV2ZWxzOiBudW1iZXI7XG5cbiAgLy8gQWRkcmVzcyB0byByZWFkL3dyaXRlIHRoZSBiaXRmaWVsZCBpbmRpY2F0aW5nIHVuaXF1ZSBpdGVtcy5cbiAgdW5pcXVlSXRlbVRhYmxlQWRkcmVzczogbnVtYmVyO1xuICAvLyBBZGRyZXNzIG9mIG5vcm1hbGl6ZWQgcHJpY2VzIHRhYmxlLCBpZiBwcmVzZW50LiAgSWYgdGhpcyBpcyBhYnNlbnQgdGhlbiB3ZVxuICAvLyBhc3N1bWUgcHJpY2VzIGFyZSBub3Qgbm9ybWFsaXplZCBhbmQgYXJlIGF0IHRoZSBub3JtYWwgcGF3biBzaG9wIGFkZHJlc3MuXG4gIHNob3BEYXRhVGFibGVzQWRkcmVzczogbnVtYmVyO1xuICAvLyBBZGRyZXNzIG9mIHJlYXJyYW5nZWQgdGVsZXBhdGh5IHRhYmxlcy5cbiAgdGVsZXBhdGh5VGFibGVzQWRkcmVzczogbnVtYmVyO1xuICAvLyBXaGV0aGVyIHRoZSB0cmFpbGluZyAkZmYgc2hvdWxkIGJlIG9taXR0ZWQgZnJvbSB0aGUgSXRlbUdldERhdGEgdGFibGUuXG4gIG9taXRJdGVtR2V0RGF0YVN1ZmZpeDogYm9vbGVhbjtcbiAgLy8gV2hldGhlciB0aGUgdHJhaWxpbmcgYnl0ZSBvZiBlYWNoIExvY2FsRGlhbG9nIGlzIG9taXR0ZWQuICBUaGlzIGFmZmVjdHNcbiAgLy8gYm90aCByZWFkaW5nIGFuZCB3cml0aW5nIHRoZSB0YWJsZS4gIE1heSBiZSBpbmZlcnJlZCB3aGlsZSByZWFkaW5nLlxuICBvbWl0TG9jYWxEaWFsb2dTdWZmaXg6IGJvb2xlYW47XG4gIC8vIFdoZXRoZXIgbWFwZGF0YSBoYXMgYmVlbiBjb21wcmVzc2VkLlxuICBjb21wcmVzc2VkTWFwRGF0YTogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3Rvcihyb206IFVpbnQ4QXJyYXkpIHtcbiAgICBjb25zdCBwcmdTaXplID0gcm9tWzRdICogMHg0MDAwO1xuICAgIC8vIE5PVEU6IGNoclNpemUgPSByb21bNV0gKiAweDIwMDA7XG4gICAgY29uc3QgcHJnU3RhcnQgPSAweDEwICsgKHJvbVs2XSAmIDQgPyA1MTIgOiAwKTtcbiAgICBjb25zdCBwcmdFbmQgPSBwcmdTdGFydCArIHByZ1NpemU7XG4gICAgdGhpcy5wcmcgPSByb20uc3ViYXJyYXkocHJnU3RhcnQsIHByZ0VuZCk7XG4gICAgdGhpcy5jaHIgPSByb20uc3ViYXJyYXkocHJnRW5kKTtcblxuICAgIHRoaXMuc2hvcENvdW50ID0gUm9tLlNIT1BfQ09VTlQuZ2V0KHJvbSk7XG4gICAgdGhpcy5zY2FsaW5nTGV2ZWxzID0gUm9tLlNDQUxJTkdfTEVWRUxTLmdldChyb20pO1xuICAgIHRoaXMudW5pcXVlSXRlbVRhYmxlQWRkcmVzcyA9IFJvbS5VTklRVUVfSVRFTV9UQUJMRS5nZXQocm9tKTtcbiAgICB0aGlzLnNob3BEYXRhVGFibGVzQWRkcmVzcyA9IFJvbS5TSE9QX0RBVEFfVEFCTEVTLmdldChyb20pO1xuICAgIHRoaXMudGVsZXBhdGh5VGFibGVzQWRkcmVzcyA9IFJvbS5URUxFUEFUSFlfVEFCTEVTLmdldChyb20pO1xuICAgIHRoaXMub21pdEl0ZW1HZXREYXRhU3VmZml4ID0gUm9tLk9NSVRfSVRFTV9HRVRfREFUQV9TVUZGSVguZ2V0KHJvbSk7XG4gICAgdGhpcy5vbWl0TG9jYWxEaWFsb2dTdWZmaXggPSBSb20uT01JVF9MT0NBTF9ESUFMT0dfU1VGRklYLmdldChyb20pO1xuICAgIHRoaXMuY29tcHJlc3NlZE1hcERhdGEgPSBSb20uQ09NUFJFU1NFRF9NQVBEQVRBLmdldChyb20pO1xuXG4gICAgLy8gaWYgKGNyYzMyKHJvbSkgPT09IEVYUEVDVEVEX0NSQzMyKSB7XG4gICAgZm9yIChjb25zdCBbYWRkcmVzcywgb2xkLCB2YWx1ZV0gb2YgQURKVVNUTUVOVFMpIHtcbiAgICAgIGlmICh0aGlzLnByZ1thZGRyZXNzXSA9PT0gb2xkKSB0aGlzLnByZ1thZGRyZXNzXSA9IHZhbHVlO1xuICAgIH1cblxuICAgIC8vIExvYWQgdXAgYSBidW5jaCBvZiBkYXRhIHRhYmxlcy4gIFRoaXMgd2lsbCBpbmNsdWRlIGEgbGFyZ2UgbnVtYmVyIG9mIHRoZVxuICAgIC8vIGRhdGEgdGFibGVzIGluIHRoZSBST00uICBUaGUgaWRlYSBpcyB0aGF0IHdlIGNhbiBlZGl0IHRoZSBhcnJheXMgbG9jYWxseVxuICAgIC8vIGFuZCB0aGVuIGhhdmUgYSBcImNvbW1pdFwiIGZ1bmN0aW9uIHRoYXQgcmVidWlsZHMgdGhlIFJPTSB3aXRoIHRoZSBuZXdcbiAgICAvLyBhcnJheXMuICBXZSBtYXkgbmVlZCB0byB3cml0ZSBhIFwicGFnZWQgYWxsb2NhdG9yXCIgdGhhdCBjYW4gYWxsb2NhdGVcbiAgICAvLyBjaHVua3Mgb2YgUk9NIGluIGEgZ2l2ZW4gcGFnZS4gIFByb2JhYmx5IHdhbnQgdG8gdXNlIGEgZ3JlZWR5IGFsZ29yaXRobVxuICAgIC8vIHdoZXJlIHdlIHN0YXJ0IHdpdGggdGhlIGJpZ2dlc3QgY2h1bmsgYW5kIHB1dCBpdCBpbiB0aGUgc21hbGxlc3Qgc3BvdFxuICAgIC8vIHRoYXQgZml0cyBpdC4gIFByZXN1bWFibHkgd2Uga25vdyB0aGUgc2l6ZXMgdXAgZnJvbnQgZXZlbiBiZWZvcmUgd2UgaGF2ZVxuICAgIC8vIGFsbCB0aGUgYWRkcmVzc2VzLCBzbyB3ZSBjb3VsZCBkbyBhbGwgdGhlIGFsbG9jYXRpb24gYXQgb25jZSAtIHByb2JhYmx5XG4gICAgLy8gcmV0dXJuaW5nIGEgdG9rZW4gZm9yIGVhY2ggYWxsb2NhdGlvbiBhbmQgdGhlbiBhbGwgdG9rZW5zIGdldCBmaWxsZWQgaW5cbiAgICAvLyBhdCBvbmNlIChhY3R1YWwgcHJvbWlzZXMgd291bGQgYmUgbW9yZSB1bndlaWxkeSkuXG4gICAgLy8gVHJpY2t5IC0gd2hhdCBhYm91dCBzaGFyZWQgZWxlbWVudHMgb2YgZGF0YSB0YWJsZXMgLSB3ZSBwdWxsIHRoZW1cbiAgICAvLyBzZXBhcmF0ZWx5LCBidXQgd2UnbGwgbmVlZCB0byByZS1jb2FsZXNjZSB0aGVtLiAgQnV0IHRoaXMgcmVxdWlyZXNcbiAgICAvLyBrbm93aW5nIHRoZWlyIGNvbnRlbnRzIEJFRk9SRSBhbGxvY2F0aW5nIHRoZWlyIHNwYWNlLiAgU28gd2UgbmVlZCB0d29cbiAgICAvLyBhbGxvY2F0ZSBtZXRob2RzIC0gb25lIHdoZXJlIHRoZSBjb250ZW50IGlzIGtub3duIGFuZCBvbmUgd2hlcmUgb25seSB0aGVcbiAgICAvLyBsZW5ndGggaXMga25vd24uXG4gICAgdGhpcy50aWxlc2V0cyA9IG5ldyBUaWxlc2V0cyh0aGlzKTtcbiAgICB0aGlzLnRpbGVFZmZlY3RzID0gc2VxKDExLCBpID0+IG5ldyBUaWxlRWZmZWN0cyh0aGlzLCBpICsgMHhiMykpO1xuICAgIHRoaXMuc2NyZWVucyA9IG5ldyBTY3JlZW5zKHRoaXMpO1xuICAgIHRoaXMubWV0YXRpbGVzZXRzID0gbmV3IE1ldGF0aWxlc2V0cyh0aGlzKTtcbiAgICB0aGlzLm1ldGFzY3JlZW5zID0gbmV3IE1ldGFzY3JlZW5zKHRoaXMpO1xuICAgIHRoaXMudHJpZ2dlcnMgPSBzZXEoMHg0MywgaSA9PiBuZXcgVHJpZ2dlcih0aGlzLCAweDgwIHwgaSkpO1xuICAgIHRoaXMucGF0dGVybnMgPSBzZXEodGhpcy5jaHIubGVuZ3RoID4+IDQsIGkgPT4gbmV3IFBhdHRlcm4odGhpcywgaSkpO1xuICAgIHRoaXMucGFsZXR0ZXMgPSBzZXEoMHgxMDAsIGkgPT4gbmV3IFBhbGV0dGUodGhpcywgaSkpO1xuICAgIHRoaXMubG9jYXRpb25zID0gbmV3IExvY2F0aW9ucyh0aGlzKTtcbiAgICB0aGlzLnRpbGVBbmltYXRpb25zID0gc2VxKDQsIGkgPT4gbmV3IFRpbGVBbmltYXRpb24odGhpcywgaSkpO1xuICAgIHRoaXMuaGl0Ym94ZXMgPSBzZXEoMjQsIGkgPT4gbmV3IEhpdGJveCh0aGlzLCBpKSk7XG4gICAgdGhpcy5vYmplY3RzID0gbmV3IE9iamVjdHModGhpcyk7XG4gICAgdGhpcy5hZEhvY1NwYXducyA9IHNlcSgweDYwLCBpID0+IG5ldyBBZEhvY1NwYXduKHRoaXMsIGkpKTtcbiAgICB0aGlzLm1ldGFzcHJpdGVzID0gc2VxKDB4MTAwLCBpID0+IG5ldyBNZXRhc3ByaXRlKHRoaXMsIGkpKTtcbiAgICB0aGlzLm1lc3NhZ2VzID0gbmV3IE1lc3NhZ2VzKHRoaXMpO1xuICAgIHRoaXMudGVsZXBhdGh5ID0gbmV3IFRlbGVwYXRoeSh0aGlzKTtcbiAgICB0aGlzLml0ZW1HZXRzID0gbmV3IEl0ZW1HZXRzKHRoaXMpO1xuICAgIHRoaXMuaXRlbXMgPSBuZXcgSXRlbXModGhpcyk7XG4gICAgdGhpcy5zaG9wcyA9IG5ldyBTaG9wcyh0aGlzKTsgLy8gTk9URTogZGVwZW5kcyBvbiBsb2NhdGlvbnMgYW5kIG9iamVjdHNcbiAgICB0aGlzLnNsb3RzID0gbmV3IFNsb3RzKHRoaXMpO1xuICAgIHRoaXMubnBjcyA9IG5ldyBOcGNzKHRoaXMpO1xuICAgIHRoaXMuYm9zc0tpbGxzID0gc2VxKDB4ZSwgaSA9PiBuZXcgQm9zc0tpbGwodGhpcywgaSkpO1xuICAgIHRoaXMud2lsZFdhcnAgPSBuZXcgV2lsZFdhcnAodGhpcyk7XG4gICAgdGhpcy50b3duV2FycCA9IG5ldyBUb3duV2FycCh0aGlzKTtcbiAgICB0aGlzLmNvaW5Ecm9wcyA9IG5ldyBDb2luRHJvcHModGhpcyk7XG4gICAgdGhpcy5mbGFncyA9IG5ldyBGbGFncyh0aGlzKTtcbiAgICB0aGlzLmJvc3NlcyA9IG5ldyBCb3NzZXModGhpcyk7IC8vIE5PVEU6IG11c3QgYmUgYWZ0ZXIgTnBjcyBhbmQgRmxhZ3NcbiAgICB0aGlzLnNjYWxpbmcgPSBuZXcgU2NhbGluZyh0aGlzKTtcbiAgICB0aGlzLnJhbmRvbU51bWJlcnMgPSBuZXcgUmFuZG9tTnVtYmVycyh0aGlzKTtcblxuICAgIC8vIC8vIFRPRE8gLSBjb25zaWRlciBwb3B1bGF0aW5nIHRoaXMgbGF0ZXI/XG4gICAgLy8gLy8gSGF2aW5nIHRoaXMgYXZhaWxhYmxlIG1ha2VzIGl0IGVhc2llciB0byBzZXQgZXhpdHMsIGV0Yy5cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKGxvYy51c2VkKSBsb2MubGF6eUluaXRpYWxpemF0aW9uKCk7IC8vIHRyaWdnZXIgdGhlIGdldHRlclxuICAgIH1cbiAgfVxuXG4gIHRyaWdnZXIoaWQ6IG51bWJlcik6IFRyaWdnZXIge1xuICAgIGlmIChpZCA8IDB4ODAgfHwgaWQgPiAweGZmKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCB0cmlnZ2VyIGlkICQke2hleChpZCl9YCk7XG4gICAgcmV0dXJuIHRoaXMudHJpZ2dlcnNbaWQgJiAweDdmXTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBjcm9zcy1yZWZlcmVuY2UgbW9uc3RlcnMvbWV0YXNwcml0ZXMvbWV0YXRpbGVzL3NjcmVlbnMgd2l0aCBwYXR0ZXJucy9wYWxldHRlc1xuICAvLyBnZXQgbW9uc3RlcnMoKTogT2JqZWN0RGF0YVtdIHtcbiAgLy8gICBjb25zdCBtb25zdGVycyA9IG5ldyBTZXQ8T2JqZWN0RGF0YT4oKTtcbiAgLy8gICBmb3IgKGNvbnN0IGwgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgLy8gICAgIGlmICghbC51c2VkIHx8ICFsLmhhc1NwYXducykgY29udGludWU7XG4gIC8vICAgICBmb3IgKGNvbnN0IG8gb2YgbC5zcGF3bnMpIHtcbiAgLy8gICAgICAgaWYgKG8uaXNNb25zdGVyKCkpIG1vbnN0ZXJzLmFkZCh0aGlzLm9iamVjdHNbby5tb25zdGVySWRdKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIFsuLi5tb25zdGVyc10uc29ydCgoeCwgeSkgPT4gKHguaWQgLSB5LmlkKSk7XG4gIC8vIH1cblxuICBnZXQgcHJvamVjdGlsZXMoKTogT2JqZWN0RGF0YVtdIHtcbiAgICBjb25zdCBwcm9qZWN0aWxlcyA9IG5ldyBTZXQ8T2JqZWN0RGF0YT4oKTtcbiAgICBmb3IgKGNvbnN0IG0gb2YgdGhpcy5vYmplY3RzLmZpbHRlcihvID0+IG8gaW5zdGFuY2VvZiBNb25zdGVyKSkge1xuICAgICAgaWYgKG0uY2hpbGQpIHtcbiAgICAgICAgcHJvamVjdGlsZXMuYWRkKHRoaXMub2JqZWN0c1t0aGlzLmFkSG9jU3Bhd25zW20uY2hpbGRdLm9iamVjdElkXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbLi4ucHJvamVjdGlsZXNdLnNvcnQoKHgsIHkpID0+ICh4LmlkIC0geS5pZCkpO1xuICB9XG5cbiAgZ2V0IG1vbnN0ZXJHcmFwaGljcygpIHtcbiAgICBjb25zdCBnZng6IHtbaWQ6IHN0cmluZ106XG4gICAgICAgICAgICAgICAge1tpbmZvOiBzdHJpbmddOlxuICAgICAgICAgICAgICAgICB7c2xvdDogbnVtYmVyLCBwYXQ6IG51bWJlciwgcGFsOiBudW1iZXJ9fX0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGwgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghbC51c2VkIHx8ICFsLmhhc1NwYXducykgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IG8gb2YgbC5zcGF3bnMpIHtcbiAgICAgICAgaWYgKCEoby5kYXRhWzJdICYgNykpIHtcbiAgICAgICAgICBjb25zdCBzbG90ID0gby5kYXRhWzJdICYgMHg4MCA/IDEgOiAwO1xuICAgICAgICAgIGNvbnN0IGlkID0gaGV4KG8uZGF0YVszXSArIDB4NTApO1xuICAgICAgICAgIGNvbnN0IGRhdGEgPSBnZnhbaWRdID0gZ2Z4W2lkXSB8fCB7fTtcbiAgICAgICAgICBkYXRhW2Ake3Nsb3R9OiR7bC5zcHJpdGVQYXR0ZXJuc1tzbG90XS50b1N0cmluZygxNil9OiR7XG4gICAgICAgICAgICAgICBsLnNwcml0ZVBhbGV0dGVzW3Nsb3RdLnRvU3RyaW5nKDE2KX1gXVxuICAgICAgICAgICAgPSB7cGFsOiBsLnNwcml0ZVBhbGV0dGVzW3Nsb3RdLFxuICAgICAgICAgICAgICAgcGF0OiBsLnNwcml0ZVBhdHRlcm5zW3Nsb3RdLFxuICAgICAgICAgICAgICAgc2xvdCxcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZ2Z4O1xuICB9XG5cbiAgZ2V0IGxvY2F0aW9uTW9uc3RlcnMoKSB7XG4gICAgY29uc3QgbToge1tpZDogc3RyaW5nXToge1tpbmZvOiBzdHJpbmddOiBudW1iZXJ9fSA9IHt9O1xuICAgIGZvciAoY29uc3QgbCBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKCFsLnVzZWQgfHwgIWwuaGFzU3Bhd25zKSBjb250aW51ZTtcbiAgICAgIC8vIHdoaWNoIG1vbnN0ZXJzIGFyZSBpbiB3aGljaCBzbG90cz9cbiAgICAgIGNvbnN0IHM6IHtbaW5mbzogc3RyaW5nXTogbnVtYmVyfSA9IG1bJyQnICsgaGV4KGwuaWQpXSA9IHt9O1xuICAgICAgZm9yIChjb25zdCBvIG9mIGwuc3Bhd25zKSB7XG4gICAgICAgIGlmICghKG8uZGF0YVsyXSAmIDcpKSB7XG4gICAgICAgICAgY29uc3Qgc2xvdCA9IG8uZGF0YVsyXSAmIDB4ODAgPyAxIDogMDtcbiAgICAgICAgICBjb25zdCBpZCA9IG8uZGF0YVszXSArIDB4NTA7XG4gICAgICAgICAgc1tgJHtzbG90fToke2lkLnRvU3RyaW5nKDE2KX1gXSA9XG4gICAgICAgICAgICAgIChzW2Ake3Nsb3R9OiR7aWQudG9TdHJpbmcoMTYpfWBdIHx8IDApICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBmb3IgZWFjaCBzcHJpdGUgcGF0dGVybiB0YWJsZSwgZmluZCBhbGwgdGhlIHBhbGV0dGVzIHRoYXQgaXQgdXNlcy5cbiAgLy8gRmluZCBhbGwgdGhlIG1vbnN0ZXJzIG9uIGl0LiAgV2UgY2FuIHByb2JhYmx5IGFsbG93IGFueSBwYWxldHRlIHNvIGxvbmdcbiAgLy8gYXMgb25lIG9mIHRoZSBwYWxldHRlcyBpcyB1c2VkIHdpdGggdGhhdCBwYXR0ZXJuLlxuICAvLyBUT0RPIC0gbWF4IG51bWJlciBvZiBpbnN0YW5jZXMgb2YgYSBtb25zdGVyIG9uIGFueSBtYXAgLSBpLmUuIGF2b2lkIGhhdmluZ1xuICAvLyBmaXZlIGZseWVycyBvbiB0aGUgc2FtZSBtYXAhXG5cbiAgLy8gNDYwIC0gMCBtZWFucyBlaXRoZXIgZmx5ZXIgb3Igc3RhdGlvbmFyeVxuICAvLyAgICAgICAgICAgLSBzdGF0aW9uYXJ5IGhhcyA0YTAgfiAyMDQsMjA1LDIwNlxuICAvLyAgICAgICAgICAgICAoa3Jha2VuLCBzd2FtcCBwbGFudCwgc29yY2Vyb3IpXG4gIC8vICAgICAgIDYgLSBtaW1pY1xuICAvLyAgICAgICAxZiAtIHN3aW1tZXJcbiAgLy8gICAgICAgNTQgLSB0b21hdG8gYW5kIGJpcmRcbiAgLy8gICAgICAgNTUgLSBzd2ltbWVyXG4gIC8vICAgICAgIDU3IC0gbm9ybWFsXG4gIC8vICAgICAgIDVmIC0gYWxzbyBub3JtYWwsIGJ1dCBtZWR1c2EgaGVhZCBpcyBmbHllcj9cbiAgLy8gICAgICAgNzcgLSBzb2xkaWVycywgaWNlIHpvbWJpZVxuXG4vLyAgIC8vIERvbid0IHdvcnJ5IGFib3V0IG90aGVyIGRhdGFzIHlldFxuLy8gICB3cml0ZU9iamVjdERhdGEoKSB7XG4vLyAgICAgLy8gYnVpbGQgdXAgYSBtYXAgZnJvbSBhY3R1YWwgZGF0YSB0byBpbmRleGVzIHRoYXQgcG9pbnQgdG8gaXRcbi8vICAgICBsZXQgYWRkciA9IDB4MWFlMDA7XG4vLyAgICAgY29uc3QgZGF0YXMgPSB7fTtcbi8vICAgICBmb3IgKGNvbnN0IG9iamVjdCBvZiB0aGlzLm9iamVjdHMpIHtcbi8vICAgICAgIGNvbnN0IHNlciA9IG9iamVjdC5zZXJpYWxpemUoKTtcbi8vICAgICAgIGNvbnN0IGRhdGEgPSBzZXIuam9pbignICcpO1xuLy8gICAgICAgaWYgKGRhdGEgaW4gZGF0YXMpIHtcbi8vIC8vY29uc29sZS5sb2coYCQke29iamVjdC5pZC50b1N0cmluZygxNikucGFkU3RhcnQoMiwwKX06IFJldXNpbmcgZXhpc3RpbmcgZGF0YSAkJHtkYXRhc1tkYXRhXS50b1N0cmluZygxNil9YCk7XG4vLyAgICAgICAgIG9iamVjdC5vYmplY3REYXRhQmFzZSA9IGRhdGFzW2RhdGFdO1xuLy8gICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgb2JqZWN0Lm9iamVjdERhdGFCYXNlID0gYWRkcjtcbi8vICAgICAgICAgZGF0YXNbZGF0YV0gPSBhZGRyO1xuLy8gLy9jb25zb2xlLmxvZyhgJCR7b2JqZWN0LmlkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLDApfTogRGF0YSBpcyBhdCAkJHtcbi8vIC8vICAgICAgICAgICAgIGFkZHIudG9TdHJpbmcoMTYpfTogJHtBcnJheS5mcm9tKHNlciwgeD0+JyQnK3gudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsMCkpLmpvaW4oJywnKX1gKTtcbi8vICAgICAgICAgYWRkciArPSBzZXIubGVuZ3RoO1xuLy8gLy8gc2VlZCAzNTE3ODExMDM2XG4vLyAgICAgICB9XG4vLyAgICAgICBvYmplY3Qud3JpdGUoKTtcbi8vICAgICB9XG4vLyAvL2NvbnNvbGUubG9nKGBXcm90ZSBvYmplY3QgZGF0YSBmcm9tICQxYWMwMCB0byAkJHthZGRyLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg1LCAwKVxuLy8gLy8gICAgICAgICAgICAgfSwgc2F2aW5nICR7MHgxYmU5MSAtIGFkZHJ9IGJ5dGVzLmApO1xuLy8gICAgIHJldHVybiBhZGRyO1xuLy8gICB9XG5cbiAgYXNzZW1ibGVyKCk6IEFzc2VtYmxlciB7XG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIHNldHRpbmcgYSBzZWdtZW50IHByZWZpeFxuICAgIHJldHVybiBuZXcgQXNzZW1ibGVyKCk7XG4gIH1cblxuICB3cml0ZURhdGEoZGF0YSA9IHRoaXMucHJnKSB7XG4gICAgLy8gV3JpdGUgdGhlIG9wdGlvbnMgZmlyc3RcbiAgICAvLyBjb25zdCB3cml0ZXIgPSBuZXcgV3JpdGVyKHRoaXMuY2hyKTtcbiAgICAvLyB3cml0ZXIubW9kdWxlcy5wdXNoKC4uLnRoaXMubW9kdWxlcyk7XG4gICAgLy8gTWFwRGF0YVxuICAgIC8vd3JpdGVyLmFsbG9jKDB4MTQ0ZjgsIDB4MTdlMDApO1xuICAgIC8vIE5wY0RhdGFcbiAgICAvLyBOT1RFOiAxOTNmOSBpcyBhc3N1bWluZyAkZmIgaXMgdGhlIGxhc3QgbG9jYXRpb24gSUQuICBJZiB3ZSBhZGQgbW9yZSBsb2NhdGlvbnMgYXRcbiAgICAvLyB0aGUgZW5kIHRoZW4gd2UnbGwgbmVlZCB0byBwdXNoIHRoaXMgYmFjayBhIGZldyBtb3JlIGJ5dGVzLiAgV2UgY291bGQgcG9zc2libHlcbiAgICAvLyBkZXRlY3QgdGhlIGJhZCB3cml0ZSBhbmQgdGhyb3cgYW4gZXJyb3IsIGFuZC9vciBjb21wdXRlIHRoZSBtYXggbG9jYXRpb24gSUQuXG4gICAgLy93cml0ZXIuYWxsb2MoMHgxOTNmOSwgMHgxYWMwMCk7XG4gICAgLy8gT2JqZWN0RGF0YSAoaW5kZXggYXQgMWFjMDAuLjFhZTAwKVxuICAgIC8vd3JpdGVyLmFsbG9jKDB4MWFlMDAsIDB4MWJkMDApOyAvLyBzYXZlIDUxMiBieXRlcyBhdCBlbmQgZm9yIHNvbWUgZXh0cmEgY29kZVxuICAgIGNvbnN0IGEgPSB0aGlzLmFzc2VtYmxlcigpO1xuICAgIC8vIE5wY1NwYXduQ29uZGl0aW9uc1xuICAgIGZyZWUoYSwgJDBlLCAweDg3N2EsIDB4ODk1ZCk7XG4gICAgLy8gTnBjRGlhbG9nXG4gICAgZnJlZShhLCAkMGUsIDB4OGFlNSwgMHg5OGY0KTtcbiAgICAvLyBJdGVtR2V0RGF0YSAodG8gMWUwNjUpICsgSXRlbVVzZURhdGFcbiAgICBmcmVlKGEsICQwZSwgMHg5ZGU2LCAweGEwMDApO1xuICAgIGZyZWUoYSwgJDBmLCAweGEwMDAsIDB4YTEwNik7XG4gICAgLy8gVHJpZ2dlckRhdGFcbiAgICAvLyBOT1RFOiBUaGVyZSdzIHNvbWUgZnJlZSBzcGFjZSBhdCAxZTNjMC4uMWUzZjAsIGJ1dCB3ZSB1c2UgdGhpcyBmb3IgdGhlXG4gICAgLy8gQ2hlY2tCZWxvd0Jvc3MgdHJpZ2dlcnMuXG4gICAgZnJlZShhLCAkMGYsIDB4YTIwMCwgMHhhM2MwKTtcbiAgICAvLyBJdGVtTWVudU5hbWVcbiAgICBmcmVlKGEsICQxMCwgMHg5MTFhLCAweDk0NjgpO1xuICAgIC8vIGtlZXAgaXRlbSAkNDkgXCIgICAgICAgIFwiIHdoaWNoIGlzIGFjdHVhbGx5IHVzZWQgc29tZXdoZXJlP1xuICAgIC8vIHdyaXRlci5hbGxvYygweDIxNDcxLCAweDIxNGYxKTsgLy8gVE9ETyAtIGRvIHdlIG5lZWQgYW55IG9mIHRoaXM/XG4gICAgLy8gSXRlbU1lc3NhZ2VOYW1lXG4gICAgLy8gd3JpdGVyLmFsbG9jKDB4MjhlODEsIDB4MjkyMmIpOyAvLyBOT1RFOiB1bmNvdmVyZWQgdGhydSAyOTQwMFxuICAgIC8vIHdyaXRlci5hbGxvYygweDI5MjJiLCAweDI5NDAwKTsgLy8gVE9ETyAtIG5lZWRlZD9cbiAgICAvLyBOT1RFOiBvbmNlIHdlIHJlbGVhc2UgdGhlIG90aGVyIG1lc3NhZ2UgdGFibGVzLCB0aGlzIHdpbGwganVzdCBiZSBvbmUgZ2lhbnQgYmxvY2suXG5cbiAgICAvLyBNZXNzYWdlIHRhYmxlIHBhcnRzXG4gICAgLy8gd3JpdGVyLmFsbG9jKDB4MjgwMDAsIDB4MjgzZmUpO1xuICAgIC8vIE1lc3NhZ2UgdGFibGVzXG4gICAgLy8gVE9ETyAtIHdlIGRvbid0IHVzZSB0aGUgd3JpdGVyIHRvIGFsbG9jYXRlIHRoZSBhYmJyZXZpYXRpb24gdGFibGVzLCBidXQgd2UgY291bGRcbiAgICAvL3dyaXRlci5mcmVlKCcweDJhMDAwLCAweDJmYzAwKTtcblxuICAgIC8vIGlmICh0aGlzLnRlbGVwYXRoeVRhYmxlc0FkZHJlc3MpIHtcbiAgICAvLyAgIHdyaXRlci5hbGxvYygweDFkOGY0LCAweDFkYjAwKTsgLy8gbG9jYXRpb24gdGFibGUgYWxsIHRoZSB3YXkgdGhydSBtYWluXG4gICAgLy8gfSBlbHNlIHtcbiAgICAvLyAgIHdyaXRlci5hbGxvYygweDFkYTRjLCAweDFkYjAwKTsgLy8gZXhpc3RpbmcgbWFpbiB0YWJsZSBpcyBoZXJlLlxuICAgIC8vIH1cblxuICAgIGNvbnN0IG1vZHVsZXMgPSBbLi4udGhpcy5tb2R1bGVzLCBhLm1vZHVsZSgpXTtcbiAgICBjb25zdCB3cml0ZUFsbCA9ICh3cml0YWJsZXM6IEl0ZXJhYmxlPHt3cml0ZSgpOiBNb2R1bGVbXX0+KSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IHcgb2Ygd3JpdGFibGVzKSB7XG4gICAgICAgIG1vZHVsZXMucHVzaCguLi53LndyaXRlKCkpO1xuICAgICAgfVxuICAgIH07XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMubG9jYXRpb25zLndyaXRlKCkpO1xuICAgIHdyaXRlQWxsKHRoaXMub2JqZWN0cyk7XG4gICAgd3JpdGVBbGwodGhpcy5oaXRib3hlcyk7XG4gICAgd3JpdGVBbGwodGhpcy50cmlnZ2Vycyk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMubnBjcy53cml0ZSgpKTtcbiAgICB3cml0ZUFsbCh0aGlzLnRpbGVzZXRzKTtcbiAgICB3cml0ZUFsbCh0aGlzLnRpbGVFZmZlY3RzKTtcbiAgICB3cml0ZUFsbCh0aGlzLmFkSG9jU3Bhd25zKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5pdGVtR2V0cy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5zbG90cy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5pdGVtcy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5zaG9wcy53cml0ZSgpKTtcbiAgICB3cml0ZUFsbCh0aGlzLmJvc3NLaWxscyk7XG4gICAgd3JpdGVBbGwodGhpcy5wYXR0ZXJucyk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMud2lsZFdhcnAud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMudG93bldhcnAud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuY29pbkRyb3BzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnNjYWxpbmcud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuYm9zc2VzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnJhbmRvbU51bWJlcnMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMudGVsZXBhdGh5LndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLm1lc3NhZ2VzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnNjcmVlbnMud3JpdGUoKSk7XG5cbiAgICAvLyBSZXNlcnZlIHRoZSBnbG9iYWwgc3BhY2UgMTQyYzAuLi4xNDJmMCA/Pz9cbiAgICAvLyBjb25zdCB0aGlzLmFzc2VtYmxlcigpLlxuXG4gICAgY29uc3QgbGlua2VyID0gbmV3IExpbmtlcigpO1xuICAgIGxpbmtlci5iYXNlKHRoaXMucHJnLCAwKTtcbiAgICBmb3IgKGNvbnN0IG0gb2YgbW9kdWxlcykge1xuICAgICAgbGlua2VyLnJlYWQobSk7XG4gICAgfVxuICAgIGNvbnN0IG91dCA9IGxpbmtlci5saW5rKCk7XG4gICAgb3V0LmFwcGx5KGRhdGEpO1xuICAgIGlmIChkYXRhICE9PSB0aGlzLnByZykgcmV0dXJuOyAvLyBUT0RPIC0gY2xlYW4gdGhpcyB1cFxuICAgIC8vbGlua2VyLnJlcG9ydCgpO1xuICAgIGNvbnN0IGV4cG9ydHMgPSBsaW5rZXIuZXhwb3J0cygpO1xuXG4gICAgXG4gICAgdGhpcy51bmlxdWVJdGVtVGFibGVBZGRyZXNzID0gZXhwb3J0cy5nZXQoJ0tleUl0ZW1EYXRhJykhLm9mZnNldCE7XG4gICAgdGhpcy5zaG9wQ291bnQgPSAxMTtcbiAgICB0aGlzLnNob3BEYXRhVGFibGVzQWRkcmVzcyA9IGV4cG9ydHMuZ2V0KCdTaG9wRGF0YScpPy5vZmZzZXQgfHwgMDtcbiAgICAvLyBEb24ndCBpbmNsdWRlIHRoZXNlIGluIHRoZSBsaW5rZXI/Pz9cbiAgICBSb20uU0hPUF9DT1VOVC5zZXQodGhpcy5wcmcsIHRoaXMuc2hvcENvdW50KTtcbiAgICBSb20uU0NBTElOR19MRVZFTFMuc2V0KHRoaXMucHJnLCB0aGlzLnNjYWxpbmdMZXZlbHMpO1xuICAgIFJvbS5VTklRVUVfSVRFTV9UQUJMRS5zZXQodGhpcy5wcmcsIHRoaXMudW5pcXVlSXRlbVRhYmxlQWRkcmVzcyk7XG4gICAgUm9tLlNIT1BfREFUQV9UQUJMRVMuc2V0KHRoaXMucHJnLCB0aGlzLnNob3BEYXRhVGFibGVzQWRkcmVzcyB8fCAwKTtcbiAgICBSb20uT01JVF9JVEVNX0dFVF9EQVRBX1NVRkZJWC5zZXQodGhpcy5wcmcsIHRoaXMub21pdEl0ZW1HZXREYXRhU3VmZml4KTtcbiAgICBSb20uT01JVF9MT0NBTF9ESUFMT0dfU1VGRklYLnNldCh0aGlzLnByZywgdGhpcy5vbWl0TG9jYWxEaWFsb2dTdWZmaXgpO1xuICAgIFJvbS5DT01QUkVTU0VEX01BUERBVEEuc2V0KHRoaXMucHJnLCB0aGlzLmNvbXByZXNzZWRNYXBEYXRhKTtcbiAgfVxuXG4gIGFuYWx5emVUaWxlcygpIHtcbiAgICAvLyBGb3IgYW55IGdpdmVuIHRpbGUgaW5kZXgsIHdoYXQgc2NyZWVucyBkb2VzIGl0IGFwcGVhciBvbi5cbiAgICAvLyBGb3IgdGhvc2Ugc2NyZWVucywgd2hpY2ggdGlsZXNldHMgZG9lcyAqaXQqIGFwcGVhciBvbi5cbiAgICAvLyBUaGF0IHRpbGUgSUQgaXMgbGlua2VkIGFjcm9zcyBhbGwgdGhvc2UgdGlsZXNldHMuXG4gICAgLy8gRm9ybXMgYSBwYXJ0aXRpb25pbmcgZm9yIGVhY2ggdGlsZSBJRCA9PiB1bmlvbi1maW5kLlxuICAgIC8vIEdpdmVuIHRoaXMgcGFydGl0aW9uaW5nLCBpZiBJIHdhbnQgdG8gbW92ZSBhIHRpbGUgb24gYSBnaXZlblxuICAgIC8vIHRpbGVzZXQsIGFsbCBJIG5lZWQgdG8gZG8gaXMgZmluZCBhbm90aGVyIHRpbGUgSUQgd2l0aCB0aGVcbiAgICAvLyBzYW1lIHBhcnRpdGlvbiBhbmQgc3dhcCB0aGVtP1xuXG4gICAgLy8gTW9yZSBnZW5lcmFsbHksIHdlIGNhbiBqdXN0IHBhcnRpdGlvbiB0aGUgdGlsZXNldHMuXG5cbiAgICAvLyBGb3IgZWFjaCBzY3JlZW4sIGZpbmQgYWxsIHRpbGVzZXRzIFQgZm9yIHRoYXQgc2NyZWVuXG4gICAgLy8gVGhlbiBmb3IgZWFjaCB0aWxlIG9uIHRoZSBzY3JlZW4sIHVuaW9uIFQgZm9yIHRoYXQgdGlsZS5cblxuICAgIC8vIEdpdmVuIGEgdGlsZXNldCBhbmQgYSBtZXRhdGlsZSBJRCwgZmluZCBhbGwgdGhlIHNjcmVlbnMgdGhhdCAoMSkgYXJlIHJlbmRlcmVkXG4gICAgLy8gd2l0aCB0aGF0IHRpbGVzZXQsIGFuZCAoYikgdGhhdCBjb250YWluIHRoYXQgbWV0YXRpbGU7IHRoZW4gZmluZCBhbGwgKm90aGVyKlxuICAgIC8vIHRpbGVzZXRzIHRoYXQgdGhvc2Ugc2NyZWVucyBhcmUgZXZlciByZW5kZXJlZCB3aXRoLlxuXG4gICAgLy8gR2l2ZW4gYSBzY3JlZW4sIGZpbmQgYWxsIGF2YWlsYWJsZSBtZXRhdGlsZSBJRHMgdGhhdCBjb3VsZCBiZSBhZGRlZCB0byBpdFxuICAgIC8vIHdpdGhvdXQgY2F1c2luZyBwcm9ibGVtcyB3aXRoIG90aGVyIHNjcmVlbnMgdGhhdCBzaGFyZSBhbnkgdGlsZXNldHMuXG4gICAgLy8gIC0+IHVudXNlZCAob3IgdXNlZCBidXQgc2hhcmVkIGV4Y2x1c2l2ZWx5KSBhY3Jvc3MgYWxsIHRpbGVzZXRzIHRoZSBzY3JlZW4gbWF5IHVzZVxuXG4gICAgLy8gV2hhdCBJIHdhbnQgZm9yIHN3YXBwaW5nIGlzIHRoZSBmb2xsb3dpbmc6XG4gICAgLy8gIDEuIGZpbmQgYWxsIHNjcmVlbnMgSSB3YW50IHRvIHdvcmsgb24gPT4gdGlsZXNldHNcbiAgICAvLyAgMi4gZmluZCB1bnVzZWQgZmxhZ2dhYmJsZSB0aWxlcyBpbiB0aGUgaGFyZGVzdCBvbmUsXG4gICAgLy8gICAgIHdoaWNoIGFyZSBhbHNvIElTT0xBVEVEIGluIHRoZSBvdGhlcnMuXG4gICAgLy8gIDMuIHdhbnQgdGhlc2UgdGlsZXMgdG8gYmUgdW51c2VkIGluIEFMTCByZWxldmFudCB0aWxlc2V0c1xuICAgIC8vICA0LiB0byBtYWtlIHRoaXMgc28sIGZpbmQgKm90aGVyKiB1bnVzZWQgZmxhZ2dhYmxlIHRpbGVzIGluIG90aGVyIHRpbGVzZXRzXG4gICAgLy8gIDUuIHN3YXAgdGhlIHVudXNlZCB3aXRoIHRoZSBpc29sYXRlZCB0aWxlcyBpbiB0aGUgb3RoZXIgdGlsZXNldHNcblxuICAgIC8vIENhdmVzOlxuICAgIC8vICAwYTogICAgICA5MCAvIDljXG4gICAgLy8gIDE1OiA4MCAvIDkwIC8gOWNcbiAgICAvLyAgMTk6ICAgICAgOTAgICAgICAod2lsbCBhZGQgdG8gODA/KVxuICAgIC8vICAzZTogICAgICA5MFxuICAgIC8vXG4gICAgLy8gSWRlYWxseSB3ZSBjb3VsZCByZXVzZSA4MCdzIDEvMi8zLzQgZm9yIHRoaXNcbiAgICAvLyAgMDE6IDkwIHwgOTQgOWNcbiAgICAvLyAgMDI6IDkwIHwgOTQgOWNcbiAgICAvLyAgMDM6ICAgICAgOTQgOWNcbiAgICAvLyAgMDQ6IDkwIHwgOTQgOWNcbiAgICAvL1xuICAgIC8vIE5lZWQgNCBvdGhlciBmbGFnZ2FibGUgdGlsZSBpbmRpY2VzIHdlIGNhbiBzd2FwIHRvP1xuICAgIC8vICAgOTA6ID0+ICgxLDIgbmVlZCBmbGFnZ2FibGU7IDMgdW51c2VkOyA0IGFueSkgPT4gMDcsIDBlLCAxMCwgMTIsIDEzLCAuLi4sIDIwLCAyMSwgMjIsIC4uLlxuICAgIC8vICAgOTQgOWM6ID0+IGRvbid0IG5lZWQgYW55IGZsYWdnYWJsZSA9PiAwNSwgM2MsIDY4LCA4MywgODgsIDg5LCA4YSwgOTAsIC4uLlxuICB9XG5cbiAgZGlzam9pbnRUaWxlc2V0cygpIHtcbiAgICBjb25zdCB0aWxlc2V0QnlTY3JlZW46IEFycmF5PFNldDxudW1iZXI+PiA9IFtdO1xuICAgIGZvciAoY29uc3QgbG9jIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWxvYy51c2VkKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHRpbGVzZXQgPSBsb2MudGlsZXNldDtcbiAgICAgIC8vY29uc3QgZXh0ID0gbG9jLnNjcmVlblBhZ2U7XG4gICAgICBmb3IgKGNvbnN0IHJvdyBvZiBsb2Muc2NyZWVucykge1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2Ygcm93KSB7XG4gICAgICAgICAgKHRpbGVzZXRCeVNjcmVlbltzXSB8fCAodGlsZXNldEJ5U2NyZWVuW3NdID0gbmV3IFNldCgpKSkuYWRkKHRpbGVzZXQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHRpbGVzID0gc2VxKDI1NiwgKCkgPT4gbmV3IFVuaW9uRmluZDxudW1iZXI+KCkpO1xuICAgIGZvciAobGV0IHMgPSAwOyBzIDwgdGlsZXNldEJ5U2NyZWVuLmxlbmd0aDsgcysrKSB7XG4gICAgICBpZiAoIXRpbGVzZXRCeVNjcmVlbltzXSkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IHQgb2YgdGhpcy5zY3JlZW5zW3NdLmFsbFRpbGVzU2V0KCkpIHtcbiAgICAgICAgdGlsZXNbdF0udW5pb24oWy4uLnRpbGVzZXRCeVNjcmVlbltzXV0pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBvdXRwdXRcbiAgICBmb3IgKGxldCB0ID0gMDsgdCA8IHRpbGVzLmxlbmd0aDsgdCsrKSB7XG4gICAgICBjb25zdCBwID0gdGlsZXNbdF0uc2V0cygpXG4gICAgICAgICAgLm1hcCgoczogU2V0PG51bWJlcj4pID0+IFsuLi5zXS5tYXAoaGV4KS5qb2luKCcgJykpXG4gICAgICAgICAgLmpvaW4oJyB8ICcpO1xuICAgICAgY29uc29sZS5sb2coYFRpbGUgJHtoZXgodCl9OiAke3B9YCk7XG4gICAgfVxuICAgIC8vICAgaWYgKCF0aWxlc2V0QnlTY3JlZW5baV0pIHtcbiAgICAvLyAgICAgY29uc29sZS5sb2coYE5vIHRpbGVzZXQgZm9yIHNjcmVlbiAke2kudG9TdHJpbmcoMTYpfWApO1xuICAgIC8vICAgICBjb250aW51ZTtcbiAgICAvLyAgIH1cbiAgICAvLyAgIHVuaW9uLnVuaW9uKFsuLi50aWxlc2V0QnlTY3JlZW5baV1dKTtcbiAgICAvLyB9XG4gICAgLy8gcmV0dXJuIHVuaW9uLnNldHMoKTtcbiAgfVxuXG4gIC8vIEN5Y2xlcyBhcmUgbm90IGFjdHVhbGx5IGN5Y2xpYyAtIGFuIGV4cGxpY2l0IGxvb3AgYXQgdGhlIGVuZCBpcyByZXF1aXJlZCB0byBzd2FwLlxuICAvLyBWYXJpYW5jZTogWzEsIDIsIG51bGxdIHdpbGwgY2F1c2UgaW5zdGFuY2VzIG9mIDEgdG8gYmVjb21lIDIgYW5kIHdpbGxcbiAgLy8gICAgICAgICAgIGNhdXNlIHByb3BlcnRpZXMgb2YgMSB0byBiZSBjb3BpZWQgaW50byBzbG90IDJcbiAgLy8gQ29tbW9uIHVzYWdlIGlzIHRvIHN3YXAgdGhpbmdzIG91dCBvZiB0aGUgd2F5IGFuZCB0aGVuIGNvcHkgaW50byB0aGVcbiAgLy8gbmV3bHktZnJlZWQgc2xvdC4gIFNheSB3ZSB3YW50ZWQgdG8gZnJlZSB1cCBzbG90cyBbMSwgMiwgMywgNF0gYW5kXG4gIC8vIGhhZCBhdmFpbGFibGUvZnJlZSBzbG90cyBbNSwgNiwgNywgOF0gYW5kIHdhbnQgdG8gY29weSBmcm9tIFs5LCBhLCBiLCBjXS5cbiAgLy8gVGhlbiBjeWNsZXMgd2lsbCBiZSBbMSwgNSwgOV0gPz8/IG5vXG4gIC8vICAtIHByb2JhYmx5IHdhbnQgdG8gZG8gc2NyZWVucyBzZXBhcmF0ZWx5IGZyb20gdGlsZXNldHMuLi4/XG4gIC8vIE5PVEUgLSB3ZSBkb24ndCBhY3R1YWxseSB3YW50IHRvIGNoYW5nZSB0aWxlcyBmb3IgdGhlIGxhc3QgY29weS4uLiFcbiAgLy8gICBpbiB0aGlzIGNhc2UsIHRzWzVdIDwtIHRzWzFdLCB0c1sxXSA8LSB0c1s5XSwgc2NyZWVuLm1hcCgxIC0+IDUpXG4gIC8vICAgcmVwbGFjZShbMHg5MF0sIFs1LCAxLCB+OV0pXG4gIC8vICAgICA9PiAxcyByZXBsYWNlZCB3aXRoIDVzIGluIHNjcmVlbnMgYnV0IDlzIE5PVCByZXBsYWNlZCB3aXRoIDFzLlxuICAvLyBKdXN0IGJ1aWxkIHRoZSBwYXJ0aXRpb24gb25jZSBsYXppbHk/IHRoZW4gY2FuIHJldXNlLi4uXG4gIC8vICAgLSBlbnN1cmUgYm90aCBzaWRlcyBvZiByZXBsYWNlbWVudCBoYXZlIGNvcnJlY3QgcGFydGl0aW9uaW5nP0VcbiAgLy8gICAgIG9yIGp1c3QgZG8gaXQgb2ZmbGluZSAtIGl0J3Mgc2ltcGxlclxuICAvLyBUT0RPIC0gU2FuaXR5IGNoZWNrPyAgV2FudCB0byBtYWtlIHN1cmUgbm9ib2R5IGlzIHVzaW5nIGNsb2JiZXJlZCB0aWxlcz9cbiAgc3dhcE1ldGF0aWxlcyh0aWxlc2V0czogbnVtYmVyW10sIC4uLmN5Y2xlczogKG51bWJlciB8IG51bWJlcltdKVtdW10pIHtcbiAgICAvLyBQcm9jZXNzIHRoZSBjeWNsZXNcbiAgICBjb25zdCByZXYgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAgIGNvbnN0IHJldkFycjogbnVtYmVyW10gPSBzZXEoMHgxMDApO1xuICAgIGNvbnN0IGFsdCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gICAgY29uc3QgY3BsID0gKHg6IG51bWJlciB8IG51bWJlcltdKTogbnVtYmVyID0+IEFycmF5LmlzQXJyYXkoeCkgPyB4WzBdIDogeCA8IDAgPyB+eCA6IHg7XG4gICAgZm9yIChjb25zdCBjeWNsZSBvZiBjeWNsZXMpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3ljbGUubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGN5Y2xlW2ldKSkge1xuICAgICAgICAgIGNvbnN0IGFyciA9IGN5Y2xlW2ldIGFzIG51bWJlcltdO1xuICAgICAgICAgIGFsdC5zZXQoYXJyWzBdLCBhcnJbMV0pO1xuICAgICAgICAgIGN5Y2xlW2ldID0gYXJyWzBdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN5Y2xlLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICBjb25zdCBqID0gY3ljbGVbaV0gYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCBrID0gY3ljbGVbaSArIDFdIGFzIG51bWJlcjtcbiAgICAgICAgaWYgKGogPCAwIHx8IGsgPCAwKSBjb250aW51ZTtcbiAgICAgICAgcmV2LnNldChrLCBqKTtcbiAgICAgICAgcmV2QXJyW2tdID0gajtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gY29uc3QgcmVwbGFjZW1lbnRTZXQgPSBuZXcgU2V0KHJlcGxhY2VtZW50cy5rZXlzKCkpO1xuICAgIC8vIEZpbmQgaW5zdGFuY2VzIGluICgxKSBzY3JlZW5zLCAoMikgdGlsZXNldHMgYW5kIGFsdGVybmF0ZXMsICgzKSB0aWxlRWZmZWN0c1xuICAgIGNvbnN0IHNjcmVlbnMgPSBuZXcgU2V0PFNjcmVlbj4oKTtcbiAgICBjb25zdCB0aWxlRWZmZWN0cyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IHRpbGVzZXRzU2V0ID0gbmV3IFNldCh0aWxlc2V0cyk7XG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWwudXNlZCkgY29udGludWU7XG4gICAgICBpZiAoIXRpbGVzZXRzU2V0LmhhcyhsLnRpbGVzZXQpKSBjb250aW51ZTtcbiAgICAgIHRpbGVFZmZlY3RzLmFkZChsLnRpbGVFZmZlY3RzKTtcbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIGwuYWxsU2NyZWVucygpKSB7XG4gICAgICAgIHNjcmVlbnMuYWRkKHNjcmVlbik7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIERvIHJlcGxhY2VtZW50cy5cbiAgICAvLyAxLiBzY3JlZW5zOiBbNSwgMSwgfjldID0+IGNoYW5nZSAxcyBpbnRvIDVzXG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2Ygc2NyZWVucykge1xuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNjcmVlbi50aWxlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBzY3JlZW4udGlsZXNbaV0gPSByZXZBcnJbc2NyZWVuLnRpbGVzW2ldXTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gMi4gdGlsZXNldHM6IFs1LCAxIH45XSA9PiBjb3B5IDUgPD0gMSBhbmQgMSA8PSA5XG4gICAgZm9yIChjb25zdCB0c2lkIG9mIHRpbGVzZXRzU2V0KSB7XG4gICAgICBjb25zdCB0aWxlc2V0ID0gdGhpcy50aWxlc2V0c1t0c2lkXTtcbiAgICAgIGZvciAoY29uc3QgY3ljbGUgb2YgY3ljbGVzKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3ljbGUubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYSA9IGNwbChjeWNsZVtpXSk7XG4gICAgICAgICAgY29uc3QgYiA9IGNwbChjeWNsZVtpICsgMV0pO1xuICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgNDsgaisrKSB7XG4gICAgICAgICAgICB0aWxlc2V0LnRpbGVzW2pdW2FdID0gdGlsZXNldC50aWxlc1tqXVtiXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGlsZXNldC5hdHRyc1thXSA9IHRpbGVzZXQuYXR0cnNbYl07XG4gICAgICAgICAgaWYgKGIgPCAweDIwICYmIHRpbGVzZXQuYWx0ZXJuYXRlc1tiXSAhPT0gYikge1xuICAgICAgICAgICAgaWYgKGEgPj0gMHgyMCkgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgdW5mbGFnOiAke3RzaWR9ICR7YX0gJHtifSAke3RpbGVzZXQuYWx0ZXJuYXRlc1tiXX1gKTtcbiAgICAgICAgICAgIHRpbGVzZXQuYWx0ZXJuYXRlc1thXSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1tiXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBbYSwgYl0gb2YgYWx0KSB7XG4gICAgICAgIHRpbGVzZXQuYWx0ZXJuYXRlc1thXSA9IGI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIDMuIHRpbGVFZmZlY3RzXG4gICAgZm9yIChjb25zdCB0ZWlkIG9mIHRpbGVFZmZlY3RzKSB7XG4gICAgICBjb25zdCB0aWxlRWZmZWN0ID0gdGhpcy50aWxlRWZmZWN0c1t0ZWlkIC0gMHhiM107XG4gICAgICBmb3IgKGNvbnN0IGN5Y2xlIG9mIGN5Y2xlcykge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN5Y2xlLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICAgIGNvbnN0IGEgPSBjcGwoY3ljbGVbaV0pO1xuICAgICAgICAgIGNvbnN0IGIgPSBjcGwoY3ljbGVbaSArIDFdKTtcbiAgICAgICAgICB0aWxlRWZmZWN0LmVmZmVjdHNbYV0gPSB0aWxlRWZmZWN0LmVmZmVjdHNbYl07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgYSBvZiBhbHQua2V5cygpKSB7XG4gICAgICAgIC8vIFRoaXMgYml0IGlzIHJlcXVpcmVkIHRvIGluZGljYXRlIHRoYXQgdGhlIGFsdGVybmF0aXZlIHRpbGUnc1xuICAgICAgICAvLyBlZmZlY3Qgc2hvdWxkIGJlIGNvbnN1bHRlZC4gIFNpbXBseSBoYXZpbmcgdGhlIGZsYWcgYW5kIHRoZVxuICAgICAgICAvLyB0aWxlIGluZGV4IDwgJDIwIGlzIG5vdCBzdWZmaWNpZW50LlxuICAgICAgICB0aWxlRWZmZWN0LmVmZmVjdHNbYV0gfD0gMHgwODtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRG9uZT8hP1xuICB9XG5cbiAgbW92ZUZsYWcob2xkRmxhZzogbnVtYmVyLCBuZXdGbGFnOiBudW1iZXIpIHtcbiAgICAvLyBuZWVkIHRvIHVwZGF0ZSB0cmlnZ2Vycywgc3Bhd25zLCBkaWFsb2dzXG4gICAgZnVuY3Rpb24gcmVwbGFjZShhcnI6IG51bWJlcltdKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoYXJyW2ldID09PSBvbGRGbGFnKSBhcnJbaV0gPSBuZXdGbGFnO1xuICAgICAgICBpZiAoYXJyW2ldID09PSB+b2xkRmxhZykgYXJyW2ldID0gfm5ld0ZsYWc7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgdHJpZ2dlciBvZiB0aGlzLnRyaWdnZXJzKSB7XG4gICAgICByZXBsYWNlKHRyaWdnZXIuY29uZGl0aW9ucyk7XG4gICAgICByZXBsYWNlKHRyaWdnZXIuZmxhZ3MpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5wYyBvZiB0aGlzLm5wY3MpIHtcbiAgICAgIGZvciAoY29uc3QgY29uZHMgb2YgbnBjLnNwYXduQ29uZGl0aW9ucy52YWx1ZXMoKSkgcmVwbGFjZShjb25kcyk7XG4gICAgICBmb3IgKGNvbnN0IGRpYWxvZ3Mgb2YgW25wYy5nbG9iYWxEaWFsb2dzLCAuLi5ucGMubG9jYWxEaWFsb2dzLnZhbHVlcygpXSkge1xuICAgICAgICBmb3IgKGNvbnN0IGRpYWxvZyBvZiBkaWFsb2dzKSB7XG4gICAgICAgICAgaWYgKGRpYWxvZy5jb25kaXRpb24gPT09IG9sZEZsYWcpIGRpYWxvZy5jb25kaXRpb24gPSBuZXdGbGFnO1xuICAgICAgICAgIGlmIChkaWFsb2cuY29uZGl0aW9uID09PSB+b2xkRmxhZykgZGlhbG9nLmNvbmRpdGlvbiA9IH5uZXdGbGFnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGFsc28gbmVlZCB0byB1cGRhdGUgbWFwIGZsYWdzIGlmID49ICQyMDBcbiAgICBpZiAoKG9sZEZsYWcgJiB+MHhmZikgPT09IDB4MjAwICYmIChuZXdGbGFnICYgfjB4ZmYpID09PSAweDIwMCkge1xuICAgICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgICAgZm9yIChjb25zdCBmbGFnIG9mIGxvYy5mbGFncykge1xuICAgICAgICAgIGlmIChmbGFnLmZsYWcgPT09IG9sZEZsYWcpIGZsYWcuZmxhZyA9IG5ld0ZsYWc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBuZXh0RnJlZVRyaWdnZXIoKTogVHJpZ2dlciB7XG4gICAgZm9yIChjb25zdCB0IG9mIHRoaXMudHJpZ2dlcnMpIHtcbiAgICAgIGlmICghdC51c2VkKSByZXR1cm4gdDtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBhbiB1bnVzZWQgdHJpZ2dlci4nKTtcbiAgfVxuXG4gIC8vIGNvbXByZXNzTWFwRGF0YSgpOiB2b2lkIHtcbiAgLy8gICBpZiAodGhpcy5jb21wcmVzc2VkTWFwRGF0YSkgcmV0dXJuO1xuICAvLyAgIHRoaXMuY29tcHJlc3NlZE1hcERhdGEgPSB0cnVlO1xuICAvLyAgIC8vIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgLy8gICAvLyAgIGlmIChsb2NhdGlvbi5leHRlbmRlZCkgbG9jYXRpb24uZXh0ZW5kZWQgPSAweGE7XG4gIC8vICAgLy8gfVxuICAvLyAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gIC8vICAgICAvL3RoaXMuc2NyZWVuc1sweGEwMCB8IGldID0gdGhpcy5zY3JlZW5zWzB4MTAwIHwgaV07XG4gIC8vICAgICB0aGlzLm1ldGFzY3JlZW5zLnJlbnVtYmVyKDB4MTAwIHwgaSwgMHhhMDAgfCBpKTtcbiAgLy8gICAgIGRlbGV0ZSB0aGlzLnNjcmVlbnNbMHgxMDAgfCBpXTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBUT0RPIC0gZG9lcyBub3Qgd29yay4uLlxuICAvLyBUT0RPIC0gY2xlYW4gdGhpcyB1cCBzb21laG93Li4uIHdvdWxkIGJlIG5pY2UgdG8gdXNlIHRoZSBhc3NlbWJsZXIvbGlua2VyXG4gIC8vICAgICAgICB3LyBhbiAuYWxpZ24gb3B0aW9uIGZvciB0aGlzLCBidXQgdGhlbiB3ZSBoYXZlIHRvIGhvbGQgb250byB3ZWlyZFxuICAvLyAgICAgICAgZGF0YSBpbiBtYW55IHBsYWNlcywgd2hpY2ggaXNuJ3QgZ3JlYXQuXG4gIG1vdmVTY3JlZW5zKHRpbGVzZXQ6IE1ldGF0aWxlc2V0LCBwYWdlOiBudW1iZXIpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29tcHJlc3NlZE1hcERhdGEpIHRocm93IG5ldyBFcnJvcihgTXVzdCBjb21wcmVzcyBtYXBzIGZpcnN0LmApO1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gICAgbGV0IGkgPSBwYWdlIDw8IDg7XG4gICAgd2hpbGUgKHRoaXMuc2NyZWVuc1tpXSkge1xuICAgICAgaSsrO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aWxlc2V0KSB7XG4gICAgICBpZiAoc2NyZWVuLnNpZCA+PSAweDEwMCkgY29udGludWU7XG4gICAgICAvL2lmICgoaSAmIDB4ZmYpID09PSAweDIwKSB0aHJvdyBuZXcgRXJyb3IoYE5vIHJvb20gbGVmdCBvbiBwYWdlLmApO1xuICAgICAgY29uc3QgcHJldiA9IHNjcmVlbi5zaWQ7XG4gICAgICBpZiAobWFwLmhhcyhwcmV2KSkgY29udGludWU7XG4gICAgICBjb25zdCBuZXh0ID0gc2NyZWVuLnNpZCA9IGkrKztcbiAgICAgIG1hcC5zZXQocHJldiwgbmV4dCk7XG4gICAgICBtYXAuc2V0KG5leHQsIG5leHQpO1xuICAgICAgLy90aGlzLm1ldGFzY3JlZW5zLnJlbnVtYmVyKHByZXYsIG5leHQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKGxvYy50aWxlc2V0ICE9IHRpbGVzZXQudGlsZXNldElkKSBjb250aW51ZTtcbiAgICAgIGxldCBhbnlNb3ZlZCA9IGZhbHNlO1xuICAgICAgbGV0IGFsbE1vdmVkID0gdHJ1ZTtcbiAgICAgIGZvciAoY29uc3Qgcm93IG9mIGxvYy5zY3JlZW5zKSB7XG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgcm93Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgY29uc3QgbWFwcGVkID0gbWFwLmdldChyb3dbal0pO1xuICAgICAgICAgIGlmIChtYXBwZWQgIT0gbnVsbCkge1xuICAgICAgICAgICAgcm93W2pdID0gbWFwcGVkO1xuICAgICAgICAgICAgYW55TW92ZWQgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbGxNb3ZlZCA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGFueU1vdmVkKSB7XG4gICAgICAgIGlmICghYWxsTW92ZWQpIHRocm93IG5ldyBFcnJvcihgSW5jb25zaXN0ZW50IG1vdmVgKTtcbiAgICAgICAgLy9sb2MuZXh0ZW5kZWQgPSBwYWdlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFVzZSB0aGUgYnJvd3NlciBBUEkgdG8gbG9hZCB0aGUgUk9NLiAgVXNlICNyZXNldCB0byBmb3JnZXQgYW5kIHJlbG9hZC5cbiAgc3RhdGljIGFzeW5jIGxvYWQocGF0Y2g/OiAoZGF0YTogVWludDhBcnJheSkgPT4gdm9pZHxQcm9taXNlPHZvaWQ+LFxuICAgICAgICAgICAgICAgICAgICByZWNlaXZlcj86IChwaWNrZXI6IEVsZW1lbnQpID0+IHZvaWQpIHtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgcGlja0ZpbGUocmVjZWl2ZXIpO1xuICAgIGlmIChwYXRjaCkgYXdhaXQgcGF0Y2goZmlsZSk7XG4gICAgcmV0dXJuIG5ldyBSb20oZmlsZSk7XG4gIH0gIFxufVxuXG4vLyBjb25zdCBpbnRlcnNlY3RzID0gKGxlZnQsIHJpZ2h0KSA9PiB7XG4vLyAgIGlmIChsZWZ0LnNpemUgPiByaWdodC5zaXplKSByZXR1cm4gaW50ZXJzZWN0cyhyaWdodCwgbGVmdCk7XG4vLyAgIGZvciAobGV0IGkgb2YgbGVmdCkge1xuLy8gICAgIGlmIChyaWdodC5oYXMoaSkpIHJldHVybiB0cnVlO1xuLy8gICB9XG4vLyAgIHJldHVybiBmYWxzZTtcbi8vIH1cblxuLy8gY29uc3QgVElMRV9FRkZFQ1RTX0JZX1RJTEVTRVQgPSB7XG4vLyAgIDB4ODA6IDB4YjMsXG4vLyAgIDB4ODQ6IDB4YjQsXG4vLyAgIDB4ODg6IDB4YjUsXG4vLyAgIDB4OGM6IDB4YjYsXG4vLyAgIDB4OTA6IDB4YjcsXG4vLyAgIDB4OTQ6IDB4YjgsXG4vLyAgIDB4OTg6IDB4YjksXG4vLyAgIDB4OWM6IDB4YmEsXG4vLyAgIDB4YTA6IDB4YmIsXG4vLyAgIDB4YTQ6IDB4YmMsXG4vLyAgIDB4YTg6IDB4YjUsXG4vLyAgIDB4YWM6IDB4YmQsXG4vLyB9O1xuXG4vLyBPbmx5IG1ha2VzIHNlbnNlIGluIHRoZSBicm93c2VyLlxuZnVuY3Rpb24gcGlja0ZpbGUocmVjZWl2ZXI/OiAocGlja2VyOiBFbGVtZW50KSA9PiB2b2lkKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gIGlmICghcmVjZWl2ZXIpIHJlY2VpdmVyID0gcGlja2VyID0+IGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQocGlja2VyKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5oYXNoICE9PSAnI3Jlc2V0Jykge1xuICAgICAgY29uc3QgZGF0YSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdyb20nKTtcbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIHJldHVybiByZXNvbHZlKFxuICAgICAgICAgICAgVWludDhBcnJheS5mcm9tKFxuICAgICAgICAgICAgICAgIG5ldyBBcnJheShkYXRhLmxlbmd0aCAvIDIpLmZpbGwoMCkubWFwKFxuICAgICAgICAgICAgICAgICAgICAoXywgaSkgPT4gTnVtYmVyLnBhcnNlSW50KFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVsyICogaV0gKyBkYXRhWzIgKiBpICsgMV0sIDE2KSkpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgdXBsb2FkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHVwbG9hZCk7XG4gICAgdXBsb2FkLnR5cGUgPSAnZmlsZSc7XG4gICAgdXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgICAgIGNvbnN0IGZpbGUgPSB1cGxvYWQuZmlsZXMhWzBdO1xuICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgIHJlYWRlci5hZGRFdmVudExpc3RlbmVyKCdsb2FkZW5kJywgKCkgPT4ge1xuICAgICAgICBjb25zdCBhcnIgPSBuZXcgVWludDhBcnJheShyZWFkZXIucmVzdWx0IGFzIEFycmF5QnVmZmVyKTtcbiAgICAgICAgY29uc3Qgc3RyID0gQXJyYXkuZnJvbShhcnIsIGhleCkuam9pbignJyk7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdyb20nLCBzdHIpO1xuICAgICAgICB1cGxvYWQucmVtb3ZlKCk7XG4gICAgICAgIHJlc29sdmUoYXJyKTtcbiAgICAgIH0pO1xuICAgICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGZpbGUpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZXhwb3J0IGNvbnN0IEVYUEVDVEVEX0NSQzMyID0gMHgxYmQzOTAzMjtcblxuLy8gRm9ybWF0OiBbYWRkcmVzcywgYnJva2VuLCBmaXhlZF1cbmNvbnN0IEFESlVTVE1FTlRTID0gW1xuICAvLyBGaXggc29mdGxvY2sgaW4gY3J5cHQgZHVlIHRvIGZseWFibGUgd2FsbCAoZWZmZWN0cyAkYjYgdGlsZSAkNDYpXG4gIFsweDEzNjQ2LCAweDAyLCAweDA2XSxcbiAgLy8gTm9ybWFsaXplIGNhdmUgZW50cmFuY2UgaW4gMDEgb3V0c2lkZSBzdGFydFxuICBbMHgxNDU0OCwgMHg1NiwgMHg1MF0sXG4gIC8vIEZpeCBicm9rZW4gKGZhbGwtdGhyb3VnaCkgZXhpdCBvdXRzaWRlIHN0YXJ0XG4gIFsweDE0NTZhLCAweDAwLCAweGZmXSxcbiAgLy8gTW92ZSBMZWFmIG5vcnRoIGVudHJhbmNlIHRvIGJlIHJpZ2h0IG5leHQgdG8gZXhpdCAoY29uc2lzdGVudCB3aXRoIEdvYSlcbiAgWzB4MTQ1OGYsIDB4MzgsIDB4MzBdLFxuICAvLyBOb3JtYWxpemUgc2VhbGVkIGNhdmUgZW50cmFuY2UvZXhpdCBhbmQgemVidSBjYXZlIGVudHJhbmNlXG4gIFsweDE0NjE4LCAweDYwLCAweDcwXSxcbiAgWzB4MTQ2MjYsIDB4YTgsIDB4YTBdLFxuICBbMHgxNDYzMywgMHgxNSwgMHgxNl0sXG4gIFsweDE0NjM3LCAweDE1LCAweDE2XSxcbiAgLy8gTm9ybWFsaXplIGNvcmRlbCBwbGFpbiBlbnRyYW5jZSBmcm9tIHNlYWxlZCBjYXZlXG4gIFsweDE0OTUxLCAweGE4LCAweGEwXSxcbiAgWzB4MTQ5NTMsIDB4OTgsIDB4OTBdLFxuICAvLyBOb3JtYWxpemUgY29yZGVsIHN3YXAgZW50cmFuY2VcbiAgWzB4MTRhMTksIDB4NzgsIDB4NzBdLFxuICAvLyBSZWR1bmRhbnQgZXhpdCBuZXh0IHRvIHN0b20ncyBkb29yIGluICQxOVxuICBbMHgxNGFlYiwgMHgwOSwgMHhmZl0sXG4gIC8vIE5vcm1hbGl6ZSBzd2FtcCBlbnRyYW5jZSBwb3NpdGlvblxuICBbMHgxNGI0OSwgMHg4MCwgMHg4OF0sXG4gIC8vIE5vcm1hbGl6ZSBhbWF6b25lcyBlbnRyYW5jZS9leGl0IHBvc2l0aW9uXG4gIFsweDE0Yjg3LCAweDIwLCAweDMwXSxcbiAgWzB4MTRiOWEsIDB4MDEsIDB4MDJdLFxuICBbMHgxNGI5ZSwgMHgwMSwgMHgwMl0sXG4gIC8vIEZpeCBnYXJiYWdlIG1hcCBzcXVhcmUgaW4gYm90dG9tLXJpZ2h0IG9mIE10IFNhYnJlIFdlc3QgY2F2ZVxuICBbMHgxNGRiOSwgMHgwOCwgMHg4MF0sXG4gIC8vIE5vcm1hbGl6ZSBzYWJyZSBuIGVudHJhbmNlIGJlbG93IHN1bW1pdFxuICBbMHgxNGVmNiwgMHg2OCwgMHg2MF0sXG4gIC8vIEZpeCBnYXJiYWdlIG1hcCBzcXVhcmUgaW4gYm90dG9tLWxlZnQgb2YgTGltZSBUcmVlIFZhbGxleVxuICBbMHgxNTQ1ZCwgMHhmZiwgMHgwMF0sXG4gIC8vIE5vcm1hbGl6ZSBsaW1lIHRyZWUgdmFsbGV5IFNFIGVudHJhbmNlXG4gIFsweDE1NDY5LCAweDc4LCAweDcwXSxcbiAgLy8gTm9ybWFsaXplIHBvcnRvYSBzZS9zdyBlbnRyYW5jZXNcbiAgWzB4MTU4MDYsIDB4OTgsIDB4YTBdLFxuICBbMHgxNTgwYSwgMHg5OCwgMHhhMF0sXG4gIC8vIE5vcm1hbGl6ZSBwb3J0b2EgcGFsYWNlIGVudHJhbmNlXG4gIFsweDE1ODBlLCAweDU4LCAweDUwXSxcbiAgLy8gTWFyayBiYWQgZW50cmFuY2UvZXhpdCBpbiBwb3J0b2FcbiAgWzB4MTU4MWQsIDB4MDAsIDB4ZmZdLFxuICBbMHgxNTg0ZSwgMHhkYiwgMHhmZl0sXG4gIC8vIE5vcm1hbGl6ZSBmaXNoZXJtYW4gaXNsYW5kIGVudHJhbmNlXG4gIFsweDE1ODc1LCAweDc4LCAweDcwXSxcbiAgLy8gTm9ybWFsaXplIHpvbWJpZSB0b3duIGVudHJhbmNlIGZyb20gcGFsYWNlXG4gIFsweDE1YjRmLCAweDc4LCAweDgwXSxcbiAgLy8gUmVtb3ZlIHVudXNlZCBtYXAgc2NyZWVucyBmcm9tIEV2aWwgU3Bpcml0IGxvd2VyXG4gIFsweDE1YmFmLCAweGYwLCAweDgwXSxcbiAgWzB4MTViYjYsIDB4ZGYsIDB4ODBdLFxuICBbMHgxNWJiNywgMHg5NiwgMHg4MF0sXG4gIC8vIE5vcm1hbGl6ZSBzYWJlcmEgcGFsYWNlIDEgZW50cmFuY2UgdXAgb25lIHRpbGVcbiAgWzB4MTVjZTMsIDB4ZGYsIDB4Y2ZdLFxuICBbMHgxNWNlZSwgMHg2ZSwgMHg2ZF0sXG4gIFsweDE1Y2YyLCAweDZlLCAweDZkXSxcbiAgLy8gTm9ybWFsaXplIHNhYmVyYSBwYWxhY2UgMyBlbnRyYW5jZSB1cCBvbmUgdGlsZVxuICBbMHgxNWQ4ZSwgMHhkZiwgMHhjZl0sXG4gIFsweDE1ZDkxLCAweDJlLCAweDJkXSxcbiAgWzB4MTVkOTUsIDB4MmUsIDB4MmRdLFxuICAvLyBOb3JtYWxpemUgam9lbCBlbnRyYW5jZVxuICBbMHgxNWUzYSwgMHhkOCwgMHhkZl0sXG4gIC8vIE5vcm1hbGl6ZSBnb2EgdmFsbGV5IHJpZ2h0aGFuZCBlbnRyYW5jZVxuICBbMHgxNWYzOSwgMHg3OCwgMHg3MF0sXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlL2V4aXQgaW4gZ29hIHZhbGxleVxuICBbMHgxNWY0MCwgMHgwMiwgMHhmZl0sXG4gIFsweDE1ZjYxLCAweDhkLCAweGZmXSxcbiAgWzB4MTVmNjUsIDB4OGQsIDB4ZmZdLFxuICAvLyBOb3JtYWxpemUgc2h5cm9uIGxvd2VyIGVudHJhbmNlXG4gIFsweDE2M2ZkLCAweDQ4LCAweDQwXSxcbiAgLy8gTm9ybWFsaXplIHNoeXJvbiBmb3J0cmVzcyBlbnRyYW5jZVxuICBbMHgxNjQwMywgMHg1NSwgMHg1MF0sXG4gIC8vIE5vcm1hbGl6ZSBnb2Egc291dGggZW50cmFuY2VcbiAgWzB4MTY0NWIsIDB4ZDgsIDB4ZGZdLFxuICAvLyBGaXggcGF0dGVybiB0YWJsZSBmb3IgZGVzZXJ0IDEgKGFuaW1hdGlvbiBnbG9zc2VzIG92ZXIgaXQpXG4gIFsweDE2NGNjLCAweDA0LCAweDIwXSxcbiAgLy8gRml4IGdhcmJhZ2UgYXQgYm90dG9tIG9mIG9hc2lzIGNhdmUgbWFwIChpdCdzIDh4MTEsIG5vdCA4eDEyID0+IGZpeCBoZWlnaHQpXG4gIFsweDE2NGZmLCAweDBiLCAweDBhXSxcbiAgLy8gTm9ybWFsaXplIHNhaGFyYSBlbnRyYW5jZS9leGl0IHBvc2l0aW9uXG4gIFsweDE2NjBkLCAweDIwLCAweDMwXSxcbiAgWzB4MTY2MjQsIDB4MDEsIDB4MDJdLFxuICBbMHgxNjYyOCwgMHgwMSwgMHgwMl0sXG4gIC8vIFJlbW92ZSB1bnVzZWQgc2NyZWVucyBmcm9tIG1hZG8yIGFyZWFcbiAgWzB4MTZkYjAsIDB4OWEsIDB4ODBdLFxuICBbMHgxNmRiNCwgMHg5ZSwgMHg4MF0sXG4gIFsweDE2ZGI4LCAweDkxLCAweDgwXSxcbiAgWzB4MTZkYmMsIDB4OWUsIDB4ODBdLFxuICBbMHgxNmRjMCwgMHg5MSwgMHg4MF0sXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlIGluIHVudXNlZCBtYWRvMiBhcmVhXG4gIFsweDE2ZGU4LCAweDAwLCAweGZmXSxcbiAgLy8gTm9ybWFsaXplIG1hZG8yLXNpZGUgaGVja3dheSBlbnRyYW5jZVxuICBbMHgxNmRlZCwgMHhkZiwgMHhkMF0sXG4gIC8vIEZpeCBib2d1cyBleGl0cyBpbiB1bnVzZWQgbWFkbzIgYXJlYVxuICAvLyAoZXhpdHMgMiBhbmQgMyBhcmUgYmFkLCBzbyBtb3ZlIDQgYW5kIDUgb24gdG9wIG9mIHRoZW0pXG4gIFsweDE2ZGY4LCAweDBjLCAweDVjXSxcbiAgWzB4MTZkZjksIDB4YjAsIDB4YjldLFxuICBbMHgxNmRmYSwgMHgwMCwgMHgwMl0sXG4gIFsweDE2ZGZjLCAweDBjLCAweDVjXSxcbiAgWzB4MTZkZmQsIDB4YjAsIDB4YjldLFxuICBbMHgxNmRmZSwgMHgwMCwgMHgwMl0sXG4gIFsweDE2ZGZmLCAweDA3LCAweGZmXSxcbiAgLy8gQWxzbyByZW1vdmUgdGhlIGJhZCBlbnRyYW5jZXMvZXhpdHMgb24gdGhlIGFzaW5hIHZlcnNpb25cbiAgLy8gTWFyayBiYWQgZW50cmFuY2UvZXhpdCBpbiBwb3J0b2FcbiAgWzB4MTZlNWQsIDB4MDIsIDB4ZmZdLFxuICBbMHgxNmU2YSwgMHhhZCwgMHhmZl0sXG4gIFsweDE2ZTZlLCAweGFkLCAweGZmXSxcbiAgLy8gTm9ybWFsaXplIGFyeWxsaXMgZW50cmFuY2VcbiAgWzB4MTc0ZWUsIDB4ODAsIDB4ODhdLFxuICAvLyBOb3JtYWxpemUgam9lbCBzaGVkIGJvdHRvbSBhbmQgc2VjcmV0IHBhc3NhZ2UgZW50cmFuY2VzXG4gIFsweDE3N2MxLCAweDg4LCAweDgwXSxcbiAgWzB4MTc3YzUsIDB4OTgsIDB4YTBdLFxuICBbMHgxNzdjNywgMHg1OCwgMHg1MF0sXG4gIC8vIEZpeCBiYWQgbXVzaWMgaW4gem9tYmlldG93biBob3VzZXM6ICQxMCBzaG91bGQgYmUgJDAxLlxuICBbMHgxNzgyYSwgMHgxMCwgMHgwMV0sXG4gIFsweDE3ODU3LCAweDEwLCAweDAxXSxcbiAgLy8gTm9ybWFsaXplIHN3YW4gZGFuY2UgaGFsbCBlbnRyYW5jZSB0byBiZSBjb25zaXN0ZW50IHdpdGggc3RvbSdzIGhvdXNlXG4gIFsweDE3OTU0LCAweDgwLCAweDc4XSxcbiAgLy8gTm9ybWFsaXplIHNoeXJvbiBkb2pvIGVudHJhbmNlIHRvIGJlIGNvbnNpc3RlbnQgd2l0aCBzdG9tJ3MgaG91c2VcbiAgWzB4MTc5YTIsIDB4ODAsIDB4NzhdLFxuICAvLyBGaXggYmFkIHNjcmVlbnMgaW4gdG93ZXJcbiAgWzB4MTdiOGEsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAxXG4gIFsweDE3YjkwLCAweDAwLCAweDQwXSxcbiAgWzB4MTdiY2UsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAyXG4gIFsweDE3YmQ0LCAweDAwLCAweDQwXSxcbiAgWzB4MTdjMGUsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAzXG4gIFsweDE3YzE0LCAweDAwLCAweDQwXSxcbiAgWzB4MTdjNGUsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciA0XG4gIFsweDE3YzU0LCAweDAwLCAweDQwXSxcbiAgLy8gRml4IGJhZCBzcGF3biBpbiBNdCBIeWRyYSAobWFrZSBpdCBhbiBleHRyYSBwdWRkbGUpLlxuICBbMHgxOWYwMiwgMHg0MCwgMHg4MF0sXG4gIFsweDE5ZjAzLCAweDMzLCAweDMyXSxcbiAgLy8gRml4IGJhZCBzcGF3biBpbiBTYWJlcmEgMidzIGxldmVsIChwcm9iYWJseSBtZWFudCB0byBiZSBhIGZsYWlsIGd1eSkuXG4gIFsweDFhMWUwLCAweDQwLCAweGMwXSwgLy8gbWFrZSBzdXJlIHRvIGZpeCBwYXR0ZXJuIHNsb3QsIHRvbyFcbiAgWzB4MWExZTEsIDB4M2QsIDB4MzRdLFxuICAvLyBQb2ludCBBbWF6b25lcyBvdXRlciBndWFyZCB0byBwb3N0LW92ZXJmbG93IG1lc3NhZ2UgdGhhdCdzIGFjdHVhbGx5IHNob3duLlxuICBbMHgxY2YwNSwgMHg0NywgMHg0OF0sXG4gIC8vIFJlbW92ZSBzdHJheSBmbGlnaHQgZ3JhbnRlciBpbiBab21iaWV0b3duLlxuICBbMHgxZDMxMSwgMHgyMCwgMHhhMF0sXG4gIFsweDFkMzEyLCAweDMwLCAweDAwXSxcbiAgLy8gRml4IHF1ZWVuJ3MgZGlhbG9nIHRvIHRlcm1pbmF0ZSBvbiBsYXN0IGl0ZW0sIHJhdGhlciB0aGFuIG92ZXJmbG93LFxuICAvLyBzbyB0aGF0IHdlIGRvbid0IHBhcnNlIGdhcmJhZ2UuXG4gIFsweDFjZmY5LCAweDYwLCAweGUwXSxcbiAgLy8gRml4IEFtYXpvbmVzIG91dGVyIGd1YXJkIG1lc3NhZ2UgdG8gbm90IG92ZXJmbG93LlxuICBbMHgyY2E5MCwgMHgwMiwgMHgwMF0sXG4gIC8vIEZpeCBzZWVtaW5nbHktdW51c2VkIGtlbnN1IG1lc3NhZ2UgMWQ6MTcgb3ZlcmZsb3dpbmcgaW50byAxZDoxOFxuICBbMHgyZjU3MywgMHgwMiwgMHgwMF0sXG4gIC8vIEZpeCB1bnVzZWQga2FybWluZSB0cmVhc3VyZSBjaGVzdCBtZXNzYWdlIDIwOjE4LlxuICBbMHgyZmFlNCwgMHg1ZiwgMHgwMF0sXG5dIGFzIGNvbnN0O1xuIl19