import { DEBUG_MODE_FLAGS } from './flags/debug-mode.js';
import { EASY_MODE_FLAGS } from './flags/easy-mode.js';
import { GLITCH_FIX_FLAGS } from './flags/glitch-fixes.js';
import { GLITCH_FLAGS } from './flags/glitches.js';
import { HARD_MODE_FLAGS } from './flags/hard-mode.js';
import { ITEM_FLAGS } from './flags/items.js';
import { MONSTER_FLAGS } from './flags/monsters.js';
import { ROUTING_FLAGS } from './flags/routing.js';
import { SHOP_FLAGS } from './flags/shops.js';
import { TWEAK_FLAGS } from './flags/tweaks.js';
import { WORLD_FLAGS } from './flags/world.js';
import { UsageError } from './util.js';
const REPEATABLE_FLAGS = new Set(['S']);
export const PRESETS = [
    {
        title: 'Casual',
        descr: `Basic flags for a relatively easy playthrough.`,
        flags: 'Ds Edmrsx Fw Mr Rp Sc Sk Sm Tab',
    },
    {
        title: 'Intermediate',
        descr: `Slightly more challenge than Casual but still approachable.`,
        flags: 'Ds Edms Fsw Gt Mr Ps Rlpt Sct Skm Tab',
        default: true,
    },
    {
        title: 'Full Shuffle',
        descr: `Slightly harder than intermediate, with full shuffle and no spoiler log.`,
        flags: 'Em Fsw Gt Mert Ps Rlprt Sckmt Tabmp Ww',
    },
    {
        title: 'Glitchless',
        descr: `Full shuffle but with no glitches.`,
        flags: 'Em Fcpstw Mert Ps Rlprt Sckmt Tab Ww',
    },
    {
        title: 'Advanced',
        descr: `A balanced randomization with quite a bit more difficulty.`,
        flags: 'Fsw Gfprt Hbdgw Mert Ps Rloprst Sckt Sm Tabmp Ww',
    },
    {
        title: 'Ludicrous',
        descr: `Pulls out all the stops, may require superhuman feats.`,
        flags: 'Fs Gcfprtw Hbdgmswxz Mert Ps Rloprst Sckmt Tabmp Ww',
    }
];
const PRESETS_BY_KEY = {};
for (const { title, flags } of PRESETS) {
    PRESETS_BY_KEY[`@${title.replace(/ /g, '').toLowerCase()}`] = flags;
}
export const FLAGS = [
    ITEM_FLAGS, WORLD_FLAGS, MONSTER_FLAGS, SHOP_FLAGS, HARD_MODE_FLAGS,
    TWEAK_FLAGS, ROUTING_FLAGS, GLITCH_FLAGS, GLITCH_FIX_FLAGS, EASY_MODE_FLAGS,
    DEBUG_MODE_FLAGS
];
export class FlagSet {
    constructor(str = 'RtGftTab') {
        if (str.startsWith('@')) {
            const expanded = PRESETS_BY_KEY[str.toLowerCase()];
            if (!expanded)
                throw new UsageError(`Unknown preset: ${str}`);
            str = expanded;
        }
        this.flags = {};
        str = str.replace(/[^A-Za-z0-9!]/g, '');
        const re = /([A-Z])([a-z0-9!]+)/g;
        let match;
        while ((match = re.exec(str))) {
            const [, key, value] = match;
            const terms = REPEATABLE_FLAGS.has(key) ? [value] : value;
            for (const term of terms) {
                this.set(key + term, true);
            }
        }
    }
    get(category) {
        return this.flags[category] || [];
    }
    set(flag, value) {
        const key = flag[0];
        const term = flag.substring(1);
        if (!value) {
            const filtered = (this.flags[key] || []).filter(t => t !== term);
            if (filtered.length) {
                this.flags[key] = filtered;
            }
            else {
                delete this.flags[key];
            }
            return;
        }
        this.removeConflicts(flag);
        const terms = (this.flags[key] || []).filter(t => t !== term);
        terms.push(term);
        terms.sort();
        this.flags[key] = terms;
    }
    check(flag) {
        const terms = this.flags[flag[0]];
        return !!(terms && (terms.indexOf(flag.substring(1)) >= 0));
    }
    autoEquipBracelet() {
        return this.check('Ta');
    }
    buffDeosPendant() {
        return this.check('Tb');
    }
    leatherBootsGiveSpeed() {
        return this.check('Tb');
    }
    rabbitBootsChargeWhileWalking() {
        return this.check('Tb');
    }
    randomizeMusic() {
        return this.check('Tm');
    }
    shuffleSpritePalettes() {
        return this.check('Tp');
    }
    shuffleMonsters() {
        return this.check('Mr');
    }
    shuffleShops() {
        return this.check('Ps');
    }
    bargainHunting() {
        return this.shuffleShops();
    }
    shuffleTowerMonsters() {
        return this.check('Mt');
    }
    shuffleMonsterElements() {
        return this.check('Me');
    }
    shuffleBossElements() {
        return this.shuffleMonsterElements();
    }
    doubleBuffMedicalHerb() {
        return this.check('Em');
    }
    buffMedicalHerb() {
        return !this.check('Hm');
    }
    decreaseEnemyDamage() {
        return this.check('Ed');
    }
    neverDie() {
        return this.check('Di');
    }
    chargeShotsOnly() {
        return this.check('Hc');
    }
    barrierRequiresCalmSea() {
        return this.check('Rl');
    }
    paralysisRequiresPrisonKey() {
        return this.check('Rl');
    }
    sealedCaveRequiresWindmill() {
        return this.check('Rl');
    }
    connectLimeTreeToLeaf() {
        return this.check('Rp');
    }
    storyMode() {
        return this.check('Rs');
    }
    requireHealedDolphinToRide() {
        return this.check('Rd');
    }
    saharaRabbitsRequireTelepathy() {
        return this.check('Rr');
    }
    teleportOnThunderSword() {
        return this.check('Rt');
    }
    orbsOptional() {
        return this.check('Ro');
    }
    randomizeTrades() {
        return this.check('Wt');
    }
    unidentifiedItems() {
        return this.check('Wu');
    }
    randomizeWalls() {
        return this.check('Ww');
    }
    guaranteeSword() {
        return this.check('Es');
    }
    guaranteeSwordMagic() {
        return !this.check('Hw');
    }
    guaranteeMatchingSword() {
        return !this.check('Hs');
    }
    guaranteeGasMask() {
        return !this.check('Hg');
    }
    guaranteeBarrier() {
        return !this.check('Hb');
    }
    guaranteeRefresh() {
        return this.check('Er');
    }
    disableSwordChargeGlitch() {
        return this.check('Fc');
    }
    disableTeleportSkip() {
        return this.check('Fp');
    }
    disableRabbitSkip() {
        return this.check('Fr');
    }
    disableShopGlitch() {
        return this.check('Fs');
    }
    disableStatueGlitch() {
        return this.check('Ft');
    }
    assumeSwordChargeGlitch() {
        return this.check('Gc');
    }
    assumeGhettoFlight() {
        return this.check('Gf');
    }
    assumeTeleportSkip() {
        return this.check('Gp');
    }
    assumeRabbitSkip() {
        return this.check('Gr');
    }
    assumeStatueGlitch() {
        return this.check('Gt');
    }
    assumeTriggerGlitch() {
        return false;
    }
    assumeWildWarp() {
        return this.check('Gw');
    }
    nerfWildWarp() {
        return this.check('Fw');
    }
    allowWildWarp() {
        return !this.nerfWildWarp();
    }
    randomizeWildWarp() {
        return this.check('Tw');
    }
    blackoutMode() {
        return this.check('Hz');
    }
    hardcoreMode() {
        return this.check('Hh');
    }
    buffDyna() {
        return this.check('Hd');
    }
    expScalingFactor() {
        return this.check('Hx') ? 0.25 : this.check('Ex') ? 2.5 : 1;
    }
    removeConflicts(flag) {
        const re = this.exclusiveFlags(flag);
        if (!re)
            return;
        for (const key in this.flags) {
            if (!this.flags.hasOwnProperty(key))
                continue;
            const terms = this.flags[key].filter(t => !re.test(key + t));
            if (terms.length) {
                this.flags[key] = terms;
            }
            else {
                delete this.flags[key];
            }
        }
    }
    toStringKey(key) {
        if (REPEATABLE_FLAGS.has(key)) {
            return [...this.flags[key]].sort().map(v => key + v).join(' ');
        }
        return key + [...this.flags[key]].sort().join('');
    }
    exclusiveFlags(flag) {
        if (flag.startsWith('S')) {
            return new RegExp(`S.*[${flag.substring(1)}]`);
        }
        var flagForName = this.getFlagForName(flag);
        return flagForName.conflict;
    }
    getFlagForName(flag) {
        const matchingFlagSection = FLAGS.find(flagSection => {
            return flag.startsWith(flagSection.prefix);
        });
        return matchingFlagSection
            .flags.find(flagToMatch => flagToMatch.flag === flag);
    }
    toString() {
        const keys = Object.keys(this.flags);
        keys.sort();
        return keys.map(k => this.toStringKey(k)).join(' ');
    }
}
//# sourceMappingURL=flagset.js.map