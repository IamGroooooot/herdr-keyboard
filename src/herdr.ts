import { Context, Data, Schema } from 'effect';
import type { Effect } from 'effect';
import type { KeyChord } from './domain/keys.js';

export const PaneId = Schema.String.pipe(Schema.minLength(1), Schema.brand('PaneId'));
export type PaneId = typeof PaneId.Type;

export class HerdrError extends Data.TaggedError('HerdrError')<{
  readonly reason: 'unavailable' | 'timeout' | 'failed';
  readonly message: string;
  readonly cause?: unknown;
}> {}

// The picker depends on this contract; only the CLI supplies the process adapter.
export class Herdr extends Context.Tag('herdr-keyboard/Herdr')<Herdr, {
  readonly sendKey: (pane: PaneId, key: KeyChord) => Effect.Effect<void, HerdrError>;
  readonly openPicker: (pane: PaneId) => Effect.Effect<void, HerdrError>;
}>() {}
