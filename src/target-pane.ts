import { Data, Effect, Schema } from 'effect';
import type { Environment } from './environment.js';
import { PaneId } from './herdr.js';

export class TargetError extends Data.TaggedError('TargetError')<{
  readonly message: string;
  readonly cause: unknown;
}> {}

const PluginContext = Schema.Struct({ focused_pane_id: Schema.optional(Schema.NullOr(Schema.String)) });

export function resolveTargetPane(env: Environment): Effect.Effect<PaneId, TargetError> {
  return Schema.decodeUnknown(Schema.parseJson(PluginContext))(env['HERDR_PLUGIN_CONTEXT_JSON'] || '{}').pipe(
    Effect.mapError((cause) => new TargetError({ message: `Invalid Herdr context: ${cause.message}`, cause })),
    Effect.flatMap((context) => Schema.decodeUnknown(PaneId)(
      env['HERDR_KEYBOARD_TARGET'] || context.focused_pane_id || env['HERDR_PANE_ID'],
    ).pipe(Effect.mapError((cause) => new TargetError({
      message: 'No target pane. Open Keyboard from a Herdr pane.', cause,
    })))),
  );
}
