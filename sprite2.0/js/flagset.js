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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3NldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy9mbGFnc2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBZ0JqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUU3RCxNQUFNLE9BQU8sSUFBSTtJQU9mLFlBQXFCLElBQVksRUFBVyxJQUFjO1FBQXJDLFNBQUksR0FBSixJQUFJLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFVO1FBQ3hELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBTkQsTUFBTSxDQUFDLEdBQUc7UUFDUixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQzs7QUFKZSxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7QUFXbEQsTUFBTSxPQUFPLE1BQU07SUFTakIsWUFBWSxNQUFlLEVBQ04sSUFBWSxFQUNaLFdBQW1CLEVBQzVCLEtBQWdEO1FBRnZDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUV0QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0Qs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LENBQUMsZUFBZSxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELHdCQUF3QjtRQUN0QixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRCxlQUFlO1FBQ2IsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDeEMsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtVc2FnZUVycm9yLCBEZWZhdWx0TWFwfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4vcmFuZG9tLmpzJztcblxuaW50ZXJmYWNlIEZsYWdPcHRzIHtcbiAgbmFtZTogc3RyaW5nO1xuICB0ZXh0Pzogc3RyaW5nO1xuICBleGNsdWRlcz86IHN0cmluZ1tdO1xuICBoYXJkPzogYm9vbGVhbjtcbiAgb3B0aW9uYWw/OiAobW9kZTogTW9kZSkgPT4gTW9kZTtcbiAgLy8gQWxsIGZsYWdzIGhhdmUgbW9kZXMgZmFsc2UgYW5kIHRydWUuICBBZGRpdGlvbmFsIG1vZGVzIG1heSBiZVxuICAvLyBzcGVjaWZpZWQgYXMgY2hhcmFjdGVycyBpbiB0aGlzIHN0cmluZyAoZS5nLiAnIScpLlxuICBtb2Rlcz86IHN0cmluZztcbn1cblxudHlwZSBNb2RlID0gYm9vbGVhbnxzdHJpbmc7XG5cbmNvbnN0IE9QVElPTkFMID0gKG1vZGU6IE1vZGUpID0+ICcnO1xuY29uc3QgTk9fQkFORyA9IChtb2RlOiBNb2RlKSA9PiBtb2RlID09PSB0cnVlID8gZmFsc2UgOiBtb2RlO1xuXG5leHBvcnQgY2xhc3MgRmxhZyB7XG4gIHN0YXRpYyByZWFkb25seSBmbGFncyA9IG5ldyBNYXA8c3RyaW5nLCBGbGFnPigpO1xuXG4gIHN0YXRpYyBhbGwoKTogRmxhZ1tdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMuZmxhZ3MudmFsdWVzKCldO1xuICB9XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgZmxhZzogc3RyaW5nLCByZWFkb25seSBvcHRzOiBGbGFnT3B0cykge1xuICAgIEZsYWcuZmxhZ3Muc2V0KGZsYWcsIHRoaXMpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQcmVzZXQge1xuICBzdGF0aWMgYWxsKCk6IFByZXNldFtdIHtcbiAgICBpZiAoIVByZXNldHMuaW5zdGFuY2UpIFByZXNldHMuaW5zdGFuY2UgPSBuZXcgUHJlc2V0cygpO1xuICAgIHJldHVybiBbLi4uUHJlc2V0cy5pbnN0YW5jZS5wcmVzZXRzLnZhbHVlcygpXTtcbiAgfVxuXG4gIHByaXZhdGUgX2ZsYWdTdHJpbmc/OiBzdHJpbmc7XG5cbiAgcmVhZG9ubHkgZmxhZ3M6IFJlYWRvbmx5QXJyYXk8cmVhZG9ubHkgW0ZsYWcsIE1vZGVdPjtcbiAgY29uc3RydWN0b3IocGFyZW50OiBQcmVzZXRzLCAvLyBOT1RFOiBpbXBvc3NpYmxlIHRvIGdldCBhbiBpbnN0YW5jZSBvdXRzaWRlXG4gICAgICAgICAgICAgIHJlYWRvbmx5IG5hbWU6IHN0cmluZyxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgZGVzY3JpcHRpb246IHN0cmluZyxcbiAgICAgICAgICAgICAgZmxhZ3M6IFJlYWRvbmx5QXJyYXk8RmxhZ3xyZWFkb25seSBbRmxhZywgTW9kZV0+KSB7XG4gICAgdGhpcy5mbGFncyA9IGZsYWdzLm1hcChmID0+IGYgaW5zdGFuY2VvZiBGbGFnID8gW2YsIHRydWVdIDogZik7XG4gICAgcGFyZW50LnByZXNldHMuc2V0KG1hcFByZXNldE5hbWUobmFtZSksIHRoaXMpO1xuICB9XG5cbiAgZ2V0IGZsYWdTdHJpbmcoKSB7XG4gICAgaWYgKHRoaXMuX2ZsYWdTdHJpbmcgPT0gbnVsbCkge1xuICAgICAgdGhpcy5fZmxhZ1N0cmluZyA9IFN0cmluZyhuZXcgRmxhZ1NldChgQCR7dGhpcy5uYW1lfWApKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2ZsYWdTdHJpbmc7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFwUHJlc2V0TmFtZShuYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtel0vZywgJycpO1xufVxuXG4vLyBOT1QgRVhQT1JURUQhXG5jbGFzcyBQcmVzZXRzIHtcbiAgc3RhdGljIGluc3RhbmNlOiBQcmVzZXRzIHwgdW5kZWZpbmVkO1xuICByZWFkb25seSBwcmVzZXRzID0gbmV3IE1hcDxzdHJpbmcsIFByZXNldD4oKTtcblxuICBzdGF0aWMgZ2V0KG5hbWU6IHN0cmluZyk6IFByZXNldCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLmluc3RhbmNlKSB0aGlzLmluc3RhbmNlID0gbmV3IFByZXNldHMoKTtcbiAgICByZXR1cm4gdGhpcy5pbnN0YW5jZS5wcmVzZXRzLmdldChtYXBQcmVzZXROYW1lKG5hbWUpKTtcbiAgfVxuXG4gIHJlYWRvbmx5IENhc3VhbCA9IG5ldyBQcmVzZXQodGhpcywgJ0Nhc3VhbCcsIGBcbiAgICAgIEJhc2ljIGZsYWdzIGZvciBhIHJlbGF0aXZlbHkgZWFzeSBwbGF5dGhyb3VnaC4gIFRoaXMgaXMgYSBnb29kXG4gICAgICBwbGFjZSB0byBzdGFydC5gLCBbXG4gICAgICAgIEVhc3lNb2RlLlByZXNlcnZlVW5pcXVlQ2hlY2tzLFxuICAgICAgICBFYXN5TW9kZS5Ob1NodWZmbGVNaW1pY3MsXG4gICAgICAgIEVhc3lNb2RlLkRlY3JlYXNlRW5lbXlEYW1hZ2UsXG4gICAgICAgIEVhc3lNb2RlLkd1YXJhbnRlZVJlZnJlc2gsXG4gICAgICAgIEVhc3lNb2RlLkd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQsXG4gICAgICAgIEVhc3lNb2RlLkV4cGVyaWVuY2VTY2FsZXNGYXN0ZXIsXG4gICAgICAgIFJvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLFxuICAgICAgICBWYW5pbGxhLlNob3BzLFxuICAgICAgICBWYW5pbGxhLkR5bmEsXG4gICAgICAgIFtWYW5pbGxhLk1hcHMsICchJ10sXG4gICAgICAgIFtWYW5pbGxhLldpbGRXYXJwLCAnISddLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IENsYXNzaWMgPSBuZXcgUHJlc2V0KHRoaXMsICdDbGFzc2ljJywgYFxuICAgICAgUHJvdmlkZXMgYSByZWxhdGl2ZWx5IHF1aWNrIHBsYXl0aG91Z2ggd2l0aCBhIHJlYXNvbmFibGUgYW1vdW50IG9mXG4gICAgICBjaGFsbGVuZ2UuICBTaW1pbGFyIHRvIG9sZGVyIHZlcnNpb25zLmAsIFtcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlU3RhcnRpbmdTd29yZCxcbiAgICAgICAgR2xpdGNoZXMuU3RhdHVlR2xpdGNoLFxuICAgICAgICBbUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsICchJ10sXG4gICAgICAgIFtWYW5pbGxhLk1hcHMsICchJ10sXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgU3RhbmRhcmQgPSBuZXcgUHJlc2V0KHRoaXMsICdTdGFuZGFyZCcsIGBcbiAgICAgIFdlbGwtYmFsYW5jZWQsIHN0YW5kYXJkIHJhY2UgZmxhZ3MuYCwgW1xuICAgICAgICAvLyBubyBmbGFncz8gIGFsbCBkZWZhdWx0P1xuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBOb0Jvd01vZGUgPSBuZXcgUHJlc2V0KHRoaXMsICdObyBCb3cgTW9kZScsIGBcbiAgICAgIFRoZSB0b3dlciBpcyBvcGVuIGZyb20gdGhlIHN0YXJ0LCBhcyBzb29uIGFzIHlvdSdyZSByZWFkeSBmb3IgaXQuYCwgW1xuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBNb25zdGVycy5Ub3dlclJvYm90cyxcbiAgICAgICAgSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIsXG4gICAgICAgIFJvdXRpbmcuTm9Cb3dNb2RlLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IEFkdmFuY2VkID0gbmV3IFByZXNldCh0aGlzLCAnQWR2YW5jZWQnLCBgXG4gICAgICBBIGJhbGFuY2VkIHJhbmRvbWl6YXRpb24gd2l0aCBxdWl0ZSBhIGJpdCBtb3JlIGRpZmZpY3VsdHkuYCwgW1xuICAgICAgICBHbGl0Y2hlcy5HaGV0dG9GbGlnaHQsXG4gICAgICAgIEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsXG4gICAgICAgIEdsaXRjaGVzLlN0YXR1ZUdsaXRjaCxcbiAgICAgICAgW0dsaXRjaGVzLlN3b3JkQ2hhcmdlR2xpdGNoLCAnISddLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmFycmllcixcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLFxuICAgICAgICBOb0d1YXJhbnRlZXMuR2FzTWFzayxcbiAgICAgICAgSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIsXG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIE1vbnN0ZXJzLlRvd2VyUm9ib3RzLFxuICAgICAgICBSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZU1hcHMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVBcmVhcyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUhvdXNlcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplVHJhZGVzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsXG4gICAgICAgIFdvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IFdpbGRXYXJwID0gbmV3IFByZXNldCh0aGlzLCAnV2lsZCBXYXJwJywgYFxuICAgICAgU2lnbmlmaWNhbnRseSBvcGVucyB1cCB0aGUgZ2FtZSByaWdodCBmcm9tIHRoZSBzdGFydCB3aXRoIHdpbGRcbiAgICAgIHdhcnAgaW4gbG9naWMuYCwgW1xuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVSZWZyZXNoLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXaWxkV2FycCxcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBNeXN0ZXJ5ID0gbmV3IFByZXNldCh0aGlzLCAnTXlzdGVyeScsIGBcbiAgICAgIEV2ZW4gdGhlIG9wdGlvbnMgYXJlIHJhbmRvbS5gLCBbXG4gICAgICAgIFtXb3JsZC5TaHVmZmxlQXJlYXMsICc/J10sXG4gICAgICAgIFtXb3JsZC5TaHVmZmxlSG91c2VzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplTWFwcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVRyYWRlcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzLCAnPyddLFxuICAgICAgICBbV29ybGQuU2h1ZmZsZUdvYUZsb29ycywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVNwcml0ZUNvbG9ycywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwLCAnPyddLFxuICAgICAgICBbUm91dGluZy5PcmJzTm90UmVxdWlyZWQsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk5vQm93TW9kZSwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuU3RvcnlNb2RlLCAnPyddLFxuICAgICAgICBbUm91dGluZy5WYW5pbGxhRG9scGhpbiwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuUmFnZVNraXAsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5UcmlnZ2VyU2tpcCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlN0YXR1ZUdsaXRjaCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLkdoZXR0b0ZsaWdodCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlN3b3JkQ2hhcmdlR2xpdGNoLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCwgJz8nXSxcbiAgICAgICAgW0Flc3RoZXRpY3MuUmFuZG9taXplTXVzaWMsICc/J10sXG4gICAgICAgIFtBZXN0aGV0aWNzLlJhbmRvbWl6ZU1hcENvbG9ycywgJz8nXSxcbiAgICAgICAgW01vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsICc/J10sXG4gICAgICAgIFtNb25zdGVycy5Ub3dlclJvYm90cywgJz8nXSxcbiAgICAgICAgW0Vhc3lNb2RlLk5vU2h1ZmZsZU1pbWljcywgJz8nXSxcbiAgICAgICAgW0Vhc3lNb2RlLlByZXNlcnZlVW5pcXVlQ2hlY2tzLCAnPyddLFxuICAgICAgICBbTm9HdWFyYW50ZWVzLkJhcnJpZXIsICc/J10sXG4gICAgICAgIFtOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsICc/J10sXG4gICAgICAgIFtOb0d1YXJhbnRlZXMuR2FzTWFzaywgJz8nXSxcbiAgICAgICAgW1ZhbmlsbGEuRHluYSwgJz8nXSxcbiAgICAgICAgW1ZhbmlsbGEuQm9udXNJdGVtcywgJz8nXSxcbiAgICAgICAgW1ZhbmlsbGEuTWFwcywgJz8nXSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBIYXJkY29yZSA9IG5ldyBQcmVzZXQodGhpcywgJ0hhcmRjb3JlJywgYFxuICAgICAgTm90IGZvciB0aGUgZmFpbnQgb2YgaGVhcnQuICBHb29kIGx1Y2suYCwgW1xuICAgICAgICBOb0d1YXJhbnRlZXMuQmFycmllcixcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLFxuICAgICAgICBIYXJkTW9kZS5FeHBlcmllbmNlU2NhbGVzU2xvd2VyLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgSGFyZE1vZGUuUGVybWFkZWF0aCxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVNYXBzLFxuICAgICAgICBXb3JsZC5TaHVmZmxlQXJlYXMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVIb3VzZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVRyYWRlcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzLFxuICAgICAgICBXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IEZ1bGxTdHVwaWQgPSBuZXcgUHJlc2V0KHRoaXMsICdUaGUgRnVsbCBTdHVwaWQnLCBgXG4gICAgICBPbmx5IGEgZmV3IG5vYmxlIGZvb2xzIGhhdmUgZXZlciBjb21wbGV0ZWQgdGhpcy4gIEJlIHN1cmUgdG8gcmVjb3JkIHRoaXNcbiAgICAgIGJlY2F1c2UgcGljcyBvciBpdCBkaWRuJ3QgaGFwcGVuLmAsIFsgXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXJyaWVyLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsXG4gICAgICAgIEhhcmRNb2RlLkJsYWNrb3V0LFxuICAgICAgICBIYXJkTW9kZS5FeHBlcmllbmNlU2NhbGVzU2xvd2VyLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgSGFyZE1vZGUuUGVybWFkZWF0aCxcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgV29ybGQuUmFuZG9taXplTWFwcyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUFyZWFzLFxuICAgICAgICBXb3JsZC5TaHVmZmxlSG91c2VzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVUcmFkZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUdvYUZsb29ycyxcbiAgICAgICAgV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsXG4gICAgICBdKTtcblxuICByZWFkb25seSBUb3VybmFtZW50MjAyMkVhcmx5ID0gbmV3IFByZXNldCh0aGlzLCAnVG91cm5hbWVudCAyMDIyIEVhcmx5IFJvdW5kcycsIGBcbiAgICAgIExvdHMgb2YgcG90ZW50aWFsIGNvbXBsZXhpdHksIGJ1dCB3aXRoaW4gcmVhc29uLiAgUmVxdWlyZXMgYWxsIHN3b3JkcyBhbmRcbiAgICAgIGJvc3NlcywgYXMgd2VsbCBhcyBhIGZldyBnbGl0Y2hlcywgYnV0IGd1YXJhbnRlZXMgYSBzdGFydGluZyBzd29yZC5gLCBbIFxuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVTdGFydGluZ1N3b3JkLFxuICAgICAgICBHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsXG4gICAgICAgIEdsaXRjaGVzLlN0YXR1ZUdhdW50bGV0U2tpcCxcbiAgICAgICAgW01vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsICc/J10sXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgW1JvdXRpbmcuVmFuaWxsYURvbHBoaW4sICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlNodWZmbGVHb2FGbG9vcnMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVTcHJpdGVDb2xvcnMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVUcmFkZXMsICc/J10sXG4gICAgICAgIFtXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcywgJz8nXSxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IFRvdXJuYW1lbnQyMDIyTWlkID0gbmV3IFByZXNldCh0aGlzLCAnVG91cm5hbWVudCAyMDIyIE1pZCBSb3VuZHMnLCBgXG4gICAgICBTb21lIGFkZGl0aW9uYWwgY2hhbGxlbmdlcyBjb21wYXJlZCB0byB0aGUgZWFybHkgcm91bmRzOiBzb21lIGFkZGl0aW9uYWxcbiAgICAgIG15c3RlcnkgZmxhZ3MgYW5kIGdsaXRjaGVzLCBhcyB3ZWxsIGFzIG1heCBkaWZmaWN1bHR5IHNjYWxpbmcgaW4gdGhlXG4gICAgICB0b3dlci5gLCBbIFxuICAgICAgICBbRWFzeU1vZGUuR3VhcmFudGVlU3RhcnRpbmdTd29yZCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLkdoZXR0b0ZsaWdodCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlN0YXR1ZUdsaXRjaCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5TdGF0dWVHYXVudGxldFNraXAsICc/J10sXG4gICAgICAgIEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyLFxuICAgICAgICBbSGFyZE1vZGUuTm9CdWZmTWVkaWNhbEhlcmIsICc/J10sXG4gICAgICAgIFtNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLCAnPyddLFxuICAgICAgICBbTW9uc3RlcnMuVG93ZXJSb2JvdHMsICc/J10sXG4gICAgICAgIFtOb0d1YXJhbnRlZXMuQmFycmllciwgJz8nXSxcbiAgICAgICAgW05vR3VhcmFudGVlcy5CYXR0bGVNYWdpYywgJz8nXSxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIFtSb3V0aW5nLlZhbmlsbGFEb2xwaGluLCAnPyddLFxuICAgICAgICBbUm91dGluZy5PcmJzTm90UmVxdWlyZWQsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlNodWZmbGVHb2FGbG9vcnMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVTcHJpdGVDb2xvcnMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVUcmFkZXMsICc/J10sXG4gICAgICAgIFtXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcywgJz8nXSxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IFRvdXJuYW1lbnQyMDIyRmluYWxzID0gbmV3IFByZXNldCh0aGlzLCAnVG91cm5hbWVudCAyMDIyIEZpbmFscyBSb3VuZCcsIGBcbiAgICAgIE1hbnkgb2YgdGhlIG1vcmUgZGlmZmljdWx0IG15c3RlcnkgZmxhZ3MgZnJvbSB0aGUgbWlkIHJvdW5kcyBhcmUgbm93XG4gICAgICBhbHdheXMgb24sIHBsdXMgZW50cmFuY2Ugc2h1ZmZsZS5gLCBbIFxuICAgICAgICBbRWFzeU1vZGUuR3VhcmFudGVlU3RhcnRpbmdTd29yZCwgJz8nXSxcbiAgICAgICAgR2xpdGNoZXMuR2hldHRvRmxpZ2h0LFxuICAgICAgICBHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsXG4gICAgICAgIEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsXG4gICAgICAgIEdsaXRjaGVzLlN0YXR1ZUdhdW50bGV0U2tpcCxcbiAgICAgICAgSGFyZE1vZGUuTm9CdWZmTWVkaWNhbEhlcmIsXG4gICAgICAgIEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyLFxuICAgICAgICBbTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcywgJz8nXSxcbiAgICAgICAgW01vbnN0ZXJzLlRvd2VyUm9ib3RzLCAnPyddLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmFycmllcixcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgW1JvdXRpbmcuVmFuaWxsYURvbHBoaW4sICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLCAnPyddLFxuICAgICAgICBXb3JsZC5TaHVmZmxlSG91c2VzLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzLCAnPyddLFxuICAgICAgICBbV29ybGQuU2h1ZmZsZUdvYUZsb29ycywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVNwcml0ZUNvbG9ycywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVRyYWRlcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLCAnPyddLFxuICAgICAgXSk7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBGbGFnU2VjdGlvbiB7XG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlOiBGbGFnU2VjdGlvbjtcbiAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgc2VjdGlvbnMgPSBuZXcgU2V0PEZsYWdTZWN0aW9uPigpO1xuXG4gIHN0YXRpYyBhbGwoKTogRmxhZ1NlY3Rpb25bXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLnNlY3Rpb25zXTtcbiAgfVxuXG4gIHByb3RlY3RlZCBzdGF0aWMgZmxhZyhuYW1lOiBzdHJpbmcsIG9wdHM6IGFueSk6IEZsYWcge1xuICAgIEZsYWdTZWN0aW9uLnNlY3Rpb25zLmFkZChcbiAgICAgICAgdGhpcy5pbnN0YW5jZSB8fCAodGhpcy5pbnN0YW5jZSA9IG5ldyAodGhpcyBhcyBhbnkpKCkpKTtcbiAgICBjb25zdCBmbGFnID0gbmV3IEZsYWcobmFtZSwgb3B0cyk7XG4gICAgaWYgKCFuYW1lLnN0YXJ0c1dpdGgodGhpcy5pbnN0YW5jZS5wcmVmaXgpKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCBmbGFnICR7bmFtZX0gJHtvcHRzfWApO1xuICAgIHRoaXMuaW5zdGFuY2UuZmxhZ3Muc2V0KG5hbWUsIGZsYWcpO1xuICAgIHJldHVybiBmbGFnO1xuICB9XG5cbiAgYWJzdHJhY3QgcmVhZG9ubHkgcHJlZml4OiBzdHJpbmc7XG4gIGFic3RyYWN0IHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gIHJlYWRvbmx5IGZsYWdzID0gbmV3IE1hcDxzdHJpbmcsIEZsYWc+KCk7XG59XG5cbmNsYXNzIFdvcmxkIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnVyc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnV29ybGQnO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVNYXBzID0gV29ybGQuZmxhZygnV20nLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBtYXBzJyxcbiAgICB0ZXh0OiBgSW5kaXZpZHVhbCBtYXBzIGFyZSByYW5kb21pemVkLiAgRm9yIG5vdyB0aGlzIGlzIG9ubHkgYSBzdWJzZXQgb2ZcbiAgICAgICAgICAgcG9zc2libGUgbWFwcy4gIEEgcmFuZG9taXplZCBtYXAgd2lsbCBoYXZlIGFsbCB0aGUgc2FtZSBmZWF0dXJlc1xuICAgICAgICAgICAoZXhpdHMsIGNoZXN0cywgTlBDcywgZXRjKSBleGNlcHQgdGhpbmdzIGFyZSBtb3ZlZCBhcm91bmQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU2h1ZmZsZUFyZWFzID0gV29ybGQuZmxhZygnV2EnLCB7XG4gICAgbmFtZTogJ1NodWZmbGUgYXJlYXMnLFxuICAgIHRleHQ6IGBTaHVmZmxlcyBzb21lIG9yIGFsbCBhcmVhIGNvbm5lY3Rpb25zLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNodWZmbGVIb3VzZXMgPSBXb3JsZC5mbGFnKCdXaCcsIHtcbiAgICBuYW1lOiAnU2h1ZmZsZSBob3VzZSBlbnRyYW5jZXMnLFxuICAgIHRleHQ6IGBTaHVmZmxlcyBhbGwgdGhlIGhvdXNlIGVudHJhbmNlcywgYXMgd2VsbCBhcyBhIGhhbmRmdWwgb2Ygb3RoZXJcbiAgICAgICAgICAgdGhpbmdzLCBsaWtlIHRoZSBwYWxhY2UvZm9ydHJlc3MtdHlwZSBlbnRyYW5jZXMgYXQgdGhlIHRvcCBvZlxuICAgICAgICAgICBzZXZlcmFsIHRvd25zLCBhbmQgc3RhbmRhbG9uZSBob3VzZXMuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplVHJhZGVzID0gV29ybGQuZmxhZygnV3QnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSB0cmFkZS1pbiBpdGVtcycsXG4gICAgdGV4dDogYEl0ZW1zIGV4cGVjdGVkIGJ5IHZhcmlvdXMgTlBDcyB3aWxsIGJlIHNodWZmbGVkOiBzcGVjaWZpY2FsbHksXG4gICAgICAgICAgIFN0YXR1ZSBvZiBPbnl4LCBLaXJpc2EgUGxhbnQsIExvdmUgUGVuZGFudCwgSXZvcnkgU3RhdHVlLCBGb2dcbiAgICAgICAgICAgTGFtcCwgYW5kIEZsdXRlIG9mIExpbWUgKGZvciBBa2FoYW5hKS4gIFJhZ2Ugd2lsbCBleHBlY3QgYVxuICAgICAgICAgICByYW5kb20gc3dvcmQsIGFuZCBUb3JuZWwgd2lsbCBleHBlY3QgYSByYW5kb20gYnJhY2VsZXQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVW5pZGVudGlmaWVkS2V5SXRlbXMgPSBXb3JsZC5mbGFnKCdXdScsIHtcbiAgICBuYW1lOiAnVW5pZGVudGlmaWVkIGtleSBpdGVtcycsXG4gICAgdGV4dDogYEl0ZW0gbmFtZXMgd2lsbCBiZSBnZW5lcmljIGFuZCBlZmZlY3RzIHdpbGwgYmUgc2h1ZmZsZWQuICBUaGlzXG4gICAgICAgICAgIGluY2x1ZGVzIGtleXMsIGZsdXRlcywgbGFtcHMsIGFuZCBzdGF0dWVzLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVdhbGxFbGVtZW50cyA9IFdvcmxkLmZsYWcoJ1dlJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgZWxlbWVudHMgdG8gYnJlYWsgd2FsbHMnLFxuICAgIHRleHQ6IGBXYWxscyB3aWxsIHJlcXVpcmUgYSByYW5kb21pemVkIGVsZW1lbnQgdG8gYnJlYWsuICBOb3JtYWwgcm9jayBhbmRcbiAgICAgICAgICAgaWNlIHdhbGxzIHdpbGwgaW5kaWNhdGUgdGhlIHJlcXVpcmVkIGVsZW1lbnQgYnkgdGhlIGNvbG9yIChsaWdodFxuICAgICAgICAgICBncmV5IG9yIHllbGxvdyBmb3Igd2luZCwgYmx1ZSBmb3IgZmlyZSwgYnJpZ2h0IG9yYW5nZSAoXCJlbWJlcnNcIikgZm9yXG4gICAgICAgICAgIHdhdGVyLCBvciBkYXJrIGdyZXkgKFwic3RlZWxcIikgZm9yIHRodW5kZXIuICBUaGUgZWxlbWVudCB0byBicmVha1xuICAgICAgICAgICB0aGVzZSB3YWxscyBpcyB0aGUgc2FtZSB0aHJvdWdob3V0IGFuIGFyZWEuICBJcm9uIHdhbGxzIHJlcXVpcmUgYVxuICAgICAgICAgICBvbmUtb2ZmIHJhbmRvbSBlbGVtZW50LCB3aXRoIG5vIHZpc3VhbCBjdWUsIGFuZCB0d28gd2FsbHMgaW4gdGhlXG4gICAgICAgICAgIHNhbWUgYXJlYSBtYXkgaGF2ZSBkaWZmZXJlbnQgcmVxdWlyZW1lbnRzLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTaHVmZmxlR29hRmxvb3JzID0gV29ybGQuZmxhZygnV2cnLCB7XG4gICAgbmFtZTogJ1NodWZmbGUgR29hIGZvcnRyZXNzIGZsb29ycycsXG4gICAgLy8gVE9ETyAtIHNodWZmbGUgdGhlIGFyZWEtdG8tYm9zcyBjb25uZWN0aW9ucywgdG9vLlxuICAgIHRleHQ6IGBUaGUgZm91ciBhcmVhcyBvZiBHb2EgZm9ydHJlc3Mgd2lsbCBhcHBlYXIgaW4gYSByYW5kb20gb3JkZXIuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVNwcml0ZUNvbG9ycyA9IFdvcmxkLmZsYWcoJ1dzJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgc3ByaXRlIGNvbG9ycycsXG4gICAgdGV4dDogYE1vbnN0ZXJzIGFuZCBOUENzIHdpbGwgaGF2ZSBkaWZmZXJlbnQgY29sb3JzLiAgVGhpcyBpcyBub3QgYW5cbiAgICAgICAgICAgb3B0aW9uYWwgZmxhZyBiZWNhdXNlIGl0IGFmZmVjdHMgd2hhdCBtb25zdGVycyBjYW4gYmUgZ3JvdXBlZFxuICAgICAgICAgICB0b2dldGhlci5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplV2lsZFdhcnAgPSBXb3JsZC5mbGFnKCdXdycsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIHdpbGQgd2FycCcsXG4gICAgdGV4dDogYFdpbGQgd2FycCB3aWxsIGdvIHRvIE1lemFtZSBTaHJpbmUgYW5kIDE1IG90aGVyIHJhbmRvbSBsb2NhdGlvbnMuXG4gICAgICAgICAgIFRoZXNlIGxvY2F0aW9ucyB3aWxsIGJlIGNvbnNpZGVyZWQgaW4tbG9naWMuYCxcbiAgICBleGNsdWRlczogWydWdyddLFxuICB9KTtcbn1cblxuY2xhc3MgUm91dGluZyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1InO1xuICByZWFkb25seSBuYW1lID0gJ1JvdXRpbmcnO1xuXG4gIHN0YXRpYyByZWFkb25seSBTdG9yeU1vZGUgPSBSb3V0aW5nLmZsYWcoJ1JzJywge1xuICAgIG5hbWU6ICdTdG9yeSBNb2RlJyxcbiAgICB0ZXh0OiBgRHJheWdvbiAyIHdvbid0IHNwYXduIHVubGVzcyB5b3UgaGF2ZSBhbGwgZm91ciBzd29yZHMgYW5kIGhhdmVcbiAgICAgICAgICAgZGVmZWF0ZWQgYWxsIG1ham9yIGJvc3NlcyBvZiB0aGUgdGV0cmFyY2h5LmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb0Jvd01vZGUgPSBSb3V0aW5nLmZsYWcoJ1JiJywge1xuICAgIG5hbWU6ICdObyBCb3cgbW9kZScsXG4gICAgdGV4dDogYE5vIGl0ZW1zIGFyZSByZXF1aXJlZCB0byBmaW5pc2ggdGhlIGdhbWUuICBBbiBleGl0IGlzIGFkZGVkIGZyb21cbiAgICAgICAgICAgTWV6YW1lIHNocmluZSBkaXJlY3RseSB0byB0aGUgRHJheWdvbiAyIGZpZ2h0IChhbmQgdGhlIG5vcm1hbCBlbnRyYW5jZVxuICAgICAgICAgICBpcyByZW1vdmVkKS4gIERyYXlnb24gMiBzcGF3bnMgYXV0b21hdGljYWxseSB3aXRoIG5vIEJvdyBvZiBUcnV0aC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgT3Jic05vdFJlcXVpcmVkID0gUm91dGluZy5mbGFnKCdSbycsIHtcbiAgICBuYW1lOiAnT3JicyBub3QgcmVxdWlyZWQgdG8gYnJlYWsgd2FsbHMnLFxuICAgIHRleHQ6IGBXYWxscyBjYW4gYmUgYnJva2VuIGFuZCBicmlkZ2VzIGZvcm1lZCB3aXRoIGxldmVsIDEgc2hvdHMuYFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9UaHVuZGVyU3dvcmRXYXJwID0gUm91dGluZy5mbGFnKCdSdCcsIHtcbiAgICBuYW1lOiAnTm8gU3dvcmQgb2YgVGh1bmRlciB3YXJwJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHkgd2hlbiBhY3F1aXJpbmcgdGhlIHRodW5kZXIgc3dvcmQsIHRoZSBwbGF5ZXIgaXMgaW5zdGFudGx5XG4gICAgICAgICAgIHdhcnBlZCB0byBhIHJhbmRvbSB0b3duLiAgVGhpcyBmbGFnIGRpc2FibGVzIHRoZSB3YXJwLiAgSWYgc2V0IGFzXG4gICAgICAgICAgIFwiUiF0XCIsIHRoZW4gdGhlIHdhcnAgd2lsbCBhbHdheXMgZ28gdG8gU2h5cm9uLCBsaWtlIGluIHZhbmlsbGEuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVmFuaWxsYURvbHBoaW4gPSBSb3V0aW5nLmZsYWcoJ1JkJywge1xuICAgIG5hbWU6ICdWYW5pbGxhIERvbHBoaW4gaW50ZXJhY3Rpb25zJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgdGhlIHJhbmRvbWl6ZXIgY2hhbmdlcyBhIG51bWJlciBvZiBkb2xwaGluIGFuZCBib2F0XG4gICAgICAgICAgIGludGVyYWN0aW9uczogKDEpIGhlYWxpbmcgdGhlIGRvbHBoaW4gYW5kIGhhdmluZyB0aGUgU2hlbGwgRmx1dGVcbiAgICAgICAgICAgaXMgbm8gbG9uZ2VyIHJlcXVpcmVkIGJlZm9yZSB0aGUgZmlzaGVybWFuIHNwYXduczogaW5zdGVhZCwgaGVcbiAgICAgICAgICAgd2lsbCBzcGF3biBhcyBzb29uIGFzIHlvdSBoYXZlIHRoZSBpdGVtIGhlIHdhbnRzOyAoMikgdGFsa2luZyB0b1xuICAgICAgICAgICBLZW5zdSBpbiB0aGUgYmVhY2ggY2FiaW4gaXMgbm8gbG9uZ2VyIHJlcXVpcmVkIGZvciB0aGUgU2hlbGwgRmx1dGVcbiAgICAgICAgICAgdG8gd29yazogaW5zdGVhZCwgdGhlIFNoZWxsIEZsdXRlIHdpbGwgYWx3YXlzIHdvcmssIGFuZCBLZW5zdSB3aWxsXG4gICAgICAgICAgIHNwYXduIGFmdGVyIHRoZSBGb2cgTGFtcCBpcyB0dXJuZWQgaW4gYW5kIHdpbGwgZ2l2ZSBhIGtleSBpdGVtXG4gICAgICAgICAgIGNoZWNrLiAgVGhpcyBmbGFnIHJlc3RvcmVzIHRoZSB2YW5pbGxhIGludGVyYWN0aW9uIHdoZXJlIGhlYWxpbmdcbiAgICAgICAgICAgYW5kIHNoZWxsIGZsdXRlIGFyZSByZXF1aXJlZCwgYW5kIEtlbnN1IG5vIGxvbmdlciBkcm9wcyBhbiBpdGVtLmAsXG4gIH0pO1xufVxuXG5jbGFzcyBHbGl0Y2hlcyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0cnO1xuICByZWFkb25seSBuYW1lID0gJ0dsaXRjaGVzJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBCeSBkZWZhdWx0LCB0aGUgcmFuZG9taXplciBkaXNhYmxlcyBhbGwga25vd24gZ2xpdGNoZXMgKGV4Y2VwdCBnaGV0dG9cbiAgICAgIGZsaWdodCkuICBUaGVzZSBmbGFncyBzZWxlY3RpdmVseSByZS1lbmFibGUgY2VydGFpbiBnbGl0Y2hlcy4gIE1vc3Qgb2ZcbiAgICAgIHRoZXNlIGZsYWdzIGhhdmUgdHdvIG1vZGVzOiBub3JtYWxseSBlbmFibGluZyBhIGdsaXRjaCB3aWxsIGFkZCBpdCBhc1xuICAgICAgcG9zc2libHkgcmVxdWlyZWQgYnkgbG9naWMsIGJ1dCBjbGlja2luZyBhIHNlY29uZCB0aW1lIHdpbGwgYWRkIGEgJyEnXG4gICAgICBhbmQgZW5hYmxlIHRoZSBnbGl0Y2ggb3V0c2lkZSBvZiBsb2dpYyAoZS5nLiBcIkchY1wiKS5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBHaGV0dG9GbGlnaHQgPSBHbGl0Y2hlcy5mbGFnKCdHZicsIHtcbiAgICBuYW1lOiAnR2hldHRvIGZsaWdodCcsXG4gICAgdGV4dDogYEdoZXR0byBmbGlnaHQgYWxsb3dzIHVzaW5nIERvbHBoaW4gYW5kIFJhYmJpdCBCb290cyB0byBmbHkgdXAgdGhlXG4gICAgICAgICAgIHdhdGVyZmFsbHMgaW4gdGhlIEFuZ3J5IFNlYSAod2l0aG91dCBjYWxtaW5nIHRoZSB3aGlybHBvb2xzKS5cbiAgICAgICAgICAgVGhpcyBpcyBkb25lIGJ5IHN3aW1taW5nIHVwIHRvIGEgZGlhZ29uYWwgYmVhY2ggYW5kIGp1bXBpbmdcbiAgICAgICAgICAgaW4gYSBkaWZmZXJlbnQgZGlyZWN0aW9uIGltbWVkaWF0ZWx5IGJlZm9yZSBkaXNlbWJhcmtpbmcuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFN0YXR1ZUdsaXRjaCA9IEdsaXRjaGVzLmZsYWcoJ0dzJywge1xuICAgIG5hbWU6ICdTdGF0dWUgZ2xpdGNoJyxcbiAgICB0ZXh0OiBgU3RhdHVlIGdsaXRjaCBhbGxvd3MgZ2V0dGluZyBiZWhpbmQgc3RhdHVlcyB0aGF0IGJsb2NrIGNlcnRhaW5cbiAgICAgICAgICAgZW50cmFuY2VzOiB0aGUgZ3VhcmRzIGluIFBvcnRvYSwgQW1hem9uZXMsIE9haywgR29hLCBhbmQgU2h5cm9uLFxuICAgICAgICAgICBhcyB3ZWxsIGFzIHRoZSBzdGF0dWVzIGluIHRoZSBXYXRlcmZhbGwgQ2F2ZS4gIEl0IGlzIGRvbmUgYnlcbiAgICAgICAgICAgYXBwcm9hY2hpbmcgdGhlIHN0YXR1ZSBmcm9tIHRoZSB0b3AgcmlnaHQgYW5kIGhvbGRpbmcgZG93biBhbmRcbiAgICAgICAgICAgbGVmdCBvbiB0aGUgY29udHJvbGxlciB3aGlsZSBtYXNoaW5nIEIuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTXRTYWJyZVJlcXVpcmVtZW50U2tpcCA9IEdsaXRjaGVzLmZsYWcoJ0duJywge1xuICAgIG5hbWU6ICdNdCBTYWJyZSByZXF1aXJlbWVudHMgc2tpcCcsXG4gICAgdGV4dDogYEVudGVyaW5nIE10IFNhYnJlIE5vcnRoIG5vcm1hbGx5IHJlcXVpcmVzICgxKSBoYXZpbmcgVGVsZXBvcnQsXG4gICAgICAgICAgIGFuZCAoMikgdGFsa2luZyB0byB0aGUgcmFiYml0IGluIExlYWYgYWZ0ZXIgdGhlIGFiZHVjdGlvbiAodmlhXG4gICAgICAgICAgIFRlbGVwYXRoeSkuICBCb3RoIG9mIHRoZXNlIHJlcXVpcmVtZW50cyBjYW4gYmUgc2tpcHBlZDogZmlyc3QgYnlcbiAgICAgICAgICAgZmx5aW5nIG92ZXIgdGhlIHJpdmVyIGluIENvcmRlbCBwbGFpbiByYXRoZXIgdGhhbiBjcm9zc2luZyB0aGVcbiAgICAgICAgICAgYnJpZGdlLCBhbmQgdGhlbiBieSB0aHJlYWRpbmcgdGhlIG5lZWRsZSBiZXR3ZWVuIHRoZSBoaXRib3hlcyBpblxuICAgICAgICAgICBNdCBTYWJyZSBOb3J0aC5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTdGF0dWVHYXVudGxldFNraXAgPSBHbGl0Y2hlcy5mbGFnKCdHZycsIHtcbiAgICBuYW1lOiAnU3RhdHVlIGdhdW50bGV0IHNraXAnLFxuICAgIHRleHQ6IGBUaGUgc2hvb3Rpbmcgc3RhdHVlcyBpbiBmcm9udCBvZiBHb2EgYW5kIFN0eHkgbm9ybWFsbHkgcmVxdWlyZVxuICAgICAgICAgICBCYXJyaWVyIHRvIHBhc3Mgc2FmZWx5LiAgV2l0aCB0aGlzIGZsYWcsIEZsaWdodCBjYW4gYWxzbyBiZSB1c2VkXG4gICAgICAgICAgIGJ5IGZseWluZyBhcm91bmQgdGhlIGVkZ2Ugb2YgdGhlIHN0YXR1ZS5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTd29yZENoYXJnZUdsaXRjaCA9IEdsaXRjaGVzLmZsYWcoJ0djJywge1xuICAgIG5hbWU6ICdTd29yZCBjaGFyZ2UgZ2xpdGNoJyxcbiAgICB0ZXh0OiBgU3dvcmQgY2hhcmdlIGdsaXRjaCBhbGxvd3MgY2hhcmdpbmcgb25lIHN3b3JkIHRvIHRoZSBsZXZlbCBvZlxuICAgICAgICAgICBhbm90aGVyIHN3b3JkIGJ5IGVxdWlwcGluZyB0aGUgaGlnaGVyLWxldmVsIHN3b3JkLCByZS1lbnRlcmluZ1xuICAgICAgICAgICB0aGUgbWVudSwgY2hhbmdpbmcgdG8gdGhlIGxvd2VyLWxldmVsIHN3b3JkIHdpdGhvdXQgZXhpdGluZyB0aGVcbiAgICAgICAgICAgbWVudSwgY3JlYXRpbmcgYSBoYXJkIHNhdmUsIHJlc2V0dGluZywgYW5kIHRoZW4gY29udGludWluZy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFRyaWdnZXJTa2lwID0gR2xpdGNoZXMuZmxhZygnR3QnLCB7XG4gICAgbmFtZTogJ1RyaWdnZXIgc2tpcCcsXG4gICAgdGV4dDogYEEgd2lkZSB2YXJpZXR5IG9mIHRyaWdnZXJzIGFuZCBleGl0IHNxdWFyZXMgY2FuIGJlIHNraXBwZWQgYnlcbiAgICAgICAgICAgdXNpbmcgYW4gaW52YWxpZCBpdGVtIGV2ZXJ5IGZyYW1lIHdoaWxlIHdhbGtpbmcuICBUaGlzIGFsbG93c1xuICAgICAgICAgICBieXBhc3NpbmcgYm90aCBNdCBTYWJyZSBOb3J0aCBlbnRyYW5jZSB0cmlnZ2VycywgdGhlIEV2aWwgU3Bpcml0XG4gICAgICAgICAgIElzbGFuZCBlbnRyYW5jZSB0cmlnZ2VyLCB0cmlnZ2VycyBmb3IgZ3VhcmRzIHRvIG1vdmUsIHNsb3BlcyxcbiAgICAgICAgICAgZGFtYWdlIHRpbGVzLCBhbmQgc2VhbWxlc3MgbWFwIHRyYW5zaXRpb25zLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFnZVNraXAgPSBHbGl0Y2hlcy5mbGFnKCdHcicsIHtcbiAgICBuYW1lOiAnUmFnZSBza2lwJyxcbiAgICB0ZXh0OiBgUmFnZSBjYW4gYmUgc2tpcHBlZCBieSBkYW1hZ2UtYm9vc3RpbmcgZGlhZ29uYWxseSBpbnRvIHRoZSBMaW1lXG4gICAgICAgICAgIFRyZWUgTGFrZSBzY3JlZW4uICBUaGlzIHByb3ZpZGVzIGFjY2VzcyB0byB0aGUgYXJlYSBiZXlvbmQgdGhlXG4gICAgICAgICAgIGxha2UgaWYgZmxpZ2h0IG9yIGJyaWRnZXMgYXJlIGF2YWlsYWJsZS4gIEZvciBzaW1wbGljaXR5LCB0aGVcbiAgICAgICAgICAgbG9naWMgb25seSBhc3N1bWVzIHRoaXMgaXMgcG9zc2libGUgaWYgdGhlcmUncyBhIGZseWVyLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcbn1cblxuY2xhc3MgQWVzdGhldGljcyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0EnO1xuICByZWFkb25seSBuYW1lID0gJ0Flc3RoZXRpY3MnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZXNlIGZsYWdzIGRvbid0IGRpcmVjdGx5IGFmZmVjdCBnYW1lcGxheSBvciBzaHVmZmxpbmcsIGJ1dCB0aGV5IGRvXG4gICAgICBhZmZlY3QgdGhlIGV4cGVyaWVuY2Ugc2lnbmlmaWNhbnRseSBlbm91Z2ggdGhhdCB0aGVyZSBhcmUgdGhyZWUgbW9kZXNcbiAgICAgIGZvciBlYWNoOiBcIm9mZlwiLCBcIm9wdGlvbmFsXCIgKG5vIGV4Y2xhbWF0aW9uIHBvaW50KSwgYW5kIFwicmVxdWlyZWRcIlxuICAgICAgKGV4Y2xhbWF0aW9uIHBvaW50KS4gIFRoZSBmaXJzdCB0d28gYXJlIGVxdWl2YWxlbnQgZm9yIHNlZWQgZ2VuZXJhdGlvblxuICAgICAgcHVycG9zZXMsIHNvIHRoYXQgeW91IGNhbiBwbGF5IHRoZSBzYW1lIHNlZWQgd2l0aCBlaXRoZXIgc2V0dGluZy5cbiAgICAgIFNldHRpbmcgaXQgdG8gXCIhXCIgd2lsbCBjaGFuZ2UgdGhlIHNlZWQuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplTXVzaWMgPSBBZXN0aGV0aWNzLmZsYWcoJ0FtJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgYmFja2dyb3VuZCBtdXNpYycsXG4gICAgbW9kZXM6ICchJyxcbiAgICBvcHRpb25hbDogTk9fQkFORyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vTXVzaWMgPSBBZXN0aGV0aWNzLmZsYWcoJ0FzJywge1xuICAgIG5hbWU6ICdObyBiYWNrZ3JvdW5kIG11c2ljJyxcbiAgICBvcHRpb25hbDogT1BUSU9OQUwsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVNYXBDb2xvcnMgPSBBZXN0aGV0aWNzLmZsYWcoJ0FjJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgbWFwIGNvbG9ycycsXG4gICAgbW9kZXM6ICchJyxcbiAgICBvcHRpb25hbDogTk9fQkFORyxcbiAgfSk7XG59XG5cbmNsYXNzIE1vbnN0ZXJzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnTSc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnTW9uc3RlcnMnO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVXZWFrbmVzc2VzID0gTW9uc3RlcnMuZmxhZygnTWUnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBtb25zdGVyIHdlYWtuZXNzZXMnLFxuICAgIHRleHQ6IGBNb25zdGVyIGFuZCBib3NzIGVsZW1lbnRhbCB3ZWFrbmVzc2VzIGFyZSBzaHVmZmxlZC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVG93ZXJSb2JvdHMgPSBNb25zdGVycy5mbGFnKCdNdCcsIHtcbiAgICBuYW1lOiAnU2h1ZmZsZSB0b3dlciByb2JvdHMnLFxuICAgIHRleHQ6IGBUb3dlciByb2JvdHMgd2lsbCBiZSBzaHVmZmxlZCBpbnRvIHRoZSBub3JtYWwgcG9vbC4gIEF0IHNvbWVcbiAgICAgICAgICAgcG9pbnQsIG5vcm1hbCBtb25zdGVycyBtYXkgYmUgc2h1ZmZsZWQgaW50byB0aGUgdG93ZXIgYXMgd2VsbC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xufVxuXG5jbGFzcyBFYXN5TW9kZSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0UnO1xuICByZWFkb25seSBuYW1lID0gJ0Vhc3kgTW9kZSc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlIGZvbGxvd2luZyBvcHRpb25zIG1ha2UgcGFydHMgb2YgdGhlIGdhbWUgZWFzaWVyLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vU2h1ZmZsZU1pbWljcyA9IEVhc3lNb2RlLmZsYWcoJ0V0Jywge1xuICAgIG5hbWU6IGBEb24ndCBzaHVmZmxlIG1pbWljcy5gLFxuICAgIHRleHQ6IGBNaW1pY3Mgd2lsbCBiZSBpbiB0aGVpciB2YW5pbGxhIGxvY2F0aW9ucy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUHJlc2VydmVVbmlxdWVDaGVja3MgPSBFYXN5TW9kZS5mbGFnKCdFdScsIHtcbiAgICBuYW1lOiAnS2VlcCB1bmlxdWUgaXRlbXMgYW5kIGNvbnN1bWFibGVzIHNlcGFyYXRlJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHkgYWxsIGl0ZW1zIGFuZCBtaW1pY3MgYXJlIHNodWZmbGVkIGludG8gYSBzaW5nbGUgcG9vbCBhbmRcbiAgICAgICAgICAgZGlzdHJpYnV0ZWQgZnJvbSB0aGVyZS4gIElmIHRoaXMgZmxhZyBpcyBzZXQsIHVuaXF1ZSBpdGVtc1xuICAgICAgICAgICAoc3BlY2lmaWNhbGx5LCBhbnl0aGluZyB0aGF0IGNhbm5vdCBiZSBzb2xkKSB3aWxsIG9ubHkgYmUgZm91bmQgaW5cbiAgICAgICAgICAgZWl0aGVyIChhKSBjaGVja3MgdGhhdCBoZWxkIHVuaXF1ZSBpdGVtcyBpbiB2YW5pbGxhLCBvciAoYikgYm9zc1xuICAgICAgICAgICBkcm9wcy4gIENoZXN0cyBjb250YWluaW5nIGNvbnN1bWFibGVzIGluIHZhbmlsbGEgbWF5IGJlIHNhZmVseVxuICAgICAgICAgICBpZ25vcmVkLCBidXQgY2hlc3RzIGNvbnRhaW5pbmcgdW5pcXVlIGl0ZW1zIGluIHZhbmlsbGEgbWF5IHN0aWxsXG4gICAgICAgICAgIGVuZCB1cCB3aXRoIG5vbi11bmlxdWUgaXRlbXMgYmVjYXVzZSBvZiBib3NzZXMgbGlrZSBWYW1waXJlIDIgdGhhdFxuICAgICAgICAgICBkcm9wIGNvbnN1bWFibGVzLiAgSWYgbWltaWNzIGFyZSBzaHVmZmxlZCwgdGhleSB3aWxsIG9ubHkgYmUgaW5cbiAgICAgICAgICAgY29uc3VtYWJsZSBsb2NhdGlvbnMuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IERlY3JlYXNlRW5lbXlEYW1hZ2UgPSBFYXN5TW9kZS5mbGFnKCdFZCcsIHtcbiAgICBuYW1lOiAnRGVjcmVhc2UgZW5lbXkgZGFtYWdlJyxcbiAgICB0ZXh0OiBgRW5lbXkgYXR0YWNrIHBvd2VyIHdpbGwgYmUgc2lnbmlmaWNhbnRseSBkZWNyZWFzZWQgaW4gdGhlIGVhcmx5IGdhbWVcbiAgICAgICAgICAgKGJ5IGEgZmFjdG9yIG9mIDMpLiAgVGhlIGdhcCB3aWxsIG5hcnJvdyBpbiB0aGUgbWlkLWdhbWUgYW5kIGV2ZW50dWFsbHlcbiAgICAgICAgICAgcGhhc2Ugb3V0IGF0IHNjYWxpbmcgbGV2ZWwgNDAuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQgPSBFYXN5TW9kZS5mbGFnKCdFcycsIHtcbiAgICBuYW1lOiAnR3VhcmFudGVlIHN0YXJ0aW5nIHN3b3JkJyxcbiAgICB0ZXh0OiBgVGhlIExlYWYgZWxkZXIgaXMgZ3VhcmFudGVlZCB0byBnaXZlIGEgc3dvcmQuICBJdCB3aWxsIG5vdCBiZVxuICAgICAgICAgICByZXF1aXJlZCB0byBkZWFsIHdpdGggYW55IGVuZW1pZXMgYmVmb3JlIGZpbmRpbmcgdGhlIGZpcnN0IHN3b3JkLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBHdWFyYW50ZWVSZWZyZXNoID0gRWFzeU1vZGUuZmxhZygnRXInLCB7XG4gICAgbmFtZTogJ0d1YXJhbnRlZSByZWZyZXNoJyxcbiAgICB0ZXh0OiBgR3VhcmFudGVlcyB0aGUgUmVmcmVzaCBzcGVsbCB3aWxsIGJlIGF2YWlsYWJsZSBiZWZvcmUgZmlnaHRpbmdcbiAgICAgICAgICAgVGV0cmFyY2hzLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBFeHBlcmllbmNlU2NhbGVzRmFzdGVyID0gRWFzeU1vZGUuZmxhZygnRXgnLCB7XG4gICAgbmFtZTogJ0V4cGVyaWVuY2Ugc2NhbGVzIGZhc3RlcicsXG4gICAgdGV4dDogYExlc3MgZ3JpbmRpbmcgd2lsbCBiZSByZXF1aXJlZCB0byBcImtlZXAgdXBcIiB3aXRoIHRoZSBnYW1lIGRpZmZpY3VsdHkuYCxcbiAgICBleGNsdWRlczogWydIeCddLFxuICB9KTtcbn1cblxuY2xhc3MgTm9HdWFyYW50ZWVzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnTic7XG4gIHJlYWRvbmx5IG5hbWUgPSAnTm8gZ3VhcmFudGVlcyc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgUmVtb3ZlcyB2YXJpb3VzIGd1YXJhbnRlZXMgZnJvbSB0aGUgbG9naWMuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgQmF0dGxlTWFnaWMgPSBOb0d1YXJhbnRlZXMuZmxhZygnTncnLCB7XG4gICAgbmFtZTogJ0JhdHRsZSBtYWdpYyBub3QgZ3VhcmFudGVlZCcsXG4gICAgdGV4dDogYE5vcm1hbGx5LCB0aGUgbG9naWMgd2lsbCBndWFyYW50ZWUgdGhhdCBsZXZlbCAzIHN3b3JkIGNoYXJnZXMgYXJlXG4gICAgICAgICAgIGF2YWlsYWJsZSBiZWZvcmUgZmlnaHRpbmcgdGhlIHRldHJhcmNocyAod2l0aCB0aGUgZXhjZXB0aW9uIG9mIEthcm1pbmUsXG4gICAgICAgICAgIHdobyBvbmx5IHJlcXVpcmVzIGxldmVsIDIpLiAgVGhpcyBkaXNhYmxlcyB0aGF0IGNoZWNrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE1hdGNoaW5nU3dvcmQgPSBOb0d1YXJhbnRlZXMuZmxhZygnTnMnLCB7XG4gICAgbmFtZTogJ01hdGNoaW5nIHN3b3JkIG5vdCBndWFyYW50ZWVkIChcIlRpbmsgTW9kZVwiKScsXG4gICAgdGV4dDogYEVuYWJsZXMgXCJ0aW5rIHN0cmF0c1wiLCB3aGVyZSB3cm9uZy1lbGVtZW50IHN3b3JkcyB3aWxsIHN0aWxsIGRvIGFcbiAgICAgICAgICAgc2luZ2xlIGRhbWFnZSBwZXIgaGl0LiAgUGxheWVyIG1heSBiZSByZXF1aXJlZCB0byBmaWdodCBtb25zdGVyc1xuICAgICAgICAgICAoaW5jbHVkaW5nIGJvc3Nlcykgd2l0aCB0aW5rcy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBCYXJyaWVyID0gTm9HdWFyYW50ZWVzLmZsYWcoJ05iJywge1xuICAgIG5hbWU6ICdCYXJyaWVyIG5vdCBndWFyYW50ZWVkJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHksIHRoZSBsb2dpYyB3aWxsIGd1YXJhbnRlZSBCYXJyaWVyIChvciBlbHNlIHJlZnJlc2ggYW5kIHNoaWVsZFxuICAgICAgICAgICByaW5nKSBiZWZvcmUgZW50ZXJpbmcgU3R4eSwgdGhlIEZvcnRyZXNzLCBvciBmaWdodGluZyBLYXJtaW5lLiAgVGhpc1xuICAgICAgICAgICBkaXNhYmxlcyB0aGF0IGNoZWNrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEdhc01hc2sgPSBOb0d1YXJhbnRlZXMuZmxhZygnTmcnLCB7XG4gICAgbmFtZTogJ0dhcyBtYXNrIG5vdCBndWFyYW50ZWVkJyxcbiAgICB0ZXh0OiBgVGhlIGxvZ2ljIHdpbGwgbm90IGd1YXJhbnRlZSBnYXMgbWFzayBiZWZvcmUgbmVlZGluZyB0byBlbnRlciB0aGUgc3dhbXAsXG4gICAgICAgICAgIG5vciB3aWxsIGxlYXRoZXIgYm9vdHMgKG9yIGhhem1hdCBzdWl0KSBiZSBndWFyYW50ZWVkIHRvIGNyb3NzIGxvbmdcbiAgICAgICAgICAgc3RyZXRjaGVzIG9mIHNwaWtlcy4gIEdhcyBtYXNrIGlzIHN0aWxsIGd1YXJhbnRlZWQgdG8ga2lsbCB0aGUgaW5zZWN0LmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG59XG5cbmNsYXNzIEhhcmRNb2RlIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnSCc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnSGFyZCBtb2RlJztcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9CdWZmTWVkaWNhbEhlcmIgPSBIYXJkTW9kZS5mbGFnKCdIbScsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYnVmZiBtZWRpY2FsIGhlcmIgb3IgZnJ1aXQgb2YgcG93ZXJgLFxuICAgIHRleHQ6IGBNZWRpY2FsIEhlcmIgaXMgbm90IGJ1ZmZlZCB0byBoZWFsIDgwIGRhbWFnZSwgd2hpY2ggaXMgaGVscGZ1bCB0byBtYWtlXG4gICAgICAgICAgIHVwIGZvciBjYXNlcyB3aGVyZSBSZWZyZXNoIGlzIHVuYXZhaWxhYmxlIGVhcmx5LiAgRnJ1aXQgb2YgUG93ZXIgaXMgbm90XG4gICAgICAgICAgIGJ1ZmZlZCB0byByZXN0b3JlIDU2IE1QLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE1heFNjYWxpbmdJblRvd2VyID0gSGFyZE1vZGUuZmxhZygnSHQnLCB7XG4gICAgbmFtZTogJ01heCBzY2FsaW5nIGxldmVsIGluIHRvd2VyJyxcbiAgICB0ZXh0OiBgRW5lbWllcyBpbiB0aGUgdG93ZXIgc3Bhd24gYXQgbWF4IHNjYWxpbmcgbGV2ZWwuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgRXhwZXJpZW5jZVNjYWxlc1Nsb3dlciA9IEhhcmRNb2RlLmZsYWcoJ0h4Jywge1xuICAgIG5hbWU6ICdFeHBlcmllbmNlIHNjYWxlcyBzbG93ZXInLFxuICAgIHRleHQ6IGBNb3JlIGdyaW5kaW5nIHdpbGwgYmUgcmVxdWlyZWQgdG8gXCJrZWVwIHVwXCIgd2l0aCB0aGUgZGlmZmljdWx0eS5gLFxuICAgIGV4Y2x1ZGVzOiBbJ0V4J10sXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IENoYXJnZVNob3RzT25seSA9IEhhcmRNb2RlLmZsYWcoJ0hjJywge1xuICAgIG5hbWU6ICdDaGFyZ2Ugc2hvdHMgb25seScsXG4gICAgdGV4dDogYFN0YWJiaW5nIGlzIGNvbXBsZXRlbHkgaW5lZmZlY3RpdmUuICBPbmx5IGNoYXJnZWQgc2hvdHMgd29yay5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBCbGFja291dCA9IEhhcmRNb2RlLmZsYWcoJ0h6Jywge1xuICAgIG5hbWU6ICdCbGFja291dCcsXG4gICAgdGV4dDogYEFsbCBjYXZlcyBhbmQgZm9ydHJlc3NlcyBhcmUgcGVybWFuZW50bHkgZGFyay5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBQZXJtYWRlYXRoID0gSGFyZE1vZGUuZmxhZygnSGgnLCB7XG4gICAgbmFtZTogJ1Blcm1hZGVhdGgnLFxuICAgIHRleHQ6IGBIYXJkY29yZSBtb2RlOiBjaGVja3BvaW50cyBhbmQgc2F2ZXMgYXJlIHJlbW92ZWQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcbn1cblxuY2xhc3MgVmFuaWxsYSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgbmFtZSA9ICdWYW5pbGxhJztcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1YnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIE9wdGlvbnMgdG8gcmVzdG9yZSB2YW5pbGxhIGJlaGF2aW9yIGNoYW5nZWQgYnkgZGVmYXVsdC5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBEeW5hID0gVmFuaWxsYS5mbGFnKCdWZCcsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYnVmZiBEeW5hYCxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgd2UgbWFrZXMgdGhlIER5bmEgZmlnaHQgYSBiaXQgbW9yZSBvZiBhIGNoYWxsZW5nZS5cbiAgICAgICAgICAgU2lkZSBwb2RzIHdpbGwgZmlyZSBzaWduaWZpY2FudGx5IG1vcmUuICBUaGUgc2FmZSBzcG90IGhhcyBiZWVuXG4gICAgICAgICAgIHJlbW92ZWQuICBUaGUgcmV2ZW5nZSBiZWFtcyBwYXNzIHRocm91Z2ggYmFycmllci4gIFNpZGUgcG9kcyBjYW5cbiAgICAgICAgICAgbm93IGJlIGtpbGxlZC4gIFRoaXMgZmxhZyBwcmV2ZW50cyB0aGF0IGNoYW5nZS5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgQm9udXNJdGVtcyA9IFZhbmlsbGEuZmxhZygnVmInLCB7XG4gICAgbmFtZTogYERvbid0IGJ1ZmYgYm9udXMgaXRlbXNgLFxuICAgIHRleHQ6IGBMZWF0aGVyIEJvb3RzIGFyZSBjaGFuZ2VkIHRvIFNwZWVkIEJvb3RzLCB3aGljaCBpbmNyZWFzZSBwbGF5ZXIgd2Fsa2luZ1xuICAgICAgICAgICBzcGVlZCAodGhpcyBhbGxvd3MgY2xpbWJpbmcgdXAgdGhlIHNsb3BlIHRvIGFjY2VzcyB0aGUgVG9ybmFkbyBCcmFjZWxldFxuICAgICAgICAgICBjaGVzdCwgd2hpY2ggaXMgdGFrZW4gaW50byBjb25zaWRlcmF0aW9uIGJ5IHRoZSBsb2dpYykuICBEZW8ncyBwZW5kYW50XG4gICAgICAgICAgIHJlc3RvcmVzIE1QIHdoaWxlIG1vdmluZy4gIFJhYmJpdCBib290cyBlbmFibGUgc3dvcmQgY2hhcmdpbmcgdXAgdG9cbiAgICAgICAgICAgbGV2ZWwgMiB3aGlsZSB3YWxraW5nIChsZXZlbCAzIHN0aWxsIHJlcXVpcmVzIGJlaW5nIHN0YXRpb25hcnksIHNvIGFzXG4gICAgICAgICAgIHRvIHByZXZlbnQgd2FzdGluZyB0b25zIG9mIG1hZ2ljKS5gLFxuICB9KTtcblxuICAvLyBUT0RPIC0gaXMgaXQgd29ydGggZXZlbiBhbGxvd2luZyB0byB0dXJuIHRoaXMgb2ZmPyE/XG4gIHN0YXRpYyByZWFkb25seSBNYXBzID0gVmFuaWxsYS5mbGFnKCdWbScsIHtcbiAgICBuYW1lOiAnVmFuaWxsYSBtYXBzJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHkgdGhlIHJhbmRvbWl6ZXIgYWRkcyBhIG5ldyBcIkVhc3QgQ2F2ZVwiIHRvIFZhbGxleSBvZiBXaW5kLFxuICAgICAgICAgICBib3Jyb3dlZCBmcm9tIHRoZSBHQkMgdmVyc2lvbiBvZiB0aGUgZ2FtZS4gIFRoaXMgY2F2ZSBjb250YWlucyB0d29cbiAgICAgICAgICAgY2hlc3RzIChvbmUgY29uc2lkZXJlZCBhIGtleSBpdGVtKSBvbiB0aGUgdXBwZXIgZmxvb3IgYW5kIGV4aXRzIHRvXG4gICAgICAgICAgIHR3byByYW5kb20gYXJlYXMgKGNob3NlbiBiZXR3ZWVuIExpbWUgVHJlZSBWYWxsZXksIENvcmRlbCBQbGFpbixcbiAgICAgICAgICAgR29hIFZhbGxleSwgb3IgRGVzZXJ0IDI7IHRoZSBxdWlja3NhbmQgaXMgcmVtb3ZlZCBmcm9tIHRoZSBlbnRyYW5jZXNcbiAgICAgICAgICAgdG8gUHlyYW1pZCBhbmQgQ3J5cHQpLCBvbmUgdW5ibG9ja2VkIG9uIHRoZSBsb3dlciBmbG9vciwgYW5kIG9uZVxuICAgICAgICAgICBkb3duIHRoZSBzdGFpcnMgYW5kIGJlaGluZCBhIHJvY2sgd2FsbCBmcm9tIHRoZSB1cHBlciBmbG9vci4gIFRoaXNcbiAgICAgICAgICAgZmxhZyBwcmV2ZW50cyBhZGRpbmcgdGhhdCBjYXZlLiAgSWYgc2V0IGFzIFwiViFtXCIgdGhlbiBhIGRpcmVjdCBwYXRoXG4gICAgICAgICAgIHdpbGwgaW5zdGVhZCBiZSBhZGRlZCBiZXR3ZWVuIFZhbGxleSBvZiBXaW5kIGFuZCBMaW1lIFRyZWUgVmFsbGV5XG4gICAgICAgICAgIChhcyBpbiBlYXJsaWVyIHZlcnNpb25zIG9mIHRoZSByYW5kb21pemVyKS5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTaG9wcyA9IFZhbmlsbGEuZmxhZygnVnMnLCB7XG4gICAgbmFtZTogJ1ZhbmlsbGEgc2hvcHMnLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB3ZSBkaXNhYmxlIHNob3AgZ2xpdGNoLCBzaHVmZmxlIHNob3AgY29udGVudHMsIGFuZCB0aWVcbiAgICAgICAgICAgdGhlIHByaWNlcyB0byB0aGUgc2NhbGluZyBsZXZlbCAoaXRlbSBzaG9wcyBhbmQgaW5ucyBpbmNyZWFzZSBieSBhXG4gICAgICAgICAgIGZhY3RvciBvZiAyIGV2ZXJ5IDEwIHNjYWxpbmcgbGV2ZWxzLCBhcm1vciBzaG9wcyBkZWNyZWFzZSBieSBhXG4gICAgICAgICAgIGZhY3RvciBvZiAyIGV2ZXJ5IDEyIHNjYWxpbmcgbGV2ZWxzKS4gIFRoaXMgZmxhZyBwcmV2ZW50cyBhbGwgb2ZcbiAgICAgICAgICAgdGhlc2UgY2hhbmdlcywgcmVzdG9yaW5nIHNob3BzIHRvIGJlIGNvbXBsZXRlbHkgdmFuaWxsYS5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgV2lsZFdhcnAgPSBWYW5pbGxhLmZsYWcoJ1Z3Jywge1xuICAgIG5hbWU6ICdWYW5pbGxhIHdpbGQgd2FycCcsXG4gICAgdGV4dDogYEJ5IGRlZmF1bHQsIFdpbGQgV2FycCBpcyBuZXJmZWQgdG8gb25seSByZXR1cm4gdG8gTWV6YW1lIFNocmluZS5cbiAgICAgICAgICAgVGhpcyBmbGFnIHJlc3RvcmVzIGl0IHRvIHdvcmsgbGlrZSBub3JtYWwuICBOb3RlIHRoYXQgdGhpcyB3aWxsIHB1dFxuICAgICAgICAgICBhbGwgd2lsZCB3YXJwIGxvY2F0aW9ucyBpbiBsb2dpYyB1bmxlc3MgdGhlIGZsYWcgaXMgc2V0IGFzIChWIXcpLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEh1ZCA9IFZhbmlsbGEuZmxhZygnVmgnLCB7XG4gICAgbmFtZTogJ1ZhbmlsbGEgSFVEJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgdGhlIGJsdWUgc3RhdHVzIGJhciAoSFVEKSBhdCB0aGUgYm90dG9tIG9mIHRoZSBzY3JlZW5cbiAgICAgICAgICAgaXMgcmVvcmdhbml6ZWQgYSBiaXQsIGluY2x1ZGluZyBkaXNwbGF5aW5nIGVuZW1pZXMnIG5hbWVzIGFuZCBIUC5cbiAgICAgICAgICAgVGhpcyBjYW4gYmUgc2V0IGVpdGhlciBhcyBWaCAod2hpY2ggd2lsbCBvcHRpb25hbGx5IGRpc2FibGUgdGhlXG4gICAgICAgICAgIGNoYW5nZXMsIGFuZCB3aWxsIHByb2R1Y2UgdGhlIHNhbWUgc2VlZCBhcyBub3Qgc2V0dGluZyBWaCkgb3IgYXNcbiAgICAgICAgICAgViFoICh3aGljaCByZXF1aXJlcyBhbGwgcGxheWVycyB0byBkaXNhYmxlIGl0IHRvIGdldCB0aGUgc2FtZVxuICAgICAgICAgICAgc2VlZCkuYCxcbiAgICBtb2RlczogJyEnLFxuICAgIG9wdGlvbmFsOiBOT19CQU5HLFxuICB9KTtcbn1cblxuY2xhc3MgUXVhbGl0eSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1EnO1xuICByZWFkb25seSBuYW1lID0gJ1F1YWxpdHkgb2YgTGlmZSc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlIGZvbGxvd2luZyBxdWFsaXR5LW9mLWxpZmUgZmxhZ3MgdHVybiA8aT5vZmY8L2k+IGltcHJvdmVtZW50cyB0aGF0XG4gICAgICBhcmUgbm9ybWFsbHkgb24gYnkgZGVmYXVsdC4gIFRoZXkgYXJlIG9wdGlvbmFsIGFuZCB3aWxsIG5vdCBhZmZlY3QgdGhlXG4gICAgICBzZWVkIGdlbmVyYXRpb24uICBUaGV5IG1heSBiZSB0b2dnbGVkIGZyZWVseSBpbiByYWNlIG1vZGUuYDtcblxuICAvLyBUT0RPIC0gcmVtZW1iZXIgcHJlZmVyZW5jZXMgYW5kIGF1dG8tYXBwbHk/XG4gIHN0YXRpYyByZWFkb25seSBOb0F1dG9FcXVpcCA9IFF1YWxpdHkuZmxhZygnUWEnLCB7XG4gICAgbmFtZTogYERvbid0IGF1dG9tYXRpY2FsbHkgZXF1aXAgb3JicyBhbmQgYnJhY2VsZXRzYCxcbiAgICB0ZXh0OiBgUHJldmVudHMgYWRkaW5nIGEgcXVhbGl0eS1vZi1saWZlIGltcHJvdmVtZW50IHRvIGF1dG9tYXRpY2FsbHkgZXF1aXBcbiAgICAgICAgICAgdGhlIGNvcnJlc3BvbmRpbmcgb3JiL2JyYWNlbGV0IHdoZW5ldmVyIGNoYW5naW5nIHN3b3Jkcy5gLFxuICAgIG9wdGlvbmFsOiBPUFRJT05BTCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vQ29udHJvbGxlclNob3J0Y3V0cyA9IFF1YWxpdHkuZmxhZygnUWMnLCB7XG4gICAgbmFtZTogJ0Rpc2FibGUgY29udHJvbGxlciBzaG9ydGN1dHMnLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB3ZSBkaXNhYmxlIHNlY29uZCBjb250cm9sbGVyIGlucHV0IGFuZCBpbnN0ZWFkIGVuYWJsZVxuICAgICAgICAgICBzb21lIG5ldyBzaG9ydGN1dHMgb24gY29udHJvbGxlciAxOiBTdGFydCtBK0IgZm9yIHdpbGQgd2FycCwgYW5kXG4gICAgICAgICAgIFNlbGVjdCtCIHRvIHF1aWNrbHkgY2hhbmdlIHN3b3Jkcy4gIFRvIHN1cHBvcnQgdGhpcywgdGhlIGFjdGlvbiBvZlxuICAgICAgICAgICB0aGUgc3RhcnQgYW5kIHNlbGVjdCBidXR0b25zIGlzIGNoYW5nZWQgc2xpZ2h0bHkuICBUaGlzIGZsYWdcbiAgICAgICAgICAgZGlzYWJsZXMgdGhpcyBjaGFuZ2UgYW5kIHJldGFpbnMgbm9ybWFsIGJlaGF2aW9yLmAsXG4gICAgb3B0aW9uYWw6IE9QVElPTkFMLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgQXVkaWJsZVdhbGxDdWVzID0gUXVhbGl0eS5mbGFnKCdRdycsIHtcbiAgICBuYW1lOiAnQXVkaWJsZSB3YWxsIGN1ZXMnLFxuICAgIHRleHQ6IGBQcm92aWRlIGFuIGF1ZGlibGUgY3VlIHdoZW4gZmFpbGluZyB0byBicmVhayBhIG5vbi1pcm9uIHdhbGwuXG4gICAgICAgICAgIFRoZSBpbnRlbmRlZCB3YXkgdG8gZGV0ZXJtaW5lIHdoaWNoIHN3b3JkIGlzIHJlcXVpcmVkIGZvciBub3JtYWxcbiAgICAgICAgICAgY2F2ZSB3YWxscyBpcyBieSBsb29raW5nIGF0IHRoZSBjb2xvci4gIFRoaXMgY2F1c2VzIHRoZSBsZXZlbCAzXG4gICAgICAgICAgIHN3b3JkIHNvdW5kIG9mIHRoZSByZXF1aXJlZCBlbGVtZW50IHRvIHBsYXkgd2hlbiB0aGUgd2FsbCBmYWlsc1xuICAgICAgICAgICB0byBicmVhay4gIE5vdGUgdGhhdCBmb3J0cmVzcyB3YWxscyAoaXJvbiBpbiB2YW5pbGxhKSBkbyBub3QgZ2l2ZVxuICAgICAgICAgICB0aGlzIGhpbnQsIHNpbmNlIHRoZXJlIGlzIG5vIHZpc3VhbCBjdWUgZm9yIHRoZW0sIGVpdGhlci5gLFxuICAgIG9wdGlvbmFsOiBPUFRJT05BTCxcbiAgfSk7XG59XG5cbmNsYXNzIERlYnVnTW9kZSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgLy8gVE9ETyAtIGhvdyB0byBkaXNjb3ZlciBGbGFnU2VjdGlvbnM/Pz9cbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0QnO1xuICByZWFkb25seSBuYW1lID0gJ0RlYnVnIE1vZGUnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZXNlIG9wdGlvbnMgYXJlIGhlbHBmdWwgZm9yIGV4cGxvcmluZyBvciBkZWJ1Z2dpbmcuICBOb3RlIHRoYXQsXG4gICAgICB3aGlsZSB0aGV5IGRvIG5vdCBkaXJlY3RseSBhZmZlY3QgYW55IHJhbmRvbWl6YXRpb24sIHRoZXlcbiAgICAgIDxpPmRvPC9pPiBmYWN0b3IgaW50byB0aGUgc2VlZCB0byBwcmV2ZW50IGNoZWF0aW5nLCBhbmQgdGhleVxuICAgICAgd2lsbCByZW1vdmUgdGhlIG9wdGlvbiB0byBnZW5lcmF0ZSBhIHNlZWQgZm9yIHJhY2luZy5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBTcG9pbGVyTG9nID0gRGVidWdNb2RlLmZsYWcoJ0RzJywge1xuICAgIG5hbWU6ICdHZW5lcmF0ZSBhIHNwb2lsZXIgbG9nJyxcbiAgICB0ZXh0OiBgTm90ZTogPGI+dGhpcyB3aWxsIGNoYW5nZSB0aGUgcGxhY2VtZW50IG9mIGl0ZW1zPC9iPiBjb21wYXJlZCB0byBhXG4gICAgICAgICAgIHNlZWQgZ2VuZXJhdGVkIHdpdGhvdXQgdGhpcyBmbGFnIHR1cm5lZCBvbi5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVHJhaW5lck1vZGUgPSBEZWJ1Z01vZGUuZmxhZygnRHQnLCB7XG4gICAgbmFtZTogJ1RyYWluZXIgbW9kZScsXG4gICAgdGV4dDogYEluc3RhbGxzIGEgdHJhaW5lciBmb3IgcHJhY3RpY2luZyBjZXJ0YWluIHBhcnRzIG9mIHRoZSBnYW1lLlxuICAgICAgICAgICBBdCB0aGUgc3RhcnQgb2YgdGhlIGdhbWUsIHRoZSBwbGF5ZXIgd2lsbCBoYXZlIGFsbCBzd29yZHMsIGJhc2ljXG4gICAgICAgICAgIGFybW9ycyBhbmQgc2hpZWxkcywgYWxsIHdvcm4gaXRlbXMgYW5kIG1hZ2ljcywgYSBzZWxlY3Rpb24gb2ZcbiAgICAgICAgICAgY29uc3VtYWJsZXMsIGJvdyBvZiB0cnV0aCwgbWF4aW11bSBjYXNoLCBhbGwgd2FycCBwb2ludHMgYWN0aXZhdGVkLFxuICAgICAgICAgICBhbmQgdGhlIFNoeXJvbiBtYXNzYWNyZSB3aWxsIGhhdmUgYmVlbiB0cmlnZ2VyZWQuICBXaWxkIHdhcnAgaXNcbiAgICAgICAgICAgcmVjb25maWd1cmVkIHRvIHByb3ZpZGUgZWFzeSBhY2Nlc3MgdG8gYWxsIGJvc3Nlcy4gIEFkZGl0aW9uYWxseSxcbiAgICAgICAgICAgdGhlIGZvbGxvd2luZyBidXR0b24gY29tYmluYXRpb25zIGFyZSByZWNvZ25pemVkOjx1bD5cbiAgICAgICAgICAgICA8bGk+U3RhcnQrVXA6IGluY3JlYXNlIHBsYXllciBsZXZlbFxuICAgICAgICAgICAgIDxsaT5TdGFydCtEb3duOiBpbmNyZWFzZSBzY2FsaW5nIGxldmVsXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0xlZnQ6IGdldCBhbGwgYmFsbHNcbiAgICAgICAgICAgICA8bGk+U3RhcnQrUmlnaHQ6IGdldCBhbGwgYnJhY2VsZXRzXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0IrRG93bjogZ2V0IGEgZnVsbCBzZXQgb2YgY29uc3VtYWJsZSBpdGVtc1xuICAgICAgICAgICAgIDxsaT5TdGFydCtCK0xlZnQ6IGdldCBhbGwgYWR2YW5jZWQgYXJtb3JzXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0IrUmlnaHQ6IGdldCBhbGwgYWR2YW5jZWQgc2hpZWxkc1xuICAgICAgICAgICA8L3VsPmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOZXZlckRpZSA9IERlYnVnTW9kZS5mbGFnKCdEaScsIHtcbiAgICBuYW1lOiAnUGxheWVyIG5ldmVyIGRpZXMnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9TaHVmZmxlID0gRGVidWdNb2RlLmZsYWcoJ0RuJywge1xuICAgIG5hbWU6ICdEbyBub3Qgc2h1ZmZsZSBpdGVtcycsXG4gICAgdGV4dDogYEl0ZW1zIHdpbGwgbm90IGJlIHNodWZmbGVkLiBXQVJOSU5HOiBUaGlzIGRpc2FibGVzIHRoZSBsb2dpYyBhbmRcbiAgICAgICAgICAgaXMgdmVyeSBsaWtlbHkgdG8gcmVzdWx0IGluIGFuIHVud2lubmFibGUgc2VlZGAsXG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgRmxhZ1NldCB7XG4gIHByaXZhdGUgZmxhZ3M6IE1hcDxGbGFnLCBNb2RlPjtcblxuICBjb25zdHJ1Y3RvcihzdHI6IHN0cmluZ3xNYXA8RmxhZywgTW9kZT4gPSAnQENhc3VhbCcpIHtcbiAgICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuZmxhZ3MgPSBuZXcgTWFwKCk7XG4gICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBzdHIpIHtcbiAgICAgICAgdGhpcy5zZXQoay5mbGFnLCB2KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHN0ci5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgIC8vIFRPRE8gLSBzdXBwb3J0ICdAQ2FzdWFsK1JzLUVkJ1xuICAgICAgY29uc3QgZXhwYW5kZWQgPSBQcmVzZXRzLmdldChzdHIuc3Vic3RyaW5nKDEpKTtcbiAgICAgIGlmICghZXhwYW5kZWQpIHRocm93IG5ldyBVc2FnZUVycm9yKGBVbmtub3duIHByZXNldDogJHtzdHJ9YCk7XG4gICAgICB0aGlzLmZsYWdzID0gbmV3IE1hcChleHBhbmRlZC5mbGFncyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZmxhZ3MgPSBuZXcgTWFwKCk7XG4gICAgLy8gcGFyc2UgdGhlIHN0cmluZ1xuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9bXkEtWmEtejAtOSE/XS9nLCAnJyk7XG4gICAgY29uc3QgcmUgPSAvKFtBLVpdKShbYS16MC05IT9dKykvZztcbiAgICBsZXQgbWF0Y2g7XG4gICAgd2hpbGUgKChtYXRjaCA9IHJlLmV4ZWMoc3RyKSkpIHtcbiAgICAgIGNvbnN0IFssIGtleSwgdGVybXNdID0gbWF0Y2g7XG4gICAgICBjb25zdCByZTIgPSAvKFshP118XikoW2EtejAtOV0rKS9nO1xuICAgICAgd2hpbGUgKChtYXRjaCA9IHJlMi5leGVjKHRlcm1zKSkpIHtcbiAgICAgICAgY29uc3QgWywgbW9kZSwgZmxhZ3NdID0gbWF0Y2g7XG4gICAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBmbGFncykge1xuICAgICAgICAgIHRoaXMuc2V0KGtleSArIGZsYWcsIG1vZGUgfHwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmaWx0ZXJPcHRpb25hbCgpOiBGbGFnU2V0IHtcbiAgICByZXR1cm4gbmV3IEZsYWdTZXQoXG4gICAgICAgIG5ldyBNYXAoXG4gICAgICAgICAgICBbLi4udGhpcy5mbGFnc10ubWFwKFxuICAgICAgICAgICAgICAgIChbaywgdl0pID0+IFtrLCBrLm9wdHMub3B0aW9uYWwgPyBrLm9wdHMub3B0aW9uYWwodikgOiB2XSkpKTtcbiAgfVxuXG4gIGZpbHRlclJhbmRvbShyYW5kb206IFJhbmRvbSk6IEZsYWdTZXQge1xuICAgIGZ1bmN0aW9uIHBpY2soazogRmxhZywgdjogTW9kZSk6IE1vZGUge1xuICAgICAgaWYgKHYgIT09ICc/JykgcmV0dXJuIHY7XG4gICAgICByZXR1cm4gcmFuZG9tLnBpY2soW3RydWUsIGZhbHNlLCAuLi4oay5vcHRzLm1vZGVzIHx8ICcnKV0pO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEZsYWdTZXQoXG4gICAgICAgIG5ldyBNYXAoWy4uLnRoaXMuZmxhZ3NdLm1hcCgoW2ssIHZdKSA9PiBbaywgcGljayhrLCB2KV0pKSk7XG4gIH1cblxuICB0b1N0cmluZygpIHtcbiAgICB0eXBlIFNlY3Rpb24gPSBEZWZhdWx0TWFwPHN0cmluZywgc3RyaW5nW10+O1xuICAgIGNvbnN0IHNlY3Rpb25zID1cbiAgICAgICAgbmV3IERlZmF1bHRNYXA8c3RyaW5nLCBTZWN0aW9uPihcbiAgICAgICAgICAgICgpID0+IG5ldyBEZWZhdWx0TWFwPHN0cmluZywgc3RyaW5nW10+KCgpID0+IFtdKSlcbiAgICBmb3IgKGNvbnN0IFtmbGFnLCBtb2RlXSBvZiB0aGlzLmZsYWdzKSB7XG4gICAgICBpZiAoZmxhZy5mbGFnLmxlbmd0aCAhPT0gMikgdGhyb3cgbmV3IEVycm9yKGBCYWQgZmxhZyAke2ZsYWcuZmxhZ31gKTtcbiAgICAgIGlmICghbW9kZSkgY29udGludWU7XG4gICAgICBjb25zdCBzZWN0aW9uID0gc2VjdGlvbnMuZ2V0KGZsYWcuZmxhZ1swXSk7XG4gICAgICBjb25zdCBzdWJzZWN0aW9uID0gbW9kZSA9PT0gdHJ1ZSA/ICcnIDogbW9kZTtcbiAgICAgIHNlY3Rpb24uZ2V0KHN1YnNlY3Rpb24pLnB1c2goZmxhZy5mbGFnWzFdKTtcbiAgICB9XG4gICAgY29uc3Qgb3V0ID0gW107XG4gICAgZm9yIChjb25zdCBba2V5LCBzZWN0aW9uXSBvZiBzZWN0aW9ucy5zb3J0ZWRFbnRyaWVzKCkpIHtcbiAgICAgIGxldCBzZWMgPSBrZXk7XG4gICAgICBmb3IgKGNvbnN0IFtzdWJrZXksIHN1YnNlY3Rpb25dIG9mIHNlY3Rpb24uc29ydGVkRW50cmllcygpKSB7XG4gICAgICAgIHNlYyArPSBzdWJrZXkgKyBzdWJzZWN0aW9uLnNvcnQoKS5qb2luKCcnKTtcbiAgICAgIH1cbiAgICAgIG91dC5wdXNoKHNlYyk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbignICcpO1xuICB9XG5cbiAgdG9nZ2xlKG5hbWU6IHN0cmluZyk6IE1vZGUge1xuICAgIGNvbnN0IGZsYWcgPSBGbGFnLmZsYWdzLmdldChuYW1lKTtcbiAgICBpZiAoIWZsYWcpIHtcbiAgICAgIC8vIFRPRE8gLSBSZXBvcnQgc29tZXRoaW5nXG4gICAgICBjb25zb2xlLmVycm9yKGBCYWQgZmxhZzogJHtuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBtb2RlOiBNb2RlID0gdGhpcy5mbGFncy5nZXQoZmxhZykgfHwgZmFsc2U7XG4gICAgY29uc3QgbW9kZXMgPSBbZmFsc2UsIHRydWUsIC4uLihmbGFnLm9wdHMubW9kZXMgfHwgJycpLCAnPycsIGZhbHNlXTtcbiAgICBjb25zdCBpbmRleCA9IG1vZGVzLmluZGV4T2YobW9kZSk7XG4gICAgaWYgKGluZGV4IDwgMCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgY3VycmVudCBtb2RlICR7bW9kZX1gKTtcbiAgICBjb25zdCBuZXh0ID0gbW9kZXNbaW5kZXggKyAxXTtcbiAgICB0aGlzLmZsYWdzLnNldChmbGFnLCBuZXh0KTtcbiAgICByZXR1cm4gbmV4dDtcbiAgfVxuXG4gIHNldChuYW1lOiBzdHJpbmcsIG1vZGU6IE1vZGUpIHtcbiAgICBjb25zdCBmbGFnID0gRmxhZy5mbGFncy5nZXQobmFtZSk7XG4gICAgaWYgKCFmbGFnKSB7XG4gICAgICAvLyBUT0RPIC0gUmVwb3J0IHNvbWV0aGluZ1xuICAgICAgY29uc29sZS5lcnJvcihgQmFkIGZsYWc6ICR7bmFtZX1gKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCFtb2RlKSB7XG4gICAgICB0aGlzLmZsYWdzLmRlbGV0ZShmbGFnKTtcbiAgICB9IGVsc2UgaWYgKG1vZGUgPT09IHRydWUgfHwgbW9kZSA9PT0gJz8nIHx8IGZsYWcub3B0cy5tb2Rlcz8uaW5jbHVkZXMobW9kZSkpIHtcbiAgICAgIHRoaXMuZmxhZ3Muc2V0KGZsYWcsIG1vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBCYWQgZmxhZyBtb2RlOiAke25hbWVbMF19JHttb2RlfSR7bmFtZS5zdWJzdHJpbmcoMSl9YCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFJlbW92ZSBhbnkgY29uZmxpY3RzXG4gICAgZm9yIChjb25zdCBleGNsdWRlZCBvZiBmbGFnLm9wdHMuZXhjbHVkZXMgfHwgW10pIHtcbiAgICAgIHRoaXMuZmxhZ3MuZGVsZXRlKEZsYWcuZmxhZ3MuZ2V0KGV4Y2x1ZGVkKSEpO1xuICAgIH1cbiAgfVxuXG4gIGNoZWNrKG5hbWU6IEZsYWd8c3RyaW5nLCAuLi5tb2RlczogTW9kZVtdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZmxhZyA9IG5hbWUgaW5zdGFuY2VvZiBGbGFnID8gbmFtZSA6IEZsYWcuZmxhZ3MuZ2V0KG5hbWUpO1xuICAgIGlmICghbW9kZXMubGVuZ3RoKSBtb2Rlcy5wdXNoKHRydWUpO1xuICAgIHJldHVybiBtb2Rlcy5pbmNsdWRlcyhmbGFnICYmIHRoaXMuZmxhZ3MuZ2V0KGZsYWcpIHx8IGZhbHNlKTtcbiAgfVxuXG4gIGdldChuYW1lOiBGbGFnfHN0cmluZyk6IE1vZGUge1xuICAgIGNvbnN0IGZsYWcgPSBuYW1lIGluc3RhbmNlb2YgRmxhZyA/IG5hbWUgOiBGbGFnLmZsYWdzLmdldChuYW1lKTtcbiAgICByZXR1cm4gZmxhZyAmJiB0aGlzLmZsYWdzLmdldChmbGFnKSB8fCBmYWxzZTtcbiAgfVxuXG4gIHByZXNlcnZlVW5pcXVlQ2hlY2tzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLlByZXNlcnZlVW5pcXVlQ2hlY2tzKTtcbiAgfVxuICBzaHVmZmxlTWltaWNzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLk5vU2h1ZmZsZU1pbWljcywgZmFsc2UpO1xuICB9XG5cbiAgYnVmZkRlb3NQZW5kYW50KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG4gIGNoYW5nZUdhc01hc2tUb0hhem1hdFN1aXQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cbiAgc2xvd0Rvd25Ub3JuYWRvKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG4gIGxlYXRoZXJCb290c0dpdmVTcGVlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuICByYWJiaXRCb290c0NoYXJnZVdoaWxlV2Fsa2luZygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuXG4gIHNodWZmbGVTcHJpdGVQYWxldHRlcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVTcHJpdGVDb2xvcnMpO1xuICB9XG4gIHNodWZmbGVNb25zdGVycygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTsgLy8gdGhpcy5jaGVjaygnTXInKTtcbiAgfVxuICBzaHVmZmxlU2hvcHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5TaG9wcywgZmFsc2UpO1xuICB9XG4gIGJhcmdhaW5IdW50aW5nKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNodWZmbGVTaG9wcygpO1xuICB9XG5cbiAgc2h1ZmZsZVRvd2VyTW9uc3RlcnMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTW9uc3RlcnMuVG93ZXJSb2JvdHMpO1xuICB9XG4gIHNodWZmbGVNb25zdGVyRWxlbWVudHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3Nlcyk7XG4gIH1cbiAgc2h1ZmZsZUJvc3NFbGVtZW50cygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zaHVmZmxlTW9uc3RlckVsZW1lbnRzKCk7XG4gIH1cblxuICBidWZmTWVkaWNhbEhlcmIoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuTm9CdWZmTWVkaWNhbEhlcmIsIGZhbHNlKTtcbiAgfVxuICBkZWNyZWFzZUVuZW15RGFtYWdlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLkRlY3JlYXNlRW5lbXlEYW1hZ2UpO1xuICB9XG4gIHRyYWluZXIoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRGVidWdNb2RlLlRyYWluZXJNb2RlKTtcbiAgfVxuICBuZXZlckRpZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhEZWJ1Z01vZGUuTmV2ZXJEaWUpO1xuICB9XG4gIG5vU2h1ZmZsZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhEZWJ1Z01vZGUuTm9TaHVmZmxlKTtcbiAgfVxuICBjaGFyZ2VTaG90c09ubHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuQ2hhcmdlU2hvdHNPbmx5KTtcbiAgfVxuXG4gIGJhcnJpZXJSZXF1aXJlc0NhbG1TZWEoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIH1cbiAgLy8gcGFyYWx5c2lzUmVxdWlyZXNQcmlzb25LZXkoKTogYm9vbGVhbiB7XG4gIC8vICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIC8vIH1cbiAgLy8gc2VhbGVkQ2F2ZVJlcXVpcmVzV2luZG1pbGwoKTogYm9vbGVhbiB7XG4gIC8vICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIC8vIH1cblxuICBjb25uZWN0TGltZVRyZWVUb0xlYWYoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5NYXBzLCAnIScpO1xuICB9XG4gIC8vIGNvbm5lY3RHb2FUb0xlYWYoKSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuY2hlY2soJ1hlJykgJiYgdGhpcy5jaGVjaygnWGcnKTtcbiAgLy8gfVxuICAvLyByZW1vdmVFYXJseVdhbGwoKSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuY2hlY2soJ1hiJyk7XG4gIC8vIH1cbiAgYWRkRWFzdENhdmUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5NYXBzLCBmYWxzZSk7XG4gIH1cbiAgemVidVN0dWRlbnRHaXZlc0l0ZW0oKTogYm9vbGVhbiB7XG4gICAgLy8gSWYgaGUncyBub3QgZ3VhcmFudGVlZCB0byBiZSBhdCB0aGUgc3RhcnQsIG1vdmUgY2hlY2sgdG8gbWV6YW1lIGluc3RlYWRcbiAgICByZXR1cm4gIXRoaXMuc2h1ZmZsZUFyZWFzKCkgJiYgIXRoaXMuc2h1ZmZsZUhvdXNlcygpO1xuICB9XG4gIGZvZ0xhbXBOb3RSZXF1aXJlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLlZhbmlsbGFEb2xwaGluLCBmYWxzZSk7XG4gIH1cbiAgc3RvcnlNb2RlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuU3RvcnlNb2RlKTtcbiAgfVxuICBub0Jvd01vZGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5Ob0Jvd01vZGUpO1xuICB9XG4gIHJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuVmFuaWxsYURvbHBoaW4pO1xuICB9XG4gIHNhaGFyYVJhYmJpdHNSZXF1aXJlVGVsZXBhdGh5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdScicpO1xuICB9XG4gIHRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsIGZhbHNlLCAnIScpO1xuICB9XG4gIHJhbmRvbWl6ZVRodW5kZXJUZWxlcG9ydCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgZmFsc2UpO1xuICB9XG4gIG9yYnNPcHRpb25hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCk7XG4gIH1cblxuICBzaHVmZmxlR29hRmxvb3JzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlNodWZmbGVHb2FGbG9vcnMpO1xuICB9XG4gIHNodWZmbGVIb3VzZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuU2h1ZmZsZUhvdXNlcyk7XG4gIH1cbiAgc2h1ZmZsZUFyZWFzKCkge1xuICAgIC8vIFRPRE86IGNvbnNpZGVyIG11bHRpcGxlIGxldmVscyBvZiBzaHVmZmxlP1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlNodWZmbGVBcmVhcyk7XG4gIH1cbiAgcmFuZG9taXplTWFwcygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVNYXBzKTtcbiAgfVxuICByYW5kb21pemVUcmFkZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplVHJhZGVzKTtcbiAgfVxuICB1bmlkZW50aWZpZWRJdGVtcygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcyk7XG4gIH1cbiAgcmFuZG9taXplV2FsbHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzKTtcbiAgfVxuXG4gIGd1YXJhbnRlZVN3b3JkKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLkd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQpO1xuICB9XG4gIGd1YXJhbnRlZVN3b3JkTWFnaWMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLCBmYWxzZSk7XG4gIH1cbiAgZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhOb0d1YXJhbnRlZXMuTWF0Y2hpbmdTd29yZCwgZmFsc2UpO1xuICB9XG4gIGd1YXJhbnRlZUdhc01hc2soKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTm9HdWFyYW50ZWVzLkdhc01hc2ssIGZhbHNlKTtcbiAgfVxuICBndWFyYW50ZWVCYXJyaWVyKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE5vR3VhcmFudGVlcy5CYXJyaWVyLCBmYWxzZSk7XG4gIH1cbiAgZ3VhcmFudGVlUmVmcmVzaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5HdWFyYW50ZWVSZWZyZXNoKTtcbiAgfVxuXG4gIGRpc2FibGVTd29yZENoYXJnZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5Td29yZENoYXJnZUdsaXRjaCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVUZWxlcG9ydFNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVSYWJiaXRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlU2hvcEdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLlNob3BzLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVN0YXR1ZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlUmFnZVNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuUmFnZVNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlVHJpZ2dlckdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5UcmlnZ2VyU2tpcCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVGbGlnaHRTdGF0dWVTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN0YXR1ZUdhdW50bGV0U2tpcCwgZmFsc2UpO1xuICB9XG5cbiAgYXNzdW1lU3dvcmRDaGFyZ2VHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gpO1xuICB9XG4gIGFzc3VtZUdoZXR0b0ZsaWdodCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5HaGV0dG9GbGlnaHQpO1xuICB9XG4gIGFzc3VtZVRlbGVwb3J0U2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwKTtcbiAgfVxuICBhc3N1bWVSYWJiaXRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXApO1xuICB9XG4gIGFzc3VtZVN0YXR1ZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gpO1xuICB9XG4gIGFzc3VtZVRyaWdnZXJHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuVHJpZ2dlclNraXApO1xuICB9XG4gIGFzc3VtZUZsaWdodFN0YXR1ZVNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3RhdHVlR2F1bnRsZXRTa2lwKTtcbiAgfVxuICBhc3N1bWVXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLldpbGRXYXJwLCB0cnVlKSB8fFxuICAgICAgICB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwKTtcbiAgfVxuICBhc3N1bWVSYWdlU2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5SYWdlU2tpcCk7XG4gIH1cblxuICBuZXJmV2lsZFdhcnAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5XaWxkV2FycCwgZmFsc2UpICYmXG4gICAgICAgIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplV2lsZFdhcnAsIGZhbHNlKTtcbiAgfVxuICBhbGxvd1dpbGRXYXJwKCkge1xuICAgIHJldHVybiAhdGhpcy5uZXJmV2lsZFdhcnAoKTtcbiAgfVxuICByYW5kb21pemVXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVXaWxkV2FycCwgdHJ1ZSk7XG4gIH1cblxuICBibGFja291dE1vZGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuQmxhY2tvdXQpO1xuICB9XG4gIGhhcmRjb3JlTW9kZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5QZXJtYWRlYXRoKTtcbiAgfVxuICBidWZmRHluYSgpIHtcbiAgICByZXR1cm4gIXRoaXMuY2hlY2soVmFuaWxsYS5EeW5hKTtcbiAgfVxuICBtYXhTY2FsaW5nSW5Ub3dlcigpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcik7XG4gIH1cblxuICBleHBTY2FsaW5nRmFjdG9yKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLkV4cGVyaWVuY2VTY2FsZXNTbG93ZXIpID8gMC4yNSA6XG4gICAgICAgIHRoaXMuY2hlY2soRWFzeU1vZGUuRXhwZXJpZW5jZVNjYWxlc0Zhc3RlcikgPyAyLjUgOiAxO1xuICB9XG5cbiAgLy8gT1BUSU9OQUwgRkxBR1NcbiAgYXV0b0VxdWlwQnJhY2VsZXQocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBwYXNzID09PSAnZWFybHknIHx8IHRoaXMuY2hlY2soUXVhbGl0eS5Ob0F1dG9FcXVpcCwgZmFsc2UpO1xuICB9XG4gIGNvbnRyb2xsZXJTaG9ydGN1dHMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBwYXNzID09PSAnZWFybHknIHx8IHRoaXMuY2hlY2soUXVhbGl0eS5Ob0NvbnRyb2xsZXJTaG9ydGN1dHMsIGZhbHNlKTtcbiAgfVxuICByYW5kb21pemVNdXNpYyhwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soQWVzdGhldGljcy5SYW5kb21pemVNdXNpYywgcGFzcyA9PT0gJ2Vhcmx5JyA/ICchJyA6IHRydWUpO1xuICB9XG4gIHNodWZmbGVUaWxlUGFsZXR0ZXMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEFlc3RoZXRpY3MuUmFuZG9taXplTWFwQ29sb3JzLFxuICAgICAgICAgICAgICAgICAgICAgIHBhc3MgPT09ICdlYXJseScgPyAnIScgOiB0cnVlKTtcbiAgfVxuICBub011c2ljKHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gcGFzcyA9PT0gJ2xhdGUnICYmIHRoaXMuY2hlY2soQWVzdGhldGljcy5Ob011c2ljKTtcbiAgfVxuICBhdWRpYmxlV2FsbEN1ZXMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBwYXNzID09PSAnbGF0ZScgJiYgdGhpcy5jaGVjayhRdWFsaXR5LkF1ZGlibGVXYWxsQ3Vlcyk7XG4gIH1cblxuICBzaG91bGRDb2xvclN3b3JkRWxlbWVudHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgc2hvdWxkVXBkYXRlSHVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuSHVkLCBmYWxzZSk7XG4gIH1cbn1cbiJdfQ==