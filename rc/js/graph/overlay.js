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
    0x024,
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
    0x2f7,
    0x2fb,
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
                tile: entrance(0xf2),
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
            else if (action === 0x11 || action === 0x09) {
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
            [Event.ALWAYS_TRUE, and()],
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
            [Event.GENERALS_DEFEATED, Item.IVORY_STATUE],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9ncmFwaC9vdmVybGF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFTLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFDN0QsSUFBSSxFQUFxQixHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQUUsUUFBUSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBSy9DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFhbkMsTUFBTSxjQUFjLEdBQUc7SUFDckIsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFFTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFHTCxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLO0lBRTFCLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLO0lBQ3RE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QUcsSUFBSSxFQUFFO2dCQUN6QixPQUFPLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7YUFDN0I7WUFDRCxJQUFJLE9BQU8sR0FBRyxJQUFJO2dCQUFFLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztTQUNsRDtRQUNELElBQUksT0FBTyxHQUFHLElBQUksRUFBRTtZQUNsQixPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUMxRjtRQUNELElBQUksT0FBTyxHQUFHLElBQUksRUFBRTtZQUNsQixPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUM3RjtRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7QUFDSCxDQUFDLENBQUMsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtCb3NzLCBDYXBhYmlsaXR5LCBDaGVjaywgQ29uZGl0aW9uLCBFdmVudCwgSXRlbSwgTWFnaWMsIE11dGFibGVSZXF1aXJlbWVudCxcbiAgICAgICAgUmVxdWlyZW1lbnQsIFNsb3QsIFRlcnJhaW4sIFdhbGxUeXBlLCBhbmQsIG1lZXQsIG9yfSBmcm9tICcuL2NvbmRpdGlvbi5qcyc7XG5pbXBvcnQge1RpbGVJZCwgU2NyZWVuSWR9IGZyb20gJy4vZ2VvbWV0cnkuanMnO1xuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtCb3NzIGFzIFJvbUJvc3N9IGZyb20gJy4uL3JvbS9ib3NzZXMuanMnO1xuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnLi4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7U2hvcFR5cGV9IGZyb20gJy4uL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7aGV4fSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5cbi8vIEFkZGl0aW9uYWwgaW5mb3JtYXRpb24gbmVlZGVkIHRvIGludGVycHJldCB0aGUgd29ybGQgZ3JhcGggZGF0YS5cbi8vIFRoaXMgZ2V0cyBpbnRvIG1vcmUgc3BlY2lmaWNzIGFuZCBoYXJkY29kaW5nLlxuXG4vLyBUT0RPIC0gbWF5YmUgY29uc2lkZXIgaGF2aW5nIGEgc2V0IG9mIEFTU1VNRUQgYW5kIGEgc2V0IG9mIElHTk9SRUQgZmxhZ3M/XG4vLyAgICAgIC0gZS5nLiBhbHdheXMgYXNzdW1lIDAwZiBpcyBGQUxTRSByYXRoZXIgdGhhbiBUUlVFLCB0byBhdm9pZCBmcmVlIHdpbmRtaWxsIGtleVxuXG5cbi8vIFRPRE8gLSBwcmlzb24ga2V5IG1pc3NpbmcgZnJvbSBwYXJhbHlzaXMgZGVwcyAob3IgcmF0aGVyIGEgbm9uLWZsaWdodCB2ZXJzaW9uKSFcblxuXG5cbmNvbnN0IFJFTEVWQU5UX0ZMQUdTID0gW1xuICAweDAwYSwgLy8gdXNlZCB3aW5kbWlsbCBrZXlcbiAgMHgwMGIsIC8vIHRhbGtlZCB0byBsZWFmIGVsZGVyXG4gIDB4MDE4LCAvLyBlbnRlcmVkIHVuZGVyZ3JvdW5kIGNoYW5uZWxcbiAgMHgwMWIsIC8vIG1lc2lhIHJlY29yZGluZyBwbGF5ZWRcbiAgMHgwMWUsIC8vIHF1ZWVuIHJldmVhbGVkXG4gIDB4MDIxLCAvLyByZXR1cm5lZCBmb2cgbGFtcFxuICAweDAyNCwgLy8gZ2VuZXJhbHMgZGVmZWF0ZWQgKGdvdCBpdm9yeSBzdGF0dWUpXG4gIDB4MDI1LCAvLyBoZWFsZWQgZG9scGhpblxuICAweDAyNiwgLy8gZW50ZXJlZCBzaHlyb24gKGZvciBnb2EgZ3VhcmRzKVxuICAweDAyNywgLy8gc2h5cm9uIG1hc3NhY3JlXG4gIC8vIDB4MzUsIC8vIGN1cmVkIGFrYWhhbmFcbiAgMHgwMzgsIC8vIGxlYWYgYWJkdWN0aW9uXG4gIDB4MDNhLCAvLyB0YWxrZWQgdG8gemVidSBpbiBjYXZlIChhZGRlZCBhcyByZXEgZm9yIGFiZHVjdGlvbilcbiAgMHgwM2IsIC8vIHRhbGtlZCB0byB6ZWJ1IGluIHNoeXJvbiAoYWRkZWQgYXMgcmVxIGZvciBtYXNzYWNyZSlcbiAgMHgwNDUsIC8vIHJlc2N1ZWQgY2hpbGRcbiAgMHgwNTIsIC8vIHRhbGtlZCB0byBkd2FyZiBtb3RoZXJcbiAgMHgwNTMsIC8vIGNoaWxkIGZvbGxvd2luZ1xuICAweDA2MSwgLy8gdGFsa2VkIHRvIHN0b20gaW4gc3dhbiBodXRcbiAgLy8gMHgwNmMsIC8vIGRlZmVhdGVkIGRyYXlnb24gMVxuICAweDA3MiwgLy8ga2Vuc3UgZm91bmQgaW4gdGF2ZXJuXG4gIDB4MDhiLCAvLyBnb3Qgc2hlbGwgZmx1dGVcbiAgMHgwOWIsIC8vIGFibGUgdG8gcmlkZSBkb2xwaGluXG4gIDB4MGE1LCAvLyB0YWxrZWQgdG8gemVidSBzdHVkZW50XG4gIDB4MGE5LCAvLyB0YWxrZWQgdG8gbGVhZiByYWJiaXRcbiAgMHgxMDAsIC8vIGtpbGxlZCB2YW1waXJlIDFcbiAgMHgxMDEsIC8vIGtpbGxlZCBpbnNlY3RcbiAgMHgxMDIsIC8vIGtpbGxlZCBrZWxiZXNxdWUgMVxuICAweDEwMywgLy8gcmFnZVxuICAweDEwNCwgLy8ga2lsbGVkIHNhYmVyYSAxXG4gIDB4MTA1LCAvLyBraWxsZWQgbWFkbyAxXG4gIDB4MTA2LCAvLyBraWxsZWQga2VsYmVzcXVlIDJcbiAgMHgxMDcsIC8vIGtpbGxlZCBzYWJlcmEgMlxuICAweDEwOCwgLy8ga2lsbGVkIG1hZG8gMlxuICAweDEwOSwgLy8ga2lsbGVkIGthcm1pbmVcbiAgMHgxMGEsIC8vIGtpbGxlZCBkcmF5Z29uIDFcbiAgMHgxMGIsIC8vIGtpbGxlZCBkcmF5Z29uIDJcbiAgMHgxMGMsIC8vIGtpbGxlZCB2YW1waXJlIDJcblxuICAvLyBzd29yZHMgKG1heSBiZSBuZWVkZWQgZm9yIHJhZ2UsIFNvVCBmb3IgbWFzc2FjcmUpXG4gIDB4MjAwLCAweDIwMSwgMHgyMDIsIDB4MjAzLFxuICAvLyBiYWxscyBhbmQgYnJhY2VsZXRzIG1heSBiZSBuZWVkZWQgZm9yIHRlbGVwb3J0XG4gIDB4MjA1LCAweDIwNiwgMHgyMDcsIDB4MjA4LCAweDIwOSwgMHgyMGEsIDB4MjBiLCAweDIwYyxcbiAgMHgyMzYsIC8vIHNoZWxsIGZsdXRlIChmb3IgZmlzaGVybWFuIHNwYXduKVxuICAweDI0MywgLy8gdGVsZXBhdGh5IChmb3IgcmFiYml0LCBvYWssIGRlbylcbiAgMHgyNDQsIC8vIHRlbGVwb3J0IChmb3IgbXQgc2FicmUgdHJpZ2dlcilcbiAgMHgyODMsIC8vIGNhbG1lZCBzZWEgKGZvciBiYXJyaWVyKVxuICAweDJlZSwgLy8gc3RhcnRlZCB3aW5kbWlsbCAoZm9yIHJlZnJlc2gpXG5cbiAgMHgyZjcsIC8vIHdhcnA6b2FrIChmb3IgdGVsZXBhdGh5KVxuICAweDJmYiwgLy8gd2FycDpqb2VsIChmb3IgZXZpbCBzcGlyaXQgaXNsYW5kKVxuXG4gIC8vIE1hZ2ljLkNIQU5HRVswXVswXSxcbiAgLy8gTWFnaWMuVEVMRVBBVEhZWzBdWzBdLFxuXTtcblxuLy8gVE9ETyAtIHRoaXMgaXMgbm90IHBlcnZhc2l2ZSBlbm91Z2ghISFcbi8vICAtIG5lZWQgYSB3YXkgdG8gcHV0IGl0IGV2ZXJ5d2hlcmVcbi8vICAgIC0+IG1heWJlIGluIE11dGFibGVSZXF1aXJlbWVudHM/XG5jb25zdCBGTEFHX01BUDogTWFwPG51bWJlciwgcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXT4gPSBuZXcgTWFwKFtcbiAgWzB4MDBhLCBFdmVudC5TVEFSVEVEX1dJTkRNSUxMXSwgLy8gdGhpcyBpcyByZWYnZCBvdXRzaWRlIHRoaXMgZmlsZSFcbiAgLy9bMHgwMGUsIE1hZ2ljLlRFTEVQQVRIWV0sXG4gIC8vWzB4MDNmLCBNYWdpYy5URUxFUE9SVF0sXG4gIFsweDAxMywgQm9zcy5TQUJFUkExXSxcbiAgLy8gUXVlZW4gd2lsbCBnaXZlIGZsdXRlIG9mIGxpbWUgdy9vIHBhcmFseXNpcyBpbiB0aGlzIGNhc2UuXG4gIFsweDAxNywgSXRlbS5TV09SRF9PRl9XQVRFUl0sXG4gIFsweDAyOCwgTWFnaWMuQ0hBTkdFXSxcbiAgWzB4MDI5LCBNYWdpYy5DSEFOR0VdLFxuICBbMHgwMmEsIE1hZ2ljLkNIQU5HRV0sXG4gIFsweDAyYiwgTWFnaWMuQ0hBTkdFXSxcbiAgWzB4MDZjLCBCb3NzLkRSQVlHT04xXSxcbiAgWzB4MDhiLCBJdGVtLlNIRUxMX0ZMVVRFXSxcbl0pO1xuXG4vLyBNYXBzIHRyaWdnZXIgYWN0aW9ucyB0byB0aGUgc2xvdCB0aGV5IGdyYW50LlxuY29uc3QgVFJJR0dFUl9BQ1RJT05fSVRFTVM6IHtbYWN0aW9uOiBudW1iZXJdOiBTbG90fSA9IHtcbiAgMHgwODogU2xvdChNYWdpYy5QQVJBTFlTSVMpLFxuICAweDBiOiBTbG90KE1hZ2ljLkJBUlJJRVIpLFxuICAweDBmOiBTbG90KE1hZ2ljLlJFRlJFU0gpLFxuICAweDE4OiBTbG90KE1hZ2ljLlRFTEVQQVRIWSksXG59O1xuXG5jb25zdCBTV09SRFMgPSBbSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLlNXT1JEX09GX0ZJUkUsXG4gICAgICAgICAgICAgICAgSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5TV09SRF9PRl9USFVOREVSXSBhcyBjb25zdDtcbmNvbnN0IFNXT1JEX1BPV0VSUyA9IFtcbiAgW0l0ZW0uT1JCX09GX1dJTkQsIEl0ZW0uVE9STkFET19CUkFDRUxFVF0sXG4gIFtJdGVtLk9SQl9PRl9GSVJFLCBJdGVtLkZMQU1FX0JSQUNFTEVUXSxcbiAgW0l0ZW0uT1JCX09GX1dBVEVSLCBJdGVtLkJMSVpaQVJEX0JSQUNFTEVUXSxcbiAgW0l0ZW0uT1JCX09GX1RIVU5ERVIsIEl0ZW0uU1RPUk1fQlJBQ0VMRVRdLFxuXSBhcyBjb25zdDtcblxuZnVuY3Rpb24gc3dvcmRSZXF1aXJlbWVudChzd29yZDogbnVtYmVyLCBsZXZlbDogbnVtYmVyKTogUmVxdWlyZW1lbnQge1xuICBsZXQgcjtcbiAgaWYgKGxldmVsID09PSAxKSByPSBTV09SRFNbc3dvcmRdO1xuICBlbHNlIGlmIChsZXZlbCA9PT0gMykgcj0gYW5kKFNXT1JEU1tzd29yZF0sIC4uLlNXT1JEX1BPV0VSU1tzd29yZF0pO1xuICBlbHNlIHI9IG9yKC4uLlNXT1JEX1BPV0VSU1tzd29yZF0ubWFwKHAgPT4gYW5kKFNXT1JEU1tzd29yZF0sIHApKSk7XG4gIGlmIChBcnJheS5pc0FycmF5KHJbMF1bMF0pKSB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgcmV0dXJuIHI7XG59XG5cbmV4cG9ydCBjbGFzcyBPdmVybGF5IHtcblxuICBwcml2YXRlIHJlYWRvbmx5IHJlbGV2YW50RmxhZ3MgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgLy8gbnBjIGlkIC0+IHdhbnRlZCBpdGVtXG4gIHByaXZhdGUgcmVhZG9ubHkgdHJhZGVJbnMgPSBuZXcgTWFwPG51bWJlciwgcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXT4oKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IHNob290aW5nU3RhdHVlcyA9IG5ldyBTZXQ8U2NyZWVuSWQ+KCk7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGZsYWdzOiBGbGFnU2V0LFxuICAgICAgICAgICAgICBwcml2YXRlIHJlYWRvbmx5IHRyYWNrZXI6IGJvb2xlYW4pIHtcbiAgICAvLyBUT0RPIC0gYWRqdXN0IGJhc2VkIG9uIGZsYWdzZXQ/XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIFJFTEVWQU5UX0ZMQUdTKSB7XG4gICAgICB0aGlzLnJlbGV2YW50RmxhZ3MuYWRkKGZsYWcpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygcm9tLml0ZW1zKSB7XG4gICAgICBpZiAoIWl0ZW0udHJhZGVJbikgY29udGludWU7XG4gICAgICBjb25zdCBjb25kID0gaXRlbS5pZCA9PT0gMHgxZCA/IENhcGFiaWxpdHkuQlVZX0hFQUxJTkcgOiBJdGVtKGl0ZW0uaWQpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtLnRyYWRlSW4ubGVuZ3RoOyBpICs9IDYpIHtcbiAgICAgICAgdGhpcy50cmFkZUlucy5zZXQoaXRlbS50cmFkZUluW2ldLCBjb25kKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBsb2Mgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2Muc3Bhd25zKSB7XG4gICAgICAgIGlmIChzcGF3bi5pc01vbnN0ZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHgzZikgeyAvLyBzaG9vdGluZyBzdGF0dWVzXG4gICAgICAgICAgdGhpcy5zaG9vdGluZ1N0YXR1ZXMuYWRkKFNjcmVlbklkLmZyb20obG9jLCBzcGF3bikpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vICAgMHgxZCwgLy8gbWVkaWNhbCBoZXJiXG4gICAgLy8gICAweDI1LCAvLyBzdGF0dWUgb2Ygb255eFxuICAgIC8vICAgMHgzNSwgLy8gZm9nIGxhbXBcbiAgICAvLyAgIDB4M2IsIC8vIGxvdmUgcGVuZGFudFxuICAgIC8vICAgMHgzYywgLy8ga2lyaXNhIHBsYW50XG4gICAgLy8gICAweDNkLCAvLyBpdm9yeSBzdGF0dWVcbiAgICAvLyBdLm1hcChpID0+IHRoaXMucm9tLml0ZW1zW2ldKTtcbiAgfVxuXG4gIC8qKiBAcGFyYW0gaWQgT2JqZWN0IElEIG9mIHRoZSBib3NzLiAqL1xuICBib3NzUmVxdWlyZW1lbnRzKGJvc3M6IFJvbUJvc3MpOiBSZXF1aXJlbWVudCB7XG4gICAgLy8gVE9ETyAtIGhhbmRsZSBib3NzIHNodWZmbGUgc29tZWhvdz9cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLnJhZ2UpIHtcbiAgICAgIGlmICh0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFncy5yYW5kb21pemVUcmFkZXMoKSkgcmV0dXJuIENhcGFiaWxpdHkuU1dPUkQ7XG4gICAgICAvLyByZXR1cm4gSXRlbS5TV09SRF9PRl9XQVRFUjtcbiAgICAgIHJldHVybiBDb25kaXRpb24odGhpcy5yb20ubnBjc1sweGMzXS5sb2NhbERpYWxvZ3MuZ2V0KC0xKSFbMF0uY29uZGl0aW9uKTtcbiAgICB9XG4gICAgY29uc3QgaWQgPSBib3NzLm9iamVjdDtcbiAgICBjb25zdCBvdXQgPSBuZXcgTXV0YWJsZVJlcXVpcmVtZW50KCk7XG4gICAgaWYgKHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzLnNodWZmbGVCb3NzRWxlbWVudHMoKSkge1xuICAgICAgb3V0LmFkZEFsbChDYXBhYmlsaXR5LlNXT1JEKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuZmxhZ3MuZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpKSB7XG4gICAgICBjb25zdCBsZXZlbCA9IHRoaXMuZmxhZ3MuZ3VhcmFudGVlU3dvcmRNYWdpYygpID8gYm9zcy5zd29yZExldmVsIDogMTtcbiAgICAgIGNvbnN0IG9iaiA9IHRoaXMucm9tLm9iamVjdHNbaWRdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyBpKyspIHtcbiAgICAgICAgaWYgKG9iai5pc1Z1bG5lcmFibGUoaSkpIG91dC5hZGRBbGwoc3dvcmRSZXF1aXJlbWVudChpLCBsZXZlbCkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQuYWRkQWxsKENhcGFiaWxpdHkuU1dPUkQpO1xuICAgIH1cbiAgICBjb25zdCBleHRyYTogQ2FwYWJpbGl0eVtdID0gW107XG4gICAgaWYgKHRoaXMuZmxhZ3MuZ3VhcmFudGVlUmVmcmVzaCgpKSB7XG4gICAgICAvLyBUT0RPIC0gbWFrZSB0aGlzIFwiZ3VhcmFudGVlIGRlZmVuc2l2ZSBtYWdpY1wiIGFuZCBhbGxvdyByZWZyZXNoIE9SIGJhcnJpZXI/XG4gICAgICBleHRyYS5wdXNoKE1hZ2ljLlJFRlJFU0gpO1xuICAgIH1cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLmluc2VjdCkgeyAvLyBpbnNlY3RcbiAgICAgIGV4dHJhLnB1c2goSXRlbS5JTlNFQ1RfRkxVVEUsIEl0ZW0uR0FTX01BU0spO1xuICAgIH1cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLmRyYXlnb24yKSB7XG4gICAgICBleHRyYS5wdXNoKEl0ZW0uQk9XX09GX1RSVVRIKTtcbiAgICAgIGlmICh0aGlzLmZsYWdzLnN0b3J5TW9kZSgpKSB7XG4gICAgICAgIGV4dHJhLnB1c2goXG4gICAgICAgICAgQm9zcy5LRUxCRVNRVUUxLFxuICAgICAgICAgIEJvc3MuS0VMQkVTUVVFMixcbiAgICAgICAgICBCb3NzLlNBQkVSQTEsXG4gICAgICAgICAgQm9zcy5TQUJFUkEyLFxuICAgICAgICAgIEJvc3MuTUFETzEsXG4gICAgICAgICAgQm9zcy5NQURPMixcbiAgICAgICAgICBCb3NzLktBUk1JTkUsXG4gICAgICAgICAgQm9zcy5EUkFZR09OMSxcbiAgICAgICAgICBJdGVtLlNXT1JEX09GX1dJTkQsXG4gICAgICAgICAgSXRlbS5TV09SRF9PRl9GSVJFLFxuICAgICAgICAgIEl0ZW0uU1dPUkRfT0ZfV0FURVIsXG4gICAgICAgICAgSXRlbS5TV09SRF9PRl9USFVOREVSKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGV4dHJhLmxlbmd0aCkge1xuICAgICAgb3V0LnJlc3RyaWN0KGFuZCguLi5leHRyYSkpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmZyZWV6ZSgpO1xuICB9XG5cbiAgbG9jYXRpb25zKCk6IFRpbGVDaGVja1tdIHtcbiAgICBjb25zdCBsb2NhdGlvbnM6IFRpbGVDaGVja1tdID0gW107XG4gICAgLy8gVE9ETyAtIHB1bGwgdGhlIGxvY2F0aW9uIG91dCBvZiBpdGVtVXNlRGF0YVswXSBmb3IgdGhlc2UgaXRlbXNcbiAgICBsb2NhdGlvbnMucHVzaCh7XG4gICAgICB0aWxlOiBUaWxlSWQoMHgwZjAwODgpLFxuICAgICAgc2xvdDogU2xvdChFdmVudC5TVEFSVEVEX1dJTkRNSUxMKSxcbiAgICAgIGNvbmRpdGlvbjogSXRlbS5XSU5ETUlMTF9LRVksXG4gICAgfSwge1xuICAgICAgdGlsZTogVGlsZUlkKDB4ZTQwMDg4KSxcbiAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX0pPRUxfU0hFRCksXG4gICAgICBjb25kaXRpb246IEl0ZW0uRVlFX0dMQVNTRVMsXG4gICAgfSk7XG4gICAgZm9yIChjb25zdCBzaG9wIG9mIHRoaXMucm9tLnNob3BzKSB7XG4gICAgICAvLyBsZWFmIGFuZCBzaHlyb24gbWF5IG5vdCBhbHdheXMgYmUgYWNjZXNzaWJsZSwgc28gZG9uJ3QgcmVseSBvbiB0aGVtLlxuICAgICAgaWYgKHNob3AubG9jYXRpb24gPT09IDB4YzMgfHwgc2hvcC5sb2NhdGlvbiA9PT0gMHhmNikgY29udGludWU7XG4gICAgICBpZiAoIXNob3AudXNlZCkgY29udGludWU7XG4gICAgICBpZiAoc2hvcC50eXBlICE9PSBTaG9wVHlwZS5UT09MKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGNoZWNrID0ge1xuICAgICAgICB0aWxlOiBUaWxlSWQoc2hvcC5sb2NhdGlvbiA8PCAxNiB8IDB4ODgpLFxuICAgICAgICBjb25kaXRpb246IENhcGFiaWxpdHkuTU9ORVksXG4gICAgICB9O1xuICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHNob3AuY29udGVudHMpIHtcbiAgICAgICAgaWYgKGl0ZW0gPT09IChJdGVtLk1FRElDQUxfSEVSQlswXVswXSAmIDB4ZmYpKSB7XG4gICAgICAgICAgbG9jYXRpb25zLnB1c2goey4uLmNoZWNrLCBzbG90OiBTbG90KENhcGFiaWxpdHkuQlVZX0hFQUxJTkcpfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSA9PT0gKEl0ZW0uV0FSUF9CT09UU1swXVswXSAmIDB4ZmYpKSB7XG4gICAgICAgICAgbG9jYXRpb25zLnB1c2goey4uLmNoZWNrLCBzbG90OiBTbG90KENhcGFiaWxpdHkuQlVZX1dBUlApfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxvY2F0aW9ucztcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHVuZGVmaW5lZCBpZiBpbXBhc3NhYmxlLiAqL1xuICBtYWtlVGVycmFpbihlZmZlY3RzOiBudW1iZXIsIHRpbGU6IFRpbGVJZCk6IFRlcnJhaW4gfCB1bmRlZmluZWQge1xuICAgIC8vIENoZWNrIGZvciBkb2xwaGluIG9yIHN3YW1wLiAgQ3VycmVudGx5IGRvbid0IHN1cHBvcnQgc2h1ZmZsaW5nIHRoZXNlLlxuICAgIGNvbnN0IGxvYyA9IHRpbGUgPj4+IDE2O1xuICAgIGVmZmVjdHMgJj0gMHgyNjtcbiAgICBpZiAobG9jID09PSAweDFhKSBlZmZlY3RzIHw9IDB4MDg7XG4gICAgaWYgKGxvYyA9PT0gMHg2MCB8fCBsb2MgPT09IDB4NjgpIGVmZmVjdHMgfD0gMHgxMDtcbiAgICAvLyBOT1RFOiBvbmx5IHRoZSB0b3AgaGFsZi1zY3JlZW4gaW4gdW5kZXJncm91bmQgY2hhbm5lbCBpcyBkb2xwaGluYWJsZVxuICAgIGlmIChsb2MgPT09IDB4NjQgJiYgKCh0aWxlICYgMHhmMGYwKSA8IDB4OTApKSBlZmZlY3RzIHw9IDB4MTA7XG4gICAgaWYgKHRoaXMuc2hvb3RpbmdTdGF0dWVzLmhhcyhTY3JlZW5JZC5mcm9tVGlsZSh0aWxlKSkpIGVmZmVjdHMgfD0gMHgwMTtcbiAgICBpZiAoZWZmZWN0cyAmIDB4MjApIHsgLy8gc2xvcGVcbiAgICAgIC8vIERldGVybWluZSBsZW5ndGggb2Ygc2xvcGU6IHNob3J0IHNsb3BlcyBhcmUgY2xpbWJhYmxlLlxuICAgICAgLy8gNi04IGFyZSBib3RoIGRvYWJsZSB3aXRoIGJvb3RzXG4gICAgICAvLyAwLTUgaXMgZG9hYmxlIHdpdGggbm8gYm9vdHNcbiAgICAgIC8vIDkgaXMgZG9hYmxlIHdpdGggcmFiYml0IGJvb3RzIG9ubHkgKG5vdCBhd2FyZSBvZiBhbnkgb2YgdGhlc2UuLi4pXG4gICAgICAvLyAxMCBpcyByaWdodCBvdXRcbiAgICAgIGNvbnN0IGdldEVmZmVjdHMgPSAodGlsZTogVGlsZUlkKTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgbCA9IHRoaXMucm9tLmxvY2F0aW9uc1t0aWxlID4+PiAxNl07XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IGwuc2NyZWVuc1sodGlsZSAmIDB4ZjAwMCkgPj4+IDEyXVsodGlsZSAmIDB4ZjAwKSA+Pj4gOF07XG4gICAgICAgIHJldHVybiB0aGlzLnJvbS50aWxlRWZmZWN0c1tsLnRpbGVFZmZlY3RzIC0gMHhiM11cbiAgICAgICAgICAgIC5lZmZlY3RzW3RoaXMucm9tLnNjcmVlbnNbc2NyZWVuXS50aWxlc1t0aWxlICYgMHhmZl1dO1xuICAgICAgfTtcbiAgICAgIGxldCBib3R0b20gPSB0aWxlO1xuICAgICAgbGV0IGhlaWdodCA9IC0xO1xuICAgICAgd2hpbGUgKGdldEVmZmVjdHMoYm90dG9tKSAmIDB4MjApIHtcbiAgICAgICAgYm90dG9tID0gVGlsZUlkLmFkZChib3R0b20sIDEsIDApO1xuICAgICAgICBoZWlnaHQrKztcbiAgICAgIH1cbiAgICAgIGxldCB0b3AgPSB0aWxlO1xuICAgICAgd2hpbGUgKGdldEVmZmVjdHModG9wKSAmIDB4MjApIHtcbiAgICAgICAgdG9wID0gVGlsZUlkLmFkZCh0b3AsIC0xLCAwKTtcbiAgICAgICAgaGVpZ2h0Kys7XG4gICAgICB9XG4gICAgICBpZiAoaGVpZ2h0IDwgNikge1xuICAgICAgICBlZmZlY3RzICY9IH4weDIwO1xuICAgICAgfSBlbHNlIGlmIChoZWlnaHQgPCA5KSB7XG4gICAgICAgIGVmZmVjdHMgfD0gMHg0MDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFRFUlJBSU5TW2VmZmVjdHNdO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNvbnNpZGVyIGZvbGRpbmcgdGhpcyBpbnRvIGxvY2F0aW9uL3RyaWdnZXIvbnBjIGFzIGFuIGV4dHJhIHJldHVybj9cbiAgZXh0cmFSb3V0ZXMoKTogRXh0cmFSb3V0ZVtdIHtcbiAgICBjb25zdCByb3V0ZXMgPSBbXTtcbiAgICBjb25zdCBlbnRyYW5jZSA9IChsb2NhdGlvbjogbnVtYmVyLCBlbnRyYW5jZTogbnVtYmVyID0gMCk6IFRpbGVJZCA9PiB7XG4gICAgICBjb25zdCBsID0gdGhpcy5yb20ubG9jYXRpb25zW2xvY2F0aW9uXTtcbiAgICAgIGNvbnN0IGUgPSBsLmVudHJhbmNlc1tlbnRyYW5jZV07XG4gICAgICByZXR1cm4gVGlsZUlkLmZyb20obCwgZSk7XG4gICAgfTtcbiAgICAvLyBTdGFydCB0aGUgZ2FtZSBhdCAwOjBcbiAgICByb3V0ZXMucHVzaCh7dGlsZTogZW50cmFuY2UoMCl9KTtcbiAgICAvLyBTd29yZCBvZiBUaHVuZGVyIHdhcnBcbiAgICAvLyBUT0RPIC0gZW50cmFuY2Ugc2h1ZmZsZSB3aWxsIGJyZWFrIHRoZSBhdXRvLXdhcnAtcG9pbnQgYWZmb3JkYW5jZS5cbiAgICBpZiAodGhpcy5mbGFncy50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCkpIHtcbiAgICAgIHJvdXRlcy5wdXNoKHtcbiAgICAgICAgdGlsZTogZW50cmFuY2UoMHhmMiksXG4gICAgICAgIGNvbmRpdGlvbjogb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUiwgQ2FwYWJpbGl0eS5CVVlfV0FSUCksXG4gICAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUiwgTWFnaWMuVEVMRVBPUlQpKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFncy5hc3N1bWVXaWxkV2FycCgpKSB7XG4gICAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMucm9tLndpbGRXYXJwLmxvY2F0aW9ucykge1xuICAgICAgICByb3V0ZXMucHVzaCh7dGlsZTogZW50cmFuY2UobG9jYXRpb24pfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByb3V0ZXM7XG4gIH1cblxuICAvLyBUT0RPIC0gY29uc2lkZXIgZm9sZGluZyB0aGlzIGludG8gbG9jYXRpb24vdHJpZ2dlci9ucGMgYXMgYW4gZXh0cmEgcmV0dXJuP1xuICBleHRyYUVkZ2VzKCk6IEV4dHJhRWRnZVtdIHtcbiAgICBjb25zdCBlZGdlcyA9IFtdO1xuICAgIC8vIG5lZWQgYW4gZWRnZSBmcm9tIHRoZSBib2F0IGhvdXNlIHRvIHRoZSBiZWFjaCAtIHdlIGNvdWxkIGJ1aWxkIHRoaXMgaW50byB0aGVcbiAgICAvLyBib2F0IGJvYXJkaW5nIHRyaWdnZXIsIGJ1dCBmb3Igbm93IGl0J3MgaGVyZS5cbiAgICBlZGdlcy5wdXNoKHtcbiAgICAgIGZyb206IFRpbGVJZCgweDUxMDA4OCksIC8vIGluIGZyb250IG9mIGJvYXQgaG91c2VcbiAgICAgIHRvOiBUaWxlSWQoMHg2MDg2ODgpLCAvLyBpbiBmcm9udCBvZiBjYWJpblxuICAgICAgY29uZGl0aW9uOiBFdmVudC5SRVRVUk5FRF9GT0dfTEFNUCxcbiAgICB9KTtcbiAgICByZXR1cm4gZWRnZXM7XG4gIH1cblxuICB0cmlnZ2VyKGlkOiBudW1iZXIpOiBUcmlnZ2VyRGF0YSB7XG4gICAgc3dpdGNoIChpZCkge1xuICAgIGNhc2UgMHg5YTogLy8gc3RhcnQgZmlnaHQgd2l0aCBtYWRvIGlmIHNoeXJvbiBtYXNzYWNyZSBzdGFydGVkXG4gICAgICAvLyBUT0RPIC0gbG9vayB1cCB3aG8gdGhlIGFjdHVhbCBib3NzIGlzIG9uY2Ugd2UgZ2V0IGJvc3Mgc2h1ZmZsZSEhIVxuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBtZWV0KEV2ZW50LlNIWVJPTl9NQVNTQUNSRSwgdGhpcy5ib3NzUmVxdWlyZW1lbnRzKHRoaXMucm9tLmJvc3Nlcy5tYWRvMSkpLFxuICAgICAgICBzbG90OiBTbG90KEJvc3MuTUFETzEpLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhhYTogLy8gZW50ZXIgb2FrIGFmdGVyIGluc2VjdFxuICAgICAgLy8gTk9URTogVGhpcyBpcyBub3QgdGhlIHRyaWdnZXIgdGhhdCBjaGVja3MsIGJ1dCByYXRoZXIgaXQgaGFwcGVucyBvbiB0aGUgZW50cmFuY2UuXG4gICAgICAvLyBUaGlzIGlzIGEgY29udmVuaWVudCBwbGFjZSB0byBoYW5kbGUgaXQsIHRob3VnaCwgc2luY2Ugd2UgYWxyZWFkeSBuZWVkIHRvIGV4cGxpY2l0bHlcbiAgICAgIC8vIGlnbm9yZSB0aGlzIHRyaWdnZXIuICBXZSBhbHNvIHJlcXVpcmUgd2FycCBib290cyBiZWNhdXNlIGl0J3MgcG9zc2libGUgdGhhdCB0aGVyZSdzXG4gICAgICAvLyBubyBkaXJlY3Qgd2Fsa2luZyBwYXRoIGFuZCBpdCdzIG5vdCBmZWFzaWJsZSB0byBjYXJyeSB0aGUgY2hpbGQgd2l0aCB1cyBldmVyeXdoZXJlLFxuICAgICAgLy8gZHVlIHRvIGdyYXBoaWNzIHJlYXNvbnMuXG4gICAgICByZXR1cm4ge2NoZWNrOlt7XG4gICAgICAgIGNvbmRpdGlvbjogYW5kKEV2ZW50LkRXQVJGX0NISUxELCBDYXBhYmlsaXR5LkJVWV9XQVJQKSxcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5SRVNDVUVEX0NISUxEKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YWQ6IC8vIGFsbG93IG9wZW5pbmcgcHJpc29uIGRvb3JcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogSXRlbS5LRVlfVE9fUFJJU09OLFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9QUklTT04pLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhhZTogLy8gYWxsb3cgb3BlbmluZyBzdHh5XG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IEl0ZW0uS0VZX1RPX1NUWVgsXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX1NUWVgpLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhhZjogLy8gYWxsb3cgY2FsbWluZyBzZWFcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogSXRlbS5TVEFUVUVfT0ZfR09MRCxcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5DQUxNRURfU0VBKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YjE6IC8vIHN0YXJ0IGZpZ2h0IHdpdGggZ3VhcmRpYW4gc3RhdHVlc1xuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBhbmQoSXRlbS5CT1dfT0ZfU1VOLCBJdGVtLkJPV19PRl9NT09OKSxcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5PUEVORURfQ1JZUFQpLFxuICAgICAgfV19O1xuICAgIH1cbiAgICAvLyBDaGVjayBmb3IgcmVsZXZhbnQgZmxhZ3MgYW5kIGtub3duIGFjdGlvbiB0eXBlcy5cbiAgICBjb25zdCB0cmlnZ2VyID0gdGhpcy5yb20udHJpZ2dlcnNbaWQgJiAweDdmXTtcbiAgICBpZiAoIXRyaWdnZXIgfHwgIXRyaWdnZXIudXNlZCkgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRyaWdnZXI6ICR7aGV4KGlkKX1gKTtcbiAgICBjb25zdCByZWxldmFudCA9IChmOiBudW1iZXIpID0+IHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZik7XG4gICAgY29uc3QgcmVsZXZhbnRBbmRTZXQgPSAoZjogbnVtYmVyKSA9PiBmID4gMCAmJiB0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGYpO1xuICAgIGZ1bmN0aW9uIG1hcChmOiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgaWYgKGYgPCAwKSByZXR1cm4gfm1hcCh+Zik7XG4gICAgICBjb25zdCBtYXBwZWQgPSBGTEFHX01BUC5nZXQoZik7XG4gICAgICByZXR1cm4gbWFwcGVkICE9IG51bGwgPyBtYXBwZWRbMF1bMF0gOiBmO1xuICAgIH1cbiAgICBjb25zdCBhY3Rpb25JdGVtID0gVFJJR0dFUl9BQ1RJT05fSVRFTVNbdHJpZ2dlci5tZXNzYWdlLmFjdGlvbl07XG4gICAgY29uc3QgY29uZGl0aW9uID0gYW5kKC4uLnRyaWdnZXIuY29uZGl0aW9ucy5tYXAobWFwKS5maWx0ZXIocmVsZXZhbnRBbmRTZXQpLm1hcChDb25kaXRpb24pKTtcbiAgICBpZiAodHJpZ2dlci5tZXNzYWdlLmFjdGlvbiA9PT0gMHgxOSkgeyAvLyBwdXNoLWRvd24gdHJpZ2dlclxuICAgICAgLy8gVE9ETyAtIHBhc3MgaW4gdGVycmFpbjsgaWYgb24gbGFuZCBhbmQgdHJpZ2dlciBza2lwIGlzIG9uIHRoZW5cbiAgICAgIC8vIGFkZCBhIHJvdXRlIHJlcXVpcmluZyByYWJiaXQgYm9vdHMgYW5kIGVpdGhlciB3YXJwIGJvb3RzIG9yIHRlbGVwb3J0P1xuICAgICAgY29uc3QgZXh0cmE6IFRyaWdnZXJEYXRhID0ge307XG4gICAgICBpZiAodHJpZ2dlci5pZCA9PT0gMHg4NiAmJiAhdGhpcy5mbGFncy5hc3N1bWVSYWJiaXRTa2lwKCkpIHtcbiAgICAgICAgZXh0cmEuZHggPSBbLTMyLCAtMTYsIDAsIDE2XTtcbiAgICAgIH1cbiAgICAgIGlmICh0cmlnZ2VyLmlkID09PSAweGJhICYmXG4gICAgICAgICAgIXRoaXMuZmxhZ3MuZGlzYWJsZVRlbGVwb3J0U2tpcCgpICYmXG4gICAgICAgICAgIXRoaXMuZmxhZ3MuYXNzdW1lVGVsZXBvcnRTa2lwKCkpIHtcbiAgICAgICAgZXh0cmEuZXh0cmFMb2NhdGlvbnMgPSBbdGhpcy5yb20ubG9jYXRpb25zLmNvcmRlbFBsYWluc1dlc3RdO1xuICAgICAgfVxuICAgICAgY29uc3QgY29uZCA9XG4gICAgICAgICAgdHJpZ2dlci5jb25kaXRpb25zLm1hcChjID0+IGMgPCAwICYmIHJlbGV2YW50KH5tYXAoYykpID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENvbmRpdGlvbih+bWFwKGMpKSA6IG51bGwpXG4gICAgICAgICAgICAgIC5maWx0ZXIoKGM6IHVua25vd24pOiBjIGlzIFtbQ29uZGl0aW9uXV0gPT4gYyAhPSBudWxsKTtcbiAgICAgIGlmIChjb25kICYmIGNvbmQubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB7Li4uZXh0cmEsIHRlcnJhaW46IHtleGl0OiBvciguLi5jb25kKX19O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYWN0aW9uSXRlbSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4ge2NoZWNrOiBbe2NvbmRpdGlvbiwgc2xvdDogYWN0aW9uSXRlbX1dfTtcbiAgICB9XG4gICAgY29uc3QgZmxhZ3MgPSB0cmlnZ2VyLmZsYWdzLmZpbHRlcihyZWxldmFudEFuZFNldCk7XG4gICAgaWYgKGZsYWdzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHtjaGVjazogZmxhZ3MubWFwKGYgPT4gKHtjb25kaXRpb24sIHNsb3Q6IFNsb3QoZil9KSl9O1xuICAgIH1cblxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIG5wYyhpZDogbnVtYmVyLCBsb2M6IExvY2F0aW9uKTogTnBjRGF0YSB7XG4gICAgY29uc3QgbnBjID0gdGhpcy5yb20ubnBjc1tpZF07XG4gICAgaWYgKCFucGMgfHwgIW5wYy51c2VkKSB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHJpZ2dlcjogJHtoZXgoaWQpfWApO1xuXG4gICAgY29uc3Qgc3Bhd25Db25kaXRpb25zOiByZWFkb25seSBudW1iZXJbXSA9IG5wYy5zcGF3bkNvbmRpdGlvbnMuZ2V0KGxvYy5pZCkgfHwgW107XG5cbiAgICBjb25zdCByZXN1bHQ6IE5wY0RhdGEgJiB7Y2hlY2s6IENoZWNrW119ID0ge2NoZWNrOiBbXX07XG5cbiAgICBpZiAobnBjLmRhdGFbMl0gJiAweDA0KSB7XG4gICAgICAvLyBwZXJzb24gaXMgYSBzdGF0dWUuXG4gICAgICByZXN1bHQudGVycmFpbiA9IHtcbiAgICAgICAgZXhpdDogdGhpcy5mbGFncy5hc3N1bWVTdGF0dWVHbGl0Y2goKSA/XG4gICAgICAgICAgICAgICAgICBbW11dIDogXG4gICAgICAgICAgICAgICAgICBvciguLi5zcGF3bkNvbmRpdGlvbnMubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gRkxBR19NQVAuZ2V0KHgpIHx8ICh0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKHgpID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ29uZGl0aW9uKHgpIDogW10pKSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN0YXR1ZU9yKC4uLnJlcXM6IFJlcXVpcmVtZW50W10pOiB2b2lkIHtcbiAgICAgIGlmICghcmVzdWx0LnRlcnJhaW4pIHRocm93IG5ldyBFcnJvcignTWlzc2luZyB0ZXJyYWluIGZvciBndWFyZCcpO1xuICAgICAgcmVzdWx0LnRlcnJhaW4uZXhpdCA9IG9yKHJlc3VsdC50ZXJyYWluLmV4aXQgfHwgW10sIC4uLnJlcXMpO1xuICAgIH1cblxuICAgIC8vIFRPRE8gLSBmb3J0dW5lIHRlbGxlciAoMzkpIHJlcXVpcmVzIGFjY2VzcyB0byBwb3J0b2EgdG8gZ2V0IGhlciB0byBtb3ZlP1xuICAgIC8vICAgICAgLT4gbWF5YmUgaW5zdGVhZCBjaGFuZ2UgdGhlIGZsYWcgdG8gc2V0IGltbWVkaWF0ZWx5IG9uIHRhbGtpbmcgdG8gaGVyXG4gICAgLy8gICAgICAgICByYXRoZXIgdGhhbiB0aGUgdHJpZ2dlciBvdXRzaWRlIHRoZSBkb29yLi4uPyB0aGlzIHdvdWxkIGFsbG93IGdldHRpbmdcbiAgICAvLyAgICAgICAgIHRocm91Z2ggaXQgYnkganVzdCB0YWxraW5nIGFuZCB0aGVuIGxlYXZpbmcgdGhlIHJvb20uLi5cblxuICAgIHN3aXRjaCAoaWQpIHtcbiAgICBjYXNlIDB4MTQ6IC8vIHdva2VuLXVwIHdpbmRtaWxsIGd1YXJkXG4gICAgICAvLyBza2lwIGJlY2F1c2Ugd2UgdGllIHRoZSBpdGVtIHRvIHRoZSBzbGVlcGluZyBvbmUuXG4gICAgICBpZiAobG9jLnNwYXducy5maW5kKGwgPT4gbC5pc05wYygpICYmIGwuaWQgPT09IDB4MTUpKSByZXR1cm4ge307XG4gICAgY2FzZSAweDI1OiAvLyBhbWF6b25lcyBndWFyZFxuICAgICAgcmVzdWx0LmhpdGJveCA9IHt4MDogMCwgeDE6IDIsIHkwOiAwLCB5MTogMX07XG4gICAgICBzdGF0dWVPcihNYWdpYy5DSEFOR0UsIE1hZ2ljLlBBUkFMWVNJUyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4MmQ6IC8vIG10IHNhYnJlL3N3YW4gc29sZGllcnNcbiAgICAgIC8vIFRoZXNlIGRvbid0IGNvdW50IGFzIHN0YXR1ZXMgYmVjYXVzZSB0aGV5J2xsIG1vdmUgaWYgeW91IHRhbGsgdG8gdGhlbS5cbiAgICAgIGRlbGV0ZSByZXN1bHQudGVycmFpbjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHgzMzogLy8gcG9ydG9hIGd1YXJkICh0aHJvbmUgcm9vbSwgdGhvdWdoIHRoZSBwYWxhY2Ugb25lIGlzIHRoZSBvbmUgdGhhdCBtYXR0ZXJzKVxuICAgICAgLy8gTk9URTogdGhpcyBtZWFucyB0aGF0IHdlIGNhbm5vdCBzZXBhcmF0ZSB0aGUgcGFsYWNlIGZveWVyIGZyb20gdGhlIHRocm9uZSByb29tLCBzaW5jZVxuICAgICAgLy8gdGhlcmUncyBubyB3YXkgdG8gcmVwcmVzZW50IHRoZSBjb25kaXRpb24gZm9yIHBhcmFseXppbmcgdGhlIGd1YXJkIGFuZCBzdGlsbCBoYXZlIGhpbVxuICAgICAgLy8gcGFzc2FibGUgd2hlbiB0aGUgcXVlZW4gaXMgdGhlcmUuICBUaGUgd2hvbGUgc2VxdWVuY2UgaXMgYWxzbyB0aWdodGx5IGNvdXBsZWQsIHNvIGl0XG4gICAgICAvLyBwcm9iYWJseSB3b3VsZG4ndCBtYWtlIHNlbnNlIHRvIHNwbGl0IGl0IHVwIGFueXdheS5cbiAgICAgIHN0YXR1ZU9yKE1hZ2ljLlBBUkFMWVNJUyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4Mzg6IC8vIHBvcnRvYSBxdWVlbiBzaXR0aW5nIG9uIGltcGFzc2FibGUgdGhyb25lXG4gICAgICBpZiAobG9jLmlkID09PSAweGRmKSByZXN1bHQuaGl0Ym94ID0ge3gwOiAwLCB4MTogMSwgeTA6IDIsIHkxOiAzfTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHg0ZTogLy8gc2h5cm9uIGd1YXJkXG4gICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAtMSwgeDE6IDIsIHkwOiAwLCB5MTogMX07XG4gICAgICBzdGF0dWVPcihNYWdpYy5DSEFOR0UsIEV2ZW50LkVOVEVSRURfU0hZUk9OKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHg4MDogLy8gZ29hIGd1YXJkc1xuICAgICAgc3RhdHVlT3IoLi4uc3Bhd25Db25kaXRpb25zLm1hcChjID0+IENvbmRpdGlvbih+YykpKTsgLy8gRXZlbnQuRU5URVJFRF9TSFlST05cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHg4NTogLy8gc3RvbmVkIHBhaXJcbiAgICAgIHN0YXR1ZU9yKEl0ZW0uRkxVVEVfT0ZfTElNRSk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBpbnRlcnNlY3Qgc3Bhd24gY29uZGl0aW9uc1xuICAgIGNvbnN0IHJlcXVpcmVtZW50czogQXJyYXk8cmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXT4gPSBbXTtcbiAgICBjb25zdCBhZGRSZXEgPSAoZmxhZzogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgICBpZiAoZmxhZyA8PSAwKSByZXR1cm47IC8vIG5lZ2F0aXZlIG9yIHplcm8gZmxhZyBpZ25vcmVkXG4gICAgICBjb25zdCByZXEgPSBGTEFHX01BUC5nZXQoZmxhZykgfHwgKHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZmxhZykgPyBDb25kaXRpb24oZmxhZykgOiBudWxsKTtcbiAgICAgIGlmIChyZXEgIT0gbnVsbCkgcmVxdWlyZW1lbnRzLnB1c2gocmVxKTtcbiAgICB9O1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBzcGF3bkNvbmRpdGlvbnMpIHtcbiAgICAgIGFkZFJlcShmbGFnKTtcbiAgICB9XG5cbiAgICAvLyBMb29rIGZvciB0cmFkZS1pbnNcbiAgICAvLyAgLSBUT0RPIC0gZG9uJ3QgaGFyZC1jb2RlIHRoZSBOUENzPyByZWFkIGZyb20gdGhlIGl0ZW1kYXRhP1xuICAgIGNvbnN0IHRyYWRlSW4gPSB0aGlzLnRyYWRlSW5zLmdldChpZClcbiAgICBpZiAodHJhZGVJbiAhPSBudWxsKSB7XG4gICAgICBjb25zdCB0ID0gdHJhZGVJbjtcbiAgICAgIGZ1bmN0aW9uIHRyYWRlKHNsb3Q6IFNsb3QsIC4uLnJlcXM6IEFycmF5PHJlYWRvbmx5IFtyZWFkb25seSBDb25kaXRpb25bXV0+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IGFuZCguLi5yZXF1aXJlbWVudHMsIHQsIC4uLnJlcXMpO1xuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdCwgY29uZGl0aW9ufSk7XG4gICAgICB9XG4gICAgICBsZXQgdHJhZGVSID0gdHJhZGU7XG4gICAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3MucmFuZG9taXplVHJhZGVzKCkpIHtcbiAgICAgICAgdHJhZGVSID0gKHNsb3QsIC4uLnJlcXMpID0+IHtcbiAgICAgICAgICBjb25zdCBpdGVtcyA9IFtcbiAgICAgICAgICAgIEl0ZW0uU1RBVFVFX09GX09OWVgsXG4gICAgICAgICAgICBJdGVtLkZPR19MQU1QLFxuICAgICAgICAgICAgSXRlbS5MT1ZFX1BFTkRBTlQsXG4gICAgICAgICAgICBJdGVtLktJUklTQV9QTEFOVCxcbiAgICAgICAgICAgIEl0ZW0uSVZPUllfU1RBVFVFLFxuICAgICAgICAgIF07XG4gICAgICAgICAgY29uc3QgY29uZGl0aW9uID1cbiAgICAgICAgICAgICAgb3IoLi4uaXRlbXMubWFwKGkgPT4gYW5kKC4uLnJlcXVpcmVtZW50cywgaSwgLi4ucmVxcykpKTtcbiAgICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdCwgY29uZGl0aW9ufSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHN3aXRjaCAoaWQpIHtcbiAgICAgIGNhc2UgMHgxNTogLy8gc2xlZXBpbmcgd2luZG1pbGwgZ3VhcmQgPT4gd2luZG1pbGwga2V5IHNsb3RcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLldJTkRNSUxMX0tFWSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHgyMzogLy8gYXJ5bGxpcyA9PiBib3cgb2YgbW9vbiBzbG90XG4gICAgICAgIC8vIE5PVEU6IHNpdHRpbmcgb24gaW1wYXNzaWJsZSB0aHJvbmVcbiAgICAgICAgcmVzdWx0LmhpdGJveCA9IHt4MDogLTEsIHgxOiAyLCB5MDogLTEsIHkxOiAyfTtcbiAgICAgICAgdHJhZGVSKFNsb3QoSXRlbS5CT1dfT0ZfTU9PTiksIE1hZ2ljLkNIQU5HRSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDYzOiAvLyBodXJ0IGRvbHBoaW4gPT4gaGVhbGVkIGRvbHBoaW5cbiAgICAgICAgLy8gTk9URTogZG9scGhpbiBvbiB3YXRlciwgYnV0IGNhbiBoZWFsIGZyb20gbGFuZFxuICAgICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAtMSwgeDE6IDIsIHkwOiAtMSwgeTE6IDJ9O1xuICAgICAgICB0cmFkZShTbG90KEV2ZW50LkhFQUxFRF9ET0xQSElOKSk7XG4gICAgICAgIHRyYWRlKFNsb3QoSXRlbS5TSEVMTF9GTFVURSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg2NDogLy8gZmlzaGVybWFuXG4gICAgICAgIHRyYWRlUihTbG90KEV2ZW50LlJFVFVSTkVEX0ZPR19MQU1QKSxcbiAgICAgICAgICAgICAgIC4uLih0aGlzLmZsYWdzLnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCkgP1xuICAgICAgICAgICAgICAgICAgIFtFdmVudC5IRUFMRURfRE9MUEhJTl0gOiBbXSkpO1xuICAgICAgICAvLyBUT0RPIC0gdXNlIHRoaXMgYXMgcHJveHkgZm9yIGJvYXRcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NmI6IC8vIHNsZWVwaW5nIGtlbnN1XG4gICAgICAgIHRyYWRlKFNsb3QoSXRlbS5HTE9XSU5HX0xBTVApKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NzU6IC8vIHNsaW1lZCBrZW5zdSA9PiBmbGlnaHQgc2xvdFxuICAgICAgICB0cmFkZVIoU2xvdChNYWdpYy5GTElHSFQpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NzQ6IC8vIGtlbnN1IGluIGRhbmNlIGhhbGwgPT4gY2hhbmdlIHNsb3RcbiAgICAgICAgLy8gTk9URTogdGhpcyBpcyBub3JtYWxseSA3ZSBidXQgd2UgY2hhbmdlIGl0IHRvIDc0IGluIHRoaXMgb25lXG4gICAgICAgIC8vIGxvY2F0aW9uIHRvIGlkZW50aWZ5IGl0XG4gICAgICAgIHRyYWRlUihTbG90KE1hZ2ljLkNIQU5HRSksIE1hZ2ljLlBBUkFMWVNJUywgRXZlbnQuRk9VTkRfS0VOU1UpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg4MjogLy8gYWthaGFuYSA9PiBnYXMgbWFzayBzbG90IChjaGFuZ2VkIDE2IC0+IDgyKVxuICAgICAgICB0cmFkZVIoU2xvdChJdGVtLkdBU19NQVNLKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDg4OiAvLyBzdG9uZWQgYWthaGFuYSA9PiBzaGllbGQgcmluZyBzbG90XG4gICAgICAgIHRyYWRlKFNsb3QoSXRlbS5TSElFTERfUklORykpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOUENzIHRoYXQgbmVlZCBhIGxpdHRsZSBleHRyYSBjYXJlXG5cbiAgICBpZiAoaWQgPT09IDB4ODQpIHsgLy8gc3RhcnQgZmlnaHQgd2l0aCBzYWJlcmFcbiAgICAgIC8vIFRPRE8gLSBsb29rIHVwIHdobyB0aGUgYWN0dWFsIGJvc3MgaXMgb25jZSB3ZSBnZXQgYm9zcyBzaHVmZmxlISEhXG4gICAgICBjb25zdCBjb25kaXRpb24gPSB0aGlzLmJvc3NSZXF1aXJlbWVudHModGhpcy5yb20uYm9zc2VzLnNhYmVyYTEpO1xuICAgICAgcmV0dXJuIHtjaGVjazogW1xuICAgICAgICB7Y29uZGl0aW9uLCBzbG90OiBTbG90KEJvc3MuU0FCRVJBMSl9LFxuICAgICAgXX07XG4gICAgfSBlbHNlIGlmIChpZCA9PT0gMHgxZCkgeyAvLyBvYWsgZWxkZXIgaGFzIHNvbWUgd2VpcmQgdW50cmFja2VkIGNvbmRpdGlvbnMuXG4gICAgICBjb25zdCBzbG90ID0gU2xvdChJdGVtLlNXT1JEX09GX0ZJUkUpO1xuICAgICAgcmV0dXJuIHtjaGVjazogW1xuICAgICAgICAvLyB0d28gZGlmZmVyZW50IHdheXMgdG8gZ2V0IHRoZSBzd29yZCBvZiBmaXJlIGl0ZW1cbiAgICAgICAge2NvbmRpdGlvbjogYW5kKE1hZ2ljLlRFTEVQQVRIWSwgQm9zcy5JTlNFQ1QpLCBzbG90fSxcbiAgICAgICAge2NvbmRpdGlvbjogRXZlbnQuUkVTQ1VFRF9DSElMRCwgc2xvdH0sXG4gICAgICBdfTtcbiAgICB9IGVsc2UgaWYgKGlkID09PSAweDFmKSB7IC8vIGR3YXJmIGNoaWxkXG4gICAgICBjb25zdCBzcGF3bnMgPSB0aGlzLnJvbS5ucGNzW2lkXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KGxvYy5pZCk7XG4gICAgICBpZiAoc3Bhd25zICYmIHNwYXducy5pbmNsdWRlcygweDA0NSkpIHJldHVybiB7fTsgLy8gaW4gbW90aGVyJ3MgaG91c2VcbiAgICAgIHJldHVybiB7Y2hlY2s6IFtcbiAgICAgICAge2NvbmRpdGlvbjogRXZlbnQuRFdBUkZfTU9USEVSLCBzbG90OiBTbG90KEV2ZW50LkRXQVJGX0NISUxEKX0sXG4gICAgICBdfTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmdsb2JhbERpYWxvZ3MpIHtcbiAgICAgIGFkZFJlcSh+ZC5jb25kaXRpb24pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmxvY2FsRGlhbG9ncy5nZXQobG9jLmlkKSB8fCBucGMubG9jYWxEaWFsb2dzLmdldCgtMSkgfHwgW10pIHtcbiAgICAgIC8vIElmIHRoZSBjaGVjayBjb25kaXRpb24gaXMgb3Bwb3NpdGUgdG8gdGhlIHNwYXduIGNvbmRpdGlvbiwgdGhlbiBza2lwLlxuICAgICAgLy8gVGhpcyBlbnN1cmVzIHdlIGRvbid0IGV4cGVjdCB0aGUgcXVlZW4gdG8gZ2l2ZSByZWNvdmVyIGluIHRoZSB0aHJvbmUgcm9vbS5cbiAgICAgIGlmIChzcGF3bkNvbmRpdGlvbnMuaW5jbHVkZXMofmQuY29uZGl0aW9uKSkgY29udGludWU7XG4gICAgICAvLyBBcHBseSB0aGUgRkxBR19NQVAuXG4gICAgICBjb25zdCBtYXBwZWQgPSBGTEFHX01BUC5nZXQoZC5jb25kaXRpb24pO1xuICAgICAgY29uc3QgcG9zaXRpdmUgPVxuICAgICAgICAgIG1hcHBlZCA/IFttYXBwZWRdIDpcbiAgICAgICAgICB0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGQuY29uZGl0aW9uKSA/IFtDb25kaXRpb24oZC5jb25kaXRpb24pXSA6XG4gICAgICAgICAgW107XG4gICAgICBjb25zdCBjb25kaXRpb24gPSBhbmQoLi4ucG9zaXRpdmUsIC4uLnJlcXVpcmVtZW50cyk7XG4gICAgICAvLyBJZiB0aGUgY29uZGl0aW9uIGlzIGEgbmVnYXRpdmUgdGhlbiBhbnkgZnV0dXJlIGNvbmRpdGlvbnMgbXVzdCBpbmNsdWRlXG4gICAgICAvLyBpdCBhcyBhIHBvc2l0aXZlIHJlcXVpcmVtZW50LlxuICAgICAgY29uc3QgbmVnYXRpdmUgPVxuICAgICAgICAgIEZMQUdfTUFQLmdldCh+ZC5jb25kaXRpb24pIHx8XG4gICAgICAgICAgKHRoaXMucmVsZXZhbnRGbGFncy5oYXMofmQuY29uZGl0aW9uKSA/IENvbmRpdGlvbih+ZC5jb25kaXRpb24pIDogbnVsbCk7XG4gICAgICBpZiAobmVnYXRpdmUgIT0gbnVsbCkgcmVxdWlyZW1lbnRzLnB1c2gobmVnYXRpdmUpO1xuICAgICAgY29uc3QgYWN0aW9uID0gZC5tZXNzYWdlLmFjdGlvbjtcbiAgICAgIGlmIChhY3Rpb24gPT09IDB4MDMpIHtcbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QuaXRlbShucGMuZGF0YVswXSksIGNvbmRpdGlvbn0pO1xuICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IDB4MTEgfHwgYWN0aW9uID09PSAweDA5KSB7XG4gICAgICAgIC8vIE5PVEU6ICQwOSBpcyB6ZWJ1IHN0dWRlbnQsIHdoaWNoIHdlJ3ZlIHBhdGNoZWQgdG8gZ2l2ZSB0aGUgaXRlbS5cbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QuaXRlbShucGMuZGF0YVsxXSksIGNvbmRpdGlvbn0pO1xuICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IDB4MTApIHtcbiAgICAgICAgLy8gTk9URTogUXVlZW4gY2FuJ3QgYmUgcmV2ZWFsZWQgYXMgYXNpbmEgaW4gdGhlIHRocm9uZSByb29tLiAgSW4gcGFydGljdWxhcixcbiAgICAgICAgLy8gdGhpcyBlbnN1cmVzIHRoYXQgdGhlIGJhY2sgcm9vbSBpcyByZWFjaGFibGUgYmVmb3JlIHJlcXVpcmluZyB0aGUgZG9scGhpblxuICAgICAgICAvLyB0byBhcHBlYXIuICBUaGlzIHNob3VsZCBiZSBoYW5kbGVkIGJ5IHRoZSBhYm92ZSBjaGVjayBmb3IgdGhlIGRpYWxvZyBhbmRcbiAgICAgICAgLy8gc3Bhd24gY29uZGl0aW9ucyB0byBiZSBjb21wYXRpYmxlLlxuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdChNYWdpYy5SRUNPVkVSKSwgY29uZGl0aW9ufSk7XG4gICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gMHgwOCAmJiBpZCA9PT0gMHgyZCkge1xuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdChFdmVudC5PUEVORURfU1dBTiksIGNvbmRpdGlvbn0pO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBmbGFnIG9mIGQuZmxhZ3MpIHtcbiAgICAgICAgY29uc3QgbWZsYWcgPSBGTEFHX01BUC5nZXQoZmxhZyk7XG4gICAgICAgIGNvbnN0IHBmbGFnID0gbWZsYWcgPyBtZmxhZyA6IHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZmxhZykgPyBDb25kaXRpb24oZmxhZykgOiBudWxsO1xuICAgICAgICBpZiAocGZsYWcpIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90KHBmbGFnKSwgY29uZGl0aW9ufSk7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGUgc3Bhd24gKnJlcXVpcmVzKiB0aGlzIGNvbmRpdGlvbiB0aGVuIGRvbid0IGV2YWx1YXRlIGFueSBtb3JlLiAgVGhpc1xuICAgICAgLy8gZW5zdXJlcyB3ZSBkb24ndCBleHBlY3QgdGhlIHF1ZWVuIHRvIGdpdmUgdGhlIGZsdXRlIG9mIGxpbWUgaW4gdGhlIGJhY2sgcm9vbSxcbiAgICAgIC8vIHNpbmNlIHNoZSB3b3VsZG4ndCBoYXZlIHNwYXduZWQgdGhlcmUgaW50aW1lIHRvIGdpdmUgaXQuXG4gICAgICBpZiAocG9zaXRpdmUubGVuZ3RoICYmIHNwYXduQ29uZGl0aW9ucy5pbmNsdWRlcyhkLmNvbmRpdGlvbikpIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgY2FwYWJpbGl0aWVzKCk6IENhcGFiaWxpdHlEYXRhW10ge1xuICAgIGxldCBicmVha1N0b25lOiBSZXF1aXJlbWVudCA9IEl0ZW0uU1dPUkRfT0ZfV0lORDtcbiAgICBsZXQgYnJlYWtJY2U6IFJlcXVpcmVtZW50ID0gSXRlbS5TV09SRF9PRl9GSVJFO1xuICAgIGxldCBmb3JtQnJpZGdlOiBSZXF1aXJlbWVudCA9IEl0ZW0uU1dPUkRfT0ZfV0FURVI7XG4gICAgbGV0IGJyZWFrSXJvbjogUmVxdWlyZW1lbnQgPSBJdGVtLlNXT1JEX09GX1RIVU5ERVI7XG4gICAgaWYgKCF0aGlzLmZsYWdzLm9yYnNPcHRpb25hbCgpKSB7XG4gICAgICAvLyBBZGQgb3JiIHJlcXVpcmVtZW50XG4gICAgICBicmVha1N0b25lID0gb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfV0lORCwgSXRlbS5PUkJfT0ZfV0lORCksXG4gICAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfV0lORCwgSXRlbS5UT1JOQURPX0JSQUNFTEVUKSk7XG4gICAgICBicmVha0ljZSA9IG9yKGFuZChJdGVtLlNXT1JEX09GX0ZJUkUsIEl0ZW0uT1JCX09GX0ZJUkUpLFxuICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9GSVJFLCBJdGVtLkZMQU1FX0JSQUNFTEVUKSk7XG4gICAgICBmb3JtQnJpZGdlID0gb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfV0FURVIsIEl0ZW0uT1JCX09GX1dBVEVSKSxcbiAgICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5CTElaWkFSRF9CUkFDRUxFVCkpO1xuICAgICAgYnJlYWtJcm9uID0gb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUiwgSXRlbS5PUkJfT0ZfVEhVTkRFUiksXG4gICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBJdGVtLlNUT1JNX0JSQUNFTEVUKSk7XG4gICAgICBpZiAodGhpcy5mbGFncy5hc3N1bWVTd29yZENoYXJnZUdsaXRjaCgpKSB7XG4gICAgICAgIGNvbnN0IGxldmVsMiA9IG9yKGJyZWFrU3RvbmUsIGJyZWFrSWNlLCBmb3JtQnJpZGdlLCBicmVha0lyb24pO1xuICAgICAgICBmdW5jdGlvbiBuZWVkKHN3b3JkOiByZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dKTogUmVxdWlyZW1lbnQge1xuICAgICAgICAgIGNvbnN0IGNvbmRpdGlvbjogQ29uZGl0aW9uID0gc3dvcmRbMF1bMF07XG4gICAgICAgICAgcmV0dXJuIGxldmVsMi5tYXAoYyA9PiBjWzBdID09PSBjb25kaXRpb24gPyBjIDogW2NvbmRpdGlvbiwgLi4uY10pO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrU3RvbmUgPSBuZWVkKEl0ZW0uU1dPUkRfT0ZfV0lORCk7XG4gICAgICAgIGJyZWFrSWNlID0gbmVlZChJdGVtLlNXT1JEX09GX0ZJUkUpO1xuICAgICAgICBmb3JtQnJpZGdlID0gbmVlZChJdGVtLlNXT1JEX09GX1dBVEVSKTtcbiAgICAgICAgYnJlYWtJcm9uID0gbmVlZChJdGVtLlNXT1JEX09GX1RIVU5ERVIpO1xuICAgICAgfVxuICAgIH1cbiAgICB0eXBlIENhcGFiaWxpdHlMaXN0ID0gQXJyYXk8W3JlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV0sIC4uLlJlcXVpcmVtZW50W11dPjtcbiAgICBjb25zdCBjYXBhYmlsaXRpZXM6IENhcGFiaWxpdHlMaXN0ID0gW1xuICAgICAgW0V2ZW50LkFMV0FZU19UUlVFLCBhbmQoKV0sXG4gICAgICBbQ2FwYWJpbGl0eS5TV09SRCxcbiAgICAgICBJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uU1dPUkRfT0ZfRklSRSxcbiAgICAgICBJdGVtLlNXT1JEX09GX1dBVEVSLCBJdGVtLlNXT1JEX09GX1RIVU5ERVJdLFxuICAgICAgW0NhcGFiaWxpdHkuQlJFQUtfU1RPTkUsIGJyZWFrU3RvbmVdLFxuICAgICAgW0NhcGFiaWxpdHkuQlJFQUtfSUNFLCBicmVha0ljZV0sXG4gICAgICBbQ2FwYWJpbGl0eS5GT1JNX0JSSURHRSwgZm9ybUJyaWRnZV0sXG4gICAgICBbQ2FwYWJpbGl0eS5CUkVBS19JUk9OLCBicmVha0lyb25dLFxuICAgICAgW0NhcGFiaWxpdHkuTU9ORVksIENhcGFiaWxpdHkuU1dPUkRdLCAvLyBUT0RPIC0gY2xlYXIgdGhpcyB1cFxuICAgICAgW0NhcGFiaWxpdHkuQ0xJTUJfV0FURVJGQUxMLCBNYWdpYy5GTElHSFRdLFxuICAgICAgW0NhcGFiaWxpdHkuU0hPT1RJTkdfU1RBVFVFLCBNYWdpYy5CQVJSSUVSXSwgLy8gVE9ETyAtIGFsbG93IHNoaWVsZCByaW5nP1xuICAgICAgW0NhcGFiaWxpdHkuQ0xJTUJfU0xPUEUsIEl0ZW0uUkFCQklUX0JPT1RTLCBNYWdpYy5GTElHSFRdLFxuICAgICAgW0V2ZW50LkdFTkVSQUxTX0RFRkVBVEVELCBJdGVtLklWT1JZX1NUQVRVRV0sIC8vIFRPRE8gLSBmaXggdGhpc1xuICAgICAgW0V2ZW50Lk9QRU5FRF9TRUFMRURfQ0FWRSwgRXZlbnQuU1RBUlRFRF9XSU5ETUlMTF0sIC8vIFRPRE8gLSBtZXJnZSBjb21wbGV0ZWx5P1xuICAgIF07XG5cbiAgICBpZiAodGhpcy5mbGFncy5hc3N1bWVHaGV0dG9GbGlnaHQoKSkge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuQ0xJTUJfV0FURVJGQUxMLCBhbmQoRXZlbnQuUklERV9ET0xQSElOLCBJdGVtLlJBQkJJVF9CT09UUyldKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZmxhZ3MuZ3VhcmFudGVlQmFycmllcigpKSB7XG4gICAgICAvLyBUT0RPIC0gc3dvcmQgY2hhcmdlIGdsaXRjaCBtaWdodCBiZSBhIHByb2JsZW0gd2l0aCB0aGUgaGVhbGluZyBvcHRpb24uLi5cbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LlNIT09USU5HX1NUQVRVRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgQ2FwYWJpbGl0eS5CVVlfSEVBTElORyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIEl0ZW0uU0hJRUxEX1JJTkcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBNYWdpYy5SRUZSRVNIKV0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmZsYWdzLmxlYXRoZXJCb290c0dpdmVTcGVlZCgpKSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5DTElNQl9TTE9QRSwgSXRlbS5MRUFUSEVSX0JPT1RTXSk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBib3NzIG9mIHRoaXMucm9tLmJvc3Nlcykge1xuICAgICAgaWYgKGJvc3Mua2lsbCAhPSBudWxsICYmIGJvc3MuZHJvcCAhPSBudWxsKSB7XG4gICAgICAgIC8vIFNhdmVzIHJlZHVuZGFuY3kgb2YgcHV0dGluZyB0aGUgaXRlbSBpbiB0aGUgYWN0dWFsIHJvb20uXG4gICAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtJdGVtKGJvc3MuZHJvcCksIEJvc3MoYm9zcy5raWxsKV0pO1xuICAgICAgfVxuICAgIH1cbiAgICBjYXBhYmlsaXRpZXMucHVzaChbSXRlbS5PUkJfT0ZfV0FURVIsIEJvc3MuUkFHRV0pO1xuXG4gICAgaWYgKHRoaXMuZmxhZ3MuZ3VhcmFudGVlR2FzTWFzaygpKSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5UUkFWRUxfU1dBTVAsIEl0ZW0uR0FTX01BU0tdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuVFJBVkVMX1NXQU1QLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICBvcihJdGVtLkdBU19NQVNLLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBJdGVtLk1FRElDQUxfSEVSQiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIE1hZ2ljLlJFRlJFU0gpKV0pO1xuICAgIH1cblxuICAgIC8vIGlmICh0aGlzLmZsYWdzLmFzc3VtZVN0YXR1ZUdsaXRjaCgpKSB7XG4gICAgLy8gICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5TVEFUVUVfR0xJVENILCBbW11dXSk7XG4gICAgLy8gfVxuXG4gICAgcmV0dXJuIGNhcGFiaWxpdGllcy5tYXAoKFtjYXBhYmlsaXR5LCAuLi5kZXBzXSkgPT4gKHtjYXBhYmlsaXR5LCBjb25kaXRpb246IG9yKC4uLmRlcHMpfSkpO1xuICB9XG5cbiAgd2FsbENhcGFiaWxpdHkodHlwZTogV2FsbFR5cGUpOiB7ZmxhZzogbnVtYmVyfSB7XG4gICAgcmV0dXJuIHtmbGFnOiBbQ2FwYWJpbGl0eS5CUkVBS19TVE9ORSwgQ2FwYWJpbGl0eS5CUkVBS19JQ0UsXG4gICAgICAgICAgICAgICAgICAgQ2FwYWJpbGl0eS5GT1JNX0JSSURHRSwgQ2FwYWJpbGl0eS5CUkVBS19JUk9OXVt0eXBlXVswXVswXX07XG4gIH1cbn1cblxudHlwZSBUaWxlQ2hlY2sgPSBDaGVjayAmIHt0aWxlOiBUaWxlSWR9O1xuXG4vLyBUT0RPIC0gbWF5YmUgcHVsbCB0cmlnZ2VycyBhbmQgbnBjcywgZXRjLCBiYWNrIHRvZ2V0aGVyP1xuLy8gICAgICAtIG9yIG1ha2UgdGhlIGxvY2F0aW9uIG92ZXJsYXkgYSBzaW5nbGUgZnVuY3Rpb24/XG4vLyAgICAgICAgLT4gbmVlZHMgY2xvc2VkLW92ZXIgc3RhdGUgdG8gc2hhcmUgaW5zdGFuY2VzLi4uXG5cbmludGVyZmFjZSBFeHRyYVJvdXRlIHtcbiAgdGlsZTogVGlsZUlkO1xuICBjb25kaXRpb24/OiBSZXF1aXJlbWVudDtcbn1cbmludGVyZmFjZSBFeHRyYUVkZ2Uge1xuICBmcm9tOiBUaWxlSWQ7XG4gIHRvOiBUaWxlSWQ7XG4gIGNvbmRpdGlvbj86IFJlcXVpcmVtZW50O1xufVxuXG5pbnRlcmZhY2UgVHJpZ2dlckRhdGEge1xuICB0ZXJyYWluPzogVGVycmFpbjtcbiAgY2hlY2s/OiBDaGVja1tdO1xuICAvLyBhbGxvd3Mgbm90IGFzc3VtaW5nIHRlbGVwb3J0IHNraXBcbiAgZXh0cmFMb2NhdGlvbnM/OiBMb2NhdGlvbltdO1xuICAvLyBhbGxvd3Mgbm90IGFzc3VtaW5nIHJhYmJpdCBza2lwXG4gIGR4PzogbnVtYmVyW107XG59XG5cbmludGVyZmFjZSBOcGNEYXRhIHtcbiAgaGl0Ym94PzogSGl0Ym94O1xuICB0ZXJyYWluPzogVGVycmFpbjtcbiAgY2hlY2s/OiBDaGVja1tdO1xufVxuXG5pbnRlcmZhY2UgSGl0Ym94IHtcbiAgeDA6IG51bWJlcjtcbiAgeTA6IG51bWJlcjtcbiAgeDE6IG51bWJlcjtcbiAgeTE6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIENhcGFiaWxpdHlEYXRhIHtcbiAgY29uZGl0aW9uPzogUmVxdWlyZW1lbnQ7XG4gIGNhcGFiaWxpdHk6IHJlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV07XG59XG5cbi8vIFN0YXRpYyBtYXAgb2YgdGVycmFpbnMuXG5jb25zdCBURVJSQUlOUzogQXJyYXk8VGVycmFpbiB8IHVuZGVmaW5lZD4gPSAoKCkgPT4ge1xuICBjb25zdCBvdXQgPSBbXTtcbiAgZm9yIChsZXQgZWZmZWN0cyA9IDA7IGVmZmVjdHMgPCAxMjg7IGVmZmVjdHMrKykge1xuICAgIG91dFtlZmZlY3RzXSA9IHRlcnJhaW4oZWZmZWN0cyk7XG4gIH1cbiAgLy8gY29uc29sZS5sb2coJ1RFUlJBSU5TJywgb3V0KTtcbiAgcmV0dXJuIG91dDtcblxuICAvKipcbiAgICogQHBhcmFtIGVmZmVjdHMgVGhlICQyNiBiaXRzIG9mIHRpbGVlZmZlY3RzLCBwbHVzICQwOCBmb3Igc3dhbXAsICQxMCBmb3IgZG9scGhpbixcbiAgICogJDAxIGZvciBzaG9vdGluZyBzdGF0dWVzLCAkNDAgZm9yIHNob3J0IHNsb3BlXG4gICAqIEByZXR1cm4gdW5kZWZpbmVkIGlmIHRoZSB0ZXJyYWluIGlzIGltcGFzc2FibGUuXG4gICAqL1xuICBmdW5jdGlvbiB0ZXJyYWluKGVmZmVjdHM6IG51bWJlcik6IFRlcnJhaW4gfCB1bmRlZmluZWQge1xuICAgIGlmIChlZmZlY3RzICYgMHgwNCkgcmV0dXJuIHVuZGVmaW5lZDsgLy8gaW1wYXNzaWJsZVxuICAgIGNvbnN0IHRlcnJhaW46IFRlcnJhaW4gPSB7fTtcbiAgICBpZiAoKGVmZmVjdHMgJiAweDEyKSA9PT0gMHgxMikgeyAvLyBkb2xwaGluIG9yIGZseVxuICAgICAgaWYgKGVmZmVjdHMgJiAweDIwKSB0ZXJyYWluLmV4aXQgPSBDYXBhYmlsaXR5LkNMSU1CX1dBVEVSRkFMTDtcbiAgICAgIHRlcnJhaW4uZW50ZXIgPSBvcihFdmVudC5SSURFX0RPTFBISU4sIE1hZ2ljLkZMSUdIVCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChlZmZlY3RzICYgMHg0MCkgeyAvLyBzaG9ydCBzbG9wZVxuICAgICAgICB0ZXJyYWluLmV4aXQgPSBDYXBhYmlsaXR5LkNMSU1CX1NMT1BFO1xuICAgICAgfSBlbHNlIGlmIChlZmZlY3RzICYgMHgyMCkgeyAvLyBzbG9wZVxuICAgICAgICB0ZXJyYWluLmV4aXQgPSBNYWdpYy5GTElHSFQ7XG4gICAgICB9XG4gICAgICBpZiAoZWZmZWN0cyAmIDB4MDIpIHRlcnJhaW4uZW50ZXIgPSBNYWdpYy5GTElHSFQ7IC8vIG5vLXdhbGtcbiAgICB9XG4gICAgaWYgKGVmZmVjdHMgJiAweDA4KSB7IC8vIHN3YW1wXG4gICAgICB0ZXJyYWluLmVudGVyID0gKHRlcnJhaW4uZW50ZXIgfHwgW1tdXSkubWFwKGNzID0+IENhcGFiaWxpdHkuVFJBVkVMX1NXQU1QWzBdLmNvbmNhdChjcykpO1xuICAgIH1cbiAgICBpZiAoZWZmZWN0cyAmIDB4MDEpIHsgLy8gc2hvb3Rpbmcgc3RhdHVlc1xuICAgICAgdGVycmFpbi5lbnRlciA9ICh0ZXJyYWluLmVudGVyIHx8IFtbXV0pLm1hcChjcyA9PiBDYXBhYmlsaXR5LlNIT09USU5HX1NUQVRVRVswXS5jb25jYXQoY3MpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRlcnJhaW47XG4gIH1cbn0pKCk7XG5cbi8vIFRPRE8gLSBmaWd1cmUgb3V0IHdoYXQgdGhpcyBsb29rcyBsaWtlLi4uP1xuLy8gIC0gbWF5YmUgd2UganVzdCB3YW50IHRvIG1ha2UgYSBwc2V1ZG8gREVGRUFURURfSU5TRUNUIGV2ZW50LCBidXQgdGhpcyB3b3VsZCBuZWVkIHRvIGJlXG4vLyAgICBzZXBhcmF0ZSBmcm9tIDEwMSwgc2luY2UgdGhhdCdzIGF0dGFjaGVkIHRvIHRoZSBpdGVtZ2V0LCB3aGljaCB3aWxsIG1vdmUgd2l0aCB0aGUgc2xvdCFcbi8vICAtIHByb2JhYmx5IHdhbnQgYSBmbGFnIGZvciBlYWNoIGJvc3MgZGVmZWF0ZWQuLi4/XG4vLyAgICBjb3VsZCB1c2UgYm9zc2tpbGwgSUQgZm9yIGl0P1xuLy8gICAgLSB0aGVuIG1ha2UgdGhlIGRyb3AgYSBzaW1wbGUgZGVyaXZhdGl2ZSBmcm9tIHRoYXQuLi5cbi8vICAgIC0gdXBzaG90IC0gbm8gbG9uZ2VyIG5lZWQgdG8gbWl4IGl0IGludG8gbnBjKCkgb3IgdHJpZ2dlcigpIG92ZXJsYXksIGluc3RlYWQgbW92ZSBpdFxuLy8gICAgICB0byBjYXBhYmlsaXR5IG92ZXJsYXkuXG4vLyBmdW5jdGlvbiBzbG90Rm9yPFQ+KGl0ZW06IFQpOiBUIHsgcmV0dXJuIGl0ZW07IH1cbiJdfQ==