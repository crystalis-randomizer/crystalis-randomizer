import {Rom} from '../rom.js';

const hex = (x) => x.toString(16).padStart(2, '0');

const run = async () => {
  const rom = await Rom.load();
  window.rom = rom;
  const text = document.createElement('div');

  text.style.whiteSpace = 'pre';
  text.style.fontFamily = 'monospace';
  document.body.appendChild(text);

  // Determine which messages are actually used.
  //  - there's various other ways messages get used that we need to consider.
  //    we could hard-code a list of messages/ranges?  Maybe a blacklist of
  //    known-unused messages makes more sense.
  const used = new Set();
  const mstr = (message) => `${hex(message.part)}:${hex(message.index)}`;
  for (const trigger of rom.triggers) {
    used.add(mstr(trigger.message));
  }
  for (const npc of rom.npcs) {
    for (const d of npc.globalDialogs) {
      used.add(mstr(d.message));
    }
    for (const l of npc.localDialogs.values()) {
      for (const d of l) {
        used.add(mstr(d.message));
      }
    }
  }

  // Iterate over all messages and print them.
  const messages = [];  
  for (let part = 0; part < rom.messages.parts.length; part++) {
    for (let id = 0; id < rom.messages.parts[part].length; id++) {
      const head = `${hex(part)}:${hex(id)}`;
      const message = rom.messages.parts[part][id];
      let body = message.text.replace(/\n/g, '\n      ').replace(/_/g, '…');
      let index = body.indexOf('\n');
      let addr = `${' '.repeat(40)}$${message.addr.toString(16)}`;
      if (!used.has(head)) addr += ' (unused?)';
      if (index < 0) {
        index = body.length;
      } else {
        addr = addr + '\n';
      }
      body = body.replace(/\n|$/, addr.substring(index));
      messages.push(`${head} ${body}`);//      $${message.addr.toString(16)}`);
    }
  }
  text.textContent = messages.join('\n');
};

run();
