require = require('esm')(module);

const {graph} = require('./depgraph');
const Viz = require('viz.js');
const {Module, render} = require('viz.js/full.render.js');

// TODO - how to do this without just editing full.render.js ???
// Module.TOTAL_MEMORY = 1 << 25;

const viz = new Viz({Module, render});
viz.renderString(graph.toDot()).then(console.log);
