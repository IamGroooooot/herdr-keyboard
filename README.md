# Herdr Mobile Keyboard

모바일 키보드로 입력하기 어려운 키 조합을 Herdr 터미널에 보내는 플러그인입니다. Codex CLI, Claude Code, 셸 등에서 사용할 수 있습니다.

자주 쓰는 조합을 목록에서 선택하거나, Ctrl / Alt / Shift와 방향 키 등을 직접 조합해 전송합니다.

## 설치

Herdr 0.9.0 이상과 Node.js 20 이상이 필요합니다. 별도 패키지 설치나 빌드 과정은 없습니다.

저장소를 내려받은 뒤 플러그인 디렉터리를 등록합니다.

```sh
herdr plugin link /path/to/herdr-keyboard
```

## 실행

입력을 보낼 터미널을 선택하고 Herdr의 **Keyboard: Choose shortcut** 액션을 실행합니다. 명령으로 열 수도 있습니다.

```sh
herdr plugin pane open --plugin herdr-keyboard --entrypoint picker
```

팝업을 열 때 선택한 터미널로 키를 보냅니다. 기본 설정에서는 한 번 전송한 뒤 팝업이 닫힙니다.

## 자주 쓰는 조합 선택

원하는 항목을 탭하거나 화면에 표시된 숫자를 누릅니다. Enter를 누를 필요는 없습니다.

기본 목록에는 다음 20개 조합이 있습니다.

| 종류 | 조합 |
| --- | --- |
| Alt + 방향 키 | Alt + ↑ / ↓ / ← / → |
| Shift + 방향 키 | Shift + ↑ / ↓ / ← / → |
| Shift + Tab / Enter | Shift + Tab, Shift + Enter |
| 단일 키 | Esc, Tab, ↑, ↓ |
| Ctrl 조합 | Ctrl + A / E / R / C / G / O |

목록의 첫 세 항목은 **Opt + Down**, **Shift + Tab**, **Shift + Up**입니다. `Opt`는 `Alt`로 전송합니다.

화면 크기에 따라 한 페이지에 표시되는 항목 수가 달라집니다. **Next** (`n`)와 **Prev** (`p`)로 페이지를 이동하며, 숫자는 각 페이지의 항목을 가리킵니다.

## 키 조합 만들기

팝업 위쪽의 **Compose**를 탭하거나 `c`를 누릅니다.

1. **Ctrl / Alt / Shift** 중 필요한 키를 켭니다. 다시 누르면 꺼집니다.
2. 방향 키, Tab, Enter 등 함께 보낼 기본 키를 선택합니다.
3. 표시된 조합을 확인하고 **Send** 또는 Enter를 누릅니다.

예를 들어 **Alt → Shift → Up → Send** 순서로 선택하면 `Alt + Shift + ↑`를 보냅니다. 키를 선택하는 동안에는 전송하지 않습니다.

터치 없이도 다음 키로 조작할 수 있습니다.

| 키 | 동작 |
| --- | --- |
| `t` | Ctrl 켜기 / 끄기 |
| `a` | Alt 켜기 / 끄기 |
| `s` | Shift 켜기 / 끄기 |
| `1`–`9` | 화면의 기본 키 선택 |
| Enter | 완성된 조합 전송 |
| `c` | 자주 쓰는 조합 목록으로 돌아가기 |

### 문자, 숫자, 기능 키 조합

**Key** (`k`)를 누르고 `a`, `7`, `f2`, `plus` 같은 키 이름을 입력합니다.

첫 Enter는 기본 키를 확정합니다. 다음 Enter 또는 **Send**가 조합을 전송합니다. 키 이름을 입력하는 도중 Esc를 누르면 입력을 취소합니다.

## 반복 전송과 닫기

**Keep** (`r`)을 눌러 **Keep:ON**으로 바꾸면 전송 후에도 팝업이 열려 있습니다. 조합기에서는 선택한 키 조합도 유지됩니다.

목록이나 조합 화면에서 `0`, `q`, Esc를 누르면 전송 없이 닫힙니다. Ctrl + C도 팝업을 닫지만, 키 이름 입력 중에는 입력만 취소합니다. 대상 터미널에 Ctrl + C를 보내려면 목록에서 해당 항목을 선택하거나 조합기로 전송하세요.

## 팝업 없이 전송

다음 Herdr 플러그인 액션은 선택한 터미널에 해당 조합을 바로 보냅니다.

| 액션 | 전송 키 |
| --- | --- |
| Keyboard: Opt + Down | Alt + ↓ |
| Keyboard: Shift + Tab | Shift + Tab |
| Keyboard: Shift + Up | Shift + ↑ |

## 사용자 설정

다음 명령으로 설정 디렉터리를 확인합니다.

```sh
herdr plugin config-dir herdr-keyboard
```

해당 디렉터리에 `keyboard.json`을 만들면 기본 목록과 전송 후 닫기 여부를 바꿀 수 있습니다.

```json
{
  "closeAfterSend": true,
  "shortcuts": [
    { "label": "Alt + ↑", "key": "alt+up" },
    { "label": "Shift + Tab", "key": "shift+tab" },
    { "label": "Ctrl + Shift + ←", "key": "ctrl+shift+left" }
  ]
}
```

- `closeAfterSend`: `true`이면 전송 후 닫고, `false`이면 열린 상태를 유지합니다.
- `shortcuts`: 표시할 목록입니다. `label`은 화면에 표시할 이름, `key`는 전송할 조합입니다. 지정하면 기본 목록을 대체합니다.

설정 파일이 없으면 기본값을 사용합니다. 변경한 설정은 다음에 팝업을 열 때 적용됩니다.

조합은 `ctrl+shift+left`처럼 `+`로 연결합니다. 수정 키는 `ctrl`, `alt` (`opt`), `shift`를 지원합니다. 기본 키로 사용할 수 있는 값은 다음과 같습니다.

| 종류 | 값 |
| --- | --- |
| 영문자와 숫자 | `a`–`z`, `0`–`9` |
| 방향 키 | `up`, `down`, `left`, `right` |
| 입력과 편집 | `enter`, `esc`, `tab`, `space`, `backspace`, `delete`, `insert` |
| 이동 | `home`, `end`, `pageup`, `pagedown` |
| 기호 | `plus`, `minus` |
| 기능 키 | `f1`–`f12` |

## 사용 환경

터치는 SSH 또는 터미널 앱이 마우스 이벤트를 전달할 때 동작합니다. 터치가 전달되지 않는 환경에서는 숫자로 선택할 수 있습니다. 목록 화면은 최소 25열 × 10행, 조합 화면은 25열 × 14행이 필요합니다.

키는 Herdr의 `pane send-keys`로 전송하며, Enter를 자동으로 덧붙이지 않습니다. 같은 조합이라도 대상 프로그램과 키 설정에 따라 동작이 달라집니다.

## 개발과 검증

```sh
npm test
```

자동 테스트는 전송 대상 유지, 키 조합, 터치 입력, 페이지 이동, 화면 크기 변경, 붙여넣기 무시, 취소와 오류 처리를 확인합니다.

실제 모바일 앱의 터치 전달과 Codex CLI 또는 Claude Code의 반응은 해당 환경에서 확인해야 합니다. 같은 조합을 물리 키보드로 입력했을 때의 동작과 비교하세요.

플러그인 구조와 API는 [Herdr 플러그인 문서](https://herdr.dev/docs/plugins/)를 참고하세요.
