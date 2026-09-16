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
  'up', 'down', 'left', 'right', 'tab', 'enter', 'esc', 'space',
  'backspace', 'delete', 'home', 'end', 'pageup', 'pagedown', 'insert',
] as const satisfies Array.NonEmptyReadonlyArray<BaseKeyName>,
  (key) => ({ label: key, key: BaseKey.make(key) }));
