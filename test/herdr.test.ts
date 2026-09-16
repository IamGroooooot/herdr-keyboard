import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Effect, Either } from 'effect';
import { Herdr, executeCommand, herdrLayer, targetPane } from '../src/herdr.js';

test('the target is captured from plugin context and passed to the popup', async () => {
  const env = { HERDR_KEYBOARD_TARGET: 'w1:p2', HERDR_PLUGIN_CONTEXT_JSON: '{"focused_pane_id":"w1:p3"}' };
  const pane = await Effect.runPromise(targetPane(env));
  assert.equal(pane, 'w1:p2');
  assert.equal(await Effect.runPromise(targetPane({ HERDR_PLUGIN_CONTEXT_JSON: '{"focused_pane_id":"w1:p3"}' })), 'w1:p3');
  await Effect.runPromise(Effect.gen(function* () {
    const herdr = yield* Herdr;
    yield* herdr.openPicker(pane);
  }).pipe(Effect.provide(herdrLayer(env, (bin, args) => Effect.sync(() => {
    assert.equal(bin, 'herdr');
    assert.deepEqual(args.slice(-4), ['--target-pane', 'w1:p2', '--env', 'HERDR_KEYBOARD_TARGET=w1:p2']);
  })))));
  for (const invalid of [{}, { HERDR_PLUGIN_CONTEXT_JSON: '{broken' }, { HERDR_PLUGIN_CONTEXT_JSON: 'null' }]) {
    const result = await Effect.runPromise(Effect.either(targetPane(invalid)));
    assert.ok(Either.isLeft(result));
    assert.equal(result.left._tag, 'TargetError');
  }
});

test('the real process adapter reports success, stderr failure and spawn failure', async () => {
  await Effect.runPromise(executeCommand(process.execPath, ['-e', 'process.exit(0)'], process.env));
  await assert.rejects(Effect.runPromise(executeCommand(process.execPath,
    ['-e', 'process.stderr.write("pane gone");process.exit(1)'], process.env)), /pane gone/);
  const result = await Effect.runPromise(Effect.either(executeCommand('/does-not-exist/herdr', [], {})));
  assert.ok(Either.isLeft(result));
  assert.equal(result.left._tag, 'HerdrError');
});
