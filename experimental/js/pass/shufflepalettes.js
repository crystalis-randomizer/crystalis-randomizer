import { paletteTypes } from '../rom/tileset.js';
import { seq } from '../rom/util.js';
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
            partitions.get(l.data.palette).push(l);
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
    shuffleBackgrounds2() {
        function eq(a, b) {
            return a.tilePalettes[0] === b.tilePalettes[0] &&
                a.tilePalettes[1] === b.tilePalettes[1] &&
                a.tilePalettes[2] === b.tilePalettes[2];
        }
        const [] = [eq];
        const paletteSets = [new Set(), new Set()];
        for (const loc of this.rom.locations) {
            if (!loc.used)
                continue;
            const tileset = this.rom.tilesets[(loc.tileset & 0x7f) >> 2];
            const types = paletteTypes(tileset.id, loc.id);
            for (let i = 0; i < 3; i++) {
                for (let i = 0; i < types[i]; i++) {
                    paletteSets[i].add(loc.tilePalettes[i]);
                }
            }
        }
        const partitions = [];
        const palettes = paletteSets.map(s => [...s]);
        for (const part of partitions) {
            const rep = part[1];
            const repTypes = paletteTypes(rep.tileset, rep.id);
            for (let attempt = 0; attempt < 1000; attempt++) {
                const pals = seq(3, i => !repTypes[i] ? rep.tilePalettes[i] :
                    this.random.pick(palettes[repTypes[i] - 1]));
                const ps = pals.map(p => this.rom.palettes[p].colors);
                let found = true;
                for (const loc of part[0]) {
                    const [, , , validator] = paletteTypes(loc.tileset, loc.id);
                    if (validator && !validator(ps[0], ps[1], ps[2])) {
                        found = false;
                        break;
                    }
                }
                if (found) {
                    for (const loc of part[0]) {
                        loc.tilePalettes = [pals[0], pals[1], pals[2]];
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2h1ZmZsZXBhbGV0dGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3Bhc3Mvc2h1ZmZsZXBhbGV0dGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUlBLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUMvQyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDbkMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUd4QyxNQUFNLFVBQVUsZUFBZSxDQUFDLEdBQVEsRUFBRSxLQUFjLEVBQUUsTUFBYztJQUN0RSxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQzVDLENBQUM7QUFFRCxNQUFNLE9BQU87SUFDWCxZQUFxQixHQUFRLEVBQ1IsS0FBYyxFQUNkLE1BQWM7UUFGZCxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsVUFBSyxHQUFMLEtBQUssQ0FBUztRQUNkLFdBQU0sR0FBTixNQUFNLENBQVE7SUFBRyxDQUFDO0lBRXZDLE9BQU87UUFDTCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRUQsa0JBQWtCO1FBK0NoQixNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBc0IsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDakUsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRTtZQUNsQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3hDO1FBRUQsTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEdBQUcsRUFBdUIsRUFBRSxJQUFJLEdBQUcsRUFBdUIsQ0FBQyxDQUFDO1FBRzdFLEtBQUssTUFBTSxJ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RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi4vcmFuZG9tLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnLi4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7cGFsZXR0ZVR5cGVzfSBmcm9tICcuLi9yb20vdGlsZXNldC5qcyc7XG5pbXBvcnQge3NlcX0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHsgRGVmYXVsdE1hcCB9IGZyb20gJy4uL3V0aWwuanMnO1xuXG4vLyBTaHVmZmxlIHRoZSBwYWxldHRlcy5cbmV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlUGFsZXR0ZXMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSkge1xuICBuZXcgU2h1ZmZsZShyb20sIGZsYWdzLCByYW5kb20pLnNodWZmbGUoKTtcbn1cblxuY2xhc3MgU2h1ZmZsZSB7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tLFxuICAgICAgICAgICAgICByZWFkb25seSBmbGFnczogRmxhZ1NldCxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgcmFuZG9tOiBSYW5kb20pIHt9XG5cbiAgc2h1ZmZsZSgpIHtcbiAgICB0aGlzLnNodWZmbGVCYWNrZ3JvdW5kcygpO1xuICB9XG5cbiAgc2h1ZmZsZUJhY2tncm91bmRzKCkge1xuICAgIC8vIGZ1bmN0aW9uIGVxKGE6IExvY2F0aW9uLCBiOiBMb2NhdGlvbik6IGJvb2xlYW4ge1xuICAgIC8vICAgcmV0dXJuIGEudGlsZVBhbGV0dGVzWzBdID09PSBiLnRpbGVQYWxldHRlc1swXSAmJlxuICAgIC8vICAgICAgIGEudGlsZVBhbGV0dGVzWzFdID09PSBiLnRpbGVQYWxldHRlc1sxXSAmJlxuICAgIC8vICAgICAgIGEudGlsZVBhbGV0dGVzWzJdID09PSBiLnRpbGVQYWxldHRlc1syXSAmJlxuICAgIC8vICAgICAgIC8vIGEudGlsZVBhdHRlcm5zWzBdID09PSBiLnRpbGVQYXR0ZXJuc1swXSAmJlxuICAgIC8vICAgICAgIC8vIGEudGlsZVBhdHRlcm5zWzFdID09PSBiLnRpbGVQYXR0ZXJuc1sxXSAmJlxuICAgIC8vICAgICAgIC8vIGEudGlsZXNldCA9PT0gYi50aWxlc2V0ICYmXG4gICAgLy8gICAgICAgYS50aWxlRWZmZWN0cyA9PT0gYi50aWxlRWZmZWN0cztcbiAgICAvLyB9XG5cbiAgICAvLyBjb25zdCBwYWxldHRlcyA9IFtcbiAgICAvLyAgIDB4MDEsIDB4MDcsIFxuXG4gICAgLy8gLy8gS2V5OiAodGlsZUlkL3NjcmVlbklkKSA8PCA4IHwgdGlsZXNldFxuICAgIC8vIC8vIFZhbHVlOiBTZXQ8fnBhdHRlcm4gfCBwYWxldHRlPlxuICAgIC8vIGNvbnN0IHRpbGVDYWNoZSA9IG5ldyBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKTtcbiAgICAvLyBjb25zdCBzY3JlZW5DYWNoZSA9IG5ldyBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKTtcblxuICAgIC8vIGZ1bmN0aW9uIHNjcmVlbkRhdGEoc2NyZWVuOiBudW1iZXIsIHRpbGVzZXQ6IG51bWJlcikge1xuXG4gICAgLy8gfVxuXG4gICAgLy8gZm9yIChjb25zdCBsb2Mgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIC8vICAgaWYgKCFsb2MudXNlZCkgY29udGludWU7XG4gICAgLy8gICBjb25zdCB0aWxlc2V0ID0gcm9tLnRpbGVzZXRzWyhsb2MudGlsZXNldCAmIDB4N2YpID4+IDJdO1xuICAgIC8vICAgZm9yIChjb25zdCBzY3JlZW4gb2YgbG9jLmFsbFNjcmVlbnMoKSkge1xuICAgIC8vICAgICBjb25zdCBncmFwaGljcyA9IG5ldyBTZXQoKTtcbiAgICAvLyAgICAgZm9yIChjb25zdCB0aWxlIG9mIHNjcmVlbi50aWxlcykge1xuICAgIC8vICAgICAgIGNvbnN0IHRpbGVJZCA9IHRpbGUgPDwgOCB8IHRpbGVzZXQuaWQ7XG4gICAgLy8gICAgICAgY29uc3QgcHJldiA9IHRpbGVDYWNoZS5nZXQodGlsZUlkKTtcbiAgICAvLyAgICAgICBpZiAocHJldikge1xuICAgIC8vICAgICAgICAgZm9yIChjb25zdCBnIG9mIHByZXYpIGdyYXBoaWNzLmFkZChnKTtcbiAgICAvLyAgICAgICAgIGNvbnRpbnVlO1xuICAgIC8vICAgICAgIH1cbiAgICAvLyAgICAgICBjb25zdCBzZXQgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICAvLyAgICAgICBmb3IgKGNvbnN0IHF1YWQgb2YgdGlsZXNldC50aWxlcykge1xuICAgIC8vICAgICAgICAgc2V0LmFkZCh+cXVhZFt0aWxlXSk7XG4gICAgLy8gICAgICAgICBncmFwaGljcy5hZGQofnF1YWRbdGlsZV0pO1xuICAgIC8vICAgICAgIH1cbiAgICAvLyAgICAgICBzZXQuYWRkKHRpbGVzZXQuYXR0cnNbdGlsZV0pO1xuICAgIC8vICAgICAgIGdyYXBoaWNzLmFkZCh0aWxlc2V0LmF0dHJzW3RpbGVdKTtcbiAgICAvLyAgICAgICB0aWxlQ2FjaGUuc2V0KHRpbGVJZCwgc2V0KTtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgfVxuICAgIC8vIH1cblxuICAgIGNvbnN0IHBhcnRpdGlvbnMgPSBuZXcgRGVmYXVsdE1hcDx1bmtub3duLCBMb2NhdGlvbltdPigoKSA9PiBbXSk7XG4gICAgZm9yIChjb25zdCBsIG9mIHRoaXMucm9tLmxvY2F0aW9ucykge1xuICAgICAgcGFydGl0aW9ucy5nZXQobC5kYXRhLnBhbGV0dGUpLnB1c2gobCk7XG4gICAgfVxuXG4gICAgY29uc3QgcGFsID0gW25ldyBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKSwgbmV3IE1hcDxudW1iZXIsIFNldDxudW1iZXI+PigpXTtcblxuICAgIC8vIGZpbGwgYHBhbGAgd2l0aCBhbGwgcGFsZXR0ZXMsIGdyb3VwZWQgYnkgcGF0dGVybi5cbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgcGFydGl0aW9ucy52YWx1ZXMoKSkge1xuICAgICAgZm9yIChjb25zdCBsIG9mIHBhcnQpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAyOyBpKyspIHtcbiAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IDI7IGorKykge1xuICAgICAgICAgICAgLy8gVE9ETyAtIGNoZWNrIHRoYXQgcGF0dGVybnMgYW5kIHBhbGV0dGVzIGFjdHVhbGx5IFVTRUQ/XG4gICAgICAgICAgICBsZXQgc2V0ID0gcGFsW2ldLmdldChsLnRpbGVQYXR0ZXJuc1tqXSk7XG4gICAgICAgICAgICBpZiAoIXNldCkgcGFsW2ldLnNldChsLnRpbGVQYXR0ZXJuc1tqXSwgc2V0ID0gbmV3IFNldCgpKTtcbiAgICAgICAgICAgIHNldC5hZGQobC50aWxlUGFsZXR0ZXNbaV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHJlc2V0IHBhbGV0dGVzXG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIHBhcnRpdGlvbnMudmFsdWVzKCkpIHtcbiAgICAgIGNvbnN0IGwgPSBwYXJ0WzBdO1xuICAgICAgY29uc3QgcyA9IFtuZXcgU2V0PG51bWJlcj4oKSwgbmV3IFNldDxudW1iZXI+KCldO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAyOyBpKyspIHtcbiAgICAgICAgc1tpXSA9IG5ldyBTZXQ8bnVtYmVyPihbLi4ucGFsW2ldLmdldChsLnRpbGVQYXR0ZXJuc1swXSkhLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5wYWxbaV0uZ2V0KGwudGlsZVBhdHRlcm5zWzFdKSEsXSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHAwID0gdGhpcy5yYW5kb20ucGljayhbLi4uc1swXV0pO1xuICAgICAgY29uc3QgcDEgPSB0aGlzLnJhbmRvbS5waWNrKFsuLi5zWzFdXSk7XG4gICAgICBmb3IgKGNvbnN0IGxvYyBvZiBwYXJ0KSB7XG4gICAgICAgIGxvYy50aWxlUGFsZXR0ZXNbMF0gPSBwMDtcbiAgICAgICAgbG9jLnRpbGVQYWxldHRlc1sxXSA9IHAxO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFRPRE8gLSB0aGlzIGFsZ29yaXRobSBpcyBtdWNoIGxlc3Mgc2F0aXNmeWluZy5cbiAgc2h1ZmZsZUJhY2tncm91bmRzMigpIHtcbiAgICBmdW5jdGlvbiBlcShhOiBMb2NhdGlvbiwgYjogTG9jYXRpb24pOiBib29sZWFuIHtcbiAgICAgIHJldHVybiBhLnRpbGVQYWxldHRlc1swXSA9PT0gYi50aWxlUGFsZXR0ZXNbMF0gJiZcbiAgICAgICAgICBhLnRpbGVQYWxldHRlc1sxXSA9PT0gYi50aWxlUGFsZXR0ZXNbMV0gJiZcbiAgICAgICAgICBhLnRpbGVQYWxldHRlc1syXSA9PT0gYi50aWxlUGFsZXR0ZXNbMl07XG4gICAgICAgICAgLy8gYS50aWxlUGF0dGVybnNbMF0gPT09IGIudGlsZVBhdHRlcm5zWzBdICYmXG4gICAgICAgICAgLy8gYS50aWxlUGF0dGVybnNbMV0gPT09IGIudGlsZVBhdHRlcm5zWzFdICYmXG4gICAgICAgICAgLy8gYS50aWxlc2V0ID09PSBiLnRpbGVzZXQgJiZcbiAgICAgICAgICAvLyBhLnRpbGVFZmZlY3RzID09PSBiLnRpbGVFZmZlY3RzO1xuICAgIH1cbiAgICBjb25zdCBbXSA9IFtlcV07XG5cbiAgICAvLyBjb25zdCBwYWxldHRlcyA9IFtcbiAgICAvLyAgIDB4MDEsIDB4MDcsIFxuXG4gICAgLy8gLy8gS2V5OiAodGlsZUlkL3NjcmVlbklkKSA8PCA4IHwgdGlsZXNldFxuICAgIC8vIC8vIFZhbHVlOiBTZXQ8fnBhdHRlcm4gfCBwYWxldHRlPlxuICAgIC8vIGNvbnN0IHRpbGVDYWNoZSA9IG5ldyBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKTtcbiAgICAvLyBjb25zdCBzY3JlZW5DYWNoZSA9IG5ldyBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKTtcblxuICAgIC8vIGZ1bmN0aW9uIHNjcmVlbkRhdGEoc2NyZWVuOiBudW1iZXIsIHRpbGVzZXQ6IG51bWJlcikge1xuXG4gICAgLy8gfVxuXG4gICAgY29uc3QgcGFsZXR0ZVNldHMgPSBbbmV3IFNldDxudW1iZXI+KCksIG5ldyBTZXQ8bnVtYmVyPigpXTtcblxuICAgIGZvciAoY29uc3QgbG9jIG9mIHRoaXMucm9tLmxvY2F0aW9ucykge1xuICAgICAgaWYgKCFsb2MudXNlZCkgY29udGludWU7XG4gICAgICBjb25zdCB0aWxlc2V0ID0gdGhpcy5yb20udGlsZXNldHNbKGxvYy50aWxlc2V0ICYgMHg3ZikgPj4gMl07XG4gICAgICBjb25zdCB0eXBlcyA9IHBhbGV0dGVUeXBlcyh0aWxlc2V0LmlkLCBsb2MuaWQpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAodHlwZXNbaV0gYXMgbnVtYmVyKTsgaSsrKSB7XG4gICAgICAgICAgcGFsZXR0ZVNldHNbaV0uYWRkKGxvYy50aWxlUGFsZXR0ZXNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcGFydGl0aW9uczogYW55W10gPSBbXTsgLy8gdGhpcy5yb20ubG9jYXRpb25zLnBhcnRpdGlvbih4ID0+IHgsIGVxLCB0cnVlKTtcblxuICAgIGNvbnN0IHBhbGV0dGVzID0gcGFsZXR0ZVNldHMubWFwKHMgPT4gWy4uLnNdKTtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgcGFydGl0aW9ucykge1xuICAgICAgY29uc3QgcmVwID0gcGFydFsxXTsgLy8gcmVwcmVzZW50YXRpdmUgbG9jYXRpb25cbiAgICAgIGNvbnN0IHJlcFR5cGVzOiBudW1iZXJbXSA9IHBhbGV0dGVUeXBlcyhyZXAudGlsZXNldCwgcmVwLmlkKSBhcyBhbnk7XG4gICAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8IDEwMDA7IGF0dGVtcHQrKykge1xuICAgICAgICBjb25zdCBwYWxzID0gc2VxKDMsIGkgPT4gIXJlcFR5cGVzW2ldID8gcmVwLnRpbGVQYWxldHRlc1tpXSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yYW5kb20ucGljayhwYWxldHRlc1tyZXBUeXBlc1tpXSAtIDFdKSk7XG4gICAgICAgIGNvbnN0IHBzID0gcGFscy5tYXAocCA9PiB0aGlzLnJvbS5wYWxldHRlc1twXS5jb2xvcnMpO1xuICAgICAgICBsZXQgZm91bmQgPSB0cnVlO1xuICAgICAgICBmb3IgKGNvbnN0IGxvYyBvZiBwYXJ0WzBdKSB7XG4gICAgICAgICAgY29uc3QgWywsLCB2YWxpZGF0b3JdID0gcGFsZXR0ZVR5cGVzKGxvYy50aWxlc2V0LCBsb2MuaWQpO1xuICAgICAgICAgIGlmICh2YWxpZGF0b3IgJiYgIXZhbGlkYXRvcihwc1swXSwgcHNbMV0sIHBzWzJdKSkge1xuICAgICAgICAgICAgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGxvYyBvZiBwYXJ0WzBdKSB7XG4gICAgICAgICAgICBsb2MudGlsZVBhbGV0dGVzID0gW3BhbHNbMF0sIHBhbHNbMV0sIHBhbHNbMl1dO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIl19