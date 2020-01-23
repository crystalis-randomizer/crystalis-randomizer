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
        descr: `Basic flags for a relatively easy playthrough.
            Note that statue glitch may be required.`,
        flags: 'Ds Edmrsx Fw Gt Mr Rpt Sct Skm Tab',
    },
    {
        title: 'Standard',
        descr: `Standard flags with full item shuffle.`,
        flags: 'Ds Emrs Fcprsw Gt Hd Mr Ps Ropst Sckmt Tab',
        default: true,
    },
    {
        title: 'Advanced',
        descr: `Advanced flags with all logic glitches in play.`,
        flags: 'Em Fsw Gcfprt Hbdw Mert Ps Ropst Sckmt Tab Wtu',
    },
    {
        title: 'Full Shuffle',
        descr: `Randomizes as much as possible.`,
        flags: 'Emr Fcprsw Gt Hd Mert Ps Ropst Sckmt Tabmp Wmtuw',
    },
    {
        title: 'Wild Warp',
        descr: `Opens up the whole world from the start.
            Progression could be anywhere.`,
        flags: 'Emr Fcprs Gtw Hd Mert Ps Ropst Sckmt Tab',
    },
    {
        title: 'Hardcore',
        descr: 'Not for the faint of heart. Good luck...',
        flags: 'Fcprsw Gt Hbdhwx Mert Ps Ropst Sckmt Tab Wmtuw',
    },
    {
        title: 'The Full Stupid',
        descr: 'Nobody has ever completed this.',
        flags: 'Fcprsw Gt Hbdhmwxz Mert Ps Ropst Sckmt Tab Wmtuw',
    },
    {
        title: 'Tournament: Swiss Round',
        descr: 'Quick-paced full-shuffle flags for Swiss round of 2019 Tournament',
        flags: 'Es Fcprsw Gt Hd Mr Ps Rpt Sckmt Tab',
    },
    {
        title: 'Tournament: Elimination Round',
        descr: 'More thorough flags for the first elimination rounds of the 2019 Tournament',
        flags: 'Em Fprsw Gft Hbd Mer Ps Rprst Sckmt Tab Wt',
    },
    {
        title: 'Tournament: Semifinals',
        descr: 'Advanced flags for semifinal round of the 2019 Tournament',
        flags: 'Em Fsw Gft Hbd Mert Ps Roprst Sckmt Tab Wt',
    },
    {
        title: 'Tournament: Finals',
        descr: 'Expert flags for finals round of the 2019 Tournament',
        flags: 'Fsw Gfprt Hbdw Mert Ps Roprst Sckmt Tab Wmtw',
    },
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
    changeGasMaskToHazmatSuit() {
        return this.check('Tb');
    }
    slowDownTornado() {
        return this.check('Tb');
    }
    leatherBootsGiveSpeed() {
        return this.check('Tb');
    }
    rabbitBootsChargeWhileWalking() {
        return this.check('Tb');
    }
    controllerShortcuts() {
        return !this.check('Tc');
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
    trainer() {
        return this.check('Dt');
    }
    neverDie() {
        return this.check('Di');
    }
    chargeShotsOnly() {
        return this.check('Hc');
    }
    barrierRequiresCalmSea() {
        return true;
    }
    paralysisRequiresPrisonKey() {
        return true;
    }
    sealedCaveRequiresWindmill() {
        return true;
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
    randomizeMaps() {
        return this.check('Wm');
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
        const flagForName = this.getFlagForName(flag);
        if (flagForName == null)
            throw new Error(`Unknown flag: ${flag}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3NldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy9mbGFnc2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ3ZELE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSxzQkFBc0IsQ0FBQztBQUVyRCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUN6RCxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFDakQsT0FBTyxFQUFDLGVBQWUsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBQ3JELE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUM1QyxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFDbEQsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUM1QyxPQUFPLEVBQUMsV0FBVyxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDOUMsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzdDLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFckMsTUFBTSxnQkFBZ0IsR0FBZ0IsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRXJELE1BQU0sQ0FBQyxNQUFNLE9BQU8sR0FBYTtJQUMvQjtRQUNFLEtBQUssRUFBRSxRQUFRO1FBQ2YsS0FBSyxFQUFFO3FEQUMwQztRQUNqRCxLQUFLLEVBQUUsb0NBQW9DO0tBQzVDO0lBQ0Q7UUFDRSxLQUFLLEVBQUUsVUFBVTtRQUNqQixLQUFLLEVBQUUsd0NBQXdDO1FBQy9DLEtBQUssRUFBRSw0Q0FBNEM7UUFDbkQsT0FBTyxFQUFFLElBQUk7S0FDZDtJQUNE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QyxJQUFZO1FBQ2pDLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUNuRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzdDLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBMkIsbUJBQW9CO2FBQzFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFRCxRQUFRO1FBQ04sTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1osT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0RCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0RFQlVHX01PREVfRkxBR1N9IGZyb20gJy4vZmxhZ3MvZGVidWctbW9kZS5qcyc7XG5pbXBvcnQge0VBU1lfTU9ERV9GTEFHU30gZnJvbSAnLi9mbGFncy9lYXN5LW1vZGUuanMnO1xuaW1wb3J0IHtGbGFnLCBGbGFnU2VjdGlvbiwgUHJlc2V0fSBmcm9tICcuL2ZsYWdzL2ZsYWcuanMnO1xuaW1wb3J0IHtHTElUQ0hfRklYX0ZMQUdTfSBmcm9tICcuL2ZsYWdzL2dsaXRjaC1maXhlcy5qcyc7XG5pbXBvcnQge0dMSVRDSF9GTEFHU30gZnJvbSAnLi9mbGFncy9nbGl0Y2hlcy5qcyc7XG5pbXBvcnQge0hBUkRfTU9ERV9GTEFHU30gZnJvbSAnLi9mbGFncy9oYXJkLW1vZGUuanMnO1xuaW1wb3J0IHtJVEVNX0ZMQUdTfSBmcm9tICcuL2ZsYWdzL2l0ZW1zLmpzJztcbmltcG9ydCB7TU9OU1RFUl9GTEFHU30gZnJvbSAnLi9mbGFncy9tb25zdGVycy5qcyc7XG5pbXBvcnQge1JPVVRJTkdfRkxBR1N9IGZyb20gJy4vZmxhZ3Mvcm91dGluZy5qcyc7XG5pbXBvcnQge1NIT1BfRkxBR1N9IGZyb20gJy4vZmxhZ3Mvc2hvcHMuanMnO1xuaW1wb3J0IHtUV0VBS19GTEFHU30gZnJvbSAnLi9mbGFncy90d2Vha3MuanMnO1xuaW1wb3J0IHtXT1JMRF9GTEFHU30gZnJvbSAnLi9mbGFncy93b3JsZC5qcyc7XG5pbXBvcnQge1VzYWdlRXJyb3J9IGZyb20gJy4vdXRpbC5qcyc7XG5cbmNvbnN0IFJFUEVBVEFCTEVfRkxBR1M6IFNldDxzdHJpbmc+ID0gbmV3IFNldChbJ1MnXSk7XG5cbmV4cG9ydCBjb25zdCBQUkVTRVRTOiBQcmVzZXRbXSA9IFtcbiAge1xuICAgIHRpdGxlOiAnQ2FzdWFsJyxcbiAgICBkZXNjcjogYEJhc2ljIGZsYWdzIGZvciBhIHJlbGF0aXZlbHkgZWFzeSBwbGF5dGhyb3VnaC5cbiAgICAgICAgICAgIE5vdGUgdGhhdCBzdGF0dWUgZ2xpdGNoIG1heSBiZSByZXF1aXJlZC5gLFxuICAgIGZsYWdzOiAnRHMgRWRtcnN4IEZ3IEd0IE1yIFJwdCBTY3QgU2ttIFRhYicsXG4gIH0sXG4gIHtcbiAgICB0aXRsZTogJ1N0YW5kYXJkJyxcbiAgICBkZXNjcjogYFN0YW5kYXJkIGZsYWdzIHdpdGggZnVsbCBpdGVtIHNodWZmbGUuYCxcbiAgICBmbGFnczogJ0RzIEVtcnMgRmNwcnN3IEd0IEhkIE1yIFBzIFJvcHN0IFNja210IFRhYicsXG4gICAgZGVmYXVsdDogdHJ1ZSxcbiAgfSxcbiAge1xuICAgIC8vIFRPRE86IGFkZCAnSHQnIGZvciBtYXhpbmcgb3V0IHRvd2VyIHNjYWxpbmdcbiAgICB0aXRsZTogJ0FkdmFuY2VkJyxcbiAgICBkZXNjcjogYEFkdmFuY2VkIGZsYWdzIHdpdGggYWxsIGxvZ2ljIGdsaXRjaGVzIGluIHBsYXkuYCxcbiAgICBmbGFnczogJ0VtIEZzdyBHY2ZwcnQgSGJkdyBNZXJ0IFBzIFJvcHN0IFNja210IFRhYiBXdHUnLFxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdGdWxsIFNodWZmbGUnLFxuICAgIGRlc2NyOiBgUmFuZG9taXplcyBhcyBtdWNoIGFzIHBvc3NpYmxlLmAsXG4gICAgZmxhZ3M6ICdFbXIgRmNwcnN3IEd0IEhkIE1lcnQgUHMgUm9wc3QgU2NrbXQgVGFibXAgV210dXcnLFxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdXaWxkIFdhcnAnLFxuICAgIGRlc2NyOiBgT3BlbnMgdXAgdGhlIHdob2xlIHdvcmxkIGZyb20gdGhlIHN0YXJ0LlxuICAgICAgICAgICAgUHJvZ3Jlc3Npb24gY291bGQgYmUgYW55d2hlcmUuYCxcbiAgICBmbGFnczogJ0VtciBGY3BycyBHdHcgSGQgTWVydCBQcyBSb3BzdCBTY2ttdCBUYWInLFxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdIYXJkY29yZScsXG4gICAgZGVzY3I6ICdOb3QgZm9yIHRoZSBmYWludCBvZiBoZWFydC4gR29vZCBsdWNrLi4uJyxcbiAgICBmbGFnczogJ0ZjcHJzdyBHdCBIYmRod3ggTWVydCBQcyBSb3BzdCBTY2ttdCBUYWIgV210dXcnLFxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUaGUgRnVsbCBTdHVwaWQnLFxuICAgIGRlc2NyOiAnTm9ib2R5IGhhcyBldmVyIGNvbXBsZXRlZCB0aGlzLicsXG4gICAgZmxhZ3M6ICdGY3Byc3cgR3QgSGJkaG13eHogTWVydCBQcyBSb3BzdCBTY2ttdCBUYWIgV210dXcnLFxuICB9LFxuICAvLyBUT1VSTkFNRU5UIFBSRVNFVFNcbiAge1xuICAgIHRpdGxlOiAnVG91cm5hbWVudDogU3dpc3MgUm91bmQnLFxuICAgIGRlc2NyOiAnUXVpY2stcGFjZWQgZnVsbC1zaHVmZmxlIGZsYWdzIGZvciBTd2lzcyByb3VuZCBvZiAyMDE5IFRvdXJuYW1lbnQnLFxuICAgIGZsYWdzOiAnRXMgRmNwcnN3IEd0IEhkIE1yIFBzIFJwdCBTY2ttdCBUYWInLFxuICB9LFxuICB7XG4gICAgdGl0bGU6ICdUb3VybmFtZW50OiBFbGltaW5hdGlvbiBSb3VuZCcsXG4gICAgZGVzY3I6ICdNb3JlIHRob3JvdWdoIGZsYWdzIGZvciB0aGUgZmlyc3QgZWxpbWluYXRpb24gcm91bmRzIG9mIHRoZSAyMDE5IFRvdXJuYW1lbnQnLFxuICAgIGZsYWdzOiAnRW0gRnByc3cgR2Z0IEhiZCBNZXIgUHMgUnByc3QgU2NrbXQgVGFiIFd0JyxcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVG91cm5hbWVudDogU2VtaWZpbmFscycsXG4gICAgZGVzY3I6ICdBZHZhbmNlZCBmbGFncyBmb3Igc2VtaWZpbmFsIHJvdW5kIG9mIHRoZSAyMDE5IFRvdXJuYW1lbnQnLFxuICAgIGZsYWdzOiAnRW0gRnN3IEdmdCBIYmQgTWVydCBQcyBSb3Byc3QgU2NrbXQgVGFiIFd0JyxcbiAgfSxcbiAge1xuICAgIHRpdGxlOiAnVG91cm5hbWVudDogRmluYWxzJyxcbiAgICBkZXNjcjogJ0V4cGVydCBmbGFncyBmb3IgZmluYWxzIHJvdW5kIG9mIHRoZSAyMDE5IFRvdXJuYW1lbnQnLFxuICAgIGZsYWdzOiAnRnN3IEdmcHJ0IEhiZHcgTWVydCBQcyBSb3Byc3QgU2NrbXQgVGFiIFdtdHcnLFxuICB9LFxuXTtcblxuLy8gSnVzdCB0aGUgZmxhZ3MsIG5vdCB0aGUgd2hvbGUgZG9jdW1lbnRhdGlvbi5cbmNvbnN0IFBSRVNFVFNfQllfS0VZOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuZm9yIChjb25zdCB7dGl0bGUsIGZsYWdzfSBvZiBQUkVTRVRTKSB7XG4gIFBSRVNFVFNfQllfS0VZW2BAJHt0aXRsZS5yZXBsYWNlKC8gL2csICcnKS50b0xvd2VyQ2FzZSgpfWBdID0gZmxhZ3M7XG59XG5cbmV4cG9ydCBjb25zdCBGTEFHUzogRmxhZ1NlY3Rpb25bXSA9IFtcbiAgSVRFTV9GTEFHUywgV09STERfRkxBR1MsIE1PTlNURVJfRkxBR1MsIFNIT1BfRkxBR1MsIEhBUkRfTU9ERV9GTEFHUyxcbiAgVFdFQUtfRkxBR1MsIFJPVVRJTkdfRkxBR1MsIEdMSVRDSF9GTEFHUywgR0xJVENIX0ZJWF9GTEFHUywgRUFTWV9NT0RFX0ZMQUdTLFxuICBERUJVR19NT0RFX0ZMQUdTXG5dO1xuXG5leHBvcnQgY2xhc3MgRmxhZ1NldCB7XG4gIHByaXZhdGUgZmxhZ3M6IHtbc2VjdGlvbjogc3RyaW5nXTogc3RyaW5nW119O1xuXG4gIGNvbnN0cnVjdG9yKHN0ciA9ICdSdEdmdFRhYicpIHtcbiAgICBpZiAoc3RyLnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgY29uc3QgZXhwYW5kZWQgPSBQUkVTRVRTX0JZX0tFWVtzdHIudG9Mb3dlckNhc2UoKV07XG4gICAgICBpZiAoIWV4cGFuZGVkKSB0aHJvdyBuZXcgVXNhZ2VFcnJvcihgVW5rbm93biBwcmVzZXQ6ICR7c3RyfWApO1xuICAgICAgc3RyID0gZXhwYW5kZWQ7XG4gICAgfVxuICAgIHRoaXMuZmxhZ3MgPSB7fTtcbiAgICAvLyBwYXJzZSB0aGUgc3RyaW5nXG4gICAgc3RyID0gc3RyLnJlcGxhY2UoL1teQS1aYS16MC05IV0vZywgJycpO1xuICAgIGNvbnN0IHJlID0gLyhbQS1aXSkoW2EtejAtOSFdKykvZztcbiAgICBsZXQgbWF0Y2g7XG4gICAgd2hpbGUgKChtYXRjaCA9IHJlLmV4ZWMoc3RyKSkpIHtcbiAgICAgIGNvbnN0IFssIGtleSwgdmFsdWVdID0gbWF0Y2g7XG4gICAgICBjb25zdCB0ZXJtcyA9IFJFUEVBVEFCTEVfRkxBR1MuaGFzKGtleSkgPyBbdmFsdWVdIDogdmFsdWU7XG4gICAgICBmb3IgKGNvbnN0IHRlcm0gb2YgdGVybXMpIHtcbiAgICAgICAgdGhpcy5zZXQoa2V5ICsgdGVybSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0KGNhdGVnb3J5OiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMuZmxhZ3NbY2F0ZWdvcnldIHx8IFtdO1xuICB9XG5cbiAgc2V0KGZsYWc6IHN0cmluZywgdmFsdWU6IGJvb2xlYW4pIHtcbiAgICAvLyBjaGVjayBmb3IgaW5jb21wYXRpYmxlIGZsYWdzLi4uP1xuICAgIGNvbnN0IGtleSA9IGZsYWdbMF07XG4gICAgY29uc3QgdGVybSA9IGZsYWcuc3Vic3RyaW5nKDEpOyAgLy8gYXNzZXJ0OiB0ZXJtIGlzIG9ubHkgbGV0dGVycy9udW1iZXJzXG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgLy8gSnVzdCBkZWxldGUgLSB0aGF0J3MgZWFzeS5cbiAgICAgIGNvbnN0IGZpbHRlcmVkID0gKHRoaXMuZmxhZ3Nba2V5XSB8fCBbXSkuZmlsdGVyKHQgPT4gdCAhPT0gdGVybSk7XG4gICAgICBpZiAoZmlsdGVyZWQubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuZmxhZ3Nba2V5XSA9IGZpbHRlcmVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuZmxhZ3Nba2V5XTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gQWN0dWFsbHkgYWRkIHRoZSBmbGFnLlxuICAgIHRoaXMucmVtb3ZlQ29uZmxpY3RzKGZsYWcpO1xuICAgIGNvbnN0IHRlcm1zID0gKHRoaXMuZmxhZ3Nba2V5XSB8fCBbXSkuZmlsdGVyKHQgPT4gdCAhPT0gdGVybSk7XG4gICAgdGVybXMucHVzaCh0ZXJtKTtcbiAgICB0ZXJtcy5zb3J0KCk7XG4gICAgdGhpcy5mbGFnc1trZXldID0gdGVybXM7XG4gIH1cblxuICBjaGVjayhmbGFnOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB0ZXJtcyA9IHRoaXMuZmxhZ3NbZmxhZ1swXV07XG4gICAgcmV0dXJuICEhKHRlcm1zICYmICh0ZXJtcy5pbmRleE9mKGZsYWcuc3Vic3RyaW5nKDEpKSA+PSAwKSk7XG4gIH1cblxuICBhdXRvRXF1aXBCcmFjZWxldCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnVGEnKTtcbiAgfVxuICBidWZmRGVvc1BlbmRhbnQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soJ1RiJyk7XG4gIH1cbiAgY2hhbmdlR2FzTWFza1RvSGF6bWF0U3VpdCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnVGInKTtcbiAgfVxuICBzbG93RG93blRvcm5hZG8oKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soJ1RiJyk7XG4gIH1cbiAgbGVhdGhlckJvb3RzR2l2ZVNwZWVkKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdUYicpO1xuICB9XG4gIHJhYmJpdEJvb3RzQ2hhcmdlV2hpbGVXYWxraW5nKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdUYicpO1xuICB9XG4gIGNvbnRyb2xsZXJTaG9ydGN1dHMoKSB7XG4gICAgcmV0dXJuICF0aGlzLmNoZWNrKCdUYycpO1xuICB9XG4gIHJhbmRvbWl6ZU11c2ljKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdUbScpO1xuICB9XG4gIHNodWZmbGVTcHJpdGVQYWxldHRlcygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnVHAnKTtcbiAgfVxuXG4gIHNodWZmbGVNb25zdGVycygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnTXInKTtcbiAgfVxuICBzaHVmZmxlU2hvcHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soJ1BzJyk7XG4gIH1cbiAgYmFyZ2Fpbkh1bnRpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2h1ZmZsZVNob3BzKCk7XG4gIH1cblxuICBzaHVmZmxlVG93ZXJNb25zdGVycygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnTXQnKTtcbiAgfVxuICBzaHVmZmxlTW9uc3RlckVsZW1lbnRzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdNZScpO1xuICB9XG4gIHNodWZmbGVCb3NzRWxlbWVudHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2h1ZmZsZU1vbnN0ZXJFbGVtZW50cygpO1xuICB9XG5cbiAgZG91YmxlQnVmZk1lZGljYWxIZXJiKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdFbScpO1xuICB9XG4gIGJ1ZmZNZWRpY2FsSGVyYigpIHtcbiAgICByZXR1cm4gIXRoaXMuY2hlY2soJ0htJyk7XG4gIH1cbiAgZGVjcmVhc2VFbmVteURhbWFnZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnRWQnKTtcbiAgfVxuICB0cmFpbmVyKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdEdCcpO1xuICB9XG4gIG5ldmVyRGllKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdEaScpO1xuICB9XG4gIGNoYXJnZVNob3RzT25seSgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnSGMnKTtcbiAgfVxuXG4gIGJhcnJpZXJSZXF1aXJlc0NhbG1TZWEoKSB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIH1cbiAgcGFyYWx5c2lzUmVxdWlyZXNQcmlzb25LZXkoKSB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIH1cbiAgc2VhbGVkQ2F2ZVJlcXVpcmVzV2luZG1pbGwoKSB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIH1cbiAgY29ubmVjdExpbWVUcmVlVG9MZWFmKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdScCcpO1xuICB9XG4gIHN0b3J5TW9kZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnUnMnKTtcbiAgfVxuICByZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnUmQnKTtcbiAgfVxuICBzYWhhcmFSYWJiaXRzUmVxdWlyZVRlbGVwYXRoeSgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnUnInKTtcbiAgfVxuICB0ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdSdCcpO1xuICB9XG4gIG9yYnNPcHRpb25hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnUm8nKTtcbiAgfVxuXG4gIHJhbmRvbWl6ZU1hcHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soJ1dtJyk7XG4gIH1cbiAgcmFuZG9taXplVHJhZGVzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdXdCcpO1xuICB9XG4gIHVuaWRlbnRpZmllZEl0ZW1zKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdXdScpO1xuICB9XG4gIHJhbmRvbWl6ZVdhbGxzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdXdycpO1xuICB9XG5cbiAgZ3VhcmFudGVlU3dvcmQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soJ0VzJyk7XG4gIH1cbiAgZ3VhcmFudGVlU3dvcmRNYWdpYygpIHtcbiAgICByZXR1cm4gIXRoaXMuY2hlY2soJ0h3Jyk7XG4gIH1cbiAgZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpIHtcbiAgICByZXR1cm4gIXRoaXMuY2hlY2soJ0hzJyk7XG4gIH1cbiAgZ3VhcmFudGVlR2FzTWFzaygpIHtcbiAgICByZXR1cm4gIXRoaXMuY2hlY2soJ0hnJyk7XG4gIH1cbiAgZ3VhcmFudGVlQmFycmllcigpIHtcbiAgICByZXR1cm4gIXRoaXMuY2hlY2soJ0hiJyk7XG4gIH1cbiAgZ3VhcmFudGVlUmVmcmVzaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnRXInKTtcbiAgfVxuXG4gIGRpc2FibGVTd29yZENoYXJnZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnRmMnKTtcbiAgfVxuICBkaXNhYmxlVGVsZXBvcnRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdGcCcpO1xuICB9XG4gIGRpc2FibGVSYWJiaXRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdGcicpO1xuICB9XG4gIGRpc2FibGVTaG9wR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdGcycpO1xuICB9XG4gIGRpc2FibGVTdGF0dWVHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soJ0Z0Jyk7XG4gIH1cblxuICBhc3N1bWVTd29yZENoYXJnZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnR2MnKTtcbiAgfVxuICBhc3N1bWVHaGV0dG9GbGlnaHQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soJ0dmJyk7XG4gIH1cbiAgYXNzdW1lVGVsZXBvcnRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdHcCcpO1xuICB9XG4gIGFzc3VtZVJhYmJpdFNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soJ0dyJyk7XG4gIH1cbiAgYXNzdW1lU3RhdHVlR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdHdCcpO1xuICB9XG4gIGFzc3VtZVRyaWdnZXJHbGl0Y2goKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9ICAvLyBUT0RPIC0gb25seSB3b3JrcyBvbiBsYW5kP1xuICBhc3N1bWVXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnR3cnKTtcbiAgfVxuXG4gIG5lcmZXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnRncnKTtcbiAgfVxuICBhbGxvd1dpbGRXYXJwKCkge1xuICAgIHJldHVybiAhdGhpcy5uZXJmV2lsZFdhcnAoKTtcbiAgfVxuICByYW5kb21pemVXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnVHcnKTtcbiAgfVxuXG4gIGJsYWNrb3V0TW9kZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjaygnSHonKTtcbiAgfVxuICBoYXJkY29yZU1vZGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soJ0hoJyk7XG4gIH1cbiAgYnVmZkR5bmEoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soJ0hkJyk7XG4gIH1cblxuICBleHBTY2FsaW5nRmFjdG9yKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKCdIeCcpID8gMC4yNSA6IHRoaXMuY2hlY2soJ0V4JykgPyAyLjUgOiAxO1xuICB9XG5cbiAgLy8gVGhlIGZvbGxvd2luZyBkaWRuJ3QgZW5kIHVwIGdldHRpbmcgdXNlZC5cblxuICAvLyBhbGxvd3MoZmxhZykge1xuICAvLyAgIGNvbnN0IHJlID0gZXhjbHVzaXZlRmxhZ3MoZmxhZyk7XG4gIC8vICAgaWYgKCFyZSkgcmV0dXJuIHRydWU7XG4gIC8vICAgZm9yIChjb25zdCBrZXkgaW4gdGhpcy5mbGFncykge1xuICAvLyAgICAgaWYgKHRoaXMuZmxhZ3Nba2V5XS5maW5kKHQgPT4gcmUudGVzdChrZXkgKyB0KSkpIHJldHVybiBmYWxzZTtcbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIHRydWU7XG4gIC8vIH1cblxuICAvLyBtZXJnZSh0aGF0KSB7XG4gIC8vICAgdGhpcy5mbGFncyA9IHRoYXQuZmxhZ3M7XG4gIC8vIH1cblxuICBwcml2YXRlIHJlbW92ZUNvbmZsaWN0cyhmbGFnOiBzdHJpbmcpIHtcbiAgICAvLyBOT1RFOiB0aGlzIGlzIHNvbWV3aGF0IHJlZHVuZGFudCB3aXRoIHNldChmbGFnLCBmYWxzZSlcbiAgICBjb25zdCByZSA9IHRoaXMuZXhjbHVzaXZlRmxhZ3MoZmxhZyk7XG4gICAgaWYgKCFyZSkgcmV0dXJuO1xuICAgIGZvciAoY29uc3Qga2V5IGluIHRoaXMuZmxhZ3MpIHtcbiAgICAgIGlmICghdGhpcy5mbGFncy5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHRlcm1zID0gdGhpcy5mbGFnc1trZXldLmZpbHRlcih0ID0+ICFyZS50ZXN0KGtleSArIHQpKTtcbiAgICAgIGlmICh0ZXJtcy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5mbGFnc1trZXldID0gdGVybXM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgdGhpcy5mbGFnc1trZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdG9TdHJpbmdLZXkoa2V5OiBzdHJpbmcpIHtcbiAgICBpZiAoUkVQRUFUQUJMRV9GTEFHUy5oYXMoa2V5KSkge1xuICAgICAgcmV0dXJuIFsuLi50aGlzLmZsYWdzW2tleV1dLnNvcnQoKS5tYXAodiA9PiBrZXkgKyB2KS5qb2luKCcgJyk7XG4gICAgfVxuICAgIHJldHVybiBrZXkgKyBbLi4udGhpcy5mbGFnc1trZXldXS5zb3J0KCkuam9pbignJyk7XG4gIH1cblxuICBwcml2YXRlIGV4Y2x1c2l2ZUZsYWdzKGZsYWc6IHN0cmluZyk6IFJlZ0V4cHx1bmRlZmluZWQge1xuICAgIGlmIChmbGFnLnN0YXJ0c1dpdGgoJ1MnKSkge1xuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAoYFMuKlske2ZsYWcuc3Vic3RyaW5nKDEpfV1gKTtcbiAgICB9XG5cbiAgICBjb25zdCBmbGFnRm9yTmFtZTogRmxhZyA9IHRoaXMuZ2V0RmxhZ0Zvck5hbWUoZmxhZyk7XG4gICAgaWYgKGZsYWdGb3JOYW1lID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBmbGFnOiAke2ZsYWd9YCk7XG4gICAgcmV0dXJuIGZsYWdGb3JOYW1lLmNvbmZsaWN0O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRGbGFnRm9yTmFtZShmbGFnOiBzdHJpbmcpOiBGbGFnIHtcbiAgICBjb25zdCBtYXRjaGluZ0ZsYWdTZWN0aW9uID0gRkxBR1MuZmluZChmbGFnU2VjdGlvbiA9PiB7XG4gICAgICByZXR1cm4gZmxhZy5zdGFydHNXaXRoKGZsYWdTZWN0aW9uLnByZWZpeCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gPEZsYWc+KDxGbGFnU2VjdGlvbj5tYXRjaGluZ0ZsYWdTZWN0aW9uKVxuICAgICAgICAuZmxhZ3MuZmluZChmbGFnVG9NYXRjaCA9PiBmbGFnVG9NYXRjaC5mbGFnID09PSBmbGFnKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLmZsYWdzKTtcbiAgICBrZXlzLnNvcnQoKTtcbiAgICByZXR1cm4ga2V5cy5tYXAoayA9PiB0aGlzLnRvU3RyaW5nS2V5KGspKS5qb2luKCcgJyk7XG4gIH1cbn1cbiJdfQ==