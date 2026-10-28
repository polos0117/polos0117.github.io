/* 도트 공방(dot.html) — 화면에서 끝까지.
   ① ?a=book&c=alice 로 열면 앨리스가 골라져 있고 그 인물의 그림·정본이 뜬다. 영문 이름·생김새가 요청문에 들어간다.
   ② 상태 넷 — 걷기는 첨부 셋(정지 도트 6배·다리 안내·정본)과 다리 안내 받기, 동작 시트는 정지 도트 6배 받기.
   ③ 정리 — book 의 앨리스 정지 원본(gen2)·손자 걷기 원본(gen1)을 넣어 정리해 받은 PNG 가 그림 저장소의 정리본과 화소 하나 다르지 않다.
   그린다 — OpenAI 그림 API 를 흉내 내(api.openai.com 을 가로채 앨리스 원본을 돌려준다): 열쇠 없으면 못 그린다, 첨부가 지시문 차례로 실린다, 받은 원본이 ③ 에 들어가 정리하면 같은 화소, 다시 → gen2, 걷기는 첨부 셋, 401, 열쇠는 남고 지울 수 있다.
      걷기는 빠르기·dy, sprites.json 칸, 기록 JSON. 정지를 정리하면 그것이 동작 시트의 정지 도트가 된다.
   공방 바꾸기(포켓몬 379명 → 찾기 → 피카츄 = pikachu), 새로 고쳐도 고른 값이 남는다, 344×882 · 390×844 · 844×390 · 1280×900 에서 옆으로 넘치지 않고 누르는 자리 44px.
   옆 저장소(../book-atelier · ../book-atelier-img · ../pkm-atelier …)를 같은 출처의 /<저장소>/ 로 내준다 — 실제 Pages 와 같은 꼴.
   Run: CHROMIUM_PATH=<chrome> NODE_PATH=<playwright 가 있는 node_modules> node tests/dot-screen.cjs   (DOT_PORT 로 자리 바꾸기, 기본 8769) */
const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { chromium } = require('playwright');
const D = require('../dot/dot.js');
const ROOT = path.resolve(__dirname, '..'), SIB = path.resolve(ROOT, '..'), PORT = +(process.env.DOT_PORT || 8769), BASE = 'http://127.0.0.1:' + PORT;
const IMG = path.join(SIB, 'book-atelier-img');
const MIME = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.js': 'text/javascript', '.wasm': 'application/wasm' };
if (!fs.existsSync(path.join(IMG, 'records/sprites'))) { console.log('(../book-atelier-img 가 옆에 없어 건너뜀)'); process.exit(0); }

const server = http.createServer((q, s) => {
  const u = new URL(q.url, BASE), p = decodeURIComponent(u.pathname), seg = p.split('/')[1];
  let file = path.join(ROOT, p === '/' ? 'index.html' : p);
  if (seg && !fs.existsSync(path.join(ROOT, seg)) && fs.existsSync(path.join(SIB, seg))) file = path.join(SIB, p);
  if (!file.startsWith(SIB + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(s);
});

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const W = await D.load(fs.readFileSync(path.join(ROOT, 'dot/dot.wasm')));
  const pixels = buf => { const i = W.decode(buf), r = W.rgba(i); W.free(i); return r; };
  const samePixels = (got, wantFile, what) => {
    const a = pixels(got), b = pixels(fs.readFileSync(path.join(IMG, wantFile)));
    assert.deepEqual([a.w, a.h], [b.w, b.h], what + ' 크기');
    let d = 0; for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) d++;
    assert.equal(d, 0, what + ' — 다른 값 ' + d);
  };
  const br = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dot-screen-'));
  let checks = 0;
  try {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());   // 글꼴 같은 바깥 것은 받지 않는다
    /* 「그린다」 — OpenAI 그림 API 를 흉내 낸다(뒤에 단 것이 먼저 맞는다): 요청을 적어 두고 앨리스 정지 원본(gen2)을 돌려준다. genFail 이면 그 상태로 거절 */
    const genCalls = []; let genFail = 0;
    const aliceRaw = fs.readFileSync(path.join(IMG, 'sprites/alice/raw/alice_begin_still_gen2.png'));
    /* 지시문에 맞는 앨리스 원본을 돌려준다 — 대기·걷기·반응 시트는 그때 받은 gen 파일 */
    const rawFor = prompt => fs.readFileSync(path.join(IMG, 'sprites/alice/raw/', /IDLE animation/.test(prompt) ? 'alice_begin_idle_gen1.png' : /WALK CYCLE/.test(prompt) ? 'alice_begin_walk_gen2.png' : /REACT animation/.test(prompt) ? 'alice_begin_react_gen1.png' : 'alice_begin_still_gen2.png'));
    await ctx.route('https://api.openai.com/**', r => {
      const q = r.request(), body = (q.postDataBuffer() || Buffer.alloc(0)).toString('latin1'), fields = {};
      for (const m of body.matchAll(/name="([^"\[]+)"\r\n\r\n([\s\S]*?)\r\n--/g)) fields[m[1]] = m[2];
      const images = Array.from(body.matchAll(/name="image\[\]"; filename="([^"]+)"/g), m => m[1]);
      genCalls.push({ url: q.url(), auth: q.headers()['authorization'], fields, images, bytes: body.length });
      if (genFail) return r.fulfill({ status: genFail, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Incorrect API key provided' } }) });
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ b64_json: rawFor(fields.prompt || '').toString('base64') }], usage: { total_tokens: 1234, input_tokens: 1000, output_tokens: 234 } }) });
    });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    /* 그림 404 는 옆에 받아 둔 그림 저장소가 등록부보다 늦을 때 난다(화면은 원본으로 바꿔 보인다) — 그림 말고 다른 것이 없으면 실패 */
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    /* 그림 저장소 기록(records/sprites/…)의 404 는 "기록 없음" — 원본 번호를 셀 때 묻는다 */
    page.on('response', r => { const u = new URL(r.url()).pathname; if (r.status() >= 400 && r.url().startsWith(BASE) && !/\.(webp|jpe?g|png)$/i.test(u) && !(r.status() === 404 && /\/records\/sprites\//.test(u))) errors.push(r.status() + ' ' + r.url()); });
    const save = async (btn) => { const [dl] = await Promise.all([page.waitForEvent('download'), page.click(btn)]); const f = path.join(tmp, dl.suggestedFilename()); await dl.saveAs(f); return { name: dl.suggestedFilename(), buf: fs.readFileSync(f) }; };

    /* ① 인물 */
    await page.goto(BASE + '/dot.html?a=book&c=alice&s=still');
    await page.waitForSelector('#who:not([hidden])');
    assert.equal(await page.getAttribute('.chip[aria-pressed="true"]', 'style').then(s => /e39b6b/.test(s)), true, '책 칩');
    assert(await page.locator('#people button[aria-pressed="true"]').textContent().then(t => t.includes('앨리스')), '앨리스가 골라져 있다');
    assert.equal(await page.isHidden('#chooser'), true, '고르면 목록은 접힌다'); assert((await page.textContent('#pickedName')).includes('앨리스') && (await page.textContent('#pickedSub')).includes('alice'), '한 줄 요약');
    await page.click('#change'); assert.equal(await page.isVisible('#chooser'), true, '바꾸기로 다시 연다'); await page.click('#people button[aria-pressed="true"]'); assert.equal(await page.isHidden('#chooser'), true);
    const openChooser = async () => { if (await page.isHidden('#chooser')) await page.click('#change'); };
    assert(await page.locator('#refs li').count() >= 3, '앨리스 그림들');
    assert.equal(await page.inputValue('#id'), 'alice'); assert.equal(await page.inputValue('#form'), 'begin');
    assert.equal(await page.locator('#refs li.canon').count(), 1, '정본 하나가 처음부터 짚혀 있다');
    await page.fill('#identity', 'Short dark-brown bob with the bow on the image-left side of the head.');
    /* 원본 번호 — 그림 저장소 기록(records/sprites/alice/still.json)에 gen1·gen2 와 4K 기록(gen3)이 있으니 gen4 부터 */
    await page.waitForFunction(() => /alice_begin_still_gen4\.png/.test(document.getElementById('req').value), null, { timeout: 10000 });
    let req = await page.inputValue('#req');
    assert(req.includes('alice_begin_still_gen4.png') && req.includes('bow on the image-left side') && req.includes('SAME young woman') && /book-atelier-img\/img\/alice_/.test(req), '정지 요청문');
    /* 의상 짚기 → 첨부 둘 */
    await page.locator('#refs li').nth(0).locator('button.o').click();
    assert.equal(await page.locator('#attach li').count(), 2, '정본 + 의상');
    /* 본보기 둘 — 다른 인물(옷·색은 안 따른다) / 이 인물의 확정 도트. 하나만 고른다 */
    await page.check('#sample'); assert.equal(await page.locator('#attach li').count(), 3, '본보기 — 다른 인물');
    assert((await page.inputValue('#req')).includes('a finished sprite of a different character'));
    await page.check('#sampleSelf'); assert.equal(await page.isChecked('#sample'), false, '본보기는 하나만');
    req = await page.inputValue('#req');
    assert(req.includes("this same character's approved sprite") && !req.includes('different character'), '같은 인물의 본보기 문장');
    assert((await page.locator('#attach li').nth(2).textContent()).includes('이 인물의 확정 정지 도트'));
    await page.uncheck('#sampleSelf'); assert.equal(await page.locator('#attach li').count(), 2);
    checks += 2;

    /* ② 상태 넷 */
    await page.click('.tab[data-s="walk"]');
    assert.equal(await page.locator('#attach li').count(), 3, '걷기 첨부 셋');
    assert.equal(await page.isVisible('#guide'), true, '다리 안내 받기');
    assert.equal(await page.isDisabled('#x6'), true, '정지 도트가 없으면 6배는 아직');
    /* 걷기 — walk.json(gen1) 과 판 붙은 walk_v2.json(gen2)·walk_4k.json(gen3) 을 다 읽어 gen4 */
    await page.waitForFunction(() => /alice_begin_walk_gen4\.png/.test(document.getElementById('req').value), null, { timeout: 10000 });
    req = await page.inputValue('#req');
    assert(req.includes('WALK CYCLE') && req.includes('walk_leg_guide.png') && req.includes('alice_begin_walk_gen4.png'));
    await page.check('#skirt'); assert((await page.inputValue('#req')).includes('hidden by a long skirt')); await page.uncheck('#skirt');
    for (const s of ['idle', 'react']) { await page.click('.tab[data-s="' + s + '"]'); assert.equal(await page.locator('#attach li').count(), 2, s + ' 첨부 둘'); }
    const g = await page.request.get(BASE + '/dot/walk_leg_guide.png'); assert.equal(g.status(), 200);
    checks += 2;

    /* ③ 정리 — 앨리스 정지(gen2, 격자 찾기 · 24색 = 그때 인자) */
    await page.click('.tab[data-s="still"]');
    await page.click('#opts summary');
    await page.fill('#opt-rows', '0'); await page.uncheck('#opt-outline');
    await page.setInputFiles('#raw', path.join(IMG, 'sprites/alice/raw/alice_begin_still_gen2.png'));
    await page.waitForFunction(() => !document.getElementById('run').disabled);
    await page.click('#run');
    await page.waitForSelector('#result:not([hidden])');
    assert.match(await page.textContent('#runStatus'), /정리했다/);
    let got = await save('#dlPng');
    assert.equal(got.name, 'alice_begin_still.png');
    samePixels(got.buf, 'sprites/alice/alice_begin_still.png', '앨리스 정지');
    const x6 = await save('#dlX6'); assert.equal(x6.name, 'alice_begin_still_x6.png');
    const big = pixels(x6.buf); assert.deepEqual([big.w, big.h], [576, 768], '6배');
    assert.equal(await page.isDisabled('#x6'), false, '정지를 정리하면 6배를 받을 수 있다');
    checks += 2;

    /* 「그린다」 — 열쇠를 넣으면 지시문·첨부가 API 로 가고, 받은 원본이 ③ 에 들어가 정리하면 같은 화소. 다시 → gen2. 걷기는 첨부 셋. 401. 열쇠 남음·지움 */
    await page.goto(BASE + '/dot.html?a=book&c=alice&s=still'); await page.waitForSelector('#who:not([hidden])');
    await page.waitForFunction(() => !document.getElementById('run').disabled || document.getElementById('draw').title !== '정리기를 아직 싣는 중이다');
    assert.equal(await page.isDisabled('#draw'), true, '열쇠가 없으면 못 그린다'); assert.match(await page.getAttribute('#draw', 'title'), /열쇠/);
    assert.match(await page.textContent('#todo'), /열쇠를 한 번 넣는다/, '할 일: 열쇠'); assert.equal(await page.evaluate(() => document.getElementById('setup').open && document.getElementById('byhand').open), true, '열쇠 없으면 열쇠 칸·파일 칸이 열려 있다');
    assert.equal(await page.getAttribute('.tab[data-s="still"]', 'data-done'), '', '정지 ○');
    await page.fill('#key', 'sk-test-123');
    await page.waitForFunction(() => !document.getElementById('draw').disabled);
    assert.match(await page.textContent('#todo'), /정지 — 「그린다」/, '할 일: 그린다'); assert.match(await page.textContent('#setupSum'), /열쇠 있음 · gpt-image-2.5-sunburst · medium/);
    const perOf = () => page.evaluate(() => JSON.parse(localStorage.getItem('atelier_dot_v1')).per['book/alice']);
    if (!(await perOf()).outfit) await page.locator('#refs li').nth(0).locator('button.o').click();   // 의상 → 첨부 둘(앞에서 짚었으면 그대로)
    assert.equal(await page.locator('#attach li').count(), 2);
    const canonFile = (await perOf()).canon, outfitFile = (await perOf()).outfit;
    await page.click('#draw');
    assert(['그리는 중…', '다시 그린다'].includes(await page.textContent('#draw')), '누르면 그리는 중(흉내 API 는 바로 끝나기도 한다)');
    await page.waitForFunction(() => /^받았다 — /.test(document.getElementById('genStatus').textContent), null, { timeout: 20000 });
    assert.equal(genCalls.length, 1, '요청 한 번');
    const c1 = genCalls[0];
    assert.equal(c1.auth, 'Bearer sk-test-123'); assert.equal(c1.url, 'https://api.openai.com/v1/images/edits');
    assert.equal(c1.fields.model, 'gpt-image-2.5-sunburst'); assert.equal(c1.fields.size, '1024x1536'); assert.equal(c1.fields.quality, 'medium'); assert.equal(c1.fields.background, 'transparent'); assert.equal(c1.fields.input_fidelity, undefined, '2 세대는 input_fidelity 없음');
    assert.deepEqual(c1.images, [canonFile, outfitFile], '첨부 = 정본·의상 그 파일');
    assert(c1.fields.prompt.startsWith('Pixel art game sprite of the SAME young woman') && c1.fields.prompt.includes('Attached image 2 shows the outfit') && !c1.fields.prompt.includes('Attached image 3'), '지시문 그대로(본보기는 빠진다)');
    assert(c1.bytes > 200000, '첨부 바이트가 실려 갔다 ' + c1.bytes);
    assert.match(await page.textContent('#rawName'), /^alice_begin_still_gen4\.png · 1024×1536/, '③ 원본 자리에(기록 다음 번호)');
    assert.equal(await page.isHidden('#genOut'), false); assert((await page.textContent('#genFacts')).includes('1234'), '토큰');
    assert.equal(await page.textContent('#draw'), '다시 그린다');
    assert.equal(await page.getAttribute('.tab[data-s="still"]', 'data-done'), 'raw', '정지 ◐'); assert.match(await page.textContent('#todo'), /「정리하기」/, '할 일: 정리'); assert.match(await page.textContent('#inNote'), /원본: alice_begin_still_gen4\.png/);
    const rawDl = await save('#dlGen'); assert.equal(rawDl.name, 'alice_begin_still_gen4.png'); assert(rawDl.buf.equals(aliceRaw), '원본 PNG 그대로');
    await page.click('#opts summary'); await page.fill('#opt-rows', '0'); await page.uncheck('#opt-outline');
    assert.equal(await page.isHidden('#next'), true, '정리 전엔 다음이 없다');
    await page.click('#run'); await page.waitForSelector('#result:not([hidden])');
    samePixels((await save('#dlPng')).buf, 'sprites/alice/alice_begin_still.png', '그려 받은 원본을 정리');
    assert.equal(await page.getAttribute('.tab[data-s="still"]', 'data-done'), 'done', '정지 ●'); assert.match(await page.textContent('#todo'), /정지 정리됐다\. 다음은 대기/, '할 일: 다음');
    assert.equal(await page.textContent('#next'), '다음: 대기 →'); assert.equal(await page.isVisible('#next'), true);
    /* 받기 목록 — 정지 한 줄(PNG·기록), 전부 받기는 둘을 차례로 */
    await page.waitForSelector('#stageBox:not([hidden])');
    assert.equal(await page.locator('#doneList li').count(), 1); assert.equal(await page.locator('#doneList [data-rec="still"]').count(), 1, '여기서 정리한 것은 기록도');
    const dls = []; page.on('download', d => dls.push(d.suggestedFilename()));
    await page.click('#dlAll');
    await page.waitForFunction(() => /다 받았다/.test(document.getElementById('roomNote').textContent), null, { timeout: 10000 });
    for (let k = 0; k < 20 && dls.length < 2; k++) await page.waitForTimeout(100);
    assert.deepEqual(dls.sort(), ['alice_begin_still.png', 'still.json'], '전부 받기 — PNG 와 기록');
    /* 다시 — 이번엔 이 인물의 확정 도트(③ 의 정지 도트 6배)를 본보기로: 첨부 셋, 같은 인물 문장 */
    await page.check('#sampleSelf');
    await page.click('#draw'); await page.waitForFunction(() => /gen5\.png/.test(document.getElementById('rawName').textContent), null, { timeout: 20000 });
    assert.equal(genCalls.length, 2, '다시 → 둘째 요청, 원본 번호 하나 오른다');
    assert.deepEqual(genCalls[1].images, [canonFile, outfitFile, 'alice_begin_still_x6.png'], '본보기 = 이 인물의 정지 도트 6배');
    assert(genCalls[1].fields.prompt.includes("Attached image 3 is this same character's approved sprite"), '같은 인물 본보기 문장');
    await page.uncheck('#sampleSelf');
    await page.click('#next');
    assert.equal(await page.getAttribute('.tab[aria-selected="true"]', 'data-s'), 'idle', '다음 → 대기'); assert.match(await page.textContent('#todo'), /대기 — 「그린다」/);
    await page.click('.tab[data-s="walk"]');
    await page.waitForFunction(() => !document.getElementById('draw').disabled);
    assert.equal(await page.evaluate(() => document.getElementById('setup').open || document.getElementById('byhand').open), false, '한 번 그렸으면 열쇠 칸·파일 칸이 접힌다');
    await page.click('#setup summary');
    await page.selectOption('#model', 'gpt-image-2.5-flare'); await page.selectOption('#quality', 'low'); await page.selectOption('#size', '2160x3840');
    assert((await page.inputValue('#req')).includes('cell 720 x 1920'), '크기를 바꾸면 지시문의 칸도');
    await page.click('#draw'); await page.waitForFunction(() => /alice_begin_walk_gen4\.png/.test(document.getElementById('rawName').textContent), null, { timeout: 20000 });
    const c3 = genCalls[2];
    assert.deepEqual(c3.images, ['alice_begin_still_x6.png', 'walk_leg_guide.png', canonFile], '걷기 첨부 셋 — 정지 6배·다리 안내·정본');
    assert(c3.fields.prompt.includes('WALK CYCLE sprite sheet'), '걷기 지시문');
    assert.equal(c3.fields.model, 'gpt-image-2.5-flare'); assert.equal(c3.fields.quality, 'low'); assert.equal(c3.fields.size, '2160x3840', '4K 로 보낸다'); assert(c3.fields.prompt.includes('canvas 2160 x 3840'));
    if (!(await page.evaluate(() => document.getElementById('setup').open))) await page.click('#setup summary');   // 그리고 나면 접힌다
    await page.selectOption('#size', '1024x1536');
    genFail = 401;
    await page.click('.tab[data-s="still"]'); await page.click('#draw');
    await page.waitForFunction(() => /못 그렸다/.test(document.getElementById('genStatus').textContent), null, { timeout: 20000 });
    assert.match(await page.textContent('#genStatus'), /401/); assert.equal(await page.isDisabled('#draw'), false, '틀려도 다시 누를 수 있다');
    genFail = 0;
    /* 세 시트 한꺼번에 — 앨리스 때처럼 대기·걷기·반응을 차례로 그려 정리까지. 탭마다 제 원본·제 결과가 남는다 */
    assert.equal(await page.isVisible('#drawAll'), true, '정지 도트가 있으면 한꺼번에 단추');
    await page.click('#drawAll');
    await page.waitForFunction(() => /셋 다 받아 정리했다/.test(document.getElementById('genStatus').textContent), null, { timeout: 60000 });
    assert.equal(genCalls.length, 7, '요청 셋 더(대기·걷기·반응)');
    assert.deepEqual(genCalls.slice(4).map(c => c.fields.prompt.match(/IDLE animation|WALK CYCLE|REACT animation/)[0]), ['IDLE animation', 'WALK CYCLE', 'REACT animation'], '차례대로');
    for (const s of ['idle', 'walk', 'react']) assert.equal(await page.getAttribute('.tab[data-s="' + s + '"]', 'data-done'), 'done', s + ' ●');
    assert.equal(await page.getAttribute('.tab[aria-selected="true"]', 'data-s'), 'idle', '끝나면 대기 탭에서 본다');
    assert.equal(await page.locator('#doneList li').count(), 4, '받기 목록 넷'); assert.match(await page.textContent('#todo'), /넷 다 됐다/);
    assert.match(await page.textContent('#rawName'), /alice_begin_idle_gen3\.png/, '대기 탭의 제 원본(기록 gen1 · 4K gen2 다음)');
    await page.click('.tab[data-s="react"]'); assert.match(await page.textContent('#rawName'), /alice_begin_react_gen3\.png/, '반응 탭의 제 원본'); assert.equal(await page.isVisible('#result'), true, '제 결과도');
    /* 원본 PNG 받기 = 그 탭의 원본(이름·바이트) — 마지막으로 받은 한 장(반응)이 아니라 */
    for (const s of ['idle', 'walk', 'react']) {
      await page.click('.tab[data-s="' + s + '"]');
      const want = (await page.textContent('#rawName')).split(' · ')[0], dl = await save('#dlGen');
      assert.equal(dl.name, want, s + ' 원본 이름'); assert.match(dl.name, new RegExp('^alice_begin_' + s + '_gen\\d+\\.png$'));
      assert(dl.buf.equals(rawFor(s === 'idle' ? 'IDLE animation' : s === 'walk' ? 'WALK CYCLE' : 'REACT animation')), s + ' 원본 바이트');
    }
    assert.match(await page.textContent('#facts'), /반응 · 4칸/);
    await page.click('.tab[data-s="still"]');
    await page.reload(); await page.waitForSelector('#who:not([hidden])');
    assert.equal(await page.inputValue('#key'), 'sk-test-123', '열쇠는 이 기기에 남는다');
    assert.equal(await page.inputValue('#model'), 'gpt-image-2.5-flare'); assert.equal(await page.inputValue('#quality'), 'low', '고른 모델·품질도 남는다'); assert.equal(await page.inputValue('#size'), '1024x1536', '크기도');
    assert.equal(await page.evaluate(() => document.getElementById('setup').open || document.getElementById('byhand').open), false, '열쇠가 있으면 열쇠 칸·파일 칸은 접혀 있다');
    await page.click('#setup summary');
    await page.click('#keyClear');
    assert.equal(await page.isDisabled('#draw'), true, '지우면 못 그린다'); assert.equal(await page.evaluate(() => localStorage.getItem('atelier_openai_key_v1')), null);
    checks += 4;

    /* 4K — 크기를 고르면 정리 기본값이 따라간다: 정지는 격자 찾기(간격 10~24) · 칸 192×256, 시트 줄 수는 정지 도트 키, 쪼가리 150. 크기는 인물마다 남는다 */
    await page.goto(BASE + '/dot.html?a=book&c=alice&s=still'); await page.waitForSelector('#who:not([hidden])');
    if (!(await page.evaluate(() => document.getElementById('setup').open))) await page.click('#setup summary');
    await page.selectOption('#size', '2160x3840');
    assert.deepEqual(await Promise.all(['rows', 'pitchLo', 'pitchHi', 'cellW', 'cellH'].map(k => page.inputValue('#opt-' + k))), ['0', '10', '24', '192', '256'], '4K 정지 기본값');
    await page.setInputFiles('#raw', path.join(IMG, 'sprites/alice/raw/alice_begin_still_gen2.png'));
    await page.waitForFunction(() => !document.getElementById('run').disabled);
    await page.click('#run'); await page.waitForSelector('#result:not([hidden])');
    const k4 = await save('#dlPng'), k4px = pixels(k4.buf); assert.deepEqual([k4px.w, k4px.h], [192, 256], '4K 정지 = 칸 192×256');
    const r4 = JSON.parse((await save('#dlRec')).buf.toString('utf8'));
    assert.deepEqual([r4.canvas, r4.cell, r4.cleaned.args], ['2160x3840', [192, 256], ['24', '--pitch', '10,24', '--outline', '--cell', '192x256']], '기록에 크기·칸·인자');
    assert.equal(r4.cleaned.foot_y, 254);
    await page.click('.tab[data-s="idle"]');
    assert.deepEqual(await Promise.all(['rows', 'speck', 'cellW', 'cellH'].map(k => page.inputValue('#opt-' + k))), [String(r4.cleaned.sprite[1] - 2), '150', '192', '256'], '4K 시트 — 줄 수는 정지 도트 키');
    await page.reload(); await page.waitForSelector('#who:not([hidden])');
    assert.equal(await page.inputValue('#size'), '2160x3840', '크기는 인물마다 남는다');
    if (!(await page.evaluate(() => document.getElementById('setup').open))) await page.click('#setup summary');
    await page.selectOption('#size', '1024x1536'); await page.click('.tab[data-s="still"]');
    assert.deepEqual(await Promise.all(['rows', 'cellW', 'cellH'].map(k => page.inputValue('#opt-' + k))), ['121', '96', '128'], '보통으로 돌리면 앞선 기본값');
    checks++;

    /* 기록을 못 읽으면(404 가 아닌 실패) 지금처럼 gen1 부터, 「지금 할 일」이 "원본 번호는 올릴 때 확인" */
    await ctx.route('**/records/sprites/sunzi/still.json', r => r.fulfill({ status: 500, body: 'x' }));
    await page.goto(BASE + '/dot.html?a=book&c=sunzi&s=still'); await page.waitForSelector('#who:not([hidden])');
    await page.waitForFunction(() => /원본 번호는 올릴 때 확인/.test(document.getElementById('todo').textContent), null, { timeout: 10000 });
    assert((await page.inputValue('#req')).includes('sunzi_begin_still_gen1.png'), '못 읽으면 gen1');
    await ctx.unroute('**/records/sprites/sunzi/still.json');
    errors.splice(0, errors.length, ...errors.filter(e => !/records\/sprites\/sunzi\/still\.json/.test(e)));
    checks++;

    /* 손자 걷기(gen1) — 기본값(121줄 · 3x2 · 쪼가리 40 · 96x128) 그대로가 그때 인자 */
    await page.goto(BASE + '/dot.html?a=book&c=sunzi&s=walk');
    await page.waitForSelector('#who:not([hidden])');
    assert.equal(await page.inputValue('#id'), 'sunzi');
    await page.setInputFiles('#raw', path.join(IMG, 'sprites/sunzi/raw/sunzi_begin_walk_gen1.png'));
    await page.setInputFiles('#stillFile', path.join(IMG, 'sprites/sunzi/sunzi_begin_still.png'));
    await page.waitForFunction(() => !document.getElementById('run').disabled);
    await page.click('#run');
    await page.waitForSelector('#result:not([hidden])');
    got = await save('#dlPng');
    assert.equal(got.name, 'sunzi_begin_walk.png');
    samePixels(got.buf, 'sprites/sunzi/sunzi_begin_walk.png', '손자 걷기');
    /* 두 칸을 바꿔 넣어도 — 크기로 알아보고 바꿔 정리한다(같은 화소) */
    {
      const q = await ctx.newPage();
      await q.goto(BASE + '/dot.html?a=book&c=sunzi&s=walk'); await q.waitForSelector('#who:not([hidden])');
      await q.setInputFiles('#raw', path.join(IMG, 'sprites/sunzi/sunzi_begin_still.png'));
      await q.setInputFiles('#stillFile', path.join(IMG, 'sprites/sunzi/raw/sunzi_begin_walk_gen1.png'));
      await q.waitForFunction(() => !document.getElementById('run').disabled);
      await q.click('#run'); await q.waitForSelector('#result:not([hidden])');
      assert.match(await q.textContent('#runStatus'), /바꿔 넣고 정리했다/);
      const [dl] = await Promise.all([q.waitForEvent('download'), q.click('#dlPng')]);
      const f = path.join(tmp, 'swapped.png'); await dl.saveAs(f);
      samePixels(fs.readFileSync(f), 'sprites/sunzi/sunzi_begin_walk.png', '바꿔 넣은 손자 걷기');
      await q.close();
    }
    const sheetId = W.decode(got.buf), stride = W.stride(sheetId, 96, 200), bob = W.bob(sheetId, 96, 1);
    const entry = JSON.parse(await page.inputValue('#entry'));
    assert.deepEqual(entry, { file: 'sunzi/sunzi_begin_walk.png', frames: 6, order: [0, 1, 2, 3, 4, 5], ms: [200, 200, 200, 200, 200, 200], speed: stride.speed, dy: bob.dy });
    assert((await page.textContent('#facts')).includes('빠르기 ' + stride.speed));
    const rec = JSON.parse((await save('#dlRec')).buf.toString('utf8'));
    assert.equal(rec.cleaned.file, 'sprites/sunzi/sunzi_begin_walk.png'); assert.equal(rec.state, 'walk'); assert.equal(rec.atelier, 'book');
    assert.deepEqual(rec.cleaned.args, ['--frames', '6', '--grid', '3x2', '--palette', 'sprites/sunzi/sunzi_begin_still.png', '--rows', '121', '--speck', '40', '--cell', '96x128']);
    assert.match(rec.generation.sha256 || '', /^[0-9a-f]{64}$/); assert.match(rec.cleaned.sha1 || '', /^[0-9a-f]{12}$/);
    assert.equal(rec.playback.speed, stride.speed);
    /* 무대 — 넣은 정지 도트와 방금 정리한 걷기를 공용 재생기(sprite-actor.js)로 세운다. 두 자리 사이를 걷는다 */
    await page.waitForSelector('#stageBox:not([hidden]) .sprite-actor:not([hidden])');
    await page.waitForFunction(() => { const a = document.querySelector('#room .sprite-actor'); return a && a.sprite.debug().ready; });
    await page.locator('#room').scrollIntoViewIfNeeded();   // 화면 밖이면 재생기가 쉰다(그래야 한다)
    const walked = await page.waitForFunction(() => document.querySelector('#room .sprite-actor').dataset.state === 'walk', null, { timeout: 8000 }).then(() => true, () => false);
    assert(walked, '무대의 인물이 걷는다 ' + JSON.stringify(await page.evaluate(() => { const a = document.querySelector('#room .sprite-actor'); return [a.sprite.debug(), a.dataset.state, document.getElementById('room').getBoundingClientRect().top, innerHeight]; })));
    const actorEntry = JSON.parse(await page.inputValue('#actorEntry'));
    assert.deepEqual(Object.keys(actorEntry.states), ['still', 'walk']);
    assert.deepEqual(actorEntry.states.walk.dy, bob.dy); assert.equal(actorEntry.states.walk.speed, stride.speed);
    assert.equal(actorEntry.states.still.file, 'sunzi/sunzi_begin_still.png'); assert.deepEqual(actorEntry.cell, [96, 128]); assert.equal(actorEntry.card, 'sunzi', '카드 열쇠');
    assert.match(await page.textContent('#roomNote'), /아직 없는 것: 대기 · 반응/);
    /* 재생 — 멈춤·다시 */
    await page.click('#playBtn'); assert.equal(await page.getAttribute('#playBtn', 'aria-pressed'), 'false');
    await page.click('#playBtn'); assert.equal(await page.getAttribute('#playBtn', 'aria-pressed'), 'true');
    checks += 4;

    /* 칸 고르기 — 2칸을 끄면 차례에서 빠지고, 글로 0,3,0,2 를 적으면 그대로(앨리스 대기처럼). 인물 칸·기록도 따라간다 */
    assert.equal(await page.locator('#fcells button').count(), 6, '칸 단추 여섯');
    await page.click('#fcells button[data-frame="1"]');
    assert.deepEqual(JSON.parse(await page.inputValue('#entry')).order, [0, 2, 3, 4, 5], '2칸이 빠진다');
    assert.equal(await page.getAttribute('#fcells button[data-frame="1"]', 'aria-pressed'), 'false');
    await page.fill('#orderText', '0,3,0,2'); await page.dispatchEvent('#orderText', 'change');
    const e2 = JSON.parse(await page.inputValue('#entry'));
    assert.deepEqual([e2.order, e2.ms.length], [[0, 3, 0, 2], 4], '글로 적은 차례');
    assert.deepEqual(JSON.parse(await page.inputValue('#actorEntry')).states.walk.order, [0, 3, 0, 2], '인물 칸도');
    assert.deepEqual(JSON.parse((await save('#dlRec')).buf.toString('utf8')).playback.order, [0, 3, 0, 2], '기록도');
    await page.fill('#orderText', '9'); await page.dispatchEvent('#orderText', 'change'); assert.match(await page.textContent('#fpickStatus'), /칸 번호/, '틀린 차례는 거절');
    await page.fill('#orderText', '0,1,2,3,4,5'); await page.dispatchEvent('#orderText', 'change');
    assert.deepEqual(JSON.parse(await page.inputValue('#entry')).order, [0, 1, 2, 3, 4, 5], '되돌리면 기본');
    /* 손보기 — 1~3칸을 4~6칸으로 복사, 되돌리기, 영역 두 색 맞바꾸기, 붓. 손본 것은 바로 정리본·기록에 */
    await page.click('#fixBox summary');
    const orig = pixels(fs.readFileSync(path.join(IMG, 'sprites/sunzi/sunzi_begin_walk.png')));
    const frameOf = (img, k) => { const out = []; for (let y = 0; y < 128; y++) for (let x = 0; x < 96; x++) { const i = (y * img.w + k * 96 + x) * 4; out.push(img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]); } return out; };
    await page.click('#halfCopy');
    let edited = pixels((await save('#dlPng')).buf);
    for (let k = 0; k < 3; k++) assert.deepEqual(frameOf(edited, k + 3), frameOf(orig, k), (k + 4) + '칸 = ' + (k + 1) + '칸');
    assert.match(await page.textContent('#facts'), /손봄\s*1번/); assert.equal(JSON.parse((await save('#dlRec')).buf.toString('utf8')).cleaned.hand_edits, 1, '기록에 손본 횟수');
    await page.click('#undo');
    samePixels((await save('#dlPng')).buf, 'sprites/sunzi/sunzi_begin_walk.png', '되돌리면 원래 정리본');
    const hexOf = (d, i) => '#' + [d[i], d[i + 1], d[i + 2]].map(v => ('0' + v.toString(16)).slice(-2)).join('');
    const cols = [...new Set(Array.from({ length: orig.w * orig.h }, (_, p) => orig.data[p * 4 + 3] ? hexOf(orig.data, p * 4) : null).filter(Boolean))].sort();
    const countIn = (img, k, h) => { let n = 0; for (let y = 0; y < 128; y++) for (let x = 0; x < 96; x++) { const i = (y * img.w + k * 96 + x) * 4; if (img.data[i + 3] && hexOf(img.data, i) === h) n++; } return n; };
    assert.equal(await page.locator('#pal button').count(), cols.length + 1, '팔레트 = 시트의 색 + 지우개');
    await page.click('#swA'); await page.click('#pal button[data-c="' + cols[0] + '"]'); await page.click('#swB'); await page.click('#pal button[data-c="' + cols[1] + '"]');
    await page.click('#toolSwap');
    const box = await page.locator('#edit').boundingBox();
    await page.mouse.move(box.x + 1, box.y + 1); await page.mouse.down(); await page.mouse.move(box.x + box.width - 1, box.y + box.height - 1, { steps: 4 }); await page.mouse.up();
    edited = pixels((await save('#dlPng')).buf);
    assert.deepEqual([countIn(edited, 0, cols[0]), countIn(edited, 0, cols[1])], [countIn(orig, 0, cols[1]), countIn(orig, 0, cols[0])], '1칸 전체에서 A↔B 가 맞바뀐다');
    assert.deepEqual(frameOf(edited, 1), frameOf(orig, 1), '다른 칸은 그대로');
    await page.click('#undo');
    await page.click('#toolBrush'); await page.click('#swA'); await page.click('#pal button[data-c="' + cols[2] + '"]');
    const box2 = await page.locator('#edit').boundingBox();   // 되돌리면 「손봄」 줄이 빠져 자리가 오른다 — 화면 밖일 수 있어 요소 기준으로 누른다
    await page.locator('#edit').click({ position: { x: box2.width / 2 + 2, y: box2.height / 2 + 2 } });   // 화소(48,64)의 한가운데
    assert.match(await page.textContent('#editNote'), /붓 1칸/, '붓이 한 칸 찍혔다');
    edited = pixels((await save('#dlPng')).buf);
    assert.equal(hexOf(edited.data, (64 * edited.w + 48) * 4), cols[2], '붓 — 가운데 화소가 색 A');
    await page.click('#undo'); samePixels((await save('#dlPng')).buf, 'sprites/sunzi/sunzi_begin_walk.png', '되돌리면 다시 원래');
    checks += 3;

    /* 걷기 4칸을 칸마다 따로 — 손자 6칸 원본에서 0·2·3·5칸을 잘라 장마다 다른 자리의 초록 바탕에(따로 뽑은 것처럼), 네 장을 한 번에 넣는다 */
    {
      const r6 = fs.readdirSync(path.join(IMG, 'records/sprites/sunzi')).filter(f => /^walk.*\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(path.join(IMG, 'records/sprites/sunzi', f), 'utf8'))).find(x => x.cleaned.frame && x.cleaned.frame.length === 6);
      const src = r6.generations ? r6.generations.find(g => g.file.endsWith((r6.cleaned.from || 'gen1') + '.png')).file : r6.generation.file;
      const big = W.rgba(W.decode(fs.readFileSync(path.join(IMG, src)))), files = [], ids = [];
      [0, 2, 3, 5].forEach((fi, k) => {
        const [x0, y0, x1, y1] = r6.cleaned.frame[fi].box_px, cw = 1024, ch = 1536, px = new Uint8Array(cw * ch * 4);
        for (let i = 0; i < cw * ch; i++) px.set([0, 255, 0, 255], i * 4);
        const ox = 300 + k * 9, oy = 600 - k * 7;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const s = (y * big.w + x) * 4; if (big.data[s + 3] >= 128) px.set(big.data.subarray(s, s + 4), ((oy + y - y0) * cw + ox + x - x0) * 4); }
        const id = W.put(px, cw, ch), f = path.join(tmp, 'sunzi_begin_walk4_' + (k + 1) + '_gen1.png');
        fs.writeFileSync(f, W.png(id)); files.push(f); ids.push(id);
      });
      await page.goto(BASE + '/dot.html?a=book&c=sunzi&s=walk4');
      await page.waitForSelector('#who:not([hidden])');
      assert.equal(await page.locator('#frames button').count(), 4, '칸 고르기 넷');
      assert.equal(await page.isHidden('#guide'), true, '다리 안내는 6칸 걷기만');
      await page.click('#frames button:has-text("3칸")');
      const req3 = await page.inputValue('#req');
      assert(req3.includes('frame 3 of 4') && req3.includes('sunzi_begin_walk4_3_gen1.png') && req3.includes('1칸 원본'), '3칸 지시문');
      await page.setInputFiles('#raw', files.slice().reverse());   // 차례가 섞여도 이름의 칸 번호로
      await page.setInputFiles('#stillFile', path.join(IMG, 'sprites/sunzi/sunzi_begin_still.png'));
      await page.waitForFunction(() => !document.getElementById('run').disabled);
      assert.match(await page.textContent('#rawName'), /1칸 sunzi_begin_walk4_1_gen1\.png.*4칸 sunzi_begin_walk4_4_gen1\.png/);
      await page.click('#run');
      await page.waitForSelector('#result:not([hidden])');
      const g4 = await save('#dlPng');
      assert.equal(g4.name, 'sunzi_begin_walk4.png');
      const want = W.framesSheet(ids, W.decode(fs.readFileSync(path.join(IMG, 'sprites/sunzi/sunzi_begin_still.png'))), { rows: 121, speck: 40, cell: [96, 128] });
      assert.deepEqual(W.rgba(W.decode(g4.buf)).data, W.rgba(want.id).data, '화면에서 정리한 4칸 = wasm 을 바로 부른 것');
      const s4 = W.decode(g4.buf), t4 = W.stride(s4, 96, 250), b4 = W.bob(s4, 96, 1);
      assert.deepEqual(JSON.parse(await page.inputValue('#entry')), { file: 'sunzi/sunzi_begin_walk4.png', frames: 4, order: [0, 1, 2, 3], ms: [250, 250, 250, 250], speed: t4.speed, dy: b4.dy });
      assert((await page.textContent('#facts')).includes('따로 뽑은 원본'));
      const rec4 = JSON.parse((await save('#dlRec')).buf.toString('utf8'));
      assert.equal(rec4.state, 'walk4'); assert.equal(rec4.cleaned.file, 'sprites/sunzi/sunzi_begin_walk4.png');
      assert.deepEqual(rec4.generation.files.map(f => f.file), [1, 2, 3, 4].map(k => 'sprites/sunzi/raw/sunzi_begin_walk4_' + k + '_gen1.png'));
      assert(rec4.generation.files.every(f => /^[0-9a-f]{64}$/.test(f.sha256)), '원본 넷의 sha256');
      assert.deepEqual(rec4.cleaned.args.slice(0, 3), ['--separate', '--frames', '4']);
      await page.waitForSelector('#stageBox:not([hidden]) .sprite-actor:not([hidden])');
      const a4 = JSON.parse(await page.inputValue('#actorEntry'));
      assert.deepEqual(Object.keys(a4.states), ['still', 'walk']); assert.equal(a4.states.walk.file, 'sunzi/sunzi_begin_walk4.png', '재생기에는 걷기 자리로');
      ids.concat([want.id, s4]).forEach(i => W.free(i));
      checks += 2;
      /* 아래 검사는 6칸 걷기 자리에서 이어진다 */
      await page.goto(BASE + '/dot.html?a=book&c=sunzi&s=walk'); await page.waitForSelector('#who:not([hidden])');
    }

    /* 공방 바꾸기 — 포켓몬 (목록은 접혀 있으니 「바꾸기」로 연다). 옆에 그 저장소가 없으면 건너뛰고 말한다 */
    const have = repo => fs.existsSync(path.join(SIB, repo)), skipped = [];
    if (!have('pkm-atelier')) skipped.push('포켓몬(../pkm-atelier)');
    else {
    await openChooser();
    await page.click('.chip:has-text("포켓몬")');
    await page.waitForFunction(() => /모두 \d+명/.test(document.getElementById('more').textContent));
    assert.match(await page.textContent('#more'), /앞의 60명 · 모두 \d{3,}명/);
    await page.fill('#q', '피카츄');
    assert.equal(await page.isHidden('#stageBox'), true, '인물을 바꾸기 전까지 무대는 남는다 — 바꾸면 비운다');
    await page.fill('#q', '피카츄');
    await page.click('#people button:has-text("피카츄")');
    assert.equal(await page.inputValue('#id'), 'pikachu'); assert.equal(await page.inputValue('#form'), 'base');
    assert((await page.inputValue('#req')).includes('pikachu_base_walk_gen1.png'));
    /* 새로 고쳐도 남는다 */
    await page.fill('#identity', 'Yellow bob with black-tipped ear ribbons.');
    await page.reload(); await page.waitForSelector('#who:not([hidden])');
    assert.equal(await page.inputValue('#identity'), 'Yellow bob with black-tipped ear ribbons.');
    assert.equal(await page.getAttribute('.tab[aria-selected="true"]', 'data-s'), 'walk');
    }
    /* 다른 공방도 목록이 뜬다 */
    for (const [name, min, repo] of [['신화 무기', 100, 'myth-atelier'], ['건담', 100, 'atelier'], ['삼국지', 100, 'sam-atelier']]) {
      if (!have(repo)) { skipped.push(name + '(../' + repo + ')'); continue; }
      await openChooser();
      await page.click('.chip:has-text("' + name + '")');
      await page.waitForFunction(() => /모두 \d+명/.test(document.getElementById('more').textContent));
      const n = +(await page.textContent('#more')).match(/모두 (\d+)명/)[1];
      assert(n >= min, name + ' ' + n);
    }
    if (skipped.length) console.log('(옆에 저장소가 없어 공방 바꾸기 검사를 건너뜀: ' + skipped.join(' · ') + ')');
    checks += 3;
    if (errors.length) console.log('errors:', JSON.stringify(errors).slice(0, 1500));
    assert.deepEqual(errors, []);

    /* 크기마다 — 옆으로 넘치지 않고 누르는 자리 44px */
    for (const [w, h] of [[344, 882], [390, 844], [844, 390], [1280, 900]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(BASE + '/dot.html?a=book&c=alice&s=walk'); await page.waitForSelector('#who:not([hidden])');
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert(over <= 0, w + 'x' + h + ' 옆으로 넘침 ' + over);
      const small = await page.evaluate(() => Array.from(document.querySelectorAll('.btn:not([hidden]), .chip, .tab, .home')).filter(b => b.offsetParent && b.getBoundingClientRect().height < 44).map(b => b.textContent));
      assert.deepEqual(small, [], w + 'x' + h + ' 44px');
    }
    checks++;

    /* 공방 지도에서 들어오는 문 */
    await page.goto(BASE + '/'); assert.equal(await page.locator('a[href="dot.html"]').count() >= 1, true, '지도 목록 아래 「도트 공방」');
    checks++;
    console.log('PASS 도트 공방 화면: ' + checks + '가지 · 인물 고르기·정본/의상·요청문 · 상태 넷의 첨부 · 앨리스 정지·손자 걷기를 화면에서 정리해 그림 저장소 정리본과 화소 하나 다르지 않다 · 그린다(열쇠·첨부 차례·③ 으로·같은 화소·다시·걷기 셋·401·열쇠 남음/지움) · 세 시트 한꺼번에(탭마다 제 원본·결과) · 칸 고르기(차례·ms → 칸·인물 칸·기록) · 손보기(반 주기 복사·되돌리기·두 색 맞바꾸기·붓) · 6배·빠르기·dy·sprites.json 칸·기록 · 공방 다섯 · 새로 고침 · 네 크기');
  } finally { await br.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
