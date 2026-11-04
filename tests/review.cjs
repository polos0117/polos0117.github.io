/* 그림 검수판(review.js) — 셈만. 화면은 tests/review-screen.cjs.
   파일 이름 읽기(옆 공방 저장소의 등록부 전부) · 후보 · 체크리스트(묶음 합치기 · 2:3 자동 판정) · 지시문 트리(원문 자리) · 명령문 · 상태 옮기기(잠금 · 승인 조건) · 중복.
   Run: node tests/review.cjs   (옆 저장소가 없으면 등록부 대목만 건너뜀) */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..'), SIB = path.resolve(ROOT, '..'), R = require(path.join(ROOT, 'review.js'));

/* 공방 여섯, 공방마다 규칙 · 생성 기준 · 할 일이 따로 */
assert.deepEqual(R.PROJECTS.map(p => p.key), ['pkm', 'book', 'game', 'element', 'myth', 'sam']);
for (const p of R.PROJECTS) {
  assert(p.rules.length >= 3 && p.gen.length >= 2 && p.post.length >= 3, p.key + ' 규칙 · 기준 · 할 일');
  for (const id of p.ruleSets) assert(R.ruleSet(id), p.key + ' 묶음 ' + id);
  assert(p.ruleSets.includes('frame') && p.ruleSets.includes('limbs') && p.ruleSets.includes('one-woman'), p.key + ' 판형 · 팔다리 · 한 명 묶음을 다시 쓴다');
  assert.equal(p.ruleSets.filter(id => /^text-/.test(id)).length, 1, p.key + ' 글자 규칙은 하나');
}
assert(R.project('element').ruleSets.includes('text-element') && R.project('sam').ruleSets.includes('text-sam'));

/* 파일 이름 */
const pk = R.project('pkm'), el = R.project('element'), bk = R.project('book'), my = R.project('myth'), sm = R.project('sam'), gm = R.project('game');
assert.deepEqual(R.parseFile(pk, '제크로무_light_overdrive_glossy_promo_f.webp'), { card: '제크로무', slot: 'light_overdrive', cut: '', style: 'glossy_promo', place: 'light_overdrive' });
assert.equal(R.parseFile(pk, '제크로무_glossy_promo_f_casual2.webp').place, 'casual2');
assert.deepEqual(R.parseFile(el, 'c-diamond-drill_mecha_game_keyart_f_casual3.webp'), { card: 'c-diamond-drill', slot: 'mecha', cut: 'casual3', style: 'game_keyart', place: 'mecha · casual3' });
assert.equal(R.parseFile(bk, 'the_martian_begin_open_literary_fantasy_f.webp').card, 'the_martian');
assert.equal(R.parseFile(bk, 'the_martian_begin_open_literary_fantasy_f.webp').slot, 'begin_open');
assert.equal(R.parseFile(gm, 'world_of_warcraft_title_glossy_kr_game_f.webp').slot, 'title');
assert.equal(R.parseFile(my, '관창의_창_game_keyart_f_awaken.webp').place, 'awaken');
assert.equal(R.parseFile(my, '관창의_창_game_keyart_f_skin_frost_cursed.webp').cut, 'skin_frost_cursed');
assert.equal(R.parseFile(sm, '강유_fantasy_kr_mmorpg_f.webp').slot, 'fantasy');
assert.equal(R.parseFile(pk, 'readme.txt'), null);
assert.equal(R.parseFile(pk, '제크로무_unknown_style_f.webp'), null, '모르는 화풍 열쇠는 읽지 않는다');

/* 그림 주소 — 포켓몬은 where 로 저장소 */
assert.equal(R.imageURL(pk, 'a_light_glossy_promo_f.webp', { where: { 'a_light_glossy_promo_f.webp': 3 } }), 'https://polos0117.github.io/pkm-atelier-img-4/img/a_light_glossy_promo_f.webp');
assert.equal(R.imageURL(el, "o'x_fantasy_game_keyart_f.webp", {}, true), 'https://polos0117.github.io/element-atelier-img/img/thumb/o%27x_fantasy_game_keyart_f.webp');

/* 옆 공방 저장소의 등록부 — 모든 등록 파일을 읽고, 후보는 최근 날부터 */
const have = R.PROJECTS.filter(p => fs.existsSync(path.join(SIB, p.repo, 'data/img.json')));
for (const p of have) {
  const doc = JSON.parse(fs.readFileSync(path.join(SIB, p.repo, 'data/img.json'), 'utf8'));
  const files = Object.keys(doc.added || {});
  const bad = files.filter(f => !R.parseFile(p, f));
  assert.equal(bad.length, 0, p.key + ' 못 읽은 파일: ' + bad.slice(0, 3).join(', '));
  const c = R.candidates(p, doc, { limit: 30 });
  assert(c.length > 0, p.key + ' 후보');
  for (let i = 1; i < c.length; i++) assert((c[i - 1].at || c[i - 1].date) >= (c[i].at || c[i].date), p.key + ' 최근 순');
  assert.equal(c[0].priority, 2, p.key + ' 마지막 날은 높음');
}
if (have.length < R.PROJECTS.length) console.log('(등록부 없는 공방 건너뜀: ' + R.PROJECTS.filter(p => !have.includes(p)).map(p => p.repo).join(', ') + ')');

/* 체크리스트 — 묶음 합치기, 일상컷 묶음은 일상컷에만, 사용자 묶음 */
const base = R.checklist(pk, { place: 'light' }), cas = R.checklist(pk, { place: 'casual1' });
const ids = base.map(c => c.id);
for (const id of ['ratio', 'size', 'webp', 'adult', 'one', 'arms', 'hands', 'fingers', 'face-cam', 'head-feet', 'text', 'creature']) assert(ids.includes(id), '포켓몬 항목 ' + id);
assert.equal(new Set(ids).size, ids.length, '같은 항목 한 번');
assert(!ids.includes('casual-face') && cas.some(c => c.id === 'casual-face'), '일상컷 묶음은 일상컷에만');
assert.match(R.checklist(el, { place: 'fantasy' }).find(c => c.id === 'text').label, /원소의 기호/);
const custom = [{ id: 'my-mecha', name: '메카 장갑', items: [{ id: 'plates', label: '판이 천처럼 보이지 않는다', type: 'style', kind: 'manual' }] }];
assert(R.checklist(Object.assign({}, el, { ruleSets: el.ruleSets.concat('my-mecha') }), { place: 'mecha' }, custom).some(c => c.id === 'plates'), '사용자 묶음');

/* 자동 판정 */
assert.deepEqual(R.autoCheck({ w: 1024, h: 1536, type: 'image/webp' }), { ratio: 'pass', size: 'pass', webp: 'pass' });
assert.deepEqual(R.autoCheck({ w: 1536, h: 1024, type: 'image/png', name: 'a.png' }), { ratio: 'fail', size: 'fail', webp: 'fail' });
assert.deepEqual(R.autoCheck({ w: 832, h: 1248, name: 'x.webp' }), { ratio: 'pass', size: 'fail', webp: 'pass' }, '2:3 이지만 크기가 다르다');

/* 지시문 트리 — 머리말 줄 · 갈래 · 번호 절 · 글머리, 원문 자리 */
const P1 = 'CONCEPT: the personification of Silicon — the sovereign; her costume carries traits.\nFACE — her own person: oval face; wide almond eyes; thin lips.\nSTYLE: Polished 2.5D game key art.\n\nONE FIGURE ONLY. No second character.';
const t1 = R.parsePrompt(P1), top1 = t1.children.map(n => n.kind + ':' + n.label);
assert.deepEqual(top1, ['key:CONCEPT', 'key:FACE — her own person', 'key:STYLE', 'para:ONE FIGURE ONLY. No second character.']);
const face = t1.children[1];
assert.deepEqual(face.children.map(c => c.text), ['oval face', 'wide almond eyes', 'thin lips.']);
for (const { node } of R.flatten(t1)) assert.equal(P1.slice(node.start, node.start + node.text.split('\n')[0].length), node.text.split('\n')[0], '원문 자리 ' + node.label);
assert.deepEqual(R.pathOf(t1, face.children[1].id), ['FACE — her own person', 'wide almond eyes']);
const P2 = '1. 작화 스타일\n\n* 작화 장비 비교 계열: 디지털 페인팅 — 가챠 카드 일러스트\n* 상세 작화 스타일\n  00 POSITIVE - 기술 작화\n  형태 언어: 얇은 선화 — 매끈한 곡면\n\n2. 캐릭터 외형\n\n* 정체: 원소 헬륨';
const t2 = R.parsePrompt(P2);
assert.deepEqual(t2.children.map(n => n.label), ['1. 작화 스타일', '2. 캐릭터 외형']);
assert.deepEqual(t2.children[0].children.map(n => n.kind + ':' + n.label), ['item:작화 장비 비교 계열', 'item:상세 작화 스타일', 'sub:00 POSITIVE - 기술 작화']);
assert.deepEqual(t2.children[0].children[2].children.map(n => n.label), ['형태 언어']);
assert.equal(t2.children[0].children[0].children.length, 2, '글머리 값도 갈래');
/* 공방 지시문 묶음 꼴(빈 줄로 나뉜 머리말 단락) — 실제 파일이 있으면 */
const pack = path.join(SIB, 'pkm-atelier-img-4/records/zekrom-20261103-api-light/light-prompt.txt');
if (fs.existsSync(pack)) {
  const txt = fs.readFileSync(pack, 'utf8'), t = R.parsePrompt(txt), heads = t.children.filter(n => n.kind === 'key').map(n => n.label.split(' ')[0]);
  for (const h of ['INPUT', 'SOURCE', 'PALETTE', 'STYLE', 'SUBJECT', 'WEAR', 'FACE', 'HAIR', 'FORM', 'OUTPUT', 'ANATOMY', 'BODY', 'HANDS']) assert(heads.includes(h), '지시문 묶음 머리말 ' + h);
  for (const { node } of R.flatten(t)) { const n = Math.min(15, node.text.length); assert.equal(txt.slice(node.start, node.start + n), node.text.slice(0, n)); }
}

/* 명령문 */
const cmd = R.composeCommand({ project: 'element', card: 'si', place: 'fantasy', file: 'si_fantasy_game_keyart_f.webp', sha256: 'a'.repeat(64), errors: [{ label: '손', verdict: '확인됨', note: '왼손 손가락 여섯' }] }, [
  { path: ['STYLE'], quote: 'Polished 2.5D game key art.', action: 'replace', text: 'Painted 2.5D key art.', why: '2D 쏠림' },
  { path: ['FACE — her own person', 'thin lips.'], quote: 'thin lips.', action: 'remove' },
  { path: ['CONCEPT'], quote: 'the sovereign', action: 'keep' }]);
assert.match(cmd, /^\[원소의 섬\] si · fantasy — 지시문 수정 요청/);
assert.match(cmd, /1\. \[STYLE\] 「Polished 2\.5D game key art\.」 을\(를\) 「Painted 2\.5D key art\.」 로 바꿔줘 \(까닭: 2D 쏠림\)/);
assert.match(cmd, /2\. \[FACE — her own person › thin lips\.\] 「thin lips\.」 을\(를\) 빼줘/);
assert.match(cmd, /3\. .*바꾸지 말아줘/);
assert.match(cmd, /검수에서 나온 것: 손\(확인됨\) 왼손 손가락 여섯/);
assert.match(cmd, /지킬 것:/);
assert(!/지킬 것/.test(R.composeCommand({ project: 'pkm', card: 'x' }, [])), '요청이 없으면 머리만');

/* 상태 옮기기 — 잠금 · 승인 전 잠금 · 승인 조건 */
const list = R.checklist(pk, { place: 'light' });
let it = R.newItem({ project: 'pkm', card: '큐레무', place: 'light', file: '큐레무_light_glossy_promo_f.webp' }, '2026-11-04T00:00:00Z');
assert.equal(R.transition(it, 'review', '').ok, false, '이름 없이는 못 옮김');
assert.equal(R.transition(it, 'approved', 'A').ok, false, '후보에서 바로 승인 안 됨');
let r = R.transition(it, 'review', 'A', list); assert(r.ok); it = r.item;
assert.deepEqual([it.status, it.lock.by], ['review', 'A']);
assert(R.lockedFor(it, 'B') && R.readOnly(it, 'B') && !R.readOnly(it, 'A'));
assert.match(R.transition(it, 'pending', 'B', list).why, /A 가 잠근/);
r = R.transition(it, 'pending', 'A', list); assert(!r.ok); assert.match(r.why, /판정 안 함/);
list.forEach(c => { it.checks[c.id] = 'pass'; });
it.checks.fingers = 'fail';
assert.match(R.transition(it, 'pending', 'A', list).why, /수정 범위가 없음/);
it.errors.push({ type: 'hand', verdict: 'needs_review', note: '' });
assert.match(R.transition(it, 'pending', 'A', list).why, /검토 필요/);
it.errors[0].verdict = 'confirmed'; it.scope = 'partial';
it.replacement = { on: true, oldSha: '', reason: '' };
assert.match(R.transition(it, 'pending', 'A', list).why, /교체 사유/);
it.replacement = { on: true, oldSha: 'b'.repeat(64), reason: '손가락 여섯' };
r = R.transition(it, 'pending', 'A', list); assert(r.ok, r.why); it = r.item;
assert(it.status === 'pending' && R.readOnly(it, 'A'), '승인 대기는 검수 칸이 잠긴다');
r = R.transition(it, 'approved', 'A', list); assert(r.ok); it = r.item;
assert.equal(it.approvedBy, 'A');
assert.equal(R.transition(it, 'candidate', 'A').ok, false);
r = R.transition(it, 'done', 'A', list); assert(r.ok); assert(r.item.history.length >= 4);

/* 중복 — 같은 자리의 진행 중 작업 · 같은 sha256, 끝난 작업은 안 막는다 */
const a1 = R.newItem({ project: 'pkm', card: '큐레무', place: 'light' }), a2 = R.newItem({ project: 'pkm', card: '큐레무', place: 'light' });
assert.equal(R.duplicates([a1], a2).length, 1);
a1.status = 'done'; assert.equal(R.duplicates([a1], a2).length, 0);
a1.revised = { sha256: 'c'.repeat(64) }; a2.original = { sha256: 'c'.repeat(64) };
assert.match(R.duplicates([a1], a2)[0].why, /같은 그림/);
assert.equal(R.duplicates([a2], a2).length, 0, '자기 자신은 아니다');

/* 잠금 파일 */
assert.deepEqual(R.claimState({ runs: [{ status: 'complete', execution: 'x' }, { status: 'working', execution: 'y', claimed_at: 't', missing: ['a'] }] }), { status: 'working', execution: 'y', at: 't', busy: true, missing: ['a'] });
assert.equal(R.claimState({ runs: [] }), null);

/* 승인 뒤 할 일 — 공방 차례 + 다시 그림 · 교체 */
const ps = R.postSteps(el, { scope: 'prompt', replacement: { on: true, oldSha: 'd'.repeat(64), newSha: '' } });
assert.match(ps[0].label, /다시 만들기/);
assert(ps.some(s => /replacement\.json/.test(s.label)) && ps.some(s => s.id === 'repl') && ps[ps.length - 1].id === 'ledger');
assert(R.postSteps(pk, {}).some(s => /품질 85/.test(s.label)), '포켓몬 WebP 85');
assert(R.postSteps(el, {}).some(s => /품질 90/.test(s.label)), '원소 WebP 90');

/* 찾기 · 줄 세우기 · 장부 합치기 */
const items = [R.newItem({ project: 'pkm', card: '가', place: 'light', priority: 3, errors: [{ type: 'hand', verdict: 'confirmed' }] }), R.newItem({ project: 'element', card: '나', place: 'mecha', priority: 1 })];
assert.deepEqual(items.filter(x => R.matches(x, { error: 'hand' })).map(x => x.card), ['가']);
assert.deepEqual(items.filter(x => R.matches(x, { q: 'mec' })).map(x => x.card), ['나']);
assert.deepEqual(R.sortItems(items, 'priority').map(x => x.card), ['나', '가']);
const older = Object.assign({}, items[0], { updated: '2000-01-01', note: 'old' }), newer = Object.assign({}, items[0], { updated: '2999-01-01', note: 'new' });
assert.equal(R.mergeLedger([older], [newer])[0].note, 'new');
assert.equal(R.mergeLedger([newer], [older])[0].note, 'new');
console.log('review ok — 공방 ' + R.PROJECTS.length + ' · 묶음 ' + R.RULESETS.length + ' · 등록부 ' + have.length);
