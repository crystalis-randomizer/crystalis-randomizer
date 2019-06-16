import {Neighbors, ScreenId, TileId, TilePair} from './geometry.js';
import {Boss, Check, Capability, Condition, Event, Item, Magic, MutableRequirement,
        Slot, Terrain, WallType, meet, memoize, memoize2} from './condition.js';
import {LocationList, LocationListBuilder} from './locationlist.js';
import {Overlay} from './overlay.js';
import * as shuffle from './shuffle.js';
import {Bits} from '../bits.js';
import {FlagSet} from '../flagset.js';
import {hex} from '../rom/util.js';
import {Rom} from '../rom.js';
import {UnionFind} from '../unionfind.js';
import {DefaultMap} from '../util.js';

const {} = {hex, LocationList} as any; // for debugging

// A tile is a 24-bit number:
//   <loc><ys><xs><yt><xt>
// We do a giant flood-fill of the entire game, starting at $000055 or whatever.
// Filling is a union-find, so we start by assigning each element itself, but
// when we find a neighbor, we join them.

export class World {

  // All tiles unioned by same reachability.
  private readonly tiles = new UnionFind<TileId>();

  readonly graph: shuffle.Graph;

  // Exits between groups of different reachability.
  // Optional third element is list of requirements to use the exit.
  // private readonly exits = new Array<[number, number, number[][]?]>();

  // Blocks for any given tile group.
  // private readonly blocks = new Array<[number, number[][]]>();

  constructor(readonly rom: Rom, flags = new FlagSet('@FullShuffle')) {    
    // 1. start with entrance 0 at the start location, add it to the tiles and queue.
    // 2. for tile T in the queue
    //    - for each passable neighbor N of T:
    //      - if N has the same passage as T, union them
    //      - if N has different passage, add an exit from T to N
    //      - if N is not yet seen, add it to the queue
    // passage can be one of:
    //  - open
    //  - blocked(item/trigger - both are just numbers...)
    //  - one-way 

    // Start by getting a full map of all terrains and checks
    const overlay = new Overlay(rom, flags);
    const terrains = new Map<TileId, Terrain>();
    const walls = new Map<ScreenId, WallType>();
    const bosses = new Map<TileId, number>();
    const npcs = new Map<TileId, number>();
    const checks = new DefaultMap<TileId, Check[]>(() => []);
    const monsters = new Map<TileId, number>(); // elemental immunities
    const allExits = new Set<TileId>();

    let mimic = 0x70;

    for (const location of rom.locations /*.slice(0,4)*/) {
      if (!location.used) continue;
      const ext = location.extended ? 0x100 : 0;
      const tileset = rom.tilesets[(location.tileset & 0x7f) >> 2];
      const tileEffects = rom.tileEffects[location.tileEffects - 0xb3];

      // Find a few spawns early
      for (const spawn of location.spawns) {
        // Walls need to come first so we can avoid adding separate
        // requirements for every single wall - just use the type.
        if (spawn.isWall()) {
          walls.set(ScreenId.from(location, spawn), spawn.id as WallType);
        }

        // TODO - currently this is bbroken -
        //   [...ll.routes.routes.get(tiles.find(0xa60088)).values()].map(s => [...s].map(x => x.toString(16)).join(' & '))
        // Lists 5 things: flight, break iron, mt sabre prison, swan gate, crypt entrance
        //   - should at least require breaking stone or ice?

      }

      // Add terrains
      for (let y = 0, height = location.height; y < height; y++) {
        const row = location.screens[y];
        const rowId = location.id << 8 | y << 4;
        for (let x = 0, width = location.width; x < width; x++) {
          const screen = rom.screens[row[x] | ext];
          const screenId = ScreenId(rowId | x);
          const flagYx = screenId & 0xff;
          const wall = walls.get(screenId);
          const flag = wall != null ? overlay.wallCapability(wall) :
                                      location.flags.find(f => f.yx === flagYx);
          const withFlagMemoized = memoize2((t1: Terrain, t2: Terrain) => {
            if (!flag) throw new Error(`flag expected`);
            t2 = {...t2, enter: meet(t2.enter || [[]], Condition(flag.flag))};
            return Terrain.join(t1, t2);
          });
          function withFlag(t1: Terrain | undefined, t2: Terrain | undefined) {
            if (!flag) throw new Error(`flag expected`);
            if (!t2) return t1;
            if (!t1) return Terrain.meet({enter: Condition(flag.flag)}, t2);
            return withFlagMemoized(t1, t2);
          };

          for (let t = 0; t < 0xf0; t++) {
            const tid = TileId(screenId << 8 | t);
            let tile = screen.tiles[t];
            // flag 2ef is "always on", don't even bother making it conditional.
            if (flag && flag.flag === 0x2ef && tile < 0x20) tile = tileset.alternates[tile];
            const effects = ext ? 0 : tileEffects.effects[tile] & 0x26;
            let terrain = overlay.makeTerrain(effects, tid);
            if (tile < 0x20 && tileset.alternates[tile] != tile && flag && flag.flag !== 0x2ef) {
              const alternate =
                  overlay.makeTerrain(tileEffects.effects[tileset.alternates[tile]], tid);
              terrain = withFlag(terrain, alternate);
            }
            if (terrain) terrains.set(tid, terrain);
          }
        }
      }

      // Clobber terrain with seamless exits
      for (const exit of location.exits) {
        if (exit.entrance & 0x20) {
          const tile = TileId.from(location, exit);
          allExits.add(tile);
          const previous = terrains.get(tile);
          if (previous) terrains.set(tile, Terrain.seamless(previous));
        }
      }

      // Find "terrain triggers" that prevent movement one way or another
      function meetTerrain(tile: TileId, terrain: Terrain): void {
        const previous = terrains.get(tile);
        // if tile is impossible to reach, don't bother.
        if (!previous) return;
        terrains.set(tile, Terrain.meet(previous, terrain));
      }
      for (const spawn of location.spawns) {
        if (spawn.isTrigger()) {
          // For triggers, which tiles do we mark?
          // The trigger hitbox is 2 tiles wide and 1 tile tall, but it does not
          // line up nicely to the tile grid.  Also, the player hitbox is only
          // $c wide (though it's $14 tall) so there's some slight disparity.
          // It seems like probably marking it as (x-1, y-1) .. (x, y) makes the
          // most sense, with the caveat that triggers shifted right by a half
          // tile should go from x .. x+1 instead.
          const trigger = overlay.trigger(spawn.id);
          // TODO - consider checking trigger's action: $19 -> push-down message
          if (trigger.terrain || trigger.check) {
            let {x: x0, y: y0} = spawn;
            x0 += 8;
            for (const dx of [-16, 0]) {
              for (const dy of [-16, 0]) {
                const x = x0 + dx;
                const y = y0 + dy;
                const tile = TileId.from(location, {x, y});
                if (trigger.terrain) meetTerrain(tile, trigger.terrain);
                if (trigger.check) checks.get(tile).push(...trigger.check);
              }
            }
          }
        } else if (spawn.isNpc()) {
          npcs.set(TileId.from(location, spawn), spawn.id);
          const npc = overlay.npc(spawn.id, location);
          if (npc.terrain || npc.check) {
            let {x: xs, y: ys} = spawn;
            let {x0, x1, y0, y1} = npc.hitbox || {x0: 0, y0: 0, x1: 1, y1: 1};
            for (let dx = x0; dx < x1; dx++) {
              for (let dy = y0; dy < y1; dy++) {
                const x = xs + 16 * dx;
                const y = ys + 16 * dy;
                const tile = TileId.from(location, {x, y});
                if (npc.terrain) meetTerrain(tile, npc.terrain);
                if (npc.check) checks.get(tile).push(...npc.check);
              }
            }
          }
        } else if (spawn.isBoss()) {
          // Bosses will clobber the entrance portion of all tiles on the screen,
          // and will also add their drop.
          bosses.set(TileId.from(location, spawn), spawn.id);
        } else if (spawn.isChest()) {
          // TODO - if spawn.id >= $70 then differentiate?
          const id = spawn.id <  0x70 ? spawn.id : mimic++;
          checks.get(TileId.from(location, spawn)).push(Check.chest(id));
        } else if (spawn.isMonster()) {
          // TODO - compute money-dropping monster vulnerabilities and add a trigger
          // for the MONEY capability dependent on any of the swords.
          const monster = rom.objects[spawn.monsterId];
          if (monster.goldDrop) monsters.set(TileId.from(location, spawn), monster.elements);
        }
      }
    }

    for (const [bossTile, bossId] of bosses) {
      const loc = bossTile >> 16;
      const rage = bossId === 0xc3;
      const boss = !rage ? rom.bosses.fromLocation(loc) : rom.bosses.rage;
      if (loc === 0xa0 || loc === 0x5f) continue; // skip statues and dyna
      if (!boss || boss.kill == null) throw new Error(`bad boss at loc ${loc.toString(16)}`);
      // TODO - shuffle Rage's demand
      const kill = Boss(boss.kill);

      const merge = memoize((t: Terrain) => Terrain.meet(t, {exit: kill, exitSouth: kill}));
      const tileBase = bossTile & ~0xff;
      for (let i = 0; i < 0xf0; i++) {
        const tile = TileId(tileBase | i);
        const t = terrains.get(tile);
        if (!t) continue;
        terrains.set(tile, merge(t));
      }
      const condition = overlay.bossRequirements(boss);
      const checkTile = rage ? TileId(tileBase | 0x88) : bossTile;
      checks.get(checkTile).push({slot: Slot(kill), condition});
    }

    for (const check of overlay.locations() || []) {
      checks.get(check.tile).push(check);
    }

    // let s = 1;
    // const weak = new WeakMap<object, number>();
    // function uid(x: unknown): number {
    //   if (typeof x !== 'object' || !x) return -1;
    //   if (!weak.has(x)) weak.set(x, s++);
    //   return weak.get(x) || -1;
    // }

    // At this point we've got a full mapping of all terrains per location.
    // Now we do a giant unionfind and establish connections between same areas.
    for (const [tile, terrain] of terrains) {
      const x1 = TileId.add(tile, 0, 1);
      if (terrains.get(x1) === terrain) this.tiles.union([tile, x1]);
      const y1 = TileId.add(tile, 1, 0);
      if (terrains.get(y1) === terrain) this.tiles.union([tile, y1]);
      //console.log(`${hex(tile)}: ${uid(terrain)}`);
      //console.log(terrain);
      //console.log(` +x: ${hex(x1)}: ${uid(terrains.get(x1))}`);
      //console.log(` +y: ${hex(y1)}: ${uid(terrains.get(y1))}`);
    }

    // Add exits to a map.  We do this *after* the initial unionfind so that
    // two-way exits can be unioned easily.
    const exitSet = new Set<TilePair>();
    for (const location of rom.locations/*.slice(0,2)*/) {
      if (!location.used) continue;
      for (const exit of location.exits) {
        const {dest, entrance} = exit;
        const from = TileId.from(location, exit);
        // Handle seamless exits
        const to = entrance & 0x20 ?
            TileId(from & 0xffff | (dest << 16)) :
            TileId.from({id: dest} as any, rom.locations[dest].entrances[entrance]);
        // NOTE: we could skip adding exits if the tiles are not known
        exitSet.add(TilePair.of(this.tiles.find(from), this.tiles.find(to)));
      }
    }
    for (const exit of exitSet) {
      const [from, to] = TilePair.split(exit);
      if (terrains.get(from) !== terrains.get(to)) continue;
      const reverse = TilePair.of(to, from);
      if (exitSet.has(reverse)) {
        this.tiles.union([from, to]);
        exitSet.delete(exit);
        exitSet.delete(reverse);
      }
    }

    // Now look for all different-terrain neighbors and track connections.
    const neighbors = new Neighbors(this.tiles, allExits);
    for (const [tile, terrain] of terrains) {
      const x1 = TileId.add(tile, 0, 1);
      const tx1 = terrains.get(x1);
      if (tx1 && tx1 !== terrain) neighbors.addAdjacent(tile, x1, false);
      const y1 = TileId.add(tile, 1, 0);
      const ty1 = terrains.get(y1);
      if (ty1 && ty1 !== terrain) neighbors.addAdjacent(tile, y1, true);
    }

    // Also add all the remaining exits.  We decompose and recompose them to
    // take advantage of any new unions from the previous exit step.
    for (const exit of exitSet) {
      const [from, to] = TilePair.split(exit);
      if (!terrains.has(from) || !terrains.has(to)) continue;
      neighbors.addExit(from, to);
    }

    // TODO - hardcode some exits
    //  - the transition from $51 to $60 is impassible on both sides:
    //    add a conditional exit from the boat tile to the beach (both ways)
    //  - some transitions in the tower are on top of impassible-looking tiles

    const builder = new LocationListBuilder(terrains);
    for (const r of overlay.extraRoutes()) {
      for (const c of r.condition || [[]]) {
        builder.routes.addRoute(this.tiles.find(r.tile), c);
      }
    }
    for (const {from, to, condition} of overlay.extraEdges()) {
      for (const deps of condition || [[]]) {
        builder.routes.addEdge(this.tiles.find(to), this.tiles.find(from), deps);
      }
    }
    for (const {from, to, south} of neighbors) {
      builder.addEdge(from, to, south);
    }

    const reqs = new DefaultMap<Slot, MutableRequirement>(() => new MutableRequirement());
    // Now we add the slots.
    // Note that we need a way to ensure that all the right spots get updated
    // when we fill a slot.  One way is to only use the 2xx flags in the various
    // places for things that should be replaced when the slot is filled.
    //
    // For the actual slots, we keep track of where they were found in a separate
    // data structure so that we can fill them.

    // Add fixed capabilities
    for (const {condition = [[]], capability} of overlay.capabilities()) {
      reqs.get(Slot(capability)).addAll(condition);
    }

    for (const [tile, checklist] of checks) {
      for (const {slot, condition = [[]]} of checklist) {
        const req = reqs.get(slot);
        for (const r1 of condition) {
          for (const r2 of builder.routes.routes.get(this.tiles.find(tile)) || []) {
            req.addList([...r1, ...r2]);
          }
        }
      }
    }

    // Note: at this point we've built up the main initial location list.
    // We need to return something useful out of it.
    //  - some interface that can be used for assumed-fill logic.
    //  - want a usable toString for spoiler log.
    //  - would be nice to have packed bigints if possible?
    // Any slots that are NOT requirements should be filtered out

    // Build up shuffle.Graph
    // First figure out which items and events are actually needed.
    this.graph = makeGraph(reqs, rom);

    // Build up a graph?!?
    // Will need to map to smaller numbers?
    // Can we compress lazily?
    //  - everything we see as a requirement goes into one list/map
    //  - everything we see as a "get" goes into another
    //  - filling maps between them
    // start at entrance, build full requirements for each place
    // follow exits:
    //  - for each exit, update requirements, queue recheck if changed
    //  - we could do a less-thorough version:
    //     - start at entrance, add (open) requirement
    //     - queue all exits, ignoring any already seen
    //       keep track of which locations had changed reqs
    //     - once queue flushes, replace queue with changed
    //     - repeat until changed is empty at end of queue

    // For monsters - figure out which swords lead to money
          // if (!(elements & 0x1)) moneySwords.add(0);
          // if (!(elements & 0x2)) moneySwords.add(1);
          // if (!(elements & 0x4)) moneySwords.add(2);
          // if (!(elements & 0x8)) moneySwords.add(3);

    // const entrance = rom.locations[start].entrances[0];
    // this.addEntrance(parseCoord(start, entrance));

    const w = window as any;
    console.log(w.roots = (w.tiles = this.tiles).roots());
    console.log([...(w.neighbors = neighbors)]);
    console.log(w.ll = builder);

function h(x: number): string { return x < 0 ? '~' + (~x).toString(16).padStart(2,'0') : x.toString(16).padStart(3,'0'); }
function dnf(x: Iterable<Iterable<number>>, f = h): string {
  const xs = [...x];
  if (!xs.length) return 'no route';
  return '(' + xs.map(y => [...y].map(f).join(' & ')).join (') |\n     (') + ')';
}
w.area = (tile: TileId, f: (x:number)=>string = h) => {
  const s = [...this.tiles.sets().filter(s => s.has(tile))[0]].map(x=>x.toString(16).padStart(6,'0'));
  // const r = '(' + [...builder.routes.routes.get(this.tiles.find(tile))].map(s => [...s].map(x => x < 0 ? '~' + (~x).toString(16) : x.toString(16)).join(' & ')).join(') | (') + ')';
  const r = dnf(builder.routes.routes.get(this.tiles.find(tile)), f);
  // neighbors
  const edges = [];
  const t = this.tiles.find(tile);
  for (const out of (builder.routes.edges.get(t) || new Map()).values()) {
    edges.push(`\nto ${out.target.toString(16)} if (${[...out.deps].map(f).join(' & ')})`);
  }
  for (const [from, rs] of builder.routes.edges) {
    for (const to of rs.values()) {
      if (to.target !== t) continue;
      edges.push(`\nfrom ${from.toString(16)} if (${[...to.deps].map(f).join(' & ')})`);
    }
  }
  function group(arr: unknown[], count: number, spacer: string): string[] {
    const out = [];
    for (let i = 0; i < arr.length; i += count) {
      out.push(arr.slice(i, i + count).join(spacer));
    }
    return out;
  }
  return `${hex(t)}\n${group(s, 16, ' ').join('\n')}\ncount = ${s.length}\nroutes = ${r}${edges.join('')}`;
};

    w.whatFlag = (f: number) => conditionName(f, rom);

    w.reqs = reqs;
    console.log('reqs\n' + [...reqs].sort(([a],[b])=>a-b).map(([s, r]) => `${w.whatFlag(s)}: ${dnf(r,w.whatFlag)}`).join('\n'));

    w.reqs.check = (id: number, f: ((flag: number) => string) = h): string => `${f(id)}: ${dnf(reqs.get(Slot(id)), f)}`;
    w.reqs.check2 = (id: number): string => w.reqs.check(id, w.whatFlag);



    // Summary: 1055 roots, 1724 neighbors
    // This is too much for a full graph traversal, but many can be removed???
    //   -> specifically what?

    // Add itemgets and npcs to roots
    //  - NPC will need to come from a metastructure of shuffled NPCs, maybe?
    //  --- if we move akahana out of brynmaer, need to know which item is which

  }
}

function makeGraph(reqs: Map<Slot, MutableRequirement>, rom: Rom): shuffle.Graph {
  // Figure out which items are used, build two sets.
  const allConditionsSet = new Set<Condition>();
  const allSlotsSet = new Set<Slot>();
  for (const [slot, req] of reqs) {
    allSlotsSet.add(slot);
    for (const cs of req) {
      for (const c of cs) {
        allConditionsSet.add(c);
      }
    }
  }

  function isItem(c: number): boolean { return c >= 0x200 && c < 0x280; }
  const allConditions = [...allConditionsSet].filter(c => !isItem(c)).sort();
  const allItems = [...allConditionsSet].filter(isItem).sort();
  const allSlots = [...allSlotsSet].filter(isItem).sort();
  const fixed = allConditions.length;

  function makeNode(condition: number, index: number) {
    return {name: conditionName(condition, rom), condition, index} as
        shuffle.ItemNode & shuffle.SlotNode;
  }
  function itemNode(condition: number, index: number) {
    return Object.assign(makeNode(condition, index + fixed), {item: (condition & 0x7f) as any});
  }
  const conditionNodes = allConditions.map(makeNode);
  const itemNodes = allItems.map(itemNode);
  const slotNodes = allSlots.map(itemNode);

  const items: shuffle.ItemNode[] = [...conditionNodes, ...itemNodes];
  const slots: shuffle.SlotNode[] = [...conditionNodes, ...slotNodes];

  const itemIndexMap =
      new Map<Condition, shuffle.ItemIndex>(
          items.map((c, i) => [c.condition as Condition, i as shuffle.ItemIndex]));
  function getItemIndex(c: Condition): shuffle.ItemIndex {
    const index = itemIndexMap.get(c);
    if (index == null) throw new Error(`Missing item for ${c}`);
    return index;
  }
  const slotIndexMap =
      new Map<Slot, shuffle.SlotIndex>(
          slots.map((c, i) => [c.condition as Slot, i as shuffle.SlotIndex]));

  const graph: Bits[][] = [];
  const unlocksSet: Array<Set<shuffle.SlotIndex>> = [];

  for (const [slot, req] of reqs) {
    // NOTE: need map from full to compressed.
    const s = slotIndexMap.get(slot);
    if (s == null) throw new Error(`Missing slot for ${slot}`);
    for (const cs of req) {
      const is = [...cs].map(getItemIndex);
      (graph[slot] || (graph[s] = [])).push(Bits.from(is));
      for (const i of is) {
        (unlocksSet[i] || (unlocksSet[i] = new Set())).add(s);
      }
    }
  }
  const unlocks = unlocksSet.map(x => [...x]);
  return {fixed, slots, items, graph, unlocks};
}

function conditionName(f: number, rom: Rom): string {
  const enums = {Boss, Event, Capability, Item, Magic};
  for (const enumName in enums) {
    const e = enums[enumName as keyof typeof enums] as any;
    for (const elem in e) {
      if (e[elem] === f || Array.isArray(e[elem]) && e[elem][0][0] === f) {
        return `${enumName}.${elem}`;
      }
    }
  }
  for (const l of rom.locations) {
    if (!l.used) continue;
    for (const fl of l.flags) {
      if (fl.flag === f) {
        return `Location ${l.id.toString(16)} (${l.name}) Flag ${fl.ys},${fl.xs}`;
      }
    }
  }
  return f < 0 ? `~${(~f).toString(16).padStart(2, '0')}` : f.toString(16).padStart(2, '0');
}

/////////////

