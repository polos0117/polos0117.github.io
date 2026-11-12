/* 공방 지도(대미궁, 방 열여섯 — 2026-11-11 도구 다섯 · 두 층 1:3 · 2026-10-30 도트 공방·이미지 공방·원소의 섬 · 2026-11-10 화풍공방 · 도시공방(준비 중)) — 방 아홉이 서고, 올리면 빛나고 이름·미리보기가 뜨고, 누르면 다가가며 문들이 보이고, Esc·뒤로 가기로 돌아온다.
   오늘 기록(atelier_today_v1:<방> — 각 공방이 적는다)을 읽어 오늘 판을 둔 방에 불(빛·이름표 아래 줄)을 켜고, 문 패널·목록에 「오늘의 판」을 두고,
   공방 첫 화면의 Last-Modified 가 마지막으로 다녀간 뒤면 이름표에 새 소식 점을 찍는다. 문을 누르면 다녀간 자국(seen)이 남는다.
   휴대폰 세로(390×844)·가로(844×390)·PC(1280×900)에서 가로로 넘치지 않는다. 지도가 세로로 길어(1:2) 가로 화면에선 너비를 정해 두고 굴려 본다.
   아래 "모든 공방" 목록의 링크가 지도의 문들과 같다. 바깥 그림(각 공방의 그림 저장소)은 받지 않는다 — 404 로 돌린다.
   시간대 조명(2026-11-12) — 344×882 에서 ?time=night 면 패럴랙스 셰이더가 빛 그림 두 장으로 그리고(등불 깜빡임 · 새벽은 안개 흐름) 누르는 자리가 낮과 같다. 움직임 끔 · WebGL 없음이면 CSS 덮개 둘(정지). ?time=day 면 빛이 없다, 못 받으면 낮처럼, 기기 시각으로 고른다.
   방에 들어가는 연출(2026-11-12) — 344×882 에서 확대 0.7초 동안 캔버스를 보인 채 밀고, 끝나면 감춘다. 앨리스가 문으로 사라지고 문 빛. 기다림은 그대로. 끝난 뒤 누르는 자리 · 문 패널은 움직임 끔 때와 같다. 움직임 끔이면 연출 없음.
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
      await ctx.addInitScript(() => { Date.prototype.getHours = function () { return 12; }; });   /* 기기 시각은 한낮으로 못 박는다 — 시간대 조명(새벽 · 밤은 셰이더가 계속 다시 그린다)이 검사 도는 시각에 따라 끼어들지 않게. 시간대는 아래에서 ?time= 으로 따로 본다 */
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
        await ctx.addInitScript(() => { Date.prototype.getHours = function () { return 12; }; });   /* 한낮 — 시간대는 ?time= 으로만 */
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
      await A.p.locator('.room[data-key="review"]').tap(); await A.p.waitForSelector('#map.zoomed', { timeout: 3000 }); await A.p.waitForSelector('#map.zoomed:not(.pushing)', { timeout: 3000 }); await A.p.waitForTimeout(350);
      assert.equal(await A.p.evaluate(() => getComputedStyle(document.querySelector('canvas.fx')).opacity), '0', '다가가면(확대가 끝나면) 정지 그림');
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
      /* 시간대 조명(2026-11-12, 대미궁만) — 평소에는 패럴랙스 캔버스의 셰이더가 빛 그림 두 장(mul · glow)으로 한 번에 그린다(선형 공간에서 지도 × mul + glow, 밤 등불 깜빡임 · 새벽 안개 흐름).
         CSS 덮개 둘(multiply · screen, 정지)은 캔버스가 없을 때(움직임 끔 · WebGL 없음)와 방에 다가간 동안만. 방 다각형 · 이름표 · 누르는 자리는 어느 쪽이든 낮과 같다.
         ?time=day 면 빛 그림 없음(받지도 않는다), 못 받으면 낮처럼, 왕국은 없음, 기기 시각으로 고른다 */
      const lightState = p => p.evaluate(() => { const st = document.querySelector('#stage'), s = st.getBoundingClientRect(), z = e => +getComputedStyle(e).zIndex || 0, inner = document.querySelector('#inner'), pins = document.querySelector('#pins'), cv = document.querySelector('canvas.fx');
        return { time: st.dataset.time, fxlit: st.classList.contains('fxlit'), canvas: !!cv, cvOpacity: cv ? getComputedStyle(cv).opacity : null, lit: FX.lit, anim: FX.anim,
          zAlice: z(document.querySelector('#alice')), zSvg: z(document.querySelector('#svg')), zFx: cv ? z(cv) : 0,
          pinsOver: !inner.contains(pins) && !!(inner.compareDocumentPosition(pins) & Node.DOCUMENT_POSITION_FOLLOWING),
          els: [...document.querySelectorAll('#inner > img.light')].map(e => { const b = e.getBoundingClientRect(), c = getComputedStyle(e);
            return { id: e.id, there: !e.hidden, shown: !e.hidden && c.display !== 'none', ok: e.complete && e.naturalWidth === 512 && e.naturalHeight === 1536, blend: c.mixBlendMode, pe: c.pointerEvents, z: z(e), src: e.getAttribute('src') || '',
              same: Math.abs(b.width - s.width) < 1 && Math.abs(b.height - s.height) < 1 && Math.abs(b.left - s.left) < 1 && Math.abs(b.top - s.top) < 1 }; }) }; });
      const lightOpen = async (url, opt, init) => { const X = await open(opt, init); X.light = []; X.p.on('request', r => { if (/cave4-light-/.test(r.url())) X.light.push(r.url().replace(/^.*\/img\//, '').replace(/\?.*$/, '')); });
        await X.p.goto(BASE + url); await X.p.waitForSelector('.room'); await X.p.waitForFunction(() => document.querySelector('#mapimg').complete); return X; };
      /* 캔버스의 그 자리(그림 픽셀) 색 — 그 시각(ms)으로 한 장 그리고 바로 읽는다 */
      const fxPx = (p, pts, ts) => p.evaluate(([pts, ts]) => { FX.drawn = ''; fxFrame(ts); const gl = FX.gl, cv = FX.cv, o = new Uint8Array(4);
        return pts.map(([x, y]) => { gl.readPixels(Math.round(x / 1024 * cv.width), Math.round((1 - y / 3072) * cv.height), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, o); return [o[0], o[1], o[2]]; }); }, [pts, ts]);
      const sum = c => c[0] + c[1] + c[2];
      /* ── 밤: 셰이더가 그린다 ── */
      const N = await lightOpen('/?map=cave&time=night');
      await N.p.waitForFunction(() => document.querySelector('#stage').classList.contains('fxlit') && document.querySelector('canvas.fx.ready'), null, { timeout: 8000 });
      const ln = await lightState(N.p);
      assert(ln.time === 'night' && ln.canvas && ln.lit && ln.anim && ln.cvOpacity === '1', '밤 — 캔버스가 빛을 그리고 움직인다: ' + JSON.stringify(ln));
      assert.deepEqual(N.light.sort(), ['cave4-light-night-glow.webp', 'cave4-light-night-mul.webp'], '밤 — 그 시간대 두 장만 받는다');
      assert(ln.els.length === 2 && ln.els.every(e => e.there && e.ok && !e.shown), '밤 — 캔버스가 그리는 동안 CSS 덮개는 숨는다(두 번 어두워지지 않게): ' + JSON.stringify(ln.els));
      await N.p.evaluate(() => scrollTo(0, 0)); await N.p.waitForTimeout(300);
      const hitN = await hits(N.p), polyN = await polys(N.p);
      for (const [k, got] of hitN) if (got !== 'off') assert.equal(got, k, '밤 — ' + k + ' 누르는 자리는 그 방');
      /* 등불 자리 둘(빛 그림에서 가장 따뜻한 곳 — 위 절반 · 아래 절반)과 빛이 없는 바위 한 곳 */
      const spots = await N.p.evaluate(() => { const im = document.querySelector('#light-glow'), c = document.createElement('canvas'); c.width = 512; c.height = 1536; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const d = x.getImageData(0, 0, 512, 1536).data, best = [[-1, 0, 0], [-1, 0, 0]]; let dark = [1e9, 0, 0];
        for (let j = 40; j < 1500; j += 2) for (let i = 20; i < 492; i += 2) { const k = (j * 512 + i) * 4, w = d[k] - d[k + 2], h = j < 500 ? 0 : j > 900 ? 1 : -1, s = d[k] + d[k + 1] + d[k + 2];
          if (h >= 0 && w > best[h][0]) best[h] = [w, i * 2, j * 2]; if (s < dark[0] && j > 1000 && j < 1100) dark = [s, i * 2, j * 2]; }
        return { a: best[0].slice(1), b: best[1].slice(1), dark: dark.slice(1), warm: [best[0][0], best[1][0]], darkSum: dark[0] }; });
      assert(spots.warm.every(w => w > 60) && spots.darkSum < 12, '빛 그림에서 등불 자리 · 어두운 자리를 찾는다: ' + JSON.stringify(spots));
      const times = [1000, 1170, 1340, 1510, 1680, 1850, 2020, 2190, 2360, 2530, 2700, 2870], ser = { a: [], b: [], dark: [] };
      for (const t of times) { const [a, b, d] = await fxPx(N.p, [spots.a, spots.b, spots.dark], t); ser.a.push(sum(a)); ser.b.push(sum(b)); ser.dark.push(sum(d)); }
      const swing = v => { const lo = Math.min(...v), hi = Math.max(...v); return [(hi - lo) / ((hi + lo) / 2), hi - lo]; };
      for (const k of ['a', 'b']) { const [rel, abs] = swing(ser[k]); assert(abs >= 3 && rel <= 0.13, '밤 — 등불은 약하게 깜빡인다(±5% 안팎): ' + k + ' ' + JSON.stringify(ser[k])); }
      assert.equal(swing(ser.dark)[1], 0, '밤 — 빛이 없는 곳은 깜빡이지 않는다: ' + JSON.stringify(ser.dark));
      const norm = v => { const m = v.reduce((x, y) => x + y, 0) / v.length, d = v.map(x => x - m), n = Math.hypot(...d) || 1; return d.map(x => x / n); };
      const corr = norm(ser.a).reduce((acc, x, i) => acc + x * norm(ser.b)[i], 0);
      assert(corr < 0.9, '밤 — 등불마다 박자가 다르다(두 등불의 밝기 흐름이 같이 놀지 않는다): ' + corr.toFixed(3));
      /* 움직임이 돌고 있다 — 가만히 둬도 다시 그린다 */
      const d1 = await N.p.evaluate(() => FX.drawn); await N.p.waitForTimeout(400); assert.notEqual(await N.p.evaluate(() => FX.drawn), d1, '밤 — 가만히 둬도 다시 그린다(깜빡임)');
      /* 낮 — 빛 그림 없음(받지도 않는다). 누르는 자리 · 다각형은 밤과 같고, 밤은 낮보다 어둡다 */
      const Y = await lightOpen('/?map=cave&time=day'); await Y.p.waitForSelector('canvas.fx.ready', { timeout: 8000 });
      const ly = await lightState(Y.p);
      assert(ly.time === 'day' && !ly.fxlit && !ly.lit && !ly.anim, '낮 — 셰이더에 빛 없음: ' + JSON.stringify(ly)); assert(ly.els.length === 2 && ly.els.every(e => !e.there && !e.shown && !e.src), '낮 — 덮개 없음'); assert.deepEqual(Y.light, [], '낮 — 빛 그림을 받지 않는다');
      await Y.p.evaluate(() => scrollTo(0, 0)); await Y.p.waitForTimeout(300);
      assert.deepEqual(await polys(Y.p), polyN, '빛을 그려도 다각형은 낮과 같은 자리'); assert.deepEqual(await hits(Y.p), hitN, '빛을 그려도 누르는 자리는 낮과 같다');
      const rock = [[512, 760], [150, 470], [512, 2330]], dayPx = await fxPx(Y.p, rock, 1000), nightPx = await fxPx(N.p, rock, 1000);
      assert(nightPx.every((c, i) => sum(c) < sum(dayPx[i]) * 0.9), '밤은 낮보다 어둡다(호수 · 방 · 홀): ' + JSON.stringify([dayPx, nightPx]));
      const dY = await Y.p.evaluate(() => FX.drawn); await Y.p.waitForTimeout(300); assert.equal(await Y.p.evaluate(() => FX.drawn), dY, '낮 — 가만히 두면 다시 그리지 않는다');
      assert.deepEqual(Y.errors, [], '낮 오류 없음'); await Y.ctx.close();
      /* 밤에 방을 누르면 다가간다 — 그동안은 캔버스가 쉬고 CSS 덮개가 맡는다. 돌아오면 다시 셰이더 */
      await N.p.locator('.room[data-key="review"]').tap(); await N.p.waitForSelector('#map.zoomed', { timeout: 3000 });
      assert.equal(await N.p.locator('.room.on').getAttribute('data-key'), 'review', '밤 — 누르면 그 방으로 다가간다'); assert.equal(await N.p.locator('#doors').isVisible(), true, '밤 — 문 패널이 뜬다');
      await N.p.waitForSelector('#map.zoomed:not(.pushing)', { timeout: 3000 }); await N.p.waitForTimeout(350);   /* 밀고 들어가는 0.7초 동안은 아직 셰이더가 빛을 그린다 */
      const lzoom = await lightState(N.p);
      assert(lzoom.cvOpacity === '0' && lzoom.els.every(e => e.shown && e.pe === 'none'), '다가간 동안 — 캔버스는 쉬고 CSS 덮개가 맡는다(지도와 같이 커져 있다): ' + JSON.stringify(lzoom));
      assert.deepEqual(lzoom.els.map(e => e.blend), ['multiply', 'screen'], '다가간 동안 — 곱하기 · 더하기');
      await N.p.locator('#back').tap(); await N.p.waitForSelector('#map:not(.zoomed)'); await N.p.waitForFunction(() => getComputedStyle(document.querySelector('canvas.fx')).opacity === '1');
      assert((await lightState(N.p)).els.every(e => !e.shown), '돌아오면 CSS 덮개는 다시 숨는다');
      /* 왕국으로 바꾸면 빛이 걷히고, 대미궁으로 돌아오면 다시 */
      await N.p.locator('#mapsel button[data-map="kingdom"]').tap(); await N.p.waitForTimeout(200);
      const lk = await lightState(N.p); assert(lk.time === 'day' && !lk.canvas && !lk.fxlit && lk.els.every(e => !e.shown), '왕국 — 빛 없음: ' + JSON.stringify(lk));
      await N.p.locator('#mapsel button[data-map="cave"]').tap(); await N.p.waitForFunction(() => document.querySelector('#stage').classList.contains('fxlit'), null, { timeout: 8000 });
      assert.deepEqual(N.errors, [], '밤 오류 없음');
      await N.p.evaluate(() => { localStorage.removeItem('atelier_hub_last_v1'); localStorage.setItem('atelier_hub_map_v1', 'cave'); }); await N.ctx.close();
      /* 새벽 — 안개가 천천히 흐른다(호수 위 한 점이 시간이 가면 달라진다). 아침 — 정지(가만히 두면 다시 그리지 않는다) */
      for (const t of ['dawn', 'morning']) { const X = await lightOpen('/?map=cave&time=' + t); await X.p.waitForFunction(() => document.querySelector('#stage').classList.contains('fxlit'), null, { timeout: 8000 });
        assert.deepEqual(X.light.sort(), [`cave4-light-${t}-glow.webp`, `cave4-light-${t}-mul.webp`], t + ' — 제 빛 그림 두 장');
        const st = await lightState(X.p); assert.equal(st.anim, t === 'dawn', t + ' — 움직임은 새벽 · 밤만');
        await X.p.evaluate(() => scrollTo(0, 0)); await X.p.waitForTimeout(300);
        const fog = []; for (const ms of [0, 6000, 12000, 24000]) fog.push(sum((await fxPx(X.p, [[512, 800]], ms))[0]));
        if (t === 'dawn') assert(Math.max(...fog) - Math.min(...fog) >= 3, '새벽 — 안개가 흐른다: ' + fog); else assert.equal(Math.max(...fog) - Math.min(...fog), 0, '아침 — 정지: ' + fog);
        if (t === 'morning') { const d0 = await X.p.evaluate(() => FX.drawn); await X.p.waitForTimeout(300); assert.equal(await X.p.evaluate(() => FX.drawn), d0, '아침 — 가만히 두면 다시 그리지 않는다'); }
        assert.deepEqual(X.errors, [], t + ' 오류 없음'); await X.ctx.close(); }
      /* ── 캔버스가 없을 때만 CSS 덮개: 움직임 끔(동작 줄이기) · WebGL 없음 — 정지, 그림 · 앨리스 위, 방 다각형 · 이름표 아래, 누름 없음 ── */
      for (const [why, opt, init] of [['동작 줄이기', { reducedMotion: 'reduce' }, null],
        ['WebGL 없음', {}, () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; }]]) {
        const R = await lightOpen('/?map=cave&time=night', opt, init);
        await R.p.waitForFunction(() => document.querySelector('#stage').dataset.time === 'night', null, { timeout: 8000 }); await R.p.waitForTimeout(500);
        const lr = await lightState(R.p);
        assert(!lr.canvas && !lr.fxlit && !lr.lit, why + ' — 캔버스 없음: ' + JSON.stringify(lr));
        assert.deepEqual(lr.els.map(e => e.id), ['light-mul', 'light-glow'], why + ' — CSS 덮개 둘');
        assert(lr.els.every(e => e.shown && e.ok && e.same && e.pe === 'none'), why + ' — 덮개는 받아졌고(512×1536) 지도 크기로 늘어나 있고 누름을 받지 않는다: ' + JSON.stringify(lr.els));
        assert.deepEqual(lr.els.map(e => e.blend), ['multiply', 'screen'], why + ' — 곱하기 · 더하기');
        assert(lr.els.every(e => e.z > lr.zAlice && e.z < lr.zSvg) && lr.pinsOver, why + ' — 덮개는 그림 · 앨리스 위, 방 다각형(SVG) · 이름표 아래');
        assert.equal(await R.p.evaluate(() => document.querySelector('#light-glow').getAnimations().length), 0, why + ' — 덮개는 정지');
        /* 밤에도 이름표는 읽힌다 — 덮개 위에 있고, 흰 글자 · 어두운 바탕 그대로 */
        const pinStyle = await R.p.evaluate(() => { const c = getComputedStyle(document.querySelector('.pin[data-key="book"] b')); return [c.color, c.backgroundColor, c.mixBlendMode]; });
        assert.deepEqual([pinStyle[0], pinStyle[2]], ['rgb(255, 255, 255)', 'normal'], why + ' — 이름표 글자는 흰색 그대로'); assert.match(pinStyle[1], /rgba\(0, 0, 0, 0\.[6-9]/, why + ' — 이름표 바탕은 어두운 그대로: ' + pinStyle[1]);
        await R.p.evaluate(() => scrollTo(0, 0)); await R.p.waitForTimeout(300);
        assert.deepEqual(await polys(R.p), polyN, why + ' — 다각형은 그대로'); assert.deepEqual(await hits(R.p), hitN, why + ' — 누르는 자리는 그대로');
        assert.deepEqual(R.errors, [], why + ' 오류 없음'); await R.ctx.close();
      }
      /* 빛 그림을 하나라도 못 받으면 — 낮처럼(셰이더에도 CSS 에도 빛 없음), 오류 없이 */
      const Z = await open(); await Z.ctx.route('**/img/cave4-light-night-glow.webp*', r => r.fulfill({ status: 404, body: '' }));
      await Z.p.goto(BASE + '/?map=cave&time=night'); await Z.p.waitForSelector('canvas.fx.ready', { timeout: 8000 }); await Z.p.waitForTimeout(600);
      const lz = await lightState(Z.p); assert(lz.time === 'day' && !lz.fxlit && !lz.lit && lz.els.every(e => !e.shown), '빛 그림 못 받음 — 빛 없음: ' + JSON.stringify(lz));
      assert.equal(await Z.p.locator('#mapimg').isVisible(), true, '빛 그림 못 받음 — 그림은 그대로'); assert.deepEqual(Z.errors, [], '빛 그림 못 받음 — 오류 없음'); await Z.ctx.close();
      /* 기기 시각으로 고른다 — 새벽 4~6 · 아침 6~9 · 낮 9~18 · 밤 18~4. 틀린 ?time= 은 기기 시각으로, 옳은 ?time= 은 기기 시각을 이긴다 */
      for (const [h, want, q] of [[3, 'night'], [4, 'dawn'], [5, 'dawn'], [6, 'morning'], [8, 'morning'], [9, 'day'], [17, 'day'], [18, 'night'], [23, 'night'], [0, 'night'], [12, 'day', 'noon'], [12, 'night', 'night'], [23, 'day', 'day']]) {
        const ctx = await br.newContext({ viewport: fold, isMobile: true, hasTouch: true });
        await ctx.addInitScript(h => { Date.prototype.getHours = function () { return h; }; }, h);
        await ctx.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.fulfill({ status: 404, body: '' }));
        const p = await ctx.newPage(); await p.goto(BASE + '/?map=cave' + (q ? '&time=' + q : '')); await p.waitForSelector('.room');
        assert.equal(await p.evaluate(() => TIME), want, h + '시' + (q ? ' ?time=' + q : '') + ' → ' + want); await ctx.close();
      }
      console.log('PASS 시간대 조명: 밤 — 셰이더가 빛을 그린다(CSS 덮개 숨음 · 낮보다 어둡다 · 등불 깜빡임 ±5% · 등불마다 다른 박자 · 빛 없는 곳은 그대로) · 누르는 자리 · 다각형은 낮과 같다 · 다가간 동안은 CSS 덮개 · 새벽 안개 흐름 · 아침 정지 · 낮 빛 없음 · 동작 줄이기 · WebGL 없음이면 CSS 덮개 둘(곱하기 · 더하기 · 정지 · 이름표 그대로) · 왕국 · 못 받음 · 기기 시각 열 · ?time= 셋');
      /* 방에 들어가는 연출(2026-11-12, 대미궁만) — ① 확대 0.7초 동안 캔버스를 보인 채 셰이더가 그 방 쪽으로 세게 밀고(.pushing), 끝나면 캔버스를 감춘다 ② 앨리스가 문 쪽으로 사라지고 문 자리에서 방 색 빛
         ③ 문 링크를 누르면 확대된 방이 더 커지며 사라진다(.leaving) + @view-transition. 기다림은 늘지 않는다. 확대가 끝난 뒤의 누르는 자리 · 문 패널은 움직임 끔 때와 같다. 움직임 끔이면 연출 없음 */
      const zoomState = p => p.evaluate(() => { const m = document.querySelector('#map'), cv = document.querySelector('canvas.fx'), a = document.querySelector('#alice'), g = document.querySelector('#doorglow'), on = document.querySelector('.room.on polygon');
        const s = document.querySelector('#stage').getBoundingClientRect(), hit = document.elementFromPoint(s.left + s.width / 2, s.top + s.height / 2), r = on ? on.getBoundingClientRect() : null;
        return { cls: m.className, cv: cv ? getComputedStyle(cv).opacity : null, push: !!FX.push, alice: a.className, aliceOp: getComputedStyle(a).opacity, glow: g.className, glowAnim: g.getAnimations().length,
          transform: document.querySelector('#inner').style.transform, hit: hit && hit.closest('.room') ? hit.closest('.room').dataset.key : hit && hit.tagName, rect: r ? [r.x, r.y, r.width, r.height].map(v => Math.round(v)) : null,
          doors: getComputedStyle(document.querySelector('#doors')).display !== 'none', h2: (document.querySelector('#doors h2') || {}).textContent, links: [...document.querySelectorAll('#doorlinks a')].map(x => x.getAttribute('href')), back: !!document.querySelector('#back'),
          overflow: document.documentElement.scrollWidth > innerWidth + 1, vt: document.getElementById('vt').media, vtRule: /@view-transition\s*\{\s*navigation:\s*auto/.test([...document.getElementById('vt').sheet.cssRules].map(x => x.cssText).join(' ')) }; });
      const pk = p => p.evaluate(() => { const gl = FX.gl; return [...gl.getUniform(gl.getParameter(gl.CURRENT_PROGRAM), FX.u.pk)]; });
      /* 움직임 끔(동작 줄이기) — 연출 없이 전과 같다. 견줄 기준으로 쓴다 */
      const Q = await open({ reducedMotion: 'reduce' });
      await Q.p.goto(BASE + '/?map=cave&time=day'); await Q.p.waitForSelector('.room'); await Q.p.waitForFunction(() => !document.querySelector('#alice').hidden);
      await Q.p.locator('.room[data-key="game"]').tap(); await Q.p.waitForSelector('#map.zoomed', { timeout: 3000 });
      const q0 = await zoomState(Q.p); await Q.p.waitForTimeout(400); const q1 = await zoomState(Q.p);
      for (const q of [q0, q1]) { assert(!/pushing|leaving/.test(q.cls) && !q.push, '움직임 끔 — 밀기 없음: ' + q.cls); assert(!/gone/.test(q.alice) && q.aliceOp === '1', '움직임 끔 — 앨리스는 그대로: ' + q.alice); assert(!/\bon\b/.test(q.glow) && q.glowAnim === 0, '움직임 끔 — 문 빛 없음'); }
      assert.equal(q1.vt, 'not all', '움직임 끔 — 문서 간 전환도 끈다'); assert(q1.vtRule, '전환 한 줄은 머리에 있다');
      /* 문 링크를 누른 그 순간의 모습을 남겨 두고(누름 처리가 끝난 뒤 · 넘어가기 전) 넘어간 쪽에서 읽는다 — 넘어가는 때는 기기마다 달라 기다려서 볼 수 없다 */
      const leaveMark = p => p.evaluate(() => document.addEventListener('click', () => { try { sessionStorage.setItem('lv', JSON.stringify({ cls: document.querySelector('#map').className, tr: document.querySelector('#inner').style.transform })); } catch (e) {} }));
      await leaveMark(Q.p); await Q.p.locator('#doorlinks a.main').tap();
      await Q.p.waitForURL(/game-atelier/);
      assert(!/leaving/.test(JSON.parse(await Q.p.evaluate(() => sessionStorage.getItem('lv'))).cls), '움직임 끔 — 문 링크를 눌러도 그대로 넘어간다');
      assert.deepEqual(Q.errors, [], '움직임 끔 오류 없음'); await Q.ctx.close();
      /* 움직임 켬 — 기다림은 그대로(누른 뒤 1.2초 안에 확대 시작 · 문 패널, 그 뒤 0.7초에 확대 끝) */
      const M = await open();
      await M.p.goto(BASE + '/?map=cave&time=day'); await M.p.waitForSelector('canvas.fx.ready', { timeout: 8000 }); await M.p.waitForFunction(() => !document.querySelector('#alice').hidden); await M.p.waitForTimeout(600);
      await M.p.evaluate(() => { window.__t = { tap: performance.now() }; new MutationObserver(() => { const c = document.querySelector('#map').className, t = window.__t;
        if (/zoomed/.test(c) && !t.zoom) t.zoom = performance.now(); if (/zoomed/.test(c) && !/pushing/.test(c) && t.zoom && !t.end) t.end = performance.now(); }).observe(document.querySelector('#map'), { attributes: true }); });
      await M.p.locator('.room[data-key="game"]').tap(); await M.p.waitForSelector('#map.zoomed.pushing', { timeout: 3000 });
      const m0 = await zoomState(M.p);
      assert(m0.cv === '1' && m0.push, '확대 동안 — 캔버스를 숨기지 않고 밀고 있다: ' + JSON.stringify(m0));
      assert(/gone/.test(m0.alice), '확대와 같이 — 앨리스가 문 쪽으로 사라진다: ' + m0.alice); assert(/\bon\b/.test(m0.glow) && m0.glowAnim === 1, '확대와 같이 — 문 자리에서 방 색 빛이 번진다');
      assert(m0.doors && m0.h2 === q1.h2 && m0.back, '문 패널은 확대와 함께 바로 뜬다(연출을 기다리지 않는다)');
      await M.p.waitForFunction(() => { const gl = FX.gl; return gl.getUniform(gl.getParameter(gl.CURRENT_PROGRAM), FX.u.pk)[0] > 1.2; }, null, { timeout: 1500, polling: 16 });   /* 셰이더의 밀기가 평소(1배)보다 세다 */
      await M.p.waitForSelector('#map.zoomed:not(.pushing)', { timeout: 3000 }); await M.p.waitForTimeout(350);
      const m1 = await zoomState(M.p), tm = await M.p.evaluate(() => window.__t);
      assert(tm.zoom - tm.tap < 1300 && tm.end - tm.zoom < 900, '기다림이 늘지 않는다 — 걷기 ' + Math.round(tm.zoom - tm.tap) + 'ms · 확대 ' + Math.round(tm.end - tm.zoom) + 'ms');
      assert(m1.cv === '0' && !m1.push, '확대가 끝나면 캔버스가 감춰진다(그림이 보인다): ' + JSON.stringify(m1)); assert.equal(m1.aliceOp, '0', '앨리스는 방 안으로 사라졌다');
      assert.deepEqual([m1.transform, m1.rect, m1.hit, m1.h2, m1.links, m1.doors, m1.back], [q1.transform, q1.rect, q1.hit, q1.h2, q1.links, q1.doors, q1.back], '확대가 끝난 뒤 — 지도 자리 · 방 다각형 · 누르는 자리 · 문 패널은 움직임 끔 때와 같다');
      assert.equal(m1.hit, 'game', '확대가 끝난 뒤 — 가운데를 누르면 그 방'); assert(!m1.overflow, '확대 — 가로 넘침 없음'); assert(m1.vt !== 'not all' && m1.vtRule, '움직임 켬 — 문서 간 전환 한 줄이 켜져 있다');
      assert.deepEqual(await pk(M.p), [0, 0], '확대가 끝나면 밀기도 평소 기울임도 0 — 정지 그림과 똑같은 한 장');
      /* 나올 때는 반대로 — 바로 캔버스, 밀며 나오고, 앨리스는 문 앞에 다시 선다 */
      const at = await M.p.evaluate(() => [A.x, A.y, A.nav.n[A.nav.doors.game]]);
      await M.p.locator('#back').tap(); await M.p.waitForSelector('#map.pushing:not(.zoomed)', { timeout: 2000 });
      const m2 = await zoomState(M.p); assert(m2.cv === '1' && m2.push && !/gone/.test(m2.alice), '나올 때 — 캔버스가 바로 보이고 밀며 나온다, 앨리스는 다시: ' + JSON.stringify(m2));
      await M.p.waitForFunction(() => { const gl = FX.gl; return gl.getUniform(gl.getParameter(gl.CURRENT_PROGRAM), FX.u.pk)[0] < -1.2; }, null, { timeout: 1500, polling: 16 });   /* 반대 방향 */
      await M.p.waitForSelector('#map:not(.pushing):not(.zoomed)', { timeout: 3000 }); await M.p.waitForTimeout(400);
      const m3 = await zoomState(M.p); assert(m3.cv === '1' && !m3.push && m3.aliceOp === '1' && m3.transform === '', '나온 뒤 — 평소대로: ' + JSON.stringify(m3));
      assert.deepEqual(await pk(M.p), [0, 1], '나온 뒤 — 밀기 0 · 평소 기울임 그대로');
      assert(Math.abs(at[0] - at[2][0]) < 1 && Math.abs(at[1] - at[2][1]) < 1 && await M.p.evaluate(([x, y]) => Math.abs(A.x - x) < 1 && Math.abs(A.y - y) < 1, at), '지도로 돌아오면 앨리스는 그 문 앞');
      for (const [k, got] of await hits(M.p)) if (got !== 'off') assert.equal(got, k, '나온 뒤 — ' + k + ' 누르는 자리는 그 방');
      /* 문 링크 — 누르자마자 간다(기다리지 않는다). 그 사이 확대된 방이 살짝 더 커지며 사라진다. 뒤로 오면 원래대로 */
      await M.p.locator('.room[data-key="game"]').tap(); await M.p.waitForSelector('#map.zoomed:not(.pushing)', { timeout: 4000 });
      const tr0 = await M.p.evaluate(() => document.querySelector('#inner').style.transform);
      await leaveMark(M.p); await M.p.locator('#doorlinks a.main').tap(); await M.p.waitForURL(/game-atelier/);
      const lv = JSON.parse(await M.p.evaluate(() => sessionStorage.getItem('lv')));
      assert(/leaving/.test(lv.cls) && /scale\(1\.06\)/.test(lv.tr) && lv.tr.endsWith(tr0), '문 링크 — 누르면 확대된 방이 더 커지며 사라지기 시작한다(넘어가길 기다리지 않는다): ' + JSON.stringify(lv));
      await M.p.waitForURL(/game-atelier/); await M.p.goBack(); await M.p.waitForSelector('.room'); await M.p.waitForTimeout(400);
      assert(!/leaving/.test(await M.p.evaluate(() => document.querySelector('#map').className)), '뒤로 오면 — 원래대로');
      assert.deepEqual(M.errors, [], '연출 오류 없음 — 전환 한 줄이 목록(VT_READY)에 없는 공방으로는 전환을 걸지 않아 그쪽 콘솔에도 오류가 없다');
      /* 한 줄이 들어간 곳(허브의 즐겨찾기 페이지)으로는 문서 간 전환이 실제로 걸린다 — 들어온 쪽의 pagereveal 에 viewTransition 이 있다 */
      const V = await open({}, () => { addEventListener('pagereveal', e => { try { sessionStorage.setItem('vt:' + location.pathname, e.viewTransition ? '1' : '0'); } catch (x) {} }); });
      await V.p.goto(BASE + '/?map=cave&time=day'); await V.p.waitForSelector('canvas.fx.ready', { timeout: 8000 }); await V.p.waitForFunction(() => !document.querySelector('#alice').hidden);
      await V.p.evaluate(() => scrollTo(0, scrollSpan().span)); await V.p.waitForTimeout(1200);
      await V.p.locator('.room[data-key="fav"]').tap(); await V.p.waitForSelector('#map.zoomed:not(.pushing)', { timeout: 4000 });
      await V.p.locator('#doorlinks a.main').tap(); await V.p.waitForURL(/favorites\.html/); await V.p.waitForTimeout(500);
      assert.equal(await V.p.evaluate(() => sessionStorage.getItem('vt:/favorites.html')), '1', '즐겨찾기 페이지로 — 문서 간 전환이 걸린다');
      assert.deepEqual(V.errors, [], '전환 오류 없음'); await V.ctx.close();
      await M.p.evaluate(() => { localStorage.removeItem('atelier_hub_last_v1'); localStorage.setItem('atelier_hub_map_v1', 'cave'); }); await M.ctx.close();
      /* 밤(시간대 조명)과 겹쳐도 — 미는 동안은 셰이더가 빛을 그리고(CSS 덮개 숨음), 끝나면 CSS 덮개가 맡는다 */
      const P = await lightOpen('/?map=cave&time=night'); await P.p.waitForFunction(() => document.querySelector('#stage').classList.contains('fxlit'), null, { timeout: 8000 }); await P.p.waitForFunction(() => !document.querySelector('#alice').hidden);
      await P.p.locator('.room[data-key="game"]').tap(); await P.p.waitForSelector('#map.zoomed.pushing', { timeout: 3000 });
      const p0 = await lightState(P.p); assert(p0.cvOpacity === '1' && p0.els.every(e => !e.shown), '밤 — 미는 동안은 캔버스가 빛을 그린다(CSS 덮개 숨음): ' + JSON.stringify(p0));
      await P.p.waitForSelector('#map.zoomed:not(.pushing)', { timeout: 3000 });
      const p1 = await lightState(P.p), u1 = await P.p.evaluate(() => { const gl = FX.gl; return gl.getUniform(gl.getParameter(gl.CURRENT_PROGRAM), FX.u.kind); });
      assert(p1.els.every(e => e.shown) && u1 === 0, '밤 — 끝나는 순간 캔버스는 빛 없는 한 장으로, CSS 덮개가 맡는다(두 번 어두워지지 않는다): ' + JSON.stringify([p1.els.map(e => e.shown), u1]));
      await P.p.waitForTimeout(350); assert.equal((await lightState(P.p)).cvOpacity, '0', '밤 — 그 뒤 캔버스가 감춰진다');
      await P.p.locator('#back').tap(); await P.p.waitForSelector('#map.pushing:not(.zoomed)', { timeout: 2000 });
      const p2 = await lightState(P.p), u2 = await P.p.evaluate(() => { const gl = FX.gl; return gl.getUniform(gl.getParameter(gl.CURRENT_PROGRAM), FX.u.kind); });
      assert(p2.cvOpacity === '1' && p2.els.every(e => !e.shown) && u2 === 3, '밤 — 나올 때는 바로 빛을 그리는 캔버스로: ' + JSON.stringify([p2.cvOpacity, u2]));
      assert.deepEqual(P.errors, [], '밤 연출 오류 없음'); await P.p.evaluate(() => { localStorage.removeItem('atelier_hub_last_v1'); }); await P.ctx.close();
      console.log('PASS 방에 들어가는 연출: 확대 동안 캔버스를 보인 채 민다(평소보다 세게) · 앨리스가 문으로 사라지고 문 빛 · 문 패널은 바로 · 기다림 그대로 · 끝나면 캔버스 감춤 · 지도 자리 · 누르는 자리 · 문 패널은 움직임 끔 때와 같다 · 나올 때 반대로 · 문 링크는 바로 가고 방이 커지며 사라진다 · 밤 덮개와 맞바꿈 · 움직임 끔이면 연출 없음');
    }
    console.log('PASS 공방 지도: 방 열여섯(공방 열 · 도구 다섯 · 도시공방 준비 중, 두 층 1:3)·칩·이름표·카드 · 지도 고르기(대미궁 · 왕국 — 지명 · 구역 · 기억 · ?map=) · 빛나기·미리보기 · 다가가기·문·주소·Esc·뒤로 가기 · 오늘 불·오늘 줄·오늘의 판·새 소식·다녀간 자국 · 세로/가로/PC 넘침 없음, 가로는 폭을 정해 굴린다 · 깊이 패럴랙스(344×882 — 깊이 그림 · 누르는 자리 그대로 · 앨리스 · 안드로이드 기울기/iOS 는 굴림만 · 움직임 끔/못 받음/왕국은 정지 그림)');
  } finally { await br.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
