import { ObjectData } from './objectdata.js';
import { Monster } from './monster.js';
import { lowerCamelToSpaces } from './util.js';
import { EntityArray } from './entity.js';
export class Objects extends EntityArray {
    constructor(rom) {
        super(0x100);
        this.rom = rom;
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
            displayName: 'Draygon',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9yb20vb2JqZWN0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN2QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDL0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQVkxQyxNQUFNLE9BQU8sT0FBUSxTQUFRLFdBQXVCO0lBMnJCbEQsWUFBcUIsR0FBUTtRQUMzQixLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFETSxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBenJCN0IsaUJBQVksR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDL0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILFlBQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDMUIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxRQUFRO1lBQ2YsV0FBVyxFQUFFLFFBQVE7U0FDdEIsQ0FBQyxDQUFDO1FBQ0gsMEJBQXFCLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxZQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzFCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxLQUFLLEVBQUUsUUFBUTtZQUNmLFdBQVcsRUFBRSxRQUFRO1NBQ3RCLENBQUMs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Q0FBQyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQzlCLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztZQUNyQixLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRTtnQkFDdEIsSUFBSSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsV0FBVyxJQUFJLEVBQUUsRUFBRTtvQkFDdkMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ2YsWUFBWSxFQUFFLENBQUM7aUJBQ2hCO2FBQ0Y7WUFDRCxDQUFDLENBQUMsTUFBTSxDQUFDLDBCQUEwQixFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ25ELENBQUMsQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUVyQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1NBQzFCO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbi8vIGltcG9ydCB7UmFuZG9tfSBmcm9tICcuLi9yYW5kb20uanMnO1xuaW1wb3J0IHsgUm9tIH0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7IE9iamVjdERhdGEgfSBmcm9tICcuL29iamVjdGRhdGEuanMnO1xuaW1wb3J0IHsgTW9uc3RlciB9IGZyb20gJy4vbW9uc3Rlci5qcyc7XG5pbXBvcnQgeyBsb3dlckNhbWVsVG9TcGFjZXMgfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHsgRW50aXR5QXJyYXkgfSBmcm9tICcuL2VudGl0eS5qcyc7XG5pbXBvcnQgeyBNb2R1bGUgfSBmcm9tICcuLi9hc20vbW9kdWxlLmpzJztcblxuLy8gTWFudWFsIGRhdGEgYWJvdXQgbW9uc3RlcnMuICBFdmVyeSBtb25zdGVyIG5lZWRzIGF0IGxlYXN0IGFuIElELXRvLW5hbWUgbWFwcGluZyxcbi8vIFdlIGFsc28gY2FuJ3QgZXhwZWN0IHRvIGdldCB0aGUgZGlmZmljdWx0eSBtYXBwaW5nIGF1dG9tYXRpY2FsbHksIHNvIHRoYXQnc1xuLy8gaW5jbHVkZWQgaGVyZSwgdG9vLlxuXG4vLyBUT0RPIC0gYWN0aW9uIHNjcmlwdCB0eXBlc1xuLy8gICAgICAtPiBjb21wYXRpYmlsaXR5IHdpdGggb3RoZXIgbW9uc3RlcnNcbi8vICAgICAgICAgY29uc3RyYWludHMgb24gZXh0cmEgYXR0cmlidXRlc1xuLy8gICAgICAgICBkaWZmaWN1bHR5IHJhdGluZ3NcblxuZXhwb3J0IGNsYXNzIE9iamVjdHMgZXh0ZW5kcyBFbnRpdHlBcnJheTxPYmplY3REYXRhPiB7XG5cbiAgc29yY2Vyb3JTaG90ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDNmLFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHdyYWl0aDEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NGIsXG4gICAgc2NhbGluZzogMjQsXG4gICAgY2xhc3M6ICd3cmFpdGgnLFxuICAgIGRpc3BsYXlOYW1lOiAnV3JhaXRoJyxcbiAgfSk7XG4gIHBhcmFseXNpc1Bvd2RlclNvdXJjZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg0ZCxcbiAgICBzY2FsaW5nOiAyMyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICB3cmFpdGgyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDRmLFxuICAgIHNjYWxpbmc6IDI4LFxuICAgIGNsYXNzOiAnd3JhaXRoJyxcbiAgICBkaXNwbGF5TmFtZTogJ1dyYWl0aCcsXG4gIH0pO1xuICBibHVlU2xpbWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTAsXG4gICAgc2NhbGluZzogMSxcbiAgICBjbGFzczogJ3NsaW1lJyxcbiAgICBkaXNwbGF5TmFtZTogJ1NsaW1lJyxcbiAgfSk7XG4gIHdlcmV0aWdlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1MSxcbiAgICBzY2FsaW5nOiAxLFxuICAgIGRpc3BsYXlOYW1lOiAnV2VyZXRpZ2VyJyxcbiAgfSk7XG4gIGdyZWVuSmVsbHkgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTIsXG4gICAgc2NhbGluZzogNCxcbiAgICBjbGFzczogJ2plbGx5JyxcbiAgICBkaXNwbGF5TmFtZTogJ1NsdWcnLFxuICB9KTtcbiAgcmVkU2xpbWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTMsXG4gICAgc2NhbGluZzogNCxcbiAgICBjbGFzczogJ3NsaW1lJyxcbiAgICBkaXNwbGF5TmFtZTogJ1BvaXNvbiBTbGltZScsXG4gIH0pO1xuICByb2NrR29sZW0gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTQsXG4gICAgc2NhbGluZzogNCxcbiAgICBjbGFzczogJ2dvbGVtJyxcbiAgICBkaXNwbGF5TmFtZTogJ011ZCBHb2xlbScsXG4gIH0pO1xuICBibHVlQmF0ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDU1LFxuICAgIHNjYWxpbmc6IDQsXG4gICAgZGlzcGxheU5hbWU6ICdCYXQnLFxuICB9KTtcbiAgZ3JlZW5XeXZlcm4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTYsXG4gICAgc2NhbGluZzogNCxcbiAgICBjbGFzczogJ3d5dmVybicsXG4gICAgZGlzcGxheU5hbWU6ICdXeXZlcm4nLFxuICB9KTtcbiAgdmFtcGlyZTEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTcsXG4gICAgc2NhbGluZzogNSxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdWYW1waXJlJyxcbiAgfSk7XG4gIG9yYyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1OCxcbiAgICBzY2FsaW5nOiA2LFxuICAgIGRpc3BsYXlOYW1lOiAnQXhlIFdlcmVib2FyJyxcbiAgfSk7XG4gIHJlZE1vc3F1aXRvID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDU5LFxuICAgIHNjYWxpbmc6IDEwLFxuICAgIGNsYXNzOiAnbW9zcXVpdG8nLFxuICAgIGRpc3BsYXlOYW1lOiAnTW9zcXVpdG8nLFxuICB9KTtcbiAgYmx1ZU11c2hyb29tID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDVhLFxuICAgIHNjYWxpbmc6IDEwLFxuICAgIGNsYXNzOiAnbXVzaHJvb20nLFxuICAgIGRpc3BsYXlOYW1lOiAnTXVzaHJvb20nLFxuICB9KTtcbiAgc3dhbXBUb21hdG8gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NWIsXG4gICAgc2NhbGluZzogMTAuLFxuICAgIGRpc3BsYXlOYW1lOiAnUGlsbGJ1ZycsXG4gIH0pO1xuICBibHVlTW9zcXVpdG8gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NWMsXG4gICAgc2NhbGluZzogMjMsXG4gICAgY2xhc3M6ICdtb3NxdWl0bycsXG4gICAgZGlzcGxheU5hbWU6ICdNb3NxdWl0bycsXG4gIH0pO1xuICBzd2FtcFBsYW50ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDVkLFxuICAgIHNjYWxpbmc6IDEwLFxuICAgIGRpc3BsYXlOYW1lOiAnU3dhbXAgRGFuZGVsaW9uJyxcbiAgfSk7XG4gIGdpYW50SW5zZWN0ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDVlLFxuICAgIHNjYWxpbmc6IDExLFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ0dpYW50IEluc2VjdCcsXG4gIH0pO1xuICBsYXJnZUJsdWVTbGltZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1ZixcbiAgICBzY2FsaW5nOiAxMSxcbiAgICBjbGFzczogJ3NsaW1lJyxcbiAgICBkaXNwbGF5TmFtZTogJ0xhcmdlIFNsaW1lJyxcbiAgfSk7XG4gIGljZVpvbWJpZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2MCxcbiAgICBzY2FsaW5nOiAxMixcbiAgICBjbGFzczogJ3pvbWJpZScsXG4gICAgZGlzcGxheU5hbWU6ICdJY2UgWm9tYmllJyxcbiAgfSk7XG4gIGdyZWVuQnJhaW4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjEsXG4gICAgc2NhbGluZzogMTIsXG4gICAgY2xhc3M6ICdicmFpbicsXG4gICAgZGlzcGxheU5hbWU6ICdCcmFpbicsXG4gIH0pO1xuICBncmVlblNwaWRlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2MixcbiAgICBzY2FsaW5nOiAxMixcbiAgICBjbGFzczogJ3NwaWRlcicsXG4gICAgZGlzcGxheU5hbWU6ICdTcGlkZXInLFxuICB9KTtcbiAgcmVkV3l2ZXJuID0gbmV3IE1vbnN0ZXIodGhpcywgeyAvLyBhbHNvIHB1cnBsZT9cbiAgICBpZDogMHg2MyxcbiAgICBzY2FsaW5nOiAxMixcbiAgICBjbGFzczogJ3d5dmVybicsXG4gICAgZGlzcGxheU5hbWU6ICdXeXZlcm4nLFxuICB9KTtcbiAgc29sZGllciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2NCxcbiAgICBzY2FsaW5nOiAxNCxcbiAgICBjbGFzczogJ3NvbGRpZXInLFxuICAgIGRpc3BsYXlOYW1lOiAnRHJheWdvbmlhIFNvbGRpZXInLFxuICB9KTtcbiAgaWNlRW50aXR5ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDY1LFxuICAgIHNjYWxpbmc6IDE0LFxuICAgIGNsYXNzOiAnZW50aXR5JyxcbiAgICBkaXNwbGF5TmFtZTogJ0ljZSBQbGFudCcsXG4gIH0pO1xuICByZWRCcmFpbiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2NixcbiAgICBzY2FsaW5nOiAxNCxcbiAgICBjbGFzczogJ2JyYWluJyxcbiAgICBkaXNwbGF5TmFtZTogJ1BvaXNvbiBCcmFpbicsXG4gIH0pO1xuICBpY2VHb2xlbSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2NyxcbiAgICBzY2FsaW5nOiAxNCxcbiAgICBjbGFzczogJ2dvbGVtJyxcbiAgICBkaXNwbGF5TmFtZTogJ0ljZSBHb2xlbScsXG4gIH0pO1xuICBrZWxiZXNxdWUxID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDY4LFxuICAgIHNjYWxpbmc6IDE1LFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ0dlbmVyYWwgS2VsYmVzcXVlJyxcbiAgfSk7XG4gIGxhcmdlUmVkU2xpbWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjksXG4gICAgc2NhbGluZzogMTgsXG4gICAgY2xhc3M6ICdzbGltZScsXG4gICAgZGlzcGxheU5hbWU6ICdMYXJnZSBQb2lzb24gU2xpbWUnLFxuICB9KTtcbiAgdHJvbGwgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NmEsXG4gICAgc2NhbGluZzogMTgsXG4gICAgZGlzcGxheU5hbWU6ICdUcm9sbCcsXG4gIH0pO1xuICByZWRKZWxseSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2YixcbiAgICBzY2FsaW5nOiAxOCxcbiAgICBjbGFzczogJ2plbGx5JyxcbiAgICBkaXNwbGF5TmFtZTogJ1BvaXNvbiBKZWxseScsXG4gIH0pO1xuICBtZWR1c2EgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NmMsXG4gICAgc2NhbGluZzogMTksXG4gICAgZGlzcGxheU5hbWU6ICdNZWR1c2EnLFxuICB9KTtcbiAgY3JhYiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2ZCxcbiAgICBzY2FsaW5nOiAxOSxcbiAgICBkaXNwbGF5TmFtZTogJ0NyYWInLFxuICB9KTtcbiAgbWVkdXNhSGVhZCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2ZSxcbiAgICBzY2FsaW5nOiAyMCxcbiAgICBkaXNwbGF5TmFtZTogJ0ZseWluZyBQbGFudCcsXG4gIH0pO1xuICBiaXJkID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDZmLFxuICAgIHNjYWxpbmc6IDIwLFxuICAgIGNsYXNzOiAnYmlyZCcsXG4gICAgZGlzcGxheU5hbWU6ICdCaXJkJyxcbiAgfSk7XG4gIHJlZE11c2hyb29tID0gbmV3IE1vbnN0ZXIodGhpcywgeyAvLyBhbHNvIHB1cnBsZVxuICAgIGlkOiAweDcxLFxuICAgIHNjYWxpbmc6IDIxLFxuICAgIGNsYXNzOiAnbXVzaHJvb20nLFxuICAgIGRpc3BsYXlOYW1lOiAnUG9pc29uIE11c2hyb29tJyxcbiAgfSk7XG4gIGVhcnRoRW50aXR5ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDcyLFxuICAgIHNjYWxpbmc6IDIyLFxuICAgIGNsYXNzOiAnZW50aXR5JyxcbiAgICBkaXNwbGF5TmFtZTogJ1BvaXNvbiBQbGFudCcsXG4gIH0pO1xuICBtaW1pYyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3MyxcbiAgICBzY2FsaW5nOiAyMixcbiAgICBkaXNwbGF5TmFtZTogJ01pbWljJyxcbiAgfSk7XG4gIHJlZFNwaWRlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3NCxcbiAgICBzY2FsaW5nOiAyMixcbiAgICBjbGFzczogJ3NwaWRlcicsXG4gICAgZGlzcGxheU5hbWU6ICdQYXJhbHl6aW5nIFNwaWRlcicsXG4gIH0pO1xuICBmaXNobWFuID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDc1LFxuICAgIHNjYWxpbmc6IDI1LFxuICAgIGRpc3BsYXlOYW1lOiAnTXV0YW50IEZpc2gnLFxuICB9KTtcbiAgamVsbHlmaXNoID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDc2LFxuICAgIHNjYWxpbmc6IDI1LFxuICAgIGRpc3BsYXlOYW1lOiAnSmVsbHlmaXNoJyxcbiAgfSk7XG4gIGtyYWtlbiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3NyxcbiAgICBzY2FsaW5nOiAyNSxcbiAgICBkaXNwbGF5TmFtZTogJ0tyYWtlbicsXG4gIH0pO1xuICBkYXJrR3JlZW5XeXZlcm4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NzgsXG4gICAgc2NhbGluZzogMjcsXG4gICAgY2xhc3M6ICd3eXZlcm4nLFxuICAgIGRpc3BsYXlOYW1lOiAnV3l2ZXJuIE1hZ2UnLFxuICB9KTtcbiAgc2FuZFpvbWJpZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3OSxcbiAgICBzY2FsaW5nOiAzOCxcbiAgICBjbGFzczogJ3pvbWJpZScsXG4gICAgZGlzcGxheU5hbWU6ICdTYW5kIFpvbWJpZScsXG4gIH0pO1xuICB3cmFpdGhTaGFkb3cxID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDdiLFxuICAgIHNjYWxpbmc6IDI4LFxuICAgIGNsYXNzOiAnd3JhaXRoJyxcbiAgICBkaXNwbGF5TmFtZTogJ1NoYWRvdycsXG4gIH0pO1xuICBtb3RoID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDdjLFxuICAgIHNjYWxpbmc6IDI4LFxuICAgIGRpZmZpY3VsdHk6IDMsXG4gICAgZGlzcGxheU5hbWU6ICdCdXR0ZXJmbHknLFxuICB9KTtcbiAgc2FiZXJhMSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3ZCxcbiAgICBzY2FsaW5nOiAyOSxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdHZW5lcmFsIFNhYmVyYScsXG4gIH0pO1xuICB2ZXJ0aWNhbFBsYXRmb3JtID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg3ZSk7IC8vIHNjYWxpbmc6IDI4ID9cbiAgaG9yaXpvdGFsUGxhdGZvcm0gPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweDdmKTsgLy8gc2NhbGluZzogMjggP1xuICBhcmNoZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ODAsXG4gICAgc2NhbGluZzogMzMsXG4gICAgY2xhc3M6ICdzb2xkaWVyJyxcbiAgICBkaXNwbGF5TmFtZTogJ0RyYXlnb25pYSBBcmNoZXInLFxuICB9KTtcbiAgYm9tYmVyQmlyZCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4MSxcbiAgICBzY2FsaW5nOiAzMyxcbiAgICBjbGFzczogJ2JpcmQnLFxuICAgIGRpc3BsYXlOYW1lOiAnQm9tYmVyIEJpcmQnLFxuICB9KTtcbiAgbGF2YUJsb2IgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ODIsXG4gICAgc2NhbGluZzogMzcsXG4gICAgY2xhc3M6ICdwdWRkbGUnLFxuICAgIGRpc3BsYXlOYW1lOiAnTGF2YSBCbG9iJyxcbiAgfSk7XG4gIGZsYWlsR3V5ID0gbmV3IE1vbnN0ZXIodGhpcywgeyAvLyBsaXphcmQgbWFuXG4gICAgaWQ6IDB4ODQsXG4gICAgc2NhbGluZzogMzcsXG4gICAgZGlzcGxheU5hbWU6ICdGbGFpbCBHdXknLFxuICB9KTtcbiAgYmx1ZUV5ZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4NSxcbiAgICBzY2FsaW5nOiAzNyxcbiAgICBjbGFzczogJ2V5ZScsXG4gICAgZGlzcGxheU5hbWU6ICdCZWhvbGRlcicsXG4gIH0pO1xuICBzYWxhbWFuZGVyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDg2LFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIGRpc3BsYXlOYW1lOiAnU2FsYW1hbmRlcicsXG4gIH0pO1xuICBzb3JjZXJvciA9IG5ldyBNb25zdGVyKHRoaXMsIHsgLy8gYnVydFxuICAgIGlkOiAweDg3LFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIGRpc3BsYXlOYW1lOiAnQnVydCcsXG4gIH0pO1xuICBtYWRvMSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4OCxcbiAgICBzY2FsaW5nOiAzNyxcbiAgICBkaXNwbGF5TmFtZTogJ0dlbmVyYWwgTWFkbycsXG4gIH0pO1xuICBrbmlnaHQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ODksXG4gICAgc2NhbGluZzogNDEsXG4gICAgZGlmZmljdWx0eTogMSxcbiAgICBkaXNwbGF5TmFtZTogJ05pbmphJyxcbiAgfSk7XG4gIGRldmlsID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDhhLFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIGRpc3BsYXlOYW1lOiAnRGV2aWwgQmF0JyxcbiAgfSk7XG4gIGtlbGJlc3F1ZTIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OGIsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnR2VuZXJhbCBLZWxiZXNxdWUnLFxuICB9KTtcbiAgd3JhaXRoU2hhZG93MiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4YyxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICBjbGFzczogJ3dyYWl0aCcsXG4gICAgZGlzcGxheU5hbWU6ICdTaGFkb3cnLFxuICB9KTtcbiAgZ2xpdGNoMSA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4OGQpOyAvLyBzY2FsaW5nOiA0MSA/XG4gIGdsaXRjaDIgPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweDhlKTsgLy8gc2NhbGluZzogNDEgP1xuICBndWFyZGlhblN0YXR1ZSA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4OGYpOyAvLyBzY2FsaW5nOiA0MSA/XG4gIHNhYmVyYTIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTAsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnR2VuZXJhbCBTYWJlcmEnLFxuICB9KTtcbiAgdGFyYW50dWxhID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDkxLFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIGRpc3BsYXlOYW1lOiAnVGFyYW50dWxhJyxcbiAgfSk7XG4gIHNrZWxldG9uID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDkyLFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIGRpc3BsYXlOYW1lOiAnU2tlbGV0b24nLFxuICB9KTtcbiAgbWFkbzIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTMsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnR2VuZXJhbCBNYWRvJyxcbiAgfSk7XG4gIHB1cnBsZUV5ZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5NCxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICBjbGFzczogJ2V5ZScsXG4gICAgZGlzcGxheU5hbWU6ICdCZWhvbGRlcicsXG4gIH0pO1xuICBmbGFpbEtuaWdodCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5NSxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICBkaXNwbGF5TmFtZTogJ0ZsYWlsIEtuaWdodCcsXG4gIH0pO1xuICBzY29ycGlvbiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5NixcbiAgICBzY2FsaW5nOiA0MSxcbiAgICBkaXNwbGF5TmFtZTogJ1Njb3JwaW9uJyxcbiAgfSk7XG4gIGthcm1pbmUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTcsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnR2VuZXJhbCBLYXJtaW5lJyxcbiAgfSk7XG4gIHNhbmRCbG9iID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk4LFxuICAgIHNjYWxpbmc6IDQ0LFxuICAgIGNsYXNzOiAncHVkZGxlJyxcbiAgICBkaXNwbGF5TmFtZTogJ1NhbmQgQmxvYicsXG4gIH0pO1xuICBtdW1teSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5OSxcbiAgICBzY2FsaW5nOiA0NCxcbiAgICBkaXNwbGF5TmFtZTogJ011bW15JyxcbiAgfSk7XG4gIHdhcmxvY2sgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OWEsXG4gICAgc2NhbGluZzogNDYsXG4gICAgZGlzcGxheU5hbWU6ICdXYXJsb2NrJyxcbiAgfSk7XG4gIGRyYXlnb24xID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDliLFxuICAgIHNjYWxpbmc6IDQ1LFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ0VtcGVyb3IgRHJheWdvbicsXG4gIH0pO1xuICBzdGF0dWVPZlN1biA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4OWMpOyAvLyBzY2FsaW5nOiA0NyA/XG4gIHN0YXR1ZU9mTW9vbiA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4OWQpOyAvLyBzY2FsaW5nOiA0NyA/XG4gIGRyYXlnb24yID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDllLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ0RyYXlnb24nLFxuICB9KTtcbiAgY3J1bWJsaW5nVmVydGljYWxQbGF0Zm9ybSA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4OWYpOyAvLyBzY2FsaW5nOiA0NyA/XG4gIGJyb3duUm9ib3QgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YTAsXG4gICAgc2NhbGluZzogNDcsXG4gICAgZGlmZmljdWx0eTogMSxcbiAgICBkaXNwbGF5TmFtZTogJ1JvYm90IFNlbnRyeScsXG4gIH0pO1xuICB3aGl0ZVJvYm90ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGExLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIGRpc3BsYXlOYW1lOiAnUm9ib3QgRW5mb3JjZXInLFxuICB9KTtcbiAgdG93ZXJTZW50aW5lbCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhhMixcbiAgICBzY2FsaW5nOiA0NyxcbiAgICBkaXNwbGF5TmFtZTogJ1Rvd2VyIFNlbnRpbmVsJyxcbiAgfSk7XG4gIGhlbGljb3B0ZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YTMsXG4gICAgc2NhbGluZzogNDcsXG4gICAgZGlzcGxheU5hbWU6ICdSb2JvY29wdGVyJyxcbiAgfSk7XG4gIGR5bmEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YTQsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnRFlOQScsXG4gIH0pO1xuICB2YW1waXJlMiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhhNSxcbiAgICBzY2FsaW5nOiAyOCxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdWYW1waXJlJyxcbiAgfSk7XG4gIGdsaXRjaDMgPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweGE2KTsgLy8gc2NhbGluZzogNDEgP1xuICBkeW5hUG9kID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGI0LFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ0RZTkEgRGVmZW5zZSBQb2QnLFxuICB9KTtcbiAgZHluYUNvdW50ZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YjgsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZHluYUxhc2VyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGI5LFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGR5bmFCdWJibGUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YmEsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgdmFtcGlyZTJCYXQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YmMsXG4gICAgc2NhbGluZzogMjgsXG4gICAgLy8gdHlwZTogJ3Byb2plY3RpbGUnLCAvLyBvZiBzb3J0cy4uLj9cbiAgfSk7XG4gIGJyb3duUm9ib3RMYXNlclNvdXJjZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhiZSxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBkcmF5Z29uMkZpcmViYWxsID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGJmLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHZhbXBpcmUxQmF0ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGMxLFxuICAgIHNjYWxpbmc6IDUsXG4gICAgLy90eXBlOiAncHJvamVjdGlsZScsIC8vIG9mIHNvcnRzXG4gIH0pO1xuICBnaWFudEluc2VjdEZpcmViYWxsID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGMzLFxuICAgIHNjYWxpbmc6IDExLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGdyZWVuTW9zcXVpdG8gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzQsXG4gICAgc2NhbGluZzogMTEsXG4gICAgLy90eXBlOiAncHJvamVjdGlsZScsIC8vIG9mIHNvcnRzXG4gICAgZGlzcGxheU5hbWU6ICdNb3NxdWl0bycsXG4gIH0pO1xuICBrZWxiZXNxdWUxUm9jayA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjNSxcbiAgICBzY2FsaW5nOiAxNSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBzYWJlcmExQmFsbHMgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzYsXG4gICAgc2NhbGluZzogMjksXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAga2VsYmVzcXVlMkZpcmUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzcsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc2FiZXJhMkZpcmUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzgsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc2FiZXJhMkJhbGxzID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGM5LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGthcm1pbmVCYWxscyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjYSxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBzdGF0dWVCYWxscyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjYixcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBkcmF5Z29uMUxpZ2h0bmluZyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjYyxcbiAgICBzY2FsaW5nOiA0NSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBkcmF5Z29uMkxhc2VyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGNkLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGRyYXlnb24yQnJlYXRoID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGNlLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGJpcmRCb21iID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGUwLFxuICAgIHNjYWxpbmc6IDMzLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGdyZWVuTW9zcXVpdG9TaG90ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGUyLFxuICAgIHNjYWxpbmc6IDExLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHBhcmFseXNpc0JlYW0gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTMsXG4gICAgc2NhbGluZzogMjUsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc3RvbmVHYXplID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGU0LFxuICAgIHNjYWxpbmc6IDE5LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHJvY2tHb2xlbVJvY2sgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTUsXG4gICAgc2NhbGluZzogNCxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBjdXJzZUJlYW0gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTYsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgbXBEcmFpbldlYiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlNyxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBmaXNobWFuVHJpZGVudCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlOCxcbiAgICBzY2FsaW5nOiAyNSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBvcmNBeGUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTksXG4gICAgc2NhbGluZzogNixcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBzd2FtcFBvbGxlbiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlYSxcbiAgICBzY2FsaW5nOiAxMCxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBwYXJhbHlzaXNQb3dkZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZWIsXG4gICAgc2NhbGluZzogMjMsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc29sZGllclN3b3JkID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGVjLFxuICAgIHNjYWxpbmc6IDE0LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGljZUdvbGVtUm9jayA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlZCxcbiAgICBzY2FsaW5nOiAxNCxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICB0cm9sbEF4ZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlZSxcbiAgICBzY2FsaW5nOiAxOCxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBrcmFrZW5JbmsgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZWYsXG4gICAgc2NhbGluZzogMjUsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgYXJjaGVyQXJyb3cgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjAsXG4gICAgc2NhbGluZzogMzMsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAga25pZ2h0U3dvcmQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjIsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgbW90aFJlc2lkdWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjMsXG4gICAgc2NhbGluZzogMjgsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgYnJvd25Sb2JvdExhc2VyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGY0LFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHdoaXRlUm9ib3RMYXNlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmNSxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICB0b3dlclNlbnRpbmVsTGFzZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjYsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc2tlbGV0b25TaG90ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGY3LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGJsb2JTaG90ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGY4LFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGZsYWlsS25pZ2h0RmxhaWwgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjksXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZmxhaWxHdXlGbGFpbCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmYSxcbiAgICBzY2FsaW5nOiAzNyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBtYWRvU2h1cmlrZW4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZmMsXG4gICAgc2NhbGluZzogMzcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZ3VhcmRpYW5TdGF0dWVNaXNzaWxlID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGZkLFxuICAgIHNjYWxpbmc6IDM2LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGRlbW9uV2FsbEZpcmUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZmUsXG4gICAgc2NhbGluZzogMzcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIHN1cGVyKDB4MTAwKTtcblxuICAgIGZvciAoY29uc3Qga2V5IGluIHRoaXMpIHtcbiAgICAgIGNvbnN0IG9iaiA9IHRoaXNba2V5IGFzIGtleW9mIHRoaXNdO1xuICAgICAgaWYgKCEob2JqIGluc3RhbmNlb2YgT2JqZWN0RGF0YSkpIGNvbnRpbnVlO1xuICAgICAgb2JqLm5hbWUgPSBsb3dlckNhbWVsVG9TcGFjZXMoa2V5KTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXNbaV0pIHtcbiAgICAgICAgdGhpc1tpXSA9IG5ldyBPYmplY3REYXRhKHRoaXMsIGkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHdyaXRlKCk6IE1vZHVsZVtdIHtcbiAgICBjb25zdCBtb2R1bGVzOiBNb2R1bGVbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgb2JqIG9mIHRoaXMpIHtcbiAgICAgIG1vZHVsZXMucHVzaCguLi5vYmoud3JpdGUoKSk7XG4gICAgfVxuICAgIC8vIElmIHdlJ3JlIHN0b3JpbmcgdGhlIG1vbnN0ZXIgbmFtZXMgdGhlbiB3ZSBuZWVkIHRvIGluaXRpYWxpemUgdGhlIGJ1ZmZlclxuICAgIC8vIGxlbmd0aC5cbiAgICBpZiAodGhpcy5yb20ud3JpdGVNb25zdGVyTmFtZXMpIHtcbiAgICAgIGNvbnN0IGEgPSB0aGlzLnJvbS5hc3NlbWJsZXIoKTtcbiAgICAgIGNvbnN0IGxvbmdlc3ROYW1lID0gTWF0aC5tYXgoLi4uKHRoaXMubWFwKG8gPT4gby5kaXNwbGF5TmFtZS5sZW5ndGgpKSk7XG4gICAgICBjb25zdCBNQVhfTEVOR1RIID0gMjc7XG5cbiAgICAgIGlmIChsb25nZXN0TmFtZSA+IE1BWF9MRU5HVEgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBMb25nZXN0IGRpc3BsYXlOYW1lIGxlbmd0aCBpcyBncmVhdGVyIHRoYW4gJHtNQVhfTEVOR1RIXG4gICAgICAgICAgICB9LiAoJHtsb25nZXN0TmFtZX0gPiAke01BWF9MRU5HVEhcbiAgICAgICAgICAgIH0pXFxuQ3J5c3RhbGlzIEhVRCBjYW4ndCBjb21mb3J0YWJseSBmaXQgdGhhdCBtYW55IGNoYXJhY3RlcnMuYCk7XG4gICAgICB9XG4gICAgICBhLmFzc2lnbignRU5FTVlfTkFNRV9MRU5HVEgnLCBsb25nZXN0TmFtZSk7XG4gICAgICBhLmV4cG9ydCgnRU5FTVlfTkFNRV9MRU5HVEgnKTtcbiAgICAgIGEuc2VnbWVudCgnMWEnKVxuICAgICAgYS5yZWxvYygnRW5lbXlOYW1lQmxvY2tsaXN0JylcbiAgICAgIGEubGFiZWwoJ0VuZW15TmFtZUJsb2NrbGlzdCcpXG4gICAgICBhLmV4cG9ydCgnRW5lbXlOYW1lQmxvY2tsaXN0JylcbiAgICAgIGxldCBibG9ja0xpc3RMZW4gPSAwO1xuICAgICAgZm9yIChjb25zdCBvYmogb2YgdGhpcykge1xuICAgICAgICBpZiAob2JqLmhwID4gMCAmJiBvYmouZGlzcGxheU5hbWUgPT0gJycpIHtcbiAgICAgICAgICBhLmJ5dGUob2JqLmlkKTtcbiAgICAgICAgICBibG9ja0xpc3RMZW4rKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYS5hc3NpZ24oJ0VORU1ZX05BTUVfQkxPQ0tMSVNUX0xFTicsIGJsb2NrTGlzdExlbik7XG4gICAgICBhLmV4cG9ydCgnRU5FTVlfTkFNRV9CTE9DS0xJU1RfTEVOJyk7XG5cbiAgICAgIG1vZHVsZXMucHVzaChhLm1vZHVsZSgpKTtcbiAgICB9XG4gICAgcmV0dXJuIG1vZHVsZXM7XG4gIH1cbn1cblxuLy8gZXhwb3J0IHR5cGUgTW9uc3RlclR5cGUgPSAnbW9uc3RlcicgfCAnYm9zcycgfCAncHJvamVjdGlsZSc7XG4vLyBleHBvcnQgdHlwZSBUZXJyYWluID0gJ3dhbGsnIHwgJ3N3aW0nIHwgJ3NvYXInIHwgJ2ZsdXR0ZXInIHwgJ3N0YW5kJztcblxuZXhwb3J0IHR5cGUgQ29uc3RyYWludCA9IE1hcDxzdHJpbmcsIHJlYWRvbmx5IFtyZWFkb25seSBudW1iZXJbXSwgYm9vbGVhbiB8IG51bGxdPjtcbi8vIGtleSBpcyB0dXBsZVswXS5qb2luKCcsJylcbi8vIHZhbHVlWzBdIGlzIFtbcXVhZCBmb3IgcmVxdWlyZWQgcGF0MCwgcGF0MSwgcGFsMiwgcGFsM11cbi8vIHZhbHVlWzFdIGlzIHRydWUgaWYgbmVlZCBwYXQxLCBmYWxzZSBpZiBuZWVkIHBhdDAsIG51bGwgaWYgbmVpdGhlclxuLy8gICAtLS0+IGJ1dCB3ZSBuZWVkIHRvIGtlZXAgdHJhY2sgb2YgYSBoYW5mdWwgb2Ygc3Bhd25zLCBub3QganVzdCB0b25lLlxuXG5cbiAgLy8gbW9uc3RlcigweDUwLCAnQmx1ZSBTbGltZScsIDB4MjAsIDYsIHtcbiAgLy8gICBoaXRzOiAxLCBzYXRrOiAxNiwgZGdsZDogMiwgc2V4cDogMzIsXG4gIC8vICAgbXVzdDogYW5kKHBhdCgweDY0KSwgcGFsKDIsIDB4MjEpKSxcbiAgLy8gfSk7XG4gIC8vIG1vbnN0ZXIoMHg1MSwgJ1dlcmV0aWdlcicsIDB4MjQsIDcsIHtcbiAgLy8gICBoaXRzOiAxLjUsIHNhdGs6IDIxLCBkZ2xkOiA0LCBzZXhwOiA0MCxcbiAgLy8gICBtdXN0OiBhbmQocGF0KDB4NjApLCBwYWwoMywgMHgyMCkpLFxuICAvLyB9KTtcbiAgLy8gbW9uc3RlcigweDUyLCAnR3JlZW4gSmVsbHknLCAweDIwLCAxMCwge1xuICAvLyAgIHNkZWY6IDQsIGhpdHM6IDMsIHNhdGs6IDE2LCBkZ2xkOiA0LCBzZXhwOiAzNixcbiAgLy8gICBtdXN0OiBhbmQocGF0KDB4NjUpLCBwYWwoMiwgMHgyMikpLFxuICAvLyB9KTtcbiAgLy8gbW9uc3RlcigweDUzLCAnUmVkIFNsaW1lJywgMHgyMCwgMTYsIHtcbiAgLy8gICBzZGVmOiA2LCBoaXRzOiA0LCBzYXRrOiAxNiwgZGdsZDogNCwgc2V4cDogNDgsXG4gIC8vICAgbXVzdDogYW5kKHBhdCgweDY0KSwgcGFsKDIsIDB4MjMpKSxcbiAgLy8gfSk7XG5cblxuLy8gZXhwb3J0IGludGVyZmFjZSBNb25zdGVyIHtcbi8vICAgaWQ6IG51bWJlcjtcbi8vICAgbmFtZTogc3RyaW5nO1xuLy8gICBhY3Rpb246IG51bWJlcjtcbi8vICAgY291bnQ6IG51bWJlcjtcbi8vICAgdHlwZT86IE1vbnN0ZXJUeXBlOyAvLyBkZWZhdWx0IGlzIG1vbnN0ZXJcbi8vICAgbW92ZT86IFRlcnJhaW47IC8vIGRlZmF1bHQgaXMgd2Fsa1xuLy8gICBzZGVmPzogbnVtYmVyO1xuLy8gICBzd3JkPzogbnVtYmVyO1xuLy8gICBoaXRzPzogbnVtYmVyO1xuLy8gICBzYXRrPzogbnVtYmVyO1xuLy8gICBkZ2xkPzogbnVtYmVyO1xuLy8gICBzZXhwPzogbnVtYmVyO1xuLy8gICBlbGVtPzogbnVtYmVyO1xuLy8gICBzcGQ/OiBudW1iZXI7XG4vLyAgIHN0YXR1czogbnVtYmVyO1xuLy8gICBwZXJzaXN0PzogYm9vbGVhbjtcbi8vICAgbXVzdD86IENvbnN0cmFpbnQ7XG4vLyB9XG5cbi8vIGludGVyZmFjZSBBZGp1c3RtZW50cyB7XG4vLyAgIHZhbmlsbGFMZXZlbD86IG51bWJlcjtcbi8vICAgdmFuaWxsYVN3b3JkPzogbnVtYmVyO1xuLy8gICBzZGVmPzogbnVtYmVyO1xuLy8gICBzd3JkPzogbnVtYmVyO1xuLy8gICBoaXRzPzogbnVtYmVyO1xuLy8gICBzYXRrPzogbnVtYmVyO1xuLy8gICBkZ2xkPzogbnVtYmVyO1xuLy8gICBzZXhwPzogbnVtYmVyO1xuLy8gICBlbGVtPzogbnVtYmVyO1xuLy8gICBzcGQ/OiBudW1iZXI7XG4vLyB9XG5cbi8vIGludGVyZmFjZSBQbGF5ZXJTdGF0cyB7XG4vLyAgIGFybW9yOiBudW1iZXI7XG4vLyAgIGxldmVsOiBudW1iZXI7XG4vLyAgIHNoaWVsZDogbnVtYmVyO1xuLy8gICBzd29yZDogbnVtYmVyO1xuLy8gfVxuXG4vLyBjb25zdCBWQU5JTExBX1NXT1JEUyA9IFsyLCAyLCAyLCAyLCA0LCA0LCA0LCA4LCA4LCA4LCA4LCAxNiwgMTYsIDE2LCAxNiwgMTZdO1xuXG4vLyBjb25zdCB7fSA9IHtWQU5JTExBX1NXT1JEU30gYXMgYW55O1xuXG4vLyBleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGUocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0LCByYW5kb206IFJhbmRvbSk6IE1vbnN0ZXJbXSB7XG4vLyAgIGNvbnN0IHt9ID0ge3JvbSwgZmxhZ3MsIHJhbmRvbX0gYXMgYW55O1xuXG4vLyAgIGNvbnN0IG91dDogTW9uc3RlcltdID0gW107XG5cbi8vICAgY29uc3QgcGxheWVyOiBQbGF5ZXJTdGF0cyA9IHtcbi8vICAgICBhcm1vcjogMixcbi8vICAgICBsZXZlbDogMSxcbi8vICAgICBzaGllbGQ6IDIsXG4vLyAgICAgc3dvcmQ6IDIsXG4vLyAgIH07XG5cbi8vICAgZnVuY3Rpb24gYmFzZShpZDogbnVtYmVyLCBuYW1lOiBzdHJpbmcsIGFkajogQWRqdXN0bWVudHMgPSB7fSkge1xuLy8gICAgIGNvbnN0IG8gPSByb20ub2JqZWN0c1tpZF07XG4vLyAgICAgbGV0IHthY3Rpb24sIGltbW9iaWxlLCBsZXZlbCwgYXRrLCBkZWYsIGhwLFxuLy8gICAgICAgICAgZWxlbWVudHMsIGdvbGREcm9wLCBleHBSZXdhcmQsIHN0YXR1c0VmZmVjdH0gPSBvO1xuXG4vLyAgICAgLy8gLy8gV2hhdCBsZXZlbCBzaG91bGQgdGhlIHBsYXllciBiZSBhdCB3aGVuIGVuY291bnRlcmluZyB0aGlzIGluIHZhbmlsbGE/XG4vLyAgICAgLy8gaWYgKGFkai52YW5pbGxhTGV2ZWwpIGxldmVsID0gYWRqLnZhbmlsbGFMZXZlbDtcbi8vICAgICBsZXZlbCA9IHBsYXllci5sZXZlbDtcblxuLy8gICAgIC8vIFdoYXQgc3dvcmQgd291bGQgdGhleSBiZSB1c2luZz8gIFBpY2sgdGhlIGhpZ2hlc3Qgbm9uLWltbXVuZSBzd29yZCB0aGF0XG4vLyAgICAgLy8gd291bGQgYmUgYXZhaWxhYmxlIGF0IHRoaXMgcG9pbnQgaW4gdGhlIGdhbWUuXG4vLyAgICAgbGV0IHN3b3JkID0gcGxheWVyLnN3b3JkO1xuLy8gICAgIHdoaWxlIChzd29yZCA+IDEgJiYgKGVsZW1lbnRzICYgKHN3b3JkID4+PiAxKSkpIHtcbi8vICAgICAgIHN3b3JkID4+Pj0gMTtcbi8vICAgICB9XG4vLyAgICAgaWYgKGFkai52YW5pbGxhU3dvcmQpIHN3b3JkID0gYWRqLnZhbmlsbGFTd29yZDtcbi8vICAgICBjb25zdCBwYXRrID0gc3dvcmQgKyBsZXZlbDsgLy8gZXhwZWN0ZWQgcGxheWVyIGF0dGFja1xuXG4vLyAgICAgLy8gSG93IG1hbnkgaGl0cyB3b3VsZCBpdCB0YWtlIHRvIGtpbGwgaW4gdmFuaWxsYT8gKGNvbnNpZGVyIG5vIGZsb29yPylcbi8vICAgICBjb25zdCB2YW5pbGxhSGl0cyA9IE1hdGguZmxvb3IoKGhwICsgMSkgLyAocGF0ayAtIGRlZikpO1xuLy8gICAgIGNvbnN0IGhpdHMgPSBhZGouaGl0cyB8fCB2YW5pbGxhSGl0cztcblxuLy8gICAgIC8vIFNjYWxlZCBkZWZlbnNlICh3aWxsIGJlIHN0b3JlZCBpbiBlaWdodGhzKVxuLy8gICAgIGNvbnN0IHNkZWYgPSBhZGouc2RlZiAhPSBudWxsID8gYWRqLnNkZWYgOiBkZWYgLyBwYXRrOyAvLyBub3JtYWxseSAqOFxuXG4vLyAgICAgLy8gRXhwZWN0ZWQgcGxheWVyIEhQIGFuZCBkZWZlbnNlIGF0IHZhbmlsbGEgbGV2ZWxcbi8vICAgICBjb25zdCBwaHAgPSBNYXRoLm1pbigyNTUsIDMyICsgMTYgKiBsZXZlbCk7XG4vLyAgICAgY29uc3QgcGRlZiA9IG8uYXR0YWNrVHlwZSA/IHBsYXllci5zaGllbGQgOiBwbGF5ZXIuYXJtb3I7XG4vLyAgICAgY29uc3QgdmFuaWxsYURhbWFnZSA9IE1hdGgubWF4KDAsIGF0ayAtIGxldmVsIC0gcGRlZikgLyBwaHA7XG4vLyAgICAgY29uc3Qgc2F0ayA9IGFkai5zYXRrICE9IG51bGwgPyBhZGouc2F0ayA6IHZhbmlsbGFEYW1hZ2U7IC8vIG5vcm1hbGx5ICoxMjhcblxuLy8gICAgIC8vIFRPRE8gLSB0aGVuIGNvbXB1dGUgZ29sZC9leHBcblxuLy8gICAgIGNvbnN0IHt9ID0ge3NkZWYsIHNhdGssIGhpdHMsIGltbW9iaWxlLCBnb2xkRHJvcCwgZXhwUmV3YXJkLCBzdGF0dXNFZmZlY3R9IGFzIGFueTtcblxuLy8gICAgIGNvbnN0IG06IE1vbnN0ZXIgPSB7aWQsIG5hbWV9IGFzIGFueTtcblxuLy8gICAgIG0uaWQgPSBpZDtcbi8vICAgICBtLm5hbWUgPSBuYW1lO1xuLy8gICAgIG0udHlwZSA9ICdtb25zdGVyJztcbi8vICAgICBtLmFjdGlvbiA9IGFjdGlvbjtcbi8vICAgICBtLmNvdW50ID0gMDsgLy8gY291bnQ7XG4vLyAgICAgb3V0LnB1c2gobSk7XG4vLyAgIH1cblxuLy8gICAvLyBUT0RPIC0gYWRkaXRpb25hbCBjb25zdHJhaW50cyBhYm91dCBlLmcuIHBsYWNlbWVudCwgZXRjP1xuLy8gICAvLyAgICAgIC0gbm8gWCBvbiBZIGxldmVsLi4uP1xuXG4vLyAgIHJldHVybiBvdXQ7XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIGFuZCh4OiBDb25zdHJhaW50LCB5OiBDb25zdHJhaW50KTogQ29uc3RyYWludCB7XG4vLyAgIHJldHVybiBbXTtcbi8vIH1cbi8vIGZ1bmN0aW9uIHBhdChpZDogbnVtYmVyKTogQ29uc3RyYWludCB7XG4vLyAgIHJldHVybiBbXTtcbi8vIH1cbi8vIGZ1bmN0aW9uIHBhbCh3aGljaDogbnVtYmVyLCBpZDogbnVtYmVyKTogQ29uc3RyYWludCB7XG4vLyAgIHJldHVybiBbXTtcbi8vIH1cblxuLy8gY29uc3Qge30gPSB7YW5kLCBwYXQsIHBhbH0gYXMgYW55O1xuIl19