import { normalizeKey } from './shortcuts.mjs';

export function composedKey(composer) {
  if (!composer.base) return null;
  return normalizeKey([...['ctrl', 'alt', 'shift'].filter((key) => composer[key]), composer.base].join('+'));
}

export function setBase(composer, value) {
  const key = normalizeKey(value);
  if (key.includes('+')) throw new Error('Type one key, e.g. a, f2, or tab.');
  composer.base = key;
}

export const baseKeys = [
  ['Up', 'up'], ['Down', 'down'], ['Left', 'left'], ['Right', 'right'],
  ['Tab', 'tab'], ['Enter', 'enter'], ['Esc', 'esc'], ['Space', 'space'],
  ['Backspace', 'backspace'], ['Delete', 'delete'], ['Home', 'home'], ['End', 'end'],
  ['Page Up', 'pageup'], ['Page Down', 'pagedown'], ['Insert', 'insert'],
].map(([label, key]) => ({ label, key }));
