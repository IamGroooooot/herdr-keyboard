# Herdr Mobile Keyboard

모바일 키보드로 입력하기 어려운 키 조합을 Herdr 터미널에 보냅니다.

## 설치

Herdr 0.9.0 이상과 Node.js 20 이상이 필요합니다. 추가 의존성이나 빌드는 없습니다.

```sh
herdr plugin link /path/to/herdr-keyboard
```

## 자주 쓰는 조합

대상 터미널에서 **Keyboard: Choose shortcut** 액션을 실행합니다. 화면의 조합을 탭하거나 옆의 숫자를 누르면 해당 키를 한 번 보내고 닫힙니다. Enter는 필요 없습니다. `0`, `q`, Esc는 전송 없이 닫습니다.

```text
Mobile Keyboard

1  Opt + Down
2  Shift + Tab
3  Shift + Up
4  Opt + Up
```

터미널에서 직접 팝업을 열 수도 있습니다.

```sh
herdr plugin pane open --plugin herdr-keyboard --entrypoint picker
```

## 키 조합 만들기

팝업 위쪽 **Compose**를 탭하거나 `c`를 누릅니다.

1. **Ctrl / Alt / Shift**를 원하는 만큼 켜거나 끕니다.
2. **Up / Down / Left / Right / Tab / Enter** 등의 기본 키를 선택합니다.
3. 화면에 표시된 조합을 확인하고 **Send**를 누릅니다.

예: **Alt → Shift → Up → Send**로 `alt+shift+up`을 보냅니다. 기본 키를 선택하는 것만으로는 전송되지 않습니다. 터치가 없어도 `a`는 Alt, `s`는 Shift, `t`는 Ctrl을 전환하고 숫자로 기본 키를 고른 뒤 Enter로 전송할 수 있습니다.

목록에 없는 문자·숫자·기능 키는 **Key** (`k`)를 누르고 `a`, `7`, `f2`, `plus` 같은 키 이름을 입력하세요. 첫 Enter는 기본 키를 확정하고, 다음 Enter 또는 Send가 완성된 조합을 전송합니다. 입력 도중 Esc는 키 이름 입력을 취소합니다.

`c`로 자주 쓰는 조합 목록으로 돌아갑니다. **Keep:ON**이면 조합을 유지한 채 여러 번 전송할 수 있습니다. 조합기는 최소 25열 × 14행이 필요합니다.

대상 터미널의 Herdr 플러그인 액션에서 다음 중 하나를 실행합니다.

| 액션 | 전송 키 |
| --- | --- |
| Keyboard: Opt + Down | `alt+down` |
| Keyboard: Shift + Tab | `shift+tab` |
| Keyboard: Shift + Up | `shift+up` |

`Opt`는 `Alt`로 전달합니다. Herdr의 `pane send-keys`로 실제 터미널 키 입력을 보내며 Enter를 추가하지 않습니다. 키에 대한 동작은 대상 프로그램과 키 설정에 따라 다릅니다.

```sh
npm test
```

참고: [Herdr 플러그인 문서](https://herdr.dev/docs/plugins/)

## 선택과 전송

Alt/Shift + 방향 키, Shift + Tab/Enter, Esc, Tab, 방향 키, Ctrl + A/E/R/C/G/O 등 20개 조합을 제공합니다. 기존 첫 세 번호는 유지합니다. 페이지마다 번호를 다시 매기며 `n`/`p` 또는 화면의 Next/Prev로 이동합니다. 화면 크기에 따라 한 페이지의 항목 수가 달라집니다.

`r` 또는 Keep 버튼으로 팝업 유지 여부를 바꿉니다. Keep:ON이면 전송 후에도 팝업이 열려 있습니다. Ctrl + C를 대상에 보내려면 해당 항목을 선택하세요. 키보드에서 직접 누른 Ctrl + C는 팝업을 닫습니다.

터치는 SSH/터미널 앱이 마우스 이벤트를 전달할 때 동작합니다. 터치가 전달되지 않는 환경에서도 숫자 선택은 가능합니다. 최소 화면 크기는 25열 × 10행입니다.

## 사용자 설정

`herdr plugin config-dir herdr-keyboard`가 출력하는 디렉터리에 `keyboard.json`을 만들면 기본 목록을 교체할 수 있습니다. 파일이 없으면 기본 목록을 사용합니다.

```json
{
  "closeAfterSend": true,
  "shortcuts": [
    { "label": "Alt + Up", "key": "alt+up" },
    { "label": "Shift + Tab", "key": "shift+tab" },
    { "label": "Ctrl + Shift + Left", "key": "ctrl+shift+left" }
  ]
}
```

수정 키는 `ctrl`, `alt` (`opt`), `shift`를 조합합니다. 기본 키는 영문자/숫자, 방향 키, `enter`, `esc`, `tab`, `space`, `backspace`, `delete`, `insert`, `home`, `end`, `pageup`, `pagedown`, `plus`, `minus`, `f1`–`f12`를 지원합니다. 키 입력 해석은 Herdr와 대상 CLI가 담당합니다. 설정은 다음 팝업 실행부터 적용합니다.

자동 테스트는 대상 pane 고정, 키 매핑, 터치/페이지/화면 크기 변경, 붙여넣기 무시, 한 번만 전송, 취소, 오류 처리를 검증합니다. 실제 모바일 SSH 앱의 터치 전달과 Codex/Claude의 반응은 대상 환경에서 확인해야 합니다. 대상 프로그램을 연 뒤 팝업에서 각 번호를 눌러 물리 키보드의 같은 조합과 동작을 비교하세요.
