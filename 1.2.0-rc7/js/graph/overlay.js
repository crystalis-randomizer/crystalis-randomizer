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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9ncmFwaC9vdmVybGF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFTLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFDN0QsSUFBSSxFQUFxQixHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQUUsUUFBUSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBSy9DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFhbkMsTUFBTSxjQUFjLEdBQUc7SUFDckIsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFFTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFHTCxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLO0lBRTFCLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLO0lBQ3RE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QUFDLE1BQU0sQ0FBQzthQUM3QjtZQUNELElBQUksT0FBTyxHQUFHLElBQUk7Z0JBQUUsT0FBTyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1NBQ2xEO1FBQ0QsSUFBSSxPQUFPLEdBQUcsSUFBSSxFQUFFO1lBQ2xCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzFGO1FBQ0QsSUFBSSxPQUFPLEdBQUcsSUFBSSxFQUFFO1lBQ2xCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzdGO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztBQUNILENBQUMsQ0FBQyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0Jvc3MsIENhcGFiaWxpdHksIENoZWNrLCBDb25kaXRpb24sIEV2ZW50LCBJdGVtLCBNYWdpYywgTXV0YWJsZVJlcXVpcmVtZW50LFxuICAgICAgICBSZXF1aXJlbWVudCwgU2xvdCwgVGVycmFpbiwgV2FsbFR5cGUsIGFuZCwgbWVldCwgb3J9IGZyb20gJy4vY29uZGl0aW9uLmpzJztcbmltcG9ydCB7VGlsZUlkLCBTY3JlZW5JZH0gZnJvbSAnLi9nZW9tZXRyeS5qcyc7XG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4uL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge0Jvc3MgYXMgUm9tQm9zc30gZnJvbSAnLi4vcm9tL2Jvc3Nlcy5qcyc7XG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICcuLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtTaG9wVHlwZX0gZnJvbSAnLi4vcm9tL3Nob3AuanMnO1xuaW1wb3J0IHtoZXh9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcblxuLy8gQWRkaXRpb25hbCBpbmZvcm1hdGlvbiBuZWVkZWQgdG8gaW50ZXJwcmV0IHRoZSB3b3JsZCBncmFwaCBkYXRhLlxuLy8gVGhpcyBnZXRzIGludG8gbW9yZSBzcGVjaWZpY3MgYW5kIGhhcmRjb2RpbmcuXG5cbi8vIFRPRE8gLSBtYXliZSBjb25zaWRlciBoYXZpbmcgYSBzZXQgb2YgQVNTVU1FRCBhbmQgYSBzZXQgb2YgSUdOT1JFRCBmbGFncz9cbi8vICAgICAgLSBlLmcuIGFsd2F5cyBhc3N1bWUgMDBmIGlzIEZBTFNFIHJhdGhlciB0aGFuIFRSVUUsIHRvIGF2b2lkIGZyZWUgd2luZG1pbGwga2V5XG5cblxuLy8gVE9ETyAtIHByaXNvbiBrZXkgbWlzc2luZyBmcm9tIHBhcmFseXNpcyBkZXBzIChvciByYXRoZXIgYSBub24tZmxpZ2h0IHZlcnNpb24pIVxuXG5cblxuY29uc3QgUkVMRVZBTlRfRkxBR1MgPSBbXG4gIDB4MDBhLCAvLyB1c2VkIHdpbmRtaWxsIGtleVxuICAweDAwYiwgLy8gdGFsa2VkIHRvIGxlYWYgZWxkZXJcbiAgMHgwMTgsIC8vIGVudGVyZWQgdW5kZXJncm91bmQgY2hhbm5lbFxuICAweDAxYiwgLy8gbWVzaWEgcmVjb3JkaW5nIHBsYXllZFxuICAweDAxZSwgLy8gcXVlZW4gcmV2ZWFsZWRcbiAgMHgwMjEsIC8vIHJldHVybmVkIGZvZyBsYW1wXG4gIDB4MDI0LCAvLyBnZW5lcmFscyBkZWZlYXRlZCAoZ290IGl2b3J5IHN0YXR1ZSlcbiAgMHgwMjUsIC8vIGhlYWxlZCBkb2xwaGluXG4gIDB4MDI2LCAvLyBlbnRlcmVkIHNoeXJvbiAoZm9yIGdvYSBndWFyZHMpXG4gIDB4MDI3LCAvLyBzaHlyb24gbWFzc2FjcmVcbiAgLy8gMHgzNSwgLy8gY3VyZWQgYWthaGFuYVxuICAweDAzOCwgLy8gbGVhZiBhYmR1Y3Rpb25cbiAgMHgwM2EsIC8vIHRhbGtlZCB0byB6ZWJ1IGluIGNhdmUgKGFkZGVkIGFzIHJlcSBmb3IgYWJkdWN0aW9uKVxuICAweDAzYiwgLy8gdGFsa2VkIHRvIHplYnUgaW4gc2h5cm9uIChhZGRlZCBhcyByZXEgZm9yIG1hc3NhY3JlKVxuICAweDA0NSwgLy8gcmVzY3VlZCBjaGlsZFxuICAweDA1MiwgLy8gdGFsa2VkIHRvIGR3YXJmIG1vdGhlclxuICAweDA1MywgLy8gY2hpbGQgZm9sbG93aW5nXG4gIDB4MDYxLCAvLyB0YWxrZWQgdG8gc3RvbSBpbiBzd2FuIGh1dFxuICAvLyAweDA2YywgLy8gZGVmZWF0ZWQgZHJheWdvbiAxXG4gIDB4MDcyLCAvLyBrZW5zdSBmb3VuZCBpbiB0YXZlcm5cbiAgMHgwOGIsIC8vIGdvdCBzaGVsbCBmbHV0ZVxuICAweDA5YiwgLy8gYWJsZSB0byByaWRlIGRvbHBoaW5cbiAgMHgwYTUsIC8vIHRhbGtlZCB0byB6ZWJ1IHN0dWRlbnRcbiAgMHgwYTksIC8vIHRhbGtlZCB0byBsZWFmIHJhYmJpdFxuICAweDEwMCwgLy8ga2lsbGVkIHZhbXBpcmUgMVxuICAweDEwMSwgLy8ga2lsbGVkIGluc2VjdFxuICAweDEwMiwgLy8ga2lsbGVkIGtlbGJlc3F1ZSAxXG4gIDB4MTAzLCAvLyByYWdlXG4gIDB4MTA0LCAvLyBraWxsZWQgc2FiZXJhIDFcbiAgMHgxMDUsIC8vIGtpbGxlZCBtYWRvIDFcbiAgMHgxMDYsIC8vIGtpbGxlZCBrZWxiZXNxdWUgMlxuICAweDEwNywgLy8ga2lsbGVkIHNhYmVyYSAyXG4gIDB4MTA4LCAvLyBraWxsZWQgbWFkbyAyXG4gIDB4MTA5LCAvLyBraWxsZWQga2FybWluZVxuICAweDEwYSwgLy8ga2lsbGVkIGRyYXlnb24gMVxuICAweDEwYiwgLy8ga2lsbGVkIGRyYXlnb24gMlxuICAweDEwYywgLy8ga2lsbGVkIHZhbXBpcmUgMlxuXG4gIC8vIHN3b3JkcyAobWF5IGJlIG5lZWRlZCBmb3IgcmFnZSwgU29UIGZvciBtYXNzYWNyZSlcbiAgMHgyMDAsIDB4MjAxLCAweDIwMiwgMHgyMDMsXG4gIC8vIGJhbGxzIGFuZCBicmFjZWxldHMgbWF5IGJlIG5lZWRlZCBmb3IgdGVsZXBvcnRcbiAgMHgyMDUsIDB4MjA2LCAweDIwNywgMHgyMDgsIDB4MjA5LCAweDIwYSwgMHgyMGIsIDB4MjBjLFxuICAweDIzNiwgLy8gc2hlbGwgZmx1dGUgKGZvciBmaXNoZXJtYW4gc3Bhd24pXG4gIDB4MjQzLCAvLyB0ZWxlcGF0aHkgKGZvciByYWJiaXQsIG9haywgZGVvKVxuICAweDI0NCwgLy8gdGVsZXBvcnQgKGZvciBtdCBzYWJyZSB0cmlnZ2VyKVxuICAweDI4MywgLy8gY2FsbWVkIHNlYSAoZm9yIGJhcnJpZXIpXG4gIDB4MmVlLCAvLyBzdGFydGVkIHdpbmRtaWxsIChmb3IgcmVmcmVzaClcblxuICAweDJmNywgLy8gd2FycDpvYWsgKGZvciB0ZWxlcGF0aHkpXG4gIDB4MmZiLCAvLyB3YXJwOmpvZWwgKGZvciBldmlsIHNwaXJpdCBpc2xhbmQpXG5cbiAgLy8gTWFnaWMuQ0hBTkdFWzBdWzBdLFxuICAvLyBNYWdpYy5URUxFUEFUSFlbMF1bMF0sXG5dO1xuXG4vLyBUT0RPIC0gdGhpcyBpcyBub3QgcGVydmFzaXZlIGVub3VnaCEhIVxuLy8gIC0gbmVlZCBhIHdheSB0byBwdXQgaXQgZXZlcnl3aGVyZVxuLy8gICAgLT4gbWF5YmUgaW4gTXV0YWJsZVJlcXVpcmVtZW50cz9cbmNvbnN0IEZMQUdfTUFQOiBNYXA8bnVtYmVyLCByZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dPiA9IG5ldyBNYXAoW1xuICBbMHgwMGEsIEV2ZW50LlNUQVJURURfV0lORE1JTExdLCAvLyB0aGlzIGlzIHJlZidkIG91dHNpZGUgdGhpcyBmaWxlIVxuICAvL1sweDAwZSwgTWFnaWMuVEVMRVBBVEhZXSxcbiAgLy9bMHgwM2YsIE1hZ2ljLlRFTEVQT1JUXSxcbiAgWzB4MDEzLCBCb3NzLlNBQkVSQTFdLFxuICAvLyBRdWVlbiB3aWxsIGdpdmUgZmx1dGUgb2YgbGltZSB3L28gcGFyYWx5c2lzIGluIHRoaXMgY2FzZS5cbiAgWzB4MDE3LCBJdGVtLlNXT1JEX09GX1dBVEVSXSxcbiAgWzB4MDI4LCBNYWdpYy5DSEFOR0VdLFxuICBbMHgwMjksIE1hZ2ljLkNIQU5HRV0sXG4gIFsweDAyYSwgTWFnaWMuQ0hBTkdFXSxcbiAgWzB4MDJiLCBNYWdpYy5DSEFOR0VdLFxuICBbMHgwNmMsIEJvc3MuRFJBWUdPTjFdLFxuICBbMHgwOGIsIEl0ZW0uU0hFTExfRkxVVEVdLFxuXSk7XG5cbi8vIE1hcHMgdHJpZ2dlciBhY3Rpb25zIHRvIHRoZSBzbG90IHRoZXkgZ3JhbnQuXG5jb25zdCBUUklHR0VSX0FDVElPTl9JVEVNUzoge1thY3Rpb246IG51bWJlcl06IFNsb3R9ID0ge1xuICAweDA4OiBTbG90KE1hZ2ljLlBBUkFMWVNJUyksXG4gIDB4MGI6IFNsb3QoTWFnaWMuQkFSUklFUiksXG4gIDB4MGY6IFNsb3QoTWFnaWMuUkVGUkVTSCksXG4gIDB4MTg6IFNsb3QoTWFnaWMuVEVMRVBBVEhZKSxcbn07XG5cbmNvbnN0IFNXT1JEUyA9IFtJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uU1dPUkRfT0ZfRklSRSxcbiAgICAgICAgICAgICAgICBJdGVtLlNXT1JEX09GX1dBVEVSLCBJdGVtLlNXT1JEX09GX1RIVU5ERVJdIGFzIGNvbnN0O1xuY29uc3QgU1dPUkRfUE9XRVJTID0gW1xuICBbSXRlbS5PUkJfT0ZfV0lORCwgSXRlbS5UT1JOQURPX0JSQUNFTEVUXSxcbiAgW0l0ZW0uT1JCX09GX0ZJUkUsIEl0ZW0uRkxBTUVfQlJBQ0VMRVRdLFxuICBbSXRlbS5PUkJfT0ZfV0FURVIsIEl0ZW0uQkxJWlpBUkRfQlJBQ0VMRVRdLFxuICBbSXRlbS5PUkJfT0ZfVEhVTkRFUiwgSXRlbS5TVE9STV9CUkFDRUxFVF0sXG5dIGFzIGNvbnN0O1xuXG5mdW5jdGlvbiBzd29yZFJlcXVpcmVtZW50KHN3b3JkOiBudW1iZXIsIGxldmVsOiBudW1iZXIpOiBSZXF1aXJlbWVudCB7XG4gIGxldCByO1xuICBpZiAobGV2ZWwgPT09IDEpIHI9IFNXT1JEU1tzd29yZF07XG4gIGVsc2UgaWYgKGxldmVsID09PSAzKSByPSBhbmQoU1dPUkRTW3N3b3JkXSwgLi4uU1dPUkRfUE9XRVJTW3N3b3JkXSk7XG4gIGVsc2Ugcj0gb3IoLi4uU1dPUkRfUE9XRVJTW3N3b3JkXS5tYXAocCA9PiBhbmQoU1dPUkRTW3N3b3JkXSwgcCkpKTtcbiAgaWYgKEFycmF5LmlzQXJyYXkoclswXVswXSkpIHRocm93IG5ldyBFcnJvcigpO1xuICByZXR1cm4gcjtcbn1cblxuZXhwb3J0IGNsYXNzIE92ZXJsYXkge1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgcmVsZXZhbnRGbGFncyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAvLyBucGMgaWQgLT4gd2FudGVkIGl0ZW1cbiAgcHJpdmF0ZSByZWFkb25seSB0cmFkZUlucyA9IG5ldyBNYXA8bnVtYmVyLCByZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dPigpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc2hvb3RpbmdTdGF0dWVzID0gbmV3IFNldDxTY3JlZW5JZD4oKTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgZmxhZ3M6IEZsYWdTZXQsXG4gICAgICAgICAgICAgIHByaXZhdGUgcmVhZG9ubHkgdHJhY2tlcjogYm9vbGVhbikge1xuICAgIC8vIFRPRE8gLSBhZGp1c3QgYmFzZWQgb24gZmxhZ3NldD9cbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgUkVMRVZBTlRfRkxBR1MpIHtcbiAgICAgIHRoaXMucmVsZXZhbnRGbGFncy5hZGQoZmxhZyk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgaXRlbSBvZiByb20uaXRlbXMpIHtcbiAgICAgIGlmICghaXRlbS50cmFkZUluKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGNvbmQgPSBpdGVtLmlkID09PSAweDFkID8gQ2FwYWJpbGl0eS5CVVlfSEVBTElORyA6IEl0ZW0oaXRlbS5pZCk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW0udHJhZGVJbi5sZW5ndGg7IGkgKz0gNikge1xuICAgICAgICB0aGlzLnRyYWRlSW5zLnNldChpdGVtLnRyYWRlSW5baV0sIGNvbmQpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgICAgaWYgKHNwYXduLmlzTW9uc3RlcigpICYmIHNwYXduLmlkID09PSAweDNmKSB7IC8vIHNob290aW5nIHN0YXR1ZXNcbiAgICAgICAgICB0aGlzLnNob290aW5nU3RhdHVlcy5hZGQoU2NyZWVuSWQuZnJvbShsb2MsIHNwYXduKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gICAweDFkLCAvLyBtZWRpY2FsIGhlcmJcbiAgICAvLyAgIDB4MjUsIC8vIHN0YXR1ZSBvZiBvbnl4XG4gICAgLy8gICAweDM1LCAvLyBmb2cgbGFtcFxuICAgIC8vICAgMHgzYiwgLy8gbG92ZSBwZW5kYW50XG4gICAgLy8gICAweDNjLCAvLyBraXJpc2EgcGxhbnRcbiAgICAvLyAgIDB4M2QsIC8vIGl2b3J5IHN0YXR1ZVxuICAgIC8vIF0ubWFwKGkgPT4gdGhpcy5yb20uaXRlbXNbaV0pO1xuICB9XG5cbiAgLyoqIEBwYXJhbSBpZCBPYmplY3QgSUQgb2YgdGhlIGJvc3MuICovXG4gIGJvc3NSZXF1aXJlbWVudHMoYm9zczogUm9tQm9zcyk6IFJlcXVpcmVtZW50IHtcbiAgICAvLyBUT0RPIC0gaGFuZGxlIGJvc3Mgc2h1ZmZsZSBzb21laG93P1xuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMucmFnZSkge1xuICAgICAgaWYgKHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzLnJhbmRvbWl6ZVRyYWRlcygpKSByZXR1cm4gQ2FwYWJpbGl0eS5TV09SRDtcbiAgICAgIC8vIHJldHVybiBJdGVtLlNXT1JEX09GX1dBVEVSO1xuICAgICAgcmV0dXJuIENvbmRpdGlvbih0aGlzLnJvbS5ucGNzWzB4YzNdLmxvY2FsRGlhbG9ncy5nZXQoLTEpIVswXS5jb25kaXRpb24pO1xuICAgIH1cbiAgICBjb25zdCBpZCA9IGJvc3Mub2JqZWN0O1xuICAgIGNvbnN0IG91dCA9IG5ldyBNdXRhYmxlUmVxdWlyZW1lbnQoKTtcbiAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3Muc2h1ZmZsZUJvc3NFbGVtZW50cygpKSB7XG4gICAgICBvdXQuYWRkQWxsKENhcGFiaWxpdHkuU1dPUkQpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5mbGFncy5ndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkpIHtcbiAgICAgIGNvbnN0IGxldmVsID0gdGhpcy5mbGFncy5ndWFyYW50ZWVTd29yZE1hZ2ljKCkgPyBib3NzLnN3b3JkTGV2ZWwgOiAxO1xuICAgICAgY29uc3Qgb2JqID0gdGhpcy5yb20ub2JqZWN0c1tpZF07XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICBpZiAob2JqLmlzVnVsbmVyYWJsZShpKSkgb3V0LmFkZEFsbChzd29yZFJlcXVpcmVtZW50KGksIGxldmVsKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dC5hZGRBbGwoQ2FwYWJpbGl0eS5TV09SRCk7XG4gICAgfVxuICAgIGNvbnN0IGV4dHJhOiBDYXBhYmlsaXR5W10gPSBbXTtcbiAgICBpZiAodGhpcy5mbGFncy5ndWFyYW50ZWVSZWZyZXNoKCkpIHtcbiAgICAgIC8vIFRPRE8gLSBtYWtlIHRoaXMgXCJndWFyYW50ZWUgZGVmZW5zaXZlIG1hZ2ljXCIgYW5kIGFsbG93IHJlZnJlc2ggT1IgYmFycmllcj9cbiAgICAgIGV4dHJhLnB1c2goTWFnaWMuUkVGUkVTSCk7XG4gICAgfVxuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuaW5zZWN0KSB7IC8vIGluc2VjdFxuICAgICAgZXh0cmEucHVzaChJdGVtLklOU0VDVF9GTFVURSwgSXRlbS5HQVNfTUFTSyk7XG4gICAgfVxuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuZHJheWdvbjIpIHtcbiAgICAgIGV4dHJhLnB1c2goSXRlbS5CT1dfT0ZfVFJVVEgpO1xuICAgICAgaWYgKHRoaXMuZmxhZ3Muc3RvcnlNb2RlKCkpIHtcbiAgICAgICAgZXh0cmEucHVzaChcbiAgICAgICAgICBCb3NzLktFTEJFU1FVRTEsXG4gICAgICAgICAgQm9zcy5LRUxCRVNRVUUyLFxuICAgICAgICAgIEJvc3MuU0FCRVJBMSxcbiAgICAgICAgICBCb3NzLlNBQkVSQTIsXG4gICAgICAgICAgQm9zcy5NQURPMSxcbiAgICAgICAgICBCb3NzLk1BRE8yLFxuICAgICAgICAgIEJvc3MuS0FSTUlORSxcbiAgICAgICAgICBCb3NzLkRSQVlHT04xLFxuICAgICAgICAgIEl0ZW0uU1dPUkRfT0ZfV0lORCxcbiAgICAgICAgICBJdGVtLlNXT1JEX09GX0ZJUkUsXG4gICAgICAgICAgSXRlbS5TV09SRF9PRl9XQVRFUixcbiAgICAgICAgICBJdGVtLlNXT1JEX09GX1RIVU5ERVIpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZXh0cmEubGVuZ3RoKSB7XG4gICAgICBvdXQucmVzdHJpY3QoYW5kKC4uLmV4dHJhKSk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuZnJlZXplKCk7XG4gIH1cblxuICBsb2NhdGlvbnMoKTogVGlsZUNoZWNrW10ge1xuICAgIGNvbnN0IGxvY2F0aW9uczogVGlsZUNoZWNrW10gPSBbXTtcbiAgICAvLyBUT0RPIC0gcHVsbCB0aGUgbG9jYXRpb24gb3V0IG9mIGl0ZW1Vc2VEYXRhWzBdIGZvciB0aGVzZSBpdGVtc1xuICAgIGxvY2F0aW9ucy5wdXNoKHtcbiAgICAgIHRpbGU6IFRpbGVJZCgweDBmMDA4OCksXG4gICAgICBzbG90OiBTbG90KEV2ZW50LlNUQVJURURfV0lORE1JTEwpLFxuICAgICAgY29uZGl0aW9uOiBJdGVtLldJTkRNSUxMX0tFWSxcbiAgICB9LCB7XG4gICAgICB0aWxlOiBUaWxlSWQoMHhlNDAwODgpLFxuICAgICAgc2xvdDogU2xvdChFdmVudC5PUEVORURfSk9FTF9TSEVEKSxcbiAgICAgIGNvbmRpdGlvbjogSXRlbS5FWUVfR0xBU1NFUyxcbiAgICB9KTtcbiAgICBmb3IgKGNvbnN0IHNob3Agb2YgdGhpcy5yb20uc2hvcHMpIHtcbiAgICAgIC8vIGxlYWYgYW5kIHNoeXJvbiBtYXkgbm90IGFsd2F5cyBiZSBhY2Nlc3NpYmxlLCBzbyBkb24ndCByZWx5IG9uIHRoZW0uXG4gICAgICBpZiAoc2hvcC5sb2NhdGlvbiA9PT0gMHhjMyB8fCBzaG9wLmxvY2F0aW9uID09PSAweGY2KSBjb250aW51ZTtcbiAgICAgIGlmICghc2hvcC51c2VkKSBjb250aW51ZTtcbiAgICAgIGlmIChzaG9wLnR5cGUgIT09IFNob3BUeXBlLlRPT0wpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgY2hlY2sgPSB7XG4gICAgICAgIHRpbGU6IFRpbGVJZChzaG9wLmxvY2F0aW9uIDw8IDE2IHwgMHg4OCksXG4gICAgICAgIGNvbmRpdGlvbjogQ2FwYWJpbGl0eS5NT05FWSxcbiAgICAgIH07XG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygc2hvcC5jb250ZW50cykge1xuICAgICAgICBpZiAoaXRlbSA9PT0gKEl0ZW0uTUVESUNBTF9IRVJCWzBdWzBdICYgMHhmZikpIHtcbiAgICAgICAgICBsb2NhdGlvbnMucHVzaCh7Li4uY2hlY2ssIHNsb3Q6IFNsb3QoQ2FwYWJpbGl0eS5CVVlfSEVBTElORyl9KTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSAoSXRlbS5XQVJQX0JPT1RTWzBdWzBdICYgMHhmZikpIHtcbiAgICAgICAgICBsb2NhdGlvbnMucHVzaCh7Li4uY2hlY2ssIHNsb3Q6IFNsb3QoQ2FwYWJpbGl0eS5CVVlfV0FSUCl9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbG9jYXRpb25zO1xuICB9XG5cbiAgLyoqIFJldHVybnMgdW5kZWZpbmVkIGlmIGltcGFzc2FibGUuICovXG4gIG1ha2VUZXJyYWluKGVmZmVjdHM6IG51bWJlciwgdGlsZTogVGlsZUlkKTogVGVycmFpbiB8IHVuZGVmaW5lZCB7XG4gICAgLy8gQ2hlY2sgZm9yIGRvbHBoaW4gb3Igc3dhbXAuICBDdXJyZW50bHkgZG9uJ3Qgc3VwcG9ydCBzaHVmZmxpbmcgdGhlc2UuXG4gICAgY29uc3QgbG9jID0gdGlsZSA+Pj4gMTY7XG4gICAgZWZmZWN0cyAmPSAweDI2O1xuICAgIGlmIChsb2MgPT09IDB4MWEpIGVmZmVjdHMgfD0gMHgwODtcbiAgICBpZiAobG9jID09PSAweDYwIHx8IGxvYyA9PT0gMHg2OCkgZWZmZWN0cyB8PSAweDEwO1xuICAgIC8vIE5PVEU6IG9ubHkgdGhlIHRvcCBoYWxmLXNjcmVlbiBpbiB1bmRlcmdyb3VuZCBjaGFubmVsIGlzIGRvbHBoaW5hYmxlXG4gICAgaWYgKGxvYyA9PT0gMHg2NCAmJiAoKHRpbGUgJiAweGYwZjApIDwgMHg5MCkpIGVmZmVjdHMgfD0gMHgxMDtcbiAgICBpZiAodGhpcy5zaG9vdGluZ1N0YXR1ZXMuaGFzKFNjcmVlbklkLmZyb21UaWxlKHRpbGUpKSkgZWZmZWN0cyB8PSAweDAxO1xuICAgIGlmIChlZmZlY3RzICYgMHgyMCkgeyAvLyBzbG9wZVxuICAgICAgLy8gRGV0ZXJtaW5lIGxlbmd0aCBvZiBzbG9wZTogc2hvcnQgc2xvcGVzIGFyZSBjbGltYmFibGUuXG4gICAgICAvLyA2LTggYXJlIGJvdGggZG9hYmxlIHdpdGggYm9vdHNcbiAgICAgIC8vIDAtNSBpcyBkb2FibGUgd2l0aCBubyBib290c1xuICAgICAgLy8gOSBpcyBkb2FibGUgd2l0aCByYWJiaXQgYm9vdHMgb25seSAobm90IGF3YXJlIG9mIGFueSBvZiB0aGVzZS4uLilcbiAgICAgIC8vIDEwIGlzIHJpZ2h0IG91dFxuICAgICAgY29uc3QgZ2V0RWZmZWN0cyA9ICh0aWxlOiBUaWxlSWQpOiBudW1iZXIgPT4ge1xuICAgICAgICBjb25zdCBsID0gdGhpcy5yb20ubG9jYXRpb25zW3RpbGUgPj4+IDE2XTtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gbC5zY3JlZW5zWyh0aWxlICYgMHhmMDAwKSA+Pj4gMTJdWyh0aWxlICYgMHhmMDApID4+PiA4XTtcbiAgICAgICAgcmV0dXJuIHRoaXMucm9tLnRpbGVFZmZlY3RzW2wudGlsZUVmZmVjdHMgLSAweGIzXVxuICAgICAgICAgICAgLmVmZmVjdHNbdGhpcy5yb20uc2NyZWVuc1tzY3JlZW5dLnRpbGVzW3RpbGUgJiAweGZmXV07XG4gICAgICB9O1xuICAgICAgbGV0IGJvdHRvbSA9IHRpbGU7XG4gICAgICBsZXQgaGVpZ2h0ID0gLTE7XG4gICAgICB3aGlsZSAoZ2V0RWZmZWN0cyhib3R0b20pICYgMHgyMCkge1xuICAgICAgICBib3R0b20gPSBUaWxlSWQuYWRkKGJvdHRvbSwgMSwgMCk7XG4gICAgICAgIGhlaWdodCsrO1xuICAgICAgfVxuICAgICAgbGV0IHRvcCA9IHRpbGU7XG4gICAgICB3aGlsZSAoZ2V0RWZmZWN0cyh0b3ApICYgMHgyMCkge1xuICAgICAgICB0b3AgPSBUaWxlSWQuYWRkKHRvcCwgLTEsIDApO1xuICAgICAgICBoZWlnaHQrKztcbiAgICAgIH1cbiAgICAgIGlmIChoZWlnaHQgPCA2KSB7XG4gICAgICAgIGVmZmVjdHMgJj0gfjB4MjA7XG4gICAgICB9IGVsc2UgaWYgKGhlaWdodCA8IDkpIHtcbiAgICAgICAgZWZmZWN0cyB8PSAweDQwO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gVEVSUkFJTlNbZWZmZWN0c107XG4gIH1cblxuICAvLyBUT0RPIC0gY29uc2lkZXIgZm9sZGluZyB0aGlzIGludG8gbG9jYXRpb24vdHJpZ2dlci9ucGMgYXMgYW4gZXh0cmEgcmV0dXJuP1xuICBleHRyYVJvdXRlcygpOiBFeHRyYVJvdXRlW10ge1xuICAgIGNvbnN0IHJvdXRlcyA9IFtdO1xuICAgIGNvbnN0IGVudHJhbmNlID0gKGxvY2F0aW9uOiBudW1iZXIsIGVudHJhbmNlOiBudW1iZXIgPSAwKTogVGlsZUlkID0+IHtcbiAgICAgIGNvbnN0IGwgPSB0aGlzLnJvbS5sb2NhdGlvbnNbbG9jYXRpb25dO1xuICAgICAgY29uc3QgZSA9IGwuZW50cmFuY2VzW2VudHJhbmNlXTtcbiAgICAgIHJldHVybiBUaWxlSWQuZnJvbShsLCBlKTtcbiAgICB9O1xuICAgIC8vIFN0YXJ0IHRoZSBnYW1lIGF0IDA6MFxuICAgIHJvdXRlcy5wdXNoKHt0aWxlOiBlbnRyYW5jZSgwKX0pO1xuICAgIC8vIFN3b3JkIG9mIFRodW5kZXIgd2FycFxuICAgIC8vIFRPRE8gLSBlbnRyYW5jZSBzaHVmZmxlIHdpbGwgYnJlYWsgdGhlIGF1dG8td2FycC1wb2ludCBhZmZvcmRhbmNlLlxuICAgIGlmICh0aGlzLmZsYWdzLnRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKSkge1xuICAgICAgcm91dGVzLnB1c2goe1xuICAgICAgICB0aWxlOiBlbnRyYW5jZSgweGYyKSxcbiAgICAgICAgY29uZGl0aW9uOiBvcihhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBDYXBhYmlsaXR5LkJVWV9XQVJQKSxcbiAgICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBNYWdpYy5URUxFUE9SVCkpLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzLmFzc3VtZVdpbGRXYXJwKCkpIHtcbiAgICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGhpcy5yb20ud2lsZFdhcnAubG9jYXRpb25zKSB7XG4gICAgICAgIHJvdXRlcy5wdXNoKHt0aWxlOiBlbnRyYW5jZShsb2NhdGlvbil9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJvdXRlcztcbiAgfVxuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBmb2xkaW5nIHRoaXMgaW50byBsb2NhdGlvbi90cmlnZ2VyL25wYyBhcyBhbiBleHRyYSByZXR1cm4/XG4gIGV4dHJhRWRnZXMoKTogRXh0cmFFZGdlW10ge1xuICAgIGNvbnN0IGVkZ2VzID0gW107XG4gICAgLy8gbmVlZCBhbiBlZGdlIGZyb20gdGhlIGJvYXQgaG91c2UgdG8gdGhlIGJlYWNoIC0gd2UgY291bGQgYnVpbGQgdGhpcyBpbnRvIHRoZVxuICAgIC8vIGJvYXQgYm9hcmRpbmcgdHJpZ2dlciwgYnV0IGZvciBub3cgaXQncyBoZXJlLlxuICAgIGVkZ2VzLnB1c2goe1xuICAgICAgZnJvbTogVGlsZUlkKDB4NTEwMDg4KSwgLy8gaW4gZnJvbnQgb2YgYm9hdCBob3VzZVxuICAgICAgdG86IFRpbGVJZCgweDYwODY4OCksIC8vIGluIGZyb250IG9mIGNhYmluXG4gICAgICBjb25kaXRpb246IEV2ZW50LlJFVFVSTkVEX0ZPR19MQU1QLFxuICAgIH0pO1xuICAgIHJldHVybiBlZGdlcztcbiAgfVxuXG4gIHRyaWdnZXIoaWQ6IG51bWJlcik6IFRyaWdnZXJEYXRhIHtcbiAgICBzd2l0Y2ggKGlkKSB7XG4gICAgY2FzZSAweDlhOiAvLyBzdGFydCBmaWdodCB3aXRoIG1hZG8gaWYgc2h5cm9uIG1hc3NhY3JlIHN0YXJ0ZWRcbiAgICAgIC8vIFRPRE8gLSBsb29rIHVwIHdobyB0aGUgYWN0dWFsIGJvc3MgaXMgb25jZSB3ZSBnZXQgYm9zcyBzaHVmZmxlISEhXG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IG1lZXQoRXZlbnQuU0hZUk9OX01BU1NBQ1JFLCB0aGlzLmJvc3NSZXF1aXJlbWVudHModGhpcy5yb20uYm9zc2VzLm1hZG8xKSksXG4gICAgICAgIHNsb3Q6IFNsb3QoQm9zcy5NQURPMSksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFhOiAvLyBlbnRlciBvYWsgYWZ0ZXIgaW5zZWN0XG4gICAgICAvLyBOT1RFOiBUaGlzIGlzIG5vdCB0aGUgdHJpZ2dlciB0aGF0IGNoZWNrcywgYnV0IHJhdGhlciBpdCBoYXBwZW5zIG9uIHRoZSBlbnRyYW5jZS5cbiAgICAgIC8vIFRoaXMgaXMgYSBjb252ZW5pZW50IHBsYWNlIHRvIGhhbmRsZSBpdCwgdGhvdWdoLCBzaW5jZSB3ZSBhbHJlYWR5IG5lZWQgdG8gZXhwbGljaXRseVxuICAgICAgLy8gaWdub3JlIHRoaXMgdHJpZ2dlci4gIFdlIGFsc28gcmVxdWlyZSB3YXJwIGJvb3RzIGJlY2F1c2UgaXQncyBwb3NzaWJsZSB0aGF0IHRoZXJlJ3NcbiAgICAgIC8vIG5vIGRpcmVjdCB3YWxraW5nIHBhdGggYW5kIGl0J3Mgbm90IGZlYXNpYmxlIHRvIGNhcnJ5IHRoZSBjaGlsZCB3aXRoIHVzIGV2ZXJ5d2hlcmUsXG4gICAgICAvLyBkdWUgdG8gZ3JhcGhpY3MgcmVhc29ucy5cbiAgICAgIHJldHVybiB7Y2hlY2s6W3tcbiAgICAgICAgY29uZGl0aW9uOiBhbmQoRXZlbnQuRFdBUkZfQ0hJTEQsIENhcGFiaWxpdHkuQlVZX1dBUlApLFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50LlJFU0NVRURfQ0hJTEQpLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhhZDogLy8gYWxsb3cgb3BlbmluZyBwcmlzb24gZG9vclxuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBJdGVtLktFWV9UT19QUklTT04sXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX1BSSVNPTiksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFlOiAvLyBhbGxvdyBvcGVuaW5nIHN0eHlcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogSXRlbS5LRVlfVE9fU1RZWCxcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5PUEVORURfU1RZWCksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFmOiAvLyBhbGxvdyBjYWxtaW5nIHNlYVxuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBJdGVtLlNUQVRVRV9PRl9HT0xELFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50LkNBTE1FRF9TRUEpLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhiMTogLy8gc3RhcnQgZmlnaHQgd2l0aCBndWFyZGlhbiBzdGF0dWVzXG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IGFuZChJdGVtLkJPV19PRl9TVU4sIEl0ZW0uQk9XX09GX01PT04pLFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9DUllQVCksXG4gICAgICB9XX07XG4gICAgfVxuICAgIC8vIENoZWNrIGZvciByZWxldmFudCBmbGFncyBhbmQga25vd24gYWN0aW9uIHR5cGVzLlxuICAgIGNvbnN0IHRyaWdnZXIgPSB0aGlzLnJvbS50cmlnZ2Vyc1tpZCAmIDB4N2ZdO1xuICAgIGlmICghdHJpZ2dlciB8fCAhdHJpZ2dlci51c2VkKSB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHJpZ2dlcjogJHtoZXgoaWQpfWApO1xuICAgIGNvbnN0IHJlbGV2YW50ID0gKGY6IG51bWJlcikgPT4gdGhpcy5yZWxldmFudEZsYWdzLmhhcyhmKTtcbiAgICBjb25zdCByZWxldmFudEFuZFNldCA9IChmOiBudW1iZXIpID0+IGYgPiAwICYmIHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZik7XG4gICAgZnVuY3Rpb24gbWFwKGY6IG51bWJlcik6IG51bWJlciB7XG4gICAgICBpZiAoZiA8IDApIHJldHVybiB+bWFwKH5mKTtcbiAgICAgIGNvbnN0IG1hcHBlZCA9IEZMQUdfTUFQLmdldChmKTtcbiAgICAgIHJldHVybiBtYXBwZWQgIT0gbnVsbCA/IG1hcHBlZFswXVswXSA6IGY7XG4gICAgfVxuICAgIGNvbnN0IGFjdGlvbkl0ZW0gPSBUUklHR0VSX0FDVElPTl9JVEVNU1t0cmlnZ2VyLm1lc3NhZ2UuYWN0aW9uXTtcbiAgICBjb25zdCBjb25kaXRpb24gPSBhbmQoLi4udHJpZ2dlci5jb25kaXRpb25zLm1hcChtYXApLmZpbHRlcihyZWxldmFudEFuZFNldCkubWFwKENvbmRpdGlvbikpO1xuICAgIGlmICh0cmlnZ2VyLm1lc3NhZ2UuYWN0aW9uID09PSAweDE5KSB7IC8vIHB1c2gtZG93biB0cmlnZ2VyXG4gICAgICAvLyBUT0RPIC0gcGFzcyBpbiB0ZXJyYWluOyBpZiBvbiBsYW5kIGFuZCB0cmlnZ2VyIHNraXAgaXMgb24gdGhlblxuICAgICAgLy8gYWRkIGEgcm91dGUgcmVxdWlyaW5nIHJhYmJpdCBib290cyBhbmQgZWl0aGVyIHdhcnAgYm9vdHMgb3IgdGVsZXBvcnQ/XG4gICAgICBjb25zdCBleHRyYTogVHJpZ2dlckRhdGEgPSB7fTtcbiAgICAgIGlmICh0cmlnZ2VyLmlkID09PSAweDg2ICYmICF0aGlzLmZsYWdzLmFzc3VtZVJhYmJpdFNraXAoKSkge1xuICAgICAgICBleHRyYS5keCA9IFstMzIsIC0xNiwgMCwgMTZdO1xuICAgICAgfVxuICAgICAgaWYgKHRyaWdnZXIuaWQgPT09IDB4YmEgJiZcbiAgICAgICAgICAhdGhpcy5mbGFncy5kaXNhYmxlVGVsZXBvcnRTa2lwKCkgJiZcbiAgICAgICAgICAhdGhpcy5mbGFncy5hc3N1bWVUZWxlcG9ydFNraXAoKSkge1xuICAgICAgICBleHRyYS5leHRyYUxvY2F0aW9ucyA9IFt0aGlzLnJvbS5sb2NhdGlvbnMuY29yZGVsUGxhaW5zV2VzdF07XG4gICAgICB9XG4gICAgICBjb25zdCBjb25kID1cbiAgICAgICAgICB0cmlnZ2VyLmNvbmRpdGlvbnMubWFwKGMgPT4gYyA8IDAgJiYgcmVsZXZhbnQofm1hcChjKSkgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ29uZGl0aW9uKH5tYXAoYykpIDogbnVsbClcbiAgICAgICAgICAgICAgLmZpbHRlcigoYzogdW5rbm93bik6IGMgaXMgW1tDb25kaXRpb25dXSA9PiBjICE9IG51bGwpO1xuICAgICAgaWYgKGNvbmQgJiYgY29uZC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHsuLi5leHRyYSwgdGVycmFpbjoge2V4aXQ6IG9yKC4uLmNvbmQpfX07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhY3Rpb25JdGVtICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7Y29uZGl0aW9uLCBzbG90OiBhY3Rpb25JdGVtfV19O1xuICAgIH1cbiAgICBjb25zdCBmbGFncyA9IHRyaWdnZXIuZmxhZ3MuZmlsdGVyKHJlbGV2YW50QW5kU2V0KTtcbiAgICBpZiAoZmxhZ3MubGVuZ3RoKSB7XG4gICAgICByZXR1cm4ge2NoZWNrOiBmbGFncy5tYXAoZiA9PiAoe2NvbmRpdGlvbiwgc2xvdDogU2xvdChmKX0pKX07XG4gICAgfVxuXG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgbnBjKGlkOiBudW1iZXIsIGxvYzogTG9jYXRpb24pOiBOcGNEYXRhIHtcbiAgICBjb25zdCBucGMgPSB0aGlzLnJvbS5ucGNzW2lkXTtcbiAgICBpZiAoIW5wYyB8fCAhbnBjLnVzZWQpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0cmlnZ2VyOiAke2hleChpZCl9YCk7XG5cbiAgICBjb25zdCBzcGF3bkNvbmRpdGlvbnM6IHJlYWRvbmx5IG51bWJlcltdID0gbnBjLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jLmlkKSB8fCBbXTtcblxuICAgIGNvbnN0IHJlc3VsdDogTnBjRGF0YSAmIHtjaGVjazogQ2hlY2tbXX0gPSB7Y2hlY2s6IFtdfTtcblxuICAgIGlmIChucGMuZGF0YVsyXSAmIDB4MDQpIHtcbiAgICAgIC8vIHBlcnNvbiBpcyBhIHN0YXR1ZS5cbiAgICAgIHJlc3VsdC50ZXJyYWluID0ge1xuICAgICAgICBleGl0OiB0aGlzLmZsYWdzLmFzc3VtZVN0YXR1ZUdsaXRjaCgpID9cbiAgICAgICAgICAgICAgICAgIFtbXV0gOiBcbiAgICAgICAgICAgICAgICAgIG9yKC4uLnNwYXduQ29uZGl0aW9ucy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBGTEFHX01BUC5nZXQoeCkgfHwgKHRoaXMucmVsZXZhbnRGbGFncy5oYXMoeCkgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDb25kaXRpb24oeCkgOiBbXSkpKSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RhdHVlT3IoLi4ucmVxczogUmVxdWlyZW1lbnRbXSk6IHZvaWQge1xuICAgICAgaWYgKCFyZXN1bHQudGVycmFpbikgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHRlcnJhaW4gZm9yIGd1YXJkJyk7XG4gICAgICByZXN1bHQudGVycmFpbi5leGl0ID0gb3IocmVzdWx0LnRlcnJhaW4uZXhpdCB8fCBbXSwgLi4ucmVxcyk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGZvcnR1bmUgdGVsbGVyICgzOSkgcmVxdWlyZXMgYWNjZXNzIHRvIHBvcnRvYSB0byBnZXQgaGVyIHRvIG1vdmU/XG4gICAgLy8gICAgICAtPiBtYXliZSBpbnN0ZWFkIGNoYW5nZSB0aGUgZmxhZyB0byBzZXQgaW1tZWRpYXRlbHkgb24gdGFsa2luZyB0byBoZXJcbiAgICAvLyAgICAgICAgIHJhdGhlciB0aGFuIHRoZSB0cmlnZ2VyIG91dHNpZGUgdGhlIGRvb3IuLi4/IHRoaXMgd291bGQgYWxsb3cgZ2V0dGluZ1xuICAgIC8vICAgICAgICAgdGhyb3VnaCBpdCBieSBqdXN0IHRhbGtpbmcgYW5kIHRoZW4gbGVhdmluZyB0aGUgcm9vbS4uLlxuXG4gICAgc3dpdGNoIChpZCkge1xuICAgIGNhc2UgMHgxNDogLy8gd29rZW4tdXAgd2luZG1pbGwgZ3VhcmRcbiAgICAgIC8vIHNraXAgYmVjYXVzZSB3ZSB0aWUgdGhlIGl0ZW0gdG8gdGhlIHNsZWVwaW5nIG9uZS5cbiAgICAgIGlmIChsb2Muc3Bhd25zLmZpbmQobCA9PiBsLmlzTnBjKCkgJiYgbC5pZCA9PT0gMHgxNSkpIHJldHVybiB7fTtcbiAgICBjYXNlIDB4MjU6IC8vIGFtYXpvbmVzIGd1YXJkXG4gICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAwLCB4MTogMiwgeTA6IDAsIHkxOiAxfTtcbiAgICAgIHN0YXR1ZU9yKE1hZ2ljLkNIQU5HRSwgTWFnaWMuUEFSQUxZU0lTKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHgyZDogLy8gbXQgc2FicmUvc3dhbiBzb2xkaWVyc1xuICAgICAgLy8gVGhlc2UgZG9uJ3QgY291bnQgYXMgc3RhdHVlcyBiZWNhdXNlIHRoZXknbGwgbW92ZSBpZiB5b3UgdGFsayB0byB0aGVtLlxuICAgICAgZGVsZXRlIHJlc3VsdC50ZXJyYWluO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDMzOiAvLyBwb3J0b2EgZ3VhcmQgKHRocm9uZSByb29tLCB0aG91Z2ggdGhlIHBhbGFjZSBvbmUgaXMgdGhlIG9uZSB0aGF0IG1hdHRlcnMpXG4gICAgICAvLyBOT1RFOiB0aGlzIG1lYW5zIHRoYXQgd2UgY2Fubm90IHNlcGFyYXRlIHRoZSBwYWxhY2UgZm95ZXIgZnJvbSB0aGUgdGhyb25lIHJvb20sIHNpbmNlXG4gICAgICAvLyB0aGVyZSdzIG5vIHdheSB0byByZXByZXNlbnQgdGhlIGNvbmRpdGlvbiBmb3IgcGFyYWx5emluZyB0aGUgZ3VhcmQgYW5kIHN0aWxsIGhhdmUgaGltXG4gICAgICAvLyBwYXNzYWJsZSB3aGVuIHRoZSBxdWVlbiBpcyB0aGVyZS4gIFRoZSB3aG9sZSBzZXF1ZW5jZSBpcyBhbHNvIHRpZ2h0bHkgY291cGxlZCwgc28gaXRcbiAgICAgIC8vIHByb2JhYmx5IHdvdWxkbid0IG1ha2Ugc2Vuc2UgdG8gc3BsaXQgaXQgdXAgYW55d2F5LlxuICAgICAgc3RhdHVlT3IoTWFnaWMuUEFSQUxZU0lTKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHgzODogLy8gcG9ydG9hIHF1ZWVuIHNpdHRpbmcgb24gaW1wYXNzYWJsZSB0aHJvbmVcbiAgICAgIGlmIChsb2MuaWQgPT09IDB4ZGYpIHJlc3VsdC5oaXRib3ggPSB7eDA6IDAsIHgxOiAxLCB5MDogMiwgeTE6IDN9O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDRlOiAvLyBzaHlyb24gZ3VhcmRcbiAgICAgIHJlc3VsdC5oaXRib3ggPSB7eDA6IC0xLCB4MTogMiwgeTA6IDAsIHkxOiAxfTtcbiAgICAgIHN0YXR1ZU9yKE1hZ2ljLkNIQU5HRSwgRXZlbnQuRU5URVJFRF9TSFlST04pO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDgwOiAvLyBnb2EgZ3VhcmRzXG4gICAgICBzdGF0dWVPciguLi5zcGF3bkNvbmRpdGlvbnMubWFwKGMgPT4gQ29uZGl0aW9uKH5jKSkpOyAvLyBFdmVudC5FTlRFUkVEX1NIWVJPTlxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDg1OiAvLyBzdG9uZWQgcGFpclxuICAgICAgc3RhdHVlT3IoSXRlbS5GTFVURV9PRl9MSU1FKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIGludGVyc2VjdCBzcGF3biBjb25kaXRpb25zXG4gICAgY29uc3QgcmVxdWlyZW1lbnRzOiBBcnJheTxyZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dPiA9IFtdO1xuICAgIGNvbnN0IGFkZFJlcSA9IChmbGFnOiBudW1iZXIpOiB2b2lkID0+IHtcbiAgICAgIGlmIChmbGFnIDw9IDApIHJldHVybjsgLy8gbmVnYXRpdmUgb3IgemVybyBmbGFnIGlnbm9yZWRcbiAgICAgIGNvbnN0IHJlcSA9IEZMQUdfTUFQLmdldChmbGFnKSB8fCAodGhpcy5yZWxldmFudEZsYWdzLmhhcyhmbGFnKSA/IENvbmRpdGlvbihmbGFnKSA6IG51bGwpO1xuICAgICAgaWYgKHJlcSAhPSBudWxsKSByZXF1aXJlbWVudHMucHVzaChyZXEpO1xuICAgIH07XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIHNwYXduQ29uZGl0aW9ucykge1xuICAgICAgYWRkUmVxKGZsYWcpO1xuICAgIH1cblxuICAgIC8vIExvb2sgZm9yIHRyYWRlLWluc1xuICAgIC8vICAtIFRPRE8gLSBkb24ndCBoYXJkLWNvZGUgdGhlIE5QQ3M/IHJlYWQgZnJvbSB0aGUgaXRlbWRhdGE/XG4gICAgY29uc3QgdHJhZGVJbiA9IHRoaXMudHJhZGVJbnMuZ2V0KGlkKVxuICAgIGlmICh0cmFkZUluICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHQgPSB0cmFkZUluO1xuICAgICAgZnVuY3Rpb24gdHJhZGUoc2xvdDogU2xvdCwgLi4ucmVxczogQXJyYXk8cmVhZG9ubHkgW3JlYWRvbmx5IENvbmRpdGlvbltdXT4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgY29uZGl0aW9uID0gYW5kKC4uLnJlcXVpcmVtZW50cywgdCwgLi4ucmVxcyk7XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90LCBjb25kaXRpb259KTtcbiAgICAgIH1cbiAgICAgIGxldCB0cmFkZVIgPSB0cmFkZTtcbiAgICAgIGlmICh0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFncy5yYW5kb21pemVUcmFkZXMoKSkge1xuICAgICAgICB0cmFkZVIgPSAoc2xvdCwgLi4ucmVxcykgPT4ge1xuICAgICAgICAgIGNvbnN0IGl0ZW1zID0gW1xuICAgICAgICAgICAgSXRlbS5TVEFUVUVfT0ZfT05ZWCxcbiAgICAgICAgICAgIEl0ZW0uRk9HX0xBTVAsXG4gICAgICAgICAgICBJdGVtLkxPVkVfUEVOREFOVCxcbiAgICAgICAgICAgIEl0ZW0uS0lSSVNBX1BMQU5ULFxuICAgICAgICAgICAgSXRlbS5JVk9SWV9TVEFUVUUsXG4gICAgICAgICAgXTtcbiAgICAgICAgICBjb25zdCBjb25kaXRpb24gPVxuICAgICAgICAgICAgICBvciguLi5pdGVtcy5tYXAoaSA9PiBhbmQoLi4ucmVxdWlyZW1lbnRzLCBpLCAuLi5yZXFzKSkpO1xuICAgICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90LCBjb25kaXRpb259KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc3dpdGNoIChpZCkge1xuICAgICAgY2FzZSAweDE1OiAvLyBzbGVlcGluZyB3aW5kbWlsbCBndWFyZCA9PiB3aW5kbWlsbCBrZXkgc2xvdFxuICAgICAgICB0cmFkZShTbG90KEl0ZW0uV0lORE1JTExfS0VZKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDIzOiAvLyBhcnlsbGlzID0+IGJvdyBvZiBtb29uIHNsb3RcbiAgICAgICAgLy8gTk9URTogc2l0dGluZyBvbiBpbXBhc3NpYmxlIHRocm9uZVxuICAgICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAtMSwgeDE6IDIsIHkwOiAtMSwgeTE6IDJ9O1xuICAgICAgICB0cmFkZVIoU2xvdChJdGVtLkJPV19PRl9NT09OKSwgTWFnaWMuQ0hBTkdFKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NjM6IC8vIGh1cnQgZG9scGhpbiA9PiBoZWFsZWQgZG9scGhpblxuICAgICAgICAvLyBOT1RFOiBkb2xwaGluIG9uIHdhdGVyLCBidXQgY2FuIGhlYWwgZnJvbSBsYW5kXG4gICAgICAgIHJlc3VsdC5oaXRib3ggPSB7eDA6IC0xLCB4MTogMiwgeTA6IC0xLCB5MTogMn07XG4gICAgICAgIHRyYWRlKFNsb3QoRXZlbnQuSEVBTEVEX0RPTFBISU4pKTtcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLlNIRUxMX0ZMVVRFKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDY0OiAvLyBmaXNoZXJtYW5cbiAgICAgICAgdHJhZGVSKFNsb3QoRXZlbnQuUkVUVVJORURfRk9HX0xBTVApLFxuICAgICAgICAgICAgICAgLi4uKHRoaXMuZmxhZ3MucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKSA/XG4gICAgICAgICAgICAgICAgICAgW0V2ZW50LkhFQUxFRF9ET0xQSElOXSA6IFtdKSk7XG4gICAgICAgIC8vIFRPRE8gLSB1c2UgdGhpcyBhcyBwcm94eSBmb3IgYm9hdFxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg2YjogLy8gc2xlZXBpbmcga2Vuc3VcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLkdMT1dJTkdfTEFNUCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg3NTogLy8gc2xpbWVkIGtlbnN1ID0+IGZsaWdodCBzbG90XG4gICAgICAgIHRyYWRlUihTbG90KE1hZ2ljLkZMSUdIVCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg3NDogLy8ga2Vuc3UgaW4gZGFuY2UgaGFsbCA9PiBjaGFuZ2Ugc2xvdFxuICAgICAgICAvLyBOT1RFOiB0aGlzIGlzIG5vcm1hbGx5IDdlIGJ1dCB3ZSBjaGFuZ2UgaXQgdG8gNzQgaW4gdGhpcyBvbmVcbiAgICAgICAgLy8gbG9jYXRpb24gdG8gaWRlbnRpZnkgaXRcbiAgICAgICAgdHJhZGVSKFNsb3QoTWFnaWMuQ0hBTkdFKSwgTWFnaWMuUEFSQUxZU0lTLCBFdmVudC5GT1VORF9LRU5TVSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDgyOiAvLyBha2FoYW5hID0+IGdhcyBtYXNrIHNsb3QgKGNoYW5nZWQgMTYgLT4gODIpXG4gICAgICAgIHRyYWRlUihTbG90KEl0ZW0uR0FTX01BU0spKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4ODg6IC8vIHN0b25lZCBha2FoYW5hID0+IHNoaWVsZCByaW5nIHNsb3RcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLlNISUVMRF9SSU5HKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5QQ3MgdGhhdCBuZWVkIGEgbGl0dGxlIGV4dHJhIGNhcmVcblxuICAgIGlmIChpZCA9PT0gMHg4NCkgeyAvLyBzdGFydCBmaWdodCB3aXRoIHNhYmVyYVxuICAgICAgLy8gVE9ETyAtIGxvb2sgdXAgd2hvIHRoZSBhY3R1YWwgYm9zcyBpcyBvbmNlIHdlIGdldCBib3NzIHNodWZmbGUhISFcbiAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IHRoaXMuYm9zc1JlcXVpcmVtZW50cyh0aGlzLnJvbS5ib3NzZXMuc2FiZXJhMSk7XG4gICAgICByZXR1cm4ge2NoZWNrOiBbXG4gICAgICAgIHtjb25kaXRpb24sIHNsb3Q6IFNsb3QoQm9zcy5TQUJFUkExKX0sXG4gICAgICBdfTtcbiAgICB9IGVsc2UgaWYgKGlkID09PSAweDFkKSB7IC8vIG9hayBlbGRlciBoYXMgc29tZSB3ZWlyZCB1bnRyYWNrZWQgY29uZGl0aW9ucy5cbiAgICAgIGNvbnN0IHNsb3QgPSBTbG90KEl0ZW0uU1dPUkRfT0ZfRklSRSk7XG4gICAgICByZXR1cm4ge2NoZWNrOiBbXG4gICAgICAgIC8vIHR3byBkaWZmZXJlbnQgd2F5cyB0byBnZXQgdGhlIHN3b3JkIG9mIGZpcmUgaXRlbVxuICAgICAgICB7Y29uZGl0aW9uOiBhbmQoTWFnaWMuVEVMRVBBVEhZLCBCb3NzLklOU0VDVCksIHNsb3R9LFxuICAgICAgICB7Y29uZGl0aW9uOiBFdmVudC5SRVNDVUVEX0NISUxELCBzbG90fSxcbiAgICAgIF19O1xuICAgIH0gZWxzZSBpZiAoaWQgPT09IDB4MWYpIHsgLy8gZHdhcmYgY2hpbGRcbiAgICAgIGNvbnN0IHNwYXducyA9IHRoaXMucm9tLm5wY3NbaWRdLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jLmlkKTtcbiAgICAgIGlmIChzcGF3bnMgJiYgc3Bhd25zLmluY2x1ZGVzKDB4MDQ1KSkgcmV0dXJuIHt9OyAvLyBpbiBtb3RoZXIncyBob3VzZVxuICAgICAgcmV0dXJuIHtjaGVjazogW1xuICAgICAgICB7Y29uZGl0aW9uOiBFdmVudC5EV0FSRl9NT1RIRVIsIHNsb3Q6IFNsb3QoRXZlbnQuRFdBUkZfQ0hJTEQpfSxcbiAgICAgIF19O1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgZCBvZiBucGMuZ2xvYmFsRGlhbG9ncykge1xuICAgICAgYWRkUmVxKH5kLmNvbmRpdGlvbik7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZCBvZiBucGMubG9jYWxEaWFsb2dzLmdldChsb2MuaWQpIHx8IG5wYy5sb2NhbERpYWxvZ3MuZ2V0KC0xKSB8fCBbXSkge1xuICAgICAgLy8gSWYgdGhlIGNoZWNrIGNvbmRpdGlvbiBpcyBvcHBvc2l0ZSB0byB0aGUgc3Bhd24gY29uZGl0aW9uLCB0aGVuIHNraXAuXG4gICAgICAvLyBUaGlzIGVuc3VyZXMgd2UgZG9uJ3QgZXhwZWN0IHRoZSBxdWVlbiB0byBnaXZlIHJlY292ZXIgaW4gdGhlIHRocm9uZSByb29tLlxuICAgICAgaWYgKHNwYXduQ29uZGl0aW9ucy5pbmNsdWRlcyh+ZC5jb25kaXRpb24pKSBjb250aW51ZTtcbiAgICAgIC8vIEFwcGx5IHRoZSBGTEFHX01BUC5cbiAgICAgIGNvbnN0IG1hcHBlZCA9IEZMQUdfTUFQLmdldChkLmNvbmRpdGlvbik7XG4gICAgICBjb25zdCBwb3NpdGl2ZSA9XG4gICAgICAgICAgbWFwcGVkID8gW21hcHBlZF0gOlxuICAgICAgICAgIHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZC5jb25kaXRpb24pID8gW0NvbmRpdGlvbihkLmNvbmRpdGlvbildIDpcbiAgICAgICAgICBbXTtcbiAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IGFuZCguLi5wb3NpdGl2ZSwgLi4ucmVxdWlyZW1lbnRzKTtcbiAgICAgIC8vIElmIHRoZSBjb25kaXRpb24gaXMgYSBuZWdhdGl2ZSB0aGVuIGFueSBmdXR1cmUgY29uZGl0aW9ucyBtdXN0IGluY2x1ZGVcbiAgICAgIC8vIGl0IGFzIGEgcG9zaXRpdmUgcmVxdWlyZW1lbnQuXG4gICAgICBjb25zdCBuZWdhdGl2ZSA9XG4gICAgICAgICAgRkxBR19NQVAuZ2V0KH5kLmNvbmRpdGlvbikgfHxcbiAgICAgICAgICAodGhpcy5yZWxldmFudEZsYWdzLmhhcyh+ZC5jb25kaXRpb24pID8gQ29uZGl0aW9uKH5kLmNvbmRpdGlvbikgOiBudWxsKTtcbiAgICAgIGlmIChuZWdhdGl2ZSAhPSBudWxsKSByZXF1aXJlbWVudHMucHVzaChuZWdhdGl2ZSk7XG4gICAgICBjb25zdCBhY3Rpb24gPSBkLm1lc3NhZ2UuYWN0aW9uO1xuICAgICAgaWYgKGFjdGlvbiA9PT0gMHgwMykge1xuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdC5pdGVtKG5wYy5kYXRhWzBdKSwgY29uZGl0aW9ufSk7XG4gICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gMHgxMSB8fCBhY3Rpb24gPT09IDB4MDkpIHtcbiAgICAgICAgLy8gTk9URTogJDA5IGlzIHplYnUgc3R1ZGVudCwgd2hpY2ggd2UndmUgcGF0Y2hlZCB0byBnaXZlIHRoZSBpdGVtLlxuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdC5pdGVtKG5wYy5kYXRhWzFdKSwgY29uZGl0aW9ufSk7XG4gICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gMHgxMCkge1xuICAgICAgICAvLyBOT1RFOiBRdWVlbiBjYW4ndCBiZSByZXZlYWxlZCBhcyBhc2luYSBpbiB0aGUgdGhyb25lIHJvb20uICBJbiBwYXJ0aWN1bGFyLFxuICAgICAgICAvLyB0aGlzIGVuc3VyZXMgdGhhdCB0aGUgYmFjayByb29tIGlzIHJlYWNoYWJsZSBiZWZvcmUgcmVxdWlyaW5nIHRoZSBkb2xwaGluXG4gICAgICAgIC8vIHRvIGFwcGVhci4gIFRoaXMgc2hvdWxkIGJlIGhhbmRsZWQgYnkgdGhlIGFib3ZlIGNoZWNrIGZvciB0aGUgZGlhbG9nIGFuZFxuICAgICAgICAvLyBzcGF3biBjb25kaXRpb25zIHRvIGJlIGNvbXBhdGlibGUuXG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90KE1hZ2ljLlJFQ09WRVIpLCBjb25kaXRpb259KTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAweDA4ICYmIGlkID09PSAweDJkKSB7XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9TV0FOKSwgY29uZGl0aW9ufSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZC5mbGFncykge1xuICAgICAgICBjb25zdCBtZmxhZyA9IEZMQUdfTUFQLmdldChmbGFnKTtcbiAgICAgICAgY29uc3QgcGZsYWcgPSBtZmxhZyA/IG1mbGFnIDogdGhpcy5yZWxldmFudEZsYWdzLmhhcyhmbGFnKSA/IENvbmRpdGlvbihmbGFnKSA6IG51bGw7XG4gICAgICAgIGlmIChwZmxhZykgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QocGZsYWcpLCBjb25kaXRpb259KTtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBzcGF3biAqcmVxdWlyZXMqIHRoaXMgY29uZGl0aW9uIHRoZW4gZG9uJ3QgZXZhbHVhdGUgYW55IG1vcmUuICBUaGlzXG4gICAgICAvLyBlbnN1cmVzIHdlIGRvbid0IGV4cGVjdCB0aGUgcXVlZW4gdG8gZ2l2ZSB0aGUgZmx1dGUgb2YgbGltZSBpbiB0aGUgYmFjayByb29tLFxuICAgICAgLy8gc2luY2Ugc2hlIHdvdWxkbid0IGhhdmUgc3Bhd25lZCB0aGVyZSBpbnRpbWUgdG8gZ2l2ZSBpdC5cbiAgICAgIGlmIChwb3NpdGl2ZS5sZW5ndGggJiYgc3Bhd25Db25kaXRpb25zLmluY2x1ZGVzKGQuY29uZGl0aW9uKSkgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBjYXBhYmlsaXRpZXMoKTogQ2FwYWJpbGl0eURhdGFbXSB7XG4gICAgbGV0IGJyZWFrU3RvbmU6IFJlcXVpcmVtZW50ID0gSXRlbS5TV09SRF9PRl9XSU5EO1xuICAgIGxldCBicmVha0ljZTogUmVxdWlyZW1lbnQgPSBJdGVtLlNXT1JEX09GX0ZJUkU7XG4gICAgbGV0IGZvcm1CcmlkZ2U6IFJlcXVpcmVtZW50ID0gSXRlbS5TV09SRF9PRl9XQVRFUjtcbiAgICBsZXQgYnJlYWtJcm9uOiBSZXF1aXJlbWVudCA9IEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUjtcbiAgICBpZiAoIXRoaXMuZmxhZ3Mub3Jic09wdGlvbmFsKCkpIHtcbiAgICAgIC8vIEFkZCBvcmIgcmVxdWlyZW1lbnRcbiAgICAgIGJyZWFrU3RvbmUgPSBvcihhbmQoSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLk9SQl9PRl9XSU5EKSxcbiAgICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLlRPUk5BRE9fQlJBQ0VMRVQpKTtcbiAgICAgIGJyZWFrSWNlID0gb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfRklSRSwgSXRlbS5PUkJfT0ZfRklSRSksXG4gICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX0ZJUkUsIEl0ZW0uRkxBTUVfQlJBQ0VMRVQpKTtcbiAgICAgIGZvcm1CcmlkZ2UgPSBvcihhbmQoSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5PUkJfT0ZfV0FURVIpLFxuICAgICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX1dBVEVSLCBJdGVtLkJMSVpaQVJEX0JSQUNFTEVUKSk7XG4gICAgICBicmVha0lyb24gPSBvcihhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBJdGVtLk9SQl9PRl9USFVOREVSKSxcbiAgICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX1RIVU5ERVIsIEl0ZW0uU1RPUk1fQlJBQ0VMRVQpKTtcbiAgICAgIGlmICh0aGlzLmZsYWdzLmFzc3VtZVN3b3JkQ2hhcmdlR2xpdGNoKCkpIHtcbiAgICAgICAgY29uc3QgbGV2ZWwyID0gb3IoYnJlYWtTdG9uZSwgYnJlYWtJY2UsIGZvcm1CcmlkZ2UsIGJyZWFrSXJvbik7XG4gICAgICAgIGZ1bmN0aW9uIG5lZWQoc3dvcmQ6IHJlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV0pOiBSZXF1aXJlbWVudCB7XG4gICAgICAgICAgY29uc3QgY29uZGl0aW9uOiBDb25kaXRpb24gPSBzd29yZFswXVswXTtcbiAgICAgICAgICByZXR1cm4gbGV2ZWwyLm1hcChjID0+IGNbMF0gPT09IGNvbmRpdGlvbiA/IGMgOiBbY29uZGl0aW9uLCAuLi5jXSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtTdG9uZSA9IG5lZWQoSXRlbS5TV09SRF9PRl9XSU5EKTtcbiAgICAgICAgYnJlYWtJY2UgPSBuZWVkKEl0ZW0uU1dPUkRfT0ZfRklSRSk7XG4gICAgICAgIGZvcm1CcmlkZ2UgPSBuZWVkKEl0ZW0uU1dPUkRfT0ZfV0FURVIpO1xuICAgICAgICBicmVha0lyb24gPSBuZWVkKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUik7XG4gICAgICB9XG4gICAgfVxuICAgIHR5cGUgQ2FwYWJpbGl0eUxpc3QgPSBBcnJheTxbcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXSwgLi4uUmVxdWlyZW1lbnRbXV0+O1xuICAgIGNvbnN0IGNhcGFiaWxpdGllczogQ2FwYWJpbGl0eUxpc3QgPSBbXG4gICAgICBbQ2FwYWJpbGl0eS5TV09SRCxcbiAgICAgICBJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uU1dPUkRfT0ZfRklSRSxcbiAgICAgICBJdGVtLlNXT1JEX09GX1dBVEVSLCBJdGVtLlNXT1JEX09GX1RIVU5ERVJdLFxuICAgICAgW0NhcGFiaWxpdHkuQlJFQUtfU1RPTkUsIGJyZWFrU3RvbmVdLFxuICAgICAgW0NhcGFiaWxpdHkuQlJFQUtfSUNFLCBicmVha0ljZV0sXG4gICAgICBbQ2FwYWJpbGl0eS5GT1JNX0JSSURHRSwgZm9ybUJyaWRnZV0sXG4gICAgICBbQ2FwYWJpbGl0eS5CUkVBS19JUk9OLCBicmVha0lyb25dLFxuICAgICAgW0NhcGFiaWxpdHkuTU9ORVksIENhcGFiaWxpdHkuU1dPUkRdLCAvLyBUT0RPIC0gY2xlYXIgdGhpcyB1cFxuICAgICAgW0NhcGFiaWxpdHkuQ0xJTUJfV0FURVJGQUxMLCBNYWdpYy5GTElHSFRdLFxuICAgICAgW0NhcGFiaWxpdHkuU0hPT1RJTkdfU1RBVFVFLCBNYWdpYy5CQVJSSUVSXSwgLy8gVE9ETyAtIGFsbG93IHNoaWVsZCByaW5nP1xuICAgICAgW0NhcGFiaWxpdHkuQ0xJTUJfU0xPUEUsIEl0ZW0uUkFCQklUX0JPT1RTLCBNYWdpYy5GTElHSFRdLFxuICAgICAgW0V2ZW50LkdFTkVSQUxTX0RFRkVBVEVELCBJdGVtLklWT1JZX1NUQVRVRV0sIC8vIFRPRE8gLSBmaXggdGhpc1xuICAgICAgW0V2ZW50Lk9QRU5FRF9TRUFMRURfQ0FWRSwgRXZlbnQuU1RBUlRFRF9XSU5ETUlMTF0sIC8vIFRPRE8gLSBtZXJnZSBjb21wbGV0ZWx5P1xuICAgIF07XG5cbiAgICBpZiAodGhpcy5mbGFncy5hc3N1bWVHaGV0dG9GbGlnaHQoKSkge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuQ0xJTUJfV0FURVJGQUxMLCBhbmQoRXZlbnQuUklERV9ET0xQSElOLCBJdGVtLlJBQkJJVF9CT09UUyldKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZmxhZ3MuZ3VhcmFudGVlQmFycmllcigpKSB7XG4gICAgICAvLyBUT0RPIC0gc3dvcmQgY2hhcmdlIGdsaXRjaCBtaWdodCBiZSBhIHByb2JsZW0gd2l0aCB0aGUgaGVhbGluZyBvcHRpb24uLi5cbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LlNIT09USU5HX1NUQVRVRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgQ2FwYWJpbGl0eS5CVVlfSEVBTElORyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIEl0ZW0uU0hJRUxEX1JJTkcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBNYWdpYy5SRUZSRVNIKV0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmZsYWdzLmxlYXRoZXJCb290c0dpdmVTcGVlZCgpKSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5DTElNQl9TTE9QRSwgSXRlbS5MRUFUSEVSX0JPT1RTXSk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBib3NzIG9mIHRoaXMucm9tLmJvc3Nlcykge1xuICAgICAgaWYgKGJvc3Mua2lsbCAhPSBudWxsICYmIGJvc3MuZHJvcCAhPSBudWxsKSB7XG4gICAgICAgIC8vIFNhdmVzIHJlZHVuZGFuY3kgb2YgcHV0dGluZyB0aGUgaXRlbSBpbiB0aGUgYWN0dWFsIHJvb20uXG4gICAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtJdGVtKGJvc3MuZHJvcCksIEJvc3MoYm9zcy5raWxsKV0pO1xuICAgICAgfVxuICAgIH1cbiAgICBjYXBhYmlsaXRpZXMucHVzaChbSXRlbS5PUkJfT0ZfV0FURVIsIEJvc3MuUkFHRV0pO1xuXG4gICAgaWYgKHRoaXMuZmxhZ3MuZ3VhcmFudGVlR2FzTWFzaygpKSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5UUkFWRUxfU1dBTVAsIEl0ZW0uR0FTX01BU0tdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuVFJBVkVMX1NXQU1QLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICBvcihJdGVtLkdBU19NQVNLLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBJdGVtLk1FRElDQUxfSEVSQiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIE1hZ2ljLlJFRlJFU0gpKV0pO1xuICAgIH1cblxuICAgIC8vIGlmICh0aGlzLmZsYWdzLmFzc3VtZVN0YXR1ZUdsaXRjaCgpKSB7XG4gICAgLy8gICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5TVEFUVUVfR0xJVENILCBbW11dXSk7XG4gICAgLy8gfVxuXG4gICAgcmV0dXJuIGNhcGFiaWxpdGllcy5tYXAoKFtjYXBhYmlsaXR5LCAuLi5kZXBzXSkgPT4gKHtjYXBhYmlsaXR5LCBjb25kaXRpb246IG9yKC4uLmRlcHMpfSkpO1xuICB9XG5cbiAgd2FsbENhcGFiaWxpdHkodHlwZTogV2FsbFR5cGUpOiB7ZmxhZzogbnVtYmVyfSB7XG4gICAgcmV0dXJuIHtmbGFnOiBbQ2FwYWJpbGl0eS5CUkVBS19TVE9ORSwgQ2FwYWJpbGl0eS5CUkVBS19JQ0UsXG4gICAgICAgICAgICAgICAgICAgQ2FwYWJpbGl0eS5GT1JNX0JSSURHRSwgQ2FwYWJpbGl0eS5CUkVBS19JUk9OXVt0eXBlXVswXVswXX07XG4gIH1cbn1cblxudHlwZSBUaWxlQ2hlY2sgPSBDaGVjayAmIHt0aWxlOiBUaWxlSWR9O1xuXG4vLyBUT0RPIC0gbWF5YmUgcHVsbCB0cmlnZ2VycyBhbmQgbnBjcywgZXRjLCBiYWNrIHRvZ2V0aGVyP1xuLy8gICAgICAtIG9yIG1ha2UgdGhlIGxvY2F0aW9uIG92ZXJsYXkgYSBzaW5nbGUgZnVuY3Rpb24/XG4vLyAgICAgICAgLT4gbmVlZHMgY2xvc2VkLW92ZXIgc3RhdGUgdG8gc2hhcmUgaW5zdGFuY2VzLi4uXG5cbmludGVyZmFjZSBFeHRyYVJvdXRlIHtcbiAgdGlsZTogVGlsZUlkO1xuICBjb25kaXRpb24/OiBSZXF1aXJlbWVudDtcbn1cbmludGVyZmFjZSBFeHRyYUVkZ2Uge1xuICBmcm9tOiBUaWxlSWQ7XG4gIHRvOiBUaWxlSWQ7XG4gIGNvbmRpdGlvbj86IFJlcXVpcmVtZW50O1xufVxuXG5pbnRlcmZhY2UgVHJpZ2dlckRhdGEge1xuICB0ZXJyYWluPzogVGVycmFpbjtcbiAgY2hlY2s/OiBDaGVja1tdO1xuICAvLyBhbGxvd3Mgbm90IGFzc3VtaW5nIHRlbGVwb3J0IHNraXBcbiAgZXh0cmFMb2NhdGlvbnM/OiBMb2NhdGlvbltdO1xuICAvLyBhbGxvd3Mgbm90IGFzc3VtaW5nIHJhYmJpdCBza2lwXG4gIGR4PzogbnVtYmVyW107XG59XG5cbmludGVyZmFjZSBOcGNEYXRhIHtcbiAgaGl0Ym94PzogSGl0Ym94O1xuICB0ZXJyYWluPzogVGVycmFpbjtcbiAgY2hlY2s/OiBDaGVja1tdO1xufVxuXG5pbnRlcmZhY2UgSGl0Ym94IHtcbiAgeDA6IG51bWJlcjtcbiAgeTA6IG51bWJlcjtcbiAgeDE6IG51bWJlcjtcbiAgeTE6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIENhcGFiaWxpdHlEYXRhIHtcbiAgY29uZGl0aW9uPzogUmVxdWlyZW1lbnQ7XG4gIGNhcGFiaWxpdHk6IHJlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV07XG59XG5cbi8vIFN0YXRpYyBtYXAgb2YgdGVycmFpbnMuXG5jb25zdCBURVJSQUlOUzogQXJyYXk8VGVycmFpbiB8IHVuZGVmaW5lZD4gPSAoKCkgPT4ge1xuICBjb25zdCBvdXQgPSBbXTtcbiAgZm9yIChsZXQgZWZmZWN0cyA9IDA7IGVmZmVjdHMgPCAxMjg7IGVmZmVjdHMrKykge1xuICAgIG91dFtlZmZlY3RzXSA9IHRlcnJhaW4oZWZmZWN0cyk7XG4gIH1cbiAgLy8gY29uc29sZS5sb2coJ1RFUlJBSU5TJywgb3V0KTtcbiAgcmV0dXJuIG91dDtcblxuICAvKipcbiAgICogQHBhcmFtIGVmZmVjdHMgVGhlICQyNiBiaXRzIG9mIHRpbGVlZmZlY3RzLCBwbHVzICQwOCBmb3Igc3dhbXAsICQxMCBmb3IgZG9scGhpbixcbiAgICogJDAxIGZvciBzaG9vdGluZyBzdGF0dWVzLCAkNDAgZm9yIHNob3J0IHNsb3BlXG4gICAqIEByZXR1cm4gdW5kZWZpbmVkIGlmIHRoZSB0ZXJyYWluIGlzIGltcGFzc2FibGUuXG4gICAqL1xuICBmdW5jdGlvbiB0ZXJyYWluKGVmZmVjdHM6IG51bWJlcik6IFRlcnJhaW4gfCB1bmRlZmluZWQge1xuICAgIGlmIChlZmZlY3RzICYgMHgwNCkgcmV0dXJuIHVuZGVmaW5lZDsgLy8gaW1wYXNzaWJsZVxuICAgIGNvbnN0IHRlcnJhaW46IFRlcnJhaW4gPSB7fTtcbiAgICBpZiAoKGVmZmVjdHMgJiAweDEyKSA9PT0gMHgxMikgeyAvLyBkb2xwaGluIG9yIGZseVxuICAgICAgaWYgKGVmZmVjdHMgJiAweDIwKSB0ZXJyYWluLmV4aXQgPSBDYXBhYmlsaXR5LkNMSU1CX1dBVEVSRkFMTDtcbiAgICAgIHRlcnJhaW4uZW50ZXIgPSBvcihFdmVudC5SSURFX0RPTFBISU4sIE1hZ2ljLkZMSUdIVCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChlZmZlY3RzICYgMHg0MCkgeyAvLyBzaG9ydCBzbG9wZVxuICAgICAgICB0ZXJyYWluLmV4aXQgPSBDYXBhYmlsaXR5LkNMSU1CX1NMT1BFO1xuICAgICAgfSBlbHNlIGlmIChlZmZlY3RzICYgMHgyMCkgeyAvLyBzbG9wZVxuICAgICAgICB0ZXJyYWluLmV4aXQgPSBNYWdpYy5GTElHSFQ7XG4gICAgICB9XG4gICAgICBpZiAoZWZmZWN0cyAmIDB4MDIpIHRlcnJhaW4uZW50ZXIgPSBNYWdpYy5GTElHSFQ7IC8vIG5vLXdhbGtcbiAgICB9XG4gICAgaWYgKGVmZmVjdHMgJiAweDA4KSB7IC8vIHN3YW1wXG4gICAgICB0ZXJyYWluLmVudGVyID0gKHRlcnJhaW4uZW50ZXIgfHwgW1tdXSkubWFwKGNzID0+IENhcGFiaWxpdHkuVFJBVkVMX1NXQU1QWzBdLmNvbmNhdChjcykpO1xuICAgIH1cbiAgICBpZiAoZWZmZWN0cyAmIDB4MDEpIHsgLy8gc2hvb3Rpbmcgc3RhdHVlc1xuICAgICAgdGVycmFpbi5lbnRlciA9ICh0ZXJyYWluLmVudGVyIHx8IFtbXV0pLm1hcChjcyA9PiBDYXBhYmlsaXR5LlNIT09USU5HX1NUQVRVRVswXS5jb25jYXQoY3MpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRlcnJhaW47XG4gIH1cbn0pKCk7XG5cbi8vIFRPRE8gLSBmaWd1cmUgb3V0IHdoYXQgdGhpcyBsb29rcyBsaWtlLi4uP1xuLy8gIC0gbWF5YmUgd2UganVzdCB3YW50IHRvIG1ha2UgYSBwc2V1ZG8gREVGRUFURURfSU5TRUNUIGV2ZW50LCBidXQgdGhpcyB3b3VsZCBuZWVkIHRvIGJlXG4vLyAgICBzZXBhcmF0ZSBmcm9tIDEwMSwgc2luY2UgdGhhdCdzIGF0dGFjaGVkIHRvIHRoZSBpdGVtZ2V0LCB3aGljaCB3aWxsIG1vdmUgd2l0aCB0aGUgc2xvdCFcbi8vICAtIHByb2JhYmx5IHdhbnQgYSBmbGFnIGZvciBlYWNoIGJvc3MgZGVmZWF0ZWQuLi4/XG4vLyAgICBjb3VsZCB1c2UgYm9zc2tpbGwgSUQgZm9yIGl0P1xuLy8gICAgLSB0aGVuIG1ha2UgdGhlIGRyb3AgYSBzaW1wbGUgZGVyaXZhdGl2ZSBmcm9tIHRoYXQuLi5cbi8vICAgIC0gdXBzaG90IC0gbm8gbG9uZ2VyIG5lZWQgdG8gbWl4IGl0IGludG8gbnBjKCkgb3IgdHJpZ2dlcigpIG92ZXJsYXksIGluc3RlYWQgbW92ZSBpdFxuLy8gICAgICB0byBjYXBhYmlsaXR5IG92ZXJsYXkuXG4vLyBmdW5jdGlvbiBzbG90Rm9yPFQ+KGl0ZW06IFQpOiBUIHsgcmV0dXJuIGl0ZW07IH1cbiJdfQ==