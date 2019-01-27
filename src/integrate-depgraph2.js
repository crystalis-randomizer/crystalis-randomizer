require = require('esm')(module);

const {generate} = require('./depgraph2.js');
const {integrateLocations2} = require('./graph2.js');

Error.stackTraceLimit = Infinity;

integrateLocations2(generate());
