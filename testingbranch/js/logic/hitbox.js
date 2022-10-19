import { TileId } from './tileid.js';
export var Hitbox;
(function (Hitbox) {
    function trigger(location, spawn) {
        return {
            *[Symbol.iterator]() {
                let { x: x0, y: y0 } = spawn;
                x0 += 8;
                for (const dx of [-16, 0]) {
                    const x = x0 + dx;
                    for (const dy of [-16, 0]) {
                        const y = y0 + dy;
                        yield TileId.from(location, { x, y });
                    }
                }
            }
        };
    }
    Hitbox.trigger = trigger;
    function adjust(h, ...deltas) {
        const s = new Set();
        const ts = [...h];
        for (const [dy, dx] of deltas) {
            for (const t of ts) {
                s.add(TileId.add(t, dy, dx));
            }
        }
        return s;
    }
    Hitbox.adjust = adjust;
    function screen(tile) {
        const ts = [];
        for (let t = 0; t < 0xf0; t++) {
            ts.push((tile & ~0xff | t));
        }
        return ts;
    }
    Hitbox.screen = screen;
    function atLocation(h, ...locations) {
        const s = new Set();
        const ts = [...h];
        for (const location of locations) {
            for (const t of ts) {
                s.add((t & 0xffff | location.id << 16));
            }
        }
        return s;
    }
    Hitbox.atLocation = atLocation;
})(Hitbox || (Hitbox = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGl0Ym94LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2xvZ2ljL2hpdGJveC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBS25DLE1BQU0sS0FBVyxNQUFNLENBbUV0QjtBQW5FRCxXQUFpQixNQUFNO0lBYXJCLFNBQWdCLE9BQU8sQ0FBQyxRQUFrQixFQUFFLEtBQVk7UUFRdEQsT0FBTztZQUNMLENBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO2dCQUNqQixJQUFJLEVBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFDLEdBQUcsS0FBSyxDQUFDO2dCQUMzQixFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNSLEtBQUssTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtvQkFDekIsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztvQkFDbEIsS0FBSyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO3dCQUN6QixNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO3dCQUNsQixNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUM7cUJBQ3JDO2lCQUNGO1lBQ0gsQ0FBQztTQUNGLENBQUM7SUFDSixDQUFDO0lBckJlLGNBQU8sVUFxQnRCLENBQUE7SUFFRCxTQUFnQixNQUFNLENBQUMsQ0FBUyxFQUFFLEdBQUcsTUFBZTtRQUNsRCxNQUFNLENBQUMsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQzVCLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNsQixLQUFLLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksTUFBTSxFQUFFO1lBQzdCLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNsQixDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQzlCO1NBQ0Y7UUFDRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUFUZSxhQUFNLFNBU3JCLENBQUE7SUFFRCxTQUFnQixNQUFNLENBQUMsSUFBWTtRQUNqQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDZCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzdCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFXLENBQUMsQ0FBQztTQUN2QztRQUNELE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQU5lLGFBQU0sU0FNckIsQ0FBQTtJQUVELFNBQWdCLFVBQVUsQ0FBQyxDQUFTLEVBQUUsR0FBRyxTQUFxQjtRQUM1RCxNQUFNLENBQUMsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQzVCLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNsQixLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRTtZQUNoQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDbEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLEdBQUcsUUFBUSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQVcsQ0FBQyxDQUFDO2FBQ25EO1NBQ0Y7UUFDRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUFUZSxpQkFBVSxhQVN6QixDQUFBO0FBR0gsQ0FBQyxFQW5FZ0IsTUFBTSxLQUFOLE1BQU0sUUFtRXRCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtMb2NhdGlvbiwgU3Bhd259IGZyb20gJy4uL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge1RpbGVJZH0gZnJvbSAnLi90aWxlaWQuanMnO1xuXG4vLyBIaXRib3ggaXMgYW4gaXRlcmFibGUgb2YgKGR5LCBkeCkgY29vcmRpbmF0ZXMuXG5leHBvcnQgdHlwZSBIaXRib3ggPSBJdGVyYWJsZTxUaWxlSWQ+OyAvL0l0ZXJhYmxlPHJlYWRvbmx5IFtudW1iZXIsIG51bWJlcl0+O1xuXG5leHBvcnQgbmFtZXNwYWNlIEhpdGJveCB7XG4gIC8vIGV4cG9ydCBmdW5jdGlvbiByZWN0KGR5czogcmVhZG9ubHkgbnVtYmVyW10sIGR4czogcmVhZG9ubHkgbnVtYmVyW10pOiBIaXRib3gge1xuICAvLyAgIHJldHVybiB7XG4gIC8vICAgICAqIFtTeW1ib2wuaXRlcmF0b3JdKCkge1xuICAvLyAgICAgICBmb3IgKGNvbnN0IHkgb2YgZHlzKSB7XG4gIC8vICAgICAgICAgZm9yIChjb25zdCB4IG9mIGR4cykge1xuICAvLyAgICAgICAgICAgeWllbGQgW2R5LCBkeF07XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgfTtcbiAgLy8gfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB0cmlnZ2VyKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKTogSGl0Ym94IHtcbiAgICAvLyBGb3IgdHJpZ2dlcnMsIHdoaWNoIHRpbGVzIGRvIHdlIG1hcms/XG4gICAgLy8gVGhlIHRyaWdnZXIgaGl0Ym94IGlzIDIgdGlsZXMgd2lkZSBhbmQgMSB0aWxlIHRhbGwsIGJ1dCBpdCBkb2VzIG5vdFxuICAgIC8vIGxpbmUgdXAgbmljZWx5IHRvIHRoZSB0aWxlIGdyaWQuICBBbHNvLCB0aGUgcGxheWVyIGhpdGJveCBpcyBvbmx5XG4gICAgLy8gJGMgd2lkZSAodGhvdWdoIGl0J3MgJDE0IHRhbGwpIHNvIHRoZXJlJ3Mgc29tZSBzbGlnaHQgZGlzcGFyaXR5LlxuICAgIC8vIEl0IHNlZW1zIGxpa2UgcHJvYmFibHkgbWFya2luZyBpdCBhcyAoeC0xLCB5LTEpIC4uICh4LCB5KSBtYWtlcyB0aGVcbiAgICAvLyBtb3N0IHNlbnNlLCB3aXRoIHRoZSBjYXZlYXQgdGhhdCB0cmlnZ2VycyBzaGlmdGVkIHJpZ2h0IGJ5IGEgaGFsZlxuICAgIC8vIHRpbGUgc2hvdWxkIGdvIGZyb20geCAuLiB4KzEgaW5zdGVhZC5cbiAgICByZXR1cm4ge1xuICAgICAgKiBbU3ltYm9sLml0ZXJhdG9yXSgpIHtcbiAgICAgICAgbGV0IHt4OiB4MCwgeTogeTB9ID0gc3Bhd247XG4gICAgICAgIHgwICs9IDg7XG4gICAgICAgIGZvciAoY29uc3QgZHggb2YgWy0xNiwgMF0pIHtcbiAgICAgICAgICBjb25zdCB4ID0geDAgKyBkeDtcbiAgICAgICAgICBmb3IgKGNvbnN0IGR5IG9mIFstMTYsIDBdKSB7XG4gICAgICAgICAgICBjb25zdCB5ID0geTAgKyBkeTtcbiAgICAgICAgICAgIHlpZWxkIFRpbGVJZC5mcm9tKGxvY2F0aW9uLCB7eCwgeX0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gYWRqdXN0KGg6IEhpdGJveCwgLi4uZGVsdGFzOiBEZWx0YVtdKTogSGl0Ym94IHtcbiAgICBjb25zdCBzID0gbmV3IFNldDxUaWxlSWQ+KCk7XG4gICAgY29uc3QgdHMgPSBbLi4uaF07XG4gICAgZm9yIChjb25zdCBbZHksIGR4XSBvZiBkZWx0YXMpIHtcbiAgICAgIGZvciAoY29uc3QgdCBvZiB0cykge1xuICAgICAgICBzLmFkZChUaWxlSWQuYWRkKHQsIGR5LCBkeCkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzY3JlZW4odGlsZTogVGlsZUlkKTogSGl0Ym94IHtcbiAgICBjb25zdCB0cyA9IFtdO1xuICAgIGZvciAobGV0IHQgPSAwOyB0IDwgMHhmMDsgdCsrKSB7XG4gICAgICB0cy5wdXNoKCh0aWxlICYgfjB4ZmYgfCB0KSBhcyBUaWxlSWQpO1xuICAgIH1cbiAgICByZXR1cm4gdHM7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gYXRMb2NhdGlvbihoOiBIaXRib3gsIC4uLmxvY2F0aW9uczogTG9jYXRpb25bXSk6IEhpdGJveCB7XG4gICAgY29uc3QgcyA9IG5ldyBTZXQ8VGlsZUlkPigpO1xuICAgIGNvbnN0IHRzID0gWy4uLmhdO1xuICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgbG9jYXRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IHQgb2YgdHMpIHtcbiAgICAgICAgcy5hZGQoKHQgJiAweGZmZmYgfCBsb2NhdGlvbi5pZCA8PCAxNikgYXMgVGlsZUlkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHM7XG4gIH1cblxuICB0eXBlIERlbHRhID0gcmVhZG9ubHkgW251bWJlciwgbnVtYmVyXTtcbn1cblxuIl19