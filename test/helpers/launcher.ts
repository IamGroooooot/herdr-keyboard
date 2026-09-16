import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import type { SpawnSyncOptionsWithStringEncoding, SpawnSyncReturns } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestContext } from 'node:test';
import { writeNodeLauncher } from '../../scripts/node-launcher.js';
import type { Environment } from '../../src/environment.js';

interface LauncherFixture {
  readonly rootDirectory: string;
  readonly outputDirectory: string;
  readonly launcherPath: string;
}

interface LauncherRunOptions {
  readonly searchPath: string;
  readonly args?: ReadonlyArray<string>;
  readonly environment?: Environment;
}

const isWindows = process.platform === 'win32';
const nodeFilename = isWindows ? 'node.exe' : 'node';

export async function createLauncherFixture(t: TestContext): Promise<LauncherFixture> {
  const rootDirectory = await mkdtemp(join(tmpdir(), "keyboard 사용자's space !% "));
  t.after(() => rm(rootDirectory, { recursive: true, force: true }));
  const outputDirectory = join(rootDirectory, 'dist');
  const launcherPath = await writeNodeLauncher(outputDirectory, {
    nodeExecutable: process.execPath, platform: process.platform,
  });
  await writeFile(join(outputDirectory, 'cli.js'), `
    console.log(JSON.stringify({ args: process.argv.slice(2), target: process.env.HERDR_KEYBOARD_TARGET }));
    process.exitCode = Number(process.env.KEYBOARD_TEST_EXIT || 0);
  `);
  return { rootDirectory, outputDirectory, launcherPath };
}

export function runLauncher(
  launcherPath: string, { searchPath, args = [], environment = {} }: LauncherRunOptions,
): SpawnSyncReturns<string> {
  const options: SpawnSyncOptionsWithStringEncoding = {
    env: launcherEnvironment(searchPath, environment),
    encoding: 'utf8', timeout: 10_000, cwd: tmpdir(),
  };
  if (isWindows) {
    const commandInterpreter = process.env['ComSpec'] || 'C:\\Windows\\System32\\cmd.exe';
    const command = `""${launcherPath}" ${args.map((arg) => `"${arg}"`).join(' ')}"`;
    return spawnSync(commandInterpreter, ['/d', '/s', '/c', command], {
      ...options, windowsVerbatimArguments: true,
    });
  }
  return spawnSync(launcherPath, args, options);
}

export function assertLauncherInvocation(result: SpawnSyncReturns<string>, args: ReadonlyArray<string>): void {
  assert.equal(result.status, 0, result.error || result.stderr);
  const invocation: unknown = JSON.parse(result.stdout);
  assert.deepEqual(invocation, { args, target: 'w1:p2' });
}

export async function installTestNode(directory: string): Promise<string> {
  await mkdir(directory, { recursive: true });
  const nodeExecutable = join(directory, nodeFilename);
  if (isWindows) await copyFile(process.execPath, nodeExecutable);
  else await symlink(process.execPath, nodeExecutable);
  return nodeExecutable;
}

export async function installBrokenNodeShim(directory: string): Promise<void> {
  await mkdir(directory);
  const nodeExecutable = join(directory, nodeFilename);
  if (isWindows) {
    const systemRoot = process.env['SystemRoot'];
    assert.ok(systemRoot, 'Windows provides SystemRoot for the failing executable fixture');
    await copyFile(join(systemRoot, 'System32', 'where.exe'), nodeExecutable);
  } else {
    await writeFile(nodeExecutable, '#!/bin/sh\necho "No version is set for shim: node" >&2\nexit 1\n', {
      mode: 0o755,
    });
  }
}

function launcherEnvironment(searchPath: string, overrides: Environment): NodeJS.ProcessEnv {
  // Windows treats Path and PATH as the same variable; remove both before setting it.
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toUpperCase() !== 'PATH'));
  return { ...inherited, PATH: searchPath, HERDR_KEYBOARD_TARGET: 'w1:p2', ...overrides };
}
