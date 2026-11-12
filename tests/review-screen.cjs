/* 그림 검수판(review.html) — 옆에 받아 둔 공방 저장소 · 그림 저장소로 화면을 폰 · PC 로 연다(그림 주소 polos0117.github.io 는 옆 그림 저장소로 돌린다).
   후보 불러오기 · 작업 열기 · 잠금(다른 검수자는 읽기만) · 비교(2:3 · 1024×1536 · sha256) · 승인 조건 · 지시문 트리(기록에서 불러오기) · 명령문 · 중복 막기 · 승인 뒤 할 일 ·
   공방 기준 · 규칙 묶음 · 옆으로 넘치지 않음 · 콘솔 오류 없음.
   Run: CHROMIUM_PATH=<chrome> NODE_PATH=<playwright> node tests/review-screen.cjs   (옆 저장소가 없으면 건너뜀, REVIEW_PORT 로 자리) */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..'), SIB = path.resolve(ROOT, '..'), R = require(path.join(ROOT, 'review.js'));
const need = ['element-atelier/data/img.json', 'element-atelier-img/img', 'pkm-atelier/data/img.json'];
if (need.some(p => !fs.existsSync(path.join(SIB, p)))) { console.log('(옆에 공방 저장소가 없어 건너뜀)'); process.exit(0); }
const REPOS = new Set(R.PROJECTS.flatMap(p => [p.repo].concat(p.imgRepos)));
const PORT = +(process.env.REVIEW_PORT || 8806), BASE = 'http://127.0.0.1:' + PORT;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8' };
function fileFor(p) { const first = p.split('/')[1]; return REPOS.has(first) ? path.join(SIB, p) : path.join(ROOT, p === '/' ? 'index.html' : p); }
const server = http.createServer((q, s) => {
  const file = fileFor(decodeURIComponent(new URL(q.url, BASE).pathname));
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(s);
});
const { chromium } = require('playwright');
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const errors = [];
  async function open(viewport) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await ctx.route('https://polos0117.github.io/**', route => { const u = new URL(route.request().url()); const f = fileFor(decodeURIComponent(u.pathname)); if (fs.existsSync(f)) route.fulfill({ path: f, contentType: MIME[path.extname(f)] }); else route.fulfill({ status: 404, body: '' }); });
    await ctx.route('https://fonts.**', route => route.fulfill({ status: 200, body: '' }));
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(BASE + '/review.html');
    return { ctx, page };
  }
  const noOverflow = async (page, what) => assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), what + ' 옆으로 넘치지 않는다');

  /* ── PC ── */
  const { ctx, page } = await open({ width: 1280, height: 900 });
  await page.fill('#me', '검수A'); await page.dispatchEvent('#me', 'change');
  await page.selectOption('#load-project', 'element');
  await page.click('#load');
  await page.waitForFunction(() => document.querySelectorAll('.tile').length > 0);
  const tiles = await page.$$eval('.tile', t => t.length);
  assert(tiles >= 10, '원소 후보가 보드에 오른다 (' + tiles + ')');
  assert.match(await page.textContent('#board-note'), /후보 \d+건 더함/);
  /* 같은 후보를 다시 불러도 늘지 않는다 */
  await page.click('#load'); await page.waitForFunction(() => /건너뜀/.test(document.querySelector('#board-note').textContent));
  assert.equal(await page.$$eval('.tile', t => t.length), tiles, '같은 자리는 다시 안 더함');
  assert.match(await page.textContent('#board-note'), /후보 0건 더함/);

  /* 세계 그림 하나 열기 */
  const doc = JSON.parse(fs.readFileSync(path.join(SIB, 'element-atelier/data/img.json'), 'utf8'));
  R.useStyles(R.project('element'), JSON.parse(fs.readFileSync(path.join(SIB, 'element-atelier/data/style.json'), 'utf8')));   // 화면처럼 그 공방 화풍 표로
  const first = R.candidates(R.project('element'), doc, { limit: 40 }).find(c => !c.info.cut);
  await page.fill('#q', first.info.card);
  const tileSel = '.tile:has-text("' + first.info.place + '")';
  await page.click(tileSel + ' >> nth=0');
  await page.waitForSelector('#panel h2');
  assert.match(await page.textContent('#panel h2'), new RegExp(first.info.card));
  assert.match(await page.textContent('#d-body'), /검수 단계/);
  assert.match(await page.textContent('#d-body'), /승인 뒤 할 일 — 원소의 섬/);
  assert(await page.$eval('[data-step]', c => c.disabled), '승인 전에는 할 일을 못 지운다');

  /* 승인 전 — 후보에서 승인 요청 버튼이 없고, 검수 시작으로 잠근다 */
  await page.click('[data-move="review"]');
  await page.waitForSelector('[data-move="pending"]');
  assert.match(await page.textContent('.tile[aria-current="true"]'), /🔒 검수A/);

  /* 비교 — 등록된 그림의 크기 · 비율, sha256 */
  await page.click('[data-tab="compare"]');
  await page.waitForFunction(() => /1024×1536/.test((document.querySelector('#meta-original') || {}).textContent || ''));
  assert.match(await page.textContent('#meta-original'), /2:3 맞음/);
  await page.click('[data-hash="original"]');
  await page.waitForFunction(() => /sha256 [0-9a-f]{64}/.test(document.querySelector('#meta-original').textContent));
  const want = crypto.createHash('sha256').update(fs.readFileSync(path.join(SIB, 'element-atelier-img/img', first.file))).digest('hex');
  assert.match(await page.textContent('#meta-original'), new RegExp(want), '원본 sha256 = 파일 sha256');
  assert.match(await page.textContent('#meta-original'), /WebP/);
  /* 보정 시안 — 이 기기 파일(옆 그림의 일상컷 하나) */
  const altFile = fs.readdirSync(path.join(SIB, 'element-atelier-img/img')).find(f => f !== first.file && f.endsWith('.webp'));
  await page.setInputFiles('[data-pick="revised"]', path.join(SIB, 'element-atelier-img/img', altFile));
  await page.waitForFunction(() => /sha256 [0-9a-f]{64}/.test((document.querySelector('#meta-revised') || {}).textContent || ''));
  await page.click('[data-cmode="slide"]');
  await page.waitForSelector('#slider input[type=range]');
  await page.fill('#slider input[type=range]', '30');
  assert.equal(await page.$eval('#slider', s => s.style.getPropertyValue('--x')), '30%');

  /* 검수 — 판정 없이 승인 요청은 막힌다 */
  await page.click('[data-tab="check"]');
  await page.click('[data-move="pending"]');
  await page.waitForSelector('#toast:not([hidden])');
  assert.match(await page.textContent('#toast'), /판정 안 함/);
  assert.equal(await page.$eval('[data-check="ratio"][data-v="pass"]', b => b.getAttribute('aria-pressed')), 'true', '2:3 은 파일로 판정');
  /* 손가락 어긋남 → 오류로 → 확인됨 + 수정 범위 */
  const ids = await page.$$eval('[data-check][data-v="pass"]', bs => [...new Set(bs.map(b => b.dataset.check))]);
  for (const id of ids) if (id !== 'fingers' && (await page.$eval('[data-check="' + id + '"][data-v="pass"]', b => b.getAttribute('aria-pressed'))) !== 'true') await page.click('[data-check="' + id + '"][data-v="pass"]');
  await page.click('[data-check="fingers"][data-v="fail"]');
  await page.click('#err-from-fail');
  assert.equal(await page.$$eval('#errs .errrow', r => r.length), 1);
  await page.selectOption('[data-err="0"][data-f="verdict"]', 'confirmed');
  await page.fill('[data-err="0"][data-f="note"]', '왼손 손가락 여섯'); await page.dispatchEvent('[data-err="0"][data-f="note"]', 'change');
  await page.click('[data-regen="1"]'); await page.click('[data-regen="1"]');
  assert.equal(await page.textContent('#regen'), '2');

  /* 지시문 — 기록에서 불러오기(원소 기록 주소를 짐작) → 트리 → 마디 고르기 → 요청 → 명령문 */
  await page.click('[data-tab="prompt"]');
  /* 기록 주소는 그 그림의 화풍 열쇠대로(원소 기본 jp_paint_anime · 그 전 game_keyart — 화풍 표에서 읽는다) */
  const recPath = '/element-atelier-img/records/' + first.info.card + '/' + first.info.slot + '.' + first.info.style + '-ui.json';
  assert.equal(await page.inputValue('#rec-url'), recPath);
  await page.click('#rec-load');
  await page.waitForSelector('.tree [data-node]');
  const heads = await page.$$eval('.tree > ul > li > .row .nd', n => n.map(x => x.textContent));
  /* 지시문 꼴은 그 기록대로 — 칸 꼴(원소 jp_paint_anime 부터: 머리말 + 「1. STYLE」 … 「5. CONSTRAINTS」 절, 절 안에 「Face proportions:」 같은 머리말 줄) · 줄 꼴(CONCEPT: · STYLE: 줄) */
  const recText = JSON.parse(fs.readFileSync(path.join(SIB, recPath), 'utf8')).prompt, sec = /\n\n1\. STYLE\n/.test(recText);
  const tops = sec ? ['1. STYLE', '5. CONSTRAINTS'] : ['STYLE', 'CONCEPT'], key = sec ? 'Face proportions' : 'STYLE', where = sec ? '1. STYLE › Face proportions' : 'STYLE';
  assert(tops.every(t => heads.some(h => h.includes(t))), '머리말 줄 · 절이 트리 첫 단 ' + JSON.stringify(heads));
  await page.click('.tree .nd:has-text("' + key + '") >> nth=0');
  assert.match(await page.textContent('.quote'), new RegExp(key + ':'));
  await page.selectOption('#r-action', 'replace');
  await page.fill('#r-text', key + ': soft painted 2.5D key art');
  await page.fill('#r-why', '세션 2D 쏠림');
  await page.click('#r-add');
  await page.waitForSelector('.reqs li');
  const cmd = await page.inputValue('#cmd'), rx = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(cmd, /^\[원소의 섬\] /);
  assert.match(cmd, new RegExp('1\\. \\[' + rx(where) + '\\] 「' + rx(key) + ': .*」 을\\(를\\) 「' + rx(key) + ': soft painted 2\\.5D key art」 로 바꿔줘 \\(까닭: 세션 2D 쏠림\\)'));
  assert.match(cmd, /검수에서 나온 것: 손\(확인됨\) 왼손 손가락 여섯/);
  /* 머리만 · 다 펴기 */
  await page.click('#t-close'); const fold = await page.$$eval('.tree [data-node]', n => n.length);
  await page.click('#t-open'); assert(await page.$$eval('.tree [data-node]', n => n.length) > fold, '접기 · 펴기');

  /* 기록 — 교체 · 커밋 */
  await page.click('[data-tab="record"]');
  await page.check('#r-on');
  assert.equal(await page.inputValue('#r-old'), want, '교체 — 앞 그림 sha256 은 원본에서');
  await page.click('[data-move="pending"]');
  await page.waitForFunction(() => /교체 사유/.test(document.querySelector('#toast').textContent));
  await page.fill('#r-reason', '손가락 여섯 — 부분 보정'); await page.dispatchEvent('#r-reason', 'change');
  await page.click('[data-move="pending"]');
  await page.waitForSelector('[data-move="approved"]');
  assert.match(await page.textContent('#panel'), /승인 대기 — 검수 칸이 잠겼다/);
  await page.click('[data-tab="check"]');
  assert(await page.$eval('[data-check="hands"][data-v="pass"]', b => b.disabled), '승인 대기 = 검수 칸 잠금');

  /* 다른 검수자 — 잠금 */
  await page.fill('#me', '검수B'); await page.dispatchEvent('#me', 'change');
  assert.match(await page.textContent('#panel'), /검수A 가 .* 잠갔다/);
  assert(await page.$eval('[data-move="approved"]', b => b.disabled), '다른 사람은 승인 못 함');
  await page.fill('#me', '검수A'); await page.dispatchEvent('#me', 'change');
  await page.click('[data-move="approved"]');
  await page.waitForSelector('[data-move="done"]');
  await page.click('[data-tab="guide"]');
  const steps = await page.$$('[data-step]');
  assert(steps.length >= 6, '승인 뒤 할 일: 다시 만들기 + 공방 차례 + 교체 + 장부');
  assert.match(await page.textContent('#d-body'), /수정 범위대로 다시 만들기\(지시문 고쳐 다시\)/, '수정 요청을 담으면 범위가 「지시문 고쳐 다시」');
  await page.click('[data-step] >> nth=0');  /* 누르면 판이 다시 그려진다 — 요소를 들고 있지 않는다 */
  assert(await page.$eval('[data-step]', c => c.checked));
  await page.waitForFunction(() => document.querySelector('.prog i').style.width !== '0%');
  await page.click('[data-tab="record"]');
  await page.fill('#c-sha', 'abc123d'); await page.dispatchEvent('#c-sha', 'change');
  await page.selectOption('#p-state', 'pushed');
  assert.equal(await page.inputValue('#c-state'), 'local', 'SHA 를 적으면 로컬 커밋');
  assert.match(await page.textContent('.log'), /main 반영/);
  await page.click('#d-close');

  /* 중복 — 같은 파일을 직접 더하면 막고 그 작업을 연다 */
  await page.fill('#q', '');
  await page.click('#add');
  await page.selectOption('#add-form [name=project]', 'element');
  await page.fill('#add-form [name=file]', first.file); await page.dispatchEvent('#add-form [name=file]', 'input');
  assert.equal(await page.inputValue('#add-form [name=card]'), first.info.card, '파일 이름에서 카드');
  await page.click('#add-form [type=submit]');
  await page.waitForFunction(() => /중복/.test(document.querySelector('#toast').textContent));
  assert(await page.isVisible('#sheet'), '중복이면 있던 작업을 연다');
  await page.click('#d-close');

  /* 거르기 — 오류 유형 · 상태 */
  await page.selectOption('#f-error', 'hand');
  assert.equal(await page.$$eval('.tile', t => t.length), 1, '손 오류 거르기');
  await page.selectOption('#f-error', '');
  await page.selectOption('#f-status', 'approved');
  assert.equal(await page.$$eval('.col', c => c.length), 1, '상태 거르면 그 칸만');
  await page.selectOption('#f-status', '');

  /* 저장 — 다시 열어도 장부가 남는다 */
  await page.reload();
  await page.waitForSelector('.tile');
  assert.equal(await page.$$eval('.tile', t => t.length), tiles);
  assert.match(await page.textContent('.col[aria-label="승인"]'), new RegExp(first.info.card));

  /* 공방 기준 · 규칙 묶음 */
  await page.click('#tab-rules');
  assert.equal(await page.$$eval('#rules .proj', p => p.length), 6);
  assert.match(await page.textContent('#rules'), /WebP 품질 85/);
  assert.match(await page.textContent('#rules'), /원소의 기호/);
  await page.click('#tab-sets');
  await page.fill('#set-form [name=name]', '메카 장갑');
  await page.fill('#set-form [name=items]', '판이 천처럼 보이지 않는다 | 화풍\n관절이 보인다 | 구도');
  await page.click('#set-form [type=submit]');
  await page.waitForFunction(() => /메카 장갑/.test(document.querySelector('#sets').textContent));
  await page.click('#tab-rules');
  await page.check('#rules .proj:has-text("원소의 섬") input[value^="my-"]');
  await page.click('#tab-board');
  await page.click('.col[aria-label="승인"] .tile');
  await page.click('[data-tab="check"]');
  assert.match(await page.textContent('#d-body'), /판이 천처럼 보이지 않는다/, '내 묶음이 체크리스트에');
  await page.click('#d-close');
  await noOverflow(page, 'PC');
  await ctx.close();

  /* ── 폰 ── */
  const ph = await open({ width: 390, height: 844 });
  await ph.page.fill('#me', '폰'); await ph.page.dispatchEvent('#me', 'change');
  await ph.page.selectOption('#load-project', 'pkm');
  await ph.page.click('#load');
  await ph.page.waitForSelector('.tile');
  await noOverflow(ph.page, '폰 보드');
  await ph.page.click('.tile >> nth=0');
  for (const t of ['guide', 'compare', 'check', 'prompt', 'record']) {
    await ph.page.click('[data-tab="' + t + '"]');
    assert(await ph.page.evaluate(() => { const p = document.querySelector('#panel'); return p.scrollWidth <= p.clientWidth + 1; }), '폰 작업 판 ' + t + ' 옆으로 넘치지 않는다');
  }
  await ph.ctx.close();

  assert.deepEqual(errors, [], '콘솔 오류');
  await browser.close(); server.close();
  console.log('review-screen ok — 원소 후보 ' + tiles + ' · ' + first.file);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
