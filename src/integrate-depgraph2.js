require = require('esm')(module);

const {generate} = require('./depgraph2.js');
const {integrateLocations} = require('./graph2.js');

Error.stackTraceLimit = Infinity;

integrateLocations(generate());
