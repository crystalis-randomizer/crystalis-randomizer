import { Constraint } from './constraint.js';
import { ObjectData } from './objectdata.js';
export class Monster extends ObjectData {
    constructor(rom, [name, id, scaling, adjustments = {}]) {
        super(rom, id);
        this.constraint = Constraint.ALL;
        this.name = name;
        const expectedLevel = (level(scaling) + this.level) / 2;
        const expectedAttack = expectedLevel + playerSword(scaling, this.elements);
        this.hits = (this.hp + 1) / (expectedAttack - this.def);
        this.sdef = this.def / expectedAttack;
        const expectedPlayerHP = Math.min(255, Math.max(16, 32 + expectedLevel * 16));
        this.satk = (this.atk - expectedPlayerDefense(scaling, this.attackType)) / expectedPlayerHP;
        this.extraDifficulty = adjustments.difficulty || 0;
        const vsExp = processExpReward(this.expReward) / baselineExp(scaling);
        const vsGld = VANILLA_GOLD_DROPS[this.goldDrop] / baselineGold(scaling);
        this.wealth = vsGld && vsGld / (vsExp + vsGld);
    }
    totalDifficulty() {
        return this.toughness() + this.attack() + this.statusDifficulty() +
            this.immunities() + this.movement();
    }
    collectDifficulty(f, r) {
        let result = f(this);
        const child = this.spawnedChild();
        if (child)
            result = r(result, child.collectDifficulty(f, r));
        const death = this.spawnedReplacement();
        if (death)
            result = r(result, death.collectDifficulty(f, r));
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
        if (replacement)
            replacement.addStatusEffects(set);
        const child = this.spawnedChild();
        if (child)
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
            const actionData = ACTION_SCRIPTS.get(m.action);
            const child = m.spawnedChild();
            let result = m.extraDifficulty;
            if (actionData) {
                result += (actionData.movement || 0);
                if (actionData.large)
                    result++;
                if (child && !child.statusEffect)
                    result += (actionData.projectile || 0);
            }
            if (this.metasprite === 0xa7)
                result += 2;
            return result;
        }, (a, b) => a + b);
    }
    spawnedChild() {
        const data = ACTION_SCRIPTS.get(this.action);
        if (!data || !data.child)
            return undefined;
        const spawn = this.rom.adHocSpawns[this.child];
        const spawnId = spawn && spawn.objectId;
        if (spawnId == null)
            return undefined;
        const obj = this.rom.objects[spawnId];
        return obj instanceof Monster ? obj : undefined;
    }
    spawnedReplacement() {
        if (!this.replacement)
            return undefined;
        const obj = this.rom.objects[this.replacement];
        return obj instanceof Monster ? obj : undefined;
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
export const ACTION_SCRIPTS = new Map([
    [0x10, {}],
    [0x11, {}],
    [0x16, {}],
    [0x17, {}],
    [0x1b, {}],
    [0x1e, {}],
    [0x1f, {}],
    [0x20, {
            movement: 1,
        }],
    [0x21, {
            child: true,
            large: true,
            movement: 2,
        }],
    [0x22, {
            child: true,
            movement: 3,
        }],
    [0x24, {
            movement: 3,
        }],
    [0x25, {
            movement: 3,
        }],
    [0x26, {
            child: true,
            projectile: 1,
            movement: 3,
        }],
    [0x27, {
            child: true,
            projectile: 1,
            movement: 3,
        }],
    [0x28, {
            child: true,
            projectile: 2,
            movement: 3,
            metasprites: () => [0x65, 0x91],
        }],
    [0x29, {
            child: true,
            movement: 5,
            metasprites: () => [0x6b, 0x68],
        }],
    [0x2a, {
            child: true,
            projectile: 1,
            movement: 4,
            metasprites: (o) => [0, 1, 2, 3].map(x => x + o.data[31]),
        }],
    [0x2b, {
            movement: 4,
        }],
    [0x2c, {
            child: true,
        }],
    [0x2e, {
            child: true,
            large: true,
            projectile: 2,
            movement: 3,
        }],
    [0x2f, {}],
    [0x34, {
            child: true,
        }],
    [0x38, {}],
    [0x3c, {}],
    [0x40, {
            child: true,
            moth: true,
            movement: 4,
        }],
    [0x41, {
            child: true,
            movement: 3,
        }],
    [0x44, {
            movement: 3,
        }],
    [0x45, {
            child: true,
            bird: true,
            projectile: 2,
            movement: 5,
        }],
    [0x4c, {
            child: true,
            stationary: true,
            projectile: 3,
        }],
    [0x4d, {
            child: true,
            stationary: true,
            projectile: 3,
        }],
    [0x4e, {
            child: true,
            stationary: true,
        }],
    [0x57, {}],
    [0x58, {}],
    [0x5c, {
            child: true,
            projectile: 3,
            movement: 1,
        }],
    [0x5d, {
            bird: true,
            movement: 6,
        }],
    [0x5e, {
            child: true,
            projectile: 1,
            movement: 4,
            metasprites: (o) => [0, 1, 2, 3].map(x => x + o.data[31]),
        }],
    [0x60, {
            boss: true,
        }],
    [0x61, {}],
    [0x63, {
            boss: true,
        }],
    [0x64, {
            boss: true,
        }],
    [0x66, {
            boss: true,
        }],
    [0x67, {
            boss: true,
        }],
    [0x68, {
            boss: true,
        }],
    [0x6a, {
            boss: true,
        }],
    [0x6b, {
            boss: true,
        }],
    [0x70, {
            boss: true,
        }],
    [0x7f, {
            boss: true,
        }],
]);
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
//# sourceMappingURL=monster.js.map