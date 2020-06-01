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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3NldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy9mbGFnc2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBZ0JqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUU3RCxNQUFNLE9BQU8sSUFBSTtJQU9mLFlBQXFCLElBQVksRUFBVyxJQUFjO1FBQXJDLFNBQUksR0FBSixJQUFJLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFVO1FBQ3hELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBTkQsTUFBTSxDQUFDLEdBQUc7UUFDUixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQzs7QUFKZSxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7QUFXbEQsTUFBTSxPQUFPLE1BQU07SUFTakIsWUFBWSxNQUFlLEVBQ04sSUFBWSxFQUNaLFdBQW1CLEVBQzVCLEtBQWdEO1FBRnZDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUV0QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0Qs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RCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1VzYWdlRXJyb3IsIERlZmF1bHRNYXB9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi9yYW5kb20uanMnO1xuXG5pbnRlcmZhY2UgRmxhZ09wdHMge1xuICBuYW1lOiBzdHJpbmc7XG4gIHRleHQ/OiBzdHJpbmc7XG4gIGV4Y2x1ZGVzPzogc3RyaW5nW107XG4gIGhhcmQ/OiBib29sZWFuO1xuICBvcHRpb25hbD86IChtb2RlOiBNb2RlKSA9PiBNb2RlO1xuICAvLyBBbGwgZmxhZ3MgaGF2ZSBtb2RlcyBmYWxzZSBhbmQgdHJ1ZS4gIEFkZGl0aW9uYWwgbW9kZXMgbWF5IGJlXG4gIC8vIHNwZWNpZmllZCBhcyBjaGFyYWN0ZXJzIGluIHRoaXMgc3RyaW5nIChlLmcuICchJykuXG4gIG1vZGVzPzogc3RyaW5nO1xufVxuXG50eXBlIE1vZGUgPSBib29sZWFufHN0cmluZztcblxuY29uc3QgT1BUSU9OQUwgPSAobW9kZTogTW9kZSkgPT4gJyc7XG5jb25zdCBOT19CQU5HID0gKG1vZGU6IE1vZGUpID0+IG1vZGUgPT09IHRydWUgPyBmYWxzZSA6IG1vZGU7XG5cbmV4cG9ydCBjbGFzcyBGbGFnIHtcbiAgc3RhdGljIHJlYWRvbmx5IGZsYWdzID0gbmV3IE1hcDxzdHJpbmcsIEZsYWc+KCk7XG5cbiAgc3RhdGljIGFsbCgpOiBGbGFnW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5mbGFncy52YWx1ZXMoKV07XG4gIH1cblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBmbGFnOiBzdHJpbmcsIHJlYWRvbmx5IG9wdHM6IEZsYWdPcHRzKSB7XG4gICAgRmxhZy5mbGFncy5zZXQoZmxhZywgdGhpcyk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFByZXNldCB7XG4gIHN0YXRpYyBhbGwoKTogUHJlc2V0W10ge1xuICAgIGlmICghUHJlc2V0cy5pbnN0YW5jZSkgUHJlc2V0cy5pbnN0YW5jZSA9IG5ldyBQcmVzZXRzKCk7XG4gICAgcmV0dXJuIFsuLi5QcmVzZXRzLmluc3RhbmNlLnByZXNldHMudmFsdWVzKCldO1xuICB9XG5cbiAgcHJpdmF0ZSBfZmxhZ1N0cmluZz86IHN0cmluZztcblxuICByZWFkb25seSBmbGFnczogUmVhZG9ubHlBcnJheTxyZWFkb25seSBbRmxhZywgTW9kZV0+O1xuICBjb25zdHJ1Y3RvcihwYXJlbnQ6IFByZXNldHMsIC8vIE5PVEU6IGltcG9zc2libGUgdG8gZ2V0IGFuIGluc3RhbmNlIG91dHNpZGVcbiAgICAgICAgICAgICAgcmVhZG9ubHkgbmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICByZWFkb25seSBkZXNjcmlwdGlvbjogc3RyaW5nLFxuICAgICAgICAgICAgICBmbGFnczogUmVhZG9ubHlBcnJheTxGbGFnfHJlYWRvbmx5IFtGbGFnLCBNb2RlXT4pIHtcbiAgICB0aGlzLmZsYWdzID0gZmxhZ3MubWFwKGYgPT4gZiBpbnN0YW5jZW9mIEZsYWcgPyBbZiwgdHJ1ZV0gOiBmKTtcbiAgICBwYXJlbnQucHJlc2V0cy5zZXQobWFwUHJlc2V0TmFtZShuYW1lKSwgdGhpcyk7XG4gIH1cblxuICBnZXQgZmxhZ1N0cmluZygpIHtcbiAgICBpZiAodGhpcy5fZmxhZ1N0cmluZyA9PSBudWxsKSB7XG4gICAgICB0aGlzLl9mbGFnU3RyaW5nID0gU3RyaW5nKG5ldyBGbGFnU2V0KGBAJHt0aGlzLm5hbWV9YCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZmxhZ1N0cmluZztcbiAgfVxufVxuXG5mdW5jdGlvbiBtYXBQcmVzZXROYW1lKG5hbWU6IHN0cmluZykge1xuICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16XS9nLCAnJyk7XG59XG5cbi8vIE5PVCBFWFBPUlRFRCFcbmNsYXNzIFByZXNldHMge1xuICBzdGF0aWMgaW5zdGFuY2U6IFByZXNldHMgfCB1bmRlZmluZWQ7XG4gIHJlYWRvbmx5IHByZXNldHMgPSBuZXcgTWFwPHN0cmluZywgUHJlc2V0PigpO1xuXG4gIHN0YXRpYyBnZXQobmFtZTogc3RyaW5nKTogUHJlc2V0IHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuaW5zdGFuY2UpIHRoaXMuaW5zdGFuY2UgPSBuZXcgUHJlc2V0cygpO1xuICAgIHJldHVybiB0aGlzLmluc3RhbmNlLnByZXNldHMuZ2V0KG1hcFByZXNldE5hbWUobmFtZSkpO1xuICB9XG5cbiAgcmVhZG9ubHkgQ2FzdWFsID0gbmV3IFByZXNldCh0aGlzLCAnQ2FzdWFsJywgYFxuICAgICAgQmFzaWMgZmxhZ3MgZm9yIGEgcmVsYXRpdmVseSBlYXN5IHBsYXl0aHJvdWdoLiAgVGhpcyBpcyBhIGdvb2RcbiAgICAgIHBsYWNlIHRvIHN0YXJ0LmAsIFtcbiAgICAgICAgRWFzeU1vZGUuUHJlc2VydmVVbmlxdWVDaGVja3MsXG4gICAgICAgIEVhc3lNb2RlLk5vU2h1ZmZsZU1pbWljcyxcbiAgICAgICAgRWFzeU1vZGUuRGVjcmVhc2VFbmVteURhbWFnZSxcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlUmVmcmVzaCxcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlU3RhcnRpbmdTd29yZCxcbiAgICAgICAgRWFzeU1vZGUuRXhwZXJpZW5jZVNjYWxlc0Zhc3RlcixcbiAgICAgICAgUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsXG4gICAgICAgIFZhbmlsbGEuU2hvcHMsXG4gICAgICAgIFZhbmlsbGEuRHluYSxcbiAgICAgICAgW1ZhbmlsbGEuTWFwcywgJyEnXSxcbiAgICAgICAgW1ZhbmlsbGEuV2lsZFdhcnAsICchJ10sXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgQ2xhc3NpYyA9IG5ldyBQcmVzZXQodGhpcywgJ0NsYXNzaWMnLCBgXG4gICAgICBQcm92aWRlcyBhIHJlbGF0aXZlbHkgcXVpY2sgcGxheXRob3VnaCB3aXRoIGEgcmVhc29uYWJsZSBhbW91bnQgb2ZcbiAgICAgIGNoYWxsZW5nZS4gIFNpbWlsYXIgdG8gb2xkZXIgdmVyc2lvbnMuYCwgW1xuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVTdGFydGluZ1N3b3JkLFxuICAgICAgICBHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsXG4gICAgICAgIFtSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgJyEnXSxcbiAgICAgICAgW1ZhbmlsbGEuTWFwcywgJyEnXSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBTdGFuZGFyZCA9IG5ldyBQcmVzZXQodGhpcywgJ1N0YW5kYXJkJywgYFxuICAgICAgV2VsbC1iYWxhbmNlZCwgc3RhbmRhcmQgcmFjZSBmbGFncy5gLCBbXG4gICAgICAgIC8vIG5vIGZsYWdzPyAgYWxsIGRlZmF1bHQ/XG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IE5vQm93TW9kZSA9IG5ldyBQcmVzZXQodGhpcywgJ05vIEJvdyBNb2RlJywgYFxuICAgICAgVGhlIHRvd2VyIGlzIG9wZW4gZnJvbSB0aGUgc3RhcnQsIGFzIHNvb24gYXMgeW91J3JlIHJlYWR5IGZvciBpdC5gLCBbXG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIE1vbnN0ZXJzLlRvd2VyUm9ib3RzLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgUm91dGluZy5Ob0Jvd01vZGUsXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgQWR2YW5jZWQgPSBuZXcgUHJlc2V0KHRoaXMsICdBZHZhbmNlZCcsIGBcbiAgICAgIEEgYmFsYW5jZWQgcmFuZG9taXphdGlvbiB3aXRoIHF1aXRlIGEgYml0IG1vcmUgZGlmZmljdWx0eS5gLCBbXG4gICAgICAgIEdsaXRjaGVzLkdoZXR0b0ZsaWdodCxcbiAgICAgICAgR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCxcbiAgICAgICAgR2xpdGNoZXMuU3RhdHVlR2xpdGNoLFxuICAgICAgICBbR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gsICchJ10sXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXJyaWVyLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsXG4gICAgICAgIE5vR3VhcmFudGVlcy5HYXNNYXNrLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgV29ybGQuUmFuZG9taXplTWFwcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplVHJhZGVzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsXG4gICAgICAgIFdvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IFdpbGRXYXJwID0gbmV3IFByZXNldCh0aGlzLCAnV2lsZCBXYXJwJywgYFxuICAgICAgU2lnbmlmaWNhbnRseSBvcGVucyB1cCB0aGUgZ2FtZSByaWdodCBmcm9tIHRoZSBzdGFydCB3aXRoIHdpbGRcbiAgICAgIHdhcnAgaW4gbG9naWMuYCwgW1xuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVSZWZyZXNoLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXaWxkV2FycCxcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBIYXJkY29yZSA9IG5ldyBQcmVzZXQodGhpcywgJ0hhcmRjb3JlJywgYFxuICAgICAgTm90IGZvciB0aGUgZmFpbnQgb2YgaGVhcnQuICBHb29kIGx1Y2suYCwgW1xuICAgICAgICBOb0d1YXJhbnRlZXMuQmFycmllcixcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLFxuICAgICAgICBIYXJkTW9kZS5FeHBlcmllbmNlU2NhbGVzU2xvd2VyLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgSGFyZE1vZGUuUGVybWFkZWF0aCxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVNYXBzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVUcmFkZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyxcbiAgICAgICAgV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsXG4gICAgICBdKTtcblxuICByZWFkb25seSBGdWxsU3R1cGlkID0gbmV3IFByZXNldCh0aGlzLCAnVGhlIEZ1bGwgU3R1cGlkJywgYFxuICAgICAgTm9ib2R5IGhhcyBldmVyIGNvbXBsZXRlZCB0aGlzLiAgQmUgc3VyZSB0byByZWNvcmQgdGhpcyBiZWNhdXNlXG4gICAgICBwaWNzIG9yIGl0IGRpZG4ndCBoYXBwZW4uYCwgWyBcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhcnJpZXIsXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXR0bGVNYWdpYyxcbiAgICAgICAgSGFyZE1vZGUuQmxhY2tvdXQsXG4gICAgICAgIEhhcmRNb2RlLkV4cGVyaWVuY2VTY2FsZXNTbG93ZXIsXG4gICAgICAgIEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyLFxuICAgICAgICBIYXJkTW9kZS5QZXJtYWRlYXRoLFxuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBNb25zdGVycy5Ub3dlclJvYm90cyxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVNYXBzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVUcmFkZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUdvYUZsb29ycyxcbiAgICAgICAgV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsXG4gICAgICBdKTtcblxuICByZWFkb25seSBNeXN0ZXJ5ID0gbmV3IFByZXNldCh0aGlzLCAnTXlzdGVyeScsIGBcbiAgICAgIEV2ZW4gdGhlIG9wdGlvbnMgYXJlIHJhbmRvbS5gLCBbXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVNYXBzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplVHJhZGVzLCAnPyddLFxuICAgICAgICBbV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsICc/J10sXG4gICAgICAgIFtXb3JsZC5TaHVmZmxlR29hRmxvb3JzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplU3ByaXRlQ29sb3JzLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplV2lsZFdhcnAsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuTm9Cb3dNb2RlLCAnPyddLFxuICAgICAgICBbUm91dGluZy5TdG9yeU1vZGUsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLlZhbmlsbGFEb2xwaGluLCAnPyddLFxuICAgICAgICBbUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5SYWdlU2tpcCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlRyaWdnZXJTa2lwLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuU3RhdHVlR2xpdGNoLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuR2hldHRvRmxpZ2h0LCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwLCAnPyddLFxuICAgICAgICBbQWVzdGhldGljcy5SYW5kb21pemVNdXNpYywgJz8nXSxcbiAgICAgICAgW0Flc3RoZXRpY3MuUmFuZG9taXplTWFwQ29sb3JzLCAnPyddLFxuICAgICAgICBbTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcywgJz8nXSxcbiAgICAgICAgW01vbnN0ZXJzLlRvd2VyUm9ib3RzLCAnPyddLFxuICAgICAgICBbRWFzeU1vZGUuTm9TaHVmZmxlTWltaWNzLCAnPyddLFxuICAgICAgICBbRWFzeU1vZGUuUHJlc2VydmVVbmlxdWVDaGVja3MsICc/J10sXG4gICAgICAgIFtOb0d1YXJhbnRlZXMuQmFycmllciwgJz8nXSxcbiAgICAgICAgW05vR3VhcmFudGVlcy5CYXR0bGVNYWdpYywgJz8nXSxcbiAgICAgICAgW05vR3VhcmFudGVlcy5HYXNNYXNrLCAnPyddLFxuICAgICAgICBbVmFuaWxsYS5EeW5hLCAnPyddLFxuICAgICAgICBbVmFuaWxsYS5Cb251c0l0ZW1zLCAnPyddLFxuICAgICAgICBbVmFuaWxsYS5NYXBzLCAnPyddLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRmxhZ1NlY3Rpb24ge1xuICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZTogRmxhZ1NlY3Rpb247XG4gIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IHNlY3Rpb25zID0gbmV3IFNldDxGbGFnU2VjdGlvbj4oKTtcblxuICBzdGF0aWMgYWxsKCk6IEZsYWdTZWN0aW9uW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5zZWN0aW9uc107XG4gIH1cblxuICBwcm90ZWN0ZWQgc3RhdGljIGZsYWcobmFtZTogc3RyaW5nLCBvcHRzOiBhbnkpOiBGbGFnIHtcbiAgICBGbGFnU2VjdGlvbi5zZWN0aW9ucy5hZGQoXG4gICAgICAgIHRoaXMuaW5zdGFuY2UgfHwgKHRoaXMuaW5zdGFuY2UgPSBuZXcgKHRoaXMgYXMgYW55KSgpKSk7XG4gICAgY29uc3QgZmxhZyA9IG5ldyBGbGFnKG5hbWUsIG9wdHMpO1xuICAgIGlmICghbmFtZS5zdGFydHNXaXRoKHRoaXMuaW5zdGFuY2UucHJlZml4KSkgdGhyb3cgbmV3IEVycm9yKGBiYWQgZmxhZ2ApO1xuICAgIHRoaXMuaW5zdGFuY2UuZmxhZ3Muc2V0KG5hbWUsIGZsYWcpO1xuICAgIHJldHVybiBmbGFnO1xuICB9XG5cbiAgYWJzdHJhY3QgcmVhZG9ubHkgcHJlZml4OiBzdHJpbmc7XG4gIGFic3RyYWN0IHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gIHJlYWRvbmx5IGZsYWdzID0gbmV3IE1hcDxzdHJpbmcsIEZsYWc+KCk7XG59XG5cbmNsYXNzIFdvcmxkIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnVyc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnV29ybGQnO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVNYXBzID0gV29ybGQuZmxhZygnV20nLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBtYXBzJyxcbiAgICB0ZXh0OiBgSW5kaXZpZHVhbCBtYXBzIGFyZSByYW5kb21pemVkLiAgRm9yIG5vdyB0aGlzIGlzIG9ubHkgYSBzdWJzZXQgb2ZcbiAgICAgICAgICAgcG9zc2libGUgbWFwcy4gIEEgcmFuZG9taXplZCBtYXAgd2lsbCBoYXZlIGFsbCB0aGUgc2FtZSBmZWF0dXJlc1xuICAgICAgICAgICAoZXhpdHMsIGNoZXN0cywgTlBDcywgZXRjKSBleGNlcHQgdGhpbmdzIGFyZSBtb3ZlZCBhcm91bmQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplVHJhZGVzID0gV29ybGQuZmxhZygnV3QnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSB0cmFkZS1pbiBpdGVtcycsXG4gICAgdGV4dDogYEl0ZW1zIGV4cGVjdGVkIGJ5IHZhcmlvdXMgTlBDcyB3aWxsIGJlIHNodWZmbGVkOiBzcGVjaWZpY2FsbHksXG4gICAgICAgICAgIFN0YXR1ZSBvZiBPbnl4LCBLaXJpc2EgUGxhbnQsIExvdmUgUGVuZGFudCwgSXZvcnkgU3RhdHVlLCBGb2dcbiAgICAgICAgICAgTGFtcCwgYW5kIEZsdXRlIG9mIExpbWUgKGZvciBBa2FoYW5hKS4gIFJhZ2Ugd2lsbCBleHBlY3QgYVxuICAgICAgICAgICByYW5kb20gc3dvcmQsIGFuZCBUb3JuZWwgd2lsbCBleHBlY3QgYSByYW5kb20gYnJhY2VsZXQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVW5pZGVudGlmaWVkS2V5SXRlbXMgPSBXb3JsZC5mbGFnKCdXdScsIHtcbiAgICBuYW1lOiAnVW5pZGVudGlmaWVkIGtleSBpdGVtcycsXG4gICAgdGV4dDogYEl0ZW0gbmFtZXMgd2lsbCBiZSBnZW5lcmljIGFuZCBlZmZlY3RzIHdpbGwgYmUgc2h1ZmZsZWQuICBUaGlzXG4gICAgICAgICAgIGluY2x1ZGVzIGtleXMsIGZsdXRlcywgbGFtcHMsIGFuZCBzdGF0dWVzLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVdhbGxFbGVtZW50cyA9IFdvcmxkLmZsYWcoJ1dlJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgZWxlbWVudHMgdG8gYnJlYWsgd2FsbHMnLFxuICAgIHRleHQ6IGBXYWxscyB3aWxsIHJlcXVpcmUgYSByYW5kb21pemVkIGVsZW1lbnQgdG8gYnJlYWsuICBOb3JtYWwgcm9jayBhbmRcbiAgICAgICAgICAgaWNlIHdhbGxzIHdpbGwgaW5kaWNhdGUgdGhlIHJlcXVpcmVkIGVsZW1lbnQgYnkgdGhlIGNvbG9yIChsaWdodFxuICAgICAgICAgICBncmV5IG9yIHllbGxvdyBmb3Igd2luZCwgYmx1ZSBmb3IgZmlyZSwgYnJpZ2h0IG9yYW5nZSAoXCJlbWJlcnNcIikgZm9yXG4gICAgICAgICAgIHdhdGVyLCBvciBkYXJrIGdyZXkgKFwic3RlZWxcIikgZm9yIHRodW5kZXIuICBUaGUgZWxlbWVudCB0byBicmVha1xuICAgICAgICAgICB0aGVzZSB3YWxscyBpcyB0aGUgc2FtZSB0aHJvdWdob3V0IGFuIGFyZWEuICBJcm9uIHdhbGxzIHJlcXVpcmUgYVxuICAgICAgICAgICBvbmUtb2ZmIHJhbmRvbSBlbGVtZW50LCB3aXRoIG5vIHZpc3VhbCBjdWUsIGFuZCB0d28gd2FsbHMgaW4gdGhlXG4gICAgICAgICAgIHNhbWUgYXJlYSBtYXkgaGF2ZSBkaWZmZXJlbnQgcmVxdWlyZW1lbnRzLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTaHVmZmxlR29hRmxvb3JzID0gV29ybGQuZmxhZygnV2cnLCB7XG4gICAgbmFtZTogJ1NodWZmbGUgR29hIGZvcnRyZXNzIGZsb29ycycsXG4gICAgLy8gVE9ETyAtIHNodWZmbGUgdGhlIGFyZWEtdG8tYm9zcyBjb25uZWN0aW9ucywgdG9vLlxuICAgIHRleHQ6IGBUaGUgZm91ciBhcmVhcyBvZiBHb2EgZm9ydHJlc3Mgd2lsbCBhcHBlYXIgaW4gYSByYW5kb20gb3JkZXIuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVNwcml0ZUNvbG9ycyA9IFdvcmxkLmZsYWcoJ1dzJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgc3ByaXRlIGNvbG9ycycsXG4gICAgdGV4dDogYE1vbnN0ZXJzIGFuZCBOUENzIHdpbGwgaGF2ZSBkaWZmZXJlbnQgY29sb3JzLiAgVGhpcyBpcyBub3QgYW5cbiAgICAgICAgICAgb3B0aW9uYWwgZmxhZyBiZWNhdXNlIGl0IGFmZmVjdHMgd2hhdCBtb25zdGVycyBjYW4gYmUgZ3JvdXBlZFxuICAgICAgICAgICB0b2dldGhlci5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplV2lsZFdhcnAgPSBXb3JsZC5mbGFnKCdXdycsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIHdpbGQgd2FycCcsXG4gICAgdGV4dDogYFdpbGQgd2FycCB3aWxsIGdvIHRvIE1lemFtZSBTaHJpbmUgYW5kIDE1IG90aGVyIHJhbmRvbSBsb2NhdGlvbnMuXG4gICAgICAgICAgIFRoZXNlIGxvY2F0aW9ucyB3aWxsIGJlIGNvbnNpZGVyZWQgaW4tbG9naWMuYCxcbiAgICBleGNsdWRlczogWydWdyddLFxuICB9KTtcbn1cblxuY2xhc3MgUm91dGluZyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1InO1xuICByZWFkb25seSBuYW1lID0gJ1JvdXRpbmcnO1xuXG4gIHN0YXRpYyByZWFkb25seSBTdG9yeU1vZGUgPSBSb3V0aW5nLmZsYWcoJ1JzJywge1xuICAgIG5hbWU6ICdTdG9yeSBNb2RlJyxcbiAgICB0ZXh0OiBgRHJheWdvbiAyIHdvbid0IHNwYXduIHVubGVzcyB5b3UgaGF2ZSBhbGwgZm91ciBzd29yZHMgYW5kIGhhdmVcbiAgICAgICAgICAgZGVmZWF0ZWQgYWxsIG1ham9yIGJvc3NlcyBvZiB0aGUgdGV0cmFyY2h5LmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb0Jvd01vZGUgPSBSb3V0aW5nLmZsYWcoJ1JiJywge1xuICAgIG5hbWU6ICdObyBCb3cgbW9kZScsXG4gICAgdGV4dDogYE5vIGl0ZW1zIGFyZSByZXF1aXJlZCB0byBmaW5pc2ggdGhlIGdhbWUuICBBbiBleGl0IGlzIGFkZGVkIGZyb21cbiAgICAgICAgICAgTWV6YW1lIHNocmluZSBkaXJlY3RseSB0byB0aGUgRHJheWdvbiAyIGZpZ2h0IChhbmQgdGhlIG5vcm1hbCBlbnRyYW5jZVxuICAgICAgICAgICBpcyByZW1vdmVkKS4gIERyYXlnb24gMiBzcGF3bnMgYXV0b21hdGljYWxseSB3aXRoIG5vIEJvdyBvZiBUcnV0aC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgT3Jic05vdFJlcXVpcmVkID0gUm91dGluZy5mbGFnKCdSbycsIHtcbiAgICBuYW1lOiAnT3JicyBub3QgcmVxdWlyZWQgdG8gYnJlYWsgd2FsbHMnLFxuICAgIHRleHQ6IGBXYWxscyBjYW4gYmUgYnJva2VuIGFuZCBicmlkZ2VzIGZvcm1lZCB3aXRoIGxldmVsIDEgc2hvdHMuYFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9UaHVuZGVyU3dvcmRXYXJwID0gUm91dGluZy5mbGFnKCdSdCcsIHtcbiAgICBuYW1lOiAnTm8gU3dvcmQgb2YgVGh1bmRlciB3YXJwJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHkgd2hlbiBhY3F1aXJpbmcgdGhlIHRodW5kZXIgc3dvcmQsIHRoZSBwbGF5ZXIgaXMgaW5zdGFudGx5XG4gICAgICAgICAgIHdhcnBlZCB0byBhIHJhbmRvbSB0b3duLiAgVGhpcyBmbGFnIGRpc2FibGVzIHRoZSB3YXJwLiAgSWYgc2V0IGFzXG4gICAgICAgICAgIFwiUiF0XCIsIHRoZW4gdGhlIHdhcnAgd2lsbCBhbHdheXMgZ28gdG8gU2h5cm9uLCBsaWtlIGluIHZhbmlsbGEuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVmFuaWxsYURvbHBoaW4gPSBSb3V0aW5nLmZsYWcoJ1JkJywge1xuICAgIG5hbWU6ICdWYW5pbGxhIERvbHBoaW4gaW50ZXJhY3Rpb25zJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgdGhlIHJhbmRvbWl6ZXIgY2hhbmdlcyBhIG51bWJlciBvZiBkb2xwaGluIGFuZCBib2F0XG4gICAgICAgICAgIGludGVyYWN0aW9uczogKDEpIGhlYWxpbmcgdGhlIGRvbHBoaW4gYW5kIGhhdmluZyB0aGUgU2hlbGwgRmx1dGVcbiAgICAgICAgICAgaXMgbm8gbG9uZ2VyIHJlcXVpcmVkIGJlZm9yZSB0aGUgZmlzaGVybWFuIHNwYXduczogaW5zdGVhZCwgaGVcbiAgICAgICAgICAgd2lsbCBzcGF3biBhcyBzb29uIGFzIHlvdSBoYXZlIHRoZSBpdGVtIGhlIHdhbnRzOyAoMikgdGFsa2luZyB0b1xuICAgICAgICAgICBLZW5zdSBpbiB0aGUgYmVhY2ggY2FiaW4gaXMgbm8gbG9uZ2VyIHJlcXVpcmVkIGZvciB0aGUgU2hlbGwgRmx1dGVcbiAgICAgICAgICAgdG8gd29yazogaW5zdGVhZCwgdGhlIFNoZWxsIEZsdXRlIHdpbGwgYWx3YXlzIHdvcmssIGFuZCBLZW5zdSB3aWxsXG4gICAgICAgICAgIHNwYXduIGFmdGVyIHRoZSBGb2cgTGFtcCBpcyB0dXJuZWQgaW4gYW5kIHdpbGwgZ2l2ZSBhIGtleSBpdGVtXG4gICAgICAgICAgIGNoZWNrLiAgVGhpcyBmbGFnIHJlc3RvcmVzIHRoZSB2YW5pbGxhIGludGVyYWN0aW9uIHdoZXJlIGhlYWxpbmdcbiAgICAgICAgICAgYW5kIHNoZWxsIGZsdXRlIGFyZSByZXF1aXJlZCwgYW5kIEtlbnN1IG5vIGxvbmdlciBkcm9wcyBhbiBpdGVtLmAsXG4gIH0pO1xufVxuXG5jbGFzcyBHbGl0Y2hlcyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0cnO1xuICByZWFkb25seSBuYW1lID0gJ0dsaXRjaGVzJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBCeSBkZWZhdWx0LCB0aGUgcmFuZG9taXplciBkaXNhYmxlcyBhbGwga25vd24gZ2xpdGNoZXMgKGV4Y2VwdCBnaGV0dG9cbiAgICAgIGZsaWdodCkuICBUaGVzZSBmbGFncyBzZWxlY3RpdmVseSByZS1lbmFibGUgY2VydGFpbiBnbGl0Y2hlcy4gIE1vc3Qgb2ZcbiAgICAgIHRoZXNlIGZsYWdzIGhhdmUgdHdvIG1vZGVzOiBub3JtYWxseSBlbmFibGluZyBhIGdsaXRjaCB3aWxsIGFkZCBpdCBhc1xuICAgICAgcG9zc2libHkgcmVxdWlyZWQgYnkgbG9naWMsIGJ1dCBjbGlja2luZyBhIHNlY29uZCB0aW1lIHdpbGwgYWRkIGEgJyEnXG4gICAgICBhbmQgZW5hYmxlIHRoZSBnbGl0Y2ggb3V0c2lkZSBvZiBsb2dpYyAoZS5nLiBcIkchY1wiKS5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBHaGV0dG9GbGlnaHQgPSBHbGl0Y2hlcy5mbGFnKCdHZicsIHtcbiAgICBuYW1lOiAnR2hldHRvIGZsaWdodCcsXG4gICAgdGV4dDogYEdoZXR0byBmbGlnaHQgYWxsb3dzIHVzaW5nIERvbHBoaW4gYW5kIFJhYmJpdCBCb290cyB0byBmbHkgdXAgdGhlXG4gICAgICAgICAgIHdhdGVyZmFsbHMgaW4gdGhlIEFuZ3J5IFNlYSAod2l0aG91dCBjYWxtaW5nIHRoZSB3aGlybHBvb2xzKS5cbiAgICAgICAgICAgVGhpcyBpcyBkb25lIGJ5IHN3aW1taW5nIHVwIHRvIGEgZGlhZ29uYWwgYmVhY2ggYW5kIGp1bXBpbmdcbiAgICAgICAgICAgaW4gYSBkaWZmZXJlbnQgZGlyZWN0aW9uIGltbWVkaWF0ZWx5IGJlZm9yZSBkaXNlbWJhcmtpbmcuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFN0YXR1ZUdsaXRjaCA9IEdsaXRjaGVzLmZsYWcoJ0dzJywge1xuICAgIG5hbWU6ICdTdGF0dWUgZ2xpdGNoJyxcbiAgICB0ZXh0OiBgU3RhdHVlIGdsaXRjaCBhbGxvd3MgZ2V0dGluZyBiZWhpbmQgc3RhdHVlcyB0aGF0IGJsb2NrIGNlcnRhaW5cbiAgICAgICAgICAgZW50cmFuY2VzOiB0aGUgZ3VhcmRzIGluIFBvcnRvYSwgQW1hem9uZXMsIE9haywgR29hLCBhbmQgU2h5cm9uLFxuICAgICAgICAgICBhcyB3ZWxsIGFzIHRoZSBzdGF0dWVzIGluIHRoZSBXYXRlcmZhbGwgQ2F2ZS4gIEl0IGlzIGRvbmUgYnlcbiAgICAgICAgICAgYXBwcm9hY2hpbmcgdGhlIHN0YXR1ZSBmcm9tIHRoZSB0b3AgcmlnaHQgYW5kIGhvbGRpbmcgZG93biBhbmRcbiAgICAgICAgICAgbGVmdCBvbiB0aGUgY29udHJvbGxlciB3aGlsZSBtYXNoaW5nIEIuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTXRTYWJyZVJlcXVpcmVtZW50U2tpcCA9IEdsaXRjaGVzLmZsYWcoJ0duJywge1xuICAgIG5hbWU6ICdNdCBTYWJyZSByZXF1aXJlbWVudHMgc2tpcCcsXG4gICAgdGV4dDogYEVudGVyaW5nIE10IFNhYnJlIE5vcnRoIG5vcm1hbGx5IHJlcXVpcmVzICgxKSBoYXZpbmcgVGVsZXBvcnQsXG4gICAgICAgICAgIGFuZCAoMikgdGFsa2luZyB0byB0aGUgcmFiYml0IGluIExlYWYgYWZ0ZXIgdGhlIGFiZHVjdGlvbiAodmlhXG4gICAgICAgICAgIFRlbGVwYXRoeSkuICBCb3RoIG9mIHRoZXNlIHJlcXVpcmVtZW50cyBjYW4gYmUgc2tpcHBlZDogZmlyc3QgYnlcbiAgICAgICAgICAgZmx5aW5nIG92ZXIgdGhlIHJpdmVyIGluIENvcmRlbCBwbGFpbiByYXRoZXIgdGhhbiBjcm9zc2luZyB0aGVcbiAgICAgICAgICAgYnJpZGdlLCBhbmQgdGhlbiBieSB0aHJlYWRpbmcgdGhlIG5lZWRsZSBiZXR3ZWVuIHRoZSBoaXRib3hlcyBpblxuICAgICAgICAgICBNdCBTYWJyZSBOb3J0aC5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTdGF0dWVHYXVudGxldFNraXAgPSBHbGl0Y2hlcy5mbGFnKCdHZycsIHtcbiAgICBuYW1lOiAnU3RhdHVlIGd1YW50bGV0IHNraXAnLFxuICAgIHRleHQ6IGBUaGUgc2hvb3Rpbmcgc3RhdHVlcyBpbiBmcm9udCBvZiBHb2EgYW5kIFN0eHkgbm9ybWFsbHkgcmVxdWlyZVxuICAgICAgICAgICBCYXJyaWVyIHRvIHBhc3Mgc2FmZWx5LiAgV2l0aCB0aGlzIGZsYWcsIEZsaWdodCBjYW4gYWxzbyBiZSB1c2VkXG4gICAgICAgICAgIGJ5IGZseWluZyBhcm91bmQgdGhlIGVkZ2Ugb2YgdGhlIHN0YXR1ZS5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTd29yZENoYXJnZUdsaXRjaCA9IEdsaXRjaGVzLmZsYWcoJ0djJywge1xuICAgIG5hbWU6ICdTd29yZCBjaGFyZ2UgZ2xpdGNoJyxcbiAgICB0ZXh0OiBgU3dvcmQgY2hhcmdlIGdsaXRjaCBhbGxvd3MgY2hhcmdpbmcgb25lIHN3b3JkIHRvIHRoZSBsZXZlbCBvZlxuICAgICAgICAgICBhbm90aGVyIHN3b3JkIGJ5IGVxdWlwcGluZyB0aGUgaGlnaGVyLWxldmVsIHN3b3JkLCByZS1lbnRlcmluZ1xuICAgICAgICAgICB0aGUgbWVudSwgY2hhbmdpbmcgdG8gdGhlIGxvd2VyLWxldmVsIHN3b3JkIHdpdGhvdXQgZXhpdGluZyB0aGVcbiAgICAgICAgICAgbWVudSwgY3JlYXRpbmcgYSBoYXJkIHNhdmUsIHJlc2V0dGluZywgYW5kIHRoZW4gY29udGludWluZy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFRyaWdnZXJTa2lwID0gR2xpdGNoZXMuZmxhZygnR3QnLCB7XG4gICAgbmFtZTogJ1RyaWdnZXIgc2tpcCcsXG4gICAgdGV4dDogYEEgd2lkZSB2YXJpZXR5IG9mIHRyaWdnZXJzIGFuZCBleGl0IHNxdWFyZXMgY2FuIGJlIHNraXBwZWQgYnlcbiAgICAgICAgICAgdXNpbmcgYW4gaW52YWxpZCBpdGVtIGV2ZXJ5IGZyYW1lIHdoaWxlIHdhbGtpbmcuICBUaGlzIGFsbG93c1xuICAgICAgICAgICBieXBhc3NpbmcgYm90aCBNdCBTYWJyZSBlbnRyYW5jZSB0cmlnZ2VycywgdGhlIEV2aWwgU3Bpcml0IElzbGFuZFxuICAgICAgICAgICBlbnRyYW5jZSB0cmlnZ2VyLCB0cmlnZ2VycyBmb3IgZ3VhcmRzIHRvIG1vdmUsIHNsb3BlcywgYW5kIHNlYW1sZXNzXG4gICAgICAgICAgIG1hcCB0cmFuc2l0aW9ucy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhZ2VTa2lwID0gR2xpdGNoZXMuZmxhZygnR3InLCB7XG4gICAgbmFtZTogJ1JhZ2Ugc2tpcCcsXG4gICAgdGV4dDogYFJhZ2UgY2FuIGJlIHNraXBwZWQgYnkgZGFtYWdlLWJvb3N0aW5nIGRpYWdvbmFsbHkgaW50byB0aGUgTGltZVxuICAgICAgICAgICBUcmVlIExha2Ugc2NyZWVuLiAgVGhpcyBwcm92aWRlcyBhY2Nlc3MgdG8gdGhlIGFyZWEgYmV5b25kIHRoZVxuICAgICAgICAgICBsYWtlIGlmIGZsaWdodCBvciBicmlkZ2VzIGFyZSBhdmFpbGFibGUuYCxcbiAgICBoYXJkOiB0cnVlLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xufVxuXG5jbGFzcyBBZXN0aGV0aWNzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnQSc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnQWVzdGhldGljcyc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlc2UgZmxhZ3MgZG9uJ3QgZGlyZWN0bHkgYWZmZWN0IGdhbWVwbGF5IG9yIHNodWZmbGluZywgYnV0IHRoZXkgZG9cbiAgICAgIGFmZmVjdCB0aGUgZXhwZXJpZW5jZSBzaWduaWZpY2FudGx5IGVub3VnaCB0aGF0IHRoZXJlIGFyZSB0aHJlZSBtb2Rlc1xuICAgICAgZm9yIGVhY2g6IFwib2ZmXCIsIFwib3B0aW9uYWxcIiAobm8gZXhjbGFtYXRpb24gcG9pbnQpLCBhbmQgXCJyZXF1aXJlZFwiXG4gICAgICAoZXhjbGFtYXRpb24gcG9pbnQpLiAgVGhlIGZpcnN0IHR3byBhcmUgZXF1aXZhbGVudCBmb3Igc2VlZCBnZW5lcmF0aW9uXG4gICAgICBwdXJwb3Nlcywgc28gdGhhdCB5b3UgY2FuIHBsYXkgdGhlIHNhbWUgc2VlZCB3aXRoIGVpdGhlciBzZXR0aW5nLlxuICAgICAgU2V0dGluZyBpdCB0byBcIiFcIiB3aWxsIGNoYW5nZSB0aGUgc2VlZC5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVNdXNpYyA9IEFlc3RoZXRpY3MuZmxhZygnQW0nLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBiYWNrZ3JvdW5kIG11c2ljJyxcbiAgICBtb2RlczogJyEnLFxuICAgIG9wdGlvbmFsOiBOT19CQU5HLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9NdXNpYyA9IEFlc3RoZXRpY3MuZmxhZygnQXMnLCB7XG4gICAgbmFtZTogJ05vIGJhY2tncm91bmQgbXVzaWMnLFxuICAgIG9wdGlvbmFsOiBPUFRJT05BTCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZU1hcENvbG9ycyA9IEFlc3RoZXRpY3MuZmxhZygnQWMnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBtYXAgY29sb3JzJyxcbiAgICBtb2RlczogJyEnLFxuICAgIG9wdGlvbmFsOiBOT19CQU5HLFxuICB9KTtcbn1cblxuY2xhc3MgTW9uc3RlcnMgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdNJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdNb25zdGVycyc7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVdlYWtuZXNzZXMgPSBNb25zdGVycy5mbGFnKCdNZScsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIG1vbnN0ZXIgd2Vha25lc3NlcycsXG4gICAgdGV4dDogYE1vbnN0ZXIgYW5kIGJvc3MgZWxlbWVudGFsIHdlYWtuZXNzZXMgYXJlIHNodWZmbGVkLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBUb3dlclJvYm90cyA9IE1vbnN0ZXJzLmZsYWcoJ010Jywge1xuICAgIG5hbWU6ICdTaHVmZmxlIHRvd2VyIHJvYm90cycsXG4gICAgdGV4dDogYFRvd2VyIHJvYm90cyB3aWxsIGJlIHNodWZmbGVkIGludG8gdGhlIG5vcm1hbCBwb29sLiAgQXQgc29tZVxuICAgICAgICAgICBwb2ludCwgbm9ybWFsIG1vbnN0ZXJzIG1heSBiZSBzaHVmZmxlZCBpbnRvIHRoZSB0b3dlciBhcyB3ZWxsLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG59XG5cbmNsYXNzIEVhc3lNb2RlIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnRSc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnRWFzeSBNb2RlJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBUaGUgZm9sbG93aW5nIG9wdGlvbnMgbWFrZSBwYXJ0cyBvZiB0aGUgZ2FtZSBlYXNpZXIuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9TaHVmZmxlTWltaWNzID0gRWFzeU1vZGUuZmxhZygnRXQnLCB7XG4gICAgbmFtZTogYERvbid0IHNodWZmbGUgbWltaWNzLmAsXG4gICAgdGV4dDogYE1pbWljcyB3aWxsIGJlIGluIHRoZWlyIHZhbmlsbGEgbG9jYXRpb25zLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBQcmVzZXJ2ZVVuaXF1ZUNoZWNrcyA9IEVhc3lNb2RlLmZsYWcoJ0V1Jywge1xuICAgIG5hbWU6ICdLZWVwIHVuaXF1ZSBpdGVtcyBhbmQgY29uc3VtYWJsZXMgc2VwYXJhdGUnLFxuICAgIHRleHQ6IGBOb3JtYWxseSBhbGwgaXRlbXMgYW5kIG1pbWljcyBhcmUgc2h1ZmZsZWQgaW50byBhIHNpbmdsZSBwb29sIGFuZFxuICAgICAgICAgICBkaXN0cmlidXRlZCBmcm9tIHRoZXJlLiAgSWYgdGhpcyBmbGFnIGlzIHNldCwgdW5pcXVlIGl0ZW1zXG4gICAgICAgICAgIChzcGVjaWZpY2FsbHksIGFueXRoaW5nIHRoYXQgY2Fubm90IGJlIHNvbGQpIHdpbGwgb25seSBiZSBmb3VuZCBpblxuICAgICAgICAgICBlaXRoZXIgKGEpIGNoZWNrcyB0aGF0IGhlbGQgdW5pcXVlIGl0ZW1zIGluIHZhbmlsbGEsIG9yIChiKSBib3NzXG4gICAgICAgICAgIGRyb3BzLiAgQ2hlc3RzIGNvbnRhaW5pbmcgY29uc3VtYWJsZXMgaW4gdmFuaWxsYSBtYXkgYmUgc2FmZWx5XG4gICAgICAgICAgIGlnbm9yZWQsIGJ1dCBjaGVzdHMgY29udGFpbmluZyB1bmlxdWUgaXRlbXMgaW4gdmFuaWxsYSBtYXkgc3RpbGxcbiAgICAgICAgICAgZW5kIHVwIHdpdGggbm9uLXVuaXF1ZSBpdGVtcyBiZWNhdXNlIG9mIGJvc3NlcyBsaWtlIFZhbXBpcmUgMiB0aGF0XG4gICAgICAgICAgIGRyb3AgY29uc3VtYWJsZXMuICBJZiBtaW1pY3MgYXJlIHNodWZmbGVkLCB0aGV5IHdpbGwgb25seSBiZSBpblxuICAgICAgICAgICBjb25zdW1hYmxlIGxvY2F0aW9ucy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgRGVjcmVhc2VFbmVteURhbWFnZSA9IEVhc3lNb2RlLmZsYWcoJ0VkJywge1xuICAgIG5hbWU6ICdEZWNyZWFzZSBlbmVteSBkYW1hZ2UnLFxuICAgIHRleHQ6IGBFbmVteSBhdHRhY2sgcG93ZXIgd2lsbCBiZSBzaWduaWZpY2FudGx5IGRlY3JlYXNlZCBpbiB0aGUgZWFybHkgZ2FtZVxuICAgICAgICAgICAoYnkgYSBmYWN0b3Igb2YgMykuICBUaGUgZ2FwIHdpbGwgbmFycm93IGluIHRoZSBtaWQtZ2FtZSBhbmQgZXZlbnR1YWxseVxuICAgICAgICAgICBwaGFzZSBvdXQgYXQgc2NhbGluZyBsZXZlbCA0MC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgR3VhcmFudGVlU3RhcnRpbmdTd29yZCA9IEVhc3lNb2RlLmZsYWcoJ0VzJywge1xuICAgIG5hbWU6ICdHdWFyYW50ZWUgc3RhcnRpbmcgc3dvcmQnLFxuICAgIHRleHQ6IGBUaGUgTGVhZiBlbGRlciBpcyBndWFyYW50ZWVkIHRvIGdpdmUgYSBzd29yZC4gIEl0IHdpbGwgbm90IGJlXG4gICAgICAgICAgIHJlcXVpcmVkIHRvIGRlYWwgd2l0aCBhbnkgZW5lbWllcyBiZWZvcmUgZmluZGluZyB0aGUgZmlyc3Qgc3dvcmQuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEd1YXJhbnRlZVJlZnJlc2ggPSBFYXN5TW9kZS5mbGFnKCdFcicsIHtcbiAgICBuYW1lOiAnR3VhcmFudGVlIHJlZnJlc2gnLFxuICAgIHRleHQ6IGBHdWFyYW50ZWVzIHRoZSBSZWZyZXNoIHNwZWxsIHdpbGwgYmUgYXZhaWxhYmxlIGJlZm9yZSBmaWdodGluZ1xuICAgICAgICAgICBUZXRyYXJjaHMuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEV4cGVyaWVuY2VTY2FsZXNGYXN0ZXIgPSBFYXN5TW9kZS5mbGFnKCdFeCcsIHtcbiAgICBuYW1lOiAnRXhwZXJpZW5jZSBzY2FsZXMgZmFzdGVyJyxcbiAgICB0ZXh0OiBgTGVzcyBncmluZGluZyB3aWxsIGJlIHJlcXVpcmVkIHRvIFwia2VlcCB1cFwiIHdpdGggdGhlIGdhbWUgZGlmZmljdWx0eS5gLFxuICAgIGV4Y2x1ZGVzOiBbJ0h4J10sXG4gIH0pO1xufVxuXG5jbGFzcyBOb0d1YXJhbnRlZXMgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdOJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdObyBndWFyYW50ZWVzJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBSZW1vdmVzIHZhcmlvdXMgZ3VhcmFudGVlcyBmcm9tIHRoZSBsb2dpYy5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBCYXR0bGVNYWdpYyA9IE5vR3VhcmFudGVlcy5mbGFnKCdOdycsIHtcbiAgICBuYW1lOiAnQmF0dGxlIG1hZ2ljIG5vdCBndWFyYW50ZWVkJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHksIHRoZSBsb2dpYyB3aWxsIGd1YXJhbnRlZSB0aGF0IGxldmVsIDMgc3dvcmQgY2hhcmdlcyBhcmVcbiAgICAgICAgICAgYXZhaWxhYmxlIGJlZm9yZSBmaWdodGluZyB0aGUgdGV0cmFyY2hzICh3aXRoIHRoZSBleGNlcHRpb24gb2YgS2FybWluZSxcbiAgICAgICAgICAgd2hvIG9ubHkgcmVxdWlyZXMgbGV2ZWwgMikuICBUaGlzIGRpc2FibGVzIHRoYXQgY2hlY2suYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTWF0Y2hpbmdTd29yZCA9IE5vR3VhcmFudGVlcy5mbGFnKCdOcycsIHtcbiAgICBuYW1lOiAnTWF0Y2hpbmcgc3dvcmQgbm90IGd1YXJhbnRlZWQgKFwiVGluayBNb2RlXCIpJyxcbiAgICB0ZXh0OiBgRW5hYmxlcyBcInRpbmsgc3RyYXRzXCIsIHdoZXJlIHdyb25nLWVsZW1lbnQgc3dvcmRzIHdpbGwgc3RpbGwgZG8gYVxuICAgICAgICAgICBzaW5nbGUgZGFtYWdlIHBlciBoaXQuICBQbGF5ZXIgbWF5IGJlIHJlcXVpcmVkIHRvIGZpZ2h0IG1vbnN0ZXJzXG4gICAgICAgICAgIChpbmNsdWRpbmcgYm9zc2VzKSB3aXRoIHRpbmtzLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEJhcnJpZXIgPSBOb0d1YXJhbnRlZXMuZmxhZygnTmInLCB7XG4gICAgbmFtZTogJ0JhcnJpZXIgbm90IGd1YXJhbnRlZWQnLFxuICAgIHRleHQ6IGBOb3JtYWxseSwgdGhlIGxvZ2ljIHdpbGwgZ3VhcmFudGVlIEJhcnJpZXIgKG9yIGVsc2UgcmVmcmVzaCBhbmQgc2hpZWxkXG4gICAgICAgICAgIHJpbmcpIGJlZm9yZSBlbnRlcmluZyBTdHh5LCB0aGUgRm9ydHJlc3MsIG9yIGZpZ2h0aW5nIEthcm1pbmUuICBUaGlzXG4gICAgICAgICAgIGRpc2FibGVzIHRoYXQgY2hlY2suYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgR2FzTWFzayA9IE5vR3VhcmFudGVlcy5mbGFnKCdOZycsIHtcbiAgICBuYW1lOiAnR2FzIG1hc2sgbm90IGd1YXJhbnRlZWQnLFxuICAgIHRleHQ6IGBUaGUgbG9naWMgd2lsbCBub3QgZ3VhcmFudGVlIGdhcyBtYXNrIGJlZm9yZSBuZWVkaW5nIHRvIGVudGVyIHRoZSBzd2FtcC5cbiAgICAgICAgICAgR2FzIG1hc2sgaXMgc3RpbGwgZ3VhcmFudGVlZCB0byBraWxsIHRoZSBpbnNlY3QuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcbn1cblxuY2xhc3MgSGFyZE1vZGUgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdIJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdIYXJkIG1vZGUnO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb0J1ZmZNZWRpY2FsSGVyYiA9IEhhcmRNb2RlLmZsYWcoJ0htJywge1xuICAgIG5hbWU6IGBEb24ndCBidWZmIG1lZGljYWwgaGVyYiBvciBmcnVpdCBvZiBwb3dlcmAsXG4gICAgdGV4dDogYE1lZGljYWwgSGVyYiBpcyBub3QgYnVmZmVkIHRvIGhlYWwgODAgZGFtYWdlLCB3aGljaCBpcyBoZWxwZnVsIHRvIG1ha2VcbiAgICAgICAgICAgdXAgZm9yIGNhc2VzIHdoZXJlIFJlZnJlc2ggaXMgdW5hdmFpbGFibGUgZWFybHkuICBGcnVpdCBvZiBQb3dlciBpcyBub3RcbiAgICAgICAgICAgYnVmZmVkIHRvIHJlc3RvcmUgNTYgTVAuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTWF4U2NhbGluZ0luVG93ZXIgPSBIYXJkTW9kZS5mbGFnKCdIdCcsIHtcbiAgICBuYW1lOiAnTWF4IHNjYWxpbmcgbGV2ZWwgaW4gdG93ZXInLFxuICAgIHRleHQ6IGBFbmVtaWVzIGluIHRoZSB0b3dlciBzcGF3biBhdCBtYXggc2NhbGluZyBsZXZlbC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBFeHBlcmllbmNlU2NhbGVzU2xvd2VyID0gSGFyZE1vZGUuZmxhZygnSHgnLCB7XG4gICAgbmFtZTogJ0V4cGVyaWVuY2Ugc2NhbGVzIHNsb3dlcicsXG4gICAgdGV4dDogYE1vcmUgZ3JpbmRpbmcgd2lsbCBiZSByZXF1aXJlZCB0byBcImtlZXAgdXBcIiB3aXRoIHRoZSBkaWZmaWN1bHR5LmAsXG4gICAgZXhjbHVkZXM6IFsnRXgnXSxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgQ2hhcmdlU2hvdHNPbmx5ID0gSGFyZE1vZGUuZmxhZygnSGMnLCB7XG4gICAgbmFtZTogJ0NoYXJnZSBzaG90cyBvbmx5JyxcbiAgICB0ZXh0OiBgU3RhYmJpbmcgaXMgY29tcGxldGVseSBpbmVmZmVjdGl2ZS4gIE9ubHkgY2hhcmdlZCBzaG90cyB3b3JrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEJsYWNrb3V0ID0gSGFyZE1vZGUuZmxhZygnSHonLCB7XG4gICAgbmFtZTogJ0JsYWNrb3V0JyxcbiAgICB0ZXh0OiBgQWxsIGNhdmVzIGFuZCBmb3J0cmVzc2VzIGFyZSBwZXJtYW5lbnRseSBkYXJrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFBlcm1hZGVhdGggPSBIYXJkTW9kZS5mbGFnKCdIaCcsIHtcbiAgICBuYW1lOiAnUGVybWFkZWF0aCcsXG4gICAgdGV4dDogYEhhcmRjb3JlIG1vZGU6IGNoZWNrcG9pbnRzIGFuZCBzYXZlcyBhcmUgcmVtb3ZlZC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xufVxuXG5jbGFzcyBWYW5pbGxhIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBuYW1lID0gJ1ZhbmlsbGEnO1xuICByZWFkb25seSBwcmVmaXggPSAnVic7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgT3B0aW9ucyB0byByZXN0b3JlIHZhbmlsbGEgYmVoYXZpb3IgY2hhbmdlZCBieSBkZWZhdWx0LmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IER5bmEgPSBWYW5pbGxhLmZsYWcoJ1ZkJywge1xuICAgIG5hbWU6IGBEb24ndCBidWZmIER5bmFgLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB3ZSBtYWtlcyB0aGUgRHluYSBmaWdodCBhIGJpdCBtb3JlIG9mIGEgY2hhbGxlbmdlLlxuICAgICAgICAgICBTaWRlIHBvZHMgd2lsbCBmaXJlIHNpZ25pZmljYW50bHkgbW9yZS4gIFRoZSBzYWZlIHNwb3QgaGFzIGJlZW5cbiAgICAgICAgICAgcmVtb3ZlZC4gIFRoZSByZXZlbmdlIGJlYW1zIHBhc3MgdGhyb3VnaCBiYXJyaWVyLiAgU2lkZSBwb2RzIGNhblxuICAgICAgICAgICBub3cgYmUga2lsbGVkLiAgVGhpcyBmbGFnIHByZXZlbnRzIHRoYXQgY2hhbmdlLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBCb251c0l0ZW1zID0gVmFuaWxsYS5mbGFnKCdWYicsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYnVmZiBib251cyBpdGVtc2AsXG4gICAgdGV4dDogYExlYXRoZXIgQm9vdHMgYXJlIGNoYW5nZWQgdG8gU3BlZWQgQm9vdHMsIHdoaWNoIGluY3JlYXNlIHBsYXllciB3YWxraW5nXG4gICAgICAgICAgIHNwZWVkICh0aGlzIGFsbG93cyBjbGltYmluZyB1cCB0aGUgc2xvcGUgdG8gYWNjZXNzIHRoZSBUb3JuYWRvIEJyYWNlbGV0XG4gICAgICAgICAgIGNoZXN0LCB3aGljaCBpcyB0YWtlbiBpbnRvIGNvbnNpZGVyYXRpb24gYnkgdGhlIGxvZ2ljKS4gIERlbydzIHBlbmRhbnRcbiAgICAgICAgICAgcmVzdG9yZXMgTVAgd2hpbGUgbW92aW5nLiAgUmFiYml0IGJvb3RzIGVuYWJsZSBzd29yZCBjaGFyZ2luZyB1cCB0b1xuICAgICAgICAgICBsZXZlbCAyIHdoaWxlIHdhbGtpbmcgKGxldmVsIDMgc3RpbGwgcmVxdWlyZXMgYmVpbmcgc3RhdGlvbmFyeSwgc28gYXNcbiAgICAgICAgICAgdG8gcHJldmVudCB3YXN0aW5nIHRvbnMgb2YgbWFnaWMpLmAsXG4gIH0pO1xuXG4gIC8vIFRPRE8gLSBpcyBpdCB3b3J0aCBldmVuIGFsbG93aW5nIHRvIHR1cm4gdGhpcyBvZmY/IT9cbiAgc3RhdGljIHJlYWRvbmx5IE1hcHMgPSBWYW5pbGxhLmZsYWcoJ1ZtJywge1xuICAgIG5hbWU6ICdWYW5pbGxhIG1hcHMnLFxuICAgIHRleHQ6IGBOb3JtYWxseSB0aGUgcmFuZG9taXplciBhZGRzIGEgbmV3IFwiRWFzdCBDYXZlXCIgdG8gVmFsbGV5IG9mIFdpbmQsXG4gICAgICAgICAgIGJvcnJvd2VkIGZyb20gdGhlIEdCQyB2ZXJzaW9uIG9mIHRoZSBnYW1lLiAgVGhpcyBjYXZlIGNvbnRhaW5zIHR3b1xuICAgICAgICAgICBjaGVzdHMgKG9uZSBjb25zaWRlcmVkIGEga2V5IGl0ZW0pIG9uIHRoZSB1cHBlciBmbG9vciBhbmQgZXhpdHMgdG9cbiAgICAgICAgICAgdHdvIHJhbmRvbSBhcmVhcyAoY2hvc2VuIGJldHdlZW4gTGltZSBUcmVlIFZhbGxleSwgQ29yZGVsIFBsYWluLFxuICAgICAgICAgICBHb2EgVmFsbGV5LCBvciBEZXNlcnQgMjsgdGhlIHF1aWNrc2FuZCBpcyByZW1vdmVkIGZyb20gdGhlIGVudHJhbmNlc1xuICAgICAgICAgICB0byBQeXJhbWlkIGFuZCBDcnlwdCksIG9uZSB1bmJsb2NrZWQgb24gdGhlIGxvd2VyIGZsb29yLCBhbmQgb25lXG4gICAgICAgICAgIGRvd24gdGhlIHN0YWlycyBhbmQgYmVoaW5kIGEgcm9jayB3YWxsIGZyb20gdGhlIHVwcGVyIGZsb29yLiAgVGhpc1xuICAgICAgICAgICBmbGFnIHByZXZlbnRzIGFkZGluZyB0aGF0IGNhdmUuICBJZiBzZXQgYXMgXCJWIW1cIiB0aGVuIGEgZGlyZWN0IHBhdGhcbiAgICAgICAgICAgd2lsbCBpbnN0ZWFkIGJlIGFkZGVkIGJldHdlZW4gVmFsbGV5IG9mIFdpbmQgYW5kIExpbWUgVHJlZSBWYWxsZXlcbiAgICAgICAgICAgKGFzIGluIGVhcmxpZXIgdmVyc2lvbnMgb2YgdGhlIHJhbmRvbWl6ZXIpLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNob3BzID0gVmFuaWxsYS5mbGFnKCdWcycsIHtcbiAgICBuYW1lOiAnVmFuaWxsYSBzaG9wcycsXG4gICAgdGV4dDogYEJ5IGRlZmF1bHQsIHdlIGRpc2FibGUgc2hvcCBnbGl0Y2gsIHNodWZmbGUgc2hvcCBjb250ZW50cywgYW5kIHRpZVxuICAgICAgICAgICB0aGUgcHJpY2VzIHRvIHRoZSBzY2FsaW5nIGxldmVsIChpdGVtIHNob3BzIGFuZCBpbm5zIGluY3JlYXNlIGJ5IGFcbiAgICAgICAgICAgZmFjdG9yIG9mIDIgZXZlcnkgMTAgc2NhbGluZyBsZXZlbHMsIGFybW9yIHNob3BzIGRlY3JlYXNlIGJ5IGFcbiAgICAgICAgICAgZmFjdG9yIG9mIDIgZXZlcnkgMTIgc2NhbGluZyBsZXZlbHMpLiAgVGhpcyBmbGFnIHByZXZlbnRzIGFsbCBvZlxuICAgICAgICAgICB0aGVzZSBjaGFuZ2VzLCByZXN0b3Jpbmcgc2hvcHMgdG8gYmUgY29tcGxldGVseSB2YW5pbGxhLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBXaWxkV2FycCA9IFZhbmlsbGEuZmxhZygnVncnLCB7XG4gICAgbmFtZTogJ1ZhbmlsbGEgd2lsZCB3YXJwJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgV2lsZCBXYXJwIGlzIG5lcmZlZCB0byBvbmx5IHJldHVybiB0byBNZXphbWUgU2hyaW5lLlxuICAgICAgICAgICBUaGlzIGZsYWcgcmVzdG9yZXMgaXQgdG8gd29yayBsaWtlIG5vcm1hbC4gIE5vdGUgdGhhdCB0aGlzIHdpbGwgcHV0XG4gICAgICAgICAgIGFsbCB3aWxkIHdhcnAgbG9jYXRpb25zIGluIGxvZ2ljIHVubGVzcyB0aGUgZmxhZyBpcyBzZXQgYXMgKFYhdykuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcbn1cblxuY2xhc3MgUXVhbGl0eSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1EnO1xuICByZWFkb25seSBuYW1lID0gJ1F1YWxpdHkgb2YgTGlmZSc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlIGZvbGxvd2luZyBxdWFsaXR5LW9mLWxpZmUgZmxhZ3MgdHVybiA8aT5vZmY8L2k+IGltcHJvdmVtZW50cyB0aGF0XG4gICAgICBhcmUgbm9ybWFsbHkgb24gYnkgZGVmYXVsdC4gIFRoZXkgYXJlIG9wdGlvbmFsIGFuZCB3aWxsIG5vdCBhZmZlY3QgdGhlXG4gICAgICBzZWVkIGdlbmVyYXRpb24uICBUaGV5IG1heSBiZSB0b2dnbGVkIGZyZWVseSBpbiByYWNlIG1vZGUuYDtcblxuICAvLyBUT0RPIC0gcmVtZW1iZXIgcHJlZmVyZW5jZXMgYW5kIGF1dG8tYXBwbHk/XG4gIHN0YXRpYyByZWFkb25seSBOb0F1dG9FcXVpcCA9IFF1YWxpdHkuZmxhZygnUWEnLCB7XG4gICAgbmFtZTogYERvbid0IGF1dG9tYXRpY2FsbHkgZXF1aXAgb3JicyBhbmQgYnJhY2VsZXRzYCxcbiAgICB0ZXh0OiBgUHJldmVudHMgYWRkaW5nIGEgcXVhbGl0eS1vZi1saWZlIGltcHJvdmVtZW50IHRvIGF1dG9tYXRpY2FsbHkgZXF1aXBcbiAgICAgICAgICAgdGhlIGNvcnJlc3BvbmRpbmcgb3JiL2JyYWNlbGV0IHdoZW5ldmVyIGNoYW5naW5nIHN3b3Jkcy5gLFxuICAgIG9wdGlvbmFsOiBPUFRJT05BTCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vQ29udHJvbGxlclNob3J0Y3V0cyA9IFF1YWxpdHkuZmxhZygnUWMnLCB7XG4gICAgbmFtZTogJ0Rpc2FibGUgY29udHJvbGxlciBzaG9ydGN1dHMnLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB3ZSBkaXNhYmxlIHNlY29uZCBjb250cm9sbGVyIGlucHV0IGFuZCBpbnN0ZWFkIGVuYWJsZVxuICAgICAgICAgICBzb21lIG5ldyBzaG9ydGN1dHMgb24gY29udHJvbGxlciAxOiBTdGFydCtBK0IgZm9yIHdpbGQgd2FycCwgYW5kXG4gICAgICAgICAgIFNlbGVjdCtCIHRvIHF1aWNrbHkgY2hhbmdlIHN3b3Jkcy4gIFRvIHN1cHBvcnQgdGhpcywgdGhlIGFjdGlvbiBvZlxuICAgICAgICAgICB0aGUgc3RhcnQgYW5kIHNlbGVjdCBidXR0b25zIGlzIGNoYW5nZWQgc2xpZ2h0bHkuICBUaGlzIGZsYWdcbiAgICAgICAgICAgZGlzYWJsZXMgdGhpcyBjaGFuZ2UgYW5kIHJldGFpbnMgbm9ybWFsIGJlaGF2aW9yLmAsXG4gICAgb3B0aW9uYWw6IE9QVElPTkFMLFxuICB9KTtcbn1cblxuY2xhc3MgRGVidWdNb2RlIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICAvLyBUT0RPIC0gaG93IHRvIGRpc2NvdmVyIEZsYWdTZWN0aW9ucz8/P1xuICByZWFkb25seSBwcmVmaXggPSAnRCc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnRGVidWcgTW9kZSc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlc2Ugb3B0aW9ucyBhcmUgaGVscGZ1bCBmb3IgZXhwbG9yaW5nIG9yIGRlYnVnZ2luZy4gIE5vdGUgdGhhdCxcbiAgICAgIHdoaWxlIHRoZXkgZG8gbm90IGRpcmVjdGx5IGFmZmVjdCBhbnkgcmFuZG9taXphdGlvbiwgdGhleVxuICAgICAgPGk+ZG88L2k+IGZhY3RvciBpbnRvIHRoZSBzZWVkIHRvIHByZXZlbnQgY2hlYXRpbmcsIGFuZCB0aGV5XG4gICAgICB3aWxsIHJlbW92ZSB0aGUgb3B0aW9uIHRvIGdlbmVyYXRlIGEgc2VlZCBmb3IgcmFjaW5nLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNwb2lsZXJMb2cgPSBEZWJ1Z01vZGUuZmxhZygnRHMnLCB7XG4gICAgbmFtZTogJ0dlbmVyYXRlIGEgc3BvaWxlciBsb2cnLFxuICAgIHRleHQ6IGBOb3RlOiA8Yj50aGlzIHdpbGwgY2hhbmdlIHRoZSBwbGFjZW1lbnQgb2YgaXRlbXM8L2I+IGNvbXBhcmVkIHRvIGFcbiAgICAgICAgICAgc2VlZCBnZW5lcmF0ZWQgd2l0aG91dCB0aGlzIGZsYWcgdHVybmVkIG9uLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBUcmFpbmVyTW9kZSA9IERlYnVnTW9kZS5mbGFnKCdEdCcsIHtcbiAgICBuYW1lOiAnVHJhaW5lciBtb2RlJyxcbiAgICB0ZXh0OiBgSW5zdGFsbHMgYSB0cmFpbmVyIGZvciBwcmFjdGljaW5nIGNlcnRhaW4gcGFydHMgb2YgdGhlIGdhbWUuXG4gICAgICAgICAgIEF0IHRoZSBzdGFydCBvZiB0aGUgZ2FtZSwgdGhlIHBsYXllciB3aWxsIGhhdmUgYWxsIHN3b3JkcywgYmFzaWNcbiAgICAgICAgICAgYXJtb3JzIGFuZCBzaGllbGRzLCBhbGwgd29ybiBpdGVtcyBhbmQgbWFnaWNzLCBhIHNlbGVjdGlvbiBvZlxuICAgICAgICAgICBjb25zdW1hYmxlcywgYm93IG9mIHRydXRoLCBtYXhpbXVtIGNhc2gsIGFsbCB3YXJwIHBvaW50cyBhY3RpdmF0ZWQsXG4gICAgICAgICAgIGFuZCB0aGUgU2h5cm9uIG1hc3NhY3JlIHdpbGwgaGF2ZSBiZWVuIHRyaWdnZXJlZC4gIFdpbGQgd2FycCBpc1xuICAgICAgICAgICByZWNvbmZpZ3VyZWQgdG8gcHJvdmlkZSBlYXN5IGFjY2VzcyB0byBhbGwgYm9zc2VzLiAgQWRkaXRpb25hbGx5LFxuICAgICAgICAgICB0aGUgZm9sbG93aW5nIGJ1dHRvbiBjb21iaW5hdGlvbnMgYXJlIHJlY29nbml6ZWQ6PHVsPlxuICAgICAgICAgICAgIDxsaT5TdGFydCtVcDogaW5jcmVhc2UgcGxheWVyIGxldmVsXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0Rvd246IGluY3JlYXNlIHNjYWxpbmcgbGV2ZWxcbiAgICAgICAgICAgICA8bGk+U3RhcnQrTGVmdDogZ2V0IGFsbCBiYWxsc1xuICAgICAgICAgICAgIDxsaT5TdGFydCtSaWdodDogZ2V0IGFsbCBicmFjZWxldHNcbiAgICAgICAgICAgICA8bGk+U3RhcnQrQitEb3duOiBnZXQgYSBmdWxsIHNldCBvZiBjb25zdW1hYmxlIGl0ZW1zXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0IrTGVmdDogZ2V0IGFsbCBhZHZhbmNlZCBhcm1vcnNcbiAgICAgICAgICAgICA8bGk+U3RhcnQrQitSaWdodDogZ2V0IGFsbCBhZHZhbmNlZCBzaGllbGRzXG4gICAgICAgICAgIDwvdWw+YCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5ldmVyRGllID0gRGVidWdNb2RlLmZsYWcoJ0RpJywge1xuICAgIG5hbWU6ICdQbGF5ZXIgbmV2ZXIgZGllcycsXG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgRmxhZ1NldCB7XG4gIHByaXZhdGUgZmxhZ3M6IE1hcDxGbGFnLCBNb2RlPjtcblxuICBjb25zdHJ1Y3RvcihzdHI6IHN0cmluZ3xNYXA8RmxhZywgTW9kZT4gPSAnQENhc3VhbCcpIHtcbiAgICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuZmxhZ3MgPSBuZXcgTWFwKCk7XG4gICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBzdHIpIHtcbiAgICAgICAgdGhpcy5zZXQoay5mbGFnLCB2KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHN0ci5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgIC8vIFRPRE8gLSBzdXBwb3J0ICdAQ2FzdWFsK1JzLUVkJ1xuICAgICAgY29uc3QgZXhwYW5kZWQgPSBQcmVzZXRzLmdldChzdHIuc3Vic3RyaW5nKDEpKTtcbiAgICAgIGlmICghZXhwYW5kZWQpIHRocm93IG5ldyBVc2FnZUVycm9yKGBVbmtub3duIHByZXNldDogJHtzdHJ9YCk7XG4gICAgICB0aGlzLmZsYWdzID0gbmV3IE1hcChleHBhbmRlZC5mbGFncyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZmxhZ3MgPSBuZXcgTWFwKCk7XG4gICAgLy8gcGFyc2UgdGhlIHN0cmluZ1xuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9bXkEtWmEtejAtOSE/XS9nLCAnJyk7XG4gICAgY29uc3QgcmUgPSAvKFtBLVpdKShbYS16MC05IT9dKykvZztcbiAgICBsZXQgbWF0Y2g7XG4gICAgd2hpbGUgKChtYXRjaCA9IHJlLmV4ZWMoc3RyKSkpIHtcbiAgICAgIGNvbnN0IFssIGtleSwgdGVybXNdID0gbWF0Y2g7XG4gICAgICBjb25zdCByZTIgPSAvKFshP118XikoW2EtejAtOV0rKS9nO1xuICAgICAgd2hpbGUgKChtYXRjaCA9IHJlMi5leGVjKHRlcm1zKSkpIHtcbiAgICAgICAgY29uc3QgWywgbW9kZSwgZmxhZ3NdID0gbWF0Y2g7XG4gICAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBmbGFncykge1xuICAgICAgICAgIHRoaXMuc2V0KGtleSArIGZsYWcsIG1vZGUgfHwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmaWx0ZXJPcHRpb25hbCgpOiBGbGFnU2V0IHtcbiAgICByZXR1cm4gbmV3IEZsYWdTZXQoXG4gICAgICAgIG5ldyBNYXAoXG4gICAgICAgICAgICBbLi4udGhpcy5mbGFnc10ubWFwKFxuICAgICAgICAgICAgICAgIChbaywgdl0pID0+IFtrLCBrLm9wdHMub3B0aW9uYWwgPyBrLm9wdHMub3B0aW9uYWwodikgOiB2XSkpKTtcbiAgfVxuXG4gIGZpbHRlclJhbmRvbShyYW5kb206IFJhbmRvbSk6IEZsYWdTZXQge1xuICAgIGZ1bmN0aW9uIHBpY2soazogRmxhZywgdjogTW9kZSk6IE1vZGUge1xuICAgICAgaWYgKHYgIT09ICc/JykgcmV0dXJuIHY7XG4gICAgICByZXR1cm4gcmFuZG9tLnBpY2soW3RydWUsIGZhbHNlLCAuLi4oay5vcHRzLm1vZGVzIHx8ICcnKV0pO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEZsYWdTZXQoXG4gICAgICAgIG5ldyBNYXAoWy4uLnRoaXMuZmxhZ3NdLm1hcCgoW2ssIHZdKSA9PiBbaywgcGljayhrLCB2KV0pKSk7XG4gIH1cblxuICB0b1N0cmluZygpIHtcbiAgICB0eXBlIFNlY3Rpb24gPSBEZWZhdWx0TWFwPHN0cmluZywgc3RyaW5nW10+O1xuICAgIGNvbnN0IHNlY3Rpb25zID1cbiAgICAgICAgbmV3IERlZmF1bHRNYXA8c3RyaW5nLCBTZWN0aW9uPihcbiAgICAgICAgICAgICgpID0+IG5ldyBEZWZhdWx0TWFwPHN0cmluZywgc3RyaW5nW10+KCgpID0+IFtdKSlcbiAgICBmb3IgKGNvbnN0IFtmbGFnLCBtb2RlXSBvZiB0aGlzLmZsYWdzKSB7XG4gICAgICBpZiAoZmxhZy5mbGFnLmxlbmd0aCAhPT0gMikgdGhyb3cgbmV3IEVycm9yKGBCYWQgZmxhZyAke2ZsYWcuZmxhZ31gKTtcbiAgICAgIGlmICghbW9kZSkgY29udGludWU7XG4gICAgICBjb25zdCBzZWN0aW9uID0gc2VjdGlvbnMuZ2V0KGZsYWcuZmxhZ1swXSk7XG4gICAgICBjb25zdCBzdWJzZWN0aW9uID0gbW9kZSA9PT0gdHJ1ZSA/ICcnIDogbW9kZTtcbiAgICAgIHNlY3Rpb24uZ2V0KHN1YnNlY3Rpb24pLnB1c2goZmxhZy5mbGFnWzFdKTtcbiAgICB9XG4gICAgY29uc3Qgb3V0ID0gW107XG4gICAgZm9yIChjb25zdCBba2V5LCBzZWN0aW9uXSBvZiBzZWN0aW9ucy5zb3J0ZWRFbnRyaWVzKCkpIHtcbiAgICAgIGxldCBzZWMgPSBrZXk7XG4gICAgICBmb3IgKGNvbnN0IFtzdWJrZXksIHN1YnNlY3Rpb25dIG9mIHNlY3Rpb24pIHtcbiAgICAgICAgc2VjICs9IHN1YmtleSArIHN1YnNlY3Rpb24uc29ydCgpLmpvaW4oJycpO1xuICAgICAgfVxuICAgICAgb3V0LnB1c2goc2VjKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKCcgJyk7XG4gIH1cblxuICB0b2dnbGUobmFtZTogc3RyaW5nKTogTW9kZSB7ICBcbiAgICBjb25zdCBmbGFnID0gRmxhZy5mbGFncy5nZXQobmFtZSk7XG4gICAgaWYgKCFmbGFnKSB7XG4gICAgICAvLyBUT0RPIC0gUmVwb3J0IHNvbWV0aGluZ1xuICAgICAgY29uc29sZS5lcnJvcihgQmFkIGZsYWc6ICR7bmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgbW9kZTogTW9kZSA9IHRoaXMuZmxhZ3MuZ2V0KGZsYWcpIHx8IGZhbHNlO1xuICAgIGNvbnN0IG1vZGVzID0gW2ZhbHNlLCB0cnVlLCAuLi4oZmxhZy5vcHRzLm1vZGVzIHx8ICcnKSwgJz8nLCBmYWxzZV07XG4gICAgY29uc3QgaW5kZXggPSBtb2Rlcy5pbmRleE9mKG1vZGUpO1xuICAgIGlmIChpbmRleCA8IDApIHRocm93IG5ldyBFcnJvcihgQmFkIGN1cnJlbnQgbW9kZSAke21vZGV9YCk7XG4gICAgY29uc3QgbmV4dCA9IG1vZGVzW2luZGV4ICsgMV07XG4gICAgdGhpcy5mbGFncy5zZXQoZmxhZywgbmV4dCk7XG4gICAgcmV0dXJuIG5leHQ7XG4gIH1cblxuICBzZXQobmFtZTogc3RyaW5nLCBtb2RlOiBNb2RlKSB7XG4gICAgY29uc3QgZmxhZyA9IEZsYWcuZmxhZ3MuZ2V0KG5hbWUpO1xuICAgIGlmICghZmxhZykge1xuICAgICAgLy8gVE9ETyAtIFJlcG9ydCBzb21ldGhpbmdcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEJhZCBmbGFnOiAke25hbWV9YCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghbW9kZSkge1xuICAgICAgdGhpcy5mbGFncy5kZWxldGUoZmxhZyk7XG4gICAgfSBlbHNlIGlmIChtb2RlID09PSB0cnVlIHx8IG1vZGUgPT09ICc/JyB8fCBmbGFnLm9wdHMubW9kZXM/LmluY2x1ZGVzKG1vZGUpKSB7XG4gICAgICB0aGlzLmZsYWdzLnNldChmbGFnLCBtb2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihgQmFkIGZsYWcgbW9kZTogJHtuYW1lWzBdfSR7bW9kZX0ke25hbWUuc3Vic3RyaW5nKDEpfWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBSZW1vdmUgYW55IGNvbmZsaWN0c1xuICAgIGZvciAoY29uc3QgZXhjbHVkZWQgb2YgZmxhZy5vcHRzLmV4Y2x1ZGVzIHx8IFtdKSB7XG4gICAgICB0aGlzLmZsYWdzLmRlbGV0ZShGbGFnLmZsYWdzLmdldChleGNsdWRlZCkhKTtcbiAgICB9XG4gIH1cblxuICBjaGVjayhuYW1lOiBGbGFnfHN0cmluZywgLi4ubW9kZXM6IE1vZGVbXSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGZsYWcgPSBuYW1lIGluc3RhbmNlb2YgRmxhZyA/IG5hbWUgOiBGbGFnLmZsYWdzLmdldChuYW1lKTtcbiAgICBpZiAoIW1vZGVzLmxlbmd0aCkgbW9kZXMucHVzaCh0cnVlKTtcbiAgICByZXR1cm4gbW9kZXMuaW5jbHVkZXMoZmxhZyAmJiB0aGlzLmZsYWdzLmdldChmbGFnKSB8fCBmYWxzZSk7XG4gIH1cblxuICBnZXQobmFtZTogRmxhZ3xzdHJpbmcpOiBNb2RlIHtcbiAgICBjb25zdCBmbGFnID0gbmFtZSBpbnN0YW5jZW9mIEZsYWcgPyBuYW1lIDogRmxhZy5mbGFncy5nZXQobmFtZSk7XG4gICAgcmV0dXJuIGZsYWcgJiYgdGhpcy5mbGFncy5nZXQoZmxhZykgfHwgZmFsc2U7XG4gIH1cblxuICBwcmVzZXJ2ZVVuaXF1ZUNoZWNrcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5QcmVzZXJ2ZVVuaXF1ZUNoZWNrcyk7XG4gIH1cbiAgc2h1ZmZsZU1pbWljcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5Ob1NodWZmbGVNaW1pY3MsIGZhbHNlKTtcbiAgfVxuXG4gIGJ1ZmZEZW9zUGVuZGFudCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuICBjaGFuZ2VHYXNNYXNrVG9IYXptYXRTdWl0KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG4gIHNsb3dEb3duVG9ybmFkbygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuICBsZWF0aGVyQm9vdHNHaXZlU3BlZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cbiAgcmFiYml0Qm9vdHNDaGFyZ2VXaGlsZVdhbGtpbmcoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cblxuICBzaHVmZmxlU3ByaXRlUGFsZXR0ZXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplU3ByaXRlQ29sb3JzKTtcbiAgfVxuICBzaHVmZmxlTW9uc3RlcnMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ01yJyk7XG4gIH1cbiAgc2h1ZmZsZVNob3BzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuU2hvcHMsIGZhbHNlKTtcbiAgfVxuICBiYXJnYWluSHVudGluZygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zaHVmZmxlU2hvcHMoKTtcbiAgfVxuXG4gIHNodWZmbGVUb3dlck1vbnN0ZXJzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE1vbnN0ZXJzLlRvd2VyUm9ib3RzKTtcbiAgfVxuICBzaHVmZmxlTW9uc3RlckVsZW1lbnRzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMpO1xuICB9XG4gIHNodWZmbGVCb3NzRWxlbWVudHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc2h1ZmZsZU1vbnN0ZXJFbGVtZW50cygpO1xuICB9XG5cbiAgYnVmZk1lZGljYWxIZXJiKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLk5vQnVmZk1lZGljYWxIZXJiLCBmYWxzZSk7XG4gIH1cbiAgZGVjcmVhc2VFbmVteURhbWFnZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5EZWNyZWFzZUVuZW15RGFtYWdlKTtcbiAgfVxuICB0cmFpbmVyKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKERlYnVnTW9kZS5UcmFpbmVyTW9kZSk7XG4gIH1cbiAgbmV2ZXJEaWUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRGVidWdNb2RlLk5ldmVyRGllKTtcbiAgfVxuICBjaGFyZ2VTaG90c09ubHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuQ2hhcmdlU2hvdHNPbmx5KTtcbiAgfVxuXG4gIGJhcnJpZXJSZXF1aXJlc0NhbG1TZWEoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIH1cbiAgLy8gcGFyYWx5c2lzUmVxdWlyZXNQcmlzb25LZXkoKTogYm9vbGVhbiB7XG4gIC8vICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIC8vIH1cbiAgLy8gc2VhbGVkQ2F2ZVJlcXVpcmVzV2luZG1pbGwoKTogYm9vbGVhbiB7XG4gIC8vICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIC8vIH1cblxuICBjb25uZWN0TGltZVRyZWVUb0xlYWYoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5NYXBzLCAnIScpO1xuICB9XG4gIC8vIGNvbm5lY3RHb2FUb0xlYWYoKSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuY2hlY2soJ1hlJykgJiYgdGhpcy5jaGVjaygnWGcnKTtcbiAgLy8gfVxuICAvLyByZW1vdmVFYXJseVdhbGwoKSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuY2hlY2soJ1hiJyk7XG4gIC8vIH1cbiAgYWRkRWFzdENhdmUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5NYXBzLCBmYWxzZSk7XG4gIH1cbiAgZm9nTGFtcE5vdFJlcXVpcmVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuVmFuaWxsYURvbHBoaW4sIGZhbHNlKTtcbiAgfVxuICBzdG9yeU1vZGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5TdG9yeU1vZGUpO1xuICB9XG4gIG5vQm93TW9kZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk5vQm93TW9kZSk7XG4gIH1cbiAgcmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5WYW5pbGxhRG9scGhpbik7XG4gIH1cbiAgc2FoYXJhUmFiYml0c1JlcXVpcmVUZWxlcGF0aHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JyJyk7XG4gIH1cbiAgdGVsZXBvcnRPblRodW5kZXJTd29yZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgZmFsc2UsICchJyk7XG4gIH1cbiAgcmFuZG9taXplVGh1bmRlclRlbGVwb3J0KCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLCBmYWxzZSk7XG4gIH1cbiAgb3Jic09wdGlvbmFsKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkKTtcbiAgfVxuXG4gIHNodWZmbGVHb2FGbG9vcnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuU2h1ZmZsZUdvYUZsb29ycyk7XG4gIH1cbiAgcmFuZG9taXplTWFwcygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVNYXBzKTtcbiAgfVxuICByYW5kb21pemVUcmFkZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplVHJhZGVzKTtcbiAgfVxuICB1bmlkZW50aWZpZWRJdGVtcygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcyk7XG4gIH1cbiAgcmFuZG9taXplV2FsbHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzKTtcbiAgfVxuXG4gIGd1YXJhbnRlZVN3b3JkKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLkd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQpO1xuICB9XG4gIGd1YXJhbnRlZVN3b3JkTWFnaWMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLCBmYWxzZSk7XG4gIH1cbiAgZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhOb0d1YXJhbnRlZXMuTWF0Y2hpbmdTd29yZCwgZmFsc2UpO1xuICB9XG4gIGd1YXJhbnRlZUdhc01hc2soKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTm9HdWFyYW50ZWVzLkdhc01hc2ssIGZhbHNlKTtcbiAgfVxuICBndWFyYW50ZWVCYXJyaWVyKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE5vR3VhcmFudGVlcy5CYXJyaWVyLCBmYWxzZSk7XG4gIH1cbiAgZ3VhcmFudGVlUmVmcmVzaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5HdWFyYW50ZWVSZWZyZXNoKTtcbiAgfVxuXG4gIGRpc2FibGVTd29yZENoYXJnZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5Td29yZENoYXJnZUdsaXRjaCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVUZWxlcG9ydFNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVSYWJiaXRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlU2hvcEdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLlNob3BzLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVN0YXR1ZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlUmFnZVNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuUmFnZVNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlRmxpZ2h0U3RhdHVlU2tpcCgpIHtcbiAgICAvLyBUT0RPIC0gaW1wbGVtZW50XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3RhdHVlR2F1bnRsZXRTa2lwLCBmYWxzZSk7XG4gIH1cblxuICBhc3N1bWVTd29yZENoYXJnZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5Td29yZENoYXJnZUdsaXRjaCk7XG4gIH1cbiAgYXNzdW1lR2hldHRvRmxpZ2h0KCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLkdoZXR0b0ZsaWdodCk7XG4gIH1cbiAgYXNzdW1lVGVsZXBvcnRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXApO1xuICB9XG4gIGFzc3VtZVJhYmJpdFNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCk7XG4gIH1cbiAgYXNzdW1lU3RhdHVlR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN0YXR1ZUdsaXRjaCk7XG4gIH1cbiAgYXNzdW1lVHJpZ2dlckdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5UcmlnZ2VyU2tpcCk7IC8vIFRPRE8gLSBpbXBsZW1lbnRcbiAgfVxuICBhc3N1bWVGbGlnaHRTdGF0dWVTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN0YXR1ZUdhdW50bGV0U2tpcCk7IC8vIFRPRE8gLSBpbXBsZW1lbnRcbiAgfVxuICBhc3N1bWVXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLldpbGRXYXJwLCB0cnVlKSB8fFxuICAgICAgICB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwKTtcbiAgfVxuICBhc3N1bWVSYWdlU2tpcCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gICAgLy8gcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuUmFnZVNraXApOyAvLyBUT0RPIC0gaW1wbGVtZW50IC0gY2hlY2sgZmx5ZXJcbiAgfVxuXG4gIG5lcmZXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLldpbGRXYXJwLCBmYWxzZSkgJiZcbiAgICAgICAgdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVXaWxkV2FycCwgZmFsc2UpO1xuICB9XG4gIGFsbG93V2lsZFdhcnAoKSB7XG4gICAgcmV0dXJuICF0aGlzLm5lcmZXaWxkV2FycCgpO1xuICB9XG4gIHJhbmRvbWl6ZVdpbGRXYXJwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwLCB0cnVlKTtcbiAgfVxuXG4gIGJsYWNrb3V0TW9kZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5CbGFja291dCk7XG4gIH1cbiAgaGFyZGNvcmVNb2RlKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLlBlcm1hZGVhdGgpO1xuICB9XG4gIGJ1ZmZEeW5hKCkge1xuICAgIHJldHVybiAhdGhpcy5jaGVjayhWYW5pbGxhLkR5bmEpO1xuICB9XG4gIG1heFNjYWxpbmdJblRvd2VyKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyKTtcbiAgfVxuXG4gIGV4cFNjYWxpbmdGYWN0b3IoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuRXhwZXJpZW5jZVNjYWxlc1Nsb3dlcikgPyAwLjI1IDpcbiAgICAgICAgdGhpcy5jaGVjayhFYXN5TW9kZS5FeHBlcmllbmNlU2NhbGVzRmFzdGVyKSA/IDIuNSA6IDE7XG4gIH1cblxuICAvLyBPUFRJT05BTCBGTEFHU1xuICBhdXRvRXF1aXBCcmFjZWxldChwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHBhc3MgPT09ICdlYXJseScgfHwgdGhpcy5jaGVjayhRdWFsaXR5Lk5vQXV0b0VxdWlwLCBmYWxzZSk7XG4gIH1cbiAgY29udHJvbGxlclNob3J0Y3V0cyhwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHBhc3MgPT09ICdlYXJseScgfHwgdGhpcy5jaGVjayhRdWFsaXR5Lk5vQ29udHJvbGxlclNob3J0Y3V0cywgZmFsc2UpO1xuICB9XG4gIHJhbmRvbWl6ZU11c2ljKHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhBZXN0aGV0aWNzLlJhbmRvbWl6ZU11c2ljLCBwYXNzID09PSAnZWFybHknID8gJyEnIDogdHJ1ZSk7XG4gIH1cbiAgc2h1ZmZsZVRpbGVQYWxldHRlcyhwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soQWVzdGhldGljcy5SYW5kb21pemVNYXBDb2xvcnMsXG4gICAgICAgICAgICAgICAgICAgICAgcGFzcyA9PT0gJ2Vhcmx5JyA/ICchJyA6IHRydWUpO1xuICB9XG4gIG5vTXVzaWMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBwYXNzID09PSAnbGF0ZScgJiYgdGhpcy5jaGVjayhBZXN0aGV0aWNzLk5vTXVzaWMpO1xuICB9XG59XG4iXX0=