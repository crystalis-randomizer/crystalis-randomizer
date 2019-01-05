import * as patch from './patch.js';

const main = () => {
  const rom = {rom: null, name: null};
  document.getElementById('controls').style.display = 'block';
  document.getElementById('notice').remove();
  loadRomFromStorage(rom);
  // check the hash for the seed...
  const hash = {};
  if (window.location.hash) {
    // look for a patch to apply
    for (const component of window.location.hash.substring(1).split('&')) {
      const split = component.split('=');
      hash[split[0]] = decodeURIComponent(split[1]);
    }
  }
  const seedInput = document.getElementById('seed');
  const setSeed = (seed) => {
    seed = Number(seed)
    let str = window.location.hash;
    window.history.replaceState({}, '', `#seed=${seed}`);
    hash['seed'] = seed;
    if (seedInput.value != seed) seedInput.value = seed;
  };
  setSeed('seed' in hash ? hash['seed'] : Math.floor(Math.random() * 0x100000000));
  document.getElementById('generate').addEventListener('click', () => {
    setSeed(Math.floor(Math.random() * 0x100000000));
  });
  seedInput.addEventListener('change', () => setSeed(seedInput.value));
  document.getElementById('shuffle').addEventListener('click', () => shuffle(hash['seed'], rom));
};

const loadRomFromStorage = (rom) => {
  const name = localStorage.getItem('name');
  const data = localStorage.getItem('rom');
  const nameSpan = document.getElementById('previousfile');
  const upload = document.getElementById('upload');
  const clear = document.getElementById('clear');
  if (name && data) {
    nameSpan.textContent = name + ' ';
    rom.name = name;
    rom.rom = Uint8Array.from(
        new Array(data.length / 2).fill(0).map(
          (_, i) => Number.parseInt(
            data[2 * i] + data[2 * i + 1], 16)));
    upload.style.display = 'none';
    clear.style.display = 'inline';
  }
  upload.addEventListener('change', () => {
    const file = upload.files[0];
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      const arr = new Uint8Array(reader.result);
      const str = Array.from(arr, x => x.toString(16).padStart(2, 0)).join('');
      localStorage.setItem('rom', str);
      localStorage.setItem('name', file.name);
      rom.rom = arr;
      nameSpan.textContent = file.name + ' ';
      rom.name = file.name;
      upload.style.display = 'none';
      clear.style.display = 'inline';
    });
    reader.readAsArrayBuffer(file);
  });
  clear.addEventListener('click', () => {
    nameSpan.textContent = '';
    upload.style.display = 'inline';
    clear.style.display = 'none';
    rom.rom = rom.name = null;
  });
};

const shuffle = (seed, rom) => {
  if (!rom.rom) {
    alert('Must select a ROM first!');
    return;
  }
  const shuffled = rom.rom.slice();
  patch.default.apply(shuffled, {'seed': seed});
  const name = rom.name.replace(/\.nes|$/, '_' + seed + '.nes');
  download(shuffled, name)
};

const download = (data, name) => {
  const a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  const blob = new Blob([data], {type: "octet/stream"}),
        url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
};

main();
