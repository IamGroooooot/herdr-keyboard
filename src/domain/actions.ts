import type { Direction, Modifier } from './keys.js';

export type InputEvent =
  | { readonly type: 'key'; readonly key: string }
  | { readonly type: 'click'; readonly x: number; readonly y: number };

export type Action = Modifier | Direction | number |
  'close' | 'compose' | 'repeat' | 'next' | 'previous' | 'enter' | 'send' | 'type-key';

export type PickerMode =
  | { readonly _tag: 'Shortcuts' }
  | { readonly _tag: 'Compose' }
  | { readonly _tag: 'TypingKey'; readonly text: string };

export function keyAction(key: string, composing: boolean): Action | undefined {
  if (composing && modifierBindings[key]) return modifierBindings[key];
  if (/^[1-9]$/.test(key)) return Number(key) - 1;
  return commonBindings[key];
}

export const modifierBindings: Readonly<Record<string, Action>> = {
  a: 'alt', s: 'shift', c: 'ctrl', k: 'type-key',
};
export const modifierHotkeys = { ctrl: 'c', alt: 'a', shift: 's' } satisfies Record<Modifier, string>;

const commonBindings: Readonly<Record<string, Action>> = {
  q: 'close', '0': 'close', close: 'close', r: 'repeat', p: 'previous', n: 'next', m: 'compose',
  up: 'up', down: 'down', left: 'left', right: 'right', enter: 'enter', next: 'next', previous: 'previous',
};
