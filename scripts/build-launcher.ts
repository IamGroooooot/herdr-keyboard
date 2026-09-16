import { realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { minimumNodeMajor, writeNodeLauncher } from './node-launcher.js';

await buildNodeLauncher();

async function buildNodeLauncher(): Promise<void> {
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < minimumNodeMajor) throw new Error(`Node.js ${minimumNodeMajor}+ is required`);

  // npm runs in the installation shell, where the user's Node is available.
  await writeNodeLauncher(fileURLToPath(new URL('../dist/', import.meta.url)), {
    nodeExecutable: await realpath(process.execPath),
    platform: process.platform,
  });
}
