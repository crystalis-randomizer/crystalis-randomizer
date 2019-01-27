require = require('esm')(module);

const {generate} = require('./depgraph2.js');

const g = generate();
// TODO - set options?

const dg = g.integrate();

for (const slot of g.slots()) {
  if (slot.type == 'key') {
    console.log(`${slot.orig} ($${slot.origIndex.toString(16).padStart(2,0)}): ${[...(dg.graph.get(slot.uid)||new Map()).values()].map(([...s]) => '(' + s.map(n => g.node(n).name).join(' & ') + ')').join(' | ')}`);
  }
}
