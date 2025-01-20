import * as patch from './patch';
import * as render from './render';
import * as version from './version';
import { crc32 } from './crc32';
import {EXPECTED_CRC32_NES, EXPECTED_CRC32_SNK_40TH} from './rom.js';
import { FlagSet } from './flagset';
import { ProgressTracker } from './progress';
import { CharacterSet, Sprite, parseNssFile } from './characters';

// global state
let flags;
let seed;
export let rom;
let romName;
let race = false;
let debug = false;

window.global = window;
const permalink = typeof CR_PERMALINK === 'boolean' && CR_PERMALINK;

function ga(cmd, ...args) {
  // TODO - use gtag correctly...
  (window.ga || (() => {}))('gtag_UA_131783670_1.' + cmd, ...args);
}

const initRace = () => {
  race = true;
  loadRomFromStorage();
  loadSpriteSelectionsFromStorage();
  initializeStateFromHash(false);
  updateRaceDom();
  // Handle URL edits directly
  window.addEventListener('popstate', (e) => {
    initializeStateFromHash(false);
  });
  document.body.addEventListener('click', click);
  initVersion();
};

const main = () => {
  if (permalink) {
    document.body.classList.add('permalink');
  }
  if (document.getElementById('race') == null) { // no button
    initRace();
    render.renderRaceFlags(document.getElementById('flags'), flags);
    for (const el of [...document.getElementsByClassName('checkbox')]) {
      makeCheckbox(el);
    }
    for (const cb of document.querySelectorAll('.flag-list > input[type="checkbox"]')) {
      cb.checked = true;
      cb.disabled = true;
    }
    return;
  }

  render.renderPresets(document.getElementById('presets'));
  render.renderOptions(document.getElementById('select-options'));
  render.renderDefaultCharacters(document.getElementById('simea-sprite-options')).then(() => {
    loadSpriteSelectionsFromStorage();
  });

  // Check for a stored ROM.
  loadRomFromStorage();
  initializeStateFromHash(true);

  // Wire up the presets menu.
  if (!flags) document.querySelector('[data-default-preset]').click();
  for (const el of [...document.getElementsByClassName('checkbox')]) {
    makeCheckbox(el);
  }
  updateDom();
  addSeedListeners();
  document.body.addEventListener('click', click);

  // Handle URL edits directly
  window.addEventListener('popstate', (e) => {
    if (e.state) {
      flags = new FlagSet(e.state.flags);
      seed = e.state.seed;
    } else {
      initializeStateFromHash(true);
    }
  });
  if (debug) {
    const debugSection = document.createElement('section');
    debugSection.classList.add('expandable');
    const header = document.createElement('h1');
    header.textContent = 'Debug';
    debugSection.appendChild(header);
    const div = document.createElement('div');
    div.id = 'debug';
    debugSection.appendChild(div);
    document.querySelector('main').appendChild(debugSection);
  }

  // Confirm that JS works.
  initVersion();
};

const initVersion = () => {
  if (version.HASH !== 'latest') {
    const prefix = permalink ? '' : 'Current version: ';
    for (const span of document.getElementsByClassName('version')) {
      span.textContent =
          `${prefix}${version.LABEL} (${version.DATE.toDateString()})`;
    }
  }
  if (version.PREV) {
    // This is pretty hacky.
    const nav = document.querySelector('nav');
    const prev = document.createElement('a');
    prev.textContent = 'Older';
    prev.href = `/sha/${version.PREV}`;
    prev.style.float = 'right';
    nav.appendChild(prev);
  }
  document.body.classList.add('js-works');
  document.body.classList.remove('js-broken');
  if (version.STATUS == 'rc') {
    document.body.classList.add('release-candidate');
    document.body.classList.add('versioned');
  } else if (version.STATUS == 'stable') {
    document.body.classList.add('versioned');
  }
};

const addSeedListeners = () => {
  const input = document.getElementById('seed');
  const update = () => {
    seed = input.value;
    updateDom();
  };
  input.addEventListener('keyup', update);
  input.addEventListener('change', update);
};

const initializeStateFromHash = (initPresets) => {
  // Read flags and seed from the hash.
  for (const term of location.hash.substring(1).split('&')) {
    let [key, value] = term.split('=');
    value = decodeURIComponent(value);
    if (key === 'flags') flags = new FlagSet(value);
    if (key === 'seed') seed = decodeURIComponent(value);
    if (key === 'race') document.body.classList.add('race');
    if (key === 'debug') debug = true;
    for (const preset of document.querySelectorAll('[data-flags]')) {
      preset.addEventListener('click', () => {
        flags = new FlagSet(preset.dataset['flags']);
        if (version.VERSION == 'unstable') flags.set('Ds', true);
        updateDom();
      });
    }
  }
};

async function click(e) {
  let t = e.target;
  const label = `${version.LABEL}: ${flags}`;
  const start = new Date().getTime();
  while (t) {
    if (t.tagName === 'H1' && t.parentElement.classList.contains('expandable')) {
      t.parentElement.classList.toggle('expanded');
      break;
    } else if (t.id === 'preset-apply') {
      ga('send', 'event', 'custom-preset');
      flags = new FlagSet(document.getElementById('flagstring').value);
      updateDom();
      break;
    } else if (t.id === 'new-seed') {
      ga('send', 'event', 'Main', 'new-seed');
      seed = Math.floor(Math.random() * 0x100000000).toString(16);
      updateDom();
      break;
    } else if (t.id === 'generate') {
      ga('send', 'event', 'Main', 'generate', label);
      const seedHex = patch.parseSeed(seed);
      const [shuffled, crc] = await shuffleRom(seedHex);
      ga('send', 'timing', 'Main', 'generate', new Date().getTime() - start, label);
      // TODO - should we build the flagset into the filename?
      // Make it an option?
      if (!shuffled) break;
      const filename =
          romName.replace(
              /\.nes|$/,
              ['_', seedHex.toString(16).padStart(8, 0),
               '_', crc.toString(16).padStart(8, 0), '.nes'].join(''));
      download(shuffled, filename);
      break;
    } else if (t.id === 'spoiler') {
      ga('send', 'event', 'Main', 'spoiler', label);
      await shuffleRom(patch.parseSeed(seed));
      ga('send', 'timing', 'Main', 'spoiler', new Date().getTime() - start, label);
      break;
    }
    t = t.parentElement;
  }
}

const read = (arr, index, len) => {
  const chars = [];
  for (let i = 0; i < len; i++) {
    chars.push(String.fromCharCode(arr[index + 2 * i]));
  }
  return chars.join('');
};

const shuffleRom = async (seed) => {
  for (const span of document.getElementsByClassName('seed-out')) {
    span.textContent = seed.toString(16).padStart(8, '0');
  }
  const progressEl = document.getElementById('progress');
  const progressTracker = new ProgressTracker();
  const orig = rom.slice();
  let done = false;
  const flagsClone = new FlagSet(String(flags)); // prevent modifying
  document.body.classList.add('shuffling');
  const log = flags.check('Ds') ? {} : undefined;
  const showWork = () => {
    if (done) return;
    progressEl.value = progressTracker.value();
    setTimeout(showWork, 120);
  }
  showWork();
  let shuffled;
  let crc;
  const selectedsimeaSprite = document.querySelector('input[name="simea-replacement"]:checked').value;
  const sprite = await CharacterSet.get("simea").get(selectedsimeaSprite);
  try {
    [shuffled, crc] =
        await patch.shuffle(
          orig, seed, flagsClone, [sprite], log, progressTracker);
  } catch (err) {
    const invalid = err.name === 'UsageError';
    document.body.classList.add(invalid ? 'invalid' : 'failure');
    const errorText = document.getElementById(invalid ? 'invalid-text' : 'error-text');
    errorText.textContent = invalid ? err.message : err.stack;
    errorText.parentElement.parentElement.scrollIntoViewIfNeeded();
    document.getElementById('checksum').textContent = 'SHUFFLE FAILED!';
    throw err;
  }
  if (crc < 0) {
    document.getElementById('checksum').textContent = `SHUFFLE FAILED! ${crc}`;
    return [null, null];
  }
  done = true;
  document.body.classList.remove('shuffling');
  if (log && log.spoiler) {
    const s = log.spoiler;
    if (s.flags) replaceSpoiler('spoiler-flags', [s.flags]);
    replaceSpoiler('spoiler-items', sortBy(s.slots.filter(x => x), x => x.item));
    replaceSpoiler('spoiler-route', s.route);
    replaceSpoiler('spoiler-mazes',
                   sortBy(s.mazes, x => x.location)
                       .map(({name, maze}) => `${name}:\n${maze}`));
    replaceSpoiler('spoiler-trades',
                   s.trades.map(({item, npc}) => `${npc}: ${item}`).sort());
    replaceSpoiler('spoiler-item-names',
                   s.unidentifiedItems.map(
                       ({oldName, newName}) => `${newName}: ${oldName}`).sort());
    replaceSpoiler(
        'spoiler-walls',
        sortBy(s.walls, x => x.location)
            .map(({location, oldElement, newElement}) =>
                      `${location}${oldElement === 3 ? ' (iron)' : ''}: ${
                       ['wind', 'fire', 'water', 'thunder'][newElement]}`));
    replaceSpoiler('spoiler-wild-warps', s.wildWarps.map(({name}) => name));
    replaceSpoiler('spoiler-houses', s.houses.map(({house, town}) => `${house}: ${town}`.replace(/\s*-\s*/g, ' ')));
  }
  document.getElementById('checksum').textContent =
      // shifted by header
      read(shuffled, 0x27895, 4) + read(shuffled, 0x27896, 4);
  return [shuffled, crc];
};

function sortBy(arr, f) {
  return [...arr].sort((a, b) => {
    const fa = f(a);
    const fb = f(b);
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });
}

const replaceSpoiler = (name, log) => {
  const el = document.getElementById(name);
  while (el.children.length) el.lastChild.remove();
  for (const line of log) {
    const li = document.createElement('li');
    li.textContent = line;
    el.appendChild(li);
  }
  el.previousElementSibling.classList.toggle('empty-spoiler', !log.length);
};

// TODO - need to store the checkbox somewhere keyed by the flag?
const makeCheckbox = (el) => {
  // We start with a simple DIV.checkbox - parse out the flag ID from it
  // and then make some checkboxes and labels.
//console.log(el);
  const body = el.getElementsByClassName('flag-body')[0];
  if (body) body.remove();
  const [flag, name] = el.textContent.split(/:\s*/);

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = `flag-${flag}`;
  cb.dataset['flag'] = flag;
  cb.dataset['mode'] = 'false';
  el.parentElement.insertBefore(cb, el);

  const labelBox = document.createElement('label');
  labelBox.textContent = flag;
  labelBox.htmlFor = cb.id;
  el.parentElement.insertBefore(labelBox, el);

  const description = document.createElement('div');
  el.parentElement.insertBefore(description, el);

  const labelText = document.createElement('label');
  labelText.textContent = name;
  labelText.htmlFor = cb.id;
  description.appendChild(labelText);

  if (body) description.appendChild(body);
  if (el.classList.contains('hard')) {
    labelBox.classList.add('hard');
    labelText.classList.add('hard');
    labelText.textContent += ' *';
  }
  el.remove();

  cb.addEventListener('change', () => {
    window.FLAGS = flags;
    const mode = flags.toggle(flag);
    if (!mode) {
      cb.checked = false;
      labelBox.textContent = flag;
    } else if (mode === true) {
      cb.checked = true;
      labelBox.textContent = flag;
    } else {
      cb.checked = true;
      labelBox.textContent = `${flag[0]}${mode}${flag.substring(1)}`;
    }
    updateDom();
  });
};

const updateDom = () => {
  document.body.classList.remove('failure');
  document.body.classList.remove('invalid');
  for (const cb of document.querySelectorAll('input[data-flag]')) {
    const flag = cb.dataset['flag'];
    const mode = flags.get(flag);
    cb.checked = mode !== false;
    const insert = typeof mode === 'boolean' ? '' : mode;
    cb.nextElementSibling.textContent =
        `${flag[0]}${insert}${flag.substring(1)}`;
  }
  const flagString = String(flags).replace(/ /g, '');
  document.getElementById('seed').value = seed || '';
  const hash = ['#flags=', flagString];
  if (seed) {
    hash.push('&seed=', encodeURIComponent(seed));
  }
  if (debug) hash.push('&debug');
  history.replaceState({flags: String(flags), seed}, '', String(window.location).replace(/#.*/, '') + hash.join(''));
  if (version.STATUS == 'stable' || version.STATUS == 'rc') {
    const s = seed || Math.floor(Math.random() * 0x100000000).toString(16);
    const v = version.VERSION;
    const f = flagString;
    document.getElementById('race').href = `/${v}/race#flags=${f}&seed=${s}`;
  }
  updateRaceDom();
};

const updateRaceDom = () => {
  const flagString = String(flags)
  document.body.classList.toggle('spoiled', flags.check('Ds'));
  document.body.classList.toggle('debug-mode', /D/.test(flagString));
  for (const span of document.getElementsByClassName('flagstring-out')) {
    span.textContent = flagString;
  }
  // document.getElementById('track-url').href =
  //     `track#flags=${flagString.replace(/ /g, '')}`;
}

const loadRomFromStorage = () => {
  const name = window['localStorage'].getItem('name');
  const data = window['localStorage'].getItem('rom');
  const upload = document.getElementById('pick-file');
  const checkCrc = () => {
    document.body.classList.add('rom-uploaded');
    const orig_crc = crc32(rom);
    document.body.classList.toggle('rom-broken', orig_crc != EXPECTED_CRC32_NES && orig_crc != EXPECTED_CRC32_SNK_40TH);
  };
  // const shuffle = document.getElementById('shuffle');
  // const badcrc = document.getElementById('badcrc');
  if (name && data) {
    romName = name;
    rom = Uint8Array.from(
        new Array(data.length / 2).fill(0).map(
          (_, i) => Number.parseInt(
            data[2 * i] + data[2 * i + 1], 16)));
    checkCrc();
  }
  upload.addEventListener('change', () => {
    const file = upload.files[0];
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      const raw = new Uint8Array(reader.result);
      const expectedSize =
          16 + (raw[6] & 4 ? 512 : 0) + (raw[4] << 14) + (raw[5] << 13);
      const arr = raw.slice(0, expectedSize);
      const str = Array.from(arr, x => x.toString(16).padStart(2, 0)).join('');
      rom = arr;
      window['localStorage'].setItem('rom', str);
      window['localStorage'].setItem('name', file.name);
      checkCrc();
      romName = file.name;
    });
    reader.readAsArrayBuffer(file);
  });
};

const loadSpriteSelectionsFromStorage = () => {
  const selectedSimeaSprite = window['localStorage'].getItem('simea-replacement');

  const simeaOptions = document.getElementsByName('simea-replacement');
  for (const radio of simeaOptions) {
    if (radio.value == selectedSimeaSprite) {
      radio.checked = true;
    }
  }
  simeaOptions.forEach((radio) => {
    radio.addEventListener('change', (event) => {
      window['localStorage'].setItem('simea-replacement', event.target.value);
    })
  })

  render.reloadSpritesFromStorage();

  // add a handler for the sprite upload
  const upload = document.getElementById('upload-sprite');
  upload.addEventListener('change', () => {
    const file = upload.files[0];
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      const savedSpritesStr = window['localStorage'].getItem('simea-replacement-custom') || "{}";
      const savedSprites = JSON.parse(savedSpritesStr, addMapRestorement);
      const nssdata = reader.result;
      // Get rid of the extension and replace any _ with spaces
      const name = file.name.replace(/\.[^/.]+$/, "").replaceAll(/_/g, " ");
      Sprite.init(name, "simea", parseNssFile(file.name, nssdata), `Loaded on ${new Date().toLocaleString()}`).then(sprite => {
        savedSprites[name] = sprite;
        // uncomment this and the img tag to debug spritesheet loading
        // generatePreviewImage(sprite.nssdata).then(img => document.getElementById('test-spritesheet-upload').src = img);
        window['localStorage'].setItem('simea-replacement-custom', JSON.stringify(savedSprites, addMapReplacement));
        // reload custom sprites
        render.reloadSpritesFromStorage();
      });
      // Reset the input to allow reuploading the same file multiple times for development
      upload.value = "";
    });
    reader.readAsText(file);
  });
}

export function addMapReplacement(key, value) {
  if(value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  } else {
    return value;
  }
}

export function addMapRestorement(key, value) {
  if(typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    }
  }
  return value;
}

export const download = (data, name) => {
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  const blob = new Blob([data], {type: 'octet/stream'}),
        url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
};

main();
