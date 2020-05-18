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
        });
        this.blueSlime = new Monster(this, {
            id: 0x50,
            scaling: 1,
            class: 'slime',
        });
        this.weretiger = new Monster(this, {
            id: 0x51,
            scaling: 1,
        });
        this.greenJelly = new Monster(this, {
            id: 0x52,
            scaling: 4,
            class: 'jelly',
        });
        this.redSlime = new Monster(this, {
            id: 0x53,
            scaling: 4,
            class: 'slime',
        });
        this.rockGolem = new Monster(this, {
            id: 0x54,
            scaling: 4,
            class: 'golem',
        });
        this.blueBat = new Monster(this, {
            id: 0x55,
            scaling: 4,
        });
        this.greenWyvern = new Monster(this, {
            id: 0x56,
            scaling: 4,
            class: 'wyvern',
        });
        this.vampire1 = new Monster(this, {
            id: 0x57,
            scaling: 5,
            type: 'boss',
        });
        this.orc = new Monster(this, {
            id: 0x58,
            scaling: 6,
        });
        this.redMosquito = new Monster(this, {
            id: 0x59,
            scaling: 10,
            class: 'mosquito',
        });
        this.blueMushroom = new Monster(this, {
            id: 0x5a,
            scaling: 10,
            class: 'mushroom',
        });
        this.swampTomato = new Monster(this, {
            id: 0x5b,
            scaling: 10.
        });
        this.blueMosquito = new Monster(this, {
            id: 0x5c,
            scaling: 23,
            class: 'mosquito',
        });
        this.swampPlant = new Monster(this, {
            id: 0x5d,
            scaling: 10,
        });
        this.giantInsect = new Monster(this, {
            id: 0x5e,
            scaling: 11,
            type: 'boss',
        });
        this.largeBlueSlime = new Monster(this, {
            id: 0x5f,
            scaling: 11,
            class: 'slime',
        });
        this.iceZombie = new Monster(this, {
            id: 0x60,
            scaling: 12,
            class: 'zombie',
        });
        this.greenBrain = new Monster(this, {
            id: 0x61,
            scaling: 12,
            class: 'brain',
        });
        this.greenSpider = new Monster(this, {
            id: 0x62,
            scaling: 12,
            class: 'spider',
        });
        this.redWyvern = new Monster(this, {
            id: 0x63,
            scaling: 12,
            class: 'wyvern',
        });
        this.soldier = new Monster(this, {
            id: 0x64,
            scaling: 14,
            class: 'soldier',
        });
        this.iceEntity = new Monster(this, {
            id: 0x65,
            scaling: 14,
            class: 'entity',
        });
        this.redBrain = new Monster(this, {
            id: 0x66,
            scaling: 14,
            class: 'brain',
        });
        this.iceGolem = new Monster(this, {
            id: 0x67,
            scaling: 14,
            class: 'golem',
        });
        this.kelbesque1 = new Monster(this, {
            id: 0x68,
            scaling: 15,
            type: 'boss',
        });
        this.largeRedSlime = new Monster(this, {
            id: 0x69,
            scaling: 18,
            class: 'slime',
        });
        this.troll = new Monster(this, {
            id: 0x6a,
            scaling: 18,
        });
        this.redJelly = new Monster(this, {
            id: 0x6b,
            scaling: 18,
            class: 'jelly',
        });
        this.medusa = new Monster(this, {
            id: 0x6c,
            scaling: 19,
        });
        this.crab = new Monster(this, {
            id: 0x6d,
            scaling: 19,
        });
        this.medusaHead = new Monster(this, {
            id: 0x6e,
            scaling: 20,
        });
        this.bird = new Monster(this, {
            id: 0x6f,
            scaling: 20,
            class: 'bird',
        });
        this.redMushroom = new Monster(this, {
            id: 0x71,
            scaling: 21,
            class: 'mushroom',
        });
        this.earthEntity = new Monster(this, {
            id: 0x72,
            scaling: 22,
            class: 'entity',
        });
        this.mimic = new Monster(this, {
            id: 0x73,
            scaling: 22,
        });
        this.redSpider = new Monster(this, {
            id: 0x74,
            scaling: 22,
            class: 'spider',
        });
        this.fishman = new Monster(this, {
            id: 0x75,
            scaling: 25,
        });
        this.jellyfish = new Monster(this, {
            id: 0x76,
            scaling: 25,
        });
        this.kraken = new Monster(this, {
            id: 0x77,
            scaling: 25,
        });
        this.darkGreenWyvern = new Monster(this, {
            id: 0x78,
            scaling: 27,
            class: 'wyvern',
        });
        this.sandZombie = new Monster(this, {
            id: 0x79,
            scaling: 38,
            class: 'zombie',
        });
        this.wraithShadow1 = new Monster(this, {
            id: 0x7b,
            scaling: 28,
            class: 'wraith',
        });
        this.moth = new Monster(this, {
            id: 0x7c,
            scaling: 28,
            difficulty: 3,
        });
        this.sabera1 = new Monster(this, {
            id: 0x7d,
            scaling: 29,
            type: 'boss',
        });
        this.verticalPlatform = new ObjectData(this, 0x7e);
        this.horizotalPlatform = new ObjectData(this, 0x7f);
        this.archer = new Monster(this, {
            id: 0x80,
            scaling: 33,
            class: 'soldier',
        });
        this.bomberBird = new Monster(this, {
            id: 0x81,
            scaling: 33,
            class: 'bird',
        });
        this.lavaBlob = new Monster(this, {
            id: 0x82,
            scaling: 37,
            class: 'puddle',
        });
        this.flailGuy = new Monster(this, {
            id: 0x84,
            scaling: 37,
        });
        this.blueEye = new Monster(this, {
            id: 0x85,
            scaling: 37,
            class: 'eye',
        });
        this.salamander = new Monster(this, {
            id: 0x86,
            scaling: 37,
        });
        this.sorceror = new Monster(this, {
            id: 0x87,
            scaling: 37,
        });
        this.mado1 = new Monster(this, {
            id: 0x88,
            scaling: 37,
        });
        this.knight = new Monster(this, {
            id: 0x89,
            scaling: 41,
            difficulty: 1,
        });
        this.devil = new Monster(this, {
            id: 0x8a,
            scaling: 41,
        });
        this.kelbesque2 = new Monster(this, {
            id: 0x8b,
            scaling: 41,
            type: 'boss',
        });
        this.wraithShadow2 = new Monster(this, {
            id: 0x8c,
            scaling: 41,
            class: 'wraith',
        });
        this.glitch1 = new ObjectData(this, 0x8d);
        this.glitch2 = new ObjectData(this, 0x8e);
        this.guardianStatue = new ObjectData(this, 0x8f);
        this.sabera2 = new Monster(this, {
            id: 0x90,
            scaling: 41,
            type: 'boss',
        });
        this.tarantula = new Monster(this, {
            id: 0x91,
            scaling: 41,
        });
        this.skeleton = new Monster(this, {
            id: 0x92,
            scaling: 41,
        });
        this.mado2 = new Monster(this, {
            id: 0x93,
            scaling: 41,
            type: 'boss',
        });
        this.purpleEye = new Monster(this, {
            id: 0x94,
            scaling: 41,
            class: 'eye',
        });
        this.flailKnight = new Monster(this, {
            id: 0x95,
            scaling: 41,
        });
        this.scorpion = new Monster(this, {
            id: 0x96,
            scaling: 41,
        });
        this.karmine = new Monster(this, {
            id: 0x97,
            scaling: 41,
            type: 'boss',
        });
        this.sandBlob = new Monster(this, {
            id: 0x98,
            scaling: 44,
            class: 'puddle',
        });
        this.mummy = new Monster(this, {
            id: 0x99,
            scaling: 44,
        });
        this.warlock = new Monster(this, {
            id: 0x9a,
            scaling: 46,
        });
        this.draygon1 = new Monster(this, {
            id: 0x9b,
            scaling: 45,
            type: 'boss',
        });
        this.statueOfSun = new ObjectData(this, 0x9c);
        this.statueOfMoon = new ObjectData(this, 0x9d);
        this.draygon2 = new Monster(this, {
            id: 0x9e,
            scaling: 47,
            type: 'boss',
        });
        this.crumblingVerticalPlatform = new ObjectData(this, 0x9f);
        this.brownRobot = new Monster(this, {
            id: 0xa0,
            scaling: 47,
            difficulty: 1,
        });
        this.whiteRobot = new Monster(this, {
            id: 0xa1,
            scaling: 47,
        });
        this.towerSentinel = new Monster(this, {
            id: 0xa2,
            scaling: 47,
        });
        this.helicopter = new Monster(this, {
            id: 0xa3,
            scaling: 47,
        });
        this.dyna = new Monster(this, {
            id: 0xa4,
            scaling: 47,
            type: 'boss',
        });
        this.vampire2 = new Monster(this, {
            id: 0xa5,
            scaling: 28,
            type: 'boss',
        });
        this.glitch3 = new ObjectData(this, 0xa6);
        this.dynaPod = new Monster(this, {
            id: 0xb4,
            scaling: 47,
            type: 'boss',
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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9yb20vb2JqZWN0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN2QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDL0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQVcxQyxNQUFNLE9BQU8sT0FBUSxTQUFRLFdBQXVCO0lBNG1CbEQsWUFBcUIsR0FBUTtRQUMzQixLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFETSxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBMW1CN0IsaUJBQVksR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDL0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILFlBQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDMUIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxRQUFRO1NBQ2hCLENBQUMsQ0FBQztRQUNILDBCQUFxQixHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUN4QyxFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsWUFBTyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMxQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7U0FDaEIsQ0FBQyxDQUFDO1FBQ0gsY0FBUyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM1QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxDQUFDO1lBQ1YsS0FBSyxFQUFFLE9BQU87U0FDZixDQUFDLENBQUM7UUFDSCxjQUFTLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzVCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLENBQUM7U0FDWCxDQUFDLENBQUM7UUFDSCxlQUFVLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzdCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLENBQUM7WUFDVixLQUFLLEVBQUUsT0FBTztTQUNmLENBQUMsQ0FBQztRQUNILGFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDM0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsQ0FBQztZQUNWLEtBQUssRUFBRSxPQUFPO1NBQ2YsQ0FBQyxDQUFDO1FBQ0gsY0FBUyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM1QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxDQUFDO1lBQ1YsS0FBSyxFQUFFLE9BQU87U0FDZixDQUFDLENBQUM7UUFDSCxZQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzFCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLENBQUM7U0FDWCxDQUFDLENBQUM7UUFDSCxnQkFBVyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM5QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxDQUFDO1lBQ1YsS0FBSyxFQUFFLFFBQVE7U0FDaEIsQ0FBQyxDQUFDO1FBQ0gsYUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMzQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxDQUFDO1lBQ1YsSUFBSSxFQUFFLE1BQU07U0FDYixDQUFDLENBQUM7UUFDSCxRQUFHLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3RCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLENBQUM7U0FDWCxDQUFDLENBQUM7UUFDSCxnQkFBVyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM5QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLFVBQVU7U0FDbEIsQ0FBQyxDQUFDO1FBQ0gsaUJBQVksR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDL0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxVQUFVO1NBQ2xCLENBQUMsQ0FBQztRQUNILGdCQUFXLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEdBQUc7U0FDYixDQUFDLENBQUM7UUFDSCxpQkFBWSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMvQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLFVBQVU7U0FDbEIsQ0FBQyxDQUFDO1FBQ0gsZUFBVSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM3QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1NBQ1osQ0FBQyxDQUFDO1FBQ0gsZ0JBQVcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDOUIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxNQUFNO1NBQ2IsQ0FBQyxDQUFDO1FBQ0gsbUJBQWMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDakMsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxPQUFPO1NBQ2YsQ0FBQyxDQUFDO1FBQ0gsY0FBUyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM1QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7U0FDaEIsQ0FBQyxDQUFDO1FBQ0gsZUFBVSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM3QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLE9BQU87U0FDZixDQUFDLENBQUM7UUFDSCxnQkFBVyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM5QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7U0FDaEIsQ0FBQyxDQUFDO1FBQ0gsY0FBUyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM1QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7U0FDaEIsQ0FBQyxDQUFDO1FBQ0gsWUFBTyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMxQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLFNBQVM7U0FDakIsQ0FBQyxDQUFDO1FBQ0gsY0FBUyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM1QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7U0FDaEIsQ0FBQyxDQUFDO1FBQ0gsYUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMzQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLE9BQU87U0FDZixDQUFDLENBQUM7UUFDSCxhQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzNCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxLQUFLLEVBQUUsT0FBTztTQUNmLENBQUMsQ0FBQztRQUNILGVBQVUsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDN0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxNQUFNO1NBQ2IsQ0FBQyxDQUFDO1FBQ0gsa0JBQWEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDaEMsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxPQUFPO1NBQ2YsQ0FBQyxDQUFDO1FBQ0gsVUFBSyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUN4QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1NBQ1osQ0FBQyxDQUFDO1FBQ0gsYUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMzQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLE9BQU87U0FDZixDQUFDLENBQUM7UUFDSCxXQUFNLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3pCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7U0FDWixDQUFDLENBQUM7UUFDSCxTQUFJLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3ZCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7U0FDWixDQUFDLENBQUM7UUFDSCxlQUFVLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzdCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7U0FDWixDQUFDLENBQUM7UUFDSCxTQUFJLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3ZCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxLQUFLLEVBQUUsTUFBTTtTQUNkLENBQUMsQ0FBQztRQUNILGdCQUFXLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxLQUFLLEVBQUUsVUFBVTtTQUNsQixDQUFDLENBQUM7UUFDSCxnQkFBVyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM5QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7U0FDaEIsQ0FBQyxDQUFDO1FBQ0gsVUFBSyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUN4QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1NBQ1osQ0FBQyxDQUFDO1FBQ0gsY0FBUyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM1QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7U0FDaEIsQ0FBQyxDQUFDO1FBQ0gsWUFBTyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMxQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1NBQ1osQ0FBQyxDQUFDO1FBQ0gsY0FBUyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM1QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1NBQ1osQ0FBQyxDQUFDO1FBQ0gsV0FBTSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUN6QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1NBQ1osQ0FBQyxDQUFDO1FBQ0gsb0JBQWUsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDbEMsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxRQUFRO1NBQ2hCLENBQUMsQ0FBQztRQUNILGVBQVUsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDN0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxRQUFRO1NBQ2hCLENBQUMsQ0FBQztRQUNILGtCQUFhLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ2hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxLQUFLLEVBQUUsUUFBUTtTQUNoQixDQUFDLENBQUM7UUFDSCxTQUFJLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3ZCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxVQUFVLEVBQUUsQ0FBQztTQUNkLENBQUMsQ0FBQztRQUNILFlBQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDMUIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxNQUFNO1NBQ2IsQ0FBQyxDQUFDO1FBQ0gscUJBQWdCLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLHNCQUFpQixHQUFHLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvQyxXQUFNLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3pCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxLQUFLLEVBQUUsU0FBUztTQUNqQixDQUFDLENBQUM7UUFDSCxlQUFVLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzdCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxLQUFLLEVBQUUsTUFBTTtTQUNkLENBQUMsQ0FBQztRQUNILGFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDM0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxRQUFRO1NBQ2hCLENBQUMsQ0FBQztRQUNILGFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDM0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtTQUNaLENBQUMsQ0FBQztRQUNILFlBQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDMUIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxLQUFLO1NBQ2IsQ0FBQyxDQUFDO1FBQ0gsZUFBVSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM3QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1NBQ1osQ0FBQyxDQUFDO1FBQ0gsYUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMzQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1NBQ1osQ0FBQyxDQUFDO1FBQ0gsVUFBSyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUN4QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1NBQ1osQ0FBQyxDQUFDO1FBQ0gsV0FBTSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUN6QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsVUFBVSxFQUFFLENBQUM7U0FDZCxDQUFDLENBQUM7UUFDSCxVQUFLLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3hCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7U0FDWixDQUFDLENBQUM7UUFDSCxlQUFVLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzdCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsTUFBTTtTQUNiLENBQUMsQ0FBQztRQUNILGtCQUFhLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ2hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxLQUFLLEVBQUUsUUFBUTtTQUNoQixDQUFDLENBQUM7UUFDSCxZQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3JDLFlBQU8sR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckMsbUJBQWMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUMsWUFBTyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMxQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLE1BQU07U0FDYixDQUFDLENBQUM7UUFDSCxjQUFTLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzVCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7U0FDWixDQUFDLENBQUM7UUFDSCxhQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzNCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7U0FDWixDQUFDLENBQUM7UUFDSCxVQUFLLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3hCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsTUFBTTtTQUNiLENBQUMsQ0FBQztRQUNILGNBQVMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDNUIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxLQUFLO1NBQ2IsQ0FBQyxDQUFDO1FBQ0gsZ0JBQVcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDOUIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtTQUNaLENBQUMsQ0FBQztRQUNILGFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDM0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtTQUNaLENBQUMsQ0FBQztRQUNILFlBQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDMUIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxNQUFNO1NBQ2IsQ0FBQyxDQUFDO1FBQ0gsYUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMzQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7U0FDaEIsQ0FBQyxDQUFDO1FBQ0gsVUFBSyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUN4QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1NBQ1osQ0FBQyxDQUFDO1FBQ0gsWUFBTyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMxQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1NBQ1osQ0FBQyxDQUFDO1FBQ0gsYUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMzQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLE1BQU07U0FDYixDQUFDLENBQUM7UUFDSCxnQkFBVyxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN6QyxpQkFBWSxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxQyxhQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzNCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsTUFBTTtTQUNiLENBQUMsQ0FBQztRQUNILDhCQUF5QixHQUFHLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2RCxlQUFVLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzdCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxVQUFVLEVBQUUsQ0FBQztTQUNkLENBQUMsQ0FBQztRQUNILGVBQVUsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDN0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtTQUNaLENBQUMsQ0FBQztRQUNILGtCQUFhLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ2hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7U0FDWixDQUFDLENBQUM7UUFDSCxlQUFVLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzdCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7U0FDWixDQUFDLENBQUM7UUFDSCxTQUFJLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3ZCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsTUFBTTtTQUNiLENBQUMsQ0FBQztRQUNILGFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDM0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxNQUFNO1NBQ2IsQ0FBQyxDQUFDO1FBQ0gsWUFBTyxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyQyxZQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzFCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsTUFBTTtTQUNiLENBQUMsQ0FBQztRQUNILGdCQUFXLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxjQUFTLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzVCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxlQUFVLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzdCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxnQkFBVyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM5QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1NBRVosQ0FBQyxDQUFDO1FBQ0gsMEJBQXFCLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxxQkFBZ0IsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDbkMsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILGdCQUFXLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLENBQUM7U0FFWCxDQUFDLENBQUM7UUFDSCx3QkFBbUIsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDdEMsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILGtCQUFhLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ2hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7U0FFWixDQUFDLENBQUM7UUFDSCxtQkFBYyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUNqQyxFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsaUJBQVksR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDL0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILG1CQUFjLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ2pDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxnQkFBVyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM5QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsaUJBQVksR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDL0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILGlCQUFZLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQy9CLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxnQkFBVyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM5QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsc0JBQWlCLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3BDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxrQkFBYSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUNoQyxFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsbUJBQWMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDakMsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILGFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDM0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILHNCQUFpQixHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUNwQyxFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsa0JBQWEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDaEMsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILGNBQVMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDNUIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILGtCQUFhLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ2hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLENBQUM7WUFDVixJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxjQUFTLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzVCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxlQUFVLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzdCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxtQkFBYyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUNqQyxFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsV0FBTSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUN6QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxDQUFDO1lBQ1YsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsZ0JBQVcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDOUIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILG9CQUFlLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ2xDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxpQkFBWSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMvQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsaUJBQVksR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDL0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILGFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDM0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILGNBQVMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDNUIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILGdCQUFXLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxnQkFBVyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUM5QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsZ0JBQVcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDOUIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILG9CQUFlLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ2xDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxvQkFBZSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUNsQyxFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsdUJBQWtCLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3JDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxpQkFBWSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMvQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsYUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUMzQixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gscUJBQWdCLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ25DLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxrQkFBYSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUNoQyxFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsaUJBQVksR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDL0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILDBCQUFxQixHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUN4QyxFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsa0JBQWEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDaEMsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUtELEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ3RCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFpQixDQUFDLENBQUM7WUFDcEMsSUFBSSxDQUFDLENBQUMsR0FBRyxZQUFZLFVBQVUsQ0FBQztnQkFBRSxTQUFTO1lBQzNDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDcEM7UUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNaLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDbkM7U0FDRjtJQUNILENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG4vLyBpbXBvcnQge1JhbmRvbX0gZnJvbSAnLi4vcmFuZG9tLmpzJztcbmltcG9ydCB7IFJvbSB9IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQgeyBPYmplY3REYXRhIH0gZnJvbSAnLi9vYmplY3RkYXRhLmpzJztcbmltcG9ydCB7IE1vbnN0ZXIgfSBmcm9tICcuL21vbnN0ZXIuanMnO1xuaW1wb3J0IHsgbG93ZXJDYW1lbFRvU3BhY2VzIH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7IEVudGl0eUFycmF5IH0gZnJvbSAnLi9lbnRpdHkuanMnO1xuXG4vLyBNYW51YWwgZGF0YSBhYm91dCBtb25zdGVycy4gIEV2ZXJ5IG1vbnN0ZXIgbmVlZHMgYXQgbGVhc3QgYW4gSUQtdG8tbmFtZSBtYXBwaW5nLFxuLy8gV2UgYWxzbyBjYW4ndCBleHBlY3QgdG8gZ2V0IHRoZSBkaWZmaWN1bHR5IG1hcHBpbmcgYXV0b21hdGljYWxseSwgc28gdGhhdCdzXG4vLyBpbmNsdWRlZCBoZXJlLCB0b28uXG5cbi8vIFRPRE8gLSBhY3Rpb24gc2NyaXB0IHR5cGVzXG4vLyAgICAgIC0+IGNvbXBhdGliaWxpdHkgd2l0aCBvdGhlciBtb25zdGVyc1xuLy8gICAgICAgICBjb25zdHJhaW50cyBvbiBleHRyYSBhdHRyaWJ1dGVzXG4vLyAgICAgICAgIGRpZmZpY3VsdHkgcmF0aW5nc1xuXG5leHBvcnQgY2xhc3MgT2JqZWN0cyBleHRlbmRzIEVudGl0eUFycmF5PE9iamVjdERhdGE+IHtcblxuICBzb3JjZXJvclNob3QgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4M2YsXG4gICAgc2NhbGluZzogMzcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgd3JhaXRoMSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg0YixcbiAgICBzY2FsaW5nOiAyNCxcbiAgICBjbGFzczogJ3dyYWl0aCcsXG4gIH0pO1xuICBwYXJhbHlzaXNQb3dkZXJTb3VyY2UgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NGQsXG4gICAgc2NhbGluZzogMjMsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgd3JhaXRoMiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg0ZixcbiAgICBzY2FsaW5nOiAyOCxcbiAgICBjbGFzczogJ3dyYWl0aCcsXG4gIH0pO1xuICBibHVlU2xpbWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTAsXG4gICAgc2NhbGluZzogMSxcbiAgICBjbGFzczogJ3NsaW1lJyxcbiAgfSk7XG4gIHdlcmV0aWdlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1MSxcbiAgICBzY2FsaW5nOiAxLFxuICB9KTtcbiAgZ3JlZW5KZWxseSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1MixcbiAgICBzY2FsaW5nOiA0LFxuICAgIGNsYXNzOiAnamVsbHknLFxuICB9KTtcbiAgcmVkU2xpbWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTMsXG4gICAgc2NhbGluZzogNCxcbiAgICBjbGFzczogJ3NsaW1lJyxcbiAgfSk7XG4gIHJvY2tHb2xlbSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1NCxcbiAgICBzY2FsaW5nOiA0LFxuICAgIGNsYXNzOiAnZ29sZW0nLFxuICB9KTtcbiAgYmx1ZUJhdCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1NSxcbiAgICBzY2FsaW5nOiA0LFxuICB9KTtcbiAgZ3JlZW5XeXZlcm4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTYsXG4gICAgc2NhbGluZzogNCxcbiAgICBjbGFzczogJ3d5dmVybicsXG4gIH0pO1xuICB2YW1waXJlMSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1NyxcbiAgICBzY2FsaW5nOiA1LFxuICAgIHR5cGU6ICdib3NzJyxcbiAgfSk7XG4gIG9yYyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1OCxcbiAgICBzY2FsaW5nOiA2LFxuICB9KTtcbiAgcmVkTW9zcXVpdG8gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTksXG4gICAgc2NhbGluZzogMTAsXG4gICAgY2xhc3M6ICdtb3NxdWl0bycsXG4gIH0pO1xuICBibHVlTXVzaHJvb20gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NWEsXG4gICAgc2NhbGluZzogMTAsXG4gICAgY2xhc3M6ICdtdXNocm9vbScsXG4gIH0pO1xuICBzd2FtcFRvbWF0byA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1YixcbiAgICBzY2FsaW5nOiAxMC5cbiAgfSk7XG4gIGJsdWVNb3NxdWl0byA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1YyxcbiAgICBzY2FsaW5nOiAyMyxcbiAgICBjbGFzczogJ21vc3F1aXRvJyxcbiAgfSk7XG4gIHN3YW1wUGxhbnQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NWQsXG4gICAgc2NhbGluZzogMTAsXG4gIH0pO1xuICBnaWFudEluc2VjdCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1ZSxcbiAgICBzY2FsaW5nOiAxMSxcbiAgICB0eXBlOiAnYm9zcycsXG4gIH0pO1xuICBsYXJnZUJsdWVTbGltZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1ZixcbiAgICBzY2FsaW5nOiAxMSxcbiAgICBjbGFzczogJ3NsaW1lJyxcbiAgfSk7XG4gIGljZVpvbWJpZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2MCxcbiAgICBzY2FsaW5nOiAxMixcbiAgICBjbGFzczogJ3pvbWJpZScsXG4gIH0pO1xuICBncmVlbkJyYWluID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDYxLFxuICAgIHNjYWxpbmc6IDEyLFxuICAgIGNsYXNzOiAnYnJhaW4nLFxuICB9KTtcbiAgZ3JlZW5TcGlkZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjIsXG4gICAgc2NhbGluZzogMTIsXG4gICAgY2xhc3M6ICdzcGlkZXInLFxuICB9KTtcbiAgcmVkV3l2ZXJuID0gbmV3IE1vbnN0ZXIodGhpcywgeyAvLyBhbHNvIHB1cnBsZT9cbiAgICBpZDogMHg2MyxcbiAgICBzY2FsaW5nOiAxMixcbiAgICBjbGFzczogJ3d5dmVybicsXG4gIH0pO1xuICBzb2xkaWVyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDY0LFxuICAgIHNjYWxpbmc6IDE0LFxuICAgIGNsYXNzOiAnc29sZGllcicsXG4gIH0pO1xuICBpY2VFbnRpdHkgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjUsXG4gICAgc2NhbGluZzogMTQsXG4gICAgY2xhc3M6ICdlbnRpdHknLFxuICB9KTtcbiAgcmVkQnJhaW4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjYsXG4gICAgc2NhbGluZzogMTQsXG4gICAgY2xhc3M6ICdicmFpbicsXG4gIH0pO1xuICBpY2VHb2xlbSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2NyxcbiAgICBzY2FsaW5nOiAxNCxcbiAgICBjbGFzczogJ2dvbGVtJyxcbiAgfSk7XG4gIGtlbGJlc3F1ZTEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjgsXG4gICAgc2NhbGluZzogMTUsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICB9KTtcbiAgbGFyZ2VSZWRTbGltZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2OSxcbiAgICBzY2FsaW5nOiAxOCxcbiAgICBjbGFzczogJ3NsaW1lJyxcbiAgfSk7XG4gIHRyb2xsID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDZhLFxuICAgIHNjYWxpbmc6IDE4LFxuICB9KTtcbiAgcmVkSmVsbHkgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NmIsXG4gICAgc2NhbGluZzogMTgsXG4gICAgY2xhc3M6ICdqZWxseScsXG4gIH0pO1xuICBtZWR1c2EgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NmMsXG4gICAgc2NhbGluZzogMTksXG4gIH0pO1xuICBjcmFiID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDZkLFxuICAgIHNjYWxpbmc6IDE5LFxuICB9KTtcbiAgbWVkdXNhSGVhZCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2ZSxcbiAgICBzY2FsaW5nOiAyMCxcbiAgfSk7XG4gIGJpcmQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NmYsXG4gICAgc2NhbGluZzogMjAsXG4gICAgY2xhc3M6ICdiaXJkJyxcbiAgfSk7XG4gIHJlZE11c2hyb29tID0gbmV3IE1vbnN0ZXIodGhpcywgeyAvLyBhbHNvIHB1cnBsZVxuICAgIGlkOiAweDcxLFxuICAgIHNjYWxpbmc6IDIxLFxuICAgIGNsYXNzOiAnbXVzaHJvb20nLFxuICB9KTtcbiAgZWFydGhFbnRpdHkgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NzIsXG4gICAgc2NhbGluZzogMjIsXG4gICAgY2xhc3M6ICdlbnRpdHknLFxuICB9KTtcbiAgbWltaWMgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NzMsXG4gICAgc2NhbGluZzogMjIsXG4gIH0pO1xuICByZWRTcGlkZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NzQsXG4gICAgc2NhbGluZzogMjIsXG4gICAgY2xhc3M6ICdzcGlkZXInLFxuICB9KTtcbiAgZmlzaG1hbiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3NSxcbiAgICBzY2FsaW5nOiAyNSxcbiAgfSk7XG4gIGplbGx5ZmlzaCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3NixcbiAgICBzY2FsaW5nOiAyNSxcbiAgfSk7XG4gIGtyYWtlbiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3NyxcbiAgICBzY2FsaW5nOiAyNSxcbiAgfSk7XG4gIGRhcmtHcmVlbld5dmVybiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3OCxcbiAgICBzY2FsaW5nOiAyNyxcbiAgICBjbGFzczogJ3d5dmVybicsXG4gIH0pO1xuICBzYW5kWm9tYmllID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDc5LFxuICAgIHNjYWxpbmc6IDM4LFxuICAgIGNsYXNzOiAnem9tYmllJyxcbiAgfSk7XG4gIHdyYWl0aFNoYWRvdzEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4N2IsXG4gICAgc2NhbGluZzogMjgsXG4gICAgY2xhc3M6ICd3cmFpdGgnLFxuICB9KTtcbiAgbW90aCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3YyxcbiAgICBzY2FsaW5nOiAyOCxcbiAgICBkaWZmaWN1bHR5OiAzLFxuICB9KTtcbiAgc2FiZXJhMSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3ZCxcbiAgICBzY2FsaW5nOiAyOSxcbiAgICB0eXBlOiAnYm9zcycsXG4gIH0pO1xuICB2ZXJ0aWNhbFBsYXRmb3JtID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg3ZSk7IC8vIHNjYWxpbmc6IDI4ID9cbiAgaG9yaXpvdGFsUGxhdGZvcm0gPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweDdmKTsgLy8gc2NhbGluZzogMjggP1xuICBhcmNoZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ODAsXG4gICAgc2NhbGluZzogMzMsXG4gICAgY2xhc3M6ICdzb2xkaWVyJyxcbiAgfSk7XG4gIGJvbWJlckJpcmQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ODEsXG4gICAgc2NhbGluZzogMzMsXG4gICAgY2xhc3M6ICdiaXJkJyxcbiAgfSk7XG4gIGxhdmFCbG9iID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDgyLFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIGNsYXNzOiAncHVkZGxlJyxcbiAgfSk7XG4gIGZsYWlsR3V5ID0gbmV3IE1vbnN0ZXIodGhpcywgeyAvLyBsaXphcmQgbWFuXG4gICAgaWQ6IDB4ODQsXG4gICAgc2NhbGluZzogMzcsXG4gIH0pO1xuICBibHVlRXllID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDg1LFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIGNsYXNzOiAnZXllJyxcbiAgfSk7XG4gIHNhbGFtYW5kZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ODYsXG4gICAgc2NhbGluZzogMzcsXG4gIH0pO1xuICBzb3JjZXJvciA9IG5ldyBNb25zdGVyKHRoaXMsIHsgLy8gYnVydFxuICAgIGlkOiAweDg3LFxuICAgIHNjYWxpbmc6IDM3LFxuICB9KTtcbiAgbWFkbzEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ODgsXG4gICAgc2NhbGluZzogMzcsXG4gIH0pO1xuICBrbmlnaHQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ODksXG4gICAgc2NhbGluZzogNDEsXG4gICAgZGlmZmljdWx0eTogMSxcbiAgfSk7XG4gIGRldmlsID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDhhLFxuICAgIHNjYWxpbmc6IDQxLFxuICB9KTtcbiAga2VsYmVzcXVlMiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4YixcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAnYm9zcycsXG4gIH0pO1xuICB3cmFpdGhTaGFkb3cyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDhjLFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIGNsYXNzOiAnd3JhaXRoJyxcbiAgfSk7XG4gIGdsaXRjaDEgPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweDhkKTsgLy8gc2NhbGluZzogNDEgP1xuICBnbGl0Y2gyID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg4ZSk7IC8vIHNjYWxpbmc6IDQxID9cbiAgZ3VhcmRpYW5TdGF0dWUgPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweDhmKTsgLy8gc2NhbGluZzogNDEgP1xuICBzYWJlcmEyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDkwLFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdib3NzJyxcbiAgfSk7XG4gIHRhcmFudHVsYSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5MSxcbiAgICBzY2FsaW5nOiA0MSxcbiAgfSk7XG4gIHNrZWxldG9uID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDkyLFxuICAgIHNjYWxpbmc6IDQxLFxuICB9KTtcbiAgbWFkbzIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTMsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICB9KTtcbiAgcHVycGxlRXllID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk0LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIGNsYXNzOiAnZXllJyxcbiAgfSk7XG4gIGZsYWlsS25pZ2h0ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk1LFxuICAgIHNjYWxpbmc6IDQxLFxuICB9KTtcbiAgc2NvcnBpb24gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTYsXG4gICAgc2NhbGluZzogNDEsXG4gIH0pO1xuICBrYXJtaW5lID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk3LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdib3NzJyxcbiAgfSk7XG4gIHNhbmRCbG9iID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk4LFxuICAgIHNjYWxpbmc6IDQ0LFxuICAgIGNsYXNzOiAncHVkZGxlJyxcbiAgfSk7XG4gIG11bW15ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk5LFxuICAgIHNjYWxpbmc6IDQ0LFxuICB9KTtcbiAgd2FybG9jayA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5YSxcbiAgICBzY2FsaW5nOiA0NixcbiAgfSk7XG4gIGRyYXlnb24xID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDliLFxuICAgIHNjYWxpbmc6IDQ1LFxuICAgIHR5cGU6ICdib3NzJyxcbiAgfSk7XG4gIHN0YXR1ZU9mU3VuID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg5Yyk7IC8vIHNjYWxpbmc6IDQ3ID9cbiAgc3RhdHVlT2ZNb29uID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg5ZCk7IC8vIHNjYWxpbmc6IDQ3ID9cbiAgZHJheWdvbjIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OWUsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICB9KTtcbiAgY3J1bWJsaW5nVmVydGljYWxQbGF0Zm9ybSA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4OWYpOyAvLyBzY2FsaW5nOiA0NyA/XG4gIGJyb3duUm9ib3QgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YTAsXG4gICAgc2NhbGluZzogNDcsXG4gICAgZGlmZmljdWx0eTogMSxcbiAgfSk7XG4gIHdoaXRlUm9ib3QgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YTEsXG4gICAgc2NhbGluZzogNDcsXG4gIH0pO1xuICB0b3dlclNlbnRpbmVsID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGEyLFxuICAgIHNjYWxpbmc6IDQ3LFxuICB9KTtcbiAgaGVsaWNvcHRlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhhMyxcbiAgICBzY2FsaW5nOiA0NyxcbiAgfSk7XG4gIGR5bmEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YTQsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICB9KTtcbiAgdmFtcGlyZTIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YTUsXG4gICAgc2NhbGluZzogMjgsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICB9KTtcbiAgZ2xpdGNoMyA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4YTYpOyAvLyBzY2FsaW5nOiA0MSA/XG4gIGR5bmFQb2QgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YjQsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICB9KTtcbiAgZHluYUNvdW50ZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YjgsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZHluYUxhc2VyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGI5LFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGR5bmFCdWJibGUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YmEsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgdmFtcGlyZTJCYXQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YmMsXG4gICAgc2NhbGluZzogMjgsXG4gICAgLy8gdHlwZTogJ3Byb2plY3RpbGUnLCAvLyBvZiBzb3J0cy4uLj9cbiAgfSk7XG4gIGJyb3duUm9ib3RMYXNlclNvdXJjZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhiZSxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBkcmF5Z29uMkZpcmViYWxsID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGJmLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHZhbXBpcmUxQmF0ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGMxLFxuICAgIHNjYWxpbmc6IDUsXG4gICAgLy90eXBlOiAncHJvamVjdGlsZScsIC8vIG9mIHNvcnRzXG4gIH0pO1xuICBnaWFudEluc2VjdEZpcmViYWxsID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGMzLFxuICAgIHNjYWxpbmc6IDExLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGdyZWVuTW9zcXVpdG8gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzQsXG4gICAgc2NhbGluZzogMTEsXG4gICAgLy90eXBlOiAncHJvamVjdGlsZScsIC8vIG9mIHNvcnRzXG4gIH0pO1xuICBrZWxiZXNxdWUxUm9jayA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjNSxcbiAgICBzY2FsaW5nOiAxNSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBzYWJlcmExQmFsbHMgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzYsXG4gICAgc2NhbGluZzogMjksXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAga2VsYmVzcXVlMkZpcmUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzcsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc2FiZXJhMkZpcmUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzgsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc2FiZXJhMkJhbGxzID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGM5LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGthcm1pbmVCYWxscyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjYSxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBzdGF0dWVCYWxscyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjYixcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBkcmF5Z29uMUxpZ2h0bmluZyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjYyxcbiAgICBzY2FsaW5nOiA0NSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBkcmF5Z29uMkxhc2VyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGNkLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGRyYXlnb24yQnJlYXRoID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGNlLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGJpcmRCb21iID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGUwLFxuICAgIHNjYWxpbmc6IDMzLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGdyZWVuTW9zcXVpdG9TaG90ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGUyLFxuICAgIHNjYWxpbmc6IDExLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHBhcmFseXNpc0JlYW0gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTMsXG4gICAgc2NhbGluZzogMjUsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc3RvbmVHYXplID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGU0LFxuICAgIHNjYWxpbmc6IDE5LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHJvY2tHb2xlbVJvY2sgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTUsXG4gICAgc2NhbGluZzogNCxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBjdXJzZUJlYW0gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTYsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgbXBEcmFpbldlYiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlNyxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBmaXNobWFuVHJpZGVudCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlOCxcbiAgICBzY2FsaW5nOiAyNSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBvcmNBeGUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTksXG4gICAgc2NhbGluZzogNixcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBzd2FtcFBvbGxlbiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlYSxcbiAgICBzY2FsaW5nOiAxMCxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBwYXJhbHlzaXNQb3dkZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZWIsXG4gICAgc2NhbGluZzogMjMsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc29sZGllclN3b3JkID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGVjLFxuICAgIHNjYWxpbmc6IDE0LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGljZUdvbGVtUm9jayA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlZCxcbiAgICBzY2FsaW5nOiAxNCxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICB0cm9sbEF4ZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlZSxcbiAgICBzY2FsaW5nOiAxOCxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBrcmFrZW5JbmsgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZWYsXG4gICAgc2NhbGluZzogMjUsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgYXJjaGVyQXJyb3cgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjAsXG4gICAgc2NhbGluZzogMzMsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAga25pZ2h0U3dvcmQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjIsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgbW90aFJlc2lkdWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjMsXG4gICAgc2NhbGluZzogMjgsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgYnJvd25Sb2JvdExhc2VyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGY0LFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHdoaXRlUm9ib3RMYXNlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmNSxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICB0b3dlclNlbnRpbmVsTGFzZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjYsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgc2tlbGV0b25TaG90ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGY3LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGJsb2JTaG90ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGY4LFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGZsYWlsS25pZ2h0RmxhaWwgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjksXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZmxhaWxHdXlGbGFpbCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmYSxcbiAgICBzY2FsaW5nOiAzNyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBtYWRvU2h1cmlrZW4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZmMsXG4gICAgc2NhbGluZzogMzcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZ3VhcmRpYW5TdGF0dWVNaXNzaWxlID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGZkLFxuICAgIHNjYWxpbmc6IDM2LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGRlbW9uV2FsbEZpcmUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZmUsXG4gICAgc2NhbGluZzogMzcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIHN1cGVyKDB4MTAwKTtcblxuICAgIGZvciAoY29uc3Qga2V5IGluIHRoaXMpIHtcbiAgICAgIGNvbnN0IG9iaiA9IHRoaXNba2V5IGFzIGtleW9mIHRoaXNdO1xuICAgICAgaWYgKCEob2JqIGluc3RhbmNlb2YgT2JqZWN0RGF0YSkpIGNvbnRpbnVlO1xuICAgICAgb2JqLm5hbWUgPSBsb3dlckNhbWVsVG9TcGFjZXMoa2V5KTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXNbaV0pIHtcbiAgICAgICAgdGhpc1tpXSA9IG5ldyBPYmplY3REYXRhKHRoaXMsIGkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vLyBleHBvcnQgdHlwZSBNb25zdGVyVHlwZSA9ICdtb25zdGVyJyB8ICdib3NzJyB8ICdwcm9qZWN0aWxlJztcbi8vIGV4cG9ydCB0eXBlIFRlcnJhaW4gPSAnd2FsaycgfCAnc3dpbScgfCAnc29hcicgfCAnZmx1dHRlcicgfCAnc3RhbmQnO1xuXG5leHBvcnQgdHlwZSBDb25zdHJhaW50ID0gTWFwPHN0cmluZywgcmVhZG9ubHkgW3JlYWRvbmx5IG51bWJlcltdLCBib29sZWFuIHwgbnVsbF0+O1xuLy8ga2V5IGlzIHR1cGxlWzBdLmpvaW4oJywnKVxuLy8gdmFsdWVbMF0gaXMgW1txdWFkIGZvciByZXF1aXJlZCBwYXQwLCBwYXQxLCBwYWwyLCBwYWwzXVxuLy8gdmFsdWVbMV0gaXMgdHJ1ZSBpZiBuZWVkIHBhdDEsIGZhbHNlIGlmIG5lZWQgcGF0MCwgbnVsbCBpZiBuZWl0aGVyXG4vLyAgIC0tLT4gYnV0IHdlIG5lZWQgdG8ga2VlcCB0cmFjayBvZiBhIGhhbmZ1bCBvZiBzcGF3bnMsIG5vdCBqdXN0IHRvbmUuXG5cblxuICAvLyBtb25zdGVyKDB4NTAsICdCbHVlIFNsaW1lJywgMHgyMCwgNiwge1xuICAvLyAgIGhpdHM6IDEsIHNhdGs6IDE2LCBkZ2xkOiAyLCBzZXhwOiAzMixcbiAgLy8gICBtdXN0OiBhbmQocGF0KDB4NjQpLCBwYWwoMiwgMHgyMSkpLFxuICAvLyB9KTtcbiAgLy8gbW9uc3RlcigweDUxLCAnV2VyZXRpZ2VyJywgMHgyNCwgNywge1xuICAvLyAgIGhpdHM6IDEuNSwgc2F0azogMjEsIGRnbGQ6IDQsIHNleHA6IDQwLFxuICAvLyAgIG11c3Q6IGFuZChwYXQoMHg2MCksIHBhbCgzLCAweDIwKSksXG4gIC8vIH0pO1xuICAvLyBtb25zdGVyKDB4NTIsICdHcmVlbiBKZWxseScsIDB4MjAsIDEwLCB7XG4gIC8vICAgc2RlZjogNCwgaGl0czogMywgc2F0azogMTYsIGRnbGQ6IDQsIHNleHA6IDM2LFxuICAvLyAgIG11c3Q6IGFuZChwYXQoMHg2NSksIHBhbCgyLCAweDIyKSksXG4gIC8vIH0pO1xuICAvLyBtb25zdGVyKDB4NTMsICdSZWQgU2xpbWUnLCAweDIwLCAxNiwge1xuICAvLyAgIHNkZWY6IDYsIGhpdHM6IDQsIHNhdGs6IDE2LCBkZ2xkOiA0LCBzZXhwOiA0OCxcbiAgLy8gICBtdXN0OiBhbmQocGF0KDB4NjQpLCBwYWwoMiwgMHgyMykpLFxuICAvLyB9KTtcblxuXG4vLyBleHBvcnQgaW50ZXJmYWNlIE1vbnN0ZXIge1xuLy8gICBpZDogbnVtYmVyO1xuLy8gICBuYW1lOiBzdHJpbmc7XG4vLyAgIGFjdGlvbjogbnVtYmVyO1xuLy8gICBjb3VudDogbnVtYmVyO1xuLy8gICB0eXBlPzogTW9uc3RlclR5cGU7IC8vIGRlZmF1bHQgaXMgbW9uc3RlclxuLy8gICBtb3ZlPzogVGVycmFpbjsgLy8gZGVmYXVsdCBpcyB3YWxrXG4vLyAgIHNkZWY/OiBudW1iZXI7XG4vLyAgIHN3cmQ/OiBudW1iZXI7XG4vLyAgIGhpdHM/OiBudW1iZXI7XG4vLyAgIHNhdGs/OiBudW1iZXI7XG4vLyAgIGRnbGQ/OiBudW1iZXI7XG4vLyAgIHNleHA/OiBudW1iZXI7XG4vLyAgIGVsZW0/OiBudW1iZXI7XG4vLyAgIHNwZD86IG51bWJlcjtcbi8vICAgc3RhdHVzOiBudW1iZXI7XG4vLyAgIHBlcnNpc3Q/OiBib29sZWFuO1xuLy8gICBtdXN0PzogQ29uc3RyYWludDtcbi8vIH1cblxuLy8gaW50ZXJmYWNlIEFkanVzdG1lbnRzIHtcbi8vICAgdmFuaWxsYUxldmVsPzogbnVtYmVyO1xuLy8gICB2YW5pbGxhU3dvcmQ/OiBudW1iZXI7XG4vLyAgIHNkZWY/OiBudW1iZXI7XG4vLyAgIHN3cmQ/OiBudW1iZXI7XG4vLyAgIGhpdHM/OiBudW1iZXI7XG4vLyAgIHNhdGs/OiBudW1iZXI7XG4vLyAgIGRnbGQ/OiBudW1iZXI7XG4vLyAgIHNleHA/OiBudW1iZXI7XG4vLyAgIGVsZW0/OiBudW1iZXI7XG4vLyAgIHNwZD86IG51bWJlcjtcbi8vIH1cblxuLy8gaW50ZXJmYWNlIFBsYXllclN0YXRzIHtcbi8vICAgYXJtb3I6IG51bWJlcjtcbi8vICAgbGV2ZWw6IG51bWJlcjtcbi8vICAgc2hpZWxkOiBudW1iZXI7XG4vLyAgIHN3b3JkOiBudW1iZXI7XG4vLyB9XG5cbi8vIGNvbnN0IFZBTklMTEFfU1dPUkRTID0gWzIsIDIsIDIsIDIsIDQsIDQsIDQsIDgsIDgsIDgsIDgsIDE2LCAxNiwgMTYsIDE2LCAxNl07XG5cbi8vIGNvbnN0IHt9ID0ge1ZBTklMTEFfU1dPUkRTfSBhcyBhbnk7XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZShyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogTW9uc3RlcltdIHtcbi8vICAgY29uc3Qge30gPSB7cm9tLCBmbGFncywgcmFuZG9tfSBhcyBhbnk7XG5cbi8vICAgY29uc3Qgb3V0OiBNb25zdGVyW10gPSBbXTtcblxuLy8gICBjb25zdCBwbGF5ZXI6IFBsYXllclN0YXRzID0ge1xuLy8gICAgIGFybW9yOiAyLFxuLy8gICAgIGxldmVsOiAxLFxuLy8gICAgIHNoaWVsZDogMixcbi8vICAgICBzd29yZDogMixcbi8vICAgfTtcblxuLy8gICBmdW5jdGlvbiBiYXNlKGlkOiBudW1iZXIsIG5hbWU6IHN0cmluZywgYWRqOiBBZGp1c3RtZW50cyA9IHt9KSB7XG4vLyAgICAgY29uc3QgbyA9IHJvbS5vYmplY3RzW2lkXTtcbi8vICAgICBsZXQge2FjdGlvbiwgaW1tb2JpbGUsIGxldmVsLCBhdGssIGRlZiwgaHAsXG4vLyAgICAgICAgICBlbGVtZW50cywgZ29sZERyb3AsIGV4cFJld2FyZCwgc3RhdHVzRWZmZWN0fSA9IG87XG5cbi8vICAgICAvLyAvLyBXaGF0IGxldmVsIHNob3VsZCB0aGUgcGxheWVyIGJlIGF0IHdoZW4gZW5jb3VudGVyaW5nIHRoaXMgaW4gdmFuaWxsYT9cbi8vICAgICAvLyBpZiAoYWRqLnZhbmlsbGFMZXZlbCkgbGV2ZWwgPSBhZGoudmFuaWxsYUxldmVsO1xuLy8gICAgIGxldmVsID0gcGxheWVyLmxldmVsO1xuXG4vLyAgICAgLy8gV2hhdCBzd29yZCB3b3VsZCB0aGV5IGJlIHVzaW5nPyAgUGljayB0aGUgaGlnaGVzdCBub24taW1tdW5lIHN3b3JkIHRoYXRcbi8vICAgICAvLyB3b3VsZCBiZSBhdmFpbGFibGUgYXQgdGhpcyBwb2ludCBpbiB0aGUgZ2FtZS5cbi8vICAgICBsZXQgc3dvcmQgPSBwbGF5ZXIuc3dvcmQ7XG4vLyAgICAgd2hpbGUgKHN3b3JkID4gMSAmJiAoZWxlbWVudHMgJiAoc3dvcmQgPj4+IDEpKSkge1xuLy8gICAgICAgc3dvcmQgPj4+PSAxO1xuLy8gICAgIH1cbi8vICAgICBpZiAoYWRqLnZhbmlsbGFTd29yZCkgc3dvcmQgPSBhZGoudmFuaWxsYVN3b3JkO1xuLy8gICAgIGNvbnN0IHBhdGsgPSBzd29yZCArIGxldmVsOyAvLyBleHBlY3RlZCBwbGF5ZXIgYXR0YWNrXG5cbi8vICAgICAvLyBIb3cgbWFueSBoaXRzIHdvdWxkIGl0IHRha2UgdG8ga2lsbCBpbiB2YW5pbGxhPyAoY29uc2lkZXIgbm8gZmxvb3I/KVxuLy8gICAgIGNvbnN0IHZhbmlsbGFIaXRzID0gTWF0aC5mbG9vcigoaHAgKyAxKSAvIChwYXRrIC0gZGVmKSk7XG4vLyAgICAgY29uc3QgaGl0cyA9IGFkai5oaXRzIHx8IHZhbmlsbGFIaXRzO1xuXG4vLyAgICAgLy8gU2NhbGVkIGRlZmVuc2UgKHdpbGwgYmUgc3RvcmVkIGluIGVpZ2h0aHMpXG4vLyAgICAgY29uc3Qgc2RlZiA9IGFkai5zZGVmICE9IG51bGwgPyBhZGouc2RlZiA6IGRlZiAvIHBhdGs7IC8vIG5vcm1hbGx5ICo4XG5cbi8vICAgICAvLyBFeHBlY3RlZCBwbGF5ZXIgSFAgYW5kIGRlZmVuc2UgYXQgdmFuaWxsYSBsZXZlbFxuLy8gICAgIGNvbnN0IHBocCA9IE1hdGgubWluKDI1NSwgMzIgKyAxNiAqIGxldmVsKTtcbi8vICAgICBjb25zdCBwZGVmID0gby5hdHRhY2tUeXBlID8gcGxheWVyLnNoaWVsZCA6IHBsYXllci5hcm1vcjtcbi8vICAgICBjb25zdCB2YW5pbGxhRGFtYWdlID0gTWF0aC5tYXgoMCwgYXRrIC0gbGV2ZWwgLSBwZGVmKSAvIHBocDtcbi8vICAgICBjb25zdCBzYXRrID0gYWRqLnNhdGsgIT0gbnVsbCA/IGFkai5zYXRrIDogdmFuaWxsYURhbWFnZTsgLy8gbm9ybWFsbHkgKjEyOFxuXG4vLyAgICAgLy8gVE9ETyAtIHRoZW4gY29tcHV0ZSBnb2xkL2V4cFxuXG4vLyAgICAgY29uc3Qge30gPSB7c2RlZiwgc2F0aywgaGl0cywgaW1tb2JpbGUsIGdvbGREcm9wLCBleHBSZXdhcmQsIHN0YXR1c0VmZmVjdH0gYXMgYW55O1xuXG4vLyAgICAgY29uc3QgbTogTW9uc3RlciA9IHtpZCwgbmFtZX0gYXMgYW55O1xuXG4vLyAgICAgbS5pZCA9IGlkO1xuLy8gICAgIG0ubmFtZSA9IG5hbWU7XG4vLyAgICAgbS50eXBlID0gJ21vbnN0ZXInO1xuLy8gICAgIG0uYWN0aW9uID0gYWN0aW9uO1xuLy8gICAgIG0uY291bnQgPSAwOyAvLyBjb3VudDtcbi8vICAgICBvdXQucHVzaChtKTtcbi8vICAgfVxuXG4vLyAgIC8vIFRPRE8gLSBhZGRpdGlvbmFsIGNvbnN0cmFpbnRzIGFib3V0IGUuZy4gcGxhY2VtZW50LCBldGM/XG4vLyAgIC8vICAgICAgLSBubyBYIG9uIFkgbGV2ZWwuLi4/XG5cbi8vICAgcmV0dXJuIG91dDtcbi8vIH1cblxuLy8gZnVuY3Rpb24gYW5kKHg6IENvbnN0cmFpbnQsIHk6IENvbnN0cmFpbnQpOiBDb25zdHJhaW50IHtcbi8vICAgcmV0dXJuIFtdO1xuLy8gfVxuLy8gZnVuY3Rpb24gcGF0KGlkOiBudW1iZXIpOiBDb25zdHJhaW50IHtcbi8vICAgcmV0dXJuIFtdO1xuLy8gfVxuLy8gZnVuY3Rpb24gcGFsKHdoaWNoOiBudW1iZXIsIGlkOiBudW1iZXIpOiBDb25zdHJhaW50IHtcbi8vICAgcmV0dXJuIFtdO1xuLy8gfVxuXG4vLyBjb25zdCB7fSA9IHthbmQsIHBhdCwgcGFsfSBhcyBhbnk7XG4iXX0=