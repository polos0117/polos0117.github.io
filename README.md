# 공방 모음

https://polos0117.github.io/ — 건담 · 삼국지 · 포켓몬 · 신화 무기 · 책 다섯 공방으로 들어가는 메인.

- 건담 `/atelier/` · 삼국지 `/sam-atelier/` · 포켓몬 `/pkm-atelier/` · 신화 무기 `/myth-atelier/` · 책 `/book-atelier/`
- 첫 화면은 **공방 지도** 한 장(`img/map.webp`, 2896×2172 — 1448×1086 을 2배로 올린 것, `ROOMS` 의 좌표·viewBox 는 1448 기준 그대로) — 지붕을 걷어낸 큰 건물 안에 방 다섯(격납고·서재·군막·연구소·대장간).
  방에 올리면 빛나고 이름·대표 그림이 뜨고, 누르면 지도가 그 방으로 다가가며 그 공방의 문들(하위 링크)이 보인다. 주소에 `#book` 처럼 남는다.
  등불이 복도를 오간다. 지도 아래 "모든 공방" 목록(한 공방 = 한 줄: 작은 그림 · 이름 · 문들)은 지도가 불편한 사람·화면 읽기 프로그램의 길이고, 지도의 문들과 같은 표(`ROOMS`)에서 나온다.
- 한 파일(`index.html`)이다. 공방을 더하면 `ROOMS` 에 한 줄(다각형은 그림 픽셀 좌표) — 그림에 방이 없으면 그림 귀퉁이를 인페인팅으로 더한다.
  그림을 바꾸면 `ROOMS` 의 다각형과 등불 길(`#way1..3`)만 다시 잰다. 그림엔 글자를 넣지 않는다 — 이름은 화면이 얹는다.
- 가로·세로: 세로는 지도 위·문 패널 아래, 가로는 지도가 화면 높이에 들고 문 패널이 오른쪽(휴대폰 가로는 제목을 지도 위에 겹친다). 다가간 방의 테두리는 흐리게. 움직임 줄이기면 등불이 멈춘다.
- 앱 설치: `app.webmanifest`(범위 `/`) · 아이콘 `icon-180/192/512.png` — 지붕을 걷어낸 건물 블록에 방 다섯(지도와 같은 위 셋·아래 둘)이 공방 색으로 빛난다. maskable 안전 원 안. 다시 그리려면 `python3 tools/icon.py` 가 `icon.svg` 를 만들고, 브라우저로 512·192·180 PNG 를 찍는다.
- 살아 있는 불: 오늘 판을 둔 방은 불이 켜지고(문 패널에는 통산 n판 w승·연승·오늘의 판 연속 일수도)(숨 쉬는 빛, 이름표 아래 "오늘 n판 · w승 · 오늘의 판 ✓"), 문 패널·목록에 「오늘의 판」 단추(각 공방의 `?daily`),
  지난번 다녀간 뒤 그 공방이 바뀌었으면(첫 화면 `HEAD` 의 `Last-Modified` > `seen`) 이름표에 초록 점과 "새 소식". 문을 누르면 다녀간 자국이 남는다. 아래 「오늘 기록」.
- 내 즐겨찾기: `favorites.html` — 공방 넷의 도감에서 하트로 담은 그림을 새것부터 2:3 칸으로, 공방 칩(지도의 색)으로 거르고(`?a=book`), 크게 보기(← →·밀기·Esc, 「그 공방에서 보기」·빼기)·감상 모드(6초마다 천천히, 손대면 멈춤). 머리의 「즐겨찾기 n」과 "모든 공방" 목록 아래 줄에서 들어간다. 아래 「즐겨찾기」.
- 검사: `CHROMIUM_PATH=<chrome> NODE_PATH=<playwright 가 있는 node_modules> node tests/map-screen.cjs` — 방 다섯·이름표·다가가기·문·주소·Esc·뒤로 가기, 오늘 불·오늘의 판·새 소식·다녀간 자국, 휴대폰 세로·가로·PC.

## 오늘 기록 — 다섯 공방이 지키는 약속

다섯 공방이 모두 `polos0117.github.io` 한 출처 아래 있어 `localStorage` 를 같이 쓴다. 그래서 서버 없이도 지도가 "오늘 어디서 놀았나"를 안다.
도구는 `today.js` 한 파일이고, **같은 파일을 다섯 저장소의 `lib/today.js` 에 복사해 둔다**(여기 것이 원본). 화면 말은 없다.

| 열쇠 | 값 |
|---|---|
| `atelier_today_v1:<방>` | `{d, n, w, daily, at, seen}` |
| `<방>` | `gundam` · `book` · `samguk` · `pokemon` · `myth` — 지도 `ROOMS` 의 `key` 와 같다 |
| `d` | 그 기록의 날짜 `2026-10-21`(기기의 날짜). 날이 바뀌면 `n`·`w`·`daily` 는 처음부터, `seen` 만 이어진다 |
| `n` · `w` | 오늘 끝낸 판 수 · 그중 이긴 수. 판이 끝나는 수에서 게임이 `bump(방, {won, daily})` 한 번 |
| `daily` | 오늘의 판(날짜가 씨앗 — `seed(방)`)을 끝냈나 |
| `at` | 마지막 판이 끝난 시각(ms) |
| `seen` | 마지막으로 다녀간 시각(ms). 게임이 열릴 때 `visit(방)`, 지도의 문을 누를 때도. 지도의 "새 소식" 기준 |
| `atelier_record_v1:<방>` | 통산 — `bump` 가 같이 쌓는다. `{n, w, streak(지금 연승), best(최고 연승), days(판을 둔 날 수), lastDay, dstreak(오늘의 판 연속 일수), dbest, lastDaily}`. `record(방)` 으로 읽고, `dailyAlive(방)` 은 어제나 오늘 끝냈으면 참(연속이 살아 있다) |

오늘의 판: 주소에 `?daily` 가 붙으면(`isDaily()`) 그 공방이 `seed(방)`(날짜 `YYYYMMDD` + 방 이름의 FNV-1a) 으로 판을 연다 —
건담 드래프트 씨앗, 책 결투의 상대 덱·순서, 신화 결투의 주인·덱 순서, 삼국지의 후보 죽간, 포켓몬 탐사의 임무(원래 날짜 씨앗). 하루 동안 같은 판이다.

## 말풍선 — 카드가 한마디

`speech.js`(원본은 여기, 다섯 저장소의 `lib/speech.js` 에 같은 파일)가 요소 위에 꼬리 달린 풍선을 띄운다 — `AtelierSpeech.say(요소, 글, {who: 'me'|'foe'})`.
말의 재료는 각 공방의 자료다: 책은 설계표 `voice`(발단·전개·결말 — 판에 들어올 때 그 장의 말, 끝나면 이긴 쪽의 결말), 신화는 `card.json` 의 `text`,
포켓몬은 도감 글 `text`, 건담은 `lore`, 삼국지는 `LORE`. 풍선은 둘까지, 글 길이만큼 머물고, 움직임 줄이기면 애니메이션 없이 뜬다. 화면 말은 없다.

공방을 더하면: `lib/today.js` 를 복사해 넣고, 판이 끝나는 자리에서 `AtelierToday.bump('<방>', {won, daily})`, 열 때 `visit`, `?daily` 를 읽어 씨앗을 걸고,
지도 `ROOMS` 에 `key`·`daily` 를 적는다.

## 즐겨찾기 — 네 공방이 같이 쓰는 그림 목록

도구는 `favorites.js` 한 파일이고, **같은 파일을 네 저장소(atelier · pkm-atelier · myth-atelier · book-atelier)의 `lib/favorites.js` 에 글자 하나 다르지 않게 복사해 둔다**(여기 것이 원본, 맨 위 줄에 판). 고치면 다섯 곳을 같이 고친다 — 각 공방의 도감 검사가 옆에 받아 둔 이 파일과 견준다. 화면 말은 없다.

| 열쇠 | 값 |
|---|---|
| `atelier_favorites_v1` | 칸의 JSON 목록. 새것이 앞, 500칸까지(넘치면 오래된 것부터 빠진다). 같은 그림 = 같은 `(a, file)` |
| `a` | 공방 — `gundam` · `book` · `pkm` · `myth` (지도의 방 열쇠와 하나 다르다: `pkm` ↔ `pokemon`) |
| `key` · `title` · `sub` | 카드 열쇠 · 보이는 이름 · 짧은 이름표(폼·컷 — "중장 오버드라이브", "각성", "전개") |
| `file` · `thumb` · `full` | 그림 파일 이름 · 썸네일과 원본의 절대 주소 |
| `link` | 그 공방 도감에서 이 그림을 여는 절대 경로 — 건담·포켓몬 `?mech=&pic=`, 신화 `?card=&pic=`, 책 `?book=&pic=` |
| `at` | 담은 때(ISO) |

API(`window.AtelierFavorites`): `has(a, file)` · `toggle(칸)` → 담겼으면 참 · `list()` · `count(a?)` · `remove(a, file)` · `onChange(cb)`(다른 탭의 storage 사건 + 같은 탭의 `atelier-favorites` 사건, 그만두는 함수를 돌려준다) · `available()`.
저장이 막힌 브라우저(사생활 창 등)에서는 던지지 않는다 — 읽으면 빈 목록, 담기는 거짓을 돌려주고 화면이 "못 담았다"·"저장이 막혔다" 를 말한다.
각 공방의 도감 상세에는 지금 보이는 그림의 하트(「즐겨찾기」, `aria-pressed`)와 담은 수 「즐겨찾기 n」(→ `/favorites.html`)이 있다.
검사: `CHROMIUM_PATH=<chrome> NODE_PATH=<playwright 가 있는 node_modules> node tests/favorites-screen.cjs` — favorites.js 동작, 지도 색 = 칩 색, 거르기·크게 보기·빼기·감상 모드·빈 자리·저장 막힘, 지도의 「즐겨찾기 n」, 다섯 크기(344×882 · 390×844 · 844×390 · 690×829 · 1280×900). `FAV_PORT` 로 자리를 바꾸고, `SHOT_DIR` 을 주면 화면을 찍는다.

## 도트 공방 — 다섯 공방이 같이 쓰는 도트 인물 만들기

`dot.html` — 공방 지도 "모든 공방" 목록 아래 「도트 공방」에서 들어간다. 그림은 GPT 가 그리고, 나머지는 여기서 한다.

1. **인물** — 공방 칩을 누르면 그 공방의 그림 등록부(`/book-atelier/data/img.json` 처럼 같은 출처라 그대로 읽는다, 삼국지는 `images/manifest.json`)에서 인물 목록.
   인물을 고르면 그 인물의 그림이 뜨고 정본(얼굴·머리·색)·의상을 짚는다. 영문 이름(파일 이름 — 책은 열쇠, 포켓몬·신화는 카드의 `en`), 폼(책 `begin`, 나머지 `base`), 그릴 대상, 생김새 한 줄(영어).
2. **지시문** — 상태(정지·대기·걷기·반응)마다 GPT 세션에 그대로 붙여 넣을 요청문(첨부 차례 · 지킬 것 · 프롬프트). book-atelier `docs/ATELIER_PIXEL_ART_PLAN.md` 11절의 지시문을 인물 묘사만 바꿔 쓰게 일반화했다.
   첨부 — 정지: 정본(+의상, +같은 공방의 다 만든 정지 도트 6배를 본보기로). 대기·반응: 정지 도트 6배 · 정본. 걷기: 정지 도트 6배 · 다리 자세 안내(`dot/walk_leg_guide.png`, book 걷기 v2 때 붙인 그 파일) · 정본. 긴 치마는 다리 대신 발과 자락.
3. **정리** — 받은 원본 PNG(동작 시트는 확정한 정지 도트도)를 넣고 「정리하기」. `dot/dot.wasm`(소스 `rust/`) 이 이 브라우저에서 정리한다 — 그림은 어디에도 올라가지 않는다.
   재생 미리보기(뒤집기) · 정리본 1·2·4배 · 칸·프레임 크기·지운 쪼가리·색 수 · 걷기는 빠르기(접지 칸 발 폭 ÷ 반 주기)와 칸마다 dy.
   받기: 정리본 PNG(`<이름>_<폼>_<상태>.png`) · 기록 JSON(`records/sprites/<이름>/<상태>.json` 꼴 — 원본 sha256 · 정리본 sha1 · 인자 · 재생) · `sprites.json` 칸 · 정지 도트 6배(다음 동작 시트의 첫 첨부).
   기본값은 book 서재 세 인물이 굳힌 값 — 정지 24색·121줄·바깥 윤곽, 시트 121줄·쪼가리 40·칸 96×128·칸 배치 2×2/3×2. 「정리 값」에서 바꾼다.

그림 자리는 각 공방의 그림 저장소 `sprites/<이름>/`(원본은 `raw/<이름>_<폼>_<상태>_gen<N>.png`, 지우지 않는다)·기록은 `records/sprites/<이름>/` — `img/` 밖이라 등록기·썸네일이 읽지 않는다.
올리기는 세션이 검토하고 "올릴까?" 를 물은 뒤에 한다. 고른 값은 이 기기에만(`atelier_dot_v1`), 주소 `?a=book&c=alice&s=walk` 로 바로 연다.

정리 셈은 `rust/dot-core` 한 곳이다 — book-atelier 의 파이썬 도구(`tools/sprite-grid.py` · `sprite-sheet.py` · `sprite-bob.py`)를 옮긴 것이라 같은 원본·같은 인자면 **화소 하나 다르지 않다**(book 기록 12장으로 검사한다). 세션은 명령줄 `dot` 로 같은 일을 한다(`rust/README.md`).
검사: `node tests/dot.cjs` — wasm 이 소스와 같다 · book 기록 12장 다시 정리 · 걷기 dy·빠르기 · 지시문·이름·기록 · 다섯 공방 그림 목록.
`CHROMIUM_PATH=<chrome> NODE_PATH=<playwright 가 있는 node_modules> node tests/dot-screen.cjs` — 화면에서 고르기·요청문·상태 넷, 앨리스 정지·손자 걷기를 화면에서 정리해 그림 저장소 정리본과 같다, 받기 넷, 공방 다섯, 새로 고침, 네 크기(344×882 · 390×844 · 844×390 · 1280×900). 옆에 `../book-atelier-img` 가 있어야 한다.

## 도트 재생기 — 다섯 공방이 같이 쓰는 도트 인물

도구는 `sprite-actor.js`(모양은 `sprite-actor.css`)이고, **같은 파일을 다섯 저장소(atelier · pkm-atelier · myth-atelier · book-atelier · sam-atelier)의 `lib/sprite-actor.js`·`lib/sprite-actor.css` 에 글자 하나 다르지 않게 복사해 둔다**(여기 것이 원본, 맨 위 줄에 판). 고치면 여섯 곳을 같이 고친다 — 각 저장소의 `tests/sprite-actor-copy.cjs` 가 옆에 받아 둔 이 파일과 견주고, 여기 `tests/dot.cjs` 도 옆의 다섯 복사본을 본다. 화면 말은 없다.
지금 부르는 곳(도트가 있는 인물만 뜬다 — 없으면 자리째 숨는다):
- 책: 서재 바닥 · 책을 펼치면 그 책의 도트가 뛰쳐나와 화면을 거닌다 · 서가 상세 도트 줄 · 서고 복도 · 도트 진열실
- 포켓몬: 연구소 바닥(캡슐 벽 밑) · 캡슐을 열면 그 포켓몬의 도트가 뛰쳐나온다 · 도감 상세 도트 줄 · 목록 「도트」 표
- 신화 무기: 대장간 무대 아래 띠 · 도감 상세 · 목록 표 / 건담: 격납고 메인 메뉴 위 띠(이동 스틱 자리는 비운다) · 도감 상세 시트 · 목록 표 / 삼국지: 군막 바닥 띠 · 인물 확대·지명 상세의 작은 무대
- 도트 공방(`dot.html`)의 무대 미리보기
인물 칸은 그 공방의 `data/sprites.json` 의 `actors` 에, 그림은 그 공방의 그림 저장소 `sprites/` 에(책 `book-atelier-img` · 포켓몬 `pkm-atelier-img-2` · 신화 `myth-atelier-img` · 건담 `atelier` · 삼국지 `sam-atelier`) — 도트 공방이 「올릴 곳」으로 알려 준다.

인물 자료 `data/sprites.json`(공방마다 하나 — 도트 공방의 「인물 칸 복사」가 이 꼴로 준다):

| 칸 | 값 |
|---|---|
| `base` | 그림 주소 앞(예: `https://polos0117.github.io/book-atelier-img/sprites/`) — 그림은 그 공방의 그림 저장소 `sprites/`(`img/` 밖) |
| `actors.<열쇠>` | 인물 하나: `cell`([96, 128]) · `foot`(발 기준선 [48, 126]) · `scale`(1) · `flip`(좌우 뒤집어 걸어도 되나) · `facing`('right') · `states` · 그 밖의 칸(책 `book`·`form` 처럼)은 공방이 쓴다 |
| `states.still` | `{file, frames: 1}` — 정지 도트 |
| `states.idle` · `react` | `{file, frames: 4, order, ms}` — 칸 차례와 칸마다 시간(ms). 반응이 끝나면 대기로 |
| `states.walk` | `{file, frames: 6, order, ms, speed, dy}` — speed 는 도트 화소/초(접지 칸 발 폭 ÷ 반 주기 — 발이 미끄러지지 않게), dy 는 칸마다 위아래(+ 는 아래) |

API(`window.AtelierSprite`): `load(url = 'data/sprites.json')` → 자료(한 번만 받는다) · `create(host, def, opts)` → 인물. `host` 는 `position: relative` 인 공간, `def` 는 `actors.<열쇠>` 하나.
`opts`: `base`(그림 주소 앞) · `label`(누르는 이름 — 공방의 낱말 표에서) · `points`([왼쪽, 오른쪽] 공간 폭의 비율) · `start` · `idleMs`([최소, 최대] 걷기 전 서 있는 시간) · `seed` · `scale`(도트 한 칸의 CSS 배율) · `floor`(공간 바닥에서 발까지 px) · `fit`(공간 높이에 들게 배율을 낮춘다) · `grow`(공간의 min-height 를 늘려 머리까지 들게 — 화소 배율이 정수가 아니면 도트가 scale 보다 커진다: 폴드 2.625 → 3화소 = 1.14배, 노트북 150% → 1.33배) · `wander`(false 면 저절로 걷지 않는다) · `onSelect(인물)` · `onError()` · `onState(이름)`.
인물: `ready`(Promise) · `select()` · `pause(까닭)`/`resume(까닭)` · `walkTo(0|1)` · `march(ms)`(제자리 걸음) · `play(상태)` · `destroy()` · `running` · `failed` · `debug()`.
공방마다 같은 자리(v2):
- `actorFor(자료, 카드 열쇠)` → 인물 하나 또는 null. 카드 열쇠는 인물 칸의 `card`(그 공방 그림 등록부의 열쇠 — 도트 공방의 「인물 칸 복사」가 넣는다), 책은 `book`, 없으면 `actors` 의 열쇠. `forCard(카드 열쇠, url)` → Promise<{def, base} | null>(자료를 못 받아도 null). 인물 칸에 `base` 가 있으면 그것이 자료의 `base` 보다 먼저.
- `mount(host, 카드 열쇠, opts)` — 도감 상세의 작은 무대: 그 카드의 인물을 host 에 세운다 → Promise<인물 | null>(없거나 그림을 못 받으면 null — 자리를 숨긴다). `url`·`label`·`points`·`floor`·`seed`·`onSelect`·`grow`(기본 참 — 무대가 도트만큼 늘어난다).
- `floor(host, 자료, opts)` — 공방 메인의 바닥에 여러 명. 좁으면 둘·넓으면 셋(`count`), 인물마다 폭을 나눈 제 몫 안에서 걷는다, 차례는 날마다 돈다(`seed`, 기본 오늘), `keys` 로 거르기, `labelOf(열쇠)`·`onSelect(열쇠, 인물)`·`grow`(참이면 바닥 띠가 도트만큼 늘어난다 — 띠 높이를 고정해 두었으면 준다). → `{list, ready, pause, resume, destroy}`, 폭이 바뀌어 사람 수가 달라지면 다시 세운다.
- `popOut(from, def, opts)` — 뛰쳐나오기: `from`(펼친 책·연 캡슐)에서 튀어나와 화면 바닥(`.sprite-popout`, 아래에 깔리는 투명한 판 — 누름은 인물만 받는다)에 내려앉고 화면을 가로질러 걷는다. `from` 이 열린 dialog 안이면 그 dialog 에 붙는다(맨 위 층). → `{actor, layer, ready, close(back, ms)}` — `close(true)` 는 되돌아 뛰어 들어간다(ms 동안). 그림을 못 받으면 판째 치운다. 한 번에 하나, 움직임 끔이면 뛰지 않고 선다.
검사: `CHROMIUM_PATH=<chrome> NODE_PATH=<playwright 가 있는 node_modules> node tests/sprite-actor-screen.cjs` — 옆의 book 세 인물로 카드 열쇠·바닥·뛰쳐나오기.

지키는 것: 도트 한 칸 = 실제 화소의 정수배 · 루프 안에서 배치를 읽지 않는다 · 움직임 끔(`AtelierMotion`, 없으면 동작 줄이기)이면 첫 칸에 멈춰 선다 · 숨은 탭·화면 밖이면 쉰다 · 그림을 못 받으면 인물만 숨는다 · 대기 시트가 없으면 정지 도트로 서 있다가 걷는다.
