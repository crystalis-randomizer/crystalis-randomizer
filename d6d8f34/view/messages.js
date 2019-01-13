import {Rom} from './rom.js';

class Messages {
  constructor(rom) {
    this.rom = rom;
  }
}

const run = async () => {
  const rom = await Rom.load();
  window.rom = rom;
  const text = document.createElement('div');
  text.style.whiteSpace = 'pre';
  text.style.fontFamily = 'monospace';
  document.body.appendChild(text);

  const messages = [];  
  for (let part = 0; part < rom.messages.parts.length; part++) {
    for (let id = 0; id < rom.messages.parts[part].length; id++) {
      const head = `${part.toString(16).padStart(2, 0)}:${id.toString(16).padStart(2, 0)} `;
      const message = rom.messages.parts[part][id];
      let body = message.text.replace(/\n/g, '\n      ').replace(/_/g, '…');
      let index = body.indexOf('\n');
      let addr = `${' '.repeat(40)}$${message.addr.toString(16)}`;
      if (index < 0) {
        index = body.length;
      } else {
        addr = addr + '\n';
      }
      body = body.replace(/\n|$/, addr.substring(index));
      messages.push(`${head}${body}`);//      $${message.addr.toString(16)}`);
    }
  }
  text.textContent = messages.join('\n');
};

run();
