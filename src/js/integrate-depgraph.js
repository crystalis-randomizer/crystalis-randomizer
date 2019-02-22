require = require('esm')(module);

const {generate} = require('./depgraph.js');
const {FlagSet} = require('./flagset.js');
const {Bits} = require('./bits.js');
const {Random} = require('./random.js');

const g = generate(new FlagSet('Rflpt Dt Tw Gt')); // Gstrf'));
// TODO - set options?

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
}

for (const bit of Bits.bits(dg.traverse(Bits.of(0,1,2,3), [4, 5, 6]))) {
  console.log(String(g.nodes[dg.locationToUid[bit]]));
}

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
const missing=new Set();
for (let i = dg.itemToUid.length - 1; i >= 0; i--) missing.add(i);

  for (let i = 0; i < fill.length; i++) {
    let slot = g.nodes[dg.locationToUid[i]];
    slot = `${slot.slotName} (${slot.item.name})`;
    if (fill[i] == null) { /*arr.push(`   : ${slot}`);*/ continue; }
//console.log(`${i}: ${fill[i]} => ${dg.itemToUid[fill[i]]}, ${dg.locationToUid[i]}`);
    const item = g.nodes[dg.itemToUid[fill[i]]];
    arr.push(`${item.name}: ${slot}`);
missing.delete(fill[i]);
  }
  arr.sort();
  console.log(arr.join('\n'));
for(const m of missing)console.log(`MISSING: ${g.nodes[dg.itemToUid[m]]}`);;
  if (arr.length != 38) throw new Error(`seed ${i} LENGTH: ${arr.length}`);
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
