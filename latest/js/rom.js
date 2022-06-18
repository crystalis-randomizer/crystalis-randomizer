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
        this.allocatedTriggers = new Map();
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
    nextFreeTrigger(name) {
        for (const t of this.triggers) {
            if (t.used)
                continue;
            if (name)
                this.allocatedTriggers.set(name, t.id);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2pzL3JvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDN0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRXZDLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUUvQyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUM3QyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDckMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUM1QyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQWMsWUFBWSxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDL0QsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDbEMsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBRXBELE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFB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O0FBRUQsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQztBQUd6QyxNQUFNLFdBQVcsR0FBRztJQUVsQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBR3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFHckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFHckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBR3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7Q0FDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IHtBc3NlbWJsZXJ9IGZyb20gJy4vYXNtL2Fzc2VtYmxlci5qcyc7XG5pbXBvcnQge0Fzc2VtYmxlcn0gZnJvbSAnLi9hc20vYXNzZW1ibGVyLmpzJztcbmltcG9ydCB7TGlua2VyfSBmcm9tICcuL2FzbS9saW5rZXIuanMnO1xuaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4vYXNtL21vZHVsZS5qcyc7XG5pbXBvcnQge0FkSG9jU3Bhd259IGZyb20gJy4vcm9tL2FkaG9jc3Bhd24uanMnO1xuLy9pbXBvcnQge0FyZWFzfSBmcm9tICcuL3JvbS9hcmVhLmpzJztcbmltcG9ydCB7Qm9zc0tpbGx9IGZyb20gJy4vcm9tL2Jvc3NraWxsLmpzJztcbmltcG9ydCB7Qm9zc2VzfSBmcm9tICcuL3JvbS9ib3NzZXMuanMnO1xuaW1wb3J0IHtDb2luRHJvcHN9IGZyb20gJy4vcm9tL2NvaW5kcm9wcy5qcyc7XG5pbXBvcnQge0ZsYWdzfSBmcm9tICcuL3JvbS9mbGFncy5qcyc7XG5pbXBvcnQge0hpdGJveH0gZnJvbSAnLi9yb20vaGl0Ym94LmpzJztcbmltcG9ydCB7SXRlbXN9IGZyb20gJy4vcm9tL2l0ZW0uanMnO1xuaW1wb3J0IHtJdGVtR2V0c30gZnJvbSAnLi9yb20vaXRlbWdldC5qcyc7XG5pbXBvcnQge0xvY2F0aW9uc30gZnJvbSAnLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtNZXNzYWdlc30gZnJvbSAnLi9yb20vbWVzc2FnZXMuanMnO1xuaW1wb3J0IHtNZXRhc2NyZWVuc30gZnJvbSAnLi9yb20vbWV0YXNjcmVlbnMuanMnO1xuaW1wb3J0IHtNZXRhc3ByaXRlfSBmcm9tICcuL3JvbS9tZXRhc3ByaXRlLmpzJztcbmltcG9ydCB7TWV0YXRpbGVzZXQsIE1ldGF0aWxlc2V0c30gZnJvbSAnLi9yb20vbWV0YXRpbGVzZXQuanMnO1xuaW1wb3J0IHtNb25zdGVyfSBmcm9tICcuL3JvbS9tb25zdGVyLmpzJztcbmltcG9ydCB7TnBjc30gZnJvbSAnLi9yb20vbnBjLmpzJztcbmltcG9ydCB7T2JqZWN0QWN0aW9uc30gZnJvbSAnLi9yb20vb2JqZWN0YWN0aW9uLmpzJztcbmltcG9ydCB7T2JqZWN0RGF0YX0gZnJvbSAnLi9yb20vb2JqZWN0ZGF0YS5qcyc7XG5pbXBvcnQge09iamVjdHN9IGZyb20gJy4vcm9tL29iamVjdHMuanMnO1xuaW1wb3J0IHtSb21PcHRpb259IGZyb20gJy4vcm9tL29wdGlvbi5qcyc7XG5pbXBvcnQge1BhbGV0dGV9IGZyb20gJy4vcm9tL3BhbGV0dGUuanMnO1xuaW1wb3J0IHtQYXR0ZXJuc30gZnJvbSAnLi9yb20vcGF0dGVybi5qcyc7XG5pbXBvcnQge1JhbmRvbU51bWJlcnN9IGZyb20gJy4vcm9tL3JhbmRvbW51bWJlcnMuanMnO1xuaW1wb3J0IHtTY2FsaW5nfSBmcm9tICcuL3JvbS9zY2FsaW5nLmpzJztcbmltcG9ydCB7U2NyZWVuLCBTY3JlZW5zfSBmcm9tICcuL3JvbS9zY3JlZW4uanMnO1xuaW1wb3J0IHtTaG9wc30gZnJvbSAnLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge1Nsb3RzfSBmcm9tICcuL3JvbS9zbG90cy5qcyc7XG5pbXBvcnQge1Nwb2lsZXJ9IGZyb20gJy4vcm9tL3Nwb2lsZXIuanMnO1xuaW1wb3J0IHtUZWxlcGF0aHl9IGZyb20gJy4vcm9tL3RlbGVwYXRoeS5qcyc7XG5pbXBvcnQge1RpbGVBbmltYXRpb259IGZyb20gJy4vcm9tL3RpbGVhbmltYXRpb24uanMnO1xuaW1wb3J0IHtUaWxlRWZmZWN0c30gZnJvbSAnLi9yb20vdGlsZWVmZmVjdHMuanMnO1xuaW1wb3J0IHtUaWxlc2V0c30gZnJvbSAnLi9yb20vdGlsZXNldC5qcyc7XG5pbXBvcnQge1Rvd25XYXJwfSBmcm9tICcuL3JvbS90b3dud2FycC5qcyc7XG5pbXBvcnQge1RyaWdnZXJ9IGZyb20gJy4vcm9tL3RyaWdnZXIuanMnO1xuaW1wb3J0IHtTZWdtZW50LCBoZXgsIHNlcSwgZnJlZX0gZnJvbSAnLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge1dpbGRXYXJwfSBmcm9tICcuL3JvbS93aWxkd2FycC5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi91bmlvbmZpbmQuanMnO1xuXG5jb25zdCB7JDBlLCAkMGYsICQxMH0gPSBTZWdtZW50O1xuXG4vLyBBIGtub3duIGxvY2F0aW9uIGZvciBkYXRhIGFib3V0IHN0cnVjdHVyYWwgY2hhbmdlcyB3ZSd2ZSBtYWRlIHRvIHRoZSByb20uXG4vLyBUaGUgdHJpY2sgaXMgdG8gZmluZCBhIHN1aXRhYmxlIHJlZ2lvbiBvZiBST00gdGhhdCdzIGJvdGggdW51c2VkICphbmQqXG4vLyBpcyBub3QgcGFydGljdWxhcmx5ICp1c2FibGUqIGZvciBvdXIgcHVycG9zZXMuICBUaGUgYm90dG9tIDMgcm93cyBvZiB0aGVcbi8vIHZhcmlvdXMgc2luZ2xlLXNjcmVlbiBtYXBzIGFyZSBhbGwgZWZmZWN0aXZlbHkgdW51c2VkLCBzbyB0aGF0IGdpdmVzIDQ4XG4vLyBieXRlcyBwZXIgbWFwLiAgU2hvcHMgKDE0MDAwLi4xNDJmZikgYWxzbyBoYXZlIGEgZ2lhbnQgYXJlYSB1cCB0b3AgdGhhdFxuLy8gY291bGQgcG9zc2libHkgYmUgdXNhYmxlLCB0aG91Z2ggd2UnZCBuZWVkIHRvIHRlYWNoIHRoZSB0aWxlLXJlYWRpbmcgY29kZVxuLy8gdG8gaWdub3JlIHdoYXRldmVyJ3Mgd3JpdHRlbiB0aGVyZSwgc2luY2UgaXQgKmlzKiB2aXNpYmxlIGJlZm9yZSB0aGUgbWVudVxuLy8gcG9wcyB1cC4gIFRoZXNlIGFyZSBiaWcgZW5vdWdoIHJlZ2lvbnMgdGhhdCB3ZSBjb3VsZCBldmVuIGNvbnNpZGVyIHVzaW5nXG4vLyB0aGVtIHZpYSBwYWdlLXN3YXBwaW5nIHRvIGdldCBleHRyYSBkYXRhIGluIGFyYml0cmFyeSBjb250ZXh0cy5cblxuLy8gU2hvcHMgYXJlIHBhcnRpY3VsYXJseSBuaWNlIGJlY2F1c2UgdGhleSdyZSBhbGwgMDAgaW4gdmFuaWxsYS5cbi8vIE90aGVyIHBvc3NpYmxlIHJlZ2lvbnM6XG4vLyAgIC0gNDggYnl0ZXMgYXQgJGZmYzAgKG1lemFtZSBzaHJpbmUpID0+ICRmZmUwIGlzIGFsbCAkZmYgaW4gdmFuaWxsYS5cblxuZXhwb3J0IGNsYXNzIFJvbSB7XG5cbiAgLy8gVGhlc2UgdmFsdWVzIGNhbiBiZSBxdWVyaWVkIHRvIGRldGVybWluZSBob3cgdG8gcGFyc2UgYW55IGdpdmVuIHJvbS5cbiAgLy8gVGhleSdyZSBhbGwgYWx3YXlzIHplcm8gZm9yIHZhbmlsbGFcbiAgc3RhdGljIHJlYWRvbmx5IE9NSVRfSVRFTV9HRVRfREFUQV9TVUZGSVggICAgPSBSb21PcHRpb24uYml0KDB4MTQyYzAsIDApO1xuICBzdGF0aWMgcmVhZG9ubHkgT01JVF9MT0NBTF9ESUFMT0dfU1VGRklYICAgICA9IFJvbU9wdGlvbi5iaXQoMHgxNDJjMCwgMSk7XG4gIHN0YXRpYyByZWFkb25seSBDT01QUkVTU0VEX01BUERBVEEgICAgICAgICAgID0gUm9tT3B0aW9uLmJpdCgweDE0MmMwLCAyKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNIT1BfQ09VTlQgICAgICAgICAgICAgICAgICAgPSBSb21PcHRpb24uYnl0ZSgweDE0MmMxKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNDQUxJTkdfTEVWRUxTICAgICAgICAgICAgICAgPSBSb21PcHRpb24uYnl0ZSgweDE0MmMyKTtcbiAgc3RhdGljIHJlYWRvbmx5IFVOSVFVRV9JVEVNX1RBQkxFICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQwKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNIT1BfREFUQV9UQUJMRVMgICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQzKTtcbiAgc3RhdGljIHJlYWRvbmx5IFRFTEVQQVRIWV9UQUJMRVMgICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQ2KTtcblxuICByZWFkb25seSBwcmc6IFVpbnQ4QXJyYXk7XG4gIHJlYWRvbmx5IGNocjogVWludDhBcnJheTtcblxuICAvLyBUT0RPIC0gd291bGQgYmUgbmljZSB0byBlbGltaW5hdGUgdGhlIGR1cGxpY2F0aW9uIGJ5IG1vdmluZ1xuICAvLyB0aGUgY3RvcnMgaGVyZSwgYnV0IHRoZXJlJ3MgbG90cyBvZiBwcmVyZXFzIGFuZCBkZXBlbmRlbmN5XG4gIC8vIG9yZGVyaW5nLCBhbmQgd2UgbmVlZCB0byBtYWtlIHRoZSBBREpVU1RNRU5UUywgZXRjLlxuICAvL3JlYWRvbmx5IGFyZWFzOiBBcmVhcztcbiAgcmVhZG9ubHkgc2NyZWVuczogU2NyZWVucztcbiAgcmVhZG9ubHkgdGlsZXNldHM6IFRpbGVzZXRzO1xuICByZWFkb25seSB0aWxlRWZmZWN0czogVGlsZUVmZmVjdHNbXTtcbiAgcmVhZG9ubHkgdHJpZ2dlcnM6IFRyaWdnZXJbXTtcbiAgcmVhZG9ubHkgcGF0dGVybnM6IFBhdHRlcm5zO1xuICByZWFkb25seSBwYWxldHRlczogUGFsZXR0ZVtdO1xuICByZWFkb25seSBsb2NhdGlvbnM6IExvY2F0aW9ucztcbiAgcmVhZG9ubHkgdGlsZUFuaW1hdGlvbnM6IFRpbGVBbmltYXRpb25bXTtcbiAgcmVhZG9ubHkgaGl0Ym94ZXM6IEhpdGJveFtdO1xuICByZWFkb25seSBvYmplY3RBY3Rpb25zOiBPYmplY3RBY3Rpb25zO1xuICByZWFkb25seSBvYmplY3RzOiBPYmplY3RzO1xuICByZWFkb25seSBhZEhvY1NwYXduczogQWRIb2NTcGF3bltdO1xuICByZWFkb25seSBtZXRhc2NyZWVuczogTWV0YXNjcmVlbnM7XG4gIHJlYWRvbmx5IG1ldGFzcHJpdGVzOiBNZXRhc3ByaXRlW107XG4gIHJlYWRvbmx5IG1ldGF0aWxlc2V0czogTWV0YXRpbGVzZXRzO1xuICByZWFkb25seSBpdGVtR2V0czogSXRlbUdldHM7XG4gIHJlYWRvbmx5IGl0ZW1zOiBJdGVtcztcbiAgcmVhZG9ubHkgc2hvcHM6IFNob3BzO1xuICByZWFkb25seSBzbG90czogU2xvdHM7XG4gIHJlYWRvbmx5IG5wY3M6IE5wY3M7XG4gIHJlYWRvbmx5IGJvc3NLaWxsczogQm9zc0tpbGxbXTtcbiAgcmVhZG9ubHkgYm9zc2VzOiBCb3NzZXM7XG4gIHJlYWRvbmx5IHdpbGRXYXJwOiBXaWxkV2FycDtcbiAgcmVhZG9ubHkgdG93bldhcnA6IFRvd25XYXJwO1xuICByZWFkb25seSBmbGFnczogRmxhZ3M7XG4gIHJlYWRvbmx5IGNvaW5Ecm9wczogQ29pbkRyb3BzO1xuICByZWFkb25seSBzY2FsaW5nOiBTY2FsaW5nO1xuICByZWFkb25seSByYW5kb21OdW1iZXJzOiBSYW5kb21OdW1iZXJzO1xuXG4gIHJlYWRvbmx5IHRlbGVwYXRoeTogVGVsZXBhdGh5O1xuICByZWFkb25seSBtZXNzYWdlczogTWVzc2FnZXM7XG5cbiAgcmVhZG9ubHkgbW9kdWxlczogTW9kdWxlW10gPSBbXTtcblxuICBzcG9pbGVyPzogU3BvaWxlcjtcblxuICAvLyBOT1RFOiBUaGUgZm9sbG93aW5nIHByb3BlcnRpZXMgbWF5IGJlIGNoYW5nZWQgYmV0d2VlbiByZWFkaW5nIGFuZCB3cml0aW5nXG4gIC8vIHRoZSByb20uICBJZiB0aGlzIGhhcHBlbnMsIHRoZSB3cml0dGVuIHJvbSB3aWxsIGhhdmUgZGlmZmVyZW50IG9wdGlvbnMuXG4gIC8vIFRoaXMgaXMgYW4gZWZmZWN0aXZlIHdheSB0byBjb252ZXJ0IGJldHdlZW4gdHdvIHN0eWxlcy5cblxuICAvLyBNYXggbnVtYmVyIG9mIHNob3BzLiAgVmFyaW91cyBibG9ja3Mgb2YgbWVtb3J5IHJlcXVpcmUga25vd2luZyB0aGlzIG51bWJlclxuICAvLyB0byBhbGxvY2F0ZS5cbiAgc2hvcENvdW50OiBudW1iZXI7XG4gIC8vIE51bWJlciBvZiBzY2FsaW5nIGxldmVscy4gIERldGVybWluZXMgdGhlIHNpemUgb2YgdGhlIHNjYWxpbmcgdGFibGVzLlxuICBzY2FsaW5nTGV2ZWxzOiBudW1iZXI7XG5cbiAgLy8gQWRkcmVzcyB0byByZWFkL3dyaXRlIHRoZSBiaXRmaWVsZCBpbmRpY2F0aW5nIHVuaXF1ZSBpdGVtcy5cbiAgdW5pcXVlSXRlbVRhYmxlQWRkcmVzczogbnVtYmVyO1xuICAvLyBBZGRyZXNzIG9mIG5vcm1hbGl6ZWQgcHJpY2VzIHRhYmxlLCBpZiBwcmVzZW50LiAgSWYgdGhpcyBpcyBhYnNlbnQgdGhlbiB3ZVxuICAvLyBhc3N1bWUgcHJpY2VzIGFyZSBub3Qgbm9ybWFsaXplZCBhbmQgYXJlIGF0IHRoZSBub3JtYWwgcGF3biBzaG9wIGFkZHJlc3MuXG4gIHNob3BEYXRhVGFibGVzQWRkcmVzczogbnVtYmVyO1xuICAvLyBBZGRyZXNzIG9mIHJlYXJyYW5nZWQgdGVsZXBhdGh5IHRhYmxlcy5cbiAgdGVsZXBhdGh5VGFibGVzQWRkcmVzczogbnVtYmVyO1xuICAvLyBXaGV0aGVyIHRoZSB0cmFpbGluZyAkZmYgc2hvdWxkIGJlIG9taXR0ZWQgZnJvbSB0aGUgSXRlbUdldERhdGEgdGFibGUuXG4gIG9taXRJdGVtR2V0RGF0YVN1ZmZpeDogYm9vbGVhbjtcbiAgLy8gV2hldGhlciB0aGUgdHJhaWxpbmcgYnl0ZSBvZiBlYWNoIExvY2FsRGlhbG9nIGlzIG9taXR0ZWQuICBUaGlzIGFmZmVjdHNcbiAgLy8gYm90aCByZWFkaW5nIGFuZCB3cml0aW5nIHRoZSB0YWJsZS4gIE1heSBiZSBpbmZlcnJlZCB3aGlsZSByZWFkaW5nLlxuICBvbWl0TG9jYWxEaWFsb2dTdWZmaXg6IGJvb2xlYW47XG4gIC8vIFdoZXRoZXIgbWFwZGF0YSBoYXMgYmVlbiBjb21wcmVzc2VkLlxuICBjb21wcmVzc2VkTWFwRGF0YTogYm9vbGVhbjtcblxuICAvLyBBbGxvY2F0ZWQgdHJpZ2dlcnNcbiAgYWxsb2NhdGVkVHJpZ2dlcnMgPSBuZXcgTWFwPFRyaWdnZXIuQ3VzdG9tLCBudW1iZXI+KCk7XG5cbiAgY29uc3RydWN0b3Iocm9tOiBVaW50OEFycmF5KSB7XG4gICAgY29uc3QgcHJnU2l6ZSA9IHJvbVs0XSAqIDB4NDAwMDtcbiAgICAvLyBOT1RFOiBjaHJTaXplID0gcm9tWzVdICogMHgyMDAwO1xuICAgIGNvbnN0IHByZ1N0YXJ0ID0gMHgxMCArIChyb21bNl0gJiA0ID8gNTEyIDogMCk7XG4gICAgY29uc3QgcHJnRW5kID0gcHJnU3RhcnQgKyBwcmdTaXplO1xuICAgIHRoaXMucHJnID0gcm9tLnN1YmFycmF5KHByZ1N0YXJ0LCBwcmdFbmQpO1xuICAgIHRoaXMuY2hyID0gcm9tLnN1YmFycmF5KHByZ0VuZCk7XG5cbiAgICB0aGlzLnNob3BDb3VudCA9IFJvbS5TSE9QX0NPVU5ULmdldChyb20pO1xuICAgIHRoaXMuc2NhbGluZ0xldmVscyA9IFJvbS5TQ0FMSU5HX0xFVkVMUy5nZXQocm9tKTtcbiAgICB0aGlzLnVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3MgPSBSb20uVU5JUVVFX0lURU1fVEFCTEUuZ2V0KHJvbSk7XG4gICAgdGhpcy5zaG9wRGF0YVRhYmxlc0FkZHJlc3MgPSBSb20uU0hPUF9EQVRBX1RBQkxFUy5nZXQocm9tKTtcbiAgICB0aGlzLnRlbGVwYXRoeVRhYmxlc0FkZHJlc3MgPSBSb20uVEVMRVBBVEhZX1RBQkxFUy5nZXQocm9tKTtcbiAgICB0aGlzLm9taXRJdGVtR2V0RGF0YVN1ZmZpeCA9IFJvbS5PTUlUX0lURU1fR0VUX0RBVEFfU1VGRklYLmdldChyb20pO1xuICAgIHRoaXMub21pdExvY2FsRGlhbG9nU3VmZml4ID0gUm9tLk9NSVRfTE9DQUxfRElBTE9HX1NVRkZJWC5nZXQocm9tKTtcbiAgICB0aGlzLmNvbXByZXNzZWRNYXBEYXRhID0gUm9tLkNPTVBSRVNTRURfTUFQREFUQS5nZXQocm9tKTtcblxuICAgIC8vIGlmIChjcmMzMihyb20pID09PSBFWFBFQ1RFRF9DUkMzMikge1xuICAgIGZvciAoY29uc3QgW2FkZHJlc3MsIG9sZCwgdmFsdWVdIG9mIEFESlVTVE1FTlRTKSB7XG4gICAgICBpZiAodGhpcy5wcmdbYWRkcmVzc10gPT09IG9sZCkgdGhpcy5wcmdbYWRkcmVzc10gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBMb2FkIHVwIGEgYnVuY2ggb2YgZGF0YSB0YWJsZXMuICBUaGlzIHdpbGwgaW5jbHVkZSBhIGxhcmdlIG51bWJlciBvZiB0aGVcbiAgICAvLyBkYXRhIHRhYmxlcyBpbiB0aGUgUk9NLiAgVGhlIGlkZWEgaXMgdGhhdCB3ZSBjYW4gZWRpdCB0aGUgYXJyYXlzIGxvY2FsbHlcbiAgICAvLyBhbmQgdGhlbiBoYXZlIGEgXCJjb21taXRcIiBmdW5jdGlvbiB0aGF0IHJlYnVpbGRzIHRoZSBST00gd2l0aCB0aGUgbmV3XG4gICAgLy8gYXJyYXlzLiAgV2UgbWF5IG5lZWQgdG8gd3JpdGUgYSBcInBhZ2VkIGFsbG9jYXRvclwiIHRoYXQgY2FuIGFsbG9jYXRlXG4gICAgLy8gY2h1bmtzIG9mIFJPTSBpbiBhIGdpdmVuIHBhZ2UuICBQcm9iYWJseSB3YW50IHRvIHVzZSBhIGdyZWVkeSBhbGdvcml0aG1cbiAgICAvLyB3aGVyZSB3ZSBzdGFydCB3aXRoIHRoZSBiaWdnZXN0IGNodW5rIGFuZCBwdXQgaXQgaW4gdGhlIHNtYWxsZXN0IHNwb3RcbiAgICAvLyB0aGF0IGZpdHMgaXQuICBQcmVzdW1hYmx5IHdlIGtub3cgdGhlIHNpemVzIHVwIGZyb250IGV2ZW4gYmVmb3JlIHdlIGhhdmVcbiAgICAvLyBhbGwgdGhlIGFkZHJlc3Nlcywgc28gd2UgY291bGQgZG8gYWxsIHRoZSBhbGxvY2F0aW9uIGF0IG9uY2UgLSBwcm9iYWJseVxuICAgIC8vIHJldHVybmluZyBhIHRva2VuIGZvciBlYWNoIGFsbG9jYXRpb24gYW5kIHRoZW4gYWxsIHRva2VucyBnZXQgZmlsbGVkIGluXG4gICAgLy8gYXQgb25jZSAoYWN0dWFsIHByb21pc2VzIHdvdWxkIGJlIG1vcmUgdW53ZWlsZHkpLlxuICAgIC8vIFRyaWNreSAtIHdoYXQgYWJvdXQgc2hhcmVkIGVsZW1lbnRzIG9mIGRhdGEgdGFibGVzIC0gd2UgcHVsbCB0aGVtXG4gICAgLy8gc2VwYXJhdGVseSwgYnV0IHdlJ2xsIG5lZWQgdG8gcmUtY29hbGVzY2UgdGhlbS4gIEJ1dCB0aGlzIHJlcXVpcmVzXG4gICAgLy8ga25vd2luZyB0aGVpciBjb250ZW50cyBCRUZPUkUgYWxsb2NhdGluZyB0aGVpciBzcGFjZS4gIFNvIHdlIG5lZWQgdHdvXG4gICAgLy8gYWxsb2NhdGUgbWV0aG9kcyAtIG9uZSB3aGVyZSB0aGUgY29udGVudCBpcyBrbm93biBhbmQgb25lIHdoZXJlIG9ubHkgdGhlXG4gICAgLy8gbGVuZ3RoIGlzIGtub3duLlxuICAgIHRoaXMudGlsZXNldHMgPSBuZXcgVGlsZXNldHModGhpcyk7XG4gICAgdGhpcy50aWxlRWZmZWN0cyA9IHNlcSgxMSwgaSA9PiBuZXcgVGlsZUVmZmVjdHModGhpcywgaSArIDB4YjMpKTtcbiAgICB0aGlzLnNjcmVlbnMgPSBuZXcgU2NyZWVucyh0aGlzKTtcbiAgICB0aGlzLm1ldGF0aWxlc2V0cyA9IG5ldyBNZXRhdGlsZXNldHModGhpcyk7XG4gICAgdGhpcy5tZXRhc2NyZWVucyA9IG5ldyBNZXRhc2NyZWVucyh0aGlzKTtcbiAgICB0aGlzLnRyaWdnZXJzID0gc2VxKDB4NDMsIGkgPT4gbmV3IFRyaWdnZXIodGhpcywgMHg4MCB8IGkpKTtcbiAgICB0aGlzLnBhdHRlcm5zID0gbmV3IFBhdHRlcm5zKHRoaXMpO1xuICAgIHRoaXMucGFsZXR0ZXMgPSBzZXEoMHgxMDAsIGkgPT4gbmV3IFBhbGV0dGUodGhpcywgaSkpO1xuICAgIHRoaXMubG9jYXRpb25zID0gbmV3IExvY2F0aW9ucyh0aGlzKTtcbiAgICB0aGlzLnRpbGVBbmltYXRpb25zID0gc2VxKDQsIGkgPT4gbmV3IFRpbGVBbmltYXRpb24odGhpcywgaSkpO1xuICAgIHRoaXMuaGl0Ym94ZXMgPSBzZXEoMjQsIGkgPT4gbmV3IEhpdGJveCh0aGlzLCBpKSk7XG4gICAgdGhpcy5vYmplY3RBY3Rpb25zID0gbmV3IE9iamVjdEFjdGlvbnModGhpcyk7XG4gICAgdGhpcy5vYmplY3RzID0gbmV3IE9iamVjdHModGhpcyk7XG4gICAgdGhpcy5hZEhvY1NwYXducyA9IHNlcSgweDYwLCBpID0+IG5ldyBBZEhvY1NwYXduKHRoaXMsIGkpKTtcbiAgICB0aGlzLm1ldGFzcHJpdGVzID0gc2VxKDB4MTAwLCBpID0+IG5ldyBNZXRhc3ByaXRlKHRoaXMsIGkpKTtcbiAgICB0aGlzLm1lc3NhZ2VzID0gbmV3IE1lc3NhZ2VzKHRoaXMpO1xuICAgIHRoaXMudGVsZXBhdGh5ID0gbmV3IFRlbGVwYXRoeSh0aGlzKTtcbiAgICB0aGlzLml0ZW1HZXRzID0gbmV3IEl0ZW1HZXRzKHRoaXMpO1xuICAgIHRoaXMuaXRlbXMgPSBuZXcgSXRlbXModGhpcyk7XG4gICAgdGhpcy5zaG9wcyA9IG5ldyBTaG9wcyh0aGlzKTsgLy8gTk9URTogZGVwZW5kcyBvbiBsb2NhdGlvbnMgYW5kIG9iamVjdHNcbiAgICB0aGlzLnNsb3RzID0gbmV3IFNsb3RzKHRoaXMpO1xuICAgIHRoaXMubnBjcyA9IG5ldyBOcGNzKHRoaXMpO1xuICAgIHRoaXMuYm9zc0tpbGxzID0gc2VxKDB4ZSwgaSA9PiBuZXcgQm9zc0tpbGwodGhpcywgaSkpO1xuICAgIHRoaXMud2lsZFdhcnAgPSBuZXcgV2lsZFdhcnAodGhpcyk7XG4gICAgdGhpcy50b3duV2FycCA9IG5ldyBUb3duV2FycCh0aGlzKTtcbiAgICB0aGlzLmNvaW5Ecm9wcyA9IG5ldyBDb2luRHJvcHModGhpcyk7XG4gICAgdGhpcy5mbGFncyA9IG5ldyBGbGFncyh0aGlzKTtcbiAgICB0aGlzLmJvc3NlcyA9IG5ldyBCb3NzZXModGhpcyk7IC8vIE5PVEU6IG11c3QgYmUgYWZ0ZXIgTnBjcyBhbmQgRmxhZ3NcbiAgICB0aGlzLnNjYWxpbmcgPSBuZXcgU2NhbGluZyh0aGlzKTtcbiAgICB0aGlzLnJhbmRvbU51bWJlcnMgPSBuZXcgUmFuZG9tTnVtYmVycyh0aGlzKTtcblxuICAgIC8vIC8vIFRPRE8gLSBjb25zaWRlciBwb3B1bGF0aW5nIHRoaXMgbGF0ZXI/XG4gICAgLy8gLy8gSGF2aW5nIHRoaXMgYXZhaWxhYmxlIG1ha2VzIGl0IGVhc2llciB0byBzZXQgZXhpdHMsIGV0Yy5cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKGxvYy51c2VkKSBsb2MubGF6eUluaXRpYWxpemF0aW9uKCk7IC8vIHRyaWdnZXIgdGhlIGdldHRlclxuICAgIH1cbiAgfVxuXG4gIHRyaWdnZXIoaWQ6IG51bWJlcik6IFRyaWdnZXIge1xuICAgIGlmIChpZCA8IDB4ODAgfHwgaWQgPiAweGZmKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCB0cmlnZ2VyIGlkICQke2hleChpZCl9YCk7XG4gICAgcmV0dXJuIHRoaXMudHJpZ2dlcnNbaWQgJiAweDdmXTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBjcm9zcy1yZWZlcmVuY2UgbW9uc3RlcnMvbWV0YXNwcml0ZXMvbWV0YXRpbGVzL3NjcmVlbnMgd2l0aCBwYXR0ZXJucy9wYWxldHRlc1xuICAvLyBnZXQgbW9uc3RlcnMoKTogT2JqZWN0RGF0YVtdIHtcbiAgLy8gICBjb25zdCBtb25zdGVycyA9IG5ldyBTZXQ8T2JqZWN0RGF0YT4oKTtcbiAgLy8gICBmb3IgKGNvbnN0IGwgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgLy8gICAgIGlmICghbC51c2VkIHx8ICFsLmhhc1NwYXducykgY29udGludWU7XG4gIC8vICAgICBmb3IgKGNvbnN0IG8gb2YgbC5zcGF3bnMpIHtcbiAgLy8gICAgICAgaWYgKG8uaXNNb25zdGVyKCkpIG1vbnN0ZXJzLmFkZCh0aGlzLm9iamVjdHNbby5tb25zdGVySWRdKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIFsuLi5tb25zdGVyc10uc29ydCgoeCwgeSkgPT4gKHguaWQgLSB5LmlkKSk7XG4gIC8vIH1cblxuICBnZXQgcHJvamVjdGlsZXMoKTogT2JqZWN0RGF0YVtdIHtcbiAgICBjb25zdCBwcm9qZWN0aWxlcyA9IG5ldyBTZXQ8T2JqZWN0RGF0YT4oKTtcbiAgICBmb3IgKGNvbnN0IG0gb2YgdGhpcy5vYmplY3RzLmZpbHRlcihvID0+IG8gaW5zdGFuY2VvZiBNb25zdGVyKSkge1xuICAgICAgaWYgKG0uY2hpbGQpIHtcbiAgICAgICAgcHJvamVjdGlsZXMuYWRkKHRoaXMub2JqZWN0c1t0aGlzLmFkSG9jU3Bhd25zW20uY2hpbGRdLm9iamVjdElkXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbLi4ucHJvamVjdGlsZXNdLnNvcnQoKHgsIHkpID0+ICh4LmlkIC0geS5pZCkpO1xuICB9XG5cbiAgZ2V0IG1vbnN0ZXJHcmFwaGljcygpIHtcbiAgICBjb25zdCBnZng6IHtbaWQ6IHN0cmluZ106XG4gICAgICAgICAgICAgICAge1tpbmZvOiBzdHJpbmddOlxuICAgICAgICAgICAgICAgICB7c2xvdDogbnVtYmVyLCBwYXQ6IG51bWJlciwgcGFsOiBudW1iZXJ9fX0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGwgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghbC51c2VkIHx8ICFsLmhhc1NwYXducykgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IG8gb2YgbC5zcGF3bnMpIHtcbiAgICAgICAgaWYgKCEoby5kYXRhWzJdICYgNykpIHtcbiAgICAgICAgICBjb25zdCBzbG90ID0gby5kYXRhWzJdICYgMHg4MCA/IDEgOiAwO1xuICAgICAgICAgIGNvbnN0IGlkID0gaGV4KG8uZGF0YVszXSArIDB4NTApO1xuICAgICAgICAgIGNvbnN0IGRhdGEgPSBnZnhbaWRdID0gZ2Z4W2lkXSB8fCB7fTtcbiAgICAgICAgICBkYXRhW2Ake3Nsb3R9OiR7bC5zcHJpdGVQYXR0ZXJuc1tzbG90XS50b1N0cmluZygxNil9OiR7XG4gICAgICAgICAgICAgICBsLnNwcml0ZVBhbGV0dGVzW3Nsb3RdLnRvU3RyaW5nKDE2KX1gXVxuICAgICAgICAgICAgPSB7cGFsOiBsLnNwcml0ZVBhbGV0dGVzW3Nsb3RdLFxuICAgICAgICAgICAgICAgcGF0OiBsLnNwcml0ZVBhdHRlcm5zW3Nsb3RdLFxuICAgICAgICAgICAgICAgc2xvdCxcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZ2Z4O1xuICB9XG5cbiAgZ2V0IGxvY2F0aW9uTW9uc3RlcnMoKSB7XG4gICAgY29uc3QgbToge1tpZDogc3RyaW5nXToge1tpbmZvOiBzdHJpbmddOiBudW1iZXJ9fSA9IHt9O1xuICAgIGZvciAoY29uc3QgbCBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKCFsLnVzZWQgfHwgIWwuaGFzU3Bhd25zKSBjb250aW51ZTtcbiAgICAgIC8vIHdoaWNoIG1vbnN0ZXJzIGFyZSBpbiB3aGljaCBzbG90cz9cbiAgICAgIGNvbnN0IHM6IHtbaW5mbzogc3RyaW5nXTogbnVtYmVyfSA9IG1bJyQnICsgaGV4KGwuaWQpXSA9IHt9O1xuICAgICAgZm9yIChjb25zdCBvIG9mIGwuc3Bhd25zKSB7XG4gICAgICAgIGlmICghKG8uZGF0YVsyXSAmIDcpKSB7XG4gICAgICAgICAgY29uc3Qgc2xvdCA9IG8uZGF0YVsyXSAmIDB4ODAgPyAxIDogMDtcbiAgICAgICAgICBjb25zdCBpZCA9IG8uZGF0YVszXSArIDB4NTA7XG4gICAgICAgICAgc1tgJHtzbG90fToke2lkLnRvU3RyaW5nKDE2KX1gXSA9XG4gICAgICAgICAgICAgIChzW2Ake3Nsb3R9OiR7aWQudG9TdHJpbmcoMTYpfWBdIHx8IDApICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBmb3IgZWFjaCBzcHJpdGUgcGF0dGVybiB0YWJsZSwgZmluZCBhbGwgdGhlIHBhbGV0dGVzIHRoYXQgaXQgdXNlcy5cbiAgLy8gRmluZCBhbGwgdGhlIG1vbnN0ZXJzIG9uIGl0LiAgV2UgY2FuIHByb2JhYmx5IGFsbG93IGFueSBwYWxldHRlIHNvIGxvbmdcbiAgLy8gYXMgb25lIG9mIHRoZSBwYWxldHRlcyBpcyB1c2VkIHdpdGggdGhhdCBwYXR0ZXJuLlxuICAvLyBUT0RPIC0gbWF4IG51bWJlciBvZiBpbnN0YW5jZXMgb2YgYSBtb25zdGVyIG9uIGFueSBtYXAgLSBpLmUuIGF2b2lkIGhhdmluZ1xuICAvLyBmaXZlIGZseWVycyBvbiB0aGUgc2FtZSBtYXAhXG5cbiAgLy8gNDYwIC0gMCBtZWFucyBlaXRoZXIgZmx5ZXIgb3Igc3RhdGlvbmFyeVxuICAvLyAgICAgICAgICAgLSBzdGF0aW9uYXJ5IGhhcyA0YTAgfiAyMDQsMjA1LDIwNlxuICAvLyAgICAgICAgICAgICAoa3Jha2VuLCBzd2FtcCBwbGFudCwgc29yY2Vyb3IpXG4gIC8vICAgICAgIDYgLSBtaW1pY1xuICAvLyAgICAgICAxZiAtIHN3aW1tZXJcbiAgLy8gICAgICAgNTQgLSB0b21hdG8gYW5kIGJpcmRcbiAgLy8gICAgICAgNTUgLSBzd2ltbWVyXG4gIC8vICAgICAgIDU3IC0gbm9ybWFsXG4gIC8vICAgICAgIDVmIC0gYWxzbyBub3JtYWwsIGJ1dCBtZWR1c2EgaGVhZCBpcyBmbHllcj9cbiAgLy8gICAgICAgNzcgLSBzb2xkaWVycywgaWNlIHpvbWJpZVxuXG4vLyAgIC8vIERvbid0IHdvcnJ5IGFib3V0IG90aGVyIGRhdGFzIHlldFxuLy8gICB3cml0ZU9iamVjdERhdGEoKSB7XG4vLyAgICAgLy8gYnVpbGQgdXAgYSBtYXAgZnJvbSBhY3R1YWwgZGF0YSB0byBpbmRleGVzIHRoYXQgcG9pbnQgdG8gaXRcbi8vICAgICBsZXQgYWRkciA9IDB4MWFlMDA7XG4vLyAgICAgY29uc3QgZGF0YXMgPSB7fTtcbi8vICAgICBmb3IgKGNvbnN0IG9iamVjdCBvZiB0aGlzLm9iamVjdHMpIHtcbi8vICAgICAgIGNvbnN0IHNlciA9IG9iamVjdC5zZXJpYWxpemUoKTtcbi8vICAgICAgIGNvbnN0IGRhdGEgPSBzZXIuam9pbignICcpO1xuLy8gICAgICAgaWYgKGRhdGEgaW4gZGF0YXMpIHtcbi8vIC8vY29uc29sZS5sb2coYCQke29iamVjdC5pZC50b1N0cmluZygxNikucGFkU3RhcnQoMiwwKX06IFJldXNpbmcgZXhpc3RpbmcgZGF0YSAkJHtkYXRhc1tkYXRhXS50b1N0cmluZygxNil9YCk7XG4vLyAgICAgICAgIG9iamVjdC5vYmplY3REYXRhQmFzZSA9IGRhdGFzW2RhdGFdO1xuLy8gICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgb2JqZWN0Lm9iamVjdERhdGFCYXNlID0gYWRkcjtcbi8vICAgICAgICAgZGF0YXNbZGF0YV0gPSBhZGRyO1xuLy8gLy9jb25zb2xlLmxvZyhgJCR7b2JqZWN0LmlkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLDApfTogRGF0YSBpcyBhdCAkJHtcbi8vIC8vICAgICAgICAgICAgIGFkZHIudG9TdHJpbmcoMTYpfTogJHtBcnJheS5mcm9tKHNlciwgeD0+JyQnK3gudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsMCkpLmpvaW4oJywnKX1gKTtcbi8vICAgICAgICAgYWRkciArPSBzZXIubGVuZ3RoO1xuLy8gLy8gc2VlZCAzNTE3ODExMDM2XG4vLyAgICAgICB9XG4vLyAgICAgICBvYmplY3Qud3JpdGUoKTtcbi8vICAgICB9XG4vLyAvL2NvbnNvbGUubG9nKGBXcm90ZSBvYmplY3QgZGF0YSBmcm9tICQxYWMwMCB0byAkJHthZGRyLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg1LCAwKVxuLy8gLy8gICAgICAgICAgICAgfSwgc2F2aW5nICR7MHgxYmU5MSAtIGFkZHJ9IGJ5dGVzLmApO1xuLy8gICAgIHJldHVybiBhZGRyO1xuLy8gICB9XG5cbiAgYXNzZW1ibGVyKCk6IEFzc2VtYmxlciB7XG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIHNldHRpbmcgYSBzZWdtZW50IHByZWZpeFxuICAgIHJldHVybiBuZXcgQXNzZW1ibGVyKCk7XG4gIH1cblxuICB3cml0ZURhdGEoZGF0YSA9IHRoaXMucHJnKSB7XG4gICAgLy8gV3JpdGUgdGhlIG9wdGlvbnMgZmlyc3RcbiAgICAvLyBjb25zdCB3cml0ZXIgPSBuZXcgV3JpdGVyKHRoaXMuY2hyKTtcbiAgICAvLyB3cml0ZXIubW9kdWxlcy5wdXNoKC4uLnRoaXMubW9kdWxlcyk7XG4gICAgLy8gTWFwRGF0YVxuICAgIC8vd3JpdGVyLmFsbG9jKDB4MTQ0ZjgsIDB4MTdlMDApO1xuICAgIC8vIE5wY0RhdGFcbiAgICAvLyBOT1RFOiAxOTNmOSBpcyBhc3N1bWluZyAkZmIgaXMgdGhlIGxhc3QgbG9jYXRpb24gSUQuICBJZiB3ZSBhZGQgbW9yZSBsb2NhdGlvbnMgYXRcbiAgICAvLyB0aGUgZW5kIHRoZW4gd2UnbGwgbmVlZCB0byBwdXNoIHRoaXMgYmFjayBhIGZldyBtb3JlIGJ5dGVzLiAgV2UgY291bGQgcG9zc2libHlcbiAgICAvLyBkZXRlY3QgdGhlIGJhZCB3cml0ZSBhbmQgdGhyb3cgYW4gZXJyb3IsIGFuZC9vciBjb21wdXRlIHRoZSBtYXggbG9jYXRpb24gSUQuXG4gICAgLy93cml0ZXIuYWxsb2MoMHgxOTNmOSwgMHgxYWMwMCk7XG4gICAgLy8gT2JqZWN0RGF0YSAoaW5kZXggYXQgMWFjMDAuLjFhZTAwKVxuICAgIC8vd3JpdGVyLmFsbG9jKDB4MWFlMDAsIDB4MWJkMDApOyAvLyBzYXZlIDUxMiBieXRlcyBhdCBlbmQgZm9yIHNvbWUgZXh0cmEgY29kZVxuICAgIGNvbnN0IGEgPSB0aGlzLmFzc2VtYmxlcigpO1xuICAgIC8vIE5wY1NwYXduQ29uZGl0aW9uc1xuICAgIGZyZWUoYSwgJDBlLCAweDg3N2EsIDB4ODk1ZCk7XG4gICAgLy8gTnBjRGlhbG9nXG4gICAgZnJlZShhLCAkMGUsIDB4OGFlNSwgMHg5OGY0KTtcbiAgICAvLyBJdGVtR2V0RGF0YSAodG8gMWUwNjUpICsgSXRlbVVzZURhdGFcbiAgICBmcmVlKGEsICQwZSwgMHg5ZGU2LCAweGEwMDApO1xuICAgIGZyZWUoYSwgJDBmLCAweGEwMDAsIDB4YTEwNik7XG4gICAgLy8gVHJpZ2dlckRhdGFcbiAgICAvLyBOT1RFOiBUaGVyZSdzIHNvbWUgZnJlZSBzcGFjZSBhdCAxZTNjMC4uMWUzZjAsIGJ1dCB3ZSB1c2UgdGhpcyBmb3IgdGhlXG4gICAgLy8gQ2hlY2tCZWxvd0Jvc3MgdHJpZ2dlcnMuXG4gICAgZnJlZShhLCAkMGYsIDB4YTIwMCwgMHhhM2MwKTtcbiAgICAvLyBJdGVtTWVudU5hbWVcbiAgICBmcmVlKGEsICQxMCwgMHg5MTFhLCAweDk0NjgpO1xuICAgIC8vIGtlZXAgaXRlbSAkNDkgXCIgICAgICAgIFwiIHdoaWNoIGlzIGFjdHVhbGx5IHVzZWQgc29tZXdoZXJlP1xuICAgIC8vIHdyaXRlci5hbGxvYygweDIxNDcxLCAweDIxNGYxKTsgLy8gVE9ETyAtIGRvIHdlIG5lZWQgYW55IG9mIHRoaXM/XG4gICAgLy8gSXRlbU1lc3NhZ2VOYW1lXG4gICAgLy8gd3JpdGVyLmFsbG9jKDB4MjhlODEsIDB4MjkyMmIpOyAvLyBOT1RFOiB1bmNvdmVyZWQgdGhydSAyOTQwMFxuICAgIC8vIHdyaXRlci5hbGxvYygweDI5MjJiLCAweDI5NDAwKTsgLy8gVE9ETyAtIG5lZWRlZD9cbiAgICAvLyBOT1RFOiBvbmNlIHdlIHJlbGVhc2UgdGhlIG90aGVyIG1lc3NhZ2UgdGFibGVzLCB0aGlzIHdpbGwganVzdCBiZSBvbmUgZ2lhbnQgYmxvY2suXG5cbiAgICAvLyBNZXNzYWdlIHRhYmxlIHBhcnRzXG4gICAgLy8gd3JpdGVyLmFsbG9jKDB4MjgwMDAsIDB4MjgzZmUpO1xuICAgIC8vIE1lc3NhZ2UgdGFibGVzXG4gICAgLy8gVE9ETyAtIHdlIGRvbid0IHVzZSB0aGUgd3JpdGVyIHRvIGFsbG9jYXRlIHRoZSBhYmJyZXZpYXRpb24gdGFibGVzLCBidXQgd2UgY291bGRcbiAgICAvL3dyaXRlci5mcmVlKCcweDJhMDAwLCAweDJmYzAwKTtcblxuICAgIC8vIGlmICh0aGlzLnRlbGVwYXRoeVRhYmxlc0FkZHJlc3MpIHtcbiAgICAvLyAgIHdyaXRlci5hbGxvYygweDFkOGY0LCAweDFkYjAwKTsgLy8gbG9jYXRpb24gdGFibGUgYWxsIHRoZSB3YXkgdGhydSBtYWluXG4gICAgLy8gfSBlbHNlIHtcbiAgICAvLyAgIHdyaXRlci5hbGxvYygweDFkYTRjLCAweDFkYjAwKTsgLy8gZXhpc3RpbmcgbWFpbiB0YWJsZSBpcyBoZXJlLlxuICAgIC8vIH1cblxuICAgIGNvbnN0IG1vZHVsZXMgPSBbLi4udGhpcy5tb2R1bGVzLCBhLm1vZHVsZSgpXTtcbiAgICBjb25zdCB3cml0ZUFsbCA9ICh3cml0YWJsZXM6IEl0ZXJhYmxlPHt3cml0ZSgpOiBNb2R1bGVbXX0+KSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IHcgb2Ygd3JpdGFibGVzKSB7XG4gICAgICAgIG1vZHVsZXMucHVzaCguLi53LndyaXRlKCkpO1xuICAgICAgfVxuICAgIH07XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMubG9jYXRpb25zLndyaXRlKCkpO1xuICAgIHdyaXRlQWxsKHRoaXMub2JqZWN0cyk7XG4gICAgd3JpdGVBbGwodGhpcy5oaXRib3hlcyk7XG4gICAgd3JpdGVBbGwodGhpcy50cmlnZ2Vycyk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMubnBjcy53cml0ZSgpKTtcbiAgICB3cml0ZUFsbCh0aGlzLnRpbGVzZXRzKTtcbiAgICB3cml0ZUFsbCh0aGlzLnRpbGVFZmZlY3RzKTtcbiAgICB3cml0ZUFsbCh0aGlzLmFkSG9jU3Bhd25zKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5pdGVtR2V0cy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5zbG90cy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5pdGVtcy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5zaG9wcy53cml0ZSgpKTtcbiAgICB3cml0ZUFsbCh0aGlzLmJvc3NLaWxscyk7XG4gICAgd3JpdGVBbGwodGhpcy5wYXR0ZXJucyk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMud2lsZFdhcnAud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMudG93bldhcnAud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuY29pbkRyb3BzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnNjYWxpbmcud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuYm9zc2VzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnJhbmRvbU51bWJlcnMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMudGVsZXBhdGh5LndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLm1lc3NhZ2VzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnNjcmVlbnMud3JpdGUoKSk7XG5cbiAgICAvLyBSZXNlcnZlIHRoZSBnbG9iYWwgc3BhY2UgMTQyYzAuLi4xNDJmMCA/Pz9cbiAgICAvLyBjb25zdCB0aGlzLmFzc2VtYmxlcigpLlxuXG4gICAgY29uc3QgbGlua2VyID0gbmV3IExpbmtlcigpO1xuICAgIGxpbmtlci5iYXNlKHRoaXMucHJnLCAwKTtcbiAgICBmb3IgKGNvbnN0IG0gb2YgbW9kdWxlcykge1xuICAgICAgbGlua2VyLnJlYWQobSk7XG4gICAgfVxuICAgIGNvbnN0IG91dCA9IGxpbmtlci5saW5rKCk7XG4gICAgb3V0LmFwcGx5KGRhdGEpO1xuICAgIGlmIChkYXRhICE9PSB0aGlzLnByZykgcmV0dXJuOyAvLyBUT0RPIC0gY2xlYW4gdGhpcyB1cFxuICAgIC8vbGlua2VyLnJlcG9ydCgpO1xuICAgIGNvbnN0IGV4cG9ydHMgPSBsaW5rZXIuZXhwb3J0cygpO1xuXG4gICAgXG4gICAgdGhpcy51bmlxdWVJdGVtVGFibGVBZGRyZXNzID0gZXhwb3J0cy5nZXQoJ0tleUl0ZW1EYXRhJykhLm9mZnNldCE7XG4gICAgdGhpcy5zaG9wQ291bnQgPSAxMTtcbiAgICB0aGlzLnNob3BEYXRhVGFibGVzQWRkcmVzcyA9IGV4cG9ydHMuZ2V0KCdTaG9wRGF0YScpPy5vZmZzZXQgfHwgMDtcbiAgICAvLyBEb24ndCBpbmNsdWRlIHRoZXNlIGluIHRoZSBsaW5rZXI/Pz9cbiAgICBSb20uU0hPUF9DT1VOVC5zZXQodGhpcy5wcmcsIHRoaXMuc2hvcENvdW50KTtcbiAgICBSb20uU0NBTElOR19MRVZFTFMuc2V0KHRoaXMucHJnLCB0aGlzLnNjYWxpbmdMZXZlbHMpO1xuICAgIFJvbS5VTklRVUVfSVRFTV9UQUJMRS5zZXQodGhpcy5wcmcsIHRoaXMudW5pcXVlSXRlbVRhYmxlQWRkcmVzcyk7XG4gICAgUm9tLlNIT1BfREFUQV9UQUJMRVMuc2V0KHRoaXMucHJnLCB0aGlzLnNob3BEYXRhVGFibGVzQWRkcmVzcyB8fCAwKTtcbiAgICBSb20uT01JVF9JVEVNX0dFVF9EQVRBX1NVRkZJWC5zZXQodGhpcy5wcmcsIHRoaXMub21pdEl0ZW1HZXREYXRhU3VmZml4KTtcbiAgICBSb20uT01JVF9MT0NBTF9ESUFMT0dfU1VGRklYLnNldCh0aGlzLnByZywgdGhpcy5vbWl0TG9jYWxEaWFsb2dTdWZmaXgpO1xuICAgIFJvbS5DT01QUkVTU0VEX01BUERBVEEuc2V0KHRoaXMucHJnLCB0aGlzLmNvbXByZXNzZWRNYXBEYXRhKTtcbiAgfVxuXG4gIGFuYWx5emVUaWxlcygpIHtcbiAgICAvLyBGb3IgYW55IGdpdmVuIHRpbGUgaW5kZXgsIHdoYXQgc2NyZWVucyBkb2VzIGl0IGFwcGVhciBvbi5cbiAgICAvLyBGb3IgdGhvc2Ugc2NyZWVucywgd2hpY2ggdGlsZXNldHMgZG9lcyAqaXQqIGFwcGVhciBvbi5cbiAgICAvLyBUaGF0IHRpbGUgSUQgaXMgbGlua2VkIGFjcm9zcyBhbGwgdGhvc2UgdGlsZXNldHMuXG4gICAgLy8gRm9ybXMgYSBwYXJ0aXRpb25pbmcgZm9yIGVhY2ggdGlsZSBJRCA9PiB1bmlvbi1maW5kLlxuICAgIC8vIEdpdmVuIHRoaXMgcGFydGl0aW9uaW5nLCBpZiBJIHdhbnQgdG8gbW92ZSBhIHRpbGUgb24gYSBnaXZlblxuICAgIC8vIHRpbGVzZXQsIGFsbCBJIG5lZWQgdG8gZG8gaXMgZmluZCBhbm90aGVyIHRpbGUgSUQgd2l0aCB0aGVcbiAgICAvLyBzYW1lIHBhcnRpdGlvbiBhbmQgc3dhcCB0aGVtP1xuXG4gICAgLy8gTW9yZSBnZW5lcmFsbHksIHdlIGNhbiBqdXN0IHBhcnRpdGlvbiB0aGUgdGlsZXNldHMuXG5cbiAgICAvLyBGb3IgZWFjaCBzY3JlZW4sIGZpbmQgYWxsIHRpbGVzZXRzIFQgZm9yIHRoYXQgc2NyZWVuXG4gICAgLy8gVGhlbiBmb3IgZWFjaCB0aWxlIG9uIHRoZSBzY3JlZW4sIHVuaW9uIFQgZm9yIHRoYXQgdGlsZS5cblxuICAgIC8vIEdpdmVuIGEgdGlsZXNldCBhbmQgYSBtZXRhdGlsZSBJRCwgZmluZCBhbGwgdGhlIHNjcmVlbnMgdGhhdCAoMSkgYXJlIHJlbmRlcmVkXG4gICAgLy8gd2l0aCB0aGF0IHRpbGVzZXQsIGFuZCAoYikgdGhhdCBjb250YWluIHRoYXQgbWV0YXRpbGU7IHRoZW4gZmluZCBhbGwgKm90aGVyKlxuICAgIC8vIHRpbGVzZXRzIHRoYXQgdGhvc2Ugc2NyZWVucyBhcmUgZXZlciByZW5kZXJlZCB3aXRoLlxuXG4gICAgLy8gR2l2ZW4gYSBzY3JlZW4sIGZpbmQgYWxsIGF2YWlsYWJsZSBtZXRhdGlsZSBJRHMgdGhhdCBjb3VsZCBiZSBhZGRlZCB0byBpdFxuICAgIC8vIHdpdGhvdXQgY2F1c2luZyBwcm9ibGVtcyB3aXRoIG90aGVyIHNjcmVlbnMgdGhhdCBzaGFyZSBhbnkgdGlsZXNldHMuXG4gICAgLy8gIC0+IHVudXNlZCAob3IgdXNlZCBidXQgc2hhcmVkIGV4Y2x1c2l2ZWx5KSBhY3Jvc3MgYWxsIHRpbGVzZXRzIHRoZSBzY3JlZW4gbWF5IHVzZVxuXG4gICAgLy8gV2hhdCBJIHdhbnQgZm9yIHN3YXBwaW5nIGlzIHRoZSBmb2xsb3dpbmc6XG4gICAgLy8gIDEuIGZpbmQgYWxsIHNjcmVlbnMgSSB3YW50IHRvIHdvcmsgb24gPT4gdGlsZXNldHNcbiAgICAvLyAgMi4gZmluZCB1bnVzZWQgZmxhZ2dhYmJsZSB0aWxlcyBpbiB0aGUgaGFyZGVzdCBvbmUsXG4gICAgLy8gICAgIHdoaWNoIGFyZSBhbHNvIElTT0xBVEVEIGluIHRoZSBvdGhlcnMuXG4gICAgLy8gIDMuIHdhbnQgdGhlc2UgdGlsZXMgdG8gYmUgdW51c2VkIGluIEFMTCByZWxldmFudCB0aWxlc2V0c1xuICAgIC8vICA0LiB0byBtYWtlIHRoaXMgc28sIGZpbmQgKm90aGVyKiB1bnVzZWQgZmxhZ2dhYmxlIHRpbGVzIGluIG90aGVyIHRpbGVzZXRzXG4gICAgLy8gIDUuIHN3YXAgdGhlIHVudXNlZCB3aXRoIHRoZSBpc29sYXRlZCB0aWxlcyBpbiB0aGUgb3RoZXIgdGlsZXNldHNcblxuICAgIC8vIENhdmVzOlxuICAgIC8vICAwYTogICAgICA5MCAvIDljXG4gICAgLy8gIDE1OiA4MCAvIDkwIC8gOWNcbiAgICAvLyAgMTk6ICAgICAgOTAgICAgICAod2lsbCBhZGQgdG8gODA/KVxuICAgIC8vICAzZTogICAgICA5MFxuICAgIC8vXG4gICAgLy8gSWRlYWxseSB3ZSBjb3VsZCByZXVzZSA4MCdzIDEvMi8zLzQgZm9yIHRoaXNcbiAgICAvLyAgMDE6IDkwIHwgOTQgOWNcbiAgICAvLyAgMDI6IDkwIHwgOTQgOWNcbiAgICAvLyAgMDM6ICAgICAgOTQgOWNcbiAgICAvLyAgMDQ6IDkwIHwgOTQgOWNcbiAgICAvL1xuICAgIC8vIE5lZWQgNCBvdGhlciBmbGFnZ2FibGUgdGlsZSBpbmRpY2VzIHdlIGNhbiBzd2FwIHRvP1xuICAgIC8vICAgOTA6ID0+ICgxLDIgbmVlZCBmbGFnZ2FibGU7IDMgdW51c2VkOyA0IGFueSkgPT4gMDcsIDBlLCAxMCwgMTIsIDEzLCAuLi4sIDIwLCAyMSwgMjIsIC4uLlxuICAgIC8vICAgOTQgOWM6ID0+IGRvbid0IG5lZWQgYW55IGZsYWdnYWJsZSA9PiAwNSwgM2MsIDY4LCA4MywgODgsIDg5LCA4YSwgOTAsIC4uLlxuICB9XG5cbiAgZGlzam9pbnRUaWxlc2V0cygpIHtcbiAgICBjb25zdCB0aWxlc2V0QnlTY3JlZW46IEFycmF5PFNldDxudW1iZXI+PiA9IFtdO1xuICAgIGZvciAoY29uc3QgbG9jIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWxvYy51c2VkKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHRpbGVzZXQgPSBsb2MudGlsZXNldDtcbiAgICAgIC8vY29uc3QgZXh0ID0gbG9jLnNjcmVlblBhZ2U7XG4gICAgICBmb3IgKGNvbnN0IHJvdyBvZiBsb2Muc2NyZWVucykge1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2Ygcm93KSB7XG4gICAgICAgICAgKHRpbGVzZXRCeVNjcmVlbltzXSB8fCAodGlsZXNldEJ5U2NyZWVuW3NdID0gbmV3IFNldCgpKSkuYWRkKHRpbGVzZXQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHRpbGVzID0gc2VxKDI1NiwgKCkgPT4gbmV3IFVuaW9uRmluZDxudW1iZXI+KCkpO1xuICAgIGZvciAobGV0IHMgPSAwOyBzIDwgdGlsZXNldEJ5U2NyZWVuLmxlbmd0aDsgcysrKSB7XG4gICAgICBpZiAoIXRpbGVzZXRCeVNjcmVlbltzXSkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IHQgb2YgdGhpcy5zY3JlZW5zW3NdLmFsbFRpbGVzU2V0KCkpIHtcbiAgICAgICAgdGlsZXNbdF0udW5pb24oWy4uLnRpbGVzZXRCeVNjcmVlbltzXV0pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBvdXRwdXRcbiAgICBmb3IgKGxldCB0ID0gMDsgdCA8IHRpbGVzLmxlbmd0aDsgdCsrKSB7XG4gICAgICBjb25zdCBwID0gdGlsZXNbdF0uc2V0cygpXG4gICAgICAgICAgLm1hcCgoczogU2V0PG51bWJlcj4pID0+IFsuLi5zXS5tYXAoaGV4KS5qb2luKCcgJykpXG4gICAgICAgICAgLmpvaW4oJyB8ICcpO1xuICAgICAgY29uc29sZS5sb2coYFRpbGUgJHtoZXgodCl9OiAke3B9YCk7XG4gICAgfVxuICAgIC8vICAgaWYgKCF0aWxlc2V0QnlTY3JlZW5baV0pIHtcbiAgICAvLyAgICAgY29uc29sZS5sb2coYE5vIHRpbGVzZXQgZm9yIHNjcmVlbiAke2kudG9TdHJpbmcoMTYpfWApO1xuICAgIC8vICAgICBjb250aW51ZTtcbiAgICAvLyAgIH1cbiAgICAvLyAgIHVuaW9uLnVuaW9uKFsuLi50aWxlc2V0QnlTY3JlZW5baV1dKTtcbiAgICAvLyB9XG4gICAgLy8gcmV0dXJuIHVuaW9uLnNldHMoKTtcbiAgfVxuXG4gIC8vIEN5Y2xlcyBhcmUgbm90IGFjdHVhbGx5IGN5Y2xpYyAtIGFuIGV4cGxpY2l0IGxvb3AgYXQgdGhlIGVuZCBpcyByZXF1aXJlZCB0byBzd2FwLlxuICAvLyBWYXJpYW5jZTogWzEsIDIsIG51bGxdIHdpbGwgY2F1c2UgaW5zdGFuY2VzIG9mIDEgdG8gYmVjb21lIDIgYW5kIHdpbGxcbiAgLy8gICAgICAgICAgIGNhdXNlIHByb3BlcnRpZXMgb2YgMSB0byBiZSBjb3BpZWQgaW50byBzbG90IDJcbiAgLy8gQ29tbW9uIHVzYWdlIGlzIHRvIHN3YXAgdGhpbmdzIG91dCBvZiB0aGUgd2F5IGFuZCB0aGVuIGNvcHkgaW50byB0aGVcbiAgLy8gbmV3bHktZnJlZWQgc2xvdC4gIFNheSB3ZSB3YW50ZWQgdG8gZnJlZSB1cCBzbG90cyBbMSwgMiwgMywgNF0gYW5kXG4gIC8vIGhhZCBhdmFpbGFibGUvZnJlZSBzbG90cyBbNSwgNiwgNywgOF0gYW5kIHdhbnQgdG8gY29weSBmcm9tIFs5LCBhLCBiLCBjXS5cbiAgLy8gVGhlbiBjeWNsZXMgd2lsbCBiZSBbMSwgNSwgOV0gPz8/IG5vXG4gIC8vICAtIHByb2JhYmx5IHdhbnQgdG8gZG8gc2NyZWVucyBzZXBhcmF0ZWx5IGZyb20gdGlsZXNldHMuLi4/XG4gIC8vIE5PVEUgLSB3ZSBkb24ndCBhY3R1YWxseSB3YW50IHRvIGNoYW5nZSB0aWxlcyBmb3IgdGhlIGxhc3QgY29weS4uLiFcbiAgLy8gICBpbiB0aGlzIGNhc2UsIHRzWzVdIDwtIHRzWzFdLCB0c1sxXSA8LSB0c1s5XSwgc2NyZWVuLm1hcCgxIC0+IDUpXG4gIC8vICAgcmVwbGFjZShbMHg5MF0sIFs1LCAxLCB+OV0pXG4gIC8vICAgICA9PiAxcyByZXBsYWNlZCB3aXRoIDVzIGluIHNjcmVlbnMgYnV0IDlzIE5PVCByZXBsYWNlZCB3aXRoIDFzLlxuICAvLyBKdXN0IGJ1aWxkIHRoZSBwYXJ0aXRpb24gb25jZSBsYXppbHk/IHRoZW4gY2FuIHJldXNlLi4uXG4gIC8vICAgLSBlbnN1cmUgYm90aCBzaWRlcyBvZiByZXBsYWNlbWVudCBoYXZlIGNvcnJlY3QgcGFydGl0aW9uaW5nP0VcbiAgLy8gICAgIG9yIGp1c3QgZG8gaXQgb2ZmbGluZSAtIGl0J3Mgc2ltcGxlclxuICAvLyBUT0RPIC0gU2FuaXR5IGNoZWNrPyAgV2FudCB0byBtYWtlIHN1cmUgbm9ib2R5IGlzIHVzaW5nIGNsb2JiZXJlZCB0aWxlcz9cbiAgc3dhcE1ldGF0aWxlcyh0aWxlc2V0czogbnVtYmVyW10sIC4uLmN5Y2xlczogKG51bWJlciB8IG51bWJlcltdKVtdW10pIHtcbiAgICAvLyBQcm9jZXNzIHRoZSBjeWNsZXNcbiAgICBjb25zdCByZXYgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAgIGNvbnN0IHJldkFycjogbnVtYmVyW10gPSBzZXEoMHgxMDApO1xuICAgIGNvbnN0IGFsdCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gICAgY29uc3QgY3BsID0gKHg6IG51bWJlciB8IG51bWJlcltdKTogbnVtYmVyID0+IEFycmF5LmlzQXJyYXkoeCkgPyB4WzBdIDogeCA8IDAgPyB+eCA6IHg7XG4gICAgZm9yIChjb25zdCBjeWNsZSBvZiBjeWNsZXMpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3ljbGUubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGN5Y2xlW2ldKSkge1xuICAgICAgICAgIGNvbnN0IGFyciA9IGN5Y2xlW2ldIGFzIG51bWJlcltdO1xuICAgICAgICAgIGFsdC5zZXQoYXJyWzBdLCBhcnJbMV0pO1xuICAgICAgICAgIGN5Y2xlW2ldID0gYXJyWzBdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN5Y2xlLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICBjb25zdCBqID0gY3ljbGVbaV0gYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCBrID0gY3ljbGVbaSArIDFdIGFzIG51bWJlcjtcbiAgICAgICAgaWYgKGogPCAwIHx8IGsgPCAwKSBjb250aW51ZTtcbiAgICAgICAgcmV2LnNldChrLCBqKTtcbiAgICAgICAgcmV2QXJyW2tdID0gajtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gY29uc3QgcmVwbGFjZW1lbnRTZXQgPSBuZXcgU2V0KHJlcGxhY2VtZW50cy5rZXlzKCkpO1xuICAgIC8vIEZpbmQgaW5zdGFuY2VzIGluICgxKSBzY3JlZW5zLCAoMikgdGlsZXNldHMgYW5kIGFsdGVybmF0ZXMsICgzKSB0aWxlRWZmZWN0c1xuICAgIGNvbnN0IHNjcmVlbnMgPSBuZXcgU2V0PFNjcmVlbj4oKTtcbiAgICBjb25zdCB0aWxlRWZmZWN0cyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IHRpbGVzZXRzU2V0ID0gbmV3IFNldCh0aWxlc2V0cyk7XG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWwudXNlZCkgY29udGludWU7XG4gICAgICBpZiAoIXRpbGVzZXRzU2V0LmhhcyhsLnRpbGVzZXQpKSBjb250aW51ZTtcbiAgICAgIHRpbGVFZmZlY3RzLmFkZChsLnRpbGVFZmZlY3RzKTtcbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIGwuYWxsU2NyZWVucygpKSB7XG4gICAgICAgIHNjcmVlbnMuYWRkKHNjcmVlbik7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIERvIHJlcGxhY2VtZW50cy5cbiAgICAvLyAxLiBzY3JlZW5zOiBbNSwgMSwgfjldID0+IGNoYW5nZSAxcyBpbnRvIDVzXG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2Ygc2NyZWVucykge1xuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNjcmVlbi50aWxlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBzY3JlZW4udGlsZXNbaV0gPSByZXZBcnJbc2NyZWVuLnRpbGVzW2ldXTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gMi4gdGlsZXNldHM6IFs1LCAxIH45XSA9PiBjb3B5IDUgPD0gMSBhbmQgMSA8PSA5XG4gICAgZm9yIChjb25zdCB0c2lkIG9mIHRpbGVzZXRzU2V0KSB7XG4gICAgICBjb25zdCB0aWxlc2V0ID0gdGhpcy50aWxlc2V0c1t0c2lkXTtcbiAgICAgIGZvciAoY29uc3QgY3ljbGUgb2YgY3ljbGVzKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3ljbGUubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYSA9IGNwbChjeWNsZVtpXSk7XG4gICAgICAgICAgY29uc3QgYiA9IGNwbChjeWNsZVtpICsgMV0pO1xuICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgNDsgaisrKSB7XG4gICAgICAgICAgICB0aWxlc2V0LnRpbGVzW2pdW2FdID0gdGlsZXNldC50aWxlc1tqXVtiXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGlsZXNldC5hdHRyc1thXSA9IHRpbGVzZXQuYXR0cnNbYl07XG4gICAgICAgICAgaWYgKGIgPCAweDIwICYmIHRpbGVzZXQuYWx0ZXJuYXRlc1tiXSAhPT0gYikge1xuICAgICAgICAgICAgaWYgKGEgPj0gMHgyMCkgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgdW5mbGFnOiAke3RzaWR9ICR7YX0gJHtifSAke3RpbGVzZXQuYWx0ZXJuYXRlc1tiXX1gKTtcbiAgICAgICAgICAgIHRpbGVzZXQuYWx0ZXJuYXRlc1thXSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1tiXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBbYSwgYl0gb2YgYWx0KSB7XG4gICAgICAgIHRpbGVzZXQuYWx0ZXJuYXRlc1thXSA9IGI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIDMuIHRpbGVFZmZlY3RzXG4gICAgZm9yIChjb25zdCB0ZWlkIG9mIHRpbGVFZmZlY3RzKSB7XG4gICAgICBjb25zdCB0aWxlRWZmZWN0ID0gdGhpcy50aWxlRWZmZWN0c1t0ZWlkIC0gMHhiM107XG4gICAgICBmb3IgKGNvbnN0IGN5Y2xlIG9mIGN5Y2xlcykge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN5Y2xlLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICAgIGNvbnN0IGEgPSBjcGwoY3ljbGVbaV0pO1xuICAgICAgICAgIGNvbnN0IGIgPSBjcGwoY3ljbGVbaSArIDFdKTtcbiAgICAgICAgICB0aWxlRWZmZWN0LmVmZmVjdHNbYV0gPSB0aWxlRWZmZWN0LmVmZmVjdHNbYl07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgYSBvZiBhbHQua2V5cygpKSB7XG4gICAgICAgIC8vIFRoaXMgYml0IGlzIHJlcXVpcmVkIHRvIGluZGljYXRlIHRoYXQgdGhlIGFsdGVybmF0aXZlIHRpbGUnc1xuICAgICAgICAvLyBlZmZlY3Qgc2hvdWxkIGJlIGNvbnN1bHRlZC4gIFNpbXBseSBoYXZpbmcgdGhlIGZsYWcgYW5kIHRoZVxuICAgICAgICAvLyB0aWxlIGluZGV4IDwgJDIwIGlzIG5vdCBzdWZmaWNpZW50LlxuICAgICAgICB0aWxlRWZmZWN0LmVmZmVjdHNbYV0gfD0gMHgwODtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRG9uZT8hP1xuICB9XG5cbiAgbW92ZUZsYWcob2xkRmxhZzogbnVtYmVyLCBuZXdGbGFnOiBudW1iZXIpIHtcbiAgICAvLyBuZWVkIHRvIHVwZGF0ZSB0cmlnZ2Vycywgc3Bhd25zLCBkaWFsb2dzXG4gICAgZnVuY3Rpb24gcmVwbGFjZShhcnI6IG51bWJlcltdKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoYXJyW2ldID09PSBvbGRGbGFnKSBhcnJbaV0gPSBuZXdGbGFnO1xuICAgICAgICBpZiAoYXJyW2ldID09PSB+b2xkRmxhZykgYXJyW2ldID0gfm5ld0ZsYWc7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgdHJpZ2dlciBvZiB0aGlzLnRyaWdnZXJzKSB7XG4gICAgICByZXBsYWNlKHRyaWdnZXIuY29uZGl0aW9ucyk7XG4gICAgICByZXBsYWNlKHRyaWdnZXIuZmxhZ3MpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5wYyBvZiB0aGlzLm5wY3MpIHtcbiAgICAgIGZvciAoY29uc3QgY29uZHMgb2YgbnBjLnNwYXduQ29uZGl0aW9ucy52YWx1ZXMoKSkgcmVwbGFjZShjb25kcyk7XG4gICAgICBmb3IgKGNvbnN0IGRpYWxvZ3Mgb2YgW25wYy5nbG9iYWxEaWFsb2dzLCAuLi5ucGMubG9jYWxEaWFsb2dzLnZhbHVlcygpXSkge1xuICAgICAgICBmb3IgKGNvbnN0IGRpYWxvZyBvZiBkaWFsb2dzKSB7XG4gICAgICAgICAgaWYgKGRpYWxvZy5jb25kaXRpb24gPT09IG9sZEZsYWcpIGRpYWxvZy5jb25kaXRpb24gPSBuZXdGbGFnO1xuICAgICAgICAgIGlmIChkaWFsb2cuY29uZGl0aW9uID09PSB+b2xkRmxhZykgZGlhbG9nLmNvbmRpdGlvbiA9IH5uZXdGbGFnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGFsc28gbmVlZCB0byB1cGRhdGUgbWFwIGZsYWdzIGlmID49ICQyMDBcbiAgICBpZiAoKG9sZEZsYWcgJiB+MHhmZikgPT09IDB4MjAwICYmIChuZXdGbGFnICYgfjB4ZmYpID09PSAweDIwMCkge1xuICAgICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgICAgZm9yIChjb25zdCBmbGFnIG9mIGxvYy5mbGFncykge1xuICAgICAgICAgIGlmIChmbGFnLmZsYWcgPT09IG9sZEZsYWcpIGZsYWcuZmxhZyA9IG5ld0ZsYWc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBuZXh0RnJlZVRyaWdnZXIobmFtZT86IFRyaWdnZXIuQ3VzdG9tKTogVHJpZ2dlciB7XG4gICAgZm9yIChjb25zdCB0IG9mIHRoaXMudHJpZ2dlcnMpIHtcbiAgICAgIGlmICh0LnVzZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKG5hbWUpIHRoaXMuYWxsb2NhdGVkVHJpZ2dlcnMuc2V0KG5hbWUsIHQuaWQpO1xuICAgICAgcmV0dXJuIHQ7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgYW4gdW51c2VkIHRyaWdnZXIuJyk7XG4gIH1cblxuICAvLyBjb21wcmVzc01hcERhdGEoKTogdm9pZCB7XG4gIC8vICAgaWYgKHRoaXMuY29tcHJlc3NlZE1hcERhdGEpIHJldHVybjtcbiAgLy8gICB0aGlzLmNvbXByZXNzZWRNYXBEYXRhID0gdHJ1ZTtcbiAgLy8gICAvLyBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gIC8vICAgLy8gICBpZiAobG9jYXRpb24uZXh0ZW5kZWQpIGxvY2F0aW9uLmV4dGVuZGVkID0gMHhhO1xuICAvLyAgIC8vIH1cbiAgLy8gICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAvLyAgICAgLy90aGlzLnNjcmVlbnNbMHhhMDAgfCBpXSA9IHRoaXMuc2NyZWVuc1sweDEwMCB8IGldO1xuICAvLyAgICAgdGhpcy5tZXRhc2NyZWVucy5yZW51bWJlcigweDEwMCB8IGksIDB4YTAwIHwgaSk7XG4gIC8vICAgICBkZWxldGUgdGhpcy5zY3JlZW5zWzB4MTAwIHwgaV07XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gVE9ETyAtIGRvZXMgbm90IHdvcmsuLi5cbiAgLy8gVE9ETyAtIGNsZWFuIHRoaXMgdXAgc29tZWhvdy4uLiB3b3VsZCBiZSBuaWNlIHRvIHVzZSB0aGUgYXNzZW1ibGVyL2xpbmtlclxuICAvLyAgICAgICAgdy8gYW4gLmFsaWduIG9wdGlvbiBmb3IgdGhpcywgYnV0IHRoZW4gd2UgaGF2ZSB0byBob2xkIG9udG8gd2VpcmRcbiAgLy8gICAgICAgIGRhdGEgaW4gbWFueSBwbGFjZXMsIHdoaWNoIGlzbid0IGdyZWF0LlxuICAvLyAgICAgICAgIC0gYXQgbGVhc3QsIHdlIGNvdWxkIFwicmVzZXJ2ZVwiIGJsb2NrcyBpbiB2YXJpb3VzIHBhZ2VzP1xuXG4gIC8qKlxuICAgKiBNb3ZlcyBhbGwgdGhlIHNjcmVlbnMgZnJvbSB0aGUgZ2l2ZW4gdGlsZXNldChzKSBpbnRvIHRoZSBnaXZlbiBwbGFuZS5cbiAgICogTm90ZSB0aGF0IHRoZSB0aWxlc2V0cyBtdXN0IGJlIF9jbG9zZWQgb3ZlciBzaGFyaW5nXywgd2hpY2ggbWVhbnMgdGhhdFxuICAgKiBpZiBzY3JlZW4gUyBpcyBpbiB0aWxlc2V0cyBBIGFuZCBCLCB0aGVuIEEgYW5kIEIgbXVzdCBiZSBlaXRoZXIgYm90aFxuICAgKiBvciBuZWl0aGVyIGluIHRoZSBhcnJheS4gIEEgcGxhbmUgaXMgNjRrYiBhbmQgaG9sZHMgMjU2IHNjcmVlbnMuXG4gICAqIFBsYW5lcyAwLi4zIGFyZSB0aGUgb3JpZ2luYWwgdW5leHBhbmRlZCBQUkcuICBUaGUgZXh0cmEgZXhwYW5kZWQgc3BhY2VcbiAgICogb3BlbnMgdXAgcGxhbmVzIDQuLjcsIHRob3VnaCAoMSkgd2Ugc2hvdWxkIGF2b2lkIHVzaW5nIHBsYW5lIDcgc2luY2VcbiAgICogdGhlIFwiZmVcIiBhbmQgXCJmZlwiIHNlZ21lbnRzIGxpdmUgdGhlcmUsIGFuZCB3ZSdsbCBhbHNvIHJlc2VydmUgdGhlIGxvd2VyXG4gICAqIHNlZ21lbnRzIGluIHBsYW5lIDcgZm9yIHJlbG9jYXRlZCBjb2RlIGFuZCBkYXRhLiAgV2UgY2FuIHByb2JhYmx5IGFsc29cbiAgICogYXZvaWQgcGxhbmUgNiBiZWNhdXNlIDUxMiBleHRyYSBzY3JlZW5zIHNob3VsZCBiZSBtb3JlIHRoYW4gYW55Ym9keVxuICAgKiBjb3VsZCBldmVyIG5lZWQuXG4gICAqL1xuICBtb3ZlU2NyZWVucyh0aWxlc2V0QXJyYXk6IE1ldGF0aWxlc2V0W10sIHBsYW5lOiBudW1iZXIpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29tcHJlc3NlZE1hcERhdGEpIHRocm93IG5ldyBFcnJvcihgTXVzdCBjb21wcmVzcyBtYXBzIGZpcnN0LmApO1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gICAgbGV0IGkgPSBwbGFuZSA8PCA4O1xuICAgIHdoaWxlICh0aGlzLnNjcmVlbnNbaV0pIHtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgY29uc3QgdGlsZXNldHMgPSBuZXcgU2V0KHRpbGVzZXRBcnJheSk7XG4gICAgZm9yIChjb25zdCB0aWxlc2V0IG9mIHRpbGVzZXRzKSB7XG4gICAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aWxlc2V0KSB7XG4gICAgICAgIGlmIChzY3JlZW4uc2lkID49IDB4MTAwKSB7XG4gICAgICAgICAgbWFwLnNldChzY3JlZW4uc2lkLCBzY3JlZW4uc2lkKTsgLy8gaWdub3JlIHNob3BzXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgLy9pZiAoKGkgJiAweGZmKSA9PT0gMHgyMCkgdGhyb3cgbmV3IEVycm9yKGBObyByb29tIGxlZnQgb24gcGFnZS5gKTtcbiAgICAgICAgY29uc3QgcHJldiA9IHNjcmVlbi5zaWQ7XG4gICAgICAgIGlmICghbWFwLmhhcyhwcmV2KSkge1xuICAgICAgICAgIC8vIHVzdWFsbHkgbm90IGltcG9ydGFudCwgYnV0IGVuc3VyZSBhbGwgdmFyaWFudHMgYXJlIHJlbnVtYmVyZWRcbiAgICAgICAgICAvL3NjcmVlbi5zaWQgPSBtYXAuZ2V0KHByZXYpITtcbiAgICAgICAgLy99IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IG5leHQgPSBpKys7XG4gICAgICAgICAgbWFwLnNldChwcmV2LCBuZXh0KTtcbiAgICAgICAgICBtYXAuc2V0KG5leHQsIG5leHQpO1xuICAgICAgICAgIHRoaXMubWV0YXNjcmVlbnMucmVudW1iZXIocHJldiwgbmV4dCwgdGlsZXNldHMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICgoaSA+Pj4gOCkgIT09IHBsYW5lKSB0aHJvdyBuZXcgRXJyb3IoYE91dCBvZiBzcGFjZSBvbiBwYWdlICR7cGxhbmV9YCk7XG5cbiAgICAvLyBNb3ZlIHRoZSBzY3JlZW4gYW5kIG1ha2Ugc3VyZSB0aGF0IGFsbCBsb2NhdGlvbnMgYXJlIG9uIGEgc2luZ2xlIHBsYW5lXG4gICAgY29uc3QgbWlzc2VkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghdGlsZXNldHMuaGFzKGxvYy5tZXRhLnRpbGVzZXQpKSBjb250aW51ZTtcbiAgICAgIGxldCBhbnlNb3ZlZCA9IGZhbHNlO1xuICAgICAgZm9yIChjb25zdCByb3cgb2YgbG9jLnNjcmVlbnMpIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCByb3cubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBjb25zdCBtYXBwZWQgPSBtYXAuZ2V0KHJvd1tqXSk7XG4gICAgICAgICAgaWYgKG1hcHBlZCAhPSBudWxsKSB7XG4gICAgICAgICAgICByb3dbal0gPSBtYXBwZWQ7XG4gICAgICAgICAgICBhbnlNb3ZlZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1pc3NlZC5hZGQobG9jLm5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGFueU1vdmVkICYmIG1pc3NlZC5zaXplKSB0aHJvdyBuZXcgRXJyb3IoYEluY29uc2lzdGVudCBtb3ZlIFske1suLi50aWxlc2V0c10ubWFwKHQgPT4gdC5uYW1lKS5qb2luKCcsICcpfV0gdG8gcGxhbmUgJHtwbGFuZX06IG1pc3NlZCAke1suLi5taXNzZWRdLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuICB9XG5cbiAgLy8gVXNlIHRoZSBicm93c2VyIEFQSSB0byBsb2FkIHRoZSBST00uICBVc2UgI3Jlc2V0IHRvIGZvcmdldCBhbmQgcmVsb2FkLlxuICBzdGF0aWMgYXN5bmMgbG9hZChwYXRjaD86IChkYXRhOiBVaW50OEFycmF5KSA9PiB2b2lkfFByb21pc2U8dm9pZD4sXG4gICAgICAgICAgICAgICAgICAgIHJlY2VpdmVyPzogKHBpY2tlcjogRWxlbWVudCkgPT4gdm9pZCk6IFByb21pc2U8Um9tPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IHBpY2tGaWxlKHJlY2VpdmVyKTtcbiAgICBpZiAocGF0Y2gpIGF3YWl0IHBhdGNoKGZpbGUpO1xuICAgIHJldHVybiBuZXcgUm9tKGZpbGUpO1xuICB9ICBcblxuICBzdGF0aWMgYXN5bmMgbG9hZEJ5dGVzKCk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICAgIHJldHVybiBhd2FpdCBwaWNrRmlsZSgpO1xuICB9XG59XG5cbi8vIGNvbnN0IGludGVyc2VjdHMgPSAobGVmdCwgcmlnaHQpID0+IHtcbi8vICAgaWYgKGxlZnQuc2l6ZSA+IHJpZ2h0LnNpemUpIHJldHVybiBpbnRlcnNlY3RzKHJpZ2h0LCBsZWZ0KTtcbi8vICAgZm9yIChsZXQgaSBvZiBsZWZ0KSB7XG4vLyAgICAgaWYgKHJpZ2h0LmhhcyhpKSkgcmV0dXJuIHRydWU7XG4vLyAgIH1cbi8vICAgcmV0dXJuIGZhbHNlO1xuLy8gfVxuXG4vLyBjb25zdCBUSUxFX0VGRkVDVFNfQllfVElMRVNFVCA9IHtcbi8vICAgMHg4MDogMHhiMyxcbi8vICAgMHg4NDogMHhiNCxcbi8vICAgMHg4ODogMHhiNSxcbi8vICAgMHg4YzogMHhiNixcbi8vICAgMHg5MDogMHhiNyxcbi8vICAgMHg5NDogMHhiOCxcbi8vICAgMHg5ODogMHhiOSxcbi8vICAgMHg5YzogMHhiYSxcbi8vICAgMHhhMDogMHhiYixcbi8vICAgMHhhNDogMHhiYyxcbi8vICAgMHhhODogMHhiNSxcbi8vICAgMHhhYzogMHhiZCxcbi8vIH07XG5cbi8vIE9ubHkgbWFrZXMgc2Vuc2UgaW4gdGhlIGJyb3dzZXIuXG5mdW5jdGlvbiBwaWNrRmlsZShyZWNlaXZlcj86IChwaWNrZXI6IEVsZW1lbnQpID0+IHZvaWQpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgaWYgKCFyZWNlaXZlcikgcmVjZWl2ZXIgPSBwaWNrZXIgPT4gZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChwaWNrZXIpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggIT09ICcjcmVzZXQnKSB7XG4gICAgICBjb25zdCBkYXRhID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JvbScpO1xuICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHJlc29sdmUoXG4gICAgICAgICAgICBVaW50OEFycmF5LmZyb20oXG4gICAgICAgICAgICAgICAgbmV3IEFycmF5KGRhdGEubGVuZ3RoIC8gMikuZmlsbCgwKS5tYXAoXG4gICAgICAgICAgICAgICAgICAgIChfLCBpKSA9PiBOdW1iZXIucGFyc2VJbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhWzIgKiBpXSArIGRhdGFbMiAqIGkgKyAxXSwgMTYpKSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB1cGxvYWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodXBsb2FkKTtcbiAgICB1cGxvYWQudHlwZSA9ICdmaWxlJztcbiAgICB1cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgY29uc3QgZmlsZSA9IHVwbG9hZC5maWxlcyFbMF07XG4gICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlbmQnLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGFyciA9IG5ldyBVaW50OEFycmF5KHJlYWRlci5yZXN1bHQgYXMgQXJyYXlCdWZmZXIpO1xuICAgICAgICBjb25zdCBzdHIgPSBBcnJheS5mcm9tKGFyciwgaGV4KS5qb2luKCcnKTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3JvbScsIHN0cik7XG4gICAgICAgIHVwbG9hZC5yZW1vdmUoKTtcbiAgICAgICAgcmVzb2x2ZShhcnIpO1xuICAgICAgfSk7XG4gICAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZSk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5leHBvcnQgY29uc3QgRVhQRUNURURfQ1JDMzIgPSAweDFiZDM5MDMyO1xuXG4vLyBGb3JtYXQ6IFthZGRyZXNzLCBicm9rZW4sIGZpeGVkXVxuY29uc3QgQURKVVNUTUVOVFMgPSBbXG4gIC8vIE5vcm1hbGl6ZSBjYXZlIGVudHJhbmNlIGluIDAxIG91dHNpZGUgc3RhcnRcbiAgWzB4MTQ1NDgsIDB4NTYsIDB4NTBdLFxuICAvLyBGaXggYnJva2VuIChmYWxsLXRocm91Z2gpIGV4aXQgb3V0c2lkZSBzdGFydFxuICBbMHgxNDU2YSwgMHgwMCwgMHhmZl0sXG4gIC8vIE1vdmUgTGVhZiBub3J0aCBlbnRyYW5jZSB0byBiZSByaWdodCBuZXh0IHRvIGV4aXQgKGNvbnNpc3RlbnQgd2l0aCBHb2EpXG4gIFsweDE0NThmLCAweDM4LCAweDMwXSxcbiAgLy8gTm9ybWFsaXplIHNlYWxlZCBjYXZlIGVudHJhbmNlL2V4aXQgYW5kIHplYnUgY2F2ZSBlbnRyYW5jZVxuICBbMHgxNDYxOCwgMHg2MCwgMHg3MF0sXG4gIFsweDE0NjI2LCAweGE4LCAweGEwXSxcbiAgWzB4MTQ2MzMsIDB4MTUsIDB4MTZdLFxuICBbMHgxNDYzNywgMHgxNSwgMHgxNl0sXG4gIC8vIE5vcm1hbGl6ZSBjb3JkZWwgcGxhaW4gZW50cmFuY2UgZnJvbSBzZWFsZWQgY2F2ZVxuICBbMHgxNDk1MSwgMHhhOCwgMHhhMF0sXG4gIFsweDE0OTUzLCAweDk4LCAweDkwXSxcbiAgLy8gTm9ybWFsaXplIGNvcmRlbCBzd2FwIGVudHJhbmNlXG4gIFsweDE0YTE5LCAweDc4LCAweDcwXSxcbiAgLy8gUmVkdW5kYW50IGV4aXQgbmV4dCB0byBzdG9tJ3MgZG9vciBpbiAkMTlcbiAgWzB4MTRhZWIsIDB4MDksIDB4ZmZdLFxuICAvLyBOb3JtYWxpemUgc3dhbXAgZW50cmFuY2UgcG9zaXRpb25cbiAgWzB4MTRiNDksIDB4ODAsIDB4ODhdLFxuICAvLyBOb3JtYWxpemUgYW1hem9uZXMgZW50cmFuY2UvZXhpdCBwb3NpdGlvblxuICBbMHgxNGI4NywgMHgyMCwgMHgzMF0sXG4gIFsweDE0YjlhLCAweDAxLCAweDAyXSxcbiAgWzB4MTRiOWUsIDB4MDEsIDB4MDJdLFxuICAvLyBGaXggZ2FyYmFnZSBtYXAgc3F1YXJlIGluIGJvdHRvbS1yaWdodCBvZiBNdCBTYWJyZSBXZXN0IGNhdmVcbiAgWzB4MTRkYjksIDB4MDgsIDB4ODBdLFxuICAvLyBOb3JtYWxpemUgc2FicmUgbiBlbnRyYW5jZSBiZWxvdyBzdW1taXRcbiAgWzB4MTRlZjYsIDB4NjgsIDB4NjBdLFxuICAvLyBGaXggZ2FyYmFnZSBtYXAgc3F1YXJlIGluIGJvdHRvbS1sZWZ0IG9mIExpbWUgVHJlZSBWYWxsZXlcbiAgWzB4MTU0NWQsIDB4ZmYsIDB4MDBdLFxuICAvLyBOb3JtYWxpemUgbGltZSB0cmVlIHZhbGxleSBTRSBlbnRyYW5jZVxuICBbMHgxNTQ2OSwgMHg3OCwgMHg3MF0sXG4gIC8vIE5vcm1hbGl6ZSBwb3J0b2Egc2Uvc3cgZW50cmFuY2VzXG4gIFsweDE1ODA2LCAweDk4LCAweGEwXSxcbiAgWzB4MTU4MGEsIDB4OTgsIDB4YTBdLFxuICAvLyBOb3JtYWxpemUgcG9ydG9hIHBhbGFjZSBlbnRyYW5jZVxuICBbMHgxNTgwZSwgMHg1OCwgMHg1MF0sXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlL2V4aXQgaW4gcG9ydG9hXG4gIFsweDE1ODFkLCAweDAwLCAweGZmXSxcbiAgWzB4MTU4NGUsIDB4ZGIsIDB4ZmZdLFxuICAvLyBOb3JtYWxpemUgZmlzaGVybWFuIGlzbGFuZCBlbnRyYW5jZVxuICBbMHgxNTg3NSwgMHg3OCwgMHg3MF0sXG4gIC8vIE5vcm1hbGl6ZSB6b21iaWUgdG93biBlbnRyYW5jZSBmcm9tIHBhbGFjZVxuICBbMHgxNWI0ZiwgMHg3OCwgMHg4MF0sXG4gIC8vIFJlbW92ZSB1bnVzZWQgbWFwIHNjcmVlbnMgZnJvbSBFdmlsIFNwaXJpdCBsb3dlclxuICBbMHgxNWJhZiwgMHhmMCwgMHg4MF0sXG4gIFsweDE1YmI2LCAweGRmLCAweDgwXSxcbiAgWzB4MTViYjcsIDB4OTYsIDB4ODBdLFxuICAvLyBOb3JtYWxpemUgc2FiZXJhIHBhbGFjZSAxIGVudHJhbmNlIHVwIG9uZSB0aWxlXG4gIFsweDE1Y2UzLCAweGRmLCAweGNmXSxcbiAgWzB4MTVjZWUsIDB4NmUsIDB4NmRdLFxuICBbMHgxNWNmMiwgMHg2ZSwgMHg2ZF0sXG4gIC8vIE5vcm1hbGl6ZSBzYWJlcmEgcGFsYWNlIDMgZW50cmFuY2UgdXAgb25lIHRpbGVcbiAgWzB4MTVkOGUsIDB4ZGYsIDB4Y2ZdLFxuICBbMHgxNWQ5MSwgMHgyZSwgMHgyZF0sXG4gIFsweDE1ZDk1LCAweDJlLCAweDJkXSxcbiAgLy8gTm9ybWFsaXplIGpvZWwgZW50cmFuY2VcbiAgWzB4MTVlM2EsIDB4ZDgsIDB4ZGZdLFxuICAvLyBOb3JtYWxpemUgZ29hIHZhbGxleSByaWdodGhhbmQgZW50cmFuY2VcbiAgWzB4MTVmMzksIDB4NzgsIDB4NzBdLFxuICAvLyBNYXJrIGJhZCBlbnRyYW5jZS9leGl0IGluIGdvYSB2YWxsZXlcbiAgWzB4MTVmNDAsIDB4MDIsIDB4ZmZdLFxuICBbMHgxNWY2MSwgMHg4ZCwgMHhmZl0sXG4gIFsweDE1ZjY1LCAweDhkLCAweGZmXSxcbiAgLy8gTm9ybWFsaXplIHNoeXJvbiBsb3dlciBlbnRyYW5jZVxuICBbMHgxNjNmZCwgMHg0OCwgMHg0MF0sXG4gIC8vIE5vcm1hbGl6ZSBzaHlyb24gZm9ydHJlc3MgZW50cmFuY2VcbiAgWzB4MTY0MDMsIDB4NTUsIDB4NTBdLFxuICAvLyBOb3JtYWxpemUgZ29hIHNvdXRoIGVudHJhbmNlXG4gIFsweDE2NDViLCAweGQ4LCAweGRmXSxcbiAgLy8gRml4IHBhdHRlcm4gdGFibGUgZm9yIGRlc2VydCAxIChhbmltYXRpb24gZ2xvc3NlcyBvdmVyIGl0KVxuICBbMHgxNjRjYywgMHgwNCwgMHgyMF0sXG4gIC8vIEZpeCBnYXJiYWdlIGF0IGJvdHRvbSBvZiBvYXNpcyBjYXZlIG1hcCAoaXQncyA4eDExLCBub3QgOHgxMiA9PiBmaXggaGVpZ2h0KVxuICBbMHgxNjRmZiwgMHgwYiwgMHgwYV0sXG4gIC8vIE5vcm1hbGl6ZSBzYWhhcmEgZW50cmFuY2UvZXhpdCBwb3NpdGlvblxuICBbMHgxNjYwZCwgMHgyMCwgMHgzMF0sXG4gIFsweDE2NjI0LCAweDAxLCAweDAyXSxcbiAgWzB4MTY2MjgsIDB4MDEsIDB4MDJdLFxuICAvLyBSZW1vdmUgdW51c2VkIHNjcmVlbnMgZnJvbSBtYWRvMiBhcmVhXG4gIFsweDE2ZGIwLCAweDlhLCAweDgwXSxcbiAgWzB4MTZkYjQsIDB4OWUsIDB4ODBdLFxuICBbMHgxNmRiOCwgMHg5MSwgMHg4MF0sXG4gIFsweDE2ZGJjLCAweDllLCAweDgwXSxcbiAgWzB4MTZkYzAsIDB4OTEsIDB4ODBdLFxuICAvLyBNYXJrIGJhZCBlbnRyYW5jZSBpbiB1bnVzZWQgbWFkbzIgYXJlYVxuICBbMHgxNmRlOCwgMHgwMCwgMHhmZl0sXG4gIC8vIE5vcm1hbGl6ZSBtYWRvMi1zaWRlIGhlY2t3YXkgZW50cmFuY2VcbiAgWzB4MTZkZWQsIDB4ZGYsIDB4ZDBdLFxuICAvLyBGaXggYm9ndXMgZXhpdHMgaW4gdW51c2VkIG1hZG8yIGFyZWFcbiAgLy8gKGV4aXRzIDIgYW5kIDMgYXJlIGJhZCwgc28gbW92ZSA0IGFuZCA1IG9uIHRvcCBvZiB0aGVtKVxuICBbMHgxNmRmOCwgMHgwYywgMHg1Y10sXG4gIFsweDE2ZGY5LCAweGIwLCAweGI5XSxcbiAgWzB4MTZkZmEsIDB4MDAsIDB4MDJdLFxuICBbMHgxNmRmYywgMHgwYywgMHg1Y10sXG4gIFsweDE2ZGZkLCAweGIwLCAweGI5XSxcbiAgWzB4MTZkZmUsIDB4MDAsIDB4MDJdLFxuICBbMHgxNmRmZiwgMHgwNywgMHhmZl0sXG4gIC8vIEFsc28gcmVtb3ZlIHRoZSBiYWQgZW50cmFuY2VzL2V4aXRzIG9uIHRoZSBhc2luYSB2ZXJzaW9uXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlL2V4aXQgaW4gcG9ydG9hXG4gIFsweDE2ZTVkLCAweDAyLCAweGZmXSxcbiAgWzB4MTZlNmEsIDB4YWQsIDB4ZmZdLFxuICBbMHgxNmU2ZSwgMHhhZCwgMHhmZl0sXG4gIC8vIE1hcmsgdW51c2VkIGVudHJhbmNlL2V4aXQgaW4gbm9uLWtlbnN1IHNpZGUgb2Yga2FybWluZSA1LlxuICBbMHgxNzAwMSwgMHgwMiwgMHhmZl0sXG4gIFsweDE3MDJlLCAweGI3LCAweGZmXSxcbiAgWzB4MTcwMzIsIDB4YjcsIDB4ZmZdLFxuICAvLyBNYXJrIHVudXNlZCBlbnRyYW5jZXMvZXhpdHMgaW4ga2Vuc3Ugc2lkZSBvZiBrYXJtaW5lIDUuXG4gIFsweDE3MGFiLCAweDAzLCAweGZmXSxcbiAgWzB4MTcwYWYsIDB4MDIsIDB4ZmZdLFxuICBbMHgxNzBiMywgMHgwNSwgMHhmZl0sXG4gIFsweDE3MGI3LCAweDA2LCAweGZmXSxcbiAgWzB4MTcwYmIsIDB4MDAsIDB4ZmZdLFxuICBbMHgxNzBjNCwgMHhiMiwgMHhmZl0sXG4gIFsweDE3MGM4LCAweGIyLCAweGZmXSxcbiAgWzB4MTcwY2MsIDB4YjEsIDB4ZmZdLFxuICBbMHgxNzBkMCwgMHhiMSwgMHhmZl0sXG4gIFsweDE3MGQ0LCAweGIzLCAweGZmXSxcbiAgWzB4MTcwZDgsIDB4YjMsIDB4ZmZdLFxuICBbMHgxNzBkYywgMHhiNSwgMHhmZl0sXG4gIFsweDE3MGUwLCAweGI1LCAweGZmXSxcbiAgWzB4MTcwZTQsIDB4YjUsIDB4ZmZdLFxuICBbMHgxNzBlOCwgMHhiNSwgMHhmZl0sXG4gIC8vIE1hcmsgdW51c2VkIGVudHJhbmNlcyBpbiBcbiAgLy8gTm9ybWFsaXplIGFyeWxsaXMgZW50cmFuY2VcbiAgWzB4MTc0ZWUsIDB4ODAsIDB4ODhdLFxuICAvLyBOb3JtYWxpemUgam9lbCBzaGVkIGJvdHRvbSBhbmQgc2VjcmV0IHBhc3NhZ2UgZW50cmFuY2VzXG4gIFsweDE3N2MxLCAweDg4LCAweDgwXSxcbiAgWzB4MTc3YzUsIDB4OTgsIDB4YTBdLFxuICBbMHgxNzdjNywgMHg1OCwgMHg1MF0sXG4gIC8vIEZpeCBiYWQgbXVzaWMgaW4gem9tYmlldG93biBob3VzZXM6ICQxMCBzaG91bGQgYmUgJDAxLlxuICBbMHgxNzgyYSwgMHgxMCwgMHgwMV0sXG4gIFsweDE3ODU3LCAweDEwLCAweDAxXSxcbiAgLy8gTm9ybWFsaXplIHN3YW4gZGFuY2UgaGFsbCBlbnRyYW5jZSB0byBiZSBjb25zaXN0ZW50IHdpdGggc3RvbSdzIGhvdXNlXG4gIFsweDE3OTU0LCAweDgwLCAweDc4XSxcbiAgLy8gTm9ybWFsaXplIHNoeXJvbiBkb2pvIGVudHJhbmNlIHRvIGJlIGNvbnNpc3RlbnQgd2l0aCBzdG9tJ3MgaG91c2VcbiAgWzB4MTc5YTIsIDB4ODAsIDB4NzhdLFxuICAvLyBGaXggYmFkIHNjcmVlbnMgaW4gdG93ZXJcbiAgWzB4MTdiOGEsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAxXG4gIFsweDE3YjkwLCAweDAwLCAweDQwXSxcbiAgWzB4MTdiY2UsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAyXG4gIFsweDE3YmQ0LCAweDAwLCAweDQwXSxcbiAgWzB4MTdjMGUsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAzXG4gIFsweDE3YzE0LCAweDAwLCAweDQwXSxcbiAgWzB4MTdjNGUsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciA0XG4gIFsweDE3YzU0LCAweDAwLCAweDQwXSxcbiAgLy8gRml4IGJhZCBzcGF3biBpbiBNdCBIeWRyYSAobWFrZSBpdCBhbiBleHRyYSBwdWRkbGUpLlxuICBbMHgxOWYwMiwgMHg0MCwgMHg4MF0sXG4gIFsweDE5ZjAzLCAweDMzLCAweDMyXSxcbiAgLy8gRml4IGJhZCBzcGF3biBpbiBTYWJlcmEgMidzIGxldmVsIChwcm9iYWJseSBtZWFudCB0byBiZSBhIGZsYWlsIGd1eSkuXG4gIFsweDFhMWUwLCAweDQwLCAweGMwXSwgLy8gbWFrZSBzdXJlIHRvIGZpeCBwYXR0ZXJuIHNsb3QsIHRvbyFcbiAgWzB4MWExZTEsIDB4M2QsIDB4MzRdLFxuICAvLyBQb2ludCBBbWF6b25lcyBvdXRlciBndWFyZCB0byBwb3N0LW92ZXJmbG93IG1lc3NhZ2UgdGhhdCdzIGFjdHVhbGx5IHNob3duLlxuICBbMHgxY2YwNSwgMHg0NywgMHg0OF0sXG4gIC8vIFJlbW92ZSBzdHJheSBmbGlnaHQgZ3JhbnRlciBpbiBab21iaWV0b3duLlxuICBbMHgxZDMxMSwgMHgyMCwgMHhhMF0sXG4gIFsweDFkMzEyLCAweDMwLCAweDAwXSxcbiAgLy8gRml4IHF1ZWVuJ3MgZGlhbG9nIHRvIHRlcm1pbmF0ZSBvbiBsYXN0IGl0ZW0sIHJhdGhlciB0aGFuIG92ZXJmbG93LFxuICAvLyBzbyB0aGF0IHdlIGRvbid0IHBhcnNlIGdhcmJhZ2UuXG4gIFsweDFjZmY5LCAweDYwLCAweGUwXSxcbiAgLy8gRml4IEFtYXpvbmVzIG91dGVyIGd1YXJkIG1lc3NhZ2UgdG8gbm90IG92ZXJmbG93LlxuICBbMHgyY2E5MCwgMHgwMiwgMHgwMF0sXG4gIC8vIEZpeCBzZWVtaW5nbHktdW51c2VkIGtlbnN1IG1lc3NhZ2UgMWQ6MTcgb3ZlcmZsb3dpbmcgaW50byAxZDoxOFxuICBbMHgyZjU3MywgMHgwMiwgMHgwMF0sXG4gIC8vIEZpeCB1bnVzZWQga2FybWluZSB0cmVhc3VyZSBjaGVzdCBtZXNzYWdlIDIwOjE4LlxuICBbMHgyZmFlNCwgMHg1ZiwgMHgwMF0sXG5dIGFzIGNvbnN0O1xuIl19