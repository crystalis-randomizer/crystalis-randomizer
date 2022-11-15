/**
 * @fileoverview A simple filesystem emulator.
 * Uses IndexedDB to store files across sessions, and provides
 * a front-end to manage and select the files.
 */

import {child} from './utils';
import {Component} from './component';

/** @record */
export class File {
  constructor() {
    /** @type {string} */
    this.name;
    /** @type {!ArrayBuffer} */
    this.data;
  }  
}

// Version 1 schema:
//   Files: {name: string, size: number, modifiedMs: number, accessedMs: number}
//   Blobs: {name: string, data: ArrayBuffer}
const VERSION = 1;
const FILES = 'Files';
const BLOBS = 'Blobs';

class Picker extends Component {
  // Resolves to an object: {name, size?, data?}.
  constructor(fs, resolve, reject, files, text = undefined) {
    super();
    this.fs = fs;
    this.element.classList.add('file-picker');
    this.reject = reject;
    // TODO - could get fancier with filter, sort, folders, etc.
    if (text) child(this.element, 'div', 'title').textContent = text;
    for (const {name, size} of files) {
      const line = child(this.element, 'div', 'file');
      line.textContent = `${size.toString(10).padStart(9)} ${name}`;
      line.dataset.name = name;
      const del = child(line, 'span', 'delete');
      del.textContent = 'x';
      del.dataset.name = name;
    }
    const upload = child(this.element, 'input');
    upload.type = 'file';
    upload.style.display = 'none';
    upload.addEventListener('change', () => {
      const file = upload.files[0];
      const reader = new FileReader();
      reader.addEventListener('loadend', () => {
        resolve({name: file.name, size: file.size, data: reader.result});
        super.remove();
      });
      reader.readAsArrayBuffer(file);
    });
    // upload file
    this.addCornerButton('^', () => {
      if (upload) upload.click();
    });
    // return a new empty file
    this.addCornerButton('+', () => {
      const name = window.prompt('filename');
      resolve({name, data: new Uint8Array(0), new: true});
      super.remove();
    });
    this.element.addEventListener('click', (e) => {
      if (!e.target.dataset.name) return;
      if (e.target.classList.contains('delete')) {
        e.target.parentElement.remove();
        this.fs.delete(e.target.dataset.name);
      } else {
        resolve({name: e.target.dataset.name});
        super.remove();
      }
    });
  }

  remove() {
    super.remove();
    this.reject(new Error('closed'));
  }
}

export class FileSystem {
  constructor() {
    this.db = new Database(VERSION, (db) => this.upgrade(db));
    this.elt = null;
  }

  upgrade(db) {
    db.createObjectStore(FILES, {keyPath: 'name'});
    db.createObjectStore(BLOBS, {keyPath: 'name'});
  }

  manage() {
    // TODO - handle this later, for now just use the console
  }

  /**
   * @return {!Promise<!Map<string, number>>}
   */
  list() {
    return this.db.transaction(
        [FILES], 'readonly', (files) => request(files.getAll()));
  }

  /**
   * @param {string} intent
   * @return {!Promise<!File|undefined>}
   */
  async pick(text = undefined) {
    const files = await this.list();
    return new Promise((ok, fail) => {
      new Picker(this, ok, fail, files, text);
    }).then((file) => {
      if (file.data) {
        // uploaded - store it
        if (!file.new) this.save(file.name, file.data);
        return file;
      } else {
        // picked, fetch it
        return this.open(file.name);
      }
    });
  }
      

  /**
   * @param {string} name
   * @return {!Promise<!File|undefined>}
   */
  open(name) {
    // update accessedMs, but fire-and-forget.
    this.db.transaction([FILES], 'readwrite', async (files) => {
      const f = await request(files.get(name));
      if (!f) return;
      f.accessedMs = new Date().getTime();
      return request(files.put(f));
    });
        
    return this.db.transaction(
        [BLOBS], 'readonly', (blobs) => request(blobs.get(name)));
  }

  /**
   * @param {string} name
   * @param {!TypedArray|!ArrayBuffer} data
   * @return {!Promise<void>}
   */
  save(name, data) {
    if (!(data instanceof ArrayBuffer)) {
      if (!data.buffer instanceof ArrayBuffer) {
        throw new Error(`Not an ArrayBuffer: ${data}`);
      }
      data = data.slice().buffer;
    }
    const size = data.byteLength;
    return this.db.transaction(
        [FILES, BLOBS],
        'readwrite',
        async (files, blobs, defaults) => {
          // First look for an existing file.
          request(files.put({name, size, modifiedMs: new Date().getTime()}));
          request(blobs.put({name, data}));
        });
  }

  /**
   * @param {string} name
   */
  delete(name) {
    return this.db.transaction(
        [FILES, BLOBS], 'readwrite', (files, blobs) => {
          request(files.delete(name));
          request(blobs.delete(name));
        });
  }
}



/** Internal abstraction for the database. */
class Database {
  constructor(/** number */ version, /** function(!IDBDatabase) */ upgrade) {
    /** @const */
    this.version = version;
    /** @const */
    this.upgrade = upgrade;
    /** @type {?Promise<!IDBDatabase>} */
    this.db = null;
    this.getDb = this.getDb;
  }

  async getDb() {
    const req = window.indexedDB.open('fs', this.version);
    req.onupgradeneeded = (event) => this.upgrade(event.target.result);
    const db = await request(req);
    this.getDb = () => Promise.resolve(db);
    return db;
  }

  /**
   * @param {!Array<string>} stores
   * @param {string} mode
   * @param {function(!Array<!IDBObjectStore>): !Promise<T>} func
   * @return {!Promise<T>}
   * @template T
   */
  async transaction(stores, mode, func) {
    const db = await this.getDb();
    const tx = db.transaction(stores, mode);
    return new Promise((ok, fail) => {
      tx.onerror = fail;
      tx.oncomplete = () => { ok(result); };
      const result = func(...stores.map(s => tx.objectStore(s)));
    });
  }
}

/**
 * @param {!IDBRequest} req
 * @return {!Promise<*>}
 */
function request(req) {
  return new Promise((ok, fail) => {
    req.onerror = fail;
    req.onsuccess = (e) => ok(e.target.result);
  });
}
