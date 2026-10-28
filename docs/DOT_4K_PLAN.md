# 도트 공방 4K — 시험 결과와 수정안 (2026-10-28)

앨리스(book `alice`, 폼 `begin`)로 「그린다」(OpenAI `images/edits`, `gpt-image-2.5-sunburst`)를 여러 번 돌려 본 결과와,
4K 캔버스로 **도트 해상도를 높이는** 쪽으로 도트 공방을 고치는 안. 이 파일만 읽고 다른 세션에서 고칠 수 있게 적었다.
시험 원본·정리본은 그 세션의 임시 폴더에만 있었고 남지 않았다 — 수치와 결론만 여기 있다. 그림 저장소에는 아무것도 올리지 않았다.

## 1. 결론 먼저

- 모델은 **지시한 화소 블록 크기를 따르지 않는다.** 인물로 캔버스 높이를 채우고, 블록은 캔버스·품질에 따라 6~16px 로 제멋대로다.
  문장으로 숫자를 못 박아도(아래 시험 5), 품질을 올려도(시험 6) 안 바뀌었다.
- 그래서 지금 정리 기본값(정지 121줄 · 칸 96×128)으로 줄이면 원본 블록 1.5~2개가 한 칸에 섞여 **얼굴·무늬가 뭉개진다.** 정리 셈(rust/dot-core)의 잘못이 아니다 —
  같은 원본을 최근접·평균 등 다른 방법으로 121줄로 줄여도 똑같이(평균은 더) 뭉개졌다. 원본을 **실제 격자 그대로** 뽑으면 깨끗하다.
- **4K(2160×3840)·보통 품질**로 그리고 **원본 격자 그대로(약 231줄, 칸 192×256)** 정리하면 지금까지 중 가장 좋다. 정지·대기·걷기·반응 한 벌을 그렇게 만들어 확인했다(3절).
- 수정안: 4K 를 "같은 121줄에 큰 블록" 이 아니라 **"두 배 해상도(약 231줄)"** 로 바꾼다(4절). 공방 인물 전체를 이 해상도로 옮기는 게 맞다(5절 크기 문제).

## 2. 시험 기록

모두 정지 도트, 첨부는 정본 `img/alice_end_literary_fantasy_f.webp` · 의상 `img/alice_begin_literary_fantasy_f.webp`(book-atelier-img), 생김새 한 줄은 book-atelier `docs/ATELIER_PIXEL_ART_PLAN.md` 11절의 앨리스 줄.
"원본 블록"은 원본 PNG 의 가로·세로 색 경계 세기를 FFT 로 잰 주기, "줄"은 불투명 높이 ÷ 블록.

| # | 크기 · 품질 | 지시문 | 원본 블록 | 원본 줄 | 121줄 정리 | 비고 |
|---|---|---|---|---|---|---|
| 0 | (채팅, 2026-10-21) | 그때 지시문 + "아주 큰 화소·16색·4등신·장식 절반" 이어 요청 | 약 12px | 123 | 깨끗 | 지금 쓰는 앨리스 gen2. 이어 요청이 효과를 냈다 — API 한 번 부르기에는 이게 없다 |
| 1 | 1024×1536 · medium | `dot.js` 그대로 | 약 8px | 약 186 | 뭉개짐 | 약 7등신·장식 그대로 |
| 2 | 1024×1536 · medium | 그대로 + 지금 정지 도트 6배를 본보기(3번째 첨부) | 가로 8 · 세로 10.7px | 약 138 | 뭉개짐 | 등신은 나아졌다. 본보기 문장이 "다른 인물"이라 같은 인물엔 어긋난다 |
| 3 | 1024×1536 · medium | 그대로 — 새 화면 순서(정지 → 「대기·걷기·반응 한꺼번에」)로 실제 dot.html 을 눌러서 | 정지 약 8px · 시트 약 6px | 정지 약 189 | 뭉개짐 | 시트는 정지 도트 6배를 따라 블록을 지켰다. 걷기 다리는 안 번갈아 나왔다 |
| 4 | 1024×1536 · medium | 정지에 "키 약 1480px = 12×12 블록 정확히 121줄, 블록 하나는 한 색, 6·8px 계단 금지" 네 줄 추가 | 약 8px | 약 188 | 뭉개짐 | 숫자를 무시. 이 수정은 올리지 않았다 |
| 5 | 1024×1536 · **high** | 4 와 같다 | 약 6px | 약 248 | 더 뭉개짐 | 품질을 올리면 더 잘게 그린다. 출력 토큰 1372(보통의 4배), 47초 |
| 6 | **2160×3840** · medium | `dot.js` 4K 그대로(블록 25px) | **약 16px** | **약 231** | 121줄이면 뭉개짐 · **231줄이면 깨끗** | 출력 토큰 865, 35초. 블록 가장자리가 조금 부드러워(작게 그려 키운 듯) 색 묶기는 필요 |

원본 격자 그대로 뽑은 도트의 격자 품질(블록 안 색 흔들림이 낮을수록, 경계가 격자선에 몰릴수록 좋다):

| 원본 | 원본 격자 그대로 | 블록 안 흔들림 | 경계 에너지가 격자선 ±1~2px 에 있는 몫 (우연이면) |
|---|---|---|---|
| 1024×1536 medium (시험 4) | 77×188 | 5.1 | 0.56 (0.50) |
| 4K medium (시험 6) | 98×230 | 3.1 | 0.43 (0.25) |

## 3. 4K 한 벌 (정지 · 대기 · 걷기 · 반응)

- 정지: 시험 6 의 원본을 `dot still … 24 --rows 231 --outline` + 칸 192×256 으로 정리(정지가 칸 크기를 받게 시험용으로 고친 dot-core, 4절 1).
  격자 15.99px, 인물 100×232(윤곽 포함), 칸 오프셋 [46, 22], 발 기준선 254, 24색.
- 시트: 그 정지 도트를 최근접 6배(1152×1536)로 첨부, 4K · medium. 지시문은 `dot.js` 에서 숫자 둘만 바꿨다 — 시트 블록 13 → 8px, 시트 인물 키 "about 125 pixels tall" → 232(4절 2).
  원본 블록은 가로 8px(세로는 걷기 5.3 · 대기 7.3 · 반응 8.0 — 칸 배치 때문에 세로 측정이 흔들린다).
  `dot sheet <원본> <정리> --frames N --grid CxR --palette <정지 도트> --rows 231 --speck 150 --cell 192x256`(쪼가리 40 → 150 은 면적비 (231/121)² ≈ 3.6 배).

| 상태 | 칸 | 프레임 크기(도트) |
|---|---|---|
| 대기 2×2 | 4 | 96×231 × 4 |
| 걷기 3×2 | 6 | 94×231 · 86×230 · 93×234 · 94×230 · 87×228 · 93×233 |
| 반응 2×2 | 4 | 98×234 · 94×234 · 101×225 · 98×227 |

- 걷기: `dot bob --cell 192x256 --bob 2` → dy `[0, 1, 0.67, -1, -0.33, -0.33]`, `dot stride --cell 192x256 --ms 200` → 보폭 63 · 빠르기 105.
  **1~3칸과 4~6칸이 거의 같다**(다리가 안 번갈아 나온다) — 지금 앨리스와 같은 증상, 「손보기」(반 주기 복사·두 색 맞바꾸기)가 필요.
- 대기는 네 칸 차이가 작고(눈 감기 등), 반응은 손 모으기·치마 잡고 인사가 나왔다. 네 상태 모두 얼굴·리본·회중시계·앞치마 무늬·스타킹 카드 무늬가 또렷하다.
- 값: 장마다 출력 이미지 토큰 865(1024×1536 은 343), 33~44초. 첨부 셋인 걷기는 입력 5213 토큰.

## 4. 수정안

### 4-1. 정리 셈 — 정지가 칸 크기를 받는다 (`rust/dot-core`, `rust/dot-cli`, `rust/dot-wasm`)

`dot_core::still` 이 칸을 96×128 · 발 기준선 126 으로 박아 두었다(`lib.rs` 의 `if h > 126 || w > 96`, `Img::new(96, 128)`, json 의 `"cell": [96, 128]` · `"foot_y": 126`).
시트(`sheet`·`frames_sheet`)는 이미 `cell` 을 받는다. 시험은 아래처럼 환경 변수로 했다 — 실제로는 `StillOpts` 에 `cell: Option<(usize, usize)>`(없으면 96×128)를 더한다.

```diff
-pub struct StillOpts { pub colors: usize, pub rows: Option<usize>, pub outline: bool }
+pub struct StillOpts { pub colors: usize, pub rows: Option<usize>, pub outline: bool, pub cell: Option<(usize, usize)> }
 …
-    if h > 126 || w > 96 { return Err(format!("인물이 칸(96×128, 발 기준선 126)보다 크다: {w}×{h} — 줄 수(rows)를 줄인다")); }
-    let mut cell = Img::new(96, 128);
-    let (x0, y0) = ((96 - w) / 2, 126 - h);
+    let (cw, ch) = o.cell.unwrap_or((96, 128));
+    let fy = ch - 2;
+    if h > fy || w > cw { return Err(format!("인물이 칸({cw}×{ch}, 발 기준선 {fy})보다 크다: {w}×{h} — 줄 수(rows)를 줄인다")); }
+    let mut cell = Img::new(cw, ch);
+    let (x0, y0) = ((cw - w) / 2, fy - h);
 …
-            let d = ((y0 + y) * 96 + x0 + x) * 4;
+            let d = ((y0 + y) * cw + x0 + x) * 4;
 …
-    … \"cell\": [96, 128], … \"foot_y\": 126, …
+    … \"cell\": [{cw}, {ch}], … \"foot_y\": {fy}, …
```

- `dot-cli`: `still_opts` 가 `--cell 192x256` 을 읽는다(시트와 같은 꼴). `rust/README.md` 의 사용법 줄에 더한다.
- `dot-wasm`: `still(id, colors, rows, outline)` 에 칸 폭·높이 두 인자(0 = 96×128)를 더하고 `API_VERSION` 을 3 으로. `dot/dot.js` 의 `API` 와 `wrap().still` 을 같이 고친다.
- wasm 다시 짓기(`rust/README.md` 「wasm 다시 짓기」) → `dot/dot.wasm`, `dot.html` 의 `dot.wasm?v=` · `dot.js?v=` 를 올린다. `tests/dot.cjs` 가 소스 해시를 본다.
- 96×128 을 안 주면 지금과 화소 하나 다르지 않아야 한다 — `node tests/dot.cjs`(book 기록 12장 다시 정리)와 `dot verify ../../book-atelier-img` 로 확인.

### 4-2. 지시문 — 4K 를 "두 배 해상도"로 (`dot/dot.js` 의 `CANVAS`·`layout`·`walk4Prompt`)

지금 4K 는 "같은 121줄, 블록 25px(시트 13px)"인데 모델은 정지 16px · 시트 8px 로 그린다. 모델이 실제로 그리는 값에 맞춘다.

| | 지금 | 고칠 값 |
|---|---|---|
| `CANVAS['2160x3840'].block` | 25 | 16 |
| `CANVAS['2160x3840'].sheet` | 13 | 8 |
| 시트 인물 키(`layout` 의 "about 125 pixels tall") | 125 고정 | 캔버스마다 — 보통 125, 4K 232 (`CANVAS` 에 `rows` 칸을 두고 쓴다) |
| 걷기 4칸 키(`walk4Prompt` 의 "about 121 sprite pixels tall") | 121 고정 | 보통 121, 4K 231 |
| `CANVAS['2160x3840'].base`(걷기 4칸 발 기준선) | 84 | 시험 안 함 — 걷기 4칸 4K 를 한 번 뽑아 잰다 |
| `CANVAS[…].name` · README 의 "같은 121줄인데 화소 블록이 12→25px" | | "두 배 해상도 — 약 231줄, 칸 192×256" 로 |

정지 지시문의 "about 4 heads tall …" 등 나머지 문장은 그대로 둔다(시험 6·3절이 그 문장으로 나왔다).
정지 지시문에 숫자 줄을 더하는 안(시험 4)은 효과가 없어 넣지 않는다.

### 4-3. 정리 기본값 · 인물 칸이 크기를 따라간다 (`dot/dot.js`, `dot.html`)

크기를 고르면(「그린다」 옆 크기 선택, `GEN.sizes`) 정리 기본값과 인물 칸이 같이 바뀐다. 보통은 지금 값 그대로.

| | 보통 1024×1536 | 4K 2160×3840 |
|---|---|---|
| 정지 줄 수(`CLEAN.still.rows`, `dot.html` 의 `OPT.still` rows) | 121 | 231 |
| 시트 줄 수(`CLEAN.sheet.rows`) | 121 | 231 |
| 쪼가리(`speck`) | 40 | 150 |
| 칸(`CELL`, `cellW`·`cellH`) | 96×128 | 192×256 |
| 발 기준선(`FOOT`) | [48, 126] | [96, 254] |
| 걷기 오르내림(`W.bob(id, cellW, 1)` 의 1) | 1 | 2 |
| 정지 도트 6배(`x6`) | 576×768 | 1152×1536 (6배 그대로 — 첨부는 모델이 줄여 읽는다) |

- `CANVAS` 각 칸에 `rows`·`cell`·`foot`·`speck`·`bob` 을 두고, `CLEAN`·`args()`·`actor()`(지금 `CELL.slice()`·`FOOT.slice()` 고정)·`dot.html` 의 정리 호출(`opt('cellW') || 96` 등)이 그것을 읽게 한다.
- 고른 크기는 인물마다 남긴다(`atelier_dot_v1` 의 `per`) — 같은 인물의 정지·시트가 크기를 섞지 않게. 정지를 4K 로 정리했는데 보통으로 시트를 그리려 하면 「지금 할 일」이 말린다.
- 기록 JSON(`record()`)에 `canvas`(크기)와 `cell` 을 남긴다.
- 원본 이름은 그대로(`<이름>_<폼>_<상태>_gen<N>.png`) — 크기는 기록에.

### 4-4. 재생기 — 고칠 것 없음, 크기만 정한다

`sprite-actor.js` 는 인물 칸의 `cell`·`foot` 을 그대로 읽는다(`def.cell`, `def.foot`). 192×256 인물 칸이면 그대로 선다.
다만 같은 `scale` 이면 **다른 인물보다 약 1.9배 크게** 선다. `scale: 0.5` 로 맞추면 도트 한 칸이 CSS 0.5px 라
"도트 한 칸 = 실제 화소의 정수배" 를 기기 화소 비율 2 이상에서만 지킨다. 그래서 5절.

## 5. 정할 것

1. **공방 인물 전체를 4K(약 231줄)로 옮기나.** 섞어 두면 크기가 안 맞는다. 옮긴다면 책 서재 세 인물(alice · sunzi · chunhyang)부터.
   재생기를 부르는 자리(서재 바닥·뛰쳐나오기·도감 상세 등)의 `scale`·바닥 띠 높이를 같이 본다(`grow` 가 띠를 늘린다).
2. 4K 한 벌 값: 장마다 출력 토큰 865(보통의 약 2.5배) × 넷.

## 6. 그 밖에 이번에 찾은 것 (4K 와 따로)

- **「원본 PNG 받기」가 지금 탭의 원본을 주지 않는다.** `dot.html` 의 `gotGen` 이 마지막으로 받은 원본 한 장뿐이라, 「대기·걷기·반응 한꺼번에」 뒤에는 어느 탭에서 눌러도 반응 원본이 내려온다(대기·걷기 원본을 못 받는다).
  ③ 의 탭마다 들어 있는 원본을 받게 고친다. `tests/dot-screen.cjs` 의 한꺼번에 검사에 "탭마다 원본 받기 = 그 탭의 원본" 을 더한다.
- **원본 번호가 1부터 다시 센다.** 화면의 `gens` 는 이 기기에서 그린 것만 세서, 그림 저장소에 이미 `alice_begin_still_gen1·gen2.png` 가 있어도 새 원본을 gen1 이라 부른다 — 그대로 올리면 덮어쓴다(원본은 지우지 않는 규칙).
  그림 저장소의 `raw/` 목록(같은 출처 `/book-atelier-img/sprites/<이름>/raw/` 는 목록을 못 읽으니 기록 JSON 의 `generation(s)` 나 `data/sprites.json` 에서)을 보고 다음 번호부터 세거나, 올리는 세션이 이름을 고친다.
- **본보기 문장이 같은 인물에 어긋난다.** 정지의 `sample` 은 "a finished sprite of a different character … NOT its outfit or colours" — 같은 인물의 확정 도트를 붙일 때(시험 2)는 맞지 않는다. 같은 인물이면 다른 문장을 쓰게 갈래를 둔다.
- `tests/dot-screen.cjs` 는 옆에 `../pkm-atelier` 가 없으면 「공방 바꾸기 — 포켓몬」 에서 30초 시간 초과로 멈춘다(그 앞은 다 지난다). 옆 저장소가 없으면 건너뛰게 하면 클라우드 세션에서도 끝까지 돈다.

## 7. 다시 해 보는 법

```bash
# 정리 도구(4-1 을 고친 뒤)
cd rust && cargo build --release -p dot-cli
target/release/dot still  <4K 정지 원본.png> alice_begin_still.png 24 --rows 231 --outline --cell 192x256
target/release/dot sheet  <4K 걷기 원본.png> alice_begin_walk.png --frames 6 --grid 3x2 --palette alice_begin_still.png --rows 231 --speck 150 --cell 192x256
target/release/dot bob    alice_begin_walk.png --cell 192x256 --bob 2
target/release/dot stride alice_begin_walk.png --cell 192x256 --ms 200
```

그리기는 `dot/dot.js` 의 `prompt({state, subject: 'woman', identity, outfit, size: '2160x3840'})` → `generate(열쇠, {model: 'gpt-image-2.5-sunburst', quality: 'medium', size: '2160x3840', prompt, images})`.
첨부 차례는 `prompt().attach`(정지: 정본·의상, 대기·반응: 정지 도트 6배·정본, 걷기: 정지 도트 6배·`dot/walk_leg_guide.png`·정본).
