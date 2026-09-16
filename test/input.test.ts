import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type { InputEvent } from '../src/domain/actions.js';
import { createInputDecoder } from '../src/terminal/input.js';

test('a split mouse press emits one click; release, drag and scroll emit none', () => {
  // Arrange
  const chunks = ['\x1b[<0;', '12;', '4M', '\x1b[<0;12;4m', '\x1b[<32;12;4M', '\x1b[<64;12;4M'];

  // Act
  const events = decodeChunks(chunks);

  // Assert
  assert.deepEqual(events, [{ type: 'click', x: 12, y: 4 }]);
});

test('classic mouse and cursor reports decode across byte boundaries', () => {
  // Arrange
  const chunks = [Buffer.from([27, 91, 77, 32, 34]), Buffer.from([36]), '\x1b[A\x1bOB\x1b[6~'];

  // Act
  const events = decodeChunks(chunks);

  // Assert
  assert.deepEqual(events, [
    { type: 'click', x: 2, y: 4 }, { type: 'key', key: 'up' },
    { type: 'key', key: 'down' }, { type: 'key', key: 'next' },
  ]);
});

test('paste and terminal responses never become shortcuts at any read boundary', () => {
  // Arrange
  const responses = [
    { name: 'bracketed paste', bytes: '\x1b[200~123q\x1b[201~' },
    { name: 'unknown CSI', bytes: '\x1b[99;2u\x1b[12~' },
    { name: 'OSC with BEL', bytes: '\x1b]11;rgb:1234/5678/9012\x07' },
    { name: 'OSC with ST', bytes: '\x1b]52;c;123\x1b\\' },
    { name: 'DCS', bytes: '\x1bP1$r123\x1b\\' },
    { name: 'APC', bytes: '\x1b_123\x1b\\' },
    { name: 'PM', bytes: '\x1b^123\x1b\\' },
    { name: 'SOS', bytes: '\x1bX123\x1b\\' },
  ];

  // Act
  const results = responses.flatMap(({ name, bytes }) => Array.from({ length: bytes.length + 1 }, (_, split) => ({
    name, split, events: decodeChunks([bytes.slice(0, split), bytes.slice(split) + '2']),
  })));

  // Assert
  for (const { name, split, events } of results) {
    assert.deepEqual(events, [{ type: 'key', key: '2' }], `${name}, split at byte ${split}`);
  }
});

test('an overlong split CSI report stays ignored until its final byte', () => {
  // Arrange
  const chunks = ['\x1b[' + '1;'.repeat(100), '23', 'M2'];

  // Act
  const events = decodeChunks(chunks);

  // Assert
  assert.deepEqual(events, [{ type: 'key', key: '2' }]);
});

test('a standalone Escape closes only after its disambiguation delay', (t) => {
  // Arrange
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { decoder, events } = inputRecorder(t);

  // Act
  decoder.feed('\x1b');
  t.mock.timers.tick(79);
  const beforeDeadline = [...events];
  t.mock.timers.tick(1);

  // Assert
  assert.deepEqual(beforeDeadline, []);
  assert.deepEqual(events, [{ type: 'key', key: 'close' }]);
});

test('a cursor report arriving after Escape cancels the pending close', (t) => {
  // Arrange
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { decoder, events } = inputRecorder(t);

  // Act
  decoder.feed('\x1b');
  t.mock.timers.tick(40);
  decoder.feed('[A');
  t.mock.timers.tick(100);

  // Assert
  assert.deepEqual(events, [{ type: 'key', key: 'up' }]);
});

test('disposing the decoder cancels a pending Escape', (t) => {
  // Arrange
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { decoder, events } = inputRecorder(t);
  decoder.feed('\x1b');

  // Act
  decoder.dispose();
  t.mock.timers.tick(100);

  // Assert
  assert.deepEqual(events, []);
});

function decodeChunks(chunks: ReadonlyArray<Buffer | string>): ReadonlyArray<InputEvent> {
  const events: InputEvent[] = [];
  const decoder = createInputDecoder((event) => events.push(event));
  try {
    for (const chunk of chunks) decoder.feed(chunk);
    return events;
  } finally { decoder.dispose(); }
}

function inputRecorder(t: TestContext) {
  const events: InputEvent[] = [];
  const decoder = createInputDecoder((event) => events.push(event));
  t.after(decoder.dispose);
  return { decoder, events };
}
