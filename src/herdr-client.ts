import { execFile } from 'node:child_process';
import { Effect, Layer } from 'effect';
import type { Environment } from './environment.js';
import { Herdr, HerdrError } from './herdr.js';

export type ExecuteCommand = (
  binary: string, args: ReadonlyArray<string>, env: Environment,
) => Effect.Effect<void, HerdrError>;

interface HerdrLayerOptions {
  readonly environment?: Environment;
  readonly execute?: ExecuteCommand;
  readonly platform?: NodeJS.Platform;
}

const commandTimeoutMs = 5000;
const commandOutputLimit = 64 * 1024;

export function herdrLayer({
  environment = process.env, execute = executeCommand, platform = process.platform,
}: HerdrLayerOptions = {}): Layer.Layer<Herdr> {
  const binary = environment['HERDR_BIN_PATH'] || 'herdr';
  const pickerEntrypoint = platform === 'win32' ? 'picker-windows' : 'picker';
  const run = (args: ReadonlyArray<string>) => execute(binary, args, environment);
  return Layer.succeed(Herdr, {
    sendKey: (pane, key) => run(['pane', 'send-keys', pane, key]),
    openPicker: (pane) => run([
      'plugin', 'pane', 'open', '--plugin', 'herdr-keyboard', '--entrypoint', pickerEntrypoint,
      // Popups open over the active pane; pin only the keyboard destination.
      '--env', `HERDR_KEYBOARD_TARGET=${pane}`,
    ]),
  });
}

export const executeCommand: ExecuteCommand = (binary, args, env) => Effect.async<void, HerdrError>((resume) => {
  try {
    const child = execFile(binary, [...args], { env: { ...env }, timeout: commandTimeoutMs, maxBuffer: commandOutputLimit },
      (error, _stdout, stderr) => {
        if (error) resume(Effect.fail(commandFailure(error, stderr.trim())));
        else resume(Effect.void);
      });
    child.stdin?.end();
    return Effect.sync(() => { child.kill(); });
  } catch (cause) {
    resume(Effect.fail(commandFailure(cause)));
    return undefined;
  }
});

function commandFailure(cause: unknown, stderr = ''): HerdrError {
  const detail = cause instanceof Error ? cause.message : String(cause);
  if (cause instanceof Error && 'code' in cause) {
    if (cause.code === 'ENOENT') {
      return new HerdrError({ reason: 'unavailable', message: `Cannot start Herdr: ${detail}`, cause });
    }
    if (cause.code === null && 'killed' in cause && cause.killed === true) {
      return new HerdrError({ reason: 'timeout', message: `Herdr command timed out after ${commandTimeoutMs} ms.`, cause });
    }
  }
  return new HerdrError({ reason: 'failed', message: stderr || detail, cause });
}
