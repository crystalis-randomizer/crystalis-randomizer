import { UsageError, DefaultMap } from './util.js';
const OPTIONAL = (mode) => '';
const NO_BANG = (mode) => mode === true ? false : mode;
export class Flag {
    constructor(flag, opts) {
        this.flag = flag;
        this.opts = opts;
        Flag.flags.set(flag, this);
    }
    static all() {
        return [...this.flags.values()];
    }
}
Flag.flags = new Map();
export class Preset {
    constructor(parent, name, description, flags) {
        this.name = name;
        this.description = description;
        this.flags = flags.map(f => f instanceof Flag ? [f, true] : f);
        parent.presets.set(mapPresetName(name), this);
    }
    static all() {
        if (!Presets.instance)
            Presets.instance = new Presets();
        return [...Presets.instance.presets.values()];
    }
    get flagString() {
        if (this._flagString == null) {
            this._flagString = String(new FlagSet(`@${this.name}`));
        }
        return this._flagString;
    }
}
function mapPresetName(name) {
    return name.toLowerCase().replace(/[^a-z]/g, '');
}
class Presets {
    constructor() {
        this.presets = new Map();
        this.Casual = new Preset(this, 'Casual', `
      Basic flags for a relatively easy playthrough.  This is a good
      place to start.`, [
            EasyMode.PreserveUniqueChecks,
            EasyMode.NoShuffleMimics,
            EasyMode.DecreaseEnemyDamage,
            EasyMode.GuaranteeRefresh,
            EasyMode.GuaranteeStartingSword,
            EasyMode.ExperienceScalesFaster,
            Routing.NoThunderSwordWarp,
            Vanilla.Shops,
            Vanilla.Dyna,
            [Vanilla.Maps, '!'],
            [Vanilla.WildWarp, '!'],
            DebugMode.SpoilerLog,
        ]);
        this.Classic = new Preset(this, 'Classic', `
      Provides a relatively quick playthough with a reasonable amount of
      challenge.  Similar to older versions.`, [
            EasyMode.GuaranteeStartingSword,
            Glitches.StatueGlitch,
            [Routing.NoThunderSwordWarp, '!'],
            [Vanilla.Maps, '!'],
            DebugMode.SpoilerLog,
        ]);
        this.Standard = new Preset(this, 'Standard', `
      Well-balanced, standard race flags.`, [
            Monsters.RandomizeWeaknesses,
            Routing.StoryMode,
            DebugMode.SpoilerLog,
        ]);
        this.NoBowMode = new Preset(this, 'No Bow Mode', `
      The tower is open from the start, as soon as you're ready for it.`, [
            Monsters.RandomizeWeaknesses,
            Monsters.TowerRobots,
            HardMode.MaxScalingInTower,
            Routing.NoBowMode,
            DebugMode.SpoilerLog,
        ]);
        this.Advanced = new Preset(this, 'Advanced', `
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
        this.WildWarp = new Preset(this, 'Wild Warp', `
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
        this.Hardcore = new Preset(this, 'Hardcore', `
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
        this.FullStupid = new Preset(this, 'The Full Stupid', `
      Only TheAxeMan has ever completed this.  Be sure to record this because
      pics or it didn't happen.`, [
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
        this.Mystery = new Preset(this, 'Mystery', `
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
    }
    static get(name) {
        if (!this.instance)
            this.instance = new Presets();
        return this.instance.presets.get(mapPresetName(name));
    }
}
export class FlagSection {
    constructor() {
        this.flags = new Map();
    }
    static all() {
        return [...this.sections];
    }
    static flag(name, opts) {
        FlagSection.sections.add(this.instance || (this.instance = new this()));
        const flag = new Flag(name, opts);
        if (!name.startsWith(this.instance.prefix))
            throw new Error(`bad flag`);
        this.instance.flags.set(name, flag);
        return flag;
    }
}
FlagSection.sections = new Set();
class World extends FlagSection {
    constructor() {
        super(...arguments);
        this.prefix = 'W';
        this.name = 'World';
    }
}
World.RandomizeMaps = World.flag('Wm', {
    name: 'Randomize maps',
    text: `Individual maps are randomized.  For now this is only a subset of
           possible maps.  A randomized map will have all the same features
           (exits, chests, NPCs, etc) except things are moved around.`,
    hard: true,
});
World.ShuffleAreas = World.flag('Wa', {
    name: '???',
    text: '???',
    hard: true,
});
World.ShuffleHouses = World.flag('Wh', {
    name: 'Shuffle house entrances',
    text: `Shuffles all the house entrances, as well as a handful of other
           things, like the palace/fortress-type entrances at the top of
           several towns, and standalone houses.`,
    hard: true,
});
World.RandomizeTrades = World.flag('Wt', {
    name: 'Randomize trade-in items',
    text: `Items expected by various NPCs will be shuffled: specifically,
           Statue of Onyx, Kirisa Plant, Love Pendant, Ivory Statue, Fog
           Lamp, and Flute of Lime (for Akahana).  Rage will expect a
           random sword, and Tornel will expect a random bracelet.`,
    hard: true,
});
World.UnidentifiedKeyItems = World.flag('Wu', {
    name: 'Unidentified key items',
    text: `Item names will be generic and effects will be shuffled.  This
           includes keys, flutes, lamps, and statues.`,
    hard: true,
});
World.RandomizeWallElements = World.flag('We', {
    name: 'Randomize elements to break walls',
    text: `Walls will require a randomized element to break.  Normal rock and
           ice walls will indicate the required element by the color (light
           grey or yellow for wind, blue for fire, bright orange ("embers") for
           water, or dark grey ("steel") for thunder.  The element to break
           these walls is the same throughout an area.  Iron walls require a
           one-off random element, with no visual cue, and two walls in the
           same area may have different requirements.`,
});
World.ShuffleGoaFloors = World.flag('Wg', {
    name: 'Shuffle Goa fortress floors',
    text: `The four areas of Goa fortress will appear in a random order.`,
});
World.RandomizeSpriteColors = World.flag('Ws', {
    name: 'Randomize sprite colors',
    text: `Monsters and NPCs will have different colors.  This is not an
           optional flag because it affects what monsters can be grouped
           together.`,
});
World.RandomizeWildWarp = World.flag('Ww', {
    name: 'Randomize wild warp',
    text: `Wild warp will go to Mezame Shrine and 15 other random locations.
           These locations will be considered in-logic.`,
    excludes: ['Vw'],
});
class Routing extends FlagSection {
    constructor() {
        super(...arguments);
        this.prefix = 'R';
        this.name = 'Routing';
    }
}
Routing.StoryMode = Routing.flag('Rs', {
    name: 'Story Mode',
    text: `Draygon 2 won't spawn unless you have all four swords and have
           defeated all major bosses of the tetrarchy.`,
});
Routing.NoBowMode = Routing.flag('Rb', {
    name: 'No Bow mode',
    text: `No items are required to finish the game.  An exit is added from
           Mezame shrine directly to the Draygon 2 fight (and the normal entrance
           is removed).  Draygon 2 spawns automatically with no Bow of Truth.`,
});
Routing.OrbsNotRequired = Routing.flag('Ro', {
    name: 'Orbs not required to break walls',
    text: `Walls can be broken and bridges formed with level 1 shots.`
});
Routing.NoThunderSwordWarp = Routing.flag('Rt', {
    name: 'No Sword of Thunder warp',
    text: `Normally when acquiring the thunder sword, the player is instantly
           warped to a random town.  This flag disables the warp.  If set as
           "R!t", then the warp will always go to Shyron, like in vanilla.`,
    modes: '!',
});
Routing.VanillaDolphin = Routing.flag('Rd', {
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
class Glitches extends FlagSection {
    constructor() {
        super(...arguments);
        this.prefix = 'G';
        this.name = 'Glitches';
        this.description = `
      By default, the randomizer disables all known glitches (except ghetto
      flight).  These flags selectively re-enable certain glitches.  Most of
      these flags have two modes: normally enabling a glitch will add it as
      possibly required by logic, but clicking a second time will add a '!'
      and enable the glitch outside of logic (e.g. "G!c").`;
    }
}
Glitches.GhettoFlight = Glitches.flag('Gf', {
    name: 'Ghetto flight',
    text: `Ghetto flight allows using Dolphin and Rabbit Boots to fly up the
           waterfalls in the Angry Sea (without calming the whirlpools).
           This is done by swimming up to a diagonal beach and jumping
           in a different direction immediately before disembarking.`,
});
Glitches.StatueGlitch = Glitches.flag('Gs', {
    name: 'Statue glitch',
    text: `Statue glitch allows getting behind statues that block certain
           entrances: the guards in Portoa, Amazones, Oak, Goa, and Shyron,
           as well as the statues in the Waterfall Cave.  It is done by
           approaching the statue from the top right and holding down and
           left on the controller while mashing B.`,
    modes: '!',
});
Glitches.MtSabreRequirementSkip = Glitches.flag('Gn', {
    name: 'Mt Sabre requirements skip',
    text: `Entering Mt Sabre North normally requires (1) having Teleport,
           and (2) talking to the rabbit in Leaf after the abduction (via
           Telepathy).  Both of these requirements can be skipped: first by
           flying over the river in Cordel plain rather than crossing the
           bridge, and then by threading the needle between the hitboxes in
           Mt Sabre North.`,
    modes: '!',
});
Glitches.StatueGauntletSkip = Glitches.flag('Gg', {
    name: 'Statue gauntlet skip',
    text: `The shooting statues in front of Goa and Stxy normally require
           Barrier to pass safely.  With this flag, Flight can also be used
           by flying around the edge of the statue.`,
    modes: '!',
});
Glitches.SwordChargeGlitch = Glitches.flag('Gc', {
    name: 'Sword charge glitch',
    text: `Sword charge glitch allows charging one sword to the level of
           another sword by equipping the higher-level sword, re-entering
           the menu, changing to the lower-level sword without exiting the
           menu, creating a hard save, resetting, and then continuing.`,
    hard: true,
    modes: '!',
});
Glitches.TriggerSkip = Glitches.flag('Gt', {
    name: 'Trigger skip',
    text: `A wide variety of triggers and exit squares can be skipped by
           using an invalid item every frame while walking.  This allows
           bypassing both Mt Sabre North entrance triggers, the Evil Spirit
           Island entrance trigger, triggers for guards to move, slopes,
           damage tiles, and seamless map transitions.`,
    hard: true,
    modes: '!',
});
Glitches.RageSkip = Glitches.flag('Gr', {
    name: 'Rage skip',
    text: `Rage can be skipped by damage-boosting diagonally into the Lime
           Tree Lake screen.  This provides access to the area beyond the
           lake if flight or bridges are available.  For simplicity, the
           logic only assumes this is possible if there's a flyer.`,
    hard: true,
    modes: '!',
});
class Aesthetics extends FlagSection {
    constructor() {
        super(...arguments);
        this.prefix = 'A';
        this.name = 'Aesthetics';
        this.description = `
      These flags don't directly affect gameplay or shuffling, but they do
      affect the experience significantly enough that there are three modes
      for each: "off", "optional" (no exclamation point), and "required"
      (exclamation point).  The first two are equivalent for seed generation
      purposes, so that you can play the same seed with either setting.
      Setting it to "!" will change the seed.`;
    }
}
Aesthetics.RandomizeMusic = Aesthetics.flag('Am', {
    name: 'Randomize background music',
    modes: '!',
    optional: NO_BANG,
});
Aesthetics.NoMusic = Aesthetics.flag('As', {
    name: 'No background music',
    optional: OPTIONAL,
});
Aesthetics.RandomizeMapColors = Aesthetics.flag('Ac', {
    name: 'Randomize map colors',
    modes: '!',
    optional: NO_BANG,
});
class Monsters extends FlagSection {
    constructor() {
        super(...arguments);
        this.prefix = 'M';
        this.name = 'Monsters';
    }
}
Monsters.RandomizeWeaknesses = Monsters.flag('Me', {
    name: 'Randomize monster weaknesses',
    text: `Monster and boss elemental weaknesses are shuffled.`,
});
Monsters.TowerRobots = Monsters.flag('Mt', {
    name: 'Shuffle tower robots',
    text: `Tower robots will be shuffled into the normal pool.  At some
           point, normal monsters may be shuffled into the tower as well.`,
    hard: true,
});
class EasyMode extends FlagSection {
    constructor() {
        super(...arguments);
        this.prefix = 'E';
        this.name = 'Easy Mode';
        this.description = `
      The following options make parts of the game easier.`;
    }
}
EasyMode.NoShuffleMimics = EasyMode.flag('Et', {
    name: `Don't shuffle mimics.`,
    text: `Mimics will be in their vanilla locations.`,
});
EasyMode.PreserveUniqueChecks = EasyMode.flag('Eu', {
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
EasyMode.DecreaseEnemyDamage = EasyMode.flag('Ed', {
    name: 'Decrease enemy damage',
    text: `Enemy attack power will be significantly decreased in the early game
           (by a factor of 3).  The gap will narrow in the mid-game and eventually
           phase out at scaling level 40.`,
});
EasyMode.GuaranteeStartingSword = EasyMode.flag('Es', {
    name: 'Guarantee starting sword',
    text: `The Leaf elder is guaranteed to give a sword.  It will not be
           required to deal with any enemies before finding the first sword.`,
});
EasyMode.GuaranteeRefresh = EasyMode.flag('Er', {
    name: 'Guarantee refresh',
    text: `Guarantees the Refresh spell will be available before fighting
           Tetrarchs.`,
});
EasyMode.ExperienceScalesFaster = EasyMode.flag('Ex', {
    name: 'Experience scales faster',
    text: `Less grinding will be required to "keep up" with the game difficulty.`,
    excludes: ['Hx'],
});
class NoGuarantees extends FlagSection {
    constructor() {
        super(...arguments);
        this.prefix = 'N';
        this.name = 'No guarantees';
        this.description = `
      Removes various guarantees from the logic.`;
    }
}
NoGuarantees.BattleMagic = NoGuarantees.flag('Nw', {
    name: 'Battle magic not guaranteed',
    text: `Normally, the logic will guarantee that level 3 sword charges are
           available before fighting the tetrarchs (with the exception of Karmine,
           who only requires level 2).  This disables that check.`,
    hard: true,
});
NoGuarantees.MatchingSword = NoGuarantees.flag('Ns', {
    name: 'Matching sword not guaranteed ("Tink Mode")',
    text: `Enables "tink strats", where wrong-element swords will still do a
           single damage per hit.  Player may be required to fight monsters
           (including bosses) with tinks.`,
    hard: true,
});
NoGuarantees.Barrier = NoGuarantees.flag('Nb', {
    name: 'Barrier not guaranteed',
    text: `Normally, the logic will guarantee Barrier (or else refresh and shield
           ring) before entering Stxy, the Fortress, or fighting Karmine.  This
           disables that check.`,
    hard: true,
});
NoGuarantees.GasMask = NoGuarantees.flag('Ng', {
    name: 'Gas mask not guaranteed',
    text: `The logic will not guarantee gas mask before needing to enter the swamp,
           nor will leather boots (or hazmat suit) be guaranteed to cross long
           stretches of spikes.  Gas mask is still guaranteed to kill the insect.`,
    hard: true,
});
class HardMode extends FlagSection {
    constructor() {
        super(...arguments);
        this.prefix = 'H';
        this.name = 'Hard mode';
    }
}
HardMode.NoBuffMedicalHerb = HardMode.flag('Hm', {
    name: `Don't buff medical herb or fruit of power`,
    text: `Medical Herb is not buffed to heal 80 damage, which is helpful to make
           up for cases where Refresh is unavailable early.  Fruit of Power is not
           buffed to restore 56 MP.`,
    hard: true,
});
HardMode.MaxScalingInTower = HardMode.flag('Ht', {
    name: 'Max scaling level in tower',
    text: `Enemies in the tower spawn at max scaling level.`,
    hard: true,
});
HardMode.ExperienceScalesSlower = HardMode.flag('Hx', {
    name: 'Experience scales slower',
    text: `More grinding will be required to "keep up" with the difficulty.`,
    excludes: ['Ex'],
    hard: true,
});
HardMode.ChargeShotsOnly = HardMode.flag('Hc', {
    name: 'Charge shots only',
    text: `Stabbing is completely ineffective.  Only charged shots work.`,
    hard: true,
});
HardMode.Blackout = HardMode.flag('Hz', {
    name: 'Blackout',
    text: `All caves and fortresses are permanently dark.`,
    hard: true,
});
HardMode.Permadeath = HardMode.flag('Hh', {
    name: 'Permadeath',
    text: `Hardcore mode: checkpoints and saves are removed.`,
    hard: true,
});
class Vanilla extends FlagSection {
    constructor() {
        super(...arguments);
        this.name = 'Vanilla';
        this.prefix = 'V';
        this.description = `
      Options to restore vanilla behavior changed by default.`;
    }
}
Vanilla.Dyna = Vanilla.flag('Vd', {
    name: `Don't buff Dyna`,
    text: `By default, we makes the Dyna fight a bit more of a challenge.
           Side pods will fire significantly more.  The safe spot has been
           removed.  The revenge beams pass through barrier.  Side pods can
           now be killed.  This flag prevents that change.`,
});
Vanilla.BonusItems = Vanilla.flag('Vb', {
    name: `Don't buff bonus items`,
    text: `Leather Boots are changed to Speed Boots, which increase player walking
           speed (this allows climbing up the slope to access the Tornado Bracelet
           chest, which is taken into consideration by the logic).  Deo's pendant
           restores MP while moving.  Rabbit boots enable sword charging up to
           level 2 while walking (level 3 still requires being stationary, so as
           to prevent wasting tons of magic).`,
});
Vanilla.Maps = Vanilla.flag('Vm', {
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
Vanilla.Shops = Vanilla.flag('Vs', {
    name: 'Vanilla shops',
    text: `By default, we disable shop glitch, shuffle shop contents, and tie
           the prices to the scaling level (item shops and inns increase by a
           factor of 2 every 10 scaling levels, armor shops decrease by a
           factor of 2 every 12 scaling levels).  This flag prevents all of
           these changes, restoring shops to be completely vanilla.`,
});
Vanilla.WildWarp = Vanilla.flag('Vw', {
    name: 'Vanilla wild warp',
    text: `By default, Wild Warp is nerfed to only return to Mezame Shrine.
           This flag restores it to work like normal.  Note that this will put
           all wild warp locations in logic unless the flag is set as (V!w).`,
    modes: '!',
});
class Quality extends FlagSection {
    constructor() {
        super(...arguments);
        this.prefix = 'Q';
        this.name = 'Quality of Life';
        this.description = `
      The following quality-of-life flags turn <i>off</i> improvements that
      are normally on by default.  They are optional and will not affect the
      seed generation.  They may be toggled freely in race mode.`;
    }
}
Quality.NoAutoEquip = Quality.flag('Qa', {
    name: `Don't automatically equip orbs and bracelets`,
    text: `Prevents adding a quality-of-life improvement to automatically equip
           the corresponding orb/bracelet whenever changing swords.`,
    optional: OPTIONAL,
});
Quality.NoControllerShortcuts = Quality.flag('Qc', {
    name: 'Disable controller shortcuts',
    text: `By default, we disable second controller input and instead enable
           some new shortcuts on controller 1: Start+A+B for wild warp, and
           Select+B to quickly change swords.  To support this, the action of
           the start and select buttons is changed slightly.  This flag
           disables this change and retains normal behavior.`,
    optional: OPTIONAL,
});
class DebugMode extends FlagSection {
    constructor() {
        super(...arguments);
        this.prefix = 'D';
        this.name = 'Debug Mode';
        this.description = `
      These options are helpful for exploring or debugging.  Note that,
      while they do not directly affect any randomization, they
      <i>do</i> factor into the seed to prevent cheating, and they
      will remove the option to generate a seed for racing.`;
    }
}
DebugMode.SpoilerLog = DebugMode.flag('Ds', {
    name: 'Generate a spoiler log',
    text: `Note: <b>this will change the placement of items</b> compared to a
           seed generated without this flag turned on.`,
});
DebugMode.TrainerMode = DebugMode.flag('Dt', {
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
DebugMode.NeverDie = DebugMode.flag('Di', {
    name: 'Player never dies',
});
export class FlagSet {
    constructor(str = '@Casual') {
        if (typeof str !== 'string') {
            this.flags = new Map();
            for (const [k, v] of str) {
                this.set(k.flag, v);
            }
            return;
        }
        if (str.startsWith('@')) {
            const expanded = Presets.get(str.substring(1));
            if (!expanded)
                throw new UsageError(`Unknown preset: ${str}`);
            this.flags = new Map(expanded.flags);
            return;
        }
        this.flags = new Map();
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
    filterOptional() {
        return new FlagSet(new Map([...this.flags].map(([k, v]) => [k, k.opts.optional ? k.opts.optional(v) : v])));
    }
    filterRandom(random) {
        function pick(k, v) {
            if (v !== '?')
                return v;
            return random.pick([true, false, ...(k.opts.modes || '')]);
        }
        return new FlagSet(new Map([...this.flags].map(([k, v]) => [k, pick(k, v)])));
    }
    toString() {
        const sections = new DefaultMap(() => new DefaultMap(() => []));
        for (const [flag, mode] of this.flags) {
            if (flag.flag.length !== 2)
                throw new Error(`Bad flag ${flag.flag}`);
            if (!mode)
                continue;
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
    toggle(name) {
        const flag = Flag.flags.get(name);
        if (!flag) {
            console.error(`Bad flag: ${name}`);
            return false;
        }
        const mode = this.flags.get(flag) || false;
        const modes = [false, true, ...(flag.opts.modes || ''), '?', false];
        const index = modes.indexOf(mode);
        if (index < 0)
            throw new Error(`Bad current mode ${mode}`);
        const next = modes[index + 1];
        this.flags.set(flag, next);
        return next;
    }
    set(name, mode) {
        var _a;
        const flag = Flag.flags.get(name);
        if (!flag) {
            console.error(`Bad flag: ${name}`);
            return;
        }
        if (!mode) {
            this.flags.delete(flag);
        }
        else if (mode === true || mode === '?' || ((_a = flag.opts.modes) === null || _a === void 0 ? void 0 : _a.includes(mode))) {
            this.flags.set(flag, mode);
        }
        else {
            console.error(`Bad flag mode: ${name[0]}${mode}${name.substring(1)}`);
            return;
        }
        for (const excluded of flag.opts.excludes || []) {
            this.flags.delete(Flag.flags.get(excluded));
        }
    }
    check(name, ...modes) {
        const flag = name instanceof Flag ? name : Flag.flags.get(name);
        if (!modes.length)
            modes.push(true);
        return modes.includes(flag && this.flags.get(flag) || false);
    }
    get(name) {
        const flag = name instanceof Flag ? name : Flag.flags.get(name);
        return flag && this.flags.get(flag) || false;
    }
    preserveUniqueChecks() {
        return this.check(EasyMode.PreserveUniqueChecks);
    }
    shuffleMimics() {
        return this.check(EasyMode.NoShuffleMimics, false);
    }
    buffDeosPendant() {
        return this.check(Vanilla.BonusItems, false);
    }
    changeGasMaskToHazmatSuit() {
        return this.check(Vanilla.BonusItems, false);
    }
    slowDownTornado() {
        return this.check(Vanilla.BonusItems, false);
    }
    leatherBootsGiveSpeed() {
        return this.check(Vanilla.BonusItems, false);
    }
    rabbitBootsChargeWhileWalking() {
        return this.check(Vanilla.BonusItems, false);
    }
    shuffleSpritePalettes() {
        return this.check(World.RandomizeSpriteColors);
    }
    shuffleMonsters() {
        return true;
    }
    shuffleShops() {
        return this.check(Vanilla.Shops, false);
    }
    bargainHunting() {
        return this.shuffleShops();
    }
    shuffleTowerMonsters() {
        return this.check(Monsters.TowerRobots);
    }
    shuffleMonsterElements() {
        return this.check(Monsters.RandomizeWeaknesses);
    }
    shuffleBossElements() {
        return this.shuffleMonsterElements();
    }
    buffMedicalHerb() {
        return this.check(HardMode.NoBuffMedicalHerb, false);
    }
    decreaseEnemyDamage() {
        return this.check(EasyMode.DecreaseEnemyDamage);
    }
    trainer() {
        return this.check(DebugMode.TrainerMode);
    }
    neverDie() {
        return this.check(DebugMode.NeverDie);
    }
    chargeShotsOnly() {
        return this.check(HardMode.ChargeShotsOnly);
    }
    barrierRequiresCalmSea() {
        return true;
    }
    connectLimeTreeToLeaf() {
        return this.check(Vanilla.Maps, '!');
    }
    addEastCave() {
        return this.check(Vanilla.Maps, false);
    }
    fogLampNotRequired() {
        return this.check(Routing.VanillaDolphin, false);
    }
    storyMode() {
        return this.check(Routing.StoryMode);
    }
    noBowMode() {
        return this.check(Routing.NoBowMode);
    }
    requireHealedDolphinToRide() {
        return this.check(Routing.VanillaDolphin);
    }
    saharaRabbitsRequireTelepathy() {
        return true;
    }
    teleportOnThunderSword() {
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
        return this.check(World.ShuffleAreas);
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
    autoEquipBracelet(pass) {
        return pass === 'early' || this.check(Quality.NoAutoEquip, false);
    }
    controllerShortcuts(pass) {
        return pass === 'early' || this.check(Quality.NoControllerShortcuts, false);
    }
    randomizeMusic(pass) {
        return this.check(Aesthetics.RandomizeMusic, pass === 'early' ? '!' : true);
    }
    shuffleTilePalettes(pass) {
        return this.check(Aesthetics.RandomizeMapColors, pass === 'early' ? '!' : true);
    }
    noMusic(pass) {
        return pass === 'late' && this.check(Aesthetics.NoMusic);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3NldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy9mbGFnc2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBZ0JqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUU3RCxNQUFNLE9BQU8sSUFBSTtJQU9mLFlBQXFCLElBQVksRUFBVyxJQUFjO1FBQXJDLFNBQUksR0FBSixJQUFJLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFVO1FBQ3hELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBTkQsTUFBTSxDQUFDLEdBQUc7UUFDUixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQzs7QUFKZSxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7QUFXbEQsTUFBTSxPQUFPLE1BQU07SUFTakIsWUFBWSxNQUFlLEVBQ04sSUFBWSxFQUNaLFdBQW1CLEVBQzVCLEtBQWdEO1FBRnZDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUV0QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0Qs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Q0FBQztZQUN2RCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBR0QsaUJBQWlCLENBQUMsSUFBc0I7UUFDdEMsT0FBTyxJQUFJLEtBQUssT0FBTyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBQ0QsbUJBQW1CLENBQUMsSUFBc0I7UUFDeEMsT0FBTyxJQUFJLEtBQUssT0FBTyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFDRCxjQUFjLENBQUMsSUFBc0I7UUFDbkMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsSUFBSSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBQ0QsbUJBQW1CLENBQUMsSUFBc0I7UUFDeEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsRUFDN0IsSUFBSSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBQ0QsT0FBTyxDQUFDLElBQXNCO1FBQzVCLE9BQU8sSUFBSSxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMzRCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1VzYWdlRXJyb3IsIERlZmF1bHRNYXB9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi9yYW5kb20uanMnO1xuXG5pbnRlcmZhY2UgRmxhZ09wdHMge1xuICBuYW1lOiBzdHJpbmc7XG4gIHRleHQ/OiBzdHJpbmc7XG4gIGV4Y2x1ZGVzPzogc3RyaW5nW107XG4gIGhhcmQ/OiBib29sZWFuO1xuICBvcHRpb25hbD86IChtb2RlOiBNb2RlKSA9PiBNb2RlO1xuICAvLyBBbGwgZmxhZ3MgaGF2ZSBtb2RlcyBmYWxzZSBhbmQgdHJ1ZS4gIEFkZGl0aW9uYWwgbW9kZXMgbWF5IGJlXG4gIC8vIHNwZWNpZmllZCBhcyBjaGFyYWN0ZXJzIGluIHRoaXMgc3RyaW5nIChlLmcuICchJykuXG4gIG1vZGVzPzogc3RyaW5nO1xufVxuXG50eXBlIE1vZGUgPSBib29sZWFufHN0cmluZztcblxuY29uc3QgT1BUSU9OQUwgPSAobW9kZTogTW9kZSkgPT4gJyc7XG5jb25zdCBOT19CQU5HID0gKG1vZGU6IE1vZGUpID0+IG1vZGUgPT09IHRydWUgPyBmYWxzZSA6IG1vZGU7XG5cbmV4cG9ydCBjbGFzcyBGbGFnIHtcbiAgc3RhdGljIHJlYWRvbmx5IGZsYWdzID0gbmV3IE1hcDxzdHJpbmcsIEZsYWc+KCk7XG5cbiAgc3RhdGljIGFsbCgpOiBGbGFnW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5mbGFncy52YWx1ZXMoKV07XG4gIH1cblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBmbGFnOiBzdHJpbmcsIHJlYWRvbmx5IG9wdHM6IEZsYWdPcHRzKSB7XG4gICAgRmxhZy5mbGFncy5zZXQoZmxhZywgdGhpcyk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFByZXNldCB7XG4gIHN0YXRpYyBhbGwoKTogUHJlc2V0W10ge1xuICAgIGlmICghUHJlc2V0cy5pbnN0YW5jZSkgUHJlc2V0cy5pbnN0YW5jZSA9IG5ldyBQcmVzZXRzKCk7XG4gICAgcmV0dXJuIFsuLi5QcmVzZXRzLmluc3RhbmNlLnByZXNldHMudmFsdWVzKCldO1xuICB9XG5cbiAgcHJpdmF0ZSBfZmxhZ1N0cmluZz86IHN0cmluZztcblxuICByZWFkb25seSBmbGFnczogUmVhZG9ubHlBcnJheTxyZWFkb25seSBbRmxhZywgTW9kZV0+O1xuICBjb25zdHJ1Y3RvcihwYXJlbnQ6IFByZXNldHMsIC8vIE5PVEU6IGltcG9zc2libGUgdG8gZ2V0IGFuIGluc3RhbmNlIG91dHNpZGVcbiAgICAgICAgICAgICAgcmVhZG9ubHkgbmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICByZWFkb25seSBkZXNjcmlwdGlvbjogc3RyaW5nLFxuICAgICAgICAgICAgICBmbGFnczogUmVhZG9ubHlBcnJheTxGbGFnfHJlYWRvbmx5IFtGbGFnLCBNb2RlXT4pIHtcbiAgICB0aGlzLmZsYWdzID0gZmxhZ3MubWFwKGYgPT4gZiBpbnN0YW5jZW9mIEZsYWcgPyBbZiwgdHJ1ZV0gOiBmKTtcbiAgICBwYXJlbnQucHJlc2V0cy5zZXQobWFwUHJlc2V0TmFtZShuYW1lKSwgdGhpcyk7XG4gIH1cblxuICBnZXQgZmxhZ1N0cmluZygpIHtcbiAgICBpZiAodGhpcy5fZmxhZ1N0cmluZyA9PSBudWxsKSB7XG4gICAgICB0aGlzLl9mbGFnU3RyaW5nID0gU3RyaW5nKG5ldyBGbGFnU2V0KGBAJHt0aGlzLm5hbWV9YCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZmxhZ1N0cmluZztcbiAgfVxufVxuXG5mdW5jdGlvbiBtYXBQcmVzZXROYW1lKG5hbWU6IHN0cmluZykge1xuICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16XS9nLCAnJyk7XG59XG5cbi8vIE5PVCBFWFBPUlRFRCFcbmNsYXNzIFByZXNldHMge1xuICBzdGF0aWMgaW5zdGFuY2U6IFByZXNldHMgfCB1bmRlZmluZWQ7XG4gIHJlYWRvbmx5IHByZXNldHMgPSBuZXcgTWFwPHN0cmluZywgUHJlc2V0PigpO1xuXG4gIHN0YXRpYyBnZXQobmFtZTogc3RyaW5nKTogUHJlc2V0IHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuaW5zdGFuY2UpIHRoaXMuaW5zdGFuY2UgPSBuZXcgUHJlc2V0cygpO1xuICAgIHJldHVybiB0aGlzLmluc3RhbmNlLnByZXNldHMuZ2V0KG1hcFByZXNldE5hbWUobmFtZSkpO1xuICB9XG5cbiAgcmVhZG9ubHkgQ2FzdWFsID0gbmV3IFByZXNldCh0aGlzLCAnQ2FzdWFsJywgYFxuICAgICAgQmFzaWMgZmxhZ3MgZm9yIGEgcmVsYXRpdmVseSBlYXN5IHBsYXl0aHJvdWdoLiAgVGhpcyBpcyBhIGdvb2RcbiAgICAgIHBsYWNlIHRvIHN0YXJ0LmAsIFtcbiAgICAgICAgRWFzeU1vZGUuUHJlc2VydmVVbmlxdWVDaGVja3MsXG4gICAgICAgIEVhc3lNb2RlLk5vU2h1ZmZsZU1pbWljcyxcbiAgICAgICAgRWFzeU1vZGUuRGVjcmVhc2VFbmVteURhbWFnZSxcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlUmVmcmVzaCxcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlU3RhcnRpbmdTd29yZCxcbiAgICAgICAgRWFzeU1vZGUuRXhwZXJpZW5jZVNjYWxlc0Zhc3RlcixcbiAgICAgICAgUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsXG4gICAgICAgIFZhbmlsbGEuU2hvcHMsXG4gICAgICAgIFZhbmlsbGEuRHluYSxcbiAgICAgICAgW1ZhbmlsbGEuTWFwcywgJyEnXSxcbiAgICAgICAgW1ZhbmlsbGEuV2lsZFdhcnAsICchJ10sXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgQ2xhc3NpYyA9IG5ldyBQcmVzZXQodGhpcywgJ0NsYXNzaWMnLCBgXG4gICAgICBQcm92aWRlcyBhIHJlbGF0aXZlbHkgcXVpY2sgcGxheXRob3VnaCB3aXRoIGEgcmVhc29uYWJsZSBhbW91bnQgb2ZcbiAgICAgIGNoYWxsZW5nZS4gIFNpbWlsYXIgdG8gb2xkZXIgdmVyc2lvbnMuYCwgW1xuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVTdGFydGluZ1N3b3JkLFxuICAgICAgICBHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsXG4gICAgICAgIFtSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgJyEnXSxcbiAgICAgICAgW1ZhbmlsbGEuTWFwcywgJyEnXSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBTdGFuZGFyZCA9IG5ldyBQcmVzZXQodGhpcywgJ1N0YW5kYXJkJywgYFxuICAgICAgV2VsbC1iYWxhbmNlZCwgc3RhbmRhcmQgcmFjZSBmbGFncy5gLCBbXG4gICAgICAgIC8vIG5vIGZsYWdzPyAgYWxsIGRlZmF1bHQ/XG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IE5vQm93TW9kZSA9IG5ldyBQcmVzZXQodGhpcywgJ05vIEJvdyBNb2RlJywgYFxuICAgICAgVGhlIHRvd2VyIGlzIG9wZW4gZnJvbSB0aGUgc3RhcnQsIGFzIHNvb24gYXMgeW91J3JlIHJlYWR5IGZvciBpdC5gLCBbXG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIE1vbnN0ZXJzLlRvd2VyUm9ib3RzLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgUm91dGluZy5Ob0Jvd01vZGUsXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgQWR2YW5jZWQgPSBuZXcgUHJlc2V0KHRoaXMsICdBZHZhbmNlZCcsIGBcbiAgICAgIEEgYmFsYW5jZWQgcmFuZG9taXphdGlvbiB3aXRoIHF1aXRlIGEgYml0IG1vcmUgZGlmZmljdWx0eS5gLCBbXG4gICAgICAgIEdsaXRjaGVzLkdoZXR0b0ZsaWdodCxcbiAgICAgICAgR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCxcbiAgICAgICAgR2xpdGNoZXMuU3RhdHVlR2xpdGNoLFxuICAgICAgICBbR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gsICchJ10sXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXJyaWVyLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsXG4gICAgICAgIE5vR3VhcmFudGVlcy5HYXNNYXNrLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgV29ybGQuUmFuZG9taXplTWFwcyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUFyZWFzLFxuICAgICAgICBXb3JsZC5TaHVmZmxlSG91c2VzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVUcmFkZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyxcbiAgICAgICAgV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgV2lsZFdhcnAgPSBuZXcgUHJlc2V0KHRoaXMsICdXaWxkIFdhcnAnLCBgXG4gICAgICBTaWduaWZpY2FudGx5IG9wZW5zIHVwIHRoZSBnYW1lIHJpZ2h0IGZyb20gdGhlIHN0YXJ0IHdpdGggd2lsZFxuICAgICAgd2FycCBpbiBsb2dpYy5gLCBbXG4gICAgICAgIEVhc3lNb2RlLkd1YXJhbnRlZVJlZnJlc2gsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwLFxuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBNb25zdGVycy5Ub3dlclJvYm90cyxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IEhhcmRjb3JlID0gbmV3IFByZXNldCh0aGlzLCAnSGFyZGNvcmUnLCBgXG4gICAgICBOb3QgZm9yIHRoZSBmYWludCBvZiBoZWFydC4gIEdvb2QgbHVjay5gLCBbXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXJyaWVyLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsXG4gICAgICAgIEhhcmRNb2RlLkV4cGVyaWVuY2VTY2FsZXNTbG93ZXIsXG4gICAgICAgIEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyLFxuICAgICAgICBIYXJkTW9kZS5QZXJtYWRlYXRoLFxuICAgICAgICBSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZU1hcHMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVBcmVhcyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUhvdXNlcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplVHJhZGVzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsXG4gICAgICAgIFdvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgRnVsbFN0dXBpZCA9IG5ldyBQcmVzZXQodGhpcywgJ1RoZSBGdWxsIFN0dXBpZCcsIGBcbiAgICAgIE9ubHkgVGhlQXhlTWFuIGhhcyBldmVyIGNvbXBsZXRlZCB0aGlzLiAgQmUgc3VyZSB0byByZWNvcmQgdGhpcyBiZWNhdXNlXG4gICAgICBwaWNzIG9yIGl0IGRpZG4ndCBoYXBwZW4uYCwgWyBcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhcnJpZXIsXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXR0bGVNYWdpYyxcbiAgICAgICAgSGFyZE1vZGUuQmxhY2tvdXQsXG4gICAgICAgIEhhcmRNb2RlLkV4cGVyaWVuY2VTY2FsZXNTbG93ZXIsXG4gICAgICAgIEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyLFxuICAgICAgICBIYXJkTW9kZS5QZXJtYWRlYXRoLFxuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBNb25zdGVycy5Ub3dlclJvYm90cyxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVNYXBzLFxuICAgICAgICBXb3JsZC5TaHVmZmxlQXJlYXMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVIb3VzZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVRyYWRlcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzLFxuICAgICAgICBXb3JsZC5TaHVmZmxlR29hRmxvb3JzLFxuICAgICAgICBXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IE15c3RlcnkgPSBuZXcgUHJlc2V0KHRoaXMsICdNeXN0ZXJ5JywgYFxuICAgICAgRXZlbiB0aGUgb3B0aW9ucyBhcmUgcmFuZG9tLmAsIFtcbiAgICAgICAgW1dvcmxkLlNodWZmbGVBcmVhcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlNodWZmbGVIb3VzZXMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVNYXBzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplVHJhZGVzLCAnPyddLFxuICAgICAgICBbV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsICc/J10sXG4gICAgICAgIFtXb3JsZC5TaHVmZmxlR29hRmxvb3JzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplU3ByaXRlQ29sb3JzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplV2lsZFdhcnAsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuTm9Cb3dNb2RlLCAnPyddLFxuICAgICAgICBbUm91dGluZy5TdG9yeU1vZGUsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLlZhbmlsbGFEb2xwaGluLCAnPyddLFxuICAgICAgICBbUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5SYWdlU2tpcCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlRyaWdnZXJTa2lwLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuU3RhdHVlR2xpdGNoLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuR2hldHRvRmxpZ2h0LCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwLCAnPyddLFxuICAgICAgICBbQWVzdGhldGljcy5SYW5kb21pemVNdXNpYywgJz8nXSxcbiAgICAgICAgW0Flc3RoZXRpY3MuUmFuZG9taXplTWFwQ29sb3JzLCAnPyddLFxuICAgICAgICBbTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcywgJz8nXSxcbiAgICAgICAgW01vbnN0ZXJzLlRvd2VyUm9ib3RzLCAnPyddLFxuICAgICAgICBbRWFzeU1vZGUuTm9TaHVmZmxlTWltaWNzLCAnPyddLFxuICAgICAgICBbRWFzeU1vZGUuUHJlc2VydmVVbmlxdWVDaGVja3MsICc/J10sXG4gICAgICAgIFtOb0d1YXJhbnRlZXMuQmFycmllciwgJz8nXSxcbiAgICAgICAgW05vR3VhcmFudGVlcy5CYXR0bGVNYWdpYywgJz8nXSxcbiAgICAgICAgW05vR3VhcmFudGVlcy5HYXNNYXNrLCAnPyddLFxuICAgICAgICBbVmFuaWxsYS5EeW5hLCAnPyddLFxuICAgICAgICBbVmFuaWxsYS5Cb251c0l0ZW1zLCAnPyddLFxuICAgICAgICBbVmFuaWxsYS5NYXBzLCAnPyddLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRmxhZ1NlY3Rpb24ge1xuICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZTogRmxhZ1NlY3Rpb247XG4gIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IHNlY3Rpb25zID0gbmV3IFNldDxGbGFnU2VjdGlvbj4oKTtcblxuICBzdGF0aWMgYWxsKCk6IEZsYWdTZWN0aW9uW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5zZWN0aW9uc107XG4gIH1cblxuICBwcm90ZWN0ZWQgc3RhdGljIGZsYWcobmFtZTogc3RyaW5nLCBvcHRzOiBhbnkpOiBGbGFnIHtcbiAgICBGbGFnU2VjdGlvbi5zZWN0aW9ucy5hZGQoXG4gICAgICAgIHRoaXMuaW5zdGFuY2UgfHwgKHRoaXMuaW5zdGFuY2UgPSBuZXcgKHRoaXMgYXMgYW55KSgpKSk7XG4gICAgY29uc3QgZmxhZyA9IG5ldyBGbGFnKG5hbWUsIG9wdHMpO1xuICAgIGlmICghbmFtZS5zdGFydHNXaXRoKHRoaXMuaW5zdGFuY2UucHJlZml4KSkgdGhyb3cgbmV3IEVycm9yKGBiYWQgZmxhZ2ApO1xuICAgIHRoaXMuaW5zdGFuY2UuZmxhZ3Muc2V0KG5hbWUsIGZsYWcpO1xuICAgIHJldHVybiBmbGFnO1xuICB9XG5cbiAgYWJzdHJhY3QgcmVhZG9ubHkgcHJlZml4OiBzdHJpbmc7XG4gIGFic3RyYWN0IHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gIHJlYWRvbmx5IGZsYWdzID0gbmV3IE1hcDxzdHJpbmcsIEZsYWc+KCk7XG59XG5cbmNsYXNzIFdvcmxkIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnVyc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnV29ybGQnO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVNYXBzID0gV29ybGQuZmxhZygnV20nLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBtYXBzJyxcbiAgICB0ZXh0OiBgSW5kaXZpZHVhbCBtYXBzIGFyZSByYW5kb21pemVkLiAgRm9yIG5vdyB0aGlzIGlzIG9ubHkgYSBzdWJzZXQgb2ZcbiAgICAgICAgICAgcG9zc2libGUgbWFwcy4gIEEgcmFuZG9taXplZCBtYXAgd2lsbCBoYXZlIGFsbCB0aGUgc2FtZSBmZWF0dXJlc1xuICAgICAgICAgICAoZXhpdHMsIGNoZXN0cywgTlBDcywgZXRjKSBleGNlcHQgdGhpbmdzIGFyZSBtb3ZlZCBhcm91bmQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU2h1ZmZsZUFyZWFzID0gV29ybGQuZmxhZygnV2EnLCB7XG4gICAgbmFtZTogJz8/PycsIC8vL1NodWZmbGUgYXJlYXMnLFxuICAgIHRleHQ6ICc/Pz8nLCAvL2BTaHVmZmxlcyBzb21lIG9yIGFsbCBhcmVhIGNvbm5lY3Rpb25zLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNodWZmbGVIb3VzZXMgPSBXb3JsZC5mbGFnKCdXaCcsIHtcbiAgICBuYW1lOiAnU2h1ZmZsZSBob3VzZSBlbnRyYW5jZXMnLFxuICAgIHRleHQ6IGBTaHVmZmxlcyBhbGwgdGhlIGhvdXNlIGVudHJhbmNlcywgYXMgd2VsbCBhcyBhIGhhbmRmdWwgb2Ygb3RoZXJcbiAgICAgICAgICAgdGhpbmdzLCBsaWtlIHRoZSBwYWxhY2UvZm9ydHJlc3MtdHlwZSBlbnRyYW5jZXMgYXQgdGhlIHRvcCBvZlxuICAgICAgICAgICBzZXZlcmFsIHRvd25zLCBhbmQgc3RhbmRhbG9uZSBob3VzZXMuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplVHJhZGVzID0gV29ybGQuZmxhZygnV3QnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSB0cmFkZS1pbiBpdGVtcycsXG4gICAgdGV4dDogYEl0ZW1zIGV4cGVjdGVkIGJ5IHZhcmlvdXMgTlBDcyB3aWxsIGJlIHNodWZmbGVkOiBzcGVjaWZpY2FsbHksXG4gICAgICAgICAgIFN0YXR1ZSBvZiBPbnl4LCBLaXJpc2EgUGxhbnQsIExvdmUgUGVuZGFudCwgSXZvcnkgU3RhdHVlLCBGb2dcbiAgICAgICAgICAgTGFtcCwgYW5kIEZsdXRlIG9mIExpbWUgKGZvciBBa2FoYW5hKS4gIFJhZ2Ugd2lsbCBleHBlY3QgYVxuICAgICAgICAgICByYW5kb20gc3dvcmQsIGFuZCBUb3JuZWwgd2lsbCBleHBlY3QgYSByYW5kb20gYnJhY2VsZXQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVW5pZGVudGlmaWVkS2V5SXRlbXMgPSBXb3JsZC5mbGFnKCdXdScsIHtcbiAgICBuYW1lOiAnVW5pZGVudGlmaWVkIGtleSBpdGVtcycsXG4gICAgdGV4dDogYEl0ZW0gbmFtZXMgd2lsbCBiZSBnZW5lcmljIGFuZCBlZmZlY3RzIHdpbGwgYmUgc2h1ZmZsZWQuICBUaGlzXG4gICAgICAgICAgIGluY2x1ZGVzIGtleXMsIGZsdXRlcywgbGFtcHMsIGFuZCBzdGF0dWVzLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVdhbGxFbGVtZW50cyA9IFdvcmxkLmZsYWcoJ1dlJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgZWxlbWVudHMgdG8gYnJlYWsgd2FsbHMnLFxuICAgIHRleHQ6IGBXYWxscyB3aWxsIHJlcXVpcmUgYSByYW5kb21pemVkIGVsZW1lbnQgdG8gYnJlYWsuICBOb3JtYWwgcm9jayBhbmRcbiAgICAgICAgICAgaWNlIHdhbGxzIHdpbGwgaW5kaWNhdGUgdGhlIHJlcXVpcmVkIGVsZW1lbnQgYnkgdGhlIGNvbG9yIChsaWdodFxuICAgICAgICAgICBncmV5IG9yIHllbGxvdyBmb3Igd2luZCwgYmx1ZSBmb3IgZmlyZSwgYnJpZ2h0IG9yYW5nZSAoXCJlbWJlcnNcIikgZm9yXG4gICAgICAgICAgIHdhdGVyLCBvciBkYXJrIGdyZXkgKFwic3RlZWxcIikgZm9yIHRodW5kZXIuICBUaGUgZWxlbWVudCB0byBicmVha1xuICAgICAgICAgICB0aGVzZSB3YWxscyBpcyB0aGUgc2FtZSB0aHJvdWdob3V0IGFuIGFyZWEuICBJcm9uIHdhbGxzIHJlcXVpcmUgYVxuICAgICAgICAgICBvbmUtb2ZmIHJhbmRvbSBlbGVtZW50LCB3aXRoIG5vIHZpc3VhbCBjdWUsIGFuZCB0d28gd2FsbHMgaW4gdGhlXG4gICAgICAgICAgIHNhbWUgYXJlYSBtYXkgaGF2ZSBkaWZmZXJlbnQgcmVxdWlyZW1lbnRzLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTaHVmZmxlR29hRmxvb3JzID0gV29ybGQuZmxhZygnV2cnLCB7XG4gICAgbmFtZTogJ1NodWZmbGUgR29hIGZvcnRyZXNzIGZsb29ycycsXG4gICAgLy8gVE9ETyAtIHNodWZmbGUgdGhlIGFyZWEtdG8tYm9zcyBjb25uZWN0aW9ucywgdG9vLlxuICAgIHRleHQ6IGBUaGUgZm91ciBhcmVhcyBvZiBHb2EgZm9ydHJlc3Mgd2lsbCBhcHBlYXIgaW4gYSByYW5kb20gb3JkZXIuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVNwcml0ZUNvbG9ycyA9IFdvcmxkLmZsYWcoJ1dzJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgc3ByaXRlIGNvbG9ycycsXG4gICAgdGV4dDogYE1vbnN0ZXJzIGFuZCBOUENzIHdpbGwgaGF2ZSBkaWZmZXJlbnQgY29sb3JzLiAgVGhpcyBpcyBub3QgYW5cbiAgICAgICAgICAgb3B0aW9uYWwgZmxhZyBiZWNhdXNlIGl0IGFmZmVjdHMgd2hhdCBtb25zdGVycyBjYW4gYmUgZ3JvdXBlZFxuICAgICAgICAgICB0b2dldGhlci5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplV2lsZFdhcnAgPSBXb3JsZC5mbGFnKCdXdycsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIHdpbGQgd2FycCcsXG4gICAgdGV4dDogYFdpbGQgd2FycCB3aWxsIGdvIHRvIE1lemFtZSBTaHJpbmUgYW5kIDE1IG90aGVyIHJhbmRvbSBsb2NhdGlvbnMuXG4gICAgICAgICAgIFRoZXNlIGxvY2F0aW9ucyB3aWxsIGJlIGNvbnNpZGVyZWQgaW4tbG9naWMuYCxcbiAgICBleGNsdWRlczogWydWdyddLFxuICB9KTtcbn1cblxuY2xhc3MgUm91dGluZyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1InO1xuICByZWFkb25seSBuYW1lID0gJ1JvdXRpbmcnO1xuXG4gIHN0YXRpYyByZWFkb25seSBTdG9yeU1vZGUgPSBSb3V0aW5nLmZsYWcoJ1JzJywge1xuICAgIG5hbWU6ICdTdG9yeSBNb2RlJyxcbiAgICB0ZXh0OiBgRHJheWdvbiAyIHdvbid0IHNwYXduIHVubGVzcyB5b3UgaGF2ZSBhbGwgZm91ciBzd29yZHMgYW5kIGhhdmVcbiAgICAgICAgICAgZGVmZWF0ZWQgYWxsIG1ham9yIGJvc3NlcyBvZiB0aGUgdGV0cmFyY2h5LmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb0Jvd01vZGUgPSBSb3V0aW5nLmZsYWcoJ1JiJywge1xuICAgIG5hbWU6ICdObyBCb3cgbW9kZScsXG4gICAgdGV4dDogYE5vIGl0ZW1zIGFyZSByZXF1aXJlZCB0byBmaW5pc2ggdGhlIGdhbWUuICBBbiBleGl0IGlzIGFkZGVkIGZyb21cbiAgICAgICAgICAgTWV6YW1lIHNocmluZSBkaXJlY3RseSB0byB0aGUgRHJheWdvbiAyIGZpZ2h0IChhbmQgdGhlIG5vcm1hbCBlbnRyYW5jZVxuICAgICAgICAgICBpcyByZW1vdmVkKS4gIERyYXlnb24gMiBzcGF3bnMgYXV0b21hdGljYWxseSB3aXRoIG5vIEJvdyBvZiBUcnV0aC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgT3Jic05vdFJlcXVpcmVkID0gUm91dGluZy5mbGFnKCdSbycsIHtcbiAgICBuYW1lOiAnT3JicyBub3QgcmVxdWlyZWQgdG8gYnJlYWsgd2FsbHMnLFxuICAgIHRleHQ6IGBXYWxscyBjYW4gYmUgYnJva2VuIGFuZCBicmlkZ2VzIGZvcm1lZCB3aXRoIGxldmVsIDEgc2hvdHMuYFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9UaHVuZGVyU3dvcmRXYXJwID0gUm91dGluZy5mbGFnKCdSdCcsIHtcbiAgICBuYW1lOiAnTm8gU3dvcmQgb2YgVGh1bmRlciB3YXJwJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHkgd2hlbiBhY3F1aXJpbmcgdGhlIHRodW5kZXIgc3dvcmQsIHRoZSBwbGF5ZXIgaXMgaW5zdGFudGx5XG4gICAgICAgICAgIHdhcnBlZCB0byBhIHJhbmRvbSB0b3duLiAgVGhpcyBmbGFnIGRpc2FibGVzIHRoZSB3YXJwLiAgSWYgc2V0IGFzXG4gICAgICAgICAgIFwiUiF0XCIsIHRoZW4gdGhlIHdhcnAgd2lsbCBhbHdheXMgZ28gdG8gU2h5cm9uLCBsaWtlIGluIHZhbmlsbGEuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVmFuaWxsYURvbHBoaW4gPSBSb3V0aW5nLmZsYWcoJ1JkJywge1xuICAgIG5hbWU6ICdWYW5pbGxhIERvbHBoaW4gaW50ZXJhY3Rpb25zJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgdGhlIHJhbmRvbWl6ZXIgY2hhbmdlcyBhIG51bWJlciBvZiBkb2xwaGluIGFuZCBib2F0XG4gICAgICAgICAgIGludGVyYWN0aW9uczogKDEpIGhlYWxpbmcgdGhlIGRvbHBoaW4gYW5kIGhhdmluZyB0aGUgU2hlbGwgRmx1dGVcbiAgICAgICAgICAgaXMgbm8gbG9uZ2VyIHJlcXVpcmVkIGJlZm9yZSB0aGUgZmlzaGVybWFuIHNwYXduczogaW5zdGVhZCwgaGVcbiAgICAgICAgICAgd2lsbCBzcGF3biBhcyBzb29uIGFzIHlvdSBoYXZlIHRoZSBpdGVtIGhlIHdhbnRzOyAoMikgdGFsa2luZyB0b1xuICAgICAgICAgICBLZW5zdSBpbiB0aGUgYmVhY2ggY2FiaW4gaXMgbm8gbG9uZ2VyIHJlcXVpcmVkIGZvciB0aGUgU2hlbGwgRmx1dGVcbiAgICAgICAgICAgdG8gd29yazogaW5zdGVhZCwgdGhlIFNoZWxsIEZsdXRlIHdpbGwgYWx3YXlzIHdvcmssIGFuZCBLZW5zdSB3aWxsXG4gICAgICAgICAgIHNwYXduIGFmdGVyIHRoZSBGb2cgTGFtcCBpcyB0dXJuZWQgaW4gYW5kIHdpbGwgZ2l2ZSBhIGtleSBpdGVtXG4gICAgICAgICAgIGNoZWNrLiAgVGhpcyBmbGFnIHJlc3RvcmVzIHRoZSB2YW5pbGxhIGludGVyYWN0aW9uIHdoZXJlIGhlYWxpbmdcbiAgICAgICAgICAgYW5kIHNoZWxsIGZsdXRlIGFyZSByZXF1aXJlZCwgYW5kIEtlbnN1IG5vIGxvbmdlciBkcm9wcyBhbiBpdGVtLmAsXG4gIH0pO1xufVxuXG5jbGFzcyBHbGl0Y2hlcyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0cnO1xuICByZWFkb25seSBuYW1lID0gJ0dsaXRjaGVzJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBCeSBkZWZhdWx0LCB0aGUgcmFuZG9taXplciBkaXNhYmxlcyBhbGwga25vd24gZ2xpdGNoZXMgKGV4Y2VwdCBnaGV0dG9cbiAgICAgIGZsaWdodCkuICBUaGVzZSBmbGFncyBzZWxlY3RpdmVseSByZS1lbmFibGUgY2VydGFpbiBnbGl0Y2hlcy4gIE1vc3Qgb2ZcbiAgICAgIHRoZXNlIGZsYWdzIGhhdmUgdHdvIG1vZGVzOiBub3JtYWxseSBlbmFibGluZyBhIGdsaXRjaCB3aWxsIGFkZCBpdCBhc1xuICAgICAgcG9zc2libHkgcmVxdWlyZWQgYnkgbG9naWMsIGJ1dCBjbGlja2luZyBhIHNlY29uZCB0aW1lIHdpbGwgYWRkIGEgJyEnXG4gICAgICBhbmQgZW5hYmxlIHRoZSBnbGl0Y2ggb3V0c2lkZSBvZiBsb2dpYyAoZS5nLiBcIkchY1wiKS5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBHaGV0dG9GbGlnaHQgPSBHbGl0Y2hlcy5mbGFnKCdHZicsIHtcbiAgICBuYW1lOiAnR2hldHRvIGZsaWdodCcsXG4gICAgdGV4dDogYEdoZXR0byBmbGlnaHQgYWxsb3dzIHVzaW5nIERvbHBoaW4gYW5kIFJhYmJpdCBCb290cyB0byBmbHkgdXAgdGhlXG4gICAgICAgICAgIHdhdGVyZmFsbHMgaW4gdGhlIEFuZ3J5IFNlYSAod2l0aG91dCBjYWxtaW5nIHRoZSB3aGlybHBvb2xzKS5cbiAgICAgICAgICAgVGhpcyBpcyBkb25lIGJ5IHN3aW1taW5nIHVwIHRvIGEgZGlhZ29uYWwgYmVhY2ggYW5kIGp1bXBpbmdcbiAgICAgICAgICAgaW4gYSBkaWZmZXJlbnQgZGlyZWN0aW9uIGltbWVkaWF0ZWx5IGJlZm9yZSBkaXNlbWJhcmtpbmcuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFN0YXR1ZUdsaXRjaCA9IEdsaXRjaGVzLmZsYWcoJ0dzJywge1xuICAgIG5hbWU6ICdTdGF0dWUgZ2xpdGNoJyxcbiAgICB0ZXh0OiBgU3RhdHVlIGdsaXRjaCBhbGxvd3MgZ2V0dGluZyBiZWhpbmQgc3RhdHVlcyB0aGF0IGJsb2NrIGNlcnRhaW5cbiAgICAgICAgICAgZW50cmFuY2VzOiB0aGUgZ3VhcmRzIGluIFBvcnRvYSwgQW1hem9uZXMsIE9haywgR29hLCBhbmQgU2h5cm9uLFxuICAgICAgICAgICBhcyB3ZWxsIGFzIHRoZSBzdGF0dWVzIGluIHRoZSBXYXRlcmZhbGwgQ2F2ZS4gIEl0IGlzIGRvbmUgYnlcbiAgICAgICAgICAgYXBwcm9hY2hpbmcgdGhlIHN0YXR1ZSBmcm9tIHRoZSB0b3AgcmlnaHQgYW5kIGhvbGRpbmcgZG93biBhbmRcbiAgICAgICAgICAgbGVmdCBvbiB0aGUgY29udHJvbGxlciB3aGlsZSBtYXNoaW5nIEIuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTXRTYWJyZVJlcXVpcmVtZW50U2tpcCA9IEdsaXRjaGVzLmZsYWcoJ0duJywge1xuICAgIG5hbWU6ICdNdCBTYWJyZSByZXF1aXJlbWVudHMgc2tpcCcsXG4gICAgdGV4dDogYEVudGVyaW5nIE10IFNhYnJlIE5vcnRoIG5vcm1hbGx5IHJlcXVpcmVzICgxKSBoYXZpbmcgVGVsZXBvcnQsXG4gICAgICAgICAgIGFuZCAoMikgdGFsa2luZyB0byB0aGUgcmFiYml0IGluIExlYWYgYWZ0ZXIgdGhlIGFiZHVjdGlvbiAodmlhXG4gICAgICAgICAgIFRlbGVwYXRoeSkuICBCb3RoIG9mIHRoZXNlIHJlcXVpcmVtZW50cyBjYW4gYmUgc2tpcHBlZDogZmlyc3QgYnlcbiAgICAgICAgICAgZmx5aW5nIG92ZXIgdGhlIHJpdmVyIGluIENvcmRlbCBwbGFpbiByYXRoZXIgdGhhbiBjcm9zc2luZyB0aGVcbiAgICAgICAgICAgYnJpZGdlLCBhbmQgdGhlbiBieSB0aHJlYWRpbmcgdGhlIG5lZWRsZSBiZXR3ZWVuIHRoZSBoaXRib3hlcyBpblxuICAgICAgICAgICBNdCBTYWJyZSBOb3J0aC5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTdGF0dWVHYXVudGxldFNraXAgPSBHbGl0Y2hlcy5mbGFnKCdHZycsIHtcbiAgICBuYW1lOiAnU3RhdHVlIGdhdW50bGV0IHNraXAnLFxuICAgIHRleHQ6IGBUaGUgc2hvb3Rpbmcgc3RhdHVlcyBpbiBmcm9udCBvZiBHb2EgYW5kIFN0eHkgbm9ybWFsbHkgcmVxdWlyZVxuICAgICAgICAgICBCYXJyaWVyIHRvIHBhc3Mgc2FmZWx5LiAgV2l0aCB0aGlzIGZsYWcsIEZsaWdodCBjYW4gYWxzbyBiZSB1c2VkXG4gICAgICAgICAgIGJ5IGZseWluZyBhcm91bmQgdGhlIGVkZ2Ugb2YgdGhlIHN0YXR1ZS5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTd29yZENoYXJnZUdsaXRjaCA9IEdsaXRjaGVzLmZsYWcoJ0djJywge1xuICAgIG5hbWU6ICdTd29yZCBjaGFyZ2UgZ2xpdGNoJyxcbiAgICB0ZXh0OiBgU3dvcmQgY2hhcmdlIGdsaXRjaCBhbGxvd3MgY2hhcmdpbmcgb25lIHN3b3JkIHRvIHRoZSBsZXZlbCBvZlxuICAgICAgICAgICBhbm90aGVyIHN3b3JkIGJ5IGVxdWlwcGluZyB0aGUgaGlnaGVyLWxldmVsIHN3b3JkLCByZS1lbnRlcmluZ1xuICAgICAgICAgICB0aGUgbWVudSwgY2hhbmdpbmcgdG8gdGhlIGxvd2VyLWxldmVsIHN3b3JkIHdpdGhvdXQgZXhpdGluZyB0aGVcbiAgICAgICAgICAgbWVudSwgY3JlYXRpbmcgYSBoYXJkIHNhdmUsIHJlc2V0dGluZywgYW5kIHRoZW4gY29udGludWluZy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFRyaWdnZXJTa2lwID0gR2xpdGNoZXMuZmxhZygnR3QnLCB7XG4gICAgbmFtZTogJ1RyaWdnZXIgc2tpcCcsXG4gICAgdGV4dDogYEEgd2lkZSB2YXJpZXR5IG9mIHRyaWdnZXJzIGFuZCBleGl0IHNxdWFyZXMgY2FuIGJlIHNraXBwZWQgYnlcbiAgICAgICAgICAgdXNpbmcgYW4gaW52YWxpZCBpdGVtIGV2ZXJ5IGZyYW1lIHdoaWxlIHdhbGtpbmcuICBUaGlzIGFsbG93c1xuICAgICAgICAgICBieXBhc3NpbmcgYm90aCBNdCBTYWJyZSBOb3J0aCBlbnRyYW5jZSB0cmlnZ2VycywgdGhlIEV2aWwgU3Bpcml0XG4gICAgICAgICAgIElzbGFuZCBlbnRyYW5jZSB0cmlnZ2VyLCB0cmlnZ2VycyBmb3IgZ3VhcmRzIHRvIG1vdmUsIHNsb3BlcyxcbiAgICAgICAgICAgZGFtYWdlIHRpbGVzLCBhbmQgc2VhbWxlc3MgbWFwIHRyYW5zaXRpb25zLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFnZVNraXAgPSBHbGl0Y2hlcy5mbGFnKCdHcicsIHtcbiAgICBuYW1lOiAnUmFnZSBza2lwJyxcbiAgICB0ZXh0OiBgUmFnZSBjYW4gYmUgc2tpcHBlZCBieSBkYW1hZ2UtYm9vc3RpbmcgZGlhZ29uYWxseSBpbnRvIHRoZSBMaW1lXG4gICAgICAgICAgIFRyZWUgTGFrZSBzY3JlZW4uICBUaGlzIHByb3ZpZGVzIGFjY2VzcyB0byB0aGUgYXJlYSBiZXlvbmQgdGhlXG4gICAgICAgICAgIGxha2UgaWYgZmxpZ2h0IG9yIGJyaWRnZXMgYXJlIGF2YWlsYWJsZS4gIEZvciBzaW1wbGljaXR5LCB0aGVcbiAgICAgICAgICAgbG9naWMgb25seSBhc3N1bWVzIHRoaXMgaXMgcG9zc2libGUgaWYgdGhlcmUncyBhIGZseWVyLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcbn1cblxuY2xhc3MgQWVzdGhldGljcyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0EnO1xuICByZWFkb25seSBuYW1lID0gJ0Flc3RoZXRpY3MnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZXNlIGZsYWdzIGRvbid0IGRpcmVjdGx5IGFmZmVjdCBnYW1lcGxheSBvciBzaHVmZmxpbmcsIGJ1dCB0aGV5IGRvXG4gICAgICBhZmZlY3QgdGhlIGV4cGVyaWVuY2Ugc2lnbmlmaWNhbnRseSBlbm91Z2ggdGhhdCB0aGVyZSBhcmUgdGhyZWUgbW9kZXNcbiAgICAgIGZvciBlYWNoOiBcIm9mZlwiLCBcIm9wdGlvbmFsXCIgKG5vIGV4Y2xhbWF0aW9uIHBvaW50KSwgYW5kIFwicmVxdWlyZWRcIlxuICAgICAgKGV4Y2xhbWF0aW9uIHBvaW50KS4gIFRoZSBmaXJzdCB0d28gYXJlIGVxdWl2YWxlbnQgZm9yIHNlZWQgZ2VuZXJhdGlvblxuICAgICAgcHVycG9zZXMsIHNvIHRoYXQgeW91IGNhbiBwbGF5IHRoZSBzYW1lIHNlZWQgd2l0aCBlaXRoZXIgc2V0dGluZy5cbiAgICAgIFNldHRpbmcgaXQgdG8gXCIhXCIgd2lsbCBjaGFuZ2UgdGhlIHNlZWQuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplTXVzaWMgPSBBZXN0aGV0aWNzLmZsYWcoJ0FtJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgYmFja2dyb3VuZCBtdXNpYycsXG4gICAgbW9kZXM6ICchJyxcbiAgICBvcHRpb25hbDogTk9fQkFORyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vTXVzaWMgPSBBZXN0aGV0aWNzLmZsYWcoJ0FzJywge1xuICAgIG5hbWU6ICdObyBiYWNrZ3JvdW5kIG11c2ljJyxcbiAgICBvcHRpb25hbDogT1BUSU9OQUwsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVNYXBDb2xvcnMgPSBBZXN0aGV0aWNzLmZsYWcoJ0FjJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgbWFwIGNvbG9ycycsXG4gICAgbW9kZXM6ICchJyxcbiAgICBvcHRpb25hbDogTk9fQkFORyxcbiAgfSk7XG59XG5cbmNsYXNzIE1vbnN0ZXJzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnTSc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnTW9uc3RlcnMnO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVXZWFrbmVzc2VzID0gTW9uc3RlcnMuZmxhZygnTWUnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBtb25zdGVyIHdlYWtuZXNzZXMnLFxuICAgIHRleHQ6IGBNb25zdGVyIGFuZCBib3NzIGVsZW1lbnRhbCB3ZWFrbmVzc2VzIGFyZSBzaHVmZmxlZC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVG93ZXJSb2JvdHMgPSBNb25zdGVycy5mbGFnKCdNdCcsIHtcbiAgICBuYW1lOiAnU2h1ZmZsZSB0b3dlciByb2JvdHMnLFxuICAgIHRleHQ6IGBUb3dlciByb2JvdHMgd2lsbCBiZSBzaHVmZmxlZCBpbnRvIHRoZSBub3JtYWwgcG9vbC4gIEF0IHNvbWVcbiAgICAgICAgICAgcG9pbnQsIG5vcm1hbCBtb25zdGVycyBtYXkgYmUgc2h1ZmZsZWQgaW50byB0aGUgdG93ZXIgYXMgd2VsbC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xufVxuXG5jbGFzcyBFYXN5TW9kZSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0UnO1xuICByZWFkb25seSBuYW1lID0gJ0Vhc3kgTW9kZSc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlIGZvbGxvd2luZyBvcHRpb25zIG1ha2UgcGFydHMgb2YgdGhlIGdhbWUgZWFzaWVyLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vU2h1ZmZsZU1pbWljcyA9IEVhc3lNb2RlLmZsYWcoJ0V0Jywge1xuICAgIG5hbWU6IGBEb24ndCBzaHVmZmxlIG1pbWljcy5gLFxuICAgIHRleHQ6IGBNaW1pY3Mgd2lsbCBiZSBpbiB0aGVpciB2YW5pbGxhIGxvY2F0aW9ucy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUHJlc2VydmVVbmlxdWVDaGVja3MgPSBFYXN5TW9kZS5mbGFnKCdFdScsIHtcbiAgICBuYW1lOiAnS2VlcCB1bmlxdWUgaXRlbXMgYW5kIGNvbnN1bWFibGVzIHNlcGFyYXRlJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHkgYWxsIGl0ZW1zIGFuZCBtaW1pY3MgYXJlIHNodWZmbGVkIGludG8gYSBzaW5nbGUgcG9vbCBhbmRcbiAgICAgICAgICAgZGlzdHJpYnV0ZWQgZnJvbSB0aGVyZS4gIElmIHRoaXMgZmxhZyBpcyBzZXQsIHVuaXF1ZSBpdGVtc1xuICAgICAgICAgICAoc3BlY2lmaWNhbGx5LCBhbnl0aGluZyB0aGF0IGNhbm5vdCBiZSBzb2xkKSB3aWxsIG9ubHkgYmUgZm91bmQgaW5cbiAgICAgICAgICAgZWl0aGVyIChhKSBjaGVja3MgdGhhdCBoZWxkIHVuaXF1ZSBpdGVtcyBpbiB2YW5pbGxhLCBvciAoYikgYm9zc1xuICAgICAgICAgICBkcm9wcy4gIENoZXN0cyBjb250YWluaW5nIGNvbnN1bWFibGVzIGluIHZhbmlsbGEgbWF5IGJlIHNhZmVseVxuICAgICAgICAgICBpZ25vcmVkLCBidXQgY2hlc3RzIGNvbnRhaW5pbmcgdW5pcXVlIGl0ZW1zIGluIHZhbmlsbGEgbWF5IHN0aWxsXG4gICAgICAgICAgIGVuZCB1cCB3aXRoIG5vbi11bmlxdWUgaXRlbXMgYmVjYXVzZSBvZiBib3NzZXMgbGlrZSBWYW1waXJlIDIgdGhhdFxuICAgICAgICAgICBkcm9wIGNvbnN1bWFibGVzLiAgSWYgbWltaWNzIGFyZSBzaHVmZmxlZCwgdGhleSB3aWxsIG9ubHkgYmUgaW5cbiAgICAgICAgICAgY29uc3VtYWJsZSBsb2NhdGlvbnMuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IERlY3JlYXNlRW5lbXlEYW1hZ2UgPSBFYXN5TW9kZS5mbGFnKCdFZCcsIHtcbiAgICBuYW1lOiAnRGVjcmVhc2UgZW5lbXkgZGFtYWdlJyxcbiAgICB0ZXh0OiBgRW5lbXkgYXR0YWNrIHBvd2VyIHdpbGwgYmUgc2lnbmlmaWNhbnRseSBkZWNyZWFzZWQgaW4gdGhlIGVhcmx5IGdhbWVcbiAgICAgICAgICAgKGJ5IGEgZmFjdG9yIG9mIDMpLiAgVGhlIGdhcCB3aWxsIG5hcnJvdyBpbiB0aGUgbWlkLWdhbWUgYW5kIGV2ZW50dWFsbHlcbiAgICAgICAgICAgcGhhc2Ugb3V0IGF0IHNjYWxpbmcgbGV2ZWwgNDAuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQgPSBFYXN5TW9kZS5mbGFnKCdFcycsIHtcbiAgICBuYW1lOiAnR3VhcmFudGVlIHN0YXJ0aW5nIHN3b3JkJyxcbiAgICB0ZXh0OiBgVGhlIExlYWYgZWxkZXIgaXMgZ3VhcmFudGVlZCB0byBnaXZlIGEgc3dvcmQuICBJdCB3aWxsIG5vdCBiZVxuICAgICAgICAgICByZXF1aXJlZCB0byBkZWFsIHdpdGggYW55IGVuZW1pZXMgYmVmb3JlIGZpbmRpbmcgdGhlIGZpcnN0IHN3b3JkLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBHdWFyYW50ZWVSZWZyZXNoID0gRWFzeU1vZGUuZmxhZygnRXInLCB7XG4gICAgbmFtZTogJ0d1YXJhbnRlZSByZWZyZXNoJyxcbiAgICB0ZXh0OiBgR3VhcmFudGVlcyB0aGUgUmVmcmVzaCBzcGVsbCB3aWxsIGJlIGF2YWlsYWJsZSBiZWZvcmUgZmlnaHRpbmdcbiAgICAgICAgICAgVGV0cmFyY2hzLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBFeHBlcmllbmNlU2NhbGVzRmFzdGVyID0gRWFzeU1vZGUuZmxhZygnRXgnLCB7XG4gICAgbmFtZTogJ0V4cGVyaWVuY2Ugc2NhbGVzIGZhc3RlcicsXG4gICAgdGV4dDogYExlc3MgZ3JpbmRpbmcgd2lsbCBiZSByZXF1aXJlZCB0byBcImtlZXAgdXBcIiB3aXRoIHRoZSBnYW1lIGRpZmZpY3VsdHkuYCxcbiAgICBleGNsdWRlczogWydIeCddLFxuICB9KTtcbn1cblxuY2xhc3MgTm9HdWFyYW50ZWVzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnTic7XG4gIHJlYWRvbmx5IG5hbWUgPSAnTm8gZ3VhcmFudGVlcyc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgUmVtb3ZlcyB2YXJpb3VzIGd1YXJhbnRlZXMgZnJvbSB0aGUgbG9naWMuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgQmF0dGxlTWFnaWMgPSBOb0d1YXJhbnRlZXMuZmxhZygnTncnLCB7XG4gICAgbmFtZTogJ0JhdHRsZSBtYWdpYyBub3QgZ3VhcmFudGVlZCcsXG4gICAgdGV4dDogYE5vcm1hbGx5LCB0aGUgbG9naWMgd2lsbCBndWFyYW50ZWUgdGhhdCBsZXZlbCAzIHN3b3JkIGNoYXJnZXMgYXJlXG4gICAgICAgICAgIGF2YWlsYWJsZSBiZWZvcmUgZmlnaHRpbmcgdGhlIHRldHJhcmNocyAod2l0aCB0aGUgZXhjZXB0aW9uIG9mIEthcm1pbmUsXG4gICAgICAgICAgIHdobyBvbmx5IHJlcXVpcmVzIGxldmVsIDIpLiAgVGhpcyBkaXNhYmxlcyB0aGF0IGNoZWNrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE1hdGNoaW5nU3dvcmQgPSBOb0d1YXJhbnRlZXMuZmxhZygnTnMnLCB7XG4gICAgbmFtZTogJ01hdGNoaW5nIHN3b3JkIG5vdCBndWFyYW50ZWVkIChcIlRpbmsgTW9kZVwiKScsXG4gICAgdGV4dDogYEVuYWJsZXMgXCJ0aW5rIHN0cmF0c1wiLCB3aGVyZSB3cm9uZy1lbGVtZW50IHN3b3JkcyB3aWxsIHN0aWxsIGRvIGFcbiAgICAgICAgICAgc2luZ2xlIGRhbWFnZSBwZXIgaGl0LiAgUGxheWVyIG1heSBiZSByZXF1aXJlZCB0byBmaWdodCBtb25zdGVyc1xuICAgICAgICAgICAoaW5jbHVkaW5nIGJvc3Nlcykgd2l0aCB0aW5rcy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBCYXJyaWVyID0gTm9HdWFyYW50ZWVzLmZsYWcoJ05iJywge1xuICAgIG5hbWU6ICdCYXJyaWVyIG5vdCBndWFyYW50ZWVkJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHksIHRoZSBsb2dpYyB3aWxsIGd1YXJhbnRlZSBCYXJyaWVyIChvciBlbHNlIHJlZnJlc2ggYW5kIHNoaWVsZFxuICAgICAgICAgICByaW5nKSBiZWZvcmUgZW50ZXJpbmcgU3R4eSwgdGhlIEZvcnRyZXNzLCBvciBmaWdodGluZyBLYXJtaW5lLiAgVGhpc1xuICAgICAgICAgICBkaXNhYmxlcyB0aGF0IGNoZWNrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEdhc01hc2sgPSBOb0d1YXJhbnRlZXMuZmxhZygnTmcnLCB7XG4gICAgbmFtZTogJ0dhcyBtYXNrIG5vdCBndWFyYW50ZWVkJyxcbiAgICB0ZXh0OiBgVGhlIGxvZ2ljIHdpbGwgbm90IGd1YXJhbnRlZSBnYXMgbWFzayBiZWZvcmUgbmVlZGluZyB0byBlbnRlciB0aGUgc3dhbXAsXG4gICAgICAgICAgIG5vciB3aWxsIGxlYXRoZXIgYm9vdHMgKG9yIGhhem1hdCBzdWl0KSBiZSBndWFyYW50ZWVkIHRvIGNyb3NzIGxvbmdcbiAgICAgICAgICAgc3RyZXRjaGVzIG9mIHNwaWtlcy4gIEdhcyBtYXNrIGlzIHN0aWxsIGd1YXJhbnRlZWQgdG8ga2lsbCB0aGUgaW5zZWN0LmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG59XG5cbmNsYXNzIEhhcmRNb2RlIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnSCc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnSGFyZCBtb2RlJztcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9CdWZmTWVkaWNhbEhlcmIgPSBIYXJkTW9kZS5mbGFnKCdIbScsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYnVmZiBtZWRpY2FsIGhlcmIgb3IgZnJ1aXQgb2YgcG93ZXJgLFxuICAgIHRleHQ6IGBNZWRpY2FsIEhlcmIgaXMgbm90IGJ1ZmZlZCB0byBoZWFsIDgwIGRhbWFnZSwgd2hpY2ggaXMgaGVscGZ1bCB0byBtYWtlXG4gICAgICAgICAgIHVwIGZvciBjYXNlcyB3aGVyZSBSZWZyZXNoIGlzIHVuYXZhaWxhYmxlIGVhcmx5LiAgRnJ1aXQgb2YgUG93ZXIgaXMgbm90XG4gICAgICAgICAgIGJ1ZmZlZCB0byByZXN0b3JlIDU2IE1QLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE1heFNjYWxpbmdJblRvd2VyID0gSGFyZE1vZGUuZmxhZygnSHQnLCB7XG4gICAgbmFtZTogJ01heCBzY2FsaW5nIGxldmVsIGluIHRvd2VyJyxcbiAgICB0ZXh0OiBgRW5lbWllcyBpbiB0aGUgdG93ZXIgc3Bhd24gYXQgbWF4IHNjYWxpbmcgbGV2ZWwuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgRXhwZXJpZW5jZVNjYWxlc1Nsb3dlciA9IEhhcmRNb2RlLmZsYWcoJ0h4Jywge1xuICAgIG5hbWU6ICdFeHBlcmllbmNlIHNjYWxlcyBzbG93ZXInLFxuICAgIHRleHQ6IGBNb3JlIGdyaW5kaW5nIHdpbGwgYmUgcmVxdWlyZWQgdG8gXCJrZWVwIHVwXCIgd2l0aCB0aGUgZGlmZmljdWx0eS5gLFxuICAgIGV4Y2x1ZGVzOiBbJ0V4J10sXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IENoYXJnZVNob3RzT25seSA9IEhhcmRNb2RlLmZsYWcoJ0hjJywge1xuICAgIG5hbWU6ICdDaGFyZ2Ugc2hvdHMgb25seScsXG4gICAgdGV4dDogYFN0YWJiaW5nIGlzIGNvbXBsZXRlbHkgaW5lZmZlY3RpdmUuICBPbmx5IGNoYXJnZWQgc2hvdHMgd29yay5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBCbGFja291dCA9IEhhcmRNb2RlLmZsYWcoJ0h6Jywge1xuICAgIG5hbWU6ICdCbGFja291dCcsXG4gICAgdGV4dDogYEFsbCBjYXZlcyBhbmQgZm9ydHJlc3NlcyBhcmUgcGVybWFuZW50bHkgZGFyay5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBQZXJtYWRlYXRoID0gSGFyZE1vZGUuZmxhZygnSGgnLCB7XG4gICAgbmFtZTogJ1Blcm1hZGVhdGgnLFxuICAgIHRleHQ6IGBIYXJkY29yZSBtb2RlOiBjaGVja3BvaW50cyBhbmQgc2F2ZXMgYXJlIHJlbW92ZWQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcbn1cblxuY2xhc3MgVmFuaWxsYSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgbmFtZSA9ICdWYW5pbGxhJztcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1YnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIE9wdGlvbnMgdG8gcmVzdG9yZSB2YW5pbGxhIGJlaGF2aW9yIGNoYW5nZWQgYnkgZGVmYXVsdC5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBEeW5hID0gVmFuaWxsYS5mbGFnKCdWZCcsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYnVmZiBEeW5hYCxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgd2UgbWFrZXMgdGhlIER5bmEgZmlnaHQgYSBiaXQgbW9yZSBvZiBhIGNoYWxsZW5nZS5cbiAgICAgICAgICAgU2lkZSBwb2RzIHdpbGwgZmlyZSBzaWduaWZpY2FudGx5IG1vcmUuICBUaGUgc2FmZSBzcG90IGhhcyBiZWVuXG4gICAgICAgICAgIHJlbW92ZWQuICBUaGUgcmV2ZW5nZSBiZWFtcyBwYXNzIHRocm91Z2ggYmFycmllci4gIFNpZGUgcG9kcyBjYW5cbiAgICAgICAgICAgbm93IGJlIGtpbGxlZC4gIFRoaXMgZmxhZyBwcmV2ZW50cyB0aGF0IGNoYW5nZS5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgQm9udXNJdGVtcyA9IFZhbmlsbGEuZmxhZygnVmInLCB7XG4gICAgbmFtZTogYERvbid0IGJ1ZmYgYm9udXMgaXRlbXNgLFxuICAgIHRleHQ6IGBMZWF0aGVyIEJvb3RzIGFyZSBjaGFuZ2VkIHRvIFNwZWVkIEJvb3RzLCB3aGljaCBpbmNyZWFzZSBwbGF5ZXIgd2Fsa2luZ1xuICAgICAgICAgICBzcGVlZCAodGhpcyBhbGxvd3MgY2xpbWJpbmcgdXAgdGhlIHNsb3BlIHRvIGFjY2VzcyB0aGUgVG9ybmFkbyBCcmFjZWxldFxuICAgICAgICAgICBjaGVzdCwgd2hpY2ggaXMgdGFrZW4gaW50byBjb25zaWRlcmF0aW9uIGJ5IHRoZSBsb2dpYykuICBEZW8ncyBwZW5kYW50XG4gICAgICAgICAgIHJlc3RvcmVzIE1QIHdoaWxlIG1vdmluZy4gIFJhYmJpdCBib290cyBlbmFibGUgc3dvcmQgY2hhcmdpbmcgdXAgdG9cbiAgICAgICAgICAgbGV2ZWwgMiB3aGlsZSB3YWxraW5nIChsZXZlbCAzIHN0aWxsIHJlcXVpcmVzIGJlaW5nIHN0YXRpb25hcnksIHNvIGFzXG4gICAgICAgICAgIHRvIHByZXZlbnQgd2FzdGluZyB0b25zIG9mIG1hZ2ljKS5gLFxuICB9KTtcblxuICAvLyBUT0RPIC0gaXMgaXQgd29ydGggZXZlbiBhbGxvd2luZyB0byB0dXJuIHRoaXMgb2ZmPyE/XG4gIHN0YXRpYyByZWFkb25seSBNYXBzID0gVmFuaWxsYS5mbGFnKCdWbScsIHtcbiAgICBuYW1lOiAnVmFuaWxsYSBtYXBzJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHkgdGhlIHJhbmRvbWl6ZXIgYWRkcyBhIG5ldyBcIkVhc3QgQ2F2ZVwiIHRvIFZhbGxleSBvZiBXaW5kLFxuICAgICAgICAgICBib3Jyb3dlZCBmcm9tIHRoZSBHQkMgdmVyc2lvbiBvZiB0aGUgZ2FtZS4gIFRoaXMgY2F2ZSBjb250YWlucyB0d29cbiAgICAgICAgICAgY2hlc3RzIChvbmUgY29uc2lkZXJlZCBhIGtleSBpdGVtKSBvbiB0aGUgdXBwZXIgZmxvb3IgYW5kIGV4aXRzIHRvXG4gICAgICAgICAgIHR3byByYW5kb20gYXJlYXMgKGNob3NlbiBiZXR3ZWVuIExpbWUgVHJlZSBWYWxsZXksIENvcmRlbCBQbGFpbixcbiAgICAgICAgICAgR29hIFZhbGxleSwgb3IgRGVzZXJ0IDI7IHRoZSBxdWlja3NhbmQgaXMgcmVtb3ZlZCBmcm9tIHRoZSBlbnRyYW5jZXNcbiAgICAgICAgICAgdG8gUHlyYW1pZCBhbmQgQ3J5cHQpLCBvbmUgdW5ibG9ja2VkIG9uIHRoZSBsb3dlciBmbG9vciwgYW5kIG9uZVxuICAgICAgICAgICBkb3duIHRoZSBzdGFpcnMgYW5kIGJlaGluZCBhIHJvY2sgd2FsbCBmcm9tIHRoZSB1cHBlciBmbG9vci4gIFRoaXNcbiAgICAgICAgICAgZmxhZyBwcmV2ZW50cyBhZGRpbmcgdGhhdCBjYXZlLiAgSWYgc2V0IGFzIFwiViFtXCIgdGhlbiBhIGRpcmVjdCBwYXRoXG4gICAgICAgICAgIHdpbGwgaW5zdGVhZCBiZSBhZGRlZCBiZXR3ZWVuIFZhbGxleSBvZiBXaW5kIGFuZCBMaW1lIFRyZWUgVmFsbGV5XG4gICAgICAgICAgIChhcyBpbiBlYXJsaWVyIHZlcnNpb25zIG9mIHRoZSByYW5kb21pemVyKS5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTaG9wcyA9IFZhbmlsbGEuZmxhZygnVnMnLCB7XG4gICAgbmFtZTogJ1ZhbmlsbGEgc2hvcHMnLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB3ZSBkaXNhYmxlIHNob3AgZ2xpdGNoLCBzaHVmZmxlIHNob3AgY29udGVudHMsIGFuZCB0aWVcbiAgICAgICAgICAgdGhlIHByaWNlcyB0byB0aGUgc2NhbGluZyBsZXZlbCAoaXRlbSBzaG9wcyBhbmQgaW5ucyBpbmNyZWFzZSBieSBhXG4gICAgICAgICAgIGZhY3RvciBvZiAyIGV2ZXJ5IDEwIHNjYWxpbmcgbGV2ZWxzLCBhcm1vciBzaG9wcyBkZWNyZWFzZSBieSBhXG4gICAgICAgICAgIGZhY3RvciBvZiAyIGV2ZXJ5IDEyIHNjYWxpbmcgbGV2ZWxzKS4gIFRoaXMgZmxhZyBwcmV2ZW50cyBhbGwgb2ZcbiAgICAgICAgICAgdGhlc2UgY2hhbmdlcywgcmVzdG9yaW5nIHNob3BzIHRvIGJlIGNvbXBsZXRlbHkgdmFuaWxsYS5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgV2lsZFdhcnAgPSBWYW5pbGxhLmZsYWcoJ1Z3Jywge1xuICAgIG5hbWU6ICdWYW5pbGxhIHdpbGQgd2FycCcsXG4gICAgdGV4dDogYEJ5IGRlZmF1bHQsIFdpbGQgV2FycCBpcyBuZXJmZWQgdG8gb25seSByZXR1cm4gdG8gTWV6YW1lIFNocmluZS5cbiAgICAgICAgICAgVGhpcyBmbGFnIHJlc3RvcmVzIGl0IHRvIHdvcmsgbGlrZSBub3JtYWwuICBOb3RlIHRoYXQgdGhpcyB3aWxsIHB1dFxuICAgICAgICAgICBhbGwgd2lsZCB3YXJwIGxvY2F0aW9ucyBpbiBsb2dpYyB1bmxlc3MgdGhlIGZsYWcgaXMgc2V0IGFzIChWIXcpLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG59XG5cbmNsYXNzIFF1YWxpdHkgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdRJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdRdWFsaXR5IG9mIExpZmUnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZSBmb2xsb3dpbmcgcXVhbGl0eS1vZi1saWZlIGZsYWdzIHR1cm4gPGk+b2ZmPC9pPiBpbXByb3ZlbWVudHMgdGhhdFxuICAgICAgYXJlIG5vcm1hbGx5IG9uIGJ5IGRlZmF1bHQuICBUaGV5IGFyZSBvcHRpb25hbCBhbmQgd2lsbCBub3QgYWZmZWN0IHRoZVxuICAgICAgc2VlZCBnZW5lcmF0aW9uLiAgVGhleSBtYXkgYmUgdG9nZ2xlZCBmcmVlbHkgaW4gcmFjZSBtb2RlLmA7XG5cbiAgLy8gVE9ETyAtIHJlbWVtYmVyIHByZWZlcmVuY2VzIGFuZCBhdXRvLWFwcGx5P1xuICBzdGF0aWMgcmVhZG9ubHkgTm9BdXRvRXF1aXAgPSBRdWFsaXR5LmZsYWcoJ1FhJywge1xuICAgIG5hbWU6IGBEb24ndCBhdXRvbWF0aWNhbGx5IGVxdWlwIG9yYnMgYW5kIGJyYWNlbGV0c2AsXG4gICAgdGV4dDogYFByZXZlbnRzIGFkZGluZyBhIHF1YWxpdHktb2YtbGlmZSBpbXByb3ZlbWVudCB0byBhdXRvbWF0aWNhbGx5IGVxdWlwXG4gICAgICAgICAgIHRoZSBjb3JyZXNwb25kaW5nIG9yYi9icmFjZWxldCB3aGVuZXZlciBjaGFuZ2luZyBzd29yZHMuYCxcbiAgICBvcHRpb25hbDogT1BUSU9OQUwsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb0NvbnRyb2xsZXJTaG9ydGN1dHMgPSBRdWFsaXR5LmZsYWcoJ1FjJywge1xuICAgIG5hbWU6ICdEaXNhYmxlIGNvbnRyb2xsZXIgc2hvcnRjdXRzJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgd2UgZGlzYWJsZSBzZWNvbmQgY29udHJvbGxlciBpbnB1dCBhbmQgaW5zdGVhZCBlbmFibGVcbiAgICAgICAgICAgc29tZSBuZXcgc2hvcnRjdXRzIG9uIGNvbnRyb2xsZXIgMTogU3RhcnQrQStCIGZvciB3aWxkIHdhcnAsIGFuZFxuICAgICAgICAgICBTZWxlY3QrQiB0byBxdWlja2x5IGNoYW5nZSBzd29yZHMuICBUbyBzdXBwb3J0IHRoaXMsIHRoZSBhY3Rpb24gb2ZcbiAgICAgICAgICAgdGhlIHN0YXJ0IGFuZCBzZWxlY3QgYnV0dG9ucyBpcyBjaGFuZ2VkIHNsaWdodGx5LiAgVGhpcyBmbGFnXG4gICAgICAgICAgIGRpc2FibGVzIHRoaXMgY2hhbmdlIGFuZCByZXRhaW5zIG5vcm1hbCBiZWhhdmlvci5gLFxuICAgIG9wdGlvbmFsOiBPUFRJT05BTCxcbiAgfSk7XG59XG5cbmNsYXNzIERlYnVnTW9kZSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgLy8gVE9ETyAtIGhvdyB0byBkaXNjb3ZlciBGbGFnU2VjdGlvbnM/Pz9cbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0QnO1xuICByZWFkb25seSBuYW1lID0gJ0RlYnVnIE1vZGUnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZXNlIG9wdGlvbnMgYXJlIGhlbHBmdWwgZm9yIGV4cGxvcmluZyBvciBkZWJ1Z2dpbmcuICBOb3RlIHRoYXQsXG4gICAgICB3aGlsZSB0aGV5IGRvIG5vdCBkaXJlY3RseSBhZmZlY3QgYW55IHJhbmRvbWl6YXRpb24sIHRoZXlcbiAgICAgIDxpPmRvPC9pPiBmYWN0b3IgaW50byB0aGUgc2VlZCB0byBwcmV2ZW50IGNoZWF0aW5nLCBhbmQgdGhleVxuICAgICAgd2lsbCByZW1vdmUgdGhlIG9wdGlvbiB0byBnZW5lcmF0ZSBhIHNlZWQgZm9yIHJhY2luZy5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBTcG9pbGVyTG9nID0gRGVidWdNb2RlLmZsYWcoJ0RzJywge1xuICAgIG5hbWU6ICdHZW5lcmF0ZSBhIHNwb2lsZXIgbG9nJyxcbiAgICB0ZXh0OiBgTm90ZTogPGI+dGhpcyB3aWxsIGNoYW5nZSB0aGUgcGxhY2VtZW50IG9mIGl0ZW1zPC9iPiBjb21wYXJlZCB0byBhXG4gICAgICAgICAgIHNlZWQgZ2VuZXJhdGVkIHdpdGhvdXQgdGhpcyBmbGFnIHR1cm5lZCBvbi5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVHJhaW5lck1vZGUgPSBEZWJ1Z01vZGUuZmxhZygnRHQnLCB7XG4gICAgbmFtZTogJ1RyYWluZXIgbW9kZScsXG4gICAgdGV4dDogYEluc3RhbGxzIGEgdHJhaW5lciBmb3IgcHJhY3RpY2luZyBjZXJ0YWluIHBhcnRzIG9mIHRoZSBnYW1lLlxuICAgICAgICAgICBBdCB0aGUgc3RhcnQgb2YgdGhlIGdhbWUsIHRoZSBwbGF5ZXIgd2lsbCBoYXZlIGFsbCBzd29yZHMsIGJhc2ljXG4gICAgICAgICAgIGFybW9ycyBhbmQgc2hpZWxkcywgYWxsIHdvcm4gaXRlbXMgYW5kIG1hZ2ljcywgYSBzZWxlY3Rpb24gb2ZcbiAgICAgICAgICAgY29uc3VtYWJsZXMsIGJvdyBvZiB0cnV0aCwgbWF4aW11bSBjYXNoLCBhbGwgd2FycCBwb2ludHMgYWN0aXZhdGVkLFxuICAgICAgICAgICBhbmQgdGhlIFNoeXJvbiBtYXNzYWNyZSB3aWxsIGhhdmUgYmVlbiB0cmlnZ2VyZWQuICBXaWxkIHdhcnAgaXNcbiAgICAgICAgICAgcmVjb25maWd1cmVkIHRvIHByb3ZpZGUgZWFzeSBhY2Nlc3MgdG8gYWxsIGJvc3Nlcy4gIEFkZGl0aW9uYWxseSxcbiAgICAgICAgICAgdGhlIGZvbGxvd2luZyBidXR0b24gY29tYmluYXRpb25zIGFyZSByZWNvZ25pemVkOjx1bD5cbiAgICAgICAgICAgICA8bGk+U3RhcnQrVXA6IGluY3JlYXNlIHBsYXllciBsZXZlbFxuICAgICAgICAgICAgIDxsaT5TdGFydCtEb3duOiBpbmNyZWFzZSBzY2FsaW5nIGxldmVsXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0xlZnQ6IGdldCBhbGwgYmFsbHNcbiAgICAgICAgICAgICA8bGk+U3RhcnQrUmlnaHQ6IGdldCBhbGwgYnJhY2VsZXRzXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0IrRG93bjogZ2V0IGEgZnVsbCBzZXQgb2YgY29uc3VtYWJsZSBpdGVtc1xuICAgICAgICAgICAgIDxsaT5TdGFydCtCK0xlZnQ6IGdldCBhbGwgYWR2YW5jZWQgYXJtb3JzXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0IrUmlnaHQ6IGdldCBhbGwgYWR2YW5jZWQgc2hpZWxkc1xuICAgICAgICAgICA8L3VsPmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOZXZlckRpZSA9IERlYnVnTW9kZS5mbGFnKCdEaScsIHtcbiAgICBuYW1lOiAnUGxheWVyIG5ldmVyIGRpZXMnLFxuICB9KTtcbn1cblxuZXhwb3J0IGNsYXNzIEZsYWdTZXQge1xuICBwcml2YXRlIGZsYWdzOiBNYXA8RmxhZywgTW9kZT47XG5cbiAgY29uc3RydWN0b3Ioc3RyOiBzdHJpbmd8TWFwPEZsYWcsIE1vZGU+ID0gJ0BDYXN1YWwnKSB7XG4gICAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmZsYWdzID0gbmV3IE1hcCgpO1xuICAgICAgZm9yIChjb25zdCBbaywgdl0gb2Ygc3RyKSB7XG4gICAgICAgIHRoaXMuc2V0KGsuZmxhZywgdik7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChzdHIuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICAvLyBUT0RPIC0gc3VwcG9ydCAnQENhc3VhbCtScy1FZCdcbiAgICAgIGNvbnN0IGV4cGFuZGVkID0gUHJlc2V0cy5nZXQoc3RyLnN1YnN0cmluZygxKSk7XG4gICAgICBpZiAoIWV4cGFuZGVkKSB0aHJvdyBuZXcgVXNhZ2VFcnJvcihgVW5rbm93biBwcmVzZXQ6ICR7c3RyfWApO1xuICAgICAgdGhpcy5mbGFncyA9IG5ldyBNYXAoZXhwYW5kZWQuZmxhZ3MpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmZsYWdzID0gbmV3IE1hcCgpO1xuICAgIC8vIHBhcnNlIHRoZSBzdHJpbmdcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvW15BLVphLXowLTkhP10vZywgJycpO1xuICAgIGNvbnN0IHJlID0gLyhbQS1aXSkoW2EtejAtOSE/XSspL2c7XG4gICAgbGV0IG1hdGNoO1xuICAgIHdoaWxlICgobWF0Y2ggPSByZS5leGVjKHN0cikpKSB7XG4gICAgICBjb25zdCBbLCBrZXksIHRlcm1zXSA9IG1hdGNoO1xuICAgICAgY29uc3QgcmUyID0gLyhbIT9dfF4pKFthLXowLTldKykvZztcbiAgICAgIHdoaWxlICgobWF0Y2ggPSByZTIuZXhlYyh0ZXJtcykpKSB7XG4gICAgICAgIGNvbnN0IFssIG1vZGUsIGZsYWdzXSA9IG1hdGNoO1xuICAgICAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgICAgICB0aGlzLnNldChrZXkgKyBmbGFnLCBtb2RlIHx8IHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZmlsdGVyT3B0aW9uYWwoKTogRmxhZ1NldCB7XG4gICAgcmV0dXJuIG5ldyBGbGFnU2V0KFxuICAgICAgICBuZXcgTWFwKFxuICAgICAgICAgICAgWy4uLnRoaXMuZmxhZ3NdLm1hcChcbiAgICAgICAgICAgICAgICAoW2ssIHZdKSA9PiBbaywgay5vcHRzLm9wdGlvbmFsID8gay5vcHRzLm9wdGlvbmFsKHYpIDogdl0pKSk7XG4gIH1cblxuICBmaWx0ZXJSYW5kb20ocmFuZG9tOiBSYW5kb20pOiBGbGFnU2V0IHtcbiAgICBmdW5jdGlvbiBwaWNrKGs6IEZsYWcsIHY6IE1vZGUpOiBNb2RlIHtcbiAgICAgIGlmICh2ICE9PSAnPycpIHJldHVybiB2O1xuICAgICAgcmV0dXJuIHJhbmRvbS5waWNrKFt0cnVlLCBmYWxzZSwgLi4uKGsub3B0cy5tb2RlcyB8fCAnJyldKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBGbGFnU2V0KFxuICAgICAgICBuZXcgTWFwKFsuLi50aGlzLmZsYWdzXS5tYXAoKFtrLCB2XSkgPT4gW2ssIHBpY2soaywgdildKSkpO1xuICB9XG5cbiAgdG9TdHJpbmcoKSB7XG4gICAgdHlwZSBTZWN0aW9uID0gRGVmYXVsdE1hcDxzdHJpbmcsIHN0cmluZ1tdPjtcbiAgICBjb25zdCBzZWN0aW9ucyA9XG4gICAgICAgIG5ldyBEZWZhdWx0TWFwPHN0cmluZywgU2VjdGlvbj4oXG4gICAgICAgICAgICAoKSA9PiBuZXcgRGVmYXVsdE1hcDxzdHJpbmcsIHN0cmluZ1tdPigoKSA9PiBbXSkpXG4gICAgZm9yIChjb25zdCBbZmxhZywgbW9kZV0gb2YgdGhpcy5mbGFncykge1xuICAgICAgaWYgKGZsYWcuZmxhZy5sZW5ndGggIT09IDIpIHRocm93IG5ldyBFcnJvcihgQmFkIGZsYWcgJHtmbGFnLmZsYWd9YCk7XG4gICAgICBpZiAoIW1vZGUpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgc2VjdGlvbiA9IHNlY3Rpb25zLmdldChmbGFnLmZsYWdbMF0pO1xuICAgICAgY29uc3Qgc3Vic2VjdGlvbiA9IG1vZGUgPT09IHRydWUgPyAnJyA6IG1vZGU7XG4gICAgICBzZWN0aW9uLmdldChzdWJzZWN0aW9uKS5wdXNoKGZsYWcuZmxhZ1sxXSk7XG4gICAgfVxuICAgIGNvbnN0IG91dCA9IFtdO1xuICAgIGZvciAoY29uc3QgW2tleSwgc2VjdGlvbl0gb2Ygc2VjdGlvbnMuc29ydGVkRW50cmllcygpKSB7XG4gICAgICBsZXQgc2VjID0ga2V5O1xuICAgICAgZm9yIChjb25zdCBbc3Via2V5LCBzdWJzZWN0aW9uXSBvZiBzZWN0aW9uLnNvcnRlZEVudHJpZXMoKSkge1xuICAgICAgICBzZWMgKz0gc3Via2V5ICsgc3Vic2VjdGlvbi5zb3J0KCkuam9pbignJyk7XG4gICAgICB9XG4gICAgICBvdXQucHVzaChzZWMpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmpvaW4oJyAnKTtcbiAgfVxuXG4gIHRvZ2dsZShuYW1lOiBzdHJpbmcpOiBNb2RlIHtcbiAgICBjb25zdCBmbGFnID0gRmxhZy5mbGFncy5nZXQobmFtZSk7XG4gICAgaWYgKCFmbGFnKSB7XG4gICAgICAvLyBUT0RPIC0gUmVwb3J0IHNvbWV0aGluZ1xuICAgICAgY29uc29sZS5lcnJvcihgQmFkIGZsYWc6ICR7bmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgbW9kZTogTW9kZSA9IHRoaXMuZmxhZ3MuZ2V0KGZsYWcpIHx8IGZhbHNlO1xuICAgIGNvbnN0IG1vZGVzID0gW2ZhbHNlLCB0cnVlLCAuLi4oZmxhZy5vcHRzLm1vZGVzIHx8ICcnKSwgJz8nLCBmYWxzZV07XG4gICAgY29uc3QgaW5kZXggPSBtb2Rlcy5pbmRleE9mKG1vZGUpO1xuICAgIGlmIChpbmRleCA8IDApIHRocm93IG5ldyBFcnJvcihgQmFkIGN1cnJlbnQgbW9kZSAke21vZGV9YCk7XG4gICAgY29uc3QgbmV4dCA9IG1vZGVzW2luZGV4ICsgMV07XG4gICAgdGhpcy5mbGFncy5zZXQoZmxhZywgbmV4dCk7XG4gICAgcmV0dXJuIG5leHQ7XG4gIH1cblxuICBzZXQobmFtZTogc3RyaW5nLCBtb2RlOiBNb2RlKSB7XG4gICAgY29uc3QgZmxhZyA9IEZsYWcuZmxhZ3MuZ2V0KG5hbWUpO1xuICAgIGlmICghZmxhZykge1xuICAgICAgLy8gVE9ETyAtIFJlcG9ydCBzb21ldGhpbmdcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEJhZCBmbGFnOiAke25hbWV9YCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghbW9kZSkge1xuICAgICAgdGhpcy5mbGFncy5kZWxldGUoZmxhZyk7XG4gICAgfSBlbHNlIGlmIChtb2RlID09PSB0cnVlIHx8IG1vZGUgPT09ICc/JyB8fCBmbGFnLm9wdHMubW9kZXM/LmluY2x1ZGVzKG1vZGUpKSB7XG4gICAgICB0aGlzLmZsYWdzLnNldChmbGFnLCBtb2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihgQmFkIGZsYWcgbW9kZTogJHtuYW1lWzBdfSR7bW9kZX0ke25hbWUuc3Vic3RyaW5nKDEpfWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBSZW1vdmUgYW55IGNvbmZsaWN0c1xuICAgIGZvciAoY29uc3QgZXhjbHVkZWQgb2YgZmxhZy5vcHRzLmV4Y2x1ZGVzIHx8IFtdKSB7XG4gICAgICB0aGlzLmZsYWdzLmRlbGV0ZShGbGFnLmZsYWdzLmdldChleGNsdWRlZCkhKTtcbiAgICB9XG4gIH1cblxuICBjaGVjayhuYW1lOiBGbGFnfHN0cmluZywgLi4ubW9kZXM6IE1vZGVbXSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGZsYWcgPSBuYW1lIGluc3RhbmNlb2YgRmxhZyA/IG5hbWUgOiBGbGFnLmZsYWdzLmdldChuYW1lKTtcbiAgICBpZiAoIW1vZGVzLmxlbmd0aCkgbW9kZXMucHVzaCh0cnVlKTtcbiAgICByZXR1cm4gbW9kZXMuaW5jbHVkZXMoZmxhZyAmJiB0aGlzLmZsYWdzLmdldChmbGFnKSB8fCBmYWxzZSk7XG4gIH1cblxuICBnZXQobmFtZTogRmxhZ3xzdHJpbmcpOiBNb2RlIHtcbiAgICBjb25zdCBmbGFnID0gbmFtZSBpbnN0YW5jZW9mIEZsYWcgPyBuYW1lIDogRmxhZy5mbGFncy5nZXQobmFtZSk7XG4gICAgcmV0dXJuIGZsYWcgJiYgdGhpcy5mbGFncy5nZXQoZmxhZykgfHwgZmFsc2U7XG4gIH1cblxuICBwcmVzZXJ2ZVVuaXF1ZUNoZWNrcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5QcmVzZXJ2ZVVuaXF1ZUNoZWNrcyk7XG4gIH1cbiAgc2h1ZmZsZU1pbWljcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5Ob1NodWZmbGVNaW1pY3MsIGZhbHNlKTtcbiAgfVxuXG4gIGJ1ZmZEZW9zUGVuZGFudCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuICBjaGFuZ2VHYXNNYXNrVG9IYXptYXRTdWl0KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG4gIHNsb3dEb3duVG9ybmFkbygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuICBsZWF0aGVyQm9vdHNHaXZlU3BlZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cbiAgcmFiYml0Qm9vdHNDaGFyZ2VXaGlsZVdhbGtpbmcoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cblxuICBzaHVmZmxlU3ByaXRlUGFsZXR0ZXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplU3ByaXRlQ29sb3JzKTtcbiAgfVxuICBzaHVmZmxlTW9uc3RlcnMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ01yJyk7XG4gIH1cbiAgc2h1ZmZsZVNob3BzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuU2hvcHMsIGZhbHNlKTtcbiAgfVxuICBiYXJnYWluSHVudGluZygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zaHVmZmxlU2hvcHMoKTtcbiAgfVxuXG4gIHNodWZmbGVUb3dlck1vbnN0ZXJzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE1vbnN0ZXJzLlRvd2VyUm9ib3RzKTtcbiAgfVxuICBzaHVmZmxlTW9uc3RlckVsZW1lbnRzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMpO1xuICB9XG4gIHNodWZmbGVCb3NzRWxlbWVudHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc2h1ZmZsZU1vbnN0ZXJFbGVtZW50cygpO1xuICB9XG5cbiAgYnVmZk1lZGljYWxIZXJiKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLk5vQnVmZk1lZGljYWxIZXJiLCBmYWxzZSk7XG4gIH1cbiAgZGVjcmVhc2VFbmVteURhbWFnZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5EZWNyZWFzZUVuZW15RGFtYWdlKTtcbiAgfVxuICB0cmFpbmVyKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKERlYnVnTW9kZS5UcmFpbmVyTW9kZSk7XG4gIH1cbiAgbmV2ZXJEaWUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRGVidWdNb2RlLk5ldmVyRGllKTtcbiAgfVxuICBjaGFyZ2VTaG90c09ubHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuQ2hhcmdlU2hvdHNPbmx5KTtcbiAgfVxuXG4gIGJhcnJpZXJSZXF1aXJlc0NhbG1TZWEoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIH1cbiAgLy8gcGFyYWx5c2lzUmVxdWlyZXNQcmlzb25LZXkoKTogYm9vbGVhbiB7XG4gIC8vICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIC8vIH1cbiAgLy8gc2VhbGVkQ2F2ZVJlcXVpcmVzV2luZG1pbGwoKTogYm9vbGVhbiB7XG4gIC8vICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIC8vIH1cblxuICBjb25uZWN0TGltZVRyZWVUb0xlYWYoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5NYXBzLCAnIScpO1xuICB9XG4gIC8vIGNvbm5lY3RHb2FUb0xlYWYoKSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuY2hlY2soJ1hlJykgJiYgdGhpcy5jaGVjaygnWGcnKTtcbiAgLy8gfVxuICAvLyByZW1vdmVFYXJseVdhbGwoKSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuY2hlY2soJ1hiJyk7XG4gIC8vIH1cbiAgYWRkRWFzdENhdmUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5NYXBzLCBmYWxzZSk7XG4gIH1cbiAgZm9nTGFtcE5vdFJlcXVpcmVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuVmFuaWxsYURvbHBoaW4sIGZhbHNlKTtcbiAgfVxuICBzdG9yeU1vZGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5TdG9yeU1vZGUpO1xuICB9XG4gIG5vQm93TW9kZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk5vQm93TW9kZSk7XG4gIH1cbiAgcmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5WYW5pbGxhRG9scGhpbik7XG4gIH1cbiAgc2FoYXJhUmFiYml0c1JlcXVpcmVUZWxlcGF0aHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JyJyk7XG4gIH1cbiAgdGVsZXBvcnRPblRodW5kZXJTd29yZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgZmFsc2UsICchJyk7XG4gIH1cbiAgcmFuZG9taXplVGh1bmRlclRlbGVwb3J0KCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLCBmYWxzZSk7XG4gIH1cbiAgb3Jic09wdGlvbmFsKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkKTtcbiAgfVxuXG4gIHNodWZmbGVHb2FGbG9vcnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuU2h1ZmZsZUdvYUZsb29ycyk7XG4gIH1cbiAgc2h1ZmZsZUhvdXNlcygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5TaHVmZmxlSG91c2VzKTtcbiAgfVxuICBzaHVmZmxlQXJlYXMoKSB7XG4gICAgLy8gVE9ETzogY29uc2lkZXIgbXVsdGlwbGUgbGV2ZWxzIG9mIHNodWZmbGU/XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuU2h1ZmZsZUFyZWFzKTtcbiAgfVxuICByYW5kb21pemVNYXBzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZU1hcHMpO1xuICB9XG4gIHJhbmRvbWl6ZVRyYWRlcygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVUcmFkZXMpO1xuICB9XG4gIHVuaWRlbnRpZmllZEl0ZW1zKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zKTtcbiAgfVxuICByYW5kb21pemVXYWxscygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMpO1xuICB9XG5cbiAgZ3VhcmFudGVlU3dvcmQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuR3VhcmFudGVlU3RhcnRpbmdTd29yZCk7XG4gIH1cbiAgZ3VhcmFudGVlU3dvcmRNYWdpYygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsIGZhbHNlKTtcbiAgfVxuICBndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE5vR3VhcmFudGVlcy5NYXRjaGluZ1N3b3JkLCBmYWxzZSk7XG4gIH1cbiAgZ3VhcmFudGVlR2FzTWFzaygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhOb0d1YXJhbnRlZXMuR2FzTWFzaywgZmFsc2UpO1xuICB9XG4gIGd1YXJhbnRlZUJhcnJpZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTm9HdWFyYW50ZWVzLkJhcnJpZXIsIGZhbHNlKTtcbiAgfVxuICBndWFyYW50ZWVSZWZyZXNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLkd1YXJhbnRlZVJlZnJlc2gpO1xuICB9XG5cbiAgZGlzYWJsZVN3b3JkQ2hhcmdlR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN3b3JkQ2hhcmdlR2xpdGNoLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVRlbGVwb3J0U2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVJhYmJpdFNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVTaG9wR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuU2hvcHMsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlU3RhdHVlR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN0YXR1ZUdsaXRjaCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVSYWdlU2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5SYWdlU2tpcCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVUcmlnZ2VyR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlRyaWdnZXJTa2lwLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZUZsaWdodFN0YXR1ZVNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3RhdHVlR2F1bnRsZXRTa2lwLCBmYWxzZSk7XG4gIH1cblxuICBhc3N1bWVTd29yZENoYXJnZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5Td29yZENoYXJnZUdsaXRjaCk7XG4gIH1cbiAgYXNzdW1lR2hldHRvRmxpZ2h0KCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLkdoZXR0b0ZsaWdodCk7XG4gIH1cbiAgYXNzdW1lVGVsZXBvcnRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXApO1xuICB9XG4gIGFzc3VtZVJhYmJpdFNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCk7XG4gIH1cbiAgYXNzdW1lU3RhdHVlR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN0YXR1ZUdsaXRjaCk7XG4gIH1cbiAgYXNzdW1lVHJpZ2dlckdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5UcmlnZ2VyU2tpcCk7XG4gIH1cbiAgYXNzdW1lRmxpZ2h0U3RhdHVlU2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5TdGF0dWVHYXVudGxldFNraXApO1xuICB9XG4gIGFzc3VtZVdpbGRXYXJwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuV2lsZFdhcnAsIHRydWUpIHx8XG4gICAgICAgIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplV2lsZFdhcnApO1xuICB9XG4gIGFzc3VtZVJhZ2VTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlJhZ2VTa2lwKTtcbiAgfVxuXG4gIG5lcmZXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLldpbGRXYXJwLCBmYWxzZSkgJiZcbiAgICAgICAgdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVXaWxkV2FycCwgZmFsc2UpO1xuICB9XG4gIGFsbG93V2lsZFdhcnAoKSB7XG4gICAgcmV0dXJuICF0aGlzLm5lcmZXaWxkV2FycCgpO1xuICB9XG4gIHJhbmRvbWl6ZVdpbGRXYXJwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwLCB0cnVlKTtcbiAgfVxuXG4gIGJsYWNrb3V0TW9kZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5CbGFja291dCk7XG4gIH1cbiAgaGFyZGNvcmVNb2RlKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLlBlcm1hZGVhdGgpO1xuICB9XG4gIGJ1ZmZEeW5hKCkge1xuICAgIHJldHVybiAhdGhpcy5jaGVjayhWYW5pbGxhLkR5bmEpO1xuICB9XG4gIG1heFNjYWxpbmdJblRvd2VyKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyKTtcbiAgfVxuXG4gIGV4cFNjYWxpbmdGYWN0b3IoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuRXhwZXJpZW5jZVNjYWxlc1Nsb3dlcikgPyAwLjI1IDpcbiAgICAgICAgdGhpcy5jaGVjayhFYXN5TW9kZS5FeHBlcmllbmNlU2NhbGVzRmFzdGVyKSA/IDIuNSA6IDE7XG4gIH1cblxuICAvLyBPUFRJT05BTCBGTEFHU1xuICBhdXRvRXF1aXBCcmFjZWxldChwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHBhc3MgPT09ICdlYXJseScgfHwgdGhpcy5jaGVjayhRdWFsaXR5Lk5vQXV0b0VxdWlwLCBmYWxzZSk7XG4gIH1cbiAgY29udHJvbGxlclNob3J0Y3V0cyhwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHBhc3MgPT09ICdlYXJseScgfHwgdGhpcy5jaGVjayhRdWFsaXR5Lk5vQ29udHJvbGxlclNob3J0Y3V0cywgZmFsc2UpO1xuICB9XG4gIHJhbmRvbWl6ZU11c2ljKHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhBZXN0aGV0aWNzLlJhbmRvbWl6ZU11c2ljLCBwYXNzID09PSAnZWFybHknID8gJyEnIDogdHJ1ZSk7XG4gIH1cbiAgc2h1ZmZsZVRpbGVQYWxldHRlcyhwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soQWVzdGhldGljcy5SYW5kb21pemVNYXBDb2xvcnMsXG4gICAgICAgICAgICAgICAgICAgICAgcGFzcyA9PT0gJ2Vhcmx5JyA/ICchJyA6IHRydWUpO1xuICB9XG4gIG5vTXVzaWMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBwYXNzID09PSAnbGF0ZScgJiYgdGhpcy5jaGVjayhBZXN0aGV0aWNzLk5vTXVzaWMpO1xuICB9XG59XG4iXX0=