# Herdr Mobile Keyboard

[English](README.md)

모바일 키보드로 입력하기 어려운 키 조합을 Herdr에서 실행 중인 Codex CLI, Claude Code, 터미널에 보내는 플러그인입니다.

**Alt + ↑**, **Shift + Tab** 같은 단축키를 선택하거나 직접 조합합니다.

```text
[Ctrl] + [Shift] + [←]  →  [Send]  →  ctrl+shift+left
```

## 설치

**Herdr 0.9.0 이상**, **Node.js 24 LTS 이상**, npm, Git이 필요합니다.

```sh
herdr plugin install IamGroooooot/herdr-keyboard
```

설치를 승인합니다. Herdr가 저장소를 내려받고 의존성 설치와 빌드를 실행합니다. GitHub로 설치한 플러그인은 같은 명령을 다시 실행해 업데이트합니다.

설치할 셸에서 `node`와 `npm`이 실행되어야 합니다. 빌드 시 사용한 Node의 실제 경로를 저장하므로, nvm·mise 등을 사용하는 셸과 Herdr 서버의 PATH가 달라도 실행할 수 있습니다. 사용자 전역 설정은 변경하지 않습니다.

저장된 Node가 삭제되면 서버 PATH에서 실행 가능한 Node 24 이상을 찾습니다. 찾지 못하면 Node를 사용할 수 있는 셸에서 위 설치 명령을 다시 실행합니다. 로컬로 연결했다면 `npm run build`로 경로를 갱신합니다.

## 사용

키를 보낼 대상 터미널을 선택합니다. Herdr의 **Keyboard: Choose shortcut** 액션이나 다음 명령으로 picker를 엽니다.

```sh
herdr plugin action invoke herdr-keyboard.open
```

키 전송 대상은 picker를 열 때 선택한 터미널입니다. 기본 설정에서는 한 번 전송에 성공하면 picker가 닫힙니다.

다음 조작은 키 이름을 입력하고 있지 않을 때 적용됩니다.

| 조작 | 동작 |
| --- | --- |
| 단축키 목록에서 단축키 탭 / `1`–`9`, `0` | 단축키 즉시 전송 |
| 단축키 목록에서 방향키, Enter | 방향에 맞는 버튼으로 이동한 뒤 전송 |
| **Compose** / `m` | 단축키 목록과 Compose 전환 |
| Compose에서 `c` / `a` / `s` | Ctrl / Alt / Shift 켜기·끄기 |
| Compose에서 기본 키 탭 / `1`–`9`, `0` | 전송 없이 기본 키 선택 |
| Compose에서 **Send** / Enter | 표시된 키 조합 전송 |
| Compose에서 **Key** / `k` | `a`, `7`, `f2`, `plus` 같은 키 이름 입력 |
| **Prev** / `p`, **Next** / `n` | 페이지 이동 |
| **Keep** / `r` | 전송 후 picker를 열어둘지 전환 |
| `q`, Esc, Ctrl + C | picker 닫기 |

키 이름 입력 중에는 첫 Enter로 기본 키를 확정합니다. 다음 Enter로 키 조합을 전송합니다. Esc나 Ctrl + C는 키 이름 입력만 취소합니다.

터치는 마우스 이벤트를 전달하는 터미널 앱에서 동작합니다. 터치 없이 선택하려면 `1`–`9`를 누릅니다. 열 번째 항목이 보이면 `0`으로 선택합니다.

## `prefix+k`로 열기

Herdr의 `~/.config/herdr/config.toml`에 추가합니다. Windows에서는 `%APPDATA%\herdr\config.toml`입니다.

```toml
[[keys.command]]
key = "prefix+k"
type = "plugin_action"
command = "herdr-keyboard.open"
description = "모바일 키보드 열기"
```

Herdr 전체 메뉴에서 **reload config**를 실행합니다. 기본 prefix에서는 **Ctrl + B**를 눌렀다 놓습니다. 다음으로 **K**를 눌러 picker를 엽니다.

`prefix+k`는 기본 ‘위쪽 pane으로 이동’ 키와 겹칩니다. `[keys]`의 `focus_pane_up`을 다른 키로 바꾸거나 `""`로 비워 충돌을 해소합니다.

`plugin_action`은 `command`의 액션 ID를 실행합니다. 다음 ID를 키 바인딩이나 `herdr plugin action invoke`에 사용할 수 있습니다.

| 액션 ID | 동작 |
| --- | --- |
| `herdr-keyboard.open` | picker 열기 |
| `herdr-keyboard.opt-up` | Alt + ↑ 바로 전송 |
| `herdr-keyboard.shift-tab` | Shift + Tab 바로 전송 |
| `herdr-keyboard.shift-up` | Shift + ↑ 바로 전송 |

<details>
<summary>사용자 단축키 설정</summary>

설정 디렉터리를 확인합니다.

```sh
herdr plugin config-dir herdr-keyboard
```

해당 디렉터리에 `keyboard.json`을 만듭니다.

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

`shortcuts`는 기본 단축키 목록을 대체합니다. `closeAfterSend`를 `false`로 설정하면 전송 후에도 picker가 열려 있습니다. 변경은 다음에 picker를 열 때 적용됩니다. `opt`와 `alt`는 같은 수정 키입니다.

</details>

<details>
<summary>로컬 개발</summary>

```sh
git clone https://github.com/IamGroooooot/herdr-keyboard.git
cd herdr-keyboard
npm ci
npm run build
herdr plugin link .
```

코드를 수정한 뒤 `npm run check`를 실행합니다. `plugin link`는 자동으로 빌드하지 않습니다.

코드는 다음 책임으로 나뉩니다.

- `domain/`: 키 이름 검증과 키 조합. Herdr나 터미널 I/O에 의존하지 않습니다.
- `picker-actions.ts`, `picker-state.ts`: 화면 조작과 상태 전이. `picker.ts`가 전송과 화면 갱신을 실행합니다.
- `herdr.ts`: 서비스 계약과 pane ID. `herdr-client.ts`는 외부 명령 실행, `target-pane.ts`는 대상 pane 해석을 담당합니다.
- `terminal/`: 입력 디코딩, 배치, 렌더링, 터미널 자원 관리. `scripts/`는 설치 시 실행기 생성을 담당합니다.

오류는 키·설정·대상 pane·Herdr 명령·터미널 경계에서 구분합니다. 외부 오류의 원인은 `cause`로 보존하고, 전송 실패는 picker 안에 표시합니다. 테스트는 Arrange–Act–Assert 순서로 작성하며, 생성된 문자열보다 실행 결과를 검증합니다.

</details>
