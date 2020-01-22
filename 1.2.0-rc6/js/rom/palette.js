import { Entity } from './entity.js';
import { tuple } from './util.js';
export class Palette extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.base = (id & 3) << 2 | (id & 0xfc) << 6 | 0x40f0;
        this.colors = tuple(rom.prg, this.base, 4);
    }
    color(c) {
        return this.colors[c] & 0x3f;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFsZXR0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9yb20vcGFsZXR0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFHaEMsTUFBTSxPQUFPLE9BQVEsU0FBUSxNQUFNO0lBS2pDLFlBQVksR0FBUSxFQUFFLEVBQVU7UUFDOUIsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNmLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUM7UUFDdEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFJRCxLQUFLLENBQUMsQ0FBUztRQUNiLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDL0IsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtFbnRpdHl9IGZyb20gJy4vZW50aXR5LmpzJztcbmltcG9ydCB7dHVwbGV9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcblxuZXhwb3J0IGNsYXNzIFBhbGV0dGUgZXh0ZW5kcyBFbnRpdHkge1xuXG4gIGJhc2U6IG51bWJlcjtcbiAgY29sb3JzOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcblxuICBjb25zdHJ1Y3Rvcihyb206IFJvbSwgaWQ6IG51bWJlcikge1xuICAgIHN1cGVyKHJvbSwgaWQpO1xuICAgIHRoaXMuYmFzZSA9IChpZCAmIDMpIDw8IDIgfCAoaWQgJiAweGZjKSA8PCA2IHwgMHg0MGYwO1xuICAgIHRoaXMuY29sb3JzID0gdHVwbGUocm9tLnByZywgdGhpcy5iYXNlLCA0KTtcbiAgfVxuICAvLyBncmF5c2NhbGUgcGFsZXR0ZTogWzNmLCAzMCwgMmQsIDBdID8/XG5cbiAgLy8gVGFrZXMgYSBjb2xvciAnYycgZnJvbSAwLi4zIGFuZCByZXR1cm5zIGEgbnVtYmVyIGZyb20gMC4uNjMuXG4gIGNvbG9yKGM6IG51bWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuY29sb3JzW2NdICYgMHgzZjtcbiAgfVxufVxuIl19