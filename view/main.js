import * as views from './views.js';
import {Component} from './component.js';
import {FileSystem} from './fs.js';
import {Menu} from './menu.js';

import {Rom} from '../rom/rom.js';

window.snapshot;
window.main = new Main(document.getElementById('screen'));

const promptForNumbers = (text, callback) => {
  const numbers = prompt(text);
  if (!numbers) return;
  const result = [];
  // TODO(sdh): consider supporting ranges?
  for (const num of numbers.split(/[^0-9a-fA-F$]+/)) {
    result.push(
        num.startsWith('$') ?
            Number.parseInt(num.substring(1), 16) :
            Number.parseInt(num, 10));
  }
  callback(result);
};

new Menu('File')
    // TODO - file manager
    .addItem('Load ROM', () => main.load());
new Menu('NES')
    // TODO - hard reset (need to figure out how)
    .addItem('Reset', () => main.nes.cpu.softReset());
new Menu('Movie')
    .addItem('Playback', async () => {
      
      if (!(main.nes.movie instanceof Playback)) {
        const file = await main.fs.pick('Select movie to play');
        main.nes.movie =
            new Playback(main.nes, file.data, {onStop: () => main.stop()});
        main.nes.movie.start();
      }
      new debug.PlaybackPanel(main.nes);
    })
    .addItem('Record', async () => {
      const file = await main.fs.pick('Select movie to record');
      const movie = file.data && file.data.length ?
          Movie.parse(file.data, 'NES-MOV\x1a') : undefined;
      if (!(main.nes.movie instanceof Recorder) || movie) {
        main.nes.movie = new Recorder(main.nes, movie);
        //main.nes.movie.start();
      }
      if (movie) {
        // TODO - seek to last keyframe, pause emulation to continue recording.
      }
      new debug.RecordPanel(main, file.name);
    });

new Menu('Debug')
    .addItem('Watch Page', () => promptForNumbers('Pages', pages => {
      for (const page of pages) new debug.WatchPage(main.nes, page);
    }))
    .addItem('Nametable', () => new debug.NametableTextViewer(main.nes))
    .addItem('Pattern Table', () => new debug.PatternTableViewer(main.nes))
    .addItem('CHR Viewer', () => promptForNumbers('Banks', banks => {
      new debug.ChrRomViewer(main.nes, banks);
    }))
    .addItem('Virtual Controllers', () => new debug.ControllerPanel(main.nes));

