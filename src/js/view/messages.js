import {Rom} from '../rom';
import {HARDCODED_MESSAGES} from '../rom/messages';
import {hex} from '../rom/util';

const run = async () => {
  const rom = await Rom.load();
  window.rom = rom;
  const text = document.createElement('div');

  text.style.whiteSpace = 'pre';
  text.style.fontFamily = 'monospace';
  document.body.appendChild(text);

  await rom.writeData();
  const used = rom.messages.uses();

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
      addr += uses ? ` (${[...uses].join(', ')})` : ' (unused?)';
      if (index < 0) {
        index = body.length;
      } else {
        addr = addr + '\n';
      }
      body = body.replace(/\n|$/, addr.substring(index));
      messages.push(`${head} ${body}`);
      //messages.push(`      ${message.hex}`);
    }
  }

  // Show new abbreviation table.
  messages.push('', '', 'Abbreviations:');
  for (const {bytes, str} of rom.messages.buildAbbreviationTable()) {
    messages.push(`${bytes.map(hex).join(' ')} ${str}`);
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
//  27fc9 - endgame messages from table at 27fe8
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

// status messages (6e3:6c3)
//  1e99f - hardcoded 06:00 and 18:00 kelbesque encounters
//  1ece6 - hardcoded 18:02 sabera 2 encounter
//  1ee26 - hardcoded 18:04 mado 2 encounter
//  1ef8a - hardcoded 18:08 karmine encounter
//  1f0e5 - 1b:03 statues encounter
//  1f193 - 1b:00 draygon 1 encounter
//  1f7a3 - data table 1f7c1 4th and 5th byte
//          seem related to bosskills
//  26d68 - not sure what we're doing here.....? may be unrelated
//  27b90 - 20:02 cure status message
//  351e2 - 20:0d level increased
//  352aa - 20:19 poisoned
//  352df - 20:1a paralyzed
//  35317 - 20:1b stoned
//  352cc - 03:01 learn telepathy
//  352e8 - 03:02 fail to learn telepathy
//  365b1 - 10:[10..12] fake mesia dialog based on incrementing 600,x
//  36609 - 0c:04 or 0c:05 (but they're the same) exit dolphin
//  36716 - 03:03 start stom fight
//  3cc23 - 20:0e insufficient magic
//  3d52a - 20:13 nothing happens (item use error)

run();
