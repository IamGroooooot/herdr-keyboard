import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { targetPane, openPicker, pickShortcut } from '../picker.mjs';
import { shortcuts } from '../shortcuts.mjs';
import { layout } from '../view.mjs';

test('popup uses the original target, never a newly focused pane', () => {
  assert.equal(targetPane({ HERDR_KEYBOARD_TARGET: 'w1:p2', HERDR_PLUGIN_CONTEXT_JSON: '{"focused_pane_id":"w1:p3"}' }), 'w1:p2');
  assert.equal(targetPane({ HERDR_PLUGIN_CONTEXT_JSON: '{"focused_pane_id":"w1:p3"}' }), 'w1:p3');
  assert.throws(() => targetPane({}), /No target/);
});

test('opening the picker pins the action target in its environment', () => {
  openPicker({ HERDR_PANE_ID: 'w1:p2' }, (bin, args) => {
    assert.equal(bin, 'herdr');
    assert.deepEqual(args.slice(-4), ['--target-pane', 'w1:p2', '--env', 'HERDR_KEYBOARD_TARGET=w1:p2']);
    return { status: 0 };
  });
});

function terminal() {
  const input = new PassThrough();
  input.isTTY = true;
  input.setRawMode = (value) => { input.isRaw = value; };
  return input;
}

test('one number sends once without Enter and restores terminal mode', async () => {
  for (const [number, expected] of [['1', 'alt+down'], ['2', 'shift+tab'], ['3', 'shift+up']]) {
    const input = terminal();
    const sent = [];
    const done = pickShortcut(input, new PassThrough(), { HERDR_KEYBOARD_TARGET: 'w1:p2' }, (...args) => sent.push(args.slice(0, 2)));
    input.write(number + number);
    await done;
    assert.deepEqual(sent, [['w1:p2', expected]]);
    assert.equal(input.isRaw, false);
  }
});

test('cancel sends nothing; failures stay visible until the user closes', async () => {
  const input = terminal();
  const done = pickShortcut(input, new PassThrough(), { HERDR_PANE_ID: 'w1:p2' }, () => assert.fail('must not send'));
  input.write('x0');
  await done;
  assert.equal(input.isRaw, false);
  const output = new PassThrough();
  let screen = '';
  output.on('data', (data) => { screen += data; });
  const failed = pickShortcut(input, output, { HERDR_PANE_ID: 'w1:p2' }, () => { throw new Error('pane closed'); });
  input.write('2');
  assert.match(screen, /Failed: pane closed/);
  input.write('q');
  await failed;
  assert.equal(input.isRaw, false);
});

test('touch selects the visible key once even when a release follows', async () => {
  const input = terminal();
  const output = new PassThrough();
  output.columns = 40;
  output.rows = 22;
  const sent = [];
  const done = pickShortcut(input, output, { HERDR_PANE_ID: 'w1:p2' }, (pane, key) => sent.push([pane, key]));
  input.write('\x1b[<0;4;6M\x1b[<0;4;6m');
  await done;
  assert.deepEqual(sent, [['w1:p2', 'shift+tab']]);
});

test('keep-open, pagination and resize send only keys from the visible page', async () => {
  const input = terminal();
  const output = new PassThrough();
  output.columns = 40;
  output.rows = 22;
  const sent = [];
  const done = pickShortcut(input, output, { HERDR_PANE_ID: 'w1:p2' }, (_, key) => sent.push(key));
  input.write('r2n1');
  const firstPageSize = layout(40, 22, shortcuts.length).pageSize;
  assert.deepEqual(sent, ['shift+tab', shortcuts[firstPageSize].key]);
  output.columns = 20;
  output.rows = 8;
  output.emit('resize');
  input.write('1');
  assert.equal(sent.length, 2, 'undersized screen must not send an invisible choice');
  input.write('0');
  await done;
  assert.equal(output.listenerCount('resize'), 0);
  assert.equal(input.isRaw, false);
});

test('pasted digits are ignored; EOF restores mouse and terminal modes', async () => {
  const input = terminal();
  const output = new PassThrough();
  let screen = '';
  output.on('data', (data) => { screen += data; });
  const done = pickShortcut(input, output, { HERDR_PANE_ID: 'w1:p2' }, () => assert.fail('must not send'));
  input.write('\x1b[200~123\x1b[201~');
  input.end();
  await done;
  assert.match(screen, /\x1b\[\?1000l/);
  assert.match(screen, /\x1b\[\?1049l/);
  assert.equal(input.isRaw, false);
});
