import { ObjectData } from './objectdata.js';
import { Monster } from './monster.js';
export class ObjectsClass extends Array {
    constructor(rom) {
        super(0x100);
        this.rom = rom;
        const monsters = new Map();
        const all = ALL_MONSTERS;
        for (const key in all) {
            const data = all[key];
            monsters.set(data[1], [key, data]);
        }
        for (let id = 0; id < 0x100; id++) {
            if (monsters.has(id)) {
                const [key, args] = monsters.get(id);
                this[id] = this[key] = new Monster(this.rom, args);
            }
            else {
                this[id] = new ObjectData(this.rom, id);
            }
        }
    }
    static get [Symbol.species]() { return Array; }
}
export const Objects = ObjectsClass;
const BIRD = { monsterClass: 'BIRD' };
const BRAIN = { monsterClass: 'BRAIN' };
const ENTITY = { monsterClass: 'ENTITY' };
const EYE = { monsterClass: 'EYE' };
const GOLEM = { monsterClass: 'GOLEM' };
const JELLY = { monsterClass: 'JELLY' };
const MOSQUITO = { monsterClass: 'MOSQUITO' };
const MUSHROOM = { monsterClass: 'MUSHROOM' };
const PUDDLE = { monsterClass: 'PUDDLE' };
const SLIME = { monsterClass: 'SLIME' };
const SOLDIER = { monsterClass: 'SOLDIER' };
const SPIDER = { monsterClass: 'SPIDER' };
const WRAITH = { monsterClass: 'WRAITH' };
const WYVERN = { monsterClass: 'WYVERN' };
const ZOMBIE = { monsterClass: 'ZOMBIE' };
export const MONSTERS = {
    wraith1: ['Wraith 1', 0x4b, 28, WRAITH],
    wraith2: ['Wraith 2', 0x4f, 28, WRAITH],
    blueSlime: ['Blue Slime', 0x50, 1, SLIME],
    weretiger: ['Weretiger', 0x51, 1],
    greenJelly: ['Green Jelly', 0x52, 4, JELLY],
    redSlime: ['Red Slime', 0x53, 4, SLIME],
    rockGolem: ['Rock Golem', 0x54, 4, GOLEM],
    blueBat: ['Blue Bat', 0x55, 4],
    greenWyvern: ['Green Wyvern', 0x56, 4, WYVERN],
    orc: ['Orc', 0x58, 6],
    redMosquito: ['Red Mosquito', 0x59, 10, MOSQUITO],
    blueMushroom: ['Blue Mushroom', 0x5a, 10, MUSHROOM],
    swampTomato: ['Swamp Tomato', 0x5b, 10],
    blueMosquito: ['Blue Mosquito', 0x5c, 23, MOSQUITO],
    swampPlant: ['Swamp Plant', 0x5d, 10],
    largeBlueSlime: ['Large Blue Slime', 0x5f, 11, SLIME],
    iceZombie: ['Ice Zombie', 0x60, 12, ZOMBIE],
    greenBrain: ['Green Brain', 0x61, 12, BRAIN],
    greenSpider: ['Green Spider', 0x62, 12, SPIDER],
    redWyvern: ['Red Wyvern', 0x63, 12, WYVERN],
    soldier: ['Soldier', 0x64, 14, SOLDIER],
    iceEntity: ['Ice Entity', 0x65, 14, ENTITY],
    redBrain: ['Red Brain', 0x66, 14, BRAIN],
    iceGolem: ['Ice Golem', 0x67, 14, GOLEM],
    largeRedSlime: ['Large Red Slime', 0x69, 18, SLIME],
    troll: ['Troll', 0x6a, 18],
    redJelly: ['Red Jelly', 0x6b, 18, JELLY],
    medusa: ['Medusa', 0x6c, 19],
    crab: ['Crab', 0x6d, 19],
    medusaHead: ['Medusa Head', 0x6e, 20],
    bird: ['Bird', 0x6f, 20, BIRD],
    redMushroom: ['Red Mushroom', 0x71, 21, MUSHROOM],
    earthEntity: ['Earth Entity', 0x72, 22, ENTITY],
    mimic: ['Mimic', 0x73, 22],
    redSpider: ['Red Spider', 0x74, 22, SPIDER],
    fishman: ['Fishman', 0x75, 25],
    jellyfish: ['Jellyfish', 0x76, 25],
    kraken: ['Kraken', 0x77, 25],
    darkGreenWyvern: ['Dark Green Wyvern', 0x78, 27, WYVERN],
    sandZombie: ['Sand Zombie', 0x79, 38, ZOMBIE],
    wraithShadow1: ['Wraith Shadow 1', 0x7b, 28, WRAITH],
    moth: ['Moth', 0x7c, 28, { difficulty: 3 }],
    archer: ['Archer', 0x80, 33, SOLDIER],
    bomberBird: ['Bomber Bird', 0x81, 33, BIRD],
    lavaBlob: ['Lava Blob', 0x82, 37, PUDDLE],
    flailGuy: ['Flail Guy', 0x84, 37],
    blueEye: ['Blue Eye', 0x85, 37, EYE],
    salamander: ['Salamander', 0x86, 37],
    sorceror: ['Sorceror', 0x87, 37],
    mado1: ['Mado 1', 0x88, 37],
    knight: ['Knight', 0x89, 41, { difficulty: 1 }],
    devil: ['Devil', 0x8a, 41],
    wraitShadow2: ['Wraith Shadow 2', 0x8c, 41, WRAITH],
    tarantula: ['Tarantula', 0x91, 41],
    skeleton: ['Skeleton', 0x92, 41],
    purpleEye: ['Purple Eye', 0x94, 41, EYE],
    flailKnight: ['Flail Knight', 0x95, 41],
    scorpion: ['Scorpion', 0x96, 41],
    sandBlob: ['Sand Blob', 0x98, 44, PUDDLE],
    mummy: ['Mummy', 0x99, 44],
    warlock: ['Warlock', 0x9a, 46],
    brownRobot: ['Brown Robot', 0xa0, 47, { difficulty: 1 }],
    whiteRobot: ['White Robot', 0xa1, 47],
    towerSentinel: ['Tower Sentinel', 0xa2, 47],
    helicopter: ['Helicopter', 0xa3, 47],
};
const OBJECTS = {
    verticalPlatform: ['Vertical Platform', 0x7e, 28],
    horizotalPlatform: ['Horizontal Platform', 0x7f, 28],
    glitch1: ['Glitch', 0x8d, 41],
    glitch2: ['Glitch', 0x8e, 41],
    guardianStatue: ['Guardian Statue', 0x8f, 41],
    statueOfSun: ['Statue of Sun', 0x9c, 47],
    statueOfMoon: ['Statue of Moon', 0x9d, 47],
    crumblingVerticalPlatform: ['Crumbling Vertical Platform', 0x9f, 47],
    glitch3: ['Glitch', 0xa6, 41],
};
const BOSSES = {
    vampire1: ['Vampire 1', 0x57, 5],
    giantInsect: ['Giant Insect', 0x5e, 11],
    kelbesque1: ['Kelbesque 1', 0x68, 15],
    sabera1: ['Sabera 1', 0x7d, 29],
    kelbesque2: ['Kelbesque 2', 0x8b, 41],
    sabera2: ['Sabera 2', 0x90, 41],
    mado2: ['Mado 2', 0x93, 41],
    karmine: ['Karmine', 0x97, 41],
    draygon1: ['Draygon 1', 0x9b, 45],
    draygon2: ['Draygon 2', 0x9e, 47],
    dyna: ['Dyna', 0xa4, 47],
    vampire2: ['Vampire 2', 0xa5, 28],
    dynaPod: ['Dyna Pod', 0xb4, 47],
};
const PROJECTILES = {
    sorcerorShot: ['Sorceror Shot', 0x3f, 37],
    paralysisPowderSource: ['Paralysis Powder Source', 0x4d, 23],
    dynaCounter: ['Dyna Counter', 0xb8, 47],
    dynaLaser: ['Dyna Laser', 0xb9, 47],
    dynaBubble: ['Dyna Bubble', 0xba, 47],
    vampire2Bat: ['Vampire 2 Bat', 0xbc, 28],
    brownRobotLaserSource: ['Brown Robot Laser Source', 0xbe, 47],
    draygon2Fireball: ['Draygon 2 Fireball', 0xbf, 47],
    vampire1Bat: ['Vampire 1 Bat', 0xc1, 5],
    giantInsectFireball: ['Giant Insect Fireball', 0xc3, 11],
    greenMosquito: ['Green Monsquito', 0xc4, 11],
    kelbesque1Rock: ['Kelbesque 1 Rock', 0xc5, 15],
    sabera1Balls: ['Sabera 1 Balls', 0xc6, 29],
    kelbesque2Fire: ['Kelbesque 2 Fire', 0xc7, 41],
    sabera2Fire: ['Sabera 2 Fire', 0xc8, 41],
    sabera2Balls: ['Sabera 2 Balls', 0xc9, 41],
    karmineBalls: ['Karmine Balls', 0xca, 41],
    statueBalls: ['Statue Balls', 0xcb, 47],
    draygon1Lightning: ['Draygon 1 Lightning', 0xcc, 45],
    draygon2Laser: ['Draygon 2 Laser', 0xcd, 47],
    draygon2Breath: ['Draygon 2 Breath', 0xce, 47],
    birdBomb: ['Bird Bomb', 0xe0, 33],
    greenMosquitoShot: ['Green Mosquito Shot', 0xe2, 11],
    paralysisBeam: ['Paralysis Beam', 0xe3, 25],
    stoneGaze: ['Stone Gaze', 0xe4, 19],
    rockGolemRock: ['Rock Golem Rock', 0xe5, 4],
    curseBeam: ['Curse Beam', 0xe6, 41],
    mpDrainWeb: ['MP Drain Web', 0xe7, 41],
    fishmanTrident: ['Fishman Triden', 0xe8, 25],
    orcAxe: ['Orc Axe', 0xe9, 6],
    swampPollen: ['Swamp Pollen', 0xea, 10],
    paralysisPowder: ['Paralysis Powder', 0xeb, 23],
    soldierSword: ['Soldier Sword', 0xec, 14],
    iceGolemRock: ['Ice Golem Rock', 0xed, 14],
    trollAxe: ['Troll Axe', 0xee, 18],
    krakenInk: ['Kraken Ink', 0xef, 25],
    archerArrow: ['Archer Arrow', 0xf0, 33],
    knightSword: ['Knight Sword', 0xf2, 41],
    mothResidue: ['Moth Residue', 0xf3, 28],
    brownRobotLaser: ['Brown Robot Laser', 0xf4, 47],
    whiteRobotLaser: ['White Robot Laser', 0xf5, 47],
    towerSentinelLaser: ['Tower Sentinel Laser', 0xf6, 47],
    skeletonShot: ['Skeleton Shot', 0xf7, 41],
    blobShot: ['Blob Shot', 0xf8, 37],
    flailKnightFlail: ['Flail Knight Flail', 0xf9, 41],
    flailGuyFlail: ['Flail Guy Flail', 0xfa, 37],
    madoShuriken: ['Mado Shuriken', 0xfc, 37],
    guardianStatueMissile: ['Guardian Statue Missile', 0xfd, 36],
    demonWallFire: ['Demon Wall Fire', 0xfe, 37],
};
const ALL_MONSTERS = { ...MONSTERS, ...OBJECTS, ...BOSSES, ...PROJECTILES };
const CHECK = ALL_MONSTERS;
const [] = [CHECK];
//# sourceMappingURL=objects.js.map