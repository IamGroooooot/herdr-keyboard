import assert from 'node:assert/strict';
import { rename } from 'node:fs/promises';
import { basename, delimiter, join } from 'node:path';
import { test } from 'node:test';
import { writeNodeLauncher } from '../scripts/node-launcher.js';
import {
  assertLauncherInvocation, createLauncherFixture, installBrokenNodeShim, installTestNode, runLauncher,
} from './helpers/launcher.js';

test('the build records a usable Node even when the server PATH has no Node', async (t) => {
  // Arrange
  const { launcherPath } = await createLauncherFixture(t);
  const args = ['send', 'ctrl+shift+left', 'two words'];

  // Act
  const result = runLauncher(launcherPath, { searchPath: '', args });

  // Assert
  assertLauncherInvocation(result, args);
});

test('a recorded Node path containing shell characters stays literal', async (t) => {
  // Arrange
  const { rootDirectory, outputDirectory, launcherPath } = await createLauncherFixture(t);
  const nodeExecutable = await installTestNode(join(rootDirectory, "node 사용자's !% installation"));
  await writeNodeLauncher(outputDirectory, { nodeExecutable, platform: process.platform });

  // Act
  const result = runLauncher(launcherPath, { searchPath: '', args: ['open'] });

  // Assert
  assertLauncherInvocation(result, ['open']);
});

test('the launcher still finds the CLI after the built plugin is moved', async (t) => {
  // Arrange
  const { rootDirectory, outputDirectory, launcherPath } = await createLauncherFixture(t);
  const installedDirectory = join(rootDirectory, 'installed dist');
  await rename(outputDirectory, installedDirectory);

  // Act
  const result = runLauncher(join(installedDirectory, basename(launcherPath)), {
    searchPath: '', args: ['open'],
  });

  // Assert
  assertLauncherInvocation(result, ['open']);
});

test('a stale recorded Node falls back past a broken PATH entry', async (t) => {
  // Arrange
  const { rootDirectory, outputDirectory, launcherPath } = await createLauncherFixture(t);
  await writeNodeLauncher(outputDirectory, {
    nodeExecutable: join(rootDirectory, 'removed-node'), platform: process.platform,
  });
  const brokenShimDirectory = join(rootDirectory, 'broken-shim');
  const validNodeDirectory = join(rootDirectory, 'valid-node');
  await installBrokenNodeShim(brokenShimDirectory);
  await installTestNode(validNodeDirectory);

  // Act
  const result = runLauncher(launcherPath, {
    searchPath: [brokenShimDirectory, validNodeDirectory].join(delimiter), args: ['open'],
  });

  // Assert
  assertLauncherInvocation(result, ['open']);
  assert.equal(result.stderr, '');
});

test('a missing compatible Node reports how to repair the installation', async (t) => {
  // Arrange
  const { rootDirectory, outputDirectory, launcherPath } = await createLauncherFixture(t);
  await writeNodeLauncher(outputDirectory, {
    nodeExecutable: join(rootDirectory, 'removed-node'), platform: process.platform,
  });

  // Act
  const result = runLauncher(launcherPath, { searchPath: '' });

  // Assert
  assert.equal(result.status, 1, result.error);
  assert.match(result.stderr, /Node.js 24\+ could not be started/);
  assert.match(result.stderr, /Reinstall the plugin/);
  assert.equal(result.stdout, '');
});

test('an application failure is returned without retrying the action', async (t) => {
  // Arrange
  const { launcherPath } = await createLauncherFixture(t);

  // Act
  const result = runLauncher(launcherPath, {
    searchPath: '', args: ['send', 'ctrl+c'], environment: { KEYBOARD_TEST_EXIT: '7' },
  });

  // Assert
  assert.equal(result.status, 7, result.error || result.stderr);
  assert.equal(result.stdout.trim().split('\n').length, 1);
  assert.equal(result.stderr, '');
});
