import { Effect } from 'effect';
import { normalizeKey } from './domain/keys.js';
import { Herdr, herdrLayer, targetPane } from './herdr.js';
import { pickShortcut } from './picker.js';

const program = Effect.gen(function* () {
  const mode = process.argv[2];
  if (mode === 'send') {
    const pane = yield* targetPane(process.env);
    const key = yield* normalizeKey(process.argv[3]);
    const herdr = yield* Herdr;
    yield* herdr.sendKey(pane, key);
  } else if (mode === 'open') {
    const pane = yield* targetPane(process.env);
    const herdr = yield* Herdr;
    yield* herdr.openPicker(pane);
  } else {
    yield* pickShortcut();
  }
});

await Effect.runPromise(program.pipe(
  Effect.provide(herdrLayer()),
  Effect.catchAll((error) => Effect.sync(() => { console.error(error.message); process.exitCode = 1; })),
));
