import { Flag } from "./model";

import { itemFlags } from './items';
import { worldFlags } from './world';
import { monsterFlags } from './monsters';
import { shopFlags } from './shops';
import { hardModeFlags } from './hard-mode';
import { tweakFlags } from './tweaks';
import { routingFlags } from './routing';
import { glitchFlags } from './glitches';
import { glitchFixFlags } from './glitch-fixes';
import { easyModeFlags } from './easy-mode';
import { debugModeFlags } from './debug-mode';

export const getFlagForName = (flag: string): Flag | undefined => {
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

const getFlagFromCollection = (flags: Flag[], searchFlag: string): Flag | undefined => {
    return flags.find(flag => flag.flag === searchFlag);
}