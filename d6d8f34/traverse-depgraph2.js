require = require('esm')(module);

const {graph} = require('./depgraph2.js');
const start = new Date().getTime();
const {win, path} = graph.traverse();
console.log(path.join('\n'));
const end = new Date().getTime();
console.log(`time: ${end - start} ms`);
