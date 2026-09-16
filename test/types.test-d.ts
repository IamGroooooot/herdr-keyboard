import { Herdr } from '../src/herdr.js';
import { Effect } from 'effect';
import { pickShortcut } from '../src/picker.js';
import { BaseKey, KeyChord, PaneId } from '../src/domain/keys.js';
import type { InputEvent, PickerMode } from '../src/domain/actions.js';
import type { Composer } from '../src/domain/composer.js';
import { baseKeys } from '../src/domain/composer.js';
import type { KeyboardConfig } from '../src/config.js';

function contracts(service: Herdr['Type'], pane: PaneId, key: KeyChord) {
  service.sendKey(pane, key);
  // @ts-expect-error The picker cannot run before its Herdr service is provided.
  Effect.runPromise(pickShortcut());
  // @ts-expect-error Raw strings must be validated before sending.
  service.sendKey('w1:p2', 'ctrl+a');
  // @ts-expect-error Pane IDs and key chords are not interchangeable.
  service.sendKey(key, pane);
  // @ts-expect-error A chord cannot be used as the composer's base key.
  const base: BaseKey = key;
  // @ts-expect-error Key events cannot carry mouse coordinates.
  const event: InputEvent = { type: 'key', x: 1, y: 2 };
  // @ts-expect-error Text entry exists only in TypingKey mode.
  const mode: PickerMode = { _tag: 'Shortcuts', text: 'abc' };
  // @ts-expect-error Composer base keys must be validated.
  const composer: Composer = { ctrl: false, alt: false, shift: false, base: 'ctrl+a' };
  // @ts-expect-error Built-in chords must use supported key names.
  KeyChord.make('ctrl+upp');
  // @ts-expect-error Duplicate modifiers are not canonical chords.
  KeyChord.make('ctrl+ctrl+a');
  // @ts-expect-error Only f1 through f12 are supported.
  BaseKey.make('f13');
  // @ts-expect-error A validated configuration always has at least one shortcut.
  const empty: KeyboardConfig = { closeAfterSend: true, shortcuts: [] };
  // @ts-expect-error Shared key definitions cannot be changed by consumers.
  baseKeys[0].key = BaseKey.make('esc');
  return { base, event, mode, composer, empty };
}
void contracts;
