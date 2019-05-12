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
  const used = new Map(); // <string, Set<string>>
  const use = (message, use) => {
    const str = mstr(message);
    const uses = used.get(str) || new Set();
    uses.add(use);
    used.set(str, uses);
  };
  const mstr = (message) => `${hex(message.part)}:${hex(message.index)}`;
  for (const trigger of rom.triggers) {
    use(trigger.message, `Trigger $${hex(trigger.id)}`);
  }
  for (const npc of rom.npcs) {
    for (const d of npc.globalDialogs) {
      use(d.message, `NPC $${hex(npc.id)}`);
    }
    for (const [l, ds] of npc.localDialogs) {
      const lh = l >= 0 ? ` @ $${hex(l)}` : '';
      for (const d of ds) {
        use(d.message, `NPC $${hex(npc.id)}${lh}`);
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
      const uses = used.get(head);
      if (part || id) addr += uses ? ` (${[...uses].join(', ')})` : ' (unused?)';
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

// TODO - find more use locations
//      - EscapedGeneralData
//      - ItemUse
//      - other boss kills
//      - search for 7de and 7df in the source...

// sets message:
//  1fae7 - general escapes
//  27fc9 - endgame messages
//  37b28 - hardcoded 1b:05 as part of object action 70 draygon 2 killed
//  3d0b6 - status message, from 6e3:6c3 (game mode 10)
//        - hardcoded check for 20:0d (level up) to change audio cue
//        --> search for changing game mode to 10
//  3d0f3 - hardcoded 1f:00 "zzz..." for paralysis
//  3d1ca - hardcoded 13:00 kensu swan followup asking for pendant (dialog jump 16)
//  3d1eb - hardcoded 0b:01 asina reveal
//  3d347 - LoadAndShowDialog - from $21:$20
//  3d43c - hardcoded 20:0c itemget "you now have ITEM"
//  3d48a - hardcoded 20:0f "you have too many items"
//  3d5b7 - hardcoded 1c:11 item jump 01 "finally found sword of thunder"
//  3d621 - hardcoded 0e:05 mesia recording
//  3d79c - hardcoded 16:00 trigger action 17 - azteca explanation in shyron
//  3d9c4 - hardcoded 20:11 empty shop
//  3db60 - hardcoded 21:00 warp menu
//  3dd6e - hardcoded 21:02 telepathy menu
//  3de17 - telepathy - from $21:$20 - set from 1da2c table in 1c16f
//  3decb - hardcoded 21:01 change menu

run();
