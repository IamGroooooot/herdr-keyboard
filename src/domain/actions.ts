import { Modifier } from './keys.js';
import type { Direction } from './keys.js';

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
  if (composing) {
    const modifier = Modifier.literals.find((modifier) => modifierHotkeys[modifier] === key);
    if (modifier) return modifier;
    if (key === 'k') return 'type-key';
  }
  if (/^[1-9]$/.test(key)) return Number(key) - 1;
  return commonBindings.get(key);
}

export const modifierHotkeys = { ctrl: 'c', alt: 'a', shift: 's' } as const satisfies Readonly<Record<Modifier, string>>;

const commonBindings: ReadonlyMap<string, Action> = new Map([
  ['q', 'close'], ['0', 'close'], ['close', 'close'], ['r', 'repeat'],
  ['p', 'previous'], ['n', 'next'], ['m', 'compose'],
  ['up', 'up'], ['down', 'down'], ['left', 'left'], ['right', 'right'],
  ['enter', 'enter'], ['next', 'next'], ['previous', 'previous'],
]);
