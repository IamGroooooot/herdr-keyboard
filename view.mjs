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

export function layout(columns, rows, total, page = 0) {
  const width = Math.max(1, columns - 1);
  const height = Math.max(1, rows);
  if (width < 24 || height < 10) return { width, height, compact: true, page: 0, pageSize: 0, pages: 0, buttons: [] };
  const cols = width >= 54 ? 2 : 1;
  const buttonWidth = Math.floor((width - 3) / cols);
  const pageSize = Math.min(9, Math.floor((height - 7) / 2) * cols);
  const pages = Math.ceil(total / pageSize);
  page = Math.max(0, Math.min(page, pages - 1));
  const count = Math.min(pageSize, total - page * pageSize);
  const buttons = Array.from({ length: count }, (_, index) => ({
    x: 2 + (index % cols) * buttonWidth,
    y: 4 + Math.floor(index / cols) * 2,
    width: buttonWidth - 1, height: 2, action: index,
  }));
  const footerY = height - 3;
  buttons.push(
    { x: 2, y: footerY, width: 8, height: 1, action: 'previous' },
    { x: 12, y: footerY, width: 8, height: 1, action: 'next' },
    { x: 2, y: height - 1, width: 13, height: 1, action: 'repeat' },
    { x: 17, y: height - 1, width: 7, height: 1, action: 'close' },
  );
  return { width, height, compact: false, page, pageSize, pages, buttons };
}

export function hitTest(view, x, y) {
  return view.buttons.find((button) => x >= button.x && x < button.x + button.width && y >= button.y && y < button.y + button.height)?.action;
}

export function render(view, entries, pane, selected, closeAfterSend, status = '') {
  const at = (x, y, text) => `\x1b[${y};${x}H${fit(text, Math.max(0, view.width - x + 1))}`;
  let output = '\x1b[2J\x1b[H';
  if (view.compact) return output + at(1, 1, 'Resize to 25x10. q: close');
  output += at(2, 1, `Keyboard > ${pane}`);
  output += at(2, 2, `Tap / 1-9    ${view.page + 1}/${view.pages}`);
  for (const button of view.buttons) {
    if (typeof button.action !== 'number') continue;
    const index = button.action;
    const entry = entries[view.page * view.pageSize + index];
    output += `\x1b[${button.y};${button.x}H${selected === index ? '\x1b[7m' : '\x1b[100m'}`;
    output += fit(` ${index + 1} ${entry.label}`, button.width) + '\x1b[0m';
    output += `\x1b[${button.y + 1};${button.x}H\x1b[90m${fit(`   ${entry.key}`, button.width)}\x1b[0m`;
  }
  output += at(2, view.height - 4, status || 'Select to send one key.');
  output += at(2, view.height - 3, '[p] Prev  [n] Next');
  output += at(2, view.height - 1, `[r] Keep:${closeAfterSend ? 'OFF' : 'ON '}   [0] Exit`);
  return output;
}
