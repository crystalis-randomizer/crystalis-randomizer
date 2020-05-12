let count = 0;
export class Area {
    constructor() {
        this.name = `Area ${++count}`;
    }
}
export class Overworld extends Area {
    constructor() {
        super(...arguments);
        this.type = 'overworld';
    }
}
export class Town extends Area {
    constructor() {
        super(...arguments);
        this.type = 'town';
    }
}
export class Connector extends Area {
    constructor() {
        super(...arguments);
        this.type = 'connector';
        this.exits = [2, 2];
    }
}
export class Terminal extends Area {
    constructor() {
        super(...arguments);
        this.type = 'terminal';
        this.exits = [1, 1];
    }
}
export var Areas;
(function (Areas) {
    Areas.Unused = new Terminal();
    Areas.ValleyOfWind = new class extends Overworld {
        constructor() {
            super(...arguments);
            this.exits = [3, 6];
        }
    };
    Areas.CordelPlain = new class extends Overworld {
        constructor() {
            super(...arguments);
            this.exits = [5, 8];
        }
    };
    Areas.WaterfallValley = new class extends Overworld {
        constructor() {
            super(...arguments);
            this.exits = [6, 6];
        }
    };
    Areas.AngrySea = new class extends Overworld {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.GoaValley = new class extends Overworld {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.Desert1 = new class extends Overworld {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.Desert2 = new class extends Overworld {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.Leaf = new class extends Town {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.Brynmaer = new class extends Town {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.Oak = new class extends Town {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.Amazones = new class extends Town {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.Nadare = new class extends Town {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.Portoa = new class extends Town {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.Joel = new class extends Town {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.ZombieTown = new class extends Town {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.Swan = new class extends Town {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.Shyron = new class extends Town {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.Goa = new class extends Town {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.Sahara = new class extends Town {
        constructor() {
            super(...arguments);
            this.exits = [0, 0];
        }
    };
    Areas.WindmillCave = new class extends Connector {
    };
    Areas.SealedCave = new class extends Connector {
    };
    Areas.ZebuCave = new class extends Connector {
    };
    Areas.MtSabreWest = new class extends Connector {
    };
    Areas.MtSabreNorth = new class extends Connector {
    };
    Areas.LimeTreeValley = new class extends Connector {
    };
    Areas.PortoaPalace = new class extends Connector {
    };
    Areas.FishermanHouse = new class extends Connector {
    };
    Areas.UndergroundChannel = new class extends Connector {
    };
    Areas.JoelPassage = new class extends Connector {
    };
    Areas.EvilSpiritIslandEntrance = new class extends Connector {
    };
    Areas.EvilSpiritIsland = new class extends Connector {
    };
    Areas.KirisaPlantCave = new class extends Connector {
    };
    Areas.SwanGate = new class extends Connector {
    };
    Areas.MtHydra = new class extends Connector {
    };
    Areas.GoaFortress = new class extends Connector {
    };
    Areas.OasisEntrance = new class extends Connector {
    };
    Areas.OasisCave = new class extends Connector {
    };
    Areas.DesertCave1 = new class extends Connector {
    };
    Areas.SaharaMeadow = new class extends Connector {
    };
    Areas.DesertCave2 = new class extends Connector {
    };
    Areas.EastCave = new class extends Connector {
    };
    Areas.Swamp = new class extends Connector {
    };
    Areas.Mezame = new class extends Terminal {
    };
    Areas.Windmill = new class extends Terminal {
    };
    Areas.StomHouse = new class extends Terminal {
    };
    Areas.WaterfallCave = new class extends Terminal {
    };
    Areas.KirisaMeadow = new class extends Terminal {
    };
    Areas.FogLampCave = new class extends Terminal {
    };
    Areas.LimeTreeLake = new class extends Terminal {
    };
    Areas.Lighthouse = new class extends Terminal {
    };
    Areas.SaberaFortress = new class extends Terminal {
    };
    Areas.ShyronTemple = new class extends Terminal {
    };
    Areas.Styx = new class extends Terminal {
    };
    Areas.FortressBasement = new class extends Terminal {
    };
    Areas.Pyramid = new class extends Terminal {
    };
    Areas.Crypt = new Terminal();
    Areas.Tower = new Terminal();
})(Areas || (Areas = {}));
function capitalize(key) {
    return key.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace('Of', 'of');
}
for (const [key, area] of Object.entries(Areas)) {
    area.name = capitalize(key);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJlYS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9yb20vYXJlYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFhQSxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7QUFNZCxNQUFNLE9BQWdCLElBQUk7SUFBMUI7UUFDVyxTQUFJLEdBQUcsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDO0lBSXBDLENBQUM7Q0FBQTtBQUVELE1BQU0sT0FBZ0IsU0FBVSxTQUFRLElBQUk7SUFBNUM7O1FBQ0UsU0FBSSxHQUFHLFdBQW9CLENBQUM7SUFDOUIsQ0FBQztDQUFBO0FBRUQsTUFBTSxPQUFnQixJQUFLLFNBQVEsSUFBSTtJQUF2Qzs7UUFDRSxTQUFJLEdBQUcsTUFBZSxDQUFDO0lBQ3pCLENBQUM7Q0FBQTtBQUVELE1BQU0sT0FBTyxTQUFVLFNBQVEsSUFBSTtJQUFuQzs7UUFDRSxTQUFJLEdBQUcsV0FBb0IsQ0FBQztRQUM1QixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7SUFDMUIsQ0FBQztDQUFBO0FBRUQsTUFBTSxPQUFPLFFBQVMsU0FBUSxJQUFJO0lBQWxDOztRQUNFLFNBQUksR0FBRyxVQUFtQixDQUFDO1FBQzNCLFVBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQVUsQ0FBQztJQUMxQixDQUFDO0NBQUE7QUFHRCxNQUFNLEtBQVcsS0FBSyxDQTRHckI7QUE1R0QsV0FBaUIsS0FBSztJQUNQLFlBQU0sR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO0lBRXhCLGtCQUFZLEdBQUcsSUFBSSxLQUFNLFNBQVEsU0FBUztRQUF2Qjs7WUFDOUIsVUFBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBVSxDQUFDO1FBQzFCLENBQUM7S0FBQSxDQUFDO0lBQ1csaUJBQVcsR0FBRyxJQUFJLEtBQU0sU0FBUSxTQUFTO1FBQXZCOztZQUM3QixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7UUFDMUIsQ0FBQztLQUFBLENBQUM7SUFDVyxxQkFBZSxHQUFHLElBQUksS0FBTSxTQUFRLFNBQVM7UUFBdkI7O1lBQ2pDLFVBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQVUsQ0FBQztRQUMxQixDQUFDO0tBQUEsQ0FBQztJQUNXLGNBQVEsR0FBRyxJQUFJLEtBQU0sU0FBUSxTQUFTO1FBQXZCOztZQUMxQixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7UUFDMUIsQ0FBQztLQUFBLENBQUM7SUFDVyxlQUFTLEdBQUcsSUFBSSxLQUFNLFNBQVEsU0FBUztRQUF2Qjs7WUFDM0IsVUFBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBVSxDQUFDO1FBQzFCLENBQUM7S0FBQSxDQUFDO0lBQ1csYUFBTyxHQUFHLElBQUksS0FBTSxTQUFRLFNBQVM7UUFBdkI7O1lBQ3pCLFVBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQVUsQ0FBQztRQUMxQixDQUFDO0tBQUEsQ0FBQztJQUNXLGFBQU8sR0FBRyxJQUFJLEtBQU0sU0FBUSxTQUFTO1FBQXZCOztZQUN6QixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7UUFDMUIsQ0FBQztLQUFBLENBQUM7SUFHVyxVQUFJLEdBQUcsSUFBSSxLQUFNLFNBQVEsSUFBSTtRQUFsQjs7WUFDdEIsVUFBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBVSxDQUFDO1FBQzFCLENBQUM7S0FBQSxDQUFDO0lBQ1csY0FBUSxHQUFHLElBQUksS0FBTSxTQUFRLElBQUk7UUFBbEI7O1lBQzFCLFVBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQVUsQ0FBQztRQUMxQixDQUFDO0tBQUEsQ0FBQztJQUNXLFNBQUcsR0FBRyxJQUFJLEtBQU0sU0FBUSxJQUFJO1FBQWxCOztZQUNyQixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7UUFDMUIsQ0FBQztLQUFBLENBQUM7SUFDVyxjQUFRLEdBQUcsSUFBSSxLQUFNLFNBQVEsSUFBSTtRQUFsQjs7WUFDMUIsVUFBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBVSxDQUFDO1FBQzFCLENBQUM7S0FBQSxDQUFDO0lBQ1csWUFBTSxHQUFHLElBQUksS0FBTSxTQUFRLElBQUk7UUFBbEI7O1lBRXhCLFVBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQVUsQ0FBQztRQUMxQixDQUFDO0tBQUEsQ0FBQztJQUNXLFlBQU0sR0FBRyxJQUFJLEtBQU0sU0FBUSxJQUFJO1FBQWxCOztZQUN4QixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7UUFDMUIsQ0FBQztLQUFBLENBQUM7SUFDVyxVQUFJLEdBQUcsSUFBSSxLQUFNLFNBQVEsSUFBSTtRQUFsQjs7WUFDdEIsVUFBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBVSxDQUFDO1FBQzFCLENBQUM7S0FBQSxDQUFDO0lBQ1csZ0JBQVUsR0FBRyxJQUFJLEtBQU0sU0FBUSxJQUFJO1FBQWxCOztZQUM1QixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7UUFDMUIsQ0FBQztLQUFBLENBQUM7SUFDVyxVQUFJLEdBQUcsSUFBSSxLQUFNLFNBQVEsSUFBSTtRQUFsQjs7WUFDdEIsVUFBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBVSxDQUFDO1FBQzFCLENBQUM7S0FBQSxDQUFDO0lBQ1csWUFBTSxHQUFHLElBQUksS0FBTSxTQUFRLElBQUk7UUFBbEI7O1lBQ3hCLFVBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQVUsQ0FBQztRQUMxQixDQUFDO0tBQUEsQ0FBQztJQUNXLFNBQUcsR0FBRyxJQUFJLEtBQU0sU0FBUSxJQUFJO1FBQWxCOztZQUNyQixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7UUFDMUIsQ0FBQztLQUFBLENBQUM7SUFDVyxZQUFNLEdBQUcsSUFBSSxL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QUUsQ0FBQztJQUN2QixXQUFLLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQztBQUN0QyxDQUFDLEVBNUdnQixLQUFLLEtBQUwsS0FBSyxRQTRHckI7QUFFRCxTQUFTLFVBQVUsQ0FBQyxHQUFXO0lBQzdCLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3hFLENBQUM7QUFHRCxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtJQUM5QyxJQUF1QixDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDakQiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBBYnN0cmFjdGlvbiBmb3IgYSBjb2hlcmVudCBcImFyZWFcIiwgdXNlZCBmb3IgZ3JvdXBpbmcgdG9nZXRoZXJcbi8vIGxvY2F0aW9ucyBmb3IgKGUuZy4pIG11c2ljIGFuZCBwYWxldHRlIHNodWZmbGUsIG9yIG92ZXJ3b3JsZFxuLy8gc2h1ZmZsZS5cblxuLy8gY29uc3QgYXJlYSA9IGluaXRpYWxpemVyPHJlYWRvbmx5IFtBcmVhT3B0aW9ucz9dLCBBcmVhPigpO1xuLy8gaW50ZXJmYWNlIEFyZWFPcHRpb25zIHtcbi8vICAgLy8gZG9lcyBleGl0IGluZm9ybWF0aW9uIGdvIGhlcmU/IT8gb3IgaW4gYXJlYXNodWZmbGUudHM/XG4vLyAgIC8vICAtIG5lZWRzIHJlcGV0aXRpb24gb2YgYWxsIGVsZW1lbnRzIGluIHRoYXQgY2FzZT9cbi8vICAgLy8gIC0gYW5kIGl0J3Mgbm90IGFuIGVudW0gc28gaXQncyBoYXJkZXIgdG8gZG8gKHRob3VnaCBub3QgaW1wb3NzaWJsZSkuXG4vLyAgIHR5cGU/OiAnb3ZlcndvcmxkJ3wnY29ubmVjdG9yJ3wndG93bid8J3Rlcm1pbmFsJztcbi8vIH1cblxuLy8gVXNlZCBmb3IgYXV0by1nZW5lcmF0ZWQgbmFtZXMsIGJ1dCB3ZSdsbCByZXBsYWNlIHRoZW0gYW55d2F5LlxubGV0IGNvdW50ID0gMDtcblxuLy8gVE9ETyAtIGlzIHRoZXJlIGFueSB2YWx1ZSBpbiBtdXRhdGluZyBhcmVhcyBkaXJlY3RseT9cbi8vICAgICAgICB3ZSBjYW4gYWx3YXlzIGp1c3QgY29uc3VsdCB0aGUgcm9tIGlmIHdlIG5lZWQgc29tZXRoaW5nP1xuLy8gICAgICAgIHdlIGNvdWxkIGFsc28gZXZlbiBtYWtlIGFjY2Vzc29ycywgV2Vha01hcDxSb20sIC4uLj4sIGV0Yz9cbi8vICAgICAgICAgLSB0aG91Z2ggdGhhdCBicmVha3MgZW5jYXBzdWxhdGlvbiBwcmV0dHkgYmFkbHkgLSBubyB3YXkgdG8gY2xvbmUuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXJlYSB7XG4gIHJlYWRvbmx5IG5hbWUgPSBgQXJlYSAkeysrY291bnR9YDtcbiAgLyoqIE1pbmltdW0gYW5kIG1heGltdW0gbnVtYmVyIG9mIGV4aXRzPyAqL1xuICByZWFkb25seSBhYnN0cmFjdCBleGl0czogcmVhZG9ubHkgW251bWJlciwgbnVtYmVyXTtcbiAgcmVhZG9ubHkgYWJzdHJhY3QgdHlwZTogJ292ZXJ3b3JsZCcgfCAndG93bicgfCAnY29ubmVjdG9yJyB8ICd0ZXJtaW5hbCc7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBPdmVyd29ybGQgZXh0ZW5kcyBBcmVhIHtcbiAgdHlwZSA9ICdvdmVyd29ybGQnIGFzIGNvbnN0O1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgVG93biBleHRlbmRzIEFyZWEge1xuICB0eXBlID0gJ3Rvd24nIGFzIGNvbnN0O1xufVxuXG5leHBvcnQgY2xhc3MgQ29ubmVjdG9yIGV4dGVuZHMgQXJlYSB7XG4gIHR5cGUgPSAnY29ubmVjdG9yJyBhcyBjb25zdDtcbiAgZXhpdHMgPSBbMiwgMl0gYXMgY29uc3Q7XG59XG5cbmV4cG9ydCBjbGFzcyBUZXJtaW5hbCBleHRlbmRzIEFyZWEge1xuICB0eXBlID0gJ3Rlcm1pbmFsJyBhcyBjb25zdDtcbiAgZXhpdHMgPSBbMSwgMV0gYXMgY29uc3Q7XG59XG5cbi8vIEV4cG9ydCBhbiBlbnVtIHNvIHRoYXQgd2UgY2FuIGF0IGxlYXN0IHJlZmVyIHRvIHRoZXNlIHN0YXRpY2FsbHkuXG5leHBvcnQgbmFtZXNwYWNlIEFyZWFzIHtcbiAgZXhwb3J0IGNvbnN0IFVudXNlZCA9IG5ldyBUZXJtaW5hbCgpO1xuICAvLyBPdmVyd29ybGQgYXJlYXM6IHRoZXNlIGFyZSB0aGUgXCJodWJzXCIuXG4gIGV4cG9ydCBjb25zdCBWYWxsZXlPZldpbmQgPSBuZXcgY2xhc3MgZXh0ZW5kcyBPdmVyd29ybGQge1xuICAgIGV4aXRzID0gWzMsIDZdIGFzIGNvbnN0O1xuICB9O1xuICBleHBvcnQgY29uc3QgQ29yZGVsUGxhaW4gPSBuZXcgY2xhc3MgZXh0ZW5kcyBPdmVyd29ybGQge1xuICAgIGV4aXRzID0gWzUsIDhdIGFzIGNvbnN0O1xuICB9O1xuICBleHBvcnQgY29uc3QgV2F0ZXJmYWxsVmFsbGV5ID0gbmV3IGNsYXNzIGV4dGVuZHMgT3ZlcndvcmxkIHtcbiAgICBleGl0cyA9IFs2LCA2XSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IEFuZ3J5U2VhID0gbmV3IGNsYXNzIGV4dGVuZHMgT3ZlcndvcmxkIHtcbiAgICBleGl0cyA9IFswLCAwXSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IEdvYVZhbGxleSA9IG5ldyBjbGFzcyBleHRlbmRzIE92ZXJ3b3JsZCB7XG4gICAgZXhpdHMgPSBbMCwgMF0gYXMgY29uc3Q7XG4gIH07XG4gIGV4cG9ydCBjb25zdCBEZXNlcnQxID0gbmV3IGNsYXNzIGV4dGVuZHMgT3ZlcndvcmxkIHtcbiAgICBleGl0cyA9IFswLCAwXSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IERlc2VydDIgPSBuZXcgY2xhc3MgZXh0ZW5kcyBPdmVyd29ybGQge1xuICAgIGV4aXRzID0gWzAsIDBdIGFzIGNvbnN0O1xuICB9O1xuXG4gIC8vIFRvd25zLCB3aGljaCBtYXkgYmUgdGVybWluYWwgb3Igbm90LlxuICBleHBvcnQgY29uc3QgTGVhZiA9IG5ldyBjbGFzcyBleHRlbmRzIFRvd24ge1xuICAgIGV4aXRzID0gWzAsIDBdIGFzIGNvbnN0O1xuICB9O1xuICBleHBvcnQgY29uc3QgQnJ5bm1hZXIgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUb3duIHtcbiAgICBleGl0cyA9IFswLCAwXSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IE9hayA9IG5ldyBjbGFzcyBleHRlbmRzIFRvd24ge1xuICAgIGV4aXRzID0gWzAsIDBdIGFzIGNvbnN0O1xuICB9O1xuICBleHBvcnQgY29uc3QgQW1hem9uZXMgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUb3duIHtcbiAgICBleGl0cyA9IFswLCAwXSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IE5hZGFyZSA9IG5ldyBjbGFzcyBleHRlbmRzIFRvd24ge1xuICAgIC8vIFRPRE8gLSB0aWUgdGhpcyB0byBzYWJyZSBub3J0aD8/Pz9cbiAgICBleGl0cyA9IFswLCAwXSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IFBvcnRvYSA9IG5ldyBjbGFzcyBleHRlbmRzIFRvd24ge1xuICAgIGV4aXRzID0gWzAsIDBdIGFzIGNvbnN0O1xuICB9O1xuICBleHBvcnQgY29uc3QgSm9lbCA9IG5ldyBjbGFzcyBleHRlbmRzIFRvd24ge1xuICAgIGV4aXRzID0gWzAsIDBdIGFzIGNvbnN0O1xuICB9O1xuICBleHBvcnQgY29uc3QgWm9tYmllVG93biA9IG5ldyBjbGFzcyBleHRlbmRzIFRvd24ge1xuICAgIGV4aXRzID0gWzAsIDBdIGFzIGNvbnN0O1xuICB9O1xuICBleHBvcnQgY29uc3QgU3dhbiA9IG5ldyBjbGFzcyBleHRlbmRzIFRvd24ge1xuICAgIGV4aXRzID0gWzAsIDBdIGFzIGNvbnN0O1xuICB9O1xuICBleHBvcnQgY29uc3QgU2h5cm9uID0gbmV3IGNsYXNzIGV4dGVuZHMgVG93biB7XG4gICAgZXhpdHMgPSBbMCwgMF0gYXMgY29uc3Q7XG4gIH07XG4gIGV4cG9ydCBjb25zdCBHb2EgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUb3duIHtcbiAgICBleGl0cyA9IFswLCAwXSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IFNhaGFyYSA9IG5ldyBjbGFzcyBleHRlbmRzIFRvd24ge1xuICAgIGV4aXRzID0gWzAsIDBdIGFzIGNvbnN0O1xuICB9O1xuXG4gIC8vIENvbm5lY3RvcnMuXG4gIGV4cG9ydCBjb25zdCBXaW5kbWlsbENhdmUgPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307XG4gIGV4cG9ydCBjb25zdCBTZWFsZWRDYXZlID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuICBleHBvcnQgY29uc3QgWmVidUNhdmUgPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307XG4gIGV4cG9ydCBjb25zdCBNdFNhYnJlV2VzdCA9IG5ldyBjbGFzcyBleHRlbmRzIENvbm5lY3RvciB7fTtcbiAgZXhwb3J0IGNvbnN0IE10U2FicmVOb3J0aCA9IG5ldyBjbGFzcyBleHRlbmRzIENvbm5lY3RvciB7fTtcbiAgZXhwb3J0IGNvbnN0IExpbWVUcmVlVmFsbGV5ID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuICBleHBvcnQgY29uc3QgUG9ydG9hUGFsYWNlID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuICBleHBvcnQgY29uc3QgRmlzaGVybWFuSG91c2UgPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307IC8vIGluY2x1ZGVzIG5ldyBiZWFjaFxuICBleHBvcnQgY29uc3QgVW5kZXJncm91bmRDaGFubmVsID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuICBleHBvcnQgY29uc3QgSm9lbFBhc3NhZ2UgPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307XG4gIGV4cG9ydCBjb25zdCBFdmlsU3Bpcml0SXNsYW5kRW50cmFuY2UgPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307XG4gIGV4cG9ydCBjb25zdCBFdmlsU3Bpcml0SXNsYW5kID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9OyAvLyBtYWluIGNhdmVcbiAgZXhwb3J0IGNvbnN0IEtpcmlzYVBsYW50Q2F2ZSA9IG5ldyBjbGFzcyBleHRlbmRzIENvbm5lY3RvciB7fTtcbiAgZXhwb3J0IGNvbnN0IFN3YW5HYXRlID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuICBleHBvcnQgY29uc3QgTXRIeWRyYSA9IG5ldyBjbGFzcyBleHRlbmRzIENvbm5lY3RvciB7fTsgLy8gMy13YXlcbiAgLy8gVE9ETyAtIHN0aXRjaCBuZWlnaGJvcmluZyBtdXNpYy9wYWxldHRlIGFyIHNhZ2VzP1xuICBleHBvcnQgY29uc3QgR29hRm9ydHJlc3MgPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307XG4gIGV4cG9ydCBjb25zdCBPYXNpc0VudHJhbmNlID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuICBleHBvcnQgY29uc3QgT2FzaXNDYXZlID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuICBleHBvcnQgY29uc3QgRGVzZXJ0Q2F2ZTEgPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307XG4gIGV4cG9ydCBjb25zdCBTYWhhcmFNZWFkb3cgPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307XG4gIGV4cG9ydCBjb25zdCBEZXNlcnRDYXZlMiA9IG5ldyBjbGFzcyBleHRlbmRzIENvbm5lY3RvciB7fTtcblxuICAvLyBNYXliZSBjb25uZWN0b3JzXG4gIGV4cG9ydCBjb25zdCBFYXN0Q2F2ZSA9IG5ldyBjbGFzcyBleHRlbmRzIENvbm5lY3RvciB7fTsgLy8gbmV3IG1hcFxuICBleHBvcnQgY29uc3QgU3dhbXAgPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307XG5cbiAgLy8gVGVybWluYWxzLlxuICBleHBvcnQgY29uc3QgTWV6YW1lID0gbmV3IGNsYXNzIGV4dGVuZHMgVGVybWluYWwge307IC8vIGluY2x1ZGVzIG1hcHMgMCBhbmQgMVxuICBleHBvcnQgY29uc3QgV2luZG1pbGwgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUZXJtaW5hbCB7fTsgLy8gaW5jdWRlcyBwYXJ0IG9mIHdpbmQgdmFsbGV5XG4gIGV4cG9ydCBjb25zdCBTdG9tSG91c2UgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUZXJtaW5hbCB7fTtcbiAgZXhwb3J0IGNvbnN0IFdhdGVyZmFsbENhdmUgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUZXJtaW5hbCB7fTtcbiAgZXhwb3J0IGNvbnN0IEtpcmlzYU1lYWRvdyA9IG5ldyBjbGFzcyBleHRlbmRzIFRlcm1pbmFsIHt9O1xuICBleHBvcnQgY29uc3QgRm9nTGFtcENhdmUgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUZXJtaW5hbCB7fTtcbiAgZXhwb3J0IGNvbnN0IExpbWVUcmVlTGFrZSA9IG5ldyBjbGFzcyBleHRlbmRzIFRlcm1pbmFsIHt9OyAvLyBpbmNsdWRlcyBtZXNpYSBzaHJpbmVcbiAgZXhwb3J0IGNvbnN0IExpZ2h0aG91c2UgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUZXJtaW5hbCB7fTsgLy8gaW5jbHVkZXMgaW1tZWRpYXRlIG91dHNpZGVcbiAgZXhwb3J0IGNvbnN0IFNhYmVyYUZvcnRyZXNzID0gbmV3IGNsYXNzIGV4dGVuZHMgVGVybWluYWwge307XG4gIGV4cG9ydCBjb25zdCBTaHlyb25UZW1wbGUgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUZXJtaW5hbCB7fTtcbiAgZXhwb3J0IGNvbnN0IFN0eXggPSBuZXcgY2xhc3MgZXh0ZW5kcyBUZXJtaW5hbCB7fTtcbiAgZXhwb3J0IGNvbnN0IEZvcnRyZXNzQmFzZW1lbnQgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUZXJtaW5hbCB7fTtcbiAgZXhwb3J0IGNvbnN0IFB5cmFtaWQgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUZXJtaW5hbCB7fTtcbiAgZXhwb3J0IGNvbnN0IENyeXB0ID0gbmV3IFRlcm1pbmFsKCk7XG4gIGV4cG9ydCBjb25zdCBUb3dlciA9IG5ldyBUZXJtaW5hbCgpO1xufVxuXG5mdW5jdGlvbiBjYXBpdGFsaXplKGtleTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGtleS5yZXBsYWNlKC8oW2Etel0pKFtBLVowLTldKS9nLCAnJDEgJDInKS5yZXBsYWNlKCdPZicsICdvZicpO1xufVxuXG4vLyBGaXggdGhlIG5hbWVzXG5mb3IgKGNvbnN0IFtrZXksIGFyZWFdIG9mIE9iamVjdC5lbnRyaWVzKEFyZWFzKSkge1xuICAoYXJlYSBhcyB7bmFtZTogc3RyaW5nfSkubmFtZSA9IGNhcGl0YWxpemUoa2V5KTtcbn1cbiJdfQ==