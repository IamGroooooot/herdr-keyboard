import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Effect, Either } from 'effect';
import { Herdr } from '../src/herdr.js';
import { executeCommand, herdrLayer } from '../src/herdr-client.js';
import { resolveTargetPane } from '../src/target-pane.js';
import type { Environment } from '../src/environment.js';

test('popup commands select the platform entrypoint and preserve the keyboard destination', async () => {
  // Arrange
  const environment = {
    HERDR_BIN_PATH: '/custom/herdr', HERDR_KEYBOARD_TARGET: 'w1:p2',
    HERDR_PLUGIN_CONTEXT_JSON: '{"focused_pane_id":"w1:p3"}',
  };
  const cases = [
    { platform: 'linux', entrypoint: 'picker' },
    { platform: 'darwin', entrypoint: 'picker' },
    { platform: 'win32', entrypoint: 'picker-windows' },
  ] as const;

  // Act
  const results = await Promise.all(cases.map(async ({ platform, entrypoint }) => {
    const commands: Array<{ binary: string; args: ReadonlyArray<string> }> = [];
    const layer = herdrLayer({ environment, platform,
      execute: (binary, args) => Effect.sync(() => { commands.push({ binary, args }); }),
    });
    await Effect.runPromise(Effect.gen(function* () {
      const pane = yield* resolveTargetPane(environment);
      const herdr = yield* Herdr;
      yield* herdr.openPicker(pane);
    }).pipe(Effect.provide(layer)));
    return { platform, entrypoint, commands };
  }));

  // Assert
  for (const { platform, entrypoint, commands } of results) {
    assert.deepEqual(commands, [{ binary: '/custom/herdr', args: [
      'plugin', 'pane', 'open', '--plugin', 'herdr-keyboard', '--entrypoint', entrypoint,
      '--env', 'HERDR_KEYBOARD_TARGET=w1:p2',
    ] }], platform);
  }
});

test('target resolution falls back from focused pane to the current pane', async () => {
  // Arrange
  const environments: ReadonlyArray<Environment> = [
    { HERDR_PLUGIN_CONTEXT_JSON: '{"focused_pane_id":"w1:p3"}', HERDR_PANE_ID: 'w1:p4' },
    { HERDR_PANE_ID: 'w1:p4' },
  ];

  // Act
  const panes = await Promise.all(environments.map((env) => Effect.runPromise(resolveTargetPane(env))));

  // Assert
  assert.deepEqual(panes, ['w1:p3', 'w1:p4']);
});

test('missing targets and invalid context return TargetError', async () => {
  // Arrange
  const environments: ReadonlyArray<Environment> = [
    {}, { HERDR_PLUGIN_CONTEXT_JSON: '{broken' }, { HERDR_PLUGIN_CONTEXT_JSON: 'null' },
  ];

  // Act
  const results = await Promise.all(environments.map((env) => Effect.runPromise(Effect.either(resolveTargetPane(env)))));

  // Assert
  for (const [index, result] of results.entries()) {
    assert.ok(Either.isLeft(result), `invalid context ${index}`);
    assert.equal(result.left._tag, 'TargetError');
  }
});

test('the process adapter preserves failure causes and distinguishes launch, timeout and command errors', async () => {
  // Arrange
  const cases = [
    { name: 'success', binary: process.execPath, args: ['-e', 'process.exit(0)'], expected: undefined, reason: undefined },
    { name: 'stderr failure', binary: process.execPath,
      args: ['-e', 'process.stderr.write("pane gone");process.exit(1)'], expected: /pane gone/, reason: 'failed' },
    { name: 'missing executable', binary: '/does-not-exist/herdr', args: [], expected: /ENOENT/, reason: 'unavailable' },
    { name: 'timeout', binary: process.execPath, args: ['-e', 'setTimeout(() => {}, 30000)'],
      expected: /timed out/, reason: 'timeout' },
    { name: 'output limit', binary: process.execPath, args: ['-e', 'process.stdout.write("x".repeat(100000))'],
      expected: /maxBuffer/, reason: 'failed' },
  ];

  // Act
  const results = await Promise.all(cases.map(async (scenario) => ({ ...scenario,
    result: await Effect.runPromise(Effect.either(executeCommand(scenario.binary, scenario.args, process.env))),
  })));

  // Assert
  for (const { name, expected, reason, result } of results) {
    if (expected === undefined) {
      assert.ok(Either.isRight(result), name);
    } else {
      assert.ok(Either.isLeft(result), name);
      assert.equal(result.left._tag, 'HerdrError', name);
      assert.equal(result.left.reason, reason, name);
      assert.ok(result.left.cause instanceof Error, name);
      assert.match(result.left.message, expected, name);
    }
  }
});
