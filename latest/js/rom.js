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
export const ModuleId = (name) => Symbol(name);
export class Rom {
    constructor(rom) {
        this.modules = new Map();
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
        this.writeMonsterNames = Rom.WRITE_MONSTER_NAMES.get(rom);
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
        const modules = [...this.modules.values(), a.module()];
        const writeAll = (writables) => {
            for (const w of writables) {
                modules.push(...w.write());
            }
        };
        modules.push(...this.locations.write());
        modules.push(...this.objects.write());
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
        Rom.WRITE_MONSTER_NAMES.set(this.prg, this.writeMonsterNames);
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
Rom.WRITE_MONSTER_NAMES = RomOption.bit(0x142c0, 3);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2pzL3JvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDN0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRXZDLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUUvQyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUM3QyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDckMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUM1QyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQWMsWUFBWSxFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDL0QsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDbEMsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBRXBELE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFB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USxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLGNBQWMsR0FBRyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsUUFBUSxHQUFHLElB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UUFDcEMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDekIsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDdkMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN4QyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDckMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM1QyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDdkMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUt0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QixLQUFLLE1BQU0sQ0FBQyxJQUFJLE9BQU8sRUFBRTtZQUN2QixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2hCO1FBQ0QsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzFCLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEIsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUc7WUFBRSxPQUFPO1FBRTlCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUdqQyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUUsQ0FBQyxNQUFPLENBQUM7UUFDbEUsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLHFCQUFxQixHQUFHLE9BQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsMENBQUUsTUFBTSxLQUFJLENBQUMsQ0FBQztRQUVsRSxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM3QyxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNyRCxHQUFHLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDakUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNwRSxHQUFHLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDeEUsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3ZFLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUM3RCxHQUFHLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELFlBQVk7SUE2Q1osQ0FBQztJQUVELGdCQUFnQjtRQUNkLE1BQU0sZUFBZSxHQUF1QixFQUFFLENBQUM7UUFDL0MsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ2hDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBQ3hCLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUM7WUFFNUIsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFO2dCQUM3QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEdBQUcsRUFBRTtvQkFDbkIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUN2RTthQUNGO1NBQ0Y7UUFDRCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksU0FBUyxFQUFVLENBQUMsQ0FBQztRQUN0RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMvQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztnQkFBRSxTQUFTO1lBQ2xDLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDN0MsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUN6QztTQUNGO1FBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDckMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtpQkFDcEIsR0FBRyxDQUFDLENBQUMsQ0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDbEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNyQztJQVFILENBQUM7SUFrQkQsYUFBYSxDQUFDLFFBQWtCLEVBQUUsR0FBRyxNQUErQjtRQUVsRSxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUN0QyxNQUFNLE1BQU0sR0FBYSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDdEMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFvQixFQUFVLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkYsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7WUFDMUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUN6QyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQzNCLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQWEsQ0FBQztvQkFDakMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3hCLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ25CO2FBQ0Y7WUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3pDLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQVcsQ0FBQztnQkFDN0IsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQVcsQ0FBQztnQkFDakMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO29CQUFFLFNBQVM7Z0JBQzdCLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNkLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDZjtTQUNGO1FBR0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNsQyxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ3RDLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RDLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUM5QixJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUFFLFNBQVM7WUFDMUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDL0IsS0FBSyxNQUFNLE1BQU0sSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7Z0JBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDckI7U0FDRjtRQUdELEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO1lBQzVCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUN2RCxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDM0M7U0FDRjtRQUVELEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxFQUFFO1lBQzlCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7Z0JBQzFCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDekMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN4QixNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM1QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO3dCQUMxQixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQzNDO29CQUNELE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEMsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO3dCQUMzQyxJQUFJLENBQUMsSUFBSSxJQUFJOzRCQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUM1RixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBRS9DO2lCQUNGO2FBQ0Y7WUFDRCxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFO2dCQUN4QixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUMzQjtTQUNGO1FBRUQsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLEVBQUU7WUFDOUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDakQsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7Z0JBQzFCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDekMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN4QixNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM1QixVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQy9DO2FBQ0Y7WUFDRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFJMUIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUM7YUFDL0I7U0FDRjtJQUVILENBQUM7SUFFRCxRQUFRLENBQUMsT0FBZSxFQUFFLE9BQWU7UUFFdkMsU0FBUyxPQUFPLENBQUMsR0FBYTtZQUM1QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDbkMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTztvQkFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDO2dCQUN6QyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU87b0JBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO2FBQzVDO1FBQ0gsQ0FBQztRQUNELEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNuQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzVCLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDeEI7UUFDRCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDM0IsS0FBSyxNQUFNLEtBQUssSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRTtnQkFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakUsS0FBSyxNQUFNLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUU7Z0JBQ3ZFLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO29CQUM1QixJQUFJLE1BQU0sQ0FBQyxTQUFTLEtBQUssT0FBTzt3QkFBRSxNQUFNLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQztvQkFDN0QsSUFBSSxNQUFNLENBQUMsU0FBUyxLQUFLLENBQUMsT0FBTzt3QkFBRSxNQUFNLENBQUMsU0FBUyxHQUFHLENBQUMsT0FBTyxDQUFDO2lCQUNoRTthQUNGO1NBQ0Y7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFO1lBQzlELEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDaEMsS0FBSyxNQUFNLElBQUksSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO29CQUM1QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssT0FBTzt3QkFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQztpQkFDaEQ7YUFDRjtTQUNGO0lBQ0gsQ0FBQztJQUVELGVBQWUsQ0FBQyxJQUFxQjtRQUNuQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDN0IsSUFBSSxDQUFDLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBQ3JCLElBQUksSUFBSTtnQkFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDakQsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBaUNELFdBQVcsQ0FBQyxZQUEyQixFQUFFLEtBQWE7UUFDcEQsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUI7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDMUUsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDdEMsSUFBSSxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQztRQUNuQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEIsQ0FBQyxFQUFFLENBQUM7U0FDTDtRQUNELE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3ZDLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO1lBQzlCLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO2dCQUM1QixJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksS0FBSyxFQUFFO29CQUN2QixHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNoQyxTQUFTO2lCQUNWO2dCQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUlsQixNQUFNLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDakIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ3BCLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUNwQixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2lCQUNqRDthQUNGO1NBQ0Y7UUFDRCxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEtBQUs7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRzFFLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDakMsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ2hDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO2dCQUFFLFNBQVM7WUFDOUMsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLEtBQUssTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRTtnQkFDN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7b0JBQ25DLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQy9CLElBQUksTUFBTSxJQUFJLElBQUksRUFBRTt3QkFDbEIsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQzt3QkFDaEIsUUFBUSxHQUFHLElBQUksQ0FBQztxQkFDakI7eUJBQU07d0JBQ0wsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ3RCO2lCQUNGO2FBQ0Y7WUFDRCxJQUFJLFFBQVEsSUFBSSxNQUFNLENBQUMsSUFBSTtnQkFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxLQUFLLFlBQVksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDdEs7SUFDSCxDQUFDO0lBR0QsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBZ0QsRUFDaEQsUUFBb0M7UUFDcEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEMsSUFBSSxLQUFLO1lBQUUsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBRUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTO1FBQ3BCLE9BQU8sTUFBTSxRQUFRLEVBQUUsQ0FBQztJQUMxQixDQUFDOztBQXJyQmUsNkJBQXlCLEdBQU0sU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDekQsNEJBQXdCLEdBQU8sU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDekQsc0JBQWtCLEdBQWEsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDekQsdUJBQW1CLEdBQVksU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDekQsY0FBVSxHQUFxQixTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZELGtCQUFjLEdBQWlCLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkQscUJBQWlCLEdBQWMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMxRCxvQkFBZ0IsR0FBZSxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzFELG9CQUFnQixHQUFlLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUF3c0I1RSxTQUFTLFFBQVEsQ0FBQyxRQUFvQztJQUNwRCxJQUFJLENBQUMsUUFBUTtRQUFFLFFBQVEsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RFLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUM3QixJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtZQUNyQyxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3pDLElBQUksSUFBSSxFQUFFO2dCQUNSLE9BQU8sT0FBTyxDQUNWLFVBQVUsQ0FBQyxJQUFJLENBQ1gsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUNsQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQ3JCLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDdkQ7U0FDRjtRQUNELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0MsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7UUFDckIsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7WUFDckMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5QixNQUFNLE1BQU0sR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO2dCQUN0QyxNQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBcUIsQ0FBQyxDQUFDO2dCQUN6RCxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzFDLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNmLENBQUMsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQztBQUd6QyxNQUFNLFdBQVcsR0FBRztJQUVsQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBR3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFHckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFHckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBR3JCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7SUFFckIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztJQUVyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBRXJCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7Q0FDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IHtBc3NlbWJsZXJ9IGZyb20gJy4vYXNtL2Fzc2VtYmxlci5qcyc7XG5pbXBvcnQge0Fzc2VtYmxlcn0gZnJvbSAnLi9hc20vYXNzZW1ibGVyLmpzJztcbmltcG9ydCB7TGlua2VyfSBmcm9tICcuL2FzbS9saW5rZXIuanMnO1xuaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4vYXNtL21vZHVsZS5qcyc7XG5pbXBvcnQge0FkSG9jU3Bhd259IGZyb20gJy4vcm9tL2FkaG9jc3Bhd24uanMnO1xuLy9pbXBvcnQge0FyZWFzfSBmcm9tICcuL3JvbS9hcmVhLmpzJztcbmltcG9ydCB7Qm9zc0tpbGx9IGZyb20gJy4vcm9tL2Jvc3NraWxsLmpzJztcbmltcG9ydCB7Qm9zc2VzfSBmcm9tICcuL3JvbS9ib3NzZXMuanMnO1xuaW1wb3J0IHtDb2luRHJvcHN9IGZyb20gJy4vcm9tL2NvaW5kcm9wcy5qcyc7XG5pbXBvcnQge0ZsYWdzfSBmcm9tICcuL3JvbS9mbGFncy5qcyc7XG5pbXBvcnQge0hpdGJveH0gZnJvbSAnLi9yb20vaGl0Ym94LmpzJztcbmltcG9ydCB7SXRlbXN9IGZyb20gJy4vcm9tL2l0ZW0uanMnO1xuaW1wb3J0IHtJdGVtR2V0c30gZnJvbSAnLi9yb20vaXRlbWdldC5qcyc7XG5pbXBvcnQge0xvY2F0aW9uc30gZnJvbSAnLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtNZXNzYWdlc30gZnJvbSAnLi9yb20vbWVzc2FnZXMuanMnO1xuaW1wb3J0IHtNZXRhc2NyZWVuc30gZnJvbSAnLi9yb20vbWV0YXNjcmVlbnMuanMnO1xuaW1wb3J0IHtNZXRhc3ByaXRlfSBmcm9tICcuL3JvbS9tZXRhc3ByaXRlLmpzJztcbmltcG9ydCB7TWV0YXRpbGVzZXQsIE1ldGF0aWxlc2V0c30gZnJvbSAnLi9yb20vbWV0YXRpbGVzZXQuanMnO1xuaW1wb3J0IHtNb25zdGVyfSBmcm9tICcuL3JvbS9tb25zdGVyLmpzJztcbmltcG9ydCB7TnBjc30gZnJvbSAnLi9yb20vbnBjLmpzJztcbmltcG9ydCB7T2JqZWN0QWN0aW9uc30gZnJvbSAnLi9yb20vb2JqZWN0YWN0aW9uLmpzJztcbmltcG9ydCB7T2JqZWN0RGF0YX0gZnJvbSAnLi9yb20vb2JqZWN0ZGF0YS5qcyc7XG5pbXBvcnQge09iamVjdHN9IGZyb20gJy4vcm9tL29iamVjdHMuanMnO1xuaW1wb3J0IHtSb21PcHRpb259IGZyb20gJy4vcm9tL29wdGlvbi5qcyc7XG5pbXBvcnQge1BhbGV0dGV9IGZyb20gJy4vcm9tL3BhbGV0dGUuanMnO1xuaW1wb3J0IHtQYXR0ZXJuc30gZnJvbSAnLi9yb20vcGF0dGVybi5qcyc7XG5pbXBvcnQge1JhbmRvbU51bWJlcnN9IGZyb20gJy4vcm9tL3JhbmRvbW51bWJlcnMuanMnO1xuaW1wb3J0IHtTY2FsaW5nfSBmcm9tICcuL3JvbS9zY2FsaW5nLmpzJztcbmltcG9ydCB7U2NyZWVuLCBTY3JlZW5zfSBmcm9tICcuL3JvbS9zY3JlZW4uanMnO1xuaW1wb3J0IHtTaG9wc30gZnJvbSAnLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge1Nsb3RzfSBmcm9tICcuL3JvbS9zbG90cy5qcyc7XG5pbXBvcnQge1Nwb2lsZXJ9IGZyb20gJy4vcm9tL3Nwb2lsZXIuanMnO1xuaW1wb3J0IHtUZWxlcGF0aHl9IGZyb20gJy4vcm9tL3RlbGVwYXRoeS5qcyc7XG5pbXBvcnQge1RpbGVBbmltYXRpb259IGZyb20gJy4vcm9tL3RpbGVhbmltYXRpb24uanMnO1xuaW1wb3J0IHtUaWxlRWZmZWN0c30gZnJvbSAnLi9yb20vdGlsZWVmZmVjdHMuanMnO1xuaW1wb3J0IHtUaWxlc2V0c30gZnJvbSAnLi9yb20vdGlsZXNldC5qcyc7XG5pbXBvcnQge1Rvd25XYXJwfSBmcm9tICcuL3JvbS90b3dud2FycC5qcyc7XG5pbXBvcnQge1RyaWdnZXJ9IGZyb20gJy4vcm9tL3RyaWdnZXIuanMnO1xuaW1wb3J0IHtTZWdtZW50LCBoZXgsIHNlcSwgZnJlZX0gZnJvbSAnLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge1dpbGRXYXJwfSBmcm9tICcuL3JvbS93aWxkd2FycC5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi91bmlvbmZpbmQuanMnO1xuXG5jb25zdCB7JDBlLCAkMGYsICQxMH0gPSBTZWdtZW50O1xuXG5leHBvcnQgdHlwZSBNb2R1bGVJZCA9IHN5bWJvbCAmIHtfX21vZHVsZUlkX186IG5ldmVyfTtcbmV4cG9ydCBjb25zdCBNb2R1bGVJZCA9IChuYW1lOiBzdHJpbmcpID0+IFN5bWJvbChuYW1lKSBhcyBNb2R1bGVJZDtcblxuLy8gQSBrbm93biBsb2NhdGlvbiBmb3IgZGF0YSBhYm91dCBzdHJ1Y3R1cmFsIGNoYW5nZXMgd2UndmUgbWFkZSB0byB0aGUgcm9tLlxuLy8gVGhlIHRyaWNrIGlzIHRvIGZpbmQgYSBzdWl0YWJsZSByZWdpb24gb2YgUk9NIHRoYXQncyBib3RoIHVudXNlZCAqYW5kKlxuLy8gaXMgbm90IHBhcnRpY3VsYXJseSAqdXNhYmxlKiBmb3Igb3VyIHB1cnBvc2VzLiAgVGhlIGJvdHRvbSAzIHJvd3Mgb2YgdGhlXG4vLyB2YXJpb3VzIHNpbmdsZS1zY3JlZW4gbWFwcyBhcmUgYWxsIGVmZmVjdGl2ZWx5IHVudXNlZCwgc28gdGhhdCBnaXZlcyA0OFxuLy8gYnl0ZXMgcGVyIG1hcC4gIFNob3BzICgxNDAwMC4uMTQyZmYpIGFsc28gaGF2ZSBhIGdpYW50IGFyZWEgdXAgdG9wIHRoYXRcbi8vIGNvdWxkIHBvc3NpYmx5IGJlIHVzYWJsZSwgdGhvdWdoIHdlJ2QgbmVlZCB0byB0ZWFjaCB0aGUgdGlsZS1yZWFkaW5nIGNvZGVcbi8vIHRvIGlnbm9yZSB3aGF0ZXZlcidzIHdyaXR0ZW4gdGhlcmUsIHNpbmNlIGl0ICppcyogdmlzaWJsZSBiZWZvcmUgdGhlIG1lbnVcbi8vIHBvcHMgdXAuICBUaGVzZSBhcmUgYmlnIGVub3VnaCByZWdpb25zIHRoYXQgd2UgY291bGQgZXZlbiBjb25zaWRlciB1c2luZ1xuLy8gdGhlbSB2aWEgcGFnZS1zd2FwcGluZyB0byBnZXQgZXh0cmEgZGF0YSBpbiBhcmJpdHJhcnkgY29udGV4dHMuXG5cbi8vIFNob3BzIGFyZSBwYXJ0aWN1bGFybHkgbmljZSBiZWNhdXNlIHRoZXkncmUgYWxsIDAwIGluIHZhbmlsbGEuXG4vLyBPdGhlciBwb3NzaWJsZSByZWdpb25zOlxuLy8gICAtIDQ4IGJ5dGVzIGF0ICRmZmMwIChtZXphbWUgc2hyaW5lKSA9PiAkZmZlMCBpcyBhbGwgJGZmIGluIHZhbmlsbGEuXG5cbmV4cG9ydCBjbGFzcyBSb20ge1xuXG4gIC8vIFRoZXNlIHZhbHVlcyBjYW4gYmUgcXVlcmllZCB0byBkZXRlcm1pbmUgaG93IHRvIHBhcnNlIGFueSBnaXZlbiByb20uXG4gIC8vIFRoZXkncmUgYWxsIGFsd2F5cyB6ZXJvIGZvciB2YW5pbGxhXG4gIHN0YXRpYyByZWFkb25seSBPTUlUX0lURU1fR0VUX0RBVEFfU1VGRklYICAgID0gUm9tT3B0aW9uLmJpdCgweDE0MmMwLCAwKTtcbiAgc3RhdGljIHJlYWRvbmx5IE9NSVRfTE9DQUxfRElBTE9HX1NVRkZJWCAgICAgPSBSb21PcHRpb24uYml0KDB4MTQyYzAsIDEpO1xuICBzdGF0aWMgcmVhZG9ubHkgQ09NUFJFU1NFRF9NQVBEQVRBICAgICAgICAgICA9IFJvbU9wdGlvbi5iaXQoMHgxNDJjMCwgMik7XG4gIHN0YXRpYyByZWFkb25seSBXUklURV9NT05TVEVSX05BTUVTICAgICAgICAgID0gUm9tT3B0aW9uLmJpdCgweDE0MmMwLCAzKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNIT1BfQ09VTlQgICAgICAgICAgICAgICAgICAgPSBSb21PcHRpb24uYnl0ZSgweDE0MmMxKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNDQUxJTkdfTEVWRUxTICAgICAgICAgICAgICAgPSBSb21PcHRpb24uYnl0ZSgweDE0MmMyKTtcbiAgc3RhdGljIHJlYWRvbmx5IFVOSVFVRV9JVEVNX1RBQkxFICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQwKTtcbiAgc3RhdGljIHJlYWRvbmx5IFNIT1BfREFUQV9UQUJMRVMgICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQzKTtcbiAgc3RhdGljIHJlYWRvbmx5IFRFTEVQQVRIWV9UQUJMRVMgICAgICAgICAgICAgPSBSb21PcHRpb24uYWRkcmVzcygweDE0MmQ2KTtcblxuICByZWFkb25seSBwcmc6IFVpbnQ4QXJyYXk7XG4gIHJlYWRvbmx5IGNocjogVWludDhBcnJheTtcblxuICAvLyBUT0RPIC0gd291bGQgYmUgbmljZSB0byBlbGltaW5hdGUgdGhlIGR1cGxpY2F0aW9uIGJ5IG1vdmluZ1xuICAvLyB0aGUgY3RvcnMgaGVyZSwgYnV0IHRoZXJlJ3MgbG90cyBvZiBwcmVyZXFzIGFuZCBkZXBlbmRlbmN5XG4gIC8vIG9yZGVyaW5nLCBhbmQgd2UgbmVlZCB0byBtYWtlIHRoZSBBREpVU1RNRU5UUywgZXRjLlxuICAvL3JlYWRvbmx5IGFyZWFzOiBBcmVhcztcbiAgcmVhZG9ubHkgc2NyZWVuczogU2NyZWVucztcbiAgcmVhZG9ubHkgdGlsZXNldHM6IFRpbGVzZXRzO1xuICByZWFkb25seSB0aWxlRWZmZWN0czogVGlsZUVmZmVjdHNbXTtcbiAgcmVhZG9ubHkgdHJpZ2dlcnM6IFRyaWdnZXJbXTtcbiAgcmVhZG9ubHkgcGF0dGVybnM6IFBhdHRlcm5zO1xuICByZWFkb25seSBwYWxldHRlczogUGFsZXR0ZVtdO1xuICByZWFkb25seSBsb2NhdGlvbnM6IExvY2F0aW9ucztcbiAgcmVhZG9ubHkgdGlsZUFuaW1hdGlvbnM6IFRpbGVBbmltYXRpb25bXTtcbiAgcmVhZG9ubHkgaGl0Ym94ZXM6IEhpdGJveFtdO1xuICByZWFkb25seSBvYmplY3RBY3Rpb25zOiBPYmplY3RBY3Rpb25zO1xuICByZWFkb25seSBvYmplY3RzOiBPYmplY3RzO1xuICByZWFkb25seSBhZEhvY1NwYXduczogQWRIb2NTcGF3bltdO1xuICByZWFkb25seSBtZXRhc2NyZWVuczogTWV0YXNjcmVlbnM7XG4gIHJlYWRvbmx5IG1ldGFzcHJpdGVzOiBNZXRhc3ByaXRlW107XG4gIHJlYWRvbmx5IG1ldGF0aWxlc2V0czogTWV0YXRpbGVzZXRzO1xuICByZWFkb25seSBpdGVtR2V0czogSXRlbUdldHM7XG4gIHJlYWRvbmx5IGl0ZW1zOiBJdGVtcztcbiAgcmVhZG9ubHkgc2hvcHM6IFNob3BzO1xuICByZWFkb25seSBzbG90czogU2xvdHM7XG4gIHJlYWRvbmx5IG5wY3M6IE5wY3M7XG4gIHJlYWRvbmx5IGJvc3NLaWxsczogQm9zc0tpbGxbXTtcbiAgcmVhZG9ubHkgYm9zc2VzOiBCb3NzZXM7XG4gIHJlYWRvbmx5IHdpbGRXYXJwOiBXaWxkV2FycDtcbiAgcmVhZG9ubHkgdG93bldhcnA6IFRvd25XYXJwO1xuICByZWFkb25seSBmbGFnczogRmxhZ3M7XG4gIHJlYWRvbmx5IGNvaW5Ecm9wczogQ29pbkRyb3BzO1xuICByZWFkb25seSBzY2FsaW5nOiBTY2FsaW5nO1xuICByZWFkb25seSByYW5kb21OdW1iZXJzOiBSYW5kb21OdW1iZXJzO1xuXG4gIHJlYWRvbmx5IHRlbGVwYXRoeTogVGVsZXBhdGh5O1xuICByZWFkb25seSBtZXNzYWdlczogTWVzc2FnZXM7XG5cbiAgcmVhZG9ubHkgbW9kdWxlcyA9IG5ldyBNYXA8TW9kdWxlSWQsIE1vZHVsZT4oKTtcblxuICBzcG9pbGVyPzogU3BvaWxlcjtcblxuICAvLyBOT1RFOiBUaGUgZm9sbG93aW5nIHByb3BlcnRpZXMgbWF5IGJlIGNoYW5nZWQgYmV0d2VlbiByZWFkaW5nIGFuZCB3cml0aW5nXG4gIC8vIHRoZSByb20uICBJZiB0aGlzIGhhcHBlbnMsIHRoZSB3cml0dGVuIHJvbSB3aWxsIGhhdmUgZGlmZmVyZW50IG9wdGlvbnMuXG4gIC8vIFRoaXMgaXMgYW4gZWZmZWN0aXZlIHdheSB0byBjb252ZXJ0IGJldHdlZW4gdHdvIHN0eWxlcy5cblxuICAvLyBNYXggbnVtYmVyIG9mIHNob3BzLiAgVmFyaW91cyBibG9ja3Mgb2YgbWVtb3J5IHJlcXVpcmUga25vd2luZyB0aGlzIG51bWJlclxuICAvLyB0byBhbGxvY2F0ZS5cbiAgc2hvcENvdW50OiBudW1iZXI7XG4gIC8vIE51bWJlciBvZiBzY2FsaW5nIGxldmVscy4gIERldGVybWluZXMgdGhlIHNpemUgb2YgdGhlIHNjYWxpbmcgdGFibGVzLlxuICBzY2FsaW5nTGV2ZWxzOiBudW1iZXI7XG5cbiAgLy8gQWRkcmVzcyB0byByZWFkL3dyaXRlIHRoZSBiaXRmaWVsZCBpbmRpY2F0aW5nIHVuaXF1ZSBpdGVtcy5cbiAgdW5pcXVlSXRlbVRhYmxlQWRkcmVzczogbnVtYmVyO1xuICAvLyBBZGRyZXNzIG9mIG5vcm1hbGl6ZWQgcHJpY2VzIHRhYmxlLCBpZiBwcmVzZW50LiAgSWYgdGhpcyBpcyBhYnNlbnQgdGhlbiB3ZVxuICAvLyBhc3N1bWUgcHJpY2VzIGFyZSBub3Qgbm9ybWFsaXplZCBhbmQgYXJlIGF0IHRoZSBub3JtYWwgcGF3biBzaG9wIGFkZHJlc3MuXG4gIHNob3BEYXRhVGFibGVzQWRkcmVzczogbnVtYmVyO1xuICAvLyBBZGRyZXNzIG9mIHJlYXJyYW5nZWQgdGVsZXBhdGh5IHRhYmxlcy5cbiAgdGVsZXBhdGh5VGFibGVzQWRkcmVzczogbnVtYmVyO1xuICAvLyBXaGV0aGVyIHRoZSB0cmFpbGluZyAkZmYgc2hvdWxkIGJlIG9taXR0ZWQgZnJvbSB0aGUgSXRlbUdldERhdGEgdGFibGUuXG4gIG9taXRJdGVtR2V0RGF0YVN1ZmZpeDogYm9vbGVhbjtcbiAgLy8gV2hldGhlciB0aGUgdHJhaWxpbmcgYnl0ZSBvZiBlYWNoIExvY2FsRGlhbG9nIGlzIG9taXR0ZWQuICBUaGlzIGFmZmVjdHNcbiAgLy8gYm90aCByZWFkaW5nIGFuZCB3cml0aW5nIHRoZSB0YWJsZS4gIE1heSBiZSBpbmZlcnJlZCB3aGlsZSByZWFkaW5nLlxuICBvbWl0TG9jYWxEaWFsb2dTdWZmaXg6IGJvb2xlYW47XG4gIC8vIFdoZXRoZXIgbWFwZGF0YSBoYXMgYmVlbiBjb21wcmVzc2VkLlxuICBjb21wcmVzc2VkTWFwRGF0YTogYm9vbGVhbjtcbiAgLy8gV2hldGhlciBtb25zdGVyIG5hbWVzIGFyZSBzdG9yZWQgaW4gdGhlIGV4cGFuZGVkIFBSRy5cbiAgd3JpdGVNb25zdGVyTmFtZXM6IGJvb2xlYW47XG5cbiAgLy8gQWxsb2NhdGVkIHRyaWdnZXJzXG4gIGFsbG9jYXRlZFRyaWdnZXJzID0gbmV3IE1hcDxUcmlnZ2VyLkN1c3RvbSwgbnVtYmVyPigpO1xuXG4gIGNvbnN0cnVjdG9yKHJvbTogVWludDhBcnJheSkge1xuICAgIGNvbnN0IHByZ1NpemUgPSByb21bNF0gKiAweDQwMDA7XG4gICAgLy8gTk9URTogY2hyU2l6ZSA9IHJvbVs1XSAqIDB4MjAwMDtcbiAgICBjb25zdCBwcmdTdGFydCA9IDB4MTAgKyAocm9tWzZdICYgNCA/IDUxMiA6IDApO1xuICAgIGNvbnN0IHByZ0VuZCA9IHByZ1N0YXJ0ICsgcHJnU2l6ZTtcbiAgICB0aGlzLnByZyA9IHJvbS5zdWJhcnJheShwcmdTdGFydCwgcHJnRW5kKTtcbiAgICB0aGlzLmNociA9IHJvbS5zdWJhcnJheShwcmdFbmQpO1xuXG4gICAgdGhpcy5zaG9wQ291bnQgPSBSb20uU0hPUF9DT1VOVC5nZXQocm9tKTtcbiAgICB0aGlzLnNjYWxpbmdMZXZlbHMgPSBSb20uU0NBTElOR19MRVZFTFMuZ2V0KHJvbSk7XG4gICAgdGhpcy51bmlxdWVJdGVtVGFibGVBZGRyZXNzID0gUm9tLlVOSVFVRV9JVEVNX1RBQkxFLmdldChyb20pO1xuICAgIHRoaXMuc2hvcERhdGFUYWJsZXNBZGRyZXNzID0gUm9tLlNIT1BfREFUQV9UQUJMRVMuZ2V0KHJvbSk7XG4gICAgdGhpcy50ZWxlcGF0aHlUYWJsZXNBZGRyZXNzID0gUm9tLlRFTEVQQVRIWV9UQUJMRVMuZ2V0KHJvbSk7XG4gICAgdGhpcy5vbWl0SXRlbUdldERhdGFTdWZmaXggPSBSb20uT01JVF9JVEVNX0dFVF9EQVRBX1NVRkZJWC5nZXQocm9tKTtcbiAgICB0aGlzLm9taXRMb2NhbERpYWxvZ1N1ZmZpeCA9IFJvbS5PTUlUX0xPQ0FMX0RJQUxPR19TVUZGSVguZ2V0KHJvbSk7XG4gICAgdGhpcy5jb21wcmVzc2VkTWFwRGF0YSA9IFJvbS5DT01QUkVTU0VEX01BUERBVEEuZ2V0KHJvbSk7XG4gICAgdGhpcy53cml0ZU1vbnN0ZXJOYW1lcyA9IFJvbS5XUklURV9NT05TVEVSX05BTUVTLmdldChyb20pO1xuXG4gICAgLy8gaWYgKGNyYzMyKHJvbSkgPT09IEVYUEVDVEVEX0NSQzMyKSB7XG4gICAgZm9yIChjb25zdCBbYWRkcmVzcywgb2xkLCB2YWx1ZV0gb2YgQURKVVNUTUVOVFMpIHtcbiAgICAgIGlmICh0aGlzLnByZ1thZGRyZXNzXSA9PT0gb2xkKSB0aGlzLnByZ1thZGRyZXNzXSA9IHZhbHVlO1xuICAgIH1cblxuICAgIC8vIExvYWQgdXAgYSBidW5jaCBvZiBkYXRhIHRhYmxlcy4gIFRoaXMgd2lsbCBpbmNsdWRlIGEgbGFyZ2UgbnVtYmVyIG9mIHRoZVxuICAgIC8vIGRhdGEgdGFibGVzIGluIHRoZSBST00uICBUaGUgaWRlYSBpcyB0aGF0IHdlIGNhbiBlZGl0IHRoZSBhcnJheXMgbG9jYWxseVxuICAgIC8vIGFuZCB0aGVuIGhhdmUgYSBcImNvbW1pdFwiIGZ1bmN0aW9uIHRoYXQgcmVidWlsZHMgdGhlIFJPTSB3aXRoIHRoZSBuZXdcbiAgICAvLyBhcnJheXMuICBXZSBtYXkgbmVlZCB0byB3cml0ZSBhIFwicGFnZWQgYWxsb2NhdG9yXCIgdGhhdCBjYW4gYWxsb2NhdGVcbiAgICAvLyBjaHVua3Mgb2YgUk9NIGluIGEgZ2l2ZW4gcGFnZS4gIFByb2JhYmx5IHdhbnQgdG8gdXNlIGEgZ3JlZWR5IGFsZ29yaXRobVxuICAgIC8vIHdoZXJlIHdlIHN0YXJ0IHdpdGggdGhlIGJpZ2dlc3QgY2h1bmsgYW5kIHB1dCBpdCBpbiB0aGUgc21hbGxlc3Qgc3BvdFxuICAgIC8vIHRoYXQgZml0cyBpdC4gIFByZXN1bWFibHkgd2Uga25vdyB0aGUgc2l6ZXMgdXAgZnJvbnQgZXZlbiBiZWZvcmUgd2UgaGF2ZVxuICAgIC8vIGFsbCB0aGUgYWRkcmVzc2VzLCBzbyB3ZSBjb3VsZCBkbyBhbGwgdGhlIGFsbG9jYXRpb24gYXQgb25jZSAtIHByb2JhYmx5XG4gICAgLy8gcmV0dXJuaW5nIGEgdG9rZW4gZm9yIGVhY2ggYWxsb2NhdGlvbiBhbmQgdGhlbiBhbGwgdG9rZW5zIGdldCBmaWxsZWQgaW5cbiAgICAvLyBhdCBvbmNlIChhY3R1YWwgcHJvbWlzZXMgd291bGQgYmUgbW9yZSB1bndlaWxkeSkuXG4gICAgLy8gVHJpY2t5IC0gd2hhdCBhYm91dCBzaGFyZWQgZWxlbWVudHMgb2YgZGF0YSB0YWJsZXMgLSB3ZSBwdWxsIHRoZW1cbiAgICAvLyBzZXBhcmF0ZWx5LCBidXQgd2UnbGwgbmVlZCB0byByZS1jb2FsZXNjZSB0aGVtLiAgQnV0IHRoaXMgcmVxdWlyZXNcbiAgICAvLyBrbm93aW5nIHRoZWlyIGNvbnRlbnRzIEJFRk9SRSBhbGxvY2F0aW5nIHRoZWlyIHNwYWNlLiAgU28gd2UgbmVlZCB0d29cbiAgICAvLyBhbGxvY2F0ZSBtZXRob2RzIC0gb25lIHdoZXJlIHRoZSBjb250ZW50IGlzIGtub3duIGFuZCBvbmUgd2hlcmUgb25seSB0aGVcbiAgICAvLyBsZW5ndGggaXMga25vd24uXG4gICAgdGhpcy50aWxlc2V0cyA9IG5ldyBUaWxlc2V0cyh0aGlzKTtcbiAgICB0aGlzLnRpbGVFZmZlY3RzID0gc2VxKDExLCBpID0+IG5ldyBUaWxlRWZmZWN0cyh0aGlzLCBpICsgMHhiMykpO1xuICAgIHRoaXMuc2NyZWVucyA9IG5ldyBTY3JlZW5zKHRoaXMpO1xuICAgIHRoaXMubWV0YXRpbGVzZXRzID0gbmV3IE1ldGF0aWxlc2V0cyh0aGlzKTtcbiAgICB0aGlzLm1ldGFzY3JlZW5zID0gbmV3IE1ldGFzY3JlZW5zKHRoaXMpO1xuICAgIHRoaXMudHJpZ2dlcnMgPSBzZXEoMHg0MywgaSA9PiBuZXcgVHJpZ2dlcih0aGlzLCAweDgwIHwgaSkpO1xuICAgIHRoaXMucGF0dGVybnMgPSBuZXcgUGF0dGVybnModGhpcyk7XG4gICAgdGhpcy5wYWxldHRlcyA9IHNlcSgweDEwMCwgaSA9PiBuZXcgUGFsZXR0ZSh0aGlzLCBpKSk7XG4gICAgdGhpcy5sb2NhdGlvbnMgPSBuZXcgTG9jYXRpb25zKHRoaXMpO1xuICAgIHRoaXMudGlsZUFuaW1hdGlvbnMgPSBzZXEoNCwgaSA9PiBuZXcgVGlsZUFuaW1hdGlvbih0aGlzLCBpKSk7XG4gICAgdGhpcy5oaXRib3hlcyA9IHNlcSgyNCwgaSA9PiBuZXcgSGl0Ym94KHRoaXMsIGkpKTtcbiAgICB0aGlzLm9iamVjdEFjdGlvbnMgPSBuZXcgT2JqZWN0QWN0aW9ucyh0aGlzKTtcbiAgICB0aGlzLm9iamVjdHMgPSBuZXcgT2JqZWN0cyh0aGlzKTtcbiAgICB0aGlzLmFkSG9jU3Bhd25zID0gc2VxKDB4NjAsIGkgPT4gbmV3IEFkSG9jU3Bhd24odGhpcywgaSkpO1xuICAgIHRoaXMubWV0YXNwcml0ZXMgPSBzZXEoMHgxMDAsIGkgPT4gbmV3IE1ldGFzcHJpdGUodGhpcywgaSkpO1xuICAgIHRoaXMubWVzc2FnZXMgPSBuZXcgTWVzc2FnZXModGhpcyk7XG4gICAgdGhpcy50ZWxlcGF0aHkgPSBuZXcgVGVsZXBhdGh5KHRoaXMpO1xuICAgIHRoaXMuaXRlbUdldHMgPSBuZXcgSXRlbUdldHModGhpcyk7XG4gICAgdGhpcy5pdGVtcyA9IG5ldyBJdGVtcyh0aGlzKTtcbiAgICB0aGlzLnNob3BzID0gbmV3IFNob3BzKHRoaXMpOyAvLyBOT1RFOiBkZXBlbmRzIG9uIGxvY2F0aW9ucyBhbmQgb2JqZWN0c1xuICAgIHRoaXMuc2xvdHMgPSBuZXcgU2xvdHModGhpcyk7XG4gICAgdGhpcy5ucGNzID0gbmV3IE5wY3ModGhpcyk7XG4gICAgdGhpcy5ib3NzS2lsbHMgPSBzZXEoMHhlLCBpID0+IG5ldyBCb3NzS2lsbCh0aGlzLCBpKSk7XG4gICAgdGhpcy53aWxkV2FycCA9IG5ldyBXaWxkV2FycCh0aGlzKTtcbiAgICB0aGlzLnRvd25XYXJwID0gbmV3IFRvd25XYXJwKHRoaXMpO1xuICAgIHRoaXMuY29pbkRyb3BzID0gbmV3IENvaW5Ecm9wcyh0aGlzKTtcbiAgICB0aGlzLmZsYWdzID0gbmV3IEZsYWdzKHRoaXMpO1xuICAgIHRoaXMuYm9zc2VzID0gbmV3IEJvc3Nlcyh0aGlzKTsgLy8gTk9URTogbXVzdCBiZSBhZnRlciBOcGNzIGFuZCBGbGFnc1xuICAgIHRoaXMuc2NhbGluZyA9IG5ldyBTY2FsaW5nKHRoaXMpO1xuICAgIHRoaXMucmFuZG9tTnVtYmVycyA9IG5ldyBSYW5kb21OdW1iZXJzKHRoaXMpO1xuXG4gICAgLy8gLy8gVE9ETyAtIGNvbnNpZGVyIHBvcHVsYXRpbmcgdGhpcyBsYXRlcj9cbiAgICAvLyAvLyBIYXZpbmcgdGhpcyBhdmFpbGFibGUgbWFrZXMgaXQgZWFzaWVyIHRvIHNldCBleGl0cywgZXRjLlxuICAgIGZvciAoY29uc3QgbG9jIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAobG9jLnVzZWQpIGxvYy5sYXp5SW5pdGlhbGl6YXRpb24oKTsgLy8gdHJpZ2dlciB0aGUgZ2V0dGVyXG4gICAgfVxuICB9XG5cbiAgdHJpZ2dlcihpZDogbnVtYmVyKTogVHJpZ2dlciB7XG4gICAgaWYgKGlkIDwgMHg4MCB8fCBpZCA+IDB4ZmYpIHRocm93IG5ldyBFcnJvcihgQmFkIHRyaWdnZXIgaWQgJCR7aGV4KGlkKX1gKTtcbiAgICByZXR1cm4gdGhpcy50cmlnZ2Vyc1tpZCAmIDB4N2ZdO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNyb3NzLXJlZmVyZW5jZSBtb25zdGVycy9tZXRhc3ByaXRlcy9tZXRhdGlsZXMvc2NyZWVucyB3aXRoIHBhdHRlcm5zL3BhbGV0dGVzXG4gIC8vIGdldCBtb25zdGVycygpOiBPYmplY3REYXRhW10ge1xuICAvLyAgIGNvbnN0IG1vbnN0ZXJzID0gbmV3IFNldDxPYmplY3REYXRhPigpO1xuICAvLyAgIGZvciAoY29uc3QgbCBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAvLyAgICAgaWYgKCFsLnVzZWQgfHwgIWwuaGFzU3Bhd25zKSBjb250aW51ZTtcbiAgLy8gICAgIGZvciAoY29uc3QgbyBvZiBsLnNwYXducykge1xuICAvLyAgICAgICBpZiAoby5pc01vbnN0ZXIoKSkgbW9uc3RlcnMuYWRkKHRoaXMub2JqZWN0c1tvLm1vbnN0ZXJJZF0pO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gWy4uLm1vbnN0ZXJzXS5zb3J0KCh4LCB5KSA9PiAoeC5pZCAtIHkuaWQpKTtcbiAgLy8gfVxuXG4gIGdldCBwcm9qZWN0aWxlcygpOiBPYmplY3REYXRhW10ge1xuICAgIGNvbnN0IHByb2plY3RpbGVzID0gbmV3IFNldDxPYmplY3REYXRhPigpO1xuICAgIGZvciAoY29uc3QgbSBvZiB0aGlzLm9iamVjdHMuZmlsdGVyKG8gPT4gbyBpbnN0YW5jZW9mIE1vbnN0ZXIpKSB7XG4gICAgICBpZiAobS5jaGlsZCkge1xuICAgICAgICBwcm9qZWN0aWxlcy5hZGQodGhpcy5vYmplY3RzW3RoaXMuYWRIb2NTcGF3bnNbbS5jaGlsZF0ub2JqZWN0SWRdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFsuLi5wcm9qZWN0aWxlc10uc29ydCgoeCwgeSkgPT4gKHguaWQgLSB5LmlkKSk7XG4gIH1cblxuICBnZXQgbW9uc3RlckdyYXBoaWNzKCkge1xuICAgIGNvbnN0IGdmeDoge1tpZDogc3RyaW5nXTpcbiAgICAgICAgICAgICAgICB7W2luZm86IHN0cmluZ106XG4gICAgICAgICAgICAgICAgIHtzbG90OiBudW1iZXIsIHBhdDogbnVtYmVyLCBwYWw6IG51bWJlcn19fSA9IHt9O1xuICAgIGZvciAoY29uc3QgbCBvZiB0aGlzLmxvY2F0aW9ucykge1xuICAgICAgaWYgKCFsLnVzZWQgfHwgIWwuaGFzU3Bhd25zKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgbyBvZiBsLnNwYXducykge1xuICAgICAgICBpZiAoIShvLmRhdGFbMl0gJiA3KSkge1xuICAgICAgICAgIGNvbnN0IHNsb3QgPSBvLmRhdGFbMl0gJiAweDgwID8gMSA6IDA7XG4gICAgICAgICAgY29uc3QgaWQgPSBoZXgoby5kYXRhWzNdICsgMHg1MCk7XG4gICAgICAgICAgY29uc3QgZGF0YSA9IGdmeFtpZF0gPSBnZnhbaWRdIHx8IHt9O1xuICAgICAgICAgIGRhdGFbYCR7c2xvdH06JHtsLnNwcml0ZVBhdHRlcm5zW3Nsb3RdLnRvU3RyaW5nKDE2KX06JHtcbiAgICAgICAgICAgICAgIGwuc3ByaXRlUGFsZXR0ZXNbc2xvdF0udG9TdHJpbmcoMTYpfWBdXG4gICAgICAgICAgICA9IHtwYWw6IGwuc3ByaXRlUGFsZXR0ZXNbc2xvdF0sXG4gICAgICAgICAgICAgICBwYXQ6IGwuc3ByaXRlUGF0dGVybnNbc2xvdF0sXG4gICAgICAgICAgICAgICBzbG90LFxuICAgICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBnZng7XG4gIH1cblxuICBnZXQgbG9jYXRpb25Nb25zdGVycygpIHtcbiAgICBjb25zdCBtOiB7W2lkOiBzdHJpbmddOiB7W2luZm86IHN0cmluZ106IG51bWJlcn19ID0ge307XG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWwudXNlZCB8fCAhbC5oYXNTcGF3bnMpIGNvbnRpbnVlO1xuICAgICAgLy8gd2hpY2ggbW9uc3RlcnMgYXJlIGluIHdoaWNoIHNsb3RzP1xuICAgICAgY29uc3Qgczoge1tpbmZvOiBzdHJpbmddOiBudW1iZXJ9ID0gbVsnJCcgKyBoZXgobC5pZCldID0ge307XG4gICAgICBmb3IgKGNvbnN0IG8gb2YgbC5zcGF3bnMpIHtcbiAgICAgICAgaWYgKCEoby5kYXRhWzJdICYgNykpIHtcbiAgICAgICAgICBjb25zdCBzbG90ID0gby5kYXRhWzJdICYgMHg4MCA/IDEgOiAwO1xuICAgICAgICAgIGNvbnN0IGlkID0gby5kYXRhWzNdICsgMHg1MDtcbiAgICAgICAgICBzW2Ake3Nsb3R9OiR7aWQudG9TdHJpbmcoMTYpfWBdID1cbiAgICAgICAgICAgICAgKHNbYCR7c2xvdH06JHtpZC50b1N0cmluZygxNil9YF0gfHwgMCkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtO1xuICB9XG5cbiAgLy8gVE9ETyAtIGZvciBlYWNoIHNwcml0ZSBwYXR0ZXJuIHRhYmxlLCBmaW5kIGFsbCB0aGUgcGFsZXR0ZXMgdGhhdCBpdCB1c2VzLlxuICAvLyBGaW5kIGFsbCB0aGUgbW9uc3RlcnMgb24gaXQuICBXZSBjYW4gcHJvYmFibHkgYWxsb3cgYW55IHBhbGV0dGUgc28gbG9uZ1xuICAvLyBhcyBvbmUgb2YgdGhlIHBhbGV0dGVzIGlzIHVzZWQgd2l0aCB0aGF0IHBhdHRlcm4uXG4gIC8vIFRPRE8gLSBtYXggbnVtYmVyIG9mIGluc3RhbmNlcyBvZiBhIG1vbnN0ZXIgb24gYW55IG1hcCAtIGkuZS4gYXZvaWQgaGF2aW5nXG4gIC8vIGZpdmUgZmx5ZXJzIG9uIHRoZSBzYW1lIG1hcCFcblxuICAvLyA0NjAgLSAwIG1lYW5zIGVpdGhlciBmbHllciBvciBzdGF0aW9uYXJ5XG4gIC8vICAgICAgICAgICAtIHN0YXRpb25hcnkgaGFzIDRhMCB+IDIwNCwyMDUsMjA2XG4gIC8vICAgICAgICAgICAgIChrcmFrZW4sIHN3YW1wIHBsYW50LCBzb3JjZXJvcilcbiAgLy8gICAgICAgNiAtIG1pbWljXG4gIC8vICAgICAgIDFmIC0gc3dpbW1lclxuICAvLyAgICAgICA1NCAtIHRvbWF0byBhbmQgYmlyZFxuICAvLyAgICAgICA1NSAtIHN3aW1tZXJcbiAgLy8gICAgICAgNTcgLSBub3JtYWxcbiAgLy8gICAgICAgNWYgLSBhbHNvIG5vcm1hbCwgYnV0IG1lZHVzYSBoZWFkIGlzIGZseWVyP1xuICAvLyAgICAgICA3NyAtIHNvbGRpZXJzLCBpY2Ugem9tYmllXG5cbi8vICAgLy8gRG9uJ3Qgd29ycnkgYWJvdXQgb3RoZXIgZGF0YXMgeWV0XG4vLyAgIHdyaXRlT2JqZWN0RGF0YSgpIHtcbi8vICAgICAvLyBidWlsZCB1cCBhIG1hcCBmcm9tIGFjdHVhbCBkYXRhIHRvIGluZGV4ZXMgdGhhdCBwb2ludCB0byBpdFxuLy8gICAgIGxldCBhZGRyID0gMHgxYWUwMDtcbi8vICAgICBjb25zdCBkYXRhcyA9IHt9O1xuLy8gICAgIGZvciAoY29uc3Qgb2JqZWN0IG9mIHRoaXMub2JqZWN0cykge1xuLy8gICAgICAgY29uc3Qgc2VyID0gb2JqZWN0LnNlcmlhbGl6ZSgpO1xuLy8gICAgICAgY29uc3QgZGF0YSA9IHNlci5qb2luKCcgJyk7XG4vLyAgICAgICBpZiAoZGF0YSBpbiBkYXRhcykge1xuLy8gLy9jb25zb2xlLmxvZyhgJCR7b2JqZWN0LmlkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLDApfTogUmV1c2luZyBleGlzdGluZyBkYXRhICQke2RhdGFzW2RhdGFdLnRvU3RyaW5nKDE2KX1gKTtcbi8vICAgICAgICAgb2JqZWN0Lm9iamVjdERhdGFCYXNlID0gZGF0YXNbZGF0YV07XG4vLyAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICBvYmplY3Qub2JqZWN0RGF0YUJhc2UgPSBhZGRyO1xuLy8gICAgICAgICBkYXRhc1tkYXRhXSA9IGFkZHI7XG4vLyAvL2NvbnNvbGUubG9nKGAkJHtvYmplY3QuaWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsMCl9OiBEYXRhIGlzIGF0ICQke1xuLy8gLy8gICAgICAgICAgICAgYWRkci50b1N0cmluZygxNil9OiAke0FycmF5LmZyb20oc2VyLCB4PT4nJCcreC50b1N0cmluZygxNikucGFkU3RhcnQoMiwwKSkuam9pbignLCcpfWApO1xuLy8gICAgICAgICBhZGRyICs9IHNlci5sZW5ndGg7XG4vLyAvLyBzZWVkIDM1MTc4MTEwMzZcbi8vICAgICAgIH1cbi8vICAgICAgIG9iamVjdC53cml0ZSgpO1xuLy8gICAgIH1cbi8vIC8vY29uc29sZS5sb2coYFdyb3RlIG9iamVjdCBkYXRhIGZyb20gJDFhYzAwIHRvICQke2FkZHIudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDUsIDApXG4vLyAvLyAgICAgICAgICAgICB9LCBzYXZpbmcgJHsweDFiZTkxIC0gYWRkcn0gYnl0ZXMuYCk7XG4vLyAgICAgcmV0dXJuIGFkZHI7XG4vLyAgIH1cblxuICBhc3NlbWJsZXIoKTogQXNzZW1ibGVyIHtcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgc2V0dGluZyBhIHNlZ21lbnQgcHJlZml4XG4gICAgcmV0dXJuIG5ldyBBc3NlbWJsZXIoKTtcbiAgfVxuXG4gIHdyaXRlRGF0YShkYXRhID0gdGhpcy5wcmcpIHtcbiAgICAvLyBXcml0ZSB0aGUgb3B0aW9ucyBmaXJzdFxuICAgIC8vIGNvbnN0IHdyaXRlciA9IG5ldyBXcml0ZXIodGhpcy5jaHIpO1xuICAgIC8vIHdyaXRlci5tb2R1bGVzLnB1c2goLi4udGhpcy5tb2R1bGVzKTtcbiAgICAvLyBNYXBEYXRhXG4gICAgLy93cml0ZXIuYWxsb2MoMHgxNDRmOCwgMHgxN2UwMCk7XG4gICAgLy8gTnBjRGF0YVxuICAgIC8vIE5PVEU6IDE5M2Y5IGlzIGFzc3VtaW5nICRmYiBpcyB0aGUgbGFzdCBsb2NhdGlvbiBJRC4gIElmIHdlIGFkZCBtb3JlIGxvY2F0aW9ucyBhdFxuICAgIC8vIHRoZSBlbmQgdGhlbiB3ZSdsbCBuZWVkIHRvIHB1c2ggdGhpcyBiYWNrIGEgZmV3IG1vcmUgYnl0ZXMuICBXZSBjb3VsZCBwb3NzaWJseVxuICAgIC8vIGRldGVjdCB0aGUgYmFkIHdyaXRlIGFuZCB0aHJvdyBhbiBlcnJvciwgYW5kL29yIGNvbXB1dGUgdGhlIG1heCBsb2NhdGlvbiBJRC5cbiAgICAvL3dyaXRlci5hbGxvYygweDE5M2Y5LCAweDFhYzAwKTtcbiAgICAvLyBPYmplY3REYXRhIChpbmRleCBhdCAxYWMwMC4uMWFlMDApXG4gICAgLy93cml0ZXIuYWxsb2MoMHgxYWUwMCwgMHgxYmQwMCk7IC8vIHNhdmUgNTEyIGJ5dGVzIGF0IGVuZCBmb3Igc29tZSBleHRyYSBjb2RlXG4gICAgY29uc3QgYSA9IHRoaXMuYXNzZW1ibGVyKCk7XG4gICAgLy8gTnBjU3Bhd25Db25kaXRpb25zXG4gICAgZnJlZShhLCAkMGUsIDB4ODc3YSwgMHg4OTVkKTtcbiAgICAvLyBOcGNEaWFsb2dcbiAgICBmcmVlKGEsICQwZSwgMHg4YWU1LCAweDk4ZjQpO1xuICAgIC8vIEl0ZW1HZXREYXRhICh0byAxZTA2NSkgKyBJdGVtVXNlRGF0YVxuICAgIGZyZWUoYSwgJDBlLCAweDlkZTYsIDB4YTAwMCk7XG4gICAgZnJlZShhLCAkMGYsIDB4YTAwMCwgMHhhMTA2KTtcbiAgICAvLyBUcmlnZ2VyRGF0YVxuICAgIC8vIE5PVEU6IFRoZXJlJ3Mgc29tZSBmcmVlIHNwYWNlIGF0IDFlM2MwLi4xZTNmMCwgYnV0IHdlIHVzZSB0aGlzIGZvciB0aGVcbiAgICAvLyBDaGVja0JlbG93Qm9zcyB0cmlnZ2Vycy5cbiAgICBmcmVlKGEsICQwZiwgMHhhMjAwLCAweGEzYzApO1xuICAgIC8vIEl0ZW1NZW51TmFtZVxuICAgIGZyZWUoYSwgJDEwLCAweDkxMWEsIDB4OTQ2OCk7XG5cbiAgICAvLyBrZWVwIGl0ZW0gJDQ5IFwiICAgICAgICBcIiB3aGljaCBpcyBhY3R1YWxseSB1c2VkIHNvbWV3aGVyZT9cbiAgICAvLyB3cml0ZXIuYWxsb2MoMHgyMTQ3MSwgMHgyMTRmMSk7IC8vIFRPRE8gLSBkbyB3ZSBuZWVkIGFueSBvZiB0aGlzP1xuICAgIC8vIEl0ZW1NZXNzYWdlTmFtZVxuICAgIC8vIHdyaXRlci5hbGxvYygweDI4ZTgxLCAweDI5MjJiKTsgLy8gTk9URTogdW5jb3ZlcmVkIHRocnUgMjk0MDBcbiAgICAvLyB3cml0ZXIuYWxsb2MoMHgyOTIyYiwgMHgyOTQwMCk7IC8vIFRPRE8gLSBuZWVkZWQ/XG4gICAgLy8gTk9URTogb25jZSB3ZSByZWxlYXNlIHRoZSBvdGhlciBtZXNzYWdlIHRhYmxlcywgdGhpcyB3aWxsIGp1c3QgYmUgb25lIGdpYW50IGJsb2NrLlxuXG4gICAgLy8gTWVzc2FnZSB0YWJsZSBwYXJ0c1xuICAgIC8vIHdyaXRlci5hbGxvYygweDI4MDAwLCAweDI4M2ZlKTtcbiAgICAvLyBNZXNzYWdlIHRhYmxlc1xuICAgIC8vIFRPRE8gLSB3ZSBkb24ndCB1c2UgdGhlIHdyaXRlciB0byBhbGxvY2F0ZSB0aGUgYWJicmV2aWF0aW9uIHRhYmxlcywgYnV0IHdlIGNvdWxkXG4gICAgLy93cml0ZXIuZnJlZSgnMHgyYTAwMCwgMHgyZmMwMCk7XG5cbiAgICAvLyBpZiAodGhpcy50ZWxlcGF0aHlUYWJsZXNBZGRyZXNzKSB7XG4gICAgLy8gICB3cml0ZXIuYWxsb2MoMHgxZDhmNCwgMHgxZGIwMCk7IC8vIGxvY2F0aW9uIHRhYmxlIGFsbCB0aGUgd2F5IHRocnUgbWFpblxuICAgIC8vIH0gZWxzZSB7XG4gICAgLy8gICB3cml0ZXIuYWxsb2MoMHgxZGE0YywgMHgxZGIwMCk7IC8vIGV4aXN0aW5nIG1haW4gdGFibGUgaXMgaGVyZS5cbiAgICAvLyB9XG5cbiAgICBjb25zdCBtb2R1bGVzID0gWy4uLnRoaXMubW9kdWxlcy52YWx1ZXMoKSwgYS5tb2R1bGUoKV07XG4gICAgY29uc3Qgd3JpdGVBbGwgPSAod3JpdGFibGVzOiBJdGVyYWJsZTx7d3JpdGUoKTogTW9kdWxlW119PikgPT4ge1xuICAgICAgZm9yIChjb25zdCB3IG9mIHdyaXRhYmxlcykge1xuICAgICAgICBtb2R1bGVzLnB1c2goLi4udy53cml0ZSgpKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLmxvY2F0aW9ucy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5vYmplY3RzLndyaXRlKCkpO1xuICAgIHdyaXRlQWxsKHRoaXMuaGl0Ym94ZXMpO1xuICAgIHdyaXRlQWxsKHRoaXMudHJpZ2dlcnMpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLm5wY3Mud3JpdGUoKSk7XG4gICAgd3JpdGVBbGwodGhpcy50aWxlc2V0cyk7XG4gICAgd3JpdGVBbGwodGhpcy50aWxlRWZmZWN0cyk7XG4gICAgd3JpdGVBbGwodGhpcy5hZEhvY1NwYXducyk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuaXRlbUdldHMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuc2xvdHMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuaXRlbXMud3JpdGUoKSk7XG4gICAgbW9kdWxlcy5wdXNoKC4uLnRoaXMuc2hvcHMud3JpdGUoKSk7XG4gICAgd3JpdGVBbGwodGhpcy5ib3NzS2lsbHMpO1xuICAgIHdyaXRlQWxsKHRoaXMucGF0dGVybnMpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLndpbGRXYXJwLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnRvd25XYXJwLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLmNvaW5Ecm9wcy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5zY2FsaW5nLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLmJvc3Nlcy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5yYW5kb21OdW1iZXJzLndyaXRlKCkpO1xuICAgIG1vZHVsZXMucHVzaCguLi50aGlzLnRlbGVwYXRoeS53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5tZXNzYWdlcy53cml0ZSgpKTtcbiAgICBtb2R1bGVzLnB1c2goLi4udGhpcy5zY3JlZW5zLndyaXRlKCkpO1xuXG4gICAgLy8gUmVzZXJ2ZSB0aGUgZ2xvYmFsIHNwYWNlIDE0MmMwLi4uMTQyZjAgPz8/XG4gICAgLy8gY29uc3QgdGhpcy5hc3NlbWJsZXIoKS5cblxuICAgIGNvbnN0IGxpbmtlciA9IG5ldyBMaW5rZXIoKTtcbiAgICBsaW5rZXIuYmFzZSh0aGlzLnByZywgMCk7XG4gICAgZm9yIChjb25zdCBtIG9mIG1vZHVsZXMpIHtcbiAgICAgIGxpbmtlci5yZWFkKG0pO1xuICAgIH1cbiAgICBjb25zdCBvdXQgPSBsaW5rZXIubGluaygpO1xuICAgIG91dC5hcHBseShkYXRhKTtcbiAgICBpZiAoZGF0YSAhPT0gdGhpcy5wcmcpIHJldHVybjsgLy8gVE9ETyAtIGNsZWFuIHRoaXMgdXBcbiAgICAvL2xpbmtlci5yZXBvcnQoKTtcbiAgICBjb25zdCBleHBvcnRzID0gbGlua2VyLmV4cG9ydHMoKTtcblxuICAgIFxuICAgIHRoaXMudW5pcXVlSXRlbVRhYmxlQWRkcmVzcyA9IGV4cG9ydHMuZ2V0KCdLZXlJdGVtRGF0YScpIS5vZmZzZXQhO1xuICAgIHRoaXMuc2hvcENvdW50ID0gMTE7XG4gICAgdGhpcy5zaG9wRGF0YVRhYmxlc0FkZHJlc3MgPSBleHBvcnRzLmdldCgnU2hvcERhdGEnKT8ub2Zmc2V0IHx8IDA7XG4gICAgLy8gRG9uJ3QgaW5jbHVkZSB0aGVzZSBpbiB0aGUgbGlua2VyPz8/XG4gICAgUm9tLlNIT1BfQ09VTlQuc2V0KHRoaXMucHJnLCB0aGlzLnNob3BDb3VudCk7XG4gICAgUm9tLlNDQUxJTkdfTEVWRUxTLnNldCh0aGlzLnByZywgdGhpcy5zY2FsaW5nTGV2ZWxzKTtcbiAgICBSb20uVU5JUVVFX0lURU1fVEFCTEUuc2V0KHRoaXMucHJnLCB0aGlzLnVuaXF1ZUl0ZW1UYWJsZUFkZHJlc3MpO1xuICAgIFJvbS5TSE9QX0RBVEFfVEFCTEVTLnNldCh0aGlzLnByZywgdGhpcy5zaG9wRGF0YVRhYmxlc0FkZHJlc3MgfHwgMCk7XG4gICAgUm9tLk9NSVRfSVRFTV9HRVRfREFUQV9TVUZGSVguc2V0KHRoaXMucHJnLCB0aGlzLm9taXRJdGVtR2V0RGF0YVN1ZmZpeCk7XG4gICAgUm9tLk9NSVRfTE9DQUxfRElBTE9HX1NVRkZJWC5zZXQodGhpcy5wcmcsIHRoaXMub21pdExvY2FsRGlhbG9nU3VmZml4KTtcbiAgICBSb20uQ09NUFJFU1NFRF9NQVBEQVRBLnNldCh0aGlzLnByZywgdGhpcy5jb21wcmVzc2VkTWFwRGF0YSk7XG4gICAgUm9tLldSSVRFX01PTlNURVJfTkFNRVMuc2V0KHRoaXMucHJnLCB0aGlzLndyaXRlTW9uc3Rlck5hbWVzKTtcbiAgfVxuXG4gIGFuYWx5emVUaWxlcygpIHtcbiAgICAvLyBGb3IgYW55IGdpdmVuIHRpbGUgaW5kZXgsIHdoYXQgc2NyZWVucyBkb2VzIGl0IGFwcGVhciBvbi5cbiAgICAvLyBGb3IgdGhvc2Ugc2NyZWVucywgd2hpY2ggdGlsZXNldHMgZG9lcyAqaXQqIGFwcGVhciBvbi5cbiAgICAvLyBUaGF0IHRpbGUgSUQgaXMgbGlua2VkIGFjcm9zcyBhbGwgdGhvc2UgdGlsZXNldHMuXG4gICAgLy8gRm9ybXMgYSBwYXJ0aXRpb25pbmcgZm9yIGVhY2ggdGlsZSBJRCA9PiB1bmlvbi1maW5kLlxuICAgIC8vIEdpdmVuIHRoaXMgcGFydGl0aW9uaW5nLCBpZiBJIHdhbnQgdG8gbW92ZSBhIHRpbGUgb24gYSBnaXZlblxuICAgIC8vIHRpbGVzZXQsIGFsbCBJIG5lZWQgdG8gZG8gaXMgZmluZCBhbm90aGVyIHRpbGUgSUQgd2l0aCB0aGVcbiAgICAvLyBzYW1lIHBhcnRpdGlvbiBhbmQgc3dhcCB0aGVtP1xuXG4gICAgLy8gTW9yZSBnZW5lcmFsbHksIHdlIGNhbiBqdXN0IHBhcnRpdGlvbiB0aGUgdGlsZXNldHMuXG5cbiAgICAvLyBGb3IgZWFjaCBzY3JlZW4sIGZpbmQgYWxsIHRpbGVzZXRzIFQgZm9yIHRoYXQgc2NyZWVuXG4gICAgLy8gVGhlbiBmb3IgZWFjaCB0aWxlIG9uIHRoZSBzY3JlZW4sIHVuaW9uIFQgZm9yIHRoYXQgdGlsZS5cblxuICAgIC8vIEdpdmVuIGEgdGlsZXNldCBhbmQgYSBtZXRhdGlsZSBJRCwgZmluZCBhbGwgdGhlIHNjcmVlbnMgdGhhdCAoMSkgYXJlIHJlbmRlcmVkXG4gICAgLy8gd2l0aCB0aGF0IHRpbGVzZXQsIGFuZCAoYikgdGhhdCBjb250YWluIHRoYXQgbWV0YXRpbGU7IHRoZW4gZmluZCBhbGwgKm90aGVyKlxuICAgIC8vIHRpbGVzZXRzIHRoYXQgdGhvc2Ugc2NyZWVucyBhcmUgZXZlciByZW5kZXJlZCB3aXRoLlxuXG4gICAgLy8gR2l2ZW4gYSBzY3JlZW4sIGZpbmQgYWxsIGF2YWlsYWJsZSBtZXRhdGlsZSBJRHMgdGhhdCBjb3VsZCBiZSBhZGRlZCB0byBpdFxuICAgIC8vIHdpdGhvdXQgY2F1c2luZyBwcm9ibGVtcyB3aXRoIG90aGVyIHNjcmVlbnMgdGhhdCBzaGFyZSBhbnkgdGlsZXNldHMuXG4gICAgLy8gIC0+IHVudXNlZCAob3IgdXNlZCBidXQgc2hhcmVkIGV4Y2x1c2l2ZWx5KSBhY3Jvc3MgYWxsIHRpbGVzZXRzIHRoZSBzY3JlZW4gbWF5IHVzZVxuXG4gICAgLy8gV2hhdCBJIHdhbnQgZm9yIHN3YXBwaW5nIGlzIHRoZSBmb2xsb3dpbmc6XG4gICAgLy8gIDEuIGZpbmQgYWxsIHNjcmVlbnMgSSB3YW50IHRvIHdvcmsgb24gPT4gdGlsZXNldHNcbiAgICAvLyAgMi4gZmluZCB1bnVzZWQgZmxhZ2dhYmJsZSB0aWxlcyBpbiB0aGUgaGFyZGVzdCBvbmUsXG4gICAgLy8gICAgIHdoaWNoIGFyZSBhbHNvIElTT0xBVEVEIGluIHRoZSBvdGhlcnMuXG4gICAgLy8gIDMuIHdhbnQgdGhlc2UgdGlsZXMgdG8gYmUgdW51c2VkIGluIEFMTCByZWxldmFudCB0aWxlc2V0c1xuICAgIC8vICA0LiB0byBtYWtlIHRoaXMgc28sIGZpbmQgKm90aGVyKiB1bnVzZWQgZmxhZ2dhYmxlIHRpbGVzIGluIG90aGVyIHRpbGVzZXRzXG4gICAgLy8gIDUuIHN3YXAgdGhlIHVudXNlZCB3aXRoIHRoZSBpc29sYXRlZCB0aWxlcyBpbiB0aGUgb3RoZXIgdGlsZXNldHNcblxuICAgIC8vIENhdmVzOlxuICAgIC8vICAwYTogICAgICA5MCAvIDljXG4gICAgLy8gIDE1OiA4MCAvIDkwIC8gOWNcbiAgICAvLyAgMTk6ICAgICAgOTAgICAgICAod2lsbCBhZGQgdG8gODA/KVxuICAgIC8vICAzZTogICAgICA5MFxuICAgIC8vXG4gICAgLy8gSWRlYWxseSB3ZSBjb3VsZCByZXVzZSA4MCdzIDEvMi8zLzQgZm9yIHRoaXNcbiAgICAvLyAgMDE6IDkwIHwgOTQgOWNcbiAgICAvLyAgMDI6IDkwIHwgOTQgOWNcbiAgICAvLyAgMDM6ICAgICAgOTQgOWNcbiAgICAvLyAgMDQ6IDkwIHwgOTQgOWNcbiAgICAvL1xuICAgIC8vIE5lZWQgNCBvdGhlciBmbGFnZ2FibGUgdGlsZSBpbmRpY2VzIHdlIGNhbiBzd2FwIHRvP1xuICAgIC8vICAgOTA6ID0+ICgxLDIgbmVlZCBmbGFnZ2FibGU7IDMgdW51c2VkOyA0IGFueSkgPT4gMDcsIDBlLCAxMCwgMTIsIDEzLCAuLi4sIDIwLCAyMSwgMjIsIC4uLlxuICAgIC8vICAgOTQgOWM6ID0+IGRvbid0IG5lZWQgYW55IGZsYWdnYWJsZSA9PiAwNSwgM2MsIDY4LCA4MywgODgsIDg5LCA4YSwgOTAsIC4uLlxuICB9XG5cbiAgZGlzam9pbnRUaWxlc2V0cygpIHtcbiAgICBjb25zdCB0aWxlc2V0QnlTY3JlZW46IEFycmF5PFNldDxudW1iZXI+PiA9IFtdO1xuICAgIGZvciAoY29uc3QgbG9jIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWxvYy51c2VkKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHRpbGVzZXQgPSBsb2MudGlsZXNldDtcbiAgICAgIC8vY29uc3QgZXh0ID0gbG9jLnNjcmVlblBhZ2U7XG4gICAgICBmb3IgKGNvbnN0IHJvdyBvZiBsb2Muc2NyZWVucykge1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2Ygcm93KSB7XG4gICAgICAgICAgKHRpbGVzZXRCeVNjcmVlbltzXSB8fCAodGlsZXNldEJ5U2NyZWVuW3NdID0gbmV3IFNldCgpKSkuYWRkKHRpbGVzZXQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHRpbGVzID0gc2VxKDI1NiwgKCkgPT4gbmV3IFVuaW9uRmluZDxudW1iZXI+KCkpO1xuICAgIGZvciAobGV0IHMgPSAwOyBzIDwgdGlsZXNldEJ5U2NyZWVuLmxlbmd0aDsgcysrKSB7XG4gICAgICBpZiAoIXRpbGVzZXRCeVNjcmVlbltzXSkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IHQgb2YgdGhpcy5zY3JlZW5zW3NdLmFsbFRpbGVzU2V0KCkpIHtcbiAgICAgICAgdGlsZXNbdF0udW5pb24oWy4uLnRpbGVzZXRCeVNjcmVlbltzXV0pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBvdXRwdXRcbiAgICBmb3IgKGxldCB0ID0gMDsgdCA8IHRpbGVzLmxlbmd0aDsgdCsrKSB7XG4gICAgICBjb25zdCBwID0gdGlsZXNbdF0uc2V0cygpXG4gICAgICAgICAgLm1hcCgoczogU2V0PG51bWJlcj4pID0+IFsuLi5zXS5tYXAoaGV4KS5qb2luKCcgJykpXG4gICAgICAgICAgLmpvaW4oJyB8ICcpO1xuICAgICAgY29uc29sZS5sb2coYFRpbGUgJHtoZXgodCl9OiAke3B9YCk7XG4gICAgfVxuICAgIC8vICAgaWYgKCF0aWxlc2V0QnlTY3JlZW5baV0pIHtcbiAgICAvLyAgICAgY29uc29sZS5sb2coYE5vIHRpbGVzZXQgZm9yIHNjcmVlbiAke2kudG9TdHJpbmcoMTYpfWApO1xuICAgIC8vICAgICBjb250aW51ZTtcbiAgICAvLyAgIH1cbiAgICAvLyAgIHVuaW9uLnVuaW9uKFsuLi50aWxlc2V0QnlTY3JlZW5baV1dKTtcbiAgICAvLyB9XG4gICAgLy8gcmV0dXJuIHVuaW9uLnNldHMoKTtcbiAgfVxuXG4gIC8vIEN5Y2xlcyBhcmUgbm90IGFjdHVhbGx5IGN5Y2xpYyAtIGFuIGV4cGxpY2l0IGxvb3AgYXQgdGhlIGVuZCBpcyByZXF1aXJlZCB0byBzd2FwLlxuICAvLyBWYXJpYW5jZTogWzEsIDIsIG51bGxdIHdpbGwgY2F1c2UgaW5zdGFuY2VzIG9mIDEgdG8gYmVjb21lIDIgYW5kIHdpbGxcbiAgLy8gICAgICAgICAgIGNhdXNlIHByb3BlcnRpZXMgb2YgMSB0byBiZSBjb3BpZWQgaW50byBzbG90IDJcbiAgLy8gQ29tbW9uIHVzYWdlIGlzIHRvIHN3YXAgdGhpbmdzIG91dCBvZiB0aGUgd2F5IGFuZCB0aGVuIGNvcHkgaW50byB0aGVcbiAgLy8gbmV3bHktZnJlZWQgc2xvdC4gIFNheSB3ZSB3YW50ZWQgdG8gZnJlZSB1cCBzbG90cyBbMSwgMiwgMywgNF0gYW5kXG4gIC8vIGhhZCBhdmFpbGFibGUvZnJlZSBzbG90cyBbNSwgNiwgNywgOF0gYW5kIHdhbnQgdG8gY29weSBmcm9tIFs5LCBhLCBiLCBjXS5cbiAgLy8gVGhlbiBjeWNsZXMgd2lsbCBiZSBbMSwgNSwgOV0gPz8/IG5vXG4gIC8vICAtIHByb2JhYmx5IHdhbnQgdG8gZG8gc2NyZWVucyBzZXBhcmF0ZWx5IGZyb20gdGlsZXNldHMuLi4/XG4gIC8vIE5PVEUgLSB3ZSBkb24ndCBhY3R1YWxseSB3YW50IHRvIGNoYW5nZSB0aWxlcyBmb3IgdGhlIGxhc3QgY29weS4uLiFcbiAgLy8gICBpbiB0aGlzIGNhc2UsIHRzWzVdIDwtIHRzWzFdLCB0c1sxXSA8LSB0c1s5XSwgc2NyZWVuLm1hcCgxIC0+IDUpXG4gIC8vICAgcmVwbGFjZShbMHg5MF0sIFs1LCAxLCB+OV0pXG4gIC8vICAgICA9PiAxcyByZXBsYWNlZCB3aXRoIDVzIGluIHNjcmVlbnMgYnV0IDlzIE5PVCByZXBsYWNlZCB3aXRoIDFzLlxuICAvLyBKdXN0IGJ1aWxkIHRoZSBwYXJ0aXRpb24gb25jZSBsYXppbHk/IHRoZW4gY2FuIHJldXNlLi4uXG4gIC8vICAgLSBlbnN1cmUgYm90aCBzaWRlcyBvZiByZXBsYWNlbWVudCBoYXZlIGNvcnJlY3QgcGFydGl0aW9uaW5nP0VcbiAgLy8gICAgIG9yIGp1c3QgZG8gaXQgb2ZmbGluZSAtIGl0J3Mgc2ltcGxlclxuICAvLyBUT0RPIC0gU2FuaXR5IGNoZWNrPyAgV2FudCB0byBtYWtlIHN1cmUgbm9ib2R5IGlzIHVzaW5nIGNsb2JiZXJlZCB0aWxlcz9cbiAgc3dhcE1ldGF0aWxlcyh0aWxlc2V0czogbnVtYmVyW10sIC4uLmN5Y2xlczogKG51bWJlciB8IG51bWJlcltdKVtdW10pIHtcbiAgICAvLyBQcm9jZXNzIHRoZSBjeWNsZXNcbiAgICBjb25zdCByZXYgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuICAgIGNvbnN0IHJldkFycjogbnVtYmVyW10gPSBzZXEoMHgxMDApO1xuICAgIGNvbnN0IGFsdCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gICAgY29uc3QgY3BsID0gKHg6IG51bWJlciB8IG51bWJlcltdKTogbnVtYmVyID0+IEFycmF5LmlzQXJyYXkoeCkgPyB4WzBdIDogeCA8IDAgPyB+eCA6IHg7XG4gICAgZm9yIChjb25zdCBjeWNsZSBvZiBjeWNsZXMpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3ljbGUubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGN5Y2xlW2ldKSkge1xuICAgICAgICAgIGNvbnN0IGFyciA9IGN5Y2xlW2ldIGFzIG51bWJlcltdO1xuICAgICAgICAgIGFsdC5zZXQoYXJyWzBdLCBhcnJbMV0pO1xuICAgICAgICAgIGN5Y2xlW2ldID0gYXJyWzBdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN5Y2xlLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICBjb25zdCBqID0gY3ljbGVbaV0gYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCBrID0gY3ljbGVbaSArIDFdIGFzIG51bWJlcjtcbiAgICAgICAgaWYgKGogPCAwIHx8IGsgPCAwKSBjb250aW51ZTtcbiAgICAgICAgcmV2LnNldChrLCBqKTtcbiAgICAgICAgcmV2QXJyW2tdID0gajtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gY29uc3QgcmVwbGFjZW1lbnRTZXQgPSBuZXcgU2V0KHJlcGxhY2VtZW50cy5rZXlzKCkpO1xuICAgIC8vIEZpbmQgaW5zdGFuY2VzIGluICgxKSBzY3JlZW5zLCAoMikgdGlsZXNldHMgYW5kIGFsdGVybmF0ZXMsICgzKSB0aWxlRWZmZWN0c1xuICAgIGNvbnN0IHNjcmVlbnMgPSBuZXcgU2V0PFNjcmVlbj4oKTtcbiAgICBjb25zdCB0aWxlRWZmZWN0cyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IHRpbGVzZXRzU2V0ID0gbmV3IFNldCh0aWxlc2V0cyk7XG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWwudXNlZCkgY29udGludWU7XG4gICAgICBpZiAoIXRpbGVzZXRzU2V0LmhhcyhsLnRpbGVzZXQpKSBjb250aW51ZTtcbiAgICAgIHRpbGVFZmZlY3RzLmFkZChsLnRpbGVFZmZlY3RzKTtcbiAgICAgIGZvciAoY29uc3Qgc2NyZWVuIG9mIGwuYWxsU2NyZWVucygpKSB7XG4gICAgICAgIHNjcmVlbnMuYWRkKHNjcmVlbik7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIERvIHJlcGxhY2VtZW50cy5cbiAgICAvLyAxLiBzY3JlZW5zOiBbNSwgMSwgfjldID0+IGNoYW5nZSAxcyBpbnRvIDVzXG4gICAgZm9yIChjb25zdCBzY3JlZW4gb2Ygc2NyZWVucykge1xuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNjcmVlbi50aWxlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBzY3JlZW4udGlsZXNbaV0gPSByZXZBcnJbc2NyZWVuLnRpbGVzW2ldXTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gMi4gdGlsZXNldHM6IFs1LCAxIH45XSA9PiBjb3B5IDUgPD0gMSBhbmQgMSA8PSA5XG4gICAgZm9yIChjb25zdCB0c2lkIG9mIHRpbGVzZXRzU2V0KSB7XG4gICAgICBjb25zdCB0aWxlc2V0ID0gdGhpcy50aWxlc2V0c1t0c2lkXTtcbiAgICAgIGZvciAoY29uc3QgY3ljbGUgb2YgY3ljbGVzKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3ljbGUubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgYSA9IGNwbChjeWNsZVtpXSk7XG4gICAgICAgICAgY29uc3QgYiA9IGNwbChjeWNsZVtpICsgMV0pO1xuICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgNDsgaisrKSB7XG4gICAgICAgICAgICB0aWxlc2V0LnRpbGVzW2pdW2FdID0gdGlsZXNldC50aWxlc1tqXVtiXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGlsZXNldC5hdHRyc1thXSA9IHRpbGVzZXQuYXR0cnNbYl07XG4gICAgICAgICAgaWYgKGIgPCAweDIwICYmIHRpbGVzZXQuYWx0ZXJuYXRlc1tiXSAhPT0gYikge1xuICAgICAgICAgICAgaWYgKGEgPj0gMHgyMCkgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgdW5mbGFnOiAke3RzaWR9ICR7YX0gJHtifSAke3RpbGVzZXQuYWx0ZXJuYXRlc1tiXX1gKTtcbiAgICAgICAgICAgIHRpbGVzZXQuYWx0ZXJuYXRlc1thXSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1tiXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBbYSwgYl0gb2YgYWx0KSB7XG4gICAgICAgIHRpbGVzZXQuYWx0ZXJuYXRlc1thXSA9IGI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIDMuIHRpbGVFZmZlY3RzXG4gICAgZm9yIChjb25zdCB0ZWlkIG9mIHRpbGVFZmZlY3RzKSB7XG4gICAgICBjb25zdCB0aWxlRWZmZWN0ID0gdGhpcy50aWxlRWZmZWN0c1t0ZWlkIC0gMHhiM107XG4gICAgICBmb3IgKGNvbnN0IGN5Y2xlIG9mIGN5Y2xlcykge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN5Y2xlLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICAgIGNvbnN0IGEgPSBjcGwoY3ljbGVbaV0pO1xuICAgICAgICAgIGNvbnN0IGIgPSBjcGwoY3ljbGVbaSArIDFdKTtcbiAgICAgICAgICB0aWxlRWZmZWN0LmVmZmVjdHNbYV0gPSB0aWxlRWZmZWN0LmVmZmVjdHNbYl07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgYSBvZiBhbHQua2V5cygpKSB7XG4gICAgICAgIC8vIFRoaXMgYml0IGlzIHJlcXVpcmVkIHRvIGluZGljYXRlIHRoYXQgdGhlIGFsdGVybmF0aXZlIHRpbGUnc1xuICAgICAgICAvLyBlZmZlY3Qgc2hvdWxkIGJlIGNvbnN1bHRlZC4gIFNpbXBseSBoYXZpbmcgdGhlIGZsYWcgYW5kIHRoZVxuICAgICAgICAvLyB0aWxlIGluZGV4IDwgJDIwIGlzIG5vdCBzdWZmaWNpZW50LlxuICAgICAgICB0aWxlRWZmZWN0LmVmZmVjdHNbYV0gfD0gMHgwODtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRG9uZT8hP1xuICB9XG5cbiAgbW92ZUZsYWcob2xkRmxhZzogbnVtYmVyLCBuZXdGbGFnOiBudW1iZXIpIHtcbiAgICAvLyBuZWVkIHRvIHVwZGF0ZSB0cmlnZ2Vycywgc3Bhd25zLCBkaWFsb2dzXG4gICAgZnVuY3Rpb24gcmVwbGFjZShhcnI6IG51bWJlcltdKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoYXJyW2ldID09PSBvbGRGbGFnKSBhcnJbaV0gPSBuZXdGbGFnO1xuICAgICAgICBpZiAoYXJyW2ldID09PSB+b2xkRmxhZykgYXJyW2ldID0gfm5ld0ZsYWc7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgdHJpZ2dlciBvZiB0aGlzLnRyaWdnZXJzKSB7XG4gICAgICByZXBsYWNlKHRyaWdnZXIuY29uZGl0aW9ucyk7XG4gICAgICByZXBsYWNlKHRyaWdnZXIuZmxhZ3MpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5wYyBvZiB0aGlzLm5wY3MpIHtcbiAgICAgIGZvciAoY29uc3QgY29uZHMgb2YgbnBjLnNwYXduQ29uZGl0aW9ucy52YWx1ZXMoKSkgcmVwbGFjZShjb25kcyk7XG4gICAgICBmb3IgKGNvbnN0IGRpYWxvZ3Mgb2YgW25wYy5nbG9iYWxEaWFsb2dzLCAuLi5ucGMubG9jYWxEaWFsb2dzLnZhbHVlcygpXSkge1xuICAgICAgICBmb3IgKGNvbnN0IGRpYWxvZyBvZiBkaWFsb2dzKSB7XG4gICAgICAgICAgaWYgKGRpYWxvZy5jb25kaXRpb24gPT09IG9sZEZsYWcpIGRpYWxvZy5jb25kaXRpb24gPSBuZXdGbGFnO1xuICAgICAgICAgIGlmIChkaWFsb2cuY29uZGl0aW9uID09PSB+b2xkRmxhZykgZGlhbG9nLmNvbmRpdGlvbiA9IH5uZXdGbGFnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGFsc28gbmVlZCB0byB1cGRhdGUgbWFwIGZsYWdzIGlmID49ICQyMDBcbiAgICBpZiAoKG9sZEZsYWcgJiB+MHhmZikgPT09IDB4MjAwICYmIChuZXdGbGFnICYgfjB4ZmYpID09PSAweDIwMCkge1xuICAgICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgICAgZm9yIChjb25zdCBmbGFnIG9mIGxvYy5mbGFncykge1xuICAgICAgICAgIGlmIChmbGFnLmZsYWcgPT09IG9sZEZsYWcpIGZsYWcuZmxhZyA9IG5ld0ZsYWc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBuZXh0RnJlZVRyaWdnZXIobmFtZT86IFRyaWdnZXIuQ3VzdG9tKTogVHJpZ2dlciB7XG4gICAgZm9yIChjb25zdCB0IG9mIHRoaXMudHJpZ2dlcnMpIHtcbiAgICAgIGlmICh0LnVzZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKG5hbWUpIHRoaXMuYWxsb2NhdGVkVHJpZ2dlcnMuc2V0KG5hbWUsIHQuaWQpO1xuICAgICAgcmV0dXJuIHQ7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgYW4gdW51c2VkIHRyaWdnZXIuJyk7XG4gIH1cblxuICAvLyBjb21wcmVzc01hcERhdGEoKTogdm9pZCB7XG4gIC8vICAgaWYgKHRoaXMuY29tcHJlc3NlZE1hcERhdGEpIHJldHVybjtcbiAgLy8gICB0aGlzLmNvbXByZXNzZWRNYXBEYXRhID0gdHJ1ZTtcbiAgLy8gICAvLyBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMubG9jYXRpb25zKSB7XG4gIC8vICAgLy8gICBpZiAobG9jYXRpb24uZXh0ZW5kZWQpIGxvY2F0aW9uLmV4dGVuZGVkID0gMHhhO1xuICAvLyAgIC8vIH1cbiAgLy8gICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAvLyAgICAgLy90aGlzLnNjcmVlbnNbMHhhMDAgfCBpXSA9IHRoaXMuc2NyZWVuc1sweDEwMCB8IGldO1xuICAvLyAgICAgdGhpcy5tZXRhc2NyZWVucy5yZW51bWJlcigweDEwMCB8IGksIDB4YTAwIHwgaSk7XG4gIC8vICAgICBkZWxldGUgdGhpcy5zY3JlZW5zWzB4MTAwIHwgaV07XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gVE9ETyAtIGRvZXMgbm90IHdvcmsuLi5cbiAgLy8gVE9ETyAtIGNsZWFuIHRoaXMgdXAgc29tZWhvdy4uLiB3b3VsZCBiZSBuaWNlIHRvIHVzZSB0aGUgYXNzZW1ibGVyL2xpbmtlclxuICAvLyAgICAgICAgdy8gYW4gLmFsaWduIG9wdGlvbiBmb3IgdGhpcywgYnV0IHRoZW4gd2UgaGF2ZSB0byBob2xkIG9udG8gd2VpcmRcbiAgLy8gICAgICAgIGRhdGEgaW4gbWFueSBwbGFjZXMsIHdoaWNoIGlzbid0IGdyZWF0LlxuICAvLyAgICAgICAgIC0gYXQgbGVhc3QsIHdlIGNvdWxkIFwicmVzZXJ2ZVwiIGJsb2NrcyBpbiB2YXJpb3VzIHBhZ2VzP1xuXG4gIC8qKlxuICAgKiBNb3ZlcyBhbGwgdGhlIHNjcmVlbnMgZnJvbSB0aGUgZ2l2ZW4gdGlsZXNldChzKSBpbnRvIHRoZSBnaXZlbiBwbGFuZS5cbiAgICogTm90ZSB0aGF0IHRoZSB0aWxlc2V0cyBtdXN0IGJlIF9jbG9zZWQgb3ZlciBzaGFyaW5nXywgd2hpY2ggbWVhbnMgdGhhdFxuICAgKiBpZiBzY3JlZW4gUyBpcyBpbiB0aWxlc2V0cyBBIGFuZCBCLCB0aGVuIEEgYW5kIEIgbXVzdCBiZSBlaXRoZXIgYm90aFxuICAgKiBvciBuZWl0aGVyIGluIHRoZSBhcnJheS4gIEEgcGxhbmUgaXMgNjRrYiBhbmQgaG9sZHMgMjU2IHNjcmVlbnMuXG4gICAqIFBsYW5lcyAwLi4zIGFyZSB0aGUgb3JpZ2luYWwgdW5leHBhbmRlZCBQUkcuICBUaGUgZXh0cmEgZXhwYW5kZWQgc3BhY2VcbiAgICogb3BlbnMgdXAgcGxhbmVzIDQuLjcsIHRob3VnaCAoMSkgd2Ugc2hvdWxkIGF2b2lkIHVzaW5nIHBsYW5lIDcgc2luY2VcbiAgICogdGhlIFwiZmVcIiBhbmQgXCJmZlwiIHNlZ21lbnRzIGxpdmUgdGhlcmUsIGFuZCB3ZSdsbCBhbHNvIHJlc2VydmUgdGhlIGxvd2VyXG4gICAqIHNlZ21lbnRzIGluIHBsYW5lIDcgZm9yIHJlbG9jYXRlZCBjb2RlIGFuZCBkYXRhLiAgV2UgY2FuIHByb2JhYmx5IGFsc29cbiAgICogYXZvaWQgcGxhbmUgNiBiZWNhdXNlIDUxMiBleHRyYSBzY3JlZW5zIHNob3VsZCBiZSBtb3JlIHRoYW4gYW55Ym9keVxuICAgKiBjb3VsZCBldmVyIG5lZWQuXG4gICAqL1xuICBtb3ZlU2NyZWVucyh0aWxlc2V0QXJyYXk6IE1ldGF0aWxlc2V0W10sIHBsYW5lOiBudW1iZXIpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29tcHJlc3NlZE1hcERhdGEpIHRocm93IG5ldyBFcnJvcihgTXVzdCBjb21wcmVzcyBtYXBzIGZpcnN0LmApO1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG4gICAgbGV0IGkgPSBwbGFuZSA8PCA4O1xuICAgIHdoaWxlICh0aGlzLnNjcmVlbnNbaV0pIHtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgY29uc3QgdGlsZXNldHMgPSBuZXcgU2V0KHRpbGVzZXRBcnJheSk7XG4gICAgZm9yIChjb25zdCB0aWxlc2V0IG9mIHRpbGVzZXRzKSB7XG4gICAgICBmb3IgKGNvbnN0IHNjcmVlbiBvZiB0aWxlc2V0KSB7XG4gICAgICAgIGlmIChzY3JlZW4uc2lkID49IDB4MTAwKSB7XG4gICAgICAgICAgbWFwLnNldChzY3JlZW4uc2lkLCBzY3JlZW4uc2lkKTsgLy8gaWdub3JlIHNob3BzXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgLy9pZiAoKGkgJiAweGZmKSA9PT0gMHgyMCkgdGhyb3cgbmV3IEVycm9yKGBObyByb29tIGxlZnQgb24gcGFnZS5gKTtcbiAgICAgICAgY29uc3QgcHJldiA9IHNjcmVlbi5zaWQ7XG4gICAgICAgIGlmICghbWFwLmhhcyhwcmV2KSkge1xuICAgICAgICAgIC8vIHVzdWFsbHkgbm90IGltcG9ydGFudCwgYnV0IGVuc3VyZSBhbGwgdmFyaWFudHMgYXJlIHJlbnVtYmVyZWRcbiAgICAgICAgICAvL3NjcmVlbi5zaWQgPSBtYXAuZ2V0KHByZXYpITtcbiAgICAgICAgLy99IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IG5leHQgPSBpKys7XG4gICAgICAgICAgbWFwLnNldChwcmV2LCBuZXh0KTtcbiAgICAgICAgICBtYXAuc2V0KG5leHQsIG5leHQpO1xuICAgICAgICAgIHRoaXMubWV0YXNjcmVlbnMucmVudW1iZXIocHJldiwgbmV4dCwgdGlsZXNldHMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICgoaSA+Pj4gOCkgIT09IHBsYW5lKSB0aHJvdyBuZXcgRXJyb3IoYE91dCBvZiBzcGFjZSBvbiBwYWdlICR7cGxhbmV9YCk7XG5cbiAgICAvLyBNb3ZlIHRoZSBzY3JlZW4gYW5kIG1ha2Ugc3VyZSB0aGF0IGFsbCBsb2NhdGlvbnMgYXJlIG9uIGEgc2luZ2xlIHBsYW5lXG4gICAgY29uc3QgbWlzc2VkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgdGhpcy5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghdGlsZXNldHMuaGFzKGxvYy5tZXRhLnRpbGVzZXQpKSBjb250aW51ZTtcbiAgICAgIGxldCBhbnlNb3ZlZCA9IGZhbHNlO1xuICAgICAgZm9yIChjb25zdCByb3cgb2YgbG9jLnNjcmVlbnMpIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCByb3cubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBjb25zdCBtYXBwZWQgPSBtYXAuZ2V0KHJvd1tqXSk7XG4gICAgICAgICAgaWYgKG1hcHBlZCAhPSBudWxsKSB7XG4gICAgICAgICAgICByb3dbal0gPSBtYXBwZWQ7XG4gICAgICAgICAgICBhbnlNb3ZlZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1pc3NlZC5hZGQobG9jLm5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGFueU1vdmVkICYmIG1pc3NlZC5zaXplKSB0aHJvdyBuZXcgRXJyb3IoYEluY29uc2lzdGVudCBtb3ZlIFske1suLi50aWxlc2V0c10ubWFwKHQgPT4gdC5uYW1lKS5qb2luKCcsICcpfV0gdG8gcGxhbmUgJHtwbGFuZX06IG1pc3NlZCAke1suLi5taXNzZWRdLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuICB9XG5cbiAgLy8gVXNlIHRoZSBicm93c2VyIEFQSSB0byBsb2FkIHRoZSBST00uICBVc2UgI3Jlc2V0IHRvIGZvcmdldCBhbmQgcmVsb2FkLlxuICBzdGF0aWMgYXN5bmMgbG9hZChwYXRjaD86IChkYXRhOiBVaW50OEFycmF5KSA9PiB2b2lkfFByb21pc2U8dm9pZD4sXG4gICAgICAgICAgICAgICAgICAgIHJlY2VpdmVyPzogKHBpY2tlcjogRWxlbWVudCkgPT4gdm9pZCk6IFByb21pc2U8Um9tPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IHBpY2tGaWxlKHJlY2VpdmVyKTtcbiAgICBpZiAocGF0Y2gpIGF3YWl0IHBhdGNoKGZpbGUpO1xuICAgIHJldHVybiBuZXcgUm9tKGZpbGUpO1xuICB9ICBcblxuICBzdGF0aWMgYXN5bmMgbG9hZEJ5dGVzKCk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICAgIHJldHVybiBhd2FpdCBwaWNrRmlsZSgpO1xuICB9XG59XG5cbi8vIGNvbnN0IGludGVyc2VjdHMgPSAobGVmdCwgcmlnaHQpID0+IHtcbi8vICAgaWYgKGxlZnQuc2l6ZSA+IHJpZ2h0LnNpemUpIHJldHVybiBpbnRlcnNlY3RzKHJpZ2h0LCBsZWZ0KTtcbi8vICAgZm9yIChsZXQgaSBvZiBsZWZ0KSB7XG4vLyAgICAgaWYgKHJpZ2h0LmhhcyhpKSkgcmV0dXJuIHRydWU7XG4vLyAgIH1cbi8vICAgcmV0dXJuIGZhbHNlO1xuLy8gfVxuXG4vLyBjb25zdCBUSUxFX0VGRkVDVFNfQllfVElMRVNFVCA9IHtcbi8vICAgMHg4MDogMHhiMyxcbi8vICAgMHg4NDogMHhiNCxcbi8vICAgMHg4ODogMHhiNSxcbi8vICAgMHg4YzogMHhiNixcbi8vICAgMHg5MDogMHhiNyxcbi8vICAgMHg5NDogMHhiOCxcbi8vICAgMHg5ODogMHhiOSxcbi8vICAgMHg5YzogMHhiYSxcbi8vICAgMHhhMDogMHhiYixcbi8vICAgMHhhNDogMHhiYyxcbi8vICAgMHhhODogMHhiNSxcbi8vICAgMHhhYzogMHhiZCxcbi8vIH07XG5cbi8vIE9ubHkgbWFrZXMgc2Vuc2UgaW4gdGhlIGJyb3dzZXIuXG5mdW5jdGlvbiBwaWNrRmlsZShyZWNlaXZlcj86IChwaWNrZXI6IEVsZW1lbnQpID0+IHZvaWQpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgaWYgKCFyZWNlaXZlcikgcmVjZWl2ZXIgPSBwaWNrZXIgPT4gZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChwaWNrZXIpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggIT09ICcjcmVzZXQnKSB7XG4gICAgICBjb25zdCBkYXRhID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JvbScpO1xuICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHJlc29sdmUoXG4gICAgICAgICAgICBVaW50OEFycmF5LmZyb20oXG4gICAgICAgICAgICAgICAgbmV3IEFycmF5KGRhdGEubGVuZ3RoIC8gMikuZmlsbCgwKS5tYXAoXG4gICAgICAgICAgICAgICAgICAgIChfLCBpKSA9PiBOdW1iZXIucGFyc2VJbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhWzIgKiBpXSArIGRhdGFbMiAqIGkgKyAxXSwgMTYpKSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB1cGxvYWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodXBsb2FkKTtcbiAgICB1cGxvYWQudHlwZSA9ICdmaWxlJztcbiAgICB1cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgY29uc3QgZmlsZSA9IHVwbG9hZC5maWxlcyFbMF07XG4gICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlbmQnLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGFyciA9IG5ldyBVaW50OEFycmF5KHJlYWRlci5yZXN1bHQgYXMgQXJyYXlCdWZmZXIpO1xuICAgICAgICBjb25zdCBzdHIgPSBBcnJheS5mcm9tKGFyciwgaGV4KS5qb2luKCcnKTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3JvbScsIHN0cik7XG4gICAgICAgIHVwbG9hZC5yZW1vdmUoKTtcbiAgICAgICAgcmVzb2x2ZShhcnIpO1xuICAgICAgfSk7XG4gICAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZSk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5leHBvcnQgY29uc3QgRVhQRUNURURfQ1JDMzIgPSAweDFiZDM5MDMyO1xuXG4vLyBGb3JtYXQ6IFthZGRyZXNzLCBicm9rZW4sIGZpeGVkXVxuY29uc3QgQURKVVNUTUVOVFMgPSBbXG4gIC8vIE5vcm1hbGl6ZSBjYXZlIGVudHJhbmNlIGluIDAxIG91dHNpZGUgc3RhcnRcbiAgWzB4MTQ1NDgsIDB4NTYsIDB4NTBdLFxuICAvLyBGaXggYnJva2VuIChmYWxsLXRocm91Z2gpIGV4aXQgb3V0c2lkZSBzdGFydFxuICBbMHgxNDU2YSwgMHgwMCwgMHhmZl0sXG4gIC8vIE1vdmUgTGVhZiBub3J0aCBlbnRyYW5jZSB0byBiZSByaWdodCBuZXh0IHRvIGV4aXQgKGNvbnNpc3RlbnQgd2l0aCBHb2EpXG4gIFsweDE0NThmLCAweDM4LCAweDMwXSxcbiAgLy8gTm9ybWFsaXplIHNlYWxlZCBjYXZlIGVudHJhbmNlL2V4aXQgYW5kIHplYnUgY2F2ZSBlbnRyYW5jZVxuICBbMHgxNDYxOCwgMHg2MCwgMHg3MF0sXG4gIFsweDE0NjI2LCAweGE4LCAweGEwXSxcbiAgWzB4MTQ2MzMsIDB4MTUsIDB4MTZdLFxuICBbMHgxNDYzNywgMHgxNSwgMHgxNl0sXG4gIC8vIE5vcm1hbGl6ZSBjb3JkZWwgcGxhaW4gZW50cmFuY2UgZnJvbSBzZWFsZWQgY2F2ZVxuICBbMHgxNDk1MSwgMHhhOCwgMHhhMF0sXG4gIFsweDE0OTUzLCAweDk4LCAweDkwXSxcbiAgLy8gTm9ybWFsaXplIGNvcmRlbCBzd2FwIGVudHJhbmNlXG4gIFsweDE0YTE5LCAweDc4LCAweDcwXSxcbiAgLy8gUmVkdW5kYW50IGV4aXQgbmV4dCB0byBzdG9tJ3MgZG9vciBpbiAkMTlcbiAgWzB4MTRhZWIsIDB4MDksIDB4ZmZdLFxuICAvLyBOb3JtYWxpemUgc3dhbXAgZW50cmFuY2UgcG9zaXRpb25cbiAgWzB4MTRiNDksIDB4ODAsIDB4ODhdLFxuICAvLyBOb3JtYWxpemUgYW1hem9uZXMgZW50cmFuY2UvZXhpdCBwb3NpdGlvblxuICBbMHgxNGI4NywgMHgyMCwgMHgzMF0sXG4gIFsweDE0YjlhLCAweDAxLCAweDAyXSxcbiAgWzB4MTRiOWUsIDB4MDEsIDB4MDJdLFxuICAvLyBGaXggZ2FyYmFnZSBtYXAgc3F1YXJlIGluIGJvdHRvbS1yaWdodCBvZiBNdCBTYWJyZSBXZXN0IGNhdmVcbiAgWzB4MTRkYjksIDB4MDgsIDB4ODBdLFxuICAvLyBOb3JtYWxpemUgc2FicmUgbiBlbnRyYW5jZSBiZWxvdyBzdW1taXRcbiAgWzB4MTRlZjYsIDB4NjgsIDB4NjBdLFxuICAvLyBGaXggZ2FyYmFnZSBtYXAgc3F1YXJlIGluIGJvdHRvbS1sZWZ0IG9mIExpbWUgVHJlZSBWYWxsZXlcbiAgWzB4MTU0NWQsIDB4ZmYsIDB4MDBdLFxuICAvLyBOb3JtYWxpemUgbGltZSB0cmVlIHZhbGxleSBTRSBlbnRyYW5jZVxuICBbMHgxNTQ2OSwgMHg3OCwgMHg3MF0sXG4gIC8vIE5vcm1hbGl6ZSBwb3J0b2Egc2Uvc3cgZW50cmFuY2VzXG4gIFsweDE1ODA2LCAweDk4LCAweGEwXSxcbiAgWzB4MTU4MGEsIDB4OTgsIDB4YTBdLFxuICAvLyBOb3JtYWxpemUgcG9ydG9hIHBhbGFjZSBlbnRyYW5jZVxuICBbMHgxNTgwZSwgMHg1OCwgMHg1MF0sXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlL2V4aXQgaW4gcG9ydG9hXG4gIFsweDE1ODFkLCAweDAwLCAweGZmXSxcbiAgWzB4MTU4NGUsIDB4ZGIsIDB4ZmZdLFxuICAvLyBOb3JtYWxpemUgZmlzaGVybWFuIGlzbGFuZCBlbnRyYW5jZVxuICBbMHgxNTg3NSwgMHg3OCwgMHg3MF0sXG4gIC8vIE5vcm1hbGl6ZSB6b21iaWUgdG93biBlbnRyYW5jZSBmcm9tIHBhbGFjZVxuICBbMHgxNWI0ZiwgMHg3OCwgMHg4MF0sXG4gIC8vIFJlbW92ZSB1bnVzZWQgbWFwIHNjcmVlbnMgZnJvbSBFdmlsIFNwaXJpdCBsb3dlclxuICBbMHgxNWJhZiwgMHhmMCwgMHg4MF0sXG4gIFsweDE1YmI2LCAweGRmLCAweDgwXSxcbiAgWzB4MTViYjcsIDB4OTYsIDB4ODBdLFxuICAvLyBOb3JtYWxpemUgc2FiZXJhIHBhbGFjZSAxIGVudHJhbmNlIHVwIG9uZSB0aWxlXG4gIFsweDE1Y2UzLCAweGRmLCAweGNmXSxcbiAgWzB4MTVjZWUsIDB4NmUsIDB4NmRdLFxuICBbMHgxNWNmMiwgMHg2ZSwgMHg2ZF0sXG4gIC8vIE5vcm1hbGl6ZSBzYWJlcmEgcGFsYWNlIDMgZW50cmFuY2UgdXAgb25lIHRpbGVcbiAgWzB4MTVkOGUsIDB4ZGYsIDB4Y2ZdLFxuICBbMHgxNWQ5MSwgMHgyZSwgMHgyZF0sXG4gIFsweDE1ZDk1LCAweDJlLCAweDJkXSxcbiAgLy8gTm9ybWFsaXplIGpvZWwgZW50cmFuY2VcbiAgWzB4MTVlM2EsIDB4ZDgsIDB4ZGZdLFxuICAvLyBOb3JtYWxpemUgZ29hIHZhbGxleSByaWdodGhhbmQgZW50cmFuY2VcbiAgWzB4MTVmMzksIDB4NzgsIDB4NzBdLFxuICAvLyBNYXJrIGJhZCBlbnRyYW5jZS9leGl0IGluIGdvYSB2YWxsZXlcbiAgWzB4MTVmNDAsIDB4MDIsIDB4ZmZdLFxuICBbMHgxNWY2MSwgMHg4ZCwgMHhmZl0sXG4gIFsweDE1ZjY1LCAweDhkLCAweGZmXSxcbiAgLy8gTm9ybWFsaXplIHNoeXJvbiBsb3dlciBlbnRyYW5jZVxuICBbMHgxNjNmZCwgMHg0OCwgMHg0MF0sXG4gIC8vIE5vcm1hbGl6ZSBzaHlyb24gZm9ydHJlc3MgZW50cmFuY2VcbiAgWzB4MTY0MDMsIDB4NTUsIDB4NTBdLFxuICAvLyBOb3JtYWxpemUgZ29hIHNvdXRoIGVudHJhbmNlXG4gIFsweDE2NDViLCAweGQ4LCAweGRmXSxcbiAgLy8gRml4IHBhdHRlcm4gdGFibGUgZm9yIGRlc2VydCAxIChhbmltYXRpb24gZ2xvc3NlcyBvdmVyIGl0KVxuICBbMHgxNjRjYywgMHgwNCwgMHgyMF0sXG4gIC8vIEZpeCBnYXJiYWdlIGF0IGJvdHRvbSBvZiBvYXNpcyBjYXZlIG1hcCAoaXQncyA4eDExLCBub3QgOHgxMiA9PiBmaXggaGVpZ2h0KVxuICBbMHgxNjRmZiwgMHgwYiwgMHgwYV0sXG4gIC8vIE5vcm1hbGl6ZSBzYWhhcmEgZW50cmFuY2UvZXhpdCBwb3NpdGlvblxuICBbMHgxNjYwZCwgMHgyMCwgMHgzMF0sXG4gIFsweDE2NjI0LCAweDAxLCAweDAyXSxcbiAgWzB4MTY2MjgsIDB4MDEsIDB4MDJdLFxuICAvLyBSZW1vdmUgdW51c2VkIHNjcmVlbnMgZnJvbSBtYWRvMiBhcmVhXG4gIFsweDE2ZGIwLCAweDlhLCAweDgwXSxcbiAgWzB4MTZkYjQsIDB4OWUsIDB4ODBdLFxuICBbMHgxNmRiOCwgMHg5MSwgMHg4MF0sXG4gIFsweDE2ZGJjLCAweDllLCAweDgwXSxcbiAgWzB4MTZkYzAsIDB4OTEsIDB4ODBdLFxuICAvLyBNYXJrIGJhZCBlbnRyYW5jZSBpbiB1bnVzZWQgbWFkbzIgYXJlYVxuICBbMHgxNmRlOCwgMHgwMCwgMHhmZl0sXG4gIC8vIE5vcm1hbGl6ZSBtYWRvMi1zaWRlIGhlY2t3YXkgZW50cmFuY2VcbiAgWzB4MTZkZWQsIDB4ZGYsIDB4ZDBdLFxuICAvLyBGaXggYm9ndXMgZXhpdHMgaW4gdW51c2VkIG1hZG8yIGFyZWFcbiAgLy8gKGV4aXRzIDIgYW5kIDMgYXJlIGJhZCwgc28gbW92ZSA0IGFuZCA1IG9uIHRvcCBvZiB0aGVtKVxuICBbMHgxNmRmOCwgMHgwYywgMHg1Y10sXG4gIFsweDE2ZGY5LCAweGIwLCAweGI5XSxcbiAgWzB4MTZkZmEsIDB4MDAsIDB4MDJdLFxuICBbMHgxNmRmYywgMHgwYywgMHg1Y10sXG4gIFsweDE2ZGZkLCAweGIwLCAweGI5XSxcbiAgWzB4MTZkZmUsIDB4MDAsIDB4MDJdLFxuICBbMHgxNmRmZiwgMHgwNywgMHhmZl0sXG4gIC8vIEFsc28gcmVtb3ZlIHRoZSBiYWQgZW50cmFuY2VzL2V4aXRzIG9uIHRoZSBhc2luYSB2ZXJzaW9uXG4gIC8vIE1hcmsgYmFkIGVudHJhbmNlL2V4aXQgaW4gcG9ydG9hXG4gIFsweDE2ZTVkLCAweDAyLCAweGZmXSxcbiAgWzB4MTZlNmEsIDB4YWQsIDB4ZmZdLFxuICBbMHgxNmU2ZSwgMHhhZCwgMHhmZl0sXG4gIC8vIE1hcmsgdW51c2VkIGVudHJhbmNlL2V4aXQgaW4gbm9uLWtlbnN1IHNpZGUgb2Yga2FybWluZSA1LlxuICBbMHgxNzAwMSwgMHgwMiwgMHhmZl0sXG4gIFsweDE3MDJlLCAweGI3LCAweGZmXSxcbiAgWzB4MTcwMzIsIDB4YjcsIDB4ZmZdLFxuICAvLyBNYXJrIHVudXNlZCBlbnRyYW5jZXMvZXhpdHMgaW4ga2Vuc3Ugc2lkZSBvZiBrYXJtaW5lIDUuXG4gIFsweDE3MGFiLCAweDAzLCAweGZmXSxcbiAgWzB4MTcwYWYsIDB4MDIsIDB4ZmZdLFxuICBbMHgxNzBiMywgMHgwNSwgMHhmZl0sXG4gIFsweDE3MGI3LCAweDA2LCAweGZmXSxcbiAgWzB4MTcwYmIsIDB4MDAsIDB4ZmZdLFxuICBbMHgxNzBjNCwgMHhiMiwgMHhmZl0sXG4gIFsweDE3MGM4LCAweGIyLCAweGZmXSxcbiAgWzB4MTcwY2MsIDB4YjEsIDB4ZmZdLFxuICBbMHgxNzBkMCwgMHhiMSwgMHhmZl0sXG4gIFsweDE3MGQ0LCAweGIzLCAweGZmXSxcbiAgWzB4MTcwZDgsIDB4YjMsIDB4ZmZdLFxuICBbMHgxNzBkYywgMHhiNSwgMHhmZl0sXG4gIFsweDE3MGUwLCAweGI1LCAweGZmXSxcbiAgWzB4MTcwZTQsIDB4YjUsIDB4ZmZdLFxuICBbMHgxNzBlOCwgMHhiNSwgMHhmZl0sXG4gIC8vIE1hcmsgdW51c2VkIGVudHJhbmNlcyBpbiBcbiAgLy8gTm9ybWFsaXplIGFyeWxsaXMgZW50cmFuY2VcbiAgWzB4MTc0ZWUsIDB4ODAsIDB4ODhdLFxuICAvLyBOb3JtYWxpemUgam9lbCBzaGVkIGJvdHRvbSBhbmQgc2VjcmV0IHBhc3NhZ2UgZW50cmFuY2VzXG4gIFsweDE3N2MxLCAweDg4LCAweDgwXSxcbiAgWzB4MTc3YzUsIDB4OTgsIDB4YTBdLFxuICBbMHgxNzdjNywgMHg1OCwgMHg1MF0sXG4gIC8vIEZpeCBiYWQgbXVzaWMgaW4gem9tYmlldG93biBob3VzZXM6ICQxMCBzaG91bGQgYmUgJDAxLlxuICBbMHgxNzgyYSwgMHgxMCwgMHgwMV0sXG4gIFsweDE3ODU3LCAweDEwLCAweDAxXSxcbiAgLy8gTm9ybWFsaXplIHN3YW4gZGFuY2UgaGFsbCBlbnRyYW5jZSB0byBiZSBjb25zaXN0ZW50IHdpdGggc3RvbSdzIGhvdXNlXG4gIFsweDE3OTU0LCAweDgwLCAweDc4XSxcbiAgLy8gTm9ybWFsaXplIHNoeXJvbiBkb2pvIGVudHJhbmNlIHRvIGJlIGNvbnNpc3RlbnQgd2l0aCBzdG9tJ3MgaG91c2VcbiAgWzB4MTc5YTIsIDB4ODAsIDB4NzhdLFxuICAvLyBGaXggYmFkIHNjcmVlbnMgaW4gdG93ZXJcbiAgWzB4MTdiOGEsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAxXG4gIFsweDE3YjkwLCAweDAwLCAweDQwXSxcbiAgWzB4MTdiY2UsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAyXG4gIFsweDE3YmQ0LCAweDAwLCAweDQwXSxcbiAgWzB4MTdjMGUsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciAzXG4gIFsweDE3YzE0LCAweDAwLCAweDQwXSxcbiAgWzB4MTdjNGUsIDB4MDAsIDB4NDBdLCAvLyB0b3dlciA0XG4gIFsweDE3YzU0LCAweDAwLCAweDQwXSxcbiAgLy8gRml4IGJhZCBzcGF3biBpbiBNdCBIeWRyYSAobWFrZSBpdCBhbiBleHRyYSBwdWRkbGUpLlxuICBbMHgxOWYwMiwgMHg0MCwgMHg4MF0sXG4gIFsweDE5ZjAzLCAweDMzLCAweDMyXSxcbiAgLy8gRml4IGJhZCBzcGF3biBpbiBTYWJlcmEgMidzIGxldmVsIChwcm9iYWJseSBtZWFudCB0byBiZSBhIGZsYWlsIGd1eSkuXG4gIFsweDFhMWUwLCAweDQwLCAweGMwXSwgLy8gbWFrZSBzdXJlIHRvIGZpeCBwYXR0ZXJuIHNsb3QsIHRvbyFcbiAgWzB4MWExZTEsIDB4M2QsIDB4MzRdLFxuICAvLyBQb2ludCBBbWF6b25lcyBvdXRlciBndWFyZCB0byBwb3N0LW92ZXJmbG93IG1lc3NhZ2UgdGhhdCdzIGFjdHVhbGx5IHNob3duLlxuICBbMHgxY2YwNSwgMHg0NywgMHg0OF0sXG4gIC8vIFJlbW92ZSBzdHJheSBmbGlnaHQgZ3JhbnRlciBpbiBab21iaWV0b3duLlxuICBbMHgxZDMxMSwgMHgyMCwgMHhhMF0sXG4gIFsweDFkMzEyLCAweDMwLCAweDAwXSxcbiAgLy8gRml4IHF1ZWVuJ3MgZGlhbG9nIHRvIHRlcm1pbmF0ZSBvbiBsYXN0IGl0ZW0sIHJhdGhlciB0aGFuIG92ZXJmbG93LFxuICAvLyBzbyB0aGF0IHdlIGRvbid0IHBhcnNlIGdhcmJhZ2UuXG4gIFsweDFjZmY5LCAweDYwLCAweGUwXSxcbiAgLy8gRml4IEFtYXpvbmVzIG91dGVyIGd1YXJkIG1lc3NhZ2UgdG8gbm90IG92ZXJmbG93LlxuICBbMHgyY2E5MCwgMHgwMiwgMHgwMF0sXG4gIC8vIEZpeCBzZWVtaW5nbHktdW51c2VkIGtlbnN1IG1lc3NhZ2UgMWQ6MTcgb3ZlcmZsb3dpbmcgaW50byAxZDoxOFxuICBbMHgyZjU3MywgMHgwMiwgMHgwMF0sXG4gIC8vIEZpeCB1bnVzZWQga2FybWluZSB0cmVhc3VyZSBjaGVzdCBtZXNzYWdlIDIwOjE4LlxuICBbMHgyZmFlNCwgMHg1ZiwgMHgwMF0sXG5dIGFzIGNvbnN0O1xuIl19