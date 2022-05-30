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
DebugMode.NoShuffle = DebugMode.flag('Dn', {
    name: 'Do not shuffle items',
    text: `Items will not be shuffled. WARNING: This disables the logic and
           is very likely to result in an unwinnable seed`,
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
    noShuffle() {
        return this.check(DebugMode.NoShuffle);
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
    zebuStudentGivesItem() {
        return !this.shuffleAreas() && !this.shuffleHouses();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3NldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy9mbGFnc2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBZ0JqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUU3RCxNQUFNLE9BQU8sSUFBSTtJQU9mLFlBQXFCLElBQVksRUFBVyxJQUFjO1FBQXJDLFNBQUksR0FBSixJQUFJLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFVO1FBQ3hELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBTkQsTUFBTSxDQUFDLEdBQUc7UUFDUixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQzs7QUFKZSxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7QUFXbEQsTUFBTSxPQUFPLE1BQU07SUFTakIsWUFBWSxNQUFlLEVBQ04sSUFBWSxFQUNaLFdBQW1CLEVBQzVCLEtBQWdEO1FBRnZDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUV0QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0Qs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QUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBQ0QsT0FBTyxDQUFDLElBQXNCO1FBQzVCLE9BQU8sSUFBSSxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQsd0JBQXdCO1FBQ3RCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtVc2FnZUVycm9yLCBEZWZhdWx0TWFwfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4vcmFuZG9tLmpzJztcblxuaW50ZXJmYWNlIEZsYWdPcHRzIHtcbiAgbmFtZTogc3RyaW5nO1xuICB0ZXh0Pzogc3RyaW5nO1xuICBleGNsdWRlcz86IHN0cmluZ1tdO1xuICBoYXJkPzogYm9vbGVhbjtcbiAgb3B0aW9uYWw/OiAobW9kZTogTW9kZSkgPT4gTW9kZTtcbiAgLy8gQWxsIGZsYWdzIGhhdmUgbW9kZXMgZmFsc2UgYW5kIHRydWUuICBBZGRpdGlvbmFsIG1vZGVzIG1heSBiZVxuICAvLyBzcGVjaWZpZWQgYXMgY2hhcmFjdGVycyBpbiB0aGlzIHN0cmluZyAoZS5nLiAnIScpLlxuICBtb2Rlcz86IHN0cmluZztcbn1cblxudHlwZSBNb2RlID0gYm9vbGVhbnxzdHJpbmc7XG5cbmNvbnN0IE9QVElPTkFMID0gKG1vZGU6IE1vZGUpID0+ICcnO1xuY29uc3QgTk9fQkFORyA9IChtb2RlOiBNb2RlKSA9PiBtb2RlID09PSB0cnVlID8gZmFsc2UgOiBtb2RlO1xuXG5leHBvcnQgY2xhc3MgRmxhZyB7XG4gIHN0YXRpYyByZWFkb25seSBmbGFncyA9IG5ldyBNYXA8c3RyaW5nLCBGbGFnPigpO1xuXG4gIHN0YXRpYyBhbGwoKTogRmxhZ1tdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMuZmxhZ3MudmFsdWVzKCldO1xuICB9XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgZmxhZzogc3RyaW5nLCByZWFkb25seSBvcHRzOiBGbGFnT3B0cykge1xuICAgIEZsYWcuZmxhZ3Muc2V0KGZsYWcsIHRoaXMpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQcmVzZXQge1xuICBzdGF0aWMgYWxsKCk6IFByZXNldFtdIHtcbiAgICBpZiAoIVByZXNldHMuaW5zdGFuY2UpIFByZXNldHMuaW5zdGFuY2UgPSBuZXcgUHJlc2V0cygpO1xuICAgIHJldHVybiBbLi4uUHJlc2V0cy5pbnN0YW5jZS5wcmVzZXRzLnZhbHVlcygpXTtcbiAgfVxuXG4gIHByaXZhdGUgX2ZsYWdTdHJpbmc/OiBzdHJpbmc7XG5cbiAgcmVhZG9ubHkgZmxhZ3M6IFJlYWRvbmx5QXJyYXk8cmVhZG9ubHkgW0ZsYWcsIE1vZGVdPjtcbiAgY29uc3RydWN0b3IocGFyZW50OiBQcmVzZXRzLCAvLyBOT1RFOiBpbXBvc3NpYmxlIHRvIGdldCBhbiBpbnN0YW5jZSBvdXRzaWRlXG4gICAgICAgICAgICAgIHJlYWRvbmx5IG5hbWU6IHN0cmluZyxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgZGVzY3JpcHRpb246IHN0cmluZyxcbiAgICAgICAgICAgICAgZmxhZ3M6IFJlYWRvbmx5QXJyYXk8RmxhZ3xyZWFkb25seSBbRmxhZywgTW9kZV0+KSB7XG4gICAgdGhpcy5mbGFncyA9IGZsYWdzLm1hcChmID0+IGYgaW5zdGFuY2VvZiBGbGFnID8gW2YsIHRydWVdIDogZik7XG4gICAgcGFyZW50LnByZXNldHMuc2V0KG1hcFByZXNldE5hbWUobmFtZSksIHRoaXMpO1xuICB9XG5cbiAgZ2V0IGZsYWdTdHJpbmcoKSB7XG4gICAgaWYgKHRoaXMuX2ZsYWdTdHJpbmcgPT0gbnVsbCkge1xuICAgICAgdGhpcy5fZmxhZ1N0cmluZyA9IFN0cmluZyhuZXcgRmxhZ1NldChgQCR7dGhpcy5uYW1lfWApKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2ZsYWdTdHJpbmc7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFwUHJlc2V0TmFtZShuYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtel0vZywgJycpO1xufVxuXG4vLyBOT1QgRVhQT1JURUQhXG5jbGFzcyBQcmVzZXRzIHtcbiAgc3RhdGljIGluc3RhbmNlOiBQcmVzZXRzIHwgdW5kZWZpbmVkO1xuICByZWFkb25seSBwcmVzZXRzID0gbmV3IE1hcDxzdHJpbmcsIFByZXNldD4oKTtcblxuICBzdGF0aWMgZ2V0KG5hbWU6IHN0cmluZyk6IFByZXNldCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLmluc3RhbmNlKSB0aGlzLmluc3RhbmNlID0gbmV3IFByZXNldHMoKTtcbiAgICByZXR1cm4gdGhpcy5pbnN0YW5jZS5wcmVzZXRzLmdldChtYXBQcmVzZXROYW1lKG5hbWUpKTtcbiAgfVxuXG4gIHJlYWRvbmx5IENhc3VhbCA9IG5ldyBQcmVzZXQodGhpcywgJ0Nhc3VhbCcsIGBcbiAgICAgIEJhc2ljIGZsYWdzIGZvciBhIHJlbGF0aXZlbHkgZWFzeSBwbGF5dGhyb3VnaC4gIFRoaXMgaXMgYSBnb29kXG4gICAgICBwbGFjZSB0byBzdGFydC5gLCBbXG4gICAgICAgIEVhc3lNb2RlLlByZXNlcnZlVW5pcXVlQ2hlY2tzLFxuICAgICAgICBFYXN5TW9kZS5Ob1NodWZmbGVNaW1pY3MsXG4gICAgICAgIEVhc3lNb2RlLkRlY3JlYXNlRW5lbXlEYW1hZ2UsXG4gICAgICAgIEVhc3lNb2RlLkd1YXJhbnRlZVJlZnJlc2gsXG4gICAgICAgIEVhc3lNb2RlLkd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQsXG4gICAgICAgIEVhc3lNb2RlLkV4cGVyaWVuY2VTY2FsZXNGYXN0ZXIsXG4gICAgICAgIFJvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLFxuICAgICAgICBWYW5pbGxhLlNob3BzLFxuICAgICAgICBWYW5pbGxhLkR5bmEsXG4gICAgICAgIFtWYW5pbGxhLk1hcHMsICchJ10sXG4gICAgICAgIFtWYW5pbGxhLldpbGRXYXJwLCAnISddLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IENsYXNzaWMgPSBuZXcgUHJlc2V0KHRoaXMsICdDbGFzc2ljJywgYFxuICAgICAgUHJvdmlkZXMgYSByZWxhdGl2ZWx5IHF1aWNrIHBsYXl0aG91Z2ggd2l0aCBhIHJlYXNvbmFibGUgYW1vdW50IG9mXG4gICAgICBjaGFsbGVuZ2UuICBTaW1pbGFyIHRvIG9sZGVyIHZlcnNpb25zLmAsIFtcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlU3RhcnRpbmdTd29yZCxcbiAgICAgICAgR2xpdGNoZXMuU3RhdHVlR2xpdGNoLFxuICAgICAgICBbUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsICchJ10sXG4gICAgICAgIFtWYW5pbGxhLk1hcHMsICchJ10sXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgU3RhbmRhcmQgPSBuZXcgUHJlc2V0KHRoaXMsICdTdGFuZGFyZCcsIGBcbiAgICAgIFdlbGwtYmFsYW5jZWQsIHN0YW5kYXJkIHJhY2UgZmxhZ3MuYCwgW1xuICAgICAgICAvLyBubyBmbGFncz8gIGFsbCBkZWZhdWx0P1xuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBOb0Jvd01vZGUgPSBuZXcgUHJlc2V0KHRoaXMsICdObyBCb3cgTW9kZScsIGBcbiAgICAgIFRoZSB0b3dlciBpcyBvcGVuIGZyb20gdGhlIHN0YXJ0LCBhcyBzb29uIGFzIHlvdSdyZSByZWFkeSBmb3IgaXQuYCwgW1xuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBNb25zdGVycy5Ub3dlclJvYm90cyxcbiAgICAgICAgSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIsXG4gICAgICAgIFJvdXRpbmcuTm9Cb3dNb2RlLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IEFkdmFuY2VkID0gbmV3IFByZXNldCh0aGlzLCAnQWR2YW5jZWQnLCBgXG4gICAgICBBIGJhbGFuY2VkIHJhbmRvbWl6YXRpb24gd2l0aCBxdWl0ZSBhIGJpdCBtb3JlIGRpZmZpY3VsdHkuYCwgW1xuICAgICAgICBHbGl0Y2hlcy5HaGV0dG9GbGlnaHQsXG4gICAgICAgIEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsXG4gICAgICAgIEdsaXRjaGVzLlN0YXR1ZUdsaXRjaCxcbiAgICAgICAgW0dsaXRjaGVzLlN3b3JkQ2hhcmdlR2xpdGNoLCAnISddLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmFycmllcixcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLFxuICAgICAgICBOb0d1YXJhbnRlZXMuR2FzTWFzayxcbiAgICAgICAgSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIsXG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIE1vbnN0ZXJzLlRvd2VyUm9ib3RzLFxuICAgICAgICBSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZU1hcHMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVBcmVhcyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUhvdXNlcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplVHJhZGVzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsXG4gICAgICAgIFdvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IFdpbGRXYXJwID0gbmV3IFByZXNldCh0aGlzLCAnV2lsZCBXYXJwJywgYFxuICAgICAgU2lnbmlmaWNhbnRseSBvcGVucyB1cCB0aGUgZ2FtZSByaWdodCBmcm9tIHRoZSBzdGFydCB3aXRoIHdpbGRcbiAgICAgIHdhcnAgaW4gbG9naWMuYCwgW1xuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVSZWZyZXNoLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXaWxkV2FycCxcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBIYXJkY29yZSA9IG5ldyBQcmVzZXQodGhpcywgJ0hhcmRjb3JlJywgYFxuICAgICAgTm90IGZvciB0aGUgZmFpbnQgb2YgaGVhcnQuICBHb29kIGx1Y2suYCwgW1xuICAgICAgICBOb0d1YXJhbnRlZXMuQmFycmllcixcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLFxuICAgICAgICBIYXJkTW9kZS5FeHBlcmllbmNlU2NhbGVzU2xvd2VyLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgSGFyZE1vZGUuUGVybWFkZWF0aCxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVNYXBzLFxuICAgICAgICBXb3JsZC5TaHVmZmxlQXJlYXMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVIb3VzZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVRyYWRlcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzLFxuICAgICAgICBXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IEZ1bGxTdHVwaWQgPSBuZXcgUHJlc2V0KHRoaXMsICdUaGUgRnVsbCBTdHVwaWQnLCBgXG4gICAgICBPbmx5IFRoZUF4ZU1hbiBoYXMgZXZlciBjb21wbGV0ZWQgdGhpcy4gIEJlIHN1cmUgdG8gcmVjb3JkIHRoaXMgYmVjYXVzZVxuICAgICAgcGljcyBvciBpdCBkaWRuJ3QgaGFwcGVuLmAsIFsgXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXJyaWVyLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsXG4gICAgICAgIEhhcmRNb2RlLkJsYWNrb3V0LFxuICAgICAgICBIYXJkTW9kZS5FeHBlcmllbmNlU2NhbGVzU2xvd2VyLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgSGFyZE1vZGUuUGVybWFkZWF0aCxcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgV29ybGQuUmFuZG9taXplTWFwcyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUFyZWFzLFxuICAgICAgICBXb3JsZC5TaHVmZmxlSG91c2VzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVUcmFkZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUdvYUZsb29ycyxcbiAgICAgICAgV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsXG4gICAgICBdKTtcblxuICByZWFkb25seSBNeXN0ZXJ5ID0gbmV3IFByZXNldCh0aGlzLCAnTXlzdGVyeScsIGBcbiAgICAgIEV2ZW4gdGhlIG9wdGlvbnMgYXJlIHJhbmRvbS5gLCBbXG4gICAgICAgIFtXb3JsZC5TaHVmZmxlQXJlYXMsICc/J10sXG4gICAgICAgIFtXb3JsZC5TaHVmZmxlSG91c2VzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplTWFwcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVRyYWRlcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzLCAnPyddLFxuICAgICAgICBbV29ybGQuU2h1ZmZsZUdvYUZsb29ycywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVNwcml0ZUNvbG9ycywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwLCAnPyddLFxuICAgICAgICBbUm91dGluZy5PcmJzTm90UmVxdWlyZWQsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk5vQm93TW9kZSwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuU3RvcnlNb2RlLCAnPyddLFxuICAgICAgICBbUm91dGluZy5WYW5pbGxhRG9scGhpbiwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuUmFnZVNraXAsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5UcmlnZ2VyU2tpcCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlN0YXR1ZUdsaXRjaCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLkdoZXR0b0ZsaWdodCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlN3b3JkQ2hhcmdlR2xpdGNoLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCwgJz8nXSxcbiAgICAgICAgW0Flc3RoZXRpY3MuUmFuZG9taXplTXVzaWMsICc/J10sXG4gICAgICAgIFtBZXN0aGV0aWNzLlJhbmRvbWl6ZU1hcENvbG9ycywgJz8nXSxcbiAgICAgICAgW01vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsICc/J10sXG4gICAgICAgIFtNb25zdGVycy5Ub3dlclJvYm90cywgJz8nXSxcbiAgICAgICAgW0Vhc3lNb2RlLk5vU2h1ZmZsZU1pbWljcywgJz8nXSxcbiAgICAgICAgW0Vhc3lNb2RlLlByZXNlcnZlVW5pcXVlQ2hlY2tzLCAnPyddLFxuICAgICAgICBbTm9HdWFyYW50ZWVzLkJhcnJpZXIsICc/J10sXG4gICAgICAgIFtOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsICc/J10sXG4gICAgICAgIFtOb0d1YXJhbnRlZXMuR2FzTWFzaywgJz8nXSxcbiAgICAgICAgW1ZhbmlsbGEuRHluYSwgJz8nXSxcbiAgICAgICAgW1ZhbmlsbGEuQm9udXNJdGVtcywgJz8nXSxcbiAgICAgICAgW1ZhbmlsbGEuTWFwcywgJz8nXSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEZsYWdTZWN0aW9uIHtcbiAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2U6IEZsYWdTZWN0aW9uO1xuICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBzZWN0aW9ucyA9IG5ldyBTZXQ8RmxhZ1NlY3Rpb24+KCk7XG5cbiAgc3RhdGljIGFsbCgpOiBGbGFnU2VjdGlvbltdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMuc2VjdGlvbnNdO1xuICB9XG5cbiAgcHJvdGVjdGVkIHN0YXRpYyBmbGFnKG5hbWU6IHN0cmluZywgb3B0czogYW55KTogRmxhZyB7XG4gICAgRmxhZ1NlY3Rpb24uc2VjdGlvbnMuYWRkKFxuICAgICAgICB0aGlzLmluc3RhbmNlIHx8ICh0aGlzLmluc3RhbmNlID0gbmV3ICh0aGlzIGFzIGFueSkoKSkpO1xuICAgIGNvbnN0IGZsYWcgPSBuZXcgRmxhZyhuYW1lLCBvcHRzKTtcbiAgICBpZiAoIW5hbWUuc3RhcnRzV2l0aCh0aGlzLmluc3RhbmNlLnByZWZpeCkpIHRocm93IG5ldyBFcnJvcihgYmFkIGZsYWdgKTtcbiAgICB0aGlzLmluc3RhbmNlLmZsYWdzLnNldChuYW1lLCBmbGFnKTtcbiAgICByZXR1cm4gZmxhZztcbiAgfVxuXG4gIGFic3RyYWN0IHJlYWRvbmx5IHByZWZpeDogc3RyaW5nO1xuICBhYnN0cmFjdCByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuICByZWFkb25seSBmbGFncyA9IG5ldyBNYXA8c3RyaW5nLCBGbGFnPigpO1xufVxuXG5jbGFzcyBXb3JsZCBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1cnO1xuICByZWFkb25seSBuYW1lID0gJ1dvcmxkJztcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplTWFwcyA9IFdvcmxkLmZsYWcoJ1dtJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgbWFwcycsXG4gICAgdGV4dDogYEluZGl2aWR1YWwgbWFwcyBhcmUgcmFuZG9taXplZC4gIEZvciBub3cgdGhpcyBpcyBvbmx5IGEgc3Vic2V0IG9mXG4gICAgICAgICAgIHBvc3NpYmxlIG1hcHMuICBBIHJhbmRvbWl6ZWQgbWFwIHdpbGwgaGF2ZSBhbGwgdGhlIHNhbWUgZmVhdHVyZXNcbiAgICAgICAgICAgKGV4aXRzLCBjaGVzdHMsIE5QQ3MsIGV0YykgZXhjZXB0IHRoaW5ncyBhcmUgbW92ZWQgYXJvdW5kLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNodWZmbGVBcmVhcyA9IFdvcmxkLmZsYWcoJ1dhJywge1xuICAgIG5hbWU6ICdTaHVmZmxlIGFyZWFzJyxcbiAgICB0ZXh0OiBgU2h1ZmZsZXMgc29tZSBvciBhbGwgYXJlYSBjb25uZWN0aW9ucy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTaHVmZmxlSG91c2VzID0gV29ybGQuZmxhZygnV2gnLCB7XG4gICAgbmFtZTogJ1NodWZmbGUgaG91c2UgZW50cmFuY2VzJyxcbiAgICB0ZXh0OiBgU2h1ZmZsZXMgYWxsIHRoZSBob3VzZSBlbnRyYW5jZXMsIGFzIHdlbGwgYXMgYSBoYW5kZnVsIG9mIG90aGVyXG4gICAgICAgICAgIHRoaW5ncywgbGlrZSB0aGUgcGFsYWNlL2ZvcnRyZXNzLXR5cGUgZW50cmFuY2VzIGF0IHRoZSB0b3Agb2ZcbiAgICAgICAgICAgc2V2ZXJhbCB0b3ducywgYW5kIHN0YW5kYWxvbmUgaG91c2VzLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVRyYWRlcyA9IFdvcmxkLmZsYWcoJ1d0Jywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgdHJhZGUtaW4gaXRlbXMnLFxuICAgIHRleHQ6IGBJdGVtcyBleHBlY3RlZCBieSB2YXJpb3VzIE5QQ3Mgd2lsbCBiZSBzaHVmZmxlZDogc3BlY2lmaWNhbGx5LFxuICAgICAgICAgICBTdGF0dWUgb2YgT255eCwgS2lyaXNhIFBsYW50LCBMb3ZlIFBlbmRhbnQsIEl2b3J5IFN0YXR1ZSwgRm9nXG4gICAgICAgICAgIExhbXAsIGFuZCBGbHV0ZSBvZiBMaW1lIChmb3IgQWthaGFuYSkuICBSYWdlIHdpbGwgZXhwZWN0IGFcbiAgICAgICAgICAgcmFuZG9tIHN3b3JkLCBhbmQgVG9ybmVsIHdpbGwgZXhwZWN0IGEgcmFuZG9tIGJyYWNlbGV0LmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFVuaWRlbnRpZmllZEtleUl0ZW1zID0gV29ybGQuZmxhZygnV3UnLCB7XG4gICAgbmFtZTogJ1VuaWRlbnRpZmllZCBrZXkgaXRlbXMnLFxuICAgIHRleHQ6IGBJdGVtIG5hbWVzIHdpbGwgYmUgZ2VuZXJpYyBhbmQgZWZmZWN0cyB3aWxsIGJlIHNodWZmbGVkLiAgVGhpc1xuICAgICAgICAgICBpbmNsdWRlcyBrZXlzLCBmbHV0ZXMsIGxhbXBzLCBhbmQgc3RhdHVlcy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVXYWxsRWxlbWVudHMgPSBXb3JsZC5mbGFnKCdXZScsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIGVsZW1lbnRzIHRvIGJyZWFrIHdhbGxzJyxcbiAgICB0ZXh0OiBgV2FsbHMgd2lsbCByZXF1aXJlIGEgcmFuZG9taXplZCBlbGVtZW50IHRvIGJyZWFrLiAgTm9ybWFsIHJvY2sgYW5kXG4gICAgICAgICAgIGljZSB3YWxscyB3aWxsIGluZGljYXRlIHRoZSByZXF1aXJlZCBlbGVtZW50IGJ5IHRoZSBjb2xvciAobGlnaHRcbiAgICAgICAgICAgZ3JleSBvciB5ZWxsb3cgZm9yIHdpbmQsIGJsdWUgZm9yIGZpcmUsIGJyaWdodCBvcmFuZ2UgKFwiZW1iZXJzXCIpIGZvclxuICAgICAgICAgICB3YXRlciwgb3IgZGFyayBncmV5IChcInN0ZWVsXCIpIGZvciB0aHVuZGVyLiAgVGhlIGVsZW1lbnQgdG8gYnJlYWtcbiAgICAgICAgICAgdGhlc2Ugd2FsbHMgaXMgdGhlIHNhbWUgdGhyb3VnaG91dCBhbiBhcmVhLiAgSXJvbiB3YWxscyByZXF1aXJlIGFcbiAgICAgICAgICAgb25lLW9mZiByYW5kb20gZWxlbWVudCwgd2l0aCBubyB2aXN1YWwgY3VlLCBhbmQgdHdvIHdhbGxzIGluIHRoZVxuICAgICAgICAgICBzYW1lIGFyZWEgbWF5IGhhdmUgZGlmZmVyZW50IHJlcXVpcmVtZW50cy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU2h1ZmZsZUdvYUZsb29ycyA9IFdvcmxkLmZsYWcoJ1dnJywge1xuICAgIG5hbWU6ICdTaHVmZmxlIEdvYSBmb3J0cmVzcyBmbG9vcnMnLFxuICAgIC8vIFRPRE8gLSBzaHVmZmxlIHRoZSBhcmVhLXRvLWJvc3MgY29ubmVjdGlvbnMsIHRvby5cbiAgICB0ZXh0OiBgVGhlIGZvdXIgYXJlYXMgb2YgR29hIGZvcnRyZXNzIHdpbGwgYXBwZWFyIGluIGEgcmFuZG9tIG9yZGVyLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVTcHJpdGVDb2xvcnMgPSBXb3JsZC5mbGFnKCdXcycsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIHNwcml0ZSBjb2xvcnMnLFxuICAgIHRleHQ6IGBNb25zdGVycyBhbmQgTlBDcyB3aWxsIGhhdmUgZGlmZmVyZW50IGNvbG9ycy4gIFRoaXMgaXMgbm90IGFuXG4gICAgICAgICAgIG9wdGlvbmFsIGZsYWcgYmVjYXVzZSBpdCBhZmZlY3RzIHdoYXQgbW9uc3RlcnMgY2FuIGJlIGdyb3VwZWRcbiAgICAgICAgICAgdG9nZXRoZXIuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVdpbGRXYXJwID0gV29ybGQuZmxhZygnV3cnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSB3aWxkIHdhcnAnLFxuICAgIHRleHQ6IGBXaWxkIHdhcnAgd2lsbCBnbyB0byBNZXphbWUgU2hyaW5lIGFuZCAxNSBvdGhlciByYW5kb20gbG9jYXRpb25zLlxuICAgICAgICAgICBUaGVzZSBsb2NhdGlvbnMgd2lsbCBiZSBjb25zaWRlcmVkIGluLWxvZ2ljLmAsXG4gICAgZXhjbHVkZXM6IFsnVncnXSxcbiAgfSk7XG59XG5cbmNsYXNzIFJvdXRpbmcgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdSJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdSb3V0aW5nJztcblxuICBzdGF0aWMgcmVhZG9ubHkgU3RvcnlNb2RlID0gUm91dGluZy5mbGFnKCdScycsIHtcbiAgICBuYW1lOiAnU3RvcnkgTW9kZScsXG4gICAgdGV4dDogYERyYXlnb24gMiB3b24ndCBzcGF3biB1bmxlc3MgeW91IGhhdmUgYWxsIGZvdXIgc3dvcmRzIGFuZCBoYXZlXG4gICAgICAgICAgIGRlZmVhdGVkIGFsbCBtYWpvciBib3NzZXMgb2YgdGhlIHRldHJhcmNoeS5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9Cb3dNb2RlID0gUm91dGluZy5mbGFnKCdSYicsIHtcbiAgICBuYW1lOiAnTm8gQm93IG1vZGUnLFxuICAgIHRleHQ6IGBObyBpdGVtcyBhcmUgcmVxdWlyZWQgdG8gZmluaXNoIHRoZSBnYW1lLiAgQW4gZXhpdCBpcyBhZGRlZCBmcm9tXG4gICAgICAgICAgIE1lemFtZSBzaHJpbmUgZGlyZWN0bHkgdG8gdGhlIERyYXlnb24gMiBmaWdodCAoYW5kIHRoZSBub3JtYWwgZW50cmFuY2VcbiAgICAgICAgICAgaXMgcmVtb3ZlZCkuICBEcmF5Z29uIDIgc3Bhd25zIGF1dG9tYXRpY2FsbHkgd2l0aCBubyBCb3cgb2YgVHJ1dGguYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE9yYnNOb3RSZXF1aXJlZCA9IFJvdXRpbmcuZmxhZygnUm8nLCB7XG4gICAgbmFtZTogJ09yYnMgbm90IHJlcXVpcmVkIHRvIGJyZWFrIHdhbGxzJyxcbiAgICB0ZXh0OiBgV2FsbHMgY2FuIGJlIGJyb2tlbiBhbmQgYnJpZGdlcyBmb3JtZWQgd2l0aCBsZXZlbCAxIHNob3RzLmBcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vVGh1bmRlclN3b3JkV2FycCA9IFJvdXRpbmcuZmxhZygnUnQnLCB7XG4gICAgbmFtZTogJ05vIFN3b3JkIG9mIFRodW5kZXIgd2FycCcsXG4gICAgdGV4dDogYE5vcm1hbGx5IHdoZW4gYWNxdWlyaW5nIHRoZSB0aHVuZGVyIHN3b3JkLCB0aGUgcGxheWVyIGlzIGluc3RhbnRseVxuICAgICAgICAgICB3YXJwZWQgdG8gYSByYW5kb20gdG93bi4gIFRoaXMgZmxhZyBkaXNhYmxlcyB0aGUgd2FycC4gIElmIHNldCBhc1xuICAgICAgICAgICBcIlIhdFwiLCB0aGVuIHRoZSB3YXJwIHdpbGwgYWx3YXlzIGdvIHRvIFNoeXJvbiwgbGlrZSBpbiB2YW5pbGxhLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFZhbmlsbGFEb2xwaGluID0gUm91dGluZy5mbGFnKCdSZCcsIHtcbiAgICBuYW1lOiAnVmFuaWxsYSBEb2xwaGluIGludGVyYWN0aW9ucycsXG4gICAgdGV4dDogYEJ5IGRlZmF1bHQsIHRoZSByYW5kb21pemVyIGNoYW5nZXMgYSBudW1iZXIgb2YgZG9scGhpbiBhbmQgYm9hdFxuICAgICAgICAgICBpbnRlcmFjdGlvbnM6ICgxKSBoZWFsaW5nIHRoZSBkb2xwaGluIGFuZCBoYXZpbmcgdGhlIFNoZWxsIEZsdXRlXG4gICAgICAgICAgIGlzIG5vIGxvbmdlciByZXF1aXJlZCBiZWZvcmUgdGhlIGZpc2hlcm1hbiBzcGF3bnM6IGluc3RlYWQsIGhlXG4gICAgICAgICAgIHdpbGwgc3Bhd24gYXMgc29vbiBhcyB5b3UgaGF2ZSB0aGUgaXRlbSBoZSB3YW50czsgKDIpIHRhbGtpbmcgdG9cbiAgICAgICAgICAgS2Vuc3UgaW4gdGhlIGJlYWNoIGNhYmluIGlzIG5vIGxvbmdlciByZXF1aXJlZCBmb3IgdGhlIFNoZWxsIEZsdXRlXG4gICAgICAgICAgIHRvIHdvcms6IGluc3RlYWQsIHRoZSBTaGVsbCBGbHV0ZSB3aWxsIGFsd2F5cyB3b3JrLCBhbmQgS2Vuc3Ugd2lsbFxuICAgICAgICAgICBzcGF3biBhZnRlciB0aGUgRm9nIExhbXAgaXMgdHVybmVkIGluIGFuZCB3aWxsIGdpdmUgYSBrZXkgaXRlbVxuICAgICAgICAgICBjaGVjay4gIFRoaXMgZmxhZyByZXN0b3JlcyB0aGUgdmFuaWxsYSBpbnRlcmFjdGlvbiB3aGVyZSBoZWFsaW5nXG4gICAgICAgICAgIGFuZCBzaGVsbCBmbHV0ZSBhcmUgcmVxdWlyZWQsIGFuZCBLZW5zdSBubyBsb25nZXIgZHJvcHMgYW4gaXRlbS5gLFxuICB9KTtcbn1cblxuY2xhc3MgR2xpdGNoZXMgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdHJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdHbGl0Y2hlcyc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgQnkgZGVmYXVsdCwgdGhlIHJhbmRvbWl6ZXIgZGlzYWJsZXMgYWxsIGtub3duIGdsaXRjaGVzIChleGNlcHQgZ2hldHRvXG4gICAgICBmbGlnaHQpLiAgVGhlc2UgZmxhZ3Mgc2VsZWN0aXZlbHkgcmUtZW5hYmxlIGNlcnRhaW4gZ2xpdGNoZXMuICBNb3N0IG9mXG4gICAgICB0aGVzZSBmbGFncyBoYXZlIHR3byBtb2Rlczogbm9ybWFsbHkgZW5hYmxpbmcgYSBnbGl0Y2ggd2lsbCBhZGQgaXQgYXNcbiAgICAgIHBvc3NpYmx5IHJlcXVpcmVkIGJ5IGxvZ2ljLCBidXQgY2xpY2tpbmcgYSBzZWNvbmQgdGltZSB3aWxsIGFkZCBhICchJ1xuICAgICAgYW5kIGVuYWJsZSB0aGUgZ2xpdGNoIG91dHNpZGUgb2YgbG9naWMgKGUuZy4gXCJHIWNcIikuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgR2hldHRvRmxpZ2h0ID0gR2xpdGNoZXMuZmxhZygnR2YnLCB7XG4gICAgbmFtZTogJ0doZXR0byBmbGlnaHQnLFxuICAgIHRleHQ6IGBHaGV0dG8gZmxpZ2h0IGFsbG93cyB1c2luZyBEb2xwaGluIGFuZCBSYWJiaXQgQm9vdHMgdG8gZmx5IHVwIHRoZVxuICAgICAgICAgICB3YXRlcmZhbGxzIGluIHRoZSBBbmdyeSBTZWEgKHdpdGhvdXQgY2FsbWluZyB0aGUgd2hpcmxwb29scykuXG4gICAgICAgICAgIFRoaXMgaXMgZG9uZSBieSBzd2ltbWluZyB1cCB0byBhIGRpYWdvbmFsIGJlYWNoIGFuZCBqdW1waW5nXG4gICAgICAgICAgIGluIGEgZGlmZmVyZW50IGRpcmVjdGlvbiBpbW1lZGlhdGVseSBiZWZvcmUgZGlzZW1iYXJraW5nLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTdGF0dWVHbGl0Y2ggPSBHbGl0Y2hlcy5mbGFnKCdHcycsIHtcbiAgICBuYW1lOiAnU3RhdHVlIGdsaXRjaCcsXG4gICAgdGV4dDogYFN0YXR1ZSBnbGl0Y2ggYWxsb3dzIGdldHRpbmcgYmVoaW5kIHN0YXR1ZXMgdGhhdCBibG9jayBjZXJ0YWluXG4gICAgICAgICAgIGVudHJhbmNlczogdGhlIGd1YXJkcyBpbiBQb3J0b2EsIEFtYXpvbmVzLCBPYWssIEdvYSwgYW5kIFNoeXJvbixcbiAgICAgICAgICAgYXMgd2VsbCBhcyB0aGUgc3RhdHVlcyBpbiB0aGUgV2F0ZXJmYWxsIENhdmUuICBJdCBpcyBkb25lIGJ5XG4gICAgICAgICAgIGFwcHJvYWNoaW5nIHRoZSBzdGF0dWUgZnJvbSB0aGUgdG9wIHJpZ2h0IGFuZCBob2xkaW5nIGRvd24gYW5kXG4gICAgICAgICAgIGxlZnQgb24gdGhlIGNvbnRyb2xsZXIgd2hpbGUgbWFzaGluZyBCLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE10U2FicmVSZXF1aXJlbWVudFNraXAgPSBHbGl0Y2hlcy5mbGFnKCdHbicsIHtcbiAgICBuYW1lOiAnTXQgU2FicmUgcmVxdWlyZW1lbnRzIHNraXAnLFxuICAgIHRleHQ6IGBFbnRlcmluZyBNdCBTYWJyZSBOb3J0aCBub3JtYWxseSByZXF1aXJlcyAoMSkgaGF2aW5nIFRlbGVwb3J0LFxuICAgICAgICAgICBhbmQgKDIpIHRhbGtpbmcgdG8gdGhlIHJhYmJpdCBpbiBMZWFmIGFmdGVyIHRoZSBhYmR1Y3Rpb24gKHZpYVxuICAgICAgICAgICBUZWxlcGF0aHkpLiAgQm90aCBvZiB0aGVzZSByZXF1aXJlbWVudHMgY2FuIGJlIHNraXBwZWQ6IGZpcnN0IGJ5XG4gICAgICAgICAgIGZseWluZyBvdmVyIHRoZSByaXZlciBpbiBDb3JkZWwgcGxhaW4gcmF0aGVyIHRoYW4gY3Jvc3NpbmcgdGhlXG4gICAgICAgICAgIGJyaWRnZSwgYW5kIHRoZW4gYnkgdGhyZWFkaW5nIHRoZSBuZWVkbGUgYmV0d2VlbiB0aGUgaGl0Ym94ZXMgaW5cbiAgICAgICAgICAgTXQgU2FicmUgTm9ydGguYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU3RhdHVlR2F1bnRsZXRTa2lwID0gR2xpdGNoZXMuZmxhZygnR2cnLCB7XG4gICAgbmFtZTogJ1N0YXR1ZSBnYXVudGxldCBza2lwJyxcbiAgICB0ZXh0OiBgVGhlIHNob290aW5nIHN0YXR1ZXMgaW4gZnJvbnQgb2YgR29hIGFuZCBTdHh5IG5vcm1hbGx5IHJlcXVpcmVcbiAgICAgICAgICAgQmFycmllciB0byBwYXNzIHNhZmVseS4gIFdpdGggdGhpcyBmbGFnLCBGbGlnaHQgY2FuIGFsc28gYmUgdXNlZFxuICAgICAgICAgICBieSBmbHlpbmcgYXJvdW5kIHRoZSBlZGdlIG9mIHRoZSBzdGF0dWUuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU3dvcmRDaGFyZ2VHbGl0Y2ggPSBHbGl0Y2hlcy5mbGFnKCdHYycsIHtcbiAgICBuYW1lOiAnU3dvcmQgY2hhcmdlIGdsaXRjaCcsXG4gICAgdGV4dDogYFN3b3JkIGNoYXJnZSBnbGl0Y2ggYWxsb3dzIGNoYXJnaW5nIG9uZSBzd29yZCB0byB0aGUgbGV2ZWwgb2ZcbiAgICAgICAgICAgYW5vdGhlciBzd29yZCBieSBlcXVpcHBpbmcgdGhlIGhpZ2hlci1sZXZlbCBzd29yZCwgcmUtZW50ZXJpbmdcbiAgICAgICAgICAgdGhlIG1lbnUsIGNoYW5naW5nIHRvIHRoZSBsb3dlci1sZXZlbCBzd29yZCB3aXRob3V0IGV4aXRpbmcgdGhlXG4gICAgICAgICAgIG1lbnUsIGNyZWF0aW5nIGEgaGFyZCBzYXZlLCByZXNldHRpbmcsIGFuZCB0aGVuIGNvbnRpbnVpbmcuYCxcbiAgICBoYXJkOiB0cnVlLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBUcmlnZ2VyU2tpcCA9IEdsaXRjaGVzLmZsYWcoJ0d0Jywge1xuICAgIG5hbWU6ICdUcmlnZ2VyIHNraXAnLFxuICAgIHRleHQ6IGBBIHdpZGUgdmFyaWV0eSBvZiB0cmlnZ2VycyBhbmQgZXhpdCBzcXVhcmVzIGNhbiBiZSBza2lwcGVkIGJ5XG4gICAgICAgICAgIHVzaW5nIGFuIGludmFsaWQgaXRlbSBldmVyeSBmcmFtZSB3aGlsZSB3YWxraW5nLiAgVGhpcyBhbGxvd3NcbiAgICAgICAgICAgYnlwYXNzaW5nIGJvdGggTXQgU2FicmUgTm9ydGggZW50cmFuY2UgdHJpZ2dlcnMsIHRoZSBFdmlsIFNwaXJpdFxuICAgICAgICAgICBJc2xhbmQgZW50cmFuY2UgdHJpZ2dlciwgdHJpZ2dlcnMgZm9yIGd1YXJkcyB0byBtb3ZlLCBzbG9wZXMsXG4gICAgICAgICAgIGRhbWFnZSB0aWxlcywgYW5kIHNlYW1sZXNzIG1hcCB0cmFuc2l0aW9ucy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhZ2VTa2lwID0gR2xpdGNoZXMuZmxhZygnR3InLCB7XG4gICAgbmFtZTogJ1JhZ2Ugc2tpcCcsXG4gICAgdGV4dDogYFJhZ2UgY2FuIGJlIHNraXBwZWQgYnkgZGFtYWdlLWJvb3N0aW5nIGRpYWdvbmFsbHkgaW50byB0aGUgTGltZVxuICAgICAgICAgICBUcmVlIExha2Ugc2NyZWVuLiAgVGhpcyBwcm92aWRlcyBhY2Nlc3MgdG8gdGhlIGFyZWEgYmV5b25kIHRoZVxuICAgICAgICAgICBsYWtlIGlmIGZsaWdodCBvciBicmlkZ2VzIGFyZSBhdmFpbGFibGUuICBGb3Igc2ltcGxpY2l0eSwgdGhlXG4gICAgICAgICAgIGxvZ2ljIG9ubHkgYXNzdW1lcyB0aGlzIGlzIHBvc3NpYmxlIGlmIHRoZXJlJ3MgYSBmbHllci5gLFxuICAgIGhhcmQ6IHRydWUsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG59XG5cbmNsYXNzIEFlc3RoZXRpY3MgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdBJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdBZXN0aGV0aWNzJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBUaGVzZSBmbGFncyBkb24ndCBkaXJlY3RseSBhZmZlY3QgZ2FtZXBsYXkgb3Igc2h1ZmZsaW5nLCBidXQgdGhleSBkb1xuICAgICAgYWZmZWN0IHRoZSBleHBlcmllbmNlIHNpZ25pZmljYW50bHkgZW5vdWdoIHRoYXQgdGhlcmUgYXJlIHRocmVlIG1vZGVzXG4gICAgICBmb3IgZWFjaDogXCJvZmZcIiwgXCJvcHRpb25hbFwiIChubyBleGNsYW1hdGlvbiBwb2ludCksIGFuZCBcInJlcXVpcmVkXCJcbiAgICAgIChleGNsYW1hdGlvbiBwb2ludCkuICBUaGUgZmlyc3QgdHdvIGFyZSBlcXVpdmFsZW50IGZvciBzZWVkIGdlbmVyYXRpb25cbiAgICAgIHB1cnBvc2VzLCBzbyB0aGF0IHlvdSBjYW4gcGxheSB0aGUgc2FtZSBzZWVkIHdpdGggZWl0aGVyIHNldHRpbmcuXG4gICAgICBTZXR0aW5nIGl0IHRvIFwiIVwiIHdpbGwgY2hhbmdlIHRoZSBzZWVkLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZU11c2ljID0gQWVzdGhldGljcy5mbGFnKCdBbScsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIGJhY2tncm91bmQgbXVzaWMnLFxuICAgIG1vZGVzOiAnIScsXG4gICAgb3B0aW9uYWw6IE5PX0JBTkcsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb011c2ljID0gQWVzdGhldGljcy5mbGFnKCdBcycsIHtcbiAgICBuYW1lOiAnTm8gYmFja2dyb3VuZCBtdXNpYycsXG4gICAgb3B0aW9uYWw6IE9QVElPTkFMLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplTWFwQ29sb3JzID0gQWVzdGhldGljcy5mbGFnKCdBYycsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIG1hcCBjb2xvcnMnLFxuICAgIG1vZGVzOiAnIScsXG4gICAgb3B0aW9uYWw6IE5PX0JBTkcsXG4gIH0pO1xufVxuXG5jbGFzcyBNb25zdGVycyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ00nO1xuICByZWFkb25seSBuYW1lID0gJ01vbnN0ZXJzJztcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplV2Vha25lc3NlcyA9IE1vbnN0ZXJzLmZsYWcoJ01lJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgbW9uc3RlciB3ZWFrbmVzc2VzJyxcbiAgICB0ZXh0OiBgTW9uc3RlciBhbmQgYm9zcyBlbGVtZW50YWwgd2Vha25lc3NlcyBhcmUgc2h1ZmZsZWQuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFRvd2VyUm9ib3RzID0gTW9uc3RlcnMuZmxhZygnTXQnLCB7XG4gICAgbmFtZTogJ1NodWZmbGUgdG93ZXIgcm9ib3RzJyxcbiAgICB0ZXh0OiBgVG93ZXIgcm9ib3RzIHdpbGwgYmUgc2h1ZmZsZWQgaW50byB0aGUgbm9ybWFsIHBvb2wuICBBdCBzb21lXG4gICAgICAgICAgIHBvaW50LCBub3JtYWwgbW9uc3RlcnMgbWF5IGJlIHNodWZmbGVkIGludG8gdGhlIHRvd2VyIGFzIHdlbGwuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcbn1cblxuY2xhc3MgRWFzeU1vZGUgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdFJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdFYXN5IE1vZGUnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZSBmb2xsb3dpbmcgb3B0aW9ucyBtYWtlIHBhcnRzIG9mIHRoZSBnYW1lIGVhc2llci5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb1NodWZmbGVNaW1pY3MgPSBFYXN5TW9kZS5mbGFnKCdFdCcsIHtcbiAgICBuYW1lOiBgRG9uJ3Qgc2h1ZmZsZSBtaW1pY3MuYCxcbiAgICB0ZXh0OiBgTWltaWNzIHdpbGwgYmUgaW4gdGhlaXIgdmFuaWxsYSBsb2NhdGlvbnMuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFByZXNlcnZlVW5pcXVlQ2hlY2tzID0gRWFzeU1vZGUuZmxhZygnRXUnLCB7XG4gICAgbmFtZTogJ0tlZXAgdW5pcXVlIGl0ZW1zIGFuZCBjb25zdW1hYmxlcyBzZXBhcmF0ZScsXG4gICAgdGV4dDogYE5vcm1hbGx5IGFsbCBpdGVtcyBhbmQgbWltaWNzIGFyZSBzaHVmZmxlZCBpbnRvIGEgc2luZ2xlIHBvb2wgYW5kXG4gICAgICAgICAgIGRpc3RyaWJ1dGVkIGZyb20gdGhlcmUuICBJZiB0aGlzIGZsYWcgaXMgc2V0LCB1bmlxdWUgaXRlbXNcbiAgICAgICAgICAgKHNwZWNpZmljYWxseSwgYW55dGhpbmcgdGhhdCBjYW5ub3QgYmUgc29sZCkgd2lsbCBvbmx5IGJlIGZvdW5kIGluXG4gICAgICAgICAgIGVpdGhlciAoYSkgY2hlY2tzIHRoYXQgaGVsZCB1bmlxdWUgaXRlbXMgaW4gdmFuaWxsYSwgb3IgKGIpIGJvc3NcbiAgICAgICAgICAgZHJvcHMuICBDaGVzdHMgY29udGFpbmluZyBjb25zdW1hYmxlcyBpbiB2YW5pbGxhIG1heSBiZSBzYWZlbHlcbiAgICAgICAgICAgaWdub3JlZCwgYnV0IGNoZXN0cyBjb250YWluaW5nIHVuaXF1ZSBpdGVtcyBpbiB2YW5pbGxhIG1heSBzdGlsbFxuICAgICAgICAgICBlbmQgdXAgd2l0aCBub24tdW5pcXVlIGl0ZW1zIGJlY2F1c2Ugb2YgYm9zc2VzIGxpa2UgVmFtcGlyZSAyIHRoYXRcbiAgICAgICAgICAgZHJvcCBjb25zdW1hYmxlcy4gIElmIG1pbWljcyBhcmUgc2h1ZmZsZWQsIHRoZXkgd2lsbCBvbmx5IGJlIGluXG4gICAgICAgICAgIGNvbnN1bWFibGUgbG9jYXRpb25zLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBEZWNyZWFzZUVuZW15RGFtYWdlID0gRWFzeU1vZGUuZmxhZygnRWQnLCB7XG4gICAgbmFtZTogJ0RlY3JlYXNlIGVuZW15IGRhbWFnZScsXG4gICAgdGV4dDogYEVuZW15IGF0dGFjayBwb3dlciB3aWxsIGJlIHNpZ25pZmljYW50bHkgZGVjcmVhc2VkIGluIHRoZSBlYXJseSBnYW1lXG4gICAgICAgICAgIChieSBhIGZhY3RvciBvZiAzKS4gIFRoZSBnYXAgd2lsbCBuYXJyb3cgaW4gdGhlIG1pZC1nYW1lIGFuZCBldmVudHVhbGx5XG4gICAgICAgICAgIHBoYXNlIG91dCBhdCBzY2FsaW5nIGxldmVsIDQwLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBHdWFyYW50ZWVTdGFydGluZ1N3b3JkID0gRWFzeU1vZGUuZmxhZygnRXMnLCB7XG4gICAgbmFtZTogJ0d1YXJhbnRlZSBzdGFydGluZyBzd29yZCcsXG4gICAgdGV4dDogYFRoZSBMZWFmIGVsZGVyIGlzIGd1YXJhbnRlZWQgdG8gZ2l2ZSBhIHN3b3JkLiAgSXQgd2lsbCBub3QgYmVcbiAgICAgICAgICAgcmVxdWlyZWQgdG8gZGVhbCB3aXRoIGFueSBlbmVtaWVzIGJlZm9yZSBmaW5kaW5nIHRoZSBmaXJzdCBzd29yZC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgR3VhcmFudGVlUmVmcmVzaCA9IEVhc3lNb2RlLmZsYWcoJ0VyJywge1xuICAgIG5hbWU6ICdHdWFyYW50ZWUgcmVmcmVzaCcsXG4gICAgdGV4dDogYEd1YXJhbnRlZXMgdGhlIFJlZnJlc2ggc3BlbGwgd2lsbCBiZSBhdmFpbGFibGUgYmVmb3JlIGZpZ2h0aW5nXG4gICAgICAgICAgIFRldHJhcmNocy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgRXhwZXJpZW5jZVNjYWxlc0Zhc3RlciA9IEVhc3lNb2RlLmZsYWcoJ0V4Jywge1xuICAgIG5hbWU6ICdFeHBlcmllbmNlIHNjYWxlcyBmYXN0ZXInLFxuICAgIHRleHQ6IGBMZXNzIGdyaW5kaW5nIHdpbGwgYmUgcmVxdWlyZWQgdG8gXCJrZWVwIHVwXCIgd2l0aCB0aGUgZ2FtZSBkaWZmaWN1bHR5LmAsXG4gICAgZXhjbHVkZXM6IFsnSHgnXSxcbiAgfSk7XG59XG5cbmNsYXNzIE5vR3VhcmFudGVlcyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ04nO1xuICByZWFkb25seSBuYW1lID0gJ05vIGd1YXJhbnRlZXMnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFJlbW92ZXMgdmFyaW91cyBndWFyYW50ZWVzIGZyb20gdGhlIGxvZ2ljLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEJhdHRsZU1hZ2ljID0gTm9HdWFyYW50ZWVzLmZsYWcoJ053Jywge1xuICAgIG5hbWU6ICdCYXR0bGUgbWFnaWMgbm90IGd1YXJhbnRlZWQnLFxuICAgIHRleHQ6IGBOb3JtYWxseSwgdGhlIGxvZ2ljIHdpbGwgZ3VhcmFudGVlIHRoYXQgbGV2ZWwgMyBzd29yZCBjaGFyZ2VzIGFyZVxuICAgICAgICAgICBhdmFpbGFibGUgYmVmb3JlIGZpZ2h0aW5nIHRoZSB0ZXRyYXJjaHMgKHdpdGggdGhlIGV4Y2VwdGlvbiBvZiBLYXJtaW5lLFxuICAgICAgICAgICB3aG8gb25seSByZXF1aXJlcyBsZXZlbCAyKS4gIFRoaXMgZGlzYWJsZXMgdGhhdCBjaGVjay5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBNYXRjaGluZ1N3b3JkID0gTm9HdWFyYW50ZWVzLmZsYWcoJ05zJywge1xuICAgIG5hbWU6ICdNYXRjaGluZyBzd29yZCBub3QgZ3VhcmFudGVlZCAoXCJUaW5rIE1vZGVcIiknLFxuICAgIHRleHQ6IGBFbmFibGVzIFwidGluayBzdHJhdHNcIiwgd2hlcmUgd3JvbmctZWxlbWVudCBzd29yZHMgd2lsbCBzdGlsbCBkbyBhXG4gICAgICAgICAgIHNpbmdsZSBkYW1hZ2UgcGVyIGhpdC4gIFBsYXllciBtYXkgYmUgcmVxdWlyZWQgdG8gZmlnaHQgbW9uc3RlcnNcbiAgICAgICAgICAgKGluY2x1ZGluZyBib3NzZXMpIHdpdGggdGlua3MuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgQmFycmllciA9IE5vR3VhcmFudGVlcy5mbGFnKCdOYicsIHtcbiAgICBuYW1lOiAnQmFycmllciBub3QgZ3VhcmFudGVlZCcsXG4gICAgdGV4dDogYE5vcm1hbGx5LCB0aGUgbG9naWMgd2lsbCBndWFyYW50ZWUgQmFycmllciAob3IgZWxzZSByZWZyZXNoIGFuZCBzaGllbGRcbiAgICAgICAgICAgcmluZykgYmVmb3JlIGVudGVyaW5nIFN0eHksIHRoZSBGb3J0cmVzcywgb3IgZmlnaHRpbmcgS2FybWluZS4gIFRoaXNcbiAgICAgICAgICAgZGlzYWJsZXMgdGhhdCBjaGVjay5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBHYXNNYXNrID0gTm9HdWFyYW50ZWVzLmZsYWcoJ05nJywge1xuICAgIG5hbWU6ICdHYXMgbWFzayBub3QgZ3VhcmFudGVlZCcsXG4gICAgdGV4dDogYFRoZSBsb2dpYyB3aWxsIG5vdCBndWFyYW50ZWUgZ2FzIG1hc2sgYmVmb3JlIG5lZWRpbmcgdG8gZW50ZXIgdGhlIHN3YW1wLFxuICAgICAgICAgICBub3Igd2lsbCBsZWF0aGVyIGJvb3RzIChvciBoYXptYXQgc3VpdCkgYmUgZ3VhcmFudGVlZCB0byBjcm9zcyBsb25nXG4gICAgICAgICAgIHN0cmV0Y2hlcyBvZiBzcGlrZXMuICBHYXMgbWFzayBpcyBzdGlsbCBndWFyYW50ZWVkIHRvIGtpbGwgdGhlIGluc2VjdC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xufVxuXG5jbGFzcyBIYXJkTW9kZSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0gnO1xuICByZWFkb25seSBuYW1lID0gJ0hhcmQgbW9kZSc7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vQnVmZk1lZGljYWxIZXJiID0gSGFyZE1vZGUuZmxhZygnSG0nLCB7XG4gICAgbmFtZTogYERvbid0IGJ1ZmYgbWVkaWNhbCBoZXJiIG9yIGZydWl0IG9mIHBvd2VyYCxcbiAgICB0ZXh0OiBgTWVkaWNhbCBIZXJiIGlzIG5vdCBidWZmZWQgdG8gaGVhbCA4MCBkYW1hZ2UsIHdoaWNoIGlzIGhlbHBmdWwgdG8gbWFrZVxuICAgICAgICAgICB1cCBmb3IgY2FzZXMgd2hlcmUgUmVmcmVzaCBpcyB1bmF2YWlsYWJsZSBlYXJseS4gIEZydWl0IG9mIFBvd2VyIGlzIG5vdFxuICAgICAgICAgICBidWZmZWQgdG8gcmVzdG9yZSA1NiBNUC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBNYXhTY2FsaW5nSW5Ub3dlciA9IEhhcmRNb2RlLmZsYWcoJ0h0Jywge1xuICAgIG5hbWU6ICdNYXggc2NhbGluZyBsZXZlbCBpbiB0b3dlcicsXG4gICAgdGV4dDogYEVuZW1pZXMgaW4gdGhlIHRvd2VyIHNwYXduIGF0IG1heCBzY2FsaW5nIGxldmVsLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEV4cGVyaWVuY2VTY2FsZXNTbG93ZXIgPSBIYXJkTW9kZS5mbGFnKCdIeCcsIHtcbiAgICBuYW1lOiAnRXhwZXJpZW5jZSBzY2FsZXMgc2xvd2VyJyxcbiAgICB0ZXh0OiBgTW9yZSBncmluZGluZyB3aWxsIGJlIHJlcXVpcmVkIHRvIFwia2VlcCB1cFwiIHdpdGggdGhlIGRpZmZpY3VsdHkuYCxcbiAgICBleGNsdWRlczogWydFeCddLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBDaGFyZ2VTaG90c09ubHkgPSBIYXJkTW9kZS5mbGFnKCdIYycsIHtcbiAgICBuYW1lOiAnQ2hhcmdlIHNob3RzIG9ubHknLFxuICAgIHRleHQ6IGBTdGFiYmluZyBpcyBjb21wbGV0ZWx5IGluZWZmZWN0aXZlLiAgT25seSBjaGFyZ2VkIHNob3RzIHdvcmsuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgQmxhY2tvdXQgPSBIYXJkTW9kZS5mbGFnKCdIeicsIHtcbiAgICBuYW1lOiAnQmxhY2tvdXQnLFxuICAgIHRleHQ6IGBBbGwgY2F2ZXMgYW5kIGZvcnRyZXNzZXMgYXJlIHBlcm1hbmVudGx5IGRhcmsuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUGVybWFkZWF0aCA9IEhhcmRNb2RlLmZsYWcoJ0hoJywge1xuICAgIG5hbWU6ICdQZXJtYWRlYXRoJyxcbiAgICB0ZXh0OiBgSGFyZGNvcmUgbW9kZTogY2hlY2twb2ludHMgYW5kIHNhdmVzIGFyZSByZW1vdmVkLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG59XG5cbmNsYXNzIFZhbmlsbGEgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IG5hbWUgPSAnVmFuaWxsYSc7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdWJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBPcHRpb25zIHRvIHJlc3RvcmUgdmFuaWxsYSBiZWhhdmlvciBjaGFuZ2VkIGJ5IGRlZmF1bHQuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgRHluYSA9IFZhbmlsbGEuZmxhZygnVmQnLCB7XG4gICAgbmFtZTogYERvbid0IGJ1ZmYgRHluYWAsXG4gICAgdGV4dDogYEJ5IGRlZmF1bHQsIHdlIG1ha2VzIHRoZSBEeW5hIGZpZ2h0IGEgYml0IG1vcmUgb2YgYSBjaGFsbGVuZ2UuXG4gICAgICAgICAgIFNpZGUgcG9kcyB3aWxsIGZpcmUgc2lnbmlmaWNhbnRseSBtb3JlLiAgVGhlIHNhZmUgc3BvdCBoYXMgYmVlblxuICAgICAgICAgICByZW1vdmVkLiAgVGhlIHJldmVuZ2UgYmVhbXMgcGFzcyB0aHJvdWdoIGJhcnJpZXIuICBTaWRlIHBvZHMgY2FuXG4gICAgICAgICAgIG5vdyBiZSBraWxsZWQuICBUaGlzIGZsYWcgcHJldmVudHMgdGhhdCBjaGFuZ2UuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEJvbnVzSXRlbXMgPSBWYW5pbGxhLmZsYWcoJ1ZiJywge1xuICAgIG5hbWU6IGBEb24ndCBidWZmIGJvbnVzIGl0ZW1zYCxcbiAgICB0ZXh0OiBgTGVhdGhlciBCb290cyBhcmUgY2hhbmdlZCB0byBTcGVlZCBCb290cywgd2hpY2ggaW5jcmVhc2UgcGxheWVyIHdhbGtpbmdcbiAgICAgICAgICAgc3BlZWQgKHRoaXMgYWxsb3dzIGNsaW1iaW5nIHVwIHRoZSBzbG9wZSB0byBhY2Nlc3MgdGhlIFRvcm5hZG8gQnJhY2VsZXRcbiAgICAgICAgICAgY2hlc3QsIHdoaWNoIGlzIHRha2VuIGludG8gY29uc2lkZXJhdGlvbiBieSB0aGUgbG9naWMpLiAgRGVvJ3MgcGVuZGFudFxuICAgICAgICAgICByZXN0b3JlcyBNUCB3aGlsZSBtb3ZpbmcuICBSYWJiaXQgYm9vdHMgZW5hYmxlIHN3b3JkIGNoYXJnaW5nIHVwIHRvXG4gICAgICAgICAgIGxldmVsIDIgd2hpbGUgd2Fsa2luZyAobGV2ZWwgMyBzdGlsbCByZXF1aXJlcyBiZWluZyBzdGF0aW9uYXJ5LCBzbyBhc1xuICAgICAgICAgICB0byBwcmV2ZW50IHdhc3RpbmcgdG9ucyBvZiBtYWdpYykuYCxcbiAgfSk7XG5cbiAgLy8gVE9ETyAtIGlzIGl0IHdvcnRoIGV2ZW4gYWxsb3dpbmcgdG8gdHVybiB0aGlzIG9mZj8hP1xuICBzdGF0aWMgcmVhZG9ubHkgTWFwcyA9IFZhbmlsbGEuZmxhZygnVm0nLCB7XG4gICAgbmFtZTogJ1ZhbmlsbGEgbWFwcycsXG4gICAgdGV4dDogYE5vcm1hbGx5IHRoZSByYW5kb21pemVyIGFkZHMgYSBuZXcgXCJFYXN0IENhdmVcIiB0byBWYWxsZXkgb2YgV2luZCxcbiAgICAgICAgICAgYm9ycm93ZWQgZnJvbSB0aGUgR0JDIHZlcnNpb24gb2YgdGhlIGdhbWUuICBUaGlzIGNhdmUgY29udGFpbnMgdHdvXG4gICAgICAgICAgIGNoZXN0cyAob25lIGNvbnNpZGVyZWQgYSBrZXkgaXRlbSkgb24gdGhlIHVwcGVyIGZsb29yIGFuZCBleGl0cyB0b1xuICAgICAgICAgICB0d28gcmFuZG9tIGFyZWFzIChjaG9zZW4gYmV0d2VlbiBMaW1lIFRyZWUgVmFsbGV5LCBDb3JkZWwgUGxhaW4sXG4gICAgICAgICAgIEdvYSBWYWxsZXksIG9yIERlc2VydCAyOyB0aGUgcXVpY2tzYW5kIGlzIHJlbW92ZWQgZnJvbSB0aGUgZW50cmFuY2VzXG4gICAgICAgICAgIHRvIFB5cmFtaWQgYW5kIENyeXB0KSwgb25lIHVuYmxvY2tlZCBvbiB0aGUgbG93ZXIgZmxvb3IsIGFuZCBvbmVcbiAgICAgICAgICAgZG93biB0aGUgc3RhaXJzIGFuZCBiZWhpbmQgYSByb2NrIHdhbGwgZnJvbSB0aGUgdXBwZXIgZmxvb3IuICBUaGlzXG4gICAgICAgICAgIGZsYWcgcHJldmVudHMgYWRkaW5nIHRoYXQgY2F2ZS4gIElmIHNldCBhcyBcIlYhbVwiIHRoZW4gYSBkaXJlY3QgcGF0aFxuICAgICAgICAgICB3aWxsIGluc3RlYWQgYmUgYWRkZWQgYmV0d2VlbiBWYWxsZXkgb2YgV2luZCBhbmQgTGltZSBUcmVlIFZhbGxleVxuICAgICAgICAgICAoYXMgaW4gZWFybGllciB2ZXJzaW9ucyBvZiB0aGUgcmFuZG9taXplcikuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU2hvcHMgPSBWYW5pbGxhLmZsYWcoJ1ZzJywge1xuICAgIG5hbWU6ICdWYW5pbGxhIHNob3BzJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgd2UgZGlzYWJsZSBzaG9wIGdsaXRjaCwgc2h1ZmZsZSBzaG9wIGNvbnRlbnRzLCBhbmQgdGllXG4gICAgICAgICAgIHRoZSBwcmljZXMgdG8gdGhlIHNjYWxpbmcgbGV2ZWwgKGl0ZW0gc2hvcHMgYW5kIGlubnMgaW5jcmVhc2UgYnkgYVxuICAgICAgICAgICBmYWN0b3Igb2YgMiBldmVyeSAxMCBzY2FsaW5nIGxldmVscywgYXJtb3Igc2hvcHMgZGVjcmVhc2UgYnkgYVxuICAgICAgICAgICBmYWN0b3Igb2YgMiBldmVyeSAxMiBzY2FsaW5nIGxldmVscykuICBUaGlzIGZsYWcgcHJldmVudHMgYWxsIG9mXG4gICAgICAgICAgIHRoZXNlIGNoYW5nZXMsIHJlc3RvcmluZyBzaG9wcyB0byBiZSBjb21wbGV0ZWx5IHZhbmlsbGEuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFdpbGRXYXJwID0gVmFuaWxsYS5mbGFnKCdWdycsIHtcbiAgICBuYW1lOiAnVmFuaWxsYSB3aWxkIHdhcnAnLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCBXaWxkIFdhcnAgaXMgbmVyZmVkIHRvIG9ubHkgcmV0dXJuIHRvIE1lemFtZSBTaHJpbmUuXG4gICAgICAgICAgIFRoaXMgZmxhZyByZXN0b3JlcyBpdCB0byB3b3JrIGxpa2Ugbm9ybWFsLiAgTm90ZSB0aGF0IHRoaXMgd2lsbCBwdXRcbiAgICAgICAgICAgYWxsIHdpbGQgd2FycCBsb2NhdGlvbnMgaW4gbG9naWMgdW5sZXNzIHRoZSBmbGFnIGlzIHNldCBhcyAoViF3KS5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xufVxuXG5jbGFzcyBRdWFsaXR5IGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnUSc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnUXVhbGl0eSBvZiBMaWZlJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBUaGUgZm9sbG93aW5nIHF1YWxpdHktb2YtbGlmZSBmbGFncyB0dXJuIDxpPm9mZjwvaT4gaW1wcm92ZW1lbnRzIHRoYXRcbiAgICAgIGFyZSBub3JtYWxseSBvbiBieSBkZWZhdWx0LiAgVGhleSBhcmUgb3B0aW9uYWwgYW5kIHdpbGwgbm90IGFmZmVjdCB0aGVcbiAgICAgIHNlZWQgZ2VuZXJhdGlvbi4gIFRoZXkgbWF5IGJlIHRvZ2dsZWQgZnJlZWx5IGluIHJhY2UgbW9kZS5gO1xuXG4gIC8vIFRPRE8gLSByZW1lbWJlciBwcmVmZXJlbmNlcyBhbmQgYXV0by1hcHBseT9cbiAgc3RhdGljIHJlYWRvbmx5IE5vQXV0b0VxdWlwID0gUXVhbGl0eS5mbGFnKCdRYScsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYXV0b21hdGljYWxseSBlcXVpcCBvcmJzIGFuZCBicmFjZWxldHNgLFxuICAgIHRleHQ6IGBQcmV2ZW50cyBhZGRpbmcgYSBxdWFsaXR5LW9mLWxpZmUgaW1wcm92ZW1lbnQgdG8gYXV0b21hdGljYWxseSBlcXVpcFxuICAgICAgICAgICB0aGUgY29ycmVzcG9uZGluZyBvcmIvYnJhY2VsZXQgd2hlbmV2ZXIgY2hhbmdpbmcgc3dvcmRzLmAsXG4gICAgb3B0aW9uYWw6IE9QVElPTkFMLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9Db250cm9sbGVyU2hvcnRjdXRzID0gUXVhbGl0eS5mbGFnKCdRYycsIHtcbiAgICBuYW1lOiAnRGlzYWJsZSBjb250cm9sbGVyIHNob3J0Y3V0cycsXG4gICAgdGV4dDogYEJ5IGRlZmF1bHQsIHdlIGRpc2FibGUgc2Vjb25kIGNvbnRyb2xsZXIgaW5wdXQgYW5kIGluc3RlYWQgZW5hYmxlXG4gICAgICAgICAgIHNvbWUgbmV3IHNob3J0Y3V0cyBvbiBjb250cm9sbGVyIDE6IFN0YXJ0K0ErQiBmb3Igd2lsZCB3YXJwLCBhbmRcbiAgICAgICAgICAgU2VsZWN0K0IgdG8gcXVpY2tseSBjaGFuZ2Ugc3dvcmRzLiAgVG8gc3VwcG9ydCB0aGlzLCB0aGUgYWN0aW9uIG9mXG4gICAgICAgICAgIHRoZSBzdGFydCBhbmQgc2VsZWN0IGJ1dHRvbnMgaXMgY2hhbmdlZCBzbGlnaHRseS4gIFRoaXMgZmxhZ1xuICAgICAgICAgICBkaXNhYmxlcyB0aGlzIGNoYW5nZSBhbmQgcmV0YWlucyBub3JtYWwgYmVoYXZpb3IuYCxcbiAgICBvcHRpb25hbDogT1BUSU9OQUwsXG4gIH0pO1xufVxuXG5jbGFzcyBEZWJ1Z01vZGUgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIC8vIFRPRE8gLSBob3cgdG8gZGlzY292ZXIgRmxhZ1NlY3Rpb25zPz8/XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdEJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdEZWJ1ZyBNb2RlJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBUaGVzZSBvcHRpb25zIGFyZSBoZWxwZnVsIGZvciBleHBsb3Jpbmcgb3IgZGVidWdnaW5nLiAgTm90ZSB0aGF0LFxuICAgICAgd2hpbGUgdGhleSBkbyBub3QgZGlyZWN0bHkgYWZmZWN0IGFueSByYW5kb21pemF0aW9uLCB0aGV5XG4gICAgICA8aT5kbzwvaT4gZmFjdG9yIGludG8gdGhlIHNlZWQgdG8gcHJldmVudCBjaGVhdGluZywgYW5kIHRoZXlcbiAgICAgIHdpbGwgcmVtb3ZlIHRoZSBvcHRpb24gdG8gZ2VuZXJhdGUgYSBzZWVkIGZvciByYWNpbmcuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgU3BvaWxlckxvZyA9IERlYnVnTW9kZS5mbGFnKCdEcycsIHtcbiAgICBuYW1lOiAnR2VuZXJhdGUgYSBzcG9pbGVyIGxvZycsXG4gICAgdGV4dDogYE5vdGU6IDxiPnRoaXMgd2lsbCBjaGFuZ2UgdGhlIHBsYWNlbWVudCBvZiBpdGVtczwvYj4gY29tcGFyZWQgdG8gYVxuICAgICAgICAgICBzZWVkIGdlbmVyYXRlZCB3aXRob3V0IHRoaXMgZmxhZyB0dXJuZWQgb24uYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFRyYWluZXJNb2RlID0gRGVidWdNb2RlLmZsYWcoJ0R0Jywge1xuICAgIG5hbWU6ICdUcmFpbmVyIG1vZGUnLFxuICAgIHRleHQ6IGBJbnN0YWxscyBhIHRyYWluZXIgZm9yIHByYWN0aWNpbmcgY2VydGFpbiBwYXJ0cyBvZiB0aGUgZ2FtZS5cbiAgICAgICAgICAgQXQgdGhlIHN0YXJ0IG9mIHRoZSBnYW1lLCB0aGUgcGxheWVyIHdpbGwgaGF2ZSBhbGwgc3dvcmRzLCBiYXNpY1xuICAgICAgICAgICBhcm1vcnMgYW5kIHNoaWVsZHMsIGFsbCB3b3JuIGl0ZW1zIGFuZCBtYWdpY3MsIGEgc2VsZWN0aW9uIG9mXG4gICAgICAgICAgIGNvbnN1bWFibGVzLCBib3cgb2YgdHJ1dGgsIG1heGltdW0gY2FzaCwgYWxsIHdhcnAgcG9pbnRzIGFjdGl2YXRlZCxcbiAgICAgICAgICAgYW5kIHRoZSBTaHlyb24gbWFzc2FjcmUgd2lsbCBoYXZlIGJlZW4gdHJpZ2dlcmVkLiAgV2lsZCB3YXJwIGlzXG4gICAgICAgICAgIHJlY29uZmlndXJlZCB0byBwcm92aWRlIGVhc3kgYWNjZXNzIHRvIGFsbCBib3NzZXMuICBBZGRpdGlvbmFsbHksXG4gICAgICAgICAgIHRoZSBmb2xsb3dpbmcgYnV0dG9uIGNvbWJpbmF0aW9ucyBhcmUgcmVjb2duaXplZDo8dWw+XG4gICAgICAgICAgICAgPGxpPlN0YXJ0K1VwOiBpbmNyZWFzZSBwbGF5ZXIgbGV2ZWxcbiAgICAgICAgICAgICA8bGk+U3RhcnQrRG93bjogaW5jcmVhc2Ugc2NhbGluZyBsZXZlbFxuICAgICAgICAgICAgIDxsaT5TdGFydCtMZWZ0OiBnZXQgYWxsIGJhbGxzXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K1JpZ2h0OiBnZXQgYWxsIGJyYWNlbGV0c1xuICAgICAgICAgICAgIDxsaT5TdGFydCtCK0Rvd246IGdldCBhIGZ1bGwgc2V0IG9mIGNvbnN1bWFibGUgaXRlbXNcbiAgICAgICAgICAgICA8bGk+U3RhcnQrQitMZWZ0OiBnZXQgYWxsIGFkdmFuY2VkIGFybW9yc1xuICAgICAgICAgICAgIDxsaT5TdGFydCtCK1JpZ2h0OiBnZXQgYWxsIGFkdmFuY2VkIHNoaWVsZHNcbiAgICAgICAgICAgPC91bD5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTmV2ZXJEaWUgPSBEZWJ1Z01vZGUuZmxhZygnRGknLCB7XG4gICAgbmFtZTogJ1BsYXllciBuZXZlciBkaWVzJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vU2h1ZmZsZSA9IERlYnVnTW9kZS5mbGFnKCdEbicsIHtcbiAgICBuYW1lOiAnRG8gbm90IHNodWZmbGUgaXRlbXMnLFxuICAgIHRleHQ6IGBJdGVtcyB3aWxsIG5vdCBiZSBzaHVmZmxlZC4gV0FSTklORzogVGhpcyBkaXNhYmxlcyB0aGUgbG9naWMgYW5kXG4gICAgICAgICAgIGlzIHZlcnkgbGlrZWx5IHRvIHJlc3VsdCBpbiBhbiB1bndpbm5hYmxlIHNlZWRgLFxuICB9KTtcbn1cblxuZXhwb3J0IGNsYXNzIEZsYWdTZXQge1xuICBwcml2YXRlIGZsYWdzOiBNYXA8RmxhZywgTW9kZT47XG5cbiAgY29uc3RydWN0b3Ioc3RyOiBzdHJpbmd8TWFwPEZsYWcsIE1vZGU+ID0gJ0BDYXN1YWwnKSB7XG4gICAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmZsYWdzID0gbmV3IE1hcCgpO1xuICAgICAgZm9yIChjb25zdCBbaywgdl0gb2Ygc3RyKSB7XG4gICAgICAgIHRoaXMuc2V0KGsuZmxhZywgdik7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChzdHIuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICAvLyBUT0RPIC0gc3VwcG9ydCAnQENhc3VhbCtScy1FZCdcbiAgICAgIGNvbnN0IGV4cGFuZGVkID0gUHJlc2V0cy5nZXQoc3RyLnN1YnN0cmluZygxKSk7XG4gICAgICBpZiAoIWV4cGFuZGVkKSB0aHJvdyBuZXcgVXNhZ2VFcnJvcihgVW5rbm93biBwcmVzZXQ6ICR7c3RyfWApO1xuICAgICAgdGhpcy5mbGFncyA9IG5ldyBNYXAoZXhwYW5kZWQuZmxhZ3MpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmZsYWdzID0gbmV3IE1hcCgpO1xuICAgIC8vIHBhcnNlIHRoZSBzdHJpbmdcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvW15BLVphLXowLTkhP10vZywgJycpO1xuICAgIGNvbnN0IHJlID0gLyhbQS1aXSkoW2EtejAtOSE/XSspL2c7XG4gICAgbGV0IG1hdGNoO1xuICAgIHdoaWxlICgobWF0Y2ggPSByZS5leGVjKHN0cikpKSB7XG4gICAgICBjb25zdCBbLCBrZXksIHRlcm1zXSA9IG1hdGNoO1xuICAgICAgY29uc3QgcmUyID0gLyhbIT9dfF4pKFthLXowLTldKykvZztcbiAgICAgIHdoaWxlICgobWF0Y2ggPSByZTIuZXhlYyh0ZXJtcykpKSB7XG4gICAgICAgIGNvbnN0IFssIG1vZGUsIGZsYWdzXSA9IG1hdGNoO1xuICAgICAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgICAgICB0aGlzLnNldChrZXkgKyBmbGFnLCBtb2RlIHx8IHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZmlsdGVyT3B0aW9uYWwoKTogRmxhZ1NldCB7XG4gICAgcmV0dXJuIG5ldyBGbGFnU2V0KFxuICAgICAgICBuZXcgTWFwKFxuICAgICAgICAgICAgWy4uLnRoaXMuZmxhZ3NdLm1hcChcbiAgICAgICAgICAgICAgICAoW2ssIHZdKSA9PiBbaywgay5vcHRzLm9wdGlvbmFsID8gay5vcHRzLm9wdGlvbmFsKHYpIDogdl0pKSk7XG4gIH1cblxuICBmaWx0ZXJSYW5kb20ocmFuZG9tOiBSYW5kb20pOiBGbGFnU2V0IHtcbiAgICBmdW5jdGlvbiBwaWNrKGs6IEZsYWcsIHY6IE1vZGUpOiBNb2RlIHtcbiAgICAgIGlmICh2ICE9PSAnPycpIHJldHVybiB2O1xuICAgICAgcmV0dXJuIHJhbmRvbS5waWNrKFt0cnVlLCBmYWxzZSwgLi4uKGsub3B0cy5tb2RlcyB8fCAnJyldKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBGbGFnU2V0KFxuICAgICAgICBuZXcgTWFwKFsuLi50aGlzLmZsYWdzXS5tYXAoKFtrLCB2XSkgPT4gW2ssIHBpY2soaywgdildKSkpO1xuICB9XG5cbiAgdG9TdHJpbmcoKSB7XG4gICAgdHlwZSBTZWN0aW9uID0gRGVmYXVsdE1hcDxzdHJpbmcsIHN0cmluZ1tdPjtcbiAgICBjb25zdCBzZWN0aW9ucyA9XG4gICAgICAgIG5ldyBEZWZhdWx0TWFwPHN0cmluZywgU2VjdGlvbj4oXG4gICAgICAgICAgICAoKSA9PiBuZXcgRGVmYXVsdE1hcDxzdHJpbmcsIHN0cmluZ1tdPigoKSA9PiBbXSkpXG4gICAgZm9yIChjb25zdCBbZmxhZywgbW9kZV0gb2YgdGhpcy5mbGFncykge1xuICAgICAgaWYgKGZsYWcuZmxhZy5sZW5ndGggIT09IDIpIHRocm93IG5ldyBFcnJvcihgQmFkIGZsYWcgJHtmbGFnLmZsYWd9YCk7XG4gICAgICBpZiAoIW1vZGUpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgc2VjdGlvbiA9IHNlY3Rpb25zLmdldChmbGFnLmZsYWdbMF0pO1xuICAgICAgY29uc3Qgc3Vic2VjdGlvbiA9IG1vZGUgPT09IHRydWUgPyAnJyA6IG1vZGU7XG4gICAgICBzZWN0aW9uLmdldChzdWJzZWN0aW9uKS5wdXNoKGZsYWcuZmxhZ1sxXSk7XG4gICAgfVxuICAgIGNvbnN0IG91dCA9IFtdO1xuICAgIGZvciAoY29uc3QgW2tleSwgc2VjdGlvbl0gb2Ygc2VjdGlvbnMuc29ydGVkRW50cmllcygpKSB7XG4gICAgICBsZXQgc2VjID0ga2V5O1xuICAgICAgZm9yIChjb25zdCBbc3Via2V5LCBzdWJzZWN0aW9uXSBvZiBzZWN0aW9uLnNvcnRlZEVudHJpZXMoKSkge1xuICAgICAgICBzZWMgKz0gc3Via2V5ICsgc3Vic2VjdGlvbi5zb3J0KCkuam9pbignJyk7XG4gICAgICB9XG4gICAgICBvdXQucHVzaChzZWMpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmpvaW4oJyAnKTtcbiAgfVxuXG4gIHRvZ2dsZShuYW1lOiBzdHJpbmcpOiBNb2RlIHtcbiAgICBjb25zdCBmbGFnID0gRmxhZy5mbGFncy5nZXQobmFtZSk7XG4gICAgaWYgKCFmbGFnKSB7XG4gICAgICAvLyBUT0RPIC0gUmVwb3J0IHNvbWV0aGluZ1xuICAgICAgY29uc29sZS5lcnJvcihgQmFkIGZsYWc6ICR7bmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgbW9kZTogTW9kZSA9IHRoaXMuZmxhZ3MuZ2V0KGZsYWcpIHx8IGZhbHNlO1xuICAgIGNvbnN0IG1vZGVzID0gW2ZhbHNlLCB0cnVlLCAuLi4oZmxhZy5vcHRzLm1vZGVzIHx8ICcnKSwgJz8nLCBmYWxzZV07XG4gICAgY29uc3QgaW5kZXggPSBtb2Rlcy5pbmRleE9mKG1vZGUpO1xuICAgIGlmIChpbmRleCA8IDApIHRocm93IG5ldyBFcnJvcihgQmFkIGN1cnJlbnQgbW9kZSAke21vZGV9YCk7XG4gICAgY29uc3QgbmV4dCA9IG1vZGVzW2luZGV4ICsgMV07XG4gICAgdGhpcy5mbGFncy5zZXQoZmxhZywgbmV4dCk7XG4gICAgcmV0dXJuIG5leHQ7XG4gIH1cblxuICBzZXQobmFtZTogc3RyaW5nLCBtb2RlOiBNb2RlKSB7XG4gICAgY29uc3QgZmxhZyA9IEZsYWcuZmxhZ3MuZ2V0KG5hbWUpO1xuICAgIGlmICghZmxhZykge1xuICAgICAgLy8gVE9ETyAtIFJlcG9ydCBzb21ldGhpbmdcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEJhZCBmbGFnOiAke25hbWV9YCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghbW9kZSkge1xuICAgICAgdGhpcy5mbGFncy5kZWxldGUoZmxhZyk7XG4gICAgfSBlbHNlIGlmIChtb2RlID09PSB0cnVlIHx8IG1vZGUgPT09ICc/JyB8fCBmbGFnLm9wdHMubW9kZXM/LmluY2x1ZGVzKG1vZGUpKSB7XG4gICAgICB0aGlzLmZsYWdzLnNldChmbGFnLCBtb2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihgQmFkIGZsYWcgbW9kZTogJHtuYW1lWzBdfSR7bW9kZX0ke25hbWUuc3Vic3RyaW5nKDEpfWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBSZW1vdmUgYW55IGNvbmZsaWN0c1xuICAgIGZvciAoY29uc3QgZXhjbHVkZWQgb2YgZmxhZy5vcHRzLmV4Y2x1ZGVzIHx8IFtdKSB7XG4gICAgICB0aGlzLmZsYWdzLmRlbGV0ZShGbGFnLmZsYWdzLmdldChleGNsdWRlZCkhKTtcbiAgICB9XG4gIH1cblxuICBjaGVjayhuYW1lOiBGbGFnfHN0cmluZywgLi4ubW9kZXM6IE1vZGVbXSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGZsYWcgPSBuYW1lIGluc3RhbmNlb2YgRmxhZyA/IG5hbWUgOiBGbGFnLmZsYWdzLmdldChuYW1lKTtcbiAgICBpZiAoIW1vZGVzLmxlbmd0aCkgbW9kZXMucHVzaCh0cnVlKTtcbiAgICByZXR1cm4gbW9kZXMuaW5jbHVkZXMoZmxhZyAmJiB0aGlzLmZsYWdzLmdldChmbGFnKSB8fCBmYWxzZSk7XG4gIH1cblxuICBnZXQobmFtZTogRmxhZ3xzdHJpbmcpOiBNb2RlIHtcbiAgICBjb25zdCBmbGFnID0gbmFtZSBpbnN0YW5jZW9mIEZsYWcgPyBuYW1lIDogRmxhZy5mbGFncy5nZXQobmFtZSk7XG4gICAgcmV0dXJuIGZsYWcgJiYgdGhpcy5mbGFncy5nZXQoZmxhZykgfHwgZmFsc2U7XG4gIH1cblxuICBwcmVzZXJ2ZVVuaXF1ZUNoZWNrcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5QcmVzZXJ2ZVVuaXF1ZUNoZWNrcyk7XG4gIH1cbiAgc2h1ZmZsZU1pbWljcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5Ob1NodWZmbGVNaW1pY3MsIGZhbHNlKTtcbiAgfVxuXG4gIGJ1ZmZEZW9zUGVuZGFudCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuICBjaGFuZ2VHYXNNYXNrVG9IYXptYXRTdWl0KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG4gIHNsb3dEb3duVG9ybmFkbygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuICBsZWF0aGVyQm9vdHNHaXZlU3BlZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cbiAgcmFiYml0Qm9vdHNDaGFyZ2VXaGlsZVdhbGtpbmcoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cblxuICBzaHVmZmxlU3ByaXRlUGFsZXR0ZXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplU3ByaXRlQ29sb3JzKTtcbiAgfVxuICBzaHVmZmxlTW9uc3RlcnMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ01yJyk7XG4gIH1cbiAgc2h1ZmZsZVNob3BzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuU2hvcHMsIGZhbHNlKTtcbiAgfVxuICBiYXJnYWluSHVudGluZygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zaHVmZmxlU2hvcHMoKTtcbiAgfVxuXG4gIHNodWZmbGVUb3dlck1vbnN0ZXJzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE1vbnN0ZXJzLlRvd2VyUm9ib3RzKTtcbiAgfVxuICBzaHVmZmxlTW9uc3RlckVsZW1lbnRzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMpO1xuICB9XG4gIHNodWZmbGVCb3NzRWxlbWVudHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc2h1ZmZsZU1vbnN0ZXJFbGVtZW50cygpO1xuICB9XG5cbiAgYnVmZk1lZGljYWxIZXJiKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLk5vQnVmZk1lZGljYWxIZXJiLCBmYWxzZSk7XG4gIH1cbiAgZGVjcmVhc2VFbmVteURhbWFnZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5EZWNyZWFzZUVuZW15RGFtYWdlKTtcbiAgfVxuICB0cmFpbmVyKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKERlYnVnTW9kZS5UcmFpbmVyTW9kZSk7XG4gIH1cbiAgbmV2ZXJEaWUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRGVidWdNb2RlLk5ldmVyRGllKTtcbiAgfVxuICBub1NodWZmbGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRGVidWdNb2RlLk5vU2h1ZmZsZSk7XG4gIH1cbiAgY2hhcmdlU2hvdHNPbmx5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLkNoYXJnZVNob3RzT25seSk7XG4gIH1cblxuICBiYXJyaWVyUmVxdWlyZXNDYWxtU2VhKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdSbCcpO1xuICB9XG4gIC8vIHBhcmFseXNpc1JlcXVpcmVzUHJpc29uS2V5KCk6IGJvb2xlYW4ge1xuICAvLyAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdSbCcpO1xuICAvLyB9XG4gIC8vIHNlYWxlZENhdmVSZXF1aXJlc1dpbmRtaWxsKCk6IGJvb2xlYW4ge1xuICAvLyAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdSbCcpO1xuICAvLyB9XG5cbiAgY29ubmVjdExpbWVUcmVlVG9MZWFmKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuTWFwcywgJyEnKTtcbiAgfVxuICAvLyBjb25uZWN0R29hVG9MZWFmKCkge1xuICAvLyAgIHJldHVybiB0aGlzLmNoZWNrKCdYZScpICYmIHRoaXMuY2hlY2soJ1hnJyk7XG4gIC8vIH1cbiAgLy8gcmVtb3ZlRWFybHlXYWxsKCkge1xuICAvLyAgIHJldHVybiB0aGlzLmNoZWNrKCdYYicpO1xuICAvLyB9XG4gIGFkZEVhc3RDYXZlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuTWFwcywgZmFsc2UpO1xuICB9XG4gIHplYnVTdHVkZW50R2l2ZXNJdGVtKCk6IGJvb2xlYW4ge1xuICAgIC8vIElmIGhlJ3Mgbm90IGd1YXJhbnRlZWQgdG8gYmUgYXQgdGhlIHN0YXJ0LCBtb3ZlIGNoZWNrIHRvIG1lemFtZSBpbnN0ZWFkXG4gICAgcmV0dXJuICF0aGlzLnNodWZmbGVBcmVhcygpICYmICF0aGlzLnNodWZmbGVIb3VzZXMoKTtcbiAgfVxuICBmb2dMYW1wTm90UmVxdWlyZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5WYW5pbGxhRG9scGhpbiwgZmFsc2UpO1xuICB9XG4gIHN0b3J5TW9kZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLlN0b3J5TW9kZSk7XG4gIH1cbiAgbm9Cb3dNb2RlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuTm9Cb3dNb2RlKTtcbiAgfVxuICByZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLlZhbmlsbGFEb2xwaGluKTtcbiAgfVxuICBzYWhhcmFSYWJiaXRzUmVxdWlyZVRlbGVwYXRoeSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTsgLy8gdGhpcy5jaGVjaygnUnInKTtcbiAgfVxuICB0ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLCBmYWxzZSwgJyEnKTtcbiAgfVxuICByYW5kb21pemVUaHVuZGVyVGVsZXBvcnQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsIGZhbHNlKTtcbiAgfVxuICBvcmJzT3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5PcmJzTm90UmVxdWlyZWQpO1xuICB9XG5cbiAgc2h1ZmZsZUdvYUZsb29ycygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5TaHVmZmxlR29hRmxvb3JzKTtcbiAgfVxuICBzaHVmZmxlSG91c2VzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlNodWZmbGVIb3VzZXMpO1xuICB9XG4gIHNodWZmbGVBcmVhcygpIHtcbiAgICAvLyBUT0RPOiBjb25zaWRlciBtdWx0aXBsZSBsZXZlbHMgb2Ygc2h1ZmZsZT9cbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5TaHVmZmxlQXJlYXMpO1xuICB9XG4gIHJhbmRvbWl6ZU1hcHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplTWFwcyk7XG4gIH1cbiAgcmFuZG9taXplVHJhZGVzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVRyYWRlcyk7XG4gIH1cbiAgdW5pZGVudGlmaWVkSXRlbXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMpO1xuICB9XG4gIHJhbmRvbWl6ZVdhbGxzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyk7XG4gIH1cblxuICBndWFyYW50ZWVTd29yZCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5HdWFyYW50ZWVTdGFydGluZ1N3b3JkKTtcbiAgfVxuICBndWFyYW50ZWVTd29yZE1hZ2ljKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE5vR3VhcmFudGVlcy5CYXR0bGVNYWdpYywgZmFsc2UpO1xuICB9XG4gIGd1YXJhbnRlZU1hdGNoaW5nU3dvcmQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTm9HdWFyYW50ZWVzLk1hdGNoaW5nU3dvcmQsIGZhbHNlKTtcbiAgfVxuICBndWFyYW50ZWVHYXNNYXNrKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE5vR3VhcmFudGVlcy5HYXNNYXNrLCBmYWxzZSk7XG4gIH1cbiAgZ3VhcmFudGVlQmFycmllcigpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhOb0d1YXJhbnRlZXMuQmFycmllciwgZmFsc2UpO1xuICB9XG4gIGd1YXJhbnRlZVJlZnJlc2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuR3VhcmFudGVlUmVmcmVzaCk7XG4gIH1cblxuICBkaXNhYmxlU3dvcmRDaGFyZ2VHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlVGVsZXBvcnRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlUmFiYml0U2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVNob3BHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5TaG9wcywgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVTdGF0dWVHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3RhdHVlR2xpdGNoLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVJhZ2VTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlJhZ2VTa2lwLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVRyaWdnZXJHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuVHJpZ2dlclNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlRmxpZ2h0U3RhdHVlU2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5TdGF0dWVHYXVudGxldFNraXAsIGZhbHNlKTtcbiAgfVxuXG4gIGFzc3VtZVN3b3JkQ2hhcmdlR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN3b3JkQ2hhcmdlR2xpdGNoKTtcbiAgfVxuICBhc3N1bWVHaGV0dG9GbGlnaHQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuR2hldHRvRmxpZ2h0KTtcbiAgfVxuICBhc3N1bWVUZWxlcG9ydFNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCk7XG4gIH1cbiAgYXNzdW1lUmFiYml0U2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwKTtcbiAgfVxuICBhc3N1bWVTdGF0dWVHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3RhdHVlR2xpdGNoKTtcbiAgfVxuICBhc3N1bWVUcmlnZ2VyR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlRyaWdnZXJTa2lwKTtcbiAgfVxuICBhc3N1bWVGbGlnaHRTdGF0dWVTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN0YXR1ZUdhdW50bGV0U2tpcCk7XG4gIH1cbiAgYXNzdW1lV2lsZFdhcnAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5XaWxkV2FycCwgdHJ1ZSkgfHxcbiAgICAgICAgdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVXaWxkV2FycCk7XG4gIH1cbiAgYXNzdW1lUmFnZVNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuUmFnZVNraXApO1xuICB9XG5cbiAgbmVyZldpbGRXYXJwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuV2lsZFdhcnAsIGZhbHNlKSAmJlxuICAgICAgICB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwLCBmYWxzZSk7XG4gIH1cbiAgYWxsb3dXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gIXRoaXMubmVyZldpbGRXYXJwKCk7XG4gIH1cbiAgcmFuZG9taXplV2lsZFdhcnAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplV2lsZFdhcnAsIHRydWUpO1xuICB9XG5cbiAgYmxhY2tvdXRNb2RlKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLkJsYWNrb3V0KTtcbiAgfVxuICBoYXJkY29yZU1vZGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuUGVybWFkZWF0aCk7XG4gIH1cbiAgYnVmZkR5bmEoKSB7XG4gICAgcmV0dXJuICF0aGlzLmNoZWNrKFZhbmlsbGEuRHluYSk7XG4gIH1cbiAgbWF4U2NhbGluZ0luVG93ZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIpO1xuICB9XG5cbiAgZXhwU2NhbGluZ0ZhY3RvcigpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5FeHBlcmllbmNlU2NhbGVzU2xvd2VyKSA/IDAuMjUgOlxuICAgICAgICB0aGlzLmNoZWNrKEVhc3lNb2RlLkV4cGVyaWVuY2VTY2FsZXNGYXN0ZXIpID8gMi41IDogMTtcbiAgfVxuXG4gIC8vIE9QVElPTkFMIEZMQUdTXG4gIGF1dG9FcXVpcEJyYWNlbGV0KHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gcGFzcyA9PT0gJ2Vhcmx5JyB8fCB0aGlzLmNoZWNrKFF1YWxpdHkuTm9BdXRvRXF1aXAsIGZhbHNlKTtcbiAgfVxuICBjb250cm9sbGVyU2hvcnRjdXRzKHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gcGFzcyA9PT0gJ2Vhcmx5JyB8fCB0aGlzLmNoZWNrKFF1YWxpdHkuTm9Db250cm9sbGVyU2hvcnRjdXRzLCBmYWxzZSk7XG4gIH1cbiAgcmFuZG9taXplTXVzaWMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEFlc3RoZXRpY3MuUmFuZG9taXplTXVzaWMsIHBhc3MgPT09ICdlYXJseScgPyAnIScgOiB0cnVlKTtcbiAgfVxuICBzaHVmZmxlVGlsZVBhbGV0dGVzKHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhBZXN0aGV0aWNzLlJhbmRvbWl6ZU1hcENvbG9ycyxcbiAgICAgICAgICAgICAgICAgICAgICBwYXNzID09PSAnZWFybHknID8gJyEnIDogdHJ1ZSk7XG4gIH1cbiAgbm9NdXNpYyhwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHBhc3MgPT09ICdsYXRlJyAmJiB0aGlzLmNoZWNrKEFlc3RoZXRpY3MuTm9NdXNpYyk7XG4gIH1cblxuICBzaG91bGRDb2xvclN3b3JkRWxlbWVudHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cbiJdfQ==