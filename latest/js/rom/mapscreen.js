import { TileEffects } from './tileeffects.js';
import { UnionFind } from '../unionfind.js';
import { DefaultMap } from '../util.js';
export class MapScreen {
    constructor(screen, tileset) {
        this.screen = screen;
        this.tileset = tileset;
        this.partition = new Map();
        this.partitions = [];
        const graph = new UnionFind();
        const effects = tileset.effects().effects;
        const scr = screen.id << 8;
        function walkable(tile) {
            const override = OVERRIDE.get(tile | scr);
            if (override != null)
                return override;
            let mt = screen.tiles[tile];
            let effect = effects[mt];
            if (mt < 0x20 && effect & TileEffects.ALTERNATIVE) {
                effect = effects[mt = tileset.alternates[mt]];
            }
            return !(effect & (TileEffects.NO_WALK | TileEffects.IMPASSIBLE));
        }
        for (let y = 0; y < 0xf; y++) {
            for (let x = 0; x < 0x10; x++) {
                const t = y << 4 | x;
                if (!walkable(t))
                    continue;
                if (y && walkable(t - 16))
                    graph.union([t, t - 16]);
                if (x && walkable(t - 1))
                    graph.union([t, t - 1]);
            }
        }
        for (const set of graph.sets()) {
            let partition = null;
            for (const t of set) {
                if (!isPerimeter(t) && t !== 0x88)
                    continue;
                if (!partition)
                    this.partitions.push(partition = new Set());
                partition.add(t);
                this.partition.set(t, this.partitions.length - 1);
            }
        }
        const edges = [0, 0, 0, 0];
        for (let i = 15; i >= 0; i--) {
            for (let j = 0; j < 4; j++) {
                edges[j] <<= 1;
                const tile = j < 2 ? (!j ? i : i << 4 | 0xf) : j === 2 ? 0xe0 | i : i << 4;
                if (this.partition.has(tile))
                    edges[j] |= 1;
            }
        }
        this.edges = edges;
    }
}
function isPerimeter(t) {
    const col = t & 0x0f;
    const row = t & 0xf0;
    return !row || row === 0xe0 || !col || col === 0xf;
}
const OVERRIDE = new Map([
    ...rows([
        [0x7200, 0b0000111111110000],
        [0x72e0, 0b0000111111110000],
        [0x73e0, 0b0000111111110000],
        [0x9b00, 0b0000001111000000],
        [0x9be0, 0b0000001111000000],
        [0xfde0, 0b0000111111110000],
    ]),
    ...cols([
        [0x7c00, 0],
        [0x7c0f, 0],
    ])
]);
function* rows(rows) {
    for (const [base, bits] of rows) {
        for (let i = 0; i < 16; i++) {
            yield [base | i, Boolean(bits & (1 << i))];
        }
    }
}
function* cols(cols) {
    for (const [base, bits] of cols) {
        for (let i = 0; i < 15; i++) {
            yield [base | i << 4, Boolean(bits & (1 << i))];
        }
    }
}
export class MapBuilder {
    constructor(tileset, availableScreens, random, height, width) {
        this.tileset = tileset;
        this.random = random;
        this.height = height;
        this.width = width;
        this.screens = [];
        this.edges = new DefaultMap(() => new Set());
        this.eligible = [];
        this.constraints = [];
        this.inBounds = new Set();
        for (const scr of availableScreens) {
            for (let dir = 0; dir < 4; dir++) {
                const edge = tileset.screens[scr].edges[dir];
                this.edges.get(dir | edge << 2).add(scr);
            }
        }
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                this.inBounds.add(y << 4 | x);
            }
        }
    }
    isInBounds(pos) {
        return pos >= 0 && (pos >>> 4) < this.height && (pos & 0xf) < this.width;
    }
    reset() {
        this.eligible = [];
        this.constraints = [];
        for (const i of this.inBounds) {
            if (this.screens[i] < 0) {
            }
            else {
                this.screens[i] = undefined;
                delete this.constraints[i];
            }
        }
        for (const pos of this.inBounds) {
            this.initConstraints(pos);
        }
    }
    initConstraints(pos) {
        delete this.constraints[pos];
        for (let dir of Dir) {
            const n = pos + DELTA[dir];
            if (this.inBounds.has(n)) {
                let s = this.screens[n];
                if (s == null)
                    continue;
                s = s < 0 ? ~s : s;
                this.addConstraint(pos, dir, this.tileset.screens[s].edges[dir ^ 2]);
            }
            else {
                this.addConstraint(pos, dir, 0);
            }
        }
    }
    addConstraint(scr, dir, edge) {
        if (!this.inBounds.has(scr) || this.screens[scr] != null)
            return;
        let constraints = this.constraints[scr];
        if (!constraints) {
            this.constraints[scr] = constraints = [];
            this.eligible.push(scr);
        }
        constraints[dir] = edge;
    }
    deleteConstraint(scr, dir) {
        let constraints = this.constraints[scr];
        if (!constraints)
            return;
        delete constraints[dir];
        for (let i = constraints.length - 1; i >= 0; i--) {
            if (constraints[i] != null) {
                return;
            }
        }
        const index = this.eligible.findIndex(x => x != null);
        if (index >= 0)
            this.eligible.splice(index, 1);
    }
    fill(backtracks) {
        let pos;
        while ((pos = this.findEmpty()) != null && backtracks >= 0) {
            const scr = this.pickScreen(pos);
            if (scr != null) {
                this.setScreen(pos, scr);
            }
            else {
                this.deleteOneNeighbor(pos);
                backtracks--;
            }
        }
        return pos == null;
    }
    findEmpty() {
        const screens = this.random.shuffle([...this.inBounds]);
        for (const pos of screens) {
            if (this.screens[pos] == null && (this.constraints[pos] || []).some(x => x != null))
                return pos;
        }
        return undefined;
    }
    deleteSomeScreens() {
        const filled = [];
        for (const pos of this.inBounds) {
            if (this.screens[pos] >= 0) {
                filled.push(pos);
            }
        }
        this.random.shuffle(filled);
        const count = 1 + this.random.nextInt(filled.length - 1);
        for (const pos of filled.slice(0, count)) {
            this.deleteScreen(pos);
        }
    }
    traverse() {
        const uf = new UnionFind();
        for (const pos of this.inBounds) {
            let scr = this.screens[pos];
            const parts = this.tileset.screens[scr < 0 ? ~scr : scr].partitions.map(part => [...part].map(t => {
                t = pos << 8 | t;
                if ((t & 0xf0) === 0xe0)
                    t += 0x20;
                if ((t & 0x0f) === 0x0f)
                    t += 0x01;
                return t;
            }));
            for (const part of parts) {
                uf.union(part);
            }
        }
        const sets = uf.sets();
        const map = new Map();
        for (let i = 0; i < sets.length; i++) {
            for (const tile of sets[i]) {
                map.set(tile, i);
            }
        }
        return map;
    }
    deleteOneNeighbor(pos) {
        const dirs = this.random.shuffle([...Dir]);
        for (const dir of dirs) {
            const neighbor = pos + DELTA[dir];
            if (!this.inBounds.has(neighbor) ||
                !(this.screens[neighbor] >= 0))
                continue;
            this.deleteScreen(neighbor);
            return;
        }
        throw new Error(`Could not find a neighbor to delete!`);
    }
    pickScreen(pos) {
        let screens;
        const constraints = this.constraints[pos];
        for (let dir = 0; dir < constraints.length; dir++) {
            const edge = constraints[dir];
            if (edge == null)
                continue;
            const set = this.edges.get(dir | edge << 2);
            ;
            screens = !screens ? set : intersect(screens, set);
        }
        if (!screens || !screens.size)
            return undefined;
        const eligible = [...screens];
        return this.random.pick(eligible);
    }
    setScreen(pos, scr) {
        if (this.screens[pos] != null)
            throw new Error('screen already set');
        this.screens[pos] = scr;
        delete this.constraints[pos];
        const edges = this.tileset.screens[scr].edges;
        for (const dir of Dir) {
            const neighbor = pos + DELTA[dir];
            this.addConstraint(neighbor, opposite(dir), edges[dir]);
        }
    }
    deleteScreen(pos) {
        const previous = this.screens[pos];
        this.screens[pos] = undefined;
        if (previous == null)
            return;
        if (previous < 0)
            throw new Error(`Cannot delete fixed screen`);
        for (const dir of Dir) {
            const neighbor = pos + DELTA[dir];
            if (!this.inBounds.has(neighbor))
                continue;
            this.deleteConstraint(neighbor, opposite(dir));
        }
        this.initConstraints(pos);
    }
}
const Dir = [0, 1, 2, 3];
const DELTA = [-16, 1, 16, -1];
function opposite(d) {
    return (d ^ 2);
}
function intersect(xs, ys) {
    const out = new Set();
    for (const x of xs) {
        if (ys.has(x))
            out.add(x);
    }
    return out;
}
//# sourceMappingURL=mapscreen.js.map