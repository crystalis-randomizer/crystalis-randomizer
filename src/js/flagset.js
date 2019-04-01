const REPEATABLE_FLAGS = new Set(['S']);

export const PRESETS = [{
  title: 'Casual',
  flags: 'Ds Emrx Mr Rp Sbk Sc Sm Tasdw',
  descr: `Basic flags for a relatively easy playthrough.`
}, {
  title: 'Intermediate',
  flags: 'Ds Em Fs Gt Mr Pbns Rlpt Sbkm Sct Tasdw',
  descr: `Slightly more challenge than Casual but still approachable.`,
  default: true,
}, {
  title: 'Full Shuffle',
  flags: 'Em Fs Gt Mr Pbns Rlpt Sbckmt Tasdw',
  descr: `Intermediate flags with full shuffle and no spoiler log.`,
}, {
  // TODO: add 'Ht' for maxing out tower scaling
  title: 'Advanced',
  flags: 'Fs Gfprt Hbw Mr Pbns Rlpt Sbckt Sm Tasdw',
  descr: `A balanced randomization with quite a bit more difficulty.`,
}, {
  // TODO: add 'Ht'
  title: 'Ludicrous',
  flags: 'Fs Gfprstw Hbgmswx Mr Pbns Rlpt Sbckmt Tas',
  descr: `Pulls out all the stops, may require superhuman feats.`,
}];


export const FLAGS = [{
  section: 'Items',
  text: `Items are broken into five pools: <i>key items</i> includes all
      swords, orbs, bracelets, and progression items (rabbit boots,
      gas mask, and all items in the third row: windmill key through
      bow of truth), as well as anything dropped by a boss (one each
      of fruit of power, opel statue, fruit of repun, sacred shield,
      and psycho armor); <i>bonus items</i> includes items that are
      never required but are nice to have, specifically the remaining
      six passive effect items in the second inventory row;
      <i>consumable items</i> includes everything else found in
      chests: primarily first row one-use items, but also includes
      psycho shield and battle armor; <i>magic</i> is the eight
      spells; and <i>traps</i> are the 12 trap chests found in various
      places. These pools can be shuffled together, kept separate, or
      left unshuffled.`,
  flags: [{
    flag: 'Sk',
    name: 'Shuffle key items',
  }, {
    flag: 'Sm',
    name: 'Shuffle magics',
  }, {
    flag: 'Sb',
    name: 'Shuffle bonus items',
  }, {
    flag: 'Sc',
    name: 'Shuffle consumables',
  }, {
    flag: 'Sbk',
    name: 'Shuffle key items with bonus items',
  }, {
    flag: 'Sbm',
    name: 'Shuffle bonus items with magic',
  }, {
    flag: 'Sbt',
    name: 'Shuffle bonus items with traps',
  }, {
    flag: 'Sct',
    name: 'Shuffle consumables with traps',
  }, {
    flag: 'Skm',
    name: 'Shuffle key items with magic',
  }, {
    flag: 'Skt',
    name: 'Shuffle key items with traps',
  }, {
    flag: 'Sbkm',
    name: 'Shuffle bonus, key, and magic',
  }, {
    flag: 'Sbc',
    hard: true,
    name: 'Shuffle bonus items with consumables',
  }, {
    flag: 'Sck',
    hard: true,
    name: 'Shuffle consumables with key items',
  }, {
    flag: 'Scm',
    hard: true,
    name: 'Shuffle consumables with magic',
  }, {
    flag: 'Sbck',
    hard: true,
    name: 'Shuffle bonus, consumables, and key items',
  }, {
    flag: 'Sbct',
    hard: true,
    name: 'Shuffle bonus, consumables, and traps',
  }, {
    flag: 'Sbkt',
    hard: true,
    name: 'Shuffle bonus, key, and traps',
  }, {
    flag: 'Skmt',
    hard: true,
    name: 'Shuffle key, magic, and traps',
  }, {
    flag: 'Sbckm',
    hard: true,
    name: 'Shuffle bonus, key, consumables, and magic',
  }, {
    flag: 'Sbckt',
    hard: true,
    name: 'Shuffle bonus, key, consumables, and traps',
  }, {
    flag: 'Sbkmt',
    hard: true,
    name: 'Shuffle bonus, key, magic, and traps',
  }, {
    flag: 'Sbckmt',
    hard: true,
    name: 'Shuffle all items and traps together',
  }], // TODO: Ss to shuffle shops?
}, {
  section: 'Monsters',
  flags: [{
    flag: 'Mr',
    name: 'Randomize monsters',
    text: `Monster locations are shuffled, with the exception of sea creatures
           and tower robots.`,
  // }, {
  //   flag: 'M!',
  //   name: 'No safety checks',
  //   text: `Normally there are some reasonability limits on the monsters
  //          that can be shuffled (flyers only in larger areas, and at most
  //          one or two; (future: large monsters and flail swingers don't
  //          crowd out small hallways, etc), but these checks can be disabled
  //          for extra craziness and challenge.`,
  // }, {
  //   flag: 'Ms',
  //   hard: true,
  //   name: 'Don\'t scale monster difficulty',
  //   text: `Monster difficulty normally scales with game progression rather
  //          than being hard-coded based on location to ensure that monsters
  //          stay relevant throughout the game.  The current difficulty level
  //          can be seen next to the player's experience level on the right
  //          side of the HUD.  This scaling can be turned off, but it is not
  //          recommended.`,
  }],
}, {
  section: 'Shops',
  text: `Disabling shop glitch (Fs) is highly recommended when using these flags.
         Currently selecting any shop flag will enable normalization (Pn).`,
  flags: [{
    flag: 'Ps',
    name: 'Shuffle shop contents',
  }, {
    flag: 'Pn',
    name: 'Normalize shop prices',
    text: `Shop prices are normalized via the scaling level.  Prices at tool
           shops and inns double every 10 scaling levels, while prices at
           armor shops halve every 12 scaling levels.`,
  }, {
    flag: 'Pb',
    name: 'Enable "bargain hunting"',
    text: `Base prices may vary ±50% for the same item at different; inn prices
           may vary ±62.5%.`,
  }],
}, {
  section: 'Hard mode',
  flags: [{
    flag: 'Hw',
    hard: true,
    name: 'Battle magic not guaranteed',
    text: `Normally, the logic will guarantee that level 3 sword charges are
           available before fighting the tetrarchs (with the exception of Karmine,
           who only requires level 2).  This disables that check.`,
  }, {
    flag: 'Hb',
    hard: true,
    name: 'Barrier not guaranteed',
    text: `Normally, the logic will guarantee Barrier (or else refresh and shield
           ring) before entering Stxy, the Fortress, or fighting Karmine.  This
           disables that check.`,
  }, {
    flag: 'Hm',
    hard: true,
    name: 'Don\'t buff medical herb or fruit of power',
    text: `Medical Herb is not buffed to heal 64 damage, which is helpful to make
           up for cases where Refresh is unavailable early.  Fruit of Power is not
           buffed to restore 48 MP.`,
  }, {
    flag: 'Hg',
    hard: true,
    name: 'Gas mask not guaranteed',
    text: `The logic will not guarantee gas mask before needing to enter the swamp.
           Gas mask is still guaranteed to kill the insect.`,
  }, {
    flag: 'Hs',
    hard: true,
    name: 'Matching sword not guaranteed',
    text: `Player may be required to fight bosses with the wrong sword.`,
  // }, {
  //   flag: 'Ht',
  //   hard: true,
  //   name: 'Max out scaling level in tower',
  //   text: `Scaling level immediately maxes out upon stepping into tower.`,
  }, {
    flag: 'Hx',
    hard: true,
    name: 'Experience scales slower',
    text: `More grinding will be required to "keep up" with the difficulty.`,
  }],
// }, {
//   section: 'Weapons, armor, and item balance',
//     <div class="checkbox">W: Normalize weapons and armor</div>
//       <div class="flag-body">
//         Sword attack values no longer depend on element, but instead on the
//         number of orb/bracelet upgrades: just the sword is 2; sword plus one
//         upgrade is 4; sword plus both upgrades is 8.  Stab damage is always
//         fixed at 2, rather than effectively doubling the sword's base damage.
//         Enemies no longer have minimum player level requirements.  All sword
//         hits will now do at least one damage (when a hit "pings", exactly one
//         damage is dealt), so no enemy is unkillable.
//         <p>Base armor/shield defense is halved, and capped at twice the player
//         level, so that (a) player level has more impact, and (b) really good
//         armors aren't overpowered in early game.
//       </div>
//       <div class="checkbox">Wp: Nerf power ring</div>
//       <div class="flag-body">
//         TODO - don't necessarily want to require clicking through to get
//         full list of changes, but also want to document in various places
//         and want reasonable defaults.
//       </div>
}, {
  section: 'Tweaks',
  flags: [{
    flag: 'Ta',
    name: 'Automatically equip orbs and bracelets',
    text: `Adds a quality-of-life improvement to automatically equip the
           corresponding orb/bracelet whenever changing swords.`,
  }, {
    flag: 'Ts',
    name: 'Leather boots are speed boots',
    text: `Wearing leather boots increases player walking speed.  Note that this also
           includes a slight change to routing logic, since speed boots will allow
           climbing the slope in Mt. Sabre West to reach the Tornado Bracelet chest.`,
  }, {
    flag: 'Td',
    name: 'Deo\'s pendant works while moving',
  }, {
    flag: 'Tr',
    name: 'Rabbit boots enable charge while walking',
    text: `Sword can be charged to level 2 while walking (prevents charging to
           level 3 to preserve MP).`,
  }, {
    flag: 'Tw',
    name: 'Disable wild warp',
    text: `Wild warp will only teleport back to Mezame shrine (to prevent
           game-breaking soft-locks).`,
  }],
}, {
  section: 'Routing',
  flags: [{
    flag: 'Rt',
    name: 'Sword of Thunder teleports to Shyron',
    text: `Normally when acquiring the thunder sword, the player is instantly
           teleported to Shyron. This flag maintains that behavior regardless of
           where it is found (immediately activating the warp point; talking
           to Asina will teleport back to the start, in case no other means of
           return is available).  Disabling this flag means that the Sword of
           Thunder will act like all other items and not teleport.`,
  }, {
    flag: 'Rd',
    name: 'Require healing dolphin to return fog lamp',
    text: `Normally the fog lamp cannot be returned without healing the dolphin
           to acquire the shell flute (so as not to be stranded).  Continuity
           suggests that actually healing the dolphin should also be required,
           but we've found that this makes the dolphin a lot less useful.  By
           default the fog lamp can be returned before healing the dolphin.  This
           flag adds the extra requirement for better continuity.`,
  }, {
    flag: 'Rp',
    name: 'Wind-waterfall passage',
    text: `Opens a passage between Valley of Wind (lower right side) and
           Lime Tree Valley.`,
  }, {
    flag: 'Rl',
    name: 'No "free lunch" magic',
    text: `Disables "free lunch" magics that only require stepping on a square to
           learn (specifally Barrier, TODO: Paralysis).  Instead, Barrier requires
           the seas to be calmed, and Paralysis will (once implemented) require the
           prison door to have been opened.`,
  }],
}, {
  section: 'Glitches',
  text: `The routing logic can be made aware of the following
      glitches.  If selected, it will assume that the glitch can be
      performed when verifying that a game is winnable.  Enabling
      these glitches tends to increase the randomness of the shuffle,
      since there are more valid options.`,
  flags: [{
    flag: 'Gc',
    hard: true,
    name: 'Sword charge glitch may be required',
    text: `Progression may require using the sword charge glitch to destroy walls or
           form bridges without actually possessing the correct orb.`,
  }, {
    flag: 'Gf',
    name: 'Ghetto flight may be required',
    text: `Progression may require using Rabbit Boots and the dolphin to reach Swan
           before the Angry Sea can be calmed and before Flight is available.`,
  }, {
    flag: 'Gp',
    name: 'Teleport skip may be required',
    text: `Progression may require entering Mt. Sabre North from Cordel Plain
           without the Teleport spell (flying over the river to avoid the
           trigger).`,
  }, {
    flag: 'Gr',
    name: 'Rabbit skip may be required',
    text: `Progression may require entering Mt. Sabre North from Cordel Plain
           without talking to the rabbit in Leaf after the abduction.`,
  }, {
    flag: 'Gt',
    name: 'Statue glitch may be required',
    text: `Progression may require glitching past guards without Change or Paralysis,
           or people turned to stone without a Flute of Lime.  The logic <i>hopefully</i>
           ensures that using the Flute of Lime on the two statues will not break the
           game, but we're less confident that this is always the case, so for safety
           we recommend always glitching past the statues if this option is set, even if
           the first Flute of Lime has been found.`,
  }, {
    flag: 'Gw',
    hard: true,
    name: 'Wild warp may be required',
    text: `Progression may require using "wild warp" (holding A and B on controller 1
           and tapping A on controller 2) to travel to parts of the game that would
           otherwise be unreachable.`,
  }],
}, {
  section: 'Glitch Fixes',
  text: `Alternatively, glitches may be patched out of the game and made unusable.
         These flags are exclusive with the flags that require the glitch.`,
  flags: [{
    flag: 'Fs',
    name: 'Disable shop glitch',
    text: `Items may no longer be purchased for neighboring prices.  This makes
           money actually mean something.  To compensate, gold drops money
           will be scaled up somewhat.`,
  }, {
    flag: 'Fc',
    name: 'Disable sword charge glitch',
    text: `Sword charge glitch will no longer work.  It will be impossible to
           achieve charge levels without having correct inventory.`,
  }, {
    flag: 'Ft',
    name: 'Disable statue glitch',
    text: `Statues will instead always push downwards, making it impossible to
           glitch through statues.`,
  }],
}, {
  section: 'Easy Mode',
  text: `The following options make parts of the game easier.`,
  flags: [{
    flag: 'Er',
    name: 'Guarantee refresh',
    text: `Guarantees the Refresh spell will be available before fighting Tetrarchs.`,
  }, {
    flag: 'Em',
    name: 'Extra buff medical herb',
    text: `Buff Medical Herb to heal 96 instead of 64 and Fruit of Power to
           restore 64 MP instead of 48.`,
  }, {
    flag: 'Ex',
    name: 'Experience scales faster',
    text: `Less grinding will be required to "keep up" with the game difficulty.`,
  }],
}, {
  section: 'Debug Mode',
  text: `These options are helpful for exploring or debugging.  Note that,
      while they do not directly affect any randomization, they
      <i>do</i> factor into the seed to prevent cheating, and they
      will remove the option to generate a seed for racing.`,
  flags: [{
    flag: 'Ds',
    name: 'Generate a spoiler log',
  }, {
    flag: 'Di',
    name: 'Player never dies',
  }], // TODO - quick itemget/teleport options?
}];


// TODO - flag validation!!!

const exclusiveFlags = (flag) => {
  if (flag.startsWith('S')) {
    return new RegExp(`S.*[${flag.substring(1)}]`);
  }
  return FLAG_CONFLICTS[flag];
}
const FLAG_CONFLICTS = {
  Hm: /Em/,
  Hx: /Ex/,
  Em: /Hm/,
  Ex: /Hx/,
  Tw: /Gw/,
  Gw: /Tw/,
  Ft: /Gt/,
  Gt: /Ft/,
  Fc: /Gc/,
  Gc: /Fc/,
};

export class FlagSet {
  constructor(str) {
    this.flags = {};
    // parse the string
    str = str.replace(/[^A-Za-z0-9!]/g, '');
    const re = /([A-Z])([a-z0-9!]+)/g;
    let match;
    while ((match = re.exec(str))) {
      let [flag, key, terms] = match;
      if (REPEATABLE_FLAGS.has(key)) {
        terms = [terms];
      }
      for (const term of terms) {
        this.set(key + term, true);
      }
    }
  }

  set(flag, value) {
    // check for incompatible flags...?
    const key = flag[0];
    const term = flag.substring(1); // assert: term is only letters/numbers
    if (!value) {
      // Just delete - that's easy.
      const filtered = (this.flags[key] || []).filter(t => t !== term);
      if (filtered.length) {
        this.flags[key] = filtered;
      } else{
        delete this.flags[key];
      }
      return;
    }
    // Actually add the flag.
    this.removeConflicts(flag);
    const terms = (this.flags[key] || []).filter(t => t !== term);
    terms.push(term);
    terms.sort();
    this.flags[key] = terms;
  }

  check(flag) {
    const terms = this.flags[flag[0]];
    return !!(terms && (terms.indexOf(flag.substring(1)) >= 0));
  }

  // The following didn't end up getting used.

  // allows(flag) {
  //   const re = exclusiveFlags(flag);
  //   if (!re) return true;
  //   for (const key in this.flags) {
  //     if (this.flags[key].find(t => re.test(key + t))) return false;
  //   }
  //   return true;
  // }

  // merge(that) {
  //   this.flags = that.flags;
  // }

  removeConflicts(flag) {
    // NOTE: this is somewhat redundant with set(flag, false)
    const re = exclusiveFlags(flag);
    if (!re) return;
    for (const key in this.flags) {
      const terms = this.flags[key].filter(t => !re.test(key + t));
      if (terms.length) {
        this.flags[key] = terms;
      } else {
        delete this.flags[key];
      }
    }
  }

  toStringKey(key) {
    if (REPEATABLE_FLAGS.has(key)) {
      return [...this.flags[key]].sort().map(v => key + v).join(' ');
    }
    return key + [...this.flags[key]].sort().join('');
  }

  toString() {
    const keys = Object.keys(this.flags);
    keys.sort();
    return keys.map(k => this.toStringKey(k)).join(' ');
  }
}
