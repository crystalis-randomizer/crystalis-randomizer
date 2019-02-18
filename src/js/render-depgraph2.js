require = require('esm')(module);

const {Graph, Connection, Location} = require('./graph2.js');
const {generate} = require('./depgraph2.js');
const Viz = require('viz.js');
const {Module, render} = require('viz.js/full.render.js');

// There's two different kind of dot outputs.
// 1. just the locations, with edges annotated
// 2. items and triggers, (all directed edges,locations integrated out)

// Outputs a .dot file.
const toLocationGraph = (graph) => {
  const parts = [];
  parts.push(
    'digraph locations {',
    'node [shape=record, style=filled, color=white];');
  const subgraphs = {};
  const edges = new Set();
  const areas = [];

  for (const n of graph.nodes) {
    if (n instanceof Location) {
      let area = subgraphs[n.area.uid];
      if (!(n.area.uid in subgraphs)) {
        areas.push(n.area);
        area = subgraphs[n.area.uid] = [];
      }
      area.push(locationToDot(n));
      for (const e of locationEdges(n)) {
        edges.add(e);
      }
    }
  }

  for (const area of areas) {
    parts.push(
      `  subgraph cluster_${area.uid} {`,
      `    style=filled;`,
      `    color="lightgrey";`,
      `    label="${area.name}";`,
      ...subgraphs[area.uid],
      '  }');
  }

  for (const edge of edges) {
    parts.push(connectionToDot(edge));
  }

  parts.push('}');
  return parts.join('\n');
};

connectionToDot = (c) => {
  //const arr = this.bidi ? '--' : '->';
  const attrs = [];
  if (c.deps.length) {
    attrs.push(`label="${c.deps.map(d => d.name).join(', ')}"`);
  }
  if (c.bidi) {
    attrs.push(`dir=none`);
  }
  const attrsStr = attrs.length ? ` [${attrs.join(', ')}]` : '';
  return `  n${c.from.uid} -> n${c.to.uid}${attrsStr};`;
};

const locationEdges = (loc) => {

  // TODO - if it's a connection from start,
  // instead of making an arrow, just draw a different
  // type of node and list the requirements underneath?

  const out = [...loc.connections];
  const prefix = n => ({uid: `${loc.uid}_${n.uid}`});
  for (const chest of loc.chests) {
    out.push(new Connection(loc, prefix(chest), false, []));
  }
  for (const {trigger, deps} of loc.triggers) {
    out.push(new Connection(loc, prefix(trigger), false, deps));
    if (trigger.slot) {
      out.push(new Connection(prefix(trigger), prefix(trigger.slot), false, []));
    }
  }
  if (loc.bossNode && loc.bossNode.slot) {
    out.push(new Connection(loc, prefix(loc.bossNode.slot), false, loc.bossNode.deps));
  }
  return out;
};

// Specifies several edges.
const locationToDot = (loc) => {
  const fmt = (n, c) => `    n${loc.uid}_${n.uid} [label="${n.name}", color="${c}", shape=oval];`;
  const color = loc.bossNode ? ' color="#ffbbbb"' : '';
  const nodes = [`    n${loc.uid} [label="${loc.fullName()}"${color}];`];
  for (const chest of loc.chests) {
    nodes.push(fmt(chest, '#ddffdd'));
  }
  for (const {trigger} of loc.triggers) {
    nodes.push(fmt(trigger, '#ddddff'));
    if (trigger.slot) {
      if (!trigger.slot) {
        throw new Error(`missing item: ${trigger.slot.name}`);
      }
      nodes.push(fmt(trigger.slot, '#ddffdd'));
    }
  }
  if (loc.bossNode && loc.bossNode.slot) {
    if (!loc.bossNode.slot) {
      throw new Error(`missing item: ${loc.bossNode.slot.name}`);
    }
    nodes.push(fmt(loc.bossNode.slot, '#ddffdd'));
  }
  return nodes.join('\n');
};


const viz = new Viz({Module: () => Module({TOTAL_MEMORY: 1<<25}), render});
viz.renderString(toLocationGraph(generate())).then(console.log);
//console.log(graph.toLocationGraph());
