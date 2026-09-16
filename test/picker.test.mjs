import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { targetPane, openPicker, pickShortcut } from '../picker.mjs';

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

test('cancel sends nothing; failures still restore terminal mode', async () => {
  const input = terminal();
  const done = pickShortcut(input, new PassThrough(), { HERDR_PANE_ID: 'w1:p2' }, () => assert.fail('must not send'));
  input.write('x0');
  await done;
  assert.equal(input.isRaw, false);
  const failed = pickShortcut(input, new PassThrough(), { HERDR_PANE_ID: 'w1:p2' }, () => { throw new Error('pane closed'); });
  input.write('2');
  await assert.rejects(failed, /pane closed/);
  assert.equal(input.isRaw, false);
});
