import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Effect, Either } from 'effect';
import { Herdr, executeCommand, herdrLayer, targetPane } from '../src/herdr.js';
import type { Environment } from '../src/config.js';

test('opening the picker preserves an explicit target even when focus has moved', async () => {
  // Arrange
  const env = { HERDR_KEYBOARD_TARGET: 'w1:p2', HERDR_PLUGIN_CONTEXT_JSON: '{"focused_pane_id":"w1:p3"}' };
  const commands: Array<{ binary: string; args: ReadonlyArray<string> }> = [];
  const layer = herdrLayer(env, (binary, args) => Effect.sync(() => { commands.push({ binary, args }); }));

  // Act
  await Effect.runPromise(Effect.gen(function* () {
    const pane = yield* targetPane(env);
    const herdr = yield* Herdr;
    yield* herdr.openPicker(pane);
  }).pipe(Effect.provide(layer)));

  // Assert
  assert.deepEqual(commands, [{ binary: 'herdr', args: [
    'plugin', 'pane', 'open', '--plugin', 'herdr-keyboard', '--entrypoint', 'picker',
    '--target-pane', 'w1:p2', '--env', 'HERDR_KEYBOARD_TARGET=w1:p2',
  ] }]);
});

test('target resolution falls back from focused pane to the current pane', async () => {
  // Arrange
  const environments: ReadonlyArray<Environment> = [
    { HERDR_PLUGIN_CONTEXT_JSON: '{"focused_pane_id":"w1:p3"}', HERDR_PANE_ID: 'w1:p4' },
    { HERDR_PANE_ID: 'w1:p4' },
  ];

  // Act
  const panes = await Promise.all(environments.map((env) => Effect.runPromise(targetPane(env))));

  // Assert
  assert.deepEqual(panes, ['w1:p3', 'w1:p4']);
});

test('missing targets and invalid context return TargetError', async () => {
  // Arrange
  const environments: ReadonlyArray<Environment> = [
    {}, { HERDR_PLUGIN_CONTEXT_JSON: '{broken' }, { HERDR_PLUGIN_CONTEXT_JSON: 'null' },
  ];

  // Act
  const results = await Promise.all(environments.map((env) => Effect.runPromise(Effect.either(targetPane(env)))));

  // Assert
  for (const [index, result] of results.entries()) {
    assert.ok(Either.isLeft(result), `invalid context ${index}`);
    assert.equal(result.left._tag, 'TargetError');
  }
});

test('the process adapter distinguishes success, command failure and missing executable', async () => {
  // Arrange
  const cases = [
    { name: 'success', binary: process.execPath, args: ['-e', 'process.exit(0)'], expected: undefined },
    { name: 'stderr failure', binary: process.execPath,
      args: ['-e', 'process.stderr.write("pane gone");process.exit(1)'], expected: /pane gone/ },
    { name: 'missing executable', binary: '/does-not-exist/herdr', args: [], expected: /ENOENT/ },
  ];

  // Act
  const results = await Promise.all(cases.map(async (scenario) => ({ ...scenario,
    result: await Effect.runPromise(Effect.either(executeCommand(scenario.binary, scenario.args, process.env))),
  })));

  // Assert
  for (const { name, expected, result } of results) {
    if (expected === undefined) {
      assert.ok(Either.isRight(result), name);
    } else {
      assert.ok(Either.isLeft(result), name);
      assert.equal(result.left._tag, 'HerdrError', name);
      assert.match(result.left.message, expected, name);
    }
  }
});
