import {Graph2} from './graph.js';

// Randomization plan:
//   - remove all ->item edges
//   - follow edges, annotating item blockers
//   - pick a random ->item edge and a random item blocker
//   - repeat

export const graph = new Graph2();


const node = (text, ...deps) => g.add({text}, deps);
const boss = (text, ...deps) => g.add({text, type: 'Boss'}, deps);
const item = (text, ...deps) => g.add({text, type: 'Item'}, deps);
const talk = (text, ...deps) => g.add({text, type: 'Talk'}, deps);
const magic = (text, ...deps) => g.add({text, type: 'Magic'}, deps);
const chest = (text, ...deps) => g.add({text, type: 'Chest'}, deps);
const route = (text, ...deps) => g.add({text, type: 'Route'}, deps);
const trigger = (text, ...deps) => g.add({text, type: 'Trigger'}, deps);
const location = (text, ...deps) => g.add({text, type: 'Location'}, deps);


////////////////////////////////////////////////////////////////
// Items
////////////////////////////////////////////////////////////////
const swordOfWind           = item(0x00, 'Sword of Wind');
const swordOfFire           = item(0x01, 'Sword of Fire');
const swordOfWater          = item(0x02, 'Sword of Water');
const swordOfThunder        = item(0x03, 'Sword of Thunder');
const crystalis             = item(0x04, 'Crystalis');
const ballOfWind            = item(0x05, 'Ball of Wind');
const tornadoBracelet       = item(0x06, 'Tornado Bracelet');
const ballOfFire            = item(0x07, 'Ball of Fire');
const flameBracelet         = item(0x08, 'Flame Bracelet');
// ... TODO ...
const medicalHerb           = item(0x1d, 'Medical Herb');
const antidote              = item(0x1e, 'Antidote');
const lysisPlant            = item(0x1f, 'Lysis Plant');
const fruitOfLime           = item(0x20, 'Fruit of Lime');
const fruitOfPower          = item(0x21, 'Fruit of Power');
const magicRing             = item(0x22, 'Magic Ring');
const fruitOfRepun          = item(0x23, 'Fruit of Repun');
const warpBoots             = item(0x24, 'Warp Boots');
const statueOfOnyx          = item(0x25, 'Statue of Onyx');
const opelStatue            = item(0x26, 'Opel Statue');
const insectFlute           = item(0x27, 'Insect Flute');
const fluteOfLime           = item(0x28, 'Flute of Lime');
// ... TODO ...
const refresh               = magic(0x41, 'Refresh');
const paralysis             = magic(0x42, 'Paralysis');
const telepathy             = magic(0x43, 'Telepathy');
const teleport              = magic(0x44, 'Teleport');
const recover               = magic(0x45, 'Recover');
const barrier               = magic(0x46, 'Barrier');
const change                = magic(0x47, 'Change');
const flight                = magic(0x48, 'Flight');
const medicalHerb$50        = medicalHerb .at(0x50);
const sacredShield$51       = sacredShield.at(0x51);
const medicalHerb$52        = medicalHerb .at(0x52);
const medicalHerb$53        = medicalHerb .at(0x53);
const magicRing$54          = magicRing   .at(0x54);
const medicalHerb$55        = medicalHerb .at(0x55);
const medicalHerb$56        = medicalHerb .at(0x56);
const medicalHerb$57        = medicalHerb .at(0x57);
const magicRing$58          = magicRing   .at(0x58);
const medicalHerb$59        = medicalHerb .at(0x59);
const fruitOfPower$5a       = fruitOfPower.at(0x5a);
const fluteOfLime$5b        = fluteOfLime .at(0x5b);
const lysisPlant$5c         = lysisPlant  .at(0x5c);
const lysisPlant$5d         = lysisPlant  .at(0x5d);
const antidote$5e           = antidote    .at(0x5e);
const antidote$5f           = antidote    .at(0x5f);
const antidote$60           = antidote    .at(0x60);
const fruitOfPower$61       = fruitOfPower.at(0x61);
const fruitOfPower$62       = fruitOfPower.at(0x62);
const opelStatue$63         = opelStatue  .at(0x63);
const fruitOfPower$64       = fruitOfPower.at(0x64);
const magicRing$65          = magicRing   .at(0x65);
const fruitOfRepun$66       = fruitOfRepun.at(0x66);
const magicRing$67          = magicRing   .at(0x67);
const magicRing$68          = magicRing   .at(0x68);
const magicRing$69          = magicRing   .at(0x69);
const warpBoots$6a          = warpBoots   .at(0x6a);
const magicRing$6b          = magicRing   .at(0x6b);
const magicRing$6c          = magicRing   .at(0x6c);
const opelStatue$6d         = opelStatue  .at(0x6d);
const warpBoots$6e          = warpBoots   .at(0x6e);
const magicRing$6f          = magicRing   .at(0x6f);
const medicalHerb$70        = medicalHerb .at(0x70); // Mimic???


////////////////////////////////////////////////////////////////
// Triggers
////////////////////////////////////////////////////////////////
const talkedToLeafElder     = trigger('Talked to Leaf Elder', at(leafElderHouse),
                                      get(swordOfWind));
const talkedToLeafStudent   = trigger('Talked to Leaf Student', at(leafStudentHouse));
const talkedToZebuInCave    = trigger('Talked to Zebu in cave', at(zebuCave),
                                      requires(talkedToLeafElder, talkedToLeafStudent));
const wokeUpWindmillGuard   = trigger('Woke up Windmill Guard', at(windmillCave),
                                      requires(talkedToZebuInCave, alarmFlute));
const startedWindmill       = trigger('Started Windmill', at(windmill),
                                      requires(windmillKey));
const learnRefreshInValley  = trigger('Learn Refresh in valley', requires(startedWindmill),
                                      get(refresh));
const learnRefreshInCave    = trigger('Learn Refresh in cave',
                                      requires(startedWindmill, talkedToZebuInCave),
                                      get(refresh));

////////////////////////////////////////////////////////////////
// Conditions
////////////////////////////////////////////////////////////////
const destroyStone          = condition('Destroy stone', and(swordOfWind, ballOfWind));
const destroyIce            = condition('Destroy ice', and(swordOfFire, ballOfFire));
const crossRivers           = condition('Cross rivers', or(and(swordOfWater, ballOfWater), flight));
const destroyIron           = condition('Destroy iron', and(swordOfThunder, ballOfThunder));
const anySword              = condition('Any sword',
                                        or(swordOfWind, swordOfFire, swordOfWater, swordOfThunder));
const fireOrWaterOrThunder  = condition('Fire/Water/Thunder',
                                        or(swordOfFire, swordOfWater, swordOfThunder));
const climbSlopes           = condition('Climb slopes', or(rabbitBoots, flight));
const crossSea              = condition('Cross sea', or(dolphin, flight));
// ghetto flight?  talk glitch?  triggers (calmed sea or ghetto flight)?  require magic for boss?


////////////////////////////////////////////////////////////////
// Locations
////////////////////////////////////////////////////////////////
const mezameShrine          = location(0x00, 'Mezame Shrine');
const leafOutsideStart      = location(0x01, 'Leaf - Outside Start',
                                       connect(mezameShrine));
const leaf                  = location(0x02, 'Leaf',
                                       connect(leafOutsideStart));
const valleyOfWind          = location(0x03, 'Valley of Wind',
                                       connect(leaf),
                                       triggers(learnRefresh));
const valleyOfWind_windmill = location(0x03, 'Valley of Wind - Windmill');
const sealedCave1           = location(0x04, 'Sealed Cave 1',
                                       from(valleyOfWind, startedWindmill),
                                       to(valleyOfWind)); // different requirements!
const sealedCave2           = location(0x05, 'Sealed Cave 2',
                                       connect(sealedCave1));
const sealedCave3           = location(0x06, 'Sealed Cave 3',
                                       chest(medicalHerb));
const sealedCave4a          = location(0x07, 'Sealed Cave 4a',
                                       chest(medicalHerb$50));
const sealedCave4b          = location(0x07, 'Sealed Cave 4b',
                                       connect(sealedCave4a, destroyStone),
                                       chest(antidote));
const sealedCave5           = location(0x08, 'Sealed Cave 5',
                                       chest(warpBoots));
const sealedCave6a          = location(0x09, 'Sealed Cave 6a',
                                       connect(sealedCave2),
                                       connect(sealedCave4a),
                                       connect(sealedCave5));
const sealedCave6b          = location(0x09, 'Sealed Cave 6b',
                                       connect(sealedCave6a, destroyStone),
                                       connect(sealedCave3));
const sealedCave7           = location(0x0a, 'Sealed Cave 7',
                                       boss(vampire1),
                                       connect(sealedCave6b));
const sealedCave8           = location(0x0c, 'Sealed Cave 8',
                                       connect(sealedCave7));
const windmillCave          = location(0x0e, 'Windmill Cave',
                                       connect(valleyOfWind);
                                       connect(valleyOfWind_windmill));
const windmill              = location(0x0f, 'Windmill',
                                       connect(valleyOfWind_windmill),
                                       triggers(atartedWindmill));
// $10	Zebu Cave
// $11	Mt Sabre West - Cave 1
// $14	Cordel Plains West
// $15	Cordel Plains East
// $18	Brynmaer
// $19	Outside Stom House
// $1a	Swamp
// $1b	Amazones
// $1c	Oak
// $1e	Stom House
// $20	Mt Sabre West - Lower
// $21	Mt Sabre West - Upper
// $22	Mt Sabre West - Cave 2
// $23	Mt Sabre West - Cave 3
// $24	Mt Sabre West - Cave 4
// $25	Mt Sabre West - Cave 5
// $26	Mt Sabre West - Cave 6
// $27	Mt Sabre West - Cave 7
// $28	Mt Sabre North - Main
// $29	Mt Sabre North - Middle
// $2a	Mt Sabre North - Cave 1
// $2b	Mt Sabre North - Cave 2
// $2c	Mt Sabre North - Cave 3
// $2d	Mt Sabre North - Cave 4
// $2e	Mt Sabre North - Cave 5
// $2f	Mt Sabre North - Cave 6
// $30	Mt Sabre North - Left Cell
// $31	Mt Sabre North - Prison Key Hall
// $32	Mt Sabre North - Right Cell
// $33	Mt Sabre North - Cave 7
// $34	Mt Sabre North - Cave 8
// $35	Mt Sabre North - Summit Cave
// $38	Mt Sabre North - Entrance Cave
// $39	Mt Sabre North - Cave 5a
// $3c	Nadare - Inn
// $3d	Nadare - Tool Shop
// $3e	Nadare - Back Room
// $40	Waterfall Valley North
// $41	Waterfall Valley South
// $42	Lime Tree Valley
// $43	Lime Tree Lake
// $44	Kirisa Plant Cave 1
// $45	Kirisa Plant Cave 2
// $46	Kirisa Plant Cave 3
// $47	Kirisa Meadow
// $48	Fog Lamp Cave 1
// $49	Fog Lamp Cave 2
// $4a	Fog Lamp Cave 3
// $4b	Fog Lamp Cave Dead End
// $4c	Fog Lamp Cave 4
// $4d	Fog Lamp Cave 5
// $4e	Fog Lamp Cave 6
// $4f	Fog Lamp Cave 7
// $50	Portoa
// $51	Portoa - Fisherman Island
// $52	Mesia Shrine
// $54	Waterfall Cave 1
// $55	Waterfall Cave 2
// $56	Waterfall Cave 3
// $57	Waterfall Cave 4
// $58	Tower - Entrance
// $59	Tower 1
// $5a	Tower 2
// $5b	Tower 3
// $5c	Tower - Outside Mesia
// $5d	Tower - Outside Dyna
// $5e	Tower - Mesia
// $5f	Tower - Dyna
// $60	Angry Sea
// $61	Boat House
// $62	Joel - Lighthouse
// $64	Underground Channel
// $65	Zombie Town
// $68	Evil Spirit Island 1
// $69	Evil Spirit Island 2
// $6a	Evil Spirit Island 3
// $6b	Evil Spirit Island 4
// $6c	Sabera Palace 1
// $6d	Sabera Palace 2
// $6e	Sabera Palace 3
// $70	Joel - Secret Passage
// $71	Joel
// $72	Swan
// $73	Swan - Gate
// $78	Goa Valley
// $7c	Mt Hydra
// $7d	Mt Hydra - Cave 1
// $7e	Mt Hydra - Outside Shyron
// $7f	Mt Hydra - Cave 2
// $80	Mt Hydra - Cave 3
// $81	Mt Hydra - Cave 4
// $82	Mt Hydra - Cave 5
// $83	Mt Hydra - Cave 6
// $84	Mt Hydra - Cave 7
// $85	Mt Hydra - Cave 8
// $86	Mt Hydra - Cave 9
// $87	Mt Hydra - Cave 10
// $88	Styx 1
// $89	Styx 2
// $8a	Styx 3
// $8c	Shyron
// $8e	Goa
// $8f	Goa Fortress - Oasis Entrance
// $90	Desert 1
// $91	Oasis Cave - Main
// $92	Desert Cave 1
// $93	Sahara
// $94	Sahara - Outside Cave
// $95	Desert Cave 2
// $96	Sahara Meadow
// $98	Desert 2
// $9c	Pyramid Front - Entrance
// $9d	Pyramid Front - Branch
// $9e	Pyramid Front - Main
// $9f	Pyramid Front - Draygon
// $a0	Pyramid Back - Entrance
// $a1	Pyramid Back - Hall 1
// $a2	Pyramid Back - Branch
// $a3	Pyramid Back - Dead End Left
// $a4	Pyramid Back - Dead End Right
// $a5	Pyramid Back - Hall 2
// $a6	Pyramid Back - Draygon Revisited
// $a7	Pyramid Back - Teleporter
// $a8	Goa Fortress - Entrance
// $a9	Goa Fortress - Kelbesque
// $aa	Goa Fortress - Zebu
// $ab	Goa Fortress - Sabera
// $ac	Goa Fortress - Tornel
// $ad	Goa Fortress - Mado 1
// $ae	Goa Fortress - Mado 2
// $af	Goa Fortress - Mado 3
// $b0	Goa Fortress - Karmine 1
// $b1	Goa Fortress - Karmine 2
// $b2	Goa Fortress - Karmine 3
// $b3	Goa Fortress - Karmine 4
// $b4	Goa Fortress - Karmine 5
// $b5	Goa Fortress - Karmine 6
// $b6	Goa Fortress - Karmine 7
// $b7	Goa Fortress - Exit
// $b8	Oasis Cave - Entrance
// $b9	Goa Fortress - Asina
// $ba	Goa Fortress - Kensu
// $bb	Goa - House
// $bc	Goa - Inn
// $be	Goa - Tool Shop
// $bf	Goa - Tavern
const leafElderHouse        = location(0xc0, 'Leaf - Elder House',
                                       connect(leaf));
const leafRabbitHut         = location(0xc1, 'Leaf - Rabbit Hut',
                                       connect(leaf));
const leafInn               = location(0xc2, 'Leaf - Inn',
                                       connect(leaf));
const leafToolShop          = location(0xc3, 'Leaf - Tool Shop',
                                       connect(leaf));
const leafItemShop          = location(0xc4, 'Leaf - Item Shop',
                                       connect(leaf));
const leafStudentHouse      = location(0xc5, 'Leaf - Student House',
                                       connect(leaf));
// $c6	Brynmaer - Tavern
// $c7	Brynmaer - Pawn Shop
// $c8	Brynmaer - Inn
// $c9	Brynmaer - Armor Shop
// $cb	Brynmaer - Item Shop
// $cd	Oak - Elder House
// $ce	Oak - Mother House
// $cf	Oak - Tool Shop
// $d0	Oak - Inn
// $d1	Amazones - Inn
// $d2	Amazones - Item Shop
// $d3	Amazones - Armor Shop
// $d4	Amazones - Elder
// $d5	Nadare
// $d6	Portoa - Fisherman House
// $d7	Portoa - Palace Entrance
// $d8	Portoa - Fortune Teller
// $d9	Portoa - Pawn Shop
// $da	Portoa - Armor Shop
// $dc	Portoa - Inn
// $dd	Portoa - Tool Shop
// $de	Portoa - Palace Left
// $df	Portoa - Palace Throne Room
// $e0	Portoa - Palace Right
// $e1	Portoa - Asina Room
// $e2	Amazones - Elder Downstairs
// $e3	Joel - Elder House
// $e4	Joel - Shed
// $e5	Joel - Tool Shop
// $e7	Joel - Inn
// $e8	Zombie Town - House
// $e9	Zombie Town - House Basement
// $eb	Swan - Tool Shop
// $ec	Swan - Stom Hut
// $ed	Swan - Inn
// $ee	Swan - Armor Shop
// $ef	Swan - Tavern
// $f0	Swan - Pawn Shop
// $f1	Swan - Dance Hall
// $f2	Shyron - Fortress
// $f3	Shyron - Training Hall
// $f4	Shyron - Hospital
// $f5	Shyron - Armor Shop
// $f6	Shyron - Tool Shop
// $f7	Shyron - Inn
// $f8	Sahara - Inn
// $f9	Sahara - Tool Shop
// $fa	Sahara - Elder House
// $fb	Sahara - Pawn Shop


////////////////////////////////////////////////////////////////
// Triggers
////////////////////////////////////////////////////////////////

const talkToStudent = trigger("Talk to student", leafStudentHouse,
                              



