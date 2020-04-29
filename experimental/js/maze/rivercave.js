import { CaveShuffle } from './cave.js';
import { N, S, Grid } from './grid.js';
import { Monogrid, Cursor } from './monogrid.js';
import { OK } from './maze.js';
import { TwoStageCaveShuffle } from './twostage.js';
import { seq } from '../rom/util.js';
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
            return { ok: false, fail: `river didn't matter` };
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
export class StyxRiverCaveShuffle2 extends RiverCaveShuffle {
    constructor() {
        super(...arguments);
        this.maxAttempts = 250;
    }
    refineMetascreens(a, meta) {
        let result = super.refineMetascreens(a, meta);
        if (!result.ok)
            return result;
        for (const pos of meta.allPos()) {
            const scr = meta.get(pos);
            const edge = scr.edgeIndex('r');
            let deadEnd;
            if (edge === 5) {
                deadEnd = meta.rom.metascreens.riverCave_deadEndsNS;
            }
            else if (edge === 10) {
                deadEnd = meta.rom.metascreens.riverCave_deadEndsWE;
            }
            if (!deadEnd)
                continue;
            const repl = new Map([[pos, deadEnd]]);
            const fly = meta.traverse({ with: repl, flight: true });
            const flySets = new Set(fly.values());
            if (flySets.size !== 2)
                continue;
            const edges = [...meta.exits()].filter(e => e[1] === 'edge:bottom').map(e => e[0]);
            if (edges.length !== 2)
                throw new Error(`bad edges`);
            if (fly.get(edges[0]) === fly.get(edges[1]))
                continue;
            const nofly = meta.traverse({ with: repl, flight: false });
            const noflySets = new Set(nofly.values());
            if (noflySets.size < 3)
                continue;
            meta.set(pos, deadEnd);
            return OK;
        }
        return { ok: false, fail: `could not split map into two\n${meta.show()}` };
    }
}
export class StyxRiverCaveShuffle3 extends CaveShuffle {
    constructor() {
        super(...arguments);
        this.maxPartitions = 3;
    }
    fillGrid(a) {
        var _a;
        const edges = [];
        let size = 0;
        for (const x of this.random.ishuffle(seq(a.w - 2, x => x + 1))) {
            if (edges.length === 1 && (x - edges[0]) ** 2 === 1)
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
        let rivers = a.w;
        for (let i = 1; i < 2 * a.w; i++) {
            a.grid.set(((a.h - 2) << 12 | i << 3 | 0x800), 'r');
        }
        const cut = this.random.nextInt(Math.abs(edges[0] - edges[1]) - 1) +
            Math.min(edges[0], edges[1]) + 1;
        a.grid.set(((a.h - 1) << 12 | cut << 4 | 0x808), '');
        const riversTarget = this.params.features.river;
        while (rivers < riversTarget) {
            const added = this.tryExtrude(a, 'r', riversTarget - rivers, 1);
            if (!added)
                return { ok: false, fail: `failed to extrude river\n${a.grid.show()}` };
            rivers += added;
            size += added;
        }
        const sizeTarget = this.params.size;
        while (size < sizeTarget) {
            const added = this.tryExtrude(a, 'c', sizeTarget - size, 10);
            if (!added)
                return { ok: false, fail: `failed to extrude cave` };
            size += added;
        }
        return this.addStairs(a, ...((_a = this.params.stairs) !== null && _a !== void 0 ? _a : []));
    }
    refineMetascreens(a, meta) {
        let result = super.refineMetascreens(a, meta);
        if (!result.ok)
            return result;
        for (const pos of meta.allPos()) {
            const scr = meta.get(pos);
            const edge = scr.edgeIndex('r');
            let deadEnd;
            if (edge === 5) {
                deadEnd = meta.rom.metascreens.riverCave_deadEndsNS;
            }
            else if (edge === 10) {
                deadEnd = meta.rom.metascreens.riverCave_deadEndsWE;
            }
            if (!deadEnd)
                continue;
            const repl = new Map([[pos, deadEnd]]);
            const fly = meta.traverse({ with: repl, flight: true });
            const flySets = new Set(fly.values());
            if (flySets.size !== 2)
                continue;
            const edges = [...meta.exits()].filter(e => e[1] === 'edge:bottom').map(e => e[0]);
            if (edges.length !== 2)
                throw new Error(`bad edges`);
            if (fly.get(edges[0]) === fly.get(edges[1]))
                continue;
            const nofly = meta.traverse({ with: repl, flight: false });
            const noflySets = new Set(nofly.values());
            if (noflySets.size < 3)
                continue;
            meta.set(pos, deadEnd);
            return OK;
        }
        return { ok: false, fail: `could not split map into two\n${meta.show()}` };
    }
}
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
        const ph = (this.pattern.length - 1) >>> 1;
        const pw = (this.pattern[0].length - 1) >>> 1;
        if (a.h < ph)
            return { ok: false, fail: `too short` };
        if (a.w < pw)
            return { ok: false, fail: `too narrow` };
        const y0 = this.random.nextInt(a.h - ph - 1);
        const x0 = this.random.nextInt(a.w - pw - 1);
        const c0 = (y0 + 1) << 12 | (x0 + 1) << 4;
        Grid.writeGrid2d(a.grid, c0, this.pattern);
        for (let y = 0x3000; y <= 0x5000; y += 0x800) {
            for (let x = 0x30; x <= 0x40; x += 0x8) {
                a.fixed.add(c0 + (y | x));
            }
        }
        return OK;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicml2ZXJjYXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL21hemUvcml2ZXJjYXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBc0IsV0FBVyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQzVELE9BQU8sRUFBd0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDakQsT0FBTyxFQUFVLEVBQUUsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUd2QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDcEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBSXJDLE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxtQkFBbUI7SUFBekQ7O1FBWUUsVUFBSyxHQUFHLEdBQUcsQ0FBQztRQUNaLGdCQUFXLEdBQUcsR0FBRyxDQUFDO0lBNkhwQixDQUFDO0lBMUhDLFdBQVcsaUJBQUssbUJBQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLDBDQUFFLEtBQUssbUNBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQTJDMUQsUUFBUSxDQUFDLENBQUk7UUFFWCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUM7WUFBRSxPQUFPLEVBQUUsQ0FBQztRQUNqRCxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBcUIsQ0FBQztRQUM5QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3hELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRztnQkFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQy9EO1FBQ0QsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekMsTUFBTSxVQUFVLEdBQWMsRUFBRSxDQUFDO1FBQ2pDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDeEQsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRztnQkFDaEQsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3hELFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDN0M7U0FDRjtRQUNELElBQUksSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUU7WUFFaEQsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFDLENBQUM7U0FDakQ7UUFDRCxPQUFPLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUVELGVBQWUsQ0FBQyxDQUFJO1FBR2xCLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVELFNBQVMsQ0FBQyxDQUFJLEVBQUUsTUFBYztRQU01QixJQUFJLENBQUMsTUFBTTtZQUFFLE9BQU8sSUFBSSxDQUFDO1FBQ3pCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDakIsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUU7WUFDdEQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFjLENBQUM7WUFDeEMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFjLENBQUM7WUFDdkMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFjLENBQUM7WUFDdEMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFjLENBQUM7WUFDeEMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFjLENBQUM7WUFDeEMsTUFBTSxFQUFFLEdBQUcsTUFBTSxHQUFHLEtBQWtCLENBQUM7WUFDdkMsTUFBTSxJQUFJLEdBQUcsTUFBTSxHQUFHLEtBQWtCLENBQUM7WUFDekMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUc7Z0JBQUUsU0FBUztZQUNwQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssR0FBRztnQkFBRSxTQUFTO1lBQ2hDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHO2dCQUFFLFNBQVM7WUFDbEMsTUFBTSxRQUFRLEdBQ1YsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxLQUFLLEdBQUcsS0FBa0IsQ0FBQyxDQUFDO1lBQ3hFLE1BQU0sU0FBUyxHQUNYLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLEtBQWtCLENBQUMsQ0FBQztZQUMxRSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztnQkFBRSxTQUFTO1lBQ2pELElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNyQixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDaEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2pCLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDbEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsS0FBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDdEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsS0FBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUN2QztZQUNELElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN0QixDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDakIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2xCLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDbkMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsS0FBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDdkMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsS0FBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUN4QztZQUNELENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2hCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xCLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLE1BQU0sRUFBRSxDQUFDO1lBQ1QsSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDWCxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7U0FDRjtRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLHlCQUEwQixTQUFRLGdCQUFnQjtJQUEvRDs7UUFFRSxjQUFTLEdBQUcsS0FBSyxDQUFDO0lBNENwQixDQUFDO0lBMUNDLGdCQUFnQixDQUFDLENBQUk7UUFDbkIsTUFBTSxDQUFDLEdBQUcsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUM7UUFDOUQsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDNUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDUixDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFUixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVELFFBQVEsQ0FBQyxDQUFJO1FBQ1gsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDWCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQztRQUNsQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM1QixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFjLENBQUMsS0FBSyxHQUFHO2dCQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDNUQ7UUFDRCxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBYyxDQUFDO1FBQzFELE1BQU0sRUFBRSxHQUNKLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBYyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNwQixDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFjLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFjLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoQixDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoQixPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFFRCxTQUFTLEtBQW1CLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUV4QyxTQUFTLENBQUMsSUFBa0IsRUFBRSxJQUEyQjtRQUN2RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDO1FBQ2hFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUM3RCxDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsZ0JBQWdCO0lBQTNEOztRQWVFLGdCQUFXLEdBQUcsR0FBRyxDQUFDO0lBc0NwQixDQUFDO0lBcENDLGlCQUFpQixDQUFDLENBQUksRUFBRSxJQUFrQjtRQUN4QyxJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUFFLE9BQU8sTUFBTSxDQUFDO1FBRzlCLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQy9CLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDMUIsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoQyxJQUFJLE9BQTZCLENBQUM7WUFDbEMsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFO2dCQUNkLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQzthQUNyRDtpQkFBTSxJQUFJLElBQUksS0FBSyxFQUFFLEVBQUU7Z0JBQ3RCLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQzthQUNyRDtZQUNELElBQUksQ0FBQyxPQUFPO2dCQUFFLFNBQVM7WUFDdkIsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFHdkMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7WUFDdEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDdEMsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUM7Z0JBQUUsU0FBUztZQUNqQyxNQUFNLEtBQUssR0FDUCxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDO2dCQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDckQsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUFFLFNBQVM7WUFHdEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7WUFDekQsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDMUMsSUFBSSxTQUFTLENBQUMsSUFBSSxHQUFHLENBQUM7Z0JBQUUsU0FBUztZQUVqQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN2QixPQUFPLEVBQUUsQ0FBQztTQUNYO1FBQ0QsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGlDQUFpQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBQyxDQUFDO0lBQzNFLENBQUM7Q0FDRjtBQUdELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxXQUFXO0lBQXREOztRQUNFLGtCQUFhLEdBQUcsQ0FBQyxDQUFDO0lBd0ZwQixDQUFDO0lBckZDLFFBQVEsQ0FBQyxDQUFJOztRQUVYLE1BQU0sS0FBSyxHQUFhLEVBQUUsQ0FBQztRQUMzQixJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7UUFDYixLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzlELElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7Z0JBQUUsU0FBUztZQUM5RCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQWMsQ0FBQztZQUMxRCxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3RCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN0QixDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNmLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xCLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDZCxJQUFJLEVB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eEMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1lBQUUsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFDLENBQUM7UUFDekUsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNoRCxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFBRSxPQUFPLE1BQU0sQ0FBQztRQUk5QixTQUFTLFVBQVUsQ0FBQyxHQUE2QjtZQUMvQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7WUFDZCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFO2dCQUN2QyxLQUFLLE1BQU0sSUFBSSxJQUFJLEdBQUcsRUFBRTtvQkFDdEIsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUN2QixLQUFLLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQzt3QkFDbEIsTUFBTTtxQkFDUDtpQkFDRjthQUNGO1lBQ0QsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQztRQUN6RCxJQUFJLE1BQU0sS0FBSyxNQUFNO1lBQUUsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFDLENBQUM7UUFFdkUsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDYXZlU2h1ZmZsZUF0dGVtcHQsIENhdmVTaHVmZmxlIH0gZnJvbSAnLi9jYXZlLmpzJztcbmltcG9ydCB7IEdyaWRDb29yZCwgR3JpZEluZGV4LCBOLCBTLCBHcmlkIH0gZnJvbSAnLi9ncmlkLmpzJztcbmltcG9ydCB7IE1vbm9ncmlkLCBDdXJzb3IgfSBmcm9tICcuL21vbm9ncmlkLmpzJztcbmltcG9ydCB7IFJlc3VsdCwgT0sgfSBmcm9tICcuL21hemUuanMnO1xuaW1wb3J0IHsgTWV0YWxvY2F0aW9uLCBQb3MgfSBmcm9tICcuLi9yb20vbWV0YWxvY2F0aW9uLmpzJztcbmltcG9ydCB7IE1ldGFzY3JlZW4gfSBmcm9tICcuLi9yb20vbWV0YXNjcmVlbi5qcyc7XG5pbXBvcnQgeyBUd29TdGFnZUNhdmVTaHVmZmxlIH0gZnJvbSAnLi90d29zdGFnZS5qcyc7XG5pbXBvcnQgeyBzZXEgfSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5cbnR5cGUgQSA9IENhdmVTaHVmZmxlQXR0ZW1wdDtcblxuZXhwb3J0IGNsYXNzIFJpdmVyQ2F2ZVNodWZmbGUgZXh0ZW5kcyBUd29TdGFnZUNhdmVTaHVmZmxlIHtcbiAgLy8gYmFzaWMgcHJvYmxlbTogbWlzc2luZyB8LSBhbmQgLXwgcGllY2VzLlxuICAvLyAgb25lIHNvbHV0aW9uIHdvdWxkIGJlIHRvIGp1c3QgYWRkIHRoZW1cbiAgLy8gIG91dHNpZGUgb2YgdGhhdCwgd2UgbmVlZCB0byBzd2l0Y2ggdG8gYSBwYXRoZ2VuIGFsZ28gcmF0aGVyXG4gIC8vICB0aGFuIHJlZmluZW1lbnRcblxuICAvLyBzaW1wbGUgcGF0aGdlbiBzaG91bGQgYmUgcHJldHR5IGVhc3kgdy8gZ3JpZFxuXG4gIC8vIGFsdGVybmF0aXZlbHksIHRyaWFsIHJlbW92YWxzIGFyZSBmdXJ0aGVyLXJlYWNoaW5nP1xuICAvLyAgLSBpZiB3ZSByZW1vdmUgYSBob3Jpem9udGFsIGVkZ2UgdGhlbiBhbHNvIHJlbW92ZSB0aGVcbiAgLy8gICAgb3Bwb3NpdGUgZWRnZXMgb2YgYW55IG5laWdoYm9ycywgY29udGludWluZy5cbiAgLy8gIC0gb3IgcmVtb3ZlIGEgdmVydGljYWwgZWRnZSBvZiBvbmUuLi4/XG4gIGVhcmx5ID0gJ3InO1xuICBtYXhBdHRlbXB0cyA9IDI1MDtcbiAgdmFsaWRSaXZlclNjcmVlbnM/OiBTZXQ8bnVtYmVyPjtcblxuICB0YXJnZXRFYXJseSgpIHsgcmV0dXJuIHRoaXMucGFyYW1zLmZlYXR1cmVzPy5yaXZlciA/PyAwOyB9XG5cbiAgLy8gYWRkRWFybHlGZWF0dXJlcyhhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgLy8gICAvLyBmaWxsIHdpdGggcml2ZXIgYW5kIHRoZW4gcmVmaW5lIGRvd24gdG8gdGhlIGNvcnJlY3Qgc2l6ZS5cbiAgLy8gICAvL3RoaXMuZmlsbENhdmUoXG4gIC8vICAgcmV0dXJuXG4gIC8vIH1cblxuICAvLyBjYW5SZW1vdmUoYzogc3RyaW5nKSB7XG4gIC8vICAgcmV0dXJuIGMgPT09ICdjJyB8fCBjID09PSAncic7XG4gIC8vIH1cblxuICAvLyByZW1vdmFsTWFwKGE6IEEsIGNvb3JkOiBHcmlkQ29vcmQpOiBNYXA8R3JpZENvb3JkLCBzdHJpbmc+IHtcbiAgLy8gICBpZiAoKGNvb3JkICYgMHg4MDgpICE9PSAweDgwMCkgcmV0dXJuIG5ldyBNYXAoW1tjb29yZCwgJyddXSk7XG4gIC8vICAgLy8gbmVlZCB0byBiZSBhIGxpdHRsZSBjbGV2ZXJlcjogaG9yaXpvbnRhbCBicmFuY2hlcyBhcmUgbm90XG4gIC8vICAgLy8gYWxsb3dlZCAodGhvdWdoIHdlIGNvdWxkIGFkZCB0aGVtLCBpbiB3aGljaCBjYXNlIHRoaXMgZ2V0c1xuICAvLyAgIC8vIGEgbG90IGVhc2llciksIHNvIGVuc3VyZSB3ZSdyZSBsZWZ0IHdpdGggYSBiZW5kIGluc3RlYWQuXG4gIC8vICAgY29uc3QgbWFwID0gbmV3IE1hcChbW2Nvb3JkLCAnJ11dKTtcbiAgLy8gICBjb25zdCBsZWZ0ID0gY29vcmQgLSA4IGFzIEdyaWRDb29yZDtcbiAgLy8gICBpZiAoYS5ncmlkLmdldChsZWZ0KSA9PT0gJ3InKSB7XG4gIC8vICAgICBjb25zdCBsZWZ0VXAgPSBsZWZ0IC0gMHg4MDAgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdERvd24gPSBsZWZ0ICsgMHg4MDAgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdExlZnQgPSBsZWZ0IC0gOCBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICAvLyBtYXkgbmVlZCB0byByZW1vdmUgYW5vdGhlciBuZWlnaGJvci5cbiAgLy8gICAgIGlmIChhLmdyaWQuZ2V0KGxlZnRVcCkgPT09ICdyJyAmJiBhLmdyaWQuZ2V0KGxlZnREb3duKSA9PT0gJ3InICYmXG4gIC8vICAgICAgICAgYS5ncmlkLmdldChsZWZ0TGVmdCkgPT09ICdyJykge1xuICAvLyAgICAgICBtYXAuc2V0KHRoaXMucmFuZG9tLm5leHRJbnQoMikgPyBsZWZ0VXAgOiBsZWZ0RG93biwgJycpO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICBjb25zdCByaWdodCA9IGNvb3JkICsgOCBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgaWYgKGEuZ3JpZC5nZXQocmlnaHQpID09PSAncicpIHtcbiAgLy8gICAgIGNvbnN0IHJpZ2h0VXAgPSByaWdodCAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IHJpZ2h0RG93biA9IHJpZ2h0ICsgMHg4MDAgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHRSaWdodCA9IHJpZ2h0ICsgOCBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICAvLyBtYXkgbmVlZCB0byByZW1vdmUgYW5vdGhlciBuZWlnaGJvci5cbiAgLy8gICAgIGlmIChhLmdyaWQuZ2V0KHJpZ2h0VXApID09PSAncicgJiYgYS5ncmlkLmdldChyaWdodERvd24pID09PSAncicgJiZcbiAgLy8gICAgICAgICBhLmdyaWQuZ2V0KHJpZ2h0UmlnaHQpID09PSAncicpIHtcbiAgLy8gICAgICAgbWFwLnNldCh0aGlzLnJhbmRvbS5uZXh0SW50KDIpID8gcmlnaHRVcCA6IHJpZ2h0RG93biwgJycpO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gbWFwO1xuICAvLyB9XG5cbiAgcHJlaW5mZXIoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gTWFrZSBzdXJlIHJpdmVyIGlzIGFjdHVhbGx5IG5lY2Vzc2FyeSFcbiAgICBpZiAoWy4uLnRoaXMub3JpZy5leGl0cygpXS5sZW5ndGggPCAyKSByZXR1cm4gT0s7XG4gICAgY29uc3Qgb3ZlcnJpZGUgPSBuZXcgTWFwPEdyaWRDb29yZCwgc3RyaW5nPigpO1xuICAgIGZvciAobGV0IGkgPSAwIGFzIEdyaWRJbmRleDsgaSA8IGEuZ3JpZC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYS5ncmlkLmRhdGFbaV0gPT09ICdyJykgb3ZlcnJpZGUuc2V0KGEuZ3JpZC5jb29yZChpKSwgJycpO1xuICAgIH1cbiAgICBjb25zdCBwYXJ0cyA9IGEuZ3JpZC5wYXJ0aXRpb24ob3ZlcnJpZGUpO1xuICAgIGNvbnN0IHN0YWlyUGFydHM6IHVua25vd25bXSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwIGFzIEdyaWRJbmRleDsgaSA8IGEuZ3JpZC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYS5ncmlkLmRhdGFbaV0gPT09ICc8JyB8fCBhLmdyaWQuZGF0YVtpXSA9PT0gJz4nIHx8XG4gICAgICAgICAgKGEuZ3JpZC5kYXRhW2ldICYmIGEuZ3JpZC5pc0JvcmRlcihhLmdyaWQuY29vcmQoaSkpKSkge1xuICAgICAgICBzdGFpclBhcnRzLnB1c2gocGFydHMuZ2V0KGEuZ3JpZC5jb29yZChpKSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAobmV3IFNldChzdGFpclBhcnRzKS5zaXplIDwgc3RhaXJQYXJ0cy5sZW5ndGgpIHtcbiAgICAgIC8vY29uc29sZS5lcnJvcihhLmdyaWQuc2hvdygpKTtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgcml2ZXIgZGlkbid0IG1hdHRlcmB9O1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIucHJlaW5mZXIoYSk7XG4gIH1cblxuICBhZGRMYXRlRmVhdHVyZXMoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gY29uc29sZS5lcnJvcihhLmdyaWQuc2hvdygpKTtcbiAgICAvLyByZXR1cm4gc3VwZXIuYWRkTGF0ZUZlYXR1cmVzKGEpO1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGFkZEFyZW5hcyhhOiBBLCBhcmVuYXM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIC8vIFRoaXMgdmVyc2lvbiB3b3JrcyBhIGxpdHRsZSBkaWZmZXJlbnRseSwgc2luY2UgaXQgcnVucyBhcyBhbiBlYXJseVxuICAgIC8vIGZlYXR1cmUgKGJlZm9yZSByZWZpbmVtZW50KSByYXRoZXIgdGhhbiBsYXRlLiAgV2UgbG9vayBmb3IgYSAzeDFcbiAgICAvLyBibG9jayBvZiAnYycgc2NyZWVucywgemVybyBvdXQgYWxsIGJ1dCB0aGUgbWlkZGxlICh3aGljaCBnZXRzIHRoZVxuICAgIC8vIGFyZW5hKSwgYW5kIHRoZW4gYWZ0ZXJ3YXJkcyB3ZSBwcnVuZSBhd2F5IGFueSBuZXdseS1kaXNjb25uZWN0ZWRcbiAgICAvLyBsYW5kIHNjcmVlbnMuXG4gICAgaWYgKCFhcmVuYXMpIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IGcgPSBhLmdyaWQ7XG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKGEuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gICAgICBjb25zdCBtaWRkbGUgPSAoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCBsZWZ0ID0gKG1pZGRsZSAtIDgpIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IGxlZnQyID0gKGxlZnQgLSA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCByaWdodCA9IChtaWRkbGUgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCByaWdodDIgPSAocmlnaHQgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCB1cCA9IG1pZGRsZSAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IGRvd24gPSBtaWRkbGUgKyAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAoZy5nZXQobWlkZGxlKSAhPT0gJ2MnKSBjb250aW51ZTtcbiAgICAgIGlmIChnLmdldCh1cCkgIT09ICdjJykgY29udGludWU7XG4gICAgICBpZiAoZy5nZXQoZG93bikgIT09ICdjJykgY29udGludWU7XG4gICAgICBjb25zdCBsZWZ0VGlsZSA9XG4gICAgICAgICAgZy5pc0JvcmRlcihsZWZ0KSA/ICcnIDogdGhpcy5leHRyYWN0KGcsIGxlZnQyIC0gMHg4MDggYXMgR3JpZENvb3JkKTtcbiAgICAgIGNvbnN0IHJpZ2h0VGlsZSA9XG4gICAgICAgICAgZy5pc0JvcmRlcihyaWdodCkgPyAnJyA6IHRoaXMuZXh0cmFjdChnLCByaWdodDIgLSAweDgwOCBhcyBHcmlkQ29vcmQpO1xuICAgICAgaWYgKC9bXiBjXS8udGVzdChsZWZ0VGlsZSArIHJpZ2h0VGlsZSkpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFnLmlzQm9yZGVyKGxlZnQpKSB7XG4gICAgICAgIGcuc2V0KGxlZnQsICcnKTtcbiAgICAgICAgZy5zZXQobGVmdDIsICcnKTtcbiAgICAgICAgZy5zZXQobGVmdDIgLSA4IGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgICBnLnNldChsZWZ0MiAtIDB4ODAwIGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgICBnLnNldChsZWZ0MiArIDB4ODAwIGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgfVxuICAgICAgaWYgKCFnLmlzQm9yZGVyKHJpZ2h0KSkge1xuICAgICAgICBnLnNldChyaWdodCwgJycpO1xuICAgICAgICBnLnNldChyaWdodDIsICcnKTtcbiAgICAgICAgZy5zZXQocmlnaHQyICsgOCBhcyBHcmlkQ29vcmQsICcnKTtcbiAgICAgICAgZy5zZXQocmlnaHQyIC0gMHg4MDAgYXMgR3JpZENvb3JkLCAnJyk7XG4gICAgICAgIGcuc2V0KHJpZ2h0MiArIDB4ODAwIGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgfVxuICAgICAgYS5maXhlZC5hZGQobWlkZGxlKTtcbiAgICAgIGEuZml4ZWQuYWRkKHVwKTtcbiAgICAgIGEuZml4ZWQuYWRkKGRvd24pO1xuICAgICAgZy5zZXQobWlkZGxlLCAnYScpO1xuICAgICAgYXJlbmFzLS07XG4gICAgICBpZiAoIWFyZW5hcykge1xuICAgICAgICB0aGlzLnBydW5lRGlzY29ubmVjdGVkKGEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy9jb25zb2xlLmVycm9yKCdjb3VsZCBub3QgYWRkIGFyZW5hJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBXYXRlcmZhbGxSaXZlckNhdmVTaHVmZmxlIGV4dGVuZHMgUml2ZXJDYXZlU2h1ZmZsZSB7XG5cbiAgYWRkQmxvY2tzID0gZmFsc2U7XG5cbiAgaW5pdGlhbEZpbGxFYXJseShhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBjb25zdCBnID0gbmV3IE1vbm9ncmlkKGEuaCwgYS53LCB0aGlzLmdldFZhbGlkRWFybHlTY3JlZW5zKCkpO1xuICAgIGNvbnN0IHgwID0gMiArIHRoaXMucmFuZG9tLm5leHRJbnQoYS53IC0gNCk7XG4gICAgY29uc3QgeDEgPSAyICsgdGhpcy5yYW5kb20ubmV4dEludChhLncgLSA0KTtcbiAgICBjb25zdCBjID0gbmV3IEN1cnNvcihnLCBhLmggLSAxLCB4MSk7XG4gICAgYy5nbygwKTtcbiAgICBjLmRpcmVjdGVkUGF0aCh0aGlzLnJhbmRvbSwgMSwgeDApO1xuICAgIGMuZ28oMCk7XG5cbiAgICBhLmdyaWQuZGF0YSA9IGcudG9HcmlkKCdyJykuZGF0YTtcbiAgICB0aGlzLmFkZEFsbEZpeGVkKGEpO1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGFkZEVkZ2VzKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGxldCByID0gLTE7XG4gICAgY29uc3QgaCA9IChhLmggLSAxKSA8PCAxMiB8IDB4ODA4O1xuICAgIGZvciAobGV0IHggPSAwOyB4IDwgYS53OyB4KyspIHtcbiAgICAgIGlmIChhLmdyaWQuZ2V0KChoIHwgKHggPDwgNCkpIGFzIEdyaWRDb29yZCkgPT09ICdyJykgciA9IHg7XG4gICAgfVxuICAgIGlmIChyIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBubyByaXZlciBvbiBib3R0b20gZWRnZWApO1xuICAgIGNvbnN0IGMwID0gKGggfCB0aGlzLnJhbmRvbS5uZXh0SW50KHIpIDw8IDQpIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBjMSA9XG4gICAgICAgIChoIHwgKHIgKyAxICsgdGhpcy5yYW5kb20ubmV4dEludChhLncgLSAxIC0gcikpIDw8IDQpIGFzIEdyaWRDb29yZDtcbiAgICBhLmdyaWQuc2V0KGMwLCAnPicpO1xuICAgIGEuZ3JpZC5zZXQoYzAgLSA4IGFzIEdyaWRDb29yZCwgJycpO1xuICAgIGEuZ3JpZC5zZXQoYzAgKyA4IGFzIEdyaWRDb29yZCwgJycpO1xuICAgIGEuZ3JpZC5zZXQoYzEsICc+Jyk7XG4gICAgYS5ncmlkLnNldChjMSAtIDggYXMgR3JpZENvb3JkLCAnJyk7XG4gICAgYS5ncmlkLnNldChjMSArIDggYXMgR3JpZENvb3JkLCAnJyk7XG4gICAgYS5maXhlZC5hZGQoYzApO1xuICAgIGEuZml4ZWQuYWRkKGMxKTtcbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBhZGRTdGFpcnMoKTogUmVzdWx0PHZvaWQ+IHsgcmV0dXJuIE9LOyB9XG5cbiAgY2hlY2tNZXRhKG1ldGE6IE1ldGFsb2NhdGlvbiwgcmVwbD86IE1hcDxQb3MsIE1ldGFzY3JlZW4+KTogYm9vbGVhbiB7XG4gICAgY29uc3Qgb3B0cyA9IHJlcGwgPyB7ZmxpZ2h0OiB0cnVlLCB3aXRoOiByZXBsfSA6IHtmbGlnaHQ6IHRydWV9O1xuICAgIGNvbnN0IHBhcnRzID0gbWV0YS50cmF2ZXJzZShvcHRzKTtcbiAgICByZXR1cm4gbmV3IFNldChwYXJ0cy52YWx1ZXMoKSkuc2l6ZSA9PT0gdGhpcy5tYXhQYXJ0aXRpb25zO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTdHl4Uml2ZXJDYXZlU2h1ZmZsZTIgZXh0ZW5kcyBSaXZlckNhdmVTaHVmZmxlIHtcbiAgLy9tYXhQYXJ0aXRpb25zID0gMTtcbiAgLy9hZGRCbG9ja3MgPSBmYWxzZTtcblxuXG4gIC8vIFRPRE8gLSBjb21lIGJhY2sgdG8gdGhlIHZlcnNpb24gd2hlcmUgaXQncyBzcGxpdFxuICAvLyAgICAgIC0gdXNlIHRoZSBleHRydWRpbmcgdmFyaWFudCB0byBlbnN1cmUgc29tZXRoaW5nIHJlYXNvbmFibGU/XG5cbiAgLy8gSXQgc2hvdWxkIGJlIHJlbGF0aXZlbHkgZWFzeSB0byBhY3R1YWxseSBleHRydWRlIG9uZSB0aWxlIGF0IGEgdGltZS4uLj9cbiAgLy8gICAtIHRoaXMgc2VlbXMgdG8gbWFrZSBvdmVyYWxsIGxlc3MgaW50ZXJlc3Rpbmcgc3RydWN0dXJlcywgYnV0XG4gIC8vICAgICBmb3IgdG90YWxseS1zZXBhcmF0ZSBtYXBzLCBpdCB3b3JrcyBiZXR0ZXIuXG4gIC8vICAgLSBtaWdodCBiZSBtb3JlIHZpYWJsZSBmb3IgY2FzZXMgd2hlcmUgd2Ugd2FudCB0byBoYXZlIGEgbm9uZW1wdHkgbnVjbGV1c1xuXG5cblxuICBtYXhBdHRlbXB0cyA9IDI1MDsgLy8gTk9URTogdGhpcyBpcyBhIHZlcnkgaGFyZCBzaHVmZmxlLlxuXG4gIHJlZmluZU1ldGFzY3JlZW5zKGE6IEEsIG1ldGE6IE1ldGFsb2NhdGlvbik6IFJlc3VsdDx2b2lkPiB7XG4gICAgbGV0IHJlc3VsdCA9IHN1cGVyLnJlZmluZU1ldGFzY3JlZW5zKGEsIG1ldGEpO1xuICAgIGlmICghcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIC8vIExhc3Qgc3RlcDogdHJ5IHRvIHNwbGl0IHRoZSByaXZlciB3aXRoIGEgcGFpciBvZiBkZWFkIGVuZHMgYW5kXG4gICAgLy8gZW5zdXJlIHRoYXQgaXQgY3JlYXRlcyAzIHNlcGFyYXRlIHBhcnRpdGlvbnMhXG4gICAgZm9yIChjb25zdCBwb3Mgb2YgbWV0YS5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gbWV0YS5nZXQocG9zKTtcbiAgICAgIGNvbnN0IGVkZ2UgPSBzY3IuZWRnZUluZGV4KCdyJyk7XG4gICAgICBsZXQgZGVhZEVuZDogTWV0YXNjcmVlbnx1bmRlZmluZWQ7XG4gICAgICBpZiAoZWRnZSA9PT0gNSkge1xuICAgICAgICBkZWFkRW5kID0gbWV0YS5yb20ubWV0YXNjcmVlbnMucml2ZXJDYXZlX2RlYWRFbmRzTlM7XG4gICAgICB9IGVsc2UgaWYgKGVkZ2UgPT09IDEwKSB7XG4gICAgICAgIGRlYWRFbmQgPSBtZXRhLnJvbS5tZXRhc2NyZWVucy5yaXZlckNhdmVfZGVhZEVuZHNXRTtcbiAgICAgIH1cbiAgICAgIGlmICghZGVhZEVuZCkgY29udGludWU7XG4gICAgICBjb25zdCByZXBsID0gbmV3IE1hcChbW3BvcywgZGVhZEVuZF1dKTtcblxuICAgICAgLy8gQ2hlY2sgdGhhdCB0aGVyZSdzIHR3byBzZXBhcmF0ZWx5LXJlYWNoYWJsZSBzY3JlZW5zXG4gICAgICBjb25zdCBmbHkgPSBtZXRhLnRyYXZlcnNlKHt3aXRoOiByZXBsLCBmbGlnaHQ6IHRydWV9KTtcbiAgICAgIGNvbnN0IGZseVNldHMgPSBuZXcgU2V0KGZseS52YWx1ZXMoKSk7XG4gICAgICBpZiAoZmx5U2V0cy5zaXplICE9PSAyKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGVkZ2VzID1cbiAgICAgICAgICBbLi4ubWV0YS5leGl0cygpXS5maWx0ZXIoZSA9PiBlWzFdID09PSAnZWRnZTpib3R0b20nKS5tYXAoZSA9PiBlWzBdKTtcbiAgICAgIGlmIChlZGdlcy5sZW5ndGggIT09IDIpIHRocm93IG5ldyBFcnJvcihgYmFkIGVkZ2VzYCk7XG4gICAgICBpZiAoZmx5LmdldChlZGdlc1swXSkgPT09IGZseS5nZXQoZWRnZXNbMV0pKSBjb250aW51ZTtcblxuICAgICAgLy8gQ2hlY2sgdGhhdCB0aGVyZSdzIGFuIGFyZWEgb25seSBhY2Nlc3NpYmxlIHdpdGggZmxpZ2h0XG4gICAgICBjb25zdCBub2ZseSA9IG1ldGEudHJhdmVyc2Uoe3dpdGg6IHJlcGwsIGZsaWdodDogZmFsc2V9KTtcbiAgICAgIGNvbnN0IG5vZmx5U2V0cyA9IG5ldyBTZXQobm9mbHkudmFsdWVzKCkpO1xuICAgICAgaWYgKG5vZmx5U2V0cy5zaXplIDwgMykgY29udGludWU7XG5cbiAgICAgIG1ldGEuc2V0KHBvcywgZGVhZEVuZCk7XG4gICAgICByZXR1cm4gT0s7XG4gICAgfVxuICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgY291bGQgbm90IHNwbGl0IG1hcCBpbnRvIHR3b1xcbiR7bWV0YS5zaG93KCl9YH07XG4gIH1cbn1cblxuXG5leHBvcnQgY2xhc3MgU3R5eFJpdmVyQ2F2ZVNodWZmbGUzIGV4dGVuZHMgQ2F2ZVNodWZmbGUge1xuICBtYXhQYXJ0aXRpb25zID0gMztcbiAgLy9hZGRCbG9ja3MgPSBmYWxzZTtcblxuICBmaWxsR3JpZChhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBtYWtlIDIgYm90dG9tIGVkZ2UgZXhpdHNcbiAgICBjb25zdCBlZGdlczogbnVtYmVyW10gPSBbXTtcbiAgICBsZXQgc2l6ZSA9IDA7XG4gICAgZm9yIChjb25zdCB4IG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHNlcShhLncgLSAyLCB4ID0+IHggKyAxKSkpIHtcbiAgICAgIGlmIChlZGdlcy5sZW5ndGggPT09IDEgJiYgKHggLSBlZGdlc1swXSkgKiogMiA9PT0gMSkgY29udGludWU7XG4gICAgICBjb25zdCBjID0gKChhLmggLSAxKSA8PCAxMiB8IHggPDwgNCB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBhLmdyaWQuc2V0KGMsICdjJyk7XG4gICAgICBhLmdyaWQuc2V0KE4oYyksICdjJyk7XG4gICAgICBhLmdyaWQuc2V0KFMoYyksICduJyk7XG4gICAgICBhLmZpeGVkLmFkZChjKTtcbiAgICAgIGEuZml4ZWQuYWRkKE4oYykpO1xuICAgICAgYS5maXhlZC5hZGQoUyhjKSk7XG4gICAgICBlZGdlcy5wdXNoKHgpO1xuICAgICAgc2l6ZSsrO1xuICAgICAgaWYgKGVkZ2VzLmxlbmd0aCA9PT0gMikgYnJlYWs7XG4gICAgfVxuICAgIC8vIG1ha2UgYSByaXZlciBhY3Jvc3MgdGhlIGJvdHRvbS5cbiAgICBsZXQgcml2ZXJzID0gYS53O1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgMiAqIGEudzsgaSsrKSB7XG4gICAgICBhLmdyaWQuc2V0KCgoYS5oIC0gMikgPDwgMTIgfCBpIDw8IDMgfCAweDgwMCkgYXMgR3JpZENvb3JkLCAncicpO1xuICAgIH1cblxuICAgIC8vIGN1dCB0aGUgcml2ZXIgYmV0d2VlbiB0aGUgZXhpdHNcbiAgICBjb25zdCBjdXQgPVxuICAgICAgICB0aGlzLnJhbmRvbS5uZXh0SW50KE1hdGguYWJzKGVkZ2VzWzBdIC0gZWRnZXNbMV0pIC0gMSkgK1xuICAgICAgICBNYXRoLm1pbihlZGdlc1swXSwgZWRnZXNbMV0pICsgMTtcbiAgICBhLmdyaWQuc2V0KCgoYS5oIC0gMSkgPDwgMTIgfCBjdXQgPDwgNCB8IDB4ODA4KSBhcyBHcmlkQ29vcmQsICcnKTtcbiAgICAvLyBUT0RPIC0gdXNlICdmaXhlZCcgbW9yZT9cblxuICAgIC8vIGV4dGVuZCByaXZlci5cbiAgICBjb25zdCByaXZlcnNUYXJnZXQgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcyEucml2ZXI7XG4gICAgd2hpbGUgKHJpdmVycyA8IHJpdmVyc1RhcmdldCkge1xuICAgICAgY29uc3QgYWRkZWQgPSB0aGlzLnRyeUV4dHJ1ZGUoYSwgJ3InLCByaXZlcnNUYXJnZXQgLSByaXZlcnMsIDEpO1xuICAgICAgaWYgKCFhZGRlZCkgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBmYWlsZWQgdG8gZXh0cnVkZSByaXZlclxcbiR7YS5ncmlkLnNob3coKX1gfTtcbiAgICAgIHJpdmVycyArPSBhZGRlZDtcbiAgICAgIHNpemUgKz0gYWRkZWQ7XG4gICAgfVxuICAgIC8vIGV4dHJ1ZGUgY2F2ZS5cbiAgICBjb25zdCBzaXplVGFyZ2V0ID0gdGhpcy5wYXJhbXMuc2l6ZTtcbiAgICB3aGlsZSAoc2l6ZSA8IHNpemVUYXJnZXQpIHtcbiAgICAgIGNvbnN0IGFkZGVkID0gdGhpcy50cnlFeHRydWRlKGEsICdjJywgc2l6ZVRhcmdldCAtIHNpemUsIDEwKTtcbiAgICAgIGlmICghYWRkZWQpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgZmFpbGVkIHRvIGV4dHJ1ZGUgY2F2ZWB9O1xuICAgICAgc2l6ZSArPSBhZGRlZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hZGRTdGFpcnMoYSwgLi4uKHRoaXMucGFyYW1zLnN0YWlycyA/PyBbXSkpO1xuICB9XG5cbiAgcmVmaW5lTWV0YXNjcmVlbnMoYTogQSwgbWV0YTogTWV0YWxvY2F0aW9uKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBsZXQgcmVzdWx0ID0gc3VwZXIucmVmaW5lTWV0YXNjcmVlbnMoYSwgbWV0YSk7XG4gICAgaWYgKCFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgLy8gTGFzdCBzdGVwOiB0cnkgdG8gc3BsaXQgdGhlIHJpdmVyIHdpdGggYSBwYWlyIG9mIGRlYWQgZW5kcyBhbmRcbiAgICAvLyBlbnN1cmUgdGhhdCBpdCBjcmVhdGVzIDMgc2VwYXJhdGUgcGFydGl0aW9ucyFcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgICAgY29uc3QgZWRnZSA9IHNjci5lZGdlSW5kZXgoJ3InKTtcbiAgICAgIGxldCBkZWFkRW5kOiBNZXRhc2NyZWVufHVuZGVmaW5lZDtcbiAgICAgIGlmIChlZGdlID09PSA1KSB7XG4gICAgICAgIGRlYWRFbmQgPSBtZXRhLnJvbS5tZXRhc2NyZWVucy5yaXZlckNhdmVfZGVhZEVuZHNOUztcbiAgICAgIH0gZWxzZSBpZiAoZWRnZSA9PT0gMTApIHtcbiAgICAgICAgZGVhZEVuZCA9IG1ldGEucm9tLm1ldGFzY3JlZW5zLnJpdmVyQ2F2ZV9kZWFkRW5kc1dFO1xuICAgICAgfVxuICAgICAgaWYgKCFkZWFkRW5kKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHJlcGwgPSBuZXcgTWFwKFtbcG9zLCBkZWFkRW5kXV0pO1xuXG4gICAgICAvLyBDaGVjayB0aGF0IHRoZXJlJ3MgdHdvIHNlcGFyYXRlbHktcmVhY2hhYmxlIHNjcmVlbnNcbiAgICAgIGNvbnN0IGZseSA9IG1ldGEudHJhdmVyc2Uoe3dpdGg6IHJlcGwsIGZsaWdodDogdHJ1ZX0pO1xuICAgICAgY29uc3QgZmx5U2V0cyA9IG5ldyBTZXQoZmx5LnZhbHVlcygpKTtcbiAgICAgIGlmIChmbHlTZXRzLnNpemUgIT09IDIpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZWRnZXMgPVxuICAgICAgICAgIFsuLi5tZXRhLmV4aXRzKCldLmZpbHRlcihlID0+IGVbMV0gPT09ICdlZGdlOmJvdHRvbScpLm1hcChlID0+IGVbMF0pO1xuICAgICAgaWYgKGVkZ2VzLmxlbmd0aCAhPT0gMikgdGhyb3cgbmV3IEVycm9yKGBiYWQgZWRnZXNgKTtcbiAgICAgIGlmIChmbHkuZ2V0KGVkZ2VzWzBdKSA9PT0gZmx5LmdldChlZGdlc1sxXSkpIGNvbnRpbnVlO1xuXG4gICAgICAvLyBDaGVjayB0aGF0IHRoZXJlJ3MgYW4gYXJlYSBvbmx5IGFjY2Vzc2libGUgd2l0aCBmbGlnaHRcbiAgICAgIGNvbnN0IG5vZmx5ID0gbWV0YS50cmF2ZXJzZSh7d2l0aDogcmVwbCwgZmxpZ2h0OiBmYWxzZX0pO1xuICAgICAgY29uc3Qgbm9mbHlTZXRzID0gbmV3IFNldChub2ZseS52YWx1ZXMoKSk7XG4gICAgICBpZiAobm9mbHlTZXRzLnNpemUgPCAzKSBjb250aW51ZTtcblxuICAgICAgbWV0YS5zZXQocG9zLCBkZWFkRW5kKTtcbiAgICAgIHJldHVybiBPSztcbiAgICB9XG4gICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBjb3VsZCBub3Qgc3BsaXQgbWFwIGludG8gdHdvXFxuJHttZXRhLnNob3coKX1gfTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgU3R5eFJpdmVyQ2F2ZVNodWZmbGUgZXh0ZW5kcyBSaXZlckNhdmVTaHVmZmxlIHtcbiAgYWRkQmxvY2tzID0gZmFsc2U7XG5cbiAgZmlsbEdyaWQoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gbWFrZSAyIGJvdHRvbSBlZGdlIGV4aXRzXG4gICAgY29uc3QgZWRnZXM6IG51bWJlcltdID0gW107XG4gICAgbGV0IHNpemUgPSAwO1xuICAgIGZvciAoY29uc3QgeCBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShzZXEoYS53IC0gMiwgeCA9PiB4ICsgMSkpKSB7XG4gICAgICBpZiAoZWRnZXMubGVuZ3RoID09PSAxICYmICh4IC0gZWRnZXNbMF0pICoqIDIgPD0gMSkgY29udGludWU7XG4gICAgICBjb25zdCBjID0gKChhLmggLSAxKSA8PCAxMiB8IHggPDwgNCB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBhLmdyaWQuc2V0KGMsICdjJyk7XG4gICAgICBhLmdyaWQuc2V0KE4oYyksICdjJyk7XG4gICAgICBhLmdyaWQuc2V0KFMoYyksICduJyk7XG4gICAgICBhLmZpeGVkLmFkZChjKTtcbiAgICAgIGEuZml4ZWQuYWRkKE4oYykpO1xuICAgICAgYS5maXhlZC5hZGQoUyhjKSk7XG4gICAgICBlZGdlcy5wdXNoKHgpO1xuICAgICAgc2l6ZSsrO1xuICAgICAgaWYgKGVkZ2VzLmxlbmd0aCA9PT0gMikgYnJlYWs7XG4gICAgfVxuICAgIGlmIChlZGdlcy5sZW5ndGggPCAyKSByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGluaXRpYWwgZWRnZXNgfTtcbiAgICAvLyBtYWtlIGEgcml2ZXIgYWNyb3NzIHRoZSBib3R0b20uXG4gICAgbGV0IHJpdmVycyA9IGEudztcbiAgICBjb25zdCBjdXQgPVxuICAgICAgICB0aGlzLnJhbmRvbS5uZXh0SW50KE1hdGguYWJzKGVkZ2VzWzBdIC0gZWRnZXNbMV0pIC0gMSkgK1xuICAgICAgICBNYXRoLm1pbihlZGdlc1swXSwgZWRnZXNbMV0pICsgMTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IDIgKiBhLnc7IGkrKykge1xuICAgICAgaWYgKGkgPT09IDIgKiBjdXQgKyAxKSBjb250aW51ZTtcbiAgICAgIGEuZ3JpZC5zZXQoKChhLmggLSAyKSA8PCAxMiB8IGkgPDwgMyB8IDB4ODAwKSBhcyBHcmlkQ29vcmQsICdyJyk7XG4gICAgICBhLmZpeGVkLmFkZCgoKGEuaCAtIDEpIDw8IDEyIHwgaSA8PCAzIHwgMHg4MDApIGFzIEdyaWRDb29yZCk7XG4gICAgfVxuICAgIC8vIGV4dGVuZCByaXZlci5cbiAgICBjb25zdCByaXZlcnNUYXJnZXQgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcyEucml2ZXI7XG4gICAgd2hpbGUgKHJpdmVycyA8IHJpdmVyc1RhcmdldCkge1xuICAgICAgY29uc3QgYWRkZWQgPSB0aGlzLnRyeUFkZChhLCB7Y2hhcjogJ3InfSk7XG4gICAgICBpZiAoIWFkZGVkKSByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGZhaWxlZCB0byBleHRydWRlIHJpdmVyXFxuJHthLmdyaWQuc2hvdygpfWB9O1xuICAgICAgcml2ZXJzICs9IGFkZGVkO1xuICAgICAgc2l6ZSArPSBhZGRlZDtcbiAgICB9XG4gICAgLy8gZXh0cnVkZSBjYXZlLlxuICAgIGNvbnN0IHNpemVUYXJnZXQgPSB0aGlzLnBhcmFtcy5zaXplO1xuICAgIHdoaWxlIChzaXplIDwgc2l6ZVRhcmdldCkge1xuICAgICAgY29uc3QgYWRkZWQgPSB0aGlzLnRyeUFkZChhKTtcbiAgICAgIGlmICghYWRkZWQpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgZmFpbGVkIHRvIGV4dHJ1ZGUgY2F2ZWB9O1xuICAgICAgc2l6ZSArPSBhZGRlZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hZGRTdGFpcnMoYSwgLi4uKHRoaXMucGFyYW1zLnN0YWlycyA/PyBbXSkpO1xuICB9XG5cbiAgLy8gRmxpZ2h0IG1heSBiZSByZXF1aXJlZCBmb3IgYW55dGhpbmcuXG4gIGNoZWNrTWV0YSgpIHsgcmV0dXJuIHRydWU7IH1cblxuICByZWZpbmVNZXRhc2NyZWVucyhhOiBBLCBtZXRhOiBNZXRhbG9jYXRpb24pOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnJlZmluZU1ldGFzY3JlZW5zKGEsIG1ldGEpO1xuICAgIGlmICghcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIC8vIENoZWNrIHNpbXBsZSBjb25kaXRpb25zOiAoMSkgdGhlcmUncyBhbiBhY2Nlc3NpYmxlIGJyaWRnZSxcbiAgICAvLyAoMikgZmxpZ2h0IGlzIHJlcXVpcmVkIGZvciBzb21lIHRpbGUuXG4gICAgZnVuY3Rpb24gYWNjZXNzaWJsZShtYXA6IE1hcDxudW1iZXIsIFNldDxudW1iZXI+Pik6IG51bWJlciB7XG4gICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgZm9yIChjb25zdCBzZXQgb2YgbmV3IFNldChtYXAudmFsdWVzKCkpKSB7XG4gICAgICAgIGZvciAoY29uc3QgZWRnZSBvZiBzZXQpIHtcbiAgICAgICAgICAvLyBvbmx5IGNoZWNrIGFjY2Vzc2liaWxpdHkgZnJvbSBib3R0b20gZWRnZS5cbiAgICAgICAgICBpZiAobWV0YS5leGl0VHlwZShlZGdlKSA9PT0gJ2VkZ2U6Ym90dG9tJykge1xuICAgICAgICAgICAgY291bnQgKz0gc2V0LnNpemU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBjb3VudDtcbiAgICB9XG4gICAgY29uc3QgcGFydHMxID0gYWNjZXNzaWJsZShtZXRhLnRyYXZlcnNlKHtub0ZsYWdnZWQ6IHRydWV9KSk7XG4gICAgY29uc3QgcGFydHMyID0gYWNjZXNzaWJsZShtZXRhLnRyYXZlcnNlKCkpO1xuICAgIGlmIChwYXJ0czEgPT09IHBhcnRzMikgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBicmlkZ2UgZGlkbid0IG1hdHRlcmB9O1xuICAgIGNvbnN0IHBhcnRzMyA9IGFjY2Vzc2libGUobWV0YS50cmF2ZXJzZSh7ZmxpZ2h0OiB0cnVlfSkpO1xuICAgIGlmIChwYXJ0czIgPT09IHBhcnRzMykgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBmbGlnaHQgbm90IHJlcXVpcmVkYH07XG4gICAgcmV0dXJuIE9LO1xuICB9XG59XG5cblxuZXhwb3J0IGNsYXNzIE9hc2lzQ2F2ZVNodWZmbGUgZXh0ZW5kcyBSaXZlckNhdmVTaHVmZmxlIHtcblxuICByZWFkb25seSBwYXR0ZXJuID0gW1xuICAgICcgICAgICAgICAgICAgICAnLFxuICAgICcgcnJycnJycnJycnJyciAnLFxuICAgICcgciAgICAgICAgICAgciAnLFxuICAgICcgciBycnJycnJycnIgciAnLFxuICAgICcgciByICAgICAgIHIgciAnLFxuICAgICcgciByIHJycnJyIHIgciAnLFxuICAgICcgciByIHIgICByIHIgciAnLFxuICAgICcgciByIHIgICByIHIgciAnLFxuICAgICcgciByIHIgICByIHIgciAnLFxuICAgICcgciByIHIgPCByIHIgciAnLFxuICAgICcgciByIHIgYyByIHIgciAnLFxuICAgICcgciByIHJycnJyIHIgciAnLFxuICAgICcgciByICAgICAgIHIgciAnLFxuICAgICcgciBycnJycnJycnIgciAnLFxuICAgICcgciAgICAgICAgICAgciAnLFxuICAgICcgcnJycnJycnJycnJyciAnLFxuICAgICcgICAgICAgICAgICAgICAnLFxuICBdO1xuXG4gIGluaXRpYWxGaWxsKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIEluaXRpYWwgZmlsbDogbWFrZSBzdXJlIHRoZXJlJ3MgZW5vdWdoIHJvb20gYW5kIHRoZW4gY29weSB0aGUgcGF0dGVybi5cbiAgICBjb25zdCBwaCA9ICh0aGlzLnBhdHRlcm4ubGVuZ3RoIC0gMSkgPj4+IDE7XG4gICAgY29uc3QgcHcgPSAodGhpcy5wYXR0ZXJuWzBdLmxlbmd0aCAtIDEpID4+PiAxO1xuICAgIGlmIChhLmggPCBwaCkgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGB0b28gc2hvcnRgfTtcbiAgICBpZiAoYS53IDwgcHcpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgdG9vIG5hcnJvd2B9O1xuICAgIGNvbnN0IHkwID0gdGhpcy5yYW5kb20ubmV4dEludChhLmggLSBwaCAtIDEpO1xuICAgIGNvbnN0IHgwID0gdGhpcy5yYW5kb20ubmV4dEludChhLncgLSBwdyAtIDEpO1xuICAgIGNvbnN0IGMwID0gKHkwICsgMSkgPDwgMTIgfCAoeDAgKyAxKSA8PCA0O1xuICAgIEdyaWQud3JpdGVHcmlkMmQoYS5ncmlkLCBjMCBhcyBHcmlkQ29vcmQsIHRoaXMucGF0dGVybik7XG4gICAgZm9yIChsZXQgeSA9IDB4MzAwMDsgeSA8PSAweDUwMDA7IHkgKz0gMHg4MDApIHtcbiAgICAgIGZvciAobGV0IHggPSAweDMwOyB4IDw9IDB4NDA7IHggKz0gMHg4KSB7XG4gICAgICAgIGEuZml4ZWQuYWRkKGMwICsgKHkgfCB4KSBhcyBHcmlkQ29vcmQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBhZGRFZGdlcyhhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBGaW5kIHRoZSB0b3AtbGVmdCBjb3JuZXIgKFRPRE8gLSBzYXZlIHRoaXMgc29tZXdoZXJlPylcbiAgICBsZXQgY29ybmVyITogR3JpZENvb3JkO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhLmdyaWQuZGF0YVtpXSA9PT0gJ3InKSB7XG4gICAgICAgIGNvcm5lciA9IGEuZ3JpZC5jb29yZChpIGFzIEdyaWRJbmRleCkgLSAweDgwOCBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY29ybmVyID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgbm8gY29ybmVyYCk7XG5cbiAgICBjb25zdCBlZGdlczogR3JpZENvb3JkW10gPSBbXTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMucGF0dGVybi5sZW5ndGg7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDE7IHggPCB0aGlzLnBhdHRlcm5beV0ubGVuZ3RoIC0gMTsgeCsrKSB7XG4gICAgICAgIGlmICghKCh4IF4geSkgJiAxKSkgY29udGludWU7XG4gICAgICAgIGlmICh0aGlzLnBhdHRlcm5beV1beF0gIT09ICcgJykgY29udGludWU7XG4gICAgICAgIGVkZ2VzLnB1c2goY29ybmVyICsgKHkgPDwgMTEgfCB4IDw8IDMpIGFzIEdyaWRDb29yZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGNoYXJzID0gdGhpcy5yYW5kb20uc2h1ZmZsZShbLi4uJ2NjcnJycnJycnInXSk7XG4gICAgZm9yIChjb25zdCBlZGdlIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKGVkZ2VzKSkge1xuICAgICAgY29uc3QgY2hhciA9IGNoYXJzW2NoYXJzLmxlbmd0aCAtIDFdO1xuICAgICAgLy8gZG9uJ3QgcGxhY2UgY2F2ZXMgb24gdGhlIG91dGVyIGJvdW5kYXJ5LlxuICAgICAgaWYgKGNoYXIgPT09ICdjJyAmJlxuICAgICAgICAgIFsuLi50aGlzLmV4dHJhY3QoYS5ncmlkLCBlZGdlIC0gMHg4MDggYXMgR3JpZENvb3JkKV1cbiAgICAgICAgICAgICAgLmZpbHRlcih2ID0+IHYgPT09ICdyJykubGVuZ3RoIDwgNCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmNhblNldChhLCBlZGdlLCBjaGFyKSkgYS5ncmlkLnNldChlZGdlLCBjaGFycy5wb3AoKSEpO1xuICAgICAgaWYgKCFjaGFycy5sZW5ndGgpIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIEFkZCBhIGZldyBleHRyYSAnYycgdGlsZXMuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA2OyBpKyspIHtcbiAgICAgIHRoaXMudHJ5QWRkKGEsIHtjaGFyOiAnYyd9KTtcbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgcmVmaW5lKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIEFkZCBzdGFpcnMuXG4gICAgY29uc3Qgc3RhaXJzID0gWy4uLih0aGlzLnBhcmFtcy5zdGFpcnMgPz8gW10pXTtcbiAgICBzdGFpcnNbMF0tLTtcbiAgICBpZiAoc3RhaXJzWzBdIHx8IHN0YWlyc1sxXSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5hZGRTdGFpcnMoYSwgLi4uc3RhaXJzKTtcbiAgICAgIGlmICghcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICAvLyBGaW5kIHR3byBjYXZlIGRlYWQgZW5kcyBhbmQgdHJ5IHRvIHBpbiB0aGVtICg/KVxuICAgIGxldCBkZWFkRW5kcyA9IDA7XG4gICAgZm9yIChjb25zdCBzIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKGEuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gICAgICBpZiAodGhpcy5leHRyYWN0KGEuZ3JpZCwgcykucmVwbGFjZSgvIC9nLCAnJykgPT09ICdjJykge1xuICAgICAgICBpZiAoc3RhaXJzWzBdICYmICFhLmdyaWQuZ2V0KHMgKyA4IGFzIEdyaWRDb29yZCkpIHtcbiAgICAgICAgICBhLmdyaWQuc2V0KHMgKyAweDgwOCBhcyBHcmlkQ29vcmQsICc8Jyk7XG4gICAgICAgICAgc3RhaXJzWzBdLS07XG4gICAgICAgIH1cbiAgICAgICAgYS5maXhlZC5hZGQocyArIDB4ODA4IGFzIEdyaWRDb29yZCk7XG4gICAgICAgIGlmICgrK2RlYWRFbmRzID49IDIpIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBNYWtlIHN1cmUgaXQncyB0cmF2ZXJzaWJsZS5cbiAgICBjb25zdCBwYXJ0cyA9IGEuZ3JpZC5wYXJ0aXRpb24oKTtcbiAgICBpZiAobmV3IFNldChwYXJ0cy52YWx1ZXMoKSkuc2l6ZSA+IDEpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgb3JwaGFuc2B9O1xuICAgIC8vIC8vIExvb2sgZm9yIGVkZ2VzIHdlIGNhbiBkZWxldGUgYW5kIG5vdCBhY3R1YWxseSBjdXQgYW55dGhpbmcgb2ZmLlxuICAgIC8vIGZvciAoY29uc3QgaSBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShzZXEoYS5ncmlkLmRhdGEubGVuZ3RoKSkpIHtcbiAgICAvLyAgIGNvbnN0IGMgPSBhLmdyaWQuY29vcmQoaSBhcyBHcmlkSW5kZXgpO1xuICAgIC8vICAgaWYgKCEoKGMgXiAoYyA+PiA4KSkgJiA4KSkgY29udGludWU7IC8vIG9ubHkgbG9vayBhdCBlZGdlc1xuICAgIC8vICAgaWYgKCFhLmdyaWQuZGF0YVtpXSkgY29udGludWU7XG4gICAgLy8gfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGZpbGxHcmlkKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGxldCByZXN1bHQ6IFJlc3VsdDx2b2lkPjtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuaW5pdGlhbEZpbGwoYSkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5hZGRFZGdlcyhhKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLnJlZmluZShhKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgLy8gRmxpZ2h0IG1heSBiZSByZXF1aXJlZCBmb3IgYW55dGhpbmcuXG4gIGNoZWNrTWV0YShtZXRhOiBNZXRhbG9jYXRpb24sIHJlcD86IE1hcDxQb3MsIE1ldGFzY3JlZW4+KSB7XG4gICAgY29uc3QgcGFydHMgPSBtZXRhLnRyYXZlcnNlKHJlcCA/IHt3aXRoOiByZXB9IDoge30pO1xuICAgIGNvbnN0IGFsbFN0YWlyczogbnVtYmVyW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGVkZ2VzIG9mIG5ldyBTZXQocGFydHMudmFsdWVzKCkpKSB7XG4gICAgICBsZXQgc3RhaXJzID0gMDtcbiAgICAgIGZvciAoY29uc3QgZWRnZSBvZiBuZXcgU2V0KFsuLi5lZGdlc10pKSB7XG4gICAgICAgIC8vIE5PVEU6IHBvcyBjYW4gYmUgb2ZmIHRoZSByaWdodCBvciBib3R0b20gZWRnZVxuICAgICAgICBpZiAobWV0YS5leGl0VHlwZShlZGdlKSkgc3RhaXJzKys7XG4gICAgICB9XG4gICAgICBhbGxTdGFpcnMucHVzaChzdGFpcnMpO1xuICAgIH1cbiAgICByZXR1cm4gYWxsU3RhaXJzLmZpbHRlcihzID0+IHMgPiAwKS5sZW5ndGggPT09IDE7XG4gIH1cblxuICByZWZpbmVNZXRhc2NyZWVucyhhOiBBLCBtZXRhOiBNZXRhbG9jYXRpb24pOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGlmICghdGhpcy5jaGVja01ldGEobWV0YSkpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgaW5pdGlhbCBjaGVja01ldGFgfTtcbiAgICBjb25zdCByZXN1bHQgPSBzdXBlci5yZWZpbmVNZXRhc2NyZWVucyhhLCBtZXRhKTtcbiAgICBpZiAoIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcblxuICAgIC8vIENoZWNrIHRoYXQgZmxpZ2h0IGlzIHJlcXVpcmVkIGZvciBzb21lIHRpbGUuXG4gICAgLy8gVE9ETyAtIGJpYXMgYSBQT0kgdG8gYmUgb24gdGhhdCB0aWxlIVxuICAgIGZ1bmN0aW9uIGFjY2Vzc2libGUobWFwOiBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4pOiBudW1iZXIge1xuICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgIGZvciAoY29uc3Qgc2V0IG9mIG5ldyBTZXQobWFwLnZhbHVlcygpKSkge1xuICAgICAgICBmb3IgKGNvbnN0IGVkZ2Ugb2Ygc2V0KSB7XG4gICAgICAgICAgaWYgKG1ldGEuZXhpdFR5cGUoZWRnZSkpIHtcbiAgICAgICAgICAgIGNvdW50ICs9IHNldC5zaXplO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gY291bnQ7XG4gICAgfVxuICAgIGNvbnN0IHBhcnRzMSA9IGFjY2Vzc2libGUobWV0YS50cmF2ZXJzZSgpKTtcbiAgICBjb25zdCBwYXJ0czIgPSBhY2Nlc3NpYmxlKG1ldGEudHJhdmVyc2Uoe2ZsaWdodDogdHJ1ZX0pKTtcbiAgICBpZiAocGFydHMxID09PSBwYXJ0czIpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgZmxpZ2h0IG5vdCByZXF1aXJlZGB9O1xuXG4gICAgcmV0dXJuIE9LO1xuICB9XG59XG4iXX0=