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
    shouldUpdateHud() {
        return true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3NldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy9mbGFnc2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBZ0JqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUU3RCxNQUFNLE9BQU8sSUFBSTtJQU9mLFlBQXFCLElBQVksRUFBVyxJQUFjO1FBQXJDLFNBQUksR0FBSixJQUFJLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFVO1FBQ3hELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBTkQsTUFBTSxDQUFDLEdBQUc7UUFDUixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQzs7QUFKZSxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7QUFXbEQsTUFBTSxPQUFPLE1BQU07SUFTakIsWUFBWSxNQUFlLEVBQ04sSUFBWSxFQUNaLFdBQW1CLEVBQzVCLEtBQWdEO1FBRnZDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUV0QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFkRCxNQUFNLENBQUMsR0FBRztRQUNSLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUTtZQUFFLE9BQU8sQ0FBQyxRQUFRLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUN4RCxPQUFPLENBQUMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFhRCxJQUFJLFVBQVU7UUFDWixJQUFJLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxFQUFFO1lBQzVCLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztTQUN6RDtRQUNELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUMxQixDQUFDO0NBQ0Y7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFZO0lBQ2pDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQUdELE1BQU0sT0FBTztJQUFiO1FBRVcsWUFBTyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBT3BDLFdBQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFOztzQkFFekIsRUFBRTtZQUNoQixRQUFRLENBQUMsb0JBQW9CO1lBQzdCLFFBQVEsQ0FBQyxlQUFlO1lBQ3hCLFFBQVEsQ0FBQyxtQkFBbUI7WUFDNUIsUUFBUSxDQUFDLGdCQUFnQjtZQUN6QixRQUFRLENBQUMsc0JBQXNCO1lBQy9CLFFBQVEsQ0FBQyxzQkFBc0I7WUFDL0IsT0FBTyxDQUFDLGtCQUFrQjtZQUMxQixPQUFPLENBQUMsS0FBSztZQUNiLE9BQU8sQ0FBQyxJQUFJO1lBQ1osQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQztZQUNuQixDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDO1lBQ3ZCLFNBQVMsQ0FBQyxVQUFVO1NBQ3JCLENBQUMsQ0FBQztRQUVFLFlBQU8sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFOzs2Q0FFSixFQUFFO1lBQ3ZDLFFBQVEsQ0FBQyxzQkFBc0I7WUFDL0IsUUFBUSxDQUFDLFlBQVk7WUFDckIsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxDQUFDO1lBQ2pDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUM7WUFDbkIsU0FBUyxDQUFDLFVBQVU7U0FDckIsQ0FBQyxDQUFDO1FBRUUsYUFBUSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7MENBQ1QsRUFBRTtZQUVwQyxRQUFRLENBQUMsbUJBQW1CO1lBQzVCLE9BQU8sQ0FBQyxTQUFTO1lBQ2pCLFNBQVMsQ0FBQyxVQUFVO1NBQ3JCLENBQUMsQ0FBQztRQUVFLGNBQVMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO3dFQUNpQixFQUFFO1lBQ2xFLFFBQVEsQ0FBQyxtQkFBbUI7WUFDNUIsUUFBUSxDQUFDLFdBQVc7WUFDcEIsUUFBUSxDQUFDLGlCQUFpQjtZQUMxQixPQUFPLENBQUMsU0FBUztZQUNqQixTQUFTLENBQUMsVUFBVTtTQUNyQixDQUFDLENBQUM7UUFFRSxhQUFRLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtpRUFDYyxFQUFFO1lBQzNELFFBQVEsQ0FBQyxZQUFZO1lBQ3JCLFFBQVEsQ0FBQyxzQkFBc0I7WUFDL0IsUUFBUSxDQUFDLFlBQVk7WUFDckIsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDO1lBQ2pDLFlBQVksQ0FBQyxPQUFPO1lBQ3BCLFlBQVksQ0FBQyxXQUFXO1lBQ3hCLFlBQVksQ0FBQyxPQUFPO1lBQ3BCLFFBQVEsQ0FBQyxpQkFBaUI7WUFDMUIsUUFBUSxDQUFDLG1CQUFtQjtZQUM1QixRQUFRLENBQUMsV0FBVztZQUNwQixPQUFPLENBQUMsZUFBZTtZQUN2QixPQUFPLENBQUMsU0FBUztZQUNqQixLQUFLLENBQUMsYUFBYTtZQUNuQixLQUFLLENBQUMsWUFBWTtZQUNsQixLQUFLLENBQUMsYUFBYTtZQUNuQixLQUFLLENBQUMsZUFBZTtZQUNyQixLQUFLLENBQUMscUJBQXFCO1lBQzNCLEtBQUssQ0FBQyxvQkFBb0I7WUFDMUIsU0FBUyxDQUFDLFVBQVU7U0FDckIsQ0FBQyxDQUFDO1FBRUUsYUFBUSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7O3FCQUUvQixFQUFFO1lBQ2YsUUFBUSxDQUFDLGdCQUFnQjtZQUN6QixLQUFLLENBQUMsaUJBQWlCO1lBQ3ZCLFFBQVEsQ0FBQyxtQkFBbUI7WUFDNUIsUUFBUSxDQUFDLFdBQVc7WUFDcEIsT0FBTyxDQUFDLGVBQWU7WUFDdkIsT0FBTyxDQUFDLFNBQVM7WUFDakIsU0FBUyxDQUFDLFVBQVU7U0FDckIsQ0FBQyxDQUFDO1FBRUUsWUFBTyxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7bUNBQ2QsRUFBRTtZQUM3QixDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDO1lBQ3pCLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUM7WUFDMUIsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQztZQUMxQixDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDO1lBQzVCLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQztZQUNqQyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLENBQUM7WUFDbEMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDO1lBQzdCLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQztZQUNsQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7WUFDOUIsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQztZQUM5QixDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDO1lBQ3hCLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUM7WUFDeEIsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQztZQUM3QixDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUM7WUFDakMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQztZQUN4QixDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDO1lBQzNCLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUM7WUFDNUIsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQztZQUM1QixDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7WUFDakMsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxDQUFDO1lBQ3RDLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUM7WUFDaEMsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxDQUFDO1lBQ3BDLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQztZQUNuQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDO1lBQzNCLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUM7WUFDL0IsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDO1lBQ3BDLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUM7WUFDM0IsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQztZQUMvQixDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDO1lBQzNCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUM7WUFDbkIsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQztZQUN6QixDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDO1lBQ25CLFNBQVMsQ0FBQyxVQUFVO1NBQ3JCLENBQUMsQ0FBQztRQUVFLGFBQVEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFOzhDQUNMLEVBQUU7WUFDeEMsWUFBWSxDQUFDLE9BQU87WUFDcEIsWUFBWSxDQUFDLFdBQVc7WUFDeEIsUUFBUSxDQUFDLHNCQUFzQjtZQUMvQixRQUFRLENBQUMsaUJBQWlCO1lBQzFCLFFBQVEsQ0FBQyxVQUFVO1lBQ25CLE9BQU8sQ0FBQyxlQUFlO1lBQ3ZCLE9BQU8sQ0FBQyxTQUFTO1lBQ2pCLEtBQUssQ0FBQyxhQUFhO1lBQ25CLEtBQUssQ0FBQyxZQUFZO1lBQ2xCLEtBQUssQ0FBQyxhQUFhO1lBQ25CLEtBQUssQ0FBQyxlQUFlO1lBQ3JCLEtBQUssQ0FBQyxxQkFBcUI7WUFDM0IsS0FBSyxDQUFDLG9CQUFvQjtTQUMzQixDQUFDLENBQUM7UUFFRSxlQUFVLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFOzt3Q0FFcEIsRUFBRTtZQUNsQyxZQUFZLENBQUMsT0FBTztZQUNwQixZQUFZLENBQUMsV0FBVztZQUN4QixRQUFRLENBQUMsUUFBUTtZQUNqQixRQUFRLENBQUMsc0JBQXNCO1lBQy9CLFFBQVEsQ0FBQyxpQkFBaUI7WUFDMUIsUUFBUSxDQUFDLFVBQVU7WUFDbkIsUUFBUSxDQUFDLG1CQUFtQjtZQUM1QixRQUFRLENBQUMsV0FBVztZQUNwQixPQUFPLENBQUMsZUFBZTtZQUN2QixPQUFPLENBQUMsU0FBUztZQUNqQixLQUFLLENBQUMsYUFBYTtZQUNuQixLQUFLLENBQUMsWUFBWTtZQUNsQixLQUFLLENBQUMsYUFBYTtZQUNuQixLQUFLLENBQUMsZUFBZTtZQUNyQixLQUFLLENBQUMscUJBQXFCO1lBQzNCLEtBQUssQ0FBQyxnQkFBZ0I7WUFDdEIsS0FBSyxDQUFDLG9CQUFvQjtTQUMzQixDQUFDLENBQUM7UUFFRSx3QkFBbUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsOEJBQThCLEVBQUU7OzBFQUVSLEVBQUU7WUFDcEUsUUFBUSxDQUFDLHNCQUFzQjtZQUMvQixRQUFRLENBQUMsWUFBWTtZQUNyQixRQUFRLENBQUMsa0JBQWtCO1lBQzNCLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQztZQUNuQyxPQUFPLENBQUMsZUFBZTtZQUN2QixPQUFPLENBQUMsU0FBUztZQUNqQixDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDO1lBQzdCLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsQ0FBQztZQUNqQyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLENBQUM7WUFDbEMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDO1lBQzdCLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQztZQUNsQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDO1lBQzVCLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQztTQUNsQyxDQUFDLENBQUM7UUFFRSxzQkFBaUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsNEJBQTRCLEVBQUU7OzthQUdqRSxFQUFFO1lBQ1AsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxDQUFDO1lBQ3RDLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUM7WUFDNUIsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQztZQUM1QixDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLENBQUM7WUFDdEMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxDQUFDO1lBQ2xDLFFBQVEsQ0FBQyxpQkFBaUI7WUFDMUIsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDO1lBQ2pDLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQztZQUNuQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDO1lBQzNCLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUM7WUFDM0IsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQztZQUMvQixPQUFPLENBQUMsU0FBUztZQUNqQixDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDO1lBQzdCLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUM7WUFDOUIsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxDQUFDO1lBQ2pDLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQztZQUNsQyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUM7WUFDN0IsQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxDQUFDO1lBQ2xDLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUM7WUFDNUIsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDO1NBQ2xDLENBQUMsQ0FBQztRQUVFLHlCQUFvQixHQUFHLElBQUksTUFBTSxDQUFDLElBQUksRUFBRSw4QkFBOEIsRUFBRTs7d0NBRTNDLEVBQUU7WUFDbEMsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxDQUFDO1lBQ3RDLFFBQVEsQ0FBQyxZQUFZO1lBQ3JCLFFBQVEsQ0FBQyxZQUFZO1lBQ3JCLFFBQVEsQ0FBQyxzQkFBc0I7WUFDL0IsUUFBUSxDQUFDLGtCQUFrQjtZQUMzQixRQUFRLENBQUMsaUJBQWlCO1lBQzFCLFFBQVEsQ0FBQyxpQkFBaUI7WUFDMUIsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDO1lBQ25DLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUM7WUFDM0IsWUFBWSxDQUFDLE9BQU87WUFDcEIsWUFBWSxDQUFDLFdBQVc7WUFDeEIsT0FBTyxDQUFDLFNBQVM7WUFDakIsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQztZQUM3QixDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDO1lBQzlCLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsQ0FBQztZQUNqQyxLQUFLLENBQUMsYUFBYTtZQUNuQixDQUFDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLENBQUM7WUFDbEMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDO1lBQzdCLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQztZQUNsQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDO1lBQzVCLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQztTQUNsQyxDQUFDLENBQUM7SUFDVCxDQUFDO0lBck9DLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBWTtRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVE7WUFBRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDbEQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDeEQsQ0FBQztDQWtPRjtBQUVELE1BQU0sT0FBZ0IsV0FBVztJQUFqQztRQW9CVyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7SUFDM0MsQ0FBQztJQWpCQyxNQUFNLENBQUMsR0FBRztRQUNSLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRVMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFZLEVBQUUsSUFBUztRQUMzQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FDcEIsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSyxJQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQzs7QUFidUIsb0JBQVEsR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO0FBcUI1RCxNQUFNLEtBQU0sU0FBUSxXQUFXO0lBQS9COztRQUNXLFdBQU0sR0FBRyxHQUFHLENBQUM7UUFDYixTQUFJLEdBQUcsT0FBTyxDQUFDO0lBc0UxQixDQUFDOztBQXBFaUIsbUJBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUMvQyxJQUFJLEVBQUUsZ0JBQWdCO0lBQ3RCLElBQUksRUFBRTs7c0VBRTREO0lBQ2xFLElBQUksRUFBRSxJQUFJO0NBQ1gsQ0FBQyxDQUFDO0FBRWEsa0JBQVksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUM5QyxJQUFJLEVBQUUsZUFBZTtJQUNyQixJQUFJLEVBQUUsd0NBQXdDO0lBQzlDLElBQUksRUFBRSxJQUFJO0NBQ1gsQ0FBQyxDQUFDO0FBRWEsbUJBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUMvQyxJQUFJLEVBQUUseUJBQXlCO0lBQy9CLElBQUksRUFBRTs7aURBRXVDO0lBQzdDLElBQUksRUFBRSxJQUFJO0NBQ1gsQ0FBQyxDQUFDO0FBRWEscUJBQWUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUNqRCxJQUFJLEVBQUUsMEJBQTBCO0lBQ2hDLElBQUksRUFBRTs7O21FQUd5RDtJQUMvRCxJQUFJLEVBQUUsSUFBSTtDQUNYLENBQUMsQ0FBQztBQUVhLDBCQUFvQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ3RELElBQUksRUFBRSx3QkFBd0I7SUFDOUIsSUFBSSxFQUFFO3NEQUM0QztJQUNsRCxJQUFJLEVBQUUsSUFBSTtDQUNYLENBQUMsQ0FBQztBQUVhLDJCQUFxQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ3ZELElBQUksRUFBRSxtQ0FBbUM7SUFDekMsSUFBSSxFQUFFOzs7Ozs7c0RBTTRDO0NBQ25ELENBQUMsQ0FBQztBQUVhLHNCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ2xELElBQUksRUFBRSw2QkFBNkI7SUFFbkMsSUFBSSxFQUFFLCtEQUErRDtDQUN0RSxDQUFDLENBQUM7QUFFYSwyQkFBcUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUN2RCxJQUFJLEVBQUUseUJBQXlCO0lBQy9CLElBQUksRUFBRTs7cUJBRVc7Q0FDbEIsQ0FBQyxDQUFDO0FBRWEsdUJBQWlCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDbkQsSUFBSSxFQUFFLHFCQUFxQjtJQUMzQixJQUFJLEVBQUU7d0RBQzhDO0lBQ3BELFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQztDQUNqQixDQUFDLENBQUM7QUFHTCxNQUFNLE9BQVEsU0FBUSxXQUFXO0lBQWpDOztRQUNXLFdBQU0sR0FBRyxHQUFHLENBQUM7UUFDYixTQUFJLEdBQUcsU0FBUyxDQUFDO0lBd0M1QixDQUFDOztBQXRDaUIsaUJBQVMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUM3QyxJQUFJLEVBQUUsWUFBWTtJQUNsQixJQUFJLEVBQUU7dURBQzZDO0NBQ3BELENBQUMsQ0FBQztBQUVhLGlCQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDN0MsSUFBSSxFQUFFLGFBQWE7SUFDbkIsSUFBSSxFQUFFOzs4RUFFb0U7Q0FDM0UsQ0FBQyxDQUFDO0FBRWEsdUJBQWUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUNuRCxJQUFJLEVBQUUsa0NBQWtDO0lBQ3hDLElBQUksRUFBRSw0REFBNEQ7Q0FDbkUsQ0FBQyxDQUFDO0FBRWEsMEJBQWtCLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDdEQsSUFBSSxFQUFFLDBCQUEwQjtJQUNoQyxJQUFJLEVBQUU7OzJFQUVpRTtJQUN2RSxLQUFLLEVBQUUsR0FBRztDQUNYLENBQUMsQ0FBQztBQUVhLHNCQUFjLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDbEQsSUFBSSxFQUFFLDhCQUE4QjtJQUNwQyxJQUFJLEVBQUU7Ozs7Ozs7OzRFQVFrRTtDQUN6RSxDQUFDLENBQUM7QUFHTCxNQUFNLFFBQVMsU0FBUSxXQUFXO0lBQWxDOztRQUNXLFdBQU0sR0FBRyxHQUFHLENBQUM7UUFDYixTQUFJLEdBQUcsVUFBVSxDQUFDO1FBQ2xCLGdCQUFXLEdBQUc7Ozs7OzJEQUtrQyxDQUFDO0lBcUU1RCxDQUFDOztBQW5FaUIscUJBQVksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUNqRCxJQUFJLEVBQUUsZUFBZTtJQUNyQixJQUFJLEVBQUU7OztxRUFHMkQ7Q0FDbEUsQ0FBQyxDQUFDO0FBRWEscUJBQVksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUNqRCxJQUFJLEVBQUUsZUFBZTtJQUNyQixJQUFJLEVBQUU7Ozs7bURBSXlDO0lBQy9DLEtBQUssRUFBRSxHQUFHO0NBQ1gsQ0FBQyxDQUFDO0FBRWEsK0JBQXNCLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDM0QsSUFBSSxFQUFFLDRCQUE0QjtJQUNsQyxJQUFJLEVBQUU7Ozs7OzJCQUtpQjtJQUN2QixLQUFLLEVBQUUsR0FBRztDQUNYLENBQUMsQ0FBQztBQUVhLDJCQUFrQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ3ZELElBQUksRUFBRSxzQkFBc0I7SUFDNUIsSUFBSSxFQUFFOztvREFFMEM7SUFDaEQsS0FBSyxFQUFFLEdBQUc7Q0FDWCxDQUFDLENBQUM7QUFFYSwwQkFBaUIsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUN0RCxJQUFJLEVBQUUscUJBQXFCO0lBQzNCLElBQUksRUFBRTs7O3VFQUc2RDtJQUNuRSxJQUFJLEVBQUUsSUFBSTtJQUNWLEtBQUssRUFBRSxHQUFHO0NBQ1gsQ0FBQyxDQUFDO0FBRWEsb0JBQVcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUNoRCxJQUFJLEVBQUUsY0FBYztJQUNwQixJQUFJLEVBQUU7Ozs7dURBSTZDO0lBQ25ELElBQUksRUFBRSxJQUFJO0lBQ1YsS0FBSyxFQUFFLEdBQUc7Q0FDWCxDQUFDLENBQUM7QUFFYSxpQkFBUSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQzdDLElBQUksRUFBRSxXQUFXO0lBQ2pCLElBQUksRUFBRTs7O21FQUd5RDtJQUMvRCxJQUFJLEVBQUUsSUFBSTtJQUNWLEtBQUssRUFBRSxHQUFHO0NBQ1gsQ0FBQyxDQUFDO0FBR0wsTUFBTSxVQUFXLFNBQVEsV0FBVztJQUFwQzs7UUFDVyxXQUFNLEdBQUcsR0FBRyxDQUFDO1FBQ2IsU0FBSSxHQUFHLFlBQVksQ0FBQztRQUNwQixnQkFBVyxHQUFHOzs7Ozs7OENBTXFCLENBQUM7SUFrQi9DLENBQUM7O0FBaEJpQix5QkFBYyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ3JELElBQUksRUFBRSw0QkFBNEI7SUFDbEMsS0FBSyxFQUFFLEdBQUc7SUFDVixRQUFRLEVBQUUsT0FBTztDQUNsQixDQUFDLENBQUM7QUFFYSxrQkFBTyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQzlDLElBQUksRUFBRSxxQkFBcUI7SUFDM0IsUUFBUSxFQUFFLFFBQVE7Q0FDbkIsQ0FBQyxDQUFDO0FBRWEsNkJBQWtCLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDekQsSUFBSSxFQUFFLHNCQUFzQjtJQUM1QixLQUFLLEVBQUUsR0FBRztJQUNWLFFBQVEsRUFBRSxPQUFPO0NBQ2xCLENBQUMsQ0FBQztBQUdMLE1BQU0sUUFBUyxTQUFRLFdBQVc7SUFBbEM7O1FBQ1csV0FBTSxHQUFHLEdBQUcsQ0FBQztRQUNiLFNBQUksR0FBRyxVQUFVLENBQUM7SUFhN0IsQ0FBQzs7QUFYaUIsNEJBQW1CLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDeEQsSUFBSSxFQUFFLDhCQUE4QjtJQUNwQyxJQUFJLEVBQUUscURBQXFEO0NBQzVELENBQUMsQ0FBQztBQUVhLG9CQUFXLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDaEQsSUFBSSxFQUFFLHNCQUFzQjtJQUM1QixJQUFJLEVBQUU7MEVBQ2dFO0lBQ3RFLElBQUksRUFBRSxJQUFJO0NBQ1gsQ0FBQyxDQUFDO0FBR0wsTUFBTSxRQUFTLFNBQVEsV0FBVztJQUFsQzs7UUFDVyxXQUFNLEdBQUcsR0FBRyxDQUFDO1FBQ2IsU0FBSSxHQUFHLFdBQVcsQ0FBQztRQUNuQixnQkFBVyxHQUFHOzJEQUNrQyxDQUFDO0lBNEM1RCxDQUFDOztBQTFDaUIsd0JBQWUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUNwRCxJQUFJLEVBQUUsdUJBQXVCO0lBQzdCLElBQUksRUFBRSw0Q0FBNEM7Q0FDbkQsQ0FBQyxDQUFDO0FBRWEsNkJBQW9CLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDekQsSUFBSSxFQUFFLDRDQUE0QztJQUNsRCxJQUFJLEVBQUU7Ozs7Ozs7O2lDQVF1QjtDQUM5QixDQUFDLENBQUM7QUFFYSw0QkFBbUIsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUN4RCxJQUFJLEVBQUUsdUJBQXVCO0lBQzdCLElBQUksRUFBRTs7MENBRWdDO0NBQ3ZDLENBQUMsQ0FBQztBQUVhLCtCQUFzQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQzNELElBQUksRUFBRSwwQkFBMEI7SUFDaEMsSUFBSSxFQUFFOzZFQUNtRTtDQUMxRSxDQUFDLENBQUM7QUFFYSx5QkFBZ0IsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUNyRCxJQUFJLEVBQUUsbUJBQW1CO0lBQ3pCLElBQUksRUFBRTtzQkFDWTtDQUNuQixDQUFDLENBQUM7QUFFYSwrQkFBc0IsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUMzRCxJQUFJLEVBQUUsMEJBQTBCO0lBQ2hDLElBQUksRUFBRSx1RUFBdUU7SUFDN0UsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDO0NBQ2pCLENBQUMsQ0FBQztBQUdMLE1BQU0sWUFBYSxTQUFRLFdBQVc7SUFBdEM7O1FBQ1csV0FBTSxHQUFHLEdBQUcsQ0FBQztRQUNiLFNBQUksR0FBRyxlQUFlLENBQUM7UUFDdkIsZ0JBQVcsR0FBRztpREFDd0IsQ0FBQztJQWlDbEQsQ0FBQzs7QUEvQmlCLHdCQUFXLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDcEQsSUFBSSxFQUFFLDZCQUE2QjtJQUNuQyxJQUFJLEVBQUU7O2tFQUV3RDtJQUM5RCxJQUFJLEVBQUUsSUFBSTtDQUNYLENBQUMsQ0FBQztBQUVhLDBCQUFhLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDdEQsSUFBSSxFQUFFLDZDQUE2QztJQUNuRCxJQUFJLEVBQUU7OzBDQUVnQztJQUN0QyxJQUFJLEVBQUUsSUFBSTtDQUNYLENBQUMsQ0FBQztBQUVhLG9CQUFPLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDaEQsSUFBSSxFQUFFLHdCQUF3QjtJQUM5QixJQUFJLEVBQUU7O2dDQUVzQjtJQUM1QixJQUFJLEVBQUUsSUFBSTtDQUNYLENBQUMsQ0FBQztBQUVhLG9CQUFPLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDaEQsSUFBSSxFQUFFLHlCQUF5QjtJQUMvQixJQUFJLEVBQUU7O2tGQUV3RTtJQUM5RSxJQUFJLEVBQUUsSUFBSTtDQUNYLENBQUMsQ0FBQztBQUdMLE1BQU0sUUFBUyxTQUFRLFdBQVc7SUFBbEM7O1FBQ1csV0FBTSxHQUFHLEdBQUcsQ0FBQztRQUNiLFNBQUksR0FBRyxXQUFXLENBQUM7SUF3QzlCLENBQUM7O0FBdENpQiwwQkFBaUIsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUN0RCxJQUFJLEVBQUUsMkNBQTJDO0lBQ2pELElBQUksRUFBRTs7b0NBRTBCO0lBQ2hDLElBQUksRUFBRSxJQUFJO0NBQ1gsQ0FBQyxDQUFDO0FBRWEsMEJBQWlCLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDdEQsSUFBSSxFQUFFLDRCQUE0QjtJQUNsQyxJQUFJLEVBQUUsa0RBQWtEO0lBQ3hELElBQUksRUFBRSxJQUFJO0NBQ1gsQ0FBQyxDQUFDO0FBRWEsK0JBQXNCLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDM0QsSUFBSSxFQUFFLDBCQUEwQjtJQUNoQyxJQUFJLEVBQUUsa0VBQWtFO0lBQ3hFLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQztJQUNoQixJQUFJLEVBQUUsSUFBSTtDQUNYLENBQUMsQ0FBQztBQUVhLHdCQUFlLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDcEQsSUFBSSxFQUFFLG1CQUFtQjtJQUN6QixJQUFJLEVBQUUsK0RBQStEO0lBQ3JFLElBQUksRUFBRSxJQUFJO0NBQ1gsQ0FBQyxDQUFDO0FBRWEsaUJBQVEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUM3QyxJQUFJLEVBQUUsVUFBVTtJQUNoQixJQUFJLEVBQUUsZ0RBQWdEO0lBQ3RELElBQUksRUFBRSxJQUFJO0NBQ1gsQ0FBQyxDQUFDO0FBRWEsbUJBQVUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUMvQyxJQUFJLEVBQUUsWUFBWTtJQUNsQixJQUFJLEVBQUUsbURBQW1EO0lBQ3pELElBQUksRUFBRSxJQUFJO0NBQ1gsQ0FBQyxDQUFDO0FBR0wsTUFBTSxPQUFRLFNBQVEsV0FBVztJQUFqQzs7UUFDVyxTQUFJLEdBQUcsU0FBUyxDQUFDO1FBQ2pCLFdBQU0sR0FBRyxHQUFHLENBQUM7UUFDYixnQkFBVyxHQUFHOzhEQUNxQyxDQUFDO0lBb0QvRCxDQUFDOztBQWxEaUIsWUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ3hDLElBQUksRUFBRSxpQkFBaUI7SUFDdkIsSUFBSSxFQUFFOzs7MkRBR2lEO0NBQ3hELENBQUMsQ0FBQztBQUVhLGtCQUFVLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDOUMsSUFBSSxFQUFFLHdCQUF3QjtJQUM5QixJQUFJLEVBQUU7Ozs7OzhDQUtvQztDQUMzQyxDQUFDLENBQUM7QUFHYSxZQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDeEMsSUFBSSxFQUFFLGNBQWM7SUFDcEIsSUFBSSxFQUFFOzs7Ozs7Ozs7dURBUzZDO0lBQ25ELEtBQUssRUFBRSxHQUFHO0NBQ1gsQ0FBQyxDQUFDO0FBRWEsYUFBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ3pDLElBQUksRUFBRSxlQUFlO0lBQ3JCLElBQUksRUFBRTs7OztvRUFJMEQ7Q0FDakUsQ0FBQyxDQUFDO0FBRWEsZ0JBQVEsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUM1QyxJQUFJLEVBQUUsbUJBQW1CO0lBQ3pCLElBQUksRUFBRTs7NkVBRW1FO0lBQ3pFLEtBQUssRUFBRSxHQUFHO0NBQ1gsQ0FBQyxDQUFDO0FBR0wsTUFBTSxPQUFRLFNBQVEsV0FBVztJQUFqQzs7UUFDVyxXQUFNLEdBQUcsR0FBRyxDQUFDO1FBQ2IsU0FBSSxHQUFHLGlCQUFpQixDQUFDO1FBQ3pCLGdCQUFXLEdBQUc7OztpRUFHd0MsQ0FBQztJQW1CbEUsQ0FBQzs7QUFoQmlCLG1CQUFXLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDL0MsSUFBSSxFQUFFLDhDQUE4QztJQUNwRCxJQUFJLEVBQUU7b0VBQzBEO0lBQ2hFLFFBQVEsRUFBRSxRQUFRO0NBQ25CLENBQUMsQ0FBQztBQUVhLDZCQUFxQixHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ3pELElBQUksRUFBRSw4QkFBOEI7SUFDcEMsSUFBSSxFQUFFOzs7OzZEQUltRDtJQUN6RCxRQUFRLEVBQUUsUUFBUTtDQUNuQixDQUFDLENBQUM7QUFHTCxNQUFNLFNBQVUsU0FBUSxXQUFXO0lBQW5DOztRQUVXLFdBQU0sR0FBRyxHQUFHLENBQUM7UUFDYixTQUFJLEdBQUcsWUFBWSxDQUFDO1FBQ3BCLGdCQUFXLEdBQUc7Ozs7NERBSW1DLENBQUM7SUFvQzdELENBQUM7O0FBbENpQixvQkFBVSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ2hELElBQUksRUFBRSx3QkFBd0I7SUFDOUIsSUFBSSxFQUFFO3VEQUM2QztDQUNwRCxDQUFDLENBQUM7QUFFYSxxQkFBVyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ2pELElBQUksRUFBRSxjQUFjO0lBQ3BCLElBQUksRUFBRTs7Ozs7Ozs7Ozs7Ozs7aUJBY087Q0FDZCxDQUFDLENBQUM7QUFFYSxrQkFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQzlDLElBQUksRUFBRSxtQkFBbUI7Q0FDMUIsQ0FBQyxDQUFDO0FBRWEsbUJBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUMvQyxJQUFJLEVBQUUsc0JBQXNCO0lBQzVCLElBQUksRUFBRTswREFDZ0Q7Q0FDdkQsQ0FBQyxDQUFDO0FBR0wsTUFBTSxPQUFPLE9BQU87SUFHbEIsWUFBWSxNQUE4QixTQUFTO1FBQ2pELElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFO1lBQzNCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUN2QixLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFO2dCQUN4QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDckI7WUFDRCxPQUFPO1NBQ1I7UUFDRCxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFFdkIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLFFBQVE7Z0JBQUUsTUFBTSxJQUFJLFVBQVUsQ0FBQyxtQkFBbUIsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUM5RCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNyQyxPQUFPO1NBQ1I7UUFDRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7UUFFdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDekMsTUFBTSxFQUFFLEdBQUcsdUJBQXVCLENBQUM7UUFDbkMsSUFBSSxLQUFLLENBQUM7UUFDVixPQUFPLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtZQUM3QixNQUFNLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDO1lBQzdCLE1BQU0sR0FBRyxHQUFHLHNCQUFzQixDQUFDO1lBQ25DLE9BQU8sQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO2dCQUNoQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDO2dCQUM5QixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtvQkFDeEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsSUFBSSxFQUFFLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztpQkFDcEM7YUFDRjtTQUNGO0lBQ0gsQ0FBQztJQUVELGNBQWM7UUFDWixPQUFPLElBQUksT0FBTyxDQUNkLElBQUksR0FBRyxDQUNILENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUNmLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0UsQ0FBQztJQUVELFlBQVksQ0FBQyxNQUFjO1FBQ3pCLFNBQVMsSUFBSSxDQUFDLENBQU8sRUFBRSxDQUFPO1lBQzVCLElBQUksQ0FBQyxLQUFLLEdBQUc7Z0JBQUUsT0FBTyxDQUFDLENBQUM7WUFDeEIsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdELENBQUM7UUFDRCxPQUFPLElBQUksT0FBTyxDQUNkLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQsUUFBUTtRQUVOLE1BQU0sUUFBUSxHQUNWLElBQUksVUFBVSxDQUNWLEdBQUcsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFtQixHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pELEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ3JDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQztnQkFBRSxNQUFNLElBQUksS0FBSyxDQUFDLFlBQVksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7WUFDckUsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUNwQixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQyxNQUFNLFVBQVUsR0FBRyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUM3QyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDNUM7UUFDRCxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDZixLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLElBQUksUUFBUSxDQUFDLGFBQWEsRUFBRSxFQUFFO1lBQ3JELElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUNkLEtBQUssTUFBTSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsSUFBSSxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUU7Z0JBQzFELEdBQUcsSUFBSSxNQUFNLEdBQUcsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUM1QztZQUNELEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDZjtRQUNELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBRUQsTUFBTSxDQUFDLElBQVk7UUFDakIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsSUFBSSxDQUFDLElBQUksRUFBRTtZQUVULE9BQU8sQ0FBQyxLQUFLLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ25DLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxNQUFNLElBQUksR0FBUyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUM7UUFDakQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEUsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxJQUFJLEtBQUssR0FBRyxDQUFDO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMzRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMzQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxHQUFHLENBQUMsSUFBWSxFQUFFLElBQVU7O1FBQzFCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFFVCxPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNuQyxPQUFPO1NBQ1I7UUFDRCxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ1QsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDekI7YUFBTSxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxLQUFLLEdBQUcsV0FBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssMENBQUUsUUFBUSxDQUFDLElBQUksRUFBQyxFQUFFO1lBQzNFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztTQUM1QjthQUFNO1lBQ0wsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN0RSxPQUFPO1NBQ1I7UUFFRCxLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsRUFBRTtZQUMvQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUUsQ0FBQyxDQUFDO1NBQzlDO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFpQixFQUFFLEdBQUcsS0FBYTtRQUN2QyxNQUFNLElBQUksR0FBRyxJQUFJLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTTtZQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEMsT0FBTyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQsR0FBRyxDQUFDLElBQWlCO1FBQ25CLE1BQU0sSUFBSSxHQUFHLElBQUksWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEUsT0FBTyxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDO0lBQy9DLENBQUM7SUFFRCxvQkFBb0I7UUFDbEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFDRCxhQUFhO1FBQ1gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVELGVBQWU7UUFDYixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQ0QseUJBQXlCO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFDRCxlQUFlO1FBQ2IsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUNELHFCQUFxQjtRQUNuQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQ0QsNkJBQTZCO1FBQzNCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFRCxxQkFBcUI7UUFDbkIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFDRCxlQUFlO1FBQ2IsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBQ0QsWUFBWTtRQUNWLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFDRCxjQUFjO1FBQ1osT0FBTyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVELG9CQUFvQjtRQUNsQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFDRCxzQkFBc0I7UUFDcEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFDRCxtQkFBbUI7UUFDakIsT0FBTyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBRUQsZUFBZTtRQUNiLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUNELG1CQUFtQjtRQUNqQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUNELE9BQU87UUFDTCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFDRCxRQUFRO1FBQ04sT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBQ0QsU0FBUztRQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUNELGVBQWU7UUFDYixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxzQkFBc0I7UUFDcEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBUUQscUJBQXFCO1FBQ25CLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFPRCxXQUFXO1FBQ1QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUNELG9CQUFvQjtRQUVsQixPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3ZELENBQUM7SUFDRCxrQkFBa0I7UUFDaEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUNELFNBQVM7UUFDUCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFDRCxTQUFTO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBQ0QsMEJBQTBCO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELDZCQUE2QjtRQUMzQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRCxzQkFBc0I7UUFDcEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUNELHdCQUF3QjtRQUN0QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFDRCxZQUFZO1FBQ1YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsZ0JBQWdCO1FBQ2QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxhQUFhO1FBQ1gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBQ0QsWUFBWTtRQUVWLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUNELGFBQWE7UUFDWCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFDRCxlQUFlO1FBQ2IsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBQ0QsaUJBQWlCO1FBQ2YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFDRCxjQUFjO1FBQ1osT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRCxjQUFjO1FBQ1osT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFDRCxtQkFBbUI7UUFDakIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUNELHNCQUFzQjtRQUNwQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBQ0QsZ0JBQWdCO1FBQ2QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUNELGdCQUFnQjtRQUNkLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFDRCxnQkFBZ0I7UUFDZCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELHdCQUF3QjtRQUN0QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFDRCxtQkFBbUI7UUFDakIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBQ0QsaUJBQWlCO1FBQ2YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBQ0QsaUJBQWlCO1FBQ2YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUNELG1CQUFtQjtRQUNqQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBQ0QsZUFBZTtRQUNiLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFDRCxvQkFBb0I7UUFDbEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUNELHVCQUF1QjtRQUNyQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCx1QkFBdUI7UUFDckIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFDRCxrQkFBa0I7UUFDaEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBQ0Qsa0JBQWtCO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBQ0QsZ0JBQWdCO1FBQ2QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFDRCxrQkFBa0I7UUFDaEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBQ0QsbUJBQW1CO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUNELHNCQUFzQjtRQUNwQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDakQsQ0FBQztJQUNELGNBQWM7UUFDWixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUM7WUFDckMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBQ0QsY0FBYztRQUNaLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVELFlBQVk7UUFDVixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUM7WUFDdEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUNELGFBQWE7UUFDWCxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFDRCxpQkFBaUI7UUFDZixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRCxZQUFZO1FBQ1YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBQ0QsWUFBWTtRQUNWLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUNELFFBQVE7UUFDTixPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUNELGlCQUFpQjtRQUNmLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQsZ0JBQWdCO1FBQ2QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2RCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBR0QsaUJBQWlCLENBQUMsSUFBc0I7UUFDdEMsT0FBTyxJQUFJLEtBQUssT0FBTyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBQ0QsbUJBQW1CLENBQUMsSUFBc0I7UUFDeEMsT0FBTyxJQUFJLEtBQUssT0FBTyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFDRCxjQUFjLENBQUMsSUFBc0I7UUFDbkMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsSUFBSSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBQ0QsbUJBQW1CLENBQUMsSUFBc0I7UUFDeEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsRUFDN0IsSUFBSSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBQ0QsT0FBTyxDQUFDLElBQXNCO1FBQzVCLE9BQU8sSUFBSSxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQsd0JBQXdCO1FBQ3RCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUNELGVBQWU7UUFDYixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7VXNhZ2VFcnJvciwgRGVmYXVsdE1hcH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuL3JhbmRvbS5qcyc7XG5cbmludGVyZmFjZSBGbGFnT3B0cyB7XG4gIG5hbWU6IHN0cmluZztcbiAgdGV4dD86IHN0cmluZztcbiAgZXhjbHVkZXM/OiBzdHJpbmdbXTtcbiAgaGFyZD86IGJvb2xlYW47XG4gIG9wdGlvbmFsPzogKG1vZGU6IE1vZGUpID0+IE1vZGU7XG4gIC8vIEFsbCBmbGFncyBoYXZlIG1vZGVzIGZhbHNlIGFuZCB0cnVlLiAgQWRkaXRpb25hbCBtb2RlcyBtYXkgYmVcbiAgLy8gc3BlY2lmaWVkIGFzIGNoYXJhY3RlcnMgaW4gdGhpcyBzdHJpbmcgKGUuZy4gJyEnKS5cbiAgbW9kZXM/OiBzdHJpbmc7XG59XG5cbnR5cGUgTW9kZSA9IGJvb2xlYW58c3RyaW5nO1xuXG5jb25zdCBPUFRJT05BTCA9IChtb2RlOiBNb2RlKSA9PiAnJztcbmNvbnN0IE5PX0JBTkcgPSAobW9kZTogTW9kZSkgPT4gbW9kZSA9PT0gdHJ1ZSA/IGZhbHNlIDogbW9kZTtcblxuZXhwb3J0IGNsYXNzIEZsYWcge1xuICBzdGF0aWMgcmVhZG9ubHkgZmxhZ3MgPSBuZXcgTWFwPHN0cmluZywgRmxhZz4oKTtcblxuICBzdGF0aWMgYWxsKCk6IEZsYWdbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLmZsYWdzLnZhbHVlcygpXTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGZsYWc6IHN0cmluZywgcmVhZG9ubHkgb3B0czogRmxhZ09wdHMpIHtcbiAgICBGbGFnLmZsYWdzLnNldChmbGFnLCB0aGlzKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUHJlc2V0IHtcbiAgc3RhdGljIGFsbCgpOiBQcmVzZXRbXSB7XG4gICAgaWYgKCFQcmVzZXRzLmluc3RhbmNlKSBQcmVzZXRzLmluc3RhbmNlID0gbmV3IFByZXNldHMoKTtcbiAgICByZXR1cm4gWy4uLlByZXNldHMuaW5zdGFuY2UucHJlc2V0cy52YWx1ZXMoKV07XG4gIH1cblxuICBwcml2YXRlIF9mbGFnU3RyaW5nPzogc3RyaW5nO1xuXG4gIHJlYWRvbmx5IGZsYWdzOiBSZWFkb25seUFycmF5PHJlYWRvbmx5IFtGbGFnLCBNb2RlXT47XG4gIGNvbnN0cnVjdG9yKHBhcmVudDogUHJlc2V0cywgLy8gTk9URTogaW1wb3NzaWJsZSB0byBnZXQgYW4gaW5zdGFuY2Ugb3V0c2lkZVxuICAgICAgICAgICAgICByZWFkb25seSBuYW1lOiBzdHJpbmcsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGRlc2NyaXB0aW9uOiBzdHJpbmcsXG4gICAgICAgICAgICAgIGZsYWdzOiBSZWFkb25seUFycmF5PEZsYWd8cmVhZG9ubHkgW0ZsYWcsIE1vZGVdPikge1xuICAgIHRoaXMuZmxhZ3MgPSBmbGFncy5tYXAoZiA9PiBmIGluc3RhbmNlb2YgRmxhZyA/IFtmLCB0cnVlXSA6IGYpO1xuICAgIHBhcmVudC5wcmVzZXRzLnNldChtYXBQcmVzZXROYW1lKG5hbWUpLCB0aGlzKTtcbiAgfVxuXG4gIGdldCBmbGFnU3RyaW5nKCkge1xuICAgIGlmICh0aGlzLl9mbGFnU3RyaW5nID09IG51bGwpIHtcbiAgICAgIHRoaXMuX2ZsYWdTdHJpbmcgPSBTdHJpbmcobmV3IEZsYWdTZXQoYEAke3RoaXMubmFtZX1gKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9mbGFnU3RyaW5nO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1hcFByZXNldE5hbWUobmFtZTogc3RyaW5nKSB7XG4gIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW15hLXpdL2csICcnKTtcbn1cblxuLy8gTk9UIEVYUE9SVEVEIVxuY2xhc3MgUHJlc2V0cyB7XG4gIHN0YXRpYyBpbnN0YW5jZTogUHJlc2V0cyB8IHVuZGVmaW5lZDtcbiAgcmVhZG9ubHkgcHJlc2V0cyA9IG5ldyBNYXA8c3RyaW5nLCBQcmVzZXQ+KCk7XG5cbiAgc3RhdGljIGdldChuYW1lOiBzdHJpbmcpOiBQcmVzZXQgfCB1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5pbnN0YW5jZSkgdGhpcy5pbnN0YW5jZSA9IG5ldyBQcmVzZXRzKCk7XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFuY2UucHJlc2V0cy5nZXQobWFwUHJlc2V0TmFtZShuYW1lKSk7XG4gIH1cblxuICByZWFkb25seSBDYXN1YWwgPSBuZXcgUHJlc2V0KHRoaXMsICdDYXN1YWwnLCBgXG4gICAgICBCYXNpYyBmbGFncyBmb3IgYSByZWxhdGl2ZWx5IGVhc3kgcGxheXRocm91Z2guICBUaGlzIGlzIGEgZ29vZFxuICAgICAgcGxhY2UgdG8gc3RhcnQuYCwgW1xuICAgICAgICBFYXN5TW9kZS5QcmVzZXJ2ZVVuaXF1ZUNoZWNrcyxcbiAgICAgICAgRWFzeU1vZGUuTm9TaHVmZmxlTWltaWNzLFxuICAgICAgICBFYXN5TW9kZS5EZWNyZWFzZUVuZW15RGFtYWdlLFxuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVSZWZyZXNoLFxuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVTdGFydGluZ1N3b3JkLFxuICAgICAgICBFYXN5TW9kZS5FeHBlcmllbmNlU2NhbGVzRmFzdGVyLFxuICAgICAgICBSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCxcbiAgICAgICAgVmFuaWxsYS5TaG9wcyxcbiAgICAgICAgVmFuaWxsYS5EeW5hLFxuICAgICAgICBbVmFuaWxsYS5NYXBzLCAnISddLFxuICAgICAgICBbVmFuaWxsYS5XaWxkV2FycCwgJyEnXSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBDbGFzc2ljID0gbmV3IFByZXNldCh0aGlzLCAnQ2xhc3NpYycsIGBcbiAgICAgIFByb3ZpZGVzIGEgcmVsYXRpdmVseSBxdWljayBwbGF5dGhvdWdoIHdpdGggYSByZWFzb25hYmxlIGFtb3VudCBvZlxuICAgICAgY2hhbGxlbmdlLiAgU2ltaWxhciB0byBvbGRlciB2ZXJzaW9ucy5gLCBbXG4gICAgICAgIEVhc3lNb2RlLkd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQsXG4gICAgICAgIEdsaXRjaGVzLlN0YXR1ZUdsaXRjaCxcbiAgICAgICAgW1JvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLCAnISddLFxuICAgICAgICBbVmFuaWxsYS5NYXBzLCAnISddLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IFN0YW5kYXJkID0gbmV3IFByZXNldCh0aGlzLCAnU3RhbmRhcmQnLCBgXG4gICAgICBXZWxsLWJhbGFuY2VkLCBzdGFuZGFyZCByYWNlIGZsYWdzLmAsIFtcbiAgICAgICAgLy8gbm8gZmxhZ3M/ICBhbGwgZGVmYXVsdD9cbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgTm9Cb3dNb2RlID0gbmV3IFByZXNldCh0aGlzLCAnTm8gQm93IE1vZGUnLCBgXG4gICAgICBUaGUgdG93ZXIgaXMgb3BlbiBmcm9tIHRoZSBzdGFydCwgYXMgc29vbiBhcyB5b3UncmUgcmVhZHkgZm9yIGl0LmAsIFtcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyLFxuICAgICAgICBSb3V0aW5nLk5vQm93TW9kZSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBBZHZhbmNlZCA9IG5ldyBQcmVzZXQodGhpcywgJ0FkdmFuY2VkJywgYFxuICAgICAgQSBiYWxhbmNlZCByYW5kb21pemF0aW9uIHdpdGggcXVpdGUgYSBiaXQgbW9yZSBkaWZmaWN1bHR5LmAsIFtcbiAgICAgICAgR2xpdGNoZXMuR2hldHRvRmxpZ2h0LFxuICAgICAgICBHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwLFxuICAgICAgICBHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsXG4gICAgICAgIFtHbGl0Y2hlcy5Td29yZENoYXJnZUdsaXRjaCwgJyEnXSxcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhcnJpZXIsXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXR0bGVNYWdpYyxcbiAgICAgICAgTm9HdWFyYW50ZWVzLkdhc01hc2ssXG4gICAgICAgIEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyLFxuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBNb25zdGVycy5Ub3dlclJvYm90cyxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVNYXBzLFxuICAgICAgICBXb3JsZC5TaHVmZmxlQXJlYXMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVIb3VzZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVRyYWRlcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzLFxuICAgICAgICBXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcyxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBXaWxkV2FycCA9IG5ldyBQcmVzZXQodGhpcywgJ1dpbGQgV2FycCcsIGBcbiAgICAgIFNpZ25pZmljYW50bHkgb3BlbnMgdXAgdGhlIGdhbWUgcmlnaHQgZnJvbSB0aGUgc3RhcnQgd2l0aCB3aWxkXG4gICAgICB3YXJwIGluIGxvZ2ljLmAsIFtcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlUmVmcmVzaCxcbiAgICAgICAgV29ybGQuUmFuZG9taXplV2lsZFdhcnAsXG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIE1vbnN0ZXJzLlRvd2VyUm9ib3RzLFxuICAgICAgICBSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgTXlzdGVyeSA9IG5ldyBQcmVzZXQodGhpcywgJ015c3RlcnknLCBgXG4gICAgICBFdmVuIHRoZSBvcHRpb25zIGFyZSByYW5kb20uYCwgW1xuICAgICAgICBbV29ybGQuU2h1ZmZsZUFyZWFzLCAnPyddLFxuICAgICAgICBbV29ybGQuU2h1ZmZsZUhvdXNlcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZU1hcHMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVUcmFkZXMsICc/J10sXG4gICAgICAgIFtXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlNodWZmbGVHb2FGbG9vcnMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVTcHJpdGVDb2xvcnMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVXaWxkV2FycCwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuT3Jic05vdFJlcXVpcmVkLCAnPyddLFxuICAgICAgICBbUm91dGluZy5Ob0Jvd01vZGUsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLlN0b3J5TW9kZSwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuVmFuaWxsYURvbHBoaW4sICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlJhZ2VTa2lwLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuVHJpZ2dlclNraXAsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5HaGV0dG9GbGlnaHQsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5Td29yZENoYXJnZUdsaXRjaCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsICc/J10sXG4gICAgICAgIFtBZXN0aGV0aWNzLlJhbmRvbWl6ZU11c2ljLCAnPyddLFxuICAgICAgICBbQWVzdGhldGljcy5SYW5kb21pemVNYXBDb2xvcnMsICc/J10sXG4gICAgICAgIFtNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLCAnPyddLFxuICAgICAgICBbTW9uc3RlcnMuVG93ZXJSb2JvdHMsICc/J10sXG4gICAgICAgIFtFYXN5TW9kZS5Ob1NodWZmbGVNaW1pY3MsICc/J10sXG4gICAgICAgIFtFYXN5TW9kZS5QcmVzZXJ2ZVVuaXF1ZUNoZWNrcywgJz8nXSxcbiAgICAgICAgW05vR3VhcmFudGVlcy5CYXJyaWVyLCAnPyddLFxuICAgICAgICBbTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLCAnPyddLFxuICAgICAgICBbTm9HdWFyYW50ZWVzLkdhc01hc2ssICc/J10sXG4gICAgICAgIFtWYW5pbGxhLkR5bmEsICc/J10sXG4gICAgICAgIFtWYW5pbGxhLkJvbnVzSXRlbXMsICc/J10sXG4gICAgICAgIFtWYW5pbGxhLk1hcHMsICc/J10sXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgSGFyZGNvcmUgPSBuZXcgUHJlc2V0KHRoaXMsICdIYXJkY29yZScsIGBcbiAgICAgIE5vdCBmb3IgdGhlIGZhaW50IG9mIGhlYXJ0LiAgR29vZCBsdWNrLmAsIFtcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhcnJpZXIsXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXR0bGVNYWdpYyxcbiAgICAgICAgSGFyZE1vZGUuRXhwZXJpZW5jZVNjYWxlc1Nsb3dlcixcbiAgICAgICAgSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIsXG4gICAgICAgIEhhcmRNb2RlLlBlcm1hZGVhdGgsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgV29ybGQuUmFuZG9taXplTWFwcyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUFyZWFzLFxuICAgICAgICBXb3JsZC5TaHVmZmxlSG91c2VzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVUcmFkZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyxcbiAgICAgICAgV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsXG4gICAgICBdKTtcblxuICByZWFkb25seSBGdWxsU3R1cGlkID0gbmV3IFByZXNldCh0aGlzLCAnVGhlIEZ1bGwgU3R1cGlkJywgYFxuICAgICAgT25seSBhIGZldyBub2JsZSBmb29scyBoYXZlIGV2ZXIgY29tcGxldGVkIHRoaXMuICBCZSBzdXJlIHRvIHJlY29yZCB0aGlzXG4gICAgICBiZWNhdXNlIHBpY3Mgb3IgaXQgZGlkbid0IGhhcHBlbi5gLCBbIFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmFycmllcixcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLFxuICAgICAgICBIYXJkTW9kZS5CbGFja291dCxcbiAgICAgICAgSGFyZE1vZGUuRXhwZXJpZW5jZVNjYWxlc1Nsb3dlcixcbiAgICAgICAgSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIsXG4gICAgICAgIEhhcmRNb2RlLlBlcm1hZGVhdGgsXG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIE1vbnN0ZXJzLlRvd2VyUm9ib3RzLFxuICAgICAgICBSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZU1hcHMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVBcmVhcyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUhvdXNlcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplVHJhZGVzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVHb2FGbG9vcnMsXG4gICAgICAgIFdvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgVG91cm5hbWVudDIwMjJFYXJseSA9IG5ldyBQcmVzZXQodGhpcywgJ1RvdXJuYW1lbnQgMjAyMiBFYXJseSBSb3VuZHMnLCBgXG4gICAgICBMb3RzIG9mIHBvdGVudGlhbCBjb21wbGV4aXR5LCBidXQgd2l0aGluIHJlYXNvbi4gIFJlcXVpcmVzIGFsbCBzd29yZHMgYW5kXG4gICAgICBib3NzZXMsIGFzIHdlbGwgYXMgYSBmZXcgZ2xpdGNoZXMsIGJ1dCBndWFyYW50ZWVzIGEgc3RhcnRpbmcgc3dvcmQuYCwgWyBcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlU3RhcnRpbmdTd29yZCxcbiAgICAgICAgR2xpdGNoZXMuU3RhdHVlR2xpdGNoLFxuICAgICAgICBHbGl0Y2hlcy5TdGF0dWVHYXVudGxldFNraXAsXG4gICAgICAgIFtNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLCAnPyddLFxuICAgICAgICBSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIFtSb3V0aW5nLlZhbmlsbGFEb2xwaGluLCAnPyddLFxuICAgICAgICBbUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsICc/J10sXG4gICAgICAgIFtXb3JsZC5TaHVmZmxlR29hRmxvb3JzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplU3ByaXRlQ29sb3JzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplVHJhZGVzLCAnPyddLFxuICAgICAgICBbV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsICc/J10sXG4gICAgICBdKTtcblxuICByZWFkb25seSBUb3VybmFtZW50MjAyMk1pZCA9IG5ldyBQcmVzZXQodGhpcywgJ1RvdXJuYW1lbnQgMjAyMiBNaWQgUm91bmRzJywgYFxuICAgICAgU29tZSBhZGRpdGlvbmFsIGNoYWxsZW5nZXMgY29tcGFyZWQgdG8gdGhlIGVhcmx5IHJvdW5kczogc29tZSBhZGRpdGlvbmFsXG4gICAgICBteXN0ZXJ5IGZsYWdzIGFuZCBnbGl0Y2hlcywgYXMgd2VsbCBhcyBtYXggZGlmZmljdWx0eSBzY2FsaW5nIGluIHRoZVxuICAgICAgdG93ZXIuYCwgWyBcbiAgICAgICAgW0Vhc3lNb2RlLkd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5HaGV0dG9GbGlnaHQsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuU3RhdHVlR2F1bnRsZXRTa2lwLCAnPyddLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgW0hhcmRNb2RlLk5vQnVmZk1lZGljYWxIZXJiLCAnPyddLFxuICAgICAgICBbTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcywgJz8nXSxcbiAgICAgICAgW01vbnN0ZXJzLlRvd2VyUm9ib3RzLCAnPyddLFxuICAgICAgICBbTm9HdWFyYW50ZWVzLkJhcnJpZXIsICc/J10sXG4gICAgICAgIFtOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsICc/J10sXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBbUm91dGluZy5WYW5pbGxhRG9scGhpbiwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuT3Jic05vdFJlcXVpcmVkLCAnPyddLFxuICAgICAgICBbUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsICc/J10sXG4gICAgICAgIFtXb3JsZC5TaHVmZmxlR29hRmxvb3JzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplU3ByaXRlQ29sb3JzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplVHJhZGVzLCAnPyddLFxuICAgICAgICBbV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsICc/J10sXG4gICAgICBdKTtcblxuICByZWFkb25seSBUb3VybmFtZW50MjAyMkZpbmFscyA9IG5ldyBQcmVzZXQodGhpcywgJ1RvdXJuYW1lbnQgMjAyMiBGaW5hbHMgUm91bmQnLCBgXG4gICAgICBNYW55IG9mIHRoZSBtb3JlIGRpZmZpY3VsdCBteXN0ZXJ5IGZsYWdzIGZyb20gdGhlIG1pZCByb3VuZHMgYXJlIG5vd1xuICAgICAgYWx3YXlzIG9uLCBwbHVzIGVudHJhbmNlIHNodWZmbGUuYCwgWyBcbiAgICAgICAgW0Vhc3lNb2RlLkd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQsICc/J10sXG4gICAgICAgIEdsaXRjaGVzLkdoZXR0b0ZsaWdodCxcbiAgICAgICAgR2xpdGNoZXMuU3RhdHVlR2xpdGNoLFxuICAgICAgICBHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwLFxuICAgICAgICBHbGl0Y2hlcy5TdGF0dWVHYXVudGxldFNraXAsXG4gICAgICAgIEhhcmRNb2RlLk5vQnVmZk1lZGljYWxIZXJiLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgW01vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsICc/J10sXG4gICAgICAgIFtNb25zdGVycy5Ub3dlclJvYm90cywgJz8nXSxcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhcnJpZXIsXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXR0bGVNYWdpYyxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIFtSb3V0aW5nLlZhbmlsbGFEb2xwaGluLCAnPyddLFxuICAgICAgICBbUm91dGluZy5PcmJzTm90UmVxdWlyZWQsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgJz8nXSxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUhvdXNlcyxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlNodWZmbGVHb2FGbG9vcnMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVTcHJpdGVDb2xvcnMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVUcmFkZXMsICc/J10sXG4gICAgICAgIFtXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcywgJz8nXSxcbiAgICAgIF0pO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRmxhZ1NlY3Rpb24ge1xuICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZTogRmxhZ1NlY3Rpb247XG4gIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IHNlY3Rpb25zID0gbmV3IFNldDxGbGFnU2VjdGlvbj4oKTtcblxuICBzdGF0aWMgYWxsKCk6IEZsYWdTZWN0aW9uW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5zZWN0aW9uc107XG4gIH1cblxuICBwcm90ZWN0ZWQgc3RhdGljIGZsYWcobmFtZTogc3RyaW5nLCBvcHRzOiBhbnkpOiBGbGFnIHtcbiAgICBGbGFnU2VjdGlvbi5zZWN0aW9ucy5hZGQoXG4gICAgICAgIHRoaXMuaW5zdGFuY2UgfHwgKHRoaXMuaW5zdGFuY2UgPSBuZXcgKHRoaXMgYXMgYW55KSgpKSk7XG4gICAgY29uc3QgZmxhZyA9IG5ldyBGbGFnKG5hbWUsIG9wdHMpO1xuICAgIGlmICghbmFtZS5zdGFydHNXaXRoKHRoaXMuaW5zdGFuY2UucHJlZml4KSkgdGhyb3cgbmV3IEVycm9yKGBiYWQgZmxhZ2ApO1xuICAgIHRoaXMuaW5zdGFuY2UuZmxhZ3Muc2V0KG5hbWUsIGZsYWcpO1xuICAgIHJldHVybiBmbGFnO1xuICB9XG5cbiAgYWJzdHJhY3QgcmVhZG9ubHkgcHJlZml4OiBzdHJpbmc7XG4gIGFic3RyYWN0IHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gIHJlYWRvbmx5IGZsYWdzID0gbmV3IE1hcDxzdHJpbmcsIEZsYWc+KCk7XG59XG5cbmNsYXNzIFdvcmxkIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnVyc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnV29ybGQnO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVNYXBzID0gV29ybGQuZmxhZygnV20nLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBtYXBzJyxcbiAgICB0ZXh0OiBgSW5kaXZpZHVhbCBtYXBzIGFyZSByYW5kb21pemVkLiAgRm9yIG5vdyB0aGlzIGlzIG9ubHkgYSBzdWJzZXQgb2ZcbiAgICAgICAgICAgcG9zc2libGUgbWFwcy4gIEEgcmFuZG9taXplZCBtYXAgd2lsbCBoYXZlIGFsbCB0aGUgc2FtZSBmZWF0dXJlc1xuICAgICAgICAgICAoZXhpdHMsIGNoZXN0cywgTlBDcywgZXRjKSBleGNlcHQgdGhpbmdzIGFyZSBtb3ZlZCBhcm91bmQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU2h1ZmZsZUFyZWFzID0gV29ybGQuZmxhZygnV2EnLCB7XG4gICAgbmFtZTogJ1NodWZmbGUgYXJlYXMnLFxuICAgIHRleHQ6IGBTaHVmZmxlcyBzb21lIG9yIGFsbCBhcmVhIGNvbm5lY3Rpb25zLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNodWZmbGVIb3VzZXMgPSBXb3JsZC5mbGFnKCdXaCcsIHtcbiAgICBuYW1lOiAnU2h1ZmZsZSBob3VzZSBlbnRyYW5jZXMnLFxuICAgIHRleHQ6IGBTaHVmZmxlcyBhbGwgdGhlIGhvdXNlIGVudHJhbmNlcywgYXMgd2VsbCBhcyBhIGhhbmRmdWwgb2Ygb3RoZXJcbiAgICAgICAgICAgdGhpbmdzLCBsaWtlIHRoZSBwYWxhY2UvZm9ydHJlc3MtdHlwZSBlbnRyYW5jZXMgYXQgdGhlIHRvcCBvZlxuICAgICAgICAgICBzZXZlcmFsIHRvd25zLCBhbmQgc3RhbmRhbG9uZSBob3VzZXMuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplVHJhZGVzID0gV29ybGQuZmxhZygnV3QnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSB0cmFkZS1pbiBpdGVtcycsXG4gICAgdGV4dDogYEl0ZW1zIGV4cGVjdGVkIGJ5IHZhcmlvdXMgTlBDcyB3aWxsIGJlIHNodWZmbGVkOiBzcGVjaWZpY2FsbHksXG4gICAgICAgICAgIFN0YXR1ZSBvZiBPbnl4LCBLaXJpc2EgUGxhbnQsIExvdmUgUGVuZGFudCwgSXZvcnkgU3RhdHVlLCBGb2dcbiAgICAgICAgICAgTGFtcCwgYW5kIEZsdXRlIG9mIExpbWUgKGZvciBBa2FoYW5hKS4gIFJhZ2Ugd2lsbCBleHBlY3QgYVxuICAgICAgICAgICByYW5kb20gc3dvcmQsIGFuZCBUb3JuZWwgd2lsbCBleHBlY3QgYSByYW5kb20gYnJhY2VsZXQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVW5pZGVudGlmaWVkS2V5SXRlbXMgPSBXb3JsZC5mbGFnKCdXdScsIHtcbiAgICBuYW1lOiAnVW5pZGVudGlmaWVkIGtleSBpdGVtcycsXG4gICAgdGV4dDogYEl0ZW0gbmFtZXMgd2lsbCBiZSBnZW5lcmljIGFuZCBlZmZlY3RzIHdpbGwgYmUgc2h1ZmZsZWQuICBUaGlzXG4gICAgICAgICAgIGluY2x1ZGVzIGtleXMsIGZsdXRlcywgbGFtcHMsIGFuZCBzdGF0dWVzLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVdhbGxFbGVtZW50cyA9IFdvcmxkLmZsYWcoJ1dlJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgZWxlbWVudHMgdG8gYnJlYWsgd2FsbHMnLFxuICAgIHRleHQ6IGBXYWxscyB3aWxsIHJlcXVpcmUgYSByYW5kb21pemVkIGVsZW1lbnQgdG8gYnJlYWsuICBOb3JtYWwgcm9jayBhbmRcbiAgICAgICAgICAgaWNlIHdhbGxzIHdpbGwgaW5kaWNhdGUgdGhlIHJlcXVpcmVkIGVsZW1lbnQgYnkgdGhlIGNvbG9yIChsaWdodFxuICAgICAgICAgICBncmV5IG9yIHllbGxvdyBmb3Igd2luZCwgYmx1ZSBmb3IgZmlyZSwgYnJpZ2h0IG9yYW5nZSAoXCJlbWJlcnNcIikgZm9yXG4gICAgICAgICAgIHdhdGVyLCBvciBkYXJrIGdyZXkgKFwic3RlZWxcIikgZm9yIHRodW5kZXIuICBUaGUgZWxlbWVudCB0byBicmVha1xuICAgICAgICAgICB0aGVzZSB3YWxscyBpcyB0aGUgc2FtZSB0aHJvdWdob3V0IGFuIGFyZWEuICBJcm9uIHdhbGxzIHJlcXVpcmUgYVxuICAgICAgICAgICBvbmUtb2ZmIHJhbmRvbSBlbGVtZW50LCB3aXRoIG5vIHZpc3VhbCBjdWUsIGFuZCB0d28gd2FsbHMgaW4gdGhlXG4gICAgICAgICAgIHNhbWUgYXJlYSBtYXkgaGF2ZSBkaWZmZXJlbnQgcmVxdWlyZW1lbnRzLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTaHVmZmxlR29hRmxvb3JzID0gV29ybGQuZmxhZygnV2cnLCB7XG4gICAgbmFtZTogJ1NodWZmbGUgR29hIGZvcnRyZXNzIGZsb29ycycsXG4gICAgLy8gVE9ETyAtIHNodWZmbGUgdGhlIGFyZWEtdG8tYm9zcyBjb25uZWN0aW9ucywgdG9vLlxuICAgIHRleHQ6IGBUaGUgZm91ciBhcmVhcyBvZiBHb2EgZm9ydHJlc3Mgd2lsbCBhcHBlYXIgaW4gYSByYW5kb20gb3JkZXIuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVNwcml0ZUNvbG9ycyA9IFdvcmxkLmZsYWcoJ1dzJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgc3ByaXRlIGNvbG9ycycsXG4gICAgdGV4dDogYE1vbnN0ZXJzIGFuZCBOUENzIHdpbGwgaGF2ZSBkaWZmZXJlbnQgY29sb3JzLiAgVGhpcyBpcyBub3QgYW5cbiAgICAgICAgICAgb3B0aW9uYWwgZmxhZyBiZWNhdXNlIGl0IGFmZmVjdHMgd2hhdCBtb25zdGVycyBjYW4gYmUgZ3JvdXBlZFxuICAgICAgICAgICB0b2dldGhlci5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplV2lsZFdhcnAgPSBXb3JsZC5mbGFnKCdXdycsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIHdpbGQgd2FycCcsXG4gICAgdGV4dDogYFdpbGQgd2FycCB3aWxsIGdvIHRvIE1lemFtZSBTaHJpbmUgYW5kIDE1IG90aGVyIHJhbmRvbSBsb2NhdGlvbnMuXG4gICAgICAgICAgIFRoZXNlIGxvY2F0aW9ucyB3aWxsIGJlIGNvbnNpZGVyZWQgaW4tbG9naWMuYCxcbiAgICBleGNsdWRlczogWydWdyddLFxuICB9KTtcbn1cblxuY2xhc3MgUm91dGluZyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1InO1xuICByZWFkb25seSBuYW1lID0gJ1JvdXRpbmcnO1xuXG4gIHN0YXRpYyByZWFkb25seSBTdG9yeU1vZGUgPSBSb3V0aW5nLmZsYWcoJ1JzJywge1xuICAgIG5hbWU6ICdTdG9yeSBNb2RlJyxcbiAgICB0ZXh0OiBgRHJheWdvbiAyIHdvbid0IHNwYXduIHVubGVzcyB5b3UgaGF2ZSBhbGwgZm91ciBzd29yZHMgYW5kIGhhdmVcbiAgICAgICAgICAgZGVmZWF0ZWQgYWxsIG1ham9yIGJvc3NlcyBvZiB0aGUgdGV0cmFyY2h5LmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb0Jvd01vZGUgPSBSb3V0aW5nLmZsYWcoJ1JiJywge1xuICAgIG5hbWU6ICdObyBCb3cgbW9kZScsXG4gICAgdGV4dDogYE5vIGl0ZW1zIGFyZSByZXF1aXJlZCB0byBmaW5pc2ggdGhlIGdhbWUuICBBbiBleGl0IGlzIGFkZGVkIGZyb21cbiAgICAgICAgICAgTWV6YW1lIHNocmluZSBkaXJlY3RseSB0byB0aGUgRHJheWdvbiAyIGZpZ2h0IChhbmQgdGhlIG5vcm1hbCBlbnRyYW5jZVxuICAgICAgICAgICBpcyByZW1vdmVkKS4gIERyYXlnb24gMiBzcGF3bnMgYXV0b21hdGljYWxseSB3aXRoIG5vIEJvdyBvZiBUcnV0aC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgT3Jic05vdFJlcXVpcmVkID0gUm91dGluZy5mbGFnKCdSbycsIHtcbiAgICBuYW1lOiAnT3JicyBub3QgcmVxdWlyZWQgdG8gYnJlYWsgd2FsbHMnLFxuICAgIHRleHQ6IGBXYWxscyBjYW4gYmUgYnJva2VuIGFuZCBicmlkZ2VzIGZvcm1lZCB3aXRoIGxldmVsIDEgc2hvdHMuYFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9UaHVuZGVyU3dvcmRXYXJwID0gUm91dGluZy5mbGFnKCdSdCcsIHtcbiAgICBuYW1lOiAnTm8gU3dvcmQgb2YgVGh1bmRlciB3YXJwJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHkgd2hlbiBhY3F1aXJpbmcgdGhlIHRodW5kZXIgc3dvcmQsIHRoZSBwbGF5ZXIgaXMgaW5zdGFudGx5XG4gICAgICAgICAgIHdhcnBlZCB0byBhIHJhbmRvbSB0b3duLiAgVGhpcyBmbGFnIGRpc2FibGVzIHRoZSB3YXJwLiAgSWYgc2V0IGFzXG4gICAgICAgICAgIFwiUiF0XCIsIHRoZW4gdGhlIHdhcnAgd2lsbCBhbHdheXMgZ28gdG8gU2h5cm9uLCBsaWtlIGluIHZhbmlsbGEuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVmFuaWxsYURvbHBoaW4gPSBSb3V0aW5nLmZsYWcoJ1JkJywge1xuICAgIG5hbWU6ICdWYW5pbGxhIERvbHBoaW4gaW50ZXJhY3Rpb25zJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgdGhlIHJhbmRvbWl6ZXIgY2hhbmdlcyBhIG51bWJlciBvZiBkb2xwaGluIGFuZCBib2F0XG4gICAgICAgICAgIGludGVyYWN0aW9uczogKDEpIGhlYWxpbmcgdGhlIGRvbHBoaW4gYW5kIGhhdmluZyB0aGUgU2hlbGwgRmx1dGVcbiAgICAgICAgICAgaXMgbm8gbG9uZ2VyIHJlcXVpcmVkIGJlZm9yZSB0aGUgZmlzaGVybWFuIHNwYXduczogaW5zdGVhZCwgaGVcbiAgICAgICAgICAgd2lsbCBzcGF3biBhcyBzb29uIGFzIHlvdSBoYXZlIHRoZSBpdGVtIGhlIHdhbnRzOyAoMikgdGFsa2luZyB0b1xuICAgICAgICAgICBLZW5zdSBpbiB0aGUgYmVhY2ggY2FiaW4gaXMgbm8gbG9uZ2VyIHJlcXVpcmVkIGZvciB0aGUgU2hlbGwgRmx1dGVcbiAgICAgICAgICAgdG8gd29yazogaW5zdGVhZCwgdGhlIFNoZWxsIEZsdXRlIHdpbGwgYWx3YXlzIHdvcmssIGFuZCBLZW5zdSB3aWxsXG4gICAgICAgICAgIHNwYXduIGFmdGVyIHRoZSBGb2cgTGFtcCBpcyB0dXJuZWQgaW4gYW5kIHdpbGwgZ2l2ZSBhIGtleSBpdGVtXG4gICAgICAgICAgIGNoZWNrLiAgVGhpcyBmbGFnIHJlc3RvcmVzIHRoZSB2YW5pbGxhIGludGVyYWN0aW9uIHdoZXJlIGhlYWxpbmdcbiAgICAgICAgICAgYW5kIHNoZWxsIGZsdXRlIGFyZSByZXF1aXJlZCwgYW5kIEtlbnN1IG5vIGxvbmdlciBkcm9wcyBhbiBpdGVtLmAsXG4gIH0pO1xufVxuXG5jbGFzcyBHbGl0Y2hlcyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0cnO1xuICByZWFkb25seSBuYW1lID0gJ0dsaXRjaGVzJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBCeSBkZWZhdWx0LCB0aGUgcmFuZG9taXplciBkaXNhYmxlcyBhbGwga25vd24gZ2xpdGNoZXMgKGV4Y2VwdCBnaGV0dG9cbiAgICAgIGZsaWdodCkuICBUaGVzZSBmbGFncyBzZWxlY3RpdmVseSByZS1lbmFibGUgY2VydGFpbiBnbGl0Y2hlcy4gIE1vc3Qgb2ZcbiAgICAgIHRoZXNlIGZsYWdzIGhhdmUgdHdvIG1vZGVzOiBub3JtYWxseSBlbmFibGluZyBhIGdsaXRjaCB3aWxsIGFkZCBpdCBhc1xuICAgICAgcG9zc2libHkgcmVxdWlyZWQgYnkgbG9naWMsIGJ1dCBjbGlja2luZyBhIHNlY29uZCB0aW1lIHdpbGwgYWRkIGEgJyEnXG4gICAgICBhbmQgZW5hYmxlIHRoZSBnbGl0Y2ggb3V0c2lkZSBvZiBsb2dpYyAoZS5nLiBcIkchY1wiKS5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBHaGV0dG9GbGlnaHQgPSBHbGl0Y2hlcy5mbGFnKCdHZicsIHtcbiAgICBuYW1lOiAnR2hldHRvIGZsaWdodCcsXG4gICAgdGV4dDogYEdoZXR0byBmbGlnaHQgYWxsb3dzIHVzaW5nIERvbHBoaW4gYW5kIFJhYmJpdCBCb290cyB0byBmbHkgdXAgdGhlXG4gICAgICAgICAgIHdhdGVyZmFsbHMgaW4gdGhlIEFuZ3J5IFNlYSAod2l0aG91dCBjYWxtaW5nIHRoZSB3aGlybHBvb2xzKS5cbiAgICAgICAgICAgVGhpcyBpcyBkb25lIGJ5IHN3aW1taW5nIHVwIHRvIGEgZGlhZ29uYWwgYmVhY2ggYW5kIGp1bXBpbmdcbiAgICAgICAgICAgaW4gYSBkaWZmZXJlbnQgZGlyZWN0aW9uIGltbWVkaWF0ZWx5IGJlZm9yZSBkaXNlbWJhcmtpbmcuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFN0YXR1ZUdsaXRjaCA9IEdsaXRjaGVzLmZsYWcoJ0dzJywge1xuICAgIG5hbWU6ICdTdGF0dWUgZ2xpdGNoJyxcbiAgICB0ZXh0OiBgU3RhdHVlIGdsaXRjaCBhbGxvd3MgZ2V0dGluZyBiZWhpbmQgc3RhdHVlcyB0aGF0IGJsb2NrIGNlcnRhaW5cbiAgICAgICAgICAgZW50cmFuY2VzOiB0aGUgZ3VhcmRzIGluIFBvcnRvYSwgQW1hem9uZXMsIE9haywgR29hLCBhbmQgU2h5cm9uLFxuICAgICAgICAgICBhcyB3ZWxsIGFzIHRoZSBzdGF0dWVzIGluIHRoZSBXYXRlcmZhbGwgQ2F2ZS4gIEl0IGlzIGRvbmUgYnlcbiAgICAgICAgICAgYXBwcm9hY2hpbmcgdGhlIHN0YXR1ZSBmcm9tIHRoZSB0b3AgcmlnaHQgYW5kIGhvbGRpbmcgZG93biBhbmRcbiAgICAgICAgICAgbGVmdCBvbiB0aGUgY29udHJvbGxlciB3aGlsZSBtYXNoaW5nIEIuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTXRTYWJyZVJlcXVpcmVtZW50U2tpcCA9IEdsaXRjaGVzLmZsYWcoJ0duJywge1xuICAgIG5hbWU6ICdNdCBTYWJyZSByZXF1aXJlbWVudHMgc2tpcCcsXG4gICAgdGV4dDogYEVudGVyaW5nIE10IFNhYnJlIE5vcnRoIG5vcm1hbGx5IHJlcXVpcmVzICgxKSBoYXZpbmcgVGVsZXBvcnQsXG4gICAgICAgICAgIGFuZCAoMikgdGFsa2luZyB0byB0aGUgcmFiYml0IGluIExlYWYgYWZ0ZXIgdGhlIGFiZHVjdGlvbiAodmlhXG4gICAgICAgICAgIFRlbGVwYXRoeSkuICBCb3RoIG9mIHRoZXNlIHJlcXVpcmVtZW50cyBjYW4gYmUgc2tpcHBlZDogZmlyc3QgYnlcbiAgICAgICAgICAgZmx5aW5nIG92ZXIgdGhlIHJpdmVyIGluIENvcmRlbCBwbGFpbiByYXRoZXIgdGhhbiBjcm9zc2luZyB0aGVcbiAgICAgICAgICAgYnJpZGdlLCBhbmQgdGhlbiBieSB0aHJlYWRpbmcgdGhlIG5lZWRsZSBiZXR3ZWVuIHRoZSBoaXRib3hlcyBpblxuICAgICAgICAgICBNdCBTYWJyZSBOb3J0aC5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTdGF0dWVHYXVudGxldFNraXAgPSBHbGl0Y2hlcy5mbGFnKCdHZycsIHtcbiAgICBuYW1lOiAnU3RhdHVlIGdhdW50bGV0IHNraXAnLFxuICAgIHRleHQ6IGBUaGUgc2hvb3Rpbmcgc3RhdHVlcyBpbiBmcm9udCBvZiBHb2EgYW5kIFN0eHkgbm9ybWFsbHkgcmVxdWlyZVxuICAgICAgICAgICBCYXJyaWVyIHRvIHBhc3Mgc2FmZWx5LiAgV2l0aCB0aGlzIGZsYWcsIEZsaWdodCBjYW4gYWxzbyBiZSB1c2VkXG4gICAgICAgICAgIGJ5IGZseWluZyBhcm91bmQgdGhlIGVkZ2Ugb2YgdGhlIHN0YXR1ZS5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTd29yZENoYXJnZUdsaXRjaCA9IEdsaXRjaGVzLmZsYWcoJ0djJywge1xuICAgIG5hbWU6ICdTd29yZCBjaGFyZ2UgZ2xpdGNoJyxcbiAgICB0ZXh0OiBgU3dvcmQgY2hhcmdlIGdsaXRjaCBhbGxvd3MgY2hhcmdpbmcgb25lIHN3b3JkIHRvIHRoZSBsZXZlbCBvZlxuICAgICAgICAgICBhbm90aGVyIHN3b3JkIGJ5IGVxdWlwcGluZyB0aGUgaGlnaGVyLWxldmVsIHN3b3JkLCByZS1lbnRlcmluZ1xuICAgICAgICAgICB0aGUgbWVudSwgY2hhbmdpbmcgdG8gdGhlIGxvd2VyLWxldmVsIHN3b3JkIHdpdGhvdXQgZXhpdGluZyB0aGVcbiAgICAgICAgICAgbWVudSwgY3JlYXRpbmcgYSBoYXJkIHNhdmUsIHJlc2V0dGluZywgYW5kIHRoZW4gY29udGludWluZy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFRyaWdnZXJTa2lwID0gR2xpdGNoZXMuZmxhZygnR3QnLCB7XG4gICAgbmFtZTogJ1RyaWdnZXIgc2tpcCcsXG4gICAgdGV4dDogYEEgd2lkZSB2YXJpZXR5IG9mIHRyaWdnZXJzIGFuZCBleGl0IHNxdWFyZXMgY2FuIGJlIHNraXBwZWQgYnlcbiAgICAgICAgICAgdXNpbmcgYW4gaW52YWxpZCBpdGVtIGV2ZXJ5IGZyYW1lIHdoaWxlIHdhbGtpbmcuICBUaGlzIGFsbG93c1xuICAgICAgICAgICBieXBhc3NpbmcgYm90aCBNdCBTYWJyZSBOb3J0aCBlbnRyYW5jZSB0cmlnZ2VycywgdGhlIEV2aWwgU3Bpcml0XG4gICAgICAgICAgIElzbGFuZCBlbnRyYW5jZSB0cmlnZ2VyLCB0cmlnZ2VycyBmb3IgZ3VhcmRzIHRvIG1vdmUsIHNsb3BlcyxcbiAgICAgICAgICAgZGFtYWdlIHRpbGVzLCBhbmQgc2VhbWxlc3MgbWFwIHRyYW5zaXRpb25zLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFnZVNraXAgPSBHbGl0Y2hlcy5mbGFnKCdHcicsIHtcbiAgICBuYW1lOiAnUmFnZSBza2lwJyxcbiAgICB0ZXh0OiBgUmFnZSBjYW4gYmUgc2tpcHBlZCBieSBkYW1hZ2UtYm9vc3RpbmcgZGlhZ29uYWxseSBpbnRvIHRoZSBMaW1lXG4gICAgICAgICAgIFRyZWUgTGFrZSBzY3JlZW4uICBUaGlzIHByb3ZpZGVzIGFjY2VzcyB0byB0aGUgYXJlYSBiZXlvbmQgdGhlXG4gICAgICAgICAgIGxha2UgaWYgZmxpZ2h0IG9yIGJyaWRnZXMgYXJlIGF2YWlsYWJsZS4gIEZvciBzaW1wbGljaXR5LCB0aGVcbiAgICAgICAgICAgbG9naWMgb25seSBhc3N1bWVzIHRoaXMgaXMgcG9zc2libGUgaWYgdGhlcmUncyBhIGZseWVyLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcbn1cblxuY2xhc3MgQWVzdGhldGljcyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0EnO1xuICByZWFkb25seSBuYW1lID0gJ0Flc3RoZXRpY3MnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZXNlIGZsYWdzIGRvbid0IGRpcmVjdGx5IGFmZmVjdCBnYW1lcGxheSBvciBzaHVmZmxpbmcsIGJ1dCB0aGV5IGRvXG4gICAgICBhZmZlY3QgdGhlIGV4cGVyaWVuY2Ugc2lnbmlmaWNhbnRseSBlbm91Z2ggdGhhdCB0aGVyZSBhcmUgdGhyZWUgbW9kZXNcbiAgICAgIGZvciBlYWNoOiBcIm9mZlwiLCBcIm9wdGlvbmFsXCIgKG5vIGV4Y2xhbWF0aW9uIHBvaW50KSwgYW5kIFwicmVxdWlyZWRcIlxuICAgICAgKGV4Y2xhbWF0aW9uIHBvaW50KS4gIFRoZSBmaXJzdCB0d28gYXJlIGVxdWl2YWxlbnQgZm9yIHNlZWQgZ2VuZXJhdGlvblxuICAgICAgcHVycG9zZXMsIHNvIHRoYXQgeW91IGNhbiBwbGF5IHRoZSBzYW1lIHNlZWQgd2l0aCBlaXRoZXIgc2V0dGluZy5cbiAgICAgIFNldHRpbmcgaXQgdG8gXCIhXCIgd2lsbCBjaGFuZ2UgdGhlIHNlZWQuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplTXVzaWMgPSBBZXN0aGV0aWNzLmZsYWcoJ0FtJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgYmFja2dyb3VuZCBtdXNpYycsXG4gICAgbW9kZXM6ICchJyxcbiAgICBvcHRpb25hbDogTk9fQkFORyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vTXVzaWMgPSBBZXN0aGV0aWNzLmZsYWcoJ0FzJywge1xuICAgIG5hbWU6ICdObyBiYWNrZ3JvdW5kIG11c2ljJyxcbiAgICBvcHRpb25hbDogT1BUSU9OQUwsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVNYXBDb2xvcnMgPSBBZXN0aGV0aWNzLmZsYWcoJ0FjJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgbWFwIGNvbG9ycycsXG4gICAgbW9kZXM6ICchJyxcbiAgICBvcHRpb25hbDogTk9fQkFORyxcbiAgfSk7XG59XG5cbmNsYXNzIE1vbnN0ZXJzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnTSc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnTW9uc3RlcnMnO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVXZWFrbmVzc2VzID0gTW9uc3RlcnMuZmxhZygnTWUnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBtb25zdGVyIHdlYWtuZXNzZXMnLFxuICAgIHRleHQ6IGBNb25zdGVyIGFuZCBib3NzIGVsZW1lbnRhbCB3ZWFrbmVzc2VzIGFyZSBzaHVmZmxlZC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVG93ZXJSb2JvdHMgPSBNb25zdGVycy5mbGFnKCdNdCcsIHtcbiAgICBuYW1lOiAnU2h1ZmZsZSB0b3dlciByb2JvdHMnLFxuICAgIHRleHQ6IGBUb3dlciByb2JvdHMgd2lsbCBiZSBzaHVmZmxlZCBpbnRvIHRoZSBub3JtYWwgcG9vbC4gIEF0IHNvbWVcbiAgICAgICAgICAgcG9pbnQsIG5vcm1hbCBtb25zdGVycyBtYXkgYmUgc2h1ZmZsZWQgaW50byB0aGUgdG93ZXIgYXMgd2VsbC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xufVxuXG5jbGFzcyBFYXN5TW9kZSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0UnO1xuICByZWFkb25seSBuYW1lID0gJ0Vhc3kgTW9kZSc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlIGZvbGxvd2luZyBvcHRpb25zIG1ha2UgcGFydHMgb2YgdGhlIGdhbWUgZWFzaWVyLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vU2h1ZmZsZU1pbWljcyA9IEVhc3lNb2RlLmZsYWcoJ0V0Jywge1xuICAgIG5hbWU6IGBEb24ndCBzaHVmZmxlIG1pbWljcy5gLFxuICAgIHRleHQ6IGBNaW1pY3Mgd2lsbCBiZSBpbiB0aGVpciB2YW5pbGxhIGxvY2F0aW9ucy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUHJlc2VydmVVbmlxdWVDaGVja3MgPSBFYXN5TW9kZS5mbGFnKCdFdScsIHtcbiAgICBuYW1lOiAnS2VlcCB1bmlxdWUgaXRlbXMgYW5kIGNvbnN1bWFibGVzIHNlcGFyYXRlJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHkgYWxsIGl0ZW1zIGFuZCBtaW1pY3MgYXJlIHNodWZmbGVkIGludG8gYSBzaW5nbGUgcG9vbCBhbmRcbiAgICAgICAgICAgZGlzdHJpYnV0ZWQgZnJvbSB0aGVyZS4gIElmIHRoaXMgZmxhZyBpcyBzZXQsIHVuaXF1ZSBpdGVtc1xuICAgICAgICAgICAoc3BlY2lmaWNhbGx5LCBhbnl0aGluZyB0aGF0IGNhbm5vdCBiZSBzb2xkKSB3aWxsIG9ubHkgYmUgZm91bmQgaW5cbiAgICAgICAgICAgZWl0aGVyIChhKSBjaGVja3MgdGhhdCBoZWxkIHVuaXF1ZSBpdGVtcyBpbiB2YW5pbGxhLCBvciAoYikgYm9zc1xuICAgICAgICAgICBkcm9wcy4gIENoZXN0cyBjb250YWluaW5nIGNvbnN1bWFibGVzIGluIHZhbmlsbGEgbWF5IGJlIHNhZmVseVxuICAgICAgICAgICBpZ25vcmVkLCBidXQgY2hlc3RzIGNvbnRhaW5pbmcgdW5pcXVlIGl0ZW1zIGluIHZhbmlsbGEgbWF5IHN0aWxsXG4gICAgICAgICAgIGVuZCB1cCB3aXRoIG5vbi11bmlxdWUgaXRlbXMgYmVjYXVzZSBvZiBib3NzZXMgbGlrZSBWYW1waXJlIDIgdGhhdFxuICAgICAgICAgICBkcm9wIGNvbnN1bWFibGVzLiAgSWYgbWltaWNzIGFyZSBzaHVmZmxlZCwgdGhleSB3aWxsIG9ubHkgYmUgaW5cbiAgICAgICAgICAgY29uc3VtYWJsZSBsb2NhdGlvbnMuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IERlY3JlYXNlRW5lbXlEYW1hZ2UgPSBFYXN5TW9kZS5mbGFnKCdFZCcsIHtcbiAgICBuYW1lOiAnRGVjcmVhc2UgZW5lbXkgZGFtYWdlJyxcbiAgICB0ZXh0OiBgRW5lbXkgYXR0YWNrIHBvd2VyIHdpbGwgYmUgc2lnbmlmaWNhbnRseSBkZWNyZWFzZWQgaW4gdGhlIGVhcmx5IGdhbWVcbiAgICAgICAgICAgKGJ5IGEgZmFjdG9yIG9mIDMpLiAgVGhlIGdhcCB3aWxsIG5hcnJvdyBpbiB0aGUgbWlkLWdhbWUgYW5kIGV2ZW50dWFsbHlcbiAgICAgICAgICAgcGhhc2Ugb3V0IGF0IHNjYWxpbmcgbGV2ZWwgNDAuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQgPSBFYXN5TW9kZS5mbGFnKCdFcycsIHtcbiAgICBuYW1lOiAnR3VhcmFudGVlIHN0YXJ0aW5nIHN3b3JkJyxcbiAgICB0ZXh0OiBgVGhlIExlYWYgZWxkZXIgaXMgZ3VhcmFudGVlZCB0byBnaXZlIGEgc3dvcmQuICBJdCB3aWxsIG5vdCBiZVxuICAgICAgICAgICByZXF1aXJlZCB0byBkZWFsIHdpdGggYW55IGVuZW1pZXMgYmVmb3JlIGZpbmRpbmcgdGhlIGZpcnN0IHN3b3JkLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBHdWFyYW50ZWVSZWZyZXNoID0gRWFzeU1vZGUuZmxhZygnRXInLCB7XG4gICAgbmFtZTogJ0d1YXJhbnRlZSByZWZyZXNoJyxcbiAgICB0ZXh0OiBgR3VhcmFudGVlcyB0aGUgUmVmcmVzaCBzcGVsbCB3aWxsIGJlIGF2YWlsYWJsZSBiZWZvcmUgZmlnaHRpbmdcbiAgICAgICAgICAgVGV0cmFyY2hzLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBFeHBlcmllbmNlU2NhbGVzRmFzdGVyID0gRWFzeU1vZGUuZmxhZygnRXgnLCB7XG4gICAgbmFtZTogJ0V4cGVyaWVuY2Ugc2NhbGVzIGZhc3RlcicsXG4gICAgdGV4dDogYExlc3MgZ3JpbmRpbmcgd2lsbCBiZSByZXF1aXJlZCB0byBcImtlZXAgdXBcIiB3aXRoIHRoZSBnYW1lIGRpZmZpY3VsdHkuYCxcbiAgICBleGNsdWRlczogWydIeCddLFxuICB9KTtcbn1cblxuY2xhc3MgTm9HdWFyYW50ZWVzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnTic7XG4gIHJlYWRvbmx5IG5hbWUgPSAnTm8gZ3VhcmFudGVlcyc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgUmVtb3ZlcyB2YXJpb3VzIGd1YXJhbnRlZXMgZnJvbSB0aGUgbG9naWMuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgQmF0dGxlTWFnaWMgPSBOb0d1YXJhbnRlZXMuZmxhZygnTncnLCB7XG4gICAgbmFtZTogJ0JhdHRsZSBtYWdpYyBub3QgZ3VhcmFudGVlZCcsXG4gICAgdGV4dDogYE5vcm1hbGx5LCB0aGUgbG9naWMgd2lsbCBndWFyYW50ZWUgdGhhdCBsZXZlbCAzIHN3b3JkIGNoYXJnZXMgYXJlXG4gICAgICAgICAgIGF2YWlsYWJsZSBiZWZvcmUgZmlnaHRpbmcgdGhlIHRldHJhcmNocyAod2l0aCB0aGUgZXhjZXB0aW9uIG9mIEthcm1pbmUsXG4gICAgICAgICAgIHdobyBvbmx5IHJlcXVpcmVzIGxldmVsIDIpLiAgVGhpcyBkaXNhYmxlcyB0aGF0IGNoZWNrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE1hdGNoaW5nU3dvcmQgPSBOb0d1YXJhbnRlZXMuZmxhZygnTnMnLCB7XG4gICAgbmFtZTogJ01hdGNoaW5nIHN3b3JkIG5vdCBndWFyYW50ZWVkIChcIlRpbmsgTW9kZVwiKScsXG4gICAgdGV4dDogYEVuYWJsZXMgXCJ0aW5rIHN0cmF0c1wiLCB3aGVyZSB3cm9uZy1lbGVtZW50IHN3b3JkcyB3aWxsIHN0aWxsIGRvIGFcbiAgICAgICAgICAgc2luZ2xlIGRhbWFnZSBwZXIgaGl0LiAgUGxheWVyIG1heSBiZSByZXF1aXJlZCB0byBmaWdodCBtb25zdGVyc1xuICAgICAgICAgICAoaW5jbHVkaW5nIGJvc3Nlcykgd2l0aCB0aW5rcy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBCYXJyaWVyID0gTm9HdWFyYW50ZWVzLmZsYWcoJ05iJywge1xuICAgIG5hbWU6ICdCYXJyaWVyIG5vdCBndWFyYW50ZWVkJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHksIHRoZSBsb2dpYyB3aWxsIGd1YXJhbnRlZSBCYXJyaWVyIChvciBlbHNlIHJlZnJlc2ggYW5kIHNoaWVsZFxuICAgICAgICAgICByaW5nKSBiZWZvcmUgZW50ZXJpbmcgU3R4eSwgdGhlIEZvcnRyZXNzLCBvciBmaWdodGluZyBLYXJtaW5lLiAgVGhpc1xuICAgICAgICAgICBkaXNhYmxlcyB0aGF0IGNoZWNrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEdhc01hc2sgPSBOb0d1YXJhbnRlZXMuZmxhZygnTmcnLCB7XG4gICAgbmFtZTogJ0dhcyBtYXNrIG5vdCBndWFyYW50ZWVkJyxcbiAgICB0ZXh0OiBgVGhlIGxvZ2ljIHdpbGwgbm90IGd1YXJhbnRlZSBnYXMgbWFzayBiZWZvcmUgbmVlZGluZyB0byBlbnRlciB0aGUgc3dhbXAsXG4gICAgICAgICAgIG5vciB3aWxsIGxlYXRoZXIgYm9vdHMgKG9yIGhhem1hdCBzdWl0KSBiZSBndWFyYW50ZWVkIHRvIGNyb3NzIGxvbmdcbiAgICAgICAgICAgc3RyZXRjaGVzIG9mIHNwaWtlcy4gIEdhcyBtYXNrIGlzIHN0aWxsIGd1YXJhbnRlZWQgdG8ga2lsbCB0aGUgaW5zZWN0LmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG59XG5cbmNsYXNzIEhhcmRNb2RlIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnSCc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnSGFyZCBtb2RlJztcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9CdWZmTWVkaWNhbEhlcmIgPSBIYXJkTW9kZS5mbGFnKCdIbScsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYnVmZiBtZWRpY2FsIGhlcmIgb3IgZnJ1aXQgb2YgcG93ZXJgLFxuICAgIHRleHQ6IGBNZWRpY2FsIEhlcmIgaXMgbm90IGJ1ZmZlZCB0byBoZWFsIDgwIGRhbWFnZSwgd2hpY2ggaXMgaGVscGZ1bCB0byBtYWtlXG4gICAgICAgICAgIHVwIGZvciBjYXNlcyB3aGVyZSBSZWZyZXNoIGlzIHVuYXZhaWxhYmxlIGVhcmx5LiAgRnJ1aXQgb2YgUG93ZXIgaXMgbm90XG4gICAgICAgICAgIGJ1ZmZlZCB0byByZXN0b3JlIDU2IE1QLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE1heFNjYWxpbmdJblRvd2VyID0gSGFyZE1vZGUuZmxhZygnSHQnLCB7XG4gICAgbmFtZTogJ01heCBzY2FsaW5nIGxldmVsIGluIHRvd2VyJyxcbiAgICB0ZXh0OiBgRW5lbWllcyBpbiB0aGUgdG93ZXIgc3Bhd24gYXQgbWF4IHNjYWxpbmcgbGV2ZWwuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgRXhwZXJpZW5jZVNjYWxlc1Nsb3dlciA9IEhhcmRNb2RlLmZsYWcoJ0h4Jywge1xuICAgIG5hbWU6ICdFeHBlcmllbmNlIHNjYWxlcyBzbG93ZXInLFxuICAgIHRleHQ6IGBNb3JlIGdyaW5kaW5nIHdpbGwgYmUgcmVxdWlyZWQgdG8gXCJrZWVwIHVwXCIgd2l0aCB0aGUgZGlmZmljdWx0eS5gLFxuICAgIGV4Y2x1ZGVzOiBbJ0V4J10sXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IENoYXJnZVNob3RzT25seSA9IEhhcmRNb2RlLmZsYWcoJ0hjJywge1xuICAgIG5hbWU6ICdDaGFyZ2Ugc2hvdHMgb25seScsXG4gICAgdGV4dDogYFN0YWJiaW5nIGlzIGNvbXBsZXRlbHkgaW5lZmZlY3RpdmUuICBPbmx5IGNoYXJnZWQgc2hvdHMgd29yay5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBCbGFja291dCA9IEhhcmRNb2RlLmZsYWcoJ0h6Jywge1xuICAgIG5hbWU6ICdCbGFja291dCcsXG4gICAgdGV4dDogYEFsbCBjYXZlcyBhbmQgZm9ydHJlc3NlcyBhcmUgcGVybWFuZW50bHkgZGFyay5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBQZXJtYWRlYXRoID0gSGFyZE1vZGUuZmxhZygnSGgnLCB7XG4gICAgbmFtZTogJ1Blcm1hZGVhdGgnLFxuICAgIHRleHQ6IGBIYXJkY29yZSBtb2RlOiBjaGVja3BvaW50cyBhbmQgc2F2ZXMgYXJlIHJlbW92ZWQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcbn1cblxuY2xhc3MgVmFuaWxsYSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgbmFtZSA9ICdWYW5pbGxhJztcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1YnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIE9wdGlvbnMgdG8gcmVzdG9yZSB2YW5pbGxhIGJlaGF2aW9yIGNoYW5nZWQgYnkgZGVmYXVsdC5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBEeW5hID0gVmFuaWxsYS5mbGFnKCdWZCcsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYnVmZiBEeW5hYCxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgd2UgbWFrZXMgdGhlIER5bmEgZmlnaHQgYSBiaXQgbW9yZSBvZiBhIGNoYWxsZW5nZS5cbiAgICAgICAgICAgU2lkZSBwb2RzIHdpbGwgZmlyZSBzaWduaWZpY2FudGx5IG1vcmUuICBUaGUgc2FmZSBzcG90IGhhcyBiZWVuXG4gICAgICAgICAgIHJlbW92ZWQuICBUaGUgcmV2ZW5nZSBiZWFtcyBwYXNzIHRocm91Z2ggYmFycmllci4gIFNpZGUgcG9kcyBjYW5cbiAgICAgICAgICAgbm93IGJlIGtpbGxlZC4gIFRoaXMgZmxhZyBwcmV2ZW50cyB0aGF0IGNoYW5nZS5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgQm9udXNJdGVtcyA9IFZhbmlsbGEuZmxhZygnVmInLCB7XG4gICAgbmFtZTogYERvbid0IGJ1ZmYgYm9udXMgaXRlbXNgLFxuICAgIHRleHQ6IGBMZWF0aGVyIEJvb3RzIGFyZSBjaGFuZ2VkIHRvIFNwZWVkIEJvb3RzLCB3aGljaCBpbmNyZWFzZSBwbGF5ZXIgd2Fsa2luZ1xuICAgICAgICAgICBzcGVlZCAodGhpcyBhbGxvd3MgY2xpbWJpbmcgdXAgdGhlIHNsb3BlIHRvIGFjY2VzcyB0aGUgVG9ybmFkbyBCcmFjZWxldFxuICAgICAgICAgICBjaGVzdCwgd2hpY2ggaXMgdGFrZW4gaW50byBjb25zaWRlcmF0aW9uIGJ5IHRoZSBsb2dpYykuICBEZW8ncyBwZW5kYW50XG4gICAgICAgICAgIHJlc3RvcmVzIE1QIHdoaWxlIG1vdmluZy4gIFJhYmJpdCBib290cyBlbmFibGUgc3dvcmQgY2hhcmdpbmcgdXAgdG9cbiAgICAgICAgICAgbGV2ZWwgMiB3aGlsZSB3YWxraW5nIChsZXZlbCAzIHN0aWxsIHJlcXVpcmVzIGJlaW5nIHN0YXRpb25hcnksIHNvIGFzXG4gICAgICAgICAgIHRvIHByZXZlbnQgd2FzdGluZyB0b25zIG9mIG1hZ2ljKS5gLFxuICB9KTtcblxuICAvLyBUT0RPIC0gaXMgaXQgd29ydGggZXZlbiBhbGxvd2luZyB0byB0dXJuIHRoaXMgb2ZmPyE/XG4gIHN0YXRpYyByZWFkb25seSBNYXBzID0gVmFuaWxsYS5mbGFnKCdWbScsIHtcbiAgICBuYW1lOiAnVmFuaWxsYSBtYXBzJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHkgdGhlIHJhbmRvbWl6ZXIgYWRkcyBhIG5ldyBcIkVhc3QgQ2F2ZVwiIHRvIFZhbGxleSBvZiBXaW5kLFxuICAgICAgICAgICBib3Jyb3dlZCBmcm9tIHRoZSBHQkMgdmVyc2lvbiBvZiB0aGUgZ2FtZS4gIFRoaXMgY2F2ZSBjb250YWlucyB0d29cbiAgICAgICAgICAgY2hlc3RzIChvbmUgY29uc2lkZXJlZCBhIGtleSBpdGVtKSBvbiB0aGUgdXBwZXIgZmxvb3IgYW5kIGV4aXRzIHRvXG4gICAgICAgICAgIHR3byByYW5kb20gYXJlYXMgKGNob3NlbiBiZXR3ZWVuIExpbWUgVHJlZSBWYWxsZXksIENvcmRlbCBQbGFpbixcbiAgICAgICAgICAgR29hIFZhbGxleSwgb3IgRGVzZXJ0IDI7IHRoZSBxdWlja3NhbmQgaXMgcmVtb3ZlZCBmcm9tIHRoZSBlbnRyYW5jZXNcbiAgICAgICAgICAgdG8gUHlyYW1pZCBhbmQgQ3J5cHQpLCBvbmUgdW5ibG9ja2VkIG9uIHRoZSBsb3dlciBmbG9vciwgYW5kIG9uZVxuICAgICAgICAgICBkb3duIHRoZSBzdGFpcnMgYW5kIGJlaGluZCBhIHJvY2sgd2FsbCBmcm9tIHRoZSB1cHBlciBmbG9vci4gIFRoaXNcbiAgICAgICAgICAgZmxhZyBwcmV2ZW50cyBhZGRpbmcgdGhhdCBjYXZlLiAgSWYgc2V0IGFzIFwiViFtXCIgdGhlbiBhIGRpcmVjdCBwYXRoXG4gICAgICAgICAgIHdpbGwgaW5zdGVhZCBiZSBhZGRlZCBiZXR3ZWVuIFZhbGxleSBvZiBXaW5kIGFuZCBMaW1lIFRyZWUgVmFsbGV5XG4gICAgICAgICAgIChhcyBpbiBlYXJsaWVyIHZlcnNpb25zIG9mIHRoZSByYW5kb21pemVyKS5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTaG9wcyA9IFZhbmlsbGEuZmxhZygnVnMnLCB7XG4gICAgbmFtZTogJ1ZhbmlsbGEgc2hvcHMnLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB3ZSBkaXNhYmxlIHNob3AgZ2xpdGNoLCBzaHVmZmxlIHNob3AgY29udGVudHMsIGFuZCB0aWVcbiAgICAgICAgICAgdGhlIHByaWNlcyB0byB0aGUgc2NhbGluZyBsZXZlbCAoaXRlbSBzaG9wcyBhbmQgaW5ucyBpbmNyZWFzZSBieSBhXG4gICAgICAgICAgIGZhY3RvciBvZiAyIGV2ZXJ5IDEwIHNjYWxpbmcgbGV2ZWxzLCBhcm1vciBzaG9wcyBkZWNyZWFzZSBieSBhXG4gICAgICAgICAgIGZhY3RvciBvZiAyIGV2ZXJ5IDEyIHNjYWxpbmcgbGV2ZWxzKS4gIFRoaXMgZmxhZyBwcmV2ZW50cyBhbGwgb2ZcbiAgICAgICAgICAgdGhlc2UgY2hhbmdlcywgcmVzdG9yaW5nIHNob3BzIHRvIGJlIGNvbXBsZXRlbHkgdmFuaWxsYS5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgV2lsZFdhcnAgPSBWYW5pbGxhLmZsYWcoJ1Z3Jywge1xuICAgIG5hbWU6ICdWYW5pbGxhIHdpbGQgd2FycCcsXG4gICAgdGV4dDogYEJ5IGRlZmF1bHQsIFdpbGQgV2FycCBpcyBuZXJmZWQgdG8gb25seSByZXR1cm4gdG8gTWV6YW1lIFNocmluZS5cbiAgICAgICAgICAgVGhpcyBmbGFnIHJlc3RvcmVzIGl0IHRvIHdvcmsgbGlrZSBub3JtYWwuICBOb3RlIHRoYXQgdGhpcyB3aWxsIHB1dFxuICAgICAgICAgICBhbGwgd2lsZCB3YXJwIGxvY2F0aW9ucyBpbiBsb2dpYyB1bmxlc3MgdGhlIGZsYWcgaXMgc2V0IGFzIChWIXcpLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG59XG5cbmNsYXNzIFF1YWxpdHkgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdRJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdRdWFsaXR5IG9mIExpZmUnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZSBmb2xsb3dpbmcgcXVhbGl0eS1vZi1saWZlIGZsYWdzIHR1cm4gPGk+b2ZmPC9pPiBpbXByb3ZlbWVudHMgdGhhdFxuICAgICAgYXJlIG5vcm1hbGx5IG9uIGJ5IGRlZmF1bHQuICBUaGV5IGFyZSBvcHRpb25hbCBhbmQgd2lsbCBub3QgYWZmZWN0IHRoZVxuICAgICAgc2VlZCBnZW5lcmF0aW9uLiAgVGhleSBtYXkgYmUgdG9nZ2xlZCBmcmVlbHkgaW4gcmFjZSBtb2RlLmA7XG5cbiAgLy8gVE9ETyAtIHJlbWVtYmVyIHByZWZlcmVuY2VzIGFuZCBhdXRvLWFwcGx5P1xuICBzdGF0aWMgcmVhZG9ubHkgTm9BdXRvRXF1aXAgPSBRdWFsaXR5LmZsYWcoJ1FhJywge1xuICAgIG5hbWU6IGBEb24ndCBhdXRvbWF0aWNhbGx5IGVxdWlwIG9yYnMgYW5kIGJyYWNlbGV0c2AsXG4gICAgdGV4dDogYFByZXZlbnRzIGFkZGluZyBhIHF1YWxpdHktb2YtbGlmZSBpbXByb3ZlbWVudCB0byBhdXRvbWF0aWNhbGx5IGVxdWlwXG4gICAgICAgICAgIHRoZSBjb3JyZXNwb25kaW5nIG9yYi9icmFjZWxldCB3aGVuZXZlciBjaGFuZ2luZyBzd29yZHMuYCxcbiAgICBvcHRpb25hbDogT1BUSU9OQUwsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb0NvbnRyb2xsZXJTaG9ydGN1dHMgPSBRdWFsaXR5LmZsYWcoJ1FjJywge1xuICAgIG5hbWU6ICdEaXNhYmxlIGNvbnRyb2xsZXIgc2hvcnRjdXRzJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgd2UgZGlzYWJsZSBzZWNvbmQgY29udHJvbGxlciBpbnB1dCBhbmQgaW5zdGVhZCBlbmFibGVcbiAgICAgICAgICAgc29tZSBuZXcgc2hvcnRjdXRzIG9uIGNvbnRyb2xsZXIgMTogU3RhcnQrQStCIGZvciB3aWxkIHdhcnAsIGFuZFxuICAgICAgICAgICBTZWxlY3QrQiB0byBxdWlja2x5IGNoYW5nZSBzd29yZHMuICBUbyBzdXBwb3J0IHRoaXMsIHRoZSBhY3Rpb24gb2ZcbiAgICAgICAgICAgdGhlIHN0YXJ0IGFuZCBzZWxlY3QgYnV0dG9ucyBpcyBjaGFuZ2VkIHNsaWdodGx5LiAgVGhpcyBmbGFnXG4gICAgICAgICAgIGRpc2FibGVzIHRoaXMgY2hhbmdlIGFuZCByZXRhaW5zIG5vcm1hbCBiZWhhdmlvci5gLFxuICAgIG9wdGlvbmFsOiBPUFRJT05BTCxcbiAgfSk7XG59XG5cbmNsYXNzIERlYnVnTW9kZSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgLy8gVE9ETyAtIGhvdyB0byBkaXNjb3ZlciBGbGFnU2VjdGlvbnM/Pz9cbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0QnO1xuICByZWFkb25seSBuYW1lID0gJ0RlYnVnIE1vZGUnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZXNlIG9wdGlvbnMgYXJlIGhlbHBmdWwgZm9yIGV4cGxvcmluZyBvciBkZWJ1Z2dpbmcuICBOb3RlIHRoYXQsXG4gICAgICB3aGlsZSB0aGV5IGRvIG5vdCBkaXJlY3RseSBhZmZlY3QgYW55IHJhbmRvbWl6YXRpb24sIHRoZXlcbiAgICAgIDxpPmRvPC9pPiBmYWN0b3IgaW50byB0aGUgc2VlZCB0byBwcmV2ZW50IGNoZWF0aW5nLCBhbmQgdGhleVxuICAgICAgd2lsbCByZW1vdmUgdGhlIG9wdGlvbiB0byBnZW5lcmF0ZSBhIHNlZWQgZm9yIHJhY2luZy5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBTcG9pbGVyTG9nID0gRGVidWdNb2RlLmZsYWcoJ0RzJywge1xuICAgIG5hbWU6ICdHZW5lcmF0ZSBhIHNwb2lsZXIgbG9nJyxcbiAgICB0ZXh0OiBgTm90ZTogPGI+dGhpcyB3aWxsIGNoYW5nZSB0aGUgcGxhY2VtZW50IG9mIGl0ZW1zPC9iPiBjb21wYXJlZCB0byBhXG4gICAgICAgICAgIHNlZWQgZ2VuZXJhdGVkIHdpdGhvdXQgdGhpcyBmbGFnIHR1cm5lZCBvbi5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVHJhaW5lck1vZGUgPSBEZWJ1Z01vZGUuZmxhZygnRHQnLCB7XG4gICAgbmFtZTogJ1RyYWluZXIgbW9kZScsXG4gICAgdGV4dDogYEluc3RhbGxzIGEgdHJhaW5lciBmb3IgcHJhY3RpY2luZyBjZXJ0YWluIHBhcnRzIG9mIHRoZSBnYW1lLlxuICAgICAgICAgICBBdCB0aGUgc3RhcnQgb2YgdGhlIGdhbWUsIHRoZSBwbGF5ZXIgd2lsbCBoYXZlIGFsbCBzd29yZHMsIGJhc2ljXG4gICAgICAgICAgIGFybW9ycyBhbmQgc2hpZWxkcywgYWxsIHdvcm4gaXRlbXMgYW5kIG1hZ2ljcywgYSBzZWxlY3Rpb24gb2ZcbiAgICAgICAgICAgY29uc3VtYWJsZXMsIGJvdyBvZiB0cnV0aCwgbWF4aW11bSBjYXNoLCBhbGwgd2FycCBwb2ludHMgYWN0aXZhdGVkLFxuICAgICAgICAgICBhbmQgdGhlIFNoeXJvbiBtYXNzYWNyZSB3aWxsIGhhdmUgYmVlbiB0cmlnZ2VyZWQuICBXaWxkIHdhcnAgaXNcbiAgICAgICAgICAgcmVjb25maWd1cmVkIHRvIHByb3ZpZGUgZWFzeSBhY2Nlc3MgdG8gYWxsIGJvc3Nlcy4gIEFkZGl0aW9uYWxseSxcbiAgICAgICAgICAgdGhlIGZvbGxvd2luZyBidXR0b24gY29tYmluYXRpb25zIGFyZSByZWNvZ25pemVkOjx1bD5cbiAgICAgICAgICAgICA8bGk+U3RhcnQrVXA6IGluY3JlYXNlIHBsYXllciBsZXZlbFxuICAgICAgICAgICAgIDxsaT5TdGFydCtEb3duOiBpbmNyZWFzZSBzY2FsaW5nIGxldmVsXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0xlZnQ6IGdldCBhbGwgYmFsbHNcbiAgICAgICAgICAgICA8bGk+U3RhcnQrUmlnaHQ6IGdldCBhbGwgYnJhY2VsZXRzXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0IrRG93bjogZ2V0IGEgZnVsbCBzZXQgb2YgY29uc3VtYWJsZSBpdGVtc1xuICAgICAgICAgICAgIDxsaT5TdGFydCtCK0xlZnQ6IGdldCBhbGwgYWR2YW5jZWQgYXJtb3JzXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0IrUmlnaHQ6IGdldCBhbGwgYWR2YW5jZWQgc2hpZWxkc1xuICAgICAgICAgICA8L3VsPmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOZXZlckRpZSA9IERlYnVnTW9kZS5mbGFnKCdEaScsIHtcbiAgICBuYW1lOiAnUGxheWVyIG5ldmVyIGRpZXMnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9TaHVmZmxlID0gRGVidWdNb2RlLmZsYWcoJ0RuJywge1xuICAgIG5hbWU6ICdEbyBub3Qgc2h1ZmZsZSBpdGVtcycsXG4gICAgdGV4dDogYEl0ZW1zIHdpbGwgbm90IGJlIHNodWZmbGVkLiBXQVJOSU5HOiBUaGlzIGRpc2FibGVzIHRoZSBsb2dpYyBhbmRcbiAgICAgICAgICAgaXMgdmVyeSBsaWtlbHkgdG8gcmVzdWx0IGluIGFuIHVud2lubmFibGUgc2VlZGAsXG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgRmxhZ1NldCB7XG4gIHByaXZhdGUgZmxhZ3M6IE1hcDxGbGFnLCBNb2RlPjtcblxuICBjb25zdHJ1Y3RvcihzdHI6IHN0cmluZ3xNYXA8RmxhZywgTW9kZT4gPSAnQENhc3VhbCcpIHtcbiAgICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuZmxhZ3MgPSBuZXcgTWFwKCk7XG4gICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBzdHIpIHtcbiAgICAgICAgdGhpcy5zZXQoay5mbGFnLCB2KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHN0ci5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgIC8vIFRPRE8gLSBzdXBwb3J0ICdAQ2FzdWFsK1JzLUVkJ1xuICAgICAgY29uc3QgZXhwYW5kZWQgPSBQcmVzZXRzLmdldChzdHIuc3Vic3RyaW5nKDEpKTtcbiAgICAgIGlmICghZXhwYW5kZWQpIHRocm93IG5ldyBVc2FnZUVycm9yKGBVbmtub3duIHByZXNldDogJHtzdHJ9YCk7XG4gICAgICB0aGlzLmZsYWdzID0gbmV3IE1hcChleHBhbmRlZC5mbGFncyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZmxhZ3MgPSBuZXcgTWFwKCk7XG4gICAgLy8gcGFyc2UgdGhlIHN0cmluZ1xuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9bXkEtWmEtejAtOSE/XS9nLCAnJyk7XG4gICAgY29uc3QgcmUgPSAvKFtBLVpdKShbYS16MC05IT9dKykvZztcbiAgICBsZXQgbWF0Y2g7XG4gICAgd2hpbGUgKChtYXRjaCA9IHJlLmV4ZWMoc3RyKSkpIHtcbiAgICAgIGNvbnN0IFssIGtleSwgdGVybXNdID0gbWF0Y2g7XG4gICAgICBjb25zdCByZTIgPSAvKFshP118XikoW2EtejAtOV0rKS9nO1xuICAgICAgd2hpbGUgKChtYXRjaCA9IHJlMi5leGVjKHRlcm1zKSkpIHtcbiAgICAgICAgY29uc3QgWywgbW9kZSwgZmxhZ3NdID0gbWF0Y2g7XG4gICAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBmbGFncykge1xuICAgICAgICAgIHRoaXMuc2V0KGtleSArIGZsYWcsIG1vZGUgfHwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmaWx0ZXJPcHRpb25hbCgpOiBGbGFnU2V0IHtcbiAgICByZXR1cm4gbmV3IEZsYWdTZXQoXG4gICAgICAgIG5ldyBNYXAoXG4gICAgICAgICAgICBbLi4udGhpcy5mbGFnc10ubWFwKFxuICAgICAgICAgICAgICAgIChbaywgdl0pID0+IFtrLCBrLm9wdHMub3B0aW9uYWwgPyBrLm9wdHMub3B0aW9uYWwodikgOiB2XSkpKTtcbiAgfVxuXG4gIGZpbHRlclJhbmRvbShyYW5kb206IFJhbmRvbSk6IEZsYWdTZXQge1xuICAgIGZ1bmN0aW9uIHBpY2soazogRmxhZywgdjogTW9kZSk6IE1vZGUge1xuICAgICAgaWYgKHYgIT09ICc/JykgcmV0dXJuIHY7XG4gICAgICByZXR1cm4gcmFuZG9tLnBpY2soW3RydWUsIGZhbHNlLCAuLi4oay5vcHRzLm1vZGVzIHx8ICcnKV0pO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEZsYWdTZXQoXG4gICAgICAgIG5ldyBNYXAoWy4uLnRoaXMuZmxhZ3NdLm1hcCgoW2ssIHZdKSA9PiBbaywgcGljayhrLCB2KV0pKSk7XG4gIH1cblxuICB0b1N0cmluZygpIHtcbiAgICB0eXBlIFNlY3Rpb24gPSBEZWZhdWx0TWFwPHN0cmluZywgc3RyaW5nW10+O1xuICAgIGNvbnN0IHNlY3Rpb25zID1cbiAgICAgICAgbmV3IERlZmF1bHRNYXA8c3RyaW5nLCBTZWN0aW9uPihcbiAgICAgICAgICAgICgpID0+IG5ldyBEZWZhdWx0TWFwPHN0cmluZywgc3RyaW5nW10+KCgpID0+IFtdKSlcbiAgICBmb3IgKGNvbnN0IFtmbGFnLCBtb2RlXSBvZiB0aGlzLmZsYWdzKSB7XG4gICAgICBpZiAoZmxhZy5mbGFnLmxlbmd0aCAhPT0gMikgdGhyb3cgbmV3IEVycm9yKGBCYWQgZmxhZyAke2ZsYWcuZmxhZ31gKTtcbiAgICAgIGlmICghbW9kZSkgY29udGludWU7XG4gICAgICBjb25zdCBzZWN0aW9uID0gc2VjdGlvbnMuZ2V0KGZsYWcuZmxhZ1swXSk7XG4gICAgICBjb25zdCBzdWJzZWN0aW9uID0gbW9kZSA9PT0gdHJ1ZSA/ICcnIDogbW9kZTtcbiAgICAgIHNlY3Rpb24uZ2V0KHN1YnNlY3Rpb24pLnB1c2goZmxhZy5mbGFnWzFdKTtcbiAgICB9XG4gICAgY29uc3Qgb3V0ID0gW107XG4gICAgZm9yIChjb25zdCBba2V5LCBzZWN0aW9uXSBvZiBzZWN0aW9ucy5zb3J0ZWRFbnRyaWVzKCkpIHtcbiAgICAgIGxldCBzZWMgPSBrZXk7XG4gICAgICBmb3IgKGNvbnN0IFtzdWJrZXksIHN1YnNlY3Rpb25dIG9mIHNlY3Rpb24uc29ydGVkRW50cmllcygpKSB7XG4gICAgICAgIHNlYyArPSBzdWJrZXkgKyBzdWJzZWN0aW9uLnNvcnQoKS5qb2luKCcnKTtcbiAgICAgIH1cbiAgICAgIG91dC5wdXNoKHNlYyk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbignICcpO1xuICB9XG5cbiAgdG9nZ2xlKG5hbWU6IHN0cmluZyk6IE1vZGUge1xuICAgIGNvbnN0IGZsYWcgPSBGbGFnLmZsYWdzLmdldChuYW1lKTtcbiAgICBpZiAoIWZsYWcpIHtcbiAgICAgIC8vIFRPRE8gLSBSZXBvcnQgc29tZXRoaW5nXG4gICAgICBjb25zb2xlLmVycm9yKGBCYWQgZmxhZzogJHtuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBtb2RlOiBNb2RlID0gdGhpcy5mbGFncy5nZXQoZmxhZykgfHwgZmFsc2U7XG4gICAgY29uc3QgbW9kZXMgPSBbZmFsc2UsIHRydWUsIC4uLihmbGFnLm9wdHMubW9kZXMgfHwgJycpLCAnPycsIGZhbHNlXTtcbiAgICBjb25zdCBpbmRleCA9IG1vZGVzLmluZGV4T2YobW9kZSk7XG4gICAgaWYgKGluZGV4IDwgMCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgY3VycmVudCBtb2RlICR7bW9kZX1gKTtcbiAgICBjb25zdCBuZXh0ID0gbW9kZXNbaW5kZXggKyAxXTtcbiAgICB0aGlzLmZsYWdzLnNldChmbGFnLCBuZXh0KTtcbiAgICByZXR1cm4gbmV4dDtcbiAgfVxuXG4gIHNldChuYW1lOiBzdHJpbmcsIG1vZGU6IE1vZGUpIHtcbiAgICBjb25zdCBmbGFnID0gRmxhZy5mbGFncy5nZXQobmFtZSk7XG4gICAgaWYgKCFmbGFnKSB7XG4gICAgICAvLyBUT0RPIC0gUmVwb3J0IHNvbWV0aGluZ1xuICAgICAgY29uc29sZS5lcnJvcihgQmFkIGZsYWc6ICR7bmFtZX1gKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCFtb2RlKSB7XG4gICAgICB0aGlzLmZsYWdzLmRlbGV0ZShmbGFnKTtcbiAgICB9IGVsc2UgaWYgKG1vZGUgPT09IHRydWUgfHwgbW9kZSA9PT0gJz8nIHx8IGZsYWcub3B0cy5tb2Rlcz8uaW5jbHVkZXMobW9kZSkpIHtcbiAgICAgIHRoaXMuZmxhZ3Muc2V0KGZsYWcsIG1vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBCYWQgZmxhZyBtb2RlOiAke25hbWVbMF19JHttb2RlfSR7bmFtZS5zdWJzdHJpbmcoMSl9YCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFJlbW92ZSBhbnkgY29uZmxpY3RzXG4gICAgZm9yIChjb25zdCBleGNsdWRlZCBvZiBmbGFnLm9wdHMuZXhjbHVkZXMgfHwgW10pIHtcbiAgICAgIHRoaXMuZmxhZ3MuZGVsZXRlKEZsYWcuZmxhZ3MuZ2V0KGV4Y2x1ZGVkKSEpO1xuICAgIH1cbiAgfVxuXG4gIGNoZWNrKG5hbWU6IEZsYWd8c3RyaW5nLCAuLi5tb2RlczogTW9kZVtdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZmxhZyA9IG5hbWUgaW5zdGFuY2VvZiBGbGFnID8gbmFtZSA6IEZsYWcuZmxhZ3MuZ2V0KG5hbWUpO1xuICAgIGlmICghbW9kZXMubGVuZ3RoKSBtb2Rlcy5wdXNoKHRydWUpO1xuICAgIHJldHVybiBtb2Rlcy5pbmNsdWRlcyhmbGFnICYmIHRoaXMuZmxhZ3MuZ2V0KGZsYWcpIHx8IGZhbHNlKTtcbiAgfVxuXG4gIGdldChuYW1lOiBGbGFnfHN0cmluZyk6IE1vZGUge1xuICAgIGNvbnN0IGZsYWcgPSBuYW1lIGluc3RhbmNlb2YgRmxhZyA/IG5hbWUgOiBGbGFnLmZsYWdzLmdldChuYW1lKTtcbiAgICByZXR1cm4gZmxhZyAmJiB0aGlzLmZsYWdzLmdldChmbGFnKSB8fCBmYWxzZTtcbiAgfVxuXG4gIHByZXNlcnZlVW5pcXVlQ2hlY2tzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLlByZXNlcnZlVW5pcXVlQ2hlY2tzKTtcbiAgfVxuICBzaHVmZmxlTWltaWNzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLk5vU2h1ZmZsZU1pbWljcywgZmFsc2UpO1xuICB9XG5cbiAgYnVmZkRlb3NQZW5kYW50KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG4gIGNoYW5nZUdhc01hc2tUb0hhem1hdFN1aXQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cbiAgc2xvd0Rvd25Ub3JuYWRvKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG4gIGxlYXRoZXJCb290c0dpdmVTcGVlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuICByYWJiaXRCb290c0NoYXJnZVdoaWxlV2Fsa2luZygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuXG4gIHNodWZmbGVTcHJpdGVQYWxldHRlcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVTcHJpdGVDb2xvcnMpO1xuICB9XG4gIHNodWZmbGVNb25zdGVycygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTsgLy8gdGhpcy5jaGVjaygnTXInKTtcbiAgfVxuICBzaHVmZmxlU2hvcHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5TaG9wcywgZmFsc2UpO1xuICB9XG4gIGJhcmdhaW5IdW50aW5nKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNodWZmbGVTaG9wcygpO1xuICB9XG5cbiAgc2h1ZmZsZVRvd2VyTW9uc3RlcnMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTW9uc3RlcnMuVG93ZXJSb2JvdHMpO1xuICB9XG4gIHNodWZmbGVNb25zdGVyRWxlbWVudHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3Nlcyk7XG4gIH1cbiAgc2h1ZmZsZUJvc3NFbGVtZW50cygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zaHVmZmxlTW9uc3RlckVsZW1lbnRzKCk7XG4gIH1cblxuICBidWZmTWVkaWNhbEhlcmIoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuTm9CdWZmTWVkaWNhbEhlcmIsIGZhbHNlKTtcbiAgfVxuICBkZWNyZWFzZUVuZW15RGFtYWdlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLkRlY3JlYXNlRW5lbXlEYW1hZ2UpO1xuICB9XG4gIHRyYWluZXIoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRGVidWdNb2RlLlRyYWluZXJNb2RlKTtcbiAgfVxuICBuZXZlckRpZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhEZWJ1Z01vZGUuTmV2ZXJEaWUpO1xuICB9XG4gIG5vU2h1ZmZsZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhEZWJ1Z01vZGUuTm9TaHVmZmxlKTtcbiAgfVxuICBjaGFyZ2VTaG90c09ubHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuQ2hhcmdlU2hvdHNPbmx5KTtcbiAgfVxuXG4gIGJhcnJpZXJSZXF1aXJlc0NhbG1TZWEoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIH1cbiAgLy8gcGFyYWx5c2lzUmVxdWlyZXNQcmlzb25LZXkoKTogYm9vbGVhbiB7XG4gIC8vICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIC8vIH1cbiAgLy8gc2VhbGVkQ2F2ZVJlcXVpcmVzV2luZG1pbGwoKTogYm9vbGVhbiB7XG4gIC8vICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIC8vIH1cblxuICBjb25uZWN0TGltZVRyZWVUb0xlYWYoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5NYXBzLCAnIScpO1xuICB9XG4gIC8vIGNvbm5lY3RHb2FUb0xlYWYoKSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuY2hlY2soJ1hlJykgJiYgdGhpcy5jaGVjaygnWGcnKTtcbiAgLy8gfVxuICAvLyByZW1vdmVFYXJseVdhbGwoKSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuY2hlY2soJ1hiJyk7XG4gIC8vIH1cbiAgYWRkRWFzdENhdmUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5NYXBzLCBmYWxzZSk7XG4gIH1cbiAgemVidVN0dWRlbnRHaXZlc0l0ZW0oKTogYm9vbGVhbiB7XG4gICAgLy8gSWYgaGUncyBub3QgZ3VhcmFudGVlZCB0byBiZSBhdCB0aGUgc3RhcnQsIG1vdmUgY2hlY2sgdG8gbWV6YW1lIGluc3RlYWRcbiAgICByZXR1cm4gIXRoaXMuc2h1ZmZsZUFyZWFzKCkgJiYgIXRoaXMuc2h1ZmZsZUhvdXNlcygpO1xuICB9XG4gIGZvZ0xhbXBOb3RSZXF1aXJlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLlZhbmlsbGFEb2xwaGluLCBmYWxzZSk7XG4gIH1cbiAgc3RvcnlNb2RlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuU3RvcnlNb2RlKTtcbiAgfVxuICBub0Jvd01vZGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5Ob0Jvd01vZGUpO1xuICB9XG4gIHJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuVmFuaWxsYURvbHBoaW4pO1xuICB9XG4gIHNhaGFyYVJhYmJpdHNSZXF1aXJlVGVsZXBhdGh5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdScicpO1xuICB9XG4gIHRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsIGZhbHNlLCAnIScpO1xuICB9XG4gIHJhbmRvbWl6ZVRodW5kZXJUZWxlcG9ydCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgZmFsc2UpO1xuICB9XG4gIG9yYnNPcHRpb25hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCk7XG4gIH1cblxuICBzaHVmZmxlR29hRmxvb3JzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlNodWZmbGVHb2FGbG9vcnMpO1xuICB9XG4gIHNodWZmbGVIb3VzZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuU2h1ZmZsZUhvdXNlcyk7XG4gIH1cbiAgc2h1ZmZsZUFyZWFzKCkge1xuICAgIC8vIFRPRE86IGNvbnNpZGVyIG11bHRpcGxlIGxldmVscyBvZiBzaHVmZmxlP1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlNodWZmbGVBcmVhcyk7XG4gIH1cbiAgcmFuZG9taXplTWFwcygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVNYXBzKTtcbiAgfVxuICByYW5kb21pemVUcmFkZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplVHJhZGVzKTtcbiAgfVxuICB1bmlkZW50aWZpZWRJdGVtcygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcyk7XG4gIH1cbiAgcmFuZG9taXplV2FsbHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzKTtcbiAgfVxuXG4gIGd1YXJhbnRlZVN3b3JkKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLkd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQpO1xuICB9XG4gIGd1YXJhbnRlZVN3b3JkTWFnaWMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLCBmYWxzZSk7XG4gIH1cbiAgZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhOb0d1YXJhbnRlZXMuTWF0Y2hpbmdTd29yZCwgZmFsc2UpO1xuICB9XG4gIGd1YXJhbnRlZUdhc01hc2soKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTm9HdWFyYW50ZWVzLkdhc01hc2ssIGZhbHNlKTtcbiAgfVxuICBndWFyYW50ZWVCYXJyaWVyKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE5vR3VhcmFudGVlcy5CYXJyaWVyLCBmYWxzZSk7XG4gIH1cbiAgZ3VhcmFudGVlUmVmcmVzaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5HdWFyYW50ZWVSZWZyZXNoKTtcbiAgfVxuXG4gIGRpc2FibGVTd29yZENoYXJnZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5Td29yZENoYXJnZUdsaXRjaCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVUZWxlcG9ydFNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVSYWJiaXRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlU2hvcEdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLlNob3BzLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVN0YXR1ZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlUmFnZVNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuUmFnZVNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlVHJpZ2dlckdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5UcmlnZ2VyU2tpcCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVGbGlnaHRTdGF0dWVTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN0YXR1ZUdhdW50bGV0U2tpcCwgZmFsc2UpO1xuICB9XG5cbiAgYXNzdW1lU3dvcmRDaGFyZ2VHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gpO1xuICB9XG4gIGFzc3VtZUdoZXR0b0ZsaWdodCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5HaGV0dG9GbGlnaHQpO1xuICB9XG4gIGFzc3VtZVRlbGVwb3J0U2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwKTtcbiAgfVxuICBhc3N1bWVSYWJiaXRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXApO1xuICB9XG4gIGFzc3VtZVN0YXR1ZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gpO1xuICB9XG4gIGFzc3VtZVRyaWdnZXJHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuVHJpZ2dlclNraXApO1xuICB9XG4gIGFzc3VtZUZsaWdodFN0YXR1ZVNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3RhdHVlR2F1bnRsZXRTa2lwKTtcbiAgfVxuICBhc3N1bWVXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLldpbGRXYXJwLCB0cnVlKSB8fFxuICAgICAgICB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwKTtcbiAgfVxuICBhc3N1bWVSYWdlU2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5SYWdlU2tpcCk7XG4gIH1cblxuICBuZXJmV2lsZFdhcnAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5XaWxkV2FycCwgZmFsc2UpICYmXG4gICAgICAgIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplV2lsZFdhcnAsIGZhbHNlKTtcbiAgfVxuICBhbGxvd1dpbGRXYXJwKCkge1xuICAgIHJldHVybiAhdGhpcy5uZXJmV2lsZFdhcnAoKTtcbiAgfVxuICByYW5kb21pemVXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVXaWxkV2FycCwgdHJ1ZSk7XG4gIH1cblxuICBibGFja291dE1vZGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuQmxhY2tvdXQpO1xuICB9XG4gIGhhcmRjb3JlTW9kZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5QZXJtYWRlYXRoKTtcbiAgfVxuICBidWZmRHluYSgpIHtcbiAgICByZXR1cm4gIXRoaXMuY2hlY2soVmFuaWxsYS5EeW5hKTtcbiAgfVxuICBtYXhTY2FsaW5nSW5Ub3dlcigpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcik7XG4gIH1cblxuICBleHBTY2FsaW5nRmFjdG9yKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLkV4cGVyaWVuY2VTY2FsZXNTbG93ZXIpID8gMC4yNSA6XG4gICAgICAgIHRoaXMuY2hlY2soRWFzeU1vZGUuRXhwZXJpZW5jZVNjYWxlc0Zhc3RlcikgPyAyLjUgOiAxO1xuICB9XG5cbiAgLy8gT1BUSU9OQUwgRkxBR1NcbiAgYXV0b0VxdWlwQnJhY2VsZXQocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBwYXNzID09PSAnZWFybHknIHx8IHRoaXMuY2hlY2soUXVhbGl0eS5Ob0F1dG9FcXVpcCwgZmFsc2UpO1xuICB9XG4gIGNvbnRyb2xsZXJTaG9ydGN1dHMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBwYXNzID09PSAnZWFybHknIHx8IHRoaXMuY2hlY2soUXVhbGl0eS5Ob0NvbnRyb2xsZXJTaG9ydGN1dHMsIGZhbHNlKTtcbiAgfVxuICByYW5kb21pemVNdXNpYyhwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soQWVzdGhldGljcy5SYW5kb21pemVNdXNpYywgcGFzcyA9PT0gJ2Vhcmx5JyA/ICchJyA6IHRydWUpO1xuICB9XG4gIHNodWZmbGVUaWxlUGFsZXR0ZXMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEFlc3RoZXRpY3MuUmFuZG9taXplTWFwQ29sb3JzLFxuICAgICAgICAgICAgICAgICAgICAgIHBhc3MgPT09ICdlYXJseScgPyAnIScgOiB0cnVlKTtcbiAgfVxuICBub011c2ljKHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gcGFzcyA9PT0gJ2xhdGUnICYmIHRoaXMuY2hlY2soQWVzdGhldGljcy5Ob011c2ljKTtcbiAgfVxuXG4gIHNob3VsZENvbG9yU3dvcmRFbGVtZW50cygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBzaG91bGRVcGRhdGVIdWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cbiJdfQ==