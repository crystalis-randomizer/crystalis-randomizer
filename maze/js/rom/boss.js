const BOSS_OBJECT_ADDRESS = [
    [0x0b0f1, true],
    [0x0b0f5, false],
    [0x0b0f9, true],
    [0x0b0fd, false],
    [0x3656e, true],
    [0x3d820, true],
    [0x0b1f5, true],
    [0x0b1f9, true],
    [0x0b1fd, true],
    [0x0b2f1, true],
    [0x0b2f5, false],
    [0x0b2f9, false],
    [0x0b2fd, false],
    [0x0b3f1, true],
];
export function shuffleBosses(rom, random) {
    const b = BOSS_OBJECT_ADDRESS.filter(([, x]) => x).map(([x,]) => x);
    const v = b.map(x => rom.prg[x]);
    random.shuffle(v);
    for (let i = 0; i < b.length; i++)
        rom.prg[b[i]] = v[i];
}
//# sourceMappingURL=boss.js.map