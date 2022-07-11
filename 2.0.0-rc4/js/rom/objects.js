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
            let blockListLen = 0;
            for (const obj of this) {
                if (obj.hp > 0 && obj.displayName == '') {
                    a.byte(obj.id);
                    blockListLen++;
                }
            }
            a.assign('ENEMY_NAME_BLOCKLIST_LEN', blockListLen);
            a.export('ENEMY_NAME_BLOCKLIST_LEN');
            modules.push(a.module());
        }
        return modules;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9yb20vb2JqZWN0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN2QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDL0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQVkxQyxNQUFNLE9BQU8sT0FBUSxTQUFRLFdBQXVCO0lBNHJCbEQsWUFBcUIsR0FBUTtRQUMzQixLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFETSxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBMXJCN0IsZ0JBQVcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELGlCQUFZLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQy9CLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxZQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzFCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxLQUFLLEVBQUUsUUFBUTtZQUNmLFdBQVcsRUFBRSxRQUFRO1NBQ3RCLENBQUMsQ0FBQztRQUNILDBCQUFxQixHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUN4QyxFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsWUFBTyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMxQixFQUFFLEVBQUUsSUFBSTtZQUNS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QUMsb0JBQW9CLENBQUMsQ0FBQTtZQUM3QixDQUFDLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFDN0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQzlCLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztZQUNyQixLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRTtnQkFDdEIsSUFBSSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsV0FBVyxJQUFJLEVBQUUsRUFBRTtvQkFDdkMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ2YsWUFBWSxFQUFFLENBQUM7aUJBQ2hCO2FBQ0Y7WUFDRCxDQUFDLENBQUMsTUFBTSxDQUFDLDBCQUEwQixFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ25ELENBQUMsQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUVyQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1NBQzFCO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbi8vIGltcG9ydCB7UmFuZG9tfSBmcm9tICcuLi9yYW5kb20uanMnO1xuaW1wb3J0IHsgUm9tIH0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7IE9iamVjdERhdGEgfSBmcm9tICcuL29iamVjdGRhdGEuanMnO1xuaW1wb3J0IHsgTW9uc3RlciB9IGZyb20gJy4vbW9uc3Rlci5qcyc7XG5pbXBvcnQgeyBsb3dlckNhbWVsVG9TcGFjZXMgfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHsgRW50aXR5QXJyYXkgfSBmcm9tICcuL2VudGl0eS5qcyc7XG5pbXBvcnQgeyBNb2R1bGUgfSBmcm9tICcuLi9hc20vbW9kdWxlLmpzJztcblxuLy8gTWFudWFsIGRhdGEgYWJvdXQgbW9uc3RlcnMuICBFdmVyeSBtb25zdGVyIG5lZWRzIGF0IGxlYXN0IGFuIElELXRvLW5hbWUgbWFwcGluZyxcbi8vIFdlIGFsc28gY2FuJ3QgZXhwZWN0IHRvIGdldCB0aGUgZGlmZmljdWx0eSBtYXBwaW5nIGF1dG9tYXRpY2FsbHksIHNvIHRoYXQnc1xuLy8gaW5jbHVkZWQgaGVyZSwgdG9vLlxuXG4vLyBUT0RPIC0gYWN0aW9uIHNjcmlwdCB0eXBlc1xuLy8gICAgICAtPiBjb21wYXRpYmlsaXR5IHdpdGggb3RoZXIgbW9uc3RlcnNcbi8vICAgICAgICAgY29uc3RyYWludHMgb24gZXh0cmEgYXR0cmlidXRlc1xuLy8gICAgICAgICBkaWZmaWN1bHR5IHJhdGluZ3NcblxuZXhwb3J0IGNsYXNzIE9iamVjdHMgZXh0ZW5kcyBFbnRpdHlBcnJheTxPYmplY3REYXRhPiB7XG5cbiAgbWVzaWFTYWJlcmEgPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweDJhLCBcIk1lc2lhXCIpO1xuICBzb3JjZXJvclNob3QgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4M2YsXG4gICAgc2NhbGluZzogMzcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgd3JhaXRoMSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg0YixcbiAgICBzY2FsaW5nOiAyNCxcbiAgICBjbGFzczogJ3dyYWl0aCcsXG4gICAgZGlzcGxheU5hbWU6ICdXcmFpdGgnLFxuICB9KTtcbiAgcGFyYWx5c2lzUG93ZGVyU291cmNlID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDRkLFxuICAgIHNjYWxpbmc6IDIzLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHdyYWl0aDIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NGYsXG4gICAgc2NhbGluZzogMjgsXG4gICAgY2xhc3M6ICd3cmFpdGgnLFxuICAgIGRpc3BsYXlOYW1lOiAnV3JhaXRoJyxcbiAgfSk7XG4gIGJsdWVTbGltZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1MCxcbiAgICBzY2FsaW5nOiAxLFxuICAgIGNsYXNzOiAnc2xpbWUnLFxuICAgIGRpc3BsYXlOYW1lOiAnU2xpbWUnLFxuICB9KTtcbiAgd2VyZXRpZ2VyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDUxLFxuICAgIHNjYWxpbmc6IDEsXG4gICAgZGlzcGxheU5hbWU6ICdXZXJldGlnZXInLFxuICB9KTtcbiAgZ3JlZW5KZWxseSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1MixcbiAgICBzY2FsaW5nOiA0LFxuICAgIGNsYXNzOiAnamVsbHknLFxuICAgIGRpc3BsYXlOYW1lOiAnU2x1ZycsXG4gIH0pO1xuICByZWRTbGltZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1MyxcbiAgICBzY2FsaW5nOiA0LFxuICAgIGNsYXNzOiAnc2xpbWUnLFxuICAgIGRpc3BsYXlOYW1lOiAnUG9pc29uIFNsaW1lJyxcbiAgfSk7XG4gIHJvY2tHb2xlbSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1NCxcbiAgICBzY2FsaW5nOiA0LFxuICAgIGNsYXNzOiAnZ29sZW0nLFxuICAgIGRpc3BsYXlOYW1lOiAnTXVkIEdvbGVtJyxcbiAgfSk7XG4gIGJsdWVCYXQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTUsXG4gICAgc2NhbGluZzogNCxcbiAgICBkaXNwbGF5TmFtZTogJ0JhdCcsXG4gIH0pO1xuICBncmVlbld5dmVybiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1NixcbiAgICBzY2FsaW5nOiA0LFxuICAgIGNsYXNzOiAnd3l2ZXJuJyxcbiAgICBkaXNwbGF5TmFtZTogJ1d5dmVybicsXG4gIH0pO1xuICB2YW1waXJlMSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1NyxcbiAgICBzY2FsaW5nOiA1LFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ1ZhbXBpcmUnLFxuICB9KTtcbiAgb3JjID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDU4LFxuICAgIHNjYWxpbmc6IDYsXG4gICAgZGlzcGxheU5hbWU6ICdBeGUgV2VyZWJvYXInLFxuICB9KTtcbiAgcmVkTW9zcXVpdG8gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTksXG4gICAgc2NhbGluZzogMTAsXG4gICAgY2xhc3M6ICdtb3NxdWl0bycsXG4gICAgZGlzcGxheU5hbWU6ICdNb3NxdWl0bycsXG4gIH0pO1xuICBibHVlTXVzaHJvb20gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NWEsXG4gICAgc2NhbGluZzogMTAsXG4gICAgY2xhc3M6ICdtdXNocm9vbScsXG4gICAgZGlzcGxheU5hbWU6ICdNdXNocm9vbScsXG4gIH0pO1xuICBzd2FtcFRvbWF0byA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1YixcbiAgICBzY2FsaW5nOiAxMC4sXG4gICAgZGlzcGxheU5hbWU6ICdQaWxsYnVnJyxcbiAgfSk7XG4gIGJsdWVNb3NxdWl0byA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1YyxcbiAgICBzY2FsaW5nOiAyMyxcbiAgICBjbGFzczogJ21vc3F1aXRvJyxcbiAgICBkaXNwbGF5TmFtZTogJ01vc3F1aXRvJyxcbiAgfSk7XG4gIHN3YW1wUGxhbnQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NWQsXG4gICAgc2NhbGluZzogMTAsXG4gICAgZGlzcGxheU5hbWU6ICdTd2FtcCBEYW5kZWxpb24nLFxuICB9KTtcbiAgZ2lhbnRJbnNlY3QgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NWUsXG4gICAgc2NhbGluZzogMTEsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnR2lhbnQgSW5zZWN0JyxcbiAgfSk7XG4gIGxhcmdlQmx1ZVNsaW1lID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDVmLFxuICAgIHNjYWxpbmc6IDExLFxuICAgIGNsYXNzOiAnc2xpbWUnLFxuICAgIGRpc3BsYXlOYW1lOiAnTGFyZ2UgU2xpbWUnLFxuICB9KTtcbiAgaWNlWm9tYmllID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDYwLFxuICAgIHNjYWxpbmc6IDEyLFxuICAgIGNsYXNzOiAnem9tYmllJyxcbiAgICBkaXNwbGF5TmFtZTogJ0ljZSBab21iaWUnLFxuICB9KTtcbiAgZ3JlZW5CcmFpbiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2MSxcbiAgICBzY2FsaW5nOiAxMixcbiAgICBjbGFzczogJ2JyYWluJyxcbiAgICBkaXNwbGF5TmFtZTogJ0JyYWluJyxcbiAgfSk7XG4gIGdyZWVuU3BpZGVyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDYyLFxuICAgIHNjYWxpbmc6IDEyLFxuICAgIGNsYXNzOiAnc3BpZGVyJyxcbiAgICBkaXNwbGF5TmFtZTogJ1NwaWRlcicsXG4gIH0pO1xuICByZWRXeXZlcm4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7IC8vIGFsc28gcHVycGxlP1xuICAgIGlkOiAweDYzLFxuICAgIHNjYWxpbmc6IDEyLFxuICAgIGNsYXNzOiAnd3l2ZXJuJyxcbiAgICBkaXNwbGF5TmFtZTogJ1d5dmVybicsXG4gIH0pO1xuICBzb2xkaWVyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDY0LFxuICAgIHNjYWxpbmc6IDE0LFxuICAgIGNsYXNzOiAnc29sZGllcicsXG4gICAgZGlzcGxheU5hbWU6ICdEcmF5Z29uaWEgU29sZGllcicsXG4gIH0pO1xuICBpY2VFbnRpdHkgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjUsXG4gICAgc2NhbGluZzogMTQsXG4gICAgY2xhc3M6ICdlbnRpdHknLFxuICAgIGRpc3BsYXlOYW1lOiAnSWNlIFBsYW50JyxcbiAgfSk7XG4gIHJlZEJyYWluID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDY2LFxuICAgIHNjYWxpbmc6IDE0LFxuICAgIGNsYXNzOiAnYnJhaW4nLFxuICAgIGRpc3BsYXlOYW1lOiAnUG9pc29uIEJyYWluJyxcbiAgfSk7XG4gIGljZUdvbGVtID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDY3LFxuICAgIHNjYWxpbmc6IDE0LFxuICAgIGNsYXNzOiAnZ29sZW0nLFxuICAgIGRpc3BsYXlOYW1lOiAnSWNlIEdvbGVtJyxcbiAgfSk7XG4gIGtlbGJlc3F1ZTEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjgsXG4gICAgc2NhbGluZzogMTUsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnR2VuZXJhbCBLZWxiZXNxdWUnLFxuICB9KTtcbiAgbGFyZ2VSZWRTbGltZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2OSxcbiAgICBzY2FsaW5nOiAxOCxcbiAgICBjbGFzczogJ3NsaW1lJyxcbiAgICBkaXNwbGF5TmFtZTogJ0xhcmdlIFBvaXNvbiBTbGltZScsXG4gIH0pO1xuICB0cm9sbCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2YSxcbiAgICBzY2FsaW5nOiAxOCxcbiAgICBkaXNwbGF5TmFtZTogJ1Ryb2xsJyxcbiAgfSk7XG4gIHJlZEplbGx5ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDZiLFxuICAgIHNjYWxpbmc6IDE4LFxuICAgIGNsYXNzOiAnamVsbHknLFxuICAgIGRpc3BsYXlOYW1lOiAnUG9pc29uIEplbGx5JyxcbiAgfSk7XG4gIG1lZHVzYSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2YyxcbiAgICBzY2FsaW5nOiAxOSxcbiAgICBkaXNwbGF5TmFtZTogJ01lZHVzYScsXG4gIH0pO1xuICBjcmFiID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDZkLFxuICAgIHNjYWxpbmc6IDE5LFxuICAgIGRpc3BsYXlOYW1lOiAnQ3JhYicsXG4gIH0pO1xuICBtZWR1c2FIZWFkID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDZlLFxuICAgIHNjYWxpbmc6IDIwLFxuICAgIGRpc3BsYXlOYW1lOiAnRmx5aW5nIFBsYW50JyxcbiAgfSk7XG4gIGJpcmQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NmYsXG4gICAgc2NhbGluZzogMjAsXG4gICAgY2xhc3M6ICdiaXJkJyxcbiAgICBkaXNwbGF5TmFtZTogJ0JpcmQnLFxuICB9KTtcbiAgcmVkTXVzaHJvb20gPSBuZXcgTW9uc3Rlcih0aGlzLCB7IC8vIGFsc28gcHVycGxlXG4gICAgaWQ6IDB4NzEsXG4gICAgc2NhbGluZzogMjEsXG4gICAgY2xhc3M6ICdtdXNocm9vbScsXG4gICAgZGlzcGxheU5hbWU6ICdQb2lzb24gTXVzaHJvb20nLFxuICB9KTtcbiAgZWFydGhFbnRpdHkgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NzIsXG4gICAgc2NhbGluZzogMjIsXG4gICAgY2xhc3M6ICdlbnRpdHknLFxuICAgIGRpc3BsYXlOYW1lOiAnUG9pc29uIFBsYW50JyxcbiAgfSk7XG4gIG1pbWljID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDczLFxuICAgIHNjYWxpbmc6IDIyLFxuICAgIGRpc3BsYXlOYW1lOiAnTWltaWMnLFxuICB9KTtcbiAgcmVkU3BpZGVyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDc0LFxuICAgIHNjYWxpbmc6IDIyLFxuICAgIGNsYXNzOiAnc3BpZGVyJyxcbiAgICBkaXNwbGF5TmFtZTogJ1BhcmFseXppbmcgU3BpZGVyJyxcbiAgfSk7XG4gIGZpc2htYW4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NzUsXG4gICAgc2NhbGluZzogMjUsXG4gICAgZGlzcGxheU5hbWU6ICdNdXRhbnQgRmlzaCcsXG4gIH0pO1xuICBqZWxseWZpc2ggPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NzYsXG4gICAgc2NhbGluZzogMjUsXG4gICAgZGlzcGxheU5hbWU6ICdKZWxseWZpc2gnLFxuICB9KTtcbiAga3Jha2VuID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDc3LFxuICAgIHNjYWxpbmc6IDI1LFxuICAgIGRpc3BsYXlOYW1lOiAnS3Jha2VuJyxcbiAgfSk7XG4gIGRhcmtHcmVlbld5dmVybiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3OCxcbiAgICBzY2FsaW5nOiAyNyxcbiAgICBjbGFzczogJ3d5dmVybicsXG4gICAgZGlzcGxheU5hbWU6ICdXeXZlcm4gTWFnZScsXG4gIH0pO1xuICBzYW5kWm9tYmllID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDc5LFxuICAgIHNjYWxpbmc6IDM4LFxuICAgIGNsYXNzOiAnem9tYmllJyxcbiAgICBkaXNwbGF5TmFtZTogJ1NhbmQgWm9tYmllJyxcbiAgfSk7XG4gIHdyYWl0aFNoYWRvdzEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4N2IsXG4gICAgc2NhbGluZzogMjgsXG4gICAgY2xhc3M6ICd3cmFpdGgnLFxuICAgIGRpc3BsYXlOYW1lOiAnU2hhZG93JyxcbiAgfSk7XG4gIG1vdGggPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4N2MsXG4gICAgc2NhbGluZzogMjgsXG4gICAgZGlmZmljdWx0eTogMyxcbiAgICBkaXNwbGF5TmFtZTogJ0J1dHRlcmZseScsXG4gIH0pO1xuICBzYWJlcmExID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDdkLFxuICAgIHNjYWxpbmc6IDI5LFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ0dlbmVyYWwgU2FiZXJhJyxcbiAgfSk7XG4gIHZlcnRpY2FsUGxhdGZvcm0gPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweDdlKTsgLy8gc2NhbGluZzogMjggP1xuICBob3Jpem90YWxQbGF0Zm9ybSA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4N2YpOyAvLyBzY2FsaW5nOiAyOCA/XG4gIGFyY2hlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4MCxcbiAgICBzY2FsaW5nOiAzMyxcbiAgICBjbGFzczogJ3NvbGRpZXInLFxuICAgIGRpc3BsYXlOYW1lOiAnRHJheWdvbmlhIEFyY2hlcicsXG4gIH0pO1xuICBib21iZXJCaXJkID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDgxLFxuICAgIHNjYWxpbmc6IDMzLFxuICAgIGNsYXNzOiAnYmlyZCcsXG4gICAgZGlzcGxheU5hbWU6ICdCb21iZXIgQmlyZCcsXG4gIH0pO1xuICBsYXZhQmxvYiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4MixcbiAgICBzY2FsaW5nOiAzNyxcbiAgICBjbGFzczogJ3B1ZGRsZScsXG4gICAgZGlzcGxheU5hbWU6ICdMYXZhIEJsb2InLFxuICB9KTtcbiAgZmxhaWxHdXkgPSBuZXcgTW9uc3Rlcih0aGlzLCB7IC8vIGxpemFyZCBtYW5cbiAgICBpZDogMHg4NCxcbiAgICBzY2FsaW5nOiAzNyxcbiAgICBkaXNwbGF5TmFtZTogJ0ZsYWlsIEd1eScsXG4gIH0pO1xuICBibHVlRXllID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDg1LFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIGNsYXNzOiAnZXllJyxcbiAgICBkaXNwbGF5TmFtZTogJ0JlaG9sZGVyJyxcbiAgfSk7XG4gIHNhbGFtYW5kZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ODYsXG4gICAgc2NhbGluZzogMzcsXG4gICAgZGlzcGxheU5hbWU6ICdTYWxhbWFuZGVyJyxcbiAgfSk7XG4gIHNvcmNlcm9yID0gbmV3IE1vbnN0ZXIodGhpcywgeyAvLyBidXJ0XG4gICAgaWQ6IDB4ODcsXG4gICAgc2NhbGluZzogMzcsXG4gICAgZGlzcGxheU5hbWU6ICdCdXJ0JyxcbiAgfSk7XG4gIG1hZG8xID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDg4LFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIGRpc3BsYXlOYW1lOiAnR2VuZXJhbCBNYWRvJyxcbiAgfSk7XG4gIGtuaWdodCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4OSxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICBkaWZmaWN1bHR5OiAxLFxuICAgIGRpc3BsYXlOYW1lOiAnTmluamEnLFxuICB9KTtcbiAgZGV2aWwgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OGEsXG4gICAgc2NhbGluZzogNDEsXG4gICAgZGlzcGxheU5hbWU6ICdEZXZpbCBCYXQnLFxuICB9KTtcbiAga2VsYmVzcXVlMiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4YixcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdHZW5lcmFsIEtlbGJlc3F1ZScsXG4gIH0pO1xuICB3cmFpdGhTaGFkb3cyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDhjLFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIGNsYXNzOiAnd3JhaXRoJyxcbiAgICBkaXNwbGF5TmFtZTogJ1NoYWRvdycsXG4gIH0pO1xuICBnbGl0Y2gxID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg4ZCk7IC8vIHNjYWxpbmc6IDQxID9cbiAgZ2xpdGNoMiA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4OGUpOyAvLyBzY2FsaW5nOiA0MSA/XG4gIGd1YXJkaWFuU3RhdHVlID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg4Zik7IC8vIHNjYWxpbmc6IDQxID9cbiAgc2FiZXJhMiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5MCxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdHZW5lcmFsIFNhYmVyYScsXG4gIH0pO1xuICB0YXJhbnR1bGEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTEsXG4gICAgc2NhbGluZzogNDEsXG4gICAgZGlzcGxheU5hbWU6ICdUYXJhbnR1bGEnLFxuICB9KTtcbiAgc2tlbGV0b24gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTIsXG4gICAgc2NhbGluZzogNDEsXG4gICAgZGlzcGxheU5hbWU6ICdTa2VsZXRvbicsXG4gIH0pO1xuICBtYWRvMiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5MyxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdHZW5lcmFsIE1hZG8nLFxuICB9KTtcbiAgcHVycGxlRXllID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk0LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIGNsYXNzOiAnZXllJyxcbiAgICBkaXNwbGF5TmFtZTogJ0JlaG9sZGVyJyxcbiAgfSk7XG4gIGZsYWlsS25pZ2h0ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk1LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIGRpc3BsYXlOYW1lOiAnRmxhaWwgS25pZ2h0JyxcbiAgfSk7XG4gIHNjb3JwaW9uID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk2LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIGRpc3BsYXlOYW1lOiAnU2NvcnBpb24nLFxuICB9KTtcbiAga2FybWluZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5NyxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdHZW5lcmFsIEthcm1pbmUnLFxuICB9KTtcbiAgc2FuZEJsb2IgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTgsXG4gICAgc2NhbGluZzogNDQsXG4gICAgY2xhc3M6ICdwdWRkbGUnLFxuICAgIGRpc3BsYXlOYW1lOiAnU2FuZCBCbG9iJyxcbiAgfSk7XG4gIG11bW15ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk5LFxuICAgIHNjYWxpbmc6IDQ0LFxuICAgIGRpc3BsYXlOYW1lOiAnTXVtbXknLFxuICB9KTtcbiAgd2FybG9jayA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5YSxcbiAgICBzY2FsaW5nOiA0NixcbiAgICBkaXNwbGF5TmFtZTogJ1dhcmxvY2snLFxuICB9KTtcbiAgZHJheWdvbjEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OWIsXG4gICAgc2NhbGluZzogNDUsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnRW1wZXJvciBEcmF5Z29uJyxcbiAgfSk7XG4gIHN0YXR1ZU9mU3VuID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg5Yyk7IC8vIHNjYWxpbmc6IDQ3ID9cbiAgc3RhdHVlT2ZNb29uID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg5ZCk7IC8vIHNjYWxpbmc6IDQ3ID9cbiAgZHJheWdvbjIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OWUsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnRW1wZXJvciBEcmF5Z29uJyxcbiAgfSk7XG4gIGNydW1ibGluZ1ZlcnRpY2FsUGxhdGZvcm0gPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweDlmKTsgLy8gc2NhbGluZzogNDcgP1xuICBicm93blJvYm90ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGEwLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIGRpZmZpY3VsdHk6IDEsXG4gICAgZGlzcGxheU5hbWU6ICdSb2JvdCBTZW50cnknLFxuICB9KTtcbiAgd2hpdGVSb2JvdCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhhMSxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICBkaXNwbGF5TmFtZTogJ1JvYm90IEVuZm9yY2VyJyxcbiAgfSk7XG4gIHRvd2VyU2VudGluZWwgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YTIsXG4gICAgc2NhbGluZzogNDcsXG4gICAgZGlzcGxheU5hbWU6ICdUb3dlciBTZW50aW5lbCcsXG4gIH0pO1xuICBoZWxpY29wdGVyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGEzLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIGRpc3BsYXlOYW1lOiAnUm9ib2NvcHRlcicsXG4gIH0pO1xuICBkeW5hID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGE0LFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ0RZTkEnLFxuICB9KTtcbiAgdmFtcGlyZTIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YTUsXG4gICAgc2NhbGluZzogMjgsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnVmFtcGlyZScsXG4gIH0pO1xuICBnbGl0Y2gzID0gbmV3IE9iamVjdERhdGEodGhpcywgMHhhNik7IC8vIHNjYWxpbmc6IDQxID9cbiAgZHluYVBvZCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhiNCxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdEWU5BIERlZmVuc2UgUG9kJyxcbiAgfSk7XG4gIGR5bmFDb3VudGVyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGI4LFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGR5bmFMYXNlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhiOSxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBkeW5hQnViYmxlID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGJhLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHZhbXBpcmUyQmF0ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGJjLFxuICAgIHNjYWxpbmc6IDI4LFxuICAgIC8vIHR5cGU6ICdwcm9qZWN0aWxlJywgLy8gb2Ygc29ydHMuLi4/XG4gIH0pO1xuICBicm93blJvYm90TGFzZXJTb3VyY2UgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YmUsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZHJheWdvbjJGaXJlYmFsbCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhiZixcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICB2YW1waXJlMUJhdCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjMSxcbiAgICBzY2FsaW5nOiA1LFxuICAgIC8vdHlwZTogJ3Byb2plY3RpbGUnLCAvLyBvZiBzb3J0c1xuICB9KTtcbiAgZ2lhbnRJbnNlY3RGaXJlYmFsbCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjMyxcbiAgICBzY2FsaW5nOiAxMSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBncmVlbk1vc3F1aXRvID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGM0LFxuICAgIHNjYWxpbmc6IDExLFxuICAgIC8vdHlwZTogJ3Byb2plY3RpbGUnLCAvLyBvZiBzb3J0c1xuICAgIGRpc3BsYXlOYW1lOiAnTW9zcXVpdG8nLFxuICB9KTtcbiAga2VsYmVzcXVlMVJvY2sgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzUsXG4gICAgc2NhbGluZzogMTUsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc2FiZXJhMUJhbGxzID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGM2LFxuICAgIHNjYWxpbmc6IDI5LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGtlbGJlc3F1ZTJGaXJlID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGM3LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHNhYmVyYTJGaXJlID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGM4LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHNhYmVyYTJCYWxscyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjOSxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBrYXJtaW5lQmFsbHMgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4Y2EsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc3RhdHVlQmFsbHMgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4Y2IsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZHJheWdvbjFMaWdodG5pbmcgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4Y2MsXG4gICAgc2NhbGluZzogNDUsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZHJheWdvbjJMYXNlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjZCxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBkcmF5Z29uMkJyZWF0aCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjZSxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBiaXJkQm9tYiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlMCxcbiAgICBzY2FsaW5nOiAzMyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBncmVlbk1vc3F1aXRvU2hvdCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlMixcbiAgICBzY2FsaW5nOiAxMSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBwYXJhbHlzaXNCZWFtID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGUzLFxuICAgIHNjYWxpbmc6IDI1LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHN0b25lR2F6ZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlNCxcbiAgICBzY2FsaW5nOiAxOSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICByb2NrR29sZW1Sb2NrID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGU1LFxuICAgIHNjYWxpbmc6IDQsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgY3Vyc2VCZWFtID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGU2LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIG1wRHJhaW5XZWIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTcsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZmlzaG1hblRyaWRlbnQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTgsXG4gICAgc2NhbGluZzogMjUsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgb3JjQXhlID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGU5LFxuICAgIHNjYWxpbmc6IDYsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc3dhbXBQb2xsZW4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZWEsXG4gICAgc2NhbGluZzogMTAsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgcGFyYWx5c2lzUG93ZGVyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGViLFxuICAgIHNjYWxpbmc6IDIzLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHNvbGRpZXJTd29yZCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlYyxcbiAgICBzY2FsaW5nOiAxNCxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBpY2VHb2xlbVJvY2sgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZWQsXG4gICAgc2NhbGluZzogMTQsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgdHJvbGxBeGUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZWUsXG4gICAgc2NhbGluZzogMTgsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAga3Jha2VuSW5rID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGVmLFxuICAgIHNjYWxpbmc6IDI1LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGFyY2hlckFycm93ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGYwLFxuICAgIHNjYWxpbmc6IDMzLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGtuaWdodFN3b3JkID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGYyLFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIG1vdGhSZXNpZHVlID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGYzLFxuICAgIHNjYWxpbmc6IDI4LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGJyb3duUm9ib3RMYXNlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmNCxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICB3aGl0ZVJvYm90TGFzZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjUsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgdG93ZXJTZW50aW5lbExhc2VyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGY2LFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHNrZWxldG9uU2hvdCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmNyxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBibG9iU2hvdCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmOCxcbiAgICBzY2FsaW5nOiAzNyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBmbGFpbEtuaWdodEZsYWlsID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGY5LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGZsYWlsR3V5RmxhaWwgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZmEsXG4gICAgc2NhbGluZzogMzcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgbWFkb1NodXJpa2VuID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGZjLFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGd1YXJkaWFuU3RhdHVlTWlzc2lsZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmZCxcbiAgICBzY2FsaW5nOiAzNixcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBkZW1vbldhbGxGaXJlID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGZlLFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20pIHtcbiAgICBzdXBlcigweDEwMCk7XG5cbiAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzKSB7XG4gICAgICBjb25zdCBvYmogPSB0aGlzW2tleSBhcyBrZXlvZiB0aGlzXTtcbiAgICAgIGlmICghKG9iaiBpbnN0YW5jZW9mIE9iamVjdERhdGEpKSBjb250aW51ZTtcbiAgICAgIG9iai5uYW1lID0gbG93ZXJDYW1lbFRvU3BhY2VzKGtleSk7XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCF0aGlzW2ldKSB7XG4gICAgICAgIHRoaXNbaV0gPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCBpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB3cml0ZSgpOiBNb2R1bGVbXSB7XG4gICAgY29uc3QgbW9kdWxlczogTW9kdWxlW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IG9iaiBvZiB0aGlzKSB7XG4gICAgICBtb2R1bGVzLnB1c2goLi4ub2JqLndyaXRlKCkpO1xuICAgIH1cbiAgICAvLyBJZiB3ZSdyZSBzdG9yaW5nIHRoZSBtb25zdGVyIG5hbWVzIHRoZW4gd2UgbmVlZCB0byBpbml0aWFsaXplIHRoZSBidWZmZXJcbiAgICAvLyBsZW5ndGguXG4gICAgaWYgKHRoaXMucm9tLndyaXRlTW9uc3Rlck5hbWVzKSB7XG4gICAgICBjb25zdCBhID0gdGhpcy5yb20uYXNzZW1ibGVyKCk7XG4gICAgICBjb25zdCBsb25nZXN0TmFtZSA9IE1hdGgubWF4KC4uLih0aGlzLm1hcChvID0+IG8uZGlzcGxheU5hbWUubGVuZ3RoKSkpO1xuICAgICAgY29uc3QgTUFYX0xFTkdUSCA9IDI3O1xuXG4gICAgICBpZiAobG9uZ2VzdE5hbWUgPiBNQVhfTEVOR1RIKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTG9uZ2VzdCBkaXNwbGF5TmFtZSBsZW5ndGggaXMgZ3JlYXRlciB0aGFuICR7TUFYX0xFTkdUSFxuICAgICAgICAgICAgfS4gKCR7bG9uZ2VzdE5hbWV9ID4gJHtNQVhfTEVOR1RIXG4gICAgICAgICAgICB9KVxcbkNyeXN0YWxpcyBIVUQgY2FuJ3QgY29tZm9ydGFibHkgZml0IHRoYXQgbWFueSBjaGFyYWN0ZXJzLmApO1xuICAgICAgfVxuICAgICAgYS5hc3NpZ24oJ0VORU1ZX05BTUVfTEVOR1RIJywgbG9uZ2VzdE5hbWUpO1xuICAgICAgYS5leHBvcnQoJ0VORU1ZX05BTUVfTEVOR1RIJyk7XG4gICAgICBhLnNlZ21lbnQoJzFhJylcbiAgICAgIGEucmVsb2MoJ0VuZW15TmFtZUJsb2NrbGlzdCcpXG4gICAgICBhLmxhYmVsKCdFbmVteU5hbWVCbG9ja2xpc3QnKVxuICAgICAgYS5leHBvcnQoJ0VuZW15TmFtZUJsb2NrbGlzdCcpXG4gICAgICBsZXQgYmxvY2tMaXN0TGVuID0gMDtcbiAgICAgIGZvciAoY29uc3Qgb2JqIG9mIHRoaXMpIHtcbiAgICAgICAgaWYgKG9iai5ocCA+IDAgJiYgb2JqLmRpc3BsYXlOYW1lID09ICcnKSB7XG4gICAgICAgICAgYS5ieXRlKG9iai5pZCk7XG4gICAgICAgICAgYmxvY2tMaXN0TGVuKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGEuYXNzaWduKCdFTkVNWV9OQU1FX0JMT0NLTElTVF9MRU4nLCBibG9ja0xpc3RMZW4pO1xuICAgICAgYS5leHBvcnQoJ0VORU1ZX05BTUVfQkxPQ0tMSVNUX0xFTicpO1xuXG4gICAgICBtb2R1bGVzLnB1c2goYS5tb2R1bGUoKSk7XG4gICAgfVxuICAgIHJldHVybiBtb2R1bGVzO1xuICB9XG59XG5cbi8vIGV4cG9ydCB0eXBlIE1vbnN0ZXJUeXBlID0gJ21vbnN0ZXInIHwgJ2Jvc3MnIHwgJ3Byb2plY3RpbGUnO1xuLy8gZXhwb3J0IHR5cGUgVGVycmFpbiA9ICd3YWxrJyB8ICdzd2ltJyB8ICdzb2FyJyB8ICdmbHV0dGVyJyB8ICdzdGFuZCc7XG5cbmV4cG9ydCB0eXBlIENvbnN0cmFpbnQgPSBNYXA8c3RyaW5nLCByZWFkb25seSBbcmVhZG9ubHkgbnVtYmVyW10sIGJvb2xlYW4gfCBudWxsXT47XG4vLyBrZXkgaXMgdHVwbGVbMF0uam9pbignLCcpXG4vLyB2YWx1ZVswXSBpcyBbW3F1YWQgZm9yIHJlcXVpcmVkIHBhdDAsIHBhdDEsIHBhbDIsIHBhbDNdXG4vLyB2YWx1ZVsxXSBpcyB0cnVlIGlmIG5lZWQgcGF0MSwgZmFsc2UgaWYgbmVlZCBwYXQwLCBudWxsIGlmIG5laXRoZXJcbi8vICAgLS0tPiBidXQgd2UgbmVlZCB0byBrZWVwIHRyYWNrIG9mIGEgaGFuZnVsIG9mIHNwYXducywgbm90IGp1c3QgdG9uZS5cblxuXG4gIC8vIG1vbnN0ZXIoMHg1MCwgJ0JsdWUgU2xpbWUnLCAweDIwLCA2LCB7XG4gIC8vICAgaGl0czogMSwgc2F0azogMTYsIGRnbGQ6IDIsIHNleHA6IDMyLFxuICAvLyAgIG11c3Q6IGFuZChwYXQoMHg2NCksIHBhbCgyLCAweDIxKSksXG4gIC8vIH0pO1xuICAvLyBtb25zdGVyKDB4NTEsICdXZXJldGlnZXInLCAweDI0LCA3LCB7XG4gIC8vICAgaGl0czogMS41LCBzYXRrOiAyMSwgZGdsZDogNCwgc2V4cDogNDAsXG4gIC8vICAgbXVzdDogYW5kKHBhdCgweDYwKSwgcGFsKDMsIDB4MjApKSxcbiAgLy8gfSk7XG4gIC8vIG1vbnN0ZXIoMHg1MiwgJ0dyZWVuIEplbGx5JywgMHgyMCwgMTAsIHtcbiAgLy8gICBzZGVmOiA0LCBoaXRzOiAzLCBzYXRrOiAxNiwgZGdsZDogNCwgc2V4cDogMzYsXG4gIC8vICAgbXVzdDogYW5kKHBhdCgweDY1KSwgcGFsKDIsIDB4MjIpKSxcbiAgLy8gfSk7XG4gIC8vIG1vbnN0ZXIoMHg1MywgJ1JlZCBTbGltZScsIDB4MjAsIDE2LCB7XG4gIC8vICAgc2RlZjogNiwgaGl0czogNCwgc2F0azogMTYsIGRnbGQ6IDQsIHNleHA6IDQ4LFxuICAvLyAgIG11c3Q6IGFuZChwYXQoMHg2NCksIHBhbCgyLCAweDIzKSksXG4gIC8vIH0pO1xuXG5cbi8vIGV4cG9ydCBpbnRlcmZhY2UgTW9uc3RlciB7XG4vLyAgIGlkOiBudW1iZXI7XG4vLyAgIG5hbWU6IHN0cmluZztcbi8vICAgYWN0aW9uOiBudW1iZXI7XG4vLyAgIGNvdW50OiBudW1iZXI7XG4vLyAgIHR5cGU/OiBNb25zdGVyVHlwZTsgLy8gZGVmYXVsdCBpcyBtb25zdGVyXG4vLyAgIG1vdmU/OiBUZXJyYWluOyAvLyBkZWZhdWx0IGlzIHdhbGtcbi8vICAgc2RlZj86IG51bWJlcjtcbi8vICAgc3dyZD86IG51bWJlcjtcbi8vICAgaGl0cz86IG51bWJlcjtcbi8vICAgc2F0az86IG51bWJlcjtcbi8vICAgZGdsZD86IG51bWJlcjtcbi8vICAgc2V4cD86IG51bWJlcjtcbi8vICAgZWxlbT86IG51bWJlcjtcbi8vICAgc3BkPzogbnVtYmVyO1xuLy8gICBzdGF0dXM6IG51bWJlcjtcbi8vICAgcGVyc2lzdD86IGJvb2xlYW47XG4vLyAgIG11c3Q/OiBDb25zdHJhaW50O1xuLy8gfVxuXG4vLyBpbnRlcmZhY2UgQWRqdXN0bWVudHMge1xuLy8gICB2YW5pbGxhTGV2ZWw/OiBudW1iZXI7XG4vLyAgIHZhbmlsbGFTd29yZD86IG51bWJlcjtcbi8vICAgc2RlZj86IG51bWJlcjtcbi8vICAgc3dyZD86IG51bWJlcjtcbi8vICAgaGl0cz86IG51bWJlcjtcbi8vICAgc2F0az86IG51bWJlcjtcbi8vICAgZGdsZD86IG51bWJlcjtcbi8vICAgc2V4cD86IG51bWJlcjtcbi8vICAgZWxlbT86IG51bWJlcjtcbi8vICAgc3BkPzogbnVtYmVyO1xuLy8gfVxuXG4vLyBpbnRlcmZhY2UgUGxheWVyU3RhdHMge1xuLy8gICBhcm1vcjogbnVtYmVyO1xuLy8gICBsZXZlbDogbnVtYmVyO1xuLy8gICBzaGllbGQ6IG51bWJlcjtcbi8vICAgc3dvcmQ6IG51bWJlcjtcbi8vIH1cblxuLy8gY29uc3QgVkFOSUxMQV9TV09SRFMgPSBbMiwgMiwgMiwgMiwgNCwgNCwgNCwgOCwgOCwgOCwgOCwgMTYsIDE2LCAxNiwgMTYsIDE2XTtcblxuLy8gY29uc3Qge30gPSB7VkFOSUxMQV9TV09SRFN9IGFzIGFueTtcblxuLy8gZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pOiBNb25zdGVyW10ge1xuLy8gICBjb25zdCB7fSA9IHtyb20sIGZsYWdzLCByYW5kb219IGFzIGFueTtcblxuLy8gICBjb25zdCBvdXQ6IE1vbnN0ZXJbXSA9IFtdO1xuXG4vLyAgIGNvbnN0IHBsYXllcjogUGxheWVyU3RhdHMgPSB7XG4vLyAgICAgYXJtb3I6IDIsXG4vLyAgICAgbGV2ZWw6IDEsXG4vLyAgICAgc2hpZWxkOiAyLFxuLy8gICAgIHN3b3JkOiAyLFxuLy8gICB9O1xuXG4vLyAgIGZ1bmN0aW9uIGJhc2UoaWQ6IG51bWJlciwgbmFtZTogc3RyaW5nLCBhZGo6IEFkanVzdG1lbnRzID0ge30pIHtcbi8vICAgICBjb25zdCBvID0gcm9tLm9iamVjdHNbaWRdO1xuLy8gICAgIGxldCB7YWN0aW9uLCBpbW1vYmlsZSwgbGV2ZWwsIGF0aywgZGVmLCBocCxcbi8vICAgICAgICAgIGVsZW1lbnRzLCBnb2xkRHJvcCwgZXhwUmV3YXJkLCBzdGF0dXNFZmZlY3R9ID0gbztcblxuLy8gICAgIC8vIC8vIFdoYXQgbGV2ZWwgc2hvdWxkIHRoZSBwbGF5ZXIgYmUgYXQgd2hlbiBlbmNvdW50ZXJpbmcgdGhpcyBpbiB2YW5pbGxhP1xuLy8gICAgIC8vIGlmIChhZGoudmFuaWxsYUxldmVsKSBsZXZlbCA9IGFkai52YW5pbGxhTGV2ZWw7XG4vLyAgICAgbGV2ZWwgPSBwbGF5ZXIubGV2ZWw7XG5cbi8vICAgICAvLyBXaGF0IHN3b3JkIHdvdWxkIHRoZXkgYmUgdXNpbmc/ICBQaWNrIHRoZSBoaWdoZXN0IG5vbi1pbW11bmUgc3dvcmQgdGhhdFxuLy8gICAgIC8vIHdvdWxkIGJlIGF2YWlsYWJsZSBhdCB0aGlzIHBvaW50IGluIHRoZSBnYW1lLlxuLy8gICAgIGxldCBzd29yZCA9IHBsYXllci5zd29yZDtcbi8vICAgICB3aGlsZSAoc3dvcmQgPiAxICYmIChlbGVtZW50cyAmIChzd29yZCA+Pj4gMSkpKSB7XG4vLyAgICAgICBzd29yZCA+Pj49IDE7XG4vLyAgICAgfVxuLy8gICAgIGlmIChhZGoudmFuaWxsYVN3b3JkKSBzd29yZCA9IGFkai52YW5pbGxhU3dvcmQ7XG4vLyAgICAgY29uc3QgcGF0ayA9IHN3b3JkICsgbGV2ZWw7IC8vIGV4cGVjdGVkIHBsYXllciBhdHRhY2tcblxuLy8gICAgIC8vIEhvdyBtYW55IGhpdHMgd291bGQgaXQgdGFrZSB0byBraWxsIGluIHZhbmlsbGE/IChjb25zaWRlciBubyBmbG9vcj8pXG4vLyAgICAgY29uc3QgdmFuaWxsYUhpdHMgPSBNYXRoLmZsb29yKChocCArIDEpIC8gKHBhdGsgLSBkZWYpKTtcbi8vICAgICBjb25zdCBoaXRzID0gYWRqLmhpdHMgfHwgdmFuaWxsYUhpdHM7XG5cbi8vICAgICAvLyBTY2FsZWQgZGVmZW5zZSAod2lsbCBiZSBzdG9yZWQgaW4gZWlnaHRocylcbi8vICAgICBjb25zdCBzZGVmID0gYWRqLnNkZWYgIT0gbnVsbCA/IGFkai5zZGVmIDogZGVmIC8gcGF0azsgLy8gbm9ybWFsbHkgKjhcblxuLy8gICAgIC8vIEV4cGVjdGVkIHBsYXllciBIUCBhbmQgZGVmZW5zZSBhdCB2YW5pbGxhIGxldmVsXG4vLyAgICAgY29uc3QgcGhwID0gTWF0aC5taW4oMjU1LCAzMiArIDE2ICogbGV2ZWwpO1xuLy8gICAgIGNvbnN0IHBkZWYgPSBvLmF0dGFja1R5cGUgPyBwbGF5ZXIuc2hpZWxkIDogcGxheWVyLmFybW9yO1xuLy8gICAgIGNvbnN0IHZhbmlsbGFEYW1hZ2UgPSBNYXRoLm1heCgwLCBhdGsgLSBsZXZlbCAtIHBkZWYpIC8gcGhwO1xuLy8gICAgIGNvbnN0IHNhdGsgPSBhZGouc2F0ayAhPSBudWxsID8gYWRqLnNhdGsgOiB2YW5pbGxhRGFtYWdlOyAvLyBub3JtYWxseSAqMTI4XG5cbi8vICAgICAvLyBUT0RPIC0gdGhlbiBjb21wdXRlIGdvbGQvZXhwXG5cbi8vICAgICBjb25zdCB7fSA9IHtzZGVmLCBzYXRrLCBoaXRzLCBpbW1vYmlsZSwgZ29sZERyb3AsIGV4cFJld2FyZCwgc3RhdHVzRWZmZWN0fSBhcyBhbnk7XG5cbi8vICAgICBjb25zdCBtOiBNb25zdGVyID0ge2lkLCBuYW1lfSBhcyBhbnk7XG5cbi8vICAgICBtLmlkID0gaWQ7XG4vLyAgICAgbS5uYW1lID0gbmFtZTtcbi8vICAgICBtLnR5cGUgPSAnbW9uc3Rlcic7XG4vLyAgICAgbS5hY3Rpb24gPSBhY3Rpb247XG4vLyAgICAgbS5jb3VudCA9IDA7IC8vIGNvdW50O1xuLy8gICAgIG91dC5wdXNoKG0pO1xuLy8gICB9XG5cbi8vICAgLy8gVE9ETyAtIGFkZGl0aW9uYWwgY29uc3RyYWludHMgYWJvdXQgZS5nLiBwbGFjZW1lbnQsIGV0Yz9cbi8vICAgLy8gICAgICAtIG5vIFggb24gWSBsZXZlbC4uLj9cblxuLy8gICByZXR1cm4gb3V0O1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBhbmQoeDogQ29uc3RyYWludCwgeTogQ29uc3RyYWludCk6IENvbnN0cmFpbnQge1xuLy8gICByZXR1cm4gW107XG4vLyB9XG4vLyBmdW5jdGlvbiBwYXQoaWQ6IG51bWJlcik6IENvbnN0cmFpbnQge1xuLy8gICByZXR1cm4gW107XG4vLyB9XG4vLyBmdW5jdGlvbiBwYWwod2hpY2g6IG51bWJlciwgaWQ6IG51bWJlcik6IENvbnN0cmFpbnQge1xuLy8gICByZXR1cm4gW107XG4vLyB9XG5cbi8vIGNvbnN0IHt9ID0ge2FuZCwgcGF0LCBwYWx9IGFzIGFueTtcbiJdfQ==