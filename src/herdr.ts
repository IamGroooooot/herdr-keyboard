import { execFile } from 'node:child_process';
import { Context, Data, Effect, Layer, Schema } from 'effect';
import type { Environment } from './config.js';
import { KeyChord, PaneId } from './domain/keys.js';

export class HerdrError extends Data.TaggedError('HerdrError')<{ readonly message: string }> {}
export class TargetError extends Data.TaggedError('TargetError')<{ readonly message: string }> {}

export class Herdr extends Context.Tag('herdr-keyboard/Herdr')<Herdr, {
  readonly sendKey: (pane: PaneId, key: KeyChord) => Effect.Effect<void, HerdrError>;
  readonly openPicker: (pane: PaneId) => Effect.Effect<void, HerdrError>;
}>() {}

export type ExecuteCommand = (
  binary: string, args: ReadonlyArray<string>, env: Environment,
) => Effect.Effect<void, HerdrError>;

export function herdrLayer(env: Environment = process.env, execute: ExecuteCommand = executeCommand) {
  const run = (args: ReadonlyArray<string>) => execute(env['HERDR_BIN_PATH'] || 'herdr', args, env);
  return Layer.succeed(Herdr, {
    sendKey: (pane, key) => run(['pane', 'send-keys', pane, key]),
    openPicker: (pane) => run([
      'plugin', 'pane', 'open', '--plugin', 'herdr-keyboard', '--entrypoint', 'picker',
      // Popups open over the active pane; pin only the keyboard destination.
      '--env', `HERDR_KEYBOARD_TARGET=${pane}`,
    ]),
  });
}

export function targetPane(env: Environment): Effect.Effect<PaneId, TargetError> {
  const context = Schema.Struct({ focused_pane_id: Schema.optional(Schema.NullOr(Schema.String)) });
  return Schema.decodeUnknown(Schema.parseJson(context))(env['HERDR_PLUGIN_CONTEXT_JSON'] || '{}').pipe(
    Effect.mapError((cause) => new TargetError({ message: `Invalid Herdr context: ${cause.message}` })),
    Effect.flatMap((value) => Schema.decodeUnknown(PaneId)(
      env['HERDR_KEYBOARD_TARGET'] || value.focused_pane_id || env['HERDR_PANE_ID'],
    ).pipe(Effect.mapError(() => new TargetError({ message: 'No target pane. Open Keyboard from a Herdr pane.' })))),
  );
}

export const executeCommand: ExecuteCommand = (binary, args, env) => Effect.async<void, HerdrError>((resume) => {
  try {
    const child = execFile(binary, [...args], { env: { ...env }, timeout: 5000, maxBuffer: 64 * 1024 },
      (error, _stdout, stderr) => {
        if (error) resume(Effect.fail(new HerdrError({ message: stderr.trim() || error.message })));
        else resume(Effect.void);
      });
    child.stdin?.end();
    return Effect.sync(() => { child.kill(); });
  } catch (cause) {
    resume(Effect.fail(new HerdrError({ message: cause instanceof Error ? cause.message : String(cause) })));
    return undefined;
  }
});
