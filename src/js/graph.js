// Build up the dependency graph
// http://webgraphviz.com

export class Graph {
  constructor() {
    this.nodes = [];
    this.edges = [];
  }

  add(description, deps) {
    const n = this.nodes.length;
    this.nodes.push(description);
    description.id = n;
    
    for (let dep of deps) {
      if (typeof dep == 'number') {
        if (this.nodes[dep].type == 'Route') {
          this.nodes[dep].text = `${description.text}: ${this.nodes[dep].text}`;
          this.nodes[n].or = true; // TODO - verify all are routes
        }
        this.edges.push([() => dep, n]);
      } else {
        this.edges.push([dep, n]);
      }
    }
    return n;
  }

  toDot() {
    const parts = [];
    const colors = {
      Boss: 'red',
      Location: 'blue',
      Item: '"#00ff00"',
      Magic: '"#00ff00"',
      Talk: 'orange',
      Chest: 'purple',
    };
    parts.push('digraph dependencies {');
    for (const n of this.nodes) {
      const attrs = [`label="${n.text}"`];
      if (!n.or) attrs.push('shape=box');
      if (colors[n.type]) attrs.push(`color=${colors[n.type]}`);
      parts.push(`  n${n.id} [${attrs.join(' ')}];`);
    }
    for (let [e1, e2] of this.edges) {
      //if (typeof e2 != 'function') console.log(e2);
      // TODO - e1 is sword? then color; e2 is or? then dotted.
      if (typeof e1 == 'function') e1 = e1();
      if (typeof e2 == 'function') e2 = e2();
      e1 = this.nodes[e1];
      e2 = this.nodes[e2];
      const attrs = [`arrowhead="${e2.or ? 'empty' : 'normal'}"`]; // odiamond?
      if (colors[e1.type]) attrs.push(`color=${colors[e1.type]}`);
      parts.push(`  n${e1.id} -> n${e2.id} [${attrs.join(' ')}];`);
    }
    parts.push('}');
    return parts.join('\n');
  }
};
