#!/usr/bin/env node
/* 전체 그림 찾기의 이름표(2026-11-25) — data/search-meta.json 을 옆 공방 저장소들의 표에서 짓는다.
   사용자 「새기능중에 공방넘나드는 검색,도감 추가해줘」. 그림 목록(img.json) · 일상컷 색인(casual-index.json)은 search.html 이 공방에서 바로 받고,
   여기는 그 둘에 없는 「사람이 읽는 이름」 만 작게 모은다 — 공방의 설계표는 크다(원소 2.3MB · 도시 1MB)라 화면이 받지 않는다.

     names   카드 열쇠 → 보이는 이름(열쇠가 이미 한글 이름인 공방 — 포켓몬 · 신화 · 삼국지 · 건담 — 은 비운다)
     worlds  세계 열쇠 → 한글(도시 · 원소 · 삼국지 설계표 vocab.world_ko)
     forms   폼 열쇠 → 한글(포켓몬 낱말 표 form.* · 게임 · 책 설계표 vocab.form_key 를 뒤집어)
     styles  화풍 열쇠 → 짧은 이름(공방마다 data/style.json — 이름이 같은 다른 열쇠는 「 · 열쇠」 를 붙여 가른다)
     places  일상컷 장소 한글(색인 s.pl) → 장소 묶음 열쇠(공방 data/casual-tree.json places · casual-tree-v2.json extra_places, 도시 city-life 장면은 base 장소의 묶음)
     groups  장소 묶음 열쇠 → 한글(괄호 앞까지)

   공방 표가 바뀌면(새 카드 · 새 장소) 다시 돌린다: node tools/search-meta.cjs  (--check 면 쓰지 않고 같은지만 — 다르면 1)
   모르는 이름은 화면이 열쇠 · 색인의 name 으로, 모르는 장소는 「그 밖의 장소」 로 둔다(검사 tests/search.cjs 가 옆 저장소가 있으면 새것인지 본다). */
'use strict';
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..'), SIB = path.resolve(ROOT, '..'), OUT = path.join(ROOT, 'data', 'search-meta.json');
const json = f => { try { return JSON.parse(fs.readFileSync(path.join(SIB, f), 'utf8')); } catch (e) { return null; } };
const text = f => { try { return fs.readFileSync(path.join(SIB, f), 'utf8'); } catch (e) { return ''; } };
/* 공방 — 열쇠는 즐겨찾기의 a(gallery-data.js ATELIERS 와 같다) */
const REPO = { gundam: 'atelier', book: 'book-atelier', pkm: 'pkm-atelier', myth: 'myth-atelier', game: 'game-atelier', element: 'element-atelier', samguk: 'sam-atelier', city: 'city-atelier' };

function build() {
  const out = { version: 1, note: 'tools/search-meta.cjs 가 옆 공방 저장소의 표에서 짓는다 — 손으로 고치지 않는다', groups: {}, ateliers: {} };
  const styleNames = {};   /* 열쇠 → [이름, …] */
  for (const [a, repo] of Object.entries(REPO)) {
    const m = { names: {}, worlds: {}, forms: {}, places: {} };
    /* 화풍 */
    const st = json(repo + '/data/style.json'), list = st ? (Array.isArray(st.styles) ? st.styles : Object.entries(st.styles || {}).map(([key, v]) => Object.assign({ key }, v))) : [];
    for (const s of list) if (s && s.key && s.name) (styleNames[s.key] = styleNames[s.key] || []).push(String(s.name).split(' (')[0].trim());
    /* 이름 · 세계 · 폼 */
    if (a === 'city') {
      const d = json(repo + '/data/city-design.json') || {};
      for (const c of d.cities || []) { m.names[c.key] = c.ko; for (const l of c.landmarks || []) m.names[c.key + '-' + l.key] = c.ko + ' · ' + l.ko; }
      Object.assign(m.worlds, (d.vocab || {}).world_ko || {});
    } else if (a === 'element') {
      const d = json(repo + '/data/element-design.json') || {}, el = {};
      for (const e of d.elements || []) el[e.key] = e.ko;
      for (const n of d.nations || []) {
        if (el[n.key]) m.names[n.key] = el[n.key];
        for (const f of n.families || []) { m.names[n.key + '-' + f.key] = f.ko + ' 가문주'; for (const c of f.citizens || []) m.names[n.key + '-' + f.key + '-' + c.key] = c.ko; }
      }
      Object.assign(m.worlds, (d.vocab || {}).world_ko || {});
    } else if (a === 'samguk') {
      Object.assign(m.worlds, ((json(repo + '/data/sam-design.json') || {}).vocab || {}).world_ko || {});
    } else if (a === 'game' || a === 'book') {
      const d = json(repo + '/data/' + a + '-design.json') || {};
      for (const g of d.games || d.books || []) if (g.key && g.title) m.names[g.key] = g.title;
      for (const [ko, k] of Object.entries((d.vocab || {}).form_key || {})) m.forms[k] = ko;
    } else if (a === 'pkm') {
      const w = text(repo + '/lib/words.js');
      for (const k of ['light', 'heavy', 'mobility', 'overdrive']) { const mm = w.match(new RegExp("'form\\." + k + "':\\s*'([^']+)'")); if (mm) m.forms[k] = mm[1]; }
    }
    /* 장소 → 묶음 */
    const t1 = json(repo + '/data/casual-tree.json'), t2 = json(repo + '/data/casual-tree-v2.json');
    if (t1 && Array.isArray(t1.places) && fs.existsSync(path.join(SIB, repo, 'data/casual-index.json'))) {
      const keyGroup = {};
      for (const g of t1.groups || []) if (g && g.key && g.ko && !out.groups[g.key]) out.groups[g.key] = String(g.ko).split('(')[0].trim();
      for (const p of [].concat(t1.places || [], (t2 && t2.extra_places) || [])) if (p && p.key && p.group) { keyGroup[p.key] = p.group; if (p.ko && !m.places[p.ko]) m.places[p.ko] = p.group; }
      const life = json(repo + '/data/city-life.json');
      if (life && life.cities) for (const c of Object.values(life.cities)) for (const sc of c.scenes || []) if (sc.ko && keyGroup[sc.base] && !m.places[sc.ko]) m.places[sc.ko] = keyGroup[sc.base];
    }
    for (const k of Object.keys(m)) if (!Object.keys(m[k]).length) delete m[k];
    out.ateliers[a] = m;
  }
  /* 화풍 이름 — 공방마다 이름이 조금씩 다르다(같은 열쇠 game_keyart 가 「게임 키아트 2.5D」 · 「애니 선화 …」) → 가장 짧은 것. 다른 열쇠와 겹치면 열쇠를 붙인다 */
  const styles = {};
  for (const [k, names] of Object.entries(styleNames)) styles[k] = names.slice().sort((x, y) => x.length - y.length)[0];
  const seen = {}; for (const v of Object.values(styles)) seen[v] = (seen[v] || 0) + 1;
  for (const k of Object.keys(styles)) if (seen[styles[k]] > 1) styles[k] += ' · ' + k;
  out.styles = Object.fromEntries(Object.keys(styles).sort().map(k => [k, styles[k]]));
  return out;
}
const body = JSON.stringify(build(), null, 1) + '\n';
if (require.main === module) {
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== body) { console.log('다름: data/search-meta.json — node tools/search-meta.cjs 로 다시 짓는다'); process.exit(1); }
    console.log('같음: data/search-meta.json');
  } else { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, body); console.log('썼다: data/search-meta.json (' + body.length + '자)'); }
}
module.exports = { build, body };
