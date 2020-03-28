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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJlYS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9yb20vYXJlYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFhQSxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7QUFNZCxNQUFNLE9BQWdCLElBQUk7SUFBMUI7UUFDVyxTQUFJLEdBQUcsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDO0lBR3BDLENBQUM7Q0FBQTtBQUVELE1BQU0sT0FBZ0IsU0FBVSxTQUFRLElBQUk7SUFBNUM7O1FBQ0UsU0FBSSxHQUFHLFdBQW9CLENBQUM7SUFDOUIsQ0FBQztDQUFBO0FBRUQsTUFBTSxPQUFnQixJQUFLLFNBQVEsSUFBSTtJQUF2Qzs7UUFDRSxTQUFJLEdBQUcsTUFBZSxDQUFDO0lBQ3pCLENBQUM7Q0FBQTtBQUVELE1BQU0sT0FBTyxTQUFVLFNBQVEsSUFBSTtJQUFuQzs7UUFDRSxTQUFJLEdBQUcsV0FBb0IsQ0FBQztRQUM1QixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7SUFDMUIsQ0FBQztDQUFBO0FBRUQsTUFBTSxPQUFPLFFBQVMsU0FBUSxJQUFJO0lBQWxDOztRQUNFLFNBQUksR0FBRyxVQUFtQixDQUFDO1FBQzNCLFVBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQVUsQ0FBQztJQUMxQixDQUFDO0NBQUE7QUFHRCxNQUFNLEtBQVcsS0FBSyxDQTRHckI7QUE1R0QsV0FBaUIsS0FBSztJQUNQLFlBQU0sR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO0lBRXhCLGtCQUFZLEdBQUcsSUFBSSxLQUFNLFNBQVEsU0FBUztRQUF2Qjs7WUFDOUIsVUFBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBVSxDQUFDO1FBQzFCLENBQUM7S0FBQSxDQUFDO0lBQ1csaUJBQVcsR0FBRyxJQUFJLEtBQU0sU0FBUSxTQUFTO1FBQXZCOztZQUM3QixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7UUFDMUIsQ0FBQztLQUFBLENBQUM7SUFDVyxxQkFBZSxHQUFHLElBQUksS0FBTSxTQUFRLFNBQVM7UUFBdkI7O1lBQ2pDLFVBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQVUsQ0FBQztRQUMxQixDQUFDO0tBQUEsQ0FBQztJQUNXLGNBQVEsR0FBRyxJQUFJLEtBQU0sU0FBUSxTQUFTO1FBQXZCOztZQUMxQixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7UUFDMUIsQ0FBQztLQUFBLENBQUM7SUFDVyxlQUFTLEdBQUcsSUFBSSxLQUFNLFNBQVEsU0FBUztRQUF2Qjs7WUFDM0IsVUFBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBVSxDQUFDO1FBQzFCLENBQUM7S0FBQSxDQUFDO0lBQ1csYUFBTyxHQUFHLElBQUksS0FBTSxTQUFRLFNBQVM7UUFBdkI7O1lBQ3pCLFVBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQVUsQ0FBQztRQUMxQixDQUFDO0tBQUEsQ0FBQztJQUNXLGFBQU8sR0FBRyxJQUFJLEtBQU0sU0FBUSxTQUFTO1FBQXZCOztZQUN6QixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7UUFDMUIsQ0FBQztLQUFBLENBQUM7SUFHVyxVQUFJLEdBQUcsSUFBSSxLQUFNLFNBQVEsSUFBSTtRQUFsQjs7WUFDdEIsVUFBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBVSxDQUFDO1FBQzFCLENBQUM7S0FBQSxDQUFDO0lBQ1csY0FBUSxHQUFHLElBQUksS0FBTSxTQUFRLElBQUk7UUFBbEI7O1lBQzFCLFVBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQVUsQ0FBQztRQUMxQixDQUFDO0tBQUEsQ0FBQztJQUNXLFNBQUcsR0FBRyxJQUFJLEtBQU0sU0FBUSxJQUFJO1FBQWxCOztZQUNyQixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7UUFDMUIsQ0FBQztLQUFBLENBQUM7SUFDVyxjQUFRLEdBQUcsSUFBSSxLQUFNLFNBQVEsSUFBSTtRQUFsQjs7WUFDMUIsVUFBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBVSxDQUFDO1FBQzFCLENBQUM7S0FBQSxDQUFDO0lBQ1csWUFBTSxHQUFHLElBQUksS0FBTSxTQUFRLElBQUk7UUFBbEI7O1lBRXhCLFVBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQVUsQ0FBQztRQUMxQixDQUFDO0tBQUEsQ0FBQztJQUNXLFlBQU0sR0FBRyxJQUFJLEtBQU0sU0FBUSxJQUFJO1FBQWxCOztZQUN4QixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7UUFDMUIsQ0FBQztLQUFBLENBQUM7SUFDVyxVQUFJLEdBQUcsSUFBSSxLQUFNLFNBQVEsSUFBSTtRQUFsQjs7WUFDdEIsVUFBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBVSxDQUFDO1FBQzFCLENBQUM7S0FBQSxDQUFDO0lBQ1csZ0JBQVUsR0FBRyxJQUFJLEtBQU0sU0FBUSxJQUFJO1FBQWxCOztZQUM1QixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7UUFDMUIsQ0FBQztLQUFBLENBQUM7SUFDVyxVQUFJLEdBQUcsSUFBSSxLQUFNLFNBQVEsSUFBSTtRQUFsQjs7WUFDdEIsVUFBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBVSxDQUFDO1FBQzFCLENBQUM7S0FBQSxDQUFDO0lBQ1csWUFBTSxHQUFHLElBQUksS0FBTSxTQUFRLElBQUk7UUFBbEI7O1lBQ3hCLFVBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQVUsQ0FBQztRQUMxQixDQUFDO0tBQUEsQ0FBQztJQUNXLFNBQUcsR0FBRyxJQUFJLEtBQU0sU0FBUSxJQUFJO1FBQWxCOztZQUNyQixVQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFVLENBQUM7UUFDMUIsQ0FBQztLQUFBLENBQUM7SUFDVyxZQUFNLEdBQUcsSUFBSSxL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QUUsQ0FBQztJQUN2QixXQUFLLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQztBQUN0QyxDQUFDLEVBNUdnQixLQUFLLEtBQUwsS0FBSyxRQTRHckI7QUFFRCxTQUFTLFVBQVUsQ0FBQyxHQUFXO0lBQzdCLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3hFLENBQUM7QUFHRCxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtJQUM5QyxJQUF1QixDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDakQiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBBYnN0cmFjdGlvbiBmb3IgYSBjb2hlcmVudCBcImFyZWFcIiwgdXNlZCBmb3IgZ3JvdXBpbmcgdG9nZXRoZXJcbi8vIGxvY2F0aW9ucyBmb3IgKGUuZy4pIG11c2ljIGFuZCBwYWxldHRlIHNodWZmbGUsIG9yIG92ZXJ3b3JsZFxuLy8gc2h1ZmZsZS5cblxuLy8gY29uc3QgYXJlYSA9IGluaXRpYWxpemVyPHJlYWRvbmx5IFtBcmVhT3B0aW9ucz9dLCBBcmVhPigpO1xuLy8gaW50ZXJmYWNlIEFyZWFPcHRpb25zIHtcbi8vICAgLy8gZG9lcyBleGl0IGluZm9ybWF0aW9uIGdvIGhlcmU/IT8gb3IgaW4gYXJlYXNodWZmbGUudHM/XG4vLyAgIC8vICAtIG5lZWRzIHJlcGV0aXRpb24gb2YgYWxsIGVsZW1lbnRzIGluIHRoYXQgY2FzZT9cbi8vICAgLy8gIC0gYW5kIGl0J3Mgbm90IGFuIGVudW0gc28gaXQncyBoYXJkZXIgdG8gZG8gKHRob3VnaCBub3QgaW1wb3NzaWJsZSkuXG4vLyAgIHR5cGU/OiAnb3ZlcndvcmxkJ3wnY29ubmVjdG9yJ3wndG93bid8J3Rlcm1pbmFsJztcbi8vIH1cblxuLy8gVXNlZCBmb3IgYXV0by1nZW5lcmF0ZWQgbmFtZXMsIGJ1dCB3ZSdsbCByZXBsYWNlIHRoZW0gYW55d2F5LlxubGV0IGNvdW50ID0gMDtcblxuLy8gVE9ETyAtIGlzIHRoZXJlIGFueSB2YWx1ZSBpbiBtdXRhdGluZyBhcmVhcyBkaXJlY3RseT9cbi8vICAgICAgICB3ZSBjYW4gYWx3YXlzIGp1c3QgY29uc3VsdCB0aGUgcm9tIGlmIHdlIG5lZWQgc29tZXRoaW5nP1xuLy8gICAgICAgIHdlIGNvdWxkIGFsc28gZXZlbiBtYWtlIGFjY2Vzc29ycywgV2Vha01hcDxSb20sIC4uLj4sIGV0Yz9cbi8vICAgICAgICAgLSB0aG91Z2ggdGhhdCBicmVha3MgZW5jYXBzdWxhdGlvbiBwcmV0dHkgYmFkbHkgLSBubyB3YXkgdG8gY2xvbmUuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXJlYSB7XG4gIHJlYWRvbmx5IG5hbWUgPSBgQXJlYSAkeysrY291bnR9YDtcbiAgcmVhZG9ubHkgYWJzdHJhY3QgZXhpdHM6IHJlYWRvbmx5IFtudW1iZXIsIG51bWJlcl07XG4gIHJlYWRvbmx5IGFic3RyYWN0IHR5cGU6ICdvdmVyd29ybGQnIHwgJ3Rvd24nIHwgJ2Nvbm5lY3RvcicgfCAndGVybWluYWwnO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgT3ZlcndvcmxkIGV4dGVuZHMgQXJlYSB7XG4gIHR5cGUgPSAnb3ZlcndvcmxkJyBhcyBjb25zdDtcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFRvd24gZXh0ZW5kcyBBcmVhIHtcbiAgdHlwZSA9ICd0b3duJyBhcyBjb25zdDtcbn1cblxuZXhwb3J0IGNsYXNzIENvbm5lY3RvciBleHRlbmRzIEFyZWEge1xuICB0eXBlID0gJ2Nvbm5lY3RvcicgYXMgY29uc3Q7XG4gIGV4aXRzID0gWzIsIDJdIGFzIGNvbnN0O1xufVxuXG5leHBvcnQgY2xhc3MgVGVybWluYWwgZXh0ZW5kcyBBcmVhIHtcbiAgdHlwZSA9ICd0ZXJtaW5hbCcgYXMgY29uc3Q7XG4gIGV4aXRzID0gWzEsIDFdIGFzIGNvbnN0O1xufVxuXG4vLyBFeHBvcnQgYW4gZW51bSBzbyB0aGF0IHdlIGNhbiBhdCBsZWFzdCByZWZlciB0byB0aGVzZSBzdGF0aWNhbGx5LlxuZXhwb3J0IG5hbWVzcGFjZSBBcmVhcyB7XG4gIGV4cG9ydCBjb25zdCBVbnVzZWQgPSBuZXcgVGVybWluYWwoKTtcbiAgLy8gT3ZlcndvcmxkIGFyZWFzOiB0aGVzZSBhcmUgdGhlIFwiaHVic1wiLlxuICBleHBvcnQgY29uc3QgVmFsbGV5T2ZXaW5kID0gbmV3IGNsYXNzIGV4dGVuZHMgT3ZlcndvcmxkIHtcbiAgICBleGl0cyA9IFszLCA2XSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IENvcmRlbFBsYWluID0gbmV3IGNsYXNzIGV4dGVuZHMgT3ZlcndvcmxkIHtcbiAgICBleGl0cyA9IFs1LCA4XSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IFdhdGVyZmFsbFZhbGxleSA9IG5ldyBjbGFzcyBleHRlbmRzIE92ZXJ3b3JsZCB7XG4gICAgZXhpdHMgPSBbNiwgNl0gYXMgY29uc3Q7XG4gIH07XG4gIGV4cG9ydCBjb25zdCBBbmdyeVNlYSA9IG5ldyBjbGFzcyBleHRlbmRzIE92ZXJ3b3JsZCB7XG4gICAgZXhpdHMgPSBbMCwgMF0gYXMgY29uc3Q7XG4gIH07XG4gIGV4cG9ydCBjb25zdCBHb2FWYWxsZXkgPSBuZXcgY2xhc3MgZXh0ZW5kcyBPdmVyd29ybGQge1xuICAgIGV4aXRzID0gWzAsIDBdIGFzIGNvbnN0O1xuICB9O1xuICBleHBvcnQgY29uc3QgRGVzZXJ0MSA9IG5ldyBjbGFzcyBleHRlbmRzIE92ZXJ3b3JsZCB7XG4gICAgZXhpdHMgPSBbMCwgMF0gYXMgY29uc3Q7XG4gIH07XG4gIGV4cG9ydCBjb25zdCBEZXNlcnQyID0gbmV3IGNsYXNzIGV4dGVuZHMgT3ZlcndvcmxkIHtcbiAgICBleGl0cyA9IFswLCAwXSBhcyBjb25zdDtcbiAgfTtcblxuICAvLyBUb3ducywgd2hpY2ggbWF5IGJlIHRlcm1pbmFsIG9yIG5vdC5cbiAgZXhwb3J0IGNvbnN0IExlYWYgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUb3duIHtcbiAgICBleGl0cyA9IFswLCAwXSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IEJyeW5tYWVyID0gbmV3IGNsYXNzIGV4dGVuZHMgVG93biB7XG4gICAgZXhpdHMgPSBbMCwgMF0gYXMgY29uc3Q7XG4gIH07XG4gIGV4cG9ydCBjb25zdCBPYWsgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUb3duIHtcbiAgICBleGl0cyA9IFswLCAwXSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IEFtYXpvbmVzID0gbmV3IGNsYXNzIGV4dGVuZHMgVG93biB7XG4gICAgZXhpdHMgPSBbMCwgMF0gYXMgY29uc3Q7XG4gIH07XG4gIGV4cG9ydCBjb25zdCBOYWRhcmUgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUb3duIHtcbiAgICAvLyBUT0RPIC0gdGllIHRoaXMgdG8gc2FicmUgbm9ydGg/Pz8/XG4gICAgZXhpdHMgPSBbMCwgMF0gYXMgY29uc3Q7XG4gIH07XG4gIGV4cG9ydCBjb25zdCBQb3J0b2EgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUb3duIHtcbiAgICBleGl0cyA9IFswLCAwXSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IEpvZWwgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUb3duIHtcbiAgICBleGl0cyA9IFswLCAwXSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IFpvbWJpZVRvd24gPSBuZXcgY2xhc3MgZXh0ZW5kcyBUb3duIHtcbiAgICBleGl0cyA9IFswLCAwXSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IFN3YW4gPSBuZXcgY2xhc3MgZXh0ZW5kcyBUb3duIHtcbiAgICBleGl0cyA9IFswLCAwXSBhcyBjb25zdDtcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IFNoeXJvbiA9IG5ldyBjbGFzcyBleHRlbmRzIFRvd24ge1xuICAgIGV4aXRzID0gWzAsIDBdIGFzIGNvbnN0O1xuICB9O1xuICBleHBvcnQgY29uc3QgR29hID0gbmV3IGNsYXNzIGV4dGVuZHMgVG93biB7XG4gICAgZXhpdHMgPSBbMCwgMF0gYXMgY29uc3Q7XG4gIH07XG4gIGV4cG9ydCBjb25zdCBTYWhhcmEgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUb3duIHtcbiAgICBleGl0cyA9IFswLCAwXSBhcyBjb25zdDtcbiAgfTtcblxuICAvLyBDb25uZWN0b3JzLlxuICBleHBvcnQgY29uc3QgV2luZG1pbGxDYXZlID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuICBleHBvcnQgY29uc3QgU2VhbGVkQ2F2ZSA9IG5ldyBjbGFzcyBleHRlbmRzIENvbm5lY3RvciB7fTtcbiAgZXhwb3J0IGNvbnN0IFplYnVDYXZlID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuICBleHBvcnQgY29uc3QgTXRTYWJyZVdlc3QgPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307XG4gIGV4cG9ydCBjb25zdCBNdFNhYnJlTm9ydGggPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307XG4gIGV4cG9ydCBjb25zdCBMaW1lVHJlZVZhbGxleSA9IG5ldyBjbGFzcyBleHRlbmRzIENvbm5lY3RvciB7fTtcbiAgZXhwb3J0IGNvbnN0IFBvcnRvYVBhbGFjZSA9IG5ldyBjbGFzcyBleHRlbmRzIENvbm5lY3RvciB7fTtcbiAgZXhwb3J0IGNvbnN0IEZpc2hlcm1hbkhvdXNlID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9OyAvLyBpbmNsdWRlcyBuZXcgYmVhY2hcbiAgZXhwb3J0IGNvbnN0IFVuZGVyZ3JvdW5kQ2hhbm5lbCA9IG5ldyBjbGFzcyBleHRlbmRzIENvbm5lY3RvciB7fTtcbiAgZXhwb3J0IGNvbnN0IEpvZWxQYXNzYWdlID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuICBleHBvcnQgY29uc3QgRXZpbFNwaXJpdElzbGFuZEVudHJhbmNlID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuICBleHBvcnQgY29uc3QgRXZpbFNwaXJpdElzbGFuZCA9IG5ldyBjbGFzcyBleHRlbmRzIENvbm5lY3RvciB7fTsgLy8gbWFpbiBjYXZlXG4gIGV4cG9ydCBjb25zdCBLaXJpc2FQbGFudENhdmUgPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307XG4gIGV4cG9ydCBjb25zdCBTd2FuR2F0ZSA9IG5ldyBjbGFzcyBleHRlbmRzIENvbm5lY3RvciB7fTtcbiAgZXhwb3J0IGNvbnN0IE10SHlkcmEgPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307IC8vIDMtd2F5XG4gIC8vIFRPRE8gLSBzdGl0Y2ggbmVpZ2hib3JpbmcgbXVzaWMvcGFsZXR0ZSBhciBzYWdlcz9cbiAgZXhwb3J0IGNvbnN0IEdvYUZvcnRyZXNzID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuICBleHBvcnQgY29uc3QgT2FzaXNFbnRyYW5jZSA9IG5ldyBjbGFzcyBleHRlbmRzIENvbm5lY3RvciB7fTtcbiAgZXhwb3J0IGNvbnN0IE9hc2lzQ2F2ZSA9IG5ldyBjbGFzcyBleHRlbmRzIENvbm5lY3RvciB7fTtcbiAgZXhwb3J0IGNvbnN0IERlc2VydENhdmUxID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuICBleHBvcnQgY29uc3QgU2FoYXJhTWVhZG93ID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuICBleHBvcnQgY29uc3QgRGVzZXJ0Q2F2ZTIgPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307XG5cbiAgLy8gTWF5YmUgY29ubmVjdG9yc1xuICBleHBvcnQgY29uc3QgRWFzdENhdmUgPSBuZXcgY2xhc3MgZXh0ZW5kcyBDb25uZWN0b3Ige307IC8vIG5ldyBtYXBcbiAgZXhwb3J0IGNvbnN0IFN3YW1wID0gbmV3IGNsYXNzIGV4dGVuZHMgQ29ubmVjdG9yIHt9O1xuXG4gIC8vIFRlcm1pbmFscy5cbiAgZXhwb3J0IGNvbnN0IE1lemFtZSA9IG5ldyBjbGFzcyBleHRlbmRzIFRlcm1pbmFsIHt9OyAvLyBpbmNsdWRlcyBtYXBzIDAgYW5kIDFcbiAgZXhwb3J0IGNvbnN0IFdpbmRtaWxsID0gbmV3IGNsYXNzIGV4dGVuZHMgVGVybWluYWwge307IC8vIGluY3VkZXMgcGFydCBvZiB3aW5kIHZhbGxleVxuICBleHBvcnQgY29uc3QgU3RvbUhvdXNlID0gbmV3IGNsYXNzIGV4dGVuZHMgVGVybWluYWwge307XG4gIGV4cG9ydCBjb25zdCBXYXRlcmZhbGxDYXZlID0gbmV3IGNsYXNzIGV4dGVuZHMgVGVybWluYWwge307XG4gIGV4cG9ydCBjb25zdCBLaXJpc2FNZWFkb3cgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUZXJtaW5hbCB7fTtcbiAgZXhwb3J0IGNvbnN0IEZvZ0xhbXBDYXZlID0gbmV3IGNsYXNzIGV4dGVuZHMgVGVybWluYWwge307XG4gIGV4cG9ydCBjb25zdCBMaW1lVHJlZUxha2UgPSBuZXcgY2xhc3MgZXh0ZW5kcyBUZXJtaW5hbCB7fTsgLy8gaW5jbHVkZXMgbWVzaWEgc2hyaW5lXG4gIGV4cG9ydCBjb25zdCBMaWdodGhvdXNlID0gbmV3IGNsYXNzIGV4dGVuZHMgVGVybWluYWwge307IC8vIGluY2x1ZGVzIGltbWVkaWF0ZSBvdXRzaWRlXG4gIGV4cG9ydCBjb25zdCBTYWJlcmFGb3J0cmVzcyA9IG5ldyBjbGFzcyBleHRlbmRzIFRlcm1pbmFsIHt9O1xuICBleHBvcnQgY29uc3QgU2h5cm9uVGVtcGxlID0gbmV3IGNsYXNzIGV4dGVuZHMgVGVybWluYWwge307XG4gIGV4cG9ydCBjb25zdCBTdHl4ID0gbmV3IGNsYXNzIGV4dGVuZHMgVGVybWluYWwge307XG4gIGV4cG9ydCBjb25zdCBGb3J0cmVzc0Jhc2VtZW50ID0gbmV3IGNsYXNzIGV4dGVuZHMgVGVybWluYWwge307XG4gIGV4cG9ydCBjb25zdCBQeXJhbWlkID0gbmV3IGNsYXNzIGV4dGVuZHMgVGVybWluYWwge307XG4gIGV4cG9ydCBjb25zdCBDcnlwdCA9IG5ldyBUZXJtaW5hbCgpO1xuICBleHBvcnQgY29uc3QgVG93ZXIgPSBuZXcgVGVybWluYWwoKTtcbn1cblxuZnVuY3Rpb24gY2FwaXRhbGl6ZShrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBrZXkucmVwbGFjZSgvKFthLXpdKShbQS1aMC05XSkvZywgJyQxICQyJykucmVwbGFjZSgnT2YnLCAnb2YnKTtcbn1cblxuLy8gRml4IHRoZSBuYW1lc1xuZm9yIChjb25zdCBba2V5LCBhcmVhXSBvZiBPYmplY3QuZW50cmllcyhBcmVhcykpIHtcbiAgKGFyZWEgYXMge25hbWU6IHN0cmluZ30pLm5hbWUgPSBjYXBpdGFsaXplKGtleSk7XG59XG4iXX0=