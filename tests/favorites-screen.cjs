/* 내 즐겨찾기(favorites.html) — 공방 넷의 도감이 atelier_favorites_v1 에 담은 그림을 모아 본다.
   네 공방의 칸을 심어 두고: 새것부터 2:3 칸 · 공방 칩(지도 ROOMS 의 색)으로 거르기(?a=, 새로 고쳐도) · 크게 보기(← → 키·밀기·Esc·초점 되돌림·
   「그 공방에서 보기」= 칸의 link) · 빼기(저장소에서 빠지고 다음 그림이 뜬다) · 감상 모드(6초마다, 손대면 멈춤, 움직임 줄이기면 잠김) ·
   빈 자리(공방 도감 넷으로 가는 문) · 저장이 막힌 브라우저 · 공방 지도의 「즐겨찾기 n」 과 목록 아래 줄 · favorites.js 동작(MAX 칸 · 가득이면 거절 · 같은 그림 하나 · 막힌 저장 · 저장 공간 모자람).
   2026-11-25: 담은 수 「n / MAX」 · 곧 참 · 가득 · 빼기가 저장 공간에 막힘 · 꽉 채우기(390×844 터치 — 1:1 이면 단추 · 펴면 칸 높이 · 옆으로 구르고 밀어도 안 넘어감 ·
   두 번 누르기 · 넘기면 맞춤 · 2:3 은 단추 없음 · PC 1:1 단추 없음) · 휴대폰 가로 844×390(그림만 가득 · 닫기만).
   344×882 · 1280×900 에서 옆으로 넘치지 않고 누르는 자리 44px.
   바깥 그림은 받지 않는다 — 옆 저장소에 같은 파일이 있으면 그것, 없으면 색 칸(SVG). SHOT_DIR 을 주면 344×882 · 1280×900 화면을 찍는다.
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
  /* 말은 favorites.js 에 없다 — 공방 모음 화면(favorites.html)처럼 setMessages 로 준다(2026-11-25) */
  const html = fs.readFileSync(path.join(ROOT, 'favorites.html'), 'utf8'), mm = html.match(/setMessages\((\{[\s\S]*?\})\);/);
  if (mm) win.AtelierFavorites.setMessages(vm.runInNewContext('(' + mm[1] + ')'));
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
  assert.equal(F.MAX, 3000, '3000칸');
  st.setItem(KEY, JSON.stringify(Array.from({ length: F.MAX - 1 }, (_, i) => e(i + 10))));
  assert.equal(F.room(), 1); assert.equal(F.toggle(e(1)), true, '마지막 한 자리'); assert.equal(F.count(), F.MAX);
  assert.equal(F.toggle(e(2)), false, '가득 차면 못 담는다'); assert.equal(F.error(), 'full'); assert.match(F.message(), /가득 찼어요\(3000장\)/);
  assert.equal(F.count(), F.MAX, '가득이어도 오래된 것을 빼지 않는다'); assert.equal(F.list()[F.MAX - 1].file, 'f' + (F.MAX + 8) + '.webp', '가장 오래된 칸 그대로'); assert.equal(F.room(), 0);
  assert.equal(F.toggle(e(1)), false, '가득이어도 빼기는 된다'); assert.equal(F.error(), ''); assert.equal(F.toggle(e(2)), true, '빼면 다시 담긴다');
  st.setItem(KEY, '[]');
  assert(events.includes('atelier-favorites'), '같은 탭 알림');
  st.setItem(KEY, '{bad'); assert.equal(F.list().length, 0, '깨진 값은 빈 목록');
  st.setItem(KEY, JSON.stringify([{ a: 'book' }, null, { a: 'myth', file: 'm.webp', title: 1 }])); assert.deepEqual(Array.from(F.list(), x => x.file), ['m.webp'], '모양이 틀린 칸은 건너뛴다');
  assert.equal(F.list()[0].title, '1', '값은 글자로');
  const no = () => { throw new Error('blocked'); };
  const { F: B } = sandbox({ getItem: no, setItem: no, removeItem: no });
  assert.equal(B.available(), false); assert.equal(B.list().length, 0); assert.equal(B.toggle(e(1)), false, '막힌 저장소 — 못 담았다'); assert.equal(B.remove('book', 'f1.webp'), false);
  B.toggle(e(1)); assert.equal(B.error(), 'blocked'); assert.equal(B.message(), '', '막힘 말은 공방 낱말 표가 맡는다');
  const { F: N } = sandbox(undefined); assert.equal(N.available(), false); assert.equal(N.toggle(e(1)), false, '저장소가 없어도 던지지 않는다');
  /* 저장 공간이 모자라면(QuotaExceededError) 못 담았다고만 — 담아 둔 칸은 그대로 */
  const qm = memory(); qm.setItem(KEY, JSON.stringify([e(7)]));
  const { F: Q } = sandbox({ getItem: qm.getItem, removeItem: qm.removeItem, setItem: () => { const x = new Error('quota'); x.name = 'QuotaExceededError'; x.code = 22; throw x; } });
  assert.equal(Q.toggle(e(8)), false, '저장 공간이 모자라면 못 담는다'); assert.equal(Q.error(), 'quota'); assert.match(Q.message(), /저장 공간이 모자라/);
  assert.deepEqual(Array.from(Q.list(), x => x.file), ['f7.webp'], '못 담아도 담아 둔 칸은 그대로');
}

/* 지도의 방 색 — favorites.html 의 ROOM 이 같아야 한다(즐겨찾기의 pkm = 지도의 pokemon) */
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), favHTML = fs.readFileSync(path.join(ROOT, 'favorites.html'), 'utf8');
const mapColor = {}; for (const m of index.matchAll(/\{ key: '(\w+)', name: '([^']+)'[^\n]*? c: '(#[0-9a-f]{6})'/g)) mapColor[m[1]] = { name: m[2], c: m[3] };
const ROOM_OF = { gundam: 'gundam', book: 'book', pkm: 'pokemon', myth: 'myth', game: 'game', element: 'element', samguk: 'samguk', city: 'city' };
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
/* 가장 좁은 휴대폰 · 넓은 PC — 다섯 크기에서 같은 판을 되풀이하던 것을 2026-11-12 둘로 */
const SIZES = [['344', { width: 344, height: 882 }, true], ['1280', { width: 1280, height: 900 }, false]];

(async () => {
  const br = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
  const stored = p => p.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), KEY);
  async function page(vp, mobile, opt = {}) {
    const ctx = await br.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: process.env.SHOT_DIR ? 2 : 1, reducedMotion: opt.reduced ? 'reduce' : 'no-preference' });
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
      assert.equal(await p.locator('#limit').textContent(), '8 / 3000', name + ' 담은 수 / 한도'); assert.equal(await p.locator('#limit-warn').count(), 0, name + ' 넉넉하면 경고 없음');
      assert.equal(await p.locator('#v-fill').isVisible(), false, name + ' 2:3 · 닫힌 크게 보기엔 꽉 채우기 없음');
      /* 2:3 칸 */
      const face = await p.locator('.tile .face').first().boundingBox();
      assert(Math.abs(face.width / face.height - 2 / 3) < .02, name + ' 2:3 ' + JSON.stringify(face));
      /* 칩 — 전체 + 공방 넷, 지도의 색 */
      assert.deepEqual(await p.locator('.chip').evaluateAll(es => es.map(e => e.dataset.a)), ['all', 'gundam', 'book', 'pkm', 'myth'], name + ' 칩');
      for (const [a, c] of Object.entries(COLORS)) assert.equal((await p.locator(`.chip[data-a="${a}"]`).getAttribute('style')).match(/#[0-9a-f]{6}/)[0], c, name + ' ' + a + ' 칩 색');
      assert.match(await p.locator('.chip[data-a="book"]').textContent(), /책의 서재\s*2/, name + ' 칩 수');
      await targets(p, '.chip, .play, .home', name);
      await noOverflow(p, name);
      if (name === '344' || name === '1280') {
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

    /* 한도 — 곧 참(남은 자리 1할 아래) · 가득 · 빼기가 저장 공간에 막히면 */
    {
      const many = n => Array.from({ length: n }, (_, i) => ({ ...SEED[i % SEED.length], file: 'n' + i + '_' + SEED[i % SEED.length].file }));
      const { ctx, p, errors } = await page({ width: 390, height: 844 }, true, { seed: many(2950) });
      await p.goto(BASE + '/favorites.html'); await p.waitForSelector('.tile');
      assert.equal(await p.locator('#limit').textContent(), '2950 / 3000'); assert.match(await p.locator('#limit-warn').textContent(), /곧 가득.*50장/, '곧 가득');
      assert.match(await p.locator('#limit').getAttribute('class'), /near/);
      await p.evaluate(([k, v]) => { localStorage.setItem(k, v); dispatchEvent(new StorageEvent('storage', { key: k })); }, [KEY, JSON.stringify(many(3000))]);
      await p.waitForFunction(() => document.querySelector('#limit').textContent === '3000 / 3000');
      assert.match(await p.locator('#limit-warn').textContent(), /가득 찼어요/, '가득'); assert.match(await p.locator('#limit').getAttribute('class'), /full/);
      if (process.env.SHOT_DIR) await p.screenshot({ path: path.join(process.env.SHOT_DIR, 'favorites-full-390x844.png') });
      await noOverflow(p, '가득');
      /* 가득일 때 공방 도감이 담으려 하면 — favorites.js 가 거절하고 알릴 말을 준다(화면은 그 말을 알림으로) */
      const r = await p.evaluate(s => { const F = window.AtelierFavorites, n0 = F.count(), on = F.toggle({ ...s, file: 'new.webp' }); return { on, n0, n1: F.count(), why: F.error(), msg: F.message() }; }, SEED[0]);
      assert.deepEqual([r.on, r.why, r.n1], [false, 'full', r.n0], '가득이면 거절 ' + JSON.stringify(r)); assert.match(r.msg, /가득 찼어요\(3000장\).*빼면/);
      /* 빼기가 저장 공간에 막히면 — 알리고, 칸은 그대로 */
      await p.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); }; });
      await p.locator('.tile').first().tap(); await p.waitForSelector('#viewer:not([hidden])');
      await p.locator('#v-remove').tap();
      assert.match(await p.locator('#toast').textContent(), /저장 공간이 모자라/, '빼기 막힘 알림');
      assert.equal(await p.evaluate(k => JSON.parse(localStorage.getItem(k)).length, KEY), 3000, '막히면 칸 그대로');
      assert.deepEqual(errors, [], '한도 오류 없음');
      await ctx.close();
    }
    /* 꽉 채우기 · 휴대폰 가로(공방 크게 보기와 같은 몸통 fill-core.js) — 1:1 · 2:3 그림을 따로 심는다 */
    {
      const sq = i => ({ ...SEED[i], file: 'sq' + i + '.webp', thumb: G + '/fill-test/thumb/sq' + i + '.webp', full: G + '/fill-test/sq' + i + '.webp' });
      const SQ = [sq(0), sq(1), sq(2)], TALL = [{ ...SEED[3], file: 'tall.webp', thumb: G + '/fill-test/thumb/tall.webp', full: G + '/fill-test/tall.webp' }];
      const art = async ctx => ctx.route(/\/fill-test\//, r => { const tall = /tall/.test(r.request().url()), w = 1024, h = tall ? 1536 : 1024, c = ['#6a8', '#a86', '#68a'][+(r.request().url().match(/sq(\d)/) || [0, 0])[1] % 3];
        r.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${c}"/><circle cx="${w / 2}" cy="${h / 2}" r="${w / 3}" fill="#fff8"/><rect width="${w / 10}" height="${h}" fill="#0004"/><rect x="${w * .9}" width="${w / 10}" height="${h}" fill="#0004"/></svg>` }); });
      const open = async (p, i = 0) => { await p.goto(BASE + '/favorites.html'); await p.waitForSelector('.tile'); await p.locator('.tile').nth(i).click(); await p.waitForSelector('#viewer:not([hidden])');
        await p.waitForFunction(() => { const i = document.querySelector('#v-stage img.on'); return i && i.complete && i.naturalWidth > 0; }); await p.waitForTimeout(250); };
      const src = p => p.locator('#v-stage img.on').getAttribute('src');
      const fillState = p => p.evaluate(() => { const sc = document.querySelector('#v-stage .fill-scroll'); if (!sc) return null; const i = sc.querySelector('img').getBoundingClientRect(), st = document.querySelector('#v-stage');
        return { h: i.height, w: i.width, ch: sc.clientHeight, cw: sc.clientWidth, sw: sc.scrollWidth, sl: sc.scrollLeft, stageH: st.clientHeight }; });
      const swipe = async (p, x0, x1, y) => { const c = await p.context().newCDPSession(p);
        await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
        for (let i = 1; i <= 10; i++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 10, y }] }); await p.waitForTimeout(16); }
        await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await c.detach(); };
      const dbl = async p => { const b = await p.locator('#v-stage').boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2; await p.touchscreen.tap(x, y); await p.waitForTimeout(90); await p.touchscreen.tap(x, y); };
      /* ① 폰 세로 390×844 · 1:1 */
      { const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
        await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, [KEY, JSON.stringify(SQ)]);
        await routeArt(ctx); await art(ctx);
        const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(String(e)));
        await open(p);
        const btn = p.locator('#v-fill'); await btn.waitFor({ state: 'visible', timeout: 5000 });
        assert.equal(await btn.getAttribute('aria-pressed'), 'false'); assert.match(await btn.textContent(), /꽉 채우기/, '꽉 채우기 단추');
        const bb = await btn.boundingBox(); assert(bb.height >= 44, '단추 44 ' + bb.height);
        const fit = await p.evaluate(() => { const i = document.querySelector('#v-stage img.on'), r = i.getBoundingClientRect(), cs = getComputedStyle(i), pw = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ph = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom), k = Math.min(pw / i.naturalWidth, ph / i.naturalHeight); return { h: i.naturalHeight * k }; });
        if (process.env.SHOT_DIR) await p.screenshot({ path: path.join(process.env.SHOT_DIR, 'favorites-fit-1x1-390x844.png') });
        const s0 = await src(p);
        await btn.tap(); await p.waitForSelector('#v-stage .fill-scroll img'); await p.waitForTimeout(250);
        assert.equal(await btn.getAttribute('aria-pressed'), 'true'); assert.match(await btn.textContent(), /맞춰 보기/);
        let f = await fillState(p);
        assert(Math.abs(f.h - f.stageH) <= 2 && Math.abs(f.ch - f.stageH) <= 2, '그림 높이 = 칸 높이 ' + JSON.stringify(f));
        assert(f.h > fit.h * 1.3, '맞춤보다 뚜렷이 크다 ' + f.h + ' > ' + fit.h);
        assert(f.sw > f.cw + 10, '옆으로 구른다 ' + JSON.stringify(f)); assert(Math.abs(f.sl - (f.sw - f.cw) / 2) <= 3, '가운데부터 ' + f.sl);
        assert(await p.locator('#v-fill').isVisible(), '펴도 단추는 보인다');
        if (process.env.SHOT_DIR) await p.screenshot({ path: path.join(process.env.SHOT_DIR, 'favorites-fill-1x1-390x844.png') });
        const y = (await p.locator('#v-stage .fill-scroll').boundingBox()).y + f.ch / 2;
        await swipe(p, 300, 80, y); await p.waitForTimeout(300);
        assert.equal(await src(p), s0, '꽉 채운 채 밀어도 그림은 그대로'); assert.equal(await p.locator('#v-count').textContent(), '1 / 3');
        assert.equal(await btn.getAttribute('aria-pressed'), 'true', '밀어도 꽉 채우기 그대로');
        const f2 = await fillState(p); assert(f2.sl > f.sl + 20, '밀면 옆으로 구른다 ' + f.sl + ' → ' + f2.sl);
        await btn.tap(); await p.waitForSelector('#v-stage .fill-scroll', { state: 'detached' }); assert.equal(await btn.getAttribute('aria-pressed'), 'false', '단추로 맞춤');
        await p.waitForTimeout(400);
        await dbl(p); await p.waitForSelector('#v-stage .fill-scroll img', { timeout: 3000 }); assert.equal(await btn.getAttribute('aria-pressed'), 'true', '두 번 누르면 꽉 채우기');
        await p.waitForTimeout(400);
        await dbl(p); await p.waitForSelector('#v-stage .fill-scroll', { state: 'detached', timeout: 3000 }); assert(await p.locator('#viewer:not([hidden])').count(), '두 번 누르기는 닫지 않는다');
        /* 맞춤에선 밀면 넘어간다 */
        await p.waitForTimeout(400); await swipe(p, 320, 60, 420); await p.waitForFunction(() => document.querySelector('#v-count').textContent === '2 / 3', null, { timeout: 3000 });
        /* 꽉 채운 채 › 로 넘기면 맞춤으로 — 새 그림에서 다시 잰다 */
        await p.waitForFunction(() => { const i = document.querySelector('#v-stage img.on'); return i && i.complete && i.naturalWidth > 0; }); await p.waitForTimeout(300);
        await btn.tap(); await p.waitForSelector('#v-stage .fill-scroll img');
        await p.locator('#v-next').tap(); await p.waitForSelector('#v-stage .fill-scroll', { state: 'detached', timeout: 3000 });
        assert.equal(await p.locator('#v-count').textContent(), '3 / 3', '› 로 넘어간다'); await btn.waitFor({ state: 'visible', timeout: 3000 });
        assert.equal(await btn.getAttribute('aria-pressed'), 'false', '넘기면 맞춤');
        assert.deepEqual(errors, [], '꽉 채우기 오류 없음'); await ctx.close(); }
      /* ② 폰 세로 · 2:3 — 단추 없음, ③ PC · 1:1 — 단추 없음 */
      for (const [label, seed, vp, mob] of [['2:3', TALL, { width: 390, height: 844 }, true], ['PC 1:1', SQ, { width: 1280, height: 900 }, false]]) {
        const ctx = await br.newContext({ viewport: vp, isMobile: mob, hasTouch: mob });
        await ctx.addInitScript(([k, v]) => { localStorage.setItem(k, v); }, [KEY, JSON.stringify(seed)]);
        await routeArt(ctx); await art(ctx);
        const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(String(e)));
        await open(p);
        assert.equal(await p.locator('#v-fill').isVisible(), false, label + ' 꽉 채우기 없음'); assert.deepEqual(errors, []);
        await ctx.close();
      }
      /* ④ 폰 가로 844×390 · 1:1 — 그림만 화면 높이 가득, 닫기만 */
      { const ctx = await br.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
        await ctx.addInitScript(([k, v]) => { localStorage.setItem(k, v); }, [KEY, JSON.stringify(SQ)]);
        await routeArt(ctx); await art(ctx);
        const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(String(e)));
        await open(p);
        const shown = await p.evaluate(() => { const i = document.querySelector('#v-stage img.on'), r = i.getBoundingClientRect(), cs = getComputedStyle(i);
          const pw = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ph = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom), k = Math.min(pw / i.naturalWidth, ph / i.naturalHeight);
          return { h: i.naturalHeight * k, w: i.naturalWidth * k, top: r.top, bottom: r.bottom }; });
        assert(shown.h >= 390 - 12 - 3, '가로: 그림 높이 ≈ 화면 높이 ' + JSON.stringify(shown)); assert(shown.top >= 0 && shown.bottom <= 391, '가로: 화면 안');
        for (const sel of ['#v-room', '#v-count', '#v-play', '#v-title', '#v-link', '#v-remove']) assert.equal(await p.locator(sel).isVisible(), false, '가로: 숨김 ' + sel);
        assert.equal(await p.locator('#v-fill').isVisible(), false, '가로: 꽉 채우기 없음');
        for (const sel of ['#v-prev', '#v-next']) assert(await p.locator(sel).isVisible(), '가로: ' + sel + ' 는 그림 위');
        const c = p.locator('#v-close'), cb = await c.boundingBox(); assert(await c.isVisible() && cb.width >= 44 && cb.height >= 44 && cb.y < 60 && cb.x > 844 - 70, '가로: 닫기는 오른쪽 위 44 ' + JSON.stringify(cb));
        if (process.env.SHOT_DIR) await p.screenshot({ path: path.join(process.env.SHOT_DIR, 'favorites-landscape-844x390.png') });
        await p.locator('#v-next').tap(); assert.equal(await p.locator('#v-count').textContent(), '2 / 3', '가로: › 로 넘긴다');
        await c.tap(); await p.waitForSelector('#viewer[hidden]', { state: 'attached' });
        assert.deepEqual(errors, [], '가로 오류 없음'); await ctx.close(); }
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
      assert.deepEqual(await p.locator('#empty .doors a').evaluateAll(es => es.map(e => e.getAttribute('href'))), ['/atelier/dex.html', '/book-atelier/dex.html', '/pkm-atelier/dex.html', '/myth-atelier/dex.html', '/game-atelier/dex.html', '/element-atelier/dex.html', '/sam-atelier/dex.html', '/city-atelier/index.html?tab=dex'], name + ' 공방 도감으로 가는 문');
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
    /* 공방 지도 — 머리의 「즐겨찾기 n」 · 대미궁 아래층 보물고 방(2026-11-11 — 하단 버튼 줄이 지도의 방이 됐다) · 맨 아래 칩 */
    for (const [name, vp, mobile] of SIZES) {
      const { ctx, p, errors } = await page(vp, mobile, { seed: SEED });
      await p.goto(BASE + '/'); await p.waitForSelector('.room');
      assert.equal(await p.locator('#fav-link').textContent(), '즐겨찾기 8', name + ' 머리의 즐겨찾기 수');
      assert.equal(await p.locator('#fav-link').getAttribute('href'), 'favorites.html');
      assert.equal(await p.locator('.chip[data-key="fav"]').getAttribute('href'), 'favorites.html', name + ' 맨 아래 칩');
      assert.equal(await p.locator('.chip').count(), 16, name + ' 칩 열여섯(공방 열하나 · 도구 다섯 — 도시공방 문을 연 뒤 2026-11-19)');
      const r = await p.locator('#fav-link').boundingBox(); assert(r.height >= 44, name + ' 머리 링크 누르는 자리');
      await noOverflow(p, name + ' 지도');
      await p.goto(BASE + '/#fav'); await p.waitForSelector('#map.zoomed');
      assert.match(await p.locator('#doors .sub').textContent(), /담은 그림 8장/, name + ' 보물고 방의 부제에 담은 수');
      await p.locator('#doors a.main').click(); await p.waitForURL(/favorites\.html/); await p.waitForSelector('.tile');
      assert.deepEqual(errors, [], name + ' 오류 없음');
      await ctx.close();
    }
    console.log('PASS 내 즐겨찾기: favorites.js(새것 앞·3000칸·가득이면 거절·같은 그림·막힌 저장·저장 공간) · n / 3000 · 곧 참 · 가득 · 빼기 막힘 · 꽉 채우기(1:1 단추·높이·구름·밀어도 그대로·두 번 누르기·넘기면 맞춤·2:3·PC 없음) · 휴대폰 가로(그림만·닫기) · 지도 색 = 칩 색 · 네 공방 8장 새것부터 2:3 · 칩 거르기·주소 · 크게 보기 ← → 밀기 Esc 뒤로 가기 초점 · 그 공방에서 보기 · 빼기 · 감상 모드 6초·멈춤·움직임 줄이기 · 빈 자리·다른 탭·저장 막힘 · 지도의 즐겨찾기 n · 다섯 크기 넘침 없음·44px');
  } finally { await br.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
