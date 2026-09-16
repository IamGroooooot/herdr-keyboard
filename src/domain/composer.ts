import { Array, Either, Schema } from 'effect';
import { BaseKey, KeyChord, Modifier, parseBaseKey } from './keys.js';
import type { BaseKeyName, InvalidKey } from './keys.js';

export interface Composer extends Readonly<Record<Modifier, boolean>> {
  readonly base: BaseKey | null;
}

export function composedKey(composer: Composer): KeyChord | null {
  if (!composer.base) return null;
  return Schema.decodeUnknownSync(KeyChord)([...Modifier.literals.filter((key) => composer[key]), composer.base].join('+'));
}

export function setBase(composer: Composer, value: unknown): Either.Either<Composer, InvalidKey> {
  return parseBaseKey(value).pipe(Either.map((base) => ({ ...composer, base })));
}

export const baseKeys: Array.NonEmptyReadonlyArray<{ readonly label: string; readonly key: BaseKey }> = Array.map([
  ['Up', 'up'], ['Down', 'down'], ['Left', 'left'], ['Right', 'right'],
  ['Tab', 'tab'], ['Enter', 'enter'], ['Esc', 'esc'], ['Space', 'space'],
  ['Backspace', 'backspace'], ['Delete', 'delete'], ['Home', 'home'], ['End', 'end'],
  ['Page Up', 'pageup'], ['Page Down', 'pagedown'], ['Insert', 'insert'],
] as const satisfies Array.NonEmptyReadonlyArray<readonly [string, BaseKeyName]>,
  ([label, key]) => ({ label, key: BaseKey.make(key) }));
