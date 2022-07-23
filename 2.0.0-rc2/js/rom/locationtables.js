import { DataTuple, hex } from './util.js';
export class Entrance extends DataTuple {
    constructor() {
        super(...arguments);
        this.x = this.prop([0], [1, 0xff, -8]);
        this.y = this.prop([2], [3, 0xff, -8]);
        this.screen = this.prop([3, 0x0f, -4], [1, 0x0f]);
        this.tile = this.prop([2, 0xf0], [0, 0xf0, 4]);
        this.coord = this.prop([2, 0xff, -8], [0, 0xff]);
    }
    get used() {
        return this.data[1] < 0x08;
    }
    ;
    toString() {
        return `Entrance ${this.hex()}: (${hex(this.y)}, ${hex(this.x)})`;
    }
}
Entrance.size = 4;
export class Exit extends DataTuple {
    constructor() {
        super(...arguments);
        this.x = this.prop([0, 0xff, -4]);
        this.xt = this.prop([0]);
        this.y = this.prop([1, 0xff, -4]);
        this.yt = this.prop([1]);
        this.screen = this.prop([1, 0xf0], [0, 0xf0, 4]);
        this.tile = this.prop([1, 0x0f, -4], [0, 0x0f]);
        this.coord = this.prop([1, 0x0f, -12], [0, 0x0f, -4]);
        this.dest = this.prop([2]);
        this.entrance = this.prop([3]);
    }
    isSeamless() {
        return Boolean(this.entrance & 0x20);
    }
    toString() {
        return `Exit ${this.hex()}: (${hex(this.y)}, ${hex(this.x)}) => ${this.dest}:${this.entrance}`;
    }
}
Exit.size = 4;
export class Flag extends DataTuple {
    constructor() {
        super(...arguments);
        this.x = this.prop([1, 0x07, -8]);
        this.xs = this.prop([1, 0x07]);
        this.y = this.prop([1, 0xf0, -4]);
        this.ys = this.prop([1, 0xf0, 4]);
        this.screen = this.prop([1]);
    }
    get flag() {
        return this.data[0] | 0x200;
    }
    set flag(f) {
        if ((f & ~0xff) !== 0x200)
            throw new Error(`bad flag: ${hex(f)}`);
        this.data[0] = f & 0xff;
    }
    toString() {
        return `Flag ${this.hex()}: ${hex(this.screen)} @ ${hex(this.flag)}`;
    }
}
Flag.size = 2;
export class Pit extends DataTuple {
    constructor() {
        super(...arguments);
        this.fromXs = this.prop([1, 0x70, 4]);
        this.toXs = this.prop([1, 0x07]);
        this.fromYs = this.prop([3, 0xf0, 4]);
        this.toYs = this.prop([3, 0x0f]);
        this.fromScreen = this.prop([3, 0xf0], [1, 0x70, 4]);
        this.toScreen = this.prop([3, 0x0f, -4], [1, 0x07]);
        this.dest = this.prop([0]);
    }
    toString() {
        return `Pit ${this.hex()}: (${hex(this.fromXs)}, ${hex(this.fromYs)}) => ${hex(this.dest)}:(${hex(this.toXs)}, ${hex(this.toYs)})`;
    }
}
Pit.size = 4;
export class Spawn extends DataTuple {
    constructor() {
        super(...arguments);
        this.y = this.prop([0, 0xff, -4]);
        this.yt = this.prop([0]);
        this.x = this.prop([1, 0x7f, -4], [2, 0x40, 3]);
        this.xt = this.prop([1, 0x7f]);
        this.timed = this.booleanProp(1, 7);
        this.screen = this.prop([0, 0xf0], [1, 0x70, 4]);
        this.tile = this.prop([0, 0x0f, -4], [1, 0x0f]);
        this.coord = this.prop([0, 0x0f, -12], [1, 0x0f, -4], [2, 0x40, 3]);
        this.type = this.prop([2, 0x07]);
        this.id = this.prop([3]);
        this.patternBank = this.prop([2, 0x80, 7]);
    }
    get used() {
        return this.data[0] !== 0xfe;
    }
    set used(used) {
        this.data[0] = used ? 0 : 0xfe;
    }
    [Symbol.iterator]() {
        if (this.used)
            return super[Symbol.iterator]();
        return [0xfe, 0, 0, 0][Symbol.iterator]();
    }
    get monsterId() {
        return (this.id + 0x50) & 0xff;
    }
    set monsterId(id) {
        this.id = (id - 0x50) & 0xff;
    }
    isChest() { return this.type === 2 && this.id < 0x80; }
    isInvisible() {
        return this.isChest() && Boolean(this.data[2] & 0x20);
    }
    isTrigger() { return this.type === 2 && this.id >= 0x80; }
    isNpc() { return this.type === 1 && this.id < 0xc0; }
    isBoss() { return this.type === 1 && this.id >= 0xc0; }
    isMonster() { return this.type === 0; }
    isGeneric() { return this.type === 4; }
    isWall() {
        return Boolean(this.type === 3 && (this.id < 4 || (this.data[2] & 0x20)));
    }
    isShootingWall(location) {
        return this.isWall() &&
            !!(this.data[2] & 0x20 ? this.data[2] & 0x10 :
                location.id === 0x8f || location.id === 0xa8);
    }
    wallType() {
        if (this.type !== 3)
            return '';
        const obj = this.data[2] & 0x20 ? this.id >>> 4 : this.id;
        if (obj >= 4)
            return '';
        return obj === 2 ? 'bridge' : 'wall';
    }
    wallElement() {
        if (!this.isWall())
            return -1;
        return this.id & 3;
    }
    toString() {
        return `Spawn ${this.hex()}: (${hex(this.x)}, ${hex(this.y)}) ${this.timed ? 'timed' : 'fixed'} ${this.type}:${hex(this.id)}`;
    }
}
Spawn.size = 4;
export function ytDiff(yt1, yt0) {
    let dy = yt1 - yt0;
    dy -= (yt1 >>> 4) - (yt0 >>> 4);
    return dy;
}
export function ytAdd(yt, ...dys) {
    for (const dy of dys) {
        const subscreen = dy % 15;
        const screens = (dy - subscreen) / 15;
        let ys1 = (yt >> 4) + screens;
        let yt1 = (yt & 0xf) + subscreen;
        if (yt1 < 0) {
            ys1--;
            yt1 = 0xf + yt1;
        }
        else if (yt1 >= 0xf) {
            ys1++;
            yt1 = yt1 - 0xf;
        }
        yt = ys1 << 4 | yt1;
    }
    return yt;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRpb250YWJsZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2xvY2F0aW9udGFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxTQUFTLEVBQUUsR0FBRyxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBR3pDLE1BQU0sT0FBTyxRQUFTLFNBQVEsU0FBUztJQUF2Qzs7UUFTRSxNQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbEMsTUFBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBT2xDLFdBQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFN0MsU0FBSSxHQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFNUMsVUFBSyxHQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQVUvQyxDQUFDO0lBUEMsSUFBSSxJQUFJO1FBQ04sT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUM3QixDQUFDO0lBQUEsQ0FBQztJQUVGLFFBQVE7UUFDTixPQUFPLFlBQVks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QztLQUNyQjtJQUNELE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RGF0YVR1cGxlLCBoZXh9IGZyb20gJy4vdXRpbC5qcyc7XG5cbi8qKiBBIHNpbmdsZSBzY3JlZW4gZW50cmFuY2UgY29vcmRpbmF0ZS4gKi9cbmV4cG9ydCBjbGFzcyBFbnRyYW5jZSBleHRlbmRzIERhdGFUdXBsZSB7XG4gIC8vIEJhc2ljIHBhdHRlcm46IHhsbyB4aGkgeWxvIHloaSA9ICh4cCkoeHQpICh4cykoMCkgKHlwKSh5dCkgKHlzKSgwKVxuICAvLyB3aGVyZSB4cCBpcyBwaXhlbCBwb3NpdGlvbiB3aXRoaW4gdGlsZSwgeHQgaXMgdGlsZSwgYW5kIHhzIGlzIHNjcmVlblxuICBzdGF0aWMgc2l6ZSA9IDQ7XG5cbiAgLy8geCA9IHRoaXMuYml0cyhbMCwgMTZdKVxuICAvLyB5ID0gdGhpcy5iaXRzKFsxNiwgMzJdKVxuXG4gIC8qKiBGdWxsIDExLWJpdCB4LWNvb3JkaW5hdGUgb2YgdGhlIGVudHJhbmNlLiAqL1xuICB4ID0gdGhpcy5wcm9wKFswXSwgWzEsIDB4ZmYsIC04XSk7XG4gIC8qKiBGdWxsIDEyLWJpdCB5LWNvb3JkaW5hdGUgb2YgdGhlIGVudHJhbmNlLiAqL1xuICB5ID0gdGhpcy5wcm9wKFsyXSwgWzMsIDB4ZmYsIC04XSk7XG5cbiAgLy8gc2NyZWVuID0gdGhpcy5iaXRzKFs4LCAxMl0sIFsyNCwgMjhdKTtcbiAgLy8gdGlsZSAgID0gdGhpcy5iaXRzKFs0LCA4XSwgWzIwLCAyNF0pO1xuICAvLyBjb29yZCAgPSB0aGlzLmJpdHMoWzAsIDhdLCBbMTYsIDI0XSk7XG5cbiAgLyoqIDgtYml0IHNjcmVlbiAoeXgpLiAqL1xuICBzY3JlZW4gPSB0aGlzLnByb3AoWzMsIDB4MGYsIC00XSwgWzEsIDB4MGZdKTtcbiAgLyoqIDgtYml0IHRpbGUgd2l0aGluIHRoZSBzY3JlZW4gKHl4KS4gKi9cbiAgdGlsZSAgID0gdGhpcy5wcm9wKFsyLCAweGYwXSwgWzAsIDB4ZjAsIDRdKTtcbiAgLyoqIDE2LWJpdCBjb29yZGluYXRlIHdpdGhpbiB0aGUgc2NyZWVuICh5eXh4KS4gKi9cbiAgY29vcmQgID0gdGhpcy5wcm9wKFsyLCAweGZmLCAtOF0sIFswLCAweGZmXSk7XG5cbiAgLyoqIFdoZXRoZXIgdGhlIGVudHJhbmNlIGhhcyBub3QgYmVlbiBkaXNhYmxlZCBieSBzZXR0aW5nIGl0cyB4IHRvIGZmX18uICovXG4gIGdldCB1c2VkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmRhdGFbMV0gPCAweDA4O1xuICB9O1xuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBFbnRyYW5jZSAke3RoaXMuaGV4KCl9OiAoJHtoZXgodGhpcy55KX0sICR7aGV4KHRoaXMueCl9KWA7XG4gIH1cbn1cblxuLyoqIEEgc2luZ2xlIHNjcmVlbiBleGl0IHRpbGUuICovXG5leHBvcnQgY2xhc3MgRXhpdCBleHRlbmRzIERhdGFUdXBsZSB7XG4gIHN0YXRpYyBzaXplID0gNDtcblxuICAvKiogMTEtYml0IHgtY29vcmRpbmF0ZSBvZiBleGl0IHBpeGVsIChsb3cgNCBiaXRzIGFsd2F5cyB6ZXJvKS4gKi9cbiAgeCAgICAgICAgPSB0aGlzLnByb3AoWzAsIDB4ZmYsIC00XSk7XG4gIC8qKiA3LWJpdCB4LWNvb3JkaW5hdGUgb2YgZXhpdCB0aWxlIChzY3JlZW4tdGlsZSkuICovXG4gIHh0ICAgICAgID0gdGhpcy5wcm9wKFswXSk7XG5cbiAgLyoqIDEyLWJpdCB5LWNvb3JkaW5hdGUgb2YgZXhpdCBwaXhlbCAobG93IDQgYml0cyBhbHdheXMgemVybykuICovXG4gIHkgICAgICAgID0gdGhpcy5wcm9wKFsxLCAweGZmLCAtNF0pO1xuICAvKiogOC1iaXQgeS1jb29yZGluYXRlIG9mIGV4aXQgdGlsZSAoc2NyZWVuLXRpbGUpLiAqL1xuICB5dCAgICAgICA9IHRoaXMucHJvcChbMV0pO1xuXG4gIC8qKiA4LWJpdCBzY3JlZW4gKHl4KS4gKi9cbiAgc2NyZWVuICAgPSB0aGlzLnByb3AoWzEsIDB4ZjBdLCBbMCwgMHhmMCwgNF0pO1xuICAvKiogOC1iaXQgdGlsZSB3aXRoaW4gdGhlIHNjcmVlbiAoeXgpLiAqL1xuICB0aWxlICAgICA9IHRoaXMucHJvcChbMSwgMHgwZiwgLTRdLCBbMCwgMHgwZl0pO1xuICAvKiogMTYtYml0IGNvb3JkaW5hdGUgd2l0aGluIHRoZSBzY3JlZW4gKHkweDApLiAqL1xuICBjb29yZCAgICA9IHRoaXMucHJvcChbMSwgMHgwZiwgLTEyXSwgWzAsIDB4MGYsIC00XSk7XG5cbiAgLyoqIERlc3RpbmF0aW9uIGxvY2F0aW9uIElELiAqL1xuICBkZXN0ICAgICA9IHRoaXMucHJvcChbMl0pO1xuXG4gIC8qKiBEZXN0aW5hdGlvbiBlbnRyYW5jZSBpbmRleC4gKi9cbiAgZW50cmFuY2UgPSB0aGlzLnByb3AoWzNdKTtcblxuICBpc1NlYW1sZXNzKHRoaXM6IGFueSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBCb29sZWFuKHRoaXMuZW50cmFuY2UgJiAweDIwKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBFeGl0ICR7dGhpcy5oZXgoKX06ICgke2hleCh0aGlzLnkpfSwgJHtoZXgodGhpcy54KX0pID0+ICR7XG4gICAgICAgICAgICB0aGlzLmRlc3R9OiR7dGhpcy5lbnRyYW5jZX1gO1xuICB9XG59XG5cbi8qKiBNYXBwaW5nIGZyb20gc2NyZWVuIHBvc2l0aW9uIHRvIGZsYWcgSUQuICovXG5leHBvcnQgY2xhc3MgRmxhZyBleHRlbmRzIERhdGFUdXBsZSB7XG4gIHN0YXRpYyBzaXplID0gMjtcblxuICAvKiogTWFwcGVkIGZsYWcsIGFsd2F5cyBiZXR3ZWVuICQyMDAgYW5kICQyZmYuICovXG4gIGdldCBmbGFnKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YVswXSB8IDB4MjAwO1xuICB9XG4gIHNldCBmbGFnKGY6IG51bWJlcikge1xuICAgIGlmICgoZiAmIH4weGZmKSAhPT0gMHgyMDApIHRocm93IG5ldyBFcnJvcihgYmFkIGZsYWc6ICR7aGV4KGYpfWApO1xuICAgIHRoaXMuZGF0YVswXSA9IGYgJiAweGZmO1xuICB9XG5cbiAgLyoqIDExLWJpdCB4LWNvb3JkaW5hdGUgb2YgdG9wLWxlZnQgcGl4ZWwgb2YgdGhlIGZsYWdnZWQgc2NyZWVuLiAqL1xuICB4ICAgICAgPSB0aGlzLnByb3AoWzEsIDB4MDcsIC04XSk7XG4gIC8qKiAzLWJpdCB4LWNvb3JkaW5hdGUgb2YgZmxhZ2dlZCBzY3JlZW4uICovXG4gIHhzICAgICA9IHRoaXMucHJvcChbMSwgMHgwN10pO1xuXG4gIC8qKiAxMi1iaXQgeS1jb29yZGluYXRlIG9mIHRvcC1sZWZ0IHBpeGVsIG9mIHRoZSBmbGFnZ2VkIHNjcmVlbi4gKi9cbiAgeSAgICAgID0gdGhpcy5wcm9wKFsxLCAweGYwLCAtNF0pO1xuICAvKiogNC1iaXQgeS1jb29yZGluYXRlIG9mIGZsYWdnZWQgc2NyZWVuLiAqL1xuICB5cyAgICAgPSB0aGlzLnByb3AoWzEsIDB4ZjAsIDRdKTtcblxuICAvKiogOC1iaXQgc2NyZWVuICh5eCkuICovXG4gIHNjcmVlbiA9IHRoaXMucHJvcChbMV0pO1xuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBGbGFnICR7dGhpcy5oZXgoKX06ICR7aGV4KHRoaXMuc2NyZWVuKX0gQCAke2hleCh0aGlzLmZsYWcpfWA7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFBpdCBleHRlbmRzIERhdGFUdXBsZSB7XG4gIHN0YXRpYyBzaXplID0gNDtcblxuICAvKiogMy1iaXQgeC1jb29yZGluYXRlIG9mIHBpdCdzIHNjcmVlbiBvbiB0aGlzIG1hcC4gKi9cbiAgZnJvbVhzID0gdGhpcy5wcm9wKFsxLCAweDcwLCA0XSk7XG4gIC8qKiAzLWJpdCB4LWNvb3JkaW5hdGUgb2YgZGVzdGluYXRpb24gc2NyZWVuIG9uIGRlc3RpbmF0aW9uIG1hcC4gKi9cbiAgdG9YcyAgID0gdGhpcy5wcm9wKFsxLCAweDA3XSk7XG5cbiAgLyoqIDQtYml0IHktY29vcmRpbmF0ZSBvZiBwaXQncyBzY3JlZW4gb24gdGhpcyBtYXAuICovXG4gIGZyb21ZcyA9IHRoaXMucHJvcChbMywgMHhmMCwgNF0pO1xuICAvKiogNC1iaXQgeS1jb29yZGluYXRlIG9mIGRlc3RpbmF0aW9uIHNjcmVlbiBvbiBkZXN0aW5hdGlvbiBtYXAuICovXG4gIHRvWXMgICA9IHRoaXMucHJvcChbMywgMHgwZl0pO1xuXG4gIC8qKiA4LWJpdCB5eCBvZiBcImZyb21cIiBzY3JlZW4uICovXG4gIGZyb21TY3JlZW4gPSB0aGlzLnByb3AoWzMsIDB4ZjBdLCBbMSwgMHg3MCwgNF0pO1xuICAvKiogOC1iaXQgeXggb2YgXCJ0b1wiIHNjcmVlbi4gKi9cbiAgdG9TY3JlZW4gPSB0aGlzLnByb3AoWzMsIDB4MGYsIC00XSwgWzEsIDB4MDddKTtcblxuICAvKiogTG9jYXRpb24gSUQgb2YgZGVzdGluYXRpb24uICovXG4gIGRlc3QgICA9IHRoaXMucHJvcChbMF0pO1xuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBQaXQgJHt0aGlzLmhleCgpfTogKCR7aGV4KHRoaXMuZnJvbVhzKX0sICR7aGV4KHRoaXMuZnJvbVlzKX0pID0+ICR7XG4gICAgICAgICAgICBoZXgodGhpcy5kZXN0KX06KCR7aGV4KHRoaXMudG9Ycyl9LCAke2hleCh0aGlzLnRvWXMpfSlgO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTcGF3biBleHRlbmRzIERhdGFUdXBsZSB7XG4gIHN0YXRpYyBzaXplID0gNDtcblxuICAvLyBnZXQgeSgpOiBudW1iZXIgIHsgcmV0dXJuIFNQQVdOX1kuZ2V0KHRoaXMpOyB9XG4gIC8vIHNldCB5KHk6IG51bWJlcikgeyBTUEFXTl9ZLnNldCh0aGlzLCB5KTsgfVxuXG4gIC8qKiAxMi1iaXQgeS1jb29yZGluYXRlIG9mIHNwYXduIHBpeGVsLiAqL1xuICB5ICAgICAgPSB0aGlzLnByb3AoWzAsIDB4ZmYsIC00XSk7XG4gIC8qKiA4LWJpdCB5LWNvb3JkaW5hdGUgb2Ygc3Bhd24gdGlsZS4gKi9cbiAgeXQgICAgID0gdGhpcy5wcm9wKFswXSk7XG5cbiAgLyoqIDExLWJpdCB4LWNvb3JkaW5hdGUgb2Ygc3Bhd24gcGl4ZWwuICovXG4gIHggICAgICA9IHRoaXMucHJvcChbMSwgMHg3ZiwgLTRdLCBbMiwgMHg0MCwgM10pO1xuICAvKiogNy1iaXQgeC1jb29yZGluYXRlIG9mIHNwYXduIHRpbGUuICovXG4gIHh0ICAgICA9IHRoaXMucHJvcChbMSwgMHg3Zl0pO1xuXG4gIC8qKiBUcnVlIGZvciB0aW1lZCByZXNwYXduLCBmYWxzZSBmb3IgaW5pdGlhbCBzcGF3bi4gKi9cbiAgdGltZWQgID0gdGhpcy5ib29sZWFuUHJvcCgxLCA3KTtcblxuICAvKiogOC1iaXQgc2NyZWVuIGNvb3JkaW5hdGUgKHl4KS4gKi9cbiAgc2NyZWVuID0gdGhpcy5wcm9wKFswLCAweGYwXSwgWzEsIDB4NzAsIDRdKTtcbiAgLyoqIDgtYml0IHRpbGUgY29vcmRpbmF0ZSB3aXRoaW4gdGhlIHNjcmVlbiAoeXgpLiAqL1xuICB0aWxlICAgPSB0aGlzLnByb3AoWzAsIDB4MGYsIC00XSwgWzEsIDB4MGZdKTtcbiAgLyoqIDE2LWJpdCBwaXhlbCBjb29yZGluYXRlIHdpdGhpbiB0aGUgc2NyZWVuICh5MHh4KS4gKi9cbiAgY29vcmQgID0gdGhpcy5wcm9wKFswLCAweDBmLCAtMTJdLCBbMSwgMHgwZiwgLTRdLCBbMiwgMHg0MCwgM10pO1xuXG4gIC8qKiBTcGF3biB0eXBlICgwLi40KS4gKi9cbiAgdHlwZSAgID0gdGhpcy5wcm9wKFsyLCAweDA3XSk7XG4gIC8qKiBTcGF3bmVkIG9iamVjdCBJRCAoZXhhY3QgaW50ZXJwcmV0YXRpb24gZGVwZW5kcyBvbiB0eXBlKS4gKi9cbiAgaWQgICAgID0gdGhpcy5wcm9wKFszXSk7XG5cbiAgLyoqIFBhdHRlcm4gYmFuayBzaGlmdCAoMCBvciAxKSB0byBzdG9yZSBpbiAzODAseDoyMC4gKi9cbiAgcGF0dGVybkJhbmsgPSB0aGlzLnByb3AoWzIsIDB4ODAsIDddKTtcblxuLy8gcGF0dGVybkJhbms6IHtnZXQodGhpczogYW55KTogbnVtYmVyIHsgcmV0dXJuIHRoaXMuZGF0YVsyXSA+Pj4gNzsgfSxcbi8vICAgICAgICAgICAgICAgc2V0KHRoaXM6IGFueSwgdjogbnVtYmVyKSB7IGlmICh0aGlzLmRhdGFbM10gPT09IDEyMCkgZGVidWdnZXI7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodikgdGhpcy5kYXRhWzJdIHw9IDB4ODA7IGVsc2UgdGhpcy5kYXRhWzJdICY9IDB4N2Y7IH19LFxuXG4gIC8qKiBXaGV0aGVyIHRoaXMgc3Bhd24gaXMgYWN0aXZlIChpbmFjdGl2ZSBpbmRpY2F0ZWQgYnkgJGZlIGluIFswXSkuICovXG4gIGdldCB1c2VkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmRhdGFbMF0gIT09IDB4ZmU7XG4gIH1cbiAgc2V0IHVzZWQodXNlZDogYm9vbGVhbikge1xuICAgIHRoaXMuZGF0YVswXSA9IHVzZWQgPyAwIDogMHhmZTtcbiAgfVxuXG4gIFtTeW1ib2wuaXRlcmF0b3JdKCkge1xuICAgIC8vIE92ZXJyaWRlIGl0ZXJhdG9yIHRvIGVuc3VyZSB1bnVzZWQgc3Bhd25zIGhhdmUgbm8gZGF0YS5cbiAgICBpZiAodGhpcy51c2VkKSByZXR1cm4gc3VwZXJbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgIHJldHVybiBbMHhmZSwgMCwgMCwgMF1bU3ltYm9sLml0ZXJhdG9yXSgpO1xuICB9XG5cbiAgLyoqIE9iamVjdCBJRCBvZiBtb25zdGVyIHNwYXduIChzaGlmdGVkIGJ5ICQ1MCBmcm9tIElEKS4gKi9cbiAgZ2V0IG1vbnN0ZXJJZCgpOiBudW1iZXIge1xuICAgIHJldHVybiAodGhpcy5pZCArIDB4NTApICYgMHhmZjtcbiAgfVxuICBzZXQgbW9uc3RlcklkKGlkOiBudW1iZXIpIHtcbiAgICB0aGlzLmlkID0gKGlkIC0gMHg1MCkgJiAweGZmO1xuICB9XG5cbiAgLyoqIFdoZXRoZXIgdGhpcyBzcGF3biBpcyBhIHRyZWFzdXJlIGNoZXN0IChub3RlOiBpbmNsdWRlcyBtaW1pY3MpLiAqL1xuICBpc0NoZXN0KCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy50eXBlID09PSAyICYmIHRoaXMuaWQgPCAweDgwOyB9XG4gIC8qKiBXaGV0aGVyIHRoaXMgc3Bhd24gaXMgYW4gaW52aXNpYmxlIHRyZWFzdXJlIGNoZXN0LiAqL1xuICBpc0ludmlzaWJsZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pc0NoZXN0KCkgJiYgQm9vbGVhbih0aGlzLmRhdGFbMl0gJiAweDIwKTtcbiAgfVxuICAvKiogV2hldGhlciB0aGlzIHNwYXduIGlzIGEgdHJpZ2dlciAodHlwZSAyLCB1cHBlciBJRHMpLiAqL1xuICBpc1RyaWdnZXIoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUgPT09IDIgJiYgdGhpcy5pZCA+PSAweDgwOyB9XG4gIC8qKiBXaGV0aGVyIHRoaXMgc3Bhd24gaXMgYW4gTlBDICh0eXBlIDEsIGxvd2VyIElEcykuICovXG4gIGlzTnBjKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy50eXBlID09PSAxICYmIHRoaXMuaWQgPCAweGMwOyB9XG4gIC8qKiBXaGV0aGVyIHRoaXMgc3Bhd24gaXMgYSBib3NzICh0eXBlIDEsIHVwcGVyIElEcykuICovXG4gIGlzQm9zcygpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZSA9PT0gMSAmJiB0aGlzLmlkID49IDB4YzA7IH1cbiAgLyoqIFdoZXRoZXIgdGhpcyBzcGF3biBpcyBhIG1vbnN0ZXIgKHR5cGUgMCkuICovXG4gIGlzTW9uc3RlcigpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZSA9PT0gMDsgfVxuICAvKiogU3Bhd24gdHlwZSA0IGlzIGp1c3QgYSBnZW5lcmljIHNwYXduLiAqL1xuICBpc0dlbmVyaWMoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUgPT09IDQ7IH1cbiAgLyoqIFdoZXRoZXIgdGhpcyBzcGF3biBpcyBhIHdhbGwgaGl0Ym94ICh0eXBlIDMsIG1vc3RseSkuICovXG4gIGlzV2FsbCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gQm9vbGVhbih0aGlzLnR5cGUgPT09IDMgJiYgKHRoaXMuaWQgPCA0IHx8ICh0aGlzLmRhdGFbMl0gJiAweDIwKSkpO1xuICB9XG4gIC8qKiBXaGV0aGVyIHRoaXMgc3Bhd24gaXMgYSBzaG9vdGluZyB3YWxsICh1c2VzIGN1c3RvbSBsb2dpYykuICovXG4gIGlzU2hvb3RpbmdXYWxsKGxvY2F0aW9uOiBMb2NhdGlvbik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlzV2FsbCgpICYmXG4gICAgICAgICEhKHRoaXMuZGF0YVsyXSAmIDB4MjAgPyB0aGlzLmRhdGFbMl0gJiAweDEwIDpcbiAgICAgICAgICAgbG9jYXRpb24uaWQgPT09IDB4OGYgfHwgbG9jYXRpb24uaWQgPT09IDB4YTgpO1xuICB9XG4gIC8qKiBUeXBlIG9mIHdhbGwgKGkuZS4gd2FsbC9icmlkZ2UpIG9yIGVtcHR5IGlmIG5laXRoZXIuICovXG4gIHdhbGxUeXBlKCk6ICcnIHwgJ3dhbGwnIHwgJ2JyaWRnZScge1xuICAgIGlmICh0aGlzLnR5cGUgIT09IDMpIHJldHVybiAnJztcbiAgICBjb25zdCBvYmogPSB0aGlzLmRhdGFbMl0gJiAweDIwID8gdGhpcy5pZCA+Pj4gNCA6IHRoaXMuaWQ7XG4gICAgaWYgKG9iaiA+PSA0KSByZXR1cm4gJyc7XG4gICAgcmV0dXJuIG9iaiA9PT0gMiA/ICdicmlkZ2UnIDogJ3dhbGwnO1xuICB9XG4gIC8qKiBFbGVtZW50IG9mIHdhbGwgKDAuLjMpIG9yIC0xIGlmIG5vdCBhIHdhbGwuICovXG4gIHdhbGxFbGVtZW50KCk6IG51bWJlciB7XG4gICAgaWYgKCF0aGlzLmlzV2FsbCgpKSByZXR1cm4gLTE7XG4gICAgcmV0dXJuIHRoaXMuaWQgJiAzO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFNwYXduICR7dGhpcy5oZXgoKX06ICgke2hleCh0aGlzLngpfSwgJHtoZXgodGhpcy55KX0pICR7XG4gICAgICAgICAgICB0aGlzLnRpbWVkID8gJ3RpbWVkJyA6ICdmaXhlZCd9ICR7dGhpcy50eXBlfToke2hleCh0aGlzLmlkKX1gO1xuICB9XG59XG5cbmludGVyZmFjZSBMb2NhdGlvbiB7XG4gIHJlYWRvbmx5IGlkOiBudW1iZXI7XG59XG5cbi8qKiAyNDBweC1hd2FyZSBzdWJ0cmFjdGlvbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHl0RGlmZih5dDE6IG51bWJlciwgeXQwOiBudW1iZXIpOiBudW1iZXIge1xuICBsZXQgZHkgPSB5dDEgLSB5dDA7XG4gIGR5IC09ICh5dDEgPj4+IDQpIC0gKHl0MCA+Pj4gNCk7XG4gIHJldHVybiBkeTtcbn1cblxuLyoqIDI0MHB4LWF3YXJlIGFkZGl0aW9uICovXG5leHBvcnQgZnVuY3Rpb24geXRBZGQoeXQ6IG51bWJlciwgLi4uZHlzOiBudW1iZXJbXSk6IG51bWJlciB7XG4gIGZvciAoY29uc3QgZHkgb2YgZHlzKSB7XG4gICAgY29uc3Qgc3Vic2NyZWVuID0gZHkgJSAxNTtcbiAgICBjb25zdCBzY3JlZW5zID0gKGR5IC0gc3Vic2NyZWVuKSAvIDE1O1xuICAgIGxldCB5czEgPSAoeXQgPj4gNCkgKyBzY3JlZW5zO1xuICAgIGxldCB5dDEgPSAoeXQgJiAweGYpICsgc3Vic2NyZWVuO1xuICAgIGlmICh5dDEgPCAwKSB7XG4gICAgICB5czEtLTtcbiAgICAgIHl0MSA9IDB4ZiArIHl0MTtcbiAgICB9IGVsc2UgaWYgKHl0MSA+PSAweGYpIHtcbiAgICAgIHlzMSsrO1xuICAgICAgeXQxID0geXQxIC0gMHhmO1xuICAgIH1cbiAgICB5dCA9IHlzMSA8PCA0IHwgeXQxO1xuICB9XG4gIHJldHVybiB5dDtcbn1cbiJdfQ==