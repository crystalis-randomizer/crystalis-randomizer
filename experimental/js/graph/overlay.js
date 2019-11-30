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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9ncmFwaC9vdmVybGF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFTLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFDN0QsSUFBSSxFQUFxQixHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQUUsUUFBUSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBSy9DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFhbkMsTUFBTSxjQUFjLEdBQUc7SUFDckIsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBRUwsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBR0wsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSztJQUUxQixLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSztJQUN0RCxLQUFLO0lBQ0wsS0FBSztJQUNM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S0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzdGO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztBQUNILENBQUMsQ0FBQyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0Jvc3MsIENhcGFiaWxpdHksIENoZWNrLCBDb25kaXRpb24sIEV2ZW50LCBJdGVtLCBNYWdpYywgTXV0YWJsZVJlcXVpcmVtZW50LFxuICAgICAgICBSZXF1aXJlbWVudCwgU2xvdCwgVGVycmFpbiwgV2FsbFR5cGUsIGFuZCwgbWVldCwgb3J9IGZyb20gJy4vY29uZGl0aW9uLmpzJztcbmltcG9ydCB7VGlsZUlkLCBTY3JlZW5JZH0gZnJvbSAnLi9nZW9tZXRyeS5qcyc7XG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4uL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge0Jvc3MgYXMgUm9tQm9zc30gZnJvbSAnLi4vcm9tL2Jvc3Nlcy5qcyc7XG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICcuLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtTaG9wVHlwZX0gZnJvbSAnLi4vcm9tL3Nob3AuanMnO1xuaW1wb3J0IHtoZXh9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcblxuLy8gQWRkaXRpb25hbCBpbmZvcm1hdGlvbiBuZWVkZWQgdG8gaW50ZXJwcmV0IHRoZSB3b3JsZCBncmFwaCBkYXRhLlxuLy8gVGhpcyBnZXRzIGludG8gbW9yZSBzcGVjaWZpY3MgYW5kIGhhcmRjb2RpbmcuXG5cbi8vIFRPRE8gLSBtYXliZSBjb25zaWRlciBoYXZpbmcgYSBzZXQgb2YgQVNTVU1FRCBhbmQgYSBzZXQgb2YgSUdOT1JFRCBmbGFncz9cbi8vICAgICAgLSBlLmcuIGFsd2F5cyBhc3N1bWUgMDBmIGlzIEZBTFNFIHJhdGhlciB0aGFuIFRSVUUsIHRvIGF2b2lkIGZyZWUgd2luZG1pbGwga2V5XG5cblxuLy8gVE9ETyAtIHByaXNvbiBrZXkgbWlzc2luZyBmcm9tIHBhcmFseXNpcyBkZXBzIChvciByYXRoZXIgYSBub24tZmxpZ2h0IHZlcnNpb24pIVxuXG5cblxuY29uc3QgUkVMRVZBTlRfRkxBR1MgPSBbXG4gIDB4MDBhLCAvLyB1c2VkIHdpbmRtaWxsIGtleVxuICAweDAwYiwgLy8gdGFsa2VkIHRvIGxlYWYgZWxkZXJcbiAgMHgwMTMsIC8vIGtpbGxlZCBzYWJlcmEgMVxuICAweDAxOCwgLy8gZW50ZXJlZCB1bmRlcmdyb3VuZCBjaGFubmVsXG4gIDB4MDFiLCAvLyBtZXNpYSByZWNvcmRpbmcgcGxheWVkXG4gIDB4MDFlLCAvLyBxdWVlbiByZXZlYWxlZFxuICAweDAyMSwgLy8gcmV0dXJuZWQgZm9nIGxhbXBcbiAgLy8gMHgwMjQsIC8vIGdlbmVyYWxzIGRlZmVhdGVkIChnb3QgaXZvcnkgc3RhdHVlKVxuICAweDAyNSwgLy8gaGVhbGVkIGRvbHBoaW5cbiAgMHgwMjYsIC8vIGVudGVyZWQgc2h5cm9uIChmb3IgZ29hIGd1YXJkcylcbiAgMHgwMjcsIC8vIHNoeXJvbiBtYXNzYWNyZVxuICAvLyAweDM1LCAvLyBjdXJlZCBha2FoYW5hXG4gIDB4MDM4LCAvLyBsZWFmIGFiZHVjdGlvblxuICAweDAzYSwgLy8gdGFsa2VkIHRvIHplYnUgaW4gY2F2ZSAoYWRkZWQgYXMgcmVxIGZvciBhYmR1Y3Rpb24pXG4gIDB4MDNiLCAvLyB0YWxrZWQgdG8gemVidSBpbiBzaHlyb24gKGFkZGVkIGFzIHJlcSBmb3IgbWFzc2FjcmUpXG4gIDB4MDQ1LCAvLyByZXNjdWVkIGNoaWxkXG4gIDB4MDUyLCAvLyB0YWxrZWQgdG8gZHdhcmYgbW90aGVyXG4gIDB4MDUzLCAvLyBjaGlsZCBmb2xsb3dpbmdcbiAgMHgwNjEsIC8vIHRhbGtlZCB0byBzdG9tIGluIHN3YW4gaHV0XG4gIDB4MDY3LCAvLyBraWxsZWQgbWFkbyAxXG4gIC8vIDB4MDZjLCAvLyBkZWZlYXRlZCBkcmF5Z29uIDFcbiAgMHgwNzIsIC8vIGtlbnN1IGZvdW5kIGluIHRhdmVyblxuICAweDA4YiwgLy8gZ290IHNoZWxsIGZsdXRlXG4gIDB4MDliLCAvLyBhYmxlIHRvIHJpZGUgZG9scGhpblxuICAweDBhNSwgLy8gdGFsa2VkIHRvIHplYnUgc3R1ZGVudFxuICAweDBhOSwgLy8gdGFsa2VkIHRvIGxlYWYgcmFiYml0XG4gIDB4MTAwLCAvLyBraWxsZWQgdmFtcGlyZSAxXG4gIDB4MTAxLCAvLyBraWxsZWQgaW5zZWN0XG4gIDB4MTAyLCAvLyBraWxsZWQga2VsYmVzcXVlIDFcbiAgMHgxMDMsIC8vIHJhZ2VcbiAgMHgxMDUsIC8vIGtpbGxlZCBrZWxiZXNxdWUgMlxuICAweDEwNiwgLy8ga2lsbGVkIHNhYmVyYSAyXG4gIDB4MTA3LCAvLyBraWxsZWQgbWFkbyAyXG4gIDB4MTA4LCAvLyBraWxsZWQga2FybWluZVxuICAweDEwYiwgLy8ga2lsbGVkIGRyYXlnb24gMVxuICAweDEwYywgLy8ga2lsbGVkIHZhbXBpcmUgMlxuXG4gIC8vIHN3b3JkcyAobWF5IGJlIG5lZWRlZCBmb3IgcmFnZSwgU29UIGZvciBtYXNzYWNyZSlcbiAgMHgyMDAsIDB4MjAxLCAweDIwMiwgMHgyMDMsXG4gIC8vIGJhbGxzIGFuZCBicmFjZWxldHMgbWF5IGJlIG5lZWRlZCBmb3IgdGVsZXBvcnRcbiAgMHgyMDUsIDB4MjA2LCAweDIwNywgMHgyMDgsIDB4MjA5LCAweDIwYSwgMHgyMGIsIDB4MjBjLFxuICAweDIzNSwgLy8gZm9nIGxhbXAgKGZvciBmaXNoZXJtYW4gc3Bhd24gbWF5YmU/KVxuICAweDIzNiwgLy8gc2hlbGwgZmx1dGUgKGZvciBmaXNoZXJtYW4gc3Bhd24pXG4gIDB4MjQzLCAvLyB0ZWxlcGF0aHkgKGZvciByYWJiaXQsIG9haywgZGVvKVxuICAweDI0NCwgLy8gdGVsZXBvcnQgKGZvciBtdCBzYWJyZSB0cmlnZ2VyKVxuICAweDI4MywgLy8gY2FsbWVkIHNlYSAoZm9yIGJhcnJpZXIpXG4gIDB4MjhkLCAvLyBraWxsZWQgZHJheWdvbiAyICh3YWxsIGRlc3Ryb3llZClcbiAgMHgyZWUsIC8vIHN0YXJ0ZWQgd2luZG1pbGwgKGZvciByZWZyZXNoKVxuXG4gIC8vIE5PVEU6IHRoZXNlIGFyZSBtb3ZlZCBiZWNhdXNlIG9mIHpvbWJpZSB3YXJwIVxuICAweDJmNiwgLy8gd2FycDpvYWsgKGZvciB0ZWxlcGF0aHkpXG4gIC8vIDB4MmZhLCAvLyB3YXJwOmpvZWwgKGZvciBldmlsIHNwaXJpdCBpc2xhbmQpXG4gIDB4MmZkLCAvLyB3YXJwOnNoeXJvbiAoZm9yIHRlbGVwYXRoeSlcblxuICAvLyBNYWdpYy5DSEFOR0VbMF1bMF0sXG4gIC8vIE1hZ2ljLlRFTEVQQVRIWVswXVswXSxcbl07XG5cbi8vIFRPRE8gLSB0aGlzIGlzIG5vdCBwZXJ2YXNpdmUgZW5vdWdoISEhXG4vLyAgLSBuZWVkIGEgd2F5IHRvIHB1dCBpdCBldmVyeXdoZXJlXG4vLyAgICAtPiBtYXliZSBpbiBNdXRhYmxlUmVxdWlyZW1lbnRzP1xuY29uc3QgRkxBR19NQVA6IE1hcDxudW1iZXIsIHJlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV0+ID0gbmV3IE1hcChbXG4gIFsweDAwYSwgRXZlbnQuU1RBUlRFRF9XSU5ETUlMTF0sIC8vIHRoaXMgaXMgcmVmJ2Qgb3V0c2lkZSB0aGlzIGZpbGUhXG4gIC8vWzB4MDBlLCBNYWdpYy5URUxFUEFUSFldLFxuICAvL1sweDAzZiwgTWFnaWMuVEVMRVBPUlRdLFxuICAvLyBRdWVlbiB3aWxsIGdpdmUgZmx1dGUgb2YgbGltZSB3L28gcGFyYWx5c2lzIGluIHRoaXMgY2FzZS5cbiAgWzB4MDE3LCBJdGVtLlNXT1JEX09GX1dBVEVSXSxcbiAgWzB4MDI4LCBNYWdpYy5DSEFOR0VdLFxuICBbMHgwMjksIE1hZ2ljLkNIQU5HRV0sXG4gIFsweDAyYSwgTWFnaWMuQ0hBTkdFXSxcbiAgWzB4MDJiLCBNYWdpYy5DSEFOR0VdLFxuICBbMHgwNmMsIEJvc3MuRFJBWUdPTjFdLFxuICBbMHgwOGIsIEl0ZW0uU0hFTExfRkxVVEVdLFxuICBbMHgwZWUsIEV2ZW50LlJJREVfRE9MUEhJTl0sIC8vIE5PVEU6IGN1c3RvbSBmbGFnXG5dKTtcblxuLy8gTWFwcyB0cmlnZ2VyIGFjdGlvbnMgdG8gdGhlIHNsb3QgdGhleSBncmFudC5cbmNvbnN0IFRSSUdHRVJfQUNUSU9OX0lURU1TOiB7W2FjdGlvbjogbnVtYmVyXTogU2xvdH0gPSB7XG4gIDB4MDg6IFNsb3QoTWFnaWMuUEFSQUxZU0lTKSxcbiAgMHgwYjogU2xvdChNYWdpYy5CQVJSSUVSKSxcbiAgMHgwZjogU2xvdChNYWdpYy5SRUZSRVNIKSxcbiAgMHgxODogU2xvdChNYWdpYy5URUxFUEFUSFkpLFxufTtcblxuY29uc3QgU1dPUkRTID0gW0l0ZW0uU1dPUkRfT0ZfV0lORCwgSXRlbS5TV09SRF9PRl9GSVJFLFxuICAgICAgICAgICAgICAgIEl0ZW0uU1dPUkRfT0ZfV0FURVIsIEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUl0gYXMgY29uc3Q7XG5jb25zdCBTV09SRF9QT1dFUlMgPSBbXG4gIFtJdGVtLk9SQl9PRl9XSU5ELCBJdGVtLlRPUk5BRE9fQlJBQ0VMRVRdLFxuICBbSXRlbS5PUkJfT0ZfRklSRSwgSXRlbS5GTEFNRV9CUkFDRUxFVF0sXG4gIFtJdGVtLk9SQl9PRl9XQVRFUiwgSXRlbS5CTElaWkFSRF9CUkFDRUxFVF0sXG4gIFtJdGVtLk9SQl9PRl9USFVOREVSLCBJdGVtLlNUT1JNX0JSQUNFTEVUXSxcbl0gYXMgY29uc3Q7XG5cbmZ1bmN0aW9uIHN3b3JkUmVxdWlyZW1lbnQoc3dvcmQ6IG51bWJlciwgbGV2ZWw6IG51bWJlcik6IFJlcXVpcmVtZW50IHtcbiAgbGV0IHI7XG4gIGlmIChsZXZlbCA9PT0gMSkgcj0gU1dPUkRTW3N3b3JkXTtcbiAgZWxzZSBpZiAobGV2ZWwgPT09IDMpIHI9IGFuZChTV09SRFNbc3dvcmRdLCAuLi5TV09SRF9QT1dFUlNbc3dvcmRdKTtcbiAgZWxzZSByPSBvciguLi5TV09SRF9QT1dFUlNbc3dvcmRdLm1hcChwID0+IGFuZChTV09SRFNbc3dvcmRdLCBwKSkpO1xuICBpZiAoQXJyYXkuaXNBcnJheShyWzBdWzBdKSkgdGhyb3cgbmV3IEVycm9yKCk7XG4gIHJldHVybiByO1xufVxuXG5leHBvcnQgY2xhc3MgT3ZlcmxheSB7XG5cbiAgcHJpdmF0ZSByZWFkb25seSByZWxldmFudEZsYWdzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIC8vIG5wYyBpZCAtPiB3YW50ZWQgaXRlbVxuICBwcml2YXRlIHJlYWRvbmx5IHRyYWRlSW5zID0gbmV3IE1hcDxudW1iZXIsIHJlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV0+KCk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzaG9vdGluZ1N0YXR1ZXMgPSBuZXcgU2V0PFNjcmVlbklkPigpO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tLFxuICAgICAgICAgICAgICByZWFkb25seSBmbGFnczogRmxhZ1NldCxcbiAgICAgICAgICAgICAgcHJpdmF0ZSByZWFkb25seSB0cmFja2VyOiBib29sZWFuKSB7XG4gICAgLy8gVE9ETyAtIGFkanVzdCBiYXNlZCBvbiBmbGFnc2V0P1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBSRUxFVkFOVF9GTEFHUykge1xuICAgICAgdGhpcy5yZWxldmFudEZsYWdzLmFkZChmbGFnKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHJvbS5pdGVtcykge1xuICAgICAgaWYgKCFpdGVtLnRyYWRlcy5sZW5ndGgpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgY29uZCA9IGl0ZW0uaWQgPT09IDB4MWQgPyBDYXBhYmlsaXR5LkJVWV9IRUFMSU5HIDogSXRlbShpdGVtLmlkKTtcbiAgICAgIGZvciAoY29uc3QgdHJhZGUgb2YgaXRlbS50cmFkZXMpIHtcbiAgICAgICAgdGhpcy50cmFkZUlucy5zZXQoaXRlbS5pdGVtVXNlRGF0YVt0cmFkZV0ud2FudCAmIDB4ZmYsIGNvbmQpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgICAgaWYgKHNwYXduLmlzTW9uc3RlcigpICYmIHNwYXduLmlkID09PSAweDNmKSB7IC8vIHNob290aW5nIHN0YXR1ZXNcbiAgICAgICAgICB0aGlzLnNob290aW5nU3RhdHVlcy5hZGQoU2NyZWVuSWQuZnJvbShsb2MsIHNwYXduKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gICAweDFkLCAvLyBtZWRpY2FsIGhlcmJcbiAgICAvLyAgIDB4MjUsIC8vIHN0YXR1ZSBvZiBvbnl4XG4gICAgLy8gICAweDM1LCAvLyBmb2cgbGFtcFxuICAgIC8vICAgMHgzYiwgLy8gbG92ZSBwZW5kYW50XG4gICAgLy8gICAweDNjLCAvLyBraXJpc2EgcGxhbnRcbiAgICAvLyAgIDB4M2QsIC8vIGl2b3J5IHN0YXR1ZVxuICAgIC8vIF0ubWFwKGkgPT4gdGhpcy5yb20uaXRlbXNbaV0pO1xuICB9XG5cbiAgLyoqIEBwYXJhbSBpZCBPYmplY3QgSUQgb2YgdGhlIGJvc3MuICovXG4gIGJvc3NSZXF1aXJlbWVudHMoYm9zczogUm9tQm9zcyk6IFJlcXVpcmVtZW50IHtcbiAgICAvLyBUT0RPIC0gaGFuZGxlIGJvc3Mgc2h1ZmZsZSBzb21laG93P1xuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMucmFnZSkge1xuICAgICAgaWYgKHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzLnJhbmRvbWl6ZVRyYWRlcygpKSByZXR1cm4gQ2FwYWJpbGl0eS5TV09SRDtcbiAgICAgIC8vIHJldHVybiBJdGVtLlNXT1JEX09GX1dBVEVSO1xuICAgICAgcmV0dXJuIENvbmRpdGlvbih0aGlzLnJvbS5ucGNzWzB4YzNdLmxvY2FsRGlhbG9ncy5nZXQoLTEpIVswXS5jb25kaXRpb24pO1xuICAgIH1cbiAgICBjb25zdCBpZCA9IGJvc3Mub2JqZWN0O1xuICAgIGNvbnN0IG91dCA9IG5ldyBNdXRhYmxlUmVxdWlyZW1lbnQoKTtcbiAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3Muc2h1ZmZsZUJvc3NFbGVtZW50cygpKSB7XG4gICAgICBvdXQuYWRkQWxsKENhcGFiaWxpdHkuU1dPUkQpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5mbGFncy5ndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkpIHtcbiAgICAgIGNvbnN0IGxldmVsID0gdGhpcy5mbGFncy5ndWFyYW50ZWVTd29yZE1hZ2ljKCkgPyBib3NzLnN3b3JkTGV2ZWwgOiAxO1xuICAgICAgY29uc3Qgb2JqID0gdGhpcy5yb20ub2JqZWN0c1tpZF07XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICBpZiAob2JqLmlzVnVsbmVyYWJsZShpKSkgb3V0LmFkZEFsbChzd29yZFJlcXVpcmVtZW50KGksIGxldmVsKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dC5hZGRBbGwoQ2FwYWJpbGl0eS5TV09SRCk7XG4gICAgfVxuICAgIGNvbnN0IGV4dHJhOiBDYXBhYmlsaXR5W10gPSBbXTtcbiAgICBpZiAodGhpcy5mbGFncy5ndWFyYW50ZWVSZWZyZXNoKCkpIHtcbiAgICAgIC8vIFRPRE8gLSBtYWtlIHRoaXMgXCJndWFyYW50ZWUgZGVmZW5zaXZlIG1hZ2ljXCIgYW5kIGFsbG93IHJlZnJlc2ggT1IgYmFycmllcj9cbiAgICAgIGV4dHJhLnB1c2goTWFnaWMuUkVGUkVTSCk7XG4gICAgfVxuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuaW5zZWN0KSB7IC8vIGluc2VjdFxuICAgICAgZXh0cmEucHVzaChJdGVtLklOU0VDVF9GTFVURSwgSXRlbS5HQVNfTUFTSyk7XG4gICAgfVxuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuZHJheWdvbjIpIHtcbiAgICAgIGV4dHJhLnB1c2goSXRlbS5CT1dfT0ZfVFJVVEgpO1xuICAgICAgaWYgKHRoaXMuZmxhZ3Muc3RvcnlNb2RlKCkpIHtcbiAgICAgICAgZXh0cmEucHVzaChcbiAgICAgICAgICBCb3NzLktFTEJFU1FVRTEsXG4gICAgICAgICAgQm9zcy5LRUxCRVNRVUUyLFxuICAgICAgICAgIEJvc3MuU0FCRVJBMSxcbiAgICAgICAgICBCb3NzLlNBQkVSQTIsXG4gICAgICAgICAgQm9zcy5NQURPMSxcbiAgICAgICAgICBCb3NzLk1BRE8yLFxuICAgICAgICAgIEJvc3MuS0FSTUlORSxcbiAgICAgICAgICBCb3NzLkRSQVlHT04xLFxuICAgICAgICAgIEl0ZW0uU1dPUkRfT0ZfV0lORCxcbiAgICAgICAgICBJdGVtLlNXT1JEX09GX0ZJUkUsXG4gICAgICAgICAgSXRlbS5TV09SRF9PRl9XQVRFUixcbiAgICAgICAgICBJdGVtLlNXT1JEX09GX1RIVU5ERVIpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZXh0cmEubGVuZ3RoKSB7XG4gICAgICBvdXQucmVzdHJpY3QoYW5kKC4uLmV4dHJhKSk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuZnJlZXplKCk7XG4gIH1cblxuICBsb2NhdGlvbnMoKTogVGlsZUNoZWNrW10ge1xuICAgIGNvbnN0IGxvY2F0aW9uczogVGlsZUNoZWNrW10gPSBbXTtcbiAgICAvLyBUT0RPIC0gcHVsbCB0aGUgbG9jYXRpb24gb3V0IG9mIGl0ZW1Vc2VEYXRhWzBdIGZvciB0aGVzZSBpdGVtc1xuICAgIGxvY2F0aW9ucy5wdXNoKHtcbiAgICAgIHRpbGU6IFRpbGVJZCgweDBmMDA4OCksXG4gICAgICBzbG90OiBTbG90KEV2ZW50LlNUQVJURURfV0lORE1JTEwpLFxuICAgICAgY29uZGl0aW9uOiBJdGVtLldJTkRNSUxMX0tFWSxcbiAgICB9LCB7XG4gICAgICB0aWxlOiBUaWxlSWQoMHhlNDAwODgpLFxuICAgICAgc2xvdDogU2xvdChFdmVudC5PUEVORURfSk9FTF9TSEVEKSxcbiAgICAgIGNvbmRpdGlvbjogSXRlbS5FWUVfR0xBU1NFUyxcbiAgICB9KTtcbiAgICBmb3IgKGNvbnN0IHNob3Agb2YgdGhpcy5yb20uc2hvcHMpIHtcbiAgICAgIC8vIGxlYWYgYW5kIHNoeXJvbiBtYXkgbm90IGFsd2F5cyBiZSBhY2Nlc3NpYmxlLCBzbyBkb24ndCByZWx5IG9uIHRoZW0uXG4gICAgICBpZiAoc2hvcC5sb2NhdGlvbiA9PT0gMHhjMyB8fCBzaG9wLmxvY2F0aW9uID09PSAweGY2KSBjb250aW51ZTtcbiAgICAgIGlmICghc2hvcC51c2VkKSBjb250aW51ZTtcbiAgICAgIGlmIChzaG9wLnR5cGUgIT09IFNob3BUeXBlLlRPT0wpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgY2hlY2sgPSB7XG4gICAgICAgIHRpbGU6IFRpbGVJZChzaG9wLmxvY2F0aW9uIDw8IDE2IHwgMHg4OCksXG4gICAgICAgIGNvbmRpdGlvbjogQ2FwYWJpbGl0eS5NT05FWSxcbiAgICAgIH07XG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygc2hvcC5jb250ZW50cykge1xuICAgICAgICBpZiAoaXRlbSA9PT0gKEl0ZW0uTUVESUNBTF9IRVJCWzBdWzBdICYgMHhmZikpIHtcbiAgICAgICAgICBsb2NhdGlvbnMucHVzaCh7Li4uY2hlY2ssIHNsb3Q6IFNsb3QoQ2FwYWJpbGl0eS5CVVlfSEVBTElORyl9KTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSAoSXRlbS5XQVJQX0JPT1RTWzBdWzBdICYgMHhmZikpIHtcbiAgICAgICAgICBsb2NhdGlvbnMucHVzaCh7Li4uY2hlY2ssIHNsb3Q6IFNsb3QoQ2FwYWJpbGl0eS5CVVlfV0FSUCl9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbG9jYXRpb25zO1xuICB9XG5cbiAgLyoqIFJldHVybnMgdW5kZWZpbmVkIGlmIGltcGFzc2FibGUuICovXG4gIG1ha2VUZXJyYWluKGVmZmVjdHM6IG51bWJlciwgdGlsZTogVGlsZUlkKTogVGVycmFpbiB8IHVuZGVmaW5lZCB7XG4gICAgLy8gQ2hlY2sgZm9yIGRvbHBoaW4gb3Igc3dhbXAuICBDdXJyZW50bHkgZG9uJ3Qgc3VwcG9ydCBzaHVmZmxpbmcgdGhlc2UuXG4gICAgY29uc3QgbG9jID0gdGlsZSA+Pj4gMTY7XG4gICAgZWZmZWN0cyAmPSAweDI2O1xuICAgIGlmIChsb2MgPT09IDB4MWEpIGVmZmVjdHMgfD0gMHgwODtcbiAgICBpZiAobG9jID09PSAweDYwIHx8IGxvYyA9PT0gMHg2OCkgZWZmZWN0cyB8PSAweDEwO1xuICAgIC8vIE5PVEU6IG9ubHkgdGhlIHRvcCBoYWxmLXNjcmVlbiBpbiB1bmRlcmdyb3VuZCBjaGFubmVsIGlzIGRvbHBoaW5hYmxlXG4gICAgaWYgKGxvYyA9PT0gMHg2NCAmJiAoKHRpbGUgJiAweGYwZjApIDwgMHg5MCkpIGVmZmVjdHMgfD0gMHgxMDtcbiAgICBpZiAodGhpcy5zaG9vdGluZ1N0YXR1ZXMuaGFzKFNjcmVlbklkLmZyb21UaWxlKHRpbGUpKSkgZWZmZWN0cyB8PSAweDAxO1xuICAgIGlmIChlZmZlY3RzICYgMHgyMCkgeyAvLyBzbG9wZVxuICAgICAgLy8gRGV0ZXJtaW5lIGxlbmd0aCBvZiBzbG9wZTogc2hvcnQgc2xvcGVzIGFyZSBjbGltYmFibGUuXG4gICAgICAvLyA2LTggYXJlIGJvdGggZG9hYmxlIHdpdGggYm9vdHNcbiAgICAgIC8vIDAtNSBpcyBkb2FibGUgd2l0aCBubyBib290c1xuICAgICAgLy8gOSBpcyBkb2FibGUgd2l0aCByYWJiaXQgYm9vdHMgb25seSAobm90IGF3YXJlIG9mIGFueSBvZiB0aGVzZS4uLilcbiAgICAgIC8vIDEwIGlzIHJpZ2h0IG91dFxuICAgICAgY29uc3QgZ2V0RWZmZWN0cyA9ICh0aWxlOiBUaWxlSWQpOiBudW1iZXIgPT4ge1xuICAgICAgICBjb25zdCBsID0gdGhpcy5yb20ubG9jYXRpb25zW3RpbGUgPj4+IDE2XTtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gbC5zY3JlZW5zWyh0aWxlICYgMHhmMDAwKSA+Pj4gMTJdWyh0aWxlICYgMHhmMDApID4+PiA4XTtcbiAgICAgICAgcmV0dXJuIHRoaXMucm9tLnRpbGVFZmZlY3RzW2wudGlsZUVmZmVjdHMgLSAweGIzXVxuICAgICAgICAgICAgLmVmZmVjdHNbdGhpcy5yb20uc2NyZWVuc1tzY3JlZW5dLnRpbGVzW3RpbGUgJiAweGZmXV07XG4gICAgICB9O1xuICAgICAgbGV0IGJvdHRvbSA9IHRpbGU7XG4gICAgICBsZXQgaGVpZ2h0ID0gLTE7XG4gICAgICB3aGlsZSAoZ2V0RWZmZWN0cyhib3R0b20pICYgMHgyMCkge1xuICAgICAgICBib3R0b20gPSBUaWxlSWQuYWRkKGJvdHRvbSwgMSwgMCk7XG4gICAgICAgIGhlaWdodCsrO1xuICAgICAgfVxuICAgICAgbGV0IHRvcCA9IHRpbGU7XG4gICAgICB3aGlsZSAoZ2V0RWZmZWN0cyh0b3ApICYgMHgyMCkge1xuICAgICAgICB0b3AgPSBUaWxlSWQuYWRkKHRvcCwgLTEsIDApO1xuICAgICAgICBoZWlnaHQrKztcbiAgICAgIH1cbiAgICAgIGlmIChoZWlnaHQgPCA2KSB7XG4gICAgICAgIGVmZmVjdHMgJj0gfjB4MjA7XG4gICAgICB9IGVsc2UgaWYgKGhlaWdodCA8IDkpIHtcbiAgICAgICAgZWZmZWN0cyB8PSAweDQwO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gVEVSUkFJTlNbZWZmZWN0c107XG4gIH1cblxuICAvLyBUT0RPIC0gY29uc2lkZXIgZm9sZGluZyB0aGlzIGludG8gbG9jYXRpb24vdHJpZ2dlci9ucGMgYXMgYW4gZXh0cmEgcmV0dXJuP1xuICBleHRyYVJvdXRlcygpOiBFeHRyYVJvdXRlW10ge1xuICAgIGNvbnN0IHJvdXRlcyA9IFtdO1xuICAgIGNvbnN0IGVudHJhbmNlID0gKGxvY2F0aW9uOiBudW1iZXIsIGVudHJhbmNlOiBudW1iZXIgPSAwKTogVGlsZUlkID0+IHtcbiAgICAgIGNvbnN0IGwgPSB0aGlzLnJvbS5sb2NhdGlvbnNbbG9jYXRpb25dO1xuICAgICAgY29uc3QgZSA9IGwuZW50cmFuY2VzW2VudHJhbmNlXTtcbiAgICAgIHJldHVybiBUaWxlSWQuZnJvbShsLCBlKTtcbiAgICB9O1xuICAgIC8vIFN0YXJ0IHRoZSBnYW1lIGF0IDA6MFxuICAgIHJvdXRlcy5wdXNoKHt0aWxlOiBlbnRyYW5jZSgwKX0pO1xuICAgIC8vIFN3b3JkIG9mIFRodW5kZXIgd2FycFxuICAgIC8vIFRPRE8gLSBlbnRyYW5jZSBzaHVmZmxlIHdpbGwgYnJlYWsgdGhlIGF1dG8td2FycC1wb2ludCBhZmZvcmRhbmNlLlxuICAgIGlmICh0aGlzLmZsYWdzLnRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKSkge1xuICAgICAgY29uc3Qgd2FycCA9IHRoaXMucm9tLnRvd25XYXJwLnRodW5kZXJTd29yZFdhcnA7XG4gICAgICByb3V0ZXMucHVzaCh7XG4gICAgICAgIHRpbGU6IGVudHJhbmNlKHdhcnBbMF0sIHdhcnBbMV0gJiAweDFmKSxcbiAgICAgICAgY29uZGl0aW9uOiBvcihhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBDYXBhYmlsaXR5LkJVWV9XQVJQKSxcbiAgICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBNYWdpYy5URUxFUE9SVCkpLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzLmFzc3VtZVdpbGRXYXJwKCkpIHtcbiAgICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGhpcy5yb20ud2lsZFdhcnAubG9jYXRpb25zKSB7XG4gICAgICAgIHJvdXRlcy5wdXNoKHt0aWxlOiBlbnRyYW5jZShsb2NhdGlvbil9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJvdXRlcztcbiAgfVxuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBmb2xkaW5nIHRoaXMgaW50byBsb2NhdGlvbi90cmlnZ2VyL25wYyBhcyBhbiBleHRyYSByZXR1cm4/XG4gIGV4dHJhRWRnZXMoKTogRXh0cmFFZGdlW10ge1xuICAgIGNvbnN0IGVkZ2VzID0gW107XG4gICAgLy8gbmVlZCBhbiBlZGdlIGZyb20gdGhlIGJvYXQgaG91c2UgdG8gdGhlIGJlYWNoIC0gd2UgY291bGQgYnVpbGQgdGhpcyBpbnRvIHRoZVxuICAgIC8vIGJvYXQgYm9hcmRpbmcgdHJpZ2dlciwgYnV0IGZvciBub3cgaXQncyBoZXJlLlxuICAgIGVkZ2VzLnB1c2goe1xuICAgICAgZnJvbTogVGlsZUlkKDB4NTEwMDg4KSwgLy8gaW4gZnJvbnQgb2YgYm9hdCBob3VzZVxuICAgICAgdG86IFRpbGVJZCgweDYwODY4OCksIC8vIGluIGZyb250IG9mIGNhYmluXG4gICAgICBjb25kaXRpb246IEV2ZW50LlJFVFVSTkVEX0ZPR19MQU1QLFxuICAgIH0pO1xuICAgIHJldHVybiBlZGdlcztcbiAgfVxuXG4gIHRyaWdnZXIoaWQ6IG51bWJlcik6IFRyaWdnZXJEYXRhIHtcbiAgICBzd2l0Y2ggKGlkKSB7XG4gICAgY2FzZSAweDlhOiAvLyBzdGFydCBmaWdodCB3aXRoIG1hZG8gaWYgc2h5cm9uIG1hc3NhY3JlIHN0YXJ0ZWRcbiAgICAgIC8vIFRPRE8gLSBsb29rIHVwIHdobyB0aGUgYWN0dWFsIGJvc3MgaXMgb25jZSB3ZSBnZXQgYm9zcyBzaHVmZmxlISEhXG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IG1lZXQoRXZlbnQuU0hZUk9OX01BU1NBQ1JFLCB0aGlzLmJvc3NSZXF1aXJlbWVudHModGhpcy5yb20uYm9zc2VzLm1hZG8xKSksXG4gICAgICAgIHNsb3Q6IFNsb3QoQm9zcy5NQURPMSksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFhOiAvLyBlbnRlciBvYWsgYWZ0ZXIgaW5zZWN0XG4gICAgICAvLyBOT1RFOiBUaGlzIGlzIG5vdCB0aGUgdHJpZ2dlciB0aGF0IGNoZWNrcywgYnV0IHJhdGhlciBpdCBoYXBwZW5zIG9uIHRoZSBlbnRyYW5jZS5cbiAgICAgIC8vIFRoaXMgaXMgYSBjb252ZW5pZW50IHBsYWNlIHRvIGhhbmRsZSBpdCwgdGhvdWdoLCBzaW5jZSB3ZSBhbHJlYWR5IG5lZWQgdG8gZXhwbGljaXRseVxuICAgICAgLy8gaWdub3JlIHRoaXMgdHJpZ2dlci4gIFdlIGFsc28gcmVxdWlyZSB3YXJwIGJvb3RzIGJlY2F1c2UgaXQncyBwb3NzaWJsZSB0aGF0IHRoZXJlJ3NcbiAgICAgIC8vIG5vIGRpcmVjdCB3YWxraW5nIHBhdGggYW5kIGl0J3Mgbm90IGZlYXNpYmxlIHRvIGNhcnJ5IHRoZSBjaGlsZCB3aXRoIHVzIGV2ZXJ5d2hlcmUsXG4gICAgICAvLyBkdWUgdG8gZ3JhcGhpY3MgcmVhc29ucy5cbiAgICAgIHJldHVybiB7Y2hlY2s6W3tcbiAgICAgICAgY29uZGl0aW9uOiBhbmQoRXZlbnQuRFdBUkZfQ0hJTEQsIENhcGFiaWxpdHkuQlVZX1dBUlApLFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50LlJFU0NVRURfQ0hJTEQpLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhhZDogLy8gYWxsb3cgb3BlbmluZyBwcmlzb24gZG9vclxuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBJdGVtLktFWV9UT19QUklTT04sXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX1BSSVNPTiksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFlOiAvLyBhbGxvdyBvcGVuaW5nIHN0eHlcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogSXRlbS5LRVlfVE9fU1RZWCxcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5PUEVORURfU1RZWCksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFmOiAvLyBhbGxvdyBjYWxtaW5nIHNlYVxuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBJdGVtLlNUQVRVRV9PRl9HT0xELFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50LkNBTE1FRF9TRUEpLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhiMTogLy8gc3RhcnQgZmlnaHQgd2l0aCBndWFyZGlhbiBzdGF0dWVzXG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IGFuZChJdGVtLkJPV19PRl9TVU4sIEl0ZW0uQk9XX09GX01PT04pLFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9DUllQVCksXG4gICAgICB9XX07XG4gICAgfVxuICAgIC8vIENoZWNrIGZvciByZWxldmFudCBmbGFncyBhbmQga25vd24gYWN0aW9uIHR5cGVzLlxuICAgIGNvbnN0IHRyaWdnZXIgPSB0aGlzLnJvbS50cmlnZ2Vyc1tpZCAmIDB4N2ZdO1xuICAgIGlmICghdHJpZ2dlciB8fCAhdHJpZ2dlci51c2VkKSB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHJpZ2dlcjogJHtoZXgoaWQpfWApO1xuICAgIGNvbnN0IHJlbGV2YW50ID0gKGY6IG51bWJlcikgPT4gdGhpcy5yZWxldmFudEZsYWdzLmhhcyhmKTtcbiAgICBjb25zdCByZWxldmFudEFuZFNldCA9IChmOiBudW1iZXIpID0+IGYgPiAwICYmIHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZik7XG4gICAgZnVuY3Rpb24gbWFwKGY6IG51bWJlcik6IG51bWJlciB7XG4gICAgICBpZiAoZiA8IDApIHJldHVybiB+bWFwKH5mKTtcbiAgICAgIGNvbnN0IG1hcHBlZCA9IEZMQUdfTUFQLmdldChmKTtcbiAgICAgIHJldHVybiBtYXBwZWQgIT0gbnVsbCA/IG1hcHBlZFswXVswXSA6IGY7XG4gICAgfVxuICAgIGNvbnN0IGFjdGlvbkl0ZW0gPSBUUklHR0VSX0FDVElPTl9JVEVNU1t0cmlnZ2VyLm1lc3NhZ2UuYWN0aW9uXTtcbiAgICBjb25zdCBjb25kaXRpb24gPSBhbmQoLi4udHJpZ2dlci5jb25kaXRpb25zLm1hcChtYXApLmZpbHRlcihyZWxldmFudEFuZFNldCkubWFwKENvbmRpdGlvbikpO1xuICAgIGlmICh0cmlnZ2VyLm1lc3NhZ2UuYWN0aW9uID09PSAweDE5KSB7IC8vIHB1c2gtZG93biB0cmlnZ2VyXG4gICAgICAvLyBUT0RPIC0gcGFzcyBpbiB0ZXJyYWluOyBpZiBvbiBsYW5kIGFuZCB0cmlnZ2VyIHNraXAgaXMgb24gdGhlblxuICAgICAgLy8gYWRkIGEgcm91dGUgcmVxdWlyaW5nIHJhYmJpdCBib290cyBhbmQgZWl0aGVyIHdhcnAgYm9vdHMgb3IgdGVsZXBvcnQ/XG4gICAgICBjb25zdCBleHRyYTogVHJpZ2dlckRhdGEgPSB7fTtcbiAgICAgIGlmICh0cmlnZ2VyLmlkID09PSAweDg2ICYmICF0aGlzLmZsYWdzLmFzc3VtZVJhYmJpdFNraXAoKSkge1xuICAgICAgICBleHRyYS5keCA9IFstMzIsIC0xNiwgMCwgMTZdO1xuICAgICAgfVxuICAgICAgaWYgKHRyaWdnZXIuaWQgPT09IDB4YmEgJiZcbiAgICAgICAgICAhdGhpcy5mbGFncy5kaXNhYmxlVGVsZXBvcnRTa2lwKCkgJiZcbiAgICAgICAgICAhdGhpcy5mbGFncy5hc3N1bWVUZWxlcG9ydFNraXAoKSkge1xuICAgICAgICBleHRyYS5leHRyYUxvY2F0aW9ucyA9IFt0aGlzLnJvbS5sb2NhdGlvbnMuQ29yZGVsUGxhaW5XZXN0XTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvbmQgPVxuICAgICAgICAgIHRyaWdnZXIuY29uZGl0aW9ucy5tYXAoYyA9PiBjIDwgMCAmJiByZWxldmFudCh+bWFwKGMpKSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDb25kaXRpb24ofm1hcChjKSkgOiBudWxsKVxuICAgICAgICAgICAgICAuZmlsdGVyKChjOiB1bmtub3duKTogYyBpcyBbW0NvbmRpdGlvbl1dID0+IGMgIT0gbnVsbCk7XG4gICAgICBpZiAoY29uZCAmJiBjb25kLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gey4uLmV4dHJhLCB0ZXJyYWluOiB7ZXhpdDogb3IoLi4uY29uZCl9fTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGFjdGlvbkl0ZW0gIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHtjaGVjazogW3tjb25kaXRpb24sIHNsb3Q6IGFjdGlvbkl0ZW19XX07XG4gICAgfVxuICAgIGNvbnN0IGZsYWdzID0gdHJpZ2dlci5mbGFncy5maWx0ZXIocmVsZXZhbnRBbmRTZXQpO1xuICAgIGlmIChmbGFncy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB7Y2hlY2s6IGZsYWdzLm1hcChmID0+ICh7Y29uZGl0aW9uLCBzbG90OiBTbG90KGYpfSkpfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge307XG4gIH1cblxuICBucGMoaWQ6IG51bWJlciwgbG9jOiBMb2NhdGlvbik6IE5wY0RhdGEge1xuICAgIGNvbnN0IG5wYyA9IHRoaXMucm9tLm5wY3NbaWRdO1xuICAgIGlmICghbnBjIHx8ICFucGMudXNlZCkgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRyaWdnZXI6ICR7aGV4KGlkKX1gKTtcblxuICAgIGNvbnN0IHNwYXduQ29uZGl0aW9uczogcmVhZG9ubHkgbnVtYmVyW10gPSBucGMuc3Bhd25Db25kaXRpb25zLmdldChsb2MuaWQpIHx8IFtdO1xuXG4gICAgY29uc3QgcmVzdWx0OiBOcGNEYXRhICYge2NoZWNrOiBDaGVja1tdfSA9IHtjaGVjazogW119O1xuXG4gICAgaWYgKG5wYy5kYXRhWzJdICYgMHgwNCkge1xuICAgICAgLy8gcGVyc29uIGlzIGEgc3RhdHVlLlxuICAgICAgcmVzdWx0LnRlcnJhaW4gPSB7XG4gICAgICAgIGV4aXQ6IHRoaXMuZmxhZ3MuYXNzdW1lU3RhdHVlR2xpdGNoKCkgP1xuICAgICAgICAgICAgICAgICAgW1tdXSA6IFxuICAgICAgICAgICAgICAgICAgb3IoLi4uc3Bhd25Db25kaXRpb25zLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICB4ID0+IEZMQUdfTUFQLmdldCh4KSB8fCAodGhpcy5yZWxldmFudEZsYWdzLmhhcyh4KSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENvbmRpdGlvbih4KSA6IFtdKSkpLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdGF0dWVPciguLi5yZXFzOiBSZXF1aXJlbWVudFtdKTogdm9pZCB7XG4gICAgICBpZiAoIXJlc3VsdC50ZXJyYWluKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgdGVycmFpbiBmb3IgZ3VhcmQnKTtcbiAgICAgIHJlc3VsdC50ZXJyYWluLmV4aXQgPSBvcihyZXN1bHQudGVycmFpbi5leGl0IHx8IFtdLCAuLi5yZXFzKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gZm9ydHVuZSB0ZWxsZXIgKDM5KSByZXF1aXJlcyBhY2Nlc3MgdG8gcG9ydG9hIHRvIGdldCBoZXIgdG8gbW92ZT9cbiAgICAvLyAgICAgIC0+IG1heWJlIGluc3RlYWQgY2hhbmdlIHRoZSBmbGFnIHRvIHNldCBpbW1lZGlhdGVseSBvbiB0YWxraW5nIHRvIGhlclxuICAgIC8vICAgICAgICAgcmF0aGVyIHRoYW4gdGhlIHRyaWdnZXIgb3V0c2lkZSB0aGUgZG9vci4uLj8gdGhpcyB3b3VsZCBhbGxvdyBnZXR0aW5nXG4gICAgLy8gICAgICAgICB0aHJvdWdoIGl0IGJ5IGp1c3QgdGFsa2luZyBhbmQgdGhlbiBsZWF2aW5nIHRoZSByb29tLi4uXG5cbiAgICBzd2l0Y2ggKGlkKSB7XG4gICAgY2FzZSAweDE0OiAvLyB3b2tlbi11cCB3aW5kbWlsbCBndWFyZFxuICAgICAgLy8gc2tpcCBiZWNhdXNlIHdlIHRpZSB0aGUgaXRlbSB0byB0aGUgc2xlZXBpbmcgb25lLlxuICAgICAgaWYgKGxvYy5zcGF3bnMuZmluZChsID0+IGwuaXNOcGMoKSAmJiBsLmlkID09PSAweDE1KSkgcmV0dXJuIHt9O1xuICAgIGNhc2UgMHgyNTogLy8gYW1hem9uZXMgZ3VhcmRcbiAgICAgIHJlc3VsdC5oaXRib3ggPSB7eDA6IDAsIHgxOiAyLCB5MDogMCwgeTE6IDF9O1xuICAgICAgc3RhdHVlT3IoTWFnaWMuQ0hBTkdFLCBNYWdpYy5QQVJBTFlTSVMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDJkOiAvLyBtdCBzYWJyZS9zd2FuIHNvbGRpZXJzXG4gICAgICAvLyBUaGVzZSBkb24ndCBjb3VudCBhcyBzdGF0dWVzIGJlY2F1c2UgdGhleSdsbCBtb3ZlIGlmIHlvdSB0YWxrIHRvIHRoZW0uXG4gICAgICBkZWxldGUgcmVzdWx0LnRlcnJhaW47XG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4MzM6IC8vIHBvcnRvYSBndWFyZCAodGhyb25lIHJvb20sIHRob3VnaCB0aGUgcGFsYWNlIG9uZSBpcyB0aGUgb25lIHRoYXQgbWF0dGVycylcbiAgICAgIC8vIE5PVEU6IHRoaXMgbWVhbnMgdGhhdCB3ZSBjYW5ub3Qgc2VwYXJhdGUgdGhlIHBhbGFjZSBmb3llciBmcm9tIHRoZSB0aHJvbmUgcm9vbSwgc2luY2VcbiAgICAgIC8vIHRoZXJlJ3Mgbm8gd2F5IHRvIHJlcHJlc2VudCB0aGUgY29uZGl0aW9uIGZvciBwYXJhbHl6aW5nIHRoZSBndWFyZCBhbmQgc3RpbGwgaGF2ZSBoaW1cbiAgICAgIC8vIHBhc3NhYmxlIHdoZW4gdGhlIHF1ZWVuIGlzIHRoZXJlLiAgVGhlIHdob2xlIHNlcXVlbmNlIGlzIGFsc28gdGlnaHRseSBjb3VwbGVkLCBzbyBpdFxuICAgICAgLy8gcHJvYmFibHkgd291bGRuJ3QgbWFrZSBzZW5zZSB0byBzcGxpdCBpdCB1cCBhbnl3YXkuXG4gICAgICBzdGF0dWVPcihNYWdpYy5QQVJBTFlTSVMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDM4OiAvLyBwb3J0b2EgcXVlZW4gc2l0dGluZyBvbiBpbXBhc3NhYmxlIHRocm9uZVxuICAgICAgaWYgKGxvYy5pZCA9PT0gMHhkZikgcmVzdWx0LmhpdGJveCA9IHt4MDogMCwgeDE6IDEsIHkwOiAyLCB5MTogM307XG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4NGU6IC8vIHNoeXJvbiBndWFyZFxuICAgICAgcmVzdWx0LmhpdGJveCA9IHt4MDogLTEsIHgxOiAyLCB5MDogMCwgeTE6IDF9O1xuICAgICAgc3RhdHVlT3IoTWFnaWMuQ0hBTkdFLCBFdmVudC5FTlRFUkVEX1NIWVJPTik7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4Njg6IC8vIGtlbnN1IGluIGNhYmluXG4gICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAtMSwgeDE6IDIsIHkwOiAtMSwgeTE6IDJ9O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDgwOiAvLyBnb2EgZ3VhcmRzXG4gICAgICBzdGF0dWVPciguLi5zcGF3bkNvbmRpdGlvbnMubWFwKGMgPT4gQ29uZGl0aW9uKH5jKSkpOyAvLyBFdmVudC5FTlRFUkVEX1NIWVJPTlxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDg1OiAvLyBzdG9uZWQgcGFpclxuICAgICAgc3RhdHVlT3IoSXRlbS5GTFVURV9PRl9MSU1FKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIGludGVyc2VjdCBzcGF3biBjb25kaXRpb25zXG4gICAgY29uc3QgcmVxdWlyZW1lbnRzOiBBcnJheTxyZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dPiA9IFtdO1xuICAgIGNvbnN0IGFkZFJlcSA9IChmbGFnOiBudW1iZXIpOiB2b2lkID0+IHtcbiAgICAgIGlmIChmbGFnIDw9IDApIHJldHVybjsgLy8gbmVnYXRpdmUgb3IgemVybyBmbGFnIGlnbm9yZWRcbiAgICAgIGNvbnN0IHJlcSA9IEZMQUdfTUFQLmdldChmbGFnKSB8fCAodGhpcy5yZWxldmFudEZsYWdzLmhhcyhmbGFnKSA/IENvbmRpdGlvbihmbGFnKSA6IG51bGwpO1xuICAgICAgaWYgKHJlcSAhPSBudWxsKSByZXF1aXJlbWVudHMucHVzaChyZXEpO1xuICAgIH07XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIHNwYXduQ29uZGl0aW9ucykge1xuICAgICAgYWRkUmVxKGZsYWcpO1xuICAgIH1cblxuICAgIC8vIExvb2sgZm9yIHRyYWRlLWluc1xuICAgIC8vICAtIFRPRE8gLSBkb24ndCBoYXJkLWNvZGUgdGhlIE5QQ3M/IHJlYWQgZnJvbSB0aGUgaXRlbWRhdGE/XG4gICAgY29uc3QgdHJhZGVJbiA9IHRoaXMudHJhZGVJbnMuZ2V0KGlkKVxuICAgIGlmICh0cmFkZUluICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHQgPSB0cmFkZUluO1xuICAgICAgZnVuY3Rpb24gdHJhZGUoc2xvdDogU2xvdCwgLi4ucmVxczogQXJyYXk8cmVhZG9ubHkgW3JlYWRvbmx5IENvbmRpdGlvbltdXT4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgY29uZGl0aW9uID0gYW5kKC4uLnJlcXVpcmVtZW50cywgdCwgLi4ucmVxcyk7XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90LCBjb25kaXRpb259KTtcbiAgICAgIH1cbiAgICAgIGxldCB0cmFkZVIgPSB0cmFkZTtcbiAgICAgIGlmICh0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFncy5yYW5kb21pemVUcmFkZXMoKSkge1xuICAgICAgICB0cmFkZVIgPSAoc2xvdCwgLi4ucmVxcykgPT4ge1xuICAgICAgICAgIGNvbnN0IGl0ZW1zID0gW1xuICAgICAgICAgICAgSXRlbS5TVEFUVUVfT0ZfT05ZWCxcbiAgICAgICAgICAgIEl0ZW0uRk9HX0xBTVAsXG4gICAgICAgICAgICBJdGVtLkxPVkVfUEVOREFOVCxcbiAgICAgICAgICAgIEl0ZW0uS0lSSVNBX1BMQU5ULFxuICAgICAgICAgICAgSXRlbS5JVk9SWV9TVEFUVUUsXG4gICAgICAgICAgXTtcbiAgICAgICAgICBjb25zdCBjb25kaXRpb24gPVxuICAgICAgICAgICAgICBvciguLi5pdGVtcy5tYXAoaSA9PiBhbmQoLi4ucmVxdWlyZW1lbnRzLCBpLCAuLi5yZXFzKSkpO1xuICAgICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90LCBjb25kaXRpb259KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc3dpdGNoIChpZCkge1xuICAgICAgY2FzZSAweDE1OiAvLyBzbGVlcGluZyB3aW5kbWlsbCBndWFyZCA9PiB3aW5kbWlsbCBrZXkgc2xvdFxuICAgICAgICB0cmFkZShTbG90KEl0ZW0uV0lORE1JTExfS0VZKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDIzOiAvLyBhcnlsbGlzID0+IGJvdyBvZiBtb29uIHNsb3RcbiAgICAgICAgLy8gTk9URTogc2l0dGluZyBvbiBpbXBhc3NpYmxlIHRocm9uZVxuICAgICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAtMSwgeDE6IDIsIHkwOiAtMSwgeTE6IDJ9O1xuICAgICAgICB0cmFkZVIoU2xvdChJdGVtLkJPV19PRl9NT09OKSwgTWFnaWMuQ0hBTkdFKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NjM6IC8vIGh1cnQgZG9scGhpbiA9PiBoZWFsZWQgZG9scGhpblxuICAgICAgICAvLyBOT1RFOiBkb2xwaGluIG9uIHdhdGVyLCBidXQgY2FuIGhlYWwgZnJvbSBsYW5kXG4gICAgICAgIHJlc3VsdC5oaXRib3ggPSB7eDA6IC0xLCB4MTogMiwgeTA6IC0xLCB5MTogMn07XG4gICAgICAgIHRyYWRlKFNsb3QoRXZlbnQuSEVBTEVEX0RPTFBISU4pKTtcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLlNIRUxMX0ZMVVRFKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDY0OiAvLyBmaXNoZXJtYW5cbiAgICAgICAgdHJhZGVSKFNsb3QoRXZlbnQuUkVUVVJORURfRk9HX0xBTVApLFxuICAgICAgICAgICAgICAgLi4uKHRoaXMuZmxhZ3MucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKSA/XG4gICAgICAgICAgICAgICAgICAgW0V2ZW50LkhFQUxFRF9ET0xQSElOXSA6IFtdKSk7XG4gICAgICAgIC8vIFRPRE8gLSB1c2UgdGhpcyBhcyBwcm94eSBmb3IgYm9hdFxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg2YjogLy8gc2xlZXBpbmcga2Vuc3VcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLkdMT1dJTkdfTEFNUCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg3NTogLy8gc2xpbWVkIGtlbnN1ID0+IGZsaWdodCBzbG90XG4gICAgICAgIHRyYWRlUihTbG90KE1hZ2ljLkZMSUdIVCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg3NDogLy8ga2Vuc3UgaW4gZGFuY2UgaGFsbCA9PiBjaGFuZ2Ugc2xvdFxuICAgICAgICAvLyBOT1RFOiB0aGlzIGlzIG5vcm1hbGx5IDdlIGJ1dCB3ZSBjaGFuZ2UgaXQgdG8gNzQgaW4gdGhpcyBvbmVcbiAgICAgICAgLy8gbG9jYXRpb24gdG8gaWRlbnRpZnkgaXRcbiAgICAgICAgdHJhZGVSKFNsb3QoTWFnaWMuQ0hBTkdFKSwgTWFnaWMuUEFSQUxZU0lTLCBFdmVudC5GT1VORF9LRU5TVSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDgyOiAvLyBha2FoYW5hID0+IGdhcyBtYXNrIHNsb3QgKGNoYW5nZWQgMTYgLT4gODIpXG4gICAgICAgIHRyYWRlUihTbG90KEl0ZW0uR0FTX01BU0spKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4ODg6IC8vIHN0b25lZCBha2FoYW5hID0+IHNoaWVsZCByaW5nIHNsb3RcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLlNISUVMRF9SSU5HKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5QQ3MgdGhhdCBuZWVkIGEgbGl0dGxlIGV4dHJhIGNhcmVcblxuICAgIGlmIChpZCA9PT0gMHg4NCkgeyAvLyBzdGFydCBmaWdodCB3aXRoIHNhYmVyYVxuICAgICAgLy8gVE9ETyAtIGxvb2sgdXAgd2hvIHRoZSBhY3R1YWwgYm9zcyBpcyBvbmNlIHdlIGdldCBib3NzIHNodWZmbGUhISFcbiAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IHRoaXMuYm9zc1JlcXVpcmVtZW50cyh0aGlzLnJvbS5ib3NzZXMuc2FiZXJhMSk7XG4gICAgICByZXR1cm4ge2NoZWNrOiBbXG4gICAgICAgIHtjb25kaXRpb24sIHNsb3Q6IFNsb3QoQm9zcy5TQUJFUkExKX0sXG4gICAgICBdfTtcbiAgICB9IGVsc2UgaWYgKGlkID09PSAweDFkKSB7IC8vIG9hayBlbGRlciBoYXMgc29tZSB3ZWlyZCB1bnRyYWNrZWQgY29uZGl0aW9ucy5cbiAgICAgIGNvbnN0IHNsb3QgPSBTbG90KEl0ZW0uU1dPUkRfT0ZfRklSRSk7XG4gICAgICByZXR1cm4ge2NoZWNrOiBbXG4gICAgICAgIC8vIHR3byBkaWZmZXJlbnQgd2F5cyB0byBnZXQgdGhlIHN3b3JkIG9mIGZpcmUgaXRlbVxuICAgICAgICB7Y29uZGl0aW9uOiBhbmQoTWFnaWMuVEVMRVBBVEhZLCBCb3NzLklOU0VDVCksIHNsb3R9LFxuICAgICAgICB7Y29uZGl0aW9uOiBFdmVudC5SRVNDVUVEX0NISUxELCBzbG90fSxcbiAgICAgIF19O1xuICAgIH0gZWxzZSBpZiAoaWQgPT09IDB4MWYpIHsgLy8gZHdhcmYgY2hpbGRcbiAgICAgIGNvbnN0IHNwYXducyA9IHRoaXMucm9tLm5wY3NbaWRdLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jLmlkKTtcbiAgICAgIGlmIChzcGF3bnMgJiYgc3Bhd25zLmluY2x1ZGVzKDB4MDQ1KSkgcmV0dXJuIHt9OyAvLyBpbiBtb3RoZXIncyBob3VzZVxuICAgICAgcmV0dXJuIHtjaGVjazogW1xuICAgICAgICB7Y29uZGl0aW9uOiBFdmVudC5EV0FSRl9NT1RIRVIsIHNsb3Q6IFNsb3QoRXZlbnQuRFdBUkZfQ0hJTEQpfSxcbiAgICAgIF19O1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgZCBvZiBucGMuZ2xvYmFsRGlhbG9ncykge1xuICAgICAgYWRkUmVxKH5kLmNvbmRpdGlvbik7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZCBvZiBucGMubG9jYWxEaWFsb2dzLmdldChsb2MuaWQpIHx8IG5wYy5sb2NhbERpYWxvZ3MuZ2V0KC0xKSB8fCBbXSkge1xuICAgICAgLy8gSWYgdGhlIGNoZWNrIGNvbmRpdGlvbiBpcyBvcHBvc2l0ZSB0byB0aGUgc3Bhd24gY29uZGl0aW9uLCB0aGVuIHNraXAuXG4gICAgICAvLyBUaGlzIGVuc3VyZXMgd2UgZG9uJ3QgZXhwZWN0IHRoZSBxdWVlbiB0byBnaXZlIHJlY292ZXIgaW4gdGhlIHRocm9uZSByb29tLlxuICAgICAgaWYgKHNwYXduQ29uZGl0aW9ucy5pbmNsdWRlcyh+ZC5jb25kaXRpb24pKSBjb250aW51ZTtcbiAgICAgIC8vIEFwcGx5IHRoZSBGTEFHX01BUC5cbiAgICAgIGNvbnN0IG1hcHBlZCA9IEZMQUdfTUFQLmdldChkLmNvbmRpdGlvbik7XG4gICAgICBjb25zdCBwb3NpdGl2ZSA9XG4gICAgICAgICAgbWFwcGVkID8gW21hcHBlZF0gOlxuICAgICAgICAgIHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZC5jb25kaXRpb24pID8gW0NvbmRpdGlvbihkLmNvbmRpdGlvbildIDpcbiAgICAgICAgICBbXTtcbiAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IGFuZCguLi5wb3NpdGl2ZSwgLi4ucmVxdWlyZW1lbnRzKTtcbiAgICAgIC8vIElmIHRoZSBjb25kaXRpb24gaXMgYSBuZWdhdGl2ZSB0aGVuIGFueSBmdXR1cmUgY29uZGl0aW9ucyBtdXN0IGluY2x1ZGVcbiAgICAgIC8vIGl0IGFzIGEgcG9zaXRpdmUgcmVxdWlyZW1lbnQuXG4gICAgICBjb25zdCBuZWdhdGl2ZSA9XG4gICAgICAgICAgRkxBR19NQVAuZ2V0KH5kLmNvbmRpdGlvbikgfHxcbiAgICAgICAgICAodGhpcy5yZWxldmFudEZsYWdzLmhhcyh+ZC5jb25kaXRpb24pID8gQ29uZGl0aW9uKH5kLmNvbmRpdGlvbikgOiBudWxsKTtcbiAgICAgIGlmIChuZWdhdGl2ZSAhPSBudWxsKSByZXF1aXJlbWVudHMucHVzaChuZWdhdGl2ZSk7XG4gICAgICBjb25zdCBhY3Rpb24gPSBkLm1lc3NhZ2UuYWN0aW9uO1xuICAgICAgaWYgKGFjdGlvbiA9PT0gMHgwMyB8fCBhY3Rpb24gPT09IDB4MGEpIHtcbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QuaXRlbShucGMuZGF0YVswXSksIGNvbmRpdGlvbn0pO1xuICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IDB4MTFcbiAgICAgICAgICAgICAgICAgfHwgKHRoaXMuZmxhZ3MuemVidVN0dWRlbnRHaXZlc0l0ZW0oKSAmJiBhY3Rpb24gPT09IDB4MDkpKSB7XG4gICAgICAgIC8vIE5PVEU6ICQwOSBpcyB6ZWJ1IHN0dWRlbnQsIHdoaWNoIHdlJ3ZlIHBhdGNoZWQgdG8gZ2l2ZSB0aGUgaXRlbS5cbiAgICAgICAgLy8gVE9ETyAtIGNoZWNrIHRoZSBwYXRjaCByYXRoZXIgdGhhbiB0aGUgZmxhZz9cbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QuaXRlbShucGMuZGF0YVsxXSksIGNvbmRpdGlvbn0pO1xuICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IDB4MTApIHtcbiAgICAgICAgLy8gTk9URTogUXVlZW4gY2FuJ3QgYmUgcmV2ZWFsZWQgYXMgYXNpbmEgaW4gdGhlIHRocm9uZSByb29tLiAgSW4gcGFydGljdWxhcixcbiAgICAgICAgLy8gdGhpcyBlbnN1cmVzIHRoYXQgdGhlIGJhY2sgcm9vbSBpcyByZWFjaGFibGUgYmVmb3JlIHJlcXVpcmluZyB0aGUgZG9scGhpblxuICAgICAgICAvLyB0byBhcHBlYXIuICBUaGlzIHNob3VsZCBiZSBoYW5kbGVkIGJ5IHRoZSBhYm92ZSBjaGVjayBmb3IgdGhlIGRpYWxvZyBhbmRcbiAgICAgICAgLy8gc3Bhd24gY29uZGl0aW9ucyB0byBiZSBjb21wYXRpYmxlLlxuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdChNYWdpYy5SRUNPVkVSKSwgY29uZGl0aW9ufSk7XG4gICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gMHgwOCAmJiBpZCA9PT0gMHgyZCkge1xuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdChFdmVudC5PUEVORURfU1dBTiksIGNvbmRpdGlvbn0pO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBmbGFnIG9mIGQuZmxhZ3MpIHtcbiAgICAgICAgY29uc3QgbWZsYWcgPSBGTEFHX01BUC5nZXQoZmxhZyk7XG4gICAgICAgIGNvbnN0IHBmbGFnID0gbWZsYWcgPyBtZmxhZyA6IHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZmxhZykgPyBDb25kaXRpb24oZmxhZykgOiBudWxsO1xuICAgICAgICBpZiAocGZsYWcpIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90KHBmbGFnKSwgY29uZGl0aW9ufSk7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGUgc3Bhd24gKnJlcXVpcmVzKiB0aGlzIGNvbmRpdGlvbiB0aGVuIGRvbid0IGV2YWx1YXRlIGFueSBtb3JlLiAgVGhpc1xuICAgICAgLy8gZW5zdXJlcyB3ZSBkb24ndCBleHBlY3QgdGhlIHF1ZWVuIHRvIGdpdmUgdGhlIGZsdXRlIG9mIGxpbWUgaW4gdGhlIGJhY2sgcm9vbSxcbiAgICAgIC8vIHNpbmNlIHNoZSB3b3VsZG4ndCBoYXZlIHNwYXduZWQgdGhlcmUgaW50aW1lIHRvIGdpdmUgaXQuXG4gICAgICBpZiAocG9zaXRpdmUubGVuZ3RoICYmIHNwYXduQ29uZGl0aW9ucy5pbmNsdWRlcyhkLmNvbmRpdGlvbikpIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgY2FwYWJpbGl0aWVzKCk6IENhcGFiaWxpdHlEYXRhW10ge1xuICAgIGxldCBicmVha1N0b25lOiBSZXF1aXJlbWVudCA9IEl0ZW0uU1dPUkRfT0ZfV0lORDtcbiAgICBsZXQgYnJlYWtJY2U6IFJlcXVpcmVtZW50ID0gSXRlbS5TV09SRF9PRl9GSVJFO1xuICAgIGxldCBmb3JtQnJpZGdlOiBSZXF1aXJlbWVudCA9IEl0ZW0uU1dPUkRfT0ZfV0FURVI7XG4gICAgbGV0IGJyZWFrSXJvbjogUmVxdWlyZW1lbnQgPSBJdGVtLlNXT1JEX09GX1RIVU5ERVI7XG4gICAgaWYgKCF0aGlzLmZsYWdzLm9yYnNPcHRpb25hbCgpKSB7XG4gICAgICAvLyBBZGQgb3JiIHJlcXVpcmVtZW50XG4gICAgICBicmVha1N0b25lID0gb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfV0lORCwgSXRlbS5PUkJfT0ZfV0lORCksXG4gICAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfV0lORCwgSXRlbS5UT1JOQURPX0JSQUNFTEVUKSk7XG4gICAgICBicmVha0ljZSA9IG9yKGFuZChJdGVtLlNXT1JEX09GX0ZJUkUsIEl0ZW0uT1JCX09GX0ZJUkUpLFxuICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9GSVJFLCBJdGVtLkZMQU1FX0JSQUNFTEVUKSk7XG4gICAgICBmb3JtQnJpZGdlID0gb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfV0FURVIsIEl0ZW0uT1JCX09GX1dBVEVSKSxcbiAgICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5CTElaWkFSRF9CUkFDRUxFVCkpO1xuICAgICAgYnJlYWtJcm9uID0gb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUiwgSXRlbS5PUkJfT0ZfVEhVTkRFUiksXG4gICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBJdGVtLlNUT1JNX0JSQUNFTEVUKSk7XG4gICAgICBpZiAodGhpcy5mbGFncy5hc3N1bWVTd29yZENoYXJnZUdsaXRjaCgpKSB7XG4gICAgICAgIGNvbnN0IGxldmVsMiA9IG9yKGJyZWFrU3RvbmUsIGJyZWFrSWNlLCBmb3JtQnJpZGdlLCBicmVha0lyb24pO1xuICAgICAgICBmdW5jdGlvbiBuZWVkKHN3b3JkOiByZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dKTogUmVxdWlyZW1lbnQge1xuICAgICAgICAgIGNvbnN0IGNvbmRpdGlvbjogQ29uZGl0aW9uID0gc3dvcmRbMF1bMF07XG4gICAgICAgICAgcmV0dXJuIGxldmVsMi5tYXAoYyA9PiBjWzBdID09PSBjb25kaXRpb24gPyBjIDogW2NvbmRpdGlvbiwgLi4uY10pO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrU3RvbmUgPSBuZWVkKEl0ZW0uU1dPUkRfT0ZfV0lORCk7XG4gICAgICAgIGJyZWFrSWNlID0gbmVlZChJdGVtLlNXT1JEX09GX0ZJUkUpO1xuICAgICAgICBmb3JtQnJpZGdlID0gbmVlZChJdGVtLlNXT1JEX09GX1dBVEVSKTtcbiAgICAgICAgYnJlYWtJcm9uID0gbmVlZChJdGVtLlNXT1JEX09GX1RIVU5ERVIpO1xuICAgICAgfVxuICAgIH1cbiAgICB0eXBlIENhcGFiaWxpdHlMaXN0ID0gQXJyYXk8W3JlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV0sIC4uLlJlcXVpcmVtZW50W11dPjtcbiAgICBjb25zdCBjYXBhYmlsaXRpZXM6IENhcGFiaWxpdHlMaXN0ID0gW1xuICAgICAgW0V2ZW50LlNUQVJULCBhbmQoKV0sXG4gICAgICBbQ2FwYWJpbGl0eS5TV09SRCxcbiAgICAgICBJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uU1dPUkRfT0ZfRklSRSxcbiAgICAgICBJdGVtLlNXT1JEX09GX1dBVEVSLCBJdGVtLlNXT1JEX09GX1RIVU5ERVJdLFxuICAgICAgW0NhcGFiaWxpdHkuQlJFQUtfU1RPTkUsIGJyZWFrU3RvbmVdLFxuICAgICAgW0NhcGFiaWxpdHkuQlJFQUtfSUNFLCBicmVha0ljZV0sXG4gICAgICBbQ2FwYWJpbGl0eS5GT1JNX0JSSURHRSwgZm9ybUJyaWRnZV0sXG4gICAgICBbQ2FwYWJpbGl0eS5CUkVBS19JUk9OLCBicmVha0lyb25dLFxuICAgICAgW0NhcGFiaWxpdHkuTU9ORVksIENhcGFiaWxpdHkuU1dPUkRdLCAvLyBUT0RPIC0gY2xlYXIgdGhpcyB1cFxuICAgICAgW0NhcGFiaWxpdHkuQ0xJTUJfV0FURVJGQUxMLCBNYWdpYy5GTElHSFRdLFxuICAgICAgW0NhcGFiaWxpdHkuU0hPT1RJTkdfU1RBVFVFLCBNYWdpYy5CQVJSSUVSXSwgLy8gVE9ETyAtIGFsbG93IHNoaWVsZCByaW5nP1xuICAgICAgW0NhcGFiaWxpdHkuQ0xJTUJfU0xPUEUsIEl0ZW0uUkFCQklUX0JPT1RTLCBNYWdpYy5GTElHSFRdLFxuICAgICAgW0l0ZW0uU1RBVFVFX09GX0dPTEQsIGFuZChJdGVtLkJST0tFTl9TVEFUVUUsIEl0ZW0uR0xPV0lOR19MQU1QKV0sXG4gICAgICAvLyBbRXZlbnQuR0VORVJBTFNfREVGRUFURUQsIEl0ZW0uSVZPUllfU1RBVFVFXSwgLy8gVE9ETyAtIGZpeCB0aGlzXG4gICAgICBbRXZlbnQuT1BFTkVEX1NFQUxFRF9DQVZFLCBFdmVudC5TVEFSVEVEX1dJTkRNSUxMXSwgLy8gVE9ETyAtIG1lcmdlIGNvbXBsZXRlbHk/XG4gICAgXTtcblxuICAgIGlmICh0aGlzLmZsYWdzLmFzc3VtZUdoZXR0b0ZsaWdodCgpKSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5DTElNQl9XQVRFUkZBTEwsIGFuZChFdmVudC5SSURFX0RPTFBISU4sIEl0ZW0uUkFCQklUX0JPT1RTKV0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFncy5mb2dMYW1wTm90UmVxdWlyZWQoKSkge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0V2ZW50LlJJREVfRE9MUEhJTiwgSXRlbS5TSEVMTF9GTFVURV0pO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5mbGFncy5ndWFyYW50ZWVCYXJyaWVyKCkpIHtcbiAgICAgIC8vIFRPRE8gLSBzd29yZCBjaGFyZ2UgZ2xpdGNoIG1pZ2h0IGJlIGEgcHJvYmxlbSB3aXRoIHRoZSBoZWFsaW5nIG9wdGlvbi4uLlxuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuU0hPT1RJTkdfU1RBVFVFLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBDYXBhYmlsaXR5LkJVWV9IRUFMSU5HKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgSXRlbS5TSElFTERfUklORyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIE1hZ2ljLlJFRlJFU0gpXSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZmxhZ3MubGVhdGhlckJvb3RzR2l2ZVNwZWVkKCkpIHtcbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LkNMSU1CX1NMT1BFLCBJdGVtLkxFQVRIRVJfQk9PVFNdKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGJvc3Mgb2YgdGhpcy5yb20uYm9zc2VzKSB7XG4gICAgICBpZiAoYm9zcy5raWxsICE9IG51bGwgJiYgYm9zcy5kcm9wICE9IG51bGwpIHtcbiAgICAgICAgLy8gU2F2ZXMgcmVkdW5kYW5jeSBvZiBwdXR0aW5nIHRoZSBpdGVtIGluIHRoZSBhY3R1YWwgcm9vbS5cbiAgICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0l0ZW0oYm9zcy5kcm9wKSwgQm9zcyhib3NzLmZsYWcpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNhcGFiaWxpdGllcy5wdXNoKFtJdGVtLk9SQl9PRl9XQVRFUiwgQm9zcy5SQUdFXSk7XG5cbiAgICBpZiAodGhpcy5mbGFncy5ndWFyYW50ZWVHYXNNYXNrKCkpIHtcbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LlRSQVZFTF9TV0FNUCwgSXRlbS5HQVNfTUFTS10pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5UUkFWRUxfU1dBTVAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgIG9yKEl0ZW0uR0FTX01BU0ssXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIEl0ZW0uTUVESUNBTF9IRVJCKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgTWFnaWMuUkVGUkVTSCkpXSk7XG4gICAgfVxuXG4gICAgLy8gaWYgKHRoaXMuZmxhZ3MuYXNzdW1lU3RhdHVlR2xpdGNoKCkpIHtcbiAgICAvLyAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LlNUQVRVRV9HTElUQ0gsIFtbXV1dKTtcbiAgICAvLyB9XG5cbiAgICByZXR1cm4gY2FwYWJpbGl0aWVzLm1hcCgoW2NhcGFiaWxpdHksIC4uLmRlcHNdKSA9PiAoe2NhcGFiaWxpdHksIGNvbmRpdGlvbjogb3IoLi4uZGVwcyl9KSk7XG4gIH1cblxuICB3YWxsQ2FwYWJpbGl0eSh0eXBlOiBXYWxsVHlwZSk6IHtmbGFnOiBudW1iZXJ9IHtcbiAgICByZXR1cm4ge2ZsYWc6IFtDYXBhYmlsaXR5LkJSRUFLX1NUT05FLCBDYXBhYmlsaXR5LkJSRUFLX0lDRSxcbiAgICAgICAgICAgICAgICAgICBDYXBhYmlsaXR5LkZPUk1fQlJJREdFLCBDYXBhYmlsaXR5LkJSRUFLX0lST05dW3R5cGVdWzBdWzBdfTtcbiAgfVxufVxuXG50eXBlIFRpbGVDaGVjayA9IENoZWNrICYge3RpbGU6IFRpbGVJZH07XG5cbi8vIFRPRE8gLSBtYXliZSBwdWxsIHRyaWdnZXJzIGFuZCBucGNzLCBldGMsIGJhY2sgdG9nZXRoZXI/XG4vLyAgICAgIC0gb3IgbWFrZSB0aGUgbG9jYXRpb24gb3ZlcmxheSBhIHNpbmdsZSBmdW5jdGlvbj9cbi8vICAgICAgICAtPiBuZWVkcyBjbG9zZWQtb3ZlciBzdGF0ZSB0byBzaGFyZSBpbnN0YW5jZXMuLi5cblxuaW50ZXJmYWNlIEV4dHJhUm91dGUge1xuICB0aWxlOiBUaWxlSWQ7XG4gIGNvbmRpdGlvbj86IFJlcXVpcmVtZW50O1xufVxuaW50ZXJmYWNlIEV4dHJhRWRnZSB7XG4gIGZyb206IFRpbGVJZDtcbiAgdG86IFRpbGVJZDtcbiAgY29uZGl0aW9uPzogUmVxdWlyZW1lbnQ7XG59XG5cbmludGVyZmFjZSBUcmlnZ2VyRGF0YSB7XG4gIHRlcnJhaW4/OiBUZXJyYWluO1xuICBjaGVjaz86IENoZWNrW107XG4gIC8vIGFsbG93cyBub3QgYXNzdW1pbmcgdGVsZXBvcnQgc2tpcFxuICBleHRyYUxvY2F0aW9ucz86IExvY2F0aW9uW107XG4gIC8vIGFsbG93cyBub3QgYXNzdW1pbmcgcmFiYml0IHNraXBcbiAgZHg/OiBudW1iZXJbXTtcbn1cblxuaW50ZXJmYWNlIE5wY0RhdGEge1xuICBoaXRib3g/OiBIaXRib3g7XG4gIHRlcnJhaW4/OiBUZXJyYWluO1xuICBjaGVjaz86IENoZWNrW107XG59XG5cbmludGVyZmFjZSBIaXRib3gge1xuICB4MDogbnVtYmVyO1xuICB5MDogbnVtYmVyO1xuICB4MTogbnVtYmVyO1xuICB5MTogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgQ2FwYWJpbGl0eURhdGEge1xuICBjb25kaXRpb24/OiBSZXF1aXJlbWVudDtcbiAgY2FwYWJpbGl0eTogcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXTtcbn1cblxuLy8gU3RhdGljIG1hcCBvZiB0ZXJyYWlucy5cbmNvbnN0IFRFUlJBSU5TOiBBcnJheTxUZXJyYWluIHwgdW5kZWZpbmVkPiA9ICgoKSA9PiB7XG4gIGNvbnN0IG91dCA9IFtdO1xuICBmb3IgKGxldCBlZmZlY3RzID0gMDsgZWZmZWN0cyA8IDEyODsgZWZmZWN0cysrKSB7XG4gICAgb3V0W2VmZmVjdHNdID0gdGVycmFpbihlZmZlY3RzKTtcbiAgfVxuICAvLyBjb25zb2xlLmxvZygnVEVSUkFJTlMnLCBvdXQpO1xuICByZXR1cm4gb3V0O1xuXG4gIC8qKlxuICAgKiBAcGFyYW0gZWZmZWN0cyBUaGUgJDI2IGJpdHMgb2YgdGlsZWVmZmVjdHMsIHBsdXMgJDA4IGZvciBzd2FtcCwgJDEwIGZvciBkb2xwaGluLFxuICAgKiAkMDEgZm9yIHNob290aW5nIHN0YXR1ZXMsICQ0MCBmb3Igc2hvcnQgc2xvcGVcbiAgICogQHJldHVybiB1bmRlZmluZWQgaWYgdGhlIHRlcnJhaW4gaXMgaW1wYXNzYWJsZS5cbiAgICovXG4gIGZ1bmN0aW9uIHRlcnJhaW4oZWZmZWN0czogbnVtYmVyKTogVGVycmFpbiB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKGVmZmVjdHMgJiAweDA0KSByZXR1cm4gdW5kZWZpbmVkOyAvLyBpbXBhc3NpYmxlXG4gICAgY29uc3QgdGVycmFpbjogVGVycmFpbiA9IHt9O1xuICAgIGlmICgoZWZmZWN0cyAmIDB4MTIpID09PSAweDEyKSB7IC8vIGRvbHBoaW4gb3IgZmx5XG4gICAgICBpZiAoZWZmZWN0cyAmIDB4MjApIHRlcnJhaW4uZXhpdCA9IENhcGFiaWxpdHkuQ0xJTUJfV0FURVJGQUxMO1xuICAgICAgdGVycmFpbi5lbnRlciA9IG9yKEV2ZW50LlJJREVfRE9MUEhJTiwgTWFnaWMuRkxJR0hUKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGVmZmVjdHMgJiAweDQwKSB7IC8vIHNob3J0IHNsb3BlXG4gICAgICAgIHRlcnJhaW4uZXhpdCA9IENhcGFiaWxpdHkuQ0xJTUJfU0xPUEU7XG4gICAgICB9IGVsc2UgaWYgKGVmZmVjdHMgJiAweDIwKSB7IC8vIHNsb3BlXG4gICAgICAgIHRlcnJhaW4uZXhpdCA9IE1hZ2ljLkZMSUdIVDtcbiAgICAgIH1cbiAgICAgIGlmIChlZmZlY3RzICYgMHgwMikgdGVycmFpbi5lbnRlciA9IE1hZ2ljLkZMSUdIVDsgLy8gbm8td2Fsa1xuICAgIH1cbiAgICBpZiAoZWZmZWN0cyAmIDB4MDgpIHsgLy8gc3dhbXBcbiAgICAgIHRlcnJhaW4uZW50ZXIgPSAodGVycmFpbi5lbnRlciB8fCBbW11dKS5tYXAoY3MgPT4gQ2FwYWJpbGl0eS5UUkFWRUxfU1dBTVBbMF0uY29uY2F0KGNzKSk7XG4gICAgfVxuICAgIGlmIChlZmZlY3RzICYgMHgwMSkgeyAvLyBzaG9vdGluZyBzdGF0dWVzXG4gICAgICB0ZXJyYWluLmVudGVyID0gKHRlcnJhaW4uZW50ZXIgfHwgW1tdXSkubWFwKGNzID0+IENhcGFiaWxpdHkuU0hPT1RJTkdfU1RBVFVFWzBdLmNvbmNhdChjcykpO1xuICAgIH1cbiAgICByZXR1cm4gdGVycmFpbjtcbiAgfVxufSkoKTtcblxuLy8gVE9ETyAtIGZpZ3VyZSBvdXQgd2hhdCB0aGlzIGxvb2tzIGxpa2UuLi4/XG4vLyAgLSBtYXliZSB3ZSBqdXN0IHdhbnQgdG8gbWFrZSBhIHBzZXVkbyBERUZFQVRFRF9JTlNFQ1QgZXZlbnQsIGJ1dCB0aGlzIHdvdWxkIG5lZWQgdG8gYmVcbi8vICAgIHNlcGFyYXRlIGZyb20gMTAxLCBzaW5jZSB0aGF0J3MgYXR0YWNoZWQgdG8gdGhlIGl0ZW1nZXQsIHdoaWNoIHdpbGwgbW92ZSB3aXRoIHRoZSBzbG90IVxuLy8gIC0gcHJvYmFibHkgd2FudCBhIGZsYWcgZm9yIGVhY2ggYm9zcyBkZWZlYXRlZC4uLj9cbi8vICAgIGNvdWxkIHVzZSBib3Nza2lsbCBJRCBmb3IgaXQ/XG4vLyAgICAtIHRoZW4gbWFrZSB0aGUgZHJvcCBhIHNpbXBsZSBkZXJpdmF0aXZlIGZyb20gdGhhdC4uLlxuLy8gICAgLSB1cHNob3QgLSBubyBsb25nZXIgbmVlZCB0byBtaXggaXQgaW50byBucGMoKSBvciB0cmlnZ2VyKCkgb3ZlcmxheSwgaW5zdGVhZCBtb3ZlIGl0XG4vLyAgICAgIHRvIGNhcGFiaWxpdHkgb3ZlcmxheS5cbi8vIGZ1bmN0aW9uIHNsb3RGb3I8VD4oaXRlbTogVCk6IFQgeyByZXR1cm4gaXRlbTsgfVxuIl19