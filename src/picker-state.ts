import { Either, Schema } from 'effect';
import type { KeyboardConfig } from './config.js';
import type { View } from './terminal/view.js';
import { hitTest } from './terminal/view.js';
import { keyAction } from './domain/actions.js';
import type { Action, InputEvent, PickerMode } from './domain/actions.js';
import { baseKeys, composedKey, setBase } from './domain/composer.js';
import type { Composer } from './domain/composer.js';
import { BaseKey, Direction, Modifier } from './domain/keys.js';
import type { KeyChord } from './domain/keys.js';

export interface PickerState {
  readonly mode: PickerMode;
  readonly composer: Composer;
  readonly closeAfterSend: boolean;
  readonly page: number;
  readonly selected: number;
  readonly status: string;
}

export type Decision =
  | { readonly _tag: 'Continue'; readonly state: PickerState }
  | { readonly _tag: 'Close' }
  | { readonly _tag: 'Send'; readonly state: PickerState; readonly key: KeyChord; readonly label: string };

export function initialState(config: KeyboardConfig): PickerState {
  return {
    mode: { _tag: 'Shortcuts' }, composer: { ctrl: false, alt: false, shift: false, base: null },
    closeAfterSend: config.closeAfterSend, page: 0, selected: 0, status: '',
  };
}

export function updatePicker(state: PickerState, event: InputEvent, view: View, config: KeyboardConfig): Decision {
  if (state.mode._tag === 'TypingKey') return typeKey(state, state.mode.text, event, view);
  const composing = state.mode._tag === 'Compose';
  const action = event.type === 'click' ? hitTest(view, event.x, event.y) : keyAction(event.key, composing);
  if (action === 'close') return { _tag: 'Close' };
  if (action === 'compose') return keep({ ...state,
    mode: composing ? { _tag: 'Shortcuts' } : { _tag: 'Compose' }, page: 0, selected: 0, status: '',
  });
  if (view.compact || action === undefined) return keep(state);
  if (typeof action === 'number') return choose(state, action, view, config);
  if (composing) return updateComposer(state, action, view);
  if (action === 'enter') return choose(state, state.selected, view, config);
  if (action === 'up' || action === 'left') return keep({ ...state, selected: Math.max(0, state.selected - 1) });
  if (action === 'down' || action === 'right') return keep({ ...state, selected: state.selected + 1 });
  return navigate(state, action, view);
}

function typeKey(state: PickerState, text: string, event: InputEvent, view: View): Decision {
  const key = event.type === 'key' ? event.key : hitTest(view, event.x, event.y);
  if (key === 'close') return keep({ ...state, mode: { _tag: 'Compose' }, status: '' });
  if (key === 'backspace') return keep({ ...state, mode: { _tag: 'TypingKey', text: text.slice(0, -1) } });
  if (key === 'enter' || key === 'send') {
    const result = setBase(state.composer, text);
    return Either.isLeft(result) ? keep({ ...state, status: result.left.message }) : keep({
      ...state, composer: result.right, mode: { _tag: 'Compose' }, status: 'Ready. Send to transmit.',
    });
  }
  if (event.type === 'key' && /^[a-zA-Z0-9]$/.test(event.key) && text.length < 16) {
    return keep({ ...state, mode: { _tag: 'TypingKey', text: text + event.key } });
  }
  return keep(state);
}

function choose(state: PickerState, index: number, view: View, config: KeyboardConfig): Decision {
  if (index < 0 || index >= view.pageSize) return keep(state);
  const offset = state.page * view.pageSize + index;
  if (state.mode._tag === 'Shortcuts') {
    const entry = config.shortcuts[offset];
    return entry ? { _tag: 'Send', state: { ...state, selected: index }, key: entry.key, label: entry.label } : keep(state);
  }
  const entry = baseKeys[offset];
  return entry ? keep({ ...state, selected: index, composer: { ...state.composer, base: entry.key }, status: '' }) : keep(state);
}

function updateComposer(state: PickerState, action: Action, view: View): Decision {
  if (Schema.is(Modifier)(action)) return keep({ ...state,
    composer: { ...state.composer, [action]: !state.composer[action] }, status: '',
  });
  if (Schema.is(Direction)(action)) return keep({ ...state,
    composer: { ...state.composer, base: BaseKey.make(action) }, status: '',
  });
  if (action === 'type-key') return keep({ ...state, mode: { _tag: 'TypingKey', text: '' }, status: 'Type key name. Enter: set' });
  if (action === 'send' || action === 'enter') {
    const key = composedKey(state.composer);
    return key ? { _tag: 'Send', state, key, label: key } : keep({ ...state, status: 'Choose a key first.' });
  }
  return navigate(state, action, view);
}

function navigate(state: PickerState, action: Action, view: View): Decision {
  if (action === 'repeat') return keep({ ...state, closeAfterSend: !state.closeAfterSend });
  if (action === 'next' || action === 'previous') return keep({ ...state,
    page: (state.page + (action === 'next' ? 1 : -1) + view.pages) % view.pages, selected: 0,
  });
  return keep(state);
}

function keep(state: PickerState): Decision {
  return { _tag: 'Continue', state };
}
