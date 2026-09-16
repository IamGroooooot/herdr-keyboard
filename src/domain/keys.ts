import { Data, Either, Schema } from 'effect';

export const Modifier = Schema.Literal('ctrl', 'alt', 'shift');
export type Modifier = typeof Modifier.Type;
export const Direction = Schema.Literal('up', 'down', 'left', 'right');
export type Direction = typeof Direction.Type;
export const BaseKey = Schema.String.pipe(Schema.filter(isBaseKey), Schema.brand('BaseKey'));
export type BaseKey = typeof BaseKey.Type;
export const KeyChord = Schema.String.pipe(Schema.filter(isKeyChord), Schema.brand('KeyChord'));
export type KeyChord = typeof KeyChord.Type;
export const PaneId = Schema.String.pipe(Schema.minLength(1), Schema.brand('PaneId'));
export type PaneId = typeof PaneId.Type;

export interface Shortcut {
  readonly label: string;
  readonly key: KeyChord;
}

export class InvalidKey extends Data.TaggedError('InvalidKey')<{ readonly message: string }> {}

export function normalizeKey(value: unknown): Either.Either<KeyChord, InvalidKey> {
  if (typeof value !== 'string' || value.length > 80) {
    return Either.left(new InvalidKey({ message: 'Key must be a short key combination.' }));
  }
  const parts = value.toLowerCase().split('+').map((part) => aliases[part.trim()] ?? part.trim());
  const base = parts.pop();
  if (!base || !isBaseKey(base)) return Either.left(new InvalidKey({ message: `Unsupported key: ${value}` }));
  if (parts.some((part) => !Schema.is(Modifier)(part)) || new Set(parts).size !== parts.length) {
    return Either.left(new InvalidKey({ message: `Unsupported modifiers: ${value}` }));
  }
  const key = [...Modifier.literals.filter((part) => parts.includes(part)), base].join('+');
  return Schema.decodeUnknownEither(KeyChord)(key).pipe(
    Either.mapLeft(() => new InvalidKey({ message: `Unsupported key: ${value}` })),
  );
}

export function parseBaseKey(value: unknown): Either.Either<BaseKey, InvalidKey> {
  return normalizeKey(value).pipe(Either.flatMap((key) =>
    Schema.decodeUnknownEither(BaseKey)(key).pipe(Either.mapLeft(() =>
      new InvalidKey({ message: 'Type one key, e.g. a, f2, or tab.' }))),
  ));
}

function isKeyChord(value: string): boolean {
  const parts = value.split('+');
  const base = parts.pop();
  return base !== undefined && isBaseKey(base) &&
    parts.every((part) => Schema.is(Modifier)(part)) && new Set(parts).size === parts.length;
}

function isBaseKey(value: string): boolean {
  return namedKeys.has(value) || /^[a-z0-9]$/.test(value) || /^f(?:[1-9]|1[0-2])$/.test(value);
}

const namedKeys = new Set(['enter', 'esc', 'tab', 'space', 'backspace', 'delete', 'insert',
  'up', 'down', 'left', 'right', 'home', 'end', 'pageup', 'pagedown', 'plus', 'minus']);
const aliases: Readonly<Record<string, string>> = {
  opt: 'alt', option: 'alt', control: 'ctrl', escape: 'esc', return: 'enter',
};
