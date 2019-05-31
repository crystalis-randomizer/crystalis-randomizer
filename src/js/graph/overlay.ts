import {Capability, Condition, Event, Item, Magic, Requirement, Terrain, Trigger,
        WallType, and, or, statue} from './condition.js';
import {FlagSet} from '../flagset.js';
import {Rom} from '../rom.js';
import {Location} from '../rom/location.js';

// Additional information needed to interpret the world graph data.

export class Overlay {
  constructor(readonly rom: Rom, readonly flags: FlagSet) {}

  trigger(id: number): TriggerData {
    switch (id) {
    case 0x86: // rabbit check for mt sabre north
      return {
        terrain: {
          exit: Event.TALKED_TO_LEAF_RABBIT,
          exitSouth: Condition.OPEN,
        },
      };
    case 0x8c: // leaf abduction
      return {
        trigger: [{
          set: Event.LEAF_ABDUCTION,
        }],
      };
    }
    return {};
  }

  npc(id: number, loc: Location): NpcData {
    switch (id) {
    case 0x13: // leaf rabbit
      return {
        trigger: [{
          condition: and(Magic.TELEPATHY, Event.LEAF_ABDUCTION),
          set: Event.TALKED_TO_LEAF_RABBIT,
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
    const capabilities: CapabilityData[] = [
      {capability: Capability.SWORD,
       condition: or(Item.SWORD_OF_WIND, Item.SWORD_OF_FIRE,
                     Item.SWORD_OF_WATER, Item.SWORD_OF_THUNDER)},
      {capability: Capability.BREAK_STONE, condition: breakStone},
      {capability: Capability.BREAK_ICE, condition: breakIce},
      {capability: Capability.FORM_BRIDGE, condition: formBridge},
      {capability: Capability.BREAK_IRON, condition: breakIron},
    ];

    if (this.flags.assumeStatueGlitch()) {
      capabilities.push({capability: Capability.STATUE_GLITCH, condition: Condition.OPEN});
    }

    return capabilities;
  }

  wallCapability(type: WallType): {flag: number} {
    return {flag: [Capability.BREAK_STONE, Capability.BREAK_ICE,
                   Capability.FORM_BRIDGE, Capability.BREAK_IRON][type][0][0]};
  }
}

interface TriggerData {
  terrain?: Terrain;
  trigger?: Trigger[];
}

interface NpcData {
  hitbox?: Hitbox;
  terrain?: Terrain;
  trigger?: Trigger[];
}

interface Hitbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface CapabilityData {
  condition: Requirement;
  capability: readonly [readonly [Condition]];
}
