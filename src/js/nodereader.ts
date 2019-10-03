import * as fs from 'fs';

export class NodeReader {
  read(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(`${__dirname}/${file}`, 'utf-8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(String(data));
        }        
      });
    });
  }
}
