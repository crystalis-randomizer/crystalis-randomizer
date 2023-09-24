// Configuration

export interface StructSchema {
  [prop: string]: Schema;

}
export interface SchemaBase {
  
}

const checkName = enumSchema({
  'leaf elder': 0,
  'oak elder': 1,
  'waterfall cave sword of water chest': 2,
  'stxy left upper sword of thunder chest': 3,
  'mesia in tower': 4,
  'sealed cave ball of wind chest': 5,
  // COPY FROM rom/flags.ts
});

const itemName = enumSchema({
  // Swords
  'sword of wind': 0,
  'sword of fire': 1,
  'sword of water': 2,
  'sword of thunder': 3,
  'crystalis': 4,
  'ball of wind': 5,
  'tornado bracelet': 6,
  'ball of fire': 7,
  'flame bracelet': 8,
  // ...
  'carapace shield': 0x0d,
  // ...
  'medical herb': 0x1d,
  // ...
  'statue of onyx': 0x25,
  // ...
  'refresh': 0x41,
  // ...
  'flight': 0x48,
});

const configSchema = struct({
  items: struct({
    force: list(struct({
      check: checkName,
      item: itemName,
    })),
  }),
});


type Pass = 'early' | 'late';

export interface Config {
  alwaysMimics(): boolean;

  preserveUniqueChecks(): boolean;
  shuffleMimics(): boolean;

  buffDeosPendant(): boolean;
  changeGasMaskToHazmatSuit(): boolean;
  slowDownTornado(): boolean;
  leatherBootsGiveSpeed(): boolean;
  rabbitBootsChargeWhileWalking(): boolean;

  shuffleSpritePalettes(): boolean;
  shuffleMonsters(): boolean;
  shuffleShops(): boolean;
  bargainHunting(): boolean;

  shuffleTowerMonsters(): boolean;
  shuffleMonsterElements(): boolean;
  shuffleBossElements(): boolean;

  buffMedicalHerb(): boolean;
  decreaseEnemyDamage(): boolean;
  trainer(): boolean;
  neverDie(): boolean;
  noShuffle(): boolean;
  chargeShotsOnly(): boolean;

  barrierRequiresCalmSea(): boolean;
  // paralysisRequiresPrisonKey(): boolean;
  // sealedCaveRequiresWindmill(): boolean;

  connectLimeTreeToLeaf(): boolean;
  // connectGoaToLeaf();
  // removeEarlyWall();
  addEastCave(): boolean;
  zebuStudentGivesItem(): boolean;
  fogLampNotRequired(): boolean;
  storyMode(): boolean;
  noBowMode(): boolean;
  requireHealedDolphinToRide(): boolean;
  saharaRabbitsRequireTelepathy(): boolean;
  teleportOnThunderSword(): boolean;
  randomizeThunderTeleport(): boolean;
  orbsOptional(): boolean;

  shuffleGoaFloors(): boolean;
  shuffleHouses(): boolean;
  shuffleAreas(): boolean;
  mayShuffleAreas(): boolean;
  randomizeMaps(): boolean;
  randomizeTrades(): boolean;
  unidentifiedItems(): boolean;
  randomizeWalls(): boolean;

  guaranteeSword(): boolean;
  guaranteeSwordMagic(): boolean;
  guaranteeMatchingSword(): boolean;
  guaranteeGasMask(): boolean;
  guaranteeBarrier(): boolean;
  guaranteeRefresh(): boolean;
  communityJokes(): boolean;

  disableSwordChargeGlitch(): boolean;
  disableTeleportSkip(): boolean;
  disableRabbitSkip(): boolean;
  disableShopGlitch(): boolean;
  disableStatueGlitch(): boolean;
  disableRageSkip(): boolean;
  disableTriggerGlitch(): boolean;
  disableFlightStatueSkip(): boolean;

  assumeSwordChargeGlitch(): boolean;
  assumeGhettoFlight(): boolean;
  assumeTeleportSkip(): boolean;
  assumeRabbitSkip(): boolean;
  assumeStatueGlitch(): boolean;
  assumeTriggerGlitch(): boolean;
  assumeFlightStatueSkip(): boolean;
  assumeWildWarp(): boolean;
  assumeRageSkip(): boolean;

  nerfWildWarp(): boolean;
  allowWildWarp(): boolean;
  randomizeWildWarp(): boolean;

  blackoutMode(): boolean;
  hardcoreMode(): boolean;
  buffDyna(): boolean;
  maxScalingInTower(): boolean;

  expScalingFactor(): boolean;

  // OPTIONAL FLAGS
  autoEquipBracelet(pass: Pass): boolean;
  controllerShortcuts(pass: Pass): boolean;
  randomizeMusic(pass: Pass): boolean;
  shuffleTilePalettes(pass: Pass): boolean;
  noMusic(pass: Pass): boolean;
  audibleWallCues(pass: Pass): boolean;

  shouldColorSwordElements(): boolean;
  
  shouldUpdateHud(): boolean;

  hasStatTracking(): boolean;

  buryFlightStartSphere(): number;

  validate(): void;
}
