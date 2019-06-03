import {Capability, Check, Condition, Event, Item, Magic, MutableRequirement,
        Requirement, Slot, Terrain, WallType, and, meet, or, statue} from './condition.js';
import {FlagSet} from '../flagset.js';
import {Rom} from '../rom.js';
import {Location} from '../rom/location.js';
import {hex} from '../rom/util.js';

// Additional information needed to interpret the world graph data.

const RELEVANT_FLAGS = [
  0x018, // entered underground channel
  0x01b, // mesia recording played
  0x027, // shyron massacre
  0x037, // talked to zebu in cave (added as req for abduction)
  0x038, // leaf abduction
  0x0a9, // talked to leaf rabbit

  0x2f7, // warp:oak (for telepathy)
  0x2fb, // warp:joel (for evil spirit island)
];

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

  constructor(readonly rom: Rom, readonly flags: FlagSet) {
    // TODO - adjust based on flagset?
    for (const flag of RELEVANT_FLAGS) {
      this.relevantFlags.add(flag);
    }
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
    const relevant = (f: number) => this.relevantFlags.has(f);
    const relevantAndSet = (f: number) => f >= 0 && this.relevantFlags.has(f);
    if (!trigger) throw new Error(`Unknown trigger: ${hex(id)}`);
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
    switch (id) {
    case 0x13: // leaf rabbit
      return {
        check: [{
          condition: and(Magic.TELEPATHY, Event.LEAF_ABDUCTION),
          slot: Slot(Event.TALKED_TO_LEAF_RABBIT),
        }],
      };

    case 0x25: // amazones guard
      return {
        hitbox: {x0: 0, x1: 2, y0: 0, y1: 1},
        terrain: statue(or(Magic.CHANGE, Magic.PARALYSIS)),
      };
    }
    return {};
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
      capabilities.push([Capability.STATUE_GLITCH]);
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
