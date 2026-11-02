/* 그림 현황(status.html) — 옆에 받아 둔 공방 저장소 일곱의 설계표·등록부로 status.js 를 셈해 보고, 화면을 폰·PC 로 연다.
   셈: 공방마다 대상 수 = 설계표 대상 수, 다 참+일부+없음 = 대상, 칸 판정(원소 주민은 사는 세계만, 포켓몬은 폼 셋 + 폭주 셋, 게임·책은 폼 셋 + 개방 셋).
   화면: 위 표 일곱 줄 · 공방 바꾸기 · 상태 거르기(주소 ?a=&f=) · 이름 찾기 · 그림(img) 요청이 하나도 없다 · 옆으로 넘치지 않는다 · 콘솔 오류 없음.
   Run: CHROMIUM_PATH=<chrome> NODE_PATH=<playwright> node tests/status-screen.cjs   (옆 저장소가 없으면 건너뜀, STATUS_PORT 로 자리) */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const ROOT = path.resolve(__dirname, '..'), SIB = path.resolve(ROOT, '..'), S = require(path.join(ROOT, 'status.js'));
const missing = S.ATELIERS.filter(a => Object.values(a.files).some(p => !fs.existsSync(path.join(SIB, a.repo, p))));
if (missing.length) { console.log('(옆에 공방 저장소가 없어 건너뜀: ' + missing.map(a => a.repo).join(', ') + ')'); process.exit(0); }
const read = (a, p) => JSON.parse(fs.readFileSync(path.join(SIB, a.repo, p), 'utf8'));
const results = {};
for (const a of S.ATELIERS) {
  const data = {}; for (const [k, p] of Object.entries(a.files)) data[k] = read(a, p);
  const r = S.analyze(a, data); results[a.key] = r;
  assert.equal(r.sum.full + r.sum.part + r.sum.none, r.sum.cards, a.key + ' 상태 합 = 대상');
  assert(r.cards.length > 0, a.key + ' 대상이 있다');
  for (const c of r.cards) { assert(c.slots.length > 0, a.key + ' ' + c.key + ' 칸'); if (c.status === 'full') assert(c.slots.every(s => s.ok), a.key + ' ' + c.key + ' 다 참이면 칸이 다 찼다'); if (c.status === 'none') assert.equal(c.files, 0); }
}
/* 공방마다 칸의 꼴 */
const D = read(S.ATELIERS.find(a => a.key === 'element'), 'data/element-design.json');
const cit = D.nations.flatMap(n => n.families.flatMap(f => f.citizens.map(c => [n.key + '-' + f.key + '-' + c.key, c.worlds])));
for (const [k, ws] of cit) assert.equal(results.element.cards.find(c => c.key === k).slots.length, ws.length, k + ' 주민은 사는 세계만');
assert.equal(results.element.cards.find(c => c.key === 'fe').slots.map(s => s.label).join(','), '판타지,스팀펑크,메카');
assert(results.element.cards.find(c => c.key === 'fe').slots.every(s => typeof s.casual === 'number'), '원소는 세계마다 일상컷 수');
assert.equal(results.pkm.cards[0].slots.length, 6, '포켓몬 폼 셋 + 폭주 셋');
assert.equal(results.game.cards[0].slots.length, 6, '게임 폼 셋 + 개방 셋'); assert.equal(results.book.cards[0].slots.length, 6, '책');
assert.equal(results.myth.cards[0].slots.map(s => s.label).join(','), '초상,각성,저주');
assert.equal(results.gundam.sum.cards, read(S.ATELIERS[0], 'data/mech.json').cards.length, '건담 대상 = 기체 수');
assert.equal(results.samguk.sum.cards, read(S.ATELIERS.find(a => a.key === 'samguk'), 'data/sam-design.json').generals.length, '삼국지 대상 = 장수 수');
assert.equal(results.samguk.cards.find(c => c.key === '관우').slots.map(s => s.label).join(','), '삼국시대,중세 판타지,메카');

const PORT = +(process.env.STATUS_PORT || 8805), BASE = 'http://127.0.0.1:' + PORT;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' };
const server = http.createServer((q, s) => {
  const p = decodeURIComponent(new URL(q.url, BASE).pathname), first = p.split('/')[1];
  let file = S.ATELIERS.some(a => a.repo === first) ? path.join(SIB, p) : path.join(ROOT, p === '/' ? 'index.html' : p);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(s);
});
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const { chromium } = require('playwright'); const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  let checks = 0;
  for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    const ctx = await br.newContext({ viewport: vp }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    const p = await ctx.newPage(), errors = [], imgs = [];
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    p.on('request', r => { if (r.resourceType() === 'image' && !/icon-/.test(r.url())) imgs.push(r.url()); });
    await p.goto(BASE + '/status.html');
    await p.waitForFunction(n => document.querySelectorAll('#sum tbody tr').length === n && !/읽는 중/.test(document.querySelector('#sum tbody').textContent), S.ATELIERS.length);
    assert.equal(await p.locator('#sum tbody tr').count(), S.ATELIERS.length, '표 일곱 줄');
    for (const a of S.ATELIERS) assert.match(await p.locator('#sum tbody tr', { has: p.locator(`[data-a="${a.key}"]`) }).textContent(), new RegExp(String(results[a.key].sum.cards)), a.key + ' 대상 수');
    /* 기본 — 원소 · 빈 칸 있음 */
    const gapN = results.element.cards.filter(c => c.status !== 'full').length;
    assert.equal(await p.locator('#list .row').count(), gapN, '원소 빈 칸 있음 ' + gapN);
    await p.click('#filter [data-f="all"]'); assert.equal(await p.locator('#list .row').count(), results.element.sum.cards, '전부');
    assert.match(p.url(), /a=element/); assert.match(p.url(), /f=all/);
    const fe = p.locator('#list .row[data-key="fe"]'); assert.match(await fe.textContent(), /판타지 ✓/); assert.match(await fe.textContent(), /일상 \d+/);
    /* 공방 바꾸기 · 찾기 */
    await p.click('[data-a="pkm"]'); assert.equal(await p.locator('#list .row').count(), results.pkm.sum.cards, '포켓몬 전부');
    await p.fill('#find', '피카츄'); assert.equal(await p.locator('#list .row').count(), results.pkm.cards.filter(c => (c.name + ' ' + c.sub + ' ' + c.key).toLowerCase().includes('피카츄')).length, '찾기');
    assert.match(await p.locator('#list .row').first().textContent(), /경장 ✓.*폭주/);
    await p.fill('#find', ''); await p.click('#filter [data-f="none"]'); assert.equal(await p.locator('#list .row').count(), results.pkm.sum.none, '아직 없음');
    /* 새로 고쳐도 주소대로 */
    await p.reload(); await p.waitForSelector('#list .row'); assert.equal(await p.locator('[data-a="pkm"]').getAttribute('aria-pressed'), 'true'); assert.equal(await p.locator('#filter [data-f="none"]').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(imgs, [], '그림을 받지 않는다');
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), vp.width + ' 옆으로 넘치지 않는다');
    assert.deepEqual(errors, []); checks += 12; await ctx.close();
  }
  /* 지도에서 들어가는 문 */
  const ctx = await br.newContext(); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); const p = await ctx.newPage();
  await p.goto(BASE + '/index.html'); assert.equal(await p.locator('#status-all').getAttribute('href'), 'status.html', '지도 → 그림 현황'); checks++; await ctx.close();
  await br.close(); server.close();
  console.log('PASS 그림 현황: 공방 ' + S.ATELIERS.length + ' 셈(' + S.ATELIERS.map(a => a.key + ' ' + results[a.key].sum.full + '/' + results[a.key].sum.cards).join(' · ') + ') · 표 · 공방 바꾸기 · 상태 거르기 · 찾기 · 주소 · 그림 안 받음 · 폰·PC — ' + checks + '가지');
})().catch(e => { console.error(e); server.close(); process.exit(1); });
