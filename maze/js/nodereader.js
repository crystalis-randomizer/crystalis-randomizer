const fs = require('fs');

class NodeReader {
  read(file) {
    return new Promise((resolve, reject) => {
      fs.readFile(`${__dirname}/${file}`, 'utf-8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }        
      });
    });
  }
}

module.exports = {
  NodeReader,
};
