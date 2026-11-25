/* 전체 그림 찾기의 자료 층(gallery-data.js) — 브라우저 없이.
   fixture(tests/fixtures/search/<저장소>/data/ — 공방 여덟의 실제 등록부 · 색인에서 카드 한둘씩 떼어 온 것)로:
   꼴마다 줄로 풀기(삼국지 · 원소 · 도시 byForm=세계 · 포켓몬 폼 · 폭주 · 그림 저장소 where · 게임 · 책 폼 · 개방 · 신화 각성 · 저주 · 스킨 · 특별컷 · 건담 기본 몫 · m · face 건너뜀 ·
   도시 전경 · 명소 카드 · 원소 화풍 몫 일상컷 · 90번), 일상컷 색인 잇기(장소 묶음 · 설계 · GPT 영어 장면), 주소(link · thumb · full),
   거르기(칸 안 「또는」 · 칸끼리 「그리고」 · 칸마다 수는 그 칸만 빼고) · 낱말 · 새 그림 · 즐겨찾기 · 줄 세우기 · 섞기 씨앗, 주소 읽기 · 쓰기, 받기(셋씩 · 공방마다 알림 · 못 받음 · 다시),
   공방 이름 · 색 = 지도 ROOMS · favorites.html ROOM, 일상컷 설명(cnote.js).
   옆에 공방 저장소가 있으면 더: lib/img.js 를 돌린 주소 = 사본 BASES 의 주소, data/search-meta.json 이 새것(tools/search-meta.cjs --check 와 같다).
   Run: node tests/search.cjs */
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..'), SIB = path.resolve(ROOT, '..'), FIX = path.join(__dirname, 'fixtures', 'search');
const G = require('../gallery-data.js'), CN = require('../cnote.js');
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'search-meta.json'), 'utf8'));
const readFix = (repo, f) => { const p = path.join(FIX, repo, 'data', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const sib = (repo, f) => path.join(SIB, repo, f);
const hasSib = repo => fs.existsSync(sib(repo, 'lib/img.js'));

/* ── 공방 표 — 지도 · 즐겨찾기와 같은 이름 · 색 ── */
const favHTML = fs.readFileSync(path.join(ROOT, 'favorites.html'), 'utf8');
assert.deepEqual(G.ATELIERS.map(d => d.a), ['gundam', 'book', 'pkm', 'myth', 'game', 'element', 'samguk', 'city'], '공방 여덟 — 즐겨찾기 차례');
for (const d of G.ATELIERS) {
  const m = favHTML.match(new RegExp(`\\b${d.a}: \\{ room: '\\w+', name: '([^']+)', c: '(#[0-9a-f]{6})'`));
  assert(m, d.a + ' 즐겨찾기 표'); assert.equal(d.name, m[1], d.a + ' 이름'); assert.equal(d.c, m[2], d.a + ' 색');
  assert(fs.existsSync(path.join(FIX, d.repo, 'data', 'img.json')), d.a + ' fixture');
}
assert.deepEqual(G.ATELIERS.filter(d => d.index).map(d => d.a), ['pkm', 'element', 'samguk', 'city'], '일상컷 색인이 있는 공방 넷');

/* ── 줄로 풀기 ── */
const by = {};
for (const d of G.ATELIERS) by[d.a] = G.normalize(d, readFix(d.repo, 'img.json'), readFix(d.repo, 'casual-index.json'), meta);
const all = [].concat(...Object.values(by));
const one = (a, re) => { const r = by[a].find(x => re.test(x.file)); assert(r, a + ' ' + re); return r; };
for (const d of G.ATELIERS) {
  const doc = readFix(d.repo, 'img.json'), files = new Set();
  (function w(v, k) { if (typeof v === 'string') { if (/\.webp$/.test(v)) files.add(v); return; } if (v && typeof v === 'object') for (const x in v) if (x !== 'face') w(v[x], x); })(doc.img);
  assert.equal(by[d.a].length, files.size, d.a + ' 등록부의 .webp 가 모두 한 줄씩');
  assert.equal(new Set(by[d.a].map(r => r.file)).size, by[d.a].length, d.a + ' 같은 파일은 한 번');
  for (const r of by[d.a]) {
    assert(G.KIND_ORDER.includes(r.kind), d.a + ' 종류 ' + r.kind);
    assert.equal(r.atelier, d.a); assert(r.cardName, d.a + ' 카드 이름');
    assert.match(r.thumb, /^https:\/\/polos0117\.github\.io\/[^/]+\/img\/thumb\//, d.a + ' 썸네일 주소'); assert.equal(r.full, r.thumb.replace('/thumb/', '/'), d.a + ' 원본 주소');
    assert(r.link.startsWith('/' + d.repo + '/'), d.a + ' 그 공방으로');
    assert.equal(new URLSearchParams(r.link.split('?')[1]).get('pic'), r.file, d.a + ' link 의 pic = 파일');
    assert.equal(r.added, (doc.added[r.file] || '').slice(0, 10), d.a + ' 들어온 날');
  }
}
/* 삼국지 — 세계 셋 · 일상컷 · 90번 · 두째 · 셋째 그림 저장소 */
{
  const w = one('samguk', /_samguk_.*_f\.webp$/);
  assert.equal(w.kind, 'world'); assert.equal(w.world, 'samguk'); assert.equal(w.worldKo, '삼국시대'); assert.equal(w.form, ''); assert.equal(w.aspect, '2:3');
  assert.equal(one('samguk', /_fantasy_.*_f\.webp$/).worldKo, '중세 판타지', '공방의 세계 이름(거르기 칸은 WORLD_KO 「판타지」)');
  const c = by.samguk.find(r => r.kind === 'casual' && r.casual);
  assert(c.casual.place || c.casual.en, '장소'); assert(c.casual.raw && c.casual.raw.card === c.card, '색인 한 줄 그대로');
  assert(by.samguk.some(r => r.kind === 'own' && r.n === 90), '90번');
  const doc = readFix('sam-atelier', 'img.json'), f = Object.keys(doc.where).find(k => doc.where[k] === 2);
  if (f) assert.match(by.samguk.find(r => r.file === f).thumb, /sam-atelier-img-3\//, 'where 2 → 셋째 그림 저장소');
  assert.equal(by.samguk[0].link.split('?')[0], '/sam-atelier/dex.html');
}
/* 포켓몬 — 폼 · 폭주 · 세계 없음 · where */
{
  const h = one('pkm', /_heavy_overdrive_/); assert.equal(h.kind, 'world'); assert.equal(h.form, 'heavy_overdrive'); assert.equal(h.formKo, '중장 폭주'); assert.equal(h.world, '');
  assert.equal(one('pkm', /_light_[a-z_]+_f\.webp$/).formKo, '경장');
  const c = one('pkm', /_casual1\.webp$/); assert.equal(c.world, ''); assert.equal(c.kind, 'casual');
  const doc = readFix('pkm-atelier', 'img.json'), f = Object.keys(doc.where)[0];
  assert.equal(by.pkm.find(r => r.file === f).thumb.split('/')[3], 'pkm-atelier-img' + (doc.where[f] ? '-' + (doc.where[f] + 1) : ''), 'where → 그 그림 저장소');
  assert.match(h.link, /^\/pkm-atelier\/dex\.html\?mech=/);
  assert(by.pkm.some(r => r.aspect === '1:1'), '색인의 화면비 1:1');
}
/* 원소 — 세계 · 전경 · 화풍 몫 일상컷(세계 없음) · 주소 n = 카드 앞 마디 */
{
  const v = one('element', /_vista\.webp$/); assert.equal(v.kind, 'vista'); assert.equal(v.aspect, '3:2'); assert(v.world, '전경도 세계를 탄다');
  const sc = by.element.find(r => r.kind === 'casual' && !r.world); assert(sc, '화풍 몫 바로 아래 일상컷');
  assert.equal(new URLSearchParams(v.link.split('?')[1]).get('n'), 'fe'); assert.equal(new URLSearchParams(v.link.split('?')[1]).get('mode'), 'list');
  assert.equal(by.element.find(r => r.card === 'pm').cardName, '프로메튬', '이름표(search-meta)');
  assert.equal(by.element.find(r => r.card === 'fe').cardName, '철');
}
/* 도시 — 명소 카드 이름 · 전경 · 주소 city = 도시 */
{
  const l = by.city.find(r => r.card === 'busan-gwanganbridge'); assert.equal(l.cardName, '부산 · 광안대교');
  const q = new URLSearchParams(l.link.split('?')[1]); assert.equal(q.get('tab'), 'dex'); assert.equal(q.get('city'), 'busan'); assert.equal(q.get('card'), 'busan-gwanganbridge');
  assert(by.city.some(r => r.kind === 'vista' && r.aspect === '3:2'), '도시 전경');
  assert.equal(one('city', /_cyberpunk_.*_f\.webp$/).worldKo, '사이버펑크');
  const life = by.city.find(r => r.casual && r.casual.place && !/^[a-z]/i.test(r.casual.place));
  assert(life && life.casual.placeGroup && life.casual.placeGroup !== 'etc', '도시 장면도 장소 묶음(city-life base)');
}
/* 게임 · 책 — 폼 · 개방 · 색인 없음 */
{
  assert.equal(one('game', /_title_open_/).formKo, '타이틀 개방'); assert.equal(one('game', /_middle_glossy/).formKo, '중반');
  assert.equal(one('book', /_middle_literary/).formKo, '전개', '같은 열쇠 middle 도 공방마다 제 이름');
  assert.equal(by.book[0].cardName, '이상한 나라의 앨리스');
  const c = one('game', /_casual1\.webp$/); assert.equal(c.kind, 'casual'); assert.equal(c.casual, null, '색인 없는 공방 — 일상컷 칸은 비었다'); assert.equal(c.aspect, '');
  assert.match(c.link, /^\/game-atelier\/dex\.html\?game=blade_and_soul&pic=/);
}
/* 신화 — 기본 · 각성 · 저주 · 스킨 · 특별컷 */
{
  assert.equal(one('myth', /_f_awaken\.webp$/).formKo, '각성'); assert.equal(one('myth', /_f_cursed\.webp$/).formKo, '저주');
  const s = by.myth.filter(r => r.form === 'skin'); assert(s.length >= 2, '스킨'); assert(s.every(r => r.kind === 'world' && r.skin), '스킨은 그림 · 이름');
  assert(s.some(r => r.formKo === '스킨 · 각성'));
  assert(by.myth.some(r => r.kind === 'other'), '특별컷(extra) → other');
}
/* 건담 — 화풍 없는 기본 몫 · m · face 는 그림이 아니다 */
{
  assert(by.gundam.some(r => r.sex === 'm' && r.kind === 'world'), '남성 초상');
  assert(by.gundam.some(r => r.style === '' && r.kind === 'casual'), '화풍 없는 기본 몫 일상컷');
  assert.match(by.gundam[0].link, /^\/atelier\/dex\.html\?mech=/);
}
/* 일상컷 색인 잇기 — 줄 하나하나가 그림 하나에 */
for (const d of G.ATELIERS.filter(x => x.index)) {
  const ix = readFix(d.repo, 'casual-index.json');
  for (const r of ix.rows) { const p = by[d.a].find(x => x.file === G.rowFile(r)); assert(p, d.a + ' 색인 줄 → 그림 ' + G.rowFile(r)); assert.deepEqual(p.casual.raw, r); }
  for (const p of by[d.a].filter(x => x.casual)) {
    const c = p.casual;
    assert(G.DESIGN_KO[c.design], '설계'); if (c.en) { assert.equal(c.place, '', 'GPT 영어 장면은 장소 칸에 안 넣는다'); assert.equal(c.act, ''); }
    if (c.place) { assert(c.placeGroup, '장소 묶음'); assert(c.placeGroupKo); }
    if (c.raw.cosplay) assert.equal(c.design, c.raw.required === 'own' ? 'own' : 'cos');
    if (c.raw.s && c.raw.s.ar) assert.equal(p.aspect, c.raw.s.ar);
  }
}

/* ── 그림 주소 — 공방의 lib/img.js 를 그대로(옆 저장소가 있을 때) = 사본 BASES ── */
for (const d of G.ATELIERS) {
  if (!hasSib(d.repo)) { console.log('  (건너뜀) 옆 저장소 없음: ' + d.repo); continue; }
  const L = G.libFrom(fs.readFileSync(sib(d.repo, 'lib/img.js'), 'utf8'));
  assert(L, d.a + ' lib/img.js 를 따로 된 창에서 돌린다');
  if (L.BASES) assert.deepEqual(G.fallbackLib(d.bases).BASES, L.BASES, d.a + ' 사본 BASES = 공방 BASES');
  const doc = JSON.parse(fs.readFileSync(sib(d.repo, 'data/img.json'), 'utf8')), F = G.fallbackLib(d.bases);
  if (L.setShards) L.setShards(doc); F.setShards(doc);
  const some = Object.keys(doc.added || {}).filter((_, i) => i % 97 === 0).concat(Object.keys(doc.where || {}).slice(0, 20));
  for (const f of some) { assert.equal(F.thumbURL(f), L.thumbURL(f), d.a + ' 썸네일 ' + f); assert.equal(F.imgURL(f), L.imgURL(f), d.a + ' 원본 ' + f); }
}
assert.equal(G.libFrom('throw new Error(1)'), null, '깨진 글이면 null(사본으로)'); assert.equal(G.libFrom(''), null);

/* ── 이름표 — 옆 저장소가 있으면 새것인지 ── */
if (G.ATELIERS.every(d => fs.existsSync(path.join(SIB, d.repo)))) {
  const { body } = require('../tools/search-meta.cjs');
  assert.equal(fs.readFileSync(path.join(ROOT, 'data/search-meta.json'), 'utf8'), body, 'data/search-meta.json 이 낡았다 — node tools/search-meta.cjs');
} else console.log('  (건너뜀) 이름표 새것 검사 — 옆 저장소가 다 있지 않다');
assert.equal(meta.groups.amusement, '놀이공원'); assert(meta.styles.kr_drawn_rim_dewy);

/* ── 거르기 ── */
const NOW = Date.UTC(2026, 10, 25, 3);
const run = (q, o) => G.run(all, G.parse(q), Object.assign({ meta, now: NOW }, o));
{
  const r0 = run('');
  assert.equal(r0.list.length, all.length, '아무것도 안 고르면 다');
  assert.equal(Object.values(r0.counts.a).reduce((x, y) => x + y, 0), all.length, '공방 칸 수의 합 = 전부');
  /* 칸 안은 또는, 칸끼리는 그리고 */
  const sc = run('?a=samguk&a=city');
  assert.equal(sc.list.length, by.samguk.length + by.city.length, '삼국지 + 도시');
  assert.equal(sc.counts.a.pkm, by.pkm.length, '공방 칸의 수는 공방 칸만 빼고 — 고르지 않은 포켓몬도 「고르면 몇 장」');
  const want = all.filter(r => ['samguk', 'city'].includes(r.atelier) && r.casual && r.casual.family === 'roleplay' && r.casual.frameKo === '허리 위');
  const ex = run('?a=samguk&a=city&fam=roleplay&fr=' + encodeURIComponent('허리 위'));
  assert(want.length > 0, 'fixture 에 「삼국지 + 도시 · 역할극 · 허리 위」 가 있다');
  assert.deepEqual(ex.list.map(r => r.file).sort(), want.map(r => r.file).sort(), '삼국지 + 도시 · 역할극 · 허리 위');
  assert.equal(ex.counts.fr['허리 위'], want.length);
  const frAny = all.filter(r => ['samguk', 'city'].includes(r.atelier) && r.casual && r.casual.family === 'roleplay' && r.casual.frameKo === '전신').length;
  assert.equal(ex.counts.fr['전신'] || 0, frAny, '구도 칸의 다른 값 = 구도만 빼고 거른 수');
  assert.equal(ex.counts.k.world || 0, 0, '세계 그림은 역할극에 안 걸린다');
  /* 수영복 · 3:2 */
  const sw = run('?fam=swimwear&ar=3:2');
  assert(sw.list.every(r => r.casual.family === 'swimwear' && r.aspect === '3:2'));
  assert.equal(sw.list.length, all.filter(r => r.casual && r.casual.family === 'swimwear' && r.aspect === '3:2').length);
  /* 색인 없는 공방 — 일상컷 칸을 고르면 빠지고, 종류 「일상컷」 에는 걸린다 */
  assert(!run('?fam=swimwear').list.some(r => r.atelier === 'game'));
  assert(run('?k=casual').list.some(r => r.atelier === 'game'));
  /* 화면비 모름 · 세계 · 폼 · 화풍 */
  assert(run('?ar=?').list.every(r => !r.aspect));
  assert.equal(run('?w=fantasy').list.length, all.filter(r => r.world === 'fantasy').length, '세계는 공방을 넘나든다(삼국지 · 원소 · 도시)');
  assert(new Set(run('?w=fantasy').list.map(r => r.atelier)).size >= 3);
  assert.equal(run('?fm=' + encodeURIComponent('전개')).list.length, 1, '폼은 한글 이름으로(책 전개 · 게임 중반이 갈린다)');
  assert(run('?st=kr_drawn_rim_dewy').list.every(r => r.style === 'kr_drawn_rim_dewy'));
  /* 장소 묶음 · 표정 */
  const pg = Object.keys(ex.counts.pg)[0]; if (pg) assert(run('?pg=' + pg).list.every(r => r.casual.placeGroup === pg));
  /* 낱말 — 띄어 쓴 낱말 모두 · 작은 글자 */
  const qa = run('?q=' + encodeURIComponent('광안대교 스팀펑크'));
  assert(qa.list.length > 0 && qa.list.every(r => G.hay(r).includes('광안대교') && G.hay(r).includes('스팀펑크')), '낱말 둘 다 든 그림만');
  assert(by.city.filter(r => r.card === 'busan-gwanganbridge' && r.world === 'steampunk').every(r => qa.list.includes(r)), '광안대교의 스팀펑크 그림은 다');
  assert(run('?q=' + encodeURIComponent('프로메튬')).list.every(r => r.card === 'pm'));
  assert(run('?q=BLADE').list.length > 0, '열쇠도 · 작은 글자로');
  /* 새 그림 — 오늘 · 3일 · 7일 · 30일 */
  const age = r => G.todayNum(NOW) - G.dayNum(r.added);
  assert.equal(run('?new=7').list.length, all.filter(r => age(r) < 7).length);
  assert.equal(r0.counts.new['30'], all.filter(r => age(r) >= 0 && age(r) < 30).length);
  /* 즐겨찾기만 */
  const fav = new Set([by.book[0].file, by.city[3].file]);
  const fr = run('?fav=1', { fav: r => fav.has(r.file) });
  assert.deepEqual(fr.list.map(r => r.file).sort(), [...fav].sort()); assert.equal(fr.counts.fav['1'], 2);
  /* 0 장 값도 고른 것이면 칸에 남는다 */
  const v = G.values('fam', run('?a=game&fam=swimwear').counts, G.parse('?a=game&fam=swimwear'), meta, all);
  assert.deepEqual(v.filter(x => x.v === 'swimwear').map(x => x.n), [0]); assert.equal(v.find(x => x.v === 'swimwear').label, '수영복', '갈래 이름은 색인의 한글');
  assert.deepEqual(G.values('a', r0.counts, G.blank(), meta).map(x => x.v), G.ATELIERS.map(d => d.a), '공방 칸은 지도 차례');
  assert.equal(G.values('pg', r0.counts, G.blank(), meta, all).find(x => x.v === pg || true).label.length > 0, true);
  /* 줄 세우기 — 새것 먼저 · 공방 · 카드 차례 · 섞기(씨앗이 같으면 같다) */
  const nw = r0.list; for (let i = 1; i < nw.length; i++) assert(nw[i - 1].t >= nw[i].t, '새것 먼저');
  const cd = run('?sort=card').list; assert.equal(cd[0].atelier, 'gundam'); assert.equal(cd[cd.length - 1].atelier, 'city', '공방 차례');
  const s1 = run('?sort=shuffle&seed=42').list.map(r => r.file), s2 = run('?sort=shuffle&seed=42').list.map(r => r.file), s3 = run('?sort=shuffle&seed=7').list.map(r => r.file);
  assert.deepEqual(s1, s2, '같은 씨앗 = 같은 차례'); assert.notDeepEqual(s1, s3, '다른 씨앗'); assert.deepEqual(s1.slice().sort(), nw.map(r => r.file).sort(), '섞어도 같은 그림');
}

/* ── 주소 ── */
{
  const q = '?a=samguk&a=city&fam=roleplay&ac=a%2Cb&fr=%ED%97%88%EB%A6%AC+%EC%9C%84&q=%EC%88%98%EC%98%81%EB%B3%B5&new=7&fav=1&sort=shuffle&seed=99';
  const s = G.parse(q);
  assert.deepEqual(s.a, ['samguk', 'city']); assert.deepEqual(s.fr, ['허리 위']); assert.deepEqual(s.ac, ['a,b'], '쉼표가 든 값도 하나');
  assert.equal(s.q, '수영복'); assert.equal(s.new, '7'); assert.equal(s.fav, '1'); assert.equal(s.sort, 'shuffle'); assert.equal(s.seed, '99');
  assert.equal(G.query(s), q, '읽고 쓰면 같은 주소');
  assert.equal(G.active(s), 8, '고른 값 다섯 + 낱말 · 새 그림 · 즐겨찾기 — 차례는 수에 안 든다');
  const bad = G.parse('?new=5&fav=2&sort=zzz&seed=1&a=samguk&a=samguk');
  assert.equal(bad.new, ''); assert.equal(bad.fav, ''); assert.equal(bad.sort, ''); assert.equal(bad.seed, '', '섞기가 아니면 씨앗 없음'); assert.deepEqual(bad.a, ['samguk'], '같은 값은 하나');
  assert.equal(G.query(G.blank()), '');
  assert.equal(G.query(G.parse('?sort=new')), '', '새것 먼저는 기본이라 안 적는다');
}

/* ── 받기 — 셋씩 나란히, 공방마다 알린다, 색인 · lib 은 없어도 된다, 못 받으면 error · 다시 ── */
(async () => {
  let live = 0, peak = 0, fail = new Set(['book-atelier']);
  const fakeFetch = url => new Promise(res => {
    live++; peak = Math.max(peak, live);
    setTimeout(() => {
      live--;
      const m = /^\/([^/]+)\/(data\/[^?]+|lib\/img\.js)$/.exec(url);
      let body = null;
      if (url === '/data/search-meta.json') body = JSON.stringify(meta);
      else if (m && !(fail.has(m[1]) && m[2] === 'data/img.json')) {
        const p = m[2] === 'lib/img.js' ? sib(m[1], 'lib/img.js') : path.join(FIX, m[1], m[2]);
        if (fs.existsSync(p)) body = fs.readFileSync(p, 'utf8');
      }
      res({ ok: body != null, status: body != null ? 200 : 404, json: async () => JSON.parse(body), text: async () => body });
    }, 5 + Math.random() * 10);
  });
  const seen = [];
  const L = G.Loader({ fetch: fakeFetch, onAtelier: a => seen.push(a) });
  L.load(['samguk', 'city']);
  await new Promise(r => setTimeout(r, 120));
  assert.deepEqual(seen.sort(), ['city', 'samguk'], '고른 공방만');
  assert.equal(L.states.pkm.state, 'idle', '안 고른 공방은 안 받는다');
  assert.equal(L.rows().length, by.samguk.length + by.city.length);
  L.load(); await new Promise(r => setTimeout(r, 300));
  assert(peak <= 3 * 3 + 1, '셋씩(공방 하나에 받기 셋 — 동시 ' + peak + ')');
  assert.equal(L.states.book.state, 'error', '못 받은 공방'); assert.match(L.states.book.error, /404/);
  assert.equal(L.rows().length, all.length - by.book.length, '나머지는 다 받았다');
  assert.equal(L.states.game.index, false, '색인 없는 공방도 된다');
  fail.clear(); L.retry('book'); await new Promise(r => setTimeout(r, 120));
  assert.equal(L.states.book.state, 'done', '다시 받기'); assert.equal(L.rows().length, all.length);
  assert.equal(L.rows(['book']).length, by.book.length);

  /* ── 일상컷 설명(cnote.js) — 두 줄 + 더 보기, GPT 영어는 lang=en ── */
  const cr = by.city.find(r => r.casual && r.casual.raw.cosplay).casual.raw;
  const h = CN.html(cr, false, 'x');
  assert.match(h, /cnote-l1/); assert.match(h, /cnote-l2/); assert.match(h, /aria-expanded="false"/); assert.match(h, /<dl class="cnote-list" id="x" hidden>/);
  assert.match(CN.html(cr, true, 'x'), /접기/);
  const fr = by.samguk.find(r => r.casual && r.casual.raw.free && r.casual.raw.free.outfit && r.casual.raw.free.outfit.length > 90).casual.raw;
  assert.match(CN.html(fr, false), /lang="en"[^>]*>[^<]* …</, '긴 Outfit 줄은 접어 둔다');
  assert.equal(CN.html(null), ''); assert.equal(CN.html({ card: 'x', s: {} }), '', '보일 것이 없으면 빈 글');
  assert.equal(CN.rowFile(cr), G.rowFile(cr));
  console.log('search: 줄 ' + all.length + '(공방 ' + G.ATELIERS.length + ') · 거르기 · 주소 · 받기 · 설명 — 통과');
})().catch(e => { console.error(e); process.exit(1); });
