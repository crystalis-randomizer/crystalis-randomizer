window.global = window;
const upload = document.getElementById('pick-file');

upload.addEventListener('change', () => {
  const file = upload.files[0];
  const reader = new FileReader();
  reader.addEventListener('loadend', () => {
    const rom = new Uint8Array(/** @type {!ArrayBuffer} */ (reader.result)).slice(16);
    document.getElementById('filename').textContent = file.name;
    const version = read(rom, 0x277d4, 12).replace(/\s+$/, '').toLowerCase();
    document.getElementById('hash').textContent = version;
    const seed = read(rom, 0x277ec, 8).trim().toLowerCase();
    document.getElementById('seed').textContent = seed;
    let flags = read(rom, 0x277ff, 23) + read(rom, 0x27800, 23);
    if (read(rom, 0x2782f, 23).trim()) {
      flags += read(rom, 0x2782f, 23) + read(rom, 0x27830, 23);
    }
    // for (const group of flags.trim().split(/ +/g)) {
    //   const g = document.createElement('span');
    //   g.classList.add('group');
    //   g.textContent = group;
    //   document.getElementById('flags').appendChild(g);
    // }
    document.getElementById('flags').textContent = flags;
    const crc = (read(rom, 0x27885, 4) + read(rom, 0x27886, 4)).toLowerCase();
    document.getElementById('checksum').textContent = crc;
    const query = `flags=${flags.replace(/ /g, '')}&seed=${seed}&crc=${crc}`;
    document.getElementById('query').textContent = query;
    const sha = /\./.test(version) ? version : `sha/${version}`;
    const permalink = `https://crystalisrandomizer.com/${sha}/#${query}`;
    const link = document.getElementById('permalink')
    link.href = permalink;
    link.textContent = permalink;
  });
  reader.readAsArrayBuffer(file);
});

const read = (arr, index, len) => {
  const chars = [];
  for (let i = 0; i < len; i++) {
    chars.push(String.fromCharCode(arr[index + 2 * i]));
  }
  return chars.join('');
};

const download = (data, name) => {
  const a = document.createElement("a");
  document.body.appendChild(a);
  a.style.display = "none";
  const blob = new Blob([data], {type: "octet/stream"}),
        url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
};
