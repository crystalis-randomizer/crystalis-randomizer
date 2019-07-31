export class UnionFind {
    constructor() {
        this.data = new Map();
        this.sizes = new Map();
    }
    find(elem) {
        if (!this.data.has(elem)) {
            this.data.set(elem, elem);
            this.sizes.set(elem, 1);
        }
        let next;
        while ((next = this.data.get(elem)) !== elem) {
            this.data.set(elem, elem = this.data.get(next));
        }
        return elem;
    }
    union(elems) {
        this.find(elems[0]);
        for (let i = 1; i < elems.length; i++) {
            this.unionInternal(elems[0], elems[i]);
        }
    }
    unionInternal(a, b) {
        a = this.find(a);
        b = this.find(b);
        if (a === b)
            return;
        const sa = this.sizes.get(a);
        const sb = this.sizes.get(b);
        if (sa < sb) {
            this.sizes.set(b, sa + sb);
            this.data.set(a, b);
        }
        else {
            this.sizes.set(a, sa + sb);
            this.data.set(b, a);
        }
    }
    sets() {
        const sets = new Map();
        for (const elem of this.data.keys()) {
            const root = this.find(elem);
            let set = sets.get(root);
            if (!set)
                sets.set(root, set = new Set());
            set.add(elem);
        }
        return [...sets.values()];
    }
    map() {
        const sets = new Map();
        for (const elem of this.data.keys()) {
            const root = this.find(elem);
            let set = sets.get(root);
            if (!set)
                sets.set(root, set = new Set());
            set.add(elem);
        }
        return sets;
    }
    roots() {
        const roots = new Set();
        for (const elem of this.data.keys()) {
            roots.add(this.find(elem));
        }
        return [...roots];
    }
}
//# sourceMappingURL=unionfind.js.map