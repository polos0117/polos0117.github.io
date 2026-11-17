/* 일상컷 목록(casual.html · casual.js) — 색인 fixture 셋(삼국지 · 원소는 있고 포켓몬은 없다)으로 셈과 화면을 본다.
   셈: 요약(필수 갈래별 · 게임별 장수와 비율 · 캐릭터별 — 한글이 있으면 한글, 없으면 영어) · 거르기 셋 · 의상 · 코스프레 칸 글.
   화면(폰 · PC): 위 표 세 줄(없는 공방은 「색인이 아직 없다」) · 기본 공방 · 요약 · 표 칸(*Ko · GPT 고름 · 자유 설계 Outfit 줄 줄이고 펼치기 · 글은 글로)
     · 거르기(주소 ?a=&f=, 새로 고쳐도) · 그림(img) 요청 없음 · 옆으로 넘치지 않는다(표는 표 안에서만) · 콘솔 오류 없음 · 그림 현황에서 들어가는 고리.
   Run: node tests/casual.cjs   (CHROMIUM_PATH 로 브라우저, CASUAL_PORT 로 자리) */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const ROOT = path.resolve(__dirname, '..'), C = require(path.join(ROOT, 'casual.js'));

/* 색인 꼴은 주문서 그대로 — 없는 칸도 null 로 */
const base = { world: '', worldKo: '', style: 'api25', path: '', required: null, requiredKo: null, family: null, familyKo: null, item: null, itemKo: null, shade: null, shadeKo: null, cosplay: null, free: null };
const row = o => Object.assign({}, base, o);
const LONG = 'Outfit: a loose oversized cream knit sweater over a pleated plaid skirt, black tights, chunky loafers, a <b>thin</b> silver chain necklace and a canvas tote bag';
const SAM = { version: 1, atelier: 'sam', built: '2026-11-17T03:00:00Z', source: ['sam-atelier-img', 'sam-atelier-img-2'], rows: [
  row({ card: '조조', name: '조조', world: 'samguk', worldKo: '삼국시대', n: 1, date: '2026-11-16', required: 'swimwear', requiredKo: '노출 갈래(수영복)', family: 'swimwear', familyKo: '수영복', item: 'bikini', itemKo: '비키니', shade: 'navy', shadeKo: '남색' }),
  row({ card: '조조', name: '조조', world: 'samguk', worldKo: '삼국시대', n: 2, date: '2026-11-16', required: 'cosplay', requiredKo: '게임 코스프레', cosplay: { game: 'genshin', gameKo: '원신', character: 'Raiden Shogun', characterKo: null, cut: 'battle', cutKo: '전투 자세', by: 'planner', round: 1 } }),
  row({ card: '관우', name: '관우', world: 'fantasy', worldKo: '중세 판타지', n: 3, date: '2026-11-15', cosplay: { game: 'genshin', gameKo: '원신', character: 'Raiden Shogun', characterKo: null, cut: 'idle', cutKo: '서 있기', by: 'planner', round: 1 } }),
  row({ card: '관우', name: '관우', world: 'fantasy', worldKo: '중세 판타지', n: 4, date: '2026-11-15', required: 'cosplay', requiredKo: '게임 코스프레', cosplay: { game: 'changse', gameKo: '창세기전', character: 'Iolin', characterKo: '이올린', cut: 'smile', cutKo: '웃는 얼굴', by: 'planner', round: 1 } }),
  row({ card: '유비', name: '유비', world: 'mecha', worldKo: '메카', n: 5, date: '2026-11-14', cosplay: { game: 'genshin', gameKo: '원신', character: 'Hu Tao', characterKo: null, cut: 'pose', cutKo: '포즈', by: 'gpt', round: 1 } }),
  row({ card: '유비', name: '유비', world: 'mecha', worldKo: '메카', n: 90, date: '2026-11-13', required: 'own', requiredKo: '캐릭터만의 컷' })
] };
const EL = { version: 1, atelier: 'element', built: '2026-11-17T02:00:00Z', source: ['element-atelier-img'], rows: [
  row({ card: 'fe', name: '철 근본', world: 'fantasy', worldKo: '판타지', n: 1, date: '2026-11-17', required: 'nation', requiredKo: '나라 안', family: 'street', familyKo: '거리 옷', item: 'trench', itemKo: '트렌치코트', shade: 'rust', shadeKo: '녹빛' }),
  row({ card: 'fe', name: '철 근본', world: 'fantasy', worldKo: '판타지', n: 2, date: '2026-11-17', free: { kind: 'ofree', kindKo: '옷 자유', outfit: LONG } }),
  row({ card: 'cu', name: '구리 근본', world: 'mecha', worldKo: '메카', n: 3, date: '2026-11-16', free: { kind: 'sfree', kindKo: '장면 자유', outfit: 'Outfit: a red raincoat' } }),
  row({ card: 'cu', name: '구리 근본', world: 'mecha', worldKo: '메카', n: 4, date: '2026-11-16', free: { kind: 'gfree', kindKo: '갈래 자유', outfit: null } })
] };
const FIX = { 'sam-atelier': SAM, 'element-atelier': EL };   /* pkm-atelier 는 없다(404) */

/* ── 셈 ── */
assert.deepEqual(C.ATELIERS.map(a => a.key), ['sam', 'element', 'pkm']);
assert.deepEqual(C.ATELIERS.map(a => a.path), ['/sam-atelier/data/casual-index.json', '/element-atelier/data/casual-index.json', '/pkm-atelier/data/casual-index.json']);
assert(C.valid(SAM) && !C.valid(null) && !C.valid({ rows: 'x' }) && !C.valid({}), '꼴');
const s = C.summary(SAM.rows);
assert.deepEqual([s.total, s.required, s.cosplay, s.free, s.gpt], [6, 4, 4, 0, 1]);
assert.deepEqual(s.reqs.map(x => [x.ko, x.n]), [['게임 코스프레', 2], ['노출 갈래(수영복)', 1], ['캐릭터만의 컷', 1]], '필수 갈래별(많은 차례) — 캐릭터만의 컷도');
assert.deepEqual(s.games.map(x => [x.ko, x.n, x.pct]), [['원신', 3, 75], ['창세기전', 1, 25]], '게임별 장수 · 비율(코스프레 컷 가운데)');
assert.deepEqual(s.chars.map(x => [x.gameKo, x.name, x.n]), [['원신', 'Raiden Shogun', 2], ['창세기전', '이올린', 1], ['원신', 'Hu Tao', 1]], '캐릭터별 — 한글이 있으면 한글, 없으면 영어');
const e = C.summary(EL.rows);
assert.deepEqual([e.total, e.required, e.cosplay, e.free, e.games.length], [4, 1, 0, 3, 0]);
assert.deepEqual(C.summary([]).reqs, []);
assert.deepEqual(['all', 'required', 'cosplay', 'free'].map(f => C.filter(SAM.rows, f).length), [6, 4, 4, 0]);
assert.deepEqual(['all', 'required', 'cosplay', 'free'].map(f => C.filter(EL.rows, f).length), [4, 1, 0, 3]);
assert.equal(C.outfitText(SAM.rows[0]), '수영복 · 비키니 · 남색', '의상 — 갈래 · 의상 · 옷 색');
assert.equal(C.outfitText(row({ familyKo: '거리 옷', itemKo: '트렌치코트' })), '거리 옷 · 트렌치코트', '옷 색이 없으면 빼고');
assert.equal(C.outfitText(SAM.rows[1]), '');
assert.equal(C.cosplayText(SAM.rows[3]), '창세기전 · 이올린 · 웃는 얼굴');
assert.equal(C.cosplayText(SAM.rows[2]), '원신 · Raiden Shogun · 서 있기');
assert.match(fs.readFileSync(path.join(ROOT, 'casual.html'), 'utf8'), /cache: 'no-store'/, '색인은 no-store 로 읽는다');
assert.match(fs.readFileSync(path.join(ROOT, 'status.html'), 'utf8'), /href="casual\.html"/, '그림 현황에서 들어가는 고리');

/* ── 화면 ── */
const PORT = +(process.env.CASUAL_PORT || 8806), BASE = 'http://127.0.0.1:' + PORT;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/json' };
const server = http.createServer((q, res) => {
  const p = decodeURIComponent(new URL(q.url, BASE).pathname), m = p.match(/^\/([^/]+)\/data\/casual-index\.json$/);
  if (m) { if (!FIX[m[1]]) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(FIX[m[1]])); }
  const file = path.join(ROOT, p === '/' ? 'index.html' : p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const { chromium } = require('playwright'); const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  let checks = 0;
  try {
    for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      const ctx = await br.newContext({ viewport: vp }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      const p = await ctx.newPage(), errors = [], imgs = [];
      p.on('pageerror', x => errors.push(x.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|Failed to load resource/.test(m.text())) errors.push(m.text()); });
      p.on('request', r => { if (r.resourceType() === 'image' && !/icon-/.test(r.url())) imgs.push(r.url()); });
      await p.goto(BASE + '/casual.html');
      await p.waitForFunction(() => !/읽는 중/.test(document.querySelector('#sum tbody').textContent));
      /* 위 표 — 없는 공방만 「색인이 아직 없다」 */
      assert.equal(await p.locator('#sum tbody tr').count(), 3, '표 세 줄');
      const sumRow = k => p.locator('#sum tbody tr', { has: p.locator(`[data-a="${k}"]`) });
      assert.match(await sumRow('pkm').textContent(), /색인이 아직 없다/);
      assert.match(await sumRow('sam').textContent(), /6\s*4\s*4\s*0\s*2026-11-17/, '삼국지 컷 · 필수 · 코스프레 · 자유 · 색인 날짜');
      assert.doesNotMatch(await sumRow('element').textContent(), /아직 없다/);
      /* 기본 원소 · 전부 */
      assert.equal(await p.locator('[data-a="element"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await p.locator('#cuts tbody tr').count(), 4);
      const fe2 = p.locator('#cuts tbody tr').nth(1);
      assert.match(await p.locator('#cuts tbody tr').first().textContent(), /2026-11-17.*철 근본.*판타지.*1.*나라 안.*거리 옷 · 트렌치코트 · 녹빛/, '원소 첫 줄 칸');
      /* 자유 설계 — 긴 Outfit 줄은 줄여 보이고 펼친다, 글은 글로 */
      assert.match(await fe2.locator('.fr').innerText(), /^옷 자유\s+Outfit: a loose oversized.*…\s*펼치기$/s);
      assert.doesNotMatch(await fe2.locator('.fr').innerText(), /canvas tote bag/);
      await fe2.locator('summary').click();
      assert.match(await fe2.locator('.fr').innerText(), /a <b>thin<\/b> silver chain necklace and a canvas tote bag/, '펼치면 전부 — 글 그대로');
      assert.equal(await fe2.locator('.fr b').count(), 0, '지시문 글은 태그로 안 읽는다');
      assert.match(await p.locator('#cuts tbody tr').nth(2).locator('.fr').innerText(), /장면 자유\s+Outfit: a red raincoat$/);
      assert.equal((await p.locator('#cuts tbody tr').nth(3).locator('.fr').innerText()).trim(), '갈래 자유', 'Outfit 줄이 없으면 갈래만');
      assert.match(await p.locator('#stats').textContent(), /필수 갈래 1.*나라 안1.*코스프레 컷이 없다/s);
      await p.click('#filter [data-f="free"]'); assert.equal(await p.locator('#cuts tbody tr').count(), 3, '자유 설계만');
      await p.click('#filter [data-f="cosplay"]'); assert.match(await p.locator('#cuts tbody').textContent(), /이 거르기에 맞는 컷이 없다/);
      /* 삼국지 — 요약 · 코스프레 칸 · GPT 고름 */
      await p.click('[data-a="sam"]');
      assert.match(p.url(), /a=sam/); assert.match(p.url(), /f=cosplay/);
      assert.equal(await p.locator('#cuts tbody tr').count(), 4, '코스프레만');
      const st = await p.locator('#stats').textContent();
      assert.match(st, /필수 갈래 4.*게임 코스프레2.*노출 갈래\(수영복\)1.*캐릭터만의 컷1/s);
      assert.match(st, /코스프레 게임 4 · GPT 고름 1.*원신3 75%.*창세기전1 25%/s, '게임별 장수 · 비율');
      assert.match(st, /캐릭터 3.*Raiden Shogun 원신2.*이올린 창세기전1.*Hu Tao 원신1/s, '캐릭터별');
      assert.doesNotMatch(st, /여|남/, '성별은 없다');
      const yb = p.locator('#cuts tbody tr', { hasText: 'Hu Tao' });
      assert.match(await yb.locator('.cs').innerText(), /원신 · Hu Tao · 포즈\s*GPT 고름/);
      assert.equal(await p.locator('#cuts tbody .gpt').count(), 1, 'GPT 고름은 by gpt 만');
      assert.match(await p.locator('#cuts tbody tr', { hasText: '이올린' }).textContent(), /관우.*중세 판타지.*4.*게임 코스프레.*창세기전 · 이올린 · 웃는 얼굴/);
      await p.click('#filter [data-f="required"]'); assert.equal(await p.locator('#cuts tbody tr').count(), 4, '필수만');
      assert.match(await p.locator('#cuts tbody tr').first().textContent(), /조조.*삼국시대.*노출 갈래\(수영복\).*수영복 · 비키니 · 남색/);
      assert.match(await p.locator('#cuts tbody tr').last().textContent(), /유비.*메카.*90.*캐릭터만의 컷/);
      /* 없는 공방 */
      await p.click('[data-a="pkm"]');
      assert.match(await p.locator('#count').textContent(), /포켓몬 연구소 — 색인이 아직 없다/);
      assert(await p.locator('#cuts-wrap').isHidden(), '없는 공방은 표를 숨긴다'); assert.equal(await p.locator('#stats').innerHTML(), '');
      /* 새로 고쳐도 주소대로 */
      await p.click('[data-a="sam"]'); await p.reload(); await p.waitForSelector('#cuts tbody tr');
      assert.equal(await p.locator('[data-a="sam"]').getAttribute('aria-pressed'), 'true'); assert.equal(await p.locator('#filter [data-f="required"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await p.locator('#cuts tbody tr').count(), 4);
      /* 옆으로 — 페이지는 안 넘치고 표는 표 안에서 */
      await p.click('#filter [data-f="all"]');
      assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), vp.width + ' 옆으로 넘치지 않는다');
      if (vp.width < 600) assert(await p.evaluate(() => { const w = document.querySelector('#cuts-wrap'); return w.scrollWidth > w.clientWidth; }), '폰에서 표는 표 안에서 민다');
      assert.deepEqual(imgs, [], '그림을 받지 않는다');
      assert.deepEqual(errors, []); checks += 14; await ctx.close();
    }
    /* 색인이 하나도 없으면 셋 다 「아직 없다」, 주소 없이 열면 색인이 있는 첫 공방으로 */
    const ctx = await br.newContext(); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    const p = await ctx.newPage();
    await ctx.route('**/element-atelier/data/casual-index.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"oops":1}' }));
    await p.goto(BASE + '/casual.html'); await p.waitForFunction(() => !/읽는 중/.test(document.querySelector('#sum tbody').textContent));
    assert.match(await p.locator('#sum tbody').textContent(), /원소의 섬색인이 아직 없다/, '꼴이 다르면 「아직 없다」');
    await p.waitForFunction(() => document.querySelector('[data-a="sam"]').getAttribute('aria-pressed') === 'true');
    assert.equal(await p.locator('#cuts tbody tr').count(), 6, '색인이 있는 삼국지로');
    /* 그림 현황에서 들어가는 고리 */
    await p.goto(BASE + '/status.html'); await p.click('#casual-link'); await p.waitForURL(/casual\.html/);
    await ctx.close(); checks += 3;
  } finally { await br.close(); server.close(); }
  console.log('PASS 일상컷 목록: 셈(요약 · 거르기 · 칸 글) · 위 표 · 없는 공방 · 요약 · 표 칸 · GPT 고름 · 펼치기 · 거르기 · 주소 · 그림 안 받음 · 폰·PC — ' + checks + '가지');
})().catch(e => { console.error(e); server.close(); process.exit(1); });
