// Utilities for rendering flags.

import { CharacterSet, Sprite, generateThumbnailImage } from './characters';
import {FlagSection, FlagSet, Preset} from './flagset';

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
    renderCustomCharacter(container, await sprite);
    options.appendChild(container);
  }
}

export function renderCustomCharacter(container: HTMLElement, sprite: Sprite) {
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
