export const FullRomImage = {
    of: (img) => img,
};
export const PrgImage = {
    of: (img) => img.subarray(0x10, 0x40010),
};
export const ChrImage = {
    of: (img) => img.subarray(0x40010),
};
//# sourceMappingURL=romimage.js.map