require = require('esm')(module);

const {graph} = require('./depgraph');
const Viz = require('viz.js');
const {Module, render} = require('viz.js/full.render.js');

const viz = new Viz({Module, render});
viz.renderString(graph.toDot()).then(console.log);
