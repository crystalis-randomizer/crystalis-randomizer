import * as patch from './patch.js';

const main = () => {
  const rom = {orig: null, name: null};
  document.getElementById('controls').style.display = 'block';
  document.getElementById('notice').remove();
  document.getElementById('build-info').textContent =
    `Built ${patch.BUILD_DATE} (${patch.BUILD_HASH})`;
  loadRomFromStorage(rom);
  document.getElementById('see-log').addEventListener('change', e => {
    document.getElementById('log').style.display = e.target.checked ? 'block' : 'none';
  });
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
    seed = typeof seed == 'number' ? seed : Number.parseInt(seed, 16)
    let str = window.location.hash;
    window.history.replaceState({}, '', `#seed=${seed.toString(16)}`);
    hash['seed'] = seed.toString(16);
    if (seedInput.value != seed.toString(16)) {
      seedInput.value = seed.toString(16);
    }
    if (rom.orig) document.getElementById('shuffle').disabled = false;
    document.getElementById('play').href=`https://shicks.github.io/jsnesx/#patch=crystalis-randomizer/${patch.BUILD_HASH}/patch&init=crystalis-randomizer/${patch.BUILD_HASH}/debug&seed=${seed.toString(16)}`;
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
  const shuffle = document.getElementById('shuffle');
  if (name && data) {
    nameSpan.textContent = name + ' ';
    rom.name = name;
    rom.orig = Uint8Array.from(
        new Array(data.length / 2).fill(0).map(
          (_, i) => Number.parseInt(
            data[2 * i] + data[2 * i + 1], 16)));
    upload.style.display = 'none';
    clear.style.display = 'inline';
    shuffle.disabled = false;
  }
  upload.addEventListener('change', () => {
    const file = upload.files[0];
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      const arr = new Uint8Array(reader.result);
      const str = Array.from(arr, x => x.toString(16).padStart(2, 0)).join('');
      localStorage.setItem('rom', str);
      localStorage.setItem('name', file.name);
      rom.orig = arr;
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
    rom.orig = rom.name = null;
    shuffle.disabled = true;
  });
  document.getElementById('download').addEventListener('click', () => {
    download(rom.shuffled, rom.shuffledName);
  });
};

const shuffle = async (seed, rom) => {
  seed = typeof seed == 'number' ? seed : Number.parseInt(seed, 16);
  if (!rom.orig) {
    alert('Must select a ROM first!');
    return;
  }
  document.getElementById('shuffle').disabled = true;
  const dl = document.getElementById('download');
  dl.disabled = true;
  const dots = document.getElementById('dots');
  dots.textContent = ' Working...';
  const done = [];
  const showWork = () => {
    if (done.length) return;
    dots.textContent += '.';
    setTimeout(showWork, 200);
  };
  showWork();

  const shuffled = rom.orig.slice();
  rom.shuffled = shuffled;
  const log = await patch.default.apply(shuffled, {'seed': seed});
  dots.textContent = '';
  done.push(true);
  dl.disabled = false;
  rom.shuffledName = rom.name.replace(/\.nes|$/, `_${patch.BUILD_HASH}_${seed.toString(16)}.nes`);
  document.getElementById('log').textContent = log || '';
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
