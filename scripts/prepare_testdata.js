// Prepares a fake ROM for testing, which contains only the minimal table
// structures that are necessary for the randomizer to not crash (i.e.
// address tables, terminations, etc.)

// -- NOTE: doesn't quite work, there's some infinite loops somewhere

const buf = new Uint8Array(0x60010);
const prg = buf.subarray(0x10, 0x30010);

const write = (addr, ...data) => {
  for (let i = 0; i < data.length; i++) {
    prg[addr + i] = data[i];
  }
};

// Build the ItemGet tables at $1dd66 and $1db00 (80)
for (let i = 0; i < 0x80; i++) {
  prg[0x1dd66 + i] = i;
  prg[0x1db00 + 2*i] = 0x00;
  prg[0x1db01 + 2*i] = 0x9c;
}
write(0x1dc00, 0, 0, 0, 0, 0x80, 0, 0xff);

// Build the Locations and NPC Data tables
for (let i = 0; i < 0x100; i++) {
  prg[0x14300 + 2*i] = 0x00;
  prg[0x14301 + 2*i] = 0x85;
  prg[0x19200 + 2*i] = 0x01;
  prg[0x19201 + 2*i] = 0x94;
}
write(0x14500, 0x0a, 0x85, 0x0a, 0x85, 0x0a, 0x85, 0x0a, 0x85, 0x0a, 0x85, 0xff);
write(0x19401, 0, 0, 0, 0, 0, 0xff);

// Build the object data tables
for (let i = 0; i < 0x100; i++) {
  prg[0x1ac00 + 2*i] = 0x00;
  prg[0x1ac01 + 2*i] = 0xae;
}
//write(0x1ae00, 0, 0, 0, 0, 0);

// Metasprites
for (let i = 0; i < 0x100; i++) {
  prg[0x3845c + 2*i] = 0x5c;
  prg[0x3845d + 2*i] = 0x86;
}
write(0x3865c, 1, 1); // need 8 more zeros, too.

// NPC Spawns and dialogs
for (let i = 0; i < 00; i++) {
  // npc spawn conditions
  write(0x1c5e0 + 2*i, 0x00, 0x90);
  // dialog tables
  write(0x1c95d + 2*i, 0x5d, 0x8b);
}
//console.log(Array.from(prg.slice(0x1c5e0,0x1c6e0),x=>x.toString(16).padStart(2,0)).join(' '))
for (let i = 0; i < 0x100; i++) {
  write(0x1d000 + 7*i, i, 0, 0, 0, 0, 0xa0, 0, 0xff);
}
write(0x1cb5d, 0x80, 0, 0, 0); // empty header
// match every location to the first record.
for (let i = 0; i < 0x100; i++) {
  write(0x1cb61 + 2*i, i, 0);
}
// add several options so that offsets can work.
write(0x1cd61, 0xff,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0xa0, 0, 0, 0, 0);


// ==== MESSAGES ====

// Message table parts/banks
for (let i = 0; i < 0x24; i++) {
  // put all in bank $15
  prg[0x283fe + i] = 0x15;
  // put one message in each part ($28000)
  prg[0x28422 + 2*i] = 2 * i;
  prg[0x28423 + 2*i] = 0x80;
  // make all the parts point to the same empty message ($2a000)
  prg[0x28000 + 2*i] = 0x00;
  prg[0x28001 + 2*i] = 0xa0;
}
write(0x2a000, 0x01, 0x41, 0x00);

// Words tables
for (let i = 0x28900; i < 0x28af0; i += 2) {
  prg[i] = 0xf0;
  prg[i + 1] = 0x8a;
}
write(0x28af0, 0x61); // 'a', then zero-terminated

process.stdout.write(Buffer.from(buf));
