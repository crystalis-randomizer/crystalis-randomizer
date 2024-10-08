import type { Config } from './config';
import type { Random } from './random';
import type { Rom } from './rom';

export interface Shuffle {
  config: Config;
  random: Random;
  rom: Rom;
}
