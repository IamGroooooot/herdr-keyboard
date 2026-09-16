export function render(view, entries, pane, selected, closeAfterSend, status = '', composer = null) {
  const at = (x, y, text) => `\x1b[${y};${x}H${fit(text, Math.max(0, view.width - x + 1))}`;
  let output = '\x1b[2J\x1b[H';
  if (view.compact) return output + at(1, 1, `Need 25x${view.composing ? 14 : 10}. c:back q:exit`);
  output += at(2, 1, `Keyboard > ${pane}`);
  output += at(2, 2, `[c] ${composer ? 'Shortcuts' : 'Compose'}   ${view.page + 1}/${view.pages}`);
  if (composer) {
    for (const [index, modifier] of ['ctrl', 'alt', 'shift'].entries()) {
      const hotkey = { ctrl: 't', alt: 'a', shift: 's' }[modifier];
      const label = { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' }[modifier];
      output += `\x1b[4;${1 + index * 8}H${composer[modifier] ? '\x1b[7m' : '\x1b[100m'}${fit(`[${hotkey}]${label}`, 8)}\x1b[0m`;
    }
    output += at(1, 5, composer.typing !== null ? `Key: ${composer.typing}_` : (composer.preview || 'Choose modifiers + key'));
    output += at(2, view.height - 3, '[Enter] Send  [k] Key');
  }
  for (const button of view.buttons) {
    if (typeof button.action !== 'number') continue;
    const index = button.action;
    const entry = entries[view.page * view.pageSize + index];
    const active = composer ? composer.base === entry.key : selected === index;
    output += `\x1b[${button.y};${button.x}H${active ? '\x1b[7m' : '\x1b[100m'}`;
    output += fit(` ${index + 1} ${entry.label}`, button.width) + '\x1b[0m';
    output += `\x1b[${button.y + 1};${button.x}H\x1b[90m${fit(`   ${entry.key}`, button.width)}\x1b[0m`;
  }
  output += at(2, view.height - 4, status || (composer ? 'Select key, then Send.' : 'Tap / 1-9 to send.'));
  output += at(2, view.height - (composer ? 5 : 3), '[p] Prev  [n] Next');
  output += at(2, view.height - 1, `[r] Keep:${closeAfterSend ? 'OFF' : 'ON '}   [0] Exit`);
  return output;
}

export function layout(columns, rows, total, page = 0, composing = false) {
  const width = Math.max(1, columns - 1);
  const height = Math.max(1, rows);
  const minHeight = composing ? 14 : 10;
  if (width < 24 || height < minHeight) return { width, height, composing, compact: true, page: 0, pageSize: 0, pages: 0, buttons: [] };
  const cols = composing ? (width >= 40 ? 3 : 2) : (width >= 54 ? 2 : 1);
  const buttonWidth = Math.floor((width - 3) / cols);
  const pageSize = Math.min(9, Math.floor((height - (composing ? 12 : 7)) / 2) * cols);
  const pages = Math.ceil(total / pageSize);
  page = Math.max(0, Math.min(page, pages - 1));
  const count = Math.min(pageSize, total - page * pageSize);
  const buttons = Array.from({ length: count }, (_, index) => ({
    x: 2 + (index % cols) * buttonWidth,
    y: (composing ? 7 : 4) + Math.floor(index / cols) * 2,
    width: buttonWidth - 1, height: 2, action: index,
  }));
  const footerY = height - (composing ? 5 : 3);
  buttons.push(
    { x: 2, y: 2, width: 13, height: 1, action: 'compose' },
    { x: 2, y: footerY, width: 8, height: 1, action: 'previous' },
    { x: 12, y: footerY, width: 8, height: 1, action: 'next' },
    { x: 2, y: height - 1, width: 13, height: 1, action: 'repeat' },
    { x: 17, y: height - 1, width: 8, height: 1, action: 'close' },
  );
  if (composing) {
    for (const [index, modifier] of ['ctrl', 'alt', 'shift'].entries()) {
      buttons.push({ x: 1 + index * 8, y: 4, width: 8, height: 1, action: modifier });
    }
    buttons.push(
      { x: 2, y: height - 3, width: 12, height: 1, action: 'send' },
      { x: 16, y: height - 3, width: 8, height: 1, action: 'type-key' },
    );
  }
  return { width, height, composing, compact: false, page, pageSize, pages, buttons };
}

export function hitTest(view, x, y) {
  return view.buttons.find((button) => x >= button.x && x < button.x + button.width && y >= button.y && y < button.y + button.height)?.action;
}

export function fit(text, width) {
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
export function cellWidth(char) {
  if (/\p{Mark}/u.test(char)) return 0;
  const code = char.codePointAt(0);
  return code >= 0x1100 && (code <= 0x115f || code === 0x2329 || code === 0x232a ||
    (code >= 0x2e80 && code <= 0xa4cf) || (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) || (code >= 0xfe10 && code <= 0xfe6f) ||
    (code >= 0xff01 && code <= 0xff60) || (code >= 0xffe0 && code <= 0xffe6) ||
    code >= 0x1f000) ? 2 : 1;
}
