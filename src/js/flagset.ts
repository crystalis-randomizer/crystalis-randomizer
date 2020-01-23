import {DEBUG_MODE_FLAGS} from './flags/debug-mode.js';
import {EASY_MODE_FLAGS} from './flags/easy-mode.js';
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

class FlagSection {
  readonly flags: Flag[] = [];
  constructor(parent: FlagSet,
              readonly prefix: string,
              readonly title: string,
              readonly text: string) {
    parent.sections.set(prefix, this);
  }
}

interface FlagOpts {
  text?: string;
  excludes?: string[];
  requires?: string[];
  hard?: boolean;
  optional?: boolean;
  repeat?: number;
}

class Flag {
  constructor(parent: FlagSet,
              readonly flag: string,
              readonly name: string,
              readonly opts: FlagOpts = {}) {
    parent.sections.get(flag[0]).flags.push(this);
  }

  check(flags: FlagSet): boolean {
    return false;
  }

  count(flags: FlagSet): number {
    return 0;
  }
}

class Preset {
  constructor(presets: Presets,
              readonly name: string,
              readonly description: string,
              readonly flags: Flag[]) {
    presets.presets.push(this);
  }
}

class Presets {
  readonly presets: Preset[] = [];

  readonly Casual = new Preset(this, 'Casual', `
      Basic flags for a relatively easy playthrough.`, [
        DebugMode.SpoilerLog,
        EasyMode.PreserveUniqueChecks,
        EasyMode.NoShuffleMimics,
        EasyMode.DecreaseEnemyDamage,
        EasyMode.GuaranteeRefresh,
        EasyMode.GuaranteeStartingSword,
        EasyMode.IncreaseExperienceScaling,
        Routing.NoThunderSwordWarp,
        Vanilla.AllowShopGlitch,
      ]);

  readonly Intermediate = new Preset(this, 'Intermediate', `
      Slightly more challenge than Casual, but still approachable`, [
        DebugMode.SpoilerLog,
        EasyMode.PreserveUniqueChecks,
        EasyMode.DecreaseEnemyDamage,
        EasyMode.GuaranteeStartingSword,
        Glitches.StatueGlitch,
      ]);

  readonly Standard = new Preset(this, 'Standard', `
      Well-balanced, standard shuffle.`, [
        // no flags?  all default?
      ]);
}

const allSections = new Set<FlagSection>();

class FlagSection {
  abstract readonly prefix: string;
  abstract readonly name: string;
  abstract readonly description?: string;
  readonly flags: Flag[] = [];

  constructor() {
    for (const f in this.constructor) {
      const flag = this.constructor[f];
      if (flag instanceof Flag) this.flags.push(flag);
    }
  }

  static readonly instance: FlagSection;
  static flag(name: string, opts: any): Flag {
    allSections.add(this.instance || (this.instance = new this()));
    const flag = new Flag(this.instance, name, opts);
    if (!name.startsWith(this.instance.prefix)) throw new Error(`bad flag`);
    this.instance.flags.push(flag);
    return flag;
  }
}

class World extends FlagSection {
  readonly prefix = 'W';
  readonly name = 'World';

  static readonly RandomizeMaps = World.flag('Wm', {
    name: 'Randomize maps',
    text: `Individual maps are randomized.  For now this is only a subset of
           possible maps.  A randomized map will have all the same features
           (exits, chests, NPCs, etc) except things are moved around.`,
    hard: true,
  });

  static readonly RandomizeTrades = World.flag('Wt', {
    name: 'Randomize trade-in items',
    text: `Items expected by various NPCs will be shuffled: specifically,
           Statue of Onyx, Kirisa Plant, Love Pendant, Ivory Statue, Fog
           Lamp, and Flute of Lime (for Akahana).  Rage will expect a
           random sword, and Tornel will expect a random bracelet.`,
    hard: true,
  });

  static readonly UnidentifiedKeyItems = World.flag('Wu', {
    name: 'Unidentified key items',
    text: `Item names will be generic and effects will be shuffled.  This
           includes keys, flutes, lamps, and statues.`,
    hard: true,
  });

  static readonly RandomizeWallElements = World.flag('We', {
    name: 'Randomize elements to break walls',
    text: `Walls will require a randomized element to break.  Normal rock and
           ice walls will indicate the required element by the color (light
           grey or yellow for wind, blue for fire, bright orange ("embers") for
           water, or dark grey ("steel") for thunder.  The element to break
           these walls is the same throughout an area.  Iron walls require a
           one-off random element, with no visual cue, and two walls in the
           same area may have different requirements.`,
  });

  static readonly ShuffleGoaFloors = World.flag('Wg', {
    name: 'Shuffle Goa fortress floors',
    // TODO - shuffle the area-to-boss connections, too.
    text: `The four areas of Goa fortress will appear in a random order.`,
  });

  static readonly RandomizeSpriteColors = World.flag('Ws', {
    name: 'Randomize sprite colors',
    text: `Monsters and NPCs will have different colors.  This is not an
           optional flag because it affects what monsters can be grouped
           together.`,
  });

  static readonly RandomizeWildWarp = World.flag('Ww', {
    name: 'Randomize wild warp',
    text: `Wild warp will go to Mezame Shrine and 15 other random locations.
           These locations will be considered in-logic.`,
    excludes: ['Vw'],
    // requires: 'Gw'
  });
}

class Routing extends FlagSection {
  readonly prefix = 'R';
  readonly name = 'Routing';

  static readonly StoryMode = Routing.flag('Rs', {
    name: 'Story Mode',
    text: `Draygon 2 won't spawn unless you have all four swords and have
           defeated all major bosses of the tetrarchy.`,
  });

  static readonly NoBowMode = Routing.flag('Rb', {
    name: 'No Bow mode',
    text: `No items are required to finish the game.  An exit is added from
           Mezame shrine directly to the Draygon 2 fight (and the normal entrance
           is removed).  Draygon 2 spawns automatically with no Bow of Truth.`,
  });

  static readonly OrbsNotRequired = Routing.flag('Ro', {
    name: 'Orbs not required to break walls',
    text: `Walls can be broken and bridges formed with level 1 shots.`
  });

  static readonly NoThunderSwordWarp = Routing.flag('Rt', {
    name: 'No Sword of Thunder warp',
    text: `Normally when acquiring the thunder sword, the player is instantly
           warped to Shyron (or elsewhere).  This flag disables the warp.`,
  });

  static readonly VanillaDolphin = Routing.flag('Rd', {
    name: 'Vanilla Dolphin interactions',
    text: `By default, the randomizer changes a number of dolphin and boat
           interactions: (1) healing the dolphin and having the Shell Flute
           is no longer required before the fisherman spawns: instead, he
           will spawn as soon as you have the item he wants; (2) talking to
           Kensu in the beach cabin is no longer required for the Shell Flute
           to work: instead, the Shell Flute will always work, and Kensu will
           spawn after the Fog Lamp is turned in and will give a key item
           check.  This flag restores the vanilla interaction where healing
           and shell flute are required.`,
  });
}

class Glitches extends FlagSection {
  readonly prefix = 'G';
  readonly name = 'Glitches';
  readonly description = `
      By default, the randomizer disables all known glitches (except ghetto
      flight).  These flags selectively re-enable certain glitches.  Normally
      enabling a glitch will add it to the logic.  Clicking a second time
      will enable it outside of logic (e.g. "Gcc").`;

  static readonly GhettoFlight = Glitches.flag('Gf', {
    name: 'Ghetto flight',
    text: `Ghetto flight allows using Dolphin and Rabbit Boots to fly up the
           waterfalls in the Angry Sea (without calming the whirlpools).
           This is done by swimming up to a diagonal beach and jumping
           in a different direction immediately before disembarking.`,
  });

  static readonly StatueGlitch = Glitches.flag('Gs', {
    name: 'Statue glitch',
    text: `Statue glitch allows getting behind statues that block certain
           entrances: the guards in Portoa, Amazones, Oak, Goa, and Shyron,
           as well as the statues in the Waterfall Cave.  It is done by
           approaching the statue from the top right and holding down and
           left on the controller while mashing B.`,
    repeat: 2,
  });

  static readonly MtSabreRequirementSkip = Glitches.flag('Gn', {
    name: 'Mt Sabre requirements skip',
    text: `Entering Mt Sabre North normally requires (1) having Teleport,
           and (2) talking to the rabbit in Leaf after the abduction (via
           Telepathy).  Both of these requirements can be skipped: first by
           flying over the river in Cordel plain rather than crossing the
           bridge, and then by threading the needle between the hitboxes in
           Mt Sabre North.`,
    repeat: 2,
  });

  static readonly SwordChargeGlitch = Glitches.flag('Gc', {
    name: 'Sword charge glitch',
    text: `Sword charge glitch allows charging one sword to the level of
           another sword by equipping the higher-level sword, re-entering
           the menu, changing to the lower-level sword without exiting the
           menu, creating a hard save, resetting, and then continuing.`,
    hard: true,
    repeat: 2,
  });

  static readonly TriggerSkip = Glitches.flag('Gt', {
    name: 'Trigger skip',
    text: `A wide variety of triggers and exit squares can be skipped by
           using an invalid item every frame while walking.  This allows
           bypassing both Mt Sabre entrance triggers, the Evil Spirit Island
           entrance trigger, triggers for guards to move, slopes, and seamless
           map transitions.`,
    hard: true,
    repeat: 2,
  });

  static readonly RageSkip = Glitches.flag('Gr', {
    name: 'Rage skip',
    text: `Rage can be skipped by damage-boosting diagonally into the Lime
           Tree Lake screen.  This provides access to the area beyond the
           lake if flight or bridges are available.`,
    hard: true,
    repeat: 2,
  });


class Aesthetics extends FlagSection {
  readonly prefix = 'A';
  readonly name = 'Aesthetics';
  readonly description = `
      These flags don't directly affect gameplay or shuffling, but they do
      affect the experience significantly enough that there are three modes
      for each: "off", "optional", and "required".  The first two are
      equivalent for seed generation purposes, so that you can play the same
      seed with either setting.  Setting it to "required" changes the seed.`;

  static readonly RandomizeMusic = Vanilla.flag('Am', {
    name: 'Randomize background music',
    maybeOptional: true,
  });

  static readonly RandomizeMapColors = Vanilla.flag('At', {
    name: 'Randomize map colors',
    maybeOptional: true,
  });
}

class Monsters extends FlagSection {
  readonly prefix = 'M';
  readonly name = 'Monsters';

  static readonly RandomizeWeaknesses = Monsters.flag('Me', {
    name: 'Randomize monster weaknesses',
    text: `Monster and boss elemental weaknesses are shuffled.`,
  });

  static readonly TowerRobots = Monsters.flag('Mt', {
    name: 'Shuffle tower robots',
    text: `Tower robots will be shuffled into the normal pool.  At some
           point, normal monsters may be shuffled into the tower as well.`,
    hard: true,
  });
}

class EasyMode extends FlagSection {
  readonly prefix = 'E';
  readonly name = 'Easy Mode';
  readonly description = `
      The following options make parts of the game easier.`;

  static readonly NoShuffleMimics = EasyMode.flag('Et', {
    name: `Don't shuffle mimics.`,
    text: `Mimics will be in their vanilla locations.`,
  });

  static readonly PreserveUniqueChecks = EasyMode.flag('Eu', {
    name: 'Keep unique items and consumables separate',
    text: `Normally all items and mimics are shuffled into a single pool and
           distributed from there.  If this flag is set, unique items
           (specifically, anything that cannot be sold) will only be found in
           either (a) checks that held unique items in vanilla, or (b) boss
           drops.  Chests containing consumables in vanilla may be safely
           ignored, but chests containing unique items in vanilla may still
           end up with non-unique items because of bosses like Vampire 2 that
           drop consumables.  If mimics are shuffled, they will only be in
           consumable locations.`,
  });

  static readonly DecreaseEnemyDamage = EasyMode.flag('Ed', {
    name: 'Decrease enemy damage',
    text: `Enemy attack power will be significantly decreased in the early game
           (by a factor of 3).  The gap will narrow in the mid-game and eventually
           phase out at scaling level 40.`,
  });

  static readonly GuaranteeStartingSword = EasyMode.flag('Es', {
    name: 'Guarantee starting sword',
    text: `The Leaf elder is guaranteed to give a sword.  It will not be
           required to deal with any enemies before finding the first sword.`,
  });

  static readonly GuaranteeRefresh = EasyMode.flag('Er', {
    name: 'Guarantee refresh',
    text: `Guarantees the Refresh spell will be available before fighting
           Tetrarchs.`,
  });

  static readonly ExperienceScalesFaster = EasyMode.flag('Ex', {
    name: 'Experience scales faster',
    text: `Less grinding will be required to "keep up" with the game difficulty.`,
    excludes: ['Hx'],
  });
}

class NoGuarantees extends FlagSection {
  readonly prefix = 'N';
  readonly name = 'No guarantees';
  readonly description = `
      Removes various guarantees from the logic.`;

  static readonly BattleMagic = NoGuarantees.flag('Nw', {
    name: 'Battle magic not guaranteed',
    text: `Normally, the logic will guarantee that level 3 sword charges are
           available before fighting the tetrarchs (with the exception of Karmine,
           who only requires level 2).  This disables that check.`,
    hard: true,
  });

  static readonly MatchingSword = NoGuarantees.flag('Ns', {
    name: 'Matching sword not guaranteed',
    text: `Player may be required to fight bosses with the wrong sword, which
           may require using "tink strats" dealing 1 damage per hit.`,
    hard: true,
  });

  static readonly Barrier = NoGuarantees.flag('Nb', {
    name: 'Barrier not guaranteed',
    text: `Normally, the logic will guarantee Barrier (or else refresh and shield
           ring) before entering Stxy, the Fortress, or fighting Karmine.  This
           disables that check.`,
    hard: true,
  });

  static readonly GasMask = NoGuarantees.flag('Ng', {
    name: 'Gas mask not guaranteed',
    text: `The logic will not guarantee gas mask before needing to enter the swamp.
           Gas mask is still guaranteed to kill the insect.`,
    hard: true,
  });
}

class HardMode extends FlagSection {
  readonly prefix = 'H';
  readonly name = 'Hard mode';

  static readonly NoBuffMedicalHerb = HardMode.flag('Hm', {
    name: `Don't buff medical herb or fruit of power`,
    text: `Medical Herb is not buffed to heal 80 damage, which is helpful to make
           up for cases where Refresh is unavailable early.  Fruit of Power is not
           buffed to restore 56 MP.`,
    hard: true,
  });

  static readonly MaxScalingInTower = HardMode.flag('Ht', {
    name: 'Max scaling level in tower',
    text: `Enemies in the tower spawn at max scaling level.`,
    hard: true,
  });

  static readonly ExperienceScalesSlower = HardMode.flag('Hx', {
    name: 'Experience scales slower',
    text: `More grinding will be required to "keep up" with the difficulty.`,
    excludes: ['Ex'],
    hard: true,
  });

  static readonly ChargeShotsOnly = HardMode.flag('Hc', {
    name: 'Charge shots only',
    text: `Stabbing is completely ineffective.  Only charged shots work.`,
    hard: true,
  });

  static readonly = HardMode.flag('Hz', {
    name: 'Blackout',
    text: `All caves and fortresses are permanently dark.`,
    hard: true,
  });

  static readonly = HardMode.flag('Hh', {
    name: 'Permadeath',
    text: `Hardcore mode: checkpoints and saves are removed.`,
    hard: true,
  });
}

class Vanilla extends FlagSection {

  readonly prefix = 'V';

  static readonly Dyna = Vanilla.flag('Vd', {
    name: `Don't buff Dyna`,
    text: `By default, we makes the Dyna fight a bit more of a challenge.
           Side pods will fire significantly more.  The safe spot has been
           removed.  The revenge beams pass through barrier.  Side pods can
           now be killed.  This flag prevents that change.`,
  });

  static readonly BonusItems = Vanilla.flag('Vb', {
    name: `Don't buff bonus items`,
    text: `Leather Boots are changed to Speed Boots, which increase player walking
           speed (this allows climbing up the slope to access the Tornado Bracelet
           chest, which is taken into consideration by the logic).  Deo's pendant
           restores MP while moving.  Rabbit boots enable sword charging up to
           level 2 while walking (level 3 still requires being stationary, so as
           to prevent wasting tons of magic).`,
  });

  // TODO - is it worth even allowing to turn this off?!?
  static readonly Valley = Vanilla.flag('Vv', {
    name: 'Vanilla Velly of Wind',
    text: `Normally the randomizer adds a new "East Cave" to Valley of Wind,
           borrowed from the GBC version of the game.  This cave contains two
           chests (one considered a key item) on the upper floor and an 80%
           chance each of an exit to the Portoa area (on the lower floor) and
           an exit to Goa Valley (down the stairs and behind a rock wall from
           the upper floor).  This flag prevents adding that cave.`,
  });

  static readonly Shops = Vanilla.flag('Vs', {
    name: 'Vanilla shops',
    text: `By default, we disable shop glitch, shuffle shop contents, and tie
           the prices to the scaling level (item shops and inns increase by a
           factor of 2 every 10 scaling levels, armor shops decrease by a
           factor of 2 every 12 scaling levels).  This flag prevents all of
           these changes, restoring shops to be completely vanilla.`,
  });

  static readonly WildWarp = Vanilla.flag('Vw', {
    name: 'Vanilla wild warp',
    text: `By default, Wild Warp is nerfed to only return to Mezame Shrine.
           This flag restores it to work like normal.  Note that this will put
           all wild warp locations in logic unless the flag is doubled (Vww).`
    repeat: 2,
  });
}

class Quality extends FlagSection {
  readonly prefix = 'Q';
  readonly name = 'Quality of Life';
  readonly description = `
      The following quality-of-life flags turn <i>off</i> improvements that
      are normally on by default.  They are optional and will not affect the
      seed generation.  They may be toggled freely in race mode.`;

  // TODO - remember preferences and auto-apply?
  static readonly NoAutoEquip = Quality.flag('Qa', {
    name: `Don't automatically equip orbs and bracelets`,
    text: `Prevents adding a quality-of-life improvement to automatically equip
           the corresponding orb/bracelet whenever changing swords.`,
    optional: true,
  });

  static readonly NoControllerShortcuts = Quality.flag('Qc', {
    name: 'Disable controller shortcuts',
    text: `By default, we disable second controller input and instead enable
           some new shortcuts on controller 1: Start+A+B for wild warp, and
           Select+B to quickly change swords.  To support this, the action of
           the start and select buttons is changed slightly.  This flag
           disables this change and retains normal behavior.`,
  });
}

class DebugMode extends FlagSection {
  // TODO - how to discover FlagSections???
  readonly prefix = 'D';
  readonly name = 'Debug Mode';
  readonly description = `
      These options are helpful for exploring or debugging.  Note that,
      while they do not directly affect any randomization, they
      <i>do</i> factor into the seed to prevent cheating, and they
      will remove the option to generate a seed for racing.`;

  static readonly SpoilerLog = DebugMode.flag('Ds', {
    name: 'Generate a spoiler log',
    text: `Note: <b>this will change the placement of items</b> compared to a
           seed generated without this flag turned on.`,
  });

  static readonly TrainerMode = DebugMode.flag('Dt', {
    name: 'Trainer mode',
    text: `Installs a trainer for practicing certain parts of the game.
           At the start of the game, the player will have all swords, basic
           armors and shields, all worn items and magics, a selection of
           consumables, bow of truth, maximum cash, all warp points activated,
           and the Shyron massacre will have been triggered.  Wild warp is
           reconfigured to provide easy access to all bosses.  Additionally,
           the following button combinations are recognized:<ul>
             <li>Start+Up: increase player level
             <li>Start+Down: increase scaling level
             <li>Start+Left: get all balls
             <li>Start+Right: get all bracelets
             <li>Start+B+Down: get a full set of consumable items
             <li>Start+B+Left: get all advanced armors
             <li>Start+B+Right: get all advanced shields
           </ul>`,
  });

  static readonly NeverDie = DebugMode.flag('Di', {
    name: 'Player never dies',
  });
}

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
  {
    title: 'No Bow Mode',
    descr: 'The tower is open from the start, for whoever is ready for it.',
    flags: 'Fcprstw Ht Mert Ps Rbt Sckmt Tab Xcegw',
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

  constructor(str = '@Casual') {
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
  shuffleTilePalettes() {
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
  noBowMode() {
    return this.check('Rb');
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

export interface Preset {
  descr: string;
  flags: string;
  title: string;

  default?: boolean;
}

export interface FlagSection {
  flags: Flag[];
  section: string;
  prefix: string;

  text?: string;
}

export interface Flag {
  flag: string;
  name: string;

  conflict?: RegExp;
  hard?: boolean;
  text?: string;
}
