/* 세부 항목 시험(sweep.html) — 화면. 지시문 만들기 · 복사 단추 · 그림 한꺼번에 놓기(저장 이름) · 점 찍어 재기(contain 자리 보정) · 눈 판정 · 갈래 판정 · 판정 띠 · 저장 · 폰 넘침 · 콘솔 오류.
   Run: CHROMIUM_PATH=<chrome> NODE_PATH=<playwright> node tests/sweep-screen.cjs   (SWEEP_PORT 로 자리) */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http'), zlib = require('node:zlib'), os = require('node:os');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png' };
const server = http.createServer((q, s) => { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname), f = path.join(ROOT, p === '/' ? 'index.html' : p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
/* 회색 PNG(1024×1536) — 시험용 */
function png(w, h, g) {
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 0;
  const row = Buffer.alloc(w + 1, g); row[0] = 0; const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const { chromium } = require('playwright');
(async () => {
  await new Promise(r => server.listen(+(process.env.SWEEP_PORT || 8808), r));
  const BASE = 'http://127.0.0.1:' + server.address().port;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sweep-'));
  const files = [];
  for (const [a, l, r] of [['eye_spacing', 1, 1], ['eye_spacing', 1, 2], ['eye_spacing', 3, 1], ['eye_spacing', 3, 2], ['eye_spacing', 5, 1], ['eye_spacing', 5, 2], ['render', 1, 1], ['face_shape', 1, 1]]) {
    const f = path.join(dir, `sweep-${a}-L${l}-r${r}.png`); fs.writeFileSync(f, png(1024, 1536, 128)); files.push(f);
  }
  const strays = path.join(dir, 'other.png'); fs.writeFileSync(strays, png(1024, 1536, 90));
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE + '/sweep.html');

  /* ① 기본 고른 것으로 지시문이 이미 있다 → 항목을 셋으로 */
  assert.match(await page.textContent('#count'), /지시문 \d+개/);
  for (const k of ['face_length', 'nose_size']) await page.uncheck('#attrs input[value="' + k + '"]');
  await page.check('#attrs input[value="face_shape"]');
  await page.fill('#reps', '2'); await page.selectOption('#levels', '3');
  await page.click('#make');
  assert.match(await page.textContent('#count'), /지시문 18개 — 항목 3 × 단계 3 × 반복 2/);
  assert.equal(await page.$$eval('.plist li', l => l.length), 18);
  assert.match(await page.textContent('.plist li >> nth=0'), /sweep-eye_spacing-L1-r1\.png/);
  await page.click('[data-copy="0"]');
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /TEST — EYE SPACING: very close-set eyes/);
  await page.click('#copyall');
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /^### 1\/18 · /);

  /* ② 한꺼번에 놓기 — 이름이 다른 그림은 건너뛴다 */
  await page.setInputFiles('#bulk', files.concat(strays));
  await page.waitForFunction(() => /8장 놓음 · 이름을 못 읽음 1장/.test(document.querySelector('#toast').textContent));
  assert.equal(await page.$$eval('.cell img', i => i.length), 8);
  assert.match(await page.textContent('#results'), /아직 모름/);

  /* ③ 점 찍기 — 미간 여섯 장, 단계마다 값을 다르게 */
  const clickAt = async (x, y) => { const b = await page.$eval('#stage', s => { const r = s.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; }); const sc = Math.min(b.w / 1024, b.h / 1536), dw = 1024 * sc, dh = 1536 * sc; await page.mouse.click(b.l + (b.w - dw) / 2 + x * dw, b.t + (b.h - dh) / 2 + y * dh); };
  const gaps = { '1-1': .08, '1-2': .085, '3-1': .12, '3-2': .125, '5-1': .17, '5-2': .165 };
  for (const [k, g] of Object.entries(gaps)) {
    await page.click('[data-cell="eye_spacing-' + k + '"]');
    await page.waitForSelector('#stage');
    await clickAt(.5 - g / 2, .3); await clickAt(.5 + g / 2, .3); await clickAt(.25, .3); await clickAt(.75, .3);
    const r = +(await page.textContent('#m-ratio'));
    assert(Math.abs(r - g / .5) < 0.01, k + ' 비율 ' + r + ' ≈ ' + g / .5);
    await page.click('#m-close');
  }
  const sec = page.locator('.res', { hasText: '미간' });
  assert.match(await sec.textContent(), /반영됨/);
  assert.match(await sec.textContent(), /단계 차례대로 움직인다/);
  /* 점 하나 지우기 */
  await page.click('[data-cell="eye_spacing-1-1"]'); await page.click('#m-undo');
  assert.equal(await page.textContent('#m-ratio'), '—'); await page.click('#m-reset'); assert.equal(await page.$$eval('.pt', p => p.length), 0);
  for (const [x, y] of [[.46, .3], [.54, .3], [.25, .3], [.75, .3]]) await clickAt(x, y);
  await page.click('#m-close');

  /* 눈 판정 · 갈래 판정 */
  await page.click('[data-cell="render-1-1"]'); await page.click('[data-judge="2"]'); await page.click('#m-close');
  assert.match(await page.textContent('[data-cell="render-1-1"]'), /보기 2/);
  await page.click('[data-cell="face_shape-1-1"]'); await page.click('[data-hit="yes"]'); await page.click('#m-close');
  assert.match(await page.locator('.res', { hasText: '얼굴형' }).textContent(), /맞음 1 · 애매 0 · 아님 0 — 맞음 100%/);

  /* 저장 — 다시 열면 잰 값이 남는다(그림은 이 기기 파일이라 다시 골라야) */
  await page.reload();
  assert.match(await page.locator('.res', { hasText: '미간' }).textContent(), /반영됨/);
  assert.match(await page.textContent('[data-cell="eye_spacing-3-1"]'), /잰 값 있음/);
  const dl = page.waitForEvent('download'); await page.click('#export'); const d = await dl;
  const j = JSON.parse(fs.readFileSync(await d.path(), 'utf8'));
  assert.equal(j.verdicts.find(v => v.attr === 'eye_spacing').verdict.result, 'yes');
  assert.equal(j.prompts.length, 18);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'PC 넘침 없음');
  await ctx.close();

  /* 폰 */
  const ph = await browser.newPage({ viewport: { width: 390, height: 844 } });
  ph.on('pageerror', e => errors.push(String(e)));
  await ph.goto(BASE + '/sweep.html');
  assert(await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '폰 넘침 없음');
  assert.deepEqual(errors, [], '콘솔 오류');
  await browser.close(); server.close(); fs.rmSync(dir, { recursive: true, force: true });
  console.log('sweep-screen ok — 지시문 18 · 놓기 8 · 점 찍기 · 판정 · 저장 · 폰');
})().catch(e => { console.error(e); server.close(); process.exit(1); });
