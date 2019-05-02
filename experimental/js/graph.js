import { Deque } from './util.js';
export const Edge = {
    of: (...nodes) => nodes.map(n => n.uid),
};
export class Node {
    constructor(graph, name) {
        this.graph = graph;
        this.name = name;
        this.uid = graph.nodes.length;
        graph.nodes.push(this);
    }
    get nodeType() {
        return 'Node';
    }
    toString() {
        return `${this.nodeType} ${this.name}`;
    }
    edges(opts) {
        return [];
    }
    write(rom) { }
}
export class Graph {
    constructor() {
        this.nodes = [];
    }
    traverse({ wanted, dfs = false } = {}) {
        const stack = new Deque();
        const seen = new Map();
        const g = new Map();
        for (const n of this.nodes) {
            for (const edge of n.edges()) {
                const label = edge.join(' ');
                for (let i = 1; i < edge.length; i++) {
                    const from = edge[i];
                    if (!g.has(from))
                        g.set(from, new Map());
                    g.get(from).set(label, edge);
                }
                if (edge.length === 1) {
                    const to = edge[0];
                    if (!seen.has(to)) {
                        stack.push(to);
                        seen.set(to, edge);
                    }
                }
            }
        }
        const want = new Set((wanted || this.nodes).map((n) => n instanceof Node ? n.uid : n));
        const empty = new Map();
        while (want.size && stack.length) {
            const n = dfs ? stack.pop() : stack.shift();
            want.delete(n);
            NEXT_EDGE: for (const edge of (g.get(n) || empty).values()) {
                const next = edge[0];
                if (seen.has(next))
                    continue;
                for (let i = 1; i < edge.length; i++) {
                    if (!seen.has(edge[i]))
                        continue NEXT_EDGE;
                }
                seen.set(next, edge);
                stack.push(next);
            }
        }
        return {
            path: [...seen.values()].map(([n, ...deps]) => {
                const str = (o) => [
                    this.nodes[o],
                ];
                return [n, [
                        ...str(n),
                        ' (',
                        deps.map(d => str(d).join('').replace(/\s+\(.*\)/, '')).join(', '),
                        ')',
                    ].join('')];
            }),
            seen,
            win: !want.size,
        };
    }
}
export class SparseDependencyGraph {
    constructor(size) {
        this.nodes = new Array(size).fill(0).map(() => new Map());
        this.finalized = new Array(size).fill(false);
    }
    addRoute(edge) {
        const target = edge[0];
        if (this.finalized[target]) {
            throw new Error(`Attempted to add a route for finalized node ${target}`);
        }
        let s = new Set();
        for (let i = edge.length - 1; i >= 1; i--)
            s.add(edge[i]);
        while (true) {
            let changed = false;
            for (const d of s) {
                if (d === target)
                    return [];
                if (this.finalized[d]) {
                    const repl = this.nodes[d];
                    if (!repl.size)
                        return [];
                    s.delete(d);
                    if (repl.size === 1) {
                        for (const dd of repl.values().next().value) {
                            s.add(dd);
                        }
                        changed = true;
                        break;
                    }
                    const routes = new Map();
                    for (const r of repl.values()) {
                        for (const r2 of this.addRoute([target, ...s, ...r])) {
                            routes.set(r2.label, r2);
                        }
                    }
                    return [...routes.values()];
                }
            }
            if (!changed)
                break;
        }
        const sorted = [...s].sort();
        s = new Set(sorted);
        const label = sorted.join(' ');
        const current = this.nodes[target];
        if (current.has(label))
            return [];
        for (const [l, d] of current) {
            if (containsAll(s, d))
                return [];
            if (containsAll(d, s))
                current.delete(l);
        }
        current.set(label, s);
        return [{ target, deps: s, label: `${target}:${label}` }];
    }
    finalize(node) {
        if (this.finalized[node])
            return;
        this.finalized[node] = true;
        for (let target = 0; target < this.nodes.length; target++) {
            const routes = this.nodes[target];
            if (!routes.size)
                continue;
            for (const [label, route] of routes) {
                if (route.has(node)) {
                    const removed = this.finalized[target];
                    this.finalized[target] = false;
                    routes.delete(label);
                    this.addRoute([target, ...route.values()]);
                    this.finalized[target] = removed;
                }
            }
        }
    }
}
const containsAll = (left, right) => {
    if (left.size < right.size)
        return false;
    for (const d of right) {
        if (!left.has(d))
            return false;
    }
    return true;
};
//# sourceMappingURL=graph.js.map