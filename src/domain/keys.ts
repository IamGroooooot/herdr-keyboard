import { Data, Either, Schema } from 'effect';

export const Modifier = Schema.Literal('ctrl', 'alt', 'shift');
export type Modifier = typeof Modifier.Type;
export const Direction = Schema.Literal('up', 'down', 'left', 'right');
export type Direction = typeof Direction.Type;
export const BaseKeyName = Schema.Union(
  Direction,
  Schema.Literal('enter', 'esc', 'tab', 'space', 'backspace', 'delete', 'insert',
    'home', 'end', 'pageup', 'pagedown', 'plus', 'minus'),
  Schema.Literal('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
  Schema.TemplateLiteral('f', Schema.Literal(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)),
);
export type BaseKeyName = typeof BaseKeyName.Type;
export const BaseKey = BaseKeyName.pipe(Schema.brand('BaseKey'));
export type BaseKey = typeof BaseKey.Type;
export const KeyChordName = Schema.TemplateLiteral(
  Schema.Literal('', 'ctrl+', 'alt+', 'shift+', 'ctrl+alt+', 'ctrl+shift+', 'alt+shift+', 'ctrl+alt+shift+'),
  BaseKeyName,
);
export type KeyChordName = typeof KeyChordName.Type;
export const KeyChord = KeyChordName.pipe(Schema.brand('KeyChord'));
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
  const parts = value.toLowerCase().split('+').map((part) => aliases.get(part.trim()) ?? part.trim());
  const base = parts.at(-1);
  const modifiers = parts.slice(0, -1);
  if (!base || !isBaseKey(base)) return Either.left(new InvalidKey({ message: `Unsupported key: ${value}` }));
  if (modifiers.some((part) => !isModifier(part)) || new Set(modifiers).size !== modifiers.length) {
    return Either.left(new InvalidKey({ message: `Unsupported modifiers: ${value}` }));
  }
  const key = [...Modifier.literals.filter((part) => modifiers.includes(part)), base].join('+');
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

const isBaseKey = Schema.is(BaseKeyName);
const isModifier = Schema.is(Modifier);
const aliases: ReadonlyMap<string, Modifier | BaseKeyName> = new Map([
  ['opt', 'alt'], ['option', 'alt'], ['control', 'ctrl'], ['escape', 'esc'], ['return', 'enter'],
]);
