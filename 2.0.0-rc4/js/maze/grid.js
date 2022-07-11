import { UnionFind } from '../unionfind.js';
import { hex } from '../rom/util.js';
export class Grid {
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this._coords = undefined;
        this.data = new Array((height << 1 | 1) * (width << 1 | 1));
        this.row = this.width << 1 | 1;
    }
    screens() {
        if (this._coords)
            return this._coords;
        const coords = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                coords.push((y << 12 | x << 4));
            }
        }
        return this._coords = coords;
    }
    index(c) {
        return (((c & 0xf8) >> 3) + this.row * (c >>> 11));
    }
    index2(y, x) {
        return ((this.row << 1) * y + 2 * x);
    }
    yx(index) {
        const x = index % this.row;
        const y = (index - x) / this.row;
        return [y / 2, x / 2];
    }
    coord(index) {
        const x = index % this.row;
        const y = (index - x) / this.row;
        return (y << 11 | x << 3);
    }
    get(c) {
        return this.data[this.index(c)];
    }
    set(c, v) {
        this.data[this.index(c)] = v;
    }
    get2(y, x) {
        return this.data[this.index2(y, x)];
    }
    set2(y, x, v) {
        this.data[this.index2(y, x)] = v;
    }
    plus(index, dy, dx) {
        return (index + (this.row << 1) * dy + 2 * dx);
    }
    x(index) {
        return (index % this.row) / 2;
    }
    y(index) {
        return Math.floor(index / this.row) / 2;
    }
    border(dir, position) {
        let x, y;
        if (dir & 1) {
            y = position << 12 | 0x800;
            x = dir & 2 ? this.width << 4 : 0;
        }
        else {
            y = dir & 2 ? this.height << 12 : 0;
            x = position << 4 | 0x8;
        }
        return (y | x);
    }
    randomBorder(random, dir) {
        let x, y;
        if (dir != null) {
            if (dir & 1) {
                y = random.nextInt(this.height) << 12 | 0x800;
                x = dir & 2 ? this.width << 4 : 0;
            }
            else {
                y = dir & 2 ? this.height << 12 : 0;
                x = random.nextInt(this.width) << 4 | 0x8;
            }
        }
        else {
            const semiperimiter = this.width + this.height;
            let s = random.nextInt(semiperimiter << 1) - semiperimiter;
            let d = false;
            if (s < 0) {
                s = ~s;
                d = true;
            }
            if (s < this.width) {
                x = s << 4 | 0x8;
                y = d ? this.height << 12 : 0;
            }
            else {
                y = (s - this.width) << 12 | 0x800;
                x = d ? this.width << 4 : 0;
            }
        }
        return (y | x);
    }
    oppositeBorder(edge) {
        return edge & 0x8 ?
            (edge ^ (this.height << 12)) :
            (edge ^ (this.width << 4));
    }
    furthestBorder(edge) {
        return ((this.height << 12 | this.width << 4) - edge);
    }
    edgeCoordination(center, want) {
        let count = 0;
        if ((center & 0x808) !== 0x808)
            throw new Error(`Bad tile: ${hex(center)}`);
        for (const dir of [8, -8, 0x800, -0x800]) {
            const s = this.get(center + dir);
            if (want ? s === want : s)
                count++;
        }
        return count;
    }
    isBorder(c) {
        if (c & 8) {
            if (c & 0x800)
                return false;
            const y = c >>> 12;
            return !y || y === this.height;
        }
        else if (c & 0x800) {
            const x = (c >>> 4) & 0xf;
            return !x || x === this.width;
        }
        return false;
    }
    partition(replace) {
        var _a, _b, _c;
        const uf = new UnionFind();
        for (let y = 0; y < this.data.length; y += this.row) {
            for (let x = 0; x < this.row; x++) {
                const i = (y + x);
                const coord = this.coord(i);
                const val = (_a = replace === null || replace === void 0 ? void 0 : replace.get(coord)) !== null && _a !== void 0 ? _a : this.data[i];
                if (!val)
                    continue;
                uf.find(coord);
                const above = (coord - 0x800);
                if (y && ((_b = replace === null || replace === void 0 ? void 0 : replace.get(above)) !== null && _b !== void 0 ? _b : this.data[i - this.row])) {
                    uf.union([coord, above]);
                }
                const left = (coord - 8);
                if (x && ((_c = replace === null || replace === void 0 ? void 0 : replace.get(left)) !== null && _c !== void 0 ? _c : this.data[i - 1])) {
                    uf.union([coord, left]);
                }
            }
        }
        return uf.map();
    }
    show() {
        const lines = [];
        for (let y = 0; y < this.data.length; y += this.row) {
            let line = '';
            for (let x = 0; x < this.row; x++) {
                line += this.data[y + x] || ' ';
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    static writeGrid2d(g, c, data) {
        const top = g.index(c);
        for (let y = 0; y < data.length; y++) {
            const row = data[y];
            for (let x = 0; x < row.length; x++) {
                const c = row[x];
                g.data[top + y * g.row + x] = c !== ' ' ? c : '';
            }
        }
    }
}
export function coordToPos(c) {
    return (c >> 4) & 0xf | (c >> 8) & 0xf0;
}
export function W(c, n = 1) {
    return c - n * 8;
}
export function E(c, n = 1) {
    return c + n * 8;
}
export function N(c, n = 1) {
    return c - n * 0x800;
}
export function S(c, n = 1) {
    return c + n * 0x800;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9tYXplL2dyaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRTVDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQWtDckMsTUFBTSxPQUFPLElBQUk7SUFLZixZQUFxQixNQUFjLEVBQVcsS0FBYTtRQUF0QyxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQVcsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUZuRCxZQUFPLEdBQTBCLFNBQVMsQ0FBQztRQUdqRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBR0QsT0FBTztRQUNMLElBQUksSUFBSSxDQUFDLE9BQU87WUFBRSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDdEMsTUFBTSxNQUFNLEdBQWdCLEVBQUUsQ0FBQztRQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDbkMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBYyxDQUFDLENBQUM7YUFDOUM7U0FDRjtRQUNELE9BQU8sSUFBSSxDQUFDLE9B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QUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2FBQ2xEO1NBQ0Y7SUFDSCxDQUFDO0NBQ0Y7QUFHRCxNQUFNLFVBQVUsVUFBVSxDQUFDLENBQVk7SUFDckMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQzFDLENBQUM7QUFFRCxNQUFNLFVBQVUsQ0FBQyxDQUFDLENBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQztJQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBYyxDQUFDO0FBQ2hDLENBQUM7QUFFRCxNQUFNLFVBQVUsQ0FBQyxDQUFDLENBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQztJQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBYyxDQUFDO0FBQ2hDLENBQUM7QUFFRCxNQUFNLFVBQVUsQ0FBQyxDQUFDLENBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQztJQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBa0IsQ0FBQztBQUNwQyxDQUFDO0FBRUQsTUFBTSxVQUFVLENBQUMsQ0FBQyxDQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUM7SUFDbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQWtCLENBQUM7QUFDcEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJhbmRvbSB9IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5pbXBvcnQgeyBVbmlvbkZpbmQgfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHsgUG9zIH0gZnJvbSAnLi4vcm9tL21ldGFsb2NhdGlvbi5qcyc7XG5pbXBvcnQgeyBoZXggfSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5cbmV4cG9ydCB0eXBlIEdyaWRJbmRleCA9IG51bWJlciAmIHtfX2dyaWRfaW5kZXhfXzogbmV2ZXJ9O1xuZXhwb3J0IHR5cGUgR3JpZENvb3JkID0gbnVtYmVyICYge19fZ3JpZF9jb29yZF9fOiBuZXZlcn07XG5cbi8qKlxuICogQSBncmlkIG9mIG5vZGVzLCBlZGdlcywgYW5kIGNvcm5lcnMuICBXZSBjYW4gcmVwcmVzZW50IGEgc2luZ2xlXG4gKiBwb2ludCBvbiB0aGUgZ3JpZCBpbiBvbmUgb2YgdGhyZWUgd2F5czogKDEpIGFzIGEgcGFpciBbeSwgeF0gb2ZcbiAqIGhhbGYtaW50ZWdlcnM7ICgyKSBhcyBhIHNpbmdsZSAxNi1iaXQgaGV4IG51bWJlciwgd2hlcmUgd2UgdXNlXG4gKiB0aGUgaGlnaCBuaWJibGUgb2YgZWFjaCBieXRlIGZvciB0aGUgd2hvbGUgcGFydCBhbmQgdGhlIDA4IGJpdFxuICogZm9yIHRoZSBoYWxmOyBvciAoMykgYXMgYW4gaW5kZXggaW50byBhIGRlbnNlIGFycmF5LlxuICpcbiAqIE5vZGVzIGhhdmUgaGFsZnMgaW4gYm90aCBieXRlcywgZWRnZXMgaGF2ZSBoYWxmcyBpbiBleGFjdGx5IG9uZVxuICogYnl0ZSwgYW5kIGNvcm5lcnMgaGF2ZSBlZGdlcyBpbiBuZWl0aGVyLiAgRm9yIGV4YW1wbGUsXG4gKiBgYGBcbiAqICAgICAgICAwMDA4ICAgICAgICAwMDE4XG4gKiAgMDgwMCAgMDgwOCAgMDgxMCAgMDgxOCAgMDgyMFxuICogICAgICAgIDEwMDggICAgICAgIDEwMThcbiAqICAxODAwICAxODA4ICAxODEwICAxODE4ICAxODIwXG4gKiAgICAgICAgMjAwOCAgICAgICAgMjAxOFxuICogIDI4MDAgIDI4MDggIDI4MTAgIDI4MTggIDI4MjBcbiAqICAgICAgICAzMDA4ICAgICAgICAzMDE4XG4gKiBgYGBcbiAqIFRoaXMgaXMgYSBoZWlnaHQtMywgd2lkdGgtMiBncmlkIHdpdGggdGhlIGNvcm5lcnMgKDAwMDAsIDAwMTAsXG4gKiAxMDAwLCBldGMpIG9taXR0ZWQsIGFzIHRoZXkgd291bGQgYmUgZm9yIGNhdmUgbWF6ZXMuXG4gKlxuICogTm90ZSB0aGF0IGl0IG1heSBiZSBwb3NzaWJsZSB0byBoYXZlIDEwMHh4IGZvciB0aGUgYm90dG9tXG4gKiBlZGdlIG9mIGEgdmVyeSB0YWxsIG1hemUuXG4gKlxuICogSWYgZXhwcmVzc2VkIGFzIFt5LCB4XSBwYWlycywgdGhlIHRvcC1sZWZ0IGNvcm5lciBpcyBbMCwgMF0sXG4gKiB3aGlsZSB0aGUgYm90dG9tLXJpZ2h0IGlzIFtoZWlnaHQsIHdpZHRoXS4gIENvcm5lcnMgYXJlIGFnYWluXG4gKiBvbiB0aGUgd2hvbGUgbnVtYmVycywgZWRnZXMgb24gb2RkIHBhaXJzLCBhbmQgY2VudGVycyBvbiBldmVuXG4gKiBoYWxmIHBhaXJzLlxuICovXG5leHBvcnQgY2xhc3MgR3JpZDxUPiB7XG4gIGRhdGE6IFRbXTtcbiAgcmVhZG9ubHkgcm93OiBudW1iZXI7IC8vIGxlbmd0aCBvZiBhIHJvdyA9IDIgKiB3aWR0aCArIDFcbiAgcHJpdmF0ZSBfY29vcmRzPzogcmVhZG9ubHkgR3JpZENvb3JkW10gPSB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgaGVpZ2h0OiBudW1iZXIsIHJlYWRvbmx5IHdpZHRoOiBudW1iZXIpIHtcbiAgICB0aGlzLmRhdGEgPSBuZXcgQXJyYXkoKGhlaWdodCA8PCAxIHwgMSkgKiAod2lkdGggPDwgMSB8IDEpKTtcbiAgICB0aGlzLnJvdyA9IHRoaXMud2lkdGggPDwgMSB8IDE7XG4gIH1cblxuICAvKiogUmV0dXJucyBHcmlkQ29vcmRzIGZvciB0aGUgdG9wLWxlZnQgY29ybmVyIG9mIGVhY2ggc2NyZWVuLiAqL1xuICBzY3JlZW5zKCk6IHJlYWRvbmx5IEdyaWRDb29yZFtdIHtcbiAgICBpZiAodGhpcy5fY29vcmRzKSByZXR1cm4gdGhpcy5fY29vcmRzO1xuICAgIGNvbnN0IGNvb3JkczogR3JpZENvb3JkW10gPSBbXTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvb3Jkcy5wdXNoKCh5IDw8IDEyIHwgeCA8PCA0KSBhcyBHcmlkQ29vcmQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY29vcmRzID0gY29vcmRzO1xuICB9XG5cbiAgaW5kZXgoYzogR3JpZENvb3JkKTogR3JpZEluZGV4IHtcbiAgICByZXR1cm4gKCgoYyAmIDB4ZjgpID4+IDMpICsgdGhpcy5yb3cgKiAoYyA+Pj4gMTEpKSBhcyBHcmlkSW5kZXg7XG4gIH1cblxuICBpbmRleDIoeTogbnVtYmVyLCB4OiBudW1iZXIpOiBHcmlkSW5kZXgge1xuICAgIHJldHVybiAoKHRoaXMucm93IDw8IDEpICogeSArIDIgKiB4KSBhcyBHcmlkSW5kZXg7XG4gIH1cblxuICB5eChpbmRleDogR3JpZEluZGV4KTogW251bWJlciwgbnVtYmVyXSB7XG4gICAgY29uc3QgeCA9IGluZGV4ICUgdGhpcy5yb3c7XG4gICAgY29uc3QgeSA9IChpbmRleCAtIHgpIC8gdGhpcy5yb3c7XG4gICAgcmV0dXJuIFt5IC8gMiwgeCAvIDJdO1xuICB9XG5cbiAgY29vcmQoaW5kZXg6IEdyaWRJbmRleCk6IEdyaWRDb29yZCB7XG4gICAgY29uc3QgeCA9IGluZGV4ICUgdGhpcy5yb3c7XG4gICAgY29uc3QgeSA9IChpbmRleCAtIHgpIC8gdGhpcy5yb3c7XG4gICAgcmV0dXJuICh5IDw8IDExIHwgeCA8PCAzKSBhcyBHcmlkQ29vcmQ7XG4gIH1cblxuICBnZXQoYzogR3JpZENvb3JkKTogVCB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YVt0aGlzLmluZGV4KGMpXTtcbiAgfVxuXG4gIHNldChjOiBHcmlkQ29vcmQsIHY6IFQpIHtcbiAgICB0aGlzLmRhdGFbdGhpcy5pbmRleChjKV0gPSB2O1xuICB9XG5cbiAgZ2V0Mih5OiBudW1iZXIsIHg6IG51bWJlcik6IFQge1xuICAgIHJldHVybiB0aGlzLmRhdGFbdGhpcy5pbmRleDIoeSwgeCldO1xuICB9XG5cbiAgc2V0Mih5OiBudW1iZXIsIHg6IG51bWJlciwgdjogVCkge1xuICAgIHRoaXMuZGF0YVt0aGlzLmluZGV4Mih5LCB4KV0gPSB2O1xuICB9XG5cbiAgcGx1cyhpbmRleDogR3JpZEluZGV4LCBkeTogbnVtYmVyLCBkeDogbnVtYmVyKTogR3JpZEluZGV4IHtcbiAgICByZXR1cm4gKGluZGV4ICsgKHRoaXMucm93IDw8IDEpICogZHkgKyAyICogZHgpIGFzIEdyaWRJbmRleDtcbiAgfVxuXG4gIHgoaW5kZXg6IEdyaWRJbmRleCk6IG51bWJlciB7XG4gICAgcmV0dXJuIChpbmRleCAlIHRoaXMucm93KSAvIDI7XG4gIH1cblxuICB5KGluZGV4OiBHcmlkSW5kZXgpOiBudW1iZXIge1xuICAgIHJldHVybiBNYXRoLmZsb29yKGluZGV4IC8gdGhpcy5yb3cpIC8gMjtcbiAgfVxuXG4gIGJvcmRlcihkaXI6IG51bWJlciwgcG9zaXRpb246IG51bWJlcik6IEdyaWRDb29yZCB7XG4gICAgbGV0IHgsIHk6IG51bWJlcjtcbiAgICBpZiAoZGlyICYgMSkgeyAvLyBob3Jpem9udGFsIGVkZ2UgKGFsb25nIGxlZnQgb3IgcmlnaHQpXG4gICAgICB5ID0gcG9zaXRpb24gPDwgMTIgfCAweDgwMDtcbiAgICAgIHggPSBkaXIgJiAyID8gdGhpcy53aWR0aCA8PCA0IDogMDtcbiAgICB9IGVsc2UgeyAvLyB2ZXJ0aWNhbCBlZGdlIChhbG9uZyB0b3Agb3IgYm90dG9tKVxuICAgICAgeSA9IGRpciAmIDIgPyB0aGlzLmhlaWdodCA8PCAxMiA6IDA7XG4gICAgICB4ID0gcG9zaXRpb24gPDwgNCB8IDB4ODtcbiAgICB9XG4gICAgcmV0dXJuICh5IHwgeCkgYXMgR3JpZENvb3JkO1xuICB9XG5cbiAgcmFuZG9tQm9yZGVyKHJhbmRvbTogUmFuZG9tLCBkaXI/OiBudW1iZXIpOiBHcmlkQ29vcmQge1xuICAgIGxldCB4LCB5OiBudW1iZXI7XG4gICAgaWYgKGRpciAhPSBudWxsKSB7XG4gICAgICAvLyBpZiBkaXIgaXMgc3BlY2lmaWVkLCByZXR1cm5zIGFuIGVkZ2Ugb24gdGhhdCB3YWxsXG4gICAgICBpZiAoZGlyICYgMSkgeyAvLyBob3Jpem9udGFsIGVkZ2UgKGFsb25nIGxlZnQgb3IgcmlnaHQpXG4gICAgICAgIHkgPSByYW5kb20ubmV4dEludCh0aGlzLmhlaWdodCkgPDwgMTIgfCAweDgwMDtcbiAgICAgICAgeCA9IGRpciAmIDIgPyB0aGlzLndpZHRoIDw8IDQgOiAwO1xuICAgICAgfSBlbHNlIHsgLy8gdmVydGljYWwgZWRnZSAoYWxvbmcgdG9wIG9yIGJvdHRvbSlcbiAgICAgICAgeSA9IGRpciAmIDIgPyB0aGlzLmhlaWdodCA8PCAxMiA6IDA7XG4gICAgICAgIHggPSByYW5kb20ubmV4dEludCh0aGlzLndpZHRoKSA8PCA0IHwgMHg4O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBvdGhlcndpc2UgcGljayBhbiBlZGdlIHdpdGggZXF1YWwgcHJvYmFiaWxpdHlcbiAgICAgIGNvbnN0IHNlbWlwZXJpbWl0ZXIgPSB0aGlzLndpZHRoICsgdGhpcy5oZWlnaHQ7XG4gICAgICBsZXQgcyA9IHJhbmRvbS5uZXh0SW50KHNlbWlwZXJpbWl0ZXIgPDwgMSkgLSBzZW1pcGVyaW1pdGVyO1xuICAgICAgbGV0IGQgPSBmYWxzZTtcbiAgICAgIGlmIChzIDwgMCkge1xuICAgICAgICBzID0gfnM7XG4gICAgICAgIGQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKHMgPCB0aGlzLndpZHRoKSB7XG4gICAgICAgIHggPSBzIDw8IDQgfCAweDg7XG4gICAgICAgIHkgPSBkID8gdGhpcy5oZWlnaHQgPDwgMTIgOiAwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgeSA9IChzIC0gdGhpcy53aWR0aCkgPDwgMTIgfCAweDgwMDtcbiAgICAgICAgeCA9IGQgPyB0aGlzLndpZHRoIDw8IDQgOiAwO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gKHkgfCB4KSBhcyBHcmlkQ29vcmQ7XG4gIH1cblxuICBvcHBvc2l0ZUJvcmRlcihlZGdlOiBHcmlkQ29vcmQpOiBHcmlkQ29vcmQge1xuICAgIHJldHVybiBlZGdlICYgMHg4ID9cbiAgICAgICAgKGVkZ2UgXiAodGhpcy5oZWlnaHQgPDwgMTIpKSBhcyBHcmlkQ29vcmQgOlxuICAgICAgICAoZWRnZSBeICh0aGlzLndpZHRoIDw8IDQpKSBhcyBHcmlkQ29vcmQ7XG4gIH1cblxuICBmdXJ0aGVzdEJvcmRlcihlZGdlOiBHcmlkQ29vcmQpOiBHcmlkQ29vcmQge1xuICAgIHJldHVybiAoKHRoaXMuaGVpZ2h0IDw8IDEyIHwgdGhpcy53aWR0aCA8PCA0KSAtIGVkZ2UpIGFzIEdyaWRDb29yZDtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHRoZSBudW1iZXIgb2Ygbm9uLWVtcHR5IGVkZ2VzLiAqL1xuICBlZGdlQ29vcmRpbmF0aW9uKGNlbnRlcjogR3JpZENvb3JkLCB3YW50PzogVCk6IG51bWJlciB7XG4gICAgbGV0IGNvdW50ID0gMDtcbiAgICBpZiAoKGNlbnRlciAmIDB4ODA4KSAhPT0gMHg4MDgpIHRocm93IG5ldyBFcnJvcihgQmFkIHRpbGU6ICR7aGV4KGNlbnRlcil9YCk7XG4gICAgZm9yIChjb25zdCBkaXIgb2YgWzgsIC04LCAweDgwMCwgLTB4ODAwXSkge1xuICAgICAgY29uc3QgcyA9IHRoaXMuZ2V0KGNlbnRlciArIGRpciBhcyBHcmlkQ29vcmQpO1xuICAgICAgaWYgKHdhbnQgPyBzID09PSB3YW50IDogcykgY291bnQrKztcbiAgICB9XG4gICAgcmV0dXJuIGNvdW50O1xuICB9XG5cbiAgaXNCb3JkZXIoYzogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgaWYgKGMgJiA4KSB7XG4gICAgICBpZiAoYyAmIDB4ODAwKSByZXR1cm4gZmFsc2U7XG4gICAgICBjb25zdCB5ID0gYyA+Pj4gMTI7XG4gICAgICByZXR1cm4gIXkgfHwgeSA9PT0gdGhpcy5oZWlnaHQ7XG4gICAgfSBlbHNlIGlmIChjICYgMHg4MDApIHtcbiAgICAgIGNvbnN0IHggPSAoYyA+Pj4gNCkgJiAweGY7XG4gICAgICByZXR1cm4gIXggfHwgeCA9PT0gdGhpcy53aWR0aDtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcGFydGl0aW9uKHJlcGxhY2U/OiBNYXA8R3JpZENvb3JkLCBUPik6IE1hcDxHcmlkQ29vcmQsIFNldDxHcmlkQ29vcmQ+PiB7XG4gICAgY29uc3QgdWYgPSBuZXcgVW5pb25GaW5kPEdyaWRDb29yZD4oKTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuZGF0YS5sZW5ndGg7IHkgKz0gdGhpcy5yb3cpIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5yb3c7IHgrKykge1xuICAgICAgICBjb25zdCBpID0gKHkgKyB4KSBhcyBHcmlkSW5kZXg7XG4gICAgICAgIGNvbnN0IGNvb3JkID0gdGhpcy5jb29yZChpKTtcbiAgICAgICAgY29uc3QgdmFsID0gcmVwbGFjZT8uZ2V0KGNvb3JkKSA/PyB0aGlzLmRhdGFbaV07XG4gICAgICAgIGlmICghdmFsKSBjb250aW51ZTtcbiAgICAgICAgdWYuZmluZChjb29yZCk7XG4gICAgICAgIGNvbnN0IGFib3ZlID0gKGNvb3JkIC0gMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKHkgJiYgKHJlcGxhY2U/LmdldChhYm92ZSkgPz8gdGhpcy5kYXRhW2kgLSB0aGlzLnJvd10pKSB7XG4gICAgICAgICAgdWYudW5pb24oW2Nvb3JkLCBhYm92ZV0pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxlZnQgPSAoY29vcmQgLSA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICh4ICYmIChyZXBsYWNlPy5nZXQobGVmdCkgPz8gdGhpcy5kYXRhW2kgLSAxXSkpIHtcbiAgICAgICAgICB1Zi51bmlvbihbY29vcmQsIGxlZnRdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdWYubWFwKCk7XG4gIH1cblxuICBzaG93KCkge1xuICAgIGNvbnN0IGxpbmVzID0gW107XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmRhdGEubGVuZ3RoOyB5ICs9IHRoaXMucm93KSB7XG4gICAgICBsZXQgbGluZSA9ICcnO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLnJvdzsgeCsrKSB7XG4gICAgICAgIGxpbmUgKz0gdGhpcy5kYXRhW3kgKyB4XSB8fCAnICc7XG4gICAgICB9XG4gICAgICBsaW5lcy5wdXNoKGxpbmUpO1xuICAgIH1cbiAgICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG4gIH1cblxuICBzdGF0aWMgd3JpdGVHcmlkMmQoZzogR3JpZDxTdHJpbmc+LCBjOiBHcmlkQ29vcmQsIGRhdGE6IHJlYWRvbmx5IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgdG9wID0gZy5pbmRleChjKTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGRhdGEubGVuZ3RoOyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IGRhdGFbeV07XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHJvdy5sZW5ndGg7IHgrKykge1xuICAgICAgICBjb25zdCBjID0gcm93W3hdO1xuICAgICAgICBnLmRhdGFbdG9wICsgeSAqIGcucm93ICsgeF0gPSBjICE9PSAnICcgPyBjIDogJyc7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8vIFRPRE8gLSBwb3NUb0Nvb3JkPyAocHJlc3VtYWJseSBjZW50ZXIpXG5leHBvcnQgZnVuY3Rpb24gY29vcmRUb1BvcyhjOiBHcmlkQ29vcmQpOiBQb3Mge1xuICByZXR1cm4gKGMgPj4gNCkgJiAweGYgfCAoYyA+PiA4KSAmIDB4ZjA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBXKGM6IEdyaWRDb29yZCwgbiA9IDEpOiBHcmlkQ29vcmQge1xuICByZXR1cm4gYyAtIG4gKiA4IGFzIEdyaWRDb29yZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIEUoYzogR3JpZENvb3JkLCBuID0gMSk6IEdyaWRDb29yZCB7XG4gIHJldHVybiBjICsgbiAqIDggYXMgR3JpZENvb3JkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gTihjOiBHcmlkQ29vcmQsIG4gPSAxKTogR3JpZENvb3JkIHtcbiAgcmV0dXJuIGMgLSBuICogMHg4MDAgYXMgR3JpZENvb3JkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gUyhjOiBHcmlkQ29vcmQsIG4gPSAxKTogR3JpZENvb3JkIHtcbiAgcmV0dXJuIGMgKyBuICogMHg4MDAgYXMgR3JpZENvb3JkO1xufVxuIl19