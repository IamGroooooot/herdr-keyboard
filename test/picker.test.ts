import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { Effect, Layer } from 'effect';
import { pickShortcut } from '../src/picker.js';
import { Herdr, HerdrError } from '../src/herdr.js';
import { shortcuts } from '../src/config.js';
import { layout } from '../src/terminal/layout.js';

class Input extends PassThrough {
  isTTY = true;
  isRaw = false;
  setRawMode(value: boolean) { this.isRaw = value; return this; }
}
class Output extends PassThrough {
  columns = 40;
  rows = 22;
  screen = '';
  constructor() { super(); this.on('data', (chunk: Buffer) => { this.screen += chunk.toString(); }); }
}

async function start(sendError?: string, waitForSend = false) {
  const input = new Input();
  const output = new Output();
  const sent: Array<readonly [string, string]> = [];
  const abort = new AbortController();
  const done = Effect.runPromise(pickShortcut(input, output, { HERDR_PANE_ID: 'w1:p2' }).pipe(
    Effect.provide(Layer.succeed(Herdr, {
      openPicker: () => Effect.void,
      sendKey: (pane, key) => Effect.suspend(() => {
        sent.push([pane, key]);
        return sendError ? Effect.fail(new HerdrError({ message: sendError })) : waitForSend ? Effect.never : Effect.void;
      }),
    })),
  ), { signal: abort.signal });
  await until(() => output.screen.includes('Keyboard >'));
  return { input, output, sent, done, abort };
}

async function until(condition: () => boolean) {
  const deadline = Date.now() + 2000;
  while (!condition()) {
    assert.ok(Date.now() < deadline, 'timed out waiting for picker');
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

test('one number sends once, with no extra Enter, and restores terminal mode', async () => {
  for (const [number, key] of [['1', 'alt+down'], ['2', 'shift+tab'], ['3', 'shift+up']] satisfies Array<[string, string]>) {
    const session = await start();
    session.input.write(number + number);
    await session.done;
    assert.deepEqual(session.sent, [['w1:p2', key]]);
    assert.equal(session.input.isRaw, false);
    assert.equal(session.input.listenerCount('data'), 0);
  }
});

test('cancel sends nothing; failures stay visible until close', async () => {
  const cancelled = await start();
  cancelled.input.write('x0');
  await cancelled.done;
  assert.equal(cancelled.sent.length, 0);
  const failed = await start('pane closed');
  failed.input.write('2');
  await until(() => failed.output.screen.includes('Failed: pane closed'));
  failed.input.write('q');
  await failed.done;
  assert.equal(failed.sent.length, 1);
  assert.equal(failed.input.isRaw, false);
});

test('touch selects the visible key once even when a release follows', async () => {
  const session = await start();
  session.input.write('\x1b[<0;4;6M\x1b[<0;4;6m');
  await session.done;
  assert.deepEqual(session.sent, [['w1:p2', 'shift+tab']]);
});

test('keep-open, pagination and resize only send visible choices', async () => {
  const session = await start();
  session.input.write('r2n1');
  await until(() => session.sent.length === 2);
  const pageSize = layout(40, 22, shortcuts.length).pageSize;
  assert.deepEqual(session.sent.map(([, key]) => key), ['shift+tab', shortcuts[pageSize]?.key]);
  session.output.columns = 20; session.output.rows = 8;
  session.output.emit('resize');
  session.input.write('10');
  await session.done;
  assert.equal(session.sent.length, 2);
  assert.equal(session.output.listenerCount('resize'), 0);
});

test('pasted digits are ignored and EOF restores mouse and screen modes', async () => {
  const session = await start();
  session.input.write('\x1b[200~123\x1b[201~');
  session.input.end();
  await session.done;
  assert.equal(session.sent.length, 0);
  assert.match(session.output.screen, /\x1b\[\?1000l/);
  assert.match(session.output.screen, /\x1b\[\?1049l/);
  assert.equal(session.input.isRaw, false);
});

test('composer previews multiple modifiers and sends only on Send', async () => {
  const session = await start();
  session.input.write('macs1');
  await until(() => session.output.screen.includes('ctrl+alt+shift+up'));
  assert.equal(session.sent.length, 0);
  session.input.write('\r');
  await session.done;
  assert.deepEqual(session.sent, [['w1:p2', 'ctrl+alt+shift+up']]);
});

test('touch-only composition selects Alt and Left before sending', async () => {
  const session = await start();
  const tap = (x: number, y: number) => session.input.write(`\x1b[<0;${x};${y}M\x1b[<0;${x};${y}m`);
  tap(4, 2); tap(10, 4); tap(4, 9);
  await until(() => session.output.screen.includes('alt+left'));
  assert.equal(session.sent.length, 0);
  tap(4, 19);
  await session.done;
  assert.deepEqual(session.sent, [['w1:p2', 'alt+left']]);
});

test('custom keys, c modifier toggling, m mode switch and repeated sends', async () => {
  const session = await start();
  session.input.write('mrcska\r');
  await until(() => session.output.screen.includes('Ready. Send to transmit.'));
  assert.equal(session.sent.length, 0);
  session.input.write('\rskf2\r\rc\rm20');
  await session.done;
  assert.deepEqual(session.sent.map(([, key]) => key), ['ctrl+shift+a', 'ctrl+f2', 'f2', 'shift+tab']);
});

test('empty composition and invalid custom keys never send', async () => {
  const session = await start();
  session.input.write('m\rkbroke\r\x030');
  await session.done;
  assert.equal(session.sent.length, 0);
});

test('interrupting an in-flight send releases terminal resources', async () => {
  const before = process.listenerCount('SIGTERM');
  const session = await start(undefined, true);
  session.input.write('2');
  await until(() => session.sent.length === 1);
  session.abort.abort();
  await assert.rejects(session.done);
  assert.equal(session.input.isRaw, false);
  assert.equal(session.input.listenerCount('data'), 0);
  assert.equal(session.output.listenerCount('resize'), 0);
  assert.equal(process.listenerCount('SIGTERM'), before);
  assert.match(session.output.screen, /\x1b\[\?1000l/);
});

test('partial startup failure also restores raw mode and removes listeners', async () => {
  const input = new Input();
  const output = new Output();
  const before = process.listenerCount('SIGTERM');
  input.setRawMode = (value: boolean) => {
    input.isRaw = value;
    if (value) throw new Error('raw mode failed');
    return input;
  };
  await assert.rejects(Effect.runPromise(pickShortcut(input, output, { HERDR_PANE_ID: 'w1:p2' }).pipe(
    Effect.provide(Layer.succeed(Herdr, { openPicker: () => Effect.void, sendKey: () => Effect.void })),
  )), /raw mode failed/);
  assert.equal(input.isRaw, false);
  assert.equal(input.listenerCount('data'), 0);
  assert.equal(process.listenerCount('SIGTERM'), before);
});

test('input errors fail explicitly after restoring terminal state', async () => {
  const session = await start();
  session.input.emit('error', new Error('lost terminal'));
  await assert.rejects(session.done, /lost terminal/);
  assert.equal(session.input.isRaw, false);
  assert.equal(session.input.listenerCount('data'), 0);
});
