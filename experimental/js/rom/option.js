export var RomOption;
(function (RomOption) {
    RomOption.bit = (address, bit) => new RomOptionBit(address, bit);
    RomOption.byte = (address) => new RomOptionByte(address);
    RomOption.address = (address) => new RomOptionAddress(address);
})(RomOption || (RomOption = {}));
class RomOptionBit {
    constructor(address, bit) {
        this.address = address;
        this.bit = bit;
    }
    get(rom) {
        return !!(rom[this.address] & (1 << this.bit));
    }
    set(rom, value) {
        const bit = 1 << this.bit;
        if (value) {
            rom[this.address] |= bit;
        }
        else {
            rom[this.address] &= ~bit;
        }
    }
}
class RomOptionByte {
    constructor(address) {
        this.address = address;
    }
    get(rom) {
        return rom[this.address];
    }
    set(rom, value) {
        rom[this.address] = value & 0xff;
    }
}
class RomOptionAddress {
    constructor(address) {
        this.address = address;
    }
    get(rom) {
        return rom[this.address] << 16 |
            rom[this.address + 1] << 8 |
            rom[this.address + 2];
    }
    set(rom, value) {
        rom[this.address] = (value >>> 16) & 0xff;
        rom[this.address + 1] = (value >>> 8) & 0xff;
        rom[this.address + 2] = value & 0xff;
    }
}
//# sourceMappingURL=option.js.map