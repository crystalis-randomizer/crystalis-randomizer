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
    preinfer(a) {
        if ([...this.orig.exits()].length < 2)
            return OK;
        const override = new Map();
        for (let i = 0; i < a.grid.data.length; i++) {
            if (a.grid.data[i] === 'r')
                override.set(a.grid.coord(i), '');
        }
        const parts = a.grid.partition(override);
        const stairParts = [];
        for (let i = 0; i < a.grid.data.length; i++) {
            if (a.grid.data[i] === '<' || a.grid.data[i] === '>' ||
                (a.grid.data[i] && a.grid.isBorder(a.grid.coord(i)))) {
                stairParts.push(parts.get(a.grid.coord(i)));
            }
        }
        if (new Set(stairParts).size < stairParts.length) {
            return { ok: false, fail: `river didn't matter\n${a.grid.show()}` };
        }
        return super.preinfer(a);
    }
    addLateFeatures(a) {
        return OK;
    }
    addArenas(a, arenas) {
        if (!arenas)
            return true;
        const g = a.grid;
        for (const c of this.random.ishuffle(a.grid.screens())) {
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
            a.fixed.add(middle);
            a.fixed.add(up);
            a.fixed.add(down);
            g.set(middle, 'a');
            arenas--;
            if (!arenas) {
                this.pruneDisconnected(a);
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
    initialFillEarly(a) {
        const g = new Monogrid(a.h, a.w, this.getValidEarlyScreens());
        const x0 = 2 + this.random.nextInt(a.w - 4);
        const x1 = 2 + this.random.nextInt(a.w - 4);
        const c = new Cursor(g, a.h - 1, x1);
        c.go(0);
        c.directedPath(this.random, 1, x0);
        c.go(0);
        a.grid.data = g.toGrid('r').data;
        this.addAllFixed(a);
        return OK;
    }
    addEdges(a) {
        let r = -1;
        const h = (a.h - 1) << 12 | 0x808;
        for (let x = 0; x < a.w; x++) {
            if (a.grid.get((h | (x << 4))) === 'r')
                r = x;
        }
        if (r < 0)
            throw new Error(`no river on bottom edge`);
        const c0 = (h | this.random.nextInt(r) << 4);
        const c1 = (h | (r + 1 + this.random.nextInt(a.w - 1 - r)) << 4);
        a.grid.set(c0, '>');
        a.grid.set(c0 - 8, '');
        a.grid.set(c0 + 8, '');
        a.grid.set(c1, '>');
        a.grid.set(c1 - 8, '');
        a.grid.set(c1 + 8, '');
        a.fixed.add(c0);
        a.fixed.add(c1);
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
    initialFill(a) {
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
        const x = 1 + this.random.nextInt(a.w - 2);
        const y = 1 + this.random.nextInt(a.h - 2);
        let pos = y << 4 | x;
        let c = this.posToGrid(pos, 0x808);
        let dir = y < a.h / 2 ? 2 : 0;
        this.insertTile(a, pos, this.random.pick(spikes.get(1 << dir)));
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
                if (a.grid.isBorder(c + DGRID[d]))
                    continue;
                if (this.insertTile(a, pos, this.random.pick(spikes.get(d)))) {
                    nextDir = 31 - Math.clz32(d & ~(1 << opp));
                    break;
                }
            }
            if (nextDir == null)
                return { ok: false, fail: `spikes` };
            dir = nextDir;
        }
        const riverStart = [];
        for (let y = 3; y < a.h - 3; y++) {
            for (let x = 1; x < a.w - 1; x++) {
                riverStart.push((y << 12 | x << 4 | 0x808));
            }
        }
        let found = false;
        for (const c of this.random.ishuffle(riverStart)) {
            if (a.grid.get(c))
                continue;
            for (const d of DGRID) {
                if (a.grid.get(c + d) !== 'c')
                    continue;
                a.grid.set(c, 'r');
                const orthogonal = 0x808 & ~Math.abs(d);
                a.grid.set(c + orthogonal, 'r');
                a.grid.set(c - orthogonal, 'r');
                const o = this.random.pick([-orthogonal, orthogonal]);
                a.grid.set(c + 2 * o, 'r');
                a.grid.set(c + 3 * o, 'r');
                a.grid.set(c + 2 * o - d, 'c');
                found = true;
                break;
            }
            if (found)
                break;
        }
        if (!found)
            return { ok: false, fail: `nucleate river` };
        for (let i = 5 + this.random.nextInt(3); i > 0; i--) {
            if (!this.tryAdd(a, { char: 'c' }))
                return { ok: false, fail: `fill cave` };
        }
        for (let i = 0; i < a.grid.data.length; i++) {
            if (a.grid.data[i] && a.grid.isBorder(a.grid.coord(i))) {
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
    addSpikes(a, spikes) {
        return true;
    }
    refineMetascreens(a, meta) {
        const result = super.refineMetascreens(a, meta);
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
    fillGrid(a) {
        var _a;
        const edges = [];
        let size = 0;
        for (const x of this.random.ishuffle(seq(a.w - 2, x => x + 1))) {
            if (edges.length === 1 && (x - edges[0]) ** 2 <= 1)
                continue;
            const c = ((a.h - 1) << 12 | x << 4 | 0x808);
            a.grid.set(c, 'c');
            a.grid.set(N(c), 'c');
            a.grid.set(S(c), 'n');
            a.fixed.add(c);
            a.fixed.add(N(c));
            a.fixed.add(S(c));
            edges.push(x);
            size++;
            if (edges.length === 2)
                break;
        }
        if (edges.length < 2)
            return { ok: false, fail: `initial edges` };
        let rivers = a.w;
        const cut = this.random.nextInt(Math.abs(edges[0] - edges[1]) - 1) +
            Math.min(edges[0], edges[1]) + 1;
        for (let i = 1; i < 2 * a.w; i++) {
            if (i === 2 * cut + 1)
                continue;
            a.grid.set(((a.h - 2) << 12 | i << 3 | 0x800), 'r');
            a.fixed.add(((a.h - 1) << 12 | i << 3 | 0x800));
        }
        const riversTarget = this.params.features.river;
        while (rivers < riversTarget) {
            const added = this.tryAdd(a, { char: 'r' });
            if (!added)
                return { ok: false, fail: `failed to extrude river\n${a.grid.show()}` };
            rivers += added;
            size += added;
        }
        const sizeTarget = this.params.size;
        while (size < sizeTarget) {
            const added = this.tryAdd(a);
            if (!added)
                return { ok: false, fail: `failed to extrude cave` };
            size += added;
        }
        return this.addStairs(a, ...((_a = this.params.stairs) !== null && _a !== void 0 ? _a : []));
    }
    checkMeta() { return true; }
    refineMetascreens(a, meta) {
        const result = super.refineMetascreens(a, meta);
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
    initialFill(a) {
        return this.insertPattern(a, this.pattern);
    }
    addEdges(a) {
        let corner;
        for (let i = 0; i < a.grid.data.length; i++) {
            if (a.grid.data[i] === 'r') {
                corner = a.grid.coord(i) - 0x808;
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
                [...this.extract(a.grid, edge - 0x808)]
                    .filter(v => v === 'r').length < 4) {
                continue;
            }
            if (this.canSet(a, edge, char))
                a.grid.set(edge, chars.pop());
            if (!chars.length)
                break;
        }
        for (let i = 0; i < 6; i++) {
            this.tryAdd(a, { char: 'c' });
        }
        return OK;
    }
    refine(a) {
        var _a;
        const stairs = [...((_a = this.params.stairs) !== null && _a !== void 0 ? _a : [])];
        stairs[0]--;
        if (stairs[0] || stairs[1]) {
            const result = this.addStairs(a, ...stairs);
            if (!result.ok)
                return result;
        }
        let deadEnds = 0;
        for (const s of this.random.ishuffle(a.grid.screens())) {
            if (this.extract(a.grid, s).replace(/ /g, '') === 'c') {
                if (stairs[0] && !a.grid.get(s + 8)) {
                    a.grid.set(s + 0x808, '<');
                    stairs[0]--;
                }
                a.fixed.add(s + 0x808);
                if (++deadEnds >= 2)
                    break;
            }
        }
        const parts = a.grid.partition();
        if (new Set(parts.values()).size > 1)
            return { ok: false, fail: `orphans` };
        return OK;
    }
    fillGrid(a) {
        let result;
        if ((result = this.initialFill(a)), !result.ok)
            return result;
        if ((result = this.addEdges(a)), !result.ok)
            return result;
        if ((result = this.refine(a)), !result.ok)
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
    refineMetascreens(a, meta) {
        if (!this.checkMeta(meta))
            return { ok: false, fail: `initial checkMeta` };
        const result = super.refineMetascreens(a, meta);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicml2ZXJjYXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL21hemUvcml2ZXJjYXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBc0IsV0FBVyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQzVELE9BQU8sRUFBd0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNqRCxPQUFPLEVBQVUsRUFBRSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBR3ZDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNwRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDckMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUl4QyxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsbUJBQW1CO0lBQXpEOztRQVlFLFVBQUssR0FBRyxHQUFHLENBQUM7UUFDWixnQkFBVyxHQUFHLEdBQUcsQ0FBQztJQTZIcEIsQ0FBQztJQTFIQyxXQUFXLGlCQUFLLG1CQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSwwQ0FBRSxLQUFLLG1DQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUEyQzFELFFBQVEsQ0FBQyxDQUFJO1FBRVgsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQUUsT0FBTyxFQUFFLENBQUM7UUFDakQsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQXFCLENBQUM7UUFDOUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN4RCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUc7Z0JBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUMvRDtRQUNELE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sVUFBVSxHQUFjLEVBQUUsQ0FBQztRQUNqQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3hELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUc7Z0JBQ2hELENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUN4RCxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzdDO1NBQ0Y7UUFDRCxJQUFJLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFO1lBRWhELE9BQU8sRUFBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFDLENBQUM7U0FDbkU7UUFDRCxPQUFPLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUVELGVBQWUsQ0FBQyxDQUFJO1FBR2xCLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVELFNBQVMsQ0FBQyxDQUFJLEVBQUUsTUFBYztRQU01QixJQUFJLENBQUMsTUFBTTtZQUFFLE9BQU8sSUFBSSxDQUFDO1FBQ3pCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDakIsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUU7WUFDdEQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFjLENBQUM7WUFDeEMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFjLENBQUM7WUFDdkMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFjLENBQUM7WUFDdEMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFjLENBQUM7WUFDeEMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFjLENBQUM7WUFDeEMsTUFBTSxFQUFFLEdBQUcsTUFBTSxHQUFHLEtBQWtCLENBQUM7WUFDdkMsTUFBTSxJQUFJLEdBQUcsTUFBTSxHQUFHLEtBQWtCLENBQUM7WUFDekMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUc7Z0JBQUUsU0FBUztZQUNwQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssR0FBRztnQkFBRSxTQUFTO1lBQ2hDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHO2dCQUFFLFNBQVM7WUFDbEMsTUFBTSxRQUFRLEdBQ1YsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxLQUFLLEdBQUcsS0FBa0IsQ0FBQyxDQUFDO1lBQ3hFLE1BQU0sU0FBUyxHQUNYLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLEtBQWtCLENBQUMsQ0FBQztZQUMxRSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztnQkFBRSxTQUFTO1lBQ2pELElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNyQixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDaEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2pCLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDbEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsS0FBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDdEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsS0FBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUN2QztZQUNELElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN0QixDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDakIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2xCLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDbkMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsS0FBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDdkMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsS0FBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUN4QztZQUNELENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2hCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xCLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLE1BQU0sRUFBRSxDQUFDO1lBQ1QsSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDWCxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7U0FDRjtRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLHlCQUEwQixTQUFRLGdCQUFnQjtJQUEvRDs7UUFFRSxjQUFTLEdBQUcsS0FBSyxDQUFDO0lBNENwQixDQUFDO0lBMUNDLGdCQUFnQixDQUFDLENBQUk7UUFDbkIsTUFBTSxDQUFDLEdBQUcsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUM7UUFDOUQsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDNUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDUixDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFUixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVELFFBQVEsQ0FBQyxDQUFJO1FBQ1gsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDWCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQztRQUNsQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM1QixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFjLENBQUMsS0FBSyxHQUFHO2dCQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDNUQ7UUFDRCxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBYyxDQUFDO1FBQzFELE1BQU0sRUFBRSxHQUNKLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBYyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNwQixDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFjLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFjLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoQixDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoQixPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFFRCxTQUFTLEtBQW1CLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUV4QyxTQUFTLENBQUMsSUFBa0IsRUFBRSxJQUEyQjtRQUN2RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDO1FBQ2hFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUM3RCxDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsV0FBVztJQUF6RDs7UUFFRSxjQUFTLEdBQUcsS0FBSyxDQUFDO0lBK0lwQixDQUFDO0lBdklDLFNBQVM7UUFDUCxPQUFPLEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQsV0FBVyxDQUFDLENBQUk7UUFFZCxNQUFNLE1BQU0sR0FBRyxJQUFJLFVBQVUsQ0FBbUIsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDMUQsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSztnQkFBRSxTQUFTO1lBQzNELElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQztZQUNiLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0JBQ2hDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRztvQkFBRSxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7YUFDckQ7WUFDRCxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1NBQzNDO1FBRUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDM0MsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckIsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFFM0IsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQWMsQ0FBQztZQUNoQyxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQ3BCLE1BQU0sS0FBSyxHQUFhLEVBQUUsQ0FBQztZQUMzQixLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksTUFBTSxFQUFFO2dCQUM1QixJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7b0JBQUUsU0FBUztnQkFDaEMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRztvQkFBRSxTQUFTO2dCQUM3QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUU7b0JBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNuQztZQUNELElBQUksT0FBeUIsQ0FBQztZQUM5QixLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUMzQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFjLENBQUM7b0JBQUUsU0FBUztnQkFDekQsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQzVELE9BQU8sR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUMzQyxNQUFNO2lCQUNQO2FBQ0Y7WUFDRCxJQUFJLE9BQU8sSUFBSSxJQUFJO2dCQUFFLE9BQU8sRUFBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUMsQ0FBQztZQUN4RCxHQUFHLEdBQUcsT0FBTyxDQUFDO1NBQ2Y7UUFHRCxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNoQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2hDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFjLENBQUMsQ0FBQzthQUMxRDtTQUNGO1FBRUQsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ2xCLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDaEQsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQUUsU0FBUztZQUM1QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRTtnQkFDckIsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBYyxDQUFDLEtBQUssR0FBRztvQkFBRSxTQUFTO2dCQUNyRCxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ25CLE1BQU0sVUFBVSxHQUFHLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxVQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUM3QyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsVUFBdUIsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUN0RCxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDeEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFjLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3hDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDNUMsS0FBSyxHQUFHLElBQUksQ0FBQztnQkFDYixNQUFNO2FBQ1A7WUFDRCxJQUFJLEtBQUs7Z0JBQUUsTUFBTTtTQUNsQjtRQUNELElBQUksQ0FBQyxLQUFLO1lBQUUsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFDLENBQUM7UUFTdkQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFDLENBQUM7Z0JBQUUsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQyxDQUFDO1NBQ3pFO1FBR0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMzQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQWMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ25FLE9BQU8sRUFBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUMsQ0FBQzthQUNwQztTQUNGO1FBRUQsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0lBRUQsU0FBUyxDQUFDLElBQWtCLEVBQUUsSUFBMkI7UUFFdkQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQztRQUNoRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDN0QsQ0FBQztJQUVELE1BQU0sS0FBSyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkIsV0FBVyxLQUFLLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztJQUU5QixTQUFTLENBQUMsQ0FBSSxFQUFFLE1BQWM7UUFDNUIsT0FBTyxJQUFJLENBQUM7SUFRZCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsQ0FBSSxFQUFFLElBQWtCO1FBQ3hDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQUUsT0FBTyxNQUFNLENBQUM7UUFFOUIsU0FBUyxVQUFVLENBQUMsR0FBNkI7WUFDL0MsTUFBTSxVQUFVLEdBQ1osQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFOztnQkFDdEMsS0FBSyxNQUFNLEtBQUssSUFBSSxHQUFHLEVBQUU7b0JBQ3ZCLFVBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsMENBQUUsVUFBVSxDQUFDLE9BQU87d0JBQUcsT0FBTyxJQUFJLENBQUM7aUJBQzVEO2dCQUNELE9BQU8sS0FBSyxDQUFDO1lBQ2YsQ0FBQyxDQUFDLENBQUM7WUFDUCxPQUFPLFVBQVUsQ0FBQyxNQUFNLENBQUM7UUFDM0IsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMzQyxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekQsSUFBSSxNQUFNLEtBQUssTUFBTTtZQUFFLE9BQU8sRUFBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxxQkFBcUIsRUFBQyxDQUFDO1FBQ3ZFLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztDQUNGO0FBRUQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDckMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFOUIsTUFBTSxPQUFPLG9CQUFxQixTQUFRLGdCQUFnQjtJQUExRDs7UUFDRSxjQUFTLEdBQUcsS0FBSyxDQUFDO0lBNkVwQixDQUFDO0lBM0VDLFFBQVEsQ0FBQyxDQUFJOztRQUVYLE1BQU0sS0FBSyxHQUFhLEVBQUUsQ0FBQztRQUMzQixJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7UUFDYixLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzlELElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQUUsU0FBUztZQUM3RCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQWMsQ0FBQztZQUMxRCxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3RCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN0QixDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNmLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xCLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDZCxJQUFJLEVBQUUsQ0FBQztZQUNQLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDO2dCQUFFLE1BQU07U0FDL0I7UUFDRCxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUFFLE9BQU8sRUFBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUMsQ0FBQztRQUVoRSxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pCLE1BQU0sR0FBRyxHQUNMLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0RCxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztnQkFBRSxTQUFTO1lBQ2hDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2pFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBYyxDQUFDLENBQUM7U0FDOUQ7UUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVMsQ0FBQyxLQUFNLENBQUM7UUFDbEQsT0FBTyxNQUFNLEdBQUcsWUFBWSxFQUFFO1lBQzVCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLEtBQUs7Z0JBQUUsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLDRCQUE0QixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUMsQ0FBQztZQUNsRixNQUFNLElBQUksS0FBSyxDQUFDO1lBQ2hCLElBQUksSUFBSSxLQUFLLENBQUM7U0FDZjtRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ3BDLE9BQU8sSUFBSSxHQUFHLFVBQVUsRUFBRTtZQUN4QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdCLElBQUksQ0FBQyxLQUFLO2dCQUFFLE9BQU8sRUFBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSx3QkFBd0IsRUFBQyxDQUFDO1lBQy9ELElBQUksSUFBSSxLQUFLLENBQUM7U0FDZjtRQUVELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxPQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxtQ0FBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFHRCxTQUFTLEtBQUssT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRTVCLGlCQUFpQixDQUFDLENBQUksRUFBRSxJQUFrQjtRQUN4QyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUFFLE9BQU8sTUFBTSxDQUFDO1FBRzlCLFNBQVMsVUFBVSxDQUFDLEdBQTZCO1lBQy9DLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztZQUNkLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUU7Z0JBQ3ZDLEtBQUssTUFBTSxJQUFJLElBQUksR0FBRyxFQUFFO29CQUV0QixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssYUFBYSxFQUFFO3dCQUN6QyxLQUFLLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQzt3QkFDbEIsTUFBTTtxQkFDUDtpQkFDRjthQUNGO1lBQ0QsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMzQyxJQUFJLE1BQU0sS0FBSyxNQUFNO1lBQUUsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLHNCQUFzQixFQUFDLENBQUM7UUFDeEUsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pELElBQUksTUFBTSxLQUFLLE1BQU07WUFBRSxPQUFPLEVBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUscUJBQXFCLEVBQUMsQ0FBQztRQUN2RSxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRjtBQUdELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxnQkFBZ0I7SUFBdEQ7O1FBRVcsWUFBTyxHQUFHO1lBQ2pCLGlCQUFpQjtZQUNqQixpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGlCQUFpQjtZQUNqQixpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGlCQUFpQjtZQUNqQixpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGlCQUFpQjtZQUNqQixpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGlCQUFpQjtZQUNqQixpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGlCQUFpQjtZQUNqQixpQkFBaUI7U0FDbEIsQ0FBQztJQStISixDQUFDO0lBN0hDLFdBQVcsQ0FBQyxDQUFJO1FBRWQsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVELFFBQVEsQ0FBQyxDQUFJO1FBRVgsSUFBSSxNQUFrQixDQUFDO1FBQ3ZCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDM0MsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7Z0JBQzFCLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFjLENBQUMsR0FBRyxLQUFrQixDQUFDO2dCQUMzRCxNQUFNO2FBQ1A7U0FDRjtRQUNELElBQUksTUFBTSxJQUFJLElBQUk7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRWpELE1BQU0sS0FBSyxHQUFnQixFQUFFLENBQUM7UUFDOUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzVDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ25ELElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFBRSxTQUFTO2dCQUM3QixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRztvQkFBRSxTQUFTO2dCQUN6QyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBYyxDQUFDLENBQUM7YUFDdEQ7U0FDRjtRQUVELElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ25ELEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDOUMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFFckMsSUFBSSxJQUFJLEtBQUssR0FBRztnQkFDWixDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksR0FBRyxLQUFrQixDQUFDLENBQUM7cUJBQy9DLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUMxQyxTQUFTO2FBQ1Y7WUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7Z0JBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUcsQ0FBQyxDQUFDO1lBQy9ELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTTtnQkFBRSxNQUFNO1NBQzFCO1FBR0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFDLElBQUksRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO1NBQzdCO1FBQ0QsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0lBRUQsTUFBTSxDQUFDLENBQUk7O1FBRVQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxHQUFHLE9BQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLG1DQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDWixJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDMUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQUUsT0FBTyxNQUFNLENBQUM7U0FDL0I7UUFFRCxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDakIsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUU7WUFDdEQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsS0FBSyxHQUFHLEVBQUU7Z0JBQ3JELElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQWMsQ0FBQyxFQUFFO29CQUNoRCxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBa0IsRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDeEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7aUJBQ2I7Z0JBQ0QsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQWtCLENBQUMsQ0FBQztnQkFDcEMsSUFBSSxFQUFFLFFBQVEsSUFBSSxDQUFDO29CQUFFLE1BQU07YUFDNUI7U0FDRjtRQUVELE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDakMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQztZQUFFLE9BQU8sRUFBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUMsQ0FBQztRQU8xRSxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFFRCxRQUFRLENBQUMsQ0FBSTtRQUNYLElBQUksTUFBb0IsQ0FBQztRQUN6QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQUUsT0FBTyxNQUFNLENBQUM7UUFDOUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUFFLE9BQU8sTUFBTSxDQUFDO1FBQzNELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFBRSxPQUFPLE1BQU0sQ0FBQztRQUN6RCxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFHRCxTQUFTLENBQUMsSUFBa0IsRUFBRSxHQUEwQjtRQUN0RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sU0FBUyxHQUFhLEVBQUUsQ0FBQztRQUMvQixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFO1lBQzNDLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNmLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUU7Z0JBRXRDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7b0JBQUUsTUFBTSxFQUFFLENBQUM7YUFDbkM7WUFDRCxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3hCO1FBQ0QsT0FBTyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELGlCQUFpQixDQUFDLENBQUksRUFBRSxJQUFrQjtRQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7WUFBRSxPQUFPLEVBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUMsQ0FBQztRQUN6RSxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUFFLE9BQU8sTUFBTSxDQUFDO1FBSTlCLFNBQVMsVUFBVSxDQUFDLEdBQTZCO1lBQy9DLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztZQUNkLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUU7Z0JBQ3ZDLEtBQUssTUFBTSxJQUFJLElBQUksR0FBRyxFQUFFO29CQUN0QixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQ3ZCLEtBQUssSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDO3dCQUNsQixNQUFNO3FCQUNQO2lCQUNGO2FBQ0Y7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDM0MsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pELElBQUksTUFBTSxLQUFLLE1BQU07WUFBRSxPQUFPLEVBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUscUJBQXFCLEVBQUMsQ0FBQztRQUV2RSxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENhdmVTaHVmZmxlQXR0ZW1wdCwgQ2F2ZVNodWZmbGUgfSBmcm9tICcuL2NhdmUuanMnO1xuaW1wb3J0IHsgR3JpZENvb3JkLCBHcmlkSW5kZXgsIE4sIFMgfSBmcm9tICcuL2dyaWQuanMnO1xuaW1wb3J0IHsgTW9ub2dyaWQsIEN1cnNvciB9IGZyb20gJy4vbW9ub2dyaWQuanMnO1xuaW1wb3J0IHsgUmVzdWx0LCBPSyB9IGZyb20gJy4vbWF6ZS5qcyc7XG5pbXBvcnQgeyBNZXRhbG9jYXRpb24sIFBvcyB9IGZyb20gJy4uL3JvbS9tZXRhbG9jYXRpb24uanMnO1xuaW1wb3J0IHsgTWV0YXNjcmVlbiB9IGZyb20gJy4uL3JvbS9tZXRhc2NyZWVuLmpzJztcbmltcG9ydCB7IFR3b1N0YWdlQ2F2ZVNodWZmbGUgfSBmcm9tICcuL3R3b3N0YWdlLmpzJztcbmltcG9ydCB7IHNlcSB9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcbmltcG9ydCB7IERlZmF1bHRNYXAgfSBmcm9tICcuLi91dGlsLmpzJztcblxudHlwZSBBID0gQ2F2ZVNodWZmbGVBdHRlbXB0O1xuXG5leHBvcnQgY2xhc3MgUml2ZXJDYXZlU2h1ZmZsZSBleHRlbmRzIFR3b1N0YWdlQ2F2ZVNodWZmbGUge1xuICAvLyBiYXNpYyBwcm9ibGVtOiBtaXNzaW5nIHwtIGFuZCAtfCBwaWVjZXMuXG4gIC8vICBvbmUgc29sdXRpb24gd291bGQgYmUgdG8ganVzdCBhZGQgdGhlbVxuICAvLyAgb3V0c2lkZSBvZiB0aGF0LCB3ZSBuZWVkIHRvIHN3aXRjaCB0byBhIHBhdGhnZW4gYWxnbyByYXRoZXJcbiAgLy8gIHRoYW4gcmVmaW5lbWVudFxuXG4gIC8vIHNpbXBsZSBwYXRoZ2VuIHNob3VsZCBiZSBwcmV0dHkgZWFzeSB3LyBncmlkXG5cbiAgLy8gYWx0ZXJuYXRpdmVseSwgdHJpYWwgcmVtb3ZhbHMgYXJlIGZ1cnRoZXItcmVhY2hpbmc/XG4gIC8vICAtIGlmIHdlIHJlbW92ZSBhIGhvcml6b250YWwgZWRnZSB0aGVuIGFsc28gcmVtb3ZlIHRoZVxuICAvLyAgICBvcHBvc2l0ZSBlZGdlcyBvZiBhbnkgbmVpZ2hib3JzLCBjb250aW51aW5nLlxuICAvLyAgLSBvciByZW1vdmUgYSB2ZXJ0aWNhbCBlZGdlIG9mIG9uZS4uLj9cbiAgZWFybHkgPSAncic7XG4gIG1heEF0dGVtcHRzID0gMjUwO1xuICB2YWxpZFJpdmVyU2NyZWVucz86IFNldDxudW1iZXI+O1xuXG4gIHRhcmdldEVhcmx5KCkgeyByZXR1cm4gdGhpcy5wYXJhbXMuZmVhdHVyZXM/LnJpdmVyID8/IDA7IH1cblxuICAvLyBhZGRFYXJseUZlYXR1cmVzKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAvLyAgIC8vIGZpbGwgd2l0aCByaXZlciBhbmQgdGhlbiByZWZpbmUgZG93biB0byB0aGUgY29ycmVjdCBzaXplLlxuICAvLyAgIC8vdGhpcy5maWxsQ2F2ZShcbiAgLy8gICByZXR1cm5cbiAgLy8gfVxuXG4gIC8vIGNhblJlbW92ZShjOiBzdHJpbmcpIHtcbiAgLy8gICByZXR1cm4gYyA9PT0gJ2MnIHx8IGMgPT09ICdyJztcbiAgLy8gfVxuXG4gIC8vIHJlbW92YWxNYXAoYTogQSwgY29vcmQ6IEdyaWRDb29yZCk6IE1hcDxHcmlkQ29vcmQsIHN0cmluZz4ge1xuICAvLyAgIGlmICgoY29vcmQgJiAweDgwOCkgIT09IDB4ODAwKSByZXR1cm4gbmV3IE1hcChbW2Nvb3JkLCAnJ11dKTtcbiAgLy8gICAvLyBuZWVkIHRvIGJlIGEgbGl0dGxlIGNsZXZlcmVyOiBob3Jpem9udGFsIGJyYW5jaGVzIGFyZSBub3RcbiAgLy8gICAvLyBhbGxvd2VkICh0aG91Z2ggd2UgY291bGQgYWRkIHRoZW0sIGluIHdoaWNoIGNhc2UgdGhpcyBnZXRzXG4gIC8vICAgLy8gYSBsb3QgZWFzaWVyKSwgc28gZW5zdXJlIHdlJ3JlIGxlZnQgd2l0aCBhIGJlbmQgaW5zdGVhZC5cbiAgLy8gICBjb25zdCBtYXAgPSBuZXcgTWFwKFtbY29vcmQsICcnXV0pO1xuICAvLyAgIGNvbnN0IGxlZnQgPSBjb29yZCAtIDggYXMgR3JpZENvb3JkO1xuICAvLyAgIGlmIChhLmdyaWQuZ2V0KGxlZnQpID09PSAncicpIHtcbiAgLy8gICAgIGNvbnN0IGxlZnRVcCA9IGxlZnQgLSAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCBsZWZ0RG93biA9IGxlZnQgKyAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCBsZWZ0TGVmdCA9IGxlZnQgLSA4IGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIC8vIG1heSBuZWVkIHRvIHJlbW92ZSBhbm90aGVyIG5laWdoYm9yLlxuICAvLyAgICAgaWYgKGEuZ3JpZC5nZXQobGVmdFVwKSA9PT0gJ3InICYmIGEuZ3JpZC5nZXQobGVmdERvd24pID09PSAncicgJiZcbiAgLy8gICAgICAgICBhLmdyaWQuZ2V0KGxlZnRMZWZ0KSA9PT0gJ3InKSB7XG4gIC8vICAgICAgIG1hcC5zZXQodGhpcy5yYW5kb20ubmV4dEludCgyKSA/IGxlZnRVcCA6IGxlZnREb3duLCAnJyk7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIGNvbnN0IHJpZ2h0ID0gY29vcmQgKyA4IGFzIEdyaWRDb29yZDtcbiAgLy8gICBpZiAoYS5ncmlkLmdldChyaWdodCkgPT09ICdyJykge1xuICAvLyAgICAgY29uc3QgcmlnaHRVcCA9IHJpZ2h0IC0gMHg4MDAgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHREb3duID0gcmlnaHQgKyAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCByaWdodFJpZ2h0ID0gcmlnaHQgKyA4IGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIC8vIG1heSBuZWVkIHRvIHJlbW92ZSBhbm90aGVyIG5laWdoYm9yLlxuICAvLyAgICAgaWYgKGEuZ3JpZC5nZXQocmlnaHRVcCkgPT09ICdyJyAmJiBhLmdyaWQuZ2V0KHJpZ2h0RG93bikgPT09ICdyJyAmJlxuICAvLyAgICAgICAgIGEuZ3JpZC5nZXQocmlnaHRSaWdodCkgPT09ICdyJykge1xuICAvLyAgICAgICBtYXAuc2V0KHRoaXMucmFuZG9tLm5leHRJbnQoMikgPyByaWdodFVwIDogcmlnaHREb3duLCAnJyk7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiBtYXA7XG4gIC8vIH1cblxuICBwcmVpbmZlcihhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBNYWtlIHN1cmUgcml2ZXIgaXMgYWN0dWFsbHkgbmVjZXNzYXJ5IVxuICAgIGlmIChbLi4udGhpcy5vcmlnLmV4aXRzKCldLmxlbmd0aCA8IDIpIHJldHVybiBPSztcbiAgICBjb25zdCBvdmVycmlkZSA9IG5ldyBNYXA8R3JpZENvb3JkLCBzdHJpbmc+KCk7XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgR3JpZEluZGV4OyBpIDwgYS5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhLmdyaWQuZGF0YVtpXSA9PT0gJ3InKSBvdmVycmlkZS5zZXQoYS5ncmlkLmNvb3JkKGkpLCAnJyk7XG4gICAgfVxuICAgIGNvbnN0IHBhcnRzID0gYS5ncmlkLnBhcnRpdGlvbihvdmVycmlkZSk7XG4gICAgY29uc3Qgc3RhaXJQYXJ0czogdW5rbm93bltdID0gW107XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgR3JpZEluZGV4OyBpIDwgYS5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhLmdyaWQuZGF0YVtpXSA9PT0gJzwnIHx8IGEuZ3JpZC5kYXRhW2ldID09PSAnPicgfHxcbiAgICAgICAgICAoYS5ncmlkLmRhdGFbaV0gJiYgYS5ncmlkLmlzQm9yZGVyKGEuZ3JpZC5jb29yZChpKSkpKSB7XG4gICAgICAgIHN0YWlyUGFydHMucHVzaChwYXJ0cy5nZXQoYS5ncmlkLmNvb3JkKGkpKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChuZXcgU2V0KHN0YWlyUGFydHMpLnNpemUgPCBzdGFpclBhcnRzLmxlbmd0aCkge1xuICAgICAgLy9jb25zb2xlLmVycm9yKGEuZ3JpZC5zaG93KCkpO1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGByaXZlciBkaWRuJ3QgbWF0dGVyXFxuJHthLmdyaWQuc2hvdygpfWB9O1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIucHJlaW5mZXIoYSk7XG4gIH1cblxuICBhZGRMYXRlRmVhdHVyZXMoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gY29uc29sZS5lcnJvcihhLmdyaWQuc2hvdygpKTtcbiAgICAvLyByZXR1cm4gc3VwZXIuYWRkTGF0ZUZlYXR1cmVzKGEpO1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGFkZEFyZW5hcyhhOiBBLCBhcmVuYXM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIC8vIFRoaXMgdmVyc2lvbiB3b3JrcyBhIGxpdHRsZSBkaWZmZXJlbnRseSwgc2luY2UgaXQgcnVucyBhcyBhbiBlYXJseVxuICAgIC8vIGZlYXR1cmUgKGJlZm9yZSByZWZpbmVtZW50KSByYXRoZXIgdGhhbiBsYXRlLiAgV2UgbG9vayBmb3IgYSAzeDFcbiAgICAvLyBibG9jayBvZiAnYycgc2NyZWVucywgemVybyBvdXQgYWxsIGJ1dCB0aGUgbWlkZGxlICh3aGljaCBnZXRzIHRoZVxuICAgIC8vIGFyZW5hKSwgYW5kIHRoZW4gYWZ0ZXJ3YXJkcyB3ZSBwcnVuZSBhd2F5IGFueSBuZXdseS1kaXNjb25uZWN0ZWRcbiAgICAvLyBsYW5kIHNjcmVlbnMuXG4gICAgaWYgKCFhcmVuYXMpIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IGcgPSBhLmdyaWQ7XG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKGEuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gICAgICBjb25zdCBtaWRkbGUgPSAoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCBsZWZ0ID0gKG1pZGRsZSAtIDgpIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IGxlZnQyID0gKGxlZnQgLSA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCByaWdodCA9IChtaWRkbGUgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCByaWdodDIgPSAocmlnaHQgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCB1cCA9IG1pZGRsZSAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IGRvd24gPSBtaWRkbGUgKyAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAoZy5nZXQobWlkZGxlKSAhPT0gJ2MnKSBjb250aW51ZTtcbiAgICAgIGlmIChnLmdldCh1cCkgIT09ICdjJykgY29udGludWU7XG4gICAgICBpZiAoZy5nZXQoZG93bikgIT09ICdjJykgY29udGludWU7XG4gICAgICBjb25zdCBsZWZ0VGlsZSA9XG4gICAgICAgICAgZy5pc0JvcmRlcihsZWZ0KSA/ICcnIDogdGhpcy5leHRyYWN0KGcsIGxlZnQyIC0gMHg4MDggYXMgR3JpZENvb3JkKTtcbiAgICAgIGNvbnN0IHJpZ2h0VGlsZSA9XG4gICAgICAgICAgZy5pc0JvcmRlcihyaWdodCkgPyAnJyA6IHRoaXMuZXh0cmFjdChnLCByaWdodDIgLSAweDgwOCBhcyBHcmlkQ29vcmQpO1xuICAgICAgaWYgKC9bXiBjXS8udGVzdChsZWZ0VGlsZSArIHJpZ2h0VGlsZSkpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFnLmlzQm9yZGVyKGxlZnQpKSB7XG4gICAgICAgIGcuc2V0KGxlZnQsICcnKTtcbiAgICAgICAgZy5zZXQobGVmdDIsICcnKTtcbiAgICAgICAgZy5zZXQobGVmdDIgLSA4IGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgICBnLnNldChsZWZ0MiAtIDB4ODAwIGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgICBnLnNldChsZWZ0MiArIDB4ODAwIGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgfVxuICAgICAgaWYgKCFnLmlzQm9yZGVyKHJpZ2h0KSkge1xuICAgICAgICBnLnNldChyaWdodCwgJycpO1xuICAgICAgICBnLnNldChyaWdodDIsICcnKTtcbiAgICAgICAgZy5zZXQocmlnaHQyICsgOCBhcyBHcmlkQ29vcmQsICcnKTtcbiAgICAgICAgZy5zZXQocmlnaHQyIC0gMHg4MDAgYXMgR3JpZENvb3JkLCAnJyk7XG4gICAgICAgIGcuc2V0KHJpZ2h0MiArIDB4ODAwIGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgfVxuICAgICAgYS5maXhlZC5hZGQobWlkZGxlKTtcbiAgICAgIGEuZml4ZWQuYWRkKHVwKTtcbiAgICAgIGEuZml4ZWQuYWRkKGRvd24pO1xuICAgICAgZy5zZXQobWlkZGxlLCAnYScpO1xuICAgICAgYXJlbmFzLS07XG4gICAgICBpZiAoIWFyZW5hcykge1xuICAgICAgICB0aGlzLnBydW5lRGlzY29ubmVjdGVkKGEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy9jb25zb2xlLmVycm9yKCdjb3VsZCBub3QgYWRkIGFyZW5hJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBXYXRlcmZhbGxSaXZlckNhdmVTaHVmZmxlIGV4dGVuZHMgUml2ZXJDYXZlU2h1ZmZsZSB7XG5cbiAgYWRkQmxvY2tzID0gZmFsc2U7XG5cbiAgaW5pdGlhbEZpbGxFYXJseShhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBjb25zdCBnID0gbmV3IE1vbm9ncmlkKGEuaCwgYS53LCB0aGlzLmdldFZhbGlkRWFybHlTY3JlZW5zKCkpO1xuICAgIGNvbnN0IHgwID0gMiArIHRoaXMucmFuZG9tLm5leHRJbnQoYS53IC0gNCk7XG4gICAgY29uc3QgeDEgPSAyICsgdGhpcy5yYW5kb20ubmV4dEludChhLncgLSA0KTtcbiAgICBjb25zdCBjID0gbmV3IEN1cnNvcihnLCBhLmggLSAxLCB4MSk7XG4gICAgYy5nbygwKTtcbiAgICBjLmRpcmVjdGVkUGF0aCh0aGlzLnJhbmRvbSwgMSwgeDApO1xuICAgIGMuZ28oMCk7XG5cbiAgICBhLmdyaWQuZGF0YSA9IGcudG9HcmlkKCdyJykuZGF0YTtcbiAgICB0aGlzLmFkZEFsbEZpeGVkKGEpO1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGFkZEVkZ2VzKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGxldCByID0gLTE7XG4gICAgY29uc3QgaCA9IChhLmggLSAxKSA8PCAxMiB8IDB4ODA4O1xuICAgIGZvciAobGV0IHggPSAwOyB4IDwgYS53OyB4KyspIHtcbiAgICAgIGlmIChhLmdyaWQuZ2V0KChoIHwgKHggPDwgNCkpIGFzIEdyaWRDb29yZCkgPT09ICdyJykgciA9IHg7XG4gICAgfVxuICAgIGlmIChyIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBubyByaXZlciBvbiBib3R0b20gZWRnZWApO1xuICAgIGNvbnN0IGMwID0gKGggfCB0aGlzLnJhbmRvbS5uZXh0SW50KHIpIDw8IDQpIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBjMSA9XG4gICAgICAgIChoIHwgKHIgKyAxICsgdGhpcy5yYW5kb20ubmV4dEludChhLncgLSAxIC0gcikpIDw8IDQpIGFzIEdyaWRDb29yZDtcbiAgICBhLmdyaWQuc2V0KGMwLCAnPicpO1xuICAgIGEuZ3JpZC5zZXQoYzAgLSA4IGFzIEdyaWRDb29yZCwgJycpO1xuICAgIGEuZ3JpZC5zZXQoYzAgKyA4IGFzIEdyaWRDb29yZCwgJycpO1xuICAgIGEuZ3JpZC5zZXQoYzEsICc+Jyk7XG4gICAgYS5ncmlkLnNldChjMSAtIDggYXMgR3JpZENvb3JkLCAnJyk7XG4gICAgYS5ncmlkLnNldChjMSArIDggYXMgR3JpZENvb3JkLCAnJyk7XG4gICAgYS5maXhlZC5hZGQoYzApO1xuICAgIGEuZml4ZWQuYWRkKGMxKTtcbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBhZGRTdGFpcnMoKTogUmVzdWx0PHZvaWQ+IHsgcmV0dXJuIE9LOyB9XG5cbiAgY2hlY2tNZXRhKG1ldGE6IE1ldGFsb2NhdGlvbiwgcmVwbD86IE1hcDxQb3MsIE1ldGFzY3JlZW4+KTogYm9vbGVhbiB7XG4gICAgY29uc3Qgb3B0cyA9IHJlcGwgPyB7ZmxpZ2h0OiB0cnVlLCB3aXRoOiByZXBsfSA6IHtmbGlnaHQ6IHRydWV9O1xuICAgIGNvbnN0IHBhcnRzID0gbWV0YS50cmF2ZXJzZShvcHRzKTtcbiAgICByZXR1cm4gbmV3IFNldChwYXJ0cy52YWx1ZXMoKSkuc2l6ZSA9PT0gdGhpcy5tYXhQYXJ0aXRpb25zO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBPYXNpc0VudHJhbmNlQ2F2ZVNodWZmbGUgZXh0ZW5kcyBDYXZlU2h1ZmZsZSB7XG5cbiAgYWRkQmxvY2tzID0gZmFsc2U7XG5cbiAgLy8gbmV3IHBsYW46IGluZGV4IHZhbGlkIHNwaWtlIHNjcmVlbnMsIGFjY3JldGUgYSBsaW5lL2N1cnZlIG9mIHRoZW1cbiAgLy8gc29tZXdoZXJlIHJhbmRvbSAoY29uc2lkZXIgYWRkaW5nIHNwaWtlIGN1cnZlcz8pLCB3aXRoIHJhbmRvbSBjYXZlc1xuICAvLyBzdGlja2luZyBvdXQuICBDYXAgdGhlIGVuZCBvZiB0aGUgc3Bpa2UgYW5kIGFjY3JldGUgYSByYW5kb20gcml2ZXJcbiAgLy8gc29tZXdoZXJlIChtYXkgbmVlZCB0byBpbmNyZWFzZSB3aWR0aCkuICBUaGVuIGFjY3JldGUgY2F2ZXMsIGZpbGxcbiAgLy8gaW4gc3RhaXJzLCBldGMuXG5cbiAgcGlja1dpZHRoKCkge1xuICAgIHJldHVybiBzdXBlci5waWNrV2lkdGgoKSArIHRoaXMucmFuZG9tLm5leHRJbnQoMik7XG4gIH1cblxuICBpbml0aWFsRmlsbChhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBtdWx0aW1hcCBvZiBkaXJlY3Rpb24gbWFza3MgdG8gdGlsZSBzdHJpbmdzLlxuICAgIGNvbnN0IHNwaWtlcyA9IG5ldyBEZWZhdWx0TWFwPG51bWJlciwgc3RyaW5nW10+KCgpID0+IFtdKTtcbiAgICBmb3IgKGNvbnN0IHNjciBvZiB0aGlzLm9yaWcudGlsZXNldCkge1xuICAgICAgaWYgKCFzY3IuaGFzRmVhdHVyZSgnc3Bpa2VzJykgfHwgIXNjci5kYXRhLmVkZ2VzKSBjb250aW51ZTtcbiAgICAgIGxldCBtYXNrID0gMDtcbiAgICAgIGZvciAobGV0IGRpciA9IDA7IGRpciA8IDQ7IGRpcisrKSB7XG4gICAgICAgIGlmIChzY3IuZGF0YS5lZGdlc1tkaXJdID09PSAncycpIG1hc2sgfD0gKDEgPDwgZGlyKTtcbiAgICAgIH1cbiAgICAgIHNwaWtlcy5nZXQobWFzaykucHVzaCguLi5zY3IuZ3JpZFRpbGVzKCkpO1xuICAgIH1cbiAgICAvLyBzdGFydCBhY2NyZXRpbmcuXG4gICAgY29uc3QgeCA9IDEgKyB0aGlzLnJhbmRvbS5uZXh0SW50KGEudyAtIDIpO1xuICAgIGNvbnN0IHkgPSAxICsgdGhpcy5yYW5kb20ubmV4dEludChhLmggLSAyKTtcbiAgICBsZXQgcG9zID0geSA8PCA0IHwgeDtcbiAgICBsZXQgYyA9IHRoaXMucG9zVG9HcmlkKHBvcywgMHg4MDgpO1xuICAgIGxldCBkaXIgPSB5IDwgYS5oIC8gMiA/IDIgOiAwO1xuICAgIHRoaXMuaW5zZXJ0VGlsZShhLCBwb3MsIHRoaXMucmFuZG9tLnBpY2soc3Bpa2VzLmdldCgxIDw8IGRpcikpKTtcbiAgICBmb3IgKGxldCBpID0gNDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIC8vIGFkdmFuY2UgdGhlIHBvc2l0aW9uLlxuICAgICAgcG9zICs9IERQT1NbZGlyXTtcbiAgICAgIGMgPSBjICsgREdSSURbZGlyXSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCBvcHAgPSBkaXIgXiAyO1xuICAgICAgY29uc3QgbWFza3M6IG51bWJlcltdID0gW107XG4gICAgICBmb3IgKGNvbnN0IFtkLCB0c10gb2Ygc3Bpa2VzKSB7XG4gICAgICAgIGlmICghKGQgJiAoMSA8PCBvcHApKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IHJlbSA9IGQgJiB+KDEgPDwgb3BwKTtcbiAgICAgICAgaWYgKGkgPyAhcmVtIDogcmVtKSBjb250aW51ZTtcbiAgICAgICAgZm9yIChjb25zdCBfIG9mIHRzKSBtYXNrcy5wdXNoKGQpO1xuICAgICAgfVxuICAgICAgbGV0IG5leHREaXI6IG51bWJlcnx1bmRlZmluZWQ7XG4gICAgICBmb3IgKGNvbnN0IGQgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUobWFza3MpKSB7XG4gICAgICAgIGlmIChhLmdyaWQuaXNCb3JkZXIoYyArIERHUklEW2RdIGFzIEdyaWRDb29yZCkpIGNvbnRpbnVlO1xuICAgICAgICBpZiAodGhpcy5pbnNlcnRUaWxlKGEsIHBvcywgdGhpcy5yYW5kb20ucGljayhzcGlrZXMuZ2V0KGQpKSkpIHtcbiAgICAgICAgICBuZXh0RGlyID0gMzEgLSBNYXRoLmNsejMyKGQgJiB+KDEgPDwgb3BwKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChuZXh0RGlyID09IG51bGwpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgc3Bpa2VzYH07XG4gICAgICBkaXIgPSBuZXh0RGlyO1xuICAgIH1cblxuICAgIC8vIE5vdyBhZGQgc29tZSByaXZlciB0aWxlcy5cbiAgICBjb25zdCByaXZlclN0YXJ0OiBHcmlkQ29vcmRbXSA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAzOyB5IDwgYS5oIC0gMzsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMTsgeCA8IGEudyAtIDE7IHgrKykge1xuICAgICAgICByaXZlclN0YXJ0LnB1c2goKHkgPDwgMTIgfCB4IDw8IDQgfCAweDgwOCkgYXMgR3JpZENvb3JkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHJpdmVyU3RhcnQpKSB7XG4gICAgICBpZiAoYS5ncmlkLmdldChjKSkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IGQgb2YgREdSSUQpIHtcbiAgICAgICAgaWYgKGEuZ3JpZC5nZXQoYyArIGQgYXMgR3JpZENvb3JkKSAhPT0gJ2MnKSBjb250aW51ZTtcbiAgICAgICAgYS5ncmlkLnNldChjLCAncicpO1xuICAgICAgICBjb25zdCBvcnRob2dvbmFsID0gMHg4MDggJiB+TWF0aC5hYnMoZCk7XG4gICAgICAgIGEuZ3JpZC5zZXQoYyArIG9ydGhvZ29uYWwgYXMgR3JpZENvb3JkLCAncicpO1xuICAgICAgICBhLmdyaWQuc2V0KGMgLSBvcnRob2dvbmFsIGFzIEdyaWRDb29yZCwgJ3InKTtcbiAgICAgICAgY29uc3QgbyA9IHRoaXMucmFuZG9tLnBpY2soWy1vcnRob2dvbmFsLCBvcnRob2dvbmFsXSk7XG4gICAgICAgIGEuZ3JpZC5zZXQoYyArIDIgKiBvIGFzIEdyaWRDb29yZCwgJ3InKTtcbiAgICAgICAgYS5ncmlkLnNldChjICsgMyAqIG8gYXMgR3JpZENvb3JkLCAncicpO1xuICAgICAgICBhLmdyaWQuc2V0KGMgKyAyICogbyAtIGQgYXMgR3JpZENvb3JkLCAnYycpO1xuICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKGZvdW5kKSBicmVhaztcbiAgICB9XG4gICAgaWYgKCFmb3VuZCkgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBudWNsZWF0ZSByaXZlcmB9O1xuXG4gICAgLy8gbGV0IGF0dGVtcHRzID0gMTA7XG4gICAgLy8gZm9yIChsZXQgaSA9IDIgKyB0aGlzLnJhbmRvbS5uZXh0SW50KDIpOyBpID4gMCAmJiBhdHRlbXB0czsgaS0tKSB7XG4gICAgLy8gICBpZiAoIXRoaXMudHJ5QWRkKGEsIHtjaGFyOiAncid9KSkgKGF0dGVtcHRzLS0sIGkrKyk7XG4gICAgLy8gfVxuICAgIC8vIGlmICghYXR0ZW1wdHMpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgYWNjcmV0ZSByaXZlcmB9O1xuXG4gICAgLy8gRmluYWxseSBhZGQgc29tZSBjYXZlIHRpbGVzLlxuICAgIGZvciAobGV0IGkgPSA1ICsgdGhpcy5yYW5kb20ubmV4dEludCgzKTsgaSA+IDA7IGktLSkge1xuICAgICAgaWYgKCF0aGlzLnRyeUFkZChhLCB7Y2hhcjogJ2MnfSkpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgZmlsbCBjYXZlYH07XG4gICAgfVxuXG4gICAgLy8gTWFrZSBzdXJlIHRoZXJlJ3Mgbm90aGluZyBvbiB0aGUgYm9yZGVyLlxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhLmdyaWQuZGF0YVtpXSAmJiBhLmdyaWQuaXNCb3JkZXIoYS5ncmlkLmNvb3JkKGkgYXMgR3JpZEluZGV4KSkpIHtcbiAgICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBib3JkZXJgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBjaGVja01ldGEobWV0YTogTWV0YWxvY2F0aW9uLCByZXBsPzogTWFwPFBvcywgTWV0YXNjcmVlbj4pOiBib29sZWFuIHtcbiAgICAvLyBUT0RPIC0gcmVsZXZhbmNlIHJlcXVpcmVtZW50P1xuICAgIGNvbnN0IG9wdHMgPSByZXBsID8ge2ZsaWdodDogdHJ1ZSwgd2l0aDogcmVwbH0gOiB7ZmxpZ2h0OiB0cnVlfTtcbiAgICBjb25zdCBwYXJ0cyA9IG1ldGEudHJhdmVyc2Uob3B0cyk7XG4gICAgcmV0dXJuIG5ldyBTZXQocGFydHMudmFsdWVzKCkpLnNpemUgPT09IHRoaXMubWF4UGFydGl0aW9ucztcbiAgfVxuXG4gIHJlZmluZSgpIHsgcmV0dXJuIE9LOyB9XG4gIHJlZmluZUVkZ2VzKCkgeyByZXR1cm4gdHJ1ZTsgfVxuXG4gIGFkZFNwaWtlcyhhOiBBLCBzcGlrZXM6IG51bWJlcikge1xuICAgIHJldHVybiB0cnVlO1xuICAgIC8vIGZvciAoY29uc3QgcyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShhLmdyaWQuc2NyZWVucygpKSkge1xuICAgIC8vICAgY29uc3QgYyA9IHMgKyAweDgwOCBhcyBHcmlkQ29vcmQ7XG4gICAgLy8gICBpZiAoYS5ncmlkLmdldChjKSAhPT0gJ3InKSBjb250aW51ZTtcbiAgICAvLyAgIGZvciAoY29uc3QgZGlyIG9mIFsweDgwMCwgLTB4ODAwXSkge1xuICAgIC8vICAgICBpZiAoYS5ncmlkLmdldChjICsgZGlyIGFzIEdyaWRDb29yZCkgIT09ICdjJykgY29udGludWU7XG4gICAgLy8gICAgIGxldCBcbiAgICAvLyB9XG4gIH1cblxuICByZWZpbmVNZXRhc2NyZWVucyhhOiBBLCBtZXRhOiBNZXRhbG9jYXRpb24pOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnJlZmluZU1ldGFzY3JlZW5zKGEsIG1ldGEpO1xuICAgIGlmICghcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIC8vIFJlcXVpcmUgdGhhdCBmbGlnaHQgYmxvY2tzIGF0IGxlYXN0IG9uZSBzdGFpci5cbiAgICBmdW5jdGlvbiBhY2Nlc3NpYmxlKG1hcDogTWFwPG51bWJlciwgU2V0PG51bWJlcj4+KTogbnVtYmVyIHtcbiAgICAgIGNvbnN0IHN0YWlyUGFydHMgPVxuICAgICAgICAgIFsuLi5uZXcgU2V0KG1hcC52YWx1ZXMoKSldLmZpbHRlcihzZXQgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBzdGFpciBvZiBzZXQpIHtcbiAgICAgICAgICAgICAgaWYgKG1ldGEuZXhpdFR5cGUoc3RhaXIpPy5zdGFydHNXaXRoKCdzdGFpcicpKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9KTtcbiAgICAgIHJldHVybiBzdGFpclBhcnRzLmxlbmd0aDtcbiAgICB9XG4gICAgY29uc3QgcGFydHMxID0gYWNjZXNzaWJsZShtZXRhLnRyYXZlcnNlKCkpO1xuICAgIGNvbnN0IHBhcnRzMiA9IGFjY2Vzc2libGUobWV0YS50cmF2ZXJzZSh7ZmxpZ2h0OiB0cnVlfSkpO1xuICAgIGlmIChwYXJ0czEgPT09IHBhcnRzMikgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBmbGlnaHQgbm90IHJlcXVpcmVkYH07XG4gICAgcmV0dXJuIE9LO1xuICB9XG59XG5cbmNvbnN0IERHUklEID0gWy0weDgwMCwgLTgsIDB4ODAwLCA4XTtcbmNvbnN0IERQT1MgPSBbLTE2LCAtMSwgMTYsIDFdO1xuXG5leHBvcnQgY2xhc3MgU3R5eFJpdmVyQ2F2ZVNodWZmbGUgZXh0ZW5kcyBSaXZlckNhdmVTaHVmZmxlIHtcbiAgYWRkQmxvY2tzID0gZmFsc2U7XG5cbiAgZmlsbEdyaWQoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gbWFrZSAyIGJvdHRvbSBlZGdlIGV4aXRzXG4gICAgY29uc3QgZWRnZXM6IG51bWJlcltdID0gW107XG4gICAgbGV0IHNpemUgPSAwO1xuICAgIGZvciAoY29uc3QgeCBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShzZXEoYS53IC0gMiwgeCA9PiB4ICsgMSkpKSB7XG4gICAgICBpZiAoZWRnZXMubGVuZ3RoID09PSAxICYmICh4IC0gZWRnZXNbMF0pICoqIDIgPD0gMSkgY29udGludWU7XG4gICAgICBjb25zdCBjID0gKChhLmggLSAxKSA8PCAxMiB8IHggPDwgNCB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBhLmdyaWQuc2V0KGMsICdjJyk7XG4gICAgICBhLmdyaWQuc2V0KE4oYyksICdjJyk7XG4gICAgICBhLmdyaWQuc2V0KFMoYyksICduJyk7XG4gICAgICBhLmZpeGVkLmFkZChjKTtcbiAgICAgIGEuZml4ZWQuYWRkKE4oYykpO1xuICAgICAgYS5maXhlZC5hZGQoUyhjKSk7XG4gICAgICBlZGdlcy5wdXNoKHgpO1xuICAgICAgc2l6ZSsrO1xuICAgICAgaWYgKGVkZ2VzLmxlbmd0aCA9PT0gMikgYnJlYWs7XG4gICAgfVxuICAgIGlmIChlZGdlcy5sZW5ndGggPCAyKSByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGluaXRpYWwgZWRnZXNgfTtcbiAgICAvLyBtYWtlIGEgcml2ZXIgYWNyb3NzIHRoZSBib3R0b20uXG4gICAgbGV0IHJpdmVycyA9IGEudztcbiAgICBjb25zdCBjdXQgPVxuICAgICAgICB0aGlzLnJhbmRvbS5uZXh0SW50KE1hdGguYWJzKGVkZ2VzWzBdIC0gZWRnZXNbMV0pIC0gMSkgK1xuICAgICAgICBNYXRoLm1pbihlZGdlc1swXSwgZWRnZXNbMV0pICsgMTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IDIgKiBhLnc7IGkrKykge1xuICAgICAgaWYgKGkgPT09IDIgKiBjdXQgKyAxKSBjb250aW51ZTtcbiAgICAgIGEuZ3JpZC5zZXQoKChhLmggLSAyKSA8PCAxMiB8IGkgPDwgMyB8IDB4ODAwKSBhcyBHcmlkQ29vcmQsICdyJyk7XG4gICAgICBhLmZpeGVkLmFkZCgoKGEuaCAtIDEpIDw8IDEyIHwgaSA8PCAzIHwgMHg4MDApIGFzIEdyaWRDb29yZCk7XG4gICAgfVxuICAgIC8vIGV4dGVuZCByaXZlci5cbiAgICBjb25zdCByaXZlcnNUYXJnZXQgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcyEucml2ZXIhO1xuICAgIHdoaWxlIChyaXZlcnMgPCByaXZlcnNUYXJnZXQpIHtcbiAgICAgIGNvbnN0IGFkZGVkID0gdGhpcy50cnlBZGQoYSwge2NoYXI6ICdyJ30pO1xuICAgICAgaWYgKCFhZGRlZCkgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBmYWlsZWQgdG8gZXh0cnVkZSByaXZlclxcbiR7YS5ncmlkLnNob3coKX1gfTtcbiAgICAgIHJpdmVycyArPSBhZGRlZDtcbiAgICAgIHNpemUgKz0gYWRkZWQ7XG4gICAgfVxuICAgIC8vIGV4dHJ1ZGUgY2F2ZS5cbiAgICBjb25zdCBzaXplVGFyZ2V0ID0gdGhpcy5wYXJhbXMuc2l6ZTtcbiAgICB3aGlsZSAoc2l6ZSA8IHNpemVUYXJnZXQpIHtcbiAgICAgIGNvbnN0IGFkZGVkID0gdGhpcy50cnlBZGQoYSk7XG4gICAgICBpZiAoIWFkZGVkKSByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGZhaWxlZCB0byBleHRydWRlIGNhdmVgfTtcbiAgICAgIHNpemUgKz0gYWRkZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYWRkU3RhaXJzKGEsIC4uLih0aGlzLnBhcmFtcy5zdGFpcnMgPz8gW10pKTtcbiAgfVxuXG4gIC8vIEZsaWdodCBtYXkgYmUgcmVxdWlyZWQgZm9yIGFueXRoaW5nLlxuICBjaGVja01ldGEoKSB7IHJldHVybiB0cnVlOyB9XG5cbiAgcmVmaW5lTWV0YXNjcmVlbnMoYTogQSwgbWV0YTogTWV0YWxvY2F0aW9uKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBzdXBlci5yZWZpbmVNZXRhc2NyZWVucyhhLCBtZXRhKTtcbiAgICBpZiAoIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICAvLyBDaGVjayBzaW1wbGUgY29uZGl0aW9uczogKDEpIHRoZXJlJ3MgYW4gYWNjZXNzaWJsZSBicmlkZ2UsXG4gICAgLy8gKDIpIGZsaWdodCBpcyByZXF1aXJlZCBmb3Igc29tZSB0aWxlLlxuICAgIGZ1bmN0aW9uIGFjY2Vzc2libGUobWFwOiBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4pOiBudW1iZXIge1xuICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgIGZvciAoY29uc3Qgc2V0IG9mIG5ldyBTZXQobWFwLnZhbHVlcygpKSkge1xuICAgICAgICBmb3IgKGNvbnN0IGVkZ2Ugb2Ygc2V0KSB7XG4gICAgICAgICAgLy8gb25seSBjaGVjayBhY2Nlc3NpYmlsaXR5IGZyb20gYm90dG9tIGVkZ2UuXG4gICAgICAgICAgaWYgKG1ldGEuZXhpdFR5cGUoZWRnZSkgPT09ICdlZGdlOmJvdHRvbScpIHtcbiAgICAgICAgICAgIGNvdW50ICs9IHNldC5zaXplO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gY291bnQ7XG4gICAgfVxuICAgIGNvbnN0IHBhcnRzMSA9IGFjY2Vzc2libGUobWV0YS50cmF2ZXJzZSh7bm9GbGFnZ2VkOiB0cnVlfSkpO1xuICAgIGNvbnN0IHBhcnRzMiA9IGFjY2Vzc2libGUobWV0YS50cmF2ZXJzZSgpKTtcbiAgICBpZiAocGFydHMxID09PSBwYXJ0czIpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgYnJpZGdlIGRpZG4ndCBtYXR0ZXJgfTtcbiAgICBjb25zdCBwYXJ0czMgPSBhY2Nlc3NpYmxlKG1ldGEudHJhdmVyc2Uoe2ZsaWdodDogdHJ1ZX0pKTtcbiAgICBpZiAocGFydHMyID09PSBwYXJ0czMpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgZmxpZ2h0IG5vdCByZXF1aXJlZGB9O1xuICAgIHJldHVybiBPSztcbiAgfVxufVxuXG5cbmV4cG9ydCBjbGFzcyBPYXNpc0NhdmVTaHVmZmxlIGV4dGVuZHMgUml2ZXJDYXZlU2h1ZmZsZSB7XG5cbiAgcmVhZG9ubHkgcGF0dGVybiA9IFtcbiAgICAnICAgICAgICAgICAgICAgJyxcbiAgICAnIHJycnJycnJycnJycnIgJyxcbiAgICAnIHIgICAgICAgICAgIHIgJyxcbiAgICAnIHIgcnJycnJycnJyIHIgJyxcbiAgICAnIHIgciAgICAgICByIHIgJyxcbiAgICAnIHIgciBycnJyciByIHIgJyxcbiAgICAnIHIgciByICAgciByIHIgJyxcbiAgICAnIHIgciByICAgciByIHIgJyxcbiAgICAnIHIgciByICAgciByIHIgJyxcbiAgICAnIHIgciByIDwgciByIHIgJyxcbiAgICAnIHIgciByIGMgciByIHIgJyxcbiAgICAnIHIgciBycnJyciByIHIgJyxcbiAgICAnIHIgciAgICAgICByIHIgJyxcbiAgICAnIHIgcnJycnJycnJyIHIgJyxcbiAgICAnIHIgICAgICAgICAgIHIgJyxcbiAgICAnIHJycnJycnJycnJycnIgJyxcbiAgICAnICAgICAgICAgICAgICAgJyxcbiAgXTtcblxuICBpbml0aWFsRmlsbChhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBJbml0aWFsIGZpbGw6IG1ha2Ugc3VyZSB0aGVyZSdzIGVub3VnaCByb29tIGFuZCB0aGVuIGNvcHkgdGhlIHBhdHRlcm4uXG4gICAgcmV0dXJuIHRoaXMuaW5zZXJ0UGF0dGVybihhLCB0aGlzLnBhdHRlcm4pO1xuICB9XG5cbiAgYWRkRWRnZXMoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gRmluZCB0aGUgdG9wLWxlZnQgY29ybmVyIChUT0RPIC0gc2F2ZSB0aGlzIHNvbWV3aGVyZT8pXG4gICAgbGV0IGNvcm5lciE6IEdyaWRDb29yZDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGEuZ3JpZC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYS5ncmlkLmRhdGFbaV0gPT09ICdyJykge1xuICAgICAgICBjb3JuZXIgPSBhLmdyaWQuY29vcmQoaSBhcyBHcmlkSW5kZXgpIC0gMHg4MDggYXMgR3JpZENvb3JkO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNvcm5lciA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYG5vIGNvcm5lcmApO1xuXG4gICAgY29uc3QgZWRnZXM6IEdyaWRDb29yZFtdID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLnBhdHRlcm4ubGVuZ3RoOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAxOyB4IDwgdGhpcy5wYXR0ZXJuW3ldLmxlbmd0aCAtIDE7IHgrKykge1xuICAgICAgICBpZiAoISgoeCBeIHkpICYgMSkpIGNvbnRpbnVlO1xuICAgICAgICBpZiAodGhpcy5wYXR0ZXJuW3ldW3hdICE9PSAnICcpIGNvbnRpbnVlO1xuICAgICAgICBlZGdlcy5wdXNoKGNvcm5lciArICh5IDw8IDExIHwgeCA8PCAzKSBhcyBHcmlkQ29vcmQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBjaGFycyA9IHRoaXMucmFuZG9tLnNodWZmbGUoWy4uLidjY3JycnJycnJyJ10pO1xuICAgIGZvciAoY29uc3QgZWRnZSBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShlZGdlcykpIHtcbiAgICAgIGNvbnN0IGNoYXIgPSBjaGFyc1tjaGFycy5sZW5ndGggLSAxXTtcbiAgICAgIC8vIGRvbid0IHBsYWNlIGNhdmVzIG9uIHRoZSBvdXRlciBib3VuZGFyeS5cbiAgICAgIGlmIChjaGFyID09PSAnYycgJiZcbiAgICAgICAgICBbLi4udGhpcy5leHRyYWN0KGEuZ3JpZCwgZWRnZSAtIDB4ODA4IGFzIEdyaWRDb29yZCldXG4gICAgICAgICAgICAgIC5maWx0ZXIodiA9PiB2ID09PSAncicpLmxlbmd0aCA8IDQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5jYW5TZXQoYSwgZWRnZSwgY2hhcikpIGEuZ3JpZC5zZXQoZWRnZSwgY2hhcnMucG9wKCkhKTtcbiAgICAgIGlmICghY2hhcnMubGVuZ3RoKSBicmVhaztcbiAgICB9XG5cbiAgICAvLyBBZGQgYSBmZXcgZXh0cmEgJ2MnIHRpbGVzLlxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNjsgaSsrKSB7XG4gICAgICB0aGlzLnRyeUFkZChhLCB7Y2hhcjogJ2MnfSk7XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIHJlZmluZShhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBBZGQgc3RhaXJzLlxuICAgIGNvbnN0IHN0YWlycyA9IFsuLi4odGhpcy5wYXJhbXMuc3RhaXJzID8/IFtdKV07XG4gICAgc3RhaXJzWzBdLS07XG4gICAgaWYgKHN0YWlyc1swXSB8fCBzdGFpcnNbMV0pIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYWRkU3RhaXJzKGEsIC4uLnN0YWlycyk7XG4gICAgICBpZiAoIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgLy8gRmluZCB0d28gY2F2ZSBkZWFkIGVuZHMgYW5kIHRyeSB0byBwaW4gdGhlbSAoPylcbiAgICBsZXQgZGVhZEVuZHMgPSAwO1xuICAgIGZvciAoY29uc3QgcyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShhLmdyaWQuc2NyZWVucygpKSkge1xuICAgICAgaWYgKHRoaXMuZXh0cmFjdChhLmdyaWQsIHMpLnJlcGxhY2UoLyAvZywgJycpID09PSAnYycpIHtcbiAgICAgICAgaWYgKHN0YWlyc1swXSAmJiAhYS5ncmlkLmdldChzICsgOCBhcyBHcmlkQ29vcmQpKSB7XG4gICAgICAgICAgYS5ncmlkLnNldChzICsgMHg4MDggYXMgR3JpZENvb3JkLCAnPCcpO1xuICAgICAgICAgIHN0YWlyc1swXS0tO1xuICAgICAgICB9XG4gICAgICAgIGEuZml4ZWQuYWRkKHMgKyAweDgwOCBhcyBHcmlkQ29vcmQpO1xuICAgICAgICBpZiAoKytkZWFkRW5kcyA+PSAyKSBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gTWFrZSBzdXJlIGl0J3MgdHJhdmVyc2libGUuXG4gICAgY29uc3QgcGFydHMgPSBhLmdyaWQucGFydGl0aW9uKCk7XG4gICAgaWYgKG5ldyBTZXQocGFydHMudmFsdWVzKCkpLnNpemUgPiAxKSByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYG9ycGhhbnNgfTtcbiAgICAvLyAvLyBMb29rIGZvciBlZGdlcyB3ZSBjYW4gZGVsZXRlIGFuZCBub3QgYWN0dWFsbHkgY3V0IGFueXRoaW5nIG9mZi5cbiAgICAvLyBmb3IgKGNvbnN0IGkgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoc2VxKGEuZ3JpZC5kYXRhLmxlbmd0aCkpKSB7XG4gICAgLy8gICBjb25zdCBjID0gYS5ncmlkLmNvb3JkKGkgYXMgR3JpZEluZGV4KTtcbiAgICAvLyAgIGlmICghKChjIF4gKGMgPj4gOCkpICYgOCkpIGNvbnRpbnVlOyAvLyBvbmx5IGxvb2sgYXQgZWRnZXNcbiAgICAvLyAgIGlmICghYS5ncmlkLmRhdGFbaV0pIGNvbnRpbnVlO1xuICAgIC8vIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBmaWxsR3JpZChhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBsZXQgcmVzdWx0OiBSZXN1bHQ8dm9pZD47XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLmluaXRpYWxGaWxsKGEpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuYWRkRWRnZXMoYSkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5yZWZpbmUoYSkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIC8vIEZsaWdodCBtYXkgYmUgcmVxdWlyZWQgZm9yIGFueXRoaW5nLlxuICBjaGVja01ldGEobWV0YTogTWV0YWxvY2F0aW9uLCByZXA/OiBNYXA8UG9zLCBNZXRhc2NyZWVuPikge1xuICAgIGNvbnN0IHBhcnRzID0gbWV0YS50cmF2ZXJzZShyZXAgPyB7d2l0aDogcmVwfSA6IHt9KTtcbiAgICBjb25zdCBhbGxTdGFpcnM6IG51bWJlcltdID0gW107XG4gICAgZm9yIChjb25zdCBlZGdlcyBvZiBuZXcgU2V0KHBhcnRzLnZhbHVlcygpKSkge1xuICAgICAgbGV0IHN0YWlycyA9IDA7XG4gICAgICBmb3IgKGNvbnN0IGVkZ2Ugb2YgbmV3IFNldChbLi4uZWRnZXNdKSkge1xuICAgICAgICAvLyBOT1RFOiBwb3MgY2FuIGJlIG9mZiB0aGUgcmlnaHQgb3IgYm90dG9tIGVkZ2VcbiAgICAgICAgaWYgKG1ldGEuZXhpdFR5cGUoZWRnZSkpIHN0YWlycysrO1xuICAgICAgfVxuICAgICAgYWxsU3RhaXJzLnB1c2goc3RhaXJzKTtcbiAgICB9XG4gICAgcmV0dXJuIGFsbFN0YWlycy5maWx0ZXIocyA9PiBzID4gMCkubGVuZ3RoID09PSAxO1xuICB9XG5cbiAgcmVmaW5lTWV0YXNjcmVlbnMoYTogQSwgbWV0YTogTWV0YWxvY2F0aW9uKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuY2hlY2tNZXRhKG1ldGEpKSByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGluaXRpYWwgY2hlY2tNZXRhYH07XG4gICAgY29uc3QgcmVzdWx0ID0gc3VwZXIucmVmaW5lTWV0YXNjcmVlbnMoYSwgbWV0YSk7XG4gICAgaWYgKCFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG5cbiAgICAvLyBDaGVjayB0aGF0IGZsaWdodCBpcyByZXF1aXJlZCBmb3Igc29tZSB0aWxlLlxuICAgIC8vIFRPRE8gLSBiaWFzIGEgUE9JIHRvIGJlIG9uIHRoYXQgdGlsZSFcbiAgICBmdW5jdGlvbiBhY2Nlc3NpYmxlKG1hcDogTWFwPG51bWJlciwgU2V0PG51bWJlcj4+KTogbnVtYmVyIHtcbiAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICBmb3IgKGNvbnN0IHNldCBvZiBuZXcgU2V0KG1hcC52YWx1ZXMoKSkpIHtcbiAgICAgICAgZm9yIChjb25zdCBlZGdlIG9mIHNldCkge1xuICAgICAgICAgIGlmIChtZXRhLmV4aXRUeXBlKGVkZ2UpKSB7XG4gICAgICAgICAgICBjb3VudCArPSBzZXQuc2l6ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGNvdW50O1xuICAgIH1cbiAgICBjb25zdCBwYXJ0czEgPSBhY2Nlc3NpYmxlKG1ldGEudHJhdmVyc2UoKSk7XG4gICAgY29uc3QgcGFydHMyID0gYWNjZXNzaWJsZShtZXRhLnRyYXZlcnNlKHtmbGlnaHQ6IHRydWV9KSk7XG4gICAgaWYgKHBhcnRzMSA9PT0gcGFydHMyKSByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGZsaWdodCBub3QgcmVxdWlyZWRgfTtcblxuICAgIHJldHVybiBPSztcbiAgfVxufVxuIl19