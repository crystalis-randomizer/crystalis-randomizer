import {Condition, Events, Flags, Magic, Terrain, and, or, statue} from './condition.js';

// Additional information needed to interpret the world graph data.

export const TRIGGERS: {[id: number]: {terrain?: Terrain}} = {
  0x86: { // rabbit check for mt sabre north
    terrain: {
      exit: Flags.TALKED_TO_LEAF_RABBIT,
      exitSouth: Condition.OPEN,
    },
  },
};

export const NPCS: {[id: number]: {trigger?: unknown, hitbox?: unknown, terrain?: Terrain}} = {
  0x13: { // leaf rabbit
    trigger: {
      condition: and(Magic.TELEPATHY, Events.LEAF_ABDUCTION),
      set: Flags.TALKED_TO_LEAF_RABBIT,
    },
  },

  0x25: { // amazones guard
    hitbox: {x0: 0, x1: 2, y0: 0, y1: 1},
    terrain: statue(or(Magic.CHANGE, Magic.PARALYSIS)),
  },
};
