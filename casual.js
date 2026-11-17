/* 일상컷 목록 — 세 공방(삼국지 · 원소 · 포켓몬)의 일상컷 색인(/<저장소>/data/casual-index.json)을 글로만 셈한다(2026-11-17).
   색인은 공방마다 tools/casual-index.cjs 가 그림 저장소의 기록에서 쓴다 — 여기는 읽기만. 그림은 받지 않는다.
   브라우저(casual.html)와 검사(tests/casual.cjs)가 같은 파일을 쓴다.

   AtelierCasual.ATELIERS — [{key(색인 atelier), name(지도의 방 이름), c(지도 색), repo, path}] — 이름 · 색은 status.js · 지도 ROOMS 와 같다.
   AtelierCasual.summary(rows) → {total, required, cosplay, free, gpt, reqs: [{key, ko, n}], games: [{key, ko, n, pct}], chars: [{game, gameKo, name, n}]}
     reqs — 필수 갈래별(required 가 있는 컷만), games — 게임 코스프레 게임별(pct 는 코스프레 컷 가운데 비율), chars — 게임 · 캐릭터별.
     캐릭터 이름은 characterKo 가 있으면 한글, 없으면 영어 그대로(character). 성별은 색인에 없어 셈하지 않는다.
   AtelierCasual.filter(rows, f) — f: all · required(필수만) · cosplay(코스프레만) · free(자유 설계만).
   AtelierCasual.outfitText(row) · cosplayText(row) — 표 칸 글(한글 칸은 색인의 *Ko, GPT 글은 영어 그대로). */
(function (root) {
  'use strict';
  var ATELIERS = [
    { key: 'sam', name: '삼국지 군막', c: '#c9a227', repo: 'sam-atelier' },
    { key: 'element', name: '원소의 섬', c: '#5fd3e8', repo: 'element-atelier' },
    { key: 'pkm', name: '포켓몬 연구소', c: '#f4c542', repo: 'pkm-atelier' }
  ];
  ATELIERS.forEach(function (a) { a.path = '/' + a.repo + '/data/casual-index.json'; });
  var FILTERS = ['all', 'required', 'cosplay', 'free'];
  var FILTER_KO = { all: '전부', required: '필수만', cosplay: '코스프레만', free: '자유 설계만' };

  /* 색인 꼴이 맞는지 — 아니면 「아직 없다」 와 같게 본다 */
  function valid(j) { return !!(j && typeof j === 'object' && Array.isArray(j.rows)); }
  function charName(c) { return (c && (c.characterKo || c.character)) || ''; }
  function tally(list, keyOf, make) {
    var m = {}, out = [];
    list.forEach(function (x) { var k = keyOf(x); if (!m[k]) { m[k] = make(x); m[k].n = 0; out.push(m[k]); } m[k].n++; });
    return out.sort(function (a, b) { return b.n - a.n; });   /* 같은 수면 처음 나온 차례(정렬은 안정) */
  }
  function summary(rows) {
    rows = rows || [];
    var req = rows.filter(function (r) { return r.required; }), cos = rows.filter(function (r) { return r.cosplay; });
    var games = tally(cos, function (r) { return r.cosplay.game || r.cosplay.gameKo || ''; }, function (r) { return { key: r.cosplay.game || '', ko: r.cosplay.gameKo || r.cosplay.game || '' }; });
    games.forEach(function (g) { g.pct = cos.length ? Math.round(g.n / cos.length * 100) : 0; });
    return {
      total: rows.length, required: req.length, cosplay: cos.length,
      free: rows.filter(function (r) { return r.free; }).length,
      gpt: cos.filter(function (r) { return r.cosplay.by === 'gpt'; }).length,
      reqs: tally(req, function (r) { return r.required; }, function (r) { return { key: r.required, ko: r.requiredKo || r.required }; }),
      games: games,
      chars: tally(cos, function (r) { return (r.cosplay.game || '') + '\u0000' + (r.cosplay.character || r.cosplay.characterKo || ''); },
        function (r) { return { game: r.cosplay.game || '', gameKo: r.cosplay.gameKo || r.cosplay.game || '', name: charName(r.cosplay) }; })
    };
  }
  function filter(rows, f) {
    rows = rows || [];
    if (f === 'required') return rows.filter(function (r) { return r.required; });
    if (f === 'cosplay') return rows.filter(function (r) { return r.cosplay; });
    if (f === 'free') return rows.filter(function (r) { return r.free; });
    return rows.slice();
  }
  /* 의상 — 갈래 · 의상(· 옷 색) */
  function outfitText(r) {
    var head = [r.familyKo, r.itemKo].filter(Boolean).join(' · ');
    return head && r.shadeKo ? head + ' · ' + r.shadeKo : (head || r.shadeKo || '');
  }
  /* 코스프레 — 게임 · 캐릭터 · 컷 */
  function cosplayText(r) {
    var c = r.cosplay; if (!c) return '';
    return [c.gameKo || c.game, charName(c), c.cutKo || c.cut].filter(Boolean).join(' · ');
  }
  var api = { ATELIERS: ATELIERS, FILTERS: FILTERS, FILTER_KO: FILTER_KO, valid: valid, summary: summary, filter: filter, outfitText: outfitText, cosplayText: cosplayText, charName: charName };
  root.AtelierCasual = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
