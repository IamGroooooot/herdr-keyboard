import { Either } from 'effect';
import { BaseKey, KeyChord, Modifier, parseBaseKey } from './keys.js';
import type { InvalidKey } from './keys.js';

export interface Composer {
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
  readonly base: BaseKey | null;
}

export function composedKey(composer: Composer): KeyChord | null {
  if (!composer.base) return null;
  return KeyChord.make([...Modifier.literals.filter((key) => composer[key]), composer.base].join('+'));
}

export function setBase(composer: Composer, value: unknown): Either.Either<Composer, InvalidKey> {
  return parseBaseKey(value).pipe(Either.map((base) => ({ ...composer, base })));
}

export const baseKeys = ([
  ['Up', 'up'], ['Down', 'down'], ['Left', 'left'], ['Right', 'right'],
  ['Tab', 'tab'], ['Enter', 'enter'], ['Esc', 'esc'], ['Space', 'space'],
  ['Backspace', 'backspace'], ['Delete', 'delete'], ['Home', 'home'], ['End', 'end'],
  ['Page Up', 'pageup'], ['Page Down', 'pagedown'], ['Insert', 'insert'],
] satisfies ReadonlyArray<readonly [string, string]>).map(([label, key]) => ({ label, key: BaseKey.make(key) }));
