export default (nes) => {
  window.onspawn = () => {};
  window.onspawned = () => {};
  window.onlocation = () => {};
  window.slots = [];
  nes.debug.breakAt(0x3c25d, 'prg', 'x', () => {
    const id = nes.cpu.ram[0x11];
    const slot = nes.cpu.ram[0x10];
    window.spawningId = id;
    window.spawningSlot = slot;
    window.slots[slot] = id;
    return window.onspawn(id, slot);
  });

  // useful to see what *actually* spawned...
  nes.debug.breakAt(0x3c263, 'prg', 'x', () => {
    return window.onspawned(window.spawningId, window.spawningSlot);
  });
  nes.debug.breakAt(0x3c2b3, 'prg', 'x', () => {
    return window.onspawned(window.spawningId, window.spawningSlot);
  });
  nes.debug.breakAt(0x3c40d, 'prg', 'x', () => {
    return window.onspawned(window.spawningId, window.spawningSlot);
  });

  nes.debug.breakAt(0x6c, 'ram', 'w', () => {
    return window.onlocation(nes.cpu.ram[0x6c]);
  });

  window.levelUp = () => {
    nes.cpu.ram[0x706] = 1;
    nes.cpu.ram[0x707] = 0;
  };

  window.hex = (x) => '$' + x.toString(16).padStart(2, 0);
  window.seq = (n, f) => new Array(n).fill(0).map((x, i) => f(i));

  // window.onspawned = (id,slot)=>console.log(`spawned ${hex(id)} at ${hex(slot)
  //     }: ${seq(32,i=>hex(nes.cpu.ram[0x300+32*i+slot]))}`);
  // nes.debug.breakAt(0x35357, 'prg', 'x', () => console.log(`hit by ${
  //     hex(nes.cpu.REG_Y)}: ${hex(slots[nes.cpu.REG_Y])}`));
};
