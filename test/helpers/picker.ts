import type { TestContext } from 'node:test';
import { PassThrough } from 'node:stream';
import { Effect, Layer } from 'effect';
import { pickShortcut } from '../../src/picker.js';
import { Herdr } from '../../src/herdr.js';
import type { HerdrError } from '../../src/herdr.js';

interface PickerOptions {
  readonly input?: TestInput;
  readonly sendResult?: Effect.Effect<void, HerdrError>;
}

export async function openPicker(t: TestContext, options: PickerOptions = {}) {
  const session = launchPicker(t, options);
  await waitFor(() => session.output.screen.includes('Keyboard >'), 'picker to open');
  return session;
}

export function launchPicker(t: TestContext, options: PickerOptions = {}) {
  const input = options.input ?? new TestInput();
  const output = new TestOutput();
  const sent: Array<readonly [string, string]> = [];
  const abort = new AbortController();
  const service = Layer.succeed(Herdr, {
    openPicker: () => Effect.void,
    sendKey: (pane, key) => Effect.suspend(() => {
      sent.push([pane, key]);
      return options.sendResult ?? Effect.void;
    }),
  });
  const done = Effect.runPromiseExit(
    pickShortcut(input, output, { HERDR_PANE_ID: 'w1:p2' }).pipe(Effect.provide(service)),
    { signal: abort.signal },
  );
  t.after(async () => {
    abort.abort();
    await done;
    input.destroy();
    output.destroy();
  });
  return { input, output, sent, done, abort };
}

export async function waitFor(condition: () => boolean, description: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${description}`);
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

export class TestInput extends PassThrough {
  isTTY = true;
  isRaw = false;
  setRawMode(value: boolean) { this.isRaw = value; return this; }
}

class TestOutput extends PassThrough {
  columns = 40;
  rows = 22;
  screen = '';
  constructor() {
    super();
    this.on('data', (chunk: Buffer) => { this.screen += chunk.toString(); });
  }
}
