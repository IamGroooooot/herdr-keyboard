import { Modifier } from './domain/keys.js';
import type { Direction } from './domain/keys.js';

export type InputEvent =
  | { readonly type: 'key'; readonly key: string }
  | { readonly type: 'click'; readonly x: number; readonly y: number };

export type PickerAction = Modifier | Direction | number |
  'close' | 'compose' | 'toggle-keep-open' | 'next' | 'previous' | 'enter' | 'send' | 'type-key';

export type PickerMode =
  | { readonly _tag: 'Shortcuts' }
  | { readonly _tag: 'Compose' }
  | { readonly _tag: 'TypingKey'; readonly text: string };

export function keyAction(key: string, composing: boolean): PickerAction | undefined {
  if (composing) {
    const modifier = Modifier.literals.find((modifier) => modifierHotkeys[modifier] === key);
    if (modifier) return modifier;
    if (key === 'k') return 'type-key';
  }
  if (/^[1-9]$/.test(key)) return Number(key) - 1;
  if (key === '0') return 9;
  return commonBindings.get(key);
}

export const modifierHotkeys = { ctrl: 'c', alt: 'a', shift: 's' } as const satisfies Readonly<Record<Modifier, string>>;

const commonBindings: ReadonlyMap<string, PickerAction> = new Map([
  ['q', 'close'], ['close', 'close'], ['r', 'toggle-keep-open'],
  ['p', 'previous'], ['n', 'next'], ['m', 'compose'],
  ['up', 'up'], ['down', 'down'], ['left', 'left'], ['right', 'right'],
  ['enter', 'enter'], ['next', 'next'], ['previous', 'previous'],
]);
