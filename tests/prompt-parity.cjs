/* 통합 생성기 받침(prompt/adapters.js) — 브라우저 없이.
   ① game·book: 허브가 지은 일상컷 지시문 = 그 공방 계획기의 record()(생성기 「기록 내보내기」 와 같은 상태) — 대상 모두 × 트리 안 장면 셋.
   ② 네 공방: 대상 모두가 기본 화풍으로 지어진다(SCENE 줄) · 트리 안 랜덤 장면 스물이 트리가 고칠 데 없이 지어진다 · 화풍마다 한 번.
   옛 생성기 화면과 글자 하나 다르지 않은지는 tests/prompt-screen.cjs(브라우저)가 본다.
   옆 저장소(../game-atelier · ../book-atelier · ../myth-atelier · ../pkm-atelier)가 있어야 한다. Run: node tests/prompt-parity.cjs */
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const H = require('../prompt/adapters.js');
const SIB = path.resolve(__dirname, '../..');
if (H.ORDER.some(k => !fs.existsSync(path.join(SIB, H.get(k).repo, 'data/casual-tree.json')))) { console.log('(옆에 네 공방 저장소가 없어 건너뜀)'); process.exit(0); }
/* 공방 하나를 제 창(맥락)에 — 공방마다 같은 이름(window.AtelierSpec …)을 쓰니 허브 화면처럼 따로 싣는다 */
function boot(k) {
  const a = H.get(k), dir = path.join(SIB, a.repo), w = { console }; w.window = w; vm.createContext(w);
  for (const f of a.libs) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), w, { filename: path.join(dir, f) });
  const d = {}; for (const [n, f] of Object.entries(a.data)) d[n] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  return { a, dir, w, d, S: w.AtelierSpec, CT: w.AtelierCasualTree };
}
/* 트리 안 랜덤 — 허브 랜덤(prompt/hub.js randomFrom)과 같은 차례 */
let seed = 7; const rnd = list => list[(seed = (seed * 1103515245 + 12345) % 2147483648) % list.length];
function randomScene(B, g) {
  const { CT, d, S } = B, T = B.a.tables(S), close = T.close, tree = d.tree;
  let sc = { era: rnd(CT.eras(tree).map(e => e.key)), axes: { ...H.FIXED } };
  for (const k of ['place', 'act', 'ofam', 'frame', 'lens', 'pose', 'orient']) {
    const opts = CT.choices(tree, sc, k, g, close).filter(Boolean);
    if (opts.length) sc[k] = rnd(opts);
    sc = CT.repair(tree, sc, g, close, () => '');
  }
  return sc;
}
let checks = 0;
const AXES = { overall_intensity: 'strong', skin_exposure: 'bold', action_level: 'balanced', separates_preference: 'balanced' };
/* ① */
for (const [k, subjectKey] of [['game', 'source_influence'], ['book', 'source_influence']]) {
  const B = boot(k), cli = require(path.join(B.dir, 'tools/casual-plan.cjs'));
  const scenes = [
    { era: 'now', place: 'street_park', act: 'stroll', ofam: 'everyday', item: '', frame: 'waist_up', lens: 'portrait85', orient: 'front_3q', pose: '', expr: 'calm' },
    { era: 'now', place: 'street_cafe', act: 'read_book', ofam: 'everyday', item: '', frame: 'three_quarter', lens: 'natural50', orient: 'side', pose: '', expr: '' },
    { era: 'now', place: 'water_pool', act: 'poolside', ofam: 'swimwear', item: '', frame: 'full_body', lens: 'natural50', orient: 'front', pose: '', expr: 'confident' }
  ].map(sc => ({ ...B.CT.repair(B.d.tree, sc, null, B.a.tables(B.S).close), axes: { ...AXES, [subjectKey]: 'subtle' } }));
  let n = 0;
  for (const s of B.a.subjects(B.d)) for (const sc of scenes) {
    const g = B.a.subject(B.d, s.key), cut = B.CT.repair(B.d.tree, sc, g, B.a.tables(B.S).close);
    const want = cli.record(g, { n: 1, ...cut }).prompt, got = B.a.build(B.w, B.d, s.key, B.a.defaultStyle(B.d, B.S), cut);
    assert.equal(got, want, k + ' ' + s.key + ' ' + cut.place + '/' + cut.act + ' — 허브와 계획기 record() 가 다르다');
    n++;
  }
  console.log('  ' + k + ': 대상 ' + B.a.subjects(B.d).length + ' × 장면 ' + scenes.length + ' = record() 와 같은 글 ' + n);
  checks++;
}
/* ② */
for (const k of H.ORDER) {
  const B = boot(k), { a, d, S, w } = B, subs = a.subjects(d), def = a.defaultStyle(d, S);
  assert(a.styles(d, S).some(x => x.key === def), k + ' 기본 화풍이 화풍 목록에 있다');
  const base = randomScene(B, a.subject(d, subs[0].key));
  for (const s of subs) {
    const t = a.build(w, d, s.key, def, base);
    assert(t.length > 200 && /SCENE/.test(t), k + ' ' + s.key + ' 지시문');
  }
  for (let i = 0; i < 20; i++) {
    const s = rnd(subs), g = a.subject(d, s.key), sc = randomScene(B, g);
    const again = B.CT.repair(d.tree, sc, g, a.tables(S).close, () => '');
    for (const f of ['era', 'place', 'act', 'ofam', 'frame', 'lens', 'pose', 'orient']) assert.equal(again[f] || '', sc[f] || '', k + ' 랜덤 ' + f + ' 를 트리가 고친다');
    assert(/SCENE/.test(a.build(w, d, s.key, def, sc)), k + ' 랜덤 지시문');
  }
  for (const st of a.styles(d, S)) assert(a.build(w, d, subs[0].key, st.key, base).length > 200, k + ' 화풍 ' + st.key);
  console.log('  ' + k + ': 대상 ' + subs.length + ' · 랜덤 20 · 화풍 ' + a.styles(d, S).length + ' (기본 ' + def + ')');
  checks++;
}
console.log('PASS 통합 생성기 받침: game·book 계획기와 같은 글 · 네 공방 대상·랜덤·화풍 — ' + checks + '가지');
