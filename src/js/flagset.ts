import {UsageError, DefaultMap} from './util';
import {Random} from './random';

interface FlagOpts {
  name: string;
  text?: string;
  excludes?: string[];
  hard?: boolean;
  optional?: (mode: Mode) => Mode;
  // All flags have modes false and true.  Additional modes may be
  // specified as characters in this string (e.g. '!').
  modes?: string;
}

type Mode = boolean|string;

const OPTIONAL = (mode: Mode) => '';
const NO_BANG = (mode: Mode) => mode === true ? false : mode;

export class Flag {
  static readonly flags = new Map<string, Flag>();

  static all(): Flag[] {
    return [...this.flags.values()];
  }

  constructor(readonly flag: string, readonly opts: FlagOpts) {
    Flag.flags.set(flag, this);
  }
}

export class Preset {
  static all(): Preset[] {
    if (!Presets.instance) Presets.instance = new Presets();
    return [...Presets.instance.presets.values()];
  }

  private _flagString?: string;

  readonly flags: ReadonlyArray<readonly [Flag, Mode]>;
  constructor(parent: Presets, // NOTE: impossible to get an instance outside
              readonly name: string,
              readonly description: string,
              flags: ReadonlyArray<Flag|readonly [Flag, Mode]>) {
    this.flags = flags.map(f => f instanceof Flag ? [f, true] : f);
    parent.presets.set(mapPresetName(name), this);
  }

  get flagString() {
    if (this._flagString == null) {
      this._flagString = String(new FlagSet(`@${this.name}`));
    }
    return this._flagString;
  }
}

function mapPresetName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// NOT EXPORTED!
class Presets {
  static instance: Presets | undefined;
  readonly presets = new Map<string, Preset>();

  static get(name: string): Preset | undefined {
    if (!this.instance) this.instance = new Presets();
    return this.instance.presets.get(mapPresetName(name));
  }

  readonly Casual = new Preset(this, 'Casual', `
      Basic flags for a relatively easy playthrough.  This is a good
      place to start.`, [
        EasyMode.PreserveUniqueChecks,
        EasyMode.NoShuffleMimics,
        EasyMode.DecreaseEnemyDamage,
        EasyMode.GuaranteeRefresh,
        EasyMode.GuaranteeStartingSword,
        EasyMode.ExperienceScalesFaster,
        EasyMode.NoCommunityJokes,
        Routing.NoThunderSwordWarp,
        Vanilla.Shops,
        Vanilla.Dyna,
        [Vanilla.Maps, '!'],
        DebugMode.SpoilerLog,
      ]);

  readonly Classic = new Preset(this, 'Classic', `
      Provides a relatively quick playthough with a reasonable amount of
      challenge.  Similar to older versions.`, [
        EasyMode.GuaranteeStartingSword,
        EasyMode.NoCommunityJokes,
        Glitches.StatueGlitch,
        [Routing.NoThunderSwordWarp, '!'],
        [Vanilla.Maps, '!'],
        DebugMode.SpoilerLog,
      ]);

  readonly Standard = new Preset(this, 'Standard', `
      Well-balanced, standard race flags.`, [
        // no flags?  all default?
        Monsters.RandomizeWeaknesses,
        Routing.StoryMode,
        DebugMode.SpoilerLog,
      ]);

  readonly NoBowMode = new Preset(this, 'No Bow Mode', `
      The tower is open from the start, as soon as you're ready for it.`, [
        Monsters.RandomizeWeaknesses,
        Monsters.TowerRobots,
        HardMode.MaxScalingInTower,
        Routing.NoBowMode,
        DebugMode.SpoilerLog,
      ]);

  readonly Advanced = new Preset(this, 'Advanced', `
      A balanced randomization with quite a bit more difficulty.`, [
        Glitches.GhettoFlight,
        Glitches.MtSabreRequirementSkip,
        Glitches.StatueGlitch,
        [Glitches.SwordChargeGlitch, '!'],
        NoGuarantees.Barrier,
        NoGuarantees.BattleMagic,
        NoGuarantees.GasMask,
        HardMode.MaxScalingInTower,
        Monsters.RandomizeWeaknesses,
        Monsters.TowerRobots,
        Routing.OrbsNotRequired,
        Routing.StoryMode,
        World.RandomizeMaps,
        World.ShuffleAreas,
        World.ShuffleHouses,
        World.RandomizeTrades,
        World.RandomizeWallElements,
        World.UnidentifiedKeyItems,
        DebugMode.SpoilerLog,
      ]);

  readonly WildWarp = new Preset(this, 'Wild Warp', `
      Significantly opens up the game right from the start with wild
      warp in logic.`, [
        EasyMode.GuaranteeRefresh,
        World.RandomizeWildWarp,
        Monsters.RandomizeWeaknesses,
        Monsters.TowerRobots,
        Routing.OrbsNotRequired,
        Routing.StoryMode,
        DebugMode.SpoilerLog,
      ]);

  readonly Mystery = new Preset(this, 'Mystery', `
      Even the options are random.`, [
        [World.ShuffleAreas, '?'],
        [World.ShuffleHouses, '?'],
        [World.RandomizeMaps, '?'],
        [World.RandomizeTrades, '?'],
        [World.UnidentifiedKeyItems, '?'],
        [World.RandomizeWallElements, '?'],
        [World.ShuffleGoaFloors, '?'],
        [World.RandomizeSpriteColors, '?'],
        [World.RandomizeWildWarp, '?'],
        [Routing.OrbsNotRequired, '?'],
        [Routing.NoBowMode, '?'],
        [Routing.StoryMode, '?'],
        [Routing.VanillaDolphin, '?'],
        [Routing.NoThunderSwordWarp, '?'],
        [Glitches.RageSkip, '?'],
        [Glitches.TriggerSkip, '?'],
        [Glitches.StatueGlitch, '?'],
        [Glitches.GhettoFlight, '?'],
        [Glitches.SwordChargeGlitch, '?'],
        [Glitches.MtSabreRequirementSkip, '?'],
        [Aesthetics.RandomizeMusic, '?'],
        [Aesthetics.RandomizeMapColors, '?'],
        [Monsters.RandomizeWeaknesses, '?'],
        [Monsters.TowerRobots, '?'],
        [EasyMode.NoShuffleMimics, '?'],
        [EasyMode.PreserveUniqueChecks, '?'],
        [NoGuarantees.Barrier, '?'],
        [NoGuarantees.BattleMagic, '?'],
        [NoGuarantees.GasMask, '?'],
        [Vanilla.Dyna, '?'],
        [Vanilla.BonusItems, '?'],
        [Vanilla.Maps, '?'],
        DebugMode.SpoilerLog,
      ]);

  readonly Hardcore = new Preset(this, 'Hardcore', `
      Not for the faint of heart.  Good luck.`, [
        NoGuarantees.Barrier,
        NoGuarantees.BattleMagic,
        HardMode.ExperienceScalesSlower,
        HardMode.MaxScalingInTower,
        HardMode.Permadeath,
        Routing.OrbsNotRequired,
        Routing.StoryMode,
        World.RandomizeMaps,
        World.ShuffleAreas,
        World.ShuffleHouses,
        World.RandomizeTrades,
        World.RandomizeWallElements,
        World.UnidentifiedKeyItems,
      ]);
      
  readonly Wha = new Preset(this, 'Wha!?', `
      Wh and Wa - the two flags that give this flagset it's name - shuffle all 
      the houses, overworld connections, and cave connections in the game. 
      Stumbling out of Mezame Shrine directly into the Desert may leave you 
      saying "Wha?!"`, [
        World.ShuffleAreas,
        World.ShuffleHouses,
        [World.RandomizeTrades, '?'],
        [World.UnidentifiedKeyItems, '?'],
        [World.RandomizeWallElements, '?'],
        World.ShuffleGoaFloors,
        World.RandomizeSpriteColors,
        Routing.StoryMode,
        Routing.OrbsNotRequired,
        Glitches.GhettoFlight,
        Glitches.StatueGlitch,
        Glitches.MtSabreRequirementSkip,
        Glitches.StatueGauntletSkip,
        [Glitches.SwordChargeGlitch, '!'],
        [Monsters.RandomizeWeaknesses, '?'],
        NoGuarantees.BattleMagic,
        HardMode.MaxScalingInTower
      ]);
      
  readonly Wham = new Preset(this, 'Wham!', `
      This flagset takes everything from the "Wha?!" flagset, and adds only one 
      flag: Wm. Don't be fooled, however: adding randomized maps will definitely
      throw a wrench in things. The complicated logic and routing may feel like
      a punch to the gut - "Wham!"`, [
        World.RandomizeMaps,
        World.ShuffleAreas,
        World.ShuffleHouses,
        [World.RandomizeTrades, '?'],
        [World.UnidentifiedKeyItems, '?'],
        [World.RandomizeWallElements, '?'],
        World.ShuffleGoaFloors,
        World.RandomizeSpriteColors,
        Routing.StoryMode,
        Routing.OrbsNotRequired,
        Glitches.GhettoFlight,
        Glitches.StatueGlitch,
        Glitches.MtSabreRequirementSkip,
        Glitches.StatueGauntletSkip,
        [Glitches.SwordChargeGlitch, '!'],
        [Monsters.RandomizeWeaknesses, '?'],
        NoGuarantees.BattleMagic,
        HardMode.MaxScalingInTower
      ]);

  readonly FullStupid = new Preset(this, 'The Full Stupid', `
      Only a few noble fools have ever completed this.  Be sure to record this
      because pics or it didn't happen.`, [ 
        NoGuarantees.Barrier,
        NoGuarantees.BattleMagic,
        HardMode.Blackout,
        HardMode.ExperienceScalesSlower,
        HardMode.MaxScalingInTower,
        HardMode.Permadeath,
        Monsters.RandomizeWeaknesses,
        Monsters.TowerRobots,
        Routing.OrbsNotRequired,
        Routing.StoryMode,
        World.RandomizeMaps,
        World.ShuffleAreas,
        World.ShuffleHouses,
        World.RandomizeTrades,
        World.RandomizeWallElements,
        World.ShuffleGoaFloors,
        World.UnidentifiedKeyItems,
      ]);
      
  readonly Tournament2024 = new Preset(this, 'Tournament 2024', `
      2024's tournament flags have an emphasis on the randomized
      wild warp flag. This leads to a much wider variety of early
      game plays, and lots of interesting potential routing
      options for clever players.`, [
        World.RandomizeTrades,
        [World.UnidentifiedKeyItems, '?'],
        World.RandomizeWallElements,
        World.ShuffleGoaFloors,
        World.RandomizeSpriteColors,
        World.RandomizeWildWarp,
        Routing.StoryMode,
        Routing.OrbsNotRequired,
        Routing.VanillaDolphin,
        Glitches.GhettoFlight,
        Glitches.StatueGlitch,
        Glitches.MtSabreRequirementSkip,
        Glitches.StatueGauntletSkip,
        Glitches.SwordChargeGlitch,
        Aesthetics.RandomizeMusic,
        Aesthetics.RandomizeMapColors,
        Monsters.RandomizeWeaknesses,
        Monsters.TowerRobots,
        NoGuarantees.BattleMagic,
        NoGuarantees.Barrier,
        NoGuarantees.GasMask,
        HardMode.MaxScalingInTower,
        Vanilla.Maps,
        Vanilla.Shops
      ]);

  readonly Tournament2023 = new Preset(this, 'Tournament 2023', `
      2023's tournament flags debuted some interesting new flags for a
      unique challenge.`, [
        World.RandomizeTrades,
        World.UnidentifiedKeyItems,
        World.RandomizeWallElements,
        World.ShuffleGoaFloors,
        [Routing.StoryMode, '?'],
        Routing.OrbsNotRequired,
        Routing.NoThunderSwordWarp,
        Glitches.GhettoFlight,
        Glitches.StatueGlitch,
        Glitches.MtSabreRequirementSkip,
        Monsters.RandomizeWeaknesses,
        [Monsters.OopsAllMimics, '?'],
        Monsters.TowerRobots,
        NoGuarantees.BattleMagic,
        NoGuarantees.Barrier,
        HardMode.MaxScalingInTower,
        [HardMode.ChargeShotsOnly, '?'],
      ]);

  readonly Tournament2022Early = new Preset(this, 'Tournament 2022 Early Rounds', `
      Lots of potential complexity, but within reason.  Requires all swords and
      bosses, as well as a few glitches, but guarantees a starting sword.`, [ 
        EasyMode.GuaranteeStartingSword,
        Glitches.StatueGlitch,
        Glitches.StatueGauntletSkip,
        [Monsters.RandomizeWeaknesses, '?'],
        Routing.OrbsNotRequired,
        Routing.StoryMode,
        [Routing.VanillaDolphin, '?'],
        [Routing.NoThunderSwordWarp, '?'],
        [World.RandomizeWallElements, '?'],
        [World.ShuffleGoaFloors, '?'],
        [World.RandomizeSpriteColors, '?'],
        [World.RandomizeTrades, '?'],
        [World.UnidentifiedKeyItems, '?'],
      ]);

  readonly Tournament2022Mid = new Preset(this, 'Tournament 2022 Mid Rounds', `
      Some additional challenges compared to the early rounds: some additional
      mystery flags and glitches, as well as max difficulty scaling in the
      tower.`, [ 
        [EasyMode.GuaranteeStartingSword, '?'],
        [Glitches.GhettoFlight, '?'],
        [Glitches.StatueGlitch, '?'],
        [Glitches.MtSabreRequirementSkip, '?'],
        [Glitches.StatueGauntletSkip, '?'],
        HardMode.MaxScalingInTower,
        [HardMode.NoBuffMedicalHerb, '?'],
        [Monsters.RandomizeWeaknesses, '?'],
        [Monsters.TowerRobots, '?'],
        [NoGuarantees.Barrier, '?'],
        [NoGuarantees.BattleMagic, '?'],
        Routing.StoryMode,
        [Routing.VanillaDolphin, '?'],
        [Routing.OrbsNotRequired, '?'],
        [Routing.NoThunderSwordWarp, '?'],
        [World.RandomizeWallElements, '?'],
        [World.ShuffleGoaFloors, '?'],
        [World.RandomizeSpriteColors, '?'],
        [World.RandomizeTrades, '?'],
        [World.UnidentifiedKeyItems, '?'],
      ]);

  readonly Tournament2022Finals = new Preset(this, 'Tournament 2022 Finals Round', `
      Many of the more difficult mystery flags from the mid rounds are now
      always on, plus entrance shuffle.`, [ 
        [EasyMode.GuaranteeStartingSword, '?'],
        Glitches.GhettoFlight,
        Glitches.StatueGlitch,
        Glitches.MtSabreRequirementSkip,
        Glitches.StatueGauntletSkip,
        HardMode.NoBuffMedicalHerb,
        HardMode.MaxScalingInTower,
        [Monsters.RandomizeWeaknesses, '?'],
        [Monsters.TowerRobots, '?'],
        NoGuarantees.Barrier,
        NoGuarantees.BattleMagic,
        Routing.StoryMode,
        [Routing.VanillaDolphin, '?'],
        [Routing.OrbsNotRequired, '?'],
        [Routing.NoThunderSwordWarp, '?'],
        World.ShuffleHouses,
        [World.RandomizeWallElements, '?'],
        [World.ShuffleGoaFloors, '?'],
        [World.RandomizeSpriteColors, '?'],
        [World.RandomizeTrades, '?'],
        [World.UnidentifiedKeyItems, '?'],
      ]);
}

export abstract class FlagSection {
  private static instance: FlagSection;
  private static readonly sections = new Set<FlagSection>();

  static all(): FlagSection[] {
    return [...this.sections];
  }

  protected static flag(name: string, opts: any): Flag {
    FlagSection.sections.add(
        this.instance || (this.instance = new (this as any)()));
    const flag = new Flag(name, opts);
    if (!name.startsWith(this.instance.prefix)) throw new Error(`bad flag ${name} ${opts}`);
    this.instance.flags.set(name, flag);
    return flag;
  }

  abstract readonly prefix: string;
  abstract readonly name: string;
  readonly description?: string;
  readonly flags = new Map<string, Flag>();
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

  static readonly ShuffleAreas = World.flag('Wa', {
    name: 'Shuffle areas',
    text: `Shuffles some or all area connections.`,
    hard: true,
  });

  static readonly ShuffleHouses = World.flag('Wh', {
    name: 'Shuffle house entrances',
    text: `Shuffles all the house entrances, as well as a handful of other
           things, like the palace/fortress-type entrances at the top of
           several towns, and standalone houses.`,
    hard: true,
  });

  static readonly RandomizeTrades = World.flag('Wt', {
    name: 'Randomize trade-in items',
    text: `Items expected by various NPCs will be shuffled: specifically,
           Statue of Onyx, Kirisa Plant, Love Pendant, Ivory Statue, and Fog
           Lamp.  Rage will expect a random sword, and Tornel will expect a
           random bracelet.`,
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
    text: `Wild warp will go to Mezame Shrine and 4-15 other random locations.
           These locations will be considered in-logic.`,
    excludes: ['Vw'],
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
           warped to a random town.  This flag disables the warp.  If set as
           "R!t", then the warp will always go to Shyron, like in vanilla.`,
    modes: '!',
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
           and shell flute are required, and Kensu no longer drops an item.`,
  });
}

class Glitches extends FlagSection {
  readonly prefix = 'G';
  readonly name = 'Glitches';
  readonly description = `
      By default, the randomizer disables all known glitches (except ghetto
      flight).  These flags selectively re-enable certain glitches.  Most of
      these flags have two modes: normally enabling a glitch will add it as
      possibly required by logic, but clicking a second time will add a '!'
      and enable the glitch outside of logic (e.g. "G!c").`;

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
    modes: '!',
  });

  static readonly MtSabreRequirementSkip = Glitches.flag('Gn', {
    name: 'Mt Sabre requirements skip',
    text: `Entering Mt Sabre North normally requires (1) having Teleport,
           and (2) talking to the rabbit in Leaf after the abduction (via
           Telepathy).  Both of these requirements can be skipped: first by
           flying over the river in Cordel plain rather than crossing the
           bridge, and then by threading the needle between the hitboxes in
           Mt Sabre North.`,
    modes: '!',
  });

  static readonly StatueGauntletSkip = Glitches.flag('Gg', {
    name: 'Statue gauntlet skip',
    text: `The shooting statues in front of Goa and Stxy normally require
           Barrier to pass safely.  With this flag, Flight can also be used
           by flying around the edge of the statue.`,
    modes: '!',
  });

  static readonly SwordChargeGlitch = Glitches.flag('Gc', {
    name: 'Sword charge glitch',
    text: `Sword charge glitch allows charging one sword to the level of
           another sword by equipping the higher-level sword, re-entering
           the menu, changing to the lower-level sword without exiting the
           menu, creating a hard save, resetting, and then continuing.`,
    hard: true,
    modes: '!',
  });

  static readonly TriggerSkip = Glitches.flag('Gt', {
    name: 'Trigger skip',
    text: `A wide variety of triggers and exit squares can be skipped by
           using an invalid item every frame while walking.  This allows
           bypassing both Mt Sabre North entrance triggers, the Evil Spirit
           Island entrance trigger, triggers for guards to move, slopes,
           damage tiles, and seamless map transitions.`,
    hard: true,
    modes: '!',
  });

  static readonly RageSkip = Glitches.flag('Gr', {
    name: 'Rage skip',
    text: `Rage can be skipped by damage-boosting diagonally into the Lime
           Tree Lake screen.  This provides access to the area beyond the
           lake if flight or bridges are available.  For simplicity, the
           logic only assumes this is possible if there's a flyer.`,
    hard: true,
    modes: '!',
  });
}

class Aesthetics extends FlagSection {
  readonly prefix = 'A';
  readonly name = 'Aesthetics';
  readonly description = `
      These flags don't directly affect gameplay or shuffling, but they do
      affect the experience significantly enough that there are three modes
      for each: "off", "optional" (no exclamation point), and "required"
      (exclamation point).  The first two are equivalent for seed generation
      purposes, so that you can play the same seed with either setting.
      Setting it to "!" will change the seed.`;

  static readonly RandomizeMusic = Aesthetics.flag('Am', {
    name: 'Randomize background music',
    modes: '!',
    optional: NO_BANG,
  });

  static readonly NoMusic = Aesthetics.flag('As', {
    name: 'No background music',
    optional: OPTIONAL,
  });

  static readonly RandomizeMapColors = Aesthetics.flag('Ac', {
    name: 'Randomize map colors',
    modes: '!',
    optional: NO_BANG,
  });
}

class Monsters extends FlagSection {
  readonly prefix = 'M';
  readonly name = 'Monsters';

  static readonly RandomizeWeaknesses = Monsters.flag('Me', {
    name: 'Randomize monster weaknesses',
    text: `Monster and boss elemental weaknesses are shuffled.`,
  });

  static readonly OopsAllMimics = Monsters.flag('Mg', {
    name: 'Replace all chests with mimics',
    text: `Every chest is now a mimic, and killing the mimic will drop
           the real item chest. Careful when killing the mimic, if it
           drops the chest out of reach you'll need to reset the room!`,
    hard: true,
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

  static readonly NoCommunityJokes = EasyMode.flag('Ec', {
    name: 'No community jokes',
    text: `Skip community jokes, such as funny/misspelled item, monster, or
           character names.  This will make it easier to look up information
           in guides/FAQs if necessary.`,
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
    name: 'Matching sword not guaranteed ("Tink Mode")',
    text: `Enables "tink strats", where wrong-element swords will still do a
           single damage per hit.  Player may be required to fight monsters
           (including bosses) with tinks.`,
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
    text: `The logic will not guarantee gas mask before needing to enter the swamp,
           nor will leather boots (or hazmat suit) be guaranteed to cross long
           stretches of spikes.  Gas mask is still guaranteed to kill the insect.`,
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

  static readonly Blackout = HardMode.flag('Hz', {
    name: 'Blackout',
    text: `All caves and fortresses are permanently dark.`,
    hard: true,
  });

  static readonly Permadeath = HardMode.flag('Hh', {
    name: 'Permadeath',
    text: `Hardcore mode: checkpoints and saves are removed.`,
    hard: true,
  });
}

class Vanilla extends FlagSection {
  readonly name = 'Vanilla';
  readonly prefix = 'V';
  readonly description = `
      Options to restore vanilla behavior changed by default.`;

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
  static readonly Maps = Vanilla.flag('Vm', {
    name: 'Vanilla maps',
    text: `Normally the randomizer adds a new "East Cave" to Valley of Wind,
           borrowed from the GBC version of the game.  This cave contains two
           chests (one considered a key item) on the upper floor and exits to
           two random areas (chosen between Lime Tree Valley, Cordel Plain,
           Goa Valley, or Desert 2; the quicksand is removed from the entrances
           to Pyramid and Crypt), one unblocked on the lower floor, and one
           down the stairs and behind a rock wall from the upper floor.  This
           flag prevents adding that cave.  If set as "V!m" then a direct path
           will instead be added between Valley of Wind and Lime Tree Valley
           (as in earlier versions of the randomizer).`,
    modes: '!',
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
           all wild warp locations in logic unless the flag is set as (V!w).`,
    modes: '!',
  });

  static readonly Hud = Vanilla.flag('Vh', {
    name: 'Vanilla HUD',
    text: `By default, the blue status bar (HUD) at the bottom of the screen
           is reorganized a bit, including displaying enemies' names and HP.
           This can be set either as Vh (which will optionally disable the
           changes, and will produce the same seed as not setting Vh) or as
           V!h (which requires all players to disable it to get the same
            seed).`,
    modes: '!',
    optional: NO_BANG,
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
    optional: OPTIONAL,
  });

  static readonly NoControllerShortcuts = Quality.flag('Qc', {
    name: 'Disable controller shortcuts',
    text: `By default, we disable second controller input and instead enable
           some new shortcuts on controller 1: Start+A+B for wild warp, and
           Select+B to quickly change swords.  To support this, the action of
           the start and select buttons is changed slightly.  This flag
           disables this change and retains normal behavior.`,
    optional: OPTIONAL,
  });

  static readonly AudibleWallCues = Quality.flag('Qw', {
    name: 'Audible wall cues',
    text: `Provide an audible cue when failing to break a non-iron wall.
           The intended way to determine which sword is required for normal
           cave walls is by looking at the color.  This causes the level 3
           sword sound of the required element to play when the wall fails
           to break.  Note that fortress walls (iron in vanilla) do not give
           this hint, since there is no visual cue for them, either.`,
    optional: OPTIONAL,
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

  static readonly NoShuffle = DebugMode.flag('Dn', {
    name: 'Do not shuffle items',
    text: `Items will not be shuffled. WARNING: This disables the logic and
           is very likely to result in an unwinnable seed`,
  });
}

export class FlagSet {
  private flags: Map<Flag, Mode>;

  constructor(str: string|Map<Flag, Mode> = '@Casual') {
    if (typeof str !== 'string') {
      this.flags = new Map();
      for (const [k, v] of str) {
        this.set(k.flag, v);
      }
      return;
    }
    if (str.startsWith('@')) {
      // TODO - support '@Casual+Rs-Ed'
      const expanded = Presets.get(str.substring(1));
      if (!expanded) throw new UsageError(`Unknown preset: ${str}`);
      this.flags = new Map(expanded.flags);
      return;
    }
    this.flags = new Map();
    // parse the string
    str = str.replace(/[^A-Za-z0-9!?]/g, '');
    const re = /([A-Z])([a-z0-9!?]+)/g;
    let match;
    while ((match = re.exec(str))) {
      const [, key, terms] = match;
      const re2 = /([!?]|^)([a-z0-9]+)/g;
      while ((match = re2.exec(terms))) {
        const [, mode, flags] = match;
        for (const flag of flags) {
          this.set(key + flag, mode || true);
        }
      }
    }
  }

  filterOptional(): FlagSet {
    return new FlagSet(
        new Map(
            [...this.flags].map(
                ([k, v]) => [k, k.opts.optional ? k.opts.optional(v) : v])));
  }

  filterRandom(random: Random): FlagSet {
    function pick(k: Flag, v: Mode): Mode {
      if (v !== '?') return v;
      return random.pick([true, false, ...(k.opts.modes || '')]);
    }
    return new FlagSet(
        new Map([...this.flags].map(([k, v]) => [k, pick(k, v)])));
  }

  toString() {
    type Section = DefaultMap<string, string[]>;
    const sections =
        new DefaultMap<string, Section>(
            () => new DefaultMap<string, string[]>(() => []))
    for (const [flag, mode] of this.flags) {
      if (flag.flag.length !== 2) throw new Error(`Bad flag ${flag.flag}`);
      if (!mode) continue;
      const section = sections.get(flag.flag[0]);
      const subsection = mode === true ? '' : mode;
      section.get(subsection).push(flag.flag[1]);
    }
    const out = [];
    for (const [key, section] of sections.sortedEntries()) {
      let sec = key;
      for (const [subkey, subsection] of section.sortedEntries()) {
        sec += subkey + subsection.sort().join('');
      }
      out.push(sec);
    }
    return out.join(' ');
  }

  toggle(name: string): Mode {
    const flag = Flag.flags.get(name);
    if (!flag) {
      // TODO - Report something
      console.error(`Bad flag: ${name}`);
      return false;
    }
    const mode: Mode = this.flags.get(flag) || false;
    const modes = [false, true, ...(flag.opts.modes || ''), '?', false];
    const index = modes.indexOf(mode);
    if (index < 0) throw new Error(`Bad current mode ${mode}`);
    const next = modes[index + 1];
    this.flags.set(flag, next);
    return next;
  }

  set(name: string, mode: Mode) {
    const flag = Flag.flags.get(name);
    if (!flag) {
      // TODO - Report something
      console.error(`Bad flag: ${name}`);
      return;
    }
    if (!mode) {
      this.flags.delete(flag);
    } else if (mode === true || mode === '?' || flag.opts.modes?.includes(mode)) {
      this.flags.set(flag, mode);
    } else {
      console.error(`Bad flag mode: ${name[0]}${mode}${name.substring(1)}`);
      return;
    }
    // Remove any conflicts
    for (const excluded of flag.opts.excludes || []) {
      this.flags.delete(Flag.flags.get(excluded)!);
    }
  }

  check(name: Flag|string, ...modes: Mode[]): boolean {
    const flag = name instanceof Flag ? name : Flag.flags.get(name);
    if (!modes.length) modes.push(true);
    return modes.includes(flag && this.flags.get(flag) || false);
  }

  get(name: Flag|string): Mode {
    const flag = name instanceof Flag ? name : Flag.flags.get(name);
    return flag && this.flags.get(flag) || false;
  }

  alwaysMimics(): boolean {
    return this.check(Monsters.OopsAllMimics);
  }

  preserveUniqueChecks(): boolean {
    return this.check(EasyMode.PreserveUniqueChecks);
  }
  shuffleMimics(): boolean {
    return this.check(EasyMode.NoShuffleMimics, false);
  }

  buffDeosPendant(): boolean {
    return this.check(Vanilla.BonusItems, false);
  }
  changeGasMaskToHazmatSuit(): boolean {
    return this.check(Vanilla.BonusItems, false);
  }
  slowDownTornado(): boolean {
    return this.check(Vanilla.BonusItems, false);
  }
  leatherBootsGiveSpeed(): boolean {
    return this.check(Vanilla.BonusItems, false);
  }
  rabbitBootsChargeWhileWalking(): boolean {
    return this.check(Vanilla.BonusItems, false) || this.check(HardMode.ChargeShotsOnly);
  }

  shuffleSpritePalettes(): boolean {
    return this.check(World.RandomizeSpriteColors);
  }
  shuffleMonsters(): boolean {
    return true; // this.check('Mr');
  }
  shuffleShops(): boolean {
    return this.check(Vanilla.Shops, false);
  }
  bargainHunting(): boolean {
    return this.shuffleShops();
  }

  shuffleTowerMonsters(): boolean {
    return this.check(Monsters.TowerRobots);
  }
  shuffleMonsterElements(): boolean {
    return this.check(Monsters.RandomizeWeaknesses);
  }
  shuffleBossElements(): boolean {
    return this.shuffleMonsterElements();
  }

  buffMedicalHerb(): boolean {
    return this.check(HardMode.NoBuffMedicalHerb, false);
  }
  decreaseEnemyDamage(): boolean {
    return this.check(EasyMode.DecreaseEnemyDamage);
  }
  trainer(): boolean {
    return this.check(DebugMode.TrainerMode);
  }
  neverDie(): boolean {
    return this.check(DebugMode.NeverDie);
  }
  noShuffle(): boolean {
    return this.check(DebugMode.NoShuffle);
  }
  chargeShotsOnly(): boolean {
    return this.check(HardMode.ChargeShotsOnly);
  }

  barrierRequiresCalmSea(): boolean {
    return true; // this.check('Rl');
  }
  // paralysisRequiresPrisonKey(): boolean {
  //   return true; // this.check('Rl');
  // }
  // sealedCaveRequiresWindmill(): boolean {
  //   return true; // this.check('Rl');
  // }

  connectLimeTreeToLeaf(): boolean {
    return this.check(Vanilla.Maps, '!');
  }
  // connectGoaToLeaf() {
  //   return this.check('Xe') && this.check('Xg');
  // }
  // removeEarlyWall() {
  //   return this.check('Xb');
  // }
  addEastCave(): boolean {
    return this.check(Vanilla.Maps, false);
  }
  zebuStudentGivesItem(): boolean {
    // If he's not guaranteed to be at the start, move check to mezame instead
    return !this.shuffleAreas() && !this.shuffleHouses();
  }
  fogLampNotRequired(): boolean {
    return this.check(Routing.VanillaDolphin, false);
  }
  storyMode(): boolean {
    return this.check(Routing.StoryMode);
  }
  noBowMode(): boolean {
    return this.check(Routing.NoBowMode);
  }
  requireHealedDolphinToRide(): boolean {
    return this.check(Routing.VanillaDolphin);
  }
  saharaRabbitsRequireTelepathy(): boolean {
    return true; // this.check('Rr');
  }
  teleportOnThunderSword(): boolean {
    return this.check(Routing.NoThunderSwordWarp, false, '!');
  }
  randomizeThunderTeleport() {
    return this.check(Routing.NoThunderSwordWarp, false);
  }
  orbsOptional() {
    return this.check(Routing.OrbsNotRequired);
  }

  shuffleGoaFloors() {
    return this.check(World.ShuffleGoaFloors);
  }
  shuffleHouses() {
    return this.check(World.ShuffleHouses);
  }
  shuffleAreas() {
    // TODO: consider multiple levels of shuffle?
    return this.check(World.ShuffleAreas);
  }
  mayShuffleAreas() {
    // includes '?'
    return !this.check(World.ShuffleAreas, false);
  }
  randomizeMaps() {
    return this.check(World.RandomizeMaps);
  }
  randomizeTrades() {
    return this.check(World.RandomizeTrades);
  }
  unidentifiedItems() {
    return this.check(World.UnidentifiedKeyItems);
  }
  randomizeWalls() {
    return this.check(World.RandomizeWallElements);
  }

  guaranteeSword() {
    return this.check(EasyMode.GuaranteeStartingSword);
  }
  guaranteeSwordMagic() {
    return this.check(NoGuarantees.BattleMagic, false);
  }
  guaranteeMatchingSword() {
    return this.check(NoGuarantees.MatchingSword, false);
  }
  guaranteeGasMask() {
    return this.check(NoGuarantees.GasMask, false);
  }
  guaranteeBarrier() {
    return this.check(NoGuarantees.Barrier, false);
  }
  guaranteeRefresh() {
    return this.check(EasyMode.GuaranteeRefresh);
  }
  communityJokes() {
    return this.check(EasyMode.NoCommunityJokes, false);
  }

  disableSwordChargeGlitch() {
    return this.check(Glitches.SwordChargeGlitch, false);
  }
  disableTeleportSkip() {
    return this.check(Glitches.MtSabreRequirementSkip, false);
  }
  disableRabbitSkip() {
    return this.check(Glitches.MtSabreRequirementSkip, false);
  }
  disableShopGlitch() {
    return this.check(Vanilla.Shops, false);
  }
  disableStatueGlitch() {
    return this.check(Glitches.StatueGlitch, false);
  }
  disableRageSkip() {
    return this.check(Glitches.RageSkip, false);
  }
  disableTriggerGlitch() {
    return this.check(Glitches.TriggerSkip, false);
  }
  disableFlightStatueSkip() {
    return this.check(Glitches.StatueGauntletSkip, false);
  }

  assumeSwordChargeGlitch() {
    return this.check(Glitches.SwordChargeGlitch);
  }
  assumeGhettoFlight() {
    return this.check(Glitches.GhettoFlight);
  }
  assumeTeleportSkip() {
    return this.check(Glitches.MtSabreRequirementSkip);
  }
  assumeRabbitSkip() {
    return this.check(Glitches.MtSabreRequirementSkip);
  }
  assumeStatueGlitch() {
    return this.check(Glitches.StatueGlitch);
  }
  assumeTriggerGlitch() {
    return this.check(Glitches.TriggerSkip);
  }
  assumeFlightStatueSkip() {
    return this.check(Glitches.StatueGauntletSkip);
  }
  assumeWildWarp() {
    return this.check(Vanilla.WildWarp, true) ||
        this.check(World.RandomizeWildWarp);
  }
  assumeRageSkip() {
    return this.check(Glitches.RageSkip);
  }

  nerfWildWarp() {
    return this.check(Vanilla.WildWarp, false) &&
        this.check(World.RandomizeWildWarp, false);
  }
  allowWildWarp() {
    return !this.nerfWildWarp();
  }
  randomizeWildWarp() {
    return this.check(World.RandomizeWildWarp, true);
  }

  blackoutMode() {
    return this.check(HardMode.Blackout);
  }
  hardcoreMode() {
    return this.check(HardMode.Permadeath);
  }
  buffDyna() {
    return !this.check(Vanilla.Dyna);
  }
  maxScalingInTower() {
    return this.check(HardMode.MaxScalingInTower);
  }

  expScalingFactor() {
    return this.check(HardMode.ExperienceScalesSlower) ? 0.25 :
        this.check(EasyMode.ExperienceScalesFaster) ? 2.5 : 1;
  }

  // OPTIONAL FLAGS
  autoEquipBracelet(pass: 'early' | 'late'): boolean {
    return pass === 'early' || this.check(Quality.NoAutoEquip, false);
  }
  controllerShortcuts(pass: 'early' | 'late'): boolean {
    return pass === 'early' || this.check(Quality.NoControllerShortcuts, false);
  }
  randomizeMusic(pass: 'early' | 'late'): boolean {
    return this.check(Aesthetics.RandomizeMusic, pass === 'early' ? '!' : true);
  }
  shuffleTilePalettes(pass: 'early' | 'late'): boolean {
    return this.check(Aesthetics.RandomizeMapColors,
                      pass === 'early' ? '!' : true);
  }
  noMusic(pass: 'early' | 'late'): boolean {
    return pass === 'late' && this.check(Aesthetics.NoMusic);
  }
  audibleWallCues(pass: 'early' | 'late'): boolean {
    return pass === 'late' && this.check(Quality.AudibleWallCues);
  }

  shouldColorSwordElements(): boolean {
    return true;
  }
  
  shouldUpdateHud(): boolean {
    return this.check(Vanilla.Hud, false);
  }

  hasStatTracking(): boolean {
    return true;
  }

  buryFlightStartSphere(): number {
    return 7; // we tested at 10 and it's pretty effective; use 7 for now tho.
  }

  validate(): void {
    if (this.shuffleAreas() && this.preserveUniqueChecks()) {
      throw new UsageError('Wa and Eu are incompatible');
    }
  }
}
