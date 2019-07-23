import { Entity } from './entity.js';
import { seq, tuple } from './util.js';
export class Tileset extends Entity {
    constructor(rom, id) {
        super(rom, id);
        const map = id & 0x3f;
        this.tileBase = 0x10000 | map << 8;
        this.attrBase = 0x13000 | map << 4;
        this.alternatesBase = 0x13e00 | map << 3;
        this.tiles = seq(4, q => tuple(rom.prg, this.tileBase | q << 8, 256));
        this.attrs = seq(256, i => rom.prg[this.attrBase | i >> 2] >> ((i & 3) << 1) & 3);
        this.alternates = tuple(rom.prg, this.alternatesBase, 32);
    }
    write(writer) {
        for (let i = 0; i < 0x100; i++) {
            if (i < 0x20) {
                writer.rom[this.alternatesBase + i] = this.alternates[i];
            }
            for (let j = 0; j < 4; j++) {
                writer.rom[this.tileBase + (j << 8) + i] = this.tiles[j][i];
            }
        }
        for (let i = 0; i < 0x40; i++) {
            const j = i << 2;
            writer.rom[this.attrBase + i] =
                (this.attrs[j] & 3) | (this.attrs[j + 1] & 3) << 2 |
                    (this.attrs[j + 2] & 3) << 4 | (this.attrs[j + 3] & 3) << 6;
        }
    }
    effects() {
        let index = (this.id >>> 2) & 0xf;
        if (this.id === 0xa8)
            index = 2;
        if (this.id === 0xac)
            index--;
        return this.rom.tileEffects[index];
    }
}
function paletteTypes(tileset, location) {
    switch (location) {
        case 0x57:
            return ['main', '', 'out'];
        case 0x64:
        case 0x68:
            return ['main', '', 'out'];
    }
    switch (tileset) {
        case 0x80: return ['main', 'out', 'trim'];
        case 0x84: return ['main', 'main', 'trim'];
        case 0x88:
            return ['main', 'trim', ''];
        case 0x8c: return ['main', 'trim', 'accept???'];
    }
    return ['', '', ''];
}
const ALLOWED_PALETTES = new Map([
    ['path', [...r(0x00, 0x12), ...r(0x15, 0x1b), ...r(0x1e, 0x25),
            ...r(0x26, 0x2b), ...r(0x2c, 0x30), ...r(0x39, 0x3f),
            0x42, ...r(0x44, 0x48), ...r(0x4d, 0x59), ...r(0x80, 0x84),
            0x87, ...r(0x8b, 0x93)]],
    ['mountain', [0x01, ...r(0x03, 0x07), ...r(0x08, 0x0b), 0x0c, 0x0d, 0x0e,
            ...r(0x11, 0x18), 0x19, 0x1a, 0x1c, 0x1d, 0x1e, 0x20, 0x21,
            0x23, 0x27, 0x2a, 0x2b, 0x2f, 0x31, 0x33, 0x36, 0x37, 0x38,
            0x39, 0x3c, 0x42, 0x44, 0x46, 0x4b, 0x4c, 0x4f, 0x53, 0x58,
            ...r(0x80, 0x85), 0x87, 0x88, 0x8b, 0x8e]],
    ['trees', [0x01, 0x02, 0x04, 0x06, ...r(0x07, 0x0f), ...r(0x14, 0x18),
            0x1a, 0x1c, 0x1e, 0x20, 0x23, 0x27, 0x29, 0x2a, 0x2b, 0x2e,
            0x2f, 0x31, 0x33, 0x37, 0x38, 0x39, 0x3c, 0x3d, 0x43, 0x44,
            0x46, 0x49, 0x4a, 0x4b, 0x4f, 0x52, 0x57, 0x6e,
            ...r(0x80, 0x85), 0x87, 0x88, ...r(0x8b, 0x90)]],
]);
const TERRAIN_BY_PALETTE = new Map([
    [0x80, ['path', 'mountain', 'trees']],
    [0x84, ['mountain-path', 'brick', 'trees']],
    [0x88, ['cave wall/ground', 'cave bridge', '']],
    [0x8c, ['floor', 'fire', 'accept']],
    [0x90, ['trees', 'mountain', 'grass']],
    [0x94, ['water/ground', 'mountain', 'shallows']],
    [0x98, ['door', 'room', 'rocks']],
    [0x9c, ['mountain/ground', 'trees', 'desert']],
    [0xa0, ['ground', 'trees', 'some haze']],
    [0xa4, ['', '', '']],
    [0xa8, ['', '', '']],
    [0xac, ['', '', '']],
]);
function r(a, b) {
    return new Array(b - a).fill(0).map((_x, i) => i + a);
}
const [] = [TERRAIN_BY_PALETTE, ALLOWED_PALETTES, paletteTypes];
//# sourceMappingURL=tileset.js.map