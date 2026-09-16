import type { Readable, Writable } from 'node:stream';
import { Data, Effect, Queue } from 'effect';
import type { Scope } from 'effect';
import type { InputEvent } from '../picker-actions.js';
import { createInputDecoder } from './input.js';

export interface TerminalInput extends Readable {
  readonly isTTY?: boolean;
  readonly isRaw?: boolean;
  setRawMode(mode: boolean): unknown;
}
export interface TerminalOutput extends Writable {
  readonly columns?: number;
  readonly rows?: number;
}
export type TerminalEvent = InputEvent | { readonly type: 'resize' } | { readonly type: 'end' } |
  { readonly type: 'error'; readonly cause: unknown };

export class TerminalError extends Data.TaggedError('TerminalError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export function terminalSession(input: TerminalInput, output: TerminalOutput): Effect.Effect<
  Queue.Queue<TerminalEvent>, TerminalError, Scope.Scope
> {
  return Effect.gen(function* () {
    if (!input.isTTY) return yield* new TerminalError({ message: 'Keyboard requires an interactive terminal.' });
    const events = yield* Effect.acquireRelease(Queue.unbounded<TerminalEvent>(), Queue.shutdown);
    const session = createSession(input, output, events);
    // Register cleanup before starting, including when startup only partially succeeds.
    yield* Effect.acquireRelease(Effect.succeed(session), (value) => Effect.sync(value.close));
    yield* terminalOperation(session.start);
    return events;
  });
}

export function terminalOperation<A>(operation: () => A): Effect.Effect<A, TerminalError> {
  return Effect.try({ try: operation, catch: (cause) => new TerminalError({
    message: cause instanceof Error ? cause.message : String(cause),
    cause,
  }) });
}

function createSession(input: TerminalInput, output: TerminalOutput, events: Queue.Queue<TerminalEvent>) {
  const wasRaw = Boolean(input.isRaw);
  const decoder = createInputDecoder((event) => { events.unsafeOffer(event); });
  const end = () => { events.unsafeOffer({ type: 'end' }); };
  const resize = () => { events.unsafeOffer({ type: 'resize' }); };
  const error = (cause: unknown) => { events.unsafeOffer({ type: 'error', cause }); };
  return { start, close };

  function start() {
    input.on('data', decoder.feed);
    input.on('end', end);
    input.on('error', error);
    output.on('resize', resize);
    output.on('error', error);
    process.on('SIGTERM', end);
    process.on('SIGHUP', end);
    process.on('SIGINT', end);
    input.setRawMode(true);
    output.write('\x1b[?1049h\x1b[?25l\x1b[?1000h\x1b[?1006h\x1b[?2004h');
    input.resume();
  }

  function close() {
    decoder.dispose();
    input.off('data', decoder.feed);
    input.off('end', end);
    input.off('error', error);
    output.off('resize', resize);
    output.off('error', error);
    process.off('SIGTERM', end);
    process.off('SIGHUP', end);
    process.off('SIGINT', end);
    input.pause();
    try {
      input.setRawMode(wasRaw);
    } finally {
      if (!output.destroyed) output.write('\x1b[?1000l\x1b[?1006l\x1b[?2004l\x1b[0m\x1b[?25h\x1b[?1049l');
    }
  }
}
