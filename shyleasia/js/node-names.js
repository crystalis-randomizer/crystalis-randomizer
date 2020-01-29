require = require('esm')(module);

const {generate} = require('./depgraph.js');
const {FlagSet} = require('./flagset.js');
const {Bits} = require('./bits.js');
const {Random} = require('./random.js');

const flags = new FlagSet(process.argv.slice(2).join(' ') || 'Rflpt Dt Tw Gft'); // Gstrf

const g = generate(flags);

for (let i = 0; i < g.nodes.length; i++) {
  console.log(`${String(i).padStart(3)}: ${g.nodes[i]}`);
}
