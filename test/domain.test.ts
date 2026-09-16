import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Either } from 'effect';
import { normalizeKey, parseBaseKey } from '../src/domain/keys.js';
import { keyAction } from '../src/domain/actions.js';

test('key aliases and modifier order normalize to canonical combinations', () => {
  // Arrange
  const cases = [
    { input: 'Opt + Down', expected: 'alt+down' },
    { input: 'shift + CONTROL + a', expected: 'ctrl+shift+a' },
    { input: 'Escape', expected: 'esc' },
    { input: 'SHIFT+Opt+CONTROL+F12', expected: 'ctrl+alt+shift+f12' },
  ];

  // Act
  const results = cases.map(({ input }) => Either.getOrThrow(normalizeKey(input)));

  // Assert
  assert.deepEqual(results, cases.map(({ expected }) => expected));
});

test('unsupported combinations return InvalidKey', () => {
  // Arrange
  const inputs = ['ctrl+ctrl+a', 'prefix+a', 'cmd+a', 'ctrl+', 'a b', 'a\nenter',
    '', '\x1b', 1, null, 'f0', 'f13', 'ctrl+constructor'];

  // Act
  const results = inputs.map((input) => ({ input, result: normalizeKey(input) }));

  // Assert
  for (const { input, result } of results) {
    assert.ok(Either.isLeft(result), `accepted invalid input: ${JSON.stringify(input)}`);
    assert.equal(result.left._tag, 'InvalidKey');
  }
});

test('base-key entry accepts one key and rejects a combination', () => {
  // Arrange
  const singleKey = 'F2';
  const combination = 'ctrl+a';

  // Act
  const accepted = parseBaseKey(singleKey);
  const rejected = parseBaseKey(combination);

  // Assert
  assert.equal(Either.getOrThrow(accepted), 'f2');
  assert.ok(Either.isLeft(rejected));
  assert.equal(rejected.left._tag, 'InvalidKey');
});

test('inherited object properties cannot resolve to picker actions', () => {
  // Arrange
  const propertyNames = ['constructor', '__proto__', 'toString'];

  // Act
  const actions = propertyNames.flatMap((key) => [keyAction(key, false), keyAction(key, true)]);

  // Assert
  assert.ok(actions.every((action) => action === undefined));
});
