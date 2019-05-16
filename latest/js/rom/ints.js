export function uint1(arg) { return (arg & 1); }
export function uint2(arg) { return (arg & 3); }
export function uint3(arg) { return (arg & 7); }
export function uint4(arg) { return (arg & 0xf); }
export function uint5(arg) { return (arg & 0x1f); }
export function uint6(arg) { return (arg & 0x3f); }
export function uint7(arg) { return (arg & 0x7f); }
export function uint8(arg) { return (arg & 0xff); }
export function int8(arg) {
    const x = uint8(arg);
    return (x < 0x80 ? x : x - 0x100);
}
//# sourceMappingURL=ints.js.map