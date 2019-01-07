require = require('esm')(module);

const {graph} = require('./depgraph2.js');
console.log(graph.traverse().join('\n'));
