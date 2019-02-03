const main1 = () => {
  document.getElementById('controls').style.display = 'block';
  document.getElementById('notice').remove();
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
    hash['seed'] = seed.toString(16);
    window.history.replaceState(
        {}, '', '#' + Object.keys(hash).map(k => `${k}=${encodeURIComponent(hash[k])}`).join('&'));
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
  document.getElementById('shuffle').addEventListener('click', () => shuffle(hash, rom));
};

const shuffle = async (hash, rom) => {
  let seed = hash['seed'];
  seed = typeof seed == 'number' ? seed : Number.parseInt(seed, 16);
  hash['seed'] = seed;
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
  const log = await patch.default.apply(shuffled, hash);
  dots.textContent = '';
  done.push(true);
  dl.disabled = false;
  rom.shuffledName = rom.name.replace(/\.nes|$/, `_${patch.BUILD_HASH}_${seed.toString(16)}.nes`);
  document.getElementById('log').textContent = log || '';
};
