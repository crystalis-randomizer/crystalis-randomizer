#!/usr/bin/env -S node --enable-source-maps

// Test encoding...

import { Config } from '../../../target/build/config_proto';
import { deserialize, serialize } from './binary';

const config = Config.create();
config.items = Config.Items.create();
config.items.addAquaticHerb = true;
config.items.hazmatSuit = true;
config.items.speedBoots = true;
config.items.chargeShotsOnly = true;
config.items.chargeWhileWalking = true;
config.items.nerfFlightStab = false;
config.items.medicalHerbHeal = 2;

console.log(Config.encode(config).finish());

console.log(serialize(config));
console.log(deserialize(Config.create(), serialize(config)));
