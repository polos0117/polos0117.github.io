/* 그림 현황 — 공방 일곱의 설계표(대상 목록)와 그림 등록부(data/img.json)를 견주어, 대상마다 어느 칸이 찼는지 글로만 셈한다(2026-11-01).
   그림을 받지 않는다 — 등록부 JSON 만 읽는다. 브라우저(status.html)와 검사(tests/status.cjs)가 같은 파일을 쓴다.

   AtelierStatus.ATELIERS — 공방마다 {key, name(지도의 방 이름), c(지도 색), repo, dex, files: {이름: 경로}, subjects(자료) → [{key, name, sub, worlds?}], slots(대상, 몫) → [{label, ok}]}
   AtelierStatus.analyze(공방, 자료) → {cards: [{key, name, sub, slots, casual, files, status: 'full'|'part'|'none'}], sum: {cards, full, part, none, files, casual}}
     자료 = files 의 이름마다 읽은 JSON(img 는 data/img.json).
   칸은 화풍을 가리지 않는다 — 어느 화풍이든 그 칸에 그림이 있으면 찼다. 일상컷은 수만 센다(공방마다 바라는 수가 달라 판정하지 않는다).
   status — 칸이 다 차면 full, 하나라도 차면 part, 그림이 하나도 없으면 none. */
(function (root) {
  'use strict';
  function styles(e) { return e && e.byStyle ? Object.keys(e.byStyle).map(function (k) { return e.byStyle[k]; }) : (e ? [e] : []); }
  function cuts(b, slot) { var v = b && b[slot]; if (!v) return []; if (Array.isArray(v)) return v.filter(Boolean); var out = []; Object.keys(v).forEach(function (g) { (v[g] || []).forEach(function (f) { if (f) out.push(f); }); }); return out; }
  function picOf(b) { return b ? (b.f || b.m || '') : ''; }
  /* 한 대상의 몫 — 화풍을 겹쳐 본다 */
  function part(e) {
    var bs = styles(e), has = function (fn) { return bs.some(fn); };
    var files = {}, add = function (f) { if (f) files[f] = 1; };
    bs.forEach(function (b) {
      add(b.f); add(b.m);
      ['awaken', 'cursed'].forEach(function (k) { add(picOf(b[k])); });
      cuts(b, 'casual').concat(cuts(b, 'extra')).forEach(add);
      Object.keys(b.byForm || {}).forEach(function (k) { var f = b.byForm[k]; add(picOf(f)); cuts(f, 'casual').forEach(add); });
    });
    return {
      top: function (k) { return has(function (b) { return !!b[k]; }); },
      sub: function (k) { return has(function (b) { return !!picOf(b[k]); }); },
      form: function (k) { return has(function (b) { return !!picOf((b.byForm || {})[k]); }); },
      casual: function (w) {
        var n = 0;
        bs.forEach(function (b) {
          if (w === undefined) { n += cuts(b, 'casual').length; Object.keys(b.byForm || {}).forEach(function (k) { n += cuts(b.byForm[k], 'casual').length; }); }
          else n += cuts((b.byForm || {})[w], 'casual').length;
        });
        return n;
      },
      files: Object.keys(files).length
    };
  }
  /* game·book — 폼 셋과 그 개방 셋(설계표 vocab.form_key 의 차례) */
  function stageAtelier(key, name, c, repo, list, title, sub) {
    return { key: key, name: name, c: c, repo: repo, dex: '/' + repo + '/dex.html', files: { design: 'data/' + key + '-design.json', img: 'data/img.json' },
      subjects: function (d) { return (d.design[list] || []).map(function (g) { return { key: g.key, name: g[title] || g.key, sub: g[sub] || '' }; }); },
      slots: function (s, p, d) { var m = d.design.vocab.form_key, out = []; Object.keys(m).forEach(function (st) { out.push({ label: st, ok: p.form(m[st]) }, { label: st + ' 개방', ok: p.form(m[st] + '_open') }); }); return out; } };
  }
  var PKM_FORMS = [['light', '경장'], ['heavy', '중장'], ['mobility', '고기동']];
  var WORLDS = [['fantasy', '판타지'], ['steampunk', '스팀펑크'], ['mecha', '메카']];
  var SAM_WORLDS = [['samguk', '삼국시대'], ['fantasy', '중세 판타지'], ['mecha', '메카']];
  var ATELIERS = [
    { key: 'gundam', name: '건담 격납고', c: '#7fb3ff', repo: 'atelier', dex: '/atelier/dex.html', files: { mech: 'data/mech.json', img: 'data/img.json' },
      subjects: function (d) { return (d.mech.cards || []).map(function (m) { return { key: m.name, name: m.name, sub: m.models || '' }; }); },
      slots: function (s, p) { return [{ label: '초상', ok: p.top('f') || p.top('m') }]; } },
    stageAtelier('book', '책의 서재', '#e39b6b', 'book-atelier', 'books', 'title', 'author'),
    { key: 'pkm', name: '포켓몬 연구소', c: '#f4c542', repo: 'pkm-atelier', dex: '/pkm-atelier/dex.html', files: { cards: 'data/card.json', img: 'data/img.json' },
      subjects: function (d) { return ((d.cards.cards || {}).character || []).map(function (c) { return { key: c.name, name: c.name, sub: String(c.no).padStart(4, '0') + ' · ' + (c.en || '') }; }); },
      slots: function (s, p) { var out = []; PKM_FORMS.forEach(function (f) { out.push({ label: f[1], ok: p.form(f[0]) }, { label: f[1] + ' 폭주', ok: p.form(f[0] + '_overdrive') }); }); return out; } },
    { key: 'myth', name: '신화 무기 대장간', c: '#d9b45a', repo: 'myth-atelier', dex: '/myth-atelier/dex.html', files: { cards: 'data/card.json', img: 'data/img.json' },
      subjects: function (d) { return (d.cards.cards || []).map(function (c) { return { key: c.name, name: c.name, sub: c.en || '' }; }); },
      slots: function (s, p) { return [{ label: '초상', ok: p.top('f') }, { label: '각성', ok: p.sub('awaken') }, { label: '저주', ok: p.sub('cursed') }]; } },
    stageAtelier('game', '게임 오락실', '#ff6ad5', 'game-atelier', 'games', 'title', 'title_en'),
    { key: 'element', name: '원소의 섬', c: '#5fd3e8', repo: 'element-atelier', dex: '/element-atelier/dex.html', files: { design: 'data/element-design.json', img: 'data/img.json' },
      /* 나라 › 가문 › 주민 — 주민은 사는 세계만 */
      subjects: function (d) {
        var out = [], els = {}; (d.design.elements || []).forEach(function (e) { els[e.key] = e; });
        (d.design.nations || []).forEach(function (n) {
          var e = els[n.key] || {}, head = (e.symbol || n.key) + ' ' + (e.ko || '');
          out.push({ key: n.key, name: (e.ko || n.key) + ' 근본', sub: head, worlds: WORLDS.map(function (w) { return w[0]; }) });
          (n.families || []).forEach(function (f) {
            out.push({ key: n.key + '-' + f.key, name: f.ko + ' 가문주', sub: head, worlds: WORLDS.map(function (w) { return w[0]; }) });
            (f.citizens || []).forEach(function (c) { out.push({ key: n.key + '-' + f.key + '-' + c.key, name: c.ko, sub: head + ' · ' + f.ko, worlds: c.worlds || [] }); });
          });
        });
        return out;
      },
      /* 세계 그림 칸 + 그 세계의 일상컷 수(칸 판정에는 안 넣는다) */
      slots: function (s, p) { return WORLDS.filter(function (w) { return s.worlds.indexOf(w[0]) >= 0; }).map(function (w) { return { label: w[1], ok: p.form(w[0]), casual: p.casual(w[0]) }; }); } },
    /* 삼국지(2026-11-02) — 장수 한 명이 세 세계(삼국시대 · 중세 판타지 · 메카). 게임의 초상(images/)은 셈하지 않는다 — 새 그림 구조(data/img.json)만 */
    { key: 'samguk', name: '삼국지 군막', c: '#c9a227', repo: 'sam-atelier', dex: '/sam-atelier/dex.html', files: { design: 'data/sam-design.json', img: 'data/img.json' },
      subjects: function (d) {
        var fac = {}; (d.design.factions || []).forEach(function (f) { fac[f.key] = f; });
        return (d.design.generals || []).map(function (g) { var f = fac[g.faction] || {}; return { key: g.key, name: g.key, sub: (f.hanja ? f.hanja + ' ' : '') + (g.en || '') + (g.designed === 'hand' ? ' ★' : '') }; });
      },
      slots: function (s, p) { return SAM_WORLDS.map(function (w) { return { label: w[1], ok: p.form(w[0]), casual: p.casual(w[0]) }; }); } }
  ];
  function analyze(a, data) {
    var img = (data.img && data.img.img) || {}, sum = { cards: 0, full: 0, part: 0, none: 0, files: 0, casual: 0 };
    var cards = a.subjects(data).map(function (s) {
      var p = part(img[s.key]), slots = a.slots(s, p, data), ok = slots.filter(function (x) { return x.ok; }).length;
      var status = p.files === 0 ? 'none' : ok === slots.length ? 'full' : 'part';
      var r = { key: s.key, name: s.name, sub: s.sub, slots: slots, casual: p.casual(), files: p.files, status: status };
      sum.cards++; sum[status]++; sum.files += p.files; sum.casual += r.casual;
      return r;
    });
    return { cards: cards, sum: sum };
  }
  var api = { ATELIERS: ATELIERS, analyze: analyze, part: part };
  root.AtelierStatus = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
