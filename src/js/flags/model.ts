export interface Preset {
    descr: string;
    flags: string;
    title: string;

    default?: boolean;
};

export interface FlagSection {
    flags: Flag[];
    section: string;

    text?: string;
};

export interface Flag {
    flag: string;
    name: string;

    conflict?: RegExp;
    hard?: boolean;
    text?: string;
};