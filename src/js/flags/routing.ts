import {FlagSection} from './model';

export const routingFlags: FlagSection = {
  section: 'Routing',

  flags: [
    {
      flag: 'Rs',
      name: 'Story Mode',
      text: `Draygon 2 won't spawn unless you have all four swords and have
           defeated all major bosses of the tetrarchy.`,
    },
    {
      flag: 'Rt',
      name: 'Sword of Thunder teleports to Shyron',
      text: `Normally when acquiring the thunder sword, the player is instantly
           teleported to Shyron. This flag maintains that behavior regardless of
           where it is found (immediately activating the warp point; talking
           to Asina will teleport back to the start, in case no other means of
           return is available).  Disabling this flag means that the Sword of
           Thunder will act like all other items and not teleport.`,
    },
    {
      flag: 'Rd',
      name: 'Require healing dolphin to return fog lamp',
      text:
          `Normally the fog lamp cannot be returned without healing the dolphin
           to acquire the shell flute (so as not to be stranded).  Continuity
           suggests that actually healing the dolphin should also be required,
           but we've found that this makes the dolphin a lot less useful.  By
           default the fog lamp can be returned before healing the dolphin.  This
           flag adds the extra requirement for better continuity.`,
    },
    {
      flag: 'Rp',
      name: 'Wind-waterfall passage',
      text: `Opens a passage between Valley of Wind (lower right side) and
           Lime Tree Valley.`,
    },
    {
      flag: 'Rr',
      name: 'Deo requires telepathy',
      text: `Deo's item is additionally blocked on telepathy.`,
    },
    {
      flag: 'Rl',
      name: 'No "free lunch" magic',
      text:
          `Disables "free lunch" magics that only require stepping on a square to
           learn (specifally Barrier and Paralysis).  Instead, Barrier requires
           the seas to be calmed, and Paralysis requires the prison key (which
           can be used at the top of the slope in Waterfall Valley to open the
           path in reverse).  Reverse vampire also requires the windmill to have
           been started.`,
    },
    {
      flag: 'Ro',
      name: 'Orbs not required to break walls',
      text:
          `Walls can be broken and bridges formed with level 1 shots.  Orbs and
           bracelets are no longer considered progression items (except for
           Tornado bracelet for Tornel on Mt Sabre).`,
    }
  ],
};
