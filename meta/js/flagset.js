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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3NldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy9mbGFnc2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBZ0JqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUU3RCxNQUFNLE9BQU8sSUFBSTtJQU9mLFlBQXFCLElBQVksRUFBVyxJQUFjO1FBQXJDLFNBQUksR0FBSixJQUFJLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFVO1FBQ3hELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBTkQsTUFBTSxDQUFDLEdBQUc7UUFDUixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQzs7QUFKZSxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7QUFXbEQsTUFBTSxPQUFPLE1BQU07SUFTakIsWUFBWSxNQUFlLEVBQ04sSUFBWSxFQUNaLFdBQW1CLEVBQzVCLEtBQWdEO1FBRnZDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUV0QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0Qs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RCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1VzYWdlRXJyb3IsIERlZmF1bHRNYXB9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi9yYW5kb20uanMnO1xuXG5pbnRlcmZhY2UgRmxhZ09wdHMge1xuICBuYW1lOiBzdHJpbmc7XG4gIHRleHQ/OiBzdHJpbmc7XG4gIGV4Y2x1ZGVzPzogc3RyaW5nW107XG4gIGhhcmQ/OiBib29sZWFuO1xuICBvcHRpb25hbD86IChtb2RlOiBNb2RlKSA9PiBNb2RlO1xuICAvLyBBbGwgZmxhZ3MgaGF2ZSBtb2RlcyBmYWxzZSBhbmQgdHJ1ZS4gIEFkZGl0aW9uYWwgbW9kZXMgbWF5IGJlXG4gIC8vIHNwZWNpZmllZCBhcyBjaGFyYWN0ZXJzIGluIHRoaXMgc3RyaW5nIChlLmcuICchJykuXG4gIG1vZGVzPzogc3RyaW5nO1xufVxuXG50eXBlIE1vZGUgPSBib29sZWFufHN0cmluZztcblxuY29uc3QgT1BUSU9OQUwgPSAobW9kZTogTW9kZSkgPT4gJyc7XG5jb25zdCBOT19CQU5HID0gKG1vZGU6IE1vZGUpID0+IG1vZGUgPT09IHRydWUgPyBmYWxzZSA6IG1vZGU7XG5cbmV4cG9ydCBjbGFzcyBGbGFnIHtcbiAgc3RhdGljIHJlYWRvbmx5IGZsYWdzID0gbmV3IE1hcDxzdHJpbmcsIEZsYWc+KCk7XG5cbiAgc3RhdGljIGFsbCgpOiBGbGFnW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5mbGFncy52YWx1ZXMoKV07XG4gIH1cblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBmbGFnOiBzdHJpbmcsIHJlYWRvbmx5IG9wdHM6IEZsYWdPcHRzKSB7XG4gICAgRmxhZy5mbGFncy5zZXQoZmxhZywgdGhpcyk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFByZXNldCB7XG4gIHN0YXRpYyBhbGwoKTogUHJlc2V0W10ge1xuICAgIGlmICghUHJlc2V0cy5pbnN0YW5jZSkgUHJlc2V0cy5pbnN0YW5jZSA9IG5ldyBQcmVzZXRzKCk7XG4gICAgcmV0dXJuIFsuLi5QcmVzZXRzLmluc3RhbmNlLnByZXNldHMudmFsdWVzKCldO1xuICB9XG5cbiAgcHJpdmF0ZSBfZmxhZ1N0cmluZz86IHN0cmluZztcblxuICByZWFkb25seSBmbGFnczogUmVhZG9ubHlBcnJheTxyZWFkb25seSBbRmxhZywgTW9kZV0+O1xuICBjb25zdHJ1Y3RvcihwYXJlbnQ6IFByZXNldHMsIC8vIE5PVEU6IGltcG9zc2libGUgdG8gZ2V0IGFuIGluc3RhbmNlIG91dHNpZGVcbiAgICAgICAgICAgICAgcmVhZG9ubHkgbmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICByZWFkb25seSBkZXNjcmlwdGlvbjogc3RyaW5nLFxuICAgICAgICAgICAgICBmbGFnczogUmVhZG9ubHlBcnJheTxGbGFnfHJlYWRvbmx5IFtGbGFnLCBNb2RlXT4pIHtcbiAgICB0aGlzLmZsYWdzID0gZmxhZ3MubWFwKGYgPT4gZiBpbnN0YW5jZW9mIEZsYWcgPyBbZiwgdHJ1ZV0gOiBmKTtcbiAgICBwYXJlbnQucHJlc2V0cy5zZXQobWFwUHJlc2V0TmFtZShuYW1lKSwgdGhpcyk7XG4gIH1cblxuICBnZXQgZmxhZ1N0cmluZygpIHtcbiAgICBpZiAodGhpcy5fZmxhZ1N0cmluZyA9PSBudWxsKSB7XG4gICAgICB0aGlzLl9mbGFnU3RyaW5nID0gU3RyaW5nKG5ldyBGbGFnU2V0KGBAJHt0aGlzLm5hbWV9YCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZmxhZ1N0cmluZztcbiAgfVxufVxuXG5mdW5jdGlvbiBtYXBQcmVzZXROYW1lKG5hbWU6IHN0cmluZykge1xuICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16XS9nLCAnJyk7XG59XG5cbi8vIE5PVCBFWFBPUlRFRCFcbmNsYXNzIFByZXNldHMge1xuICBzdGF0aWMgaW5zdGFuY2U6IFByZXNldHMgfCB1bmRlZmluZWQ7XG4gIHJlYWRvbmx5IHByZXNldHMgPSBuZXcgTWFwPHN0cmluZywgUHJlc2V0PigpO1xuXG4gIHN0YXRpYyBnZXQobmFtZTogc3RyaW5nKTogUHJlc2V0IHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuaW5zdGFuY2UpIHRoaXMuaW5zdGFuY2UgPSBuZXcgUHJlc2V0cygpO1xuICAgIHJldHVybiB0aGlzLmluc3RhbmNlLnByZXNldHMuZ2V0KG1hcFByZXNldE5hbWUobmFtZSkpO1xuICB9XG5cbiAgcmVhZG9ubHkgQ2FzdWFsID0gbmV3IFByZXNldCh0aGlzLCAnQ2FzdWFsJywgYFxuICAgICAgQmFzaWMgZmxhZ3MgZm9yIGEgcmVsYXRpdmVseSBlYXN5IHBsYXl0aHJvdWdoLiAgVGhpcyBpcyBhIGdvb2RcbiAgICAgIHBsYWNlIHRvIHN0YXJ0LmAsIFtcbiAgICAgICAgRWFzeU1vZGUuUHJlc2VydmVVbmlxdWVDaGVja3MsXG4gICAgICAgIEVhc3lNb2RlLk5vU2h1ZmZsZU1pbWljcyxcbiAgICAgICAgRWFzeU1vZGUuRGVjcmVhc2VFbmVteURhbWFnZSxcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlUmVmcmVzaCxcbiAgICAgICAgRWFzeU1vZGUuR3VhcmFudGVlU3RhcnRpbmdTd29yZCxcbiAgICAgICAgRWFzeU1vZGUuRXhwZXJpZW5jZVNjYWxlc0Zhc3RlcixcbiAgICAgICAgUm91dGluZy5Ob1RodW5kZXJTd29yZFdhcnAsXG4gICAgICAgIFZhbmlsbGEuU2hvcHMsXG4gICAgICAgIFZhbmlsbGEuRHluYSxcbiAgICAgICAgW1ZhbmlsbGEuTWFwcywgJyEnXSxcbiAgICAgICAgW1ZhbmlsbGEuV2lsZFdhcnAsICchJ10sXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgQ2xhc3NpYyA9IG5ldyBQcmVzZXQodGhpcywgJ0NsYXNzaWMnLCBgXG4gICAgICBQcm92aWRlcyBhIHJlbGF0aXZlbHkgcXVpY2sgcGxheXRob3VnaCB3aXRoIGEgcmVhc29uYWJsZSBhbW91bnQgb2ZcbiAgICAgIGNoYWxsZW5nZS4gIFNpbWlsYXIgdG8gb2xkZXIgdmVyc2lvbnMuYCwgW1xuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVTdGFydGluZ1N3b3JkLFxuICAgICAgICBHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsXG4gICAgICAgIFtSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgJyEnXSxcbiAgICAgICAgW1ZhbmlsbGEuTWFwcywgJyEnXSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBTdGFuZGFyZCA9IG5ldyBQcmVzZXQodGhpcywgJ1N0YW5kYXJkJywgYFxuICAgICAgV2VsbC1iYWxhbmNlZCwgc3RhbmRhcmQgcmFjZSBmbGFncy5gLCBbXG4gICAgICAgIC8vIG5vIGZsYWdzPyAgYWxsIGRlZmF1bHQ/XG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IE5vQm93TW9kZSA9IG5ldyBQcmVzZXQodGhpcywgJ05vIEJvdyBNb2RlJywgYFxuICAgICAgVGhlIHRvd2VyIGlzIG9wZW4gZnJvbSB0aGUgc3RhcnQsIGFzIHNvb24gYXMgeW91J3JlIHJlYWR5IGZvciBpdC5gLCBbXG4gICAgICAgIE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsXG4gICAgICAgIE1vbnN0ZXJzLlRvd2VyUm9ib3RzLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgUm91dGluZy5Ob0Jvd01vZGUsXG4gICAgICAgIERlYnVnTW9kZS5TcG9pbGVyTG9nLFxuICAgICAgXSk7XG5cbiAgcmVhZG9ubHkgQWR2YW5jZWQgPSBuZXcgUHJlc2V0KHRoaXMsICdBZHZhbmNlZCcsIGBcbiAgICAgIEEgYmFsYW5jZWQgcmFuZG9taXphdGlvbiB3aXRoIHF1aXRlIGEgYml0IG1vcmUgZGlmZmljdWx0eS5gLCBbXG4gICAgICAgIEdsaXRjaGVzLkdoZXR0b0ZsaWdodCxcbiAgICAgICAgR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCxcbiAgICAgICAgR2xpdGNoZXMuU3RhdHVlR2xpdGNoLFxuICAgICAgICBbR2xpdGNoZXMuU3dvcmRDaGFyZ2VHbGl0Y2gsICchJ10sXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXJyaWVyLFxuICAgICAgICBOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsXG4gICAgICAgIE5vR3VhcmFudGVlcy5HYXNNYXNrLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgV29ybGQuUmFuZG9taXplTWFwcyxcbiAgICAgICAgV29ybGQuUmFuZG9taXplVHJhZGVzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXYWxsRWxlbWVudHMsXG4gICAgICAgIFdvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLFxuICAgICAgICBEZWJ1Z01vZGUuU3BvaWxlckxvZyxcbiAgICAgIF0pO1xuXG4gIHJlYWRvbmx5IFdpbGRXYXJwID0gbmV3IFByZXNldCh0aGlzLCAnV2lsZCBXYXJwJywgYFxuICAgICAgU2lnbmlmaWNhbnRseSBvcGVucyB1cCB0aGUgZ2FtZSByaWdodCBmcm9tIHRoZSBzdGFydCB3aXRoIHdpbGRcbiAgICAgIHdhcnAgaW4gbG9naWMuYCwgW1xuICAgICAgICBFYXN5TW9kZS5HdWFyYW50ZWVSZWZyZXNoLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVXaWxkV2FycCxcbiAgICAgICAgTW9uc3RlcnMuUmFuZG9taXplV2Vha25lc3NlcyxcbiAgICAgICAgTW9uc3RlcnMuVG93ZXJSb2JvdHMsXG4gICAgICAgIFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkLFxuICAgICAgICBSb3V0aW5nLlN0b3J5TW9kZSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcblxuICByZWFkb25seSBIYXJkY29yZSA9IG5ldyBQcmVzZXQodGhpcywgJ0hhcmRjb3JlJywgYFxuICAgICAgTm90IGZvciB0aGUgZmFpbnQgb2YgaGVhcnQuICBHb29kIGx1Y2suYCwgW1xuICAgICAgICBOb0d1YXJhbnRlZXMuQmFycmllcixcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLFxuICAgICAgICBIYXJkTW9kZS5FeHBlcmllbmNlU2NhbGVzU2xvd2VyLFxuICAgICAgICBIYXJkTW9kZS5NYXhTY2FsaW5nSW5Ub3dlcixcbiAgICAgICAgSGFyZE1vZGUuUGVybWFkZWF0aCxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVNYXBzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVUcmFkZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyxcbiAgICAgICAgV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsXG4gICAgICBdKTtcblxuICByZWFkb25seSBGdWxsU3R1cGlkID0gbmV3IFByZXNldCh0aGlzLCAnVGhlIEZ1bGwgU3R1cGlkJywgYFxuICAgICAgTm9ib2R5IGhhcyBldmVyIGNvbXBsZXRlZCB0aGlzLiAgQmUgc3VyZSB0byByZWNvcmQgdGhpcyBiZWNhdXNlXG4gICAgICBwaWNzIG9yIGl0IGRpZG4ndCBoYXBwZW4uYCwgWyBcbiAgICAgICAgTm9HdWFyYW50ZWVzLkJhcnJpZXIsXG4gICAgICAgIE5vR3VhcmFudGVlcy5CYXR0bGVNYWdpYyxcbiAgICAgICAgSGFyZE1vZGUuQmxhY2tvdXQsXG4gICAgICAgIEhhcmRNb2RlLkV4cGVyaWVuY2VTY2FsZXNTbG93ZXIsXG4gICAgICAgIEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyLFxuICAgICAgICBIYXJkTW9kZS5QZXJtYWRlYXRoLFxuICAgICAgICBNb25zdGVycy5SYW5kb21pemVXZWFrbmVzc2VzLFxuICAgICAgICBNb25zdGVycy5Ub3dlclJvYm90cyxcbiAgICAgICAgUm91dGluZy5PcmJzTm90UmVxdWlyZWQsXG4gICAgICAgIFJvdXRpbmcuU3RvcnlNb2RlLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVNYXBzLFxuICAgICAgICBXb3JsZC5SYW5kb21pemVUcmFkZXMsXG4gICAgICAgIFdvcmxkLlJhbmRvbWl6ZVdhbGxFbGVtZW50cyxcbiAgICAgICAgV29ybGQuU2h1ZmZsZUdvYUZsb29ycyxcbiAgICAgICAgV29ybGQuVW5pZGVudGlmaWVkS2V5SXRlbXMsXG4gICAgICBdKTtcblxuICByZWFkb25seSBSYW5kb20gPSBuZXcgUHJlc2V0KHRoaXMsICdUcnVseSBSYW5kb20nLCBgXG4gICAgICBFdmVuIHRoZSBvcHRpb25zIGFyZSByYW5kb20uYCwgW1xuICAgICAgICBbV29ybGQuUmFuZG9taXplTWFwcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVRyYWRlcywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlVuaWRlbnRpZmllZEtleUl0ZW1zLCAnPyddLFxuICAgICAgICBbV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzLCAnPyddLFxuICAgICAgICBbV29ybGQuU2h1ZmZsZUdvYUZsb29ycywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVNwcml0ZUNvbG9ycywgJz8nXSxcbiAgICAgICAgW1dvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwLCAnPyddLFxuICAgICAgICBbUm91dGluZy5PcmJzTm90UmVxdWlyZWQsICc/J10sXG4gICAgICAgIFtSb3V0aW5nLk5vQm93TW9kZSwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuU3RvcnlNb2RlLCAnPyddLFxuICAgICAgICBbUm91dGluZy5WYW5pbGxhRG9scGhpbiwgJz8nXSxcbiAgICAgICAgW1JvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuUmFnZVNraXAsICc/J10sXG4gICAgICAgIFtHbGl0Y2hlcy5UcmlnZ2VyU2tpcCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlN0YXR1ZUdsaXRjaCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLkdoZXR0b0ZsaWdodCwgJz8nXSxcbiAgICAgICAgW0dsaXRjaGVzLlN3b3JkQ2hhcmdlR2xpdGNoLCAnPyddLFxuICAgICAgICBbR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCwgJz8nXSxcbiAgICAgICAgW0Flc3RoZXRpY3MuUmFuZG9taXplTXVzaWMsICc/J10sXG4gICAgICAgIFtBZXN0aGV0aWNzLlJhbmRvbWl6ZU1hcENvbG9ycywgJz8nXSxcbiAgICAgICAgW01vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMsICc/J10sXG4gICAgICAgIFtNb25zdGVycy5Ub3dlclJvYm90cywgJz8nXSxcbiAgICAgICAgW0Vhc3lNb2RlLk5vU2h1ZmZsZU1pbWljcywgJz8nXSxcbiAgICAgICAgW0Vhc3lNb2RlLlByZXNlcnZlVW5pcXVlQ2hlY2tzLCAnPyddLFxuICAgICAgICBbTm9HdWFyYW50ZWVzLkJhcnJpZXIsICc/J10sXG4gICAgICAgIFtOb0d1YXJhbnRlZXMuQmF0dGxlTWFnaWMsICc/J10sXG4gICAgICAgIFtOb0d1YXJhbnRlZXMuR2FzTWFzaywgJz8nXSxcbiAgICAgICAgW1ZhbmlsbGEuRHluYSwgJz8nXSxcbiAgICAgICAgW1ZhbmlsbGEuQm9udXNJdGVtcywgJz8nXSxcbiAgICAgICAgW1ZhbmlsbGEuTWFwcywgJz8nXSxcbiAgICAgICAgRGVidWdNb2RlLlNwb2lsZXJMb2csXG4gICAgICBdKTtcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEZsYWdTZWN0aW9uIHtcbiAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2U6IEZsYWdTZWN0aW9uO1xuICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBzZWN0aW9ucyA9IG5ldyBTZXQ8RmxhZ1NlY3Rpb24+KCk7XG5cbiAgc3RhdGljIGFsbCgpOiBGbGFnU2VjdGlvbltdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMuc2VjdGlvbnNdO1xuICB9XG5cbiAgcHJvdGVjdGVkIHN0YXRpYyBmbGFnKG5hbWU6IHN0cmluZywgb3B0czogYW55KTogRmxhZyB7XG4gICAgRmxhZ1NlY3Rpb24uc2VjdGlvbnMuYWRkKFxuICAgICAgICB0aGlzLmluc3RhbmNlIHx8ICh0aGlzLmluc3RhbmNlID0gbmV3ICh0aGlzIGFzIGFueSkoKSkpO1xuICAgIGNvbnN0IGZsYWcgPSBuZXcgRmxhZyhuYW1lLCBvcHRzKTtcbiAgICBpZiAoIW5hbWUuc3RhcnRzV2l0aCh0aGlzLmluc3RhbmNlLnByZWZpeCkpIHRocm93IG5ldyBFcnJvcihgYmFkIGZsYWdgKTtcbiAgICB0aGlzLmluc3RhbmNlLmZsYWdzLnNldChuYW1lLCBmbGFnKTtcbiAgICByZXR1cm4gZmxhZztcbiAgfVxuXG4gIGFic3RyYWN0IHJlYWRvbmx5IHByZWZpeDogc3RyaW5nO1xuICBhYnN0cmFjdCByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuICByZWFkb25seSBmbGFncyA9IG5ldyBNYXA8c3RyaW5nLCBGbGFnPigpO1xufVxuXG5jbGFzcyBXb3JsZCBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1cnO1xuICByZWFkb25seSBuYW1lID0gJ1dvcmxkJztcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplTWFwcyA9IFdvcmxkLmZsYWcoJ1dtJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgbWFwcycsXG4gICAgdGV4dDogYEluZGl2aWR1YWwgbWFwcyBhcmUgcmFuZG9taXplZC4gIEZvciBub3cgdGhpcyBpcyBvbmx5IGEgc3Vic2V0IG9mXG4gICAgICAgICAgIHBvc3NpYmxlIG1hcHMuICBBIHJhbmRvbWl6ZWQgbWFwIHdpbGwgaGF2ZSBhbGwgdGhlIHNhbWUgZmVhdHVyZXNcbiAgICAgICAgICAgKGV4aXRzLCBjaGVzdHMsIE5QQ3MsIGV0YykgZXhjZXB0IHRoaW5ncyBhcmUgbW92ZWQgYXJvdW5kLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVRyYWRlcyA9IFdvcmxkLmZsYWcoJ1d0Jywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgdHJhZGUtaW4gaXRlbXMnLFxuICAgIHRleHQ6IGBJdGVtcyBleHBlY3RlZCBieSB2YXJpb3VzIE5QQ3Mgd2lsbCBiZSBzaHVmZmxlZDogc3BlY2lmaWNhbGx5LFxuICAgICAgICAgICBTdGF0dWUgb2YgT255eCwgS2lyaXNhIFBsYW50LCBMb3ZlIFBlbmRhbnQsIEl2b3J5IFN0YXR1ZSwgRm9nXG4gICAgICAgICAgIExhbXAsIGFuZCBGbHV0ZSBvZiBMaW1lIChmb3IgQWthaGFuYSkuICBSYWdlIHdpbGwgZXhwZWN0IGFcbiAgICAgICAgICAgcmFuZG9tIHN3b3JkLCBhbmQgVG9ybmVsIHdpbGwgZXhwZWN0IGEgcmFuZG9tIGJyYWNlbGV0LmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFVuaWRlbnRpZmllZEtleUl0ZW1zID0gV29ybGQuZmxhZygnV3UnLCB7XG4gICAgbmFtZTogJ1VuaWRlbnRpZmllZCBrZXkgaXRlbXMnLFxuICAgIHRleHQ6IGBJdGVtIG5hbWVzIHdpbGwgYmUgZ2VuZXJpYyBhbmQgZWZmZWN0cyB3aWxsIGJlIHNodWZmbGVkLiAgVGhpc1xuICAgICAgICAgICBpbmNsdWRlcyBrZXlzLCBmbHV0ZXMsIGxhbXBzLCBhbmQgc3RhdHVlcy5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVXYWxsRWxlbWVudHMgPSBXb3JsZC5mbGFnKCdXZScsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIGVsZW1lbnRzIHRvIGJyZWFrIHdhbGxzJyxcbiAgICB0ZXh0OiBgV2FsbHMgd2lsbCByZXF1aXJlIGEgcmFuZG9taXplZCBlbGVtZW50IHRvIGJyZWFrLiAgTm9ybWFsIHJvY2sgYW5kXG4gICAgICAgICAgIGljZSB3YWxscyB3aWxsIGluZGljYXRlIHRoZSByZXF1aXJlZCBlbGVtZW50IGJ5IHRoZSBjb2xvciAobGlnaHRcbiAgICAgICAgICAgZ3JleSBvciB5ZWxsb3cgZm9yIHdpbmQsIGJsdWUgZm9yIGZpcmUsIGJyaWdodCBvcmFuZ2UgKFwiZW1iZXJzXCIpIGZvclxuICAgICAgICAgICB3YXRlciwgb3IgZGFyayBncmV5IChcInN0ZWVsXCIpIGZvciB0aHVuZGVyLiAgVGhlIGVsZW1lbnQgdG8gYnJlYWtcbiAgICAgICAgICAgdGhlc2Ugd2FsbHMgaXMgdGhlIHNhbWUgdGhyb3VnaG91dCBhbiBhcmVhLiAgSXJvbiB3YWxscyByZXF1aXJlIGFcbiAgICAgICAgICAgb25lLW9mZiByYW5kb20gZWxlbWVudCwgd2l0aCBubyB2aXN1YWwgY3VlLCBhbmQgdHdvIHdhbGxzIGluIHRoZVxuICAgICAgICAgICBzYW1lIGFyZWEgbWF5IGhhdmUgZGlmZmVyZW50IHJlcXVpcmVtZW50cy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU2h1ZmZsZUdvYUZsb29ycyA9IFdvcmxkLmZsYWcoJ1dnJywge1xuICAgIG5hbWU6ICdTaHVmZmxlIEdvYSBmb3J0cmVzcyBmbG9vcnMnLFxuICAgIC8vIFRPRE8gLSBzaHVmZmxlIHRoZSBhcmVhLXRvLWJvc3MgY29ubmVjdGlvbnMsIHRvby5cbiAgICB0ZXh0OiBgVGhlIGZvdXIgYXJlYXMgb2YgR29hIGZvcnRyZXNzIHdpbGwgYXBwZWFyIGluIGEgcmFuZG9tIG9yZGVyLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBSYW5kb21pemVTcHJpdGVDb2xvcnMgPSBXb3JsZC5mbGFnKCdXcycsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIHNwcml0ZSBjb2xvcnMnLFxuICAgIHRleHQ6IGBNb25zdGVycyBhbmQgTlBDcyB3aWxsIGhhdmUgZGlmZmVyZW50IGNvbG9ycy4gIFRoaXMgaXMgbm90IGFuXG4gICAgICAgICAgIG9wdGlvbmFsIGZsYWcgYmVjYXVzZSBpdCBhZmZlY3RzIHdoYXQgbW9uc3RlcnMgY2FuIGJlIGdyb3VwZWRcbiAgICAgICAgICAgdG9nZXRoZXIuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZVdpbGRXYXJwID0gV29ybGQuZmxhZygnV3cnLCB7XG4gICAgbmFtZTogJ1JhbmRvbWl6ZSB3aWxkIHdhcnAnLFxuICAgIHRleHQ6IGBXaWxkIHdhcnAgd2lsbCBnbyB0byBNZXphbWUgU2hyaW5lIGFuZCAxNSBvdGhlciByYW5kb20gbG9jYXRpb25zLlxuICAgICAgICAgICBUaGVzZSBsb2NhdGlvbnMgd2lsbCBiZSBjb25zaWRlcmVkIGluLWxvZ2ljLmAsXG4gICAgZXhjbHVkZXM6IFsnVncnXSxcbiAgfSk7XG59XG5cbmNsYXNzIFJvdXRpbmcgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdSJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdSb3V0aW5nJztcblxuICBzdGF0aWMgcmVhZG9ubHkgU3RvcnlNb2RlID0gUm91dGluZy5mbGFnKCdScycsIHtcbiAgICBuYW1lOiAnU3RvcnkgTW9kZScsXG4gICAgdGV4dDogYERyYXlnb24gMiB3b24ndCBzcGF3biB1bmxlc3MgeW91IGhhdmUgYWxsIGZvdXIgc3dvcmRzIGFuZCBoYXZlXG4gICAgICAgICAgIGRlZmVhdGVkIGFsbCBtYWpvciBib3NzZXMgb2YgdGhlIHRldHJhcmNoeS5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTm9Cb3dNb2RlID0gUm91dGluZy5mbGFnKCdSYicsIHtcbiAgICBuYW1lOiAnTm8gQm93IG1vZGUnLFxuICAgIHRleHQ6IGBObyBpdGVtcyBhcmUgcmVxdWlyZWQgdG8gZmluaXNoIHRoZSBnYW1lLiAgQW4gZXhpdCBpcyBhZGRlZCBmcm9tXG4gICAgICAgICAgIE1lemFtZSBzaHJpbmUgZGlyZWN0bHkgdG8gdGhlIERyYXlnb24gMiBmaWdodCAoYW5kIHRoZSBub3JtYWwgZW50cmFuY2VcbiAgICAgICAgICAgaXMgcmVtb3ZlZCkuICBEcmF5Z29uIDIgc3Bhd25zIGF1dG9tYXRpY2FsbHkgd2l0aCBubyBCb3cgb2YgVHJ1dGguYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE9yYnNOb3RSZXF1aXJlZCA9IFJvdXRpbmcuZmxhZygnUm8nLCB7XG4gICAgbmFtZTogJ09yYnMgbm90IHJlcXVpcmVkIHRvIGJyZWFrIHdhbGxzJyxcbiAgICB0ZXh0OiBgV2FsbHMgY2FuIGJlIGJyb2tlbiBhbmQgYnJpZGdlcyBmb3JtZWQgd2l0aCBsZXZlbCAxIHNob3RzLmBcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vVGh1bmRlclN3b3JkV2FycCA9IFJvdXRpbmcuZmxhZygnUnQnLCB7XG4gICAgbmFtZTogJ05vIFN3b3JkIG9mIFRodW5kZXIgd2FycCcsXG4gICAgdGV4dDogYE5vcm1hbGx5IHdoZW4gYWNxdWlyaW5nIHRoZSB0aHVuZGVyIHN3b3JkLCB0aGUgcGxheWVyIGlzIGluc3RhbnRseVxuICAgICAgICAgICB3YXJwZWQgdG8gYSByYW5kb20gdG93bi4gIFRoaXMgZmxhZyBkaXNhYmxlcyB0aGUgd2FycC4gIElmIHNldCBhc1xuICAgICAgICAgICBcIlIhdFwiLCB0aGVuIHRoZSB3YXJwIHdpbGwgYWx3YXlzIGdvIHRvIFNoeXJvbiwgbGlrZSBpbiB2YW5pbGxhLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFZhbmlsbGFEb2xwaGluID0gUm91dGluZy5mbGFnKCdSZCcsIHtcbiAgICBuYW1lOiAnVmFuaWxsYSBEb2xwaGluIGludGVyYWN0aW9ucycsXG4gICAgdGV4dDogYEJ5IGRlZmF1bHQsIHRoZSByYW5kb21pemVyIGNoYW5nZXMgYSBudW1iZXIgb2YgZG9scGhpbiBhbmQgYm9hdFxuICAgICAgICAgICBpbnRlcmFjdGlvbnM6ICgxKSBoZWFsaW5nIHRoZSBkb2xwaGluIGFuZCBoYXZpbmcgdGhlIFNoZWxsIEZsdXRlXG4gICAgICAgICAgIGlzIG5vIGxvbmdlciByZXF1aXJlZCBiZWZvcmUgdGhlIGZpc2hlcm1hbiBzcGF3bnM6IGluc3RlYWQsIGhlXG4gICAgICAgICAgIHdpbGwgc3Bhd24gYXMgc29vbiBhcyB5b3UgaGF2ZSB0aGUgaXRlbSBoZSB3YW50czsgKDIpIHRhbGtpbmcgdG9cbiAgICAgICAgICAgS2Vuc3UgaW4gdGhlIGJlYWNoIGNhYmluIGlzIG5vIGxvbmdlciByZXF1aXJlZCBmb3IgdGhlIFNoZWxsIEZsdXRlXG4gICAgICAgICAgIHRvIHdvcms6IGluc3RlYWQsIHRoZSBTaGVsbCBGbHV0ZSB3aWxsIGFsd2F5cyB3b3JrLCBhbmQgS2Vuc3Ugd2lsbFxuICAgICAgICAgICBzcGF3biBhZnRlciB0aGUgRm9nIExhbXAgaXMgdHVybmVkIGluIGFuZCB3aWxsIGdpdmUgYSBrZXkgaXRlbVxuICAgICAgICAgICBjaGVjay4gIFRoaXMgZmxhZyByZXN0b3JlcyB0aGUgdmFuaWxsYSBpbnRlcmFjdGlvbiB3aGVyZSBoZWFsaW5nXG4gICAgICAgICAgIGFuZCBzaGVsbCBmbHV0ZSBhcmUgcmVxdWlyZWQuYCxcbiAgfSk7XG59XG5cbmNsYXNzIEdsaXRjaGVzIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBwcmVmaXggPSAnRyc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnR2xpdGNoZXMnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIEJ5IGRlZmF1bHQsIHRoZSByYW5kb21pemVyIGRpc2FibGVzIGFsbCBrbm93biBnbGl0Y2hlcyAoZXhjZXB0IGdoZXR0b1xuICAgICAgZmxpZ2h0KS4gIFRoZXNlIGZsYWdzIHNlbGVjdGl2ZWx5IHJlLWVuYWJsZSBjZXJ0YWluIGdsaXRjaGVzLiAgTW9zdCBvZlxuICAgICAgdGhlc2UgZmxhZ3MgaGF2ZSB0d28gbW9kZXM6IG5vcm1hbGx5IGVuYWJsaW5nIGEgZ2xpdGNoIHdpbGwgYWRkIGl0IGFzXG4gICAgICBwb3NzaWJseSByZXF1aXJlZCBieSBsb2dpYywgYnV0IGNsaWNraW5nIGEgc2Vjb25kIHRpbWUgd2lsbCBhZGQgYSAnISdcbiAgICAgIGFuZCBlbmFibGUgdGhlIGdsaXRjaCBvdXRzaWRlIG9mIGxvZ2ljIChlLmcuIFwiRyFjXCIpLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEdoZXR0b0ZsaWdodCA9IEdsaXRjaGVzLmZsYWcoJ0dmJywge1xuICAgIG5hbWU6ICdHaGV0dG8gZmxpZ2h0JyxcbiAgICB0ZXh0OiBgR2hldHRvIGZsaWdodCBhbGxvd3MgdXNpbmcgRG9scGhpbiBhbmQgUmFiYml0IEJvb3RzIHRvIGZseSB1cCB0aGVcbiAgICAgICAgICAgd2F0ZXJmYWxscyBpbiB0aGUgQW5ncnkgU2VhICh3aXRob3V0IGNhbG1pbmcgdGhlIHdoaXJscG9vbHMpLlxuICAgICAgICAgICBUaGlzIGlzIGRvbmUgYnkgc3dpbW1pbmcgdXAgdG8gYSBkaWFnb25hbCBiZWFjaCBhbmQganVtcGluZ1xuICAgICAgICAgICBpbiBhIGRpZmZlcmVudCBkaXJlY3Rpb24gaW1tZWRpYXRlbHkgYmVmb3JlIGRpc2VtYmFya2luZy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgU3RhdHVlR2xpdGNoID0gR2xpdGNoZXMuZmxhZygnR3MnLCB7XG4gICAgbmFtZTogJ1N0YXR1ZSBnbGl0Y2gnLFxuICAgIHRleHQ6IGBTdGF0dWUgZ2xpdGNoIGFsbG93cyBnZXR0aW5nIGJlaGluZCBzdGF0dWVzIHRoYXQgYmxvY2sgY2VydGFpblxuICAgICAgICAgICBlbnRyYW5jZXM6IHRoZSBndWFyZHMgaW4gUG9ydG9hLCBBbWF6b25lcywgT2FrLCBHb2EsIGFuZCBTaHlyb24sXG4gICAgICAgICAgIGFzIHdlbGwgYXMgdGhlIHN0YXR1ZXMgaW4gdGhlIFdhdGVyZmFsbCBDYXZlLiAgSXQgaXMgZG9uZSBieVxuICAgICAgICAgICBhcHByb2FjaGluZyB0aGUgc3RhdHVlIGZyb20gdGhlIHRvcCByaWdodCBhbmQgaG9sZGluZyBkb3duIGFuZFxuICAgICAgICAgICBsZWZ0IG9uIHRoZSBjb250cm9sbGVyIHdoaWxlIG1hc2hpbmcgQi5gLFxuICAgIG1vZGVzOiAnIScsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBNdFNhYnJlUmVxdWlyZW1lbnRTa2lwID0gR2xpdGNoZXMuZmxhZygnR24nLCB7XG4gICAgbmFtZTogJ010IFNhYnJlIHJlcXVpcmVtZW50cyBza2lwJyxcbiAgICB0ZXh0OiBgRW50ZXJpbmcgTXQgU2FicmUgTm9ydGggbm9ybWFsbHkgcmVxdWlyZXMgKDEpIGhhdmluZyBUZWxlcG9ydCxcbiAgICAgICAgICAgYW5kICgyKSB0YWxraW5nIHRvIHRoZSByYWJiaXQgaW4gTGVhZiBhZnRlciB0aGUgYWJkdWN0aW9uICh2aWFcbiAgICAgICAgICAgVGVsZXBhdGh5KS4gIEJvdGggb2YgdGhlc2UgcmVxdWlyZW1lbnRzIGNhbiBiZSBza2lwcGVkOiBmaXJzdCBieVxuICAgICAgICAgICBmbHlpbmcgb3ZlciB0aGUgcml2ZXIgaW4gQ29yZGVsIHBsYWluIHJhdGhlciB0aGFuIGNyb3NzaW5nIHRoZVxuICAgICAgICAgICBicmlkZ2UsIGFuZCB0aGVuIGJ5IHRocmVhZGluZyB0aGUgbmVlZGxlIGJldHdlZW4gdGhlIGhpdGJveGVzIGluXG4gICAgICAgICAgIE10IFNhYnJlIE5vcnRoLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFN0YXR1ZUdhdW50bGV0U2tpcCA9IEdsaXRjaGVzLmZsYWcoJ0dnJywge1xuICAgIG5hbWU6ICdTdGF0dWUgZ3VhbnRsZXQgc2tpcCcsXG4gICAgdGV4dDogYFRoZSBzaG9vdGluZyBzdGF0dWVzIGluIGZyb250IG9mIEdvYSBhbmQgU3R4eSBub3JtYWxseSByZXF1aXJlXG4gICAgICAgICAgIEJhcnJpZXIgdG8gcGFzcyBzYWZlbHkuICBXaXRoIHRoaXMgZmxhZywgRmxpZ2h0IGNhbiBhbHNvIGJlIHVzZWRcbiAgICAgICAgICAgYnkgZmx5aW5nIGFyb3VuZCB0aGUgZWRnZSBvZiB0aGUgc3RhdHVlLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFN3b3JkQ2hhcmdlR2xpdGNoID0gR2xpdGNoZXMuZmxhZygnR2MnLCB7XG4gICAgbmFtZTogJ1N3b3JkIGNoYXJnZSBnbGl0Y2gnLFxuICAgIHRleHQ6IGBTd29yZCBjaGFyZ2UgZ2xpdGNoIGFsbG93cyBjaGFyZ2luZyBvbmUgc3dvcmQgdG8gdGhlIGxldmVsIG9mXG4gICAgICAgICAgIGFub3RoZXIgc3dvcmQgYnkgZXF1aXBwaW5nIHRoZSBoaWdoZXItbGV2ZWwgc3dvcmQsIHJlLWVudGVyaW5nXG4gICAgICAgICAgIHRoZSBtZW51LCBjaGFuZ2luZyB0byB0aGUgbG93ZXItbGV2ZWwgc3dvcmQgd2l0aG91dCBleGl0aW5nIHRoZVxuICAgICAgICAgICBtZW51LCBjcmVhdGluZyBhIGhhcmQgc2F2ZSwgcmVzZXR0aW5nLCBhbmQgdGhlbiBjb250aW51aW5nLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgVHJpZ2dlclNraXAgPSBHbGl0Y2hlcy5mbGFnKCdHdCcsIHtcbiAgICBuYW1lOiAnVHJpZ2dlciBza2lwJyxcbiAgICB0ZXh0OiBgQSB3aWRlIHZhcmlldHkgb2YgdHJpZ2dlcnMgYW5kIGV4aXQgc3F1YXJlcyBjYW4gYmUgc2tpcHBlZCBieVxuICAgICAgICAgICB1c2luZyBhbiBpbnZhbGlkIGl0ZW0gZXZlcnkgZnJhbWUgd2hpbGUgd2Fsa2luZy4gIFRoaXMgYWxsb3dzXG4gICAgICAgICAgIGJ5cGFzc2luZyBib3RoIE10IFNhYnJlIGVudHJhbmNlIHRyaWdnZXJzLCB0aGUgRXZpbCBTcGlyaXQgSXNsYW5kXG4gICAgICAgICAgIGVudHJhbmNlIHRyaWdnZXIsIHRyaWdnZXJzIGZvciBndWFyZHMgdG8gbW92ZSwgc2xvcGVzLCBhbmQgc2VhbWxlc3NcbiAgICAgICAgICAgbWFwIHRyYW5zaXRpb25zLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFnZVNraXAgPSBHbGl0Y2hlcy5mbGFnKCdHcicsIHtcbiAgICBuYW1lOiAnUmFnZSBza2lwJyxcbiAgICB0ZXh0OiBgUmFnZSBjYW4gYmUgc2tpcHBlZCBieSBkYW1hZ2UtYm9vc3RpbmcgZGlhZ29uYWxseSBpbnRvIHRoZSBMaW1lXG4gICAgICAgICAgIFRyZWUgTGFrZSBzY3JlZW4uICBUaGlzIHByb3ZpZGVzIGFjY2VzcyB0byB0aGUgYXJlYSBiZXlvbmQgdGhlXG4gICAgICAgICAgIGxha2UgaWYgZmxpZ2h0IG9yIGJyaWRnZXMgYXJlIGF2YWlsYWJsZS5gLFxuICAgIGhhcmQ6IHRydWUsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG59XG5cbmNsYXNzIEFlc3RoZXRpY3MgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdBJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdBZXN0aGV0aWNzJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSBgXG4gICAgICBUaGVzZSBmbGFncyBkb24ndCBkaXJlY3RseSBhZmZlY3QgZ2FtZXBsYXkgb3Igc2h1ZmZsaW5nLCBidXQgdGhleSBkb1xuICAgICAgYWZmZWN0IHRoZSBleHBlcmllbmNlIHNpZ25pZmljYW50bHkgZW5vdWdoIHRoYXQgdGhlcmUgYXJlIHRocmVlIG1vZGVzXG4gICAgICBmb3IgZWFjaDogXCJvZmZcIiwgXCJvcHRpb25hbFwiIChubyBleGNsYW1hdGlvbiBwb2ludCksIGFuZCBcInJlcXVpcmVkXCJcbiAgICAgIChleGNsYW1hdGlvbiBwb2ludCkuICBUaGUgZmlyc3QgdHdvIGFyZSBlcXVpdmFsZW50IGZvciBzZWVkIGdlbmVyYXRpb25cbiAgICAgIHB1cnBvc2VzLCBzbyB0aGF0IHlvdSBjYW4gcGxheSB0aGUgc2FtZSBzZWVkIHdpdGggZWl0aGVyIHNldHRpbmcuXG4gICAgICBTZXR0aW5nIGl0IHRvIFwiIVwiIHdpbGwgY2hhbmdlIHRoZSBzZWVkLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFJhbmRvbWl6ZU11c2ljID0gQWVzdGhldGljcy5mbGFnKCdBbScsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIGJhY2tncm91bmQgbXVzaWMnLFxuICAgIG1vZGVzOiAnIScsXG4gICAgb3B0aW9uYWw6IE5PX0JBTkcsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb011c2ljID0gQWVzdGhldGljcy5mbGFnKCdBcycsIHtcbiAgICBuYW1lOiAnTm8gYmFja2dyb3VuZCBtdXNpYycsXG4gICAgb3B0aW9uYWw6IE9QVElPTkFMLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplTWFwQ29sb3JzID0gQWVzdGhldGljcy5mbGFnKCdBYycsIHtcbiAgICBuYW1lOiAnUmFuZG9taXplIG1hcCBjb2xvcnMnLFxuICAgIG1vZGVzOiAnIScsXG4gICAgb3B0aW9uYWw6IE5PX0JBTkcsXG4gIH0pO1xufVxuXG5jbGFzcyBNb25zdGVycyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ00nO1xuICByZWFkb25seSBuYW1lID0gJ01vbnN0ZXJzJztcblxuICBzdGF0aWMgcmVhZG9ubHkgUmFuZG9taXplV2Vha25lc3NlcyA9IE1vbnN0ZXJzLmZsYWcoJ01lJywge1xuICAgIG5hbWU6ICdSYW5kb21pemUgbW9uc3RlciB3ZWFrbmVzc2VzJyxcbiAgICB0ZXh0OiBgTW9uc3RlciBhbmQgYm9zcyBlbGVtZW50YWwgd2Vha25lc3NlcyBhcmUgc2h1ZmZsZWQuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFRvd2VyUm9ib3RzID0gTW9uc3RlcnMuZmxhZygnTXQnLCB7XG4gICAgbmFtZTogJ1NodWZmbGUgdG93ZXIgcm9ib3RzJyxcbiAgICB0ZXh0OiBgVG93ZXIgcm9ib3RzIHdpbGwgYmUgc2h1ZmZsZWQgaW50byB0aGUgbm9ybWFsIHBvb2wuICBBdCBzb21lXG4gICAgICAgICAgIHBvaW50LCBub3JtYWwgbW9uc3RlcnMgbWF5IGJlIHNodWZmbGVkIGludG8gdGhlIHRvd2VyIGFzIHdlbGwuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcbn1cblxuY2xhc3MgRWFzeU1vZGUgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdFJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdFYXN5IE1vZGUnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFRoZSBmb2xsb3dpbmcgb3B0aW9ucyBtYWtlIHBhcnRzIG9mIHRoZSBnYW1lIGVhc2llci5gO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb1NodWZmbGVNaW1pY3MgPSBFYXN5TW9kZS5mbGFnKCdFdCcsIHtcbiAgICBuYW1lOiBgRG9uJ3Qgc2h1ZmZsZSBtaW1pY3MuYCxcbiAgICB0ZXh0OiBgTWltaWNzIHdpbGwgYmUgaW4gdGhlaXIgdmFuaWxsYSBsb2NhdGlvbnMuYCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFByZXNlcnZlVW5pcXVlQ2hlY2tzID0gRWFzeU1vZGUuZmxhZygnRXUnLCB7XG4gICAgbmFtZTogJ0tlZXAgdW5pcXVlIGl0ZW1zIGFuZCBjb25zdW1hYmxlcyBzZXBhcmF0ZScsXG4gICAgdGV4dDogYE5vcm1hbGx5IGFsbCBpdGVtcyBhbmQgbWltaWNzIGFyZSBzaHVmZmxlZCBpbnRvIGEgc2luZ2xlIHBvb2wgYW5kXG4gICAgICAgICAgIGRpc3RyaWJ1dGVkIGZyb20gdGhlcmUuICBJZiB0aGlzIGZsYWcgaXMgc2V0LCB1bmlxdWUgaXRlbXNcbiAgICAgICAgICAgKHNwZWNpZmljYWxseSwgYW55dGhpbmcgdGhhdCBjYW5ub3QgYmUgc29sZCkgd2lsbCBvbmx5IGJlIGZvdW5kIGluXG4gICAgICAgICAgIGVpdGhlciAoYSkgY2hlY2tzIHRoYXQgaGVsZCB1bmlxdWUgaXRlbXMgaW4gdmFuaWxsYSwgb3IgKGIpIGJvc3NcbiAgICAgICAgICAgZHJvcHMuICBDaGVzdHMgY29udGFpbmluZyBjb25zdW1hYmxlcyBpbiB2YW5pbGxhIG1heSBiZSBzYWZlbHlcbiAgICAgICAgICAgaWdub3JlZCwgYnV0IGNoZXN0cyBjb250YWluaW5nIHVuaXF1ZSBpdGVtcyBpbiB2YW5pbGxhIG1heSBzdGlsbFxuICAgICAgICAgICBlbmQgdXAgd2l0aCBub24tdW5pcXVlIGl0ZW1zIGJlY2F1c2Ugb2YgYm9zc2VzIGxpa2UgVmFtcGlyZSAyIHRoYXRcbiAgICAgICAgICAgZHJvcCBjb25zdW1hYmxlcy4gIElmIG1pbWljcyBhcmUgc2h1ZmZsZWQsIHRoZXkgd2lsbCBvbmx5IGJlIGluXG4gICAgICAgICAgIGNvbnN1bWFibGUgbG9jYXRpb25zLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBEZWNyZWFzZUVuZW15RGFtYWdlID0gRWFzeU1vZGUuZmxhZygnRWQnLCB7XG4gICAgbmFtZTogJ0RlY3JlYXNlIGVuZW15IGRhbWFnZScsXG4gICAgdGV4dDogYEVuZW15IGF0dGFjayBwb3dlciB3aWxsIGJlIHNpZ25pZmljYW50bHkgZGVjcmVhc2VkIGluIHRoZSBlYXJseSBnYW1lXG4gICAgICAgICAgIChieSBhIGZhY3RvciBvZiAzKS4gIFRoZSBnYXAgd2lsbCBuYXJyb3cgaW4gdGhlIG1pZC1nYW1lIGFuZCBldmVudHVhbGx5XG4gICAgICAgICAgIHBoYXNlIG91dCBhdCBzY2FsaW5nIGxldmVsIDQwLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBHdWFyYW50ZWVTdGFydGluZ1N3b3JkID0gRWFzeU1vZGUuZmxhZygnRXMnLCB7XG4gICAgbmFtZTogJ0d1YXJhbnRlZSBzdGFydGluZyBzd29yZCcsXG4gICAgdGV4dDogYFRoZSBMZWFmIGVsZGVyIGlzIGd1YXJhbnRlZWQgdG8gZ2l2ZSBhIHN3b3JkLiAgSXQgd2lsbCBub3QgYmVcbiAgICAgICAgICAgcmVxdWlyZWQgdG8gZGVhbCB3aXRoIGFueSBlbmVtaWVzIGJlZm9yZSBmaW5kaW5nIHRoZSBmaXJzdCBzd29yZC5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgR3VhcmFudGVlUmVmcmVzaCA9IEVhc3lNb2RlLmZsYWcoJ0VyJywge1xuICAgIG5hbWU6ICdHdWFyYW50ZWUgcmVmcmVzaCcsXG4gICAgdGV4dDogYEd1YXJhbnRlZXMgdGhlIFJlZnJlc2ggc3BlbGwgd2lsbCBiZSBhdmFpbGFibGUgYmVmb3JlIGZpZ2h0aW5nXG4gICAgICAgICAgIFRldHJhcmNocy5gLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgRXhwZXJpZW5jZVNjYWxlc0Zhc3RlciA9IEVhc3lNb2RlLmZsYWcoJ0V4Jywge1xuICAgIG5hbWU6ICdFeHBlcmllbmNlIHNjYWxlcyBmYXN0ZXInLFxuICAgIHRleHQ6IGBMZXNzIGdyaW5kaW5nIHdpbGwgYmUgcmVxdWlyZWQgdG8gXCJrZWVwIHVwXCIgd2l0aCB0aGUgZ2FtZSBkaWZmaWN1bHR5LmAsXG4gICAgZXhjbHVkZXM6IFsnSHgnXSxcbiAgfSk7XG59XG5cbmNsYXNzIE5vR3VhcmFudGVlcyBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ04nO1xuICByZWFkb25seSBuYW1lID0gJ05vIGd1YXJhbnRlZXMnO1xuICByZWFkb25seSBkZXNjcmlwdGlvbiA9IGBcbiAgICAgIFJlbW92ZXMgdmFyaW91cyBndWFyYW50ZWVzIGZyb20gdGhlIGxvZ2ljLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEJhdHRsZU1hZ2ljID0gTm9HdWFyYW50ZWVzLmZsYWcoJ053Jywge1xuICAgIG5hbWU6ICdCYXR0bGUgbWFnaWMgbm90IGd1YXJhbnRlZWQnLFxuICAgIHRleHQ6IGBOb3JtYWxseSwgdGhlIGxvZ2ljIHdpbGwgZ3VhcmFudGVlIHRoYXQgbGV2ZWwgMyBzd29yZCBjaGFyZ2VzIGFyZVxuICAgICAgICAgICBhdmFpbGFibGUgYmVmb3JlIGZpZ2h0aW5nIHRoZSB0ZXRyYXJjaHMgKHdpdGggdGhlIGV4Y2VwdGlvbiBvZiBLYXJtaW5lLFxuICAgICAgICAgICB3aG8gb25seSByZXF1aXJlcyBsZXZlbCAyKS4gIFRoaXMgZGlzYWJsZXMgdGhhdCBjaGVjay5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBNYXRjaGluZ1N3b3JkID0gTm9HdWFyYW50ZWVzLmZsYWcoJ05zJywge1xuICAgIG5hbWU6ICdNYXRjaGluZyBzd29yZCBub3QgZ3VhcmFudGVlZCcsXG4gICAgdGV4dDogYFBsYXllciBtYXkgYmUgcmVxdWlyZWQgdG8gZmlnaHQgYm9zc2VzIHdpdGggdGhlIHdyb25nIHN3b3JkLCB3aGljaFxuICAgICAgICAgICBtYXkgcmVxdWlyZSB1c2luZyBcInRpbmsgc3RyYXRzXCIgZGVhbGluZyAxIGRhbWFnZSBwZXIgaGl0LmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEJhcnJpZXIgPSBOb0d1YXJhbnRlZXMuZmxhZygnTmInLCB7XG4gICAgbmFtZTogJ0JhcnJpZXIgbm90IGd1YXJhbnRlZWQnLFxuICAgIHRleHQ6IGBOb3JtYWxseSwgdGhlIGxvZ2ljIHdpbGwgZ3VhcmFudGVlIEJhcnJpZXIgKG9yIGVsc2UgcmVmcmVzaCBhbmQgc2hpZWxkXG4gICAgICAgICAgIHJpbmcpIGJlZm9yZSBlbnRlcmluZyBTdHh5LCB0aGUgRm9ydHJlc3MsIG9yIGZpZ2h0aW5nIEthcm1pbmUuICBUaGlzXG4gICAgICAgICAgIGRpc2FibGVzIHRoYXQgY2hlY2suYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgR2FzTWFzayA9IE5vR3VhcmFudGVlcy5mbGFnKCdOZycsIHtcbiAgICBuYW1lOiAnR2FzIG1hc2sgbm90IGd1YXJhbnRlZWQnLFxuICAgIHRleHQ6IGBUaGUgbG9naWMgd2lsbCBub3QgZ3VhcmFudGVlIGdhcyBtYXNrIGJlZm9yZSBuZWVkaW5nIHRvIGVudGVyIHRoZSBzd2FtcC5cbiAgICAgICAgICAgR2FzIG1hc2sgaXMgc3RpbGwgZ3VhcmFudGVlZCB0byBraWxsIHRoZSBpbnNlY3QuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcbn1cblxuY2xhc3MgSGFyZE1vZGUgZXh0ZW5kcyBGbGFnU2VjdGlvbiB7XG4gIHJlYWRvbmx5IHByZWZpeCA9ICdIJztcbiAgcmVhZG9ubHkgbmFtZSA9ICdIYXJkIG1vZGUnO1xuXG4gIHN0YXRpYyByZWFkb25seSBOb0J1ZmZNZWRpY2FsSGVyYiA9IEhhcmRNb2RlLmZsYWcoJ0htJywge1xuICAgIG5hbWU6IGBEb24ndCBidWZmIG1lZGljYWwgaGVyYiBvciBmcnVpdCBvZiBwb3dlcmAsXG4gICAgdGV4dDogYE1lZGljYWwgSGVyYiBpcyBub3QgYnVmZmVkIHRvIGhlYWwgODAgZGFtYWdlLCB3aGljaCBpcyBoZWxwZnVsIHRvIG1ha2VcbiAgICAgICAgICAgdXAgZm9yIGNhc2VzIHdoZXJlIFJlZnJlc2ggaXMgdW5hdmFpbGFibGUgZWFybHkuICBGcnVpdCBvZiBQb3dlciBpcyBub3RcbiAgICAgICAgICAgYnVmZmVkIHRvIHJlc3RvcmUgNTYgTVAuYCxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgTWF4U2NhbGluZ0luVG93ZXIgPSBIYXJkTW9kZS5mbGFnKCdIdCcsIHtcbiAgICBuYW1lOiAnTWF4IHNjYWxpbmcgbGV2ZWwgaW4gdG93ZXInLFxuICAgIHRleHQ6IGBFbmVtaWVzIGluIHRoZSB0b3dlciBzcGF3biBhdCBtYXggc2NhbGluZyBsZXZlbC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBFeHBlcmllbmNlU2NhbGVzU2xvd2VyID0gSGFyZE1vZGUuZmxhZygnSHgnLCB7XG4gICAgbmFtZTogJ0V4cGVyaWVuY2Ugc2NhbGVzIHNsb3dlcicsXG4gICAgdGV4dDogYE1vcmUgZ3JpbmRpbmcgd2lsbCBiZSByZXF1aXJlZCB0byBcImtlZXAgdXBcIiB3aXRoIHRoZSBkaWZmaWN1bHR5LmAsXG4gICAgZXhjbHVkZXM6IFsnRXgnXSxcbiAgICBoYXJkOiB0cnVlLFxuICB9KTtcblxuICBzdGF0aWMgcmVhZG9ubHkgQ2hhcmdlU2hvdHNPbmx5ID0gSGFyZE1vZGUuZmxhZygnSGMnLCB7XG4gICAgbmFtZTogJ0NoYXJnZSBzaG90cyBvbmx5JyxcbiAgICB0ZXh0OiBgU3RhYmJpbmcgaXMgY29tcGxldGVseSBpbmVmZmVjdGl2ZS4gIE9ubHkgY2hhcmdlZCBzaG90cyB3b3JrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IEJsYWNrb3V0ID0gSGFyZE1vZGUuZmxhZygnSHonLCB7XG4gICAgbmFtZTogJ0JsYWNrb3V0JyxcbiAgICB0ZXh0OiBgQWxsIGNhdmVzIGFuZCBmb3J0cmVzc2VzIGFyZSBwZXJtYW5lbnRseSBkYXJrLmAsXG4gICAgaGFyZDogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFBlcm1hZGVhdGggPSBIYXJkTW9kZS5mbGFnKCdIaCcsIHtcbiAgICBuYW1lOiAnUGVybWFkZWF0aCcsXG4gICAgdGV4dDogYEhhcmRjb3JlIG1vZGU6IGNoZWNrcG9pbnRzIGFuZCBzYXZlcyBhcmUgcmVtb3ZlZC5gLFxuICAgIGhhcmQ6IHRydWUsXG4gIH0pO1xufVxuXG5jbGFzcyBWYW5pbGxhIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICByZWFkb25seSBuYW1lID0gJ1ZhbmlsbGEnO1xuICByZWFkb25seSBwcmVmaXggPSAnVic7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgT3B0aW9ucyB0byByZXN0b3JlIHZhbmlsbGEgYmVoYXZpb3IgY2hhbmdlZCBieSBkZWZhdWx0LmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IER5bmEgPSBWYW5pbGxhLmZsYWcoJ1ZkJywge1xuICAgIG5hbWU6IGBEb24ndCBidWZmIER5bmFgLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB3ZSBtYWtlcyB0aGUgRHluYSBmaWdodCBhIGJpdCBtb3JlIG9mIGEgY2hhbGxlbmdlLlxuICAgICAgICAgICBTaWRlIHBvZHMgd2lsbCBmaXJlIHNpZ25pZmljYW50bHkgbW9yZS4gIFRoZSBzYWZlIHNwb3QgaGFzIGJlZW5cbiAgICAgICAgICAgcmVtb3ZlZC4gIFRoZSByZXZlbmdlIGJlYW1zIHBhc3MgdGhyb3VnaCBiYXJyaWVyLiAgU2lkZSBwb2RzIGNhblxuICAgICAgICAgICBub3cgYmUga2lsbGVkLiAgVGhpcyBmbGFnIHByZXZlbnRzIHRoYXQgY2hhbmdlLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBCb251c0l0ZW1zID0gVmFuaWxsYS5mbGFnKCdWYicsIHtcbiAgICBuYW1lOiBgRG9uJ3QgYnVmZiBib251cyBpdGVtc2AsXG4gICAgdGV4dDogYExlYXRoZXIgQm9vdHMgYXJlIGNoYW5nZWQgdG8gU3BlZWQgQm9vdHMsIHdoaWNoIGluY3JlYXNlIHBsYXllciB3YWxraW5nXG4gICAgICAgICAgIHNwZWVkICh0aGlzIGFsbG93cyBjbGltYmluZyB1cCB0aGUgc2xvcGUgdG8gYWNjZXNzIHRoZSBUb3JuYWRvIEJyYWNlbGV0XG4gICAgICAgICAgIGNoZXN0LCB3aGljaCBpcyB0YWtlbiBpbnRvIGNvbnNpZGVyYXRpb24gYnkgdGhlIGxvZ2ljKS4gIERlbydzIHBlbmRhbnRcbiAgICAgICAgICAgcmVzdG9yZXMgTVAgd2hpbGUgbW92aW5nLiAgUmFiYml0IGJvb3RzIGVuYWJsZSBzd29yZCBjaGFyZ2luZyB1cCB0b1xuICAgICAgICAgICBsZXZlbCAyIHdoaWxlIHdhbGtpbmcgKGxldmVsIDMgc3RpbGwgcmVxdWlyZXMgYmVpbmcgc3RhdGlvbmFyeSwgc28gYXNcbiAgICAgICAgICAgdG8gcHJldmVudCB3YXN0aW5nIHRvbnMgb2YgbWFnaWMpLmAsXG4gIH0pO1xuXG4gIC8vIFRPRE8gLSBpcyBpdCB3b3J0aCBldmVuIGFsbG93aW5nIHRvIHR1cm4gdGhpcyBvZmY/IT9cbiAgc3RhdGljIHJlYWRvbmx5IE1hcHMgPSBWYW5pbGxhLmZsYWcoJ1ZtJywge1xuICAgIG5hbWU6ICdWYW5pbGxhIG1hcHMnLFxuICAgIHRleHQ6IGBOb3JtYWxseSB0aGUgcmFuZG9taXplciBhZGRzIGEgbmV3IFwiRWFzdCBDYXZlXCIgdG8gVmFsbGV5IG9mIFdpbmQsXG4gICAgICAgICAgIGJvcnJvd2VkIGZyb20gdGhlIEdCQyB2ZXJzaW9uIG9mIHRoZSBnYW1lLiAgVGhpcyBjYXZlIGNvbnRhaW5zIHR3b1xuICAgICAgICAgICBjaGVzdHMgKG9uZSBjb25zaWRlcmVkIGEga2V5IGl0ZW0pIG9uIHRoZSB1cHBlciBmbG9vciBhbmQgZXhpdHMgdG9cbiAgICAgICAgICAgdHdvIHJhbmRvbSBhcmVhcyAoY2hvc2VuIGJldHdlZW4gTGltZSBUcmVlIFZhbGxleSwgQ29yZGVsIFBsYWluLFxuICAgICAgICAgICBHb2EgVmFsbGV5LCBvciBEZXNlcnQgMjsgdGhlIHF1aWNrc2FuZCBpcyByZW1vdmVkIGZyb20gdGhlIGVudHJhbmNlc1xuICAgICAgICAgICB0byBQeXJhbWlkIGFuZCBDcnlwdCksIG9uZSB1bmJsb2NrZWQgb24gdGhlIGxvd2VyIGZsb29yLCBhbmQgb25lXG4gICAgICAgICAgIGRvd24gdGhlIHN0YWlycyBhbmQgYmVoaW5kIGEgcm9jayB3YWxsIGZyb20gdGhlIHVwcGVyIGZsb29yLiAgVGhpc1xuICAgICAgICAgICBmbGFnIHByZXZlbnRzIGFkZGluZyB0aGF0IGNhdmUuICBJZiBzZXQgYXMgXCJWIW1cIiB0aGVuIGEgZGlyZWN0IHBhdGhcbiAgICAgICAgICAgd2lsbCBpbnN0ZWFkIGJlIGFkZGVkIGJldHdlZW4gVmFsbGV5IG9mIFdpbmQgYW5kIExpbWUgVHJlZSBWYWxsZXlcbiAgICAgICAgICAgKGFzIGluIGVhcmxpZXIgdmVyc2lvbnMgb2YgdGhlIHJhbmRvbWl6ZXIpLmAsXG4gICAgbW9kZXM6ICchJyxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNob3BzID0gVmFuaWxsYS5mbGFnKCdWcycsIHtcbiAgICBuYW1lOiAnVmFuaWxsYSBzaG9wcycsXG4gICAgdGV4dDogYEJ5IGRlZmF1bHQsIHdlIGRpc2FibGUgc2hvcCBnbGl0Y2gsIHNodWZmbGUgc2hvcCBjb250ZW50cywgYW5kIHRpZVxuICAgICAgICAgICB0aGUgcHJpY2VzIHRvIHRoZSBzY2FsaW5nIGxldmVsIChpdGVtIHNob3BzIGFuZCBpbm5zIGluY3JlYXNlIGJ5IGFcbiAgICAgICAgICAgZmFjdG9yIG9mIDIgZXZlcnkgMTAgc2NhbGluZyBsZXZlbHMsIGFybW9yIHNob3BzIGRlY3JlYXNlIGJ5IGFcbiAgICAgICAgICAgZmFjdG9yIG9mIDIgZXZlcnkgMTIgc2NhbGluZyBsZXZlbHMpLiAgVGhpcyBmbGFnIHByZXZlbnRzIGFsbCBvZlxuICAgICAgICAgICB0aGVzZSBjaGFuZ2VzLCByZXN0b3Jpbmcgc2hvcHMgdG8gYmUgY29tcGxldGVseSB2YW5pbGxhLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBXaWxkV2FycCA9IFZhbmlsbGEuZmxhZygnVncnLCB7XG4gICAgbmFtZTogJ1ZhbmlsbGEgd2lsZCB3YXJwJyxcbiAgICB0ZXh0OiBgQnkgZGVmYXVsdCwgV2lsZCBXYXJwIGlzIG5lcmZlZCB0byBvbmx5IHJldHVybiB0byBNZXphbWUgU2hyaW5lLlxuICAgICAgICAgICBUaGlzIGZsYWcgcmVzdG9yZXMgaXQgdG8gd29yayBsaWtlIG5vcm1hbC4gIE5vdGUgdGhhdCB0aGlzIHdpbGwgcHV0XG4gICAgICAgICAgIGFsbCB3aWxkIHdhcnAgbG9jYXRpb25zIGluIGxvZ2ljIHVubGVzcyB0aGUgZmxhZyBpcyBzZXQgYXMgKFYhdykuYCxcbiAgICBtb2RlczogJyEnLFxuICB9KTtcbn1cblxuY2xhc3MgUXVhbGl0eSBleHRlbmRzIEZsYWdTZWN0aW9uIHtcbiAgcmVhZG9ubHkgcHJlZml4ID0gJ1EnO1xuICByZWFkb25seSBuYW1lID0gJ1F1YWxpdHkgb2YgTGlmZSc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlIGZvbGxvd2luZyBxdWFsaXR5LW9mLWxpZmUgZmxhZ3MgdHVybiA8aT5vZmY8L2k+IGltcHJvdmVtZW50cyB0aGF0XG4gICAgICBhcmUgbm9ybWFsbHkgb24gYnkgZGVmYXVsdC4gIFRoZXkgYXJlIG9wdGlvbmFsIGFuZCB3aWxsIG5vdCBhZmZlY3QgdGhlXG4gICAgICBzZWVkIGdlbmVyYXRpb24uICBUaGV5IG1heSBiZSB0b2dnbGVkIGZyZWVseSBpbiByYWNlIG1vZGUuYDtcblxuICAvLyBUT0RPIC0gcmVtZW1iZXIgcHJlZmVyZW5jZXMgYW5kIGF1dG8tYXBwbHk/XG4gIHN0YXRpYyByZWFkb25seSBOb0F1dG9FcXVpcCA9IFF1YWxpdHkuZmxhZygnUWEnLCB7XG4gICAgbmFtZTogYERvbid0IGF1dG9tYXRpY2FsbHkgZXF1aXAgb3JicyBhbmQgYnJhY2VsZXRzYCxcbiAgICB0ZXh0OiBgUHJldmVudHMgYWRkaW5nIGEgcXVhbGl0eS1vZi1saWZlIGltcHJvdmVtZW50IHRvIGF1dG9tYXRpY2FsbHkgZXF1aXBcbiAgICAgICAgICAgdGhlIGNvcnJlc3BvbmRpbmcgb3JiL2JyYWNlbGV0IHdoZW5ldmVyIGNoYW5naW5nIHN3b3Jkcy5gLFxuICAgIG9wdGlvbmFsOiBPUFRJT05BTCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5vQ29udHJvbGxlclNob3J0Y3V0cyA9IFF1YWxpdHkuZmxhZygnUWMnLCB7XG4gICAgbmFtZTogJ0Rpc2FibGUgY29udHJvbGxlciBzaG9ydGN1dHMnLFxuICAgIHRleHQ6IGBCeSBkZWZhdWx0LCB3ZSBkaXNhYmxlIHNlY29uZCBjb250cm9sbGVyIGlucHV0IGFuZCBpbnN0ZWFkIGVuYWJsZVxuICAgICAgICAgICBzb21lIG5ldyBzaG9ydGN1dHMgb24gY29udHJvbGxlciAxOiBTdGFydCtBK0IgZm9yIHdpbGQgd2FycCwgYW5kXG4gICAgICAgICAgIFNlbGVjdCtCIHRvIHF1aWNrbHkgY2hhbmdlIHN3b3Jkcy4gIFRvIHN1cHBvcnQgdGhpcywgdGhlIGFjdGlvbiBvZlxuICAgICAgICAgICB0aGUgc3RhcnQgYW5kIHNlbGVjdCBidXR0b25zIGlzIGNoYW5nZWQgc2xpZ2h0bHkuICBUaGlzIGZsYWdcbiAgICAgICAgICAgZGlzYWJsZXMgdGhpcyBjaGFuZ2UgYW5kIHJldGFpbnMgbm9ybWFsIGJlaGF2aW9yLmAsXG4gICAgb3B0aW9uYWw6IE9QVElPTkFMLFxuICB9KTtcbn1cblxuY2xhc3MgRGVidWdNb2RlIGV4dGVuZHMgRmxhZ1NlY3Rpb24ge1xuICAvLyBUT0RPIC0gaG93IHRvIGRpc2NvdmVyIEZsYWdTZWN0aW9ucz8/P1xuICByZWFkb25seSBwcmVmaXggPSAnRCc7XG4gIHJlYWRvbmx5IG5hbWUgPSAnRGVidWcgTW9kZSc7XG4gIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gYFxuICAgICAgVGhlc2Ugb3B0aW9ucyBhcmUgaGVscGZ1bCBmb3IgZXhwbG9yaW5nIG9yIGRlYnVnZ2luZy4gIE5vdGUgdGhhdCxcbiAgICAgIHdoaWxlIHRoZXkgZG8gbm90IGRpcmVjdGx5IGFmZmVjdCBhbnkgcmFuZG9taXphdGlvbiwgdGhleVxuICAgICAgPGk+ZG88L2k+IGZhY3RvciBpbnRvIHRoZSBzZWVkIHRvIHByZXZlbnQgY2hlYXRpbmcsIGFuZCB0aGV5XG4gICAgICB3aWxsIHJlbW92ZSB0aGUgb3B0aW9uIHRvIGdlbmVyYXRlIGEgc2VlZCBmb3IgcmFjaW5nLmA7XG5cbiAgc3RhdGljIHJlYWRvbmx5IFNwb2lsZXJMb2cgPSBEZWJ1Z01vZGUuZmxhZygnRHMnLCB7XG4gICAgbmFtZTogJ0dlbmVyYXRlIGEgc3BvaWxlciBsb2cnLFxuICAgIHRleHQ6IGBOb3RlOiA8Yj50aGlzIHdpbGwgY2hhbmdlIHRoZSBwbGFjZW1lbnQgb2YgaXRlbXM8L2I+IGNvbXBhcmVkIHRvIGFcbiAgICAgICAgICAgc2VlZCBnZW5lcmF0ZWQgd2l0aG91dCB0aGlzIGZsYWcgdHVybmVkIG9uLmAsXG4gIH0pO1xuXG4gIHN0YXRpYyByZWFkb25seSBUcmFpbmVyTW9kZSA9IERlYnVnTW9kZS5mbGFnKCdEdCcsIHtcbiAgICBuYW1lOiAnVHJhaW5lciBtb2RlJyxcbiAgICB0ZXh0OiBgSW5zdGFsbHMgYSB0cmFpbmVyIGZvciBwcmFjdGljaW5nIGNlcnRhaW4gcGFydHMgb2YgdGhlIGdhbWUuXG4gICAgICAgICAgIEF0IHRoZSBzdGFydCBvZiB0aGUgZ2FtZSwgdGhlIHBsYXllciB3aWxsIGhhdmUgYWxsIHN3b3JkcywgYmFzaWNcbiAgICAgICAgICAgYXJtb3JzIGFuZCBzaGllbGRzLCBhbGwgd29ybiBpdGVtcyBhbmQgbWFnaWNzLCBhIHNlbGVjdGlvbiBvZlxuICAgICAgICAgICBjb25zdW1hYmxlcywgYm93IG9mIHRydXRoLCBtYXhpbXVtIGNhc2gsIGFsbCB3YXJwIHBvaW50cyBhY3RpdmF0ZWQsXG4gICAgICAgICAgIGFuZCB0aGUgU2h5cm9uIG1hc3NhY3JlIHdpbGwgaGF2ZSBiZWVuIHRyaWdnZXJlZC4gIFdpbGQgd2FycCBpc1xuICAgICAgICAgICByZWNvbmZpZ3VyZWQgdG8gcHJvdmlkZSBlYXN5IGFjY2VzcyB0byBhbGwgYm9zc2VzLiAgQWRkaXRpb25hbGx5LFxuICAgICAgICAgICB0aGUgZm9sbG93aW5nIGJ1dHRvbiBjb21iaW5hdGlvbnMgYXJlIHJlY29nbml6ZWQ6PHVsPlxuICAgICAgICAgICAgIDxsaT5TdGFydCtVcDogaW5jcmVhc2UgcGxheWVyIGxldmVsXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0Rvd246IGluY3JlYXNlIHNjYWxpbmcgbGV2ZWxcbiAgICAgICAgICAgICA8bGk+U3RhcnQrTGVmdDogZ2V0IGFsbCBiYWxsc1xuICAgICAgICAgICAgIDxsaT5TdGFydCtSaWdodDogZ2V0IGFsbCBicmFjZWxldHNcbiAgICAgICAgICAgICA8bGk+U3RhcnQrQitEb3duOiBnZXQgYSBmdWxsIHNldCBvZiBjb25zdW1hYmxlIGl0ZW1zXG4gICAgICAgICAgICAgPGxpPlN0YXJ0K0IrTGVmdDogZ2V0IGFsbCBhZHZhbmNlZCBhcm1vcnNcbiAgICAgICAgICAgICA8bGk+U3RhcnQrQitSaWdodDogZ2V0IGFsbCBhZHZhbmNlZCBzaGllbGRzXG4gICAgICAgICAgIDwvdWw+YCxcbiAgfSk7XG5cbiAgc3RhdGljIHJlYWRvbmx5IE5ldmVyRGllID0gRGVidWdNb2RlLmZsYWcoJ0RpJywge1xuICAgIG5hbWU6ICdQbGF5ZXIgbmV2ZXIgZGllcycsXG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgRmxhZ1NldCB7XG4gIHByaXZhdGUgZmxhZ3M6IE1hcDxGbGFnLCBNb2RlPjtcblxuICBjb25zdHJ1Y3RvcihzdHI6IHN0cmluZ3xNYXA8RmxhZywgTW9kZT4gPSAnQENhc3VhbCcpIHtcbiAgICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuZmxhZ3MgPSBuZXcgTWFwKCk7XG4gICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBzdHIpIHtcbiAgICAgICAgdGhpcy5zZXQoay5mbGFnLCB2KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHN0ci5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgIC8vIFRPRE8gLSBzdXBwb3J0ICdAQ2FzdWFsK1JzLUVkJ1xuICAgICAgY29uc3QgZXhwYW5kZWQgPSBQcmVzZXRzLmdldChzdHIuc3Vic3RyaW5nKDEpKTtcbiAgICAgIGlmICghZXhwYW5kZWQpIHRocm93IG5ldyBVc2FnZUVycm9yKGBVbmtub3duIHByZXNldDogJHtzdHJ9YCk7XG4gICAgICB0aGlzLmZsYWdzID0gbmV3IE1hcChleHBhbmRlZC5mbGFncyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZmxhZ3MgPSBuZXcgTWFwKCk7XG4gICAgLy8gcGFyc2UgdGhlIHN0cmluZ1xuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9bXkEtWmEtejAtOSE/XS9nLCAnJyk7XG4gICAgY29uc3QgcmUgPSAvKFtBLVpdKShbYS16MC05IT9dKykvZztcbiAgICBsZXQgbWF0Y2g7XG4gICAgd2hpbGUgKChtYXRjaCA9IHJlLmV4ZWMoc3RyKSkpIHtcbiAgICAgIGNvbnN0IFssIGtleSwgdGVybXNdID0gbWF0Y2g7XG4gICAgICBjb25zdCByZTIgPSAvKFshP118XikoW2EtejAtOV0rKS9nO1xuICAgICAgd2hpbGUgKChtYXRjaCA9IHJlMi5leGVjKHRlcm1zKSkpIHtcbiAgICAgICAgY29uc3QgWywgbW9kZSwgZmxhZ3NdID0gbWF0Y2g7XG4gICAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBmbGFncykge1xuICAgICAgICAgIHRoaXMuc2V0KGtleSArIGZsYWcsIG1vZGUgfHwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmaWx0ZXJPcHRpb25hbCgpOiBGbGFnU2V0IHtcbiAgICByZXR1cm4gbmV3IEZsYWdTZXQoXG4gICAgICAgIG5ldyBNYXAoXG4gICAgICAgICAgICBbLi4udGhpcy5mbGFnc10ubWFwKFxuICAgICAgICAgICAgICAgIChbaywgdl0pID0+IFtrLCBrLm9wdHMub3B0aW9uYWwgPyBrLm9wdHMub3B0aW9uYWwodikgOiB2XSkpKTtcbiAgfVxuXG4gIGZpbHRlclJhbmRvbShyYW5kb206IFJhbmRvbSk6IEZsYWdTZXQge1xuICAgIGZ1bmN0aW9uIHBpY2soazogRmxhZywgdjogTW9kZSk6IE1vZGUge1xuICAgICAgaWYgKHYgIT09ICc/JykgcmV0dXJuIHY7XG4gICAgICByZXR1cm4gcmFuZG9tLnBpY2soW3RydWUsIGZhbHNlLCAuLi4oay5vcHRzLm1vZGVzIHx8ICcnKV0pO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEZsYWdTZXQoXG4gICAgICAgIG5ldyBNYXAoWy4uLnRoaXMuZmxhZ3NdLm1hcCgoW2ssIHZdKSA9PiBbaywgcGljayhrLCB2KV0pKSk7XG4gIH1cblxuICB0b1N0cmluZygpIHtcbiAgICB0eXBlIFNlY3Rpb24gPSBEZWZhdWx0TWFwPHN0cmluZywgc3RyaW5nW10+O1xuICAgIGNvbnN0IHNlY3Rpb25zID1cbiAgICAgICAgbmV3IERlZmF1bHRNYXA8c3RyaW5nLCBTZWN0aW9uPihcbiAgICAgICAgICAgICgpID0+IG5ldyBEZWZhdWx0TWFwPHN0cmluZywgc3RyaW5nW10+KCgpID0+IFtdKSlcbiAgICBmb3IgKGNvbnN0IFtmbGFnLCBtb2RlXSBvZiB0aGlzLmZsYWdzKSB7XG4gICAgICBpZiAoZmxhZy5mbGFnLmxlbmd0aCAhPT0gMikgdGhyb3cgbmV3IEVycm9yKGBCYWQgZmxhZyAke2ZsYWcuZmxhZ31gKTtcbiAgICAgIGlmICghbW9kZSkgY29udGludWU7XG4gICAgICBjb25zdCBzZWN0aW9uID0gc2VjdGlvbnMuZ2V0KGZsYWcuZmxhZ1swXSk7XG4gICAgICBjb25zdCBzdWJzZWN0aW9uID0gbW9kZSA9PT0gdHJ1ZSA/ICcnIDogbW9kZTtcbiAgICAgIHNlY3Rpb24uZ2V0KHN1YnNlY3Rpb24pLnB1c2goZmxhZy5mbGFnWzFdKTtcbiAgICB9XG4gICAgY29uc3Qgb3V0ID0gW107XG4gICAgZm9yIChjb25zdCBba2V5LCBzZWN0aW9uXSBvZiBzZWN0aW9ucy5zb3J0ZWRFbnRyaWVzKCkpIHtcbiAgICAgIGxldCBzZWMgPSBrZXk7XG4gICAgICBmb3IgKGNvbnN0IFtzdWJrZXksIHN1YnNlY3Rpb25dIG9mIHNlY3Rpb24pIHtcbiAgICAgICAgc2VjICs9IHN1YmtleSArIHN1YnNlY3Rpb24uc29ydCgpLmpvaW4oJycpO1xuICAgICAgfVxuICAgICAgb3V0LnB1c2goc2VjKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKCcgJyk7XG4gIH1cblxuICB0b2dnbGUobmFtZTogc3RyaW5nKTogTW9kZSB7ICBcbiAgICBjb25zdCBmbGFnID0gRmxhZy5mbGFncy5nZXQobmFtZSk7XG4gICAgaWYgKCFmbGFnKSB7XG4gICAgICAvLyBUT0RPIC0gUmVwb3J0IHNvbWV0aGluZ1xuICAgICAgY29uc29sZS5lcnJvcihgQmFkIGZsYWc6ICR7bmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgbW9kZTogTW9kZSA9IHRoaXMuZmxhZ3MuZ2V0KGZsYWcpIHx8IGZhbHNlO1xuICAgIGNvbnN0IG1vZGVzID0gW2ZhbHNlLCB0cnVlLCAuLi4oZmxhZy5vcHRzLm1vZGVzIHx8ICcnKSwgJz8nLCBmYWxzZV07XG4gICAgY29uc3QgaW5kZXggPSBtb2Rlcy5pbmRleE9mKG1vZGUpO1xuICAgIGlmIChpbmRleCA8IDApIHRocm93IG5ldyBFcnJvcihgQmFkIGN1cnJlbnQgbW9kZSAke21vZGV9YCk7XG4gICAgY29uc3QgbmV4dCA9IG1vZGVzW2luZGV4ICsgMV07XG4gICAgdGhpcy5mbGFncy5zZXQoZmxhZywgbmV4dCk7XG4gICAgcmV0dXJuIG5leHQ7XG4gIH1cblxuICBzZXQobmFtZTogc3RyaW5nLCBtb2RlOiBNb2RlKSB7XG4gICAgY29uc3QgZmxhZyA9IEZsYWcuZmxhZ3MuZ2V0KG5hbWUpO1xuICAgIGlmICghZmxhZykge1xuICAgICAgLy8gVE9ETyAtIFJlcG9ydCBzb21ldGhpbmdcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEJhZCBmbGFnOiAke25hbWV9YCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghbW9kZSkge1xuICAgICAgdGhpcy5mbGFncy5kZWxldGUoZmxhZyk7XG4gICAgfSBlbHNlIGlmIChtb2RlID09PSB0cnVlIHx8IG1vZGUgPT09ICc/JyB8fCBmbGFnLm9wdHMubW9kZXM/LmluY2x1ZGVzKG1vZGUpKSB7XG4gICAgICB0aGlzLmZsYWdzLnNldChmbGFnLCBtb2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihgQmFkIGZsYWcgbW9kZTogJHtuYW1lWzBdfSR7bW9kZX0ke25hbWUuc3Vic3RyaW5nKDEpfWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBSZW1vdmUgYW55IGNvbmZsaWN0c1xuICAgIGZvciAoY29uc3QgZXhjbHVkZWQgb2YgZmxhZy5vcHRzLmV4Y2x1ZGVzIHx8IFtdKSB7XG4gICAgICB0aGlzLmZsYWdzLmRlbGV0ZShGbGFnLmZsYWdzLmdldChleGNsdWRlZCkhKTtcbiAgICB9XG4gIH1cblxuICBjaGVjayhuYW1lOiBGbGFnfHN0cmluZywgLi4ubW9kZXM6IE1vZGVbXSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGZsYWcgPSBuYW1lIGluc3RhbmNlb2YgRmxhZyA/IG5hbWUgOiBGbGFnLmZsYWdzLmdldChuYW1lKTtcbiAgICBpZiAoIW1vZGVzLmxlbmd0aCkgbW9kZXMucHVzaCh0cnVlKTtcbiAgICByZXR1cm4gbW9kZXMuaW5jbHVkZXMoZmxhZyAmJiB0aGlzLmZsYWdzLmdldChmbGFnKSB8fCBmYWxzZSk7XG4gIH1cblxuICBnZXQobmFtZTogRmxhZ3xzdHJpbmcpOiBNb2RlIHtcbiAgICBjb25zdCBmbGFnID0gbmFtZSBpbnN0YW5jZW9mIEZsYWcgPyBuYW1lIDogRmxhZy5mbGFncy5nZXQobmFtZSk7XG4gICAgcmV0dXJuIGZsYWcgJiYgdGhpcy5mbGFncy5nZXQoZmxhZykgfHwgZmFsc2U7XG4gIH1cblxuICBwcmVzZXJ2ZVVuaXF1ZUNoZWNrcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5QcmVzZXJ2ZVVuaXF1ZUNoZWNrcyk7XG4gIH1cbiAgc2h1ZmZsZU1pbWljcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5Ob1NodWZmbGVNaW1pY3MsIGZhbHNlKTtcbiAgfVxuXG4gIGJ1ZmZEZW9zUGVuZGFudCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuICBjaGFuZ2VHYXNNYXNrVG9IYXptYXRTdWl0KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuQm9udXNJdGVtcywgZmFsc2UpO1xuICB9XG4gIHNsb3dEb3duVG9ybmFkbygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLkJvbnVzSXRlbXMsIGZhbHNlKTtcbiAgfVxuICBsZWF0aGVyQm9vdHNHaXZlU3BlZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cbiAgcmFiYml0Qm9vdHNDaGFyZ2VXaGlsZVdhbGtpbmcoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5Cb251c0l0ZW1zLCBmYWxzZSk7XG4gIH1cblxuICBzaHVmZmxlU3ByaXRlUGFsZXR0ZXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplU3ByaXRlQ29sb3JzKTtcbiAgfVxuICBzaHVmZmxlTW9uc3RlcnMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ01yJyk7XG4gIH1cbiAgc2h1ZmZsZVNob3BzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFZhbmlsbGEuU2hvcHMsIGZhbHNlKTtcbiAgfVxuICBiYXJnYWluSHVudGluZygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zaHVmZmxlU2hvcHMoKTtcbiAgfVxuXG4gIHNodWZmbGVUb3dlck1vbnN0ZXJzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE1vbnN0ZXJzLlRvd2VyUm9ib3RzKTtcbiAgfVxuICBzaHVmZmxlTW9uc3RlckVsZW1lbnRzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE1vbnN0ZXJzLlJhbmRvbWl6ZVdlYWtuZXNzZXMpO1xuICB9XG4gIHNodWZmbGVCb3NzRWxlbWVudHMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc2h1ZmZsZU1vbnN0ZXJFbGVtZW50cygpO1xuICB9XG5cbiAgYnVmZk1lZGljYWxIZXJiKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLk5vQnVmZk1lZGljYWxIZXJiLCBmYWxzZSk7XG4gIH1cbiAgZGVjcmVhc2VFbmVteURhbWFnZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5EZWNyZWFzZUVuZW15RGFtYWdlKTtcbiAgfVxuICB0cmFpbmVyKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKERlYnVnTW9kZS5UcmFpbmVyTW9kZSk7XG4gIH1cbiAgbmV2ZXJEaWUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soRGVidWdNb2RlLk5ldmVyRGllKTtcbiAgfVxuICBjaGFyZ2VTaG90c09ubHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuQ2hhcmdlU2hvdHNPbmx5KTtcbiAgfVxuXG4gIGJhcnJpZXJSZXF1aXJlc0NhbG1TZWEoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIH1cbiAgLy8gcGFyYWx5c2lzUmVxdWlyZXNQcmlzb25LZXkoKTogYm9vbGVhbiB7XG4gIC8vICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIC8vIH1cbiAgLy8gc2VhbGVkQ2F2ZVJlcXVpcmVzV2luZG1pbGwoKTogYm9vbGVhbiB7XG4gIC8vICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JsJyk7XG4gIC8vIH1cblxuICBjb25uZWN0TGltZVRyZWVUb0xlYWYoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5NYXBzLCAnIScpO1xuICB9XG4gIC8vIGNvbm5lY3RHb2FUb0xlYWYoKSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuY2hlY2soJ1hlJykgJiYgdGhpcy5jaGVjaygnWGcnKTtcbiAgLy8gfVxuICAvLyByZW1vdmVFYXJseVdhbGwoKSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuY2hlY2soJ1hiJyk7XG4gIC8vIH1cbiAgYWRkRWFzdENhdmUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soVmFuaWxsYS5NYXBzLCBmYWxzZSk7XG4gIH1cbiAgZm9nTGFtcE5vdFJlcXVpcmVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuVmFuaWxsYURvbHBoaW4sIGZhbHNlKTtcbiAgfVxuICBzdG9yeU1vZGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5TdG9yeU1vZGUpO1xuICB9XG4gIG5vQm93TW9kZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk5vQm93TW9kZSk7XG4gIH1cbiAgcmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soUm91dGluZy5WYW5pbGxhRG9scGhpbik7XG4gIH1cbiAgc2FoYXJhUmFiYml0c1JlcXVpcmVUZWxlcGF0aHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7IC8vIHRoaXMuY2hlY2soJ1JyJyk7XG4gIH1cbiAgdGVsZXBvcnRPblRodW5kZXJTd29yZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhSb3V0aW5nLk5vVGh1bmRlclN3b3JkV2FycCwgZmFsc2UsICchJyk7XG4gIH1cbiAgcmFuZG9taXplVGh1bmRlclRlbGVwb3J0KCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuTm9UaHVuZGVyU3dvcmRXYXJwLCBmYWxzZSk7XG4gIH1cbiAgb3Jic09wdGlvbmFsKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFJvdXRpbmcuT3Jic05vdFJlcXVpcmVkKTtcbiAgfVxuXG4gIHNodWZmbGVHb2FGbG9vcnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuU2h1ZmZsZUdvYUZsb29ycyk7XG4gIH1cbiAgcmFuZG9taXplTWFwcygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVNYXBzKTtcbiAgfVxuICByYW5kb21pemVUcmFkZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplVHJhZGVzKTtcbiAgfVxuICB1bmlkZW50aWZpZWRJdGVtcygpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhXb3JsZC5VbmlkZW50aWZpZWRLZXlJdGVtcyk7XG4gIH1cbiAgcmFuZG9taXplV2FsbHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soV29ybGQuUmFuZG9taXplV2FsbEVsZW1lbnRzKTtcbiAgfVxuXG4gIGd1YXJhbnRlZVN3b3JkKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEVhc3lNb2RlLkd1YXJhbnRlZVN0YXJ0aW5nU3dvcmQpO1xuICB9XG4gIGd1YXJhbnRlZVN3b3JkTWFnaWMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTm9HdWFyYW50ZWVzLkJhdHRsZU1hZ2ljLCBmYWxzZSk7XG4gIH1cbiAgZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhOb0d1YXJhbnRlZXMuTWF0Y2hpbmdTd29yZCwgZmFsc2UpO1xuICB9XG4gIGd1YXJhbnRlZUdhc01hc2soKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soTm9HdWFyYW50ZWVzLkdhc01hc2ssIGZhbHNlKTtcbiAgfVxuICBndWFyYW50ZWVCYXJyaWVyKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKE5vR3VhcmFudGVlcy5CYXJyaWVyLCBmYWxzZSk7XG4gIH1cbiAgZ3VhcmFudGVlUmVmcmVzaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhFYXN5TW9kZS5HdWFyYW50ZWVSZWZyZXNoKTtcbiAgfVxuXG4gIGRpc2FibGVTd29yZENoYXJnZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5Td29yZENoYXJnZUdsaXRjaCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVUZWxlcG9ydFNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCwgZmFsc2UpO1xuICB9XG4gIGRpc2FibGVSYWJiaXRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlU2hvcEdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLlNob3BzLCBmYWxzZSk7XG4gIH1cbiAgZGlzYWJsZVN0YXR1ZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5TdGF0dWVHbGl0Y2gsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlUmFnZVNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuUmFnZVNraXAsIGZhbHNlKTtcbiAgfVxuICBkaXNhYmxlRmxpZ2h0U3RhdHVlU2tpcCgpIHtcbiAgICAvLyBUT0RPIC0gaW1wbGVtZW50XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuU3RhdHVlR2F1bnRsZXRTa2lwLCBmYWxzZSk7XG4gIH1cblxuICBhc3N1bWVTd29yZENoYXJnZUdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5Td29yZENoYXJnZUdsaXRjaCk7XG4gIH1cbiAgYXNzdW1lR2hldHRvRmxpZ2h0KCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLkdoZXR0b0ZsaWdodCk7XG4gIH1cbiAgYXNzdW1lVGVsZXBvcnRTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLk10U2FicmVSZXF1aXJlbWVudFNraXApO1xuICB9XG4gIGFzc3VtZVJhYmJpdFNraXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuTXRTYWJyZVJlcXVpcmVtZW50U2tpcCk7XG4gIH1cbiAgYXNzdW1lU3RhdHVlR2xpdGNoKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN0YXR1ZUdsaXRjaCk7XG4gIH1cbiAgYXNzdW1lVHJpZ2dlckdsaXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhHbGl0Y2hlcy5UcmlnZ2VyU2tpcCk7IC8vIFRPRE8gLSBpbXBsZW1lbnRcbiAgfVxuICBhc3N1bWVGbGlnaHRTdGF0dWVTa2lwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEdsaXRjaGVzLlN0YXR1ZUdhdW50bGV0U2tpcCk7IC8vIFRPRE8gLSBpbXBsZW1lbnRcbiAgfVxuICBhc3N1bWVXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLldpbGRXYXJwLCB0cnVlKSB8fFxuICAgICAgICB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwKTtcbiAgfVxuICBhc3N1bWVSYWdlU2tpcCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gICAgLy8gcmV0dXJuIHRoaXMuY2hlY2soR2xpdGNoZXMuUmFnZVNraXApOyAvLyBUT0RPIC0gaW1wbGVtZW50IC0gY2hlY2sgZmx5ZXJcbiAgfVxuXG4gIG5lcmZXaWxkV2FycCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhWYW5pbGxhLldpbGRXYXJwLCBmYWxzZSkgJiZcbiAgICAgICAgdGhpcy5jaGVjayhXb3JsZC5SYW5kb21pemVXaWxkV2FycCwgZmFsc2UpO1xuICB9XG4gIGFsbG93V2lsZFdhcnAoKSB7XG4gICAgcmV0dXJuICF0aGlzLm5lcmZXaWxkV2FycCgpO1xuICB9XG4gIHJhbmRvbWl6ZVdpbGRXYXJwKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKFdvcmxkLlJhbmRvbWl6ZVdpbGRXYXJwLCB0cnVlKTtcbiAgfVxuXG4gIGJsYWNrb3V0TW9kZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhIYXJkTW9kZS5CbGFja291dCk7XG4gIH1cbiAgaGFyZGNvcmVNb2RlKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLlBlcm1hZGVhdGgpO1xuICB9XG4gIGJ1ZmZEeW5hKCkge1xuICAgIHJldHVybiAhdGhpcy5jaGVjayhWYW5pbGxhLkR5bmEpO1xuICB9XG4gIG1heFNjYWxpbmdJblRvd2VyKCkge1xuICAgIHJldHVybiB0aGlzLmNoZWNrKEhhcmRNb2RlLk1heFNjYWxpbmdJblRvd2VyKTtcbiAgfVxuXG4gIGV4cFNjYWxpbmdGYWN0b3IoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soSGFyZE1vZGUuRXhwZXJpZW5jZVNjYWxlc1Nsb3dlcikgPyAwLjI1IDpcbiAgICAgICAgdGhpcy5jaGVjayhFYXN5TW9kZS5FeHBlcmllbmNlU2NhbGVzRmFzdGVyKSA/IDIuNSA6IDE7XG4gIH1cblxuICAvLyBPUFRJT05BTCBGTEFHU1xuICBhdXRvRXF1aXBCcmFjZWxldChwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHBhc3MgPT09ICdlYXJseScgfHwgdGhpcy5jaGVjayhRdWFsaXR5Lk5vQXV0b0VxdWlwLCBmYWxzZSk7XG4gIH1cbiAgY29udHJvbGxlclNob3J0Y3V0cyhwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHBhc3MgPT09ICdlYXJseScgfHwgdGhpcy5jaGVjayhRdWFsaXR5Lk5vQ29udHJvbGxlclNob3J0Y3V0cywgZmFsc2UpO1xuICB9XG4gIHJhbmRvbWl6ZU11c2ljKHBhc3M6ICdlYXJseScgfCAnbGF0ZScpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jaGVjayhBZXN0aGV0aWNzLlJhbmRvbWl6ZU11c2ljLCBwYXNzID09PSAnZWFybHknID8gJyEnIDogdHJ1ZSk7XG4gIH1cbiAgc2h1ZmZsZVRpbGVQYWxldHRlcyhwYXNzOiAnZWFybHknIHwgJ2xhdGUnKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2hlY2soQWVzdGhldGljcy5SYW5kb21pemVNYXBDb2xvcnMsXG4gICAgICAgICAgICAgICAgICAgICAgcGFzcyA9PT0gJ2Vhcmx5JyA/ICchJyA6IHRydWUpO1xuICB9XG4gIG5vTXVzaWMocGFzczogJ2Vhcmx5JyB8ICdsYXRlJyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBwYXNzID09PSAnbGF0ZScgJiYgdGhpcy5jaGVjayhBZXN0aGV0aWNzLk5vTXVzaWMpO1xuICB9XG59XG4iXX0=