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
                loc.ensureMeta();
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
    [0x16df8, 0x0c, 0x5c],
    [0x16df9, 0xb0, 0xb9],
    [0x16dfa, 0x00, 0x02],
    [0x16dfc, 0x0c, 0x5c],
    [0x16dfd, 0xb0, 0xb9],
    [0x16dfe, 0x00, 0x02],
    [0x16dff, 0x07, 0xff],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2pzL3JvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDN0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRXZDLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUUvQyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUM3QyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDckMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUM1QyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQWMsWUFBWSxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDL0QsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFFbEMsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUMxQyxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUNyRCxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFTLE9BQU8sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ2hELE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFDLEtBQUssRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRXJDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUM3QyxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDckQsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUMxQyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdEQsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQzNDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUV6QyxNQUFNLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUMsR0FBRyxPQUFPLENBQUM7QUFnQmhDLE1BQU0sT0FBTyxHQUFHO0lBZ0ZkLFlBQVksR0FBZTtRQTdCbEIsWUFBTyxHQUFhLEVBQUUsQ0FBQztRQThCOUIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQztRQUVoQyxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sTUFBTSxHQUFHLFFBQVEsR0FBRyxPQUFPLENBQUM7UUFDbEMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFaEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsYUFBYSxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxHQUFHLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxxQkFBcUIsR0FBRyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxxQkFBcUIsR0FBRyxHQUFHLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BFLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxHQUFHLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBR3pELEtBQUssTUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksV0FBVyxFQUFFO1lBQy9DLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHO2dCQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDO1NBQzFEO1FBaUJELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLElBQUksR0FB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RSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUdyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUdyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0NBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCB7QXNzZW1ibGVyfSBmcm9tICcuL2FzbS9hc3NlbWJsZXIuanMnO1xuaW1wb3J0IHtBc3NlbWJsZXJ9IGZyb20gJy4vYXNtL2Fzc2VtYmxlci5qcyc7XG5pbXBvcnQge0xpbmtlcn0gZnJvbSAnLi9hc20vbGlua2VyLmpzJztcbmltcG9ydCB7TW9kdWxlfSBmcm9tICcuL2FzbS9tb2R1bGUuanMnO1xuaW1wb3J0IHtBZEhvY1NwYXdufSBmcm9tICcuL3JvbS9hZGhvY3NwYXduLmpzJztcbi8vaW1wb3J0IHtBcmVhc30gZnJvbSAnLi9yb20vYXJlYS5qcyc7XG5pbXBvcnQge0Jvc3NLaWxsfSBmcm9tICcuL3JvbS9ib3Nza2lsbC5qcyc7XG5pbXBvcnQge0Jvc3Nlc30gZnJvbSAnLi9yb20vYm9zc2VzLmpzJztcbmltcG9ydCB7Q29pbkRyb3BzfSBmcm9tICcuL3JvbS9jb2luZHJvcHMuanMnO1xuaW1wb3J0IHtGbGFnc30gZnJvbSAnLi9yb20vZmxhZ3MuanMnO1xuaW1wb3J0IHtIaXRib3h9IGZyb20gJy4vcm9tL2hpdGJveC5qcyc7XG5pbXBvcnQge0l0ZW1zfSBmcm9tICcuL3JvbS9pdGVtLmpzJztcbmltcG9ydCB7SXRlbUdldHN9IGZyb20gJy4vcm9tL2l0ZW1nZXQuanMnO1xuaW1wb3J0IHtMb2NhdGlvbnN9IGZyb20gJy4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TWVzc2FnZXN9IGZyb20gJy4vcm9tL21lc3NhZ2VzLmpzJztcbmltcG9ydCB7TWV0YXNjcmVlbnN9IGZyb20gJy4vcm9tL21ldGFzY3JlZW5zLmpzJztcbmltcG9ydCB7TWV0YXNwcml0ZX0gZnJvbSAnLi9yb20vbWV0YXNwcml0ZS5qcyc7XG5pbXBvcnQge01ldGF0aWxlc2V0LCBNZXRhdGlsZXNldHN9IGZyb20gJy4vcm9tL21ldGF0aWxlc2V0LmpzJztcbmltcG9ydCB7TW9uc3Rlcn0gZnJvbSAnLi9yb20vbW9uc3Rlci5qcyc7XG5pbXBvcnQge05wY3N9IGZyb20gJy4vcm9tL25wYy5qcyc7XG5pbXBvcnQge09iamVjdERhdGF9IGZyb20gJy4vcm9tL29iamVjdGRhdGEuanMnO1xuaW1wb3J0IHtPYmplY3RzfSBmcm9tICcuL3JvbS9vYmplY3RzLmpzJztcbmltcG9ydCB7Um9tT3B0aW9ufSBmcm9tICcuL3JvbS9vcHRpb24uanMnO1xuaW1wb3J0IHtQYWxldHRlfSBmcm9tICcuL3JvbS9wYWxldHRlLmpzJztcbmltcG9ydCB7UGF0dGVybn0gZnJvbSAnLi9yb20vcGF0dGVybi5qcyc7XG5pbXBvcnQge1JhbmRvbU51bWJlcnN9IGZyb20gJy4vcm9tL3JhbmRvbW51bWJlcnMuanMnO1xuaW1wb3J0IHtTY2FsaW5nfSBmcm9tICcuL3JvbS9zY2FsaW5nLmpzJztcbmltcG9ydCB7U2NyZWVuLCBTY3JlZW5zfSBmcm9tICcuL3JvbS9zY3JlZW4uanMnO1xuaW1wb3J0IHtTaG9wc30gZnJvbSAnLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge1Nsb3RzfSBmcm9tICcuL3JvbS9zbG90cy5qcyc7XG5pbXBvcnQge1Nwb2lsZXJ9IGZyb20gJy4vcm9tL3Nwb2lsZXIuanMnO1xuaW1wb3J0IHtUZWxlcGF0aHl9IGZyb20gJy4vcm9tL3RlbGVwYXRoeS5qcyc7XG5pbXBvcnQge1RpbGVBbmltYXRpb259IGZyb20gJy4vcm9tL3RpbGVhbmltYXRpb24uanMnO1xuaW1wb3J0IHtUaWxlRWZmZWN0c30gZnJvbSAnLi9yb20vdGlsZWVmZmVjdHMuanMnO1xuaW1wb3J0IHtUaWxlc2V0c30gZnJvbSAnLi9yb20vdGlsZXNldC5qcyc7XG5pbXBvcnQge1Rvd25XYXJwfSBmcm9tICcuL3JvbS90b3dud2FycC5qcyc7XG5pbXBvcnQge1RyaWdnZXJ9IGZyb20gJy4vcm9tL3RyaWdnZXIuanMnO1xuaW1wb3J0IHtTZWdtZW50LCBoZXgsIHNlcSwgZnJlZX0gZnJvbSAnLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge1dpbGRXYXJwfSBmcm9tICcuL3JvbS93aWxkd2FycC5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi91bmlvbmZpbmQuanMnO1xuXG5jb25zdCB7JDBlLCAkMGYsICQxMH0gPSBTZWdtZW50O1xuXG4vLyBBIGtub3duIGxvY2F0aW9uIGZvciBkYXRhIGFib3V0IHN0cnVjdHVyYWwgY2hhbmdlcyB3ZSd2ZSBtYWRlIHRvIHRoZSByb20uXG4vLyBUaGUgdHJpY2sgaXMgdG8gZmluZCBhIHN1aXRhYmxlIHJlZ2lvbiBvZiBST00gdGhhdCdzIGJvdGggdW51c2VkICphbmQqXG4vLyBpcyBub3QgcGFydGljdWxhcmx5ICp1c2FibGUqIGZvciBvdXIgcHVycG9zZXMuICBUaGUgYm90dG9tIDMgcm93cyBvZiB0aGVcbi8vIHZhcmlvdXMgc2luZ2xlLXNjcmVlbiBtYXBzIGFyZSBhbGwgZWZmZWN0aXZlbHkgdW51c2VkLCBzbyB0aGF0IGdpdmVzIDQ4XG4vLyBieXRlcyBwZXIgbWFwLiAgU2hvcHMgKDE0MDAwLi4xNDJmZikgYWxzbyBoYXZlIGEgZ2lhbnQgYXJlYSB1cCB0b3AgdGhhdFxuLy8gY291bGQgcG9zc2libHkgYmUgdXNhYmxlLCB0aG91Z2ggd2UnZCBuZWVkIHRvIHRlYWNoIHRoZSB0aWxlLXJlYWRpbmcgY29kZVxuLy8gdG8gaWdub3JlIHdoYXRldmVyJ3Mgd3JpdHRlbiB0aGVyZSwgc2luY2UgaXQgKmlzKiB2aXNpYmxlIGJlZm9yZSB0aGUgbWVudVxuLy8gcG9wcyB1cC4gIFRoZXNlIGFyZSBiaWcgZW5vdWdoIHJlZ2lvbnMgdGhhdCB3ZSBjb3VsZCBldmVuIGNvbnNpZGVyIHVzaW5nXG4vLyB0aGVtIHZpYSBwYWdlLXN3YXBwaW5nIHRvIGdldCBleHRyYSBkYXRhIGluIGFyYml0cmFyeSBjb250ZXh0cy5cblxuLy8gU2hvcHMgYXJlIHBhcnRpY3VsYXJseSBuaWNlIGJlY2F1c2UgdGhleSdyZSBhbGwgMDAgaW4gdmFuaWxsYS5cbi8vIE90aGVyIHBvc3NpYmxlIHJlZ2lvbnM6XG4vLyAgIC0gNDggYnl0ZXMgYXQgJGZmYzAgKG1lemFtZSBzaHJpbmUpID0+ICRmZmUwIGlzIGFsbCAkZmYgaW4gdmFuaWxsYS5cblxuZXhwb3J0IGNsYXNzIFJvbSB7XG5cbiAgLy8gVGhlc2UgdmFsdWVzIGNhbiBiZSBxdWVyaWVkIHRvIGRldGVybWluZSBob3cgdG8gcGFyc2UgYW55IGdpdmVuIHJvbS5cbiAgLy8gVGhleSdyZSBhbGwgYWx3YXlzIHplcm8gZm9yIHZhbmlsbGFcbiAgc3RhdGljIHJlYWRvbmx5IE9NSVRfSVRFTV9HRVRfREFUQV9TVUZGSVggICAgPSBSb21PcHRpb24uYml0KDB4MTQyYzAsIDApO1xuICBzdGF0aWMgcmVhZG9ubHkgT01JVF9MT0NBTF9ESUFMT0dfU1VGRklYICAgICA9IFJvbU9wdGlvbi5iaXQoMHgxNDJjMCwgMSk7XG4gIHN0YXRpYyByZWFkb25seSBDT01QUkVTU0VEX01BUERBVEEgICAgICAgICAgID0gUm9tT3B0aW9uLmJpdCgweDE0MmMwLCAyKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNIT1BfQ09VTlQgICAgICAgICAgICAgICAgICAgPSBSb21PcHRpb24uYnl0ZSgweDE0MmMxKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNDQUxJTkdfTEVWRUxTICAgICAgICAgICAgICAgPSBSb21PcHRpb24uYnl0ZSgweDE0MmMyKTtcbiAgc3RhdGljIHJlYWRvbmx5IFVOSVFVRV9JVEVNX1RBQkxFICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQwKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNIT1BfREFUQV9UQUJMRVMgICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQzKTtcbiAgc3RhdGljIHJlYWRvbmx5IFRFTEVQQVRIWV9UQUJMRVMgICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQ2KTtcblxuICByZWFkb25seSBwcmc6IFVpbnQ4QXJyYXk7XG4gIHJlYWRvbmx5IGNocjogVWludDhBcnJheTtcblxuICAvLyBUT0RPIC0gd291bGQgYmUgbmljZSB0byBlbGltaW5hdGUgdGhlIGR1cGxpY2F0aW9uIGJ5IG1vdmluZ1xuICAvLyB0aGUgY3RvcnMgaGVyZSwgYnV0IHRoZXJlJ3MgbG90cyBvZiBwcmVyZXFzIGFuZCBkZXBlbmRlbmN5XG4gIC8vIG9yZGVyaW5nLCBhbmQgd2UgbmVlZCB0byBtYWtlIHRoZSBBREpVU1RNRU5UUywgZXRjLlxuICAvL3JlYWRvbmx5IGFyZWFzOiBBcmVhcztcbiAgcmVhZG9ubHkgc2NyZWVuczogU2NyZWVucztcbiAgcmVhZG9ubHkgdGlsZXNldHM6IFRpbGVzZXRzO1xuICByZWFkb25seSB0aWxlRWZmZWN0czogVGlsZUVmZmVjdHNbXTtcbiAgcmVhZG9ubHkgdHJpZ2dlcnM6IFRyaWdnZXJbXTtcbiAgcmVhZG9ubHkgcGF0dGVybnM6IFBhdHRlcm5bXTtcbiAgcmVhZG9ubHkgcGFsZXR0ZXM6IFBhbGV0dGVbXTtcbiAgcmVhZG9ubHkgbG9jYXRpb25zOiBMb2NhdGlvbnM7XG4gIHJlYWRvbmx5IHRpbGVBbmltYXRpb25zOiBUaWxlQW5pbWF0aW9uW107XG4gIHJlYWRvbmx5IGhpdGJveGVzOiBIaXRib3hbXTtcbiAgcmVhZG9ubHkgb2JqZWN0czogT2JqZWN0cztcbiAgcmVhZG9ubHkgYWRIb2NTcGF3bnM6IEFkSG9jU3Bhd25bXTtcbiAgcmVhZG9ubHkgbWV0YXNjcmVlbnM6IE1ldGFzY3JlZW5zO1xuICByZWFkb25seSBtZXRhc3ByaXRlczogTWV0YXNwcml0ZVtdO1xuICByZWFkb25seSBtZXRhdGlsZXNldHM6IE1ldGF0aWxlc2V0cztcbiAgcmVhZG9ubHkgaXRlbUdldHM6IEl0ZW1HZXRzO1xuICByZWFkb25seSBpdGVtczogSXRlbXM7XG4gIHJlYWRvbmx5IHNob3BzOiBTaG9wcztcbiAgcmVhZG9ubHkgc2xvdHM6IFNsb3RzO1xuICByZWFkb25seSBucGNzOiBOcGNzO1xuICByZWFkb25seSBib3NzS2lsbHM6IEJvc3NLaWxsW107XG4gIHJlYWRvbmx5IGJvc3NlczogQm9zc2VzO1xuICByZWFkb25seSB3aWxkV2FycDogV2lsZFdhcnA7XG4gIHJlYWRvbmx5IHRvd25XYXJwOiBUb3duV2FycDtcbiAgcmVhZG9ubHkgZmxhZ3M6IEZsYWdzO1xuICByZWFkb25seSBjb2luRHJvcHM6IENvaW5Ecm9wcztcbiAgcmVhZG9ubHkgc2NhbGluZzogU2NhbGluZztcbiAgcmVhZG9ubHkgcmFuZG9tTnVtYmVyczogUmFuZG9tTnVtYmVycztcblxuICByZWFkb25seSB0ZWxlcGF0aHk6IFRlbGVwYXRoeTtcbiAgcmVhZG9ubHkgbWVzc2FnZXM6IE1lc3NhZ2VzO1xuXG4gIHJlYWRvbmx5IG1vZHVsZXM6IE1vZHVsZVtdID0gW107XG5cbiAgc3BvaWxlcj86IFNwb2lsZXI7XG5cbiAgLy8gTk9URTogVGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzIG1heSBiZSBjaGFuZ2VkIGJldHdlZW4gcmVhZGluZyBhbmQgd3JpdGluZ1xuICAvLyB0aGUgcm9tLiAgSWYgdGhpcyBoYXBwZW5zLCB0aGUgd3JpdHRlbiByb20gd2lsbCBoYXZlIGRpZmZlcmVudCBvcHRpb25zLlxuICAvLyBUaGlzIGlzIGFuIGVmZmVjdGl2ZSB3YXkgdG8gY29udmVydCBiZXR3ZWVuIHR3byBzdHlsZXMuXG5cbiAgLy8gTWF4IG51bWJlciBvZiBzaG9wcy4gIFZhcmlvdXMgYmxvY2tzIG9mIG1lbW9yeSByZXF1aXJlIGtub3dpbmcgdGhpcyBudW1iZXJcbiAgLy8gdG8gYWxsb2NhdGUuXG4gIHNob3BDb3VudDogbnVtYmVyO1xuICAvLyBOdW1iZXIgb2Ygc2NhbGluZyBsZXZlbHMuICBEZXRlcm1pbmVzIHRoZSBzaXplIG9mIHRoZSBzY2FsaW5nIHRhYmxlcy5cbiAgc2NhbGluZ0xldmVsczogbnVtYmVyO1xuXG4gIC8vIEFkZHJlc3MgdG8gcmVhZC93cml0ZSB0aGUgYml0ZmllbGQgaW5kaWNhdGluZyB1bmlxdWUgaXRlbXMuXG4gIHVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3M6IG51bWJlcjtcbiAgLy8gQWRkcmVzcyBvZiBub3JtYWxpemVkIHByaWNlcyB0YWJsZSwgaWYgcHJlc2VudC4gIElmIHRoaXMgaXMgYWJzZW50IHRoZW4gd2VcbiAgLy8gYXNzdW1lIHByaWNlcyBhcmUgbm90IG5vcm1hbGl6ZWQgYW5kIGFyZSBhdCB0aGUgbm9ybWFsIHBhd24gc2hvcCBhZGRyZXNzLlxuICBzaG9wRGF0YVRhYmxlc0FkZHJlc3M6IG51bWJlcjtcbiAgLy8gQWRkcmVzcyBvZiByZWFycmFuZ2VkIHRlbGVwYXRoeSB0YWJsZXMuXG4gIHRlbGVwYXRoeVRhYmxlc0FkZHJlc3M6IG51bWJlcjtcbiAgLy8gV2hldGhlciB0aGUgdHJhaWxpbmcgJGZmIHNob3VsZCBiZSBvbWl0dGVkIGZyb20gdGhlIEl0ZW1HZXREYXRhIHRhYmxlLlxuICBvbWl0SXRlbUdldERhdGFTdWZmaXg6IGJvb2xlYW47XG4gIC8vIFdoZXRoZXIgdGhlIHRyYWlsaW5nIGJ5dGUgb2YgZWFjaCBMb2NhbERpYWxvZyBpcyBvbWl0dGVkLiAgVGhpcyBhZmZlY3RzXG4gIC8vIGJvdGggcmVhZGluZyBhbmQgd3JpdGluZyB0aGUgdGFibGUuICBNYXkgYmUgaW5mZXJyZWQgd2hpbGUgcmVhZGluZy5cbiAgb21pdExvY2FsRGlhbG9nU3VmZml4OiBib29sZWFuO1xuICAvLyBXaGV0aGVyIG1hcGRhdGEgaGFzIGJlZW4gY29tcHJlc3NlZC5cbiAgY29tcHJlc3NlZE1hcERhdGE6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3Iocm9tOiBVaW50OEFycmF5KSB7XG4gICAgY29uc3QgcHJnU2l6ZSA9IHJvbVs0XSAqIDB4NDAwMDtcbiAgICAvLyBOT1RFOiBjaHJTaXplID0gcm9tWzVdICogMHgyMDAwO1xuICAgIGNvbnN0IHByZ1N0YXJ0ID0gMHgxMCArIChyb21bNl0gJiA0ID8gNTEyIDogMCk7XG4gICAgY29uc3QgcHJnRW5kID0gcHJnU3RhcnQgKyBwcmdTaXplO1xuICAgIHRoaXMucHJnID0gcm9tLnN1YmFycmF5KHByZ1N0YXJ0LCBwcmdFbmQpO1xuICAgIHRoaXMuY2hyID0gcm9tLnN1YmFycmF5KHByZ0VuZCk7XG5cbiAgICB0aGlzLnNob3BDb3VudCA9IFJvbS5TSE9QX0NPVU5ULmdldChyb20pO1xuICAgIHRoaXMuc2NhbGluZ0xldmVscyA9IFJvbS5TQ0FMSU5HX0xFVkVMUy5nZXQocm9tKTtcbiAgICB0aGlzLnVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3MgPSBSb20uVU5JUVVFX0lURU1fVEFCTEUuZ2V0KHJvbSk7XG4gICAgdGhpcy5zaG9wRGF0YVRhYmxlc0FkZHJlc3MgPSBSb20uU0hPUF9EQVRBX1RBQkxFUy5nZXQocm9tKTtcbiAgICB0aGlzLnRlbGVwYXRoeVRhYmxlc0FkZHJlc3MgPSBSb20uVEVMRVBBVEhZX1RBQkxFUy5nZXQocm9tKTtcbiAgICB0aGlzLm9taXRJdGVtR2V0RGF0YVN1ZmZpeCA9IFJvbS5PTUlUX0lURU1fR0VUX0RBVEFfU1VGRklYLmdldChyb20pO1xuICAgIHRoaXMub21pdExvY2FsRGlhbG9nU3VmZml4ID0gUm9tLk9NSVRfTE9DQUxfRElBTE9HX1NVRkZJWC5nZXQocm9tKTtcbiAgICB0aGlzLmNvbXByZXNzZWRNYXBEYXRhID0gUm9tLkNPTVBSRVNTRURfTUFQREFUQS5nZXQocm9tKTtcblxuICAgIC8vIGlmIChjcmMzMihyb20pID09PSBFWFBFQ1RFRF9DUkMzMikge1xuICAgIGZvciAoY29uc3QgW2FkZHJlc3MsIG9sZCwgdmFsdWVdIG9mIEFESlVTVE1FTlRTKSB7XG4gICAgICBpZiAodGhpcy5wcmdbYWRkcmVzc10gPT09IG9sZCkgdGhpcy5wcmdbYWRkcmVzc10gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBMb2FkIHVwIGEgYnVuY2ggb2YgZGF0YSB0YWJsZXMuICBUaGlzIHdpbGwgaW5jbHVkZSBhIGxhcmdlIG51bWJlciBvZiB0aGVcbiAgICAvLyBkYXRhIHRhYmxlcyBpbiB0aGUgUk9NLiAgVGhlIGlkZWEgaXMgdGhhdCB3ZSBjYW4gZWRpdCB0aGUgYXJyYXlzIGxvY2FsbHlcbiAgICAvLyBhbmQgdGhlbiBoYXZlIGEgXCJjb21taXRcIiBmdW5jdGlvbiB0aGF0IHJlYnVpbGRzIHRoZSBST00gd2l0aCB0aGUgbmV3XG4gICAgLy8gYXJyYXlzLiAgV2UgbWF5IG5lZWQgdG8gd3JpdGUgYSBcInBhZ2VkIGFsbG9jYXRvclwiIHRoYXQgY2FuIGFsbG9jYXRlXG4gICAgLy8gY2h1bmtzIG9mIFJPTSBpbiBhIGdpdmVuIHBhZ2UuICBQcm9iYWJseSB3YW50IHRvIHVzZSBhIGdyZWVkeSBhbGdvcml0aG1cbiAgICAvLyB3aGVyZSB3ZSBzdGFydCB3aXRoIHRoZSBiaWdnZXN0IGNodW5rIGFuZCBwdXQgaXQgaW4gdGhlIHNtYWxsZXN0IHNwb3RcbiAgICAvLyB0aGF0IGZpdHMgaXQuICBQcmVzdW1hYmx5IHdlIGtub3cgdGhlIHNpemVzIHVwIGZyb250IGV2ZW4gYmVmb3JlIHdlIGhhdmVcbiAgICAvLyBhbGwgdGhlIGFkZHJlc3Nlcywgc28gd2UgY291bGQgZG8gYWxsIHRoZSBhbGxvY2F0aW9uIGF0IG9uY2UgLSBwcm9iYWJseVxuICAgIC8vIHJldHVybmluZyBhIHRva2VuIGZvciBlYWNoIGFsbG9jYXRpb24gYW5kIHRoZW4gYWxsIHRva2VucyBnZXQgZmlsbGVkIGluXG4gICAgLy8gYXQgb25jZSAoYWN0dWFsIHByb21pc2VzIHdvdWxkIGJlIG1vcmUgdW53ZWlsZHkpLlxuICAgIC8vIFRyaWNreSAtIHdoYXQgYWJvdXQgc2hhcmVkIGVsZW1lbnRzIG9mIGRhdGEgdGFibGVzIC0gd2UgcHVsbCB0aGVtXG4gICAgLy8gc2VwYXJhdGVseSwgYnV0IHdlJ2xsIG5lZWQgdG8gcmUtY29hbGVzY2UgdGhlbS4gIEJ1dCB0aGlzIHJlcXVpcmVzXG4gICAgLy8ga25vd2luZyB0aGVpciBjb250ZW50cyBCRUZPUkUgYWxsb2NhdGluZyB0aGVpciBzcGFjZS4gIFNvIHdlIG5lZWQgdHdvXG4gICAgLy8gYWxsb2NhdGUgbWV0aG9kcyAtIG9uZSB3aGVyZSB0aGUgY29udGVudCBpcyBrbm93biBhbmQgb25lIHdoZXJlIG9ubHkgdGhlXG4gICAgLy8gbGVuZ3RoIGlzIGtub3duLlxuICAgIHRoaXMudGlsZXNldHMgPSBuZXcgVGlsZXNldHModGhpcyk7XG4gICAgdGhpcy50aWxlRWZmZWN0cyA9IHNlcSgxMSwgaSA9PiBuZXcgVGlsZUVmZmVjdHModGhpcywgaSArIDB4YjMpKTtcbiAgICB0aGlzLnNjcmVlbnMgPSBuZXcgU2NyZWVucyh0aGlzKTtcbiAgICB0aGlzLm1ldGF0aWxlc2V0cyA9IG5ldyBNZXRhdGlsZXNldHModGhpcyk7XG4gICAgdGhpcy5tZXRhc2NyZWVucyA9IG5ldyBNZXRhc2NyZWVucyh0aGlzKTtcbiAgICB0aGlzLnRyaWdnZXJzID0gc2VxKDB4NDMsIGkgPT4gbmV3IFRyaWdnZXIodGhpcywgMHg4MCB8IGkpKTtcbiAgICB0aGlzLnBhdHRlcm5zID0gc2VxKHRoaXMuY2hyLmxlbmd0aCA+PiA0LCBpID0+IG5ldyBQYXR0ZXJuKHRoaXMsIGkpKTtcbiAgICB0aGlzLnBhbGV0dGVzID0gc2VxKDB4MTAwLCBpID0+IG5ldyBQYWxldHRlKHRoaXMsIGkpKTtcbiAgICB0aGlzLmxvY2F0aW9ucyA9IG5ldyBMb2NhdGlvbnModGhpcyk7XG4gICAgdGhpcy50aWxlQW5pbWF0aW9ucyA9IHNlcSg0LCBpID0+IG5ldyBUaWxlQW5pbWF0aW9uKHRoaXMsIGkpKTtcbiAgICB0aGlzLmhpdGJveGVzID0gc2VxKDI0LCBpID0+IG5ldyBIaXRib3godGhpcywgaSkpO1xuICAgIHRoaXMub2JqZWN0cyA9IG5ldyBPYmplY3RzKHRoaXMpO1xuICAgIHRoaXMuYWRIb2NTcGF3bnMgPSBzZXEoMHg2MCwgaSA9PiBuZXcgQWRIb2NTcGF3bih0aGlzLCBpKSk7XG4gICAgdGhpcy5tZXRhc3ByaXRlcyA9IHNlcSgweDEwMCwgaSA9PiBuZXcgTWV0YXNwcml0ZSh0aGlzLCBpKSk7XG4gICAgdGhpcy5tZXNzYWdlcyA9IG5ldyBNZXNzYWdlcyh0aGlzKTtcbiAgICB0aGlzLnRlbGVwYXRoeSA9IG5ldyBUZWxlcGF0aHkodGhpcyk7XG4gICAgdGhpcy5pdGVtR2V0cyA9IG5ldyBJdGVtR2V0cyh0aGlzKTtcbiAgICB0aGlzLml0ZW1zID0gbmV3IEl0ZW1zKHRoaXMpO1xuICAgIHRoaXMuc2hvcHMgPSBuZXcgU2hvcHModGhpcyk7IC8vIE5PVEU6IGRlcGVuZHMgb24gbG9jYXRpb25zIGFuZCBvYmplY3RzXG4gICAgdGhpcy5zbG90cyA9IG5ldyBTbG90cyh0aGlzKTtcbiAgICB0aGlzLm5wY3MgPSBuZXcgTnBjcyh0aGlzKTtcbiAgICB0aGlzLmJvc3NLaWxscyA9IHNlcSgweGUsIGkgPT4gbmV3IEJvc3NLaWxsKHRoaXMsIGkpKTtcbiAgICB0aGlzLndpbGRXYXJwID0gbmV3IFdpbGRXYXJwKHRoaXMpO1xuICAgIHRoaXMudG93bldhcnAgPSBuZXcgVG93bldhcnAodGhpcyk7XG4gICAgdGhpcy5jb2luRHJvcHMgPSBuZXcgQ29pbkRyb3BzKHRoaXMpO1xuICAgIHRoaXMuZmxhZ3MgPSBuZXcgRmxhZ3ModGhpcyk7XG4gICAgdGhpcy5ib3NzZXMgPSBuZXcgQm9zc2VzKHRoaXMpOyAvLyBOT1RFOiBtdXN0IGJlIGFmdGVyIE5wY3MgYW5kIEZsYWdzXG4gICAgdGhpcy5zY2FsaW5nID0gbmV3IFNjYWxpbmcodGhpcyk7XG4gICAgdGhpcy5yYW5kb21OdW1iZXJzID0gbmV3IFJhbmRvbU51bWJlcnModGhpcyk7XG5cbiAgICAvLyAvLyBUT0RPIC0gY29uc2lkZXIgcG9wdWxhdGluZyB0aGlzIGxhdGVyP1xuICAgIC8vIC8vIEhhdmluZyB0aGlzIGF2YWlsYWJsZSBtYWtlcyBpdCBlYXNpZXIgdG8gc2V0IGV4aXRzLCBldGMuXG4gICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmIChsb2MudXNlZCkgbG9jLmVuc3VyZU1ldGEoKTsgLy8gdHJpZ2dlciB0aGUgZ2V0dGVyXG4gICAgfVxuICB9XG5cbiAgdHJpZ2dlcihpZDogbnVtYmVyKTogVHJpZ2dlciB7XG4gICAgaWYgKGlkIDwgMHg4MCB8fCBpZCA+IDB4ZmYpIHRocm93IG5ldyBFcnJvcihgQmFkIHRyaWdnZXIgaWQgJCR7aGV4KGlkKX1gKTtcbiAgICByZXR1cm4gdGhpcy50cmlnZ2Vyc1tpZCAmIDB4N2ZdO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNyb3NzLXJlZmVyZW5jZSBtb25zdGVycy9tZXRhc3ByaXRlcy9tZXRhdGlsZXMvc2NyZWVucyB3aXRoIHBhdHRlcm5zL3BhbGV0dGVzXG4gIC8vIGdldCBtb25zdGVycygpOiBPYmplY3REYXRhW10ge1xuICAvLyAgIGNvbnN0IG1vbnN0ZXJzID0gbmV3IFNldDxPYmplY3REYXRhPigpO1xuICAvLyAgIGZvciAoY29uc3QgbCBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAvLyAgICAgaWYgKCFsLnVzZWQgfHwgIWwuaGFzU3Bhd25zKSBjb250aW51ZTtcbiAgLy8gICAgIGZvciAoY29uc3QgbyBvZiBsLnNwYXducykge1xuICAvLyAgICAgICBpZiAoby5pc01vbnN0ZXIoKSkgbW9uc3RlcnMuYWRkKHRoaXMub2JqZWN0c1tvLm1vbnN0ZXJJZF0pO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gWy4uLm1vbnN0ZXJzXS5zb3J0KCh4LCB5KSA9PiAoeC5pZCAtIHkuaWQpKTtcbiAgLy8gfVxuXG4gIGdldCBwcm9qZWN0aWxlcygpOiBPYmplY3REYXRhW10ge1xuICAgIGNvbnN0IHByb2plY3RpbGVzID0gbmV3IFNldDxPYmplY3REYXRhPigpO1xuICAgIGZvciAoY29uc3QgbSBvZiB0aGlzLm9iamVjdHMuZmlsdGVyKG8gPT4gbyBpbnN0YW5jZW9mIE1vbnN0ZXIpKSB7XG4gICAgICBpZiAobS5jaGlsZCkge1xuICAgICAgICBwcm9qZWN0aWxlcy5hZGQodGhpcy5vYmplY3RzW3RoaXMuYWRIb2NTcGF3bnNbbS5jaGlsZF0ub2JqZWN0SWRdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFsuLi5wcm9qZWN0aWxlc10uc29ydCgoeCwgeSkgPT4gKHguaWQgLSB5LmlkKSk7XG4gIH1cblxuICBnZXQgbW9uc3RlckdyYXBoaWNzKCkge1xuICAgIGNvbnN0IGdmeDoge1tpZDogc3RyaW5nXTpcbiAgICAgICAgICAgICAgICB7W2luZm86IHN0cmluZ106XG4gICAgICAgICAgICAgICAgIHtzbG90OiBudW1iZXIsIHBhdDogbnVtYmVyLCBwYWw6IG51bWJlcn19fSA9IHt9O1xuICAgIGZvciAoY29uc3QgbCBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKCFsLnVzZWQgfHwgIWwuaGFzU3Bhd25zKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgbyBvZiBsLnNwYXducykge1xuICAgICAgICBpZiAoIShvLmRhdGFbMl0gJiA3KSkge1xuICAgICAgICAgIGNvbnN0IHNsb3QgPSBvLmRhdGFbMl0gJiAweDgwID8gMSA6IDA7XG4gICAgICAgICAgY29uc3QgaWQgPSBoZXgoby5kYXRhWzNdICsgMHg1MCk7XG4gICAgICAgICAgY29uc3QgZGF0YSA9IGdmeFtpZF0gPSBnZnhbaWRdIHx8IHt9O1xuICAgICAgICAgIGRhdGFbYCR7c2xvdH06JHtsLnNwcml0ZVBhdHRlcm5zW3Nsb3RdLnRvU3RyaW5nKDE2KX06JHtcbiAgICAgICAgICAgICAgIGwuc3ByaXRlUGFsZXR0ZXNbc2xvdF0udG9TdHJpbmcoMTYpfWBdXG4gICAgICAgICAgICA9IHtwYWw6IGwuc3ByaXRlUGFsZXR0ZXNbc2xvdF0sXG4gICAgICAgICAgICAgICBwYXQ6IGwuc3ByaXRlUGF0dGVybnNbc2xvdF0sXG4gICAgICAgICAgICAgICBzbG90LFxuICAgICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBnZng7XG4gIH1cblxuICBnZXQgbG9jYXRpb25Nb25zdGVycygpIHtcbiAgICBjb25zdCBtOiB7W2lkOiBzdHJpbmddOiB7W2luZm86IHN0cmluZ106IG51bWJlcn19ID0ge307XG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWwudXNlZCB8fCAhbC5oYXNTcGF3bnMpIGNvbnRpbnVlO1xuICAgICAgLy8gd2hpY2ggbW9uc3RlcnMgYXJlIGluIHdoaWNoIHNsb3RzP1xuICAgICAgY29uc3Qgczoge1tpbmZvOiBzdHJpbmddOiBudW1iZXJ9ID0gbVsnJCcgKyBoZXgobC5pZCldID0ge307XG4gICAgICBmb3IgKGNvbnN0IG8gb2YgbC5zcGF3bnMpIHtcbiAgICAgICAgaWYgKCEoby5kYXRhWzJdICYgNykpIHtcbiAgICAgICAgICBjb25zdCBzbG90ID0gby5kYXRhWzJdICYgMHg4MCA/IDEgOiAwO1xuICAgICAgICAgIGNvbnN0IGlkID0gby5kYXRhWzNdICsgMHg1MDtcbiAgICAgICAgICBzW2Ake3Nsb3R9OiR7aWQudG9TdHJpbmcoMTYpfWBdID1cbiAgICAgICAgICAgICAgKHNbYCR7c2xvdH06JHtpZC50b1N0cmluZygxNil9YF0gfHwgMCkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtO1xuICB9XG5cbiAgLy8gVE9ETyAtIGZvciBlYWNoIHNwcml0ZSBwYXR0ZXJuIHRhYmxlLCBmaW5kIGFsbCB0aGUgcGFsZXR0ZXMgdGhhdCBpdCB1c2VzLlxuICAvLyBGaW5kIGFsbCB0aGUgbW9uc3RlcnMgb24gaXQuICBXZSBjYW4gcHJvYmFibHkgYWxsb3cgYW55IHBhbGV0dGUgc28gbG9uZ1xuICAvLyBhcyBvbmUgb2YgdGhlIHBhbGV0dGVzIGlzIHVzZWQgd2l0aCB0aGF0IHBhdHRlcm4uXG4gIC8vIFRPRE8gLSBtYXggbnVtYmVyIG9mIGluc3RhbmNlcyBvZiBhIG1vbnN0ZXIgb24gYW55IG1hcCAtIGkuZS4gYXZvaWQgaGF2aW5nXG4gIC8vIGZpdmUgZmx5ZXJzIG9uIHRoZSBzYW1lIG1hcCFcblxuICAvLyA0NjAgLSAwIG1lYW5zIGVpdGhlciBmbHllciBvciBzdGF0aW9uYXJ5XG4gIC8vICAgICAgICAgICAtIHN0YXRpb25hcnkgaGFzIDRhMCB+IDIwNCwyMDUsMjA2XG4gIC8vICAgICAgICAgICAgIChrcmFrZW4sIHN3YW1wIHBsYW50LCBzb3JjZXJvcilcbiAgLy8gICAgICAgNiAtIG1pbWljXG4gIC8vICAgICAgIDFmIC0gc3dpbW1lclxuICAvLyAgICAgICA1NCAtIHRvbWF0byBhbmQgYmlyZFxuICAvLyAgICAgICA1NSAtIHN3aW1tZXJcbiAgLy8gICAgICAgNTcgLSBub3JtYWxcbiAgLy8gICAgICAgNWYgLSBhbHNvIG5vcm1hbCwgYnV0IG1lZHVzYSBoZWFkIGlzIGZseWVyP1xuICAvLyAgICAgICA3NyAtIHNvbGRpZXJzLCBpY2Ugem9tYmllXG5cbi8vICAgLy8gRG9uJ3Qgd29ycnkgYWJvdXQgb3RoZXIgZGF0YXMgeWV0XG4vLyAgIHdyaXRlT2JqZWN0RGF0YSgpIHtcbi8vICAgICAvLyBidWlsZCB1cCBhIG1hcCBmcm9tIGFjdHVhbCBkYXRhIHRvIGluZGV4ZXMgdGhhdCBwb2ludCB0byBpdFxuLy8gICAgIGxldCBhZGRyID0gMHgxYWUwMDtcbi8vICAgICBjb25zdCBkYXRhcyA9IHt9O1xuLy8gICAgIGZvciAoY29uc3Qgb2JqZWN0IG9mIHRoaXMub2JqZWN0cykge1xuLy8gICAgICAgY29uc3Qgc2VyID0gb2JqZWN0LnNlcmlhbGl6ZSgpO1xuLy8gICAgICAgY29uc3QgZGF0YSA9IHNlci5qb2luKCcgJyk7XG4vLyAgICAgICBpZiAoZGF0YSBpbiBkYXRhcykge1xuLy8gLy9jb25zb2xlLmxvZyhgJCR7b2JqZWN0LmlkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLDApfTogUmV1c2luZyBleGlzdGluZyBkYXRhICQke2RhdGFzW2RhdGFdLnRvU3RyaW5nKDE2KX1gKTtcbi8vICAgICAgICAgb2JqZWN0Lm9iamVjdERhdGFCYXNlID0gZGF0YXNbZGF0YV07XG4vLyAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICBvYmplY3Qub2JqZWN0RGF0YUJhc2UgPSBhZGRyO1xuLy8gICAgICAgICBkYXRhc1tkYXRhXSA9IGFkZHI7XG4vLyAvL2NvbnNvbGUubG9nKGAkJHtvYmplY3QuaWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsMCl9OiBEYXRhIGlzIGF0ICQke1xuLy8gLy8gICAgICAgICAgICAgYWRkci50b1N0cmluZygxNil9OiAke0FycmF5LmZyb20oc2VyLCB4PT4nJCcreC50b1N0cmluZygxNikucGFkU3RhcnQoMiwwKSkuam9pbignLCcpfWApO1xuLy8gICAgICAgICBhZGRyICs9IHNlci5sZW5ndGg7XG4vLyAvLyBzZWVkIDM1MTc4MTEwMzZcbi8vICAgICAgIH1cbi8vICAgICAgIG9iamVjdC53cml0ZSgpO1xuLy8gICAgIH1cbi8vIC8vY29uc29sZS5sb2coYFdyb3RlIG9iamVjdCBkYXRhIGZyb20gJDFhYzAwIHRvICQke2FkZHIudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDUsIDApXG4vLyAvLyAgICAgICAgICAgICB9LCBzYXZpbmcgJHsweDFiZTkxIC0gYWRkcn0gYnl0ZXMuYCk7XG4vLyAgICAgcmV0dXJuIGFkZHI7XG4vLyAgIH1cblxuICBhc3NlbWJsZXIoKTogQXNzZW1ibGVyIHtcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgc2V0dGluZyBhIHNlZ21lbnQgcHJlZml4XG4gICAgcmV0dXJuIG5ldyBBc3NlbWJsZXIoKTtcbiAgfVxuXG4gIHdyaXRlRGF0YShkYXRhID0gdGhpcy5wcmcpIHtcbiAgICAvLyBXcml0ZSB0aGUgb3B0aW9ucyBmaXJzdFxuICAgIC8vIGNvbnN0IHdyaXRlciA9IG5ldyBXcml0ZXIodGhpcy5jaHIpO1xuICAgIC8vIHdyaXRlci5tb2R1bGVzLnB1c2goLi4udGhpcy5tb2R1bGVzKTtcbiAgICAvLyBNYXBEYXRhXG4gICAgLy93cml0ZXIuYWxsb2MoMHgxNDRmOCwgMHgxN2UwMCk7XG4gICAgLy8gTnBjRGF0YVxuICAgIC8vIE5PVEU6IDE5M2Y5IGlzIGFzc3VtaW5nICRmYiBpcyB0aGUgbGFzdCBsb2NhdGlvbiBJRC4gIElmIHdlIGFkZCBtb3JlIGxvY2F0aW9ucyBhdFxuICAgIC8vIHRoZSBlbmQgdGhlbiB3ZSdsbCBuZWVkIHRvIHB1c2ggdGhpcyBiYWNrIGEgZmV3IG1vcmUgYnl0ZXMuICBXZSBjb3VsZCBwb3NzaWJseVxuICAgIC8vIGRldGVjdCB0aGUgYmFkIHdyaXRlIGFuZCB0aHJvdyBhbiBlcnJvciwgYW5kL29yIGNvbXB1dGUgdGhlIG1heCBsb2NhdGlvbiBJRC5cbiAgICAvL3dyaXRlci5hbGxvYygweDE5M2Y5LCAweDFhYzAwKTtcbiAgICAvLyBPYmplY3REYXRhIChpbmRleCBhdCAxYWMwMC4uMWFlMDApXG4gICAgLy93cml0ZXIuYWxsb2MoMHgxYWUwMCwgMHgxYmQwMCk7IC8vIHNhdmUgNTEyIGJ5dGVzIGF0IGVuZCBmb3Igc29tZSBleHRyYSBjb2RlXG4gICAgY29uc3QgYSA9IHRoaXMuYXNzZW1ibGVyKCk7XG4gICAgLy8gTnBjU3Bhd25Db25kaXRpb25zXG4gICAgZnJlZShhLCAkMGUsIDB4ODc3YSwgMHg4OTVkKTtcbiAgICAvLyBOcGNEaWFsb2dcbiAgICBmcmVlKGEsICQwZSwgMHg4YWU1LCAweDk4ZjQpO1xuICAgIC8vIEl0ZW1HZXREYXRhICh0byAxZTA2NSkgKyBJdGVtVXNlRGF0YVxuICAgIGZyZWUoYSwgJDBlLCAweDlkZTYsIDB4YTAwMCk7XG4gICAgZnJlZShhLCAkMGYsIDB4YTAwMCwgMHhhMTA2KTtcbiAgICAvLyBUcmlnZ2VyRGF0YVxuICAgIC8vIE5PVEU6IFRoZXJlJ3Mgc29tZSBmcmVlIHNwYWNlIGF0IDFlM2MwLi4xZTNmMCwgYnV0IHdlIHVzZSB0aGlzIGZvciB0aGVcbiAgICAvLyBDaGVja0JlbG93Qm9zcyB0cmlnZ2Vycy5cbiAgICBmcmVlKGEsICQwZiwgMHhhMjAwLCAweGEzYzApO1xuICAgIC8vIEl0ZW1NZW51TmFtZVxuICAgIGZyZWUoYSwgJDEwLCAweDkxMWEsIDB4OTQ2OCk7XG4gICAgLy8ga2VlcCBpdGVtICQ0OSBcIiAgICAgICAgXCIgd2hpY2ggaXMgYWN0dWFsbHkgdXNlZCBzb21ld2hlcmU/XG4gICAgLy8gd3JpdGVyLmFsbG9jKDB4MjE0NzEsIDB4MjE0ZjEpOyAvLyBUT0RPIC0gZG8gd2UgbmVlZCBhbnkgb2YgdGhpcz9cbiAgICAvLyBJdGVtTWVzc2FnZU5hbWVcbiAgICAvLyB3cml0ZXIuYWxsb2MoMHgyOGU4MSwgMHgyOTIyYik7IC8vIE5PVEU6IHVuY292ZXJlZCB0aHJ1IDI5NDAwXG4gICAgLy8gd3JpdGVyLmFsbG9jKDB4MjkyMmIsIDB4Mjk0MDApOyAvLyBUT0RPIC0gbmVlZGVkP1xuICAgIC8vIE5PVEU6IG9uY2Ugd2UgcmVsZWFzZSB0aGUgb3RoZXIgbWVzc2FnZSB0YWJsZXMsIHRoaXMgd2lsbCBqdXN0IGJlIG9uZSBnaWFudCBibG9jay5cblxuICAgIC8vIE1lc3NhZ2UgdGFibGUgcGFydHNcbiAgICAvLyB3cml0ZXIuYWxsb2MoMHgyODAwMCwgMHgyODNmZSk7XG4gICAgLy8gTWVzc2FnZSB0YWJsZXNcbiAgICAvLyBUT0RPIC0gd2UgZG9uJ3QgdXNlIHRoZSB3cml0ZXIgdG8gYWxsb2NhdGUgdGhlIGFiYnJldmlhdGlvbiB0YWJsZXMsIGJ1dCB3ZSBjb3VsZFxuICAgIC8vd3JpdGVyLmZyZWUoJzB4MmEwMDAsIDB4MmZjMDApO1xuXG4gICAgLy8gaWYgKHRoaXMudGVsZXBhdGh5VGFibGVzQWRkcmVzcykge1xuICAgIC8vICAgd3JpdGVyLmFsbG9jKDB4MWQ4ZjQsIDB4MWRiMDApOyAvLyBsb2NhdGlvbiB0YWJsZSBhbGwgdGhlIHdheSB0aHJ1IG1haW5cbiAgICAvLyB9IGVsc2Uge1xuICAgIC8vICAgd3JpdGVyLmFsbG9jKDB4MWRhNGMsIDB4MWRiMDApOyAvLyBleGlzdGluZyBtYWluIHRhYmxlIGlzIGhlcmUuXG4gICAgLy8gfVxuXG4gICAgY29uc3QgbW9kdWxlcyA9IFsuLi50aGlzLm1vZHVsZXMsIGEubW9kdWxlKCldO1xuICAgIGNvbnN0IHdyaXRlQWxsID0gKHdyaXRhYmxlczogSXRlcmFibGU8e3dyaXRlKCk6IE1vZHVsZVtdfT4pID0+IHtcbiAgICAgIGZvciAoY29uc3QgdyBvZiB3cml0YWJsZXMpIHtcbiAgICAgICAgbW9kdWxlcy5wdXNoKC4uLncud3JpdGUoKSk7XG4gICAgICB9XG4gICAgfTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5sb2NhdGlvbnMud3JpdGUoKSk7XG4gICAgd3JpdGVBbGwodGhpcy5vYmplY3RzKTtcbiAgICB3cml0ZUFsbCh0aGlzLmhpdGJveGVzKTtcbiAgICB3cml0ZUFsbCh0aGlzLnRyaWdnZXJzKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5ucGNzLndyaXRlKCkpO1xuICAgIHdyaXRlQWxsKHRoaXMudGlsZXNldHMpO1xuICAgIHdyaXRlQWxsKHRoaXMudGlsZUVmZmVjdHMpO1xuICAgIHdyaXRlQWxsKHRoaXMuYWRIb2NTcGF3bnMpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLml0ZW1HZXRzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnNsb3RzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLml0ZW1zLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnNob3BzLndyaXRlKCkpO1xuICAgIHdyaXRlQWxsKHRoaXMuYm9zc0tpbGxzKTtcbiAgICB3cml0ZUFsbCh0aGlzLnBhdHRlcm5zKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy53aWxkV2FycC53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy50b3duV2FycC53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5jb2luRHJvcHMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuc2NhbGluZy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5ib3NzZXMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMucmFuZG9tTnVtYmVycy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy50ZWxlcGF0aHkud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMubWVzc2FnZXMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuc2NyZWVucy53cml0ZSgpKTtcblxuICAgIC8vIFJlc2VydmUgdGhlIGdsb2JhbCBzcGFjZSAxNDJjMC4uLjE0MmYwID8/P1xuICAgIC8vIGNvbnN0IHRoaXMuYXNzZW1ibGVyKCkuXG5cbiAgICBjb25zdCBsaW5rZXIgPSBuZXcgTGlua2VyKCk7XG4gICAgbGlua2VyLmJhc2UodGhpcy5wcmcsIDApO1xuICAgIGZvciAoY29uc3QgbSBvZiBtb2R1bGVzKSB7XG4gICAgICBsaW5rZXIucmVhZChtKTtcbiAgICB9XG4gICAgY29uc3Qgb3V0ID0gbGlua2VyLmxpbmsoKTtcbiAgICBvdXQuYXBwbHkoZGF0YSk7XG4gICAgaWYgKGRhdGEgIT09IHRoaXMucHJnKSByZXR1cm47IC8vIFRPRE8gLSBjbGVhbiB0aGlzIHVwXG4gICAgLy9saW5rZXIucmVwb3J0KCk7XG4gICAgY29uc3QgZXhwb3J0cyA9IGxpbmtlci5leHBvcnRzKCk7XG5cbiAgICBcbiAgICB0aGlzLnVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3MgPSBleHBvcnRzLmdldCgnS2V5SXRlbURhdGEnKSEub2Zmc2V0ITtcbiAgICB0aGlzLnNob3BDb3VudCA9IDExO1xuICAgIHRoaXMuc2hvcERhdGFUYWJsZXNBZGRyZXNzID0gZXhwb3J0cy5nZXQoJ1Nob3BEYXRhJyk/Lm9mZnNldCB8fCAwO1xuICAgIC8vIERvbid0IGluY2x1ZGUgdGhlc2UgaW4gdGhlIGxpbmtlcj8/P1xuICAgIFJvbS5TSE9QX0NPVU5ULnNldCh0aGlzLnByZywgdGhpcy5zaG9wQ291bnQpO1xuICAgIFJvbS5TQ0FMSU5HX0xFVkVMUy5zZXQodGhpcy5wcmcsIHRoaXMuc2NhbGluZ0xldmVscyk7XG4gICAgUm9tLlVOSVFVRV9JVEVNX1RBQkxFLnNldCh0aGlzLnByZywgdGhpcy51bmlxdWVJdGVtVGFibGVBZGRyZXNzKTtcbiAgICBSb20uU0hPUF9EQVRBX1RBQkxFUy5zZXQodGhpcy5wcmcsIHRoaXMuc2hvcERhdGFUYWJsZXNBZGRyZXNzIHx8IDApO1xuICAgIFJvbS5PTUlUX0lURU1fR0VUX0RBVEFfU1VGRklYLnNldCh0aGlzLnByZywgdGhpcy5vbWl0SXRlbUdldERhdGFTdWZmaXgpO1xuICAgIFJvbS5PTUlUX0xPQ0FMX0RJQUxPR19TVUZGSVguc2V0KHRoaXMucHJnLCB0aGlzLm9taXRMb2NhbERpYWxvZ1N1ZmZpeCk7XG4gICAgUm9tLkNPTVBSRVNTRURfTUFQREFUQS5zZXQodGhpcy5wcmcsIHRoaXMuY29tcHJlc3NlZE1hcERhdGEpO1xuICB9XG5cbiAgYW5hbHl6ZVRpbGVzKCkge1xuICAgIC8vIEZvciBhbnkgZ2l2ZW4gdGlsZSBpbmRleCwgd2hhdCBzY3JlZW5zIGRvZXMgaXQgYXBwZWFyIG9uLlxuICAgIC8vIEZvciB0aG9zZSBzY3JlZW5zLCB3aGljaCB0aWxlc2V0cyBkb2VzICppdCogYXBwZWFyIG9uLlxuICAgIC8vIFRoYXQgdGlsZSBJRCBpcyBsaW5rZWQgYWNyb3NzIGFsbCB0aG9zZSB0aWxlc2V0cy5cbiAgICAvLyBGb3JtcyBhIHBhcnRpdGlvbmluZyBmb3IgZWFjaCB0aWxlIElEID0+IHVuaW9uLWZpbmQuXG4gICAgLy8gR2l2ZW4gdGhpcyBwYXJ0aXRpb25pbmcsIGlmIEkgd2FudCB0byBtb3ZlIGEgdGlsZSBvbiBhIGdpdmVuXG4gICAgLy8gdGlsZXNldCwgYWxsIEkgbmVlZCB0byBkbyBpcyBmaW5kIGFub3RoZXIgdGlsZSBJRCB3aXRoIHRoZVxuICAgIC8vIHNhbWUgcGFydGl0aW9uIGFuZCBzd2FwIHRoZW0/XG5cbiAgICAvLyBNb3JlIGdlbmVyYWxseSwgd2UgY2FuIGp1c3QgcGFydGl0aW9uIHRoZSB0aWxlc2V0cy5cblxuICAgIC8vIEZvciBlYWNoIHNjcmVlbiwgZmluZCBhbGwgdGlsZXNldHMgVCBmb3IgdGhhdCBzY3JlZW5cbiAgICAvLyBUaGVuIGZvciBlYWNoIHRpbGUgb24gdGhlIHNjcmVlbiwgdW5pb24gVCBmb3IgdGhhdCB0aWxlLlxuXG4gICAgLy8gR2l2ZW4gYSB0aWxlc2V0IGFuZCBhIG1ldGF0aWxlIElELCBmaW5kIGFsbCB0aGUgc2NyZWVucyB0aGF0ICgxKSBhcmUgcmVuZGVyZWRcbiAgICAvLyB3aXRoIHRoYXQgdGlsZXNldCwgYW5kIChiKSB0aGF0IGNvbnRhaW4gdGhhdCBtZXRhdGlsZTsgdGhlbiBmaW5kIGFsbCAqb3RoZXIqXG4gICAgLy8gdGlsZXNldHMgdGhhdCB0aG9zZSBzY3JlZW5zIGFyZSBldmVyIHJlbmRlcmVkIHdpdGguXG5cbiAgICAvLyBHaXZlbiBhIHNjcmVlbiwgZmluZCBhbGwgYXZhaWxhYmxlIG1ldGF0aWxlIElEcyB0aGF0IGNvdWxkIGJlIGFkZGVkIHRvIGl0XG4gICAgLy8gd2l0aG91dCBjYXVzaW5nIHByb2JsZW1zIHdpdGggb3RoZXIgc2NyZWVucyB0aGF0IHNoYXJlIGFueSB0aWxlc2V0cy5cbiAgICAvLyAgLT4gdW51c2VkIChvciB1c2VkIGJ1dCBzaGFyZWQgZXhjbHVzaXZlbHkpIGFjcm9zcyBhbGwgdGlsZXNldHMgdGhlIHNjcmVlbiBtYXkgdXNlXG5cbiAgICAvLyBXaGF0IEkgd2FudCBmb3Igc3dhcHBpbmcgaXMgdGhlIGZvbGxvd2luZzpcbiAgICAvLyAgMS4gZmluZCBhbGwgc2NyZWVucyBJIHdhbnQgdG8gd29yayBvbiA9PiB0aWxlc2V0c1xuICAgIC8vICAyLiBmaW5kIHVudXNlZCBmbGFnZ2FiYmxlIHRpbGVzIGluIHRoZSBoYXJkZXN0IG9uZSxcbiAgICAvLyAgICAgd2hpY2ggYXJlIGFsc28gSVNPTEFURUQgaW4gdGhlIG90aGVycy5cbiAgICAvLyAgMy4gd2FudCB0aGVzZSB0aWxlcyB0byBiZSB1bnVzZWQgaW4gQUxMIHJlbGV2YW50IHRpbGVzZXRzXG4gICAgLy8gIDQuIHRvIG1ha2UgdGhpcyBzbywgZmluZCAqb3RoZXIqIHVudXNlZCBmbGFnZ2FibGUgdGlsZXMgaW4gb3RoZXIgdGlsZXNldHNcbiAgICAvLyAgNS4gc3dhcCB0aGUgdW51c2VkIHdpdGggdGhlIGlzb2xhdGVkIHRpbGVzIGluIHRoZSBvdGhlciB0aWxlc2V0c1xuXG4gICAgLy8gQ2F2ZXM6XG4gICAgLy8gIDBhOiAgICAgIDkwIC8gOWNcbiAgICAvLyAgMTU6IDgwIC8gOTAgLyA5Y1xuICAgIC8vICAxOTogICAgICA5MCAgICAgICh3aWxsIGFkZCB0byA4MD8pXG4gICAgLy8gIDNlOiAgICAgIDkwXG4gICAgLy9cbiAgICAvLyBJZGVhbGx5IHdlIGNvdWxkIHJldXNlIDgwJ3MgMS8yLzMvNCBmb3IgdGhpc1xuICAgIC8vICAwMTogOTAgfCA5NCA5Y1xuICAgIC8vICAwMjogOTAgfCA5NCA5Y1xuICAgIC8vICAwMzogICAgICA5NCA5Y1xuICAgIC8vICAwNDogOTAgfCA5NCA5Y1xuICAgIC8vXG4gICAgLy8gTmVlZCA0IG90aGVyIGZsYWdnYWJsZSB0aWxlIGluZGljZXMgd2UgY2FuIHN3YXAgdG8/XG4gICAgLy8gICA5MDogPT4gKDEsMiBuZWVkIGZsYWdnYWJsZTsgMyB1bnVzZWQ7IDQgYW55KSA9PiAwNywgMGUsIDEwLCAxMiwgMTMsIC4uLiwgMjAsIDIxLCAyMiwgLi4uXG4gICAgLy8gICA5NCA5YzogPT4gZG9uJ3QgbmVlZCBhbnkgZmxhZ2dhYmxlID0+IDA1LCAzYywgNjgsIDgzLCA4OCwgODksIDhhLCA5MCwgLi4uXG4gIH1cblxuICBkaXNqb2ludFRpbGVzZXRzKCkge1xuICAgIGNvbnN0IHRpbGVzZXRCeVNjcmVlbjogQXJyYXk8U2V0PG51bWJlcj4+ID0gW107XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghbG9jLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgdGlsZXNldCA9IGxvYy50aWxlc2V0O1xuICAgICAgLy9jb25zdCBleHQgPSBsb2Muc2NyZWVuUGFnZTtcbiAgICAgIGZvciAoY29uc3Qgcm93IG9mIGxvYy5zY3JlZW5zKSB7XG4gICAgICAgIGZvciAoY29uc3QgcyBvZiByb3cpIHtcbiAgICAgICAgICAodGlsZXNldEJ5U2NyZWVuW3NdIHx8ICh0aWxlc2V0QnlTY3JlZW5bc10gPSBuZXcgU2V0KCkpKS5hZGQodGlsZXNldCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgdGlsZXMgPSBzZXEoMjU2LCAoKSA9PiBuZXcgVW5pb25GaW5kPG51bWJlcj4oKSk7XG4gICAgZm9yIChsZXQgcyA9IDA7IHMgPCB0aWxlc2V0QnlTY3JlZW4ubGVuZ3RoOyBzKyspIHtcbiAgICAgIGlmICghdGlsZXNldEJ5U2NyZWVuW3NdKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgdCBvZiB0aGlzLnNjcmVlbnNbc10uYWxsVGlsZXNTZXQoKSkge1xuICAgICAgICB0aWxlc1t0XS51bmlvbihbLi4udGlsZXNldEJ5U2NyZWVuW3NdXSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIG91dHB1dFxuICAgIGZvciAobGV0IHQgPSAwOyB0IDwgdGlsZXMubGVuZ3RoOyB0KyspIHtcbiAgICAgIGNvbnN0IHAgPSB0aWxlc1t0XS5zZXRzKClcbiAgICAgICAgICAubWFwKChzOiBTZXQ8bnVtYmVyPikgPT4gWy4uLnNdLm1hcChoZXgpLmpvaW4oJyAnKSlcbiAgICAgICAgICAuam9pbignIHwgJyk7XG4gICAgICBjb25zb2xlLmxvZyhgVGlsZSAke2hleCh0KX06ICR7cH1gKTtcbiAgICB9XG4gICAgLy8gICBpZiAoIXRpbGVzZXRCeVNjcmVlbltpXSkge1xuICAgIC8vICAgICBjb25zb2xlLmxvZyhgTm8gdGlsZXNldCBmb3Igc2NyZWVuICR7aS50b1N0cmluZygxNil9YCk7XG4gICAgLy8gICAgIGNvbnRpbnVlO1xuICAgIC8vICAgfVxuICAgIC8vICAgdW5pb24udW5pb24oWy4uLnRpbGVzZXRCeVNjcmVlbltpXV0pO1xuICAgIC8vIH1cbiAgICAvLyByZXR1cm4gdW5pb24uc2V0cygpO1xuICB9XG5cbiAgLy8gQ3ljbGVzIGFyZSBub3QgYWN0dWFsbHkgY3ljbGljIC0gYW4gZXhwbGljaXQgbG9vcCBhdCB0aGUgZW5kIGlzIHJlcXVpcmVkIHRvIHN3YXAuXG4gIC8vIFZhcmlhbmNlOiBbMSwgMiwgbnVsbF0gd2lsbCBjYXVzZSBpbnN0YW5jZXMgb2YgMSB0byBiZWNvbWUgMiBhbmQgd2lsbFxuICAvLyAgICAgICAgICAgY2F1c2UgcHJvcGVydGllcyBvZiAxIHRvIGJlIGNvcGllZCBpbnRvIHNsb3QgMlxuICAvLyBDb21tb24gdXNhZ2UgaXMgdG8gc3dhcCB0aGluZ3Mgb3V0IG9mIHRoZSB3YXkgYW5kIHRoZW4gY29weSBpbnRvIHRoZVxuICAvLyBuZXdseS1mcmVlZCBzbG90LiAgU2F5IHdlIHdhbnRlZCB0byBmcmVlIHVwIHNsb3RzIFsxLCAyLCAzLCA0XSBhbmRcbiAgLy8gaGFkIGF2YWlsYWJsZS9mcmVlIHNsb3RzIFs1LCA2LCA3LCA4XSBhbmQgd2FudCB0byBjb3B5IGZyb20gWzksIGEsIGIsIGNdLlxuICAvLyBUaGVuIGN5Y2xlcyB3aWxsIGJlIFsxLCA1LCA5XSA/Pz8gbm9cbiAgLy8gIC0gcHJvYmFibHkgd2FudCB0byBkbyBzY3JlZW5zIHNlcGFyYXRlbHkgZnJvbSB0aWxlc2V0cy4uLj9cbiAgLy8gTk9URSAtIHdlIGRvbid0IGFjdHVhbGx5IHdhbnQgdG8gY2hhbmdlIHRpbGVzIGZvciB0aGUgbGFzdCBjb3B5Li4uIVxuICAvLyAgIGluIHRoaXMgY2FzZSwgdHNbNV0gPC0gdHNbMV0sIHRzWzFdIDwtIHRzWzldLCBzY3JlZW4ubWFwKDEgLT4gNSlcbiAgLy8gICByZXBsYWNlKFsweDkwXSwgWzUsIDEsIH45XSlcbiAgLy8gICAgID0+IDFzIHJlcGxhY2VkIHdpdGggNXMgaW4gc2NyZWVucyBidXQgOXMgTk9UIHJlcGxhY2VkIHdpdGggMXMuXG4gIC8vIEp1c3QgYnVpbGQgdGhlIHBhcnRpdGlvbiBvbmNlIGxhemlseT8gdGhlbiBjYW4gcmV1c2UuLi5cbiAgLy8gICAtIGVuc3VyZSBib3RoIHNpZGVzIG9mIHJlcGxhY2VtZW50IGhhdmUgY29ycmVjdCBwYXJ0aXRpb25pbmc/RVxuICAvLyAgICAgb3IganVzdCBkbyBpdCBvZmZsaW5lIC0gaXQncyBzaW1wbGVyXG4gIC8vIFRPRE8gLSBTYW5pdHkgY2hlY2s/ICBXYW50IHRvIG1ha2Ugc3VyZSBub2JvZHkgaXMgdXNpbmcgY2xvYmJlcmVkIHRpbGVzP1xuICBzd2FwTWV0YXRpbGVzKHRpbGVzZXRzOiBudW1iZXJbXSwgLi4uY3ljbGVzOiAobnVtYmVyIHwgbnVtYmVyW10pW11bXSkge1xuICAgIC8vIFByb2Nlc3MgdGhlIGN5Y2xlc1xuICAgIGNvbnN0IHJldiA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gICAgY29uc3QgcmV2QXJyOiBudW1iZXJbXSA9IHNlcSgweDEwMCk7XG4gICAgY29uc3QgYWx0ID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcbiAgICBjb25zdCBjcGwgPSAoeDogbnVtYmVyIHwgbnVtYmVyW10pOiBudW1iZXIgPT4gQXJyYXkuaXNBcnJheSh4KSA/IHhbMF0gOiB4IDwgMCA/IH54IDogeDtcbiAgICBmb3IgKGNvbnN0IGN5Y2xlIG9mIGN5Y2xlcykge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjeWNsZS5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY3ljbGVbaV0pKSB7XG4gICAgICAgICAgY29uc3QgYXJyID0gY3ljbGVbaV0gYXMgbnVtYmVyW107XG4gICAgICAgICAgYWx0LnNldChhcnJbMF0sIGFyclsxXSk7XG4gICAgICAgICAgY3ljbGVbaV0gPSBhcnJbMF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3ljbGUubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGogPSBjeWNsZVtpXSBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IGsgPSBjeWNsZVtpICsgMV0gYXMgbnVtYmVyO1xuICAgICAgICBpZiAoaiA8IDAgfHwgayA8IDApIGNvbnRpbnVlO1xuICAgICAgICByZXYuc2V0KGssIGopO1xuICAgICAgICByZXZBcnJba10gPSBqO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBjb25zdCByZXBsYWNlbWVudFNldCA9IG5ldyBTZXQocmVwbGFjZW1lbnRzLmtleXMoKSk7XG4gICAgLy8gRmluZCBpbnN0YW5jZXMgaW4gKDEpIHNjcmVlbnMsICgyKSB0aWxlc2V0cyBhbmQgYWx0ZXJuYXRlcywgKDMpIHRpbGVFZmZlY3RzXG4gICAgY29uc3Qgc2NyZWVucyA9IG5ldyBTZXQ8U2NyZWVuPigpO1xuICAgIGNvbnN0IHRpbGVFZmZlY3RzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgY29uc3QgdGlsZXNldHNTZXQgPSBuZXcgU2V0KHRpbGVzZXRzKTtcbiAgICBmb3IgKGNvbnN0IGwgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghbC51c2VkKSBjb250aW51ZTtcbiAgICAgIGlmICghdGlsZXNldHNTZXQuaGFzKGwudGlsZXNldCkpIGNvbnRpbnVlO1xuICAgICAgdGlsZUVmZmVjdHMuYWRkKGwudGlsZUVmZmVjdHMpO1xuICAgICAgZm9yIChjb25zdCBzY3JlZW4gb2YgbC5hbGxTY3JlZW5zKCkpIHtcbiAgICAgICAgc2NyZWVucy5hZGQoc2NyZWVuKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRG8gcmVwbGFjZW1lbnRzLlxuICAgIC8vIDEuIHNjcmVlbnM6IFs1LCAxLCB+OV0gPT4gY2hhbmdlIDFzIGludG8gNXNcbiAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiBzY3JlZW5zKSB7XG4gICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gc2NyZWVuLnRpbGVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHNjcmVlbi50aWxlc1tpXSA9IHJldkFycltzY3JlZW4udGlsZXNbaV1dO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyAyLiB0aWxlc2V0czogWzUsIDEgfjldID0+IGNvcHkgNSA8PSAxIGFuZCAxIDw9IDlcbiAgICBmb3IgKGNvbnN0IHRzaWQgb2YgdGlsZXNldHNTZXQpIHtcbiAgICAgIGNvbnN0IHRpbGVzZXQgPSB0aGlzLnRpbGVzZXRzW3RzaWRdO1xuICAgICAgZm9yIChjb25zdCBjeWNsZSBvZiBjeWNsZXMpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjeWNsZS5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhID0gY3BsKGN5Y2xlW2ldKTtcbiAgICAgICAgICBjb25zdCBiID0gY3BsKGN5Y2xlW2kgKyAxXSk7XG4gICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCA0OyBqKyspIHtcbiAgICAgICAgICAgIHRpbGVzZXQudGlsZXNbal1bYV0gPSB0aWxlc2V0LnRpbGVzW2pdW2JdO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aWxlc2V0LmF0dHJzW2FdID0gdGlsZXNldC5hdHRyc1tiXTtcbiAgICAgICAgICBpZiAoYiA8IDB4MjAgJiYgdGlsZXNldC5hbHRlcm5hdGVzW2JdICE9PSBiKSB7XG4gICAgICAgICAgICBpZiAoYSA+PSAweDIwKSB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCB1bmZsYWc6ICR7dHNpZH0gJHthfSAke2J9ICR7dGlsZXNldC5hbHRlcm5hdGVzW2JdfWApO1xuICAgICAgICAgICAgdGlsZXNldC5hbHRlcm5hdGVzW2FdID0gdGlsZXNldC5hbHRlcm5hdGVzW2JdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IFthLCBiXSBvZiBhbHQpIHtcbiAgICAgICAgdGlsZXNldC5hbHRlcm5hdGVzW2FdID0gYjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gMy4gdGlsZUVmZmVjdHNcbiAgICBmb3IgKGNvbnN0IHRlaWQgb2YgdGlsZUVmZmVjdHMpIHtcbiAgICAgIGNvbnN0IHRpbGVFZmZlY3QgPSB0aGlzLnRpbGVFZmZlY3RzW3RlaWQgLSAweGIzXTtcbiAgICAgIGZvciAoY29uc3QgY3ljbGUgb2YgY3ljbGVzKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3ljbGUubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYSA9IGNwbChjeWNsZVtpXSk7XG4gICAgICAgICAgY29uc3QgYiA9IGNwbChjeWNsZVtpICsgMV0pO1xuICAgICAgICAgIHRpbGVFZmZlY3QuZWZmZWN0c1thXSA9IHRpbGVFZmZlY3QuZWZmZWN0c1tiXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBhIG9mIGFsdC5rZXlzKCkpIHtcbiAgICAgICAgLy8gVGhpcyBiaXQgaXMgcmVxdWlyZWQgdG8gaW5kaWNhdGUgdGhhdCB0aGUgYWx0ZXJuYXRpdmUgdGlsZSdzXG4gICAgICAgIC8vIGVmZmVjdCBzaG91bGQgYmUgY29uc3VsdGVkLiAgU2ltcGx5IGhhdmluZyB0aGUgZmxhZyBhbmQgdGhlXG4gICAgICAgIC8vIHRpbGUgaW5kZXggPCAkMjAgaXMgbm90IHN1ZmZpY2llbnQuXG4gICAgICAgIHRpbGVFZmZlY3QuZWZmZWN0c1thXSB8PSAweDA4O1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBEb25lPyE/XG4gIH1cblxuICBtb3ZlRmxhZyhvbGRGbGFnOiBudW1iZXIsIG5ld0ZsYWc6IG51bWJlcikge1xuICAgIC8vIG5lZWQgdG8gdXBkYXRlIHRyaWdnZXJzLCBzcGF3bnMsIGRpYWxvZ3NcbiAgICBmdW5jdGlvbiByZXBsYWNlKGFycjogbnVtYmVyW10pIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhcnJbaV0gPT09IG9sZEZsYWcpIGFycltpXSA9IG5ld0ZsYWc7XG4gICAgICAgIGlmIChhcnJbaV0gPT09IH5vbGRGbGFnKSBhcnJbaV0gPSB+bmV3RmxhZztcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCB0cmlnZ2VyIG9mIHRoaXMudHJpZ2dlcnMpIHtcbiAgICAgIHJlcGxhY2UodHJpZ2dlci5jb25kaXRpb25zKTtcbiAgICAgIHJlcGxhY2UodHJpZ2dlci5mbGFncyk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbnBjIG9mIHRoaXMubnBjcykge1xuICAgICAgZm9yIChjb25zdCBjb25kcyBvZiBucGMuc3Bhd25Db25kaXRpb25zLnZhbHVlcygpKSByZXBsYWNlKGNvbmRzKTtcbiAgICAgIGZvciAoY29uc3QgZGlhbG9ncyBvZiBbbnBjLmdsb2JhbERpYWxvZ3MsIC4uLm5wYy5sb2NhbERpYWxvZ3MudmFsdWVzKCldKSB7XG4gICAgICAgIGZvciAoY29uc3QgZGlhbG9nIG9mIGRpYWxvZ3MpIHtcbiAgICAgICAgICBpZiAoZGlhbG9nLmNvbmRpdGlvbiA9PT0gb2xkRmxhZykgZGlhbG9nLmNvbmRpdGlvbiA9IG5ld0ZsYWc7XG4gICAgICAgICAgaWYgKGRpYWxvZy5jb25kaXRpb24gPT09IH5vbGRGbGFnKSBkaWFsb2cuY29uZGl0aW9uID0gfm5ld0ZsYWc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gYWxzbyBuZWVkIHRvIHVwZGF0ZSBtYXAgZmxhZ3MgaWYgPj0gJDIwMFxuICAgIGlmICgob2xkRmxhZyAmIH4weGZmKSA9PT0gMHgyMDAgJiYgKG5ld0ZsYWcgJiB+MHhmZikgPT09IDB4MjAwKSB7XG4gICAgICBmb3IgKGNvbnN0IGxvYyBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgICBmb3IgKGNvbnN0IGZsYWcgb2YgbG9jLmZsYWdzKSB7XG4gICAgICAgICAgaWYgKGZsYWcuZmxhZyA9PT0gb2xkRmxhZykgZmxhZy5mbGFnID0gbmV3RmxhZztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG5leHRGcmVlVHJpZ2dlcigpOiBUcmlnZ2VyIHtcbiAgICBmb3IgKGNvbnN0IHQgb2YgdGhpcy50cmlnZ2Vycykge1xuICAgICAgaWYgKCF0LnVzZWQpIHJldHVybiB0O1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIGFuIHVudXNlZCB0cmlnZ2VyLicpO1xuICB9XG5cbiAgLy8gY29tcHJlc3NNYXBEYXRhKCk6IHZvaWQge1xuICAvLyAgIGlmICh0aGlzLmNvbXByZXNzZWRNYXBEYXRhKSByZXR1cm47XG4gIC8vICAgdGhpcy5jb21wcmVzc2VkTWFwRGF0YSA9IHRydWU7XG4gIC8vICAgLy8gZm9yIChjb25zdCBsb2NhdGlvbiBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAvLyAgIC8vICAgaWYgKGxvY2F0aW9uLmV4dGVuZGVkKSBsb2NhdGlvbi5leHRlbmRlZCA9IDB4YTtcbiAgLy8gICAvLyB9XG4gIC8vICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgLy8gICAgIC8vdGhpcy5zY3JlZW5zWzB4YTAwIHwgaV0gPSB0aGlzLnNjcmVlbnNbMHgxMDAgfCBpXTtcbiAgLy8gICAgIHRoaXMubWV0YXNjcmVlbnMucmVudW1iZXIoMHgxMDAgfCBpLCAweGEwMCB8IGkpO1xuICAvLyAgICAgZGVsZXRlIHRoaXMuc2NyZWVuc1sweDEwMCB8IGldO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIFRPRE8gLSBkb2VzIG5vdCB3b3JrLi4uXG4gIC8vIFRPRE8gLSBjbGVhbiB0aGlzIHVwIHNvbWVob3cuLi4gd291bGQgYmUgbmljZSB0byB1c2UgdGhlIGFzc2VtYmxlci9saW5rZXJcbiAgLy8gICAgICAgIHcvIGFuIC5hbGlnbiBvcHRpb24gZm9yIHRoaXMsIGJ1dCB0aGVuIHdlIGhhdmUgdG8gaG9sZCBvbnRvIHdlaXJkXG4gIC8vICAgICAgICBkYXRhIGluIG1hbnkgcGxhY2VzLCB3aGljaCBpc24ndCBncmVhdC5cbiAgbW92ZVNjcmVlbnModGlsZXNldDogTWV0YXRpbGVzZXQsIHBhZ2U6IG51bWJlcik6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb21wcmVzc2VkTWFwRGF0YSkgdGhyb3cgbmV3IEVycm9yKGBNdXN0IGNvbXByZXNzIG1hcHMgZmlyc3QuYCk7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcbiAgICBsZXQgaSA9IHBhZ2UgPDwgODtcbiAgICB3aGlsZSAodGhpcy5zY3JlZW5zW2ldKSB7XG4gICAgICBpKys7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHRpbGVzZXQpIHtcbiAgICAgIGlmIChzY3JlZW4uaWQgPj0gMHgxMDApIGNvbnRpbnVlO1xuICAgICAgLy9pZiAoKGkgJiAweGZmKSA9PT0gMHgyMCkgdGhyb3cgbmV3IEVycm9yKGBObyByb29tIGxlZnQgb24gcGFnZS5gKTtcbiAgICAgIGNvbnN0IHByZXYgPSBzY3JlZW4uaWQ7XG4gICAgICBpZiAobWFwLmhhcyhwcmV2KSkgY29udGludWU7XG4gICAgICBjb25zdCBuZXh0ID0gc2NyZWVuLmlkID0gaSsrO1xuICAgICAgbWFwLnNldChwcmV2LCBuZXh0KTtcbiAgICAgIG1hcC5zZXQobmV4dCwgbmV4dCk7XG4gICAgICAvL3RoaXMubWV0YXNjcmVlbnMucmVudW1iZXIocHJldiwgbmV4dCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbG9jIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAobG9jLnRpbGVzZXQgIT0gdGlsZXNldC50aWxlc2V0SWQpIGNvbnRpbnVlO1xuICAgICAgbGV0IGFueU1vdmVkID0gZmFsc2U7XG4gICAgICBsZXQgYWxsTW92ZWQgPSB0cnVlO1xuICAgICAgZm9yIChjb25zdCByb3cgb2YgbG9jLnNjcmVlbnMpIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCByb3cubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBjb25zdCBtYXBwZWQgPSBtYXAuZ2V0KHJvd1tqXSk7XG4gICAgICAgICAgaWYgKG1hcHBlZCAhPSBudWxsKSB7XG4gICAgICAgICAgICByb3dbal0gPSBtYXBwZWQ7XG4gICAgICAgICAgICBhbnlNb3ZlZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFsbE1vdmVkID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoYW55TW92ZWQpIHtcbiAgICAgICAgaWYgKCFhbGxNb3ZlZCkgdGhyb3cgbmV3IEVycm9yKGBJbmNvbnNpc3RlbnQgbW92ZWApO1xuICAgICAgICAvL2xvYy5leHRlbmRlZCA9IHBhZ2U7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gVXNlIHRoZSBicm93c2VyIEFQSSB0byBsb2FkIHRoZSBST00uICBVc2UgI3Jlc2V0IHRvIGZvcmdldCBhbmQgcmVsb2FkLlxuICBzdGF0aWMgYXN5bmMgbG9hZChwYXRjaD86IChkYXRhOiBVaW50OEFycmF5KSA9PiB2b2lkfFByb21pc2U8dm9pZD4sXG4gICAgICAgICAgICAgICAgICAgIHJlY2VpdmVyPzogKHBpY2tlcjogRWxlbWVudCkgPT4gdm9pZCkge1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBwaWNrRmlsZShyZWNlaXZlcik7XG4gICAgaWYgKHBhdGNoKSBhd2FpdCBwYXRjaChmaWxlKTtcbiAgICByZXR1cm4gbmV3IFJvbShmaWxlKTtcbiAgfSAgXG59XG5cbi8vIGNvbnN0IGludGVyc2VjdHMgPSAobGVmdCwgcmlnaHQpID0+IHtcbi8vICAgaWYgKGxlZnQuc2l6ZSA+IHJpZ2h0LnNpemUpIHJldHVybiBpbnRlcnNlY3RzKHJpZ2h0LCBsZWZ0KTtcbi8vICAgZm9yIChsZXQgaSBvZiBsZWZ0KSB7XG4vLyAgICAgaWYgKHJpZ2h0LmhhcyhpKSkgcmV0dXJuIHRydWU7XG4vLyAgIH1cbi8vICAgcmV0dXJuIGZhbHNlO1xuLy8gfVxuXG4vLyBjb25zdCBUSUxFX0VGRkVDVFNfQllfVElMRVNFVCA9IHtcbi8vICAgMHg4MDogMHhiMyxcbi8vICAgMHg4NDogMHhiNCxcbi8vICAgMHg4ODogMHhiNSxcbi8vICAgMHg4YzogMHhiNixcbi8vICAgMHg5MDogMHhiNyxcbi8vICAgMHg5NDogMHhiOCxcbi8vICAgMHg5ODogMHhiOSxcbi8vICAgMHg5YzogMHhiYSxcbi8vICAgMHhhMDogMHhiYixcbi8vICAgMHhhNDogMHhiYyxcbi8vICAgMHhhODogMHhiNSxcbi8vICAgMHhhYzogMHhiZCxcbi8vIH07XG5cbi8vIE9ubHkgbWFrZXMgc2Vuc2UgaW4gdGhlIGJyb3dzZXIuXG5mdW5jdGlvbiBwaWNrRmlsZShyZWNlaXZlcj86IChwaWNrZXI6IEVsZW1lbnQpID0+IHZvaWQpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgaWYgKCFyZWNlaXZlcikgcmVjZWl2ZXIgPSBwaWNrZXIgPT4gZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChwaWNrZXIpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggIT09ICcjcmVzZXQnKSB7XG4gICAgICBjb25zdCBkYXRhID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JvbScpO1xuICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHJlc29sdmUoXG4gICAgICAgICAgICBVaW50OEFycmF5LmZyb20oXG4gICAgICAgICAgICAgICAgbmV3IEFycmF5KGRhdGEubGVuZ3RoIC8gMikuZmlsbCgwKS5tYXAoXG4gICAgICAgICAgICAgICAgICAgIChfLCBpKSA9PiBOdW1iZXIucGFyc2VJbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhWzIgKiBpXSArIGRhdGFbMiAqIGkgKyAxXSwgMTYpKSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB1cGxvYWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodXBsb2FkKTtcbiAgICB1cGxvYWQudHlwZSA9ICdmaWxlJztcbiAgICB1cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgY29uc3QgZmlsZSA9IHVwbG9hZC5maWxlcyFbMF07XG4gICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlbmQnLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGFyciA9IG5ldyBVaW50OEFycmF5KHJlYWRlci5yZXN1bHQgYXMgQXJyYXlCdWZmZXIpO1xuICAgICAgICBjb25zdCBzdHIgPSBBcnJheS5mcm9tKGFyciwgaGV4KS5qb2luKCcnKTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3JvbScsIHN0cik7XG4gICAgICAgIHVwbG9hZC5yZW1vdmUoKTtcbiAgICAgICAgcmVzb2x2ZShhcnIpO1xuICAgICAgfSk7XG4gICAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZSk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5leHBvcnQgY29uc3QgRVhQRUNURURfQ1JDMzIgPSAweDFiZDM5MDMyO1xuXG4vLyBGb3JtYXQ6IFthZGRyZXNzLCBicm9rZW4sIGZpeGVkXVxuY29uc3QgQURKVVNUTUVOVFMgPSBbXG4gIC8vIEZpeCBzb2Z0bG9jayBpbiBjcnlwdCBkdWUgdG8gZmx5YWJsZSB3YWxsIChlZmZlY3RzICRiNiB0aWxlICQ0NilcbiAgWzB4MTM2NDYsIDB4MDIsIDB4MDZdLFxuICAvLyBOb3JtYWxpemUgY2F2ZSBlbnRyYW5jZSBpbiAwMSBvdXRzaWRlIHN0YXJ0XG4gIFsweDE0NTQ4LCAweDU2LCAweDUwXSxcbiAgLy8gRml4IGJyb2tlbiAoZmFsbC10aHJvdWdoKSBleGl0IG91dHNpZGUgc3RhcnRcbiAgWzB4MTQ1NmEsIDB4MDAsIDB4ZmZdLFxuICAvLyBNb3ZlIExlYWYgbm9ydGggZW50cmFuY2UgdG8gYmUgcmlnaHQgbmV4dCB0byBleGl0IChjb25zaXN0ZW50IHdpdGggR29hKVxuICBbMHgxNDU4ZiwgMHgzOCwgMHgzMF0sXG4gIC8vIE5vcm1hbGl6ZSBzZWFsZWQgY2F2ZSBlbnRyYW5jZS9leGl0IGFuZCB6ZWJ1IGNhdmUgZW50cmFuY2VcbiAgWzB4MTQ2MTgsIDB4NjAsIDB4NzBdLFxuICBbMHgxNDYyNiwgMHhhOCwgMHhhMF0sXG4gIFsweDE0NjMzLCAweDE1LCAweDE2XSxcbiAgWzB4MTQ2MzcsIDB4MTUsIDB4MTZdLFxuICAvLyBOb3JtYWxpemUgY29yZGVsIHBsYWluIGVudHJhbmNlIGZyb20gc2VhbGVkIGNhdmVcbiAgWzB4MTQ5NTEsIDB4YTgsIDB4YTBdLFxuICBbMHgxNDk1MywgMHg5OCwgMHg5MF0sXG4gIC8vIE5vcm1hbGl6ZSBjb3JkZWwgc3dhcCBlbnRyYW5jZVxuICBbMHgxNGExOSwgMHg3OCwgMHg3MF0sXG4gIC8vIFJlZHVuZGFudCBleGl0IG5leHQgdG8gc3RvbSdzIGRvb3IgaW4gJDE5XG4gIFsweDE0YWViLCAweDA5LCAweGZmXSxcbiAgLy8gTm9ybWFsaXplIHN3YW1wIGVudHJhbmNlIHBvc2l0aW9uXG4gIFsweDE0YjQ5LCAweDgwLCAweDg4XSxcbiAgLy8gTm9ybWFsaXplIGFtYXpvbmVzIGVudHJhbmNlL2V4aXQgcG9zaXRpb25cbiAgWzB4MTRiODcsIDB4MjAsIDB4MzBdLFxuICBbMHgxNGI5YSwgMHgwMSwgMHgwMl0sXG4gIFsweDE0YjllLCAweDAxLCAweDAyXSxcbiAgLy8gRml4IGdhcmJhZ2UgbWFwIHNxdWFyZSBpbiBib3R0b20tcmlnaHQgb2YgTXQgU2FicmUgV2VzdCBjYXZlXG4gIFsweDE0ZGI5LCAweDA4LCAweDgwXSxcbiAgLy8gTm9ybWFsaXplIHNhYnJlIG4gZW50cmFuY2UgYmVsb3cgc3VtbWl0XG4gIFsweDE0ZWY2LCAweDY4LCAweDYwXSxcbiAgLy8gRml4IGdhcmJhZ2UgbWFwIHNxdWFyZSBpbiBib3R0b20tbGVmdCBvZiBMaW1lIFRyZWUgVmFsbGV5XG4gIFsweDE1NDVkLCAweGZmLCAweDAwXSxcbiAgLy8gTm9ybWFsaXplIGxpbWUgdHJlZSB2YWxsZXkgU0UgZW50cmFuY2VcbiAgWzB4MTU0NjksIDB4NzgsIDB4NzBdLFxuICAvLyBOb3JtYWxpemUgcG9ydG9hIHNlL3N3IGVudHJhbmNlc1xuICBbMHgxNTgwNiwgMHg5OCwgMHhhMF0sXG4gIFsweDE1ODBhLCAweDk4LCAweGEwXSxcbiAgLy8gTm9ybWFsaXplIHBvcnRvYSBwYWxhY2UgZW50cmFuY2VcbiAgWzB4MTU4MGUsIDB4NTgsIDB4NTBdLFxuICAvLyBNYXJrIGJhZCBlbnRyYW5jZS9leGl0IGluIHBvcnRvYVxuICBbMHgxNTgxZCwgMHgwMCwgMHhmZl0sXG4gIFsweDE1ODRlLCAweGRiLCAweGZmXSxcbiAgLy8gTm9ybWFsaXplIGZpc2hlcm1hbiBpc2xhbmQgZW50cmFuY2VcbiAgWzB4MTU4NzUsIDB4NzgsIDB4NzBdLFxuICAvLyBOb3JtYWxpemUgem9tYmllIHRvd24gZW50cmFuY2UgZnJvbSBwYWxhY2VcbiAgWzB4MTViNGYsIDB4NzgsIDB4ODBdLFxuICAvLyBSZW1vdmUgdW51c2VkIG1hcCBzY3JlZW5zIGZyb20gRXZpbCBTcGlyaXQgbG93ZXJcbiAgWzB4MTViYWYsIDB4ZjAsIDB4ODBdLFxuICBbMHgxNWJiNiwgMHhkZiwgMHg4MF0sXG4gIFsweDE1YmI3LCAweDk2LCAweDgwXSxcbiAgLy8gTm9ybWFsaXplIHNhYmVyYSBwYWxhY2UgMSBlbnRyYW5jZSB1cCBvbmUgdGlsZVxuICBbMHgxNWNlMywgMHhkZiwgMHhjZl0sXG4gIFsweDE1Y2VlLCAweDZlLCAweDZkXSxcbiAgWzB4MTVjZjIsIDB4NmUsIDB4NmRdLFxuICAvLyBOb3JtYWxpemUgc2FiZXJhIHBhbGFjZSAzIGVudHJhbmNlIHVwIG9uZSB0aWxlXG4gIFsweDE1ZDhlLCAweGRmLCAweGNmXSxcbiAgWzB4MTVkOTEsIDB4MmUsIDB4MmRdLFxuICBbMHgxNWQ5NSwgMHgyZSwgMHgyZF0sXG4gIC8vIE5vcm1hbGl6ZSBqb2VsIGVudHJhbmNlXG4gIFsweDE1ZTNhLCAweGQ4LCAweGRmXSxcbiAgLy8gTm9ybWFsaXplIGdvYSB2YWxsZXkgcmlnaHRoYW5kIGVudHJhbmNlXG4gIFsweDE1ZjM5LCAweDc4LCAweDcwXSxcbiAgLy8gTWFyayBiYWQgZW50cmFuY2UvZXhpdCBpbiBnb2EgdmFsbGV5XG4gIFsweDE1ZjQwLCAweDAyLCAweGZmXSxcbiAgWzB4MTVmNjEsIDB4OGQsIDB4ZmZdLFxuICBbMHgxNWY2NSwgMHg4ZCwgMHhmZl0sXG4gIC8vIE5vcm1hbGl6ZSBzaHlyb24gbG93ZXIgZW50cmFuY2VcbiAgWzB4MTYzZmQsIDB4NDgsIDB4NDBdLFxuICAvLyBOb3JtYWxpemUgc2h5cm9uIGZvcnRyZXNzIGVudHJhbmNlXG4gIFsweDE2NDAzLCAweDU1LCAweDUwXSxcbiAgLy8gTm9ybWFsaXplIGdvYSBzb3V0aCBlbnRyYW5jZVxuICBbMHgxNjQ1YiwgMHhkOCwgMHhkZl0sXG4gIC8vIEZpeCBwYXR0ZXJuIHRhYmxlIGZvciBkZXNlcnQgMSAoYW5pbWF0aW9uIGdsb3NzZXMgb3ZlciBpdClcbiAgWzB4MTY0Y2MsIDB4MDQsIDB4MjBdLFxuICAvLyBGaXggZ2FyYmFnZSBhdCBib3R0b20gb2Ygb2FzaXMgY2F2ZSBtYXAgKGl0J3MgOHgxMSwgbm90IDh4MTIgPT4gZml4IGhlaWdodClcbiAgWzB4MTY0ZmYsIDB4MGIsIDB4MGFdLFxuICAvLyBOb3JtYWxpemUgc2FoYXJhIGVudHJhbmNlL2V4aXQgcG9zaXRpb25cbiAgWzB4MTY2MGQsIDB4MjAsIDB4MzBdLFxuICBbMHgxNjYyNCwgMHgwMSwgMHgwMl0sXG4gIFsweDE2NjI4LCAweDAxLCAweDAyXSxcbiAgLy8gUmVtb3ZlIHVudXNlZCBzY3JlZW5zIGZyb20gbWFkbzIgYXJlYVxuICBbMHgxNmRiMCwgMHg5YSwgMHg4MF0sXG4gIFsweDE2ZGI0LCAweDllLCAweDgwXSxcbiAgWzB4MTZkYjgsIDB4OTEsIDB4ODBdLFxuICBbMHgxNmRiYywgMHg5ZSwgMHg4MF0sXG4gIFsweDE2ZGMwLCAweDkxLCAweDgwXSxcbiAgLy8gTWFyayBiYWQgZW50cmFuY2UgaW4gdW51c2VkIG1hZG8yIGFyZWFcbiAgWzB4MTZkZTgsIDB4MDAsIDB4ZmZdLFxuICAvLyBOb3JtYWxpemUgbWFkbzItc2lkZSBoZWNrd2F5IGVudHJhbmNlXG4gIFsweDE2ZGVkLCAweGRmLCAweGQwXSxcbiAgLy8gRml4IGJvZ3VzIGV4aXRzIGluIHVudXNlZCBtYWRvMiBhcmVhXG4gIC8vIChleGl0cyAyIGFuZCAzIGFyZSBiYWQsIHNvIG1vdmUgNCBhbmQgNSBvbiB0b3Agb2YgdGhlbSlcbiAgWzB4MTZkZjgsIDB4MGMsIDB4NWNdLFxuICBbMHgxNmRmOSwgMHhiMCwgMHhiOV0sXG4gIFsweDE2ZGZhLCAweDAwLCAweDAyXSxcbiAgWzB4MTZkZmMsIDB4MGMsIDB4NWNdLFxuICBbMHgxNmRmZCwgMHhiMCwgMHhiOV0sXG4gIFsweDE2ZGZlLCAweDAwLCAweDAyXSxcbiAgWzB4MTZkZmYsIDB4MDcsIDB4ZmZdLFxuICAvLyBOb3JtYWxpemUgYXJ5bGxpcyBlbnRyYW5jZVxuICBbMHgxNzRlZSwgMHg4MCwgMHg4OF0sXG4gIC8vIE5vcm1hbGl6ZSBqb2VsIHNoZWQgYm90dG9tIGFuZCBzZWNyZXQgcGFzc2FnZSBlbnRyYW5jZXNcbiAgWzB4MTc3YzEsIDB4ODgsIDB4ODBdLFxuICBbMHgxNzdjNSwgMHg5OCwgMHhhMF0sXG4gIFsweDE3N2M3LCAweDU4LCAweDUwXSxcbiAgLy8gRml4IGJhZCBtdXNpYyBpbiB6b21iaWV0b3duIGhvdXNlczogJDEwIHNob3VsZCBiZSAkMDEuXG4gIFsweDE3ODJhLCAweDEwLCAweDAxXSxcbiAgWzB4MTc4NTcsIDB4MTAsIDB4MDFdLFxuICAvLyBOb3JtYWxpemUgc3dhbiBkYW5jZSBoYWxsIGVudHJhbmNlIHRvIGJlIGNvbnNpc3RlbnQgd2l0aCBzdG9tJ3MgaG91c2VcbiAgWzB4MTc5NTQsIDB4ODAsIDB4NzhdLFxuICAvLyBOb3JtYWxpemUgc2h5cm9uIGRvam8gZW50cmFuY2UgdG8gYmUgY29uc2lzdGVudCB3aXRoIHN0b20ncyBob3VzZVxuICBbMHgxNzlhMiwgMHg4MCwgMHg3OF0sXG4gIC8vIEZpeCBiYWQgc2NyZWVucyBpbiB0b3dlclxuICBbMHgxN2I4YSwgMHgwMCwgMHg0MF0sIC8vIHRvd2VyIDFcbiAgWzB4MTdiOTAsIDB4MDAsIDB4NDBdLFxuICBbMHgxN2JjZSwgMHgwMCwgMHg0MF0sIC8vIHRvd2VyIDJcbiAgWzB4MTdiZDQsIDB4MDAsIDB4NDBdLFxuICBbMHgxN2MwZSwgMHgwMCwgMHg0MF0sIC8vIHRvd2VyIDNcbiAgWzB4MTdjMTQsIDB4MDAsIDB4NDBdLFxuICBbMHgxN2M0ZSwgMHgwMCwgMHg0MF0sIC8vIHRvd2VyIDRcbiAgWzB4MTdjNTQsIDB4MDAsIDB4NDBdLFxuICAvLyBGaXggYmFkIHNwYXduIGluIE10IEh5ZHJhIChtYWtlIGl0IGFuIGV4dHJhIHB1ZGRsZSkuXG4gIFsweDE5ZjAyLCAweDQwLCAweDgwXSxcbiAgWzB4MTlmMDMsIDB4MzMsIDB4MzJdLFxuICAvLyBGaXggYmFkIHNwYXduIGluIFNhYmVyYSAyJ3MgbGV2ZWwgKHByb2JhYmx5IG1lYW50IHRvIGJlIGEgZmxhaWwgZ3V5KS5cbiAgWzB4MWExZTAsIDB4NDAsIDB4YzBdLCAvLyBtYWtlIHN1cmUgdG8gZml4IHBhdHRlcm4gc2xvdCwgdG9vIVxuICBbMHgxYTFlMSwgMHgzZCwgMHgzNF0sXG4gIC8vIFBvaW50IEFtYXpvbmVzIG91dGVyIGd1YXJkIHRvIHBvc3Qtb3ZlcmZsb3cgbWVzc2FnZSB0aGF0J3MgYWN0dWFsbHkgc2hvd24uXG4gIFsweDFjZjA1LCAweDQ3LCAweDQ4XSxcbiAgLy8gUmVtb3ZlIHN0cmF5IGZsaWdodCBncmFudGVyIGluIFpvbWJpZXRvd24uXG4gIFsweDFkMzExLCAweDIwLCAweGEwXSxcbiAgWzB4MWQzMTIsIDB4MzAsIDB4MDBdLFxuICAvLyBGaXggcXVlZW4ncyBkaWFsb2cgdG8gdGVybWluYXRlIG9uIGxhc3QgaXRlbSwgcmF0aGVyIHRoYW4gb3ZlcmZsb3csXG4gIC8vIHNvIHRoYXQgd2UgZG9uJ3QgcGFyc2UgZ2FyYmFnZS5cbiAgWzB4MWNmZjksIDB4NjAsIDB4ZTBdLFxuICAvLyBGaXggQW1hem9uZXMgb3V0ZXIgZ3VhcmQgbWVzc2FnZSB0byBub3Qgb3ZlcmZsb3cuXG4gIFsweDJjYTkwLCAweDAyLCAweDAwXSxcbiAgLy8gRml4IHNlZW1pbmdseS11bnVzZWQga2Vuc3UgbWVzc2FnZSAxZDoxNyBvdmVyZmxvd2luZyBpbnRvIDFkOjE4XG4gIFsweDJmNTczLCAweDAyLCAweDAwXSxcbiAgLy8gRml4IHVudXNlZCBrYXJtaW5lIHRyZWFzdXJlIGNoZXN0IG1lc3NhZ2UgMjA6MTguXG4gIFsweDJmYWU0LCAweDVmLCAweDAwXSxcbl0gYXMgY29uc3Q7XG4iXX0=