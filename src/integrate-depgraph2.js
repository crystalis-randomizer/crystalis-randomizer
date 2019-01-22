require = require('esm')(module);

const {generate} = require('./depgraph2.js');
const {integrate} = require('./graph2.js');

Error.stackTraceLimit = Infinity;

integrate(generate());
