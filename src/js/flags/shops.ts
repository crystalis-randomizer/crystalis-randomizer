import {FlagSection} from './flag.js';

export const SHOP_FLAGS: FlagSection = {
  section: 'Shops',
  prefix: 'P',  
  text: `Prices are always normalized by scaling level: prices at tool shops
           and inns double every 10 scaling levels, while prices at armor shops
           halve every 12 scaling levels `,

  flags: [{
    flag: 'Ps',
    name: 'Shuffle shop contents',
    text: `This includes normalizing prices via the scaling level, as well as a
             random variance for each shop: base prices may vary ±50% for the same
             item at different; inn prices may vary ±62.5%.`,
  }],
};
