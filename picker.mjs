import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { sendKey } from './keyboard.mjs';
import { loadConfig } from './shortcuts.mjs';
import { createInputDecoder } from './input.mjs';
import { layout, hitTest, render } from './view.mjs';
import { baseKeys, composedKey, setBase } from './composer.mjs';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv[2] === '--open') openPicker();
    else await pickShortcut();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
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
  const config = loadConfig(env);
  let entries = config.shortcuts;
  let composing = false;
  const composer = { ctrl: false, alt: false, shift: false, base: null, typing: null };
  let closeAfterSend = config.closeAfterSend;
  let page = 0;
  let selected = 0;
  let status = '';
  let view;

  return new Promise((resolve) => {
    const wasRaw = Boolean(input.isRaw);
    let finished = false;
    const decoder = createInputDecoder(handleInput);
    start();

    function start() {
      input.setRawMode(true);
      output.write('\x1b[?1049h\x1b[?25l\x1b[?1000h\x1b[?1006h\x1b[?2004h');
      draw();
      input.on('data', decoder.feed);
      input.on('end', finish);
      input.on('error', onError);
      output.on('resize', draw);
      process.on('SIGTERM', finish);
      process.on('SIGHUP', finish);
      process.on('SIGINT', finish);
      input.resume();
    }

    function handleInput(event) {
      if (finished) return;
      if (composer.typing !== null) {
        handleTypedKey(event);
        return;
      }
      if (event.type === 'click') { act(hitTest(view, event.x, event.y)); return; }
      const key = event.key;
      if (composing && ['a', 's', 't', 'k'].includes(key)) {
        act({ a: 'alt', s: 'shift', t: 'ctrl', k: 'type-key' }[key]);
        return;
      }
      const action = /^[1-9]$/.test(key) ? Number(key) - 1 :
        ({ q: 'close', '0': 'close', r: 'repeat', p: 'previous', n: 'next', c: 'compose' }[key] || key);
      act(action);
    }

    function handleTypedKey(event) {
      const key = event.type === 'key' ? event.key : hitTest(view, event.x, event.y);
      if (key === 'close') { composer.typing = null; status = ''; }
      else if (key === 'backspace') composer.typing = composer.typing.slice(0, -1);
      else if (key === 'enter' || key === 'send') {
        try {
          setBase(composer, composer.typing);
          composer.typing = null;
          status = 'Ready. Send to transmit.';
        } catch (error) { status = error.message; }
      } else if (event.type === 'key' && /^[a-zA-Z0-9]$/.test(key) && composer.typing.length < 16) {
        composer.typing += key;
      }
      draw();
    }

    function act(action) {
      if (action === 'close') { finish(); return; }
      if (action === 'compose') {
        toggleComposer();
        return;
      }
      if (view.compact) return;
      if (typeof action === 'number') { choose(action); return; }
      if (composing) {
        updateComposer(action);
        if (action === 'send' || action === 'enter') {
          const key = composedKey(composer);
          if (key) { transmit(key); return; }
          status = 'Choose a key first.';
        }
      }
      if (action === 'repeat') closeAfterSend = !closeAfterSend;
      if (action === 'next' || action === 'previous') {
        page = (page + (action === 'next' ? 1 : -1) + view.pages) % view.pages;
        selected = 0;
      }
      if (!composing) {
        if (action === 'up' || action === 'left') selected = Math.max(0, selected - 1);
        if (action === 'down' || action === 'right') selected++;
        if (action === 'enter') { choose(selected); return; }
      }
      draw();
    }

    function toggleComposer() {
      composing = !composing;
      entries = composing ? baseKeys : config.shortcuts;
      composer.typing = null;
      page = 0;
      selected = 0;
      status = '';
      draw();
    }

    function updateComposer(action) {
      if (['ctrl', 'alt', 'shift'].includes(action)) {
        composer[action] = !composer[action];
        status = '';
      }
      if (action === 'type-key') {
        composer.typing = '';
        status = 'Type key name. Enter: set';
      }
      if (['up', 'down', 'left', 'right'].includes(action)) {
        composer.base = action;
        status = '';
      }
    }

    function choose(index) {
      const entry = entries[page * view.pageSize + index];
      if (!entry || index >= view.pageSize) return;
      selected = index;
      if (composing) {
        composer.base = entry.key;
        status = '';
        draw();
      } else transmit(entry.key, entry.label);
    }

    function transmit(key, label = key) {
      try {
        send(pane, key, env);
        if (closeAfterSend) { finish(); return; }
        status = `Sent: ${label}`;
      } catch (error) {
        // Keep the message visible; never retry a possibly delivered key automatically.
        status = `Failed: ${error.message}`;
      }
      draw();
    }

    function draw() {
      view = layout(output.columns || 40, output.rows || 22, entries.length, page, composing);
      page = view.page;
      selected = Math.min(selected, Math.max(0, entries.length - page * view.pageSize - 1), Math.max(0, view.pageSize - 1));
      output.write(render(view, entries, pane, selected, closeAfterSend, status,
        composing ? { ...composer, preview: composedKey(composer) } : null));
    }

    function onError() { finish(); }

    function finish() {
      if (finished) return;
      finished = true;
      decoder.dispose();
      input.off('data', decoder.feed);
      input.off('end', finish);
      input.off('error', onError);
      output.off('resize', draw);
      process.off('SIGTERM', finish);
      process.off('SIGHUP', finish);
      process.off('SIGINT', finish);
      input.setRawMode(wasRaw);
      input.pause();
      output.write('\x1b[?1000l\x1b[?1006l\x1b[?2004l\x1b[0m\x1b[?25h\x1b[?1049l');
      resolve();
    }
  });
}

export function targetPane(env) {
  // Popups have no HERDR_PANE_ID. Their context refers to the underlying pane.
  const context = JSON.parse(env.HERDR_PLUGIN_CONTEXT_JSON || '{}');
  const pane = env.HERDR_KEYBOARD_TARGET || context.focused_pane_id || env.HERDR_PANE_ID;
  if (typeof pane !== 'string' || !pane) throw new Error('No target pane. Open Keyboard from a Herdr pane.');
  return pane;
}
