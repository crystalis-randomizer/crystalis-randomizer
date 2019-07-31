export class Spoiler {
    constructor(rom) {
        this.rom = rom;
        this.slots = [];
        this.route = [];
        this.slotNames = [];
        this.conditionNames = {};
    }
    addCondition(condition, name) {
        this.conditionNames[condition] = name;
    }
    addCheck(condition, deps, item) {
        this.route.push(new Check(this, condition, deps, item));
    }
    addSlot(slot, slotName, item) {
        this.slots[slot] = new Slot(this.rom, slot, slotName, item);
        if (slotName)
            this.slotNames[0x200 | slot] = slotName;
    }
    formatCondition(id, item) {
        if (id < 0x200 || id >= 0x280)
            return this.conditionNames[id] || conditionHex(id);
        if (item == null)
            return slotToItem(this.rom, id & 0xff);
        return `${this.slotNames[id] || conditionHex(id)} (${this.formatCondition(item | 0x200)})`;
    }
}
class Check {
    constructor(spoiler, condition, deps, item) {
        this.spoiler = spoiler;
        this.condition = condition;
        this.deps = deps;
        this.item = item;
    }
    toString() {
        return `${this.spoiler.formatCondition(this.condition, this.item)}: [${this.deps.map(d => this.spoiler.formatCondition(d)).join(', ')}]`;
    }
}
function conditionHex(id) {
    return id < 0 ? '~' + ~id.toString(16).padStart(2, '0') : id.toString(16).padStart(3, '0');
}
class Slot {
    constructor(rom, slot, slotName, item) {
        this.slot = slot;
        this.slotName = slotName;
        this.item = item;
        this.itemName = slotToItem(rom, item);
        this.originalItem = slotToItem(rom, slot);
    }
    toString() {
        return `${this.itemName}: ${this.slotName} (${this.originalItem})`;
    }
}
function slotToItem(rom, slot) {
    if (slot >= 0x70)
        return 'Mimic';
    return rom.items[rom.itemGets[slot].itemId].messageName;
}
//# sourceMappingURL=spoiler.js.map