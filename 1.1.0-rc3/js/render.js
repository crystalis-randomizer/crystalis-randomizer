// Utilities for rendering flags.

import {FlagSet, PRESETS, FLAGS} from './flagset.js';

export const renderPresets = (presets) => {
  for (const {title, flags, descr, default: isDefault} of PRESETS) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    presets.appendChild(h2);
    const p = document.createElement('p');
    p.innerHTML = descr; // NOTE: mainly for italics and bold
    presets.appendChild(p);
    //const div = document.createElement('div');
    //div.classList.add('flex-row');
    //presets.appendChild(div);
    //const flagDiv = document.createElement('div');
    //flagDiv.textContent = flags;
    //flagDiv.classList.add('preset-flags');
    //div.appendChild(flagDiv);
    const apply = document.createElement('a');
    apply.textContent = flags; //'Apply';
    apply.classList.add('button');
    apply.classList.add('preset-flags');
    apply.dataset['flags'] = flags;
    if (isDefault) apply.dataset['defaultPreset'] = 'true';
    presets.appendChild(apply);
  }
};

export const renderOptions = (options) => {
  for (const {section, text, flags} of FLAGS) {
    const h2 = document.createElement('h2');
    h2.textContent = section;
    options.appendChild(h2);
    if (text) {
      const p = document.createElement('p');
      p.innerHTML = text; // NOTE: mainly for italics and bold
      options.appendChild(p);
    }
    const div = document.createElement('div');
    div.classList.add('flag-list');
    options.appendChild(div);
    for (const {flag, hard, name, text} of flags) {
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
};

export const renderRaceFlags = (options, flagset) => {
  for (const {section, text, flags} of FLAGS) {
    let any = false;
    const h2 = document.createElement('h2');
    h2.textContent = section;
    const p = text ? document.createElement('p') : null;
    if (text) p.innerHTML = text; // NOTE: mainly for italics and bold
    const div = document.createElement('div');
    div.classList.add('flag-list');
    for (const {flag, hard, name, text} of flags) {
      if (!flagset.check(flag)) continue;
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
