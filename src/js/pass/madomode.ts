import {Rom} from '../rom.js';

export function madoMode(rom: Rom) {
  for (const boss of rom.bosses) {
    const o = rom.objects[boss.object];
    if (!o) continue;
    if (o.speed > 0xb) o.speed = 0xb;
    if (o.speed < 0xa) o.speed = 0xa;
  }
}
