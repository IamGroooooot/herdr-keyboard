import type { InputEvent } from '../domain/actions.js';

type SkippedInput = 'paste' | 'osc' | 'control-string' | 'csi';
export type InputState =
  | { readonly _tag: 'Reading'; readonly pending: string }
  | { readonly _tag: 'Skipping'; readonly pending: string; readonly kind: SkippedInput };
export type ParseStep =
  | { readonly _tag: 'NeedInput'; readonly state: InputState }
  | { readonly _tag: 'Escape' }
  | { readonly _tag: 'Continue'; readonly state: InputState; readonly event: InputEvent | null };

// Consume one complete event or control sequence; leave partial input for the next read.
export function parseInput(state: InputState): ParseStep {
  const { pending } = state;
  if (!pending) return { _tag: 'NeedInput', state };
  if (state._tag === 'Skipping') return skipPayload(state);
  if (pending === '\x1b') return { _tag: 'Escape' };
  if (pending.startsWith('\x1b[M')) return parseClassicMouse(pending);
  if (pending.startsWith('\x1b[')) return parseControlSequence(pending);
  if (pending.startsWith('\x1bO')) return parseApplicationCursor(pending);
  if (pending.startsWith('\x1b')) return skipEscapeSequence(pending);
  const char = pending.charAt(0);
  return consumed(pending.slice(1), { type: 'key', key: keyNames.get(char) ?? char });
}

function parseClassicMouse(pending: string): ParseStep {
  if (pending.length < 6) return needInput(pending);
  const button = pending.charCodeAt(3) - 32;
  const event: InputEvent | null = button === 0
    ? { type: 'click', x: pending.charCodeAt(4) - 32, y: pending.charCodeAt(5) - 32 }
    : null;
  return consumed(pending.slice(6), event);
}

function parseControlSequence(pending: string): ParseStep {
  const sequence = pending.match(/^\x1b\[[0-?]*[ -/]*[@-~]/)?.[0];
  if (!sequence) {
    return pending.length > maxControlSequenceLength
      ? { _tag: 'NeedInput', state: { _tag: 'Skipping', pending: '', kind: 'csi' } }
      : needInput(pending);
  }
  const rest = pending.slice(sequence.length);
  if (sequence === '\x1b[200~') return skip(rest, 'paste');
  const mouse = sequence.match(/^\x1b\[<0;(\d+);(\d+)M$/);
  if (mouse) return consumed(rest, { type: 'click', x: Number(mouse[1]), y: Number(mouse[2]) });
  const key = keyNames.get(sequence);
  return consumed(rest, key ? { type: 'key', key } : null);
}

function parseApplicationCursor(pending: string): ParseStep {
  if (pending.length < 3) return needInput(pending);
  const key = keyNames.get(pending.slice(0, 3));
  return consumed(pending.slice(3), key ? { type: 'key', key } : null);
}

function skipEscapeSequence(pending: string): ParseStep {
  const introducer = pending.charAt(1);
  const rest = pending.slice(2);
  if (introducer === ']') return skip(rest, 'osc');
  if ('PX^_'.includes(introducer)) return skip(rest, 'control-string');
  return consumed(rest);
}

// Retain only a possible terminator prefix, never the full payload.
function skipPayload(state: Extract<InputState, { readonly _tag: 'Skipping' }>): ParseStep {
  const rule = skipRules[state.kind];
  const end = rule.terminator.exec(state.pending);
  return end === null
    ? { _tag: 'NeedInput', state: { ...state,
      pending: rule.retain === 0 ? '' : state.pending.slice(-rule.retain),
    } }
    : consumed(state.pending.slice(end.index + end[0].length));
}

function consumed(pending: string, event: InputEvent | null = null): ParseStep {
  return { _tag: 'Continue', state: { _tag: 'Reading', pending }, event };
}

function needInput(pending: string): ParseStep {
  return { _tag: 'NeedInput', state: { _tag: 'Reading', pending } };
}

function skip(pending: string, kind: SkippedInput): ParseStep {
  return { _tag: 'Continue', state: { _tag: 'Skipping', pending, kind }, event: null };
}

const maxControlSequenceLength = 128;
const keyNames: ReadonlyMap<string, string> = new Map([
  ['\x1b[A', 'up'], ['\x1b[B', 'down'], ['\x1b[C', 'right'], ['\x1b[D', 'left'],
  ['\x1bOA', 'up'], ['\x1bOB', 'down'], ['\x1bOC', 'right'], ['\x1bOD', 'left'],
  ['\x1b[5~', 'previous'], ['\x1b[6~', 'next'], ['\r', 'enter'], ['\n', 'enter'],
  ['\x03', 'close'], ['\x04', 'close'], ['\x7f', 'backspace'], ['\b', 'backspace'],
]);
const skipRules = {
  paste: { terminator: /\x1b\[201~/, retain: 5 },
  osc: { terminator: /\x07|\x1b\\|[\x18\x1a]/, retain: 1 },
  'control-string': { terminator: /\x1b\\|[\x18\x1a]/, retain: 1 },
  csi: { terminator: /[@-~]|[\x18\x1a]/, retain: 0 },
} as const satisfies Readonly<Record<SkippedInput, { readonly terminator: RegExp; readonly retain: number }>>;
