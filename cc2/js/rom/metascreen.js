import { featureMask } from './metascreendata.js';
import { DefaultMap, hex1 } from '../util.js';
export class Metascreen {
    constructor(rom, uid, data) {
        var _a, _b, _c, _d, _e;
        this.rom = rom;
        this.uid = uid;
        this.data = data;
        this._tilesets = new Set();
        this.used = false;
        this.neighbors = [
            new DefaultMap((s) => this._checkNeighbor(s, 0)),
            new DefaultMap((s) => this._checkNeighbor(s, 1)),
        ];
        for (const tileset of Object.values(data.tilesets)) {
            if (!tileset.requires)
                this.used = true;
        }
        let features = 0;
        for (const feature of (_a = data.feature) !== null && _a !== void 0 ? _a : []) {
            const mask = featureMask[feature];
            if (mask != null)
                features |= mask;
        }
        for (const exit of (_b = data.exits) !== null && _b !== void 0 ? _b : []) {
            if (exit.type === 'stair:down' || exit.type === 'stair:up') {
                features |= featureMask[exit.type];
            }
        }
        this._features = features;
        this._isEmpty = Boolean(features & featureMask['empty']);
        this.flag = data.flag;
        const cxn = [[[]], [[]], [[]], [[]]];
        this.connections = cxn;
        for (let i = 0; i < 4; i++) {
            let poiIndex = 0;
            let exitIndex = 0;
            let cur = cxn[i][0];
            for (const term of (_c = this.data.connect) !== null && _c !== void 0 ? _c : '') {
                if (connectionBlocks[i].includes(term)) {
                    cxn[i].push(cur = []);
                    continue;
                }
                let delta;
                if (connectionBlockSet.has(term))
                    continue;
                if (term === 'p') {
                    delta = 0xf0 | poiIndex++;
                }
                else if (term === 'x') {
                    delta = 0xe0 | exitIndex++;
                }
                else {
                    const num = parseInt(term, 16);
                    if (!num)
                        throw new Error(`bad term: '${term}'`);
                    const channel = (num & 3) << (num & 4);
                    const offset = num & 8 ? (num & 4 ? 0x0100 : 0x1000) : 0;
                    delta = channel | offset;
                }
                cur.push(delta);
            }
            while (poiIndex < ((_d = this.data.poi) === null || _d === void 0 ? void 0 : _d.length)) {
                cur.push(0xf0 | poiIndex++);
            }
            while (exitIndex < ((_e = this.data.exits) === null || _e === void 0 ? void 0 : _e.length)) {
                cur.push(0xe0 | exitIndex++);
            }
        }
    }
    get features() {
        return this._features;
    }
    get manual() {
        return Boolean(this._features & manualFeatureMask);
    }
    get counted() {
        return Boolean(this._features & countedFeatureMask);
    }
    hasFeature(feature) {
        return Boolean(this._features & featureMask[feature]);
    }
    hasFeatures(features) {
        return (this._features & features) === features;
    }
    withFeature(feature) {
        throw new Error();
    }
    isEmpty() {
        return this._isEmpty;
    }
    hasStair() {
        return Boolean(this._features & (featureMask['stair:up'] |
            featureMask['stair:down']));
    }
    withObstruction() {
        throw new Error();
    }
    isCompatibleWithTileset(id) {
        for (const tileset of this._tilesets) {
            if (tileset.tilesetId === id)
                return true;
        }
        return false;
    }
    replace(from, to) {
        const { tiles } = this.screen;
        for (let i = 0; i < tiles.length; i++) {
            if (tiles[i] === from)
                tiles[i] = to;
        }
        return this;
    }
    remove() {
        for (const tileset of this.tilesets()) {
            tileset.deleteScreen(this);
        }
    }
    tilesets() {
        const tilesets = [];
        for (const key in this.data.tilesets) {
            tilesets.push(this.rom.metatilesets[key]);
        }
        return tilesets;
    }
    setGridTile(...tile) {
        this.data.tile = tile;
        for (const tileset of this.tilesets()) {
            tileset.invalidate();
        }
    }
    gridTiles() {
        var _a;
        let t = (_a = this.data.tile) !== null && _a !== void 0 ? _a : [];
        if (!Array.isArray(t))
            t = [t];
        return t.map(s => s.replace(/\|/g, ''));
    }
    get sid() {
        return this.data.id;
    }
    set sid(sid) {
        if (this.sid === sid)
            return;
        this.rom.metascreens.renumber(this.sid, sid, new Set(this.tilesets()));
    }
    get screen() {
        const { sid, rom: { screens } } = this;
        return sid < 0 ? screens.unallocated[~sid] : screens[sid];
    }
    unsafeSetId(sid) {
        this.data.id = sid;
        for (const tileset of this._tilesets) {
            tileset.invalidate();
        }
    }
    unsafeAddTileset(tileset) {
        this._tilesets.add(tileset);
    }
    unsafeRemoveTileset(tileset) {
        this._tilesets.delete(tileset);
    }
    edgeExits() {
        var _a;
        let mask = 0;
        for (const e of (_a = this.data.exits) !== null && _a !== void 0 ? _a : []) {
            const dir = edgeTypeMap[e.type];
            if (dir != null)
                mask |= (1 << dir);
        }
        return mask;
    }
    edgeIndex(edgeType) {
        var _a;
        let index = 0;
        const edge = (_a = this.data.edges) !== null && _a !== void 0 ? _a : '';
        for (let i = 0; i < 4; i++) {
            if (edge[i] === ' ')
                continue;
            if (edge[i] !== edgeType)
                return undefined;
            index |= (1 << i);
        }
        return index;
    }
    findExitType(tile, single, seamless) {
        var _a, _b;
        for (const exit of (_a = this.data.exits) !== null && _a !== void 0 ? _a : []) {
            if (exit.type.startsWith('seamless') !== seamless)
                continue;
            const t0 = single && exit.type === 'edge:bottom' && tile >= 0xc0 ?
                tile + 0x20 : tile;
            if (exit.exits.includes(t0) || ((_b = exit.allowedExits) !== null && _b !== void 0 ? _b : []).includes(t0)) {
                return exit;
            }
        }
        return undefined;
    }
    findExitByType(type) {
        const exit = this.data.exits.find(e => e.type === type);
        if (!exit)
            throw new Error(`no exit ${type}`);
        return exit;
    }
    findEntranceType(coord, single) {
        var _a, _b;
        for (const exit of (_a = this.data.exits) !== null && _a !== void 0 ? _a : []) {
            if (exit.type.startsWith('seamless'))
                continue;
            const c0 = single && exit.type === 'edge:bottom' && coord >= 0xbf00 ?
                coord + 0x2000 : coord;
            const t0 = (c0 & 0xf0) >> 4 | (c0 & 0xf000) >> 8;
            if (exit.entrance === c0 ||
                exit.exits.includes(t0) || ((_b = exit.allowedExits) !== null && _b !== void 0 ? _b : []).includes(t0)) {
                return exit.type;
            }
        }
        return undefined;
    }
    addCustomFlag(defaultValue) {
        this.flag = defaultValue ? 'custom:true' : 'custom:false';
    }
    checkNeighbor(that, dir) {
        const a = dir & 2 ? this : that;
        const b = dir & 2 ? that : this;
        return a.neighbors[dir & 1].get(b);
    }
    _checkNeighbor(that, dir) {
        const e1 = this.data.edges;
        const e2 = that.data.edges;
        if (e1 && e2) {
            const opp = dir ^ 2;
            if (e1[opp] !== '*' && e1[opp] === e2[dir])
                return true;
        }
        return false;
    }
    toString() {
        return `${hex1(this.sid)} ${this.name}`;
    }
}
const edgeTypeMap = {
    'edge:top': 0,
    'edge:left': 1,
    'edge:bottom': 2,
    'edge:right': 3,
};
const connectionBlocks = [
    '|:',
    '|:=-',
    '|',
    '|=',
];
const connectionBlockSet = new Set(['|', ':', '-', '=']);
const manualFeatures = new Set([
    'arena', 'portoa1', 'portoa2', 'portoa3', 'lake', 'overpass', 'underpass',
    'lighthouse', 'cabin', 'windmill', 'altar', 'pyramid', 'crypt',
]);
const countedFeatures = new Set([
    'pit', 'spikes', 'bridge', 'wall', 'ramp', 'whirlpool',
]);
const manualFeatureMask = [...manualFeatures].map(f => featureMask[f]).reduce((a, b) => a | b);
const countedFeatureMask = [...countedFeatures].map(f => featureMask[f]).reduce((a, b) => a | b);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YXNjcmVlbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9yb20vbWV0YXNjcmVlbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0MsV0FBVyxFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFJaEQsT0FBTyxFQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFJNUMsTUFBTSxPQUFPLFVBQVU7SUFtQ3JCLFlBQXFCLEdBQVEsRUFBVyxHQUFRLEVBQzNCLElBQW9COztRQURwQixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQVcsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUMzQixTQUFJLEdBQUosSUFBSSxDQUFnQjtRQWxDeEIsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFlLENBQUM7UUFjcEQsU0FBSSxHQUFHLEtBQUssQ0FBQztRQVdKLGNBQVMsR0FBRztZQUNuQixJQUFJLFVBQVUsQ0FBc0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLElBQUksVUFBVSxDQUFzQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDN0QsQ0FBQztRQU9ULEtBQUssTUFBTSxPQUFPLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDbEQsSUFBSSxDQUFDLE9BQVEsQ0FBQyxRQUFRO2dCQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQzFDO1FBR0QsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQ2pCLEtBQUssTUFBTSxPQUFPLFVBQUksSUFBSSxDQUFDLE9BQU8sbUNBQUksRUFBRSxFQUFFO1lBQ3hDLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMs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QUM7QUFFSCxNQUFNLGlCQUFpQixHQUFHLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQyxHQUFHLENBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzNELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxDQUFDLEdBQUcsQ0FDL0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFXLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0Nvbm5lY3Rpb24sIENvbm5lY3Rpb25UeXBlLCBGZWF0dXJlLCBNZXRhc2NyZWVuRGF0YSxcbiAgICAgICAgZmVhdHVyZU1hc2t9IGZyb20gJy4vbWV0YXNjcmVlbmRhdGEuanMnO1xuaW1wb3J0IHtNZXRhdGlsZXNldCwgTWV0YXRpbGVzZXRzfSBmcm9tICcuL21ldGF0aWxlc2V0LmpzJztcbmltcG9ydCB7U2NyZWVufSBmcm9tICcuL3NjcmVlbi5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7RGVmYXVsdE1hcCwgaGV4MX0gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbmV4cG9ydCB0eXBlIFVpZCA9IG51bWJlciAmIHtfX3VpZF9fOiBuZXZlcn07XG5cbmV4cG9ydCBjbGFzcyBNZXRhc2NyZWVuIHtcbiAgcHJpdmF0ZSByZWFkb25seSBfZmVhdHVyZXM6IG51bWJlcjsgLy8gPSBuZXcgU2V0PEZlYXR1cmU+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgX3RpbGVzZXRzID0gbmV3IFNldDxNZXRhdGlsZXNldD4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBfaXNFbXB0eTogYm9vbGVhbjtcbiAgLy8ga2V5OiBiaXRzZXQgLSAxIGZvciBmbGlnaHQsIDIgZm9yIG5vRmxhZ1xuICAvLyB2YWx1ZTogc2VnbWVudHMsIGVhY2ggY29udGFpbmluZyBhbiBvZmZzZXQgdG8gYWRkIHRvIHBvczw8OCB0byBnZXRcbiAgLy8gICAgICAgIGNvbm5lY3Rpb24gcG9pbnRzIChlLmcuIDAwMDEsIDAxMDEsIDEwMjAsIGV0YykuXG4gIHJlYWRvbmx5IGNvbm5lY3Rpb25zOiBSZWFkb25seUFycmF5PFJlYWRvbmx5QXJyYXk8UmVhZG9ubHlBcnJheTxudW1iZXI+Pj47XG4gIC8vIFRPRE8gLSBpdCBtaWdodCBtYWtlIHNlbnNlIHRvIGJ1aWxkIGluICc8PnAnIGludG8gdGhlIGNvbm5lY3Rpb25zIHN0cmluZyxcbiAgLy8gaW5kaWNhdGluZyB3aGljaCBwYXJ0aXRpb25zIGhhdmUgZXhpdHMgb3IgUE9JIChpbiBvcmRlcikuICBCdXQgdGhlIEFQSVxuICAvLyBmb3IgZXhwb3NpbmcgdGhpcyBpcyB1Z2x5LiAgQW5vdGhlciBhbHRlcm5hdGl2ZSB3b3VsZCBiZSB0byBkZWRpY2F0ZVxuICAvLyBhIHBvcnRpb24gb2YgXCJzcGVjdHJ1bVwiIHRvIHBvaSBhbmQgZXhpdHMsIGUuZy4gW2YwLi5mM10gZm9yIFBPSSwgW2UwLi5lM11cbiAgLy8gZm9yIGV4aXRzLCBhbmQgdGhlbiB3ZSBjYW4gYnVpbGQgaXQgZGlyZWN0bHkgaW50byBjb25uZWN0aW9ucywgYW5kIHRoZXlcbiAgLy8gd2lsbCBzaG93IHVwIGluIHRoZSByZXN1bHRzLlxuICAvL3BvaTogQXJyYXk8e3g6IG51bWJlciwgeTogbnVtYmVyLCBwcmlvcml0eTogbnVtYmVyLCBzZWdtZW50OiBudW1iZXJ9PjtcblxuICB1c2VkID0gZmFsc2U7XG5cbiAgLy8gJ2Fsd2F5cycgaW5kaWNhdGVzIHRoYXQgdGhlIGZsYWcgdG9nZ2xlcyBiZXR3ZWVuIHR3byBkaWZmZXJlbnQgbWV0YXNjcmVlbnNcbiAgLy8gJ2NhbG0nIGlzIGEgc3BlY2lhbCBjYXNlIGZvciB3aGlybHBvb2xzXG4gIC8vICdjdXN0b206ZmFsc2UnIGluZGljYXRlcyB0aGF0IHRoZSBmbGFnIHdpbGwgZGVmYXVsdCB0byBmYWxzZSwgYnV0IGNhbiBiZVxuICAvLyAgICAgb3ZlcnJpZGRlbiBieSBzZXR0aW5nIGEgY3VzdG9tRmxhZyBvbiB0aGUgTWV0YUxvY2F0aW9uXG4gIC8vICdjdXN0b206dHJ1ZScgaXMgdGhlIHNhbWUgYnV0IGRlZmF1bHRzIHRvIHRydWUgKGkuZS4gY2xvc2VhYmxlIGNhdmVzKVxuICAvLyBhYnNlbnQgaXMgdXNlZCBmb3Igbm9ybWFsIHdhbGxzIGFuZCBkZWZhdWx0IHRvIGFsbG9jYXRpbmcgYSBuZXcgd2FsbCBmbGFnXG4gIGZsYWc/OiAnYWx3YXlzJyB8ICdjYWxtJyB8ICdjdXN0b206ZmFsc2UnIHwgJ2N1c3RvbTp0cnVlJztcbiAgbmFtZT86IHN0cmluZztcblxuICByZWFkb25seSBuZWlnaGJvcnMgPSBbXG4gICAgbmV3IERlZmF1bHRNYXA8TWV0YXNjcmVlbiwgYm9vbGVhbj4oKHMpID0+IHRoaXMuX2NoZWNrTmVpZ2hib3IocywgMCkpLFxuICAgIG5ldyBEZWZhdWx0TWFwPE1ldGFzY3JlZW4sIGJvb2xlYW4+KChzKSA9PiB0aGlzLl9jaGVja05laWdoYm9yKHMsIDEpKSxcbiAgXSBhcyBjb25zdDtcblxuICAvL3JlYWRvbmx5IGZlYXR1cmVDb3VudDogUmVhZG9ubHlNYXA8RmVhdHVyZSwgbnVtYmVyPjtcblxuICAvLyBUT0RPIC0gbWFrZSBkYXRhIHByaXZhdGU/XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tLCByZWFkb25seSB1aWQ6IFVpZCxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgZGF0YTogTWV0YXNjcmVlbkRhdGEpIHtcbiAgICBmb3IgKGNvbnN0IHRpbGVzZXQgb2YgT2JqZWN0LnZhbHVlcyhkYXRhLnRpbGVzZXRzKSkge1xuICAgICAgaWYgKCF0aWxlc2V0IS5yZXF1aXJlcykgdGhpcy51c2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgLy8gbGV0IGZpeGVkID0gZmFsc2U7XG4gICAgLy8gY29uc3QgZmVhdHVyZUNvdW50ID0gbmV3IERlZmF1bHRNYXA8RmVhdHVyZSwgbnVtYmVyPigoKSA9PiAwKTtcbiAgICBsZXQgZmVhdHVyZXMgPSAwO1xuICAgIGZvciAoY29uc3QgZmVhdHVyZSBvZiBkYXRhLmZlYXR1cmUgPz8gW10pIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBmZWF0dXJlTWFza1tmZWF0dXJlXTtcbiAgICAgIGlmIChtYXNrICE9IG51bGwpIGZlYXR1cmVzIHw9IG1hc2s7XG4gICAgICAvLyB0aGlzLl9mZWF0dXJlcy5hZGQoZmVhdHVyZSk7XG4gICAgICAvLyBpZiAoZml4ZWRGZWF0dXJlcy5oYXMoZmVhdHVyZSkpIGZpeGVkID0gdHJ1ZTtcbiAgICAgIC8vIGlmIChmaXhlZENvdW50RmVhdHVyZXMuaGFzKGZlYXR1cmUpKSB7XG4gICAgICAvLyAgIGZlYXR1cmVDb3VudC5zZXQoZmVhdHVyZSwgZmVhdHVyZUNvdW50LmdldChmZWF0dXJlKSArIDEpO1xuICAgICAgLy8gfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgZGF0YS5leGl0cyA/PyBbXSkge1xuICAgICAgaWYgKGV4aXQudHlwZSA9PT0gJ3N0YWlyOmRvd24nIHx8IGV4aXQudHlwZSA9PT0gJ3N0YWlyOnVwJykge1xuICAgICAgICBmZWF0dXJlcyB8PSBmZWF0dXJlTWFza1tleGl0LnR5cGVdO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9mZWF0dXJlcyA9IGZlYXR1cmVzO1xuICAgIHRoaXMuX2lzRW1wdHkgPSBCb29sZWFuKGZlYXR1cmVzICYgZmVhdHVyZU1hc2tbJ2VtcHR5J10pO1xuICAgIHRoaXMuZmxhZyA9IGRhdGEuZmxhZztcbiAgICAvLyB0aGlzLmZpeGVkID0gZml4ZWQ7XG4gICAgLy8gdGhpcy5mZWF0dXJlQ291bnQgPSBmZWF0dXJlQ291bnQ7XG4gICAgLy8gVE9ETyAtIGJ1aWxkIFwiY29ubmVjdGlvbnNcIiBieSBpdGVyYXRpbmcgb3ZlciAwLi4zLlxuICAgIGNvbnN0IGN4bjogbnVtYmVyW11bXVtdID0gW1tbXV0sIFtbXV0sIFtbXV0sIFtbXV1dO1xuXG4gICAgdGhpcy5jb25uZWN0aW9ucyA9IGN4bjtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgbGV0IHBvaUluZGV4ID0gMDtcbiAgICAgIGxldCBleGl0SW5kZXggPSAwO1xuICAgICAgbGV0IGN1ciA9IGN4bltpXVswXTtcbiAgICAgIGZvciAoY29uc3QgdGVybSBvZiB0aGlzLmRhdGEuY29ubmVjdCA/PyAnJykge1xuICAgICAgICBpZiAoY29ubmVjdGlvbkJsb2Nrc1tpXS5pbmNsdWRlcyh0ZXJtKSkge1xuICAgICAgICAgIGN4bltpXS5wdXNoKGN1ciA9IFtdKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgZGVsdGE7XG4gICAgICAgIGlmIChjb25uZWN0aW9uQmxvY2tTZXQuaGFzKHRlcm0pKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHRlcm0gPT09ICdwJykge1xuICAgICAgICAgIGRlbHRhID0gMHhmMCB8IHBvaUluZGV4Kys7XG4gICAgICAgIH0gZWxzZSBpZiAodGVybSA9PT0gJ3gnKSB7XG4gICAgICAgICAgZGVsdGEgPSAweGUwIHwgZXhpdEluZGV4Kys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgbnVtID0gcGFyc2VJbnQodGVybSwgMTYpO1xuICAgICAgICAgIGlmICghbnVtKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCB0ZXJtOiAnJHt0ZXJtfSdgKTsgLy8gY29udGludWU/Pz9cbiAgICAgICAgICBjb25zdCBjaGFubmVsID0gKG51bSAmIDMpIDw8IChudW0gJiA0KTsgLy8gMDEsIDAyLCAwMywgMTAsIDIwLCBvciAzMFxuICAgICAgICAgIGNvbnN0IG9mZnNldCA9IG51bSAmIDggPyAobnVtICYgNCA/IDB4MDEwMCA6IDB4MTAwMCkgOiAwO1xuICAgICAgICAgIGRlbHRhID0gY2hhbm5lbCB8IG9mZnNldDtcbiAgICAgICAgfVxuICAgICAgICBjdXIucHVzaChkZWx0YSk7XG4gICAgICB9XG4gICAgICB3aGlsZSAocG9pSW5kZXggPCB0aGlzLmRhdGEucG9pPy5sZW5ndGghKSB7XG4gICAgICAgIGN1ci5wdXNoKDB4ZjAgfCBwb2lJbmRleCsrKTtcbiAgICAgIH1cbiAgICAgIHdoaWxlIChleGl0SW5kZXggPCB0aGlzLmRhdGEuZXhpdHM/Lmxlbmd0aCEpIHtcbiAgICAgICAgY3VyLnB1c2goMHhlMCB8IGV4aXRJbmRleCsrKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXQgZmVhdHVyZXMoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fZmVhdHVyZXM7XG4gIH1cblxuICBnZXQgbWFudWFsKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBCb29sZWFuKHRoaXMuX2ZlYXR1cmVzICYgbWFudWFsRmVhdHVyZU1hc2spO1xuICB9XG5cbiAgZ2V0IGNvdW50ZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIEJvb2xlYW4odGhpcy5fZmVhdHVyZXMgJiBjb3VudGVkRmVhdHVyZU1hc2spO1xuICB9XG5cbiAgLy8gZmVhdHVyZXMoKTogSXRlcmFibGU8RmVhdHVyZT4ge1xuICAvLyAgIHJldHVybiB0aGlzLl9mZWF0dXJlcy52YWx1ZXMoKTtcbiAgLy8gfVxuXG4gIGhhc0ZlYXR1cmUoZmVhdHVyZTogRmVhdHVyZSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBCb29sZWFuKHRoaXMuX2ZlYXR1cmVzICYgZmVhdHVyZU1hc2tbZmVhdHVyZV0pO1xuICB9XG5cbiAgaGFzRmVhdHVyZXMoZmVhdHVyZXM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiAodGhpcy5fZmVhdHVyZXMgJiBmZWF0dXJlcykgPT09IGZlYXR1cmVzO1xuICB9XG5cbiAgLyoqIFJldHVybiBhIG5ldyBtZXRhc2NyZWVuIHdpdGggdGhlIHNhbWUgcHJvZmlsZSBidXQgYW4gZXh0cmEgZmVhdHVyZS4gKi9cbiAgd2l0aEZlYXR1cmUoZmVhdHVyZTogRmVhdHVyZSk6IE1ldGFzY3JlZW5bXSB7XG4gICAgLy8gVE9ETyAtIGluZGV4IHRoaXM/XG4gICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gIH1cblxuICBpc0VtcHR5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9pc0VtcHR5O1xuICB9XG5cbiAgaGFzU3RhaXIoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIEJvb2xlYW4odGhpcy5fZmVhdHVyZXMgJiAoZmVhdHVyZU1hc2tbJ3N0YWlyOnVwJ10gfFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmVNYXNrWydzdGFpcjpkb3duJ10pKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gYSBuZXcgbWV0YXNjcmVlbiB3aXRoIHRoZSBzYW1lIHByb2ZpbGUgYnV0IG1vcmUgb2JzdHJ1Y3RlZC4gKi9cbiAgd2l0aE9ic3RydWN0aW9uKCk6IE1ldGFzY3JlZW5bXSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gIH1cblxuICBpc0NvbXBhdGlibGVXaXRoVGlsZXNldChpZDogbnVtYmVyKSB7XG4gICAgZm9yIChjb25zdCB0aWxlc2V0IG9mIHRoaXMuX3RpbGVzZXRzKSB7XG4gICAgICBpZiAodGlsZXNldC50aWxlc2V0SWQgPT09IGlkKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlcGxhY2Ugb2NjdXJyZW5jZXMgb2YgYSBtZXRhdGlsZSB3aXRoaW4gdGhpcyBzY3JlZW4uXG4gICAqL1xuICByZXBsYWNlKGZyb206IG51bWJlciwgdG86IG51bWJlcik6IE1ldGFzY3JlZW4ge1xuICAgIGNvbnN0IHt0aWxlc30gPSB0aGlzLnNjcmVlbjtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRpbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodGlsZXNbaV0gPT09IGZyb20pIHRpbGVzW2ldID0gdG87XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgcmVtb3ZlKCkge1xuICAgIC8vIFJlbW92ZSBzZWxmIGZyb20gYWxsIG1ldGF0aWxlc2V0cy4gIFVzZWQgYnkgbGFieXJpbnRoVmFyaWFudCB0b1xuICAgIC8vIGVuc3VyZSBpbXBvc3NpYmxlIHZhcmlhbnRzIGFyZW4ndCBhZGRlZCAobm90ZTogd2l0aCBhIGRlZGljYXRlZFxuICAgIC8vIHBhZ2Ugd2UgY291bGQgbWFrZSBtb3JlIGF2YWlsYWJsZSkuXG4gICAgZm9yIChjb25zdCB0aWxlc2V0IG9mIHRoaXMudGlsZXNldHMoKSkge1xuICAgICAgdGlsZXNldC5kZWxldGVTY3JlZW4odGhpcyk7XG4gICAgfVxuICB9XG5cbiAgdGlsZXNldHMoKTogTWV0YXRpbGVzZXRbXSB7XG4gICAgY29uc3QgdGlsZXNldHM6IE1ldGF0aWxlc2V0W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzLmRhdGEudGlsZXNldHMpIHtcbiAgICAgIHRpbGVzZXRzLnB1c2goXG4gICAgICAgICAgdGhpcy5yb20ubWV0YXRpbGVzZXRzW2tleSBhcyBrZXlvZiBNZXRhdGlsZXNldHNdIGFzIE1ldGF0aWxlc2V0KTtcbiAgICB9XG4gICAgcmV0dXJuIHRpbGVzZXRzO1xuICB9XG5cbiAgc2V0R3JpZFRpbGUoLi4udGlsZTogc3RyaW5nW10pIHtcbiAgICB0aGlzLmRhdGEudGlsZSA9IHRpbGU7XG4gICAgZm9yIChjb25zdCB0aWxlc2V0IG9mIHRoaXMudGlsZXNldHMoKSkge1xuICAgICAgdGlsZXNldC5pbnZhbGlkYXRlKCk7XG4gICAgfVxuICB9XG5cbiAgZ3JpZFRpbGVzKCk6IHN0cmluZ1tdIHtcbiAgICBsZXQgdCA9IHRoaXMuZGF0YS50aWxlID8/IFtdO1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh0KSkgdCA9IFt0XTtcbiAgICByZXR1cm4gdC5tYXAocyA9PiBzLnJlcGxhY2UoL1xcfC9nLCAnJykpO1xuICB9XG5cbiAgZ2V0IHNpZCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmRhdGEuaWQ7XG4gIH1cblxuICBzZXQgc2lkKHNpZDogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuc2lkID09PSBzaWQpIHJldHVybjtcbiAgICB0aGlzLnJvbS5tZXRhc2NyZWVucy5yZW51bWJlcih0aGlzLnNpZCwgc2lkLCBuZXcgU2V0KHRoaXMudGlsZXNldHMoKSkpO1xuICB9XG5cbiAgZ2V0IHNjcmVlbigpOiBTY3JlZW4ge1xuICAgIGNvbnN0IHtzaWQsIHJvbToge3NjcmVlbnN9fSA9IHRoaXM7XG4gICAgcmV0dXJuIHNpZCA8IDAgPyBzY3JlZW5zLnVuYWxsb2NhdGVkW35zaWRdIDogc2NyZWVuc1tzaWRdO1xuICB9XG5cbiAgLy8gT25seSBNZXRhc2NyZWVucy5yZW51bWJlciBzaG91bGQgY2FsbCB0aGlzLlxuICB1bnNhZmVTZXRJZChzaWQ6IG51bWJlcikge1xuICAgICh0aGlzLmRhdGEgYXMge2lkOiBudW1iZXJ9KS5pZCA9IHNpZDtcbiAgICBmb3IgKGNvbnN0IHRpbGVzZXQgb2YgdGhpcy5fdGlsZXNldHMpIHtcbiAgICAgIHRpbGVzZXQuaW52YWxpZGF0ZSgpO1xuICAgIH1cbiAgfVxuICAvLyBPbmx5IE1ldGF0aWxlc2V0LmFkZFNjcmVlbiBzaG91bGQgY2FsbCB0aGlzLlxuICB1bnNhZmVBZGRUaWxlc2V0KHRpbGVzZXQ6IE1ldGF0aWxlc2V0KSB7XG4gICAgdGhpcy5fdGlsZXNldHMuYWRkKHRpbGVzZXQpO1xuICB9XG4gIC8vIE9ubHkgTWV0YXRpbGVzZXQucmVtb3ZlU2NyZWVuIHNob3VsZCBjYWxsIHRoaXMuXG4gIHVuc2FmZVJlbW92ZVRpbGVzZXQodGlsZXNldDogTWV0YXRpbGVzZXQpIHtcbiAgICB0aGlzLl90aWxlc2V0cy5kZWxldGUodGlsZXNldCk7XG4gIH1cblxuICAvKiogUmV0dXJucyBhIGJpdCBtYXNrIG9mIGVkZ2VzIHRoYXQgX2NvdWxkXyBleGl0OiAxPU4sIDI9VywgND1TLCA4PUUuICovXG4gIGVkZ2VFeGl0cygpOiBudW1iZXIge1xuICAgIGxldCBtYXNrID0gMDtcbiAgICBmb3IgKGNvbnN0IGUgb2YgdGhpcy5kYXRhLmV4aXRzID8/IFtdKSB7XG4gICAgICBjb25zdCBkaXIgPSBlZGdlVHlwZU1hcFtlLnR5cGVdO1xuICAgICAgaWYgKGRpciAhPSBudWxsKSBtYXNrIHw9ICgxIDw8IGRpcik7XG4gICAgfVxuICAgIHJldHVybiBtYXNrO1xuICB9XG5cbiAgZWRnZUluZGV4KGVkZ2VUeXBlOiBzdHJpbmcpOiBudW1iZXJ8dW5kZWZpbmVkIHtcbiAgICBsZXQgaW5kZXggPSAwO1xuICAgIGNvbnN0IGVkZ2UgPSB0aGlzLmRhdGEuZWRnZXMgPz8gJyc7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyBpKyspIHtcbiAgICAgIGlmIChlZGdlW2ldID09PSAnICcpIGNvbnRpbnVlO1xuICAgICAgaWYgKGVkZ2VbaV0gIT09IGVkZ2VUeXBlKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgaW5kZXggfD0gKDEgPDwgaSk7XG4gICAgfVxuICAgIHJldHVybiBpbmRleDtcbiAgfVxuXG4gIGZpbmRFeGl0VHlwZSh0aWxlOiBudW1iZXIsIHNpbmdsZTogYm9vbGVhbixcbiAgICAgICAgICAgICAgIHNlYW1sZXNzOiBib29sZWFuKTogQ29ubmVjdGlvbnx1bmRlZmluZWQge1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmRhdGEuZXhpdHMgPz8gW10pIHtcbiAgICAgIGlmIChleGl0LnR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSAhPT0gc2VhbWxlc3MpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgdDAgPSBzaW5nbGUgJiYgZXhpdC50eXBlID09PSAnZWRnZTpib3R0b20nICYmIHRpbGUgPj0gMHhjMCA/XG4gICAgICAgICAgdGlsZSArIDB4MjAgOiB0aWxlO1xuICAgICAgaWYgKGV4aXQuZXhpdHMuaW5jbHVkZXModDApIHx8IChleGl0LmFsbG93ZWRFeGl0cyA/PyBbXSkuaW5jbHVkZXModDApKSB7XG4gICAgICAgIHJldHVybiBleGl0O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgZmluZEV4aXRCeVR5cGUodHlwZTogQ29ubmVjdGlvblR5cGUpOiBDb25uZWN0aW9uIHtcbiAgICBjb25zdCBleGl0ID0gdGhpcy5kYXRhLmV4aXRzIS5maW5kKGUgPT4gZS50eXBlID09PSB0eXBlKTtcbiAgICBpZiAoIWV4aXQpIHRocm93IG5ldyBFcnJvcihgbm8gZXhpdCAke3R5cGV9YCk7XG4gICAgcmV0dXJuIGV4aXQ7XG4gIH1cblxuICBmaW5kRW50cmFuY2VUeXBlKGNvb3JkOiBudW1iZXIsIHNpbmdsZTogYm9vbGVhbik6IENvbm5lY3Rpb25UeXBlfHVuZGVmaW5lZCB7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZGF0YS5leGl0cyA/PyBbXSkge1xuICAgICAgaWYgKGV4aXQudHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGMwID0gc2luZ2xlICYmIGV4aXQudHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJyAmJiBjb29yZCA+PSAweGJmMDAgP1xuICAgICAgICAgIGNvb3JkICsgMHgyMDAwIDogY29vcmQ7XG4gICAgICBjb25zdCB0MCA9IChjMCAmIDB4ZjApID4+IDQgfCAoYzAgJiAweGYwMDApID4+IDg7XG4gICAgICBpZiAoZXhpdC5lbnRyYW5jZSA9PT0gYzAgfHxcbiAgICAgICAgICBleGl0LmV4aXRzLmluY2x1ZGVzKHQwKSB8fCAoZXhpdC5hbGxvd2VkRXhpdHMgPz8gW10pLmluY2x1ZGVzKHQwKSkge1xuICAgICAgICByZXR1cm4gZXhpdC50eXBlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgYWRkQ3VzdG9tRmxhZyhkZWZhdWx0VmFsdWU6IGJvb2xlYW4pIHtcbiAgICB0aGlzLmZsYWcgPSBkZWZhdWx0VmFsdWUgPyAnY3VzdG9tOnRydWUnIDogJ2N1c3RvbTpmYWxzZSc7XG5cbiAgICAvLyBUT0RPIC0gZm9yIG5vdywgY3VzdG9tIGZsYWdzIGFyZSBzZXQgYnkgZGVmYXVsdC5cblxuICAgIC8vIGlmICghZmxhZ0FsbCkgcmV0dXJuO1xuICAgIC8vIGZvciAoY29uc3QgbG9jIG9mIHRoaXMucm9tLmxvY2F0aW9ucykge1xuICAgIC8vICAgaWYgKCFsb2MudXNlZCkgY29udGludWU7XG4gICAgLy8gICBmb3IgKGNvbnN0IHBvcyBvZiBsb2MubWV0YS5hbGxQb3MoKSkge1xuICAgIC8vICAgICBpZiAobG9jLm1ldGEuZ2V0VWlkKHBvcykgIT09IHRoaXMudWlkKSBjb250aW51ZTtcbiAgICAvLyAgICAgbG9jLm1ldGEuY3VzdG9tRmxhZ3Muc2V0KHBvcywgdGhpcy5yb20uZmxhZ3MuQWx3YXlzVHJ1ZSk7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGlzIGNhbiBuZWlnaGJvciB0aGF0IGluICdkaXInIGRpcmVjdGlvbi5cbiAgICogSWYgZGlyIGlzIDAsIGNoZWNrcyB0aGF0ICd0aGF0JyBpcyBhYm92ZSAndGhpcycuXG4gICAqIElmIGRpciBpcyAxLCBjaGVja3MgdGhhdCAndGhhdCcgaXMgbGVmdCBvZiAndGhpcycuXG4gICAqIElmIGRpciBpcyAyLCBjaGVja3MgdGhhdCAndGhhdCcgaXMgYmVsb3cgJ3RoaXMnLlxuICAgKiBJZiBkaXIgaXMgMywgY2hlY2tzIHRoYXQgJ3RoYXQnIGlzIHJpZ2h0IG9mICd0aGlzJy5cbiAgICovXG4gIGNoZWNrTmVpZ2hib3IodGhhdDogTWV0YXNjcmVlbiwgZGlyOiBudW1iZXIpIHtcbiAgICAvLyBjaGVjazogMCAtPiB0aGF0W3ZlcnRdLmdldCh0aGlzKSAtPiB0aGlzIGlzIHVuZGVyIHRoYXRcbiAgICBjb25zdCBhID0gZGlyICYgMiA/IHRoaXMgOiB0aGF0O1xuICAgIGNvbnN0IGIgPSBkaXIgJiAyID8gdGhhdCA6IHRoaXM7XG4gICAgcmV0dXJuIGEubmVpZ2hib3JzW2RpciAmIDFdLmdldChiKTtcbiAgfVxuXG4gIC8qKiBAcGFyYW0gZGlyIDAgdG8gY2hlY2sgaWYgdGhhdCBpcyB1bmRlciB0aGlzLCAxIGlmIHRoYXQgaXMgcmlnaHQgb2YgdGhpcyAqL1xuICBwcml2YXRlIF9jaGVja05laWdoYm9yKHRoYXQ6IE1ldGFzY3JlZW4sIGRpcjogMHwxKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZTEgPSB0aGlzLmRhdGEuZWRnZXM7XG4gICAgY29uc3QgZTIgPSB0aGF0LmRhdGEuZWRnZXM7XG4gICAgaWYgKGUxICYmIGUyKSB7XG4gICAgICBjb25zdCBvcHAgPSBkaXIgXiAyO1xuICAgICAgaWYgKGUxW29wcF0gIT09ICcqJyAmJiBlMVtvcHBdID09PSBlMltkaXJdKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIGAke2hleDEodGhpcy5zaWQpfSAke3RoaXMubmFtZX1gO1xuICB9XG59XG5cbmNvbnN0IGVkZ2VUeXBlTWFwOiB7W0MgaW4gQ29ubmVjdGlvblR5cGVdPzogbnVtYmVyfSA9IHtcbiAgJ2VkZ2U6dG9wJzogMCxcbiAgJ2VkZ2U6bGVmdCc6IDEsXG4gICdlZGdlOmJvdHRvbSc6IDIsXG4gICdlZGdlOnJpZ2h0JzogMyxcbn07XG5cbmNvbnN0IGNvbm5lY3Rpb25CbG9ja3MgPSBbXG4gICd8OicsIC8vIGJyZWFrIHdhbGwsIGZvcm0gYnJpZGdlLCBidXQgbm8gZmxpZ2h0XG4gICd8Oj0tJywgLy8gbm8gd2FsbHMvYnJpZGdlL2ZsaWdodFxuICAnfCcsIC8vIGZsaWdodCBhbmQgYnJlYWsgd2FsbHNcbiAgJ3w9JywgLy8gZmxpZ2h0IG9ubHlcbl07XG5jb25zdCBjb25uZWN0aW9uQmxvY2tTZXQgPSBuZXcgU2V0KFsnfCcsICc6JywgJy0nLCAnPSddKTtcblxuY29uc3QgbWFudWFsRmVhdHVyZXMgPSBuZXcgU2V0PEZlYXR1cmU+KFtcbiAgJ2FyZW5hJywgJ3BvcnRvYTEnLCAncG9ydG9hMicsICdwb3J0b2EzJywgJ2xha2UnLCAnb3ZlcnBhc3MnLCAndW5kZXJwYXNzJyxcbiAgJ2xpZ2h0aG91c2UnLCAnY2FiaW4nLCAnd2luZG1pbGwnLCAnYWx0YXInLCAncHlyYW1pZCcsICdjcnlwdCcsXG5dKTtcbmNvbnN0IGNvdW50ZWRGZWF0dXJlcyA9IG5ldyBTZXQ8RmVhdHVyZT4oW1xuICAncGl0JywgJ3NwaWtlcycsICdicmlkZ2UnLCAnd2FsbCcsICdyYW1wJywgJ3doaXJscG9vbCcsXG5dKTtcblxuY29uc3QgbWFudWFsRmVhdHVyZU1hc2sgPSBbLi4ubWFudWFsRmVhdHVyZXNdLm1hcChcbiAgICBmID0+IGZlYXR1cmVNYXNrW2ZdIGFzIG51bWJlcikucmVkdWNlKChhLCBiKSA9PiBhIHwgYik7XG5jb25zdCBjb3VudGVkRmVhdHVyZU1hc2sgPSBbLi4uY291bnRlZEZlYXR1cmVzXS5tYXAoXG4gICAgZiA9PiBmZWF0dXJlTWFza1tmXSBhcyBudW1iZXIpLnJlZHVjZSgoYSwgYikgPT4gYSB8IGIpO1xuIl19