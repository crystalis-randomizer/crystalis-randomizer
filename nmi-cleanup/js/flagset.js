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
            EasyMode.NoCommunityJokes,
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
            EasyMode.NoCommunityJokes,
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
        this.Tournament2022Early = new Preset(this, 'Tournament 2022 Early Rounds', `
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
        this.Tournament2022Mid = new Preset(this, 'Tournament 2022 Mid Rounds', `
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
        this.Tournament2022Finals = new Preset(this, 'Tournament 2022 Finals Round', `
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
            throw new Error(`bad flag ${name} ${opts}`);
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
EasyMode.NoCommunityJokes = EasyMode.flag('Ec', {
    name: 'No community jokes',
    text: `Skip community jokes, such as funny/misspelled item, monster, or
           character names.  This will make it easier to look up information
           in guides/FAQs if necessary.`,
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
Vanilla.Hud = Vanilla.flag('Vh', {
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
Quality.AudibleWallCues = Quality.flag('Qw', {
    name: 'Audible wall cues',
    text: `Provide an audible cue when failing to break a non-iron wall.
           The intended way to determine which sword is required for normal
           cave walls is by looking at the color.  This causes the level 3
           sword sound of the required element to play when the wall fails
           to break.  Note that fortress walls (iron in vanilla) do not give
           this hint, since there is no visual cue for them, either.`,
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
    audibleWallCues(pass) {
        return pass === 'late' && this.check(Quality.AudibleWallCues);
    }
    shouldColorSwordElements() {
        return true;
    }
    shouldUpdateHud() {
        return this.check(Vanilla.Hud, false);
    }
    hasStatTracking() {
        return true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3NldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy9mbGFnc2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBZ0JqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUU3RCxNQUFNLE9BQU8sSUFBSTtJQU9mLFlBQXFCLElBQVksRUFBVyxJQUFjO1FBQXJDLFNBQUksR0FBSixJQUFJLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFVO1FBQ3hELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBTkQsTUFBTSxDQUFDLEdBQUc7UUFDUixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQzs7QUFKZSxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7QUFXbEQsTUFBTSxPQUFPLE1BQU07SUFTakIsWUFBWSxNQUFlLEVBQ04sSUFBWSxFQUNaLFdBQW1CLEVBQzVCLEtBQWdEO1FBRnZDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUV0QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0Qs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QUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFDRCxPQUFPLENBQUMsSUFBc0I7UUFDNUIsT0FBTyxJQUFJLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFDRCxlQUFlLENBQUMsSUFBc0I7UUFDcEMsT0FBTyxJQUFJLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCx3QkFBd0I7UUFDdEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsZUFBZTtRQUNiLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxlQUFlO1FBQ2IsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1VzYWdlRXJyb3IsIERlZmF1bHRNYXB9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi9yYW5kb20uanMnO1xuXG5pbnRlcmZhY2UgRmxhZ09wdHMge1xuICBuYW1lOiBzdHJpbmc7XG4gIHRleHQ/OiBzdHJpbmc7XG4gIGV4Y2x1ZGVzPzogc3RyaW5nW107XG4gIGhhcmQ/OiBib29sZWFuO1xuICBvcHRpb25hbD86IChtb2RlOiBNb2RlKSA9PiBNb2RlO1xuICAvLyBBbGwgZmxhZ3MgaGF2ZSBtb2RlcyBmYWxzZSBhbmQgdHJ1ZS4gIEFkZGl0aW9uYWwgbW9kZXMgbWF5IGJlXG4gIC8vIHNwZWNpZmllZCBhcyBjaGFyYWN0ZXJzIGluIHRoaXMgc3RyaW5nIChlLmcuICchJykuXG4gIG1vZGVzPzogc3RyaW5nO1xufVxuXG50eXBlIE1vZGUgPSBib29sZWFufHN0cmluZztcblxuY29uc3QgT1BUSU9OQUwgPSAobW9kZTogTW9kZSkgPT4gJyc7XG5jb25zdCBOT19CQU5HID0gKG1vZGU6IE1vZGUpID0+IG1vZGUgPT09IHRydWUgPyBmYWxzZSA6IG1vZGU7XG5cbmV4cG9ydCBjbGFzcyBGbGFnIHtcbiAgc3RhdGljIHJlYWRvbmx5IGZsYWdzID0gbmV3IE1hcDxzdHJpbmcsIEZsYWc+KCk7XG5cbiAgc3RhdGljIGFsbCgpOiBGbGFnW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5mbGFncy52YWx1ZXMoKV07XG4gIH1cblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBmbGFnOiBzdHJpbmcsIHJlYWRvbmx5IG9wdHM6IEZsYWdPcHRzKSB7XG4gICAgRmxhZy5mbGFncy5zZXQoZmxhZywgdGhpcyk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFByZXNldCB7XG4gIHN0YXRpYyBhbGwoKTogUHJlc2V0W10ge1xuICAgIGlmICghUHJlc2V0cy5pbnN0YW5jZSkgUHJlc2V0cy5pbnN0YW5jZSA9IG5ldyBQcmVzZXRzKCk7XG4gICAgcmV0dXJuIFsuLi5QcmVzZXRzLmluc3RhbmNlLnByZXNldHMudmFsdWVzKCldO1xuICB9XG5cbiAgcHJpdmF0ZSBfZmxhZ1N0cmluZz86IHN0cmluZztcblxuICByZWFkb25seSBmbGFnczogUmVhZG9ubHlBcnJheTxyZWFkb25seSBbRmxhZywgTW9kZV0+O1xuICBjb25zdHJ1Y3RvcihwYXJlbnQ6IFByZXNldHMsIC8vIE5PVEU6IGltcG9zc2libGUgdG8gZ2V0IGFuIGluc3RhbmNlIG91dHNpZGVcbiAgICAgICAgICAgICAgcmVhZG9ubHkgbmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICByZWFkb25seSBkZXNjcmlwdGlvbjogc3RyaW5nLFxuICAgICAgICAgICAgICBmbGFnczogUmVhZG9ubHlBcnJheTxGbGFnfHJlYWRvbmx5IFtGbGFnLCBNb2RlXT4pIHtcbiAgICB0aGlzLmZsYWdzID0gZmxhZ3MubWFwKGYgPT4gZiBpbnN0YW5jZW9mIEZsYWcgPyBbZiwgdHJ1ZV0gOiBmKTtcbiAgICBwYXJlbnQucHJlc2V0cy5zZXQobWFwUHJlc2V0TmFtZShuYW1lKSwgdGhpcyk7XG4gIH1cblxuICBnZXQgZmxhZ1N0cmluZygpIHtcbiAgICBpZiAodGhpcy5fZmxhZ1N0cmluZyA9PSBudWxsKSB7XG4gICAgICB0aGlzLl9mbGFnU3RyaW5nID0gU3RyaW5nKG5ldyBGbGFnU2V0KGBAJHt0aGlzLm5hbWV9YCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZmxhZ1N0cmluZztcbiAgfVxufVxuXG5mdW5jdGlvbiBtYXBQcmVzZXROYW1lKG5hbWU6IHN0cmluZykge1xuICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16XS9nLCAnJyk7XG59XG5cbi8vIE5PVCBFWFBPUlRFRCFcbmNsYXNzIFByZXNldHMge1xuICBzdGF0aWMgaW5zdGFuY2U6IFByZXNldHMgfCB1bmRlZmluZWQ7XG4gIHJlYWRvbmx5IHByZXNldHMgPSBuZXcgTWFwPHN0cmluZywgUHJlc2V0PigpO1xuXG4gIHN0YXRpYyBnZXQobmFtZTogc3RyaW5nKTogUHJlc2V0IHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuaW5zdGFuY2UpIHRoaXMuaW5zdGFuY2UgPSBuZXcgUHJlc2V0cygpO1xuICAgIHJldHVybiB0aGlzLmluc3RhbmNlLnByZXNldHMuZ2V0KG1hcFByZXNldE5hbWUobmFtZSkpO1xuICB9XG5cbiAgcmVhZG9ubHkgQ2FzdWFsID0gbmV3IFByZXNldCh0aGlzLCAnQ2FzdWFsJywgYFxuICAgICAgQmFzaWMgZmxhZ3MgZm9yIGEgcmVsYXRpdmVseSBlYXN5IHBsYXl0aHJvdWdoLiAgVGhpcyBpcyBhIGdvb2RcbiAgICAgIHBsYWNlIHRvIHN0YXJ0LmAsIFtcbiAgICAgICAgRWFzeU1vZGUuUHJlc2VydmVVbmlxdWVDaGVja3MsXG4gICAgICAgIEVhc3lNb2RlLk5vU2h1ZmZsZU1pbWljcyxcbiAgICAgICAgRWFzeU1vZGUuRGVjcmVhc2VFbmVteURhbWFnZSxcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlUmVmcmVzaCxcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlU3RhcnRpbmdTd29yZCxcbiAgICAgICAgRWFzeU1vZGUuRXhwZXJpZW5jZVNjYWxlc0Zhc3RlcixcbiAgICAgICAgRWFzeU1vZGUuTm9Db21tdW5pdHlKb2tlcyxcbiAgICAgICAgUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsXG4gICAgICAgIFZhbmlsbGEuU2hvcHMsXG4gICAgICAgIFZhbmlsbGEuRHluYSxcbiAgICAgICAgW1ZhbmlsbGEuTWFwcywgJyEnXSxcbiAgICAgICAgW1ZhbmlsbGEuV2lsZFdhcnAsICchJ10sXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgQ2xhc3NpYyA9IG5ldyBQcmVzZXQodGhpcywgJ0NsYXNzaWMnLCBgXG4gICAgICBQcm92aWRlcyBhIHJlbGF0aXZlbHkgcXVpY2sgcGxheXRob3VnaCB3aXRoIGEgcmVhc29uYWJsZSBhbW91bnQgb2ZcbiAgICAgIGNoYWxsZW5nZS4gIFNpbWlsYXIgdG8gb2xkZXIgdmVyc2lvbnMuYCwgW1xuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVTdGFydGluZ1N3b3JkLFxuICAgICAgICBFYXN5TW9kZS5Ob0NvbW11bml0eUpva2VzLFxuICAgICAgICBHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsXG4gICAgICAgIFtSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgJyEnXSxcbiAgICAgICAgW1ZhbmlsbGEuTWFwcywgJyEnXSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBTdGFuZGFyZCA9IG5ldyBQcmVzZXQodGhpcywgJ1N0YW5kYXJkJywgYFxuICAgICAgV2VsbC1iYWxhbmNlZCwgc3RhbmRhcmQgcmFjZSBmbGFncy5gLCBbXG4gICAgICAgIC8vIG5vIGZsYWdzPyAgYWxsIGRlZmF1bHQ/XG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IE5vQm93TW9kZSA9IG5ldyBQcmVzZXQodGhpcywgJ05vIEJvdyBNb2RlJywgYFxuICAgICAgVGhlIHRvd2VyIGlzIG9wZW4gZnJvbSB0aGUgc3RhcnQsIGFzIHNvb24gYXMgeW91J3JlIHJlYWR5IGZvciBpdC5gLCBbXG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIE1vbnN0ZXJzLlRvd2VyUm9ib3RzLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgUm91dGluZy5Ob0Jvd01vZGUsXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgQWR2YW5jZWQgPSBuZXcgUHJlc2V0KHRoaXMsICdBZHZhbmNlZCcsIGBcbiAgICAgIEEgYmFsYW5jZWQgcmFuZG9taXphdGlvbiB3aXRoIHF1aXRlIGEgYml0IG1vcmUgZGlmZmljdWx0eS5gLCBbXG4gICAgICAgIEdsaXRjaGVzLkdoZXR0b0ZsaWdodCxcbiAgICAgICAgR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCxcbiAgICAgICAgR2xpdGNoZXMuU3RhdHVlR2xpdGNoLFxuICAgICAgICBbR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gsICchJ10sXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXJyaWVyLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsXG4gICAgICAgIE5vR3VhcmFudGVlcy5HYXNNYXNrLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgV29ybGQuUmFuZG9taXplTWFwcyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUFyZWFzLFxuICAgICAgICBXb3JsZC5TaHVmZmxlSG91c2VzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVUcmFkZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyxcbiAgICAgICAgV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgV2lsZFdhcnAgPSBuZXcgUHJlc2V0KHRoaXMsICdXaWxkIFdhcnAnLCBgXG4gICAgICBTaWduaWZpY2FudGx5IG9wZW5zIHVwIHRoZSBnYW1lIHJpZ2h0IGZyb20gdGhlIHN0YXJ0IHdpdGggd2lsZFxuICAgICAgd2FycCBpbiBsb2dpYy5gLCBbXG4gICAgICAgIEVhc3lNb2RlLkd1YXJhbnRlZVJlZnJlc2gsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwLFxuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBNb25zdGVycy5Ub3dlclJvYm90cyxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IE15c3RlcnkgPSBuZXcgUHJlc2V0KHRoaXMsICdNeXN0ZXJ5JywgYFxuICAgICAgRXZlbiB0aGUgb3B0aW9ucyBhcmUgcmFuZG9tLmAsIFtcbiAgICAgICAgW1dvcmxkLlNodWZmbGVBcmVhcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlNodWZmbGVIb3VzZXMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVNYXBzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplVHJhZGVzLCAnPyddLFxuICAgICAgICBbV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsICc/J10sXG4gICAgICAgIFtXb3JsZC5TaHVmZmxlR29hRmxvb3JzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplU3ByaXRlQ29sb3JzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplV2lsZFdhcnAsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuTm9Cb3dNb2RlLCAnPyddLFxuICAgICAgICBbUm91dGluZy5TdG9yeU1vZGUsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLlZhbmlsbGFEb2xwaGluLCAnPyddLFxuICAgICAgICBbUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5SYWdlU2tpcCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlRyaWdnZXJTa2lwLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuU3RhdHVlR2xpdGNoLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuR2hldHRvRmxpZ2h0LCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwLCAnPyddLFxuICAgICAgICBbQWVzdGhldGljcy5SYW5kb21pemVNdXNpYywgJz8nXSxcbiAgICAgICAgW0Flc3RoZXRpY3MuUmFuZG9taXplTWFwQ29sb3JzLCAnPyddLFxuICAgICAgICBbTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcywgJz8nXSxcbiAgICAgICAgW01vbnN0ZXJzLlRvd2VyUm9ib3RzLCAnPyddLFxuICAgICAgICBbRWFzeU1vZGUuTm9TaHVmZmxlTWltaWNzLCAnPyddLFxuICAgICAgICBbRWFzeU1vZGUuUHJlc2VydmVVbmlxdWVDaGVja3MsICc/J10sXG4gICAgICAgIFtOb0d1YXJhbnRlZXMuQmFycmllciwgJz8nXSxcbiAgICAgICAgW05vR3VhcmFudGVlcy5CYXR0bGVNYWdpYywgJz8nXSxcbiAgICAgICAgW05vR3VhcmFudGVlcy5HYXNNYXNrLCAnPyddLFxuICAgICAgICBbVmFuaWxsYS5EeW5hLCAnPyddLFxuICAgICAgICBbVmFuaWxsYS5Cb251c0l0ZW1zLCAnPyddLFxuICAgICAgICBbVmFuaWxsYS5NYXBzLCAnPyddLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IEhhcmRjb3JlID0gbmV3IFByZXNldCh0aGlzLCAnSGFyZGNvcmUnLCBgXG4gICAgICBOb3QgZm9yIHRoZSBmYWludCBvZiBoZWFydC4gIEdvb2QgbHVjay5gLCBbXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXJyaWVyLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsXG4gICAgICAgIEhhcmRNb2RlLkV4cGVyaWVuY2VTY2FsZXNTbG93ZXIsXG4gICAgICAgIEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyLFxuICAgICAgICBIYXJkTW9kZS5QZXJtYWRlYXRoLFxuICAgICAgICBSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZU1hcHMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVBcmVhcyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUhvdXNlcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplVHJhZGVzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsXG4gICAgICAgIFdvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgRnVsbFN0dXBpZCA9IG5ldyBQcmVzZXQodGhpcywgJ1RoZSBGdWxsIFN0dXBpZCcsIGBcbiAgICAgIE9ubHkgYSBmZXcgbm9ibGUgZm9vbHMgaGF2ZSBldmVyIGNvbXBsZXRlZCB0aGlzLiAgQmUgc3VyZSB0byByZWNvcmQgdGhpc1xuICAgICAgYmVjYXVzZSBwaWNzIG9yIGl0IGRpZG4ndCBoYXBwZW4uYCwgWyBcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhcnJpZXIsXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXR0bGVNYWdpYyxcbiAgICAgICAgSGFyZE1vZGUuQmxhY2tvdXQsXG4gICAgICAgIEhhcmRNb2RlLkV4cGVyaWVuY2VTY2FsZXNTbG93ZXIsXG4gICAgICAgIEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyLFxuICAgICAgICBIYXJkTW9kZS5QZXJtYWRlYXRoLFxuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBNb25zdGVycy5Ub3dlclJvYm90cyxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVNYXBzLFxuICAgICAgICBXb3JsZC5TaHVmZmxlQXJlYXMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVIb3VzZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVRyYWRlcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzLFxuICAgICAgICBXb3JsZC5TaHVmZmxlR29hRmxvb3JzLFxuICAgICAgICBXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IFRvdXJuYW1lbnQyMDIyRWFybHkgPSBuZXcgUHJlc2V0KHRoaXMsICdUb3VybmFtZW50IDIwMjIgRWFybHkgUm91bmRzJywgYFxuICAgICAgTG90cyBvZiBwb3RlbnRpYWwgY29tcGxleGl0eSwgYnV0IHdpdGhpbiByZWFzb24uICBSZXF1aXJlcyBhbGwgc3dvcmRzIGFuZFxuICAgICAgYm9zc2VzLCBhcyB3ZWxsIGFzIGEgZmV3IGdsaXRjaGVzLCBidXQgZ3VhcmFudGVlcyBhIHN0YXJ0aW5nIHN3b3JkLmAsIFsgXG4gICAgICAgIEVhc3lNb2RlLkd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQsXG4gICAgICAgIEdsaXRjaGVzLlN0YXR1ZUdsaXRjaCxcbiAgICAgICAgR2xpdGNoZXMuU3RhdHVlR2F1bnRsZXRTa2lwLFxuICAgICAgICBbTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcywgJz8nXSxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBbUm91dGluZy5WYW5pbGxhRG9scGhpbiwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzLCAnPyddLFxuICAgICAgICBbV29ybGQuU2h1ZmZsZUdvYUZsb29ycywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVNwcml0ZUNvbG9ycywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVRyYWRlcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLCAnPyddLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgVG91cm5hbWVudDIwMjJNaWQgPSBuZXcgUHJlc2V0KHRoaXMsICdUb3VybmFtZW50IDIwMjIgTWlkIFJvdW5kcycsIGBcbiAgICAgIFNvbWUgYWRkaXRpb25hbCBjaGFsbGVuZ2VzIGNvbXBhcmVkIHRvIHRoZSBlYXJseSByb3VuZHM6IHNvbWUgYWRkaXRpb25hbFxuICAgICAgbXlzdGVyeSBmbGFncyBhbmQgZ2xpdGNoZXMsIGFzIHdlbGwgYXMgbWF4IGRpZmZpY3VsdHkgc2NhbGluZyBpbiB0aGVcbiAgICAgIHRvd2VyLmAsIFsgXG4gICAgICAgIFtFYXN5TW9kZS5HdWFyYW50ZWVTdGFydGluZ1N3b3JkLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuR2hldHRvRmxpZ2h0LCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuU3RhdHVlR2xpdGNoLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlN0YXR1ZUdhdW50bGV0U2tpcCwgJz8nXSxcbiAgICAgICAgSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIsXG4gICAgICAgIFtIYXJkTW9kZS5Ob0J1ZmZNZWRpY2FsSGVyYiwgJz8nXSxcbiAgICAgICAgW01vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsICc/J10sXG4gICAgICAgIFtNb25zdGVycy5Ub3dlclJvYm90cywgJz8nXSxcbiAgICAgICAgW05vR3VhcmFudGVlcy5CYXJyaWVyLCAnPyddLFxuICAgICAgICBbTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLCAnPyddLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgW1JvdXRpbmcuVmFuaWxsYURvbHBoaW4sICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzLCAnPyddLFxuICAgICAgICBbV29ybGQuU2h1ZmZsZUdvYUZsb29ycywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVNwcml0ZUNvbG9ycywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVRyYWRlcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLCAnPyddLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgVG91cm5hbWVudDIwMjJGaW5hbHMgPSBuZXcgUHJlc2V0KHRoaXMsICdUb3VybmFtZW50IDIwMjIgRmluYWxzIFJvdW5kJywgYFxuICAgICAgTWFueSBvZiB0aGUgbW9yZSBkaWZmaWN1bHQgbXlzdGVyeSBmbGFncyBmcm9tIHRoZSBtaWQgcm91bmRzIGFyZSBub3dcbiAgICAgIGFsd2F5cyBvbiwgcGx1cyBlbnRyYW5jZSBzaHVmZmxlLmAsIFsgXG4gICAgICAgIFtFYXN5TW9kZS5HdWFyYW50ZWVTdGFydGluZ1N3b3JkLCAnPyddLFxuICAgICAgICBHbGl0Y2hlcy5HaGV0dG9GbGlnaHQsXG4gICAgICAgIEdsaXRjaGVzLlN0YXR1ZUdsaXRjaCxcbiAgICAgICAgR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCxcbiAgICAgICAgR2xpdGNoZXMuU3RhdHVlR2F1bnRsZXRTa2lwLFxuICAgICAgICBIYXJkTW9kZS5Ob0J1ZmZNZWRpY2FsSGVyYixcbiAgICAgICAgSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIsXG4gICAgICAgIFtNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLCAnPyddLFxuICAgICAgICBbTW9uc3RlcnMuVG93ZXJSb2JvdHMsICc/J10sXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXJyaWVyLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBbUm91dGluZy5WYW5pbGxhRG9scGhpbiwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuT3Jic05vdFJlcXVpcmVkLCAnPyddLFxuICAgICAgICBbUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsICc/J10sXG4gICAgICAgIFdvcmxkLlNodWZmbGVIb3VzZXMsXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsICc/J10sXG4gICAgICAgIFtXb3JsZC5TaHVmZmxlR29hRmxvb3JzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplU3ByaXRlQ29sb3JzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplVHJhZGVzLCAnPyddLFxuICAgICAgICBbV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsICc/J10sXG4gICAgICBdKTtcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEZsYWdTZWN0aW9uIHtcbiAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2U6IEZsYWdTZWN0aW9uO1xuICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBzZWN0aW9ucyA9IG5ldyBTZXQ8RmxhZ1NlY3Rpb24+KCk7XG5cbiAgc3RhdGljIGFsbCgpOiBGbGFnU2VjdGlvbltdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMuc2VjdGlvbnNdO1xuICB9XG5cbiAgcHJvdGVjdGVkIHN0YXRpYyBmbGFnKG5hbWU6IHN0cmluZywgb3B0czogYW55KTogRmxhZyB7XG4gICAgRmxhZ1NlY3Rpb24uc2VjdGlvbnMuYWRkKFxuICAgICAgICB0aGlzLmluc3RhbmNlIHx8ICh0aGlzLmluc3RhbmNlID0gbmV3ICh0aGlzIGFzIGFueSkoKSkpO1xuICAgIGNvbnN0IGZsYWcgPSBuZXcgRmxhZyhuYW1lLCBvcHRzKTtcbiAgICBpZiAoIW5hbWUuc3RhcnRzV2l0aCh0aGlzLmluc3RhbmNlLnByZWZpeCkpIHRocm93IG5ldyBFcnJvcihgYmFkIGZsYWcgJHtuYW1lfSAke29wdHN9YCk7XG4gICAgdGhpcy5pbnN0YW5jZS5mbGFncy5zZXQobmFtZSwgZmxhZyk7XG4gICAgcmV0dXJuIGZsYWc7XG4gIH1cblxuICBhYnN0cmFjdCByZWFkb25seSBwcmVmaXg6IHN0cmluZztcbiAgYWJzdHJhY3QgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICByZWFkb25seSBkZXNjcmlwdGlvbj86IHN0cmluZztcbiAgcmVhZG9ubHkgZmxhZ3MgPSBuZXcgTWFwPHN0cmluZywgRmxhZz4oKTtcbn1cblxuY2xhc3MgV29ybGQgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdXJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdXb3JsZCc7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZU1hcHMgPSBXb3JsZC5mbGFnKCdXbScsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIG1hcHMnLFxuICAgIHRleHQ6IGBJbmRpdmlkdWFsIG1hcHMgYXJlIHJhbmRvbWl6ZWQuICBGb3Igbm93IHRoaXMgaXMgb25seSBhIHN1YnNldCBvZlxuICAgICAgICAgICBwb3NzaWJsZSBtYXBzLiAgQSByYW5kb21pemVkIG1hcCB3aWxsIGhhdmUgYWxsIHRoZSBzYW1lIGZlYXR1cmVzXG4gICAgICAgICAgIChleGl0cywgY2hlc3RzLCBOUENzLCBldGMpIGV4Y2VwdCB0aGluZ3MgYXJlIG1vdmVkIGFyb3VuZC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTaHVmZmxlQXJlYXMgPSBXb3JsZC5mbGFnKCdXYScsIHtcbiAgICBuYW1lOiAnU2h1ZmZsZSBhcmVhcycsXG4gICAgdGV4dDogYFNodWZmbGVzIHNvbWUgb3IgYWxsIGFyZWEgY29ubmVjdGlvbnMuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU2h1ZmZsZUhvdXNlcyA9IFdvcmxkLmZsYWcoJ1doJywge1xuICAgIG5hbWU6ICdTaHVmZmxlIGhvdXNlIGVudHJhbmNlcycsXG4gICAgdGV4dDogYFNodWZmbGVzIGFsbCB0aGUgaG91c2UgZW50cmFuY2VzLCBhcyB3ZWxsIGFzIGEgaGFuZGZ1bCBvZiBvdGhlclxuICAgICAgICAgICB0aGluZ3MsIGxpa2UgdGhlIHBhbGFjZS9mb3J0cmVzcy10eXBlIGVudHJhbmNlcyBhdCB0aGUgdG9wIG9mXG4gICAgICAgICAgIHNldmVyYWwgdG93bnMsIGFuZCBzdGFuZGFsb25lIGhvdXNlcy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVUcmFkZXMgPSBXb3JsZC5mbGFnKCdXdCcsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIHRyYWRlLWluIGl0ZW1zJyxcbiAgICB0ZXh0OiBgSXRlbXMgZXhwZWN0ZWQgYnkgdmFyaW91cyBOUENzIHdpbGwgYmUgc2h1ZmZsZWQ6IHNwZWNpZmljYWxseSxcbiAgICAgICAgICAgU3RhdHVlIG9mIE9ueXgsIEtpcmlzYSBQbGFudCwgTG92ZSBQZW5kYW50LCBJdm9yeSBTdGF0dWUsIEZvZ1xuICAgICAgICAgICBMYW1wLCBhbmQgRmx1dGUgb2YgTGltZSAoZm9yIEFrYWhhbmEpLiAgUmFnZSB3aWxsIGV4cGVjdCBhXG4gICAgICAgICAgIHJhbmRvbSBzd29yZCwgYW5kIFRvcm5lbCB3aWxsIGV4cGVjdCBhIHJhbmRvbSBicmFjZWxldC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBVbmlkZW50aWZpZWRLZXlJdGVtcyA9IFdvcmxkLmZsYWcoJ1d1Jywge1xuICAgIG5hbWU6ICdVbmlkZW50aWZpZWQga2V5IGl0ZW1zJyxcbiAgICB0ZXh0OiBgSXRlbSBuYW1lcyB3aWxsIGJlIGdlbmVyaWMgYW5kIGVmZmVjdHMgd2lsbCBiZSBzaHVmZmxlZC4gIFRoaXNcbiAgICAgICAgICAgaW5jbHVkZXMga2V5cywgZmx1dGVzLCBsYW1wcywgYW5kIHN0YXR1ZXMuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplV2FsbEVsZW1lbnRzID0gV29ybGQuZmxhZygnV2UnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBlbGVtZW50cyB0byBicmVhayB3YWxscycsXG4gICAgdGV4dDogYFdhbGxzIHdpbGwgcmVxdWlyZSBhIHJhbmRvbWl6ZWQgZWxlbWVudCB0byBicmVhay4gIE5vcm1hbCByb2NrIGFuZFxuICAgICAgICAgICBpY2Ugd2FsbHMgd2lsbCBpbmRpY2F0ZSB0aGUgcmVxdWlyZWQgZWxlbWVudCBieSB0aGUgY29sb3IgKGxpZ2h0XG4gICAgICAgICAgIGdyZXkgb3IgeWVsbG93IGZvciB3aW5kLCBibHVlIGZvciBmaXJlLCBicmlnaHQgb3JhbmdlIChcImVtYmVyc1wiKSBmb3JcbiAgICAgICAgICAgd2F0ZXIsIG9yIGRhcmsgZ3JleSAoXCJzdGVlbFwiKSBmb3IgdGh1bmRlci4gIFRoZSBlbGVtZW50IHRvIGJyZWFrXG4gICAgICAgICAgIHRoZXNlIHdhbGxzIGlzIHRoZSBzYW1lIHRocm91Z2hvdXQgYW4gYXJlYS4gIElyb24gd2FsbHMgcmVxdWlyZSBhXG4gICAgICAgICAgIG9uZS1vZmYgcmFuZG9tIGVsZW1lbnQsIHdpdGggbm8gdmlzdWFsIGN1ZSwgYW5kIHR3byB3YWxscyBpbiB0aGVcbiAgICAgICAgICAgc2FtZSBhcmVhIG1heSBoYXZlIGRpZmZlcmVudCByZXF1aXJlbWVudHMuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNodWZmbGVHb2FGbG9vcnMgPSBXb3JsZC5mbGFnKCdXZycsIHtcbiAgICBuYW1lOiAnU2h1ZmZsZSBHb2EgZm9ydHJlc3MgZmxvb3JzJyxcbiAgICAvLyBUT0RPIC0gc2h1ZmZsZSB0aGUgYXJlYS10by1ib3NzIGNvbm5lY3Rpb25zLCB0b28uXG4gICAgdGV4dDogYFRoZSBmb3VyIGFyZWFzIG9mIEdvYSBmb3J0cmVzcyB3aWxsIGFwcGVhciBpbiBhIHJhbmRvbSBvcmRlci5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplU3ByaXRlQ29sb3JzID0gV29ybGQuZmxhZygnV3MnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBzcHJpdGUgY29sb3JzJyxcbiAgICB0ZXh0OiBgTW9uc3RlcnMgYW5kIE5QQ3Mgd2lsbCBoYXZlIGRpZmZlcmVudCBjb2xvcnMuICBUaGlzIGlzIG5vdCBhblxuICAgICAgICAgICBvcHRpb25hbCBmbGFnIGJlY2F1c2UgaXQgYWZmZWN0cyB3aGF0IG1vbnN0ZXJzIGNhbiBiZSBncm91cGVkXG4gICAgICAgICAgIHRvZ2V0aGVyLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVXaWxkV2FycCA9IFdvcmxkLmZsYWcoJ1d3Jywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgd2lsZCB3YXJwJyxcbiAgICB0ZXh0OiBgV2lsZCB3YXJwIHdpbGwgZ28gdG8gTWV6YW1lIFNocmluZSBhbmQgMTUgb3RoZXIgcmFuZG9tIGxvY2F0aW9ucy5cbiAgICAgICAgICAgVGhlc2UgbG9jYXRpb25zIHdpbGwgYmUgY29uc2lkZXJlZCBpbi1sb2dpYy5gLFxuICAgIGV4Y2x1ZGVzOiBbJ1Z3J10sXG4gIH0pO1xufVxuXG5jbGFzcyBSb3V0aW5nIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnUic7XG4gIHJlYWRvbmx5IG5hbWUgPSAnUm91dGluZyc7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFN0b3J5TW9kZSA9IFJvdXRpbmcuZmxhZygnUnMnLCB7XG4gICAgbmFtZTogJ1N0b3J5IE1vZGUnLFxuICAgIHRleHQ6IGBEcmF5Z29uIDIgd29uJ3Qgc3Bhd24gdW5sZXNzIHlvdSBoYXZlIGFsbCBmb3VyIHN3b3JkcyBhbmQgaGF2ZVxuICAgICAgICAgICBkZWZlYXRlZCBhbGwgbWFqb3IgYm9zc2VzIG9mIHRoZSB0ZXRyYXJjaHkuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vQm93TW9kZSA9IFJvdXRpbmcuZmxhZygnUmInLCB7XG4gICAgbmFtZTogJ05vIEJvdyBtb2RlJyxcbiAgICB0ZXh0OiBgTm8gaXRlbXMgYXJlIHJlcXVpcmVkIHRvIGZpbmlzaCB0aGUgZ2FtZS4gIEFuIGV4aXQgaXMgYWRkZWQgZnJvbVxuICAgICAgICAgICBNZXphbWUgc2hyaW5lIGRpcmVjdGx5IHRvIHRoZSBEcmF5Z29uIDIgZmlnaHQgKGFuZCB0aGUgbm9ybWFsIGVudHJhbmNlXG4gICAgICAgICAgIGlzIHJlbW92ZWQpLiAgRHJheWdvbiAyIHNwYXducyBhdXRvbWF0aWNhbGx5IHdpdGggbm8gQm93IG9mIFRydXRoLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBPcmJzTm90UmVxdWlyZWQgPSBSb3V0aW5nLmZsYWcoJ1JvJywge1xuICAgIG5hbWU6ICdPcmJzIG5vdCByZXF1aXJlZCB0byBicmVhayB3YWxscycsXG4gICAgdGV4dDogYFdhbGxzIGNhbiBiZSBicm9rZW4gYW5kIGJyaWRnZXMgZm9ybWVkIHdpdGggbGV2ZWwgMSBzaG90cy5gXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb1RodW5kZXJTd29yZFdhcnAgPSBSb3V0aW5nLmZsYWcoJ1J0Jywge1xuICAgIG5hbWU6ICdObyBTd29yZCBvZiBUaHVuZGVyIHdhcnAnLFxuICAgIHRleHQ6IGBOb3JtYWxseSB3aGVuIGFjcXVpcmluZyB0aGUgdGh1bmRlciBzd29yZCwgdGhlIHBsYXllciBpcyBpbnN0YW50bHlcbiAgICAgICAgICAgd2FycGVkIHRvIGEgcmFuZG9tIHRvd24uICBUaGlzIGZsYWcgZGlzYWJsZXMgdGhlIHdhcnAuICBJZiBzZXQgYXNcbiAgICAgICAgICAgXCJSIXRcIiwgdGhlbiB0aGUgd2FycCB3aWxsIGFsd2F5cyBnbyB0byBTaHlyb24sIGxpa2UgaW4gdmFuaWxsYS5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBWYW5pbGxhRG9scGhpbiA9IFJvdXRpbmcuZmxhZygnUmQnLCB7XG4gICAgbmFtZTogJ1ZhbmlsbGEgRG9scGhpbiBpbnRlcmFjdGlvbnMnLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB0aGUgcmFuZG9taXplciBjaGFuZ2VzIGEgbnVtYmVyIG9mIGRvbHBoaW4gYW5kIGJvYXRcbiAgICAgICAgICAgaW50ZXJhY3Rpb25zOiAoMSkgaGVhbGluZyB0aGUgZG9scGhpbiBhbmQgaGF2aW5nIHRoZSBTaGVsbCBGbHV0ZVxuICAgICAgICAgICBpcyBubyBsb25nZXIgcmVxdWlyZWQgYmVmb3JlIHRoZSBmaXNoZXJtYW4gc3Bhd25zOiBpbnN0ZWFkLCBoZVxuICAgICAgICAgICB3aWxsIHNwYXduIGFzIHNvb24gYXMgeW91IGhhdmUgdGhlIGl0ZW0gaGUgd2FudHM7ICgyKSB0YWxraW5nIHRvXG4gICAgICAgICAgIEtlbnN1IGluIHRoZSBiZWFjaCBjYWJpbiBpcyBubyBsb25nZXIgcmVxdWlyZWQgZm9yIHRoZSBTaGVsbCBGbHV0ZVxuICAgICAgICAgICB0byB3b3JrOiBpbnN0ZWFkLCB0aGUgU2hlbGwgRmx1dGUgd2lsbCBhbHdheXMgd29yaywgYW5kIEtlbnN1IHdpbGxcbiAgICAgICAgICAgc3Bhd24gYWZ0ZXIgdGhlIEZvZyBMYW1wIGlzIHR1cm5lZCBpbiBhbmQgd2lsbCBnaXZlIGEga2V5IGl0ZW1cbiAgICAgICAgICAgY2hlY2suICBUaGlzIGZsYWcgcmVzdG9yZXMgdGhlIHZhbmlsbGEgaW50ZXJhY3Rpb24gd2hlcmUgaGVhbGluZ1xuICAgICAgICAgICBhbmQgc2hlbGwgZmx1dGUgYXJlIHJlcXVpcmVkLCBhbmQgS2Vuc3Ugbm8gbG9uZ2VyIGRyb3BzIGFuIGl0ZW0uYCxcbiAgfSk7XG59XG5cbmNsYXNzIEdsaXRjaGVzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnRyc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnR2xpdGNoZXMnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIEJ5IGRlZmF1bHQsIHRoZSByYW5kb21pemVyIGRpc2FibGVzIGFsbCBrbm93biBnbGl0Y2hlcyAoZXhjZXB0IGdoZXR0b1xuICAgICAgZmxpZ2h0KS4gIFRoZXNlIGZsYWdzIHNlbGVjdGl2ZWx5IHJlLWVuYWJsZSBjZXJ0YWluIGdsaXRjaGVzLiAgTW9zdCBvZlxuICAgICAgdGhlc2UgZmxhZ3MgaGF2ZSB0d28gbW9kZXM6IG5vcm1hbGx5IGVuYWJsaW5nIGEgZ2xpdGNoIHdpbGwgYWRkIGl0IGFzXG4gICAgICBwb3NzaWJseSByZXF1aXJlZCBieSBsb2dpYywgYnV0IGNsaWNraW5nIGEgc2Vjb25kIHRpbWUgd2lsbCBhZGQgYSAnISdcbiAgICAgIGFuZCBlbmFibGUgdGhlIGdsaXRjaCBvdXRzaWRlIG9mIGxvZ2ljIChlLmcuIFwiRyFjXCIpLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEdoZXR0b0ZsaWdodCA9IEdsaXRjaGVzLmZsYWcoJ0dmJywge1xuICAgIG5hbWU6ICdHaGV0dG8gZmxpZ2h0JyxcbiAgICB0ZXh0OiBgR2hldHRvIGZsaWdodCBhbGxvd3MgdXNpbmcgRG9scGhpbiBhbmQgUmFiYml0IEJvb3RzIHRvIGZseSB1cCB0aGVcbiAgICAgICAgICAgd2F0ZXJmYWxscyBpbiB0aGUgQW5ncnkgU2VhICh3aXRob3V0IGNhbG1pbmcgdGhlIHdoaXJscG9vbHMpLlxuICAgICAgICAgICBUaGlzIGlzIGRvbmUgYnkgc3dpbW1pbmcgdXAgdG8gYSBkaWFnb25hbCBiZWFjaCBhbmQganVtcGluZ1xuICAgICAgICAgICBpbiBhIGRpZmZlcmVudCBkaXJlY3Rpb24gaW1tZWRpYXRlbHkgYmVmb3JlIGRpc2VtYmFya2luZy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU3RhdHVlR2xpdGNoID0gR2xpdGNoZXMuZmxhZygnR3MnLCB7XG4gICAgbmFtZTogJ1N0YXR1ZSBnbGl0Y2gnLFxuICAgIHRleHQ6IGBTdGF0dWUgZ2xpdGNoIGFsbG93cyBnZXR0aW5nIGJlaGluZCBzdGF0dWVzIHRoYXQgYmxvY2sgY2VydGFpblxuICAgICAgICAgICBlbnRyYW5jZXM6IHRoZSBndWFyZHMgaW4gUG9ydG9hLCBBbWF6b25lcywgT2FrLCBHb2EsIGFuZCBTaHlyb24sXG4gICAgICAgICAgIGFzIHdlbGwgYXMgdGhlIHN0YXR1ZXMgaW4gdGhlIFdhdGVyZmFsbCBDYXZlLiAgSXQgaXMgZG9uZSBieVxuICAgICAgICAgICBhcHByb2FjaGluZyB0aGUgc3RhdHVlIGZyb20gdGhlIHRvcCByaWdodCBhbmQgaG9sZGluZyBkb3duIGFuZFxuICAgICAgICAgICBsZWZ0IG9uIHRoZSBjb250cm9sbGVyIHdoaWxlIG1hc2hpbmcgQi5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBNdFNhYnJlUmVxdWlyZW1lbnRTa2lwID0gR2xpdGNoZXMuZmxhZygnR24nLCB7XG4gICAgbmFtZTogJ010IFNhYnJlIHJlcXVpcmVtZW50cyBza2lwJyxcbiAgICB0ZXh0OiBgRW50ZXJpbmcgTXQgU2FicmUgTm9ydGggbm9ybWFsbHkgcmVxdWlyZXMgKDEpIGhhdmluZyBUZWxlcG9ydCxcbiAgICAgICAgICAgYW5kICgyKSB0YWxraW5nIHRvIHRoZSByYWJiaXQgaW4gTGVhZiBhZnRlciB0aGUgYWJkdWN0aW9uICh2aWFcbiAgICAgICAgICAgVGVsZXBhdGh5KS4gIEJvdGggb2YgdGhlc2UgcmVxdWlyZW1lbnRzIGNhbiBiZSBza2lwcGVkOiBmaXJzdCBieVxuICAgICAgICAgICBmbHlpbmcgb3ZlciB0aGUgcml2ZXIgaW4gQ29yZGVsIHBsYWluIHJhdGhlciB0aGFuIGNyb3NzaW5nIHRoZVxuICAgICAgICAgICBicmlkZ2UsIGFuZCB0aGVuIGJ5IHRocmVhZGluZyB0aGUgbmVlZGxlIGJldHdlZW4gdGhlIGhpdGJveGVzIGluXG4gICAgICAgICAgIE10IFNhYnJlIE5vcnRoLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFN0YXR1ZUdhdW50bGV0U2tpcCA9IEdsaXRjaGVzLmZsYWcoJ0dnJywge1xuICAgIG5hbWU6ICdTdGF0dWUgZ2F1bnRsZXQgc2tpcCcsXG4gICAgdGV4dDogYFRoZSBzaG9vdGluZyBzdGF0dWVzIGluIGZyb250IG9mIEdvYSBhbmQgU3R4eSBub3JtYWxseSByZXF1aXJlXG4gICAgICAgICAgIEJhcnJpZXIgdG8gcGFzcyBzYWZlbHkuICBXaXRoIHRoaXMgZmxhZywgRmxpZ2h0IGNhbiBhbHNvIGJlIHVzZWRcbiAgICAgICAgICAgYnkgZmx5aW5nIGFyb3VuZCB0aGUgZWRnZSBvZiB0aGUgc3RhdHVlLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFN3b3JkQ2hhcmdlR2xpdGNoID0gR2xpdGNoZXMuZmxhZygnR2MnLCB7XG4gICAgbmFtZTogJ1N3b3JkIGNoYXJnZSBnbGl0Y2gnLFxuICAgIHRleHQ6IGBTd29yZCBjaGFyZ2UgZ2xpdGNoIGFsbG93cyBjaGFyZ2luZyBvbmUgc3dvcmQgdG8gdGhlIGxldmVsIG9mXG4gICAgICAgICAgIGFub3RoZXIgc3dvcmQgYnkgZXF1aXBwaW5nIHRoZSBoaWdoZXItbGV2ZWwgc3dvcmQsIHJlLWVudGVyaW5nXG4gICAgICAgICAgIHRoZSBtZW51LCBjaGFuZ2luZyB0byB0aGUgbG93ZXItbGV2ZWwgc3dvcmQgd2l0aG91dCBleGl0aW5nIHRoZVxuICAgICAgICAgICBtZW51LCBjcmVhdGluZyBhIGhhcmQgc2F2ZSwgcmVzZXR0aW5nLCBhbmQgdGhlbiBjb250aW51aW5nLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVHJpZ2dlclNraXAgPSBHbGl0Y2hlcy5mbGFnKCdHdCcsIHtcbiAgICBuYW1lOiAnVHJpZ2dlciBza2lwJyxcbiAgICB0ZXh0OiBgQSB3aWRlIHZhcmlldHkgb2YgdHJpZ2dlcnMgYW5kIGV4aXQgc3F1YXJlcyBjYW4gYmUgc2tpcHBlZCBieVxuICAgICAgICAgICB1c2luZyBhbiBpbnZhbGlkIGl0ZW0gZXZlcnkgZnJhbWUgd2hpbGUgd2Fsa2luZy4gIFRoaXMgYWxsb3dzXG4gICAgICAgICAgIGJ5cGFzc2luZyBib3RoIE10IFNhYnJlIE5vcnRoIGVudHJhbmNlIHRyaWdnZXJzLCB0aGUgRXZpbCBTcGlyaXRcbiAgICAgICAgICAgSXNsYW5kIGVudHJhbmNlIHRyaWdnZXIsIHRyaWdnZXJzIGZvciBndWFyZHMgdG8gbW92ZSwgc2xvcGVzLFxuICAgICAgICAgICBkYW1hZ2UgdGlsZXMsIGFuZCBzZWFtbGVzcyBtYXAgdHJhbnNpdGlvbnMuYCxcbiAgICBoYXJkOiB0cnVlLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYWdlU2tpcCA9IEdsaXRjaGVzLmZsYWcoJ0dyJywge1xuICAgIG5hbWU6ICdSYWdlIHNraXAnLFxuICAgIHRleHQ6IGBSYWdlIGNhbiBiZSBza2lwcGVkIGJ5IGRhbWFnZS1ib29zdGluZyBkaWFnb25hbGx5IGludG8gdGhlIExpbWVcbiAgICAgICAgICAgVHJlZSBMYWtlIHNjcmVlbi4gIFRoaXMgcHJvdmlkZXMgYWNjZXNzIHRvIHRoZSBhcmVhIGJleW9uZCB0aGVcbiAgICAgICAgICAgbGFrZSBpZiBmbGlnaHQgb3IgYnJpZGdlcyBhcmUgYXZhaWxhYmxlLiAgRm9yIHNpbXBsaWNpdHksIHRoZVxuICAgICAgICAgICBsb2dpYyBvbmx5IGFzc3VtZXMgdGhpcyBpcyBwb3NzaWJsZSBpZiB0aGVyZSdzIGEgZmx5ZXIuYCxcbiAgICBoYXJkOiB0cnVlLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xufVxuXG5jbGFzcyBBZXN0aGV0aWNzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnQSc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnQWVzdGhldGljcyc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlc2UgZmxhZ3MgZG9uJ3QgZGlyZWN0bHkgYWZmZWN0IGdhbWVwbGF5IG9yIHNodWZmbGluZywgYnV0IHRoZXkgZG9cbiAgICAgIGFmZmVjdCB0aGUgZXhwZXJpZW5jZSBzaWduaWZpY2FudGx5IGVub3VnaCB0aGF0IHRoZXJlIGFyZSB0aHJlZSBtb2Rlc1xuICAgICAgZm9yIGVhY2g6IFwib2ZmXCIsIFwib3B0aW9uYWxcIiAobm8gZXhjbGFtYXRpb24gcG9pbnQpLCBhbmQgXCJyZXF1aXJlZFwiXG4gICAgICAoZXhjbGFtYXRpb24gcG9pbnQpLiAgVGhlIGZpcnN0IHR3byBhcmUgZXF1aXZhbGVudCBmb3Igc2VlZCBnZW5lcmF0aW9uXG4gICAgICBwdXJwb3Nlcywgc28gdGhhdCB5b3UgY2FuIHBsYXkgdGhlIHNhbWUgc2VlZCB3aXRoIGVpdGhlciBzZXR0aW5nLlxuICAgICAgU2V0dGluZyBpdCB0byBcIiFcIiB3aWxsIGNoYW5nZSB0aGUgc2VlZC5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVNdXNpYyA9IEFlc3RoZXRpY3MuZmxhZygnQW0nLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBiYWNrZ3JvdW5kIG11c2ljJyxcbiAgICBtb2RlczogJyEnLFxuICAgIG9wdGlvbmFsOiBOT19CQU5HLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9NdXNpYyA9IEFlc3RoZXRpY3MuZmxhZygnQXMnLCB7XG4gICAgbmFtZTogJ05vIGJhY2tncm91bmQgbXVzaWMnLFxuICAgIG9wdGlvbmFsOiBPUFRJT05BTCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZU1hcENvbG9ycyA9IEFlc3RoZXRpY3MuZmxhZygnQWMnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBtYXAgY29sb3JzJyxcbiAgICBtb2RlczogJyEnLFxuICAgIG9wdGlvbmFsOiBOT19CQU5HLFxuICB9KTtcbn1cblxuY2xhc3MgTW9uc3RlcnMgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdNJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdNb25zdGVycyc7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVdlYWtuZXNzZXMgPSBNb25zdGVycy5mbGFnKCdNZScsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIG1vbnN0ZXIgd2Vha25lc3NlcycsXG4gICAgdGV4dDogYE1vbnN0ZXIgYW5kIGJvc3MgZWxlbWVudGFsIHdlYWtuZXNzZXMgYXJlIHNodWZmbGVkLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBUb3dlclJvYm90cyA9IE1vbnN0ZXJzLmZsYWcoJ010Jywge1xuICAgIG5hbWU6ICdTaHVmZmxlIHRvd2VyIHJvYm90cycsXG4gICAgdGV4dDogYFRvd2VyIHJvYm90cyB3aWxsIGJlIHNodWZmbGVkIGludG8gdGhlIG5vcm1hbCBwb29sLiAgQXQgc29tZVxuICAgICAgICAgICBwb2ludCwgbm9ybWFsIG1vbnN0ZXJzIG1heSBiZSBzaHVmZmxlZCBpbnRvIHRoZSB0b3dlciBhcyB3ZWxsLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG59XG5cbmNsYXNzIEVhc3lNb2RlIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnRSc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnRWFzeSBNb2RlJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBUaGUgZm9sbG93aW5nIG9wdGlvbnMgbWFrZSBwYXJ0cyBvZiB0aGUgZ2FtZSBlYXNpZXIuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9TaHVmZmxlTWltaWNzID0gRWFzeU1vZGUuZmxhZygnRXQnLCB7XG4gICAgbmFtZTogYERvbid0IHNodWZmbGUgbWltaWNzLmAsXG4gICAgdGV4dDogYE1pbWljcyB3aWxsIGJlIGluIHRoZWlyIHZhbmlsbGEgbG9jYXRpb25zLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBQcmVzZXJ2ZVVuaXF1ZUNoZWNrcyA9IEVhc3lNb2RlLmZsYWcoJ0V1Jywge1xuICAgIG5hbWU6ICdLZWVwIHVuaXF1ZSBpdGVtcyBhbmQgY29uc3VtYWJsZXMgc2VwYXJhdGUnLFxuICAgIHRleHQ6IGBOb3JtYWxseSBhbGwgaXRlbXMgYW5kIG1pbWljcyBhcmUgc2h1ZmZsZWQgaW50byBhIHNpbmdsZSBwb29sIGFuZFxuICAgICAgICAgICBkaXN0cmlidXRlZCBmcm9tIHRoZXJlLiAgSWYgdGhpcyBmbGFnIGlzIHNldCwgdW5pcXVlIGl0ZW1zXG4gICAgICAgICAgIChzcGVjaWZpY2FsbHksIGFueXRoaW5nIHRoYXQgY2Fubm90IGJlIHNvbGQpIHdpbGwgb25seSBiZSBmb3VuZCBpblxuICAgICAgICAgICBlaXRoZXIgKGEpIGNoZWNrcyB0aGF0IGhlbGQgdW5pcXVlIGl0ZW1zIGluIHZhbmlsbGEsIG9yIChiKSBib3NzXG4gICAgICAgICAgIGRyb3BzLiAgQ2hlc3RzIGNvbnRhaW5pbmcgY29uc3VtYWJsZXMgaW4gdmFuaWxsYSBtYXkgYmUgc2FmZWx5XG4gICAgICAgICAgIGlnbm9yZWQsIGJ1dCBjaGVzdHMgY29udGFpbmluZyB1bmlxdWUgaXRlbXMgaW4gdmFuaWxsYSBtYXkgc3RpbGxcbiAgICAgICAgICAgZW5kIHVwIHdpdGggbm9uLXVuaXF1ZSBpdGVtcyBiZWNhdXNlIG9mIGJvc3NlcyBsaWtlIFZhbXBpcmUgMiB0aGF0XG4gICAgICAgICAgIGRyb3AgY29uc3VtYWJsZXMuICBJZiBtaW1pY3MgYXJlIHNodWZmbGVkLCB0aGV5IHdpbGwgb25seSBiZSBpblxuICAgICAgICAgICBjb25zdW1hYmxlIGxvY2F0aW9ucy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgRGVjcmVhc2VFbmVteURhbWFnZSA9IEVhc3lNb2RlLmZsYWcoJ0VkJywge1xuICAgIG5hbWU6ICdEZWNyZWFzZSBlbmVteSBkYW1hZ2UnLFxuICAgIHRleHQ6IGBFbmVteSBhdHRhY2sgcG93ZXIgd2lsbCBiZSBzaWduaWZpY2FudGx5IGRlY3JlYXNlZCBpbiB0aGUgZWFybHkgZ2FtZVxuICAgICAgICAgICAoYnkgYSBmYWN0b3Igb2YgMykuICBUaGUgZ2FwIHdpbGwgbmFycm93IGluIHRoZSBtaWQtZ2FtZSBhbmQgZXZlbnR1YWxseVxuICAgICAgICAgICBwaGFzZSBvdXQgYXQgc2NhbGluZyBsZXZlbCA0MC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgR3VhcmFudGVlU3RhcnRpbmdTd29yZCA9IEVhc3lNb2RlLmZsYWcoJ0VzJywge1xuICAgIG5hbWU6ICdHdWFyYW50ZWUgc3RhcnRpbmcgc3dvcmQnLFxuICAgIHRleHQ6IGBUaGUgTGVhZiBlbGRlciBpcyBndWFyYW50ZWVkIHRvIGdpdmUgYSBzd29yZC4gIEl0IHdpbGwgbm90IGJlXG4gICAgICAgICAgIHJlcXVpcmVkIHRvIGRlYWwgd2l0aCBhbnkgZW5lbWllcyBiZWZvcmUgZmluZGluZyB0aGUgZmlyc3Qgc3dvcmQuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEd1YXJhbnRlZVJlZnJlc2ggPSBFYXN5TW9kZS5mbGFnKCdFcicsIHtcbiAgICBuYW1lOiAnR3VhcmFudGVlIHJlZnJlc2gnLFxuICAgIHRleHQ6IGBHdWFyYW50ZWVzIHRoZSBSZWZyZXNoIHNwZWxsIHdpbGwgYmUgYXZhaWxhYmxlIGJlZm9yZSBmaWdodGluZ1xuICAgICAgICAgICBUZXRyYXJjaHMuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEV4cGVyaWVuY2VTY2FsZXNGYXN0ZXIgPSBFYXN5TW9kZS5mbGFnKCdFeCcsIHtcbiAgICBuYW1lOiAnRXhwZXJpZW5jZSBzY2FsZXMgZmFzdGVyJyxcbiAgICB0ZXh0OiBgTGVzcyBncmluZGluZyB3aWxsIGJlIHJlcXVpcmVkIHRvIFwia2VlcCB1cFwiIHdpdGggdGhlIGdhbWUgZGlmZmljdWx0eS5gLFxuICAgIGV4Y2x1ZGVzOiBbJ0h4J10sXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb0NvbW11bml0eUpva2VzID0gRWFzeU1vZGUuZmxhZygnRWMnLCB7XG4gICAgbmFtZTogJ05vIGNvbW11bml0eSBqb2tlcycsXG4gICAgdGV4dDogYFNraXAgY29tbXVuaXR5IGpva2VzLCBzdWNoIGFzIGZ1bm55L21pc3NwZWxsZWQgaXRlbSwgbW9uc3Rlciwgb3JcbiAgICAgICAgICAgY2hhcmFjdGVyIG5hbWVzLiAgVGhpcyB3aWxsIG1ha2UgaXQgZWFzaWVyIHRvIGxvb2sgdXAgaW5mb3JtYXRpb25cbiAgICAgICAgICAgaW4gZ3VpZGVzL0ZBUXMgaWYgbmVjZXNzYXJ5LmAsXG4gIH0pO1xufVxuXG5jbGFzcyBOb0d1YXJhbnRlZXMgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdOJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdObyBndWFyYW50ZWVzJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBSZW1vdmVzIHZhcmlvdXMgZ3VhcmFudGVlcyBmcm9tIHRoZSBsb2dpYy5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBCYXR0bGVNYWdpYyA9IE5vR3VhcmFudGVlcy5mbGFnKCdOdycsIHtcbiAgICBuYW1lOiAnQmF0dGxlIG1hZ2ljIG5vdCBndWFyYW50ZWVkJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHksIHRoZSBsb2dpYyB3aWxsIGd1YXJhbnRlZSB0aGF0IGxldmVsIDMgc3dvcmQgY2hhcmdlcyBhcmVcbiAgICAgICAgICAgYXZhaWxhYmxlIGJlZm9yZSBmaWdodGluZyB0aGUgdGV0cmFyY2hzICh3aXRoIHRoZSBleGNlcHRpb24gb2YgS2FybWluZSxcbiAgICAgICAgICAgd2hvIG9ubHkgcmVxdWlyZXMgbGV2ZWwgMikuICBUaGlzIGRpc2FibGVzIHRoYXQgY2hlY2suYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTWF0Y2hpbmdTd29yZCA9IE5vR3VhcmFudGVlcy5mbGFnKCdOcycsIHtcbiAgICBuYW1lOiAnTWF0Y2hpbmcgc3dvcmQgbm90IGd1YXJhbnRlZWQgKFwiVGluayBNb2RlXCIpJyxcbiAgICB0ZXh0OiBgRW5hYmxlcyBcInRpbmsgc3RyYXRzXCIsIHdoZXJlIHdyb25nLWVsZW1lbnQgc3dvcmRzIHdpbGwgc3RpbGwgZG8gYVxuICAgICAgICAgICBzaW5nbGUgZGFtYWdlIHBlciBoaXQuICBQbGF5ZXIgbWF5IGJlIHJlcXVpcmVkIHRvIGZpZ2h0IG1vbnN0ZXJzXG4gICAgICAgICAgIChpbmNsdWRpbmcgYm9zc2VzKSB3aXRoIHRpbmtzLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEJhcnJpZXIgPSBOb0d1YXJhbnRlZXMuZmxhZygnTmInLCB7XG4gICAgbmFtZTogJ0JhcnJpZXIgbm90IGd1YXJhbnRlZWQnLFxuICAgIHRleHQ6IGBOb3JtYWxseSwgdGhlIGxvZ2ljIHdpbGwgZ3VhcmFudGVlIEJhcnJpZXIgKG9yIGVsc2UgcmVmcmVzaCBhbmQgc2hpZWxkXG4gICAgICAgICAgIHJpbmcpIGJlZm9yZSBlbnRlcmluZyBTdHh5LCB0aGUgRm9ydHJlc3MsIG9yIGZpZ2h0aW5nIEthcm1pbmUuICBUaGlzXG4gICAgICAgICAgIGRpc2FibGVzIHRoYXQgY2hlY2suYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgR2FzTWFzayA9IE5vR3VhcmFudGVlcy5mbGFnKCdOZycsIHtcbiAgICBuYW1lOiAnR2FzIG1hc2sgbm90IGd1YXJhbnRlZWQnLFxuICAgIHRleHQ6IGBUaGUgbG9naWMgd2lsbCBub3QgZ3VhcmFudGVlIGdhcyBtYXNrIGJlZm9yZSBuZWVkaW5nIHRvIGVudGVyIHRoZSBzd2FtcCxcbiAgICAgICAgICAgbm9yIHdpbGwgbGVhdGhlciBib290cyAob3IgaGF6bWF0IHN1aXQpIGJlIGd1YXJhbnRlZWQgdG8gY3Jvc3MgbG9uZ1xuICAgICAgICAgICBzdHJldGNoZXMgb2Ygc3Bpa2VzLiAgR2FzIG1hc2sgaXMgc3RpbGwgZ3VhcmFudGVlZCB0byBraWxsIHRoZSBpbnNlY3QuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcbn1cblxuY2xhc3MgSGFyZE1vZGUgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdIJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdIYXJkIG1vZGUnO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb0J1ZmZNZWRpY2FsSGVyYiA9IEhhcmRNb2RlLmZsYWcoJ0htJywge1xuICAgIG5hbWU6IGBEb24ndCBidWZmIG1lZGljYWwgaGVyYiBvciBmcnVpdCBvZiBwb3dlcmAsXG4gICAgdGV4dDogYE1lZGljYWwgSGVyYiBpcyBub3QgYnVmZmVkIHRvIGhlYWwgODAgZGFtYWdlLCB3aGljaCBpcyBoZWxwZnVsIHRvIG1ha2VcbiAgICAgICAgICAgdXAgZm9yIGNhc2VzIHdoZXJlIFJlZnJlc2ggaXMgdW5hdmFpbGFibGUgZWFybHkuICBGcnVpdCBvZiBQb3dlciBpcyBub3RcbiAgICAgICAgICAgYnVmZmVkIHRvIHJlc3RvcmUgNTYgTVAuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTWF4U2NhbGluZ0luVG93ZXIgPSBIYXJkTW9kZS5mbGFnKCdIdCcsIHtcbiAgICBuYW1lOiAnTWF4IHNjYWxpbmcgbGV2ZWwgaW4gdG93ZXInLFxuICAgIHRleHQ6IGBFbmVtaWVzIGluIHRoZSB0b3dlciBzcGF3biBhdCBtYXggc2NhbGluZyBsZXZlbC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBFeHBlcmllbmNlU2NhbGVzU2xvd2VyID0gSGFyZE1vZGUuZmxhZygnSHgnLCB7XG4gICAgbmFtZTogJ0V4cGVyaWVuY2Ugc2NhbGVzIHNsb3dlcicsXG4gICAgdGV4dDogYE1vcmUgZ3JpbmRpbmcgd2lsbCBiZSByZXF1aXJlZCB0byBcImtlZXAgdXBcIiB3aXRoIHRoZSBkaWZmaWN1bHR5LmAsXG4gICAgZXhjbHVkZXM6IFsnRXgnXSxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgQ2hhcmdlU2hvdHNPbmx5ID0gSGFyZE1vZGUuZmxhZygnSGMnLCB7XG4gICAgbmFtZTogJ0NoYXJnZSBzaG90cyBvbmx5JyxcbiAgICB0ZXh0OiBgU3RhYmJpbmcgaXMgY29tcGxldGVseSBpbmVmZmVjdGl2ZS4gIE9ubHkgY2hhcmdlZCBzaG90cyB3b3JrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEJsYWNrb3V0ID0gSGFyZE1vZGUuZmxhZygnSHonLCB7XG4gICAgbmFtZTogJ0JsYWNrb3V0JyxcbiAgICB0ZXh0OiBgQWxsIGNhdmVzIGFuZCBmb3J0cmVzc2VzIGFyZSBwZXJtYW5lbnRseSBkYXJrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFBlcm1hZGVhdGggPSBIYXJkTW9kZS5mbGFnKCdIaCcsIHtcbiAgICBuYW1lOiAnUGVybWFkZWF0aCcsXG4gICAgdGV4dDogYEhhcmRjb3JlIG1vZGU6IGNoZWNrcG9pbnRzIGFuZCBzYXZlcyBhcmUgcmVtb3ZlZC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xufVxuXG5jbGFzcyBWYW5pbGxhIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBuYW1lID0gJ1ZhbmlsbGEnO1xuICByZWFkb25seSBwcmVmaXggPSAnVic7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgT3B0aW9ucyB0byByZXN0b3JlIHZhbmlsbGEgYmVoYXZpb3IgY2hhbmdlZCBieSBkZWZhdWx0LmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IER5bmEgPSBWYW5pbGxhLmZsYWcoJ1ZkJywge1xuICAgIG5hbWU6IGBEb24ndCBidWZmIER5bmFgLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB3ZSBtYWtlcyB0aGUgRHluYSBmaWdodCBhIGJpdCBtb3JlIG9mIGEgY2hhbGxlbmdlLlxuICAgICAgICAgICBTaWRlIHBvZHMgd2lsbCBmaXJlIHNpZ25pZmljYW50bHkgbW9yZS4gIFRoZSBzYWZlIHNwb3QgaGFzIGJlZW5cbiAgICAgICAgICAgcmVtb3ZlZC4gIFRoZSByZXZlbmdlIGJlYW1zIHBhc3MgdGhyb3VnaCBiYXJyaWVyLiAgU2lkZSBwb2RzIGNhblxuICAgICAgICAgICBub3cgYmUga2lsbGVkLiAgVGhpcyBmbGFnIHByZXZlbnRzIHRoYXQgY2hhbmdlLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBCb251c0l0ZW1zID0gVmFuaWxsYS5mbGFnKCdWYicsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYnVmZiBib251cyBpdGVtc2AsXG4gICAgdGV4dDogYExlYXRoZXIgQm9vdHMgYXJlIGNoYW5nZWQgdG8gU3BlZWQgQm9vdHMsIHdoaWNoIGluY3JlYXNlIHBsYXllciB3YWxraW5nXG4gICAgICAgICAgIHNwZWVkICh0aGlzIGFsbG93cyBjbGltYmluZyB1cCB0aGUgc2xvcGUgdG8gYWNjZXNzIHRoZSBUb3JuYWRvIEJyYWNlbGV0XG4gICAgICAgICAgIGNoZXN0LCB3aGljaCBpcyB0YWtlbiBpbnRvIGNvbnNpZGVyYXRpb24gYnkgdGhlIGxvZ2ljKS4gIERlbydzIHBlbmRhbnRcbiAgICAgICAgICAgcmVzdG9yZXMgTVAgd2hpbGUgbW92aW5nLiAgUmFiYml0IGJvb3RzIGVuYWJsZSBzd29yZCBjaGFyZ2luZyB1cCB0b1xuICAgICAgICAgICBsZXZlbCAyIHdoaWxlIHdhbGtpbmcgKGxldmVsIDMgc3RpbGwgcmVxdWlyZXMgYmVpbmcgc3RhdGlvbmFyeSwgc28gYXNcbiAgICAgICAgICAgdG8gcHJldmVudCB3YXN0aW5nIHRvbnMgb2YgbWFnaWMpLmAsXG4gIH0pO1xuXG4gIC8vIFRPRE8gLSBpcyBpdCB3b3J0aCBldmVuIGFsbG93aW5nIHRvIHR1cm4gdGhpcyBvZmY/IT9cbiAgc3RhdGljIHJlYWRvbmx5IE1hcHMgPSBWYW5pbGxhLmZsYWcoJ1ZtJywge1xuICAgIG5hbWU6ICdWYW5pbGxhIG1hcHMnLFxuICAgIHRleHQ6IGBOb3JtYWxseSB0aGUgcmFuZG9taXplciBhZGRzIGEgbmV3IFwiRWFzdCBDYXZlXCIgdG8gVmFsbGV5IG9mIFdpbmQsXG4gICAgICAgICAgIGJvcnJvd2VkIGZyb20gdGhlIEdCQyB2ZXJzaW9uIG9mIHRoZSBnYW1lLiAgVGhpcyBjYXZlIGNvbnRhaW5zIHR3b1xuICAgICAgICAgICBjaGVzdHMgKG9uZSBjb25zaWRlcmVkIGEga2V5IGl0ZW0pIG9uIHRoZSB1cHBlciBmbG9vciBhbmQgZXhpdHMgdG9cbiAgICAgICAgICAgdHdvIHJhbmRvbSBhcmVhcyAoY2hvc2VuIGJldHdlZW4gTGltZSBUcmVlIFZhbGxleSwgQ29yZGVsIFBsYWluLFxuICAgICAgICAgICBHb2EgVmFsbGV5LCBvciBEZXNlcnQgMjsgdGhlIHF1aWNrc2FuZCBpcyByZW1vdmVkIGZyb20gdGhlIGVudHJhbmNlc1xuICAgICAgICAgICB0byBQeXJhbWlkIGFuZCBDcnlwdCksIG9uZSB1bmJsb2NrZWQgb24gdGhlIGxvd2VyIGZsb29yLCBhbmQgb25lXG4gICAgICAgICAgIGRvd24gdGhlIHN0YWlycyBhbmQgYmVoaW5kIGEgcm9jayB3YWxsIGZyb20gdGhlIHVwcGVyIGZsb29yLiAgVGhpc1xuICAgICAgICAgICBmbGFnIHByZXZlbnRzIGFkZGluZyB0aGF0IGNhdmUuICBJZiBzZXQgYXMgXCJWIW1cIiB0aGVuIGEgZGlyZWN0IHBhdGhcbiAgICAgICAgICAgd2lsbCBpbnN0ZWFkIGJlIGFkZGVkIGJldHdlZW4gVmFsbGV5IG9mIFdpbmQgYW5kIExpbWUgVHJlZSBWYWxsZXlcbiAgICAgICAgICAgKGFzIGluIGVhcmxpZXIgdmVyc2lvbnMgb2YgdGhlIHJhbmRvbWl6ZXIpLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNob3BzID0gVmFuaWxsYS5mbGFnKCdWcycsIHtcbiAgICBuYW1lOiAnVmFuaWxsYSBzaG9wcycsXG4gICAgdGV4dDogYEJ5IGRlZmF1bHQsIHdlIGRpc2FibGUgc2hvcCBnbGl0Y2gsIHNodWZmbGUgc2hvcCBjb250ZW50cywgYW5kIHRpZVxuICAgICAgICAgICB0aGUgcHJpY2VzIHRvIHRoZSBzY2FsaW5nIGxldmVsIChpdGVtIHNob3BzIGFuZCBpbm5zIGluY3JlYXNlIGJ5IGFcbiAgICAgICAgICAgZmFjdG9yIG9mIDIgZXZlcnkgMTAgc2NhbGluZyBsZXZlbHMsIGFybW9yIHNob3BzIGRlY3JlYXNlIGJ5IGFcbiAgICAgICAgICAgZmFjdG9yIG9mIDIgZXZlcnkgMTIgc2NhbGluZyBsZXZlbHMpLiAgVGhpcyBmbGFnIHByZXZlbnRzIGFsbCBvZlxuICAgICAgICAgICB0aGVzZSBjaGFuZ2VzLCByZXN0b3Jpbmcgc2hvcHMgdG8gYmUgY29tcGxldGVseSB2YW5pbGxhLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBXaWxkV2FycCA9IFZhbmlsbGEuZmxhZygnVncnLCB7XG4gICAgbmFtZTogJ1ZhbmlsbGEgd2lsZCB3YXJwJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgV2lsZCBXYXJwIGlzIG5lcmZlZCB0byBvbmx5IHJldHVybiB0byBNZXphbWUgU2hyaW5lLlxuICAgICAgICAgICBUaGlzIGZsYWcgcmVzdG9yZXMgaXQgdG8gd29yayBsaWtlIG5vcm1hbC4gIE5vdGUgdGhhdCB0aGlzIHdpbGwgcHV0XG4gICAgICAgICAgIGFsbCB3aWxkIHdhcnAgbG9jYXRpb25zIGluIGxvZ2ljIHVubGVzcyB0aGUgZmxhZyBpcyBzZXQgYXMgKFYhdykuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgSHVkID0gVmFuaWxsYS5mbGFnKCdWaCcsIHtcbiAgICBuYW1lOiAnVmFuaWxsYSBIVUQnLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB0aGUgYmx1ZSBzdGF0dXMgYmFyIChIVUQpIGF0IHRoZSBib3R0b20gb2YgdGhlIHNjcmVlblxuICAgICAgICAgICBpcyByZW9yZ2FuaXplZCBhIGJpdCwgaW5jbHVkaW5nIGRpc3BsYXlpbmcgZW5lbWllcycgbmFtZXMgYW5kIEhQLlxuICAgICAgICAgICBUaGlzIGNhbiBiZSBzZXQgZWl0aGVyIGFzIFZoICh3aGljaCB3aWxsIG9wdGlvbmFsbHkgZGlzYWJsZSB0aGVcbiAgICAgICAgICAgY2hhbmdlcywgYW5kIHdpbGwgcHJvZHVjZSB0aGUgc2FtZSBzZWVkIGFzIG5vdCBzZXR0aW5nIFZoKSBvciBhc1xuICAgICAgICAgICBWIWggKHdoaWNoIHJlcXVpcmVzIGFsbCBwbGF5ZXJzIHRvIGRpc2FibGUgaXQgdG8gZ2V0IHRoZSBzYW1lXG4gICAgICAgICAgICBzZWVkKS5gLFxuICAgIG1vZGVzOiAnIScsXG4gICAgb3B0aW9uYWw6IE5PX0JBTkcsXG4gIH0pO1xufVxuXG5jbGFzcyBRdWFsaXR5IGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnUSc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnUXVhbGl0eSBvZiBMaWZlJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBUaGUgZm9sbG93aW5nIHF1YWxpdHktb2YtbGlmZSBmbGFncyB0dXJuIDxpPm9mZjwvaT4gaW1wcm92ZW1lbnRzIHRoYXRcbiAgICAgIGFyZSBub3JtYWxseSBvbiBieSBkZWZhdWx0LiAgVGhleSBhcmUgb3B0aW9uYWwgYW5kIHdpbGwgbm90IGFmZmVjdCB0aGVcbiAgICAgIHNlZWQgZ2VuZXJhdGlvbi4gIFRoZXkgbWF5IGJlIHRvZ2dsZWQgZnJlZWx5IGluIHJhY2UgbW9kZS5gO1xuXG4gIC8vIFRPRE8gLSByZW1lbWJlciBwcmVmZXJlbmNlcyBhbmQgYXV0by1hcHBseT9cbiAgc3RhdGljIHJlYWRvbmx5IE5vQXV0b0VxdWlwID0gUXVhbGl0eS5mbGFnKCdRYScsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYXV0b21hdGljYWxseSBlcXVpcCBvcmJzIGFuZCBicmFjZWxldHNgLFxuICAgIHRleHQ6IGBQcmV2ZW50cyBhZGRpbmcgYSBxdWFsaXR5LW9mLWxpZmUgaW1wcm92ZW1lbnQgdG8gYXV0b21hdGljYWxseSBlcXVpcFxuICAgICAgICAgICB0aGUgY29ycmVzcG9uZGluZyBvcmIvYnJhY2VsZXQgd2hlbmV2ZXIgY2hhbmdpbmcgc3dvcmRzLmAsXG4gICAgb3B0aW9uYWw6IE9QVElPTkFMLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9Db250cm9sbGVyU2hvcnRjdXRzID0gUXVhbGl0eS5mbGFnKCdRYycsIHtcbiAgICBuYW1lOiAnRGlzYWJsZSBjb250cm9sbGVyIHNob3J0Y3V0cycsXG4gICAgdGV4dDogYEJ5IGRlZmF1bHQsIHdlIGRpc2FibGUgc2Vjb25kIGNvbnRyb2xsZXIgaW5wdXQgYW5kIGluc3RlYWQgZW5hYmxlXG4gICAgICAgICAgIHNvbWUgbmV3IHNob3J0Y3V0cyBvbiBjb250cm9sbGVyIDE6IFN0YXJ0K0ErQiBmb3Igd2lsZCB3YXJwLCBhbmRcbiAgICAgICAgICAgU2VsZWN0K0IgdG8gcXVpY2tseSBjaGFuZ2Ugc3dvcmRzLiAgVG8gc3VwcG9ydCB0aGlzLCB0aGUgYWN0aW9uIG9mXG4gICAgICAgICAgIHRoZSBzdGFydCBhbmQgc2VsZWN0IGJ1dHRvbnMgaXMgY2hhbmdlZCBzbGlnaHRseS4gIFRoaXMgZmxhZ1xuICAgICAgICAgICBkaXNhYmxlcyB0aGlzIGNoYW5nZSBhbmQgcmV0YWlucyBub3JtYWwgYmVoYXZpb3IuYCxcbiAgICBvcHRpb25hbDogT1BUSU9OQUwsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBBdWRpYmxlV2FsbEN1ZXMgPSBRdWFsaXR5LmZsYWcoJ1F3Jywge1xuICAgIG5hbWU6ICdBdWRpYmxlIHdhbGwgY3VlcycsXG4gICAgdGV4dDogYFByb3ZpZGUgYW4gYXVkaWJsZSBjdWUgd2hlbiBmYWlsaW5nIHRvIGJyZWFrIGEgbm9uLWlyb24gd2FsbC5cbiAgICAgICAgICAgVGhlIGludGVuZGVkIHdheSB0byBkZXRlcm1pbmUgd2hpY2ggc3dvcmQgaXMgcmVxdWlyZWQgZm9yIG5vcm1hbFxuICAgICAgICAgICBjYXZlIHdhbGxzIGlzIGJ5IGxvb2tpbmcgYXQgdGhlIGNvbG9yLiAgVGhpcyBjYXVzZXMgdGhlIGxldmVsIDNcbiAgICAgICAgICAgc3dvcmQgc291bmQgb2YgdGhlIHJlcXVpcmVkIGVsZW1lbnQgdG8gcGxheSB3aGVuIHRoZSB3YWxsIGZhaWxzXG4gICAgICAgICAgIHRvIGJyZWFrLiAgTm90ZSB0aGF0IGZvcnRyZXNzIHdhbGxzIChpcm9uIGluIHZhbmlsbGEpIGRvIG5vdCBnaXZlXG4gICAgICAgICAgIHRoaXMgaGludCwgc2luY2UgdGhlcmUgaXMgbm8gdmlzdWFsIGN1ZSBmb3IgdGhlbSwgZWl0aGVyLmAsXG4gICAgb3B0aW9uYWw6IE9QVElPTkFMLFxuICB9KTtcbn1cblxuY2xhc3MgRGVidWdNb2RlIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICAvLyBUT0RPIC0gaG93IHRvIGRpc2NvdmVyIEZsYWdTZWN0aW9ucz8/P1xuICByZWFkb25seSBwcmVmaXggPSAnRCc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnRGVidWcgTW9kZSc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlc2Ugb3B0aW9ucyBhcmUgaGVscGZ1bCBmb3IgZXhwbG9yaW5nIG9yIGRlYnVnZ2luZy4gIE5vdGUgdGhhdCxcbiAgICAgIHdoaWxlIHRoZXkgZG8gbm90IGRpcmVjdGx5IGFmZmVjdCBhbnkgcmFuZG9taXphdGlvbiwgdGhleVxuICAgICAgPGk+ZG88L2k+IGZhY3RvciBpbnRvIHRoZSBzZWVkIHRvIHByZXZlbnQgY2hlYXRpbmcsIGFuZCB0aGV5XG4gICAgICB3aWxsIHJlbW92ZSB0aGUgb3B0aW9uIHRvIGdlbmVyYXRlIGEgc2VlZCBmb3IgcmFjaW5nLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNwb2lsZXJMb2cgPSBEZWJ1Z01vZGUuZmxhZygnRHMnLCB7XG4gICAgbmFtZTogJ0dlbmVyYXRlIGEgc3BvaWxlciBsb2cnLFxuICAgIHRleHQ6IGBOb3RlOiA8Yj50aGlzIHdpbGwgY2hhbmdlIHRoZSBwbGFjZW1lbnQgb2YgaXRlbXM8L2I+IGNvbXBhcmVkIHRvIGFcbiAgICAgICAgICAgc2VlZCBnZW5lcmF0ZWQgd2l0aG91dCB0aGlzIGZsYWcgdHVybmVkIG9uLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBUcmFpbmVyTW9kZSA9IERlYnVnTW9kZS5mbGFnKCdEdCcsIHtcbiAgICBuYW1lOiAnVHJhaW5lciBtb2RlJyxcbiAgICB0ZXh0OiBgSW5zdGFsbHMgYSB0cmFpbmVyIGZvciBwcmFjdGljaW5nIGNlcnRhaW4gcGFydHMgb2YgdGhlIGdhbWUuXG4gICAgICAgICAgIEF0IHRoZSBzdGFydCBvZiB0aGUgZ2FtZSwgdGhlIHBsYXllciB3aWxsIGhhdmUgYWxsIHN3b3JkcywgYmFzaWNcbiAgICAgICAgICAgYXJtb3JzIGFuZCBzaGllbGRzLCBhbGwgd29ybiBpdGVtcyBhbmQgbWFnaWNzLCBhIHNlbGVjdGlvbiBvZlxuICAgICAgICAgICBjb25zdW1hYmxlcywgYm93IG9mIHRydXRoLCBtYXhpbXVtIGNhc2gsIGFsbCB3YXJwIHBvaW50cyBhY3RpdmF0ZWQsXG4gICAgICAgICAgIGFuZCB0aGUgU2h5cm9uIG1hc3NhY3JlIHdpbGwgaGF2ZSBiZWVuIHRyaWdnZXJlZC4gIFdpbGQgd2FycCBpc1xuICAgICAgICAgICByZWNvbmZpZ3VyZWQgdG8gcHJvdmlkZSBlYXN5IGFjY2VzcyB0byBhbGwgYm9zc2VzLiAgQWRkaXRpb25hbGx5LFxuICAgICAgICAgICB0aGUgZm9sbG93aW5nIGJ1dHRvbiBjb21iaW5hdGlvbnMgYXJlIHJlY29nbml6ZWQ6PHVsPlxuICAgICAgICAgICAgIDxsaT5TdGFydCtVcDogaW5jcmVhc2UgcGxheWVyIGxldmVsXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0Rvd246IGluY3JlYXNlIHNjYWxpbmcgbGV2ZWxcbiAgICAgICAgICAgICA8bGk+U3RhcnQrTGVmdDogZ2V0IGFsbCBiYWxsc1xuICAgICAgICAgICAgIDxsaT5TdGFydCtSaWdodDogZ2V0IGFsbCBicmFjZWxldHNcbiAgICAgICAgICAgICA8bGk+U3RhcnQrQitEb3duOiBnZXQgYSBmdWxsIHNldCBvZiBjb25zdW1hYmxlIGl0ZW1zXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0IrTGVmdDogZ2V0IGFsbCBhZHZhbmNlZCBhcm1vcnNcbiAgICAgICAgICAgICA8bGk+U3RhcnQrQitSaWdodDogZ2V0IGFsbCBhZHZhbmNlZCBzaGllbGRzXG4gICAgICAgICAgIDwvdWw+YCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5ldmVyRGllID0gRGVidWdNb2RlLmZsYWcoJ0RpJywge1xuICAgIG5hbWU6ICdQbGF5ZXIgbmV2ZXIgZGllcycsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb1NodWZmbGUgPSBEZWJ1Z01vZGUuZmxhZygnRG4nLCB7XG4gICAgbmFtZTogJ0RvIG5vdCBzaHVmZmxlIGl0ZW1zJyxcbiAgICB0ZXh0OiBgSXRlbXMgd2lsbCBub3QgYmUgc2h1ZmZsZWQuIFdBUk5JTkc6IFRoaXMgZGlzYWJsZXMgdGhlIGxvZ2ljIGFuZFxuICAgICAgICAgICBpcyB2ZXJ5IGxpa2VseSB0byByZXN1bHQgaW4gYW4gdW53aW5uYWJsZSBzZWVkYCxcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBGbGFnU2V0IHtcbiAgcHJpdmF0ZSBmbGFnczogTWFwPEZsYWcsIE1vZGU+O1xuXG4gIGNvbnN0cnVjdG9yKHN0cjogc3RyaW5nfE1hcDxGbGFnLCBNb2RlPiA9ICdAQ2FzdWFsJykge1xuICAgIGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5mbGFncyA9IG5ldyBNYXAoKTtcbiAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHN0cikge1xuICAgICAgICB0aGlzLnNldChrLmZsYWcsIHYpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc3RyLnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgLy8gVE9ETyAtIHN1cHBvcnQgJ0BDYXN1YWwrUnMtRWQnXG4gICAgICBjb25zdCBleHBhbmRlZCA9IFByZXNldHMuZ2V0KHN0ci5zdWJzdHJpbmcoMSkpO1xuICAgICAgaWYgKCFleHBhbmRlZCkgdGhyb3cgbmV3IFVzYWdlRXJyb3IoYFVua25vd24gcHJlc2V0OiAke3N0cn1gKTtcbiAgICAgIHRoaXMuZmxhZ3MgPSBuZXcgTWFwKGV4cGFuZGVkLmZsYWdzKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5mbGFncyA9IG5ldyBNYXAoKTtcbiAgICAvLyBwYXJzZSB0aGUgc3RyaW5nXG4gICAgc3RyID0gc3RyLnJlcGxhY2UoL1teQS1aYS16MC05IT9dL2csICcnKTtcbiAgICBjb25zdCByZSA9IC8oW0EtWl0pKFthLXowLTkhP10rKS9nO1xuICAgIGxldCBtYXRjaDtcbiAgICB3aGlsZSAoKG1hdGNoID0gcmUuZXhlYyhzdHIpKSkge1xuICAgICAgY29uc3QgWywga2V5LCB0ZXJtc10gPSBtYXRjaDtcbiAgICAgIGNvbnN0IHJlMiA9IC8oWyE/XXxeKShbYS16MC05XSspL2c7XG4gICAgICB3aGlsZSAoKG1hdGNoID0gcmUyLmV4ZWModGVybXMpKSkge1xuICAgICAgICBjb25zdCBbLCBtb2RlLCBmbGFnc10gPSBtYXRjaDtcbiAgICAgICAgZm9yIChjb25zdCBmbGFnIG9mIGZsYWdzKSB7XG4gICAgICAgICAgdGhpcy5zZXQoa2V5ICsgZmxhZywgbW9kZSB8fCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZpbHRlck9wdGlvbmFsKCk6IEZsYWdTZXQge1xuICAgIHJldHVybiBuZXcgRmxhZ1NldChcbiAgICAgICAgbmV3IE1hcChcbiAgICAgICAgICAgIFsuLi50aGlzLmZsYWdzXS5tYXAoXG4gICAgICAgICAgICAgICAgKFtrLCB2XSkgPT4gW2ssIGsub3B0cy5vcHRpb25hbCA/IGsub3B0cy5vcHRpb25hbCh2KSA6IHZdKSkpO1xuICB9XG5cbiAgZmlsdGVyUmFuZG9tKHJhbmRvbTogUmFuZG9tKTogRmxhZ1NldCB7XG4gICAgZnVuY3Rpb24gcGljayhrOiBGbGFnLCB2OiBNb2RlKTogTW9kZSB7XG4gICAgICBpZiAodiAhPT0gJz8nKSByZXR1cm4gdjtcbiAgICAgIHJldHVybiByYW5kb20ucGljayhbdHJ1ZSwgZmFsc2UsIC4uLihrLm9wdHMubW9kZXMgfHwgJycpXSk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgRmxhZ1NldChcbiAgICAgICAgbmV3IE1hcChbLi4udGhpcy5mbGFnc10ubWFwKChbaywgdl0pID0+IFtrLCBwaWNrKGssIHYpXSkpKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIHR5cGUgU2VjdGlvbiA9IERlZmF1bHRNYXA8c3RyaW5nLCBzdHJpbmdbXT47XG4gICAgY29uc3Qgc2VjdGlvbnMgPVxuICAgICAgICBuZXcgRGVmYXVsdE1hcDxzdHJpbmcsIFNlY3Rpb24+KFxuICAgICAgICAgICAgKCkgPT4gbmV3IERlZmF1bHRNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKCkgPT4gW10pKVxuICAgIGZvciAoY29uc3QgW2ZsYWcsIG1vZGVdIG9mIHRoaXMuZmxhZ3MpIHtcbiAgICAgIGlmIChmbGFnLmZsYWcubGVuZ3RoICE9PSAyKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBmbGFnICR7ZmxhZy5mbGFnfWApO1xuICAgICAgaWYgKCFtb2RlKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHNlY3Rpb24gPSBzZWN0aW9ucy5nZXQoZmxhZy5mbGFnWzBdKTtcbiAgICAgIGNvbnN0IHN1YnNlY3Rpb24gPSBtb2RlID09PSB0cnVlID8gJycgOiBtb2RlO1xuICAgICAgc2VjdGlvbi5nZXQoc3Vic2VjdGlvbikucHVzaChmbGFnLmZsYWdbMV0pO1xuICAgIH1cbiAgICBjb25zdCBvdXQgPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHNlY3Rpb25dIG9mIHNlY3Rpb25zLnNvcnRlZEVudHJpZXMoKSkge1xuICAgICAgbGV0IHNlYyA9IGtleTtcbiAgICAgIGZvciAoY29uc3QgW3N1YmtleSwgc3Vic2VjdGlvbl0gb2Ygc2VjdGlvbi5zb3J0ZWRFbnRyaWVzKCkpIHtcbiAgICAgICAgc2VjICs9IHN1YmtleSArIHN1YnNlY3Rpb24uc29ydCgpLmpvaW4oJycpO1xuICAgICAgfVxuICAgICAgb3V0LnB1c2goc2VjKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKCcgJyk7XG4gIH1cblxuICB0b2dnbGUobmFtZTogc3RyaW5nKTogTW9kZSB7XG4gICAgY29uc3QgZmxhZyA9IEZsYWcuZmxhZ3MuZ2V0KG5hbWUpO1xuICAgIGlmICghZmxhZykge1xuICAgICAgLy8gVE9ETyAtIFJlcG9ydCBzb21ldGhpbmdcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEJhZCBmbGFnOiAke25hbWV9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IG1vZGU6IE1vZGUgPSB0aGlzLmZsYWdzLmdldChmbGFnKSB8fCBmYWxzZTtcbiAgICBjb25zdCBtb2RlcyA9IFtmYWxzZSwgdHJ1ZSwgLi4uKGZsYWcub3B0cy5tb2RlcyB8fCAnJyksICc/JywgZmFsc2VdO1xuICAgIGNvbnN0IGluZGV4ID0gbW9kZXMuaW5kZXhPZihtb2RlKTtcbiAgICBpZiAoaW5kZXggPCAwKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBjdXJyZW50IG1vZGUgJHttb2RlfWApO1xuICAgIGNvbnN0IG5leHQgPSBtb2Rlc1tpbmRleCArIDFdO1xuICAgIHRoaXMuZmxhZ3Muc2V0KGZsYWcsIG5leHQpO1xuICAgIHJldHVybiBuZXh0O1xuICB9XG5cbiAgc2V0KG5hbWU6IHN0cmluZywgbW9kZTogTW9kZSkge1xuICAgIGNvbnN0IGZsYWcgPSBGbGFnLmZsYWdzLmdldChuYW1lKTtcbiAgICBpZiAoIWZsYWcpIHtcbiAgICAgIC8vIFRPRE8gLSBSZXBvcnQgc29tZXRoaW5nXG4gICAgICBjb25zb2xlLmVycm9yKGBCYWQgZmxhZzogJHtuYW1lfWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIW1vZGUpIHtcbiAgICAgIHRoaXMuZmxhZ3MuZGVsZXRlKGZsYWcpO1xuICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gdHJ1ZSB8fCBtb2RlID09PSAnPycgfHwgZmxhZy5vcHRzLm1vZGVzPy5pbmNsdWRlcyhtb2RlKSkge1xuICAgICAgdGhpcy5mbGFncy5zZXQoZmxhZywgbW9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEJhZCBmbGFnIG1vZGU6ICR7bmFtZVswXX0ke21vZGV9JHtuYW1lLnN1YnN0cmluZygxKX1gKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gUmVtb3ZlIGFueSBjb25mbGljdHNcbiAgICBmb3IgKGNvbnN0IGV4Y2x1ZGVkIG9mIGZsYWcub3B0cy5leGNsdWRlcyB8fCBbXSkge1xuICAgICAgdGhpcy5mbGFncy5kZWxldGUoRmxhZy5mbGFncy5nZXQoZXhjbHVkZWQpISk7XG4gICAgfVxuICB9XG5cbiAgY2hlY2sobmFtZTogRmxhZ3xzdHJpbmcsIC4uLm1vZGVzOiBNb2RlW10pOiBib29sZWFuIHtcbiAgICBjb25zdCBmbGFnID0gbmFtZSBpbnN0YW5jZW9mIEZsYWcgPyBuYW1lIDogRmxhZy5mbGFncy5nZXQobmFtZSk7XG4gICAgaWYgKCFtb2Rlcy5sZW5ndGgpIG1vZGVzLnB1c2godHJ1ZSk7XG4gICAgcmV0dXJuIG1vZGVzLmluY2x1ZGVzKGZsYWcgJiYgdGhpcy5mbGFncy5nZXQoZmxhZykgfHwgZmFsc2UpO1xuICB9XG5cbiAgZ2V0KG5hbWU6IEZsYWd8c3RyaW5nKTogTW9kZSB7XG4gICAgY29uc3QgZmxhZyA9IG5hbWUgaW5zdGFuY2VvZiBGbGFnID8gbmFtZSA6IEZsYWcuZmxhZ3MuZ2V0KG5hbWUpO1xuICAgIHJldHVybiBmbGFnICYmIHRoaXMuZmxhZ3MuZ2V0KGZsYWcpIHx8IGZhbHNlO1xuICB9XG5cbiAgcHJlc2VydmVVbmlxdWVDaGVja3MoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuUHJlc2VydmVVbmlxdWVDaGVja3MpO1xuICB9XG4gIHNodWZmbGVNaW1pY3MoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuTm9TaHVmZmxlTWltaWNzLCBmYWxzZSk7XG4gIH1cblxuICBidWZmRGVvc1BlbmRhbnQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cbiAgY2hhbmdlR2FzTWFza1RvSGF6bWF0U3VpdCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuICBzbG93RG93blRvcm5hZG8oKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cbiAgbGVhdGhlckJvb3RzR2l2ZVNwZWVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG4gIHJhYmJpdEJvb3RzQ2hhcmdlV2hpbGVXYWxraW5nKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG5cbiAgc2h1ZmZsZVNwcml0ZVBhbGV0dGVzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVNwcml0ZUNvbG9ycyk7XG4gIH1cbiAgc2h1ZmZsZU1vbnN0ZXJzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdNcicpO1xuICB9XG4gIHNodWZmbGVTaG9wcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLlNob3BzLCBmYWxzZSk7XG4gIH1cbiAgYmFyZ2Fpbkh1bnRpbmcoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc2h1ZmZsZVNob3BzKCk7XG4gIH1cblxuICBzaHVmZmxlVG93ZXJNb25zdGVycygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhNb25zdGVycy5Ub3dlclJvYm90cyk7XG4gIH1cbiAgc2h1ZmZsZU1vbnN0ZXJFbGVtZW50cygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzKTtcbiAgfVxuICBzaHVmZmxlQm9zc0VsZW1lbnRzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNodWZmbGVNb25zdGVyRWxlbWVudHMoKTtcbiAgfVxuXG4gIGJ1ZmZNZWRpY2FsSGVyYigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5Ob0J1ZmZNZWRpY2FsSGVyYiwgZmFsc2UpO1xuICB9XG4gIGRlY3JlYXNlRW5lbXlEYW1hZ2UoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuRGVjcmVhc2VFbmVteURhbWFnZSk7XG4gIH1cbiAgdHJhaW5lcigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhEZWJ1Z01vZGUuVHJhaW5lck1vZGUpO1xuICB9XG4gIG5ldmVyRGllKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKERlYnVnTW9kZS5OZXZlckRpZSk7XG4gIH1cbiAgbm9TaHVmZmxlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKERlYnVnTW9kZS5Ob1NodWZmbGUpO1xuICB9XG4gIGNoYXJnZVNob3RzT25seSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5DaGFyZ2VTaG90c09ubHkpO1xuICB9XG5cbiAgYmFycmllclJlcXVpcmVzQ2FsbVNlYSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTsgLy8gdGhpcy5jaGVjaygnUmwnKTtcbiAgfVxuICAvLyBwYXJhbHlzaXNSZXF1aXJlc1ByaXNvbktleSgpOiBib29sZWFuIHtcbiAgLy8gICByZXR1cm4gdHJ1ZTsgLy8gdGhpcy5jaGVjaygnUmwnKTtcbiAgLy8gfVxuICAvLyBzZWFsZWRDYXZlUmVxdWlyZXNXaW5kbWlsbCgpOiBib29sZWFuIHtcbiAgLy8gICByZXR1cm4gdHJ1ZTsgLy8gdGhpcy5jaGVjaygnUmwnKTtcbiAgLy8gfVxuXG4gIGNvbm5lY3RMaW1lVHJlZVRvTGVhZigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLk1hcHMsICchJyk7XG4gIH1cbiAgLy8gY29ubmVjdEdvYVRvTGVhZigpIHtcbiAgLy8gICByZXR1cm4gdGhpcy5jaGVjaygnWGUnKSAmJiB0aGlzLmNoZWNrKCdYZycpO1xuICAvLyB9XG4gIC8vIHJlbW92ZUVhcmx5V2FsbCgpIHtcbiAgLy8gICByZXR1cm4gdGhpcy5jaGVjaygnWGInKTtcbiAgLy8gfVxuICBhZGRFYXN0Q2F2ZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLk1hcHMsIGZhbHNlKTtcbiAgfVxuICB6ZWJ1U3R1ZGVudEdpdmVzSXRlbSgpOiBib29sZWFuIHtcbiAgICAvLyBJZiBoZSdzIG5vdCBndWFyYW50ZWVkIHRvIGJlIGF0IHRoZSBzdGFydCwgbW92ZSBjaGVjayB0byBtZXphbWUgaW5zdGVhZFxuICAgIHJldHVybiAhdGhpcy5zaHVmZmxlQXJlYXMoKSAmJiAhdGhpcy5zaHVmZmxlSG91c2VzKCk7XG4gIH1cbiAgZm9nTGFtcE5vdFJlcXVpcmVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuVmFuaWxsYURvbHBoaW4sIGZhbHNlKTtcbiAgfVxuICBzdG9yeU1vZGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5TdG9yeU1vZGUpO1xuICB9XG4gIG5vQm93TW9kZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk5vQm93TW9kZSk7XG4gIH1cbiAgcmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5WYW5pbGxhRG9scGhpbik7XG4gIH1cbiAgc2FoYXJhUmFiYml0c1JlcXVpcmVUZWxlcGF0aHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JyJyk7XG4gIH1cbiAgdGVsZXBvcnRPblRodW5kZXJTd29yZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgZmFsc2UsICchJyk7XG4gIH1cbiAgcmFuZG9taXplVGh1bmRlclRlbGVwb3J0KCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLCBmYWxzZSk7XG4gIH1cbiAgb3Jic09wdGlvbmFsKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkKTtcbiAgfVxuXG4gIHNodWZmbGVHb2FGbG9vcnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuU2h1ZmZsZUdvYUZsb29ycyk7XG4gIH1cbiAgc2h1ZmZsZUhvdXNlcygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5TaHVmZmxlSG91c2VzKTtcbiAgfVxuICBzaHVmZmxlQXJlYXMoKSB7XG4gICAgLy8gVE9ETzogY29uc2lkZXIgbXVsdGlwbGUgbGV2ZWxzIG9mIHNodWZmbGU/XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuU2h1ZmZsZUFyZWFzKTtcbiAgfVxuICByYW5kb21pemVNYXBzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZU1hcHMpO1xuICB9XG4gIHJhbmRvbWl6ZVRyYWRlcygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVUcmFkZXMpO1xuICB9XG4gIHVuaWRlbnRpZmllZEl0ZW1zKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zKTtcbiAgfVxuICByYW5kb21pemVXYWxscygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMpO1xuICB9XG5cbiAgZ3VhcmFudGVlU3dvcmQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuR3VhcmFudGVlU3RhcnRpbmdTd29yZCk7XG4gIH1cbiAgZ3VhcmFudGVlU3dvcmRNYWdpYygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsIGZhbHNlKTtcbiAgfVxuICBndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE5vR3VhcmFudGVlcy5NYXRjaGluZ1N3b3JkLCBmYWxzZSk7XG4gIH1cbiAgZ3VhcmFudGVlR2FzTWFzaygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhOb0d1YXJhbnRlZXMuR2FzTWFzaywgZmFsc2UpO1xuICB9XG4gIGd1YXJhbnRlZUJhcnJpZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTm9HdWFyYW50ZWVzLkJhcnJpZXIsIGZhbHNlKTtcbiAgfVxuICBndWFyYW50ZWVSZWZyZXNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLkd1YXJhbnRlZVJlZnJlc2gpO1xuICB9XG4gIGNvbW11bml0eUpva2VzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLk5vQ29tbXVuaXR5Sm9rZXMsIGZhbHNlKTtcbiAgfVxuXG4gIGRpc2FibGVTd29yZENoYXJnZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5Td29yZENoYXJnZUdsaXRjaCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVUZWxlcG9ydFNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVSYWJiaXRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlU2hvcEdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLlNob3BzLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVN0YXR1ZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlUmFnZVNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuUmFnZVNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlVHJpZ2dlckdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5UcmlnZ2VyU2tpcCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVGbGlnaHRTdGF0dWVTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN0YXR1ZUdhdW50bGV0U2tpcCwgZmFsc2UpO1xuICB9XG5cbiAgYXNzdW1lU3dvcmRDaGFyZ2VHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gpO1xuICB9XG4gIGFzc3VtZUdoZXR0b0ZsaWdodCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5HaGV0dG9GbGlnaHQpO1xuICB9XG4gIGFzc3VtZVRlbGVwb3J0U2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwKTtcbiAgfVxuICBhc3N1bWVSYWJiaXRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXApO1xuICB9XG4gIGFzc3VtZVN0YXR1ZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gpO1xuICB9XG4gIGFzc3VtZVRyaWdnZXJHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuVHJpZ2dlclNraXApO1xuICB9XG4gIGFzc3VtZUZsaWdodFN0YXR1ZVNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3RhdHVlR2F1bnRsZXRTa2lwKTtcbiAgfVxuICBhc3N1bWVXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLldpbGRXYXJwLCB0cnVlKSB8fFxuICAgICAgICB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwKTtcbiAgfVxuICBhc3N1bWVSYWdlU2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5SYWdlU2tpcCk7XG4gIH1cblxuICBuZXJmV2lsZFdhcnAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5XaWxkV2FycCwgZmFsc2UpICYmXG4gICAgICAgIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplV2lsZFdhcnAsIGZhbHNlKTtcbiAgfVxuICBhbGxvd1dpbGRXYXJwKCkge1xuICAgIHJldHVybiAhdGhpcy5uZXJmV2lsZFdhcnAoKTtcbiAgfVxuICByYW5kb21pemVXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVXaWxkV2FycCwgdHJ1ZSk7XG4gIH1cblxuICBibGFja291dE1vZGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuQmxhY2tvdXQpO1xuICB9XG4gIGhhcmRjb3JlTW9kZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5QZXJtYWRlYXRoKTtcbiAgfVxuICBidWZmRHluYSgpIHtcbiAgICByZXR1cm4gIXRoaXMuY2hlY2soVmFuaWxsYS5EeW5hKTtcbiAgfVxuICBtYXhTY2FsaW5nSW5Ub3dlcigpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcik7XG4gIH1cblxuICBleHBTY2FsaW5nRmFjdG9yKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLkV4cGVyaWVuY2VTY2FsZXNTbG93ZXIpID8gMC4yNSA6XG4gICAgICAgIHRoaXMuY2hlY2soRWFzeU1vZGUuRXhwZXJpZW5jZVNjYWxlc0Zhc3RlcikgPyAyLjUgOiAxO1xuICB9XG5cbiAgLy8gT1BUSU9OQUwgRkxBR1NcbiAgYXV0b0VxdWlwQnJhY2VsZXQocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBwYXNzID09PSAnZWFybHknIHx8IHRoaXMuY2hlY2soUXVhbGl0eS5Ob0F1dG9FcXVpcCwgZmFsc2UpO1xuICB9XG4gIGNvbnRyb2xsZXJTaG9ydGN1dHMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBwYXNzID09PSAnZWFybHknIHx8IHRoaXMuY2hlY2soUXVhbGl0eS5Ob0NvbnRyb2xsZXJTaG9ydGN1dHMsIGZhbHNlKTtcbiAgfVxuICByYW5kb21pemVNdXNpYyhwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soQWVzdGhldGljcy5SYW5kb21pemVNdXNpYywgcGFzcyA9PT0gJ2Vhcmx5JyA/ICchJyA6IHRydWUpO1xuICB9XG4gIHNodWZmbGVUaWxlUGFsZXR0ZXMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEFlc3RoZXRpY3MuUmFuZG9taXplTWFwQ29sb3JzLFxuICAgICAgICAgICAgICAgICAgICAgIHBhc3MgPT09ICdlYXJseScgPyAnIScgOiB0cnVlKTtcbiAgfVxuICBub011c2ljKHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gcGFzcyA9PT0gJ2xhdGUnICYmIHRoaXMuY2hlY2soQWVzdGhldGljcy5Ob011c2ljKTtcbiAgfVxuICBhdWRpYmxlV2FsbEN1ZXMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBwYXNzID09PSAnbGF0ZScgJiYgdGhpcy5jaGVjayhRdWFsaXR5LkF1ZGlibGVXYWxsQ3Vlcyk7XG4gIH1cblxuICBzaG91bGRDb2xvclN3b3JkRWxlbWVudHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgXG4gIHNob3VsZFVwZGF0ZUh1ZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkh1ZCwgZmFsc2UpO1xuICB9XG5cbiAgaGFzU3RhdFRyYWNraW5nKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG4iXX0=