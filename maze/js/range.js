export class Range {
    constructor(lower, upper) {
        this.lower = lower;
        this.upper = upper;
        if (lower >= upper)
            throw new Error(`Bad range: [${lower}, ${upper})`);
    }
    has(x) {
        return this.lower <= x && x < this.upper;
    }
    span(that) {
        return new Range(Math.min(this.lower, that.lower), Math.max(this.upper, that.upper));
    }
    intersects(that) {
        return this.lower >= that.upper || this.upper >= that.lower;
    }
    intersect(that) {
        const lower = Math.max(this.lower, that.lower);
        const upper = Math.min(this.upper, that.upper);
        return lower < upper ? new Range(lower, upper) : undefined;
    }
    toString() {
        return `[${this.lower}, ${this.upper})`;
    }
}
export class RangeSet {
    constructor(ranges = []) {
        const rs = [];
        for (const range of ranges) {
            add(rs, range);
        }
        this.ranges = rs;
    }
    empty() {
        return !this.ranges.length;
    }
    has(x) {
        const r = find(this.ranges, x);
        return r >= 0 && x < this.ranges[r].upper;
    }
    plus(range) {
        const out = new RangeSet();
        add(out.ranges, range);
        return out;
    }
    minus(range) {
        const out = new RangeSet();
        remove(out.ranges, range);
        return out;
    }
    toString() {
        return this.ranges.join(' ');
    }
    meet(that) {
        const out = [];
        let i = 0;
        let j = 0;
        while (i < this.ranges.length && j < that.ranges.length) {
            if (this.ranges[i].upper <= that.ranges[j].lower) {
                i++;
            }
            else if (that.ranges[j].upper <= this.ranges[i].lower) {
                j++;
            }
            else {
                out.push(this.ranges[i], that.ranges[j]);
                const a = this.ranges[i].upper;
                const b = that.ranges[j].upper;
                if (a <= b)
                    i++;
                if (b <= a)
                    j++;
            }
        }
        const s = new RangeSet();
        s.ranges = out;
        return s;
    }
}
function add(ranges, range) {
    let start = find(ranges, range.lower);
    let end = find(ranges, range.upper);
    if (start < 0) {
        start = ~start;
    }
    else {
        range = range.span(ranges[start]);
    }
    if (end < 0) {
        end = ~end;
    }
    else {
        range = range.span(ranges[end]);
        end++;
    }
    ranges.splice(start, end - start, range);
}
function remove(ranges, range) {
    let start = find(ranges, range.lower);
    let end = find(ranges, range.upper);
    if (start >= 0 && ranges[start].lower === range.lower) {
        start = ~start;
    }
    if (end >= 0 && ranges[end].upper === range.upper) {
        end = ~(end + 1);
    }
    if (start === end) {
        if (start < 0)
            return;
        ranges.splice(start, 0, ranges[start]);
        end++;
    }
    if (start < 0) {
        start = ~start;
    }
    else {
        ranges[start] = new Range(ranges[start].lower, range.lower);
        start++;
    }
    if (end < 0) {
        end = ~end;
    }
    else {
        ranges[end] = new Range(range.upper, ranges[end].upper);
    }
    ;
    ranges.splice(start, end - start);
}
function find(ranges, x) {
    let a = 0;
    let b = ranges.length - 1;
    if (b < 0)
        return ~0;
    if (x > ranges[b].upper)
        return ~ranges.length;
    if (x >= ranges[b].lower)
        return b;
    if (x < ranges[a].lower)
        return ~0;
    if (x <= ranges[a].upper)
        return a;
    while (a < b - 1) {
        const m = Math.floor((a + b) / 2);
        if (x < ranges[m].lower) {
            b = m;
        }
        else if (x > ranges[m].upper) {
            a = m;
        }
        else {
            return m;
        }
    }
    return ~b;
}
//# sourceMappingURL=range.js.map