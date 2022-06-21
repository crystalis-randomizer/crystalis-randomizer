import { ObjectData } from './objectdata.js';
import { hex } from './util.js';
export class Monster extends ObjectData {
    constructor(parent, data) {
        super(parent, data.id);
        const scaling = data.scaling;
        const expectedLevel = (level(scaling) + this.level) / 2;
        const expectedAttack = expectedLevel + playerSword(scaling, this.elements);
        this.hits = (this.hp + 1) / (expectedAttack - this.def);
        this.sdef = this.def / expectedAttack;
        const expectedPlayerHP = Math.min(255, Math.max(16, 32 + expectedLevel * 16));
        this.satk =
            (this.atk - expectedPlayerDefense(scaling, this.attackType)) /
                expectedPlayerHP;
        this.extraDifficulty = data.difficulty || 0;
        this.monsterClass = data.class;
        const vsExp = processExpReward(this.expReward) / baselineExp(scaling);
        const vsGld = VANILLA_GOLD_DROPS[this.goldDrop] / baselineGold(scaling);
        this.type = data.type || 'monster';
        this.wealth = vsGld && vsGld / (vsExp + vsGld);
    }
    isBoss() {
        return this.type === 'boss';
    }
    isProjectile() {
        return this.type === 'projectile';
    }
    isFlyer() {
        const a = this.rom.objectActions[this.action];
        return (a === null || a === void 0 ? void 0 : a.data.bird) || (a === null || a === void 0 ? void 0 : a.data.moth) || false;
    }
    placement() {
        var _a, _b;
        return (_b = (_a = this.rom.objectActions[this.action]) === null || _a === void 0 ? void 0 : _a.data.placement) !== null && _b !== void 0 ? _b : 'normal';
    }
    clearance() {
        var _a;
        return ((_a = this.rom.objectActions[this.action]) === null || _a === void 0 ? void 0 : _a.data.large) ? 6 : 3;
    }
    totalDifficulty() {
        return this.toughness() + this.attack() + this.statusDifficulty() +
            this.immunities() + this.movement();
    }
    collectDifficulty(f, r) {
        let result = f(this);
        const child = this.spawnedChild();
        if (child instanceof Monster) {
            result = r(result, child.collectDifficulty(f, r));
        }
        const death = this.spawnedReplacement();
        if (death instanceof Monster) {
            result = r(result, death.collectDifficulty(f, r));
        }
        return result;
    }
    toughness() {
        return this.collectDifficulty(m => lookup(m.hits, 0, [2, 1], [3, 2], [5, 3], [7, 4], [10, 5], [13, 6]), Math.max);
    }
    attack() {
        return this.collectDifficulty(m => {
            if (m.attackType && m.statusEffect)
                return 0;
            return lookup(m.satk, 0, [.04, 1], [.08, 2], [.13, 3], [.18, 4], [.25, 5], [.33, 6]);
        }, Math.max);
    }
    addStatusEffects(set) {
        if (this.attackType && this.statusEffect) {
            set.add(this.statusEffect);
        }
        else if (!this.attackType && this.poison) {
            set.add(0);
        }
        const replacement = this.spawnedReplacement();
        if (replacement instanceof Monster)
            replacement.addStatusEffects(set);
        const child = this.spawnedChild();
        if (child instanceof Monster)
            child.addStatusEffects(set);
    }
    statusDifficulty() {
        const set = new Set();
        this.addStatusEffects(set);
        let result = 0;
        for (const status of set) {
            result += STATUS_DIFFICULTY[status];
        }
        return result;
    }
    immunities() {
        let count = 0;
        let elems = this.elements;
        while (elems) {
            if (elems & 1)
                count++;
            elems >>>= 1;
        }
        return (count && 1 << (count - 1));
    }
    movement() {
        return this.collectDifficulty(m => {
            const actionData = this.rom.objectActions[m.action];
            const child = m.spawnedChild();
            let result = m.extraDifficulty;
            if (actionData) {
                result += (actionData.data.movement || 0);
                if (actionData.data.large)
                    result++;
                if (child && !child.statusEffect) {
                    result += (actionData.data.projectile || 0);
                }
            }
            if (this.metasprite === 0xa7)
                result += 2;
            return result;
        }, (a, b) => a + b);
    }
    totalReward() {
        return this.totalDifficulty() / 4;
    }
    normalizedGold() {
        if (!this.wealth)
            return 0;
        const dgld = this.totalDifficulty() * this.wealth * 0.6;
        return Math.max(1, Math.min(15, Math.round(dgld)));
    }
    normalizedExp() {
        if (this.wealth === 1)
            return 0;
        const sexp = 0.488 + this.totalDifficulty() * (1 - this.wealth) * 0.256;
        return Math.max(1, Math.min(255, Math.round(sexp * 32)));
    }
    toString() {
        return `Monster $${hex(this.id)} ${this.name}`;
    }
}
function processExpReward(raw) {
    return raw < 128 ? raw : (raw & 0x7f) << 4;
}
function baselineExp(scaling) {
    return 2 ** (scaling / 5 - 1);
}
const STATUS_DIFFICULTY = [
    2,
    1,
    3,
    2,
    4,
];
const VANILLA_GOLD_DROPS = [
    0, 1, 2, 4, 8, 16, 30, 50,
    100, 200, 400, 50, 100, 200, 400, 500,
];
function baselineGold(scaling) {
    return 2 ** (scaling / 7 - 1);
}
function level(scaling) {
    return scaling < 24 ? 1 + scaling / 3 : (scaling + 12) / 4;
}
function playerSword(scaling, elements = 0) {
    const bestOwned = scaling < 10 ? 1 : scaling < 18 ? 2 : scaling < 38 ? 4 : 8;
    for (let i = bestOwned; i; i >>>= 1) {
        if (!(i & elements))
            return i << 1;
    }
    return bestOwned << 1;
}
function expectedPlayerDefense(scaling, attackType) {
    return level(scaling) + playerArmor(scaling, attackType);
}
function playerArmor(scaling, attackType) {
    if (!attackType) {
        return lookup(scaling, 2, [6, 6], [18, 10], [25, 14], [30, 18], [40, 24], [46, 32]);
    }
    else {
        return lookup(scaling, 2, [6, 6], [18, 8], [25, 12], [30, 18], [37, 24], [42, 32]);
    }
}
function lookup(x, first, ...table) {
    for (let i = table.length - 1; i >= 0; i--) {
        const [k, v] = table[i];
        if (x >= k)
            return v;
    }
    return first;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uc3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9yb20vbW9uc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFN0MsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQWFoQyxNQUFNLE9BQU8sT0FBUSxTQUFRLFVBQVU7SUEyQnJDLFlBQVksTUFBZSxFQUFFLElBQWlCO1FBQzVDLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBU3ZCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDN0IsTUFBTSxhQUFhLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4RCxNQUFNLGNBQWMsR0FBRyxhQUFhLEdBQUcsV0FBVyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxjQUFjLENBQUM7UUFFdEMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsYUFBYSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLElBQUk7WUFDTCxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcscUJBQXFCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFD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LEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUNyRjtTQUFNO1FBQ0wsT0FBTyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQ3BGO0FBQ0gsQ0FBQztBQUVELFNBQVMsTUFBTSxDQUEwQixDQUFJLEVBQ0osS0FBUSxFQUNSLEdBQUcsS0FBcUM7SUFDL0UsS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUM7WUFBRSxPQUFPLENBQUMsQ0FBQztLQUN0QjtJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE9iamVjdERhdGEgfSBmcm9tICcuL29iamVjdGRhdGEuanMnO1xuaW1wb3J0IHsgUGxhY2VtZW50IH0gZnJvbSAnLi9vYmplY3RhY3Rpb24uanMnO1xuaW1wb3J0IHsgaGV4IH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB0eXBlIHsgT2JqZWN0cyB9IGZyb20gJy4vb2JqZWN0cy5qcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTW9uc3RlckRhdGEge1xuICBpZDogbnVtYmVyLFxuICBzY2FsaW5nOiBudW1iZXIsXG4gIGRpZmZpY3VsdHk/OiBudW1iZXI7XG4gIGNsYXNzPzogc3RyaW5nO1xuICB0eXBlPzogJ2Jvc3MnIHwgJ3Byb2plY3RpbGUnOyAvLyBvciBkZWZhdWx0OiBtb25zdGVyXG59XG5cbnR5cGUgRGlmZmljdWx0eUZhY3RvciA9IG51bWJlciAmIHtfX2RpZmZpY3VsdHlfXzogbmV2ZXJ9O1xuXG5leHBvcnQgY2xhc3MgTW9uc3RlciBleHRlbmRzIE9iamVjdERhdGEge1xuXG4gIC8vIC8qKiBWYW5pbGxhIGRlZmVuc2UuIElmIGNoYW5naW5nIGRlZiBiZWZvcmUgc2NhbGluZywgY2hhbmdlIHZkZWYgaW5zdGVhZC4gKi9cbiAgLy8gdmRlZjogbnVtYmVyO1xuICAvLyAvKiogVmFuaWxsYSBoZWFsdGguIElmIGNoYW5naW5nIGhwIGJlZm9yZSBzY2FsaW5nLCBjaGFuZ2UgdmhwIGluc3RlYWQuICovXG4gIC8vIHZocDogbnVtYmVyO1xuXG4gIC8qKiBUYXJnZXQgbnVtYmVyIG9mIGhpdHMgdG8ga2lsbCBtb25zdGVyLiAqL1xuICBoaXRzOiBudW1iZXI7XG4gIC8qKiBUYXJnZXQgZGVmZW5zZSBhcyBhIGZyYWN0aW9uIG9mIGV4cGVjdGVkIHBsYXllciBhdHRhY2suICovXG4gIHNkZWY6IG51bWJlcjtcbiAgLyoqIFRhcmdldCBhdHRhY2sgYXMgYSBmcmFjdGlvbiBvZiBleHBlY3RlZCBwbGF5ZXIgSFAuICovXG4gIHNhdGs6IG51bWJlcjtcblxuICAvKiogUmVsYXRpdmUgZnJhY3Rpb24gb2YgcmV3YXJkIGdpdmVuIGFzIG1vbmV5LiAqL1xuICB3ZWFsdGg6IG51bWJlcjtcblxuICAvKiogRXh0cmEgZGlmZmljdWx0eSBmYWN0b3IuICovXG4gIGV4dHJhRGlmZmljdWx0eTogbnVtYmVyO1xuXG4gIHNoaWZ0UGF0dGVybnM/OiBTZXQ8bnVtYmVyPjtcbiAgdXNlZFBhbGV0dGVzPzogcmVhZG9ubHkgbnVtYmVyW107XG4gIHVzZWRQYXR0ZXJucz86IHJlYWRvbmx5IG51bWJlcltdO1xuXG4gIHR5cGU6ICdtb25zdGVyJyB8ICdib3NzJyB8ICdwcm9qZWN0aWxlJztcbiAgbW9uc3RlckNsYXNzPzogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHBhcmVudDogT2JqZWN0cywgZGF0YTogTW9uc3RlckRhdGEpIHtcbiAgICBzdXBlcihwYXJlbnQsIGRhdGEuaWQpO1xuXG4gICAgLy8gTWFrZSB0aGUgc2NhbGluZyBjYWxjdWxhdGlvbnMgaGVyZVxuICAgIC8vIEZpcnN0IGRlcml2ZSB2YWx1ZXMgY29ycmVzcG9uZGluZyB0byB2YW5pbGxhLlxuXG4gICAgLy8gRXhwZWN0ZWQgdmFuaWxsYSBwbGF5ZXIgbGV2ZWwgY29tZXMgZnJvbSBhdmVyYWdpbmcgKDEpIHRoZSBleHBlY3RlZFxuICAgIC8vIGxldmVsIGZyb20gdGhlIG1hbnVhbGx5LXNwZWNpZmllZCAoZXF1aXZhbGVudCkgc2NhbGluZyBsZXZlbCB3aXRoXG4gICAgLy8gKDIpIHRoZSBtaW5pbXVtIGxldmVsIHRvIGRhbWFnZSAoZnJvbSB0aGUgb2JqZWN0IGRhdGEpLiAgVGhpcyBtYXkgYmVcbiAgICAvLyBmcmFjdGlvbmFsLlxuICAgIGNvbnN0IHNjYWxpbmcgPSBkYXRhLnNjYWxpbmc7XG4gICAgY29uc3QgZXhwZWN0ZWRMZXZlbCA9IChsZXZlbChzY2FsaW5nKSArIHRoaXMubGV2ZWwpIC8gMjtcbiAgICBjb25zdCBleHBlY3RlZEF0dGFjayA9IGV4cGVjdGVkTGV2ZWwgKyBwbGF5ZXJTd29yZChzY2FsaW5nLCB0aGlzLmVsZW1lbnRzKTtcbiAgICB0aGlzLmhpdHMgPSAodGhpcy5ocCArIDEpIC8gKGV4cGVjdGVkQXR0YWNrIC0gdGhpcy5kZWYpO1xuICAgIHRoaXMuc2RlZiA9IHRoaXMuZGVmIC8gZXhwZWN0ZWRBdHRhY2s7XG5cbiAgICBjb25zdCBleHBlY3RlZFBsYXllckhQID0gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgxNiwgMzIgKyBleHBlY3RlZExldmVsICogMTYpKTtcbiAgICB0aGlzLnNhdGsgPVxuICAgICAgICAodGhpcy5hdGsgLSBleHBlY3RlZFBsYXllckRlZmVuc2Uoc2NhbGluZywgdGhpcy5hdHRhY2tUeXBlKSkgL1xuICAgICAgICBleHBlY3RlZFBsYXllckhQO1xuICAgIHRoaXMuZXh0cmFEaWZmaWN1bHR5ID0gZGF0YS5kaWZmaWN1bHR5IHx8IDA7XG4gICAgdGhpcy5tb25zdGVyQ2xhc3MgPSBkYXRhLmNsYXNzO1xuXG4gICAgLy8gQ29tcHV0ZSB2YW5pbGxhIHNjYWxlZCBleHAgYW5kIGdvbGQuXG4gICAgY29uc3QgdnNFeHAgPSBwcm9jZXNzRXhwUmV3YXJkKHRoaXMuZXhwUmV3YXJkKSAvIGJhc2VsaW5lRXhwKHNjYWxpbmcpO1xuICAgIGNvbnN0IHZzR2xkID0gVkFOSUxMQV9HT0xEX0RST1BTW3RoaXMuZ29sZERyb3BdIC8gYmFzZWxpbmVHb2xkKHNjYWxpbmcpO1xuXG4gICAgdGhpcy50eXBlID0gZGF0YS50eXBlIHx8ICdtb25zdGVyJztcbiAgICB0aGlzLndlYWx0aCA9IHZzR2xkICYmIHZzR2xkIC8gKHZzRXhwICsgdnNHbGQpO1xuICB9XG5cbiAgaXNCb3NzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnR5cGUgPT09ICdib3NzJztcbiAgfVxuXG4gIGlzUHJvamVjdGlsZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy50eXBlID09PSAncHJvamVjdGlsZSc7XG4gIH1cblxuICBpc0ZseWVyKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGEgPSB0aGlzLnJvbS5vYmplY3RBY3Rpb25zW3RoaXMuYWN0aW9uXTtcbiAgICByZXR1cm4gYT8uZGF0YS5iaXJkIHx8IGE/LmRhdGEubW90aCB8fCBmYWxzZTtcbiAgfVxuXG4gIHBsYWNlbWVudCgpOiBQbGFjZW1lbnQge1xuICAgIHJldHVybiB0aGlzLnJvbS5vYmplY3RBY3Rpb25zW3RoaXMuYWN0aW9uXT8uZGF0YS5wbGFjZW1lbnQgPz8gJ25vcm1hbCc7XG4gIH1cblxuICBjbGVhcmFuY2UoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5yb20ub2JqZWN0QWN0aW9uc1t0aGlzLmFjdGlvbl0/LmRhdGEubGFyZ2UgPyA2IDogMztcbiAgfVxuXG4gIHRvdGFsRGlmZmljdWx0eSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnRvdWdobmVzcygpICsgdGhpcy5hdHRhY2soKSArIHRoaXMuc3RhdHVzRGlmZmljdWx0eSgpICtcbiAgICAgICAgdGhpcy5pbW11bml0aWVzKCkgKyB0aGlzLm1vdmVtZW50KCk7XG4gIH1cblxuICBjb2xsZWN0RGlmZmljdWx0eShmOiAobTogTW9uc3RlcikgPT4gbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICByOiAoYTogbnVtYmVyLCBiOiBudW1iZXIpID0+IG51bWJlcik6IERpZmZpY3VsdHlGYWN0b3Ige1xuICAgIGxldCByZXN1bHQgPSBmKHRoaXMpO1xuICAgIGNvbnN0IGNoaWxkID0gdGhpcy5zcGF3bmVkQ2hpbGQoKTtcbiAgICBpZiAoY2hpbGQgaW5zdGFuY2VvZiBNb25zdGVyKSB7XG4gICAgICByZXN1bHQgPSByKHJlc3VsdCwgY2hpbGQuY29sbGVjdERpZmZpY3VsdHkoZiwgcikpO1xuICAgIH1cbiAgICBjb25zdCBkZWF0aCA9IHRoaXMuc3Bhd25lZFJlcGxhY2VtZW50KCk7XG4gICAgaWYgKGRlYXRoIGluc3RhbmNlb2YgTW9uc3Rlcikge1xuICAgICAgcmVzdWx0ID0gcihyZXN1bHQsIGRlYXRoLmNvbGxlY3REaWZmaWN1bHR5KGYsIHIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdCBhcyBEaWZmaWN1bHR5RmFjdG9yO1xuICB9XG5cbiAgLyoqIEJhc2ljIG1lYXN1cmUgb2YgaG93IGhhcmQgdGhlIGVuZW15IGlzIHRvIGtpbGwuICovXG4gIHRvdWdobmVzcygpOiBEaWZmaWN1bHR5RmFjdG9yIHtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0RGlmZmljdWx0eShcbiAgICAgICAgbSA9PiBsb29rdXAobS5oaXRzLCAwLCBbMiwgMV0sIFszLCAyXSwgWzUsIDNdLCBbNywgNF0sIFsxMCwgNV0sIFsxMywgNl0pLFxuICAgICAgICBNYXRoLm1heCk7XG4gIH1cblxuICAvKiogSG93IGhhcmQgdGhlIG1vbnN0ZXIgaGl0cy4gKi9cbiAgYXR0YWNrKCk6IERpZmZpY3VsdHlGYWN0b3Ige1xuICAgIC8vIGlnbm9yZSBBVEsgZm9yIHByb2plY3RpbGVzIHdpdGggc3RhdHVzXG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdERpZmZpY3VsdHkoXG4gICAgICAgIG0gPT4ge1xuICAgICAgICAgIGlmIChtLmF0dGFja1R5cGUgJiYgbS5zdGF0dXNFZmZlY3QpIHJldHVybiAwO1xuICAgICAgICAgIHJldHVybiBsb29rdXAobS5zYXRrLFxuICAgICAgICAgICAgICAgICAgICAgICAgMCwgWy4wNCwgMV0sIFsuMDgsIDJdLCBbLjEzLCAzXSwgWy4xOCwgNF0sIFsuMjUsIDVdLCBbLjMzLCA2XSk7XG4gICAgICAgIH0sIE1hdGgubWF4KTtcbiAgfVxuXG4gIGFkZFN0YXR1c0VmZmVjdHMoc2V0OiBTZXQ8bnVtYmVyPik6IHZvaWQge1xuICAgIC8vIFRPRE8gLSBpZiB3ZSBhbGxvdyBwcm9qZWN0aWxlIHBvaXNvbiBvciBib2R5IHBhcmFseXNpcywgYWNjb3VudCBmb3IgdGhhdC5cbiAgICBpZiAodGhpcy5hdHRhY2tUeXBlICYmIHRoaXMuc3RhdHVzRWZmZWN0KSB7XG4gICAgICBzZXQuYWRkKHRoaXMuc3RhdHVzRWZmZWN0KTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLmF0dGFja1R5cGUgJiYgdGhpcy5wb2lzb24pIHtcbiAgICAgIHNldC5hZGQoMCk7XG4gICAgfVxuICAgIGNvbnN0IHJlcGxhY2VtZW50ID0gdGhpcy5zcGF3bmVkUmVwbGFjZW1lbnQoKTtcbiAgICBpZiAocmVwbGFjZW1lbnQgaW5zdGFuY2VvZiBNb25zdGVyKSByZXBsYWNlbWVudC5hZGRTdGF0dXNFZmZlY3RzKHNldCk7XG4gICAgY29uc3QgY2hpbGQgPSB0aGlzLnNwYXduZWRDaGlsZCgpO1xuICAgIGlmIChjaGlsZCBpbnN0YW5jZW9mIE1vbnN0ZXIpIGNoaWxkLmFkZFN0YXR1c0VmZmVjdHMoc2V0KTtcbiAgfVxuXG4gIHN0YXR1c0RpZmZpY3VsdHkoKTogRGlmZmljdWx0eUZhY3RvciB7XG4gICAgY29uc3Qgc2V0ID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgdGhpcy5hZGRTdGF0dXNFZmZlY3RzKHNldCk7XG4gICAgbGV0IHJlc3VsdCA9IDA7XG4gICAgZm9yIChjb25zdCBzdGF0dXMgb2Ygc2V0KSB7XG4gICAgICByZXN1bHQgKz0gU1RBVFVTX0RJRkZJQ1VMVFlbc3RhdHVzXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdCBhcyBEaWZmaWN1bHR5RmFjdG9yO1xuICB9XG5cbiAgaW1tdW5pdGllcygpOiBEaWZmaWN1bHR5RmFjdG9yIHtcbiAgICBsZXQgY291bnQgPSAwO1xuICAgIGxldCBlbGVtcyA9IHRoaXMuZWxlbWVudHM7XG4gICAgd2hpbGUgKGVsZW1zKSB7XG4gICAgICBpZiAoZWxlbXMgJiAxKSBjb3VudCsrO1xuICAgICAgZWxlbXMgPj4+PSAxO1xuICAgIH1cbiAgICByZXR1cm4gKGNvdW50ICYmIDEgPDwgKGNvdW50IC0gMSkpIGFzIERpZmZpY3VsdHlGYWN0b3I7XG4gIH1cblxuICBtb3ZlbWVudCgpOiBEaWZmaWN1bHR5RmFjdG9yIHtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0RGlmZmljdWx0eShcbiAgICAgICAgbSA9PiB7XG4gICAgICAgICAgY29uc3QgYWN0aW9uRGF0YSA9IHRoaXMucm9tLm9iamVjdEFjdGlvbnNbbS5hY3Rpb25dO1xuICAgICAgICAgIGNvbnN0IGNoaWxkID0gbS5zcGF3bmVkQ2hpbGQoKTtcbiAgICAgICAgICBsZXQgcmVzdWx0ID0gbS5leHRyYURpZmZpY3VsdHk7XG4gICAgICAgICAgaWYgKGFjdGlvbkRhdGEpIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSAoYWN0aW9uRGF0YS5kYXRhLm1vdmVtZW50IHx8IDApO1xuICAgICAgICAgICAgaWYgKGFjdGlvbkRhdGEuZGF0YS5sYXJnZSkgcmVzdWx0Kys7XG4gICAgICAgICAgICAvLyBOT1RFOiBNb3RoUmVzaWR1ZVNvdXJjZSBoYXMgc3RhdHVzRGlmZmljdWx0eSBidXQgbm90IHN0YXR1c0VmZmVjdC5cbiAgICAgICAgICAgIGlmIChjaGlsZCAmJiAhY2hpbGQuc3RhdHVzRWZmZWN0KSB7XG4gICAgICAgICAgICAgIHJlc3VsdCArPSAoYWN0aW9uRGF0YS5kYXRhLnByb2plY3RpbGUgfHwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gU2hhZG93cyBnZXQgKzIsIGFjdGlvbiAkMjYgdHJpZ2dlcnMgdGhpcyBvbiBtZXRhc3ByaXRlICRhN1xuICAgICAgICAgIGlmICh0aGlzLm1ldGFzcHJpdGUgPT09IDB4YTcpIHJlc3VsdCArPSAyO1xuXG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSwgKGEsIGIpID0+IGEgKyBiKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgYSBudW1iZXIgMC4uNiBvciBzb1xuICB0b3RhbFJld2FyZCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnRvdGFsRGlmZmljdWx0eSgpIC8gNDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgbnVtYmVyIGZyb20gMCB0byAxNSwgcmVwcmVzZW50aW5nIERHTEQvMiwgb3IgMCBmb3Igbm8gZ29sZC5cbiAgICovXG4gIG5vcm1hbGl6ZWRHb2xkKCk6IG51bWJlciB7XG4gICAgaWYgKCF0aGlzLndlYWx0aCkgcmV0dXJuIDA7XG4gICAgLy8gQXZlcmFnZSBkaWZmaWN1bHR5IGlzIDEwLCBhdmVyYWdlIHdlYWx0aCBpcyAwLjUgPT4gMyBpcyBhdmVyYWdlIGRnbGQuXG4gICAgLy8gTWF4IGRpZmZpY3VsdHkgb2YgMjUsIHdpdGggd2VhbHRoIG9mIDEgPT4gMTUgZGdsZC5cbiAgICBjb25zdCBkZ2xkID0gdGhpcy50b3RhbERpZmZpY3VsdHkoKSAqIHRoaXMud2VhbHRoICogMC42O1xuICAgIHJldHVybiBNYXRoLm1heCgxLCBNYXRoLm1pbigxNSwgTWF0aC5yb3VuZChkZ2xkKSkpO1xuICB9XG5cbiAgLyoqIFJldHVybnMgYSBudW1iZXIgZnJvbSAwIHRvIDI1NSwgcmVwcmVzZW50aW5nIFNFWFAvMzIuICovXG4gIG5vcm1hbGl6ZWRFeHAoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy53ZWFsdGggPT09IDEpIHJldHVybiAwO1xuICAgIC8vIEF2ZyBkaWZmaWN1bHR5IDEwLCB3ZWFsdGggMC41ID0+IHNleHAgMS43NjhcbiAgICAvLyBTbGltZSBkaWZmaWN1bHR5IDQsIHdlYWx0aCAwLjUgPT4gc2V4cCAxXG4gICAgLy8gTWF4IGRpZmZpY3VsdHkgMjUsIHdlYWx0aCAwID0+IHNleHAgNi44ODggPT4gMjIwIC8gMzJcbiAgICBjb25zdCBzZXhwID0gMC40ODggKyB0aGlzLnRvdGFsRGlmZmljdWx0eSgpICogKDEgLSB0aGlzLndlYWx0aCkgKiAwLjI1NjtcbiAgICByZXR1cm4gTWF0aC5tYXgoMSwgTWF0aC5taW4oMjU1LCBNYXRoLnJvdW5kKHNleHAgKiAzMikpKTtcbiAgfVxuXG4gIC8vIC8qKiBDb25maWd1cmVzIGEgc3Bhd24gYmFzZWQgb24gdGhlIGNob3NlbiBiYW5rcyBmb3IgYSBsb2NhdGlvbi4gKi9cbiAgLy8gY29uZmlndXJlKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gIC8vICAgaWYgKCF0aGlzLnNoaWZ0UGF0dGVybnMpIHJldHVybjtcbiAgLy8gICBpZiAodGhpcy5zaGlmdFBhdHRlcm5zLmhhcyhsb2NhdGlvbi5zcHJpdGVQYWxldHRlc1swXSkpIHNwYXduLnBhdHRlcm5CYW5rID0gMDtcbiAgLy8gICBpZiAodGhpcy5zaGlmdFBhdHRlcm5zLmhhcyhsb2NhdGlvbi5zcHJpdGVQYWxldHRlc1sxXSkpIHNwYXduLnBhdHRlcm5CYW5rID0gMTtcbiAgLy8gfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiBgTW9uc3RlciAkJHtoZXgodGhpcy5pZCl9ICR7dGhpcy5uYW1lfWA7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvY2Vzc0V4cFJld2FyZChyYXc6IG51bWJlcik6IG51bWJlciB7XG4gIHJldHVybiByYXcgPCAxMjggPyByYXcgOiAocmF3ICYgMHg3ZikgPDwgNDtcbn1cblxuZnVuY3Rpb24gYmFzZWxpbmVFeHAoc2NhbGluZzogbnVtYmVyKTogbnVtYmVyIHtcbiAgcmV0dXJuIDIgKiogKHNjYWxpbmcgLyA1IC0gMSk7XG59XG5cbmNvbnN0IFNUQVRVU19ESUZGSUNVTFRZOiBudW1iZXJbXSA9IFtcbiAgMiwgLy8gMCBwb2lzb24gKGhhbmRsZWQgc3BlY2lhbClcbiAgMSwgLy8gMSBwYXJhbHlzaXNcbiAgMywgLy8gMiBzdG9uZVxuICAyLCAvLyAzIG1wIGRyYWluXG4gIDQsIC8vIDQgY3Vyc2Vcbl07XG5cbmNvbnN0IFZBTklMTEFfR09MRF9EUk9QUyA9IFtcbiAgICAwLCAgIDEsICAgMiwgICA0LCAgIDgsICAxNiwgIDMwLCAgNTAsXG4gIDEwMCwgMjAwLCA0MDAsICA1MCwgMTAwLCAyMDAsIDQwMCwgNTAwLFxuXTtcblxuZnVuY3Rpb24gYmFzZWxpbmVHb2xkKHNjYWxpbmc6IG51bWJlcik6IG51bWJlciB7XG4gIC8vIFRvIGNvbnZlcnQgYSBzY2FsaW5nIGZhY3RvciB0byBER0xELCBub3RlIHRoYXQgcGF0Y2hlZCBnb2xkIGRyb3BzIHNjYWxlIGJ5XG4gIC8vIHRoZSBnb2xkZW4gcmF0aW8gKDEuNjE4KS4uLj9cbiAgcmV0dXJuIDIgKiogKHNjYWxpbmcgLyA3IC0gMSk7XG59XG5cbi8vIEdvbGQgYW5kIEV4cGVyaWVuY2Ugc2NhbGluZzpcbi8vICAtIGdvYWw6IGJhc2UgZXhwIHNob3VsZCBiZSByb3VnaGx5IDEgYXQgMCBhbmQgMTAwMCBhcm91bmQgNDAtNDhcbi8vICAgICAgICAgIHZhcmlhbmNlIHdpdGhpbiBhIGRpZmZpY3VsdHkgbGV2ZWw6IGZhY3RvciBvZiA4P1xuLy8gICAgICAgICAgc28gaWYgd2Ugd2FudCB0byBzdGFydCBzYXR1cmF0aW5nIGFyb3VuZCA0NCwgdGhlbiB3ZVxuLy8gICAgICAgICAgc2hvdWxkIHNob290IGZvciBhIGJhc2Ugb2YgMjU2IGF0IDQ1LFxuLy8gICAgICAgICAgTWF5YmUgc2xvdyBkb3duIHRoZSBncm93dGggdG8gMS81LCBzbyB0aGF0IHdlJ3JlIGF0IDAuNSBhdCAwP1xuLy8gICAgICAgICAgYmFzZSA9IDJeKHMvNS0xKVxuLy8gICAgICAgICAgc2NhbGUgZmFjdG9yID0gMC4uOCBmb3IgdmFyaW91cyBub3JtYWwgZW5lbWllcywgMTZpc2ggZm9yIGJvc3Nlcy5cbi8vICAtIGdvYWw6IGJhc2UgZ29sZCBzaG91bGQgYmUgMC41IGF0IDAgYW5kIDUwIGF0IDQ3IChpbiB2YW5pbGxhIHVuaXRzKS5cbi8vICAgICAgICAgIGJhc2UgPSAyXihzLzctMSlcbi8vIFRoaXMgbWFrZXMgdGhlIGF2ZXJhZ2UgXCJ3ZWFsdGhcIiAoZGVmaW5lZCBhcyBzZ2xkIC8gKHNleHAgKyBzZ2xkKSkgdG9cbi8vIGF2ZXJhZ2Ugcm91Z2hseSAwLjUgYXQgYWxsIGRpZmZpY3VsdHkgbGV2ZWxzLlxuXG4vLyBERUFUSCBSRVBMQUNFTUVOVFMuLi4/XG5cblxuXG4vLyBTY2FsaW5nIGZvcm11bGFzXG5mdW5jdGlvbiBsZXZlbChzY2FsaW5nOiBudW1iZXIpOiBudW1iZXIge1xuICAvLyBUT0RPIC0gbm90IHN1cGVyIHVzZWZ1bC4uLj9cbiAgLy8gU2VlbXMgbGlrZSBJIGFjdHVhbGx5IHdhbnQgdGhlIGxldmVsLCBub3QgdGhlIHNjYWxpbmcuXG4gIC8vIDctb2ZmIGNvbXByZXNzaW9tXG4gIHJldHVybiBzY2FsaW5nIDwgMjQgPyAxICsgc2NhbGluZyAvIDMgOiAoc2NhbGluZyArIDEyKSAvIDQ7XG59XG5cbi8qKiBCZXN0IHN3b3JkIG93bmVkIGJ5IHBsYXllciBhdCBnaXZlbiAodmFuaWxsYSBlcXVpdmFsZW50KSBzY2FsaW5nLiAqL1xuZnVuY3Rpb24gcGxheWVyU3dvcmQoc2NhbGluZzogbnVtYmVyLCBlbGVtZW50czogbnVtYmVyID0gMCk6IG51bWJlciB7XG4gIGNvbnN0IGJlc3RPd25lZCA9IHNjYWxpbmcgPCAxMCA/IDEgOiBzY2FsaW5nIDwgMTggPyAyIDogc2NhbGluZyA8IDM4ID8gNCA6IDg7XG4gIGZvciAobGV0IGkgPSBiZXN0T3duZWQ7IGk7IGkgPj4+PSAxKSB7XG4gICAgaWYgKCEoaSAmIGVsZW1lbnRzKSkgcmV0dXJuIGkgPDwgMTtcbiAgfVxuICByZXR1cm4gYmVzdE93bmVkIDw8IDE7XG59XG5cbi8qKiBFeHBlY3RlZCB0b3RhbCBkZWZlbnNlLiAqL1xuZnVuY3Rpb24gZXhwZWN0ZWRQbGF5ZXJEZWZlbnNlKHNjYWxpbmc6IG51bWJlciwgYXR0YWNrVHlwZTogbnVtYmVyKTogbnVtYmVyIHtcbiAgcmV0dXJuIGxldmVsKHNjYWxpbmcpICsgcGxheWVyQXJtb3Ioc2NhbGluZywgYXR0YWNrVHlwZSk7XG59XG5cbi8qKiBFeHBlY3RlZCBhcm1vci9zaGllbGQgZGVmZW5zZSBhdCBnaXZlbiBzY2FsaW5nLiAqL1xuZnVuY3Rpb24gcGxheWVyQXJtb3Ioc2NhbGluZzogbnVtYmVyLCBhdHRhY2tUeXBlOiBudW1iZXIpOiBudW1iZXIge1xuICBpZiAoIWF0dGFja1R5cGUpIHsgLy8gYm9keSBkYW1hZ2VcbiAgICByZXR1cm4gbG9va3VwKHNjYWxpbmcsIDIsIFs2LCA2XSwgWzE4LCAxMF0sIFsyNSwgMTRdLCBbMzAsIDE4XSwgWzQwLCAyNF0sIFs0NiwgMzJdKTtcbiAgfSBlbHNlIHsgLy8gcHJvamVjdGlsZSBkYW1hZ2VcbiAgICByZXR1cm4gbG9va3VwKHNjYWxpbmcsIDIsIFs2LCA2XSwgWzE4LCA4XSwgWzI1LCAxMl0sIFszMCwgMThdLCBbMzcsIDI0XSwgWzQyLCAzMl0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGxvb2t1cDxLIGV4dGVuZHMgQ29tcGFyYWJsZSwgVj4oeDogSyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3Q6IFYsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnRhYmxlOiBSZWFkb25seUFycmF5PHJlYWRvbmx5IFtLLCBWXT4pOiBWIHtcbiAgZm9yIChsZXQgaSA9IHRhYmxlLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgY29uc3QgW2ssIHZdID0gdGFibGVbaV07XG4gICAgaWYgKHggPj0gaykgcmV0dXJuIHY7XG4gIH1cbiAgcmV0dXJuIGZpcnN0O1xufVxuXG50eXBlIENvbXBhcmFibGUgPSBudW1iZXIgfCBzdHJpbmc7XG4iXX0=