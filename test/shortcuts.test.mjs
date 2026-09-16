import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeKey, validateConfig, loadConfig } from '../shortcuts.mjs';

test('aliases normalize to one logical Herdr key combination', () => {
  assert.equal(normalizeKey('Opt + Down'), 'alt+down');
  assert.equal(normalizeKey('shift + CONTROL + a'), 'ctrl+shift+a');
  assert.equal(normalizeKey('Escape'), 'esc');
  for (const key of ['ctrl+ctrl+a', 'prefix+a', 'cmd+a', 'ctrl+', 'a b', 'a\nenter', '', '\x1b']) {
    assert.throws(() => normalizeKey(key));
  }
});

test('config validates labels, options and list sizes before opening a picker', () => {
  assert.equal(validateConfig({}).shortcuts[0].key, 'alt+down');
  assert.equal(validateConfig({ closeAfterSend: false }).closeAfterSend, false);
  for (const config of [null, [], { shortcuts: [] }, { closeAfterSend: 'false' }, { typo: true },
    { shortcuts: [{ label: '\x1b[2J', key: 'esc' }] }, { shortcuts: [{ label: 'Bad', key: 'prefix+x' }] }]) {
    assert.throws(() => validateConfig(config));
  }
});

test('config lives outside the checkout; missing file defaults, malformed file fails explicitly', () => {
  const dir = mkdtempSync(join(tmpdir(), 'herdr-keyboard-'));
  const env = { HERDR_PLUGIN_CONFIG_DIR: dir };
  try {
    assert.equal(loadConfig(env).closeAfterSend, true);
    writeFileSync(join(dir, 'keyboard.json'), JSON.stringify({ shortcuts: [{ label: 'Custom', key: 'opt+left' }] }));
    assert.deepEqual(loadConfig(env).shortcuts, [{ label: 'Custom', key: 'alt+left' }]);
    writeFileSync(join(dir, 'keyboard.json'), '{broken');
    assert.throws(() => loadConfig(env), /Invalid .*keyboard.json/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
