import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface NodeLauncherOptions {
  readonly nodeExecutable: string;
  readonly platform: NodeJS.Platform;
}

export const minimumNodeMajor = 24;
const versionCheck = `process.exit(Number(process.versions.node.split('.')[0]) >= ${minimumNodeMajor} ? 0 : 1)`;
const recoveryMessage = `herdr-keyboard: Node.js ${minimumNodeMajor}+ could not be started. Reinstall the plugin from a shell where node and npm work, or run npm run build for a local link.`;

export async function writeNodeLauncher(outputDirectory: string, options: NodeLauncherOptions): Promise<string> {
  const contents = renderNodeLauncher(options);
  const launcherPath = join(outputDirectory, 'launch.cmd');
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(launcherPath, contents);
  await chmod(launcherPath, 0o755);
  return launcherPath;
}

export function renderNodeLauncher({ nodeExecutable, platform }: NodeLauncherOptions): string {
  if (/[\r\n\0]/u.test(nodeExecutable)) throw new Error('Unsupported Node executable path');
  return platform === 'win32' ? renderWindowsLauncher(nodeExecutable) : renderUnixLauncher(nodeExecutable);
}

function renderUnixLauncher(nodeExecutable: string): string {
  return `#!/bin/sh
# Generated on this machine. The .cmd name also supports Herdr actions on Windows.
launcher_dir=$(CDPATH= cd -- "\${0%/*}" && pwd) || exit 1
try_node() {
  keyboard_node=$1
  shift
  if [ -x "$keyboard_node" ] && "$keyboard_node" -e ${quoteShellArgument(versionCheck)} </dev/null >/dev/null 2>&1; then
    exec "$keyboard_node" "$launcher_dir/cli.js" "$@"
  fi
}
try_node ${quoteShellArgument(nodeExecutable)} "$@"
# The recorded installation may have been removed. Skip broken shims and old
# versions rather than stopping at the first node on PATH.
remaining_path=\${PATH-}
while [ -n "$remaining_path" ]; do
  node_dir=\${remaining_path%%:*}
  case "$remaining_path" in
    *:*) remaining_path=\${remaining_path#*:} ;;
    *) remaining_path= ;;
  esac
  [ -n "$node_dir" ] && try_node "$node_dir/node" "$@"
done
printf '%s\\n' ${quoteShellArgument(recoveryMessage)} >&2
exit 1
`;
}

function renderWindowsLauncher(nodeExecutable: string): string {
  return `@echo off
"%SystemRoot%\\System32\\chcp.com" 65001 >nul
setlocal DisableDelayedExpansion
set "keyboard_node=${escapeBatchValue(nodeExecutable)}"
call :check_node
if not errorlevel 1 goto run
for %%D in ("%PATH:;=" "%") do (
  set "keyboard_node=%%~D\\node.exe"
  call :check_node
  if not errorlevel 1 goto run
)
>&2 echo ${recoveryMessage}
exit /b 1
:check_node
if not exist "%keyboard_node%" exit /b 1
"%keyboard_node%" -e "${versionCheck}" <nul >nul 2>&1
exit /b %errorlevel%
:run
"%keyboard_node%" "%~dp0cli.js" %*
exit /b %errorlevel%
`.replaceAll('\n', '\r\n');
}

function quoteShellArgument(value: string): string {
  return "'" + value.replaceAll("'", "'\\''") + "'";
}

function escapeBatchValue(value: string): string {
  // Batch expands % even inside quotes. The launcher disables delayed expansion
  // separately so ! stays literal as well. Windows filenames cannot contain ".
  return value.replaceAll('%', '%%');
}
