import { Entity } from './entity.js';
var ShopType;
(function (ShopType) {
    ShopType["TOOL"] = "tool";
    ShopType["ARMOR"] = "armor";
    ShopType["INN"] = "inn";
    ShopType["PAWN"] = "pawn";
})(ShopType || (ShopType = {}));
;
export class Shop extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.used = true;
        this.location = 0;
        this.index = 0;
        this.type = ShopType.TOOL;
    }
}
//# sourceMappingURL=shop.js.map