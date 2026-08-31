# MYCORE12 카운터 — Cloudflare Worker 설정 가이드

방문자 수 · 검사 완료 건수를 세는 카운터를 Cloudflare(무료)로 직접 운영하기
위한 설정 방법이다. **터미널 명령어는 하나도 필요 없고, 전부 웹 화면에서
클릭으로 진행한다.**

지금까지 쓰던 `countapi.mileshilliard.com`(개인이 무료로 운영하는 작은
서비스)보다 Cloudflare 는 대기업이 운영하는 인프라라 훨씬 오래, 안정적으로
유지될 가능성이 높다.

---

## 0. 준비물

- 이메일 주소 하나 (Cloudflare 계정 가입용, 무료)
- 신용카드 등록 **불필요** (무료 요금제로 충분)

---

## 1. Cloudflare 계정 만들기

1. https://dash.cloudflare.com/sign-up 접속
2. 이메일·비밀번호 입력 후 가입
3. 이메일로 온 인증 링크 클릭

---

## 2. KV(저장소) 만들기

숫자를 저장해둘 공간을 먼저 만든다.

1. 로그인 후 왼쪽 메뉴에서 **Workers & Pages** 클릭
2. **KV** (또는 Storage & Databases > KV) 메뉴로 이동
3. **Create a namespace** (또는 "Create namespace") 클릭
4. 이름은 아무거나 괜찮다 — 예: `mycore12-counter`
5. 만들기 완료

---

## 3. Worker(카운터 프로그램) 만들기

1. 같은 **Workers & Pages** 메뉴에서 **Create application** (또는 "Create Worker") 클릭
2. "Create Worker" 선택
3. 이름 입력 — 예: `mycore12-counter` (이 이름이 나중에 주소의 일부가 된다)
4. **Deploy** 클릭 (기본 예시 코드로 일단 배포됨 — 다음 단계에서 내용을 바꾼다)

---

## 4. 코드 붙여넣기

1. 방금 만든 Worker 페이지에서 **Edit code** (또는 "Quick edit") 클릭
2. 에디터 안의 기존 코드를 전부 지운다
3. 이 폴더의 `counter-worker.js` 파일 내용을 전부 복사해서 붙여넣는다
4. **Save and deploy** (또는 "Deploy") 클릭

---

## 5. KV 연결하기 (Binding)

Worker 가 2단계에서 만든 저장소를 쓸 수 있게 연결한다.

1. Worker 페이지에서 **Settings** 탭 클릭
2. **Bindings** (또는 "Variables") 메뉴로 이동
3. **Add** → **KV namespace** 선택
4. **Variable name** 칸에 정확히 다음을 입력 (대문자 그대로):
   ```
   COUNTER_KV
   ```
5. **KV namespace** 드롭다운에서 2단계에서 만든 저장소(`mycore12-counter`) 선택
6. 저장 후 필요하면 Worker 를 다시 배포한다

---

## 6. 주소 확인해서 알려주기

1. Worker 페이지 상단에 있는 주소를 확인한다. 다음과 비슷한 모양이다:
   ```
   https://mycore12-counter.<본인계정이름>.workers.dev
   ```
2. **이 주소를 그대로 복사해서 알려주면**, 앱이 이 주소를 쓰도록 한 줄만
   바꿔서 새 버전을 만들어 드린다. 그 전까지는 지금 쓰던 카운터가 그대로
   동작하니 서두르지 않아도 된다.

---

## 확인 방법 (선택)

설정이 끝난 뒤 브라우저 주소창에 아래처럼 입력해서 정상 동작하는지
미리 확인해볼 수 있다 (주소는 실제 본인 주소로 바꿔서):

```
https://mycore12-counter.본인계정이름.workers.dev/hit/test
```

`{"key":"test","value":1}` 같은 결과가 보이면 정상이다. 새로고침할 때마다
value 가 1씩 올라가면 제대로 동작하는 것이다.

---

## 나중에 바꾸고 싶어지면

- 저장된 숫자를 확인하고 싶을 때: Cloudflare 대시보드의 KV 화면에서 key
  이름(`site_visits`, `assessment_completions`)
  으로 직접 조회할 수 있다.
- 무료 요금제 한도를 넘길 만큼 방문자가 많아지면(하루 10만 요청 이상)
  Cloudflare 가 알려준다 — 그 정도 규모면 유료 전환을 고려하면 된다.
