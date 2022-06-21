import { Grid } from './grid.js';
import { hex } from '../rom/util.js';
const [] = [hex];
export const OK = { ok: true, value: undefined };
export class MazeShuffles {
    constructor(rom, random) {
        this.rom = rom;
        this.random = random;
        this.shuffles = [];
    }
    add(...shuffles) {
        this.shuffles.push(...shuffles);
    }
    shuffleAll() {
        for (const shuffle of this.shuffles) {
            shuffle.shuffle(this.random);
        }
        for (const shuffle of this.shuffles) {
            if (shuffle.meta)
                shuffle.finish();
        }
        for (const loc of this.rom.locations) {
            loc.meta.shufflePits(this.random);
        }
    }
    toString() {
        return [...this.shuffles].sort((a, b) => ((a.badness || 0) - (b.badness || 0))).join('\n');
    }
}
export class AbstractMazeShuffle {
    constructor(loc, params) {
        this.maxAttempts = 250;
        this.attempt = 0;
        this.meta = undefined;
        this.grid = new Grid(1, 1);
        this.fixed = new Set();
        this.w = 0;
        this.h = 0;
        this.size = 0;
        this.count = 0;
        this.exitMap = [];
        this.loc = loc;
        this.orig = loc.meta;
        this.params = params !== null && params !== void 0 ? params : this.survey(this.orig);
    }
    toString() {
        return `${this.constructor.name}(${this.loc}): ${this.attempt}/${this.maxAttempts}`;
    }
    get badness() {
        return this.attempt / this.maxAttempts;
    }
    reset() {
        this.meta = undefined;
        const h = this.pickHeight();
        const w = this.pickWidth();
        const size = this.pickSize();
        const grid = new Grid(h, w);
        grid.data.fill('');
        Object.assign(this, { h, w, size, grid, fixed: new Set(),
            count: 0, exitMap: [] });
    }
    shuffle(random) {
        if (!this.loc.used || this.meta || this.attempt > this.maxAttempts)
            return;
        Object.assign(this, { random });
        while (++this.attempt <= this.maxAttempts) {
            this.reset();
            const result = this.build();
            if (result.ok)
                return;
            console.log(`Shuffle failed ${this.loc}: ${result.fail}`);
        }
        console.error(`Completely failed to map shuffle ${this.loc}`);
    }
    finish() {
        if (!this.meta || this.meta === this.loc.meta)
            return;
        this.finishInternal();
    }
    finishInternal() {
        if (!this.meta)
            throw new Error(`impossible`);
        this.meta.transferFlags(this.loc.meta, this.random);
        const mappedExits = [];
        for (const [pred, pos, type] of this.exitMap) {
            for (const [opos, otype, spec] of mappedExits) {
                if (pred(opos, otype)) {
                    mappedExits.push([pos, type, spec]);
                    break;
                }
            }
        }
        this.meta.transferExits(this.loc.meta, this.random);
        for (const [srcPos, srcType, spec] of mappedExits) {
            const dest = this.meta.rom.locations[spec[0] >>> 8].meta;
            const destPos = spec[0] & 0xff;
            const destType = spec[1];
            this.meta.attach(srcPos, dest, destPos, srcType, destType);
        }
        this.meta.transferSpawns(this.loc.meta, this.random);
        this.meta.transferPits(this.loc.meta);
        this.loc.meta = this.meta;
    }
    pickHeight() {
        return Math.max(1, Math.min(16, this.orig.height +
            Math.floor((this.random.nextInt(6) - 1) / 3)));
    }
    pickWidth() {
        return Math.max(1, Math.min(8, this.orig.width +
            Math.floor((this.random.nextInt(6) - 1) / 3)));
    }
    pickSize() {
        return this.params.size + (this.random.nextInt(5) < 2 ? 1 : 0);
    }
    insertTile(pos, tile) {
        const s = this.posToGrid(pos);
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const g = s + r * 0x800 + c * 8;
                if (this.fixed.has(g))
                    return false;
                const v = this.grid.get(g);
                if (v && v !== tile[r * 3 + c])
                    return false;
            }
        }
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const g = s + r * 0x800 + c * 8;
                this.grid.set(g, tile[r * 3 + c]);
            }
        }
        return true;
    }
    posToGrid(pos, offset = 0) {
        const y = pos >>> 4;
        const x = pos & 0xf;
        return (y << 12 | x << 4) + offset;
    }
    insertPattern(pattern, { top = 0, bottom = 0, left = 0, right = 0 } = {}) {
        const ph = (pattern.length - 1) >>> 1;
        const pw = (pattern[0].length - 1) >>> 1;
        const dh = top + bottom;
        const dw = left + right;
        if (this.h < ph + dh)
            return { ok: false, fail: `too short` };
        if (this.w < pw + dw)
            return { ok: false, fail: `too narrow` };
        const y0 = this.random.nextInt(this.h - ph - 1 - dh) + top;
        const x0 = this.random.nextInt(this.w - pw - 1 - dh) + left;
        const c0 = (y0 + 1) << 12 | (x0 + 1) << 4;
        Grid.writeGrid2d(this.grid, c0, pattern);
        for (let y = 0x3000; y <= 0x5000; y += 0x800) {
            for (let x = 0x30; x <= 0x40; x += 0x8) {
                this.fixed.add(c0 + (y | x));
            }
        }
        return { ok: true, value: undefined };
    }
    extract(g, c, { h = 3, w = 3, replace = undefined, } = {}) {
        const index = g.index(c);
        let out = '';
        const end = index + h * g.row;
        const { row } = g;
        for (let r = index; r < end; r += row) {
            for (let i = r; i < r + w; i++) {
                if (replace) {
                    const s = replace.get(g.coord(i));
                    if (s != null) {
                        out += (s || ' ');
                        continue;
                    }
                }
                out += (g.data[i] || ' ');
            }
        }
        return out;
    }
    canSet(c, v) {
        return this.canSetAll(new Map([[c, v]]));
    }
    canSetAll(replace) {
        const screens = new Set();
        for (const c of replace.keys()) {
            if (this.fixed.has(c))
                return false;
            const s = (c & ~0x808);
            const y = s >>> 12;
            const x = (s >>> 4) & 0xf;
            if (x < this.w && y < this.h)
                screens.add(s);
            if (!(c & 8) && y < this.h && x)
                screens.add(s - 0x10);
            if (!(c & 0x800) && x < this.w && y)
                screens.add(s - 0x1000);
            if (!(c & 0x808) && x && y)
                screens.add(s - 0x1010);
        }
        for (const s of screens) {
            const tile = this.extract(this.grid, s, { replace });
            if (!this.orig.tileset.getMetascreensFromTileString(tile).length) {
                return false;
            }
        }
        return true;
    }
    addAllFixed() {
        for (let i = 0; i < this.grid.data.length; i++) {
            if (this.grid.data[i])
                this.fixed.add(this.grid.coord(i));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF6ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9tYXplL21hemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBd0IsTUFBTSxXQUFXLENBQUM7QUFFdkQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBTXJDLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFvQmpCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBaUIsRUFBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUMsQ0FBQztBQUU3RCxNQUFNLE9BQU8sWUFBWTtJQUV2QixZQUFxQixHQUFRLEVBQVcsTUFBYztRQUFqQyxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQVcsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUQ3QyxhQUFRLEdBQWtCLEVBQUUsQ0FBQztJQUNtQixDQUFDO0lBRTFELEdBQUcsQ0FBQyxHQUFHLFFBQXVCO1FBQzVCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUdELFVBQVU7UUFDUixLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDbkMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDOUI7UUFDRCxLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDbkMsSUFBSSxPQUFPLENBQUMsSUFBSTtnQkFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7U0FDcEM7UUFFRCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFO1lBQ3BDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNuQztJQUNILENB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eEIsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFO1lBQUUsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQyxDQUFDO1FBQzVELElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRTtZQUFFLE9BQU8sRUFBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUMsQ0FBQztRQUM3RCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQzNELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDNUQsTUFBTSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELEtBQUssSUFBSSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQyxJQUFJLEtBQUssRUFBRTtZQUM1QyxLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsSUFBSSxHQUFHLEVBQUU7Z0JBQ3RDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQWMsQ0FBQyxDQUFDO2FBQzNDO1NBQ0Y7UUFDRCxPQUFPLEVBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVB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RUFBRTtZQUN2QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQztZQUNuRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFO2dCQUNoRSxPQUFPLEtBQUssQ0FBQzthQUNkO1NBQ0Y7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxXQUFXO1FBQ1QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM5QyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFjLENBQUMsQ0FBQyxDQUFDO1NBQ3hFO0lBQ0gsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgR3JpZCwgR3JpZENvb3JkLCBHcmlkSW5kZXggfSBmcm9tICcuL2dyaWQuanMnO1xuaW1wb3J0IHsgUmFuZG9tIH0gZnJvbSAnLi4vcmFuZG9tLmpzJztcbmltcG9ydCB7IGhleCB9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcbmltcG9ydCB7IE1ldGFsb2NhdGlvbiwgUG9zLCBFeGl0U3BlYyB9IGZyb20gJy4uL3JvbS9tZXRhbG9jYXRpb24uanMnO1xuaW1wb3J0IHsgTG9jYXRpb24gfSBmcm9tICcuLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHsgQ29ubmVjdGlvblR5cGUgfSBmcm9tICcuLi9yb20vbWV0YXNjcmVlbmRhdGEuanMnO1xuaW1wb3J0IHsgUm9tIH0gZnJvbSAnLi4vcm9tLmpzJztcblxuY29uc3QgW10gPSBbaGV4XTtcblxudHlwZSBGZWF0dXJlID1cbiAgICAvLyBjYXZlc1xuICAgICdhcmVuYScgfCAnYnJpZGdlJyB8ICdvdmVyJyB8ICdwaXQnIHwgJ3JhbXAnIHwgJ3JpdmVyJyB8ICdzcGlrZScgfFxuICAgICdzdGF0dWUnIHwgJ3VuZGVyJyB8ICd3YWxsJyB8ICd3aWRlJyB8XG4gICAgLy8gb3ZlcndvcmxkXG4gICAgJ2NhdmUnIHwgJ3Nob3J0R3Jhc3MnIHwgJ2xvbmdHcmFzcycgfCAnaWNlQnJpZGdlJyB8ICd3b29kQnJpZGdlJyB8ICdjYW55b24nO1xuXG5leHBvcnQgaW50ZXJmYWNlIFN1cnZleSB7XG4gIHJlYWRvbmx5IGlkOiBudW1iZXI7XG4gIHJlYWRvbmx5IG1ldGE6IE1ldGFsb2NhdGlvbjtcbiAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICByZWFkb25seSBlZGdlcz86IG51bWJlcltdOyAvLyBbdG9wLCBsZWZ0LCBib3R0b20sIHJpZ2h0XVxuICByZWFkb25seSBzdGFpcnM/OiBudW1iZXJbXTsgLy8gW3VwLCBkb3duXVxuICAvL3BvaT86IG51bWJlcjtcbiAgcmVhZG9ubHkgZmVhdHVyZXM/OiB7W2YgaW4gRmVhdHVyZV0/OiBudW1iZXJ9OyAvLyBhLCByLCBzLCBwLCBiLCB3XG59XG5cbmV4cG9ydCB0eXBlIFJlc3VsdDxUPiA9IHtvazogdHJ1ZSwgdmFsdWU6IFR9IHwge29rOiBmYWxzZSwgZmFpbDogc3RyaW5nfTtcbmV4cG9ydCBjb25zdCBPSzogUmVzdWx0PHZvaWQ+ID0ge29rOiB0cnVlLCB2YWx1ZTogdW5kZWZpbmVkfTtcblxuZXhwb3J0IGNsYXNzIE1hemVTaHVmZmxlcyB7XG4gIHJlYWRvbmx5IHNodWZmbGVzOiBNYXplU2h1ZmZsZVtdID0gW107XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tLCByZWFkb25seSByYW5kb206IFJhbmRvbSkge31cblxuICBhZGQoLi4uc2h1ZmZsZXM6IE1hemVTaHVmZmxlW10pIHtcbiAgICB0aGlzLnNodWZmbGVzLnB1c2goLi4uc2h1ZmZsZXMpO1xuICB9XG5cbiAgLy8gU2h1ZmZsZXMgYWxsIHRoZSBtYXplcy5cbiAgc2h1ZmZsZUFsbCgpIHtcbiAgICBmb3IgKGNvbnN0IHNodWZmbGUgb2YgdGhpcy5zaHVmZmxlcykge1xuICAgICAgc2h1ZmZsZS5zaHVmZmxlKHRoaXMucmFuZG9tKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBzaHVmZmxlIG9mIHRoaXMuc2h1ZmZsZXMpIHtcbiAgICAgIGlmIChzaHVmZmxlLm1ldGEpIHNodWZmbGUuZmluaXNoKCk7XG4gICAgfVxuICAgIC8vIFNodWZmbGUgdGhlIHBpdHMgYXQgdGhlIGVuZC4uLlxuICAgIGZvciAoY29uc3QgbG9jIG9mIHRoaXMucm9tLmxvY2F0aW9ucykge1xuICAgICAgbG9jLm1ldGEuc2h1ZmZsZVBpdHModGhpcy5yYW5kb20pO1xuICAgIH1cbiAgfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiBbLi4udGhpcy5zaHVmZmxlc10uc29ydCgoYSxiKSA9PiAoKGEuYmFkbmVzc3x8MCkgLSAoYi5iYWRuZXNzfHwwKSkpLmpvaW4oJ1xcbicpO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF6ZVNodWZmbGUge1xuICByZWFkb25seSBiYWRuZXNzPzogbnVtYmVyO1xuICBtZXRhOiBNZXRhbG9jYXRpb258dW5kZWZpbmVkO1xuICBzaHVmZmxlKHJhbmRvbTogUmFuZG9tKTogdm9pZDtcbiAgZmluaXNoKCk6IHZvaWQ7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBYnN0cmFjdE1hemVTaHVmZmxlIHtcbiAgLy8gU2h1ZmZsZS1sZXZlbCBjb25zdGFudHMuXG4gIHJlYWRvbmx5IGxvYzogTG9jYXRpb247XG4gIHJlYWRvbmx5IHJhbmRvbSE6IFJhbmRvbTtcbiAgcmVhZG9ubHkgb3JpZzogTWV0YWxvY2F0aW9uO1xuICByZWFkb25seSBtYXhBdHRlbXB0czogbnVtYmVyID0gMjUwO1xuICByZWFkb25seSBwYXJhbXM6IFN1cnZleTtcblxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gYCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSgke3RoaXMubG9jfSk6ICR7dGhpcy5hdHRlbXB0fS8ke3RoaXMubWF4QXR0ZW1wdHN9YDtcbiAgfVxuXG4gIGdldCBiYWRuZXNzKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuYXR0ZW1wdCAvIHRoaXMubWF4QXR0ZW1wdHM7XG4gIH1cblxuICAvLyBTaHVmZmxlIHN0YXRlLlxuICBhdHRlbXB0ID0gMDtcblxuICAvLyBPdXRwdXQuICBDYW4gYmUgY2xlYXJlZCB0byBmb3JjZSBhIHJlc2h1ZmZsZS5cbiAgbWV0YTogTWV0YWxvY2F0aW9ufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAvLyBBdHRlbXB0IHN0YXRlIHZhcmlhYmxlcy5cbiAgLy8gTk9URTogVGhlc2UgYXJlIG1hcmtlZCBhcyByZWFkb25seSwgYnV0IHRoZXkgYXJlIGNsZWFyZWQgYnkgcmVzZXQoKS4gIFRoZVxuICAvLyBiZW5lZml0IG9mIG1hcmtpbmcgdGhlbSByZWFkb25seSBvdXR3ZWlnaHMgdGhlIHVnbGluZXNzIG9mIG11dGF0aW5nIHRoZW0uXG4gIHJlYWRvbmx5IGdyaWQgPSBuZXcgR3JpZDxzdHJpbmc+KDEsIDEpO1xuICByZWFkb25seSBmaXhlZCA9IG5ldyBTZXQ8R3JpZENvb3JkPigpO1xuICByZWFkb25seSB3OiBudW1iZXIgPSAwO1xuICByZWFkb25seSBoOiBudW1iZXIgPSAwO1xuICByZWFkb25seSBzaXplOiBudW1iZXIgPSAwO1xuICBjb3VudCA9IDA7XG4gIC8vIEVudHJpZXMgYXJlIFtwcmVkaWNhdGUgZm9yIG9yaWcgZXhpdCwgbmV3IHBvcywgbmV3IHR5cGVdIC0gaWYgYSBtYXRjaGluZ1xuICAvLyBleGl0IGlzIGZvdW5kIGluIHRoZSBvcmlnaW5hbCBtZXRhbG9jYXRpb24sIGl0J3MgbW92ZWQgdG8gdGhlIG5ldyBwb3NpdGlvbi5cbiAgcmVhZG9ubHkgZXhpdE1hcDogQXJyYXk8cmVhZG9ubHkgWyhwOiBQb3MsIHQ6IENvbm5lY3Rpb25UeXBlKSA9PiBib29sZWFuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyAtIGFkZCBkZXN0IHRvIHByZWRpY2F0ZT9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBvcywgQ29ubmVjdGlvblR5cGVdPiA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKGxvYzogTG9jYXRpb24sIHBhcmFtcz86IFN1cnZleSkge1xuICAgIHRoaXMubG9jID0gbG9jO1xuICAgIHRoaXMub3JpZyA9IGxvYy5tZXRhO1xuICAgIHRoaXMucGFyYW1zID0gcGFyYW1zID8/IHRoaXMuc3VydmV5KHRoaXMub3JpZyk7XG4gIH1cblxuICAvKiogUmVzZXRzIHRoZSBhdHRlbXB0IHN0YXRlLiAqL1xuICByZXNldCgpIHtcbiAgICB0aGlzLm1ldGEgPSB1bmRlZmluZWQ7XG4gICAgY29uc3QgaCA9IHRoaXMucGlja0hlaWdodCgpO1xuICAgIGNvbnN0IHcgPSB0aGlzLnBpY2tXaWR0aCgpO1xuICAgIGNvbnN0IHNpemUgPSB0aGlzLnBpY2tTaXplKCk7XG4gICAgY29uc3QgZ3JpZCA9IG5ldyBHcmlkKGgsIHcpO1xuICAgIGdyaWQuZGF0YS5maWxsKCcnKTtcbiAgICAvLyBOT1RFOiB2aW9sYXRlcyByZWFkb25seVxuICAgIE9iamVjdC5hc3NpZ24odGhpcywge2gsIHcsIHNpemUsIGdyaWQsIGZpeGVkOiBuZXcgU2V0KCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IDAsIGV4aXRNYXA6IFtdfSk7XG4gIH1cblxuICBzaHVmZmxlKHJhbmRvbTogUmFuZG9tKSB7XG4gICAgaWYgKCF0aGlzLmxvYy51c2VkIHx8IHRoaXMubWV0YSB8fCB0aGlzLmF0dGVtcHQgPiB0aGlzLm1heEF0dGVtcHRzKSByZXR1cm47XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCB7cmFuZG9tfSk7XG4gICAgd2hpbGUgKCsrdGhpcy5hdHRlbXB0IDw9IHRoaXMubWF4QXR0ZW1wdHMpIHtcbiAgICAgIHRoaXMucmVzZXQoKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYnVpbGQoKTtcbiAgICAgIGlmIChyZXN1bHQub2spIHJldHVybjtcbiAgICAgIGNvbnNvbGUubG9nKGBTaHVmZmxlIGZhaWxlZCAke3RoaXMubG9jfTogJHtyZXN1bHQuZmFpbH1gKTtcbiAgICB9XG4gICAgLy90aHJvdyBuZXcgRXJyb3IoYENvbXBsZXRlbHkgZmFpbGVkIHRvIG1hcCBzaHVmZmxlICR7bG9jfWApO1xuICAgIGNvbnNvbGUuZXJyb3IoYENvbXBsZXRlbHkgZmFpbGVkIHRvIG1hcCBzaHVmZmxlICR7dGhpcy5sb2N9YCk7XG4gIH1cblxuICBhYnN0cmFjdCBzdXJ2ZXkobWV0YTogTWV0YWxvY2F0aW9uKTogU3VydmV5O1xuXG4gIGFic3RyYWN0IGJ1aWxkKCk6IFJlc3VsdDx2b2lkPjtcblxuICBmaW5pc2goKSB7IC8vIGZpbmFsXG4gICAgaWYgKCF0aGlzLm1ldGEgfHwgdGhpcy5tZXRhID09PSB0aGlzLmxvYy5tZXRhKSByZXR1cm47XG4gICAgdGhpcy5maW5pc2hJbnRlcm5hbCgpO1xuICB9XG5cbiAgZmluaXNoSW50ZXJuYWwoKSB7XG4gICAgaWYgKCF0aGlzLm1ldGEpIHRocm93IG5ldyBFcnJvcihgaW1wb3NzaWJsZWApO1xuICAgIHRoaXMubWV0YS50cmFuc2ZlckZsYWdzKHRoaXMubG9jLm1ldGEsIHRoaXMucmFuZG9tKTtcbiAgICBjb25zdCBtYXBwZWRFeGl0czogQXJyYXk8W1BvcywgQ29ubmVjdGlvblR5cGUsIEV4aXRTcGVjXT4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtwcmVkLCBwb3MsIHR5cGVdIG9mIHRoaXMuZXhpdE1hcCkge1xuICAgICAgZm9yIChjb25zdCBbb3Bvcywgb3R5cGUsIHNwZWNdIG9mIG1hcHBlZEV4aXRzKSB7XG4gICAgICAgIGlmIChwcmVkKG9wb3MsIG90eXBlKSkge1xuICAgICAgICAgIG1hcHBlZEV4aXRzLnB1c2goW3BvcywgdHlwZSwgc3BlY10pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMubWV0YS50cmFuc2ZlckV4aXRzKHRoaXMubG9jLm1ldGEsIHRoaXMucmFuZG9tKTtcbiAgICBmb3IgKGNvbnN0IFtzcmNQb3MsIHNyY1R5cGUsIHNwZWNdIG9mIG1hcHBlZEV4aXRzKSB7XG4gICAgICBjb25zdCBkZXN0ID0gdGhpcy5tZXRhLnJvbS5sb2NhdGlvbnNbc3BlY1swXSA+Pj4gOF0ubWV0YTtcbiAgICAgIGNvbnN0IGRlc3RQb3MgPSBzcGVjWzBdICYgMHhmZjtcbiAgICAgIGNvbnN0IGRlc3RUeXBlID0gc3BlY1sxXTtcbiAgICAgIHRoaXMubWV0YS5hdHRhY2goc3JjUG9zLCBkZXN0LCBkZXN0UG9zLCBzcmNUeXBlLCBkZXN0VHlwZSk7XG4gICAgfVxuICAgIHRoaXMubWV0YS50cmFuc2ZlclNwYXducyh0aGlzLmxvYy5tZXRhLCB0aGlzLnJhbmRvbSk7XG4gICAgdGhpcy5tZXRhLnRyYW5zZmVyUGl0cyh0aGlzLmxvYy5tZXRhKTtcbiAgICAvL25ld01ldGEucmVwbGFjZU1vbnN0ZXJzKHRoaXMucmFuZG9tKTtcbiAgICB0aGlzLmxvYy5tZXRhID0gdGhpcy5tZXRhO1xuICB9XG5cbiAgcGlja0hlaWdodCgpOiBudW1iZXIge1xuICAgIHJldHVybiBNYXRoLm1heCgxLCBNYXRoLm1pbigxNiwgdGhpcy5vcmlnLmhlaWdodCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguZmxvb3IoKHRoaXMucmFuZG9tLm5leHRJbnQoNikgLSAxKSAvIDMpKSk7XG4gIH1cblxuICBwaWNrV2lkdGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gTWF0aC5tYXgoMSwgTWF0aC5taW4oOCwgdGhpcy5vcmlnLndpZHRoICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5mbG9vcigodGhpcy5yYW5kb20ubmV4dEludCg2KSAtIDEpIC8gMykpKTtcbiAgfVxuXG4gIHBpY2tTaXplKCk6IG51bWJlciB7XG4gICAgLy8gNDAlIGNoYW5jZSBvZiArMSBzaXplXG4gICAgcmV0dXJuIHRoaXMucGFyYW1zLnNpemUgKyAodGhpcy5yYW5kb20ubmV4dEludCg1KSA8IDIgPyAxIDogMCk7XG4gIH1cblxuICBpbnNlcnRUaWxlKHBvczogUG9zLCB0aWxlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBzID0gdGhpcy5wb3NUb0dyaWQocG9zKTtcbiAgICBmb3IgKGxldCByID0gMDsgciA8IDM7IHIrKykge1xuICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCAzOyBjKyspIHtcbiAgICAgICAgY29uc3QgZyA9IHMgKyByICogMHg4MDAgKyBjICogOCBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICh0aGlzLmZpeGVkLmhhcyhnKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBjb25zdCB2ID0gdGhpcy5ncmlkLmdldChnKTtcbiAgICAgICAgaWYgKHYgJiYgdiAhPT0gdGlsZVtyICogMyArIGNdKSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAobGV0IHIgPSAwOyByIDwgMzsgcisrKSB7XG4gICAgICBmb3IgKGxldCBjID0gMDsgYyA8IDM7IGMrKykge1xuICAgICAgICBjb25zdCBnID0gcyArIHIgKiAweDgwMCArIGMgKiA4IGFzIEdyaWRDb29yZDtcbiAgICAgICAgdGhpcy5ncmlkLnNldChnLCB0aWxlW3IgKiAzICsgY10pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHBvc1RvR3JpZChwb3M6IFBvcywgb2Zmc2V0OiBudW1iZXIgPSAwKTogR3JpZENvb3JkIHtcbiAgICBjb25zdCB5ID0gcG9zID4+PiA0O1xuICAgIGNvbnN0IHggPSBwb3MgJiAweGY7XG4gICAgcmV0dXJuICh5IDw8IDEyIHwgeCA8PCA0KSArIG9mZnNldCBhcyBHcmlkQ29vcmQ7XG4gIH1cblxuICBpbnNlcnRQYXR0ZXJuKHBhdHRlcm46IHJlYWRvbmx5IHN0cmluZ1tdLFxuICAgICAgICAgICAgICAgIHt0b3AgPSAwLCBib3R0b20gPSAwLCBsZWZ0ID0gMCwgcmlnaHQgPSAwfSA9IHt9KTogUmVzdWx0PHZvaWQ+IHtcbiAgICBjb25zdCBwaCA9IChwYXR0ZXJuLmxlbmd0aCAtIDEpID4+PiAxO1xuICAgIGNvbnN0IHB3ID0gKHBhdHRlcm5bMF0ubGVuZ3RoIC0gMSkgPj4+IDE7XG4gICAgY29uc3QgZGggPSB0b3AgKyBib3R0b207XG4gICAgY29uc3QgZHcgPSBsZWZ0ICsgcmlnaHQ7XG4gICAgaWYgKHRoaXMuaCA8IHBoICsgZGgpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgdG9vIHNob3J0YH07XG4gICAgaWYgKHRoaXMudyA8IHB3ICsgZHcpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgdG9vIG5hcnJvd2B9O1xuICAgIGNvbnN0IHkwID0gdGhpcy5yYW5kb20ubmV4dEludCh0aGlzLmggLSBwaCAtIDEgLSBkaCkgKyB0b3A7XG4gICAgY29uc3QgeDAgPSB0aGlzLnJhbmRvbS5uZXh0SW50KHRoaXMudyAtIHB3IC0gMSAtIGRoKSArIGxlZnQ7XG4gICAgY29uc3QgYzAgPSAoeTAgKyAxKSA8PCAxMiB8ICh4MCArIDEpIDw8IDQ7XG4gICAgR3JpZC53cml0ZUdyaWQyZCh0aGlzLmdyaWQsIGMwIGFzIEdyaWRDb29yZCwgcGF0dGVybik7XG4gICAgZm9yIChsZXQgeSA9IDB4MzAwMDsgeSA8PSAweDUwMDA7IHkgKz0gMHg4MDApIHtcbiAgICAgIGZvciAobGV0IHggPSAweDMwOyB4IDw9IDB4NDA7IHggKz0gMHg4KSB7XG4gICAgICAgIHRoaXMuZml4ZWQuYWRkKGMwICsgKHkgfCB4KSBhcyBHcmlkQ29vcmQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge29rOiB0cnVlLCB2YWx1ZTogdW5kZWZpbmVkfTtcbiAgfVxuXG4gIC8qKiBFeHRyYWN0IGEgM3gzIHNlY3Rpb24gaW50byBhIChow5d3KS1jaGFyYWN0ZXIgc3RyaW5nLiAqL1xuICBleHRyYWN0KGc6IEdyaWQ8YW55PiwgYzogR3JpZENvb3JkLFxuICAgICAgICAgIHtoID0gMywgdyA9IDMsXG4gICAgICAgICAgIHJlcGxhY2UgPSB1bmRlZmluZWQgYXMgTWFwPEdyaWRDb29yZCwgc3RyaW5nPnx1bmRlZmluZWQsXG4gICAgICAgICAgfSA9IHt9KTogc3RyaW5nIHtcbiAgICBjb25zdCBpbmRleCA9IGcuaW5kZXgoYyk7XG4gICAgbGV0IG91dCA9ICcnO1xuICAgIGNvbnN0IGVuZCA9IGluZGV4ICsgaCAqIGcucm93O1xuICAgIGNvbnN0IHtyb3d9ID0gZztcbiAgICBmb3IgKGxldCByID0gaW5kZXggYXMgbnVtYmVyOyByIDwgZW5kOyByICs9IHJvdykge1xuICAgICAgZm9yIChsZXQgaSA9IHI7IGkgPCByICsgdzsgaSsrKSB7XG4gICAgICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgICAgY29uc3QgcyA9IHJlcGxhY2UuZ2V0KGcuY29vcmQoaSBhcyBHcmlkSW5kZXgpKTtcbiAgICAgICAgICBpZiAocyAhPSBudWxsKSB7XG4gICAgICAgICAgICBvdXQgKz0gKHMgfHwgJyAnKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gKGcuZGF0YVtpXSB8fCAnICcpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgY2FuU2V0KGM6IEdyaWRDb29yZCwgdjogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2FuU2V0QWxsKG5ldyBNYXAoW1tjLCB2XV0pKTtcbiAgfVxuXG4gIGNhblNldEFsbChyZXBsYWNlOiBNYXA8R3JpZENvb3JkLCBzdHJpbmc+KTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2NyZWVucyA9IG5ldyBTZXQ8R3JpZENvb3JkPigpO1xuICAgIGZvciAoY29uc3QgYyBvZiByZXBsYWNlLmtleXMoKSkge1xuICAgICAgaWYgKHRoaXMuZml4ZWQuaGFzKGMpKSByZXR1cm4gZmFsc2U7XG4gICAgICBjb25zdCBzID0gKGMgJiB+MHg4MDgpIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IHkgPSBzID4+PiAxMjtcbiAgICAgIGNvbnN0IHggPSAocyA+Pj4gNCkgJiAweGY7XG4gICAgICBpZiAoeCA8IHRoaXMudyAmJiB5IDwgdGhpcy5oKSBzY3JlZW5zLmFkZChzKTtcbiAgICAgIGlmICghKGMgJiA4KSAmJiB5IDwgdGhpcy5oICYmIHgpIHNjcmVlbnMuYWRkKHMgLSAweDEwIGFzIEdyaWRDb29yZCk7XG4gICAgICBpZiAoIShjICYgMHg4MDApICYmIHggPCB0aGlzLncgJiYgeSkgc2NyZWVucy5hZGQocyAtIDB4MTAwMCBhcyBHcmlkQ29vcmQpO1xuICAgICAgaWYgKCEoYyAmIDB4ODA4KSAmJiB4ICYmIHkpIHNjcmVlbnMuYWRkKHMgLSAweDEwMTAgYXMgR3JpZENvb3JkKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBzIG9mIHNjcmVlbnMpIHtcbiAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QodGhpcy5ncmlkLCBzLCB7cmVwbGFjZX0pO1xuICAgICAgaWYgKCF0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHRpbGUpLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkQWxsRml4ZWQoKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmdyaWQuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHRoaXMuZ3JpZC5kYXRhW2ldKSB0aGlzLmZpeGVkLmFkZCh0aGlzLmdyaWQuY29vcmQoaSBhcyBHcmlkSW5kZXgpKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==