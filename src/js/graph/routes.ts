import {TileId} from './geometry.js';
import {Condition, MutableRequirement} from './condition.js';
import {DefaultMap} from '../util.js';

// Tracks routes through a graph.

export class Routes {

  // readonly triggers = new DefaultMap<Condition, Map<string, Set<Condition>>>(() => new Map());
  readonly routes = new DefaultMap<TileId, MutableRequirement>(() => new MutableRequirement());
  readonly edges = new DefaultMap<TileId, Map<string, LabeledRoute>>(() => new Map());

  // Before adding a route, any target is unreachable
  // To make a target always reachable, add an empty route

  // Must be called AFTER all edges and routes are added.
  // route(gain: Condition,
  //       source: TileId,
  //       route: readonly Condition[]): Map<string, LabeledRequirements> {
  //   const sorted = [...route].sort();
  //   const deps = new Set(sorted);
  //   const edge = [target, deps] as const;
  //   this.edges.get(source).set(String(edge), edge);
  //   // if (source === target) return [];
  //   //const routes = new Map<string, LabeledRoute>();
  //   for (const srcRoute of this.routes.get(source).values()) {
  //     this.addRoute(target, [...srcRoute, ...route]);
  //   }
  // }

  // TODO - make a class for Map<string, Set<Condition>> ???
  //      - figure out API for add  -->  return either added req or null ?

  addEdge(target: TileId, source: TileId, route: readonly Condition[]): void {
    const edge = LabeledRoute(target, route);
    this.edges.get(source).set(edge.label, edge);
    // if (source === target) return [];
    //const routes = new Map<string, LabeledRoute>();
    for (const srcRoute of this.routes.get(source).values()) {
      this.addRoute(target, [...srcRoute, ...route]);
      // for (const r of this.addRoute(target, [...srcRoute, ...route])) {
      //   routes.set(r.label, r);
      // }
    }
    //return [...routes.values()];
  }

  // Note: Condition array not sorted or even deduped.
  addRoute(target: TileId, route: readonly Condition[]): void {
    const queue = new Map<string, LabeledRoute>();
    const seen = new Set<string>();
    const start = LabeledRoute(target, route);
    queue.set(start.label, start);
    const iter = queue.values();
    while (true) {
      const {value, done} = iter.next();
      if (done) return;
      seen.add(value.label);
      queue.delete(value.label); // unnecessary
      for (const next of this.addRouteInternal(value)) {
        if (seen.has(next.label)) continue;
        queue.delete(next.label); // does this actually help?
        queue.set(next.label, next);
      }
    }
  }

  addRouteInternal({target, depsLabel, deps}: LabeledRoute): Iterable<LabeledRoute> {
    const current = this.routes.get(target);
    if (!current.add(depsLabel, deps)) return [];
    // We added a new route.  Compute all the new neighbor routes.
    const out = new Map<string, LabeledRoute>();
    for (const next of this.edges.get(target).values()) {
      const follow = LabeledRoute(next.target, [...deps, ...next.deps]);
      out.set(follow.label, follow);
    }
    return out.values();
  }
}

// export type Route = readonly [TileId, ...Condition[]];

export function LabeledRoute(target: TileId, route: readonly Condition[]): LabeledRoute {
  const sorted = [...new Set(route)].sort();
  const deps = new Set(sorted);
  const depsLabel = sorted.join(' ');
  const label = `${target}:${depsLabel}`;
  return {target, deps, label, depsLabel};
}

export interface LabeledRoute {
  readonly target: TileId;
  readonly deps: Set<Condition>;
  readonly label: string;
  readonly depsLabel: string;
}

// export interface LabeledRequirements {
//   readonly label: string;
//   readonly deps: Set<Condition>;
// }

// export interface LabeledEdge {
//   readonly target: TileId;
//   readonly source: TileId;
//   readonly deps: Set<Condition>;
//   readonly label: string;
// }
