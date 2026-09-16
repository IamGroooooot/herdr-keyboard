// Decode complete terminal events, including mouse reports split across reads.
// Unknown escape sequences and bracketed paste must never become number shortcuts.
export function createInputDecoder(emit) {
  let pending = '';
  let pasting = false;
  let escapeTimer;
  const keys = { '\x1b[A': 'up', '\x1b[B': 'down', '\x1b[C': 'right', '\x1b[D': 'left',
    '\x1b[5~': 'previous', '\x1b[6~': 'next', '\r': 'enter', '\n': 'enter',
    '\x03': 'close', '\x04': 'close' };

  function feed(chunk) {
    clearTimeout(escapeTimer);
    pending += Buffer.isBuffer(chunk) ? chunk.toString('latin1') : chunk;
    while (pending) {
      if (pasting) {
        const end = pending.indexOf('\x1b[201~');
        if (end < 0) { pending = pending.slice(-5); return; }
        pending = pending.slice(end + 6);
        pasting = false;
        continue;
      }
      if (pending === '\x1b') {
        escapeTimer = setTimeout(() => { pending = ''; emit({ type: 'key', key: 'close' }); }, 80);
        return;
      }
      if (pending.startsWith('\x1b[M')) {
        if (pending.length < 6) return;
        const button = pending.charCodeAt(3) - 32;
        const x = pending.charCodeAt(4) - 32;
        const y = pending.charCodeAt(5) - 32;
        pending = pending.slice(6);
        if (button === 0) emit({ type: 'click', x, y });
        continue;
      }
      if (pending.startsWith('\x1b[')) {
        const sequence = pending.match(/^\x1b\[[0-?]*[ -/]*[@-~]/)?.[0];
        if (!sequence) {
          if (pending.length > 128) pending = '';
          return;
        }
        pending = pending.slice(sequence.length);
        if (sequence === '\x1b[200~') { pasting = true; continue; }
        const mouse = sequence.match(/^\x1b\[<0;(\d+);(\d+)M$/);
        if (mouse) emit({ type: 'click', x: Number(mouse[1]), y: Number(mouse[2]) });
        else if (keys[sequence]) emit({ type: 'key', key: keys[sequence] });
        continue;
      }
      if (pending.startsWith('\x1bO')) {
        if (pending.length < 3) return;
        const sequence = pending.slice(0, 3);
        pending = pending.slice(3);
        const key = { A: 'up', B: 'down', C: 'right', D: 'left' }[sequence[2]];
        if (key) emit({ type: 'key', key });
        continue;
      }
      if (pending[0] === '\x1b') { pending = pending.slice(2); continue; }
      const char = pending[0];
      pending = pending.slice(1);
      emit({ type: 'key', key: keys[char] || char });
    }
  }
  return { feed, dispose() { clearTimeout(escapeTimer); pending = ''; } };
}
