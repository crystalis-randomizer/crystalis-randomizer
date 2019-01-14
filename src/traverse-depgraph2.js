require = require('esm')(module);

const {generate} = require('./depgraph2.js');
const start = new Date().getTime();
const {win, path} = generate().traverse();
console.log(path.join('\n'));
const end = new Date().getTime();
console.log(`time: ${end - start} ms`);
