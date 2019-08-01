import {FlagSection} from './flag.js';

export const HARD_MODE_FLAGS: FlagSection = {
  section: 'Hard mode',
  prefix: 'H',

  flags: [
    {
      flag: 'Hw',
      hard: true,
      name: 'Battle magic not guaranteed',
      text: `Normally, the logic will guarantee that level 3 sword charges are
             available before fighting the tetrarchs (with the exception of Karmine,
             who only requires level 2).  This disables that check.`,
    },
    {
      flag: 'Hb',
      hard: true,
      name: 'Barrier not guaranteed',
      text:
          `Normally, the logic will guarantee Barrier (or else refresh and shield
             ring) before entering Stxy, the Fortress, or fighting Karmine.  This
             disables that check.`,
    },
    {
      flag: 'Hm',
      hard: true,
      name: 'Don\'t buff medical herb or fruit of power',
      text:
          `Medical Herb is not buffed to heal 64 damage, which is helpful to make
             up for cases where Refresh is unavailable early.  Fruit of Power is not
             buffed to restore 48 MP.`,
      conflict: /Em/
    },
    {
      flag: 'Hg',
      hard: true,
      name: 'Gas mask not guaranteed',
      text:
          `The logic will not guarantee gas mask before needing to enter the swamp.
             Gas mask is still guaranteed to kill the insect.`,
    },
    {
      flag: 'Hs',
      hard: true,
      name: 'Matching sword not guaranteed',
      text: `Player may be required to fight bosses with the wrong sword, which
             may require using "tink strats" dealing 1 damage per hit.`,
      // }, {
      //   flag: 'Ht',
      //   hard: true,
      //   name: 'Max out scaling level in tower',
      //   text: `Scaling level immediately maxes out upon stepping into
      //   tower.`,
    },
    {
      flag: 'Hx',
      hard: true,
      name: 'Experience scales slower',
      text: `More grinding will be required to "keep up" with the difficulty.`,
      conflict: /Ex/
    },
    {
      flag: 'Hc',
      hard: true,
      name: 'Charge shots only',
      text: `Stabbing is completely ineffective.  Only charged shots work.`,
    },
    {
      flag: 'Hd',
      hard: true,
      name: 'Buff Dyna',
      text:
          `Makes the Dyna fight a bit more of a challenge.  Side pods will fire
             significantly more.  The safe spot has been removed.  The counter
             attacks pass through barrier.  Side pods can now be killed.`,
    },
    {
      flag: 'Hz',
      hard: true,
      name: 'Blackout mode',
      text: `All caves and fortresses are permanently dark.`,
    },
    {
      flag: 'Hh',
      hard: true,
      name: 'Hardcore mode',
      text: `Checkpoints and saves are removed.`,
    }
  ],
  // }, {
  //   section: 'Weapons, armor, and item balance',
  //     <div class="checkbox">W: Normalize weapons and armor</div>
  //       <div class="flag-body">
  //         Sword attack values no longer depend on element, but instead on the
  //         number of orb/bracelet upgrades: just the sword is 2; sword plus
  //         one upgrade is 4; sword plus both upgrades is 8.  Stab damage is
  //         always fixed at 2, rather than effectively doubling the sword's
  //         base damage. Enemies no longer have minimum player level
  //         requirements.  All sword hits will now do at least one damage (when
  //         a hit "pings", exactly one damage is dealt), so no enemy is
  //         unkillable. <p>Base armor/shield defense is halved, and capped at
  //         twice the player level, so that (a) player level has more impact,
  //         and (b) really good armors aren't overpowered in early game.
  //       </div>
  //       <div class="checkbox">Wp: Nerf power ring</div>
  //       <div class="flag-body">
  //         TODO - don't necessarily want to require clicking through to get
  //         full list of changes, but also want to document in various places
  //         and want reasonable defaults.
  //       </div>
};
