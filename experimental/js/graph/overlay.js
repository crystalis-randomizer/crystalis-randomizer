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
            if (action === 0x03) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9ncmFwaC9vdmVybGF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFTLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFDN0QsSUFBSSxFQUFxQixHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQUUsUUFBUSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBSy9DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFhbkMsTUFBTSxjQUFjLEdBQUc7SUFDckIsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBRUwsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBR0wsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSztJQUUxQixLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSztJQUN0RCxLQUFLO0lBQ0wsS0FBSztJQUNM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SUFBSSxPQUFPLEdBQUcsSUFBSSxFQUFFO2dCQUNsQixPQUFPLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUM7YUFDdkM7aUJBQU0sSUFBSSxPQUFPLEdBQUcsSUFBSSxFQUFFO2dCQUN6QixPQUFPLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7YUFDN0I7WUFDRCxJQUFJLE9BQU8sR0FBRyxJQUFJO2dCQUFFLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztTQUNsRDtRQUNELElBQUksT0FBTyxHQUFHLElBQUksRUFBRTtZQUNsQixPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUMxRjtRQUNELElBQUksT0FBTyxHQUFHLElBQUksRUFBRTtZQUNsQixPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUM3RjtRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7QUFDSCxDQUFDLENBQUMsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtCb3NzLCBDYXBhYmlsaXR5LCBDaGVjaywgQ29uZGl0aW9uLCBFdmVudCwgSXRlbSwgTWFnaWMsIE11dGFibGVSZXF1aXJlbWVudCxcbiAgICAgICAgUmVxdWlyZW1lbnQsIFNsb3QsIFRlcnJhaW4sIFdhbGxUeXBlLCBhbmQsIG1lZXQsIG9yfSBmcm9tICcuL2NvbmRpdGlvbi5qcyc7XG5pbXBvcnQge1RpbGVJZCwgU2NyZWVuSWR9IGZyb20gJy4vZ2VvbWV0cnkuanMnO1xuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtCb3NzIGFzIFJvbUJvc3N9IGZyb20gJy4uL3JvbS9ib3NzZXMuanMnO1xuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnLi4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7U2hvcFR5cGV9IGZyb20gJy4uL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7aGV4fSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5cbi8vIEFkZGl0aW9uYWwgaW5mb3JtYXRpb24gbmVlZGVkIHRvIGludGVycHJldCB0aGUgd29ybGQgZ3JhcGggZGF0YS5cbi8vIFRoaXMgZ2V0cyBpbnRvIG1vcmUgc3BlY2lmaWNzIGFuZCBoYXJkY29kaW5nLlxuXG4vLyBUT0RPIC0gbWF5YmUgY29uc2lkZXIgaGF2aW5nIGEgc2V0IG9mIEFTU1VNRUQgYW5kIGEgc2V0IG9mIElHTk9SRUQgZmxhZ3M/XG4vLyAgICAgIC0gZS5nLiBhbHdheXMgYXNzdW1lIDAwZiBpcyBGQUxTRSByYXRoZXIgdGhhbiBUUlVFLCB0byBhdm9pZCBmcmVlIHdpbmRtaWxsIGtleVxuXG5cbi8vIFRPRE8gLSBwcmlzb24ga2V5IG1pc3NpbmcgZnJvbSBwYXJhbHlzaXMgZGVwcyAob3IgcmF0aGVyIGEgbm9uLWZsaWdodCB2ZXJzaW9uKSFcblxuXG5cbmNvbnN0IFJFTEVWQU5UX0ZMQUdTID0gW1xuICAweDAwYSwgLy8gdXNlZCB3aW5kbWlsbCBrZXlcbiAgMHgwMGIsIC8vIHRhbGtlZCB0byBsZWFmIGVsZGVyXG4gIDB4MDEzLCAvLyBraWxsZWQgc2FiZXJhIDFcbiAgMHgwMTgsIC8vIGVudGVyZWQgdW5kZXJncm91bmQgY2hhbm5lbFxuICAweDAxYiwgLy8gbWVzaWEgcmVjb3JkaW5nIHBsYXllZFxuICAweDAxZSwgLy8gcXVlZW4gcmV2ZWFsZWRcbiAgMHgwMjEsIC8vIHJldHVybmVkIGZvZyBsYW1wXG4gIC8vIDB4MDI0LCAvLyBnZW5lcmFscyBkZWZlYXRlZCAoZ290IGl2b3J5IHN0YXR1ZSlcbiAgMHgwMjUsIC8vIGhlYWxlZCBkb2xwaGluXG4gIDB4MDI2LCAvLyBlbnRlcmVkIHNoeXJvbiAoZm9yIGdvYSBndWFyZHMpXG4gIDB4MDI3LCAvLyBzaHlyb24gbWFzc2FjcmVcbiAgLy8gMHgzNSwgLy8gY3VyZWQgYWthaGFuYVxuICAweDAzOCwgLy8gbGVhZiBhYmR1Y3Rpb25cbiAgMHgwM2EsIC8vIHRhbGtlZCB0byB6ZWJ1IGluIGNhdmUgKGFkZGVkIGFzIHJlcSBmb3IgYWJkdWN0aW9uKVxuICAweDAzYiwgLy8gdGFsa2VkIHRvIHplYnUgaW4gc2h5cm9uIChhZGRlZCBhcyByZXEgZm9yIG1hc3NhY3JlKVxuICAweDA0NSwgLy8gcmVzY3VlZCBjaGlsZFxuICAweDA1MiwgLy8gdGFsa2VkIHRvIGR3YXJmIG1vdGhlclxuICAweDA1MywgLy8gY2hpbGQgZm9sbG93aW5nXG4gIDB4MDYxLCAvLyB0YWxrZWQgdG8gc3RvbSBpbiBzd2FuIGh1dFxuICAweDA2NywgLy8ga2lsbGVkIG1hZG8gMVxuICAvLyAweDA2YywgLy8gZGVmZWF0ZWQgZHJheWdvbiAxXG4gIDB4MDcyLCAvLyBrZW5zdSBmb3VuZCBpbiB0YXZlcm5cbiAgMHgwOGIsIC8vIGdvdCBzaGVsbCBmbHV0ZVxuICAweDA5YiwgLy8gYWJsZSB0byByaWRlIGRvbHBoaW5cbiAgMHgwYTUsIC8vIHRhbGtlZCB0byB6ZWJ1IHN0dWRlbnRcbiAgMHgwYTksIC8vIHRhbGtlZCB0byBsZWFmIHJhYmJpdFxuICAweDEwMCwgLy8ga2lsbGVkIHZhbXBpcmUgMVxuICAweDEwMSwgLy8ga2lsbGVkIGluc2VjdFxuICAweDEwMiwgLy8ga2lsbGVkIGtlbGJlc3F1ZSAxXG4gIDB4MTAzLCAvLyByYWdlXG4gIDB4MTA1LCAvLyBraWxsZWQga2VsYmVzcXVlIDJcbiAgMHgxMDYsIC8vIGtpbGxlZCBzYWJlcmEgMlxuICAweDEwNywgLy8ga2lsbGVkIG1hZG8gMlxuICAweDEwOCwgLy8ga2lsbGVkIGthcm1pbmVcbiAgMHgxMGIsIC8vIGtpbGxlZCBkcmF5Z29uIDFcbiAgMHgxMGMsIC8vIGtpbGxlZCB2YW1waXJlIDJcblxuICAvLyBzd29yZHMgKG1heSBiZSBuZWVkZWQgZm9yIHJhZ2UsIFNvVCBmb3IgbWFzc2FjcmUpXG4gIDB4MjAwLCAweDIwMSwgMHgyMDIsIDB4MjAzLFxuICAvLyBiYWxscyBhbmQgYnJhY2VsZXRzIG1heSBiZSBuZWVkZWQgZm9yIHRlbGVwb3J0XG4gIDB4MjA1LCAweDIwNiwgMHgyMDcsIDB4MjA4LCAweDIwOSwgMHgyMGEsIDB4MjBiLCAweDIwYyxcbiAgMHgyMzYsIC8vIHNoZWxsIGZsdXRlIChmb3IgZmlzaGVybWFuIHNwYXduKVxuICAweDI0MywgLy8gdGVsZXBhdGh5IChmb3IgcmFiYml0LCBvYWssIGRlbylcbiAgMHgyNDQsIC8vIHRlbGVwb3J0IChmb3IgbXQgc2FicmUgdHJpZ2dlcilcbiAgMHgyODMsIC8vIGNhbG1lZCBzZWEgKGZvciBiYXJyaWVyKVxuICAweDI4ZCwgLy8ga2lsbGVkIGRyYXlnb24gMiAod2FsbCBkZXN0cm95ZWQpXG4gIDB4MmVlLCAvLyBzdGFydGVkIHdpbmRtaWxsIChmb3IgcmVmcmVzaClcblxuICAvLyBOT1RFOiB0aGVzZSBhcmUgbW92ZWQgYmVjYXVzZSBvZiB6b21iaWUgd2FycCFcbiAgMHgyZjYsIC8vIHdhcnA6b2FrIChmb3IgdGVsZXBhdGh5KVxuICAvLyAweDJmYSwgLy8gd2FycDpqb2VsIChmb3IgZXZpbCBzcGlyaXQgaXNsYW5kKVxuICAweDJmZCwgLy8gd2FycDpzaHlyb24gKGZvciB0ZWxlcGF0aHkpXG5cbiAgLy8gTWFnaWMuQ0hBTkdFWzBdWzBdLFxuICAvLyBNYWdpYy5URUxFUEFUSFlbMF1bMF0sXG5dO1xuXG4vLyBUT0RPIC0gdGhpcyBpcyBub3QgcGVydmFzaXZlIGVub3VnaCEhIVxuLy8gIC0gbmVlZCBhIHdheSB0byBwdXQgaXQgZXZlcnl3aGVyZVxuLy8gICAgLT4gbWF5YmUgaW4gTXV0YWJsZVJlcXVpcmVtZW50cz9cbmNvbnN0IEZMQUdfTUFQOiBNYXA8bnVtYmVyLCByZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dPiA9IG5ldyBNYXAoW1xuICBbMHgwMGEsIEV2ZW50LlNUQVJURURfV0lORE1JTExdLCAvLyB0aGlzIGlzIHJlZidkIG91dHNpZGUgdGhpcyBmaWxlIVxuICAvL1sweDAwZSwgTWFnaWMuVEVMRVBBVEhZXSxcbiAgLy9bMHgwM2YsIE1hZ2ljLlRFTEVQT1JUXSxcbiAgLy8gUXVlZW4gd2lsbCBnaXZlIGZsdXRlIG9mIGxpbWUgdy9vIHBhcmFseXNpcyBpbiB0aGlzIGNhc2UuXG4gIFsweDAxNywgSXRlbS5TV09SRF9PRl9XQVRFUl0sXG4gIFsweDAyOCwgTWFnaWMuQ0hBTkdFXSxcbiAgWzB4MDI5LCBNYWdpYy5DSEFOR0VdLFxuICBbMHgwMmEsIE1hZ2ljLkNIQU5HRV0sXG4gIFsweDAyYiwgTWFnaWMuQ0hBTkdFXSxcbiAgWzB4MDZjLCBCb3NzLkRSQVlHT04xXSxcbiAgWzB4MDhiLCBJdGVtLlNIRUxMX0ZMVVRFXSxcbiAgWzB4MGVlLCBFdmVudC5SSURFX0RPTFBISU5dLCAvLyBOT1RFOiBjdXN0b20gZmxhZ1xuXSk7XG5cbi8vIE1hcHMgdHJpZ2dlciBhY3Rpb25zIHRvIHRoZSBzbG90IHRoZXkgZ3JhbnQuXG5jb25zdCBUUklHR0VSX0FDVElPTl9JVEVNUzoge1thY3Rpb246IG51bWJlcl06IFNsb3R9ID0ge1xuICAweDA4OiBTbG90KE1hZ2ljLlBBUkFMWVNJUyksXG4gIDB4MGI6IFNsb3QoTWFnaWMuQkFSUklFUiksXG4gIDB4MGY6IFNsb3QoTWFnaWMuUkVGUkVTSCksXG4gIDB4MTg6IFNsb3QoTWFnaWMuVEVMRVBBVEhZKSxcbn07XG5cbmNvbnN0IFNXT1JEUyA9IFtJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uU1dPUkRfT0ZfRklSRSxcbiAgICAgICAgICAgICAgICBJdGVtLlNXT1JEX09GX1dBVEVSLCBJdGVtLlNXT1JEX09GX1RIVU5ERVJdIGFzIGNvbnN0O1xuY29uc3QgU1dPUkRfUE9XRVJTID0gW1xuICBbSXRlbS5PUkJfT0ZfV0lORCwgSXRlbS5UT1JOQURPX0JSQUNFTEVUXSxcbiAgW0l0ZW0uT1JCX09GX0ZJUkUsIEl0ZW0uRkxBTUVfQlJBQ0VMRVRdLFxuICBbSXRlbS5PUkJfT0ZfV0FURVIsIEl0ZW0uQkxJWlpBUkRfQlJBQ0VMRVRdLFxuICBbSXRlbS5PUkJfT0ZfVEhVTkRFUiwgSXRlbS5TVE9STV9CUkFDRUxFVF0sXG5dIGFzIGNvbnN0O1xuXG5mdW5jdGlvbiBzd29yZFJlcXVpcmVtZW50KHN3b3JkOiBudW1iZXIsIGxldmVsOiBudW1iZXIpOiBSZXF1aXJlbWVudCB7XG4gIGxldCByO1xuICBpZiAobGV2ZWwgPT09IDEpIHI9IFNXT1JEU1tzd29yZF07XG4gIGVsc2UgaWYgKGxldmVsID09PSAzKSByPSBhbmQoU1dPUkRTW3N3b3JkXSwgLi4uU1dPUkRfUE9XRVJTW3N3b3JkXSk7XG4gIGVsc2Ugcj0gb3IoLi4uU1dPUkRfUE9XRVJTW3N3b3JkXS5tYXAocCA9PiBhbmQoU1dPUkRTW3N3b3JkXSwgcCkpKTtcbiAgaWYgKEFycmF5LmlzQXJyYXkoclswXVswXSkpIHRocm93IG5ldyBFcnJvcigpO1xuICByZXR1cm4gcjtcbn1cblxuZXhwb3J0IGNsYXNzIE92ZXJsYXkge1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgcmVsZXZhbnRGbGFncyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAvLyBucGMgaWQgLT4gd2FudGVkIGl0ZW1cbiAgcHJpdmF0ZSByZWFkb25seSB0cmFkZUlucyA9IG5ldyBNYXA8bnVtYmVyLCByZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dPigpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc2hvb3RpbmdTdGF0dWVzID0gbmV3IFNldDxTY3JlZW5JZD4oKTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgZmxhZ3M6IEZsYWdTZXQsXG4gICAgICAgICAgICAgIHByaXZhdGUgcmVhZG9ubHkgdHJhY2tlcjogYm9vbGVhbikge1xuICAgIC8vIFRPRE8gLSBhZGp1c3QgYmFzZWQgb24gZmxhZ3NldD9cbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgUkVMRVZBTlRfRkxBR1MpIHtcbiAgICAgIHRoaXMucmVsZXZhbnRGbGFncy5hZGQoZmxhZyk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgaXRlbSBvZiByb20uaXRlbXMpIHtcbiAgICAgIGlmICghaXRlbS50cmFkZUluKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGNvbmQgPSBpdGVtLmlkID09PSAweDFkID8gQ2FwYWJpbGl0eS5CVVlfSEVBTElORyA6IEl0ZW0oaXRlbS5pZCk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW0udHJhZGVJbi5sZW5ndGg7IGkgKz0gNikge1xuICAgICAgICB0aGlzLnRyYWRlSW5zLnNldChpdGVtLnRyYWRlSW5baV0sIGNvbmQpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgICAgaWYgKHNwYXduLmlzTW9uc3RlcigpICYmIHNwYXduLmlkID09PSAweDNmKSB7IC8vIHNob290aW5nIHN0YXR1ZXNcbiAgICAgICAgICB0aGlzLnNob290aW5nU3RhdHVlcy5hZGQoU2NyZWVuSWQuZnJvbShsb2MsIHNwYXduKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gICAweDFkLCAvLyBtZWRpY2FsIGhlcmJcbiAgICAvLyAgIDB4MjUsIC8vIHN0YXR1ZSBvZiBvbnl4XG4gICAgLy8gICAweDM1LCAvLyBmb2cgbGFtcFxuICAgIC8vICAgMHgzYiwgLy8gbG92ZSBwZW5kYW50XG4gICAgLy8gICAweDNjLCAvLyBraXJpc2EgcGxhbnRcbiAgICAvLyAgIDB4M2QsIC8vIGl2b3J5IHN0YXR1ZVxuICAgIC8vIF0ubWFwKGkgPT4gdGhpcy5yb20uaXRlbXNbaV0pO1xuICB9XG5cbiAgLyoqIEBwYXJhbSBpZCBPYmplY3QgSUQgb2YgdGhlIGJvc3MuICovXG4gIGJvc3NSZXF1aXJlbWVudHMoYm9zczogUm9tQm9zcyk6IFJlcXVpcmVtZW50IHtcbiAgICAvLyBUT0RPIC0gaGFuZGxlIGJvc3Mgc2h1ZmZsZSBzb21laG93P1xuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMucmFnZSkge1xuICAgICAgaWYgKHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzLnJhbmRvbWl6ZVRyYWRlcygpKSByZXR1cm4gQ2FwYWJpbGl0eS5TV09SRDtcbiAgICAgIC8vIHJldHVybiBJdGVtLlNXT1JEX09GX1dBVEVSO1xuICAgICAgcmV0dXJuIENvbmRpdGlvbih0aGlzLnJvbS5ucGNzWzB4YzNdLmxvY2FsRGlhbG9ncy5nZXQoLTEpIVswXS5jb25kaXRpb24pO1xuICAgIH1cbiAgICBjb25zdCBpZCA9IGJvc3Mub2JqZWN0O1xuICAgIGNvbnN0IG91dCA9IG5ldyBNdXRhYmxlUmVxdWlyZW1lbnQoKTtcbiAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3Muc2h1ZmZsZUJvc3NFbGVtZW50cygpKSB7XG4gICAgICBvdXQuYWRkQWxsKENhcGFiaWxpdHkuU1dPUkQpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5mbGFncy5ndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkpIHtcbiAgICAgIGNvbnN0IGxldmVsID0gdGhpcy5mbGFncy5ndWFyYW50ZWVTd29yZE1hZ2ljKCkgPyBib3NzLnN3b3JkTGV2ZWwgOiAxO1xuICAgICAgY29uc3Qgb2JqID0gdGhpcy5yb20ub2JqZWN0c1tpZF07XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICBpZiAob2JqLmlzVnVsbmVyYWJsZShpKSkgb3V0LmFkZEFsbChzd29yZFJlcXVpcmVtZW50KGksIGxldmVsKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dC5hZGRBbGwoQ2FwYWJpbGl0eS5TV09SRCk7XG4gICAgfVxuICAgIGNvbnN0IGV4dHJhOiBDYXBhYmlsaXR5W10gPSBbXTtcbiAgICBpZiAodGhpcy5mbGFncy5ndWFyYW50ZWVSZWZyZXNoKCkpIHtcbiAgICAgIC8vIFRPRE8gLSBtYWtlIHRoaXMgXCJndWFyYW50ZWUgZGVmZW5zaXZlIG1hZ2ljXCIgYW5kIGFsbG93IHJlZnJlc2ggT1IgYmFycmllcj9cbiAgICAgIGV4dHJhLnB1c2goTWFnaWMuUkVGUkVTSCk7XG4gICAgfVxuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuaW5zZWN0KSB7IC8vIGluc2VjdFxuICAgICAgZXh0cmEucHVzaChJdGVtLklOU0VDVF9GTFVURSwgSXRlbS5HQVNfTUFTSyk7XG4gICAgfVxuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuZHJheWdvbjIpIHtcbiAgICAgIGV4dHJhLnB1c2goSXRlbS5CT1dfT0ZfVFJVVEgpO1xuICAgICAgaWYgKHRoaXMuZmxhZ3Muc3RvcnlNb2RlKCkpIHtcbiAgICAgICAgZXh0cmEucHVzaChcbiAgICAgICAgICBCb3NzLktFTEJFU1FVRTEsXG4gICAgICAgICAgQm9zcy5LRUxCRVNRVUUyLFxuICAgICAgICAgIEJvc3MuU0FCRVJBMSxcbiAgICAgICAgICBCb3NzLlNBQkVSQTIsXG4gICAgICAgICAgQm9zcy5NQURPMSxcbiAgICAgICAgICBCb3NzLk1BRE8yLFxuICAgICAgICAgIEJvc3MuS0FSTUlORSxcbiAgICAgICAgICBCb3NzLkRSQVlHT04xLFxuICAgICAgICAgIEl0ZW0uU1dPUkRfT0ZfV0lORCxcbiAgICAgICAgICBJdGVtLlNXT1JEX09GX0ZJUkUsXG4gICAgICAgICAgSXRlbS5TV09SRF9PRl9XQVRFUixcbiAgICAgICAgICBJdGVtLlNXT1JEX09GX1RIVU5ERVIpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZXh0cmEubGVuZ3RoKSB7XG4gICAgICBvdXQucmVzdHJpY3QoYW5kKC4uLmV4dHJhKSk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuZnJlZXplKCk7XG4gIH1cblxuICBsb2NhdGlvbnMoKTogVGlsZUNoZWNrW10ge1xuICAgIGNvbnN0IGxvY2F0aW9uczogVGlsZUNoZWNrW10gPSBbXTtcbiAgICAvLyBUT0RPIC0gcHVsbCB0aGUgbG9jYXRpb24gb3V0IG9mIGl0ZW1Vc2VEYXRhWzBdIGZvciB0aGVzZSBpdGVtc1xuICAgIGxvY2F0aW9ucy5wdXNoKHtcbiAgICAgIHRpbGU6IFRpbGVJZCgweDBmMDA4OCksXG4gICAgICBzbG90OiBTbG90KEV2ZW50LlNUQVJURURfV0lORE1JTEwpLFxuICAgICAgY29uZGl0aW9uOiBJdGVtLldJTkRNSUxMX0tFWSxcbiAgICB9LCB7XG4gICAgICB0aWxlOiBUaWxlSWQoMHhlNDAwODgpLFxuICAgICAgc2xvdDogU2xvdChFdmVudC5PUEVORURfSk9FTF9TSEVEKSxcbiAgICAgIGNvbmRpdGlvbjogSXRlbS5FWUVfR0xBU1NFUyxcbiAgICB9KTtcbiAgICBmb3IgKGNvbnN0IHNob3Agb2YgdGhpcy5yb20uc2hvcHMpIHtcbiAgICAgIC8vIGxlYWYgYW5kIHNoeXJvbiBtYXkgbm90IGFsd2F5cyBiZSBhY2Nlc3NpYmxlLCBzbyBkb24ndCByZWx5IG9uIHRoZW0uXG4gICAgICBpZiAoc2hvcC5sb2NhdGlvbiA9PT0gMHhjMyB8fCBzaG9wLmxvY2F0aW9uID09PSAweGY2KSBjb250aW51ZTtcbiAgICAgIGlmICghc2hvcC51c2VkKSBjb250aW51ZTtcbiAgICAgIGlmIChzaG9wLnR5cGUgIT09IFNob3BUeXBlLlRPT0wpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgY2hlY2sgPSB7XG4gICAgICAgIHRpbGU6IFRpbGVJZChzaG9wLmxvY2F0aW9uIDw8IDE2IHwgMHg4OCksXG4gICAgICAgIGNvbmRpdGlvbjogQ2FwYWJpbGl0eS5NT05FWSxcbiAgICAgIH07XG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygc2hvcC5jb250ZW50cykge1xuICAgICAgICBpZiAoaXRlbSA9PT0gKEl0ZW0uTUVESUNBTF9IRVJCWzBdWzBdICYgMHhmZikpIHtcbiAgICAgICAgICBsb2NhdGlvbnMucHVzaCh7Li4uY2hlY2ssIHNsb3Q6IFNsb3QoQ2FwYWJpbGl0eS5CVVlfSEVBTElORyl9KTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSAoSXRlbS5XQVJQX0JPT1RTWzBdWzBdICYgMHhmZikpIHtcbiAgICAgICAgICBsb2NhdGlvbnMucHVzaCh7Li4uY2hlY2ssIHNsb3Q6IFNsb3QoQ2FwYWJpbGl0eS5CVVlfV0FSUCl9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbG9jYXRpb25zO1xuICB9XG5cbiAgLyoqIFJldHVybnMgdW5kZWZpbmVkIGlmIGltcGFzc2FibGUuICovXG4gIG1ha2VUZXJyYWluKGVmZmVjdHM6IG51bWJlciwgdGlsZTogVGlsZUlkKTogVGVycmFpbiB8IHVuZGVmaW5lZCB7XG4gICAgLy8gQ2hlY2sgZm9yIGRvbHBoaW4gb3Igc3dhbXAuICBDdXJyZW50bHkgZG9uJ3Qgc3VwcG9ydCBzaHVmZmxpbmcgdGhlc2UuXG4gICAgY29uc3QgbG9jID0gdGlsZSA+Pj4gMTY7XG4gICAgZWZmZWN0cyAmPSAweDI2O1xuICAgIGlmIChsb2MgPT09IDB4MWEpIGVmZmVjdHMgfD0gMHgwODtcbiAgICBpZiAobG9jID09PSAweDYwIHx8IGxvYyA9PT0gMHg2OCkgZWZmZWN0cyB8PSAweDEwO1xuICAgIC8vIE5PVEU6IG9ubHkgdGhlIHRvcCBoYWxmLXNjcmVlbiBpbiB1bmRlcmdyb3VuZCBjaGFubmVsIGlzIGRvbHBoaW5hYmxlXG4gICAgaWYgKGxvYyA9PT0gMHg2NCAmJiAoKHRpbGUgJiAweGYwZjApIDwgMHg5MCkpIGVmZmVjdHMgfD0gMHgxMDtcbiAgICBpZiAodGhpcy5zaG9vdGluZ1N0YXR1ZXMuaGFzKFNjcmVlbklkLmZyb21UaWxlKHRpbGUpKSkgZWZmZWN0cyB8PSAweDAxO1xuICAgIGlmIChlZmZlY3RzICYgMHgyMCkgeyAvLyBzbG9wZVxuICAgICAgLy8gRGV0ZXJtaW5lIGxlbmd0aCBvZiBzbG9wZTogc2hvcnQgc2xvcGVzIGFyZSBjbGltYmFibGUuXG4gICAgICAvLyA2LTggYXJlIGJvdGggZG9hYmxlIHdpdGggYm9vdHNcbiAgICAgIC8vIDAtNSBpcyBkb2FibGUgd2l0aCBubyBib290c1xuICAgICAgLy8gOSBpcyBkb2FibGUgd2l0aCByYWJiaXQgYm9vdHMgb25seSAobm90IGF3YXJlIG9mIGFueSBvZiB0aGVzZS4uLilcbiAgICAgIC8vIDEwIGlzIHJpZ2h0IG91dFxuICAgICAgY29uc3QgZ2V0RWZmZWN0cyA9ICh0aWxlOiBUaWxlSWQpOiBudW1iZXIgPT4ge1xuICAgICAgICBjb25zdCBsID0gdGhpcy5yb20ubG9jYXRpb25zW3RpbGUgPj4+IDE2XTtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gbC5zY3JlZW5zWyh0aWxlICYgMHhmMDAwKSA+Pj4gMTJdWyh0aWxlICYgMHhmMDApID4+PiA4XTtcbiAgICAgICAgcmV0dXJuIHRoaXMucm9tLnRpbGVFZmZlY3RzW2wudGlsZUVmZmVjdHMgLSAweGIzXVxuICAgICAgICAgICAgLmVmZmVjdHNbdGhpcy5yb20uc2NyZWVuc1tzY3JlZW5dLnRpbGVzW3RpbGUgJiAweGZmXV07XG4gICAgICB9O1xuICAgICAgbGV0IGJvdHRvbSA9IHRpbGU7XG4gICAgICBsZXQgaGVpZ2h0ID0gLTE7XG4gICAgICB3aGlsZSAoZ2V0RWZmZWN0cyhib3R0b20pICYgMHgyMCkge1xuICAgICAgICBib3R0b20gPSBUaWxlSWQuYWRkKGJvdHRvbSwgMSwgMCk7XG4gICAgICAgIGhlaWdodCsrO1xuICAgICAgfVxuICAgICAgbGV0IHRvcCA9IHRpbGU7XG4gICAgICB3aGlsZSAoZ2V0RWZmZWN0cyh0b3ApICYgMHgyMCkge1xuICAgICAgICB0b3AgPSBUaWxlSWQuYWRkKHRvcCwgLTEsIDApO1xuICAgICAgICBoZWlnaHQrKztcbiAgICAgIH1cbiAgICAgIGlmIChoZWlnaHQgPCA2KSB7XG4gICAgICAgIGVmZmVjdHMgJj0gfjB4MjA7XG4gICAgICB9IGVsc2UgaWYgKGhlaWdodCA8IDkpIHtcbiAgICAgICAgZWZmZWN0cyB8PSAweDQwO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gVEVSUkFJTlNbZWZmZWN0c107XG4gIH1cblxuICAvLyBUT0RPIC0gY29uc2lkZXIgZm9sZGluZyB0aGlzIGludG8gbG9jYXRpb24vdHJpZ2dlci9ucGMgYXMgYW4gZXh0cmEgcmV0dXJuP1xuICBleHRyYVJvdXRlcygpOiBFeHRyYVJvdXRlW10ge1xuICAgIGNvbnN0IHJvdXRlcyA9IFtdO1xuICAgIGNvbnN0IGVudHJhbmNlID0gKGxvY2F0aW9uOiBudW1iZXIsIGVudHJhbmNlOiBudW1iZXIgPSAwKTogVGlsZUlkID0+IHtcbiAgICAgIGNvbnN0IGwgPSB0aGlzLnJvbS5sb2NhdGlvbnNbbG9jYXRpb25dO1xuICAgICAgY29uc3QgZSA9IGwuZW50cmFuY2VzW2VudHJhbmNlXTtcbiAgICAgIHJldHVybiBUaWxlSWQuZnJvbShsLCBlKTtcbiAgICB9O1xuICAgIC8vIFN0YXJ0IHRoZSBnYW1lIGF0IDA6MFxuICAgIHJvdXRlcy5wdXNoKHt0aWxlOiBlbnRyYW5jZSgwKX0pO1xuICAgIC8vIFN3b3JkIG9mIFRodW5kZXIgd2FycFxuICAgIC8vIFRPRE8gLSBlbnRyYW5jZSBzaHVmZmxlIHdpbGwgYnJlYWsgdGhlIGF1dG8td2FycC1wb2ludCBhZmZvcmRhbmNlLlxuICAgIGlmICh0aGlzLmZsYWdzLnRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKSkge1xuICAgICAgY29uc3Qgd2FycCA9IHRoaXMucm9tLnRvd25XYXJwLnRodW5kZXJTd29yZFdhcnA7XG4gICAgICByb3V0ZXMucHVzaCh7XG4gICAgICAgIHRpbGU6IGVudHJhbmNlKHdhcnBbMF0sIHdhcnBbMV0gJiAweDFmKSxcbiAgICAgICAgY29uZGl0aW9uOiBvcihhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBDYXBhYmlsaXR5LkJVWV9XQVJQKSxcbiAgICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBNYWdpYy5URUxFUE9SVCkpLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzLmFzc3VtZVdpbGRXYXJwKCkpIHtcbiAgICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGhpcy5yb20ud2lsZFdhcnAubG9jYXRpb25zKSB7XG4gICAgICAgIHJvdXRlcy5wdXNoKHt0aWxlOiBlbnRyYW5jZShsb2NhdGlvbil9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJvdXRlcztcbiAgfVxuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBmb2xkaW5nIHRoaXMgaW50byBsb2NhdGlvbi90cmlnZ2VyL25wYyBhcyBhbiBleHRyYSByZXR1cm4/XG4gIGV4dHJhRWRnZXMoKTogRXh0cmFFZGdlW10ge1xuICAgIGNvbnN0IGVkZ2VzID0gW107XG4gICAgLy8gbmVlZCBhbiBlZGdlIGZyb20gdGhlIGJvYXQgaG91c2UgdG8gdGhlIGJlYWNoIC0gd2UgY291bGQgYnVpbGQgdGhpcyBpbnRvIHRoZVxuICAgIC8vIGJvYXQgYm9hcmRpbmcgdHJpZ2dlciwgYnV0IGZvciBub3cgaXQncyBoZXJlLlxuICAgIGVkZ2VzLnB1c2goe1xuICAgICAgZnJvbTogVGlsZUlkKDB4NTEwMDg4KSwgLy8gaW4gZnJvbnQgb2YgYm9hdCBob3VzZVxuICAgICAgdG86IFRpbGVJZCgweDYwODY4OCksIC8vIGluIGZyb250IG9mIGNhYmluXG4gICAgICBjb25kaXRpb246IEV2ZW50LlJFVFVSTkVEX0ZPR19MQU1QLFxuICAgIH0pO1xuICAgIHJldHVybiBlZGdlcztcbiAgfVxuXG4gIHRyaWdnZXIoaWQ6IG51bWJlcik6IFRyaWdnZXJEYXRhIHtcbiAgICBzd2l0Y2ggKGlkKSB7XG4gICAgY2FzZSAweDlhOiAvLyBzdGFydCBmaWdodCB3aXRoIG1hZG8gaWYgc2h5cm9uIG1hc3NhY3JlIHN0YXJ0ZWRcbiAgICAgIC8vIFRPRE8gLSBsb29rIHVwIHdobyB0aGUgYWN0dWFsIGJvc3MgaXMgb25jZSB3ZSBnZXQgYm9zcyBzaHVmZmxlISEhXG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IG1lZXQoRXZlbnQuU0hZUk9OX01BU1NBQ1JFLCB0aGlzLmJvc3NSZXF1aXJlbWVudHModGhpcy5yb20uYm9zc2VzLm1hZG8xKSksXG4gICAgICAgIHNsb3Q6IFNsb3QoQm9zcy5NQURPMSksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFhOiAvLyBlbnRlciBvYWsgYWZ0ZXIgaW5zZWN0XG4gICAgICAvLyBOT1RFOiBUaGlzIGlzIG5vdCB0aGUgdHJpZ2dlciB0aGF0IGNoZWNrcywgYnV0IHJhdGhlciBpdCBoYXBwZW5zIG9uIHRoZSBlbnRyYW5jZS5cbiAgICAgIC8vIFRoaXMgaXMgYSBjb252ZW5pZW50IHBsYWNlIHRvIGhhbmRsZSBpdCwgdGhvdWdoLCBzaW5jZSB3ZSBhbHJlYWR5IG5lZWQgdG8gZXhwbGljaXRseVxuICAgICAgLy8gaWdub3JlIHRoaXMgdHJpZ2dlci4gIFdlIGFsc28gcmVxdWlyZSB3YXJwIGJvb3RzIGJlY2F1c2UgaXQncyBwb3NzaWJsZSB0aGF0IHRoZXJlJ3NcbiAgICAgIC8vIG5vIGRpcmVjdCB3YWxraW5nIHBhdGggYW5kIGl0J3Mgbm90IGZlYXNpYmxlIHRvIGNhcnJ5IHRoZSBjaGlsZCB3aXRoIHVzIGV2ZXJ5d2hlcmUsXG4gICAgICAvLyBkdWUgdG8gZ3JhcGhpY3MgcmVhc29ucy5cbiAgICAgIHJldHVybiB7Y2hlY2s6W3tcbiAgICAgICAgY29uZGl0aW9uOiBhbmQoRXZlbnQuRFdBUkZfQ0hJTEQsIENhcGFiaWxpdHkuQlVZX1dBUlApLFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50LlJFU0NVRURfQ0hJTEQpLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhhZDogLy8gYWxsb3cgb3BlbmluZyBwcmlzb24gZG9vclxuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBJdGVtLktFWV9UT19QUklTT04sXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX1BSSVNPTiksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFlOiAvLyBhbGxvdyBvcGVuaW5nIHN0eHlcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogSXRlbS5LRVlfVE9fU1RZWCxcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5PUEVORURfU1RZWCksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFmOiAvLyBhbGxvdyBjYWxtaW5nIHNlYVxuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBJdGVtLlNUQVRVRV9PRl9HT0xELFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50LkNBTE1FRF9TRUEpLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhiMTogLy8gc3RhcnQgZmlnaHQgd2l0aCBndWFyZGlhbiBzdGF0dWVzXG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IGFuZChJdGVtLkJPV19PRl9TVU4sIEl0ZW0uQk9XX09GX01PT04pLFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9DUllQVCksXG4gICAgICB9XX07XG4gICAgfVxuICAgIC8vIENoZWNrIGZvciByZWxldmFudCBmbGFncyBhbmQga25vd24gYWN0aW9uIHR5cGVzLlxuICAgIGNvbnN0IHRyaWdnZXIgPSB0aGlzLnJvbS50cmlnZ2Vyc1tpZCAmIDB4N2ZdO1xuICAgIGlmICghdHJpZ2dlciB8fCAhdHJpZ2dlci51c2VkKSB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHJpZ2dlcjogJHtoZXgoaWQpfWApO1xuICAgIGNvbnN0IHJlbGV2YW50ID0gKGY6IG51bWJlcikgPT4gdGhpcy5yZWxldmFudEZsYWdzLmhhcyhmKTtcbiAgICBjb25zdCByZWxldmFudEFuZFNldCA9IChmOiBudW1iZXIpID0+IGYgPiAwICYmIHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZik7XG4gICAgZnVuY3Rpb24gbWFwKGY6IG51bWJlcik6IG51bWJlciB7XG4gICAgICBpZiAoZiA8IDApIHJldHVybiB+bWFwKH5mKTtcbiAgICAgIGNvbnN0IG1hcHBlZCA9IEZMQUdfTUFQLmdldChmKTtcbiAgICAgIHJldHVybiBtYXBwZWQgIT0gbnVsbCA/IG1hcHBlZFswXVswXSA6IGY7XG4gICAgfVxuICAgIGNvbnN0IGFjdGlvbkl0ZW0gPSBUUklHR0VSX0FDVElPTl9JVEVNU1t0cmlnZ2VyLm1lc3NhZ2UuYWN0aW9uXTtcbiAgICBjb25zdCBjb25kaXRpb24gPSBhbmQoLi4udHJpZ2dlci5jb25kaXRpb25zLm1hcChtYXApLmZpbHRlcihyZWxldmFudEFuZFNldCkubWFwKENvbmRpdGlvbikpO1xuICAgIGlmICh0cmlnZ2VyLm1lc3NhZ2UuYWN0aW9uID09PSAweDE5KSB7IC8vIHB1c2gtZG93biB0cmlnZ2VyXG4gICAgICAvLyBUT0RPIC0gcGFzcyBpbiB0ZXJyYWluOyBpZiBvbiBsYW5kIGFuZCB0cmlnZ2VyIHNraXAgaXMgb24gdGhlblxuICAgICAgLy8gYWRkIGEgcm91dGUgcmVxdWlyaW5nIHJhYmJpdCBib290cyBhbmQgZWl0aGVyIHdhcnAgYm9vdHMgb3IgdGVsZXBvcnQ/XG4gICAgICBjb25zdCBleHRyYTogVHJpZ2dlckRhdGEgPSB7fTtcbiAgICAgIGlmICh0cmlnZ2VyLmlkID09PSAweDg2ICYmICF0aGlzLmZsYWdzLmFzc3VtZVJhYmJpdFNraXAoKSkge1xuICAgICAgICBleHRyYS5keCA9IFstMzIsIC0xNiwgMCwgMTZdO1xuICAgICAgfVxuICAgICAgaWYgKHRyaWdnZXIuaWQgPT09IDB4YmEgJiZcbiAgICAgICAgICAhdGhpcy5mbGFncy5kaXNhYmxlVGVsZXBvcnRTa2lwKCkgJiZcbiAgICAgICAgICAhdGhpcy5mbGFncy5hc3N1bWVUZWxlcG9ydFNraXAoKSkge1xuICAgICAgICBleHRyYS5leHRyYUxvY2F0aW9ucyA9IFt0aGlzLnJvbS5sb2NhdGlvbnMuQ29yZGVsUGxhaW5XZXN0XTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvbmQgPVxuICAgICAgICAgIHRyaWdnZXIuY29uZGl0aW9ucy5tYXAoYyA9PiBjIDwgMCAmJiByZWxldmFudCh+bWFwKGMpKSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDb25kaXRpb24ofm1hcChjKSkgOiBudWxsKVxuICAgICAgICAgICAgICAuZmlsdGVyKChjOiB1bmtub3duKTogYyBpcyBbW0NvbmRpdGlvbl1dID0+IGMgIT0gbnVsbCk7XG4gICAgICBpZiAoY29uZCAmJiBjb25kLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gey4uLmV4dHJhLCB0ZXJyYWluOiB7ZXhpdDogb3IoLi4uY29uZCl9fTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGFjdGlvbkl0ZW0gIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHtjaGVjazogW3tjb25kaXRpb24sIHNsb3Q6IGFjdGlvbkl0ZW19XX07XG4gICAgfVxuICAgIGNvbnN0IGZsYWdzID0gdHJpZ2dlci5mbGFncy5maWx0ZXIocmVsZXZhbnRBbmRTZXQpO1xuICAgIGlmIChmbGFncy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB7Y2hlY2s6IGZsYWdzLm1hcChmID0+ICh7Y29uZGl0aW9uLCBzbG90OiBTbG90KGYpfSkpfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge307XG4gIH1cblxuICBucGMoaWQ6IG51bWJlciwgbG9jOiBMb2NhdGlvbik6IE5wY0RhdGEge1xuICAgIGNvbnN0IG5wYyA9IHRoaXMucm9tLm5wY3NbaWRdO1xuICAgIGlmICghbnBjIHx8ICFucGMudXNlZCkgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRyaWdnZXI6ICR7aGV4KGlkKX1gKTtcblxuICAgIGNvbnN0IHNwYXduQ29uZGl0aW9uczogcmVhZG9ubHkgbnVtYmVyW10gPSBucGMuc3Bhd25Db25kaXRpb25zLmdldChsb2MuaWQpIHx8IFtdO1xuXG4gICAgY29uc3QgcmVzdWx0OiBOcGNEYXRhICYge2NoZWNrOiBDaGVja1tdfSA9IHtjaGVjazogW119O1xuXG4gICAgaWYgKG5wYy5kYXRhWzJdICYgMHgwNCkge1xuICAgICAgLy8gcGVyc29uIGlzIGEgc3RhdHVlLlxuICAgICAgcmVzdWx0LnRlcnJhaW4gPSB7XG4gICAgICAgIGV4aXQ6IHRoaXMuZmxhZ3MuYXNzdW1lU3RhdHVlR2xpdGNoKCkgP1xuICAgICAgICAgICAgICAgICAgW1tdXSA6IFxuICAgICAgICAgICAgICAgICAgb3IoLi4uc3Bhd25Db25kaXRpb25zLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICB4ID0+IEZMQUdfTUFQLmdldCh4KSB8fCAodGhpcy5yZWxldmFudEZsYWdzLmhhcyh4KSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENvbmRpdGlvbih4KSA6IFtdKSkpLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdGF0dWVPciguLi5yZXFzOiBSZXF1aXJlbWVudFtdKTogdm9pZCB7XG4gICAgICBpZiAoIXJlc3VsdC50ZXJyYWluKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgdGVycmFpbiBmb3IgZ3VhcmQnKTtcbiAgICAgIHJlc3VsdC50ZXJyYWluLmV4aXQgPSBvcihyZXN1bHQudGVycmFpbi5leGl0IHx8IFtdLCAuLi5yZXFzKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gZm9ydHVuZSB0ZWxsZXIgKDM5KSByZXF1aXJlcyBhY2Nlc3MgdG8gcG9ydG9hIHRvIGdldCBoZXIgdG8gbW92ZT9cbiAgICAvLyAgICAgIC0+IG1heWJlIGluc3RlYWQgY2hhbmdlIHRoZSBmbGFnIHRvIHNldCBpbW1lZGlhdGVseSBvbiB0YWxraW5nIHRvIGhlclxuICAgIC8vICAgICAgICAgcmF0aGVyIHRoYW4gdGhlIHRyaWdnZXIgb3V0c2lkZSB0aGUgZG9vci4uLj8gdGhpcyB3b3VsZCBhbGxvdyBnZXR0aW5nXG4gICAgLy8gICAgICAgICB0aHJvdWdoIGl0IGJ5IGp1c3QgdGFsa2luZyBhbmQgdGhlbiBsZWF2aW5nIHRoZSByb29tLi4uXG5cbiAgICBzd2l0Y2ggKGlkKSB7XG4gICAgY2FzZSAweDE0OiAvLyB3b2tlbi11cCB3aW5kbWlsbCBndWFyZFxuICAgICAgLy8gc2tpcCBiZWNhdXNlIHdlIHRpZSB0aGUgaXRlbSB0byB0aGUgc2xlZXBpbmcgb25lLlxuICAgICAgaWYgKGxvYy5zcGF3bnMuZmluZChsID0+IGwuaXNOcGMoKSAmJiBsLmlkID09PSAweDE1KSkgcmV0dXJuIHt9O1xuICAgIGNhc2UgMHgyNTogLy8gYW1hem9uZXMgZ3VhcmRcbiAgICAgIHJlc3VsdC5oaXRib3ggPSB7eDA6IDAsIHgxOiAyLCB5MDogMCwgeTE6IDF9O1xuICAgICAgc3RhdHVlT3IoTWFnaWMuQ0hBTkdFLCBNYWdpYy5QQVJBTFlTSVMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDJkOiAvLyBtdCBzYWJyZS9zd2FuIHNvbGRpZXJzXG4gICAgICAvLyBUaGVzZSBkb24ndCBjb3VudCBhcyBzdGF0dWVzIGJlY2F1c2UgdGhleSdsbCBtb3ZlIGlmIHlvdSB0YWxrIHRvIHRoZW0uXG4gICAgICBkZWxldGUgcmVzdWx0LnRlcnJhaW47XG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4MzM6IC8vIHBvcnRvYSBndWFyZCAodGhyb25lIHJvb20sIHRob3VnaCB0aGUgcGFsYWNlIG9uZSBpcyB0aGUgb25lIHRoYXQgbWF0dGVycylcbiAgICAgIC8vIE5PVEU6IHRoaXMgbWVhbnMgdGhhdCB3ZSBjYW5ub3Qgc2VwYXJhdGUgdGhlIHBhbGFjZSBmb3llciBmcm9tIHRoZSB0aHJvbmUgcm9vbSwgc2luY2VcbiAgICAgIC8vIHRoZXJlJ3Mgbm8gd2F5IHRvIHJlcHJlc2VudCB0aGUgY29uZGl0aW9uIGZvciBwYXJhbHl6aW5nIHRoZSBndWFyZCBhbmQgc3RpbGwgaGF2ZSBoaW1cbiAgICAgIC8vIHBhc3NhYmxlIHdoZW4gdGhlIHF1ZWVuIGlzIHRoZXJlLiAgVGhlIHdob2xlIHNlcXVlbmNlIGlzIGFsc28gdGlnaHRseSBjb3VwbGVkLCBzbyBpdFxuICAgICAgLy8gcHJvYmFibHkgd291bGRuJ3QgbWFrZSBzZW5zZSB0byBzcGxpdCBpdCB1cCBhbnl3YXkuXG4gICAgICBzdGF0dWVPcihNYWdpYy5QQVJBTFlTSVMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDM4OiAvLyBwb3J0b2EgcXVlZW4gc2l0dGluZyBvbiBpbXBhc3NhYmxlIHRocm9uZVxuICAgICAgaWYgKGxvYy5pZCA9PT0gMHhkZikgcmVzdWx0LmhpdGJveCA9IHt4MDogMCwgeDE6IDEsIHkwOiAyLCB5MTogM307XG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4NGU6IC8vIHNoeXJvbiBndWFyZFxuICAgICAgcmVzdWx0LmhpdGJveCA9IHt4MDogLTEsIHgxOiAyLCB5MDogMCwgeTE6IDF9O1xuICAgICAgc3RhdHVlT3IoTWFnaWMuQ0hBTkdFLCBFdmVudC5FTlRFUkVEX1NIWVJPTik7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4ODA6IC8vIGdvYSBndWFyZHNcbiAgICAgIHN0YXR1ZU9yKC4uLnNwYXduQ29uZGl0aW9ucy5tYXAoYyA9PiBDb25kaXRpb24ofmMpKSk7IC8vIEV2ZW50LkVOVEVSRURfU0hZUk9OXG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4ODU6IC8vIHN0b25lZCBwYWlyXG4gICAgICBzdGF0dWVPcihJdGVtLkZMVVRFX09GX0xJTUUpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gaW50ZXJzZWN0IHNwYXduIGNvbmRpdGlvbnNcbiAgICBjb25zdCByZXF1aXJlbWVudHM6IEFycmF5PHJlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV0+ID0gW107XG4gICAgY29uc3QgYWRkUmVxID0gKGZsYWc6IG51bWJlcik6IHZvaWQgPT4ge1xuICAgICAgaWYgKGZsYWcgPD0gMCkgcmV0dXJuOyAvLyBuZWdhdGl2ZSBvciB6ZXJvIGZsYWcgaWdub3JlZFxuICAgICAgY29uc3QgcmVxID0gRkxBR19NQVAuZ2V0KGZsYWcpIHx8ICh0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGZsYWcpID8gQ29uZGl0aW9uKGZsYWcpIDogbnVsbCk7XG4gICAgICBpZiAocmVxICE9IG51bGwpIHJlcXVpcmVtZW50cy5wdXNoKHJlcSk7XG4gICAgfTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2Ygc3Bhd25Db25kaXRpb25zKSB7XG4gICAgICBhZGRSZXEoZmxhZyk7XG4gICAgfVxuXG4gICAgLy8gTG9vayBmb3IgdHJhZGUtaW5zXG4gICAgLy8gIC0gVE9ETyAtIGRvbid0IGhhcmQtY29kZSB0aGUgTlBDcz8gcmVhZCBmcm9tIHRoZSBpdGVtZGF0YT9cbiAgICBjb25zdCB0cmFkZUluID0gdGhpcy50cmFkZUlucy5nZXQoaWQpXG4gICAgaWYgKHRyYWRlSW4gIT0gbnVsbCkge1xuICAgICAgY29uc3QgdCA9IHRyYWRlSW47XG4gICAgICBmdW5jdGlvbiB0cmFkZShzbG90OiBTbG90LCAuLi5yZXFzOiBBcnJheTxyZWFkb25seSBbcmVhZG9ubHkgQ29uZGl0aW9uW11dPik6IHZvaWQge1xuICAgICAgICBjb25zdCBjb25kaXRpb24gPSBhbmQoLi4ucmVxdWlyZW1lbnRzLCB0LCAuLi5yZXFzKTtcbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3QsIGNvbmRpdGlvbn0pO1xuICAgICAgfVxuICAgICAgbGV0IHRyYWRlUiA9IHRyYWRlO1xuICAgICAgaWYgKHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzLnJhbmRvbWl6ZVRyYWRlcygpKSB7XG4gICAgICAgIHRyYWRlUiA9IChzbG90LCAuLi5yZXFzKSA9PiB7XG4gICAgICAgICAgY29uc3QgaXRlbXMgPSBbXG4gICAgICAgICAgICBJdGVtLlNUQVRVRV9PRl9PTllYLFxuICAgICAgICAgICAgSXRlbS5GT0dfTEFNUCxcbiAgICAgICAgICAgIEl0ZW0uTE9WRV9QRU5EQU5ULFxuICAgICAgICAgICAgSXRlbS5LSVJJU0FfUExBTlQsXG4gICAgICAgICAgICBJdGVtLklWT1JZX1NUQVRVRSxcbiAgICAgICAgICBdO1xuICAgICAgICAgIGNvbnN0IGNvbmRpdGlvbiA9XG4gICAgICAgICAgICAgIG9yKC4uLml0ZW1zLm1hcChpID0+IGFuZCguLi5yZXF1aXJlbWVudHMsIGksIC4uLnJlcXMpKSk7XG4gICAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3QsIGNvbmRpdGlvbn0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzd2l0Y2ggKGlkKSB7XG4gICAgICBjYXNlIDB4MTU6IC8vIHNsZWVwaW5nIHdpbmRtaWxsIGd1YXJkID0+IHdpbmRtaWxsIGtleSBzbG90XG4gICAgICAgIHRyYWRlKFNsb3QoSXRlbS5XSU5ETUlMTF9LRVkpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4MjM6IC8vIGFyeWxsaXMgPT4gYm93IG9mIG1vb24gc2xvdFxuICAgICAgICAvLyBOT1RFOiBzaXR0aW5nIG9uIGltcGFzc2libGUgdGhyb25lXG4gICAgICAgIHJlc3VsdC5oaXRib3ggPSB7eDA6IC0xLCB4MTogMiwgeTA6IC0xLCB5MTogMn07XG4gICAgICAgIHRyYWRlUihTbG90KEl0ZW0uQk9XX09GX01PT04pLCBNYWdpYy5DSEFOR0UpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg2MzogLy8gaHVydCBkb2xwaGluID0+IGhlYWxlZCBkb2xwaGluXG4gICAgICAgIC8vIE5PVEU6IGRvbHBoaW4gb24gd2F0ZXIsIGJ1dCBjYW4gaGVhbCBmcm9tIGxhbmRcbiAgICAgICAgcmVzdWx0LmhpdGJveCA9IHt4MDogLTEsIHgxOiAyLCB5MDogLTEsIHkxOiAyfTtcbiAgICAgICAgdHJhZGUoU2xvdChFdmVudC5IRUFMRURfRE9MUEhJTikpO1xuICAgICAgICB0cmFkZShTbG90KEl0ZW0uU0hFTExfRkxVVEUpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NjQ6IC8vIGZpc2hlcm1hblxuICAgICAgICB0cmFkZVIoU2xvdChFdmVudC5SRVRVUk5FRF9GT0dfTEFNUCksXG4gICAgICAgICAgICAgICAuLi4odGhpcy5mbGFncy5yZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpID9cbiAgICAgICAgICAgICAgICAgICBbRXZlbnQuSEVBTEVEX0RPTFBISU5dIDogW10pKTtcbiAgICAgICAgLy8gVE9ETyAtIHVzZSB0aGlzIGFzIHByb3h5IGZvciBib2F0XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDZiOiAvLyBzbGVlcGluZyBrZW5zdVxuICAgICAgICB0cmFkZShTbG90KEl0ZW0uR0xPV0lOR19MQU1QKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDc1OiAvLyBzbGltZWQga2Vuc3UgPT4gZmxpZ2h0IHNsb3RcbiAgICAgICAgdHJhZGVSKFNsb3QoTWFnaWMuRkxJR0hUKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDc0OiAvLyBrZW5zdSBpbiBkYW5jZSBoYWxsID0+IGNoYW5nZSBzbG90XG4gICAgICAgIC8vIE5PVEU6IHRoaXMgaXMgbm9ybWFsbHkgN2UgYnV0IHdlIGNoYW5nZSBpdCB0byA3NCBpbiB0aGlzIG9uZVxuICAgICAgICAvLyBsb2NhdGlvbiB0byBpZGVudGlmeSBpdFxuICAgICAgICB0cmFkZVIoU2xvdChNYWdpYy5DSEFOR0UpLCBNYWdpYy5QQVJBTFlTSVMsIEV2ZW50LkZPVU5EX0tFTlNVKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4ODI6IC8vIGFrYWhhbmEgPT4gZ2FzIG1hc2sgc2xvdCAoY2hhbmdlZCAxNiAtPiA4MilcbiAgICAgICAgdHJhZGVSKFNsb3QoSXRlbS5HQVNfTUFTSykpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg4ODogLy8gc3RvbmVkIGFrYWhhbmEgPT4gc2hpZWxkIHJpbmcgc2xvdFxuICAgICAgICB0cmFkZShTbG90KEl0ZW0uU0hJRUxEX1JJTkcpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTlBDcyB0aGF0IG5lZWQgYSBsaXR0bGUgZXh0cmEgY2FyZVxuXG4gICAgaWYgKGlkID09PSAweDg0KSB7IC8vIHN0YXJ0IGZpZ2h0IHdpdGggc2FiZXJhXG4gICAgICAvLyBUT0RPIC0gbG9vayB1cCB3aG8gdGhlIGFjdHVhbCBib3NzIGlzIG9uY2Ugd2UgZ2V0IGJvc3Mgc2h1ZmZsZSEhIVxuICAgICAgY29uc3QgY29uZGl0aW9uID0gdGhpcy5ib3NzUmVxdWlyZW1lbnRzKHRoaXMucm9tLmJvc3Nlcy5zYWJlcmExKTtcbiAgICAgIHJldHVybiB7Y2hlY2s6IFtcbiAgICAgICAge2NvbmRpdGlvbiwgc2xvdDogU2xvdChCb3NzLlNBQkVSQTEpfSxcbiAgICAgIF19O1xuICAgIH0gZWxzZSBpZiAoaWQgPT09IDB4MWQpIHsgLy8gb2FrIGVsZGVyIGhhcyBzb21lIHdlaXJkIHVudHJhY2tlZCBjb25kaXRpb25zLlxuICAgICAgY29uc3Qgc2xvdCA9IFNsb3QoSXRlbS5TV09SRF9PRl9GSVJFKTtcbiAgICAgIHJldHVybiB7Y2hlY2s6IFtcbiAgICAgICAgLy8gdHdvIGRpZmZlcmVudCB3YXlzIHRvIGdldCB0aGUgc3dvcmQgb2YgZmlyZSBpdGVtXG4gICAgICAgIHtjb25kaXRpb246IGFuZChNYWdpYy5URUxFUEFUSFksIEJvc3MuSU5TRUNUKSwgc2xvdH0sXG4gICAgICAgIHtjb25kaXRpb246IEV2ZW50LlJFU0NVRURfQ0hJTEQsIHNsb3R9LFxuICAgICAgXX07XG4gICAgfSBlbHNlIGlmIChpZCA9PT0gMHgxZikgeyAvLyBkd2FyZiBjaGlsZFxuICAgICAgY29uc3Qgc3Bhd25zID0gdGhpcy5yb20ubnBjc1tpZF0uc3Bhd25Db25kaXRpb25zLmdldChsb2MuaWQpO1xuICAgICAgaWYgKHNwYXducyAmJiBzcGF3bnMuaW5jbHVkZXMoMHgwNDUpKSByZXR1cm4ge307IC8vIGluIG1vdGhlcidzIGhvdXNlXG4gICAgICByZXR1cm4ge2NoZWNrOiBbXG4gICAgICAgIHtjb25kaXRpb246IEV2ZW50LkRXQVJGX01PVEhFUiwgc2xvdDogU2xvdChFdmVudC5EV0FSRl9DSElMRCl9LFxuICAgICAgXX07XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBkIG9mIG5wYy5nbG9iYWxEaWFsb2dzKSB7XG4gICAgICBhZGRSZXEofmQuY29uZGl0aW9uKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBkIG9mIG5wYy5sb2NhbERpYWxvZ3MuZ2V0KGxvYy5pZCkgfHwgbnBjLmxvY2FsRGlhbG9ncy5nZXQoLTEpIHx8IFtdKSB7XG4gICAgICAvLyBJZiB0aGUgY2hlY2sgY29uZGl0aW9uIGlzIG9wcG9zaXRlIHRvIHRoZSBzcGF3biBjb25kaXRpb24sIHRoZW4gc2tpcC5cbiAgICAgIC8vIFRoaXMgZW5zdXJlcyB3ZSBkb24ndCBleHBlY3QgdGhlIHF1ZWVuIHRvIGdpdmUgcmVjb3ZlciBpbiB0aGUgdGhyb25lIHJvb20uXG4gICAgICBpZiAoc3Bhd25Db25kaXRpb25zLmluY2x1ZGVzKH5kLmNvbmRpdGlvbikpIGNvbnRpbnVlO1xuICAgICAgLy8gQXBwbHkgdGhlIEZMQUdfTUFQLlxuICAgICAgY29uc3QgbWFwcGVkID0gRkxBR19NQVAuZ2V0KGQuY29uZGl0aW9uKTtcbiAgICAgIGNvbnN0IHBvc2l0aXZlID1cbiAgICAgICAgICBtYXBwZWQgPyBbbWFwcGVkXSA6XG4gICAgICAgICAgdGhpcy5yZWxldmFudEZsYWdzLmhhcyhkLmNvbmRpdGlvbikgPyBbQ29uZGl0aW9uKGQuY29uZGl0aW9uKV0gOlxuICAgICAgICAgIFtdO1xuICAgICAgY29uc3QgY29uZGl0aW9uID0gYW5kKC4uLnBvc2l0aXZlLCAuLi5yZXF1aXJlbWVudHMpO1xuICAgICAgLy8gSWYgdGhlIGNvbmRpdGlvbiBpcyBhIG5lZ2F0aXZlIHRoZW4gYW55IGZ1dHVyZSBjb25kaXRpb25zIG11c3QgaW5jbHVkZVxuICAgICAgLy8gaXQgYXMgYSBwb3NpdGl2ZSByZXF1aXJlbWVudC5cbiAgICAgIGNvbnN0IG5lZ2F0aXZlID1cbiAgICAgICAgICBGTEFHX01BUC5nZXQofmQuY29uZGl0aW9uKSB8fFxuICAgICAgICAgICh0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKH5kLmNvbmRpdGlvbikgPyBDb25kaXRpb24ofmQuY29uZGl0aW9uKSA6IG51bGwpO1xuICAgICAgaWYgKG5lZ2F0aXZlICE9IG51bGwpIHJlcXVpcmVtZW50cy5wdXNoKG5lZ2F0aXZlKTtcbiAgICAgIGNvbnN0IGFjdGlvbiA9IGQubWVzc2FnZS5hY3Rpb247XG4gICAgICBpZiAoYWN0aW9uID09PSAweDAzKSB7XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90Lml0ZW0obnBjLmRhdGFbMF0pLCBjb25kaXRpb259KTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAweDExXG4gICAgICAgICAgICAgICAgIHx8ICh0aGlzLmZsYWdzLnplYnVTdHVkZW50R2l2ZXNJdGVtKCkgJiYgYWN0aW9uID09PSAweDA5KSkge1xuICAgICAgICAvLyBOT1RFOiAkMDkgaXMgemVidSBzdHVkZW50LCB3aGljaCB3ZSd2ZSBwYXRjaGVkIHRvIGdpdmUgdGhlIGl0ZW0uXG4gICAgICAgIC8vIFRPRE8gLSBjaGVjayB0aGUgcGF0Y2ggcmF0aGVyIHRoYW4gdGhlIGZsYWc/XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90Lml0ZW0obnBjLmRhdGFbMV0pLCBjb25kaXRpb259KTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAweDEwKSB7XG4gICAgICAgIC8vIE5PVEU6IFF1ZWVuIGNhbid0IGJlIHJldmVhbGVkIGFzIGFzaW5hIGluIHRoZSB0aHJvbmUgcm9vbS4gIEluIHBhcnRpY3VsYXIsXG4gICAgICAgIC8vIHRoaXMgZW5zdXJlcyB0aGF0IHRoZSBiYWNrIHJvb20gaXMgcmVhY2hhYmxlIGJlZm9yZSByZXF1aXJpbmcgdGhlIGRvbHBoaW5cbiAgICAgICAgLy8gdG8gYXBwZWFyLiAgVGhpcyBzaG91bGQgYmUgaGFuZGxlZCBieSB0aGUgYWJvdmUgY2hlY2sgZm9yIHRoZSBkaWFsb2cgYW5kXG4gICAgICAgIC8vIHNwYXduIGNvbmRpdGlvbnMgdG8gYmUgY29tcGF0aWJsZS5cbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QoTWFnaWMuUkVDT1ZFUiksIGNvbmRpdGlvbn0pO1xuICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IDB4MDggJiYgaWQgPT09IDB4MmQpIHtcbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX1NXQU4pLCBjb25kaXRpb259KTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBkLmZsYWdzKSB7XG4gICAgICAgIGNvbnN0IG1mbGFnID0gRkxBR19NQVAuZ2V0KGZsYWcpO1xuICAgICAgICBjb25zdCBwZmxhZyA9IG1mbGFnID8gbWZsYWcgOiB0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGZsYWcpID8gQ29uZGl0aW9uKGZsYWcpIDogbnVsbDtcbiAgICAgICAgaWYgKHBmbGFnKSByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdChwZmxhZyksIGNvbmRpdGlvbn0pO1xuICAgICAgfVxuICAgICAgLy8gSWYgdGhlIHNwYXduICpyZXF1aXJlcyogdGhpcyBjb25kaXRpb24gdGhlbiBkb24ndCBldmFsdWF0ZSBhbnkgbW9yZS4gIFRoaXNcbiAgICAgIC8vIGVuc3VyZXMgd2UgZG9uJ3QgZXhwZWN0IHRoZSBxdWVlbiB0byBnaXZlIHRoZSBmbHV0ZSBvZiBsaW1lIGluIHRoZSBiYWNrIHJvb20sXG4gICAgICAvLyBzaW5jZSBzaGUgd291bGRuJ3QgaGF2ZSBzcGF3bmVkIHRoZXJlIGludGltZSB0byBnaXZlIGl0LlxuICAgICAgaWYgKHBvc2l0aXZlLmxlbmd0aCAmJiBzcGF3bkNvbmRpdGlvbnMuaW5jbHVkZXMoZC5jb25kaXRpb24pKSBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGNhcGFiaWxpdGllcygpOiBDYXBhYmlsaXR5RGF0YVtdIHtcbiAgICBsZXQgYnJlYWtTdG9uZTogUmVxdWlyZW1lbnQgPSBJdGVtLlNXT1JEX09GX1dJTkQ7XG4gICAgbGV0IGJyZWFrSWNlOiBSZXF1aXJlbWVudCA9IEl0ZW0uU1dPUkRfT0ZfRklSRTtcbiAgICBsZXQgZm9ybUJyaWRnZTogUmVxdWlyZW1lbnQgPSBJdGVtLlNXT1JEX09GX1dBVEVSO1xuICAgIGxldCBicmVha0lyb246IFJlcXVpcmVtZW50ID0gSXRlbS5TV09SRF9PRl9USFVOREVSO1xuICAgIGlmICghdGhpcy5mbGFncy5vcmJzT3B0aW9uYWwoKSkge1xuICAgICAgLy8gQWRkIG9yYiByZXF1aXJlbWVudFxuICAgICAgYnJlYWtTdG9uZSA9IG9yKGFuZChJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uT1JCX09GX1dJTkQpLFxuICAgICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uVE9STkFET19CUkFDRUxFVCkpO1xuICAgICAgYnJlYWtJY2UgPSBvcihhbmQoSXRlbS5TV09SRF9PRl9GSVJFLCBJdGVtLk9SQl9PRl9GSVJFKSxcbiAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfRklSRSwgSXRlbS5GTEFNRV9CUkFDRUxFVCkpO1xuICAgICAgZm9ybUJyaWRnZSA9IG9yKGFuZChJdGVtLlNXT1JEX09GX1dBVEVSLCBJdGVtLk9SQl9PRl9XQVRFUiksXG4gICAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfV0FURVIsIEl0ZW0uQkxJWlpBUkRfQlJBQ0VMRVQpKTtcbiAgICAgIGJyZWFrSXJvbiA9IG9yKGFuZChJdGVtLlNXT1JEX09GX1RIVU5ERVIsIEl0ZW0uT1JCX09GX1RIVU5ERVIpLFxuICAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUiwgSXRlbS5TVE9STV9CUkFDRUxFVCkpO1xuICAgICAgaWYgKHRoaXMuZmxhZ3MuYXNzdW1lU3dvcmRDaGFyZ2VHbGl0Y2goKSkge1xuICAgICAgICBjb25zdCBsZXZlbDIgPSBvcihicmVha1N0b25lLCBicmVha0ljZSwgZm9ybUJyaWRnZSwgYnJlYWtJcm9uKTtcbiAgICAgICAgZnVuY3Rpb24gbmVlZChzd29yZDogcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXSk6IFJlcXVpcmVtZW50IHtcbiAgICAgICAgICBjb25zdCBjb25kaXRpb246IENvbmRpdGlvbiA9IHN3b3JkWzBdWzBdO1xuICAgICAgICAgIHJldHVybiBsZXZlbDIubWFwKGMgPT4gY1swXSA9PT0gY29uZGl0aW9uID8gYyA6IFtjb25kaXRpb24sIC4uLmNdKTtcbiAgICAgICAgfVxuICAgICAgICBicmVha1N0b25lID0gbmVlZChJdGVtLlNXT1JEX09GX1dJTkQpO1xuICAgICAgICBicmVha0ljZSA9IG5lZWQoSXRlbS5TV09SRF9PRl9GSVJFKTtcbiAgICAgICAgZm9ybUJyaWRnZSA9IG5lZWQoSXRlbS5TV09SRF9PRl9XQVRFUik7XG4gICAgICAgIGJyZWFrSXJvbiA9IG5lZWQoSXRlbS5TV09SRF9PRl9USFVOREVSKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdHlwZSBDYXBhYmlsaXR5TGlzdCA9IEFycmF5PFtyZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dLCAuLi5SZXF1aXJlbWVudFtdXT47XG4gICAgY29uc3QgY2FwYWJpbGl0aWVzOiBDYXBhYmlsaXR5TGlzdCA9IFtcbiAgICAgIFtFdmVudC5TVEFSVCwgYW5kKCldLFxuICAgICAgW0NhcGFiaWxpdHkuU1dPUkQsXG4gICAgICAgSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLlNXT1JEX09GX0ZJUkUsXG4gICAgICAgSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5TV09SRF9PRl9USFVOREVSXSxcbiAgICAgIFtDYXBhYmlsaXR5LkJSRUFLX1NUT05FLCBicmVha1N0b25lXSxcbiAgICAgIFtDYXBhYmlsaXR5LkJSRUFLX0lDRSwgYnJlYWtJY2VdLFxuICAgICAgW0NhcGFiaWxpdHkuRk9STV9CUklER0UsIGZvcm1CcmlkZ2VdLFxuICAgICAgW0NhcGFiaWxpdHkuQlJFQUtfSVJPTiwgYnJlYWtJcm9uXSxcbiAgICAgIFtDYXBhYmlsaXR5Lk1PTkVZLCBDYXBhYmlsaXR5LlNXT1JEXSwgLy8gVE9ETyAtIGNsZWFyIHRoaXMgdXBcbiAgICAgIFtDYXBhYmlsaXR5LkNMSU1CX1dBVEVSRkFMTCwgTWFnaWMuRkxJR0hUXSxcbiAgICAgIFtDYXBhYmlsaXR5LlNIT09USU5HX1NUQVRVRSwgTWFnaWMuQkFSUklFUl0sIC8vIFRPRE8gLSBhbGxvdyBzaGllbGQgcmluZz9cbiAgICAgIFtDYXBhYmlsaXR5LkNMSU1CX1NMT1BFLCBJdGVtLlJBQkJJVF9CT09UUywgTWFnaWMuRkxJR0hUXSxcbiAgICAgIC8vIFtFdmVudC5HRU5FUkFMU19ERUZFQVRFRCwgSXRlbS5JVk9SWV9TVEFUVUVdLCAvLyBUT0RPIC0gZml4IHRoaXNcbiAgICAgIFtFdmVudC5PUEVORURfU0VBTEVEX0NBVkUsIEV2ZW50LlNUQVJURURfV0lORE1JTExdLCAvLyBUT0RPIC0gbWVyZ2UgY29tcGxldGVseT9cbiAgICBdO1xuXG4gICAgaWYgKHRoaXMuZmxhZ3MuYXNzdW1lR2hldHRvRmxpZ2h0KCkpIHtcbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LkNMSU1CX1dBVEVSRkFMTCwgYW5kKEV2ZW50LlJJREVfRE9MUEhJTiwgSXRlbS5SQUJCSVRfQk9PVFMpXSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmZsYWdzLmd1YXJhbnRlZUJhcnJpZXIoKSkge1xuICAgICAgLy8gVE9ETyAtIHN3b3JkIGNoYXJnZSBnbGl0Y2ggbWlnaHQgYmUgYSBwcm9ibGVtIHdpdGggdGhlIGhlYWxpbmcgb3B0aW9uLi4uXG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5TSE9PVElOR19TVEFUVUUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIENhcGFiaWxpdHkuQlVZX0hFQUxJTkcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBJdGVtLlNISUVMRF9SSU5HKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgTWFnaWMuUkVGUkVTSCldKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5mbGFncy5sZWF0aGVyQm9vdHNHaXZlU3BlZWQoKSkge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuQ0xJTUJfU0xPUEUsIEl0ZW0uTEVBVEhFUl9CT09UU10pO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgYm9zcyBvZiB0aGlzLnJvbS5ib3NzZXMpIHtcbiAgICAgIGlmIChib3NzLmtpbGwgIT0gbnVsbCAmJiBib3NzLmRyb3AgIT0gbnVsbCkge1xuICAgICAgICAvLyBTYXZlcyByZWR1bmRhbmN5IG9mIHB1dHRpbmcgdGhlIGl0ZW0gaW4gdGhlIGFjdHVhbCByb29tLlxuICAgICAgICBjYXBhYmlsaXRpZXMucHVzaChbSXRlbShib3NzLmRyb3ApLCBCb3NzKGJvc3MuZmxhZyldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY2FwYWJpbGl0aWVzLnB1c2goW0l0ZW0uT1JCX09GX1dBVEVSLCBCb3NzLlJBR0VdKTtcblxuICAgIGlmICh0aGlzLmZsYWdzLmd1YXJhbnRlZUdhc01hc2soKSkge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuVFJBVkVMX1NXQU1QLCBJdGVtLkdBU19NQVNLXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LlRSQVZFTF9TV0FNUCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgb3IoSXRlbS5HQVNfTUFTSyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgSXRlbS5NRURJQ0FMX0hFUkIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBNYWdpYy5SRUZSRVNIKSldKTtcbiAgICB9XG5cbiAgICAvLyBpZiAodGhpcy5mbGFncy5hc3N1bWVTdGF0dWVHbGl0Y2goKSkge1xuICAgIC8vICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuU1RBVFVFX0dMSVRDSCwgW1tdXV0pO1xuICAgIC8vIH1cblxuICAgIHJldHVybiBjYXBhYmlsaXRpZXMubWFwKChbY2FwYWJpbGl0eSwgLi4uZGVwc10pID0+ICh7Y2FwYWJpbGl0eSwgY29uZGl0aW9uOiBvciguLi5kZXBzKX0pKTtcbiAgfVxuXG4gIHdhbGxDYXBhYmlsaXR5KHR5cGU6IFdhbGxUeXBlKToge2ZsYWc6IG51bWJlcn0ge1xuICAgIHJldHVybiB7ZmxhZzogW0NhcGFiaWxpdHkuQlJFQUtfU1RPTkUsIENhcGFiaWxpdHkuQlJFQUtfSUNFLFxuICAgICAgICAgICAgICAgICAgIENhcGFiaWxpdHkuRk9STV9CUklER0UsIENhcGFiaWxpdHkuQlJFQUtfSVJPTl1bdHlwZV1bMF1bMF19O1xuICB9XG59XG5cbnR5cGUgVGlsZUNoZWNrID0gQ2hlY2sgJiB7dGlsZTogVGlsZUlkfTtcblxuLy8gVE9ETyAtIG1heWJlIHB1bGwgdHJpZ2dlcnMgYW5kIG5wY3MsIGV0YywgYmFjayB0b2dldGhlcj9cbi8vICAgICAgLSBvciBtYWtlIHRoZSBsb2NhdGlvbiBvdmVybGF5IGEgc2luZ2xlIGZ1bmN0aW9uP1xuLy8gICAgICAgIC0+IG5lZWRzIGNsb3NlZC1vdmVyIHN0YXRlIHRvIHNoYXJlIGluc3RhbmNlcy4uLlxuXG5pbnRlcmZhY2UgRXh0cmFSb3V0ZSB7XG4gIHRpbGU6IFRpbGVJZDtcbiAgY29uZGl0aW9uPzogUmVxdWlyZW1lbnQ7XG59XG5pbnRlcmZhY2UgRXh0cmFFZGdlIHtcbiAgZnJvbTogVGlsZUlkO1xuICB0bzogVGlsZUlkO1xuICBjb25kaXRpb24/OiBSZXF1aXJlbWVudDtcbn1cblxuaW50ZXJmYWNlIFRyaWdnZXJEYXRhIHtcbiAgdGVycmFpbj86IFRlcnJhaW47XG4gIGNoZWNrPzogQ2hlY2tbXTtcbiAgLy8gYWxsb3dzIG5vdCBhc3N1bWluZyB0ZWxlcG9ydCBza2lwXG4gIGV4dHJhTG9jYXRpb25zPzogTG9jYXRpb25bXTtcbiAgLy8gYWxsb3dzIG5vdCBhc3N1bWluZyByYWJiaXQgc2tpcFxuICBkeD86IG51bWJlcltdO1xufVxuXG5pbnRlcmZhY2UgTnBjRGF0YSB7XG4gIGhpdGJveD86IEhpdGJveDtcbiAgdGVycmFpbj86IFRlcnJhaW47XG4gIGNoZWNrPzogQ2hlY2tbXTtcbn1cblxuaW50ZXJmYWNlIEhpdGJveCB7XG4gIHgwOiBudW1iZXI7XG4gIHkwOiBudW1iZXI7XG4gIHgxOiBudW1iZXI7XG4gIHkxOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBDYXBhYmlsaXR5RGF0YSB7XG4gIGNvbmRpdGlvbj86IFJlcXVpcmVtZW50O1xuICBjYXBhYmlsaXR5OiByZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dO1xufVxuXG4vLyBTdGF0aWMgbWFwIG9mIHRlcnJhaW5zLlxuY29uc3QgVEVSUkFJTlM6IEFycmF5PFRlcnJhaW4gfCB1bmRlZmluZWQ+ID0gKCgpID0+IHtcbiAgY29uc3Qgb3V0ID0gW107XG4gIGZvciAobGV0IGVmZmVjdHMgPSAwOyBlZmZlY3RzIDwgMTI4OyBlZmZlY3RzKyspIHtcbiAgICBvdXRbZWZmZWN0c10gPSB0ZXJyYWluKGVmZmVjdHMpO1xuICB9XG4gIC8vIGNvbnNvbGUubG9nKCdURVJSQUlOUycsIG91dCk7XG4gIHJldHVybiBvdXQ7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBlZmZlY3RzIFRoZSAkMjYgYml0cyBvZiB0aWxlZWZmZWN0cywgcGx1cyAkMDggZm9yIHN3YW1wLCAkMTAgZm9yIGRvbHBoaW4sXG4gICAqICQwMSBmb3Igc2hvb3Rpbmcgc3RhdHVlcywgJDQwIGZvciBzaG9ydCBzbG9wZVxuICAgKiBAcmV0dXJuIHVuZGVmaW5lZCBpZiB0aGUgdGVycmFpbiBpcyBpbXBhc3NhYmxlLlxuICAgKi9cbiAgZnVuY3Rpb24gdGVycmFpbihlZmZlY3RzOiBudW1iZXIpOiBUZXJyYWluIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoZWZmZWN0cyAmIDB4MDQpIHJldHVybiB1bmRlZmluZWQ7IC8vIGltcGFzc2libGVcbiAgICBjb25zdCB0ZXJyYWluOiBUZXJyYWluID0ge307XG4gICAgaWYgKChlZmZlY3RzICYgMHgxMikgPT09IDB4MTIpIHsgLy8gZG9scGhpbiBvciBmbHlcbiAgICAgIGlmIChlZmZlY3RzICYgMHgyMCkgdGVycmFpbi5leGl0ID0gQ2FwYWJpbGl0eS5DTElNQl9XQVRFUkZBTEw7XG4gICAgICB0ZXJyYWluLmVudGVyID0gb3IoRXZlbnQuUklERV9ET0xQSElOLCBNYWdpYy5GTElHSFQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZWZmZWN0cyAmIDB4NDApIHsgLy8gc2hvcnQgc2xvcGVcbiAgICAgICAgdGVycmFpbi5leGl0ID0gQ2FwYWJpbGl0eS5DTElNQl9TTE9QRTtcbiAgICAgIH0gZWxzZSBpZiAoZWZmZWN0cyAmIDB4MjApIHsgLy8gc2xvcGVcbiAgICAgICAgdGVycmFpbi5leGl0ID0gTWFnaWMuRkxJR0hUO1xuICAgICAgfVxuICAgICAgaWYgKGVmZmVjdHMgJiAweDAyKSB0ZXJyYWluLmVudGVyID0gTWFnaWMuRkxJR0hUOyAvLyBuby13YWxrXG4gICAgfVxuICAgIGlmIChlZmZlY3RzICYgMHgwOCkgeyAvLyBzd2FtcFxuICAgICAgdGVycmFpbi5lbnRlciA9ICh0ZXJyYWluLmVudGVyIHx8IFtbXV0pLm1hcChjcyA9PiBDYXBhYmlsaXR5LlRSQVZFTF9TV0FNUFswXS5jb25jYXQoY3MpKTtcbiAgICB9XG4gICAgaWYgKGVmZmVjdHMgJiAweDAxKSB7IC8vIHNob290aW5nIHN0YXR1ZXNcbiAgICAgIHRlcnJhaW4uZW50ZXIgPSAodGVycmFpbi5lbnRlciB8fCBbW11dKS5tYXAoY3MgPT4gQ2FwYWJpbGl0eS5TSE9PVElOR19TVEFUVUVbMF0uY29uY2F0KGNzKSk7XG4gICAgfVxuICAgIHJldHVybiB0ZXJyYWluO1xuICB9XG59KSgpO1xuXG4vLyBUT0RPIC0gZmlndXJlIG91dCB3aGF0IHRoaXMgbG9va3MgbGlrZS4uLj9cbi8vICAtIG1heWJlIHdlIGp1c3Qgd2FudCB0byBtYWtlIGEgcHNldWRvIERFRkVBVEVEX0lOU0VDVCBldmVudCwgYnV0IHRoaXMgd291bGQgbmVlZCB0byBiZVxuLy8gICAgc2VwYXJhdGUgZnJvbSAxMDEsIHNpbmNlIHRoYXQncyBhdHRhY2hlZCB0byB0aGUgaXRlbWdldCwgd2hpY2ggd2lsbCBtb3ZlIHdpdGggdGhlIHNsb3QhXG4vLyAgLSBwcm9iYWJseSB3YW50IGEgZmxhZyBmb3IgZWFjaCBib3NzIGRlZmVhdGVkLi4uP1xuLy8gICAgY291bGQgdXNlIGJvc3NraWxsIElEIGZvciBpdD9cbi8vICAgIC0gdGhlbiBtYWtlIHRoZSBkcm9wIGEgc2ltcGxlIGRlcml2YXRpdmUgZnJvbSB0aGF0Li4uXG4vLyAgICAtIHVwc2hvdCAtIG5vIGxvbmdlciBuZWVkIHRvIG1peCBpdCBpbnRvIG5wYygpIG9yIHRyaWdnZXIoKSBvdmVybGF5LCBpbnN0ZWFkIG1vdmUgaXRcbi8vICAgICAgdG8gY2FwYWJpbGl0eSBvdmVybGF5LlxuLy8gZnVuY3Rpb24gc2xvdEZvcjxUPihpdGVtOiBUKTogVCB7IHJldHVybiBpdGVtOyB9XG4iXX0=