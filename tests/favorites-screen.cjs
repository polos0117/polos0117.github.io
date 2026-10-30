/* 내 즐겨찾기(favorites.html) — 공방 넷의 도감이 atelier_favorites_v1 에 담은 그림을 모아 본다.
   네 공방의 칸을 심어 두고: 새것부터 2:3 칸 · 공방 칩(지도 ROOMS 의 색)으로 거르기(?a=, 새로 고쳐도) · 크게 보기(← → 키·밀기·Esc·초점 되돌림·
   「그 공방에서 보기」= 칸의 link) · 빼기(저장소에서 빠지고 다음 그림이 뜬다) · 감상 모드(6초마다, 손대면 멈춤, 움직임 줄이기면 잠김) ·
   빈 자리(공방 도감 넷으로 가는 문) · 저장이 막힌 브라우저 · 공방 지도의 「즐겨찾기 n」 과 목록 아래 줄 · favorites.js 동작(500칸·같은 그림 하나·막힌 저장).
   344×882 · 390×844 · 844×390 · 690×829 · 1280×900 에서 옆으로 넘치지 않고 누르는 자리 44px.
   바깥 그림은 받지 않는다 — 옆 저장소에 같은 파일이 있으면 그것, 없으면 색 칸(SVG). SHOT_DIR 을 주면 390×844 · 1280×900 화면을 찍는다.
   Run: CHROMIUM_PATH=<chrome> NODE_PATH=<playwright 가 있는 node_modules> node tests/favorites-screen.cjs   (FAV_PORT 로 자리 바꾸기, 기본 8767) */
const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), PORT = +(process.env.FAV_PORT || 8767), BASE = 'http://127.0.0.1:' + PORT, SIBLINGS = path.resolve(ROOT, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.js': 'text/javascript' };
const KEY = 'atelier_favorites_v1';

/* ── favorites.js 그 자체 — 브라우저 없이 가짜 저장소로 ── */
function sandbox(storage) {
  const events = [], win = { localStorage: storage, addEventListener() {}, removeEventListener() {}, dispatchEvent(e) { events.push(e.type); } };
  const box = { window: win, CustomEvent: function (t) { this.type = t; }, JSON, Date, Array, String };
  vm.createContext(box); vm.runInContext(fs.readFileSync(path.join(ROOT, 'favorites.js'), 'utf8'), box);
  return { F: win.AtelierFavorites, events };
}
const memory = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, m }; };
{
  const st = memory(), { F, events } = sandbox(st);
  const e = i => ({ a: 'book', key: 'k' + i, file: 'f' + i + '.webp', title: 't' + i, sub: 's', thumb: 'https://x/t', full: 'https://x/f', link: '/book-atelier/dex.html?book=k' });
  assert.equal(F.toggle(e(1)), true, '담으면 참'); assert.equal(F.has('book', 'f1.webp'), true); assert.equal(F.has('myth', 'f1.webp'), false, '공방이 다르면 다른 그림');
  assert.equal(F.toggle(e(2)), true); assert.deepEqual(Array.from(F.list(), x => x.file), ['f2.webp', 'f1.webp'], '새것이 앞');
  assert(!isNaN(Date.parse(F.list()[0].at)), '담은 때');
  assert.equal(F.toggle(e(1)), false, '다시 누르면 빠진다'); assert.equal(F.count(), 1);
  assert.equal(F.remove('book', 'f2.webp'), true); assert.equal(F.remove('book', 'f2.webp'), false, '없는 것은 못 뺀다'); assert.equal(F.count(), 0);
  for (let i = 0; i < 520; i++) F.toggle(e(i));
  assert.equal(F.count(), 500, '500칸까지'); assert.equal(F.list()[0].file, 'f519.webp', '넘치면 오래된 것부터 빠진다');
  assert(events.includes('atelier-favorites'), '같은 탭 알림');
  st.setItem(KEY, '{bad'); assert.equal(F.list().length, 0, '깨진 값은 빈 목록');
  st.setItem(KEY, JSON.stringify([{ a: 'book' }, null, { a: 'myth', file: 'm.webp', title: 1 }])); assert.deepEqual(Array.from(F.list(), x => x.file), ['m.webp'], '모양이 틀린 칸은 건너뛴다');
  assert.equal(F.list()[0].title, '1', '값은 글자로');
  const no = () => { throw new Error('blocked'); };
  const { F: B } = sandbox({ getItem: no, setItem: no, removeItem: no });
  assert.equal(B.available(), false); assert.equal(B.list().length, 0); assert.equal(B.toggle(e(1)), false, '막힌 저장소 — 못 담았다'); assert.equal(B.remove('book', 'f1.webp'), false);
  const { F: N } = sandbox(undefined); assert.equal(N.available(), false); assert.equal(N.toggle(e(1)), false, '저장소가 없어도 던지지 않는다');
}

/* 지도의 방 색 — favorites.html 의 ROOM 이 같아야 한다(즐겨찾기의 pkm = 지도의 pokemon) */
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), favHTML = fs.readFileSync(path.join(ROOT, 'favorites.html'), 'utf8');
const mapColor = {}; for (const m of index.matchAll(/\{ key: '(\w+)', name: '([^']+)'[^\n]*? c: '(#[0-9a-f]{6})'/g)) mapColor[m[1]] = { name: m[2], c: m[3] };
const ROOM_OF = { gundam: 'gundam', book: 'book', pkm: 'pokemon', myth: 'myth', game: 'game' };
for (const [a, room] of Object.entries(ROOM_OF)) {
  const m = favHTML.match(new RegExp(`\\b${a}: \\{ room: '${room}', name: '([^']+)', c: '(#[0-9a-f]{6})'`));
  assert(m && mapColor[room], a + ' 공방 표가 있다');
  assert.equal(m[2], mapColor[room].c, a + ' 색 = 지도 ' + room); assert.equal(m[1], mapColor[room].name, a + ' 이름 = 지도 ' + room);
}

/* 심을 칸 — 네 공방, 새것이 앞. 그림은 옆 저장소에 있으면 진짜 */
const G = 'https://polos0117.github.io';
const pic = (repo, f) => ({ thumb: `${G}/${repo}/img/thumb/${encodeURIComponent(f)}`, full: `${G}/${repo}/img/${encodeURIComponent(f)}` });
const t0 = Date.now();
const SEED = [
  { a: 'myth', key: '묠니르', file: '묠니르_game_keyart_f_awaken.webp', title: '묠니르', sub: '각성', ...pic('myth-atelier-img', '묠니르_game_keyart_f_awaken.webp'), link: '/myth-atelier/dex.html?card=%EB%AC%A0%EB%8B%88%EB%A5%B4&pic=x' },
  { a: 'book', key: 'alice', file: 'alice_middle_literary_fantasy_f.webp', title: '이상한 나라의 앨리스', sub: '전개', ...pic('book-atelier-img', 'alice_middle_literary_fantasy_f.webp'), link: '/book-atelier/dex.html?book=alice&pic=x' },
  { a: 'pkm', key: '리자몽', file: '리자몽_heavy_overdrive_mecha_cinematic_keyart_f.webp', title: '리자몽', sub: '중장 오버드라이브', ...pic('pkm-atelier-img', '리자몽_heavy_overdrive_mecha_cinematic_keyart_f.webp'), link: '/pkm-atelier/dex.html?mech=%EB%A6%AC%EC%9E%90%EB%AA%BD&pic=x' },
  { a: 'gundam', key: 'RX-78-2 건담', file: 'RX-78-2_건담_f.webp', title: 'RX-78-2 건담', sub: '의인화', ...pic('atelier', 'RX-78-2_건담_f.webp'), link: '/atelier/dex.html?mech=RX-78-2+%EA%B1%B4%EB%8B%B4&pic=x' },
  { a: 'myth', key: '엑스칼리버', file: '엑스칼리버_game_keyart_f.webp', title: '엑스칼리버', sub: '기본', ...pic('myth-atelier-img', '엑스칼리버_game_keyart_f.webp'), link: '/myth-atelier/dex.html?card=x' },
  { a: 'book', key: 'baskervilles', file: 'baskervilles_end_literary_fantasy_f.webp', title: '바스커빌가의 개', sub: '결말', ...pic('book-atelier-img', 'baskervilles_end_literary_fantasy_f.webp'), link: '/book-atelier/dex.html?book=baskervilles&pic=x' },
  { a: 'pkm', key: '리자몽', file: '리자몽_light_mecha_cinematic_keyart_f.webp', title: '리자몽', sub: '경장', ...pic('pkm-atelier-img', '리자몽_light_mecha_cinematic_keyart_f.webp'), link: '/pkm-atelier/dex.html?mech=x' },
  { a: 'gundam', key: 'ZZ건담', file: 'ZZ건담_f.webp', title: 'ZZ건담', sub: '의인화', ...pic('atelier', 'ZZ건담_f.webp'), link: '/atelier/dex.html?mech=ZZ%EA%B1%B4%EB%8B%B4&pic=x' },
].map((e, i) => ({ ...e, at: new Date(t0 - i * 3600e3).toISOString() }));
const COLORS = { gundam: '#7fb3ff', book: '#e39b6b', pkm: '#f4c542', myth: '#d9b45a' };

const server = http.createServer((q, s) => {
  const url = new URL(q.url, BASE), f = path.join(ROOT, decodeURIComponent(url.pathname.replace(/\/$/, '/index.html')));
  if (!f.startsWith(ROOT)) { s.writeHead(403); return s.end(); }
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); s.end(d); });
}).listen(PORT);
/* 바깥 그림 — 옆 저장소의 같은 파일, 없으면 공방 색 칸 */
async function routeArt(ctx) {
  await ctx.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.origin === BASE) return r.continue();
    if (u.origin === G && /\.(webp|png|jpg)$/.test(u.pathname)) {
      const file = path.resolve(SIBLINGS, '.' + decodeURIComponent(u.pathname));
      if (file.startsWith(SIBLINGS + path.sep) && fs.existsSync(file)) return r.fulfill({ status: 200, contentType: MIME[path.extname(file)] || 'image/webp', body: fs.readFileSync(file) });
      const a = SEED.find(e => e.thumb === u.href || e.full === u.href), c = a ? COLORS[a.a] : '#555';
      return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="341" height="512"><rect width="341" height="512" fill="#15131a"/><circle cx="170" cy="200" r="90" fill="${c}" opacity=".7"/></svg>` });
    }
    return r.fulfill({ status: 404, body: '' });
  });
}
const SIZES = [['344', { width: 344, height: 882 }, true], ['390', { width: 390, height: 844 }, true], ['844', { width: 844, height: 390 }, true], ['690', { width: 690, height: 829 }, true], ['1280', { width: 1280, height: 900 }, false]];

(async () => {
  const br = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
  const stored = p => p.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), KEY);
  async function page(vp, mobile, opt = {}) {
    const ctx = await br.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, reducedMotion: opt.reduced ? 'reduce' : 'no-preference' });
    if (opt.seed) await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, [KEY, JSON.stringify(opt.seed)]);
    if (opt.blocked) await ctx.addInitScript(() => { const no = () => { throw new DOMException('blocked', 'SecurityError'); }; Storage.prototype.setItem = no; Storage.prototype.getItem = no; Storage.prototype.removeItem = no; });
    await routeArt(ctx);
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(String(e)));
    if (opt.clock) await p.clock.install();
    return { ctx, p, errors };
  }
  const noOverflow = async (p, name) => assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + ' 가로 넘침');
  const targets = async (p, sel, name) => { for (const b of await p.locator(sel).all()) { if (!(await b.isVisible())) continue; const r = await b.boundingBox(); assert(r.height >= 44 && r.width >= 44, name + ' 누르는 자리 ' + sel + ' ' + JSON.stringify(r)); } };
  try {
    for (const [name, vp, mobile] of SIZES) {
      const { ctx, p, errors } = await page(vp, mobile, { seed: SEED });
      const press = sel => mobile ? p.locator(sel).first().tap() : p.locator(sel).first().click();
      await p.goto(BASE + '/favorites.html'); await p.waitForSelector('.tile');
      /* 새것부터 — 심은 차례 그대로 */
      assert.deepEqual(await p.locator('.tile').evaluateAll(es => es.map(e => e.dataset.file)), SEED.map(e => e.file), name + ' 새것부터');
      assert.match(await p.locator('#lede').textContent(), /4곳.*8장/, name + ' 머리말 수');
      /* 2:3 칸 */
      const face = await p.locator('.tile .face').first().boundingBox();
      assert(Math.abs(face.width / face.height - 2 / 3) < .02, name + ' 2:3 ' + JSON.stringify(face));
      /* 칩 — 전체 + 공방 넷, 지도의 색 */
      assert.deepEqual(await p.locator('.chip').evaluateAll(es => es.map(e => e.dataset.a)), ['all', 'gundam', 'book', 'pkm', 'myth'], name + ' 칩');
      for (const [a, c] of Object.entries(COLORS)) assert.equal((await p.locator(`.chip[data-a="${a}"]`).getAttribute('style')).match(/#[0-9a-f]{6}/)[0], c, name + ' ' + a + ' 칩 색');
      assert.match(await p.locator('.chip[data-a="book"]').textContent(), /책의 서재\s*2/, name + ' 칩 수');
      await targets(p, '.chip, .play, .home', name);
      await noOverflow(p, name);
      if (name === '390' || name === '1280') {
        await p.waitForFunction(() => [...document.querySelectorAll('.tile img')].every(i => i.complete)).catch(() => {});
        if (process.env.SHOT_DIR) { fs.mkdirSync(process.env.SHOT_DIR, { recursive: true }); await p.screenshot({ path: path.join(process.env.SHOT_DIR, `favorites-${vp.width}x${vp.height}.png`) }); }
      }
      /* 거르기 — 책만, 주소에 남고 새로 고쳐도 */
      await press('.chip[data-a="book"]');
      assert.deepEqual(await p.locator('.tile').evaluateAll(es => es.map(e => e.dataset.a)), ['book', 'book'], name + ' 책만');
      assert.equal(await p.locator('.chip[data-a="book"]').getAttribute('aria-pressed'), 'true');
      assert.equal(new URL(p.url()).searchParams.get('a'), 'book', name + ' 주소에 ?a=book');
      await p.reload(); await p.waitForSelector('.tile');
      assert.equal(await p.locator('.tile').count(), 2, name + ' 새로 고쳐도 거른 채');
      await press('.chip[data-a="all"]'); assert.equal(await p.locator('.tile').count(), 8); assert.equal(new URL(p.url()).searchParams.get('a'), null);

      /* 크게 보기 — 누르면 열리고, 키·밀기로 넘기고, Esc 로 닫고 초점이 그 칸으로 */
      await press('.tile[data-i="1"]'); await p.waitForSelector('#viewer:not([hidden])');
      assert.equal(await p.locator('#v-title').textContent(), SEED[1].title, name + ' 연 그림');
      assert.equal(await p.locator('#v-count').textContent(), '2 / 8');
      assert.equal(await p.locator('#v-link').getAttribute('href'), SEED[1].link, name + ' 그 공방에서 보기 = 칸의 link');
      assert.match(await p.locator('#v-link').textContent(), /그 공방에서 보기/);
      assert.equal(decodeURIComponent((await p.locator('#v-stage img.on').getAttribute('src')).split('/').pop()), SEED[1].file, name + ' 원본 그림');
      assert.match(await p.locator('#v-room').getAttribute('style'), /#e39b6b/, name + ' 공방 색');
      const st = await p.locator('#v-stage').boundingBox(), shown = await p.locator('#v-stage img.on').boundingBox();
      assert(st.height > vp.height * .4 && shown.width <= vp.width + 1, name + ' 그림이 화면을 채운다 ' + JSON.stringify(st));
      await targets(p, '#viewer button:not(.v-nav), #viewer a', name);
      await noOverflow(p, name + ' 크게 보기');
      assert(await p.evaluate(() => { const v = document.querySelector('#viewer'); return [...v.querySelectorAll('button, a')].every(b => { const r = b.getBoundingClientRect(); return r.right <= innerWidth + 1 && r.left >= -1 && r.bottom <= innerHeight + 1; }); }), name + ' 크게 보기 단추가 화면 안');
      await p.keyboard.press('ArrowRight'); assert.equal(await p.locator('#v-count').textContent(), '3 / 8', name + ' → 다음');
      await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); assert.equal(await p.locator('#v-count').textContent(), '1 / 8', name + ' ← 이전');
      await p.keyboard.press('ArrowLeft'); assert.equal(await p.locator('#v-count').textContent(), '8 / 8', name + ' 처음에서 ← 는 끝으로');
      const c = { x: st.x + st.width / 2, y: st.y + st.height / 2 };
      await p.mouse.move(c.x + 80, c.y); await p.mouse.down(); await p.mouse.move(c.x - 40, c.y, { steps: 4 }); await p.mouse.up();
      assert.equal(await p.locator('#v-count').textContent(), '1 / 8', name + ' 왼쪽으로 밀면 다음');
      await p.keyboard.press('Escape'); await p.waitForSelector('#viewer[hidden]', { state: 'attached' });
      assert.equal(await p.evaluate(() => document.activeElement.dataset.i), '1', name + ' 닫으면 연 칸으로 초점');
      /* 뒤로 가기도 닫는다(페이지는 그대로) */
      await press('.tile[data-i="0"]'); await p.waitForSelector('#viewer:not([hidden])');
      await p.goBack(); await p.waitForSelector('#viewer[hidden]', { state: 'attached' }); assert(/favorites\.html/.test(p.url()), name + ' 뒤로 가기는 크게 보기만 닫는다');

      /* 빼기 — 저장소에서 빠지고 같은 자리의 다음 그림이 뜬다 */
      await press('.tile[data-i="2"]'); await p.waitForSelector('#viewer:not([hidden])');
      await press('#v-remove');
      assert.equal((await stored(p)).length, 7, name + ' 저장소에서 빠졌다');
      assert(!(await stored(p)).some(e => e.file === SEED[2].file), name + ' 그 그림이');
      assert.equal(await p.locator('#v-title').textContent(), SEED[3].title, name + ' 다음 그림');
      assert.equal(await p.locator('#v-count').textContent(), '3 / 7');
      assert.match(await p.locator('#toast').textContent(), /뺐어요/, name + ' 알림');
      await p.keyboard.press('Escape'); await p.waitForSelector('#viewer[hidden]', { state: 'attached' });
      assert.equal(await p.locator('.tile').count(), 7, name + ' 칸도 빠졌다');
      assert.equal(await p.locator('.chip[data-a="pkm"] b').textContent(), '1', name + ' 칩 수도');
      assert.deepEqual(errors, [], name + ' 오류 없음');
      await ctx.close();
    }

    /* 감상 모드 — 6초마다 넘어가고(천천히 겹쳐), 손대면 멈춘다 */
    {
      const { ctx, p, errors } = await page({ width: 1280, height: 900 }, false, { seed: SEED, clock: true });
      await p.goto(BASE + '/favorites.html'); await p.waitForSelector('.tile');
      await p.click('#play'); await p.waitForSelector('#viewer:not([hidden])');
      assert.equal(await p.locator('#v-play').getAttribute('aria-pressed'), 'true', '감상 모드 켜짐');
      assert.equal(await p.locator('#v-count').textContent(), '1 / 8');
      await p.clock.runFor(6100);
      assert.equal(await p.locator('#v-count').textContent(), '2 / 8', '6초 뒤 다음');
      assert(await p.locator('#viewer.slow').count() === 1, '감상 모드는 천천히 겹친다');
      assert.equal(await p.locator('#v-stage img.on').count(), 1, '보이는 그림은 한 장');
      await p.keyboard.press('ArrowRight');
      assert.equal(await p.locator('#v-play').getAttribute('aria-pressed'), 'false', '손대면 멈춘다');
      assert(await p.locator('#v-paused').isVisible(), '멈췄다는 말');
      await p.clock.runFor(13000);
      assert.equal(await p.locator('#v-count').textContent(), '3 / 8', '멈춘 뒤엔 안 넘어간다');
      await p.click('#v-play'); assert.equal(await p.locator('#v-play').getAttribute('aria-pressed'), 'true', '다시 켜기');
      await p.keyboard.press('Escape'); await p.clock.runFor(7000); assert(await p.locator('#viewer[hidden]').count() === 1, '닫으면 감상도 끝');
      assert.deepEqual(errors, [], '감상 모드 오류 없음');
      await ctx.close();
    }
    /* 움직임 줄이기 — 감상 모드 잠김 */
    {
      const { ctx, p } = await page({ width: 390, height: 844 }, true, { seed: SEED, reduced: true });
      await p.goto(BASE + '/favorites.html'); await p.waitForSelector('.tile');
      assert(await p.locator('#play').isDisabled(), '움직임 줄이기면 감상 모드 잠김');
      await p.locator('.tile').first().tap(); await p.waitForSelector('#viewer:not([hidden])');
      assert(await p.locator('#v-play').isDisabled(), '크게 보기의 감상 모드도');
      await ctx.close();
    }
    /* 빈 자리 · 저장이 막힌 브라우저 */
    for (const [name, vp, mobile] of SIZES) {
      const { ctx, p, errors } = await page(vp, mobile);
      await p.goto(BASE + '/favorites.html'); await p.waitForSelector('#empty');
      assert.equal(await p.locator('.tile').count(), 0); assert(await p.locator('#tools').isHidden(), name + ' 빈 자리엔 칩이 없다');
      assert.deepEqual(await p.locator('#empty .doors a').evaluateAll(es => es.map(e => e.getAttribute('href'))), ['/atelier/dex.html', '/book-atelier/dex.html', '/pkm-atelier/dex.html', '/myth-atelier/dex.html', '/game-atelier/dex.html'], name + ' 공방 도감으로 가는 문');
      await targets(p, '#empty .doors a', name); await noOverflow(p, name + ' 빈 자리');
      /* 다른 탭에서 담으면 곧바로 뜬다 */
      await p.evaluate(([k, v]) => { localStorage.setItem(k, v); dispatchEvent(new StorageEvent('storage', { key: k })); }, [KEY, JSON.stringify(SEED.slice(0, 2))]);
      await p.waitForSelector('.tile'); assert.equal(await p.locator('.tile').count(), 2, name + ' 다른 탭에서 담은 것');
      assert.deepEqual(errors, [], name + ' 오류 없음');
      await ctx.close();
      const b = await page(vp, mobile, { blocked: true });
      await b.p.goto(BASE + '/favorites.html'); await b.p.waitForSelector('#blocked');
      assert.match(await b.p.locator('#blocked').textContent(), /저장을 막아/, name + ' 저장이 막혔다는 말');
      await noOverflow(b.p, name + ' 저장 막힘'); assert.deepEqual(b.errors, [], name + ' 저장이 막혀도 오류 없음');
      await b.ctx.close();
    }
    /* 공방 지도 — 머리의 「즐겨찾기 n」 · 목록 아래 줄. 목록의 공방 줄(.card)은 그대로 여덟(2026-10-30 도트·이미지 공방) */
    for (const [name, vp, mobile] of [SIZES[1], SIZES[2], SIZES[4]]) {
      const { ctx, p, errors } = await page(vp, mobile, { seed: SEED });
      await p.goto(BASE + '/'); await p.waitForSelector('.room');
      assert.equal(await p.locator('#fav-link').textContent(), '즐겨찾기 8', name + ' 머리의 즐겨찾기 수');
      assert.equal(await p.locator('#fav-link').getAttribute('href'), 'favorites.html');
      assert.equal(await p.locator('#fav-all').getAttribute('href'), 'favorites.html'); assert.match(await p.locator('#fav-all').textContent(), /내 즐겨찾기.*8장/, name + ' 목록 아래 줄');
      assert.equal(await p.locator('.card').count(), 8, name + ' 공방 줄은 여덟 그대로');
      const r = await p.locator('#fav-link').boundingBox(); assert(r.height >= 44, name + ' 머리 링크 누르는 자리');
      await noOverflow(p, name + ' 지도');
      await p.locator('#fav-all').click(); await p.waitForURL(/favorites\.html/); await p.waitForSelector('.tile');
      assert.deepEqual(errors, [], name + ' 오류 없음');
      await ctx.close();
    }
    console.log('PASS 내 즐겨찾기: favorites.js(새것 앞·500칸·같은 그림·막힌 저장) · 지도 색 = 칩 색 · 네 공방 8장 새것부터 2:3 · 칩 거르기·주소 · 크게 보기 ← → 밀기 Esc 뒤로 가기 초점 · 그 공방에서 보기 · 빼기 · 감상 모드 6초·멈춤·움직임 줄이기 · 빈 자리·다른 탭·저장 막힘 · 지도의 즐겨찾기 n · 다섯 크기 넘침 없음·44px');
  } finally { await br.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
