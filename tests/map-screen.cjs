/* 공방 지도(대미궁, 방 열여섯 — 2026-11-11 도구 다섯 · 두 층 1:3 · 2026-10-30 도트 공방·이미지 공방·원소의 섬 · 2026-11-10 화풍공방 · 도시공방(준비 중)) — 방 아홉이 서고, 올리면 빛나고 이름·미리보기가 뜨고, 누르면 다가가며 문들이 보이고, Esc·뒤로 가기로 돌아온다.
   오늘 기록(atelier_today_v1:<방> — 각 공방이 적는다)을 읽어 오늘 판을 둔 방에 불(빛·이름표 아래 줄)을 켜고, 문 패널·목록에 「오늘의 판」을 두고,
   공방 첫 화면의 Last-Modified 가 마지막으로 다녀간 뒤면 이름표에 새 소식 점을 찍는다. 문을 누르면 다녀간 자국(seen)이 남는다.
   휴대폰 세로(390×844)·가로(844×390)·PC(1280×900)에서 가로로 넘치지 않는다. 지도가 세로로 길어(1:2) 가로 화면에선 너비를 정해 두고 굴려 본다.
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
  if (/^\/(atelier|book-atelier|sam-atelier|pkm-atelier|myth-atelier|game-atelier)\/$/.test(url.pathname)) { s.setHeader('Last-Modified', LM.toUTCString()); s.setHeader('Content-Type', 'text/html'); return s.end('<!doctype html><title>room</title>'); }
  const f = path.join(ROOT, decodeURIComponent(url.pathname.replace(/\/$/, '/index.html')));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); s.setHeader('Last-Modified', LM.toUTCString()); s.end(d); });
}).listen(PORT);
const ROOMS = ['gundam', 'book', 'samguk', 'pokemon', 'myth', 'game', 'dot', 'image', 'element', 'style', 'city', 'fav', 'status', 'sweep', 'review', 'blender'];
const CARDS = ROOMS.filter(k => k !== 'city');   /* 도시공방은 아직 없다 — 지도에만(문 없이 「준비 중」), 맨 아래 칩엔 없다 */
const TOOLS = { fav: 'favorites.html', status: 'status.html', sweep: 'sweep.html', review: 'review.html', blender: '/blender-cloud/' };   /* 2026-11-11 하단 버튼 줄 → 대미궁 아래층 · 왕국 남쪽 바다의 방 */
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
      /* 방 열여섯 — 다각형·이름표, 맨 아래 칩(공방마다 메인 화면 하나) */
      assert.deepEqual(await p.locator('.room').evaluateAll(es => es.map(e => e.dataset.key)), ROOMS, name + ' 방 열여섯');
      assert.equal(await p.locator('.pin').count(), 16, '이름표 열여섯'); assert.deepEqual(await p.locator('.chip').evaluateAll(es => es.map(e => e.dataset.key)), CARDS, '칩 열다섯(도시공방 빼고)');
      assert.equal(await p.locator('.all-fav, .card').count(), 0, name + ' 하단 버튼 줄 · 카드 줄 없음');
      assert.equal(await p.locator('#lamps circle').count(), 5, name + ' 대미궁 등불 길 다섯');
      for (const k of ROOMS) assert((await p.locator(`.pin[data-key="${k}"] b`).textContent()).length > 2, k + ' 이름');
      await noOverflow();
      /* 제목 「공방 모음」 은 한 줄 — 좁은 폰에서 안내 글에 밀려 글자가 밑줄로 떨어지지 않는다(344 폭도) */
      for (const w of mobile && vp.width < vp.height ? [344, 360, vp.width] : [vp.width]) {
        if (w !== vp.width) await p.setViewportSize({ width: w, height: vp.height });
        const t = await p.evaluate(() => { const h = document.querySelector('.head h1'), r = document.createRange(); r.selectNodeContents(h.lastChild); return r.getClientRects().length; });
        assert.equal(t, 1, name + ' ' + w + ' 제목 한 줄');
      }
      if (mobile && vp.width < vp.height) await p.setViewportSize(vp);
      /* 오늘 불 — 판을 둔 방(서재·대장간)만 빛·줄, 새 소식 점은 격납고에만(HEAD 는 비동기라 기다린다) */
      assert.deepEqual(await p.locator('.room.lit').evaluateAll(es => es.map(e => e.dataset.key)), ['book', 'myth'], name + ' 오늘 판을 둔 방에 불');
      assert.deepEqual(await p.locator('#glows .glow').evaluateAll(es => es.filter(e => e.style.display !== 'none').map(e => e.dataset.key)), ['book', 'myth'], name + ' 빛은 그 방에만');
      assert.match(await p.locator('.pin[data-key="book"] .today').textContent(), /오늘 2판 · 1승 · 오늘의 판 ✓/, name + ' 이름표 아래 오늘 줄');
      assert.equal(await p.locator('.pin[data-key="myth"] .today').textContent(), '오늘 1판 · 0승', name + ' 끝내지 않은 오늘의 판은 표가 없다');
      assert(await p.locator('.pin[data-key="pokemon"] .today').isHidden() && await p.locator('.pin[data-key="gundam"] .today').isHidden(), name + ' 판이 없으면 줄도 없다');
      await p.waitForSelector('.pin[data-key="gundam"].news');
      assert.deepEqual(await p.locator('.pin.news').evaluateAll(es => es.map(e => e.dataset.key)), ['gundam'], name + ' 새 소식은 다녀간 뒤 배포된 방에만');
      const stage = await p.locator('#stage').boundingBox();
      assert(Math.abs(stage.width / stage.height - 1024 / 3072) < .02, name + ' 무대는 그림 비율(1:3)');
      if (vp.width > vp.height) assert(stage.width <= (vp.height <= 500 ? 521 : 721), name + ' 가로 — 지도 폭을 정해 둔다(세로로 긴 그림): ' + JSON.stringify(stage));
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
      assert.deepEqual(links.map(x => x[1]), ['/book-atelier/', '/book-atelier/dex.html', '/book-atelier/duel.html', '/book-atelier/run.html', '/book-atelier/prompt.html'], name + ' 책의 공방 문들(결투·탐험까지)');
      assert(await p.locator('#doors h2').textContent() === '책의 공방' && await p.locator('#doors a.main').isVisible(), '문 패널');
      assert.equal(await p.locator('#doors a.daily').getAttribute('href'), '/book-atelier/duel.html?daily', name + ' 문 패널의 오늘의 판');
      assert.match(await p.locator('#doors a.daily').textContent(), /끝냈다/, name + ' 끝낸 오늘의 판은 표');
      assert.match(await p.locator('#status').textContent(), /오늘 2판 · 1승 · 오늘의 판 ✓ · 통산 12판 7승 · 3연승 · 오늘의 판 연속 2일/, name + ' 문 패널에 오늘 줄·통산·연승·연속 일수');
      const d = await p.locator('#doors').boundingBox(), s2 = await p.locator('#stage').boundingBox();
      if (vp.width > vp.height) assert(d.x >= s2.x + s2.width - 1, name + ' 가로 — 문 패널은 지도 오른쪽');
      else {   /* 세로 — 지도가 1:3 이라 문 패널은 화면 아래에 떠 있다(2026-11-11 폰에서 메뉴가 화면 밖이었다). 다가간 방은 그 위에 보인다 */
        assert(d.y >= 0 && d.y + d.height <= vp.height + 1, name + ' 세로 — 문 패널이 화면 안: ' + JSON.stringify(d));
        await p.waitForTimeout(700);
        const room = await p.locator('.room[data-key="book"] polygon').boundingBox(), d2 = await p.locator('#doors').boundingBox();
        assert(room.y + room.height / 2 > 0 && room.y + room.height / 2 < d2.y, name + ' 세로 — 다가간 방은 문 패널 위에: ' + JSON.stringify([room, d2]));
      }
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
      await p.goto(BASE + '/#city'); await p.waitForSelector('#map.zoomed');
      assert.equal(await p.locator('#doors h2').textContent(), '도시공방', name + ' 도시공방'); assert.equal(await p.locator('#doorlinks a').count(), 0, name + ' 도시공방은 문이 없다');
      assert.match(await p.locator('#doorlinks .soon').textContent(), /준비 중/, name + ' 도시공방 준비 중');
      /* 맨 아래 칩 = 방마다 큰 문(메인 화면) 하나 */
      const cardLinks = await p.locator('.chip').evaluateAll(es => es.map(e => e.getAttribute('href')));
      const doorLinks = await p.evaluate(() => ROOMS.filter(r => !r.soon).map(r => r.links[0][1]));
      assert.deepEqual(cardLinks, doorLinks, '칩의 링크 = 방마다 큰 문');
      assert(cardLinks.every(h => /^\/?([a-z-]+\/)?([a-z]+\.html)?$/.test(h)), '링크 꼴');
      /* 도구 다섯(2026-11-11) — 하단 버튼이던 것이 방이 됐다: 문 하나, 오늘의 판은 없다 */
      assert.deepEqual(await p.evaluate(() => Object.fromEntries(ROOMS.filter(r => r.tool).map(r => [r.key, r.links.map(l => l[1])]))), Object.fromEntries(Object.entries(TOOLS).map(([k, v]) => [k, [v]])), name + ' 도구 다섯의 문');
      await p.goto(BASE + '/#review'); await p.waitForSelector('#map.zoomed');
      assert.equal(await p.locator('#doors h2').textContent(), '그림 검수판', name + ' 검수의 방'); assert.equal(await p.locator('#doors a.main').getAttribute('href'), 'review.html');
      /* 도트 공방·이미지 공방 — 허브 안의 쪽으로 가는 문 하나씩, 오늘의 판은 없다 */
      assert.deepEqual(await p.evaluate(() => ROOMS.filter(r => r.key === 'dot' || r.key === 'image').map(r => r.links.map(l => l[1]))), [['/dot.html'], ['/prompt.html']], name + ' 새 방 둘의 문');
      assert.deepEqual(await p.evaluate(() => ROOMS.find(r => r.key === 'style').links.map(l => l[1])), ['/style-atelier/'], name + ' 화풍공방은 제 방(2026-11-10)');
      assert.equal(await p.evaluate(() => ROOMS.filter(r => r.tool || r.key === 'dot' || r.key === 'image').some(r => r.daily)), false, name + ' 허브 안의 방엔 오늘의 판이 없다');
      await p.goto(BASE + '/#myth'); await p.waitForSelector('#map.zoomed');
      assert.doesNotMatch(await p.locator('#doors a.daily').textContent(), /끝냈다/, '끝내지 않은 방은 표 없음');
      /* 새 소식 방에 다가가면 문 패널에 말이, 문을 누르면 다녀간 자국이 남아 다음엔 새 소식이 아니다 */
      await p.goto(BASE + '/#gundam'); await p.waitForSelector('#map.zoomed'); await p.waitForSelector('.pin[data-key="gundam"].news');
      assert.match(await p.locator('#status').textContent(), /새 소식/, name + ' 새 소식 말');
      await p.locator('#doors a.main').click(); await p.waitForLoadState();
      const seen = await p.evaluate(() => JSON.parse(localStorage.getItem('atelier_today_v1:gundam')).seen);
      assert(seen >= NOW - 1000, name + ' 문을 누르면 다녀간 자국: ' + seen);
      await p.goto(BASE + '/'); await p.waitForSelector('.room'); await p.waitForTimeout(600);
      assert.equal(await p.locator('.pin.news').count(), 0, name + ' 다녀간 뒤엔 새 소식이 아니다');
      /* 지도 고르기(2026-11-08) — 대미궁이 처음, 왕국을 고르면 그림 · 지명 · 다각형이 바뀌고 이 기기에 남는다. 주소 ?map= 이 이긴다 */
      assert.equal(await p.locator('#mapsel button[aria-pressed="true"]').getAttribute('data-map'), 'cave', name + ' 처음은 대미궁');
      assert.equal(await p.locator('.pin[data-key="gundam"] b').textContent(), '건담 격납고', name + ' 대미궁 이름표');
      assert.equal(await p.locator('.pin[data-key="gundam"] .peek img').getAttribute('src'), '/atelier/img/thumb/RX-78-2_건담_f.webp', name + ' 대미궁 미리보기는 공방 그림');
      await press('#mapsel button[data-map="kingdom"]');
      await p.waitForFunction(() => /kingdom3\.webp/.test(document.querySelector('#mapimg').src) && document.querySelector('#mapimg').complete);
      const KNAMES = { gundam: '강철 군항', book: '만권 서고성', samguk: '적벽 관문', pokemon: '풀숲 연구촌', myth: '용광 협곡', game: '꿈빛 유원지', dot: '모자이크 들녘', image: '채색 언덕', element: '원소 군도', style: '프리즘 호반', city: '시계탑 왕도', fav: '보석 정원', status: '기록의 등대', sweep: '저울 시험장', review: '검수 관문', blender: '조각가 마을' };
      assert.deepEqual(Object.fromEntries(await p.locator('.pin').evaluateAll(es => es.map(e => [e.dataset.key, e.querySelector('b').textContent]))), KNAMES, name + ' 왕국 지명');
      assert(Object.values(KNAMES).every(n => !/공방/.test(n)), '지명에 「공방」 없음');
      /* 미리보기 — 왕국에선 그 구역을 잘라 낸 그림, 대미궁에선 공방 그림 */
      const kpeeks = await p.locator('.pin').evaluateAll(es => es.map(e => [e.dataset.key, e.querySelector('.peek img').getAttribute('src')]));
      assert(kpeeks.every(([k, src]) => src === 'img/kingdom3-' + k + '.webp'), name + ' 왕국 미리보기: ' + JSON.stringify(kpeeks));
      for (const [k] of kpeeks) assert(fs.existsSync(path.join(ROOT, 'img/kingdom3-' + k + '.webp')), k + ' 미리보기 파일');
      if (!mobile) { await p.hover('.room[data-key="samguk"]'); assert(await p.locator('.pin[data-key="samguk"].hot .peek').isVisible(), '왕국에서 올리면 미리보기'); }
      assert.equal(await p.locator('.room').count(), 16, name + ' 왕국 구역 열여섯');
      assert.deepEqual(await p.locator('.room.lit').evaluateAll(es => es.map(e => e.dataset.key)), ['book', 'myth'], name + ' 왕국에서도 오늘 불');
      for (const k of ROOMS) {
        const inside = await p.evaluate(k => { const poly = document.querySelector(`.room[data-key="${k}"] polygon`), pin = document.querySelector(`.pin[data-key="${k}"]`);
          const r = pin.getBoundingClientRect(), svg = document.querySelector('#svg'), pt = svg.createSVGPoint(); pt.x = r.left + r.width / 2; pt.y = r.top + r.height / 2;
          return poly.isPointInFill(pt.matrixTransform(svg.getScreenCTM().inverse())); }, k);
        assert(inside, name + ' 왕국 ' + k + ' 지명이 구역 안에');
      }
      /* 구역끼리 겹치지 않는다 — 한 구역의 이름표 자리가 다른 구역 안에 들지 않는다 */
      const cross = await p.evaluate(() => { const out = [], svg = document.querySelector('#svg');
        for (const pin of document.querySelectorAll('.pin')) { const r = pin.getBoundingClientRect(), pt = svg.createSVGPoint(); pt.x = r.left + r.width / 2; pt.y = r.top + r.height / 2; const q = pt.matrixTransform(svg.getScreenCTM().inverse());
          for (const poly of document.querySelectorAll('.room')) if (poly.dataset.key !== pin.dataset.key && poly.querySelector('polygon').isPointInFill(q)) out.push(pin.dataset.key + '→' + poly.dataset.key); }
        return out; });
      assert.deepEqual(cross, [], name + ' 왕국 구역이 겹치지 않는다');
      await noOverflow();
      await press('.room[data-key="gundam"]'); await p.waitForSelector('#map.zoomed'); await p.waitForTimeout(800);
      assert.equal(await p.locator('#doors h2').textContent(), '건담 드래프트', name + ' 왕국에서 다가가도 같은 문 패널');
      assert(/scale\(/.test(await p.locator('#inner').evaluate(e => e.style.transform)), name + ' 왕국에서도 다가간다');
      if (await p.locator('#mapsel').isVisible()) {   /* 다가간 채로 지도를 바꾸면 새 지도에서 그 방에 다시 다가간다(가로 폰은 다가가면 고르기 줄이 숨는다 — Esc 로) */
        await press('#mapsel button[data-map="cave"]'); await p.waitForTimeout(300);
        assert.equal(await p.locator('.room.on').getAttribute('data-key'), 'gundam', name + ' 지도를 바꿔도 그 방');
        assert.equal(await p.locator('.pin[data-key="gundam"] b').textContent(), '건담 격납고', name + ' 대미궁으로');
      } else { await p.keyboard.press('Escape'); await press('#mapsel button[data-map="cave"]'); }
      await p.goto(BASE + '/'); await p.waitForSelector('.room');
      assert.equal(await p.evaluate(() => localStorage.getItem('atelier_hub_map_v1')), 'cave', name + ' 고른 지도가 남는다');
      await press('#mapsel button[data-map="kingdom"]'); await p.goto(BASE + '/'); await p.waitForSelector('.room');
      assert.equal(await p.locator('.pin[data-key="gundam"] b').textContent(), '강철 군항', name + ' 다시 열어도 왕국');
      await p.goto(BASE + '/?map=cave'); await p.waitForSelector('.room');
      assert.equal(await p.locator('.pin[data-key="gundam"] b').textContent(), '건담 격납고', name + ' ?map=cave 가 이긴다');
      await p.goto(BASE + '/?map=kingdom#samguk'); await p.waitForSelector('#map.zoomed');
      assert.equal(await p.locator('#doors h2').textContent(), '삼국지 쟁탈전', name + ' 왕국 주소로 바로 그 구역');
      await p.evaluate(() => localStorage.setItem('atelier_hub_map_v1', 'cave'));
      /* 굴리며 보기 · 앨리스(2026-11-11) — 옆 위치 줄은 방마다 하나, 누르면 그 높이로. 앨리스 그림(책 공방 그림 저장소)은 이 시험에서 허브의 아무 그림으로 대신한다 */
      if (name === 'phone-port') {
        await p.goto(BASE + '/?map=cave'); await p.waitForSelector('.room');
        assert.equal(await p.locator('#alice').isHidden(), true, '앨리스 그림을 못 받으면 앨리스 없이(방은 바로 열린다)');
        await ctx.route('**/book-atelier-img/sprites/alice/*', r => r.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(path.join(ROOT, 'icon-192.png')) }));
        await p.goto(BASE + '/?map=cave'); await p.waitForFunction(() => !document.querySelector('#alice').hidden);
        assert.equal(await p.locator('#rail button').count(), 16, '옆 위치 줄 — 방마다 하나');
        const top0 = await p.evaluate(() => parseFloat(document.querySelector('#alice').style.top));
        await p.evaluate(() => { const r = ROOMS.find(q => q.key === 'review'), { span } = scrollSpan(); scrollTo(0, r.at[1] / IH * span); });   /* 굴리는 동안 짚는 높이가 0 → IH(scrollSpan) */
        await p.waitForFunction(t => parseFloat(document.querySelector('#alice').style.top) > t + 30, top0, { timeout: 6000 });
        assert((await p.locator('.room.near').evaluateAll(es => es.map(e => e.dataset.key))).includes('review'), '짚는 높이의 방이 빛난다');
        await p.locator('#rail button[data-key="gundam"]').click(); await p.waitForTimeout(1500);
        assert((await p.locator('.room.near').evaluateAll(es => es.map(e => e.dataset.key))).includes('gundam'), '위치 줄을 누르면 그 방 높이로');
        /* 누른 뒤 굴림 · 크기 바뀜이 와도 문은 열린다(폰에서 문이 안 열리던 것 — 2026-11-11) */
        await press('.room[data-key="blender"]'); await p.evaluate(() => { scrollBy(0, 40); dispatchEvent(new Event('resize')); });
        await p.waitForSelector('#map.zoomed', { timeout: 3000 });
        assert.equal(await p.evaluate(() => location.hash), '#blender', '앨리스가 문까지 걸어간 뒤 열린다');
        const at = await p.evaluate(() => { const a = document.querySelector('#alice'); return [parseFloat(a.style.left), parseFloat(a.style.top)]; });
        const door = await p.evaluate(() => fetch('img/cave4-nav.json').then(r => r.json()).then(j => j.n[j.doors.blender]));
        assert(Math.abs(at[0] - door[0] / 1024 * 100) < 0.5 && Math.abs(at[1] - door[1] / 3072 * 100) < 0.5, '앨리스는 조형실 문 앞: ' + at + ' / ' + door);
        /* 최근 공방(2026-11-11) — 「← 지도로」 하면 앨리스는 그 문 앞에 남고, 다시 열면 그 방 높이 · 그 문 앞에서 시작한다 */
        const alicePos = () => p.evaluate(() => { const a = document.querySelector('#alice'); return [parseFloat(a.style.left), parseFloat(a.style.top)]; });
        await press('#back'); await p.waitForFunction(() => !document.querySelector('#map.zoomed')); await p.waitForTimeout(1000);
        const stay = await alicePos(); assert(Math.abs(stay[0] - at[0]) < 0.5 && Math.abs(stay[1] - at[1]) < 0.5, '지도로 돌아와도 앨리스는 조형실 문 앞: ' + stay);
        const inView = k => p.evaluate(k => { const r = document.querySelector(`.room[data-key="${k}"] polygon`).getBoundingClientRect(), y = r.top + r.height / 2; return y > 0 && y < innerHeight; }, k);
        assert(await inView('blender'), '지도로 돌아오면 그 방(아래층)이 화면 안');
        assert(await p.evaluate(() => { const r = document.querySelector('#alice').getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }), '앨리스도 화면 안');
        assert.equal(await p.evaluate(() => localStorage.getItem('atelier_hub_last_v1')), 'blender', '최근 공방을 남긴다');
        await p.goto(BASE + '/?map=cave'); await p.waitForFunction(() => !document.querySelector('#alice').hidden); await p.waitForTimeout(600);
        const back = await alicePos(); assert(Math.abs(back[0] - at[0]) < 0.5 && Math.abs(back[1] - at[1]) < 0.5, '다시 열면 앨리스는 최근 공방 문 앞: ' + back);
        assert((await p.locator('.room.near').evaluateAll(es => es.map(e => e.dataset.key))).includes('blender'), '다시 열면 최근 공방 높이');
        /* 뒤로 가기로 지도에 와도 같다 — 브라우저가 누르기 전 굴림 자리로 되돌리면 앨리스가 떠났다(2026-11-11) */
        await p.evaluate(() => { const { span } = scrollSpan(); scrollTo({ top: 0, behavior: 'instant' }); });
        await p.waitForTimeout(1500);
        await press('.room[data-key="samguk"]'); await p.waitForSelector('#map.zoomed', { timeout: 3000 }); await p.waitForTimeout(900);
        const sam = await alicePos();
        await p.goBack(); await p.waitForFunction(() => !document.querySelector('#map.zoomed')); await p.waitForTimeout(1500);
        const sam2 = await alicePos(); assert(Math.abs(sam2[0] - sam[0]) < 0.5 && Math.abs(sam2[1] - sam[1]) < 0.5, '뒤로 가기로 지도에 와도 앨리스는 군막 문 앞: ' + sam + ' → ' + sam2);
        /* 아래층도 — 뒤로 가기로 와도 그 방이 화면 안, 앨리스는 그 문 앞(2026-11-11 「1층에서만 돼」) */
        await press('.room[data-key="review"]'); await p.waitForSelector('#map.zoomed', { timeout: 3000 }); await p.waitForTimeout(900);
        const rv = await alicePos();
        await p.goBack(); await p.waitForFunction(() => !document.querySelector('#map.zoomed')); await p.waitForTimeout(1500);
        const rv2 = await alicePos(); assert(Math.abs(rv2[0] - rv[0]) < 0.5 && Math.abs(rv2[1] - rv[1]) < 0.5, '아래층 뒤로 가기 — 앨리스는 검수의 방 문 앞: ' + rv + ' → ' + rv2);
        assert(await inView('review'), '아래층 뒤로 가기 — 그 방이 화면 안');
        await p.evaluate(() => localStorage.removeItem('atelier_hub_last_v1'));
        await press('#mapsel button[data-map="kingdom"]');
        assert.equal(await p.locator('#alice').isHidden(), true, '왕국에선 앨리스 없음');
        await p.evaluate(() => localStorage.setItem('atelier_hub_map_v1', 'cave'));
      }
      assert.deepEqual(errors, [], name + ' 오류 없음');
      await ctx.close();
    }
    /* 깊이 패럴랙스(2026-11-12, 대미궁만) — 접는 폰 커버 344×882 터치에서: 깊이 그림을 받아 캔버스가 서고, 다각형 · 누르는 자리는 그대로, 앨리스는 바닥과 같이 밀리고,
       움직임 끔(동작 줄이기 · AtelierMotion) · 깊이 그림 못 받음 · 왕국이면 캔버스가 없다(정지 그림) */
    {
      const fold = { width: 344, height: 882 };
      const open = async (opt = {}, init) => {
        const ctx = await br.newContext({ viewport: fold, isMobile: true, hasTouch: true, ...opt });
        if (init) await ctx.addInitScript(init);
        await ctx.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.fulfill({ status: 404, body: '' }));
        await ctx.route('**/book-atelier-img/sprites/alice/*', r => r.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(path.join(ROOT, 'icon-192.png')) }));
        const p = await ctx.newPage(), errors = [], depth = []; p.on('pageerror', e => errors.push(String(e)));
        p.on('response', r => { if (/cave4-depth\.webp/.test(r.url())) depth.push(r.status()); });
        return { ctx, p, errors, depth };
      };
      /* 다각형 · 누르는 자리 — 이름표 가운데를 누르면 그 방의 다각형이 받는다(캔버스는 누름을 받지 않는다) */
      const hits = p => p.evaluate(() => [...document.querySelectorAll('.pin')].map(pin => { const r = pin.querySelector('b').getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        if (y < 0 || y > innerHeight) return [pin.dataset.key, 'off'];
        const pins = document.querySelector('#pins'); pins.style.visibility = 'hidden'; const el = document.elementFromPoint(x, y); pins.style.visibility = '';
        return [pin.dataset.key, el && el.closest('.room') ? el.closest('.room').dataset.key : el && el.tagName]; }));
      const polys = p => p.evaluate(() => [...document.querySelectorAll('.room polygon')].map(e => { const r = e.getBoundingClientRect(); return [e.getAttribute('points'), [r.x, r.y, r.width, r.height].map(v => Math.round(v * 10) / 10)]; }));

      const A = await open();
      await A.p.goto(BASE + '/?map=cave'); await A.p.waitForSelector('#stage canvas.fx.ready', { timeout: 8000 });
      assert.deepEqual(A.depth, [200], '패럴랙스 — 깊이 그림을 받는다');
      const fx = await A.p.evaluate(() => { const c = document.querySelector('canvas.fx'), b = c.getBoundingClientRect(), s = document.querySelector('#stage').getBoundingClientRect();
        return { pe: getComputedStyle(c).pointerEvents, under: c.previousElementSibling.id, over: c.nextElementSibling.id, same: Math.abs(b.width - s.width) < 1 && Math.abs(b.height - s.height) < 1, w: c.width, cw: b.width }; });
      assert.equal(fx.pe, 'none', '캔버스는 누름을 받지 않는다'); assert.deepEqual([fx.under, fx.over], ['mapimg', 'svg'], '캔버스는 그림 바로 위 · 다각형(SVG) 아래');
      assert(fx.same && fx.w >= fx.cw && fx.w <= 1024, '캔버스는 무대 크기 그대로, 그림 폭(1024)을 넘지 않는다: ' + JSON.stringify(fx));
      assert(await A.p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '344 패럴랙스 — 가로 넘침 없음');
      const span = await A.p.evaluate(() => scrollSpan().span);
      await A.p.evaluate(() => scrollTo(0, 0)); await A.p.waitForTimeout(300);
      const hit0 = await hits(A.p), poly0 = await polys(A.p);
      for (const [k, got] of hit0) if (got !== 'off') assert.equal(got, k, '패럴랙스 — ' + k + ' 누르는 자리는 그 방');
      /* 같은 굴림 자리의 정지 그림(동작 줄이기)과 다각형 · 누르는 자리가 똑같다 */
      const B = await open({ reducedMotion: 'reduce' });
      await B.p.goto(BASE + '/?map=cave'); await B.p.waitForFunction(() => document.querySelector('#mapimg').complete); await B.p.waitForTimeout(800);
      assert.equal(await B.p.locator('canvas.fx').count(), 0, '동작 줄이기 — 캔버스 없음(정지 그림)');
      assert.deepEqual(B.depth, [], '동작 줄이기 — 깊이 그림도 받지 않는다');
      await B.p.evaluate(() => scrollTo(0, 0)); await B.p.waitForTimeout(300);
      assert.deepEqual(await polys(B.p), poly0, '패럴랙스가 있어도 다각형은 정지 그림 때와 같은 자리');
      assert.deepEqual(await hits(B.p), hit0, '패럴랙스가 있어도 누르는 자리는 정지 그림 때와 같다');
      assert.deepEqual(B.errors, [], '동작 줄이기 오류 없음'); await B.ctx.close();
      /* 굴려도 다각형은 그림 좌표 그대로 — 앨리스는 서 있는 자리의 깊이만큼 밀린다(최대 FX_PX) */
      await A.p.waitForFunction(() => !document.querySelector('#alice').hidden);
      await A.p.evaluate(s => scrollTo(0, s), span); await A.p.waitForTimeout(2500);
      assert.deepEqual((await polys(A.p)).map(x => x[0]), poly0.map(x => x[0]), '굴려도 다각형 꼭짓점은 그대로');
      const sh = await A.p.evaluate(() => { const t = document.querySelector('#alice').style.translate.split(' ').map(parseFloat), o = fxOff(A.x, A.y); return { t, o, max: FX_PX }; });
      assert(sh.o && sh.t.length === 2 && sh.t.every(Number.isFinite) && Math.abs(sh.t[0] - sh.o[0]) < 0.02 && Math.abs(sh.t[1] - sh.o[1]) < 0.02 && sh.t.every(v => Math.abs(v) <= sh.max), '앨리스는 바닥과 같이 밀린다: ' + JSON.stringify(sh));
      for (const [k, got] of await hits(A.p)) if (got !== 'off') assert.equal(got, k, '굴린 뒤에도 ' + k + ' 누르는 자리는 그 방');
      /* 캔버스가 있어도 방을 누르면 다가가고, 다가간 동안은 캔버스를 숨기고 앨리스는 밀리지 않는다 */
      await A.p.locator('.room[data-key="review"]').tap(); await A.p.waitForSelector('#map.zoomed', { timeout: 3000 }); await A.p.waitForTimeout(500);
      assert.equal(await A.p.evaluate(() => getComputedStyle(document.querySelector('canvas.fx')).opacity), '0', '다가가면 정지 그림');
      assert.equal(await A.p.evaluate(() => document.querySelector('#alice').style.translate), '', '다가간 동안 앨리스는 밀리지 않는다');
      await A.p.locator('#back').tap(); await A.p.waitForFunction(() => getComputedStyle(document.querySelector('canvas.fx')).opacity === '1');
      /* 왕국은 이번 범위가 아니다 — 캔버스를 걷는다. 대미궁으로 돌아오면 다시 */
      await A.p.locator('#mapsel button[data-map="kingdom"]').tap(); await A.p.waitForTimeout(300);
      assert.equal(await A.p.locator('canvas.fx').count(), 0, '왕국 — 캔버스 없음');
      await A.p.locator('#mapsel button[data-map="cave"]').tap(); await A.p.waitForSelector('canvas.fx.ready', { timeout: 8000 });
      assert.deepEqual(A.errors, [], '패럴랙스 오류 없음');
      await A.p.evaluate(() => { localStorage.removeItem('atelier_hub_last_v1'); localStorage.setItem('atelier_hub_map_v1', 'cave'); });
      await A.ctx.close();
      /* 움직임 끔(AtelierMotion — scene-motion.js) 이면 캔버스 없음 */
      const C = await open({}, () => { window.AtelierMotion = { enabled: () => false }; });
      await C.p.goto(BASE + '/?map=cave'); await C.p.waitForFunction(() => document.querySelector('#mapimg').complete); await C.p.waitForTimeout(800);
      assert.equal(await C.p.locator('canvas.fx').count(), 0, 'AtelierMotion 끔 — 캔버스 없음'); assert.deepEqual(C.errors, [], 'AtelierMotion 끔 오류 없음'); await C.ctx.close();
      /* 깊이 그림을 못 받으면 — 지금처럼 정지 그림, 오류 없이 */
      const D = await open();
      await D.ctx.route('**/img/cave4-depth.webp*', r => r.fulfill({ status: 404, body: '' }));
      await D.p.goto(BASE + '/?map=cave'); await D.p.waitForFunction(() => document.querySelector('#mapimg').complete); await D.p.waitForTimeout(800);
      assert.equal(await D.p.locator('canvas.fx').count(), 0, '깊이 그림 못 받음 — 캔버스 없음'); assert.deepEqual(D.errors, [], '깊이 그림 못 받음 — 오류 없음');
      assert.equal(await D.p.locator('#mapimg').isVisible(), true, '깊이 그림 못 받음 — 그림은 그대로'); await D.ctx.close();
      /* 기울임 입력 — 안드로이드는 기기 기울기(deviceorientation), 권한 창을 띄우는 iOS 는 굴림만(요즘 크롬도 requestPermission 이 있어 이름으로 가른다) */
      for (const [os, ua, want] of [['안드로이드', 'Mozilla/5.0 (Linux; Android 14; SM-F956N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', true],
        ['iOS', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', false]]) {
        const G = await open({ userAgent: ua });
        await G.p.goto(BASE + '/?map=cave'); await G.p.waitForSelector('canvas.fx.ready', { timeout: 8000 });
        for (const [b, g] of [[45, 0], [55, 12]]) { await G.p.evaluate(([b, g]) => dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: b, gamma: g })), [b, g]); await G.p.waitForTimeout(150); }
        await G.p.waitForTimeout(400);
        const t = await G.p.evaluate(() => [FX.tx, FX.ty]);
        assert.equal(Math.abs(t[0]) > 0.2 && Math.abs(t[1]) > 0.1, want, os + ' 기울기로 기울임: ' + t);
        assert.deepEqual(G.errors, [], os + ' 오류 없음'); await G.ctx.close();
      }
    }
    console.log('PASS 공방 지도: 방 열여섯(공방 열 · 도구 다섯 · 도시공방 준비 중, 두 층 1:3)·칩·이름표·카드 · 지도 고르기(대미궁 · 왕국 — 지명 · 구역 · 기억 · ?map=) · 빛나기·미리보기 · 다가가기·문·주소·Esc·뒤로 가기 · 오늘 불·오늘 줄·오늘의 판·새 소식·다녀간 자국 · 세로/가로/PC 넘침 없음, 가로는 폭을 정해 굴린다 · 깊이 패럴랙스(344×882 — 깊이 그림 · 누르는 자리 그대로 · 앨리스 · 안드로이드 기울기/iOS 는 굴림만 · 움직임 끔/못 받음/왕국은 정지 그림)');
  } finally { await br.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
