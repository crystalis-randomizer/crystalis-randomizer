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

  window.levelUp = (incr = 0) => {
    nes.cpu.ram[0x706] = 1;
    nes.cpu.ram[0x707] = 0;
    nes.cpu.ram[0x421] = Math.min(nes.cpu.ram[0x421] + incr, 15);
  };

  window.max = () => {
    window.levelUp(14);
    nes.cpu.ram[0x3c1] = nes.cpu.ram[0x708] = 0xff;
    nes.cpu.ram[0x702] = nes.cpu.ram[0x703] = 0xff;
    nes.cpu.write(0x6430, 0x00);
    nes.cpu.write(0x6431, 0x01);
    nes.cpu.write(0x6432, 0x02);
    nes.cpu.write(0x6433, 0x03);
    nes.cpu.write(0x6434, 0x19);
    nes.cpu.write(0x6435, 0x1a);
    nes.cpu.write(0x6436, 0x1b);
    nes.cpu.write(0x6437, 0x1c);
    nes.cpu.write(0x6438, 0x11);
    nes.cpu.write(0x6439, 0x12);
    nes.cpu.write(0x643a, 0x13);
    nes.cpu.write(0x643b, 0x14);
    nes.cpu.write(0x643c, 0x06);
    nes.cpu.write(0x643d, 0x08);
    nes.cpu.write(0x643e, 0x0a);
    nes.cpu.write(0x643f, 0x0c);
  }

  window.hex = (x) => '$' + x.toString(16).padStart(2, 0);
  window.seq = (n, f) => new Array(n).fill(0).map((x, i) => f(i));

  // window.onspawned = (id,slot)=>console.log(`spawned ${hex(id)} at ${hex(slot)
  //     }: ${seq(32,i=>hex(nes.cpu.ram[0x300+32*i+slot]))}`);
  // nes.debug.breakAt(0x35357, 'prg', 'x', () => console.log(`hit by ${
  //     hex(nes.cpu.REG_Y)}: ${hex(slots[nes.cpu.REG_Y])}`));

  window.warp = (loc, entrance = 0) => {
    nes.cpu.ram[0x6c] = loc;
    nes.cpu.ram[0x6d] = entrance;
    nes.cpu.ram[0x41] = 1;
  };
};
