import { spawnSync } from 'node:child_process';
import { emitKeypressEvents } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { sendKey, shortcuts } from './keyboard.mjs';

export function targetPane(env) {
  // Popups have no HERDR_PANE_ID. Their context refers to the underlying pane.
  const context = JSON.parse(env.HERDR_PLUGIN_CONTEXT_JSON || '{}');
  const pane = env.HERDR_KEYBOARD_TARGET || context.focused_pane_id || env.HERDR_PANE_ID;
  if (typeof pane !== 'string' || !pane) throw new Error('No target pane. Open Keyboard from a Herdr pane.');
  return pane;
}

export function openPicker(env = process.env, run = spawnSync) {
  const pane = targetPane(env);
  const result = run(env.HERDR_BIN_PATH || 'herdr', [
    'plugin', 'pane', 'open', '--plugin', 'herdr-keyboard', '--entrypoint', 'picker',
    '--target-pane', pane, '--env', `HERDR_KEYBOARD_TARGET=${pane}`,
  ], { env, encoding: 'utf8', timeout: 5000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr?.trim() || 'Could not open Keyboard.');
}

export function pickShortcut(input = process.stdin, output = process.stdout, env = process.env, send = sendKey) {
  const pane = targetPane(env);
  if (!input.isTTY) throw new Error('Keyboard requires an interactive terminal.');
  output.write(`\n  Mobile Keyboard  →  ${pane}\n\n`);
  shortcuts.forEach(({ label }, index) => output.write(`  ${index + 1}  ${label}\n`));
  output.write('\n  Press 1 / 2 / 3 to send once.\n  0 / q / Esc: close\n');

  return new Promise((resolve, reject) => {
    const wasRaw = Boolean(input.isRaw);
    const finish = (error) => {
      input.off('keypress', onKey);
      input.off('end', onEnd);
      input.off('error', onError);
      input.setRawMode(wasRaw);
      input.pause();
      if (error) reject(error);
      else resolve();
    };
    const onEnd = () => finish();
    const onError = (error) => finish(error);
    const onKey = (text, key) => {
      if (text === '0' || text === 'q' || key?.name === 'escape' || (key?.ctrl && ['c', 'd'].includes(key.name))) {
        finish();
        return;
      }
      if (!/^[1-3]$/.test(text || '') || key?.ctrl || key?.meta) return;
      try {
        send(pane, shortcuts[Number(text) - 1].key, env);
        finish();
      } catch (error) {
        finish(error);
      }
    };
    emitKeypressEvents(input);
    input.setRawMode(true);
    input.on('keypress', onKey);
    input.on('end', onEnd);
    input.on('error', onError);
    input.resume();
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv[2] === '--open') openPicker();
    else await pickShortcut();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
