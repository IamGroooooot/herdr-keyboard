import type { InputEvent } from '../domain/actions.js';

// Decode complete terminal events, including mouse reports split across reads.
// Unknown escape sequences and bracketed paste must never become number shortcuts.
export function createInputDecoder(emit: (event: InputEvent) => void) {
  let pending = '';
  let skipping: SkippedInput | undefined;
  let escapeTimer: ReturnType<typeof setTimeout> | undefined;
  const keys: Readonly<Record<string, string>> = { '\x1b[A': 'up', '\x1b[B': 'down', '\x1b[C': 'right', '\x1b[D': 'left',
    '\x1b[5~': 'previous', '\x1b[6~': 'next', '\r': 'enter', '\n': 'enter',
    '\x03': 'close', '\x04': 'close', '\x7f': 'backspace', '\b': 'backspace' };

  return { feed, dispose() { clearTimeout(escapeTimer); pending = ''; } };

  function feed(chunk: Buffer | string) {
    clearTimeout(escapeTimer);
    pending += Buffer.isBuffer(chunk) ? chunk.toString('latin1') : chunk;
    while (pending) {
      if (skipping !== undefined) {
        const result = skipPayload(pending, skipping);
        pending = result.pending;
        if (result._tag === 'Waiting') return;
        skipping = undefined;
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
          if (pending.length > 128) { pending = ''; skipping = 'csi'; }
          return;
        }
        pending = pending.slice(sequence.length);
        if (sequence === '\x1b[200~') { skipping = 'paste'; continue; }
        const mouse = sequence.match(/^\x1b\[<0;(\d+);(\d+)M$/);
        if (mouse) emit({ type: 'click', x: Number(mouse[1]), y: Number(mouse[2]) });
        else if (keys[sequence]) emit({ type: 'key', key: keys[sequence] });
        continue;
      }
      if (pending.startsWith('\x1bO')) {
        if (pending.length < 3) return;
        const sequence = pending.slice(0, 3);
        pending = pending.slice(3);
        const cursorKeys: Readonly<Record<string, string>> = { A: 'up', B: 'down', C: 'right', D: 'left' };
        const key = cursorKeys[sequence.charAt(2)];
        if (key) emit({ type: 'key', key });
        continue;
      }
      if (pending[0] === '\x1b') {
        const introducer = pending.charAt(1);
        if (introducer === ']') skipping = 'osc';
        else if ('PX^_'.includes(introducer)) skipping = 'control-string';
        pending = pending.slice(2);
        continue;
      }
      const char = pending.charAt(0);
      pending = pending.slice(1);
      emit({ type: 'key', key: keys[char] || char });
    }
  }
}

type SkippedInput = 'paste' | 'osc' | 'control-string' | 'csi';
type SkipResult =
  | { readonly _tag: 'Waiting'; readonly pending: string }
  | { readonly _tag: 'Finished'; readonly pending: string };

// Keep only a possible terminator prefix between reads, never the full payload.
function skipPayload(pending: string, kind: SkippedInput): SkipResult {
  const rule = skipRules[kind];
  const end = rule.terminator.exec(pending);
  return end === null
    ? { _tag: 'Waiting', pending: rule.retain === 0 ? '' : pending.slice(-rule.retain) }
    : { _tag: 'Finished', pending: pending.slice(end.index + end[0].length) };
}

const skipRules = {
  paste: { terminator: /\x1b\[201~/, retain: 5 },
  osc: { terminator: /\x07|\x1b\\|[\x18\x1a]/, retain: 1 },
  'control-string': { terminator: /\x1b\\|[\x18\x1a]/, retain: 1 },
  csi: { terminator: /[@-~]|[\x18\x1a]/, retain: 0 },
} as const satisfies Readonly<Record<SkippedInput, { readonly terminator: RegExp; readonly retain: number }>>;
