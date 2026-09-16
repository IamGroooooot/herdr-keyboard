import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInputDecoder } from '../input.mjs';

test('split SGR reports emit one click; releases, drags and scroll never pick a key', () => {
  const events = [];
  const decoder = createInputDecoder((event) => events.push(event));
  for (const chunk of ['\x1b[<0;', '12;', '4M', '\x1b[<0;12;4m', '\x1b[<32;12;4M', '\x1b[<64;12;4M']) decoder.feed(chunk);
  assert.deepEqual(events, [{ type: 'click', x: 12, y: 4 }]);
  decoder.dispose();
});

test('classic mouse reporting and cursor keys are decoded as whole events', () => {
  const events = [];
  const decoder = createInputDecoder((event) => events.push(event));
  decoder.feed(Buffer.from([27, 91, 77, 32, 34]));
  decoder.feed(Buffer.from([36]));
  decoder.feed('\x1b[A\x1bOB\x1b[6~');
  assert.deepEqual(events, [{ type: 'click', x: 2, y: 4 }, { type: 'key', key: 'up' },
    { type: 'key', key: 'down' }, { type: 'key', key: 'next' }]);
  decoder.dispose();
});

test('paste and unknown CSI sequences cannot leak digits as shortcut input', () => {
  const events = [];
  const decoder = createInputDecoder((event) => events.push(event));
  decoder.feed('\x1b[200~123q\x1b[20');
  decoder.feed('1~\x1b[99;2u\x1b[12~');
  decoder.feed('2');
  assert.deepEqual(events, [{ type: 'key', key: '2' }]);
  decoder.dispose();
});

test('Escape closes on its own; disposing cancels the delayed Escape', async () => {
  const events = [];
  const decoder = createInputDecoder((event) => events.push(event));
  decoder.feed('\x1b');
  await new Promise((resolve) => setTimeout(resolve, 110));
  assert.deepEqual(events, [{ type: 'key', key: 'close' }]);
  decoder.feed('\x1b');
  decoder.dispose();
  await new Promise((resolve) => setTimeout(resolve, 110));
  assert.equal(events.length, 1);
});
