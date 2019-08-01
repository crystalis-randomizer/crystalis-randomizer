import {Boss, Capability, Check, Condition, Event, Item, Magic, MutableRequirement,
        Requirement, Slot, Terrain, WallType, and, meet, or} from './condition.js';
import {TileId, ScreenId} from './geometry.js';
import {FlagSet} from '../flagset.js';
import {Rom} from '../rom.js';
import {Boss as RomBoss} from '../rom/bosses.js';
import {Location} from '../rom/location.js';
import {ShopType} from '../rom/shop.js';
import {hex} from '../rom/util.js';

// Additional information needed to interpret the world graph data.
// This gets into more specifics and hardcoding.

// TODO - maybe consider having a set of ASSUMED and a set of IGNORED flags?
//      - e.g. always assume 00f is FALSE rather than TRUE, to avoid free windmill key


// TODO - prison key missing from paralysis deps (or rather a non-flight version)!



const RELEVANT_FLAGS = [
  0x00a, // used windmill key
  0x00b, // talked to leaf elder
  0x018, // entered underground channel
  0x01b, // mesia recording played
  0x01e, // queen revealed
  0x021, // returned fog lamp
  0x024, // generals defeated (got ivory statue)
  0x025, // healed dolphin
  0x026, // entered shyron (for goa guards)
  0x027, // shyron massacre
  // 0x35, // cured akahana
  0x038, // leaf abduction
  0x03a, // talked to zebu in cave (added as req for abduction)
  0x03b, // talked to zebu in shyron (added as req for massacre)
  0x045, // rescued child
  0x052, // talked to dwarf mother
  0x053, // child following
  0x061, // talked to stom in swan hut
  // 0x06c, // defeated draygon 1
  0x072, // kensu found in tavern
  0x08b, // got shell flute
  0x09b, // able to ride dolphin
  0x0a5, // talked to zebu student
  0x0a9, // talked to leaf rabbit

  // swords (may be needed for rage, SoT for massacre)
  0x200, 0x201, 0x202, 0x203,
  // balls and bracelets may be needed for teleport
  0x205, 0x206, 0x207, 0x208, 0x209, 0x20a, 0x20b, 0x20c,
  0x236, // shell flute (for fisherman spawn)
  0x243, // telepathy (for rabbit, oak, deo)
  0x244, // teleport (for mt sabre trigger)
  0x283, // calmed sea (for barrier)
  0x2ee, // started windmill (for refresh)

  0x2f7, // warp:oak (for telepathy)
  0x2fb, // warp:joel (for evil spirit island)

  // Magic.CHANGE[0][0],
  // Magic.TELEPATHY[0][0],
];

// TODO - this is not pervasive enough!!!
//  - need a way to put it everywhere
//    -> maybe in MutableRequirements?
const FLAG_MAP: Map<number, readonly [readonly [Condition]]> = new Map([
  [0x00a, Event.STARTED_WINDMILL], // this is ref'd outside this file!
  //[0x00e, Magic.TELEPATHY],
  //[0x03f, Magic.TELEPORT],
  [0x013, Boss.SABERA1],
  // Queen will give flute of lime w/o paralysis in this case.
  [0x017, Item.SWORD_OF_WATER],
  [0x028, Magic.CHANGE],
  [0x029, Magic.CHANGE],
  [0x02a, Magic.CHANGE],
  [0x02b, Magic.CHANGE],
  [0x06c, Boss.DRAYGON1],
  [0x08b, Item.SHELL_FLUTE],
]);

// Maps trigger actions to the slot they grant.
const TRIGGER_ACTION_ITEMS: {[action: number]: Slot} = {
  0x08: Slot(Magic.PARALYSIS),
  0x0b: Slot(Magic.BARRIER),
  0x0f: Slot(Magic.REFRESH),
  0x18: Slot(Magic.TELEPATHY),
};

const SWORDS = [Item.SWORD_OF_WIND, Item.SWORD_OF_FIRE,
                Item.SWORD_OF_WATER, Item.SWORD_OF_THUNDER] as const;
const SWORD_POWERS = [
  [Item.ORB_OF_WIND, Item.TORNADO_BRACELET],
  [Item.ORB_OF_FIRE, Item.FLAME_BRACELET],
  [Item.ORB_OF_WATER, Item.BLIZZARD_BRACELET],
  [Item.ORB_OF_THUNDER, Item.STORM_BRACELET],
] as const;

function swordRequirement(sword: number, level: number): Requirement {
  let r;
  if (level === 1) r= SWORDS[sword];
  else if (level === 3) r= and(SWORDS[sword], ...SWORD_POWERS[sword]);
  else r= or(...SWORD_POWERS[sword].map(p => and(SWORDS[sword], p)));
  if (Array.isArray(r[0][0])) throw new Error();
  return r;
}

export class Overlay {

  private readonly relevantFlags = new Set<number>();
  // npc id -> wanted item
  private readonly tradeIns = new Map<number, readonly [readonly [Condition]]>();

  private readonly shootingStatues = new Set<ScreenId>();

  constructor(readonly rom: Rom, readonly flags: FlagSet) {
    // TODO - adjust based on flagset?
    for (const flag of RELEVANT_FLAGS) {
      this.relevantFlags.add(flag);
    }
    for (const item of rom.items) {
      if (!item.tradeIn) continue;
      const cond = item.id === 0x1d ? Capability.BUY_HEALING : Item(item.id);
      for (let i = 0; i < item.tradeIn.length; i += 6) {
        this.tradeIns.set(item.tradeIn[i], cond);
      }
    }
    for (const loc of rom.locations) {
      for (const spawn of loc.spawns) {
        if (spawn.isMonster() && spawn.id === 0x3f) { // shooting statues
          this.shootingStatues.add(ScreenId.from(loc, spawn));
        }
      }
    }
    //   0x1d, // medical herb
    //   0x25, // statue of onyx
    //   0x35, // fog lamp
    //   0x3b, // love pendant
    //   0x3c, // kirisa plant
    //   0x3d, // ivory statue
    // ].map(i => this.rom.items[i]);
  }

  /** @param id Object ID of the boss. */
  bossRequirements(boss: RomBoss): Requirement {
    // TODO - handle boss shuffle somehow?
    if (boss === this.rom.bosses.rage) {
      // return Item.SWORD_OF_WATER;
      return Condition(this.rom.npcs[0xc3].localDialogs.get(-1)![0].condition);
    }
    const id = boss.object;
    const out = new MutableRequirement();
    if (this.flags.guaranteeMatchingSword()) {
      const level = this.flags.guaranteeSwordMagic() ? boss.swordLevel : 1;
      const obj = this.rom.objects[id];
      for (let i = 0; i < 4; i++) {
        if (obj.isVulnerable(i)) out.addAll(swordRequirement(i, level));
      }
    } else {
      out.addAll(Capability.SWORD);
    }
    const extra: Capability[] = [];
    if (this.flags.guaranteeRefresh()) {
      // TODO - make this "guarantee defensive magic" and allow refresh OR barrier?
      extra.push(Magic.REFRESH);
    }
    if (boss === this.rom.bosses.insect) { // insect
      extra.push(Item.INSECT_FLUTE, Item.GAS_MASK);
    }
    if (boss === this.rom.bosses.draygon2) {
      extra.push(Item.BOW_OF_TRUTH);
      if (this.flags.storyMode()) {
        extra.push(
          Boss.KELBESQUE1,
          Boss.KELBESQUE2,
          Boss.SABERA1,
          Boss.SABERA2,
          Boss.MADO1,
          Boss.MADO2,
          Boss.KARMINE,
          Boss.DRAYGON1,
          Item.SWORD_OF_WIND,
          Item.SWORD_OF_FIRE,
          Item.SWORD_OF_WATER,
          Item.SWORD_OF_THUNDER);
      }
    }
    if (extra.length) {
      out.restrict(and(...extra));
    }
    return out.freeze();
  }

  locations(): TileCheck[] {
    const locations: TileCheck[] = [];
    // TODO - pull the location out of itemUseData[0] for these items
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
      // leaf and shyron may not always be accessible, so don't rely on them.
      if (shop.location === 0xc3 || shop.location === 0xf6) continue;
      if (!shop.used) continue;
      if (shop.type !== ShopType.TOOL) continue;
      const check = {
        tile: TileId(shop.location << 16 | 0x88),
        condition: Capability.MONEY,
      };
      for (const item of shop.contents) {
        if (item === (Item.MEDICAL_HERB[0][0] & 0xff)) {
          locations.push({...check, slot: Slot(Capability.BUY_HEALING)});
        } else if (item === (Item.WARP_BOOTS[0][0] & 0xff)) {
          locations.push({...check, slot: Slot(Capability.BUY_WARP)});
        }
      }
    }
    return locations;
  }

  /** Returns undefined if impassable. */
  makeTerrain(effects: number, tile: TileId): Terrain | undefined {
    // Check for dolphin or swamp.  Currently don't support shuffling these.
    const loc = tile >>> 16;
    effects &= 0x26;
    if (loc === 0x1a) effects |= 0x08;
    if (loc === 0x60 || loc === 0x68) effects |= 0x10;
    // NOTE: only the top half-screen in underground channel is dolphinable
    if (loc === 0x64 && ((tile & 0xf0f0) < 0x90)) effects |= 0x10;
    if (this.shootingStatues.has(ScreenId.fromTile(tile))) effects |= 0x01;
    if (effects & 0x20) { // slope
      // Determine length of slope: short slopes are climbable.
      // 6-8 are both doable with boots
      // 0-5 is doable with no boots
      // 9 is doable with rabbit boots only (not aware of any of these...)
      // 10 is right out
      const getEffects = (tile: TileId): number => {
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
      } else if (height < 9) {
        effects |= 0x40;
      }
    }
    return TERRAINS[effects];
  }

  // TODO - consider folding this into location/trigger/npc as an extra return?
  extraRoutes(): ExtraRoute[] {
    const routes = [];
    const entrance = (location: number, entrance: number = 0): TileId => {
      const l = this.rom.locations[location];
      const e = l.entrances[entrance];
      return TileId.from(l, e);
    };
    // Start the game at 0:0
    routes.push({tile: entrance(0)});
    // Sword of Thunder warp
    if (this.flags.teleportOnThunderSword()) {
      routes.push({tile: entrance(0xf2), condition: Item.SWORD_OF_THUNDER});
    }
    if (this.flags.assumeWildWarp()) {
      for (const location of this.rom.wildWarp.locations) {
        routes.push({tile: entrance(location)});
      }
    }
    return routes;
  }

  // TODO - consider folding this into location/trigger/npc as an extra return?
  extraEdges(): ExtraEdge[] {
    const edges = [];
    // need an edge from the boat house to the beach - we could build this into the
    // boat boarding trigger, but for now it's here.
    edges.push({
      from: TileId(0x510088), // in front of boat house
      to: TileId(0x608688), // in front of cabin
      condition: Event.RETURNED_FOG_LAMP,
    });
    return edges;
  }

  trigger(id: number): TriggerData {
    switch (id) {
    case 0x9a: // start fight with mado if shyron massacre started
      // TODO - look up who the actual boss is once we get boss shuffle!!!
      return {check: [{
        condition: meet(Event.SHYRON_MASSACRE, this.bossRequirements(this.rom.bosses.mado1)),
        slot: Slot(Boss.MADO1),
      }]};
    case 0xaa: // enter oak after insect
      // NOTE: This is not the trigger that checks, but rather it happens on the entrance.
      // This is a convenient place to handle it, though, since we already need to explicitly
      // ignore this trigger.  We also require warp boots because it's possible that there's
      // no direct walking path and it's not feasible to carry the child with us everywhere,
      // due to graphics reasons.
      return {check:[{
        condition: and(Event.DWARF_CHILD, Capability.BUY_WARP),
        slot: Slot(Event.RESCUED_CHILD),
      }]};
    case 0xad: // allow opening prison door
      return {check: [{
        condition: Item.KEY_TO_PRISON,
        slot: Slot(Event.OPENED_PRISON),
      }]};
    case 0xae: // allow opening stxy
      return {check: [{
        condition: Item.KEY_TO_STYX,
        slot: Slot(Event.OPENED_STYX),
      }]};
    case 0xaf: // allow calming sea
      return {check: [{
        condition: Item.STATUE_OF_GOLD,
        slot: Slot(Event.CALMED_SEA),
      }]};
    case 0xb1: // start fight with guardian statues
      return {check: [{
        condition: and(Item.BOW_OF_SUN, Item.BOW_OF_MOON),
        slot: Slot(Event.OPENED_CRYPT),
      }]};
    }
    // Check for relevant flags and known action types.
    const trigger = this.rom.triggers[id & 0x7f];
    if (!trigger || !trigger.used) throw new Error(`Unknown trigger: ${hex(id)}`);
    const relevant = (f: number) => this.relevantFlags.has(f);
    const relevantAndSet = (f: number) => f > 0 && this.relevantFlags.has(f);
    function map(f: number): number {
      if (f < 0) return ~map(~f);
      const mapped = FLAG_MAP.get(f);
      return mapped != null ? mapped[0][0] : f;
    }
    const actionItem = TRIGGER_ACTION_ITEMS[trigger.message.action];
    const condition = and(...trigger.conditions.map(map).filter(relevantAndSet).map(Condition));
    if (trigger.message.action === 0x19) { // push-down trigger
      // TODO - pass in terrain; if on land and trigger skip is on then
      // add a route requiring rabbit boots and either warp boots or teleport?
      const [cond, ...rest] = trigger.conditions;
      if (!rest.length && cond < 0 && relevant(~map(cond))) {
        return {terrain: {exit: Condition(~map(cond))}};
      }
    } else if (actionItem != null) {
      return {check: [{condition, slot: actionItem}]};
    }
    const flags = trigger.flags.filter(relevantAndSet);
    if (flags.length) {
      return {check: flags.map(f => ({condition, slot: Slot(f)}))};
    }

    return {};
  }

  npc(id: number, loc: Location): NpcData {
    const npc = this.rom.npcs[id];
    if (!npc || !npc.used) throw new Error(`Unknown trigger: ${hex(id)}`);

    const spawnConditions: readonly number[] = npc.spawnConditions.get(loc.id) || [];

    const result: NpcData & {check: Check[]} = {check: []};

    if (npc.data[2] & 0x04) {
      // person is a statue.
      result.terrain = {
        exit: this.flags.assumeStatueGlitch() ?
                  [[]] : 
                  or(...spawnConditions.map(
                         x => FLAG_MAP.get(x) || (this.relevantFlags.has(x) ?
                                                  Condition(x) : []))),
      };
    }

    function statueOr(...reqs: Requirement[]): void {
      if (!result.terrain) throw new Error('Missing terrain for guard');
      result.terrain.exit = or(result.terrain.exit || [], ...reqs);
    }

    // TODO - fortune teller (39) requires access to portoa to get her to move?
    //      -> maybe instead change the flag to set immediately on talking to her
    //         rather than the trigger outside the door...? this would allow getting
    //         through it by just talking and then leaving the room...

    switch (id) {
    case 0x14: // woken-up windmill guard
      // skip because we tie the item to the sleeping one.
      if (loc.spawns.find(l => l.isNpc() && l.id === 0x15)) return {};
    case 0x25: // amazones guard
      result.hitbox = {x0: 0, x1: 2, y0: 0, y1: 1};
      statueOr(Magic.CHANGE, Magic.PARALYSIS);
      break;
    case 0x2d: // mt sabre/swan soldiers
      // These don't count as statues because they'll move if you talk to them.
      delete result.terrain;
      break;
    case 0x33: // portoa guard (throne room, though the palace one is the one that matters)
      // NOTE: this means that we cannot separate the palace foyer from the throne room, since
      // there's no way to represent the condition for paralyzing the guard and still have him
      // passable when the queen is there.  The whole sequence is also tightly coupled, so it
      // probably wouldn't make sense to split it up anyway.
      statueOr(Magic.PARALYSIS);
      break;
    case 0x38: // portoa queen sitting on impassable throne
      if (loc.id === 0xdf) result.hitbox = {x0: 0, x1: 1, y0: 2, y1: 3};
      break;
    case 0x4e: // shyron guard
      result.hitbox = {x0: -1, x1: 2, y0: 0, y1: 1};
      statueOr(Magic.CHANGE, Event.ENTERED_SHYRON);
      break;
    case 0x80: // goa guards
      statueOr(...spawnConditions.map(c => Condition(~c))); // Event.ENTERED_SHYRON
      break;
    case 0x85: // stoned pair
      statueOr(Item.FLUTE_OF_LIME);
      break;
    }

    // intersect spawn conditions
    const requirements: Array<readonly [readonly [Condition]]> = [];
    const addReq = (flag: number): void => {
      if (flag <= 0) return; // negative or zero flag ignored
      const req = FLAG_MAP.get(flag) || (this.relevantFlags.has(flag) ? Condition(flag) : null);
      if (req != null) requirements.push(req);
    };
    for (const flag of spawnConditions) {
      addReq(flag);
    }

    // Look for trade-ins
    //  - TODO - don't hard-code the NPCs? read from the itemdata?
    const tradeIn = this.tradeIns.get(id)
    if (tradeIn != null) {
      const t = tradeIn;
      function trade(slot: Slot, ...reqs: Array<readonly [readonly Condition[]]>): void {
        const condition = and(...requirements, t, ...reqs);
        result.check.push({slot, condition});
      }
      switch (id) {
      case 0x15: // sleeping windmill guard => windmill key slot
        trade(Slot(Item.WINDMILL_KEY));
        break;
      case 0x23: // aryllis => bow of moon slot
        // NOTE: sitting on impassible throne
        result.hitbox = {x0: -1, x1: 2, y0: -1, y1: 2};
        trade(Slot(Item.BOW_OF_MOON), Magic.CHANGE);
        break;
      case 0x63: // hurt dolphin => healed dolphin
        // NOTE: dolphin on water, but can heal from land
        result.hitbox = {x0: -1, x1: 2, y0: -1, y1: 2};
        trade(Slot(Event.HEALED_DOLPHIN));
        trade(Slot(Item.SHELL_FLUTE));
        break;
      case 0x64: // fisherman
        trade(Slot(Event.RETURNED_FOG_LAMP),
              ...(this.flags.requireHealedDolphinToRide() ? [Event.HEALED_DOLPHIN] : []));
        // TODO - use this as proxy for boat
        break;
      case 0x6b: // sleeping kensu
        trade(Slot(Item.GLOWING_LAMP));
        break;
      case 0x75: // slimed kensu => flight slot
        trade(Slot(Magic.FLIGHT));
        break;
      case 0x74: // kensu in dance hall => change slot
        // NOTE: this is normally 7e but we change it to 74 in this one
        // location to identify it
        trade(Slot(Magic.CHANGE), Magic.PARALYSIS, Event.FOUND_KENSU);
        break;
      case 0x82: // akahana => gas mask slot (changed 16 -> 82)
        trade(Slot(Item.GAS_MASK));
        break;
      case 0x88: // stoned akahana => shield ring slot
        trade(Slot(Item.SHIELD_RING));
        break;
      }
    }

    // NPCs that need a little extra care

    if (id === 0x84) { // start fight with sabera
      // TODO - look up who the actual boss is once we get boss shuffle!!!
      const condition = this.bossRequirements(this.rom.bosses.sabera1);
      return {check: [
        {condition, slot: Slot(Boss.SABERA1)},
      ]};
    } else if (id === 0x1d) { // oak elder has some weird untracked conditions.
      const slot = Slot(Item.SWORD_OF_FIRE);
      return {check: [
        // two different ways to get the sword of fire item
        {condition: and(Magic.TELEPATHY, Boss.INSECT), slot},
        {condition: Event.RESCUED_CHILD, slot},
      ]};
    } else if (id === 0x1f) { // dwarf child
      const spawns = this.rom.npcs[id].spawnConditions.get(loc.id);
      if (spawns && spawns.includes(0x045)) return {}; // in mother's house
      return {check: [
        {condition: Event.DWARF_MOTHER, slot: Slot(Event.DWARF_CHILD)},
      ]};
    }

    for (const d of npc.globalDialogs) {
      addReq(~d.condition);
    }
    for (const d of npc.localDialogs.get(loc.id) || npc.localDialogs.get(-1) || []) {
      // If the check condition is opposite to the spawn condition, then skip.
      // This ensures we don't expect the queen to give recover in the throne room.
      if (spawnConditions.includes(~d.condition)) continue;
      // Apply the FLAG_MAP.
      const mapped = FLAG_MAP.get(d.condition);
      const positive =
          mapped ? [mapped] :
          this.relevantFlags.has(d.condition) ? [Condition(d.condition)] :
          [];
      const condition = and(...positive, ...requirements);
      // If the condition is a negative then any future conditions must include
      // it as a positive requirement.
      const negative =
          FLAG_MAP.get(~d.condition) ||
          (this.relevantFlags.has(~d.condition) ? Condition(~d.condition) : null);
      if (negative != null) requirements.push(negative);
      const action = d.message.action;
      if (action === 0x03) {
        result.check.push({slot: Slot.item(npc.data[0]), condition});
      } else if (action === 0x11 || action === 0x09) {
        // NOTE: $09 is zebu student, which we've patched to give the item.
        result.check.push({slot: Slot.item(npc.data[1]), condition});
      } else if (action === 0x10) {
        // NOTE: Queen can't be revealed as asina in the throne room.  In particular,
        // this ensures that the back room is reachable before requiring the dolphin
        // to appear.  This should be handled by the above check for the dialog and
        // spawn conditions to be compatible.
        result.check.push({slot: Slot(Magic.RECOVER), condition});
      } else if (action === 0x08 && id === 0x2d) {
        result.check.push({slot: Slot(Event.OPENED_SWAN), condition});
      }
      for (const flag of d.flags) {
        const mflag = FLAG_MAP.get(flag);
        const pflag = mflag ? mflag : this.relevantFlags.has(flag) ? Condition(flag) : null;
        if (pflag) result.check.push({slot: Slot(pflag), condition});
      }
      // If the spawn *requires* this condition then don't evaluate any more.  This
      // ensures we don't expect the queen to give the flute of lime in the back room,
      // since she wouldn't have spawned there intime to give it.
      if (positive.length && spawnConditions.includes(d.condition)) break;
    }
    return result;
  }

  capabilities(): CapabilityData[] {
    let breakStone: Requirement = Item.SWORD_OF_WIND;
    let breakIce: Requirement = Item.SWORD_OF_FIRE;
    let formBridge: Requirement = Item.SWORD_OF_WATER;
    let breakIron: Requirement = Item.SWORD_OF_THUNDER;
    if (!this.flags.orbsOptional()) {
      // Add orb requirement
      breakStone = or(and(Item.SWORD_OF_WIND, Item.ORB_OF_WIND),
                      and(Item.SWORD_OF_WIND, Item.TORNADO_BRACELET));
      breakIce = or(and(Item.SWORD_OF_FIRE, Item.ORB_OF_FIRE),
                    and(Item.SWORD_OF_FIRE, Item.FLAME_BRACELET));
      formBridge = or(and(Item.SWORD_OF_WATER, Item.ORB_OF_WATER),
                      and(Item.SWORD_OF_WATER, Item.BLIZZARD_BRACELET));
      breakIron = or(and(Item.SWORD_OF_THUNDER, Item.ORB_OF_THUNDER),
                     and(Item.SWORD_OF_THUNDER, Item.STORM_BRACELET));
      if (this.flags.assumeSwordChargeGlitch()) {
        const level2 = or(breakStone, breakIce, formBridge, breakIron);
        function need(sword: readonly [readonly [Condition]]): Requirement {
          const condition: Condition = sword[0][0];
          return level2.map(c => c[0] === condition ? c : [condition, ...c]);
        }
        breakStone = need(Item.SWORD_OF_WIND);
        breakIce = need(Item.SWORD_OF_FIRE);
        formBridge = need(Item.SWORD_OF_WATER);
        breakIron = need(Item.SWORD_OF_THUNDER);
      }
    }
    type CapabilityList = Array<[readonly [readonly [Condition]], ...Requirement[]]>;
    const capabilities: CapabilityList = [
      [Capability.SWORD,
       Item.SWORD_OF_WIND, Item.SWORD_OF_FIRE,
       Item.SWORD_OF_WATER, Item.SWORD_OF_THUNDER],
      [Capability.BREAK_STONE, breakStone],
      [Capability.BREAK_ICE, breakIce],
      [Capability.FORM_BRIDGE, formBridge],
      [Capability.BREAK_IRON, breakIron],
      [Capability.MONEY, Capability.SWORD], // TODO - clear this up
      [Capability.CLIMB_WATERFALL, Magic.FLIGHT],
      [Capability.SHOOTING_STATUE, Magic.BARRIER], // TODO - allow shield ring?
      [Capability.CLIMB_SLOPE, Item.RABBIT_BOOTS, Magic.FLIGHT],
      [Event.GENERALS_DEFEATED, Item.IVORY_STATUE], // TODO - fix this
      [Event.OPENED_SEALED_CAVE, Event.STARTED_WINDMILL], // TODO - merge completely?
    ];

    if (this.flags.assumeGhettoFlight()) {
      capabilities.push([Capability.CLIMB_WATERFALL, and(Event.RIDE_DOLPHIN, Item.RABBIT_BOOTS)]);
    }

    if (!this.flags.guaranteeBarrier()) {
      // TODO - sword charge glitch might be a problem with the healing option...
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
        // Saves redundancy of putting the item in the actual room.
        capabilities.push([Item(boss.drop), Boss(boss.kill)]);
      }
    }
    capabilities.push([Item.ORB_OF_WATER, Boss.RAGE]);

    if (this.flags.guaranteeGasMask()) {
      capabilities.push([Capability.TRAVEL_SWAMP, Item.GAS_MASK]);
    } else {
      capabilities.push([Capability.TRAVEL_SWAMP, 
                         or(Item.GAS_MASK,
                            and(Capability.MONEY, Item.MEDICAL_HERB),
                            and(Capability.MONEY, Magic.REFRESH))]);
    }

    // if (this.flags.assumeStatueGlitch()) {
    //   capabilities.push([Capability.STATUE_GLITCH, [[]]]);
    // }

    return capabilities.map(([capability, ...deps]) => ({capability, condition: or(...deps)}));
  }

  wallCapability(type: WallType): {flag: number} {
    return {flag: [Capability.BREAK_STONE, Capability.BREAK_ICE,
                   Capability.FORM_BRIDGE, Capability.BREAK_IRON][type][0][0]};
  }
}

type TileCheck = Check & {tile: TileId};

// TODO - maybe pull triggers and npcs, etc, back together?
//      - or make the location overlay a single function?
//        -> needs closed-over state to share instances...

interface ExtraRoute {
  tile: TileId;
  condition?: Requirement;
}
interface ExtraEdge {
  from: TileId;
  to: TileId;
  condition?: Requirement;
}

interface TriggerData {
  terrain?: Terrain;
  check?: Check[];
}

interface NpcData {
  hitbox?: Hitbox;
  terrain?: Terrain;
  check?: Check[];
}

interface Hitbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface CapabilityData {
  condition?: Requirement;
  capability: readonly [readonly [Condition]];
}

// Static map of terrains.
const TERRAINS: Array<Terrain | undefined> = (() => {
  const out = [];
  for (let effects = 0; effects < 128; effects++) {
    out[effects] = terrain(effects);
  }
  //console.log('TERRAINS', out);
  return out;

  /**
   * @param effects The $26 bits of tileeffects, plus $08 for swamp, $10 for dolphin,
   * $01 for shooting statues, $40 for short slope
   * @return undefined if the terrain is impassable.
   */
  function terrain(effects: number): Terrain | undefined {
    if (effects & 0x04) return undefined; // impassible
    const terrain: Terrain = {};
    if ((effects & 0x12) === 0x12) { // dolphin or fly
      if (effects & 0x20) terrain.exit = Capability.CLIMB_WATERFALL;
      terrain.enter = or(Event.RIDE_DOLPHIN, Magic.FLIGHT);
    } else {
      if (effects & 0x40) { // short slope
        terrain.exit = Capability.CLIMB_SLOPE;
      } else if (effects & 0x20) { // slope
        terrain.exit = Magic.FLIGHT;
      }
      if (effects & 0x02) terrain.enter = Magic.FLIGHT; // no-walk
    }
    if (effects & 0x08) { // swamp
      terrain.enter = (terrain.enter || [[]]).map(cs => Capability.TRAVEL_SWAMP[0].concat(cs));
    }
    if (effects & 0x01) { // shooting statues
      terrain.enter = (terrain.enter || [[]]).map(cs => Capability.SHOOTING_STATUE[0].concat(cs));
    }
    return terrain;
  }
})();

// TODO - figure out what this looks like...?
//  - maybe we just want to make a pseudo DEFEATED_INSECT event, but this would need to be
//    separate from 101, since that's attached to the itemget, which will move with the slot!
//  - probably want a flag for each boss defeated...?
//    could use bosskill ID for it?
//    - then make the drop a simple derivative from that...
//    - upshot - no longer need to mix it into npc() or trigger() overlay, instead move it
//      to capability overlay.
// function slotFor<T>(item: T): T { return item; }
