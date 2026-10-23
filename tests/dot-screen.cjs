/* 도트 공방(dot.html) — 화면에서 끝까지.
   ① ?a=book&c=alice 로 열면 앨리스가 골라져 있고 그 인물의 그림·정본이 뜬다. 영문 이름·생김새가 요청문에 들어간다.
   ② 상태 넷 — 걷기는 첨부 셋(정지 도트 6배·다리 안내·정본)과 다리 안내 받기, 동작 시트는 정지 도트 6배 받기.
   ③ 정리 — book 의 앨리스 정지 원본(gen2)·손자 걷기 원본(gen1)을 넣어 정리해 받은 PNG 가 그림 저장소의 정리본과 화소 하나 다르지 않다.
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
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    /* 그림 404 는 옆에 받아 둔 그림 저장소가 등록부보다 늦을 때 난다(화면은 원본으로 바꿔 보인다) — 그림 말고 다른 것이 없으면 실패 */
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(BASE) && !/\.(webp|jpe?g|png)$/i.test(new URL(r.url()).pathname)) errors.push(r.status() + ' ' + r.url()); });
    const save = async (btn) => { const [dl] = await Promise.all([page.waitForEvent('download'), page.click(btn)]); const f = path.join(tmp, dl.suggestedFilename()); await dl.saveAs(f); return { name: dl.suggestedFilename(), buf: fs.readFileSync(f) }; };

    /* ① 인물 */
    await page.goto(BASE + '/dot.html?a=book&c=alice&s=still');
    await page.waitForSelector('#who:not([hidden])');
    assert.equal(await page.getAttribute('.chip[aria-pressed="true"]', 'style').then(s => /e39b6b/.test(s)), true, '책 칩');
    assert(await page.locator('#people button[aria-pressed="true"]').textContent().then(t => t.includes('앨리스')), '앨리스가 골라져 있다');
    assert(await page.locator('#refs li').count() >= 3, '앨리스 그림들');
    assert.equal(await page.inputValue('#id'), 'alice'); assert.equal(await page.inputValue('#form'), 'begin');
    assert.equal(await page.locator('#refs li.canon').count(), 1, '정본 하나가 처음부터 짚혀 있다');
    await page.fill('#identity', 'Short dark-brown bob with the bow on the image-left side of the head.');
    let req = await page.inputValue('#req');
    assert(req.includes('alice_begin_still_gen1.png') && req.includes('bow on the image-left side') && req.includes('SAME young woman') && /book-atelier-img\/img\/alice_/.test(req), '정지 요청문');
    /* 의상 짚기 → 첨부 둘 */
    await page.locator('#refs li').nth(0).locator('button.o').click();
    assert.equal(await page.locator('#attach li').count(), 2, '정본 + 의상');
    checks += 2;

    /* ② 상태 넷 */
    await page.click('.tab[data-s="walk"]');
    assert.equal(await page.locator('#attach li').count(), 3, '걷기 첨부 셋');
    assert.equal(await page.isVisible('#guide'), true, '다리 안내 받기');
    assert.equal(await page.isDisabled('#x6'), true, '정지 도트가 없으면 6배는 아직');
    req = await page.inputValue('#req');
    assert(req.includes('WALK CYCLE') && req.includes('walk_leg_guide.png') && req.includes('alice_begin_walk_gen1.png'));
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

    /* 공방 바꾸기 — 포켓몬 */
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
    /* 다른 공방도 목록이 뜬다 */
    for (const [name, min] of [['신화 무기', 100], ['건담', 100], ['삼국지', 100]]) {
      await page.click('.chip:has-text("' + name + '")');
      await page.waitForFunction(() => /모두 \d+명/.test(document.getElementById('more').textContent));
      const n = +(await page.textContent('#more')).match(/모두 (\d+)명/)[1];
      assert(n >= min, name + ' ' + n);
    }
    checks += 3;
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
    console.log('PASS 도트 공방 화면: ' + checks + '가지 · 인물 고르기·정본/의상·요청문 · 상태 넷의 첨부 · 앨리스 정지·손자 걷기를 화면에서 정리해 그림 저장소 정리본과 화소 하나 다르지 않다 · 6배·빠르기·dy·sprites.json 칸·기록 · 공방 다섯 · 새로 고침 · 네 크기');
  } finally { await br.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
