/* 통합 생성기(prompt.html) — 화면에서 끝까지, 그리고 옛 생성기와 같은 글인가.
   ① 같은 일상컷 장면을 허브와 그 공방의 옛 생성기(/<공방>/prompt.html)에 넣으면 지시문이 글자 하나 다르지 않다 — 네 공방(게임·책·신화 무기·포켓몬).
   ② 포켓몬으로 단계를 처음부터 — 공방 → 화풍(기본) → 대상 → 출력 → 시대 → … 고른 단계는 칩으로 접히고 누르면 돌아간다.
      해방을 켜면 트리 밖이 까닭과 함께 흐리게 뜨고, 고르면 🔓 와 기록(unlocked)에 남는다. 안 쓰는 값(등 돌림)엔 「안 쓴다」.
   ③ 344×882 · 390×844 · 1280×900 에서 옆으로 넘치지 않고 누르는 자리 44px. 폰(≤768)은 칩 레일 한 줄·아래 고정 막대(이전·해방·랜덤·다음)·판 밑 단추 없음, PC 는 판 밑 단추(docs/PROMPT_MOBILE_PLAN.md ①).
   옆 저장소(../game-atelier · ../book-atelier · ../myth-atelier · ../pkm-atelier)를 같은 출처의 /<저장소>/ 로 내준다 — 실제 Pages 와 같은 꼴.
   Run: CHROMIUM_PATH=<chrome> NODE_PATH=<playwright 가 있는 node_modules> node tests/prompt-screen.cjs   (HUB_PORT 로 자리 바꾸기, 기본 8783) */
const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), SIB = path.resolve(ROOT, '..'), PORT = +(process.env.HUB_PORT || 8783), BASE = 'http://127.0.0.1:' + PORT;
const MIME = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.js': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css' };
const REPOS = ['game-atelier', 'book-atelier', 'myth-atelier', 'pkm-atelier', 'element-atelier'];
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
/* 폼 초상·개방(2단계) — 옛 생성기 저장값의 카드 꼴 그대로 넣는다 */
const FORM_CASES = [
  { a: 'game', subject: 'pacman', mode: 'form', card: { form: 'middle', identityMode: 'create', baseForm: 'title', exposure: 'moderate', motifs: '네온 단추', lookNote: '망토 자락을 더 길게', faceDesignOn: true, silhouetteOn: false,
    params: { 'apparent age': '30s', 'body type': 'athletic', hairstyle: 'bob', 'eye color': 'crimson' },
    scenes: { form: { expr: 'focused', pose: 'low_guard', orient: 'front_3q', frame: 'full_body', lens: 'natural50', aspect: '3:2', camera: '눈높이', scene: '', outfit: '', custom: '', action: { category: 'melee', example: 'melee_counter', timing: 'windup', power: 'subtle' } } } } },
  { a: 'game', subject: 'pacman', mode: 'form', card: { form: 'ending', identityMode: 'reference', baseForm: 'title', exposure: 'bold', motifs: '', lookNote: '', scenes: { form: { expr: 'soft_smile', pose: '', orient: 'side', frame: 'three_quarter', lens: '', aspect: '2:3' } } } },
  { a: 'book', subject: 'kosmos', mode: 'form', card: { form: 'begin', identityMode: 'create', exposure: '', faceDesignOn: false, params: { 'skin tone': 'pale' }, scenes: { form: { expr: 'calm', action: { category: 'ready', example: 'ready_guard' } } } } },
  { a: 'book', subject: 'kosmos', mode: 'open', card: { form: 'end', lookNote: '빛줄기가 둘레로 쏟아진다', scenes: { open: { custom: '바람이 세다' } } } },
  /* 신화 무기(3단계) — 무기마다 카드 하나, 갈래끼리 같이 쓴다 */
  { a: 'myth', subject: '티르핑', mode: 'portrait', card: { design: 'cloth', extras: { myth: true, silhouette: true }, action: 'draw', scene: 'stormy cliff at dusk',
    params: { age: '30s', hairColor: '__custom__', hairColor_custom: 'ash pink', body: 'athletic' } } },
  { a: 'myth', subject: '티르핑', mode: 'awaken', card: { scene: 'thunder', params: { age: '30s' } } },
  { a: 'myth', subject: '묠니르', mode: 'cursed', card: {} },
  { a: 'myth', subject: '티르핑', mode: 'skin', card: { skin: 'frost', skinState: 'cursed', scene: 'snowfield' } },
  /* 포켓몬(4단계) — 액션(경장·중장·고기동) · 개방(폭주 + 기준 장갑). 원작 외형·종별 얼굴 자료까지 실린다 */
  { a: 'pkm', subject: '피카츄', mode: 'action', card: { form: 'heavy', identityMode: 'create', headFeature: 'ornament', faceDesignOn: true, formOverride: '왼쪽 어깨 패널만 개방', params: { 'apparent age': '30s', hairstyle: 'bob' },
    scenes: { action: { expr: 'focused', pose: 'low_guard', orient: 'front_3q', frame: 'full_body', lens: 'natural50', aspect: '3:2', scene: '번개 치는 언덕', action: { category: 'melee', example: 'melee_counter' } } } } },
  { a: 'pkm', subject: '이상해씨', mode: 'action', card: { form: 'mobility', identityMode: 'reference', motifs: '잎 망토', faceDesignOn: false, scenes: { action: { expr: 'calm', frame: 'three_quarter' } } } },
  { a: 'pkm', subject: '피카츄', mode: 'open', card: { form: 'light', baseForm: 'heavy', formOverride: '가슴판만', scenes: { action: { custom: '번개가 둘레로' } } } },
  { a: 'pkm', subject: '뮤츠', mode: 'open', card: { baseForm: 'reference' } }
];
/* 옛 생성기 — 저장 열쇠·꼴·주소 */
const OLD = {
  game: (c) => ['/game-atelier/prompt.html?game=' + c.subject + '&mode=' + c.mode, ['game_prompt_v1', { last: c.subject, cards: { [c.subject]: { ...c.card, mode: c.mode } } }]],
  book: (c) => ['/book-atelier/prompt.html?book=' + c.subject + '&mode=' + c.mode, ['book_prompt_v1', { last: c.subject, cards: { [c.subject]: { ...c.card, mode: c.mode } } }]],
  myth: (c, style) => ['/myth-atelier/prompt.html', ['myth_prompt_v1', { __card: c.subject, [c.subject]: { ...c.card, output: c.mode, style } }]],
  /* 옛 pkm 생성기는 액션 한 갈래 — 개방은 폼 「폭주」 */
  pkm: (c) => ['/pkm-atelier/prompt.html?mech=' + encodeURIComponent(c.subject), ['pkm_prompt_v2', { last: c.subject, cards: { [c.subject]: { ...c.card, mode: 'action', ...(c.mode === 'open' ? { form: 'overdrive' } : {}) } } }]]
};

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const br = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
  let checks = 0;
  const toDone = async (pg) => { if (await pg.locator('#panel [data-open="done"]').count()) return pg.click('#panel [data-open="done"]'); const m = pg.locator('[data-menu="rand"]'); if (await m.count()) await m.click(); await pg.click('#hbar [data-open="done"]'); };   // 「다 골랐다로」 — PC 는 판 밑, 폰은 🎲 메뉴 안
  const innerHeightOf = vp => vp.height;
  /* 기록 JSON — PC 는 #out 속 단추, 폰은 아래 막대 → 바닥 판(시트) */
  const readRecord = async (pg) => {
    const mob = await pg.locator('#hbar').isVisible();
    if (mob) {   // 다 골랐으면 막대에 「기록 JSON」, 단계 중엔 「지시문 n」 시트 안에
      if (await pg.locator('#hbar [data-act="record"]').isVisible()) await pg.click('#hbar [data-act="record"]');
      else { await pg.click('#hbar [data-act="sheet"]'); await pg.click('#hsheet [data-act="record"]'); }
      const v = await pg.locator('#hsheet textarea').inputValue(); await pg.click('#hsheet [data-act="sheet-close"]'); return JSON.parse(v);
    }
    await pg.click('#record'); return JSON.parse(await pg.locator('#record-text').inputValue());
  };
  const randAll = async (pg, k) => { const m = pg.locator('[data-menu="rand"]'); if (await m.count()) await m.click(); await pg.click('[data-rand-all="' + k + '"]'); };   // 폰(≤768)에선 🎲 메뉴를 먼저 연다
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

    /* ①-2 폼 초상·개방 — 허브 = 옛 생성기 */
    for (const c of FORM_CASES) {
      const hub = await open('/prompt.html?a=' + c.a + '&s=' + encodeURIComponent(c.subject) + '&o=' + c.mode, ['atelier_hub_prompt_v1', { last: c.a, by: { [c.a]: { subject: c.subject, out: c.mode, cards: { [c.subject]: c.card } } } }]);
      await hub.page.waitForFunction(() => document.getElementById('prompt').value.length > 200, null, { timeout: 15000 });
      const got = await hub.page.locator('#prompt').inputValue();
      assert.deepEqual(hub.errors, [], c.a + ' ' + c.mode + ' 허브 오류');
      if (c.card.motifs) assert(got.includes(c.card.motifs), '모티프가 지시문에');
      await hub.ctx.close();
      if (!esm) continue;
      const [url, store] = OLD[c.a](c, 'game_keyart');
      if (c.a === 'pkm') store[1].cards[c.subject].style = 'glossy_promo';
      const old = await open(url, store);
      await old.page.waitForFunction(() => (document.getElementById('prompt-output') || {}).value?.length > 200, null, { timeout: 20000 });
      assert.equal(got, await old.page.locator('#prompt-output').inputValue(), c.a + ' ' + c.mode + ' ' + c.card.form + ' — 허브와 옛 생성기의 지시문이 다르다');
      await old.ctx.close(); checks++;
    }

    /* ② 포켓몬 처음부터 */
    const s = await open('/prompt.html'), p = s.page;
    await p.waitForSelector('.opt[href="?a=pkm"]'); await p.click('.opt[href="?a=pkm"]');
    await p.waitForSelector('[data-open="style"]');
    assert.match(await p.locator('[data-open="style"]').textContent(), /글로시 프로모/, '화풍은 그 공방 기본');
    /* 대상은 다 있고 페이지 스크롤로 끝까지 — 안에 따로 스크롤하는 상자가 없다(앞 120 만 그려 못 내려갔다) */
    assert.equal(await p.locator('[data-subject]').count(), 1025, '포켓몬 1025 다');
    assert(await p.evaluate(() => { const e = document.querySelector('.opts.people'); return e.scrollHeight <= e.clientHeight + 1 && getComputedStyle(e).overflowY === 'visible'; }), '대상 목록 안 스크롤 상자 없음');
    /* 첫 글자 거르개(폰) — 칩은 전체·ㄱㄴㄷ 차례, 누르면 그 글자로 시작하는 이름만(2026-10-29 사용자 「순서도 안 맞고 이동도 안 한다」 → 건너뛰기에서 거르개로) */
    if (await p.locator('.gtabs.ini').count()) {
      const order = await p.locator('.gtabs.ini .gtab').allTextContents();
      assert.equal(order[0], '전체'); const ko = order.slice(1).filter(c => /^[ㄱ-ㅎ]$/.test(c)); assert.deepEqual(ko, ko.slice().sort((a, b) => 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'.indexOf(a) - 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'.indexOf(b)), '칩이 가나다 차례 ' + order.join(''));
      await p.click('.gtabs.ini [data-ini="ㅍ"]');
      const ini = await p.evaluate(() => [...document.querySelectorAll('#subjects .opts.people:last-of-type .opt')].map(e => e.dataset.initial));
      assert(ini.length > 0 && ini.every(i => i === 'ㅍ'), 'ㅍ 으로 시작하는 이름만 ' + ini.length);
      assert.equal(await p.locator('.gtabs.ini .gtab.on').textContent(), 'ㅍ');
      await p.click('.gtabs.ini [data-ini=""]');
      assert.equal(await p.locator('#subjects .opts.people:last-of-type .opt').count(), 1025, '전체로 돌아온다');
    }
    await p.locator('[data-subject]').last().scrollIntoViewIfNeeded();
    assert(await p.evaluate(() => { const r = document.querySelector('[data-subject]:last-child').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; }), '마지막 대상까지 내려간다');
    await p.locator('[data-subject]').last().click();
    assert(await p.evaluate(() => document.getElementById('panel').getBoundingClientRect().top >= 0), '끝에서 고르면 다음 단계가 보이게 올라간다');
    await p.click('[data-open="subject"]');
    await p.fill('#find', '피카'); await p.click('[data-subject="피카츄"]');
    assert.equal(await p.locator('[data-out-mode="action"]').isDisabled(), false, '포켓몬 액션도 연다');
    await p.click('[data-out-mode="casual"]');
    /* 시대부터 연다 — 기본(지금)이 눌려 있고, 건너뛰지 않는다 */
    assert.equal(await p.locator('.hchip.on').getAttribute('data-open'), 'era', '시대부터');
    assert.equal(await p.locator('[data-pick="now"]').getAttribute('aria-pressed'), 'true', '지금이 기본');
    assert.equal(await p.locator('.opt[data-pick]:not([data-out])').count(), 4, '시대 넷');
    await p.click('[data-pick="now"]');
    assert.equal(await p.locator('.hchip.on').getAttribute('data-open'), 'place');
    await p.click('[data-pick="street_park"]'); await p.click('[data-pick="stroll"]'); await p.click('[data-pick="everyday"]'); await p.click('[data-pick=""]');
    await p.click('[data-pick="full_body"]'); await p.click('[data-pick="natural50"]'); await p.click('[data-pick=""]');
    /* 방향 — 등 돌림은 트리 밖(pkm 은 안 쓴다), 해방하면 까닭이 붙는다 */
    assert.equal(await p.locator('[data-pick="back"]').count(), 0, '등 돌림은 안 보인다');
    await p.check('#unlock');
    assert.match(await p.locator('[data-pick="back"][data-out]').textContent(), /안 쓴다/, '해방 — 까닭');
    await p.click('[data-pick="front"]');
    await p.click('[data-pick=""]');   // 표정 자동
    await p.click('[data-next="axes"]'); assert.equal(await p.evaluate(() => window.AtelierHubPrompt.state().open), 'notes', '세부 강도 뒤 덧붙임');
    await p.click('[data-next="notes"]');
    const t1 = await p.locator('#prompt').inputValue();
    assert(t1.includes('Place: a city park') || t1.includes('Place:'), '지시문');
    assert(!(await p.locator('#unlocked-note').textContent()), '해방한 칸 없음');
    /* 칩을 누르면 그 단계로 — 자세를 트리 밖(앉기)으로 해방해 고르면 🔓 */
    await p.click('[data-open="pose"]');
    await p.check('#unlock');
    await p.click('[data-pick="sitting"][data-out]');
    assert.match(await p.locator('[data-open="pose"]').textContent(), /🔓/, '칩에 🔓');
    assert.match(await p.locator('#unlocked-note').textContent(), /자세/);
    /* 다 고른 뒤 고쳐도 건너뛰지 않는다 — 바로 다음 칸(방향). 남은 단계는 「다 골랐다로」 로 건너뛴다(2026-10-29 사용자 「다다음 칸으로 건너뛰어지는게 많네」) */
    assert.equal(await p.evaluate(() => window.AtelierHubPrompt.state().open), 'orient', '고친 뒤엔 바로 다음 칸');
    await toDone(p);
    assert.equal(await p.evaluate(() => window.AtelierHubPrompt.state().open), 'done', '「다 골랐다로」 로 남은 단계를 건너뛴다');
    const t2 = await p.locator('#prompt').inputValue();
    assert(t2.includes(await p.evaluate(() => window.AtelierSpec.POSE_GUIDES.sitting[1])), '해방한 자세가 지시문에 남는다(트리가 고치지 않는다)');
    const rec = await readRecord(p);
    assert.deepEqual(rec.unlocked, ['pose'], '기록에 해방한 칸'); assert.equal(rec.atelier, 'pkm'); assert.equal(rec.prompt, t2);
    /* 앞을 바꾸면 맞지 않게 된 뒤 칸이 비고 그 단계가 열린다 */
    await p.click('[data-open="place"]'); await p.click('[data-pick="water_pool"]');
    assert.equal(await p.locator('.hchip.on').getAttribute('data-open'), 'act', '하는 일이 다시 열린다');
    /* 그 뒤로도 한 칸씩 — 하는 일 → 의상 계열 → 옷 → 프레이밍 … (건너뛰지 않는다) */
    const walk = [];
    for (let i = 0; i < 4; i++) { await p.locator('#panel .opt[data-pick]:not([data-out])').first().click(); walk.push(await p.evaluate(() => window.AtelierHubPrompt.state().open)); }
    assert.deepEqual(walk, ['ofam', 'item', 'frame', 'lens'], '고친 뒤 한 칸씩: ' + walk.join(' > '));
    /* 랜덤 — 트리 안에서만, 다 고르면 지시문 */
    await p.click('[data-open="act"]'); await randAll(p, 'act');
    const sc = await p.evaluate(() => window.AtelierHubPrompt.state().scene);
    assert(sc.place === 'water_pool' && sc.act && sc.ofam && sc.frame && sc.orient, '랜덤으로 다 채운다');
    assert(await p.evaluate(sc => window.AtelierHubPrompt.settled(sc), sc), '랜덤한 장면은 트리가 고칠 데가 없다');
    assert((await p.locator('#prompt').inputValue()).length > 200, '랜덤 뒤 지시문');
    /* 여기부터 다시 — 장소를 열고 뒤 칸(하는 일~덧붙임)을 비운다. 앞 칸(시대·장소)은 그대로, 뒤 칸 칩은 다시 숨는다(2026-10-29 사용자) */
    await p.click('[data-open="place"]');
    const rm = p.locator('[data-menu="rand"]'); if (await rm.count()) await rm.click();
    await p.click('[data-restart="place"]');
    const rs = await p.evaluate(() => { const s = window.AtelierHubPrompt.state(); return { open: s.open, act: s.scene.act || '', ofam: s.scene.ofam || '', frame: s.scene.frame || '', lens: s.scene.lens || '', era: s.scene.era || '', place: s.scene.place || '' }; });
    assert.equal(rs.open, 'place', '그 단계에 남는다');
    assert(!rs.act && !rs.ofam && !rs.frame && !rs.lens, '뒤 칸을 비웠다 ' + JSON.stringify(rs));
    assert(rs.era && rs.place === 'water_pool', '앞 칸은 그대로 ' + JSON.stringify(rs));
    assert.equal(await p.locator('.hchip[data-open="frame"]').count(), 0, '뒤 칸 칩은 다시 숨는다');
    assert.match(await p.locator('#status').textContent(), /여기부터 다시/);
    assert.equal(await p.locator('#out').isHidden(), true, '다 안 골랐으니 지시문도 없다');
    /* 다시 채운다 — 하는 일부터 랜덤으로(장소는 그대로 수영장) */
    await p.click('[data-open="place"]'); await p.locator('#panel .opt[data-pick="water_pool"]').click();
    await randAll(p, 'act');
    /* 처음부터 다시 — 다 고른 뒤에도 모든 칸을 비우고 첫 단계(시대)로. 공방·대상·출력은 그대로(2026-10-29 사용자 「다 골랐을 때도 처음 상태로」) */
    assert.equal(await p.evaluate(() => window.AtelierHubPrompt.state().open), 'done');
    await p.click('[data-reset]');
    const ra = await p.evaluate(() => { const s = window.AtelierHubPrompt.state(); return { open: s.open, a: s.a, subject: s.subject, out: s.out, place: s.scene.place || '', act: s.scene.act || '', frame: s.scene.frame || '', un: (s.scene.unlocked || []).length }; });
    assert.equal(ra.open, 'era', '첫 단계로 ' + JSON.stringify(ra));
    assert(!ra.place && !ra.act && !ra.frame && !ra.un, '모든 칸을 비웠다 ' + JSON.stringify(ra));
    assert(ra.a === 'pkm' && ra.subject && ra.out === 'casual', '공방·대상·출력은 그대로');
    assert.equal(await p.locator('.hchip[data-open="place"]').count(), 0, '뒤 칸 칩은 숨는다');
    assert.match(await p.locator('#status').textContent(), /처음부터 다시/);
    assert.equal(await p.locator('#out').isHidden(), true);
    await p.click('[data-pick="now"]'); assert.equal(await p.evaluate(() => window.AtelierHubPrompt.state().open), 'place', '처음처럼 한 칸씩');
    await p.locator('#panel .opt[data-pick="water_pool"]').click(); await randAll(p, 'act');   // 아래 「새로 고쳐도 남는다」가 수영장을 본다
    assert.equal(await p.evaluate(() => window.AtelierHubPrompt.state().open), 'done');
    /* 새로 고쳐도 남는다 */
    await p.reload(); await p.waitForSelector('[data-open="place"]');
    assert.match(await p.locator('[data-open="place"]').textContent(), /수영장/, '고른 값이 남는다');
    assert.deepEqual(s.errors, [], '오류 없음');
    await s.ctx.close();
    checks += 15;

    /* ②-2 게임 폼 초상·개방 단계 — 폼 → 인물 기준(이어가기면 기준 폼까지) → 노출 → 설계 줄 → (새 인물만 외형) → 연출 → … → 덧붙임 */
    {
      const g = await open('/prompt.html?a=game&s=pacman'), p = g.page, now = () => p.evaluate(() => window.AtelierHubPrompt.state().open);
      await p.waitForSelector('[data-open="out"]'); await p.click('[data-open="out"]');
      await p.click('[data-out-mode="form"]');
      assert.equal(await now(), 'form', '폼부터');
      assert.equal(await p.locator('.hchip[data-open="ident"]').count(), 0, '안 온 단계 칩은 없다');
      assert((await p.locator('#prompt').inputValue()).length > 200, '폼은 처음부터 지시문(기본값)');
      await p.click('[data-pick="middle"]'); assert.equal(await now(), 'ident');
      await p.click('[data-pick="reference"]'); assert.equal(await now(), 'ident', '이어가기는 기준 폼을 고른다');
      await p.click('[data-part="1"][data-pick="title"]'); assert.equal(await now(), 'exposure');
      await p.click('[data-pick="low"]'); assert.equal(await now(), 'design');
      assert.equal(await p.locator('input[type="checkbox"][data-part]').count(), 0, '이어가기엔 실루엣·얼굴 줄이 없다');
      await p.fill('[data-field="lookNote"]', '소매를 짧게');
      assert.equal(await p.locator('[data-field="lookNote"]').evaluate(e => e === document.activeElement), true, '쓰는 동안 칸이 그대로');
      assert((await p.locator('#prompt').inputValue()).includes('FORM NOTE: 소매를 짧게'), '폼 요청이 지시문에');
      await p.click('[data-next="design"]'); assert.equal(await now(), 'action', '이어가기는 외형을 건너뛴다');
      await p.selectOption('select[data-sel][data-part="1"]', 'melee');
      assert.equal(await p.locator('select[data-sel]').count(), 2 + (await p.evaluate(() => window.AtelierSpec.ACTION_CONTROLS.length)), '갈래를 고르면 예시가 열린다');
      await randAll(p, 'action'); assert.equal(await now(), 'done');
      const sc = await p.evaluate(() => window.AtelierHubPrompt.state().card.scenes.form);
      assert(sc.action.category && sc.expr && sc.frame && sc.aspect, '연출부터 다 랜덤');
      assert.match(await p.locator('[data-open="ident"]').textContent(), /이어가기 · 타이틀/);
      /* 새 인물로 바꾸면 외형 단계가 생긴다 */
      await p.click('[data-open="ident"]'); await p.click('[data-pick="create"]');
      assert.equal(await p.locator('.hchip[data-open="look"]').count(), 1, '새 인물 — 외형 칩');
      await p.click('[data-open="look"]'); await p.click('[data-grp="hair"] summary'); await p.selectOption('[data-param="hairstyle"]', 'bob');
      assert(await p.locator('[data-grp="hair"]').evaluate(d => d.open), '값을 바꿔도 연 묶음은 열린 채');
      assert((await p.locator('#prompt').inputValue()).includes('hairstyle: bob'), '외형이 지시문에');
      /* 개방 — 개방 장면이 있는 폼만, 기록에 카드 */
      await p.click('[data-open="out"]'); await p.click('[data-out-mode="open"]');
      assert.equal(await now(), 'form');
      assert.match(await p.locator('#prompt').inputValue(), /OPEN/, '개방 지시문');
      const rec = await readRecord(p);
      assert.equal(rec.mode, 'open'); assert.equal(rec.form, 'middle'); assert.equal(rec.card.baseForm, 'title');
      /* 새로 고쳐도 남는다 — 갈래·카드 */
      await p.reload(); await p.waitForSelector('[data-open="out"]');
      assert.equal(await p.evaluate(() => window.AtelierHubPrompt.state().out), 'open');
      assert.equal(await p.evaluate(() => window.AtelierHubPrompt.state().card.params.hairstyle), 'bob');
      assert.deepEqual(g.errors, [], '게임 폼 오류 없음');
      await g.ctx.close(); checks += 8;
      /* 포켓몬 — 액션: 장갑 폼 → 인물 기준 → 원작 특징(입는 법·머리 특징·종별 얼굴) → 외형 → 연출 …, 개방: 기준 장갑 → 폼 요청 → 덧붙임 */
      const k = await open('/prompt.html?a=pkm&s=' + encodeURIComponent('피카츄')), q = k.page, at = () => q.evaluate(() => window.AtelierHubPrompt.state().open);
      await q.waitForSelector('[data-open="out"]'); await q.click('[data-open="out"]');
      assert.equal(await q.locator('[data-out-mode]:not([disabled])').count(), 3, '포켓몬 출력 셋');
      await q.click('[data-out-mode="action"]'); assert.equal(await at(), 'form');
      await q.waitForFunction(() => document.getElementById('prompt').value.length > 200, null, { timeout: 20000 });   // 큰 자료를 받은 뒤
      await q.click('[data-pick="heavy"]'); assert.equal(await at(), 'ident');
      await q.click('[data-pick="create"]'); assert.equal(await at(), 'design');
      assert.match(await q.locator('#panel').textContent(), /lightning|tail/i, '원작 특징 — 자동 입는 법');
      await q.selectOption('select[data-sel]', '__custom__');
      await q.fill('[data-field="headCustom"]', 'yellow ear headband');
      assert((await q.locator('#prompt').inputValue()).includes('yellow ear headband'), '머리 특징 직접 입력이 지시문에');
      await q.click('[data-next="design"]'); assert.equal(await at(), 'look');
      await q.click('[data-next="look"]'); assert.equal(await at(), 'action');
      await randAll(q, 'action'); assert.equal(await at(), 'done');
      assert((await q.evaluate(() => window.AtelierHubPrompt.state().card.scenes.action.action.category)), '연출 랜덤');
      /* 이어가기면 원작 특징·외형 단계가 빠진다 */
      await q.click('[data-open="ident"]'); await q.click('[data-pick="reference"]');
      assert.equal(await q.locator('.hchip[data-open="look"]').count(), 0, '이어가기 — 외형 없음');
      /* 개방 — 기준 장갑, 같은 카드 */
      await q.click('[data-open="out"]'); await q.click('[data-out-mode="open"]'); assert.equal(await at(), 'base');
      await q.click('[data-pick="mobility"]'); assert.equal(await at(), 'design');
      assert.match(await q.locator('#prompt').inputValue(), /OVERDRIVE|overdrive/i, '폭주 지시문');
      assert.equal(await q.evaluate(() => window.AtelierHubPrompt.state().card.form), 'heavy', '개방을 해도 액션 폼은 그대로');
      assert.deepEqual(k.errors, [], '포켓몬 카드 갈래 오류 없음');
      await k.ctx.close(); checks += 6;
    }

    /* ②-5 원소 — 세계 그림: 대상(주민) → 세계(사는 세계만) → 덧붙임 → 지시문. 일상컷은 그 공방 생성기로 가는 문(href) */
    {
      const e = await open('/prompt.html?a=element&s=fe-steel-bridge'), p = e.page, now = () => p.evaluate(() => window.AtelierHubPrompt.state().open);
      await p.waitForSelector('[data-open="out"]'); await p.click('[data-open="out"]');
      assert.equal(await p.locator('[data-out-mode]').count(), 1, '허브 갈래는 세계 그림 하나');
      assert.match(await p.locator('a.opt[href*="element-atelier/prompt.html"]').getAttribute('href'), /card=fe-steel-bridge&o=casual/, '일상컷은 원소 공방 생성기로');
      await p.click('[data-out-mode="world"]'); assert.equal(await now(), 'world');
      assert.equal(await p.locator('#panel .opt[data-pick]').count(), 2, '철교는 판타지에 안 산다 — 세계 둘');
      await p.click('[data-pick="mecha"]'); assert.equal(await now(), 'notes');
      await p.fill('[data-field="scene"]', 'a windy ridge');
      await p.click('[data-next="notes"]'); assert.equal(await now(), 'done');
      const t = await p.locator('#prompt').inputValue();
      assert(t.startsWith('CONCEPT: a citizen of the Iron Nation, of the Steel House.') && t.includes('MECHA DESIGN') && t.includes('SCENE NOTE: a windy ridge'), '원소 세계 지시문');
      assert.match(await p.locator('[data-open="world"]').textContent(), /메카/, '세계 칩');
      await p.reload(); await p.waitForSelector('[data-open="out"]');
      assert.equal(await now(), 'done'); assert.equal(await p.locator('#prompt').inputValue(), t, '새로 고쳐도 남는다');
      assert.deepEqual(e.errors, []);
      await e.ctx.close(); checks += 5;
    }

    /* ②-3 신화 무기 — 액션 한 장(설계 언어·붙일 문단·자세·외형·장면 메모) · 각성 · 스킨(스킨·상태) */
    {
      const m = await open('/prompt.html?a=myth&s=' + encodeURIComponent('티르핑')), p = m.page, now = () => p.evaluate(() => window.AtelierHubPrompt.state().open);
      await p.waitForSelector('[data-open="out"]'); await p.click('[data-open="out"]');
      assert.equal(await p.locator('[data-out-mode]').count(), 5, '출력 다섯(옛 생성기 차례)');
      await p.click('[data-out-mode="portrait"]'); assert.equal(await now(), 'design');
      await p.click('[data-pick="cloth"]'); assert.equal(await now(), 'design', '설계 언어를 골라도 붙일 문단이 남았다');
      await p.locator('input[type="checkbox"][data-part]').nth(2).check();
      await p.click('[data-next="design"]'); assert.equal(await now(), 'posture');
      await p.click('[data-pick="draw"]'); assert.equal(await now(), 'look');
      await p.click('[data-grp="hair"] summary'); await p.selectOption('[data-param="hairColor"]', '__custom__');
      await p.fill('[data-pcustom="hairColor"]', 'ash pink');
      assert((await p.locator('#prompt').inputValue()).includes('ash pink'), '직접 입력이 지시문에');
      await p.click('[data-next="look"]'); assert.equal(await now(), 'notes');
      await p.fill('[data-field="scene"]', 'stormy cliff');
      const t = await p.locator('#prompt').inputValue();
      assert(t.includes('SCENE NOTE: stormy cliff') && t.includes('POSTURE:') && /cloth/.test(t), '초상 지시문');
      await p.click('[data-next="notes"]'); assert.equal(await now(), 'done');
      /* 각성 — 장면 메모만, 같은 카드(메모가 남는다) */
      await p.click('[data-open="out"]'); await p.click('[data-out-mode="awaken"]');
      assert.equal(await p.locator('[data-field="scene"]').inputValue(), 'stormy cliff', '갈래끼리 같은 카드');
      assert(!(await p.locator('#prompt').inputValue()).includes('POSTURE:'), '각성엔 자세가 없다');
      /* 스킨 — 스킨·상태 */
      await p.click('[data-open="out"]'); await p.click('[data-out-mode="skin"]'); assert.equal(await now(), 'skin');
      await p.click('[data-pick="frost"]'); assert.equal(await now(), 'sstate');
      await p.click('[data-pick="cursed"]');
      assert((await p.locator('#prompt').inputValue()).includes('SKIN NOTE'), '스킨 저주 지시문');
      /* 스킨 없는 무기 — 알리고 지시문은 없다 */
      await p.click('[data-open="subject"]'); await p.fill('#find', '묠니르'); await p.click('[data-subject="묠니르"]');
      await p.click('[data-out-mode="skin"]');
      assert.match(await p.locator('#panel').textContent(), /스킨이 없다/); assert.equal(await p.locator('#out').isHidden(), true, '스킨 없는 무기는 지시문 없음');
      assert.deepEqual(m.errors, [], '신화 오류 없음');
      await m.ctx.close(); checks += 6;
    }

    /* ②-4 일상컷 계획기 주소(pkm tools/casual-plan.cjs) — 옛 생성기와 같은 주소 꼴을 허브가 받는다 */
    {
      const CP = require(path.join(SIB, 'pkm-atelier/lib/casual-plan.js'));
      const cut = { era: 'now', place: 'water_pool', act: 'sunbed', ofam: 'swimwear', item: 'classic_bikini', expr: 'confident', pose: '', orient: 'side', frame: 'three_quarter', lens: 'portrait85', aspect: '2:3',
        axes: { overall_intensity: 'strong', skin_exposure: 'bold', action_level: 'mostly posed', source_influence: 'subtle', separates_preference: 'balanced' } };
      const query = CP.generatorQuery('피카츄', cut);
      const g = await open('/prompt.html?a=pkm&' + query), p = g.page;
      await p.waitForFunction(() => document.getElementById('prompt').value.length > 200, null, { timeout: 15000 });
      const st = await p.evaluate(() => { const s = window.AtelierHubPrompt.state(); return { out: s.out, open: s.open, subject: s.subject, scene: s.scene, url: location.search }; });
      assert.equal(st.out, 'casual'); assert.equal(st.subject, '피카츄'); assert.equal(st.open, 'notes', '계획 컷은 덧붙임부터');
      for (const k of ['era', 'place', 'act', 'ofam', 'item', 'orient', 'frame', 'lens', 'expr']) assert.equal(st.scene[k], cut[k], '계획 값 ' + k);
      assert(st.scene.planned.includes('place') && st.scene.planned.includes('pose'), '계획 칸 표시');
      assert(!/casual=|mech=/.test(st.url), '받은 뒤 주소에서 지운다');
      assert.match(await p.locator('#status').textContent(), /계획기 값으로 \d+칸/);
      assert.equal(await p.locator('.hchip[data-open="place"] .lock').count(), 1, '칩에 📌');
      const hubText = await p.locator('#prompt').inputValue();
      if (esm) {
        const old = await open('/pkm-atelier/prompt.html?' + query, null);
        await old.page.waitForFunction(() => (document.getElementById('prompt-output') || {}).value?.length > 200, null, { timeout: 20000 });
        assert.equal(hubText, await old.page.locator('#prompt-output').inputValue(), '계획기 주소 — 허브와 옛 생성기의 지시문이 다르다');
        await old.ctx.close(); checks++;
      }
      /* 덧붙임 — 계획의 옷·장면 첫머리를 쓴다 */
      await p.fill('[data-cfield="outfit"]', 'a white string bikini with a sheer sarong');
      assert((await p.locator('#prompt').inputValue()).includes('Outfit: a white string bikini with a sheer sarong'), '덧붙임 옷이 지시문에');
      await p.click('[data-next="notes"]'); assert.equal(await p.evaluate(() => window.AtelierHubPrompt.state().open), 'done');
      /* 처음부터 다 랜덤 — 계획 칸은 그대로 */
      await randAll(p, 'era');
      const after = await p.evaluate(() => window.AtelierHubPrompt.state().scene);
      for (const k of ['era', 'place', 'act', 'ofam', 'item', 'orient', 'frame', 'lens', 'expr']) assert.equal(after[k], cut[k], '랜덤이 계획 칸을 안 바꾼다 ' + k);
      /* 계획 칸 풀기 → 랜덤이 바꿀 수 있다. 손으로 고친 칸은 계획 표시가 빠진다 */
      await p.click('[data-act="unplan"]');
      assert.equal(await p.locator('.hchip .lock').count(), 0, '계획 칸 풀기');
      /* 새로 고쳐도 계획 값이 남는다(주소에서 지웠으니 다시 덮지 않는다) */
      await p.reload(); await p.waitForSelector('[data-open="place"]');
      assert.equal(await p.evaluate(() => window.AtelierHubPrompt.state().scene.outfit), 'a white string bikini with a sheer sarong');
      assert.deepEqual(g.errors, [], '계획 주소 오류 없음');
      await g.ctx.close();
      /* 트리에 안 맞는 계획 값 — 비우고 알린다(옛 생성기와 같다) */
      const b = await open('/prompt.html?a=pkm&' + CP.generatorQuery('피카츄', { ...cut, act: 'flying', orient: 'back' }));
      await b.page.waitForSelector('[data-open]');
      await b.page.waitForFunction(() => /비운 칸/.test(document.getElementById('status').textContent), null, { timeout: 15000 });
      assert.match(await b.page.locator('#status').textContent(), /act/);
      assert.equal(await b.page.evaluate(() => window.AtelierHubPrompt.state().open), 'act', '비운 칸부터 다시 연다');
      await b.ctx.close(); checks += 9;
      /* 버전2 계획 컷(treeV 2 — pkm 계획기 기본) — 허브 단계는 버전1 칸이라 pkm 생성기로 같은 값을 넘긴다 */
      const v2cut = { treeV: 2, era: 'now', place: 'home_living', ofam: 'everyday', posture: 'stand', support: 'none', frame: 'waist_up', body: 'front', head: 'with_body', camera: 'eye', aspect: '2:3', axes: cut.axes };
      const v2q = CP.generatorQuery('피카츄', v2cut), h = await open('/prompt.html?a=pkm&' + v2q);
      await h.page.waitForURL(/\/pkm-atelier\/prompt\.html\?/, { timeout: 15000 });
      const went = new URL(h.page.url());
      assert.equal(went.searchParams.get('mech'), '피카츄'); assert.equal(JSON.parse(went.searchParams.get('casual')).treeV, 2, '버전2 값 그대로');
      assert.equal(went.searchParams.get('casual'), new URLSearchParams(v2q).get('casual'), '계획기 값 그대로 넘긴다');
      await h.ctx.close(); checks += 3;
    }

    /* ③ 화면 크기 */
    for (const vp of [{ width: 344, height: 882 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      const v = await open('/prompt.html?a=pkm&s=' + encodeURIComponent('피카츄'), null, vp);
      await v.page.waitForSelector('.opt[data-pick]');
      const m = await v.page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth,
        small: [...document.querySelectorAll('button, a.opt, a.home, select, input[type="search"]')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 43.5).map(e => e.outerHTML.slice(0, 60)) }));
      assert(m.over <= 0, vp.width + ' 옆으로 넘친다 ' + m.over);
      assert.deepEqual(m.small, [], vp.width + ' 44px 안 되는 자리');
      const mb = await v.page.evaluate(() => { const rail = (document.querySelector('.hrail') || document.getElementById('chips')).getBoundingClientRect(), hb = document.getElementById('hbar'), r = hb.getBoundingClientRect();
        return { rail: rail.height, bar: !hb.hidden, barIn: !hb.hidden && r.bottom <= innerHeight + 0.5 && r.top > innerHeight / 2, inPanel: document.querySelectorAll('#panel .bar, #panel [data-next], #panel [data-rand]').length, chips: document.querySelectorAll('.hchip').length,
          path: document.querySelectorAll('.hpath .hcrumb').length, lede: getComputedStyle(document.querySelector('.lede')).display, h1: document.querySelector('.head h1').getBoundingClientRect().height }; });
      if (vp.width <= 768) { assert(mb.rail <= 60, vp.width + ' 칩 레일이 한 줄이 아니다 ' + mb.rail); assert(mb.bar && mb.barIn, vp.width + ' 아래 막대가 화면 안에 없다'); assert.equal(mb.inPanel, 0, vp.width + ' 판 밑에 단추가 남아 있다');
        assert.equal(mb.path, 4, vp.width + ' 경로 한 줄(공방·화풍·대상·출력)'); assert.equal(mb.lede, 'none', vp.width + ' 설명 글은 접혀 있다'); assert(mb.h1 < 40, vp.width + ' 제목 한 줄 ' + mb.h1); }
      else { assert(!mb.bar, '1280 에선 아래 막대가 없다'); assert(mb.inPanel > 0, '1280 은 판 밑 단추'); assert.equal(mb.path, 0, '1280 은 칩'); }
      /* 폰 — 다 고르면 지시문이 판 첫 칸(첫 화면 안), #out 은 숨는다. 설명 「?」 */
      if (vp.width <= 768) {
        await v.page.click('[data-menu="rand"]'); await v.page.click('[data-rand-all="era"]'); await v.page.waitForSelector('.hres');
        const dn = await v.page.evaluate(() => ({ top: document.querySelector('.hres').getBoundingClientRect().top, out: getComputedStyle(document.getElementById('out')).display, copy: !!document.querySelector('#hbar [data-act="copy"]'), chipsTop: document.getElementById('chips').getBoundingClientRect().top }));
        assert(dn.top >= 0 && dn.top < innerHeightOf(vp), vp.width + ' 지시문이 첫 화면 안 ' + JSON.stringify(dn)); assert.equal(dn.out, 'none', vp.width + ' #out 숨김'); assert(dn.copy, vp.width + ' 복사 막대');
        await v.page.click('[data-act="more"]'); assert((await v.page.locator('.hres-text').getAttribute('class')).includes('open'), '펼치기');
        await v.page.click('#help'); assert.equal(await v.page.evaluate(() => getComputedStyle(document.querySelector('.lede')).display), 'block', '「?」 로 설명');
      }
      assert.deepEqual(v.errors, []);
      await v.ctx.close(); checks++;
      /* 카드 갈래 외형(긴 고르개) — 게임 폼 · 신화 초상 · 포켓몬 액션, 옆으로 넘치지 않는다 */
      for (const [a, sj, o] of [['game', 'pacman', 'form'], ['myth', '티르핑', 'portrait'], ['pkm', '피카츄', 'action']]) {
        const f = await open('/prompt.html?a=' + a + '&s=' + encodeURIComponent(sj) + '&o=' + o, ['atelier_hub_prompt_v1', { last: a, by: { [a]: { subject: sj, out: o, walked: { [o]: true } } } }], vp);
        await f.page.waitForSelector('[data-open="look"]'); await f.page.click('[data-open="look"]');
        await f.page.evaluate(() => document.querySelectorAll('details.grp').forEach(d => { d.open = true; }));
        const fm = await f.page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, wide: [...document.querySelectorAll('.axis select')].filter(e => e.getBoundingClientRect().right > e.closest('.panel').getBoundingClientRect().right + 0.5).length,
          small: [...document.querySelectorAll('#panel button, #panel select, #panel summary')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 43.5).length }));
        assert(fm.over <= 0 && !fm.wide && !fm.small, vp.width + ' ' + a + ' 외형 고르개 ' + JSON.stringify(fm));
        if (vp.width <= 768) {   /* 폰 — 단계 중 아래 막대의 「지시문 n」 이 시트를 연다, 바깥을 누르면 닫힌다 */
          await f.page.click('#hbar [data-act="sheet"]'); await f.page.waitForSelector('#hsheet:not([hidden]) textarea');
          assert((await f.page.locator('#hsheet textarea').inputValue()).length > 200, a + ' 시트에 지시문');
          await f.page.click('#hsheet [data-act="sheet-close"]'); assert.equal(await f.page.locator('#hsheet').isHidden(), true, '시트 닫힘');
        }
        assert.deepEqual(f.errors, []);
        await f.ctx.close();
      }
    }
    console.log('PASS 통합 생성기: 옛 생성기와 같은 글(일상컷·폼·개방·신화 초상·각성·저주·스킨·포켓몬 액션·폭주) · 게임 폼·개방 단계(이어가기 기준 폼·외형·연출 랜덤·기록·새로 고침) · 신화 단계(설계·문단·자세·외형 직접 입력·메모·각성·스킨·스킨 없는 무기) · 포켓몬 액션·폭주 단계(원작 특징·머리 직접 입력·이어가기·기준 장갑) · 일상컷 계획기 주소(채우기·📌·주소 지우기·덧붙임·랜덤이 안 바꿈·풀기·새로 고침·틀린 값) · 포켓몬 처음부터(공방·기본 화풍·대상·출력·단계·칩·해방 까닭·🔓 기록·앞 바꾸면 뒤 열기·고친 뒤 한 칸씩·다 골랐다로·랜덤·새로 고침) · 화면 셋 — ' + checks + '가지');
  } finally { await br.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
