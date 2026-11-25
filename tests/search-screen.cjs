/* 전체 그림 찾기(search.html) — 화면. 공방 여덟의 fixture 등록부 · 색인(tests/fixtures/search)을 공방 자리(/<저장소>/data/…)로 내준다.
   lib/img.js 는 옆 저장소에 있으면 그것(없으면 404 → gallery-data.js 사본 BASES). 바깥 그림은 받지 않는다 — 파일마다 그 화면비의 색 칸(SVG).
   390×844(휴대폰): 다 받으면 수 · 공방 칩 여덟 · 거르기 시트(삼국지 + 도시 · 역할극 · 허리 위 — 수 = 자료 층 셈, 0장 값은 흐리게, 주소에 남고 새로 고쳐도 · 뒤로 가기는 앞 거르기) ·
     고른 것 칩(빼기 · 모두 지우기) · 낱말 · 차례(공방 · 카드 / 섞기 씨앗) · 「수영복 · 3:2」 · 크게 보기(꽉 채우기 · 설명 두 줄 + 더 보기 · 하트 = 즐겨찾기 칸 · ← → · 다음 단추 · Esc · 뒤로 가기) ·
     즐겨찾기만 · 격자 칸의 ♥.
   844×390(휴대폰 가로): 그림만 · 닫기만.  1280×900: 거르기 칸이 왼쪽에 붙어 있다 · 3:2 도 꽉 채우기 없음.  884×1104(펼친 폴드) · 344×882: 옆으로 안 넘친다.
   1만 2천 장(포켓몬 등록부를 부풀린 것): 격자는 보이는 줄만(li 수십) · 끝까지 굴리면 마지막 칸.
   SHOT_DIR 을 주면 deviceScaleFactor 2 로 넷을 찍는다 — 휴대폰 거르기 시트 · 휴대폰 「수영복 · 3:2」 · 휴대폰 크게 보기(설명) · PC 결과.
   Run: CHROMIUM_PATH=<chrome> NODE_PATH=<playwright 가 있는 node_modules> node tests/search-screen.cjs   (SEARCH_PORT 로 자리 바꾸기, 기본 8771) */
'use strict';
const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), SIB = path.resolve(ROOT, '..'), FIX = path.join(__dirname, 'fixtures', 'search');
const PORT = +(process.env.SEARCH_PORT || 8771), BASE = 'http://127.0.0.1:' + PORT, SHOT = process.env.SHOT_DIR;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
const G = require('../gallery-data.js');
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/search-meta.json'), 'utf8'));
const KEY = 'atelier_favorites_v1';

/* 자료 층으로 셈한 기대값 */
const fix = (repo, f) => { const p = path.join(FIX, repo, 'data', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const all = [].concat(...G.ATELIERS.map(d => G.normalize(d, fix(d.repo, 'img.json'), fix(d.repo, 'casual-index.json'), meta)));
const expect = q => G.run(all, G.parse(q), { meta }).list;
const aspectOf = {}; for (const r of all) aspectOf[r.file] = r.aspect;
const fmt = n => n.toLocaleString('ko-KR');

/* 1만 2천 장 — 포켓몬 등록부를 부풀린다(카드 400 × 일상컷 30) */
const BIG = (() => {
  const doc = { img: {}, added: {} };
  for (let c = 0; c < 400; c++) { const k = 'big' + c, list = []; for (let n = 1; n <= 30; n++) { const f = k + '_anime_gloss_f_casual' + n + '.webp'; list.push(f); doc.added[f] = '2026-11-' + String(1 + (n % 25)).padStart(2, '0'); } doc.img[k] = { byStyle: { anime_gloss: { casual: { f: list } } } }; }
  return JSON.stringify(doc);
})();

let big = false;
const server = http.createServer((q, s) => {
  const u = new URL(q.url, BASE), p = decodeURIComponent(u.pathname), seg = p.split('/')[1];
  let f = null, body = null;
  if (/^(atelier|[a-z]+-atelier)$/.test(seg)) {
    const rest = p.slice(seg.length + 2);
    if (big && seg === 'pkm-atelier' && rest === 'data/img.json') body = BIG;
    else if (big && seg === 'pkm-atelier' && rest === 'data/casual-index.json') body = null;
    else if (rest.startsWith('data/')) f = path.join(FIX, seg, rest);
    else if (rest === 'lib/img.js') f = path.join(SIB, seg, rest);
  } else f = path.join(ROOT, p.replace(/\/$/, '/index.html'));
  if (body != null) { s.setHeader('Content-Type', 'application/json'); return s.end(body); }
  if (!f || !(f.startsWith(ROOT) || f.startsWith(SIB))) { s.writeHead(403); return s.end(); }
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); s.end(d); });
}).listen(PORT);

/* 바깥 그림 — 그 파일의 화면비로 색 칸 */
const SIZE = { '2:3': [1024, 1536], '3:2': [1536, 1024], '1:1': [1024, 1024] };
async function routeArt(ctx) {
  await ctx.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.origin === BASE) return r.continue();
    if (u.hostname === 'polos0117.github.io' && /\.webp$/.test(u.pathname)) {
      const file = decodeURIComponent(u.pathname.split('/').pop()), thumb = u.pathname.includes('/thumb/');
      let [w, h] = SIZE[aspectOf[file]] || SIZE['2:3']; if (thumb) { const k = 512 / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
      const hue = [...file].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
      return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="hsl(${hue} 35% 22%)"/><circle cx="${w / 2}" cy="${h * .42}" r="${Math.min(w, h) * .22}" fill="hsl(${hue} 60% 62%)" opacity=".8"/><rect x="${w * .3}" y="${h * .62}" width="${w * .4}" height="${h * .28}" rx="${w * .05}" fill="hsl(${(hue + 40) % 360} 50% 55%)" opacity=".7"/></svg>` });
    }
    return r.fulfill({ status: 404, body: '' });
  });
}

(async () => {
  const br = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
  async function page(vp, mobile, opt = {}) {
    const ctx = await br.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: SHOT ? 2 : 1, reducedMotion: 'reduce' });
    await routeArt(ctx);
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(String(e)));
    return { ctx, p, errors };
  }
  const ready = p => p.waitForFunction(() => window.AtelierSearch && Object.values(AtelierSearch.loader.states).filter(s => s.state !== 'idle').every(s => s.state === 'done' || s.state === 'error') && !!document.querySelector('#count b'), null, { timeout: 20000 });
  const count = async p => +((await p.locator('#count b').textContent()).replace(/,/g, ''));
  const noOverflow = async (p, name) => assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + ' 가로 넘침');
  const targets = async (p, sel, name) => { for (const b of await p.locator(sel).all()) { if (!(await b.isVisible())) continue; const r = await b.boundingBox(); assert(r.height >= 44 && r.width >= 44, name + ' 누르는 자리 ' + sel + ' ' + JSON.stringify(r)); } };
  const shot = async (p, n) => { if (!SHOT) return; fs.mkdirSync(SHOT, { recursive: true }); await p.waitForTimeout(150); await p.screenshot({ path: path.join(SHOT, n) }); };
  const urlSel = p => G.parse(new URL(p.url()).search);
  try {
    /* ── 휴대폰 세로 ── */
    {
      const { ctx, p, errors } = await page({ width: 390, height: 844 }, true);
      const tap = sel => p.locator(sel).first().tap();
      await p.goto(BASE + '/search.html'); await ready(p);
      assert.equal(await count(p), all.length, '다 받으면 그림 전부');
      assert.equal(await p.locator('#load').textContent(), '', '다 받으면 받는 줄이 사라진다');
      const face = await p.locator('.tile .face').first().boundingBox(); assert(Math.abs(face.width / face.height - 2 / 3) < .02, '2:3 칸');
      const cols = await p.evaluate(() => AtelierSearch.layout().cols); assert.equal(cols, 3, '390 폭은 세 칸');
      assert(await p.locator('#grid li').count() < all.length, '보이는 줄만 그린다');
      assert.equal(await p.locator('#panel').isVisible(), false, '휴대폰 — 거르기는 시트로');
      await targets(p, '#q, #open-panel, .sortsel, .home', '390');
      await noOverflow(p, '390');

      /* 거르기 시트 — 삼국지 + 도시 · 역할극 · 허리 위 */
      await tap('#open-panel'); await p.waitForSelector('#panel.open');
      assert.equal(await p.locator('#panel').getAttribute('role'), 'dialog');
      assert.deepEqual(await p.locator('.fc[data-f="a"]').evaluateAll(es => es.map(e => e.dataset.v)), G.ATELIERS.map(d => d.a), '공방 칩 여덟 — 지도 차례');
      for (const d of G.ATELIERS) assert.equal((await p.locator(`.fc[data-f="a"][data-v="${d.a}"]`).getAttribute('style')).match(/#[0-9a-f]{6}/)[0], d.c, d.a + ' 색');
      await tap('.fc[data-f="a"][data-v="samguk"]'); await tap('.fc[data-f="a"][data-v="city"]');
      await tap('.fc[data-f="fam"][data-v="roleplay"]');
      const before = expect('?a=samguk&a=city&fam=roleplay');
      assert.equal(await count(p), before.length, '삼국지 + 도시 · 역할극');
      await tap('.fc[data-f="fr"][data-v="허리 위"]');
      const ex = expect('?a=samguk&a=city&fam=roleplay&fr=' + encodeURIComponent('허리 위'));
      assert(ex.length > 0); assert.equal(await count(p), ex.length, '삼국지 + 도시 · 역할극 · 허리 위');
      assert.match(await p.locator('#p-done').textContent(), new RegExp(ex.length + '장 보기'), '시트 아래 「n장 보기」');
      const s = urlSel(p); assert.deepEqual([s.a, s.fam, s.fr], [['samguk', 'city'], ['roleplay'], ['허리 위']], '주소에 남는다');
      assert.equal(await p.locator('.fc[data-f="fr"][data-v="허리 위"]').getAttribute('aria-pressed'), 'true');
      assert.match(await p.locator('.fc[data-f="a"][data-v="game"]').getAttribute('class'), /zero/, '0장 값은 흐리게(게임 — 역할극이 없다)');
      assert.match(await p.locator('.fc[data-f="a"][data-v="pkm"] b').textContent(), /^\d/, '고르지 않은 공방도 「고르면 몇 장」');
      assert.equal(await p.locator('.facet[data-f="fr"] .fsel').textContent(), '1', '칸 제목에 고른 수');
      await tap('.facet[data-f="pl"] > summary'); assert.equal(await p.locator('.facet[data-f="pl"]').getAttribute('open'), '', '접힌 칸을 편다');
      await p.locator('.fsearch[data-f="pl"]').fill('없는장소이름'); assert.match(await p.locator('.facet[data-f="pl"] .fbody').textContent(), /맞는 값이 없어요/, '칸 안 찾기'); await p.locator('.fsearch[data-f="pl"]').fill('');
      await targets(p, '#panel .fc, #panel .p-btn', '시트');
      await p.evaluate(() => document.querySelector('#facets').scrollTo(0, 0));
      await shot(p, 'phone-filters-open.png');
      await tap('#p-done'); await p.waitForSelector('#panel:not(.open)', { state: 'attached' });
      assert.deepEqual(await p.locator('#active .ac[data-f]').evaluateAll(es => es.map(e => e.dataset.f + ':' + e.dataset.v)), ['a:samguk', 'a:city', 'fam:roleplay', 'fr:허리 위'], '고른 것 칩');
      assert.equal(await p.locator('#nact').textContent(), '4');
      const files = await p.locator('.tile').evaluateAll(es => es.slice(0, 6).map(e => +e.dataset.i));
      assert.deepEqual(files, files.slice().sort((a, b) => a - b));
      /* 새로 고쳐도 · 뒤로 가기는 앞 거르기 */
      await p.reload(); await ready(p);
      assert.equal(await count(p), ex.length, '새로 고쳐도 거른 채');
      assert.deepEqual(await p.evaluate(() => Object.entries(AtelierSearch.loader.states).filter(([, s]) => s.state === 'done').map(([a]) => a).sort()), ['city', 'samguk'], '공방을 고른 주소 — 그 공방만 받는다');
      assert.equal(await p.locator('.fc[data-f="a"][data-v="pkm"] b').textContent(), '—', '안 받은 공방은 「—」');
      await p.goBack(); await p.waitForFunction(n => +document.querySelector('#count b').textContent.replace(/,/g, '') === n, before.length);
      assert.equal(urlSel(p).fr.length, 0, '뒤로 가기 — 구도를 고르기 전');
      await p.goForward(); await p.waitForFunction(n => +document.querySelector('#count b').textContent.replace(/,/g, '') === n, ex.length);
      /* 고른 것 칩 — 누르면 빠진다 · 모두 지우기 */
      await tap('#active .ac[data-f="fr"]'); assert.equal(await count(p), before.length, '칩을 누르면 그 값만 빠진다');
      await tap('#active .ac[data-clear]'); await p.waitForFunction(n => +document.querySelector('#count b').textContent.replace(/,/g, '') === n, all.length);
      assert.doesNotMatch(await p.locator('#count').textContent(), /받는 중/, '모두 지우기 — 안 받았던 공방도 받아 전부'); assert.equal(new URL(p.url()).search, '');
      /* 낱말 */
      await p.locator('#q').fill('광안대교'); await p.waitForFunction(() => new URL(location.href).searchParams.get('q') === '광안대교');
      assert.equal(await count(p), expect('?q=' + encodeURIComponent('광안대교')).length, '낱말 찾기');
      await p.locator('#q').fill(''); await p.waitForFunction(n => +document.querySelector('#count b').textContent.replace(/,/g, '') === n, all.length);
      /* 차례 — 공방 · 카드 / 섞기(씨앗이 주소에) */
      await p.locator('#sort').selectOption('card');
      assert.equal(new URL(p.url()).searchParams.get('sort'), 'card');
      assert.match(await p.locator('.tile[data-i="0"]').getAttribute('aria-label'), /건담 격납고/, '공방 차례 — 건담부터');
      await p.locator('#sort').selectOption('shuffle');
      const seed = new URL(p.url()).searchParams.get('seed'); assert.match(seed, /^\d+$/, '섞기 씨앗'); assert.equal(await p.locator('#reshuffle').isVisible(), true);
      const order = await p.locator('.tile').evaluateAll(es => es.slice(0, 6).map(e => e.getAttribute('aria-label')));
      await p.reload(); await ready(p);
      assert.deepEqual(await p.locator('.tile').evaluateAll(es => es.slice(0, 6).map(e => e.getAttribute('aria-label'))), order, '같은 씨앗 — 새로 고쳐도 같은 차례');
      await p.locator('#sort').selectOption('new');

      /* 「수영복 · 3:2」 */
      await p.goto(BASE + '/search.html?fam=swimwear&ar=3:2'); await ready(p);
      const sw = expect('?fam=swimwear&ar=3:2'); assert(sw.length > 0); assert.equal(await count(p), sw.length, '수영복 · 3:2');
      assert.equal(await p.locator('.tile[data-i="0"]').getAttribute('data-ar'), '3:2');
      assert.equal(await p.locator('.tile[data-i="0"] .badge').textContent(), '3:2', '정사각 · 가로 그림은 칸에 화면비');
      assert.equal(await p.locator('.tile[data-i="0"] img').evaluate(i => getComputedStyle(i).objectFit), 'contain', '가로 그림은 칸 안에 담는다');
      await p.waitForFunction(() => [...document.querySelectorAll('.tile img')].every(i => i.complete)).catch(() => {});
      await shot(p, 'phone-results-swimwear-3x2.png');

      /* 크게 보기 */
      await tap('.tile[data-i="0"]'); await p.waitForSelector('#viewer:not([hidden])');
      const r0 = sw[0];
      assert.equal(await p.locator('#v-title').textContent(), r0.cardName);
      assert.equal(await p.locator('#v-count').textContent(), '1 / ' + sw.length);
      assert.equal(await p.locator('#v-link').getAttribute('href'), r0.link, '그 공방에서 보기');
      assert.equal(decodeURIComponent((await p.locator('#v-stage img.on').getAttribute('src')).split('/').pop()), r0.file, '원본 그림');
      assert.match(await p.locator('#v-room').getAttribute('style'), new RegExp(G.BY[r0.atelier].c), '공방 색');
      /* 설명 두 줄 + 더 보기 */
      assert.equal(await p.locator('#v-cnote').isVisible(), true, '일상컷 설명');
      assert.equal(await p.locator('#v-cnote .cnote-l1').count(), 1); assert.equal(await p.locator('#v-cnote .cnote-l2').count(), 1);
      assert.equal(await p.locator('#v-cnote .cnote-list').isVisible(), false);
      await tap('#v-cnote .cnote-more'); assert.equal(await p.locator('#v-cnote .cnote-list').isVisible(), true, '더 보기'); assert.equal(await p.locator('#v-cnote .cnote-more').getAttribute('aria-expanded'), 'true');
      assert.match(await p.locator('#v-cnote .cnote-list').textContent(), /화면비\s*3:2/);
      await shot(p, 'phone-viewer-caption.png');
      await tap('#v-cnote .cnote-more');
      /* 꽉 채우기 — 휴대폰 세로의 3:2 */
      await p.waitForSelector('#v-fill:not([hidden])');
      await tap('#v-fill'); assert.match(await p.locator('#v-stage').getAttribute('class'), /is-fill/, '꽉 채우기');
      const fs_ = await p.locator('#v-stage .fill-scroll').boundingBox(), stg = await p.locator('#v-stage').boundingBox();
      assert(Math.abs(fs_.height - stg.height) < 2, '칸 높이에 맞춘다');
      assert(await p.locator('#v-stage .fill-scroll').evaluate(e => e.scrollWidth > e.clientWidth + 20), '옆으로 민다');
      await tap('#v-fill'); assert.doesNotMatch(await p.locator('#v-stage').getAttribute('class') || '', /is-fill/, '맞춰 보기로');
      /* 하트 — 즐겨찾기 칸(favorites.js 꼴) */
      await tap('#v-fav'); assert.equal(await p.locator('#v-fav').getAttribute('aria-pressed'), 'true');
      const fav = await p.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), KEY);
      assert.equal(fav.length, 1); assert.deepEqual([fav[0].a, fav[0].file, fav[0].title, fav[0].link], [r0.atelier, r0.file, r0.cardName, r0.link], '담은 칸');
      assert.match(fav[0].thumb, /\/thumb\//); assert.match(await p.locator('#toast').textContent(), /담았어요/);
      /* ← → · 다음 단추 · 밀기 */
      await tap('#v-next'); assert.equal(await p.locator('#v-count').textContent(), '2 / ' + sw.length, '다음 단추');
      assert.equal(await p.locator('#v-fav').getAttribute('aria-pressed'), 'false', '다음 그림은 안 담겼다');
      await p.keyboard.press('ArrowLeft'); assert.equal(await p.locator('#v-count').textContent(), '1 / ' + sw.length, '← 키');
      await p.keyboard.press('ArrowLeft'); assert.equal(await p.locator('#v-count').textContent(), sw.length + ' / ' + sw.length, '처음에서 ← 는 끝으로');
      await p.keyboard.press('ArrowRight');
      await targets(p, '#viewer .v-btn:not(.v-nav)', '크게 보기');
      await noOverflow(p, '크게 보기');
      /* Esc — 닫고 그 칸으로 초점 */
      await p.keyboard.press('Escape'); await p.waitForSelector('#viewer[hidden]', { state: 'attached' });
      assert.equal(await p.evaluate(() => document.activeElement.dataset.i), '0', '닫으면 연 칸으로 초점');
      assert.equal(await p.locator('.tile[data-i="0"] .heart').count(), 1, '격자 칸에 ♥');
      assert.equal(new URL(p.url()).searchParams.get('fam'), 'swimwear', '닫아도 거르기 그대로');
      /* 뒤로 가기는 크게 보기만 닫는다 */
      await tap('.tile[data-i="1"]'); await p.waitForSelector('#viewer:not([hidden])');
      await p.goBack(); await p.waitForSelector('#viewer[hidden]', { state: 'attached' });
      assert.equal(await count(p), sw.length, '뒤로 가기 — 거르기는 그대로');
      /* 즐겨찾기만 */
      await p.goto(BASE + '/search.html?fav=1'); await ready(p);
      assert.equal(await count(p), 1, '즐겨찾기만'); assert.match(await p.locator('#fav-link').textContent(), /즐겨찾기 1/);
      await tap('.tile[data-i="0"]'); await p.waitForSelector('#viewer:not([hidden])');
      await tap('#v-fav'); await p.waitForSelector('#viewer[hidden]', { state: 'attached' });
      assert.equal(await count(p), 0, '빼면 즐겨찾기만에서 빠진다'); assert.equal(await p.locator('#empty').isVisible(), true, '맞는 그림이 없어요');
      /* 색인 없는 공방의 일상컷 — 설명 없음 */
      await p.goto(BASE + '/search.html?a=game&k=casual'); await ready(p);
      await tap('.tile[data-i="0"]'); await p.waitForSelector('#viewer:not([hidden])');
      assert.equal(await p.locator('#v-cnote').isVisible(), false, '색인 없는 공방 — 설명 없음'); assert.equal(await p.locator('#v-fill').isVisible(), false, '2:3 은 꽉 채우기 없음');
      assert.deepEqual(errors, [], '휴대폰 오류 없음');
      await ctx.close();
    }
    /* ── 휴대폰 가로 — 그림만 · 닫기만 ── */
    {
      const { ctx, p, errors } = await page({ width: 844, height: 390 }, true);
      await p.goto(BASE + '/search.html?fam=swimwear&ar=3:2'); await ready(p);
      await p.locator('.tile[data-i="0"]').tap(); await p.waitForSelector('#viewer:not([hidden])');
      assert.equal(await p.locator('.v-foot').isVisible(), false, '아래 막대는 숨는다');
      assert.equal(await p.locator('#v-close').isVisible(), true); assert.equal(await p.locator('#v-count').isVisible(), false, '위 줄은 닫기만');
      const im = await p.locator('#v-stage img.on').boundingBox(); assert(im.height > 360, '그림이 화면 높이 가득');
      assert.deepEqual(errors, []); await ctx.close();
    }
    /* ── PC — 거르기 칸이 왼쪽에 · 3:2 도 꽉 채우기 없음 ── */
    {
      const { ctx, p, errors } = await page({ width: 1280, height: 900 }, false);
      await p.goto(BASE + '/search.html'); await ready(p);
      assert.equal(await p.locator('#panel').isVisible(), true, 'PC — 거르기 칸이 늘 보인다'); assert.equal(await p.locator('#open-panel').isVisible(), false);
      const pb = await p.locator('#panel').boundingBox(), gb = await p.locator('#grid').boundingBox(); assert(pb.x + pb.width <= gb.x, '왼쪽 칸 · 오른쪽 격자');
      assert((await p.evaluate(() => AtelierSearch.layout().cols)) >= 5, 'PC 는 다섯 칸 넘게');
      await p.locator('.fc[data-f="k"][data-v="casual"]').click();
      assert.equal(await count(p), expect('?k=casual').length, 'PC 칩');
      await p.locator('.fc[data-f="ar"][data-v="3:2"]').click();
      await p.waitForFunction(() => [...document.querySelectorAll('.tile img')].every(i => i.complete)).catch(() => {});
      await p.evaluate(() => scrollTo(0, 0));
      await shot(p, 'desktop-results.png');
      await p.locator('.tile[data-i="0"]').click(); await p.waitForSelector('#viewer:not([hidden])');
      await p.waitForTimeout(150); assert.equal(await p.locator('#v-fill').isVisible(), false, 'PC 는 3:2 도 맞춤으로 충분');
      await targets(p, '#panel .fc', 'PC'); await noOverflow(p, 'PC');
      assert.deepEqual(errors, []); await ctx.close();
    }
    /* ── 펼친 폴드 · 좁은 휴대폰 — 옆으로 안 넘친다 ── */
    for (const vp of [{ width: 884, height: 1104 }, { width: 344, height: 882 }]) {
      const { ctx, p, errors } = await page(vp, true);
      await p.goto(BASE + '/search.html?a=city'); await ready(p);
      await noOverflow(p, vp.width + ''); await p.locator('#open-panel').tap(); await noOverflow(p, vp.width + ' 시트');
      assert.deepEqual(errors, []); await ctx.close();
    }
    /* ── 1만 2천 장 — 보이는 줄만 ── */
    {
      big = true;
      const { ctx, p, errors } = await page({ width: 390, height: 844 }, true);
      await p.goto(BASE + '/search.html?a=pkm'); await ready(p);
      const n = await count(p); assert.equal(n, 12000, '부풀린 포켓몬');
      assert(await p.locator('#grid li').count() < 80, '격자 칸은 수십(' + await p.locator('#grid li').count() + ')');
      await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(200);
      assert.equal(await p.locator(`.tile[data-i="${n - 1}"]`).count(), 1, '끝까지 굴리면 마지막 칸');
      assert(await p.locator('#grid li').count() < 80, '굴려도 칸 수는 그대로');
      const t0 = Date.now(); await p.locator('#q').fill('big39'); await p.waitForFunction(() => new URL(location.href).searchParams.get('q') === 'big39');
      assert.equal(await count(p), 30 + 300, 'big39 · big390~399'); assert(Date.now() - t0 < 3000, '1만 2천 장 낱말 찾기가 빠르다');
      assert.deepEqual(errors, []); await ctx.close();
      big = false;
    }
    console.log('search-screen: 휴대폰(거르기 · 주소 · 크게 보기 · 하트) · 가로 · PC · 폴드 · 1만 2천 장 — 통과');
  } finally { await br.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
