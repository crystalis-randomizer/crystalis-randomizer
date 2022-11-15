import {child} from './utils';

// A component of the grid.  Handles drag-and-drop rearrangement, closing, etc.
export class Component {
  constructor() {
    this.outer = document.createElement('div');
    this.outer.classList.add('component');
    const grid = document.getElementById('grid');
    if (grid.children.length > 1) {
      grid.insertBefore(this.outer, grid.children[1]);
    } else {
      grid.appendChild(this.outer);
    }
    this.corner = child(this.outer, 'div', 'corner');
    this.addCornerButton('x', () => this.remove());
    this.element = child(this.outer, 'div', 'content');
    this.closeResolver = () => {};
    this.closePromise = new Promise(resolve => this.closeResolver = resolve);
    Component.map.set(this.outer, this);
  }

  addCornerButton(text, handler) {
    const button = child(this.corner, 'div');
    button.textContent = text;
    button.addEventListener('click', handler);
  }

  closed() {
    return this.closePromise;
  }

  remove() {
    this.closeResolver();
    this.outer.remove();
  }

  // Returns a string representation of this component's state, to be merged
  // into the URL fragment.
  getState() { return ''; }
  // Sets the state of this component from a URL fragment.  May assume presence
  // of localstorage, etc.
  setState(state) {}

  // Abstract update method called on each frame.
  frame() {}

  // Update method for stepping execution - defaults to same as frame.
  // This runs every time the CPU breaks.
  step() { this.frame(); }
}

// Map from elements to components.
Component.map = new WeakMap();
