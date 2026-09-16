import { modifierHotkeys } from '../picker-actions.js';
import type { BaseKey, KeyChord } from '../domain/keys.js';
import type { PaneId } from '../herdr.js';
import type { Composer } from '../domain/composer.js';
import type { Button, PickerLayout } from './layout.js';

export interface ComposerPreview extends Composer {
  readonly typing: string | null;
  readonly preview: KeyChord | null;
}
export interface DisplayEntry {
  readonly label: string;
  readonly key: BaseKey | KeyChord;
}
export interface ScreenContent {
  readonly pane: PaneId;
  readonly entries: ReadonlyArray<DisplayEntry>;
  readonly selected: number;
  readonly closeAfterSend: boolean;
  readonly status: string;
  readonly composer: ComposerPreview | null;
}

export function render(view: PickerLayout, content: ScreenContent): string {
  const clear = '\x1b[2J\x1b[H';
  if (view.compact) return clear + textAt(view, 1, 1, `Need 25x${view.composing ? 14 : 10}. m:back q:exit`);
  const { composer, pane, status } = content;
  return clear + [
    textAt(view, 2, 1, `Keyboard > ${pane}`),
    composer ? textAt(view, 1, 5, composer.typing !== null
      ? `Key: ${composer.typing}_` : (composer.preview || 'Choose modifiers + key')) : '',
    ...view.buttons.map((button) => renderButton(view, button, content)),
    textAt(view, 2, view.height - 4, status || (composer ? 'Select key, then Send.'
      : `Tap / ${view.pageSize === 10 ? '1-9, 0' : '1-9'} to send.`)),
  ].join('');
}

function renderButton(view: PickerLayout, button: Button, content: ScreenContent): string {
  const { action } = button;
  if (typeof action === 'number') return renderChoice(button, action, view, content);
  switch (action) {
    case 'ctrl': case 'alt': case 'shift':
      return `${cursorAt(button.x, button.y)}${content.composer?.[action] ? '\x1b[7m' : '\x1b[100m'}` +
        fit(`[${modifierHotkeys[action]}]${action}`, button.width) + '\x1b[0m';
    case 'compose':
      return textAt(view, button.x, button.y,
        `[m] ${content.composer ? 'Shortcuts' : 'Compose'}   ${view.page + 1}/${view.pages}`);
    case 'previous': return textAt(view, button.x, button.y, '[p] Prev');
    case 'next': return textAt(view, button.x, button.y, '[n] Next');
    case 'toggle-keep-open': return textAt(view, button.x, button.y, `[r] Keep:${content.closeAfterSend ? 'OFF' : 'ON '}`);
    case 'close': return textAt(view, button.x, button.y, '[q] Exit');
    case 'send': return textAt(view, button.x, button.y, '[enter] Send');
    case 'type-key': return textAt(view, button.x, button.y, '[k] Key');
    default: return action satisfies never;
  }
}

function renderChoice(button: Button, index: number, view: PickerLayout, content: ScreenContent): string {
  const entry = content.entries[view.page * view.pageSize + index];
  if (!entry) return '';
  const active = content.composer ? content.composer.base === entry.key : content.selected === index;
  return cursorAt(button.x, button.y) + (active ? '\x1b[7m' : '\x1b[100m') +
    fit(` ${(index + 1) % 10} ${entry.label}`, button.width) + '\x1b[0m';
}

function textAt(view: PickerLayout, x: number, y: number, text: string): string {
  return cursorAt(x, y) + fit(text, Math.max(0, view.width - x + 1));
}

function cursorAt(x: number, y: number): string {
  return `\x1b[${y};${x}H`;
}

export function fit(text: string, width: number) {
  let result = '';
  let used = 0;
  for (const char of text.replace(/[\p{Cc}\p{Cf}]/gu, ' ')) {
    const size = cellWidth(char);
    if (used + size > width) break;
    result += char;
    used += size;
  }
  return result + ' '.repeat(Math.max(0, width - used));
}

// Use terminal-cell widths for both drawing and hit testing (including CJK labels).
export function cellWidth(char: string) {
  if (/\p{Mark}/u.test(char)) return 0;
  const code = char.codePointAt(0) ?? 0;
  return code >= 0x1100 && (code <= 0x115f || code === 0x2329 || code === 0x232a ||
    (code >= 0x2e80 && code <= 0xa4cf) || (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) || (code >= 0xfe10 && code <= 0xfe6f) ||
    (code >= 0xff01 && code <= 0xff60) || (code >= 0xffe0 && code <= 0xffe6) ||
    code >= 0x1f000) ? 2 : 1;
}
