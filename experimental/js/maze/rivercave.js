import { CaveShuffle } from './cave.js';
import { N, S } from './grid.js';
import { Monogrid, Cursor } from './monogrid.js';
import { OK } from './maze.js';
import { TwoStageCaveShuffle } from './twostage.js';
import { seq } from '../rom/util.js';
import { DefaultMap } from '../util.js';
export class RiverCaveShuffle extends TwoStageCaveShuffle {
    constructor() {
        super(...arguments);
        this.early = 'r';
        this.maxAttempts = 250;
    }
    targetEarly() { var _a, _b; return (_b = (_a = this.params.features) === null || _a === void 0 ? void 0 : _a.river) !== null && _b !== void 0 ? _b : 0; }
    preinfer() {
        if ([...this.orig.exits()].length < 2)
            return OK;
        const override = new Map();
        for (let i = 0; i < this.grid.data.length; i++) {
            if (this.grid.data[i] === 'r')
                override.set(this.grid.coord(i), '');
        }
        const parts = this.grid.partition(override);
        const stairParts = [];
        for (let i = 0; i < this.grid.data.length; i++) {
            if (this.grid.data[i] === '<' || this.grid.data[i] === '>' ||
                (this.grid.data[i] && this.grid.isBorder(this.grid.coord(i)))) {
                stairParts.push(parts.get(this.grid.coord(i)));
            }
        }
        if (new Set(stairParts).size < stairParts.length) {
            return { ok: false, fail: `river didn't matter\n${this.grid.show()}` };
        }
        return super.preinfer();
    }
    addLateFeatures() {
        return OK;
    }
    addArenas(arenas) {
        if (!arenas)
            return true;
        const g = this.grid;
        for (const c of this.random.ishuffle(this.grid.screens())) {
            const middle = (c | 0x808);
            const left = (middle - 8);
            const left2 = (left - 8);
            const right = (middle + 8);
            const right2 = (right + 8);
            const up = middle - 0x800;
            const down = middle + 0x800;
            if (g.get(middle) !== 'c')
                continue;
            if (g.get(up) !== 'c')
                continue;
            if (g.get(down) !== 'c')
                continue;
            const leftTile = g.isBorder(left) ? '' : this.extract(g, left2 - 0x808);
            const rightTile = g.isBorder(right) ? '' : this.extract(g, right2 - 0x808);
            if (/[^ c]/.test(leftTile + rightTile))
                continue;
            if (!g.isBorder(left)) {
                g.set(left, '');
                g.set(left2, '');
                g.set(left2 - 8, '');
                g.set(left2 - 0x800, '');
                g.set(left2 + 0x800, '');
            }
            if (!g.isBorder(right)) {
                g.set(right, '');
                g.set(right2, '');
                g.set(right2 + 8, '');
                g.set(right2 - 0x800, '');
                g.set(right2 + 0x800, '');
            }
            this.fixed.add(middle);
            this.fixed.add(up);
            this.fixed.add(down);
            g.set(middle, 'a');
            arenas--;
            if (!arenas) {
                this.pruneDisconnected();
                return true;
            }
        }
        return false;
    }
}
export class WaterfallRiverCaveShuffle extends RiverCaveShuffle {
    constructor() {
        super(...arguments);
        this.addBlocks = false;
    }
    initialFillEarly() {
        const g = new Monogrid(this.h, this.w, this.getValidEarlyScreens());
        const x0 = 2 + this.random.nextInt(this.w - 4);
        const x1 = 2 + this.random.nextInt(this.w - 4);
        const c = new Cursor(g, this.h - 1, x1);
        c.go(0);
        c.directedPath(this.random, 1, x0);
        c.go(0);
        this.grid.data = g.toGrid('r').data;
        this.addAllFixed();
        return OK;
    }
    addEdges() {
        let r = -1;
        const h = (this.h - 1) << 12 | 0x808;
        for (let x = 0; x < this.w; x++) {
            if (this.grid.get((h | (x << 4))) === 'r')
                r = x;
        }
        if (r < 0)
            throw new Error(`no river on bottom edge`);
        const c0 = (h | this.random.nextInt(r) << 4);
        const c1 = (h | (r + 1 + this.random.nextInt(this.w - 1 - r)) << 4);
        this.grid.set(c0, '>');
        this.grid.set(c0 - 8, '');
        this.grid.set(c0 + 8, '');
        this.grid.set(c1, '>');
        this.grid.set(c1 - 8, '');
        this.grid.set(c1 + 8, '');
        this.fixed.add(c0);
        this.fixed.add(c1);
        return OK;
    }
    addStairs() { return OK; }
    checkMeta(meta, repl) {
        const opts = repl ? { flight: true, with: repl } : { flight: true };
        const parts = meta.traverse(opts);
        return new Set(parts.values()).size === this.maxPartitions;
    }
}
export class OasisEntranceCaveShuffle extends CaveShuffle {
    constructor() {
        super(...arguments);
        this.addBlocks = false;
    }
    pickWidth() {
        return super.pickWidth() + this.random.nextInt(2);
    }
    initialFill() {
        const spikes = new DefaultMap(() => []);
        for (const scr of this.orig.tileset) {
            if (!scr.hasFeature('spikes') || !scr.data.edges)
                continue;
            let mask = 0;
            for (let dir = 0; dir < 4; dir++) {
                if (scr.data.edges[dir] === 's')
                    mask |= (1 << dir);
            }
            spikes.get(mask).push(...scr.gridTiles());
        }
        const x = 1 + this.random.nextInt(this.w - 2);
        const y = 1 + this.random.nextInt(this.h - 2);
        let pos = y << 4 | x;
        let c = this.posToGrid(pos, 0x808);
        let dir = y < this.h / 2 ? 2 : 0;
        this.insertTile(pos, this.random.pick(spikes.get(1 << dir)));
        for (let i = 4; i >= 0; i--) {
            pos += DPOS[dir];
            c = c + DGRID[dir];
            const opp = dir ^ 2;
            const masks = [];
            for (const [d, ts] of spikes) {
                if (!(d & (1 << opp)))
                    continue;
                const rem = d & ~(1 << opp);
                if (i ? !rem : rem)
                    continue;
                for (const _ of ts)
                    masks.push(d);
            }
            let nextDir;
            for (const d of this.random.ishuffle(masks)) {
                if (this.grid.isBorder(c + DGRID[d]))
                    continue;
                if (this.insertTile(pos, this.random.pick(spikes.get(d)))) {
                    nextDir = 31 - Math.clz32(d & ~(1 << opp));
                    break;
                }
            }
            if (nextDir == null)
                return { ok: false, fail: `spikes` };
            dir = nextDir;
        }
        const riverStart = [];
        for (let y = 3; y < this.h - 3; y++) {
            for (let x = 1; x < this.w - 1; x++) {
                riverStart.push((y << 12 | x << 4 | 0x808));
            }
        }
        let found = false;
        for (const c of this.random.ishuffle(riverStart)) {
            if (this.grid.get(c))
                continue;
            for (const d of DGRID) {
                if (this.grid.get(c + d) !== 'c')
                    continue;
                this.grid.set(c, 'r');
                const orthogonal = 0x808 & ~Math.abs(d);
                this.grid.set(c + orthogonal, 'r');
                this.grid.set(c - orthogonal, 'r');
                const o = this.random.pick([-orthogonal, orthogonal]);
                this.grid.set(c + 2 * o, 'r');
                this.grid.set(c + 3 * o, 'r');
                this.grid.set(c + 2 * o - d, 'c');
                found = true;
                break;
            }
            if (found)
                break;
        }
        if (!found)
            return { ok: false, fail: `nucleate river` };
        for (let i = 5 + this.random.nextInt(3); i > 0; i--) {
            if (!this.tryAdd({ char: 'c' }))
                return { ok: false, fail: `fill cave` };
        }
        for (let i = 0; i < this.grid.data.length; i++) {
            if (this.grid.data[i] && this.grid.isBorder(this.grid.coord(i))) {
                return { ok: false, fail: `border` };
            }
        }
        return OK;
    }
    checkMeta(meta, repl) {
        const opts = repl ? { flight: true, with: repl } : { flight: true };
        const parts = meta.traverse(opts);
        return new Set(parts.values()).size === this.maxPartitions;
    }
    refine() { return OK; }
    refineEdges() { return true; }
    addSpikes(spikes) {
        return true;
    }
    refineMetascreens(meta) {
        const result = super.refineMetascreens(meta);
        if (!result.ok)
            return result;
        function accessible(map) {
            const stairParts = [...new Set(map.values())].filter(set => {
                var _a;
                for (const stair of set) {
                    if ((_a = meta.exitType(stair)) === null || _a === void 0 ? void 0 : _a.startsWith('stair'))
                        return true;
                }
                return false;
            });
            return stairParts.length;
        }
        const parts1 = accessible(meta.traverse());
        const parts2 = accessible(meta.traverse({ flight: true }));
        if (parts1 === parts2)
            return { ok: false, fail: `flight not required` };
        return OK;
    }
}
const DGRID = [-0x800, -8, 0x800, 8];
const DPOS = [-16, -1, 16, 1];
export class StyxRiverCaveShuffle extends RiverCaveShuffle {
    constructor() {
        super(...arguments);
        this.addBlocks = false;
    }
    fillGrid() {
        var _a;
        const edges = [];
        let size = 0;
        for (const x of this.random.ishuffle(seq(this.w - 2, x => x + 1))) {
            if (edges.length === 1 && (x - edges[0]) ** 2 <= 1)
                continue;
            const c = ((this.h - 1) << 12 | x << 4 | 0x808);
            this.grid.set(c, 'c');
            this.grid.set(N(c), 'c');
            this.grid.set(S(c), 'n');
            this.fixed.add(c);
            this.fixed.add(N(c));
            this.fixed.add(S(c));
            edges.push(x);
            size++;
            if (edges.length === 2)
                break;
        }
        if (edges.length < 2)
            return { ok: false, fail: `initial edges` };
        let rivers = this.w;
        const cut = this.random.nextInt(Math.abs(edges[0] - edges[1]) - 1) +
            Math.min(edges[0], edges[1]) + 1;
        for (let i = 1; i < 2 * this.w; i++) {
            if (i === 2 * cut + 1)
                continue;
            this.grid.set(((this.h - 2) << 12 | i << 3 | 0x800), 'r');
            this.fixed.add(((this.h - 1) << 12 | i << 3 | 0x800));
        }
        const riversTarget = this.params.features.river;
        while (rivers < riversTarget) {
            const added = this.tryAdd({ char: 'r' });
            if (!added)
                return { ok: false, fail: `failed to extrude river\n${this.grid.show()}` };
            rivers += added;
            size += added;
        }
        const sizeTarget = this.params.size;
        while (size < sizeTarget) {
            const added = this.tryAdd();
            if (!added)
                return { ok: false, fail: `failed to extrude cave` };
            size += added;
        }
        return this.addStairs(...((_a = this.params.stairs) !== null && _a !== void 0 ? _a : []));
    }
    checkMeta() { return true; }
    refineMetascreens(meta) {
        const result = super.refineMetascreens(meta);
        if (!result.ok)
            return result;
        function accessible(map) {
            let count = 0;
            for (const set of new Set(map.values())) {
                for (const edge of set) {
                    if (meta.exitType(edge) === 'edge:bottom') {
                        count += set.size;
                        break;
                    }
                }
            }
            return count;
        }
        const parts1 = accessible(meta.traverse({ noFlagged: true }));
        const parts2 = accessible(meta.traverse());
        if (parts1 === parts2)
            return { ok: false, fail: `bridge didn't matter` };
        const parts3 = accessible(meta.traverse({ flight: true }));
        if (parts2 === parts3)
            return { ok: false, fail: `flight not required` };
        return OK;
    }
}
export class OasisCaveShuffle extends RiverCaveShuffle {
    constructor() {
        super(...arguments);
        this.pattern = [
            '               ',
            ' rrrrrrrrrrrrr ',
            ' r           r ',
            ' r rrrrrrrrr r ',
            ' r r       r r ',
            ' r r rrrrr r r ',
            ' r r r   r r r ',
            ' r r r   r r r ',
            ' r r r   r r r ',
            ' r r r < r r r ',
            ' r r r c r r r ',
            ' r r rrrrr r r ',
            ' r r       r r ',
            ' r rrrrrrrrr r ',
            ' r           r ',
            ' rrrrrrrrrrrrr ',
            '               ',
        ];
    }
    initialFill() {
        return this.insertPattern(this.pattern);
    }
    addEdges() {
        let corner;
        for (let i = 0; i < this.grid.data.length; i++) {
            if (this.grid.data[i] === 'r') {
                corner = this.grid.coord(i) - 0x808;
                break;
            }
        }
        if (corner == null)
            throw new Error(`no corner`);
        const edges = [];
        for (let y = 0; y < this.pattern.length; y++) {
            for (let x = 1; x < this.pattern[y].length - 1; x++) {
                if (!((x ^ y) & 1))
                    continue;
                if (this.pattern[y][x] !== ' ')
                    continue;
                edges.push(corner + (y << 11 | x << 3));
            }
        }
        let chars = this.random.shuffle([...'ccrrrrrrrr']);
        for (const edge of this.random.ishuffle(edges)) {
            const char = chars[chars.length - 1];
            if (char === 'c' &&
                [...this.extract(this.grid, edge - 0x808)]
                    .filter(v => v === 'r').length < 4) {
                continue;
            }
            if (this.canSet(edge, char))
                this.grid.set(edge, chars.pop());
            if (!chars.length)
                break;
        }
        for (let i = 0; i < 6; i++) {
            this.tryAdd({ char: 'c' });
        }
        return OK;
    }
    refine() {
        var _a;
        const stairs = [...((_a = this.params.stairs) !== null && _a !== void 0 ? _a : [])];
        stairs[0]--;
        if (stairs[0] || stairs[1]) {
            const result = this.addStairs(...stairs);
            if (!result.ok)
                return result;
        }
        let deadEnds = 0;
        for (const s of this.random.ishuffle(this.grid.screens())) {
            if (this.extract(this.grid, s).replace(/ /g, '') === 'c') {
                if (stairs[0] && !this.grid.get(s + 8)) {
                    this.grid.set(s + 0x808, '<');
                    stairs[0]--;
                }
                this.fixed.add(s + 0x808);
                if (++deadEnds >= 2)
                    break;
            }
        }
        const parts = this.grid.partition();
        if (new Set(parts.values()).size > 1)
            return { ok: false, fail: `orphans` };
        return OK;
    }
    fillGrid() {
        let result;
        if ((result = this.initialFill()), !result.ok)
            return result;
        if ((result = this.addEdges()), !result.ok)
            return result;
        if ((result = this.refine()), !result.ok)
            return result;
        return OK;
    }
    checkMeta(meta, rep) {
        const parts = meta.traverse(rep ? { with: rep } : {});
        const allStairs = [];
        for (const edges of new Set(parts.values())) {
            let stairs = 0;
            for (const edge of new Set([...edges])) {
                if (meta.exitType(edge))
                    stairs++;
            }
            allStairs.push(stairs);
        }
        return allStairs.filter(s => s > 0).length === 1;
    }
    refineMetascreens(meta) {
        if (!this.checkMeta(meta))
            return { ok: false, fail: `initial checkMeta` };
        const result = super.refineMetascreens(meta);
        if (!result.ok)
            return result;
        function accessible(map) {
            let count = 0;
            for (const set of new Set(map.values())) {
                for (const edge of set) {
                    if (meta.exitType(edge)) {
                        count += set.size;
                        break;
                    }
                }
            }
            return count;
        }
        const parts1 = accessible(meta.traverse());
        const parts2 = accessible(meta.traverse({ flight: true }));
        if (parts1 === parts2)
            return { ok: false, fail: `flight not required` };
        return OK;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicml2ZXJjYXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL21hemUvcml2ZXJjYXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDeEMsT0FBTyxFQUF3QixDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ2pELE9BQU8sRUFBVSxFQUFFLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFHdkMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3BELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNyQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXhDLE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxtQkFBbUI7SUFBekQ7O1FBWUUsVUFBSyxHQUFHLEdBQUcsQ0FBQztRQUNaLGdCQUFXLEdBQUcsR0FBRyxDQUFDO0lBNkhwQixDQUFDO0lBMUhDLFdBQVcsaUJBQUssbUJBQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLDBDQUFFLEtBQUssbUNBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQTJDMUQsUUFBUTtRQUVOLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUFFLE9BQU8sRUFBRSxDQUFDO1FBQ2pELE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUFxQixDQUFDO1FBQzlDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBYyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDM0QsSUFBSSxJQUFJLENBQUMsSUFBSSxD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QU0sRUFBRSxDQUFDLEVBQUU7Z0JBQ3ZDLEtBQUssTUFBTSxJQUFJLElBQUksR0FBRyxFQUFFO29CQUN0QixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQ3ZCLEtBQUssSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDO3dCQUNsQixNQUFNO3FCQUNQO2lCQUNGO2FBQ0Y7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDM0MsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pELElBQUksTUFBTSxLQUFLLE1BQU07WUFBRSxPQUFPLEVBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUscUJBQXFCLEVBQUMsQ0FBQztRQUV2RSxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENhdmVTaHVmZmxlIH0gZnJvbSAnLi9jYXZlLmpzJztcbmltcG9ydCB7IEdyaWRDb29yZCwgR3JpZEluZGV4LCBOLCBTIH0gZnJvbSAnLi9ncmlkLmpzJztcbmltcG9ydCB7IE1vbm9ncmlkLCBDdXJzb3IgfSBmcm9tICcuL21vbm9ncmlkLmpzJztcbmltcG9ydCB7IFJlc3VsdCwgT0sgfSBmcm9tICcuL21hemUuanMnO1xuaW1wb3J0IHsgTWV0YWxvY2F0aW9uLCBQb3MgfSBmcm9tICcuLi9yb20vbWV0YWxvY2F0aW9uLmpzJztcbmltcG9ydCB7IE1ldGFzY3JlZW4gfSBmcm9tICcuLi9yb20vbWV0YXNjcmVlbi5qcyc7XG5pbXBvcnQgeyBUd29TdGFnZUNhdmVTaHVmZmxlIH0gZnJvbSAnLi90d29zdGFnZS5qcyc7XG5pbXBvcnQgeyBzZXEgfSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQgeyBEZWZhdWx0TWFwIH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbmV4cG9ydCBjbGFzcyBSaXZlckNhdmVTaHVmZmxlIGV4dGVuZHMgVHdvU3RhZ2VDYXZlU2h1ZmZsZSB7XG4gIC8vIGJhc2ljIHByb2JsZW06IG1pc3NpbmcgfC0gYW5kIC18IHBpZWNlcy5cbiAgLy8gIG9uZSBzb2x1dGlvbiB3b3VsZCBiZSB0byBqdXN0IGFkZCB0aGVtXG4gIC8vICBvdXRzaWRlIG9mIHRoYXQsIHdlIG5lZWQgdG8gc3dpdGNoIHRvIGEgcGF0aGdlbiBhbGdvIHJhdGhlclxuICAvLyAgdGhhbiByZWZpbmVtZW50XG5cbiAgLy8gc2ltcGxlIHBhdGhnZW4gc2hvdWxkIGJlIHByZXR0eSBlYXN5IHcvIGdyaWRcblxuICAvLyBhbHRlcm5hdGl2ZWx5LCB0cmlhbCByZW1vdmFscyBhcmUgZnVydGhlci1yZWFjaGluZz9cbiAgLy8gIC0gaWYgd2UgcmVtb3ZlIGEgaG9yaXpvbnRhbCBlZGdlIHRoZW4gYWxzbyByZW1vdmUgdGhlXG4gIC8vICAgIG9wcG9zaXRlIGVkZ2VzIG9mIGFueSBuZWlnaGJvcnMsIGNvbnRpbnVpbmcuXG4gIC8vICAtIG9yIHJlbW92ZSBhIHZlcnRpY2FsIGVkZ2Ugb2Ygb25lLi4uP1xuICBlYXJseSA9ICdyJztcbiAgbWF4QXR0ZW1wdHMgPSAyNTA7XG4gIHZhbGlkUml2ZXJTY3JlZW5zPzogU2V0PG51bWJlcj47XG5cbiAgdGFyZ2V0RWFybHkoKSB7IHJldHVybiB0aGlzLnBhcmFtcy5mZWF0dXJlcz8ucml2ZXIgPz8gMDsgfVxuXG4gIC8vIGFkZEVhcmx5RmVhdHVyZXMoKTogUmVzdWx0PHZvaWQ+IHtcbiAgLy8gICAvLyBmaWxsIHdpdGggcml2ZXIgYW5kIHRoZW4gcmVmaW5lIGRvd24gdG8gdGhlIGNvcnJlY3Qgc2l6ZS5cbiAgLy8gICAvL3RoaXMuZmlsbENhdmUoXG4gIC8vICAgcmV0dXJuXG4gIC8vIH1cblxuICAvLyBjYW5SZW1vdmUoYzogc3RyaW5nKSB7XG4gIC8vICAgcmV0dXJuIGMgPT09ICdjJyB8fCBjID09PSAncic7XG4gIC8vIH1cblxuICAvLyByZW1vdmFsTWFwKGNvb3JkOiBHcmlkQ29vcmQpOiBNYXA8R3JpZENvb3JkLCBzdHJpbmc+IHtcbiAgLy8gICBpZiAoKGNvb3JkICYgMHg4MDgpICE9PSAweDgwMCkgcmV0dXJuIG5ldyBNYXAoW1tjb29yZCwgJyddXSk7XG4gIC8vICAgLy8gbmVlZCB0byBiZSBhIGxpdHRsZSBjbGV2ZXJlcjogaG9yaXpvbnRhbCBicmFuY2hlcyBhcmUgbm90XG4gIC8vICAgLy8gYWxsb3dlZCAodGhvdWdoIHdlIGNvdWxkIGFkZCB0aGVtLCBpbiB3aGljaCBjYXNlIHRoaXMgZ2V0c1xuICAvLyAgIC8vIGEgbG90IGVhc2llciksIHNvIGVuc3VyZSB3ZSdyZSBsZWZ0IHdpdGggYSBiZW5kIGluc3RlYWQuXG4gIC8vICAgY29uc3QgbWFwID0gbmV3IE1hcChbW2Nvb3JkLCAnJ11dKTtcbiAgLy8gICBjb25zdCBsZWZ0ID0gY29vcmQgLSA4IGFzIEdyaWRDb29yZDtcbiAgLy8gICBpZiAodGhpcy5ncmlkLmdldChsZWZ0KSA9PT0gJ3InKSB7XG4gIC8vICAgICBjb25zdCBsZWZ0VXAgPSBsZWZ0IC0gMHg4MDAgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdERvd24gPSBsZWZ0ICsgMHg4MDAgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdExlZnQgPSBsZWZ0IC0gOCBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICAvLyBtYXkgbmVlZCB0byByZW1vdmUgYW5vdGhlciBuZWlnaGJvci5cbiAgLy8gICAgIGlmICh0aGlzLmdyaWQuZ2V0KGxlZnRVcCkgPT09ICdyJyAmJiB0aGlzLmdyaWQuZ2V0KGxlZnREb3duKSA9PT0gJ3InICYmXG4gIC8vICAgICAgICAgdGhpcy5ncmlkLmdldChsZWZ0TGVmdCkgPT09ICdyJykge1xuICAvLyAgICAgICBtYXAuc2V0KHRoaXMucmFuZG9tLm5leHRJbnQoMikgPyBsZWZ0VXAgOiBsZWZ0RG93biwgJycpO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICBjb25zdCByaWdodCA9IGNvb3JkICsgOCBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgaWYgKHRoaXMuZ3JpZC5nZXQocmlnaHQpID09PSAncicpIHtcbiAgLy8gICAgIGNvbnN0IHJpZ2h0VXAgPSByaWdodCAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IHJpZ2h0RG93biA9IHJpZ2h0ICsgMHg4MDAgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHRSaWdodCA9IHJpZ2h0ICsgOCBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICAvLyBtYXkgbmVlZCB0byByZW1vdmUgYW5vdGhlciBuZWlnaGJvci5cbiAgLy8gICAgIGlmICh0aGlzLmdyaWQuZ2V0KHJpZ2h0VXApID09PSAncicgJiYgdGhpcy5ncmlkLmdldChyaWdodERvd24pID09PSAncicgJiZcbiAgLy8gICAgICAgICB0aGlzLmdyaWQuZ2V0KHJpZ2h0UmlnaHQpID09PSAncicpIHtcbiAgLy8gICAgICAgbWFwLnNldCh0aGlzLnJhbmRvbS5uZXh0SW50KDIpID8gcmlnaHRVcCA6IHJpZ2h0RG93biwgJycpO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gbWFwO1xuICAvLyB9XG5cbiAgcHJlaW5mZXIoKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBNYWtlIHN1cmUgcml2ZXIgaXMgYWN0dWFsbHkgbmVjZXNzYXJ5IVxuICAgIGlmIChbLi4udGhpcy5vcmlnLmV4aXRzKCldLmxlbmd0aCA8IDIpIHJldHVybiBPSztcbiAgICBjb25zdCBvdmVycmlkZSA9IG5ldyBNYXA8R3JpZENvb3JkLCBzdHJpbmc+KCk7XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgR3JpZEluZGV4OyBpIDwgdGhpcy5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLmdyaWQuZGF0YVtpXSA9PT0gJ3InKSBvdmVycmlkZS5zZXQodGhpcy5ncmlkLmNvb3JkKGkpLCAnJyk7XG4gICAgfVxuICAgIGNvbnN0IHBhcnRzID0gdGhpcy5ncmlkLnBhcnRpdGlvbihvdmVycmlkZSk7XG4gICAgY29uc3Qgc3RhaXJQYXJ0czogdW5rbm93bltdID0gW107XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgR3JpZEluZGV4OyBpIDwgdGhpcy5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLmdyaWQuZGF0YVtpXSA9PT0gJzwnIHx8IHRoaXMuZ3JpZC5kYXRhW2ldID09PSAnPicgfHxcbiAgICAgICAgICAodGhpcy5ncmlkLmRhdGFbaV0gJiYgdGhpcy5ncmlkLmlzQm9yZGVyKHRoaXMuZ3JpZC5jb29yZChpKSkpKSB7XG4gICAgICAgIHN0YWlyUGFydHMucHVzaChwYXJ0cy5nZXQodGhpcy5ncmlkLmNvb3JkKGkpKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChuZXcgU2V0KHN0YWlyUGFydHMpLnNpemUgPCBzdGFpclBhcnRzLmxlbmd0aCkge1xuICAgICAgLy9jb25zb2xlLmVycm9yKHRoaXMuZ3JpZC5zaG93KCkpO1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGByaXZlciBkaWRuJ3QgbWF0dGVyXFxuJHt0aGlzLmdyaWQuc2hvdygpfWB9O1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIucHJlaW5mZXIoKTtcbiAgfVxuXG4gIGFkZExhdGVGZWF0dXJlcygpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IodGhpcy5ncmlkLnNob3coKSk7XG4gICAgLy8gcmV0dXJuIHN1cGVyLmFkZExhdGVGZWF0dXJlcygpO1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGFkZEFyZW5hcyhhcmVuYXM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIC8vIFRoaXMgdmVyc2lvbiB3b3JrcyBhIGxpdHRsZSBkaWZmZXJlbnRseSwgc2luY2UgaXQgcnVucyBhcyBhbiBlYXJseVxuICAgIC8vIGZlYXR1cmUgKGJlZm9yZSByZWZpbmVtZW50KSByYXRoZXIgdGhhbiBsYXRlLiAgV2UgbG9vayBmb3IgYSAzeDFcbiAgICAvLyBibG9jayBvZiAnYycgc2NyZWVucywgemVybyBvdXQgYWxsIGJ1dCB0aGUgbWlkZGxlICh3aGljaCBnZXRzIHRoZVxuICAgIC8vIGFyZW5hKSwgYW5kIHRoZW4gYWZ0ZXJ3YXJkcyB3ZSBwcnVuZSBhd2F5IGFueSBuZXdseS1kaXNjb25uZWN0ZWRcbiAgICAvLyBsYW5kIHNjcmVlbnMuXG4gICAgaWYgKCFhcmVuYXMpIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IGcgPSB0aGlzLmdyaWQ7XG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gICAgICBjb25zdCBtaWRkbGUgPSAoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCBsZWZ0ID0gKG1pZGRsZSAtIDgpIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IGxlZnQyID0gKGxlZnQgLSA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCByaWdodCA9IChtaWRkbGUgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCByaWdodDIgPSAocmlnaHQgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCB1cCA9IG1pZGRsZSAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IGRvd24gPSBtaWRkbGUgKyAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAoZy5nZXQobWlkZGxlKSAhPT0gJ2MnKSBjb250aW51ZTtcbiAgICAgIGlmIChnLmdldCh1cCkgIT09ICdjJykgY29udGludWU7XG4gICAgICBpZiAoZy5nZXQoZG93bikgIT09ICdjJykgY29udGludWU7XG4gICAgICBjb25zdCBsZWZ0VGlsZSA9XG4gICAgICAgICAgZy5pc0JvcmRlcihsZWZ0KSA/ICcnIDogdGhpcy5leHRyYWN0KGcsIGxlZnQyIC0gMHg4MDggYXMgR3JpZENvb3JkKTtcbiAgICAgIGNvbnN0IHJpZ2h0VGlsZSA9XG4gICAgICAgICAgZy5pc0JvcmRlcihyaWdodCkgPyAnJyA6IHRoaXMuZXh0cmFjdChnLCByaWdodDIgLSAweDgwOCBhcyBHcmlkQ29vcmQpO1xuICAgICAgaWYgKC9bXiBjXS8udGVzdChsZWZ0VGlsZSArIHJpZ2h0VGlsZSkpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFnLmlzQm9yZGVyKGxlZnQpKSB7XG4gICAgICAgIGcuc2V0KGxlZnQsICcnKTtcbiAgICAgICAgZy5zZXQobGVmdDIsICcnKTtcbiAgICAgICAgZy5zZXQobGVmdDIgLSA4IGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgICBnLnNldChsZWZ0MiAtIDB4ODAwIGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgICBnLnNldChsZWZ0MiArIDB4ODAwIGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgfVxuICAgICAgaWYgKCFnLmlzQm9yZGVyKHJpZ2h0KSkge1xuICAgICAgICBnLnNldChyaWdodCwgJycpO1xuICAgICAgICBnLnNldChyaWdodDIsICcnKTtcbiAgICAgICAgZy5zZXQocmlnaHQyICsgOCBhcyBHcmlkQ29vcmQsICcnKTtcbiAgICAgICAgZy5zZXQocmlnaHQyIC0gMHg4MDAgYXMgR3JpZENvb3JkLCAnJyk7XG4gICAgICAgIGcuc2V0KHJpZ2h0MiArIDB4ODAwIGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgfVxuICAgICAgdGhpcy5maXhlZC5hZGQobWlkZGxlKTtcbiAgICAgIHRoaXMuZml4ZWQuYWRkKHVwKTtcbiAgICAgIHRoaXMuZml4ZWQuYWRkKGRvd24pO1xuICAgICAgZy5zZXQobWlkZGxlLCAnYScpO1xuICAgICAgYXJlbmFzLS07XG4gICAgICBpZiAoIWFyZW5hcykge1xuICAgICAgICB0aGlzLnBydW5lRGlzY29ubmVjdGVkKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICAvL2NvbnNvbGUuZXJyb3IoJ2NvdWxkIG5vdCBhZGQgYXJlbmEnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFdhdGVyZmFsbFJpdmVyQ2F2ZVNodWZmbGUgZXh0ZW5kcyBSaXZlckNhdmVTaHVmZmxlIHtcblxuICBhZGRCbG9ja3MgPSBmYWxzZTtcblxuICBpbml0aWFsRmlsbEVhcmx5KCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgY29uc3QgZyA9IG5ldyBNb25vZ3JpZCh0aGlzLmgsIHRoaXMudywgdGhpcy5nZXRWYWxpZEVhcmx5U2NyZWVucygpKTtcbiAgICBjb25zdCB4MCA9IDIgKyB0aGlzLnJhbmRvbS5uZXh0SW50KHRoaXMudyAtIDQpO1xuICAgIGNvbnN0IHgxID0gMiArIHRoaXMucmFuZG9tLm5leHRJbnQodGhpcy53IC0gNCk7XG4gICAgY29uc3QgYyA9IG5ldyBDdXJzb3IoZywgdGhpcy5oIC0gMSwgeDEpO1xuICAgIGMuZ28oMCk7XG4gICAgYy5kaXJlY3RlZFBhdGgodGhpcy5yYW5kb20sIDEsIHgwKTtcbiAgICBjLmdvKDApO1xuXG4gICAgdGhpcy5ncmlkLmRhdGEgPSBnLnRvR3JpZCgncicpLmRhdGE7XG4gICAgdGhpcy5hZGRBbGxGaXhlZCgpO1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGFkZEVkZ2VzKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgbGV0IHIgPSAtMTtcbiAgICBjb25zdCBoID0gKHRoaXMuaCAtIDEpIDw8IDEyIHwgMHg4MDg7XG4gICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLnc7IHgrKykge1xuICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQoKGggfCAoeCA8PCA0KSkgYXMgR3JpZENvb3JkKSA9PT0gJ3InKSByID0geDtcbiAgICB9XG4gICAgaWYgKHIgPCAwKSB0aHJvdyBuZXcgRXJyb3IoYG5vIHJpdmVyIG9uIGJvdHRvbSBlZGdlYCk7XG4gICAgY29uc3QgYzAgPSAoaCB8IHRoaXMucmFuZG9tLm5leHRJbnQocikgPDwgNCkgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGMxID1cbiAgICAgICAgKGggfCAociArIDEgKyB0aGlzLnJhbmRvbS5uZXh0SW50KHRoaXMudyAtIDEgLSByKSkgPDwgNCkgYXMgR3JpZENvb3JkO1xuICAgIHRoaXMuZ3JpZC5zZXQoYzAsICc+Jyk7XG4gICAgdGhpcy5ncmlkLnNldChjMCAtIDggYXMgR3JpZENvb3JkLCAnJyk7XG4gICAgdGhpcy5ncmlkLnNldChjMCArIDggYXMgR3JpZENvb3JkLCAnJyk7XG4gICAgdGhpcy5ncmlkLnNldChjMSwgJz4nKTtcbiAgICB0aGlzLmdyaWQuc2V0KGMxIC0gOCBhcyBHcmlkQ29vcmQsICcnKTtcbiAgICB0aGlzLmdyaWQuc2V0KGMxICsgOCBhcyBHcmlkQ29vcmQsICcnKTtcbiAgICB0aGlzLmZpeGVkLmFkZChjMCk7XG4gICAgdGhpcy5maXhlZC5hZGQoYzEpO1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGFkZFN0YWlycygpOiBSZXN1bHQ8dm9pZD4geyByZXR1cm4gT0s7IH1cblxuICBjaGVja01ldGEobWV0YTogTWV0YWxvY2F0aW9uLCByZXBsPzogTWFwPFBvcywgTWV0YXNjcmVlbj4pOiBib29sZWFuIHtcbiAgICBjb25zdCBvcHRzID0gcmVwbCA/IHtmbGlnaHQ6IHRydWUsIHdpdGg6IHJlcGx9IDoge2ZsaWdodDogdHJ1ZX07XG4gICAgY29uc3QgcGFydHMgPSBtZXRhLnRyYXZlcnNlKG9wdHMpO1xuICAgIHJldHVybiBuZXcgU2V0KHBhcnRzLnZhbHVlcygpKS5zaXplID09PSB0aGlzLm1heFBhcnRpdGlvbnM7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIE9hc2lzRW50cmFuY2VDYXZlU2h1ZmZsZSBleHRlbmRzIENhdmVTaHVmZmxlIHtcblxuICBhZGRCbG9ja3MgPSBmYWxzZTtcblxuICAvLyBuZXcgcGxhbjogaW5kZXggdmFsaWQgc3Bpa2Ugc2NyZWVucywgYWNjcmV0ZSBhIGxpbmUvY3VydmUgb2YgdGhlbVxuICAvLyBzb21ld2hlcmUgcmFuZG9tIChjb25zaWRlciBhZGRpbmcgc3Bpa2UgY3VydmVzPyksIHdpdGggcmFuZG9tIGNhdmVzXG4gIC8vIHN0aWNraW5nIG91dC4gIENhcCB0aGUgZW5kIG9mIHRoZSBzcGlrZSBhbmQgYWNjcmV0ZSBhIHJhbmRvbSByaXZlclxuICAvLyBzb21ld2hlcmUgKG1heSBuZWVkIHRvIGluY3JlYXNlIHdpZHRoKS4gIFRoZW4gYWNjcmV0ZSBjYXZlcywgZmlsbFxuICAvLyBpbiBzdGFpcnMsIGV0Yy5cblxuICBwaWNrV2lkdGgoKSB7XG4gICAgcmV0dXJuIHN1cGVyLnBpY2tXaWR0aCgpICsgdGhpcy5yYW5kb20ubmV4dEludCgyKTtcbiAgfVxuXG4gIGluaXRpYWxGaWxsKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gbXVsdGltYXAgb2YgZGlyZWN0aW9uIG1hc2tzIHRvIHRpbGUgc3RyaW5ncy5cbiAgICBjb25zdCBzcGlrZXMgPSBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIHN0cmluZ1tdPigoKSA9PiBbXSk7XG4gICAgZm9yIChjb25zdCBzY3Igb2YgdGhpcy5vcmlnLnRpbGVzZXQpIHtcbiAgICAgIGlmICghc2NyLmhhc0ZlYXR1cmUoJ3NwaWtlcycpIHx8ICFzY3IuZGF0YS5lZGdlcykgY29udGludWU7XG4gICAgICBsZXQgbWFzayA9IDA7XG4gICAgICBmb3IgKGxldCBkaXIgPSAwOyBkaXIgPCA0OyBkaXIrKykge1xuICAgICAgICBpZiAoc2NyLmRhdGEuZWRnZXNbZGlyXSA9PT0gJ3MnKSBtYXNrIHw9ICgxIDw8IGRpcik7XG4gICAgICB9XG4gICAgICBzcGlrZXMuZ2V0KG1hc2spLnB1c2goLi4uc2NyLmdyaWRUaWxlcygpKTtcbiAgICB9XG4gICAgLy8gc3RhcnQgYWNjcmV0aW5nLlxuICAgIGNvbnN0IHggPSAxICsgdGhpcy5yYW5kb20ubmV4dEludCh0aGlzLncgLSAyKTtcbiAgICBjb25zdCB5ID0gMSArIHRoaXMucmFuZG9tLm5leHRJbnQodGhpcy5oIC0gMik7XG4gICAgbGV0IHBvcyA9IHkgPDwgNCB8IHg7XG4gICAgbGV0IGMgPSB0aGlzLnBvc1RvR3JpZChwb3MsIDB4ODA4KTtcbiAgICBsZXQgZGlyID0geSA8IHRoaXMuaCAvIDIgPyAyIDogMDtcbiAgICB0aGlzLmluc2VydFRpbGUocG9zLCB0aGlzLnJhbmRvbS5waWNrKHNwaWtlcy5nZXQoMSA8PCBkaXIpKSk7XG4gICAgZm9yIChsZXQgaSA9IDQ7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAvLyBhZHZhbmNlIHRoZSBwb3NpdGlvbi5cbiAgICAgIHBvcyArPSBEUE9TW2Rpcl07XG4gICAgICBjID0gYyArIERHUklEW2Rpcl0gYXMgR3JpZENvb3JkO1xuICAgICAgY29uc3Qgb3BwID0gZGlyIF4gMjtcbiAgICAgIGNvbnN0IG1hc2tzOiBudW1iZXJbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBbZCwgdHNdIG9mIHNwaWtlcykge1xuICAgICAgICBpZiAoIShkICYgKDEgPDwgb3BwKSkpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCByZW0gPSBkICYgfigxIDw8IG9wcCk7XG4gICAgICAgIGlmIChpID8gIXJlbSA6IHJlbSkgY29udGludWU7XG4gICAgICAgIGZvciAoY29uc3QgXyBvZiB0cykgbWFza3MucHVzaChkKTtcbiAgICAgIH1cbiAgICAgIGxldCBuZXh0RGlyOiBudW1iZXJ8dW5kZWZpbmVkO1xuICAgICAgZm9yIChjb25zdCBkIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKG1hc2tzKSkge1xuICAgICAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKGMgKyBER1JJRFtkXSBhcyBHcmlkQ29vcmQpKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHRoaXMuaW5zZXJ0VGlsZShwb3MsIHRoaXMucmFuZG9tLnBpY2soc3Bpa2VzLmdldChkKSkpKSB7XG4gICAgICAgICAgbmV4dERpciA9IDMxIC0gTWF0aC5jbHozMihkICYgfigxIDw8IG9wcCkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobmV4dERpciA9PSBudWxsKSByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYHNwaWtlc2B9O1xuICAgICAgZGlyID0gbmV4dERpcjtcbiAgICB9XG5cbiAgICAvLyBOb3cgYWRkIHNvbWUgcml2ZXIgdGlsZXMuXG4gICAgY29uc3Qgcml2ZXJTdGFydDogR3JpZENvb3JkW10gPSBbXTtcbiAgICBmb3IgKGxldCB5ID0gMzsgeSA8IHRoaXMuaCAtIDM7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDE7IHggPCB0aGlzLncgLSAxOyB4KyspIHtcbiAgICAgICAgcml2ZXJTdGFydC5wdXNoKCh5IDw8IDEyIHwgeCA8PCA0IHwgMHg4MDgpIGFzIEdyaWRDb29yZCk7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShyaXZlclN0YXJ0KSkge1xuICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQoYykpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBkIG9mIERHUklEKSB7XG4gICAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KGMgKyBkIGFzIEdyaWRDb29yZCkgIT09ICdjJykgY29udGludWU7XG4gICAgICAgIHRoaXMuZ3JpZC5zZXQoYywgJ3InKTtcbiAgICAgICAgY29uc3Qgb3J0aG9nb25hbCA9IDB4ODA4ICYgfk1hdGguYWJzKGQpO1xuICAgICAgICB0aGlzLmdyaWQuc2V0KGMgKyBvcnRob2dvbmFsIGFzIEdyaWRDb29yZCwgJ3InKTtcbiAgICAgICAgdGhpcy5ncmlkLnNldChjIC0gb3J0aG9nb25hbCBhcyBHcmlkQ29vcmQsICdyJyk7XG4gICAgICAgIGNvbnN0IG8gPSB0aGlzLnJhbmRvbS5waWNrKFstb3J0aG9nb25hbCwgb3J0aG9nb25hbF0pO1xuICAgICAgICB0aGlzLmdyaWQuc2V0KGMgKyAyICogbyBhcyBHcmlkQ29vcmQsICdyJyk7XG4gICAgICAgIHRoaXMuZ3JpZC5zZXQoYyArIDMgKiBvIGFzIEdyaWRDb29yZCwgJ3InKTtcbiAgICAgICAgdGhpcy5ncmlkLnNldChjICsgMiAqIG8gLSBkIGFzIEdyaWRDb29yZCwgJ2MnKTtcbiAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChmb3VuZCkgYnJlYWs7XG4gICAgfVxuICAgIGlmICghZm91bmQpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgbnVjbGVhdGUgcml2ZXJgfTtcblxuICAgIC8vIGxldCBhdHRlbXB0cyA9IDEwO1xuICAgIC8vIGZvciAobGV0IGkgPSAyICsgdGhpcy5yYW5kb20ubmV4dEludCgyKTsgaSA+IDAgJiYgYXR0ZW1wdHM7IGktLSkge1xuICAgIC8vICAgaWYgKCF0aGlzLnRyeUFkZCh7Y2hhcjogJ3InfSkpIChhdHRlbXB0cy0tLCBpKyspO1xuICAgIC8vIH1cbiAgICAvLyBpZiAoIWF0dGVtcHRzKSByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGFjY3JldGUgcml2ZXJgfTtcblxuICAgIC8vIEZpbmFsbHkgYWRkIHNvbWUgY2F2ZSB0aWxlcy5cbiAgICBmb3IgKGxldCBpID0gNSArIHRoaXMucmFuZG9tLm5leHRJbnQoMyk7IGkgPiAwOyBpLS0pIHtcbiAgICAgIGlmICghdGhpcy50cnlBZGQoe2NoYXI6ICdjJ30pKSByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGZpbGwgY2F2ZWB9O1xuICAgIH1cblxuICAgIC8vIE1ha2Ugc3VyZSB0aGVyZSdzIG5vdGhpbmcgb24gdGhlIGJvcmRlci5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZ3JpZC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5ncmlkLmRhdGFbaV0gJiYgdGhpcy5ncmlkLmlzQm9yZGVyKHRoaXMuZ3JpZC5jb29yZChpIGFzIEdyaWRJbmRleCkpKSB7XG4gICAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgYm9yZGVyYH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgY2hlY2tNZXRhKG1ldGE6IE1ldGFsb2NhdGlvbiwgcmVwbD86IE1hcDxQb3MsIE1ldGFzY3JlZW4+KTogYm9vbGVhbiB7XG4gICAgLy8gVE9ETyAtIHJlbGV2YW5jZSByZXF1aXJlbWVudD9cbiAgICBjb25zdCBvcHRzID0gcmVwbCA/IHtmbGlnaHQ6IHRydWUsIHdpdGg6IHJlcGx9IDoge2ZsaWdodDogdHJ1ZX07XG4gICAgY29uc3QgcGFydHMgPSBtZXRhLnRyYXZlcnNlKG9wdHMpO1xuICAgIHJldHVybiBuZXcgU2V0KHBhcnRzLnZhbHVlcygpKS5zaXplID09PSB0aGlzLm1heFBhcnRpdGlvbnM7XG4gIH1cblxuICByZWZpbmUoKSB7IHJldHVybiBPSzsgfVxuICByZWZpbmVFZGdlcygpIHsgcmV0dXJuIHRydWU7IH1cblxuICBhZGRTcGlrZXMoc3Bpa2VzOiBudW1iZXIpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgICAvLyBmb3IgKGNvbnN0IHMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUodGhpcy5ncmlkLnNjcmVlbnMoKSkpIHtcbiAgICAvLyAgIGNvbnN0IGMgPSBzICsgMHg4MDggYXMgR3JpZENvb3JkO1xuICAgIC8vICAgaWYgKHRoaXMuZ3JpZC5nZXQoYykgIT09ICdyJykgY29udGludWU7XG4gICAgLy8gICBmb3IgKGNvbnN0IGRpciBvZiBbMHg4MDAsIC0weDgwMF0pIHtcbiAgICAvLyAgICAgaWYgKHRoaXMuZ3JpZC5nZXQoYyArIGRpciBhcyBHcmlkQ29vcmQpICE9PSAnYycpIGNvbnRpbnVlO1xuICAgIC8vICAgICBsZXQgXG4gICAgLy8gfVxuICB9XG5cbiAgcmVmaW5lTWV0YXNjcmVlbnMobWV0YTogTWV0YWxvY2F0aW9uKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBzdXBlci5yZWZpbmVNZXRhc2NyZWVucyhtZXRhKTtcbiAgICBpZiAoIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICAvLyBSZXF1aXJlIHRoYXQgZmxpZ2h0IGJsb2NrcyBhdCBsZWFzdCBvbmUgc3RhaXIuXG4gICAgZnVuY3Rpb24gYWNjZXNzaWJsZShtYXA6IE1hcDxudW1iZXIsIFNldDxudW1iZXI+Pik6IG51bWJlciB7XG4gICAgICBjb25zdCBzdGFpclBhcnRzID1cbiAgICAgICAgICBbLi4ubmV3IFNldChtYXAudmFsdWVzKCkpXS5maWx0ZXIoc2V0ID0+IHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qgc3RhaXIgb2Ygc2V0KSB7XG4gICAgICAgICAgICAgIGlmIChtZXRhLmV4aXRUeXBlKHN0YWlyKT8uc3RhcnRzV2l0aCgnc3RhaXInKSkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfSk7XG4gICAgICByZXR1cm4gc3RhaXJQYXJ0cy5sZW5ndGg7XG4gICAgfVxuICAgIGNvbnN0IHBhcnRzMSA9IGFjY2Vzc2libGUobWV0YS50cmF2ZXJzZSgpKTtcbiAgICBjb25zdCBwYXJ0czIgPSBhY2Nlc3NpYmxlKG1ldGEudHJhdmVyc2Uoe2ZsaWdodDogdHJ1ZX0pKTtcbiAgICBpZiAocGFydHMxID09PSBwYXJ0czIpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgZmxpZ2h0IG5vdCByZXF1aXJlZGB9O1xuICAgIHJldHVybiBPSztcbiAgfVxufVxuXG5jb25zdCBER1JJRCA9IFstMHg4MDAsIC04LCAweDgwMCwgOF07XG5jb25zdCBEUE9TID0gWy0xNiwgLTEsIDE2LCAxXTtcblxuZXhwb3J0IGNsYXNzIFN0eXhSaXZlckNhdmVTaHVmZmxlIGV4dGVuZHMgUml2ZXJDYXZlU2h1ZmZsZSB7XG4gIGFkZEJsb2NrcyA9IGZhbHNlO1xuXG4gIGZpbGxHcmlkKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gbWFrZSAyIGJvdHRvbSBlZGdlIGV4aXRzXG4gICAgY29uc3QgZWRnZXM6IG51bWJlcltdID0gW107XG4gICAgbGV0IHNpemUgPSAwO1xuICAgIGZvciAoY29uc3QgeCBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShzZXEodGhpcy53IC0gMiwgeCA9PiB4ICsgMSkpKSB7XG4gICAgICBpZiAoZWRnZXMubGVuZ3RoID09PSAxICYmICh4IC0gZWRnZXNbMF0pICoqIDIgPD0gMSkgY29udGludWU7XG4gICAgICBjb25zdCBjID0gKCh0aGlzLmggLSAxKSA8PCAxMiB8IHggPDwgNCB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICB0aGlzLmdyaWQuc2V0KGMsICdjJyk7XG4gICAgICB0aGlzLmdyaWQuc2V0KE4oYyksICdjJyk7XG4gICAgICB0aGlzLmdyaWQuc2V0KFMoYyksICduJyk7XG4gICAgICB0aGlzLmZpeGVkLmFkZChjKTtcbiAgICAgIHRoaXMuZml4ZWQuYWRkKE4oYykpO1xuICAgICAgdGhpcy5maXhlZC5hZGQoUyhjKSk7XG4gICAgICBlZGdlcy5wdXNoKHgpO1xuICAgICAgc2l6ZSsrO1xuICAgICAgaWYgKGVkZ2VzLmxlbmd0aCA9PT0gMikgYnJlYWs7XG4gICAgfVxuICAgIGlmIChlZGdlcy5sZW5ndGggPCAyKSByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGluaXRpYWwgZWRnZXNgfTtcbiAgICAvLyBtYWtlIGEgcml2ZXIgYWNyb3NzIHRoZSBib3R0b20uXG4gICAgbGV0IHJpdmVycyA9IHRoaXMudztcbiAgICBjb25zdCBjdXQgPVxuICAgICAgICB0aGlzLnJhbmRvbS5uZXh0SW50KE1hdGguYWJzKGVkZ2VzWzBdIC0gZWRnZXNbMV0pIC0gMSkgK1xuICAgICAgICBNYXRoLm1pbihlZGdlc1swXSwgZWRnZXNbMV0pICsgMTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IDIgKiB0aGlzLnc7IGkrKykge1xuICAgICAgaWYgKGkgPT09IDIgKiBjdXQgKyAxKSBjb250aW51ZTtcbiAgICAgIHRoaXMuZ3JpZC5zZXQoKCh0aGlzLmggLSAyKSA8PCAxMiB8IGkgPDwgMyB8IDB4ODAwKSBhcyBHcmlkQ29vcmQsICdyJyk7XG4gICAgICB0aGlzLmZpeGVkLmFkZCgoKHRoaXMuaCAtIDEpIDw8IDEyIHwgaSA8PCAzIHwgMHg4MDApIGFzIEdyaWRDb29yZCk7XG4gICAgfVxuICAgIC8vIGV4dGVuZCByaXZlci5cbiAgICBjb25zdCByaXZlcnNUYXJnZXQgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcyEucml2ZXIhO1xuICAgIHdoaWxlIChyaXZlcnMgPCByaXZlcnNUYXJnZXQpIHtcbiAgICAgIGNvbnN0IGFkZGVkID0gdGhpcy50cnlBZGQoe2NoYXI6ICdyJ30pO1xuICAgICAgaWYgKCFhZGRlZCkgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBmYWlsZWQgdG8gZXh0cnVkZSByaXZlclxcbiR7dGhpcy5ncmlkLnNob3coKX1gfTtcbiAgICAgIHJpdmVycyArPSBhZGRlZDtcbiAgICAgIHNpemUgKz0gYWRkZWQ7XG4gICAgfVxuICAgIC8vIGV4dHJ1ZGUgY2F2ZS5cbiAgICBjb25zdCBzaXplVGFyZ2V0ID0gdGhpcy5wYXJhbXMuc2l6ZTtcbiAgICB3aGlsZSAoc2l6ZSA8IHNpemVUYXJnZXQpIHtcbiAgICAgIGNvbnN0IGFkZGVkID0gdGhpcy50cnlBZGQoKTtcbiAgICAgIGlmICghYWRkZWQpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgZmFpbGVkIHRvIGV4dHJ1ZGUgY2F2ZWB9O1xuICAgICAgc2l6ZSArPSBhZGRlZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hZGRTdGFpcnMoLi4uKHRoaXMucGFyYW1zLnN0YWlycyA/PyBbXSkpO1xuICB9XG5cbiAgLy8gRmxpZ2h0IG1heSBiZSByZXF1aXJlZCBmb3IgYW55dGhpbmcuXG4gIGNoZWNrTWV0YSgpIHsgcmV0dXJuIHRydWU7IH1cblxuICByZWZpbmVNZXRhc2NyZWVucyhtZXRhOiBNZXRhbG9jYXRpb24pOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnJlZmluZU1ldGFzY3JlZW5zKG1ldGEpO1xuICAgIGlmICghcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIC8vIENoZWNrIHNpbXBsZSBjb25kaXRpb25zOiAoMSkgdGhlcmUncyBhbiBhY2Nlc3NpYmxlIGJyaWRnZSxcbiAgICAvLyAoMikgZmxpZ2h0IGlzIHJlcXVpcmVkIGZvciBzb21lIHRpbGUuXG4gICAgZnVuY3Rpb24gYWNjZXNzaWJsZShtYXA6IE1hcDxudW1iZXIsIFNldDxudW1iZXI+Pik6IG51bWJlciB7XG4gICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgZm9yIChjb25zdCBzZXQgb2YgbmV3IFNldChtYXAudmFsdWVzKCkpKSB7XG4gICAgICAgIGZvciAoY29uc3QgZWRnZSBvZiBzZXQpIHtcbiAgICAgICAgICAvLyBvbmx5IGNoZWNrIGFjY2Vzc2liaWxpdHkgZnJvbSBib3R0b20gZWRnZS5cbiAgICAgICAgICBpZiAobWV0YS5leGl0VHlwZShlZGdlKSA9PT0gJ2VkZ2U6Ym90dG9tJykge1xuICAgICAgICAgICAgY291bnQgKz0gc2V0LnNpemU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBjb3VudDtcbiAgICB9XG4gICAgY29uc3QgcGFydHMxID0gYWNjZXNzaWJsZShtZXRhLnRyYXZlcnNlKHtub0ZsYWdnZWQ6IHRydWV9KSk7XG4gICAgY29uc3QgcGFydHMyID0gYWNjZXNzaWJsZShtZXRhLnRyYXZlcnNlKCkpO1xuICAgIGlmIChwYXJ0czEgPT09IHBhcnRzMikgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBicmlkZ2UgZGlkbid0IG1hdHRlcmB9O1xuICAgIGNvbnN0IHBhcnRzMyA9IGFjY2Vzc2libGUobWV0YS50cmF2ZXJzZSh7ZmxpZ2h0OiB0cnVlfSkpO1xuICAgIGlmIChwYXJ0czIgPT09IHBhcnRzMykgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBmbGlnaHQgbm90IHJlcXVpcmVkYH07XG4gICAgcmV0dXJuIE9LO1xuICB9XG59XG5cblxuZXhwb3J0IGNsYXNzIE9hc2lzQ2F2ZVNodWZmbGUgZXh0ZW5kcyBSaXZlckNhdmVTaHVmZmxlIHtcblxuICByZWFkb25seSBwYXR0ZXJuID0gW1xuICAgICcgICAgICAgICAgICAgICAnLFxuICAgICcgcnJycnJycnJycnJyciAnLFxuICAgICcgciAgICAgICAgICAgciAnLFxuICAgICcgciBycnJycnJycnIgciAnLFxuICAgICcgciByICAgICAgIHIgciAnLFxuICAgICcgciByIHJycnJyIHIgciAnLFxuICAgICcgciByIHIgICByIHIgciAnLFxuICAgICcgciByIHIgICByIHIgciAnLFxuICAgICcgciByIHIgICByIHIgciAnLFxuICAgICcgciByIHIgPCByIHIgciAnLFxuICAgICcgciByIHIgYyByIHIgciAnLFxuICAgICcgciByIHJycnJyIHIgciAnLFxuICAgICcgciByICAgICAgIHIgciAnLFxuICAgICcgciBycnJycnJycnIgciAnLFxuICAgICcgciAgICAgICAgICAgciAnLFxuICAgICcgcnJycnJycnJycnJyciAnLFxuICAgICcgICAgICAgICAgICAgICAnLFxuICBdO1xuXG4gIGluaXRpYWxGaWxsKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gSW5pdGlhbCBmaWxsOiBtYWtlIHN1cmUgdGhlcmUncyBlbm91Z2ggcm9vbSBhbmQgdGhlbiBjb3B5IHRoZSBwYXR0ZXJuLlxuICAgIHJldHVybiB0aGlzLmluc2VydFBhdHRlcm4odGhpcy5wYXR0ZXJuKTtcbiAgfVxuXG4gIGFkZEVkZ2VzKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gRmluZCB0aGUgdG9wLWxlZnQgY29ybmVyIChUT0RPIC0gc2F2ZSB0aGlzIHNvbWV3aGVyZT8pXG4gICAgbGV0IGNvcm5lciE6IEdyaWRDb29yZDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZ3JpZC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5ncmlkLmRhdGFbaV0gPT09ICdyJykge1xuICAgICAgICBjb3JuZXIgPSB0aGlzLmdyaWQuY29vcmQoaSBhcyBHcmlkSW5kZXgpIC0gMHg4MDggYXMgR3JpZENvb3JkO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNvcm5lciA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYG5vIGNvcm5lcmApO1xuXG4gICAgY29uc3QgZWRnZXM6IEdyaWRDb29yZFtdID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLnBhdHRlcm4ubGVuZ3RoOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAxOyB4IDwgdGhpcy5wYXR0ZXJuW3ldLmxlbmd0aCAtIDE7IHgrKykge1xuICAgICAgICBpZiAoISgoeCBeIHkpICYgMSkpIGNvbnRpbnVlO1xuICAgICAgICBpZiAodGhpcy5wYXR0ZXJuW3ldW3hdICE9PSAnICcpIGNvbnRpbnVlO1xuICAgICAgICBlZGdlcy5wdXNoKGNvcm5lciArICh5IDw8IDExIHwgeCA8PCAzKSBhcyBHcmlkQ29vcmQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBjaGFycyA9IHRoaXMucmFuZG9tLnNodWZmbGUoWy4uLidjY3JycnJycnJyJ10pO1xuICAgIGZvciAoY29uc3QgZWRnZSBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShlZGdlcykpIHtcbiAgICAgIGNvbnN0IGNoYXIgPSBjaGFyc1tjaGFycy5sZW5ndGggLSAxXTtcbiAgICAgIC8vIGRvbid0IHBsYWNlIGNhdmVzIG9uIHRoZSBvdXRlciBib3VuZGFyeS5cbiAgICAgIGlmIChjaGFyID09PSAnYycgJiZcbiAgICAgICAgICBbLi4udGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgZWRnZSAtIDB4ODA4IGFzIEdyaWRDb29yZCldXG4gICAgICAgICAgICAgIC5maWx0ZXIodiA9PiB2ID09PSAncicpLmxlbmd0aCA8IDQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5jYW5TZXQoZWRnZSwgY2hhcikpIHRoaXMuZ3JpZC5zZXQoZWRnZSwgY2hhcnMucG9wKCkhKTtcbiAgICAgIGlmICghY2hhcnMubGVuZ3RoKSBicmVhaztcbiAgICB9XG5cbiAgICAvLyBBZGQgYSBmZXcgZXh0cmEgJ2MnIHRpbGVzLlxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNjsgaSsrKSB7XG4gICAgICB0aGlzLnRyeUFkZCh7Y2hhcjogJ2MnfSk7XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIHJlZmluZSgpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIEFkZCBzdGFpcnMuXG4gICAgY29uc3Qgc3RhaXJzID0gWy4uLih0aGlzLnBhcmFtcy5zdGFpcnMgPz8gW10pXTtcbiAgICBzdGFpcnNbMF0tLTtcbiAgICBpZiAoc3RhaXJzWzBdIHx8IHN0YWlyc1sxXSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5hZGRTdGFpcnMoLi4uc3RhaXJzKTtcbiAgICAgIGlmICghcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICAvLyBGaW5kIHR3byBjYXZlIGRlYWQgZW5kcyBhbmQgdHJ5IHRvIHBpbiB0aGVtICg/KVxuICAgIGxldCBkZWFkRW5kcyA9IDA7XG4gICAgZm9yIChjb25zdCBzIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gICAgICBpZiAodGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgcykucmVwbGFjZSgvIC9nLCAnJykgPT09ICdjJykge1xuICAgICAgICBpZiAoc3RhaXJzWzBdICYmICF0aGlzLmdyaWQuZ2V0KHMgKyA4IGFzIEdyaWRDb29yZCkpIHtcbiAgICAgICAgICB0aGlzLmdyaWQuc2V0KHMgKyAweDgwOCBhcyBHcmlkQ29vcmQsICc8Jyk7XG4gICAgICAgICAgc3RhaXJzWzBdLS07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maXhlZC5hZGQocyArIDB4ODA4IGFzIEdyaWRDb29yZCk7XG4gICAgICAgIGlmICgrK2RlYWRFbmRzID49IDIpIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBNYWtlIHN1cmUgaXQncyB0cmF2ZXJzaWJsZS5cbiAgICBjb25zdCBwYXJ0cyA9IHRoaXMuZ3JpZC5wYXJ0aXRpb24oKTtcbiAgICBpZiAobmV3IFNldChwYXJ0cy52YWx1ZXMoKSkuc2l6ZSA+IDEpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgb3JwaGFuc2B9O1xuICAgIC8vIC8vIExvb2sgZm9yIGVkZ2VzIHdlIGNhbiBkZWxldGUgYW5kIG5vdCBhY3R1YWxseSBjdXQgYW55dGhpbmcgb2ZmLlxuICAgIC8vIGZvciAoY29uc3QgaSBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShzZXEodGhpcy5ncmlkLmRhdGEubGVuZ3RoKSkpIHtcbiAgICAvLyAgIGNvbnN0IGMgPSB0aGlzLmdyaWQuY29vcmQoaSBhcyBHcmlkSW5kZXgpO1xuICAgIC8vICAgaWYgKCEoKGMgXiAoYyA+PiA4KSkgJiA4KSkgY29udGludWU7IC8vIG9ubHkgbG9vayBhdCBlZGdlc1xuICAgIC8vICAgaWYgKCF0aGlzLmdyaWQuZGF0YVtpXSkgY29udGludWU7XG4gICAgLy8gfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGZpbGxHcmlkKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgbGV0IHJlc3VsdDogUmVzdWx0PHZvaWQ+O1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5pbml0aWFsRmlsbCgpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuYWRkRWRnZXMoKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLnJlZmluZSgpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICAvLyBGbGlnaHQgbWF5IGJlIHJlcXVpcmVkIGZvciBhbnl0aGluZy5cbiAgY2hlY2tNZXRhKG1ldGE6IE1ldGFsb2NhdGlvbiwgcmVwPzogTWFwPFBvcywgTWV0YXNjcmVlbj4pIHtcbiAgICBjb25zdCBwYXJ0cyA9IG1ldGEudHJhdmVyc2UocmVwID8ge3dpdGg6IHJlcH0gOiB7fSk7XG4gICAgY29uc3QgYWxsU3RhaXJzOiBudW1iZXJbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZWRnZXMgb2YgbmV3IFNldChwYXJ0cy52YWx1ZXMoKSkpIHtcbiAgICAgIGxldCBzdGFpcnMgPSAwO1xuICAgICAgZm9yIChjb25zdCBlZGdlIG9mIG5ldyBTZXQoWy4uLmVkZ2VzXSkpIHtcbiAgICAgICAgLy8gTk9URTogcG9zIGNhbiBiZSBvZmYgdGhlIHJpZ2h0IG9yIGJvdHRvbSBlZGdlXG4gICAgICAgIGlmIChtZXRhLmV4aXRUeXBlKGVkZ2UpKSBzdGFpcnMrKztcbiAgICAgIH1cbiAgICAgIGFsbFN0YWlycy5wdXNoKHN0YWlycyk7XG4gICAgfVxuICAgIHJldHVybiBhbGxTdGFpcnMuZmlsdGVyKHMgPT4gcyA+IDApLmxlbmd0aCA9PT0gMTtcbiAgfVxuXG4gIHJlZmluZU1ldGFzY3JlZW5zKG1ldGE6IE1ldGFsb2NhdGlvbik6IFJlc3VsdDx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLmNoZWNrTWV0YShtZXRhKSkgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBpbml0aWFsIGNoZWNrTWV0YWB9O1xuICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnJlZmluZU1ldGFzY3JlZW5zKG1ldGEpO1xuICAgIGlmICghcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuXG4gICAgLy8gQ2hlY2sgdGhhdCBmbGlnaHQgaXMgcmVxdWlyZWQgZm9yIHNvbWUgdGlsZS5cbiAgICAvLyBUT0RPIC0gYmlhcyBhIFBPSSB0byBiZSBvbiB0aGF0IHRpbGUhXG4gICAgZnVuY3Rpb24gYWNjZXNzaWJsZShtYXA6IE1hcDxudW1iZXIsIFNldDxudW1iZXI+Pik6IG51bWJlciB7XG4gICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgZm9yIChjb25zdCBzZXQgb2YgbmV3IFNldChtYXAudmFsdWVzKCkpKSB7XG4gICAgICAgIGZvciAoY29uc3QgZWRnZSBvZiBzZXQpIHtcbiAgICAgICAgICBpZiAobWV0YS5leGl0VHlwZShlZGdlKSkge1xuICAgICAgICAgICAgY291bnQgKz0gc2V0LnNpemU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBjb3VudDtcbiAgICB9XG4gICAgY29uc3QgcGFydHMxID0gYWNjZXNzaWJsZShtZXRhLnRyYXZlcnNlKCkpO1xuICAgIGNvbnN0IHBhcnRzMiA9IGFjY2Vzc2libGUobWV0YS50cmF2ZXJzZSh7ZmxpZ2h0OiB0cnVlfSkpO1xuICAgIGlmIChwYXJ0czEgPT09IHBhcnRzMikgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBmbGlnaHQgbm90IHJlcXVpcmVkYH07XG5cbiAgICByZXR1cm4gT0s7XG4gIH1cbn1cbiJdfQ==