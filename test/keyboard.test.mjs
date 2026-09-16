import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendKey, shortcuts } from '../keyboard.mjs';

test('each shortcut sends one logical key to the explicit target', () => {
  for (const { key } of shortcuts) {
    let calls = 0;
    sendKey('w7:p9', key, { HERDR_BIN_PATH: '/custom/herdr' }, (bin, args) => {
      calls++;
      assert.equal(bin, '/custom/herdr');
      assert.deepEqual(args, ['pane', 'send-keys', 'w7:p9', key]);
      return { status: 0 };
    });
    assert.equal(calls, 1);
  }
});

test('missing target or unknown shortcut never invokes Herdr', () => {
  const run = () => assert.fail('must not send input');
  assert.throws(() => sendKey('', 'shift+tab', {}, run), /No target pane/);
  assert.throws(() => sendKey('w7:p9', 'enter', {}, run), /Unsupported/);
});

test('send failures surface without retrying the key', () => {
  assert.throws(() => sendKey('w7:p9', 'shift+tab', {}, () => ({ status: 1, stderr: 'pane closed' })), /pane closed/);
  assert.throws(() => sendKey('w7:p9', 'shift+tab', {}, () => ({ error: new Error('timeout') })), /timeout/);
});
