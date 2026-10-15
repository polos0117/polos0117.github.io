# 공방 모음

https://polos0117.github.io/ — 건담 · 삼국지 · 포켓몬 · 신화 무기 · 책 다섯 공방으로 들어가는 메인.

- 건담 `/atelier/` · 삼국지 `/sam-atelier/` · 포켓몬 `/pkm-atelier/` · 신화 무기 `/myth-atelier/` · 책 `/book-atelier/`
- 한 파일(`index.html`)이다. 공방을 더하면 `.site` 카드 하나를 붙인다.
- 앱 설치: `app.webmanifest`(범위 `/` — 앱 안에서 다섯 공방으로 들어가도 같은 창) · 아이콘 `icon-180/192/512.png`(금별과 네 공방 색 점, maskable 안전 영역 안).
- 책의 공방은 아직 그림이 없어 장면·카드의 표지를 CSS 장정(`.tome-cover`)으로 그린다. 그림이 올라오면 다른 공방처럼 `.art` 의 `<img>` 와 `--bgimg` 로 바꾼다.
