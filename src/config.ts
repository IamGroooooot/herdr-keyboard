import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Array, Data, Effect, Either, Schema } from 'effect';
import { KeyChord, normalizeKey } from './domain/keys.js';
import type { KeyChordName, Shortcut } from './domain/keys.js';

export type Environment = Readonly<Record<string, string | undefined>>;
export interface KeyboardConfig {
  readonly closeAfterSend: boolean;
  readonly shortcuts: Array.NonEmptyReadonlyArray<Shortcut>;
}
export class ConfigError extends Data.TaggedError('ConfigError')<{ readonly message: string }> {}

export function loadConfig(env: Environment = process.env): Effect.Effect<KeyboardConfig, ConfigError> {
  if (!env['HERDR_PLUGIN_CONFIG_DIR']) return Effect.succeed(defaultConfig);
  const path = join(env['HERDR_PLUGIN_CONFIG_DIR'], 'keyboard.json');
  return Effect.tryPromise({
    try: () => readFile(path, 'utf8'),
    catch: (cause) => cause,
  }).pipe(
    Effect.catchAll((cause) => isMissingFile(cause)
      ? Effect.succeed(undefined)
      : Effect.fail(new ConfigError({ message: `Cannot read ${path}: ${message(cause)}` }))),
    Effect.flatMap((text) => text === undefined ? Effect.succeed(defaultConfig) :
      Schema.decodeUnknown(Schema.parseJson())(text).pipe(
        Effect.mapError((cause) => new ConfigError({ message: cause.message })),
        Effect.flatMap(validateConfig),
        Effect.mapError((cause) => new ConfigError({ message: `Invalid ${path}: ${cause.message}` })),
      )),
  );
}

export function validateConfig(value: unknown): Effect.Effect<KeyboardConfig, ConfigError> {
  return Schema.decodeUnknown(ConfigInput, { onExcessProperty: 'error' })(value).pipe(
    Effect.mapError((cause) => new ConfigError({ message: cause.message })),
    Effect.flatMap((config) => Effect.all(Array.map(config.shortcuts ?? shortcuts, (entry) =>
      normalizeKey(entry.key).pipe(
        Either.map((key) => ({ label: entry.label.trim(), key })),
        Either.mapLeft((cause) => new ConfigError({ message: cause.message })),
      ))).pipe(Effect.map((entries) => ({ closeAfterSend: config.closeAfterSend ?? true, shortcuts: entries })))),
  );
}

function isMissingFile(cause: unknown): boolean {
  return typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === 'ENOENT';
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

const Label = Schema.String.pipe(Schema.filter((value) =>
  value.trim().length > 0 && value.length <= 60 && !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(value)));
const ConfigInput = Schema.Struct({
  closeAfterSend: Schema.optional(Schema.Boolean),
  shortcuts: Schema.optional(Schema.NullOr(Schema.NonEmptyArray(Schema.Struct({ label: Label, key: Schema.String })).pipe(
    Schema.maxItems(90),
  ))),
});

export const shortcuts: Array.NonEmptyReadonlyArray<Shortcut> = Array.map([
  ['Opt + Down', 'alt+down'], ['Shift + Tab', 'shift+tab'], ['Shift + Up', 'shift+up'],
  ['Opt + Up', 'alt+up'], ['Shift + Down', 'shift+down'], ['Escape', 'esc'],
  ['Tab', 'tab'], ['Up', 'up'], ['Down', 'down'], ['Shift + Enter', 'shift+enter'],
  ['Opt + Left', 'alt+left'], ['Opt + Right', 'alt+right'], ['Shift + Left', 'shift+left'],
  ['Shift + Right', 'shift+right'], ['Ctrl + A', 'ctrl+a'], ['Ctrl + E', 'ctrl+e'],
  ['Ctrl + R', 'ctrl+r'], ['Ctrl + C', 'ctrl+c'], ['Ctrl + G', 'ctrl+g'], ['Ctrl + O', 'ctrl+o'],
] as const satisfies Array.NonEmptyReadonlyArray<readonly [string, KeyChordName]>,
  ([label, key]) => ({ label, key: KeyChord.make(key) }));

export const defaultConfig: KeyboardConfig = { closeAfterSend: true, shortcuts };
