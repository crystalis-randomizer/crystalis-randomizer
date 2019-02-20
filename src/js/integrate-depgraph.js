require = require('esm')(module);

const {generate} = require('./depgraph.js');
const {FlagSet} = require('./flagset.js');

const g = generate(new FlagSet('Rf Dt Tw Gstrf'));
// TODO - set options?

const start = new Date().getTime();
const dg = g.integrate();
const end = new Date().getTime();
console.log(String(dg));
console.log(`time: ${end - start} ms`); // seems to take ~900 ms, so 20 traversals

// for (const loc of g.locations()) {
//   console.log(`${loc.area.name} ${loc.name}: ${[...(dg.graph.get(loc.uid)||new Map()).values()].map(([...s]) => '(' + s.map(n => g.node(n).name).join(' & ') + ')').join(' | ')}`);
// }

// for (const slot of g.slots()) {
//   if (slot.type == 'key' || slot.type == 'magic' || slot.type == 'bonus') {
//     console.log(`${slot.orig} ($${slot.origIndex.toString(16).padStart(2,0)}): ${[...(dg.graph.get(slot.uid)||new Map()).values()].map(([...s]) => '(' + s.map(n => g.node(n).name).join(' & ') + ')').join(' | ')}`);
//   }
// }
