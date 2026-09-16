import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Effect, Either } from 'effect';
import { loadConfig, validateConfig } from '../src/config.js';

test('invalid configuration returns ConfigError', async () => {
  // Arrange
  const cases = [
    { name: 'null document', value: null },
    { name: 'array document', value: [] },
    { name: 'empty shortcuts', value: { shortcuts: [] } },
    { name: 'string instead of boolean', value: { closeAfterSend: 'false' } },
    { name: 'unknown property', value: { typo: true } },
    { name: 'terminal control in label', value: { shortcuts: [{ label: '\x1b[2J', key: 'esc' }] } },
    { name: 'unsupported modifier', value: { shortcuts: [{ label: 'Bad', key: 'prefix+x' }] } },
  ];

  // Act
  const results = await Promise.all(cases.map(async ({ name, value }) => ({
    name, result: await Effect.runPromise(Effect.either(validateConfig(value))),
  })));

  // Assert
  for (const { name, result } of results) {
    assert.ok(Either.isLeft(result), name);
    assert.equal(result.left._tag, 'ConfigError', name);
  }
});

test('a missing configuration file uses the default shortcut list', async (t) => {
  // Arrange
  const { env } = configDirectory(t);

  // Act
  const config = await Effect.runPromise(loadConfig(env));

  // Assert
  assert.equal(config.closeAfterSend, true);
  assert.equal(config.shortcuts.length, 20);
  const keys = config.shortcuts.map(({ key }) => key);
  assert.deepEqual(keys.slice(0, 3), ['alt+up', 'shift+tab', 'shift+enter']);
  assert.ok(keys.every((key) => key.includes('+') && key !== 'alt+down'));
  assert.equal(new Set(keys).size, keys.length);
});

test('custom configuration replaces shortcuts and keeps the picker open', async (t) => {
  // Arrange
  const { env, path } = configDirectory(t);
  writeFileSync(path, JSON.stringify({
    closeAfterSend: false, shortcuts: [{ label: '  Custom  ', key: 'opt+left' }],
  }));

  // Act
  const config = await Effect.runPromise(loadConfig(env));

  // Assert
  assert.deepEqual(config, { closeAfterSend: false, shortcuts: [{ label: 'Custom', key: 'alt+left' }] });
});

test('malformed configuration identifies the file that could not be parsed', async (t) => {
  // Arrange
  const { env, path } = configDirectory(t);
  writeFileSync(path, '{broken');

  // Act
  const result = await Effect.runPromise(Effect.either(loadConfig(env)));

  // Assert
  assert.ok(Either.isLeft(result));
  assert.equal(result.left._tag, 'ConfigError');
  assert.ok(result.left.message.startsWith(`Invalid ${path}:`));
});

function configDirectory(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'herdr-keyboard-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return { env: { HERDR_PLUGIN_CONFIG_DIR: directory }, path: join(directory, 'keyboard.json') };
}
