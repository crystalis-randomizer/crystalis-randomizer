import {child} from './utils.js';

export class Menu {
  constructor(name) {
    const parent = document.getElementById('menu');
    this.element = child(parent, 'div');
    child(this.element, 'div').textContent = name;
  }

  addItem(name, handler) {
    // TODO - allow separators?
    const item = child(this.element, 'div');
    item.textContent = name;
    item.addEventListener('click', handler);
    return this;
  }
}
