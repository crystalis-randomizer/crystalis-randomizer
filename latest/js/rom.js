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
    moveScreens(tilesetArray, plane) {
        if (!this.compressedMapData)
            throw new Error(`Must compress maps first.`);
        const map = new Map();
        let i = plane << 8;
        while (this.screens[i]) {
            i++;
        }
        const tilesets = new Set(tilesetArray);
        for (const tileset of tilesets) {
            for (const screen of tileset) {
                if (screen.sid >= 0x100) {
                    map.set(screen.sid, screen.sid);
                    continue;
                }
                const prev = screen.sid;
                if (!map.has(prev)) {
                    const next = i++;
                    map.set(prev, next);
                    map.set(next, next);
                    this.metascreens.renumber(prev, next, tilesets);
                }
            }
        }
        if ((i >>> 8) !== plane)
            throw new Error(`Out of space on page ${plane}`);
        const missed = new Set();
        for (const loc of this.locations) {
            if (!tilesets.has(loc.meta.tileset))
                continue;
            let anyMoved = false;
            for (const row of loc.screens) {
                for (let j = 0; j < row.length; j++) {
                    const mapped = map.get(row[j]);
                    if (mapped != null) {
                        row[j] = mapped;
                        anyMoved = true;
                    }
                    else {
                        missed.add(loc.name);
                    }
                }
            }
            if (anyMoved && missed.size)
                throw new Error(`Inconsistent move [${[...tilesets].map(t => t.name).join(', ')}] to plane ${plane}: missed ${[...missed].join(', ')}`);
        }
    }
    static async load(patch, receiver) {
        const file = await pickFile(receiver);
        if (patch)
            await patch(file);
        return new Rom(file);
    }
    static async loadBytes() {
        return await pickFile();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2pzL3JvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDN0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRXZDLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUUvQyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUM3QyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDckMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUM1QyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQWMsWUFBWSxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDL0QsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDbEMsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBRXBELE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFB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QUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFHckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUdyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUdyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFHckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztDQUNiLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQge0Fzc2VtYmxlcn0gZnJvbSAnLi9hc20vYXNzZW1ibGVyLmpzJztcbmltcG9ydCB7QXNzZW1ibGVyfSBmcm9tICcuL2FzbS9hc3NlbWJsZXIuanMnO1xuaW1wb3J0IHtMaW5rZXJ9IGZyb20gJy4vYXNtL2xpbmtlci5qcyc7XG5pbXBvcnQge01vZHVsZX0gZnJvbSAnLi9hc20vbW9kdWxlLmpzJztcbmltcG9ydCB7QWRIb2NTcGF3bn0gZnJvbSAnLi9yb20vYWRob2NzcGF3bi5qcyc7XG4vL2ltcG9ydCB7QXJlYXN9IGZyb20gJy4vcm9tL2FyZWEuanMnO1xuaW1wb3J0IHtCb3NzS2lsbH0gZnJvbSAnLi9yb20vYm9zc2tpbGwuanMnO1xuaW1wb3J0IHtCb3NzZXN9IGZyb20gJy4vcm9tL2Jvc3Nlcy5qcyc7XG5pbXBvcnQge0NvaW5Ecm9wc30gZnJvbSAnLi9yb20vY29pbmRyb3BzLmpzJztcbmltcG9ydCB7RmxhZ3N9IGZyb20gJy4vcm9tL2ZsYWdzLmpzJztcbmltcG9ydCB7SGl0Ym94fSBmcm9tICcuL3JvbS9oaXRib3guanMnO1xuaW1wb3J0IHtJdGVtc30gZnJvbSAnLi9yb20vaXRlbS5qcyc7XG5pbXBvcnQge0l0ZW1HZXRzfSBmcm9tICcuL3JvbS9pdGVtZ2V0LmpzJztcbmltcG9ydCB7TG9jYXRpb25zfSBmcm9tICcuL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge01lc3NhZ2VzfSBmcm9tICcuL3JvbS9tZXNzYWdlcy5qcyc7XG5pbXBvcnQge01ldGFzY3JlZW5zfSBmcm9tICcuL3JvbS9tZXRhc2NyZWVucy5qcyc7XG5pbXBvcnQge01ldGFzcHJpdGV9IGZyb20gJy4vcm9tL21ldGFzcHJpdGUuanMnO1xuaW1wb3J0IHtNZXRhdGlsZXNldCwgTWV0YXRpbGVzZXRzfSBmcm9tICcuL3JvbS9tZXRhdGlsZXNldC5qcyc7XG5pbXBvcnQge01vbnN0ZXJ9IGZyb20gJy4vcm9tL21vbnN0ZXIuanMnO1xuaW1wb3J0IHtOcGNzfSBmcm9tICcuL3JvbS9ucGMuanMnO1xuaW1wb3J0IHtPYmplY3RBY3Rpb25zfSBmcm9tICcuL3JvbS9vYmplY3RhY3Rpb24uanMnO1xuaW1wb3J0IHtPYmplY3REYXRhfSBmcm9tICcuL3JvbS9vYmplY3RkYXRhLmpzJztcbmltcG9ydCB7T2JqZWN0c30gZnJvbSAnLi9yb20vb2JqZWN0cy5qcyc7XG5pbXBvcnQge1JvbU9wdGlvbn0gZnJvbSAnLi9yb20vb3B0aW9uLmpzJztcbmltcG9ydCB7UGFsZXR0ZX0gZnJvbSAnLi9yb20vcGFsZXR0ZS5qcyc7XG5pbXBvcnQge1BhdHRlcm5zfSBmcm9tICcuL3JvbS9wYXR0ZXJuLmpzJztcbmltcG9ydCB7UmFuZG9tTnVtYmVyc30gZnJvbSAnLi9yb20vcmFuZG9tbnVtYmVycy5qcyc7XG5pbXBvcnQge1NjYWxpbmd9IGZyb20gJy4vcm9tL3NjYWxpbmcuanMnO1xuaW1wb3J0IHtTY3JlZW4sIFNjcmVlbnN9IGZyb20gJy4vcm9tL3NjcmVlbi5qcyc7XG5pbXBvcnQge1Nob3BzfSBmcm9tICcuL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7U2xvdHN9IGZyb20gJy4vcm9tL3Nsb3RzLmpzJztcbmltcG9ydCB7U3BvaWxlcn0gZnJvbSAnLi9yb20vc3BvaWxlci5qcyc7XG5pbXBvcnQge1RlbGVwYXRoeX0gZnJvbSAnLi9yb20vdGVsZXBhdGh5LmpzJztcbmltcG9ydCB7VGlsZUFuaW1hdGlvbn0gZnJvbSAnLi9yb20vdGlsZWFuaW1hdGlvbi5qcyc7XG5pbXBvcnQge1RpbGVFZmZlY3RzfSBmcm9tICcuL3JvbS90aWxlZWZmZWN0cy5qcyc7XG5pbXBvcnQge1RpbGVzZXRzfSBmcm9tICcuL3JvbS90aWxlc2V0LmpzJztcbmltcG9ydCB7VG93bldhcnB9IGZyb20gJy4vcm9tL3Rvd253YXJwLmpzJztcbmltcG9ydCB7VHJpZ2dlcn0gZnJvbSAnLi9yb20vdHJpZ2dlci5qcyc7XG5pbXBvcnQge1NlZ21lbnQsIGhleCwgc2VxLCBmcmVlfSBmcm9tICcuL3JvbS91dGlsLmpzJztcbmltcG9ydCB7V2lsZFdhcnB9IGZyb20gJy4vcm9tL3dpbGR3YXJwLmpzJztcbmltcG9ydCB7VW5pb25GaW5kfSBmcm9tICcuL3VuaW9uZmluZC5qcyc7XG5cbmNvbnN0IHskMGUsICQwZiwgJDEwfSA9IFNlZ21lbnQ7XG5cbi8vIEEga25vd24gbG9jYXRpb24gZm9yIGRhdGEgYWJvdXQgc3RydWN0dXJhbCBjaGFuZ2VzIHdlJ3ZlIG1hZGUgdG8gdGhlIHJvbS5cbi8vIFRoZSB0cmljayBpcyB0byBmaW5kIGEgc3VpdGFibGUgcmVnaW9uIG9mIFJPTSB0aGF0J3MgYm90aCB1bnVzZWQgKmFuZCpcbi8vIGlzIG5vdCBwYXJ0aWN1bGFybHkgKnVzYWJsZSogZm9yIG91ciBwdXJwb3Nlcy4gIFRoZSBib3R0b20gMyByb3dzIG9mIHRoZVxuLy8gdmFyaW91cyBzaW5nbGUtc2NyZWVuIG1hcHMgYXJlIGFsbCBlZmZlY3RpdmVseSB1bnVzZWQsIHNvIHRoYXQgZ2l2ZXMgNDhcbi8vIGJ5dGVzIHBlciBtYXAuICBTaG9wcyAoMTQwMDAuLjE0MmZmKSBhbHNvIGhhdmUgYSBnaWFudCBhcmVhIHVwIHRvcCB0aGF0XG4vLyBjb3VsZCBwb3NzaWJseSBiZSB1c2FibGUsIHRob3VnaCB3ZSdkIG5lZWQgdG8gdGVhY2ggdGhlIHRpbGUtcmVhZGluZyBjb2RlXG4vLyB0byBpZ25vcmUgd2hhdGV2ZXIncyB3cml0dGVuIHRoZXJlLCBzaW5jZSBpdCAqaXMqIHZpc2libGUgYmVmb3JlIHRoZSBtZW51XG4vLyBwb3BzIHVwLiAgVGhlc2UgYXJlIGJpZyBlbm91Z2ggcmVnaW9ucyB0aGF0IHdlIGNvdWxkIGV2ZW4gY29uc2lkZXIgdXNpbmdcbi8vIHRoZW0gdmlhIHBhZ2Utc3dhcHBpbmcgdG8gZ2V0IGV4dHJhIGRhdGEgaW4gYXJiaXRyYXJ5IGNvbnRleHRzLlxuXG4vLyBTaG9wcyBhcmUgcGFydGljdWxhcmx5IG5pY2UgYmVjYXVzZSB0aGV5J3JlIGFsbCAwMCBpbiB2YW5pbGxhLlxuLy8gT3RoZXIgcG9zc2libGUgcmVnaW9uczpcbi8vICAgLSA0OCBieXRlcyBhdCAkZmZjMCAobWV6YW1lIHNocmluZSkgPT4gJGZmZTAgaXMgYWxsICRmZiBpbiB2YW5pbGxhLlxuXG5leHBvcnQgY2xhc3MgUm9tIHtcblxuICAvLyBUaGVzZSB2YWx1ZXMgY2FuIGJlIHF1ZXJpZWQgdG8gZGV0ZXJtaW5lIGhvdyB0byBwYXJzZSBhbnkgZ2l2ZW4gcm9tLlxuICAvLyBUaGV5J3JlIGFsbCBhbHdheXMgemVybyBmb3IgdmFuaWxsYVxuICBzdGF0aWMgcmVhZG9ubHkgT01JVF9JVEVNX0dFVF9EQVRBX1NVRkZJWCAgICA9IFJvbU9wdGlvbi5iaXQoMHgxNDJjMCwgMCk7XG4gIHN0YXRpYyByZWFkb25seSBPTUlUX0xPQ0FMX0RJQUxPR19TVUZGSVggICAgID0gUm9tT3B0aW9uLmJpdCgweDE0MmMwLCAxKTtcbiAgc3RhdGljIHJlYWRvbmx5IENPTVBSRVNTRURfTUFQREFUQSAgICAgICAgICAgPSBSb21PcHRpb24uYml0KDB4MTQyYzAsIDIpO1xuICBzdGF0aWMgcmVhZG9ubHkgU0hPUF9DT1VOVCAgICAgICAgICAgICAgICAgICA9IFJvbU9wdGlvbi5ieXRlKDB4MTQyYzEpO1xuICBzdGF0aWMgcmVhZG9ubHkgU0NBTElOR19MRVZFTFMgICAgICAgICAgICAgICA9IFJvbU9wdGlvbi5ieXRlKDB4MTQyYzIpO1xuICBzdGF0aWMgcmVhZG9ubHkgVU5JUVVFX0lURU1fVEFCTEUgICAgICAgICAgICA9IFJvbU9wdGlvbi5hZGRyZXNzKDB4MTQyZDApO1xuICBzdGF0aWMgcmVhZG9ubHkgU0hPUF9EQVRBX1RBQkxFUyAgICAgICAgICAgICA9IFJvbU9wdGlvbi5hZGRyZXNzKDB4MTQyZDMpO1xuICBzdGF0aWMgcmVhZG9ubHkgVEVMRVBBVEhZX1RBQkxFUyAgICAgICAgICAgICA9IFJvbU9wdGlvbi5hZGRyZXNzKDB4MTQyZDYpO1xuXG4gIHJlYWRvbmx5IHByZzogVWludDhBcnJheTtcbiAgcmVhZG9ubHkgY2hyOiBVaW50OEFycmF5O1xuXG4gIC8vIFRPRE8gLSB3b3VsZCBiZSBuaWNlIHRvIGVsaW1pbmF0ZSB0aGUgZHVwbGljYXRpb24gYnkgbW92aW5nXG4gIC8vIHRoZSBjdG9ycyBoZXJlLCBidXQgdGhlcmUncyBsb3RzIG9mIHByZXJlcXMgYW5kIGRlcGVuZGVuY3lcbiAgLy8gb3JkZXJpbmcsIGFuZCB3ZSBuZWVkIHRvIG1ha2UgdGhlIEFESlVTVE1FTlRTLCBldGMuXG4gIC8vcmVhZG9ubHkgYXJlYXM6IEFyZWFzO1xuICByZWFkb25seSBzY3JlZW5zOiBTY3JlZW5zO1xuICByZWFkb25seSB0aWxlc2V0czogVGlsZXNldHM7XG4gIHJlYWRvbmx5IHRpbGVFZmZlY3RzOiBUaWxlRWZmZWN0c1tdO1xuICByZWFkb25seSB0cmlnZ2VyczogVHJpZ2dlcltdO1xuICByZWFkb25seSBwYXR0ZXJuczogUGF0dGVybnM7XG4gIHJlYWRvbmx5IHBhbGV0dGVzOiBQYWxldHRlW107XG4gIHJlYWRvbmx5IGxvY2F0aW9uczogTG9jYXRpb25zO1xuICByZWFkb25seSB0aWxlQW5pbWF0aW9uczogVGlsZUFuaW1hdGlvbltdO1xuICByZWFkb25seSBoaXRib3hlczogSGl0Ym94W107XG4gIHJlYWRvbmx5IG9iamVjdEFjdGlvbnM6IE9iamVjdEFjdGlvbnM7XG4gIHJlYWRvbmx5IG9iamVjdHM6IE9iamVjdHM7XG4gIHJlYWRvbmx5IGFkSG9jU3Bhd25zOiBBZEhvY1NwYXduW107XG4gIHJlYWRvbmx5IG1ldGFzY3JlZW5zOiBNZXRhc2NyZWVucztcbiAgcmVhZG9ubHkgbWV0YXNwcml0ZXM6IE1ldGFzcHJpdGVbXTtcbiAgcmVhZG9ubHkgbWV0YXRpbGVzZXRzOiBNZXRhdGlsZXNldHM7XG4gIHJlYWRvbmx5IGl0ZW1HZXRzOiBJdGVtR2V0cztcbiAgcmVhZG9ubHkgaXRlbXM6IEl0ZW1zO1xuICByZWFkb25seSBzaG9wczogU2hvcHM7XG4gIHJlYWRvbmx5IHNsb3RzOiBTbG90cztcbiAgcmVhZG9ubHkgbnBjczogTnBjcztcbiAgcmVhZG9ubHkgYm9zc0tpbGxzOiBCb3NzS2lsbFtdO1xuICByZWFkb25seSBib3NzZXM6IEJvc3NlcztcbiAgcmVhZG9ubHkgd2lsZFdhcnA6IFdpbGRXYXJwO1xuICByZWFkb25seSB0b3duV2FycDogVG93bldhcnA7XG4gIHJlYWRvbmx5IGZsYWdzOiBGbGFncztcbiAgcmVhZG9ubHkgY29pbkRyb3BzOiBDb2luRHJvcHM7XG4gIHJlYWRvbmx5IHNjYWxpbmc6IFNjYWxpbmc7XG4gIHJlYWRvbmx5IHJhbmRvbU51bWJlcnM6IFJhbmRvbU51bWJlcnM7XG5cbiAgcmVhZG9ubHkgdGVsZXBhdGh5OiBUZWxlcGF0aHk7XG4gIHJlYWRvbmx5IG1lc3NhZ2VzOiBNZXNzYWdlcztcblxuICByZWFkb25seSBtb2R1bGVzOiBNb2R1bGVbXSA9IFtdO1xuXG4gIHNwb2lsZXI/OiBTcG9pbGVyO1xuXG4gIC8vIE5PVEU6IFRoZSBmb2xsb3dpbmcgcHJvcGVydGllcyBtYXkgYmUgY2hhbmdlZCBiZXR3ZWVuIHJlYWRpbmcgYW5kIHdyaXRpbmdcbiAgLy8gdGhlIHJvbS4gIElmIHRoaXMgaGFwcGVucywgdGhlIHdyaXR0ZW4gcm9tIHdpbGwgaGF2ZSBkaWZmZXJlbnQgb3B0aW9ucy5cbiAgLy8gVGhpcyBpcyBhbiBlZmZlY3RpdmUgd2F5IHRvIGNvbnZlcnQgYmV0d2VlbiB0d28gc3R5bGVzLlxuXG4gIC8vIE1heCBudW1iZXIgb2Ygc2hvcHMuICBWYXJpb3VzIGJsb2NrcyBvZiBtZW1vcnkgcmVxdWlyZSBrbm93aW5nIHRoaXMgbnVtYmVyXG4gIC8vIHRvIGFsbG9jYXRlLlxuICBzaG9wQ291bnQ6IG51bWJlcjtcbiAgLy8gTnVtYmVyIG9mIHNjYWxpbmcgbGV2ZWxzLiAgRGV0ZXJtaW5lcyB0aGUgc2l6ZSBvZiB0aGUgc2NhbGluZyB0YWJsZXMuXG4gIHNjYWxpbmdMZXZlbHM6IG51bWJlcjtcblxuICAvLyBBZGRyZXNzIHRvIHJlYWQvd3JpdGUgdGhlIGJpdGZpZWxkIGluZGljYXRpbmcgdW5pcXVlIGl0ZW1zLlxuICB1bmlxdWVJdGVtVGFibGVBZGRyZXNzOiBudW1iZXI7XG4gIC8vIEFkZHJlc3Mgb2Ygbm9ybWFsaXplZCBwcmljZXMgdGFibGUsIGlmIHByZXNlbnQuICBJZiB0aGlzIGlzIGFic2VudCB0aGVuIHdlXG4gIC8vIGFzc3VtZSBwcmljZXMgYXJlIG5vdCBub3JtYWxpemVkIGFuZCBhcmUgYXQgdGhlIG5vcm1hbCBwYXduIHNob3AgYWRkcmVzcy5cbiAgc2hvcERhdGFUYWJsZXNBZGRyZXNzOiBudW1iZXI7XG4gIC8vIEFkZHJlc3Mgb2YgcmVhcnJhbmdlZCB0ZWxlcGF0aHkgdGFibGVzLlxuICB0ZWxlcGF0aHlUYWJsZXNBZGRyZXNzOiBudW1iZXI7XG4gIC8vIFdoZXRoZXIgdGhlIHRyYWlsaW5nICRmZiBzaG91bGQgYmUgb21pdHRlZCBmcm9tIHRoZSBJdGVtR2V0RGF0YSB0YWJsZS5cbiAgb21pdEl0ZW1HZXREYXRhU3VmZml4OiBib29sZWFuO1xuICAvLyBXaGV0aGVyIHRoZSB0cmFpbGluZyBieXRlIG9mIGVhY2ggTG9jYWxEaWFsb2cgaXMgb21pdHRlZC4gIFRoaXMgYWZmZWN0c1xuICAvLyBib3RoIHJlYWRpbmcgYW5kIHdyaXRpbmcgdGhlIHRhYmxlLiAgTWF5IGJlIGluZmVycmVkIHdoaWxlIHJlYWRpbmcuXG4gIG9taXRMb2NhbERpYWxvZ1N1ZmZpeDogYm9vbGVhbjtcbiAgLy8gV2hldGhlciBtYXBkYXRhIGhhcyBiZWVuIGNvbXByZXNzZWQuXG4gIGNvbXByZXNzZWRNYXBEYXRhOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKHJvbTogVWludDhBcnJheSkge1xuICAgIGNvbnN0IHByZ1NpemUgPSByb21bNF0gKiAweDQwMDA7XG4gICAgLy8gTk9URTogY2hyU2l6ZSA9IHJvbVs1XSAqIDB4MjAwMDtcbiAgICBjb25zdCBwcmdTdGFydCA9IDB4MTAgKyAocm9tWzZdICYgNCA/IDUxMiA6IDApO1xuICAgIGNvbnN0IHByZ0VuZCA9IHByZ1N0YXJ0ICsgcHJnU2l6ZTtcbiAgICB0aGlzLnByZyA9IHJvbS5zdWJhcnJheShwcmdTdGFydCwgcHJnRW5kKTtcbiAgICB0aGlzLmNociA9IHJvbS5zdWJhcnJheShwcmdFbmQpO1xuXG4gICAgdGhpcy5zaG9wQ291bnQgPSBSb20uU0hPUF9DT1VOVC5nZXQocm9tKTtcbiAgICB0aGlzLnNjYWxpbmdMZXZlbHMgPSBSb20uU0NBTElOR19MRVZFTFMuZ2V0KHJvbSk7XG4gICAgdGhpcy51bmlxdWVJdGVtVGFibGVBZGRyZXNzID0gUm9tLlVOSVFVRV9JVEVNX1RBQkxFLmdldChyb20pO1xuICAgIHRoaXMuc2hvcERhdGFUYWJsZXNBZGRyZXNzID0gUm9tLlNIT1BfREFUQV9UQUJMRVMuZ2V0KHJvbSk7XG4gICAgdGhpcy50ZWxlcGF0aHlUYWJsZXNBZGRyZXNzID0gUm9tLlRFTEVQQVRIWV9UQUJMRVMuZ2V0KHJvbSk7XG4gICAgdGhpcy5vbWl0SXRlbUdldERhdGFTdWZmaXggPSBSb20uT01JVF9JVEVNX0dFVF9EQVRBX1NVRkZJWC5nZXQocm9tKTtcbiAgICB0aGlzLm9taXRMb2NhbERpYWxvZ1N1ZmZpeCA9IFJvbS5PTUlUX0xPQ0FMX0RJQUxPR19TVUZGSVguZ2V0KHJvbSk7XG4gICAgdGhpcy5jb21wcmVzc2VkTWFwRGF0YSA9IFJvbS5DT01QUkVTU0VEX01BUERBVEEuZ2V0KHJvbSk7XG5cbiAgICAvLyBpZiAoY3JjMzIocm9tKSA9PT0gRVhQRUNURURfQ1JDMzIpIHtcbiAgICBmb3IgKGNvbnN0IFthZGRyZXNzLCBvbGQsIHZhbHVlXSBvZiBBREpVU1RNRU5UUykge1xuICAgICAgaWYgKHRoaXMucHJnW2FkZHJlc3NdID09PSBvbGQpIHRoaXMucHJnW2FkZHJlc3NdID0gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gTG9hZCB1cCBhIGJ1bmNoIG9mIGRhdGEgdGFibGVzLiAgVGhpcyB3aWxsIGluY2x1ZGUgYSBsYXJnZSBudW1iZXIgb2YgdGhlXG4gICAgLy8gZGF0YSB0YWJsZXMgaW4gdGhlIFJPTS4gIFRoZSBpZGVhIGlzIHRoYXQgd2UgY2FuIGVkaXQgdGhlIGFycmF5cyBsb2NhbGx5XG4gICAgLy8gYW5kIHRoZW4gaGF2ZSBhIFwiY29tbWl0XCIgZnVuY3Rpb24gdGhhdCByZWJ1aWxkcyB0aGUgUk9NIHdpdGggdGhlIG5ld1xuICAgIC8vIGFycmF5cy4gIFdlIG1heSBuZWVkIHRvIHdyaXRlIGEgXCJwYWdlZCBhbGxvY2F0b3JcIiB0aGF0IGNhbiBhbGxvY2F0ZVxuICAgIC8vIGNodW5rcyBvZiBST00gaW4gYSBnaXZlbiBwYWdlLiAgUHJvYmFibHkgd2FudCB0byB1c2UgYSBncmVlZHkgYWxnb3JpdGhtXG4gICAgLy8gd2hlcmUgd2Ugc3RhcnQgd2l0aCB0aGUgYmlnZ2VzdCBjaHVuayBhbmQgcHV0IGl0IGluIHRoZSBzbWFsbGVzdCBzcG90XG4gICAgLy8gdGhhdCBmaXRzIGl0LiAgUHJlc3VtYWJseSB3ZSBrbm93IHRoZSBzaXplcyB1cCBmcm9udCBldmVuIGJlZm9yZSB3ZSBoYXZlXG4gICAgLy8gYWxsIHRoZSBhZGRyZXNzZXMsIHNvIHdlIGNvdWxkIGRvIGFsbCB0aGUgYWxsb2NhdGlvbiBhdCBvbmNlIC0gcHJvYmFibHlcbiAgICAvLyByZXR1cm5pbmcgYSB0b2tlbiBmb3IgZWFjaCBhbGxvY2F0aW9uIGFuZCB0aGVuIGFsbCB0b2tlbnMgZ2V0IGZpbGxlZCBpblxuICAgIC8vIGF0IG9uY2UgKGFjdHVhbCBwcm9taXNlcyB3b3VsZCBiZSBtb3JlIHVud2VpbGR5KS5cbiAgICAvLyBUcmlja3kgLSB3aGF0IGFib3V0IHNoYXJlZCBlbGVtZW50cyBvZiBkYXRhIHRhYmxlcyAtIHdlIHB1bGwgdGhlbVxuICAgIC8vIHNlcGFyYXRlbHksIGJ1dCB3ZSdsbCBuZWVkIHRvIHJlLWNvYWxlc2NlIHRoZW0uICBCdXQgdGhpcyByZXF1aXJlc1xuICAgIC8vIGtub3dpbmcgdGhlaXIgY29udGVudHMgQkVGT1JFIGFsbG9jYXRpbmcgdGhlaXIgc3BhY2UuICBTbyB3ZSBuZWVkIHR3b1xuICAgIC8vIGFsbG9jYXRlIG1ldGhvZHMgLSBvbmUgd2hlcmUgdGhlIGNvbnRlbnQgaXMga25vd24gYW5kIG9uZSB3aGVyZSBvbmx5IHRoZVxuICAgIC8vIGxlbmd0aCBpcyBrbm93bi5cbiAgICB0aGlzLnRpbGVzZXRzID0gbmV3IFRpbGVzZXRzKHRoaXMpO1xuICAgIHRoaXMudGlsZUVmZmVjdHMgPSBzZXEoMTEsIGkgPT4gbmV3IFRpbGVFZmZlY3RzKHRoaXMsIGkgKyAweGIzKSk7XG4gICAgdGhpcy5zY3JlZW5zID0gbmV3IFNjcmVlbnModGhpcyk7XG4gICAgdGhpcy5tZXRhdGlsZXNldHMgPSBuZXcgTWV0YXRpbGVzZXRzKHRoaXMpO1xuICAgIHRoaXMubWV0YXNjcmVlbnMgPSBuZXcgTWV0YXNjcmVlbnModGhpcyk7XG4gICAgdGhpcy50cmlnZ2VycyA9IHNlcSgweDQzLCBpID0+IG5ldyBUcmlnZ2VyKHRoaXMsIDB4ODAgfCBpKSk7XG4gICAgdGhpcy5wYXR0ZXJucyA9IG5ldyBQYXR0ZXJucyh0aGlzKTtcbiAgICB0aGlzLnBhbGV0dGVzID0gc2VxKDB4MTAwLCBpID0+IG5ldyBQYWxldHRlKHRoaXMsIGkpKTtcbiAgICB0aGlzLmxvY2F0aW9ucyA9IG5ldyBMb2NhdGlvbnModGhpcyk7XG4gICAgdGhpcy50aWxlQW5pbWF0aW9ucyA9IHNlcSg0LCBpID0+IG5ldyBUaWxlQW5pbWF0aW9uKHRoaXMsIGkpKTtcbiAgICB0aGlzLmhpdGJveGVzID0gc2VxKDI0LCBpID0+IG5ldyBIaXRib3godGhpcywgaSkpO1xuICAgIHRoaXMub2JqZWN0QWN0aW9ucyA9IG5ldyBPYmplY3RBY3Rpb25zKHRoaXMpO1xuICAgIHRoaXMub2JqZWN0cyA9IG5ldyBPYmplY3RzKHRoaXMpO1xuICAgIHRoaXMuYWRIb2NTcGF3bnMgPSBzZXEoMHg2MCwgaSA9PiBuZXcgQWRIb2NTcGF3bih0aGlzLCBpKSk7XG4gICAgdGhpcy5tZXRhc3ByaXRlcyA9IHNlcSgweDEwMCwgaSA9PiBuZXcgTWV0YXNwcml0ZSh0aGlzLCBpKSk7XG4gICAgdGhpcy5tZXNzYWdlcyA9IG5ldyBNZXNzYWdlcyh0aGlzKTtcbiAgICB0aGlzLnRlbGVwYXRoeSA9IG5ldyBUZWxlcGF0aHkodGhpcyk7XG4gICAgdGhpcy5pdGVtR2V0cyA9IG5ldyBJdGVtR2V0cyh0aGlzKTtcbiAgICB0aGlzLml0ZW1zID0gbmV3IEl0ZW1zKHRoaXMpO1xuICAgIHRoaXMuc2hvcHMgPSBuZXcgU2hvcHModGhpcyk7IC8vIE5PVEU6IGRlcGVuZHMgb24gbG9jYXRpb25zIGFuZCBvYmplY3RzXG4gICAgdGhpcy5zbG90cyA9IG5ldyBTbG90cyh0aGlzKTtcbiAgICB0aGlzLm5wY3MgPSBuZXcgTnBjcyh0aGlzKTtcbiAgICB0aGlzLmJvc3NLaWxscyA9IHNlcSgweGUsIGkgPT4gbmV3IEJvc3NLaWxsKHRoaXMsIGkpKTtcbiAgICB0aGlzLndpbGRXYXJwID0gbmV3IFdpbGRXYXJwKHRoaXMpO1xuICAgIHRoaXMudG93bldhcnAgPSBuZXcgVG93bldhcnAodGhpcyk7XG4gICAgdGhpcy5jb2luRHJvcHMgPSBuZXcgQ29pbkRyb3BzKHRoaXMpO1xuICAgIHRoaXMuZmxhZ3MgPSBuZXcgRmxhZ3ModGhpcyk7XG4gICAgdGhpcy5ib3NzZXMgPSBuZXcgQm9zc2VzKHRoaXMpOyAvLyBOT1RFOiBtdXN0IGJlIGFmdGVyIE5wY3MgYW5kIEZsYWdzXG4gICAgdGhpcy5zY2FsaW5nID0gbmV3IFNjYWxpbmcodGhpcyk7XG4gICAgdGhpcy5yYW5kb21OdW1iZXJzID0gbmV3IFJhbmRvbU51bWJlcnModGhpcyk7XG5cbiAgICAvLyAvLyBUT0RPIC0gY29uc2lkZXIgcG9wdWxhdGluZyB0aGlzIGxhdGVyP1xuICAgIC8vIC8vIEhhdmluZyB0aGlzIGF2YWlsYWJsZSBtYWtlcyBpdCBlYXNpZXIgdG8gc2V0IGV4aXRzLCBldGMuXG4gICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmIChsb2MudXNlZCkgbG9jLmxhenlJbml0aWFsaXphdGlvbigpOyAvLyB0cmlnZ2VyIHRoZSBnZXR0ZXJcbiAgICB9XG4gIH1cblxuICB0cmlnZ2VyKGlkOiBudW1iZXIpOiBUcmlnZ2VyIHtcbiAgICBpZiAoaWQgPCAweDgwIHx8IGlkID4gMHhmZikgdGhyb3cgbmV3IEVycm9yKGBCYWQgdHJpZ2dlciBpZCAkJHtoZXgoaWQpfWApO1xuICAgIHJldHVybiB0aGlzLnRyaWdnZXJzW2lkICYgMHg3Zl07XG4gIH1cblxuICAvLyBUT0RPIC0gY3Jvc3MtcmVmZXJlbmNlIG1vbnN0ZXJzL21ldGFzcHJpdGVzL21ldGF0aWxlcy9zY3JlZW5zIHdpdGggcGF0dGVybnMvcGFsZXR0ZXNcbiAgLy8gZ2V0IG1vbnN0ZXJzKCk6IE9iamVjdERhdGFbXSB7XG4gIC8vICAgY29uc3QgbW9uc3RlcnMgPSBuZXcgU2V0PE9iamVjdERhdGE+KCk7XG4gIC8vICAgZm9yIChjb25zdCBsIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gIC8vICAgICBpZiAoIWwudXNlZCB8fCAhbC5oYXNTcGF3bnMpIGNvbnRpbnVlO1xuICAvLyAgICAgZm9yIChjb25zdCBvIG9mIGwuc3Bhd25zKSB7XG4gIC8vICAgICAgIGlmIChvLmlzTW9uc3RlcigpKSBtb25zdGVycy5hZGQodGhpcy5vYmplY3RzW28ubW9uc3RlcklkXSk7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiBbLi4ubW9uc3RlcnNdLnNvcnQoKHgsIHkpID0+ICh4LmlkIC0geS5pZCkpO1xuICAvLyB9XG5cbiAgZ2V0IHByb2plY3RpbGVzKCk6IE9iamVjdERhdGFbXSB7XG4gICAgY29uc3QgcHJvamVjdGlsZXMgPSBuZXcgU2V0PE9iamVjdERhdGE+KCk7XG4gICAgZm9yIChjb25zdCBtIG9mIHRoaXMub2JqZWN0cy5maWx0ZXIobyA9PiBvIGluc3RhbmNlb2YgTW9uc3RlcikpIHtcbiAgICAgIGlmIChtLmNoaWxkKSB7XG4gICAgICAgIHByb2plY3RpbGVzLmFkZCh0aGlzLm9iamVjdHNbdGhpcy5hZEhvY1NwYXduc1ttLmNoaWxkXS5vYmplY3RJZF0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gWy4uLnByb2plY3RpbGVzXS5zb3J0KCh4LCB5KSA9PiAoeC5pZCAtIHkuaWQpKTtcbiAgfVxuXG4gIGdldCBtb25zdGVyR3JhcGhpY3MoKSB7XG4gICAgY29uc3QgZ2Z4OiB7W2lkOiBzdHJpbmddOlxuICAgICAgICAgICAgICAgIHtbaW5mbzogc3RyaW5nXTpcbiAgICAgICAgICAgICAgICAge3Nsb3Q6IG51bWJlciwgcGF0OiBudW1iZXIsIHBhbDogbnVtYmVyfX19ID0ge307XG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWwudXNlZCB8fCAhbC5oYXNTcGF3bnMpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBvIG9mIGwuc3Bhd25zKSB7XG4gICAgICAgIGlmICghKG8uZGF0YVsyXSAmIDcpKSB7XG4gICAgICAgICAgY29uc3Qgc2xvdCA9IG8uZGF0YVsyXSAmIDB4ODAgPyAxIDogMDtcbiAgICAgICAgICBjb25zdCBpZCA9IGhleChvLmRhdGFbM10gKyAweDUwKTtcbiAgICAgICAgICBjb25zdCBkYXRhID0gZ2Z4W2lkXSA9IGdmeFtpZF0gfHwge307XG4gICAgICAgICAgZGF0YVtgJHtzbG90fToke2wuc3ByaXRlUGF0dGVybnNbc2xvdF0udG9TdHJpbmcoMTYpfToke1xuICAgICAgICAgICAgICAgbC5zcHJpdGVQYWxldHRlc1tzbG90XS50b1N0cmluZygxNil9YF1cbiAgICAgICAgICAgID0ge3BhbDogbC5zcHJpdGVQYWxldHRlc1tzbG90XSxcbiAgICAgICAgICAgICAgIHBhdDogbC5zcHJpdGVQYXR0ZXJuc1tzbG90XSxcbiAgICAgICAgICAgICAgIHNsb3QsXG4gICAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGdmeDtcbiAgfVxuXG4gIGdldCBsb2NhdGlvbk1vbnN0ZXJzKCkge1xuICAgIGNvbnN0IG06IHtbaWQ6IHN0cmluZ106IHtbaW5mbzogc3RyaW5nXTogbnVtYmVyfX0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGwgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghbC51c2VkIHx8ICFsLmhhc1NwYXducykgY29udGludWU7XG4gICAgICAvLyB3aGljaCBtb25zdGVycyBhcmUgaW4gd2hpY2ggc2xvdHM/XG4gICAgICBjb25zdCBzOiB7W2luZm86IHN0cmluZ106IG51bWJlcn0gPSBtWyckJyArIGhleChsLmlkKV0gPSB7fTtcbiAgICAgIGZvciAoY29uc3QgbyBvZiBsLnNwYXducykge1xuICAgICAgICBpZiAoIShvLmRhdGFbMl0gJiA3KSkge1xuICAgICAgICAgIGNvbnN0IHNsb3QgPSBvLmRhdGFbMl0gJiAweDgwID8gMSA6IDA7XG4gICAgICAgICAgY29uc3QgaWQgPSBvLmRhdGFbM10gKyAweDUwO1xuICAgICAgICAgIHNbYCR7c2xvdH06JHtpZC50b1N0cmluZygxNil9YF0gPVxuICAgICAgICAgICAgICAoc1tgJHtzbG90fToke2lkLnRvU3RyaW5nKDE2KX1gXSB8fCAwKSArIDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG07XG4gIH1cblxuICAvLyBUT0RPIC0gZm9yIGVhY2ggc3ByaXRlIHBhdHRlcm4gdGFibGUsIGZpbmQgYWxsIHRoZSBwYWxldHRlcyB0aGF0IGl0IHVzZXMuXG4gIC8vIEZpbmQgYWxsIHRoZSBtb25zdGVycyBvbiBpdC4gIFdlIGNhbiBwcm9iYWJseSBhbGxvdyBhbnkgcGFsZXR0ZSBzbyBsb25nXG4gIC8vIGFzIG9uZSBvZiB0aGUgcGFsZXR0ZXMgaXMgdXNlZCB3aXRoIHRoYXQgcGF0dGVybi5cbiAgLy8gVE9ETyAtIG1heCBudW1iZXIgb2YgaW5zdGFuY2VzIG9mIGEgbW9uc3RlciBvbiBhbnkgbWFwIC0gaS5lLiBhdm9pZCBoYXZpbmdcbiAgLy8gZml2ZSBmbHllcnMgb24gdGhlIHNhbWUgbWFwIVxuXG4gIC8vIDQ2MCAtIDAgbWVhbnMgZWl0aGVyIGZseWVyIG9yIHN0YXRpb25hcnlcbiAgLy8gICAgICAgICAgIC0gc3RhdGlvbmFyeSBoYXMgNGEwIH4gMjA0LDIwNSwyMDZcbiAgLy8gICAgICAgICAgICAgKGtyYWtlbiwgc3dhbXAgcGxhbnQsIHNvcmNlcm9yKVxuICAvLyAgICAgICA2IC0gbWltaWNcbiAgLy8gICAgICAgMWYgLSBzd2ltbWVyXG4gIC8vICAgICAgIDU0IC0gdG9tYXRvIGFuZCBiaXJkXG4gIC8vICAgICAgIDU1IC0gc3dpbW1lclxuICAvLyAgICAgICA1NyAtIG5vcm1hbFxuICAvLyAgICAgICA1ZiAtIGFsc28gbm9ybWFsLCBidXQgbWVkdXNhIGhlYWQgaXMgZmx5ZXI/XG4gIC8vICAgICAgIDc3IC0gc29sZGllcnMsIGljZSB6b21iaWVcblxuLy8gICAvLyBEb24ndCB3b3JyeSBhYm91dCBvdGhlciBkYXRhcyB5ZXRcbi8vICAgd3JpdGVPYmplY3REYXRhKCkge1xuLy8gICAgIC8vIGJ1aWxkIHVwIGEgbWFwIGZyb20gYWN0dWFsIGRhdGEgdG8gaW5kZXhlcyB0aGF0IHBvaW50IHRvIGl0XG4vLyAgICAgbGV0IGFkZHIgPSAweDFhZTAwO1xuLy8gICAgIGNvbnN0IGRhdGFzID0ge307XG4vLyAgICAgZm9yIChjb25zdCBvYmplY3Qgb2YgdGhpcy5vYmplY3RzKSB7XG4vLyAgICAgICBjb25zdCBzZXIgPSBvYmplY3Quc2VyaWFsaXplKCk7XG4vLyAgICAgICBjb25zdCBkYXRhID0gc2VyLmpvaW4oJyAnKTtcbi8vICAgICAgIGlmIChkYXRhIGluIGRhdGFzKSB7XG4vLyAvL2NvbnNvbGUubG9nKGAkJHtvYmplY3QuaWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsMCl9OiBSZXVzaW5nIGV4aXN0aW5nIGRhdGEgJCR7ZGF0YXNbZGF0YV0udG9TdHJpbmcoMTYpfWApO1xuLy8gICAgICAgICBvYmplY3Qub2JqZWN0RGF0YUJhc2UgPSBkYXRhc1tkYXRhXTtcbi8vICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgIG9iamVjdC5vYmplY3REYXRhQmFzZSA9IGFkZHI7XG4vLyAgICAgICAgIGRhdGFzW2RhdGFdID0gYWRkcjtcbi8vIC8vY29uc29sZS5sb2coYCQke29iamVjdC5pZC50b1N0cmluZygxNikucGFkU3RhcnQoMiwwKX06IERhdGEgaXMgYXQgJCR7XG4vLyAvLyAgICAgICAgICAgICBhZGRyLnRvU3RyaW5nKDE2KX06ICR7QXJyYXkuZnJvbShzZXIsIHg9PickJyt4LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLDApKS5qb2luKCcsJyl9YCk7XG4vLyAgICAgICAgIGFkZHIgKz0gc2VyLmxlbmd0aDtcbi8vIC8vIHNlZWQgMzUxNzgxMTAzNlxuLy8gICAgICAgfVxuLy8gICAgICAgb2JqZWN0LndyaXRlKCk7XG4vLyAgICAgfVxuLy8gLy9jb25zb2xlLmxvZyhgV3JvdGUgb2JqZWN0IGRhdGEgZnJvbSAkMWFjMDAgdG8gJCR7YWRkci50b1N0cmluZygxNikucGFkU3RhcnQoNSwgMClcbi8vIC8vICAgICAgICAgICAgIH0sIHNhdmluZyAkezB4MWJlOTEgLSBhZGRyfSBieXRlcy5gKTtcbi8vICAgICByZXR1cm4gYWRkcjtcbi8vICAgfVxuXG4gIGFzc2VtYmxlcigpOiBBc3NlbWJsZXIge1xuICAgIC8vIFRPRE8gLSBjb25zaWRlciBzZXR0aW5nIGEgc2VnbWVudCBwcmVmaXhcbiAgICByZXR1cm4gbmV3IEFzc2VtYmxlcigpO1xuICB9XG5cbiAgd3JpdGVEYXRhKGRhdGEgPSB0aGlzLnByZykge1xuICAgIC8vIFdyaXRlIHRoZSBvcHRpb25zIGZpcnN0XG4gICAgLy8gY29uc3Qgd3JpdGVyID0gbmV3IFdyaXRlcih0aGlzLmNocik7XG4gICAgLy8gd3JpdGVyLm1vZHVsZXMucHVzaCguLi50aGlzLm1vZHVsZXMpO1xuICAgIC8vIE1hcERhdGFcbiAgICAvL3dyaXRlci5hbGxvYygweDE0NGY4LCAweDE3ZTAwKTtcbiAgICAvLyBOcGNEYXRhXG4gICAgLy8gTk9URTogMTkzZjkgaXMgYXNzdW1pbmcgJGZiIGlzIHRoZSBsYXN0IGxvY2F0aW9uIElELiAgSWYgd2UgYWRkIG1vcmUgbG9jYXRpb25zIGF0XG4gICAgLy8gdGhlIGVuZCB0aGVuIHdlJ2xsIG5lZWQgdG8gcHVzaCB0aGlzIGJhY2sgYSBmZXcgbW9yZSBieXRlcy4gIFdlIGNvdWxkIHBvc3NpYmx5XG4gICAgLy8gZGV0ZWN0IHRoZSBiYWQgd3JpdGUgYW5kIHRocm93IGFuIGVycm9yLCBhbmQvb3IgY29tcHV0ZSB0aGUgbWF4IGxvY2F0aW9uIElELlxuICAgIC8vd3JpdGVyLmFsbG9jKDB4MTkzZjksIDB4MWFjMDApO1xuICAgIC8vIE9iamVjdERhdGEgKGluZGV4IGF0IDFhYzAwLi4xYWUwMClcbiAgICAvL3dyaXRlci5hbGxvYygweDFhZTAwLCAweDFiZDAwKTsgLy8gc2F2ZSA1MTIgYnl0ZXMgYXQgZW5kIGZvciBzb21lIGV4dHJhIGNvZGVcbiAgICBjb25zdCBhID0gdGhpcy5hc3NlbWJsZXIoKTtcbiAgICAvLyBOcGNTcGF3bkNvbmRpdGlvbnNcbiAgICBmcmVlKGEsICQwZSwgMHg4NzdhLCAweDg5NWQpO1xuICAgIC8vIE5wY0RpYWxvZ1xuICAgIGZyZWUoYSwgJDBlLCAweDhhZTUsIDB4OThmNCk7XG4gICAgLy8gSXRlbUdldERhdGEgKHRvIDFlMDY1KSArIEl0ZW1Vc2VEYXRhXG4gICAgZnJlZShhLCAkMGUsIDB4OWRlNiwgMHhhMDAwKTtcbiAgICBmcmVlKGEsICQwZiwgMHhhMDAwLCAweGExMDYpO1xuICAgIC8vIFRyaWdnZXJEYXRhXG4gICAgLy8gTk9URTogVGhlcmUncyBzb21lIGZyZWUgc3BhY2UgYXQgMWUzYzAuLjFlM2YwLCBidXQgd2UgdXNlIHRoaXMgZm9yIHRoZVxuICAgIC8vIENoZWNrQmVsb3dCb3NzIHRyaWdnZXJzLlxuICAgIGZyZWUoYSwgJDBmLCAweGEyMDAsIDB4YTNjMCk7XG4gICAgLy8gSXRlbU1lbnVOYW1lXG4gICAgZnJlZShhLCAkMTAsIDB4OTExYSwgMHg5NDY4KTtcbiAgICAvLyBrZWVwIGl0ZW0gJDQ5IFwiICAgICAgICBcIiB3aGljaCBpcyBhY3R1YWxseSB1c2VkIHNvbWV3aGVyZT9cbiAgICAvLyB3cml0ZXIuYWxsb2MoMHgyMTQ3MSwgMHgyMTRmMSk7IC8vIFRPRE8gLSBkbyB3ZSBuZWVkIGFueSBvZiB0aGlzP1xuICAgIC8vIEl0ZW1NZXNzYWdlTmFtZVxuICAgIC8vIHdyaXRlci5hbGxvYygweDI4ZTgxLCAweDI5MjJiKTsgLy8gTk9URTogdW5jb3ZlcmVkIHRocnUgMjk0MDBcbiAgICAvLyB3cml0ZXIuYWxsb2MoMHgyOTIyYiwgMHgyOTQwMCk7IC8vIFRPRE8gLSBuZWVkZWQ/XG4gICAgLy8gTk9URTogb25jZSB3ZSByZWxlYXNlIHRoZSBvdGhlciBtZXNzYWdlIHRhYmxlcywgdGhpcyB3aWxsIGp1c3QgYmUgb25lIGdpYW50IGJsb2NrLlxuXG4gICAgLy8gTWVzc2FnZSB0YWJsZSBwYXJ0c1xuICAgIC8vIHdyaXRlci5hbGxvYygweDI4MDAwLCAweDI4M2ZlKTtcbiAgICAvLyBNZXNzYWdlIHRhYmxlc1xuICAgIC8vIFRPRE8gLSB3ZSBkb24ndCB1c2UgdGhlIHdyaXRlciB0byBhbGxvY2F0ZSB0aGUgYWJicmV2aWF0aW9uIHRhYmxlcywgYnV0IHdlIGNvdWxkXG4gICAgLy93cml0ZXIuZnJlZSgnMHgyYTAwMCwgMHgyZmMwMCk7XG5cbiAgICAvLyBpZiAodGhpcy50ZWxlcGF0aHlUYWJsZXNBZGRyZXNzKSB7XG4gICAgLy8gICB3cml0ZXIuYWxsb2MoMHgxZDhmNCwgMHgxZGIwMCk7IC8vIGxvY2F0aW9uIHRhYmxlIGFsbCB0aGUgd2F5IHRocnUgbWFpblxuICAgIC8vIH0gZWxzZSB7XG4gICAgLy8gICB3cml0ZXIuYWxsb2MoMHgxZGE0YywgMHgxZGIwMCk7IC8vIGV4aXN0aW5nIG1haW4gdGFibGUgaXMgaGVyZS5cbiAgICAvLyB9XG5cbiAgICBjb25zdCBtb2R1bGVzID0gWy4uLnRoaXMubW9kdWxlcywgYS5tb2R1bGUoKV07XG4gICAgY29uc3Qgd3JpdGVBbGwgPSAod3JpdGFibGVzOiBJdGVyYWJsZTx7d3JpdGUoKTogTW9kdWxlW119PikgPT4ge1xuICAgICAgZm9yIChjb25zdCB3IG9mIHdyaXRhYmxlcykge1xuICAgICAgICBtb2R1bGVzLnB1c2goLi4udy53cml0ZSgpKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLmxvY2F0aW9ucy53cml0ZSgpKTtcbiAgICB3cml0ZUFsbCh0aGlzLm9iamVjdHMpO1xuICAgIHdyaXRlQWxsKHRoaXMuaGl0Ym94ZXMpO1xuICAgIHdyaXRlQWxsKHRoaXMudHJpZ2dlcnMpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLm5wY3Mud3JpdGUoKSk7XG4gICAgd3JpdGVBbGwodGhpcy50aWxlc2V0cyk7XG4gICAgd3JpdGVBbGwodGhpcy50aWxlRWZmZWN0cyk7XG4gICAgd3JpdGVBbGwodGhpcy5hZEhvY1NwYXducyk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuaXRlbUdldHMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuc2xvdHMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuaXRlbXMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuc2hvcHMud3JpdGUoKSk7XG4gICAgd3JpdGVBbGwodGhpcy5ib3NzS2lsbHMpO1xuICAgIHdyaXRlQWxsKHRoaXMucGF0dGVybnMpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLndpbGRXYXJwLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnRvd25XYXJwLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLmNvaW5Ecm9wcy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5zY2FsaW5nLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLmJvc3Nlcy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5yYW5kb21OdW1iZXJzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnRlbGVwYXRoeS53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5tZXNzYWdlcy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5zY3JlZW5zLndyaXRlKCkpO1xuXG4gICAgLy8gUmVzZXJ2ZSB0aGUgZ2xvYmFsIHNwYWNlIDE0MmMwLi4uMTQyZjAgPz8/XG4gICAgLy8gY29uc3QgdGhpcy5hc3NlbWJsZXIoKS5cblxuICAgIGNvbnN0IGxpbmtlciA9IG5ldyBMaW5rZXIoKTtcbiAgICBsaW5rZXIuYmFzZSh0aGlzLnByZywgMCk7XG4gICAgZm9yIChjb25zdCBtIG9mIG1vZHVsZXMpIHtcbiAgICAgIGxpbmtlci5yZWFkKG0pO1xuICAgIH1cbiAgICBjb25zdCBvdXQgPSBsaW5rZXIubGluaygpO1xuICAgIG91dC5hcHBseShkYXRhKTtcbiAgICBpZiAoZGF0YSAhPT0gdGhpcy5wcmcpIHJldHVybjsgLy8gVE9ETyAtIGNsZWFuIHRoaXMgdXBcbiAgICAvL2xpbmtlci5yZXBvcnQoKTtcbiAgICBjb25zdCBleHBvcnRzID0gbGlua2VyLmV4cG9ydHMoKTtcblxuICAgIFxuICAgIHRoaXMudW5pcXVlSXRlbVRhYmxlQWRkcmVzcyA9IGV4cG9ydHMuZ2V0KCdLZXlJdGVtRGF0YScpIS5vZmZzZXQhO1xuICAgIHRoaXMuc2hvcENvdW50ID0gMTE7XG4gICAgdGhpcy5zaG9wRGF0YVRhYmxlc0FkZHJlc3MgPSBleHBvcnRzLmdldCgnU2hvcERhdGEnKT8ub2Zmc2V0IHx8IDA7XG4gICAgLy8gRG9uJ3QgaW5jbHVkZSB0aGVzZSBpbiB0aGUgbGlua2VyPz8/XG4gICAgUm9tLlNIT1BfQ09VTlQuc2V0KHRoaXMucHJnLCB0aGlzLnNob3BDb3VudCk7XG4gICAgUm9tLlNDQUxJTkdfTEVWRUxTLnNldCh0aGlzLnByZywgdGhpcy5zY2FsaW5nTGV2ZWxzKTtcbiAgICBSb20uVU5JUVVFX0lURU1fVEFCTEUuc2V0KHRoaXMucHJnLCB0aGlzLnVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3MpO1xuICAgIFJvbS5TSE9QX0RBVEFfVEFCTEVTLnNldCh0aGlzLnByZywgdGhpcy5zaG9wRGF0YVRhYmxlc0FkZHJlc3MgfHwgMCk7XG4gICAgUm9tLk9NSVRfSVRFTV9HRVRfREFUQV9TVUZGSVguc2V0KHRoaXMucHJnLCB0aGlzLm9taXRJdGVtR2V0RGF0YVN1ZmZpeCk7XG4gICAgUm9tLk9NSVRfTE9DQUxfRElBTE9HX1NVRkZJWC5zZXQodGhpcy5wcmcsIHRoaXMub21pdExvY2FsRGlhbG9nU3VmZml4KTtcbiAgICBSb20uQ09NUFJFU1NFRF9NQVBEQVRBLnNldCh0aGlzLnByZywgdGhpcy5jb21wcmVzc2VkTWFwRGF0YSk7XG4gIH1cblxuICBhbmFseXplVGlsZXMoKSB7XG4gICAgLy8gRm9yIGFueSBnaXZlbiB0aWxlIGluZGV4LCB3aGF0IHNjcmVlbnMgZG9lcyBpdCBhcHBlYXIgb24uXG4gICAgLy8gRm9yIHRob3NlIHNjcmVlbnMsIHdoaWNoIHRpbGVzZXRzIGRvZXMgKml0KiBhcHBlYXIgb24uXG4gICAgLy8gVGhhdCB0aWxlIElEIGlzIGxpbmtlZCBhY3Jvc3MgYWxsIHRob3NlIHRpbGVzZXRzLlxuICAgIC8vIEZvcm1zIGEgcGFydGl0aW9uaW5nIGZvciBlYWNoIHRpbGUgSUQgPT4gdW5pb24tZmluZC5cbiAgICAvLyBHaXZlbiB0aGlzIHBhcnRpdGlvbmluZywgaWYgSSB3YW50IHRvIG1vdmUgYSB0aWxlIG9uIGEgZ2l2ZW5cbiAgICAvLyB0aWxlc2V0LCBhbGwgSSBuZWVkIHRvIGRvIGlzIGZpbmQgYW5vdGhlciB0aWxlIElEIHdpdGggdGhlXG4gICAgLy8gc2FtZSBwYXJ0aXRpb24gYW5kIHN3YXAgdGhlbT9cblxuICAgIC8vIE1vcmUgZ2VuZXJhbGx5LCB3ZSBjYW4ganVzdCBwYXJ0aXRpb24gdGhlIHRpbGVzZXRzLlxuXG4gICAgLy8gRm9yIGVhY2ggc2NyZWVuLCBmaW5kIGFsbCB0aWxlc2V0cyBUIGZvciB0aGF0IHNjcmVlblxuICAgIC8vIFRoZW4gZm9yIGVhY2ggdGlsZSBvbiB0aGUgc2NyZWVuLCB1bmlvbiBUIGZvciB0aGF0IHRpbGUuXG5cbiAgICAvLyBHaXZlbiBhIHRpbGVzZXQgYW5kIGEgbWV0YXRpbGUgSUQsIGZpbmQgYWxsIHRoZSBzY3JlZW5zIHRoYXQgKDEpIGFyZSByZW5kZXJlZFxuICAgIC8vIHdpdGggdGhhdCB0aWxlc2V0LCBhbmQgKGIpIHRoYXQgY29udGFpbiB0aGF0IG1ldGF0aWxlOyB0aGVuIGZpbmQgYWxsICpvdGhlcipcbiAgICAvLyB0aWxlc2V0cyB0aGF0IHRob3NlIHNjcmVlbnMgYXJlIGV2ZXIgcmVuZGVyZWQgd2l0aC5cblxuICAgIC8vIEdpdmVuIGEgc2NyZWVuLCBmaW5kIGFsbCBhdmFpbGFibGUgbWV0YXRpbGUgSURzIHRoYXQgY291bGQgYmUgYWRkZWQgdG8gaXRcbiAgICAvLyB3aXRob3V0IGNhdXNpbmcgcHJvYmxlbXMgd2l0aCBvdGhlciBzY3JlZW5zIHRoYXQgc2hhcmUgYW55IHRpbGVzZXRzLlxuICAgIC8vICAtPiB1bnVzZWQgKG9yIHVzZWQgYnV0IHNoYXJlZCBleGNsdXNpdmVseSkgYWNyb3NzIGFsbCB0aWxlc2V0cyB0aGUgc2NyZWVuIG1heSB1c2VcblxuICAgIC8vIFdoYXQgSSB3YW50IGZvciBzd2FwcGluZyBpcyB0aGUgZm9sbG93aW5nOlxuICAgIC8vICAxLiBmaW5kIGFsbCBzY3JlZW5zIEkgd2FudCB0byB3b3JrIG9uID0+IHRpbGVzZXRzXG4gICAgLy8gIDIuIGZpbmQgdW51c2VkIGZsYWdnYWJibGUgdGlsZXMgaW4gdGhlIGhhcmRlc3Qgb25lLFxuICAgIC8vICAgICB3aGljaCBhcmUgYWxzbyBJU09MQVRFRCBpbiB0aGUgb3RoZXJzLlxuICAgIC8vICAzLiB3YW50IHRoZXNlIHRpbGVzIHRvIGJlIHVudXNlZCBpbiBBTEwgcmVsZXZhbnQgdGlsZXNldHNcbiAgICAvLyAgNC4gdG8gbWFrZSB0aGlzIHNvLCBmaW5kICpvdGhlciogdW51c2VkIGZsYWdnYWJsZSB0aWxlcyBpbiBvdGhlciB0aWxlc2V0c1xuICAgIC8vICA1LiBzd2FwIHRoZSB1bnVzZWQgd2l0aCB0aGUgaXNvbGF0ZWQgdGlsZXMgaW4gdGhlIG90aGVyIHRpbGVzZXRzXG5cbiAgICAvLyBDYXZlczpcbiAgICAvLyAgMGE6ICAgICAgOTAgLyA5Y1xuICAgIC8vICAxNTogODAgLyA5MCAvIDljXG4gICAgLy8gIDE5OiAgICAgIDkwICAgICAgKHdpbGwgYWRkIHRvIDgwPylcbiAgICAvLyAgM2U6ICAgICAgOTBcbiAgICAvL1xuICAgIC8vIElkZWFsbHkgd2UgY291bGQgcmV1c2UgODAncyAxLzIvMy80IGZvciB0aGlzXG4gICAgLy8gIDAxOiA5MCB8IDk0IDljXG4gICAgLy8gIDAyOiA5MCB8IDk0IDljXG4gICAgLy8gIDAzOiAgICAgIDk0IDljXG4gICAgLy8gIDA0OiA5MCB8IDk0IDljXG4gICAgLy9cbiAgICAvLyBOZWVkIDQgb3RoZXIgZmxhZ2dhYmxlIHRpbGUgaW5kaWNlcyB3ZSBjYW4gc3dhcCB0bz9cbiAgICAvLyAgIDkwOiA9PiAoMSwyIG5lZWQgZmxhZ2dhYmxlOyAzIHVudXNlZDsgNCBhbnkpID0+IDA3LCAwZSwgMTAsIDEyLCAxMywgLi4uLCAyMCwgMjEsIDIyLCAuLi5cbiAgICAvLyAgIDk0IDljOiA9PiBkb24ndCBuZWVkIGFueSBmbGFnZ2FibGUgPT4gMDUsIDNjLCA2OCwgODMsIDg4LCA4OSwgOGEsIDkwLCAuLi5cbiAgfVxuXG4gIGRpc2pvaW50VGlsZXNldHMoKSB7XG4gICAgY29uc3QgdGlsZXNldEJ5U2NyZWVuOiBBcnJheTxTZXQ8bnVtYmVyPj4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKCFsb2MudXNlZCkgY29udGludWU7XG4gICAgICBjb25zdCB0aWxlc2V0ID0gbG9jLnRpbGVzZXQ7XG4gICAgICAvL2NvbnN0IGV4dCA9IGxvYy5zY3JlZW5QYWdlO1xuICAgICAgZm9yIChjb25zdCByb3cgb2YgbG9jLnNjcmVlbnMpIHtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIHJvdykge1xuICAgICAgICAgICh0aWxlc2V0QnlTY3JlZW5bc10gfHwgKHRpbGVzZXRCeVNjcmVlbltzXSA9IG5ldyBTZXQoKSkpLmFkZCh0aWxlc2V0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB0aWxlcyA9IHNlcSgyNTYsICgpID0+IG5ldyBVbmlvbkZpbmQ8bnVtYmVyPigpKTtcbiAgICBmb3IgKGxldCBzID0gMDsgcyA8IHRpbGVzZXRCeVNjcmVlbi5sZW5ndGg7IHMrKykge1xuICAgICAgaWYgKCF0aWxlc2V0QnlTY3JlZW5bc10pIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCB0IG9mIHRoaXMuc2NyZWVuc1tzXS5hbGxUaWxlc1NldCgpKSB7XG4gICAgICAgIHRpbGVzW3RdLnVuaW9uKFsuLi50aWxlc2V0QnlTY3JlZW5bc11dKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gb3V0cHV0XG4gICAgZm9yIChsZXQgdCA9IDA7IHQgPCB0aWxlcy5sZW5ndGg7IHQrKykge1xuICAgICAgY29uc3QgcCA9IHRpbGVzW3RdLnNldHMoKVxuICAgICAgICAgIC5tYXAoKHM6IFNldDxudW1iZXI+KSA9PiBbLi4uc10ubWFwKGhleCkuam9pbignICcpKVxuICAgICAgICAgIC5qb2luKCcgfCAnKTtcbiAgICAgIGNvbnNvbGUubG9nKGBUaWxlICR7aGV4KHQpfTogJHtwfWApO1xuICAgIH1cbiAgICAvLyAgIGlmICghdGlsZXNldEJ5U2NyZWVuW2ldKSB7XG4gICAgLy8gICAgIGNvbnNvbGUubG9nKGBObyB0aWxlc2V0IGZvciBzY3JlZW4gJHtpLnRvU3RyaW5nKDE2KX1gKTtcbiAgICAvLyAgICAgY29udGludWU7XG4gICAgLy8gICB9XG4gICAgLy8gICB1bmlvbi51bmlvbihbLi4udGlsZXNldEJ5U2NyZWVuW2ldXSk7XG4gICAgLy8gfVxuICAgIC8vIHJldHVybiB1bmlvbi5zZXRzKCk7XG4gIH1cblxuICAvLyBDeWNsZXMgYXJlIG5vdCBhY3R1YWxseSBjeWNsaWMgLSBhbiBleHBsaWNpdCBsb29wIGF0IHRoZSBlbmQgaXMgcmVxdWlyZWQgdG8gc3dhcC5cbiAgLy8gVmFyaWFuY2U6IFsxLCAyLCBudWxsXSB3aWxsIGNhdXNlIGluc3RhbmNlcyBvZiAxIHRvIGJlY29tZSAyIGFuZCB3aWxsXG4gIC8vICAgICAgICAgICBjYXVzZSBwcm9wZXJ0aWVzIG9mIDEgdG8gYmUgY29waWVkIGludG8gc2xvdCAyXG4gIC8vIENvbW1vbiB1c2FnZSBpcyB0byBzd2FwIHRoaW5ncyBvdXQgb2YgdGhlIHdheSBhbmQgdGhlbiBjb3B5IGludG8gdGhlXG4gIC8vIG5ld2x5LWZyZWVkIHNsb3QuICBTYXkgd2Ugd2FudGVkIHRvIGZyZWUgdXAgc2xvdHMgWzEsIDIsIDMsIDRdIGFuZFxuICAvLyBoYWQgYXZhaWxhYmxlL2ZyZWUgc2xvdHMgWzUsIDYsIDcsIDhdIGFuZCB3YW50IHRvIGNvcHkgZnJvbSBbOSwgYSwgYiwgY10uXG4gIC8vIFRoZW4gY3ljbGVzIHdpbGwgYmUgWzEsIDUsIDldID8/PyBub1xuICAvLyAgLSBwcm9iYWJseSB3YW50IHRvIGRvIHNjcmVlbnMgc2VwYXJhdGVseSBmcm9tIHRpbGVzZXRzLi4uP1xuICAvLyBOT1RFIC0gd2UgZG9uJ3QgYWN0dWFsbHkgd2FudCB0byBjaGFuZ2UgdGlsZXMgZm9yIHRoZSBsYXN0IGNvcHkuLi4hXG4gIC8vICAgaW4gdGhpcyBjYXNlLCB0c1s1XSA8LSB0c1sxXSwgdHNbMV0gPC0gdHNbOV0sIHNjcmVlbi5tYXAoMSAtPiA1KVxuICAvLyAgIHJlcGxhY2UoWzB4OTBdLCBbNSwgMSwgfjldKVxuICAvLyAgICAgPT4gMXMgcmVwbGFjZWQgd2l0aCA1cyBpbiBzY3JlZW5zIGJ1dCA5cyBOT1QgcmVwbGFjZWQgd2l0aCAxcy5cbiAgLy8gSnVzdCBidWlsZCB0aGUgcGFydGl0aW9uIG9uY2UgbGF6aWx5PyB0aGVuIGNhbiByZXVzZS4uLlxuICAvLyAgIC0gZW5zdXJlIGJvdGggc2lkZXMgb2YgcmVwbGFjZW1lbnQgaGF2ZSBjb3JyZWN0IHBhcnRpdGlvbmluZz9FXG4gIC8vICAgICBvciBqdXN0IGRvIGl0IG9mZmxpbmUgLSBpdCdzIHNpbXBsZXJcbiAgLy8gVE9ETyAtIFNhbml0eSBjaGVjaz8gIFdhbnQgdG8gbWFrZSBzdXJlIG5vYm9keSBpcyB1c2luZyBjbG9iYmVyZWQgdGlsZXM/XG4gIHN3YXBNZXRhdGlsZXModGlsZXNldHM6IG51bWJlcltdLCAuLi5jeWNsZXM6IChudW1iZXIgfCBudW1iZXJbXSlbXVtdKSB7XG4gICAgLy8gUHJvY2VzcyB0aGUgY3ljbGVzXG4gICAgY29uc3QgcmV2ID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcbiAgICBjb25zdCByZXZBcnI6IG51bWJlcltdID0gc2VxKDB4MTAwKTtcbiAgICBjb25zdCBhbHQgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAgIGNvbnN0IGNwbCA9ICh4OiBudW1iZXIgfCBudW1iZXJbXSk6IG51bWJlciA9PiBBcnJheS5pc0FycmF5KHgpID8geFswXSA6IHggPCAwID8gfnggOiB4O1xuICAgIGZvciAoY29uc3QgY3ljbGUgb2YgY3ljbGVzKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN5Y2xlLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjeWNsZVtpXSkpIHtcbiAgICAgICAgICBjb25zdCBhcnIgPSBjeWNsZVtpXSBhcyBudW1iZXJbXTtcbiAgICAgICAgICBhbHQuc2V0KGFyclswXSwgYXJyWzFdKTtcbiAgICAgICAgICBjeWNsZVtpXSA9IGFyclswXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjeWNsZS5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgY29uc3QgaiA9IGN5Y2xlW2ldIGFzIG51bWJlcjtcbiAgICAgICAgY29uc3QgayA9IGN5Y2xlW2kgKyAxXSBhcyBudW1iZXI7XG4gICAgICAgIGlmIChqIDwgMCB8fCBrIDwgMCkgY29udGludWU7XG4gICAgICAgIHJldi5zZXQoaywgaik7XG4gICAgICAgIHJldkFycltrXSA9IGo7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGNvbnN0IHJlcGxhY2VtZW50U2V0ID0gbmV3IFNldChyZXBsYWNlbWVudHMua2V5cygpKTtcbiAgICAvLyBGaW5kIGluc3RhbmNlcyBpbiAoMSkgc2NyZWVucywgKDIpIHRpbGVzZXRzIGFuZCBhbHRlcm5hdGVzLCAoMykgdGlsZUVmZmVjdHNcbiAgICBjb25zdCBzY3JlZW5zID0gbmV3IFNldDxTY3JlZW4+KCk7XG4gICAgY29uc3QgdGlsZUVmZmVjdHMgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBjb25zdCB0aWxlc2V0c1NldCA9IG5ldyBTZXQodGlsZXNldHMpO1xuICAgIGZvciAoY29uc3QgbCBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKCFsLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKCF0aWxlc2V0c1NldC5oYXMobC50aWxlc2V0KSkgY29udGludWU7XG4gICAgICB0aWxlRWZmZWN0cy5hZGQobC50aWxlRWZmZWN0cyk7XG4gICAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiBsLmFsbFNjcmVlbnMoKSkge1xuICAgICAgICBzY3JlZW5zLmFkZChzY3JlZW4pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBEbyByZXBsYWNlbWVudHMuXG4gICAgLy8gMS4gc2NyZWVuczogWzUsIDEsIH45XSA9PiBjaGFuZ2UgMXMgaW50byA1c1xuICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIHNjcmVlbnMpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBzY3JlZW4udGlsZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgc2NyZWVuLnRpbGVzW2ldID0gcmV2QXJyW3NjcmVlbi50aWxlc1tpXV07XG4gICAgICB9XG4gICAgfVxuICAgIC8vIDIuIHRpbGVzZXRzOiBbNSwgMSB+OV0gPT4gY29weSA1IDw9IDEgYW5kIDEgPD0gOVxuICAgIGZvciAoY29uc3QgdHNpZCBvZiB0aWxlc2V0c1NldCkge1xuICAgICAgY29uc3QgdGlsZXNldCA9IHRoaXMudGlsZXNldHNbdHNpZF07XG4gICAgICBmb3IgKGNvbnN0IGN5Y2xlIG9mIGN5Y2xlcykge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN5Y2xlLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICAgIGNvbnN0IGEgPSBjcGwoY3ljbGVbaV0pO1xuICAgICAgICAgIGNvbnN0IGIgPSBjcGwoY3ljbGVbaSArIDFdKTtcbiAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IDQ7IGorKykge1xuICAgICAgICAgICAgdGlsZXNldC50aWxlc1tqXVthXSA9IHRpbGVzZXQudGlsZXNbal1bYl07XG4gICAgICAgICAgfVxuICAgICAgICAgIHRpbGVzZXQuYXR0cnNbYV0gPSB0aWxlc2V0LmF0dHJzW2JdO1xuICAgICAgICAgIGlmIChiIDwgMHgyMCAmJiB0aWxlc2V0LmFsdGVybmF0ZXNbYl0gIT09IGIpIHtcbiAgICAgICAgICAgIGlmIChhID49IDB4MjApIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHVuZmxhZzogJHt0c2lkfSAke2F9ICR7Yn0gJHt0aWxlc2V0LmFsdGVybmF0ZXNbYl19YCk7XG4gICAgICAgICAgICB0aWxlc2V0LmFsdGVybmF0ZXNbYV0gPSB0aWxlc2V0LmFsdGVybmF0ZXNbYl07XG4gICAgICAgICAgICBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW2EsIGJdIG9mIGFsdCkge1xuICAgICAgICB0aWxlc2V0LmFsdGVybmF0ZXNbYV0gPSBiO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyAzLiB0aWxlRWZmZWN0c1xuICAgIGZvciAoY29uc3QgdGVpZCBvZiB0aWxlRWZmZWN0cykge1xuICAgICAgY29uc3QgdGlsZUVmZmVjdCA9IHRoaXMudGlsZUVmZmVjdHNbdGVpZCAtIDB4YjNdO1xuICAgICAgZm9yIChjb25zdCBjeWNsZSBvZiBjeWNsZXMpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjeWNsZS5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBhID0gY3BsKGN5Y2xlW2ldKTtcbiAgICAgICAgICBjb25zdCBiID0gY3BsKGN5Y2xlW2kgKyAxXSk7XG4gICAgICAgICAgdGlsZUVmZmVjdC5lZmZlY3RzW2FdID0gdGlsZUVmZmVjdC5lZmZlY3RzW2JdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGEgb2YgYWx0LmtleXMoKSkge1xuICAgICAgICAvLyBUaGlzIGJpdCBpcyByZXF1aXJlZCB0byBpbmRpY2F0ZSB0aGF0IHRoZSBhbHRlcm5hdGl2ZSB0aWxlJ3NcbiAgICAgICAgLy8gZWZmZWN0IHNob3VsZCBiZSBjb25zdWx0ZWQuICBTaW1wbHkgaGF2aW5nIHRoZSBmbGFnIGFuZCB0aGVcbiAgICAgICAgLy8gdGlsZSBpbmRleCA8ICQyMCBpcyBub3Qgc3VmZmljaWVudC5cbiAgICAgICAgdGlsZUVmZmVjdC5lZmZlY3RzW2FdIHw9IDB4MDg7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIERvbmU/IT9cbiAgfVxuXG4gIG1vdmVGbGFnKG9sZEZsYWc6IG51bWJlciwgbmV3RmxhZzogbnVtYmVyKSB7XG4gICAgLy8gbmVlZCB0byB1cGRhdGUgdHJpZ2dlcnMsIHNwYXducywgZGlhbG9nc1xuICAgIGZ1bmN0aW9uIHJlcGxhY2UoYXJyOiBudW1iZXJbXSkge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGFycltpXSA9PT0gb2xkRmxhZykgYXJyW2ldID0gbmV3RmxhZztcbiAgICAgICAgaWYgKGFycltpXSA9PT0gfm9sZEZsYWcpIGFycltpXSA9IH5uZXdGbGFnO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHRyaWdnZXIgb2YgdGhpcy50cmlnZ2Vycykge1xuICAgICAgcmVwbGFjZSh0cmlnZ2VyLmNvbmRpdGlvbnMpO1xuICAgICAgcmVwbGFjZSh0cmlnZ2VyLmZsYWdzKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBucGMgb2YgdGhpcy5ucGNzKSB7XG4gICAgICBmb3IgKGNvbnN0IGNvbmRzIG9mIG5wYy5zcGF3bkNvbmRpdGlvbnMudmFsdWVzKCkpIHJlcGxhY2UoY29uZHMpO1xuICAgICAgZm9yIChjb25zdCBkaWFsb2dzIG9mIFtucGMuZ2xvYmFsRGlhbG9ncywgLi4ubnBjLmxvY2FsRGlhbG9ncy52YWx1ZXMoKV0pIHtcbiAgICAgICAgZm9yIChjb25zdCBkaWFsb2cgb2YgZGlhbG9ncykge1xuICAgICAgICAgIGlmIChkaWFsb2cuY29uZGl0aW9uID09PSBvbGRGbGFnKSBkaWFsb2cuY29uZGl0aW9uID0gbmV3RmxhZztcbiAgICAgICAgICBpZiAoZGlhbG9nLmNvbmRpdGlvbiA9PT0gfm9sZEZsYWcpIGRpYWxvZy5jb25kaXRpb24gPSB+bmV3RmxhZztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBhbHNvIG5lZWQgdG8gdXBkYXRlIG1hcCBmbGFncyBpZiA+PSAkMjAwXG4gICAgaWYgKChvbGRGbGFnICYgfjB4ZmYpID09PSAweDIwMCAmJiAobmV3RmxhZyAmIH4weGZmKSA9PT0gMHgyMDApIHtcbiAgICAgIGZvciAoY29uc3QgbG9jIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBsb2MuZmxhZ3MpIHtcbiAgICAgICAgICBpZiAoZmxhZy5mbGFnID09PSBvbGRGbGFnKSBmbGFnLmZsYWcgPSBuZXdGbGFnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgbmV4dEZyZWVUcmlnZ2VyKCk6IFRyaWdnZXIge1xuICAgIGZvciAoY29uc3QgdCBvZiB0aGlzLnRyaWdnZXJzKSB7XG4gICAgICBpZiAoIXQudXNlZCkgcmV0dXJuIHQ7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgYW4gdW51c2VkIHRyaWdnZXIuJyk7XG4gIH1cblxuICAvLyBjb21wcmVzc01hcERhdGEoKTogdm9pZCB7XG4gIC8vICAgaWYgKHRoaXMuY29tcHJlc3NlZE1hcERhdGEpIHJldHVybjtcbiAgLy8gICB0aGlzLmNvbXByZXNzZWRNYXBEYXRhID0gdHJ1ZTtcbiAgLy8gICAvLyBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gIC8vICAgLy8gICBpZiAobG9jYXRpb24uZXh0ZW5kZWQpIGxvY2F0aW9uLmV4dGVuZGVkID0gMHhhO1xuICAvLyAgIC8vIH1cbiAgLy8gICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAvLyAgICAgLy90aGlzLnNjcmVlbnNbMHhhMDAgfCBpXSA9IHRoaXMuc2NyZWVuc1sweDEwMCB8IGldO1xuICAvLyAgICAgdGhpcy5tZXRhc2NyZWVucy5yZW51bWJlcigweDEwMCB8IGksIDB4YTAwIHwgaSk7XG4gIC8vICAgICBkZWxldGUgdGhpcy5zY3JlZW5zWzB4MTAwIHwgaV07XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gVE9ETyAtIGRvZXMgbm90IHdvcmsuLi5cbiAgLy8gVE9ETyAtIGNsZWFuIHRoaXMgdXAgc29tZWhvdy4uLiB3b3VsZCBiZSBuaWNlIHRvIHVzZSB0aGUgYXNzZW1ibGVyL2xpbmtlclxuICAvLyAgICAgICAgdy8gYW4gLmFsaWduIG9wdGlvbiBmb3IgdGhpcywgYnV0IHRoZW4gd2UgaGF2ZSB0byBob2xkIG9udG8gd2VpcmRcbiAgLy8gICAgICAgIGRhdGEgaW4gbWFueSBwbGFjZXMsIHdoaWNoIGlzbid0IGdyZWF0LlxuICAvLyAgICAgICAgIC0gYXQgbGVhc3QsIHdlIGNvdWxkIFwicmVzZXJ2ZVwiIGJsb2NrcyBpbiB2YXJpb3VzIHBhZ2VzP1xuXG4gIC8qKlxuICAgKiBNb3ZlcyBhbGwgdGhlIHNjcmVlbnMgZnJvbSB0aGUgZ2l2ZW4gdGlsZXNldChzKSBpbnRvIHRoZSBnaXZlbiBwbGFuZS5cbiAgICogTm90ZSB0aGF0IHRoZSB0aWxlc2V0cyBtdXN0IGJlIF9jbG9zZWQgb3ZlciBzaGFyaW5nXywgd2hpY2ggbWVhbnMgdGhhdFxuICAgKiBpZiBzY3JlZW4gUyBpcyBpbiB0aWxlc2V0cyBBIGFuZCBCLCB0aGVuIEEgYW5kIEIgbXVzdCBiZSBlaXRoZXIgYm90aFxuICAgKiBvciBuZWl0aGVyIGluIHRoZSBhcnJheS4gIEEgcGxhbmUgaXMgNjRrYiBhbmQgaG9sZHMgMjU2IHNjcmVlbnMuXG4gICAqIFBsYW5lcyAwLi4zIGFyZSB0aGUgb3JpZ2luYWwgdW5leHBhbmRlZCBQUkcuICBUaGUgZXh0cmEgZXhwYW5kZWQgc3BhY2VcbiAgICogb3BlbnMgdXAgcGxhbmVzIDQuLjcsIHRob3VnaCAoMSkgd2Ugc2hvdWxkIGF2b2lkIHVzaW5nIHBsYW5lIDcgc2luY2VcbiAgICogdGhlIFwiZmVcIiBhbmQgXCJmZlwiIHNlZ21lbnRzIGxpdmUgdGhlcmUsIGFuZCB3ZSdsbCBhbHNvIHJlc2VydmUgdGhlIGxvd2VyXG4gICAqIHNlZ21lbnRzIGluIHBsYW5lIDcgZm9yIHJlbG9jYXRlZCBjb2RlIGFuZCBkYXRhLiAgV2UgY2FuIHByb2JhYmx5IGFsc29cbiAgICogYXZvaWQgcGxhbmUgNiBiZWNhdXNlIDUxMiBleHRyYSBzY3JlZW5zIHNob3VsZCBiZSBtb3JlIHRoYW4gYW55Ym9keVxuICAgKiBjb3VsZCBldmVyIG5lZWQuXG4gICAqL1xuICBtb3ZlU2NyZWVucyh0aWxlc2V0QXJyYXk6IE1ldGF0aWxlc2V0W10sIHBsYW5lOiBudW1iZXIpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29tcHJlc3NlZE1hcERhdGEpIHRocm93IG5ldyBFcnJvcihgTXVzdCBjb21wcmVzcyBtYXBzIGZpcnN0LmApO1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gICAgbGV0IGkgPSBwbGFuZSA8PCA4O1xuICAgIHdoaWxlICh0aGlzLnNjcmVlbnNbaV0pIHtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgY29uc3QgdGlsZXNldHMgPSBuZXcgU2V0KHRpbGVzZXRBcnJheSk7XG4gICAgZm9yIChjb25zdCB0aWxlc2V0IG9mIHRpbGVzZXRzKSB7XG4gICAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aWxlc2V0KSB7XG4gICAgICAgIGlmIChzY3JlZW4uc2lkID49IDB4MTAwKSB7XG4gICAgICAgICAgbWFwLnNldChzY3JlZW4uc2lkLCBzY3JlZW4uc2lkKTsgLy8gaWdub3JlIHNob3BzXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgLy9pZiAoKGkgJiAweGZmKSA9PT0gMHgyMCkgdGhyb3cgbmV3IEVycm9yKGBObyByb29tIGxlZnQgb24gcGFnZS5gKTtcbiAgICAgICAgY29uc3QgcHJldiA9IHNjcmVlbi5zaWQ7XG4gICAgICAgIGlmICghbWFwLmhhcyhwcmV2KSkge1xuICAgICAgICAgIC8vIHVzdWFsbHkgbm90IGltcG9ydGFudCwgYnV0IGVuc3VyZSBhbGwgdmFyaWFudHMgYXJlIHJlbnVtYmVyZWRcbiAgICAgICAgICAvL3NjcmVlbi5zaWQgPSBtYXAuZ2V0KHByZXYpITtcbiAgICAgICAgLy99IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IG5leHQgPSBpKys7XG4gICAgICAgICAgbWFwLnNldChwcmV2LCBuZXh0KTtcbiAgICAgICAgICBtYXAuc2V0KG5leHQsIG5leHQpO1xuICAgICAgICAgIHRoaXMubWV0YXNjcmVlbnMucmVudW1iZXIocHJldiwgbmV4dCwgdGlsZXNldHMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICgoaSA+Pj4gOCkgIT09IHBsYW5lKSB0aHJvdyBuZXcgRXJyb3IoYE91dCBvZiBzcGFjZSBvbiBwYWdlICR7cGxhbmV9YCk7XG5cbiAgICAvLyBNb3ZlIHRoZSBzY3JlZW4gYW5kIG1ha2Ugc3VyZSB0aGF0IGFsbCBsb2NhdGlvbnMgYXJlIG9uIGEgc2luZ2xlIHBsYW5lXG4gICAgY29uc3QgbWlzc2VkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghdGlsZXNldHMuaGFzKGxvYy5tZXRhLnRpbGVzZXQpKSBjb250aW51ZTtcbiAgICAgIGxldCBhbnlNb3ZlZCA9IGZhbHNlO1xuICAgICAgZm9yIChjb25zdCByb3cgb2YgbG9jLnNjcmVlbnMpIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCByb3cubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBjb25zdCBtYXBwZWQgPSBtYXAuZ2V0KHJvd1tqXSk7XG4gICAgICAgICAgaWYgKG1hcHBlZCAhPSBudWxsKSB7XG4gICAgICAgICAgICByb3dbal0gPSBtYXBwZWQ7XG4gICAgICAgICAgICBhbnlNb3ZlZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1pc3NlZC5hZGQobG9jLm5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGFueU1vdmVkICYmIG1pc3NlZC5zaXplKSB0aHJvdyBuZXcgRXJyb3IoYEluY29uc2lzdGVudCBtb3ZlIFske1suLi50aWxlc2V0c10ubWFwKHQgPT4gdC5uYW1lKS5qb2luKCcsICcpfV0gdG8gcGxhbmUgJHtwbGFuZX06IG1pc3NlZCAke1suLi5taXNzZWRdLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuICB9XG5cbiAgLy8gVXNlIHRoZSBicm93c2VyIEFQSSB0byBsb2FkIHRoZSBST00uICBVc2UgI3Jlc2V0IHRvIGZvcmdldCBhbmQgcmVsb2FkLlxuICBzdGF0aWMgYXN5bmMgbG9hZChwYXRjaD86IChkYXRhOiBVaW50OEFycmF5KSA9PiB2b2lkfFByb21pc2U8dm9pZD4sXG4gICAgICAgICAgICAgICAgICAgIHJlY2VpdmVyPzogKHBpY2tlcjogRWxlbWVudCkgPT4gdm9pZCk6IFByb21pc2U8Um9tPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IHBpY2tGaWxlKHJlY2VpdmVyKTtcbiAgICBpZiAocGF0Y2gpIGF3YWl0IHBhdGNoKGZpbGUpO1xuICAgIHJldHVybiBuZXcgUm9tKGZpbGUpO1xuICB9ICBcblxuICBzdGF0aWMgYXN5bmMgbG9hZEJ5dGVzKCk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICAgIHJldHVybiBhd2FpdCBwaWNrRmlsZSgpO1xuICB9XG59XG5cbi8vIGNvbnN0IGludGVyc2VjdHMgPSAobGVmdCwgcmlnaHQpID0+IHtcbi8vICAgaWYgKGxlZnQuc2l6ZSA+IHJpZ2h0LnNpemUpIHJldHVybiBpbnRlcnNlY3RzKHJpZ2h0LCBsZWZ0KTtcbi8vICAgZm9yIChsZXQgaSBvZiBsZWZ0KSB7XG4vLyAgICAgaWYgKHJpZ2h0LmhhcyhpKSkgcmV0dXJuIHRydWU7XG4vLyAgIH1cbi8vICAgcmV0dXJuIGZhbHNlO1xuLy8gfVxuXG4vLyBjb25zdCBUSUxFX0VGRkVDVFNfQllfVElMRVNFVCA9IHtcbi8vICAgMHg4MDogMHhiMyxcbi8vICAgMHg4NDogMHhiNCxcbi8vICAgMHg4ODogMHhiNSxcbi8vICAgMHg4YzogMHhiNixcbi8vICAgMHg5MDogMHhiNyxcbi8vICAgMHg5NDogMHhiOCxcbi8vICAgMHg5ODogMHhiOSxcbi8vICAgMHg5YzogMHhiYSxcbi8vICAgMHhhMDogMHhiYixcbi8vICAgMHhhNDogMHhiYyxcbi8vICAgMHhhODogMHhiNSxcbi8vICAgMHhhYzogMHhiZCxcbi8vIH07XG5cbi8vIE9ubHkgbWFrZXMgc2Vuc2UgaW4gdGhlIGJyb3dzZXIuXG5mdW5jdGlvbiBwaWNrRmlsZShyZWNlaXZlcj86IChwaWNrZXI6IEVsZW1lbnQpID0+IHZvaWQpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgaWYgKCFyZWNlaXZlcikgcmVjZWl2ZXIgPSBwaWNrZXIgPT4gZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChwaWNrZXIpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggIT09ICcjcmVzZXQnKSB7XG4gICAgICBjb25zdCBkYXRhID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JvbScpO1xuICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHJlc29sdmUoXG4gICAgICAgICAgICBVaW50OEFycmF5LmZyb20oXG4gICAgICAgICAgICAgICAgbmV3IEFycmF5KGRhdGEubGVuZ3RoIC8gMikuZmlsbCgwKS5tYXAoXG4gICAgICAgICAgICAgICAgICAgIChfLCBpKSA9PiBOdW1iZXIucGFyc2VJbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhWzIgKiBpXSArIGRhdGFbMiAqIGkgKyAxXSwgMTYpKSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB1cGxvYWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodXBsb2FkKTtcbiAgICB1cGxvYWQudHlwZSA9ICdmaWxlJztcbiAgICB1cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgY29uc3QgZmlsZSA9IHVwbG9hZC5maWxlcyFbMF07XG4gICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlbmQnLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGFyciA9IG5ldyBVaW50OEFycmF5KHJlYWRlci5yZXN1bHQgYXMgQXJyYXlCdWZmZXIpO1xuICAgICAgICBjb25zdCBzdHIgPSBBcnJheS5mcm9tKGFyciwgaGV4KS5qb2luKCcnKTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3JvbScsIHN0cik7XG4gICAgICAgIHVwbG9hZC5yZW1vdmUoKTtcbiAgICAgICAgcmVzb2x2ZShhcnIpO1xuICAgICAgfSk7XG4gICAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZSk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5leHBvcnQgY29uc3QgRVhQRUNURURfQ1JDMzIgPSAweDFiZDM5MDMyO1xuXG4vLyBGb3JtYXQ6IFthZGRyZXNzLCBicm9rZW4sIGZpeGVkXVxuY29uc3QgQURKVVNUTUVOVFMgPSBbXG4gIC8vIE5vcm1hbGl6ZSBjYXZlIGVudHJhbmNlIGluIDAxIG91dHNpZGUgc3RhcnRcbiAgWzB4MTQ1NDgsIDB4NTYsIDB4NTBdLFxuICAvLyBGaXggYnJva2VuIChmYWxsLXRocm91Z2gpIGV4aXQgb3V0c2lkZSBzdGFydFxuICBbMHgxNDU2YSwgMHgwMCwgMHhmZl0sXG4gIC8vIE1vdmUgTGVhZiBub3J0aCBlbnRyYW5jZSB0byBiZSByaWdodCBuZXh0IHRvIGV4aXQgKGNvbnNpc3RlbnQgd2l0aCBHb2EpXG4gIFsweDE0NThmLCAweDM4LCAweDMwXSxcbiAgLy8gTm9ybWFsaXplIHNlYWxlZCBjYXZlIGVudHJhbmNlL2V4aXQgYW5kIHplYnUgY2F2ZSBlbnRyYW5jZVxuICBbMHgxNDYxOCwgMHg2MCwgMHg3MF0sXG4gIFsweDE0NjI2LCAweGE4LCAweGEwXSxcbiAgWzB4MTQ2MzMsIDB4MTUsIDB4MTZdLFxuICBbMHgxNDYzNywgMHgxNSwgMHgxNl0sXG4gIC8vIE5vcm1hbGl6ZSBjb3JkZWwgcGxhaW4gZW50cmFuY2UgZnJvbSBzZWFsZWQgY2F2ZVxuICBbMHgxNDk1MSwgMHhhOCwgMHhhMF0sXG4gIFsweDE0OTUzLCAweDk4LCAweDkwXSxcbiAgLy8gTm9ybWFsaXplIGNvcmRlbCBzd2FwIGVudHJhbmNlXG4gIFsweDE0YTE5LCAweDc4LCAweDcwXSxcbiAgLy8gUmVkdW5kYW50IGV4aXQgbmV4dCB0byBzdG9tJ3MgZG9vciBpbiAkMTlcbiAgWzB4MTRhZWIsIDB4MDksIDB4ZmZdLFxuICAvLyBOb3JtYWxpemUgc3dhbXAgZW50cmFuY2UgcG9zaXRpb25cbiAgWzB4MTRiNDksIDB4ODAsIDB4ODhdLFxuICAvLyBOb3JtYWxpemUgYW1hem9uZXMgZW50cmFuY2UvZXhpdCBwb3NpdGlvblxuICBbMHgxNGI4NywgMHgyMCwgMHgzMF0sXG4gIFsweDE0YjlhLCAweDAxLCAweDAyXSxcbiAgWzB4MTRiOWUsIDB4MDEsIDB4MDJdLFxuICAvLyBGaXggZ2FyYmFnZSBtYXAgc3F1YXJlIGluIGJvdHRvbS1yaWdodCBvZiBNdCBTYWJyZSBXZXN0IGNhdmVcbiAgWzB4MTRkYjksIDB4MDgsIDB4ODBdLFxuICAvLyBOb3JtYWxpemUgc2FicmUgbiBlbnRyYW5jZSBiZWxvdyBzdW1taXRcbiAgWzB4MTRlZjYsIDB4NjgsIDB4NjBdLFxuICAvLyBGaXggZ2FyYmFnZSBtYXAgc3F1YXJlIGluIGJvdHRvbS1sZWZ0IG9mIExpbWUgVHJlZSBWYWxsZXlcbiAgWzB4MTU0NWQsIDB4ZmYsIDB4MDBdLFxuICAvLyBOb3JtYWxpemUgbGltZSB0cmVlIHZhbGxleSBTRSBlbnRyYW5jZVxuICBbMHgxNTQ2OSwgMHg3OCwgMHg3MF0sXG4gIC8vIE5vcm1hbGl6ZSBwb3J0b2Egc2Uvc3cgZW50cmFuY2VzXG4gIFsweDE1ODA2LCAweDk4LCAweGEwXSxcbiAgWzB4MTU4MGEsIDB4OTgsIDB4YTBdLFxuICAvLyBOb3JtYWxpemUgcG9ydG9hIHBhbGFjZSBlbnRyYW5jZVxuICBbMHgxNTgwZSwgMHg1OCwgMHg1MF0sXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlL2V4aXQgaW4gcG9ydG9hXG4gIFsweDE1ODFkLCAweDAwLCAweGZmXSxcbiAgWzB4MTU4NGUsIDB4ZGIsIDB4ZmZdLFxuICAvLyBOb3JtYWxpemUgZmlzaGVybWFuIGlzbGFuZCBlbnRyYW5jZVxuICBbMHgxNTg3NSwgMHg3OCwgMHg3MF0sXG4gIC8vIE5vcm1hbGl6ZSB6b21iaWUgdG93biBlbnRyYW5jZSBmcm9tIHBhbGFjZVxuICBbMHgxNWI0ZiwgMHg3OCwgMHg4MF0sXG4gIC8vIFJlbW92ZSB1bnVzZWQgbWFwIHNjcmVlbnMgZnJvbSBFdmlsIFNwaXJpdCBsb3dlclxuICBbMHgxNWJhZiwgMHhmMCwgMHg4MF0sXG4gIFsweDE1YmI2LCAweGRmLCAweDgwXSxcbiAgWzB4MTViYjcsIDB4OTYsIDB4ODBdLFxuICAvLyBOb3JtYWxpemUgc2FiZXJhIHBhbGFjZSAxIGVudHJhbmNlIHVwIG9uZSB0aWxlXG4gIFsweDE1Y2UzLCAweGRmLCAweGNmXSxcbiAgWzB4MTVjZWUsIDB4NmUsIDB4NmRdLFxuICBbMHgxNWNmMiwgMHg2ZSwgMHg2ZF0sXG4gIC8vIE5vcm1hbGl6ZSBzYWJlcmEgcGFsYWNlIDMgZW50cmFuY2UgdXAgb25lIHRpbGVcbiAgWzB4MTVkOGUsIDB4ZGYsIDB4Y2ZdLFxuICBbMHgxNWQ5MSwgMHgyZSwgMHgyZF0sXG4gIFsweDE1ZDk1LCAweDJlLCAweDJkXSxcbiAgLy8gTm9ybWFsaXplIGpvZWwgZW50cmFuY2VcbiAgWzB4MTVlM2EsIDB4ZDgsIDB4ZGZdLFxuICAvLyBOb3JtYWxpemUgZ29hIHZhbGxleSByaWdodGhhbmQgZW50cmFuY2VcbiAgWzB4MTVmMzksIDB4NzgsIDB4NzBdLFxuICAvLyBNYXJrIGJhZCBlbnRyYW5jZS9leGl0IGluIGdvYSB2YWxsZXlcbiAgWzB4MTVmNDAsIDB4MDIsIDB4ZmZdLFxuICBbMHgxNWY2MSwgMHg4ZCwgMHhmZl0sXG4gIFsweDE1ZjY1LCAweDhkLCAweGZmXSxcbiAgLy8gTm9ybWFsaXplIHNoeXJvbiBsb3dlciBlbnRyYW5jZVxuICBbMHgxNjNmZCwgMHg0OCwgMHg0MF0sXG4gIC8vIE5vcm1hbGl6ZSBzaHlyb24gZm9ydHJlc3MgZW50cmFuY2VcbiAgWzB4MTY0MDMsIDB4NTUsIDB4NTBdLFxuICAvLyBOb3JtYWxpemUgZ29hIHNvdXRoIGVudHJhbmNlXG4gIFsweDE2NDViLCAweGQ4LCAweGRmXSxcbiAgLy8gRml4IHBhdHRlcm4gdGFibGUgZm9yIGRlc2VydCAxIChhbmltYXRpb24gZ2xvc3NlcyBvdmVyIGl0KVxuICBbMHgxNjRjYywgMHgwNCwgMHgyMF0sXG4gIC8vIEZpeCBnYXJiYWdlIGF0IGJvdHRvbSBvZiBvYXNpcyBjYXZlIG1hcCAoaXQncyA4eDExLCBub3QgOHgxMiA9PiBmaXggaGVpZ2h0KVxuICBbMHgxNjRmZiwgMHgwYiwgMHgwYV0sXG4gIC8vIE5vcm1hbGl6ZSBzYWhhcmEgZW50cmFuY2UvZXhpdCBwb3NpdGlvblxuICBbMHgxNjYwZCwgMHgyMCwgMHgzMF0sXG4gIFsweDE2NjI0LCAweDAxLCAweDAyXSxcbiAgWzB4MTY2MjgsIDB4MDEsIDB4MDJdLFxuICAvLyBSZW1vdmUgdW51c2VkIHNjcmVlbnMgZnJvbSBtYWRvMiBhcmVhXG4gIFsweDE2ZGIwLCAweDlhLCAweDgwXSxcbiAgWzB4MTZkYjQsIDB4OWUsIDB4ODBdLFxuICBbMHgxNmRiOCwgMHg5MSwgMHg4MF0sXG4gIFsweDE2ZGJjLCAweDllLCAweDgwXSxcbiAgWzB4MTZkYzAsIDB4OTEsIDB4ODBdLFxuICAvLyBNYXJrIGJhZCBlbnRyYW5jZSBpbiB1bnVzZWQgbWFkbzIgYXJlYVxuICBbMHgxNmRlOCwgMHgwMCwgMHhmZl0sXG4gIC8vIE5vcm1hbGl6ZSBtYWRvMi1zaWRlIGhlY2t3YXkgZW50cmFuY2VcbiAgWzB4MTZkZWQsIDB4ZGYsIDB4ZDBdLFxuICAvLyBGaXggYm9ndXMgZXhpdHMgaW4gdW51c2VkIG1hZG8yIGFyZWFcbiAgLy8gKGV4aXRzIDIgYW5kIDMgYXJlIGJhZCwgc28gbW92ZSA0IGFuZCA1IG9uIHRvcCBvZiB0aGVtKVxuICBbMHgxNmRmOCwgMHgwYywgMHg1Y10sXG4gIFsweDE2ZGY5LCAweGIwLCAweGI5XSxcbiAgWzB4MTZkZmEsIDB4MDAsIDB4MDJdLFxuICBbMHgxNmRmYywgMHgwYywgMHg1Y10sXG4gIFsweDE2ZGZkLCAweGIwLCAweGI5XSxcbiAgWzB4MTZkZmUsIDB4MDAsIDB4MDJdLFxuICBbMHgxNmRmZiwgMHgwNywgMHhmZl0sXG4gIC8vIEFsc28gcmVtb3ZlIHRoZSBiYWQgZW50cmFuY2VzL2V4aXRzIG9uIHRoZSBhc2luYSB2ZXJzaW9uXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlL2V4aXQgaW4gcG9ydG9hXG4gIFsweDE2ZTVkLCAweDAyLCAweGZmXSxcbiAgWzB4MTZlNmEsIDB4YWQsIDB4ZmZdLFxuICBbMHgxNmU2ZSwgMHhhZCwgMHhmZl0sXG4gIC8vIE1hcmsgdW51c2VkIGVudHJhbmNlL2V4aXQgaW4gbm9uLWtlbnN1IHNpZGUgb2Yga2FybWluZSA1LlxuICBbMHgxNzAwMSwgMHgwMiwgMHhmZl0sXG4gIFsweDE3MDJlLCAweGI3LCAweGZmXSxcbiAgWzB4MTcwMzIsIDB4YjcsIDB4ZmZdLFxuICAvLyBNYXJrIHVudXNlZCBlbnRyYW5jZXMvZXhpdHMgaW4ga2Vuc3Ugc2lkZSBvZiBrYXJtaW5lIDUuXG4gIFsweDE3MGFiLCAweDAzLCAweGZmXSxcbiAgWzB4MTcwYWYsIDB4MDIsIDB4ZmZdLFxuICBbMHgxNzBiMywgMHgwNSwgMHhmZl0sXG4gIFsweDE3MGI3LCAweDA2LCAweGZmXSxcbiAgWzB4MTcwYmIsIDB4MDAsIDB4ZmZdLFxuICBbMHgxNzBjNCwgMHhiMiwgMHhmZl0sXG4gIFsweDE3MGM4LCAweGIyLCAweGZmXSxcbiAgWzB4MTcwY2MsIDB4YjEsIDB4ZmZdLFxuICBbMHgxNzBkMCwgMHhiMSwgMHhmZl0sXG4gIFsweDE3MGQ0LCAweGIzLCAweGZmXSxcbiAgWzB4MTcwZDgsIDB4YjMsIDB4ZmZdLFxuICBbMHgxNzBkYywgMHhiNSwgMHhmZl0sXG4gIFsweDE3MGUwLCAweGI1LCAweGZmXSxcbiAgWzB4MTcwZTQsIDB4YjUsIDB4ZmZdLFxuICBbMHgxNzBlOCwgMHhiNSwgMHhmZl0sXG4gIC8vIE1hcmsgdW51c2VkIGVudHJhbmNlcyBpbiBcbiAgLy8gTm9ybWFsaXplIGFyeWxsaXMgZW50cmFuY2VcbiAgWzB4MTc0ZWUsIDB4ODAsIDB4ODhdLFxuICAvLyBOb3JtYWxpemUgam9lbCBzaGVkIGJvdHRvbSBhbmQgc2VjcmV0IHBhc3NhZ2UgZW50cmFuY2VzXG4gIFsweDE3N2MxLCAweDg4LCAweDgwXSxcbiAgWzB4MTc3YzUsIDB4OTgsIDB4YTBdLFxuICBbMHgxNzdjNywgMHg1OCwgMHg1MF0sXG4gIC8vIEZpeCBiYWQgbXVzaWMgaW4gem9tYmlldG93biBob3VzZXM6ICQxMCBzaG91bGQgYmUgJDAxLlxuICBbMHgxNzgyYSwgMHgxMCwgMHgwMV0sXG4gIFsweDE3ODU3LCAweDEwLCAweDAxXSxcbiAgLy8gTm9ybWFsaXplIHN3YW4gZGFuY2UgaGFsbCBlbnRyYW5jZSB0byBiZSBjb25zaXN0ZW50IHdpdGggc3RvbSdzIGhvdXNlXG4gIFsweDE3OTU0LCAweDgwLCAweDc4XSxcbiAgLy8gTm9ybWFsaXplIHNoeXJvbiBkb2pvIGVudHJhbmNlIHRvIGJlIGNvbnNpc3RlbnQgd2l0aCBzdG9tJ3MgaG91c2VcbiAgWzB4MTc5YTIsIDB4ODAsIDB4NzhdLFxuICAvLyBGaXggYmFkIHNjcmVlbnMgaW4gdG93ZXJcbiAgWzB4MTdiOGEsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAxXG4gIFsweDE3YjkwLCAweDAwLCAweDQwXSxcbiAgWzB4MTdiY2UsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAyXG4gIFsweDE3YmQ0LCAweDAwLCAweDQwXSxcbiAgWzB4MTdjMGUsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAzXG4gIFsweDE3YzE0LCAweDAwLCAweDQwXSxcbiAgWzB4MTdjNGUsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciA0XG4gIFsweDE3YzU0LCAweDAwLCAweDQwXSxcbiAgLy8gRml4IGJhZCBzcGF3biBpbiBNdCBIeWRyYSAobWFrZSBpdCBhbiBleHRyYSBwdWRkbGUpLlxuICBbMHgxOWYwMiwgMHg0MCwgMHg4MF0sXG4gIFsweDE5ZjAzLCAweDMzLCAweDMyXSxcbiAgLy8gRml4IGJhZCBzcGF3biBpbiBTYWJlcmEgMidzIGxldmVsIChwcm9iYWJseSBtZWFudCB0byBiZSBhIGZsYWlsIGd1eSkuXG4gIFsweDFhMWUwLCAweDQwLCAweGMwXSwgLy8gbWFrZSBzdXJlIHRvIGZpeCBwYXR0ZXJuIHNsb3QsIHRvbyFcbiAgWzB4MWExZTEsIDB4M2QsIDB4MzRdLFxuICAvLyBQb2ludCBBbWF6b25lcyBvdXRlciBndWFyZCB0byBwb3N0LW92ZXJmbG93IG1lc3NhZ2UgdGhhdCdzIGFjdHVhbGx5IHNob3duLlxuICBbMHgxY2YwNSwgMHg0NywgMHg0OF0sXG4gIC8vIFJlbW92ZSBzdHJheSBmbGlnaHQgZ3JhbnRlciBpbiBab21iaWV0b3duLlxuICBbMHgxZDMxMSwgMHgyMCwgMHhhMF0sXG4gIFsweDFkMzEyLCAweDMwLCAweDAwXSxcbiAgLy8gRml4IHF1ZWVuJ3MgZGlhbG9nIHRvIHRlcm1pbmF0ZSBvbiBsYXN0IGl0ZW0sIHJhdGhlciB0aGFuIG92ZXJmbG93LFxuICAvLyBzbyB0aGF0IHdlIGRvbid0IHBhcnNlIGdhcmJhZ2UuXG4gIFsweDFjZmY5LCAweDYwLCAweGUwXSxcbiAgLy8gRml4IEFtYXpvbmVzIG91dGVyIGd1YXJkIG1lc3NhZ2UgdG8gbm90IG92ZXJmbG93LlxuICBbMHgyY2E5MCwgMHgwMiwgMHgwMF0sXG4gIC8vIEZpeCBzZWVtaW5nbHktdW51c2VkIGtlbnN1IG1lc3NhZ2UgMWQ6MTcgb3ZlcmZsb3dpbmcgaW50byAxZDoxOFxuICBbMHgyZjU3MywgMHgwMiwgMHgwMF0sXG4gIC8vIEZpeCB1bnVzZWQga2FybWluZSB0cmVhc3VyZSBjaGVzdCBtZXNzYWdlIDIwOjE4LlxuICBbMHgyZmFlNCwgMHg1ZiwgMHgwMF0sXG5dIGFzIGNvbnN0O1xuIl19