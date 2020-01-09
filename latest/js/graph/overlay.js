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
    0x235,
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
            if (!item.trades.length)
                continue;
            const cond = item.id === 0x1d ? Capability.BUY_HEALING : Item(item.id);
            for (const trade of item.trades) {
                this.tradeIns.set(item.itemUseData[trade].want & 0xff, cond);
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
            case 0x7e:
                if (loc.spawns.find(l => l.isNpc() && l.id === 0x6b))
                    return {};
        }
        switch (id) {
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
            [Item.STATUE_OF_GOLD, and(Item.BROKEN_STATUE, Item.GLOWING_LAMP)],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9ncmFwaC9vdmVybGF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFTLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFDN0QsSUFBSSxFQUFxQixHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQUUsUUFBUSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBSy9DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFhbkMsTUFBTSxjQUFjLEdBQUc7SUFDckIsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBRUwsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBR0wsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSztJQUUxQixLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSztJQUN0RCxLQUFLO0lBQ0wsS0FBSztJQUNM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Q0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDMUY7UUFDRCxJQUFJLE9BQU8sR0FBRyxJQUFJLEVBQUU7WUFDbEIsT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDN0Y7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0FBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Qm9zcywgQ2FwYWJpbGl0eSwgQ2hlY2ssIENvbmRpdGlvbiwgRXZlbnQsIEl0ZW0sIE1hZ2ljLCBNdXRhYmxlUmVxdWlyZW1lbnQsXG4gICAgICAgIFJlcXVpcmVtZW50LCBTbG90LCBUZXJyYWluLCBXYWxsVHlwZSwgYW5kLCBtZWV0LCBvcn0gZnJvbSAnLi9jb25kaXRpb24uanMnO1xuaW1wb3J0IHtUaWxlSWQsIFNjcmVlbklkfSBmcm9tICcuL2dlb21ldHJ5LmpzJztcbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7Qm9zcyBhcyBSb21Cb3NzfSBmcm9tICcuLi9yb20vYm9zc2VzLmpzJztcbmltcG9ydCB7TG9jYXRpb259IGZyb20gJy4uL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge1Nob3BUeXBlfSBmcm9tICcuLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge2hleH0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuXG4vLyBBZGRpdGlvbmFsIGluZm9ybWF0aW9uIG5lZWRlZCB0byBpbnRlcnByZXQgdGhlIHdvcmxkIGdyYXBoIGRhdGEuXG4vLyBUaGlzIGdldHMgaW50byBtb3JlIHNwZWNpZmljcyBhbmQgaGFyZGNvZGluZy5cblxuLy8gVE9ETyAtIG1heWJlIGNvbnNpZGVyIGhhdmluZyBhIHNldCBvZiBBU1NVTUVEIGFuZCBhIHNldCBvZiBJR05PUkVEIGZsYWdzP1xuLy8gICAgICAtIGUuZy4gYWx3YXlzIGFzc3VtZSAwMGYgaXMgRkFMU0UgcmF0aGVyIHRoYW4gVFJVRSwgdG8gYXZvaWQgZnJlZSB3aW5kbWlsbCBrZXlcblxuXG4vLyBUT0RPIC0gcHJpc29uIGtleSBtaXNzaW5nIGZyb20gcGFyYWx5c2lzIGRlcHMgKG9yIHJhdGhlciBhIG5vbi1mbGlnaHQgdmVyc2lvbikhXG5cblxuXG5jb25zdCBSRUxFVkFOVF9GTEFHUyA9IFtcbiAgMHgwMGEsIC8vIHVzZWQgd2luZG1pbGwga2V5XG4gIDB4MDBiLCAvLyB0YWxrZWQgdG8gbGVhZiBlbGRlclxuICAweDAxMywgLy8ga2lsbGVkIHNhYmVyYSAxXG4gIDB4MDE4LCAvLyBlbnRlcmVkIHVuZGVyZ3JvdW5kIGNoYW5uZWxcbiAgMHgwMWIsIC8vIG1lc2lhIHJlY29yZGluZyBwbGF5ZWRcbiAgMHgwMWUsIC8vIHF1ZWVuIHJldmVhbGVkXG4gIDB4MDIxLCAvLyByZXR1cm5lZCBmb2cgbGFtcFxuICAvLyAweDAyNCwgLy8gZ2VuZXJhbHMgZGVmZWF0ZWQgKGdvdCBpdm9yeSBzdGF0dWUpXG4gIDB4MDI1LCAvLyBoZWFsZWQgZG9scGhpblxuICAweDAyNiwgLy8gZW50ZXJlZCBzaHlyb24gKGZvciBnb2EgZ3VhcmRzKVxuICAweDAyNywgLy8gc2h5cm9uIG1hc3NhY3JlXG4gIC8vIDB4MzUsIC8vIGN1cmVkIGFrYWhhbmFcbiAgMHgwMzgsIC8vIGxlYWYgYWJkdWN0aW9uXG4gIDB4MDNhLCAvLyB0YWxrZWQgdG8gemVidSBpbiBjYXZlIChhZGRlZCBhcyByZXEgZm9yIGFiZHVjdGlvbilcbiAgMHgwM2IsIC8vIHRhbGtlZCB0byB6ZWJ1IGluIHNoeXJvbiAoYWRkZWQgYXMgcmVxIGZvciBtYXNzYWNyZSlcbiAgMHgwNDUsIC8vIHJlc2N1ZWQgY2hpbGRcbiAgMHgwNTIsIC8vIHRhbGtlZCB0byBkd2FyZiBtb3RoZXJcbiAgMHgwNTMsIC8vIGNoaWxkIGZvbGxvd2luZ1xuICAweDA2MSwgLy8gdGFsa2VkIHRvIHN0b20gaW4gc3dhbiBodXRcbiAgMHgwNjcsIC8vIGtpbGxlZCBtYWRvIDFcbiAgLy8gMHgwNmMsIC8vIGRlZmVhdGVkIGRyYXlnb24gMVxuICAweDA3MiwgLy8ga2Vuc3UgZm91bmQgaW4gdGF2ZXJuXG4gIDB4MDhiLCAvLyBnb3Qgc2hlbGwgZmx1dGVcbiAgMHgwOWIsIC8vIGFibGUgdG8gcmlkZSBkb2xwaGluXG4gIDB4MGE1LCAvLyB0YWxrZWQgdG8gemVidSBzdHVkZW50XG4gIDB4MGE5LCAvLyB0YWxrZWQgdG8gbGVhZiByYWJiaXRcbiAgMHgxMDAsIC8vIGtpbGxlZCB2YW1waXJlIDFcbiAgMHgxMDEsIC8vIGtpbGxlZCBpbnNlY3RcbiAgMHgxMDIsIC8vIGtpbGxlZCBrZWxiZXNxdWUgMVxuICAweDEwMywgLy8gcmFnZVxuICAweDEwNSwgLy8ga2lsbGVkIGtlbGJlc3F1ZSAyXG4gIDB4MTA2LCAvLyBraWxsZWQgc2FiZXJhIDJcbiAgMHgxMDcsIC8vIGtpbGxlZCBtYWRvIDJcbiAgMHgxMDgsIC8vIGtpbGxlZCBrYXJtaW5lXG4gIDB4MTBiLCAvLyBraWxsZWQgZHJheWdvbiAxXG4gIDB4MTBjLCAvLyBraWxsZWQgdmFtcGlyZSAyXG5cbiAgLy8gc3dvcmRzIChtYXkgYmUgbmVlZGVkIGZvciByYWdlLCBTb1QgZm9yIG1hc3NhY3JlKVxuICAweDIwMCwgMHgyMDEsIDB4MjAyLCAweDIwMyxcbiAgLy8gYmFsbHMgYW5kIGJyYWNlbGV0cyBtYXkgYmUgbmVlZGVkIGZvciB0ZWxlcG9ydFxuICAweDIwNSwgMHgyMDYsIDB4MjA3LCAweDIwOCwgMHgyMDksIDB4MjBhLCAweDIwYiwgMHgyMGMsXG4gIDB4MjM1LCAvLyBmb2cgbGFtcCAoZm9yIGZpc2hlcm1hbiBzcGF3biBtYXliZT8pXG4gIDB4MjM2LCAvLyBzaGVsbCBmbHV0ZSAoZm9yIGZpc2hlcm1hbiBzcGF3bilcbiAgMHgyNDMsIC8vIHRlbGVwYXRoeSAoZm9yIHJhYmJpdCwgb2FrLCBkZW8pXG4gIDB4MjQ0LCAvLyB0ZWxlcG9ydCAoZm9yIG10IHNhYnJlIHRyaWdnZXIpXG4gIDB4MjgzLCAvLyBjYWxtZWQgc2VhIChmb3IgYmFycmllcilcbiAgMHgyOGQsIC8vIGtpbGxlZCBkcmF5Z29uIDIgKHdhbGwgZGVzdHJveWVkKVxuICAweDJlZSwgLy8gc3RhcnRlZCB3aW5kbWlsbCAoZm9yIHJlZnJlc2gpXG5cbiAgLy8gTk9URTogdGhlc2UgYXJlIG1vdmVkIGJlY2F1c2Ugb2Ygem9tYmllIHdhcnAhXG4gIDB4MmY2LCAvLyB3YXJwOm9hayAoZm9yIHRlbGVwYXRoeSlcbiAgLy8gMHgyZmEsIC8vIHdhcnA6am9lbCAoZm9yIGV2aWwgc3Bpcml0IGlzbGFuZClcbiAgMHgyZmQsIC8vIHdhcnA6c2h5cm9uIChmb3IgdGVsZXBhdGh5KVxuXG4gIC8vIE1hZ2ljLkNIQU5HRVswXVswXSxcbiAgLy8gTWFnaWMuVEVMRVBBVEhZWzBdWzBdLFxuXTtcblxuLy8gVE9ETyAtIHRoaXMgaXMgbm90IHBlcnZhc2l2ZSBlbm91Z2ghISFcbi8vICAtIG5lZWQgYSB3YXkgdG8gcHV0IGl0IGV2ZXJ5d2hlcmVcbi8vICAgIC0+IG1heWJlIGluIE11dGFibGVSZXF1aXJlbWVudHM/XG5jb25zdCBGTEFHX01BUDogTWFwPG51bWJlciwgcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXT4gPSBuZXcgTWFwKFtcbiAgWzB4MDBhLCBFdmVudC5TVEFSVEVEX1dJTkRNSUxMXSwgLy8gdGhpcyBpcyByZWYnZCBvdXRzaWRlIHRoaXMgZmlsZSFcbiAgLy9bMHgwMGUsIE1hZ2ljLlRFTEVQQVRIWV0sXG4gIC8vWzB4MDNmLCBNYWdpYy5URUxFUE9SVF0sXG4gIC8vIFF1ZWVuIHdpbGwgZ2l2ZSBmbHV0ZSBvZiBsaW1lIHcvbyBwYXJhbHlzaXMgaW4gdGhpcyBjYXNlLlxuICAvLyBbMHgwMTcsIEl0ZW0uU1dPUkRfT0ZfV0FURVJdLFxuICBbMHgwMjgsIE1hZ2ljLkNIQU5HRV0sXG4gIFsweDAyOSwgTWFnaWMuQ0hBTkdFXSxcbiAgWzB4MDJhLCBNYWdpYy5DSEFOR0VdLFxuICBbMHgwMmIsIE1hZ2ljLkNIQU5HRV0sXG4gIFsweDA2YywgQm9zcy5EUkFZR09OMV0sXG4gIFsweDA4YiwgSXRlbS5TSEVMTF9GTFVURV0sXG4gIFsweDBlZSwgRXZlbnQuUklERV9ET0xQSElOXSwgLy8gTk9URTogY3VzdG9tIGZsYWdcbl0pO1xuXG4vLyBNYXBzIHRyaWdnZXIgYWN0aW9ucyB0byB0aGUgc2xvdCB0aGV5IGdyYW50LlxuY29uc3QgVFJJR0dFUl9BQ1RJT05fSVRFTVM6IHtbYWN0aW9uOiBudW1iZXJdOiBTbG90fSA9IHtcbiAgMHgwODogU2xvdChNYWdpYy5QQVJBTFlTSVMpLFxuICAweDBiOiBTbG90KE1hZ2ljLkJBUlJJRVIpLFxuICAweDBmOiBTbG90KE1hZ2ljLlJFRlJFU0gpLFxuICAweDE4OiBTbG90KE1hZ2ljLlRFTEVQQVRIWSksXG59O1xuXG5jb25zdCBTV09SRFMgPSBbSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLlNXT1JEX09GX0ZJUkUsXG4gICAgICAgICAgICAgICAgSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5TV09SRF9PRl9USFVOREVSXSBhcyBjb25zdDtcbmNvbnN0IFNXT1JEX1BPV0VSUyA9IFtcbiAgW0l0ZW0uT1JCX09GX1dJTkQsIEl0ZW0uVE9STkFET19CUkFDRUxFVF0sXG4gIFtJdGVtLk9SQl9PRl9GSVJFLCBJdGVtLkZMQU1FX0JSQUNFTEVUXSxcbiAgW0l0ZW0uT1JCX09GX1dBVEVSLCBJdGVtLkJMSVpaQVJEX0JSQUNFTEVUXSxcbiAgW0l0ZW0uT1JCX09GX1RIVU5ERVIsIEl0ZW0uU1RPUk1fQlJBQ0VMRVRdLFxuXSBhcyBjb25zdDtcblxuZnVuY3Rpb24gc3dvcmRSZXF1aXJlbWVudChzd29yZDogbnVtYmVyLCBsZXZlbDogbnVtYmVyKTogUmVxdWlyZW1lbnQge1xuICBsZXQgcjtcbiAgaWYgKGxldmVsID09PSAxKSByPSBTV09SRFNbc3dvcmRdO1xuICBlbHNlIGlmIChsZXZlbCA9PT0gMykgcj0gYW5kKFNXT1JEU1tzd29yZF0sIC4uLlNXT1JEX1BPV0VSU1tzd29yZF0pO1xuICBlbHNlIHI9IG9yKC4uLlNXT1JEX1BPV0VSU1tzd29yZF0ubWFwKHAgPT4gYW5kKFNXT1JEU1tzd29yZF0sIHApKSk7XG4gIGlmIChBcnJheS5pc0FycmF5KHJbMF1bMF0pKSB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgcmV0dXJuIHI7XG59XG5cbmV4cG9ydCBjbGFzcyBPdmVybGF5IHtcblxuICBwcml2YXRlIHJlYWRvbmx5IHJlbGV2YW50RmxhZ3MgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgLy8gbnBjIGlkIC0+IHdhbnRlZCBpdGVtXG4gIHByaXZhdGUgcmVhZG9ubHkgdHJhZGVJbnMgPSBuZXcgTWFwPG51bWJlciwgcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXT4oKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IHNob290aW5nU3RhdHVlcyA9IG5ldyBTZXQ8U2NyZWVuSWQ+KCk7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGZsYWdzOiBGbGFnU2V0LFxuICAgICAgICAgICAgICBwcml2YXRlIHJlYWRvbmx5IHRyYWNrZXI6IGJvb2xlYW4pIHtcbiAgICAvLyBUT0RPIC0gYWRqdXN0IGJhc2VkIG9uIGZsYWdzZXQ/XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIFJFTEVWQU5UX0ZMQUdTKSB7XG4gICAgICB0aGlzLnJlbGV2YW50RmxhZ3MuYWRkKGZsYWcpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygcm9tLml0ZW1zKSB7XG4gICAgICBpZiAoIWl0ZW0udHJhZGVzLmxlbmd0aCkgY29udGludWU7XG4gICAgICBjb25zdCBjb25kID0gaXRlbS5pZCA9PT0gMHgxZCA/IENhcGFiaWxpdHkuQlVZX0hFQUxJTkcgOiBJdGVtKGl0ZW0uaWQpO1xuICAgICAgZm9yIChjb25zdCB0cmFkZSBvZiBpdGVtLnRyYWRlcykge1xuICAgICAgICB0aGlzLnRyYWRlSW5zLnNldChpdGVtLml0ZW1Vc2VEYXRhW3RyYWRlXS53YW50ICYgMHhmZiwgY29uZCk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgbG9jIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jLnNwYXducykge1xuICAgICAgICBpZiAoc3Bhd24uaXNNb25zdGVyKCkgJiYgc3Bhd24uaWQgPT09IDB4M2YpIHsgLy8gc2hvb3Rpbmcgc3RhdHVlc1xuICAgICAgICAgIHRoaXMuc2hvb3RpbmdTdGF0dWVzLmFkZChTY3JlZW5JZC5mcm9tKGxvYywgc3Bhd24pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyAgIDB4MWQsIC8vIG1lZGljYWwgaGVyYlxuICAgIC8vICAgMHgyNSwgLy8gc3RhdHVlIG9mIG9ueXhcbiAgICAvLyAgIDB4MzUsIC8vIGZvZyBsYW1wXG4gICAgLy8gICAweDNiLCAvLyBsb3ZlIHBlbmRhbnRcbiAgICAvLyAgIDB4M2MsIC8vIGtpcmlzYSBwbGFudFxuICAgIC8vICAgMHgzZCwgLy8gaXZvcnkgc3RhdHVlXG4gICAgLy8gXS5tYXAoaSA9PiB0aGlzLnJvbS5pdGVtc1tpXSk7XG4gIH1cblxuICAvKiogQHBhcmFtIGlkIE9iamVjdCBJRCBvZiB0aGUgYm9zcy4gKi9cbiAgYm9zc1JlcXVpcmVtZW50cyhib3NzOiBSb21Cb3NzKTogUmVxdWlyZW1lbnQge1xuICAgIC8vIFRPRE8gLSBoYW5kbGUgYm9zcyBzaHVmZmxlIHNvbWVob3c/XG4gICAgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5yYWdlKSB7XG4gICAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3MucmFuZG9taXplVHJhZGVzKCkpIHJldHVybiBDYXBhYmlsaXR5LlNXT1JEO1xuICAgICAgLy8gcmV0dXJuIEl0ZW0uU1dPUkRfT0ZfV0FURVI7XG4gICAgICByZXR1cm4gQ29uZGl0aW9uKHRoaXMucm9tLm5wY3NbMHhjM10ubG9jYWxEaWFsb2dzLmdldCgtMSkhWzBdLmNvbmRpdGlvbik7XG4gICAgfVxuICAgIGNvbnN0IGlkID0gYm9zcy5vYmplY3Q7XG4gICAgY29uc3Qgb3V0ID0gbmV3IE11dGFibGVSZXF1aXJlbWVudCgpO1xuICAgIGlmICh0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFncy5zaHVmZmxlQm9zc0VsZW1lbnRzKCkpIHtcbiAgICAgIG91dC5hZGRBbGwoQ2FwYWJpbGl0eS5TV09SRCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmZsYWdzLmd1YXJhbnRlZU1hdGNoaW5nU3dvcmQoKSkge1xuICAgICAgY29uc3QgbGV2ZWwgPSB0aGlzLmZsYWdzLmd1YXJhbnRlZVN3b3JkTWFnaWMoKSA/IGJvc3Muc3dvcmRMZXZlbCA6IDE7XG4gICAgICBjb25zdCBvYmogPSB0aGlzLnJvbS5vYmplY3RzW2lkXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgaSsrKSB7XG4gICAgICAgIGlmIChvYmouaXNWdWxuZXJhYmxlKGkpKSBvdXQuYWRkQWxsKHN3b3JkUmVxdWlyZW1lbnQoaSwgbGV2ZWwpKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb3V0LmFkZEFsbChDYXBhYmlsaXR5LlNXT1JEKTtcbiAgICB9XG4gICAgY29uc3QgZXh0cmE6IENhcGFiaWxpdHlbXSA9IFtdO1xuICAgIGlmICh0aGlzLmZsYWdzLmd1YXJhbnRlZVJlZnJlc2goKSkge1xuICAgICAgLy8gVE9ETyAtIG1ha2UgdGhpcyBcImd1YXJhbnRlZSBkZWZlbnNpdmUgbWFnaWNcIiBhbmQgYWxsb3cgcmVmcmVzaCBPUiBiYXJyaWVyP1xuICAgICAgZXh0cmEucHVzaChNYWdpYy5SRUZSRVNIKTtcbiAgICB9XG4gICAgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5pbnNlY3QpIHsgLy8gaW5zZWN0XG4gICAgICBleHRyYS5wdXNoKEl0ZW0uSU5TRUNUX0ZMVVRFLCBJdGVtLkdBU19NQVNLKTtcbiAgICB9XG4gICAgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5kcmF5Z29uMikge1xuICAgICAgZXh0cmEucHVzaChJdGVtLkJPV19PRl9UUlVUSCk7XG4gICAgICBpZiAodGhpcy5mbGFncy5zdG9yeU1vZGUoKSkge1xuICAgICAgICBleHRyYS5wdXNoKFxuICAgICAgICAgIEJvc3MuS0VMQkVTUVVFMSxcbiAgICAgICAgICBCb3NzLktFTEJFU1FVRTIsXG4gICAgICAgICAgQm9zcy5TQUJFUkExLFxuICAgICAgICAgIEJvc3MuU0FCRVJBMixcbiAgICAgICAgICBCb3NzLk1BRE8xLFxuICAgICAgICAgIEJvc3MuTUFETzIsXG4gICAgICAgICAgQm9zcy5LQVJNSU5FLFxuICAgICAgICAgIEJvc3MuRFJBWUdPTjEsXG4gICAgICAgICAgSXRlbS5TV09SRF9PRl9XSU5ELFxuICAgICAgICAgIEl0ZW0uU1dPUkRfT0ZfRklSRSxcbiAgICAgICAgICBJdGVtLlNXT1JEX09GX1dBVEVSLFxuICAgICAgICAgIEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUik7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChleHRyYS5sZW5ndGgpIHtcbiAgICAgIG91dC5yZXN0cmljdChhbmQoLi4uZXh0cmEpKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5mcmVlemUoKTtcbiAgfVxuXG4gIGxvY2F0aW9ucygpOiBUaWxlQ2hlY2tbXSB7XG4gICAgY29uc3QgbG9jYXRpb25zOiBUaWxlQ2hlY2tbXSA9IFtdO1xuICAgIC8vIFRPRE8gLSBwdWxsIHRoZSBsb2NhdGlvbiBvdXQgb2YgaXRlbVVzZURhdGFbMF0gZm9yIHRoZXNlIGl0ZW1zXG4gICAgbG9jYXRpb25zLnB1c2goe1xuICAgICAgdGlsZTogVGlsZUlkKDB4MGYwMDg4KSxcbiAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuU1RBUlRFRF9XSU5ETUlMTCksXG4gICAgICBjb25kaXRpb246IEl0ZW0uV0lORE1JTExfS0VZLFxuICAgIH0sIHtcbiAgICAgIHRpbGU6IFRpbGVJZCgweGU0MDA4OCksXG4gICAgICBzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9KT0VMX1NIRUQpLFxuICAgICAgY29uZGl0aW9uOiBJdGVtLkVZRV9HTEFTU0VTLFxuICAgIH0pO1xuICAgIGZvciAoY29uc3Qgc2hvcCBvZiB0aGlzLnJvbS5zaG9wcykge1xuICAgICAgLy8gbGVhZiBhbmQgc2h5cm9uIG1heSBub3QgYWx3YXlzIGJlIGFjY2Vzc2libGUsIHNvIGRvbid0IHJlbHkgb24gdGhlbS5cbiAgICAgIGlmIChzaG9wLmxvY2F0aW9uID09PSAweGMzIHx8IHNob3AubG9jYXRpb24gPT09IDB4ZjYpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFzaG9wLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKHNob3AudHlwZSAhPT0gU2hvcFR5cGUuVE9PTCkgY29udGludWU7XG4gICAgICBjb25zdCBjaGVjayA9IHtcbiAgICAgICAgdGlsZTogVGlsZUlkKHNob3AubG9jYXRpb24gPDwgMTYgfCAweDg4KSxcbiAgICAgICAgY29uZGl0aW9uOiBDYXBhYmlsaXR5Lk1PTkVZLFxuICAgICAgfTtcbiAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBzaG9wLmNvbnRlbnRzKSB7XG4gICAgICAgIGlmIChpdGVtID09PSAoSXRlbS5NRURJQ0FMX0hFUkJbMF1bMF0gJiAweGZmKSkge1xuICAgICAgICAgIGxvY2F0aW9ucy5wdXNoKHsuLi5jaGVjaywgc2xvdDogU2xvdChDYXBhYmlsaXR5LkJVWV9IRUFMSU5HKX0pO1xuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gPT09IChJdGVtLldBUlBfQk9PVFNbMF1bMF0gJiAweGZmKSkge1xuICAgICAgICAgIGxvY2F0aW9ucy5wdXNoKHsuLi5jaGVjaywgc2xvdDogU2xvdChDYXBhYmlsaXR5LkJVWV9XQVJQKX0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsb2NhdGlvbnM7XG4gIH1cblxuICAvKiogUmV0dXJucyB1bmRlZmluZWQgaWYgaW1wYXNzYWJsZS4gKi9cbiAgbWFrZVRlcnJhaW4oZWZmZWN0czogbnVtYmVyLCB0aWxlOiBUaWxlSWQpOiBUZXJyYWluIHwgdW5kZWZpbmVkIHtcbiAgICAvLyBDaGVjayBmb3IgZG9scGhpbiBvciBzd2FtcC4gIEN1cnJlbnRseSBkb24ndCBzdXBwb3J0IHNodWZmbGluZyB0aGVzZS5cbiAgICBjb25zdCBsb2MgPSB0aWxlID4+PiAxNjtcbiAgICBlZmZlY3RzICY9IDB4MjY7XG4gICAgaWYgKGxvYyA9PT0gMHgxYSkgZWZmZWN0cyB8PSAweDA4O1xuICAgIGlmIChsb2MgPT09IDB4NjAgfHwgbG9jID09PSAweDY4KSBlZmZlY3RzIHw9IDB4MTA7XG4gICAgLy8gTk9URTogb25seSB0aGUgdG9wIGhhbGYtc2NyZWVuIGluIHVuZGVyZ3JvdW5kIGNoYW5uZWwgaXMgZG9scGhpbmFibGVcbiAgICBpZiAobG9jID09PSAweDY0ICYmICgodGlsZSAmIDB4ZjBmMCkgPCAweDkwKSkgZWZmZWN0cyB8PSAweDEwO1xuICAgIGlmICh0aGlzLnNob290aW5nU3RhdHVlcy5oYXMoU2NyZWVuSWQuZnJvbVRpbGUodGlsZSkpKSBlZmZlY3RzIHw9IDB4MDE7XG4gICAgaWYgKGVmZmVjdHMgJiAweDIwKSB7IC8vIHNsb3BlXG4gICAgICAvLyBEZXRlcm1pbmUgbGVuZ3RoIG9mIHNsb3BlOiBzaG9ydCBzbG9wZXMgYXJlIGNsaW1iYWJsZS5cbiAgICAgIC8vIDYtOCBhcmUgYm90aCBkb2FibGUgd2l0aCBib290c1xuICAgICAgLy8gMC01IGlzIGRvYWJsZSB3aXRoIG5vIGJvb3RzXG4gICAgICAvLyA5IGlzIGRvYWJsZSB3aXRoIHJhYmJpdCBib290cyBvbmx5IChub3QgYXdhcmUgb2YgYW55IG9mIHRoZXNlLi4uKVxuICAgICAgLy8gMTAgaXMgcmlnaHQgb3V0XG4gICAgICBjb25zdCBnZXRFZmZlY3RzID0gKHRpbGU6IFRpbGVJZCk6IG51bWJlciA9PiB7XG4gICAgICAgIGNvbnN0IGwgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGlsZSA+Pj4gMTZdO1xuICAgICAgICBjb25zdCBzY3JlZW4gPSBsLnNjcmVlbnNbKHRpbGUgJiAweGYwMDApID4+PiAxMl1bKHRpbGUgJiAweGYwMCkgPj4+IDhdO1xuICAgICAgICByZXR1cm4gdGhpcy5yb20udGlsZUVmZmVjdHNbbC50aWxlRWZmZWN0cyAtIDB4YjNdXG4gICAgICAgICAgICAuZWZmZWN0c1t0aGlzLnJvbS5zY3JlZW5zW3NjcmVlbl0udGlsZXNbdGlsZSAmIDB4ZmZdXTtcbiAgICAgIH07XG4gICAgICBsZXQgYm90dG9tID0gdGlsZTtcbiAgICAgIGxldCBoZWlnaHQgPSAtMTtcbiAgICAgIHdoaWxlIChnZXRFZmZlY3RzKGJvdHRvbSkgJiAweDIwKSB7XG4gICAgICAgIGJvdHRvbSA9IFRpbGVJZC5hZGQoYm90dG9tLCAxLCAwKTtcbiAgICAgICAgaGVpZ2h0Kys7XG4gICAgICB9XG4gICAgICBsZXQgdG9wID0gdGlsZTtcbiAgICAgIHdoaWxlIChnZXRFZmZlY3RzKHRvcCkgJiAweDIwKSB7XG4gICAgICAgIHRvcCA9IFRpbGVJZC5hZGQodG9wLCAtMSwgMCk7XG4gICAgICAgIGhlaWdodCsrO1xuICAgICAgfVxuICAgICAgaWYgKGhlaWdodCA8IDYpIHtcbiAgICAgICAgZWZmZWN0cyAmPSB+MHgyMDtcbiAgICAgIH0gZWxzZSBpZiAoaGVpZ2h0IDwgOSkge1xuICAgICAgICBlZmZlY3RzIHw9IDB4NDA7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBURVJSQUlOU1tlZmZlY3RzXTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBmb2xkaW5nIHRoaXMgaW50byBsb2NhdGlvbi90cmlnZ2VyL25wYyBhcyBhbiBleHRyYSByZXR1cm4/XG4gIGV4dHJhUm91dGVzKCk6IEV4dHJhUm91dGVbXSB7XG4gICAgY29uc3Qgcm91dGVzID0gW107XG4gICAgY29uc3QgZW50cmFuY2UgPSAobG9jYXRpb246IG51bWJlciwgZW50cmFuY2U6IG51bWJlciA9IDApOiBUaWxlSWQgPT4ge1xuICAgICAgY29uc3QgbCA9IHRoaXMucm9tLmxvY2F0aW9uc1tsb2NhdGlvbl07XG4gICAgICBjb25zdCBlID0gbC5lbnRyYW5jZXNbZW50cmFuY2VdO1xuICAgICAgcmV0dXJuIFRpbGVJZC5mcm9tKGwsIGUpO1xuICAgIH07XG4gICAgLy8gU3RhcnQgdGhlIGdhbWUgYXQgMDowXG4gICAgcm91dGVzLnB1c2goe3RpbGU6IGVudHJhbmNlKDApfSk7XG4gICAgLy8gU3dvcmQgb2YgVGh1bmRlciB3YXJwXG4gICAgLy8gVE9ETyAtIGVudHJhbmNlIHNodWZmbGUgd2lsbCBicmVhayB0aGUgYXV0by13YXJwLXBvaW50IGFmZm9yZGFuY2UuXG4gICAgaWYgKHRoaXMuZmxhZ3MudGVsZXBvcnRPblRodW5kZXJTd29yZCgpKSB7XG4gICAgICBjb25zdCB3YXJwID0gdGhpcy5yb20udG93bldhcnAudGh1bmRlclN3b3JkV2FycDtcbiAgICAgIHJvdXRlcy5wdXNoKHtcbiAgICAgICAgdGlsZTogZW50cmFuY2Uod2FycFswXSwgd2FycFsxXSAmIDB4MWYpLFxuICAgICAgICBjb25kaXRpb246IG9yKGFuZChJdGVtLlNXT1JEX09GX1RIVU5ERVIsIENhcGFiaWxpdHkuQlVZX1dBUlApLFxuICAgICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX1RIVU5ERVIsIE1hZ2ljLlRFTEVQT1JUKSksXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3MuYXNzdW1lV2lsZFdhcnAoKSkge1xuICAgICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiB0aGlzLnJvbS53aWxkV2FycC5sb2NhdGlvbnMpIHtcbiAgICAgICAgcm91dGVzLnB1c2goe3RpbGU6IGVudHJhbmNlKGxvY2F0aW9uKX0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcm91dGVzO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNvbnNpZGVyIGZvbGRpbmcgdGhpcyBpbnRvIGxvY2F0aW9uL3RyaWdnZXIvbnBjIGFzIGFuIGV4dHJhIHJldHVybj9cbiAgZXh0cmFFZGdlcygpOiBFeHRyYUVkZ2VbXSB7XG4gICAgY29uc3QgZWRnZXMgPSBbXTtcbiAgICAvLyBuZWVkIGFuIGVkZ2UgZnJvbSB0aGUgYm9hdCBob3VzZSB0byB0aGUgYmVhY2ggLSB3ZSBjb3VsZCBidWlsZCB0aGlzIGludG8gdGhlXG4gICAgLy8gYm9hdCBib2FyZGluZyB0cmlnZ2VyLCBidXQgZm9yIG5vdyBpdCdzIGhlcmUuXG4gICAgZWRnZXMucHVzaCh7XG4gICAgICBmcm9tOiBUaWxlSWQoMHg1MTAwODgpLCAvLyBpbiBmcm9udCBvZiBib2F0IGhvdXNlXG4gICAgICB0bzogVGlsZUlkKDB4NjA4Njg4KSwgLy8gaW4gZnJvbnQgb2YgY2FiaW5cbiAgICAgIGNvbmRpdGlvbjogRXZlbnQuUkVUVVJORURfRk9HX0xBTVAsXG4gICAgfSk7XG4gICAgcmV0dXJuIGVkZ2VzO1xuICB9XG5cbiAgdHJpZ2dlcihpZDogbnVtYmVyKTogVHJpZ2dlckRhdGEge1xuICAgIHN3aXRjaCAoaWQpIHtcbiAgICBjYXNlIDB4OWE6IC8vIHN0YXJ0IGZpZ2h0IHdpdGggbWFkbyBpZiBzaHlyb24gbWFzc2FjcmUgc3RhcnRlZFxuICAgICAgLy8gVE9ETyAtIGxvb2sgdXAgd2hvIHRoZSBhY3R1YWwgYm9zcyBpcyBvbmNlIHdlIGdldCBib3NzIHNodWZmbGUhISFcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogbWVldChFdmVudC5TSFlST05fTUFTU0FDUkUsIHRoaXMuYm9zc1JlcXVpcmVtZW50cyh0aGlzLnJvbS5ib3NzZXMubWFkbzEpKSxcbiAgICAgICAgc2xvdDogU2xvdChCb3NzLk1BRE8xKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YWE6IC8vIGVudGVyIG9hayBhZnRlciBpbnNlY3RcbiAgICAgIC8vIE5PVEU6IFRoaXMgaXMgbm90IHRoZSB0cmlnZ2VyIHRoYXQgY2hlY2tzLCBidXQgcmF0aGVyIGl0IGhhcHBlbnMgb24gdGhlIGVudHJhbmNlLlxuICAgICAgLy8gVGhpcyBpcyBhIGNvbnZlbmllbnQgcGxhY2UgdG8gaGFuZGxlIGl0LCB0aG91Z2gsIHNpbmNlIHdlIGFscmVhZHkgbmVlZCB0byBleHBsaWNpdGx5XG4gICAgICAvLyBpZ25vcmUgdGhpcyB0cmlnZ2VyLiAgV2UgYWxzbyByZXF1aXJlIHdhcnAgYm9vdHMgYmVjYXVzZSBpdCdzIHBvc3NpYmxlIHRoYXQgdGhlcmUnc1xuICAgICAgLy8gbm8gZGlyZWN0IHdhbGtpbmcgcGF0aCBhbmQgaXQncyBub3QgZmVhc2libGUgdG8gY2FycnkgdGhlIGNoaWxkIHdpdGggdXMgZXZlcnl3aGVyZSxcbiAgICAgIC8vIGR1ZSB0byBncmFwaGljcyByZWFzb25zLlxuICAgICAgcmV0dXJuIHtjaGVjazpbe1xuICAgICAgICBjb25kaXRpb246IGFuZChFdmVudC5EV0FSRl9DSElMRCwgQ2FwYWJpbGl0eS5CVVlfV0FSUCksXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuUkVTQ1VFRF9DSElMRCksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFkOiAvLyBhbGxvdyBvcGVuaW5nIHByaXNvbiBkb29yXG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IEl0ZW0uS0VZX1RPX1BSSVNPTixcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5PUEVORURfUFJJU09OKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YWU6IC8vIGFsbG93IG9wZW5pbmcgc3R4eVxuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBJdGVtLktFWV9UT19TVFlYLFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9TVFlYKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YWY6IC8vIGFsbG93IGNhbG1pbmcgc2VhXG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IEl0ZW0uU1RBVFVFX09GX0dPTEQsXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuQ0FMTUVEX1NFQSksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGIxOiAvLyBzdGFydCBmaWdodCB3aXRoIGd1YXJkaWFuIHN0YXR1ZXNcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogYW5kKEl0ZW0uQk9XX09GX1NVTiwgSXRlbS5CT1dfT0ZfTU9PTiksXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX0NSWVBUKSxcbiAgICAgIH1dfTtcbiAgICB9XG4gICAgLy8gQ2hlY2sgZm9yIHJlbGV2YW50IGZsYWdzIGFuZCBrbm93biBhY3Rpb24gdHlwZXMuXG4gICAgY29uc3QgdHJpZ2dlciA9IHRoaXMucm9tLnRyaWdnZXJzW2lkICYgMHg3Zl07XG4gICAgaWYgKCF0cmlnZ2VyIHx8ICF0cmlnZ2VyLnVzZWQpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0cmlnZ2VyOiAke2hleChpZCl9YCk7XG4gICAgY29uc3QgcmVsZXZhbnQgPSAoZjogbnVtYmVyKSA9PiB0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGYpO1xuICAgIGNvbnN0IHJlbGV2YW50QW5kU2V0ID0gKGY6IG51bWJlcikgPT4gZiA+IDAgJiYgdGhpcy5yZWxldmFudEZsYWdzLmhhcyhmKTtcbiAgICBmdW5jdGlvbiBtYXAoZjogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgIGlmIChmIDwgMCkgcmV0dXJuIH5tYXAofmYpO1xuICAgICAgY29uc3QgbWFwcGVkID0gRkxBR19NQVAuZ2V0KGYpO1xuICAgICAgcmV0dXJuIG1hcHBlZCAhPSBudWxsID8gbWFwcGVkWzBdWzBdIDogZjtcbiAgICB9XG4gICAgY29uc3QgYWN0aW9uSXRlbSA9IFRSSUdHRVJfQUNUSU9OX0lURU1TW3RyaWdnZXIubWVzc2FnZS5hY3Rpb25dO1xuICAgIGNvbnN0IGNvbmRpdGlvbiA9IGFuZCguLi50cmlnZ2VyLmNvbmRpdGlvbnMubWFwKG1hcCkuZmlsdGVyKHJlbGV2YW50QW5kU2V0KS5tYXAoQ29uZGl0aW9uKSk7XG4gICAgaWYgKHRyaWdnZXIubWVzc2FnZS5hY3Rpb24gPT09IDB4MTkpIHsgLy8gcHVzaC1kb3duIHRyaWdnZXJcbiAgICAgIC8vIFRPRE8gLSBwYXNzIGluIHRlcnJhaW47IGlmIG9uIGxhbmQgYW5kIHRyaWdnZXIgc2tpcCBpcyBvbiB0aGVuXG4gICAgICAvLyBhZGQgYSByb3V0ZSByZXF1aXJpbmcgcmFiYml0IGJvb3RzIGFuZCBlaXRoZXIgd2FycCBib290cyBvciB0ZWxlcG9ydD9cbiAgICAgIGNvbnN0IGV4dHJhOiBUcmlnZ2VyRGF0YSA9IHt9O1xuICAgICAgaWYgKHRyaWdnZXIuaWQgPT09IDB4ODYgJiYgIXRoaXMuZmxhZ3MuYXNzdW1lUmFiYml0U2tpcCgpKSB7XG4gICAgICAgIGV4dHJhLmR4ID0gWy0zMiwgLTE2LCAwLCAxNl07XG4gICAgICB9XG4gICAgICBpZiAodHJpZ2dlci5pZCA9PT0gMHhiYSAmJlxuICAgICAgICAgICF0aGlzLmZsYWdzLmRpc2FibGVUZWxlcG9ydFNraXAoKSAmJlxuICAgICAgICAgICF0aGlzLmZsYWdzLmFzc3VtZVRlbGVwb3J0U2tpcCgpKSB7XG4gICAgICAgIGV4dHJhLmV4dHJhTG9jYXRpb25zID0gW3RoaXMucm9tLmxvY2F0aW9ucy5Db3JkZWxQbGFpbldlc3RdO1xuICAgICAgfVxuICAgICAgY29uc3QgY29uZCA9XG4gICAgICAgICAgdHJpZ2dlci5jb25kaXRpb25zLm1hcChjID0+IGMgPCAwICYmIHJlbGV2YW50KH5tYXAoYykpID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENvbmRpdGlvbih+bWFwKGMpKSA6IG51bGwpXG4gICAgICAgICAgICAgIC5maWx0ZXIoKGM6IHVua25vd24pOiBjIGlzIFtbQ29uZGl0aW9uXV0gPT4gYyAhPSBudWxsKTtcbiAgICAgIGlmIChjb25kICYmIGNvbmQubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB7Li4uZXh0cmEsIHRlcnJhaW46IHtleGl0OiBvciguLi5jb25kKX19O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYWN0aW9uSXRlbSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4ge2NoZWNrOiBbe2NvbmRpdGlvbiwgc2xvdDogYWN0aW9uSXRlbX1dfTtcbiAgICB9XG4gICAgY29uc3QgZmxhZ3MgPSB0cmlnZ2VyLmZsYWdzLmZpbHRlcihyZWxldmFudEFuZFNldCk7XG4gICAgaWYgKGZsYWdzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHtjaGVjazogZmxhZ3MubWFwKGYgPT4gKHtjb25kaXRpb24sIHNsb3Q6IFNsb3QoZil9KSl9O1xuICAgIH1cblxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIG5wYyhpZDogbnVtYmVyLCBsb2M6IExvY2F0aW9uKTogTnBjRGF0YSB7XG4gICAgY29uc3QgbnBjID0gdGhpcy5yb20ubnBjc1tpZF07XG4gICAgaWYgKCFucGMgfHwgIW5wYy51c2VkKSB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHJpZ2dlcjogJHtoZXgoaWQpfWApO1xuXG4gICAgY29uc3Qgc3Bhd25Db25kaXRpb25zOiByZWFkb25seSBudW1iZXJbXSA9IG5wYy5zcGF3bkNvbmRpdGlvbnMuZ2V0KGxvYy5pZCkgfHwgW107XG5cbiAgICBjb25zdCByZXN1bHQ6IE5wY0RhdGEgJiB7Y2hlY2s6IENoZWNrW119ID0ge2NoZWNrOiBbXX07XG5cbiAgICBpZiAobnBjLmRhdGFbMl0gJiAweDA0KSB7XG4gICAgICAvLyBwZXJzb24gaXMgYSBzdGF0dWUuXG4gICAgICByZXN1bHQudGVycmFpbiA9IHtcbiAgICAgICAgZXhpdDogdGhpcy5mbGFncy5hc3N1bWVTdGF0dWVHbGl0Y2goKSA/XG4gICAgICAgICAgICAgICAgICBbW11dIDogXG4gICAgICAgICAgICAgICAgICBvciguLi5zcGF3bkNvbmRpdGlvbnMubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gRkxBR19NQVAuZ2V0KHgpIHx8ICh0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKHgpID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ29uZGl0aW9uKHgpIDogW10pKSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN0YXR1ZU9yKC4uLnJlcXM6IFJlcXVpcmVtZW50W10pOiB2b2lkIHtcbiAgICAgIGlmICghcmVzdWx0LnRlcnJhaW4pIHRocm93IG5ldyBFcnJvcignTWlzc2luZyB0ZXJyYWluIGZvciBndWFyZCcpO1xuICAgICAgcmVzdWx0LnRlcnJhaW4uZXhpdCA9IG9yKHJlc3VsdC50ZXJyYWluLmV4aXQgfHwgW10sIC4uLnJlcXMpO1xuICAgIH1cblxuICAgIC8vIFRPRE8gLSBmb3J0dW5lIHRlbGxlciAoMzkpIHJlcXVpcmVzIGFjY2VzcyB0byBwb3J0b2EgdG8gZ2V0IGhlciB0byBtb3ZlP1xuICAgIC8vICAgICAgLT4gbWF5YmUgaW5zdGVhZCBjaGFuZ2UgdGhlIGZsYWcgdG8gc2V0IGltbWVkaWF0ZWx5IG9uIHRhbGtpbmcgdG8gaGVyXG4gICAgLy8gICAgICAgICByYXRoZXIgdGhhbiB0aGUgdHJpZ2dlciBvdXRzaWRlIHRoZSBkb29yLi4uPyB0aGlzIHdvdWxkIGFsbG93IGdldHRpbmdcbiAgICAvLyAgICAgICAgIHRocm91Z2ggaXQgYnkganVzdCB0YWxraW5nIGFuZCB0aGVuIGxlYXZpbmcgdGhlIHJvb20uLi5cblxuICAgIHN3aXRjaCAoaWQpIHtcbiAgICBjYXNlIDB4MTQ6IC8vIHdva2VuLXVwIHdpbmRtaWxsIGd1YXJkXG4gICAgICAvLyBza2lwIGJlY2F1c2Ugd2UgdGllIHRoZSBpdGVtIHRvIHRoZSBzbGVlcGluZyBvbmUuXG4gICAgICBpZiAobG9jLnNwYXducy5maW5kKGwgPT4gbC5pc05wYygpICYmIGwuaWQgPT09IDB4MTUpKSByZXR1cm4ge307XG4gICAgY2FzZSAweDdlOiAvLyBhd29rZW4ga2Vuc3UgaW4gbGlnaHRob3VzZVxuICAgICAgLy8gc2tpcCBiZWNhdXNlIHdlIHRpZSB0aGUgaXRlbSB0byB0aGUgc2xlZXBpbmcgb25lLlxuICAgICAgaWYgKGxvYy5zcGF3bnMuZmluZChsID0+IGwuaXNOcGMoKSAmJiBsLmlkID09PSAweDZiKSkgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIHN3aXRjaCAoaWQpIHtcbiAgICBjYXNlIDB4MjU6IC8vIGFtYXpvbmVzIGd1YXJkXG4gICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAwLCB4MTogMiwgeTA6IDAsIHkxOiAxfTtcbiAgICAgIHN0YXR1ZU9yKE1hZ2ljLkNIQU5HRSwgTWFnaWMuUEFSQUxZU0lTKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHgyZDogLy8gbXQgc2FicmUvc3dhbiBzb2xkaWVyc1xuICAgICAgLy8gVGhlc2UgZG9uJ3QgY291bnQgYXMgc3RhdHVlcyBiZWNhdXNlIHRoZXknbGwgbW92ZSBpZiB5b3UgdGFsayB0byB0aGVtLlxuICAgICAgZGVsZXRlIHJlc3VsdC50ZXJyYWluO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDMzOiAvLyBwb3J0b2EgZ3VhcmQgKHRocm9uZSByb29tLCB0aG91Z2ggdGhlIHBhbGFjZSBvbmUgaXMgdGhlIG9uZSB0aGF0IG1hdHRlcnMpXG4gICAgICAvLyBOT1RFOiB0aGlzIG1lYW5zIHRoYXQgd2UgY2Fubm90IHNlcGFyYXRlIHRoZSBwYWxhY2UgZm95ZXIgZnJvbSB0aGUgdGhyb25lIHJvb20sIHNpbmNlXG4gICAgICAvLyB0aGVyZSdzIG5vIHdheSB0byByZXByZXNlbnQgdGhlIGNvbmRpdGlvbiBmb3IgcGFyYWx5emluZyB0aGUgZ3VhcmQgYW5kIHN0aWxsIGhhdmUgaGltXG4gICAgICAvLyBwYXNzYWJsZSB3aGVuIHRoZSBxdWVlbiBpcyB0aGVyZS4gIFRoZSB3aG9sZSBzZXF1ZW5jZSBpcyBhbHNvIHRpZ2h0bHkgY291cGxlZCwgc28gaXRcbiAgICAgIC8vIHByb2JhYmx5IHdvdWxkbid0IG1ha2Ugc2Vuc2UgdG8gc3BsaXQgaXQgdXAgYW55d2F5LlxuICAgICAgc3RhdHVlT3IoTWFnaWMuUEFSQUxZU0lTKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHgzODogLy8gcG9ydG9hIHF1ZWVuIHNpdHRpbmcgb24gaW1wYXNzYWJsZSB0aHJvbmVcbiAgICAgIGlmIChsb2MuaWQgPT09IDB4ZGYpIHJlc3VsdC5oaXRib3ggPSB7eDA6IDAsIHgxOiAxLCB5MDogMiwgeTE6IDN9O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDRlOiAvLyBzaHlyb24gZ3VhcmRcbiAgICAgIHJlc3VsdC5oaXRib3ggPSB7eDA6IC0xLCB4MTogMiwgeTA6IDAsIHkxOiAxfTtcbiAgICAgIHN0YXR1ZU9yKE1hZ2ljLkNIQU5HRSwgRXZlbnQuRU5URVJFRF9TSFlST04pO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDY4OiAvLyBrZW5zdSBpbiBjYWJpblxuICAgICAgcmVzdWx0LmhpdGJveCA9IHt4MDogLTEsIHgxOiAyLCB5MDogLTEsIHkxOiAyfTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHg4MDogLy8gZ29hIGd1YXJkc1xuICAgICAgc3RhdHVlT3IoLi4uc3Bhd25Db25kaXRpb25zLm1hcChjID0+IENvbmRpdGlvbih+YykpKTsgLy8gRXZlbnQuRU5URVJFRF9TSFlST05cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHg4NTogLy8gc3RvbmVkIHBhaXJcbiAgICAgIHN0YXR1ZU9yKEl0ZW0uRkxVVEVfT0ZfTElNRSk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBpbnRlcnNlY3Qgc3Bhd24gY29uZGl0aW9uc1xuICAgIGNvbnN0IHJlcXVpcmVtZW50czogQXJyYXk8cmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXT4gPSBbXTtcbiAgICBjb25zdCBhZGRSZXEgPSAoZmxhZzogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgICBpZiAoZmxhZyA8PSAwKSByZXR1cm47IC8vIG5lZ2F0aXZlIG9yIHplcm8gZmxhZyBpZ25vcmVkXG4gICAgICBjb25zdCByZXEgPSBGTEFHX01BUC5nZXQoZmxhZykgfHwgKHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZmxhZykgPyBDb25kaXRpb24oZmxhZykgOiBudWxsKTtcbiAgICAgIGlmIChyZXEgIT0gbnVsbCkgcmVxdWlyZW1lbnRzLnB1c2gocmVxKTtcbiAgICB9O1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBzcGF3bkNvbmRpdGlvbnMpIHtcbiAgICAgIGFkZFJlcShmbGFnKTtcbiAgICB9XG5cbiAgICAvLyBMb29rIGZvciB0cmFkZS1pbnNcbiAgICAvLyAgLSBUT0RPIC0gZG9uJ3QgaGFyZC1jb2RlIHRoZSBOUENzPyByZWFkIGZyb20gdGhlIGl0ZW1kYXRhP1xuICAgIGNvbnN0IHRyYWRlSW4gPSB0aGlzLnRyYWRlSW5zLmdldChpZClcbiAgICBpZiAodHJhZGVJbiAhPSBudWxsKSB7XG4gICAgICBjb25zdCB0ID0gdHJhZGVJbjtcbiAgICAgIGZ1bmN0aW9uIHRyYWRlKHNsb3Q6IFNsb3QsIC4uLnJlcXM6IEFycmF5PHJlYWRvbmx5IFtyZWFkb25seSBDb25kaXRpb25bXV0+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IGFuZCguLi5yZXF1aXJlbWVudHMsIHQsIC4uLnJlcXMpO1xuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdCwgY29uZGl0aW9ufSk7XG4gICAgICB9XG4gICAgICBsZXQgdHJhZGVSID0gdHJhZGU7XG4gICAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3MucmFuZG9taXplVHJhZGVzKCkpIHtcbiAgICAgICAgdHJhZGVSID0gKHNsb3QsIC4uLnJlcXMpID0+IHtcbiAgICAgICAgICBjb25zdCBpdGVtcyA9IFtcbiAgICAgICAgICAgIEl0ZW0uU1RBVFVFX09GX09OWVgsXG4gICAgICAgICAgICBJdGVtLkZPR19MQU1QLFxuICAgICAgICAgICAgSXRlbS5MT1ZFX1BFTkRBTlQsXG4gICAgICAgICAgICBJdGVtLktJUklTQV9QTEFOVCxcbiAgICAgICAgICAgIEl0ZW0uSVZPUllfU1RBVFVFLFxuICAgICAgICAgIF07XG4gICAgICAgICAgY29uc3QgY29uZGl0aW9uID1cbiAgICAgICAgICAgICAgb3IoLi4uaXRlbXMubWFwKGkgPT4gYW5kKC4uLnJlcXVpcmVtZW50cywgaSwgLi4ucmVxcykpKTtcbiAgICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdCwgY29uZGl0aW9ufSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHN3aXRjaCAoaWQpIHtcbiAgICAgIGNhc2UgMHgxNTogLy8gc2xlZXBpbmcgd2luZG1pbGwgZ3VhcmQgPT4gd2luZG1pbGwga2V5IHNsb3RcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLldJTkRNSUxMX0tFWSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHgyMzogLy8gYXJ5bGxpcyA9PiBib3cgb2YgbW9vbiBzbG90XG4gICAgICAgIC8vIE5PVEU6IHNpdHRpbmcgb24gaW1wYXNzaWJsZSB0aHJvbmVcbiAgICAgICAgcmVzdWx0LmhpdGJveCA9IHt4MDogLTEsIHgxOiAyLCB5MDogLTEsIHkxOiAyfTtcbiAgICAgICAgdHJhZGVSKFNsb3QoSXRlbS5CT1dfT0ZfTU9PTiksIE1hZ2ljLkNIQU5HRSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDYzOiAvLyBodXJ0IGRvbHBoaW4gPT4gaGVhbGVkIGRvbHBoaW5cbiAgICAgICAgLy8gTk9URTogZG9scGhpbiBvbiB3YXRlciwgYnV0IGNhbiBoZWFsIGZyb20gbGFuZFxuICAgICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAtMSwgeDE6IDIsIHkwOiAtMSwgeTE6IDJ9O1xuICAgICAgICB0cmFkZShTbG90KEV2ZW50LkhFQUxFRF9ET0xQSElOKSk7XG4gICAgICAgIHRyYWRlKFNsb3QoSXRlbS5TSEVMTF9GTFVURSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg2NDogLy8gZmlzaGVybWFuXG4gICAgICAgIHRyYWRlUihTbG90KEV2ZW50LlJFVFVSTkVEX0ZPR19MQU1QKSxcbiAgICAgICAgICAgICAgIC4uLih0aGlzLmZsYWdzLnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCkgP1xuICAgICAgICAgICAgICAgICAgIFtFdmVudC5IRUFMRURfRE9MUEhJTl0gOiBbXSkpO1xuICAgICAgICAvLyBUT0RPIC0gdXNlIHRoaXMgYXMgcHJveHkgZm9yIGJvYXRcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NmI6IC8vIHNsZWVwaW5nIGtlbnN1XG4gICAgICAgIHRyYWRlKFNsb3QoSXRlbS5HTE9XSU5HX0xBTVApKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NzU6IC8vIHNsaW1lZCBrZW5zdSA9PiBmbGlnaHQgc2xvdFxuICAgICAgICB0cmFkZVIoU2xvdChNYWdpYy5GTElHSFQpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NzQ6IC8vIGtlbnN1IGluIGRhbmNlIGhhbGwgPT4gY2hhbmdlIHNsb3RcbiAgICAgICAgLy8gTk9URTogdGhpcyBpcyBub3JtYWxseSA3ZSBidXQgd2UgY2hhbmdlIGl0IHRvIDc0IGluIHRoaXMgb25lXG4gICAgICAgIC8vIGxvY2F0aW9uIHRvIGlkZW50aWZ5IGl0XG4gICAgICAgIHRyYWRlUihTbG90KE1hZ2ljLkNIQU5HRSksIE1hZ2ljLlBBUkFMWVNJUywgRXZlbnQuRk9VTkRfS0VOU1UpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg4MjogLy8gYWthaGFuYSA9PiBnYXMgbWFzayBzbG90IChjaGFuZ2VkIDE2IC0+IDgyKVxuICAgICAgICB0cmFkZVIoU2xvdChJdGVtLkdBU19NQVNLKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDg4OiAvLyBzdG9uZWQgYWthaGFuYSA9PiBzaGllbGQgcmluZyBzbG90XG4gICAgICAgIHRyYWRlKFNsb3QoSXRlbS5TSElFTERfUklORykpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOUENzIHRoYXQgbmVlZCBhIGxpdHRsZSBleHRyYSBjYXJlXG5cbiAgICBpZiAoaWQgPT09IDB4ODQpIHsgLy8gc3RhcnQgZmlnaHQgd2l0aCBzYWJlcmFcbiAgICAgIC8vIFRPRE8gLSBsb29rIHVwIHdobyB0aGUgYWN0dWFsIGJvc3MgaXMgb25jZSB3ZSBnZXQgYm9zcyBzaHVmZmxlISEhXG4gICAgICBjb25zdCBjb25kaXRpb24gPSB0aGlzLmJvc3NSZXF1aXJlbWVudHModGhpcy5yb20uYm9zc2VzLnNhYmVyYTEpO1xuICAgICAgcmV0dXJuIHtjaGVjazogW1xuICAgICAgICB7Y29uZGl0aW9uLCBzbG90OiBTbG90KEJvc3MuU0FCRVJBMSl9LFxuICAgICAgXX07XG4gICAgfSBlbHNlIGlmIChpZCA9PT0gMHgxZCkgeyAvLyBvYWsgZWxkZXIgaGFzIHNvbWUgd2VpcmQgdW50cmFja2VkIGNvbmRpdGlvbnMuXG4gICAgICBjb25zdCBzbG90ID0gU2xvdChJdGVtLlNXT1JEX09GX0ZJUkUpO1xuICAgICAgcmV0dXJuIHtjaGVjazogW1xuICAgICAgICAvLyB0d28gZGlmZmVyZW50IHdheXMgdG8gZ2V0IHRoZSBzd29yZCBvZiBmaXJlIGl0ZW1cbiAgICAgICAge2NvbmRpdGlvbjogYW5kKE1hZ2ljLlRFTEVQQVRIWSwgQm9zcy5JTlNFQ1QpLCBzbG90fSxcbiAgICAgICAge2NvbmRpdGlvbjogRXZlbnQuUkVTQ1VFRF9DSElMRCwgc2xvdH0sXG4gICAgICBdfTtcbiAgICB9IGVsc2UgaWYgKGlkID09PSAweDFmKSB7IC8vIGR3YXJmIGNoaWxkXG4gICAgICBjb25zdCBzcGF3bnMgPSB0aGlzLnJvbS5ucGNzW2lkXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KGxvYy5pZCk7XG4gICAgICBpZiAoc3Bhd25zICYmIHNwYXducy5pbmNsdWRlcygweDA0NSkpIHJldHVybiB7fTsgLy8gaW4gbW90aGVyJ3MgaG91c2VcbiAgICAgIHJldHVybiB7Y2hlY2s6IFtcbiAgICAgICAge2NvbmRpdGlvbjogRXZlbnQuRFdBUkZfTU9USEVSLCBzbG90OiBTbG90KEV2ZW50LkRXQVJGX0NISUxEKX0sXG4gICAgICBdfTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmdsb2JhbERpYWxvZ3MpIHtcbiAgICAgIGFkZFJlcSh+ZC5jb25kaXRpb24pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmxvY2FsRGlhbG9ncy5nZXQobG9jLmlkKSB8fCBucGMubG9jYWxEaWFsb2dzLmdldCgtMSkgfHwgW10pIHtcbiAgICAgIC8vIElmIHRoZSBjaGVjayBjb25kaXRpb24gaXMgb3Bwb3NpdGUgdG8gdGhlIHNwYXduIGNvbmRpdGlvbiwgdGhlbiBza2lwLlxuICAgICAgLy8gVGhpcyBlbnN1cmVzIHdlIGRvbid0IGV4cGVjdCB0aGUgcXVlZW4gdG8gZ2l2ZSByZWNvdmVyIGluIHRoZSB0aHJvbmUgcm9vbS5cbiAgICAgIGlmIChzcGF3bkNvbmRpdGlvbnMuaW5jbHVkZXMofmQuY29uZGl0aW9uKSkgY29udGludWU7XG4gICAgICAvLyBBcHBseSB0aGUgRkxBR19NQVAuXG4gICAgICBjb25zdCBtYXBwZWQgPSBGTEFHX01BUC5nZXQoZC5jb25kaXRpb24pO1xuICAgICAgY29uc3QgcG9zaXRpdmUgPVxuICAgICAgICAgIG1hcHBlZCA/IFttYXBwZWRdIDpcbiAgICAgICAgICB0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGQuY29uZGl0aW9uKSA/IFtDb25kaXRpb24oZC5jb25kaXRpb24pXSA6XG4gICAgICAgICAgW107XG4gICAgICBjb25zdCBjb25kaXRpb24gPSBhbmQoLi4ucG9zaXRpdmUsIC4uLnJlcXVpcmVtZW50cyk7XG4gICAgICAvLyBJZiB0aGUgY29uZGl0aW9uIGlzIGEgbmVnYXRpdmUgdGhlbiBhbnkgZnV0dXJlIGNvbmRpdGlvbnMgbXVzdCBpbmNsdWRlXG4gICAgICAvLyBpdCBhcyBhIHBvc2l0aXZlIHJlcXVpcmVtZW50LlxuICAgICAgY29uc3QgbmVnYXRpdmUgPVxuICAgICAgICAgIEZMQUdfTUFQLmdldCh+ZC5jb25kaXRpb24pIHx8XG4gICAgICAgICAgKHRoaXMucmVsZXZhbnRGbGFncy5oYXMofmQuY29uZGl0aW9uKSA/IENvbmRpdGlvbih+ZC5jb25kaXRpb24pIDogbnVsbCk7XG4gICAgICBpZiAobmVnYXRpdmUgIT0gbnVsbCkgcmVxdWlyZW1lbnRzLnB1c2gobmVnYXRpdmUpO1xuICAgICAgY29uc3QgYWN0aW9uID0gZC5tZXNzYWdlLmFjdGlvbjtcbiAgICAgIGlmIChhY3Rpb24gPT09IDB4MDMgfHwgYWN0aW9uID09PSAweDBhKSB7XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90Lml0ZW0obnBjLmRhdGFbMF0pLCBjb25kaXRpb259KTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAweDExXG4gICAgICAgICAgICAgICAgIHx8ICh0aGlzLmZsYWdzLnplYnVTdHVkZW50R2l2ZXNJdGVtKCkgJiYgYWN0aW9uID09PSAweDA5KSkge1xuICAgICAgICAvLyBOT1RFOiAkMDkgaXMgemVidSBzdHVkZW50LCB3aGljaCB3ZSd2ZSBwYXRjaGVkIHRvIGdpdmUgdGhlIGl0ZW0uXG4gICAgICAgIC8vIFRPRE8gLSBjaGVjayB0aGUgcGF0Y2ggcmF0aGVyIHRoYW4gdGhlIGZsYWc/XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90Lml0ZW0obnBjLmRhdGFbMV0pLCBjb25kaXRpb259KTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAweDEwKSB7XG4gICAgICAgIC8vIE5PVEU6IFF1ZWVuIGNhbid0IGJlIHJldmVhbGVkIGFzIGFzaW5hIGluIHRoZSB0aHJvbmUgcm9vbS4gIEluIHBhcnRpY3VsYXIsXG4gICAgICAgIC8vIHRoaXMgZW5zdXJlcyB0aGF0IHRoZSBiYWNrIHJvb20gaXMgcmVhY2hhYmxlIGJlZm9yZSByZXF1aXJpbmcgdGhlIGRvbHBoaW5cbiAgICAgICAgLy8gdG8gYXBwZWFyLiAgVGhpcyBzaG91bGQgYmUgaGFuZGxlZCBieSB0aGUgYWJvdmUgY2hlY2sgZm9yIHRoZSBkaWFsb2cgYW5kXG4gICAgICAgIC8vIHNwYXduIGNvbmRpdGlvbnMgdG8gYmUgY29tcGF0aWJsZS5cbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QoTWFnaWMuUkVDT1ZFUiksIGNvbmRpdGlvbn0pO1xuICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IDB4MDggJiYgaWQgPT09IDB4MmQpIHtcbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX1NXQU4pLCBjb25kaXRpb259KTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBkLmZsYWdzKSB7XG4gICAgICAgIGNvbnN0IG1mbGFnID0gRkxBR19NQVAuZ2V0KGZsYWcpO1xuICAgICAgICBjb25zdCBwZmxhZyA9IG1mbGFnID8gbWZsYWcgOiB0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGZsYWcpID8gQ29uZGl0aW9uKGZsYWcpIDogbnVsbDtcbiAgICAgICAgaWYgKHBmbGFnKSByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdChwZmxhZyksIGNvbmRpdGlvbn0pO1xuICAgICAgfVxuICAgICAgLy8gSWYgdGhlIHNwYXduICpyZXF1aXJlcyogdGhpcyBjb25kaXRpb24gdGhlbiBkb24ndCBldmFsdWF0ZSBhbnkgbW9yZS4gIFRoaXNcbiAgICAgIC8vIGVuc3VyZXMgd2UgZG9uJ3QgZXhwZWN0IHRoZSBxdWVlbiB0byBnaXZlIHRoZSBmbHV0ZSBvZiBsaW1lIGluIHRoZSBiYWNrIHJvb20sXG4gICAgICAvLyBzaW5jZSBzaGUgd291bGRuJ3QgaGF2ZSBzcGF3bmVkIHRoZXJlIGludGltZSB0byBnaXZlIGl0LlxuICAgICAgaWYgKHBvc2l0aXZlLmxlbmd0aCAmJiBzcGF3bkNvbmRpdGlvbnMuaW5jbHVkZXMoZC5jb25kaXRpb24pKSBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGNhcGFiaWxpdGllcygpOiBDYXBhYmlsaXR5RGF0YVtdIHtcbiAgICBsZXQgYnJlYWtTdG9uZTogUmVxdWlyZW1lbnQgPSBJdGVtLlNXT1JEX09GX1dJTkQ7XG4gICAgbGV0IGJyZWFrSWNlOiBSZXF1aXJlbWVudCA9IEl0ZW0uU1dPUkRfT0ZfRklSRTtcbiAgICBsZXQgZm9ybUJyaWRnZTogUmVxdWlyZW1lbnQgPSBJdGVtLlNXT1JEX09GX1dBVEVSO1xuICAgIGxldCBicmVha0lyb246IFJlcXVpcmVtZW50ID0gSXRlbS5TV09SRF9PRl9USFVOREVSO1xuICAgIGlmICghdGhpcy5mbGFncy5vcmJzT3B0aW9uYWwoKSkge1xuICAgICAgLy8gQWRkIG9yYiByZXF1aXJlbWVudFxuICAgICAgYnJlYWtTdG9uZSA9IG9yKGFuZChJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uT1JCX09GX1dJTkQpLFxuICAgICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uVE9STkFET19CUkFDRUxFVCkpO1xuICAgICAgYnJlYWtJY2UgPSBvcihhbmQoSXRlbS5TV09SRF9PRl9GSVJFLCBJdGVtLk9SQl9PRl9GSVJFKSxcbiAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfRklSRSwgSXRlbS5GTEFNRV9CUkFDRUxFVCkpO1xuICAgICAgZm9ybUJyaWRnZSA9IG9yKGFuZChJdGVtLlNXT1JEX09GX1dBVEVSLCBJdGVtLk9SQl9PRl9XQVRFUiksXG4gICAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfV0FURVIsIEl0ZW0uQkxJWlpBUkRfQlJBQ0VMRVQpKTtcbiAgICAgIGJyZWFrSXJvbiA9IG9yKGFuZChJdGVtLlNXT1JEX09GX1RIVU5ERVIsIEl0ZW0uT1JCX09GX1RIVU5ERVIpLFxuICAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUiwgSXRlbS5TVE9STV9CUkFDRUxFVCkpO1xuICAgICAgaWYgKHRoaXMuZmxhZ3MuYXNzdW1lU3dvcmRDaGFyZ2VHbGl0Y2goKSkge1xuICAgICAgICBjb25zdCBsZXZlbDIgPSBvcihicmVha1N0b25lLCBicmVha0ljZSwgZm9ybUJyaWRnZSwgYnJlYWtJcm9uKTtcbiAgICAgICAgZnVuY3Rpb24gbmVlZChzd29yZDogcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXSk6IFJlcXVpcmVtZW50IHtcbiAgICAgICAgICBjb25zdCBjb25kaXRpb246IENvbmRpdGlvbiA9IHN3b3JkWzBdWzBdO1xuICAgICAgICAgIHJldHVybiBsZXZlbDIubWFwKGMgPT4gY1swXSA9PT0gY29uZGl0aW9uID8gYyA6IFtjb25kaXRpb24sIC4uLmNdKTtcbiAgICAgICAgfVxuICAgICAgICBicmVha1N0b25lID0gbmVlZChJdGVtLlNXT1JEX09GX1dJTkQpO1xuICAgICAgICBicmVha0ljZSA9IG5lZWQoSXRlbS5TV09SRF9PRl9GSVJFKTtcbiAgICAgICAgZm9ybUJyaWRnZSA9IG5lZWQoSXRlbS5TV09SRF9PRl9XQVRFUik7XG4gICAgICAgIGJyZWFrSXJvbiA9IG5lZWQoSXRlbS5TV09SRF9PRl9USFVOREVSKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdHlwZSBDYXBhYmlsaXR5TGlzdCA9IEFycmF5PFtyZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dLCAuLi5SZXF1aXJlbWVudFtdXT47XG4gICAgY29uc3QgY2FwYWJpbGl0aWVzOiBDYXBhYmlsaXR5TGlzdCA9IFtcbiAgICAgIFtFdmVudC5TVEFSVCwgYW5kKCldLFxuICAgICAgW0NhcGFiaWxpdHkuU1dPUkQsXG4gICAgICAgSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLlNXT1JEX09GX0ZJUkUsXG4gICAgICAgSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5TV09SRF9PRl9USFVOREVSXSxcbiAgICAgIFtDYXBhYmlsaXR5LkJSRUFLX1NUT05FLCBicmVha1N0b25lXSxcbiAgICAgIFtDYXBhYmlsaXR5LkJSRUFLX0lDRSwgYnJlYWtJY2VdLFxuICAgICAgW0NhcGFiaWxpdHkuRk9STV9CUklER0UsIGZvcm1CcmlkZ2VdLFxuICAgICAgW0NhcGFiaWxpdHkuQlJFQUtfSVJPTiwgYnJlYWtJcm9uXSxcbiAgICAgIFtDYXBhYmlsaXR5Lk1PTkVZLCBDYXBhYmlsaXR5LlNXT1JEXSwgLy8gVE9ETyAtIGNsZWFyIHRoaXMgdXBcbiAgICAgIFtDYXBhYmlsaXR5LkNMSU1CX1dBVEVSRkFMTCwgTWFnaWMuRkxJR0hUXSxcbiAgICAgIFtDYXBhYmlsaXR5LlNIT09USU5HX1NUQVRVRSwgTWFnaWMuQkFSUklFUl0sIC8vIFRPRE8gLSBhbGxvdyBzaGllbGQgcmluZz9cbiAgICAgIFtDYXBhYmlsaXR5LkNMSU1CX1NMT1BFLCBJdGVtLlJBQkJJVF9CT09UUywgTWFnaWMuRkxJR0hUXSxcbiAgICAgIFtJdGVtLlNUQVRVRV9PRl9HT0xELCBhbmQoSXRlbS5CUk9LRU5fU1RBVFVFLCBJdGVtLkdMT1dJTkdfTEFNUCldLFxuICAgICAgLy8gW0V2ZW50LkdFTkVSQUxTX0RFRkVBVEVELCBJdGVtLklWT1JZX1NUQVRVRV0sIC8vIFRPRE8gLSBmaXggdGhpc1xuICAgICAgW0V2ZW50Lk9QRU5FRF9TRUFMRURfQ0FWRSwgRXZlbnQuU1RBUlRFRF9XSU5ETUlMTF0sIC8vIFRPRE8gLSBtZXJnZSBjb21wbGV0ZWx5P1xuICAgIF07XG5cbiAgICBpZiAodGhpcy5mbGFncy5hc3N1bWVHaGV0dG9GbGlnaHQoKSkge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuQ0xJTUJfV0FURVJGQUxMLCBhbmQoRXZlbnQuUklERV9ET0xQSElOLCBJdGVtLlJBQkJJVF9CT09UUyldKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3MuZm9nTGFtcE5vdFJlcXVpcmVkKCkpIHtcbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtFdmVudC5SSURFX0RPTFBISU4sIEl0ZW0uU0hFTExfRkxVVEVdKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZmxhZ3MuZ3VhcmFudGVlQmFycmllcigpKSB7XG4gICAgICAvLyBUT0RPIC0gc3dvcmQgY2hhcmdlIGdsaXRjaCBtaWdodCBiZSBhIHByb2JsZW0gd2l0aCB0aGUgaGVhbGluZyBvcHRpb24uLi5cbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LlNIT09USU5HX1NUQVRVRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgQ2FwYWJpbGl0eS5CVVlfSEVBTElORyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIEl0ZW0uU0hJRUxEX1JJTkcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBNYWdpYy5SRUZSRVNIKV0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmZsYWdzLmxlYXRoZXJCb290c0dpdmVTcGVlZCgpKSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5DTElNQl9TTE9QRSwgSXRlbS5MRUFUSEVSX0JPT1RTXSk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBib3NzIG9mIHRoaXMucm9tLmJvc3Nlcykge1xuICAgICAgaWYgKGJvc3Mua2lsbCAhPSBudWxsICYmIGJvc3MuZHJvcCAhPSBudWxsKSB7XG4gICAgICAgIC8vIFNhdmVzIHJlZHVuZGFuY3kgb2YgcHV0dGluZyB0aGUgaXRlbSBpbiB0aGUgYWN0dWFsIHJvb20uXG4gICAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtJdGVtKGJvc3MuZHJvcCksIEJvc3MoYm9zcy5mbGFnKV0pO1xuICAgICAgfVxuICAgIH1cbiAgICBjYXBhYmlsaXRpZXMucHVzaChbSXRlbS5PUkJfT0ZfV0FURVIsIEJvc3MuUkFHRV0pO1xuXG4gICAgaWYgKHRoaXMuZmxhZ3MuZ3VhcmFudGVlR2FzTWFzaygpKSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5UUkFWRUxfU1dBTVAsIEl0ZW0uR0FTX01BU0tdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuVFJBVkVMX1NXQU1QLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICBvcihJdGVtLkdBU19NQVNLLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBJdGVtLk1FRElDQUxfSEVSQiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIE1hZ2ljLlJFRlJFU0gpKV0pO1xuICAgIH1cblxuICAgIC8vIGlmICh0aGlzLmZsYWdzLmFzc3VtZVN0YXR1ZUdsaXRjaCgpKSB7XG4gICAgLy8gICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5TVEFUVUVfR0xJVENILCBbW11dXSk7XG4gICAgLy8gfVxuXG4gICAgcmV0dXJuIGNhcGFiaWxpdGllcy5tYXAoKFtjYXBhYmlsaXR5LCAuLi5kZXBzXSkgPT4gKHtjYXBhYmlsaXR5LCBjb25kaXRpb246IG9yKC4uLmRlcHMpfSkpO1xuICB9XG5cbiAgd2FsbENhcGFiaWxpdHkodHlwZTogV2FsbFR5cGUpOiB7ZmxhZzogbnVtYmVyfSB7XG4gICAgcmV0dXJuIHtmbGFnOiBbQ2FwYWJpbGl0eS5CUkVBS19TVE9ORSwgQ2FwYWJpbGl0eS5CUkVBS19JQ0UsXG4gICAgICAgICAgICAgICAgICAgQ2FwYWJpbGl0eS5GT1JNX0JSSURHRSwgQ2FwYWJpbGl0eS5CUkVBS19JUk9OXVt0eXBlXVswXVswXX07XG4gIH1cbn1cblxudHlwZSBUaWxlQ2hlY2sgPSBDaGVjayAmIHt0aWxlOiBUaWxlSWR9O1xuXG4vLyBUT0RPIC0gbWF5YmUgcHVsbCB0cmlnZ2VycyBhbmQgbnBjcywgZXRjLCBiYWNrIHRvZ2V0aGVyP1xuLy8gICAgICAtIG9yIG1ha2UgdGhlIGxvY2F0aW9uIG92ZXJsYXkgYSBzaW5nbGUgZnVuY3Rpb24/XG4vLyAgICAgICAgLT4gbmVlZHMgY2xvc2VkLW92ZXIgc3RhdGUgdG8gc2hhcmUgaW5zdGFuY2VzLi4uXG5cbmludGVyZmFjZSBFeHRyYVJvdXRlIHtcbiAgdGlsZTogVGlsZUlkO1xuICBjb25kaXRpb24/OiBSZXF1aXJlbWVudDtcbn1cbmludGVyZmFjZSBFeHRyYUVkZ2Uge1xuICBmcm9tOiBUaWxlSWQ7XG4gIHRvOiBUaWxlSWQ7XG4gIGNvbmRpdGlvbj86IFJlcXVpcmVtZW50O1xufVxuXG5pbnRlcmZhY2UgVHJpZ2dlckRhdGEge1xuICB0ZXJyYWluPzogVGVycmFpbjtcbiAgY2hlY2s/OiBDaGVja1tdO1xuICAvLyBhbGxvd3Mgbm90IGFzc3VtaW5nIHRlbGVwb3J0IHNraXBcbiAgZXh0cmFMb2NhdGlvbnM/OiBMb2NhdGlvbltdO1xuICAvLyBhbGxvd3Mgbm90IGFzc3VtaW5nIHJhYmJpdCBza2lwXG4gIGR4PzogbnVtYmVyW107XG59XG5cbmludGVyZmFjZSBOcGNEYXRhIHtcbiAgaGl0Ym94PzogSGl0Ym94O1xuICB0ZXJyYWluPzogVGVycmFpbjtcbiAgY2hlY2s/OiBDaGVja1tdO1xufVxuXG5pbnRlcmZhY2UgSGl0Ym94IHtcbiAgeDA6IG51bWJlcjtcbiAgeTA6IG51bWJlcjtcbiAgeDE6IG51bWJlcjtcbiAgeTE6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIENhcGFiaWxpdHlEYXRhIHtcbiAgY29uZGl0aW9uPzogUmVxdWlyZW1lbnQ7XG4gIGNhcGFiaWxpdHk6IHJlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV07XG59XG5cbi8vIFN0YXRpYyBtYXAgb2YgdGVycmFpbnMuXG5jb25zdCBURVJSQUlOUzogQXJyYXk8VGVycmFpbiB8IHVuZGVmaW5lZD4gPSAoKCkgPT4ge1xuICBjb25zdCBvdXQgPSBbXTtcbiAgZm9yIChsZXQgZWZmZWN0cyA9IDA7IGVmZmVjdHMgPCAxMjg7IGVmZmVjdHMrKykge1xuICAgIG91dFtlZmZlY3RzXSA9IHRlcnJhaW4oZWZmZWN0cyk7XG4gIH1cbiAgLy8gY29uc29sZS5sb2coJ1RFUlJBSU5TJywgb3V0KTtcbiAgcmV0dXJuIG91dDtcblxuICAvKipcbiAgICogQHBhcmFtIGVmZmVjdHMgVGhlICQyNiBiaXRzIG9mIHRpbGVlZmZlY3RzLCBwbHVzICQwOCBmb3Igc3dhbXAsICQxMCBmb3IgZG9scGhpbixcbiAgICogJDAxIGZvciBzaG9vdGluZyBzdGF0dWVzLCAkNDAgZm9yIHNob3J0IHNsb3BlXG4gICAqIEByZXR1cm4gdW5kZWZpbmVkIGlmIHRoZSB0ZXJyYWluIGlzIGltcGFzc2FibGUuXG4gICAqL1xuICBmdW5jdGlvbiB0ZXJyYWluKGVmZmVjdHM6IG51bWJlcik6IFRlcnJhaW4gfCB1bmRlZmluZWQge1xuICAgIGlmIChlZmZlY3RzICYgMHgwNCkgcmV0dXJuIHVuZGVmaW5lZDsgLy8gaW1wYXNzaWJsZVxuICAgIGNvbnN0IHRlcnJhaW46IFRlcnJhaW4gPSB7fTtcbiAgICBpZiAoKGVmZmVjdHMgJiAweDEyKSA9PT0gMHgxMikgeyAvLyBkb2xwaGluIG9yIGZseVxuICAgICAgaWYgKGVmZmVjdHMgJiAweDIwKSB0ZXJyYWluLmV4aXQgPSBDYXBhYmlsaXR5LkNMSU1CX1dBVEVSRkFMTDtcbiAgICAgIHRlcnJhaW4uZW50ZXIgPSBvcihFdmVudC5SSURFX0RPTFBISU4sIE1hZ2ljLkZMSUdIVCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChlZmZlY3RzICYgMHg0MCkgeyAvLyBzaG9ydCBzbG9wZVxuICAgICAgICB0ZXJyYWluLmV4aXQgPSBDYXBhYmlsaXR5LkNMSU1CX1NMT1BFO1xuICAgICAgfSBlbHNlIGlmIChlZmZlY3RzICYgMHgyMCkgeyAvLyBzbG9wZVxuICAgICAgICB0ZXJyYWluLmV4aXQgPSBNYWdpYy5GTElHSFQ7XG4gICAgICB9XG4gICAgICBpZiAoZWZmZWN0cyAmIDB4MDIpIHRlcnJhaW4uZW50ZXIgPSBNYWdpYy5GTElHSFQ7IC8vIG5vLXdhbGtcbiAgICB9XG4gICAgaWYgKGVmZmVjdHMgJiAweDA4KSB7IC8vIHN3YW1wXG4gICAgICB0ZXJyYWluLmVudGVyID0gKHRlcnJhaW4uZW50ZXIgfHwgW1tdXSkubWFwKGNzID0+IENhcGFiaWxpdHkuVFJBVkVMX1NXQU1QWzBdLmNvbmNhdChjcykpO1xuICAgIH1cbiAgICBpZiAoZWZmZWN0cyAmIDB4MDEpIHsgLy8gc2hvb3Rpbmcgc3RhdHVlc1xuICAgICAgdGVycmFpbi5lbnRlciA9ICh0ZXJyYWluLmVudGVyIHx8IFtbXV0pLm1hcChjcyA9PiBDYXBhYmlsaXR5LlNIT09USU5HX1NUQVRVRVswXS5jb25jYXQoY3MpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRlcnJhaW47XG4gIH1cbn0pKCk7XG5cbi8vIFRPRE8gLSBmaWd1cmUgb3V0IHdoYXQgdGhpcyBsb29rcyBsaWtlLi4uP1xuLy8gIC0gbWF5YmUgd2UganVzdCB3YW50IHRvIG1ha2UgYSBwc2V1ZG8gREVGRUFURURfSU5TRUNUIGV2ZW50LCBidXQgdGhpcyB3b3VsZCBuZWVkIHRvIGJlXG4vLyAgICBzZXBhcmF0ZSBmcm9tIDEwMSwgc2luY2UgdGhhdCdzIGF0dGFjaGVkIHRvIHRoZSBpdGVtZ2V0LCB3aGljaCB3aWxsIG1vdmUgd2l0aCB0aGUgc2xvdCFcbi8vICAtIHByb2JhYmx5IHdhbnQgYSBmbGFnIGZvciBlYWNoIGJvc3MgZGVmZWF0ZWQuLi4/XG4vLyAgICBjb3VsZCB1c2UgYm9zc2tpbGwgSUQgZm9yIGl0P1xuLy8gICAgLSB0aGVuIG1ha2UgdGhlIGRyb3AgYSBzaW1wbGUgZGVyaXZhdGl2ZSBmcm9tIHRoYXQuLi5cbi8vICAgIC0gdXBzaG90IC0gbm8gbG9uZ2VyIG5lZWQgdG8gbWl4IGl0IGludG8gbnBjKCkgb3IgdHJpZ2dlcigpIG92ZXJsYXksIGluc3RlYWQgbW92ZSBpdFxuLy8gICAgICB0byBjYXBhYmlsaXR5IG92ZXJsYXkuXG4vLyBmdW5jdGlvbiBzbG90Rm9yPFQ+KGl0ZW06IFQpOiBUIHsgcmV0dXJuIGl0ZW07IH1cbiJdfQ==