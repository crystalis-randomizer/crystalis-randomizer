require = require('esm')(module);

const {graph} = require('./depgraph2.js');
const Viz = require('viz.js');
const {Module, render} = require('viz.js/full.render.js');

const viz = new Viz({Module: () => Module({TOTAL_MEMORY: 1<<25}), render});
viz.renderString(graph.toLocationGraph()).then(console.log);
//console.log(graph.toLocationGraph());
