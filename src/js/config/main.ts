import * as yaml from 'js-yaml';
import {Conf, Config} from './conf';
import {compress} from '../compress';

const c = Conf.fromJson({
  placement: {
    checkBeta: 0.5, itemBeta: 0.1,
    bury: {medicalherb: 3, flight: 7, sword_of_thunder: 3, gas_mask: 4, telepathy: 6, teleport: 4},
    initial_inventory: ['sword of wind', 'sword of water'],
    'early sword': true,
    force: {'mezame shrine rightchest': 'medical herb',
            'styx left north mimic': 'ball of water',
            'fog lamp cave back chest': 'shell flute',
            'behind whirlpool': 'power ring',
           },
  },
  items: {'charge speed': 3, add_aquatic__herb: true},
});

console.log(yaml.dump(c.toJson()));
void (yaml.dump(c.merge(true).toJson()));
//console.log(await compress(Config.encode(c.merge(true).configs[0]).finish()));
console.log(Config.encode(c.configs[0]).finish().length);
console.log((await compress(Config.encode(c.configs[0]).finish())).byteLength);
// console.log(yaml.dump(new Conf([Config.decode(Uint8Array.from(atob('W29iamVjdCBPYmplY3Rd'), s => s.charCodeAt(0)))]).toJson()));
