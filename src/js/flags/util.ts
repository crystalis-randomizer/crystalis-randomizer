import {debugModeFlags} from './debug-mode';
import {easyModeFlags} from './easy-mode';
import {glitchFixFlags} from './glitch-fixes';
import {glitchFlags} from './glitches';
import {hardModeFlags} from './hard-mode';
import {itemFlags} from './items';
import {Flag} from './model';
import {monsterFlags} from './monsters';
import {routingFlags} from './routing';
import {shopFlags} from './shops';
import {tweakFlags} from './tweaks';
import {worldFlags} from './world';

export const getFlagForName = (flag: string):
    Flag|undefined => {
      if (flag.startsWith('F')) {
        return getFlagFromCollection(glitchFixFlags.flags, flag);

      } else if (flag.startsWith('G')) {
        return getFlagFromCollection(glitchFlags.flags, flag);

      } else if (flag.startsWith('T')) {
        return getFlagFromCollection(tweakFlags.flags, flag);

      } else if (flag.startsWith('E')) {
        return getFlagFromCollection(easyModeFlags.flags, flag);

      } else if (flag.startsWith('H')) {
        return getFlagFromCollection(hardModeFlags.flags, flag);

      } else if (flag.startsWith('W')) {
        return getFlagFromCollection(worldFlags.flags, flag);

      } else if (flag.startsWith('P')) {
        return getFlagFromCollection(shopFlags.flags, flag);

      } else if (flag.startsWith('R')) {
        return getFlagFromCollection(routingFlags.flags, flag);

      } else if (flag.startsWith('M')) {
        return getFlagFromCollection(monsterFlags.flags, flag);

      } else if (flag.startsWith('S')) {
        return getFlagFromCollection(itemFlags.flags, flag);

      } else if (flag.startsWith('D')) {
        return getFlagFromCollection(debugModeFlags.flags, flag);
      }

      return undefined;
    }

const getFlagFromCollection =
    (flags: Flag[], searchFlag: string): Flag|undefined => {
      return flags.find(flag => flag.flag === searchFlag);
    }
