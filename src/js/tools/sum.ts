import { crc32 } from '../crc32';
import * as fs from 'node:fs';

const data = new Uint8Array(fs.readFileSync(process.argv[2]).buffer);
console.log(crc32(data).toString(16).padStart(8, '0'));
