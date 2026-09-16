import type { InputEvent } from '../domain/actions.js';
import { parseInput } from './input-parser.js';
import type { InputState } from './input-parser.js';

export function createInputDecoder(emit: (event: InputEvent) => void) {
  let state: InputState = { _tag: 'Reading', pending: '' };
  let escapeTimer: ReturnType<typeof setTimeout> | undefined;
  return { feed, dispose };

  function feed(chunk: Buffer | string): void {
    clearTimeout(escapeTimer);
    state = { ...state, pending: state.pending + (Buffer.isBuffer(chunk) ? chunk.toString('latin1') : chunk) };
    while (true) {
      const step = parseInput(state);
      switch (step._tag) {
        case 'NeedInput': state = step.state; return;
        case 'Escape':
          escapeTimer = setTimeout(() => {
            state = { _tag: 'Reading', pending: '' };
            emit({ type: 'key', key: 'close' });
          }, escapeDelayMs);
          return;
        case 'Continue':
          state = step.state;
          if (step.event) emit(step.event);
          break;
        default: return step satisfies never;
      }
    }
  }

  function dispose(): void {
    clearTimeout(escapeTimer);
    state = { _tag: 'Reading', pending: '' };
  }
}

const escapeDelayMs = 80;
