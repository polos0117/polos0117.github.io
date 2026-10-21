/* 공방 지도 — 방 다섯이 서고, 올리면 빛나고 이름·미리보기가 뜨고, 누르면 다가가며 문들이 보이고, Esc·뒤로 가기로 돌아온다.
   오늘 기록(atelier_today_v1:<방> — 각 공방이 적는다)을 읽어 오늘 판을 둔 방에 불(빛·이름표 아래 줄)을 켜고, 문 패널·목록에 「오늘의 판」을 두고,
   공방 첫 화면의 Last-Modified 가 마지막으로 다녀간 뒤면 이름표에 새 소식 점을 찍는다. 문을 누르면 다녀간 자국(seen)이 남는다.
   휴대폰 세로(390×844)·가로(844×390)·PC(1280×900)에서 가로로 넘치지 않고, 가로에선 지도가 화면 높이에 든다.
   아래 "모든 공방" 목록의 링크가 지도의 문들과 같다. 바깥 그림(각 공방의 그림 저장소)은 받지 않는다 — 404 로 돌린다.
   Run: CHROMIUM_PATH=<chrome> node tests/map-screen.cjs   (playwright 가 require 되는 자리에서 — NODE_PATH) */
const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), PORT = 8766, BASE = 'http://127.0.0.1:' + PORT;
const MIME = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.js': 'text/javascript' };
const T = require(path.join(ROOT, 'today.js'));
const LM = new Date(Date.now() - 60e3);   /* 공방들이 "배포된" 때 — 일 분 전 */
const server = http.createServer((q, s) => {
  const url = new URL(q.url, BASE);
  /* 공방 첫 화면 — 지도가 HEAD 로 Last-Modified 를 묻는 자리(진짜 공방은 다른 저장소) */
  if (/^\/(atelier|book-atelier|sam-atelier|pkm-atelier|myth-atelier)\/$/.test(url.pathname)) { s.setHeader('Last-Modified', LM.toUTCString()); s.setHeader('Content-Type', 'text/html'); return s.end('<!doctype html><title>room</title>'); }
  const f = path.join(ROOT, decodeURIComponent(url.pathname.replace(/\/$/, '/index.html')));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); s.setHeader('Last-Modified', LM.toUTCString()); s.end(d); });
}).listen(PORT);
const ROOMS = ['gundam', 'book', 'samguk', 'pokemon', 'myth'];
/* 오늘 기록 — 서재는 오늘 2판 1승에 오늘의 판을 끝냈고 방금(앞으로 한 시간 뒤까지) 다녀갔다, 대장간은 1판, 격납고는 판은 없고 하루 전에 다녀갔다(그 뒤 배포 → 새 소식) */
const NOW = Date.now(), SEED = {
  'atelier_today_v1:book': { d: T.today(), n: 2, w: 1, daily: true, at: NOW, seen: NOW + 3600e3 },
  'atelier_today_v1:myth': { d: T.today(), n: 1, w: 0, daily: false, at: NOW, seen: NOW },
  'atelier_today_v1:gundam': { d: T.today(), n: 0, w: 0, daily: false, at: 0, seen: NOW - 86400e3 },
  /* 통산 — 서재는 12판 7승 3연승, 오늘의 판 연속 이틀 */
  'atelier_record_v1:book': { n: 12, w: 7, streak: 3, best: 5, days: 4, lastDay: T.today(), dstreak: 2, dbest: 2, lastDaily: T.today() },
};
(async () => {
  const br = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
  try {
    for (const [name, vp, mobile] of [['phone-port', { width: 390, height: 844 }, true], ['phone-land', { width: 844, height: 390 }, true], ['pc', { width: 1280, height: 900 }, false]]) {
      const ctx = await br.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
      await ctx.addInitScript(seed => { for (const k in seed) if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(seed[k])); }, SEED);   /* 없을 때만 — 문을 누른 자국이 남아야 한다 */
      await ctx.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.fulfill({ status: 404, body: '' }));
      const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(String(e)));
      const press = sel => mobile ? p.locator(sel).first().tap() : p.locator(sel).first().click();
      const noOverflow = async () => assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + ' 가로 넘침');
      await p.goto(BASE + '/'); await p.waitForSelector('.room'); await p.waitForFunction(() => document.querySelector('#stage img').complete);
      /* 방 다섯 — 다각형·이름표·카드 */
      assert.deepEqual(await p.locator('.room').evaluateAll(es => es.map(e => e.dataset.key)), ROOMS, name + ' 방 다섯');
      assert.equal(await p.locator('.pin').count(), 5, '이름표 다섯'); assert.equal(await p.locator('.card').count(), 5, '카드 다섯');
      for (const k of ROOMS) assert((await p.locator(`.pin[data-key="${k}"] b`).textContent()).length > 2, k + ' 이름');
      await noOverflow();
      /* 오늘 불 — 판을 둔 방(서재·대장간)만 빛·줄, 새 소식 점은 격납고에만(HEAD 는 비동기라 기다린다) */
      assert.deepEqual(await p.locator('.room.lit').evaluateAll(es => es.map(e => e.dataset.key)), ['book', 'myth'], name + ' 오늘 판을 둔 방에 불');
      assert.deepEqual(await p.locator('#glows .glow').evaluateAll(es => es.filter(e => e.style.display !== 'none').map(e => e.dataset.key)), ['book', 'myth'], name + ' 빛은 그 방에만');
      assert.match(await p.locator('.pin[data-key="book"] .today').textContent(), /오늘 2판 · 1승 · 오늘의 판 ✓/, name + ' 이름표 아래 오늘 줄');
      assert.equal(await p.locator('.pin[data-key="myth"] .today').textContent(), '오늘 1판 · 0승', name + ' 끝내지 않은 오늘의 판은 표가 없다');
      assert(await p.locator('.pin[data-key="pokemon"] .today').isHidden() && await p.locator('.pin[data-key="gundam"] .today').isHidden(), name + ' 판이 없으면 줄도 없다');
      await p.waitForSelector('.pin[data-key="gundam"].news');
      assert.deepEqual(await p.locator('.pin.news').evaluateAll(es => es.map(e => e.dataset.key)), ['gundam'], name + ' 새 소식은 다녀간 뒤 배포된 방에만');
      const stage = await p.locator('#stage').boundingBox();
      assert(Math.abs(stage.width / stage.height - 1448 / 1086) < .02, name + ' 무대는 그림 비율');
      if (vp.width > vp.height) assert(stage.y + stage.height <= vp.height + 1, name + ' 가로 — 지도가 화면 높이에 든다: ' + JSON.stringify(stage));
      /* 이름표가 제 방 안에 있다 — 다각형의 중심과 가깝다 */
      for (const k of ROOMS) {
        const inside = await p.evaluate(k => { const poly = document.querySelector(`.room[data-key="${k}"] polygon`), pin = document.querySelector(`.pin[data-key="${k}"]`);
          const r = pin.getBoundingClientRect(), svg = document.querySelector('#svg'), pt = svg.createSVGPoint(); pt.x = r.left + r.width / 2; pt.y = r.top + r.height / 2;
          const q = pt.matrixTransform(svg.getScreenCTM().inverse()); return poly.isPointInFill(q); }, k);
        assert(inside, name + ' ' + k + ' 이름표가 방 안에');
      }
      /* 올리면 빛난다(PC) · 누르면 다가간다 */
      if (!mobile) { await p.hover('.room[data-key="book"]'); assert(await p.locator('.room[data-key="book"].hot').count() === 1 && await p.locator('.pin[data-key="book"].hot .peek').isVisible(), '올리면 빛나고 미리보기'); }
      await press('.room[data-key="book"]');
      await p.waitForSelector('#map.zoomed'); await p.waitForTimeout(800);
      assert.equal(await p.evaluate(() => location.hash), '#book', name + ' 주소에 방');
      assert(/scale\(/.test(await p.locator('#inner').evaluate(e => e.style.transform)), '지도가 다가간다');
      const links = await p.locator('#doorlinks a:not(.daily)').evaluateAll(es => es.map(e => [e.textContent, e.getAttribute('href')]));
      assert.deepEqual(links.map(x => x[1]), ['/book-atelier/', '/book-atelier/dex.html', '/book-atelier/duel.html', '/book-atelier/prompt.html'], name + ' 책의 공방 문들(결투까지)');
      assert(await p.locator('#doors h2').textContent() === '책의 공방' && await p.locator('#doors a.main').isVisible(), '문 패널');
      assert.equal(await p.locator('#doors a.daily').getAttribute('href'), '/book-atelier/duel.html?daily', name + ' 문 패널의 오늘의 판');
      assert.match(await p.locator('#doors a.daily').textContent(), /끝냈다/, name + ' 끝낸 오늘의 판은 표');
      assert.match(await p.locator('#status').textContent(), /오늘 2판 · 1승 · 오늘의 판 ✓ · 통산 12판 7승 · 3연승 · 오늘의 판 연속 2일/, name + ' 문 패널에 오늘 줄·통산·연승·연속 일수');
      const d = await p.locator('#doors').boundingBox(), s2 = await p.locator('#stage').boundingBox();
      if (vp.width > vp.height) assert(d.x >= s2.x + s2.width - 1, name + ' 가로 — 문 패널은 지도 오른쪽'); else assert(d.y >= s2.y + s2.height - 1, name + ' 세로 — 문 패널은 지도 아래');
      for (const b of await p.locator('#doors a, #doors button').all()) { const r = await b.boundingBox(); assert(r.height >= 36, '누르는 자리'); }
      if (vp.width > vp.height && vp.height <= 500) assert(!(await p.locator('.head').isVisible()), name + ' 가로 폰 — 다가가면 제목이 지도 위에 겹치지 않게 숨는다');
      await noOverflow();
      /* 다른 방은 어두워지고, 이름표는 숨는다 */
      assert.equal(await p.locator('.room.on').getAttribute('data-key'), 'book'); assert.equal(await p.locator('.pin').first().evaluate(e => getComputedStyle(e).opacity), '0', '다가가면 이름표는 숨는다');
      /* Esc · 뒤로 가기 */
      await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.querySelector('#map.zoomed'));
      assert.equal(await p.evaluate(() => location.hash), '', 'Esc 로 돌아오면 주소도');
      await press('.room[data-key="myth"]'); await p.waitForSelector('#map.zoomed'); assert.equal(await p.locator('#doors h2').textContent(), '신화 무기 공방');
      await p.goBack(); await p.waitForFunction(() => !document.querySelector('#map.zoomed')); assert.equal(await p.evaluate(() => location.hash), '', '뒤로 가기로 지도로');
      /* 주소로 바로 */
      await p.goto(BASE + '/#pokemon'); await p.waitForSelector('#map.zoomed'); assert.equal(await p.locator('#doors h2').textContent(), '포켓몬 메카 연구소', '#pokemon 으로 열면 바로 그 방');
      /* 아래 목록 = 지도의 문들 */
      const cardLinks = await p.locator('.card .links a:not(.daily)').evaluateAll(es => es.map(e => e.getAttribute('href')));
      const doorLinks = await p.evaluate(() => ROOMS.flatMap(r => r.links.map(l => l[1])));
      assert.deepEqual(cardLinks, doorLinks, '목록의 링크 = 방의 문들');
      assert(cardLinks.every(h => /^\/[a-z-]+\/([a-z]+\.html)?$/.test(h)), '링크 꼴');
      assert.deepEqual(await p.locator('.card a.daily').evaluateAll(es => es.map(e => e.getAttribute('href'))), await p.evaluate(() => ROOMS.map(r => r.daily)), '목록에도 오늘의 판');
      assert.doesNotMatch(await p.locator('.card[data-key="myth"] a.daily').textContent(), /끝냈다/, '끝내지 않은 방은 표 없음');
      /* 새 소식 방에 다가가면 문 패널에 말이, 문을 누르면 다녀간 자국이 남아 다음엔 새 소식이 아니다 */
      await p.goto(BASE + '/#gundam'); await p.waitForSelector('#map.zoomed'); await p.waitForSelector('.pin[data-key="gundam"].news');
      assert.match(await p.locator('#status').textContent(), /새 소식/, name + ' 새 소식 말');
      await p.locator('#doors a.main').click(); await p.waitForLoadState();
      const seen = await p.evaluate(() => JSON.parse(localStorage.getItem('atelier_today_v1:gundam')).seen);
      assert(seen >= NOW - 1000, name + ' 문을 누르면 다녀간 자국: ' + seen);
      await p.goto(BASE + '/'); await p.waitForSelector('.room'); await p.waitForTimeout(600);
      assert.equal(await p.locator('.pin.news').count(), 0, name + ' 다녀간 뒤엔 새 소식이 아니다');
      assert(await p.locator('.card img').nth(1).getAttribute('src').then(s => /book-atelier-img/.test(s)), '책의 공방 카드는 실제 그림');
      assert.deepEqual(errors, [], name + ' 오류 없음');
      await ctx.close();
    }
    console.log('PASS 공방 지도: 방 다섯·이름표·카드 · 빛나기·미리보기 · 다가가기·문·주소·Esc·뒤로 가기 · 오늘 불·오늘 줄·오늘의 판·새 소식·다녀간 자국 · 세로/가로/PC 넘침 없음, 가로는 화면 높이에');
  } finally { await br.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
