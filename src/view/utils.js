export const child = (parent, type, ...classes) => {
  const e = document.createElement(type);
  parent.appendChild(e);
  for (const c of classes) {
    e.classList.add(c);
  }
  return e;
};

export const text = (parent, text) => {
  const n = document.createTextNode(text);
  parent.appendChild(n);
};

export const link = (parent, text, handler) => {
  const link = child(parent, 'a');
  link.textContent = text;
  link.href = 'javascript:;';
  link.addEventListener('click', handler);
  return link;
};

// Format a hex number
export const fmt = (x, p) => `$${x.toString(16).padStart(p, 0)}`;
