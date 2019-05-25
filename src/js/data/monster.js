const VANILLA_SWORDS = [2, 2, 2, 2, 4, 4, 4, 8, 8, 8, 8, 16, 16, 16, 16, 16];
const ACTION_DIFFICULTY = {
    0x20: () => 1,
    0x21: () => 3,
    0x22: (o) => 3,
    0x24: () => 3,
    0x25: () => 3,
    0x26: (o) => o.isShadow() ? 4 : 2,
    0x27: () => 2,
    0x28: () => 3,
    0x29: () => 5,
};
const {} = { VANILLA_SWORDS, ACTION_DIFFICULTY };
export function generate(rom, flags, random) {
    const {} = { rom, flags, random };
    const out = [];
    const player = {
        armor: 2,
        level: 1,
        shield: 2,
        sword: 2,
    };
    function base(id, name, adj = {}) {
        const o = rom.objects[id];
        let { action, immobile, level, atk, def, hp, elements, goldDrop, expReward, statusEffect } = o;
        level = player.level;
        let sword = player.sword;
        while (sword > 1 && (elements & (sword >>> 1))) {
            sword >>>= 1;
        }
        if (adj.vanillaSword)
            sword = adj.vanillaSword;
        const patk = sword + level;
        const vanillaHits = Math.floor((hp + 1) / (patk - def));
        const hits = adj.hits || vanillaHits;
        const sdef = adj.sdef != null ? adj.sdef : def / patk;
        const php = Math.min(255, 32 + 16 * level);
        const pdef = o.attackType ? player.shield : player.armor;
        const vanillaDamage = Math.max(0, atk - level - pdef) / php;
        const satk = adj.satk != null ? adj.satk : vanillaDamage;
        const {} = { sdef, satk, hits, immobile, goldDrop, expReward, statusEffect };
        const m = { id, name };
        m.id = id;
        m.name = name;
        m.type = 'monster';
        m.action = action;
        m.count = 0;
        out.push(m);
    }
    function monster(...x) {
        base(0, '');
    }
    monster(0x50, 'Blue Slime', 0x20, 6, {
        hits: 1, satk: 16, dgld: 2, sexp: 32,
        must: and(pat(0x64), pal(2, 0x21)),
    });
    monster(0x51, 'Weretiger', 0x24, 7, {
        hits: 1.5, satk: 21, dgld: 4, sexp: 40,
        must: and(pat(0x60), pal(3, 0x20)),
    });
    monster(0x52, 'Green Jelly', 0x20, 10, {
        sdef: 4, hits: 3, satk: 16, dgld: 4, sexp: 36,
        must: and(pat(0x65), pal(2, 0x22)),
    });
    monster(0x53, 'Red Slime', 0x20, 16, {
        sdef: 6, hits: 4, satk: 16, dgld: 4, sexp: 48,
        must: and(pat(0x64), pal(2, 0x23)),
    });
    return out;
}
function and(x, y) {
    return [];
}
function pat(id) {
    return [];
}
function pal(which, id) {
    return [];
}
const {} = { and, pat, pal };
//# sourceMappingURL=monster.js.map