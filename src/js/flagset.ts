import {DEBUG_MODE_FLAGS} from './flags/debug-mode.js';
import {EASY_MODE_FLAGS} from './flags/easy-mode.js';
import {Flag, FlagSection, Preset} from './flags/flag.js';
import {GLITCH_FIX_FLAGS} from './flags/glitch-fixes.js';
import {GLITCH_FLAGS} from './flags/glitches.js';
import {HARD_MODE_FLAGS} from './flags/hard-mode.js';
import {MONSTER_FLAGS} from './flags/monsters.js';
import {ROUTING_FLAGS} from './flags/routing.js';
import {SHOP_FLAGS} from './flags/shops.js';
import {TWEAK_FLAGS} from './flags/tweaks.js';
import {WORLD_FLAGS} from './flags/world.js';
import {EXPERIMENTAL_FLAGS} from './flags/experimental.js';
import {UsageError} from './util.js';

export const PRESETS: Preset[] = [
  {
    title: 'Casual',
    descr: `Basic flags for a relatively easy playthrough.`,
    flags: 'Ds Edmrstux Fw Mr Rp Tab',
  },
  {
    title: 'Intermediate',
    descr: `Slightly more challenge than Casual but still approachable.`,
    flags: 'Ds Edmsu Fsw Gt Mr Ps Rpt Tab',
    default: true,
  },
  {
    title: 'Full Shuffle',
    descr:
        `Slightly harder than intermediate, with full shuffle and no spoiler log.`,
    flags: 'Em Fsw Gt Mert Ps Rprt Tabmp Wmtuw Xegw',
  },
  {
    title: 'Glitchless',
    descr: `Full shuffle but with no glitches.`,
    flags: 'Em Fcpstw Mert Ps Rprt Tab Wmtuw Xcegw',
  },
  {
    title: 'Advanced',
    descr: `A balanced randomization with quite a bit more difficulty.`,
    flags: 'Fsw Gfprt Hbdgtw Mert Ps Roprst Tabmp Wmtuw Xcegw',
  },
  {
    // TODO: add 'Ht'
    title: 'Ludicrous',
    descr: `Pulls out all the stops, may require superhuman feats.`,
    flags: 'Fs Gcfprtw Hbdgmstwxz Mert Ps Roprst Tabmp Wmtuw Xcegw',
  },
  {
    title: 'Mattrick',
    descr: 'Not for the faint of heart. Good luck...',
    flags: 'Fcprsw Gt Hbdhtwx Mert Ps Ropst Tabmp Wmtuw',
  },
  {
    title: 'The Full Stupid',
    descr: 'Nobody has ever completed this.',
    flags: 'Fcprsw Hbdhmwtxz Mert Ps Ropst Sckmt Tab Wmtuw Xcegw',
  },
  // TOURNAMENT PRESETS
  {
    title: 'Tournament: Swiss Round',
    descr: 'Quick-paced full-shuffle flags for Swiss round of 2019 Tournament',
    flags: 'Es Fcprsw Gt Hd Mr Ps Rpt Tab',
  },
  {
    title: 'Tournament: Elimination Round',
    descr: 'More thorough flags for the first elimination rounds of the 2019 Tournament',
    flags: 'Em Fprsw Gft Hbd Mer Ps Rprst Tab Wt',
  },
  {
    title: 'Tournament: Semifinals',
    descr: 'Advanced flags for semifinal round of the 2019 Tournament',
    flags: 'Em Fsw Gft Hbd Mert Ps Roprst Tab Wt',
  },
  {
    title: 'Tournament: Finals',
    descr: 'Expert flags for finals round of the 2019 Tournament',
    flags: 'Fsw Gfprt Hbdw Mert Ps Roprst Tab Wmtw',
  },
];

// Just the flags, not the whole documentation.
const PRESETS_BY_KEY: {[key: string]: string} = {};
for (const {title, flags} of PRESETS) {
  PRESETS_BY_KEY[`@${title.replace(/ /g, '').toLowerCase()}`] = flags;
}

export const FLAGS: FlagSection[] = [
  WORLD_FLAGS,
  EASY_MODE_FLAGS,
  MONSTER_FLAGS,
  SHOP_FLAGS,
  HARD_MODE_FLAGS,
  TWEAK_FLAGS,
  ROUTING_FLAGS,
  GLITCH_FLAGS,
  GLITCH_FIX_FLAGS,
  EXPERIMENTAL_FLAGS,
  DEBUG_MODE_FLAGS,
];

export class FlagSet {
  private flags: {[section: string]: string[]};

  constructor(str = 'RtGftTab') {
    if (str.startsWith('@')) {
      const expanded = PRESETS_BY_KEY[str.toLowerCase()];
      if (!expanded) throw new UsageError(`Unknown preset: ${str}`);
      str = expanded;
    }
    this.flags = {};
    // parse the string
    str = str.replace(/[^A-Za-z0-9!]/g, '');
    const re = /([A-Z])([a-z0-9!]+)/g;
    let match;
    while ((match = re.exec(str))) {
      const [, key, terms] = match;
      for (const term of terms) {
        this.set(key + term, true);
      }
    }
  }

  get(category: string): string[] {
    return this.flags[category] || [];
  }

  set(flag: string, value: boolean) {
    // check for incompatible flags...?
    const key = flag[0];
    const term = flag.substring(1);  // assert: term is only letters/numbers
    if (!value) {
      // Just delete - that's easy.
      const filtered = (this.flags[key] || []).filter(t => t !== term);
      if (filtered.length) {
        this.flags[key] = filtered;
      } else {
        delete this.flags[key];
      }
      return;
    }
    // Actually add the flag.
    this.removeConflicts(flag);
    const terms = (this.flags[key] || []).filter(t => t !== term);
    terms.push(term);
    terms.sort();
    this.flags[key] = terms;
  }

  check(flag: string): boolean {
    const terms = this.flags[flag[0]];
    return !!(terms && (terms.indexOf(flag.substring(1)) >= 0));
  }

  preserveUniqueChecks() {
    return this.check('Eu');
  }
  shuffleMimics() {
    return !this.check('Et');
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
    return true; // this.check('Rl');
  }
  paralysisRequiresPrisonKey() {
    return true; // this.check('Rl');
  }
  sealedCaveRequiresWindmill() {
    return true; // this.check('Rl');
  }
  connectLimeTreeToLeaf() {
    return this.check('Rp');
  }
  connectGoaToLeaf() {
    return this.check('Xe') && this.check('Xg');
  }
  removeEarlyWall() {
    return this.check('Xb');
  }
  zebuStudentGivesItem() {
    return !this.check('Xe') || this.check('Xc');
  }
  addEastCave() {
    return this.check('Xe');
  }
  addExtraChecksToEastCave() {
    return this.check('Xe') && this.check('Xc');
  }
  fogLampNotRequired() {
    return this.check('Xf');
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
  randomizeThunderTeleport() {
    return this.check('Xw');
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
  disableFlightStatueSkip() {
    return false;
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
    return false; // TODO - only works on land?
  }
  assumeFlightStatueSkip() {
    return false; // TODO - allow a flag to disable
  }
  assumeWildWarp() {
    return this.check('Gw');
  }
  assumeRageSkip() {
    return false; // TODO - need to check for a flyer to the south?
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
  maxScalingInTower() {
    return this.check('Ht');
  }

  expScalingFactor() {
    return this.check('Hx') ? 0.25 : this.check('Ex') ? 2.5 : 1;
  }

  // The following didn't end up getting used.

  // allows(flag) {
  //   const re = exclusiveFlags(flag);
  //   if (!re) return true;
  //   for (const key in this.flags) {
  //     if (this.flags[key].find(t => re.test(key + t))) return false;
  //   }
  //   return true;
  // }

  // merge(that) {
  //   this.flags = that.flags;
  // }

  private removeConflicts(flag: string) {
    // NOTE: this is somewhat redundant with set(flag, false)
    const re = this.exclusiveFlags(flag);
    if (!re) return;
    for (const key in this.flags) {
      if (!this.flags.hasOwnProperty(key)) continue;
      const terms = this.flags[key].filter(t => !re.test(key + t));
      if (terms.length) {
        this.flags[key] = terms;
      } else {
        delete this.flags[key];
      }
    }
  }

  private toStringKey(key: string) {
    return key + [...this.flags[key]].sort().join('');
  }

  private exclusiveFlags(flag: string): RegExp|undefined {
    const flagForName = this.getFlagForName(flag);
    if (flagForName == null) throw new Error(`Unknown flag: ${flag}`);
    return flagForName.conflict;
  }

  private getFlagForName(flag: string): Flag|undefined {
    const matchingFlagSection = FLAGS.find(flagSection => {
      return flag.startsWith(flagSection.prefix);
    });
    if (!matchingFlagSection) return undefined;
    return matchingFlagSection.flags
        .find(flagToMatch => flagToMatch.flag === flag);
  }

  toString() {
    const keys = Object.keys(this.flags);
    keys.sort();
    return keys.map(k => this.toStringKey(k)).join(' ');
  }
}
