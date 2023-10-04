// Test encoding...

import { Config } from '../../../target/build/config_proto';
import { deserialize, serialize } from './binary';

const config = Config.create();
config.items = Config.Items.create();
config.items.addAquaticHerb = true;
config.items.hazmatSuit = true;
config.items.medicalHerbHeal = 2;

console.log(serialize(config));
