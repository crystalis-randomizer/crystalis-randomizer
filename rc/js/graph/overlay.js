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
    0x2f6,
    0x2fa,
];
const FLAG_MAP = new Map([
    [0x00a, Event.STARTED_WINDMILL],
    [0x013, Boss.SABERA1],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9ncmFwaC9vdmVybGF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFTLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFDN0QsSUFBSSxFQUFxQixHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQUUsUUFBUSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBSy9DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFhbkMsTUFBTSxjQUFjLEdBQUc7SUFDckIsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFFTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFHTCxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLO0lBRTFCLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLO0lBQ3RE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SyxDQUFDLE1BQU0sQ0FBQzthQUM3QjtZQUNELElBQUksT0FBTyxHQUFHLElBQUk7Z0JBQUUsT0FBTyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1NBQ2xEO1FBQ0QsSUFBSSxPQUFPLEdBQUcsSUFBSSxFQUFFO1lBQ2xCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzFGO1FBQ0QsSUFBSSxPQUFPLEdBQUcsSUFBSSxFQUFFO1lBQ2xCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzdGO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztBQUNILENBQUMsQ0FBQyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0Jvc3MsIENhcGFiaWxpdHksIENoZWNrLCBDb25kaXRpb24sIEV2ZW50LCBJdGVtLCBNYWdpYywgTXV0YWJsZVJlcXVpcmVtZW50LFxuICAgICAgICBSZXF1aXJlbWVudCwgU2xvdCwgVGVycmFpbiwgV2FsbFR5cGUsIGFuZCwgbWVldCwgb3J9IGZyb20gJy4vY29uZGl0aW9uLmpzJztcbmltcG9ydCB7VGlsZUlkLCBTY3JlZW5JZH0gZnJvbSAnLi9nZW9tZXRyeS5qcyc7XG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4uL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge0Jvc3MgYXMgUm9tQm9zc30gZnJvbSAnLi4vcm9tL2Jvc3Nlcy5qcyc7XG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICcuLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtTaG9wVHlwZX0gZnJvbSAnLi4vcm9tL3Nob3AuanMnO1xuaW1wb3J0IHtoZXh9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcblxuLy8gQWRkaXRpb25hbCBpbmZvcm1hdGlvbiBuZWVkZWQgdG8gaW50ZXJwcmV0IHRoZSB3b3JsZCBncmFwaCBkYXRhLlxuLy8gVGhpcyBnZXRzIGludG8gbW9yZSBzcGVjaWZpY3MgYW5kIGhhcmRjb2RpbmcuXG5cbi8vIFRPRE8gLSBtYXliZSBjb25zaWRlciBoYXZpbmcgYSBzZXQgb2YgQVNTVU1FRCBhbmQgYSBzZXQgb2YgSUdOT1JFRCBmbGFncz9cbi8vICAgICAgLSBlLmcuIGFsd2F5cyBhc3N1bWUgMDBmIGlzIEZBTFNFIHJhdGhlciB0aGFuIFRSVUUsIHRvIGF2b2lkIGZyZWUgd2luZG1pbGwga2V5XG5cblxuLy8gVE9ETyAtIHByaXNvbiBrZXkgbWlzc2luZyBmcm9tIHBhcmFseXNpcyBkZXBzIChvciByYXRoZXIgYSBub24tZmxpZ2h0IHZlcnNpb24pIVxuXG5cblxuY29uc3QgUkVMRVZBTlRfRkxBR1MgPSBbXG4gIDB4MDBhLCAvLyB1c2VkIHdpbmRtaWxsIGtleVxuICAweDAwYiwgLy8gdGFsa2VkIHRvIGxlYWYgZWxkZXJcbiAgMHgwMTgsIC8vIGVudGVyZWQgdW5kZXJncm91bmQgY2hhbm5lbFxuICAweDAxYiwgLy8gbWVzaWEgcmVjb3JkaW5nIHBsYXllZFxuICAweDAxZSwgLy8gcXVlZW4gcmV2ZWFsZWRcbiAgMHgwMjEsIC8vIHJldHVybmVkIGZvZyBsYW1wXG4gIDB4MDI0LCAvLyBnZW5lcmFscyBkZWZlYXRlZCAoZ290IGl2b3J5IHN0YXR1ZSlcbiAgMHgwMjUsIC8vIGhlYWxlZCBkb2xwaGluXG4gIDB4MDI2LCAvLyBlbnRlcmVkIHNoeXJvbiAoZm9yIGdvYSBndWFyZHMpXG4gIDB4MDI3LCAvLyBzaHlyb24gbWFzc2FjcmVcbiAgLy8gMHgzNSwgLy8gY3VyZWQgYWthaGFuYVxuICAweDAzOCwgLy8gbGVhZiBhYmR1Y3Rpb25cbiAgMHgwM2EsIC8vIHRhbGtlZCB0byB6ZWJ1IGluIGNhdmUgKGFkZGVkIGFzIHJlcSBmb3IgYWJkdWN0aW9uKVxuICAweDAzYiwgLy8gdGFsa2VkIHRvIHplYnUgaW4gc2h5cm9uIChhZGRlZCBhcyByZXEgZm9yIG1hc3NhY3JlKVxuICAweDA0NSwgLy8gcmVzY3VlZCBjaGlsZFxuICAweDA1MiwgLy8gdGFsa2VkIHRvIGR3YXJmIG1vdGhlclxuICAweDA1MywgLy8gY2hpbGQgZm9sbG93aW5nXG4gIDB4MDYxLCAvLyB0YWxrZWQgdG8gc3RvbSBpbiBzd2FuIGh1dFxuICAvLyAweDA2YywgLy8gZGVmZWF0ZWQgZHJheWdvbiAxXG4gIDB4MDcyLCAvLyBrZW5zdSBmb3VuZCBpbiB0YXZlcm5cbiAgMHgwOGIsIC8vIGdvdCBzaGVsbCBmbHV0ZVxuICAweDA5YiwgLy8gYWJsZSB0byByaWRlIGRvbHBoaW5cbiAgMHgwYTUsIC8vIHRhbGtlZCB0byB6ZWJ1IHN0dWRlbnRcbiAgMHgwYTksIC8vIHRhbGtlZCB0byBsZWFmIHJhYmJpdFxuICAweDEwMCwgLy8ga2lsbGVkIHZhbXBpcmUgMVxuICAweDEwMSwgLy8ga2lsbGVkIGluc2VjdFxuICAweDEwMiwgLy8ga2lsbGVkIGtlbGJlc3F1ZSAxXG4gIDB4MTAzLCAvLyByYWdlXG4gIDB4MTA0LCAvLyBraWxsZWQgc2FiZXJhIDFcbiAgMHgxMDUsIC8vIGtpbGxlZCBtYWRvIDFcbiAgMHgxMDYsIC8vIGtpbGxlZCBrZWxiZXNxdWUgMlxuICAweDEwNywgLy8ga2lsbGVkIHNhYmVyYSAyXG4gIDB4MTA4LCAvLyBraWxsZWQgbWFkbyAyXG4gIDB4MTA5LCAvLyBraWxsZWQga2FybWluZVxuICAweDEwYSwgLy8ga2lsbGVkIGRyYXlnb24gMVxuICAweDEwYiwgLy8ga2lsbGVkIGRyYXlnb24gMlxuICAweDEwYywgLy8ga2lsbGVkIHZhbXBpcmUgMlxuXG4gIC8vIHN3b3JkcyAobWF5IGJlIG5lZWRlZCBmb3IgcmFnZSwgU29UIGZvciBtYXNzYWNyZSlcbiAgMHgyMDAsIDB4MjAxLCAweDIwMiwgMHgyMDMsXG4gIC8vIGJhbGxzIGFuZCBicmFjZWxldHMgbWF5IGJlIG5lZWRlZCBmb3IgdGVsZXBvcnRcbiAgMHgyMDUsIDB4MjA2LCAweDIwNywgMHgyMDgsIDB4MjA5LCAweDIwYSwgMHgyMGIsIDB4MjBjLFxuICAweDIzNiwgLy8gc2hlbGwgZmx1dGUgKGZvciBmaXNoZXJtYW4gc3Bhd24pXG4gIDB4MjQzLCAvLyB0ZWxlcGF0aHkgKGZvciByYWJiaXQsIG9haywgZGVvKVxuICAweDI0NCwgLy8gdGVsZXBvcnQgKGZvciBtdCBzYWJyZSB0cmlnZ2VyKVxuICAweDI4MywgLy8gY2FsbWVkIHNlYSAoZm9yIGJhcnJpZXIpXG4gIDB4MmVlLCAvLyBzdGFydGVkIHdpbmRtaWxsIChmb3IgcmVmcmVzaClcblxuICAvLyBOT1RFOiB0aGVzZSBhcmUgbW92ZWQgYmVjYXVzZSBvZiB6b21iaWUgd2FycCFcbiAgMHgyZjYsIC8vIHdhcnA6b2FrIChmb3IgdGVsZXBhdGh5KVxuICAweDJmYSwgLy8gd2FycDpqb2VsIChmb3IgZXZpbCBzcGlyaXQgaXNsYW5kKVxuXG4gIC8vIE1hZ2ljLkNIQU5HRVswXVswXSxcbiAgLy8gTWFnaWMuVEVMRVBBVEhZWzBdWzBdLFxuXTtcblxuLy8gVE9ETyAtIHRoaXMgaXMgbm90IHBlcnZhc2l2ZSBlbm91Z2ghISFcbi8vICAtIG5lZWQgYSB3YXkgdG8gcHV0IGl0IGV2ZXJ5d2hlcmVcbi8vICAgIC0+IG1heWJlIGluIE11dGFibGVSZXF1aXJlbWVudHM/XG5jb25zdCBGTEFHX01BUDogTWFwPG51bWJlciwgcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXT4gPSBuZXcgTWFwKFtcbiAgWzB4MDBhLCBFdmVudC5TVEFSVEVEX1dJTkRNSUxMXSwgLy8gdGhpcyBpcyByZWYnZCBvdXRzaWRlIHRoaXMgZmlsZSFcbiAgLy9bMHgwMGUsIE1hZ2ljLlRFTEVQQVRIWV0sXG4gIC8vWzB4MDNmLCBNYWdpYy5URUxFUE9SVF0sXG4gIFsweDAxMywgQm9zcy5TQUJFUkExXSxcbiAgLy8gUXVlZW4gd2lsbCBnaXZlIGZsdXRlIG9mIGxpbWUgdy9vIHBhcmFseXNpcyBpbiB0aGlzIGNhc2UuXG4gIC8vIFsweDAxNywgSXRlbS5TV09SRF9PRl9XQVRFUl0sXG4gIFsweDAyOCwgTWFnaWMuQ0hBTkdFXSxcbiAgWzB4MDI5LCBNYWdpYy5DSEFOR0VdLFxuICBbMHgwMmEsIE1hZ2ljLkNIQU5HRV0sXG4gIFsweDAyYiwgTWFnaWMuQ0hBTkdFXSxcbiAgWzB4MDZjLCBCb3NzLkRSQVlHT04xXSxcbiAgWzB4MDhiLCBJdGVtLlNIRUxMX0ZMVVRFXSxcbl0pO1xuXG4vLyBNYXBzIHRyaWdnZXIgYWN0aW9ucyB0byB0aGUgc2xvdCB0aGV5IGdyYW50LlxuY29uc3QgVFJJR0dFUl9BQ1RJT05fSVRFTVM6IHtbYWN0aW9uOiBudW1iZXJdOiBTbG90fSA9IHtcbiAgMHgwODogU2xvdChNYWdpYy5QQVJBTFlTSVMpLFxuICAweDBiOiBTbG90KE1hZ2ljLkJBUlJJRVIpLFxuICAweDBmOiBTbG90KE1hZ2ljLlJFRlJFU0gpLFxuICAweDE4OiBTbG90KE1hZ2ljLlRFTEVQQVRIWSksXG59O1xuXG5jb25zdCBTV09SRFMgPSBbSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLlNXT1JEX09GX0ZJUkUsXG4gICAgICAgICAgICAgICAgSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5TV09SRF9PRl9USFVOREVSXSBhcyBjb25zdDtcbmNvbnN0IFNXT1JEX1BPV0VSUyA9IFtcbiAgW0l0ZW0uT1JCX09GX1dJTkQsIEl0ZW0uVE9STkFET19CUkFDRUxFVF0sXG4gIFtJdGVtLk9SQl9PRl9GSVJFLCBJdGVtLkZMQU1FX0JSQUNFTEVUXSxcbiAgW0l0ZW0uT1JCX09GX1dBVEVSLCBJdGVtLkJMSVpaQVJEX0JSQUNFTEVUXSxcbiAgW0l0ZW0uT1JCX09GX1RIVU5ERVIsIEl0ZW0uU1RPUk1fQlJBQ0VMRVRdLFxuXSBhcyBjb25zdDtcblxuZnVuY3Rpb24gc3dvcmRSZXF1aXJlbWVudChzd29yZDogbnVtYmVyLCBsZXZlbDogbnVtYmVyKTogUmVxdWlyZW1lbnQge1xuICBsZXQgcjtcbiAgaWYgKGxldmVsID09PSAxKSByPSBTV09SRFNbc3dvcmRdO1xuICBlbHNlIGlmIChsZXZlbCA9PT0gMykgcj0gYW5kKFNXT1JEU1tzd29yZF0sIC4uLlNXT1JEX1BPV0VSU1tzd29yZF0pO1xuICBlbHNlIHI9IG9yKC4uLlNXT1JEX1BPV0VSU1tzd29yZF0ubWFwKHAgPT4gYW5kKFNXT1JEU1tzd29yZF0sIHApKSk7XG4gIGlmIChBcnJheS5pc0FycmF5KHJbMF1bMF0pKSB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgcmV0dXJuIHI7XG59XG5cbmV4cG9ydCBjbGFzcyBPdmVybGF5IHtcblxuICBwcml2YXRlIHJlYWRvbmx5IHJlbGV2YW50RmxhZ3MgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgLy8gbnBjIGlkIC0+IHdhbnRlZCBpdGVtXG4gIHByaXZhdGUgcmVhZG9ubHkgdHJhZGVJbnMgPSBuZXcgTWFwPG51bWJlciwgcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXT4oKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IHNob290aW5nU3RhdHVlcyA9IG5ldyBTZXQ8U2NyZWVuSWQ+KCk7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGZsYWdzOiBGbGFnU2V0LFxuICAgICAgICAgICAgICBwcml2YXRlIHJlYWRvbmx5IHRyYWNrZXI6IGJvb2xlYW4pIHtcbiAgICAvLyBUT0RPIC0gYWRqdXN0IGJhc2VkIG9uIGZsYWdzZXQ/XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIFJFTEVWQU5UX0ZMQUdTKSB7XG4gICAgICB0aGlzLnJlbGV2YW50RmxhZ3MuYWRkKGZsYWcpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygcm9tLml0ZW1zKSB7XG4gICAgICBpZiAoIWl0ZW0udHJhZGVJbikgY29udGludWU7XG4gICAgICBjb25zdCBjb25kID0gaXRlbS5pZCA9PT0gMHgxZCA/IENhcGFiaWxpdHkuQlVZX0hFQUxJTkcgOiBJdGVtKGl0ZW0uaWQpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtLnRyYWRlSW4ubGVuZ3RoOyBpICs9IDYpIHtcbiAgICAgICAgdGhpcy50cmFkZUlucy5zZXQoaXRlbS50cmFkZUluW2ldLCBjb25kKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBsb2Mgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2Muc3Bhd25zKSB7XG4gICAgICAgIGlmIChzcGF3bi5pc01vbnN0ZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHgzZikgeyAvLyBzaG9vdGluZyBzdGF0dWVzXG4gICAgICAgICAgdGhpcy5zaG9vdGluZ1N0YXR1ZXMuYWRkKFNjcmVlbklkLmZyb20obG9jLCBzcGF3bikpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vICAgMHgxZCwgLy8gbWVkaWNhbCBoZXJiXG4gICAgLy8gICAweDI1LCAvLyBzdGF0dWUgb2Ygb255eFxuICAgIC8vICAgMHgzNSwgLy8gZm9nIGxhbXBcbiAgICAvLyAgIDB4M2IsIC8vIGxvdmUgcGVuZGFudFxuICAgIC8vICAgMHgzYywgLy8ga2lyaXNhIHBsYW50XG4gICAgLy8gICAweDNkLCAvLyBpdm9yeSBzdGF0dWVcbiAgICAvLyBdLm1hcChpID0+IHRoaXMucm9tLml0ZW1zW2ldKTtcbiAgfVxuXG4gIC8qKiBAcGFyYW0gaWQgT2JqZWN0IElEIG9mIHRoZSBib3NzLiAqL1xuICBib3NzUmVxdWlyZW1lbnRzKGJvc3M6IFJvbUJvc3MpOiBSZXF1aXJlbWVudCB7XG4gICAgLy8gVE9ETyAtIGhhbmRsZSBib3NzIHNodWZmbGUgc29tZWhvdz9cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLnJhZ2UpIHtcbiAgICAgIGlmICh0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFncy5yYW5kb21pemVUcmFkZXMoKSkgcmV0dXJuIENhcGFiaWxpdHkuU1dPUkQ7XG4gICAgICAvLyByZXR1cm4gSXRlbS5TV09SRF9PRl9XQVRFUjtcbiAgICAgIHJldHVybiBDb25kaXRpb24odGhpcy5yb20ubnBjc1sweGMzXS5sb2NhbERpYWxvZ3MuZ2V0KC0xKSFbMF0uY29uZGl0aW9uKTtcbiAgICB9XG4gICAgY29uc3QgaWQgPSBib3NzLm9iamVjdDtcbiAgICBjb25zdCBvdXQgPSBuZXcgTXV0YWJsZVJlcXVpcmVtZW50KCk7XG4gICAgaWYgKHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzLnNodWZmbGVCb3NzRWxlbWVudHMoKSkge1xuICAgICAgb3V0LmFkZEFsbChDYXBhYmlsaXR5LlNXT1JEKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuZmxhZ3MuZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpKSB7XG4gICAgICBjb25zdCBsZXZlbCA9IHRoaXMuZmxhZ3MuZ3VhcmFudGVlU3dvcmRNYWdpYygpID8gYm9zcy5zd29yZExldmVsIDogMTtcbiAgICAgIGNvbnN0IG9iaiA9IHRoaXMucm9tLm9iamVjdHNbaWRdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyBpKyspIHtcbiAgICAgICAgaWYgKG9iai5pc1Z1bG5lcmFibGUoaSkpIG91dC5hZGRBbGwoc3dvcmRSZXF1aXJlbWVudChpLCBsZXZlbCkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQuYWRkQWxsKENhcGFiaWxpdHkuU1dPUkQpO1xuICAgIH1cbiAgICBjb25zdCBleHRyYTogQ2FwYWJpbGl0eVtdID0gW107XG4gICAgaWYgKHRoaXMuZmxhZ3MuZ3VhcmFudGVlUmVmcmVzaCgpKSB7XG4gICAgICAvLyBUT0RPIC0gbWFrZSB0aGlzIFwiZ3VhcmFudGVlIGRlZmVuc2l2ZSBtYWdpY1wiIGFuZCBhbGxvdyByZWZyZXNoIE9SIGJhcnJpZXI/XG4gICAgICBleHRyYS5wdXNoKE1hZ2ljLlJFRlJFU0gpO1xuICAgIH1cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLmluc2VjdCkgeyAvLyBpbnNlY3RcbiAgICAgIGV4dHJhLnB1c2goSXRlbS5JTlNFQ1RfRkxVVEUsIEl0ZW0uR0FTX01BU0spO1xuICAgIH1cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLmRyYXlnb24yKSB7XG4gICAgICBleHRyYS5wdXNoKEl0ZW0uQk9XX09GX1RSVVRIKTtcbiAgICAgIGlmICh0aGlzLmZsYWdzLnN0b3J5TW9kZSgpKSB7XG4gICAgICAgIGV4dHJhLnB1c2goXG4gICAgICAgICAgQm9zcy5LRUxCRVNRVUUxLFxuICAgICAgICAgIEJvc3MuS0VMQkVTUVVFMixcbiAgICAgICAgICBCb3NzLlNBQkVSQTEsXG4gICAgICAgICAgQm9zcy5TQUJFUkEyLFxuICAgICAgICAgIEJvc3MuTUFETzEsXG4gICAgICAgICAgQm9zcy5NQURPMixcbiAgICAgICAgICBCb3NzLktBUk1JTkUsXG4gICAgICAgICAgQm9zcy5EUkFZR09OMSxcbiAgICAgICAgICBJdGVtLlNXT1JEX09GX1dJTkQsXG4gICAgICAgICAgSXRlbS5TV09SRF9PRl9GSVJFLFxuICAgICAgICAgIEl0ZW0uU1dPUkRfT0ZfV0FURVIsXG4gICAgICAgICAgSXRlbS5TV09SRF9PRl9USFVOREVSKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGV4dHJhLmxlbmd0aCkge1xuICAgICAgb3V0LnJlc3RyaWN0KGFuZCguLi5leHRyYSkpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmZyZWV6ZSgpO1xuICB9XG5cbiAgbG9jYXRpb25zKCk6IFRpbGVDaGVja1tdIHtcbiAgICBjb25zdCBsb2NhdGlvbnM6IFRpbGVDaGVja1tdID0gW107XG4gICAgLy8gVE9ETyAtIHB1bGwgdGhlIGxvY2F0aW9uIG91dCBvZiBpdGVtVXNlRGF0YVswXSBmb3IgdGhlc2UgaXRlbXNcbiAgICBsb2NhdGlvbnMucHVzaCh7XG4gICAgICB0aWxlOiBUaWxlSWQoMHgwZjAwODgpLFxuICAgICAgc2xvdDogU2xvdChFdmVudC5TVEFSVEVEX1dJTkRNSUxMKSxcbiAgICAgIGNvbmRpdGlvbjogSXRlbS5XSU5ETUlMTF9LRVksXG4gICAgfSwge1xuICAgICAgdGlsZTogVGlsZUlkKDB4ZTQwMDg4KSxcbiAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX0pPRUxfU0hFRCksXG4gICAgICBjb25kaXRpb246IEl0ZW0uRVlFX0dMQVNTRVMsXG4gICAgfSk7XG4gICAgZm9yIChjb25zdCBzaG9wIG9mIHRoaXMucm9tLnNob3BzKSB7XG4gICAgICAvLyBsZWFmIGFuZCBzaHlyb24gbWF5IG5vdCBhbHdheXMgYmUgYWNjZXNzaWJsZSwgc28gZG9uJ3QgcmVseSBvbiB0aGVtLlxuICAgICAgaWYgKHNob3AubG9jYXRpb24gPT09IDB4YzMgfHwgc2hvcC5sb2NhdGlvbiA9PT0gMHhmNikgY29udGludWU7XG4gICAgICBpZiAoIXNob3AudXNlZCkgY29udGludWU7XG4gICAgICBpZiAoc2hvcC50eXBlICE9PSBTaG9wVHlwZS5UT09MKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGNoZWNrID0ge1xuICAgICAgICB0aWxlOiBUaWxlSWQoc2hvcC5sb2NhdGlvbiA8PCAxNiB8IDB4ODgpLFxuICAgICAgICBjb25kaXRpb246IENhcGFiaWxpdHkuTU9ORVksXG4gICAgICB9O1xuICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHNob3AuY29udGVudHMpIHtcbiAgICAgICAgaWYgKGl0ZW0gPT09IChJdGVtLk1FRElDQUxfSEVSQlswXVswXSAmIDB4ZmYpKSB7XG4gICAgICAgICAgbG9jYXRpb25zLnB1c2goey4uLmNoZWNrLCBzbG90OiBTbG90KENhcGFiaWxpdHkuQlVZX0hFQUxJTkcpfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSA9PT0gKEl0ZW0uV0FSUF9CT09UU1swXVswXSAmIDB4ZmYpKSB7XG4gICAgICAgICAgbG9jYXRpb25zLnB1c2goey4uLmNoZWNrLCBzbG90OiBTbG90KENhcGFiaWxpdHkuQlVZX1dBUlApfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxvY2F0aW9ucztcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHVuZGVmaW5lZCBpZiBpbXBhc3NhYmxlLiAqL1xuICBtYWtlVGVycmFpbihlZmZlY3RzOiBudW1iZXIsIHRpbGU6IFRpbGVJZCk6IFRlcnJhaW4gfCB1bmRlZmluZWQge1xuICAgIC8vIENoZWNrIGZvciBkb2xwaGluIG9yIHN3YW1wLiAgQ3VycmVudGx5IGRvbid0IHN1cHBvcnQgc2h1ZmZsaW5nIHRoZXNlLlxuICAgIGNvbnN0IGxvYyA9IHRpbGUgPj4+IDE2O1xuICAgIGVmZmVjdHMgJj0gMHgyNjtcbiAgICBpZiAobG9jID09PSAweDFhKSBlZmZlY3RzIHw9IDB4MDg7XG4gICAgaWYgKGxvYyA9PT0gMHg2MCB8fCBsb2MgPT09IDB4NjgpIGVmZmVjdHMgfD0gMHgxMDtcbiAgICAvLyBOT1RFOiBvbmx5IHRoZSB0b3AgaGFsZi1zY3JlZW4gaW4gdW5kZXJncm91bmQgY2hhbm5lbCBpcyBkb2xwaGluYWJsZVxuICAgIGlmIChsb2MgPT09IDB4NjQgJiYgKCh0aWxlICYgMHhmMGYwKSA8IDB4OTApKSBlZmZlY3RzIHw9IDB4MTA7XG4gICAgaWYgKHRoaXMuc2hvb3RpbmdTdGF0dWVzLmhhcyhTY3JlZW5JZC5mcm9tVGlsZSh0aWxlKSkpIGVmZmVjdHMgfD0gMHgwMTtcbiAgICBpZiAoZWZmZWN0cyAmIDB4MjApIHsgLy8gc2xvcGVcbiAgICAgIC8vIERldGVybWluZSBsZW5ndGggb2Ygc2xvcGU6IHNob3J0IHNsb3BlcyBhcmUgY2xpbWJhYmxlLlxuICAgICAgLy8gNi04IGFyZSBib3RoIGRvYWJsZSB3aXRoIGJvb3RzXG4gICAgICAvLyAwLTUgaXMgZG9hYmxlIHdpdGggbm8gYm9vdHNcbiAgICAgIC8vIDkgaXMgZG9hYmxlIHdpdGggcmFiYml0IGJvb3RzIG9ubHkgKG5vdCBhd2FyZSBvZiBhbnkgb2YgdGhlc2UuLi4pXG4gICAgICAvLyAxMCBpcyByaWdodCBvdXRcbiAgICAgIGNvbnN0IGdldEVmZmVjdHMgPSAodGlsZTogVGlsZUlkKTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgbCA9IHRoaXMucm9tLmxvY2F0aW9uc1t0aWxlID4+PiAxNl07XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IGwuc2NyZWVuc1sodGlsZSAmIDB4ZjAwMCkgPj4+IDEyXVsodGlsZSAmIDB4ZjAwKSA+Pj4gOF07XG4gICAgICAgIHJldHVybiB0aGlzLnJvbS50aWxlRWZmZWN0c1tsLnRpbGVFZmZlY3RzIC0gMHhiM11cbiAgICAgICAgICAgIC5lZmZlY3RzW3RoaXMucm9tLnNjcmVlbnNbc2NyZWVuXS50aWxlc1t0aWxlICYgMHhmZl1dO1xuICAgICAgfTtcbiAgICAgIGxldCBib3R0b20gPSB0aWxlO1xuICAgICAgbGV0IGhlaWdodCA9IC0xO1xuICAgICAgd2hpbGUgKGdldEVmZmVjdHMoYm90dG9tKSAmIDB4MjApIHtcbiAgICAgICAgYm90dG9tID0gVGlsZUlkLmFkZChib3R0b20sIDEsIDApO1xuICAgICAgICBoZWlnaHQrKztcbiAgICAgIH1cbiAgICAgIGxldCB0b3AgPSB0aWxlO1xuICAgICAgd2hpbGUgKGdldEVmZmVjdHModG9wKSAmIDB4MjApIHtcbiAgICAgICAgdG9wID0gVGlsZUlkLmFkZCh0b3AsIC0xLCAwKTtcbiAgICAgICAgaGVpZ2h0Kys7XG4gICAgICB9XG4gICAgICBpZiAoaGVpZ2h0IDwgNikge1xuICAgICAgICBlZmZlY3RzICY9IH4weDIwO1xuICAgICAgfSBlbHNlIGlmIChoZWlnaHQgPCA5KSB7XG4gICAgICAgIGVmZmVjdHMgfD0gMHg0MDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFRFUlJBSU5TW2VmZmVjdHNdO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNvbnNpZGVyIGZvbGRpbmcgdGhpcyBpbnRvIGxvY2F0aW9uL3RyaWdnZXIvbnBjIGFzIGFuIGV4dHJhIHJldHVybj9cbiAgZXh0cmFSb3V0ZXMoKTogRXh0cmFSb3V0ZVtdIHtcbiAgICBjb25zdCByb3V0ZXMgPSBbXTtcbiAgICBjb25zdCBlbnRyYW5jZSA9IChsb2NhdGlvbjogbnVtYmVyLCBlbnRyYW5jZTogbnVtYmVyID0gMCk6IFRpbGVJZCA9PiB7XG4gICAgICBjb25zdCBsID0gdGhpcy5yb20ubG9jYXRpb25zW2xvY2F0aW9uXTtcbiAgICAgIGNvbnN0IGUgPSBsLmVudHJhbmNlc1tlbnRyYW5jZV07XG4gICAgICByZXR1cm4gVGlsZUlkLmZyb20obCwgZSk7XG4gICAgfTtcbiAgICAvLyBTdGFydCB0aGUgZ2FtZSBhdCAwOjBcbiAgICByb3V0ZXMucHVzaCh7dGlsZTogZW50cmFuY2UoMCl9KTtcbiAgICAvLyBTd29yZCBvZiBUaHVuZGVyIHdhcnBcbiAgICAvLyBUT0RPIC0gZW50cmFuY2Ugc2h1ZmZsZSB3aWxsIGJyZWFrIHRoZSBhdXRvLXdhcnAtcG9pbnQgYWZmb3JkYW5jZS5cbiAgICBpZiAodGhpcy5mbGFncy50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCkpIHtcbiAgICAgIHJvdXRlcy5wdXNoKHtcbiAgICAgICAgdGlsZTogZW50cmFuY2UoMHhmMiksXG4gICAgICAgIGNvbmRpdGlvbjogb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUiwgQ2FwYWJpbGl0eS5CVVlfV0FSUCksXG4gICAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUiwgTWFnaWMuVEVMRVBPUlQpKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFncy5hc3N1bWVXaWxkV2FycCgpKSB7XG4gICAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMucm9tLndpbGRXYXJwLmxvY2F0aW9ucykge1xuICAgICAgICByb3V0ZXMucHVzaCh7dGlsZTogZW50cmFuY2UobG9jYXRpb24pfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByb3V0ZXM7XG4gIH1cblxuICAvLyBUT0RPIC0gY29uc2lkZXIgZm9sZGluZyB0aGlzIGludG8gbG9jYXRpb24vdHJpZ2dlci9ucGMgYXMgYW4gZXh0cmEgcmV0dXJuP1xuICBleHRyYUVkZ2VzKCk6IEV4dHJhRWRnZVtdIHtcbiAgICBjb25zdCBlZGdlcyA9IFtdO1xuICAgIC8vIG5lZWQgYW4gZWRnZSBmcm9tIHRoZSBib2F0IGhvdXNlIHRvIHRoZSBiZWFjaCAtIHdlIGNvdWxkIGJ1aWxkIHRoaXMgaW50byB0aGVcbiAgICAvLyBib2F0IGJvYXJkaW5nIHRyaWdnZXIsIGJ1dCBmb3Igbm93IGl0J3MgaGVyZS5cbiAgICBlZGdlcy5wdXNoKHtcbiAgICAgIGZyb206IFRpbGVJZCgweDUxMDA4OCksIC8vIGluIGZyb250IG9mIGJvYXQgaG91c2VcbiAgICAgIHRvOiBUaWxlSWQoMHg2MDg2ODgpLCAvLyBpbiBmcm9udCBvZiBjYWJpblxuICAgICAgY29uZGl0aW9uOiBFdmVudC5SRVRVUk5FRF9GT0dfTEFNUCxcbiAgICB9KTtcbiAgICByZXR1cm4gZWRnZXM7XG4gIH1cblxuICB0cmlnZ2VyKGlkOiBudW1iZXIpOiBUcmlnZ2VyRGF0YSB7XG4gICAgc3dpdGNoIChpZCkge1xuICAgIGNhc2UgMHg5YTogLy8gc3RhcnQgZmlnaHQgd2l0aCBtYWRvIGlmIHNoeXJvbiBtYXNzYWNyZSBzdGFydGVkXG4gICAgICAvLyBUT0RPIC0gbG9vayB1cCB3aG8gdGhlIGFjdHVhbCBib3NzIGlzIG9uY2Ugd2UgZ2V0IGJvc3Mgc2h1ZmZsZSEhIVxuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBtZWV0KEV2ZW50LlNIWVJPTl9NQVNTQUNSRSwgdGhpcy5ib3NzUmVxdWlyZW1lbnRzKHRoaXMucm9tLmJvc3Nlcy5tYWRvMSkpLFxuICAgICAgICBzbG90OiBTbG90KEJvc3MuTUFETzEpLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhhYTogLy8gZW50ZXIgb2FrIGFmdGVyIGluc2VjdFxuICAgICAgLy8gTk9URTogVGhpcyBpcyBub3QgdGhlIHRyaWdnZXIgdGhhdCBjaGVja3MsIGJ1dCByYXRoZXIgaXQgaGFwcGVucyBvbiB0aGUgZW50cmFuY2UuXG4gICAgICAvLyBUaGlzIGlzIGEgY29udmVuaWVudCBwbGFjZSB0byBoYW5kbGUgaXQsIHRob3VnaCwgc2luY2Ugd2UgYWxyZWFkeSBuZWVkIHRvIGV4cGxpY2l0bHlcbiAgICAgIC8vIGlnbm9yZSB0aGlzIHRyaWdnZXIuICBXZSBhbHNvIHJlcXVpcmUgd2FycCBib290cyBiZWNhdXNlIGl0J3MgcG9zc2libGUgdGhhdCB0aGVyZSdzXG4gICAgICAvLyBubyBkaXJlY3Qgd2Fsa2luZyBwYXRoIGFuZCBpdCdzIG5vdCBmZWFzaWJsZSB0byBjYXJyeSB0aGUgY2hpbGQgd2l0aCB1cyBldmVyeXdoZXJlLFxuICAgICAgLy8gZHVlIHRvIGdyYXBoaWNzIHJlYXNvbnMuXG4gICAgICByZXR1cm4ge2NoZWNrOlt7XG4gICAgICAgIGNvbmRpdGlvbjogYW5kKEV2ZW50LkRXQVJGX0NISUxELCBDYXBhYmlsaXR5LkJVWV9XQVJQKSxcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5SRVNDVUVEX0NISUxEKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YWQ6IC8vIGFsbG93IG9wZW5pbmcgcHJpc29uIGRvb3JcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogSXRlbS5LRVlfVE9fUFJJU09OLFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9QUklTT04pLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhhZTogLy8gYWxsb3cgb3BlbmluZyBzdHh5XG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IEl0ZW0uS0VZX1RPX1NUWVgsXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX1NUWVgpLFxuICAgICAgfV19O1xuICAgIGNhc2UgMHhhZjogLy8gYWxsb3cgY2FsbWluZyBzZWFcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogSXRlbS5TVEFUVUVfT0ZfR09MRCxcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5DQUxNRURfU0VBKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YjE6IC8vIHN0YXJ0IGZpZ2h0IHdpdGggZ3VhcmRpYW4gc3RhdHVlc1xuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBhbmQoSXRlbS5CT1dfT0ZfU1VOLCBJdGVtLkJPV19PRl9NT09OKSxcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5PUEVORURfQ1JZUFQpLFxuICAgICAgfV19O1xuICAgIH1cbiAgICAvLyBDaGVjayBmb3IgcmVsZXZhbnQgZmxhZ3MgYW5kIGtub3duIGFjdGlvbiB0eXBlcy5cbiAgICBjb25zdCB0cmlnZ2VyID0gdGhpcy5yb20udHJpZ2dlcnNbaWQgJiAweDdmXTtcbiAgICBpZiAoIXRyaWdnZXIgfHwgIXRyaWdnZXIudXNlZCkgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRyaWdnZXI6ICR7aGV4KGlkKX1gKTtcbiAgICBjb25zdCByZWxldmFudCA9IChmOiBudW1iZXIpID0+IHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZik7XG4gICAgY29uc3QgcmVsZXZhbnRBbmRTZXQgPSAoZjogbnVtYmVyKSA9PiBmID4gMCAmJiB0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGYpO1xuICAgIGZ1bmN0aW9uIG1hcChmOiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgaWYgKGYgPCAwKSByZXR1cm4gfm1hcCh+Zik7XG4gICAgICBjb25zdCBtYXBwZWQgPSBGTEFHX01BUC5nZXQoZik7XG4gICAgICByZXR1cm4gbWFwcGVkICE9IG51bGwgPyBtYXBwZWRbMF1bMF0gOiBmO1xuICAgIH1cbiAgICBjb25zdCBhY3Rpb25JdGVtID0gVFJJR0dFUl9BQ1RJT05fSVRFTVNbdHJpZ2dlci5tZXNzYWdlLmFjdGlvbl07XG4gICAgY29uc3QgY29uZGl0aW9uID0gYW5kKC4uLnRyaWdnZXIuY29uZGl0aW9ucy5tYXAobWFwKS5maWx0ZXIocmVsZXZhbnRBbmRTZXQpLm1hcChDb25kaXRpb24pKTtcbiAgICBpZiAodHJpZ2dlci5tZXNzYWdlLmFjdGlvbiA9PT0gMHgxOSkgeyAvLyBwdXNoLWRvd24gdHJpZ2dlclxuICAgICAgLy8gVE9ETyAtIHBhc3MgaW4gdGVycmFpbjsgaWYgb24gbGFuZCBhbmQgdHJpZ2dlciBza2lwIGlzIG9uIHRoZW5cbiAgICAgIC8vIGFkZCBhIHJvdXRlIHJlcXVpcmluZyByYWJiaXQgYm9vdHMgYW5kIGVpdGhlciB3YXJwIGJvb3RzIG9yIHRlbGVwb3J0P1xuICAgICAgY29uc3QgZXh0cmE6IFRyaWdnZXJEYXRhID0ge307XG4gICAgICBpZiAodHJpZ2dlci5pZCA9PT0gMHg4NiAmJiAhdGhpcy5mbGFncy5hc3N1bWVSYWJiaXRTa2lwKCkpIHtcbiAgICAgICAgZXh0cmEuZHggPSBbLTMyLCAtMTYsIDAsIDE2XTtcbiAgICAgIH1cbiAgICAgIGlmICh0cmlnZ2VyLmlkID09PSAweGJhICYmXG4gICAgICAgICAgIXRoaXMuZmxhZ3MuZGlzYWJsZVRlbGVwb3J0U2tpcCgpICYmXG4gICAgICAgICAgIXRoaXMuZmxhZ3MuYXNzdW1lVGVsZXBvcnRTa2lwKCkpIHtcbiAgICAgICAgZXh0cmEuZXh0cmFMb2NhdGlvbnMgPSBbdGhpcy5yb20ubG9jYXRpb25zLkNvcmRlbFBsYWluV2VzdF07XG4gICAgICB9XG4gICAgICBjb25zdCBjb25kID1cbiAgICAgICAgICB0cmlnZ2VyLmNvbmRpdGlvbnMubWFwKGMgPT4gYyA8IDAgJiYgcmVsZXZhbnQofm1hcChjKSkgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ29uZGl0aW9uKH5tYXAoYykpIDogbnVsbClcbiAgICAgICAgICAgICAgLmZpbHRlcigoYzogdW5rbm93bik6IGMgaXMgW1tDb25kaXRpb25dXSA9PiBjICE9IG51bGwpO1xuICAgICAgaWYgKGNvbmQgJiYgY29uZC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHsuLi5leHRyYSwgdGVycmFpbjoge2V4aXQ6IG9yKC4uLmNvbmQpfX07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhY3Rpb25JdGVtICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7Y29uZGl0aW9uLCBzbG90OiBhY3Rpb25JdGVtfV19O1xuICAgIH1cbiAgICBjb25zdCBmbGFncyA9IHRyaWdnZXIuZmxhZ3MuZmlsdGVyKHJlbGV2YW50QW5kU2V0KTtcbiAgICBpZiAoZmxhZ3MubGVuZ3RoKSB7XG4gICAgICByZXR1cm4ge2NoZWNrOiBmbGFncy5tYXAoZiA9PiAoe2NvbmRpdGlvbiwgc2xvdDogU2xvdChmKX0pKX07XG4gICAgfVxuXG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgbnBjKGlkOiBudW1iZXIsIGxvYzogTG9jYXRpb24pOiBOcGNEYXRhIHtcbiAgICBjb25zdCBucGMgPSB0aGlzLnJvbS5ucGNzW2lkXTtcbiAgICBpZiAoIW5wYyB8fCAhbnBjLnVzZWQpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0cmlnZ2VyOiAke2hleChpZCl9YCk7XG5cbiAgICBjb25zdCBzcGF3bkNvbmRpdGlvbnM6IHJlYWRvbmx5IG51bWJlcltdID0gbnBjLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jLmlkKSB8fCBbXTtcblxuICAgIGNvbnN0IHJlc3VsdDogTnBjRGF0YSAmIHtjaGVjazogQ2hlY2tbXX0gPSB7Y2hlY2s6IFtdfTtcblxuICAgIGlmIChucGMuZGF0YVsyXSAmIDB4MDQpIHtcbiAgICAgIC8vIHBlcnNvbiBpcyBhIHN0YXR1ZS5cbiAgICAgIHJlc3VsdC50ZXJyYWluID0ge1xuICAgICAgICBleGl0OiB0aGlzLmZsYWdzLmFzc3VtZVN0YXR1ZUdsaXRjaCgpID9cbiAgICAgICAgICAgICAgICAgIFtbXV0gOiBcbiAgICAgICAgICAgICAgICAgIG9yKC4uLnNwYXduQ29uZGl0aW9ucy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgeCA9PiBGTEFHX01BUC5nZXQoeCkgfHwgKHRoaXMucmVsZXZhbnRGbGFncy5oYXMoeCkgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDb25kaXRpb24oeCkgOiBbXSkpKSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RhdHVlT3IoLi4ucmVxczogUmVxdWlyZW1lbnRbXSk6IHZvaWQge1xuICAgICAgaWYgKCFyZXN1bHQudGVycmFpbikgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHRlcnJhaW4gZm9yIGd1YXJkJyk7XG4gICAgICByZXN1bHQudGVycmFpbi5leGl0ID0gb3IocmVzdWx0LnRlcnJhaW4uZXhpdCB8fCBbXSwgLi4ucmVxcyk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGZvcnR1bmUgdGVsbGVyICgzOSkgcmVxdWlyZXMgYWNjZXNzIHRvIHBvcnRvYSB0byBnZXQgaGVyIHRvIG1vdmU/XG4gICAgLy8gICAgICAtPiBtYXliZSBpbnN0ZWFkIGNoYW5nZSB0aGUgZmxhZyB0byBzZXQgaW1tZWRpYXRlbHkgb24gdGFsa2luZyB0byBoZXJcbiAgICAvLyAgICAgICAgIHJhdGhlciB0aGFuIHRoZSB0cmlnZ2VyIG91dHNpZGUgdGhlIGRvb3IuLi4/IHRoaXMgd291bGQgYWxsb3cgZ2V0dGluZ1xuICAgIC8vICAgICAgICAgdGhyb3VnaCBpdCBieSBqdXN0IHRhbGtpbmcgYW5kIHRoZW4gbGVhdmluZyB0aGUgcm9vbS4uLlxuXG4gICAgc3dpdGNoIChpZCkge1xuICAgIGNhc2UgMHgxNDogLy8gd29rZW4tdXAgd2luZG1pbGwgZ3VhcmRcbiAgICAgIC8vIHNraXAgYmVjYXVzZSB3ZSB0aWUgdGhlIGl0ZW0gdG8gdGhlIHNsZWVwaW5nIG9uZS5cbiAgICAgIGlmIChsb2Muc3Bhd25zLmZpbmQobCA9PiBsLmlzTnBjKCkgJiYgbC5pZCA9PT0gMHgxNSkpIHJldHVybiB7fTtcbiAgICBjYXNlIDB4MjU6IC8vIGFtYXpvbmVzIGd1YXJkXG4gICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAwLCB4MTogMiwgeTA6IDAsIHkxOiAxfTtcbiAgICAgIHN0YXR1ZU9yKE1hZ2ljLkNIQU5HRSwgTWFnaWMuUEFSQUxZU0lTKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHgyZDogLy8gbXQgc2FicmUvc3dhbiBzb2xkaWVyc1xuICAgICAgLy8gVGhlc2UgZG9uJ3QgY291bnQgYXMgc3RhdHVlcyBiZWNhdXNlIHRoZXknbGwgbW92ZSBpZiB5b3UgdGFsayB0byB0aGVtLlxuICAgICAgZGVsZXRlIHJlc3VsdC50ZXJyYWluO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDMzOiAvLyBwb3J0b2EgZ3VhcmQgKHRocm9uZSByb29tLCB0aG91Z2ggdGhlIHBhbGFjZSBvbmUgaXMgdGhlIG9uZSB0aGF0IG1hdHRlcnMpXG4gICAgICAvLyBOT1RFOiB0aGlzIG1lYW5zIHRoYXQgd2UgY2Fubm90IHNlcGFyYXRlIHRoZSBwYWxhY2UgZm95ZXIgZnJvbSB0aGUgdGhyb25lIHJvb20sIHNpbmNlXG4gICAgICAvLyB0aGVyZSdzIG5vIHdheSB0byByZXByZXNlbnQgdGhlIGNvbmRpdGlvbiBmb3IgcGFyYWx5emluZyB0aGUgZ3VhcmQgYW5kIHN0aWxsIGhhdmUgaGltXG4gICAgICAvLyBwYXNzYWJsZSB3aGVuIHRoZSBxdWVlbiBpcyB0aGVyZS4gIFRoZSB3aG9sZSBzZXF1ZW5jZSBpcyBhbHNvIHRpZ2h0bHkgY291cGxlZCwgc28gaXRcbiAgICAgIC8vIHByb2JhYmx5IHdvdWxkbid0IG1ha2Ugc2Vuc2UgdG8gc3BsaXQgaXQgdXAgYW55d2F5LlxuICAgICAgc3RhdHVlT3IoTWFnaWMuUEFSQUxZU0lTKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHgzODogLy8gcG9ydG9hIHF1ZWVuIHNpdHRpbmcgb24gaW1wYXNzYWJsZSB0aHJvbmVcbiAgICAgIGlmIChsb2MuaWQgPT09IDB4ZGYpIHJlc3VsdC5oaXRib3ggPSB7eDA6IDAsIHgxOiAxLCB5MDogMiwgeTE6IDN9O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDRlOiAvLyBzaHlyb24gZ3VhcmRcbiAgICAgIHJlc3VsdC5oaXRib3ggPSB7eDA6IC0xLCB4MTogMiwgeTA6IDAsIHkxOiAxfTtcbiAgICAgIHN0YXR1ZU9yKE1hZ2ljLkNIQU5HRSwgRXZlbnQuRU5URVJFRF9TSFlST04pO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDgwOiAvLyBnb2EgZ3VhcmRzXG4gICAgICBzdGF0dWVPciguLi5zcGF3bkNvbmRpdGlvbnMubWFwKGMgPT4gQ29uZGl0aW9uKH5jKSkpOyAvLyBFdmVudC5FTlRFUkVEX1NIWVJPTlxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAweDg1OiAvLyBzdG9uZWQgcGFpclxuICAgICAgc3RhdHVlT3IoSXRlbS5GTFVURV9PRl9MSU1FKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIGludGVyc2VjdCBzcGF3biBjb25kaXRpb25zXG4gICAgY29uc3QgcmVxdWlyZW1lbnRzOiBBcnJheTxyZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dPiA9IFtdO1xuICAgIGNvbnN0IGFkZFJlcSA9IChmbGFnOiBudW1iZXIpOiB2b2lkID0+IHtcbiAgICAgIGlmIChmbGFnIDw9IDApIHJldHVybjsgLy8gbmVnYXRpdmUgb3IgemVybyBmbGFnIGlnbm9yZWRcbiAgICAgIGNvbnN0IHJlcSA9IEZMQUdfTUFQLmdldChmbGFnKSB8fCAodGhpcy5yZWxldmFudEZsYWdzLmhhcyhmbGFnKSA/IENvbmRpdGlvbihmbGFnKSA6IG51bGwpO1xuICAgICAgaWYgKHJlcSAhPSBudWxsKSByZXF1aXJlbWVudHMucHVzaChyZXEpO1xuICAgIH07XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIHNwYXduQ29uZGl0aW9ucykge1xuICAgICAgYWRkUmVxKGZsYWcpO1xuICAgIH1cblxuICAgIC8vIExvb2sgZm9yIHRyYWRlLWluc1xuICAgIC8vICAtIFRPRE8gLSBkb24ndCBoYXJkLWNvZGUgdGhlIE5QQ3M/IHJlYWQgZnJvbSB0aGUgaXRlbWRhdGE/XG4gICAgY29uc3QgdHJhZGVJbiA9IHRoaXMudHJhZGVJbnMuZ2V0KGlkKVxuICAgIGlmICh0cmFkZUluICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHQgPSB0cmFkZUluO1xuICAgICAgZnVuY3Rpb24gdHJhZGUoc2xvdDogU2xvdCwgLi4ucmVxczogQXJyYXk8cmVhZG9ubHkgW3JlYWRvbmx5IENvbmRpdGlvbltdXT4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgY29uZGl0aW9uID0gYW5kKC4uLnJlcXVpcmVtZW50cywgdCwgLi4ucmVxcyk7XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90LCBjb25kaXRpb259KTtcbiAgICAgIH1cbiAgICAgIGxldCB0cmFkZVIgPSB0cmFkZTtcbiAgICAgIGlmICh0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFncy5yYW5kb21pemVUcmFkZXMoKSkge1xuICAgICAgICB0cmFkZVIgPSAoc2xvdCwgLi4ucmVxcykgPT4ge1xuICAgICAgICAgIGNvbnN0IGl0ZW1zID0gW1xuICAgICAgICAgICAgSXRlbS5TVEFUVUVfT0ZfT05ZWCxcbiAgICAgICAgICAgIEl0ZW0uRk9HX0xBTVAsXG4gICAgICAgICAgICBJdGVtLkxPVkVfUEVOREFOVCxcbiAgICAgICAgICAgIEl0ZW0uS0lSSVNBX1BMQU5ULFxuICAgICAgICAgICAgSXRlbS5JVk9SWV9TVEFUVUUsXG4gICAgICAgICAgXTtcbiAgICAgICAgICBjb25zdCBjb25kaXRpb24gPVxuICAgICAgICAgICAgICBvciguLi5pdGVtcy5tYXAoaSA9PiBhbmQoLi4ucmVxdWlyZW1lbnRzLCBpLCAuLi5yZXFzKSkpO1xuICAgICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90LCBjb25kaXRpb259KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc3dpdGNoIChpZCkge1xuICAgICAgY2FzZSAweDE1OiAvLyBzbGVlcGluZyB3aW5kbWlsbCBndWFyZCA9PiB3aW5kbWlsbCBrZXkgc2xvdFxuICAgICAgICB0cmFkZShTbG90KEl0ZW0uV0lORE1JTExfS0VZKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDIzOiAvLyBhcnlsbGlzID0+IGJvdyBvZiBtb29uIHNsb3RcbiAgICAgICAgLy8gTk9URTogc2l0dGluZyBvbiBpbXBhc3NpYmxlIHRocm9uZVxuICAgICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAtMSwgeDE6IDIsIHkwOiAtMSwgeTE6IDJ9O1xuICAgICAgICB0cmFkZVIoU2xvdChJdGVtLkJPV19PRl9NT09OKSwgTWFnaWMuQ0hBTkdFKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NjM6IC8vIGh1cnQgZG9scGhpbiA9PiBoZWFsZWQgZG9scGhpblxuICAgICAgICAvLyBOT1RFOiBkb2xwaGluIG9uIHdhdGVyLCBidXQgY2FuIGhlYWwgZnJvbSBsYW5kXG4gICAgICAgIHJlc3VsdC5oaXRib3ggPSB7eDA6IC0xLCB4MTogMiwgeTA6IC0xLCB5MTogMn07XG4gICAgICAgIHRyYWRlKFNsb3QoRXZlbnQuSEVBTEVEX0RPTFBISU4pKTtcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLlNIRUxMX0ZMVVRFKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDY0OiAvLyBmaXNoZXJtYW5cbiAgICAgICAgdHJhZGVSKFNsb3QoRXZlbnQuUkVUVVJORURfRk9HX0xBTVApLFxuICAgICAgICAgICAgICAgLi4uKHRoaXMuZmxhZ3MucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKSA/XG4gICAgICAgICAgICAgICAgICAgW0V2ZW50LkhFQUxFRF9ET0xQSElOXSA6IFtdKSk7XG4gICAgICAgIC8vIFRPRE8gLSB1c2UgdGhpcyBhcyBwcm94eSBmb3IgYm9hdFxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg2YjogLy8gc2xlZXBpbmcga2Vuc3VcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLkdMT1dJTkdfTEFNUCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg3NTogLy8gc2xpbWVkIGtlbnN1ID0+IGZsaWdodCBzbG90XG4gICAgICAgIHRyYWRlUihTbG90KE1hZ2ljLkZMSUdIVCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg3NDogLy8ga2Vuc3UgaW4gZGFuY2UgaGFsbCA9PiBjaGFuZ2Ugc2xvdFxuICAgICAgICAvLyBOT1RFOiB0aGlzIGlzIG5vcm1hbGx5IDdlIGJ1dCB3ZSBjaGFuZ2UgaXQgdG8gNzQgaW4gdGhpcyBvbmVcbiAgICAgICAgLy8gbG9jYXRpb24gdG8gaWRlbnRpZnkgaXRcbiAgICAgICAgdHJhZGVSKFNsb3QoTWFnaWMuQ0hBTkdFKSwgTWFnaWMuUEFSQUxZU0lTLCBFdmVudC5GT1VORF9LRU5TVSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDgyOiAvLyBha2FoYW5hID0+IGdhcyBtYXNrIHNsb3QgKGNoYW5nZWQgMTYgLT4gODIpXG4gICAgICAgIHRyYWRlUihTbG90KEl0ZW0uR0FTX01BU0spKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4ODg6IC8vIHN0b25lZCBha2FoYW5hID0+IHNoaWVsZCByaW5nIHNsb3RcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLlNISUVMRF9SSU5HKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5QQ3MgdGhhdCBuZWVkIGEgbGl0dGxlIGV4dHJhIGNhcmVcblxuICAgIGlmIChpZCA9PT0gMHg4NCkgeyAvLyBzdGFydCBmaWdodCB3aXRoIHNhYmVyYVxuICAgICAgLy8gVE9ETyAtIGxvb2sgdXAgd2hvIHRoZSBhY3R1YWwgYm9zcyBpcyBvbmNlIHdlIGdldCBib3NzIHNodWZmbGUhISFcbiAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IHRoaXMuYm9zc1JlcXVpcmVtZW50cyh0aGlzLnJvbS5ib3NzZXMuc2FiZXJhMSk7XG4gICAgICByZXR1cm4ge2NoZWNrOiBbXG4gICAgICAgIHtjb25kaXRpb24sIHNsb3Q6IFNsb3QoQm9zcy5TQUJFUkExKX0sXG4gICAgICBdfTtcbiAgICB9IGVsc2UgaWYgKGlkID09PSAweDFkKSB7IC8vIG9hayBlbGRlciBoYXMgc29tZSB3ZWlyZCB1bnRyYWNrZWQgY29uZGl0aW9ucy5cbiAgICAgIGNvbnN0IHNsb3QgPSBTbG90KEl0ZW0uU1dPUkRfT0ZfRklSRSk7XG4gICAgICByZXR1cm4ge2NoZWNrOiBbXG4gICAgICAgIC8vIHR3byBkaWZmZXJlbnQgd2F5cyB0byBnZXQgdGhlIHN3b3JkIG9mIGZpcmUgaXRlbVxuICAgICAgICB7Y29uZGl0aW9uOiBhbmQoTWFnaWMuVEVMRVBBVEhZLCBCb3NzLklOU0VDVCksIHNsb3R9LFxuICAgICAgICB7Y29uZGl0aW9uOiBFdmVudC5SRVNDVUVEX0NISUxELCBzbG90fSxcbiAgICAgIF19O1xuICAgIH0gZWxzZSBpZiAoaWQgPT09IDB4MWYpIHsgLy8gZHdhcmYgY2hpbGRcbiAgICAgIGNvbnN0IHNwYXducyA9IHRoaXMucm9tLm5wY3NbaWRdLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jLmlkKTtcbiAgICAgIGlmIChzcGF3bnMgJiYgc3Bhd25zLmluY2x1ZGVzKDB4MDQ1KSkgcmV0dXJuIHt9OyAvLyBpbiBtb3RoZXIncyBob3VzZVxuICAgICAgcmV0dXJuIHtjaGVjazogW1xuICAgICAgICB7Y29uZGl0aW9uOiBFdmVudC5EV0FSRl9NT1RIRVIsIHNsb3Q6IFNsb3QoRXZlbnQuRFdBUkZfQ0hJTEQpfSxcbiAgICAgIF19O1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgZCBvZiBucGMuZ2xvYmFsRGlhbG9ncykge1xuICAgICAgYWRkUmVxKH5kLmNvbmRpdGlvbik7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZCBvZiBucGMubG9jYWxEaWFsb2dzLmdldChsb2MuaWQpIHx8IG5wYy5sb2NhbERpYWxvZ3MuZ2V0KC0xKSB8fCBbXSkge1xuICAgICAgLy8gSWYgdGhlIGNoZWNrIGNvbmRpdGlvbiBpcyBvcHBvc2l0ZSB0byB0aGUgc3Bhd24gY29uZGl0aW9uLCB0aGVuIHNraXAuXG4gICAgICAvLyBUaGlzIGVuc3VyZXMgd2UgZG9uJ3QgZXhwZWN0IHRoZSBxdWVlbiB0byBnaXZlIHJlY292ZXIgaW4gdGhlIHRocm9uZSByb29tLlxuICAgICAgaWYgKHNwYXduQ29uZGl0aW9ucy5pbmNsdWRlcyh+ZC5jb25kaXRpb24pKSBjb250aW51ZTtcbiAgICAgIC8vIEFwcGx5IHRoZSBGTEFHX01BUC5cbiAgICAgIGNvbnN0IG1hcHBlZCA9IEZMQUdfTUFQLmdldChkLmNvbmRpdGlvbik7XG4gICAgICBjb25zdCBwb3NpdGl2ZSA9XG4gICAgICAgICAgbWFwcGVkID8gW21hcHBlZF0gOlxuICAgICAgICAgIHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZC5jb25kaXRpb24pID8gW0NvbmRpdGlvbihkLmNvbmRpdGlvbildIDpcbiAgICAgICAgICBbXTtcbiAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IGFuZCguLi5wb3NpdGl2ZSwgLi4ucmVxdWlyZW1lbnRzKTtcbiAgICAgIC8vIElmIHRoZSBjb25kaXRpb24gaXMgYSBuZWdhdGl2ZSB0aGVuIGFueSBmdXR1cmUgY29uZGl0aW9ucyBtdXN0IGluY2x1ZGVcbiAgICAgIC8vIGl0IGFzIGEgcG9zaXRpdmUgcmVxdWlyZW1lbnQuXG4gICAgICBjb25zdCBuZWdhdGl2ZSA9XG4gICAgICAgICAgRkxBR19NQVAuZ2V0KH5kLmNvbmRpdGlvbikgfHxcbiAgICAgICAgICAodGhpcy5yZWxldmFudEZsYWdzLmhhcyh+ZC5jb25kaXRpb24pID8gQ29uZGl0aW9uKH5kLmNvbmRpdGlvbikgOiBudWxsKTtcbiAgICAgIGlmIChuZWdhdGl2ZSAhPSBudWxsKSByZXF1aXJlbWVudHMucHVzaChuZWdhdGl2ZSk7XG4gICAgICBjb25zdCBhY3Rpb24gPSBkLm1lc3NhZ2UuYWN0aW9uO1xuICAgICAgaWYgKGFjdGlvbiA9PT0gMHgwMykge1xuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdC5pdGVtKG5wYy5kYXRhWzBdKSwgY29uZGl0aW9ufSk7XG4gICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gMHgxMSB8fCBhY3Rpb24gPT09IDB4MDkpIHtcbiAgICAgICAgLy8gTk9URTogJDA5IGlzIHplYnUgc3R1ZGVudCwgd2hpY2ggd2UndmUgcGF0Y2hlZCB0byBnaXZlIHRoZSBpdGVtLlxuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdC5pdGVtKG5wYy5kYXRhWzFdKSwgY29uZGl0aW9ufSk7XG4gICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gMHgxMCkge1xuICAgICAgICAvLyBOT1RFOiBRdWVlbiBjYW4ndCBiZSByZXZlYWxlZCBhcyBhc2luYSBpbiB0aGUgdGhyb25lIHJvb20uICBJbiBwYXJ0aWN1bGFyLFxuICAgICAgICAvLyB0aGlzIGVuc3VyZXMgdGhhdCB0aGUgYmFjayByb29tIGlzIHJlYWNoYWJsZSBiZWZvcmUgcmVxdWlyaW5nIHRoZSBkb2xwaGluXG4gICAgICAgIC8vIHRvIGFwcGVhci4gIFRoaXMgc2hvdWxkIGJlIGhhbmRsZWQgYnkgdGhlIGFib3ZlIGNoZWNrIGZvciB0aGUgZGlhbG9nIGFuZFxuICAgICAgICAvLyBzcGF3biBjb25kaXRpb25zIHRvIGJlIGNvbXBhdGlibGUuXG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90KE1hZ2ljLlJFQ09WRVIpLCBjb25kaXRpb259KTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAweDA4ICYmIGlkID09PSAweDJkKSB7XG4gICAgICAgIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9TV0FOKSwgY29uZGl0aW9ufSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZC5mbGFncykge1xuICAgICAgICBjb25zdCBtZmxhZyA9IEZMQUdfTUFQLmdldChmbGFnKTtcbiAgICAgICAgY29uc3QgcGZsYWcgPSBtZmxhZyA/IG1mbGFnIDogdGhpcy5yZWxldmFudEZsYWdzLmhhcyhmbGFnKSA/IENvbmRpdGlvbihmbGFnKSA6IG51bGw7XG4gICAgICAgIGlmIChwZmxhZykgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QocGZsYWcpLCBjb25kaXRpb259KTtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBzcGF3biAqcmVxdWlyZXMqIHRoaXMgY29uZGl0aW9uIHRoZW4gZG9uJ3QgZXZhbHVhdGUgYW55IG1vcmUuICBUaGlzXG4gICAgICAvLyBlbnN1cmVzIHdlIGRvbid0IGV4cGVjdCB0aGUgcXVlZW4gdG8gZ2l2ZSB0aGUgZmx1dGUgb2YgbGltZSBpbiB0aGUgYmFjayByb29tLFxuICAgICAgLy8gc2luY2Ugc2hlIHdvdWxkbid0IGhhdmUgc3Bhd25lZCB0aGVyZSBpbnRpbWUgdG8gZ2l2ZSBpdC5cbiAgICAgIGlmIChwb3NpdGl2ZS5sZW5ndGggJiYgc3Bhd25Db25kaXRpb25zLmluY2x1ZGVzKGQuY29uZGl0aW9uKSkgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBjYXBhYmlsaXRpZXMoKTogQ2FwYWJpbGl0eURhdGFbXSB7XG4gICAgbGV0IGJyZWFrU3RvbmU6IFJlcXVpcmVtZW50ID0gSXRlbS5TV09SRF9PRl9XSU5EO1xuICAgIGxldCBicmVha0ljZTogUmVxdWlyZW1lbnQgPSBJdGVtLlNXT1JEX09GX0ZJUkU7XG4gICAgbGV0IGZvcm1CcmlkZ2U6IFJlcXVpcmVtZW50ID0gSXRlbS5TV09SRF9PRl9XQVRFUjtcbiAgICBsZXQgYnJlYWtJcm9uOiBSZXF1aXJlbWVudCA9IEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUjtcbiAgICBpZiAoIXRoaXMuZmxhZ3Mub3Jic09wdGlvbmFsKCkpIHtcbiAgICAgIC8vIEFkZCBvcmIgcmVxdWlyZW1lbnRcbiAgICAgIGJyZWFrU3RvbmUgPSBvcihhbmQoSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLk9SQl9PRl9XSU5EKSxcbiAgICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9XSU5ELCBJdGVtLlRPUk5BRE9fQlJBQ0VMRVQpKTtcbiAgICAgIGJyZWFrSWNlID0gb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfRklSRSwgSXRlbS5PUkJfT0ZfRklSRSksXG4gICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX0ZJUkUsIEl0ZW0uRkxBTUVfQlJBQ0VMRVQpKTtcbiAgICAgIGZvcm1CcmlkZ2UgPSBvcihhbmQoSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5PUkJfT0ZfV0FURVIpLFxuICAgICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX1dBVEVSLCBJdGVtLkJMSVpaQVJEX0JSQUNFTEVUKSk7XG4gICAgICBicmVha0lyb24gPSBvcihhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBJdGVtLk9SQl9PRl9USFVOREVSKSxcbiAgICAgICAgICAgICAgICAgICAgIGFuZChJdGVtLlNXT1JEX09GX1RIVU5ERVIsIEl0ZW0uU1RPUk1fQlJBQ0VMRVQpKTtcbiAgICAgIGlmICh0aGlzLmZsYWdzLmFzc3VtZVN3b3JkQ2hhcmdlR2xpdGNoKCkpIHtcbiAgICAgICAgY29uc3QgbGV2ZWwyID0gb3IoYnJlYWtTdG9uZSwgYnJlYWtJY2UsIGZvcm1CcmlkZ2UsIGJyZWFrSXJvbik7XG4gICAgICAgIGZ1bmN0aW9uIG5lZWQoc3dvcmQ6IHJlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV0pOiBSZXF1aXJlbWVudCB7XG4gICAgICAgICAgY29uc3QgY29uZGl0aW9uOiBDb25kaXRpb24gPSBzd29yZFswXVswXTtcbiAgICAgICAgICByZXR1cm4gbGV2ZWwyLm1hcChjID0+IGNbMF0gPT09IGNvbmRpdGlvbiA/IGMgOiBbY29uZGl0aW9uLCAuLi5jXSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtTdG9uZSA9IG5lZWQoSXRlbS5TV09SRF9PRl9XSU5EKTtcbiAgICAgICAgYnJlYWtJY2UgPSBuZWVkKEl0ZW0uU1dPUkRfT0ZfRklSRSk7XG4gICAgICAgIGZvcm1CcmlkZ2UgPSBuZWVkKEl0ZW0uU1dPUkRfT0ZfV0FURVIpO1xuICAgICAgICBicmVha0lyb24gPSBuZWVkKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUik7XG4gICAgICB9XG4gICAgfVxuICAgIHR5cGUgQ2FwYWJpbGl0eUxpc3QgPSBBcnJheTxbcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXSwgLi4uUmVxdWlyZW1lbnRbXV0+O1xuICAgIGNvbnN0IGNhcGFiaWxpdGllczogQ2FwYWJpbGl0eUxpc3QgPSBbXG4gICAgICBbRXZlbnQuU1RBUlQsIGFuZCgpXSxcbiAgICAgIFtDYXBhYmlsaXR5LlNXT1JELFxuICAgICAgIEl0ZW0uU1dPUkRfT0ZfV0lORCwgSXRlbS5TV09SRF9PRl9GSVJFLFxuICAgICAgIEl0ZW0uU1dPUkRfT0ZfV0FURVIsIEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUl0sXG4gICAgICBbQ2FwYWJpbGl0eS5CUkVBS19TVE9ORSwgYnJlYWtTdG9uZV0sXG4gICAgICBbQ2FwYWJpbGl0eS5CUkVBS19JQ0UsIGJyZWFrSWNlXSxcbiAgICAgIFtDYXBhYmlsaXR5LkZPUk1fQlJJREdFLCBmb3JtQnJpZGdlXSxcbiAgICAgIFtDYXBhYmlsaXR5LkJSRUFLX0lST04sIGJyZWFrSXJvbl0sXG4gICAgICBbQ2FwYWJpbGl0eS5NT05FWSwgQ2FwYWJpbGl0eS5TV09SRF0sIC8vIFRPRE8gLSBjbGVhciB0aGlzIHVwXG4gICAgICBbQ2FwYWJpbGl0eS5DTElNQl9XQVRFUkZBTEwsIE1hZ2ljLkZMSUdIVF0sXG4gICAgICBbQ2FwYWJpbGl0eS5TSE9PVElOR19TVEFUVUUsIE1hZ2ljLkJBUlJJRVJdLCAvLyBUT0RPIC0gYWxsb3cgc2hpZWxkIHJpbmc/XG4gICAgICBbQ2FwYWJpbGl0eS5DTElNQl9TTE9QRSwgSXRlbS5SQUJCSVRfQk9PVFMsIE1hZ2ljLkZMSUdIVF0sXG4gICAgICBbRXZlbnQuR0VORVJBTFNfREVGRUFURUQsIEl0ZW0uSVZPUllfU1RBVFVFXSwgLy8gVE9ETyAtIGZpeCB0aGlzXG4gICAgICBbRXZlbnQuT1BFTkVEX1NFQUxFRF9DQVZFLCBFdmVudC5TVEFSVEVEX1dJTkRNSUxMXSwgLy8gVE9ETyAtIG1lcmdlIGNvbXBsZXRlbHk/XG4gICAgXTtcblxuICAgIGlmICh0aGlzLmZsYWdzLmFzc3VtZUdoZXR0b0ZsaWdodCgpKSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5DTElNQl9XQVRFUkZBTEwsIGFuZChFdmVudC5SSURFX0RPTFBISU4sIEl0ZW0uUkFCQklUX0JPT1RTKV0pO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5mbGFncy5ndWFyYW50ZWVCYXJyaWVyKCkpIHtcbiAgICAgIC8vIFRPRE8gLSBzd29yZCBjaGFyZ2UgZ2xpdGNoIG1pZ2h0IGJlIGEgcHJvYmxlbSB3aXRoIHRoZSBoZWFsaW5nIG9wdGlvbi4uLlxuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuU0hPT1RJTkdfU1RBVFVFLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBDYXBhYmlsaXR5LkJVWV9IRUFMSU5HKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgSXRlbS5TSElFTERfUklORyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIE1hZ2ljLlJFRlJFU0gpXSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZmxhZ3MubGVhdGhlckJvb3RzR2l2ZVNwZWVkKCkpIHtcbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LkNMSU1CX1NMT1BFLCBJdGVtLkxFQVRIRVJfQk9PVFNdKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGJvc3Mgb2YgdGhpcy5yb20uYm9zc2VzKSB7XG4gICAgICBpZiAoYm9zcy5raWxsICE9IG51bGwgJiYgYm9zcy5kcm9wICE9IG51bGwpIHtcbiAgICAgICAgLy8gU2F2ZXMgcmVkdW5kYW5jeSBvZiBwdXR0aW5nIHRoZSBpdGVtIGluIHRoZSBhY3R1YWwgcm9vbS5cbiAgICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0l0ZW0oYm9zcy5kcm9wKSwgQm9zcyhib3NzLmtpbGwpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNhcGFiaWxpdGllcy5wdXNoKFtJdGVtLk9SQl9PRl9XQVRFUiwgQm9zcy5SQUdFXSk7XG5cbiAgICBpZiAodGhpcy5mbGFncy5ndWFyYW50ZWVHYXNNYXNrKCkpIHtcbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LlRSQVZFTF9TV0FNUCwgSXRlbS5HQVNfTUFTS10pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5UUkFWRUxfU1dBTVAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgIG9yKEl0ZW0uR0FTX01BU0ssXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIEl0ZW0uTUVESUNBTF9IRVJCKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgTWFnaWMuUkVGUkVTSCkpXSk7XG4gICAgfVxuXG4gICAgLy8gaWYgKHRoaXMuZmxhZ3MuYXNzdW1lU3RhdHVlR2xpdGNoKCkpIHtcbiAgICAvLyAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LlNUQVRVRV9HTElUQ0gsIFtbXV1dKTtcbiAgICAvLyB9XG5cbiAgICByZXR1cm4gY2FwYWJpbGl0aWVzLm1hcCgoW2NhcGFiaWxpdHksIC4uLmRlcHNdKSA9PiAoe2NhcGFiaWxpdHksIGNvbmRpdGlvbjogb3IoLi4uZGVwcyl9KSk7XG4gIH1cblxuICB3YWxsQ2FwYWJpbGl0eSh0eXBlOiBXYWxsVHlwZSk6IHtmbGFnOiBudW1iZXJ9IHtcbiAgICByZXR1cm4ge2ZsYWc6IFtDYXBhYmlsaXR5LkJSRUFLX1NUT05FLCBDYXBhYmlsaXR5LkJSRUFLX0lDRSxcbiAgICAgICAgICAgICAgICAgICBDYXBhYmlsaXR5LkZPUk1fQlJJREdFLCBDYXBhYmlsaXR5LkJSRUFLX0lST05dW3R5cGVdWzBdWzBdfTtcbiAgfVxufVxuXG50eXBlIFRpbGVDaGVjayA9IENoZWNrICYge3RpbGU6IFRpbGVJZH07XG5cbi8vIFRPRE8gLSBtYXliZSBwdWxsIHRyaWdnZXJzIGFuZCBucGNzLCBldGMsIGJhY2sgdG9nZXRoZXI/XG4vLyAgICAgIC0gb3IgbWFrZSB0aGUgbG9jYXRpb24gb3ZlcmxheSBhIHNpbmdsZSBmdW5jdGlvbj9cbi8vICAgICAgICAtPiBuZWVkcyBjbG9zZWQtb3ZlciBzdGF0ZSB0byBzaGFyZSBpbnN0YW5jZXMuLi5cblxuaW50ZXJmYWNlIEV4dHJhUm91dGUge1xuICB0aWxlOiBUaWxlSWQ7XG4gIGNvbmRpdGlvbj86IFJlcXVpcmVtZW50O1xufVxuaW50ZXJmYWNlIEV4dHJhRWRnZSB7XG4gIGZyb206IFRpbGVJZDtcbiAgdG86IFRpbGVJZDtcbiAgY29uZGl0aW9uPzogUmVxdWlyZW1lbnQ7XG59XG5cbmludGVyZmFjZSBUcmlnZ2VyRGF0YSB7XG4gIHRlcnJhaW4/OiBUZXJyYWluO1xuICBjaGVjaz86IENoZWNrW107XG4gIC8vIGFsbG93cyBub3QgYXNzdW1pbmcgdGVsZXBvcnQgc2tpcFxuICBleHRyYUxvY2F0aW9ucz86IExvY2F0aW9uW107XG4gIC8vIGFsbG93cyBub3QgYXNzdW1pbmcgcmFiYml0IHNraXBcbiAgZHg/OiBudW1iZXJbXTtcbn1cblxuaW50ZXJmYWNlIE5wY0RhdGEge1xuICBoaXRib3g/OiBIaXRib3g7XG4gIHRlcnJhaW4/OiBUZXJyYWluO1xuICBjaGVjaz86IENoZWNrW107XG59XG5cbmludGVyZmFjZSBIaXRib3gge1xuICB4MDogbnVtYmVyO1xuICB5MDogbnVtYmVyO1xuICB4MTogbnVtYmVyO1xuICB5MTogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgQ2FwYWJpbGl0eURhdGEge1xuICBjb25kaXRpb24/OiBSZXF1aXJlbWVudDtcbiAgY2FwYWJpbGl0eTogcmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXTtcbn1cblxuLy8gU3RhdGljIG1hcCBvZiB0ZXJyYWlucy5cbmNvbnN0IFRFUlJBSU5TOiBBcnJheTxUZXJyYWluIHwgdW5kZWZpbmVkPiA9ICgoKSA9PiB7XG4gIGNvbnN0IG91dCA9IFtdO1xuICBmb3IgKGxldCBlZmZlY3RzID0gMDsgZWZmZWN0cyA8IDEyODsgZWZmZWN0cysrKSB7XG4gICAgb3V0W2VmZmVjdHNdID0gdGVycmFpbihlZmZlY3RzKTtcbiAgfVxuICAvLyBjb25zb2xlLmxvZygnVEVSUkFJTlMnLCBvdXQpO1xuICByZXR1cm4gb3V0O1xuXG4gIC8qKlxuICAgKiBAcGFyYW0gZWZmZWN0cyBUaGUgJDI2IGJpdHMgb2YgdGlsZWVmZmVjdHMsIHBsdXMgJDA4IGZvciBzd2FtcCwgJDEwIGZvciBkb2xwaGluLFxuICAgKiAkMDEgZm9yIHNob290aW5nIHN0YXR1ZXMsICQ0MCBmb3Igc2hvcnQgc2xvcGVcbiAgICogQHJldHVybiB1bmRlZmluZWQgaWYgdGhlIHRlcnJhaW4gaXMgaW1wYXNzYWJsZS5cbiAgICovXG4gIGZ1bmN0aW9uIHRlcnJhaW4oZWZmZWN0czogbnVtYmVyKTogVGVycmFpbiB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKGVmZmVjdHMgJiAweDA0KSByZXR1cm4gdW5kZWZpbmVkOyAvLyBpbXBhc3NpYmxlXG4gICAgY29uc3QgdGVycmFpbjogVGVycmFpbiA9IHt9O1xuICAgIGlmICgoZWZmZWN0cyAmIDB4MTIpID09PSAweDEyKSB7IC8vIGRvbHBoaW4gb3IgZmx5XG4gICAgICBpZiAoZWZmZWN0cyAmIDB4MjApIHRlcnJhaW4uZXhpdCA9IENhcGFiaWxpdHkuQ0xJTUJfV0FURVJGQUxMO1xuICAgICAgdGVycmFpbi5lbnRlciA9IG9yKEV2ZW50LlJJREVfRE9MUEhJTiwgTWFnaWMuRkxJR0hUKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGVmZmVjdHMgJiAweDQwKSB7IC8vIHNob3J0IHNsb3BlXG4gICAgICAgIHRlcnJhaW4uZXhpdCA9IENhcGFiaWxpdHkuQ0xJTUJfU0xPUEU7XG4gICAgICB9IGVsc2UgaWYgKGVmZmVjdHMgJiAweDIwKSB7IC8vIHNsb3BlXG4gICAgICAgIHRlcnJhaW4uZXhpdCA9IE1hZ2ljLkZMSUdIVDtcbiAgICAgIH1cbiAgICAgIGlmIChlZmZlY3RzICYgMHgwMikgdGVycmFpbi5lbnRlciA9IE1hZ2ljLkZMSUdIVDsgLy8gbm8td2Fsa1xuICAgIH1cbiAgICBpZiAoZWZmZWN0cyAmIDB4MDgpIHsgLy8gc3dhbXBcbiAgICAgIHRlcnJhaW4uZW50ZXIgPSAodGVycmFpbi5lbnRlciB8fCBbW11dKS5tYXAoY3MgPT4gQ2FwYWJpbGl0eS5UUkFWRUxfU1dBTVBbMF0uY29uY2F0KGNzKSk7XG4gICAgfVxuICAgIGlmIChlZmZlY3RzICYgMHgwMSkgeyAvLyBzaG9vdGluZyBzdGF0dWVzXG4gICAgICB0ZXJyYWluLmVudGVyID0gKHRlcnJhaW4uZW50ZXIgfHwgW1tdXSkubWFwKGNzID0+IENhcGFiaWxpdHkuU0hPT1RJTkdfU1RBVFVFWzBdLmNvbmNhdChjcykpO1xuICAgIH1cbiAgICByZXR1cm4gdGVycmFpbjtcbiAgfVxufSkoKTtcblxuLy8gVE9ETyAtIGZpZ3VyZSBvdXQgd2hhdCB0aGlzIGxvb2tzIGxpa2UuLi4/XG4vLyAgLSBtYXliZSB3ZSBqdXN0IHdhbnQgdG8gbWFrZSBhIHBzZXVkbyBERUZFQVRFRF9JTlNFQ1QgZXZlbnQsIGJ1dCB0aGlzIHdvdWxkIG5lZWQgdG8gYmVcbi8vICAgIHNlcGFyYXRlIGZyb20gMTAxLCBzaW5jZSB0aGF0J3MgYXR0YWNoZWQgdG8gdGhlIGl0ZW1nZXQsIHdoaWNoIHdpbGwgbW92ZSB3aXRoIHRoZSBzbG90IVxuLy8gIC0gcHJvYmFibHkgd2FudCBhIGZsYWcgZm9yIGVhY2ggYm9zcyBkZWZlYXRlZC4uLj9cbi8vICAgIGNvdWxkIHVzZSBib3Nza2lsbCBJRCBmb3IgaXQ/XG4vLyAgICAtIHRoZW4gbWFrZSB0aGUgZHJvcCBhIHNpbXBsZSBkZXJpdmF0aXZlIGZyb20gdGhhdC4uLlxuLy8gICAgLSB1cHNob3QgLSBubyBsb25nZXIgbmVlZCB0byBtaXggaXQgaW50byBucGMoKSBvciB0cmlnZ2VyKCkgb3ZlcmxheSwgaW5zdGVhZCBtb3ZlIGl0XG4vLyAgICAgIHRvIGNhcGFiaWxpdHkgb3ZlcmxheS5cbi8vIGZ1bmN0aW9uIHNsb3RGb3I8VD4oaXRlbTogVCk6IFQgeyByZXR1cm4gaXRlbTsgfVxuIl19