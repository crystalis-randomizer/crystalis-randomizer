import { DefaultMap } from '../util.js';
import { ACTION_SCRIPTS, Monster } from './monster.js';
import { Constraint } from './constraint.js';
export class Graphics {
    constructor(rom) {
        this.rom = rom;
        this.monsterConstraints = new Map();
        this.npcConstraints = new Map();
        const allSpawns = new DefaultMap(() => []);
        for (const l of rom.locations) {
            if (!l.used)
                continue;
            for (let i = 0; i < l.spawns.length; i++) {
                const s = l.spawns[i];
                if (!s.used)
                    continue;
                if (s.isMonster()) {
                    allSpawns.get(s.monsterId).push([l, i, s]);
                }
                else if (s.isNpc()) {
                    allSpawns.get(~s.id).push([l, i, s]);
                }
            }
        }
        for (const [m, spawns] of allSpawns) {
            if (m < 0) {
                const metasprite = rom.metasprites[rom.npcs[~m].data[3]];
                if (!metasprite)
                    throw new Error(`bad NPC: ${~m}`);
                let constraint = computeConstraint(rom, [rom.npcs[~m].data[3]], spawns, true);
                if (~m === 0x5f)
                    constraint = constraint.ignorePalette();
                this.npcConstraints.set(~m, constraint);
            }
            else {
                let constraint = Constraint.ALL;
                const parent = this.rom.objects[m];
                if (!(parent instanceof Monster)) {
                    throw new Error(`expected monster: ${parent} from ${spawns}`);
                }
                for (const obj of allObjects(rom, parent)) {
                    const action = ACTION_SCRIPTS.get(obj.action);
                    const metaspriteFn = action && action.metasprites || (() => [obj.metasprite]);
                    const child = computeConstraint(rom, metaspriteFn(obj), spawns, obj.id === m);
                    const meet = constraint.meet(child);
                    if (!meet)
                        throw new Error(`Bad meet for ${m} with ${obj.id}`);
                    if (meet)
                        constraint = meet;
                }
                this.monsterConstraints.set(parent.id, constraint);
                parent.constraint = constraint;
            }
        }
    }
    configure(location, spawn) {
        const c = spawn.isMonster() ? this.monsterConstraints.get(spawn.monsterId) :
            spawn.isNpc() ? this.npcConstraints.get(spawn.id) :
                spawn.isChest() ? (spawn.id < 0x70 ? Constraint.TREASURE_CHEST :
                    Constraint.MIMIC) :
                    undefined;
        if (!c)
            return;
        if (c.shift === 3 || c.float.length >= 2) {
            throw new Error(`don't know what to do with two floats`);
        }
        else if (!c.float.length) {
            spawn.patternBank = Number(c.shift === 2);
        }
        else if (c.float[0].has(location.spritePatterns[0])) {
            spawn.patternBank = 0;
        }
        else if (c.float[0].has(location.spritePatterns[1])) {
            spawn.patternBank = 1;
        }
        else if (spawn.isMonster()) {
            throw new Error(`no matching pattern bank`);
        }
    }
}
function* allObjects(rom, parent) {
    yield parent;
    const repl = parent.spawnedReplacement();
    if (repl)
        yield* allObjects(rom, repl);
    const child = parent.spawnedChild();
    if (child)
        yield* allObjects(rom, child);
    if (parent.id === 0x50)
        yield rom.objects[0x5f];
    if (parent.id === 0x53)
        yield rom.objects[0x69];
}
function computeConstraint(rom, metaspriteIds, spawns, shiftable) {
    const patterns = new Set();
    const palettes = new Set();
    for (const metasprite of metaspriteIds.map(s => rom.metasprites[s])) {
        for (const p of metasprite.palettes()) {
            palettes.add(p);
        }
        for (const p of metasprite.patternBanks()) {
            patterns.add(p);
        }
    }
    shiftable = shiftable && patterns.size == 1 && [...patterns][0] === 2;
    const locs = new Map();
    for (const [l, , spawn] of spawns) {
        locs.set(spawn.patternBank && shiftable ? ~l.id : l.id, spawn);
    }
    let child = undefined;
    for (let [l, spawn] of locs) {
        const loc = rom.locations[l < 0 ? ~l : l];
        const c = Constraint.fromSpawn(palettes, patterns, loc, spawn, shiftable);
        child = child ? child.join(c) : c;
    }
    if (!child)
        throw new Error(`Expected child to appear`);
    return child;
}
//# sourceMappingURL=graphics.js.map