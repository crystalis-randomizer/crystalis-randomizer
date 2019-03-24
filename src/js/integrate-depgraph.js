require = require('esm')(module);

const {generate} = require('./depgraph.js');
const {FlagSet} = require('./flagset.js');
const {Bits} = require('./bits.js');
const {Random} = require('./random.js');

const flags = new FlagSet(process.argv.slice(2).join(' ') || 'Rflpt Dt Tw Gft'); // Gstrf

const g = generate(flags);
const start = new Date().getTime();
const dg = g.integrate();
const end = new Date().getTime();
//console.log(String(dg));
console.log(`time: ${end - start} ms`); // seems to take ~900 ms, so 20 traversals

for (let i = 0; i < dg.itemToUid.length; i++) {
  console.log(`ITEM ${i}: ${g.nodes[dg.itemToUid[i]]}`);
}
for (let i = 0; i < dg.locationToUid.length; i++) {
  console.log(`SLOT ${i}: ${g.nodes[dg.locationToUid[i]]}`);
  const lines =
      (dg.routes[i] || [])
          .map(r => Bits.bits(r).map(b => g.nodes[dg.itemToUid[b]].name).join(' & ')).join('\n  ');
  console.log(`  ${lines}`);
}

// for (const bit of dg.traverse(Bits.of(0,1,2,3), [4, 5, 6])) {
//   console.log(String(g.nodes[dg.locationToUid[bit]]));
// }

for (let i = 0; i < 100; i++) {
  const r = new Random(i);
  const fill = dg.assumedFill(r);
  console.log('=============================================');
  if (!fill) {
    console.log(`BAD FILL`);
    continue;
  }
  const arr = [];
  //console.log(fill.join(', '));

  for (let i = 0; i < fill.length; i++) {
    let slot = g.nodes[dg.locationToUid[i]];
    slot = `${slot.slotName} (${slot.item.name})`;
    if (fill[i] == null) continue;
    const item = g.nodes[dg.itemToUid[fill[i]]];
    arr.push(`${String(arr.length + 1).padStart(2)} ${item.name}: ${slot}`);
  }
  arr.sort();
  console.log(arr.join('\n'));
  //if (arr.length != 41) throw new Error(`seed ${i} LENGTH: ${arr.length}`);
}


// console.log(dg.traverse([0x00000000, 0xffffffff], []).map(x=>x.toString(16)).join(' '));


// for (const loc of g.locations()) {
//   console.log(`${loc.area.name} ${loc.name}: ${[...(dg.graph.get(loc.uid)||new Map()).values()].map(([...s]) => '(' + s.map(n => g.node(n).name).join(' & ') + ')').join(' | ')}`);
// }

// for (const slot of g.slots()) {
//   if (slot.type == 'key' || slot.type == 'magic' || slot.type == 'bonus') {
//     console.log(`${slot.orig} ($${slot.origIndex.toString(16).padStart(2,0)}): ${[...(dg.graph.get(slot.uid)||new Map()).values()].map(([...s]) => '(' + s.map(n => g.node(n).name).join(' & ') + ')').join(' | ')}`);
//   }
// }
