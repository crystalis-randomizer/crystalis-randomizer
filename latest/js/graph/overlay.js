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
            routes.push({
                tile: entrance(0x8c, 1),
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
                extra.extraLocations = [this.rom.locations.cordelPlainsWest];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9ncmFwaC9vdmVybGF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFTLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFDN0QsSUFBSSxFQUFxQixHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQUUsUUFBUSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBSy9DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFhbkMsTUFBTSxjQUFjLEdBQUc7SUFDckIsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBRUwsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBR0wsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSztJQUUxQixLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSztJQUN0RCxLQUFLO0lBQ0wsS0FBSztJQUNM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QUksRUFBRTtnQkFDekIsT0FBTyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO2FBQzdCO1lBQ0QsSUFBSSxPQUFPLEdBQUcsSUFBSTtnQkFBRSxPQUFPLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7U0FDbEQ7UUFDRCxJQUFJLE9BQU8sR0FBRyxJQUFJLEVBQUU7WUFDbEIsT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDMUY7UUFDRCxJQUFJLE9BQU8sR0FBRyxJQUFJLEVBQUU7WUFDbEIsT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDN0Y7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0FBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Qm9zcywgQ2FwYWJpbGl0eSwgQ2hlY2ssIENvbmRpdGlvbiwgRXZlbnQsIEl0ZW0sIE1hZ2ljLCBNdXRhYmxlUmVxdWlyZW1lbnQsXG4gICAgICAgIFJlcXVpcmVtZW50LCBTbG90LCBUZXJyYWluLCBXYWxsVHlwZSwgYW5kLCBtZWV0LCBvcn0gZnJvbSAnLi9jb25kaXRpb24uanMnO1xuaW1wb3J0IHtUaWxlSWQsIFNjcmVlbklkfSBmcm9tICcuL2dlb21ldHJ5LmpzJztcbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7Qm9zcyBhcyBSb21Cb3NzfSBmcm9tICcuLi9yb20vYm9zc2VzLmpzJztcbmltcG9ydCB7TG9jYXRpb259IGZyb20gJy4uL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge1Nob3BUeXBlfSBmcm9tICcuLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge2hleH0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuXG4vLyBBZGRpdGlvbmFsIGluZm9ybWF0aW9uIG5lZWRlZCB0byBpbnRlcnByZXQgdGhlIHdvcmxkIGdyYXBoIGRhdGEuXG4vLyBUaGlzIGdldHMgaW50byBtb3JlIHNwZWNpZmljcyBhbmQgaGFyZGNvZGluZy5cblxuLy8gVE9ETyAtIG1heWJlIGNvbnNpZGVyIGhhdmluZyBhIHNldCBvZiBBU1NVTUVEIGFuZCBhIHNldCBvZiBJR05PUkVEIGZsYWdzP1xuLy8gICAgICAtIGUuZy4gYWx3YXlzIGFzc3VtZSAwMGYgaXMgRkFMU0UgcmF0aGVyIHRoYW4gVFJVRSwgdG8gYXZvaWQgZnJlZSB3aW5kbWlsbCBrZXlcblxuXG4vLyBUT0RPIC0gcHJpc29uIGtleSBtaXNzaW5nIGZyb20gcGFyYWx5c2lzIGRlcHMgKG9yIHJhdGhlciBhIG5vbi1mbGlnaHQgdmVyc2lvbikhXG5cblxuXG5jb25zdCBSRUxFVkFOVF9GTEFHUyA9IFtcbiAgMHgwMGEsIC8vIHVzZWQgd2luZG1pbGwga2V5XG4gIDB4MDBiLCAvLyB0YWxrZWQgdG8gbGVhZiBlbGRlclxuICAweDAxMywgLy8ga2lsbGVkIHNhYmVyYSAxXG4gIDB4MDE4LCAvLyBlbnRlcmVkIHVuZGVyZ3JvdW5kIGNoYW5uZWxcbiAgMHgwMWIsIC8vIG1lc2lhIHJlY29yZGluZyBwbGF5ZWRcbiAgMHgwMWUsIC8vIHF1ZWVuIHJldmVhbGVkXG4gIDB4MDIxLCAvLyByZXR1cm5lZCBmb2cgbGFtcFxuICAvLyAweDAyNCwgLy8gZ2VuZXJhbHMgZGVmZWF0ZWQgKGdvdCBpdm9yeSBzdGF0dWUpXG4gIDB4MDI1LCAvLyBoZWFsZWQgZG9scGhpblxuICAweDAyNiwgLy8gZW50ZXJlZCBzaHlyb24gKGZvciBnb2EgZ3VhcmRzKVxuICAweDAyNywgLy8gc2h5cm9uIG1hc3NhY3JlXG4gIC8vIDB4MzUsIC8vIGN1cmVkIGFrYWhhbmFcbiAgMHgwMzgsIC8vIGxlYWYgYWJkdWN0aW9uXG4gIDB4MDNhLCAvLyB0YWxrZWQgdG8gemVidSBpbiBjYXZlIChhZGRlZCBhcyByZXEgZm9yIGFiZHVjdGlvbilcbiAgMHgwM2IsIC8vIHRhbGtlZCB0byB6ZWJ1IGluIHNoeXJvbiAoYWRkZWQgYXMgcmVxIGZvciBtYXNzYWNyZSlcbiAgMHgwNDUsIC8vIHJlc2N1ZWQgY2hpbGRcbiAgMHgwNTIsIC8vIHRhbGtlZCB0byBkd2FyZiBtb3RoZXJcbiAgMHgwNTMsIC8vIGNoaWxkIGZvbGxvd2luZ1xuICAweDA2MSwgLy8gdGFsa2VkIHRvIHN0b20gaW4gc3dhbiBodXRcbiAgMHgwNjcsIC8vIGtpbGxlZCBtYWRvIDFcbiAgLy8gMHgwNmMsIC8vIGRlZmVhdGVkIGRyYXlnb24gMVxuICAweDA3MiwgLy8ga2Vuc3UgZm91bmQgaW4gdGF2ZXJuXG4gIDB4MDhiLCAvLyBnb3Qgc2hlbGwgZmx1dGVcbiAgMHgwOWIsIC8vIGFibGUgdG8gcmlkZSBkb2xwaGluXG4gIDB4MGE1LCAvLyB0YWxrZWQgdG8gemVidSBzdHVkZW50XG4gIDB4MGE5LCAvLyB0YWxrZWQgdG8gbGVhZiByYWJiaXRcbiAgMHgxMDAsIC8vIGtpbGxlZCB2YW1waXJlIDFcbiAgMHgxMDEsIC8vIGtpbGxlZCBpbnNlY3RcbiAgMHgxMDIsIC8vIGtpbGxlZCBrZWxiZXNxdWUgMVxuICAweDEwMywgLy8gcmFnZVxuICAweDEwNSwgLy8ga2lsbGVkIGtlbGJlc3F1ZSAyXG4gIDB4MTA2LCAvLyBraWxsZWQgc2FiZXJhIDJcbiAgMHgxMDcsIC8vIGtpbGxlZCBtYWRvIDJcbiAgMHgxMDgsIC8vIGtpbGxlZCBrYXJtaW5lXG4gIDB4MTBiLCAvLyBraWxsZWQgZHJheWdvbiAxXG4gIDB4MTBjLCAvLyBraWxsZWQgdmFtcGlyZSAyXG5cbiAgLy8gc3dvcmRzIChtYXkgYmUgbmVlZGVkIGZvciByYWdlLCBTb1QgZm9yIG1hc3NhY3JlKVxuICAweDIwMCwgMHgyMDEsIDB4MjAyLCAweDIwMyxcbiAgLy8gYmFsbHMgYW5kIGJyYWNlbGV0cyBtYXkgYmUgbmVlZGVkIGZvciB0ZWxlcG9ydFxuICAweDIwNSwgMHgyMDYsIDB4MjA3LCAweDIwOCwgMHgyMDksIDB4MjBhLCAweDIwYiwgMHgyMGMsXG4gIDB4MjM2LCAvLyBzaGVsbCBmbHV0ZSAoZm9yIGZpc2hlcm1hbiBzcGF3bilcbiAgMHgyNDMsIC8vIHRlbGVwYXRoeSAoZm9yIHJhYmJpdCwgb2FrLCBkZW8pXG4gIDB4MjQ0LCAvLyB0ZWxlcG9ydCAoZm9yIG10IHNhYnJlIHRyaWdnZXIpXG4gIDB4MjgzLCAvLyBjYWxtZWQgc2VhIChmb3IgYmFycmllcilcbiAgMHgyOGQsIC8vIGtpbGxlZCBkcmF5Z29uIDIgKHdhbGwgZGVzdHJveWVkKVxuICAweDJlZSwgLy8gc3RhcnRlZCB3aW5kbWlsbCAoZm9yIHJlZnJlc2gpXG5cbiAgLy8gTk9URTogdGhlc2UgYXJlIG1vdmVkIGJlY2F1c2Ugb2Ygem9tYmllIHdhcnAhXG4gIDB4MmY2LCAvLyB3YXJwOm9hayAoZm9yIHRlbGVwYXRoeSlcbiAgLy8gMHgyZmEsIC8vIHdhcnA6am9lbCAoZm9yIGV2aWwgc3Bpcml0IGlzbGFuZClcbiAgMHgyZmQsIC8vIHdhcnA6c2h5cm9uIChmb3IgdGVsZXBhdGh5KVxuXG4gIC8vIE1hZ2ljLkNIQU5HRVswXVswXSxcbiAgLy8gTWFnaWMuVEVMRVBBVEhZWzBdWzBdLFxuXTtcblxuLy8gVE9ETyAtIHRoaXMgaXMgbm90IHBlcnZhc2l2ZSBlbm91Z2ghISFcbi8vICAtIG5lZWQgYSB3YXkgdG8gcHV0IGl0IGV2ZXJ5d2hlcmVcbi8vICAgIC0+IG1heWJlIGluIE11dGFibGVSZXF1aXJlbWVudHM/XG5jb25zdCBGTEFHX01BUDogTWFwPG51bWJlciwgcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXT4gPSBuZXcgTWFwKFtcbiAgWzB4MDBhLCBFdmVudC5TVEFSVEVEX1dJTkRNSUxMXSwgLy8gdGhpcyBpcyByZWYnZCBvdXRzaWRlIHRoaXMgZmlsZSFcbiAgLy9bMHgwMGUsIE1hZ2ljLlRFTEVQQVRIWV0sXG4gIC8vWzB4MDNmLCBNYWdpYy5URUxFUE9SVF0sXG4gIC8vIFF1ZWVuIHdpbGwgZ2l2ZSBmbHV0ZSBvZiBsaW1lIHcvbyBwYXJhbHlzaXMgaW4gdGhpcyBjYXNlLlxuICBbMHgwMTcsIEl0ZW0uU1dPUkRfT0ZfV0FURVJdLFxuICBbMHgwMjgsIE1hZ2ljLkNIQU5HRV0sXG4gIFsweDAyOSwgTWFnaWMuQ0hBTkdFXSxcbiAgWzB4MDJhLCBNYWdpYy5DSEFOR0VdLFxuICBbMHgwMmIsIE1hZ2ljLkNIQU5HRV0sXG4gIFsweDA2YywgQm9zcy5EUkFZR09OMV0sXG4gIFsweDA4YiwgSXRlbS5TSEVMTF9GTFVURV0sXG4gIFsweDBlZSwgRXZlbnQuUklERV9ET0xQSElOXSwgLy8gTk9URTogY3VzdG9tIGZsYWdcbl0pO1xuXG4vLyBNYXBzIHRyaWdnZXIgYWN0aW9ucyB0byB0aGUgc2xvdCB0aGV5IGdyYW50LlxuY29uc3QgVFJJR0dFUl9BQ1RJT05fSVRFTVM6IHtbYWN0aW9uOiBudW1iZXJdOiBTbG90fSA9IHtcbiAgMHgwODogU2xvdChNYWdpYy5QQVJBTFlTSVMpLFxuICAweDBiOiBTbG90KE1hZ2ljLkJBUlJJRVIpLFxuICAweDBmOiBTbG90KE1hZ2ljLlJFRlJFU0gpLFxuICAweDE4OiBTbG90KE1hZ2ljLlRFTEVQQVRIWSksXG59O1xuXG5jb25zdCBTV09SRFMgPSBbSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLlNXT1JEX09GX0ZJUkUsXG4gICAgICAgICAgICAgICAgSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5TV09SRF9PRl9USFVOREVSXSBhcyBjb25zdDtcbmNvbnN0IFNXT1JEX1BPV0VSUyA9IFtcbiAgW0l0ZW0uT1JCX09GX1dJTkQsIEl0ZW0uVE9STkFET19CUkFDRUxFVF0sXG4gIFtJdGVtLk9SQl9PRl9GSVJFLCBJdGVtLkZMQU1FX0JSQUNFTEVUXSxcbiAgW0l0ZW0uT1JCX09GX1dBVEVSLCBJdGVtLkJMSVpaQVJEX0JSQUNFTEVUXSxcbiAgW0l0ZW0uT1JCX09GX1RIVU5ERVIsIEl0ZW0uU1RPUk1fQlJBQ0VMRVRdLFxuXSBhcyBjb25zdDtcblxuZnVuY3Rpb24gc3dvcmRSZXF1aXJlbWVudChzd29yZDogbnVtYmVyLCBsZXZlbDogbnVtYmVyKTogUmVxdWlyZW1lbnQge1xuICBsZXQgcjtcbiAgaWYgKGxldmVsID09PSAxKSByPSBTV09SRFNbc3dvcmRdO1xuICBlbHNlIGlmIChsZXZlbCA9PT0gMykgcj0gYW5kKFNXT1JEU1tzd29yZF0sIC4uLlNXT1JEX1BPV0VSU1tzd29yZF0pO1xuICBlbHNlIHI9IG9yKC4uLlNXT1JEX1BPV0VSU1tzd29yZF0ubWFwKHAgPT4gYW5kKFNXT1JEU1tzd29yZF0sIHApKSk7XG4gIGlmIChBcnJheS5pc0FycmF5KHJbMF1bMF0pKSB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgcmV0dXJuIHI7XG59XG5cbmV4cG9ydCBjbGFzcyBPdmVybGF5IHtcblxuICBwcml2YXRlIHJlYWRvbmx5IHJlbGV2YW50RmxhZ3MgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgLy8gbnBjIGlkIC0+IHdhbnRlZCBpdGVtXG4gIHByaXZhdGUgcmVhZG9ubHkgdHJhZGVJbnMgPSBuZXcgTWFwPG51bWJlciwgcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXT4oKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IHNob290aW5nU3RhdHVlcyA9IG5ldyBTZXQ8U2NyZWVuSWQ+KCk7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGZsYWdzOiBGbGFnU2V0LFxuICAgICAgICAgICAgICBwcml2YXRlIHJlYWRvbmx5IHRyYWNrZXI6IGJvb2xlYW4pIHtcbiAgICAvLyBUT0RPIC0gYWRqdXN0IGJhc2VkIG9uIGZsYWdzZXQ/XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIFJFTEVWQU5UX0ZMQUdTKSB7XG4gICAgICB0aGlzLnJlbGV2YW50RmxhZ3MuYWRkKGZsYWcpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygcm9tLml0ZW1zKSB7XG4gICAgICBpZiAoIWl0ZW0udHJhZGVJbikgY29udGludWU7XG4gICAgICBjb25zdCBjb25kID0gaXRlbS5pZCA9PT0gMHgxZCA/IENhcGFiaWxpdHkuQlVZX0hFQUxJTkcgOiBJdGVtKGl0ZW0uaWQpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtLnRyYWRlSW4ubGVuZ3RoOyBpICs9IDYpIHtcbiAgICAgICAgdGhpcy50cmFkZUlucy5zZXQoaXRlbS50cmFkZUluW2ldLCBjb25kKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBsb2Mgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2Muc3Bhd25zKSB7XG4gICAgICAgIGlmIChzcGF3bi5pc01vbnN0ZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHgzZikgeyAvLyBzaG9vdGluZyBzdGF0dWVzXG4gICAgICAgICAgdGhpcy5zaG9vdGluZ1N0YXR1ZXMuYWRkKFNjcmVlbklkLmZyb20obG9jLCBzcGF3bikpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vICAgMHgxZCwgLy8gbWVkaWNhbCBoZXJiXG4gICAgLy8gICAweDI1LCAvLyBzdGF0dWUgb2Ygb255eFxuICAgIC8vICAgMHgzNSwgLy8gZm9nIGxhbXBcbiAgICAvLyAgIDB4M2IsIC8vIGxvdmUgcGVuZGFudFxuICAgIC8vICAgMHgzYywgLy8ga2lyaXNhIHBsYW50XG4gICAgLy8gICAweDNkLCAvLyBpdm9yeSBzdGF0dWVcbiAgICAvLyBdLm1hcChpID0+IHRoaXMucm9tLml0ZW1zW2ldKTtcbiAgfVxuXG4gIC8qKiBAcGFyYW0gaWQgT2JqZWN0IElEIG9mIHRoZSBib3NzLiAqL1xuICBib3NzUmVxdWlyZW1lbnRzKGJvc3M6IFJvbUJvc3MpOiBSZXF1aXJlbWVudCB7XG4gICAgLy8gVE9ETyAtIGhhbmRsZSBib3NzIHNodWZmbGUgc29tZWhvdz9cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLnJhZ2UpIHtcbiAgICAgIGlmICh0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFncy5yYW5kb21pemVUcmFkZXMoKSkgcmV0dXJuIENhcGFiaWxpdHkuU1dPUkQ7XG4gICAgICAvLyByZXR1cm4gSXRlbS5TV09SRF9PRl9XQVRFUjtcbiAgICAgIHJldHVybiBDb25kaXRpb24odGhpcy5yb20ubnBjc1sweGMzXS5sb2NhbERpYWxvZ3MuZ2V0KC0xKSFbMF0uY29uZGl0aW9uKTtcbiAgICB9XG4gICAgY29uc3QgaWQgPSBib3NzLm9iamVjdDtcbiAgICBjb25zdCBvdXQgPSBuZXcgTXV0YWJsZVJlcXVpcmVtZW50KCk7XG4gICAgaWYgKHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzLnNodWZmbGVCb3NzRWxlbWVudHMoKSkge1xuICAgICAgb3V0LmFkZEFsbChDYXBhYmlsaXR5LlNXT1JEKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuZmxhZ3MuZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpKSB7XG4gICAgICBjb25zdCBsZXZlbCA9IHRoaXMuZmxhZ3MuZ3VhcmFudGVlU3dvcmRNYWdpYygpID8gYm9zcy5zd29yZExldmVsIDogMTtcbiAgICAgIGNvbnN0IG9iaiA9IHRoaXMucm9tLm9iamVjdHNbaWRdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyBpKyspIHtcbiAgICAgICAgaWYgKG9iai5pc1Z1bG5lcmFibGUoaSkpIG91dC5hZGRBbGwoc3dvcmRSZXF1aXJlbWVudChpLCBsZXZlbCkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQuYWRkQWxsKENhcGFiaWxpdHkuU1dPUkQpO1xuICAgIH1cbiAgICBjb25zdCBleHRyYTogQ2FwYWJpbGl0eVtdID0gW107XG4gICAgaWYgKHRoaXMuZmxhZ3MuZ3VhcmFudGVlUmVmcmVzaCgpKSB7XG4gICAgICAvLyBUT0RPIC0gbWFrZSB0aGlzIFwiZ3VhcmFudGVlIGRlZmVuc2l2ZSBtYWdpY1wiIGFuZCBhbGxvdyByZWZyZXNoIE9SIGJhcnJpZXI/XG4gICAgICBleHRyYS5wdXNoKE1hZ2ljLlJFRlJFU0gpO1xuICAgIH1cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLmluc2VjdCkgeyAvLyBpbnNlY3RcbiAgICAgIGV4dHJhLnB1c2goSXRlbS5JTlNFQ1RfRkxVVEUsIEl0ZW0uR0FTX01BU0spO1xuICAgIH1cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLmRyYXlnb24yKSB7XG4gICAgICBleHRyYS5wdXNoKEl0ZW0uQk9XX09GX1RSVVRIKTtcbiAgICAgIGlmICh0aGlzLmZsYWdzLnN0b3J5TW9kZSgpKSB7XG4gICAgICAgIGV4dHJhLnB1c2goXG4gICAgICAgICAgQm9zcy5LRUxCRVNRVUUxLFxuICAgICAgICAgIEJvc3MuS0VMQkVTUVVFMixcbiAgICAgICAgICBCb3NzLlNBQkVSQTEsXG4gICAgICAgICAgQm9zcy5TQUJFUkEyLFxuICAgICAgICAgIEJvc3MuTUFETzEsXG4gICAgICAgICAgQm9zcy5NQURPMixcbiAgICAgICAgICBCb3NzLktBUk1JTkUsXG4gICAgICAgICAgQm9zcy5EUkFZR09OMSxcbiAgICAgICAgICBJdGVtLlNXT1JEX09GX1dJTkQsXG4gICAgICAgICAgSXRlbS5TV09SRF9PRl9GSVJFLFxuICAgICAgICAgIEl0ZW0uU1dPUkRfT0ZfV0FURVIsXG4gICAgICAgICAgSXRlbS5TV09SRF9PRl9USFVOREVSKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGV4dHJhLmxlbmd0aCkge1xuICAgICAgb3V0LnJlc3RyaWN0KGFuZCguLi5leHRyYSkpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmZyZWV6ZSgpO1xuICB9XG5cbiAgbG9jYXRpb25zKCk6IFRpbGVDaGVja1tdIHtcbiAgICBjb25zdCBsb2NhdGlvbnM6IFRpbGVDaGVja1tdID0gW107XG4gICAgLy8gVE9ETyAtIHB1bGwgdGhlIGxvY2F0aW9uIG91dCBvZiBpdGVtVXNlRGF0YVswXSBmb3IgdGhlc2UgaXRlbXNcbiAgICBsb2NhdGlvbnMucHVzaCh7XG4gICAgICB0aWxlOiBUaWxlSWQoMHgwZjAwODgpLFxuICAgICAgc2xvdDogU2xvdChFdmVudC5TVEFSVEVEX1dJTkRNSUxMKSxcbiAgICAgIGNvbmRpdGlvbjogSXRlbS5XSU5ETUlMTF9LRVksXG4gICAgfSwge1xuICAgICAgdGlsZTogVGlsZUlkKDB4ZTQwMDg4KSxcbiAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX0pPRUxfU0hFRCksXG4gICAgICBjb25kaXRpb246IEl0ZW0uRVlFX0dMQVNTRVMsXG4gICAgfSk7XG4gICAgZm9yIChjb25zdCBzaG9wIG9mIHRoaXMucm9tLnNob3BzKSB7XG4gICAgICAvLyBsZWFmIGFuZCBzaHlyb24gbWF5IG5vdCBhbHdheXMgYmUgYWNjZXNzaWJsZSwgc28gZG9uJ3QgcmVseSBvbiB0aGVtLlxuICAgICAgaWYgKHNob3AubG9jYXRpb24gPT09IDB4YzMgfHwgc2hvcC5sb2NhdGlvbiA9PT0gMHhmNikgY29udGludWU7XG4gICAgICBpZiAoIXNob3AudXNlZCkgY29udGludWU7XG4gICAgICBpZiAoc2hvcC50eXBlICE9PSBTaG9wVHlwZS5UT09MKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGNoZWNrID0ge1xuICAgICAgICB0aWxlOiBUaWxlSWQoc2hvcC5sb2NhdGlvbiA8PCAxNiB8IDB4ODgpLFxuICAgICAgICBjb25kaXRpb246IENhcGFiaWxpdHkuTU9ORVksXG4gICAgICB9O1xuICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHNob3AuY29udGVudHMpIHtcbiAgICAgICAgaWYgKGl0ZW0gPT09IChJdGVtLk1FRElDQUxfSEVSQlswXVswXSAmIDB4ZmYpKSB7XG4gICAgICAgICAgbG9jYXRpb25zLnB1c2goey4uLmNoZWNrLCBzbG90OiBTbG90KENhcGFiaWxpdHkuQlVZX0hFQUxJTkcpfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSA9PT0gKEl0ZW0uV0FSUF9CT09UU1swXVswXSAmIDB4ZmYpKSB7XG4gICAgICAgICAgbG9jYXRpb25zLnB1c2goey4uLmNoZWNrLCBzbG90OiBTbG90KENhcGFiaWxpdHkuQlVZX1dBUlApfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxvY2F0aW9ucztcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHVuZGVmaW5lZCBpZiBpbXBhc3NhYmxlLiAqL1xuICBtYWtlVGVycmFpbihlZmZlY3RzOiBudW1iZXIsIHRpbGU6IFRpbGVJZCk6IFRlcnJhaW4gfCB1bmRlZmluZWQge1xuICAgIC8vIENoZWNrIGZvciBkb2xwaGluIG9yIHN3YW1wLiAgQ3VycmVudGx5IGRvbid0IHN1cHBvcnQgc2h1ZmZsaW5nIHRoZXNlLlxuICAgIGNvbnN0IGxvYyA9IHRpbGUgPj4+IDE2O1xuICAgIGVmZmVjdHMgJj0gMHgyNjtcbiAgICBpZiAobG9jID09PSAweDFhKSBlZmZlY3RzIHw9IDB4MDg7XG4gICAgaWYgKGxvYyA9PT0gMHg2MCB8fCBsb2MgPT09IDB4NjgpIGVmZmVjdHMgfD0gMHgxMDtcbiAgICAvLyBOT1RFOiBvbmx5IHRoZSB0b3AgaGFsZi1zY3JlZW4gaW4gdW5kZXJncm91bmQgY2hhbm5lbCBpcyBkb2xwaGluYWJsZVxuICAgIGlmIChsb2MgPT09IDB4NjQgJiYgKCh0aWxlICYgMHhmMGYwKSA8IDB4OTApKSBlZmZlY3RzIHw9IDB4MTA7XG4gICAgaWYgKHRoaXMuc2hvb3RpbmdTdGF0dWVzLmhhcyhTY3JlZW5JZC5mcm9tVGlsZSh0aWxlKSkpIGVmZmVjdHMgfD0gMHgwMTtcbiAgICBpZiAoZWZmZWN0cyAmIDB4MjApIHsgLy8gc2xvcGVcbiAgICAgIC8vIERldGVybWluZSBsZW5ndGggb2Ygc2xvcGU6IHNob3J0IHNsb3BlcyBhcmUgY2xpbWJhYmxlLlxuICAgICAgLy8gNi04IGFyZSBib3RoIGRvYWJsZSB3aXRoIGJvb3RzXG4gICAgICAvLyAwLTUgaXMgZG9hYmxlIHdpdGggbm8gYm9vdHNcbiAgICAgIC8vIDkgaXMgZG9hYmxlIHdpdGggcmFiYml0IGJvb3RzIG9ubHkgKG5vdCBhd2FyZSBvZiBhbnkgb2YgdGhlc2UuLi4pXG4gICAgICAvLyAxMCBpcyByaWdodCBvdXRcbiAgICAgIGNvbnN0IGdldEVmZmVjdHMgPSAodGlsZTogVGlsZUlkKTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgbCA9IHRoaXMucm9tLmxvY2F0aW9uc1t0aWxlID4+PiAxNl07XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IGwuc2NyZWVuc1sodGlsZSAmIDB4ZjAwMCkgPj4+IDEyXVsodGlsZSAmIDB4ZjAwKSA+Pj4gOF07XG4gICAgICAgIHJldHVybiB0aGlzLnJvbS50aWxlRWZmZWN0c1tsLnRpbGVFZmZlY3RzIC0gMHhiM11cbiAgICAgICAgICAgIC5lZmZlY3RzW3RoaXMucm9tLnNjcmVlbnNbc2NyZWVuXS50aWxlc1t0aWxlICYgMHhmZl1dO1xuICAgICAgfTtcbiAgICAgIGxldCBib3R0b20gPSB0aWxlO1xuICAgICAgbGV0IGhlaWdodCA9IC0xO1xuICAgICAgd2hpbGUgKGdldEVmZmVjdHMoYm90dG9tKSAmIDB4MjApIHtcbiAgICAgICAgYm90dG9tID0gVGlsZUlkLmFkZChib3R0b20sIDEsIDApO1xuICAgICAgICBoZWlnaHQrKztcbiAgICAgIH1cbiAgICAgIGxldCB0b3AgPSB0aWxlO1xuICAgICAgd2hpbGUgKGdldEVmZmVjdHModG9wKSAmIDB4MjApIHtcbiAgICAgICAgdG9wID0gVGlsZUlkLmFkZCh0b3AsIC0xLCAwKTtcbiAgICAgICAgaGVpZ2h0Kys7XG4gICAgICB9XG4gICAgICBpZiAoaGVpZ2h0IDwgNikge1xuICAgICAgICBlZmZlY3RzICY9IH4weDIwO1xuICAgICAgfSBlbHNlIGlmIChoZWlnaHQgPCA5KSB7XG4gICAgICAgIGVmZmVjdHMgfD0gMHg0MDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFRFUlJBSU5TW2VmZmVjdHNdO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNvbnNpZGVyIGZvbGRpbmcgdGhpcyBpbnRvIGxvY2F0aW9uL3RyaWdnZXIvbnBjIGFzIGFuIGV4dHJhIHJldHVybj9cbiAgZXh0cmFSb3V0ZXMoKTogRXh0cmFSb3V0ZVtdIHtcbiAgICBjb25zdCByb3V0ZXMgPSBbXTtcbiAgICBjb25zdCBlbnRyYW5jZSA9IChsb2NhdGlvbjogbnVtYmVyLCBlbnRyYW5jZTogbnVtYmVyID0gMCk6IFRpbGVJZCA9PiB7XG4gICAgICBjb25zdCBsID0gdGhpcy5yb20ubG9jYXRpb25zW2xvY2F0aW9uXTtcbiAgICAgIGNvbnN0IGUgPSBsLmVudHJhbmNlc1tlbnRyYW5jZV07XG4gICAgICByZXR1cm4gVGlsZUlkLmZyb20obCwgZSk7XG4gICAgfTtcbiAgICAvLyBTdGFydCB0aGUgZ2FtZSBhdCAwOjBcbiAgICByb3V0ZXMucHVzaCh7dGlsZTogZW50cmFuY2UoMCl9KTtcbiAgICAvLyBTd29yZCBvZiBUaHVuZGVyIHdhcnBcbiAgICAvLyBUT0RPIC0gZW50cmFuY2Ugc2h1ZmZsZSB3aWxsIGJyZWFrIHRoZSBhdXRvLXdhcnAtcG9pbnQgYWZmb3JkYW5jZS5cbiAgICBpZiAodGhpcy5mbGFncy50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCkpIHtcbiAgICAgIHJvdXRlcy5wdXNoKHtcbiAgICAgICAgdGlsZTogZW50cmFuY2UoMHg4YywgMSksIC8vIG5vdCBmMiBzaW5jZSBuby10aHVuZGVyLXN3b3JkLWZvci1tYXNzYWNyZVxuICAgICAgICBjb25kaXRpb246IG9yKGFuZChJdGVtLlNXT1JEX09GX1RIVU5ERVIsIENhcGFiaWxpdHkuQlVZX1dBUlApLFxuICAgICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX1RIVU5ERVIsIE1hZ2ljLlRFTEVQT1JUKSksXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3MuYXNzdW1lV2lsZFdhcnAoKSkge1xuICAgICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiB0aGlzLnJvbS53aWxkV2FycC5sb2NhdGlvbnMpIHtcbiAgICAgICAgcm91dGVzLnB1c2goe3RpbGU6IGVudHJhbmNlKGxvY2F0aW9uKX0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcm91dGVzO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNvbnNpZGVyIGZvbGRpbmcgdGhpcyBpbnRvIGxvY2F0aW9uL3RyaWdnZXIvbnBjIGFzIGFuIGV4dHJhIHJldHVybj9cbiAgZXh0cmFFZGdlcygpOiBFeHRyYUVkZ2VbXSB7XG4gICAgY29uc3QgZWRnZXMgPSBbXTtcbiAgICAvLyBuZWVkIGFuIGVkZ2UgZnJvbSB0aGUgYm9hdCBob3VzZSB0byB0aGUgYmVhY2ggLSB3ZSBjb3VsZCBidWlsZCB0aGlzIGludG8gdGhlXG4gICAgLy8gYm9hdCBib2FyZGluZyB0cmlnZ2VyLCBidXQgZm9yIG5vdyBpdCdzIGhlcmUuXG4gICAgZWRnZXMucHVzaCh7XG4gICAgICBmcm9tOiBUaWxlSWQoMHg1MTAwODgpLCAvLyBpbiBmcm9udCBvZiBib2F0IGhvdXNlXG4gICAgICB0bzogVGlsZUlkKDB4NjA4Njg4KSwgLy8gaW4gZnJvbnQgb2YgY2FiaW5cbiAgICAgIGNvbmRpdGlvbjogRXZlbnQuUkVUVVJORURfRk9HX0xBTVAsXG4gICAgfSk7XG4gICAgcmV0dXJuIGVkZ2VzO1xuICB9XG5cbiAgdHJpZ2dlcihpZDogbnVtYmVyKTogVHJpZ2dlckRhdGEge1xuICAgIHN3aXRjaCAoaWQpIHtcbiAgICBjYXNlIDB4OWE6IC8vIHN0YXJ0IGZpZ2h0IHdpdGggbWFkbyBpZiBzaHlyb24gbWFzc2FjcmUgc3RhcnRlZFxuICAgICAgLy8gVE9ETyAtIGxvb2sgdXAgd2hvIHRoZSBhY3R1YWwgYm9zcyBpcyBvbmNlIHdlIGdldCBib3NzIHNodWZmbGUhISFcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogbWVldChFdmVudC5TSFlST05fTUFTU0FDUkUsIHRoaXMuYm9zc1JlcXVpcmVtZW50cyh0aGlzLnJvbS5ib3NzZXMubWFkbzEpKSxcbiAgICAgICAgc2xvdDogU2xvdChCb3NzLk1BRE8xKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YWE6IC8vIGVudGVyIG9hayBhZnRlciBpbnNlY3RcbiAgICAgIC8vIE5PVEU6IFRoaXMgaXMgbm90IHRoZSB0cmlnZ2VyIHRoYXQgY2hlY2tzLCBidXQgcmF0aGVyIGl0IGhhcHBlbnMgb24gdGhlIGVudHJhbmNlLlxuICAgICAgLy8gVGhpcyBpcyBhIGNvbnZlbmllbnQgcGxhY2UgdG8gaGFuZGxlIGl0LCB0aG91Z2gsIHNpbmNlIHdlIGFscmVhZHkgbmVlZCB0byBleHBsaWNpdGx5XG4gICAgICAvLyBpZ25vcmUgdGhpcyB0cmlnZ2VyLiAgV2UgYWxzbyByZXF1aXJlIHdhcnAgYm9vdHMgYmVjYXVzZSBpdCdzIHBvc3NpYmxlIHRoYXQgdGhlcmUnc1xuICAgICAgLy8gbm8gZGlyZWN0IHdhbGtpbmcgcGF0aCBhbmQgaXQncyBub3QgZmVhc2libGUgdG8gY2FycnkgdGhlIGNoaWxkIHdpdGggdXMgZXZlcnl3aGVyZSxcbiAgICAgIC8vIGR1ZSB0byBncmFwaGljcyByZWFzb25zLlxuICAgICAgcmV0dXJuIHtjaGVjazpbe1xuICAgICAgICBjb25kaXRpb246IGFuZChFdmVudC5EV0FSRl9DSElMRCwgQ2FwYWJpbGl0eS5CVVlfV0FSUCksXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuUkVTQ1VFRF9DSElMRCksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFkOiAvLyBhbGxvdyBvcGVuaW5nIHByaXNvbiBkb29yXG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IEl0ZW0uS0VZX1RPX1BSSVNPTixcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5PUEVORURfUFJJU09OKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YWU6IC8vIGFsbG93IG9wZW5pbmcgc3R4eVxuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBJdGVtLktFWV9UT19TVFlYLFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9TVFlYKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YWY6IC8vIGFsbG93IGNhbG1pbmcgc2VhXG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IEl0ZW0uU1RBVFVFX09GX0dPTEQsXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuQ0FMTUVEX1NFQSksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGIxOiAvLyBzdGFydCBmaWdodCB3aXRoIGd1YXJkaWFuIHN0YXR1ZXNcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogYW5kKEl0ZW0uQk9XX09GX1NVTiwgSXRlbS5CT1dfT0ZfTU9PTiksXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX0NSWVBUKSxcbiAgICAgIH1dfTtcbiAgICB9XG4gICAgLy8gQ2hlY2sgZm9yIHJlbGV2YW50IGZsYWdzIGFuZCBrbm93biBhY3Rpb24gdHlwZXMuXG4gICAgY29uc3QgdHJpZ2dlciA9IHRoaXMucm9tLnRyaWdnZXJzW2lkICYgMHg3Zl07XG4gICAgaWYgKCF0cmlnZ2VyIHx8ICF0cmlnZ2VyLnVzZWQpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0cmlnZ2VyOiAke2hleChpZCl9YCk7XG4gICAgY29uc3QgcmVsZXZhbnQgPSAoZjogbnVtYmVyKSA9PiB0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGYpO1xuICAgIGNvbnN0IHJlbGV2YW50QW5kU2V0ID0gKGY6IG51bWJlcikgPT4gZiA+IDAgJiYgdGhpcy5yZWxldmFudEZsYWdzLmhhcyhmKTtcbiAgICBmdW5jdGlvbiBtYXAoZjogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgIGlmIChmIDwgMCkgcmV0dXJuIH5tYXAofmYpO1xuICAgICAgY29uc3QgbWFwcGVkID0gRkxBR19NQVAuZ2V0KGYpO1xuICAgICAgcmV0dXJuIG1hcHBlZCAhPSBudWxsID8gbWFwcGVkWzBdWzBdIDogZjtcbiAgICB9XG4gICAgY29uc3QgYWN0aW9uSXRlbSA9IFRSSUdHRVJfQUNUSU9OX0lURU1TW3RyaWdnZXIubWVzc2FnZS5hY3Rpb25dO1xuICAgIGNvbnN0IGNvbmRpdGlvbiA9IGFuZCguLi50cmlnZ2VyLmNvbmRpdGlvbnMubWFwKG1hcCkuZmlsdGVyKHJlbGV2YW50QW5kU2V0KS5tYXAoQ29uZGl0aW9uKSk7XG4gICAgaWYgKHRyaWdnZXIubWVzc2FnZS5hY3Rpb24gPT09IDB4MTkpIHsgLy8gcHVzaC1kb3duIHRyaWdnZXJcbiAgICAgIC8vIFRPRE8gLSBwYXNzIGluIHRlcnJhaW47IGlmIG9uIGxhbmQgYW5kIHRyaWdnZXIgc2tpcCBpcyBvbiB0aGVuXG4gICAgICAvLyBhZGQgYSByb3V0ZSByZXF1aXJpbmcgcmFiYml0IGJvb3RzIGFuZCBlaXRoZXIgd2FycCBib290cyBvciB0ZWxlcG9ydD9cbiAgICAgIGNvbnN0IGV4dHJhOiBUcmlnZ2VyRGF0YSA9IHt9O1xuICAgICAgaWYgKHRyaWdnZXIuaWQgPT09IDB4ODYgJiYgIXRoaXMuZmxhZ3MuYXNzdW1lUmFiYml0U2tpcCgpKSB7XG4gICAgICAgIGV4dHJhLmR4ID0gWy0zMiwgLTE2LCAwLCAxNl07XG4gICAgICB9XG4gICAgICBpZiAodHJpZ2dlci5pZCA9PT0gMHhiYSAmJlxuICAgICAgICAgICF0aGlzLmZsYWdzLmRpc2FibGVUZWxlcG9ydFNraXAoKSAmJlxuICAgICAgICAgICF0aGlzLmZsYWdzLmFzc3VtZVRlbGVwb3J0U2tpcCgpKSB7XG4gICAgICAgIGV4dHJhLmV4dHJhTG9jYXRpb25zID0gW3RoaXMucm9tLmxvY2F0aW9ucy5jb3JkZWxQbGFpbnNXZXN0XTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvbmQgPVxuICAgICAgICAgIHRyaWdnZXIuY29uZGl0aW9ucy5tYXAoYyA9PiBjIDwgMCAmJiByZWxldmFudCh+bWFwKGMpKSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDb25kaXRpb24ofm1hcChjKSkgOiBudWxsKVxuICAgICAgICAgICAgICAuZmlsdGVyKChjOiB1bmtub3duKTogYyBpcyBbW0NvbmRpdGlvbl1dID0+IGMgIT0gbnVsbCk7XG4gICAgICBpZiAoY29uZCAmJiBjb25kLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gey4uLmV4dHJhLCB0ZXJyYWluOiB7ZXhpdDogb3IoLi4uY29uZCl9fTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGFjdGlvbkl0ZW0gIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHtjaGVjazogW3tjb25kaXRpb24sIHNsb3Q6IGFjdGlvbkl0ZW19XX07XG4gICAgfVxuICAgIGNvbnN0IGZsYWdzID0gdHJpZ2dlci5mbGFncy5maWx0ZXIocmVsZXZhbnRBbmRTZXQpO1xuICAgIGlmIChmbGFncy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB7Y2hlY2s6IGZsYWdzLm1hcChmID0+ICh7Y29uZGl0aW9uLCBzbG90OiBTbG90KGYpfSkpfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge307XG4gIH1cblxuICBucGMoaWQ6IG51bWJlciwgbG9jOiBMb2NhdGlvbik6IE5wY0RhdGEge1xuICAgIGNvbnN0IG5wYyA9IHRoaXMucm9tLm5wY3NbaWRdO1xuICAgIGlmICghbnBjIHx8ICFucGMudXNlZCkgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRyaWdnZXI6ICR7aGV4KGlkKX1gKTtcblxuICAgIGNvbnN0IHNwYXduQ29uZGl0aW9uczogcmVhZG9ubHkgbnVtYmVyW10gPSBucGMuc3Bhd25Db25kaXRpb25zLmdldChsb2MuaWQpIHx8IFtdO1xuXG4gICAgY29uc3QgcmVzdWx0OiBOcGNEYXRhICYge2NoZWNrOiBDaGVja1tdfSA9IHtjaGVjazogW119O1xuXG4gICAgaWYgKG5wYy5kYXRhWzJdICYgMHgwNCkge1xuICAgICAgLy8gcGVyc29uIGlzIGEgc3RhdHVlLlxuICAgICAgcmVzdWx0LnRlcnJhaW4gPSB7XG4gICAgICAgIGV4aXQ6IHRoaXMuZmxhZ3MuYXNzdW1lU3RhdHVlR2xpdGNoKCkgP1xuICAgICAgICAgICAgICAgICAgW1tdXSA6IFxuICAgICAgICAgICAgICAgICAgb3IoLi4uc3Bhd25Db25kaXRpb25zLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICB4ID0+IEZMQUdfTUFQLmdldCh4KSB8fCAodGhpcy5yZWxldmFudEZsYWdzLmhhcyh4KSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENvbmRpdGlvbih4KSA6IFtdKSkpLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdGF0dWVPciguLi5yZXFzOiBSZXF1aXJlbWVudFtdKTogdm9pZCB7XG4gICAgICBpZiAoIXJlc3VsdC50ZXJyYWluKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgdGVycmFpbiBmb3IgZ3VhcmQnKTtcbiAgICAgIHJlc3VsdC50ZXJyYWluLmV4aXQgPSBvcihyZXN1bHQudGVycmFpbi5leGl0IHx8IFtdLCAuLi5yZXFzKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gZm9ydHVuZSB0ZWxsZXIgKDM5KSByZXF1aXJlcyBhY2Nlc3MgdG8gcG9ydG9hIHRvIGdldCBoZXIgdG8gbW92ZT9cbiAgICAvLyAgICAgIC0+IG1heWJlIGluc3RlYWQgY2hhbmdlIHRoZSBmbGFnIHRvIHNldCBpbW1lZGlhdGVseSBvbiB0YWxraW5nIHRvIGhlclxuICAgIC8vICAgICAgICAgcmF0aGVyIHRoYW4gdGhlIHRyaWdnZXIgb3V0c2lkZSB0aGUgZG9vci4uLj8gdGhpcyB3b3VsZCBhbGxvdyBnZXR0aW5nXG4gICAgLy8gICAgICAgICB0aHJvdWdoIGl0IGJ5IGp1c3QgdGFsa2luZyBhbmQgdGhlbiBsZWF2aW5nIHRoZSByb29tLi4uXG5cbiAgICBzd2l0Y2ggKGlkKSB7XG4gICAgY2FzZSAweDE0OiAvLyB3b2tlbi11cCB3aW5kbWlsbCBndWFyZFxuICAgICAgLy8gc2tpcCBiZWNhdXNlIHdlIHRpZSB0aGUgaXRlbSB0byB0aGUgc2xlZXBpbmcgb25lLlxuICAgICAgaWYgKGxvYy5zcGF3bnMuZmluZChsID0+IGwuaXNOcGMoKSAmJiBsLmlkID09PSAweDE1KSkgcmV0dXJuIHt9O1xuICAgIGNhc2UgMHgyNTogLy8gYW1hem9uZXMgZ3VhcmRcbiAgICAgIHJlc3VsdC5oaXRib3ggPSB7eDA6IDAsIHgxOiAyLCB5MDogMCwgeTE6IDF9O1xuICAgICAgc3RhdHVlT3IoTWFnaWMuQ0hBTkdFLCBNYWdpYy5QQVJBTFlTSVMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDJkOiAvLyBtdCBzYWJyZS9zd2FuIHNvbGRpZXJzXG4gICAgICAvLyBUaGVzZSBkb24ndCBjb3VudCBhcyBzdGF0dWVzIGJlY2F1c2UgdGhleSdsbCBtb3ZlIGlmIHlvdSB0YWxrIHRvIHRoZW0uXG4gICAgICBkZWxldGUgcmVzdWx0LnRlcnJhaW47XG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4MzM6IC8vIHBvcnRvYSBndWFyZCAodGhyb25lIHJvb20sIHRob3VnaCB0aGUgcGFsYWNlIG9uZSBpcyB0aGUgb25lIHRoYXQgbWF0dGVycylcbiAgICAgIC8vIE5PVEU6IHRoaXMgbWVhbnMgdGhhdCB3ZSBjYW5ub3Qgc2VwYXJhdGUgdGhlIHBhbGFjZSBmb3llciBmcm9tIHRoZSB0aHJvbmUgcm9vbSwgc2luY2VcbiAgICAgIC8vIHRoZXJlJ3Mgbm8gd2F5IHRvIHJlcHJlc2VudCB0aGUgY29uZGl0aW9uIGZvciBwYXJhbHl6aW5nIHRoZSBndWFyZCBhbmQgc3RpbGwgaGF2ZSBoaW1cbiAgICAgIC8vIHBhc3NhYmxlIHdoZW4gdGhlIHF1ZWVuIGlzIHRoZXJlLiAgVGhlIHdob2xlIHNlcXVlbmNlIGlzIGFsc28gdGlnaHRseSBjb3VwbGVkLCBzbyBpdFxuICAgICAgLy8gcHJvYmFibHkgd291bGRuJ3QgbWFrZSBzZW5zZSB0byBzcGxpdCBpdCB1cCBhbnl3YXkuXG4gICAgICBzdGF0dWVPcihNYWdpYy5QQVJBTFlTSVMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDM4OiAvLyBwb3J0b2EgcXVlZW4gc2l0dGluZyBvbiBpbXBhc3NhYmxlIHRocm9uZVxuICAgICAgaWYgKGxvYy5pZCA9PT0gMHhkZikgcmVzdWx0LmhpdGJveCA9IHt4MDogMCwgeDE6IDEsIHkwOiAyLCB5MTogM307XG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4NGU6IC8vIHNoeXJvbiBndWFyZFxuICAgICAgcmVzdWx0LmhpdGJveCA9IHt4MDogLTEsIHgxOiAyLCB5MDogMCwgeTE6IDF9O1xuICAgICAgc3RhdHVlT3IoTWFnaWMuQ0hBTkdFLCBFdmVudC5FTlRFUkVEX1NIWVJPTik7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4ODA6IC8vIGdvYSBndWFyZHNcbiAgICAgIHN0YXR1ZU9yKC4uLnNwYXduQ29uZGl0aW9ucy5tYXAoYyA9PiBDb25kaXRpb24ofmMpKSk7IC8vIEV2ZW50LkVOVEVSRURfU0hZUk9OXG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4ODU6IC8vIHN0b25lZCBwYWlyXG4gICAgICBzdGF0dWVPcihJdGVtLkZMVVRFX09GX0xJTUUpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gaW50ZXJzZWN0IHNwYXduIGNvbmRpdGlvbnNcbiAgICBjb25zdCByZXF1aXJlbWVudHM6IEFycmF5PHJlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV0+ID0gW107XG4gICAgY29uc3QgYWRkUmVxID0gKGZsYWc6IG51bWJlcik6IHZvaWQgPT4ge1xuICAgICAgaWYgKGZsYWcgPD0gMCkgcmV0dXJuOyAvLyBuZWdhdGl2ZSBvciB6ZXJvIGZsYWcgaWdub3JlZFxuICAgICAgY29uc3QgcmVxID0gRkxBR19NQVAuZ2V0KGZsYWcpIHx8ICh0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGZsYWcpID8gQ29uZGl0aW9uKGZsYWcpIDogbnVsbCk7XG4gICAgICBpZiAocmVxICE9IG51bGwpIHJlcXVpcmVtZW50cy5wdXNoKHJlcSk7XG4gICAgfTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2Ygc3Bhd25Db25kaXRpb25zKSB7XG4gICAgICBhZGRSZXEoZmxhZyk7XG4gICAgfVxuXG4gICAgLy8gTG9vayBmb3IgdHJhZGUtaW5zXG4gICAgLy8gIC0gVE9ETyAtIGRvbid0IGhhcmQtY29kZSB0aGUgTlBDcz8gcmVhZCBmcm9tIHRoZSBpdGVtZGF0YT9cbiAgICBjb25zdCB0cmFkZUluID0gdGhpcy50cmFkZUlucy5nZXQoaWQpXG4gICAgaWYgKHRyYWRlSW4gIT0gbnVsbCkge1xuICAgICAgY29uc3QgdCA9IHRyYWRlSW47XG4gICAgICBmdW5jdGlvbiB0cmFkZShzbG90OiBTbG90LCAuLi5yZXFzOiBBcnJheTxyZWFkb25seSBbcmVhZG9ubHkgQ29uZGl0aW9uW11dPik6IHZvaWQge1xuICAgICAgICBjb25zdCBjb25kaXRpb24gPSBhbmQoLi4ucmVxdWlyZW1lbnRzLCB0LCAuLi5yZXFzKTtcbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3QsIGNvbmRpdGlvbn0pO1xuICAgICAgfVxuICAgICAgbGV0IHRyYWRlUiA9IHRyYWRlO1xuICAgICAgaWYgKHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzLnJhbmRvbWl6ZVRyYWRlcygpKSB7XG4gICAgICAgIHRyYWRlUiA9IChzbG90LCAuLi5yZXFzKSA9PiB7XG4gICAgICAgICAgY29uc3QgaXRlbXMgPSBbXG4gICAgICAgICAgICBJdGVtLlNUQVRVRV9PRl9PTllYLFxuICAgICAgICAgICAgSXRlbS5GT0dfTEFNUCxcbiAgICAgICAgICAgIEl0ZW0uTE9WRV9QRU5EQU5ULFxuICAgICAgICAgICAgSXRlbS5LSVJJU0FfUExBTlQsXG4gICAgICAgICAgICBJdGVtLklWT1JZX1NUQVRVRSxcbiAgICAgICAgICBdO1xuICAgICAgICAgIGNvbnN0IGNvbmRpdGlvbiA9XG4gICAgICAgICAgICAgIG9yKC4uLml0ZW1zLm1hcChpID0+IGFuZCguLi5yZXF1aXJlbWVudHMsIGksIC4uLnJlcXMpKSk7XG4gICAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3QsIGNvbmRpdGlvbn0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzd2l0Y2ggKGlkKSB7XG4gICAgICBjYXNlIDB4MTU6IC8vIHNsZWVwaW5nIHdpbmRtaWxsIGd1YXJkID0+IHdpbmRtaWxsIGtleSBzbG90XG4gICAgICAgIHRyYWRlKFNsb3QoSXRlbS5XSU5ETUlMTF9LRVkpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4MjM6IC8vIGFyeWxsaXMgPT4gYm93IG9mIG1vb24gc2xvdFxuICAgICAgICAvLyBOT1RFOiBzaXR0aW5nIG9uIGltcGFzc2libGUgdGhyb25lXG4gICAgICAgIHJlc3VsdC5oaXRib3ggPSB7eDA6IC0xLCB4MTogMiwgeTA6IC0xLCB5MTogMn07XG4gICAgICAgIHRyYWRlUihTbG90KEl0ZW0uQk9XX09GX01PT04pLCBNYWdpYy5DSEFOR0UpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg2MzogLy8gaHVydCBkb2xwaGluID0+IGhlYWxlZCBkb2xwaGluXG4gICAgICAgIC8vIE5PVEU6IGRvbHBoaW4gb24gd2F0ZXIsIGJ1dCBjYW4gaGVhbCBmcm9tIGxhbmRcbiAgICAgICAgcmVzdWx0LmhpdGJveCA9IHt4MDogLTEsIHgxOiAyLCB5MDogLTEsIHkxOiAyfTtcbiAgICAgICAgdHJhZGUoU2xvdChFdmVudC5IRUFMRURfRE9MUEhJTikpO1xuICAgICAgICB0cmFkZShTbG90KEl0ZW0uU0hFTExfRkxVVEUpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NjQ6IC8vIGZpc2hlcm1hblxuICAgICAgICB0cmFkZVIoU2xvdChFdmVudC5SRVRVUk5FRF9GT0dfTEFNUCksXG4gICAgICAgICAgICAgICAuLi4odGhpcy5mbGFncy5yZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpID9cbiAgICAgICAgICAgICAgICAgICBbRXZlbnQuSEVBTEVEX0RPTFBISU5dIDogW10pKTtcbiAgICAgICAgLy8gVE9ETyAtIHVzZSB0aGlzIGFzIHByb3h5IGZvciBib2F0XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDZiOiAvLyBzbGVlcGluZyBrZW5zdVxuICAgICAgICB0cmFkZShTbG90KEl0ZW0uR0xPV0lOR19MQU1QKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDc1OiAvLyBzbGltZWQga2Vuc3UgPT4gZmxpZ2h0IHNsb3RcbiAgICAgICAgdHJhZGVSKFNsb3QoTWFnaWMuRkxJR0hUKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDc0OiAvLyBrZW5zdSBpbiBkYW5jZSBoYWxsID0+IGNoYW5nZSBzbG90XG4gICAgICAgIC8vIE5PVEU6IHRoaXMgaXMgbm9ybWFsbHkgN2UgYnV0IHdlIGNoYW5nZSBpdCB0byA3NCBpbiB0aGlzIG9uZVxuICAgICAgICAvLyBsb2NhdGlvbiB0byBpZGVudGlmeSBpdFxuICAgICAgICB0cmFkZVIoU2xvdChNYWdpYy5DSEFOR0UpLCBNYWdpYy5QQVJBTFlTSVMsIEV2ZW50LkZPVU5EX0tFTlNVKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4ODI6IC8vIGFrYWhhbmEgPT4gZ2FzIG1hc2sgc2xvdCAoY2hhbmdlZCAxNiAtPiA4MilcbiAgICAgICAgdHJhZGVSKFNsb3QoSXRlbS5HQVNfTUFTSykpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg4ODogLy8gc3RvbmVkIGFrYWhhbmEgPT4gc2hpZWxkIHJpbmcgc2xvdFxuICAgICAgICB0cmFkZShTbG90KEl0ZW0uU0hJRUxEX1JJTkcpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTlBDcyB0aGF0IG5lZWQgYSBsaXR0bGUgZXh0cmEgY2FyZVxuXG4gICAgaWYgKGlkID09PSAweDg0KSB7IC8vIHN0YXJ0IGZpZ2h0IHdpdGggc2FiZXJhXG4gICAgICAvLyBUT0RPIC0gbG9vayB1cCB3aG8gdGhlIGFjdHVhbCBib3NzIGlzIG9uY2Ugd2UgZ2V0IGJvc3Mgc2h1ZmZsZSEhIVxuICAgICAgY29uc3QgY29uZGl0aW9uID0gdGhpcy5ib3NzUmVxdWlyZW1lbnRzKHRoaXMucm9tLmJvc3Nlcy5zYWJlcmExKTtcbiAgICAgIHJldHVybiB7Y2hlY2s6IFtcbiAgICAgICAge2NvbmRpdGlvbiwgc2xvdDogU2xvdChCb3NzLlNBQkVSQTEpfSxcbiAgICAgIF19O1xuICAgIH0gZWxzZSBpZiAoaWQgPT09IDB4MWQpIHsgLy8gb2FrIGVsZGVyIGhhcyBzb21lIHdlaXJkIHVudHJhY2tlZCBjb25kaXRpb25zLlxuICAgICAgY29uc3Qgc2xvdCA9IFNsb3QoSXRlbS5TV09SRF9PRl9GSVJFKTtcbiAgICAgIHJldHVybiB7Y2hlY2s6IFtcbiAgICAgICAgLy8gdHdvIGRpZmZlcmVudCB3YXlzIHRvIGdldCB0aGUgc3dvcmQgb2YgZmlyZSBpdGVtXG4gICAgICAgIHtjb25kaXRpb246IGFuZChNYWdpYy5URUxFUEFUSFksIEJvc3MuSU5TRUNUKSwgc2xvdH0sXG4gICAgICAgIHtjb25kaXRpb246IEV2ZW50LlJFU0NVRURfQ0hJTEQsIHNsb3R9LFxuICAgICAgXX07XG4gICAgfSBlbHNlIGlmIChpZCA9PT0gMHgxZikgeyAvLyBkd2FyZiBjaGlsZFxuICAgICAgY29uc3Qgc3Bhd25zID0gdGhpcy5yb20ubnBjc1tpZF0uc3Bhd25Db25kaXRpb25zLmdldChsb2MuaWQpO1xuICAgICAgaWYgKHNwYXducyAmJiBzcGF3bnMuaW5jbHVkZXMoMHgwNDUpKSByZXR1cm4ge307IC8vIGluIG1vdGhlcidzIGhvdXNlXG4gICAgICByZXR1cm4ge2NoZWNrOiBbXG4gICAgICAgIHtjb25kaXRpb246IEV2ZW50LkRXQVJGX01PVEhFUiwgc2xvdDogU2xvdChFdmVudC5EV0FSRl9DSElMRCl9LFxuICAgICAgXX07XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBkIG9mIG5wYy5nbG9iYWxEaWFsb2dzKSB7XG4gICAgICBhZGRSZXEofmQuY29uZGl0aW9uKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBkIG9mIG5wYy5sb2NhbERpYWxvZ3MuZ2V0KGxvYy5pZCkgfHwgbnBjLmxvY2FsRGlhbG9ncy5nZXQoLTEpIHx8IFtdKSB7XG4gICAgICAvLyBJZiB0aGUgY2hlY2sgY29uZGl0aW9uIGlzIG9wcG9zaXRlIHRvIHRoZSBzcGF3biBjb25kaXRpb24sIHRoZW4gc2tpcC5cbiAgICAgIC8vIFRoaXMgZW5zdXJlcyB3ZSBkb24ndCBleHBlY3QgdGhlIHF1ZWVuIHRvIGdpdmUgcmVjb3ZlciBpbiB0aGUgdGhyb25lIHJvb20uXG4gICAgICBpZiAoc3Bhd25Db25kaXRpb25zLmluY2x1ZGVzKH5kLmNvbmRpdGlvbikpIGNvbnRpbnVlO1xuICAgICAgLy8gQXBwbHkgdGhlIEZMQUdfTUFQLlxuICAgICAgY29uc3QgbWFwcGVkID0gRkxBR19NQVAuZ2V0KGQuY29uZGl0aW9uKTtcbiAgICAgIGNvbnN0IHBvc2l0aXZlID1cbiAgICAgICAgICBtYXBwZWQgPyBbbWFwcGVkXSA6XG4gICAgICAgICAgdGhpcy5yZWxldmFudEZsYWdzLmhhcyhkLmNvbmRpdGlvbikgPyBbQ29uZGl0aW9uKGQuY29uZGl0aW9uKV0gOlxuICAgICAgICAgIFtdO1xuICAgICAgY29uc3QgY29uZGl0aW9uID0gYW5kKC4uLnBvc2l0aXZlLCAuLi5yZXF1aXJlbWVudHMpO1xuICAgICAgLy8gSWYgdGhlIGNvbmRpdGlvbiBpcyBhIG5lZ2F0aXZlIHRoZW4gYW55IGZ1dHVyZSBjb25kaXRpb25zIG11c3QgaW5jbHVkZVxuICAgICAgLy8gaXQgYXMgYSBwb3NpdGl2ZSByZXF1aXJlbWVudC5cbiAgICAgIGNvbnN0IG5lZ2F0aXZlID1cbiAgICAgICAgICBGTEFHX01BUC5nZXQofmQuY29uZGl0aW9uKSB8fFxuICAgICAgICAgICh0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKH5kLmNvbmRpdGlvbikgPyBDb25kaXRpb24ofmQuY29uZGl0aW9uKSA6IG51bGwpO1xuICAgICAgaWYgKG5lZ2F0aXZlICE9IG51bGwpIHJlcXVpcmVtZW50cy5wdXNoKG5lZ2F0aXZlKTtcbiAgICAgIGNvbnN0IGFjdGlvbiA9IGQubWVzc2FnZS5hY3Rpb247XG4gICAgICBpZiAoYWN0aW9uID09PSAweDAzKSB7XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90Lml0ZW0obnBjLmRhdGFbMF0pLCBjb25kaXRpb259KTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAweDExXG4gICAgICAgICAgICAgICAgIHx8ICh0aGlzLmZsYWdzLnplYnVTdHVkZW50R2l2ZXNJdGVtKCkgJiYgYWN0aW9uID09PSAweDA5KSkge1xuICAgICAgICAvLyBOT1RFOiAkMDkgaXMgemVidSBzdHVkZW50LCB3aGljaCB3ZSd2ZSBwYXRjaGVkIHRvIGdpdmUgdGhlIGl0ZW0uXG4gICAgICAgIC8vIFRPRE8gLSBjaGVjayB0aGUgcGF0Y2ggcmF0aGVyIHRoYW4gdGhlIGZsYWc/XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90Lml0ZW0obnBjLmRhdGFbMV0pLCBjb25kaXRpb259KTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAweDEwKSB7XG4gICAgICAgIC8vIE5PVEU6IFF1ZWVuIGNhbid0IGJlIHJldmVhbGVkIGFzIGFzaW5hIGluIHRoZSB0aHJvbmUgcm9vbS4gIEluIHBhcnRpY3VsYXIsXG4gICAgICAgIC8vIHRoaXMgZW5zdXJlcyB0aGF0IHRoZSBiYWNrIHJvb20gaXMgcmVhY2hhYmxlIGJlZm9yZSByZXF1aXJpbmcgdGhlIGRvbHBoaW5cbiAgICAgICAgLy8gdG8gYXBwZWFyLiAgVGhpcyBzaG91bGQgYmUgaGFuZGxlZCBieSB0aGUgYWJvdmUgY2hlY2sgZm9yIHRoZSBkaWFsb2cgYW5kXG4gICAgICAgIC8vIHNwYXduIGNvbmRpdGlvbnMgdG8gYmUgY29tcGF0aWJsZS5cbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QoTWFnaWMuUkVDT1ZFUiksIGNvbmRpdGlvbn0pO1xuICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IDB4MDggJiYgaWQgPT09IDB4MmQpIHtcbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX1NXQU4pLCBjb25kaXRpb259KTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBkLmZsYWdzKSB7XG4gICAgICAgIGNvbnN0IG1mbGFnID0gRkxBR19NQVAuZ2V0KGZsYWcpO1xuICAgICAgICBjb25zdCBwZmxhZyA9IG1mbGFnID8gbWZsYWcgOiB0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGZsYWcpID8gQ29uZGl0aW9uKGZsYWcpIDogbnVsbDtcbiAgICAgICAgaWYgKHBmbGFnKSByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdChwZmxhZyksIGNvbmRpdGlvbn0pO1xuICAgICAgfVxuICAgICAgLy8gSWYgdGhlIHNwYXduICpyZXF1aXJlcyogdGhpcyBjb25kaXRpb24gdGhlbiBkb24ndCBldmFsdWF0ZSBhbnkgbW9yZS4gIFRoaXNcbiAgICAgIC8vIGVuc3VyZXMgd2UgZG9uJ3QgZXhwZWN0IHRoZSBxdWVlbiB0byBnaXZlIHRoZSBmbHV0ZSBvZiBsaW1lIGluIHRoZSBiYWNrIHJvb20sXG4gICAgICAvLyBzaW5jZSBzaGUgd291bGRuJ3QgaGF2ZSBzcGF3bmVkIHRoZXJlIGludGltZSB0byBnaXZlIGl0LlxuICAgICAgaWYgKHBvc2l0aXZlLmxlbmd0aCAmJiBzcGF3bkNvbmRpdGlvbnMuaW5jbHVkZXMoZC5jb25kaXRpb24pKSBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGNhcGFiaWxpdGllcygpOiBDYXBhYmlsaXR5RGF0YVtdIHtcbiAgICBsZXQgYnJlYWtTdG9uZTogUmVxdWlyZW1lbnQgPSBJdGVtLlNXT1JEX09GX1dJTkQ7XG4gICAgbGV0IGJyZWFrSWNlOiBSZXF1aXJlbWVudCA9IEl0ZW0uU1dPUkRfT0ZfRklSRTtcbiAgICBsZXQgZm9ybUJyaWRnZTogUmVxdWlyZW1lbnQgPSBJdGVtLlNXT1JEX09GX1dBVEVSO1xuICAgIGxldCBicmVha0lyb246IFJlcXVpcmVtZW50ID0gSXRlbS5TV09SRF9PRl9USFVOREVSO1xuICAgIGlmICghdGhpcy5mbGFncy5vcmJzT3B0aW9uYWwoKSkge1xuICAgICAgLy8gQWRkIG9yYiByZXF1aXJlbWVudFxuICAgICAgYnJlYWtTdG9uZSA9IG9yKGFuZChJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uT1JCX09GX1dJTkQpLFxuICAgICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uVE9STkFET19CUkFDRUxFVCkpO1xuICAgICAgYnJlYWtJY2UgPSBvcihhbmQoSXRlbS5TV09SRF9PRl9GSVJFLCBJdGVtLk9SQl9PRl9GSVJFKSxcbiAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfRklSRSwgSXRlbS5GTEFNRV9CUkFDRUxFVCkpO1xuICAgICAgZm9ybUJyaWRnZSA9IG9yKGFuZChJdGVtLlNXT1JEX09GX1dBVEVSLCBJdGVtLk9SQl9PRl9XQVRFUiksXG4gICAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfV0FURVIsIEl0ZW0uQkxJWlpBUkRfQlJBQ0VMRVQpKTtcbiAgICAgIGJyZWFrSXJvbiA9IG9yKGFuZChJdGVtLlNXT1JEX09GX1RIVU5ERVIsIEl0ZW0uT1JCX09GX1RIVU5ERVIpLFxuICAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUiwgSXRlbS5TVE9STV9CUkFDRUxFVCkpO1xuICAgICAgaWYgKHRoaXMuZmxhZ3MuYXNzdW1lU3dvcmRDaGFyZ2VHbGl0Y2goKSkge1xuICAgICAgICBjb25zdCBsZXZlbDIgPSBvcihicmVha1N0b25lLCBicmVha0ljZSwgZm9ybUJyaWRnZSwgYnJlYWtJcm9uKTtcbiAgICAgICAgZnVuY3Rpb24gbmVlZChzd29yZDogcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXSk6IFJlcXVpcmVtZW50IHtcbiAgICAgICAgICBjb25zdCBjb25kaXRpb246IENvbmRpdGlvbiA9IHN3b3JkWzBdWzBdO1xuICAgICAgICAgIHJldHVybiBsZXZlbDIubWFwKGMgPT4gY1swXSA9PT0gY29uZGl0aW9uID8gYyA6IFtjb25kaXRpb24sIC4uLmNdKTtcbiAgICAgICAgfVxuICAgICAgICBicmVha1N0b25lID0gbmVlZChJdGVtLlNXT1JEX09GX1dJTkQpO1xuICAgICAgICBicmVha0ljZSA9IG5lZWQoSXRlbS5TV09SRF9PRl9GSVJFKTtcbiAgICAgICAgZm9ybUJyaWRnZSA9IG5lZWQoSXRlbS5TV09SRF9PRl9XQVRFUik7XG4gICAgICAgIGJyZWFrSXJvbiA9IG5lZWQoSXRlbS5TV09SRF9PRl9USFVOREVSKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdHlwZSBDYXBhYmlsaXR5TGlzdCA9IEFycmF5PFtyZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dLCAuLi5SZXF1aXJlbWVudFtdXT47XG4gICAgY29uc3QgY2FwYWJpbGl0aWVzOiBDYXBhYmlsaXR5TGlzdCA9IFtcbiAgICAgIFtFdmVudC5TVEFSVCwgYW5kKCldLFxuICAgICAgW0NhcGFiaWxpdHkuU1dPUkQsXG4gICAgICAgSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLlNXT1JEX09GX0ZJUkUsXG4gICAgICAgSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5TV09SRF9PRl9USFVOREVSXSxcbiAgICAgIFtDYXBhYmlsaXR5LkJSRUFLX1NUT05FLCBicmVha1N0b25lXSxcbiAgICAgIFtDYXBhYmlsaXR5LkJSRUFLX0lDRSwgYnJlYWtJY2VdLFxuICAgICAgW0NhcGFiaWxpdHkuRk9STV9CUklER0UsIGZvcm1CcmlkZ2VdLFxuICAgICAgW0NhcGFiaWxpdHkuQlJFQUtfSVJPTiwgYnJlYWtJcm9uXSxcbiAgICAgIFtDYXBhYmlsaXR5Lk1PTkVZLCBDYXBhYmlsaXR5LlNXT1JEXSwgLy8gVE9ETyAtIGNsZWFyIHRoaXMgdXBcbiAgICAgIFtDYXBhYmlsaXR5LkNMSU1CX1dBVEVSRkFMTCwgTWFnaWMuRkxJR0hUXSxcbiAgICAgIFtDYXBhYmlsaXR5LlNIT09USU5HX1NUQVRVRSwgTWFnaWMuQkFSUklFUl0sIC8vIFRPRE8gLSBhbGxvdyBzaGllbGQgcmluZz9cbiAgICAgIFtDYXBhYmlsaXR5LkNMSU1CX1NMT1BFLCBJdGVtLlJBQkJJVF9CT09UUywgTWFnaWMuRkxJR0hUXSxcbiAgICAgIC8vIFtFdmVudC5HRU5FUkFMU19ERUZFQVRFRCwgSXRlbS5JVk9SWV9TVEFUVUVdLCAvLyBUT0RPIC0gZml4IHRoaXNcbiAgICAgIFtFdmVudC5PUEVORURfU0VBTEVEX0NBVkUsIEV2ZW50LlNUQVJURURfV0lORE1JTExdLCAvLyBUT0RPIC0gbWVyZ2UgY29tcGxldGVseT9cbiAgICBdO1xuXG4gICAgaWYgKHRoaXMuZmxhZ3MuYXNzdW1lR2hldHRvRmxpZ2h0KCkpIHtcbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LkNMSU1CX1dBVEVSRkFMTCwgYW5kKEV2ZW50LlJJREVfRE9MUEhJTiwgSXRlbS5SQUJCSVRfQk9PVFMpXSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmZsYWdzLmd1YXJhbnRlZUJhcnJpZXIoKSkge1xuICAgICAgLy8gVE9ETyAtIHN3b3JkIGNoYXJnZSBnbGl0Y2ggbWlnaHQgYmUgYSBwcm9ibGVtIHdpdGggdGhlIGhlYWxpbmcgb3B0aW9uLi4uXG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5TSE9PVElOR19TVEFUVUUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIENhcGFiaWxpdHkuQlVZX0hFQUxJTkcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBJdGVtLlNISUVMRF9SSU5HKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgTWFnaWMuUkVGUkVTSCldKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5mbGFncy5sZWF0aGVyQm9vdHNHaXZlU3BlZWQoKSkge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuQ0xJTUJfU0xPUEUsIEl0ZW0uTEVBVEhFUl9CT09UU10pO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgYm9zcyBvZiB0aGlzLnJvbS5ib3NzZXMpIHtcbiAgICAgIGlmIChib3NzLmtpbGwgIT0gbnVsbCAmJiBib3NzLmRyb3AgIT0gbnVsbCkge1xuICAgICAgICAvLyBTYXZlcyByZWR1bmRhbmN5IG9mIHB1dHRpbmcgdGhlIGl0ZW0gaW4gdGhlIGFjdHVhbCByb29tLlxuICAgICAgICBjYXBhYmlsaXRpZXMucHVzaChbSXRlbShib3NzLmRyb3ApLCBCb3NzKGJvc3MuZmxhZyldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY2FwYWJpbGl0aWVzLnB1c2goW0l0ZW0uT1JCX09GX1dBVEVSLCBCb3NzLlJBR0VdKTtcblxuICAgIGlmICh0aGlzLmZsYWdzLmd1YXJhbnRlZUdhc01hc2soKSkge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuVFJBVkVMX1NXQU1QLCBJdGVtLkdBU19NQVNLXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LlRSQVZFTF9TV0FNUCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgb3IoSXRlbS5HQVNfTUFTSyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgSXRlbS5NRURJQ0FMX0hFUkIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBNYWdpYy5SRUZSRVNIKSldKTtcbiAgICB9XG5cbiAgICAvLyBpZiAodGhpcy5mbGFncy5hc3N1bWVTdGF0dWVHbGl0Y2goKSkge1xuICAgIC8vICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuU1RBVFVFX0dMSVRDSCwgW1tdXV0pO1xuICAgIC8vIH1cblxuICAgIHJldHVybiBjYXBhYmlsaXRpZXMubWFwKChbY2FwYWJpbGl0eSwgLi4uZGVwc10pID0+ICh7Y2FwYWJpbGl0eSwgY29uZGl0aW9uOiBvciguLi5kZXBzKX0pKTtcbiAgfVxuXG4gIHdhbGxDYXBhYmlsaXR5KHR5cGU6IFdhbGxUeXBlKToge2ZsYWc6IG51bWJlcn0ge1xuICAgIHJldHVybiB7ZmxhZzogW0NhcGFiaWxpdHkuQlJFQUtfU1RPTkUsIENhcGFiaWxpdHkuQlJFQUtfSUNFLFxuICAgICAgICAgICAgICAgICAgIENhcGFiaWxpdHkuRk9STV9CUklER0UsIENhcGFiaWxpdHkuQlJFQUtfSVJPTl1bdHlwZV1bMF1bMF19O1xuICB9XG59XG5cbnR5cGUgVGlsZUNoZWNrID0gQ2hlY2sgJiB7dGlsZTogVGlsZUlkfTtcblxuLy8gVE9ETyAtIG1heWJlIHB1bGwgdHJpZ2dlcnMgYW5kIG5wY3MsIGV0YywgYmFjayB0b2dldGhlcj9cbi8vICAgICAgLSBvciBtYWtlIHRoZSBsb2NhdGlvbiBvdmVybGF5IGEgc2luZ2xlIGZ1bmN0aW9uP1xuLy8gICAgICAgIC0+IG5lZWRzIGNsb3NlZC1vdmVyIHN0YXRlIHRvIHNoYXJlIGluc3RhbmNlcy4uLlxuXG5pbnRlcmZhY2UgRXh0cmFSb3V0ZSB7XG4gIHRpbGU6IFRpbGVJZDtcbiAgY29uZGl0aW9uPzogUmVxdWlyZW1lbnQ7XG59XG5pbnRlcmZhY2UgRXh0cmFFZGdlIHtcbiAgZnJvbTogVGlsZUlkO1xuICB0bzogVGlsZUlkO1xuICBjb25kaXRpb24/OiBSZXF1aXJlbWVudDtcbn1cblxuaW50ZXJmYWNlIFRyaWdnZXJEYXRhIHtcbiAgdGVycmFpbj86IFRlcnJhaW47XG4gIGNoZWNrPzogQ2hlY2tbXTtcbiAgLy8gYWxsb3dzIG5vdCBhc3N1bWluZyB0ZWxlcG9ydCBza2lwXG4gIGV4dHJhTG9jYXRpb25zPzogTG9jYXRpb25bXTtcbiAgLy8gYWxsb3dzIG5vdCBhc3N1bWluZyByYWJiaXQgc2tpcFxuICBkeD86IG51bWJlcltdO1xufVxuXG5pbnRlcmZhY2UgTnBjRGF0YSB7XG4gIGhpdGJveD86IEhpdGJveDtcbiAgdGVycmFpbj86IFRlcnJhaW47XG4gIGNoZWNrPzogQ2hlY2tbXTtcbn1cblxuaW50ZXJmYWNlIEhpdGJveCB7XG4gIHgwOiBudW1iZXI7XG4gIHkwOiBudW1iZXI7XG4gIHgxOiBudW1iZXI7XG4gIHkxOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBDYXBhYmlsaXR5RGF0YSB7XG4gIGNvbmRpdGlvbj86IFJlcXVpcmVtZW50O1xuICBjYXBhYmlsaXR5OiByZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dO1xufVxuXG4vLyBTdGF0aWMgbWFwIG9mIHRlcnJhaW5zLlxuY29uc3QgVEVSUkFJTlM6IEFycmF5PFRlcnJhaW4gfCB1bmRlZmluZWQ+ID0gKCgpID0+IHtcbiAgY29uc3Qgb3V0ID0gW107XG4gIGZvciAobGV0IGVmZmVjdHMgPSAwOyBlZmZlY3RzIDwgMTI4OyBlZmZlY3RzKyspIHtcbiAgICBvdXRbZWZmZWN0c10gPSB0ZXJyYWluKGVmZmVjdHMpO1xuICB9XG4gIC8vIGNvbnNvbGUubG9nKCdURVJSQUlOUycsIG91dCk7XG4gIHJldHVybiBvdXQ7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBlZmZlY3RzIFRoZSAkMjYgYml0cyBvZiB0aWxlZWZmZWN0cywgcGx1cyAkMDggZm9yIHN3YW1wLCAkMTAgZm9yIGRvbHBoaW4sXG4gICAqICQwMSBmb3Igc2hvb3Rpbmcgc3RhdHVlcywgJDQwIGZvciBzaG9ydCBzbG9wZVxuICAgKiBAcmV0dXJuIHVuZGVmaW5lZCBpZiB0aGUgdGVycmFpbiBpcyBpbXBhc3NhYmxlLlxuICAgKi9cbiAgZnVuY3Rpb24gdGVycmFpbihlZmZlY3RzOiBudW1iZXIpOiBUZXJyYWluIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoZWZmZWN0cyAmIDB4MDQpIHJldHVybiB1bmRlZmluZWQ7IC8vIGltcGFzc2libGVcbiAgICBjb25zdCB0ZXJyYWluOiBUZXJyYWluID0ge307XG4gICAgaWYgKChlZmZlY3RzICYgMHgxMikgPT09IDB4MTIpIHsgLy8gZG9scGhpbiBvciBmbHlcbiAgICAgIGlmIChlZmZlY3RzICYgMHgyMCkgdGVycmFpbi5leGl0ID0gQ2FwYWJpbGl0eS5DTElNQl9XQVRFUkZBTEw7XG4gICAgICB0ZXJyYWluLmVudGVyID0gb3IoRXZlbnQuUklERV9ET0xQSElOLCBNYWdpYy5GTElHSFQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZWZmZWN0cyAmIDB4NDApIHsgLy8gc2hvcnQgc2xvcGVcbiAgICAgICAgdGVycmFpbi5leGl0ID0gQ2FwYWJpbGl0eS5DTElNQl9TTE9QRTtcbiAgICAgIH0gZWxzZSBpZiAoZWZmZWN0cyAmIDB4MjApIHsgLy8gc2xvcGVcbiAgICAgICAgdGVycmFpbi5leGl0ID0gTWFnaWMuRkxJR0hUO1xuICAgICAgfVxuICAgICAgaWYgKGVmZmVjdHMgJiAweDAyKSB0ZXJyYWluLmVudGVyID0gTWFnaWMuRkxJR0hUOyAvLyBuby13YWxrXG4gICAgfVxuICAgIGlmIChlZmZlY3RzICYgMHgwOCkgeyAvLyBzd2FtcFxuICAgICAgdGVycmFpbi5lbnRlciA9ICh0ZXJyYWluLmVudGVyIHx8IFtbXV0pLm1hcChjcyA9PiBDYXBhYmlsaXR5LlRSQVZFTF9TV0FNUFswXS5jb25jYXQoY3MpKTtcbiAgICB9XG4gICAgaWYgKGVmZmVjdHMgJiAweDAxKSB7IC8vIHNob290aW5nIHN0YXR1ZXNcbiAgICAgIHRlcnJhaW4uZW50ZXIgPSAodGVycmFpbi5lbnRlciB8fCBbW11dKS5tYXAoY3MgPT4gQ2FwYWJpbGl0eS5TSE9PVElOR19TVEFUVUVbMF0uY29uY2F0KGNzKSk7XG4gICAgfVxuICAgIHJldHVybiB0ZXJyYWluO1xuICB9XG59KSgpO1xuXG4vLyBUT0RPIC0gZmlndXJlIG91dCB3aGF0IHRoaXMgbG9va3MgbGlrZS4uLj9cbi8vICAtIG1heWJlIHdlIGp1c3Qgd2FudCB0byBtYWtlIGEgcHNldWRvIERFRkVBVEVEX0lOU0VDVCBldmVudCwgYnV0IHRoaXMgd291bGQgbmVlZCB0byBiZVxuLy8gICAgc2VwYXJhdGUgZnJvbSAxMDEsIHNpbmNlIHRoYXQncyBhdHRhY2hlZCB0byB0aGUgaXRlbWdldCwgd2hpY2ggd2lsbCBtb3ZlIHdpdGggdGhlIHNsb3QhXG4vLyAgLSBwcm9iYWJseSB3YW50IGEgZmxhZyBmb3IgZWFjaCBib3NzIGRlZmVhdGVkLi4uP1xuLy8gICAgY291bGQgdXNlIGJvc3NraWxsIElEIGZvciBpdD9cbi8vICAgIC0gdGhlbiBtYWtlIHRoZSBkcm9wIGEgc2ltcGxlIGRlcml2YXRpdmUgZnJvbSB0aGF0Li4uXG4vLyAgICAtIHVwc2hvdCAtIG5vIGxvbmdlciBuZWVkIHRvIG1peCBpdCBpbnRvIG5wYygpIG9yIHRyaWdnZXIoKSBvdmVybGF5LCBpbnN0ZWFkIG1vdmUgaXRcbi8vICAgICAgdG8gY2FwYWJpbGl0eSBvdmVybGF5LlxuLy8gZnVuY3Rpb24gc2xvdEZvcjxUPihpdGVtOiBUKTogVCB7IHJldHVybiBpdGVtOyB9XG4iXX0=