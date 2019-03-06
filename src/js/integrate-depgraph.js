require = require('esm')(module);

const {generate} = require('./depgraph.js');
const {FlagSet} = require('./flagset.js');
const {Bits} = require('./bits.js');
const {Random} = require('./random.js');

const flags = new FlagSet(process.argv.slice(2).join(' ') || 'Rflpt Dt Tw Gft'); // Gstrf

const g = generate(flags);
const start = new Date().getTime();
const dg = g.integrate({tracker: true});
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
