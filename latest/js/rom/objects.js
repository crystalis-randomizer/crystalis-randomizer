import { ObjectData } from './objectdata.js';
import { Monster } from './monster.js';
import { lowerCamelToSpaces } from './util.js';
import { EntityArray } from './entity.js';
export class Objects extends EntityArray {
    constructor(rom) {
        super(0x100);
        this.rom = rom;
        this.mesiaSabera = new ObjectData(this, 0x2a, "Mesia");
        this.sorcerorShot = new Monster(this, {
            id: 0x3f,
            scaling: 37,
            type: 'projectile',
        });
        this.wraith1 = new Monster(this, {
            id: 0x4b,
            scaling: 24,
            class: 'wraith',
            displayName: 'Wraith',
        });
        this.paralysisPowderSource = new Monster(this, {
            id: 0x4d,
            scaling: 23,
            type: 'projectile',
        });
        this.wraith2 = new Monster(this, {
            id: 0x4f,
            scaling: 28,
            class: 'wraith',
            displayName: 'Wraith',
        });
        this.blueSlime = new Monster(this, {
            id: 0x50,
            scaling: 1,
            class: 'slime',
            displayName: 'Slime',
        });
        this.weretiger = new Monster(this, {
            id: 0x51,
            scaling: 1,
            displayName: 'Weretiger',
        });
        this.greenJelly = new Monster(this, {
            id: 0x52,
            scaling: 4,
            class: 'jelly',
            displayName: 'Slug',
        });
        this.redSlime = new Monster(this, {
            id: 0x53,
            scaling: 4,
            class: 'slime',
            displayName: 'Poison Slime',
        });
        this.rockGolem = new Monster(this, {
            id: 0x54,
            scaling: 4,
            class: 'golem',
            displayName: 'Mud Golem',
        });
        this.blueBat = new Monster(this, {
            id: 0x55,
            scaling: 4,
            displayName: 'Bat',
        });
        this.greenWyvern = new Monster(this, {
            id: 0x56,
            scaling: 4,
            class: 'wyvern',
            displayName: 'Wyvern',
        });
        this.vampire1 = new Monster(this, {
            id: 0x57,
            scaling: 5,
            type: 'boss',
            displayName: 'Vampire',
        });
        this.orc = new Monster(this, {
            id: 0x58,
            scaling: 6,
            displayName: 'Axe Wereboar',
        });
        this.redMosquito = new Monster(this, {
            id: 0x59,
            scaling: 10,
            class: 'mosquito',
            displayName: 'Mosquito',
        });
        this.blueMushroom = new Monster(this, {
            id: 0x5a,
            scaling: 10,
            class: 'mushroom',
            displayName: 'Mushroom',
        });
        this.swampTomato = new Monster(this, {
            id: 0x5b,
            scaling: 10.,
            displayName: 'Pillbug',
        });
        this.blueMosquito = new Monster(this, {
            id: 0x5c,
            scaling: 23,
            class: 'mosquito',
            displayName: 'Mosquito',
        });
        this.swampPlant = new Monster(this, {
            id: 0x5d,
            scaling: 10,
            displayName: 'Swamp Dandelion',
        });
        this.giantInsect = new Monster(this, {
            id: 0x5e,
            scaling: 11,
            type: 'boss',
            displayName: 'Giant Insect',
        });
        this.largeBlueSlime = new Monster(this, {
            id: 0x5f,
            scaling: 11,
            class: 'slime',
            displayName: 'Large Slime',
        });
        this.iceZombie = new Monster(this, {
            id: 0x60,
            scaling: 12,
            class: 'zombie',
            displayName: 'Ice Zombie',
        });
        this.greenBrain = new Monster(this, {
            id: 0x61,
            scaling: 12,
            class: 'brain',
            displayName: 'Brain',
        });
        this.greenSpider = new Monster(this, {
            id: 0x62,
            scaling: 12,
            class: 'spider',
            displayName: 'Spider',
        });
        this.redWyvern = new Monster(this, {
            id: 0x63,
            scaling: 12,
            class: 'wyvern',
            displayName: 'Wyvern',
        });
        this.soldier = new Monster(this, {
            id: 0x64,
            scaling: 14,
            class: 'soldier',
            displayName: 'Draygonia Soldier',
        });
        this.iceEntity = new Monster(this, {
            id: 0x65,
            scaling: 14,
            class: 'entity',
            displayName: 'Ice Plant',
        });
        this.redBrain = new Monster(this, {
            id: 0x66,
            scaling: 14,
            class: 'brain',
            displayName: 'Poison Brain',
        });
        this.iceGolem = new Monster(this, {
            id: 0x67,
            scaling: 14,
            class: 'golem',
            displayName: 'Ice Golem',
        });
        this.kelbesque1 = new Monster(this, {
            id: 0x68,
            scaling: 15,
            type: 'boss',
            displayName: 'General Kelbesque',
        });
        this.largeRedSlime = new Monster(this, {
            id: 0x69,
            scaling: 18,
            class: 'slime',
            displayName: 'Large Poison Slime',
        });
        this.troll = new Monster(this, {
            id: 0x6a,
            scaling: 18,
            displayName: 'Troll',
        });
        this.redJelly = new Monster(this, {
            id: 0x6b,
            scaling: 18,
            class: 'jelly',
            displayName: 'Poison Jelly',
        });
        this.medusa = new Monster(this, {
            id: 0x6c,
            scaling: 19,
            displayName: 'Medusa',
        });
        this.crab = new Monster(this, {
            id: 0x6d,
            scaling: 19,
            displayName: 'Crab',
        });
        this.medusaHead = new Monster(this, {
            id: 0x6e,
            scaling: 20,
            displayName: 'Flying Plant',
        });
        this.bird = new Monster(this, {
            id: 0x6f,
            scaling: 20,
            class: 'bird',
            displayName: 'Bird',
        });
        this.redMushroom = new Monster(this, {
            id: 0x71,
            scaling: 21,
            class: 'mushroom',
            displayName: 'Poison Mushroom',
        });
        this.earthEntity = new Monster(this, {
            id: 0x72,
            scaling: 22,
            class: 'entity',
            displayName: 'Poison Plant',
        });
        this.mimic = new Monster(this, {
            id: 0x73,
            scaling: 22,
            displayName: 'Mimic',
        });
        this.redSpider = new Monster(this, {
            id: 0x74,
            scaling: 22,
            class: 'spider',
            displayName: 'Paralyzing Spider',
        });
        this.fishman = new Monster(this, {
            id: 0x75,
            scaling: 25,
            displayName: 'Mutant Fish',
        });
        this.jellyfish = new Monster(this, {
            id: 0x76,
            scaling: 25,
            displayName: 'Jellyfish',
        });
        this.kraken = new Monster(this, {
            id: 0x77,
            scaling: 25,
            displayName: 'Kraken',
        });
        this.darkGreenWyvern = new Monster(this, {
            id: 0x78,
            scaling: 27,
            class: 'wyvern',
            displayName: 'Wyvern Mage',
        });
        this.sandZombie = new Monster(this, {
            id: 0x79,
            scaling: 38,
            class: 'zombie',
            displayName: 'Sand Zombie',
        });
        this.wraithShadow1 = new Monster(this, {
            id: 0x7b,
            scaling: 28,
            class: 'wraith',
            displayName: 'Shadow',
        });
        this.moth = new Monster(this, {
            id: 0x7c,
            scaling: 28,
            difficulty: 3,
            displayName: 'Butterfly',
        });
        this.sabera1 = new Monster(this, {
            id: 0x7d,
            scaling: 29,
            type: 'boss',
            displayName: 'General Sabera',
        });
        this.verticalPlatform = new ObjectData(this, 0x7e);
        this.horizotalPlatform = new ObjectData(this, 0x7f);
        this.archer = new Monster(this, {
            id: 0x80,
            scaling: 33,
            class: 'soldier',
            displayName: 'Draygonia Archer',
        });
        this.bomberBird = new Monster(this, {
            id: 0x81,
            scaling: 33,
            class: 'bird',
            displayName: 'Bomber Bird',
        });
        this.lavaBlob = new Monster(this, {
            id: 0x82,
            scaling: 37,
            class: 'puddle',
            displayName: 'Lava Blob',
        });
        this.flailGuy = new Monster(this, {
            id: 0x84,
            scaling: 37,
            displayName: 'Flail Guy',
        });
        this.blueEye = new Monster(this, {
            id: 0x85,
            scaling: 37,
            class: 'eye',
            displayName: 'Beholder',
        });
        this.salamander = new Monster(this, {
            id: 0x86,
            scaling: 37,
            displayName: 'Salamander',
        });
        this.sorceror = new Monster(this, {
            id: 0x87,
            scaling: 37,
            displayName: 'Burt',
        });
        this.mado1 = new Monster(this, {
            id: 0x88,
            scaling: 37,
            displayName: 'General Mado',
        });
        this.knight = new Monster(this, {
            id: 0x89,
            scaling: 41,
            difficulty: 1,
            displayName: 'Ninja',
        });
        this.devil = new Monster(this, {
            id: 0x8a,
            scaling: 41,
            displayName: 'Devil Bat',
        });
        this.kelbesque2 = new Monster(this, {
            id: 0x8b,
            scaling: 41,
            type: 'boss',
            displayName: 'General Kelbesque',
        });
        this.wraithShadow2 = new Monster(this, {
            id: 0x8c,
            scaling: 41,
            class: 'wraith',
            displayName: 'Shadow',
        });
        this.glitch1 = new ObjectData(this, 0x8d);
        this.glitch2 = new ObjectData(this, 0x8e);
        this.guardianStatue = new ObjectData(this, 0x8f);
        this.sabera2 = new Monster(this, {
            id: 0x90,
            scaling: 41,
            type: 'boss',
            displayName: 'General Sabera',
        });
        this.tarantula = new Monster(this, {
            id: 0x91,
            scaling: 41,
            displayName: 'Tarantula',
        });
        this.skeleton = new Monster(this, {
            id: 0x92,
            scaling: 41,
            displayName: 'Skeleton',
        });
        this.mado2 = new Monster(this, {
            id: 0x93,
            scaling: 41,
            type: 'boss',
            displayName: 'General Mado',
        });
        this.purpleEye = new Monster(this, {
            id: 0x94,
            scaling: 41,
            class: 'eye',
            displayName: 'Beholder',
        });
        this.flailKnight = new Monster(this, {
            id: 0x95,
            scaling: 41,
            displayName: 'Flail Knight',
        });
        this.scorpion = new Monster(this, {
            id: 0x96,
            scaling: 41,
            displayName: 'Scorpion',
        });
        this.karmine = new Monster(this, {
            id: 0x97,
            scaling: 41,
            type: 'boss',
            displayName: 'General Karmine',
        });
        this.sandBlob = new Monster(this, {
            id: 0x98,
            scaling: 44,
            class: 'puddle',
            displayName: 'Sand Blob',
        });
        this.mummy = new Monster(this, {
            id: 0x99,
            scaling: 44,
            displayName: 'Mummy',
        });
        this.warlock = new Monster(this, {
            id: 0x9a,
            scaling: 46,
            displayName: 'Warlock',
        });
        this.draygon1 = new Monster(this, {
            id: 0x9b,
            scaling: 45,
            type: 'boss',
            displayName: 'Emperor Draygon',
        });
        this.statueOfSun = new ObjectData(this, 0x9c);
        this.statueOfMoon = new ObjectData(this, 0x9d);
        this.draygon2 = new Monster(this, {
            id: 0x9e,
            scaling: 47,
            type: 'boss',
            displayName: 'Emperor Draygon',
        });
        this.crumblingVerticalPlatform = new ObjectData(this, 0x9f);
        this.brownRobot = new Monster(this, {
            id: 0xa0,
            scaling: 47,
            difficulty: 1,
            displayName: 'Robot Sentry',
        });
        this.whiteRobot = new Monster(this, {
            id: 0xa1,
            scaling: 47,
            displayName: 'Robot Enforcer',
        });
        this.towerSentinel = new Monster(this, {
            id: 0xa2,
            scaling: 47,
            displayName: 'Tower Sentinel',
        });
        this.helicopter = new Monster(this, {
            id: 0xa3,
            scaling: 47,
            displayName: 'Robocopter',
        });
        this.dyna = new Monster(this, {
            id: 0xa4,
            scaling: 47,
            type: 'boss',
            displayName: 'DYNA',
        });
        this.vampire2 = new Monster(this, {
            id: 0xa5,
            scaling: 28,
            type: 'boss',
            displayName: 'Vampire',
        });
        this.glitch3 = new ObjectData(this, 0xa6);
        this.dynaPod = new Monster(this, {
            id: 0xb4,
            scaling: 47,
            type: 'boss',
            displayName: 'DYNA Defense Pod',
        });
        this.dynaCounter = new Monster(this, {
            id: 0xb8,
            scaling: 47,
            type: 'projectile',
        });
        this.dynaLaser = new Monster(this, {
            id: 0xb9,
            scaling: 47,
            type: 'projectile',
        });
        this.dynaBubble = new Monster(this, {
            id: 0xba,
            scaling: 47,
            type: 'projectile',
        });
        this.vampire2Bat = new Monster(this, {
            id: 0xbc,
            scaling: 28,
        });
        this.brownRobotLaserSource = new Monster(this, {
            id: 0xbe,
            scaling: 47,
            type: 'projectile',
        });
        this.draygon2Fireball = new Monster(this, {
            id: 0xbf,
            scaling: 47,
            type: 'projectile',
        });
        this.vampire1Bat = new Monster(this, {
            id: 0xc1,
            scaling: 5,
        });
        this.giantInsectFireball = new Monster(this, {
            id: 0xc3,
            scaling: 11,
            type: 'projectile',
        });
        this.greenMosquito = new Monster(this, {
            id: 0xc4,
            scaling: 11,
            displayName: 'Mosquito',
        });
        this.kelbesque1Rock = new Monster(this, {
            id: 0xc5,
            scaling: 15,
            type: 'projectile',
        });
        this.sabera1Balls = new Monster(this, {
            id: 0xc6,
            scaling: 29,
            type: 'projectile',
        });
        this.kelbesque2Fire = new Monster(this, {
            id: 0xc7,
            scaling: 41,
            type: 'projectile',
        });
        this.sabera2Fire = new Monster(this, {
            id: 0xc8,
            scaling: 41,
            type: 'projectile',
        });
        this.sabera2Balls = new Monster(this, {
            id: 0xc9,
            scaling: 41,
            type: 'projectile',
        });
        this.karmineBalls = new Monster(this, {
            id: 0xca,
            scaling: 41,
            type: 'projectile',
        });
        this.statueBalls = new Monster(this, {
            id: 0xcb,
            scaling: 47,
            type: 'projectile',
        });
        this.draygon1Lightning = new Monster(this, {
            id: 0xcc,
            scaling: 45,
            type: 'projectile',
        });
        this.draygon2Laser = new Monster(this, {
            id: 0xcd,
            scaling: 47,
            type: 'projectile',
        });
        this.draygon2Breath = new Monster(this, {
            id: 0xce,
            scaling: 47,
            type: 'projectile',
        });
        this.birdBomb = new Monster(this, {
            id: 0xe0,
            scaling: 33,
            type: 'projectile',
        });
        this.greenMosquitoShot = new Monster(this, {
            id: 0xe2,
            scaling: 11,
            type: 'projectile',
        });
        this.paralysisBeam = new Monster(this, {
            id: 0xe3,
            scaling: 25,
            type: 'projectile',
        });
        this.stoneGaze = new Monster(this, {
            id: 0xe4,
            scaling: 19,
            type: 'projectile',
        });
        this.rockGolemRock = new Monster(this, {
            id: 0xe5,
            scaling: 4,
            type: 'projectile',
        });
        this.curseBeam = new Monster(this, {
            id: 0xe6,
            scaling: 41,
            type: 'projectile',
        });
        this.mpDrainWeb = new Monster(this, {
            id: 0xe7,
            scaling: 41,
            type: 'projectile',
        });
        this.fishmanTrident = new Monster(this, {
            id: 0xe8,
            scaling: 25,
            type: 'projectile',
        });
        this.orcAxe = new Monster(this, {
            id: 0xe9,
            scaling: 6,
            type: 'projectile',
        });
        this.swampPollen = new Monster(this, {
            id: 0xea,
            scaling: 10,
            type: 'projectile',
        });
        this.paralysisPowder = new Monster(this, {
            id: 0xeb,
            scaling: 23,
            type: 'projectile',
        });
        this.soldierSword = new Monster(this, {
            id: 0xec,
            scaling: 14,
            type: 'projectile',
        });
        this.iceGolemRock = new Monster(this, {
            id: 0xed,
            scaling: 14,
            type: 'projectile',
        });
        this.trollAxe = new Monster(this, {
            id: 0xee,
            scaling: 18,
            type: 'projectile',
        });
        this.krakenInk = new Monster(this, {
            id: 0xef,
            scaling: 25,
            type: 'projectile',
        });
        this.archerArrow = new Monster(this, {
            id: 0xf0,
            scaling: 33,
            type: 'projectile',
        });
        this.knightSword = new Monster(this, {
            id: 0xf2,
            scaling: 41,
            type: 'projectile',
        });
        this.mothResidue = new Monster(this, {
            id: 0xf3,
            scaling: 28,
            type: 'projectile',
        });
        this.brownRobotLaser = new Monster(this, {
            id: 0xf4,
            scaling: 47,
            type: 'projectile',
        });
        this.whiteRobotLaser = new Monster(this, {
            id: 0xf5,
            scaling: 47,
            type: 'projectile',
        });
        this.towerSentinelLaser = new Monster(this, {
            id: 0xf6,
            scaling: 47,
            type: 'projectile',
        });
        this.skeletonShot = new Monster(this, {
            id: 0xf7,
            scaling: 41,
            type: 'projectile',
        });
        this.blobShot = new Monster(this, {
            id: 0xf8,
            scaling: 37,
            type: 'projectile',
        });
        this.flailKnightFlail = new Monster(this, {
            id: 0xf9,
            scaling: 41,
            type: 'projectile',
        });
        this.flailGuyFlail = new Monster(this, {
            id: 0xfa,
            scaling: 37,
            type: 'projectile',
        });
        this.madoShuriken = new Monster(this, {
            id: 0xfc,
            scaling: 37,
            type: 'projectile',
        });
        this.guardianStatueMissile = new Monster(this, {
            id: 0xfd,
            scaling: 36,
            type: 'projectile',
        });
        this.demonWallFire = new Monster(this, {
            id: 0xfe,
            scaling: 37,
            type: 'projectile',
        });
        for (const key in this) {
            const obj = this[key];
            if (!(obj instanceof ObjectData))
                continue;
            obj.name = lowerCamelToSpaces(key);
        }
        for (let i = 0; i < this.length; i++) {
            if (!this[i]) {
                this[i] = new ObjectData(this, i);
            }
        }
    }
    write() {
        const modules = [];
        for (const obj of this) {
            modules.push(...obj.write());
        }
        if (this.rom.writeMonsterNames) {
            const a = this.rom.assembler();
            const longestName = Math.max(...(this.map(o => o.displayName.length)));
            const MAX_LENGTH = 27;
            if (longestName > MAX_LENGTH) {
                throw new Error(`Longest displayName length is greater than ${MAX_LENGTH}. (${longestName} > ${MAX_LENGTH})\nCrystalis HUD can't comfortably fit that many characters.`);
            }
            a.assign('ENEMY_NAME_LENGTH', longestName);
            a.export('ENEMY_NAME_LENGTH');
            a.segment('1a');
            a.reloc('EnemyNameBlocklist');
            a.label('EnemyNameBlocklist');
            a.export('EnemyNameBlocklist');
            const hardcodedBlockedObjs = [this.dynaCounter, this.dynaLaser, this.dynaBubble];
            const blocklist = this.filter(obj => obj.hp > 0 && obj.displayName == '').concat(hardcodedBlockedObjs);
            a.byte(...blocklist.map(obj => obj.id));
            a.assign('ENEMY_NAME_BLOCKLIST_LEN', blocklist.length);
            a.export('ENEMY_NAME_BLOCKLIST_LEN');
            modules.push(a.module());
        }
        return modules;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9yb20vb2JqZWN0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN2QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDL0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQVkxQyxNQUFNLE9BQU8sT0FBUSxTQUFRLFdBQXVCO0lBNHJCbEQsWUFBcUIsR0FBUTtRQUMzQixLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFETSxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBMXJCN0IsZ0JBQVcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELGlCQUFZLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQy9CLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxZQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzFCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxLQUFLLEVBQUUsUUFBUTtZQUNmLFdBQVcsRUFBRSxRQUFRO1NBQ3RCLENBQUMsQ0FBQztRQUNILDBCQUFxQixHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUN4QyxFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsWUFBTyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMxQixFQUFFLEVBQUUsSUFBSTtZQUNS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QUMsb0JBQW9CLENBQUMsQ0FBQTtZQUM3QixDQUFDLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFDN0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQzlCLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2pGLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQ3ZHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkMsQ0FBQyxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkQsQ0FBQyxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7U0FDMUI7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4uL2ZsYWdzZXQuanMnO1xuLy8gaW1wb3J0IHtSYW5kb219IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5pbXBvcnQgeyBSb20gfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHsgT2JqZWN0RGF0YSB9IGZyb20gJy4vb2JqZWN0ZGF0YS5qcyc7XG5pbXBvcnQgeyBNb25zdGVyIH0gZnJvbSAnLi9tb25zdGVyLmpzJztcbmltcG9ydCB7IGxvd2VyQ2FtZWxUb1NwYWNlcyB9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQgeyBFbnRpdHlBcnJheSB9IGZyb20gJy4vZW50aXR5LmpzJztcbmltcG9ydCB7IE1vZHVsZSB9IGZyb20gJy4uL2FzbS9tb2R1bGUuanMnO1xuXG4vLyBNYW51YWwgZGF0YSBhYm91dCBtb25zdGVycy4gIEV2ZXJ5IG1vbnN0ZXIgbmVlZHMgYXQgbGVhc3QgYW4gSUQtdG8tbmFtZSBtYXBwaW5nLFxuLy8gV2UgYWxzbyBjYW4ndCBleHBlY3QgdG8gZ2V0IHRoZSBkaWZmaWN1bHR5IG1hcHBpbmcgYXV0b21hdGljYWxseSwgc28gdGhhdCdzXG4vLyBpbmNsdWRlZCBoZXJlLCB0b28uXG5cbi8vIFRPRE8gLSBhY3Rpb24gc2NyaXB0IHR5cGVzXG4vLyAgICAgIC0+IGNvbXBhdGliaWxpdHkgd2l0aCBvdGhlciBtb25zdGVyc1xuLy8gICAgICAgICBjb25zdHJhaW50cyBvbiBleHRyYSBhdHRyaWJ1dGVzXG4vLyAgICAgICAgIGRpZmZpY3VsdHkgcmF0aW5nc1xuXG5leHBvcnQgY2xhc3MgT2JqZWN0cyBleHRlbmRzIEVudGl0eUFycmF5PE9iamVjdERhdGE+IHtcblxuICBtZXNpYVNhYmVyYSA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4MmEsIFwiTWVzaWFcIik7XG4gIHNvcmNlcm9yU2hvdCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHgzZixcbiAgICBzY2FsaW5nOiAzNyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICB3cmFpdGgxID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDRiLFxuICAgIHNjYWxpbmc6IDI0LFxuICAgIGNsYXNzOiAnd3JhaXRoJyxcbiAgICBkaXNwbGF5TmFtZTogJ1dyYWl0aCcsXG4gIH0pO1xuICBwYXJhbHlzaXNQb3dkZXJTb3VyY2UgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NGQsXG4gICAgc2NhbGluZzogMjMsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgd3JhaXRoMiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg0ZixcbiAgICBzY2FsaW5nOiAyOCxcbiAgICBjbGFzczogJ3dyYWl0aCcsXG4gICAgZGlzcGxheU5hbWU6ICdXcmFpdGgnLFxuICB9KTtcbiAgYmx1ZVNsaW1lID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDUwLFxuICAgIHNjYWxpbmc6IDEsXG4gICAgY2xhc3M6ICdzbGltZScsXG4gICAgZGlzcGxheU5hbWU6ICdTbGltZScsXG4gIH0pO1xuICB3ZXJldGlnZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTEsXG4gICAgc2NhbGluZzogMSxcbiAgICBkaXNwbGF5TmFtZTogJ1dlcmV0aWdlcicsXG4gIH0pO1xuICBncmVlbkplbGx5ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDUyLFxuICAgIHNjYWxpbmc6IDQsXG4gICAgY2xhc3M6ICdqZWxseScsXG4gICAgZGlzcGxheU5hbWU6ICdTbHVnJyxcbiAgfSk7XG4gIHJlZFNsaW1lID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDUzLFxuICAgIHNjYWxpbmc6IDQsXG4gICAgY2xhc3M6ICdzbGltZScsXG4gICAgZGlzcGxheU5hbWU6ICdQb2lzb24gU2xpbWUnLFxuICB9KTtcbiAgcm9ja0dvbGVtID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDU0LFxuICAgIHNjYWxpbmc6IDQsXG4gICAgY2xhc3M6ICdnb2xlbScsXG4gICAgZGlzcGxheU5hbWU6ICdNdWQgR29sZW0nLFxuICB9KTtcbiAgYmx1ZUJhdCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1NSxcbiAgICBzY2FsaW5nOiA0LFxuICAgIGRpc3BsYXlOYW1lOiAnQmF0JyxcbiAgfSk7XG4gIGdyZWVuV3l2ZXJuID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDU2LFxuICAgIHNjYWxpbmc6IDQsXG4gICAgY2xhc3M6ICd3eXZlcm4nLFxuICAgIGRpc3BsYXlOYW1lOiAnV3l2ZXJuJyxcbiAgfSk7XG4gIHZhbXBpcmUxID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDU3LFxuICAgIHNjYWxpbmc6IDUsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnVmFtcGlyZScsXG4gIH0pO1xuICBvcmMgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTgsXG4gICAgc2NhbGluZzogNixcbiAgICBkaXNwbGF5TmFtZTogJ0F4ZSBXZXJlYm9hcicsXG4gIH0pO1xuICByZWRNb3NxdWl0byA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1OSxcbiAgICBzY2FsaW5nOiAxMCxcbiAgICBjbGFzczogJ21vc3F1aXRvJyxcbiAgICBkaXNwbGF5TmFtZTogJ01vc3F1aXRvJyxcbiAgfSk7XG4gIGJsdWVNdXNocm9vbSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1YSxcbiAgICBzY2FsaW5nOiAxMCxcbiAgICBjbGFzczogJ211c2hyb29tJyxcbiAgICBkaXNwbGF5TmFtZTogJ011c2hyb29tJyxcbiAgfSk7XG4gIHN3YW1wVG9tYXRvID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDViLFxuICAgIHNjYWxpbmc6IDEwLixcbiAgICBkaXNwbGF5TmFtZTogJ1BpbGxidWcnLFxuICB9KTtcbiAgYmx1ZU1vc3F1aXRvID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDVjLFxuICAgIHNjYWxpbmc6IDIzLFxuICAgIGNsYXNzOiAnbW9zcXVpdG8nLFxuICAgIGRpc3BsYXlOYW1lOiAnTW9zcXVpdG8nLFxuICB9KTtcbiAgc3dhbXBQbGFudCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1ZCxcbiAgICBzY2FsaW5nOiAxMCxcbiAgICBkaXNwbGF5TmFtZTogJ1N3YW1wIERhbmRlbGlvbicsXG4gIH0pO1xuICBnaWFudEluc2VjdCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1ZSxcbiAgICBzY2FsaW5nOiAxMSxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdHaWFudCBJbnNlY3QnLFxuICB9KTtcbiAgbGFyZ2VCbHVlU2xpbWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NWYsXG4gICAgc2NhbGluZzogMTEsXG4gICAgY2xhc3M6ICdzbGltZScsXG4gICAgZGlzcGxheU5hbWU6ICdMYXJnZSBTbGltZScsXG4gIH0pO1xuICBpY2Vab21iaWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjAsXG4gICAgc2NhbGluZzogMTIsXG4gICAgY2xhc3M6ICd6b21iaWUnLFxuICAgIGRpc3BsYXlOYW1lOiAnSWNlIFpvbWJpZScsXG4gIH0pO1xuICBncmVlbkJyYWluID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDYxLFxuICAgIHNjYWxpbmc6IDEyLFxuICAgIGNsYXNzOiAnYnJhaW4nLFxuICAgIGRpc3BsYXlOYW1lOiAnQnJhaW4nLFxuICB9KTtcbiAgZ3JlZW5TcGlkZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjIsXG4gICAgc2NhbGluZzogMTIsXG4gICAgY2xhc3M6ICdzcGlkZXInLFxuICAgIGRpc3BsYXlOYW1lOiAnU3BpZGVyJyxcbiAgfSk7XG4gIHJlZFd5dmVybiA9IG5ldyBNb25zdGVyKHRoaXMsIHsgLy8gYWxzbyBwdXJwbGU/XG4gICAgaWQ6IDB4NjMsXG4gICAgc2NhbGluZzogMTIsXG4gICAgY2xhc3M6ICd3eXZlcm4nLFxuICAgIGRpc3BsYXlOYW1lOiAnV3l2ZXJuJyxcbiAgfSk7XG4gIHNvbGRpZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjQsXG4gICAgc2NhbGluZzogMTQsXG4gICAgY2xhc3M6ICdzb2xkaWVyJyxcbiAgICBkaXNwbGF5TmFtZTogJ0RyYXlnb25pYSBTb2xkaWVyJyxcbiAgfSk7XG4gIGljZUVudGl0eSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2NSxcbiAgICBzY2FsaW5nOiAxNCxcbiAgICBjbGFzczogJ2VudGl0eScsXG4gICAgZGlzcGxheU5hbWU6ICdJY2UgUGxhbnQnLFxuICB9KTtcbiAgcmVkQnJhaW4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjYsXG4gICAgc2NhbGluZzogMTQsXG4gICAgY2xhc3M6ICdicmFpbicsXG4gICAgZGlzcGxheU5hbWU6ICdQb2lzb24gQnJhaW4nLFxuICB9KTtcbiAgaWNlR29sZW0gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjcsXG4gICAgc2NhbGluZzogMTQsXG4gICAgY2xhc3M6ICdnb2xlbScsXG4gICAgZGlzcGxheU5hbWU6ICdJY2UgR29sZW0nLFxuICB9KTtcbiAga2VsYmVzcXVlMSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2OCxcbiAgICBzY2FsaW5nOiAxNSxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdHZW5lcmFsIEtlbGJlc3F1ZScsXG4gIH0pO1xuICBsYXJnZVJlZFNsaW1lID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDY5LFxuICAgIHNjYWxpbmc6IDE4LFxuICAgIGNsYXNzOiAnc2xpbWUnLFxuICAgIGRpc3BsYXlOYW1lOiAnTGFyZ2UgUG9pc29uIFNsaW1lJyxcbiAgfSk7XG4gIHRyb2xsID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDZhLFxuICAgIHNjYWxpbmc6IDE4LFxuICAgIGRpc3BsYXlOYW1lOiAnVHJvbGwnLFxuICB9KTtcbiAgcmVkSmVsbHkgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NmIsXG4gICAgc2NhbGluZzogMTgsXG4gICAgY2xhc3M6ICdqZWxseScsXG4gICAgZGlzcGxheU5hbWU6ICdQb2lzb24gSmVsbHknLFxuICB9KTtcbiAgbWVkdXNhID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDZjLFxuICAgIHNjYWxpbmc6IDE5LFxuICAgIGRpc3BsYXlOYW1lOiAnTWVkdXNhJyxcbiAgfSk7XG4gIGNyYWIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NmQsXG4gICAgc2NhbGluZzogMTksXG4gICAgZGlzcGxheU5hbWU6ICdDcmFiJyxcbiAgfSk7XG4gIG1lZHVzYUhlYWQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NmUsXG4gICAgc2NhbGluZzogMjAsXG4gICAgZGlzcGxheU5hbWU6ICdGbHlpbmcgUGxhbnQnLFxuICB9KTtcbiAgYmlyZCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2ZixcbiAgICBzY2FsaW5nOiAyMCxcbiAgICBjbGFzczogJ2JpcmQnLFxuICAgIGRpc3BsYXlOYW1lOiAnQmlyZCcsXG4gIH0pO1xuICByZWRNdXNocm9vbSA9IG5ldyBNb25zdGVyKHRoaXMsIHsgLy8gYWxzbyBwdXJwbGVcbiAgICBpZDogMHg3MSxcbiAgICBzY2FsaW5nOiAyMSxcbiAgICBjbGFzczogJ211c2hyb29tJyxcbiAgICBkaXNwbGF5TmFtZTogJ1BvaXNvbiBNdXNocm9vbScsXG4gIH0pO1xuICBlYXJ0aEVudGl0eSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3MixcbiAgICBzY2FsaW5nOiAyMixcbiAgICBjbGFzczogJ2VudGl0eScsXG4gICAgZGlzcGxheU5hbWU6ICdQb2lzb24gUGxhbnQnLFxuICB9KTtcbiAgbWltaWMgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NzMsXG4gICAgc2NhbGluZzogMjIsXG4gICAgZGlzcGxheU5hbWU6ICdNaW1pYycsXG4gIH0pO1xuICByZWRTcGlkZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NzQsXG4gICAgc2NhbGluZzogMjIsXG4gICAgY2xhc3M6ICdzcGlkZXInLFxuICAgIGRpc3BsYXlOYW1lOiAnUGFyYWx5emluZyBTcGlkZXInLFxuICB9KTtcbiAgZmlzaG1hbiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3NSxcbiAgICBzY2FsaW5nOiAyNSxcbiAgICBkaXNwbGF5TmFtZTogJ011dGFudCBGaXNoJyxcbiAgfSk7XG4gIGplbGx5ZmlzaCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3NixcbiAgICBzY2FsaW5nOiAyNSxcbiAgICBkaXNwbGF5TmFtZTogJ0plbGx5ZmlzaCcsXG4gIH0pO1xuICBrcmFrZW4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NzcsXG4gICAgc2NhbGluZzogMjUsXG4gICAgZGlzcGxheU5hbWU6ICdLcmFrZW4nLFxuICB9KTtcbiAgZGFya0dyZWVuV3l2ZXJuID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDc4LFxuICAgIHNjYWxpbmc6IDI3LFxuICAgIGNsYXNzOiAnd3l2ZXJuJyxcbiAgICBkaXNwbGF5TmFtZTogJ1d5dmVybiBNYWdlJyxcbiAgfSk7XG4gIHNhbmRab21iaWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NzksXG4gICAgc2NhbGluZzogMzgsXG4gICAgY2xhc3M6ICd6b21iaWUnLFxuICAgIGRpc3BsYXlOYW1lOiAnU2FuZCBab21iaWUnLFxuICB9KTtcbiAgd3JhaXRoU2hhZG93MSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3YixcbiAgICBzY2FsaW5nOiAyOCxcbiAgICBjbGFzczogJ3dyYWl0aCcsXG4gICAgZGlzcGxheU5hbWU6ICdTaGFkb3cnLFxuICB9KTtcbiAgbW90aCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3YyxcbiAgICBzY2FsaW5nOiAyOCxcbiAgICBkaWZmaWN1bHR5OiAzLFxuICAgIGRpc3BsYXlOYW1lOiAnQnV0dGVyZmx5JyxcbiAgfSk7XG4gIHNhYmVyYTEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4N2QsXG4gICAgc2NhbGluZzogMjksXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnR2VuZXJhbCBTYWJlcmEnLFxuICB9KTtcbiAgdmVydGljYWxQbGF0Zm9ybSA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4N2UpOyAvLyBzY2FsaW5nOiAyOCA/XG4gIGhvcml6b3RhbFBsYXRmb3JtID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg3Zik7IC8vIHNjYWxpbmc6IDI4ID9cbiAgYXJjaGVyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDgwLFxuICAgIHNjYWxpbmc6IDMzLFxuICAgIGNsYXNzOiAnc29sZGllcicsXG4gICAgZGlzcGxheU5hbWU6ICdEcmF5Z29uaWEgQXJjaGVyJyxcbiAgfSk7XG4gIGJvbWJlckJpcmQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ODEsXG4gICAgc2NhbGluZzogMzMsXG4gICAgY2xhc3M6ICdiaXJkJyxcbiAgICBkaXNwbGF5TmFtZTogJ0JvbWJlciBCaXJkJyxcbiAgfSk7XG4gIGxhdmFCbG9iID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDgyLFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIGNsYXNzOiAncHVkZGxlJyxcbiAgICBkaXNwbGF5TmFtZTogJ0xhdmEgQmxvYicsXG4gIH0pO1xuICBmbGFpbEd1eSA9IG5ldyBNb25zdGVyKHRoaXMsIHsgLy8gbGl6YXJkIG1hblxuICAgIGlkOiAweDg0LFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIGRpc3BsYXlOYW1lOiAnRmxhaWwgR3V5JyxcbiAgfSk7XG4gIGJsdWVFeWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ODUsXG4gICAgc2NhbGluZzogMzcsXG4gICAgY2xhc3M6ICdleWUnLFxuICAgIGRpc3BsYXlOYW1lOiAnQmVob2xkZXInLFxuICB9KTtcbiAgc2FsYW1hbmRlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4NixcbiAgICBzY2FsaW5nOiAzNyxcbiAgICBkaXNwbGF5TmFtZTogJ1NhbGFtYW5kZXInLFxuICB9KTtcbiAgc29yY2Vyb3IgPSBuZXcgTW9uc3Rlcih0aGlzLCB7IC8vIGJ1cnRcbiAgICBpZDogMHg4NyxcbiAgICBzY2FsaW5nOiAzNyxcbiAgICBkaXNwbGF5TmFtZTogJ0J1cnQnLFxuICB9KTtcbiAgbWFkbzEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ODgsXG4gICAgc2NhbGluZzogMzcsXG4gICAgZGlzcGxheU5hbWU6ICdHZW5lcmFsIE1hZG8nLFxuICB9KTtcbiAga25pZ2h0ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDg5LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIGRpZmZpY3VsdHk6IDEsXG4gICAgZGlzcGxheU5hbWU6ICdOaW5qYScsXG4gIH0pO1xuICBkZXZpbCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4YSxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICBkaXNwbGF5TmFtZTogJ0RldmlsIEJhdCcsXG4gIH0pO1xuICBrZWxiZXNxdWUyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDhiLFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ0dlbmVyYWwgS2VsYmVzcXVlJyxcbiAgfSk7XG4gIHdyYWl0aFNoYWRvdzIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OGMsXG4gICAgc2NhbGluZzogNDEsXG4gICAgY2xhc3M6ICd3cmFpdGgnLFxuICAgIGRpc3BsYXlOYW1lOiAnU2hhZG93JyxcbiAgfSk7XG4gIGdsaXRjaDEgPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweDhkKTsgLy8gc2NhbGluZzogNDEgP1xuICBnbGl0Y2gyID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg4ZSk7IC8vIHNjYWxpbmc6IDQxID9cbiAgZ3VhcmRpYW5TdGF0dWUgPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweDhmKTsgLy8gc2NhbGluZzogNDEgP1xuICBzYWJlcmEyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDkwLFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ0dlbmVyYWwgU2FiZXJhJyxcbiAgfSk7XG4gIHRhcmFudHVsYSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5MSxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICBkaXNwbGF5TmFtZTogJ1RhcmFudHVsYScsXG4gIH0pO1xuICBza2VsZXRvbiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5MixcbiAgICBzY2FsaW5nOiA0MSxcbiAgICBkaXNwbGF5TmFtZTogJ1NrZWxldG9uJyxcbiAgfSk7XG4gIG1hZG8yID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDkzLFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ0dlbmVyYWwgTWFkbycsXG4gIH0pO1xuICBwdXJwbGVFeWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTQsXG4gICAgc2NhbGluZzogNDEsXG4gICAgY2xhc3M6ICdleWUnLFxuICAgIGRpc3BsYXlOYW1lOiAnQmVob2xkZXInLFxuICB9KTtcbiAgZmxhaWxLbmlnaHQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTUsXG4gICAgc2NhbGluZzogNDEsXG4gICAgZGlzcGxheU5hbWU6ICdGbGFpbCBLbmlnaHQnLFxuICB9KTtcbiAgc2NvcnBpb24gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTYsXG4gICAgc2NhbGluZzogNDEsXG4gICAgZGlzcGxheU5hbWU6ICdTY29ycGlvbicsXG4gIH0pO1xuICBrYXJtaW5lID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk3LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ0dlbmVyYWwgS2FybWluZScsXG4gIH0pO1xuICBzYW5kQmxvYiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5OCxcbiAgICBzY2FsaW5nOiA0NCxcbiAgICBjbGFzczogJ3B1ZGRsZScsXG4gICAgZGlzcGxheU5hbWU6ICdTYW5kIEJsb2InLFxuICB9KTtcbiAgbXVtbXkgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTksXG4gICAgc2NhbGluZzogNDQsXG4gICAgZGlzcGxheU5hbWU6ICdNdW1teScsXG4gIH0pO1xuICB3YXJsb2NrID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDlhLFxuICAgIHNjYWxpbmc6IDQ2LFxuICAgIGRpc3BsYXlOYW1lOiAnV2FybG9jaycsXG4gIH0pO1xuICBkcmF5Z29uMSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5YixcbiAgICBzY2FsaW5nOiA0NSxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdFbXBlcm9yIERyYXlnb24nLFxuICB9KTtcbiAgc3RhdHVlT2ZTdW4gPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweDljKTsgLy8gc2NhbGluZzogNDcgP1xuICBzdGF0dWVPZk1vb24gPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweDlkKTsgLy8gc2NhbGluZzogNDcgP1xuICBkcmF5Z29uMiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5ZSxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdFbXBlcm9yIERyYXlnb24nLFxuICB9KTtcbiAgY3J1bWJsaW5nVmVydGljYWxQbGF0Zm9ybSA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4OWYpOyAvLyBzY2FsaW5nOiA0NyA/XG4gIGJyb3duUm9ib3QgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YTAsXG4gICAgc2NhbGluZzogNDcsXG4gICAgZGlmZmljdWx0eTogMSxcbiAgICBkaXNwbGF5TmFtZTogJ1JvYm90IFNlbnRyeScsXG4gIH0pO1xuICB3aGl0ZVJvYm90ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGExLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIGRpc3BsYXlOYW1lOiAnUm9ib3QgRW5mb3JjZXInLFxuICB9KTtcbiAgdG93ZXJTZW50aW5lbCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhhMixcbiAgICBzY2FsaW5nOiA0NyxcbiAgICBkaXNwbGF5TmFtZTogJ1Rvd2VyIFNlbnRpbmVsJyxcbiAgfSk7XG4gIGhlbGljb3B0ZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YTMsXG4gICAgc2NhbGluZzogNDcsXG4gICAgZGlzcGxheU5hbWU6ICdSb2JvY29wdGVyJyxcbiAgfSk7XG4gIGR5bmEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YTQsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnRFlOQScsXG4gIH0pO1xuICB2YW1waXJlMiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhhNSxcbiAgICBzY2FsaW5nOiAyOCxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdWYW1waXJlJyxcbiAgfSk7XG4gIGdsaXRjaDMgPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweGE2KTsgLy8gc2NhbGluZzogNDEgP1xuICBkeW5hUG9kID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGI0LFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ0RZTkEgRGVmZW5zZSBQb2QnLFxuICB9KTtcbiAgZHluYUNvdW50ZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YjgsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZHluYUxhc2VyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGI5LFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGR5bmFCdWJibGUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YmEsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgdmFtcGlyZTJCYXQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YmMsXG4gICAgc2NhbGluZzogMjgsXG4gICAgLy8gdHlwZTogJ3Byb2plY3RpbGUnLCAvLyBvZiBzb3J0cy4uLj9cbiAgfSk7XG4gIGJyb3duUm9ib3RMYXNlclNvdXJjZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhiZSxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBkcmF5Z29uMkZpcmViYWxsID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGJmLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHZhbXBpcmUxQmF0ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGMxLFxuICAgIHNjYWxpbmc6IDUsXG4gICAgLy90eXBlOiAncHJvamVjdGlsZScsIC8vIG9mIHNvcnRzXG4gIH0pO1xuICBnaWFudEluc2VjdEZpcmViYWxsID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGMzLFxuICAgIHNjYWxpbmc6IDExLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGdyZWVuTW9zcXVpdG8gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzQsXG4gICAgc2NhbGluZzogMTEsXG4gICAgLy90eXBlOiAncHJvamVjdGlsZScsIC8vIG9mIHNvcnRzXG4gICAgZGlzcGxheU5hbWU6ICdNb3NxdWl0bycsXG4gIH0pO1xuICBrZWxiZXNxdWUxUm9jayA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjNSxcbiAgICBzY2FsaW5nOiAxNSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBzYWJlcmExQmFsbHMgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzYsXG4gICAgc2NhbGluZzogMjksXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAga2VsYmVzcXVlMkZpcmUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzcsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc2FiZXJhMkZpcmUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzgsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc2FiZXJhMkJhbGxzID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGM5LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGthcm1pbmVCYWxscyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjYSxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBzdGF0dWVCYWxscyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjYixcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBkcmF5Z29uMUxpZ2h0bmluZyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjYyxcbiAgICBzY2FsaW5nOiA0NSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBkcmF5Z29uMkxhc2VyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGNkLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGRyYXlnb24yQnJlYXRoID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGNlLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGJpcmRCb21iID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGUwLFxuICAgIHNjYWxpbmc6IDMzLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGdyZWVuTW9zcXVpdG9TaG90ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGUyLFxuICAgIHNjYWxpbmc6IDExLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHBhcmFseXNpc0JlYW0gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTMsXG4gICAgc2NhbGluZzogMjUsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc3RvbmVHYXplID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGU0LFxuICAgIHNjYWxpbmc6IDE5LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHJvY2tHb2xlbVJvY2sgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTUsXG4gICAgc2NhbGluZzogNCxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBjdXJzZUJlYW0gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTYsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgbXBEcmFpbldlYiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlNyxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBmaXNobWFuVHJpZGVudCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlOCxcbiAgICBzY2FsaW5nOiAyNSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBvcmNBeGUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTksXG4gICAgc2NhbGluZzogNixcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBzd2FtcFBvbGxlbiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlYSxcbiAgICBzY2FsaW5nOiAxMCxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBwYXJhbHlzaXNQb3dkZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZWIsXG4gICAgc2NhbGluZzogMjMsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc29sZGllclN3b3JkID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGVjLFxuICAgIHNjYWxpbmc6IDE0LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGljZUdvbGVtUm9jayA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlZCxcbiAgICBzY2FsaW5nOiAxNCxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICB0cm9sbEF4ZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlZSxcbiAgICBzY2FsaW5nOiAxOCxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBrcmFrZW5JbmsgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZWYsXG4gICAgc2NhbGluZzogMjUsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgYXJjaGVyQXJyb3cgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjAsXG4gICAgc2NhbGluZzogMzMsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAga25pZ2h0U3dvcmQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjIsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgbW90aFJlc2lkdWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjMsXG4gICAgc2NhbGluZzogMjgsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgYnJvd25Sb2JvdExhc2VyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGY0LFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHdoaXRlUm9ib3RMYXNlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmNSxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICB0b3dlclNlbnRpbmVsTGFzZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjYsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc2tlbGV0b25TaG90ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGY3LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGJsb2JTaG90ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGY4LFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGZsYWlsS25pZ2h0RmxhaWwgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjksXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZmxhaWxHdXlGbGFpbCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmYSxcbiAgICBzY2FsaW5nOiAzNyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBtYWRvU2h1cmlrZW4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZmMsXG4gICAgc2NhbGluZzogMzcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZ3VhcmRpYW5TdGF0dWVNaXNzaWxlID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGZkLFxuICAgIHNjYWxpbmc6IDM2LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGRlbW9uV2FsbEZpcmUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZmUsXG4gICAgc2NhbGluZzogMzcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIHN1cGVyKDB4MTAwKTtcblxuICAgIGZvciAoY29uc3Qga2V5IGluIHRoaXMpIHtcbiAgICAgIGNvbnN0IG9iaiA9IHRoaXNba2V5IGFzIGtleW9mIHRoaXNdO1xuICAgICAgaWYgKCEob2JqIGluc3RhbmNlb2YgT2JqZWN0RGF0YSkpIGNvbnRpbnVlO1xuICAgICAgb2JqLm5hbWUgPSBsb3dlckNhbWVsVG9TcGFjZXMoa2V5KTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXNbaV0pIHtcbiAgICAgICAgdGhpc1tpXSA9IG5ldyBPYmplY3REYXRhKHRoaXMsIGkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHdyaXRlKCk6IE1vZHVsZVtdIHtcbiAgICBjb25zdCBtb2R1bGVzOiBNb2R1bGVbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgb2JqIG9mIHRoaXMpIHtcbiAgICAgIG1vZHVsZXMucHVzaCguLi5vYmoud3JpdGUoKSk7XG4gICAgfVxuICAgIC8vIElmIHdlJ3JlIHN0b3JpbmcgdGhlIG1vbnN0ZXIgbmFtZXMgdGhlbiB3ZSBuZWVkIHRvIGluaXRpYWxpemUgdGhlIGJ1ZmZlclxuICAgIC8vIGxlbmd0aC5cbiAgICBpZiAodGhpcy5yb20ud3JpdGVNb25zdGVyTmFtZXMpIHtcbiAgICAgIGNvbnN0IGEgPSB0aGlzLnJvbS5hc3NlbWJsZXIoKTtcbiAgICAgIGNvbnN0IGxvbmdlc3ROYW1lID0gTWF0aC5tYXgoLi4uKHRoaXMubWFwKG8gPT4gby5kaXNwbGF5TmFtZS5sZW5ndGgpKSk7XG4gICAgICBjb25zdCBNQVhfTEVOR1RIID0gMjc7XG5cbiAgICAgIGlmIChsb25nZXN0TmFtZSA+IE1BWF9MRU5HVEgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBMb25nZXN0IGRpc3BsYXlOYW1lIGxlbmd0aCBpcyBncmVhdGVyIHRoYW4gJHtNQVhfTEVOR1RIXG4gICAgICAgICAgICB9LiAoJHtsb25nZXN0TmFtZX0gPiAke01BWF9MRU5HVEhcbiAgICAgICAgICAgIH0pXFxuQ3J5c3RhbGlzIEhVRCBjYW4ndCBjb21mb3J0YWJseSBmaXQgdGhhdCBtYW55IGNoYXJhY3RlcnMuYCk7XG4gICAgICB9XG4gICAgICBhLmFzc2lnbignRU5FTVlfTkFNRV9MRU5HVEgnLCBsb25nZXN0TmFtZSk7XG4gICAgICBhLmV4cG9ydCgnRU5FTVlfTkFNRV9MRU5HVEgnKTtcbiAgICAgIGEuc2VnbWVudCgnMWEnKVxuICAgICAgYS5yZWxvYygnRW5lbXlOYW1lQmxvY2tsaXN0JylcbiAgICAgIGEubGFiZWwoJ0VuZW15TmFtZUJsb2NrbGlzdCcpXG4gICAgICBhLmV4cG9ydCgnRW5lbXlOYW1lQmxvY2tsaXN0JylcbiAgICAgIGNvbnN0IGhhcmRjb2RlZEJsb2NrZWRPYmpzID0gW3RoaXMuZHluYUNvdW50ZXIsIHRoaXMuZHluYUxhc2VyLCB0aGlzLmR5bmFCdWJibGVdO1xuICAgICAgY29uc3QgYmxvY2tsaXN0ID0gdGhpcy5maWx0ZXIob2JqID0+IG9iai5ocCA+IDAgJiYgb2JqLmRpc3BsYXlOYW1lID09ICcnKS5jb25jYXQoaGFyZGNvZGVkQmxvY2tlZE9ianMpO1xuICAgICAgYS5ieXRlKC4uLmJsb2NrbGlzdC5tYXAob2JqID0+IG9iai5pZCkpXG4gICAgICBhLmFzc2lnbignRU5FTVlfTkFNRV9CTE9DS0xJU1RfTEVOJywgYmxvY2tsaXN0Lmxlbmd0aCk7XG4gICAgICBhLmV4cG9ydCgnRU5FTVlfTkFNRV9CTE9DS0xJU1RfTEVOJyk7XG4gICAgICBtb2R1bGVzLnB1c2goYS5tb2R1bGUoKSk7XG4gICAgfVxuICAgIHJldHVybiBtb2R1bGVzO1xuICB9XG59XG5cbi8vIGV4cG9ydCB0eXBlIE1vbnN0ZXJUeXBlID0gJ21vbnN0ZXInIHwgJ2Jvc3MnIHwgJ3Byb2plY3RpbGUnO1xuLy8gZXhwb3J0IHR5cGUgVGVycmFpbiA9ICd3YWxrJyB8ICdzd2ltJyB8ICdzb2FyJyB8ICdmbHV0dGVyJyB8ICdzdGFuZCc7XG5cbmV4cG9ydCB0eXBlIENvbnN0cmFpbnQgPSBNYXA8c3RyaW5nLCByZWFkb25seSBbcmVhZG9ubHkgbnVtYmVyW10sIGJvb2xlYW4gfCBudWxsXT47XG4vLyBrZXkgaXMgdHVwbGVbMF0uam9pbignLCcpXG4vLyB2YWx1ZVswXSBpcyBbW3F1YWQgZm9yIHJlcXVpcmVkIHBhdDAsIHBhdDEsIHBhbDIsIHBhbDNdXG4vLyB2YWx1ZVsxXSBpcyB0cnVlIGlmIG5lZWQgcGF0MSwgZmFsc2UgaWYgbmVlZCBwYXQwLCBudWxsIGlmIG5laXRoZXJcbi8vICAgLS0tPiBidXQgd2UgbmVlZCB0byBrZWVwIHRyYWNrIG9mIGEgaGFuZnVsIG9mIHNwYXducywgbm90IGp1c3QgdG9uZS5cblxuXG4gIC8vIG1vbnN0ZXIoMHg1MCwgJ0JsdWUgU2xpbWUnLCAweDIwLCA2LCB7XG4gIC8vICAgaGl0czogMSwgc2F0azogMTYsIGRnbGQ6IDIsIHNleHA6IDMyLFxuICAvLyAgIG11c3Q6IGFuZChwYXQoMHg2NCksIHBhbCgyLCAweDIxKSksXG4gIC8vIH0pO1xuICAvLyBtb25zdGVyKDB4NTEsICdXZXJldGlnZXInLCAweDI0LCA3LCB7XG4gIC8vICAgaGl0czogMS41LCBzYXRrOiAyMSwgZGdsZDogNCwgc2V4cDogNDAsXG4gIC8vICAgbXVzdDogYW5kKHBhdCgweDYwKSwgcGFsKDMsIDB4MjApKSxcbiAgLy8gfSk7XG4gIC8vIG1vbnN0ZXIoMHg1MiwgJ0dyZWVuIEplbGx5JywgMHgyMCwgMTAsIHtcbiAgLy8gICBzZGVmOiA0LCBoaXRzOiAzLCBzYXRrOiAxNiwgZGdsZDogNCwgc2V4cDogMzYsXG4gIC8vICAgbXVzdDogYW5kKHBhdCgweDY1KSwgcGFsKDIsIDB4MjIpKSxcbiAgLy8gfSk7XG4gIC8vIG1vbnN0ZXIoMHg1MywgJ1JlZCBTbGltZScsIDB4MjAsIDE2LCB7XG4gIC8vICAgc2RlZjogNiwgaGl0czogNCwgc2F0azogMTYsIGRnbGQ6IDQsIHNleHA6IDQ4LFxuICAvLyAgIG11c3Q6IGFuZChwYXQoMHg2NCksIHBhbCgyLCAweDIzKSksXG4gIC8vIH0pO1xuXG5cbi8vIGV4cG9ydCBpbnRlcmZhY2UgTW9uc3RlciB7XG4vLyAgIGlkOiBudW1iZXI7XG4vLyAgIG5hbWU6IHN0cmluZztcbi8vICAgYWN0aW9uOiBudW1iZXI7XG4vLyAgIGNvdW50OiBudW1iZXI7XG4vLyAgIHR5cGU/OiBNb25zdGVyVHlwZTsgLy8gZGVmYXVsdCBpcyBtb25zdGVyXG4vLyAgIG1vdmU/OiBUZXJyYWluOyAvLyBkZWZhdWx0IGlzIHdhbGtcbi8vICAgc2RlZj86IG51bWJlcjtcbi8vICAgc3dyZD86IG51bWJlcjtcbi8vICAgaGl0cz86IG51bWJlcjtcbi8vICAgc2F0az86IG51bWJlcjtcbi8vICAgZGdsZD86IG51bWJlcjtcbi8vICAgc2V4cD86IG51bWJlcjtcbi8vICAgZWxlbT86IG51bWJlcjtcbi8vICAgc3BkPzogbnVtYmVyO1xuLy8gICBzdGF0dXM6IG51bWJlcjtcbi8vICAgcGVyc2lzdD86IGJvb2xlYW47XG4vLyAgIG11c3Q/OiBDb25zdHJhaW50O1xuLy8gfVxuXG4vLyBpbnRlcmZhY2UgQWRqdXN0bWVudHMge1xuLy8gICB2YW5pbGxhTGV2ZWw/OiBudW1iZXI7XG4vLyAgIHZhbmlsbGFTd29yZD86IG51bWJlcjtcbi8vICAgc2RlZj86IG51bWJlcjtcbi8vICAgc3dyZD86IG51bWJlcjtcbi8vICAgaGl0cz86IG51bWJlcjtcbi8vICAgc2F0az86IG51bWJlcjtcbi8vICAgZGdsZD86IG51bWJlcjtcbi8vICAgc2V4cD86IG51bWJlcjtcbi8vICAgZWxlbT86IG51bWJlcjtcbi8vICAgc3BkPzogbnVtYmVyO1xuLy8gfVxuXG4vLyBpbnRlcmZhY2UgUGxheWVyU3RhdHMge1xuLy8gICBhcm1vcjogbnVtYmVyO1xuLy8gICBsZXZlbDogbnVtYmVyO1xuLy8gICBzaGllbGQ6IG51bWJlcjtcbi8vICAgc3dvcmQ6IG51bWJlcjtcbi8vIH1cblxuLy8gY29uc3QgVkFOSUxMQV9TV09SRFMgPSBbMiwgMiwgMiwgMiwgNCwgNCwgNCwgOCwgOCwgOCwgOCwgMTYsIDE2LCAxNiwgMTYsIDE2XTtcblxuLy8gY29uc3Qge30gPSB7VkFOSUxMQV9TV09SRFN9IGFzIGFueTtcblxuLy8gZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pOiBNb25zdGVyW10ge1xuLy8gICBjb25zdCB7fSA9IHtyb20sIGZsYWdzLCByYW5kb219IGFzIGFueTtcblxuLy8gICBjb25zdCBvdXQ6IE1vbnN0ZXJbXSA9IFtdO1xuXG4vLyAgIGNvbnN0IHBsYXllcjogUGxheWVyU3RhdHMgPSB7XG4vLyAgICAgYXJtb3I6IDIsXG4vLyAgICAgbGV2ZWw6IDEsXG4vLyAgICAgc2hpZWxkOiAyLFxuLy8gICAgIHN3b3JkOiAyLFxuLy8gICB9O1xuXG4vLyAgIGZ1bmN0aW9uIGJhc2UoaWQ6IG51bWJlciwgbmFtZTogc3RyaW5nLCBhZGo6IEFkanVzdG1lbnRzID0ge30pIHtcbi8vICAgICBjb25zdCBvID0gcm9tLm9iamVjdHNbaWRdO1xuLy8gICAgIGxldCB7YWN0aW9uLCBpbW1vYmlsZSwgbGV2ZWwsIGF0aywgZGVmLCBocCxcbi8vICAgICAgICAgIGVsZW1lbnRzLCBnb2xkRHJvcCwgZXhwUmV3YXJkLCBzdGF0dXNFZmZlY3R9ID0gbztcblxuLy8gICAgIC8vIC8vIFdoYXQgbGV2ZWwgc2hvdWxkIHRoZSBwbGF5ZXIgYmUgYXQgd2hlbiBlbmNvdW50ZXJpbmcgdGhpcyBpbiB2YW5pbGxhP1xuLy8gICAgIC8vIGlmIChhZGoudmFuaWxsYUxldmVsKSBsZXZlbCA9IGFkai52YW5pbGxhTGV2ZWw7XG4vLyAgICAgbGV2ZWwgPSBwbGF5ZXIubGV2ZWw7XG5cbi8vICAgICAvLyBXaGF0IHN3b3JkIHdvdWxkIHRoZXkgYmUgdXNpbmc/ICBQaWNrIHRoZSBoaWdoZXN0IG5vbi1pbW11bmUgc3dvcmQgdGhhdFxuLy8gICAgIC8vIHdvdWxkIGJlIGF2YWlsYWJsZSBhdCB0aGlzIHBvaW50IGluIHRoZSBnYW1lLlxuLy8gICAgIGxldCBzd29yZCA9IHBsYXllci5zd29yZDtcbi8vICAgICB3aGlsZSAoc3dvcmQgPiAxICYmIChlbGVtZW50cyAmIChzd29yZCA+Pj4gMSkpKSB7XG4vLyAgICAgICBzd29yZCA+Pj49IDE7XG4vLyAgICAgfVxuLy8gICAgIGlmIChhZGoudmFuaWxsYVN3b3JkKSBzd29yZCA9IGFkai52YW5pbGxhU3dvcmQ7XG4vLyAgICAgY29uc3QgcGF0ayA9IHN3b3JkICsgbGV2ZWw7IC8vIGV4cGVjdGVkIHBsYXllciBhdHRhY2tcblxuLy8gICAgIC8vIEhvdyBtYW55IGhpdHMgd291bGQgaXQgdGFrZSB0byBraWxsIGluIHZhbmlsbGE/IChjb25zaWRlciBubyBmbG9vcj8pXG4vLyAgICAgY29uc3QgdmFuaWxsYUhpdHMgPSBNYXRoLmZsb29yKChocCArIDEpIC8gKHBhdGsgLSBkZWYpKTtcbi8vICAgICBjb25zdCBoaXRzID0gYWRqLmhpdHMgfHwgdmFuaWxsYUhpdHM7XG5cbi8vICAgICAvLyBTY2FsZWQgZGVmZW5zZSAod2lsbCBiZSBzdG9yZWQgaW4gZWlnaHRocylcbi8vICAgICBjb25zdCBzZGVmID0gYWRqLnNkZWYgIT0gbnVsbCA/IGFkai5zZGVmIDogZGVmIC8gcGF0azsgLy8gbm9ybWFsbHkgKjhcblxuLy8gICAgIC8vIEV4cGVjdGVkIHBsYXllciBIUCBhbmQgZGVmZW5zZSBhdCB2YW5pbGxhIGxldmVsXG4vLyAgICAgY29uc3QgcGhwID0gTWF0aC5taW4oMjU1LCAzMiArIDE2ICogbGV2ZWwpO1xuLy8gICAgIGNvbnN0IHBkZWYgPSBvLmF0dGFja1R5cGUgPyBwbGF5ZXIuc2hpZWxkIDogcGxheWVyLmFybW9yO1xuLy8gICAgIGNvbnN0IHZhbmlsbGFEYW1hZ2UgPSBNYXRoLm1heCgwLCBhdGsgLSBsZXZlbCAtIHBkZWYpIC8gcGhwO1xuLy8gICAgIGNvbnN0IHNhdGsgPSBhZGouc2F0ayAhPSBudWxsID8gYWRqLnNhdGsgOiB2YW5pbGxhRGFtYWdlOyAvLyBub3JtYWxseSAqMTI4XG5cbi8vICAgICAvLyBUT0RPIC0gdGhlbiBjb21wdXRlIGdvbGQvZXhwXG5cbi8vICAgICBjb25zdCB7fSA9IHtzZGVmLCBzYXRrLCBoaXRzLCBpbW1vYmlsZSwgZ29sZERyb3AsIGV4cFJld2FyZCwgc3RhdHVzRWZmZWN0fSBhcyBhbnk7XG5cbi8vICAgICBjb25zdCBtOiBNb25zdGVyID0ge2lkLCBuYW1lfSBhcyBhbnk7XG5cbi8vICAgICBtLmlkID0gaWQ7XG4vLyAgICAgbS5uYW1lID0gbmFtZTtcbi8vICAgICBtLnR5cGUgPSAnbW9uc3Rlcic7XG4vLyAgICAgbS5hY3Rpb24gPSBhY3Rpb247XG4vLyAgICAgbS5jb3VudCA9IDA7IC8vIGNvdW50O1xuLy8gICAgIG91dC5wdXNoKG0pO1xuLy8gICB9XG5cbi8vICAgLy8gVE9ETyAtIGFkZGl0aW9uYWwgY29uc3RyYWludHMgYWJvdXQgZS5nLiBwbGFjZW1lbnQsIGV0Yz9cbi8vICAgLy8gICAgICAtIG5vIFggb24gWSBsZXZlbC4uLj9cblxuLy8gICByZXR1cm4gb3V0O1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBhbmQoeDogQ29uc3RyYWludCwgeTogQ29uc3RyYWludCk6IENvbnN0cmFpbnQge1xuLy8gICByZXR1cm4gW107XG4vLyB9XG4vLyBmdW5jdGlvbiBwYXQoaWQ6IG51bWJlcik6IENvbnN0cmFpbnQge1xuLy8gICByZXR1cm4gW107XG4vLyB9XG4vLyBmdW5jdGlvbiBwYWwod2hpY2g6IG51bWJlciwgaWQ6IG51bWJlcik6IENvbnN0cmFpbnQge1xuLy8gICByZXR1cm4gW107XG4vLyB9XG5cbi8vIGNvbnN0IHt9ID0ge2FuZCwgcGF0LCBwYWx9IGFzIGFueTtcbiJdfQ==