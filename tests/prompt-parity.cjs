/* 통합 생성기 받침(prompt/adapters.js) — 브라우저 없이.
   ① game·book: 허브가 지은 일상컷 지시문 = 그 공방 계획기의 record()(생성기 「기록 내보내기」 와 같은 상태) — 대상 모두 × 트리 안 장면 셋.
   ② 네 공방: 대상 모두가 기본 화풍으로 지어진다(SCENE 줄) · 트리 안 랜덤 장면 스물이 트리가 고칠 데 없이 지어진다 · 화풍마다 한 번.
   ③ game·book 폼 초상·개방: 대상·폼·인물 기준·노출 모두, 개방 장면마다, 엉망인 저장값 바로잡기, 랜덤 장면.
   ④ 신화 무기 초상·각성·저주·스킨: 무기 모두, 단계 표(prompt/steps.js), 자세 표, 스킨 없는 무기, 엉망인 저장값.
   ⑤ 포켓몬 액션·폭주: 1025 마리 모두, 단계 표, 큰 자료(원작 외형·종별 얼굴) 있고 없고, 엉망인 저장값, 랜덤 장면.
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
    { era: 'now', place: 'water_pool', act: 'poolside', ofam: 'swimwear', item: '', frame: 'full_body', lens: 'natural50', orient: 'front', pose: '', expr: 'confident' },
    /* 덧붙임 글 칸(옷 직접 쓰기·장소·상황·추가 요청) — 계획기 컷은 여기에 옷·장면 첫머리를 쓴다 */
    { era: 'now', place: 'street_park', act: 'stroll', ofam: 'everyday', item: '', frame: 'full_body', lens: 'natural50', orient: 'front', pose: '', expr: '', outfit: 'a cropped denim jacket over a ribbed tank top', scene: 'late afternoon, wet pavement', custom: 'soft rim light' }
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
/* ② — 일상컷 단계를 허브에 두는 공방만(원소는 그 공방 생성기가 트리 버전2 로 — noCasual) */
for (const k of H.ORDER.filter(x => !H.get(x).noCasual)) {
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
/* ③ 폼 초상·개방(game·book) — 대상 모두 × 폼 모두 × 새 인물·이어가기 × 노출 넷, 개방은 개방 장면이 있는 폼마다. 랜덤 연출·외형 열 */
for (const k of H.ORDER.filter(x => H.get(x).forms)) {   // 폼·개방 받침(game·book)
  const B = boot(k), { a, d, S, w } = B, def = a.defaultStyle(d, S), R = w.AtelierSceneRandom;
  let n = 0;
  for (const s of a.subjects(d)) for (const f of a.forms(d)) {
    for (const identityMode of ['create', 'reference']) for (const exposure of S.FORM_EXPOSURE_KEYS) {
      const t = a.buildCard(w, d, s.key, def, 'form', { form: f.key, identityMode, baseForm: a.forms(d)[0].key, exposure });
      assert(t.length > 200 && t.includes(a.facts(d, s.key, f.key).look.slice(0, 10)), k + ' ' + s.key + ' ' + f.key + ' 폼 지시문에 설계표 모습'); n++;
    }
    if (a.facts(d, s.key, f.key).open) { assert(/OPEN/.test(a.buildCard(w, d, s.key, def, 'open', { form: f.key })), k + ' 개방'); n++; }
  }
  /* 저장값이 엉망이어도 기본으로(없는 폼·갈래·노출) */
  const s0 = a.subjects(d)[0].key, bad = a.card(d, s0, S, { form: 'nope', identityMode: 'x', exposure: 'huge', params: 'no', scenes: { form: 3 } });
  assert(a.forms(d).some(f => f.key === bad.form) && bad.identityMode === 'create' && bad.exposure === S.FORM_EXPOSURE_DEFAULT && typeof bad.params === 'object', k + ' 카드 바로잡기');
  for (let i = 0; i < 10; i++) {
    const c = a.card(d, s0, S, null); c.scenes.form = R.randomize({ ...c.scenes.form, randomLocks: {} }, 'form', null, Math.random);
    assert(a.buildCard(w, d, s0, def, 'form', c).length > 200, k + ' 랜덤 장면');
  }
  console.log('  ' + k + ': 폼·개방 지시문 ' + n + ' · 카드 바로잡기 · 랜덤 장면 10');
  checks++;
}
/* ④ 신화 무기(3단계) — 무기 모두 × 초상·각성·저주·스킨, 단계 표(prompt/steps.js)가 무기마다 그려지고, 스킨 없는 무기는 지시문이 없다 */
{
  const ST = require('../prompt/steps.js'), B = boot('myth'), { a, d, S, w } = B, def = a.defaultStyle(d, S);
  const word = (k, fb) => { const t = w.W ? w.W(k) : ''; return t && t !== k ? t : fb; };
  let n = 0, skins = 0;
  for (const s of a.subjects(d)) {
    const g = a.subject(d, s.key);
    for (const out of ['portrait', 'awaken', 'cursed', 'skin']) {
      const c = a.card(d, s.key, S, null), t = a.buildCard(w, d, s.key, def, out, c);
      const steps = ST.myth(out, { A: a, D: d, S, w: word, subject: s.key, g, card: c, rnd: l => l[0] });
      steps.forEach(st => { st.shown(); st.parts.forEach(p => { if (p.opts) typeof p.opts === 'function' ? p.opts() : p.opts; if (p.groups) p.groups.forEach(gr => gr.defs.forEach(df => p.get(df.key))); }); });
      if (out === 'skin' && !(g.skins || []).length) { assert.equal(t, '', s.key + ' 스킨 없음'); continue; }
      assert(t.length > 200 && t.includes(g.en), s.key + ' ' + out); n++;
      if (out === 'skin') skins++;
    }
    /* 자세는 무기 종류마다 — 단계 표의 자세 = 표의 자세 */
    const post = ST.myth('portrait', { A: a, D: d, S, w: word, subject: s.key, g, card: a.card(d, s.key, S, null), rnd: l => l[0] }).filter(x => x.key === 'posture')[0];
    assert.equal(post.parts[0].opts().length, 1 + (S.ACTIONS[g.kind] || []).length, s.key + ' 자세 표');
  }
  const bad = a.card(d, '티르핑', S, { design: 5, extras: 'x', params: [1], skinState: null });
  assert(bad.design === 'mecha' && bad.skinState === 'base' && !Array.isArray(bad.params) && typeof bad.extras === 'object', '신화 카드 바로잡기');
  assert.equal(a.buildCard(w, d, '티르핑', def, 'casual', bad), '', '일상컷은 카드 갈래가 아니다');
  console.log('  myth: 초상·각성·저주·스킨 지시문 ' + n + '(스킨 ' + skins + ') · 단계 표 · 카드 바로잡기');
  checks++;
}
/* ⑤ 포켓몬(4단계) — 1025 마리 × 액션·폭주, 단계 표, 큰 자료(원작 외형·종별 얼굴)가 실리고 없으면 없이, 저장값 바로잡기 */
{
  const ST = require('../prompt/steps.js'), B = boot('pkm'), { a, d, S, w } = B, def = a.defaultStyle(d, S);
  const word = (k, fb) => { const t = w.W ? w.W(k) : ''; return t && t !== k ? t : fb; };
  const bare = a.buildCard(w, d, '피카츄', def, 'action', a.card(d, '피카츄', S, null));   // 큰 자료 없이(못 받았을 때)
  for (const [n, f] of Object.entries(a.lazy)) d[n] = JSON.parse(fs.readFileSync(path.join(B.dir, f), 'utf8'));
  const full = a.buildCard(w, d, '피카츄', def, 'action', a.card(d, '피카츄', S, null));
  assert(bare.length > 200 && full.length > bare.length, '큰 자료가 있으면 원작 특징·종별 얼굴이 더 실린다');
  let n = 0;
  for (const s of a.subjects(d)) {
    const g = a.subject(d, s.key);
    for (const out of ['action', 'open']) {
      const c = a.card(d, s.key, S, null), t = a.buildCard(w, d, s.key, def, out, c);
      assert(t.length > 200 && t.includes(g.en), s.key + ' ' + out); n++;
      ST.pkm(out, { A: a, D: d, S, P: w.AtelierPrompt, R: w.AtelierSceneRandom, w: word, subject: s.key, g, card: c, rnd: l => l[0] }).forEach(st => { st.shown(); st.parts.forEach(p => { if (typeof p.opts === 'function') p.opts(); }); });
    }
  }
  const bad = a.card(d, '피카츄', S, { form: 'overdrive', identityMode: 'x', baseForm: 'nope', headFeature: 3, scenes: { action: 'x' } });
  assert(bad.form === 'light' && bad.identityMode === 'create' && bad.baseForm === 'light' && bad.headFeature === '' && typeof bad.scenes.action === 'object', '포켓몬 카드 바로잡기 — 폭주는 개방 갈래가 붙인다');
  const open = a.buildCard(w, d, '피카츄', def, 'open', { form: 'heavy', baseForm: 'mobility' });
  assert.equal(open, a.buildCard(w, d, '피카츄', def, 'open', { form: 'light', baseForm: 'mobility' }), '개방은 카드의 액션 폼과 상관없다');
  const R = w.AtelierSceneRandom;
  for (let i = 0; i < 10; i++) { const c = a.card(d, '이상해씨', S, null); c.scenes.action = R.randomize({ ...c.scenes.action, randomLocks: {} }, 'action', null, Math.random); assert(a.buildCard(w, d, '이상해씨', def, 'action', c).length > 200, '랜덤 장면'); }
  console.log('  pkm: 액션·폭주 지시문 ' + n + ' · 단계 표 · 큰 자료 있고 없고 · 카드 바로잡기 · 랜덤 장면 10');
  checks++;
}
/* ⑥ 원소(5단계) — 카드 55 × 사는 세계, 단계 표(세계 · 덧붙임), 일상컷은 허브 갈래가 아니다(그 공방 생성기로 가는 문), 엉망인 저장값 */
{
  const ST = require('../prompt/steps.js'), B = boot('element'), { a, d, S, w } = B, def = a.defaultStyle(d, S);
  const word = (k, fb) => { const t = w.W ? w.W(k) : ''; return t && t !== k ? t : fb; };
  const subs = a.subjects(d); assert(subs.length >= 40, '원소 카드 수 ' + subs.length);
  let n = 0;
  for (const s of subs) {
    const g = a.subject(d, s.key); assert(g && g.ko === s.ko.replace(' 가문주', ''), s.key + ' 대상');
    const ws = a.worlds(d, s.key); assert(ws.length >= 1 && ws.length <= 3, s.key + ' 세계 수');
    for (const wk of ws) {
      const t = a.buildCard(w, d, s.key, def, 'world', { world: wk, notes: { scene: 'a windy ridge' } });
      assert(t.startsWith('CONCEPT: ') && t.includes(g.element.en) && t.includes('SCENE NOTE: a windy ridge') && (wk !== 'mecha' || t.includes('MECHA DESIGN')), s.key + ' ' + wk); n++;
    }
    const card = a.card(d, s.key, S, { world: ws[0] });
    const steps = ST.element('world', { A: a, D: d, S, P: w.AtelierPrompt, w: word, subject: s.key, g, card, rnd: l => l[0] });
    assert.deepEqual(steps.map(x => x.key), ['world', 'scene', 'pose', 'design', 'look', 'notes'], s.key + ' 단계 표');
    assert(steps[1].parts[1].opts().length >= 3 && steps[2].parts[1].opts().length === 1 + S.WORLD_POSES.length, s.key + ' 장면·자세 선택지');
    assert.equal(steps[0].parts[1].opts().length, ws.length, s.key + ' 세계 선택지');
    steps.forEach(st => { st.shown(); st.parts.forEach(p => { if (typeof p.opts === 'function') p.opts(); }); });
    /* 설계 줄 — 체크의 메모가 설계표 look 의 어휘, 노출 고르개는 표의 열쇠. 외형 — 네 묶음 */
    const design = steps[3], look = steps[4];
    assert(design.parts[1].note.includes(S.VOCAB_EN.hair_color[w.AtelierPrompt.lookOf(g, card.world).silhouette.hair_color]), s.key + ' 실루엣 메모에 설계 머리색');
    assert.equal(JSON.stringify(design.parts[3].opts.map(o => o[0])), JSON.stringify(S.EXPOSURE_KEYS), s.key + ' 노출 고르개');   // vm 영역 배열은 deepEqual 이 못 견준다
    assert.equal(JSON.stringify(look.parts[2].groups.map(gr => gr.key)), JSON.stringify(['base', 'build', 'face', 'hair']), s.key + ' 외형 네 묶음');
  }
  /* 외형 칸이 지시문에 — 세계마다 따로, 직접 고른 머리색이 실루엣을 이기고 IDENTITY 에, 끄면 빠진다, 노출 */
  {
    const c = a.card(d, 'fe', S, { world: 'mecha', looks: { mecha: { params: { 'hair color': 'silver', bogus: 'x' }, exposure: 'low' }, fantasy: { faceDesignOn: false } }, shots: { mecha: { scene: 'foundry', time: 'night', pose: 'stride', expr: 'confident', zz: 1 }, fantasy: { scene: 'foundry' } } });
    assert.equal(JSON.stringify(c.shots.mecha), '{"scene":"foundry","time":"night","pose":"stride","expr":"confident"}', '장면 칸 바로잡기');
    assert.equal(JSON.stringify(Object.keys(c.looks).sort()), '["fantasy","mecha"]'); assert.equal(JSON.stringify(c.looks.mecha.params), '{"hair color":"silver"}', '모르는 열쇠는 버린다');
    const t = a.buildCard(w, d, 'fe', def, 'world', c);
    assert(t.includes('IDENTITY (chosen details override the automatic look)\nhair color: silver') && !t.includes('iron-grey hair') && t.includes('EXPOSURE (low)') && t.includes('FACE ('), '메카 외형 ' + t.slice(0, 80));
    assert(t.includes('SETTING (this card): the orbital foundry floor') && t.includes('TIME & WEATHER: night') && t.includes('Mid-stride') && t.includes('EXPRESSION: level brow'), '메카 장면·시간대·자세·표정');
    c.world = 'fantasy';
    const t2 = a.buildCard(w, d, 'fe', def, 'world', c);
    assert(!t2.includes('FACE (') && t2.includes('iron-grey hair') && t2.includes('EXPOSURE (bold)') && !t2.includes('IDENTITY (') && !t2.includes('SETTING (this card)') && t2.includes('Standing, card-ready pose'), '판타지는 그 세계의 외형·장면 칸(메카 장면 열쇠는 판타지에 없다)');
    const steps0 = ST.element('world', { A: a, D: d, S, P: w.AtelierPrompt, w: word, subject: 'fe', g: a.subject(d, 'fe'), card: c, rnd: l => l[0] });
    steps0[1].parts[1].set('forge'); steps0[1].parts[2].set('dawn'); steps0[2].parts[1].set('kneel');
    const t3 = a.buildCard(w, d, 'fe', def, 'world', c); assert(t3.includes('SETTING (this card): inside the great forge') && t3.includes('TIME & WEATHER: first light of dawn') && t3.includes('Down on one knee'), '장면·자세 단계가 그 세계 칸을 고친다');
    assert.match(steps0[1].shown(), /대장간 안 · 새벽/); assert.match(steps0[2].shown(), /한쪽 무릎/);
    const steps = ST.element('world', { A: a, D: d, S, P: w.AtelierPrompt, w: word, subject: 'fe', g: a.subject(d, 'fe'), card: c, rnd: l => l[0] });
    steps[3].parts[2].set(true); assert(a.buildCard(w, d, 'fe', def, 'world', c).includes('FACE ('), '설계 줄 체크가 그 세계 칸을 고친다');
    steps[4].parts[1].items[0].run(); assert(Object.keys(c.looks.fantasy.params).length > 5 && !c.looks.fantasy.params['hair color'] && !c.looks.fantasy.params['face shape'], '외형 무작위는 설계가 쥔 칸을 비워 둔다');
    steps[4].parts[1].items[1].run(); assert.equal(JSON.stringify(c.looks.fantasy.params), '{}', '외형 초기화');
  }
  assert.equal(a.buildCard(w, d, 'fe', def, 'world', a.card(d, 'fe', S, null)), '', '세계를 안 고르면 지시문이 없다');
  assert.equal(a.buildCard(w, d, 'fe', def, 'casual', { world: 'fantasy' }), '', '일상컷은 허브 갈래가 아니다');
  assert(a.outputs().some(o => o.key === 'casual' && /element-atelier\/prompt\.html/.test(o.href)), '일상컷은 그 공방 생성기로 가는 문');
  const bad = a.card(d, 'fe-steel-bridge', S, { world: 'fantasy', notes: 'x' });
  assert.equal(bad.world, '', '철교는 판타지에 안 산다 — 비운다'); assert.deepEqual(bad.notes, { scene: '', outfit: '', custom: '' }, '덧붙임 바로잡기');
  console.log('  element: 세계 지시문 ' + n + ' · 카드 ' + subs.length + ' · 단계 표(세계·장면·자세·설계 줄·외형·덧붙임) · 장면·시간대·자세·표정(세계마다) · 외형 칸(세계마다·이김·끄기·노출·무작위) · 일상컷 문 · 카드 바로잡기');
  checks++;
}
console.log('PASS 통합 생성기 받침: game·book 계획기와 같은 글 · 네 공방 대상·랜덤·화풍 · game·book 폼·개방 · 신화 초상·각성·저주·스킨 · 포켓몬 액션·폭주 · 원소 세계 그림 — ' + checks + '가지');
