import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {FlagSet} from '../flagset.js';
import {World} from './world.js';

export interface ProgressTracker {
  addTasks(tasks: number): void;
  addCompleted(tasks: number): void;
}

export class AssumedFill {
  constructor(readonly rom: Rom, readonly flags: FlagSet) {}

  shuffle(world: World, random: Random, progress?: ProgressTracker): any {}
}
