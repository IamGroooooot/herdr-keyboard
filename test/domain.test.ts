import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Effect, Either } from 'effect';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeKey, parseBaseKey } from '../src/domain/keys.js';
import { validateConfig, loadConfig } from '../src/config.js';
import { keyAction } from '../src/domain/actions.js';

test('aliases normalize; invalid and multi-key inputs have typed failures', () => {
  assert.equal(Either.getOrThrow(normalizeKey('Opt + Down')), 'alt+down');
  assert.equal(Either.getOrThrow(normalizeKey('shift + CONTROL + a')), 'ctrl+shift+a');
  assert.equal(Either.getOrThrow(normalizeKey('Escape')), 'esc');
  assert.equal(Either.getOrThrow(normalizeKey('SHIFT+Opt+CONTROL+F12')), 'ctrl+alt+shift+f12');
  for (const value of ['ctrl+ctrl+a', 'prefix+a', 'cmd+a', 'ctrl+', 'a b', 'a\nenter', '', '\x1b', 1, null]) {
    const result = normalizeKey(value);
    assert.ok(Either.isLeft(result));
    assert.equal(result.left._tag, 'InvalidKey');
  }
  assert.ok(Either.isLeft(parseBaseKey('ctrl+a')));
  for (const value of ['f0', 'f13', 'ctrl+constructor', '__proto__', 'toString']) {
    assert.ok(Either.isLeft(normalizeKey(value)));
    assert.equal(keyAction(value, true), undefined);
    assert.equal(keyAction(value, false), undefined);
  }
});

test('Schema rejects invalid config before the terminal starts', async () => {
  assert.equal((await Effect.runPromise(validateConfig({}))).shortcuts[0]?.key, 'alt+down');
  assert.equal((await Effect.runPromise(validateConfig({ closeAfterSend: false }))).closeAfterSend, false);
  for (const config of [null, [], { shortcuts: [] }, { closeAfterSend: 'false' }, { typo: true },
    { shortcuts: [{ label: '\x1b[2J', key: 'esc' }] }, { shortcuts: [{ label: 'Bad', key: 'prefix+x' }] }]) {
    const result = await Effect.runPromise(Effect.either(validateConfig(config)));
    assert.ok(Either.isLeft(result));
    assert.equal(result.left._tag, 'ConfigError');
  }
});

test('missing configuration defaults; malformed configuration fails with its path', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'herdr-keyboard-'));
  const env = { HERDR_PLUGIN_CONFIG_DIR: dir };
  try {
    assert.equal((await Effect.runPromise(loadConfig(env))).closeAfterSend, true);
    writeFileSync(join(dir, 'keyboard.json'), JSON.stringify({ shortcuts: [{ label: 'Custom', key: 'opt+left' }] }));
    assert.deepEqual((await Effect.runPromise(loadConfig(env))).shortcuts, [{ label: 'Custom', key: 'alt+left' }]);
    writeFileSync(join(dir, 'keyboard.json'), '{broken');
    await assert.rejects(Effect.runPromise(loadConfig(env)), /Invalid .*keyboard.json/);
  } finally { rmSync(dir, { recursive: true }); }
});
