# rust — 도트 공방의 정리 셈

| 상자 | 무엇 | 나오는 것 |
|---|---|---|
| `dot-core` | 정리 셈 — 격자 찾기(경계 세기·느슨한 격자·고른 격자) · Lab 팔레트 · 정지 도트 한 장 · 동작 시트(프레임 찾기·떨어진 쪼가리·발 기준선·몸 중심) · 걷기 dy · 보폭. 바깥 의존 없음(`png` 기능을 켜면 PNG 풀기·싸기) | (라이브러리) |
| `dot-wasm` | 브라우저 쪽. `extern "C"` 내보내기 + 포인터·길이(붙임 생성기 없음), 싣개는 `dot/dot.js` | `dot/dot.wasm` |
| `dot-cli` | 명령줄 `dot` — 세션이 파이썬 도구 대신 쓴다. 인자가 같다 | `target/release/dot` |

## 파이썬 도구와 같은 셈

book-atelier 의 `tools/sprite_px.py` · `sprite-grid.py` · `sprite-sheet.py` · `sprite-bob.py` 를 옮겼다. 같은 원본·같은 인자면 화소 하나 다르지 않다 —
`dot verify ../../book-atelier-img` 와 `tests/dot.cjs` 가 book 서재 세 인물의 기록 12장(정지·대기·걷기·반응 × 셋)으로 본다(파이썬 42초, 이쪽 2초 남짓).
numpy 의 셈 차례까지 따른다(끝자리 하나로 팔레트 묶음이 갈리지 않게):

- `np.arange(a, b, s)` = `a + i·((a+s)−a)`, 길이 `ceil((b−a)/s)` · `np.round` 와 파이썬 `round` 는 짝수 쪽 반올림 · `round(x, 2)` 는 이진 값 그대로를 셈한다(`round2`)
- 축 세 칸 합·작은 평균은 앞에서부터 · 묶음 평균(axis 0)도 앞에서부터
- Lab 의 행렬 곱은 BLAS 처럼 `fma(c2, m2, fma(c1, m1, c0·m0))`(한 줄이면 `fma(c2, m2, c0·m0 + c1·m1)`)
- 감마 펴기 `((c+.055)/1.055)**2.4` 는 기계마다 끝자리가 달라 numpy 가 셈한 표(`dot-core/src/gamma.rs`, v = k/2, k = 0..510)를 쓴다

## 쓰기

```bash
cd rust
cargo test -p dot-core
cargo build --release -p dot-cli
target/release/dot still  <생성 원본.png> <정리본.png> [색 수=24] [--rows 121] [--outline]
target/release/dot sheet  <생성 시트.png> <정리 시트.png> --frames 6 --grid 3x2 --palette <정지 도트.png> --rows 121 --speck 40 --cell 96x128
target/release/dot frames <정리 시트.png> <원본 1.png> … <원본 4.png> --palette <정지 도트.png> --rows 121 --speck 40 --cell 96x128   # 칸마다 따로 뽑은 걷기 4칸
target/release/dot bob    <걷기 시트.png> [--cell 96x128] [--bob 1]        # 칸마다 dy (6칸 · 4칸)
target/release/dot stride <걷기 시트.png> [--cell 96x128] [--ms 200]       # 보폭과 빠르기 (반 주기 = 칸 수의 반 × ms)
target/release/dot verify ../../book-atelier-img                          # 기록대로 다시 정리해 견준다
```

정리본 옆에 `<정리본>.json`(격자·팔레트·프레임 자리)을 둔다 — 파이썬 도구와 같은 칸.

파이썬 도구에 없던 것 넷(투명 바탕·빈 줄로 나뉘고 칸에 들어가는 시트는 그대로라 화소는 같다):
- **한 색 바탕 지우기** — 생성기가 투명 대신 `#00FF00` 같은 한 색 바탕으로 그리면(네 귀퉁이가 불투명하고 가장자리의 60% 넘게 한 색) 가장자리에서 이어진 바탕을 투명으로(`key_background`, 기록 JSON 에 `background_keyed`).
- **칸 배치로 위아래 자르기** — `--grid CxR` 를 주면 위아래 칸이 머리카락·자락으로 이어져 빈 가로줄이 없을 때 기대 경계 가까이 가장 빈 줄에서 자른다(가로는 원래대로).
- **칸에 맞추기** — 정리한 프레임이 `--cell` 보다 크면(생성기가 도트를 지시보다 잘게 그렸을 때) 간격을 그만큼 키워 고른 격자로 다시 뽑는다(세 번까지, 기록 JSON 에 `fitted_pitch`).
- **칸마다 따로 뽑은 원본**(`frames_sheet`, 명령줄 `dot frames`) — 걷기 4칸을 장마다 따로 생성했을 때. 장마다 바탕을 지우고 빈 열 32칸을 두고 이어, 장마다 그림 상자를 프레임으로 시트와 같은 길로 정리한다(기록 JSON 에 `separate`·`source_x`). 걷기 4칸의 dy 는 접지 +½ · 지나감 −½, 보폭은 접지 칸 0·2.
- **원본을 정지 도트로 넣었을 때** — 정지 도트의 색이 64개를 넘으면(정리본이 아니라 생성 원본) 그 그림에서 24색을 묶어 쓴다(기록 JSON 에 `palette_quantized`). 안 그러면 색이 수십만 개라 셈이 끝나지 않는다.

## wasm 다시 짓기

```bash
cargo build -p dot-wasm --target wasm32-unknown-unknown --profile wasm   # 크기 우선(opt-level z · lto · strip)
cp target/wasm32-unknown-unknown/wasm/dot_wasm.wasm ../dot/dot.wasm
```

그다음 `node tests/dot.cjs`. `dot.html` 의 `dot/dot.wasm?v=` · `dot/dot.js?v=` 숫자도 하나 올린다(Pages 캐시).
`dot-wasm/build.rs` 가 소스(`dot-core/Cargo.toml`, `dot-core/src/**`, `dot-wasm/Cargo.toml`, `dot-wasm/build.rs`, `dot-wasm/src/**`)의 FNV-1a 64 를 wasm 안에 넣고,
`tests/dot.cjs` 가 같은 셈을 해서 견준다 — 소스를 고치고 다시 짓지 않으면 검사가 실패한다(규칙은 book-atelier 모자이크와 같다: 상대 경로 · 0x00 · 내용(\r\n → \n) · 0x00).

## 감마 표

`dot-core/src/gamma.rs` 는 손으로 고치지 않는다. 다시 만들려면 numpy 로 `v = np.arange(0, 511) / 2 / 255`, `np.where(v > .04045, ((v + .055) / 1.055) ** 2.4, v / 12.92)` 를
`f64::from_bits(0x…)` 로 적는다(파일 맨 위 설명 그대로).

## 내보내기 (`API_VERSION` 2)

| 이름 | 무엇 |
|---|---|
| `alloc(n) → ptr` · `dealloc(ptr, n)` | 자리 받기·돌려주기(8바이트 맞춤) |
| `decode(ptr, n) → 번호` · `put(ptr, w, h) → 번호` · `free(번호)` | PNG 풀기 · 브라우저가 푼 RGBA 넣기 |
| `img_w` · `img_h` · `img_ptr(번호)` · `encode(번호)` → `bytes_ptr/len` | RGBA 읽기 · PNG 싸기 |
| `still(번호, 색 수, 줄 수, 윤곽) → 번호` | 정지 도트(줄 수 0 = 격자 찾기) |
| `sheet(번호, 정지 도트, 칸 수, 배치 가로, 배치 세로, 줄 수, 고정 간격, lo, hi, 쪼가리, 칸 폭, 칸 높이) → 번호` | 동작 시트(0 은 주지 않음) |
| `frames_sheet(번호들 자리, 장 수, 정지 도트, 줄 수, 고정 간격, lo, hi, 쪼가리, 칸 폭, 칸 높이) → 번호` | 칸마다 따로 뽑은 원본 여러 장 → 한 시트(번호들 = i32 를 써 넣은 자리) |
| `bob(번호, 칸 폭, 오르내림)` · `stride(번호, 칸 폭, ms)` | 걷기 dy · 보폭과 빠르기 (6칸 · 4칸) |
| `json_ptr/len` · `err_ptr/len` | 마지막 결과 JSON · 실패 까닭(UTF-8, 실패하면 -1) |
| `api_version` · `source_hash_ptr/len` | 맞춰 보기 |
