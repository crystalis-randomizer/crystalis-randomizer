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
        this.Random = new Preset(this, 'Truly Random', `
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
    name: 'Matching sword not guaranteed',
    text: `Player may be required to fight bosses with the wrong sword, which
           may require using "tink strats" dealing 1 damage per hit.`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3NldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy9mbGFnc2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBZ0JqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUU3RCxNQUFNLE9BQU8sSUFBSTtJQU9mLFlBQXFCLElBQVksRUFBVyxJQUFjO1FBQXJDLFNBQUksR0FBSixJQUFJLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFVO1FBQ3hELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBTkQsTUFBTSxDQUFDLEdBQUc7UUFDUixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQzs7QUFKZSxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7QUFXbEQsTUFBTSxPQUFPLE1BQU07SUFTakIsWUFBWSxNQUFlLEVBQ04sSUFBWSxFQUNaLFdBQW1CLEVBQzVCLEtBQWdEO1FBRnZDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUV0QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0Qs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O1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4vcmFuZG9tLmpzJztcblxuaW50ZXJmYWNlIEZsYWdPcHRzIHtcbiAgbmFtZTogc3RyaW5nO1xuICB0ZXh0Pzogc3RyaW5nO1xuICBleGNsdWRlcz86IHN0cmluZ1tdO1xuICBoYXJkPzogYm9vbGVhbjtcbiAgb3B0aW9uYWw/OiAobW9kZTogTW9kZSkgPT4gTW9kZTtcbiAgLy8gQWxsIGZsYWdzIGhhdmUgbW9kZXMgZmFsc2UgYW5kIHRydWUuICBBZGRpdGlvbmFsIG1vZGVzIG1heSBiZVxuICAvLyBzcGVjaWZpZWQgYXMgY2hhcmFjdGVycyBpbiB0aGlzIHN0cmluZyAoZS5nLiAnIScpLlxuICBtb2Rlcz86IHN0cmluZztcbn1cblxudHlwZSBNb2RlID0gYm9vbGVhbnxzdHJpbmc7XG5cbmNvbnN0IE9QVElPTkFMID0gKG1vZGU6IE1vZGUpID0+ICcnO1xuY29uc3QgTk9fQkFORyA9IChtb2RlOiBNb2RlKSA9PiBtb2RlID09PSB0cnVlID8gZmFsc2UgOiBtb2RlO1xuXG5leHBvcnQgY2xhc3MgRmxhZyB7XG4gIHN0YXRpYyByZWFkb25seSBmbGFncyA9IG5ldyBNYXA8c3RyaW5nLCBGbGFnPigpO1xuXG4gIHN0YXRpYyBhbGwoKTogRmxhZ1tdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMuZmxhZ3MudmFsdWVzKCldO1xuICB9XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgZmxhZzogc3RyaW5nLCByZWFkb25seSBvcHRzOiBGbGFnT3B0cykge1xuICAgIEZsYWcuZmxhZ3Muc2V0KGZsYWcsIHRoaXMpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQcmVzZXQge1xuICBzdGF0aWMgYWxsKCk6IFByZXNldFtdIHtcbiAgICBpZiAoIVByZXNldHMuaW5zdGFuY2UpIFByZXNldHMuaW5zdGFuY2UgPSBuZXcgUHJlc2V0cygpO1xuICAgIHJldHVybiBbLi4uUHJlc2V0cy5pbnN0YW5jZS5wcmVzZXRzLnZhbHVlcygpXTtcbiAgfVxuXG4gIHByaXZhdGUgX2ZsYWdTdHJpbmc/OiBzdHJpbmc7XG5cbiAgcmVhZG9ubHkgZmxhZ3M6IFJlYWRvbmx5QXJyYXk8cmVhZG9ubHkgW0ZsYWcsIE1vZGVdPjtcbiAgY29uc3RydWN0b3IocGFyZW50OiBQcmVzZXRzLCAvLyBOT1RFOiBpbXBvc3NpYmxlIHRvIGdldCBhbiBpbnN0YW5jZSBvdXRzaWRlXG4gICAgICAgICAgICAgIHJlYWRvbmx5IG5hbWU6IHN0cmluZyxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgZGVzY3JpcHRpb246IHN0cmluZyxcbiAgICAgICAgICAgICAgZmxhZ3M6IFJlYWRvbmx5QXJyYXk8RmxhZ3xyZWFkb25seSBbRmxhZywgTW9kZV0+KSB7XG4gICAgdGhpcy5mbGFncyA9IGZsYWdzLm1hcChmID0+IGYgaW5zdGFuY2VvZiBGbGFnID8gW2YsIHRydWVdIDogZik7XG4gICAgcGFyZW50LnByZXNldHMuc2V0KG1hcFByZXNldE5hbWUobmFtZSksIHRoaXMpO1xuICB9XG5cbiAgZ2V0IGZsYWdTdHJpbmcoKSB7XG4gICAgaWYgKHRoaXMuX2ZsYWdTdHJpbmcgPT0gbnVsbCkge1xuICAgICAgdGhpcy5fZmxhZ1N0cmluZyA9IFN0cmluZyhuZXcgRmxhZ1NldChgQCR7dGhpcy5uYW1lfWApKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2ZsYWdTdHJpbmc7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFwUHJlc2V0TmFtZShuYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtel0vZywgJycpO1xufVxuXG4vLyBOT1QgRVhQT1JURUQhXG5jbGFzcyBQcmVzZXRzIHtcbiAgc3RhdGljIGluc3RhbmNlOiBQcmVzZXRzIHwgdW5kZWZpbmVkO1xuICByZWFkb25seSBwcmVzZXRzID0gbmV3IE1hcDxzdHJpbmcsIFByZXNldD4oKTtcblxuICBzdGF0aWMgZ2V0KG5hbWU6IHN0cmluZyk6IFByZXNldCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLmluc3RhbmNlKSB0aGlzLmluc3RhbmNlID0gbmV3IFByZXNldHMoKTtcbiAgICByZXR1cm4gdGhpcy5pbnN0YW5jZS5wcmVzZXRzLmdldChtYXBQcmVzZXROYW1lKG5hbWUpKTtcbiAgfVxuXG4gIHJlYWRvbmx5IENhc3VhbCA9IG5ldyBQcmVzZXQodGhpcywgJ0Nhc3VhbCcsIGBcbiAgICAgIEJhc2ljIGZsYWdzIGZvciBhIHJlbGF0aXZlbHkgZWFzeSBwbGF5dGhyb3VnaC4gIFRoaXMgaXMgYSBnb29kXG4gICAgICBwbGFjZSB0byBzdGFydC5gLCBbXG4gICAgICAgIEVhc3lNb2RlLlByZXNlcnZlVW5pcXVlQ2hlY2tzLFxuICAgICAgICBFYXN5TW9kZS5Ob1NodWZmbGVNaW1pY3MsXG4gICAgICAgIEVhc3lNb2RlLkRlY3JlYXNlRW5lbXlEYW1hZ2UsXG4gICAgICAgIEVhc3lNb2RlLkd1YXJhbnRlZVJlZnJlc2gsXG4gICAgICAgIEVhc3lNb2RlLkd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQsXG4gICAgICAgIEVhc3lNb2RlLkV4cGVyaWVuY2VTY2FsZXNGYXN0ZXIsXG4gICAgICAgIFJvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLFxuICAgICAgICBWYW5pbGxhLlNob3BzLFxuICAgICAgICBWYW5pbGxhLkR5bmEsXG4gICAgICAgIFtWYW5pbGxhLk1hcHMsICchJ10sXG4gICAgICAgIFtWYW5pbGxhLldpbGRXYXJwLCAnISddLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IENsYXNzaWMgPSBuZXcgUHJlc2V0KHRoaXMsICdDbGFzc2ljJywgYFxuICAgICAgUHJvdmlkZXMgYSByZWxhdGl2ZWx5IHF1aWNrIHBsYXl0aG91Z2ggd2l0aCBhIHJlYXNvbmFibGUgYW1vdW50IG9mXG4gICAgICBjaGFsbGVuZ2UuICBTaW1pbGFyIHRvIG9sZGVyIHZlcnNpb25zLmAsIFtcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlU3RhcnRpbmdTd29yZCxcbiAgICAgICAgR2xpdGNoZXMuU3RhdHVlR2xpdGNoLFxuICAgICAgICBbUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsICchJ10sXG4gICAgICAgIFtWYW5pbGxhLk1hcHMsICchJ10sXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgU3RhbmRhcmQgPSBuZXcgUHJlc2V0KHRoaXMsICdTdGFuZGFyZCcsIGBcbiAgICAgIFdlbGwtYmFsYW5jZWQsIHN0YW5kYXJkIHJhY2UgZmxhZ3MuYCwgW1xuICAgICAgICAvLyBubyBmbGFncz8gIGFsbCBkZWZhdWx0P1xuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBOb0Jvd01vZGUgPSBuZXcgUHJlc2V0KHRoaXMsICdObyBCb3cgTW9kZScsIGBcbiAgICAgIFRoZSB0b3dlciBpcyBvcGVuIGZyb20gdGhlIHN0YXJ0LCBhcyBzb29uIGFzIHlvdSdyZSByZWFkeSBmb3IgaXQuYCwgW1xuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBNb25zdGVycy5Ub3dlclJvYm90cyxcbiAgICAgICAgSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIsXG4gICAgICAgIFJvdXRpbmcuTm9Cb3dNb2RlLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IEFkdmFuY2VkID0gbmV3IFByZXNldCh0aGlzLCAnQWR2YW5jZWQnLCBgXG4gICAgICBBIGJhbGFuY2VkIHJhbmRvbWl6YXRpb24gd2l0aCBxdWl0ZSBhIGJpdCBtb3JlIGRpZmZpY3VsdHkuYCwgW1xuICAgICAgICBHbGl0Y2hlcy5HaGV0dG9GbGlnaHQsXG4gICAgICAgIEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsXG4gICAgICAgIEdsaXRjaGVzLlN0YXR1ZUdsaXRjaCxcbiAgICAgICAgW0dsaXRjaGVzLlN3b3JkQ2hhcmdlR2xpdGNoLCAnISddLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmFycmllcixcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLFxuICAgICAgICBOb0d1YXJhbnRlZXMuR2FzTWFzayxcbiAgICAgICAgSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIsXG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIE1vbnN0ZXJzLlRvd2VyUm9ib3RzLFxuICAgICAgICBSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZU1hcHMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVRyYWRlcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzLFxuICAgICAgICBXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcyxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBXaWxkV2FycCA9IG5ldyBQcmVzZXQodGhpcywgJ1dpbGQgV2FycCcsIGBcbiAgICAgIFNpZ25pZmljYW50bHkgb3BlbnMgdXAgdGhlIGdhbWUgcmlnaHQgZnJvbSB0aGUgc3RhcnQgd2l0aCB3aWxkXG4gICAgICB3YXJwIGluIGxvZ2ljLmAsIFtcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlUmVmcmVzaCxcbiAgICAgICAgV29ybGQuUmFuZG9taXplV2lsZFdhcnAsXG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIE1vbnN0ZXJzLlRvd2VyUm9ib3RzLFxuICAgICAgICBSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCxcbiAgICAgICAgUm91dGluZy5TdG9yeU1vZGUsXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgSGFyZGNvcmUgPSBuZXcgUHJlc2V0KHRoaXMsICdIYXJkY29yZScsIGBcbiAgICAgIE5vdCBmb3IgdGhlIGZhaW50IG9mIGhlYXJ0LiAgR29vZCBsdWNrLmAsIFtcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhcnJpZXIsXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXR0bGVNYWdpYyxcbiAgICAgICAgSGFyZE1vZGUuRXhwZXJpZW5jZVNjYWxlc1Nsb3dlcixcbiAgICAgICAgSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIsXG4gICAgICAgIEhhcmRNb2RlLlBlcm1hZGVhdGgsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgV29ybGQuUmFuZG9taXplTWFwcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplVHJhZGVzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsXG4gICAgICAgIFdvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgRnVsbFN0dXBpZCA9IG5ldyBQcmVzZXQodGhpcywgJ1RoZSBGdWxsIFN0dXBpZCcsIGBcbiAgICAgIE5vYm9keSBoYXMgZXZlciBjb21wbGV0ZWQgdGhpcy4gIEJlIHN1cmUgdG8gcmVjb3JkIHRoaXMgYmVjYXVzZVxuICAgICAgcGljcyBvciBpdCBkaWRuJ3QgaGFwcGVuLmAsIFsgXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXJyaWVyLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsXG4gICAgICAgIEhhcmRNb2RlLkJsYWNrb3V0LFxuICAgICAgICBIYXJkTW9kZS5FeHBlcmllbmNlU2NhbGVzU2xvd2VyLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgSGFyZE1vZGUuUGVybWFkZWF0aCxcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgV29ybGQuUmFuZG9taXplTWFwcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplVHJhZGVzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsXG4gICAgICAgIFdvcmxkLlNodWZmbGVHb2FGbG9vcnMsXG4gICAgICAgIFdvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgUmFuZG9tID0gbmV3IFByZXNldCh0aGlzLCAnVHJ1bHkgUmFuZG9tJywgYFxuICAgICAgRXZlbiB0aGUgb3B0aW9ucyBhcmUgcmFuZG9tLmAsIFtcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZU1hcHMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVUcmFkZXMsICc/J10sXG4gICAgICAgIFtXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlNodWZmbGVHb2FGbG9vcnMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVTcHJpdGVDb2xvcnMsICc/J10sXG4gICAgICAgIFtXb3JsZC5SYW5kb21pemVXaWxkV2FycCwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuT3Jic05vdFJlcXVpcmVkLCAnPyddLFxuICAgICAgICBbUm91dGluZy5Ob0Jvd01vZGUsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLlN0b3J5TW9kZSwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuVmFuaWxsYURvbHBoaW4sICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlJhZ2VTa2lwLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuVHJpZ2dlclNraXAsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5HaGV0dG9GbGlnaHQsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5Td29yZENoYXJnZUdsaXRjaCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsICc/J10sXG4gICAgICAgIFtBZXN0aGV0aWNzLlJhbmRvbWl6ZU11c2ljLCAnPyddLFxuICAgICAgICBbQWVzdGhldGljcy5SYW5kb21pemVNYXBDb2xvcnMsICc/J10sXG4gICAgICAgIFtNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLCAnPyddLFxuICAgICAgICBbTW9uc3RlcnMuVG93ZXJSb2JvdHMsICc/J10sXG4gICAgICAgIFtFYXN5TW9kZS5Ob1NodWZmbGVNaW1pY3MsICc/J10sXG4gICAgICAgIFtFYXN5TW9kZS5QcmVzZXJ2ZVVuaXF1ZUNoZWNrcywgJz8nXSxcbiAgICAgICAgW05vR3VhcmFudGVlcy5CYXJyaWVyLCAnPyddLFxuICAgICAgICBbTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLCAnPyddLFxuICAgICAgICBbTm9HdWFyYW50ZWVzLkdhc01hc2ssICc/J10sXG4gICAgICAgIFtWYW5pbGxhLkR5bmEsICc/J10sXG4gICAgICAgIFtWYW5pbGxhLkJvbnVzSXRlbXMsICc/J10sXG4gICAgICAgIFtWYW5pbGxhLk1hcHMsICc/J10sXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBGbGFnU2VjdGlvbiB7XG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlOiBGbGFnU2VjdGlvbjtcbiAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgc2VjdGlvbnMgPSBuZXcgU2V0PEZsYWdTZWN0aW9uPigpO1xuXG4gIHN0YXRpYyBhbGwoKTogRmxhZ1NlY3Rpb25bXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLnNlY3Rpb25zXTtcbiAgfVxuXG4gIHByb3RlY3RlZCBzdGF0aWMgZmxhZyhuYW1lOiBzdHJpbmcsIG9wdHM6IGFueSk6IEZsYWcge1xuICAgIEZsYWdTZWN0aW9uLnNlY3Rpb25zLmFkZChcbiAgICAgICAgdGhpcy5pbnN0YW5jZSB8fCAodGhpcy5pbnN0YW5jZSA9IG5ldyAodGhpcyBhcyBhbnkpKCkpKTtcbiAgICBjb25zdCBmbGFnID0gbmV3IEZsYWcobmFtZSwgb3B0cyk7XG4gICAgaWYgKCFuYW1lLnN0YXJ0c1dpdGgodGhpcy5pbnN0YW5jZS5wcmVmaXgpKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCBmbGFnYCk7XG4gICAgdGhpcy5pbnN0YW5jZS5mbGFncy5zZXQobmFtZSwgZmxhZyk7XG4gICAgcmV0dXJuIGZsYWc7XG4gIH1cblxuICBhYnN0cmFjdCByZWFkb25seSBwcmVmaXg6IHN0cmluZztcbiAgYWJzdHJhY3QgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICByZWFkb25seSBkZXNjcmlwdGlvbj86IHN0cmluZztcbiAgcmVhZG9ubHkgZmxhZ3MgPSBuZXcgTWFwPHN0cmluZywgRmxhZz4oKTtcbn1cblxuY2xhc3MgV29ybGQgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdXJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdXb3JsZCc7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZU1hcHMgPSBXb3JsZC5mbGFnKCdXbScsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIG1hcHMnLFxuICAgIHRleHQ6IGBJbmRpdmlkdWFsIG1hcHMgYXJlIHJhbmRvbWl6ZWQuICBGb3Igbm93IHRoaXMgaXMgb25seSBhIHN1YnNldCBvZlxuICAgICAgICAgICBwb3NzaWJsZSBtYXBzLiAgQSByYW5kb21pemVkIG1hcCB3aWxsIGhhdmUgYWxsIHRoZSBzYW1lIGZlYXR1cmVzXG4gICAgICAgICAgIChleGl0cywgY2hlc3RzLCBOUENzLCBldGMpIGV4Y2VwdCB0aGluZ3MgYXJlIG1vdmVkIGFyb3VuZC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVUcmFkZXMgPSBXb3JsZC5mbGFnKCdXdCcsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIHRyYWRlLWluIGl0ZW1zJyxcbiAgICB0ZXh0OiBgSXRlbXMgZXhwZWN0ZWQgYnkgdmFyaW91cyBOUENzIHdpbGwgYmUgc2h1ZmZsZWQ6IHNwZWNpZmljYWxseSxcbiAgICAgICAgICAgU3RhdHVlIG9mIE9ueXgsIEtpcmlzYSBQbGFudCwgTG92ZSBQZW5kYW50LCBJdm9yeSBTdGF0dWUsIEZvZ1xuICAgICAgICAgICBMYW1wLCBhbmQgRmx1dGUgb2YgTGltZSAoZm9yIEFrYWhhbmEpLiAgUmFnZSB3aWxsIGV4cGVjdCBhXG4gICAgICAgICAgIHJhbmRvbSBzd29yZCwgYW5kIFRvcm5lbCB3aWxsIGV4cGVjdCBhIHJhbmRvbSBicmFjZWxldC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBVbmlkZW50aWZpZWRLZXlJdGVtcyA9IFdvcmxkLmZsYWcoJ1d1Jywge1xuICAgIG5hbWU6ICdVbmlkZW50aWZpZWQga2V5IGl0ZW1zJyxcbiAgICB0ZXh0OiBgSXRlbSBuYW1lcyB3aWxsIGJlIGdlbmVyaWMgYW5kIGVmZmVjdHMgd2lsbCBiZSBzaHVmZmxlZC4gIFRoaXNcbiAgICAgICAgICAgaW5jbHVkZXMga2V5cywgZmx1dGVzLCBsYW1wcywgYW5kIHN0YXR1ZXMuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplV2FsbEVsZW1lbnRzID0gV29ybGQuZmxhZygnV2UnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBlbGVtZW50cyB0byBicmVhayB3YWxscycsXG4gICAgdGV4dDogYFdhbGxzIHdpbGwgcmVxdWlyZSBhIHJhbmRvbWl6ZWQgZWxlbWVudCB0byBicmVhay4gIE5vcm1hbCByb2NrIGFuZFxuICAgICAgICAgICBpY2Ugd2FsbHMgd2lsbCBpbmRpY2F0ZSB0aGUgcmVxdWlyZWQgZWxlbWVudCBieSB0aGUgY29sb3IgKGxpZ2h0XG4gICAgICAgICAgIGdyZXkgb3IgeWVsbG93IGZvciB3aW5kLCBibHVlIGZvciBmaXJlLCBicmlnaHQgb3JhbmdlIChcImVtYmVyc1wiKSBmb3JcbiAgICAgICAgICAgd2F0ZXIsIG9yIGRhcmsgZ3JleSAoXCJzdGVlbFwiKSBmb3IgdGh1bmRlci4gIFRoZSBlbGVtZW50IHRvIGJyZWFrXG4gICAgICAgICAgIHRoZXNlIHdhbGxzIGlzIHRoZSBzYW1lIHRocm91Z2hvdXQgYW4gYXJlYS4gIElyb24gd2FsbHMgcmVxdWlyZSBhXG4gICAgICAgICAgIG9uZS1vZmYgcmFuZG9tIGVsZW1lbnQsIHdpdGggbm8gdmlzdWFsIGN1ZSwgYW5kIHR3byB3YWxscyBpbiB0aGVcbiAgICAgICAgICAgc2FtZSBhcmVhIG1heSBoYXZlIGRpZmZlcmVudCByZXF1aXJlbWVudHMuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNodWZmbGVHb2FGbG9vcnMgPSBXb3JsZC5mbGFnKCdXZycsIHtcbiAgICBuYW1lOiAnU2h1ZmZsZSBHb2EgZm9ydHJlc3MgZmxvb3JzJyxcbiAgICAvLyBUT0RPIC0gc2h1ZmZsZSB0aGUgYXJlYS10by1ib3NzIGNvbm5lY3Rpb25zLCB0b28uXG4gICAgdGV4dDogYFRoZSBmb3VyIGFyZWFzIG9mIEdvYSBmb3J0cmVzcyB3aWxsIGFwcGVhciBpbiBhIHJhbmRvbSBvcmRlci5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplU3ByaXRlQ29sb3JzID0gV29ybGQuZmxhZygnV3MnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBzcHJpdGUgY29sb3JzJyxcbiAgICB0ZXh0OiBgTW9uc3RlcnMgYW5kIE5QQ3Mgd2lsbCBoYXZlIGRpZmZlcmVudCBjb2xvcnMuICBUaGlzIGlzIG5vdCBhblxuICAgICAgICAgICBvcHRpb25hbCBmbGFnIGJlY2F1c2UgaXQgYWZmZWN0cyB3aGF0IG1vbnN0ZXJzIGNhbiBiZSBncm91cGVkXG4gICAgICAgICAgIHRvZ2V0aGVyLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVXaWxkV2FycCA9IFdvcmxkLmZsYWcoJ1d3Jywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgd2lsZCB3YXJwJyxcbiAgICB0ZXh0OiBgV2lsZCB3YXJwIHdpbGwgZ28gdG8gTWV6YW1lIFNocmluZSBhbmQgMTUgb3RoZXIgcmFuZG9tIGxvY2F0aW9ucy5cbiAgICAgICAgICAgVGhlc2UgbG9jYXRpb25zIHdpbGwgYmUgY29uc2lkZXJlZCBpbi1sb2dpYy5gLFxuICAgIGV4Y2x1ZGVzOiBbJ1Z3J10sXG4gIH0pO1xufVxuXG5jbGFzcyBSb3V0aW5nIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnUic7XG4gIHJlYWRvbmx5IG5hbWUgPSAnUm91dGluZyc7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFN0b3J5TW9kZSA9IFJvdXRpbmcuZmxhZygnUnMnLCB7XG4gICAgbmFtZTogJ1N0b3J5IE1vZGUnLFxuICAgIHRleHQ6IGBEcmF5Z29uIDIgd29uJ3Qgc3Bhd24gdW5sZXNzIHlvdSBoYXZlIGFsbCBmb3VyIHN3b3JkcyBhbmQgaGF2ZVxuICAgICAgICAgICBkZWZlYXRlZCBhbGwgbWFqb3IgYm9zc2VzIG9mIHRoZSB0ZXRyYXJjaHkuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vQm93TW9kZSA9IFJvdXRpbmcuZmxhZygnUmInLCB7XG4gICAgbmFtZTogJ05vIEJvdyBtb2RlJyxcbiAgICB0ZXh0OiBgTm8gaXRlbXMgYXJlIHJlcXVpcmVkIHRvIGZpbmlzaCB0aGUgZ2FtZS4gIEFuIGV4aXQgaXMgYWRkZWQgZnJvbVxuICAgICAgICAgICBNZXphbWUgc2hyaW5lIGRpcmVjdGx5IHRvIHRoZSBEcmF5Z29uIDIgZmlnaHQgKGFuZCB0aGUgbm9ybWFsIGVudHJhbmNlXG4gICAgICAgICAgIGlzIHJlbW92ZWQpLiAgRHJheWdvbiAyIHNwYXducyBhdXRvbWF0aWNhbGx5IHdpdGggbm8gQm93IG9mIFRydXRoLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBPcmJzTm90UmVxdWlyZWQgPSBSb3V0aW5nLmZsYWcoJ1JvJywge1xuICAgIG5hbWU6ICdPcmJzIG5vdCByZXF1aXJlZCB0byBicmVhayB3YWxscycsXG4gICAgdGV4dDogYFdhbGxzIGNhbiBiZSBicm9rZW4gYW5kIGJyaWRnZXMgZm9ybWVkIHdpdGggbGV2ZWwgMSBzaG90cy5gXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb1RodW5kZXJTd29yZFdhcnAgPSBSb3V0aW5nLmZsYWcoJ1J0Jywge1xuICAgIG5hbWU6ICdObyBTd29yZCBvZiBUaHVuZGVyIHdhcnAnLFxuICAgIHRleHQ6IGBOb3JtYWxseSB3aGVuIGFjcXVpcmluZyB0aGUgdGh1bmRlciBzd29yZCwgdGhlIHBsYXllciBpcyBpbnN0YW50bHlcbiAgICAgICAgICAgd2FycGVkIHRvIGEgcmFuZG9tIHRvd24uICBUaGlzIGZsYWcgZGlzYWJsZXMgdGhlIHdhcnAuICBJZiBzZXQgYXNcbiAgICAgICAgICAgXCJSIXRcIiwgdGhlbiB0aGUgd2FycCB3aWxsIGFsd2F5cyBnbyB0byBTaHlyb24sIGxpa2UgaW4gdmFuaWxsYS5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBWYW5pbGxhRG9scGhpbiA9IFJvdXRpbmcuZmxhZygnUmQnLCB7XG4gICAgbmFtZTogJ1ZhbmlsbGEgRG9scGhpbiBpbnRlcmFjdGlvbnMnLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB0aGUgcmFuZG9taXplciBjaGFuZ2VzIGEgbnVtYmVyIG9mIGRvbHBoaW4gYW5kIGJvYXRcbiAgICAgICAgICAgaW50ZXJhY3Rpb25zOiAoMSkgaGVhbGluZyB0aGUgZG9scGhpbiBhbmQgaGF2aW5nIHRoZSBTaGVsbCBGbHV0ZVxuICAgICAgICAgICBpcyBubyBsb25nZXIgcmVxdWlyZWQgYmVmb3JlIHRoZSBmaXNoZXJtYW4gc3Bhd25zOiBpbnN0ZWFkLCBoZVxuICAgICAgICAgICB3aWxsIHNwYXduIGFzIHNvb24gYXMgeW91IGhhdmUgdGhlIGl0ZW0gaGUgd2FudHM7ICgyKSB0YWxraW5nIHRvXG4gICAgICAgICAgIEtlbnN1IGluIHRoZSBiZWFjaCBjYWJpbiBpcyBubyBsb25nZXIgcmVxdWlyZWQgZm9yIHRoZSBTaGVsbCBGbHV0ZVxuICAgICAgICAgICB0byB3b3JrOiBpbnN0ZWFkLCB0aGUgU2hlbGwgRmx1dGUgd2lsbCBhbHdheXMgd29yaywgYW5kIEtlbnN1IHdpbGxcbiAgICAgICAgICAgc3Bhd24gYWZ0ZXIgdGhlIEZvZyBMYW1wIGlzIHR1cm5lZCBpbiBhbmQgd2lsbCBnaXZlIGEga2V5IGl0ZW1cbiAgICAgICAgICAgY2hlY2suICBUaGlzIGZsYWcgcmVzdG9yZXMgdGhlIHZhbmlsbGEgaW50ZXJhY3Rpb24gd2hlcmUgaGVhbGluZ1xuICAgICAgICAgICBhbmQgc2hlbGwgZmx1dGUgYXJlIHJlcXVpcmVkLmAsXG4gIH0pO1xufVxuXG5jbGFzcyBHbGl0Y2hlcyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0cnO1xuICByZWFkb25seSBuYW1lID0gJ0dsaXRjaGVzJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBCeSBkZWZhdWx0LCB0aGUgcmFuZG9taXplciBkaXNhYmxlcyBhbGwga25vd24gZ2xpdGNoZXMgKGV4Y2VwdCBnaGV0dG9cbiAgICAgIGZsaWdodCkuICBUaGVzZSBmbGFncyBzZWxlY3RpdmVseSByZS1lbmFibGUgY2VydGFpbiBnbGl0Y2hlcy4gIE1vc3Qgb2ZcbiAgICAgIHRoZXNlIGZsYWdzIGhhdmUgdHdvIG1vZGVzOiBub3JtYWxseSBlbmFibGluZyBhIGdsaXRjaCB3aWxsIGFkZCBpdCBhc1xuICAgICAgcG9zc2libHkgcmVxdWlyZWQgYnkgbG9naWMsIGJ1dCBjbGlja2luZyBhIHNlY29uZCB0aW1lIHdpbGwgYWRkIGEgJyEnXG4gICAgICBhbmQgZW5hYmxlIHRoZSBnbGl0Y2ggb3V0c2lkZSBvZiBsb2dpYyAoZS5nLiBcIkchY1wiKS5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBHaGV0dG9GbGlnaHQgPSBHbGl0Y2hlcy5mbGFnKCdHZicsIHtcbiAgICBuYW1lOiAnR2hldHRvIGZsaWdodCcsXG4gICAgdGV4dDogYEdoZXR0byBmbGlnaHQgYWxsb3dzIHVzaW5nIERvbHBoaW4gYW5kIFJhYmJpdCBCb290cyB0byBmbHkgdXAgdGhlXG4gICAgICAgICAgIHdhdGVyZmFsbHMgaW4gdGhlIEFuZ3J5IFNlYSAod2l0aG91dCBjYWxtaW5nIHRoZSB3aGlybHBvb2xzKS5cbiAgICAgICAgICAgVGhpcyBpcyBkb25lIGJ5IHN3aW1taW5nIHVwIHRvIGEgZGlhZ29uYWwgYmVhY2ggYW5kIGp1bXBpbmdcbiAgICAgICAgICAgaW4gYSBkaWZmZXJlbnQgZGlyZWN0aW9uIGltbWVkaWF0ZWx5IGJlZm9yZSBkaXNlbWJhcmtpbmcuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFN0YXR1ZUdsaXRjaCA9IEdsaXRjaGVzLmZsYWcoJ0dzJywge1xuICAgIG5hbWU6ICdTdGF0dWUgZ2xpdGNoJyxcbiAgICB0ZXh0OiBgU3RhdHVlIGdsaXRjaCBhbGxvd3MgZ2V0dGluZyBiZWhpbmQgc3RhdHVlcyB0aGF0IGJsb2NrIGNlcnRhaW5cbiAgICAgICAgICAgZW50cmFuY2VzOiB0aGUgZ3VhcmRzIGluIFBvcnRvYSwgQW1hem9uZXMsIE9haywgR29hLCBhbmQgU2h5cm9uLFxuICAgICAgICAgICBhcyB3ZWxsIGFzIHRoZSBzdGF0dWVzIGluIHRoZSBXYXRlcmZhbGwgQ2F2ZS4gIEl0IGlzIGRvbmUgYnlcbiAgICAgICAgICAgYXBwcm9hY2hpbmcgdGhlIHN0YXR1ZSBmcm9tIHRoZSB0b3AgcmlnaHQgYW5kIGhvbGRpbmcgZG93biBhbmRcbiAgICAgICAgICAgbGVmdCBvbiB0aGUgY29udHJvbGxlciB3aGlsZSBtYXNoaW5nIEIuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTXRTYWJyZVJlcXVpcmVtZW50U2tpcCA9IEdsaXRjaGVzLmZsYWcoJ0duJywge1xuICAgIG5hbWU6ICdNdCBTYWJyZSByZXF1aXJlbWVudHMgc2tpcCcsXG4gICAgdGV4dDogYEVudGVyaW5nIE10IFNhYnJlIE5vcnRoIG5vcm1hbGx5IHJlcXVpcmVzICgxKSBoYXZpbmcgVGVsZXBvcnQsXG4gICAgICAgICAgIGFuZCAoMikgdGFsa2luZyB0byB0aGUgcmFiYml0IGluIExlYWYgYWZ0ZXIgdGhlIGFiZHVjdGlvbiAodmlhXG4gICAgICAgICAgIFRlbGVwYXRoeSkuICBCb3RoIG9mIHRoZXNlIHJlcXVpcmVtZW50cyBjYW4gYmUgc2tpcHBlZDogZmlyc3QgYnlcbiAgICAgICAgICAgZmx5aW5nIG92ZXIgdGhlIHJpdmVyIGluIENvcmRlbCBwbGFpbiByYXRoZXIgdGhhbiBjcm9zc2luZyB0aGVcbiAgICAgICAgICAgYnJpZGdlLCBhbmQgdGhlbiBieSB0aHJlYWRpbmcgdGhlIG5lZWRsZSBiZXR3ZWVuIHRoZSBoaXRib3hlcyBpblxuICAgICAgICAgICBNdCBTYWJyZSBOb3J0aC5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTdGF0dWVHYXVudGxldFNraXAgPSBHbGl0Y2hlcy5mbGFnKCdHZycsIHtcbiAgICBuYW1lOiAnU3RhdHVlIGd1YW50bGV0IHNraXAnLFxuICAgIHRleHQ6IGBUaGUgc2hvb3Rpbmcgc3RhdHVlcyBpbiBmcm9udCBvZiBHb2EgYW5kIFN0eHkgbm9ybWFsbHkgcmVxdWlyZVxuICAgICAgICAgICBCYXJyaWVyIHRvIHBhc3Mgc2FmZWx5LiAgV2l0aCB0aGlzIGZsYWcsIEZsaWdodCBjYW4gYWxzbyBiZSB1c2VkXG4gICAgICAgICAgIGJ5IGZseWluZyBhcm91bmQgdGhlIGVkZ2Ugb2YgdGhlIHN0YXR1ZS5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTd29yZENoYXJnZUdsaXRjaCA9IEdsaXRjaGVzLmZsYWcoJ0djJywge1xuICAgIG5hbWU6ICdTd29yZCBjaGFyZ2UgZ2xpdGNoJyxcbiAgICB0ZXh0OiBgU3dvcmQgY2hhcmdlIGdsaXRjaCBhbGxvd3MgY2hhcmdpbmcgb25lIHN3b3JkIHRvIHRoZSBsZXZlbCBvZlxuICAgICAgICAgICBhbm90aGVyIHN3b3JkIGJ5IGVxdWlwcGluZyB0aGUgaGlnaGVyLWxldmVsIHN3b3JkLCByZS1lbnRlcmluZ1xuICAgICAgICAgICB0aGUgbWVudSwgY2hhbmdpbmcgdG8gdGhlIGxvd2VyLWxldmVsIHN3b3JkIHdpdGhvdXQgZXhpdGluZyB0aGVcbiAgICAgICAgICAgbWVudSwgY3JlYXRpbmcgYSBoYXJkIHNhdmUsIHJlc2V0dGluZywgYW5kIHRoZW4gY29udGludWluZy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFRyaWdnZXJTa2lwID0gR2xpdGNoZXMuZmxhZygnR3QnLCB7XG4gICAgbmFtZTogJ1RyaWdnZXIgc2tpcCcsXG4gICAgdGV4dDogYEEgd2lkZSB2YXJpZXR5IG9mIHRyaWdnZXJzIGFuZCBleGl0IHNxdWFyZXMgY2FuIGJlIHNraXBwZWQgYnlcbiAgICAgICAgICAgdXNpbmcgYW4gaW52YWxpZCBpdGVtIGV2ZXJ5IGZyYW1lIHdoaWxlIHdhbGtpbmcuICBUaGlzIGFsbG93c1xuICAgICAgICAgICBieXBhc3NpbmcgYm90aCBNdCBTYWJyZSBlbnRyYW5jZSB0cmlnZ2VycywgdGhlIEV2aWwgU3Bpcml0IElzbGFuZFxuICAgICAgICAgICBlbnRyYW5jZSB0cmlnZ2VyLCB0cmlnZ2VycyBmb3IgZ3VhcmRzIHRvIG1vdmUsIHNsb3BlcywgYW5kIHNlYW1sZXNzXG4gICAgICAgICAgIG1hcCB0cmFuc2l0aW9ucy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhZ2VTa2lwID0gR2xpdGNoZXMuZmxhZygnR3InLCB7XG4gICAgbmFtZTogJ1JhZ2Ugc2tpcCcsXG4gICAgdGV4dDogYFJhZ2UgY2FuIGJlIHNraXBwZWQgYnkgZGFtYWdlLWJvb3N0aW5nIGRpYWdvbmFsbHkgaW50byB0aGUgTGltZVxuICAgICAgICAgICBUcmVlIExha2Ugc2NyZWVuLiAgVGhpcyBwcm92aWRlcyBhY2Nlc3MgdG8gdGhlIGFyZWEgYmV5b25kIHRoZVxuICAgICAgICAgICBsYWtlIGlmIGZsaWdodCBvciBicmlkZ2VzIGFyZSBhdmFpbGFibGUuYCxcbiAgICBoYXJkOiB0cnVlLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xufVxuXG5jbGFzcyBBZXN0aGV0aWNzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnQSc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnQWVzdGhldGljcyc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlc2UgZmxhZ3MgZG9uJ3QgZGlyZWN0bHkgYWZmZWN0IGdhbWVwbGF5IG9yIHNodWZmbGluZywgYnV0IHRoZXkgZG9cbiAgICAgIGFmZmVjdCB0aGUgZXhwZXJpZW5jZSBzaWduaWZpY2FudGx5IGVub3VnaCB0aGF0IHRoZXJlIGFyZSB0aHJlZSBtb2Rlc1xuICAgICAgZm9yIGVhY2g6IFwib2ZmXCIsIFwib3B0aW9uYWxcIiAobm8gZXhjbGFtYXRpb24gcG9pbnQpLCBhbmQgXCJyZXF1aXJlZFwiXG4gICAgICAoZXhjbGFtYXRpb24gcG9pbnQpLiAgVGhlIGZpcnN0IHR3byBhcmUgZXF1aXZhbGVudCBmb3Igc2VlZCBnZW5lcmF0aW9uXG4gICAgICBwdXJwb3Nlcywgc28gdGhhdCB5b3UgY2FuIHBsYXkgdGhlIHNhbWUgc2VlZCB3aXRoIGVpdGhlciBzZXR0aW5nLlxuICAgICAgU2V0dGluZyBpdCB0byBcIiFcIiB3aWxsIGNoYW5nZSB0aGUgc2VlZC5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVNdXNpYyA9IEFlc3RoZXRpY3MuZmxhZygnQW0nLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBiYWNrZ3JvdW5kIG11c2ljJyxcbiAgICBtb2RlczogJyEnLFxuICAgIG9wdGlvbmFsOiBOT19CQU5HLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9NdXNpYyA9IEFlc3RoZXRpY3MuZmxhZygnQXMnLCB7XG4gICAgbmFtZTogJ05vIGJhY2tncm91bmQgbXVzaWMnLFxuICAgIG9wdGlvbmFsOiBPUFRJT05BTCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZU1hcENvbG9ycyA9IEFlc3RoZXRpY3MuZmxhZygnQWMnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSBtYXAgY29sb3JzJyxcbiAgICBtb2RlczogJyEnLFxuICAgIG9wdGlvbmFsOiBOT19CQU5HLFxuICB9KTtcbn1cblxuY2xhc3MgTW9uc3RlcnMgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdNJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdNb25zdGVycyc7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVdlYWtuZXNzZXMgPSBNb25zdGVycy5mbGFnKCdNZScsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIG1vbnN0ZXIgd2Vha25lc3NlcycsXG4gICAgdGV4dDogYE1vbnN0ZXIgYW5kIGJvc3MgZWxlbWVudGFsIHdlYWtuZXNzZXMgYXJlIHNodWZmbGVkLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBUb3dlclJvYm90cyA9IE1vbnN0ZXJzLmZsYWcoJ010Jywge1xuICAgIG5hbWU6ICdTaHVmZmxlIHRvd2VyIHJvYm90cycsXG4gICAgdGV4dDogYFRvd2VyIHJvYm90cyB3aWxsIGJlIHNodWZmbGVkIGludG8gdGhlIG5vcm1hbCBwb29sLiAgQXQgc29tZVxuICAgICAgICAgICBwb2ludCwgbm9ybWFsIG1vbnN0ZXJzIG1heSBiZSBzaHVmZmxlZCBpbnRvIHRoZSB0b3dlciBhcyB3ZWxsLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG59XG5cbmNsYXNzIEVhc3lNb2RlIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnRSc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnRWFzeSBNb2RlJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBUaGUgZm9sbG93aW5nIG9wdGlvbnMgbWFrZSBwYXJ0cyBvZiB0aGUgZ2FtZSBlYXNpZXIuYDtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9TaHVmZmxlTWltaWNzID0gRWFzeU1vZGUuZmxhZygnRXQnLCB7XG4gICAgbmFtZTogYERvbid0IHNodWZmbGUgbWltaWNzLmAsXG4gICAgdGV4dDogYE1pbWljcyB3aWxsIGJlIGluIHRoZWlyIHZhbmlsbGEgbG9jYXRpb25zLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBQcmVzZXJ2ZVVuaXF1ZUNoZWNrcyA9IEVhc3lNb2RlLmZsYWcoJ0V1Jywge1xuICAgIG5hbWU6ICdLZWVwIHVuaXF1ZSBpdGVtcyBhbmQgY29uc3VtYWJsZXMgc2VwYXJhdGUnLFxuICAgIHRleHQ6IGBOb3JtYWxseSBhbGwgaXRlbXMgYW5kIG1pbWljcyBhcmUgc2h1ZmZsZWQgaW50byBhIHNpbmdsZSBwb29sIGFuZFxuICAgICAgICAgICBkaXN0cmlidXRlZCBmcm9tIHRoZXJlLiAgSWYgdGhpcyBmbGFnIGlzIHNldCwgdW5pcXVlIGl0ZW1zXG4gICAgICAgICAgIChzcGVjaWZpY2FsbHksIGFueXRoaW5nIHRoYXQgY2Fubm90IGJlIHNvbGQpIHdpbGwgb25seSBiZSBmb3VuZCBpblxuICAgICAgICAgICBlaXRoZXIgKGEpIGNoZWNrcyB0aGF0IGhlbGQgdW5pcXVlIGl0ZW1zIGluIHZhbmlsbGEsIG9yIChiKSBib3NzXG4gICAgICAgICAgIGRyb3BzLiAgQ2hlc3RzIGNvbnRhaW5pbmcgY29uc3VtYWJsZXMgaW4gdmFuaWxsYSBtYXkgYmUgc2FmZWx5XG4gICAgICAgICAgIGlnbm9yZWQsIGJ1dCBjaGVzdHMgY29udGFpbmluZyB1bmlxdWUgaXRlbXMgaW4gdmFuaWxsYSBtYXkgc3RpbGxcbiAgICAgICAgICAgZW5kIHVwIHdpdGggbm9uLXVuaXF1ZSBpdGVtcyBiZWNhdXNlIG9mIGJvc3NlcyBsaWtlIFZhbXBpcmUgMiB0aGF0XG4gICAgICAgICAgIGRyb3AgY29uc3VtYWJsZXMuICBJZiBtaW1pY3MgYXJlIHNodWZmbGVkLCB0aGV5IHdpbGwgb25seSBiZSBpblxuICAgICAgICAgICBjb25zdW1hYmxlIGxvY2F0aW9ucy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgRGVjcmVhc2VFbmVteURhbWFnZSA9IEVhc3lNb2RlLmZsYWcoJ0VkJywge1xuICAgIG5hbWU6ICdEZWNyZWFzZSBlbmVteSBkYW1hZ2UnLFxuICAgIHRleHQ6IGBFbmVteSBhdHRhY2sgcG93ZXIgd2lsbCBiZSBzaWduaWZpY2FudGx5IGRlY3JlYXNlZCBpbiB0aGUgZWFybHkgZ2FtZVxuICAgICAgICAgICAoYnkgYSBmYWN0b3Igb2YgMykuICBUaGUgZ2FwIHdpbGwgbmFycm93IGluIHRoZSBtaWQtZ2FtZSBhbmQgZXZlbnR1YWxseVxuICAgICAgICAgICBwaGFzZSBvdXQgYXQgc2NhbGluZyBsZXZlbCA0MC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgR3VhcmFudGVlU3RhcnRpbmdTd29yZCA9IEVhc3lNb2RlLmZsYWcoJ0VzJywge1xuICAgIG5hbWU6ICdHdWFyYW50ZWUgc3RhcnRpbmcgc3dvcmQnLFxuICAgIHRleHQ6IGBUaGUgTGVhZiBlbGRlciBpcyBndWFyYW50ZWVkIHRvIGdpdmUgYSBzd29yZC4gIEl0IHdpbGwgbm90IGJlXG4gICAgICAgICAgIHJlcXVpcmVkIHRvIGRlYWwgd2l0aCBhbnkgZW5lbWllcyBiZWZvcmUgZmluZGluZyB0aGUgZmlyc3Qgc3dvcmQuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEd1YXJhbnRlZVJlZnJlc2ggPSBFYXN5TW9kZS5mbGFnKCdFcicsIHtcbiAgICBuYW1lOiAnR3VhcmFudGVlIHJlZnJlc2gnLFxuICAgIHRleHQ6IGBHdWFyYW50ZWVzIHRoZSBSZWZyZXNoIHNwZWxsIHdpbGwgYmUgYXZhaWxhYmxlIGJlZm9yZSBmaWdodGluZ1xuICAgICAgICAgICBUZXRyYXJjaHMuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEV4cGVyaWVuY2VTY2FsZXNGYXN0ZXIgPSBFYXN5TW9kZS5mbGFnKCdFeCcsIHtcbiAgICBuYW1lOiAnRXhwZXJpZW5jZSBzY2FsZXMgZmFzdGVyJyxcbiAgICB0ZXh0OiBgTGVzcyBncmluZGluZyB3aWxsIGJlIHJlcXVpcmVkIHRvIFwia2VlcCB1cFwiIHdpdGggdGhlIGdhbWUgZGlmZmljdWx0eS5gLFxuICAgIGV4Y2x1ZGVzOiBbJ0h4J10sXG4gIH0pO1xufVxuXG5jbGFzcyBOb0d1YXJhbnRlZXMgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdOJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdObyBndWFyYW50ZWVzJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBSZW1vdmVzIHZhcmlvdXMgZ3VhcmFudGVlcyBmcm9tIHRoZSBsb2dpYy5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBCYXR0bGVNYWdpYyA9IE5vR3VhcmFudGVlcy5mbGFnKCdOdycsIHtcbiAgICBuYW1lOiAnQmF0dGxlIG1hZ2ljIG5vdCBndWFyYW50ZWVkJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHksIHRoZSBsb2dpYyB3aWxsIGd1YXJhbnRlZSB0aGF0IGxldmVsIDMgc3dvcmQgY2hhcmdlcyBhcmVcbiAgICAgICAgICAgYXZhaWxhYmxlIGJlZm9yZSBmaWdodGluZyB0aGUgdGV0cmFyY2hzICh3aXRoIHRoZSBleGNlcHRpb24gb2YgS2FybWluZSxcbiAgICAgICAgICAgd2hvIG9ubHkgcmVxdWlyZXMgbGV2ZWwgMikuICBUaGlzIGRpc2FibGVzIHRoYXQgY2hlY2suYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTWF0Y2hpbmdTd29yZCA9IE5vR3VhcmFudGVlcy5mbGFnKCdOcycsIHtcbiAgICBuYW1lOiAnTWF0Y2hpbmcgc3dvcmQgbm90IGd1YXJhbnRlZWQnLFxuICAgIHRleHQ6IGBQbGF5ZXIgbWF5IGJlIHJlcXVpcmVkIHRvIGZpZ2h0IGJvc3NlcyB3aXRoIHRoZSB3cm9uZyBzd29yZCwgd2hpY2hcbiAgICAgICAgICAgbWF5IHJlcXVpcmUgdXNpbmcgXCJ0aW5rIHN0cmF0c1wiIGRlYWxpbmcgMSBkYW1hZ2UgcGVyIGhpdC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBCYXJyaWVyID0gTm9HdWFyYW50ZWVzLmZsYWcoJ05iJywge1xuICAgIG5hbWU6ICdCYXJyaWVyIG5vdCBndWFyYW50ZWVkJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHksIHRoZSBsb2dpYyB3aWxsIGd1YXJhbnRlZSBCYXJyaWVyIChvciBlbHNlIHJlZnJlc2ggYW5kIHNoaWVsZFxuICAgICAgICAgICByaW5nKSBiZWZvcmUgZW50ZXJpbmcgU3R4eSwgdGhlIEZvcnRyZXNzLCBvciBmaWdodGluZyBLYXJtaW5lLiAgVGhpc1xuICAgICAgICAgICBkaXNhYmxlcyB0aGF0IGNoZWNrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEdhc01hc2sgPSBOb0d1YXJhbnRlZXMuZmxhZygnTmcnLCB7XG4gICAgbmFtZTogJ0dhcyBtYXNrIG5vdCBndWFyYW50ZWVkJyxcbiAgICB0ZXh0OiBgVGhlIGxvZ2ljIHdpbGwgbm90IGd1YXJhbnRlZSBnYXMgbWFzayBiZWZvcmUgbmVlZGluZyB0byBlbnRlciB0aGUgc3dhbXAuXG4gICAgICAgICAgIEdhcyBtYXNrIGlzIHN0aWxsIGd1YXJhbnRlZWQgdG8ga2lsbCB0aGUgaW5zZWN0LmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG59XG5cbmNsYXNzIEhhcmRNb2RlIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnSCc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnSGFyZCBtb2RlJztcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9CdWZmTWVkaWNhbEhlcmIgPSBIYXJkTW9kZS5mbGFnKCdIbScsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYnVmZiBtZWRpY2FsIGhlcmIgb3IgZnJ1aXQgb2YgcG93ZXJgLFxuICAgIHRleHQ6IGBNZWRpY2FsIEhlcmIgaXMgbm90IGJ1ZmZlZCB0byBoZWFsIDgwIGRhbWFnZSwgd2hpY2ggaXMgaGVscGZ1bCB0byBtYWtlXG4gICAgICAgICAgIHVwIGZvciBjYXNlcyB3aGVyZSBSZWZyZXNoIGlzIHVuYXZhaWxhYmxlIGVhcmx5LiAgRnJ1aXQgb2YgUG93ZXIgaXMgbm90XG4gICAgICAgICAgIGJ1ZmZlZCB0byByZXN0b3JlIDU2IE1QLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE1heFNjYWxpbmdJblRvd2VyID0gSGFyZE1vZGUuZmxhZygnSHQnLCB7XG4gICAgbmFtZTogJ01heCBzY2FsaW5nIGxldmVsIGluIHRvd2VyJyxcbiAgICB0ZXh0OiBgRW5lbWllcyBpbiB0aGUgdG93ZXIgc3Bhd24gYXQgbWF4IHNjYWxpbmcgbGV2ZWwuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgRXhwZXJpZW5jZVNjYWxlc1Nsb3dlciA9IEhhcmRNb2RlLmZsYWcoJ0h4Jywge1xuICAgIG5hbWU6ICdFeHBlcmllbmNlIHNjYWxlcyBzbG93ZXInLFxuICAgIHRleHQ6IGBNb3JlIGdyaW5kaW5nIHdpbGwgYmUgcmVxdWlyZWQgdG8gXCJrZWVwIHVwXCIgd2l0aCB0aGUgZGlmZmljdWx0eS5gLFxuICAgIGV4Y2x1ZGVzOiBbJ0V4J10sXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IENoYXJnZVNob3RzT25seSA9IEhhcmRNb2RlLmZsYWcoJ0hjJywge1xuICAgIG5hbWU6ICdDaGFyZ2Ugc2hvdHMgb25seScsXG4gICAgdGV4dDogYFN0YWJiaW5nIGlzIGNvbXBsZXRlbHkgaW5lZmZlY3RpdmUuICBPbmx5IGNoYXJnZWQgc2hvdHMgd29yay5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBCbGFja291dCA9IEhhcmRNb2RlLmZsYWcoJ0h6Jywge1xuICAgIG5hbWU6ICdCbGFja291dCcsXG4gICAgdGV4dDogYEFsbCBjYXZlcyBhbmQgZm9ydHJlc3NlcyBhcmUgcGVybWFuZW50bHkgZGFyay5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBQZXJtYWRlYXRoID0gSGFyZE1vZGUuZmxhZygnSGgnLCB7XG4gICAgbmFtZTogJ1Blcm1hZGVhdGgnLFxuICAgIHRleHQ6IGBIYXJkY29yZSBtb2RlOiBjaGVja3BvaW50cyBhbmQgc2F2ZXMgYXJlIHJlbW92ZWQuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcbn1cblxuY2xhc3MgVmFuaWxsYSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgbmFtZSA9ICdWYW5pbGxhJztcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1YnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIE9wdGlvbnMgdG8gcmVzdG9yZSB2YW5pbGxhIGJlaGF2aW9yIGNoYW5nZWQgYnkgZGVmYXVsdC5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBEeW5hID0gVmFuaWxsYS5mbGFnKCdWZCcsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYnVmZiBEeW5hYCxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgd2UgbWFrZXMgdGhlIER5bmEgZmlnaHQgYSBiaXQgbW9yZSBvZiBhIGNoYWxsZW5nZS5cbiAgICAgICAgICAgU2lkZSBwb2RzIHdpbGwgZmlyZSBzaWduaWZpY2FudGx5IG1vcmUuICBUaGUgc2FmZSBzcG90IGhhcyBiZWVuXG4gICAgICAgICAgIHJlbW92ZWQuICBUaGUgcmV2ZW5nZSBiZWFtcyBwYXNzIHRocm91Z2ggYmFycmllci4gIFNpZGUgcG9kcyBjYW5cbiAgICAgICAgICAgbm93IGJlIGtpbGxlZC4gIFRoaXMgZmxhZyBwcmV2ZW50cyB0aGF0IGNoYW5nZS5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgQm9udXNJdGVtcyA9IFZhbmlsbGEuZmxhZygnVmInLCB7XG4gICAgbmFtZTogYERvbid0IGJ1ZmYgYm9udXMgaXRlbXNgLFxuICAgIHRleHQ6IGBMZWF0aGVyIEJvb3RzIGFyZSBjaGFuZ2VkIHRvIFNwZWVkIEJvb3RzLCB3aGljaCBpbmNyZWFzZSBwbGF5ZXIgd2Fsa2luZ1xuICAgICAgICAgICBzcGVlZCAodGhpcyBhbGxvd3MgY2xpbWJpbmcgdXAgdGhlIHNsb3BlIHRvIGFjY2VzcyB0aGUgVG9ybmFkbyBCcmFjZWxldFxuICAgICAgICAgICBjaGVzdCwgd2hpY2ggaXMgdGFrZW4gaW50byBjb25zaWRlcmF0aW9uIGJ5IHRoZSBsb2dpYykuICBEZW8ncyBwZW5kYW50XG4gICAgICAgICAgIHJlc3RvcmVzIE1QIHdoaWxlIG1vdmluZy4gIFJhYmJpdCBib290cyBlbmFibGUgc3dvcmQgY2hhcmdpbmcgdXAgdG9cbiAgICAgICAgICAgbGV2ZWwgMiB3aGlsZSB3YWxraW5nIChsZXZlbCAzIHN0aWxsIHJlcXVpcmVzIGJlaW5nIHN0YXRpb25hcnksIHNvIGFzXG4gICAgICAgICAgIHRvIHByZXZlbnQgd2FzdGluZyB0b25zIG9mIG1hZ2ljKS5gLFxuICB9KTtcblxuICAvLyBUT0RPIC0gaXMgaXQgd29ydGggZXZlbiBhbGxvd2luZyB0byB0dXJuIHRoaXMgb2ZmPyE/XG4gIHN0YXRpYyByZWFkb25seSBNYXBzID0gVmFuaWxsYS5mbGFnKCdWbScsIHtcbiAgICBuYW1lOiAnVmFuaWxsYSBtYXBzJyxcbiAgICB0ZXh0OiBgTm9ybWFsbHkgdGhlIHJhbmRvbWl6ZXIgYWRkcyBhIG5ldyBcIkVhc3QgQ2F2ZVwiIHRvIFZhbGxleSBvZiBXaW5kLFxuICAgICAgICAgICBib3Jyb3dlZCBmcm9tIHRoZSBHQkMgdmVyc2lvbiBvZiB0aGUgZ2FtZS4gIFRoaXMgY2F2ZSBjb250YWlucyB0d29cbiAgICAgICAgICAgY2hlc3RzIChvbmUgY29uc2lkZXJlZCBhIGtleSBpdGVtKSBvbiB0aGUgdXBwZXIgZmxvb3IgYW5kIGV4aXRzIHRvXG4gICAgICAgICAgIHR3byByYW5kb20gYXJlYXMgKGNob3NlbiBiZXR3ZWVuIExpbWUgVHJlZSBWYWxsZXksIENvcmRlbCBQbGFpbixcbiAgICAgICAgICAgR29hIFZhbGxleSwgb3IgRGVzZXJ0IDI7IHRoZSBxdWlja3NhbmQgaXMgcmVtb3ZlZCBmcm9tIHRoZSBlbnRyYW5jZXNcbiAgICAgICAgICAgdG8gUHlyYW1pZCBhbmQgQ3J5cHQpLCBvbmUgdW5ibG9ja2VkIG9uIHRoZSBsb3dlciBmbG9vciwgYW5kIG9uZVxuICAgICAgICAgICBkb3duIHRoZSBzdGFpcnMgYW5kIGJlaGluZCBhIHJvY2sgd2FsbCBmcm9tIHRoZSB1cHBlciBmbG9vci4gIFRoaXNcbiAgICAgICAgICAgZmxhZyBwcmV2ZW50cyBhZGRpbmcgdGhhdCBjYXZlLiAgSWYgc2V0IGFzIFwiViFtXCIgdGhlbiBhIGRpcmVjdCBwYXRoXG4gICAgICAgICAgIHdpbGwgaW5zdGVhZCBiZSBhZGRlZCBiZXR3ZWVuIFZhbGxleSBvZiBXaW5kIGFuZCBMaW1lIFRyZWUgVmFsbGV5XG4gICAgICAgICAgIChhcyBpbiBlYXJsaWVyIHZlcnNpb25zIG9mIHRoZSByYW5kb21pemVyKS5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBTaG9wcyA9IFZhbmlsbGEuZmxhZygnVnMnLCB7XG4gICAgbmFtZTogJ1ZhbmlsbGEgc2hvcHMnLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB3ZSBkaXNhYmxlIHNob3AgZ2xpdGNoLCBzaHVmZmxlIHNob3AgY29udGVudHMsIGFuZCB0aWVcbiAgICAgICAgICAgdGhlIHByaWNlcyB0byB0aGUgc2NhbGluZyBsZXZlbCAoaXRlbSBzaG9wcyBhbmQgaW5ucyBpbmNyZWFzZSBieSBhXG4gICAgICAgICAgIGZhY3RvciBvZiAyIGV2ZXJ5IDEwIHNjYWxpbmcgbGV2ZWxzLCBhcm1vciBzaG9wcyBkZWNyZWFzZSBieSBhXG4gICAgICAgICAgIGZhY3RvciBvZiAyIGV2ZXJ5IDEyIHNjYWxpbmcgbGV2ZWxzKS4gIFRoaXMgZmxhZyBwcmV2ZW50cyBhbGwgb2ZcbiAgICAgICAgICAgdGhlc2UgY2hhbmdlcywgcmVzdG9yaW5nIHNob3BzIHRvIGJlIGNvbXBsZXRlbHkgdmFuaWxsYS5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgV2lsZFdhcnAgPSBWYW5pbGxhLmZsYWcoJ1Z3Jywge1xuICAgIG5hbWU6ICdWYW5pbGxhIHdpbGQgd2FycCcsXG4gICAgdGV4dDogYEJ5IGRlZmF1bHQsIFdpbGQgV2FycCBpcyBuZXJmZWQgdG8gb25seSByZXR1cm4gdG8gTWV6YW1lIFNocmluZS5cbiAgICAgICAgICAgVGhpcyBmbGFnIHJlc3RvcmVzIGl0IHRvIHdvcmsgbGlrZSBub3JtYWwuICBOb3RlIHRoYXQgdGhpcyB3aWxsIHB1dFxuICAgICAgICAgICBhbGwgd2lsZCB3YXJwIGxvY2F0aW9ucyBpbiBsb2dpYyB1bmxlc3MgdGhlIGZsYWcgaXMgc2V0IGFzIChWIXcpLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG59XG5cbmNsYXNzIFF1YWxpdHkgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdRJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdRdWFsaXR5IG9mIExpZmUnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZSBmb2xsb3dpbmcgcXVhbGl0eS1vZi1saWZlIGZsYWdzIHR1cm4gPGk+b2ZmPC9pPiBpbXByb3ZlbWVudHMgdGhhdFxuICAgICAgYXJlIG5vcm1hbGx5IG9uIGJ5IGRlZmF1bHQuICBUaGV5IGFyZSBvcHRpb25hbCBhbmQgd2lsbCBub3QgYWZmZWN0IHRoZVxuICAgICAgc2VlZCBnZW5lcmF0aW9uLiAgVGhleSBtYXkgYmUgdG9nZ2xlZCBmcmVlbHkgaW4gcmFjZSBtb2RlLmA7XG5cbiAgLy8gVE9ETyAtIHJlbWVtYmVyIHByZWZlcmVuY2VzIGFuZCBhdXRvLWFwcGx5P1xuICBzdGF0aWMgcmVhZG9ubHkgTm9BdXRvRXF1aXAgPSBRdWFsaXR5LmZsYWcoJ1FhJywge1xuICAgIG5hbWU6IGBEb24ndCBhdXRvbWF0aWNhbGx5IGVxdWlwIG9yYnMgYW5kIGJyYWNlbGV0c2AsXG4gICAgdGV4dDogYFByZXZlbnRzIGFkZGluZyBhIHF1YWxpdHktb2YtbGlmZSBpbXByb3ZlbWVudCB0byBhdXRvbWF0aWNhbGx5IGVxdWlwXG4gICAgICAgICAgIHRoZSBjb3JyZXNwb25kaW5nIG9yYi9icmFjZWxldCB3aGVuZXZlciBjaGFuZ2luZyBzd29yZHMuYCxcbiAgICBvcHRpb25hbDogT1BUSU9OQUwsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb0NvbnRyb2xsZXJTaG9ydGN1dHMgPSBRdWFsaXR5LmZsYWcoJ1FjJywge1xuICAgIG5hbWU6ICdEaXNhYmxlIGNvbnRyb2xsZXIgc2hvcnRjdXRzJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgd2UgZGlzYWJsZSBzZWNvbmQgY29udHJvbGxlciBpbnB1dCBhbmQgaW5zdGVhZCBlbmFibGVcbiAgICAgICAgICAgc29tZSBuZXcgc2hvcnRjdXRzIG9uIGNvbnRyb2xsZXIgMTogU3RhcnQrQStCIGZvciB3aWxkIHdhcnAsIGFuZFxuICAgICAgICAgICBTZWxlY3QrQiB0byBxdWlja2x5IGNoYW5nZSBzd29yZHMuICBUbyBzdXBwb3J0IHRoaXMsIHRoZSBhY3Rpb24gb2ZcbiAgICAgICAgICAgdGhlIHN0YXJ0IGFuZCBzZWxlY3QgYnV0dG9ucyBpcyBjaGFuZ2VkIHNsaWdodGx5LiAgVGhpcyBmbGFnXG4gICAgICAgICAgIGRpc2FibGVzIHRoaXMgY2hhbmdlIGFuZCByZXRhaW5zIG5vcm1hbCBiZWhhdmlvci5gLFxuICAgIG9wdGlvbmFsOiBPUFRJT05BTCxcbiAgfSk7XG59XG5cbmNsYXNzIERlYnVnTW9kZSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgLy8gVE9ETyAtIGhvdyB0byBkaXNjb3ZlciBGbGFnU2VjdGlvbnM/Pz9cbiAgcmVhZG9ubHkgcHJlZml4ID0gJ0QnO1xuICByZWFkb25seSBuYW1lID0gJ0RlYnVnIE1vZGUnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZXNlIG9wdGlvbnMgYXJlIGhlbHBmdWwgZm9yIGV4cGxvcmluZyBvciBkZWJ1Z2dpbmcuICBOb3RlIHRoYXQsXG4gICAgICB3aGlsZSB0aGV5IGRvIG5vdCBkaXJlY3RseSBhZmZlY3QgYW55IHJhbmRvbWl6YXRpb24sIHRoZXlcbiAgICAgIDxpPmRvPC9pPiBmYWN0b3IgaW50byB0aGUgc2VlZCB0byBwcmV2ZW50IGNoZWF0aW5nLCBhbmQgdGhleVxuICAgICAgd2lsbCByZW1vdmUgdGhlIG9wdGlvbiB0byBnZW5lcmF0ZSBhIHNlZWQgZm9yIHJhY2luZy5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBTcG9pbGVyTG9nID0gRGVidWdNb2RlLmZsYWcoJ0RzJywge1xuICAgIG5hbWU6ICdHZW5lcmF0ZSBhIHNwb2lsZXIgbG9nJyxcbiAgICB0ZXh0OiBgTm90ZTogPGI+dGhpcyB3aWxsIGNoYW5nZSB0aGUgcGxhY2VtZW50IG9mIGl0ZW1zPC9iPiBjb21wYXJlZCB0byBhXG4gICAgICAgICAgIHNlZWQgZ2VuZXJhdGVkIHdpdGhvdXQgdGhpcyBmbGFnIHR1cm5lZCBvbi5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVHJhaW5lck1vZGUgPSBEZWJ1Z01vZGUuZmxhZygnRHQnLCB7XG4gICAgbmFtZTogJ1RyYWluZXIgbW9kZScsXG4gICAgdGV4dDogYEluc3RhbGxzIGEgdHJhaW5lciBmb3IgcHJhY3RpY2luZyBjZXJ0YWluIHBhcnRzIG9mIHRoZSBnYW1lLlxuICAgICAgICAgICBBdCB0aGUgc3RhcnQgb2YgdGhlIGdhbWUsIHRoZSBwbGF5ZXIgd2lsbCBoYXZlIGFsbCBzd29yZHMsIGJhc2ljXG4gICAgICAgICAgIGFybW9ycyBhbmQgc2hpZWxkcywgYWxsIHdvcm4gaXRlbXMgYW5kIG1hZ2ljcywgYSBzZWxlY3Rpb24gb2ZcbiAgICAgICAgICAgY29uc3VtYWJsZXMsIGJvdyBvZiB0cnV0aCwgbWF4aW11bSBjYXNoLCBhbGwgd2FycCBwb2ludHMgYWN0aXZhdGVkLFxuICAgICAgICAgICBhbmQgdGhlIFNoeXJvbiBtYXNzYWNyZSB3aWxsIGhhdmUgYmVlbiB0cmlnZ2VyZWQuICBXaWxkIHdhcnAgaXNcbiAgICAgICAgICAgcmVjb25maWd1cmVkIHRvIHByb3ZpZGUgZWFzeSBhY2Nlc3MgdG8gYWxsIGJvc3Nlcy4gIEFkZGl0aW9uYWxseSxcbiAgICAgICAgICAgdGhlIGZvbGxvd2luZyBidXR0b24gY29tYmluYXRpb25zIGFyZSByZWNvZ25pemVkOjx1bD5cbiAgICAgICAgICAgICA8bGk+U3RhcnQrVXA6IGluY3JlYXNlIHBsYXllciBsZXZlbFxuICAgICAgICAgICAgIDxsaT5TdGFydCtEb3duOiBpbmNyZWFzZSBzY2FsaW5nIGxldmVsXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0xlZnQ6IGdldCBhbGwgYmFsbHNcbiAgICAgICAgICAgICA8bGk+U3RhcnQrUmlnaHQ6IGdldCBhbGwgYnJhY2VsZXRzXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0IrRG93bjogZ2V0IGEgZnVsbCBzZXQgb2YgY29uc3VtYWJsZSBpdGVtc1xuICAgICAgICAgICAgIDxsaT5TdGFydCtCK0xlZnQ6IGdldCBhbGwgYWR2YW5jZWQgYXJtb3JzXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0IrUmlnaHQ6IGdldCBhbGwgYWR2YW5jZWQgc2hpZWxkc1xuICAgICAgICAgICA8L3VsPmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOZXZlckRpZSA9IERlYnVnTW9kZS5mbGFnKCdEaScsIHtcbiAgICBuYW1lOiAnUGxheWVyIG5ldmVyIGRpZXMnLFxuICB9KTtcbn1cblxuZXhwb3J0IGNsYXNzIEZsYWdTZXQge1xuICBwcml2YXRlIGZsYWdzOiBNYXA8RmxhZywgTW9kZT47XG5cbiAgY29uc3RydWN0b3Ioc3RyOiBzdHJpbmd8TWFwPEZsYWcsIE1vZGU+ID0gJ0BDYXN1YWwnKSB7XG4gICAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmZsYWdzID0gbmV3IE1hcCgpO1xuICAgICAgZm9yIChjb25zdCBbaywgdl0gb2Ygc3RyKSB7XG4gICAgICAgIHRoaXMuc2V0KGsuZmxhZywgdik7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChzdHIuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICAvLyBUT0RPIC0gc3VwcG9ydCAnQENhc3VhbCtScy1FZCdcbiAgICAgIGNvbnN0IGV4cGFuZGVkID0gUHJlc2V0cy5nZXQoc3RyLnN1YnN0cmluZygxKSk7XG4gICAgICBpZiAoIWV4cGFuZGVkKSB0aHJvdyBuZXcgVXNhZ2VFcnJvcihgVW5rbm93biBwcmVzZXQ6ICR7c3RyfWApO1xuICAgICAgdGhpcy5mbGFncyA9IG5ldyBNYXAoZXhwYW5kZWQuZmxhZ3MpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmZsYWdzID0gbmV3IE1hcCgpO1xuICAgIC8vIHBhcnNlIHRoZSBzdHJpbmdcbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvW15BLVphLXowLTkhP10vZywgJycpO1xuICAgIGNvbnN0IHJlID0gLyhbQS1aXSkoW2EtejAtOSE/XSspL2c7XG4gICAgbGV0IG1hdGNoO1xuICAgIHdoaWxlICgobWF0Y2ggPSByZS5leGVjKHN0cikpKSB7XG4gICAgICBjb25zdCBbLCBrZXksIHRlcm1zXSA9IG1hdGNoO1xuICAgICAgY29uc3QgcmUyID0gLyhbIT9dfF4pKFthLXowLTldKykvZztcbiAgICAgIHdoaWxlICgobWF0Y2ggPSByZTIuZXhlYyh0ZXJtcykpKSB7XG4gICAgICAgIGNvbnN0IFssIG1vZGUsIGZsYWdzXSA9IG1hdGNoO1xuICAgICAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgICAgICB0aGlzLnNldChrZXkgKyBmbGFnLCBtb2RlIHx8IHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZmlsdGVyT3B0aW9uYWwoKTogRmxhZ1NldCB7XG4gICAgcmV0dXJuIG5ldyBGbGFnU2V0KFxuICAgICAgICBuZXcgTWFwKFxuICAgICAgICAgICAgWy4uLnRoaXMuZmxhZ3NdLm1hcChcbiAgICAgICAgICAgICAgICAoW2ssIHZdKSA9PiBbaywgay5vcHRzLm9wdGlvbmFsID8gay5vcHRzLm9wdGlvbmFsKHYpIDogdl0pKSk7XG4gIH1cblxuICBmaWx0ZXJSYW5kb20ocmFuZG9tOiBSYW5kb20pOiBGbGFnU2V0IHtcbiAgICBmdW5jdGlvbiBwaWNrKGs6IEZsYWcsIHY6IE1vZGUpOiBNb2RlIHtcbiAgICAgIGlmICh2ICE9PSAnPycpIHJldHVybiB2O1xuICAgICAgcmV0dXJuIHJhbmRvbS5waWNrKFt0cnVlLCBmYWxzZSwgLi4uKGsub3B0cy5tb2RlcyB8fCAnJyldKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBGbGFnU2V0KFxuICAgICAgICBuZXcgTWFwKFsuLi50aGlzLmZsYWdzXS5tYXAoKFtrLCB2XSkgPT4gW2ssIHBpY2soaywgdildKSkpO1xuICB9XG5cbiAgdG9TdHJpbmcoKSB7XG4gICAgdHlwZSBTZWN0aW9uID0gRGVmYXVsdE1hcDxzdHJpbmcsIHN0cmluZ1tdPjtcbiAgICBjb25zdCBzZWN0aW9ucyA9XG4gICAgICAgIG5ldyBEZWZhdWx0TWFwPHN0cmluZywgU2VjdGlvbj4oXG4gICAgICAgICAgICAoKSA9PiBuZXcgRGVmYXVsdE1hcDxzdHJpbmcsIHN0cmluZ1tdPigoKSA9PiBbXSkpXG4gICAgZm9yIChjb25zdCBbZmxhZywgbW9kZV0gb2YgdGhpcy5mbGFncykge1xuICAgICAgaWYgKGZsYWcuZmxhZy5sZW5ndGggIT09IDIpIHRocm93IG5ldyBFcnJvcihgQmFkIGZsYWcgJHtmbGFnLmZsYWd9YCk7XG4gICAgICBpZiAoIW1vZGUpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgc2VjdGlvbiA9IHNlY3Rpb25zLmdldChmbGFnLmZsYWdbMF0pO1xuICAgICAgY29uc3Qgc3Vic2VjdGlvbiA9IG1vZGUgPT09IHRydWUgPyAnJyA6IG1vZGU7XG4gICAgICBzZWN0aW9uLmdldChzdWJzZWN0aW9uKS5wdXNoKGZsYWcuZmxhZ1sxXSk7XG4gICAgfVxuICAgIGNvbnN0IG91dCA9IFtdO1xuICAgIGZvciAoY29uc3QgW2tleSwgc2VjdGlvbl0gb2Ygc2VjdGlvbnMuc29ydGVkRW50cmllcygpKSB7XG4gICAgICBsZXQgc2VjID0ga2V5O1xuICAgICAgZm9yIChjb25zdCBbc3Via2V5LCBzdWJzZWN0aW9uXSBvZiBzZWN0aW9uKSB7XG4gICAgICAgIHNlYyArPSBzdWJrZXkgKyBzdWJzZWN0aW9uLnNvcnQoKS5qb2luKCcnKTtcbiAgICAgIH1cbiAgICAgIG91dC5wdXNoKHNlYyk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbignICcpO1xuICB9XG5cbiAgdG9nZ2xlKG5hbWU6IHN0cmluZyk6IE1vZGUgeyAgXG4gICAgY29uc3QgZmxhZyA9IEZsYWcuZmxhZ3MuZ2V0KG5hbWUpO1xuICAgIGlmICghZmxhZykge1xuICAgICAgLy8gVE9ETyAtIFJlcG9ydCBzb21ldGhpbmdcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEJhZCBmbGFnOiAke25hbWV9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IG1vZGU6IE1vZGUgPSB0aGlzLmZsYWdzLmdldChmbGFnKSB8fCBmYWxzZTtcbiAgICBjb25zdCBtb2RlcyA9IFtmYWxzZSwgdHJ1ZSwgLi4uKGZsYWcub3B0cy5tb2RlcyB8fCAnJyksICc/JywgZmFsc2VdO1xuICAgIGNvbnN0IGluZGV4ID0gbW9kZXMuaW5kZXhPZihtb2RlKTtcbiAgICBpZiAoaW5kZXggPCAwKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBjdXJyZW50IG1vZGUgJHttb2RlfWApO1xuICAgIGNvbnN0IG5leHQgPSBtb2Rlc1tpbmRleCArIDFdO1xuICAgIHRoaXMuZmxhZ3Muc2V0KGZsYWcsIG5leHQpO1xuICAgIHJldHVybiBuZXh0O1xuICB9XG5cbiAgc2V0KG5hbWU6IHN0cmluZywgbW9kZTogTW9kZSkge1xuICAgIGNvbnN0IGZsYWcgPSBGbGFnLmZsYWdzLmdldChuYW1lKTtcbiAgICBpZiAoIWZsYWcpIHtcbiAgICAgIC8vIFRPRE8gLSBSZXBvcnQgc29tZXRoaW5nXG4gICAgICBjb25zb2xlLmVycm9yKGBCYWQgZmxhZzogJHtuYW1lfWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIW1vZGUpIHtcbiAgICAgIHRoaXMuZmxhZ3MuZGVsZXRlKGZsYWcpO1xuICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gdHJ1ZSB8fCBtb2RlID09PSAnPycgfHwgZmxhZy5vcHRzLm1vZGVzPy5pbmNsdWRlcyhtb2RlKSkge1xuICAgICAgdGhpcy5mbGFncy5zZXQoZmxhZywgbW9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEJhZCBmbGFnIG1vZGU6ICR7bmFtZVswXX0ke21vZGV9JHtuYW1lLnN1YnN0cmluZygxKX1gKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gUmVtb3ZlIGFueSBjb25mbGljdHNcbiAgICBmb3IgKGNvbnN0IGV4Y2x1ZGVkIG9mIGZsYWcub3B0cy5leGNsdWRlcyB8fCBbXSkge1xuICAgICAgdGhpcy5mbGFncy5kZWxldGUoRmxhZy5mbGFncy5nZXQoZXhjbHVkZWQpISk7XG4gICAgfVxuICB9XG5cbiAgY2hlY2sobmFtZTogRmxhZ3xzdHJpbmcsIC4uLm1vZGVzOiBNb2RlW10pOiBib29sZWFuIHtcbiAgICBjb25zdCBmbGFnID0gbmFtZSBpbnN0YW5jZW9mIEZsYWcgPyBuYW1lIDogRmxhZy5mbGFncy5nZXQobmFtZSk7XG4gICAgaWYgKCFtb2Rlcy5sZW5ndGgpIG1vZGVzLnB1c2godHJ1ZSk7XG4gICAgcmV0dXJuIG1vZGVzLmluY2x1ZGVzKGZsYWcgJiYgdGhpcy5mbGFncy5nZXQoZmxhZykgfHwgZmFsc2UpO1xuICB9XG5cbiAgZ2V0KG5hbWU6IEZsYWd8c3RyaW5nKTogTW9kZSB7XG4gICAgY29uc3QgZmxhZyA9IG5hbWUgaW5zdGFuY2VvZiBGbGFnID8gbmFtZSA6IEZsYWcuZmxhZ3MuZ2V0KG5hbWUpO1xuICAgIHJldHVybiBmbGFnICYmIHRoaXMuZmxhZ3MuZ2V0KGZsYWcpIHx8IGZhbHNlO1xuICB9XG5cbiAgcHJlc2VydmVVbmlxdWVDaGVja3MoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuUHJlc2VydmVVbmlxdWVDaGVja3MpO1xuICB9XG4gIHNodWZmbGVNaW1pY3MoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuTm9TaHVmZmxlTWltaWNzLCBmYWxzZSk7XG4gIH1cblxuICBidWZmRGVvc1BlbmRhbnQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cbiAgY2hhbmdlR2FzTWFza1RvSGF6bWF0U3VpdCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuICBzbG93RG93blRvcm5hZG8oKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cbiAgbGVhdGhlckJvb3RzR2l2ZVNwZWVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG4gIHJhYmJpdEJvb3RzQ2hhcmdlV2hpbGVXYWxraW5nKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG5cbiAgc2h1ZmZsZVNwcml0ZVBhbGV0dGVzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVNwcml0ZUNvbG9ycyk7XG4gIH1cbiAgc2h1ZmZsZU1vbnN0ZXJzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdNcicpO1xuICB9XG4gIHNodWZmbGVTaG9wcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLlNob3BzLCBmYWxzZSk7XG4gIH1cbiAgYmFyZ2Fpbkh1bnRpbmcoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc2h1ZmZsZVNob3BzKCk7XG4gIH1cblxuICBzaHVmZmxlVG93ZXJNb25zdGVycygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhNb25zdGVycy5Ub3dlclJvYm90cyk7XG4gIH1cbiAgc2h1ZmZsZU1vbnN0ZXJFbGVtZW50cygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzKTtcbiAgfVxuICBzaHVmZmxlQm9zc0VsZW1lbnRzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNodWZmbGVNb25zdGVyRWxlbWVudHMoKTtcbiAgfVxuXG4gIGJ1ZmZNZWRpY2FsSGVyYigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5Ob0J1ZmZNZWRpY2FsSGVyYiwgZmFsc2UpO1xuICB9XG4gIGRlY3JlYXNlRW5lbXlEYW1hZ2UoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuRGVjcmVhc2VFbmVteURhbWFnZSk7XG4gIH1cbiAgdHJhaW5lcigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhEZWJ1Z01vZGUuVHJhaW5lck1vZGUpO1xuICB9XG4gIG5ldmVyRGllKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKERlYnVnTW9kZS5OZXZlckRpZSk7XG4gIH1cbiAgY2hhcmdlU2hvdHNPbmx5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLkNoYXJnZVNob3RzT25seSk7XG4gIH1cblxuICBiYXJyaWVyUmVxdWlyZXNDYWxtU2VhKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdSbCcpO1xuICB9XG4gIC8vIHBhcmFseXNpc1JlcXVpcmVzUHJpc29uS2V5KCk6IGJvb2xlYW4ge1xuICAvLyAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdSbCcpO1xuICAvLyB9XG4gIC8vIHNlYWxlZENhdmVSZXF1aXJlc1dpbmRtaWxsKCk6IGJvb2xlYW4ge1xuICAvLyAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdSbCcpO1xuICAvLyB9XG5cbiAgY29ubmVjdExpbWVUcmVlVG9MZWFmKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuTWFwcywgJyEnKTtcbiAgfVxuICAvLyBjb25uZWN0R29hVG9MZWFmKCkge1xuICAvLyAgIHJldHVybiB0aGlzLmNoZWNrKCdYZScpICYmIHRoaXMuY2hlY2soJ1hnJyk7XG4gIC8vIH1cbiAgLy8gcmVtb3ZlRWFybHlXYWxsKCkge1xuICAvLyAgIHJldHVybiB0aGlzLmNoZWNrKCdYYicpO1xuICAvLyB9XG4gIGFkZEVhc3RDYXZlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuTWFwcywgZmFsc2UpO1xuICB9XG4gIGZvZ0xhbXBOb3RSZXF1aXJlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLlZhbmlsbGFEb2xwaGluLCBmYWxzZSk7XG4gIH1cbiAgc3RvcnlNb2RlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuU3RvcnlNb2RlKTtcbiAgfVxuICBub0Jvd01vZGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5Ob0Jvd01vZGUpO1xuICB9XG4gIHJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuVmFuaWxsYURvbHBoaW4pO1xuICB9XG4gIHNhaGFyYVJhYmJpdHNSZXF1aXJlVGVsZXBhdGh5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlOyAvLyB0aGlzLmNoZWNrKCdScicpO1xuICB9XG4gIHRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsIGZhbHNlLCAnIScpO1xuICB9XG4gIHJhbmRvbWl6ZVRodW5kZXJUZWxlcG9ydCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgZmFsc2UpO1xuICB9XG4gIG9yYnNPcHRpb25hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk9yYnNOb3RSZXF1aXJlZCk7XG4gIH1cblxuICByYW5kb21pemVNYXBzKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZU1hcHMpO1xuICB9XG4gIHJhbmRvbWl6ZVRyYWRlcygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVUcmFkZXMpO1xuICB9XG4gIHVuaWRlbnRpZmllZEl0ZW1zKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zKTtcbiAgfVxuICByYW5kb21pemVXYWxscygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMpO1xuICB9XG5cbiAgZ3VhcmFudGVlU3dvcmQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRWFzeU1vZGUuR3VhcmFudGVlU3RhcnRpbmdTd29yZCk7XG4gIH1cbiAgZ3VhcmFudGVlU3dvcmRNYWdpYygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsIGZhbHNlKTtcbiAgfVxuICBndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE5vR3VhcmFudGVlcy5NYXRjaGluZ1N3b3JkLCBmYWxzZSk7XG4gIH1cbiAgZ3VhcmFudGVlR2FzTWFzaygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhOb0d1YXJhbnRlZXMuR2FzTWFzaywgZmFsc2UpO1xuICB9XG4gIGd1YXJhbnRlZUJhcnJpZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTm9HdWFyYW50ZWVzLkJhcnJpZXIsIGZhbHNlKTtcbiAgfVxuICBndWFyYW50ZWVSZWZyZXNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLkd1YXJhbnRlZVJlZnJlc2gpO1xuICB9XG5cbiAgZGlzYWJsZVN3b3JkQ2hhcmdlR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN3b3JkQ2hhcmdlR2xpdGNoLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVRlbGVwb3J0U2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVJhYmJpdFNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVTaG9wR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuU2hvcHMsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlU3RhdHVlR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN0YXR1ZUdsaXRjaCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVSYWdlU2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5SYWdlU2tpcCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVGbGlnaHRTdGF0dWVTa2lwKCkge1xuICAgIC8vIFRPRE8gLSBpbXBsZW1lbnRcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5TdGF0dWVHYXVudGxldFNraXAsIGZhbHNlKTtcbiAgfVxuXG4gIGFzc3VtZVN3b3JkQ2hhcmdlR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN3b3JkQ2hhcmdlR2xpdGNoKTtcbiAgfVxuICBhc3N1bWVHaGV0dG9GbGlnaHQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuR2hldHRvRmxpZ2h0KTtcbiAgfVxuICBhc3N1bWVUZWxlcG9ydFNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCk7XG4gIH1cbiAgYXNzdW1lUmFiYml0U2tpcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5NdFNhYnJlUmVxdWlyZW1lbnRTa2lwKTtcbiAgfVxuICBhc3N1bWVTdGF0dWVHbGl0Y2goKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3RhdHVlR2xpdGNoKTtcbiAgfVxuICBhc3N1bWVUcmlnZ2VyR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlRyaWdnZXJTa2lwKTsgLy8gVE9ETyAtIGltcGxlbWVudFxuICB9XG4gIGFzc3VtZUZsaWdodFN0YXR1ZVNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3RhdHVlR2F1bnRsZXRTa2lwKTsgLy8gVE9ETyAtIGltcGxlbWVudFxuICB9XG4gIGFzc3VtZVdpbGRXYXJwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuV2lsZFdhcnAsIHRydWUpIHx8XG4gICAgICAgIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplV2lsZFdhcnApO1xuICB9XG4gIGFzc3VtZVJhZ2VTa2lwKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgICAvLyByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5SYWdlU2tpcCk7IC8vIFRPRE8gLSBpbXBsZW1lbnQgLSBjaGVjayBmbHllclxuICB9XG5cbiAgbmVyZldpbGRXYXJwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuV2lsZFdhcnAsIGZhbHNlKSAmJlxuICAgICAgICB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwLCBmYWxzZSk7XG4gIH1cbiAgYWxsb3dXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gIXRoaXMubmVyZldpbGRXYXJwKCk7XG4gIH1cbiAgcmFuZG9taXplV2lsZFdhcnAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplV2lsZFdhcnAsIHRydWUpO1xuICB9XG5cbiAgYmxhY2tvdXRNb2RlKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLkJsYWNrb3V0KTtcbiAgfVxuICBoYXJkY29yZU1vZGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuUGVybWFkZWF0aCk7XG4gIH1cbiAgYnVmZkR5bmEoKSB7XG4gICAgcmV0dXJuICF0aGlzLmNoZWNrKFZhbmlsbGEuRHluYSk7XG4gIH1cbiAgbWF4U2NhbGluZ0luVG93ZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuTWF4U2NhbGluZ0luVG93ZXIpO1xuICB9XG5cbiAgZXhwU2NhbGluZ0ZhY3RvcigpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5FeHBlcmllbmNlU2NhbGVzU2xvd2VyKSA/IDAuMjUgOlxuICAgICAgICB0aGlzLmNoZWNrKEVhc3lNb2RlLkV4cGVyaWVuY2VTY2FsZXNGYXN0ZXIpID8gMi41IDogMTtcbiAgfVxuXG4gIC8vIE9QVElPTkFMIEZMQUdTXG4gIGF1dG9FcXVpcEJyYWNlbGV0KHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gcGFzcyA9PT0gJ2Vhcmx5JyB8fCB0aGlzLmNoZWNrKFF1YWxpdHkuTm9BdXRvRXF1aXAsIGZhbHNlKTtcbiAgfVxuICBjb250cm9sbGVyU2hvcnRjdXRzKHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gcGFzcyA9PT0gJ2Vhcmx5JyB8fCB0aGlzLmNoZWNrKFF1YWxpdHkuTm9Db250cm9sbGVyU2hvcnRjdXRzLCBmYWxzZSk7XG4gIH1cbiAgcmFuZG9taXplTXVzaWMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEFlc3RoZXRpY3MuUmFuZG9taXplTXVzaWMsIHBhc3MgPT09ICdlYXJseScgPyAnIScgOiB0cnVlKTtcbiAgfVxuICBzaHVmZmxlVGlsZVBhbGV0dGVzKHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhBZXN0aGV0aWNzLlJhbmRvbWl6ZU1hcENvbG9ycyxcbiAgICAgICAgICAgICAgICAgICAgICBwYXNzID09PSAnZWFybHknID8gJyEnIDogdHJ1ZSk7XG4gIH1cbiAgbm9NdXNpYyhwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHBhc3MgPT09ICdsYXRlJyAmJiB0aGlzLmNoZWNrKEFlc3RoZXRpY3MuTm9NdXNpYyk7XG4gIH1cbn1cbiJdfQ==