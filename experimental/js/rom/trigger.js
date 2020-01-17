import { Entity } from './entity.js';
import { MessageId } from './messageid.js';
import { addr, hex, readBigEndian } from './util.js';
const UNUSED_TRIGGERS = new Set([
    0x87, 0x88, 0x89, 0x8f, 0x93, 0x96, 0x98, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f,
    0xb3, 0xb5, 0xb9, 0xbe, 0xc0,
]);
export class Trigger extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.used = !UNUSED_TRIGGERS.has(id);
        this.pointer = 0x1e17a + ((id & 0x7f) << 1);
        this.base = addr(rom.prg, this.pointer, 0x14000);
        this.conditions = [];
        this.message = new MessageId();
        this.flags = [];
        let word;
        let i = this.base;
        do {
            word = readBigEndian(rom.prg, i);
            const flag = word & 0x0fff;
            this.conditions.push(word & 0x2000 ? ~flag : flag);
            i += 2;
        } while (!(word & 0x8000));
        this.message = MessageId.from(rom.prg, i);
        do {
            i += 2;
            word = readBigEndian(rom.prg, i);
            const flag = word & 0x0fff;
            this.flags.push(word & 0x8000 ? ~flag : flag);
        } while (!(word & 0x4000));
    }
    bytes() {
        const bytes = [];
        if (!this.conditions.length)
            this.conditions.push(~0);
        for (let i = 0; i < this.conditions.length; i++) {
            let word = this.conditions[i];
            if (word < 0)
                word = ~word | 0x2000;
            if (i === this.conditions.length - 1)
                word = word | 0x8000;
            bytes.push(word >>> 8, word & 0xff);
        }
        bytes.push(...this.message.data);
        if (!this.flags.length)
            this.flags.push(~0);
        for (let i = 0; i < this.flags.length; i++) {
            let word = this.flags[i];
            if (word < 0)
                word = ~word | 0x8000;
            if (i === this.flags.length - 1)
                word = word | 0x4000;
            bytes.push(word >>> 8, word & 0xff);
        }
        return bytes;
    }
    async write(writer, base = 0x1e17a) {
        if (!this.used)
            return;
        const address = await writer.write(this.bytes(), 0x1e000, 0x1ffff, `Trigger ${hex(this.id)}`);
        writer.rom[base + 2 * (this.id & 0x7f)] = address & 0xff;
        writer.rom[base + 2 * (this.id & 0x7f) + 1] = (address >>> 8) - 0x40;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJpZ2dlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9yb20vdHJpZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN6QyxPQUFPLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFJbkQsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUM7SUFDOUIsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJO0lBQzVELElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJO0NBRXZDLENBQUMsQ0FBQztBQUVILE1BQU0sT0FBTyxPQUFRLFNBQVEsTUFBTTtJQWFqQyxZQUFZLEdBQVEsRUFBRSxFQUFVO1FBRzlCLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDZixJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7UUFDL0IsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDaEIsSUFBSSxJQUFJLENBQUM7UUFDVCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ2xCLEdBQUc7WUFFRCxJQUFJLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDakMsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLE1BQU0sQ0FBQztZQUMzQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkQsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNSLFFBQVEsQ0FBQyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsRUFBRTtRQUMzQixJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyxHQUFHO1lBQ0QsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNQLElBQUksR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNqQyxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsTUFBTSxDQUFDO1lBQzNCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMvQyxRQUFRLENBQUMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLEVBQUU7SUFHN0IsQ0FBQztJQUVELEtBQUs7UUFDSCxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTTtZQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQy9DLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUIsSUFBSSxJQUFJLEdBQUcsQ0FBQztnQkFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUM7Z0JBQUUsSUFBSSxHQUFHLElBQUksR0FBRyxNQUFNLENBQUM7WUFDM0QsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQztTQUNyQztRQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU07WUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLElBQUksSUFBSSxHQUFHLENBQUM7Z0JBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQztZQUNwQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDO2dCQUFFLElBQUksR0FBRyxJQUFJLEdBQUcsTUFBTSxDQUFDO1lBQ3RELEtBQUssQ0FBQyxJQUFJLENBQUUsSUFBSSxLQUFLLENBQUMsRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7U0FDdEM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQWMsRUFBRSxPQUFlLE9BQU87UUFDaEQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTztRQUN2QixNQUFNLE9BQU8sR0FBRyxNQUFNLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQzlCLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxJQUFJLENBQUM7UUFDekQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDdkUsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtFbnRpdHl9IGZyb20gJy4vZW50aXR5LmpzJztcbmltcG9ydCB7TWVzc2FnZUlkfSBmcm9tICcuL21lc3NhZ2VpZC5qcyc7XG5pbXBvcnQge2FkZHIsIGhleCwgcmVhZEJpZ0VuZGlhbn0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7V3JpdGVyfSBmcm9tICcuL3dyaXRlci5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcblxuY29uc3QgVU5VU0VEX1RSSUdHRVJTID0gbmV3IFNldChbXG4gIDB4ODcsIDB4ODgsIDB4ODksIDB4OGYsIDB4OTMsIDB4OTYsIDB4OTgsIDB4OWIsIDB4OWMsIDB4OWQsIDB4OWUsIDB4OWYsXG4gIC8qMHhhMCwqLyAweGIzLCAweGI1LCAweGI5LCAweGJlLCAweGMwLCAvLyBjMiBpcyBsYXN0IG9uZVxuICAvLyBOT1RFOiBiMyBpcyBvbmx5IHVudXNlZCBhZnRlciBkZXRlcm1pbmlzdGljIHByZS1wYXJzZSBkZWxldGVzIGl0LlxuXSk7XG5cbmV4cG9ydCBjbGFzcyBUcmlnZ2VyIGV4dGVuZHMgRW50aXR5IHtcblxuICB1c2VkOiBib29sZWFuO1xuICBwb2ludGVyOiBudW1iZXI7XG4gIGJhc2U6IG51bWJlcjtcblxuICAvLyBMaXN0IG9mIGZsYWdzIHRvIGNoZWNrOiBwb3NpdGl2ZSBtZWFucyBcIm11c3QgYmUgc2V0XCJcbiAgY29uZGl0aW9uczogbnVtYmVyW107XG4gIC8vIE1lc3NhZ2Ugc2hvd24sIGFjdGlvbiBydW5cbiAgbWVzc2FnZTogTWVzc2FnZUlkO1xuICAvLyBMaXN0IG9mIGZsYWdzIHRvIHNldC9jbGVhcjogcG9zaXRpdmUgbWVhbnMgdG8gc2V0IGl0LlxuICBmbGFnczogbnVtYmVyW107XG5cbiAgY29uc3RydWN0b3Iocm9tOiBSb20sIGlkOiBudW1iZXIpIHtcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgcHVsbGluZyB0aGlzIG91dCBpbnRvIHN0YXRpYyBmcm9tQnl0ZXMoKSBtZXRob2Q/XG4gICAgLy8gICAgICAgIC0gc3RpbGwgbmVlZC93YW50IHRoZSBSb20gcmVmZXJlbmNlIGluIHRoYXQgY2FzZT8gIG5vIGlkP1xuICAgIHN1cGVyKHJvbSwgaWQpO1xuICAgIHRoaXMudXNlZCA9ICFVTlVTRURfVFJJR0dFUlMuaGFzKGlkKTsgLy8gbmVlZCB0byBzZXQgbWFudWFsbHlcbiAgICB0aGlzLnBvaW50ZXIgPSAweDFlMTdhICsgKChpZCAmIDB4N2YpIDw8IDEpO1xuICAgIHRoaXMuYmFzZSA9IGFkZHIocm9tLnByZywgdGhpcy5wb2ludGVyLCAweDE0MDAwKTtcbiAgICB0aGlzLmNvbmRpdGlvbnMgPSBbXTtcbiAgICB0aGlzLm1lc3NhZ2UgPSBuZXcgTWVzc2FnZUlkKCk7XG4gICAgdGhpcy5mbGFncyA9IFtdO1xuICAgIGxldCB3b3JkO1xuICAgIGxldCBpID0gdGhpcy5iYXNlO1xuICAgIGRvIHtcbiAgICAgIC8vIE5PVEU6IHRoaXMgYnl0ZSBvcmRlciBpcyBpbnZlcnNlIGZyb20gbm9ybWFsLlxuICAgICAgd29yZCA9IHJlYWRCaWdFbmRpYW4ocm9tLnByZywgaSk7XG4gICAgICBjb25zdCBmbGFnID0gd29yZCAmIDB4MGZmZjtcbiAgICAgIHRoaXMuY29uZGl0aW9ucy5wdXNoKHdvcmQgJiAweDIwMDAgPyB+ZmxhZyA6IGZsYWcpO1xuICAgICAgaSArPSAyO1xuICAgIH0gd2hpbGUgKCEod29yZCAmIDB4ODAwMCkpO1xuICAgIHRoaXMubWVzc2FnZSA9IE1lc3NhZ2VJZC5mcm9tKHJvbS5wcmcsIGkpO1xuICAgIGRvIHtcbiAgICAgIGkgKz0gMjtcbiAgICAgIHdvcmQgPSByZWFkQmlnRW5kaWFuKHJvbS5wcmcsIGkpO1xuICAgICAgY29uc3QgZmxhZyA9IHdvcmQgJiAweDBmZmY7XG4gICAgICB0aGlzLmZsYWdzLnB1c2god29yZCAmIDB4ODAwMCA/IH5mbGFnIDogZmxhZyk7XG4gICAgfSB3aGlsZSAoISh3b3JkICYgMHg0MDAwKSk7XG4gICAgLy8gY29uc29sZS5sb2coYFRyaWdnZXIgJCR7dGhpcy5pZC50b1N0cmluZygxNil9OiBieXRlczogJCR7XG4gICAgLy8gICAgICAgICAgICAgIHRoaXMuYnl0ZXMoKS5tYXAoeD0+eC50b1N0cmluZygxNikucGFkU3RhcnQoMiwwKSkuam9pbignICcpfWApO1xuICB9XG5cbiAgYnl0ZXMoKTogbnVtYmVyW10ge1xuICAgIGNvbnN0IGJ5dGVzID0gW107XG4gICAgaWYgKCF0aGlzLmNvbmRpdGlvbnMubGVuZ3RoKSB0aGlzLmNvbmRpdGlvbnMucHVzaCh+MCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmNvbmRpdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCB3b3JkID0gdGhpcy5jb25kaXRpb25zW2ldO1xuICAgICAgaWYgKHdvcmQgPCAwKSB3b3JkID0gfndvcmQgfCAweDIwMDA7XG4gICAgICBpZiAoaSA9PT0gdGhpcy5jb25kaXRpb25zLmxlbmd0aCAtIDEpIHdvcmQgPSB3b3JkIHwgMHg4MDAwO1xuICAgICAgYnl0ZXMucHVzaCh3b3JkID4+PiA4LCB3b3JkICYgMHhmZik7XG4gICAgfVxuICAgIGJ5dGVzLnB1c2goLi4udGhpcy5tZXNzYWdlLmRhdGEpO1xuICAgIGlmICghdGhpcy5mbGFncy5sZW5ndGgpIHRoaXMuZmxhZ3MucHVzaCh+MCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmZsYWdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgd29yZCA9IHRoaXMuZmxhZ3NbaV07XG4gICAgICBpZiAod29yZCA8IDApIHdvcmQgPSB+d29yZCB8IDB4ODAwMDtcbiAgICAgIGlmIChpID09PSB0aGlzLmZsYWdzLmxlbmd0aCAtIDEpIHdvcmQgPSB3b3JkIHwgMHg0MDAwO1xuICAgICAgYnl0ZXMucHVzaCggd29yZCA+Pj4gOCwgd29yZCAmIDB4ZmYpO1xuICAgIH1cbiAgICByZXR1cm4gYnl0ZXM7XG4gIH1cblxuICBhc3luYyB3cml0ZSh3cml0ZXI6IFdyaXRlciwgYmFzZTogbnVtYmVyID0gMHgxZTE3YSkge1xuICAgIGlmICghdGhpcy51c2VkKSByZXR1cm47XG4gICAgY29uc3QgYWRkcmVzcyA9IGF3YWl0IHdyaXRlci53cml0ZSh0aGlzLmJ5dGVzKCksIDB4MWUwMDAsIDB4MWZmZmYsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgVHJpZ2dlciAke2hleCh0aGlzLmlkKX1gKTtcbiAgICB3cml0ZXIucm9tW2Jhc2UgKyAyICogKHRoaXMuaWQgJiAweDdmKV0gPSBhZGRyZXNzICYgMHhmZjtcbiAgICB3cml0ZXIucm9tW2Jhc2UgKyAyICogKHRoaXMuaWQgJiAweDdmKSArIDFdID0gKGFkZHJlc3MgPj4+IDgpIC0gMHg0MDtcbiAgfVxufVxuIl19