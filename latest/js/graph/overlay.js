import { Boss, Capability, Condition, Event, Item, Magic, MutableRequirement, Slot, and, meet, or } from './condition.js';
import { TileId, ScreenId } from './geometry.js';
import { ShopType } from '../rom/shop.js';
import { hex } from '../rom/util.js';
const RELEVANT_FLAGS = [
    0x00a,
    0x00b,
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
    0x072,
    0x08b,
    0x09b,
    0x0a5,
    0x0a9,
    0x100,
    0x101,
    0x102,
    0x103,
    0x104,
    0x105,
    0x106,
    0x107,
    0x108,
    0x109,
    0x10a,
    0x10b,
    0x10c,
    0x200, 0x201, 0x202, 0x203,
    0x205, 0x206, 0x207, 0x208, 0x209, 0x20a, 0x20b, 0x20c,
    0x236,
    0x243,
    0x244,
    0x283,
    0x2ee,
    0x2f6,
];
const FLAG_MAP = new Map([
    [0x00a, Event.STARTED_WINDMILL],
    [0x013, Boss.SABERA1],
    [0x017, Item.SWORD_OF_WATER],
    [0x028, Magic.CHANGE],
    [0x029, Magic.CHANGE],
    [0x02a, Magic.CHANGE],
    [0x02b, Magic.CHANGE],
    [0x06c, Boss.DRAYGON1],
    [0x08b, Item.SHELL_FLUTE],
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
                capabilities.push([Item(boss.drop), Boss(boss.kill)]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9ncmFwaC9vdmVybGF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFTLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFDN0QsSUFBSSxFQUFxQixHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQUUsUUFBUSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBSy9DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFhbkMsTUFBTSxjQUFjLEdBQUc7SUFDckIsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBRUwsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBRUwsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUdMLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUs7SUFFMUIsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUs7SUFDdEQsS0FBSztJQUNM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QUN6QixPQUFPLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7YUFDN0I7WUFDRCxJQUFJLE9BQU8sR0FBRyxJQUFJO2dCQUFFLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztTQUNsRDtRQUNELElBQUksT0FBTyxHQUFHLElBQUksRUFBRTtZQUNsQixPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUMxRjtRQUNELElBQUksT0FBTyxHQUFHLElBQUksRUFBRTtZQUNsQixPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUM3RjtRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7QUFDSCxDQUFDLENBQUMsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtCb3NzLCBDYXBhYmlsaXR5LCBDaGVjaywgQ29uZGl0aW9uLCBFdmVudCwgSXRlbSwgTWFnaWMsIE11dGFibGVSZXF1aXJlbWVudCxcbiAgICAgICAgUmVxdWlyZW1lbnQsIFNsb3QsIFRlcnJhaW4sIFdhbGxUeXBlLCBhbmQsIG1lZXQsIG9yfSBmcm9tICcuL2NvbmRpdGlvbi5qcyc7XG5pbXBvcnQge1RpbGVJZCwgU2NyZWVuSWR9IGZyb20gJy4vZ2VvbWV0cnkuanMnO1xuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtCb3NzIGFzIFJvbUJvc3N9IGZyb20gJy4uL3JvbS9ib3NzZXMuanMnO1xuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnLi4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7U2hvcFR5cGV9IGZyb20gJy4uL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7aGV4fSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5cbi8vIEFkZGl0aW9uYWwgaW5mb3JtYXRpb24gbmVlZGVkIHRvIGludGVycHJldCB0aGUgd29ybGQgZ3JhcGggZGF0YS5cbi8vIFRoaXMgZ2V0cyBpbnRvIG1vcmUgc3BlY2lmaWNzIGFuZCBoYXJkY29kaW5nLlxuXG4vLyBUT0RPIC0gbWF5YmUgY29uc2lkZXIgaGF2aW5nIGEgc2V0IG9mIEFTU1VNRUQgYW5kIGEgc2V0IG9mIElHTk9SRUQgZmxhZ3M/XG4vLyAgICAgIC0gZS5nLiBhbHdheXMgYXNzdW1lIDAwZiBpcyBGQUxTRSByYXRoZXIgdGhhbiBUUlVFLCB0byBhdm9pZCBmcmVlIHdpbmRtaWxsIGtleVxuXG5cbi8vIFRPRE8gLSBwcmlzb24ga2V5IG1pc3NpbmcgZnJvbSBwYXJhbHlzaXMgZGVwcyAob3IgcmF0aGVyIGEgbm9uLWZsaWdodCB2ZXJzaW9uKSFcblxuXG5cbmNvbnN0IFJFTEVWQU5UX0ZMQUdTID0gW1xuICAweDAwYSwgLy8gdXNlZCB3aW5kbWlsbCBrZXlcbiAgMHgwMGIsIC8vIHRhbGtlZCB0byBsZWFmIGVsZGVyXG4gIDB4MDE4LCAvLyBlbnRlcmVkIHVuZGVyZ3JvdW5kIGNoYW5uZWxcbiAgMHgwMWIsIC8vIG1lc2lhIHJlY29yZGluZyBwbGF5ZWRcbiAgMHgwMWUsIC8vIHF1ZWVuIHJldmVhbGVkXG4gIDB4MDIxLCAvLyByZXR1cm5lZCBmb2cgbGFtcFxuICAvLyAweDAyNCwgLy8gZ2VuZXJhbHMgZGVmZWF0ZWQgKGdvdCBpdm9yeSBzdGF0dWUpXG4gIDB4MDI1LCAvLyBoZWFsZWQgZG9scGhpblxuICAweDAyNiwgLy8gZW50ZXJlZCBzaHlyb24gKGZvciBnb2EgZ3VhcmRzKVxuICAweDAyNywgLy8gc2h5cm9uIG1hc3NhY3JlXG4gIC8vIDB4MzUsIC8vIGN1cmVkIGFrYWhhbmFcbiAgMHgwMzgsIC8vIGxlYWYgYWJkdWN0aW9uXG4gIDB4MDNhLCAvLyB0YWxrZWQgdG8gemVidSBpbiBjYXZlIChhZGRlZCBhcyByZXEgZm9yIGFiZHVjdGlvbilcbiAgMHgwM2IsIC8vIHRhbGtlZCB0byB6ZWJ1IGluIHNoeXJvbiAoYWRkZWQgYXMgcmVxIGZvciBtYXNzYWNyZSlcbiAgMHgwNDUsIC8vIHJlc2N1ZWQgY2hpbGRcbiAgMHgwNTIsIC8vIHRhbGtlZCB0byBkd2FyZiBtb3RoZXJcbiAgMHgwNTMsIC8vIGNoaWxkIGZvbGxvd2luZ1xuICAweDA2MSwgLy8gdGFsa2VkIHRvIHN0b20gaW4gc3dhbiBodXRcbiAgLy8gMHgwNmMsIC8vIGRlZmVhdGVkIGRyYXlnb24gMVxuICAweDA3MiwgLy8ga2Vuc3UgZm91bmQgaW4gdGF2ZXJuXG4gIDB4MDhiLCAvLyBnb3Qgc2hlbGwgZmx1dGVcbiAgMHgwOWIsIC8vIGFibGUgdG8gcmlkZSBkb2xwaGluXG4gIDB4MGE1LCAvLyB0YWxrZWQgdG8gemVidSBzdHVkZW50XG4gIDB4MGE5LCAvLyB0YWxrZWQgdG8gbGVhZiByYWJiaXRcbiAgMHgxMDAsIC8vIGtpbGxlZCB2YW1waXJlIDFcbiAgMHgxMDEsIC8vIGtpbGxlZCBpbnNlY3RcbiAgMHgxMDIsIC8vIGtpbGxlZCBrZWxiZXNxdWUgMVxuICAweDEwMywgLy8gcmFnZVxuICAweDEwNCwgLy8ga2lsbGVkIHNhYmVyYSAxXG4gIDB4MTA1LCAvLyBraWxsZWQgbWFkbyAxXG4gIDB4MTA2LCAvLyBraWxsZWQga2VsYmVzcXVlIDJcbiAgMHgxMDcsIC8vIGtpbGxlZCBzYWJlcmEgMlxuICAweDEwOCwgLy8ga2lsbGVkIG1hZG8gMlxuICAweDEwOSwgLy8ga2lsbGVkIGthcm1pbmVcbiAgMHgxMGEsIC8vIGtpbGxlZCBkcmF5Z29uIDFcbiAgMHgxMGIsIC8vIGtpbGxlZCBkcmF5Z29uIDJcbiAgMHgxMGMsIC8vIGtpbGxlZCB2YW1waXJlIDJcblxuICAvLyBzd29yZHMgKG1heSBiZSBuZWVkZWQgZm9yIHJhZ2UsIFNvVCBmb3IgbWFzc2FjcmUpXG4gIDB4MjAwLCAweDIwMSwgMHgyMDIsIDB4MjAzLFxuICAvLyBiYWxscyBhbmQgYnJhY2VsZXRzIG1heSBiZSBuZWVkZWQgZm9yIHRlbGVwb3J0XG4gIDB4MjA1LCAweDIwNiwgMHgyMDcsIDB4MjA4LCAweDIwOSwgMHgyMGEsIDB4MjBiLCAweDIwYyxcbiAgMHgyMzYsIC8vIHNoZWxsIGZsdXRlIChmb3IgZmlzaGVybWFuIHNwYXduKVxuICAweDI0MywgLy8gdGVsZXBhdGh5IChmb3IgcmFiYml0LCBvYWssIGRlbylcbiAgMHgyNDQsIC8vIHRlbGVwb3J0IChmb3IgbXQgc2FicmUgdHJpZ2dlcilcbiAgMHgyODMsIC8vIGNhbG1lZCBzZWEgKGZvciBiYXJyaWVyKVxuICAweDJlZSwgLy8gc3RhcnRlZCB3aW5kbWlsbCAoZm9yIHJlZnJlc2gpXG5cbiAgLy8gTk9URTogdGhlc2UgYXJlIG1vdmVkIGJlY2F1c2Ugb2Ygem9tYmllIHdhcnAhXG4gIDB4MmY2LCAvLyB3YXJwOm9hayAoZm9yIHRlbGVwYXRoeSlcbiAgLy8gMHgyZmEsIC8vIHdhcnA6am9lbCAoZm9yIGV2aWwgc3Bpcml0IGlzbGFuZClcblxuICAvLyBNYWdpYy5DSEFOR0VbMF1bMF0sXG4gIC8vIE1hZ2ljLlRFTEVQQVRIWVswXVswXSxcbl07XG5cbi8vIFRPRE8gLSB0aGlzIGlzIG5vdCBwZXJ2YXNpdmUgZW5vdWdoISEhXG4vLyAgLSBuZWVkIGEgd2F5IHRvIHB1dCBpdCBldmVyeXdoZXJlXG4vLyAgICAtPiBtYXliZSBpbiBNdXRhYmxlUmVxdWlyZW1lbnRzP1xuY29uc3QgRkxBR19NQVA6IE1hcDxudW1iZXIsIHJlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV0+ID0gbmV3IE1hcChbXG4gIFsweDAwYSwgRXZlbnQuU1RBUlRFRF9XSU5ETUlMTF0sIC8vIHRoaXMgaXMgcmVmJ2Qgb3V0c2lkZSB0aGlzIGZpbGUhXG4gIC8vWzB4MDBlLCBNYWdpYy5URUxFUEFUSFldLFxuICAvL1sweDAzZiwgTWFnaWMuVEVMRVBPUlRdLFxuICBbMHgwMTMsIEJvc3MuU0FCRVJBMV0sXG4gIC8vIFF1ZWVuIHdpbGwgZ2l2ZSBmbHV0ZSBvZiBsaW1lIHcvbyBwYXJhbHlzaXMgaW4gdGhpcyBjYXNlLlxuICBbMHgwMTcsIEl0ZW0uU1dPUkRfT0ZfV0FURVJdLFxuICBbMHgwMjgsIE1hZ2ljLkNIQU5HRV0sXG4gIFsweDAyOSwgTWFnaWMuQ0hBTkdFXSxcbiAgWzB4MDJhLCBNYWdpYy5DSEFOR0VdLFxuICBbMHgwMmIsIE1hZ2ljLkNIQU5HRV0sXG4gIFsweDA2YywgQm9zcy5EUkFZR09OMV0sXG4gIFsweDA4YiwgSXRlbS5TSEVMTF9GTFVURV0sXG5dKTtcblxuLy8gTWFwcyB0cmlnZ2VyIGFjdGlvbnMgdG8gdGhlIHNsb3QgdGhleSBncmFudC5cbmNvbnN0IFRSSUdHRVJfQUNUSU9OX0lURU1TOiB7W2FjdGlvbjogbnVtYmVyXTogU2xvdH0gPSB7XG4gIDB4MDg6IFNsb3QoTWFnaWMuUEFSQUxZU0lTKSxcbiAgMHgwYjogU2xvdChNYWdpYy5CQVJSSUVSKSxcbiAgMHgwZjogU2xvdChNYWdpYy5SRUZSRVNIKSxcbiAgMHgxODogU2xvdChNYWdpYy5URUxFUEFUSFkpLFxufTtcblxuY29uc3QgU1dPUkRTID0gW0l0ZW0uU1dPUkRfT0ZfV0lORCwgSXRlbS5TV09SRF9PRl9GSVJFLFxuICAgICAgICAgICAgICAgIEl0ZW0uU1dPUkRfT0ZfV0FURVIsIEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUl0gYXMgY29uc3Q7XG5jb25zdCBTV09SRF9QT1dFUlMgPSBbXG4gIFtJdGVtLk9SQl9PRl9XSU5ELCBJdGVtLlRPUk5BRE9fQlJBQ0VMRVRdLFxuICBbSXRlbS5PUkJfT0ZfRklSRSwgSXRlbS5GTEFNRV9CUkFDRUxFVF0sXG4gIFtJdGVtLk9SQl9PRl9XQVRFUiwgSXRlbS5CTElaWkFSRF9CUkFDRUxFVF0sXG4gIFtJdGVtLk9SQl9PRl9USFVOREVSLCBJdGVtLlNUT1JNX0JSQUNFTEVUXSxcbl0gYXMgY29uc3Q7XG5cbmZ1bmN0aW9uIHN3b3JkUmVxdWlyZW1lbnQoc3dvcmQ6IG51bWJlciwgbGV2ZWw6IG51bWJlcik6IFJlcXVpcmVtZW50IHtcbiAgbGV0IHI7XG4gIGlmIChsZXZlbCA9PT0gMSkgcj0gU1dPUkRTW3N3b3JkXTtcbiAgZWxzZSBpZiAobGV2ZWwgPT09IDMpIHI9IGFuZChTV09SRFNbc3dvcmRdLCAuLi5TV09SRF9QT1dFUlNbc3dvcmRdKTtcbiAgZWxzZSByPSBvciguLi5TV09SRF9QT1dFUlNbc3dvcmRdLm1hcChwID0+IGFuZChTV09SRFNbc3dvcmRdLCBwKSkpO1xuICBpZiAoQXJyYXkuaXNBcnJheShyWzBdWzBdKSkgdGhyb3cgbmV3IEVycm9yKCk7XG4gIHJldHVybiByO1xufVxuXG5leHBvcnQgY2xhc3MgT3ZlcmxheSB7XG5cbiAgcHJpdmF0ZSByZWFkb25seSByZWxldmFudEZsYWdzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIC8vIG5wYyBpZCAtPiB3YW50ZWQgaXRlbVxuICBwcml2YXRlIHJlYWRvbmx5IHRyYWRlSW5zID0gbmV3IE1hcDxudW1iZXIsIHJlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV0+KCk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzaG9vdGluZ1N0YXR1ZXMgPSBuZXcgU2V0PFNjcmVlbklkPigpO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tLFxuICAgICAgICAgICAgICByZWFkb25seSBmbGFnczogRmxhZ1NldCxcbiAgICAgICAgICAgICAgcHJpdmF0ZSByZWFkb25seSB0cmFja2VyOiBib29sZWFuKSB7XG4gICAgLy8gVE9ETyAtIGFkanVzdCBiYXNlZCBvbiBmbGFnc2V0P1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBSRUxFVkFOVF9GTEFHUykge1xuICAgICAgdGhpcy5yZWxldmFudEZsYWdzLmFkZChmbGFnKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHJvbS5pdGVtcykge1xuICAgICAgaWYgKCFpdGVtLnRyYWRlSW4pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgY29uZCA9IGl0ZW0uaWQgPT09IDB4MWQgPyBDYXBhYmlsaXR5LkJVWV9IRUFMSU5HIDogSXRlbShpdGVtLmlkKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlbS50cmFkZUluLmxlbmd0aDsgaSArPSA2KSB7XG4gICAgICAgIHRoaXMudHJhZGVJbnMuc2V0KGl0ZW0udHJhZGVJbltpXSwgY29uZCk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgbG9jIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jLnNwYXducykge1xuICAgICAgICBpZiAoc3Bhd24uaXNNb25zdGVyKCkgJiYgc3Bhd24uaWQgPT09IDB4M2YpIHsgLy8gc2hvb3Rpbmcgc3RhdHVlc1xuICAgICAgICAgIHRoaXMuc2hvb3RpbmdTdGF0dWVzLmFkZChTY3JlZW5JZC5mcm9tKGxvYywgc3Bhd24pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyAgIDB4MWQsIC8vIG1lZGljYWwgaGVyYlxuICAgIC8vICAgMHgyNSwgLy8gc3RhdHVlIG9mIG9ueXhcbiAgICAvLyAgIDB4MzUsIC8vIGZvZyBsYW1wXG4gICAgLy8gICAweDNiLCAvLyBsb3ZlIHBlbmRhbnRcbiAgICAvLyAgIDB4M2MsIC8vIGtpcmlzYSBwbGFudFxuICAgIC8vICAgMHgzZCwgLy8gaXZvcnkgc3RhdHVlXG4gICAgLy8gXS5tYXAoaSA9PiB0aGlzLnJvbS5pdGVtc1tpXSk7XG4gIH1cblxuICAvKiogQHBhcmFtIGlkIE9iamVjdCBJRCBvZiB0aGUgYm9zcy4gKi9cbiAgYm9zc1JlcXVpcmVtZW50cyhib3NzOiBSb21Cb3NzKTogUmVxdWlyZW1lbnQge1xuICAgIC8vIFRPRE8gLSBoYW5kbGUgYm9zcyBzaHVmZmxlIHNvbWVob3c/XG4gICAgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5yYWdlKSB7XG4gICAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3MucmFuZG9taXplVHJhZGVzKCkpIHJldHVybiBDYXBhYmlsaXR5LlNXT1JEO1xuICAgICAgLy8gcmV0dXJuIEl0ZW0uU1dPUkRfT0ZfV0FURVI7XG4gICAgICByZXR1cm4gQ29uZGl0aW9uKHRoaXMucm9tLm5wY3NbMHhjM10ubG9jYWxEaWFsb2dzLmdldCgtMSkhWzBdLmNvbmRpdGlvbik7XG4gICAgfVxuICAgIGNvbnN0IGlkID0gYm9zcy5vYmplY3Q7XG4gICAgY29uc3Qgb3V0ID0gbmV3IE11dGFibGVSZXF1aXJlbWVudCgpO1xuICAgIGlmICh0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFncy5zaHVmZmxlQm9zc0VsZW1lbnRzKCkpIHtcbiAgICAgIG91dC5hZGRBbGwoQ2FwYWJpbGl0eS5TV09SRCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmZsYWdzLmd1YXJhbnRlZU1hdGNoaW5nU3dvcmQoKSkge1xuICAgICAgY29uc3QgbGV2ZWwgPSB0aGlzLmZsYWdzLmd1YXJhbnRlZVN3b3JkTWFnaWMoKSA/IGJvc3Muc3dvcmRMZXZlbCA6IDE7XG4gICAgICBjb25zdCBvYmogPSB0aGlzLnJvbS5vYmplY3RzW2lkXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgaSsrKSB7XG4gICAgICAgIGlmIChvYmouaXNWdWxuZXJhYmxlKGkpKSBvdXQuYWRkQWxsKHN3b3JkUmVxdWlyZW1lbnQoaSwgbGV2ZWwpKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb3V0LmFkZEFsbChDYXBhYmlsaXR5LlNXT1JEKTtcbiAgICB9XG4gICAgY29uc3QgZXh0cmE6IENhcGFiaWxpdHlbXSA9IFtdO1xuICAgIGlmICh0aGlzLmZsYWdzLmd1YXJhbnRlZVJlZnJlc2goKSkge1xuICAgICAgLy8gVE9ETyAtIG1ha2UgdGhpcyBcImd1YXJhbnRlZSBkZWZlbnNpdmUgbWFnaWNcIiBhbmQgYWxsb3cgcmVmcmVzaCBPUiBiYXJyaWVyP1xuICAgICAgZXh0cmEucHVzaChNYWdpYy5SRUZSRVNIKTtcbiAgICB9XG4gICAgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5pbnNlY3QpIHsgLy8gaW5zZWN0XG4gICAgICBleHRyYS5wdXNoKEl0ZW0uSU5TRUNUX0ZMVVRFLCBJdGVtLkdBU19NQVNLKTtcbiAgICB9XG4gICAgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5kcmF5Z29uMikge1xuICAgICAgZXh0cmEucHVzaChJdGVtLkJPV19PRl9UUlVUSCk7XG4gICAgICBpZiAodGhpcy5mbGFncy5zdG9yeU1vZGUoKSkge1xuICAgICAgICBleHRyYS5wdXNoKFxuICAgICAgICAgIEJvc3MuS0VMQkVTUVVFMSxcbiAgICAgICAgICBCb3NzLktFTEJFU1FVRTIsXG4gICAgICAgICAgQm9zcy5TQUJFUkExLFxuICAgICAgICAgIEJvc3MuU0FCRVJBMixcbiAgICAgICAgICBCb3NzLk1BRE8xLFxuICAgICAgICAgIEJvc3MuTUFETzIsXG4gICAgICAgICAgQm9zcy5LQVJNSU5FLFxuICAgICAgICAgIEJvc3MuRFJBWUdPTjEsXG4gICAgICAgICAgSXRlbS5TV09SRF9PRl9XSU5ELFxuICAgICAgICAgIEl0ZW0uU1dPUkRfT0ZfRklSRSxcbiAgICAgICAgICBJdGVtLlNXT1JEX09GX1dBVEVSLFxuICAgICAgICAgIEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUik7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChleHRyYS5sZW5ndGgpIHtcbiAgICAgIG91dC5yZXN0cmljdChhbmQoLi4uZXh0cmEpKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5mcmVlemUoKTtcbiAgfVxuXG4gIGxvY2F0aW9ucygpOiBUaWxlQ2hlY2tbXSB7XG4gICAgY29uc3QgbG9jYXRpb25zOiBUaWxlQ2hlY2tbXSA9IFtdO1xuICAgIC8vIFRPRE8gLSBwdWxsIHRoZSBsb2NhdGlvbiBvdXQgb2YgaXRlbVVzZURhdGFbMF0gZm9yIHRoZXNlIGl0ZW1zXG4gICAgbG9jYXRpb25zLnB1c2goe1xuICAgICAgdGlsZTogVGlsZUlkKDB4MGYwMDg4KSxcbiAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuU1RBUlRFRF9XSU5ETUlMTCksXG4gICAgICBjb25kaXRpb246IEl0ZW0uV0lORE1JTExfS0VZLFxuICAgIH0sIHtcbiAgICAgIHRpbGU6IFRpbGVJZCgweGU0MDA4OCksXG4gICAgICBzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9KT0VMX1NIRUQpLFxuICAgICAgY29uZGl0aW9uOiBJdGVtLkVZRV9HTEFTU0VTLFxuICAgIH0pO1xuICAgIGZvciAoY29uc3Qgc2hvcCBvZiB0aGlzLnJvbS5zaG9wcykge1xuICAgICAgLy8gbGVhZiBhbmQgc2h5cm9uIG1heSBub3QgYWx3YXlzIGJlIGFjY2Vzc2libGUsIHNvIGRvbid0IHJlbHkgb24gdGhlbS5cbiAgICAgIGlmIChzaG9wLmxvY2F0aW9uID09PSAweGMzIHx8IHNob3AubG9jYXRpb24gPT09IDB4ZjYpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFzaG9wLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKHNob3AudHlwZSAhPT0gU2hvcFR5cGUuVE9PTCkgY29udGludWU7XG4gICAgICBjb25zdCBjaGVjayA9IHtcbiAgICAgICAgdGlsZTogVGlsZUlkKHNob3AubG9jYXRpb24gPDwgMTYgfCAweDg4KSxcbiAgICAgICAgY29uZGl0aW9uOiBDYXBhYmlsaXR5Lk1PTkVZLFxuICAgICAgfTtcbiAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBzaG9wLmNvbnRlbnRzKSB7XG4gICAgICAgIGlmIChpdGVtID09PSAoSXRlbS5NRURJQ0FMX0hFUkJbMF1bMF0gJiAweGZmKSkge1xuICAgICAgICAgIGxvY2F0aW9ucy5wdXNoKHsuLi5jaGVjaywgc2xvdDogU2xvdChDYXBhYmlsaXR5LkJVWV9IRUFMSU5HKX0pO1xuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gPT09IChJdGVtLldBUlBfQk9PVFNbMF1bMF0gJiAweGZmKSkge1xuICAgICAgICAgIGxvY2F0aW9ucy5wdXNoKHsuLi5jaGVjaywgc2xvdDogU2xvdChDYXBhYmlsaXR5LkJVWV9XQVJQKX0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsb2NhdGlvbnM7XG4gIH1cblxuICAvKiogUmV0dXJucyB1bmRlZmluZWQgaWYgaW1wYXNzYWJsZS4gKi9cbiAgbWFrZVRlcnJhaW4oZWZmZWN0czogbnVtYmVyLCB0aWxlOiBUaWxlSWQpOiBUZXJyYWluIHwgdW5kZWZpbmVkIHtcbiAgICAvLyBDaGVjayBmb3IgZG9scGhpbiBvciBzd2FtcC4gIEN1cnJlbnRseSBkb24ndCBzdXBwb3J0IHNodWZmbGluZyB0aGVzZS5cbiAgICBjb25zdCBsb2MgPSB0aWxlID4+PiAxNjtcbiAgICBlZmZlY3RzICY9IDB4MjY7XG4gICAgaWYgKGxvYyA9PT0gMHgxYSkgZWZmZWN0cyB8PSAweDA4O1xuICAgIGlmIChsb2MgPT09IDB4NjAgfHwgbG9jID09PSAweDY4KSBlZmZlY3RzIHw9IDB4MTA7XG4gICAgLy8gTk9URTogb25seSB0aGUgdG9wIGhhbGYtc2NyZWVuIGluIHVuZGVyZ3JvdW5kIGNoYW5uZWwgaXMgZG9scGhpbmFibGVcbiAgICBpZiAobG9jID09PSAweDY0ICYmICgodGlsZSAmIDB4ZjBmMCkgPCAweDkwKSkgZWZmZWN0cyB8PSAweDEwO1xuICAgIGlmICh0aGlzLnNob290aW5nU3RhdHVlcy5oYXMoU2NyZWVuSWQuZnJvbVRpbGUodGlsZSkpKSBlZmZlY3RzIHw9IDB4MDE7XG4gICAgaWYgKGVmZmVjdHMgJiAweDIwKSB7IC8vIHNsb3BlXG4gICAgICAvLyBEZXRlcm1pbmUgbGVuZ3RoIG9mIHNsb3BlOiBzaG9ydCBzbG9wZXMgYXJlIGNsaW1iYWJsZS5cbiAgICAgIC8vIDYtOCBhcmUgYm90aCBkb2FibGUgd2l0aCBib290c1xuICAgICAgLy8gMC01IGlzIGRvYWJsZSB3aXRoIG5vIGJvb3RzXG4gICAgICAvLyA5IGlzIGRvYWJsZSB3aXRoIHJhYmJpdCBib290cyBvbmx5IChub3QgYXdhcmUgb2YgYW55IG9mIHRoZXNlLi4uKVxuICAgICAgLy8gMTAgaXMgcmlnaHQgb3V0XG4gICAgICBjb25zdCBnZXRFZmZlY3RzID0gKHRpbGU6IFRpbGVJZCk6IG51bWJlciA9PiB7XG4gICAgICAgIGNvbnN0IGwgPSB0aGlzLnJvbS5sb2NhdGlvbnNbdGlsZSA+Pj4gMTZdO1xuICAgICAgICBjb25zdCBzY3JlZW4gPSBsLnNjcmVlbnNbKHRpbGUgJiAweGYwMDApID4+PiAxMl1bKHRpbGUgJiAweGYwMCkgPj4+IDhdO1xuICAgICAgICByZXR1cm4gdGhpcy5yb20udGlsZUVmZmVjdHNbbC50aWxlRWZmZWN0cyAtIDB4YjNdXG4gICAgICAgICAgICAuZWZmZWN0c1t0aGlzLnJvbS5zY3JlZW5zW3NjcmVlbl0udGlsZXNbdGlsZSAmIDB4ZmZdXTtcbiAgICAgIH07XG4gICAgICBsZXQgYm90dG9tID0gdGlsZTtcbiAgICAgIGxldCBoZWlnaHQgPSAtMTtcbiAgICAgIHdoaWxlIChnZXRFZmZlY3RzKGJvdHRvbSkgJiAweDIwKSB7XG4gICAgICAgIGJvdHRvbSA9IFRpbGVJZC5hZGQoYm90dG9tLCAxLCAwKTtcbiAgICAgICAgaGVpZ2h0Kys7XG4gICAgICB9XG4gICAgICBsZXQgdG9wID0gdGlsZTtcbiAgICAgIHdoaWxlIChnZXRFZmZlY3RzKHRvcCkgJiAweDIwKSB7XG4gICAgICAgIHRvcCA9IFRpbGVJZC5hZGQodG9wLCAtMSwgMCk7XG4gICAgICAgIGhlaWdodCsrO1xuICAgICAgfVxuICAgICAgaWYgKGhlaWdodCA8IDYpIHtcbiAgICAgICAgZWZmZWN0cyAmPSB+MHgyMDtcbiAgICAgIH0gZWxzZSBpZiAoaGVpZ2h0IDwgOSkge1xuICAgICAgICBlZmZlY3RzIHw9IDB4NDA7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBURVJSQUlOU1tlZmZlY3RzXTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBmb2xkaW5nIHRoaXMgaW50byBsb2NhdGlvbi90cmlnZ2VyL25wYyBhcyBhbiBleHRyYSByZXR1cm4/XG4gIGV4dHJhUm91dGVzKCk6IEV4dHJhUm91dGVbXSB7XG4gICAgY29uc3Qgcm91dGVzID0gW107XG4gICAgY29uc3QgZW50cmFuY2UgPSAobG9jYXRpb246IG51bWJlciwgZW50cmFuY2U6IG51bWJlciA9IDApOiBUaWxlSWQgPT4ge1xuICAgICAgY29uc3QgbCA9IHRoaXMucm9tLmxvY2F0aW9uc1tsb2NhdGlvbl07XG4gICAgICBjb25zdCBlID0gbC5lbnRyYW5jZXNbZW50cmFuY2VdO1xuICAgICAgcmV0dXJuIFRpbGVJZC5mcm9tKGwsIGUpO1xuICAgIH07XG4gICAgLy8gU3RhcnQgdGhlIGdhbWUgYXQgMDowXG4gICAgcm91dGVzLnB1c2goe3RpbGU6IGVudHJhbmNlKDApfSk7XG4gICAgLy8gU3dvcmQgb2YgVGh1bmRlciB3YXJwXG4gICAgLy8gVE9ETyAtIGVudHJhbmNlIHNodWZmbGUgd2lsbCBicmVhayB0aGUgYXV0by13YXJwLXBvaW50IGFmZm9yZGFuY2UuXG4gICAgaWYgKHRoaXMuZmxhZ3MudGVsZXBvcnRPblRodW5kZXJTd29yZCgpKSB7XG4gICAgICByb3V0ZXMucHVzaCh7XG4gICAgICAgIHRpbGU6IGVudHJhbmNlKDB4OGMsIDEpLCAvLyBub3QgZjIgc2luY2Ugbm8tdGh1bmRlci1zd29yZC1mb3ItbWFzc2FjcmVcbiAgICAgICAgY29uZGl0aW9uOiBvcihhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBDYXBhYmlsaXR5LkJVWV9XQVJQKSxcbiAgICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBNYWdpYy5URUxFUE9SVCkpLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzLmFzc3VtZVdpbGRXYXJwKCkpIHtcbiAgICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGhpcy5yb20ud2lsZFdhcnAubG9jYXRpb25zKSB7XG4gICAgICAgIHJvdXRlcy5wdXNoKHt0aWxlOiBlbnRyYW5jZShsb2NhdGlvbil9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJvdXRlcztcbiAgfVxuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBmb2xkaW5nIHRoaXMgaW50byBsb2NhdGlvbi90cmlnZ2VyL25wYyBhcyBhbiBleHRyYSByZXR1cm4/XG4gIGV4dHJhRWRnZXMoKTogRXh0cmFFZGdlW10ge1xuICAgIGNvbnN0IGVkZ2VzID0gW107XG4gICAgLy8gbmVlZCBhbiBlZGdlIGZyb20gdGhlIGJvYXQgaG91c2UgdG8gdGhlIGJlYWNoIC0gd2UgY291bGQgYnVpbGQgdGhpcyBpbnRvIHRoZVxuICAgIC8vIGJvYXQgYm9hcmRpbmcgdHJpZ2dlciwgYnV0IGZvciBub3cgaXQncyBoZXJlLlxuICAgIGVkZ2VzLnB1c2goe1xuICAgICAgZnJvbTogVGlsZUlkKDB4NTEwMDg4KSwgLy8gaW4gZnJvbnQgb2YgYm9hdCBob3VzZVxuICAgICAgdG86IFRpbGVJZCgweDYwODY4OCksIC8vIGluIGZyb250IG9mIGNhYmluXG4gICAgICBjb25kaXRpb246IEV2ZW50LlJFVFVSTkVEX0ZPR19MQU1QLFxuICAgIH0pO1xuICAgIHJldHVybiBlZGdlcztcbiAgfVxuXG4gIHRyaWdnZXIoaWQ6IG51bWJlcik6IFRyaWdnZXJEYXRhIHtcbiAgICBzd2l0Y2ggKGlkKSB7XG4gICAgY2FzZSAweDlhOiAvLyBzdGFydCBmaWdodCB3aXRoIG1hZG8gaWYgc2h5cm9uIG1hc3NhY3JlIHN0YXJ0ZWRcbiAgICAgIC8vIFRPRE8gLSBsb29rIHVwIHdobyB0aGUgYWN0dWFsIGJvc3MgaXMgb25jZSB3ZSBnZXQgYm9zcyBzaHVmZmxlISEhXG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IG1lZXQoRXZlbnQuU0hZUk9OX01BU1NBQ1JFLCB0aGlzLmJvc3NSZXF1aXJlbWVudHModGhpcy5yb20uYm9zc2VzLm1hZG8xKSksXG4gICAgICAgIHNsb3Q6IFNsb3QoQm9zcy5NQURPMSksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFhOiAvLyBlbnRlciBvYWsgYWZ0ZXIgaW5zZWN0XG4gICAgICAvLyBOT1RFOiBUaGlzIGlzIG5vdCB0aGUgdHJpZ2dlciB0aGF0IGNoZWNrcywgYnV0IHJhdGhlciBpdCBoYXBwZW5zIG9uIHRoZSBlbnRyYW5jZS5cbiAgICAgIC8vIFRoaXMgaXMgYSBjb252ZW5pZW50IHBsYWNlIHRvIGhhbmRsZSBpdCwgdGhvdWdoLCBzaW5jZSB3ZSBhbHJlYWR5IG5lZWQgdG8gZXhwbGljaXRseVxuICAgICAgLy8gaWdub3JlIHRoaXMgdHJpZ2dlci4gIFdlIGFsc28gcmVxdWlyZSB3YXJwIGJvb3RzIGJlY2F1c2UgaXQncyBwb3NzaWJsZSB0aGF0IHRoZXJlJ3NcbiAgICAgIC8vIG5vIGRpcmVjdCB3YWxraW5nIHBhdGggYW5kIGl0J3Mgbm90IGZlYXNpYmxlIHRvIGNhcnJ5IHRoZSBjaGlsZCB3aXRoIHVzIGV2ZXJ5d2hlcmUsXG4gICAgICAvLyBkdWUgdG8gZ3JhcGhpY3MgcmVhc29ucy5cbiAgICAgIHJldHVybiB7Y2hlY2s6W3tcbiAgICAgICAgY29uZGl0aW9uOiBhbmQoRXZlbnQuRFdBUkZfQ0hJTEQsIENhcGFiaWxpdHkuQlVZX1dBUlApLFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50LlJFU0NVRURfQ0hJTEQpLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhhZDogLy8gYWxsb3cgb3BlbmluZyBwcmlzb24gZG9vclxuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBJdGVtLktFWV9UT19QUklTT04sXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX1BSSVNPTiksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFlOiAvLyBhbGxvdyBvcGVuaW5nIHN0eHlcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogSXRlbS5LRVlfVE9fU1RZWCxcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5PUEVORURfU1RZWCksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFmOiAvLyBhbGxvdyBjYWxtaW5nIHNlYVxuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBJdGVtLlNUQVRVRV9PRl9HT0xELFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50LkNBTE1FRF9TRUEpLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhiMTogLy8gc3RhcnQgZmlnaHQgd2l0aCBndWFyZGlhbiBzdGF0dWVzXG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IGFuZChJdGVtLkJPV19PRl9TVU4sIEl0ZW0uQk9XX09GX01PT04pLFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9DUllQVCksXG4gICAgICB9XX07XG4gICAgfVxuICAgIC8vIENoZWNrIGZvciByZWxldmFudCBmbGFncyBhbmQga25vd24gYWN0aW9uIHR5cGVzLlxuICAgIGNvbnN0IHRyaWdnZXIgPSB0aGlzLnJvbS50cmlnZ2Vyc1tpZCAmIDB4N2ZdO1xuICAgIGlmICghdHJpZ2dlciB8fCAhdHJpZ2dlci51c2VkKSB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHJpZ2dlcjogJHtoZXgoaWQpfWApO1xuICAgIGNvbnN0IHJlbGV2YW50ID0gKGY6IG51bWJlcikgPT4gdGhpcy5yZWxldmFudEZsYWdzLmhhcyhmKTtcbiAgICBjb25zdCByZWxldmFudEFuZFNldCA9IChmOiBudW1iZXIpID0+IGYgPiAwICYmIHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZik7XG4gICAgZnVuY3Rpb24gbWFwKGY6IG51bWJlcik6IG51bWJlciB7XG4gICAgICBpZiAoZiA8IDApIHJldHVybiB+bWFwKH5mKTtcbiAgICAgIGNvbnN0IG1hcHBlZCA9IEZMQUdfTUFQLmdldChmKTtcbiAgICAgIHJldHVybiBtYXBwZWQgIT0gbnVsbCA/IG1hcHBlZFswXVswXSA6IGY7XG4gICAgfVxuICAgIGNvbnN0IGFjdGlvbkl0ZW0gPSBUUklHR0VSX0FDVElPTl9JVEVNU1t0cmlnZ2VyLm1lc3NhZ2UuYWN0aW9uXTtcbiAgICBjb25zdCBjb25kaXRpb24gPSBhbmQoLi4udHJpZ2dlci5jb25kaXRpb25zLm1hcChtYXApLmZpbHRlcihyZWxldmFudEFuZFNldCkubWFwKENvbmRpdGlvbikpO1xuICAgIGlmICh0cmlnZ2VyLm1lc3NhZ2UuYWN0aW9uID09PSAweDE5KSB7IC8vIHB1c2gtZG93biB0cmlnZ2VyXG4gICAgICAvLyBUT0RPIC0gcGFzcyBpbiB0ZXJyYWluOyBpZiBvbiBsYW5kIGFuZCB0cmlnZ2VyIHNraXAgaXMgb24gdGhlblxuICAgICAgLy8gYWRkIGEgcm91dGUgcmVxdWlyaW5nIHJhYmJpdCBib290cyBhbmQgZWl0aGVyIHdhcnAgYm9vdHMgb3IgdGVsZXBvcnQ/XG4gICAgICBjb25zdCBleHRyYTogVHJpZ2dlckRhdGEgPSB7fTtcbiAgICAgIGlmICh0cmlnZ2VyLmlkID09PSAweDg2ICYmICF0aGlzLmZsYWdzLmFzc3VtZVJhYmJpdFNraXAoKSkge1xuICAgICAgICBleHRyYS5keCA9IFstMzIsIC0xNiwgMCwgMTZdO1xuICAgICAgfVxuICAgICAgaWYgKHRyaWdnZXIuaWQgPT09IDB4YmEgJiZcbiAgICAgICAgICAhdGhpcy5mbGFncy5kaXNhYmxlVGVsZXBvcnRTa2lwKCkgJiZcbiAgICAgICAgICAhdGhpcy5mbGFncy5hc3N1bWVUZWxlcG9ydFNraXAoKSkge1xuICAgICAgICBleHRyYS5leHRyYUxvY2F0aW9ucyA9IFt0aGlzLnJvbS5sb2NhdGlvbnMuY29yZGVsUGxhaW5zV2VzdF07XG4gICAgICB9XG4gICAgICBjb25zdCBjb25kID1cbiAgICAgICAgICB0cmlnZ2VyLmNvbmRpdGlvbnMubWFwKGMgPT4gYyA8IDAgJiYgcmVsZXZhbnQofm1hcChjKSkgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ29uZGl0aW9uKH5tYXAoYykpIDogbnVsbClcbiAgICAgICAgICAgICAgLmZpbHRlcigoYzogdW5rbm93bik6IGMgaXMgW1tDb25kaXRpb25dXSA9PiBjICE9IG51bGwpO1xuICAgICAgaWYgKGNvbmQgJiYgY29uZC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHsuLi5leHRyYSwgdGVycmFpbjoge2V4aXQ6IG9yKC4uLmNvbmQpfX07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhY3Rpb25JdGVtICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7Y29uZGl0aW9uLCBzbG90OiBhY3Rpb25JdGVtfV19O1xuICAgIH1cbiAgICBjb25zdCBmbGFncyA9IHRyaWdnZXIuZmxhZ3MuZmlsdGVyKHJlbGV2YW50QW5kU2V0KTtcbiAgICBpZiAoZmxhZ3MubGVuZ3RoKSB7XG4gICAgICByZXR1cm4ge2NoZWNrOiBmbGFncy5tYXAoZiA9PiAoe2NvbmRpdGlvbiwgc2xvdDogU2xvdChmKX0pKX07XG4gICAgfVxuXG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgbnBjKGlkOiBudW1iZXIsIGxvYzogTG9jYXRpb24pOiBOcGNEYXRhIHtcbiAgICBjb25zdCBucGMgPSB0aGlzLnJvbS5ucGNzW2lkXTtcbiAgICBpZiAoIW5wYyB8fCAhbnBjLnVzZWQpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0cmlnZ2VyOiAke2hleChpZCl9YCk7XG5cbiAgICBjb25zdCBzcGF3bkNvbmRpdGlvbnM6IHJlYWRvbmx5IG51bWJlcltdID0gbnBjLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jLmlkKSB8fCBbXTtcblxuICAgIGNvbnN0IHJlc3VsdDogTnBjRGF0YSAmIHtjaGVjazogQ2hlY2tbXX0gPSB7Y2hlY2s6IFtdfTtcblxuICAgIGlmIChucGMuZGF0YVsyXSAmIDB4MDQpIHtcbiAgICAgIC8vIHBlcnNvbiBpcyBhIHN0YXR1ZS5cbiAgICAgIHJlc3VsdC50ZXJyYWluID0ge1xuICAgICAgICBleGl0OiB0aGlzLmZsYWdzLmFzc3VtZVN0YXR1ZUdsaXRjaCgpID9cbiAgICAgICAgICAgICAgICAgIFtbXV0gOiBcbiAgICAgICAgICAgICAgICAgIG9yKC4uLnNwYXduQ29uZGl0aW9ucy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBGTEFHX01BUC5nZXQoeCkgfHwgKHRoaXMucmVsZXZhbnRGbGFncy5oYXMoeCkgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDb25kaXRpb24oeCkgOiBbXSkpKSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RhdHVlT3IoLi4ucmVxczogUmVxdWlyZW1lbnRbXSk6IHZvaWQge1xuICAgICAgaWYgKCFyZXN1bHQudGVycmFpbikgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHRlcnJhaW4gZm9yIGd1YXJkJyk7XG4gICAgICByZXN1bHQudGVycmFpbi5leGl0ID0gb3IocmVzdWx0LnRlcnJhaW4uZXhpdCB8fCBbXSwgLi4ucmVxcyk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGZvcnR1bmUgdGVsbGVyICgzOSkgcmVxdWlyZXMgYWNjZXNzIHRvIHBvcnRvYSB0byBnZXQgaGVyIHRvIG1vdmU/XG4gICAgLy8gICAgICAtPiBtYXliZSBpbnN0ZWFkIGNoYW5nZSB0aGUgZmxhZyB0byBzZXQgaW1tZWRpYXRlbHkgb24gdGFsa2luZyB0byBoZXJcbiAgICAvLyAgICAgICAgIHJhdGhlciB0aGFuIHRoZSB0cmlnZ2VyIG91dHNpZGUgdGhlIGRvb3IuLi4/IHRoaXMgd291bGQgYWxsb3cgZ2V0dGluZ1xuICAgIC8vICAgICAgICAgdGhyb3VnaCBpdCBieSBqdXN0IHRhbGtpbmcgYW5kIHRoZW4gbGVhdmluZyB0aGUgcm9vbS4uLlxuXG4gICAgc3dpdGNoIChpZCkge1xuICAgIGNhc2UgMHgxNDogLy8gd29rZW4tdXAgd2luZG1pbGwgZ3VhcmRcbiAgICAgIC8vIHNraXAgYmVjYXVzZSB3ZSB0aWUgdGhlIGl0ZW0gdG8gdGhlIHNsZWVwaW5nIG9uZS5cbiAgICAgIGlmIChsb2Muc3Bhd25zLmZpbmQobCA9PiBsLmlzTnBjKCkgJiYgbC5pZCA9PT0gMHgxNSkpIHJldHVybiB7fTtcbiAgICBjYXNlIDB4MjU6IC8vIGFtYXpvbmVzIGd1YXJkXG4gICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAwLCB4MTogMiwgeTA6IDAsIHkxOiAxfTtcbiAgICAgIHN0YXR1ZU9yKE1hZ2ljLkNIQU5HRSwgTWFnaWMuUEFSQUxZU0lTKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHgyZDogLy8gbXQgc2FicmUvc3dhbiBzb2xkaWVyc1xuICAgICAgLy8gVGhlc2UgZG9uJ3QgY291bnQgYXMgc3RhdHVlcyBiZWNhdXNlIHRoZXknbGwgbW92ZSBpZiB5b3UgdGFsayB0byB0aGVtLlxuICAgICAgZGVsZXRlIHJlc3VsdC50ZXJyYWluO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDMzOiAvLyBwb3J0b2EgZ3VhcmQgKHRocm9uZSByb29tLCB0aG91Z2ggdGhlIHBhbGFjZSBvbmUgaXMgdGhlIG9uZSB0aGF0IG1hdHRlcnMpXG4gICAgICAvLyBOT1RFOiB0aGlzIG1lYW5zIHRoYXQgd2UgY2Fubm90IHNlcGFyYXRlIHRoZSBwYWxhY2UgZm95ZXIgZnJvbSB0aGUgdGhyb25lIHJvb20sIHNpbmNlXG4gICAgICAvLyB0aGVyZSdzIG5vIHdheSB0byByZXByZXNlbnQgdGhlIGNvbmRpdGlvbiBmb3IgcGFyYWx5emluZyB0aGUgZ3VhcmQgYW5kIHN0aWxsIGhhdmUgaGltXG4gICAgICAvLyBwYXNzYWJsZSB3aGVuIHRoZSBxdWVlbiBpcyB0aGVyZS4gIFRoZSB3aG9sZSBzZXF1ZW5jZSBpcyBhbHNvIHRpZ2h0bHkgY291cGxlZCwgc28gaXRcbiAgICAgIC8vIHByb2JhYmx5IHdvdWxkbid0IG1ha2Ugc2Vuc2UgdG8gc3BsaXQgaXQgdXAgYW55d2F5LlxuICAgICAgc3RhdHVlT3IoTWFnaWMuUEFSQUxZU0lTKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHgzODogLy8gcG9ydG9hIHF1ZWVuIHNpdHRpbmcgb24gaW1wYXNzYWJsZSB0aHJvbmVcbiAgICAgIGlmIChsb2MuaWQgPT09IDB4ZGYpIHJlc3VsdC5oaXRib3ggPSB7eDA6IDAsIHgxOiAxLCB5MDogMiwgeTE6IDN9O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDRlOiAvLyBzaHlyb24gZ3VhcmRcbiAgICAgIHJlc3VsdC5oaXRib3ggPSB7eDA6IC0xLCB4MTogMiwgeTA6IDAsIHkxOiAxfTtcbiAgICAgIHN0YXR1ZU9yKE1hZ2ljLkNIQU5HRSwgRXZlbnQuRU5URVJFRF9TSFlST04pO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDgwOiAvLyBnb2EgZ3VhcmRzXG4gICAgICBzdGF0dWVPciguLi5zcGF3bkNvbmRpdGlvbnMubWFwKGMgPT4gQ29uZGl0aW9uKH5jKSkpOyAvLyBFdmVudC5FTlRFUkVEX1NIWVJPTlxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDg1OiAvLyBzdG9uZWQgcGFpclxuICAgICAgc3RhdHVlT3IoSXRlbS5GTFVURV9PRl9MSU1FKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIGludGVyc2VjdCBzcGF3biBjb25kaXRpb25zXG4gICAgY29uc3QgcmVxdWlyZW1lbnRzOiBBcnJheTxyZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dPiA9IFtdO1xuICAgIGNvbnN0IGFkZFJlcSA9IChmbGFnOiBudW1iZXIpOiB2b2lkID0+IHtcbiAgICAgIGlmIChmbGFnIDw9IDApIHJldHVybjsgLy8gbmVnYXRpdmUgb3IgemVybyBmbGFnIGlnbm9yZWRcbiAgICAgIGNvbnN0IHJlcSA9IEZMQUdfTUFQLmdldChmbGFnKSB8fCAodGhpcy5yZWxldmFudEZsYWdzLmhhcyhmbGFnKSA/IENvbmRpdGlvbihmbGFnKSA6IG51bGwpO1xuICAgICAgaWYgKHJlcSAhPSBudWxsKSByZXF1aXJlbWVudHMucHVzaChyZXEpO1xuICAgIH07XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIHNwYXduQ29uZGl0aW9ucykge1xuICAgICAgYWRkUmVxKGZsYWcpO1xuICAgIH1cblxuICAgIC8vIExvb2sgZm9yIHRyYWRlLWluc1xuICAgIC8vICAtIFRPRE8gLSBkb24ndCBoYXJkLWNvZGUgdGhlIE5QQ3M/IHJlYWQgZnJvbSB0aGUgaXRlbWRhdGE/XG4gICAgY29uc3QgdHJhZGVJbiA9IHRoaXMudHJhZGVJbnMuZ2V0KGlkKVxuICAgIGlmICh0cmFkZUluICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHQgPSB0cmFkZUluO1xuICAgICAgZnVuY3Rpb24gdHJhZGUoc2xvdDogU2xvdCwgLi4ucmVxczogQXJyYXk8cmVhZG9ubHkgW3JlYWRvbmx5IENvbmRpdGlvbltdXT4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgY29uZGl0aW9uID0gYW5kKC4uLnJlcXVpcmVtZW50cywgdCwgLi4ucmVxcyk7XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90LCBjb25kaXRpb259KTtcbiAgICAgIH1cbiAgICAgIGxldCB0cmFkZVIgPSB0cmFkZTtcbiAgICAgIGlmICh0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFncy5yYW5kb21pemVUcmFkZXMoKSkge1xuICAgICAgICB0cmFkZVIgPSAoc2xvdCwgLi4ucmVxcykgPT4ge1xuICAgICAgICAgIGNvbnN0IGl0ZW1zID0gW1xuICAgICAgICAgICAgSXRlbS5TVEFUVUVfT0ZfT05ZWCxcbiAgICAgICAgICAgIEl0ZW0uRk9HX0xBTVAsXG4gICAgICAgICAgICBJdGVtLkxPVkVfUEVOREFOVCxcbiAgICAgICAgICAgIEl0ZW0uS0lSSVNBX1BMQU5ULFxuICAgICAgICAgICAgSXRlbS5JVk9SWV9TVEFUVUUsXG4gICAgICAgICAgXTtcbiAgICAgICAgICBjb25zdCBjb25kaXRpb24gPVxuICAgICAgICAgICAgICBvciguLi5pdGVtcy5tYXAoaSA9PiBhbmQoLi4ucmVxdWlyZW1lbnRzLCBpLCAuLi5yZXFzKSkpO1xuICAgICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90LCBjb25kaXRpb259KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc3dpdGNoIChpZCkge1xuICAgICAgY2FzZSAweDE1OiAvLyBzbGVlcGluZyB3aW5kbWlsbCBndWFyZCA9PiB3aW5kbWlsbCBrZXkgc2xvdFxuICAgICAgICB0cmFkZShTbG90KEl0ZW0uV0lORE1JTExfS0VZKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDIzOiAvLyBhcnlsbGlzID0+IGJvdyBvZiBtb29uIHNsb3RcbiAgICAgICAgLy8gTk9URTogc2l0dGluZyBvbiBpbXBhc3NpYmxlIHRocm9uZVxuICAgICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAtMSwgeDE6IDIsIHkwOiAtMSwgeTE6IDJ9O1xuICAgICAgICB0cmFkZVIoU2xvdChJdGVtLkJPV19PRl9NT09OKSwgTWFnaWMuQ0hBTkdFKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NjM6IC8vIGh1cnQgZG9scGhpbiA9PiBoZWFsZWQgZG9scGhpblxuICAgICAgICAvLyBOT1RFOiBkb2xwaGluIG9uIHdhdGVyLCBidXQgY2FuIGhlYWwgZnJvbSBsYW5kXG4gICAgICAgIHJlc3VsdC5oaXRib3ggPSB7eDA6IC0xLCB4MTogMiwgeTA6IC0xLCB5MTogMn07XG4gICAgICAgIHRyYWRlKFNsb3QoRXZlbnQuSEVBTEVEX0RPTFBISU4pKTtcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLlNIRUxMX0ZMVVRFKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDY0OiAvLyBmaXNoZXJtYW5cbiAgICAgICAgdHJhZGVSKFNsb3QoRXZlbnQuUkVUVVJORURfRk9HX0xBTVApLFxuICAgICAgICAgICAgICAgLi4uKHRoaXMuZmxhZ3MucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKSA/XG4gICAgICAgICAgICAgICAgICAgW0V2ZW50LkhFQUxFRF9ET0xQSElOXSA6IFtdKSk7XG4gICAgICAgIC8vIFRPRE8gLSB1c2UgdGhpcyBhcyBwcm94eSBmb3IgYm9hdFxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg2YjogLy8gc2xlZXBpbmcga2Vuc3VcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLkdMT1dJTkdfTEFNUCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg3NTogLy8gc2xpbWVkIGtlbnN1ID0+IGZsaWdodCBzbG90XG4gICAgICAgIHRyYWRlUihTbG90KE1hZ2ljLkZMSUdIVCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg3NDogLy8ga2Vuc3UgaW4gZGFuY2UgaGFsbCA9PiBjaGFuZ2Ugc2xvdFxuICAgICAgICAvLyBOT1RFOiB0aGlzIGlzIG5vcm1hbGx5IDdlIGJ1dCB3ZSBjaGFuZ2UgaXQgdG8gNzQgaW4gdGhpcyBvbmVcbiAgICAgICAgLy8gbG9jYXRpb24gdG8gaWRlbnRpZnkgaXRcbiAgICAgICAgdHJhZGVSKFNsb3QoTWFnaWMuQ0hBTkdFKSwgTWFnaWMuUEFSQUxZU0lTLCBFdmVudC5GT1VORF9LRU5TVSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDgyOiAvLyBha2FoYW5hID0+IGdhcyBtYXNrIHNsb3QgKGNoYW5nZWQgMTYgLT4gODIpXG4gICAgICAgIHRyYWRlUihTbG90KEl0ZW0uR0FTX01BU0spKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4ODg6IC8vIHN0b25lZCBha2FoYW5hID0+IHNoaWVsZCByaW5nIHNsb3RcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLlNISUVMRF9SSU5HKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5QQ3MgdGhhdCBuZWVkIGEgbGl0dGxlIGV4dHJhIGNhcmVcblxuICAgIGlmIChpZCA9PT0gMHg4NCkgeyAvLyBzdGFydCBmaWdodCB3aXRoIHNhYmVyYVxuICAgICAgLy8gVE9ETyAtIGxvb2sgdXAgd2hvIHRoZSBhY3R1YWwgYm9zcyBpcyBvbmNlIHdlIGdldCBib3NzIHNodWZmbGUhISFcbiAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IHRoaXMuYm9zc1JlcXVpcmVtZW50cyh0aGlzLnJvbS5ib3NzZXMuc2FiZXJhMSk7XG4gICAgICByZXR1cm4ge2NoZWNrOiBbXG4gICAgICAgIHtjb25kaXRpb24sIHNsb3Q6IFNsb3QoQm9zcy5TQUJFUkExKX0sXG4gICAgICBdfTtcbiAgICB9IGVsc2UgaWYgKGlkID09PSAweDFkKSB7IC8vIG9hayBlbGRlciBoYXMgc29tZSB3ZWlyZCB1bnRyYWNrZWQgY29uZGl0aW9ucy5cbiAgICAgIGNvbnN0IHNsb3QgPSBTbG90KEl0ZW0uU1dPUkRfT0ZfRklSRSk7XG4gICAgICByZXR1cm4ge2NoZWNrOiBbXG4gICAgICAgIC8vIHR3byBkaWZmZXJlbnQgd2F5cyB0byBnZXQgdGhlIHN3b3JkIG9mIGZpcmUgaXRlbVxuICAgICAgICB7Y29uZGl0aW9uOiBhbmQoTWFnaWMuVEVMRVBBVEhZLCBCb3NzLklOU0VDVCksIHNsb3R9LFxuICAgICAgICB7Y29uZGl0aW9uOiBFdmVudC5SRVNDVUVEX0NISUxELCBzbG90fSxcbiAgICAgIF19O1xuICAgIH0gZWxzZSBpZiAoaWQgPT09IDB4MWYpIHsgLy8gZHdhcmYgY2hpbGRcbiAgICAgIGNvbnN0IHNwYXducyA9IHRoaXMucm9tLm5wY3NbaWRdLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jLmlkKTtcbiAgICAgIGlmIChzcGF3bnMgJiYgc3Bhd25zLmluY2x1ZGVzKDB4MDQ1KSkgcmV0dXJuIHt9OyAvLyBpbiBtb3RoZXIncyBob3VzZVxuICAgICAgcmV0dXJuIHtjaGVjazogW1xuICAgICAgICB7Y29uZGl0aW9uOiBFdmVudC5EV0FSRl9NT1RIRVIsIHNsb3Q6IFNsb3QoRXZlbnQuRFdBUkZfQ0hJTEQpfSxcbiAgICAgIF19O1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgZCBvZiBucGMuZ2xvYmFsRGlhbG9ncykge1xuICAgICAgYWRkUmVxKH5kLmNvbmRpdGlvbik7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZCBvZiBucGMubG9jYWxEaWFsb2dzLmdldChsb2MuaWQpIHx8IG5wYy5sb2NhbERpYWxvZ3MuZ2V0KC0xKSB8fCBbXSkge1xuICAgICAgLy8gSWYgdGhlIGNoZWNrIGNvbmRpdGlvbiBpcyBvcHBvc2l0ZSB0byB0aGUgc3Bhd24gY29uZGl0aW9uLCB0aGVuIHNraXAuXG4gICAgICAvLyBUaGlzIGVuc3VyZXMgd2UgZG9uJ3QgZXhwZWN0IHRoZSBxdWVlbiB0byBnaXZlIHJlY292ZXIgaW4gdGhlIHRocm9uZSByb29tLlxuICAgICAgaWYgKHNwYXduQ29uZGl0aW9ucy5pbmNsdWRlcyh+ZC5jb25kaXRpb24pKSBjb250aW51ZTtcbiAgICAgIC8vIEFwcGx5IHRoZSBGTEFHX01BUC5cbiAgICAgIGNvbnN0IG1hcHBlZCA9IEZMQUdfTUFQLmdldChkLmNvbmRpdGlvbik7XG4gICAgICBjb25zdCBwb3NpdGl2ZSA9XG4gICAgICAgICAgbWFwcGVkID8gW21hcHBlZF0gOlxuICAgICAgICAgIHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZC5jb25kaXRpb24pID8gW0NvbmRpdGlvbihkLmNvbmRpdGlvbildIDpcbiAgICAgICAgICBbXTtcbiAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IGFuZCguLi5wb3NpdGl2ZSwgLi4ucmVxdWlyZW1lbnRzKTtcbiAgICAgIC8vIElmIHRoZSBjb25kaXRpb24gaXMgYSBuZWdhdGl2ZSB0aGVuIGFueSBmdXR1cmUgY29uZGl0aW9ucyBtdXN0IGluY2x1ZGVcbiAgICAgIC8vIGl0IGFzIGEgcG9zaXRpdmUgcmVxdWlyZW1lbnQuXG4gICAgICBjb25zdCBuZWdhdGl2ZSA9XG4gICAgICAgICAgRkxBR19NQVAuZ2V0KH5kLmNvbmRpdGlvbikgfHxcbiAgICAgICAgICAodGhpcy5yZWxldmFudEZsYWdzLmhhcyh+ZC5jb25kaXRpb24pID8gQ29uZGl0aW9uKH5kLmNvbmRpdGlvbikgOiBudWxsKTtcbiAgICAgIGlmIChuZWdhdGl2ZSAhPSBudWxsKSByZXF1aXJlbWVudHMucHVzaChuZWdhdGl2ZSk7XG4gICAgICBjb25zdCBhY3Rpb24gPSBkLm1lc3NhZ2UuYWN0aW9uO1xuICAgICAgaWYgKGFjdGlvbiA9PT0gMHgwMykge1xuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdC5pdGVtKG5wYy5kYXRhWzBdKSwgY29uZGl0aW9ufSk7XG4gICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gMHgxMVxuICAgICAgICAgICAgICAgICB8fCAodGhpcy5mbGFncy56ZWJ1U3R1ZGVudEdpdmVzSXRlbSgpICYmIGFjdGlvbiA9PT0gMHgwOSkpIHtcbiAgICAgICAgLy8gTk9URTogJDA5IGlzIHplYnUgc3R1ZGVudCwgd2hpY2ggd2UndmUgcGF0Y2hlZCB0byBnaXZlIHRoZSBpdGVtLlxuICAgICAgICAvLyBUT0RPIC0gY2hlY2sgdGhlIHBhdGNoIHJhdGhlciB0aGFuIHRoZSBmbGFnP1xuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdC5pdGVtKG5wYy5kYXRhWzFdKSwgY29uZGl0aW9ufSk7XG4gICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gMHgxMCkge1xuICAgICAgICAvLyBOT1RFOiBRdWVlbiBjYW4ndCBiZSByZXZlYWxlZCBhcyBhc2luYSBpbiB0aGUgdGhyb25lIHJvb20uICBJbiBwYXJ0aWN1bGFyLFxuICAgICAgICAvLyB0aGlzIGVuc3VyZXMgdGhhdCB0aGUgYmFjayByb29tIGlzIHJlYWNoYWJsZSBiZWZvcmUgcmVxdWlyaW5nIHRoZSBkb2xwaGluXG4gICAgICAgIC8vIHRvIGFwcGVhci4gIFRoaXMgc2hvdWxkIGJlIGhhbmRsZWQgYnkgdGhlIGFib3ZlIGNoZWNrIGZvciB0aGUgZGlhbG9nIGFuZFxuICAgICAgICAvLyBzcGF3biBjb25kaXRpb25zIHRvIGJlIGNvbXBhdGlibGUuXG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90KE1hZ2ljLlJFQ09WRVIpLCBjb25kaXRpb259KTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAweDA4ICYmIGlkID09PSAweDJkKSB7XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9TV0FOKSwgY29uZGl0aW9ufSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZC5mbGFncykge1xuICAgICAgICBjb25zdCBtZmxhZyA9IEZMQUdfTUFQLmdldChmbGFnKTtcbiAgICAgICAgY29uc3QgcGZsYWcgPSBtZmxhZyA/IG1mbGFnIDogdGhpcy5yZWxldmFudEZsYWdzLmhhcyhmbGFnKSA/IENvbmRpdGlvbihmbGFnKSA6IG51bGw7XG4gICAgICAgIGlmIChwZmxhZykgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QocGZsYWcpLCBjb25kaXRpb259KTtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBzcGF3biAqcmVxdWlyZXMqIHRoaXMgY29uZGl0aW9uIHRoZW4gZG9uJ3QgZXZhbHVhdGUgYW55IG1vcmUuICBUaGlzXG4gICAgICAvLyBlbnN1cmVzIHdlIGRvbid0IGV4cGVjdCB0aGUgcXVlZW4gdG8gZ2l2ZSB0aGUgZmx1dGUgb2YgbGltZSBpbiB0aGUgYmFjayByb29tLFxuICAgICAgLy8gc2luY2Ugc2hlIHdvdWxkbid0IGhhdmUgc3Bhd25lZCB0aGVyZSBpbnRpbWUgdG8gZ2l2ZSBpdC5cbiAgICAgIGlmIChwb3NpdGl2ZS5sZW5ndGggJiYgc3Bhd25Db25kaXRpb25zLmluY2x1ZGVzKGQuY29uZGl0aW9uKSkgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBjYXBhYmlsaXRpZXMoKTogQ2FwYWJpbGl0eURhdGFbXSB7XG4gICAgbGV0IGJyZWFrU3RvbmU6IFJlcXVpcmVtZW50ID0gSXRlbS5TV09SRF9PRl9XSU5EO1xuICAgIGxldCBicmVha0ljZTogUmVxdWlyZW1lbnQgPSBJdGVtLlNXT1JEX09GX0ZJUkU7XG4gICAgbGV0IGZvcm1CcmlkZ2U6IFJlcXVpcmVtZW50ID0gSXRlbS5TV09SRF9PRl9XQVRFUjtcbiAgICBsZXQgYnJlYWtJcm9uOiBSZXF1aXJlbWVudCA9IEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUjtcbiAgICBpZiAoIXRoaXMuZmxhZ3Mub3Jic09wdGlvbmFsKCkpIHtcbiAgICAgIC8vIEFkZCBvcmIgcmVxdWlyZW1lbnRcbiAgICAgIGJyZWFrU3RvbmUgPSBvcihhbmQoSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLk9SQl9PRl9XSU5EKSxcbiAgICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLlRPUk5BRE9fQlJBQ0VMRVQpKTtcbiAgICAgIGJyZWFrSWNlID0gb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfRklSRSwgSXRlbS5PUkJfT0ZfRklSRSksXG4gICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX0ZJUkUsIEl0ZW0uRkxBTUVfQlJBQ0VMRVQpKTtcbiAgICAgIGZvcm1CcmlkZ2UgPSBvcihhbmQoSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5PUkJfT0ZfV0FURVIpLFxuICAgICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX1dBVEVSLCBJdGVtLkJMSVpaQVJEX0JSQUNFTEVUKSk7XG4gICAgICBicmVha0lyb24gPSBvcihhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBJdGVtLk9SQl9PRl9USFVOREVSKSxcbiAgICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX1RIVU5ERVIsIEl0ZW0uU1RPUk1fQlJBQ0VMRVQpKTtcbiAgICAgIGlmICh0aGlzLmZsYWdzLmFzc3VtZVN3b3JkQ2hhcmdlR2xpdGNoKCkpIHtcbiAgICAgICAgY29uc3QgbGV2ZWwyID0gb3IoYnJlYWtTdG9uZSwgYnJlYWtJY2UsIGZvcm1CcmlkZ2UsIGJyZWFrSXJvbik7XG4gICAgICAgIGZ1bmN0aW9uIG5lZWQoc3dvcmQ6IHJlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV0pOiBSZXF1aXJlbWVudCB7XG4gICAgICAgICAgY29uc3QgY29uZGl0aW9uOiBDb25kaXRpb24gPSBzd29yZFswXVswXTtcbiAgICAgICAgICByZXR1cm4gbGV2ZWwyLm1hcChjID0+IGNbMF0gPT09IGNvbmRpdGlvbiA/IGMgOiBbY29uZGl0aW9uLCAuLi5jXSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtTdG9uZSA9IG5lZWQoSXRlbS5TV09SRF9PRl9XSU5EKTtcbiAgICAgICAgYnJlYWtJY2UgPSBuZWVkKEl0ZW0uU1dPUkRfT0ZfRklSRSk7XG4gICAgICAgIGZvcm1CcmlkZ2UgPSBuZWVkKEl0ZW0uU1dPUkRfT0ZfV0FURVIpO1xuICAgICAgICBicmVha0lyb24gPSBuZWVkKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUik7XG4gICAgICB9XG4gICAgfVxuICAgIHR5cGUgQ2FwYWJpbGl0eUxpc3QgPSBBcnJheTxbcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXSwgLi4uUmVxdWlyZW1lbnRbXV0+O1xuICAgIGNvbnN0IGNhcGFiaWxpdGllczogQ2FwYWJpbGl0eUxpc3QgPSBbXG4gICAgICBbRXZlbnQuU1RBUlQsIGFuZCgpXSxcbiAgICAgIFtDYXBhYmlsaXR5LlNXT1JELFxuICAgICAgIEl0ZW0uU1dPUkRfT0ZfV0lORCwgSXRlbS5TV09SRF9PRl9GSVJFLFxuICAgICAgIEl0ZW0uU1dPUkRfT0ZfV0FURVIsIEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUl0sXG4gICAgICBbQ2FwYWJpbGl0eS5CUkVBS19TVE9ORSwgYnJlYWtTdG9uZV0sXG4gICAgICBbQ2FwYWJpbGl0eS5CUkVBS19JQ0UsIGJyZWFrSWNlXSxcbiAgICAgIFtDYXBhYmlsaXR5LkZPUk1fQlJJREdFLCBmb3JtQnJpZGdlXSxcbiAgICAgIFtDYXBhYmlsaXR5LkJSRUFLX0lST04sIGJyZWFrSXJvbl0sXG4gICAgICBbQ2FwYWJpbGl0eS5NT05FWSwgQ2FwYWJpbGl0eS5TV09SRF0sIC8vIFRPRE8gLSBjbGVhciB0aGlzIHVwXG4gICAgICBbQ2FwYWJpbGl0eS5DTElNQl9XQVRFUkZBTEwsIE1hZ2ljLkZMSUdIVF0sXG4gICAgICBbQ2FwYWJpbGl0eS5TSE9PVElOR19TVEFUVUUsIE1hZ2ljLkJBUlJJRVJdLCAvLyBUT0RPIC0gYWxsb3cgc2hpZWxkIHJpbmc/XG4gICAgICBbQ2FwYWJpbGl0eS5DTElNQl9TTE9QRSwgSXRlbS5SQUJCSVRfQk9PVFMsIE1hZ2ljLkZMSUdIVF0sXG4gICAgICAvLyBbRXZlbnQuR0VORVJBTFNfREVGRUFURUQsIEl0ZW0uSVZPUllfU1RBVFVFXSwgLy8gVE9ETyAtIGZpeCB0aGlzXG4gICAgICBbRXZlbnQuT1BFTkVEX1NFQUxFRF9DQVZFLCBFdmVudC5TVEFSVEVEX1dJTkRNSUxMXSwgLy8gVE9ETyAtIG1lcmdlIGNvbXBsZXRlbHk/XG4gICAgXTtcblxuICAgIGlmICh0aGlzLmZsYWdzLmFzc3VtZUdoZXR0b0ZsaWdodCgpKSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5DTElNQl9XQVRFUkZBTEwsIGFuZChFdmVudC5SSURFX0RPTFBISU4sIEl0ZW0uUkFCQklUX0JPT1RTKV0pO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5mbGFncy5ndWFyYW50ZWVCYXJyaWVyKCkpIHtcbiAgICAgIC8vIFRPRE8gLSBzd29yZCBjaGFyZ2UgZ2xpdGNoIG1pZ2h0IGJlIGEgcHJvYmxlbSB3aXRoIHRoZSBoZWFsaW5nIG9wdGlvbi4uLlxuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuU0hPT1RJTkdfU1RBVFVFLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBDYXBhYmlsaXR5LkJVWV9IRUFMSU5HKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgSXRlbS5TSElFTERfUklORyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIE1hZ2ljLlJFRlJFU0gpXSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZmxhZ3MubGVhdGhlckJvb3RzR2l2ZVNwZWVkKCkpIHtcbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LkNMSU1CX1NMT1BFLCBJdGVtLkxFQVRIRVJfQk9PVFNdKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGJvc3Mgb2YgdGhpcy5yb20uYm9zc2VzKSB7XG4gICAgICBpZiAoYm9zcy5raWxsICE9IG51bGwgJiYgYm9zcy5kcm9wICE9IG51bGwpIHtcbiAgICAgICAgLy8gU2F2ZXMgcmVkdW5kYW5jeSBvZiBwdXR0aW5nIHRoZSBpdGVtIGluIHRoZSBhY3R1YWwgcm9vbS5cbiAgICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0l0ZW0oYm9zcy5kcm9wKSwgQm9zcyhib3NzLmtpbGwpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNhcGFiaWxpdGllcy5wdXNoKFtJdGVtLk9SQl9PRl9XQVRFUiwgQm9zcy5SQUdFXSk7XG5cbiAgICBpZiAodGhpcy5mbGFncy5ndWFyYW50ZWVHYXNNYXNrKCkpIHtcbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LlRSQVZFTF9TV0FNUCwgSXRlbS5HQVNfTUFTS10pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5UUkFWRUxfU1dBTVAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgIG9yKEl0ZW0uR0FTX01BU0ssXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIEl0ZW0uTUVESUNBTF9IRVJCKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgTWFnaWMuUkVGUkVTSCkpXSk7XG4gICAgfVxuXG4gICAgLy8gaWYgKHRoaXMuZmxhZ3MuYXNzdW1lU3RhdHVlR2xpdGNoKCkpIHtcbiAgICAvLyAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LlNUQVRVRV9HTElUQ0gsIFtbXV1dKTtcbiAgICAvLyB9XG5cbiAgICByZXR1cm4gY2FwYWJpbGl0aWVzLm1hcCgoW2NhcGFiaWxpdHksIC4uLmRlcHNdKSA9PiAoe2NhcGFiaWxpdHksIGNvbmRpdGlvbjogb3IoLi4uZGVwcyl9KSk7XG4gIH1cblxuICB3YWxsQ2FwYWJpbGl0eSh0eXBlOiBXYWxsVHlwZSk6IHtmbGFnOiBudW1iZXJ9IHtcbiAgICByZXR1cm4ge2ZsYWc6IFtDYXBhYmlsaXR5LkJSRUFLX1NUT05FLCBDYXBhYmlsaXR5LkJSRUFLX0lDRSxcbiAgICAgICAgICAgICAgICAgICBDYXBhYmlsaXR5LkZPUk1fQlJJREdFLCBDYXBhYmlsaXR5LkJSRUFLX0lST05dW3R5cGVdWzBdWzBdfTtcbiAgfVxufVxuXG50eXBlIFRpbGVDaGVjayA9IENoZWNrICYge3RpbGU6IFRpbGVJZH07XG5cbi8vIFRPRE8gLSBtYXliZSBwdWxsIHRyaWdnZXJzIGFuZCBucGNzLCBldGMsIGJhY2sgdG9nZXRoZXI/XG4vLyAgICAgIC0gb3IgbWFrZSB0aGUgbG9jYXRpb24gb3ZlcmxheSBhIHNpbmdsZSBmdW5jdGlvbj9cbi8vICAgICAgICAtPiBuZWVkcyBjbG9zZWQtb3ZlciBzdGF0ZSB0byBzaGFyZSBpbnN0YW5jZXMuLi5cblxuaW50ZXJmYWNlIEV4dHJhUm91dGUge1xuICB0aWxlOiBUaWxlSWQ7XG4gIGNvbmRpdGlvbj86IFJlcXVpcmVtZW50O1xufVxuaW50ZXJmYWNlIEV4dHJhRWRnZSB7XG4gIGZyb206IFRpbGVJZDtcbiAgdG86IFRpbGVJZDtcbiAgY29uZGl0aW9uPzogUmVxdWlyZW1lbnQ7XG59XG5cbmludGVyZmFjZSBUcmlnZ2VyRGF0YSB7XG4gIHRlcnJhaW4/OiBUZXJyYWluO1xuICBjaGVjaz86IENoZWNrW107XG4gIC8vIGFsbG93cyBub3QgYXNzdW1pbmcgdGVsZXBvcnQgc2tpcFxuICBleHRyYUxvY2F0aW9ucz86IExvY2F0aW9uW107XG4gIC8vIGFsbG93cyBub3QgYXNzdW1pbmcgcmFiYml0IHNraXBcbiAgZHg/OiBudW1iZXJbXTtcbn1cblxuaW50ZXJmYWNlIE5wY0RhdGEge1xuICBoaXRib3g/OiBIaXRib3g7XG4gIHRlcnJhaW4/OiBUZXJyYWluO1xuICBjaGVjaz86IENoZWNrW107XG59XG5cbmludGVyZmFjZSBIaXRib3gge1xuICB4MDogbnVtYmVyO1xuICB5MDogbnVtYmVyO1xuICB4MTogbnVtYmVyO1xuICB5MTogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgQ2FwYWJpbGl0eURhdGEge1xuICBjb25kaXRpb24/OiBSZXF1aXJlbWVudDtcbiAgY2FwYWJpbGl0eTogcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXTtcbn1cblxuLy8gU3RhdGljIG1hcCBvZiB0ZXJyYWlucy5cbmNvbnN0IFRFUlJBSU5TOiBBcnJheTxUZXJyYWluIHwgdW5kZWZpbmVkPiA9ICgoKSA9PiB7XG4gIGNvbnN0IG91dCA9IFtdO1xuICBmb3IgKGxldCBlZmZlY3RzID0gMDsgZWZmZWN0cyA8IDEyODsgZWZmZWN0cysrKSB7XG4gICAgb3V0W2VmZmVjdHNdID0gdGVycmFpbihlZmZlY3RzKTtcbiAgfVxuICAvLyBjb25zb2xlLmxvZygnVEVSUkFJTlMnLCBvdXQpO1xuICByZXR1cm4gb3V0O1xuXG4gIC8qKlxuICAgKiBAcGFyYW0gZWZmZWN0cyBUaGUgJDI2IGJpdHMgb2YgdGlsZWVmZmVjdHMsIHBsdXMgJDA4IGZvciBzd2FtcCwgJDEwIGZvciBkb2xwaGluLFxuICAgKiAkMDEgZm9yIHNob290aW5nIHN0YXR1ZXMsICQ0MCBmb3Igc2hvcnQgc2xvcGVcbiAgICogQHJldHVybiB1bmRlZmluZWQgaWYgdGhlIHRlcnJhaW4gaXMgaW1wYXNzYWJsZS5cbiAgICovXG4gIGZ1bmN0aW9uIHRlcnJhaW4oZWZmZWN0czogbnVtYmVyKTogVGVycmFpbiB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKGVmZmVjdHMgJiAweDA0KSByZXR1cm4gdW5kZWZpbmVkOyAvLyBpbXBhc3NpYmxlXG4gICAgY29uc3QgdGVycmFpbjogVGVycmFpbiA9IHt9O1xuICAgIGlmICgoZWZmZWN0cyAmIDB4MTIpID09PSAweDEyKSB7IC8vIGRvbHBoaW4gb3IgZmx5XG4gICAgICBpZiAoZWZmZWN0cyAmIDB4MjApIHRlcnJhaW4uZXhpdCA9IENhcGFiaWxpdHkuQ0xJTUJfV0FURVJGQUxMO1xuICAgICAgdGVycmFpbi5lbnRlciA9IG9yKEV2ZW50LlJJREVfRE9MUEhJTiwgTWFnaWMuRkxJR0hUKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGVmZmVjdHMgJiAweDQwKSB7IC8vIHNob3J0IHNsb3BlXG4gICAgICAgIHRlcnJhaW4uZXhpdCA9IENhcGFiaWxpdHkuQ0xJTUJfU0xPUEU7XG4gICAgICB9IGVsc2UgaWYgKGVmZmVjdHMgJiAweDIwKSB7IC8vIHNsb3BlXG4gICAgICAgIHRlcnJhaW4uZXhpdCA9IE1hZ2ljLkZMSUdIVDtcbiAgICAgIH1cbiAgICAgIGlmIChlZmZlY3RzICYgMHgwMikgdGVycmFpbi5lbnRlciA9IE1hZ2ljLkZMSUdIVDsgLy8gbm8td2Fsa1xuICAgIH1cbiAgICBpZiAoZWZmZWN0cyAmIDB4MDgpIHsgLy8gc3dhbXBcbiAgICAgIHRlcnJhaW4uZW50ZXIgPSAodGVycmFpbi5lbnRlciB8fCBbW11dKS5tYXAoY3MgPT4gQ2FwYWJpbGl0eS5UUkFWRUxfU1dBTVBbMF0uY29uY2F0KGNzKSk7XG4gICAgfVxuICAgIGlmIChlZmZlY3RzICYgMHgwMSkgeyAvLyBzaG9vdGluZyBzdGF0dWVzXG4gICAgICB0ZXJyYWluLmVudGVyID0gKHRlcnJhaW4uZW50ZXIgfHwgW1tdXSkubWFwKGNzID0+IENhcGFiaWxpdHkuU0hPT1RJTkdfU1RBVFVFWzBdLmNvbmNhdChjcykpO1xuICAgIH1cbiAgICByZXR1cm4gdGVycmFpbjtcbiAgfVxufSkoKTtcblxuLy8gVE9ETyAtIGZpZ3VyZSBvdXQgd2hhdCB0aGlzIGxvb2tzIGxpa2UuLi4/XG4vLyAgLSBtYXliZSB3ZSBqdXN0IHdhbnQgdG8gbWFrZSBhIHBzZXVkbyBERUZFQVRFRF9JTlNFQ1QgZXZlbnQsIGJ1dCB0aGlzIHdvdWxkIG5lZWQgdG8gYmVcbi8vICAgIHNlcGFyYXRlIGZyb20gMTAxLCBzaW5jZSB0aGF0J3MgYXR0YWNoZWQgdG8gdGhlIGl0ZW1nZXQsIHdoaWNoIHdpbGwgbW92ZSB3aXRoIHRoZSBzbG90IVxuLy8gIC0gcHJvYmFibHkgd2FudCBhIGZsYWcgZm9yIGVhY2ggYm9zcyBkZWZlYXRlZC4uLj9cbi8vICAgIGNvdWxkIHVzZSBib3Nza2lsbCBJRCBmb3IgaXQ/XG4vLyAgICAtIHRoZW4gbWFrZSB0aGUgZHJvcCBhIHNpbXBsZSBkZXJpdmF0aXZlIGZyb20gdGhhdC4uLlxuLy8gICAgLSB1cHNob3QgLSBubyBsb25nZXIgbmVlZCB0byBtaXggaXQgaW50byBucGMoKSBvciB0cmlnZ2VyKCkgb3ZlcmxheSwgaW5zdGVhZCBtb3ZlIGl0XG4vLyAgICAgIHRvIGNhcGFiaWxpdHkgb3ZlcmxheS5cbi8vIGZ1bmN0aW9uIHNsb3RGb3I8VD4oaXRlbTogVCk6IFQgeyByZXR1cm4gaXRlbTsgfVxuIl19