
import { buildInfo } from './build_info.macro' with {type: 'macro'};

const info = buildInfo();
if (info) {
  (globalThis as any)['__VERSION__'] = {...info, 'DATE': new Date(info.DATE)};
}
