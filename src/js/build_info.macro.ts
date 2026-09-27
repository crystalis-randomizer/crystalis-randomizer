// inlines the version info that scripts/build_info.sh writes in CI, or
// null for local builds.

import * as fs from 'node:fs';
import * as path from 'node:path';

const FILE = path.resolve(import.meta.dir, '../../target/build/build_info.json');

export interface BuildInfo {
  STATUS: string;
  VERSION: string;
  LABEL: string;
  HASH: string;
  DATE: number;
}

export function buildInfo(): BuildInfo|null {
  if (!fs.existsSync(FILE)) return null;
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}
