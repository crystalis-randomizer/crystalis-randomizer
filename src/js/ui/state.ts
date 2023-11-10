// suppose config is immutable?
// when a config prop changes, what forces a rerender?




export class State {
  title: string;

  // problem - every rerender will register a new handler...?
  // how to handle lifecycle?
  handlers = new Map<string, Array<() => void>>();

  on(event: string, f 

  constructor() {

  }

}
