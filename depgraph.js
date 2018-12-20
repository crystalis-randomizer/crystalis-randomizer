// Build up the dependency graph
// http://webgraphviz.com

class Graph {
  constructor() {
    this.nodes = [];
    this.edges = [];
  }

  add(description, deps) {
    const n = this.nodes.length;
    this.nodes.push(description);
    
    for (let dep of deps) {
      if (typeof dep == 'number') {
        if (this.nodes[dep].type == 'Route') {
          this.nodes[dep].text = `${description.text}: ${this.nodes[dep].text}`;
          this.nodes[n].or = true; // TODO - verify all are routes
        }
        this.edges.push([n, () => dep]);
      } else {
        this.edges.push([n, dep]);
      }
    }
    return n;
  }

  toDot() {
    const parts = [];
    const colors = {
      Boss: 'red',
      Location: 'blue',
      Item: 'green',
      Magic: 'green',
      Talk: 'cyan',
      Chest: 'cyan',
    };
    parts.push('digraph dependencies {');
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const shape = n.or ? '' : ' shape=box';
      const color = colors[n.type] ? ` color=${colors[n.type]}` : '';
      parts.push(`  n${i} [label="${n.text}"${shape}${color}];`);
    }
    for (const [e1, e2] of this.edges) {
      //if (typeof e2 != 'function') console.log(e2);
      // TODO - e1 is sword? then color; e2 is or? then dotted.
      parts.push(`  n${e2()} -> n${e1};`);
    }
    parts.push('}');
    return parts.join('\n');
  }
};


// Randomization plan:
//   - remove all ->item edges
//   - follow edges, annotating item blockers
//   - pick a random ->item edge and a random item blocker
//   - repeat

const g = new Graph();
const node = (text, ...deps) => g.add({text}, deps);
const boss = (text, ...deps) => g.add({text, type: 'Boss'}, deps);
const item = (text, ...deps) => g.add({text, type: 'Item'}, deps);
const talk = (text, ...deps) => g.add({text, type: 'Talk'}, deps);
const magic = (text, ...deps) => g.add({text, type: 'Magic'}, deps);
const chest = (text, ...deps) => g.add({text, type: 'Chest'}, deps);
const route = (text, ...deps) => g.add({text, type: 'Route'}, deps);
const trigger = (text, ...deps) => g.add({text, type: 'Trigger'}, deps);
const location = (text, ...deps) => g.add({text, type: 'Location'}, deps);

const start         = node('Start of Game');
const sword         = trigger('Sword',
                              route('wind', () => swordOfWind),
                              route('fire', () => swordOfFire),
                              route('water', () => swordOfWater),
                              route('thunder', () => swordOfThunder));
const notWind       = trigger('Sword (not wind)',
                              route('fire', () => swordOfFire),
                              route('water', () => swordOfWater),
                              route('thunder', () => swordOfThunder));
const hopOrFly      = trigger('Hop or Fly',
                              route('hop', () => rabbitBoots),
                              route('fly', () => flight));
const swimOrFly     = trigger('Swim or Fly',
                              //route('swim', () => dolphin),
                              route('fly', () => flight));
// NOTE: the following four edges can be removed for a more challenging experience
const tornadoMagic  = trigger('Tornado Magic', () => swordOfWind, () => tornadoBracelet);
const flameMagic    = trigger('Flame Magic', () => swordOfFire, () => flameBracelet);
const blizzardMagic = trigger('Blizzard Magic', () => swordOfWater, () => blizzardBracelet);
const stormMagic    = trigger('Storm Magic', () => swordOfThunder, () => stormBracelet);

const leaf          = location('Leaf', start);
const valleyOfWind  = location('Valley of Wind',
                               route('forward', leaf),
                               // TODO - currently glitched
                               // route('via Vampire', () => vampCave1)
                               route('via Zebu', () => zebuCave));
const alarmFlute    = item('Alarm Flute', leaf, () => joel);
const leafElder     = talk('Leaf Elder', leaf);
const zebuStudent   = talk('Zebu\'s Student', leaf);
const zebuCave      = location('Zebu\'s Cave',
                               route('forward', valleyOfWind),
                               route('reverse', () => mtSabreWest1, () => fireLevel2));
const zebu          = talk('Zebu', zebuCave, zebuStudent);
const swordOfWind   = item('Sword of Wind', leafElder);
const windmillGuard = talk('Windmill Guard', zebu);
const windmillKey   = item('Windmill Key', windmillGuard, alarmFlute);
const windmill      = trigger('Windmill', windmillKey, valleyOfWind);
const refresh       = magic('Refresh', windmill);
const vampCave1     = location('Vampire Cave 1',
                                // This includes everything in front of stone walls
                               route('forward', windmill),
                               route('reverse', () => vampCave2));
const vampCaveChest1 = chest('Vampire Cave Chest 1 (Warp Boots)', vampCave1);
const vampCaveChest2 = chest('Vampire Cave Chest 2 (Medical Herb)', vampCave1);
const vampCaveChest3 = chest('Vampire Cave Chest 3 (Ball of Wind)', vampCave1);
const ballOfWind     = item('Ball of Wind', vampCaveChest3);
const windLevel2     = trigger('Wind Level 2', swordOfWind, ballOfWind);
const vampCave2      = location('Vampire Cave Inner',
                                // This includes everything behind stone walls
                                route('forward', vampCave1, windLevel2),
                                route('reverse', () => vampCaveBossKilled));
const vampCaveChest4 = chest('Vampire Cave Chest 4 (Antidote)', vampCave2);
const vampCaveChest5 = chest('Vampire Cave Chest 5 (Medical Herb)', vampCave2);
const vampCaveBoss = location('Vampire Cave Boss',
                              route('forward', vampCave2),
                              route('reverse', () => cordellPlains, windLevel2));
const vampire1 = boss('Vampire 1', vampCaveBoss, sword);
const vampire1Chest = chest('Vamp1re 1 Chest (Rabbit Boots)', vampire1);
const vampCaveBossKilled = trigger('Vampire Cave Boss Killed', vampire1);
const rabbitBoots = item('Rabbit Boots', vampire1Chest);
const cordellPlains = location('Cordell Plain',
                               route('via Vampire', vampCaveBossKilled),
                               route('via Mt Sabre North',
                                     // TODO - rabbit trigger skippable
                                     () => mtSabreNorth1, () => leafRabbit, () => teleport),
                               route('via Mt Sabre West', () => mtSabreWest1, () => fireLevel2));
const brynmaer = location('Brynmaer', cordellPlains);
const cordellGrass = chest('Cordell Plains Grass', cordellPlains);
const onyxStatue = item('Onyx Statue', cordellGrass);
const akahanaBrynmaer = talk('Akahana: Brynmaer', brynmaer, onyxStatue);
const gasMask = item('Gas Mask', akahanaBrynmaer);
const swamp = location('Swamp', cordellPlains, gasMask); // TODO - hole?
const oak = location('Oak', swamp);
const stomHouse = location('Stom\'s House'. cordellPlains);
const telepathy = magic('Telepathy', oak, stomHouse);
const oakMother = talk('Oak Mother', telepathy); // TODO - break out oakChild, oakMotherAfter ?
const insectFlute = item('Insect Flute', oakMother);
const oakElder = talk('Oak Elder', telepathy); // TODO - also deps on oak, if no telepathy trigger?
const swordOfFire = item('Sword of Fire', oakElder);
const giantInsect = boss('Giant Insect', notWind, insectFlute);
const giantInsectChest = chest('Giant Insect Chest', giantInsect);
const ballOfFire = item('Ball of Fire', giantInsectChest);
const fireLevel2 = trigger('Fire Level 2', swordOfFire, ballOfFire);
const mtSabreWest1 = location('Mt Sabre West 1',
                              route('via Cordell', cordellPlains),
                              route('via Zebu', zebuCave, fireLevel2));
const mtSabreWest2 = location('Mt Sabre West 2', mtSabreWest1, fireLevel2);
const mtSabreWest3 = location('Mt Sabre West 3', mtSabreWest1, fireLevel2, hopOrFly);
const mtSabreWestChest1 = chest('Mt Sabre West Chest 1 (Tornado Bracelet)', mtSabreWest3);
const tornadoBracelet = item('Tornado Bracelet', mtSabreWestChest1);
const mtSabreWestChest2 = chest('Mt Sabre West Chest 2 (Warp Boots)', mtSabreWest2);
const mtSabreWestChest3 = chest('Mt Sabre West Chest 3 (Medical Herb)', mtSabreWest2);
const mtSabreWestChest4 = chest('Mt Sabre West Chest 3 (Magic Ring)', mtSabreWest2);
const tornel = talk('Tornel (Mt Sabre)', mtSabreWest2, tornadoBracelet);
const teleport = magic('Teleport', tornel);
const leafSorrow = trigger('Leaf Sorrow', mtSabreWest1);
const leafRabbit = talk('Leaf Rabbit', leaf, leafSorrow);
const mtSabreNorth1 = location('Mt Sabre North 1',
                               // TODO - rabbit trigger skippable
                               route('forward', cordellPlains, leafRabbit, teleport),
                               route('reverse', () => mtSabreBossKilled));
const nadares = location('Nadare\'s', mtSabreNorth1);
const mtSabreNorth2 = location('Mt Sabre North 2', mtSabreNorth1, fireLevel2);
const mtSabreNorthChest1 = chest('Mt Sabre North Chest 1 (Antidote)', mtSabreNorth2);
const mtSabreNorthChest2 = chest('Mt Sabre North Chest 2 (Medical Herb)', mtSabreNorth2);
const mtSabreNorthChest3 = chest('Mt Sabre North Chest 3 (Key to Prison)', mtSabreNorth2);
const prisonKey = item('Key to Prison', mtSabreNorthChest3);
const mtSabreBoss = location('Mt Sabre Boss',
                             route('forward', mtSabreNorth2),
                             route('reverse', () => mtSabreSummitCave, fireLevel2));
const kelbesque1 = boss('Kelbesque 1', mtSabreBoss);
const kelbesque1Chest = chest('Kelbesque 1 Chest (Flame Bracelet)', kelbesque1);
const mtSabreBossKilled = trigger('Mt Sabre Boss Killed', kelbesque1, swordOfWind, tornadoMagic);
const flameBracelet = item('Flame Bracelet', kelbesque1Chest);
const mtSabreSummitCave = location('Mt Sabre Summit Cave',
                                   route('forward', mtSabreBossKilled, prisonKey, fireLevel2),
                                   route('reverse', () => waterfallValley, () => flight));
const paralysis = magic('Paralysis', mtSabreSummitCave);
const waterfallValley = location('Waterfall Valley',
                                 route('via Mt Sabre', mtSabreSummitCave),
                                 route('via Portoa', () => portoa));
const portoa = location('Portoa',
                        route('via Waterfall Valley', waterfallValley),
                        // TODO - confirm can dock at fog lamp house
                        route('via Angry Sea', () => angrySea, swimOrFly));


const todo = node('To Do');
const flight = magic('Flight', todo);
const angrySea = location('Angry Sea', todo);
const joel = location('Joel', todo);
const swordOfWater = item('Sword of Water', todo);
const swordOfThunder = item('Sword of Thunder', todo);
const blizzardBracelet = item('Blizzard Bracelet', todo);
const stormBracelet = item('Storm Bracelet', todo);


// const freezeOrFly = trigger('Freeze or Fly',
//                             route('freeze', swordOfWater, ballOfWater),
//                             route('fly', () => flight));
// const swimOrFly = trigger('Swim or Fly',
//                           route('swim', dolphin),
//                           route('fly', () => flight));


console.log(g.toDot());
