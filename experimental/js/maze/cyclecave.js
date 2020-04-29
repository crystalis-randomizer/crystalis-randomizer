import { CaveShuffle } from './cave.js';
export class CycleCaveShuffle extends CaveShuffle {
    refineEdges() { return true; }
    preinfer(a) {
        const allTiles = [];
        for (let y = 0; y < a.h; y++) {
            for (let x = 0; x < a.w; x++) {
                const c = (y << 12 | x << 4 | 0x808);
                if (a.grid.get(c))
                    allTiles.push(c);
            }
        }
        const nonCritical = allTiles.filter(t => this.tryClear(a, [t]).length === 1);
        if (!nonCritical.length) {
            return { ok: false, fail: 'all critical?' };
        }
        for (let i = 0; i < nonCritical.length; i++) {
            for (let j = 0; j < i; j++) {
                if (this.tryClear(a, [nonCritical[i], nonCritical[j]]).length > 2) {
                    return super.preinfer(a);
                }
            }
        }
        return { ok: false, fail: 'unable to find pair of mutually critical tiles' };
    }
}
export class TightCycleCaveShuffle extends CycleCaveShuffle {
    removeTightLoops() { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3ljbGVjYXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL21hemUvY3ljbGVjYXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQXNCLE1BQU0sV0FBVyxDQUFDO0FBTTVELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxXQUFXO0lBRS9DLFdBQVcsS0FBSyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFOUIsUUFBUSxDQUFDLENBQUk7UUFDWCxNQUFNLFFBQVEsR0FBZ0IsRUFBRSxDQUFDO1FBQ2pDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzVCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUM1QixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQWMsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNyQztTQUNGO1FBQ0QsTUFBTSxXQUFXLEdBQ2IsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUU7WUFFdkIsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBQyxDQUFDO1NBQzNDO1FBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDM0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDMUIsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7b0JBQ2pFLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDMUI7YUFDRjtTQUNGO1FBQ0QsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGdEQUFnRCxFQUFDLENBQUM7SUFDN0UsQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLHFCQUFzQixTQUFRLGdCQUFnQjtJQUN6RCxnQkFBZ0IsS0FBSSxDQUFDO0NBQ3RCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2F2ZVNodWZmbGUsIENhdmVTaHVmZmxlQXR0ZW1wdCB9IGZyb20gJy4vY2F2ZS5qcyc7XG5pbXBvcnQgeyBHcmlkQ29vcmQgfSBmcm9tICcuL2dyaWQuanMnO1xuaW1wb3J0IHsgUmVzdWx0IH0gZnJvbSAnLi9tYXplLmpzJztcblxudHlwZSBBID0gQ2F2ZVNodWZmbGVBdHRlbXB0O1xuXG5leHBvcnQgY2xhc3MgQ3ljbGVDYXZlU2h1ZmZsZSBleHRlbmRzIENhdmVTaHVmZmxlIHtcbiAgLy8gRG8gbm90aGluZ1xuICByZWZpbmVFZGdlcygpIHsgcmV0dXJuIHRydWU7IH1cblxuICBwcmVpbmZlcihhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBjb25zdCBhbGxUaWxlczogR3JpZENvb3JkW10gPSBbXTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGEuaDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IGEudzsgeCsrKSB7XG4gICAgICAgIGNvbnN0IGMgPSAoeSA8PCAxMiB8IHggPDwgNCB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmIChhLmdyaWQuZ2V0KGMpKSBhbGxUaWxlcy5wdXNoKGMpO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBub25Dcml0aWNhbCA9XG4gICAgICAgIGFsbFRpbGVzLmZpbHRlcih0ID0+IHRoaXMudHJ5Q2xlYXIoYSwgW3RdKS5sZW5ndGggPT09IDEpO1xuICAgIGlmICghbm9uQ3JpdGljYWwubGVuZ3RoKSB7XG4gICAgICAvLyBldmVyeXRoaW5nIGlzIGNyaXRpY2FsXG4gICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogJ2FsbCBjcml0aWNhbD8nfTtcbiAgICB9XG4gICAgLy8gZmluZCB0d28gbm9uY3JpdGljYWwgdGlsZXMgdGhhdCB0b2dldGhlciAqYXJlKiBjcml0aWNhbFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9uQ3JpdGljYWwubGVuZ3RoOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgaTsgaisrKSB7XG4gICAgICAgIGlmICh0aGlzLnRyeUNsZWFyKGEsIFtub25Dcml0aWNhbFtpXSwgbm9uQ3JpdGljYWxbal1dKS5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgcmV0dXJuIHN1cGVyLnByZWluZmVyKGEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAndW5hYmxlIHRvIGZpbmQgcGFpciBvZiBtdXR1YWxseSBjcml0aWNhbCB0aWxlcyd9O1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUaWdodEN5Y2xlQ2F2ZVNodWZmbGUgZXh0ZW5kcyBDeWNsZUNhdmVTaHVmZmxlIHtcbiAgcmVtb3ZlVGlnaHRMb29wcygpIHt9XG59XG4iXX0=