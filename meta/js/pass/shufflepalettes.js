import { DefaultMap } from '../util.js';
export function shufflePalettes(rom, flags, random) {
    new Shuffle(rom, flags, random).shuffle();
}
class Shuffle {
    constructor(rom, flags, random) {
        this.rom = rom;
        this.flags = flags;
        this.random = random;
    }
    shuffle() {
        this.shuffleBackgrounds();
    }
    shuffleBackgrounds() {
        const partitions = new DefaultMap(() => []);
        for (const l of this.rom.locations) {
            partitions.get(l.colorGroup).push(l);
        }
        const pal = [new Map(), new Map()];
        for (const part of partitions.values()) {
            for (const l of part) {
                for (let i = 0; i < 2; i++) {
                    for (let j = 0; j < 2; j++) {
                        let set = pal[i].get(l.tilePatterns[j]);
                        if (!set)
                            pal[i].set(l.tilePatterns[j], set = new Set());
                        set.add(l.tilePalettes[i]);
                    }
                }
            }
        }
        for (const part of partitions.values()) {
            const l = part[0];
            const s = [new Set(), new Set()];
            for (let i = 0; i < 2; i++) {
                s[i] = new Set([...pal[i].get(l.tilePatterns[0]),
                    ...pal[i].get(l.tilePatterns[1]),]);
            }
            const p0 = this.random.pick([...s[0]]);
            const p1 = this.random.pick([...s[1]]);
            for (const loc of part) {
                loc.tilePalettes[0] = p0;
                loc.tilePalettes[1] = p1;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2h1ZmZsZXBhbGV0dGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3Bhc3Mvc2h1ZmZsZXBhbGV0dGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUlBLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFHdEMsTUFBTSxVQUFVLGVBQWUsQ0FBQyxHQUFRLEVBQUUsS0FBYyxFQUFFLE1BQWM7SUFDdEUsSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUM1QyxDQUFDO0FBRUQsTUFBTSxPQUFPO0lBQ1gsWUFBcUIsR0FBUSxFQUNSLEtBQWMsRUFDZCxNQUFjO1FBRmQsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFVBQUssR0FBTCxLQUFLLENBQVM7UUFDZCxXQUFNLEdBQU4sTUFBTSxDQUFRO0lBQUcsQ0FBQztJQUV2QyxPQUFPO1FBQ0wsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVELGtCQUFrQjtRQUNoQixNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBc0IsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDakUsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRTtZQUNsQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDdEM7UUFFRCxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksR0FBRyxFQUF1QixFQUFFLElBQUksR0FBRyxFQUF1QixDQUFDLENBQUM7UUFHN0UsS0FBSyxNQUFNLElBQUksSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDdEMsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUU7Z0JBQ3BCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7b0JBQzFCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7d0JBRTFCLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUN4QyxJQUFJLENBQUMsR0FBRzs0QkFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQzt3QkFDekQsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQzVCO2lCQUNGO2FBQ0Y7U0FDRjtRQUdELEtBQUssTUFBTSxJQUFJLElBQUksVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3RDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFVLEVBQUUsSUFBSSxHQUFHLEVBQVUsQ0FBQyxDQUFDO1lBQ2pELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBUyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFFO29CQUNqQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBRSxFQUFFLENBQUMsQ0FBQzthQUM5RDtZQUVELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFO2dCQUN0QixHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDekIsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7YUFDMUI7U0FDRjtJQUNILENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi4vcmFuZG9tLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnLi4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7RGVmYXVsdE1hcH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbi8vIFNodWZmbGUgdGhlIHBhbGV0dGVzLlxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGVQYWxldHRlcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKSB7XG4gIG5ldyBTaHVmZmxlKHJvbSwgZmxhZ3MsIHJhbmRvbSkuc2h1ZmZsZSgpO1xufVxuXG5jbGFzcyBTaHVmZmxlIHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGZsYWdzOiBGbGFnU2V0LFxuICAgICAgICAgICAgICByZWFkb25seSByYW5kb206IFJhbmRvbSkge31cblxuICBzaHVmZmxlKCkge1xuICAgIHRoaXMuc2h1ZmZsZUJhY2tncm91bmRzKCk7XG4gIH1cblxuICBzaHVmZmxlQmFja2dyb3VuZHMoKSB7XG4gICAgY29uc3QgcGFydGl0aW9ucyA9IG5ldyBEZWZhdWx0TWFwPHVua25vd24sIExvY2F0aW9uW10+KCgpID0+IFtdKTtcbiAgICBmb3IgKGNvbnN0IGwgb2YgdGhpcy5yb20ubG9jYXRpb25zKSB7XG4gICAgICBwYXJ0aXRpb25zLmdldChsLmNvbG9yR3JvdXApLnB1c2gobCk7XG4gICAgfVxuXG4gICAgY29uc3QgcGFsID0gW25ldyBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKSwgbmV3IE1hcDxudW1iZXIsIFNldDxudW1iZXI+PigpXTtcblxuICAgIC8vIGZpbGwgYHBhbGAgd2l0aCBhbGwgcGFsZXR0ZXMsIGdyb3VwZWQgYnkgcGF0dGVybi5cbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgcGFydGl0aW9ucy52YWx1ZXMoKSkge1xuICAgICAgZm9yIChjb25zdCBsIG9mIHBhcnQpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAyOyBpKyspIHtcbiAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IDI7IGorKykge1xuICAgICAgICAgICAgLy8gVE9ETyAtIGNoZWNrIHRoYXQgcGF0dGVybnMgYW5kIHBhbGV0dGVzIGFjdHVhbGx5IFVTRUQ/XG4gICAgICAgICAgICBsZXQgc2V0ID0gcGFsW2ldLmdldChsLnRpbGVQYXR0ZXJuc1tqXSk7XG4gICAgICAgICAgICBpZiAoIXNldCkgcGFsW2ldLnNldChsLnRpbGVQYXR0ZXJuc1tqXSwgc2V0ID0gbmV3IFNldCgpKTtcbiAgICAgICAgICAgIHNldC5hZGQobC50aWxlUGFsZXR0ZXNbaV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHJlc2V0IHBhbGV0dGVzXG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIHBhcnRpdGlvbnMudmFsdWVzKCkpIHtcbiAgICAgIGNvbnN0IGwgPSBwYXJ0WzBdO1xuICAgICAgY29uc3QgcyA9IFtuZXcgU2V0PG51bWJlcj4oKSwgbmV3IFNldDxudW1iZXI+KCldO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAyOyBpKyspIHtcbiAgICAgICAgc1tpXSA9IG5ldyBTZXQ8bnVtYmVyPihbLi4ucGFsW2ldLmdldChsLnRpbGVQYXR0ZXJuc1swXSkhLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5wYWxbaV0uZ2V0KGwudGlsZVBhdHRlcm5zWzFdKSEsXSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHAwID0gdGhpcy5yYW5kb20ucGljayhbLi4uc1swXV0pO1xuICAgICAgY29uc3QgcDEgPSB0aGlzLnJhbmRvbS5waWNrKFsuLi5zWzFdXSk7XG4gICAgICBmb3IgKGNvbnN0IGxvYyBvZiBwYXJ0KSB7XG4gICAgICAgIGxvYy50aWxlUGFsZXR0ZXNbMF0gPSBwMDtcbiAgICAgICAgbG9jLnRpbGVQYWxldHRlc1sxXSA9IHAxO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIl19