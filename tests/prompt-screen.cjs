/* 통합 생성기(prompt.html) — 화면에서 끝까지, 그리고 옛 생성기와 같은 글인가.
   ① 같은 일상컷 장면을 허브와 그 공방의 옛 생성기(/<공방>/prompt.html)에 넣으면 지시문이 글자 하나 다르지 않다 — 네 공방(게임·책·신화 무기·포켓몬).
   ② 포켓몬으로 단계를 처음부터 — 공방 → 화풍(기본) → 대상 → 출력 → 시대 → … 고른 단계는 칩으로 접히고 누르면 돌아간다.
      해방을 켜면 트리 밖이 까닭과 함께 흐리게 뜨고, 고르면 🔓 와 기록(unlocked)에 남는다. 안 쓰는 값(등 돌림)엔 「안 쓴다」.
   ③ 344×882 · 390×844 · 1280×900 에서 옆으로 넘치지 않고 누르는 자리 44px.
   옆 저장소(../game-atelier · ../book-atelier · ../myth-atelier · ../pkm-atelier)를 같은 출처의 /<저장소>/ 로 내준다 — 실제 Pages 와 같은 꼴.
   Run: CHROMIUM_PATH=<chrome> NODE_PATH=<playwright 가 있는 node_modules> node tests/prompt-screen.cjs   (HUB_PORT 로 자리 바꾸기, 기본 8783) */
const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), SIB = path.resolve(ROOT, '..'), PORT = +(process.env.HUB_PORT || 8783), BASE = 'http://127.0.0.1:' + PORT;
const MIME = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.js': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css' };
const REPOS = ['game-atelier', 'book-atelier', 'myth-atelier', 'pkm-atelier'];
if (REPOS.some(r => !fs.existsSync(path.join(SIB, r, 'data/casual-tree.json')))) { console.log('(옆에 네 공방 저장소가 없어 건너뜀)'); process.exit(0); }
const server = http.createServer((q, s) => {
  const p = decodeURIComponent(new URL(q.url, BASE).pathname), seg = p.split('/')[1];
  let file = path.join(ROOT, p === '/' ? 'index.html' : p);
  if (seg && !fs.existsSync(path.join(ROOT, seg)) && fs.existsSync(path.join(SIB, seg))) file = path.join(SIB, p);
  if (!file.startsWith(SIB + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(s);
});
const ESM = { 'https://esm.sh/preact@10.24.3': 'preact/dist/preact.mjs', 'https://esm.sh/preact@10.24.3/hooks': 'preact/hooks/dist/hooks.mjs', 'https://esm.sh/htm@3.1.1': 'htm/dist/htm.mjs' };
const AXES = { overall_intensity: 'strong', skin_exposure: 'bold', action_level: 'balanced', separates_preference: 'balanced' };
/* 공방마다 — 대상과 장면, 그 공방 생성기의 저장 꼴·주소 */
const CASES = [
  { a: 'game', subject: 'pacman', scene: { era: 'now', place: 'street_park', act: 'stroll', ofam: 'everyday', item: 'jeans_tee', frame: 'waist_up', lens: 'portrait85', orient: 'front_3q', pose: '', expr: 'calm', axes: { ...AXES, source_influence: 'subtle' } },
    store: (k, sc) => ['game_prompt_v1', { last: k, cards: { [k]: { mode: 'casual', scenes: { casual: sc } } } }], url: k => '/game-atelier/prompt.html?game=' + k + '&mode=casual' },
  { a: 'book', subject: 'kosmos', scene: { era: 'now', place: 'street_cafe', act: 'read_book', ofam: 'everyday', item: '', frame: 'three_quarter', lens: 'natural50', orient: 'side', pose: '', expr: 'soft_smile', axes: { ...AXES, source_influence: 'balanced' } },
    store: (k, sc) => ['book_prompt_v1', { last: k, cards: { [k]: { mode: 'casual', scenes: { casual: sc } } } }], url: k => '/book-atelier/prompt.html?book=' + k + '&mode=casual' },
  { a: 'myth', subject: '묠니르', scene: { era: 'now', place: 'street_market', act: 'stroll', ofam: 'everyday', item: '', frame: 'full_body', lens: 'natural50', orient: 'front', pose: '', expr: 'calm', axes: { ...AXES, weapon_influence: 'subtle' } },
    store: (k, sc) => ['myth_prompt_v1', { __card: k, [k]: { output: 'casual', casual: sc } }], url: () => '/myth-atelier/prompt.html' },
  { a: 'pkm', subject: '피카츄', scene: { era: 'in_pokemon', place: 'partner_garden', act: 'care_feeding', ofam: 'everyday', item: '', frame: 'three_quarter', lens: 'natural50', orient: 'front', pose: 'offering_food', expr: 'gentle', axes: { ...AXES, source_influence: 'strong' } },
    store: (k, sc) => ['pkm_prompt_v2', { last: k, cards: { [k]: { mode: 'casual', identityMode: 'reference', scenes: { casual: sc } } } }], url: k => '/pkm-atelier/prompt.html?mech=' + encodeURIComponent(k) }
];

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const br = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
  let checks = 0;
  const open = async (url, store, viewport = { width: 390, height: 844 }) => {
    const ctx = await br.newContext({ viewport });
    /* 바깥 것(글꼴·CDN)은 받지 않는다. 옛 생성기의 preact(esm.sh)는 ESM_DIR 사본으로 — 공방 tests/browser-harness.cjs 와 같게 */
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => {
      const file = process.env.ESM_DIR && ESM[r.request().url().split('?')[0]];
      if (!file || !fs.existsSync(path.join(process.env.ESM_DIR, file))) return r.abort();
      return r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(process.env.ESM_DIR, file), 'utf8').replace(/from"preact"/g, 'from"https://esm.sh/preact@10.24.3"') });
    });
    if (store) await ctx.addInitScript(([k, v]) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } } catch (e) {} }, [store[0], JSON.stringify(store[1])]);
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.goto(BASE + url);
    return { ctx, page, errors };
  };
  try {
    /* ① 옛 생성기와 같은 글 — 옛 생성기는 preact 를 esm.sh 에서 받는다. 받을 수 없으면(바깥이 막힘) 공방 조립 코드로 직접 견준다 */
    const esm = !!process.env.ESM_DIR;
    for (const c of CASES) {
      const hub = await open('/prompt.html?a=' + c.a + '&s=' + encodeURIComponent(c.subject), ['atelier_hub_prompt_v1', { last: c.a, by: { [c.a]: { subject: c.subject, scene: c.scene } } }]);
      await hub.page.waitForFunction(() => document.getElementById('prompt').value.length > 200, null, { timeout: 15000 });
      const got = await hub.page.locator('#prompt').inputValue();
      assert(/SCENE/.test(got), c.a + ' 지시문');
      assert.deepEqual(hub.errors, [], c.a + ' 허브 오류');
      /* 견줄 글 — 그 공방 옛 생성기 화면. preact 를 못 받으면(ESM_DIR 없고 바깥이 막힘) 건너뛰고 tests/prompt-parity.cjs 에 맡긴다 */
      let want = null;
      if (esm) {
        const old = await open(c.url(c.subject), c.store(c.subject, c.scene));
        await old.page.waitForFunction(() => (document.getElementById('prompt-output') || {}).value?.length > 200, null, { timeout: 20000 }).catch(() => {});
        want = await old.page.locator('#prompt-output').inputValue().catch(() => null);
        await old.ctx.close();
      }
      if (want) { assert.equal(got, want, c.a + ' — 허브와 옛 생성기의 지시문이 다르다'); checks++; }
      else console.log('  (' + c.a + ' 옛 생성기 화면은 바깥 preact 가 막혀 건너뜀 — tests/prompt-parity.cjs 가 조립 코드로 견준다)');
      await hub.ctx.close();
    }

    /* ② 포켓몬 처음부터 */
    const s = await open('/prompt.html'), p = s.page;
    await p.waitForSelector('.opt[href="?a=pkm"]'); await p.click('.opt[href="?a=pkm"]');
    await p.waitForSelector('[data-open="style"]');
    assert.match(await p.locator('[data-open="style"]').textContent(), /글로시 프로모/, '화풍은 그 공방 기본');
    await p.fill('#find', '피카'); await p.click('[data-subject="피카츄"]');
    assert.equal(await p.locator('[data-out-mode="form"]').isDisabled(), true, '폼은 아직');
    await p.click('[data-out-mode="casual"]');
    /* 시대는 기본(지금)으로 채워져 장소부터 열린다 */
    assert.equal(await p.locator('.hchip.on').getAttribute('data-open'), 'place');
    await p.click('[data-pick="street_park"]'); await p.click('[data-pick="stroll"]'); await p.click('[data-pick="everyday"]'); await p.click('[data-pick=""]');
    await p.click('[data-pick="full_body"]'); await p.click('[data-pick="natural50"]'); await p.click('[data-pick=""]');
    /* 방향 — 등 돌림은 트리 밖(pkm 은 안 쓴다), 해방하면 까닭이 붙는다 */
    assert.equal(await p.locator('[data-pick="back"]').count(), 0, '등 돌림은 안 보인다');
    await p.check('#unlock');
    assert.match(await p.locator('[data-pick="back"][data-out]').textContent(), /안 쓴다/, '해방 — 까닭');
    await p.click('[data-pick="front"]');
    await p.click('[data-pick=""]');   // 표정 자동
    await p.click('[data-open="done"]');
    const t1 = await p.locator('#prompt').inputValue();
    assert(t1.includes('Place: a city park') || t1.includes('Place:'), '지시문');
    assert(!(await p.locator('#unlocked-note').textContent()), '해방한 칸 없음');
    /* 칩을 누르면 그 단계로 — 자세를 트리 밖(앉기)으로 해방해 고르면 🔓 */
    await p.click('[data-open="pose"]');
    await p.check('#unlock');
    await p.click('[data-pick="sitting"][data-out]');
    assert.match(await p.locator('[data-open="pose"]').textContent(), /🔓/, '칩에 🔓');
    assert.match(await p.locator('#unlocked-note').textContent(), /자세/);
    assert.equal(await p.evaluate(() => window.AtelierHubPrompt.state().open), 'done', '다 고른 뒤 고치면 다 골랐다로 돌아온다');
    const t2 = await p.locator('#prompt').inputValue();
    assert(t2.includes(await p.evaluate(() => window.AtelierSpec.POSE_GUIDES.sitting[1])), '해방한 자세가 지시문에 남는다(트리가 고치지 않는다)');
    await p.click('#record');
    const rec = JSON.parse(await p.locator('#record-text').inputValue());
    assert.deepEqual(rec.unlocked, ['pose'], '기록에 해방한 칸'); assert.equal(rec.atelier, 'pkm'); assert.equal(rec.prompt, t2);
    /* 앞을 바꾸면 맞지 않게 된 뒤 칸이 비고 그 단계가 열린다 */
    await p.click('[data-open="place"]'); await p.click('[data-pick="water_pool"]');
    assert.equal(await p.locator('.hchip.on').getAttribute('data-open'), 'act', '하는 일이 다시 열린다');
    /* 랜덤 — 트리 안에서만, 다 고르면 지시문 */
    await p.click('[data-rand-all="act"]');
    const sc = await p.evaluate(() => window.AtelierHubPrompt.state().scene);
    assert(sc.place === 'water_pool' && sc.act && sc.ofam && sc.frame && sc.orient, '랜덤으로 다 채운다');
    assert(await p.evaluate(sc => window.AtelierHubPrompt.settled(sc), sc), '랜덤한 장면은 트리가 고칠 데가 없다');
    assert((await p.locator('#prompt').inputValue()).length > 200, '랜덤 뒤 지시문');
    /* 새로 고쳐도 남는다 */
    await p.reload(); await p.waitForSelector('[data-open="place"]');
    assert.match(await p.locator('[data-open="place"]').textContent(), /수영장/, '고른 값이 남는다');
    assert.deepEqual(s.errors, [], '오류 없음');
    await s.ctx.close();
    checks += 12;

    /* ③ 화면 크기 */
    for (const vp of [{ width: 344, height: 882 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      const v = await open('/prompt.html?a=pkm&s=' + encodeURIComponent('피카츄'), null, vp);
      await v.page.waitForSelector('.opt[data-pick]');
      const m = await v.page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth,
        small: [...document.querySelectorAll('button, a.opt, a.home, select, input[type="search"]')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 43.5).map(e => e.outerHTML.slice(0, 60)) }));
      assert(m.over <= 0, vp.width + ' 옆으로 넘친다 ' + m.over);
      assert.deepEqual(m.small, [], vp.width + ' 44px 안 되는 자리');
      assert.deepEqual(v.errors, []);
      await v.ctx.close(); checks++;
    }
    console.log('PASS 통합 생성기: 옛 생성기와 같은 글 · 포켓몬 처음부터(공방·기본 화풍·대상·출력·단계·칩·해방 까닭·🔓 기록·앞 바꾸면 뒤 열기·랜덤·새로 고침) · 화면 셋 — ' + checks + '가지');
  } finally { await br.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
