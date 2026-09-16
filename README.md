# Herdr Mobile Keyboard

[한국어](README.ko.md)

Send hard-to-type key combinations from a mobile keyboard to Codex CLI, Claude Code, or any terminal running in Herdr.

Pick a shortcut such as **Alt + ↑** or **Shift + Tab**, or build your own:

```text
[Ctrl] + [Shift] + [←]  →  [Send]  →  ctrl+shift+left
```

## Install

Requires **Herdr 0.9.0+**, **Node.js 20+**, npm, and Git.

```sh
herdr plugin install IamGroooooot/herdr-keyboard
```

Approve the installation. Herdr downloads the repository, installs dependencies, and builds the plugin. To update a GitHub installation, run the same command again.

## Use

Select the target terminal. Run **Keyboard: Choose shortcut** from Herdr's actions, or use this command:

```sh
herdr plugin action invoke herdr-keyboard.open
```

The picker sends keys to the target terminal selected when the picker opened. By default, the picker closes after one successful send.

These controls apply outside key-name entry.

| Control | Action |
| --- | --- |
| In the shortcut list: tap a shortcut / `1`–`9` | Send the shortcut immediately |
| **Compose** / `m` | Switch between the shortcut list and Compose |
| `c` / `a` / `s` in Compose | Toggle Ctrl / Alt / Shift |
| Tap a base key / `1`–`9` in Compose | Select the base key without sending |
| **Send** / Enter in Compose | Send the displayed combination |
| **Key** / `k` in Compose | Enter a key name such as `a`, `7`, `f2`, or `plus` |
| **Prev** / `p`, **Next** / `n` | Change pages |
| **Keep** / `r` | Toggle keeping the picker open after sending |
| `0`, `q`, Esc, Ctrl + C | Close the picker |

During key-name entry, the first Enter confirms the base key. The next Enter sends the combination. Esc or Ctrl + C cancels key-name entry.

Touch requires a terminal app that forwards mouse events. Use `1`–`9` to select without touch.

## Open with `prefix+k`

Add this to Herdr's `~/.config/herdr/config.toml`. On Windows, use `%APPDATA%\herdr\config.toml`:

```toml
[[keys.command]]
key = "prefix+k"
type = "plugin_action"
command = "herdr-keyboard.open"
description = "Open mobile keyboard"
```

Run **reload config** from Herdr's global menu. With the default prefix, press **Ctrl + B**, release, then press **K**.

`prefix+k` also defaults to moving to the pane above. Reassign `focus_pane_up` under `[keys]`, or set it to `""` to remove the conflict.

`plugin_action` runs the action ID in `command`. Use any of these IDs in a keybinding or with `herdr plugin action invoke`:

| Action ID | Result |
| --- | --- |
| `herdr-keyboard.open` | Open the picker |
| `herdr-keyboard.opt-down` | Send Alt + ↓ directly |
| `herdr-keyboard.shift-tab` | Send Shift + Tab directly |
| `herdr-keyboard.shift-up` | Send Shift + ↑ directly |

<details>
<summary>Custom shortcuts</summary>

Find the configuration directory:

```sh
herdr plugin config-dir herdr-keyboard
```

Create `keyboard.json` there:

```json
{
  "closeAfterSend": false,
  "shortcuts": [
    { "label": "Alt + ↑", "key": "alt+up" },
    { "label": "Shift + Tab", "key": "shift+tab" },
    { "label": "Ctrl + Shift + ←", "key": "ctrl+shift+left" }
  ]
}
```

`shortcuts` replaces the default shortcut list. Set `closeAfterSend` to `false` to keep the picker open after sending. Changes apply the next time the picker opens. `opt` and `alt` refer to the same modifier.

</details>

<details>
<summary>Local development</summary>

```sh
git clone https://github.com/IamGroooooot/herdr-keyboard.git
cd herdr-keyboard
npm ci
npm run build
herdr plugin link .
```

After editing the code, run `npm run check`. `plugin link` does not build automatically.

</details>
