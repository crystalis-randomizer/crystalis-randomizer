import { Boss, Capability, Condition, Event, Item, Magic, MutableRequirement, Slot, and, meet, or } from './condition.js';
import { TileId, ScreenId } from './geometry.js';
import { ShopType } from '../rom/shop.js';
import { hex } from '../rom/util.js';
const RELEVANT_FLAGS = [
    0x00a,
    0x00b,
    0x013,
    0x018,
    0x01b,
    0x01e,
    0x021,
    0x025,
    0x026,
    0x027,
    0x038,
    0x03a,
    0x03b,
    0x045,
    0x052,
    0x053,
    0x061,
    0x067,
    0x072,
    0x08b,
    0x09b,
    0x0a5,
    0x0a9,
    0x100,
    0x101,
    0x102,
    0x103,
    0x105,
    0x106,
    0x107,
    0x108,
    0x10b,
    0x10c,
    0x200, 0x201, 0x202, 0x203,
    0x205, 0x206, 0x207, 0x208, 0x209, 0x20a, 0x20b, 0x20c,
    0x236,
    0x243,
    0x244,
    0x283,
    0x28d,
    0x2ee,
    0x2f6,
    0x2fd,
];
const FLAG_MAP = new Map([
    [0x00a, Event.STARTED_WINDMILL],
    [0x017, Item.SWORD_OF_WATER],
    [0x028, Magic.CHANGE],
    [0x029, Magic.CHANGE],
    [0x02a, Magic.CHANGE],
    [0x02b, Magic.CHANGE],
    [0x06c, Boss.DRAYGON1],
    [0x08b, Item.SHELL_FLUTE],
    [0x0ee, Event.RIDE_DOLPHIN],
]);
const TRIGGER_ACTION_ITEMS = {
    0x08: Slot(Magic.PARALYSIS),
    0x0b: Slot(Magic.BARRIER),
    0x0f: Slot(Magic.REFRESH),
    0x18: Slot(Magic.TELEPATHY),
};
const SWORDS = [Item.SWORD_OF_WIND, Item.SWORD_OF_FIRE,
    Item.SWORD_OF_WATER, Item.SWORD_OF_THUNDER];
const SWORD_POWERS = [
    [Item.ORB_OF_WIND, Item.TORNADO_BRACELET],
    [Item.ORB_OF_FIRE, Item.FLAME_BRACELET],
    [Item.ORB_OF_WATER, Item.BLIZZARD_BRACELET],
    [Item.ORB_OF_THUNDER, Item.STORM_BRACELET],
];
function swordRequirement(sword, level) {
    let r;
    if (level === 1)
        r = SWORDS[sword];
    else if (level === 3)
        r = and(SWORDS[sword], ...SWORD_POWERS[sword]);
    else
        r = or(...SWORD_POWERS[sword].map(p => and(SWORDS[sword], p)));
    if (Array.isArray(r[0][0]))
        throw new Error();
    return r;
}
export class Overlay {
    constructor(rom, flags, tracker) {
        this.rom = rom;
        this.flags = flags;
        this.tracker = tracker;
        this.relevantFlags = new Set();
        this.tradeIns = new Map();
        this.shootingStatues = new Set();
        for (const flag of RELEVANT_FLAGS) {
            this.relevantFlags.add(flag);
        }
        for (const item of rom.items) {
            if (!item.tradeIn)
                continue;
            const cond = item.id === 0x1d ? Capability.BUY_HEALING : Item(item.id);
            for (let i = 0; i < item.tradeIn.length; i += 6) {
                this.tradeIns.set(item.tradeIn[i], cond);
            }
        }
        for (const loc of rom.locations) {
            for (const spawn of loc.spawns) {
                if (spawn.isMonster() && spawn.id === 0x3f) {
                    this.shootingStatues.add(ScreenId.from(loc, spawn));
                }
            }
        }
    }
    bossRequirements(boss) {
        if (boss === this.rom.bosses.rage) {
            if (this.tracker && this.flags.randomizeTrades())
                return Capability.SWORD;
            return Condition(this.rom.npcs[0xc3].localDialogs.get(-1)[0].condition);
        }
        const id = boss.object;
        const out = new MutableRequirement();
        if (this.tracker && this.flags.shuffleBossElements()) {
            out.addAll(Capability.SWORD);
        }
        else if (this.flags.guaranteeMatchingSword()) {
            const level = this.flags.guaranteeSwordMagic() ? boss.swordLevel : 1;
            const obj = this.rom.objects[id];
            for (let i = 0; i < 4; i++) {
                if (obj.isVulnerable(i))
                    out.addAll(swordRequirement(i, level));
            }
        }
        else {
            out.addAll(Capability.SWORD);
        }
        const extra = [];
        if (this.flags.guaranteeRefresh()) {
            extra.push(Magic.REFRESH);
        }
        if (boss === this.rom.bosses.insect) {
            extra.push(Item.INSECT_FLUTE, Item.GAS_MASK);
        }
        if (boss === this.rom.bosses.draygon2) {
            extra.push(Item.BOW_OF_TRUTH);
            if (this.flags.storyMode()) {
                extra.push(Boss.KELBESQUE1, Boss.KELBESQUE2, Boss.SABERA1, Boss.SABERA2, Boss.MADO1, Boss.MADO2, Boss.KARMINE, Boss.DRAYGON1, Item.SWORD_OF_WIND, Item.SWORD_OF_FIRE, Item.SWORD_OF_WATER, Item.SWORD_OF_THUNDER);
            }
        }
        if (extra.length) {
            out.restrict(and(...extra));
        }
        return out.freeze();
    }
    locations() {
        const locations = [];
        locations.push({
            tile: TileId(0x0f0088),
            slot: Slot(Event.STARTED_WINDMILL),
            condition: Item.WINDMILL_KEY,
        }, {
            tile: TileId(0xe40088),
            slot: Slot(Event.OPENED_JOEL_SHED),
            condition: Item.EYE_GLASSES,
        });
        for (const shop of this.rom.shops) {
            if (shop.location === 0xc3 || shop.location === 0xf6)
                continue;
            if (!shop.used)
                continue;
            if (shop.type !== ShopType.TOOL)
                continue;
            const check = {
                tile: TileId(shop.location << 16 | 0x88),
                condition: Capability.MONEY,
            };
            for (const item of shop.contents) {
                if (item === (Item.MEDICAL_HERB[0][0] & 0xff)) {
                    locations.push({ ...check, slot: Slot(Capability.BUY_HEALING) });
                }
                else if (item === (Item.WARP_BOOTS[0][0] & 0xff)) {
                    locations.push({ ...check, slot: Slot(Capability.BUY_WARP) });
                }
            }
        }
        return locations;
    }
    makeTerrain(effects, tile) {
        const loc = tile >>> 16;
        effects &= 0x26;
        if (loc === 0x1a)
            effects |= 0x08;
        if (loc === 0x60 || loc === 0x68)
            effects |= 0x10;
        if (loc === 0x64 && ((tile & 0xf0f0) < 0x90))
            effects |= 0x10;
        if (this.shootingStatues.has(ScreenId.fromTile(tile)))
            effects |= 0x01;
        if (effects & 0x20) {
            const getEffects = (tile) => {
                const l = this.rom.locations[tile >>> 16];
                const screen = l.screens[(tile & 0xf000) >>> 12][(tile & 0xf00) >>> 8];
                return this.rom.tileEffects[l.tileEffects - 0xb3]
                    .effects[this.rom.screens[screen].tiles[tile & 0xff]];
            };
            let bottom = tile;
            let height = -1;
            while (getEffects(bottom) & 0x20) {
                bottom = TileId.add(bottom, 1, 0);
                height++;
            }
            let top = tile;
            while (getEffects(top) & 0x20) {
                top = TileId.add(top, -1, 0);
                height++;
            }
            if (height < 6) {
                effects &= ~0x20;
            }
            else if (height < 9) {
                effects |= 0x40;
            }
        }
        return TERRAINS[effects];
    }
    extraRoutes() {
        const routes = [];
        const entrance = (location, entrance = 0) => {
            const l = this.rom.locations[location];
            const e = l.entrances[entrance];
            return TileId.from(l, e);
        };
        routes.push({ tile: entrance(0) });
        if (this.flags.teleportOnThunderSword()) {
            const warp = this.rom.townWarp.thunderSwordWarp;
            routes.push({
                tile: entrance(warp[0], warp[1] & 0x1f),
                condition: or(and(Item.SWORD_OF_THUNDER, Capability.BUY_WARP), and(Item.SWORD_OF_THUNDER, Magic.TELEPORT)),
            });
        }
        if (this.flags.assumeWildWarp()) {
            for (const location of this.rom.wildWarp.locations) {
                routes.push({ tile: entrance(location) });
            }
        }
        return routes;
    }
    extraEdges() {
        const edges = [];
        edges.push({
            from: TileId(0x510088),
            to: TileId(0x608688),
            condition: Event.RETURNED_FOG_LAMP,
        });
        return edges;
    }
    trigger(id) {
        switch (id) {
            case 0x9a:
                return { check: [{
                            condition: meet(Event.SHYRON_MASSACRE, this.bossRequirements(this.rom.bosses.mado1)),
                            slot: Slot(Boss.MADO1),
                        }] };
            case 0xaa:
                return { check: [{
                            condition: and(Event.DWARF_CHILD, Capability.BUY_WARP),
                            slot: Slot(Event.RESCUED_CHILD),
                        }] };
            case 0xad:
                return { check: [{
                            condition: Item.KEY_TO_PRISON,
                            slot: Slot(Event.OPENED_PRISON),
                        }] };
            case 0xae:
                return { check: [{
                            condition: Item.KEY_TO_STYX,
                            slot: Slot(Event.OPENED_STYX),
                        }] };
            case 0xaf:
                return { check: [{
                            condition: Item.STATUE_OF_GOLD,
                            slot: Slot(Event.CALMED_SEA),
                        }] };
            case 0xb1:
                return { check: [{
                            condition: and(Item.BOW_OF_SUN, Item.BOW_OF_MOON),
                            slot: Slot(Event.OPENED_CRYPT),
                        }] };
        }
        const trigger = this.rom.triggers[id & 0x7f];
        if (!trigger || !trigger.used)
            throw new Error(`Unknown trigger: ${hex(id)}`);
        const relevant = (f) => this.relevantFlags.has(f);
        const relevantAndSet = (f) => f > 0 && this.relevantFlags.has(f);
        function map(f) {
            if (f < 0)
                return ~map(~f);
            const mapped = FLAG_MAP.get(f);
            return mapped != null ? mapped[0][0] : f;
        }
        const actionItem = TRIGGER_ACTION_ITEMS[trigger.message.action];
        const condition = and(...trigger.conditions.map(map).filter(relevantAndSet).map(Condition));
        if (trigger.message.action === 0x19) {
            const extra = {};
            if (trigger.id === 0x86 && !this.flags.assumeRabbitSkip()) {
                extra.dx = [-32, -16, 0, 16];
            }
            if (trigger.id === 0xba &&
                !this.flags.disableTeleportSkip() &&
                !this.flags.assumeTeleportSkip()) {
                extra.extraLocations = [this.rom.locations.CordelPlainWest];
            }
            const cond = trigger.conditions.map(c => c < 0 && relevant(~map(c)) ?
                Condition(~map(c)) : null)
                .filter((c) => c != null);
            if (cond && cond.length) {
                return { ...extra, terrain: { exit: or(...cond) } };
            }
        }
        else if (actionItem != null) {
            return { check: [{ condition, slot: actionItem }] };
        }
        const flags = trigger.flags.filter(relevantAndSet);
        if (flags.length) {
            return { check: flags.map(f => ({ condition, slot: Slot(f) })) };
        }
        return {};
    }
    npc(id, loc) {
        const npc = this.rom.npcs[id];
        if (!npc || !npc.used)
            throw new Error(`Unknown trigger: ${hex(id)}`);
        const spawnConditions = npc.spawnConditions.get(loc.id) || [];
        const result = { check: [] };
        if (npc.data[2] & 0x04) {
            result.terrain = {
                exit: this.flags.assumeStatueGlitch() ?
                    [[]] :
                    or(...spawnConditions.map(x => FLAG_MAP.get(x) || (this.relevantFlags.has(x) ?
                        Condition(x) : []))),
            };
        }
        function statueOr(...reqs) {
            if (!result.terrain)
                throw new Error('Missing terrain for guard');
            result.terrain.exit = or(result.terrain.exit || [], ...reqs);
        }
        switch (id) {
            case 0x14:
                if (loc.spawns.find(l => l.isNpc() && l.id === 0x15))
                    return {};
            case 0x25:
                result.hitbox = { x0: 0, x1: 2, y0: 0, y1: 1 };
                statueOr(Magic.CHANGE, Magic.PARALYSIS);
                break;
            case 0x2d:
                delete result.terrain;
                break;
            case 0x33:
                statueOr(Magic.PARALYSIS);
                break;
            case 0x38:
                if (loc.id === 0xdf)
                    result.hitbox = { x0: 0, x1: 1, y0: 2, y1: 3 };
                break;
            case 0x4e:
                result.hitbox = { x0: -1, x1: 2, y0: 0, y1: 1 };
                statueOr(Magic.CHANGE, Event.ENTERED_SHYRON);
                break;
            case 0x68:
                result.hitbox = { x0: -1, x1: 2, y0: -1, y1: 2 };
                break;
            case 0x80:
                statueOr(...spawnConditions.map(c => Condition(~c)));
                break;
            case 0x85:
                statueOr(Item.FLUTE_OF_LIME);
                break;
        }
        const requirements = [];
        const addReq = (flag) => {
            if (flag <= 0)
                return;
            const req = FLAG_MAP.get(flag) || (this.relevantFlags.has(flag) ? Condition(flag) : null);
            if (req != null)
                requirements.push(req);
        };
        for (const flag of spawnConditions) {
            addReq(flag);
        }
        const tradeIn = this.tradeIns.get(id);
        if (tradeIn != null) {
            const t = tradeIn;
            function trade(slot, ...reqs) {
                const condition = and(...requirements, t, ...reqs);
                result.check.push({ slot, condition });
            }
            let tradeR = trade;
            if (this.tracker && this.flags.randomizeTrades()) {
                tradeR = (slot, ...reqs) => {
                    const items = [
                        Item.STATUE_OF_ONYX,
                        Item.FOG_LAMP,
                        Item.LOVE_PENDANT,
                        Item.KIRISA_PLANT,
                        Item.IVORY_STATUE,
                    ];
                    const condition = or(...items.map(i => and(...requirements, i, ...reqs)));
                    result.check.push({ slot, condition });
                };
            }
            switch (id) {
                case 0x15:
                    trade(Slot(Item.WINDMILL_KEY));
                    break;
                case 0x23:
                    result.hitbox = { x0: -1, x1: 2, y0: -1, y1: 2 };
                    tradeR(Slot(Item.BOW_OF_MOON), Magic.CHANGE);
                    break;
                case 0x63:
                    result.hitbox = { x0: -1, x1: 2, y0: -1, y1: 2 };
                    trade(Slot(Event.HEALED_DOLPHIN));
                    trade(Slot(Item.SHELL_FLUTE));
                    break;
                case 0x64:
                    tradeR(Slot(Event.RETURNED_FOG_LAMP), ...(this.flags.requireHealedDolphinToRide() ?
                        [Event.HEALED_DOLPHIN] : []));
                    break;
                case 0x6b:
                    trade(Slot(Item.GLOWING_LAMP));
                    break;
                case 0x75:
                    tradeR(Slot(Magic.FLIGHT));
                    break;
                case 0x74:
                    tradeR(Slot(Magic.CHANGE), Magic.PARALYSIS, Event.FOUND_KENSU);
                    break;
                case 0x82:
                    tradeR(Slot(Item.GAS_MASK));
                    break;
                case 0x88:
                    trade(Slot(Item.SHIELD_RING));
                    break;
            }
        }
        if (id === 0x84) {
            const condition = this.bossRequirements(this.rom.bosses.sabera1);
            return { check: [
                    { condition, slot: Slot(Boss.SABERA1) },
                ] };
        }
        else if (id === 0x1d) {
            const slot = Slot(Item.SWORD_OF_FIRE);
            return { check: [
                    { condition: and(Magic.TELEPATHY, Boss.INSECT), slot },
                    { condition: Event.RESCUED_CHILD, slot },
                ] };
        }
        else if (id === 0x1f) {
            const spawns = this.rom.npcs[id].spawnConditions.get(loc.id);
            if (spawns && spawns.includes(0x045))
                return {};
            return { check: [
                    { condition: Event.DWARF_MOTHER, slot: Slot(Event.DWARF_CHILD) },
                ] };
        }
        for (const d of npc.globalDialogs) {
            addReq(~d.condition);
        }
        for (const d of npc.localDialogs.get(loc.id) || npc.localDialogs.get(-1) || []) {
            if (spawnConditions.includes(~d.condition))
                continue;
            const mapped = FLAG_MAP.get(d.condition);
            const positive = mapped ? [mapped] :
                this.relevantFlags.has(d.condition) ? [Condition(d.condition)] :
                    [];
            const condition = and(...positive, ...requirements);
            const negative = FLAG_MAP.get(~d.condition) ||
                (this.relevantFlags.has(~d.condition) ? Condition(~d.condition) : null);
            if (negative != null)
                requirements.push(negative);
            const action = d.message.action;
            if (action === 0x03 || action === 0x0a) {
                result.check.push({ slot: Slot.item(npc.data[0]), condition });
            }
            else if (action === 0x11
                || (this.flags.zebuStudentGivesItem() && action === 0x09)) {
                result.check.push({ slot: Slot.item(npc.data[1]), condition });
            }
            else if (action === 0x10) {
                result.check.push({ slot: Slot(Magic.RECOVER), condition });
            }
            else if (action === 0x08 && id === 0x2d) {
                result.check.push({ slot: Slot(Event.OPENED_SWAN), condition });
            }
            for (const flag of d.flags) {
                const mflag = FLAG_MAP.get(flag);
                const pflag = mflag ? mflag : this.relevantFlags.has(flag) ? Condition(flag) : null;
                if (pflag)
                    result.check.push({ slot: Slot(pflag), condition });
            }
            if (positive.length && spawnConditions.includes(d.condition))
                break;
        }
        return result;
    }
    capabilities() {
        let breakStone = Item.SWORD_OF_WIND;
        let breakIce = Item.SWORD_OF_FIRE;
        let formBridge = Item.SWORD_OF_WATER;
        let breakIron = Item.SWORD_OF_THUNDER;
        if (!this.flags.orbsOptional()) {
            breakStone = or(and(Item.SWORD_OF_WIND, Item.ORB_OF_WIND), and(Item.SWORD_OF_WIND, Item.TORNADO_BRACELET));
            breakIce = or(and(Item.SWORD_OF_FIRE, Item.ORB_OF_FIRE), and(Item.SWORD_OF_FIRE, Item.FLAME_BRACELET));
            formBridge = or(and(Item.SWORD_OF_WATER, Item.ORB_OF_WATER), and(Item.SWORD_OF_WATER, Item.BLIZZARD_BRACELET));
            breakIron = or(and(Item.SWORD_OF_THUNDER, Item.ORB_OF_THUNDER), and(Item.SWORD_OF_THUNDER, Item.STORM_BRACELET));
            if (this.flags.assumeSwordChargeGlitch()) {
                const level2 = or(breakStone, breakIce, formBridge, breakIron);
                function need(sword) {
                    const condition = sword[0][0];
                    return level2.map(c => c[0] === condition ? c : [condition, ...c]);
                }
                breakStone = need(Item.SWORD_OF_WIND);
                breakIce = need(Item.SWORD_OF_FIRE);
                formBridge = need(Item.SWORD_OF_WATER);
                breakIron = need(Item.SWORD_OF_THUNDER);
            }
        }
        const capabilities = [
            [Event.START, and()],
            [Capability.SWORD,
                Item.SWORD_OF_WIND, Item.SWORD_OF_FIRE,
                Item.SWORD_OF_WATER, Item.SWORD_OF_THUNDER],
            [Capability.BREAK_STONE, breakStone],
            [Capability.BREAK_ICE, breakIce],
            [Capability.FORM_BRIDGE, formBridge],
            [Capability.BREAK_IRON, breakIron],
            [Capability.MONEY, Capability.SWORD],
            [Capability.CLIMB_WATERFALL, Magic.FLIGHT],
            [Capability.SHOOTING_STATUE, Magic.BARRIER],
            [Capability.CLIMB_SLOPE, Item.RABBIT_BOOTS, Magic.FLIGHT],
            [Event.OPENED_SEALED_CAVE, Event.STARTED_WINDMILL],
        ];
        if (this.flags.assumeGhettoFlight()) {
            capabilities.push([Capability.CLIMB_WATERFALL, and(Event.RIDE_DOLPHIN, Item.RABBIT_BOOTS)]);
        }
        if (this.flags.fogLampNotRequired()) {
            capabilities.push([Event.RIDE_DOLPHIN, Item.SHELL_FLUTE]);
        }
        if (!this.flags.guaranteeBarrier()) {
            capabilities.push([Capability.SHOOTING_STATUE,
                and(Capability.MONEY, Capability.BUY_HEALING),
                and(Capability.MONEY, Item.SHIELD_RING),
                and(Capability.MONEY, Magic.REFRESH)]);
        }
        if (this.flags.leatherBootsGiveSpeed()) {
            capabilities.push([Capability.CLIMB_SLOPE, Item.LEATHER_BOOTS]);
        }
        for (const boss of this.rom.bosses) {
            if (boss.kill != null && boss.drop != null) {
                capabilities.push([Item(boss.drop), Boss(boss.flag)]);
            }
        }
        capabilities.push([Item.ORB_OF_WATER, Boss.RAGE]);
        if (this.flags.guaranteeGasMask()) {
            capabilities.push([Capability.TRAVEL_SWAMP, Item.GAS_MASK]);
        }
        else {
            capabilities.push([Capability.TRAVEL_SWAMP,
                or(Item.GAS_MASK, and(Capability.MONEY, Item.MEDICAL_HERB), and(Capability.MONEY, Magic.REFRESH))]);
        }
        return capabilities.map(([capability, ...deps]) => ({ capability, condition: or(...deps) }));
    }
    wallCapability(type) {
        return { flag: [Capability.BREAK_STONE, Capability.BREAK_ICE,
                Capability.FORM_BRIDGE, Capability.BREAK_IRON][type][0][0] };
    }
}
const TERRAINS = (() => {
    const out = [];
    for (let effects = 0; effects < 128; effects++) {
        out[effects] = terrain(effects);
    }
    return out;
    function terrain(effects) {
        if (effects & 0x04)
            return undefined;
        const terrain = {};
        if ((effects & 0x12) === 0x12) {
            if (effects & 0x20)
                terrain.exit = Capability.CLIMB_WATERFALL;
            terrain.enter = or(Event.RIDE_DOLPHIN, Magic.FLIGHT);
        }
        else {
            if (effects & 0x40) {
                terrain.exit = Capability.CLIMB_SLOPE;
            }
            else if (effects & 0x20) {
                terrain.exit = Magic.FLIGHT;
            }
            if (effects & 0x02)
                terrain.enter = Magic.FLIGHT;
        }
        if (effects & 0x08) {
            terrain.enter = (terrain.enter || [[]]).map(cs => Capability.TRAVEL_SWAMP[0].concat(cs));
        }
        if (effects & 0x01) {
            terrain.enter = (terrain.enter || [[]]).map(cs => Capability.SHOOTING_STATUE[0].concat(cs));
        }
        return terrain;
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9ncmFwaC9vdmVybGF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFTLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFDN0QsSUFBSSxFQUFxQixHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQUUsUUFBUSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBSy9DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFhbkMsTUFBTSxjQUFjLEdBQUc7SUFDckIsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBRUwsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBR0wsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSztJQUUxQixLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSztJQUN0RCxLQUFLO0lBQ0wsS0FBSztJQUNM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QUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDN0Y7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0FBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Qm9zcywgQ2FwYWJpbGl0eSwgQ2hlY2ssIENvbmRpdGlvbiwgRXZlbnQsIEl0ZW0sIE1hZ2ljLCBNdXRhYmxlUmVxdWlyZW1lbnQsXG4gICAgICAgIFJlcXVpcmVtZW50LCBTbG90LCBUZXJyYWluLCBXYWxsVHlwZSwgYW5kLCBtZWV0LCBvcn0gZnJvbSAnLi9jb25kaXRpb24uanMnO1xuaW1wb3J0IHtUaWxlSWQsIFNjcmVlbklkfSBmcm9tICcuL2dlb21ldHJ5LmpzJztcbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7Qm9zcyBhcyBSb21Cb3NzfSBmcm9tICcuLi9yb20vYm9zc2VzLmpzJztcbmltcG9ydCB7TG9jYXRpb259IGZyb20gJy4uL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge1Nob3BUeXBlfSBmcm9tICcuLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge2hleH0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuXG4vLyBBZGRpdGlvbmFsIGluZm9ybWF0aW9uIG5lZWRlZCB0byBpbnRlcnByZXQgdGhlIHdvcmxkIGdyYXBoIGRhdGEuXG4vLyBUaGlzIGdldHMgaW50byBtb3JlIHNwZWNpZmljcyBhbmQgaGFyZGNvZGluZy5cblxuLy8gVE9ETyAtIG1heWJlIGNvbnNpZGVyIGhhdmluZyBhIHNldCBvZiBBU1NVTUVEIGFuZCBhIHNldCBvZiBJR05PUkVEIGZsYWdzP1xuLy8gICAgICAtIGUuZy4gYWx3YXlzIGFzc3VtZSAwMGYgaXMgRkFMU0UgcmF0aGVyIHRoYW4gVFJVRSwgdG8gYXZvaWQgZnJlZSB3aW5kbWlsbCBrZXlcblxuXG4vLyBUT0RPIC0gcHJpc29uIGtleSBtaXNzaW5nIGZyb20gcGFyYWx5c2lzIGRlcHMgKG9yIHJhdGhlciBhIG5vbi1mbGlnaHQgdmVyc2lvbikhXG5cblxuXG5jb25zdCBSRUxFVkFOVF9GTEFHUyA9IFtcbiAgMHgwMGEsIC8vIHVzZWQgd2luZG1pbGwga2V5XG4gIDB4MDBiLCAvLyB0YWxrZWQgdG8gbGVhZiBlbGRlclxuICAweDAxMywgLy8ga2lsbGVkIHNhYmVyYSAxXG4gIDB4MDE4LCAvLyBlbnRlcmVkIHVuZGVyZ3JvdW5kIGNoYW5uZWxcbiAgMHgwMWIsIC8vIG1lc2lhIHJlY29yZGluZyBwbGF5ZWRcbiAgMHgwMWUsIC8vIHF1ZWVuIHJldmVhbGVkXG4gIDB4MDIxLCAvLyByZXR1cm5lZCBmb2cgbGFtcFxuICAvLyAweDAyNCwgLy8gZ2VuZXJhbHMgZGVmZWF0ZWQgKGdvdCBpdm9yeSBzdGF0dWUpXG4gIDB4MDI1LCAvLyBoZWFsZWQgZG9scGhpblxuICAweDAyNiwgLy8gZW50ZXJlZCBzaHlyb24gKGZvciBnb2EgZ3VhcmRzKVxuICAweDAyNywgLy8gc2h5cm9uIG1hc3NhY3JlXG4gIC8vIDB4MzUsIC8vIGN1cmVkIGFrYWhhbmFcbiAgMHgwMzgsIC8vIGxlYWYgYWJkdWN0aW9uXG4gIDB4MDNhLCAvLyB0YWxrZWQgdG8gemVidSBpbiBjYXZlIChhZGRlZCBhcyByZXEgZm9yIGFiZHVjdGlvbilcbiAgMHgwM2IsIC8vIHRhbGtlZCB0byB6ZWJ1IGluIHNoeXJvbiAoYWRkZWQgYXMgcmVxIGZvciBtYXNzYWNyZSlcbiAgMHgwNDUsIC8vIHJlc2N1ZWQgY2hpbGRcbiAgMHgwNTIsIC8vIHRhbGtlZCB0byBkd2FyZiBtb3RoZXJcbiAgMHgwNTMsIC8vIGNoaWxkIGZvbGxvd2luZ1xuICAweDA2MSwgLy8gdGFsa2VkIHRvIHN0b20gaW4gc3dhbiBodXRcbiAgMHgwNjcsIC8vIGtpbGxlZCBtYWRvIDFcbiAgLy8gMHgwNmMsIC8vIGRlZmVhdGVkIGRyYXlnb24gMVxuICAweDA3MiwgLy8ga2Vuc3UgZm91bmQgaW4gdGF2ZXJuXG4gIDB4MDhiLCAvLyBnb3Qgc2hlbGwgZmx1dGVcbiAgMHgwOWIsIC8vIGFibGUgdG8gcmlkZSBkb2xwaGluXG4gIDB4MGE1LCAvLyB0YWxrZWQgdG8gemVidSBzdHVkZW50XG4gIDB4MGE5LCAvLyB0YWxrZWQgdG8gbGVhZiByYWJiaXRcbiAgMHgxMDAsIC8vIGtpbGxlZCB2YW1waXJlIDFcbiAgMHgxMDEsIC8vIGtpbGxlZCBpbnNlY3RcbiAgMHgxMDIsIC8vIGtpbGxlZCBrZWxiZXNxdWUgMVxuICAweDEwMywgLy8gcmFnZVxuICAweDEwNSwgLy8ga2lsbGVkIGtlbGJlc3F1ZSAyXG4gIDB4MTA2LCAvLyBraWxsZWQgc2FiZXJhIDJcbiAgMHgxMDcsIC8vIGtpbGxlZCBtYWRvIDJcbiAgMHgxMDgsIC8vIGtpbGxlZCBrYXJtaW5lXG4gIDB4MTBiLCAvLyBraWxsZWQgZHJheWdvbiAxXG4gIDB4MTBjLCAvLyBraWxsZWQgdmFtcGlyZSAyXG5cbiAgLy8gc3dvcmRzIChtYXkgYmUgbmVlZGVkIGZvciByYWdlLCBTb1QgZm9yIG1hc3NhY3JlKVxuICAweDIwMCwgMHgyMDEsIDB4MjAyLCAweDIwMyxcbiAgLy8gYmFsbHMgYW5kIGJyYWNlbGV0cyBtYXkgYmUgbmVlZGVkIGZvciB0ZWxlcG9ydFxuICAweDIwNSwgMHgyMDYsIDB4MjA3LCAweDIwOCwgMHgyMDksIDB4MjBhLCAweDIwYiwgMHgyMGMsXG4gIDB4MjM2LCAvLyBzaGVsbCBmbHV0ZSAoZm9yIGZpc2hlcm1hbiBzcGF3bilcbiAgMHgyNDMsIC8vIHRlbGVwYXRoeSAoZm9yIHJhYmJpdCwgb2FrLCBkZW8pXG4gIDB4MjQ0LCAvLyB0ZWxlcG9ydCAoZm9yIG10IHNhYnJlIHRyaWdnZXIpXG4gIDB4MjgzLCAvLyBjYWxtZWQgc2VhIChmb3IgYmFycmllcilcbiAgMHgyOGQsIC8vIGtpbGxlZCBkcmF5Z29uIDIgKHdhbGwgZGVzdHJveWVkKVxuICAweDJlZSwgLy8gc3RhcnRlZCB3aW5kbWlsbCAoZm9yIHJlZnJlc2gpXG5cbiAgLy8gTk9URTogdGhlc2UgYXJlIG1vdmVkIGJlY2F1c2Ugb2Ygem9tYmllIHdhcnAhXG4gIDB4MmY2LCAvLyB3YXJwOm9hayAoZm9yIHRlbGVwYXRoeSlcbiAgLy8gMHgyZmEsIC8vIHdhcnA6am9lbCAoZm9yIGV2aWwgc3Bpcml0IGlzbGFuZClcbiAgMHgyZmQsIC8vIHdhcnA6c2h5cm9uIChmb3IgdGVsZXBhdGh5KVxuXG4gIC8vIE1hZ2ljLkNIQU5HRVswXVswXSxcbiAgLy8gTWFnaWMuVEVMRVBBVEhZWzBdWzBdLFxuXTtcblxuLy8gVE9ETyAtIHRoaXMgaXMgbm90IHBlcnZhc2l2ZSBlbm91Z2ghISFcbi8vICAtIG5lZWQgYSB3YXkgdG8gcHV0IGl0IGV2ZXJ5d2hlcmVcbi8vICAgIC0+IG1heWJlIGluIE11dGFibGVSZXF1aXJlbWVudHM/XG5jb25zdCBGTEFHX01BUDogTWFwPG51bWJlciwgcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXT4gPSBuZXcgTWFwKFtcbiAgWzB4MDBhLCBFdmVudC5TVEFSVEVEX1dJTkRNSUxMXSwgLy8gdGhpcyBpcyByZWYnZCBvdXRzaWRlIHRoaXMgZmlsZSFcbiAgLy9bMHgwMGUsIE1hZ2ljLlRFTEVQQVRIWV0sXG4gIC8vWzB4MDNmLCBNYWdpYy5URUxFUE9SVF0sXG4gIC8vIFF1ZWVuIHdpbGwgZ2l2ZSBmbHV0ZSBvZiBsaW1lIHcvbyBwYXJhbHlzaXMgaW4gdGhpcyBjYXNlLlxuICBbMHgwMTcsIEl0ZW0uU1dPUkRfT0ZfV0FURVJdLFxuICBbMHgwMjgsIE1hZ2ljLkNIQU5HRV0sXG4gIFsweDAyOSwgTWFnaWMuQ0hBTkdFXSxcbiAgWzB4MDJhLCBNYWdpYy5DSEFOR0VdLFxuICBbMHgwMmIsIE1hZ2ljLkNIQU5HRV0sXG4gIFsweDA2YywgQm9zcy5EUkFZR09OMV0sXG4gIFsweDA4YiwgSXRlbS5TSEVMTF9GTFVURV0sXG4gIFsweDBlZSwgRXZlbnQuUklERV9ET0xQSElOXSwgLy8gTk9URTogY3VzdG9tIGZsYWdcbl0pO1xuXG4vLyBNYXBzIHRyaWdnZXIgYWN0aW9ucyB0byB0aGUgc2xvdCB0aGV5IGdyYW50LlxuY29uc3QgVFJJR0dFUl9BQ1RJT05fSVRFTVM6IHtbYWN0aW9uOiBudW1iZXJdOiBTbG90fSA9IHtcbiAgMHgwODogU2xvdChNYWdpYy5QQVJBTFlTSVMpLFxuICAweDBiOiBTbG90KE1hZ2ljLkJBUlJJRVIpLFxuICAweDBmOiBTbG90KE1hZ2ljLlJFRlJFU0gpLFxuICAweDE4OiBTbG90KE1hZ2ljLlRFTEVQQVRIWSksXG59O1xuXG5jb25zdCBTV09SRFMgPSBbSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLlNXT1JEX09GX0ZJUkUsXG4gICAgICAgICAgICAgICAgSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5TV09SRF9PRl9USFVOREVSXSBhcyBjb25zdDtcbmNvbnN0IFNXT1JEX1BPV0VSUyA9IFtcbiAgW0l0ZW0uT1JCX09GX1dJTkQsIEl0ZW0uVE9STkFET19CUkFDRUxFVF0sXG4gIFtJdGVtLk9SQl9PRl9GSVJFLCBJdGVtLkZMQU1FX0JSQUNFTEVUXSxcbiAgW0l0ZW0uT1JCX09GX1dBVEVSLCBJdGVtLkJMSVpaQVJEX0JSQUNFTEVUXSxcbiAgW0l0ZW0uT1JCX09GX1RIVU5ERVIsIEl0ZW0uU1RPUk1fQlJBQ0VMRVRdLFxuXSBhcyBjb25zdDtcblxuZnVuY3Rpb24gc3dvcmRSZXF1aXJlbWVudChzd29yZDogbnVtYmVyLCBsZXZlbDogbnVtYmVyKTogUmVxdWlyZW1lbnQge1xuICBsZXQgcjtcbiAgaWYgKGxldmVsID09PSAxKSByPSBTV09SRFNbc3dvcmRdO1xuICBlbHNlIGlmIChsZXZlbCA9PT0gMykgcj0gYW5kKFNXT1JEU1tzd29yZF0sIC4uLlNXT1JEX1BPV0VSU1tzd29yZF0pO1xuICBlbHNlIHI9IG9yKC4uLlNXT1JEX1BPV0VSU1tzd29yZF0ubWFwKHAgPT4gYW5kKFNXT1JEU1tzd29yZF0sIHApKSk7XG4gIGlmIChBcnJheS5pc0FycmF5KHJbMF1bMF0pKSB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgcmV0dXJuIHI7XG59XG5cbmV4cG9ydCBjbGFzcyBPdmVybGF5IHtcblxuICBwcml2YXRlIHJlYWRvbmx5IHJlbGV2YW50RmxhZ3MgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgLy8gbnBjIGlkIC0+IHdhbnRlZCBpdGVtXG4gIHByaXZhdGUgcmVhZG9ubHkgdHJhZGVJbnMgPSBuZXcgTWFwPG51bWJlciwgcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXT4oKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IHNob290aW5nU3RhdHVlcyA9IG5ldyBTZXQ8U2NyZWVuSWQ+KCk7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGZsYWdzOiBGbGFnU2V0LFxuICAgICAgICAgICAgICBwcml2YXRlIHJlYWRvbmx5IHRyYWNrZXI6IGJvb2xlYW4pIHtcbiAgICAvLyBUT0RPIC0gYWRqdXN0IGJhc2VkIG9uIGZsYWdzZXQ/XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIFJFTEVWQU5UX0ZMQUdTKSB7XG4gICAgICB0aGlzLnJlbGV2YW50RmxhZ3MuYWRkKGZsYWcpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygcm9tLml0ZW1zKSB7XG4gICAgICBpZiAoIWl0ZW0udHJhZGVJbikgY29udGludWU7XG4gICAgICBjb25zdCBjb25kID0gaXRlbS5pZCA9PT0gMHgxZCA/IENhcGFiaWxpdHkuQlVZX0hFQUxJTkcgOiBJdGVtKGl0ZW0uaWQpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtLnRyYWRlSW4ubGVuZ3RoOyBpICs9IDYpIHtcbiAgICAgICAgdGhpcy50cmFkZUlucy5zZXQoaXRlbS50cmFkZUluW2ldLCBjb25kKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBsb2Mgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2Muc3Bhd25zKSB7XG4gICAgICAgIGlmIChzcGF3bi5pc01vbnN0ZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHgzZikgeyAvLyBzaG9vdGluZyBzdGF0dWVzXG4gICAgICAgICAgdGhpcy5zaG9vdGluZ1N0YXR1ZXMuYWRkKFNjcmVlbklkLmZyb20obG9jLCBzcGF3bikpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vICAgMHgxZCwgLy8gbWVkaWNhbCBoZXJiXG4gICAgLy8gICAweDI1LCAvLyBzdGF0dWUgb2Ygb255eFxuICAgIC8vICAgMHgzNSwgLy8gZm9nIGxhbXBcbiAgICAvLyAgIDB4M2IsIC8vIGxvdmUgcGVuZGFudFxuICAgIC8vICAgMHgzYywgLy8ga2lyaXNhIHBsYW50XG4gICAgLy8gICAweDNkLCAvLyBpdm9yeSBzdGF0dWVcbiAgICAvLyBdLm1hcChpID0+IHRoaXMucm9tLml0ZW1zW2ldKTtcbiAgfVxuXG4gIC8qKiBAcGFyYW0gaWQgT2JqZWN0IElEIG9mIHRoZSBib3NzLiAqL1xuICBib3NzUmVxdWlyZW1lbnRzKGJvc3M6IFJvbUJvc3MpOiBSZXF1aXJlbWVudCB7XG4gICAgLy8gVE9ETyAtIGhhbmRsZSBib3NzIHNodWZmbGUgc29tZWhvdz9cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLnJhZ2UpIHtcbiAgICAgIGlmICh0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFncy5yYW5kb21pemVUcmFkZXMoKSkgcmV0dXJuIENhcGFiaWxpdHkuU1dPUkQ7XG4gICAgICAvLyByZXR1cm4gSXRlbS5TV09SRF9PRl9XQVRFUjtcbiAgICAgIHJldHVybiBDb25kaXRpb24odGhpcy5yb20ubnBjc1sweGMzXS5sb2NhbERpYWxvZ3MuZ2V0KC0xKSFbMF0uY29uZGl0aW9uKTtcbiAgICB9XG4gICAgY29uc3QgaWQgPSBib3NzLm9iamVjdDtcbiAgICBjb25zdCBvdXQgPSBuZXcgTXV0YWJsZVJlcXVpcmVtZW50KCk7XG4gICAgaWYgKHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzLnNodWZmbGVCb3NzRWxlbWVudHMoKSkge1xuICAgICAgb3V0LmFkZEFsbChDYXBhYmlsaXR5LlNXT1JEKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuZmxhZ3MuZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpKSB7XG4gICAgICBjb25zdCBsZXZlbCA9IHRoaXMuZmxhZ3MuZ3VhcmFudGVlU3dvcmRNYWdpYygpID8gYm9zcy5zd29yZExldmVsIDogMTtcbiAgICAgIGNvbnN0IG9iaiA9IHRoaXMucm9tLm9iamVjdHNbaWRdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyBpKyspIHtcbiAgICAgICAgaWYgKG9iai5pc1Z1bG5lcmFibGUoaSkpIG91dC5hZGRBbGwoc3dvcmRSZXF1aXJlbWVudChpLCBsZXZlbCkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQuYWRkQWxsKENhcGFiaWxpdHkuU1dPUkQpO1xuICAgIH1cbiAgICBjb25zdCBleHRyYTogQ2FwYWJpbGl0eVtdID0gW107XG4gICAgaWYgKHRoaXMuZmxhZ3MuZ3VhcmFudGVlUmVmcmVzaCgpKSB7XG4gICAgICAvLyBUT0RPIC0gbWFrZSB0aGlzIFwiZ3VhcmFudGVlIGRlZmVuc2l2ZSBtYWdpY1wiIGFuZCBhbGxvdyByZWZyZXNoIE9SIGJhcnJpZXI/XG4gICAgICBleHRyYS5wdXNoKE1hZ2ljLlJFRlJFU0gpO1xuICAgIH1cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLmluc2VjdCkgeyAvLyBpbnNlY3RcbiAgICAgIGV4dHJhLnB1c2goSXRlbS5JTlNFQ1RfRkxVVEUsIEl0ZW0uR0FTX01BU0spO1xuICAgIH1cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLmRyYXlnb24yKSB7XG4gICAgICBleHRyYS5wdXNoKEl0ZW0uQk9XX09GX1RSVVRIKTtcbiAgICAgIGlmICh0aGlzLmZsYWdzLnN0b3J5TW9kZSgpKSB7XG4gICAgICAgIGV4dHJhLnB1c2goXG4gICAgICAgICAgQm9zcy5LRUxCRVNRVUUxLFxuICAgICAgICAgIEJvc3MuS0VMQkVTUVVFMixcbiAgICAgICAgICBCb3NzLlNBQkVSQTEsXG4gICAgICAgICAgQm9zcy5TQUJFUkEyLFxuICAgICAgICAgIEJvc3MuTUFETzEsXG4gICAgICAgICAgQm9zcy5NQURPMixcbiAgICAgICAgICBCb3NzLktBUk1JTkUsXG4gICAgICAgICAgQm9zcy5EUkFZR09OMSxcbiAgICAgICAgICBJdGVtLlNXT1JEX09GX1dJTkQsXG4gICAgICAgICAgSXRlbS5TV09SRF9PRl9GSVJFLFxuICAgICAgICAgIEl0ZW0uU1dPUkRfT0ZfV0FURVIsXG4gICAgICAgICAgSXRlbS5TV09SRF9PRl9USFVOREVSKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGV4dHJhLmxlbmd0aCkge1xuICAgICAgb3V0LnJlc3RyaWN0KGFuZCguLi5leHRyYSkpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmZyZWV6ZSgpO1xuICB9XG5cbiAgbG9jYXRpb25zKCk6IFRpbGVDaGVja1tdIHtcbiAgICBjb25zdCBsb2NhdGlvbnM6IFRpbGVDaGVja1tdID0gW107XG4gICAgLy8gVE9ETyAtIHB1bGwgdGhlIGxvY2F0aW9uIG91dCBvZiBpdGVtVXNlRGF0YVswXSBmb3IgdGhlc2UgaXRlbXNcbiAgICBsb2NhdGlvbnMucHVzaCh7XG4gICAgICB0aWxlOiBUaWxlSWQoMHgwZjAwODgpLFxuICAgICAgc2xvdDogU2xvdChFdmVudC5TVEFSVEVEX1dJTkRNSUxMKSxcbiAgICAgIGNvbmRpdGlvbjogSXRlbS5XSU5ETUlMTF9LRVksXG4gICAgfSwge1xuICAgICAgdGlsZTogVGlsZUlkKDB4ZTQwMDg4KSxcbiAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX0pPRUxfU0hFRCksXG4gICAgICBjb25kaXRpb246IEl0ZW0uRVlFX0dMQVNTRVMsXG4gICAgfSk7XG4gICAgZm9yIChjb25zdCBzaG9wIG9mIHRoaXMucm9tLnNob3BzKSB7XG4gICAgICAvLyBsZWFmIGFuZCBzaHlyb24gbWF5IG5vdCBhbHdheXMgYmUgYWNjZXNzaWJsZSwgc28gZG9uJ3QgcmVseSBvbiB0aGVtLlxuICAgICAgaWYgKHNob3AubG9jYXRpb24gPT09IDB4YzMgfHwgc2hvcC5sb2NhdGlvbiA9PT0gMHhmNikgY29udGludWU7XG4gICAgICBpZiAoIXNob3AudXNlZCkgY29udGludWU7XG4gICAgICBpZiAoc2hvcC50eXBlICE9PSBTaG9wVHlwZS5UT09MKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGNoZWNrID0ge1xuICAgICAgICB0aWxlOiBUaWxlSWQoc2hvcC5sb2NhdGlvbiA8PCAxNiB8IDB4ODgpLFxuICAgICAgICBjb25kaXRpb246IENhcGFiaWxpdHkuTU9ORVksXG4gICAgICB9O1xuICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHNob3AuY29udGVudHMpIHtcbiAgICAgICAgaWYgKGl0ZW0gPT09IChJdGVtLk1FRElDQUxfSEVSQlswXVswXSAmIDB4ZmYpKSB7XG4gICAgICAgICAgbG9jYXRpb25zLnB1c2goey4uLmNoZWNrLCBzbG90OiBTbG90KENhcGFiaWxpdHkuQlVZX0hFQUxJTkcpfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSA9PT0gKEl0ZW0uV0FSUF9CT09UU1swXVswXSAmIDB4ZmYpKSB7XG4gICAgICAgICAgbG9jYXRpb25zLnB1c2goey4uLmNoZWNrLCBzbG90OiBTbG90KENhcGFiaWxpdHkuQlVZX1dBUlApfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxvY2F0aW9ucztcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHVuZGVmaW5lZCBpZiBpbXBhc3NhYmxlLiAqL1xuICBtYWtlVGVycmFpbihlZmZlY3RzOiBudW1iZXIsIHRpbGU6IFRpbGVJZCk6IFRlcnJhaW4gfCB1bmRlZmluZWQge1xuICAgIC8vIENoZWNrIGZvciBkb2xwaGluIG9yIHN3YW1wLiAgQ3VycmVudGx5IGRvbid0IHN1cHBvcnQgc2h1ZmZsaW5nIHRoZXNlLlxuICAgIGNvbnN0IGxvYyA9IHRpbGUgPj4+IDE2O1xuICAgIGVmZmVjdHMgJj0gMHgyNjtcbiAgICBpZiAobG9jID09PSAweDFhKSBlZmZlY3RzIHw9IDB4MDg7XG4gICAgaWYgKGxvYyA9PT0gMHg2MCB8fCBsb2MgPT09IDB4NjgpIGVmZmVjdHMgfD0gMHgxMDtcbiAgICAvLyBOT1RFOiBvbmx5IHRoZSB0b3AgaGFsZi1zY3JlZW4gaW4gdW5kZXJncm91bmQgY2hhbm5lbCBpcyBkb2xwaGluYWJsZVxuICAgIGlmIChsb2MgPT09IDB4NjQgJiYgKCh0aWxlICYgMHhmMGYwKSA8IDB4OTApKSBlZmZlY3RzIHw9IDB4MTA7XG4gICAgaWYgKHRoaXMuc2hvb3RpbmdTdGF0dWVzLmhhcyhTY3JlZW5JZC5mcm9tVGlsZSh0aWxlKSkpIGVmZmVjdHMgfD0gMHgwMTtcbiAgICBpZiAoZWZmZWN0cyAmIDB4MjApIHsgLy8gc2xvcGVcbiAgICAgIC8vIERldGVybWluZSBsZW5ndGggb2Ygc2xvcGU6IHNob3J0IHNsb3BlcyBhcmUgY2xpbWJhYmxlLlxuICAgICAgLy8gNi04IGFyZSBib3RoIGRvYWJsZSB3aXRoIGJvb3RzXG4gICAgICAvLyAwLTUgaXMgZG9hYmxlIHdpdGggbm8gYm9vdHNcbiAgICAgIC8vIDkgaXMgZG9hYmxlIHdpdGggcmFiYml0IGJvb3RzIG9ubHkgKG5vdCBhd2FyZSBvZiBhbnkgb2YgdGhlc2UuLi4pXG4gICAgICAvLyAxMCBpcyByaWdodCBvdXRcbiAgICAgIGNvbnN0IGdldEVmZmVjdHMgPSAodGlsZTogVGlsZUlkKTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgbCA9IHRoaXMucm9tLmxvY2F0aW9uc1t0aWxlID4+PiAxNl07XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IGwuc2NyZWVuc1sodGlsZSAmIDB4ZjAwMCkgPj4+IDEyXVsodGlsZSAmIDB4ZjAwKSA+Pj4gOF07XG4gICAgICAgIHJldHVybiB0aGlzLnJvbS50aWxlRWZmZWN0c1tsLnRpbGVFZmZlY3RzIC0gMHhiM11cbiAgICAgICAgICAgIC5lZmZlY3RzW3RoaXMucm9tLnNjcmVlbnNbc2NyZWVuXS50aWxlc1t0aWxlICYgMHhmZl1dO1xuICAgICAgfTtcbiAgICAgIGxldCBib3R0b20gPSB0aWxlO1xuICAgICAgbGV0IGhlaWdodCA9IC0xO1xuICAgICAgd2hpbGUgKGdldEVmZmVjdHMoYm90dG9tKSAmIDB4MjApIHtcbiAgICAgICAgYm90dG9tID0gVGlsZUlkLmFkZChib3R0b20sIDEsIDApO1xuICAgICAgICBoZWlnaHQrKztcbiAgICAgIH1cbiAgICAgIGxldCB0b3AgPSB0aWxlO1xuICAgICAgd2hpbGUgKGdldEVmZmVjdHModG9wKSAmIDB4MjApIHtcbiAgICAgICAgdG9wID0gVGlsZUlkLmFkZCh0b3AsIC0xLCAwKTtcbiAgICAgICAgaGVpZ2h0Kys7XG4gICAgICB9XG4gICAgICBpZiAoaGVpZ2h0IDwgNikge1xuICAgICAgICBlZmZlY3RzICY9IH4weDIwO1xuICAgICAgfSBlbHNlIGlmIChoZWlnaHQgPCA5KSB7XG4gICAgICAgIGVmZmVjdHMgfD0gMHg0MDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFRFUlJBSU5TW2VmZmVjdHNdO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNvbnNpZGVyIGZvbGRpbmcgdGhpcyBpbnRvIGxvY2F0aW9uL3RyaWdnZXIvbnBjIGFzIGFuIGV4dHJhIHJldHVybj9cbiAgZXh0cmFSb3V0ZXMoKTogRXh0cmFSb3V0ZVtdIHtcbiAgICBjb25zdCByb3V0ZXMgPSBbXTtcbiAgICBjb25zdCBlbnRyYW5jZSA9IChsb2NhdGlvbjogbnVtYmVyLCBlbnRyYW5jZTogbnVtYmVyID0gMCk6IFRpbGVJZCA9PiB7XG4gICAgICBjb25zdCBsID0gdGhpcy5yb20ubG9jYXRpb25zW2xvY2F0aW9uXTtcbiAgICAgIGNvbnN0IGUgPSBsLmVudHJhbmNlc1tlbnRyYW5jZV07XG4gICAgICByZXR1cm4gVGlsZUlkLmZyb20obCwgZSk7XG4gICAgfTtcbiAgICAvLyBTdGFydCB0aGUgZ2FtZSBhdCAwOjBcbiAgICByb3V0ZXMucHVzaCh7dGlsZTogZW50cmFuY2UoMCl9KTtcbiAgICAvLyBTd29yZCBvZiBUaHVuZGVyIHdhcnBcbiAgICAvLyBUT0RPIC0gZW50cmFuY2Ugc2h1ZmZsZSB3aWxsIGJyZWFrIHRoZSBhdXRvLXdhcnAtcG9pbnQgYWZmb3JkYW5jZS5cbiAgICBpZiAodGhpcy5mbGFncy50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCkpIHtcbiAgICAgIGNvbnN0IHdhcnAgPSB0aGlzLnJvbS50b3duV2FycC50aHVuZGVyU3dvcmRXYXJwO1xuICAgICAgcm91dGVzLnB1c2goe1xuICAgICAgICB0aWxlOiBlbnRyYW5jZSh3YXJwWzBdLCB3YXJwWzFdICYgMHgxZiksXG4gICAgICAgIGNvbmRpdGlvbjogb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUiwgQ2FwYWJpbGl0eS5CVVlfV0FSUCksXG4gICAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUiwgTWFnaWMuVEVMRVBPUlQpKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFncy5hc3N1bWVXaWxkV2FycCgpKSB7XG4gICAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMucm9tLndpbGRXYXJwLmxvY2F0aW9ucykge1xuICAgICAgICByb3V0ZXMucHVzaCh7dGlsZTogZW50cmFuY2UobG9jYXRpb24pfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByb3V0ZXM7XG4gIH1cblxuICAvLyBUT0RPIC0gY29uc2lkZXIgZm9sZGluZyB0aGlzIGludG8gbG9jYXRpb24vdHJpZ2dlci9ucGMgYXMgYW4gZXh0cmEgcmV0dXJuP1xuICBleHRyYUVkZ2VzKCk6IEV4dHJhRWRnZVtdIHtcbiAgICBjb25zdCBlZGdlcyA9IFtdO1xuICAgIC8vIG5lZWQgYW4gZWRnZSBmcm9tIHRoZSBib2F0IGhvdXNlIHRvIHRoZSBiZWFjaCAtIHdlIGNvdWxkIGJ1aWxkIHRoaXMgaW50byB0aGVcbiAgICAvLyBib2F0IGJvYXJkaW5nIHRyaWdnZXIsIGJ1dCBmb3Igbm93IGl0J3MgaGVyZS5cbiAgICBlZGdlcy5wdXNoKHtcbiAgICAgIGZyb206IFRpbGVJZCgweDUxMDA4OCksIC8vIGluIGZyb250IG9mIGJvYXQgaG91c2VcbiAgICAgIHRvOiBUaWxlSWQoMHg2MDg2ODgpLCAvLyBpbiBmcm9udCBvZiBjYWJpblxuICAgICAgY29uZGl0aW9uOiBFdmVudC5SRVRVUk5FRF9GT0dfTEFNUCxcbiAgICB9KTtcbiAgICByZXR1cm4gZWRnZXM7XG4gIH1cblxuICB0cmlnZ2VyKGlkOiBudW1iZXIpOiBUcmlnZ2VyRGF0YSB7XG4gICAgc3dpdGNoIChpZCkge1xuICAgIGNhc2UgMHg5YTogLy8gc3RhcnQgZmlnaHQgd2l0aCBtYWRvIGlmIHNoeXJvbiBtYXNzYWNyZSBzdGFydGVkXG4gICAgICAvLyBUT0RPIC0gbG9vayB1cCB3aG8gdGhlIGFjdHVhbCBib3NzIGlzIG9uY2Ugd2UgZ2V0IGJvc3Mgc2h1ZmZsZSEhIVxuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBtZWV0KEV2ZW50LlNIWVJPTl9NQVNTQUNSRSwgdGhpcy5ib3NzUmVxdWlyZW1lbnRzKHRoaXMucm9tLmJvc3Nlcy5tYWRvMSkpLFxuICAgICAgICBzbG90OiBTbG90KEJvc3MuTUFETzEpLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhhYTogLy8gZW50ZXIgb2FrIGFmdGVyIGluc2VjdFxuICAgICAgLy8gTk9URTogVGhpcyBpcyBub3QgdGhlIHRyaWdnZXIgdGhhdCBjaGVja3MsIGJ1dCByYXRoZXIgaXQgaGFwcGVucyBvbiB0aGUgZW50cmFuY2UuXG4gICAgICAvLyBUaGlzIGlzIGEgY29udmVuaWVudCBwbGFjZSB0byBoYW5kbGUgaXQsIHRob3VnaCwgc2luY2Ugd2UgYWxyZWFkeSBuZWVkIHRvIGV4cGxpY2l0bHlcbiAgICAgIC8vIGlnbm9yZSB0aGlzIHRyaWdnZXIuICBXZSBhbHNvIHJlcXVpcmUgd2FycCBib290cyBiZWNhdXNlIGl0J3MgcG9zc2libGUgdGhhdCB0aGVyZSdzXG4gICAgICAvLyBubyBkaXJlY3Qgd2Fsa2luZyBwYXRoIGFuZCBpdCdzIG5vdCBmZWFzaWJsZSB0byBjYXJyeSB0aGUgY2hpbGQgd2l0aCB1cyBldmVyeXdoZXJlLFxuICAgICAgLy8gZHVlIHRvIGdyYXBoaWNzIHJlYXNvbnMuXG4gICAgICByZXR1cm4ge2NoZWNrOlt7XG4gICAgICAgIGNvbmRpdGlvbjogYW5kKEV2ZW50LkRXQVJGX0NISUxELCBDYXBhYmlsaXR5LkJVWV9XQVJQKSxcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5SRVNDVUVEX0NISUxEKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YWQ6IC8vIGFsbG93IG9wZW5pbmcgcHJpc29uIGRvb3JcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogSXRlbS5LRVlfVE9fUFJJU09OLFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9QUklTT04pLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhhZTogLy8gYWxsb3cgb3BlbmluZyBzdHh5XG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IEl0ZW0uS0VZX1RPX1NUWVgsXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX1NUWVgpLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhhZjogLy8gYWxsb3cgY2FsbWluZyBzZWFcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogSXRlbS5TVEFUVUVfT0ZfR09MRCxcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5DQUxNRURfU0VBKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YjE6IC8vIHN0YXJ0IGZpZ2h0IHdpdGggZ3VhcmRpYW4gc3RhdHVlc1xuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBhbmQoSXRlbS5CT1dfT0ZfU1VOLCBJdGVtLkJPV19PRl9NT09OKSxcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5PUEVORURfQ1JZUFQpLFxuICAgICAgfV19O1xuICAgIH1cbiAgICAvLyBDaGVjayBmb3IgcmVsZXZhbnQgZmxhZ3MgYW5kIGtub3duIGFjdGlvbiB0eXBlcy5cbiAgICBjb25zdCB0cmlnZ2VyID0gdGhpcy5yb20udHJpZ2dlcnNbaWQgJiAweDdmXTtcbiAgICBpZiAoIXRyaWdnZXIgfHwgIXRyaWdnZXIudXNlZCkgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRyaWdnZXI6ICR7aGV4KGlkKX1gKTtcbiAgICBjb25zdCByZWxldmFudCA9IChmOiBudW1iZXIpID0+IHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZik7XG4gICAgY29uc3QgcmVsZXZhbnRBbmRTZXQgPSAoZjogbnVtYmVyKSA9PiBmID4gMCAmJiB0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGYpO1xuICAgIGZ1bmN0aW9uIG1hcChmOiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgaWYgKGYgPCAwKSByZXR1cm4gfm1hcCh+Zik7XG4gICAgICBjb25zdCBtYXBwZWQgPSBGTEFHX01BUC5nZXQoZik7XG4gICAgICByZXR1cm4gbWFwcGVkICE9IG51bGwgPyBtYXBwZWRbMF1bMF0gOiBmO1xuICAgIH1cbiAgICBjb25zdCBhY3Rpb25JdGVtID0gVFJJR0dFUl9BQ1RJT05fSVRFTVNbdHJpZ2dlci5tZXNzYWdlLmFjdGlvbl07XG4gICAgY29uc3QgY29uZGl0aW9uID0gYW5kKC4uLnRyaWdnZXIuY29uZGl0aW9ucy5tYXAobWFwKS5maWx0ZXIocmVsZXZhbnRBbmRTZXQpLm1hcChDb25kaXRpb24pKTtcbiAgICBpZiAodHJpZ2dlci5tZXNzYWdlLmFjdGlvbiA9PT0gMHgxOSkgeyAvLyBwdXNoLWRvd24gdHJpZ2dlclxuICAgICAgLy8gVE9ETyAtIHBhc3MgaW4gdGVycmFpbjsgaWYgb24gbGFuZCBhbmQgdHJpZ2dlciBza2lwIGlzIG9uIHRoZW5cbiAgICAgIC8vIGFkZCBhIHJvdXRlIHJlcXVpcmluZyByYWJiaXQgYm9vdHMgYW5kIGVpdGhlciB3YXJwIGJvb3RzIG9yIHRlbGVwb3J0P1xuICAgICAgY29uc3QgZXh0cmE6IFRyaWdnZXJEYXRhID0ge307XG4gICAgICBpZiAodHJpZ2dlci5pZCA9PT0gMHg4NiAmJiAhdGhpcy5mbGFncy5hc3N1bWVSYWJiaXRTa2lwKCkpIHtcbiAgICAgICAgZXh0cmEuZHggPSBbLTMyLCAtMTYsIDAsIDE2XTtcbiAgICAgIH1cbiAgICAgIGlmICh0cmlnZ2VyLmlkID09PSAweGJhICYmXG4gICAgICAgICAgIXRoaXMuZmxhZ3MuZGlzYWJsZVRlbGVwb3J0U2tpcCgpICYmXG4gICAgICAgICAgIXRoaXMuZmxhZ3MuYXNzdW1lVGVsZXBvcnRTa2lwKCkpIHtcbiAgICAgICAgZXh0cmEuZXh0cmFMb2NhdGlvbnMgPSBbdGhpcy5yb20ubG9jYXRpb25zLkNvcmRlbFBsYWluV2VzdF07XG4gICAgICB9XG4gICAgICBjb25zdCBjb25kID1cbiAgICAgICAgICB0cmlnZ2VyLmNvbmRpdGlvbnMubWFwKGMgPT4gYyA8IDAgJiYgcmVsZXZhbnQofm1hcChjKSkgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ29uZGl0aW9uKH5tYXAoYykpIDogbnVsbClcbiAgICAgICAgICAgICAgLmZpbHRlcigoYzogdW5rbm93bik6IGMgaXMgW1tDb25kaXRpb25dXSA9PiBjICE9IG51bGwpO1xuICAgICAgaWYgKGNvbmQgJiYgY29uZC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHsuLi5leHRyYSwgdGVycmFpbjoge2V4aXQ6IG9yKC4uLmNvbmQpfX07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhY3Rpb25JdGVtICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7Y29uZGl0aW9uLCBzbG90OiBhY3Rpb25JdGVtfV19O1xuICAgIH1cbiAgICBjb25zdCBmbGFncyA9IHRyaWdnZXIuZmxhZ3MuZmlsdGVyKHJlbGV2YW50QW5kU2V0KTtcbiAgICBpZiAoZmxhZ3MubGVuZ3RoKSB7XG4gICAgICByZXR1cm4ge2NoZWNrOiBmbGFncy5tYXAoZiA9PiAoe2NvbmRpdGlvbiwgc2xvdDogU2xvdChmKX0pKX07XG4gICAgfVxuXG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgbnBjKGlkOiBudW1iZXIsIGxvYzogTG9jYXRpb24pOiBOcGNEYXRhIHtcbiAgICBjb25zdCBucGMgPSB0aGlzLnJvbS5ucGNzW2lkXTtcbiAgICBpZiAoIW5wYyB8fCAhbnBjLnVzZWQpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0cmlnZ2VyOiAke2hleChpZCl9YCk7XG5cbiAgICBjb25zdCBzcGF3bkNvbmRpdGlvbnM6IHJlYWRvbmx5IG51bWJlcltdID0gbnBjLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jLmlkKSB8fCBbXTtcblxuICAgIGNvbnN0IHJlc3VsdDogTnBjRGF0YSAmIHtjaGVjazogQ2hlY2tbXX0gPSB7Y2hlY2s6IFtdfTtcblxuICAgIGlmIChucGMuZGF0YVsyXSAmIDB4MDQpIHtcbiAgICAgIC8vIHBlcnNvbiBpcyBhIHN0YXR1ZS5cbiAgICAgIHJlc3VsdC50ZXJyYWluID0ge1xuICAgICAgICBleGl0OiB0aGlzLmZsYWdzLmFzc3VtZVN0YXR1ZUdsaXRjaCgpID9cbiAgICAgICAgICAgICAgICAgIFtbXV0gOiBcbiAgICAgICAgICAgICAgICAgIG9yKC4uLnNwYXduQ29uZGl0aW9ucy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBGTEFHX01BUC5nZXQoeCkgfHwgKHRoaXMucmVsZXZhbnRGbGFncy5oYXMoeCkgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDb25kaXRpb24oeCkgOiBbXSkpKSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RhdHVlT3IoLi4ucmVxczogUmVxdWlyZW1lbnRbXSk6IHZvaWQge1xuICAgICAgaWYgKCFyZXN1bHQudGVycmFpbikgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHRlcnJhaW4gZm9yIGd1YXJkJyk7XG4gICAgICByZXN1bHQudGVycmFpbi5leGl0ID0gb3IocmVzdWx0LnRlcnJhaW4uZXhpdCB8fCBbXSwgLi4ucmVxcyk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGZvcnR1bmUgdGVsbGVyICgzOSkgcmVxdWlyZXMgYWNjZXNzIHRvIHBvcnRvYSB0byBnZXQgaGVyIHRvIG1vdmU/XG4gICAgLy8gICAgICAtPiBtYXliZSBpbnN0ZWFkIGNoYW5nZSB0aGUgZmxhZyB0byBzZXQgaW1tZWRpYXRlbHkgb24gdGFsa2luZyB0byBoZXJcbiAgICAvLyAgICAgICAgIHJhdGhlciB0aGFuIHRoZSB0cmlnZ2VyIG91dHNpZGUgdGhlIGRvb3IuLi4/IHRoaXMgd291bGQgYWxsb3cgZ2V0dGluZ1xuICAgIC8vICAgICAgICAgdGhyb3VnaCBpdCBieSBqdXN0IHRhbGtpbmcgYW5kIHRoZW4gbGVhdmluZyB0aGUgcm9vbS4uLlxuXG4gICAgc3dpdGNoIChpZCkge1xuICAgIGNhc2UgMHgxNDogLy8gd29rZW4tdXAgd2luZG1pbGwgZ3VhcmRcbiAgICAgIC8vIHNraXAgYmVjYXVzZSB3ZSB0aWUgdGhlIGl0ZW0gdG8gdGhlIHNsZWVwaW5nIG9uZS5cbiAgICAgIGlmIChsb2Muc3Bhd25zLmZpbmQobCA9PiBsLmlzTnBjKCkgJiYgbC5pZCA9PT0gMHgxNSkpIHJldHVybiB7fTtcbiAgICBjYXNlIDB4MjU6IC8vIGFtYXpvbmVzIGd1YXJkXG4gICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAwLCB4MTogMiwgeTA6IDAsIHkxOiAxfTtcbiAgICAgIHN0YXR1ZU9yKE1hZ2ljLkNIQU5HRSwgTWFnaWMuUEFSQUxZU0lTKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHgyZDogLy8gbXQgc2FicmUvc3dhbiBzb2xkaWVyc1xuICAgICAgLy8gVGhlc2UgZG9uJ3QgY291bnQgYXMgc3RhdHVlcyBiZWNhdXNlIHRoZXknbGwgbW92ZSBpZiB5b3UgdGFsayB0byB0aGVtLlxuICAgICAgZGVsZXRlIHJlc3VsdC50ZXJyYWluO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDMzOiAvLyBwb3J0b2EgZ3VhcmQgKHRocm9uZSByb29tLCB0aG91Z2ggdGhlIHBhbGFjZSBvbmUgaXMgdGhlIG9uZSB0aGF0IG1hdHRlcnMpXG4gICAgICAvLyBOT1RFOiB0aGlzIG1lYW5zIHRoYXQgd2UgY2Fubm90IHNlcGFyYXRlIHRoZSBwYWxhY2UgZm95ZXIgZnJvbSB0aGUgdGhyb25lIHJvb20sIHNpbmNlXG4gICAgICAvLyB0aGVyZSdzIG5vIHdheSB0byByZXByZXNlbnQgdGhlIGNvbmRpdGlvbiBmb3IgcGFyYWx5emluZyB0aGUgZ3VhcmQgYW5kIHN0aWxsIGhhdmUgaGltXG4gICAgICAvLyBwYXNzYWJsZSB3aGVuIHRoZSBxdWVlbiBpcyB0aGVyZS4gIFRoZSB3aG9sZSBzZXF1ZW5jZSBpcyBhbHNvIHRpZ2h0bHkgY291cGxlZCwgc28gaXRcbiAgICAgIC8vIHByb2JhYmx5IHdvdWxkbid0IG1ha2Ugc2Vuc2UgdG8gc3BsaXQgaXQgdXAgYW55d2F5LlxuICAgICAgc3RhdHVlT3IoTWFnaWMuUEFSQUxZU0lTKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHgzODogLy8gcG9ydG9hIHF1ZWVuIHNpdHRpbmcgb24gaW1wYXNzYWJsZSB0aHJvbmVcbiAgICAgIGlmIChsb2MuaWQgPT09IDB4ZGYpIHJlc3VsdC5oaXRib3ggPSB7eDA6IDAsIHgxOiAxLCB5MDogMiwgeTE6IDN9O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDRlOiAvLyBzaHlyb24gZ3VhcmRcbiAgICAgIHJlc3VsdC5oaXRib3ggPSB7eDA6IC0xLCB4MTogMiwgeTA6IDAsIHkxOiAxfTtcbiAgICAgIHN0YXR1ZU9yKE1hZ2ljLkNIQU5HRSwgRXZlbnQuRU5URVJFRF9TSFlST04pO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDY4OiAvLyBrZW5zdSBpbiBjYWJpblxuICAgICAgcmVzdWx0LmhpdGJveCA9IHt4MDogLTEsIHgxOiAyLCB5MDogLTEsIHkxOiAyfTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHg4MDogLy8gZ29hIGd1YXJkc1xuICAgICAgc3RhdHVlT3IoLi4uc3Bhd25Db25kaXRpb25zLm1hcChjID0+IENvbmRpdGlvbih+YykpKTsgLy8gRXZlbnQuRU5URVJFRF9TSFlST05cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHg4NTogLy8gc3RvbmVkIHBhaXJcbiAgICAgIHN0YXR1ZU9yKEl0ZW0uRkxVVEVfT0ZfTElNRSk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBpbnRlcnNlY3Qgc3Bhd24gY29uZGl0aW9uc1xuICAgIGNvbnN0IHJlcXVpcmVtZW50czogQXJyYXk8cmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXT4gPSBbXTtcbiAgICBjb25zdCBhZGRSZXEgPSAoZmxhZzogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgICBpZiAoZmxhZyA8PSAwKSByZXR1cm47IC8vIG5lZ2F0aXZlIG9yIHplcm8gZmxhZyBpZ25vcmVkXG4gICAgICBjb25zdCByZXEgPSBGTEFHX01BUC5nZXQoZmxhZykgfHwgKHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZmxhZykgPyBDb25kaXRpb24oZmxhZykgOiBudWxsKTtcbiAgICAgIGlmIChyZXEgIT0gbnVsbCkgcmVxdWlyZW1lbnRzLnB1c2gocmVxKTtcbiAgICB9O1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBzcGF3bkNvbmRpdGlvbnMpIHtcbiAgICAgIGFkZFJlcShmbGFnKTtcbiAgICB9XG5cbiAgICAvLyBMb29rIGZvciB0cmFkZS1pbnNcbiAgICAvLyAgLSBUT0RPIC0gZG9uJ3QgaGFyZC1jb2RlIHRoZSBOUENzPyByZWFkIGZyb20gdGhlIGl0ZW1kYXRhP1xuICAgIGNvbnN0IHRyYWRlSW4gPSB0aGlzLnRyYWRlSW5zLmdldChpZClcbiAgICBpZiAodHJhZGVJbiAhPSBudWxsKSB7XG4gICAgICBjb25zdCB0ID0gdHJhZGVJbjtcbiAgICAgIGZ1bmN0aW9uIHRyYWRlKHNsb3Q6IFNsb3QsIC4uLnJlcXM6IEFycmF5PHJlYWRvbmx5IFtyZWFkb25seSBDb25kaXRpb25bXV0+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IGFuZCguLi5yZXF1aXJlbWVudHMsIHQsIC4uLnJlcXMpO1xuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdCwgY29uZGl0aW9ufSk7XG4gICAgICB9XG4gICAgICBsZXQgdHJhZGVSID0gdHJhZGU7XG4gICAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3MucmFuZG9taXplVHJhZGVzKCkpIHtcbiAgICAgICAgdHJhZGVSID0gKHNsb3QsIC4uLnJlcXMpID0+IHtcbiAgICAgICAgICBjb25zdCBpdGVtcyA9IFtcbiAgICAgICAgICAgIEl0ZW0uU1RBVFVFX09GX09OWVgsXG4gICAgICAgICAgICBJdGVtLkZPR19MQU1QLFxuICAgICAgICAgICAgSXRlbS5MT1ZFX1BFTkRBTlQsXG4gICAgICAgICAgICBJdGVtLktJUklTQV9QTEFOVCxcbiAgICAgICAgICAgIEl0ZW0uSVZPUllfU1RBVFVFLFxuICAgICAgICAgIF07XG4gICAgICAgICAgY29uc3QgY29uZGl0aW9uID1cbiAgICAgICAgICAgICAgb3IoLi4uaXRlbXMubWFwKGkgPT4gYW5kKC4uLnJlcXVpcmVtZW50cywgaSwgLi4ucmVxcykpKTtcbiAgICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdCwgY29uZGl0aW9ufSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHN3aXRjaCAoaWQpIHtcbiAgICAgIGNhc2UgMHgxNTogLy8gc2xlZXBpbmcgd2luZG1pbGwgZ3VhcmQgPT4gd2luZG1pbGwga2V5IHNsb3RcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLldJTkRNSUxMX0tFWSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHgyMzogLy8gYXJ5bGxpcyA9PiBib3cgb2YgbW9vbiBzbG90XG4gICAgICAgIC8vIE5PVEU6IHNpdHRpbmcgb24gaW1wYXNzaWJsZSB0aHJvbmVcbiAgICAgICAgcmVzdWx0LmhpdGJveCA9IHt4MDogLTEsIHgxOiAyLCB5MDogLTEsIHkxOiAyfTtcbiAgICAgICAgdHJhZGVSKFNsb3QoSXRlbS5CT1dfT0ZfTU9PTiksIE1hZ2ljLkNIQU5HRSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDYzOiAvLyBodXJ0IGRvbHBoaW4gPT4gaGVhbGVkIGRvbHBoaW5cbiAgICAgICAgLy8gTk9URTogZG9scGhpbiBvbiB3YXRlciwgYnV0IGNhbiBoZWFsIGZyb20gbGFuZFxuICAgICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAtMSwgeDE6IDIsIHkwOiAtMSwgeTE6IDJ9O1xuICAgICAgICB0cmFkZShTbG90KEV2ZW50LkhFQUxFRF9ET0xQSElOKSk7XG4gICAgICAgIHRyYWRlKFNsb3QoSXRlbS5TSEVMTF9GTFVURSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg2NDogLy8gZmlzaGVybWFuXG4gICAgICAgIHRyYWRlUihTbG90KEV2ZW50LlJFVFVSTkVEX0ZPR19MQU1QKSxcbiAgICAgICAgICAgICAgIC4uLih0aGlzLmZsYWdzLnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCkgP1xuICAgICAgICAgICAgICAgICAgIFtFdmVudC5IRUFMRURfRE9MUEhJTl0gOiBbXSkpO1xuICAgICAgICAvLyBUT0RPIC0gdXNlIHRoaXMgYXMgcHJveHkgZm9yIGJvYXRcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NmI6IC8vIHNsZWVwaW5nIGtlbnN1XG4gICAgICAgIHRyYWRlKFNsb3QoSXRlbS5HTE9XSU5HX0xBTVApKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NzU6IC8vIHNsaW1lZCBrZW5zdSA9PiBmbGlnaHQgc2xvdFxuICAgICAgICB0cmFkZVIoU2xvdChNYWdpYy5GTElHSFQpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NzQ6IC8vIGtlbnN1IGluIGRhbmNlIGhhbGwgPT4gY2hhbmdlIHNsb3RcbiAgICAgICAgLy8gTk9URTogdGhpcyBpcyBub3JtYWxseSA3ZSBidXQgd2UgY2hhbmdlIGl0IHRvIDc0IGluIHRoaXMgb25lXG4gICAgICAgIC8vIGxvY2F0aW9uIHRvIGlkZW50aWZ5IGl0XG4gICAgICAgIHRyYWRlUihTbG90KE1hZ2ljLkNIQU5HRSksIE1hZ2ljLlBBUkFMWVNJUywgRXZlbnQuRk9VTkRfS0VOU1UpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg4MjogLy8gYWthaGFuYSA9PiBnYXMgbWFzayBzbG90IChjaGFuZ2VkIDE2IC0+IDgyKVxuICAgICAgICB0cmFkZVIoU2xvdChJdGVtLkdBU19NQVNLKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDg4OiAvLyBzdG9uZWQgYWthaGFuYSA9PiBzaGllbGQgcmluZyBzbG90XG4gICAgICAgIHRyYWRlKFNsb3QoSXRlbS5TSElFTERfUklORykpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOUENzIHRoYXQgbmVlZCBhIGxpdHRsZSBleHRyYSBjYXJlXG5cbiAgICBpZiAoaWQgPT09IDB4ODQpIHsgLy8gc3RhcnQgZmlnaHQgd2l0aCBzYWJlcmFcbiAgICAgIC8vIFRPRE8gLSBsb29rIHVwIHdobyB0aGUgYWN0dWFsIGJvc3MgaXMgb25jZSB3ZSBnZXQgYm9zcyBzaHVmZmxlISEhXG4gICAgICBjb25zdCBjb25kaXRpb24gPSB0aGlzLmJvc3NSZXF1aXJlbWVudHModGhpcy5yb20uYm9zc2VzLnNhYmVyYTEpO1xuICAgICAgcmV0dXJuIHtjaGVjazogW1xuICAgICAgICB7Y29uZGl0aW9uLCBzbG90OiBTbG90KEJvc3MuU0FCRVJBMSl9LFxuICAgICAgXX07XG4gICAgfSBlbHNlIGlmIChpZCA9PT0gMHgxZCkgeyAvLyBvYWsgZWxkZXIgaGFzIHNvbWUgd2VpcmQgdW50cmFja2VkIGNvbmRpdGlvbnMuXG4gICAgICBjb25zdCBzbG90ID0gU2xvdChJdGVtLlNXT1JEX09GX0ZJUkUpO1xuICAgICAgcmV0dXJuIHtjaGVjazogW1xuICAgICAgICAvLyB0d28gZGlmZmVyZW50IHdheXMgdG8gZ2V0IHRoZSBzd29yZCBvZiBmaXJlIGl0ZW1cbiAgICAgICAge2NvbmRpdGlvbjogYW5kKE1hZ2ljLlRFTEVQQVRIWSwgQm9zcy5JTlNFQ1QpLCBzbG90fSxcbiAgICAgICAge2NvbmRpdGlvbjogRXZlbnQuUkVTQ1VFRF9DSElMRCwgc2xvdH0sXG4gICAgICBdfTtcbiAgICB9IGVsc2UgaWYgKGlkID09PSAweDFmKSB7IC8vIGR3YXJmIGNoaWxkXG4gICAgICBjb25zdCBzcGF3bnMgPSB0aGlzLnJvbS5ucGNzW2lkXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KGxvYy5pZCk7XG4gICAgICBpZiAoc3Bhd25zICYmIHNwYXducy5pbmNsdWRlcygweDA0NSkpIHJldHVybiB7fTsgLy8gaW4gbW90aGVyJ3MgaG91c2VcbiAgICAgIHJldHVybiB7Y2hlY2s6IFtcbiAgICAgICAge2NvbmRpdGlvbjogRXZlbnQuRFdBUkZfTU9USEVSLCBzbG90OiBTbG90KEV2ZW50LkRXQVJGX0NISUxEKX0sXG4gICAgICBdfTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmdsb2JhbERpYWxvZ3MpIHtcbiAgICAgIGFkZFJlcSh+ZC5jb25kaXRpb24pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmxvY2FsRGlhbG9ncy5nZXQobG9jLmlkKSB8fCBucGMubG9jYWxEaWFsb2dzLmdldCgtMSkgfHwgW10pIHtcbiAgICAgIC8vIElmIHRoZSBjaGVjayBjb25kaXRpb24gaXMgb3Bwb3NpdGUgdG8gdGhlIHNwYXduIGNvbmRpdGlvbiwgdGhlbiBza2lwLlxuICAgICAgLy8gVGhpcyBlbnN1cmVzIHdlIGRvbid0IGV4cGVjdCB0aGUgcXVlZW4gdG8gZ2l2ZSByZWNvdmVyIGluIHRoZSB0aHJvbmUgcm9vbS5cbiAgICAgIGlmIChzcGF3bkNvbmRpdGlvbnMuaW5jbHVkZXMofmQuY29uZGl0aW9uKSkgY29udGludWU7XG4gICAgICAvLyBBcHBseSB0aGUgRkxBR19NQVAuXG4gICAgICBjb25zdCBtYXBwZWQgPSBGTEFHX01BUC5nZXQoZC5jb25kaXRpb24pO1xuICAgICAgY29uc3QgcG9zaXRpdmUgPVxuICAgICAgICAgIG1hcHBlZCA/IFttYXBwZWRdIDpcbiAgICAgICAgICB0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGQuY29uZGl0aW9uKSA/IFtDb25kaXRpb24oZC5jb25kaXRpb24pXSA6XG4gICAgICAgICAgW107XG4gICAgICBjb25zdCBjb25kaXRpb24gPSBhbmQoLi4ucG9zaXRpdmUsIC4uLnJlcXVpcmVtZW50cyk7XG4gICAgICAvLyBJZiB0aGUgY29uZGl0aW9uIGlzIGEgbmVnYXRpdmUgdGhlbiBhbnkgZnV0dXJlIGNvbmRpdGlvbnMgbXVzdCBpbmNsdWRlXG4gICAgICAvLyBpdCBhcyBhIHBvc2l0aXZlIHJlcXVpcmVtZW50LlxuICAgICAgY29uc3QgbmVnYXRpdmUgPVxuICAgICAgICAgIEZMQUdfTUFQLmdldCh+ZC5jb25kaXRpb24pIHx8XG4gICAgICAgICAgKHRoaXMucmVsZXZhbnRGbGFncy5oYXMofmQuY29uZGl0aW9uKSA/IENvbmRpdGlvbih+ZC5jb25kaXRpb24pIDogbnVsbCk7XG4gICAgICBpZiAobmVnYXRpdmUgIT0gbnVsbCkgcmVxdWlyZW1lbnRzLnB1c2gobmVnYXRpdmUpO1xuICAgICAgY29uc3QgYWN0aW9uID0gZC5tZXNzYWdlLmFjdGlvbjtcbiAgICAgIGlmIChhY3Rpb24gPT09IDB4MDMgfHwgYWN0aW9uID09PSAweDBhKSB7XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90Lml0ZW0obnBjLmRhdGFbMF0pLCBjb25kaXRpb259KTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAweDExXG4gICAgICAgICAgICAgICAgIHx8ICh0aGlzLmZsYWdzLnplYnVTdHVkZW50R2l2ZXNJdGVtKCkgJiYgYWN0aW9uID09PSAweDA5KSkge1xuICAgICAgICAvLyBOT1RFOiAkMDkgaXMgemVidSBzdHVkZW50LCB3aGljaCB3ZSd2ZSBwYXRjaGVkIHRvIGdpdmUgdGhlIGl0ZW0uXG4gICAgICAgIC8vIFRPRE8gLSBjaGVjayB0aGUgcGF0Y2ggcmF0aGVyIHRoYW4gdGhlIGZsYWc/XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90Lml0ZW0obnBjLmRhdGFbMV0pLCBjb25kaXRpb259KTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAweDEwKSB7XG4gICAgICAgIC8vIE5PVEU6IFF1ZWVuIGNhbid0IGJlIHJldmVhbGVkIGFzIGFzaW5hIGluIHRoZSB0aHJvbmUgcm9vbS4gIEluIHBhcnRpY3VsYXIsXG4gICAgICAgIC8vIHRoaXMgZW5zdXJlcyB0aGF0IHRoZSBiYWNrIHJvb20gaXMgcmVhY2hhYmxlIGJlZm9yZSByZXF1aXJpbmcgdGhlIGRvbHBoaW5cbiAgICAgICAgLy8gdG8gYXBwZWFyLiAgVGhpcyBzaG91bGQgYmUgaGFuZGxlZCBieSB0aGUgYWJvdmUgY2hlY2sgZm9yIHRoZSBkaWFsb2cgYW5kXG4gICAgICAgIC8vIHNwYXduIGNvbmRpdGlvbnMgdG8gYmUgY29tcGF0aWJsZS5cbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QoTWFnaWMuUkVDT1ZFUiksIGNvbmRpdGlvbn0pO1xuICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IDB4MDggJiYgaWQgPT09IDB4MmQpIHtcbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX1NXQU4pLCBjb25kaXRpb259KTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBkLmZsYWdzKSB7XG4gICAgICAgIGNvbnN0IG1mbGFnID0gRkxBR19NQVAuZ2V0KGZsYWcpO1xuICAgICAgICBjb25zdCBwZmxhZyA9IG1mbGFnID8gbWZsYWcgOiB0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGZsYWcpID8gQ29uZGl0aW9uKGZsYWcpIDogbnVsbDtcbiAgICAgICAgaWYgKHBmbGFnKSByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdChwZmxhZyksIGNvbmRpdGlvbn0pO1xuICAgICAgfVxuICAgICAgLy8gSWYgdGhlIHNwYXduICpyZXF1aXJlcyogdGhpcyBjb25kaXRpb24gdGhlbiBkb24ndCBldmFsdWF0ZSBhbnkgbW9yZS4gIFRoaXNcbiAgICAgIC8vIGVuc3VyZXMgd2UgZG9uJ3QgZXhwZWN0IHRoZSBxdWVlbiB0byBnaXZlIHRoZSBmbHV0ZSBvZiBsaW1lIGluIHRoZSBiYWNrIHJvb20sXG4gICAgICAvLyBzaW5jZSBzaGUgd291bGRuJ3QgaGF2ZSBzcGF3bmVkIHRoZXJlIGludGltZSB0byBnaXZlIGl0LlxuICAgICAgaWYgKHBvc2l0aXZlLmxlbmd0aCAmJiBzcGF3bkNvbmRpdGlvbnMuaW5jbHVkZXMoZC5jb25kaXRpb24pKSBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGNhcGFiaWxpdGllcygpOiBDYXBhYmlsaXR5RGF0YVtdIHtcbiAgICBsZXQgYnJlYWtTdG9uZTogUmVxdWlyZW1lbnQgPSBJdGVtLlNXT1JEX09GX1dJTkQ7XG4gICAgbGV0IGJyZWFrSWNlOiBSZXF1aXJlbWVudCA9IEl0ZW0uU1dPUkRfT0ZfRklSRTtcbiAgICBsZXQgZm9ybUJyaWRnZTogUmVxdWlyZW1lbnQgPSBJdGVtLlNXT1JEX09GX1dBVEVSO1xuICAgIGxldCBicmVha0lyb246IFJlcXVpcmVtZW50ID0gSXRlbS5TV09SRF9PRl9USFVOREVSO1xuICAgIGlmICghdGhpcy5mbGFncy5vcmJzT3B0aW9uYWwoKSkge1xuICAgICAgLy8gQWRkIG9yYiByZXF1aXJlbWVudFxuICAgICAgYnJlYWtTdG9uZSA9IG9yKGFuZChJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uT1JCX09GX1dJTkQpLFxuICAgICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uVE9STkFET19CUkFDRUxFVCkpO1xuICAgICAgYnJlYWtJY2UgPSBvcihhbmQoSXRlbS5TV09SRF9PRl9GSVJFLCBJdGVtLk9SQl9PRl9GSVJFKSxcbiAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfRklSRSwgSXRlbS5GTEFNRV9CUkFDRUxFVCkpO1xuICAgICAgZm9ybUJyaWRnZSA9IG9yKGFuZChJdGVtLlNXT1JEX09GX1dBVEVSLCBJdGVtLk9SQl9PRl9XQVRFUiksXG4gICAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfV0FURVIsIEl0ZW0uQkxJWlpBUkRfQlJBQ0VMRVQpKTtcbiAgICAgIGJyZWFrSXJvbiA9IG9yKGFuZChJdGVtLlNXT1JEX09GX1RIVU5ERVIsIEl0ZW0uT1JCX09GX1RIVU5ERVIpLFxuICAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUiwgSXRlbS5TVE9STV9CUkFDRUxFVCkpO1xuICAgICAgaWYgKHRoaXMuZmxhZ3MuYXNzdW1lU3dvcmRDaGFyZ2VHbGl0Y2goKSkge1xuICAgICAgICBjb25zdCBsZXZlbDIgPSBvcihicmVha1N0b25lLCBicmVha0ljZSwgZm9ybUJyaWRnZSwgYnJlYWtJcm9uKTtcbiAgICAgICAgZnVuY3Rpb24gbmVlZChzd29yZDogcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXSk6IFJlcXVpcmVtZW50IHtcbiAgICAgICAgICBjb25zdCBjb25kaXRpb246IENvbmRpdGlvbiA9IHN3b3JkWzBdWzBdO1xuICAgICAgICAgIHJldHVybiBsZXZlbDIubWFwKGMgPT4gY1swXSA9PT0gY29uZGl0aW9uID8gYyA6IFtjb25kaXRpb24sIC4uLmNdKTtcbiAgICAgICAgfVxuICAgICAgICBicmVha1N0b25lID0gbmVlZChJdGVtLlNXT1JEX09GX1dJTkQpO1xuICAgICAgICBicmVha0ljZSA9IG5lZWQoSXRlbS5TV09SRF9PRl9GSVJFKTtcbiAgICAgICAgZm9ybUJyaWRnZSA9IG5lZWQoSXRlbS5TV09SRF9PRl9XQVRFUik7XG4gICAgICAgIGJyZWFrSXJvbiA9IG5lZWQoSXRlbS5TV09SRF9PRl9USFVOREVSKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdHlwZSBDYXBhYmlsaXR5TGlzdCA9IEFycmF5PFtyZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dLCAuLi5SZXF1aXJlbWVudFtdXT47XG4gICAgY29uc3QgY2FwYWJpbGl0aWVzOiBDYXBhYmlsaXR5TGlzdCA9IFtcbiAgICAgIFtFdmVudC5TVEFSVCwgYW5kKCldLFxuICAgICAgW0NhcGFiaWxpdHkuU1dPUkQsXG4gICAgICAgSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLlNXT1JEX09GX0ZJUkUsXG4gICAgICAgSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5TV09SRF9PRl9USFVOREVSXSxcbiAgICAgIFtDYXBhYmlsaXR5LkJSRUFLX1NUT05FLCBicmVha1N0b25lXSxcbiAgICAgIFtDYXBhYmlsaXR5LkJSRUFLX0lDRSwgYnJlYWtJY2VdLFxuICAgICAgW0NhcGFiaWxpdHkuRk9STV9CUklER0UsIGZvcm1CcmlkZ2VdLFxuICAgICAgW0NhcGFiaWxpdHkuQlJFQUtfSVJPTiwgYnJlYWtJcm9uXSxcbiAgICAgIFtDYXBhYmlsaXR5Lk1PTkVZLCBDYXBhYmlsaXR5LlNXT1JEXSwgLy8gVE9ETyAtIGNsZWFyIHRoaXMgdXBcbiAgICAgIFtDYXBhYmlsaXR5LkNMSU1CX1dBVEVSRkFMTCwgTWFnaWMuRkxJR0hUXSxcbiAgICAgIFtDYXBhYmlsaXR5LlNIT09USU5HX1NUQVRVRSwgTWFnaWMuQkFSUklFUl0sIC8vIFRPRE8gLSBhbGxvdyBzaGllbGQgcmluZz9cbiAgICAgIFtDYXBhYmlsaXR5LkNMSU1CX1NMT1BFLCBJdGVtLlJBQkJJVF9CT09UUywgTWFnaWMuRkxJR0hUXSxcbiAgICAgIC8vIFtFdmVudC5HRU5FUkFMU19ERUZFQVRFRCwgSXRlbS5JVk9SWV9TVEFUVUVdLCAvLyBUT0RPIC0gZml4IHRoaXNcbiAgICAgIFtFdmVudC5PUEVORURfU0VBTEVEX0NBVkUsIEV2ZW50LlNUQVJURURfV0lORE1JTExdLCAvLyBUT0RPIC0gbWVyZ2UgY29tcGxldGVseT9cbiAgICBdO1xuXG4gICAgaWYgKHRoaXMuZmxhZ3MuYXNzdW1lR2hldHRvRmxpZ2h0KCkpIHtcbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LkNMSU1CX1dBVEVSRkFMTCwgYW5kKEV2ZW50LlJJREVfRE9MUEhJTiwgSXRlbS5SQUJCSVRfQk9PVFMpXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzLmZvZ0xhbXBOb3RSZXF1aXJlZCgpKSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbRXZlbnQuUklERV9ET0xQSElOLCBJdGVtLlNIRUxMX0ZMVVRFXSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmZsYWdzLmd1YXJhbnRlZUJhcnJpZXIoKSkge1xuICAgICAgLy8gVE9ETyAtIHN3b3JkIGNoYXJnZSBnbGl0Y2ggbWlnaHQgYmUgYSBwcm9ibGVtIHdpdGggdGhlIGhlYWxpbmcgb3B0aW9uLi4uXG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5TSE9PVElOR19TVEFUVUUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIENhcGFiaWxpdHkuQlVZX0hFQUxJTkcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBJdGVtLlNISUVMRF9SSU5HKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgTWFnaWMuUkVGUkVTSCldKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5mbGFncy5sZWF0aGVyQm9vdHNHaXZlU3BlZWQoKSkge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuQ0xJTUJfU0xPUEUsIEl0ZW0uTEVBVEhFUl9CT09UU10pO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgYm9zcyBvZiB0aGlzLnJvbS5ib3NzZXMpIHtcbiAgICAgIGlmIChib3NzLmtpbGwgIT0gbnVsbCAmJiBib3NzLmRyb3AgIT0gbnVsbCkge1xuICAgICAgICAvLyBTYXZlcyByZWR1bmRhbmN5IG9mIHB1dHRpbmcgdGhlIGl0ZW0gaW4gdGhlIGFjdHVhbCByb29tLlxuICAgICAgICBjYXBhYmlsaXRpZXMucHVzaChbSXRlbShib3NzLmRyb3ApLCBCb3NzKGJvc3MuZmxhZyldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY2FwYWJpbGl0aWVzLnB1c2goW0l0ZW0uT1JCX09GX1dBVEVSLCBCb3NzLlJBR0VdKTtcblxuICAgIGlmICh0aGlzLmZsYWdzLmd1YXJhbnRlZUdhc01hc2soKSkge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuVFJBVkVMX1NXQU1QLCBJdGVtLkdBU19NQVNLXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LlRSQVZFTF9TV0FNUCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgb3IoSXRlbS5HQVNfTUFTSyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgSXRlbS5NRURJQ0FMX0hFUkIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBNYWdpYy5SRUZSRVNIKSldKTtcbiAgICB9XG5cbiAgICAvLyBpZiAodGhpcy5mbGFncy5hc3N1bWVTdGF0dWVHbGl0Y2goKSkge1xuICAgIC8vICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuU1RBVFVFX0dMSVRDSCwgW1tdXV0pO1xuICAgIC8vIH1cblxuICAgIHJldHVybiBjYXBhYmlsaXRpZXMubWFwKChbY2FwYWJpbGl0eSwgLi4uZGVwc10pID0+ICh7Y2FwYWJpbGl0eSwgY29uZGl0aW9uOiBvciguLi5kZXBzKX0pKTtcbiAgfVxuXG4gIHdhbGxDYXBhYmlsaXR5KHR5cGU6IFdhbGxUeXBlKToge2ZsYWc6IG51bWJlcn0ge1xuICAgIHJldHVybiB7ZmxhZzogW0NhcGFiaWxpdHkuQlJFQUtfU1RPTkUsIENhcGFiaWxpdHkuQlJFQUtfSUNFLFxuICAgICAgICAgICAgICAgICAgIENhcGFiaWxpdHkuRk9STV9CUklER0UsIENhcGFiaWxpdHkuQlJFQUtfSVJPTl1bdHlwZV1bMF1bMF19O1xuICB9XG59XG5cbnR5cGUgVGlsZUNoZWNrID0gQ2hlY2sgJiB7dGlsZTogVGlsZUlkfTtcblxuLy8gVE9ETyAtIG1heWJlIHB1bGwgdHJpZ2dlcnMgYW5kIG5wY3MsIGV0YywgYmFjayB0b2dldGhlcj9cbi8vICAgICAgLSBvciBtYWtlIHRoZSBsb2NhdGlvbiBvdmVybGF5IGEgc2luZ2xlIGZ1bmN0aW9uP1xuLy8gICAgICAgIC0+IG5lZWRzIGNsb3NlZC1vdmVyIHN0YXRlIHRvIHNoYXJlIGluc3RhbmNlcy4uLlxuXG5pbnRlcmZhY2UgRXh0cmFSb3V0ZSB7XG4gIHRpbGU6IFRpbGVJZDtcbiAgY29uZGl0aW9uPzogUmVxdWlyZW1lbnQ7XG59XG5pbnRlcmZhY2UgRXh0cmFFZGdlIHtcbiAgZnJvbTogVGlsZUlkO1xuICB0bzogVGlsZUlkO1xuICBjb25kaXRpb24/OiBSZXF1aXJlbWVudDtcbn1cblxuaW50ZXJmYWNlIFRyaWdnZXJEYXRhIHtcbiAgdGVycmFpbj86IFRlcnJhaW47XG4gIGNoZWNrPzogQ2hlY2tbXTtcbiAgLy8gYWxsb3dzIG5vdCBhc3N1bWluZyB0ZWxlcG9ydCBza2lwXG4gIGV4dHJhTG9jYXRpb25zPzogTG9jYXRpb25bXTtcbiAgLy8gYWxsb3dzIG5vdCBhc3N1bWluZyByYWJiaXQgc2tpcFxuICBkeD86IG51bWJlcltdO1xufVxuXG5pbnRlcmZhY2UgTnBjRGF0YSB7XG4gIGhpdGJveD86IEhpdGJveDtcbiAgdGVycmFpbj86IFRlcnJhaW47XG4gIGNoZWNrPzogQ2hlY2tbXTtcbn1cblxuaW50ZXJmYWNlIEhpdGJveCB7XG4gIHgwOiBudW1iZXI7XG4gIHkwOiBudW1iZXI7XG4gIHgxOiBudW1iZXI7XG4gIHkxOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBDYXBhYmlsaXR5RGF0YSB7XG4gIGNvbmRpdGlvbj86IFJlcXVpcmVtZW50O1xuICBjYXBhYmlsaXR5OiByZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dO1xufVxuXG4vLyBTdGF0aWMgbWFwIG9mIHRlcnJhaW5zLlxuY29uc3QgVEVSUkFJTlM6IEFycmF5PFRlcnJhaW4gfCB1bmRlZmluZWQ+ID0gKCgpID0+IHtcbiAgY29uc3Qgb3V0ID0gW107XG4gIGZvciAobGV0IGVmZmVjdHMgPSAwOyBlZmZlY3RzIDwgMTI4OyBlZmZlY3RzKyspIHtcbiAgICBvdXRbZWZmZWN0c10gPSB0ZXJyYWluKGVmZmVjdHMpO1xuICB9XG4gIC8vIGNvbnNvbGUubG9nKCdURVJSQUlOUycsIG91dCk7XG4gIHJldHVybiBvdXQ7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBlZmZlY3RzIFRoZSAkMjYgYml0cyBvZiB0aWxlZWZmZWN0cywgcGx1cyAkMDggZm9yIHN3YW1wLCAkMTAgZm9yIGRvbHBoaW4sXG4gICAqICQwMSBmb3Igc2hvb3Rpbmcgc3RhdHVlcywgJDQwIGZvciBzaG9ydCBzbG9wZVxuICAgKiBAcmV0dXJuIHVuZGVmaW5lZCBpZiB0aGUgdGVycmFpbiBpcyBpbXBhc3NhYmxlLlxuICAgKi9cbiAgZnVuY3Rpb24gdGVycmFpbihlZmZlY3RzOiBudW1iZXIpOiBUZXJyYWluIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoZWZmZWN0cyAmIDB4MDQpIHJldHVybiB1bmRlZmluZWQ7IC8vIGltcGFzc2libGVcbiAgICBjb25zdCB0ZXJyYWluOiBUZXJyYWluID0ge307XG4gICAgaWYgKChlZmZlY3RzICYgMHgxMikgPT09IDB4MTIpIHsgLy8gZG9scGhpbiBvciBmbHlcbiAgICAgIGlmIChlZmZlY3RzICYgMHgyMCkgdGVycmFpbi5leGl0ID0gQ2FwYWJpbGl0eS5DTElNQl9XQVRFUkZBTEw7XG4gICAgICB0ZXJyYWluLmVudGVyID0gb3IoRXZlbnQuUklERV9ET0xQSElOLCBNYWdpYy5GTElHSFQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZWZmZWN0cyAmIDB4NDApIHsgLy8gc2hvcnQgc2xvcGVcbiAgICAgICAgdGVycmFpbi5leGl0ID0gQ2FwYWJpbGl0eS5DTElNQl9TTE9QRTtcbiAgICAgIH0gZWxzZSBpZiAoZWZmZWN0cyAmIDB4MjApIHsgLy8gc2xvcGVcbiAgICAgICAgdGVycmFpbi5leGl0ID0gTWFnaWMuRkxJR0hUO1xuICAgICAgfVxuICAgICAgaWYgKGVmZmVjdHMgJiAweDAyKSB0ZXJyYWluLmVudGVyID0gTWFnaWMuRkxJR0hUOyAvLyBuby13YWxrXG4gICAgfVxuICAgIGlmIChlZmZlY3RzICYgMHgwOCkgeyAvLyBzd2FtcFxuICAgICAgdGVycmFpbi5lbnRlciA9ICh0ZXJyYWluLmVudGVyIHx8IFtbXV0pLm1hcChjcyA9PiBDYXBhYmlsaXR5LlRSQVZFTF9TV0FNUFswXS5jb25jYXQoY3MpKTtcbiAgICB9XG4gICAgaWYgKGVmZmVjdHMgJiAweDAxKSB7IC8vIHNob290aW5nIHN0YXR1ZXNcbiAgICAgIHRlcnJhaW4uZW50ZXIgPSAodGVycmFpbi5lbnRlciB8fCBbW11dKS5tYXAoY3MgPT4gQ2FwYWJpbGl0eS5TSE9PVElOR19TVEFUVUVbMF0uY29uY2F0KGNzKSk7XG4gICAgfVxuICAgIHJldHVybiB0ZXJyYWluO1xuICB9XG59KSgpO1xuXG4vLyBUT0RPIC0gZmlndXJlIG91dCB3aGF0IHRoaXMgbG9va3MgbGlrZS4uLj9cbi8vICAtIG1heWJlIHdlIGp1c3Qgd2FudCB0byBtYWtlIGEgcHNldWRvIERFRkVBVEVEX0lOU0VDVCBldmVudCwgYnV0IHRoaXMgd291bGQgbmVlZCB0byBiZVxuLy8gICAgc2VwYXJhdGUgZnJvbSAxMDEsIHNpbmNlIHRoYXQncyBhdHRhY2hlZCB0byB0aGUgaXRlbWdldCwgd2hpY2ggd2lsbCBtb3ZlIHdpdGggdGhlIHNsb3QhXG4vLyAgLSBwcm9iYWJseSB3YW50IGEgZmxhZyBmb3IgZWFjaCBib3NzIGRlZmVhdGVkLi4uP1xuLy8gICAgY291bGQgdXNlIGJvc3NraWxsIElEIGZvciBpdD9cbi8vICAgIC0gdGhlbiBtYWtlIHRoZSBkcm9wIGEgc2ltcGxlIGRlcml2YXRpdmUgZnJvbSB0aGF0Li4uXG4vLyAgICAtIHVwc2hvdCAtIG5vIGxvbmdlciBuZWVkIHRvIG1peCBpdCBpbnRvIG5wYygpIG9yIHRyaWdnZXIoKSBvdmVybGF5LCBpbnN0ZWFkIG1vdmUgaXRcbi8vICAgICAgdG8gY2FwYWJpbGl0eSBvdmVybGF5LlxuLy8gZnVuY3Rpb24gc2xvdEZvcjxUPihpdGVtOiBUKTogVCB7IHJldHVybiBpdGVtOyB9XG4iXX0=