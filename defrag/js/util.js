export class Deque {
    constructor() {
        this.buffer = new Array(16);
        this.mask = 0xf;
        this.start = 0;
        this.end = 0;
        this.size = 0;
    }
    get length() {
        return this.size;
    }
    upsize(target) {
        while (this.mask < target) {
            if (this.end <= this.start)
                this.start += this.mask + 1;
            this.mask = this.mask << 1 | 1;
            this.buffer = this.buffer.concat(this.buffer);
        }
        this.size = target;
    }
    push(...elems) {
        this.upsize(this.size + elems.length);
        for (const elem of elems) {
            this.buffer[this.end] = elem;
            this.end = (this.end + 1) & this.mask;
        }
    }
    pop() {
        if (!this.size)
            return undefined;
        this.end = (this.end - 1) & this.mask;
        this.size--;
        return this.buffer[this.end];
    }
    peek() {
        if (!this.size)
            return undefined;
        return this.buffer[(this.end - 1) & this.mask];
    }
    unshift(...elems) {
        this.upsize(this.size + elems.length);
        for (const elem of elems) {
            this.start = (this.start - 1) & this.mask;
            this.buffer[this.start] = elem;
        }
    }
    shift() {
        if (!this.size)
            return undefined;
        const result = this.buffer[this.start];
        this.start = (this.start + 1) & this.mask;
        this.size--;
        return result;
    }
    front() {
        if (!this.size)
            return undefined;
        return this.buffer[this.start];
    }
    toString() {
        const parts = new Array(this.size);
        for (let i = 0; i < this.size; i++) {
            parts[i] = this.buffer[(this.start + i) & this.mask];
        }
        return `[${parts.join(', ')}]`;
    }
}
//# sourceMappingURL=util.js.map