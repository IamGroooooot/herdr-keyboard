import { Effect, Either, Queue } from 'effect';
import { loadConfig } from './config.js';
import type { Environment, KeyboardConfig } from './config.js';
import { baseKeys, composedKey } from './domain/composer.js';
import { initialState, updatePicker } from './picker-state.js';
import type { PickerState } from './picker-state.js';
import type { PaneId } from './domain/keys.js';
import { Herdr, targetPane } from './herdr.js';
import { TerminalError, terminalOperation, terminalSession } from './terminal/session.js';
import type { TerminalInput, TerminalOutput } from './terminal/session.js';
import { layout } from './terminal/layout.js';
import { render } from './terminal/view.js';

export function pickShortcut(
  input: TerminalInput = process.stdin, output: TerminalOutput = process.stdout, env: Environment = process.env,
) {
  return Effect.scoped(Effect.gen(function* () {
    const pane = yield* targetPane(env);
    const config = yield* loadConfig(env);
    const herdr = yield* Herdr;
    const events = yield* terminalSession(input, output);
    let state = initialState(config);
    let screen = createScreen(state, config, output);
    state = screen.state;
    yield* terminalOperation(() => output.write(renderScreen(screen, pane)));

    while (true) {
      const event = yield* Queue.take(events);
      if (event.type === 'end') return;
      if (event.type === 'error') return yield* new TerminalError({ message:
        event.cause instanceof Error ? event.cause.message : String(event.cause),
      });
      if (event.type !== 'resize') {
        const decision = updatePicker(screen.state, event, screen.view, config);
        switch (decision._tag) {
          case 'Close': return;
          case 'Continue': state = decision.state; break;
          case 'Send': {
            state = decision.state;
            const result = yield* Effect.either(herdr.sendKey(pane, decision.key));
            if (Either.isRight(result) && state.closeAfterSend) return;
            state = { ...state, status: Either.isLeft(result) ? `Failed: ${result.left.message}` : `Sent: ${decision.label}` };
            break;
          }
          default: return assertNever(decision);
        }
      }
      screen = createScreen(state, config, output);
      state = screen.state;
      yield* terminalOperation(() => output.write(renderScreen(screen, pane)));
    }
  }));
}

function createScreen(state: PickerState, config: KeyboardConfig, output: TerminalOutput) {
  const composing = state.mode._tag !== 'Shortcuts';
  const entries = composing ? baseKeys : config.shortcuts;
  const view = layout(output.columns || 40, output.rows || 22, entries.length, state.page, composing);
  return { view, entries, state: { ...state, page: view.page,
    selected: Math.min(state.selected, Math.max(0, entries.length - view.page * view.pageSize - 1), Math.max(0, view.pageSize - 1)),
  } };
}

function renderScreen(screen: ReturnType<typeof createScreen>, pane: PaneId) {
  const { view, entries, state } = screen;
  const composer = state.mode._tag === 'Shortcuts' ? null : { ...state.composer,
    preview: composedKey(state.composer), typing: state.mode._tag === 'TypingKey' ? state.mode.text : null,
  };
  return render(view, { entries, pane, selected: state.selected, closeAfterSend: state.closeAfterSend,
    status: state.status, composer,
  });
}

function assertNever(value: never): never {
  throw new Error(`Unhandled picker decision: ${String(value)}`);
}
