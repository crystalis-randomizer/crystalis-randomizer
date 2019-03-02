require = require('esm')(module);

const {ItemGet, Slot} = require('./nodes.js');
const {generate, shuffle3} = require('./depgraph.js');
const {FlagSet} = require('./flagset.js');
const {Bits} = require('./bits.js');
const {Random} = require('./random.js');

class Hist {
  constructor(data = []) {
    this.data = data;
  }

  record(v) {
    this.data[v] = (this.data[v] || 0) + 1;
  }

  average() {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < this.data.length; i++) {
      sum += i * (this.data[i] || 0);
      count += (this.data[i] || 0);
    }
    return sum / count;
  }

  toString() {
    // TODO - actually draw the histogram w/ indent 4, stars
    // normalized to 70 at max ?
    let max = 0;
    let total = 0;
    for (let x of this.data) {
      max = Math.max(max, x || 0);
      total += (x || 0);
    }
    const lines = [Math.round(this.average() * 100) / 100];
    for (let i = 0; i < this.data.length; i++) {
      const stars = this.data[i] / max * 70;
      lines.push(`    ${String(i).padStart(3)}: ${String(Math.round((this.data[i] || 0) / total * 1000) / 10).padStart(4)}% ${'*'.repeat(Math.floor(stars))}${stars - Math.floor(stars) > 0.5 ? '·' : ''}`);
    }
    return lines.join('\n');
      //+ '\n'+ this.data.map((c,d) => `${d}: ${c}`).join(', ');
  }
}

// serializable to and initializable from json...
class ShuffleStats {
  constructor(json = {}) {
    const {
      locationDistribution = [],
      necessaryItems = [],
      necessaryLocations = [],
      necessaryCounts = [],
      locationDepths = [],
      itemDepths = [],
      endState = {success: 0, key: 0, traps: 0, chest: 0, misc: 0, no_win: 0},
      seeds = 0,
    } = json;
    this.seeds = seeds;
    this.endState = endState;
    const hist = (a) => a instanceof Hist ? a : new Hist(a);
    // Array<Hist>: {item: {location: count}}
    this.locationDistribution = locationDistribution.map(hist);
    // Hist: {item: count}
    this.necessaryItems = hist(necessaryItems);
    // Hist: {location: count}
    this.necessaryLocations = hist(necessaryLocations);
    // Hist: {numberOfNecessaryItems: count}
    this.necessaryCounts = hist(necessaryCounts);
    // Array<Hist<number>>: {location: {depth: count}}
    this.locationDepths = locationDepths.map(hist);
    // Array<Array<number>>: {item: {depth: count}}
    this.itemDepths = itemDepths.map(hist);
  }

  analyze(graph, locationList, filling) {
    const record2 = (arr, outer, inner) => {
      const hist = arr[outer] || (arr[outer] = new Hist());
      hist.record(inner);
    };
    const locationDepths = locationList.traverseDepths(filling);
    // need to map to actual slotIndexes, etc...?
    for (let i = 0; i < locationDepths.length; i++) {
      const slot = locationList.location(i);
      record2(this.locationDepths, slot.slotIndex, locationDepths[i]);
      record2(this.itemDepths, slot.itemIndex, locationDepths[i]);
    }
    for (const i of locationList.locationToUid) {
      const slot = graph.nodes[i];
      record2(this.locationDistribution, slot.itemIndex, slot.slotIndex);
    }
    // item is considered necessary if the game is
    // unwinnable without it.
    let necessary = 0;
    for (let slot = 0; slot < filling.length; slot++) {
      const item = filling[slot];
      if (item == null) continue;
      delete filling[slot];
      if (!locationList.traverse(undefined, filling).has(locationList.win)) {
        necessary++;
//console.error(`slot=${slot} -> ${locationList.location(slot).slotIndex}    item=${item} -> ${locationList.item(item).id}`);
        this.necessaryLocations.record(locationList.location(slot).slotIndex);
        this.necessaryItems.record(locationList.item(item).id);
      }
      filling[slot] = item;
    }
    this.necessaryCounts.record(necessary);
  }

  toJson() {
    return JSON.stringify({...this}, (k, v) => v instanceof Hist ? v.data : v || 0);
  }
}

const run = async () => {
  const flags = new FlagSet(process.argv.slice(2).join(' ') || 'Sbckm Rflpt Dt Tw Gt'); // Gstrf

  const g = generate(flags);
  const dg = g.integrate();

//for(let i=0;i<dg.itemToUid.length;i++)console.log(`${i} ${g.nodes[dg.itemToUid[i]]}`);
//for(let i=0;i<dg.locationToUid.length;i++)console.log(`${i} ${g.nodes[dg.locationToUid[i]]}`);
//console.error(dg.routes[4].map(r => Bits.bits(r)).join(' | '));
// return;
  // TODO - print the fillings
  //   - also print dg in general - why is no filling
  //     showing up as winnable?  win id = 4 (crystalis)
  //     so it should be gettable. what is condition?

  const s = new ShuffleStats();

  for (let i = 0; i < 1000; i++) {
    try {
      await shuffle3(g, dg, null, new Random(i), {stats: s}, flags);
    } catch (err) {
      //console.error(err.message);
    }
  }

  //console.log(s.toJson());
  //console.log(JSON.stringify(s.endState));


/// TODO - we indexed it all off the internal game index... oops
//   -> need to make those indexes so we can print reasonable data!!!

const slotsByIndex = [];
const itemsByIndex = [];
for (const n of g.nodes) {
  if (n instanceof Slot) itemsByIndex[n.itemIndex] = n.item;
  if (n instanceof Slot) slotsByIndex[n.slotIndex] = n;
}

const PERCENT = (x, y) => `${Math.round(x / y * 100)}%`;
const S = (n) => String(slotsByIndex[n]);
const I = (n) => String(itemsByIndex[n]);
const HIST = (h, f) => (h && h.data || []).map((c, x) => !c ? '' : `\n    ${String(c).padStart(3,' ')} ${f(x)}`).sort().reverse().join('');


  console.log(`Success: ${PERCENT(s.endState.success, s.seeds)}`);
  console.log(`Necessary: ${s.necessaryCounts}`);

  console.log(`ITEMS`);
  for(let i=0;i<s.itemDepths.length;i++) {
    console.log(`\x1b[1;33m$${i.toString(16).padStart(2,0)} ${I(i)}\x1b[m
  Necessary: ${PERCENT(s.necessaryItems.data[i], s.endState.success)}
  Depths: ${s.itemDepths[i]}
  Locations:${HIST(s.locationDistribution[i], S)}
`);
  }

  console.log(`\n\nLOCATIONS`);
  for(let i=0;i<s.locationDepths.length;i++) {
    console.log(`\x1b[1;36m$${i.toString(16).padStart(2,0)} ${S(i)}\x1b[m
  Necessary: ${PERCENT(s.necessaryLocations.data[i], s.endState.success)}
  Depths: ${s.locationDepths[i]}
`);
  }

// TODO - loop locations for location stats


}

run();
