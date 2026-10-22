/* 도트 재생기 v2(sprite-actor.js) — 다섯 공방이 같이 쓰는 자리: 카드 열쇠로 찾기(actorFor · forCard) · 여러 인물의 바닥(floor) · 뛰쳐나오기(popOut).
   인물은 book 서재 세 인물(옆의 ../book-atelier/data/sprites.json · ../book-atelier-img/sprites) — 실제 Pages 처럼 같은 출처의 /<저장소>/ 로 내준다.
   - floor: 좁으면 둘·넓으면 셋, 인물마다 제 몫 안에서 걷는다, 날마다 차례가 돈다(seed), keys 로 거르기, 누르면 onSelect(카드 열쇠), pause/resume, 폭이 바뀌면 다시 세운다
   - popOut: 요소에서 튀어나와 바닥에 내려앉고(뛰는 동안 쉰다) 화면을 가로질러 걷는다 · 누르면 onSelect · close(true) 는 되돌아 뛰어 들어가고 판을 치운다 ·
     열린 dialog 안의 요소면 그 dialog 에 붙는다(맨 위 층) · 새로 부르면 앞의 것은 닫힌다 · 움직임 줄이기면 뛰지 않고 선다
   Run: CHROMIUM_PATH=<chrome> NODE_PATH=<playwright 가 있는 node_modules> node tests/sprite-actor-screen.cjs   (SPRITE_PORT, 기본 8773) */
const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), SIB = path.resolve(ROOT, '..'), PORT = +(process.env.SPRITE_PORT || 8773), BASE = 'http://127.0.0.1:' + PORT;
const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css' };
if (!fs.existsSync(path.join(SIB, 'book-atelier/data/sprites.json')) || !fs.existsSync(path.join(SIB, 'book-atelier-img/sprites'))) { console.log('(옆에 book-atelier · book-atelier-img 가 없어 건너뜀)'); process.exit(0); }

const PAGE = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/sprite-actor.css"><style>body{margin:0;background:#222;min-height:100vh}#floor{position:relative;height:200px;margin-top:40px;background:#333}
#book{position:absolute;left:60%;top:120px;width:80px;height:110px;background:#a55}dialog{width:300px;height:200px}</style></head><body>
<div id="floor"></div><div id="book"></div><dialog id="dlg"><div id="inner" style="width:60px;height:60px;background:#5a5"></div></dialog>
<script src="/sprite-actor.js"></script><script>
window.picked = [];
window.go = fetch('/book-atelier/data/sprites.json').then(r => r.json()).then(d => {
  d.base = '/book-atelier-img/sprites/';
  window.data = d;
  window.F = AtelierSprite.floor(document.getElementById('floor'), d, { seed: 0, labelOf: k => '책 ' + k, onSelect: k => picked.push(k), idleMs: [300, 600] });
  return F.ready();
});
</script></body></html>`;

const server = http.createServer((q, s) => {
  const p = decodeURIComponent(new URL(q.url, BASE).pathname);
  if (p === '/t.html') { s.writeHead(200, { 'content-type': MIME['.html'] }); return s.end(PAGE); }
  const seg = p.split('/')[1];
  let file = path.join(ROOT, p);
  if (seg && !fs.existsSync(path.join(ROOT, seg)) && fs.existsSync(path.join(SIB, seg))) file = path.join(SIB, p);
  if (!file.startsWith(SIB + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(s);
});

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const br = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
  let n = 0;
  try {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }), page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(BASE + '/t.html'); await page.evaluate(() => window.go);

    /* 카드 열쇠 */
    assert.deepEqual(await page.evaluate(() => [!!AtelierSprite.actorFor(data, 'alice'), AtelierSprite.actorFor(data, 'nope'), AtelierSprite.cardKey('x', { book: 'b' }), AtelierSprite.cardKey('x', { card: 'c' }), AtelierSprite.cardKey('x', {})]), [true, null, 'b', 'c', 'x']);
    assert.equal(await page.evaluate(() => AtelierSprite.forCard('chunhyang', '/book-atelier/data/sprites.json').then(r => r && r.base)), 'https://polos0117.github.io/book-atelier-img/sprites/');
    assert.equal(await page.evaluate(() => AtelierSprite.forCard('alice', '/nope.json')), null, '자료가 없으면 null');
    n++;

    /* floor — 좁으면 둘, 제 몫 안에서 */
    let who = await page.evaluate(() => F.list().map(x => x.key));
    assert.equal(who.length, 2, '좁으면 둘');
    assert.deepEqual(who, ['alice', 'chunhyang'], 'seed 0 — 열쇠 차례 첫 둘');
    const lanes = await page.evaluate(() => { const w = document.getElementById('floor').clientWidth; return F.list().map(x => { const d = x.actor.debug(); return [d.x / w]; }); });
    assert(lanes[0][0] < 0.5 && lanes[1][0] > 0.5, '제 몫: ' + JSON.stringify(lanes));
    await page.waitForFunction(() => F.list().some(x => x.actor.debug().state === 'walk'), null, { timeout: 8000 });
    const btn = page.locator('#floor .sprite-actor[data-who="chunhyang"]');
    assert.equal(await btn.getAttribute('aria-label'), '책 chunhyang');
    await btn.click(); assert.deepEqual(await page.evaluate(() => picked), ['chunhyang'], '누르면 카드 열쇠');
    await page.evaluate(() => F.pause('test'));
    assert(await page.evaluate(() => F.list().every(x => !x.actor.running)), 'pause');
    await page.evaluate(() => F.resume('test'));
    assert(await page.evaluate(() => F.list().every(x => x.actor.running)), 'resume');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForFunction(() => F.list().length === 3);
    await page.evaluate(() => F.ready());
    assert.equal(await page.locator('#floor .sprite-actor').count(), 3, '넓으면 셋 — 다시 세운다(앞의 것은 치운다)');
    const other = await page.evaluate(() => { const G = AtelierSprite.floor(document.createElement('div'), data, { seed: 1, keys: ['sunzi', 'alice'], count: 5 }); const k = G.list().map(x => x.key); G.destroy(); return k; });
    assert.deepEqual(other, ['sunzi', 'alice'], 'keys 로 거르고 seed 로 돈다');
    const empty = await page.evaluate(() => AtelierSprite.floor(document.createElement('div'), { actors: {} }, {}).list().length);
    assert.equal(empty, 0, '인물이 없으면 빈 바닥');
    await page.evaluate(() => F.destroy());
    assert.equal(await page.locator('#floor .sprite-actor').count(), 0);
    await page.setViewportSize({ width: 390, height: 844 });
    n += 2;

    /* popOut — 책에서 튀어나와 바닥에, 걷고, 되돌아 들어간다 */
    await page.evaluate(() => {
      window.P = AtelierSprite.popOut(document.getElementById('book'), data.actors.alice, { base: data.base, label: '앨리스', onSelect: () => picked.push('pop'), duration: 500 });
      window.jumped = false; P.actor.ready.then(() => { const st = document.querySelector('.sprite-popout-stage'); window.jumped = !!(st.getAnimations && st.getAnimations().length); });
      return P.ready;
    });
    assert(await page.evaluate(() => jumped), '뛰는 움직임이 있었다');
    assert.equal(await page.evaluate(() => document.querySelector('.sprite-popout').parentNode === document.body), true, '몸에 붙는다');
    const land = await page.evaluate(() => { const r = document.querySelector('.sprite-popout .sprite-actor').getBoundingClientRect(), b = document.getElementById('book').getBoundingClientRect(); return { bottom: r.bottom, vh: innerHeight, cx: r.left + r.width / 2, bx: b.left + b.width / 2 }; });
    assert(land.bottom > land.vh - 60 && land.bottom <= land.vh + 40, '화면 바닥에 내려앉는다 ' + JSON.stringify(land));
    assert(Math.abs(land.cx - land.bx) < 40, '책 아래로 ' + JSON.stringify(land));
    await page.waitForFunction(() => P.actor.debug().state === 'walk', null, { timeout: 8000 });
    await page.locator('.sprite-popout .sprite-actor').click();
    assert((await page.evaluate(() => picked)).includes('pop'), '누르면 onSelect');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.sprite-popout')).pointerEvents), 'none', '판은 누름을 지나 보낸다');
    await page.evaluate(() => P.close(true));
    assert.equal(await page.locator('.sprite-popout').count(), 0, '닫으면 판을 치운다');
    n += 2;

    /* 열린 dialog 안 — 그 dialog 에 붙는다. 새로 부르면 앞의 것은 닫힌다 */
    await page.evaluate(() => { document.getElementById('dlg').showModal(); window.Q = AtelierSprite.popOut(document.getElementById('inner'), data.actors.sunzi, { base: data.base }); return Q.ready; });
    assert.equal(await page.evaluate(() => document.querySelector('.sprite-popout').parentNode.id), 'dlg', '열린 dialog 안');
    assert(await page.locator('.sprite-popout .sprite-actor').isVisible(), 'dialog 위에 보인다');
    await page.evaluate(() => { window.R = AtelierSprite.popOut(document.getElementById('book'), data.actors.chunhyang, { base: data.base }); return R.ready; });
    assert.equal(await page.locator('.sprite-popout').count(), 1, '한 번에 하나');
    await page.evaluate(() => R.close()); await page.evaluate(() => document.getElementById('dlg').close());
    n++;
    assert.deepEqual(errors, []);
    await ctx.close();

    /* 움직임 줄이기 — 뛰지 않고 선다 */
    const c2 = await br.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }), p2 = await c2.newPage();
    await p2.goto(BASE + '/t.html'); await p2.evaluate(() => window.go);
    const still = await p2.evaluate(() => { const P = AtelierSprite.popOut(document.getElementById('book'), data.actors.alice, { base: data.base }); return P.ready.then(() => { const st = document.querySelector('.sprite-popout-stage'); return [st.getAnimations().length, P.actor.running, P.actor.debug().state]; }); });
    assert.deepEqual(still, [0, false, 'idle'], '움직임 줄이기 — 뛰지 않고 대기 첫 칸');
    await c2.close();
    n++;
    console.log('PASS 도트 재생기 v2: ' + n + '가지 · 카드 열쇠로 찾기 · 바닥(좁으면 둘·넓으면 셋·제 몫·날마다 차례·거르기·누르기·쉬기·다시 세우기·빈 바닥) · 뛰쳐나오기(뛰고 내려앉아 걷기·누르기·되돌아 들어가기·dialog 안·하나만·움직임 줄이기)');
  } finally { await br.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
