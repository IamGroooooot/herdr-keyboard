import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function loadConfig(env = process.env) {
  if (!env.HERDR_PLUGIN_CONFIG_DIR) return validateConfig({});
  const path = join(env.HERDR_PLUGIN_CONFIG_DIR, 'keyboard.json');
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return validateConfig({});
    throw new Error(`Cannot read ${path}: ${error.message}`);
  }
  try {
    return validateConfig(JSON.parse(text));
  } catch (error) {
    throw new Error(`Invalid ${path}: ${error.message}`);
  }
}

export function validateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Config must be an object.');
  if (Object.keys(config).some((key) => !['shortcuts', 'closeAfterSend'].includes(key))) throw new Error('Unknown config option. Use shortcuts or closeAfterSend.');
  if (config.closeAfterSend !== undefined && typeof config.closeAfterSend !== 'boolean') throw new Error('closeAfterSend must be true or false.');
  const entries = config.shortcuts ?? shortcuts;
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > 90) throw new Error('Provide between 1 and 90 shortcuts.');
  return {
    closeAfterSend: config.closeAfterSend ?? true,
    shortcuts: entries.map(validateShortcut),
  };
}

export function normalizeKey(value) {
  if (typeof value !== 'string' || value.length > 80) throw new Error('Key must be a short key combination.');
  const parts = value.toLowerCase().split('+').map((part) => {
    const token = part.trim();
    return aliases[token] || token;
  });
  const base = parts.pop();
  if (!namedKeys.has(base) && !/^[a-z0-9]$/.test(base) && !/^f(?:[1-9]|1[0-2])$/.test(base)) {
    throw new Error(`Unsupported key: ${value}`);
  }
  if (parts.some((part) => !['ctrl', 'alt', 'shift'].includes(part)) || new Set(parts).size !== parts.length) {
    throw new Error(`Unsupported modifiers: ${value}`);
  }
  return [...['ctrl', 'alt', 'shift'].filter((part) => parts.includes(part)), base].join('+');
}

function validateShortcut(entry, index) {
  if (!entry || typeof entry.label !== 'string' || !entry.label.trim() || entry.label.length > 60 || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(entry.label)) {
    throw new Error(`Shortcut ${index + 1}: label must be 1–60 characters without control characters.`);
  }
  return { label: entry.label.trim(), key: normalizeKey(entry.key) };
}

export const shortcuts = [
  { label: 'Opt + Down', key: 'alt+down' },
  { label: 'Shift + Tab', key: 'shift+tab' },
  { label: 'Shift + Up', key: 'shift+up' },
  { label: 'Opt + Up', key: 'alt+up' },
  { label: 'Shift + Down', key: 'shift+down' },
  { label: 'Escape', key: 'esc' },
  { label: 'Tab', key: 'tab' },
  { label: 'Up', key: 'up' },
  { label: 'Down', key: 'down' },
  { label: 'Shift + Enter', key: 'shift+enter' },
  { label: 'Opt + Left', key: 'alt+left' },
  { label: 'Opt + Right', key: 'alt+right' },
  { label: 'Shift + Left', key: 'shift+left' },
  { label: 'Shift + Right', key: 'shift+right' },
  { label: 'Ctrl + A', key: 'ctrl+a' },
  { label: 'Ctrl + E', key: 'ctrl+e' },
  { label: 'Ctrl + R', key: 'ctrl+r' },
  { label: 'Ctrl + C', key: 'ctrl+c' },
  { label: 'Ctrl + G', key: 'ctrl+g' },
  { label: 'Ctrl + O', key: 'ctrl+o' },
];

const namedKeys = new Set(['enter', 'esc', 'tab', 'space', 'backspace', 'delete', 'insert',
  'up', 'down', 'left', 'right', 'home', 'end', 'pageup', 'pagedown', 'plus', 'minus']);
const aliases = { opt: 'alt', option: 'alt', control: 'ctrl', escape: 'esc', return: 'enter' };
