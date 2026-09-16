# Herdr Mobile Keyboard

모바일 키보드로 입력하기 어려운 키 조합을 Herdr 터미널에 보냅니다.

## 설치

Herdr 0.9.0 이상과 Node.js 20 이상이 필요합니다. 추가 의존성이나 빌드는 없습니다.

```sh
herdr plugin link /path/to/herdr-keyboard
```

## PoC

대상 터미널에서 **Keyboard: Choose shortcut** 액션을 실행합니다. 작은 팝업에서 `1`, `2`, `3`을 누르면 해당 키를 한 번 보내고 닫힙니다. Enter는 필요 없습니다. `0`, `q`, Esc는 전송 없이 닫습니다.

```text
Mobile Keyboard

1  Opt + Down
2  Shift + Tab
3  Shift + Up
```

터미널에서 직접 팝업을 열 수도 있습니다.

```sh
herdr plugin pane open --plugin herdr-keyboard --entrypoint picker
```

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

## 개발 범위와 확인 방법

현재는 세 가지 고정 조합과 숫자 선택만 지원하는 PoC입니다. 터치 버튼, 사용자 지정 조합, 즐겨찾기는 아직 없습니다.

자동 테스트는 대상 pane 고정, 키 매핑, 한 번만 전송, 취소, 오류 처리를 검증합니다. 실제 모바일 SSH 앱의 입력과 Codex/Claude의 반응은 대상 환경에서 확인해야 합니다. 대상 프로그램을 연 뒤 팝업에서 각 번호를 눌러 물리 키보드의 같은 조합과 동작을 비교하세요.
