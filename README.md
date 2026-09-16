# Herdr Mobile Keyboard

모바일 키보드로 입력하기 어려운 키 조합을 Herdr 터미널에 보냅니다.

## 설치

Herdr 0.9.0 이상과 Node.js 20 이상이 필요합니다. 추가 의존성이나 빌드는 없습니다.

```sh
herdr plugin link /path/to/herdr-keyboard
```

## PoC

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
