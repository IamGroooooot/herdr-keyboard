import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cause, Effect, Exit } from 'effect';
import { HerdrError } from '../src/herdr.js';
import { launchPicker, openPicker, TestInput, waitFor } from './helpers/picker.js';

test('a numeric shortcut sends once even when the number is repeated', { timeout: 5000 }, async (t) => {
  // Arrange
  const session = await openPicker(t);

  // Act
  session.input.write('22');
  const result = await session.done;

  // Assert
  assert.ok(Exit.isSuccess(result));
  assert.deepEqual(session.sent, [['w1:p2', 'shift+tab']]);
});

test('closing the picker sends nothing', { timeout: 5000 }, async (t) => {
  // Arrange
  const session = await openPicker(t);

  // Act
  session.input.write('q');
  const result = await session.done;

  // Assert
  assert.ok(Exit.isSuccess(result));
  assert.deepEqual(session.sent, []);
});

test('a failed send displays the error without retrying or closing', { timeout: 5000 }, async (t) => {
  // Arrange
  const session = await openPicker(t, { sendResult: Effect.fail(new HerdrError({ message: 'pane closed' })) });

  // Act
  session.input.write('2');
  await waitFor(() => session.output.screen.includes('Failed: pane closed'), 'send error to appear');
  const remainedOpen = session.input.isRaw;
  session.input.write('q');
  const result = await session.done;

  // Assert
  assert.ok(remainedOpen);
  assert.ok(Exit.isSuccess(result));
  assert.deepEqual(session.sent, [['w1:p2', 'shift+tab']]);
});

test('a touch press and release send the visible shortcut once', { timeout: 5000 }, async (t) => {
  // Arrange
  const session = await openPicker(t);
  const pressAndRelease = '\x1b[<0;4;6M\x1b[<0;4;6m';

  // Act
  session.input.write(pressAndRelease);
  const result = await session.done;

  // Assert
  assert.ok(Exit.isSuccess(result));
  assert.deepEqual(session.sent, [['w1:p2', 'shift+tab']]);
});

test('Keep allows sending shortcuts from successive pages', { timeout: 5000 }, async (t) => {
  // Arrange: the 40-column, 22-row terminal shows seven shortcuts per page.
  const session = await openPicker(t);

  // Act
  session.input.write('r'); // Keep on
  session.input.write('2'); // Shift + Tab
  session.input.write('n'); // Next page
  session.input.write('1'); // Up
  session.input.write('q');
  const result = await session.done;

  // Assert
  assert.ok(Exit.isSuccess(result));
  assert.deepEqual(session.sent, [['w1:p2', 'shift+tab'], ['w1:p2', 'up']]);
});

test('shrinking the terminal disables hidden shortcuts', { timeout: 5000 }, async (t) => {
  // Arrange
  const session = await openPicker(t);

  // Act
  session.output.columns = 20;
  session.output.rows = 8;
  session.output.emit('resize');
  session.input.write('1q');
  const result = await session.done;

  // Assert
  assert.ok(Exit.isSuccess(result));
  assert.deepEqual(session.sent, []);
  assert.match(session.output.screen, /Need 25x10/);
});

test('EOF ignores pasted shortcuts and restores the original terminal mode', { timeout: 5000 }, async (t) => {
  // Arrange
  const input = new TestInput();
  input.setRawMode(true);
  const session = await openPicker(t, { input });

  // Act
  input.write('\x1b[200~123\x1b[201~');
  input.end();
  const result = await session.done;

  // Assert
  assert.ok(Exit.isSuccess(result));
  assert.deepEqual(session.sent, []);
  assert.equal(input.isRaw, true);
  assert.equal(input.listenerCount('data'), 0);
  assert.equal(session.output.listenerCount('resize'), 0);
  assert.match(session.output.screen, /\x1b\[\?1000l/);
  assert.match(session.output.screen, /\x1b\[\?1049l/);
});

test('selecting modifiers and a base key previews without sending', { timeout: 5000 }, async (t) => {
  // Arrange
  const session = await openPicker(t);

  // Act
  session.input.write('m'); // Compose
  session.input.write('acs'); // Alt, Ctrl, Shift
  session.input.write('1'); // Up
  await waitFor(() => session.output.screen.includes('ctrl+alt+shift+up'), 'combined key preview');
  const beforeSend = [...session.sent];
  session.input.write('\r');
  const result = await session.done;

  // Assert
  assert.ok(Exit.isSuccess(result));
  assert.deepEqual(beforeSend, []);
  assert.deepEqual(session.sent, [['w1:p2', 'ctrl+alt+shift+up']]);
});

test('touch-only composition sends Alt + Left only after tapping Send', { timeout: 5000 }, async (t) => {
  // Arrange
  const session = await openPicker(t);
  const tap = (x: number, y: number) => session.input.write(`\x1b[<0;${x};${y}M\x1b[<0;${x};${y}m`);

  // Act
  tap(4, 2); // Compose
  tap(10, 4); // Alt
  tap(4, 9); // Left
  await waitFor(() => session.output.screen.includes('alt+left'), 'Alt + Left preview');
  const beforeSend = [...session.sent];
  tap(4, 19); // Send
  const result = await session.done;

  // Assert
  assert.ok(Exit.isSuccess(result));
  assert.deepEqual(beforeSend, []);
  assert.deepEqual(session.sent, [['w1:p2', 'alt+left']]);
});

test('custom keys retain modifiers until toggled and m returns to shortcuts', { timeout: 5000 }, async (t) => {
  // Arrange
  const session = await openPicker(t);

  // Act
  session.input.write('m'); // Compose
  session.input.write('r'); // Keep on
  session.input.write('cs'); // Ctrl, Shift
  session.input.write('ka\r'); // Confirm the base key a
  await waitFor(() => session.output.screen.includes('Ready. Send to transmit.'), 'base-key confirmation');
  const beforeSend = [...session.sent];
  session.input.write('\r'); // Send Ctrl + Shift + A
  session.input.write('s'); // Shift off
  session.input.write('kf2\r\r'); // Confirm F2, then send Ctrl + F2
  session.input.write('c\r'); // Ctrl off, then send F2
  session.input.write('m2q'); // Back to shortcuts, send Shift + Tab, close
  const result = await session.done;

  // Assert
  assert.ok(Exit.isSuccess(result));
  assert.deepEqual(beforeSend, []);
  assert.deepEqual(session.sent.map(([, key]) => key), ['ctrl+shift+a', 'ctrl+f2', 'f2', 'shift+tab']);
});

test('empty and unsupported base keys cannot be sent', { timeout: 5000 }, async (t) => {
  for (const scenario of [
    { name: 'no base key', keys: 'm\rq' },
    { name: 'unsupported base key', keys: 'mkbroke\r\x03q' },
  ]) {
    // Arrange
    const session = await openPicker(t);

    // Act
    session.input.write(scenario.keys);
    const result = await session.done;

    // Assert
    assert.ok(Exit.isSuccess(result), scenario.name);
    assert.deepEqual(session.sent, [], scenario.name);
  }
});

test('interrupting a pending send releases terminal resources', { timeout: 5000 }, async (t) => {
  // Arrange
  const originalSignalListeners = process.listenerCount('SIGTERM');
  const session = await openPicker(t, { sendResult: Effect.never });
  session.input.write('2');
  await waitFor(() => session.sent.length === 1, 'send to start');

  // Act
  session.abort.abort();
  const result = await session.done;

  // Assert
  assert.ok(Exit.isInterrupted(result));
  assert.equal(session.input.isRaw, false);
  assert.equal(session.input.listenerCount('data'), 0);
  assert.equal(session.output.listenerCount('resize'), 0);
  assert.equal(process.listenerCount('SIGTERM'), originalSignalListeners);
  assert.match(session.output.screen, /\x1b\[\?1000l/);
});

test('partial startup failure restores raw mode and removes listeners', { timeout: 5000 }, async (t) => {
  // Arrange
  const originalSignalListeners = process.listenerCount('SIGTERM');
  const input = new TestInput();
  input.setRawMode = (value: boolean) => {
    input.isRaw = value;
    if (value) throw new Error('raw mode failed');
    return input;
  };

  // Act
  const session = launchPicker(t, { input });
  const result = await session.done;

  // Assert
  assert.ok(Exit.isFailure(result));
  assert.match(Cause.pretty(result.cause), /raw mode failed/);
  assert.equal(input.isRaw, false);
  assert.equal(input.listenerCount('data'), 0);
  assert.equal(process.listenerCount('SIGTERM'), originalSignalListeners);
});

test('a terminal read error fails the picker after restoring raw mode', { timeout: 5000 }, async (t) => {
  // Arrange
  const session = await openPicker(t);

  // Act
  session.input.emit('error', new Error('lost terminal'));
  const result = await session.done;

  // Assert
  assert.ok(Exit.isFailure(result));
  assert.match(Cause.pretty(result.cause), /lost terminal/);
  assert.equal(session.input.isRaw, false);
  assert.equal(session.input.listenerCount('data'), 0);
});
