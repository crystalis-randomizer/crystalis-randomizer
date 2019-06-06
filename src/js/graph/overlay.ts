import {Capability, Check, Condition, Event, Item, Magic, MutableRequirement,
        Requirement, Slot, Terrain, WallType, and, meet, or, statue} from './condition.js';
import {FlagSet} from '../flagset.js';
import {Rom} from '../rom.js';
import {Location} from '../rom/location.js';
import {hex} from '../rom/util.js';

// Additional information needed to interpret the world graph data.

const RELEVANT_FLAGS = [
  0x00a, // used windmill key
  0x00b, // talked to leaf elder
  0x013, // defeated sabera
  0x018, // entered underground channel
  0x01b, // mesia recording played
  0x01e, // queen revealed
  0x021, // returned fog lamp
  0x024, // generals defeated (got ivory statue)
  0x025, // healed dolphin
  0x026, // entered shyron (for goa guards)
  0x027, // shyron massacre
  // 0x35, // cured akahana
  0x037, // talked to zebu in cave (added as req for abduction)
  0x038, // leaf abduction
  0x045, // rescued child
  0x052, // talked to dwarf mother
  0x053, // child following
  0x061, // talked to stom in swan hut
  0x06c, // defeated draygon 1
  0x072, // kensu found in tavern
  0x08b, // got shell flute
  0x09b, // able to ride dolphin
  0x0a5, // talked to zebu student
  0x0a9, // talked to leaf rabbit

  0x2f7, // warp:oak (for telepathy)
  0x2fb, // warp:joel (for evil spirit island)

  // Magic.CHANGE[0][0],
  // Magic.TELEPATHY[0][0],
];

const FLAG_MAP: Map<number, readonly [readonly [Condition]]> = new Map([
  [0x00e, Magic.TELEPATHY],
  [0x028, Magic.CHANGE],
  [0x029, Magic.CHANGE],
  [0x02a, Magic.CHANGE],
  [0x02b, Magic.CHANGE],
  [0x2ee, Event.STARTED_WINDMILL],
]);

// Maps trigger actions to the slot they grant.
const TRIGGER_ACTION_ITEMS: {[action: number]: Slot} = {
  0x08: Slot(Magic.PARALYSIS),
  0x0b: Slot(Magic.BARRIER),
  0x0f: Slot(Magic.REFRESH),
  0x18: Slot(Magic.TELEPATHY),
};

const BOSS_SWORD_MAGIC_LEVELS: {[objectId: number]: number} = {
  0x57: 1, // vampire 1
  0x5e: 1, // insect
  0x68: 3, // kelbesque 1
  0x7d: 3, // sabera 1
  0x88: 3, // mado 1
  0x8b: 3, // kelbesque 2
  0x90: 3, // sabera 2
  0x93: 3, // mado 2
  0x97: 2, // karmine
  0x9b: 2, // draygon
  0x9e: 3, // draygon 2
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
  if (level === 1) return SWORDS[sword];
  if (level === 3) return and(SWORDS[sword], ...SWORD_POWERS[sword]);
  return or(...SWORD_POWERS[sword].map(p => and(SWORDS[sword], p)));
}

export class Overlay {

  private readonly relevantFlags = new Set<number>();
  // npc id -> wanted item
  private readonly tradeIns = new Map<number, readonly [readonly [Condition]]>();

  constructor(readonly rom: Rom, readonly flags: FlagSet) {
    // TODO - adjust based on flagset?
    for (const flag of RELEVANT_FLAGS) {
      this.relevantFlags.add(flag);
    }
    for (const item of rom.items) {
      if (!item.tradeIn) continue;
      for (let i = 0; i < item.tradeIn.length; i += 6) {
        this.tradeIns.set(item.tradeIn[i], Condition(0x200 | item.id));
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
  bossRequirements(id: number): Requirement {
    // TODO - handle boss shuffle somehow?
    const out = new MutableRequirement();
    if (this.flags.guaranteeMatchingSword()) {
      const level = this.flags.guaranteeSwordMagic() ? BOSS_SWORD_MAGIC_LEVELS[id] : 1;
      const obj = this.rom.objects[id];
      let {elements} = obj;
      for (let i = 0; i < 4; i++) {
        if (elements & (1 << i)) out.addAll(swordRequirement(i, level));
      }
    } else {
      out.addAll(Capability.SWORD);
    }
    const extra: Capability[] = [];
    if (this.flags.guaranteeRefresh()) {
      // TODO - make this "guarantee defensive magic" and allow refresh OR barrier?
      extra.push(Magic.REFRESH);
    }
    if (id === 0x5e) { // insect
      extra.push(Item.INSECT_FLUTE, Item.GAS_MASK);
    }
    if (extra.length) {
      out.restrict(and(...extra));
    }
    return out.freeze();
  }

  trigger(id: number): TriggerData {
    switch (id) {
    case 0x9a: // start fight with mado if shyron massacre started
      // TODO - look up who the actual boss is once we get boss shuffle!!!
      return {check: [{
        condition: meet(Event.SHYRON_MASSACRE, this.bossRequirements(0x88)),
        slot: Slot(Item.ORB_OF_THUNDER),
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
    const actionItem = TRIGGER_ACTION_ITEMS[trigger.message.action];
    const condition = and(...trigger.conditions.filter(relevantAndSet).map(Condition));
    if (trigger.message.action === 0x19) { // push-down trigger
      // TODO - pass in terrain; if on land and trigger skip is on then
      // add a route requiring rabbit boots and either warp boots or teleport?
      const [cond, ...rest] = trigger.conditions;
      if (!rest.length && cond < 0 && relevant(~cond)) {
        return {terrain: {exit: Condition(~cond)}};
      }
    } else if (actionItem != null) {
      return {check: [{condition, slot: actionItem}]};
    } else if (trigger.flags.some(relevant)) {
      const flags = trigger.flags.filter(relevantAndSet);
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
      result.terrain =
          statue(...spawnConditions.map(x => FLAG_MAP.get(x) || (this.relevantFlags.has(x) ?
                                                                 Condition(x) : [])));
    }

    function statueOr(...reqs: Requirement[]): void {
      if (!result.terrain) throw new Error('Missing terrain for guard');
      result.terrain.exit = or(result.terrain.exit || [], ...reqs);
    }

    if (loc.id === 0x0f) { // windmill
      // There's some random spawns in the windmill for the gears moving.
      // Move the hitbox and use that for the key trade-in.
      result.hitbox = {x0: 0, x1: 1, y0: 3, y1: 4};
      result.check.push({
        slot: Slot(Event.STARTED_WINDMILL),
        condition: Item.WINDMILL_KEY,
      });
      return result;
    }

    switch (id) {
    case 0x25: // amazones guard
      result.hitbox = {x0: 0, x1: 2, y0: 0, y1: 1};
      statueOr(Magic.CHANGE, Magic.PARALYSIS);
      break;
    case 0x33: // portoa guard (throne room, though the palace one is the one that matters)
      // NOTE: this means that we cannot separate the palace foyer from the throne room, since
      // there's no way to represent the condition for paralyzing the guard and still have him
      // passable when the queen is there.  The whole sequence is also tightly coupled, so it
      // probably wouldn't make sense to split it up anyway.
      statueOr(Magic.PARALYSIS);
      break;
    case 0x4e: // shyron guard
      result.hitbox = {x0: -1, x1: 2, y0: 0, y1: 1};
      statueOr(Magic.CHANGE, Event.ENTERED_SHYRON);
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
        trade(Slot(Item.BOW_OF_MOON), Magic.CHANGE);
        break;
      case 0x63: // hurt dolphin => healed dolphin
        trade(Slot(Event.HEALED_DOLPHIN));
        trade(Slot(Item.SHELL_FLUTE));
        break;
      case 0x64: // fisherman
        trade(Slot(Event.RETURNED_FOG_LAMP));
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
      case 0x87: // akahana => gas mask slot (changed 16 -> 87)
        trade(Slot(Item.GAS_MASK));
        break;
      case 0x88: // stoned akahana => shield ring slot
        trade(Slot(Item.SHIELD_RING));
        break;
      }
    }

    if (id === 0x84) { // start fight with sabera
      // TODO - look up who the actual boss is once we get boss shuffle!!!
      const condition = this.bossRequirements(0x79);
      return {check: [
        {condition, slot: Slot(Item.BROKEN_STATUE)},
        {condition, slot: Slot(Event.DEFEATED_SABERA)},
      ]};
    }

    for (const d of npc.globalDialogs) {
      addReq(~d.condition);
    }
    for (const d of npc.localDialogs.get(loc.id) || npc.localDialogs.get(-1) || []) {
      const mapped = FLAG_MAP.get(d.condition);
      const positive =
          mapped ? [mapped] :
          this.relevantFlags.has(d.condition) ? [Condition(d.condition)] :
          [];
      const condition = and(...positive, ...requirements);
      const negative =
          FLAG_MAP.get(~d.condition) ||
          (this.relevantFlags.has(~d.condition) ? Condition(~d.condition) : null);
      if (negative != null) requirements.push(negative);
      const action = d.message.action;
      if (action === 0x03) {
        result.check.push({slot: Slot(0x200 | npc.data[0]), condition});
      } else if (action === 0x11) {
        result.check.push({slot: Slot(0x200 | npc.data[1]), condition});
      }
      for (const flag of d.flags) {
        const mflag = FLAG_MAP.get(flag);
        const pflag = mflag ? mflag : this.relevantFlags.has(flag) ? Condition(flag) : null;
        if (pflag) result.check.push({slot: Slot(pflag), condition});        
      }
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
    ];

    if (this.flags.assumeStatueGlitch()) {
      capabilities.push([Capability.STATUE_GLITCH, [[]]]);
    }

    return capabilities.map(([capability, ...deps]) => ({capability, condition: or(...deps)}));
  }

  wallCapability(type: WallType): {flag: number} {
    return {flag: [Capability.BREAK_STONE, Capability.BREAK_ICE,
                   Capability.FORM_BRIDGE, Capability.BREAK_IRON][type][0][0]};
  }
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
