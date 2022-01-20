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
    name: 'Shuffle areas',
    text: `Shuffles some or all area connections.`,
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
    shouldColorSwordElements() {
        return true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3NldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy9mbGFnc2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBZ0JqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUU3RCxNQUFNLE9BQU8sSUFBSTtJQU9mLFlBQXFCLElBQVksRUFBVyxJQUFjO1FBQXJDLFNBQUksR0FBSixJQUFJLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFVO1FBQ3hELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBTkQsTUFBTSxDQUFDLEdBQUc7UUFDUixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQzs7QUFKZSxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7QUFXbEQsTUFBTSxPQUFPLE1BQU07SUFTakIsWUFBWSxNQUFlLEVBQ04sSUFBWSxFQUNaLFdBQW1CLEVBQzVCLEtBQWdEO1FBRnZDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUV0QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0Qs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QUFDLENBQUM7WUFDdkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUdELGlCQUFpQixDQUFDLElBQXNCO1FBQ3RDLE9BQU8sSUFBSSxLQUFLLE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUNELG1CQUFtQixDQUFDLElBQXNCO1FBQ3hDLE9BQU8sSUFBSSxLQUFLLE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBQ0QsY0FBYyxDQUFDLElBQXNCO1FBQ25DLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLElBQUksS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUUsQ0FBQztJQUNELG1CQUFtQixDQUFDLElBQXNCO1FBQ3hDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsa0JBQWtCLEVBQzdCLElBQUksS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUNELE9BQU8sQ0FBQyxJQUFzQjtRQUM1QixPQUFPLElBQUksS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVELHdCQUF3QjtRQUN0QixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7VXNhZ2VFcnJvciwgRGVmYXVsdE1hcH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuL3JhbmRvbS5qcyc7XG5cbmludGVyZmFjZSBGbGFnT3B0cyB7XG4gIG5hbWU6IHN0cmluZztcbiAgdGV4dD86IHN0cmluZztcbiAgZXhjbHVkZXM/OiBzdHJpbmdbXTtcbiAgaGFyZD86IGJvb2xlYW47XG4gIG9wdGlvbmFsPzogKG1vZGU6IE1vZGUpID0+IE1vZGU7XG4gIC8vIEFsbCBmbGFncyBoYXZlIG1vZGVzIGZhbHNlIGFuZCB0cnVlLiAgQWRkaXRpb25hbCBtb2RlcyBtYXkgYmVcbiAgLy8gc3BlY2lmaWVkIGFzIGNoYXJhY3RlcnMgaW4gdGhpcyBzdHJpbmcgKGUuZy4gJyEnKS5cbiAgbW9kZXM/OiBzdHJpbmc7XG59XG5cbnR5cGUgTW9kZSA9IGJvb2xlYW58c3RyaW5nO1xuXG5jb25zdCBPUFRJT05BTCA9IChtb2RlOiBNb2RlKSA9PiAnJztcbmNvbnN0IE5PX0JBTkcgPSAobW9kZTogTW9kZSkgPT4gbW9kZSA9PT0gdHJ1ZSA/IGZhbHNlIDogbW9kZTtcblxuZXhwb3J0IGNsYXNzIEZsYWcge1xuICBzdGF0aWMgcmVhZG9ubHkgZmxhZ3MgPSBuZXcgTWFwPHN0cmluZywgRmxhZz4oKTtcblxuICBzdGF0aWMgYWxsKCk6IEZsYWdbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLmZsYWdzLnZhbHVlcygpXTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGZsYWc6IHN0cmluZywgcmVhZG9ubHkgb3B0czogRmxhZ09wdHMpIHtcbiAgICBGbGFnLmZsYWdzLnNldChmbGFnLCB0aGlzKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUHJlc2V0IHtcbiAgc3RhdGljIGFsbCgpOiBQcmVzZXRbXSB7XG4gICAgaWYgKCFQcmVzZXRzLmluc3RhbmNlKSBQcmVzZXRzLmluc3RhbmNlID0gbmV3IFByZXNldHMoKTtcbiAgICByZXR1cm4gWy4uLlByZXNldHMuaW5zdGFuY2UucHJlc2V0cy52YWx1ZXMoKV07XG4gIH1cblxuICBwcml2YXRlIF9mbGFnU3RyaW5nPzogc3RyaW5nO1xuXG4gIHJlYWRvbmx5IGZsYWdzOiBSZWFkb25seUFycmF5PHJlYWRvbmx5IFtGbGFnLCBNb2RlXT47XG4gIGNvbnN0cnVjdG9yKHBhcmVudDogUHJlc2V0cywgLy8gTk9URTogaW1wb3NzaWJsZSB0byBnZXQgYW4gaW5zdGFuY2Ugb3V0c2lkZVxuICAgICAgICAgICAgICByZWFkb25seSBuYW1lOiBzdHJpbmcsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGRlc2NyaXB0aW9uOiBzdHJpbmcsXG4gICAgICAgICAgICAgIGZsYWdzOiBSZWFkb25seUFycmF5PEZsYWd8cmVhZG9ubHkgW0ZsYWcsIE1vZGVdPikge1xuICAgIHRoaXMuZmxhZ3MgPSBmbGFncy5tYXAoZiA9PiBmIGluc3RhbmNlb2YgRmxhZyA/IFtmLCB0cnVlXSA6IGYpO1xuICAgIHBhcmVudC5wcmVzZXRzLnNldChtYXBQcmVzZXROYW1lKG5hbWUpLCB0aGlzKTtcbiAgfVxuXG4gIGdldCBmbGFnU3RyaW5nKCkge1xuICAgIGlmICh0aGlzLl9mbGFnU3RyaW5nID09IG51bGwpIHtcbiAgICAgIHRoaXMuX2ZsYWdTdHJpbmcgPSBTdHJpbmcobmV3IEZsYWdTZXQoYEAke3RoaXMubmFtZX1gKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9mbGFnU3RyaW5nO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1hcFByZXNldE5hbWUobmFtZTogc3RyaW5nKSB7XG4gIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW15hLXpdL2csICcnKTtcbn1cblxuLy8gTk9UIEVYUE9SVEVEIVxuY2xhc3MgUHJlc2V0cyB7XG4gIHN0YXRpYyBpbnN0YW5jZTogUHJlc2V0cyB8IHVuZGVmaW5lZDtcbiAgcmVhZG9ubHkgcHJlc2V0cyA9IG5ldyBNYXA8c3RyaW5nLCBQcmVzZXQ+KCk7XG5cbiAgc3RhdGljIGdldChuYW1lOiBzdHJpbmcpOiBQcmVzZXQgfCB1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5pbnN0YW5jZSkgdGhpcy5pbnN0YW5jZSA9IG5ldyBQcmVzZXRzKCk7XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFuY2UucHJlc2V0cy5nZXQobWFwUHJlc2V0TmFtZShuYW1lKSk7XG4gIH1cblxuICByZWFkb25seSBDYXN1YWwgPSBuZXcgUHJlc2V0KHRoaXMsICdDYXN1YWwnLCBgXG4gICAgICBCYXNpYyBmbGFncyBmb3IgYSByZWxhdGl2ZWx5IGVhc3kgcGxheXRocm91Z2guICBUaGlzIGlzIGEgZ29vZFxuICAgICAgcGxhY2UgdG8gc3RhcnQuYCwgW1xuICAgICAgICBFYXN5TW9kZS5QcmVzZXJ2ZVVuaXF1ZUNoZWNrcyxcbiAgICAgICAgRWFzeU1vZGUuTm9TaHVmZmxlTWltaWNzLFxuICAgICAgICBFYXN5TW9kZS5EZWNyZWFzZUVuZW15RGFtYWdlLFxuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVSZWZyZXNoLFxuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVTdGFydGluZ1N3b3JkLFxuICAgICAgICBFYXN5TW9kZS5FeHBlcmllbmNlU2NhbGVzRmFzdGVyLFxuICAgICAgICBSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCxcbiAgICAgICAgVmFuaWxsYS5TaG9wcyxcbiAgICAgICAgVmFuaWxsYS5EeW5hLFxuICAgICAgICBbVmFuaWxsYS5NYXBzLCAnISddLFxuICAgICAgICBbVmFuaWxsYS5XaWxkV2FycCwgJyEnXSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBDbGFzc2ljID0gbmV3IFByZXNldCh0aGlzLCAnQ2xhc3NpYycsIGBcbiAgICAgIFByb3ZpZGVzIGEgcmVsYXRpdmVseSBxdWljayBwbGF5dGhvdWdoIHdpdGggYSByZWFzb25hYmxlIGFtb3VudCBvZlxuICAgICAgY2hhbGxlbmdlLiAgU2ltaWxhciB0byBvbGRlciB2ZXJzaW9ucy5gLCBbXG4gICAgICAgIEVhc3lNb2RlLkd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQsXG4gICAgICAgIEdsaXRjaGVzLlN0YXR1ZUdsaXRjaCxcbiAgICAgICAgW1JvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLCAnISddLFxuICAgICAgICBbVmFuaWxsYS5NYXBzLCAnISddLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IFN0YW5kYXJkID0gbmV3IFByZXNldCh0aGlzLCAnU3RhbmRhcmQnLCBgXG4gICAgICBXZWxsLWJhbGFuY2VkLCBzdGFuZGFyZCByYWNlIGZsYWdzLmAsIFtcbiAgICAgICAgLy8gbm8gZmxhZ3M/ICBhbGwgZGVmYXVsdD9cbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgTm9Cb3dNb2RlID0gbmV3IFByZXNldCh0aGlzLCAnTm8gQm93IE1vZGUnLCBgXG4gICAgICBUaGUgdG93ZXIgaXMgb3BlbiBmcm9tIHRoZSBzdGFydCwgYXMgc29vbiBhcyB5b3UncmUgcmVhZHkgZm9yIGl0LmAsIFtcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyLFxuICAgICAgICBSb3V0aW5nLk5vQm93TW9kZSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBBZHZhbmNlZCA9IG5ldyBQcmVzZXQodGhpcywgJ0FkdmFuY2VkJywgYFxuICAgICAgQSBiYWxhbmNlZCByYW5kb21pemF0aW9uIHdpdGggcXVpdGUgYSBiaXQgbW9yZSBkaWZmaWN1bHR5LmAsIFtcbiAgICAgICAgR2xpdGNoZXMuR2hldHRvRmxpZ2h0LFxuICAgICAgICBHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwLFxuICAgICAgICBHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsXG4gICAgICAgIFtHbGl0Y2hlcy5Td29yZENoYXJnZUdsaXRjaCwgJyEnXSxcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhcnJpZXIsXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXR0bGVNYWdpYyxcbiAgICAgICAgTm9HdWFyYW50ZWVzLkdhc01hc2ssXG4gICAgICAgIEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyLFxuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBNb25zdGVycy5Ub3dlclJvYm90cyxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVNYXBzLFxuICAgICAgICBXb3JsZC5TaHVmZmxlQXJlYXMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVIb3VzZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVRyYWRlcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzLFxuICAgICAgICBXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcyxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBXaWxkV2FycCA9IG5ldyBQcmVzZXQodGhpcywgJ1dpbGQgV2FycCcsIGBcbiAgICAgIFNpZ25pZmljYW50bHkgb3BlbnMgdXAgdGhlIGdhbWUgcmlnaHQgZnJvbSB0aGUgc3RhcnQgd2l0aCB3aWxkXG4gICAgICB3YXJwIGluIGxvZ2ljLmAsIFtcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlUmVmcmVzaCxcbiAgICAgICAgV29ybGQuUmFuZG9taXplV2lsZFdhcnAsXG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIE1vbnN0ZXJzLlRvd2VyUm9ib3RzLFxuICAgICAgICBSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgSGFyZGNvcmUgPSBuZXcgUHJlc2V0KHRoaXMsICdIYXJkY29yZScsIGBcbiAgICAgIE5vdCBmb3IgdGhlIGZhaW50IG9mIGhlYXJ0LiAgR29vZCBsdWNrLmAsIFtcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhcnJpZXIsXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXR0bGVNYWdpYyxcbiAgICAgICAgSGFyZE1vZGUuRXhwZXJpZW5jZVNjYWxlc1Nsb3dlcixcbiAgICAgICAgSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIsXG4gICAgICAgIEhhcmRNb2RlLlBlcm1hZGVhdGgsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgV29ybGQuUmFuZG9taXplTWFwcyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUFyZWFzLFxuICAgICAgICBXb3JsZC5TaHVmZmxlSG91c2VzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVUcmFkZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyxcbiAgICAgICAgV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsXG4gICAgICBdKTtcblxuICByZWFkb25seSBGdWxsU3R1cGlkID0gbmV3IFByZXNldCh0aGlzLCAnVGhlIEZ1bGwgU3R1cGlkJywgYFxuICAgICAgT25seSBUaGVBeGVNYW4gaGFzIGV2ZXIgY29tcGxldGVkIHRoaXMuICBCZSBzdXJlIHRvIHJlY29yZCB0aGlzIGJlY2F1c2VcbiAgICAgIHBpY3Mgb3IgaXQgZGlkbid0IGhhcHBlbi5gLCBbIFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmFycmllcixcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLFxuICAgICAgICBIYXJkTW9kZS5CbGFja291dCxcbiAgICAgICAgSGFyZE1vZGUuRXhwZXJpZW5jZVNjYWxlc1Nsb3dlcixcbiAgICAgICAgSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIsXG4gICAgICAgIEhhcmRNb2RlLlBlcm1hZGVhdGgsXG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIE1vbnN0ZXJzLlRvd2VyUm9ib3RzLFxuICAgICAgICBSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZU1hcHMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVBcmVhcyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUhvdXNlcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplVHJhZGVzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVHb2FGbG9vcnMsXG4gICAgICAgIFdvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgTXlzdGVyeSA9IG5ldyBQcmVzZXQodGhpcywgJ015c3RlcnknLCBgXG4gICAgICBFdmVuIHRoZSBvcHRpb25zIGFyZSByYW5kb20uYCwgW1xuICAgICAgICBbV29ybGQuU2h1ZmZsZUFyZWFzLCAnPyddLFxuICAgICAgICBbV29ybGQuU2h1ZmZsZUhvdXNlcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZU1hcHMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVUcmFkZXMsICc/J10sXG4gICAgICAgIFtXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlNodWZmbGVHb2FGbG9vcnMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVTcHJpdGVDb2xvcnMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVXaWxkV2FycCwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuT3Jic05vdFJlcXVpcmVkLCAnPyddLFxuICAgICAgICBbUm91dGluZy5Ob0Jvd01vZGUsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLlN0b3J5TW9kZSwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuVmFuaWxsYURvbHBoaW4sICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlJhZ2VTa2lwLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuVHJpZ2dlclNraXAsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5HaGV0dG9GbGlnaHQsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5Td29yZENoYXJnZUdsaXRjaCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsICc/J10sXG4gICAgICAgIFtBZXN0aGV0aWNzLlJhbmRvbWl6ZU11c2ljLCAnPyddLFxuICAgICAgICBbQWVzdGhldGljcy5SYW5kb21pemVNYXBDb2xvcnMsICc/J10sXG4gICAgICAgIFtNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLCAnPyddLFxuICAgICAgICBbTW9uc3RlcnMuVG93ZXJSb2JvdHMsICc/J10sXG4gICAgICAgIFtFYXN5TW9kZS5Ob1NodWZmbGVNaW1pY3MsICc/J10sXG4gICAgICAgIFtFYXN5TW9kZS5QcmVzZXJ2ZVVuaXF1ZUNoZWNrcywgJz8nXSxcbiAgICAgICAgW05vR3VhcmFudGVlcy5CYXJyaWVyLCAnPyddLFxuICAgICAgICBbTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLCAnPyddLFxuICAgICAgICBbTm9HdWFyYW50ZWVzLkdhc01hc2ssICc/J10sXG4gICAgICAgIFtWYW5pbGxhLkR5bmEsICc/J10sXG4gICAgICAgIFtWYW5pbGxhLkJvbnVzSXRlbXMsICc/J10sXG4gICAgICAgIFtWYW5pbGxhLk1hcHMsICc/J10sXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBGbGFnU2VjdGlvbiB7XG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlOiBGbGFnU2VjdGlvbjtcbiAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgc2VjdGlvbnMgPSBuZXcgU2V0PEZsYWdTZWN0aW9uPigpO1xuXG4gIHN0YXRpYyBhbGwoKTogRmxhZ1NlY3Rpb25bXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLnNlY3Rpb25zXTtcbiAgfVxuXG4gIHByb3RlY3RlZCBzdGF0aWMgZmxhZyhuYW1lOiBzdHJpbmcsIG9wdHM6IGFueSk6IEZsYWcge1xuICAgIEZsYWdTZWN0aW9uLnNlY3Rpb25zLmFkZChcbiAgICAgICAgdGhpcy5pbnN0YW5jZSB8fCAodGhpcy5pbnN0YW5jZSA9IG5ldyAodGhpcyBhcyBhbnkpKCkpKTtcbiAgICBjb25zdCBmbGFnID0gbmV3IEZsYWcobmFtZSwgb3B0cyk7XG4gICAgaWYgKCFuYW1lLnN0YXJ0c1dpdGgodGhpcy5pbnN0YW5jZS5wcmVmaXgpKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCBmbGFnYCk7XG4gICAgdGhpcy5pbnN0YW5jZS5mbGFncy5zZXQobmFtZSwgZmxhZyk7XG4gICAgcmV0dXJuIGZsYWc7XG4gIH1cblxuICBhYnN0cmFjdCByZWFkb25seSBwcmVmaXg6IHN0cmluZztcbiAgYWJzdHJhY3QgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICByZWFkb25seSBkZXNjcmlwdGlvbj86IHN0cmluZztcbiAgcmVhZG9ubHkgZmxhZ3MgPSBuZXcgTWFwPHN0cmluZywgRmxhZz4oKTtcbn1cblxuY2xhc3MgV29ybGQgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdXJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdXb3JsZCc7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZU1hcHMgPSBXb3JsZC5mbGFnKCdXbScsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIG1hcHMnLFxuICAgIHRleHQ6IGBJbmRpdmlkdWFsIG1hcHMgYXJlIHJhbmRvbWl6ZWQuICBGb3Igbm93IHRoaXMgaXMgb25seSBhIHN1YnNldCBvZlxuICAgICAgICAgICBwb3NzaWJsZSBtYXBzLiAgQSByYW5kb21pemVkIG1hcCB3aWxsIGhhdmUgYWxsIHRoZSBzYW1lIGZlYXR1cmVzXG4gICAgICAgICAgIChleGl0cywgY2hlc3RzLCBOUENzLCBldGMpIGV4Y2VwdCB0aGluZ3MgYXJlIG1vdmVkIGFyb3VuZC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTaHVmZmxlQXJlYXMgPSBXb3JsZC5mbGFnKCdXYScsIHtcbiAgICBuYW1lOiAnU2h1ZmZsZSBhcmVhcycsXG4gICAgdGV4dDogYFNodWZmbGVzIHNvbWUgb3IgYWxsIGFyZWEgY29ubmVjdGlvbnMuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU2h1ZmZsZUhvdXNlcyA9IFdvcmxkLmZsYWcoJ1doJywge1xuICAgIG5hbWU6ICdTaHVmZmxlIGhvdXNlIGVudHJhbmNlcycsXG4gICAgdGV4dDogYFNodWZmbGVzIGFsbCB0aGUgaG91c2UgZW50cmFuY2VzLCBhcyB3ZWxsIGFzIGEgaGFuZGZ1bCBvZiBvdGhlclxuICAgICAgICAgICB0aGluZ3MsIGxpa2UgdGhlIHBhbGFjZS9mb3J0cmVzcy10eXBlIGVudHJhbmNlcyBhdCB0aGUgdG9wIG9mXG4gICAgICAgICAgIHNldmVyYWwgdG93bnMsIGFuZCBzdGFuZGFsb25lIGhvdXNlcy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVUcmFkZXMgPSBXb3JsZC5mbGFnKCdXdCcsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIHRyYWRlLWluIGl0ZW1zJyxcbiAgICB0ZXh0OiBgSXRlbXMgZXhwZWN0ZWQgYnkgdmFyaW91cyBOUENzIHdpbGwgYmUgc2h1ZmZsZWQ6IHNwZWNpZmljYWxseSxcbiAgICAgICAgICAgU3RhdHVlIG9mIE9ueXgsIEtpcmlzYSBQbGFudCwgTG92ZSBQZW5kYW50LCBJdm9yeSBTdGF0dWUsIEZvZ1xuICAgICAgICAgICBMYW1wLCBhbmQgRmx1dGUgb2YgTGltZSAoZm9yIEFrYWhhbmEpLiAgUmFnZSB3aWxsIGV4cGVjdCBhXG4gICAgICAgICAgIHJhbmRvbSBzd29yZCwgYW5kIFRvcm5lbCB3aWxsIGV4cGVjdCBhIHJhbmRvbSBicmFjZWxldC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBVbmlkZW50aWZpZWRLZXlJdGVtcyA9IFdvcmxkLmZsYWcoJ1d1Jywge1xuICAgIG5hbWU6ICdVbmlkZW50aWZpZWQga2V5IGl0ZW1zJyxcbiAgICB0ZXh0OiBgSXRlbSBuYW1lcyB3aWxsIGJlIGdlbmVyaWMgYW5kIGVmZmVjdHMgd2lsbCBiZSBzaHVmZmxlZC4gIFRoaXNcbiAgICAgICAgICAgaW5jbHVkZXMga2V5cywgZmx1dGVzLCBsYW1wcywgYW5kIHN0YXR1ZXMuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplV2FsbEVsZW1lbnRzID0gV29ybGQuZmxhZygnV2UnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBlbGVtZW50cyB0byBicmVhayB3YWxscycsXG4gICAgdGV4dDogYFdhbGxzIHdpbGwgcmVxdWlyZSBhIHJhbmRvbWl6ZWQgZWxlbWVudCB0byBicmVhay4gIE5vcm1hbCByb2NrIGFuZFxuICAgICAgICAgICBpY2Ugd2FsbHMgd2lsbCBpbmRpY2F0ZSB0aGUgcmVxdWlyZWQgZWxlbWVudCBieSB0aGUgY29sb3IgKGxpZ2h0XG4gICAgICAgICAgIGdyZXkgb3IgeWVsbG93IGZvciB3aW5kLCBibHVlIGZvciBmaXJlLCBicmlnaHQgb3JhbmdlIChcImVtYmVyc1wiKSBmb3JcbiAgICAgICAgICAgd2F0ZXIsIG9yIGRhcmsgZ3JleSAoXCJzdGVlbFwiKSBmb3IgdGh1bmRlci4gIFRoZSBlbGVtZW50IHRvIGJyZWFrXG4gICAgICAgICAgIHRoZXNlIHdhbGxzIGlzIHRoZSBzYW1lIHRocm91Z2hvdXQgYW4gYXJlYS4gIElyb24gd2FsbHMgcmVxdWlyZSBhXG4gICAgICAgICAgIG9uZS1vZmYgcmFuZG9tIGVsZW1lbnQsIHdpdGggbm8gdmlzdWFsIGN1ZSwgYW5kIHR3byB3YWxscyBpbiB0aGVcbiAgICAgICAgICAgc2FtZSBhcmVhIG1heSBoYXZlIGRpZmZlcmVudCByZXF1aXJlbWVudHMuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNodWZmbGVHb2FGbG9vcnMgPSBXb3JsZC5mbGFnKCdXZycsIHtcbiAgICBuYW1lOiAnU2h1ZmZsZSBHb2EgZm9ydHJlc3MgZmxvb3JzJyxcbiAgICAvLyBUT0RPIC0gc2h1ZmZsZSB0aGUgYXJlYS10by1ib3NzIGNvbm5lY3Rpb25zLCB0b28uXG4gICAgdGV4dDogYFRoZSBmb3VyIGFyZWFzIG9mIEdvYSBmb3J0cmVzcyB3aWxsIGFwcGVhciBpbiBhIHJhbmRvbSBvcmRlci5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplU3ByaXRlQ29sb3JzID0gV29ybGQuZmxhZygnV3MnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBzcHJpdGUgY29sb3JzJyxcbiAgICB0ZXh0OiBgTW9uc3RlcnMgYW5kIE5QQ3Mgd2lsbCBoYXZlIGRpZmZlcmVudCBjb2xvcnMuICBUaGlzIGlzIG5vdCBhblxuICAgICAgICAgICBvcHRpb25hbCBmbGFnIGJlY2F1c2UgaXQgYWZmZWN0cyB3aGF0IG1vbnN0ZXJzIGNhbiBiZSBncm91cGVkXG4gICAgICAgICAgIHRvZ2V0aGVyLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVXaWxkV2FycCA9IFdvcmxkLmZsYWcoJ1d3Jywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgd2lsZCB3YXJwJyxcbiAgICB0ZXh0OiBgV2lsZCB3YXJwIHdpbGwgZ28gdG8gTWV6YW1lIFNocmluZSBhbmQgMTUgb3RoZXIgcmFuZG9tIGxvY2F0aW9ucy5cbiAgICAgICAgICAgVGhlc2UgbG9jYXRpb25zIHdpbGwgYmUgY29uc2lkZXJlZCBpbi1sb2dpYy5gLFxuICAgIGV4Y2x1ZGVzOiBbJ1Z3J10sXG4gIH0pO1xufVxuXG5jbGFzcyBSb3V0aW5nIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnUic7XG4gIHJlYWRvbmx5IG5hbWUgPSAnUm91dGluZyc7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFN0b3J5TW9kZSA9IFJvdXRpbmcuZmxhZygnUnMnLCB7XG4gICAgbmFtZTogJ1N0b3J5IE1vZGUnLFxuICAgIHRleHQ6IGBEcmF5Z29uIDIgd29uJ3Qgc3Bhd24gdW5sZXNzIHlvdSBoYXZlIGFsbCBmb3VyIHN3b3JkcyBhbmQgaGF2ZVxuICAgICAgICAgICBkZWZlYXRlZCBhbGwgbWFqb3IgYm9zc2VzIG9mIHRoZSB0ZXRyYXJjaHkuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vQm93TW9kZSA9IFJvdXRpbmcuZmxhZygnUmInLCB7XG4gICAgbmFtZTogJ05vIEJvdyBtb2RlJyxcbiAgICB0ZXh0OiBgTm8gaXRlbXMgYXJlIHJlcXVpcmVkIHRvIGZpbmlzaCB0aGUgZ2FtZS4gIEFuIGV4aXQgaXMgYWRkZWQgZnJvbVxuICAgICAgICAgICBNZXphbWUgc2hyaW5lIGRpcmVjdGx5IHRvIHRoZSBEcmF5Z29uIDIgZmlnaHQgKGFuZCB0aGUgbm9ybWFsIGVudHJhbmNlXG4gICAgICAgICAgIGlzIHJlbW92ZWQpLiAgRHJheWdvbiAyIHNwYXducyBhdXRvbWF0aWNhbGx5IHdpdGggbm8gQm93IG9mIFRydXRoLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBPcmJzTm90UmVxdWlyZWQgPSBSb3V0aW5nLmZsYWcoJ1JvJywge1xuICAgIG5hbWU6ICdPcmJzIG5vdCByZXF1aXJlZCB0byBicmVhayB3YWxscycsXG4gICAgdGV4dDogYFdhbGxzIGNhbiBiZSBicm9rZW4gYW5kIGJyaWRnZXMgZm9ybWVkIHdpdGggbGV2ZWwgMSBzaG90cy5gXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb1RodW5kZXJTd29yZFdhcnAgPSBSb3V0aW5nLmZsYWcoJ1J0Jywge1xuICAgIG5hbWU6ICdObyBTd29yZCBvZiBUaHVuZGVyIHdhcnAnLFxuICAgIHRleHQ6IGBOb3JtYWxseSB3aGVuIGFjcXVpcmluZyB0aGUgdGh1bmRlciBzd29yZCwgdGhlIHBsYXllciBpcyBpbnN0YW50bHlcbiAgICAgICAgICAgd2FycGVkIHRvIGEgcmFuZG9tIHRvd24uICBUaGlzIGZsYWcgZGlzYWJsZXMgdGhlIHdhcnAuICBJZiBzZXQgYXNcbiAgICAgICAgICAgXCJSIXRcIiwgdGhlbiB0aGUgd2FycCB3aWxsIGFsd2F5cyBnbyB0byBTaHlyb24sIGxpa2UgaW4gdmFuaWxsYS5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBWYW5pbGxhRG9scGhpbiA9IFJvdXRpbmcuZmxhZygnUmQnLCB7XG4gICAgbmFtZTogJ1ZhbmlsbGEgRG9scGhpbiBpbnRlcmFjdGlvbnMnLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB0aGUgcmFuZG9taXplciBjaGFuZ2VzIGEgbnVtYmVyIG9mIGRvbHBoaW4gYW5kIGJvYXRcbiAgICAgICAgICAgaW50ZXJhY3Rpb25zOiAoMSkgaGVhbGluZyB0aGUgZG9scGhpbiBhbmQgaGF2aW5nIHRoZSBTaGVsbCBGbHV0ZVxuICAgICAgICAgICBpcyBubyBsb25nZXIgcmVxdWlyZWQgYmVmb3JlIHRoZSBmaXNoZXJtYW4gc3Bhd25zOiBpbnN0ZWFkLCBoZVxuICAgICAgICAgICB3aWxsIHNwYXduIGFzIHNvb24gYXMgeW91IGhhdmUgdGhlIGl0ZW0gaGUgd2FudHM7ICgyKSB0YWxraW5nIHRvXG4gICAgICAgICAgIEtlbnN1IGluIHRoZSBiZWFjaCBjYWJpbiBpcyBubyBsb25nZXIgcmVxdWlyZWQgZm9yIHRoZSBTaGVsbCBGbHV0ZVxuICAgICAgICAgICB0byB3b3JrOiBpbnN0ZWFkLCB0aGUgU2hlbGwgRmx1dGUgd2lsbCBhbHdheXMgd29yaywgYW5kIEtlbnN1IHdpbGxcbiAgICAgICAgICAgc3Bhd24gYWZ0ZXIgdGhlIEZvZyBMYW1wIGlzIHR1cm5lZCBpbiBhbmQgd2lsbCBnaXZlIGEga2V5IGl0ZW1cbiAgICAgICAgICAgY2hlY2suICBUaGlzIGZsYWcgcmVzdG9yZXMgdGhlIHZhbmlsbGEgaW50ZXJhY3Rpb24gd2hlcmUgaGVhbGluZ1xuICAgICAgICAgICBhbmQgc2hlbGwgZmx1dGUgYXJlIHJlcXVpcmVkLCBhbmQgS2Vuc3Ugbm8gbG9uZ2VyIGRyb3BzIGFuIGl0ZW0uYCxcbiAgfSk7XG59XG5cbmNsYXNzIEdsaXRjaGVzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnRyc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnR2xpdGNoZXMnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIEJ5IGRlZmF1bHQsIHRoZSByYW5kb21pemVyIGRpc2FibGVzIGFsbCBrbm93biBnbGl0Y2hlcyAoZXhjZXB0IGdoZXR0b1xuICAgICAgZmxpZ2h0KS4gIFRoZXNlIGZsYWdzIHNlbGVjdGl2ZWx5IHJlLWVuYWJsZSBjZXJ0YWluIGdsaXRjaGVzLiAgTW9zdCBvZlxuICAgICAgdGhlc2UgZmxhZ3MgaGF2ZSB0d28gbW9kZXM6IG5vcm1hbGx5IGVuYWJsaW5nIGEgZ2xpdGNoIHdpbGwgYWRkIGl0IGFzXG4gICAgICBwb3NzaWJseSByZXF1aXJlZCBieSBsb2dpYywgYnV0IGNsaWNraW5nIGEgc2Vjb25kIHRpbWUgd2lsbCBhZGQgYSAnISdcbiAgICAgIGFuZCBlbmFibGUgdGhlIGdsaXRjaCBvdXRzaWRlIG9mIGxvZ2ljIChlLmcuIFwiRyFjXCIpLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEdoZXR0b0ZsaWdodCA9IEdsaXRjaGVzLmZsYWcoJ0dmJywge1xuICAgIG5hbWU6ICdHaGV0dG8gZmxpZ2h0JyxcbiAgICB0ZXh0OiBgR2hldHRvIGZsaWdodCBhbGxvd3MgdXNpbmcgRG9scGhpbiBhbmQgUmFiYml0IEJvb3RzIHRvIGZseSB1cCB0aGVcbiAgICAgICAgICAgd2F0ZXJmYWxscyBpbiB0aGUgQW5ncnkgU2VhICh3aXRob3V0IGNhbG1pbmcgdGhlIHdoaXJscG9vbHMpLlxuICAgICAgICAgICBUaGlzIGlzIGRvbmUgYnkgc3dpbW1pbmcgdXAgdG8gYSBkaWFnb25hbCBiZWFjaCBhbmQganVtcGluZ1xuICAgICAgICAgICBpbiBhIGRpZmZlcmVudCBkaXJlY3Rpb24gaW1tZWRpYXRlbHkgYmVmb3JlIGRpc2VtYmFya2luZy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU3RhdHVlR2xpdGNoID0gR2xpdGNoZXMuZmxhZygnR3MnLCB7XG4gICAgbmFtZTogJ1N0YXR1ZSBnbGl0Y2gnLFxuICAgIHRleHQ6IGBTdGF0dWUgZ2xpdGNoIGFsbG93cyBnZXR0aW5nIGJlaGluZCBzdGF0dWVzIHRoYXQgYmxvY2sgY2VydGFpblxuICAgICAgICAgICBlbnRyYW5jZXM6IHRoZSBndWFyZHMgaW4gUG9ydG9hLCBBbWF6b25lcywgT2FrLCBHb2EsIGFuZCBTaHlyb24sXG4gICAgICAgICAgIGFzIHdlbGwgYXMgdGhlIHN0YXR1ZXMgaW4gdGhlIFdhdGVyZmFsbCBDYXZlLiAgSXQgaXMgZG9uZSBieVxuICAgICAgICAgICBhcHByb2FjaGluZyB0aGUgc3RhdHVlIGZyb20gdGhlIHRvcCByaWdodCBhbmQgaG9sZGluZyBkb3duIGFuZFxuICAgICAgICAgICBsZWZ0IG9uIHRoZSBjb250cm9sbGVyIHdoaWxlIG1hc2hpbmcgQi5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBNdFNhYnJlUmVxdWlyZW1lbnRTa2lwID0gR2xpdGNoZXMuZmxhZygnR24nLCB7XG4gICAgbmFtZTogJ010IFNhYnJlIHJlcXVpcmVtZW50cyBza2lwJyxcbiAgICB0ZXh0OiBgRW50ZXJpbmcgTXQgU2FicmUgTm9ydGggbm9ybWFsbHkgcmVxdWlyZXMgKDEpIGhhdmluZyBUZWxlcG9ydCxcbiAgICAgICAgICAgYW5kICgyKSB0YWxraW5nIHRvIHRoZSByYWJiaXQgaW4gTGVhZiBhZnRlciB0aGUgYWJkdWN0aW9uICh2aWFcbiAgICAgICAgICAgVGVsZXBhdGh5KS4gIEJvdGggb2YgdGhlc2UgcmVxdWlyZW1lbnRzIGNhbiBiZSBza2lwcGVkOiBmaXJzdCBieVxuICAgICAgICAgICBmbHlpbmcgb3ZlciB0aGUgcml2ZXIgaW4gQ29yZGVsIHBsYWluIHJhdGhlciB0aGFuIGNyb3NzaW5nIHRoZVxuICAgICAgICAgICBicmlkZ2UsIGFuZCB0aGVuIGJ5IHRocmVhZGluZyB0aGUgbmVlZGxlIGJldHdlZW4gdGhlIGhpdGJveGVzIGluXG4gICAgICAgICAgIE10IFNhYnJlIE5vcnRoLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFN0YXR1ZUdhdW50bGV0U2tpcCA9IEdsaXRjaGVzLmZsYWcoJ0dnJywge1xuICAgIG5hbWU6ICdTdGF0dWUgZ2F1bnRsZXQgc2tpcCcsXG4gICAgdGV4dDogYFRoZSBzaG9vdGluZyBzdGF0dWVzIGluIGZyb250IG9mIEdvYSBhbmQgU3R4eSBub3JtYWxseSByZXF1aXJlXG4gICAgICAgICAgIEJhcnJpZXIgdG8gcGFzcyBzYWZlbHkuICBXaXRoIHRoaXMgZmxhZywgRmxpZ2h0IGNhbiBhbHNvIGJlIHVzZWRcbiAgICAgICAgICAgYnkgZmx5aW5nIGFyb3VuZCB0aGUgZWRnZSBvZiB0aGUgc3RhdHVlLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFN3b3JkQ2hhcmdlR2xpdGNoID0gR2xpdGNoZXMuZmxhZygnR2MnLCB7XG4gICAgbmFtZTogJ1N3b3JkIGNoYXJnZSBnbGl0Y2gnLFxuICAgIHRleHQ6IGBTd29yZCBjaGFyZ2UgZ2xpdGNoIGFsbG93cyBjaGFyZ2luZyBvbmUgc3dvcmQgdG8gdGhlIGxldmVsIG9mXG4gICAgICAgICAgIGFub3RoZXIgc3dvcmQgYnkgZXF1aXBwaW5nIHRoZSBoaWdoZXItbGV2ZWwgc3dvcmQsIHJlLWVudGVyaW5nXG4gICAgICAgICAgIHRoZSBtZW51LCBjaGFuZ2luZyB0byB0aGUgbG93ZXItbGV2ZWwgc3dvcmQgd2l0aG91dCBleGl0aW5nIHRoZVxuICAgICAgICAgICBtZW51LCBjcmVhdGluZyBhIGhhcmQgc2F2ZSwgcmVzZXR0aW5nLCBhbmQgdGhlbiBjb250aW51aW5nLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVHJpZ2dlclNraXAgPSBHbGl0Y2hlcy5mbGFnKCdHdCcsIHtcbiAgICBuYW1lOiAnVHJpZ2dlciBza2lwJyxcbiAgICB0ZXh0OiBgQSB3aWRlIHZhcmlldHkgb2YgdHJpZ2dlcnMgYW5kIGV4aXQgc3F1YXJlcyBjYW4gYmUgc2tpcHBlZCBieVxuICAgICAgICAgICB1c2luZyBhbiBpbnZhbGlkIGl0ZW0gZXZlcnkgZnJhbWUgd2hpbGUgd2Fsa2luZy4gIFRoaXMgYWxsb3dzXG4gICAgICAgICAgIGJ5cGFzc2luZyBib3RoIE10IFNhYnJlIE5vcnRoIGVudHJhbmNlIHRyaWdnZXJzLCB0aGUgRXZpbCBTcGlyaXRcbiAgICAgICAgICAgSXNsYW5kIGVudHJhbmNlIHRyaWdnZXIsIHRyaWdnZXJzIGZvciBndWFyZHMgdG8gbW92ZSwgc2xvcGVzLFxuICAgICAgICAgICBkYW1hZ2UgdGlsZXMsIGFuZCBzZWFtbGVzcyBtYXAgdHJhbnNpdGlvbnMuYCxcbiAgICBoYXJkOiB0cnVlLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYWdlU2tpcCA9IEdsaXRjaGVzLmZsYWcoJ0dyJywge1xuICAgIG5hbWU6ICdSYWdlIHNraXAnLFxuICAgIHRleHQ6IGBSYWdlIGNhbiBiZSBza2lwcGVkIGJ5IGRhbWFnZS1ib29zdGluZyBkaWFnb25hbGx5IGludG8gdGhlIExpbWVcbiAgICAgICAgICAgVHJlZSBMYWtlIHNjcmVlbi4gIFRoaXMgcHJvdmlkZXMgYWNjZXNzIHRvIHRoZSBhcmVhIGJleW9uZCB0aGVcbiAgICAgICAgICAgbGFrZSBpZiBmbGlnaHQgb3IgYnJpZGdlcyBhcmUgYXZhaWxhYmxlLiAgRm9yIHNpbXBsaWNpdHksIHRoZVxuICAgICAgICAgICBsb2dpYyBvbmx5IGFzc3VtZXMgdGhpcyBpcyBwb3NzaWJsZSBpZiB0aGVyZSdzIGEgZmx5ZXIuYCxcbiAgICBoYXJkOiB0cnVlLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xufVxuXG5jbGFzcyBBZXN0aGV0aWNzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnQSc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnQWVzdGhldGljcyc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlc2UgZmxhZ3MgZG9uJ3QgZGlyZWN0bHkgYWZmZWN0IGdhbWVwbGF5IG9yIHNodWZmbGluZywgYnV0IHRoZXkgZG9cbiAgICAgIGFmZmVjdCB0aGUgZXhwZXJpZW5jZSBzaWduaWZpY2FudGx5IGVub3VnaCB0aGF0IHRoZXJlIGFyZSB0aHJlZSBtb2Rlc1xuICAgICAgZm9yIGVhY2g6IFwib2ZmXCIsIFwib3B0aW9uYWxcIiAobm8gZXhjbGFtYXRpb24gcG9pbnQpLCBhbmQgXCJyZXF1aXJlZFwiXG4gICAgICAoZXhjbGFtYXRpb24gcG9pbnQpLiAgVGhlIGZpcnN0IHR3byBhcmUgZXF1aXZhbGVudCBmb3Igc2VlZCBnZW5lcmF0aW9uXG4gICAgICBwdXJwb3Nlcywgc28gdGhhdCB5b3UgY2FuIHBsYXkgdGhlIHNhbWUgc2VlZCB3aXRoIGVpdGhlciBzZXR0aW5nLlxuICAgICAgU2V0dGluZyBpdCB0byBcIiFcIiB3aWxsIGNoYW5nZSB0aGUgc2VlZC5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVNdXNpYyA9IEFlc3RoZXRpY3MuZmxhZygnQW0nLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBiYWNrZ3JvdW5kIG11c2ljJyxcbiAgICBtb2RlczogJyEnLFxuICAgIG9wdGlvbmFsOiBOT19CQU5HLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9NdXNpYyA9IEFlc3RoZXRpY3MuZmxhZygnQXMnLCB7XG4gICAgbmFtZTogJ05vIGJhY2tncm91bmQgbXVzaWMnLFxuICAgIG9wdGlvbmFsOiBPUFRJT05BTCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZU1hcENvbG9ycyA9IEFlc3RoZXRpY3MuZmxhZygnQWMnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBtYXAgY29sb3JzJyxcbiAgICBtb2RlczogJyEnLFxuICAgIG9wdGlvbmFsOiBOT19CQU5HLFxuICB9KTtcbn1cblxuY2xhc3MgTW9uc3RlcnMgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdNJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdNb25zdGVycyc7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVdlYWtuZXNzZXMgPSBNb25zdGVycy5mbGFnKCdNZScsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIG1vbnN0ZXIgd2Vha25lc3NlcycsXG4gICAgdGV4dDogYE1vbnN0ZXIgYW5kIGJvc3MgZWxlbWVudGFsIHdlYWtuZXNzZXMgYXJlIHNodWZmbGVkLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBUb3dlclJvYm90cyA9IE1vbnN0ZXJzLmZsYWcoJ010Jywge1xuICAgIG5hbWU6ICdTaHVmZmxlIHRvd2VyIHJvYm90cycsXG4gICAgdGV4dDogYFRvd2VyIHJvYm90cyB3aWxsIGJlIHNodWZmbGVkIGludG8gdGhlIG5vcm1hbCBwb29sLiAgQXQgc29tZVxuICAgICAgICAgICBwb2ludCwgbm9ybWFsIG1vbnN0ZXJzIG1heSBiZSBzaHVmZmxlZCBpbnRvIHRoZSB0b3dlciBhcyB3ZWxsLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG59XG5cbmNsYXNzIEVhc3lNb2RlIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnRSc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnRWFzeSBNb2RlJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBUaGUgZm9sbG93aW5nIG9wdGlvbnMgbWFrZSBwYXJ0cyBvZiB0aGUgZ2FtZSBlYXNpZXIuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9TaHVmZmxlTWltaWNzID0gRWFzeU1vZGUuZmxhZygnRXQnLCB7XG4gICAgbmFtZTogYERvbid0IHNodWZmbGUgbWltaWNzLmAsXG4gICAgdGV4dDogYE1pbWljcyB3aWxsIGJlIGluIHRoZWlyIHZhbmlsbGEgbG9jYXRpb25zLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBQcmVzZXJ2ZVVuaXF1ZUNoZWNrcyA9IEVhc3lNb2RlLmZsYWcoJ0V1Jywge1xuICAgIG5hbWU6ICdLZWVwIHVuaXF1ZSBpdGVtcyBhbmQgY29uc3VtYWJsZXMgc2VwYXJhdGUnLFxuICAgIHRleHQ6IGBOb3JtYWxseSBhbGwgaXRlbXMgYW5kIG1pbWljcyBhcmUgc2h1ZmZsZWQgaW50byBhIHNpbmdsZSBwb29sIGFuZFxuICAgICAgICAgICBkaXN0cmlidXRlZCBmcm9tIHRoZXJlLiAgSWYgdGhpcyBmbGFnIGlzIHNldCwgdW5pcXVlIGl0ZW1zXG4gICAgICAgICAgIChzcGVjaWZpY2FsbHksIGFueXRoaW5nIHRoYXQgY2Fubm90IGJlIHNvbGQpIHdpbGwgb25seSBiZSBmb3VuZCBpblxuICAgICAgICAgICBlaXRoZXIgKGEpIGNoZWNrcyB0aGF0IGhlbGQgdW5pcXVlIGl0ZW1zIGluIHZhbmlsbGEsIG9yIChiKSBib3NzXG4gICAgICAgICAgIGRyb3BzLiAgQ2hlc3RzIGNvbnRhaW5pbmcgY29uc3VtYWJsZXMgaW4gdmFuaWxsYSBtYXkgYmUgc2FmZWx5XG4gICAgICAgICAgIGlnbm9yZWQsIGJ1dCBjaGVzdHMgY29udGFpbmluZyB1bmlxdWUgaXRlbXMgaW4gdmFuaWxsYSBtYXkgc3RpbGxcbiAgICAgICAgICAgZW5kIHVwIHdpdGggbm9uLXVuaXF1ZSBpdGVtcyBiZWNhdXNlIG9mIGJvc3NlcyBsaWtlIFZhbXBpcmUgMiB0aGF0XG4gICAgICAgICAgIGRyb3AgY29uc3VtYWJsZXMuICBJZiBtaW1pY3MgYXJlIHNodWZmbGVkLCB0aGV5IHdpbGwgb25seSBiZSBpblxuICAgICAgICAgICBjb25zdW1hYmxlIGxvY2F0aW9ucy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgRGVjcmVhc2VFbmVteURhbWFnZSA9IEVhc3lNb2RlLmZsYWcoJ0VkJywge1xuICAgIG5hbWU6ICdEZWNyZWFzZSBlbmVteSBkYW1hZ2UnLFxuICAgIHRleHQ6IGBFbmVteSBhdHRhY2sgcG93ZXIgd2lsbCBiZSBzaWduaWZpY2FudGx5IGRlY3JlYXNlZCBpbiB0aGUgZWFybHkgZ2FtZVxuICAgICAgICAgICAoYnkgYSBmYWN0b3Igb2YgMykuICBUaGUgZ2FwIHdpbGwgbmFycm93IGluIHRoZSBtaWQtZ2FtZSBhbmQgZXZlbnR1YWxseVxuICAgICAgICAgICBwaGFzZSBvdXQgYXQgc2NhbGluZyBsZXZlbCA0MC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgR3VhcmFudGVlU3RhcnRpbmdTd29yZCA9IEVhc3lNb2RlLmZsYWcoJ0VzJywge1xuICAgIG5hbWU6ICdHdWFyYW50ZWUgc3RhcnRpbmcgc3dvcmQnLFxuICAgIHRleHQ6IGBUaGUgTGVhZiBlbGRlciBpcyBndWFyYW50ZWVkIHRvIGdpdmUgYSBzd29yZC4gIEl0IHdpbGwgbm90IGJlXG4gICAgICAgICAgIHJlcXVpcmVkIHRvIGRlYWwgd2l0aCBhbnkgZW5lbWllcyBiZWZvcmUgZmluZGluZyB0aGUgZmlyc3Qgc3dvcmQuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEd1YXJhbnRlZVJlZnJlc2ggPSBFYXN5TW9kZS5mbGFnKCdFcicsIHtcbiAgICBuYW1lOiAnR3VhcmFudGVlIHJlZnJlc2gnLFxuICAgIHRleHQ6IGBHdWFyYW50ZWVzIHRoZSBSZWZyZXNoIHNwZWxsIHdpbGwgYmUgYXZhaWxhYmxlIGJlZm9yZSBmaWdodGluZ1xuICAgICAgICAgICBUZXRyYXJjaHMuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEV4cGVyaWVuY2VTY2FsZXNGYXN0ZXIgPSBFYXN5TW9kZS5mbGFnKCdFeCcsIHtcbiAgICBuYW1lOiAnRXhwZXJpZW5jZSBzY2FsZXMgZmFzdGVyJyxcbiAgICB0ZXh0OiBgTGVzcyBncmluZGluZyB3aWxsIGJlIHJlcXVpcmVkIHRvIFwia2VlcCB1cFwiIHdpdGggdGhlIGdhbWUgZGlmZmljdWx0eS5gLFxuICAgIGV4Y2x1ZGVzOiBbJ0h4J10sXG4gIH0pO1xufVxuXG5jbGFzcyBOb0d1YXJhbnRlZXMgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdOJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdObyBndWFyYW50ZWVzJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBSZW1vdmVzIHZhcmlvdXMgZ3VhcmFudGVlcyBmcm9tIHRoZSBsb2dpYy5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBCYXR0bGVNYWdpYyA9IE5vR3VhcmFudGVlcy5mbGFnKCdOdycsIHtcbiAgICBuYW1lOiAnQmF0dGxlIG1hZ2ljIG5vdCBndWFyYW50ZWVkJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHksIHRoZSBsb2dpYyB3aWxsIGd1YXJhbnRlZSB0aGF0IGxldmVsIDMgc3dvcmQgY2hhcmdlcyBhcmVcbiAgICAgICAgICAgYXZhaWxhYmxlIGJlZm9yZSBmaWdodGluZyB0aGUgdGV0cmFyY2hzICh3aXRoIHRoZSBleGNlcHRpb24gb2YgS2FybWluZSxcbiAgICAgICAgICAgd2hvIG9ubHkgcmVxdWlyZXMgbGV2ZWwgMikuICBUaGlzIGRpc2FibGVzIHRoYXQgY2hlY2suYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTWF0Y2hpbmdTd29yZCA9IE5vR3VhcmFudGVlcy5mbGFnKCdOcycsIHtcbiAgICBuYW1lOiAnTWF0Y2hpbmcgc3dvcmQgbm90IGd1YXJhbnRlZWQgKFwiVGluayBNb2RlXCIpJyxcbiAgICB0ZXh0OiBgRW5hYmxlcyBcInRpbmsgc3RyYXRzXCIsIHdoZXJlIHdyb25nLWVsZW1lbnQgc3dvcmRzIHdpbGwgc3RpbGwgZG8gYVxuICAgICAgICAgICBzaW5nbGUgZGFtYWdlIHBlciBoaXQuICBQbGF5ZXIgbWF5IGJlIHJlcXVpcmVkIHRvIGZpZ2h0IG1vbnN0ZXJzXG4gICAgICAgICAgIChpbmNsdWRpbmcgYm9zc2VzKSB3aXRoIHRpbmtzLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEJhcnJpZXIgPSBOb0d1YXJhbnRlZXMuZmxhZygnTmInLCB7XG4gICAgbmFtZTogJ0JhcnJpZXIgbm90IGd1YXJhbnRlZWQnLFxuICAgIHRleHQ6IGBOb3JtYWxseSwgdGhlIGxvZ2ljIHdpbGwgZ3VhcmFudGVlIEJhcnJpZXIgKG9yIGVsc2UgcmVmcmVzaCBhbmQgc2hpZWxkXG4gICAgICAgICAgIHJpbmcpIGJlZm9yZSBlbnRlcmluZyBTdHh5LCB0aGUgRm9ydHJlc3MsIG9yIGZpZ2h0aW5nIEthcm1pbmUuICBUaGlzXG4gICAgICAgICAgIGRpc2FibGVzIHRoYXQgY2hlY2suYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgR2FzTWFzayA9IE5vR3VhcmFudGVlcy5mbGFnKCdOZycsIHtcbiAgICBuYW1lOiAnR2FzIG1hc2sgbm90IGd1YXJhbnRlZWQnLFxuICAgIHRleHQ6IGBUaGUgbG9naWMgd2lsbCBub3QgZ3VhcmFudGVlIGdhcyBtYXNrIGJlZm9yZSBuZWVkaW5nIHRvIGVudGVyIHRoZSBzd2FtcCxcbiAgICAgICAgICAgbm9yIHdpbGwgbGVhdGhlciBib290cyAob3IgaGF6bWF0IHN1aXQpIGJlIGd1YXJhbnRlZWQgdG8gY3Jvc3MgbG9uZ1xuICAgICAgICAgICBzdHJldGNoZXMgb2Ygc3Bpa2VzLiAgR2FzIG1hc2sgaXMgc3RpbGwgZ3VhcmFudGVlZCB0byBraWxsIHRoZSBpbnNlY3QuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcbn1cblxuY2xhc3MgSGFyZE1vZGUgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdIJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdIYXJkIG1vZGUnO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb0J1ZmZNZWRpY2FsSGVyYiA9IEhhcmRNb2RlLmZsYWcoJ0htJywge1xuICAgIG5hbWU6IGBEb24ndCBidWZmIG1lZGljYWwgaGVyYiBvciBmcnVpdCBvZiBwb3dlcmAsXG4gICAgdGV4dDogYE1lZGljYWwgSGVyYiBpcyBub3QgYnVmZmVkIHRvIGhlYWwgODAgZGFtYWdlLCB3aGljaCBpcyBoZWxwZnVsIHRvIG1ha2VcbiAgICAgICAgICAgdXAgZm9yIGNhc2VzIHdoZXJlIFJlZnJlc2ggaXMgdW5hdmFpbGFibGUgZWFybHkuICBGcnVpdCBvZiBQb3dlciBpcyBub3RcbiAgICAgICAgICAgYnVmZmVkIHRvIHJlc3RvcmUgNTYgTVAuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTWF4U2NhbGluZ0luVG93ZXIgPSBIYXJkTW9kZS5mbGFnKCdIdCcsIHtcbiAgICBuYW1lOiAnTWF4IHNjYWxpbmcgbGV2ZWwgaW4gdG93ZXInLFxuICAgIHRleHQ6IGBFbmVtaWVzIGluIHRoZSB0b3dlciBzcGF3biBhdCBtYXggc2NhbGluZyBsZXZlbC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBFeHBlcmllbmNlU2NhbGVzU2xvd2VyID0gSGFyZE1vZGUuZmxhZygnSHgnLCB7XG4gICAgbmFtZTogJ0V4cGVyaWVuY2Ugc2NhbGVzIHNsb3dlcicsXG4gICAgdGV4dDogYE1vcmUgZ3JpbmRpbmcgd2lsbCBiZSByZXF1aXJlZCB0byBcImtlZXAgdXBcIiB3aXRoIHRoZSBkaWZmaWN1bHR5LmAsXG4gICAgZXhjbHVkZXM6IFsnRXgnXSxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgQ2hhcmdlU2hvdHNPbmx5ID0gSGFyZE1vZGUuZmxhZygnSGMnLCB7XG4gICAgbmFtZTogJ0NoYXJnZSBzaG90cyBvbmx5JyxcbiAgICB0ZXh0OiBgU3RhYmJpbmcgaXMgY29tcGxldGVseSBpbmVmZmVjdGl2ZS4gIE9ubHkgY2hhcmdlZCBzaG90cyB3b3JrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEJsYWNrb3V0ID0gSGFyZE1vZGUuZmxhZygnSHonLCB7XG4gICAgbmFtZTogJ0JsYWNrb3V0JyxcbiAgICB0ZXh0OiBgQWxsIGNhdmVzIGFuZCBmb3J0cmVzc2VzIGFyZSBwZXJtYW5lbnRseSBkYXJrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFBlcm1hZGVhdGggPSBIYXJkTW9kZS5mbGFnKCdIaCcsIHtcbiAgICBuYW1lOiAnUGVybWFkZWF0aCcsXG4gICAgdGV4dDogYEhhcmRjb3JlIG1vZGU6IGNoZWNrcG9pbnRzIGFuZCBzYXZlcyBhcmUgcmVtb3ZlZC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xufVxuXG5jbGFzcyBWYW5pbGxhIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBuYW1lID0gJ1ZhbmlsbGEnO1xuICByZWFkb25seSBwcmVmaXggPSAnVic7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgT3B0aW9ucyB0byByZXN0b3JlIHZhbmlsbGEgYmVoYXZpb3IgY2hhbmdlZCBieSBkZWZhdWx0LmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IER5bmEgPSBWYW5pbGxhLmZsYWcoJ1ZkJywge1xuICAgIG5hbWU6IGBEb24ndCBidWZmIER5bmFgLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB3ZSBtYWtlcyB0aGUgRHluYSBmaWdodCBhIGJpdCBtb3JlIG9mIGEgY2hhbGxlbmdlLlxuICAgICAgICAgICBTaWRlIHBvZHMgd2lsbCBmaXJlIHNpZ25pZmljYW50bHkgbW9yZS4gIFRoZSBzYWZlIHNwb3QgaGFzIGJlZW5cbiAgICAgICAgICAgcmVtb3ZlZC4gIFRoZSByZXZlbmdlIGJlYW1zIHBhc3MgdGhyb3VnaCBiYXJyaWVyLiAgU2lkZSBwb2RzIGNhblxuICAgICAgICAgICBub3cgYmUga2lsbGVkLiAgVGhpcyBmbGFnIHByZXZlbnRzIHRoYXQgY2hhbmdlLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBCb251c0l0ZW1zID0gVmFuaWxsYS5mbGFnKCdWYicsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYnVmZiBib251cyBpdGVtc2AsXG4gICAgdGV4dDogYExlYXRoZXIgQm9vdHMgYXJlIGNoYW5nZWQgdG8gU3BlZWQgQm9vdHMsIHdoaWNoIGluY3JlYXNlIHBsYXllciB3YWxraW5nXG4gICAgICAgICAgIHNwZWVkICh0aGlzIGFsbG93cyBjbGltYmluZyB1cCB0aGUgc2xvcGUgdG8gYWNjZXNzIHRoZSBUb3JuYWRvIEJyYWNlbGV0XG4gICAgICAgICAgIGNoZXN0LCB3aGljaCBpcyB0YWtlbiBpbnRvIGNvbnNpZGVyYXRpb24gYnkgdGhlIGxvZ2ljKS4gIERlbydzIHBlbmRhbnRcbiAgICAgICAgICAgcmVzdG9yZXMgTVAgd2hpbGUgbW92aW5nLiAgUmFiYml0IGJvb3RzIGVuYWJsZSBzd29yZCBjaGFyZ2luZyB1cCB0b1xuICAgICAgICAgICBsZXZlbCAyIHdoaWxlIHdhbGtpbmcgKGxldmVsIDMgc3RpbGwgcmVxdWlyZXMgYmVpbmcgc3RhdGlvbmFyeSwgc28gYXNcbiAgICAgICAgICAgdG8gcHJldmVudCB3YXN0aW5nIHRvbnMgb2YgbWFnaWMpLmAsXG4gIH0pO1xuXG4gIC8vIFRPRE8gLSBpcyBpdCB3b3J0aCBldmVuIGFsbG93aW5nIHRvIHR1cm4gdGhpcyBvZmY/IT9cbiAgc3RhdGljIHJlYWRvbmx5IE1hcHMgPSBWYW5pbGxhLmZsYWcoJ1ZtJywge1xuICAgIG5hbWU6ICdWYW5pbGxhIG1hcHMnLFxuICAgIHRleHQ6IGBOb3JtYWxseSB0aGUgcmFuZG9taXplciBhZGRzIGEgbmV3IFwiRWFzdCBDYXZlXCIgdG8gVmFsbGV5IG9mIFdpbmQsXG4gICAgICAgICAgIGJvcnJvd2VkIGZyb20gdGhlIEdCQyB2ZXJzaW9uIG9mIHRoZSBnYW1lLiAgVGhpcyBjYXZlIGNvbnRhaW5zIHR3b1xuICAgICAgICAgICBjaGVzdHMgKG9uZSBjb25zaWRlcmVkIGEga2V5IGl0ZW0pIG9uIHRoZSB1cHBlciBmbG9vciBhbmQgZXhpdHMgdG9cbiAgICAgICAgICAgdHdvIHJhbmRvbSBhcmVhcyAoY2hvc2VuIGJldHdlZW4gTGltZSBUcmVlIFZhbGxleSwgQ29yZGVsIFBsYWluLFxuICAgICAgICAgICBHb2EgVmFsbGV5LCBvciBEZXNlcnQgMjsgdGhlIHF1aWNrc2FuZCBpcyByZW1vdmVkIGZyb20gdGhlIGVudHJhbmNlc1xuICAgICAgICAgICB0byBQeXJhbWlkIGFuZCBDcnlwdCksIG9uZSB1bmJsb2NrZWQgb24gdGhlIGxvd2VyIGZsb29yLCBhbmQgb25lXG4gICAgICAgICAgIGRvd24gdGhlIHN0YWlycyBhbmQgYmVoaW5kIGEgcm9jayB3YWxsIGZyb20gdGhlIHVwcGVyIGZsb29yLiAgVGhpc1xuICAgICAgICAgICBmbGFnIHByZXZlbnRzIGFkZGluZyB0aGF0IGNhdmUuICBJZiBzZXQgYXMgXCJWIW1cIiB0aGVuIGEgZGlyZWN0IHBhdGhcbiAgICAgICAgICAgd2lsbCBpbnN0ZWFkIGJlIGFkZGVkIGJldHdlZW4gVmFsbGV5IG9mIFdpbmQgYW5kIExpbWUgVHJlZSBWYWxsZXlcbiAgICAgICAgICAgKGFzIGluIGVhcmxpZXIgdmVyc2lvbnMgb2YgdGhlIHJhbmRvbWl6ZXIpLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNob3BzID0gVmFuaWxsYS5mbGFnKCdWcycsIHtcbiAgICBuYW1lOiAnVmFuaWxsYSBzaG9wcycsXG4gICAgdGV4dDogYEJ5IGRlZmF1bHQsIHdlIGRpc2FibGUgc2hvcCBnbGl0Y2gsIHNodWZmbGUgc2hvcCBjb250ZW50cywgYW5kIHRpZVxuICAgICAgICAgICB0aGUgcHJpY2VzIHRvIHRoZSBzY2FsaW5nIGxldmVsIChpdGVtIHNob3BzIGFuZCBpbm5zIGluY3JlYXNlIGJ5IGFcbiAgICAgICAgICAgZmFjdG9yIG9mIDIgZXZlcnkgMTAgc2NhbGluZyBsZXZlbHMsIGFybW9yIHNob3BzIGRlY3JlYXNlIGJ5IGFcbiAgICAgICAgICAgZmFjdG9yIG9mIDIgZXZlcnkgMTIgc2NhbGluZyBsZXZlbHMpLiAgVGhpcyBmbGFnIHByZXZlbnRzIGFsbCBvZlxuICAgICAgICAgICB0aGVzZSBjaGFuZ2VzLCByZXN0b3Jpbmcgc2hvcHMgdG8gYmUgY29tcGxldGVseSB2YW5pbGxhLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBXaWxkV2FycCA9IFZhbmlsbGEuZmxhZygnVncnLCB7XG4gICAgbmFtZTogJ1ZhbmlsbGEgd2lsZCB3YXJwJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgV2lsZCBXYXJwIGlzIG5lcmZlZCB0byBvbmx5IHJldHVybiB0byBNZXphbWUgU2hyaW5lLlxuICAgICAgICAgICBUaGlzIGZsYWcgcmVzdG9yZXMgaXQgdG8gd29yayBsaWtlIG5vcm1hbC4gIE5vdGUgdGhhdCB0aGlzIHdpbGwgcHV0XG4gICAgICAgICAgIGFsbCB3aWxkIHdhcnAgbG9jYXRpb25zIGluIGxvZ2ljIHVubGVzcyB0aGUgZmxhZyBpcyBzZXQgYXMgKFYhdykuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcbn1cblxuY2xhc3MgUXVhbGl0eSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1EnO1xuICByZWFkb25seSBuYW1lID0gJ1F1YWxpdHkgb2YgTGlmZSc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlIGZvbGxvd2luZyBxdWFsaXR5LW9mLWxpZmUgZmxhZ3MgdHVybiA8aT5vZmY8L2k+IGltcHJvdmVtZW50cyB0aGF0XG4gICAgICBhcmUgbm9ybWFsbHkgb24gYnkgZGVmYXVsdC4gIFRoZXkgYXJlIG9wdGlvbmFsIGFuZCB3aWxsIG5vdCBhZmZlY3QgdGhlXG4gICAgICBzZWVkIGdlbmVyYXRpb24uICBUaGV5IG1heSBiZSB0b2dnbGVkIGZyZWVseSBpbiByYWNlIG1vZGUuYDtcblxuICAvLyBUT0RPIC0gcmVtZW1iZXIgcHJlZmVyZW5jZXMgYW5kIGF1dG8tYXBwbHk/XG4gIHN0YXRpYyByZWFkb25seSBOb0F1dG9FcXVpcCA9IFF1YWxpdHkuZmxhZygnUWEnLCB7XG4gICAgbmFtZTogYERvbid0IGF1dG9tYXRpY2FsbHkgZXF1aXAgb3JicyBhbmQgYnJhY2VsZXRzYCxcbiAgICB0ZXh0OiBgUHJldmVudHMgYWRkaW5nIGEgcXVhbGl0eS1vZi1saWZlIGltcHJvdmVtZW50IHRvIGF1dG9tYXRpY2FsbHkgZXF1aXBcbiAgICAgICAgICAgdGhlIGNvcnJlc3BvbmRpbmcgb3JiL2JyYWNlbGV0IHdoZW5ldmVyIGNoYW5naW5nIHN3b3Jkcy5gLFxuICAgIG9wdGlvbmFsOiBPUFRJT05BTCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vQ29udHJvbGxlclNob3J0Y3V0cyA9IFF1YWxpdHkuZmxhZygnUWMnLCB7XG4gICAgbmFtZTogJ0Rpc2FibGUgY29udHJvbGxlciBzaG9ydGN1dHMnLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB3ZSBkaXNhYmxlIHNlY29uZCBjb250cm9sbGVyIGlucHV0IGFuZCBpbnN0ZWFkIGVuYWJsZVxuICAgICAgICAgICBzb21lIG5ldyBzaG9ydGN1dHMgb24gY29udHJvbGxlciAxOiBTdGFydCtBK0IgZm9yIHdpbGQgd2FycCwgYW5kXG4gICAgICAgICAgIFNlbGVjdCtCIHRvIHF1aWNrbHkgY2hhbmdlIHN3b3Jkcy4gIFRvIHN1cHBvcnQgdGhpcywgdGhlIGFjdGlvbiBvZlxuICAgICAgICAgICB0aGUgc3RhcnQgYW5kIHNlbGVjdCBidXR0b25zIGlzIGNoYW5nZWQgc2xpZ2h0bHkuICBUaGlzIGZsYWdcbiAgICAgICAgICAgZGlzYWJsZXMgdGhpcyBjaGFuZ2UgYW5kIHJldGFpbnMgbm9ybWFsIGJlaGF2aW9yLmAsXG4gICAgb3B0aW9uYWw6IE9QVElPTkFMLFxuICB9KTtcbn1cblxuY2xhc3MgRGVidWdNb2RlIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICAvLyBUT0RPIC0gaG93IHRvIGRpc2NvdmVyIEZsYWdTZWN0aW9ucz8/P1xuICByZWFkb25seSBwcmVmaXggPSAnRCc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnRGVidWcgTW9kZSc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlc2Ugb3B0aW9ucyBhcmUgaGVscGZ1bCBmb3IgZXhwbG9yaW5nIG9yIGRlYnVnZ2luZy4gIE5vdGUgdGhhdCxcbiAgICAgIHdoaWxlIHRoZXkgZG8gbm90IGRpcmVjdGx5IGFmZmVjdCBhbnkgcmFuZG9taXphdGlvbiwgdGhleVxuICAgICAgPGk+ZG88L2k+IGZhY3RvciBpbnRvIHRoZSBzZWVkIHRvIHByZXZlbnQgY2hlYXRpbmcsIGFuZCB0aGV5XG4gICAgICB3aWxsIHJlbW92ZSB0aGUgb3B0aW9uIHRvIGdlbmVyYXRlIGEgc2VlZCBmb3IgcmFjaW5nLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNwb2lsZXJMb2cgPSBEZWJ1Z01vZGUuZmxhZygnRHMnLCB7XG4gICAgbmFtZTogJ0dlbmVyYXRlIGEgc3BvaWxlciBsb2cnLFxuICAgIHRleHQ6IGBOb3RlOiA8Yj50aGlzIHdpbGwgY2hhbmdlIHRoZSBwbGFjZW1lbnQgb2YgaXRlbXM8L2I+IGNvbXBhcmVkIHRvIGFcbiAgICAgICAgICAgc2VlZCBnZW5lcmF0ZWQgd2l0aG91dCB0aGlzIGZsYWcgdHVybmVkIG9uLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBUcmFpbmVyTW9kZSA9IERlYnVnTW9kZS5mbGFnKCdEdCcsIHtcbiAgICBuYW1lOiAnVHJhaW5lciBtb2RlJyxcbiAgICB0ZXh0OiBgSW5zdGFsbHMgYSB0cmFpbmVyIGZvciBwcmFjdGljaW5nIGNlcnRhaW4gcGFydHMgb2YgdGhlIGdhbWUuXG4gICAgICAgICAgIEF0IHRoZSBzdGFydCBvZiB0aGUgZ2FtZSwgdGhlIHBsYXllciB3aWxsIGhhdmUgYWxsIHN3b3JkcywgYmFzaWNcbiAgICAgICAgICAgYXJtb3JzIGFuZCBzaGllbGRzLCBhbGwgd29ybiBpdGVtcyBhbmQgbWFnaWNzLCBhIHNlbGVjdGlvbiBvZlxuICAgICAgICAgICBjb25zdW1hYmxlcywgYm93IG9mIHRydXRoLCBtYXhpbXVtIGNhc2gsIGFsbCB3YXJwIHBvaW50cyBhY3RpdmF0ZWQsXG4gICAgICAgICAgIGFuZCB0aGUgU2h5cm9uIG1hc3NhY3JlIHdpbGwgaGF2ZSBiZWVuIHRyaWdnZXJlZC4gIFdpbGQgd2FycCBpc1xuICAgICAgICAgICByZWNvbmZpZ3VyZWQgdG8gcHJvdmlkZSBlYXN5IGFjY2VzcyB0byBhbGwgYm9zc2VzLiAgQWRkaXRpb25hbGx5LFxuICAgICAgICAgICB0aGUgZm9sbG93aW5nIGJ1dHRvbiBjb21iaW5hdGlvbnMgYXJlIHJlY29nbml6ZWQ6PHVsPlxuICAgICAgICAgICAgIDxsaT5TdGFydCtVcDogaW5jcmVhc2UgcGxheWVyIGxldmVsXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0Rvd246IGluY3JlYXNlIHNjYWxpbmcgbGV2ZWxcbiAgICAgICAgICAgICA8bGk+U3RhcnQrTGVmdDogZ2V0IGFsbCBiYWxsc1xuICAgICAgICAgICAgIDxsaT5TdGFydCtSaWdodDogZ2V0IGFsbCBicmFjZWxldHNcbiAgICAgICAgICAgICA8bGk+U3RhcnQrQitEb3duOiBnZXQgYSBmdWxsIHNldCBvZiBjb25zdW1hYmxlIGl0ZW1zXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0IrTGVmdDogZ2V0IGFsbCBhZHZhbmNlZCBhcm1vcnNcbiAgICAgICAgICAgICA8bGk+U3RhcnQrQitSaWdodDogZ2V0IGFsbCBhZHZhbmNlZCBzaGllbGRzXG4gICAgICAgICAgIDwvdWw+YCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5ldmVyRGllID0gRGVidWdNb2RlLmZsYWcoJ0RpJywge1xuICAgIG5hbWU6ICdQbGF5ZXIgbmV2ZXIgZGllcycsXG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgRmxhZ1NldCB7XG4gIHByaXZhdGUgZmxhZ3M6IE1hcDxGbGFnLCBNb2RlPjtcblxuICBjb25zdHJ1Y3RvcihzdHI6IHN0cmluZ3xNYXA8RmxhZywgTW9kZT4gPSAnQENhc3VhbCcpIHtcbiAgICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuZmxhZ3MgPSBuZXcgTWFwKCk7XG4gICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBzdHIpIHtcbiAgICAgICAgdGhpcy5zZXQoay5mbGFnLCB2KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHN0ci5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgIC8vIFRPRE8gLSBzdXBwb3J0ICdAQ2FzdWFsK1JzLUVkJ1xuICAgICAgY29uc3QgZXhwYW5kZWQgPSBQcmVzZXRzLmdldChzdHIuc3Vic3RyaW5nKDEpKTtcbiAgICAgIGlmICghZXhwYW5kZWQpIHRocm93IG5ldyBVc2FnZUVycm9yKGBVbmtub3duIHByZXNldDogJHtzdHJ9YCk7XG4gICAgICB0aGlzLmZsYWdzID0gbmV3IE1hcChleHBhbmRlZC5mbGFncyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZmxhZ3MgPSBuZXcgTWFwKCk7XG4gICAgLy8gcGFyc2UgdGhlIHN0cmluZ1xuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9bXkEtWmEtejAtOSE/XS9nLCAnJyk7XG4gICAgY29uc3QgcmUgPSAvKFtBLVpdKShbYS16MC05IT9dKykvZztcbiAgICBsZXQgbWF0Y2g7XG4gICAgd2hpbGUgKChtYXRjaCA9IHJlLmV4ZWMoc3RyKSkpIHtcbiAgICAgIGNvbnN0IFssIGtleSwgdGVybXNdID0gbWF0Y2g7XG4gICAgICBjb25zdCByZTIgPSAvKFshP118XikoW2EtejAtOV0rKS9nO1xuICAgICAgd2hpbGUgKChtYXRjaCA9IHJlMi5leGVjKHRlcm1zKSkpIHtcbiAgICAgICAgY29uc3QgWywgbW9kZSwgZmxhZ3NdID0gbWF0Y2g7XG4gICAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBmbGFncykge1xuICAgICAgICAgIHRoaXMuc2V0KGtleSArIGZsYWcsIG1vZGUgfHwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmaWx0ZXJPcHRpb25hbCgpOiBGbGFnU2V0IHtcbiAgICByZXR1cm4gbmV3IEZsYWdTZXQoXG4gICAgICAgIG5ldyBNYXAoXG4gICAgICAgICAgICBbLi4udGhpcy5mbGFnc10ubWFwKFxuICAgICAgICAgICAgICAgIChbaywgdl0pID0+IFtrLCBrLm9wdHMub3B0aW9uYWwgPyBrLm9wdHMub3B0aW9uYWwodikgOiB2XSkpKTtcbiAgfVxuXG4gIGZpbHRlclJhbmRvbShyYW5kb206IFJhbmRvbSk6IEZsYWdTZXQge1xuICAgIGZ1bmN0aW9uIHBpY2soazogRmxhZywgdjogTW9kZSk6IE1vZGUge1xuICAgICAgaWYgKHYgIT09ICc/JykgcmV0dXJuIHY7XG4gICAgICByZXR1cm4gcmFuZG9tLnBpY2soW3RydWUsIGZhbHNlLCAuLi4oay5vcHRzLm1vZGVzIHx8ICcnKV0pO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEZsYWdTZXQoXG4gICAgICAgIG5ldyBNYXAoWy4uLnRoaXMuZmxhZ3NdLm1hcCgoW2ssIHZdKSA9PiBbaywgcGljayhrLCB2KV0pKSk7XG4gIH1cblxuICB0b1N0cmluZygpIHtcbiAgICB0eXBlIFNlY3Rpb24gPSBEZWZhdWx0TWFwPHN0cmluZywgc3RyaW5nW10+O1xuICAgIGNvbnN0IHNlY3Rpb25zID1cbiAgICAgICAgbmV3IERlZmF1bHRNYXA8c3RyaW5nLCBTZWN0aW9uPihcbiAgICAgICAgICAgICgpID0+IG5ldyBEZWZhdWx0TWFwPHN0cmluZywgc3RyaW5nW10+KCgpID0+IFtdKSlcbiAgICBmb3IgKGNvbnN0IFtmbGFnLCBtb2RlXSBvZiB0aGlzLmZsYWdzKSB7XG4gICAgICBpZiAoZmxhZy5mbGFnLmxlbmd0aCAhPT0gMikgdGhyb3cgbmV3IEVycm9yKGBCYWQgZmxhZyAke2ZsYWcuZmxhZ31gKTtcbiAgICAgIGlmICghbW9kZSkgY29udGludWU7XG4gICAgICBjb25zdCBzZWN0aW9uID0gc2VjdGlvbnMuZ2V0KGZsYWcuZmxhZ1swXSk7XG4gICAgICBjb25zdCBzdWJzZWN0aW9uID0gbW9kZSA9PT0gdHJ1ZSA/ICcnIDogbW9kZTtcbiAgICAgIHNlY3Rpb24uZ2V0KHN1YnNlY3Rpb24pLnB1c2goZmxhZy5mbGFnWzFdKTtcbiAgICB9XG4gICAgY29uc3Qgb3V0ID0gW107XG4gICAgZm9yIChjb25zdCBba2V5LCBzZWN0aW9uXSBvZiBzZWN0aW9ucy5zb3J0ZWRFbnRyaWVzKCkpIHtcbiAgICAgIGxldCBzZWMgPSBrZXk7XG4gICAgICBmb3IgKGNvbnN0IFtzdWJrZXksIHN1YnNlY3Rpb25dIG9mIHNlY3Rpb24uc29ydGVkRW50cmllcygpKSB7XG4gICAgICAgIHNlYyArPSBzdWJrZXkgKyBzdWJzZWN0aW9uLnNvcnQoKS5qb2luKCcnKTtcbiAgICAgIH1cbiAgICAgIG91dC5wdXNoKHNlYyk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbignICcpO1xuICB9XG5cbiAgdG9nZ2xlKG5hbWU6IHN0cmluZyk6IE1vZGUge1xuICAgIGNvbnN0IGZsYWcgPSBGbGFnLmZsYWdzLmdldChuYW1lKTtcbiAgICBpZiAoIWZsYWcpIHtcbiAgICAgIC8vIFRPRE8gLSBSZXBvcnQgc29tZXRoaW5nXG4gICAgICBjb25zb2xlLmVycm9yKGBCYWQgZmxhZzogJHtuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBtb2RlOiBNb2RlID0gdGhpcy5mbGFncy5nZXQoZmxhZykgfHwgZmFsc2U7XG4gICAgY29uc3QgbW9kZXMgPSBbZmFsc2UsIHRydWUsIC4uLihmbGFnLm9wdHMubW9kZXMgfHwgJycpLCAnPycsIGZhbHNlXTtcbiAgICBjb25zdCBpbmRleCA9IG1vZGVzLmluZGV4T2YobW9kZSk7XG4gICAgaWYgKGluZGV4IDwgMCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgY3VycmVudCBtb2RlICR7bW9kZX1gKTtcbiAgICBjb25zdCBuZXh0ID0gbW9kZXNbaW5kZXggKyAxXTtcbiAgICB0aGlzLmZsYWdzLnNldChmbGFnLCBuZXh0KTtcbiAgICByZXR1cm4gbmV4dDtcbiAgfVxuXG4gIHNldChuYW1lOiBzdHJpbmcsIG1vZGU6IE1vZGUpIHtcbiAgICBjb25zdCBmbGFnID0gRmxhZy5mbGFncy5nZXQobmFtZSk7XG4gICAgaWYgKCFmbGFnKSB7XG4gICAgICAvLyBUT0RPIC0gUmVwb3J0IHNvbWV0aGluZ1xuICAgICAgY29uc29sZS5lcnJvcihgQmFkIGZsYWc6ICR7bmFtZX1gKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCFtb2RlKSB7XG4gICAgICB0aGlzLmZsYWdzLmRlbGV0ZShmbGFnKTtcbiAgICB9IGVsc2UgaWYgKG1vZGUgPT09IHRydWUgfHwgbW9kZSA9PT0gJz8nIHx8IGZsYWcub3B0cy5tb2Rlcz8uaW5jbHVkZXMobW9kZSkpIHtcbiAgICAgIHRoaXMuZmxhZ3Muc2V0KGZsYWcsIG1vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBCYWQgZmxhZyBtb2RlOiAke25hbWVbMF19JHttb2RlfSR7bmFtZS5zdWJzdHJpbmcoMSl9YCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFJlbW92ZSBhbnkgY29uZmxpY3RzXG4gICAgZm9yIChjb25zdCBleGNsdWRlZCBvZiBmbGFnLm9wdHMuZXhjbHVkZXMgfHwgW10pIHtcbiAgICAgIHRoaXMuZmxhZ3MuZGVsZXRlKEZsYWcuZmxhZ3MuZ2V0KGV4Y2x1ZGVkKSEpO1xuICAgIH1cbiAgfVxuXG4gIGNoZWNrKG5hbWU6IEZsYWd8c3RyaW5nLCAuLi5tb2RlczogTW9kZVtdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZmxhZyA9IG5hbWUgaW5zdGFuY2VvZiBGbGFnID8gbmFtZSA6IEZsYWcuZmxhZ3MuZ2V0KG5hbWUpO1xuICAgIGlmICghbW9kZXMubGVuZ3RoKSBtb2Rlcy5wdXNoKHRydWUpO1xuICAgIHJldHVybiBtb2Rlcy5pbmNsdWRlcyhmbGFnICYmIHRoaXMuZmxhZ3MuZ2V0KGZsYWcpIHx8IGZhbHNlKTtcbiAgfVxuXG4gIGdldChuYW1lOiBGbGFnfHN0cmluZyk6IE1vZGUge1xuICAgIGNvbnN0IGZsYWcgPSBuYW1lIGluc3RhbmNlb2YgRmxhZyA/IG5hbWUgOiBGbGFnLmZsYWdzLmdldChuYW1lKTtcbiAgICByZXR1cm4gZmxhZyAmJiB0aGlzLmZsYWdzLmdldChmbGFnKSB8fCBmYWxzZTtcbiAgfVxuXG4gIHByZXNlcnZlVW5pcXVlQ2hlY2tzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLlByZXNlcnZlVW5pcXVlQ2hlY2tzKTtcbiAgfVxuICBzaHVmZmxlTWltaWNzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLk5vU2h1ZmZsZU1pbWljcywgZmFsc2UpO1xuICB9XG5cbiAgYnVmZkRlb3NQZW5kYW50KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG4gIGNoYW5nZUdhc01hc2tUb0hhem1hdFN1aXQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cbiAgc2xvd0Rvd25Ub3JuYWRvKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG4gIGxlYXRoZXJCb290c0dpdmVTcGVlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuICByYWJiaXRCb290c0NoYXJnZVdoaWxlV2Fsa2luZygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuXG4gIHNodWZmbGVTcHJpdGVQYWxldHRlcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVTcHJpdGVDb2xvcnMpO1xuICB9XG4gIHNodWZmbGVNb25zdGVycygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTsgLy8gdGhpcy5jaGVjaygnTXInKTtcbiAgfVxuICBzaHVmZmxlU2hvcHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5TaG9wcywgZmFsc2UpO1xuICB9XG4gIGJhcmdhaW5IdW50aW5nKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNodWZmbGVTaG9wcygpO1xuICB9XG5cbiAgc2h1ZmZsZVRvd2VyTW9uc3RlcnMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTW9uc3RlcnMuVG93ZXJSb2JvdHMpO1xuICB9XG4gIHNodWZmbGVNb25zdGVyRWxlbWVudHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3Nlcyk7XG4gIH1cbiAgc2h1ZmZsZUJvc3NFbGVtZW50cygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zaHVmZmxlTW9uc3RlckVsZW1lbnRzKCk7XG4gIH1cblxuICBidWZmTWVkaWNhbEhlcmIoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuTm9CdWZmTWVkaWNhbEhlcmIsIGZhbHNlKTtcbiAgfVxuICBkZWNyZWFzZUVuZW15RGFtYWdlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLkRlY3JlYXNlRW5lbXlEYW1hZ2UpO1xuICB9XG4gIHRyYWluZXIoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRGVidWdNb2RlLlRyYWluZXJNb2RlKTtcbiAgfVxuICBuZXZlckRpZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhEZWJ1Z01vZGUuTmV2ZXJEaWUpO1xuICB9XG4gIGNoYXJnZVNob3RzT25seSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5DaGFyZ2VTaG90c09ubHkpO1xuICB9XG5cbiAgYmFycmllclJlcXVpcmVzQ2FsbVNlYSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTsgLy8gdGhpcy5jaGVjaygnUmwnKTtcbiAgfVxuICAvLyBwYXJhbHlzaXNSZXF1aXJlc1ByaXNvbktleSgpOiBib29sZWFuIHtcbiAgLy8gICByZXR1cm4gdHJ1ZTsgLy8gdGhpcy5jaGVjaygnUmwnKTtcbiAgLy8gfVxuICAvLyBzZWFsZWRDYXZlUmVxdWlyZXNXaW5kbWlsbCgpOiBib29sZWFuIHtcbiAgLy8gICByZXR1cm4gdHJ1ZTsgLy8gdGhpcy5jaGVjaygnUmwnKTtcbiAgLy8gfVxuXG4gIGNvbm5lY3RMaW1lVHJlZVRvTGVhZigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLk1hcHMsICchJyk7XG4gIH1cbiAgLy8gY29ubmVjdEdvYVRvTGVhZigpIHtcbiAgLy8gICByZXR1cm4gdGhpcy5jaGVjaygnWGUnKSAmJiB0aGlzLmNoZWNrKCdYZycpO1xuICAvLyB9XG4gIC8vIHJlbW92ZUVhcmx5V2FsbCgpIHtcbiAgLy8gICByZXR1cm4gdGhpcy5jaGVjaygnWGInKTtcbiAgLy8gfVxuICBhZGRFYXN0Q2F2ZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLk1hcHMsIGZhbHNlKTtcbiAgfVxuICBmb2dMYW1wTm90UmVxdWlyZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5WYW5pbGxhRG9scGhpbiwgZmFsc2UpO1xuICB9XG4gIHN0b3J5TW9kZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLlN0b3J5TW9kZSk7XG4gIH1cbiAgbm9Cb3dNb2RlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuTm9Cb3dNb2RlKTtcbiAgfVxuICByZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLlZhbmlsbGFEb2xwaGluKTtcbiAgfVxuICBzYWhhcmFSYWJiaXRzUmVxdWlyZVRlbGVwYXRoeSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTsgLy8gdGhpcy5jaGVjaygnUnInKTtcbiAgfVxuICB0ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLCBmYWxzZSwgJyEnKTtcbiAgfVxuICByYW5kb21pemVUaHVuZGVyVGVsZXBvcnQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsIGZhbHNlKTtcbiAgfVxuICBvcmJzT3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5PcmJzTm90UmVxdWlyZWQpO1xuICB9XG5cbiAgc2h1ZmZsZUdvYUZsb29ycygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5TaHVmZmxlR29hRmxvb3JzKTtcbiAgfVxuICBzaHVmZmxlSG91c2VzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlNodWZmbGVIb3VzZXMpO1xuICB9XG4gIHNodWZmbGVBcmVhcygpIHtcbiAgICAvLyBUT0RPOiBjb25zaWRlciBtdWx0aXBsZSBsZXZlbHMgb2Ygc2h1ZmZsZT9cbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5TaHVmZmxlQXJlYXMpO1xuICB9XG4gIHJhbmRvbWl6ZU1hcHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplTWFwcyk7XG4gIH1cbiAgcmFuZG9taXplVHJhZGVzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVRyYWRlcyk7XG4gIH1cbiAgdW5pZGVudGlmaWVkSXRlbXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMpO1xuICB9XG4gIHJhbmRvbWl6ZVdhbGxzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyk7XG4gIH1cblxuICBndWFyYW50ZWVTd29yZCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5HdWFyYW50ZWVTdGFydGluZ1N3b3JkKTtcbiAgfVxuICBndWFyYW50ZWVTd29yZE1hZ2ljKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE5vR3VhcmFudGVlcy5CYXR0bGVNYWdpYywgZmFsc2UpO1xuICB9XG4gIGd1YXJhbnRlZU1hdGNoaW5nU3dvcmQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTm9HdWFyYW50ZWVzLk1hdGNoaW5nU3dvcmQsIGZhbHNlKTtcbiAgfVxuICBndWFyYW50ZWVHYXNNYXNrKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE5vR3VhcmFudGVlcy5HYXNNYXNrLCBmYWxzZSk7XG4gIH1cbiAgZ3VhcmFudGVlQmFycmllcigpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhOb0d1YXJhbnRlZXMuQmFycmllciwgZmFsc2UpO1xuICB9XG4gIGd1YXJhbnRlZVJlZnJlc2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuR3VhcmFudGVlUmVmcmVzaCk7XG4gIH1cblxuICBkaXNhYmxlU3dvcmRDaGFyZ2VHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlVGVsZXBvcnRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlUmFiYml0U2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVNob3BHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5TaG9wcywgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVTdGF0dWVHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3RhdHVlR2xpdGNoLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVJhZ2VTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlJhZ2VTa2lwLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVRyaWdnZXJHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuVHJpZ2dlclNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlRmxpZ2h0U3RhdHVlU2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5TdGF0dWVHYXVudGxldFNraXAsIGZhbHNlKTtcbiAgfVxuXG4gIGFzc3VtZVN3b3JkQ2hhcmdlR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN3b3JkQ2hhcmdlR2xpdGNoKTtcbiAgfVxuICBhc3N1bWVHaGV0dG9GbGlnaHQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuR2hldHRvRmxpZ2h0KTtcbiAgfVxuICBhc3N1bWVUZWxlcG9ydFNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCk7XG4gIH1cbiAgYXNzdW1lUmFiYml0U2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwKTtcbiAgfVxuICBhc3N1bWVTdGF0dWVHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3RhdHVlR2xpdGNoKTtcbiAgfVxuICBhc3N1bWVUcmlnZ2VyR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlRyaWdnZXJTa2lwKTtcbiAgfVxuICBhc3N1bWVGbGlnaHRTdGF0dWVTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN0YXR1ZUdhdW50bGV0U2tpcCk7XG4gIH1cbiAgYXNzdW1lV2lsZFdhcnAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5XaWxkV2FycCwgdHJ1ZSkgfHxcbiAgICAgICAgdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVXaWxkV2FycCk7XG4gIH1cbiAgYXNzdW1lUmFnZVNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuUmFnZVNraXApO1xuICB9XG5cbiAgbmVyZldpbGRXYXJwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuV2lsZFdhcnAsIGZhbHNlKSAmJlxuICAgICAgICB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwLCBmYWxzZSk7XG4gIH1cbiAgYWxsb3dXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gIXRoaXMubmVyZldpbGRXYXJwKCk7XG4gIH1cbiAgcmFuZG9taXplV2lsZFdhcnAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplV2lsZFdhcnAsIHRydWUpO1xuICB9XG5cbiAgYmxhY2tvdXRNb2RlKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLkJsYWNrb3V0KTtcbiAgfVxuICBoYXJkY29yZU1vZGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuUGVybWFkZWF0aCk7XG4gIH1cbiAgYnVmZkR5bmEoKSB7XG4gICAgcmV0dXJuICF0aGlzLmNoZWNrKFZhbmlsbGEuRHluYSk7XG4gIH1cbiAgbWF4U2NhbGluZ0luVG93ZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIpO1xuICB9XG5cbiAgZXhwU2NhbGluZ0ZhY3RvcigpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5FeHBlcmllbmNlU2NhbGVzU2xvd2VyKSA/IDAuMjUgOlxuICAgICAgICB0aGlzLmNoZWNrKEVhc3lNb2RlLkV4cGVyaWVuY2VTY2FsZXNGYXN0ZXIpID8gMi41IDogMTtcbiAgfVxuXG4gIC8vIE9QVElPTkFMIEZMQUdTXG4gIGF1dG9FcXVpcEJyYWNlbGV0KHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gcGFzcyA9PT0gJ2Vhcmx5JyB8fCB0aGlzLmNoZWNrKFF1YWxpdHkuTm9BdXRvRXF1aXAsIGZhbHNlKTtcbiAgfVxuICBjb250cm9sbGVyU2hvcnRjdXRzKHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gcGFzcyA9PT0gJ2Vhcmx5JyB8fCB0aGlzLmNoZWNrKFF1YWxpdHkuTm9Db250cm9sbGVyU2hvcnRjdXRzLCBmYWxzZSk7XG4gIH1cbiAgcmFuZG9taXplTXVzaWMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEFlc3RoZXRpY3MuUmFuZG9taXplTXVzaWMsIHBhc3MgPT09ICdlYXJseScgPyAnIScgOiB0cnVlKTtcbiAgfVxuICBzaHVmZmxlVGlsZVBhbGV0dGVzKHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhBZXN0aGV0aWNzLlJhbmRvbWl6ZU1hcENvbG9ycyxcbiAgICAgICAgICAgICAgICAgICAgICBwYXNzID09PSAnZWFybHknID8gJyEnIDogdHJ1ZSk7XG4gIH1cbiAgbm9NdXNpYyhwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHBhc3MgPT09ICdsYXRlJyAmJiB0aGlzLmNoZWNrKEFlc3RoZXRpY3MuTm9NdXNpYyk7XG4gIH1cblxuICBzaG91bGRDb2xvclN3b3JkRWxlbWVudHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cbiJdfQ==