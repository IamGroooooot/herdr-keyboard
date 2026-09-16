import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const shortcuts = [
  { label: 'Opt + Down', key: 'alt+down' },
  { label: 'Shift + Tab', key: 'shift+tab' },
  { label: 'Shift + Up', key: 'shift+up' },
];

export function sendKey(pane, key, env = process.env, run = spawnSync) {
  if (!pane) throw new Error('No target pane. Run this action from a Herdr pane.');
  if (!shortcuts.some((shortcut) => shortcut.key === key)) {
    throw new Error(`Unsupported shortcut: ${key}`);
  }
  const result = run(env.HERDR_BIN_PATH || 'herdr', ['pane', 'send-keys', pane, key], {
    env, encoding: 'utf8', timeout: 5000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr?.trim() || 'Herdr could not send the key.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    sendKey(process.env.HERDR_PANE_ID, process.argv[2]);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
