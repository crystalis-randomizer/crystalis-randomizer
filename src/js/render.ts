// Utilities for rendering flags.

import { CharacterSet, Sprite, generateThumbnailImage } from './characters';
import {FlagSection, FlagSet, Preset} from './flagset';
// import * as Ips from module('./tools/ips');
const Ips:any = require('./tools/ips');
const Main:any = require('./main');

export function renderPresets(presets: HTMLElement) {
  let first = true;
  for (const {name, flagString, description} of Preset.all()) {
    const h2 = document.createElement('h2');
    h2.textContent = name;
    presets.appendChild(h2);
    const p = document.createElement('p');
    p.innerHTML = description; // NOTE: mainly for italics and bold
    presets.appendChild(p);
    //const div = document.createElement('div');
    //div.classList.add('flex-row');
    //presets.appendChild(div);
    //const flagDiv = document.createElement('div');
    //flagDiv.textContent = flags;
    //flagDiv.classList.add('preset-flags');
    //div.appendChild(flagDiv);
    const apply = document.createElement('a');
    apply.textContent = flagString; //'Apply';
    apply.classList.add('button');
    apply.classList.add('preset-flags');
    apply.dataset['flags'] = flagString;
    if (flagString.length > 48) apply.classList.add('small');
    if (first) apply.dataset['defaultPreset'] = 'true';
    first = false;
    presets.appendChild(apply);
  }
}

export function renderOptions(options: HTMLElement) {
  for (const {name, description, flags} of FlagSection.all()) {
    const h2 = document.createElement('h2');
    h2.textContent = name;

    options.appendChild(h2);
    if (description) {
      const p = document.createElement('p');
      p.innerHTML = description; // NOTE: mainly for italics and bold
      options.appendChild(p);
    }
    const div = document.createElement('div');
    div.classList.add('flag-list');
    options.appendChild(div);
    for (const flagObj of flags.values()) {
      const {flag, opts: {hard, name, text}} = flagObj;
      const flagDiv = document.createElement('div');
      flagDiv.textContent = `${flag}: ${name}`;
      flagDiv.classList.add('checkbox');
      if (hard) flagDiv.classList.add('hard');
      if (text) {
        const textDiv = document.createElement('div');
        textDiv.classList.add('flag-body');
        textDiv.innerHTML = text;
        flagDiv.appendChild(textDiv);
      }
      div.appendChild(flagDiv);
    }
  }
}

export async function renderDefaultCharacters(options: HTMLElement) {
  // Display all simea replacements that are built-in to the rando
  const simeaReplacements = CharacterSet.get("simea");
  for (const sprite of simeaReplacements.values()) {
    const container = document.createElement('div');
    renderCustomCharacter(container, "", await sprite);
    options.appendChild(container);
  }
}

export function renderCustomCharacter(container: HTMLElement, filename: string, sprite: Sprite) {
  container.className = "flex-row";
  container.style.width = '100%';
  
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'simea-replacement'
  input.id = `simea-replacement-${sprite.name}`;
  input.value = sprite.name;
  input.style.display = 'none';
  // Select the mesia sprite by default. Later when loading the values from localstorage,
  // we will choose the previous sprite option
  if (sprite.name == "Simea") {
    input.checked = true;
  }
  container.appendChild(input);
  const label = document.createElement('label');
  label.style.position = "relative";
  label.className = "sprite-replacement";
  label.htmlFor = `simea-replacement-${sprite.name}`;
  const img = document.createElement('img');
  img.width = 112;
  img.height = 98;
  img.style.float = "left";
  generateThumbnailImage(sprite.nssdata).then(src => img.src = src);
  label.appendChild(img);

  const title = document.createElement('div');
  title.textContent = sprite.name;
  title.className = "title";
  label.appendChild(title);

  if (sprite.description) {
    const desc = document.createElement('div');
    desc.innerHTML = sprite.description; // NOTE: mainly for italics and bold
    desc.className = "desc";
    label.appendChild(desc);
  }

  const cornerButtons = document.createElement('div');
  cornerButtons.style.position = "absolute";
  cornerButtons.style.top = "0";
  cornerButtons.style.right = "0";
  cornerButtons.style.margin = "3px";
  if (filename != "") {
    const xbutton = document.createElement('div');
    xbutton.textContent = "X";
    xbutton.className = "button";
    xbutton.onclick = function() {
      const selectedSimeaSprite = window['localStorage'].getItem('simea-replacement');
      const savedSpritesStr = window['localStorage'].getItem('simea-replacement-custom') || "{}";
      const savedSprites = JSON.parse(savedSpritesStr, Main.addMapRestorement);
      // remove the sprite from localstorage and then reload sprites
      delete savedSprites[filename];
      window['localStorage'].setItem('simea-replacement-custom', JSON.stringify(savedSprites, Main.addMapReplacement));

      // if we deleted the selected sprite reselect Simea
      if (sprite.name == selectedSimeaSprite) {
        const simeaOptions = document.getElementsByName('simea-replacement');
        for (const radio of simeaOptions) {
          const r = <HTMLInputElement>radio;
          if (r.value == "Simea") {
            r.checked = true;
          }
        }
      }

      reloadSpritesFromStorage();
    }
    cornerButtons.appendChild(xbutton);
  }

  // Also add a button for downloading the sprite as an IPS patch for vanilla
  
  const ipsButton = document.createElement('div');
  ipsButton.className = "button";
  const downloadIcon = document.getElementById('download-icon')?.cloneNode(true)! as HTMLElement;
  downloadIcon.setAttribute("id", `download-icon-${sprite.name}`);
  downloadIcon.style.display = "flex";
  ipsButton.appendChild(downloadIcon);
  ipsButton.className = "button";
  ipsButton.onclick = function() {
    const vanillaRom = Main.rom.slice();
    const patchedRom = Main.rom.slice();
    Sprite.applyPatch(sprite, patchedRom.subarray(0x10), false);
    const vanilla = new Ips.MarcFile(vanillaRom);
    const patched = new Ips.MarcFile(patchedRom);
    Ips.createIPSFromFiles(vanilla, patched).export(sprite.name).save();
  }
  // downloadIps.appendChild(ipsButton);
  // downloadIps.style.marginTop = "8px";
  cornerButtons.appendChild(ipsButton);
  label.appendChild(cornerButtons);
  container.appendChild(label);
}

export function renderRaceFlags(options: HTMLElement, flagset: FlagSet) {
  for (const {name, description, flags} of FlagSection.all()) {
    let any = false;
    const h2 = document.createElement('h2');
    h2.textContent = name;
    const p = description ? document.createElement('p') : null;
    if (p) p.innerHTML = description!; // NOTE: mainly for italics and bold
    const div = document.createElement('div');
    div.classList.add('flag-list');
    for (const flagObj of flags.values()) {
      const {flag, opts: {hard, name, text}} = flagObj;
      if (!flagset.check(flagObj)) continue;
      any = true;
      const flagDiv = document.createElement('div');
      flagDiv.textContent = `${flag}: ${name}`;
      flagDiv.classList.add('checkbox');
      if (hard) flagDiv.classList.add('hard');
      if (text) {
        const textDiv = document.createElement('div');
        textDiv.classList.add('flag-body');
        textDiv.innerHTML = text;
        flagDiv.appendChild(textDiv);
      }
      div.appendChild(flagDiv);
    }
    if (any) {
      options.appendChild(h2);
      if (p) options.appendChild(p);
      options.appendChild(div);
    }
  }
};

export const reloadSpritesFromStorage = () => {
  const selectedSimeaSprite = window['localStorage'].getItem('simea-replacement');
  const savedSpritesStr = window['localStorage'].getItem('simea-replacement-custom') || "{}";
  const savedSprites = JSON.parse(savedSpritesStr, Main.addMapRestorement);
  // load any saved sprites from storage
  const savedSpritesDiv = document.getElementById('simea-sprite-custom')!;
  savedSpritesDiv.innerHTML = '';
  for (let [filename, sprite] of Object.entries(savedSprites)) {
    // Update the character set mapping for this custom sprite
    const s = <Sprite>sprite;
    CharacterSet.get("simea").set(s.name, Promise.resolve(s));

    renderCustomCharacter(savedSpritesDiv, filename, s);
    const thisRadio = document.getElementById(`simea-replacement-${s.name}`);
    const r = <HTMLInputElement>thisRadio;
    r.addEventListener('change', (e) => {
      window['localStorage'].setItem('simea-replacement', (e.target as HTMLInputElement).value);
    });
    if (r.value == selectedSimeaSprite) {
      r.checked = true;
    }
  }
}
