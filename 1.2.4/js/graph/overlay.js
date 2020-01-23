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
        if ((effects & 0x08) && (((tile >>> 8) ^ (tile >>> 12)) & 1)) {
            effects |= 1;
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
                if (location === 0x64)
                    continue;
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
        if ((effects & 0x09) === 0x09)
            effects &= ~0x01;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9ncmFwaC9vdmVybGF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFTLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFDN0QsSUFBSSxFQUFxQixHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQUUsUUFBUSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBSy9DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFhbkMsTUFBTSxjQUFjLEdBQUc7SUFDckIsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUVMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFFTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFHTCxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLO0lBRTFCLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLO0lBQ3RE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bmRpdGlvbiwgRXZlbnQsIEl0ZW0sIE1hZ2ljLCBNdXRhYmxlUmVxdWlyZW1lbnQsXG4gICAgICAgIFJlcXVpcmVtZW50LCBTbG90LCBUZXJyYWluLCBXYWxsVHlwZSwgYW5kLCBtZWV0LCBvcn0gZnJvbSAnLi9jb25kaXRpb24uanMnO1xuaW1wb3J0IHtUaWxlSWQsIFNjcmVlbklkfSBmcm9tICcuL2dlb21ldHJ5LmpzJztcbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7Qm9zcyBhcyBSb21Cb3NzfSBmcm9tICcuLi9yb20vYm9zc2VzLmpzJztcbmltcG9ydCB7TG9jYXRpb259IGZyb20gJy4uL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge1Nob3BUeXBlfSBmcm9tICcuLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge2hleH0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuXG4vLyBBZGRpdGlvbmFsIGluZm9ybWF0aW9uIG5lZWRlZCB0byBpbnRlcnByZXQgdGhlIHdvcmxkIGdyYXBoIGRhdGEuXG4vLyBUaGlzIGdldHMgaW50byBtb3JlIHNwZWNpZmljcyBhbmQgaGFyZGNvZGluZy5cblxuLy8gVE9ETyAtIG1heWJlIGNvbnNpZGVyIGhhdmluZyBhIHNldCBvZiBBU1NVTUVEIGFuZCBhIHNldCBvZiBJR05PUkVEIGZsYWdzP1xuLy8gICAgICAtIGUuZy4gYWx3YXlzIGFzc3VtZSAwMGYgaXMgRkFMU0UgcmF0aGVyIHRoYW4gVFJVRSwgdG8gYXZvaWQgZnJlZSB3aW5kbWlsbCBrZXlcblxuXG4vLyBUT0RPIC0gcHJpc29uIGtleSBtaXNzaW5nIGZyb20gcGFyYWx5c2lzIGRlcHMgKG9yIHJhdGhlciBhIG5vbi1mbGlnaHQgdmVyc2lvbikhXG5cblxuXG5jb25zdCBSRUxFVkFOVF9GTEFHUyA9IFtcbiAgMHgwMGEsIC8vIHVzZWQgd2luZG1pbGwga2V5XG4gIDB4MDBiLCAvLyB0YWxrZWQgdG8gbGVhZiBlbGRlclxuICAweDAxOCwgLy8gZW50ZXJlZCB1bmRlcmdyb3VuZCBjaGFubmVsXG4gIDB4MDFiLCAvLyBtZXNpYSByZWNvcmRpbmcgcGxheWVkXG4gIDB4MDFlLCAvLyBxdWVlbiByZXZlYWxlZFxuICAweDAyMSwgLy8gcmV0dXJuZWQgZm9nIGxhbXBcbiAgMHgwMjQsIC8vIGdlbmVyYWxzIGRlZmVhdGVkIChnb3QgaXZvcnkgc3RhdHVlKVxuICAweDAyNSwgLy8gaGVhbGVkIGRvbHBoaW5cbiAgMHgwMjYsIC8vIGVudGVyZWQgc2h5cm9uIChmb3IgZ29hIGd1YXJkcylcbiAgMHgwMjcsIC8vIHNoeXJvbiBtYXNzYWNyZVxuICAvLyAweDM1LCAvLyBjdXJlZCBha2FoYW5hXG4gIDB4MDM4LCAvLyBsZWFmIGFiZHVjdGlvblxuICAweDAzYSwgLy8gdGFsa2VkIHRvIHplYnUgaW4gY2F2ZSAoYWRkZWQgYXMgcmVxIGZvciBhYmR1Y3Rpb24pXG4gIDB4MDNiLCAvLyB0YWxrZWQgdG8gemVidSBpbiBzaHlyb24gKGFkZGVkIGFzIHJlcSBmb3IgbWFzc2FjcmUpXG4gIDB4MDQ1LCAvLyByZXNjdWVkIGNoaWxkXG4gIDB4MDUyLCAvLyB0YWxrZWQgdG8gZHdhcmYgbW90aGVyXG4gIDB4MDUzLCAvLyBjaGlsZCBmb2xsb3dpbmdcbiAgMHgwNjEsIC8vIHRhbGtlZCB0byBzdG9tIGluIHN3YW4gaHV0XG4gIC8vIDB4MDZjLCAvLyBkZWZlYXRlZCBkcmF5Z29uIDFcbiAgMHgwNzIsIC8vIGtlbnN1IGZvdW5kIGluIHRhdmVyblxuICAweDA4YiwgLy8gZ290IHNoZWxsIGZsdXRlXG4gIDB4MDliLCAvLyBhYmxlIHRvIHJpZGUgZG9scGhpblxuICAweDBhNSwgLy8gdGFsa2VkIHRvIHplYnUgc3R1ZGVudFxuICAweDBhOSwgLy8gdGFsa2VkIHRvIGxlYWYgcmFiYml0XG4gIDB4MTAwLCAvLyBraWxsZWQgdmFtcGlyZSAxXG4gIDB4MTAxLCAvLyBraWxsZWQgaW5zZWN0XG4gIDB4MTAyLCAvLyBraWxsZWQga2VsYmVzcXVlIDFcbiAgMHgxMDMsIC8vIHJhZ2VcbiAgMHgxMDQsIC8vIGtpbGxlZCBzYWJlcmEgMVxuICAweDEwNSwgLy8ga2lsbGVkIG1hZG8gMVxuICAweDEwNiwgLy8ga2lsbGVkIGtlbGJlc3F1ZSAyXG4gIDB4MTA3LCAvLyBraWxsZWQgc2FiZXJhIDJcbiAgMHgxMDgsIC8vIGtpbGxlZCBtYWRvIDJcbiAgMHgxMDksIC8vIGtpbGxlZCBrYXJtaW5lXG4gIDB4MTBhLCAvLyBraWxsZWQgZHJheWdvbiAxXG4gIDB4MTBiLCAvLyBraWxsZWQgZHJheWdvbiAyXG4gIDB4MTBjLCAvLyBraWxsZWQgdmFtcGlyZSAyXG5cbiAgLy8gc3dvcmRzIChtYXkgYmUgbmVlZGVkIGZvciByYWdlLCBTb1QgZm9yIG1hc3NhY3JlKVxuICAweDIwMCwgMHgyMDEsIDB4MjAyLCAweDIwMyxcbiAgLy8gYmFsbHMgYW5kIGJyYWNlbGV0cyBtYXkgYmUgbmVlZGVkIGZvciB0ZWxlcG9ydFxuICAweDIwNSwgMHgyMDYsIDB4MjA3LCAweDIwOCwgMHgyMDksIDB4MjBhLCAweDIwYiwgMHgyMGMsXG4gIDB4MjM2LCAvLyBzaGVsbCBmbHV0ZSAoZm9yIGZpc2hlcm1hbiBzcGF3bilcbiAgMHgyNDMsIC8vIHRlbGVwYXRoeSAoZm9yIHJhYmJpdCwgb2FrLCBkZW8pXG4gIDB4MjQ0LCAvLyB0ZWxlcG9ydCAoZm9yIG10IHNhYnJlIHRyaWdnZXIpXG4gIDB4MjgzLCAvLyBjYWxtZWQgc2VhIChmb3IgYmFycmllcilcbiAgMHgyZWUsIC8vIHN0YXJ0ZWQgd2luZG1pbGwgKGZvciByZWZyZXNoKVxuXG4gIC8vIE5PVEU6IHRoZXNlIGFyZSBtb3ZlZCBiZWNhdXNlIG9mIHpvbWJpZSB3YXJwIVxuICAweDJmNiwgLy8gd2FycDpvYWsgKGZvciB0ZWxlcGF0aHkpXG4gIDB4MmZhLCAvLyB3YXJwOmpvZWwgKGZvciBldmlsIHNwaXJpdCBpc2xhbmQpXG5cbiAgLy8gTWFnaWMuQ0hBTkdFWzBdWzBdLFxuICAvLyBNYWdpYy5URUxFUEFUSFlbMF1bMF0sXG5dO1xuXG4vLyBUT0RPIC0gdGhpcyBpcyBub3QgcGVydmFzaXZlIGVub3VnaCEhIVxuLy8gIC0gbmVlZCBhIHdheSB0byBwdXQgaXQgZXZlcnl3aGVyZVxuLy8gICAgLT4gbWF5YmUgaW4gTXV0YWJsZVJlcXVpcmVtZW50cz9cbmNvbnN0IEZMQUdfTUFQOiBNYXA8bnVtYmVyLCByZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dPiA9IG5ldyBNYXAoW1xuICBbMHgwMGEsIEV2ZW50LlNUQVJURURfV0lORE1JTExdLCAvLyB0aGlzIGlzIHJlZidkIG91dHNpZGUgdGhpcyBmaWxlIVxuICAvL1sweDAwZSwgTWFnaWMuVEVMRVBBVEhZXSxcbiAgLy9bMHgwM2YsIE1hZ2ljLlRFTEVQT1JUXSxcbiAgWzB4MDEzLCBCb3NzLlNBQkVSQTFdLFxuICAvLyBRdWVlbiB3aWxsIGdpdmUgZmx1dGUgb2YgbGltZSB3L28gcGFyYWx5c2lzIGluIHRoaXMgY2FzZS5cbiAgLy8gWzB4MDE3LCBJdGVtLlNXT1JEX09GX1dBVEVSXSxcbiAgWzB4MDI4LCBNYWdpYy5DSEFOR0VdLFxuICBbMHgwMjksIE1hZ2ljLkNIQU5HRV0sXG4gIFsweDAyYSwgTWFnaWMuQ0hBTkdFXSxcbiAgWzB4MDJiLCBNYWdpYy5DSEFOR0VdLFxuICBbMHgwNmMsIEJvc3MuRFJBWUdPTjFdLFxuICBbMHgwOGIsIEl0ZW0uU0hFTExfRkxVVEVdLFxuXSk7XG5cbi8vIE1hcHMgdHJpZ2dlciBhY3Rpb25zIHRvIHRoZSBzbG90IHRoZXkgZ3JhbnQuXG5jb25zdCBUUklHR0VSX0FDVElPTl9JVEVNUzoge1thY3Rpb246IG51bWJlcl06IFNsb3R9ID0ge1xuICAweDA4OiBTbG90KE1hZ2ljLlBBUkFMWVNJUyksXG4gIDB4MGI6IFNsb3QoTWFnaWMuQkFSUklFUiksXG4gIDB4MGY6IFNsb3QoTWFnaWMuUkVGUkVTSCksXG4gIDB4MTg6IFNsb3QoTWFnaWMuVEVMRVBBVEhZKSxcbn07XG5cbmNvbnN0IFNXT1JEUyA9IFtJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uU1dPUkRfT0ZfRklSRSxcbiAgICAgICAgICAgICAgICBJdGVtLlNXT1JEX09GX1dBVEVSLCBJdGVtLlNXT1JEX09GX1RIVU5ERVJdIGFzIGNvbnN0O1xuY29uc3QgU1dPUkRfUE9XRVJTID0gW1xuICBbSXRlbS5PUkJfT0ZfV0lORCwgSXRlbS5UT1JOQURPX0JSQUNFTEVUXSxcbiAgW0l0ZW0uT1JCX09GX0ZJUkUsIEl0ZW0uRkxBTUVfQlJBQ0VMRVRdLFxuICBbSXRlbS5PUkJfT0ZfV0FURVIsIEl0ZW0uQkxJWlpBUkRfQlJBQ0VMRVRdLFxuICBbSXRlbS5PUkJfT0ZfVEhVTkRFUiwgSXRlbS5TVE9STV9CUkFDRUxFVF0sXG5dIGFzIGNvbnN0O1xuXG5mdW5jdGlvbiBzd29yZFJlcXVpcmVtZW50KHN3b3JkOiBudW1iZXIsIGxldmVsOiBudW1iZXIpOiBSZXF1aXJlbWVudCB7XG4gIGxldCByO1xuICBpZiAobGV2ZWwgPT09IDEpIHI9IFNXT1JEU1tzd29yZF07XG4gIGVsc2UgaWYgKGxldmVsID09PSAzKSByPSBhbmQoU1dPUkRTW3N3b3JkXSwgLi4uU1dPUkRfUE9XRVJTW3N3b3JkXSk7XG4gIGVsc2Ugcj0gb3IoLi4uU1dPUkRfUE9XRVJTW3N3b3JkXS5tYXAocCA9PiBhbmQoU1dPUkRTW3N3b3JkXSwgcCkpKTtcbiAgaWYgKEFycmF5LmlzQXJyYXkoclswXVswXSkpIHRocm93IG5ldyBFcnJvcigpO1xuICByZXR1cm4gcjtcbn1cblxuZXhwb3J0IGNsYXNzIE92ZXJsYXkge1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgcmVsZXZhbnRGbGFncyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAvLyBucGMgaWQgLT4gd2FudGVkIGl0ZW1cbiAgcHJpdmF0ZSByZWFkb25seSB0cmFkZUlucyA9IG5ldyBNYXA8bnVtYmVyLCByZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dPigpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc2hvb3RpbmdTdGF0dWVzID0gbmV3IFNldDxTY3JlZW5JZD4oKTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgZmxhZ3M6IEZsYWdTZXQsXG4gICAgICAgICAgICAgIHByaXZhdGUgcmVhZG9ubHkgdHJhY2tlcjogYm9vbGVhbikge1xuICAgIC8vIFRPRE8gLSBhZGp1c3QgYmFzZWQgb24gZmxhZ3NldD9cbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgUkVMRVZBTlRfRkxBR1MpIHtcbiAgICAgIHRoaXMucmVsZXZhbnRGbGFncy5hZGQoZmxhZyk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgaXRlbSBvZiByb20uaXRlbXMpIHtcbiAgICAgIGlmICghaXRlbS50cmFkZUluKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGNvbmQgPSBpdGVtLmlkID09PSAweDFkID8gQ2FwYWJpbGl0eS5CVVlfSEVBTElORyA6IEl0ZW0oaXRlbS5pZCk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW0udHJhZGVJbi5sZW5ndGg7IGkgKz0gNikge1xuICAgICAgICB0aGlzLnRyYWRlSW5zLnNldChpdGVtLnRyYWRlSW5baV0sIGNvbmQpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgICAgaWYgKHNwYXduLmlzTW9uc3RlcigpICYmIHNwYXduLmlkID09PSAweDNmKSB7IC8vIHNob290aW5nIHN0YXR1ZXNcbiAgICAgICAgICB0aGlzLnNob290aW5nU3RhdHVlcy5hZGQoU2NyZWVuSWQuZnJvbShsb2MsIHNwYXduKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gICAweDFkLCAvLyBtZWRpY2FsIGhlcmJcbiAgICAvLyAgIDB4MjUsIC8vIHN0YXR1ZSBvZiBvbnl4XG4gICAgLy8gICAweDM1LCAvLyBmb2cgbGFtcFxuICAgIC8vICAgMHgzYiwgLy8gbG92ZSBwZW5kYW50XG4gICAgLy8gICAweDNjLCAvLyBraXJpc2EgcGxhbnRcbiAgICAvLyAgIDB4M2QsIC8vIGl2b3J5IHN0YXR1ZVxuICAgIC8vIF0ubWFwKGkgPT4gdGhpcy5yb20uaXRlbXNbaV0pO1xuICB9XG5cbiAgLyoqIEBwYXJhbSBpZCBPYmplY3QgSUQgb2YgdGhlIGJvc3MuICovXG4gIGJvc3NSZXF1aXJlbWVudHMoYm9zczogUm9tQm9zcyk6IFJlcXVpcmVtZW50IHtcbiAgICAvLyBUT0RPIC0gaGFuZGxlIGJvc3Mgc2h1ZmZsZSBzb21laG93P1xuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMucmFnZSkge1xuICAgICAgaWYgKHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzLnJhbmRvbWl6ZVRyYWRlcygpKSByZXR1cm4gQ2FwYWJpbGl0eS5TV09SRDtcbiAgICAgIC8vIHJldHVybiBJdGVtLlNXT1JEX09GX1dBVEVSO1xuICAgICAgcmV0dXJuIENvbmRpdGlvbih0aGlzLnJvbS5ucGNzWzB4YzNdLmxvY2FsRGlhbG9ncy5nZXQoLTEpIVswXS5jb25kaXRpb24pO1xuICAgIH1cbiAgICBjb25zdCBpZCA9IGJvc3Mub2JqZWN0O1xuICAgIGNvbnN0IG91dCA9IG5ldyBNdXRhYmxlUmVxdWlyZW1lbnQoKTtcbiAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3Muc2h1ZmZsZUJvc3NFbGVtZW50cygpKSB7XG4gICAgICBvdXQuYWRkQWxsKENhcGFiaWxpdHkuU1dPUkQpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5mbGFncy5ndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkpIHtcbiAgICAgIGNvbnN0IGxldmVsID0gdGhpcy5mbGFncy5ndWFyYW50ZWVTd29yZE1hZ2ljKCkgPyBib3NzLnN3b3JkTGV2ZWwgOiAxO1xuICAgICAgY29uc3Qgb2JqID0gdGhpcy5yb20ub2JqZWN0c1tpZF07XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICBpZiAob2JqLmlzVnVsbmVyYWJsZShpKSkgb3V0LmFkZEFsbChzd29yZFJlcXVpcmVtZW50KGksIGxldmVsKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dC5hZGRBbGwoQ2FwYWJpbGl0eS5TV09SRCk7XG4gICAgfVxuICAgIGNvbnN0IGV4dHJhOiBDYXBhYmlsaXR5W10gPSBbXTtcbiAgICBpZiAodGhpcy5mbGFncy5ndWFyYW50ZWVSZWZyZXNoKCkpIHtcbiAgICAgIC8vIFRPRE8gLSBtYWtlIHRoaXMgXCJndWFyYW50ZWUgZGVmZW5zaXZlIG1hZ2ljXCIgYW5kIGFsbG93IHJlZnJlc2ggT1IgYmFycmllcj9cbiAgICAgIGV4dHJhLnB1c2goTWFnaWMuUkVGUkVTSCk7XG4gICAgfVxuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuaW5zZWN0KSB7IC8vIGluc2VjdFxuICAgICAgZXh0cmEucHVzaChJdGVtLklOU0VDVF9GTFVURSwgSXRlbS5HQVNfTUFTSyk7XG4gICAgfVxuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuZHJheWdvbjIpIHtcbiAgICAgIGV4dHJhLnB1c2goSXRlbS5CT1dfT0ZfVFJVVEgpO1xuICAgICAgaWYgKHRoaXMuZmxhZ3Muc3RvcnlNb2RlKCkpIHtcbiAgICAgICAgZXh0cmEucHVzaChcbiAgICAgICAgICBCb3NzLktFTEJFU1FVRTEsXG4gICAgICAgICAgQm9zcy5LRUxCRVNRVUUyLFxuICAgICAgICAgIEJvc3MuU0FCRVJBMSxcbiAgICAgICAgICBCb3NzLlNBQkVSQTIsXG4gICAgICAgICAgQm9zcy5NQURPMSxcbiAgICAgICAgICBCb3NzLk1BRE8yLFxuICAgICAgICAgIEJvc3MuS0FSTUlORSxcbiAgICAgICAgICBCb3NzLkRSQVlHT04xLFxuICAgICAgICAgIEl0ZW0uU1dPUkRfT0ZfV0lORCxcbiAgICAgICAgICBJdGVtLlNXT1JEX09GX0ZJUkUsXG4gICAgICAgICAgSXRlbS5TV09SRF9PRl9XQVRFUixcbiAgICAgICAgICBJdGVtLlNXT1JEX09GX1RIVU5ERVIpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZXh0cmEubGVuZ3RoKSB7XG4gICAgICBvdXQucmVzdHJpY3QoYW5kKC4uLmV4dHJhKSk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuZnJlZXplKCk7XG4gIH1cblxuICBsb2NhdGlvbnMoKTogVGlsZUNoZWNrW10ge1xuICAgIGNvbnN0IGxvY2F0aW9uczogVGlsZUNoZWNrW10gPSBbXTtcbiAgICAvLyBUT0RPIC0gcHVsbCB0aGUgbG9jYXRpb24gb3V0IG9mIGl0ZW1Vc2VEYXRhWzBdIGZvciB0aGVzZSBpdGVtc1xuICAgIGxvY2F0aW9ucy5wdXNoKHtcbiAgICAgIHRpbGU6IFRpbGVJZCgweDBmMDA4OCksXG4gICAgICBzbG90OiBTbG90KEV2ZW50LlNUQVJURURfV0lORE1JTEwpLFxuICAgICAgY29uZGl0aW9uOiBJdGVtLldJTkRNSUxMX0tFWSxcbiAgICB9LCB7XG4gICAgICB0aWxlOiBUaWxlSWQoMHhlNDAwODgpLFxuICAgICAgc2xvdDogU2xvdChFdmVudC5PUEVORURfSk9FTF9TSEVEKSxcbiAgICAgIGNvbmRpdGlvbjogSXRlbS5FWUVfR0xBU1NFUyxcbiAgICB9KTtcbiAgICBmb3IgKGNvbnN0IHNob3Agb2YgdGhpcy5yb20uc2hvcHMpIHtcbiAgICAgIC8vIGxlYWYgYW5kIHNoeXJvbiBtYXkgbm90IGFsd2F5cyBiZSBhY2Nlc3NpYmxlLCBzbyBkb24ndCByZWx5IG9uIHRoZW0uXG4gICAgICBpZiAoc2hvcC5sb2NhdGlvbiA9PT0gMHhjMyB8fCBzaG9wLmxvY2F0aW9uID09PSAweGY2KSBjb250aW51ZTtcbiAgICAgIGlmICghc2hvcC51c2VkKSBjb250aW51ZTtcbiAgICAgIGlmIChzaG9wLnR5cGUgIT09IFNob3BUeXBlLlRPT0wpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgY2hlY2sgPSB7XG4gICAgICAgIHRpbGU6IFRpbGVJZChzaG9wLmxvY2F0aW9uIDw8IDE2IHwgMHg4OCksXG4gICAgICAgIGNvbmRpdGlvbjogQ2FwYWJpbGl0eS5NT05FWSxcbiAgICAgIH07XG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygc2hvcC5jb250ZW50cykge1xuICAgICAgICBpZiAoaXRlbSA9PT0gKEl0ZW0uTUVESUNBTF9IRVJCWzBdWzBdICYgMHhmZikpIHtcbiAgICAgICAgICBsb2NhdGlvbnMucHVzaCh7Li4uY2hlY2ssIHNsb3Q6IFNsb3QoQ2FwYWJpbGl0eS5CVVlfSEVBTElORyl9KTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSAoSXRlbS5XQVJQX0JPT1RTWzBdWzBdICYgMHhmZikpIHtcbiAgICAgICAgICBsb2NhdGlvbnMucHVzaCh7Li4uY2hlY2ssIHNsb3Q6IFNsb3QoQ2FwYWJpbGl0eS5CVVlfV0FSUCl9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbG9jYXRpb25zO1xuICB9XG5cbiAgLyoqIFJldHVybnMgdW5kZWZpbmVkIGlmIGltcGFzc2FibGUuICovXG4gIG1ha2VUZXJyYWluKGVmZmVjdHM6IG51bWJlciwgdGlsZTogVGlsZUlkKTogVGVycmFpbiB8IHVuZGVmaW5lZCB7XG4gICAgLy8gQ2hlY2sgZm9yIGRvbHBoaW4gb3Igc3dhbXAuICBDdXJyZW50bHkgZG9uJ3Qgc3VwcG9ydCBzaHVmZmxpbmcgdGhlc2UuXG4gICAgY29uc3QgbG9jID0gdGlsZSA+Pj4gMTY7XG4gICAgZWZmZWN0cyAmPSAweDI2O1xuICAgIGlmIChsb2MgPT09IDB4MWEpIGVmZmVjdHMgfD0gMHgwODtcbiAgICBpZiAobG9jID09PSAweDYwIHx8IGxvYyA9PT0gMHg2OCkgZWZmZWN0cyB8PSAweDEwO1xuICAgIC8vIE5PVEU6IG9ubHkgdGhlIHRvcCBoYWxmLXNjcmVlbiBpbiB1bmRlcmdyb3VuZCBjaGFubmVsIGlzIGRvbHBoaW5hYmxlXG4gICAgaWYgKGxvYyA9PT0gMHg2NCAmJiAoKHRpbGUgJiAweGYwZjApIDwgMHg5MCkpIGVmZmVjdHMgfD0gMHgxMDtcbiAgICBpZiAodGhpcy5zaG9vdGluZ1N0YXR1ZXMuaGFzKFNjcmVlbklkLmZyb21UaWxlKHRpbGUpKSkgZWZmZWN0cyB8PSAweDAxO1xuICAgIGlmIChlZmZlY3RzICYgMHgyMCkgeyAvLyBzbG9wZVxuICAgICAgLy8gRGV0ZXJtaW5lIGxlbmd0aCBvZiBzbG9wZTogc2hvcnQgc2xvcGVzIGFyZSBjbGltYmFibGUuXG4gICAgICAvLyA2LTggYXJlIGJvdGggZG9hYmxlIHdpdGggYm9vdHNcbiAgICAgIC8vIDAtNSBpcyBkb2FibGUgd2l0aCBubyBib290c1xuICAgICAgLy8gOSBpcyBkb2FibGUgd2l0aCByYWJiaXQgYm9vdHMgb25seSAobm90IGF3YXJlIG9mIGFueSBvZiB0aGVzZS4uLilcbiAgICAgIC8vIDEwIGlzIHJpZ2h0IG91dFxuICAgICAgY29uc3QgZ2V0RWZmZWN0cyA9ICh0aWxlOiBUaWxlSWQpOiBudW1iZXIgPT4ge1xuICAgICAgICBjb25zdCBsID0gdGhpcy5yb20ubG9jYXRpb25zW3RpbGUgPj4+IDE2XTtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gbC5zY3JlZW5zWyh0aWxlICYgMHhmMDAwKSA+Pj4gMTJdWyh0aWxlICYgMHhmMDApID4+PiA4XTtcbiAgICAgICAgcmV0dXJuIHRoaXMucm9tLnRpbGVFZmZlY3RzW2wudGlsZUVmZmVjdHMgLSAweGIzXVxuICAgICAgICAgICAgLmVmZmVjdHNbdGhpcy5yb20uc2NyZWVuc1tzY3JlZW5dLnRpbGVzW3RpbGUgJiAweGZmXV07XG4gICAgICB9O1xuICAgICAgbGV0IGJvdHRvbSA9IHRpbGU7XG4gICAgICBsZXQgaGVpZ2h0ID0gLTE7XG4gICAgICB3aGlsZSAoZ2V0RWZmZWN0cyhib3R0b20pICYgMHgyMCkge1xuICAgICAgICBib3R0b20gPSBUaWxlSWQuYWRkKGJvdHRvbSwgMSwgMCk7XG4gICAgICAgIGhlaWdodCsrO1xuICAgICAgfVxuICAgICAgbGV0IHRvcCA9IHRpbGU7XG4gICAgICB3aGlsZSAoZ2V0RWZmZWN0cyh0b3ApICYgMHgyMCkge1xuICAgICAgICB0b3AgPSBUaWxlSWQuYWRkKHRvcCwgLTEsIDApO1xuICAgICAgICBoZWlnaHQrKztcbiAgICAgIH1cbiAgICAgIGlmIChoZWlnaHQgPCA2KSB7XG4gICAgICAgIGVmZmVjdHMgJj0gfjB4MjA7XG4gICAgICB9IGVsc2UgaWYgKGhlaWdodCA8IDkpIHtcbiAgICAgICAgZWZmZWN0cyB8PSAweDQwO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoKGVmZmVjdHMgJiAweDA4KSAmJiAoKCh0aWxlID4+PiA4KSBeICh0aWxlID4+PiAxMikpICYgMSkpIHtcbiAgICAgIC8vIE9kZC1wYXJpdHkgc2NyZWVuIHBvc2l0aW9ucyBnZXQgYW4gZXh0cmEgYml0IGZvciBzd2FtcCB0aWxlc1xuICAgICAgLy8gdG8gZW5zdXJlIHRoZSBzd2FtcCBpc24ndCBqdXN0IG9uZSBnaWFudCByZWdpb24uICBUaGlzIGVuc3VyZXNcbiAgICAgIC8vIHdpbGQtd2FycGluZyB0byB0aGUgc3dhbXAgZG9lc24ndCBhdXRvbWF0aWNhbGx5IGdpdmUgb2FrIHdhcnBcbiAgICAgIC8vIG9yIGNoaWxkIGFjY2Vzcy4gIFNpbXBseSBhZGRpbmcgdG8gXCJleGl0XCIgaXMgaW5zdWZmaWNpZW50LlxuICAgICAgZWZmZWN0cyB8PSAxO1xuICAgIH1cbiAgICByZXR1cm4gVEVSUkFJTlNbZWZmZWN0c107XG4gIH1cblxuICAvLyBUT0RPIC0gY29uc2lkZXIgZm9sZGluZyB0aGlzIGludG8gbG9jYXRpb24vdHJpZ2dlci9ucGMgYXMgYW4gZXh0cmEgcmV0dXJuP1xuICBleHRyYVJvdXRlcygpOiBFeHRyYVJvdXRlW10ge1xuICAgIGNvbnN0IHJvdXRlcyA9IFtdO1xuICAgIGNvbnN0IGVudHJhbmNlID0gKGxvY2F0aW9uOiBudW1iZXIsIGVudHJhbmNlOiBudW1iZXIgPSAwKTogVGlsZUlkID0+IHtcbiAgICAgIGNvbnN0IGwgPSB0aGlzLnJvbS5sb2NhdGlvbnNbbG9jYXRpb25dO1xuICAgICAgY29uc3QgZSA9IGwuZW50cmFuY2VzW2VudHJhbmNlXTtcbiAgICAgIHJldHVybiBUaWxlSWQuZnJvbShsLCBlKTtcbiAgICB9O1xuICAgIC8vIFN0YXJ0IHRoZSBnYW1lIGF0IDA6MFxuICAgIHJvdXRlcy5wdXNoKHt0aWxlOiBlbnRyYW5jZSgwKX0pO1xuICAgIC8vIFN3b3JkIG9mIFRodW5kZXIgd2FycFxuICAgIC8vIFRPRE8gLSBlbnRyYW5jZSBzaHVmZmxlIHdpbGwgYnJlYWsgdGhlIGF1dG8td2FycC1wb2ludCBhZmZvcmRhbmNlLlxuICAgIGlmICh0aGlzLmZsYWdzLnRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKSkge1xuICAgICAgcm91dGVzLnB1c2goe1xuICAgICAgICB0aWxlOiBlbnRyYW5jZSgweGYyKSxcbiAgICAgICAgY29uZGl0aW9uOiBvcihhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBDYXBhYmlsaXR5LkJVWV9XQVJQKSxcbiAgICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBNYWdpYy5URUxFUE9SVCkpLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzLmFzc3VtZVdpbGRXYXJwKCkpIHtcbiAgICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGhpcy5yb20ud2lsZFdhcnAubG9jYXRpb25zKSB7XG4gICAgICAgIGlmIChsb2NhdGlvbiA9PT0gMHg2NCkgY29udGludWU7IC8vIHNraXAgY2hhbm5lbCBmb3IgV1dcbiAgICAgICAgcm91dGVzLnB1c2goe3RpbGU6IGVudHJhbmNlKGxvY2F0aW9uKX0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcm91dGVzO1xuICB9XG5cbiAgLy8gVE9ETyAtIGNvbnNpZGVyIGZvbGRpbmcgdGhpcyBpbnRvIGxvY2F0aW9uL3RyaWdnZXIvbnBjIGFzIGFuIGV4dHJhIHJldHVybj9cbiAgZXh0cmFFZGdlcygpOiBFeHRyYUVkZ2VbXSB7XG4gICAgY29uc3QgZWRnZXMgPSBbXTtcbiAgICAvLyBuZWVkIGFuIGVkZ2UgZnJvbSB0aGUgYm9hdCBob3VzZSB0byB0aGUgYmVhY2ggLSB3ZSBjb3VsZCBidWlsZCB0aGlzIGludG8gdGhlXG4gICAgLy8gYm9hdCBib2FyZGluZyB0cmlnZ2VyLCBidXQgZm9yIG5vdyBpdCdzIGhlcmUuXG4gICAgZWRnZXMucHVzaCh7XG4gICAgICBmcm9tOiBUaWxlSWQoMHg1MTAwODgpLCAvLyBpbiBmcm9udCBvZiBib2F0IGhvdXNlXG4gICAgICB0bzogVGlsZUlkKDB4NjA4Njg4KSwgLy8gaW4gZnJvbnQgb2YgY2FiaW5cbiAgICAgIGNvbmRpdGlvbjogRXZlbnQuUkVUVVJORURfRk9HX0xBTVAsXG4gICAgfSk7XG4gICAgcmV0dXJuIGVkZ2VzO1xuICB9XG5cbiAgdHJpZ2dlcihpZDogbnVtYmVyKTogVHJpZ2dlckRhdGEge1xuICAgIHN3aXRjaCAoaWQpIHtcbiAgICBjYXNlIDB4OWE6IC8vIHN0YXJ0IGZpZ2h0IHdpdGggbWFkbyBpZiBzaHlyb24gbWFzc2FjcmUgc3RhcnRlZFxuICAgICAgLy8gVE9ETyAtIGxvb2sgdXAgd2hvIHRoZSBhY3R1YWwgYm9zcyBpcyBvbmNlIHdlIGdldCBib3NzIHNodWZmbGUhISFcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogbWVldChFdmVudC5TSFlST05fTUFTU0FDUkUsIHRoaXMuYm9zc1JlcXVpcmVtZW50cyh0aGlzLnJvbS5ib3NzZXMubWFkbzEpKSxcbiAgICAgICAgc2xvdDogU2xvdChCb3NzLk1BRE8xKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YWE6IC8vIGVudGVyIG9hayBhZnRlciBpbnNlY3RcbiAgICAgIC8vIE5PVEU6IFRoaXMgaXMgbm90IHRoZSB0cmlnZ2VyIHRoYXQgY2hlY2tzLCBidXQgcmF0aGVyIGl0IGhhcHBlbnMgb24gdGhlIGVudHJhbmNlLlxuICAgICAgLy8gVGhpcyBpcyBhIGNvbnZlbmllbnQgcGxhY2UgdG8gaGFuZGxlIGl0LCB0aG91Z2gsIHNpbmNlIHdlIGFscmVhZHkgbmVlZCB0byBleHBsaWNpdGx5XG4gICAgICAvLyBpZ25vcmUgdGhpcyB0cmlnZ2VyLiAgV2UgYWxzbyByZXF1aXJlIHdhcnAgYm9vdHMgYmVjYXVzZSBpdCdzIHBvc3NpYmxlIHRoYXQgdGhlcmUnc1xuICAgICAgLy8gbm8gZGlyZWN0IHdhbGtpbmcgcGF0aCBhbmQgaXQncyBub3QgZmVhc2libGUgdG8gY2FycnkgdGhlIGNoaWxkIHdpdGggdXMgZXZlcnl3aGVyZSxcbiAgICAgIC8vIGR1ZSB0byBncmFwaGljcyByZWFzb25zLlxuICAgICAgcmV0dXJuIHtjaGVjazpbe1xuICAgICAgICBjb25kaXRpb246IGFuZChFdmVudC5EV0FSRl9DSElMRCwgQ2FwYWJpbGl0eS5CVVlfV0FSUCksXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuUkVTQ1VFRF9DSElMRCksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGFkOiAvLyBhbGxvdyBvcGVuaW5nIHByaXNvbiBkb29yXG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IEl0ZW0uS0VZX1RPX1BSSVNPTixcbiAgICAgICAgc2xvdDogU2xvdChFdmVudC5PUEVORURfUFJJU09OKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YWU6IC8vIGFsbG93IG9wZW5pbmcgc3R4eVxuICAgICAgcmV0dXJuIHtjaGVjazogW3tcbiAgICAgICAgY29uZGl0aW9uOiBJdGVtLktFWV9UT19TVFlYLFxuICAgICAgICBzbG90OiBTbG90KEV2ZW50Lk9QRU5FRF9TVFlYKSxcbiAgICAgIH1dfTtcbiAgICBjYXNlIDB4YWY6IC8vIGFsbG93IGNhbG1pbmcgc2VhXG4gICAgICByZXR1cm4ge2NoZWNrOiBbe1xuICAgICAgICBjb25kaXRpb246IEl0ZW0uU1RBVFVFX09GX0dPTEQsXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuQ0FMTUVEX1NFQSksXG4gICAgICB9XX07XG4gICAgY2FzZSAweGIxOiAvLyBzdGFydCBmaWdodCB3aXRoIGd1YXJkaWFuIHN0YXR1ZXNcbiAgICAgIHJldHVybiB7Y2hlY2s6IFt7XG4gICAgICAgIGNvbmRpdGlvbjogYW5kKEl0ZW0uQk9XX09GX1NVTiwgSXRlbS5CT1dfT0ZfTU9PTiksXG4gICAgICAgIHNsb3Q6IFNsb3QoRXZlbnQuT1BFTkVEX0NSWVBUKSxcbiAgICAgIH1dfTtcbiAgICB9XG4gICAgLy8gQ2hlY2sgZm9yIHJlbGV2YW50IGZsYWdzIGFuZCBrbm93biBhY3Rpb24gdHlwZXMuXG4gICAgY29uc3QgdHJpZ2dlciA9IHRoaXMucm9tLnRyaWdnZXJzW2lkICYgMHg3Zl07XG4gICAgaWYgKCF0cmlnZ2VyIHx8ICF0cmlnZ2VyLnVzZWQpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0cmlnZ2VyOiAke2hleChpZCl9YCk7XG4gICAgY29uc3QgcmVsZXZhbnQgPSAoZjogbnVtYmVyKSA9PiB0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGYpO1xuICAgIGNvbnN0IHJlbGV2YW50QW5kU2V0ID0gKGY6IG51bWJlcikgPT4gZiA+IDAgJiYgdGhpcy5yZWxldmFudEZsYWdzLmhhcyhmKTtcbiAgICBmdW5jdGlvbiBtYXAoZjogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgIGlmIChmIDwgMCkgcmV0dXJuIH5tYXAofmYpO1xuICAgICAgY29uc3QgbWFwcGVkID0gRkxBR19NQVAuZ2V0KGYpO1xuICAgICAgcmV0dXJuIG1hcHBlZCAhPSBudWxsID8gbWFwcGVkWzBdWzBdIDogZjtcbiAgICB9XG4gICAgY29uc3QgYWN0aW9uSXRlbSA9IFRSSUdHRVJfQUNUSU9OX0lURU1TW3RyaWdnZXIubWVzc2FnZS5hY3Rpb25dO1xuICAgIGNvbnN0IGNvbmRpdGlvbiA9IGFuZCguLi50cmlnZ2VyLmNvbmRpdGlvbnMubWFwKG1hcCkuZmlsdGVyKHJlbGV2YW50QW5kU2V0KS5tYXAoQ29uZGl0aW9uKSk7XG4gICAgaWYgKHRyaWdnZXIubWVzc2FnZS5hY3Rpb24gPT09IDB4MTkpIHsgLy8gcHVzaC1kb3duIHRyaWdnZXJcbiAgICAgIC8vIFRPRE8gLSBwYXNzIGluIHRlcnJhaW47IGlmIG9uIGxhbmQgYW5kIHRyaWdnZXIgc2tpcCBpcyBvbiB0aGVuXG4gICAgICAvLyBhZGQgYSByb3V0ZSByZXF1aXJpbmcgcmFiYml0IGJvb3RzIGFuZCBlaXRoZXIgd2FycCBib290cyBvciB0ZWxlcG9ydD9cbiAgICAgIGNvbnN0IGV4dHJhOiBUcmlnZ2VyRGF0YSA9IHt9O1xuICAgICAgaWYgKHRyaWdnZXIuaWQgPT09IDB4ODYgJiYgIXRoaXMuZmxhZ3MuYXNzdW1lUmFiYml0U2tpcCgpKSB7XG4gICAgICAgIGV4dHJhLmR4ID0gWy0zMiwgLTE2LCAwLCAxNl07XG4gICAgICB9XG4gICAgICBpZiAodHJpZ2dlci5pZCA9PT0gMHhiYSAmJlxuICAgICAgICAgICF0aGlzLmZsYWdzLmRpc2FibGVUZWxlcG9ydFNraXAoKSAmJlxuICAgICAgICAgICF0aGlzLmZsYWdzLmFzc3VtZVRlbGVwb3J0U2tpcCgpKSB7XG4gICAgICAgIGV4dHJhLmV4dHJhTG9jYXRpb25zID0gW3RoaXMucm9tLmxvY2F0aW9ucy5Db3JkZWxQbGFpbldlc3RdO1xuICAgICAgfVxuICAgICAgY29uc3QgY29uZCA9XG4gICAgICAgICAgdHJpZ2dlci5jb25kaXRpb25zLm1hcChjID0+IGMgPCAwICYmIHJlbGV2YW50KH5tYXAoYykpID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENvbmRpdGlvbih+bWFwKGMpKSA6IG51bGwpXG4gICAgICAgICAgICAgIC5maWx0ZXIoKGM6IHVua25vd24pOiBjIGlzIFtbQ29uZGl0aW9uXV0gPT4gYyAhPSBudWxsKTtcbiAgICAgIGlmIChjb25kICYmIGNvbmQubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB7Li4uZXh0cmEsIHRlcnJhaW46IHtleGl0OiBvciguLi5jb25kKX19O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYWN0aW9uSXRlbSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4ge2NoZWNrOiBbe2NvbmRpdGlvbiwgc2xvdDogYWN0aW9uSXRlbX1dfTtcbiAgICB9XG4gICAgY29uc3QgZmxhZ3MgPSB0cmlnZ2VyLmZsYWdzLmZpbHRlcihyZWxldmFudEFuZFNldCk7XG4gICAgaWYgKGZsYWdzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHtjaGVjazogZmxhZ3MubWFwKGYgPT4gKHtjb25kaXRpb24sIHNsb3Q6IFNsb3QoZil9KSl9O1xuICAgIH1cblxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIG5wYyhpZDogbnVtYmVyLCBsb2M6IExvY2F0aW9uKTogTnBjRGF0YSB7XG4gICAgY29uc3QgbnBjID0gdGhpcy5yb20ubnBjc1tpZF07XG4gICAgaWYgKCFucGMgfHwgIW5wYy51c2VkKSB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHJpZ2dlcjogJHtoZXgoaWQpfWApO1xuXG4gICAgY29uc3Qgc3Bhd25Db25kaXRpb25zOiByZWFkb25seSBudW1iZXJbXSA9IG5wYy5zcGF3bkNvbmRpdGlvbnMuZ2V0KGxvYy5pZCkgfHwgW107XG5cbiAgICBjb25zdCByZXN1bHQ6IE5wY0RhdGEgJiB7Y2hlY2s6IENoZWNrW119ID0ge2NoZWNrOiBbXX07XG5cbiAgICBpZiAobnBjLmRhdGFbMl0gJiAweDA0KSB7XG4gICAgICAvLyBwZXJzb24gaXMgYSBzdGF0dWUuXG4gICAgICByZXN1bHQudGVycmFpbiA9IHtcbiAgICAgICAgZXhpdDogdGhpcy5mbGFncy5hc3N1bWVTdGF0dWVHbGl0Y2goKSA/XG4gICAgICAgICAgICAgICAgICBbW11dIDogXG4gICAgICAgICAgICAgICAgICBvciguLi5zcGF3bkNvbmRpdGlvbnMubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgIHggPT4gRkxBR19NQVAuZ2V0KHgpIHx8ICh0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKHgpID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ29uZGl0aW9uKHgpIDogW10pKSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN0YXR1ZU9yKC4uLnJlcXM6IFJlcXVpcmVtZW50W10pOiB2b2lkIHtcbiAgICAgIGlmICghcmVzdWx0LnRlcnJhaW4pIHRocm93IG5ldyBFcnJvcignTWlzc2luZyB0ZXJyYWluIGZvciBndWFyZCcpO1xuICAgICAgcmVzdWx0LnRlcnJhaW4uZXhpdCA9IG9yKHJlc3VsdC50ZXJyYWluLmV4aXQgfHwgW10sIC4uLnJlcXMpO1xuICAgIH1cblxuICAgIC8vIFRPRE8gLSBmb3J0dW5lIHRlbGxlciAoMzkpIHJlcXVpcmVzIGFjY2VzcyB0byBwb3J0b2EgdG8gZ2V0IGhlciB0byBtb3ZlP1xuICAgIC8vICAgICAgLT4gbWF5YmUgaW5zdGVhZCBjaGFuZ2UgdGhlIGZsYWcgdG8gc2V0IGltbWVkaWF0ZWx5IG9uIHRhbGtpbmcgdG8gaGVyXG4gICAgLy8gICAgICAgICByYXRoZXIgdGhhbiB0aGUgdHJpZ2dlciBvdXRzaWRlIHRoZSBkb29yLi4uPyB0aGlzIHdvdWxkIGFsbG93IGdldHRpbmdcbiAgICAvLyAgICAgICAgIHRocm91Z2ggaXQgYnkganVzdCB0YWxraW5nIGFuZCB0aGVuIGxlYXZpbmcgdGhlIHJvb20uLi5cblxuICAgIHN3aXRjaCAoaWQpIHtcbiAgICBjYXNlIDB4MTQ6IC8vIHdva2VuLXVwIHdpbmRtaWxsIGd1YXJkXG4gICAgICAvLyBza2lwIGJlY2F1c2Ugd2UgdGllIHRoZSBpdGVtIHRvIHRoZSBzbGVlcGluZyBvbmUuXG4gICAgICBpZiAobG9jLnNwYXducy5maW5kKGwgPT4gbC5pc05wYygpICYmIGwuaWQgPT09IDB4MTUpKSByZXR1cm4ge307XG4gICAgY2FzZSAweDI1OiAvLyBhbWF6b25lcyBndWFyZFxuICAgICAgcmVzdWx0LmhpdGJveCA9IHt4MDogMCwgeDE6IDIsIHkwOiAwLCB5MTogMX07XG4gICAgICBzdGF0dWVPcihNYWdpYy5DSEFOR0UsIE1hZ2ljLlBBUkFMWVNJUyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4MmQ6IC8vIG10IHNhYnJlL3N3YW4gc29sZGllcnNcbiAgICAgIC8vIFRoZXNlIGRvbid0IGNvdW50IGFzIHN0YXR1ZXMgYmVjYXVzZSB0aGV5J2xsIG1vdmUgaWYgeW91IHRhbGsgdG8gdGhlbS5cbiAgICAgIGRlbGV0ZSByZXN1bHQudGVycmFpbjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHgzMzogLy8gcG9ydG9hIGd1YXJkICh0aHJvbmUgcm9vbSwgdGhvdWdoIHRoZSBwYWxhY2Ugb25lIGlzIHRoZSBvbmUgdGhhdCBtYXR0ZXJzKVxuICAgICAgLy8gTk9URTogdGhpcyBtZWFucyB0aGF0IHdlIGNhbm5vdCBzZXBhcmF0ZSB0aGUgcGFsYWNlIGZveWVyIGZyb20gdGhlIHRocm9uZSByb29tLCBzaW5jZVxuICAgICAgLy8gdGhlcmUncyBubyB3YXkgdG8gcmVwcmVzZW50IHRoZSBjb25kaXRpb24gZm9yIHBhcmFseXppbmcgdGhlIGd1YXJkIGFuZCBzdGlsbCBoYXZlIGhpbVxuICAgICAgLy8gcGFzc2FibGUgd2hlbiB0aGUgcXVlZW4gaXMgdGhlcmUuICBUaGUgd2hvbGUgc2VxdWVuY2UgaXMgYWxzbyB0aWdodGx5IGNvdXBsZWQsIHNvIGl0XG4gICAgICAvLyBwcm9iYWJseSB3b3VsZG4ndCBtYWtlIHNlbnNlIHRvIHNwbGl0IGl0IHVwIGFueXdheS5cbiAgICAgIHN0YXR1ZU9yKE1hZ2ljLlBBUkFMWVNJUyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDB4Mzg6IC8vIHBvcnRvYSBxdWVlbiBzaXR0aW5nIG9uIGltcGFzc2FibGUgdGhyb25lXG4gICAgICBpZiAobG9jLmlkID09PSAweGRmKSByZXN1bHQuaGl0Ym94ID0ge3gwOiAwLCB4MTogMSwgeTA6IDIsIHkxOiAzfTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHg0ZTogLy8gc2h5cm9uIGd1YXJkXG4gICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAtMSwgeDE6IDIsIHkwOiAwLCB5MTogMX07XG4gICAgICBzdGF0dWVPcihNYWdpYy5DSEFOR0UsIEV2ZW50LkVOVEVSRURfU0hZUk9OKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHg4MDogLy8gZ29hIGd1YXJkc1xuICAgICAgc3RhdHVlT3IoLi4uc3Bhd25Db25kaXRpb25zLm1hcChjID0+IENvbmRpdGlvbih+YykpKTsgLy8gRXZlbnQuRU5URVJFRF9TSFlST05cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMHg4NTogLy8gc3RvbmVkIHBhaXJcbiAgICAgIHN0YXR1ZU9yKEl0ZW0uRkxVVEVfT0ZfTElNRSk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBpbnRlcnNlY3Qgc3Bhd24gY29uZGl0aW9uc1xuICAgIGNvbnN0IHJlcXVpcmVtZW50czogQXJyYXk8cmVhZG9ubHkgW3JlYWRvbmx5IFtDb25kaXRpb25dXT4gPSBbXTtcbiAgICBjb25zdCBhZGRSZXEgPSAoZmxhZzogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgICBpZiAoZmxhZyA8PSAwKSByZXR1cm47IC8vIG5lZ2F0aXZlIG9yIHplcm8gZmxhZyBpZ25vcmVkXG4gICAgICBjb25zdCByZXEgPSBGTEFHX01BUC5nZXQoZmxhZykgfHwgKHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZmxhZykgPyBDb25kaXRpb24oZmxhZykgOiBudWxsKTtcbiAgICAgIGlmIChyZXEgIT0gbnVsbCkgcmVxdWlyZW1lbnRzLnB1c2gocmVxKTtcbiAgICB9O1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBzcGF3bkNvbmRpdGlvbnMpIHtcbiAgICAgIGFkZFJlcShmbGFnKTtcbiAgICB9XG5cbiAgICAvLyBMb29rIGZvciB0cmFkZS1pbnNcbiAgICAvLyAgLSBUT0RPIC0gZG9uJ3QgaGFyZC1jb2RlIHRoZSBOUENzPyByZWFkIGZyb20gdGhlIGl0ZW1kYXRhP1xuICAgIGNvbnN0IHRyYWRlSW4gPSB0aGlzLnRyYWRlSW5zLmdldChpZClcbiAgICBpZiAodHJhZGVJbiAhPSBudWxsKSB7XG4gICAgICBjb25zdCB0ID0gdHJhZGVJbjtcbiAgICAgIGZ1bmN0aW9uIHRyYWRlKHNsb3Q6IFNsb3QsIC4uLnJlcXM6IEFycmF5PHJlYWRvbmx5IFtyZWFkb25seSBDb25kaXRpb25bXV0+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IGFuZCguLi5yZXF1aXJlbWVudHMsIHQsIC4uLnJlcXMpO1xuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdCwgY29uZGl0aW9ufSk7XG4gICAgICB9XG4gICAgICBsZXQgdHJhZGVSID0gdHJhZGU7XG4gICAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3MucmFuZG9taXplVHJhZGVzKCkpIHtcbiAgICAgICAgdHJhZGVSID0gKHNsb3QsIC4uLnJlcXMpID0+IHtcbiAgICAgICAgICBjb25zdCBpdGVtcyA9IFtcbiAgICAgICAgICAgIEl0ZW0uU1RBVFVFX09GX09OWVgsXG4gICAgICAgICAgICBJdGVtLkZPR19MQU1QLFxuICAgICAgICAgICAgSXRlbS5MT1ZFX1BFTkRBTlQsXG4gICAgICAgICAgICBJdGVtLktJUklTQV9QTEFOVCxcbiAgICAgICAgICAgIEl0ZW0uSVZPUllfU1RBVFVFLFxuICAgICAgICAgIF07XG4gICAgICAgICAgY29uc3QgY29uZGl0aW9uID1cbiAgICAgICAgICAgICAgb3IoLi4uaXRlbXMubWFwKGkgPT4gYW5kKC4uLnJlcXVpcmVtZW50cywgaSwgLi4ucmVxcykpKTtcbiAgICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdCwgY29uZGl0aW9ufSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHN3aXRjaCAoaWQpIHtcbiAgICAgIGNhc2UgMHgxNTogLy8gc2xlZXBpbmcgd2luZG1pbGwgZ3VhcmQgPT4gd2luZG1pbGwga2V5IHNsb3RcbiAgICAgICAgdHJhZGUoU2xvdChJdGVtLldJTkRNSUxMX0tFWSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHgyMzogLy8gYXJ5bGxpcyA9PiBib3cgb2YgbW9vbiBzbG90XG4gICAgICAgIC8vIE5PVEU6IHNpdHRpbmcgb24gaW1wYXNzaWJsZSB0aHJvbmVcbiAgICAgICAgcmVzdWx0LmhpdGJveCA9IHt4MDogLTEsIHgxOiAyLCB5MDogLTEsIHkxOiAyfTtcbiAgICAgICAgdHJhZGVSKFNsb3QoSXRlbS5CT1dfT0ZfTU9PTiksIE1hZ2ljLkNIQU5HRSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDYzOiAvLyBodXJ0IGRvbHBoaW4gPT4gaGVhbGVkIGRvbHBoaW5cbiAgICAgICAgLy8gTk9URTogZG9scGhpbiBvbiB3YXRlciwgYnV0IGNhbiBoZWFsIGZyb20gbGFuZFxuICAgICAgICByZXN1bHQuaGl0Ym94ID0ge3gwOiAtMSwgeDE6IDIsIHkwOiAtMSwgeTE6IDJ9O1xuICAgICAgICB0cmFkZShTbG90KEV2ZW50LkhFQUxFRF9ET0xQSElOKSk7XG4gICAgICAgIHRyYWRlKFNsb3QoSXRlbS5TSEVMTF9GTFVURSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg2NDogLy8gZmlzaGVybWFuXG4gICAgICAgIHRyYWRlUihTbG90KEV2ZW50LlJFVFVSTkVEX0ZPR19MQU1QKSxcbiAgICAgICAgICAgICAgIC4uLih0aGlzLmZsYWdzLnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCkgP1xuICAgICAgICAgICAgICAgICAgIFtFdmVudC5IRUFMRURfRE9MUEhJTl0gOiBbXSkpO1xuICAgICAgICAvLyBUT0RPIC0gdXNlIHRoaXMgYXMgcHJveHkgZm9yIGJvYXRcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NmI6IC8vIHNsZWVwaW5nIGtlbnN1XG4gICAgICAgIHRyYWRlKFNsb3QoSXRlbS5HTE9XSU5HX0xBTVApKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NzU6IC8vIHNsaW1lZCBrZW5zdSA9PiBmbGlnaHQgc2xvdFxuICAgICAgICB0cmFkZVIoU2xvdChNYWdpYy5GTElHSFQpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4NzQ6IC8vIGtlbnN1IGluIGRhbmNlIGhhbGwgPT4gY2hhbmdlIHNsb3RcbiAgICAgICAgLy8gTk9URTogdGhpcyBpcyBub3JtYWxseSA3ZSBidXQgd2UgY2hhbmdlIGl0IHRvIDc0IGluIHRoaXMgb25lXG4gICAgICAgIC8vIGxvY2F0aW9uIHRvIGlkZW50aWZ5IGl0XG4gICAgICAgIHRyYWRlUihTbG90KE1hZ2ljLkNIQU5HRSksIE1hZ2ljLlBBUkFMWVNJUywgRXZlbnQuRk9VTkRfS0VOU1UpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHg4MjogLy8gYWthaGFuYSA9PiBnYXMgbWFzayBzbG90IChjaGFuZ2VkIDE2IC0+IDgyKVxuICAgICAgICB0cmFkZVIoU2xvdChJdGVtLkdBU19NQVNLKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDg4OiAvLyBzdG9uZWQgYWthaGFuYSA9PiBzaGllbGQgcmluZyBzbG90XG4gICAgICAgIHRyYWRlKFNsb3QoSXRlbS5TSElFTERfUklORykpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOUENzIHRoYXQgbmVlZCBhIGxpdHRsZSBleHRyYSBjYXJlXG5cbiAgICBpZiAoaWQgPT09IDB4ODQpIHsgLy8gc3RhcnQgZmlnaHQgd2l0aCBzYWJlcmFcbiAgICAgIC8vIFRPRE8gLSBsb29rIHVwIHdobyB0aGUgYWN0dWFsIGJvc3MgaXMgb25jZSB3ZSBnZXQgYm9zcyBzaHVmZmxlISEhXG4gICAgICBjb25zdCBjb25kaXRpb24gPSB0aGlzLmJvc3NSZXF1aXJlbWVudHModGhpcy5yb20uYm9zc2VzLnNhYmVyYTEpO1xuICAgICAgcmV0dXJuIHtjaGVjazogW1xuICAgICAgICB7Y29uZGl0aW9uLCBzbG90OiBTbG90KEJvc3MuU0FCRVJBMSl9LFxuICAgICAgXX07XG4gICAgfSBlbHNlIGlmIChpZCA9PT0gMHgxZCkgeyAvLyBvYWsgZWxkZXIgaGFzIHNvbWUgd2VpcmQgdW50cmFja2VkIGNvbmRpdGlvbnMuXG4gICAgICBjb25zdCBzbG90ID0gU2xvdChJdGVtLlNXT1JEX09GX0ZJUkUpO1xuICAgICAgcmV0dXJuIHtjaGVjazogW1xuICAgICAgICAvLyB0d28gZGlmZmVyZW50IHdheXMgdG8gZ2V0IHRoZSBzd29yZCBvZiBmaXJlIGl0ZW1cbiAgICAgICAge2NvbmRpdGlvbjogYW5kKE1hZ2ljLlRFTEVQQVRIWSwgQm9zcy5JTlNFQ1QpLCBzbG90fSxcbiAgICAgICAge2NvbmRpdGlvbjogRXZlbnQuUkVTQ1VFRF9DSElMRCwgc2xvdH0sXG4gICAgICBdfTtcbiAgICB9IGVsc2UgaWYgKGlkID09PSAweDFmKSB7IC8vIGR3YXJmIGNoaWxkXG4gICAgICBjb25zdCBzcGF3bnMgPSB0aGlzLnJvbS5ucGNzW2lkXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KGxvYy5pZCk7XG4gICAgICBpZiAoc3Bhd25zICYmIHNwYXducy5pbmNsdWRlcygweDA0NSkpIHJldHVybiB7fTsgLy8gaW4gbW90aGVyJ3MgaG91c2VcbiAgICAgIHJldHVybiB7Y2hlY2s6IFtcbiAgICAgICAge2NvbmRpdGlvbjogRXZlbnQuRFdBUkZfTU9USEVSLCBzbG90OiBTbG90KEV2ZW50LkRXQVJGX0NISUxEKX0sXG4gICAgICBdfTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmdsb2JhbERpYWxvZ3MpIHtcbiAgICAgIGFkZFJlcSh+ZC5jb25kaXRpb24pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmxvY2FsRGlhbG9ncy5nZXQobG9jLmlkKSB8fCBucGMubG9jYWxEaWFsb2dzLmdldCgtMSkgfHwgW10pIHtcbiAgICAgIC8vIElmIHRoZSBjaGVjayBjb25kaXRpb24gaXMgb3Bwb3NpdGUgdG8gdGhlIHNwYXduIGNvbmRpdGlvbiwgdGhlbiBza2lwLlxuICAgICAgLy8gVGhpcyBlbnN1cmVzIHdlIGRvbid0IGV4cGVjdCB0aGUgcXVlZW4gdG8gZ2l2ZSByZWNvdmVyIGluIHRoZSB0aHJvbmUgcm9vbS5cbiAgICAgIGlmIChzcGF3bkNvbmRpdGlvbnMuaW5jbHVkZXMofmQuY29uZGl0aW9uKSkgY29udGludWU7XG4gICAgICAvLyBBcHBseSB0aGUgRkxBR19NQVAuXG4gICAgICBjb25zdCBtYXBwZWQgPSBGTEFHX01BUC5nZXQoZC5jb25kaXRpb24pO1xuICAgICAgY29uc3QgcG9zaXRpdmUgPVxuICAgICAgICAgIG1hcHBlZCA/IFttYXBwZWRdIDpcbiAgICAgICAgICB0aGlzLnJlbGV2YW50RmxhZ3MuaGFzKGQuY29uZGl0aW9uKSA/IFtDb25kaXRpb24oZC5jb25kaXRpb24pXSA6XG4gICAgICAgICAgW107XG4gICAgICBjb25zdCBjb25kaXRpb24gPSBhbmQoLi4ucG9zaXRpdmUsIC4uLnJlcXVpcmVtZW50cyk7XG4gICAgICAvLyBJZiB0aGUgY29uZGl0aW9uIGlzIGEgbmVnYXRpdmUgdGhlbiBhbnkgZnV0dXJlIGNvbmRpdGlvbnMgbXVzdCBpbmNsdWRlXG4gICAgICAvLyBpdCBhcyBhIHBvc2l0aXZlIHJlcXVpcmVtZW50LlxuICAgICAgY29uc3QgbmVnYXRpdmUgPVxuICAgICAgICAgIEZMQUdfTUFQLmdldCh+ZC5jb25kaXRpb24pIHx8XG4gICAgICAgICAgKHRoaXMucmVsZXZhbnRGbGFncy5oYXMofmQuY29uZGl0aW9uKSA/IENvbmRpdGlvbih+ZC5jb25kaXRpb24pIDogbnVsbCk7XG4gICAgICBpZiAobmVnYXRpdmUgIT0gbnVsbCkgcmVxdWlyZW1lbnRzLnB1c2gobmVnYXRpdmUpO1xuICAgICAgY29uc3QgYWN0aW9uID0gZC5tZXNzYWdlLmFjdGlvbjtcbiAgICAgIGlmIChhY3Rpb24gPT09IDB4MDMpIHtcbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QuaXRlbShucGMuZGF0YVswXSksIGNvbmRpdGlvbn0pO1xuICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IDB4MTEgfHwgYWN0aW9uID09PSAweDA5KSB7XG4gICAgICAgIC8vIE5PVEU6ICQwOSBpcyB6ZWJ1IHN0dWRlbnQsIHdoaWNoIHdlJ3ZlIHBhdGNoZWQgdG8gZ2l2ZSB0aGUgaXRlbS5cbiAgICAgICAgcmVzdWx0LmNoZWNrLnB1c2goe3Nsb3Q6IFNsb3QuaXRlbShucGMuZGF0YVsxXSksIGNvbmRpdGlvbn0pO1xuICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IDB4MTApIHtcbiAgICAgICAgLy8gTk9URTogUXVlZW4gY2FuJ3QgYmUgcmV2ZWFsZWQgYXMgYXNpbmEgaW4gdGhlIHRocm9uZSByb29tLiAgSW4gcGFydGljdWxhcixcbiAgICAgICAgLy8gdGhpcyBlbnN1cmVzIHRoYXQgdGhlIGJhY2sgcm9vbSBpcyByZWFjaGFibGUgYmVmb3JlIHJlcXVpcmluZyB0aGUgZG9scGhpblxuICAgICAgICAvLyB0byBhcHBlYXIuICBUaGlzIHNob3VsZCBiZSBoYW5kbGVkIGJ5IHRoZSBhYm92ZSBjaGVjayBmb3IgdGhlIGRpYWxvZyBhbmRcbiAgICAgICAgLy8gc3Bhd24gY29uZGl0aW9ucyB0byBiZSBjb21wYXRpYmxlLlxuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdChNYWdpYy5SRUNPVkVSKSwgY29uZGl0aW9ufSk7XG4gICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gMHgwOCAmJiBpZCA9PT0gMHgyZCkge1xuICAgICAgICByZXN1bHQuY2hlY2sucHVzaCh7c2xvdDogU2xvdChFdmVudC5PUEVORURfU1dBTiksIGNvbmRpdGlvbn0pO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBmbGFnIG9mIGQuZmxhZ3MpIHtcbiAgICAgICAgY29uc3QgbWZsYWcgPSBGTEFHX01BUC5nZXQoZmxhZyk7XG4gICAgICAgIGNvbnN0IHBmbGFnID0gbWZsYWcgPyBtZmxhZyA6IHRoaXMucmVsZXZhbnRGbGFncy5oYXMoZmxhZykgPyBDb25kaXRpb24oZmxhZykgOiBudWxsO1xuICAgICAgICBpZiAocGZsYWcpIHJlc3VsdC5jaGVjay5wdXNoKHtzbG90OiBTbG90KHBmbGFnKSwgY29uZGl0aW9ufSk7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGUgc3Bhd24gKnJlcXVpcmVzKiB0aGlzIGNvbmRpdGlvbiB0aGVuIGRvbid0IGV2YWx1YXRlIGFueSBtb3JlLiAgVGhpc1xuICAgICAgLy8gZW5zdXJlcyB3ZSBkb24ndCBleHBlY3QgdGhlIHF1ZWVuIHRvIGdpdmUgdGhlIGZsdXRlIG9mIGxpbWUgaW4gdGhlIGJhY2sgcm9vbSxcbiAgICAgIC8vIHNpbmNlIHNoZSB3b3VsZG4ndCBoYXZlIHNwYXduZWQgdGhlcmUgaW50aW1lIHRvIGdpdmUgaXQuXG4gICAgICBpZiAocG9zaXRpdmUubGVuZ3RoICYmIHNwYXduQ29uZGl0aW9ucy5pbmNsdWRlcyhkLmNvbmRpdGlvbikpIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgY2FwYWJpbGl0aWVzKCk6IENhcGFiaWxpdHlEYXRhW10ge1xuICAgIGxldCBicmVha1N0b25lOiBSZXF1aXJlbWVudCA9IEl0ZW0uU1dPUkRfT0ZfV0lORDtcbiAgICBsZXQgYnJlYWtJY2U6IFJlcXVpcmVtZW50ID0gSXRlbS5TV09SRF9PRl9GSVJFO1xuICAgIGxldCBmb3JtQnJpZGdlOiBSZXF1aXJlbWVudCA9IEl0ZW0uU1dPUkRfT0ZfV0FURVI7XG4gICAgbGV0IGJyZWFrSXJvbjogUmVxdWlyZW1lbnQgPSBJdGVtLlNXT1JEX09GX1RIVU5ERVI7XG4gICAgaWYgKCF0aGlzLmZsYWdzLm9yYnNPcHRpb25hbCgpKSB7XG4gICAgICAvLyBBZGQgb3JiIHJlcXVpcmVtZW50XG4gICAgICBicmVha1N0b25lID0gb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfV0lORCwgSXRlbS5PUkJfT0ZfV0lORCksXG4gICAgICAgICAgICAgICAgICAgICAgYW5kKEl0ZW0uU1dPUkRfT0ZfV0lORCwgSXRlbS5UT1JOQURPX0JSQUNFTEVUKSk7XG4gICAgICBicmVha0ljZSA9IG9yKGFuZChJdGVtLlNXT1JEX09GX0ZJUkUsIEl0ZW0uT1JCX09GX0ZJUkUpLFxuICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9GSVJFLCBJdGVtLkZMQU1FX0JSQUNFTEVUKSk7XG4gICAgICBmb3JtQnJpZGdlID0gb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfV0FURVIsIEl0ZW0uT1JCX09GX1dBVEVSKSxcbiAgICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9XQVRFUiwgSXRlbS5CTElaWkFSRF9CUkFDRUxFVCkpO1xuICAgICAgYnJlYWtJcm9uID0gb3IoYW5kKEl0ZW0uU1dPUkRfT0ZfVEhVTkRFUiwgSXRlbS5PUkJfT0ZfVEhVTkRFUiksXG4gICAgICAgICAgICAgICAgICAgICBhbmQoSXRlbS5TV09SRF9PRl9USFVOREVSLCBJdGVtLlNUT1JNX0JSQUNFTEVUKSk7XG4gICAgICBpZiAodGhpcy5mbGFncy5hc3N1bWVTd29yZENoYXJnZUdsaXRjaCgpKSB7XG4gICAgICAgIGNvbnN0IGxldmVsMiA9IG9yKGJyZWFrU3RvbmUsIGJyZWFrSWNlLCBmb3JtQnJpZGdlLCBicmVha0lyb24pO1xuICAgICAgICBmdW5jdGlvbiBuZWVkKHN3b3JkOiByZWFkb25seSBbcmVhZG9ubHkgW0NvbmRpdGlvbl1dKTogUmVxdWlyZW1lbnQge1xuICAgICAgICAgIGNvbnN0IGNvbmRpdGlvbjogQ29uZGl0aW9uID0gc3dvcmRbMF1bMF07XG4gICAgICAgICAgcmV0dXJuIGxldmVsMi5tYXAoYyA9PiBjWzBdID09PSBjb25kaXRpb24gPyBjIDogW2NvbmRpdGlvbiwgLi4uY10pO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrU3RvbmUgPSBuZWVkKEl0ZW0uU1dPUkRfT0ZfV0lORCk7XG4gICAgICAgIGJyZWFrSWNlID0gbmVlZChJdGVtLlNXT1JEX09GX0ZJUkUpO1xuICAgICAgICBmb3JtQnJpZGdlID0gbmVlZChJdGVtLlNXT1JEX09GX1dBVEVSKTtcbiAgICAgICAgYnJlYWtJcm9uID0gbmVlZChJdGVtLlNXT1JEX09GX1RIVU5ERVIpO1xuICAgICAgfVxuICAgIH1cbiAgICB0eXBlIENhcGFiaWxpdHlMaXN0ID0gQXJyYXk8W3JlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV0sIC4uLlJlcXVpcmVtZW50W11dPjtcbiAgICBjb25zdCBjYXBhYmlsaXRpZXM6IENhcGFiaWxpdHlMaXN0ID0gW1xuICAgICAgW0V2ZW50LlNUQVJULCBhbmQoKV0sXG4gICAgICBbQ2FwYWJpbGl0eS5TV09SRCxcbiAgICAgICBJdGVtLlNXT1JEX09GX1dJTkQsIEl0ZW0uU1dPUkRfT0ZfRklSRSxcbiAgICAgICBJdGVtLlNXT1JEX09GX1dBVEVSLCBJdGVtLlNXT1JEX09GX1RIVU5ERVJdLFxuICAgICAgW0NhcGFiaWxpdHkuQlJFQUtfU1RPTkUsIGJyZWFrU3RvbmVdLFxuICAgICAgW0NhcGFiaWxpdHkuQlJFQUtfSUNFLCBicmVha0ljZV0sXG4gICAgICBbQ2FwYWJpbGl0eS5GT1JNX0JSSURHRSwgZm9ybUJyaWRnZV0sXG4gICAgICBbQ2FwYWJpbGl0eS5CUkVBS19JUk9OLCBicmVha0lyb25dLFxuICAgICAgW0NhcGFiaWxpdHkuTU9ORVksIENhcGFiaWxpdHkuU1dPUkRdLCAvLyBUT0RPIC0gY2xlYXIgdGhpcyB1cFxuICAgICAgW0NhcGFiaWxpdHkuQ0xJTUJfV0FURVJGQUxMLCBNYWdpYy5GTElHSFRdLFxuICAgICAgW0NhcGFiaWxpdHkuU0hPT1RJTkdfU1RBVFVFLCBNYWdpYy5CQVJSSUVSXSwgLy8gVE9ETyAtIGFsbG93IHNoaWVsZCByaW5nP1xuICAgICAgW0NhcGFiaWxpdHkuQ0xJTUJfU0xPUEUsIEl0ZW0uUkFCQklUX0JPT1RTLCBNYWdpYy5GTElHSFRdLFxuICAgICAgW0V2ZW50LkdFTkVSQUxTX0RFRkVBVEVELCBJdGVtLklWT1JZX1NUQVRVRV0sIC8vIFRPRE8gLSBmaXggdGhpc1xuICAgICAgW0V2ZW50Lk9QRU5FRF9TRUFMRURfQ0FWRSwgRXZlbnQuU1RBUlRFRF9XSU5ETUlMTF0sIC8vIFRPRE8gLSBtZXJnZSBjb21wbGV0ZWx5P1xuICAgIF07XG5cbiAgICBpZiAodGhpcy5mbGFncy5hc3N1bWVHaGV0dG9GbGlnaHQoKSkge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuQ0xJTUJfV0FURVJGQUxMLCBhbmQoRXZlbnQuUklERV9ET0xQSElOLCBJdGVtLlJBQkJJVF9CT09UUyldKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZmxhZ3MuZ3VhcmFudGVlQmFycmllcigpKSB7XG4gICAgICAvLyBUT0RPIC0gc3dvcmQgY2hhcmdlIGdsaXRjaCBtaWdodCBiZSBhIHByb2JsZW0gd2l0aCB0aGUgaGVhbGluZyBvcHRpb24uLi5cbiAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtDYXBhYmlsaXR5LlNIT09USU5HX1NUQVRVRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBhbmQoQ2FwYWJpbGl0eS5NT05FWSwgQ2FwYWJpbGl0eS5CVVlfSEVBTElORyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIEl0ZW0uU0hJRUxEX1JJTkcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBNYWdpYy5SRUZSRVNIKV0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmZsYWdzLmxlYXRoZXJCb290c0dpdmVTcGVlZCgpKSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5DTElNQl9TTE9QRSwgSXRlbS5MRUFUSEVSX0JPT1RTXSk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBib3NzIG9mIHRoaXMucm9tLmJvc3Nlcykge1xuICAgICAgaWYgKGJvc3Mua2lsbCAhPSBudWxsICYmIGJvc3MuZHJvcCAhPSBudWxsKSB7XG4gICAgICAgIC8vIFNhdmVzIHJlZHVuZGFuY3kgb2YgcHV0dGluZyB0aGUgaXRlbSBpbiB0aGUgYWN0dWFsIHJvb20uXG4gICAgICAgIGNhcGFiaWxpdGllcy5wdXNoKFtJdGVtKGJvc3MuZHJvcCksIEJvc3MoYm9zcy5raWxsKV0pO1xuICAgICAgfVxuICAgIH1cbiAgICBjYXBhYmlsaXRpZXMucHVzaChbSXRlbS5PUkJfT0ZfV0FURVIsIEJvc3MuUkFHRV0pO1xuXG4gICAgaWYgKHRoaXMuZmxhZ3MuZ3VhcmFudGVlR2FzTWFzaygpKSB7XG4gICAgICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5UUkFWRUxfU1dBTVAsIEl0ZW0uR0FTX01BU0tdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FwYWJpbGl0aWVzLnB1c2goW0NhcGFiaWxpdHkuVFJBVkVMX1NXQU1QLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICBvcihJdGVtLkdBU19NQVNLLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuZChDYXBhYmlsaXR5Lk1PTkVZLCBJdGVtLk1FRElDQUxfSEVSQiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5kKENhcGFiaWxpdHkuTU9ORVksIE1hZ2ljLlJFRlJFU0gpKV0pO1xuICAgIH1cblxuICAgIC8vIGlmICh0aGlzLmZsYWdzLmFzc3VtZVN0YXR1ZUdsaXRjaCgpKSB7XG4gICAgLy8gICBjYXBhYmlsaXRpZXMucHVzaChbQ2FwYWJpbGl0eS5TVEFUVUVfR0xJVENILCBbW11dXSk7XG4gICAgLy8gfVxuXG4gICAgcmV0dXJuIGNhcGFiaWxpdGllcy5tYXAoKFtjYXBhYmlsaXR5LCAuLi5kZXBzXSkgPT4gKHtjYXBhYmlsaXR5LCBjb25kaXRpb246IG9yKC4uLmRlcHMpfSkpO1xuICB9XG5cbiAgd2FsbENhcGFiaWxpdHkodHlwZTogV2FsbFR5cGUpOiB7ZmxhZzogbnVtYmVyfSB7XG4gICAgcmV0dXJuIHtmbGFnOiBbQ2FwYWJpbGl0eS5CUkVBS19TVE9ORSwgQ2FwYWJpbGl0eS5CUkVBS19JQ0UsXG4gICAgICAgICAgICAgICAgICAgQ2FwYWJpbGl0eS5GT1JNX0JSSURHRSwgQ2FwYWJpbGl0eS5CUkVBS19JUk9OXVt0eXBlXVswXVswXX07XG4gIH1cbn1cblxudHlwZSBUaWxlQ2hlY2sgPSBDaGVjayAmIHt0aWxlOiBUaWxlSWR9O1xuXG4vLyBUT0RPIC0gbWF5YmUgcHVsbCB0cmlnZ2VycyBhbmQgbnBjcywgZXRjLCBiYWNrIHRvZ2V0aGVyP1xuLy8gICAgICAtIG9yIG1ha2UgdGhlIGxvY2F0aW9uIG92ZXJsYXkgYSBzaW5nbGUgZnVuY3Rpb24/XG4vLyAgICAgICAgLT4gbmVlZHMgY2xvc2VkLW92ZXIgc3RhdGUgdG8gc2hhcmUgaW5zdGFuY2VzLi4uXG5cbmludGVyZmFjZSBFeHRyYVJvdXRlIHtcbiAgdGlsZTogVGlsZUlkO1xuICBjb25kaXRpb24/OiBSZXF1aXJlbWVudDtcbn1cbmludGVyZmFjZSBFeHRyYUVkZ2Uge1xuICBmcm9tOiBUaWxlSWQ7XG4gIHRvOiBUaWxlSWQ7XG4gIGNvbmRpdGlvbj86IFJlcXVpcmVtZW50O1xufVxuXG5pbnRlcmZhY2UgVHJpZ2dlckRhdGEge1xuICB0ZXJyYWluPzogVGVycmFpbjtcbiAgY2hlY2s/OiBDaGVja1tdO1xuICAvLyBhbGxvd3Mgbm90IGFzc3VtaW5nIHRlbGVwb3J0IHNraXBcbiAgZXh0cmFMb2NhdGlvbnM/OiBMb2NhdGlvbltdO1xuICAvLyBhbGxvd3Mgbm90IGFzc3VtaW5nIHJhYmJpdCBza2lwXG4gIGR4PzogbnVtYmVyW107XG59XG5cbmludGVyZmFjZSBOcGNEYXRhIHtcbiAgaGl0Ym94PzogSGl0Ym94O1xuICB0ZXJyYWluPzogVGVycmFpbjtcbiAgY2hlY2s/OiBDaGVja1tdO1xufVxuXG5pbnRlcmZhY2UgSGl0Ym94IHtcbiAgeDA6IG51bWJlcjtcbiAgeTA6IG51bWJlcjtcbiAgeDE6IG51bWJlcjtcbiAgeTE6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIENhcGFiaWxpdHlEYXRhIHtcbiAgY29uZGl0aW9uPzogUmVxdWlyZW1lbnQ7XG4gIGNhcGFiaWxpdHk6IHJlYWRvbmx5IFtyZWFkb25seSBbQ29uZGl0aW9uXV07XG59XG5cbi8vIFN0YXRpYyBtYXAgb2YgdGVycmFpbnMuXG5jb25zdCBURVJSQUlOUzogQXJyYXk8VGVycmFpbiB8IHVuZGVmaW5lZD4gPSAoKCkgPT4ge1xuICBjb25zdCBvdXQgPSBbXTtcbiAgZm9yIChsZXQgZWZmZWN0cyA9IDA7IGVmZmVjdHMgPCAxMjg7IGVmZmVjdHMrKykge1xuICAgIG91dFtlZmZlY3RzXSA9IHRlcnJhaW4oZWZmZWN0cyk7XG4gIH1cbiAgLy8gY29uc29sZS5sb2coJ1RFUlJBSU5TJywgb3V0KTtcbiAgcmV0dXJuIG91dDtcblxuICAvKipcbiAgICogQHBhcmFtIGVmZmVjdHMgVGhlICQyNiBiaXRzIG9mIHRpbGVlZmZlY3RzLCBwbHVzICQwOCBmb3Igc3dhbXAsICQxMCBmb3IgZG9scGhpbixcbiAgICogJDAxIGZvciBzaG9vdGluZyBzdGF0dWVzLCAkNDAgZm9yIHNob3J0IHNsb3BlXG4gICAqIEByZXR1cm4gdW5kZWZpbmVkIGlmIHRoZSB0ZXJyYWluIGlzIGltcGFzc2FibGUuXG4gICAqL1xuICBmdW5jdGlvbiB0ZXJyYWluKGVmZmVjdHM6IG51bWJlcik6IFRlcnJhaW4gfCB1bmRlZmluZWQge1xuICAgIC8vIE5PVEU6IHN3YW1wICsgc2hvb3Rpbmcgc3RhdHVlcyBzaG91bGQgbmV2ZXIgaGFwcGVuLiAgSW5zdGVhZCwgd2UgdXNlXG4gICAgLy8gdGhlIHNob290aW5nIHN0YXR1ZXMgYml0IGFzIGEgd2F5IHRvIG1ha2UgYSBzZXBhcmF0ZSB0ZXJyYWluIHNvIHRoYXRcbiAgICAvLyBlYWNoIHNjcmVlbiBuZWVkcyB0byBiZSBlbnRlcmVkIHNlcGFyYXRlbHkuXG4gICAgaWYgKChlZmZlY3RzICYgMHgwOSkgPT09IDB4MDkpIGVmZmVjdHMgJj0gfjB4MDE7XG4gICAgaWYgKGVmZmVjdHMgJiAweDA0KSByZXR1cm4gdW5kZWZpbmVkOyAvLyBpbXBhc3NpYmxlXG4gICAgY29uc3QgdGVycmFpbjogVGVycmFpbiA9IHt9O1xuICAgIGlmICgoZWZmZWN0cyAmIDB4MTIpID09PSAweDEyKSB7IC8vIGRvbHBoaW4gb3IgZmx5XG4gICAgICBpZiAoZWZmZWN0cyAmIDB4MjApIHRlcnJhaW4uZXhpdCA9IENhcGFiaWxpdHkuQ0xJTUJfV0FURVJGQUxMO1xuICAgICAgdGVycmFpbi5lbnRlciA9IG9yKEV2ZW50LlJJREVfRE9MUEhJTiwgTWFnaWMuRkxJR0hUKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGVmZmVjdHMgJiAweDQwKSB7IC8vIHNob3J0IHNsb3BlXG4gICAgICAgIHRlcnJhaW4uZXhpdCA9IENhcGFiaWxpdHkuQ0xJTUJfU0xPUEU7XG4gICAgICB9IGVsc2UgaWYgKGVmZmVjdHMgJiAweDIwKSB7IC8vIHNsb3BlXG4gICAgICAgIHRlcnJhaW4uZXhpdCA9IE1hZ2ljLkZMSUdIVDtcbiAgICAgIH1cbiAgICAgIGlmIChlZmZlY3RzICYgMHgwMikgdGVycmFpbi5lbnRlciA9IE1hZ2ljLkZMSUdIVDsgLy8gbm8td2Fsa1xuICAgIH1cbiAgICBpZiAoZWZmZWN0cyAmIDB4MDgpIHsgLy8gc3dhbXBcbiAgICAgIHRlcnJhaW4uZW50ZXIgPSAodGVycmFpbi5lbnRlciB8fCBbW11dKS5tYXAoY3MgPT4gQ2FwYWJpbGl0eS5UUkFWRUxfU1dBTVBbMF0uY29uY2F0KGNzKSk7XG4gICAgfVxuICAgIGlmIChlZmZlY3RzICYgMHgwMSkgeyAvLyBzaG9vdGluZyBzdGF0dWVzXG4gICAgICB0ZXJyYWluLmVudGVyID0gKHRlcnJhaW4uZW50ZXIgfHwgW1tdXSkubWFwKGNzID0+IENhcGFiaWxpdHkuU0hPT1RJTkdfU1RBVFVFWzBdLmNvbmNhdChjcykpO1xuICAgIH1cbiAgICByZXR1cm4gdGVycmFpbjtcbiAgfVxufSkoKTtcblxuLy8gVE9ETyAtIGZpZ3VyZSBvdXQgd2hhdCB0aGlzIGxvb2tzIGxpa2UuLi4/XG4vLyAgLSBtYXliZSB3ZSBqdXN0IHdhbnQgdG8gbWFrZSBhIHBzZXVkbyBERUZFQVRFRF9JTlNFQ1QgZXZlbnQsIGJ1dCB0aGlzIHdvdWxkIG5lZWQgdG8gYmVcbi8vICAgIHNlcGFyYXRlIGZyb20gMTAxLCBzaW5jZSB0aGF0J3MgYXR0YWNoZWQgdG8gdGhlIGl0ZW1nZXQsIHdoaWNoIHdpbGwgbW92ZSB3aXRoIHRoZSBzbG90IVxuLy8gIC0gcHJvYmFibHkgd2FudCBhIGZsYWcgZm9yIGVhY2ggYm9zcyBkZWZlYXRlZC4uLj9cbi8vICAgIGNvdWxkIHVzZSBib3Nza2lsbCBJRCBmb3IgaXQ/XG4vLyAgICAtIHRoZW4gbWFrZSB0aGUgZHJvcCBhIHNpbXBsZSBkZXJpdmF0aXZlIGZyb20gdGhhdC4uLlxuLy8gICAgLSB1cHNob3QgLSBubyBsb25nZXIgbmVlZCB0byBtaXggaXQgaW50byBucGMoKSBvciB0cmlnZ2VyKCkgb3ZlcmxheSwgaW5zdGVhZCBtb3ZlIGl0XG4vLyAgICAgIHRvIGNhcGFiaWxpdHkgb3ZlcmxheS5cbi8vIGZ1bmN0aW9uIHNsb3RGb3I8VD4oaXRlbTogVCk6IFQgeyByZXR1cm4gaXRlbTsgfVxuIl19