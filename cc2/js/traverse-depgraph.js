require = require('esm')(module);

const {generate} = require('./depgraph.js');
const g = generate();
let win,path;
const start = new Date().getTime();
for (let i = 0; i < 100; i++) {
  ({win, path} = g.traverse());
}
const end = new Date().getTime();
console.log(path.join('\n'));
console.log(`time: ${(end - start) / 100} ms`);
