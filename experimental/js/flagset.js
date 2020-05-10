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
            World.RandomizeTrades,
            World.RandomizeWallElements,
            World.UnidentifiedKeyItems,
        ]);
        this.FullStupid = new Preset(this, 'The Full Stupid', `
      Nobody has ever completed this.  Be sure to record this because
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
            World.RandomizeTrades,
            World.RandomizeWallElements,
            World.ShuffleGoaFloors,
            World.UnidentifiedKeyItems,
        ]);
        this.Mystery = new Preset(this, 'Mystery', `
      Even the options are random.`, [
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
           and shell flute are required.`,
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
    name: 'Statue guantlet skip',
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
           bypassing both Mt Sabre entrance triggers, the Evil Spirit Island
           entrance trigger, triggers for guards to move, slopes, and seamless
           map transitions.`,
    hard: true,
    modes: '!',
});
Glitches.RageSkip = Glitches.flag('Gr', {
    name: 'Rage skip',
    text: `Rage can be skipped by damage-boosting diagonally into the Lime
           Tree Lake screen.  This provides access to the area beyond the
           lake if flight or bridges are available.`,
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
    text: `The logic will not guarantee gas mask before needing to enter the swamp.
           Gas mask is still guaranteed to kill the insect.`,
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
            for (const [subkey, subsection] of section) {
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
        return false;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3NldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy9mbGFnc2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBZ0JqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUU3RCxNQUFNLE9BQU8sSUFBSTtJQU9mLFlBQXFCLElBQVksRUFBVyxJQUFjO1FBQXJDLFNBQUksR0FBSixJQUFJLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFVO1FBQ3hELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBTkQsTUFBTSxDQUFDLEdBQUc7UUFDUixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQzs7QUFKZSxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7QUFXbEQsTUFBTSxPQUFPLE1BQU07SUFTakIsWUFBWSxNQUFlLEVBQ04sSUFBWSxFQUNaLFdBQW1CLEVBQzVCLEtBQWdEO1FBRnZDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUV0QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0Qs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RCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1VzYWdlRXJyb3IsIERlZmF1bHRNYXB9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi9yYW5kb20uanMnO1xuXG5pbnRlcmZhY2UgRmxhZ09wdHMge1xuICBuYW1lOiBzdHJpbmc7XG4gIHRleHQ/OiBzdHJpbmc7XG4gIGV4Y2x1ZGVzPzogc3RyaW5nW107XG4gIGhhcmQ/OiBib29sZWFuO1xuICBvcHRpb25hbD86IChtb2RlOiBNb2RlKSA9PiBNb2RlO1xuICAvLyBBbGwgZmxhZ3MgaGF2ZSBtb2RlcyBmYWxzZSBhbmQgdHJ1ZS4gIEFkZGl0aW9uYWwgbW9kZXMgbWF5IGJlXG4gIC8vIHNwZWNpZmllZCBhcyBjaGFyYWN0ZXJzIGluIHRoaXMgc3RyaW5nIChlLmcuICchJykuXG4gIG1vZGVzPzogc3RyaW5nO1xufVxuXG50eXBlIE1vZGUgPSBib29sZWFufHN0cmluZztcblxuY29uc3QgT1BUSU9OQUwgPSAobW9kZTogTW9kZSkgPT4gJyc7XG5jb25zdCBOT19CQU5HID0gKG1vZGU6IE1vZGUpID0+IG1vZGUgPT09IHRydWUgPyBmYWxzZSA6IG1vZGU7XG5cbmV4cG9ydCBjbGFzcyBGbGFnIHtcbiAgc3RhdGljIHJlYWRvbmx5IGZsYWdzID0gbmV3IE1hcDxzdHJpbmcsIEZsYWc+KCk7XG5cbiAgc3RhdGljIGFsbCgpOiBGbGFnW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5mbGFncy52YWx1ZXMoKV07XG4gIH1cblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBmbGFnOiBzdHJpbmcsIHJlYWRvbmx5IG9wdHM6IEZsYWdPcHRzKSB7XG4gICAgRmxhZy5mbGFncy5zZXQoZmxhZywgdGhpcyk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFByZXNldCB7XG4gIHN0YXRpYyBhbGwoKTogUHJlc2V0W10ge1xuICAgIGlmICghUHJlc2V0cy5pbnN0YW5jZSkgUHJlc2V0cy5pbnN0YW5jZSA9IG5ldyBQcmVzZXRzKCk7XG4gICAgcmV0dXJuIFsuLi5QcmVzZXRzLmluc3RhbmNlLnByZXNldHMudmFsdWVzKCldO1xuICB9XG5cbiAgcHJpdmF0ZSBfZmxhZ1N0cmluZz86IHN0cmluZztcblxuICByZWFkb25seSBmbGFnczogUmVhZG9ubHlBcnJheTxyZWFkb25seSBbRmxhZywgTW9kZV0+O1xuICBjb25zdHJ1Y3RvcihwYXJlbnQ6IFByZXNldHMsIC8vIE5PVEU6IGltcG9zc2libGUgdG8gZ2V0IGFuIGluc3RhbmNlIG91dHNpZGVcbiAgICAgICAgICAgICAgcmVhZG9ubHkgbmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICByZWFkb25seSBkZXNjcmlwdGlvbjogc3RyaW5nLFxuICAgICAgICAgICAgICBmbGFnczogUmVhZG9ubHlBcnJheTxGbGFnfHJlYWRvbmx5IFtGbGFnLCBNb2RlXT4pIHtcbiAgICB0aGlzLmZsYWdzID0gZmxhZ3MubWFwKGYgPT4gZiBpbnN0YW5jZW9mIEZsYWcgPyBbZiwgdHJ1ZV0gOiBmKTtcbiAgICBwYXJlbnQucHJlc2V0cy5zZXQobWFwUHJlc2V0TmFtZShuYW1lKSwgdGhpcyk7XG4gIH1cblxuICBnZXQgZmxhZ1N0cmluZygpIHtcbiAgICBpZiAodGhpcy5fZmxhZ1N0cmluZyA9PSBudWxsKSB7XG4gICAgICB0aGlzLl9mbGFnU3RyaW5nID0gU3RyaW5nKG5ldyBGbGFnU2V0KGBAJHt0aGlzLm5hbWV9YCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZmxhZ1N0cmluZztcbiAgfVxufVxuXG5mdW5jdGlvbiBtYXBQcmVzZXROYW1lKG5hbWU6IHN0cmluZykge1xuICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16XS9nLCAnJyk7XG59XG5cbi8vIE5PVCBFWFBPUlRFRCFcbmNsYXNzIFByZXNldHMge1xuICBzdGF0aWMgaW5zdGFuY2U6IFByZXNldHMgfCB1bmRlZmluZWQ7XG4gIHJlYWRvbmx5IHByZXNldHMgPSBuZXcgTWFwPHN0cmluZywgUHJlc2V0PigpO1xuXG4gIHN0YXRpYyBnZXQobmFtZTogc3RyaW5nKTogUHJlc2V0IHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuaW5zdGFuY2UpIHRoaXMuaW5zdGFuY2UgPSBuZXcgUHJlc2V0cygpO1xuICAgIHJldHVybiB0aGlzLmluc3RhbmNlLnByZXNldHMuZ2V0KG1hcFByZXNldE5hbWUobmFtZSkpO1xuICB9XG5cbiAgcmVhZG9ubHkgQ2FzdWFsID0gbmV3IFByZXNldCh0aGlzLCAnQ2FzdWFsJywgYFxuICAgICAgQmFzaWMgZmxhZ3MgZm9yIGEgcmVsYXRpdmVseSBlYXN5IHBsYXl0aHJvdWdoLiAgVGhpcyBpcyBhIGdvb2RcbiAgICAgIHBsYWNlIHRvIHN0YXJ0LmAsIFtcbiAgICAgICAgRWFzeU1vZGUuUHJlc2VydmVVbmlxdWVDaGVja3MsXG4gICAgICAgIEVhc3lNb2RlLk5vU2h1ZmZsZU1pbWljcyxcbiAgICAgICAgRWFzeU1vZGUuRGVjcmVhc2VFbmVteURhbWFnZSxcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlUmVmcmVzaCxcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlU3RhcnRpbmdTd29yZCxcbiAgICAgICAgRWFzeU1vZGUuRXhwZXJpZW5jZVNjYWxlc0Zhc3RlcixcbiAgICAgICAgUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsXG4gICAgICAgIFZhbmlsbGEuU2hvcHMsXG4gICAgICAgIFZhbmlsbGEuRHluYSxcbiAgICAgICAgW1ZhbmlsbGEuTWFwcywgJyEnXSxcbiAgICAgICAgW1ZhbmlsbGEuV2lsZFdhcnAsICchJ10sXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgQ2xhc3NpYyA9IG5ldyBQcmVzZXQodGhpcywgJ0NsYXNzaWMnLCBgXG4gICAgICBQcm92aWRlcyBhIHJlbGF0aXZlbHkgcXVpY2sgcGxheXRob3VnaCB3aXRoIGEgcmVhc29uYWJsZSBhbW91bnQgb2ZcbiAgICAgIGNoYWxsZW5nZS4gIFNpbWlsYXIgdG8gb2xkZXIgdmVyc2lvbnMuYCwgW1xuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVTdGFydGluZ1N3b3JkLFxuICAgICAgICBHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsXG4gICAgICAgIFtSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgJyEnXSxcbiAgICAgICAgW1ZhbmlsbGEuTWFwcywgJyEnXSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBTdGFuZGFyZCA9IG5ldyBQcmVzZXQodGhpcywgJ1N0YW5kYXJkJywgYFxuICAgICAgV2VsbC1iYWxhbmNlZCwgc3RhbmRhcmQgcmFjZSBmbGFncy5gLCBbXG4gICAgICAgIC8vIG5vIGZsYWdzPyAgYWxsIGRlZmF1bHQ/XG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IE5vQm93TW9kZSA9IG5ldyBQcmVzZXQodGhpcywgJ05vIEJvdyBNb2RlJywgYFxuICAgICAgVGhlIHRvd2VyIGlzIG9wZW4gZnJvbSB0aGUgc3RhcnQsIGFzIHNvb24gYXMgeW91J3JlIHJlYWR5IGZvciBpdC5gLCBbXG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIE1vbnN0ZXJzLlRvd2VyUm9ib3RzLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgUm91dGluZy5Ob0Jvd01vZGUsXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgQWR2YW5jZWQgPSBuZXcgUHJlc2V0KHRoaXMsICdBZHZhbmNlZCcsIGBcbiAgICAgIEEgYmFsYW5jZWQgcmFuZG9taXphdGlvbiB3aXRoIHF1aXRlIGEgYml0IG1vcmUgZGlmZmljdWx0eS5gLCBbXG4gICAgICAgIEdsaXRjaGVzLkdoZXR0b0ZsaWdodCxcbiAgICAgICAgR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCxcbiAgICAgICAgR2xpdGNoZXMuU3RhdHVlR2xpdGNoLFxuICAgICAgICBbR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gsICchJ10sXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXJyaWVyLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsXG4gICAgICAgIE5vR3VhcmFudGVlcy5HYXNNYXNrLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgV29ybGQuUmFuZG9taXplTWFwcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplVHJhZGVzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsXG4gICAgICAgIFdvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IFdpbGRXYXJwID0gbmV3IFByZXNldCh0aGlzLCAnV2lsZCBXYXJwJywgYFxuICAgICAgU2lnbmlmaWNhbnRseSBvcGVucyB1cCB0aGUgZ2FtZSByaWdodCBmcm9tIHRoZSBzdGFydCB3aXRoIHdpbGRcbiAgICAgIHdhcnAgaW4gbG9naWMuYCwgW1xuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVSZWZyZXNoLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXaWxkV2FycCxcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBIYXJkY29yZSA9IG5ldyBQcmVzZXQodGhpcywgJ0hhcmRjb3JlJywgYFxuICAgICAgTm90IGZvciB0aGUgZmFpbnQgb2YgaGVhcnQuICBHb29kIGx1Y2suYCwgW1xuICAgICAgICBOb0d1YXJhbnRlZXMuQmFycmllcixcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLFxuICAgICAgICBIYXJkTW9kZS5FeHBlcmllbmNlU2NhbGVzU2xvd2VyLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgSGFyZE1vZGUuUGVybWFkZWF0aCxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVNYXBzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVUcmFkZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyxcbiAgICAgICAgV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsXG4gICAgICBdKTtcblxuICByZWFkb25seSBGdWxsU3R1cGlkID0gbmV3IFByZXNldCh0aGlzLCAnVGhlIEZ1bGwgU3R1cGlkJywgYFxuICAgICAgTm9ib2R5IGhhcyBldmVyIGNvbXBsZXRlZCB0aGlzLiAgQmUgc3VyZSB0byByZWNvcmQgdGhpcyBiZWNhdXNlXG4gICAgICBwaWNzIG9yIGl0IGRpZG4ndCBoYXBwZW4uYCwgWyBcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhcnJpZXIsXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXR0bGVNYWdpYyxcbiAgICAgICAgSGFyZE1vZGUuQmxhY2tvdXQsXG4gICAgICAgIEhhcmRNb2RlLkV4cGVyaWVuY2VTY2FsZXNTbG93ZXIsXG4gICAgICAgIEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyLFxuICAgICAgICBIYXJkTW9kZS5QZXJtYWRlYXRoLFxuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBNb25zdGVycy5Ub3dlclJvYm90cyxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVNYXBzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVUcmFkZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUdvYUZsb29ycyxcbiAgICAgICAgV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsXG4gICAgICBdKTtcblxuICByZWFkb25seSBNeXN0ZXJ5ID0gbmV3IFByZXNldCh0aGlzLCAnTXlzdGVyeScsIGBcbiAgICAgIEV2ZW4gdGhlIG9wdGlvbnMgYXJlIHJhbmRvbS5gLCBbXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVNYXBzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplVHJhZGVzLCAnPyddLFxuICAgICAgICBbV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsICc/J10sXG4gICAgICAgIFtXb3JsZC5TaHVmZmxlR29hRmxvb3JzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplU3ByaXRlQ29sb3JzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplV2lsZFdhcnAsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuTm9Cb3dNb2RlLCAnPyddLFxuICAgICAgICBbUm91dGluZy5TdG9yeU1vZGUsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLlZhbmlsbGFEb2xwaGluLCAnPyddLFxuICAgICAgICBbUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5SYWdlU2tpcCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlRyaWdnZXJTa2lwLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuU3RhdHVlR2xpdGNoLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuR2hldHRvRmxpZ2h0LCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwLCAnPyddLFxuICAgICAgICBbQWVzdGhldGljcy5SYW5kb21pemVNdXNpYywgJz8nXSxcbiAgICAgICAgW0Flc3RoZXRpY3MuUmFuZG9taXplTWFwQ29sb3JzLCAnPyddLFxuICAgICAgICBbTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcywgJz8nXSxcbiAgICAgICAgW01vbnN0ZXJzLlRvd2VyUm9ib3RzLCAnPyddLFxuICAgICAgICBbRWFzeU1vZGUuTm9TaHVmZmxlTWltaWNzLCAnPyddLFxuICAgICAgICBbRWFzeU1vZGUuUHJlc2VydmVVbmlxdWVDaGVja3MsICc/J10sXG4gICAgICAgIFtOb0d1YXJhbnRlZXMuQmFycmllciwgJz8nXSxcbiAgICAgICAgW05vR3VhcmFudGVlcy5CYXR0bGVNYWdpYywgJz8nXSxcbiAgICAgICAgW05vR3VhcmFudGVlcy5HYXNNYXNrLCAnPyddLFxuICAgICAgICBbVmFuaWxsYS5EeW5hLCAnPyddLFxuICAgICAgICBbVmFuaWxsYS5Cb251c0l0ZW1zLCAnPyddLFxuICAgICAgICBbVmFuaWxsYS5NYXBzLCAnPyddLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRmxhZ1NlY3Rpb24ge1xuICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZTogRmxhZ1NlY3Rpb247XG4gIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IHNlY3Rpb25zID0gbmV3IFNldDxGbGFnU2VjdGlvbj4oKTtcblxuICBzdGF0aWMgYWxsKCk6IEZsYWdTZWN0aW9uW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5zZWN0aW9uc107XG4gIH1cblxuICBwcm90ZWN0ZWQgc3RhdGljIGZsYWcobmFtZTogc3RyaW5nLCBvcHRzOiBhbnkpOiBGbGFnIHtcbiAgICBGbGFnU2VjdGlvbi5zZWN0aW9ucy5hZGQoXG4gICAgICAgIHRoaXMuaW5zdGFuY2UgfHwgKHRoaXMuaW5zdGFuY2UgPSBuZXcgKHRoaXMgYXMgYW55KSgpKSk7XG4gICAgY29uc3QgZmxhZyA9IG5ldyBGbGFnKG5hbWUsIG9wdHMpO1xuICAgIGlmICghbmFtZS5zdGFydHNXaXRoKHRoaXMuaW5zdGFuY2UucHJlZml4KSkgdGhyb3cgbmV3IEVycm9yKGBiYWQgZmxhZ2ApO1xuICAgIHRoaXMuaW5zdGFuY2UuZmxhZ3Muc2V0KG5hbWUsIGZsYWcpO1xuICAgIHJldHVybiBmbGFnO1xuICB9XG5cbiAgYWJzdHJhY3QgcmVhZG9ubHkgcHJlZml4OiBzdHJpbmc7XG4gIGFic3RyYWN0IHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gIHJlYWRvbmx5IGZsYWdzID0gbmV3IE1hcDxzdHJpbmcsIEZsYWc+KCk7XG59XG5cbmNsYXNzIFdvcmxkIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnVyc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnV29ybGQnO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVNYXBzID0gV29ybGQuZmxhZygnV20nLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBtYXBzJyxcbiAgICB0ZXh0OiBgSW5kaXZpZHVhbCBtYXBzIGFyZSByYW5kb21pemVkLiAgRm9yIG5vdyB0aGlzIGlzIG9ubHkgYSBzdWJzZXQgb2ZcbiAgICAgICAgICAgcG9zc2libGUgbWFwcy4gIEEgcmFuZG9taXplZCBtYXAgd2lsbCBoYXZlIGFsbCB0aGUgc2FtZSBmZWF0dXJlc1xuICAgICAgICAgICAoZXhpdHMsIGNoZXN0cywgTlBDcywgZXRjKSBleGNlcHQgdGhpbmdzIGFyZSBtb3ZlZCBhcm91bmQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplVHJhZGVzID0gV29ybGQuZmxhZygnV3QnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSB0cmFkZS1pbiBpdGVtcycsXG4gICAgdGV4dDogYEl0ZW1zIGV4cGVjdGVkIGJ5IHZhcmlvdXMgTlBDcyB3aWxsIGJlIHNodWZmbGVkOiBzcGVjaWZpY2FsbHksXG4gICAgICAgICAgIFN0YXR1ZSBvZiBPbnl4LCBLaXJpc2EgUGxhbnQsIExvdmUgUGVuZGFudCwgSXZvcnkgU3RhdHVlLCBGb2dcbiAgICAgICAgICAgTGFtcCwgYW5kIEZsdXRlIG9mIExpbWUgKGZvciBBa2FoYW5hKS4gIFJhZ2Ugd2lsbCBleHBlY3QgYVxuICAgICAgICAgICByYW5kb20gc3dvcmQsIGFuZCBUb3JuZWwgd2lsbCBleHBlY3QgYSByYW5kb20gYnJhY2VsZXQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVW5pZGVudGlmaWVkS2V5SXRlbXMgPSBXb3JsZC5mbGFnKCdXdScsIHtcbiAgICBuYW1lOiAnVW5pZGVudGlmaWVkIGtleSBpdGVtcycsXG4gICAgdGV4dDogYEl0ZW0gbmFtZXMgd2lsbCBiZSBnZW5lcmljIGFuZCBlZmZlY3RzIHdpbGwgYmUgc2h1ZmZsZWQuICBUaGlzXG4gICAgICAgICAgIGluY2x1ZGVzIGtleXMsIGZsdXRlcywgbGFtcHMsIGFuZCBzdGF0dWVzLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVdhbGxFbGVtZW50cyA9IFdvcmxkLmZsYWcoJ1dlJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgZWxlbWVudHMgdG8gYnJlYWsgd2FsbHMnLFxuICAgIHRleHQ6IGBXYWxscyB3aWxsIHJlcXVpcmUgYSByYW5kb21pemVkIGVsZW1lbnQgdG8gYnJlYWsuICBOb3JtYWwgcm9jayBhbmRcbiAgICAgICAgICAgaWNlIHdhbGxzIHdpbGwgaW5kaWNhdGUgdGhlIHJlcXVpcmVkIGVsZW1lbnQgYnkgdGhlIGNvbG9yIChsaWdodFxuICAgICAgICAgICBncmV5IG9yIHllbGxvdyBmb3Igd2luZCwgYmx1ZSBmb3IgZmlyZSwgYnJpZ2h0IG9yYW5nZSAoXCJlbWJlcnNcIikgZm9yXG4gICAgICAgICAgIHdhdGVyLCBvciBkYXJrIGdyZXkgKFwic3RlZWxcIikgZm9yIHRodW5kZXIuICBUaGUgZWxlbWVudCB0byBicmVha1xuICAgICAgICAgICB0aGVzZSB3YWxscyBpcyB0aGUgc2FtZSB0aHJvdWdob3V0IGFuIGFyZWEuICBJcm9uIHdhbGxzIHJlcXVpcmUgYVxuICAgICAgICAgICBvbmUtb2ZmIHJhbmRvbSBlbGVtZW50LCB3aXRoIG5vIHZpc3VhbCBjdWUsIGFuZCB0d28gd2FsbHMgaW4gdGhlXG4gICAgICAgICAgIHNhbWUgYXJlYSBtYXkgaGF2ZSBkaWZmZXJlbnQgcmVxdWlyZW1lbnRzLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTaHVmZmxlR29hRmxvb3JzID0gV29ybGQuZmxhZygnV2cnLCB7XG4gICAgbmFtZTogJ1NodWZmbGUgR29hIGZvcnRyZXNzIGZsb29ycycsXG4gICAgLy8gVE9ETyAtIHNodWZmbGUgdGhlIGFyZWEtdG8tYm9zcyBjb25uZWN0aW9ucywgdG9vLlxuICAgIHRleHQ6IGBUaGUgZm91ciBhcmVhcyBvZiBHb2EgZm9ydHJlc3Mgd2lsbCBhcHBlYXIgaW4gYSByYW5kb20gb3JkZXIuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVNwcml0ZUNvbG9ycyA9IFdvcmxkLmZsYWcoJ1dzJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgc3ByaXRlIGNvbG9ycycsXG4gICAgdGV4dDogYE1vbnN0ZXJzIGFuZCBOUENzIHdpbGwgaGF2ZSBkaWZmZXJlbnQgY29sb3JzLiAgVGhpcyBpcyBub3QgYW5cbiAgICAgICAgICAgb3B0aW9uYWwgZmxhZyBiZWNhdXNlIGl0IGFmZmVjdHMgd2hhdCBtb25zdGVycyBjYW4gYmUgZ3JvdXBlZFxuICAgICAgICAgICB0b2dldGhlci5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplV2lsZFdhcnAgPSBXb3JsZC5mbGFnKCdXdycsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIHdpbGQgd2FycCcsXG4gICAgdGV4dDogYFdpbGQgd2FycCB3aWxsIGdvIHRvIE1lemFtZSBTaHJpbmUgYW5kIDE1IG90aGVyIHJhbmRvbSBsb2NhdGlvbnMuXG4gICAgICAgICAgIFRoZXNlIGxvY2F0aW9ucyB3aWxsIGJlIGNvbnNpZGVyZWQgaW4tbG9naWMuYCxcbiAgICBleGNsdWRlczogWydWdyddLFxuICB9KTtcbn1cblxuY2xhc3MgUm91dGluZyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1InO1xuICByZWFkb25seSBuYW1lID0gJ1JvdXRpbmcnO1xuXG4gIHN0YXRpYyByZWFkb25seSBTdG9yeU1vZGUgPSBSb3V0aW5nLmZsYWcoJ1JzJywge1xuICAgIG5hbWU6ICdTdG9yeSBNb2RlJyxcbiAgICB0ZXh0OiBgRHJheWdvbiAyIHdvbid0IHNwYXduIHVubGVzcyB5b3UgaGF2ZSBhbGwgZm91ciBzd29yZHMgYW5kIGhhdmVcbiAgICAgICAgICAgZGVmZWF0ZWQgYWxsIG1ham9yIGJvc3NlcyBvZiB0aGUgdGV0cmFyY2h5LmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb0Jvd01vZGUgPSBSb3V0aW5nLmZsYWcoJ1JiJywge1xuICAgIG5hbWU6ICdObyBCb3cgbW9kZScsXG4gICAgdGV4dDogYE5vIGl0ZW1zIGFyZSByZXF1aXJlZCB0byBmaW5pc2ggdGhlIGdhbWUuICBBbiBleGl0IGlzIGFkZGVkIGZyb21cbiAgICAgICAgICAgTWV6YW1lIHNocmluZSBkaXJlY3RseSB0byB0aGUgRHJheWdvbiAyIGZpZ2h0IChhbmQgdGhlIG5vcm1hbCBlbnRyYW5jZVxuICAgICAgICAgICBpcyByZW1vdmVkKS4gIERyYXlnb24gMiBzcGF3bnMgYXV0b21hdGljYWxseSB3aXRoIG5vIEJvdyBvZiBUcnV0aC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgT3Jic05vdFJlcXVpcmVkID0gUm91dGluZy5mbGFnKCdSbycsIHtcbiAgICBuYW1lOiAnT3JicyBub3QgcmVxdWlyZWQgdG8gYnJlYWsgd2FsbHMnLFxuICAgIHRleHQ6IGBXYWxscyBjYW4gYmUgYnJva2VuIGFuZCBicmlkZ2VzIGZvcm1lZCB3aXRoIGxldmVsIDEgc2hvdHMuYFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9UaHVuZGVyU3dvcmRXYXJwID0gUm91dGluZy5mbGFnKCdSdCcsIHtcbiAgICBuYW1lOiAnTm8gU3dvcmQgb2YgVGh1bmRlciB3YXJwJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHkgd2hlbiBhY3F1aXJpbmcgdGhlIHRodW5kZXIgc3dvcmQsIHRoZSBwbGF5ZXIgaXMgaW5zdGFudGx5XG4gICAgICAgICAgIHdhcnBlZCB0byBhIHJhbmRvbSB0b3duLiAgVGhpcyBmbGFnIGRpc2FibGVzIHRoZSB3YXJwLiAgSWYgc2V0IGFzXG4gICAgICAgICAgIFwiUiF0XCIsIHRoZW4gdGhlIHdhcnAgd2lsbCBhbHdheXMgZ28gdG8gU2h5cm9uLCBsaWtlIGluIHZhbmlsbGEuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVmFuaWxsYURvbHBoaW4gPSBSb3V0aW5nLmZsYWcoJ1JkJywge1xuICAgIG5hbWU6ICdWYW5pbGxhIERvbHBoaW4gaW50ZXJhY3Rpb25zJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgdGhlIHJhbmRvbWl6ZXIgY2hhbmdlcyBhIG51bWJlciBvZiBkb2xwaGluIGFuZCBib2F0XG4gICAgICAgICAgIGludGVyYWN0aW9uczogKDEpIGhlYWxpbmcgdGhlIGRvbHBoaW4gYW5kIGhhdmluZyB0aGUgU2hlbGwgRmx1dGVcbiAgICAgICAgICAgaXMgbm8gbG9uZ2VyIHJlcXVpcmVkIGJlZm9yZSB0aGUgZmlzaGVybWFuIHNwYXduczogaW5zdGVhZCwgaGVcbiAgICAgICAgICAgd2lsbCBzcGF3biBhcyBzb29uIGFzIHlvdSBoYXZlIHRoZSBpdGVtIGhlIHdhbnRzOyAoMikgdGFsa2luZyB0b1xuICAgICAgICAgICBLZW5zdSBpbiB0aGUgYmVhY2ggY2FiaW4gaXMgbm8gbG9uZ2VyIHJlcXVpcmVkIGZvciB0aGUgU2hlbGwgRmx1dGVcbiAgICAgICAgICAgdG8gd29yazogaW5zdGVhZCwgdGhlIFNoZWxsIEZsdXRlIHdpbGwgYWx3YXlzIHdvcmssIGFuZCBLZW5zdSB3aWxsXG4gICAgICAgICAgIHNwYXduIGFmdGVyIHRoZSBGb2cgTGFtcCBpcyB0dXJuZWQgaW4gYW5kIHdpbGwgZ2l2ZSBhIGtleSBpdGVtXG4gICAgICAgICAgIGNoZWNrLiAgVGhpcyBmbGFnIHJlc3RvcmVzIHRoZSB2YW5pbGxhIGludGVyYWN0aW9uIHdoZXJlIGhlYWxpbmdcbiAgICAgICAgICAgYW5kIHNoZWxsIGZsdXRlIGFyZSByZXF1aXJlZC5gLFxuICB9KTtcbn1cblxuY2xhc3MgR2xpdGNoZXMgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdHJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdHbGl0Y2hlcyc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgQnkgZGVmYXVsdCwgdGhlIHJhbmRvbWl6ZXIgZGlzYWJsZXMgYWxsIGtub3duIGdsaXRjaGVzIChleGNlcHQgZ2hldHRvXG4gICAgICBmbGlnaHQpLiAgVGhlc2UgZmxhZ3Mgc2VsZWN0aXZlbHkgcmUtZW5hYmxlIGNlcnRhaW4gZ2xpdGNoZXMuICBNb3N0IG9mXG4gICAgICB0aGVzZSBmbGFncyBoYXZlIHR3byBtb2Rlczogbm9ybWFsbHkgZW5hYmxpbmcgYSBnbGl0Y2ggd2lsbCBhZGQgaXQgYXNcbiAgICAgIHBvc3NpYmx5IHJlcXVpcmVkIGJ5IGxvZ2ljLCBidXQgY2xpY2tpbmcgYSBzZWNvbmQgdGltZSB3aWxsIGFkZCBhICchJ1xuICAgICAgYW5kIGVuYWJsZSB0aGUgZ2xpdGNoIG91dHNpZGUgb2YgbG9naWMgKGUuZy4gXCJHIWNcIikuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgR2hldHRvRmxpZ2h0ID0gR2xpdGNoZXMuZmxhZygnR2YnLCB7XG4gICAgbmFtZTogJ0doZXR0byBmbGlnaHQnLFxuICAgIHRleHQ6IGBHaGV0dG8gZmxpZ2h0IGFsbG93cyB1c2luZyBEb2xwaGluIGFuZCBSYWJiaXQgQm9vdHMgdG8gZmx5IHVwIHRoZVxuICAgICAgICAgICB3YXRlcmZhbGxzIGluIHRoZSBBbmdyeSBTZWEgKHdpdGhvdXQgY2FsbWluZyB0aGUgd2hpcmxwb29scykuXG4gICAgICAgICAgIFRoaXMgaXMgZG9uZSBieSBzd2ltbWluZyB1cCB0byBhIGRpYWdvbmFsIGJlYWNoIGFuZCBqdW1waW5nXG4gICAgICAgICAgIGluIGEgZGlmZmVyZW50IGRpcmVjdGlvbiBpbW1lZGlhdGVseSBiZWZvcmUgZGlzZW1iYXJraW5nLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTdGF0dWVHbGl0Y2ggPSBHbGl0Y2hlcy5mbGFnKCdHcycsIHtcbiAgICBuYW1lOiAnU3RhdHVlIGdsaXRjaCcsXG4gICAgdGV4dDogYFN0YXR1ZSBnbGl0Y2ggYWxsb3dzIGdldHRpbmcgYmVoaW5kIHN0YXR1ZXMgdGhhdCBibG9jayBjZXJ0YWluXG4gICAgICAgICAgIGVudHJhbmNlczogdGhlIGd1YXJkcyBpbiBQb3J0b2EsIEFtYXpvbmVzLCBPYWssIEdvYSwgYW5kIFNoeXJvbixcbiAgICAgICAgICAgYXMgd2VsbCBhcyB0aGUgc3RhdHVlcyBpbiB0aGUgV2F0ZXJmYWxsIENhdmUuICBJdCBpcyBkb25lIGJ5XG4gICAgICAgICAgIGFwcHJvYWNoaW5nIHRoZSBzdGF0dWUgZnJvbSB0aGUgdG9wIHJpZ2h0IGFuZCBob2xkaW5nIGRvd24gYW5kXG4gICAgICAgICAgIGxlZnQgb24gdGhlIGNvbnRyb2xsZXIgd2hpbGUgbWFzaGluZyBCLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE10U2FicmVSZXF1aXJlbWVudFNraXAgPSBHbGl0Y2hlcy5mbGFnKCdHbicsIHtcbiAgICBuYW1lOiAnTXQgU2FicmUgcmVxdWlyZW1lbnRzIHNraXAnLFxuICAgIHRleHQ6IGBFbnRlcmluZyBNdCBTYWJyZSBOb3J0aCBub3JtYWxseSByZXF1aXJlcyAoMSkgaGF2aW5nIFRlbGVwb3J0LFxuICAgICAgICAgICBhbmQgKDIpIHRhbGtpbmcgdG8gdGhlIHJhYmJpdCBpbiBMZWFmIGFmdGVyIHRoZSBhYmR1Y3Rpb24gKHZpYVxuICAgICAgICAgICBUZWxlcGF0aHkpLiAgQm90aCBvZiB0aGVzZSByZXF1aXJlbWVudHMgY2FuIGJlIHNraXBwZWQ6IGZpcnN0IGJ5XG4gICAgICAgICAgIGZseWluZyBvdmVyIHRoZSByaXZlciBpbiBDb3JkZWwgcGxhaW4gcmF0aGVyIHRoYW4gY3Jvc3NpbmcgdGhlXG4gICAgICAgICAgIGJyaWRnZSwgYW5kIHRoZW4gYnkgdGhyZWFkaW5nIHRoZSBuZWVkbGUgYmV0d2VlbiB0aGUgaGl0Ym94ZXMgaW5cbiAgICAgICAgICAgTXQgU2FicmUgTm9ydGguYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU3RhdHVlR2F1bnRsZXRTa2lwID0gR2xpdGNoZXMuZmxhZygnR2cnLCB7XG4gICAgbmFtZTogJ1N0YXR1ZSBndWFudGxldCBza2lwJyxcbiAgICB0ZXh0OiBgVGhlIHNob290aW5nIHN0YXR1ZXMgaW4gZnJvbnQgb2YgR29hIGFuZCBTdHh5IG5vcm1hbGx5IHJlcXVpcmVcbiAgICAgICAgICAgQmFycmllciB0byBwYXNzIHNhZmVseS4gIFdpdGggdGhpcyBmbGFnLCBGbGlnaHQgY2FuIGFsc28gYmUgdXNlZFxuICAgICAgICAgICBieSBmbHlpbmcgYXJvdW5kIHRoZSBlZGdlIG9mIHRoZSBzdGF0dWUuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU3dvcmRDaGFyZ2VHbGl0Y2ggPSBHbGl0Y2hlcy5mbGFnKCdHYycsIHtcbiAgICBuYW1lOiAnU3dvcmQgY2hhcmdlIGdsaXRjaCcsXG4gICAgdGV4dDogYFN3b3JkIGNoYXJnZSBnbGl0Y2ggYWxsb3dzIGNoYXJnaW5nIG9uZSBzd29yZCB0byB0aGUgbGV2ZWwgb2ZcbiAgICAgICAgICAgYW5vdGhlciBzd29yZCBieSBlcXVpcHBpbmcgdGhlIGhpZ2hlci1sZXZlbCBzd29yZCwgcmUtZW50ZXJpbmdcbiAgICAgICAgICAgdGhlIG1lbnUsIGNoYW5naW5nIHRvIHRoZSBsb3dlci1sZXZlbCBzd29yZCB3aXRob3V0IGV4aXRpbmcgdGhlXG4gICAgICAgICAgIG1lbnUsIGNyZWF0aW5nIGEgaGFyZCBzYXZlLCByZXNldHRpbmcsIGFuZCB0aGVuIGNvbnRpbnVpbmcuYCxcbiAgICBoYXJkOiB0cnVlLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBUcmlnZ2VyU2tpcCA9IEdsaXRjaGVzLmZsYWcoJ0d0Jywge1xuICAgIG5hbWU6ICdUcmlnZ2VyIHNraXAnLFxuICAgIHRleHQ6IGBBIHdpZGUgdmFyaWV0eSBvZiB0cmlnZ2VycyBhbmQgZXhpdCBzcXVhcmVzIGNhbiBiZSBza2lwcGVkIGJ5XG4gICAgICAgICAgIHVzaW5nIGFuIGludmFsaWQgaXRlbSBldmVyeSBmcmFtZSB3aGlsZSB3YWxraW5nLiAgVGhpcyBhbGxvd3NcbiAgICAgICAgICAgYnlwYXNzaW5nIGJvdGggTXQgU2FicmUgZW50cmFuY2UgdHJpZ2dlcnMsIHRoZSBFdmlsIFNwaXJpdCBJc2xhbmRcbiAgICAgICAgICAgZW50cmFuY2UgdHJpZ2dlciwgdHJpZ2dlcnMgZm9yIGd1YXJkcyB0byBtb3ZlLCBzbG9wZXMsIGFuZCBzZWFtbGVzc1xuICAgICAgICAgICBtYXAgdHJhbnNpdGlvbnMuYCxcbiAgICBoYXJkOiB0cnVlLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYWdlU2tpcCA9IEdsaXRjaGVzLmZsYWcoJ0dyJywge1xuICAgIG5hbWU6ICdSYWdlIHNraXAnLFxuICAgIHRleHQ6IGBSYWdlIGNhbiBiZSBza2lwcGVkIGJ5IGRhbWFnZS1ib29zdGluZyBkaWFnb25hbGx5IGludG8gdGhlIExpbWVcbiAgICAgICAgICAgVHJlZSBMYWtlIHNjcmVlbi4gIFRoaXMgcHJvdmlkZXMgYWNjZXNzIHRvIHRoZSBhcmVhIGJleW9uZCB0aGVcbiAgICAgICAgICAgbGFrZSBpZiBmbGlnaHQgb3IgYnJpZGdlcyBhcmUgYXZhaWxhYmxlLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcbn1cblxuY2xhc3MgQWVzdGhldGljcyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0EnO1xuICByZWFkb25seSBuYW1lID0gJ0Flc3RoZXRpY3MnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZXNlIGZsYWdzIGRvbid0IGRpcmVjdGx5IGFmZmVjdCBnYW1lcGxheSBvciBzaHVmZmxpbmcsIGJ1dCB0aGV5IGRvXG4gICAgICBhZmZlY3QgdGhlIGV4cGVyaWVuY2Ugc2lnbmlmaWNhbnRseSBlbm91Z2ggdGhhdCB0aGVyZSBhcmUgdGhyZWUgbW9kZXNcbiAgICAgIGZvciBlYWNoOiBcIm9mZlwiLCBcIm9wdGlvbmFsXCIgKG5vIGV4Y2xhbWF0aW9uIHBvaW50KSwgYW5kIFwicmVxdWlyZWRcIlxuICAgICAgKGV4Y2xhbWF0aW9uIHBvaW50KS4gIFRoZSBmaXJzdCB0d28gYXJlIGVxdWl2YWxlbnQgZm9yIHNlZWQgZ2VuZXJhdGlvblxuICAgICAgcHVycG9zZXMsIHNvIHRoYXQgeW91IGNhbiBwbGF5IHRoZSBzYW1lIHNlZWQgd2l0aCBlaXRoZXIgc2V0dGluZy5cbiAgICAgIFNldHRpbmcgaXQgdG8gXCIhXCIgd2lsbCBjaGFuZ2UgdGhlIHNlZWQuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplTXVzaWMgPSBBZXN0aGV0aWNzLmZsYWcoJ0FtJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgYmFja2dyb3VuZCBtdXNpYycsXG4gICAgbW9kZXM6ICchJyxcbiAgICBvcHRpb25hbDogTk9fQkFORyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vTXVzaWMgPSBBZXN0aGV0aWNzLmZsYWcoJ0FzJywge1xuICAgIG5hbWU6ICdObyBiYWNrZ3JvdW5kIG11c2ljJyxcbiAgICBvcHRpb25hbDogT1BUSU9OQUwsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVNYXBDb2xvcnMgPSBBZXN0aGV0aWNzLmZsYWcoJ0FjJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgbWFwIGNvbG9ycycsXG4gICAgbW9kZXM6ICchJyxcbiAgICBvcHRpb25hbDogTk9fQkFORyxcbiAgfSk7XG59XG5cbmNsYXNzIE1vbnN0ZXJzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnTSc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnTW9uc3RlcnMnO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVXZWFrbmVzc2VzID0gTW9uc3RlcnMuZmxhZygnTWUnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBtb25zdGVyIHdlYWtuZXNzZXMnLFxuICAgIHRleHQ6IGBNb25zdGVyIGFuZCBib3NzIGVsZW1lbnRhbCB3ZWFrbmVzc2VzIGFyZSBzaHVmZmxlZC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVG93ZXJSb2JvdHMgPSBNb25zdGVycy5mbGFnKCdNdCcsIHtcbiAgICBuYW1lOiAnU2h1ZmZsZSB0b3dlciByb2JvdHMnLFxuICAgIHRleHQ6IGBUb3dlciByb2JvdHMgd2lsbCBiZSBzaHVmZmxlZCBpbnRvIHRoZSBub3JtYWwgcG9vbC4gIEF0IHNvbWVcbiAgICAgICAgICAgcG9pbnQsIG5vcm1hbCBtb25zdGVycyBtYXkgYmUgc2h1ZmZsZWQgaW50byB0aGUgdG93ZXIgYXMgd2VsbC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xufVxuXG5jbGFzcyBFYXN5TW9kZSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0UnO1xuICByZWFkb25seSBuYW1lID0gJ0Vhc3kgTW9kZSc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlIGZvbGxvd2luZyBvcHRpb25zIG1ha2UgcGFydHMgb2YgdGhlIGdhbWUgZWFzaWVyLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vU2h1ZmZsZU1pbWljcyA9IEVhc3lNb2RlLmZsYWcoJ0V0Jywge1xuICAgIG5hbWU6IGBEb24ndCBzaHVmZmxlIG1pbWljcy5gLFxuICAgIHRleHQ6IGBNaW1pY3Mgd2lsbCBiZSBpbiB0aGVpciB2YW5pbGxhIGxvY2F0aW9ucy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUHJlc2VydmVVbmlxdWVDaGVja3MgPSBFYXN5TW9kZS5mbGFnKCdFdScsIHtcbiAgICBuYW1lOiAnS2VlcCB1bmlxdWUgaXRlbXMgYW5kIGNvbnN1bWFibGVzIHNlcGFyYXRlJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHkgYWxsIGl0ZW1zIGFuZCBtaW1pY3MgYXJlIHNodWZmbGVkIGludG8gYSBzaW5nbGUgcG9vbCBhbmRcbiAgICAgICAgICAgZGlzdHJpYnV0ZWQgZnJvbSB0aGVyZS4gIElmIHRoaXMgZmxhZyBpcyBzZXQsIHVuaXF1ZSBpdGVtc1xuICAgICAgICAgICAoc3BlY2lmaWNhbGx5LCBhbnl0aGluZyB0aGF0IGNhbm5vdCBiZSBzb2xkKSB3aWxsIG9ubHkgYmUgZm91bmQgaW5cbiAgICAgICAgICAgZWl0aGVyIChhKSBjaGVja3MgdGhhdCBoZWxkIHVuaXF1ZSBpdGVtcyBpbiB2YW5pbGxhLCBvciAoYikgYm9zc1xuICAgICAgICAgICBkcm9wcy4gIENoZXN0cyBjb250YWluaW5nIGNvbnN1bWFibGVzIGluIHZhbmlsbGEgbWF5IGJlIHNhZmVseVxuICAgICAgICAgICBpZ25vcmVkLCBidXQgY2hlc3RzIGNvbnRhaW5pbmcgdW5pcXVlIGl0ZW1zIGluIHZhbmlsbGEgbWF5IHN0aWxsXG4gICAgICAgICAgIGVuZCB1cCB3aXRoIG5vbi11bmlxdWUgaXRlbXMgYmVjYXVzZSBvZiBib3NzZXMgbGlrZSBWYW1waXJlIDIgdGhhdFxuICAgICAgICAgICBkcm9wIGNvbnN1bWFibGVzLiAgSWYgbWltaWNzIGFyZSBzaHVmZmxlZCwgdGhleSB3aWxsIG9ubHkgYmUgaW5cbiAgICAgICAgICAgY29uc3VtYWJsZSBsb2NhdGlvbnMuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IERlY3JlYXNlRW5lbXlEYW1hZ2UgPSBFYXN5TW9kZS5mbGFnKCdFZCcsIHtcbiAgICBuYW1lOiAnRGVjcmVhc2UgZW5lbXkgZGFtYWdlJyxcbiAgICB0ZXh0OiBgRW5lbXkgYXR0YWNrIHBvd2VyIHdpbGwgYmUgc2lnbmlmaWNhbnRseSBkZWNyZWFzZWQgaW4gdGhlIGVhcmx5IGdhbWVcbiAgICAgICAgICAgKGJ5IGEgZmFjdG9yIG9mIDMpLiAgVGhlIGdhcCB3aWxsIG5hcnJvdyBpbiB0aGUgbWlkLWdhbWUgYW5kIGV2ZW50dWFsbHlcbiAgICAgICAgICAgcGhhc2Ugb3V0IGF0IHNjYWxpbmcgbGV2ZWwgNDAuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQgPSBFYXN5TW9kZS5mbGFnKCdFcycsIHtcbiAgICBuYW1lOiAnR3VhcmFudGVlIHN0YXJ0aW5nIHN3b3JkJyxcbiAgICB0ZXh0OiBgVGhlIExlYWYgZWxkZXIgaXMgZ3VhcmFudGVlZCB0byBnaXZlIGEgc3dvcmQuICBJdCB3aWxsIG5vdCBiZVxuICAgICAgICAgICByZXF1aXJlZCB0byBkZWFsIHdpdGggYW55IGVuZW1pZXMgYmVmb3JlIGZpbmRpbmcgdGhlIGZpcnN0IHN3b3JkLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBHdWFyYW50ZWVSZWZyZXNoID0gRWFzeU1vZGUuZmxhZygnRXInLCB7XG4gICAgbmFtZTogJ0d1YXJhbnRlZSByZWZyZXNoJyxcbiAgICB0ZXh0OiBgR3VhcmFudGVlcyB0aGUgUmVmcmVzaCBzcGVsbCB3aWxsIGJlIGF2YWlsYWJsZSBiZWZvcmUgZmlnaHRpbmdcbiAgICAgICAgICAgVGV0cmFyY2hzLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBFeHBlcmllbmNlU2NhbGVzRmFzdGVyID0gRWFzeU1vZGUuZmxhZygnRXgnLCB7XG4gICAgbmFtZTogJ0V4cGVyaWVuY2Ugc2NhbGVzIGZhc3RlcicsXG4gICAgdGV4dDogYExlc3MgZ3JpbmRpbmcgd2lsbCBiZSByZXF1aXJlZCB0byBcImtlZXAgdXBcIiB3aXRoIHRoZSBnYW1lIGRpZmZpY3VsdHkuYCxcbiAgICBleGNsdWRlczogWydIeCddLFxuICB9KTtcbn1cblxuY2xhc3MgTm9HdWFyYW50ZWVzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnTic7XG4gIHJlYWRvbmx5IG5hbWUgPSAnTm8gZ3VhcmFudGVlcyc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgUmVtb3ZlcyB2YXJpb3VzIGd1YXJhbnRlZXMgZnJvbSB0aGUgbG9naWMuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgQmF0dGxlTWFnaWMgPSBOb0d1YXJhbnRlZXMuZmxhZygnTncnLCB7XG4gICAgbmFtZTogJ0JhdHRsZSBtYWdpYyBub3QgZ3VhcmFudGVlZCcsXG4gICAgdGV4dDogYE5vcm1hbGx5LCB0aGUgbG9naWMgd2lsbCBndWFyYW50ZWUgdGhhdCBsZXZlbCAzIHN3b3JkIGNoYXJnZXMgYXJlXG4gICAgICAgICAgIGF2YWlsYWJsZSBiZWZvcmUgZmlnaHRpbmcgdGhlIHRldHJhcmNocyAod2l0aCB0aGUgZXhjZXB0aW9uIG9mIEthcm1pbmUsXG4gICAgICAgICAgIHdobyBvbmx5IHJlcXVpcmVzIGxldmVsIDIpLiAgVGhpcyBkaXNhYmxlcyB0aGF0IGNoZWNrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE1hdGNoaW5nU3dvcmQgPSBOb0d1YXJhbnRlZXMuZmxhZygnTnMnLCB7XG4gICAgbmFtZTogJ01hdGNoaW5nIHN3b3JkIG5vdCBndWFyYW50ZWVkIChcIlRpbmsgTW9kZVwiKScsXG4gICAgdGV4dDogYEVuYWJsZXMgXCJ0aW5rIHN0cmF0c1wiLCB3aGVyZSB3cm9uZy1lbGVtZW50IHN3b3JkcyB3aWxsIHN0aWxsIGRvIGFcbiAgICAgICAgICAgc2luZ2xlIGRhbWFnZSBwZXIgaGl0LiAgUGxheWVyIG1heSBiZSByZXF1aXJlZCB0byBmaWdodCBtb25zdGVyc1xuICAgICAgICAgICAoaW5jbHVkaW5nIGJvc3Nlcykgd2l0aCB0aW5rcy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBCYXJyaWVyID0gTm9HdWFyYW50ZWVzLmZsYWcoJ05iJywge1xuICAgIG5hbWU6ICdCYXJyaWVyIG5vdCBndWFyYW50ZWVkJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHksIHRoZSBsb2dpYyB3aWxsIGd1YXJhbnRlZSBCYXJyaWVyIChvciBlbHNlIHJlZnJlc2ggYW5kIHNoaWVsZFxuICAgICAgICAgICByaW5nKSBiZWZvcmUgZW50ZXJpbmcgU3R4eSwgdGhlIEZvcnRyZXNzLCBvciBmaWdodGluZyBLYXJtaW5lLiAgVGhpc1xuICAgICAgICAgICBkaXNhYmxlcyB0aGF0IGNoZWNrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEdhc01hc2sgPSBOb0d1YXJhbnRlZXMuZmxhZygnTmcnLCB7XG4gICAgbmFtZTogJ0dhcyBtYXNrIG5vdCBndWFyYW50ZWVkJyxcbiAgICB0ZXh0OiBgVGhlIGxvZ2ljIHdpbGwgbm90IGd1YXJhbnRlZSBnYXMgbWFzayBiZWZvcmUgbmVlZGluZyB0byBlbnRlciB0aGUgc3dhbXAuXG4gICAgICAgICAgIEdhcyBtYXNrIGlzIHN0aWxsIGd1YXJhbnRlZWQgdG8ga2lsbCB0aGUgaW5zZWN0LmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG59XG5cbmNsYXNzIEhhcmRNb2RlIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnSCc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnSGFyZCBtb2RlJztcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9CdWZmTWVkaWNhbEhlcmIgPSBIYXJkTW9kZS5mbGFnKCdIbScsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYnVmZiBtZWRpY2FsIGhlcmIgb3IgZnJ1aXQgb2YgcG93ZXJgLFxuICAgIHRleHQ6IGBNZWRpY2FsIEhlcmIgaXMgbm90IGJ1ZmZlZCB0byBoZWFsIDgwIGRhbWFnZSwgd2hpY2ggaXMgaGVscGZ1bCB0byBtYWtlXG4gICAgICAgICAgIHVwIGZvciBjYXNlcyB3aGVyZSBSZWZyZXNoIGlzIHVuYXZhaWxhYmxlIGVhcmx5LiAgRnJ1aXQgb2YgUG93ZXIgaXMgbm90XG4gICAgICAgICAgIGJ1ZmZlZCB0byByZXN0b3JlIDU2IE1QLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE1heFNjYWxpbmdJblRvd2VyID0gSGFyZE1vZGUuZmxhZygnSHQnLCB7XG4gICAgbmFtZTogJ01heCBzY2FsaW5nIGxldmVsIGluIHRvd2VyJyxcbiAgICB0ZXh0OiBgRW5lbWllcyBpbiB0aGUgdG93ZXIgc3Bhd24gYXQgbWF4IHNjYWxpbmcgbGV2ZWwuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgRXhwZXJpZW5jZVNjYWxlc1Nsb3dlciA9IEhhcmRNb2RlLmZsYWcoJ0h4Jywge1xuICAgIG5hbWU6ICdFeHBlcmllbmNlIHNjYWxlcyBzbG93ZXInLFxuICAgIHRleHQ6IGBNb3JlIGdyaW5kaW5nIHdpbGwgYmUgcmVxdWlyZWQgdG8gXCJrZWVwIHVwXCIgd2l0aCB0aGUgZGlmZmljdWx0eS5gLFxuICAgIGV4Y2x1ZGVzOiBbJ0V4J10sXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IENoYXJnZVNob3RzT25seSA9IEhhcmRNb2RlLmZsYWcoJ0hjJywge1xuICAgIG5hbWU6ICdDaGFyZ2Ugc2hvdHMgb25seScsXG4gICAgdGV4dDogYFN0YWJiaW5nIGlzIGNvbXBsZXRlbHkgaW5lZmZlY3RpdmUuICBPbmx5IGNoYXJnZWQgc2hvdHMgd29yay5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBCbGFja291dCA9IEhhcmRNb2RlLmZsYWcoJ0h6Jywge1xuICAgIG5hbWU6ICdCbGFja291dCcsXG4gICAgdGV4dDogYEFsbCBjYXZlcyBhbmQgZm9ydHJlc3NlcyBhcmUgcGVybWFuZW50bHkgZGFyay5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBQZXJtYWRlYXRoID0gSGFyZE1vZGUuZmxhZygnSGgnLCB7XG4gICAgbmFtZTogJ1Blcm1hZGVhdGgnLFxuICAgIHRleHQ6IGBIYXJkY29yZSBtb2RlOiBjaGVja3BvaW50cyBhbmQgc2F2ZXMgYXJlIHJlbW92ZWQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcbn1cblxuY2xhc3MgVmFuaWxsYSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgbmFtZSA9ICdWYW5pbGxhJztcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1YnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIE9wdGlvbnMgdG8gcmVzdG9yZSB2YW5pbGxhIGJlaGF2aW9yIGNoYW5nZWQgYnkgZGVmYXVsdC5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBEeW5hID0gVmFuaWxsYS5mbGFnKCdWZCcsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYnVmZiBEeW5hYCxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgd2UgbWFrZXMgdGhlIER5bmEgZmlnaHQgYSBiaXQgbW9yZSBvZiBhIGNoYWxsZW5nZS5cbiAgICAgICAgICAgU2lkZSBwb2RzIHdpbGwgZmlyZSBzaWduaWZpY2FudGx5IG1vcmUuICBUaGUgc2FmZSBzcG90IGhhcyBiZWVuXG4gICAgICAgICAgIHJlbW92ZWQuICBUaGUgcmV2ZW5nZSBiZWFtcyBwYXNzIHRocm91Z2ggYmFycmllci4gIFNpZGUgcG9kcyBjYW5cbiAgICAgICAgICAgbm93IGJlIGtpbGxlZC4gIFRoaXMgZmxhZyBwcmV2ZW50cyB0aGF0IGNoYW5nZS5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgQm9udXNJdGVtcyA9IFZhbmlsbGEuZmxhZygnVmInLCB7XG4gICAgbmFtZTogYERvbid0IGJ1ZmYgYm9udXMgaXRlbXNgLFxuICAgIHRleHQ6IGBMZWF0aGVyIEJvb3RzIGFyZSBjaGFuZ2VkIHRvIFNwZWVkIEJvb3RzLCB3aGljaCBpbmNyZWFzZSBwbGF5ZXIgd2Fsa2luZ1xuICAgICAgICAgICBzcGVlZCAodGhpcyBhbGxvd3MgY2xpbWJpbmcgdXAgdGhlIHNsb3BlIHRvIGFjY2VzcyB0aGUgVG9ybmFkbyBCcmFjZWxldFxuICAgICAgICAgICBjaGVzdCwgd2hpY2ggaXMgdGFrZW4gaW50byBjb25zaWRlcmF0aW9uIGJ5IHRoZSBsb2dpYykuICBEZW8ncyBwZW5kYW50XG4gICAgICAgICAgIHJlc3RvcmVzIE1QIHdoaWxlIG1vdmluZy4gIFJhYmJpdCBib290cyBlbmFibGUgc3dvcmQgY2hhcmdpbmcgdXAgdG9cbiAgICAgICAgICAgbGV2ZWwgMiB3aGlsZSB3YWxraW5nIChsZXZlbCAzIHN0aWxsIHJlcXVpcmVzIGJlaW5nIHN0YXRpb25hcnksIHNvIGFzXG4gICAgICAgICAgIHRvIHByZXZlbnQgd2FzdGluZyB0b25zIG9mIG1hZ2ljKS5gLFxuICB9KTtcblxuICAvLyBUT0RPIC0gaXMgaXQgd29ydGggZXZlbiBhbGxvd2luZyB0byB0dXJuIHRoaXMgb2ZmPyE/XG4gIHN0YXRpYyByZWFkb25seSBNYXBzID0gVmFuaWxsYS5mbGFnKCdWbScsIHtcbiAgICBuYW1lOiAnVmFuaWxsYSBtYXBzJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHkgdGhlIHJhbmRvbWl6ZXIgYWRkcyBhIG5ldyBcIkVhc3QgQ2F2ZVwiIHRvIFZhbGxleSBvZiBXaW5kLFxuICAgICAgICAgICBib3Jyb3dlZCBmcm9tIHRoZSBHQkMgdmVyc2lvbiBvZiB0aGUgZ2FtZS4gIFRoaXMgY2F2ZSBjb250YWlucyB0d29cbiAgICAgICAgICAgY2hlc3RzIChvbmUgY29uc2lkZXJlZCBhIGtleSBpdGVtKSBvbiB0aGUgdXBwZXIgZmxvb3IgYW5kIGV4aXRzIHRvXG4gICAgICAgICAgIHR3byByYW5kb20gYXJlYXMgKGNob3NlbiBiZXR3ZWVuIExpbWUgVHJlZSBWYWxsZXksIENvcmRlbCBQbGFpbixcbiAgICAgICAgICAgR29hIFZhbGxleSwgb3IgRGVzZXJ0IDI7IHRoZSBxdWlja3NhbmQgaXMgcmVtb3ZlZCBmcm9tIHRoZSBlbnRyYW5jZXNcbiAgICAgICAgICAgdG8gUHlyYW1pZCBhbmQgQ3J5cHQpLCBvbmUgdW5ibG9ja2VkIG9uIHRoZSBsb3dlciBmbG9vciwgYW5kIG9uZVxuICAgICAgICAgICBkb3duIHRoZSBzdGFpcnMgYW5kIGJlaGluZCBhIHJvY2sgd2FsbCBmcm9tIHRoZSB1cHBlciBmbG9vci4gIFRoaXNcbiAgICAgICAgICAgZmxhZyBwcmV2ZW50cyBhZGRpbmcgdGhhdCBjYXZlLiAgSWYgc2V0IGFzIFwiViFtXCIgdGhlbiBhIGRpcmVjdCBwYXRoXG4gICAgICAgICAgIHdpbGwgaW5zdGVhZCBiZSBhZGRlZCBiZXR3ZWVuIFZhbGxleSBvZiBXaW5kIGFuZCBMaW1lIFRyZWUgVmFsbGV5XG4gICAgICAgICAgIChhcyBpbiBlYXJsaWVyIHZlcnNpb25zIG9mIHRoZSByYW5kb21pemVyKS5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTaG9wcyA9IFZhbmlsbGEuZmxhZygnVnMnLCB7XG4gICAgbmFtZTogJ1ZhbmlsbGEgc2hvcHMnLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB3ZSBkaXNhYmxlIHNob3AgZ2xpdGNoLCBzaHVmZmxlIHNob3AgY29udGVudHMsIGFuZCB0aWVcbiAgICAgICAgICAgdGhlIHByaWNlcyB0byB0aGUgc2NhbGluZyBsZXZlbCAoaXRlbSBzaG9wcyBhbmQgaW5ucyBpbmNyZWFzZSBieSBhXG4gICAgICAgICAgIGZhY3RvciBvZiAyIGV2ZXJ5IDEwIHNjYWxpbmcgbGV2ZWxzLCBhcm1vciBzaG9wcyBkZWNyZWFzZSBieSBhXG4gICAgICAgICAgIGZhY3RvciBvZiAyIGV2ZXJ5IDEyIHNjYWxpbmcgbGV2ZWxzKS4gIFRoaXMgZmxhZyBwcmV2ZW50cyBhbGwgb2ZcbiAgICAgICAgICAgdGhlc2UgY2hhbmdlcywgcmVzdG9yaW5nIHNob3BzIHRvIGJlIGNvbXBsZXRlbHkgdmFuaWxsYS5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgV2lsZFdhcnAgPSBWYW5pbGxhLmZsYWcoJ1Z3Jywge1xuICAgIG5hbWU6ICdWYW5pbGxhIHdpbGQgd2FycCcsXG4gICAgdGV4dDogYEJ5IGRlZmF1bHQsIFdpbGQgV2FycCBpcyBuZXJmZWQgdG8gb25seSByZXR1cm4gdG8gTWV6YW1lIFNocmluZS5cbiAgICAgICAgICAgVGhpcyBmbGFnIHJlc3RvcmVzIGl0IHRvIHdvcmsgbGlrZSBub3JtYWwuICBOb3RlIHRoYXQgdGhpcyB3aWxsIHB1dFxuICAgICAgICAgICBhbGwgd2lsZCB3YXJwIGxvY2F0aW9ucyBpbiBsb2dpYyB1bmxlc3MgdGhlIGZsYWcgaXMgc2V0IGFzIChWIXcpLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG59XG5cbmNsYXNzIFF1YWxpdHkgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdRJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdRdWFsaXR5IG9mIExpZmUnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZSBmb2xsb3dpbmcgcXVhbGl0eS1vZi1saWZlIGZsYWdzIHR1cm4gPGk+b2ZmPC9pPiBpbXByb3ZlbWVudHMgdGhhdFxuICAgICAgYXJlIG5vcm1hbGx5IG9uIGJ5IGRlZmF1bHQuICBUaGV5IGFyZSBvcHRpb25hbCBhbmQgd2lsbCBub3QgYWZmZWN0IHRoZVxuICAgICAgc2VlZCBnZW5lcmF0aW9uLiAgVGhleSBtYXkgYmUgdG9nZ2xlZCBmcmVlbHkgaW4gcmFjZSBtb2RlLmA7XG5cbiAgLy8gVE9ETyAtIHJlbWVtYmVyIHByZWZlcmVuY2VzIGFuZCBhdXRvLWFwcGx5P1xuICBzdGF0aWMgcmVhZG9ubHkgTm9BdXRvRXF1aXAgPSBRdWFsaXR5LmZsYWcoJ1FhJywge1xuICAgIG5hbWU6IGBEb24ndCBhdXRvbWF0aWNhbGx5IGVxdWlwIG9yYnMgYW5kIGJyYWNlbGV0c2AsXG4gICAgdGV4dDogYFByZXZlbnRzIGFkZGluZyBhIHF1YWxpdHktb2YtbGlmZSBpbXByb3ZlbWVudCB0byBhdXRvbWF0aWNhbGx5IGVxdWlwXG4gICAgICAgICAgIHRoZSBjb3JyZXNwb25kaW5nIG9yYi9icmFjZWxldCB3aGVuZXZlciBjaGFuZ2luZyBzd29yZHMuYCxcbiAgICBvcHRpb25hbDogT1BUSU9OQUwsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb0NvbnRyb2xsZXJTaG9ydGN1dHMgPSBRdWFsaXR5LmZsYWcoJ1FjJywge1xuICAgIG5hbWU6ICdEaXNhYmxlIGNvbnRyb2xsZXIgc2hvcnRjdXRzJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgd2UgZGlzYWJsZSBzZWNvbmQgY29udHJvbGxlciBpbnB1dCBhbmQgaW5zdGVhZCBlbmFibGVcbiAgICAgICAgICAgc29tZSBuZXcgc2hvcnRjdXRzIG9uIGNvbnRyb2xsZXIgMTogU3RhcnQrQStCIGZvciB3aWxkIHdhcnAsIGFuZFxuICAgICAgICAgICBTZWxlY3QrQiB0byBxdWlja2x5IGNoYW5nZSBzd29yZHMuICBUbyBzdXBwb3J0IHRoaXMsIHRoZSBhY3Rpb24gb2ZcbiAgICAgICAgICAgdGhlIHN0YXJ0IGFuZCBzZWxlY3QgYnV0dG9ucyBpcyBjaGFuZ2VkIHNsaWdodGx5LiAgVGhpcyBmbGFnXG4gICAgICAgICAgIGRpc2FibGVzIHRoaXMgY2hhbmdlIGFuZCByZXRhaW5zIG5vcm1hbCBiZWhhdmlvci5gLFxuICAgIG9wdGlvbmFsOiBPUFRJT05BTCxcbiAgfSk7XG59XG5cbmNsYXNzIERlYnVnTW9kZSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgLy8gVE9ETyAtIGhvdyB0byBkaXNjb3ZlciBGbGFnU2VjdGlvbnM/Pz9cbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0QnO1xuICByZWFkb25seSBuYW1lID0gJ0RlYnVnIE1vZGUnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZXNlIG9wdGlvbnMgYXJlIGhlbHBmdWwgZm9yIGV4cGxvcmluZyBvciBkZWJ1Z2dpbmcuICBOb3RlIHRoYXQsXG4gICAgICB3aGlsZSB0aGV5IGRvIG5vdCBkaXJlY3RseSBhZmZlY3QgYW55IHJhbmRvbWl6YXRpb24sIHRoZXlcbiAgICAgIDxpPmRvPC9pPiBmYWN0b3IgaW50byB0aGUgc2VlZCB0byBwcmV2ZW50IGNoZWF0aW5nLCBhbmQgdGhleVxuICAgICAgd2lsbCByZW1vdmUgdGhlIG9wdGlvbiB0byBnZW5lcmF0ZSBhIHNlZWQgZm9yIHJhY2luZy5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBTcG9pbGVyTG9nID0gRGVidWdNb2RlLmZsYWcoJ0RzJywge1xuICAgIG5hbWU6ICdHZW5lcmF0ZSBhIHNwb2lsZXIgbG9nJyxcbiAgICB0ZXh0OiBgTm90ZTogPGI+dGhpcyB3aWxsIGNoYW5nZSB0aGUgcGxhY2VtZW50IG9mIGl0ZW1zPC9iPiBjb21wYXJlZCB0byBhXG4gICAgICAgICAgIHNlZWQgZ2VuZXJhdGVkIHdpdGhvdXQgdGhpcyBmbGFnIHR1cm5lZCBvbi5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVHJhaW5lck1vZGUgPSBEZWJ1Z01vZGUuZmxhZygnRHQnLCB7XG4gICAgbmFtZTogJ1RyYWluZXIgbW9kZScsXG4gICAgdGV4dDogYEluc3RhbGxzIGEgdHJhaW5lciBmb3IgcHJhY3RpY2luZyBjZXJ0YWluIHBhcnRzIG9mIHRoZSBnYW1lLlxuICAgICAgICAgICBBdCB0aGUgc3RhcnQgb2YgdGhlIGdhbWUsIHRoZSBwbGF5ZXIgd2lsbCBoYXZlIGFsbCBzd29yZHMsIGJhc2ljXG4gICAgICAgICAgIGFybW9ycyBhbmQgc2hpZWxkcywgYWxsIHdvcm4gaXRlbXMgYW5kIG1hZ2ljcywgYSBzZWxlY3Rpb24gb2ZcbiAgICAgICAgICAgY29uc3VtYWJsZXMsIGJvdyBvZiB0cnV0aCwgbWF4aW11bSBjYXNoLCBhbGwgd2FycCBwb2ludHMgYWN0aXZhdGVkLFxuICAgICAgICAgICBhbmQgdGhlIFNoeXJvbiBtYXNzYWNyZSB3aWxsIGhhdmUgYmVlbiB0cmlnZ2VyZWQuICBXaWxkIHdhcnAgaXNcbiAgICAgICAgICAgcmVjb25maWd1cmVkIHRvIHByb3ZpZGUgZWFzeSBhY2Nlc3MgdG8gYWxsIGJvc3Nlcy4gIEFkZGl0aW9uYWxseSxcbiAgICAgICAgICAgdGhlIGZvbGxvd2luZyBidXR0b24gY29tYmluYXRpb25zIGFyZSByZWNvZ25pemVkOjx1bD5cbiAgICAgICAgICAgICA8bGk+U3RhcnQrVXA6IGluY3JlYXNlIHBsYXllciBsZXZlbFxuICAgICAgICAgICAgIDxsaT5TdGFydCtEb3duOiBpbmNyZWFzZSBzY2FsaW5nIGxldmVsXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0xlZnQ6IGdldCBhbGwgYmFsbHNcbiAgICAgICAgICAgICA8bGk+U3RhcnQrUmlnaHQ6IGdldCBhbGwgYnJhY2VsZXRzXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0IrRG93bjogZ2V0IGEgZnVsbCBzZXQgb2YgY29uc3VtYWJsZSBpdGVtc1xuICAgICAgICAgICAgIDxsaT5TdGFydCtCK0xlZnQ6IGdldCBhbGwgYWR2YW5jZWQgYXJtb3JzXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0IrUmlnaHQ6IGdldCBhbGwgYWR2YW5jZWQgc2hpZWxkc1xuICAgICAgICAgICA8L3VsPmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOZXZlckRpZSA9IERlYnVnTW9kZS5mbGFnKCdEaScsIHtcbiAgICBuYW1lOiAnUGxheWVyIG5ldmVyIGRpZXMnLFxuICB9KTtcbn1cblxuZXhwb3J0IGNsYXNzIEZsYWdTZXQge1xuICBwcml2YXRlIGZsYWdzOiBNYXA8RmxhZywgTW9kZT47XG5cbiAgY29uc3RydWN0b3Ioc3RyOiBzdHJpbmd8TWFwPEZsYWcsIE1vZGU+ID0gJ0BDYXN1YWwnKSB7XG4gICAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmZsYWdzID0gbmV3IE1hcCgpO1xuICAgICAgZm9yIChjb25zdCBbaywgdl0gb2Ygc3RyKSB7XG4gICAgICAgIHRoaXMuc2V0KGsuZmxhZywgdik7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChzdHIuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICAvLyBUT0RPIC0gc3VwcG9ydCAnQENhc3VhbCtScy1FZCdcbiAgICAgIGNvbnN0IGV4cGFuZGVkID0gUHJlc2V0cy5nZXQoc3RyLnN1YnN0cmluZygxKSk7XG4gICAgICBpZiAoIWV4cGFuZGVkKSB0aHJvdyBuZXcgVXNhZ2VFcnJvcihgVW5rbm93biBwcmVzZXQ6ICR7c3RyfWApO1xuICAgICAgdGhpcy5mbGFncyA9IG5ldyBNYXAoZXhwYW5kZWQuZmxhZ3MpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmZsYWdzID0gbmV3IE1hcCgpO1xuICAgIC8vIHBhcnNlIHRoZSBzdHJpbmdcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvW15BLVphLXowLTkhP10vZywgJycpO1xuICAgIGNvbnN0IHJlID0gLyhbQS1aXSkoW2EtejAtOSE/XSspL2c7XG4gICAgbGV0IG1hdGNoO1xuICAgIHdoaWxlICgobWF0Y2ggPSByZS5leGVjKHN0cikpKSB7XG4gICAgICBjb25zdCBbLCBrZXksIHRlcm1zXSA9IG1hdGNoO1xuICAgICAgY29uc3QgcmUyID0gLyhbIT9dfF4pKFthLXowLTldKykvZztcbiAgICAgIHdoaWxlICgobWF0Y2ggPSByZTIuZXhlYyh0ZXJtcykpKSB7XG4gICAgICAgIGNvbnN0IFssIG1vZGUsIGZsYWdzXSA9IG1hdGNoO1xuICAgICAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgICAgICB0aGlzLnNldChrZXkgKyBmbGFnLCBtb2RlIHx8IHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZmlsdGVyT3B0aW9uYWwoKTogRmxhZ1NldCB7XG4gICAgcmV0dXJuIG5ldyBGbGFnU2V0KFxuICAgICAgICBuZXcgTWFwKFxuICAgICAgICAgICAgWy4uLnRoaXMuZmxhZ3NdLm1hcChcbiAgICAgICAgICAgICAgICAoW2ssIHZdKSA9PiBbaywgay5vcHRzLm9wdGlvbmFsID8gay5vcHRzLm9wdGlvbmFsKHYpIDogdl0pKSk7XG4gIH1cblxuICBmaWx0ZXJSYW5kb20ocmFuZG9tOiBSYW5kb20pOiBGbGFnU2V0IHtcbiAgICBmdW5jdGlvbiBwaWNrKGs6IEZsYWcsIHY6IE1vZGUpOiBNb2RlIHtcbiAgICAgIGlmICh2ICE9PSAnPycpIHJldHVybiB2O1xuICAgICAgcmV0dXJuIHJhbmRvbS5waWNrKFt0cnVlLCBmYWxzZSwgLi4uKGsub3B0cy5tb2RlcyB8fCAnJyldKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBGbGFnU2V0KFxuICAgICAgICBuZXcgTWFwKFsuLi50aGlzLmZsYWdzXS5tYXAoKFtrLCB2XSkgPT4gW2ssIHBpY2soaywgdildKSkpO1xuICB9XG5cbiAgdG9TdHJpbmcoKSB7XG4gICAgdHlwZSBTZWN0aW9uID0gRGVmYXVsdE1hcDxzdHJpbmcsIHN0cmluZ1tdPjtcbiAgICBjb25zdCBzZWN0aW9ucyA9XG4gICAgICAgIG5ldyBEZWZhdWx0TWFwPHN0cmluZywgU2VjdGlvbj4oXG4gICAgICAgICAgICAoKSA9PiBuZXcgRGVmYXVsdE1hcDxzdHJpbmcsIHN0cmluZ1tdPigoKSA9PiBbXSkpXG4gICAgZm9yIChjb25zdCBbZmxhZywgbW9kZV0gb2YgdGhpcy5mbGFncykge1xuICAgICAgaWYgKGZsYWcuZmxhZy5sZW5ndGggIT09IDIpIHRocm93IG5ldyBFcnJvcihgQmFkIGZsYWcgJHtmbGFnLmZsYWd9YCk7XG4gICAgICBpZiAoIW1vZGUpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgc2VjdGlvbiA9IHNlY3Rpb25zLmdldChmbGFnLmZsYWdbMF0pO1xuICAgICAgY29uc3Qgc3Vic2VjdGlvbiA9IG1vZGUgPT09IHRydWUgPyAnJyA6IG1vZGU7XG4gICAgICBzZWN0aW9uLmdldChzdWJzZWN0aW9uKS5wdXNoKGZsYWcuZmxhZ1sxXSk7XG4gICAgfVxuICAgIGNvbnN0IG91dCA9IFtdO1xuICAgIGZvciAoY29uc3QgW2tleSwgc2VjdGlvbl0gb2Ygc2VjdGlvbnMuc29ydGVkRW50cmllcygpKSB7XG4gICAgICBsZXQgc2VjID0ga2V5O1xuICAgICAgZm9yIChjb25zdCBbc3Via2V5LCBzdWJzZWN0aW9uXSBvZiBzZWN0aW9uKSB7XG4gICAgICAgIHNlYyArPSBzdWJrZXkgKyBzdWJzZWN0aW9uLnNvcnQoKS5qb2luKCcnKTtcbiAgICAgIH1cbiAgICAgIG91dC5wdXNoKHNlYyk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbignICcpO1xuICB9XG5cbiAgdG9nZ2xlKG5hbWU6IHN0cmluZyk6IE1vZGUgeyAgXG4gICAgY29uc3QgZmxhZyA9IEZsYWcuZmxhZ3MuZ2V0KG5hbWUpO1xuICAgIGlmICghZmxhZykge1xuICAgICAgLy8gVE9ETyAtIFJlcG9ydCBzb21ldGhpbmdcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEJhZCBmbGFnOiAke25hbWV9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IG1vZGU6IE1vZGUgPSB0aGlzLmZsYWdzLmdldChmbGFnKSB8fCBmYWxzZTtcbiAgICBjb25zdCBtb2RlcyA9IFtmYWxzZSwgdHJ1ZSwgLi4uKGZsYWcub3B0cy5tb2RlcyB8fCAnJyksICc/JywgZmFsc2VdO1xuICAgIGNvbnN0IGluZGV4ID0gbW9kZXMuaW5kZXhPZihtb2RlKTtcbiAgICBpZiAoaW5kZXggPCAwKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBjdXJyZW50IG1vZGUgJHttb2RlfWApO1xuICAgIGNvbnN0IG5leHQgPSBtb2Rlc1tpbmRleCArIDFdO1xuICAgIHRoaXMuZmxhZ3Muc2V0KGZsYWcsIG5leHQpO1xuICAgIHJldHVybiBuZXh0O1xuICB9XG5cbiAgc2V0KG5hbWU6IHN0cmluZywgbW9kZTogTW9kZSkge1xuICAgIGNvbnN0IGZsYWcgPSBGbGFnLmZsYWdzLmdldChuYW1lKTtcbiAgICBpZiAoIWZsYWcpIHtcbiAgICAgIC8vIFRPRE8gLSBSZXBvcnQgc29tZXRoaW5nXG4gICAgICBjb25zb2xlLmVycm9yKGBCYWQgZmxhZzogJHtuYW1lfWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIW1vZGUpIHtcbiAgICAgIHRoaXMuZmxhZ3MuZGVsZXRlKGZsYWcpO1xuICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gdHJ1ZSB8fCBtb2RlID09PSAnPycgfHwgZmxhZy5vcHRzLm1vZGVzPy5pbmNsdWRlcyhtb2RlKSkge1xuICAgICAgdGhpcy5mbGFncy5zZXQoZmxhZywgbW9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEJhZCBmbGFnIG1vZGU6ICR7bmFtZVswXX0ke21vZGV9JHtuYW1lLnN1YnN0cmluZygxKX1gKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gUmVtb3ZlIGFueSBjb25mbGljdHNcbiAgICBmb3IgKGNvbnN0IGV4Y2x1ZGVkIG9mIGZsYWcub3B0cy5leGNsdWRlcyB8fCBbXSkge1xuICAgICAgdGhpcy5mbGFncy5kZWxldGUoRmxhZy5mbGFncy5nZXQoZXhjbHVkZWQpISk7XG4gICAgfVxuICB9XG5cbiAgY2hlY2sobmFtZTogRmxhZ3xzdHJpbmcsIC4uLm1vZGVzOiBNb2RlW10pOiBib29sZWFuIHtcbiAgICBjb25zdCBmbGFnID0gbmFtZSBpbnN0YW5jZW9mIEZsYWcgPyBuYW1lIDogRmxhZy5mbGFncy5nZXQobmFtZSk7XG4gICAgaWYgKCFtb2Rlcy5sZW5ndGgpIG1vZGVzLnB1c2godHJ1ZSk7XG4gICAgcmV0dXJuIG1vZGVzLmluY2x1ZGVzKGZsYWcgJiYgdGhpcy5mbGFncy5nZXQoZmxhZykgfHwgZmFsc2UpO1xuICB9XG5cbiAgZ2V0KG5hbWU6IEZsYWd8c3RyaW5nKTogTW9kZSB7XG4gICAgY29uc3QgZmxhZyA9IG5hbWUgaW5zdGFuY2VvZiBGbGFnID8gbmFtZSA6IEZsYWcuZmxhZ3MuZ2V0KG5hbWUpO1xuICAgIHJldHVybiBmbGFnICYmIHRoaXMuZmxhZ3MuZ2V0KGZsYWcpIHx8IGZhbHNlO1xuICB9XG5cbiAgcHJlc2VydmVVbmlxdWVDaGVja3MoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuUHJlc2VydmVVbmlxdWVDaGVja3MpO1xuICB9XG4gIHNodWZmbGVNaW1pY3MoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuTm9TaHVmZmxlTWltaWNzLCBmYWxzZSk7XG4gIH1cblxuICBidWZmRGVvc1BlbmRhbnQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cbiAgY2hhbmdlR2FzTWFza1RvSGF6bWF0U3VpdCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuICBzbG93RG93blRvcm5hZG8oKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cbiAgbGVhdGhlckJvb3RzR2l2ZVNwZWVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG4gIHJhYmJpdEJvb3RzQ2hhcmdlV2hpbGVXYWxraW5nKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG5cbiAgc2h1ZmZsZVNwcml0ZVBhbGV0dGVzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVNwcml0ZUNvbG9ycyk7XG4gIH1cbiAgc2h1ZmZsZU1vbnN0ZXJzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdNcicpO1xuICB9XG4gIHNodWZmbGVTaG9wcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLlNob3BzLCBmYWxzZSk7XG4gIH1cbiAgYmFyZ2Fpbkh1bnRpbmcoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc2h1ZmZsZVNob3BzKCk7XG4gIH1cblxuICBzaHVmZmxlVG93ZXJNb25zdGVycygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhNb25zdGVycy5Ub3dlclJvYm90cyk7XG4gIH1cbiAgc2h1ZmZsZU1vbnN0ZXJFbGVtZW50cygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzKTtcbiAgfVxuICBzaHVmZmxlQm9zc0VsZW1lbnRzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNodWZmbGVNb25zdGVyRWxlbWVudHMoKTtcbiAgfVxuXG4gIGJ1ZmZNZWRpY2FsSGVyYigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5Ob0J1ZmZNZWRpY2FsSGVyYiwgZmFsc2UpO1xuICB9XG4gIGRlY3JlYXNlRW5lbXlEYW1hZ2UoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuRGVjcmVhc2VFbmVteURhbWFnZSk7XG4gIH1cbiAgdHJhaW5lcigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhEZWJ1Z01vZGUuVHJhaW5lck1vZGUpO1xuICB9XG4gIG5ldmVyRGllKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKERlYnVnTW9kZS5OZXZlckRpZSk7XG4gIH1cbiAgY2hhcmdlU2hvdHNPbmx5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLkNoYXJnZVNob3RzT25seSk7XG4gIH1cblxuICBiYXJyaWVyUmVxdWlyZXNDYWxtU2VhKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdSbCcpO1xuICB9XG4gIC8vIHBhcmFseXNpc1JlcXVpcmVzUHJpc29uS2V5KCk6IGJvb2xlYW4ge1xuICAvLyAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdSbCcpO1xuICAvLyB9XG4gIC8vIHNlYWxlZENhdmVSZXF1aXJlc1dpbmRtaWxsKCk6IGJvb2xlYW4ge1xuICAvLyAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdSbCcpO1xuICAvLyB9XG5cbiAgY29ubmVjdExpbWVUcmVlVG9MZWFmKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuTWFwcywgJyEnKTtcbiAgfVxuICAvLyBjb25uZWN0R29hVG9MZWFmKCkge1xuICAvLyAgIHJldHVybiB0aGlzLmNoZWNrKCdYZScpICYmIHRoaXMuY2hlY2soJ1hnJyk7XG4gIC8vIH1cbiAgLy8gcmVtb3ZlRWFybHlXYWxsKCkge1xuICAvLyAgIHJldHVybiB0aGlzLmNoZWNrKCdYYicpO1xuICAvLyB9XG4gIGFkZEVhc3RDYXZlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuTWFwcywgZmFsc2UpO1xuICB9XG4gIGZvZ0xhbXBOb3RSZXF1aXJlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLlZhbmlsbGFEb2xwaGluLCBmYWxzZSk7XG4gIH1cbiAgc3RvcnlNb2RlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuU3RvcnlNb2RlKTtcbiAgfVxuICBub0Jvd01vZGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5Ob0Jvd01vZGUpO1xuICB9XG4gIHJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuVmFuaWxsYURvbHBoaW4pO1xuICB9XG4gIHNhaGFyYVJhYmJpdHNSZXF1aXJlVGVsZXBhdGh5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdScicpO1xuICB9XG4gIHRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsIGZhbHNlLCAnIScpO1xuICB9XG4gIHJhbmRvbWl6ZVRodW5kZXJUZWxlcG9ydCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgZmFsc2UpO1xuICB9XG4gIG9yYnNPcHRpb25hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCk7XG4gIH1cblxuICBzaHVmZmxlR29hRmxvb3JzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlNodWZmbGVHb2FGbG9vcnMpO1xuICB9XG4gIHJhbmRvbWl6ZU1hcHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplTWFwcyk7XG4gIH1cbiAgcmFuZG9taXplVHJhZGVzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVRyYWRlcyk7XG4gIH1cbiAgdW5pZGVudGlmaWVkSXRlbXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMpO1xuICB9XG4gIHJhbmRvbWl6ZVdhbGxzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyk7XG4gIH1cblxuICBndWFyYW50ZWVTd29yZCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5HdWFyYW50ZWVTdGFydGluZ1N3b3JkKTtcbiAgfVxuICBndWFyYW50ZWVTd29yZE1hZ2ljKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE5vR3VhcmFudGVlcy5CYXR0bGVNYWdpYywgZmFsc2UpO1xuICB9XG4gIGd1YXJhbnRlZU1hdGNoaW5nU3dvcmQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTm9HdWFyYW50ZWVzLk1hdGNoaW5nU3dvcmQsIGZhbHNlKTtcbiAgfVxuICBndWFyYW50ZWVHYXNNYXNrKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE5vR3VhcmFudGVlcy5HYXNNYXNrLCBmYWxzZSk7XG4gIH1cbiAgZ3VhcmFudGVlQmFycmllcigpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhOb0d1YXJhbnRlZXMuQmFycmllciwgZmFsc2UpO1xuICB9XG4gIGd1YXJhbnRlZVJlZnJlc2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuR3VhcmFudGVlUmVmcmVzaCk7XG4gIH1cblxuICBkaXNhYmxlU3dvcmRDaGFyZ2VHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlVGVsZXBvcnRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlUmFiYml0U2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVNob3BHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5TaG9wcywgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVTdGF0dWVHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3RhdHVlR2xpdGNoLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVJhZ2VTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlJhZ2VTa2lwLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZUZsaWdodFN0YXR1ZVNraXAoKSB7XG4gICAgLy8gVE9ETyAtIGltcGxlbWVudFxuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN0YXR1ZUdhdW50bGV0U2tpcCwgZmFsc2UpO1xuICB9XG5cbiAgYXNzdW1lU3dvcmRDaGFyZ2VHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gpO1xuICB9XG4gIGFzc3VtZUdoZXR0b0ZsaWdodCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5HaGV0dG9GbGlnaHQpO1xuICB9XG4gIGFzc3VtZVRlbGVwb3J0U2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwKTtcbiAgfVxuICBhc3N1bWVSYWJiaXRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXApO1xuICB9XG4gIGFzc3VtZVN0YXR1ZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gpO1xuICB9XG4gIGFzc3VtZVRyaWdnZXJHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuVHJpZ2dlclNraXApOyAvLyBUT0RPIC0gaW1wbGVtZW50XG4gIH1cbiAgYXNzdW1lRmxpZ2h0U3RhdHVlU2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5TdGF0dWVHYXVudGxldFNraXApOyAvLyBUT0RPIC0gaW1wbGVtZW50XG4gIH1cbiAgYXNzdW1lV2lsZFdhcnAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5XaWxkV2FycCwgdHJ1ZSkgfHxcbiAgICAgICAgdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVXaWxkV2FycCk7XG4gIH1cbiAgYXNzdW1lUmFnZVNraXAoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICAgIC8vIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlJhZ2VTa2lwKTsgLy8gVE9ETyAtIGltcGxlbWVudCAtIGNoZWNrIGZseWVyXG4gIH1cblxuICBuZXJmV2lsZFdhcnAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5XaWxkV2FycCwgZmFsc2UpICYmXG4gICAgICAgIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplV2lsZFdhcnAsIGZhbHNlKTtcbiAgfVxuICBhbGxvd1dpbGRXYXJwKCkge1xuICAgIHJldHVybiAhdGhpcy5uZXJmV2lsZFdhcnAoKTtcbiAgfVxuICByYW5kb21pemVXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVXaWxkV2FycCwgdHJ1ZSk7XG4gIH1cblxuICBibGFja291dE1vZGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuQmxhY2tvdXQpO1xuICB9XG4gIGhhcmRjb3JlTW9kZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5QZXJtYWRlYXRoKTtcbiAgfVxuICBidWZmRHluYSgpIHtcbiAgICByZXR1cm4gIXRoaXMuY2hlY2soVmFuaWxsYS5EeW5hKTtcbiAgfVxuICBtYXhTY2FsaW5nSW5Ub3dlcigpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcik7XG4gIH1cblxuICBleHBTY2FsaW5nRmFjdG9yKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLkV4cGVyaWVuY2VTY2FsZXNTbG93ZXIpID8gMC4yNSA6XG4gICAgICAgIHRoaXMuY2hlY2soRWFzeU1vZGUuRXhwZXJpZW5jZVNjYWxlc0Zhc3RlcikgPyAyLjUgOiAxO1xuICB9XG5cbiAgLy8gT1BUSU9OQUwgRkxBR1NcbiAgYXV0b0VxdWlwQnJhY2VsZXQocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBwYXNzID09PSAnZWFybHknIHx8IHRoaXMuY2hlY2soUXVhbGl0eS5Ob0F1dG9FcXVpcCwgZmFsc2UpO1xuICB9XG4gIGNvbnRyb2xsZXJTaG9ydGN1dHMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBwYXNzID09PSAnZWFybHknIHx8IHRoaXMuY2hlY2soUXVhbGl0eS5Ob0NvbnRyb2xsZXJTaG9ydGN1dHMsIGZhbHNlKTtcbiAgfVxuICByYW5kb21pemVNdXNpYyhwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soQWVzdGhldGljcy5SYW5kb21pemVNdXNpYywgcGFzcyA9PT0gJ2Vhcmx5JyA/ICchJyA6IHRydWUpO1xuICB9XG4gIHNodWZmbGVUaWxlUGFsZXR0ZXMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEFlc3RoZXRpY3MuUmFuZG9taXplTWFwQ29sb3JzLFxuICAgICAgICAgICAgICAgICAgICAgIHBhc3MgPT09ICdlYXJseScgPyAnIScgOiB0cnVlKTtcbiAgfVxuICBub011c2ljKHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gcGFzcyA9PT0gJ2xhdGUnICYmIHRoaXMuY2hlY2soQWVzdGhldGljcy5Ob011c2ljKTtcbiAgfVxufVxuIl19