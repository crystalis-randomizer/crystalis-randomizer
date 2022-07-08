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
            displayName: 'Blue Bat',
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
            displayName: 'Treasure Mimic',
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
            displayName: 'Emporer Draygon',
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
            modules.push(a.module());
        }
        return modules;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9yb20vb2JqZWN0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN2QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDL0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQVkxQyxNQUFNLE9BQU8sT0FBUSxTQUFRLFdBQXVCO0lBMnJCbEQsWUFBcUIsR0FBUTtRQUMzQixLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFETSxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBenJCN0IsaUJBQVksR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDL0IsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxZQUFZO1NBQ25CLENBQUMsQ0FBQztRQUNILFlBQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDMUIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxRQUFRO1lBQ2YsV0FBVyxFQUFFLFFBQVE7U0FDdEIsQ0FBQyxDQUFDO1FBQ0gsMEJBQXFCLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFDSCxZQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQzFCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxLQUFLLEVBQUUsUUFBUTtZQUNmLFdBQVcsRUFBRSxRQUFRO1NBQ3RCLENBQUMs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bGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbi8vIGltcG9ydCB7UmFuZG9tfSBmcm9tICcuLi9yYW5kb20uanMnO1xuaW1wb3J0IHsgUm9tIH0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7IE9iamVjdERhdGEgfSBmcm9tICcuL29iamVjdGRhdGEuanMnO1xuaW1wb3J0IHsgTW9uc3RlciB9IGZyb20gJy4vbW9uc3Rlci5qcyc7XG5pbXBvcnQgeyBsb3dlckNhbWVsVG9TcGFjZXMgfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHsgRW50aXR5QXJyYXkgfSBmcm9tICcuL2VudGl0eS5qcyc7XG5pbXBvcnQgeyBNb2R1bGUgfSBmcm9tICcuLi9hc20vbW9kdWxlLmpzJztcblxuLy8gTWFudWFsIGRhdGEgYWJvdXQgbW9uc3RlcnMuICBFdmVyeSBtb25zdGVyIG5lZWRzIGF0IGxlYXN0IGFuIElELXRvLW5hbWUgbWFwcGluZyxcbi8vIFdlIGFsc28gY2FuJ3QgZXhwZWN0IHRvIGdldCB0aGUgZGlmZmljdWx0eSBtYXBwaW5nIGF1dG9tYXRpY2FsbHksIHNvIHRoYXQnc1xuLy8gaW5jbHVkZWQgaGVyZSwgdG9vLlxuXG4vLyBUT0RPIC0gYWN0aW9uIHNjcmlwdCB0eXBlc1xuLy8gICAgICAtPiBjb21wYXRpYmlsaXR5IHdpdGggb3RoZXIgbW9uc3RlcnNcbi8vICAgICAgICAgY29uc3RyYWludHMgb24gZXh0cmEgYXR0cmlidXRlc1xuLy8gICAgICAgICBkaWZmaWN1bHR5IHJhdGluZ3NcblxuZXhwb3J0IGNsYXNzIE9iamVjdHMgZXh0ZW5kcyBFbnRpdHlBcnJheTxPYmplY3REYXRhPiB7XG5cbiAgc29yY2Vyb3JTaG90ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDNmLFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHdyYWl0aDEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NGIsXG4gICAgc2NhbGluZzogMjQsXG4gICAgY2xhc3M6ICd3cmFpdGgnLFxuICAgIGRpc3BsYXlOYW1lOiAnV3JhaXRoJyxcbiAgfSk7XG4gIHBhcmFseXNpc1Bvd2RlclNvdXJjZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg0ZCxcbiAgICBzY2FsaW5nOiAyMyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICB3cmFpdGgyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDRmLFxuICAgIHNjYWxpbmc6IDI4LFxuICAgIGNsYXNzOiAnd3JhaXRoJyxcbiAgICBkaXNwbGF5TmFtZTogJ1dyYWl0aCcsXG4gIH0pO1xuICBibHVlU2xpbWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTAsXG4gICAgc2NhbGluZzogMSxcbiAgICBjbGFzczogJ3NsaW1lJyxcbiAgICBkaXNwbGF5TmFtZTogJ1NsaW1lJyxcbiAgfSk7XG4gIHdlcmV0aWdlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1MSxcbiAgICBzY2FsaW5nOiAxLFxuICAgIGRpc3BsYXlOYW1lOiAnV2VyZXRpZ2VyJyxcbiAgfSk7XG4gIGdyZWVuSmVsbHkgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTIsXG4gICAgc2NhbGluZzogNCxcbiAgICBjbGFzczogJ2plbGx5JyxcbiAgICBkaXNwbGF5TmFtZTogJ1NsdWcnLFxuICB9KTtcbiAgcmVkU2xpbWUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTMsXG4gICAgc2NhbGluZzogNCxcbiAgICBjbGFzczogJ3NsaW1lJyxcbiAgICBkaXNwbGF5TmFtZTogJ1BvaXNvbiBTbGltZScsXG4gIH0pO1xuICByb2NrR29sZW0gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTQsXG4gICAgc2NhbGluZzogNCxcbiAgICBjbGFzczogJ2dvbGVtJyxcbiAgICBkaXNwbGF5TmFtZTogJ011ZCBHb2xlbScsXG4gIH0pO1xuICBibHVlQmF0ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDU1LFxuICAgIHNjYWxpbmc6IDQsXG4gICAgZGlzcGxheU5hbWU6ICdCbHVlIEJhdCcsXG4gIH0pO1xuICBncmVlbld5dmVybiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1NixcbiAgICBzY2FsaW5nOiA0LFxuICAgIGNsYXNzOiAnd3l2ZXJuJyxcbiAgICBkaXNwbGF5TmFtZTogJ1d5dmVybicsXG4gIH0pO1xuICB2YW1waXJlMSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1NyxcbiAgICBzY2FsaW5nOiA1LFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ1ZhbXBpcmUnLFxuICB9KTtcbiAgb3JjID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDU4LFxuICAgIHNjYWxpbmc6IDYsXG4gICAgZGlzcGxheU5hbWU6ICdBeGUgV2VyZWJvYXInLFxuICB9KTtcbiAgcmVkTW9zcXVpdG8gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NTksXG4gICAgc2NhbGluZzogMTAsXG4gICAgY2xhc3M6ICdtb3NxdWl0bycsXG4gICAgZGlzcGxheU5hbWU6ICdNb3NxdWl0bycsXG4gIH0pO1xuICBibHVlTXVzaHJvb20gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NWEsXG4gICAgc2NhbGluZzogMTAsXG4gICAgY2xhc3M6ICdtdXNocm9vbScsXG4gICAgZGlzcGxheU5hbWU6ICdNdXNocm9vbScsXG4gIH0pO1xuICBzd2FtcFRvbWF0byA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1YixcbiAgICBzY2FsaW5nOiAxMC4sXG4gICAgZGlzcGxheU5hbWU6ICdQaWxsYnVnJyxcbiAgfSk7XG4gIGJsdWVNb3NxdWl0byA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg1YyxcbiAgICBzY2FsaW5nOiAyMyxcbiAgICBjbGFzczogJ21vc3F1aXRvJyxcbiAgICBkaXNwbGF5TmFtZTogJ01vc3F1aXRvJyxcbiAgfSk7XG4gIHN3YW1wUGxhbnQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NWQsXG4gICAgc2NhbGluZzogMTAsXG4gICAgZGlzcGxheU5hbWU6ICdTd2FtcCBEYW5kZWxpb24nLFxuICB9KTtcbiAgZ2lhbnRJbnNlY3QgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NWUsXG4gICAgc2NhbGluZzogMTEsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnR2lhbnQgSW5zZWN0JyxcbiAgfSk7XG4gIGxhcmdlQmx1ZVNsaW1lID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDVmLFxuICAgIHNjYWxpbmc6IDExLFxuICAgIGNsYXNzOiAnc2xpbWUnLFxuICAgIGRpc3BsYXlOYW1lOiAnTGFyZ2UgU2xpbWUnLFxuICB9KTtcbiAgaWNlWm9tYmllID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDYwLFxuICAgIHNjYWxpbmc6IDEyLFxuICAgIGNsYXNzOiAnem9tYmllJyxcbiAgICBkaXNwbGF5TmFtZTogJ0ljZSBab21iaWUnLFxuICB9KTtcbiAgZ3JlZW5CcmFpbiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2MSxcbiAgICBzY2FsaW5nOiAxMixcbiAgICBjbGFzczogJ2JyYWluJyxcbiAgICBkaXNwbGF5TmFtZTogJ0JyYWluJyxcbiAgfSk7XG4gIGdyZWVuU3BpZGVyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDYyLFxuICAgIHNjYWxpbmc6IDEyLFxuICAgIGNsYXNzOiAnc3BpZGVyJyxcbiAgICBkaXNwbGF5TmFtZTogJ1NwaWRlcicsXG4gIH0pO1xuICByZWRXeXZlcm4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7IC8vIGFsc28gcHVycGxlP1xuICAgIGlkOiAweDYzLFxuICAgIHNjYWxpbmc6IDEyLFxuICAgIGNsYXNzOiAnd3l2ZXJuJyxcbiAgICBkaXNwbGF5TmFtZTogJ1d5dmVybicsXG4gIH0pO1xuICBzb2xkaWVyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDY0LFxuICAgIHNjYWxpbmc6IDE0LFxuICAgIGNsYXNzOiAnc29sZGllcicsXG4gICAgZGlzcGxheU5hbWU6ICdEcmF5Z29uaWEgU29sZGllcicsXG4gIH0pO1xuICBpY2VFbnRpdHkgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjUsXG4gICAgc2NhbGluZzogMTQsXG4gICAgY2xhc3M6ICdlbnRpdHknLFxuICAgIGRpc3BsYXlOYW1lOiAnSWNlIFBsYW50JyxcbiAgfSk7XG4gIHJlZEJyYWluID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDY2LFxuICAgIHNjYWxpbmc6IDE0LFxuICAgIGNsYXNzOiAnYnJhaW4nLFxuICAgIGRpc3BsYXlOYW1lOiAnUG9pc29uIEJyYWluJyxcbiAgfSk7XG4gIGljZUdvbGVtID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDY3LFxuICAgIHNjYWxpbmc6IDE0LFxuICAgIGNsYXNzOiAnZ29sZW0nLFxuICAgIGRpc3BsYXlOYW1lOiAnSWNlIEdvbGVtJyxcbiAgfSk7XG4gIGtlbGJlc3F1ZTEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NjgsXG4gICAgc2NhbGluZzogMTUsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnR2VuZXJhbCBLZWxiZXNxdWUnLFxuICB9KTtcbiAgbGFyZ2VSZWRTbGltZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2OSxcbiAgICBzY2FsaW5nOiAxOCxcbiAgICBjbGFzczogJ3NsaW1lJyxcbiAgICBkaXNwbGF5TmFtZTogJ0xhcmdlIFBvaXNvbiBTbGltZScsXG4gIH0pO1xuICB0cm9sbCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2YSxcbiAgICBzY2FsaW5nOiAxOCxcbiAgICBkaXNwbGF5TmFtZTogJ1Ryb2xsJyxcbiAgfSk7XG4gIHJlZEplbGx5ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDZiLFxuICAgIHNjYWxpbmc6IDE4LFxuICAgIGNsYXNzOiAnamVsbHknLFxuICAgIGRpc3BsYXlOYW1lOiAnUG9pc29uIEplbGx5JyxcbiAgfSk7XG4gIG1lZHVzYSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg2YyxcbiAgICBzY2FsaW5nOiAxOSxcbiAgICBkaXNwbGF5TmFtZTogJ01lZHVzYScsXG4gIH0pO1xuICBjcmFiID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDZkLFxuICAgIHNjYWxpbmc6IDE5LFxuICAgIGRpc3BsYXlOYW1lOiAnQ3JhYicsXG4gIH0pO1xuICBtZWR1c2FIZWFkID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDZlLFxuICAgIHNjYWxpbmc6IDIwLFxuICAgIGRpc3BsYXlOYW1lOiAnRmx5aW5nIFBsYW50JyxcbiAgfSk7XG4gIGJpcmQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NmYsXG4gICAgc2NhbGluZzogMjAsXG4gICAgY2xhc3M6ICdiaXJkJyxcbiAgICBkaXNwbGF5TmFtZTogJ0JpcmQnLFxuICB9KTtcbiAgcmVkTXVzaHJvb20gPSBuZXcgTW9uc3Rlcih0aGlzLCB7IC8vIGFsc28gcHVycGxlXG4gICAgaWQ6IDB4NzEsXG4gICAgc2NhbGluZzogMjEsXG4gICAgY2xhc3M6ICdtdXNocm9vbScsXG4gICAgZGlzcGxheU5hbWU6ICdQb2lzb24gTXVzaHJvb20nLFxuICB9KTtcbiAgZWFydGhFbnRpdHkgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NzIsXG4gICAgc2NhbGluZzogMjIsXG4gICAgY2xhc3M6ICdlbnRpdHknLFxuICAgIGRpc3BsYXlOYW1lOiAnUG9pc29uIFBsYW50JyxcbiAgfSk7XG4gIG1pbWljID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDczLFxuICAgIHNjYWxpbmc6IDIyLFxuICAgIGRpc3BsYXlOYW1lOiAnVHJlYXN1cmUgTWltaWMnLFxuICB9KTtcbiAgcmVkU3BpZGVyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDc0LFxuICAgIHNjYWxpbmc6IDIyLFxuICAgIGNsYXNzOiAnc3BpZGVyJyxcbiAgICBkaXNwbGF5TmFtZTogJ1BhcmFseXppbmcgU3BpZGVyJyxcbiAgfSk7XG4gIGZpc2htYW4gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NzUsXG4gICAgc2NhbGluZzogMjUsXG4gICAgZGlzcGxheU5hbWU6ICdNdXRhbnQgRmlzaCcsXG4gIH0pO1xuICBqZWxseWZpc2ggPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4NzYsXG4gICAgc2NhbGluZzogMjUsXG4gICAgZGlzcGxheU5hbWU6ICdKZWxseWZpc2gnLFxuICB9KTtcbiAga3Jha2VuID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDc3LFxuICAgIHNjYWxpbmc6IDI1LFxuICAgIGRpc3BsYXlOYW1lOiAnS3Jha2VuJyxcbiAgfSk7XG4gIGRhcmtHcmVlbld5dmVybiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg3OCxcbiAgICBzY2FsaW5nOiAyNyxcbiAgICBjbGFzczogJ3d5dmVybicsXG4gICAgZGlzcGxheU5hbWU6ICdXeXZlcm4gTWFnZScsXG4gIH0pO1xuICBzYW5kWm9tYmllID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDc5LFxuICAgIHNjYWxpbmc6IDM4LFxuICAgIGNsYXNzOiAnem9tYmllJyxcbiAgICBkaXNwbGF5TmFtZTogJ1NhbmQgWm9tYmllJyxcbiAgfSk7XG4gIHdyYWl0aFNoYWRvdzEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4N2IsXG4gICAgc2NhbGluZzogMjgsXG4gICAgY2xhc3M6ICd3cmFpdGgnLFxuICAgIGRpc3BsYXlOYW1lOiAnU2hhZG93JyxcbiAgfSk7XG4gIG1vdGggPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4N2MsXG4gICAgc2NhbGluZzogMjgsXG4gICAgZGlmZmljdWx0eTogMyxcbiAgICBkaXNwbGF5TmFtZTogJ0J1dHRlcmZseScsXG4gIH0pO1xuICBzYWJlcmExID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDdkLFxuICAgIHNjYWxpbmc6IDI5LFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ0dlbmVyYWwgU2FiZXJhJyxcbiAgfSk7XG4gIHZlcnRpY2FsUGxhdGZvcm0gPSBuZXcgT2JqZWN0RGF0YSh0aGlzLCAweDdlKTsgLy8gc2NhbGluZzogMjggP1xuICBob3Jpem90YWxQbGF0Zm9ybSA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4N2YpOyAvLyBzY2FsaW5nOiAyOCA/XG4gIGFyY2hlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4MCxcbiAgICBzY2FsaW5nOiAzMyxcbiAgICBjbGFzczogJ3NvbGRpZXInLFxuICAgIGRpc3BsYXlOYW1lOiAnRHJheWdvbmlhIEFyY2hlcicsXG4gIH0pO1xuICBib21iZXJCaXJkID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDgxLFxuICAgIHNjYWxpbmc6IDMzLFxuICAgIGNsYXNzOiAnYmlyZCcsXG4gICAgZGlzcGxheU5hbWU6ICdCb21iZXIgQmlyZCcsXG4gIH0pO1xuICBsYXZhQmxvYiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4MixcbiAgICBzY2FsaW5nOiAzNyxcbiAgICBjbGFzczogJ3B1ZGRsZScsXG4gICAgZGlzcGxheU5hbWU6ICdMYXZhIEJsb2InLFxuICB9KTtcbiAgZmxhaWxHdXkgPSBuZXcgTW9uc3Rlcih0aGlzLCB7IC8vIGxpemFyZCBtYW5cbiAgICBpZDogMHg4NCxcbiAgICBzY2FsaW5nOiAzNyxcbiAgICBkaXNwbGF5TmFtZTogJ0ZsYWlsIEd1eScsXG4gIH0pO1xuICBibHVlRXllID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDg1LFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIGNsYXNzOiAnZXllJyxcbiAgICBkaXNwbGF5TmFtZTogJ0JlaG9sZGVyJyxcbiAgfSk7XG4gIHNhbGFtYW5kZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ODYsXG4gICAgc2NhbGluZzogMzcsXG4gICAgZGlzcGxheU5hbWU6ICdTYWxhbWFuZGVyJyxcbiAgfSk7XG4gIHNvcmNlcm9yID0gbmV3IE1vbnN0ZXIodGhpcywgeyAvLyBidXJ0XG4gICAgaWQ6IDB4ODcsXG4gICAgc2NhbGluZzogMzcsXG4gICAgZGlzcGxheU5hbWU6ICdCdXJ0JyxcbiAgfSk7XG4gIG1hZG8xID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDg4LFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIGRpc3BsYXlOYW1lOiAnR2VuZXJhbCBNYWRvJyxcbiAgfSk7XG4gIGtuaWdodCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4OSxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICBkaWZmaWN1bHR5OiAxLFxuICAgIGRpc3BsYXlOYW1lOiAnTmluamEnLFxuICB9KTtcbiAgZGV2aWwgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OGEsXG4gICAgc2NhbGluZzogNDEsXG4gICAgZGlzcGxheU5hbWU6ICdEZXZpbCBCYXQnLFxuICB9KTtcbiAga2VsYmVzcXVlMiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg4YixcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdHZW5lcmFsIEtlbGJlc3F1ZScsXG4gIH0pO1xuICB3cmFpdGhTaGFkb3cyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDhjLFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIGNsYXNzOiAnd3JhaXRoJyxcbiAgICBkaXNwbGF5TmFtZTogJ1NoYWRvdycsXG4gIH0pO1xuICBnbGl0Y2gxID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg4ZCk7IC8vIHNjYWxpbmc6IDQxID9cbiAgZ2xpdGNoMiA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4OGUpOyAvLyBzY2FsaW5nOiA0MSA/XG4gIGd1YXJkaWFuU3RhdHVlID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg4Zik7IC8vIHNjYWxpbmc6IDQxID9cbiAgc2FiZXJhMiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5MCxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdHZW5lcmFsIFNhYmVyYScsXG4gIH0pO1xuICB0YXJhbnR1bGEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTEsXG4gICAgc2NhbGluZzogNDEsXG4gICAgZGlzcGxheU5hbWU6ICdUYXJhbnR1bGEnLFxuICB9KTtcbiAgc2tlbGV0b24gPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTIsXG4gICAgc2NhbGluZzogNDEsXG4gICAgZGlzcGxheU5hbWU6ICdTa2VsZXRvbicsXG4gIH0pO1xuICBtYWRvMiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5MyxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdHZW5lcmFsIE1hZG8nLFxuICB9KTtcbiAgcHVycGxlRXllID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk0LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIGNsYXNzOiAnZXllJyxcbiAgICBkaXNwbGF5TmFtZTogJ0JlaG9sZGVyJyxcbiAgfSk7XG4gIGZsYWlsS25pZ2h0ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk1LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIGRpc3BsYXlOYW1lOiAnRmxhaWwgS25pZ2h0JyxcbiAgfSk7XG4gIHNjb3JwaW9uID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk2LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIGRpc3BsYXlOYW1lOiAnU2NvcnBpb24nLFxuICB9KTtcbiAga2FybWluZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5NyxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdHZW5lcmFsIEthcm1pbmUnLFxuICB9KTtcbiAgc2FuZEJsb2IgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OTgsXG4gICAgc2NhbGluZzogNDQsXG4gICAgY2xhc3M6ICdwdWRkbGUnLFxuICAgIGRpc3BsYXlOYW1lOiAnU2FuZCBCbG9iJyxcbiAgfSk7XG4gIG11bW15ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweDk5LFxuICAgIHNjYWxpbmc6IDQ0LFxuICAgIGRpc3BsYXlOYW1lOiAnTXVtbXknLFxuICB9KTtcbiAgd2FybG9jayA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHg5YSxcbiAgICBzY2FsaW5nOiA0NixcbiAgICBkaXNwbGF5TmFtZTogJ1dhcmxvY2snLFxuICB9KTtcbiAgZHJheWdvbjEgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OWIsXG4gICAgc2NhbGluZzogNDUsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnRW1wb3JlciBEcmF5Z29uJyxcbiAgfSk7XG4gIHN0YXR1ZU9mU3VuID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg5Yyk7IC8vIHNjYWxpbmc6IDQ3ID9cbiAgc3RhdHVlT2ZNb29uID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg5ZCk7IC8vIHNjYWxpbmc6IDQ3ID9cbiAgZHJheWdvbjIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4OWUsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnRHJheWdvbicsXG4gIH0pO1xuICBjcnVtYmxpbmdWZXJ0aWNhbFBsYXRmb3JtID0gbmV3IE9iamVjdERhdGEodGhpcywgMHg5Zik7IC8vIHNjYWxpbmc6IDQ3ID9cbiAgYnJvd25Sb2JvdCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhhMCxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICBkaWZmaWN1bHR5OiAxLFxuICAgIGRpc3BsYXlOYW1lOiAnUm9ib3QgU2VudHJ5JyxcbiAgfSk7XG4gIHdoaXRlUm9ib3QgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YTEsXG4gICAgc2NhbGluZzogNDcsXG4gICAgZGlzcGxheU5hbWU6ICdSb2JvdCBFbmZvcmNlcicsXG4gIH0pO1xuICB0b3dlclNlbnRpbmVsID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGEyLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIGRpc3BsYXlOYW1lOiAnVG93ZXIgU2VudGluZWwnLFxuICB9KTtcbiAgaGVsaWNvcHRlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhhMyxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICBkaXNwbGF5TmFtZTogJ1JvYm9jb3B0ZXInLFxuICB9KTtcbiAgZHluYSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhhNCxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAnYm9zcycsXG4gICAgZGlzcGxheU5hbWU6ICdEWU5BJyxcbiAgfSk7XG4gIHZhbXBpcmUyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGE1LFxuICAgIHNjYWxpbmc6IDI4LFxuICAgIHR5cGU6ICdib3NzJyxcbiAgICBkaXNwbGF5TmFtZTogJ1ZhbXBpcmUnLFxuICB9KTtcbiAgZ2xpdGNoMyA9IG5ldyBPYmplY3REYXRhKHRoaXMsIDB4YTYpOyAvLyBzY2FsaW5nOiA0MSA/XG4gIGR5bmFQb2QgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YjQsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ2Jvc3MnLFxuICAgIGRpc3BsYXlOYW1lOiAnRFlOQSBEZWZlbnNlIFBvZCcsXG4gIH0pO1xuICBkeW5hQ291bnRlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhiOCxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBkeW5hTGFzZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YjksXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZHluYUJ1YmJsZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhiYSxcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICB2YW1waXJlMkJhdCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhiYyxcbiAgICBzY2FsaW5nOiAyOCxcbiAgICAvLyB0eXBlOiAncHJvamVjdGlsZScsIC8vIG9mIHNvcnRzLi4uP1xuICB9KTtcbiAgYnJvd25Sb2JvdExhc2VyU291cmNlID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGJlLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGRyYXlnb24yRmlyZWJhbGwgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YmYsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgdmFtcGlyZTFCYXQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzEsXG4gICAgc2NhbGluZzogNSxcbiAgICAvL3R5cGU6ICdwcm9qZWN0aWxlJywgLy8gb2Ygc29ydHNcbiAgfSk7XG4gIGdpYW50SW5zZWN0RmlyZWJhbGwgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzMsXG4gICAgc2NhbGluZzogMTEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZ3JlZW5Nb3NxdWl0byA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjNCxcbiAgICBzY2FsaW5nOiAxMSxcbiAgICAvL3R5cGU6ICdwcm9qZWN0aWxlJywgLy8gb2Ygc29ydHNcbiAgICBkaXNwbGF5TmFtZTogJ01vc3F1aXRvJyxcbiAgfSk7XG4gIGtlbGJlc3F1ZTFSb2NrID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGM1LFxuICAgIHNjYWxpbmc6IDE1LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHNhYmVyYTFCYWxscyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjNixcbiAgICBzY2FsaW5nOiAyOSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBrZWxiZXNxdWUyRmlyZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjNyxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBzYWJlcmEyRmlyZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhjOCxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBzYWJlcmEyQmFsbHMgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4YzksXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAga2FybWluZUJhbGxzID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGNhLFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHN0YXR1ZUJhbGxzID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGNiLFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGRyYXlnb24xTGlnaHRuaW5nID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGNjLFxuICAgIHNjYWxpbmc6IDQ1LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGRyYXlnb24yTGFzZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4Y2QsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZHJheWdvbjJCcmVhdGggPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4Y2UsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgYmlyZEJvbWIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTAsXG4gICAgc2NhbGluZzogMzMsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZ3JlZW5Nb3NxdWl0b1Nob3QgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTIsXG4gICAgc2NhbGluZzogMTEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgcGFyYWx5c2lzQmVhbSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlMyxcbiAgICBzY2FsaW5nOiAyNSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBzdG9uZUdhemUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZTQsXG4gICAgc2NhbGluZzogMTksXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgcm9ja0dvbGVtUm9jayA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlNSxcbiAgICBzY2FsaW5nOiA0LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGN1cnNlQmVhbSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlNixcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBtcERyYWluV2ViID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGU3LFxuICAgIHNjYWxpbmc6IDQxLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGZpc2htYW5UcmlkZW50ID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGU4LFxuICAgIHNjYWxpbmc6IDI1LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIG9yY0F4ZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlOSxcbiAgICBzY2FsaW5nOiA2LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHN3YW1wUG9sbGVuID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGVhLFxuICAgIHNjYWxpbmc6IDEwLFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHBhcmFseXNpc1Bvd2RlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlYixcbiAgICBzY2FsaW5nOiAyMyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBzb2xkaWVyU3dvcmQgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZWMsXG4gICAgc2NhbGluZzogMTQsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgaWNlR29sZW1Sb2NrID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGVkLFxuICAgIHNjYWxpbmc6IDE0LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHRyb2xsQXhlID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGVlLFxuICAgIHNjYWxpbmc6IDE4LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIGtyYWtlbkluayA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhlZixcbiAgICBzY2FsaW5nOiAyNSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBhcmNoZXJBcnJvdyA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmMCxcbiAgICBzY2FsaW5nOiAzMyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBrbmlnaHRTd29yZCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmMixcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBtb3RoUmVzaWR1ZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmMyxcbiAgICBzY2FsaW5nOiAyOCxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBicm93blJvYm90TGFzZXIgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjQsXG4gICAgc2NhbGluZzogNDcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgd2hpdGVSb2JvdExhc2VyID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGY1LFxuICAgIHNjYWxpbmc6IDQ3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIHRvd2VyU2VudGluZWxMYXNlciA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmNixcbiAgICBzY2FsaW5nOiA0NyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBza2VsZXRvblNob3QgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjcsXG4gICAgc2NhbGluZzogNDEsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgYmxvYlNob3QgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZjgsXG4gICAgc2NhbGluZzogMzcsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZmxhaWxLbmlnaHRGbGFpbCA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmOSxcbiAgICBzY2FsaW5nOiA0MSxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBmbGFpbEd1eUZsYWlsID0gbmV3IE1vbnN0ZXIodGhpcywge1xuICAgIGlkOiAweGZhLFxuICAgIHNjYWxpbmc6IDM3LFxuICAgIHR5cGU6ICdwcm9qZWN0aWxlJyxcbiAgfSk7XG4gIG1hZG9TaHVyaWtlbiA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmYyxcbiAgICBzY2FsaW5nOiAzNyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuICBndWFyZGlhblN0YXR1ZU1pc3NpbGUgPSBuZXcgTW9uc3Rlcih0aGlzLCB7XG4gICAgaWQ6IDB4ZmQsXG4gICAgc2NhbGluZzogMzYsXG4gICAgdHlwZTogJ3Byb2plY3RpbGUnLFxuICB9KTtcbiAgZGVtb25XYWxsRmlyZSA9IG5ldyBNb25zdGVyKHRoaXMsIHtcbiAgICBpZDogMHhmZSxcbiAgICBzY2FsaW5nOiAzNyxcbiAgICB0eXBlOiAncHJvamVjdGlsZScsXG4gIH0pO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tKSB7XG4gICAgc3VwZXIoMHgxMDApO1xuXG4gICAgZm9yIChjb25zdCBrZXkgaW4gdGhpcykge1xuICAgICAgY29uc3Qgb2JqID0gdGhpc1trZXkgYXMga2V5b2YgdGhpc107XG4gICAgICBpZiAoIShvYmogaW5zdGFuY2VvZiBPYmplY3REYXRhKSkgY29udGludWU7XG4gICAgICBvYmoubmFtZSA9IGxvd2VyQ2FtZWxUb1NwYWNlcyhrZXkpO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghdGhpc1tpXSkge1xuICAgICAgICB0aGlzW2ldID0gbmV3IE9iamVjdERhdGEodGhpcywgaSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgd3JpdGUoKTogTW9kdWxlW10ge1xuICAgIGNvbnN0IG1vZHVsZXM6IE1vZHVsZVtdID0gW107XG4gICAgZm9yIChjb25zdCBvYmogb2YgdGhpcykge1xuICAgICAgbW9kdWxlcy5wdXNoKC4uLm9iai53cml0ZSgpKTtcbiAgICB9XG4gICAgLy8gSWYgd2UncmUgc3RvcmluZyB0aGUgbW9uc3RlciBuYW1lcyB0aGVuIHdlIG5lZWQgdG8gaW5pdGlhbGl6ZSB0aGUgYnVmZmVyXG4gICAgLy8gbGVuZ3RoLlxuICAgIGlmICh0aGlzLnJvbS53cml0ZU1vbnN0ZXJOYW1lcykge1xuICAgICAgY29uc3QgYSA9IHRoaXMucm9tLmFzc2VtYmxlcigpO1xuICAgICAgY29uc3QgbG9uZ2VzdE5hbWUgPSBNYXRoLm1heCguLi4odGhpcy5tYXAobyA9PiBvLmRpc3BsYXlOYW1lLmxlbmd0aCkpKTtcbiAgICAgIGNvbnN0IE1BWF9MRU5HVEggPSAyNztcblxuICAgICAgaWYgKGxvbmdlc3ROYW1lID4gTUFYX0xFTkdUSCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYExvbmdlc3QgZGlzcGxheU5hbWUgbGVuZ3RoIGlzIGdyZWF0ZXIgdGhhbiAke01BWF9MRU5HVEhcbiAgICAgICAgICAgIH0uICgke2xvbmdlc3ROYW1lfSA+ICR7TUFYX0xFTkdUSFxuICAgICAgICAgICAgfSlcXG5DcnlzdGFsaXMgSFVEIGNhbid0IGNvbWZvcnRhYmx5IGZpdCB0aGF0IG1hbnkgY2hhcmFjdGVycy5gKTtcbiAgICAgIH1cbiAgICAgIGEuYXNzaWduKCdFTkVNWV9OQU1FX0xFTkdUSCcsIGxvbmdlc3ROYW1lKTtcbiAgICAgIGEuZXhwb3J0KCdFTkVNWV9OQU1FX0xFTkdUSCcpO1xuICAgICAgbW9kdWxlcy5wdXNoKGEubW9kdWxlKCkpO1xuICAgIH1cbiAgICByZXR1cm4gbW9kdWxlcztcbiAgfVxufVxuXG4vLyBleHBvcnQgdHlwZSBNb25zdGVyVHlwZSA9ICdtb25zdGVyJyB8ICdib3NzJyB8ICdwcm9qZWN0aWxlJztcbi8vIGV4cG9ydCB0eXBlIFRlcnJhaW4gPSAnd2FsaycgfCAnc3dpbScgfCAnc29hcicgfCAnZmx1dHRlcicgfCAnc3RhbmQnO1xuXG5leHBvcnQgdHlwZSBDb25zdHJhaW50ID0gTWFwPHN0cmluZywgcmVhZG9ubHkgW3JlYWRvbmx5IG51bWJlcltdLCBib29sZWFuIHwgbnVsbF0+O1xuLy8ga2V5IGlzIHR1cGxlWzBdLmpvaW4oJywnKVxuLy8gdmFsdWVbMF0gaXMgW1txdWFkIGZvciByZXF1aXJlZCBwYXQwLCBwYXQxLCBwYWwyLCBwYWwzXVxuLy8gdmFsdWVbMV0gaXMgdHJ1ZSBpZiBuZWVkIHBhdDEsIGZhbHNlIGlmIG5lZWQgcGF0MCwgbnVsbCBpZiBuZWl0aGVyXG4vLyAgIC0tLT4gYnV0IHdlIG5lZWQgdG8ga2VlcCB0cmFjayBvZiBhIGhhbmZ1bCBvZiBzcGF3bnMsIG5vdCBqdXN0IHRvbmUuXG5cblxuICAvLyBtb25zdGVyKDB4NTAsICdCbHVlIFNsaW1lJywgMHgyMCwgNiwge1xuICAvLyAgIGhpdHM6IDEsIHNhdGs6IDE2LCBkZ2xkOiAyLCBzZXhwOiAzMixcbiAgLy8gICBtdXN0OiBhbmQocGF0KDB4NjQpLCBwYWwoMiwgMHgyMSkpLFxuICAvLyB9KTtcbiAgLy8gbW9uc3RlcigweDUxLCAnV2VyZXRpZ2VyJywgMHgyNCwgNywge1xuICAvLyAgIGhpdHM6IDEuNSwgc2F0azogMjEsIGRnbGQ6IDQsIHNleHA6IDQwLFxuICAvLyAgIG11c3Q6IGFuZChwYXQoMHg2MCksIHBhbCgzLCAweDIwKSksXG4gIC8vIH0pO1xuICAvLyBtb25zdGVyKDB4NTIsICdHcmVlbiBKZWxseScsIDB4MjAsIDEwLCB7XG4gIC8vICAgc2RlZjogNCwgaGl0czogMywgc2F0azogMTYsIGRnbGQ6IDQsIHNleHA6IDM2LFxuICAvLyAgIG11c3Q6IGFuZChwYXQoMHg2NSksIHBhbCgyLCAweDIyKSksXG4gIC8vIH0pO1xuICAvLyBtb25zdGVyKDB4NTMsICdSZWQgU2xpbWUnLCAweDIwLCAxNiwge1xuICAvLyAgIHNkZWY6IDYsIGhpdHM6IDQsIHNhdGs6IDE2LCBkZ2xkOiA0LCBzZXhwOiA0OCxcbiAgLy8gICBtdXN0OiBhbmQocGF0KDB4NjQpLCBwYWwoMiwgMHgyMykpLFxuICAvLyB9KTtcblxuXG4vLyBleHBvcnQgaW50ZXJmYWNlIE1vbnN0ZXIge1xuLy8gICBpZDogbnVtYmVyO1xuLy8gICBuYW1lOiBzdHJpbmc7XG4vLyAgIGFjdGlvbjogbnVtYmVyO1xuLy8gICBjb3VudDogbnVtYmVyO1xuLy8gICB0eXBlPzogTW9uc3RlclR5cGU7IC8vIGRlZmF1bHQgaXMgbW9uc3RlclxuLy8gICBtb3ZlPzogVGVycmFpbjsgLy8gZGVmYXVsdCBpcyB3YWxrXG4vLyAgIHNkZWY/OiBudW1iZXI7XG4vLyAgIHN3cmQ/OiBudW1iZXI7XG4vLyAgIGhpdHM/OiBudW1iZXI7XG4vLyAgIHNhdGs/OiBudW1iZXI7XG4vLyAgIGRnbGQ/OiBudW1iZXI7XG4vLyAgIHNleHA/OiBudW1iZXI7XG4vLyAgIGVsZW0/OiBudW1iZXI7XG4vLyAgIHNwZD86IG51bWJlcjtcbi8vICAgc3RhdHVzOiBudW1iZXI7XG4vLyAgIHBlcnNpc3Q/OiBib29sZWFuO1xuLy8gICBtdXN0PzogQ29uc3RyYWludDtcbi8vIH1cblxuLy8gaW50ZXJmYWNlIEFkanVzdG1lbnRzIHtcbi8vICAgdmFuaWxsYUxldmVsPzogbnVtYmVyO1xuLy8gICB2YW5pbGxhU3dvcmQ/OiBudW1iZXI7XG4vLyAgIHNkZWY/OiBudW1iZXI7XG4vLyAgIHN3cmQ/OiBudW1iZXI7XG4vLyAgIGhpdHM/OiBudW1iZXI7XG4vLyAgIHNhdGs/OiBudW1iZXI7XG4vLyAgIGRnbGQ/OiBudW1iZXI7XG4vLyAgIHNleHA/OiBudW1iZXI7XG4vLyAgIGVsZW0/OiBudW1iZXI7XG4vLyAgIHNwZD86IG51bWJlcjtcbi8vIH1cblxuLy8gaW50ZXJmYWNlIFBsYXllclN0YXRzIHtcbi8vICAgYXJtb3I6IG51bWJlcjtcbi8vICAgbGV2ZWw6IG51bWJlcjtcbi8vICAgc2hpZWxkOiBudW1iZXI7XG4vLyAgIHN3b3JkOiBudW1iZXI7XG4vLyB9XG5cbi8vIGNvbnN0IFZBTklMTEFfU1dPUkRTID0gWzIsIDIsIDIsIDIsIDQsIDQsIDQsIDgsIDgsIDgsIDgsIDE2LCAxNiwgMTYsIDE2LCAxNl07XG5cbi8vIGNvbnN0IHt9ID0ge1ZBTklMTEFfU1dPUkRTfSBhcyBhbnk7XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZShyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQsIHJhbmRvbTogUmFuZG9tKTogTW9uc3RlcltdIHtcbi8vICAgY29uc3Qge30gPSB7cm9tLCBmbGFncywgcmFuZG9tfSBhcyBhbnk7XG5cbi8vICAgY29uc3Qgb3V0OiBNb25zdGVyW10gPSBbXTtcblxuLy8gICBjb25zdCBwbGF5ZXI6IFBsYXllclN0YXRzID0ge1xuLy8gICAgIGFybW9yOiAyLFxuLy8gICAgIGxldmVsOiAxLFxuLy8gICAgIHNoaWVsZDogMixcbi8vICAgICBzd29yZDogMixcbi8vICAgfTtcblxuLy8gICBmdW5jdGlvbiBiYXNlKGlkOiBudW1iZXIsIG5hbWU6IHN0cmluZywgYWRqOiBBZGp1c3RtZW50cyA9IHt9KSB7XG4vLyAgICAgY29uc3QgbyA9IHJvbS5vYmplY3RzW2lkXTtcbi8vICAgICBsZXQge2FjdGlvbiwgaW1tb2JpbGUsIGxldmVsLCBhdGssIGRlZiwgaHAsXG4vLyAgICAgICAgICBlbGVtZW50cywgZ29sZERyb3AsIGV4cFJld2FyZCwgc3RhdHVzRWZmZWN0fSA9IG87XG5cbi8vICAgICAvLyAvLyBXaGF0IGxldmVsIHNob3VsZCB0aGUgcGxheWVyIGJlIGF0IHdoZW4gZW5jb3VudGVyaW5nIHRoaXMgaW4gdmFuaWxsYT9cbi8vICAgICAvLyBpZiAoYWRqLnZhbmlsbGFMZXZlbCkgbGV2ZWwgPSBhZGoudmFuaWxsYUxldmVsO1xuLy8gICAgIGxldmVsID0gcGxheWVyLmxldmVsO1xuXG4vLyAgICAgLy8gV2hhdCBzd29yZCB3b3VsZCB0aGV5IGJlIHVzaW5nPyAgUGljayB0aGUgaGlnaGVzdCBub24taW1tdW5lIHN3b3JkIHRoYXRcbi8vICAgICAvLyB3b3VsZCBiZSBhdmFpbGFibGUgYXQgdGhpcyBwb2ludCBpbiB0aGUgZ2FtZS5cbi8vICAgICBsZXQgc3dvcmQgPSBwbGF5ZXIuc3dvcmQ7XG4vLyAgICAgd2hpbGUgKHN3b3JkID4gMSAmJiAoZWxlbWVudHMgJiAoc3dvcmQgPj4+IDEpKSkge1xuLy8gICAgICAgc3dvcmQgPj4+PSAxO1xuLy8gICAgIH1cbi8vICAgICBpZiAoYWRqLnZhbmlsbGFTd29yZCkgc3dvcmQgPSBhZGoudmFuaWxsYVN3b3JkO1xuLy8gICAgIGNvbnN0IHBhdGsgPSBzd29yZCArIGxldmVsOyAvLyBleHBlY3RlZCBwbGF5ZXIgYXR0YWNrXG5cbi8vICAgICAvLyBIb3cgbWFueSBoaXRzIHdvdWxkIGl0IHRha2UgdG8ga2lsbCBpbiB2YW5pbGxhPyAoY29uc2lkZXIgbm8gZmxvb3I/KVxuLy8gICAgIGNvbnN0IHZhbmlsbGFIaXRzID0gTWF0aC5mbG9vcigoaHAgKyAxKSAvIChwYXRrIC0gZGVmKSk7XG4vLyAgICAgY29uc3QgaGl0cyA9IGFkai5oaXRzIHx8IHZhbmlsbGFIaXRzO1xuXG4vLyAgICAgLy8gU2NhbGVkIGRlZmVuc2UgKHdpbGwgYmUgc3RvcmVkIGluIGVpZ2h0aHMpXG4vLyAgICAgY29uc3Qgc2RlZiA9IGFkai5zZGVmICE9IG51bGwgPyBhZGouc2RlZiA6IGRlZiAvIHBhdGs7IC8vIG5vcm1hbGx5ICo4XG5cbi8vICAgICAvLyBFeHBlY3RlZCBwbGF5ZXIgSFAgYW5kIGRlZmVuc2UgYXQgdmFuaWxsYSBsZXZlbFxuLy8gICAgIGNvbnN0IHBocCA9IE1hdGgubWluKDI1NSwgMzIgKyAxNiAqIGxldmVsKTtcbi8vICAgICBjb25zdCBwZGVmID0gby5hdHRhY2tUeXBlID8gcGxheWVyLnNoaWVsZCA6IHBsYXllci5hcm1vcjtcbi8vICAgICBjb25zdCB2YW5pbGxhRGFtYWdlID0gTWF0aC5tYXgoMCwgYXRrIC0gbGV2ZWwgLSBwZGVmKSAvIHBocDtcbi8vICAgICBjb25zdCBzYXRrID0gYWRqLnNhdGsgIT0gbnVsbCA/IGFkai5zYXRrIDogdmFuaWxsYURhbWFnZTsgLy8gbm9ybWFsbHkgKjEyOFxuXG4vLyAgICAgLy8gVE9ETyAtIHRoZW4gY29tcHV0ZSBnb2xkL2V4cFxuXG4vLyAgICAgY29uc3Qge30gPSB7c2RlZiwgc2F0aywgaGl0cywgaW1tb2JpbGUsIGdvbGREcm9wLCBleHBSZXdhcmQsIHN0YXR1c0VmZmVjdH0gYXMgYW55O1xuXG4vLyAgICAgY29uc3QgbTogTW9uc3RlciA9IHtpZCwgbmFtZX0gYXMgYW55O1xuXG4vLyAgICAgbS5pZCA9IGlkO1xuLy8gICAgIG0ubmFtZSA9IG5hbWU7XG4vLyAgICAgbS50eXBlID0gJ21vbnN0ZXInO1xuLy8gICAgIG0uYWN0aW9uID0gYWN0aW9uO1xuLy8gICAgIG0uY291bnQgPSAwOyAvLyBjb3VudDtcbi8vICAgICBvdXQucHVzaChtKTtcbi8vICAgfVxuXG4vLyAgIC8vIFRPRE8gLSBhZGRpdGlvbmFsIGNvbnN0cmFpbnRzIGFib3V0IGUuZy4gcGxhY2VtZW50LCBldGM/XG4vLyAgIC8vICAgICAgLSBubyBYIG9uIFkgbGV2ZWwuLi4/XG5cbi8vICAgcmV0dXJuIG91dDtcbi8vIH1cblxuLy8gZnVuY3Rpb24gYW5kKHg6IENvbnN0cmFpbnQsIHk6IENvbnN0cmFpbnQpOiBDb25zdHJhaW50IHtcbi8vICAgcmV0dXJuIFtdO1xuLy8gfVxuLy8gZnVuY3Rpb24gcGF0KGlkOiBudW1iZXIpOiBDb25zdHJhaW50IHtcbi8vICAgcmV0dXJuIFtdO1xuLy8gfVxuLy8gZnVuY3Rpb24gcGFsKHdoaWNoOiBudW1iZXIsIGlkOiBudW1iZXIpOiBDb25zdHJhaW50IHtcbi8vICAgcmV0dXJuIFtdO1xuLy8gfVxuXG4vLyBjb25zdCB7fSA9IHthbmQsIHBhdCwgcGFsfSBhcyBhbnk7XG4iXX0=