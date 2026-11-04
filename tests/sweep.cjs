/* 세부 항목 시험(sweep.js) — 셈만. 화면은 tests/sweep-screen.cjs.
   지시문: 한 항목만 바뀌고 나머지 줄은 같다 · 시험하지 않는 칸은 고정 말 · 말/수치 판 · 저장 이름 · 3/5 단계 · 반복. 재기: 비율 셈. 판정: 반영됨 · 약하게 · 안 됨 · 아직 모름.
   Run: node tests/sweep.cjs */
const assert = require('node:assert/strict'), path = require('node:path');
const W = require(path.join(__dirname, '..', 'sweep.js'));

const keys = W.ATTRS.map(a => a.key);
for (const k of ['eye_spacing', 'face_length', 'face_shape', 'nose_size', 'nose_shape', 'eye_size', 'eye_shape', 'head_size', 'neck_length', 'body', 'render']) assert(keys.includes(k), '항목 ' + k);
for (const a of W.ATTRS) {
  assert.equal(a.levels.length, 5, a.key + ' 다섯 단계');
  if (a.kind === 'scale' && !a.judge) assert(a.points && a.points.length >= 3 && a.metric, a.key + ' 잴 점');
  for (const l of a.levels) { assert(l.ko && l.en && !/[가-힣]/.test(l.en), a.key + ' 단계 말'); if (l.num) assert(!/[가-힣]/.test(l.num)); }
}

/* 지시문 — 수 · 이름 · 3단계는 양 끝과 가운데 */
const P = W.build({ attrs: ['eye_spacing', 'render', 'body'], levels: 3, reps: 2, wording: 'words', style: 'keyart' });
assert.equal(P.length, 3 * 3 * 2);
assert.deepEqual([...new Set(P.filter(p => p.attr === 'eye_spacing').map(p => p.level))], [0, 2, 4]);
assert.equal(P[0].file, 'sweep-eye_spacing-L1-r1.png');
assert.equal(new Set(P.map(p => p.file)).size, P.length, '저장 이름이 겹치지 않는다');
assert.equal(W.build({ attrs: ['nose_size'], levels: 5, reps: 1 }).length, 5);
assert.equal(W.build({ attrs: ['nose_size'], levels: 3, reps: 9 }).length, 15, '반복은 5까지');

/* 한 항목만 바뀐다 — 같은 항목의 지시문끼리는 TEST(또는 render 의 STYLE) 줄 하나만 다르다 */
const lines = t => t.split('\n\n');
for (const k of ['eye_spacing', 'nose_size', 'head_size', 'render', 'face_shape']) {
  const ps = W.build({ attrs: [k], levels: 5, reps: 1, wording: 'words', style: 'keyart' });
  const base = lines(ps[0].text);
  for (const p of ps.slice(1)) {
    const l = lines(p.text); assert.equal(l.length, base.length, k + ' 줄 수');
    const diff = l.map((x, i) => x !== base[i] ? i : -1).filter(i => i >= 0);
    assert.equal(diff.length, 1, k + ' 바뀐 줄은 하나: ' + diff);
    assert(/^(TEST — |STYLE: )/.test(l[diff[0]]), k + ' 바뀐 줄은 시험 줄');
  }
  /* 같은 단계 반복은 글자 하나 다르지 않다 */
  const rep = W.build({ attrs: [k], levels: 3, reps: 2 }); assert.equal(rep[0].text, rep[1].text);
}
/* 시험하지 않는 칸은 고정 말, 시험하는 칸은 고정 말에 없다 */
const es = W.build({ attrs: ['eye_spacing'], levels: 3, reps: 1 })[0].text;
assert(es.includes('KEEP AVERAGE:') && es.includes(W.NEUTRAL.nose_size) && es.includes(W.NEUTRAL.face_length) && !es.includes(W.NEUTRAL.eye_spacing));
assert(es.includes('Chest-up portrait') && !es.includes('Full-body'), '얼굴 항목은 가슴 위');
const hb = W.build({ attrs: ['head_size'], levels: 3, reps: 1 })[0].text;
assert(hb.includes('Full-body front view') && hb.includes(W.NEUTRAL.body) && !hb.includes(W.NEUTRAL.head_size), '머리 크기는 전신 · 체형 고정');
const ns = W.build({ attrs: ['nose_size'], levels: 3, reps: 1 })[0].text;
assert(!ns.includes(W.NEUTRAL.nose_shape), '코 크기를 볼 땐 코 모양 고정 말도 뺀다(서로 겹친다)');
/* 화풍 — render 는 화풍 줄이 시험 줄, 나머지는 고른 바탕 화풍 */
const rd = W.build({ attrs: ['render'], levels: 5, reps: 1 });
assert(rd[0].text.includes('STYLE: flat cel-shaded') && rd[4].text.includes('STYLE: a photorealistic') && !rd[0].text.includes('TEST —') && rd[0].text.includes('KEEP AVERAGE'));
assert(W.build({ attrs: ['eye_size'], style: 'none' })[0].text.indexOf('STYLE:') < 0, '화풍 줄 없음');
assert(W.build({ attrs: ['eye_size'], style: 'painted' })[0].text.includes('Semi-realistic digital painting'));
/* 말 판 · 수치 판 */
assert(W.build({ attrs: ['eye_spacing'], wording: 'numbers' })[0].text.includes('half an eye-width apart'));
assert(W.build({ attrs: ['eye_spacing'], wording: 'words' })[0].text.includes('very close-set eyes'));
assert(W.build({ attrs: ['face_shape'], wording: 'numbers' })[0].text.includes('a round face'), '수치 판이 없는 갈래는 말 판');
/* 세션 묶음 글 */
const pack = W.packText(P);
assert(pack.startsWith('### 1/18 · ') && pack.includes('저장 이름 sweep-body-L5-r2.png') && pack.split('\n---\n').length === 18);
/* 앞 그림을 쓰지 않는 줄 · 원작 인물 아님 · 한 명 */
for (const p of P) assert(p.text.includes('do not use or imitate any earlier image') && p.text.includes('not a known character') && p.text.includes('One person only'));

/* 재기 — 비율 */
const pts4 = (a, b, c, d) => [a, b, c, d].map(([x, y]) => ({ x, y }));
assert.equal(W.ratio('eye_spacing', pts4([.45, .3], [.55, .3], [.25, .3], [.75, .3]), 1024, 1536), 0.2);
assert.equal(W.ratio('face_length', pts4([.5, .2], [.5, .5], [.3, .35], [.7, .35]), 1024, 1536), Math.round((.3 * 1536) / (.4 * 1024) * 1000) / 1000, '세로는 높이로');
assert.equal(W.ratio('head_size', [{ x: .5, y: .05 }, { x: .5, y: .17 }, { x: .5, y: .95 }], 1024, 1536), 7.5);
assert.equal(W.ratio('neck_length', [{ x: .5, y: .1 }, { x: .5, y: .3 }, { x: .5, y: .4 }], 1, 1), 0.5);
assert.equal(W.ratio('eye_spacing', [{ x: 0, y: 0 }]), null, '점이 모자라면 없음');
assert.equal(W.ratio('face_shape', []), null, '갈래 항목은 비율이 없다');

/* 판정 */
const sc = vals => vals.flatMap((v, li) => v.map(x => ({ level: li * 2, value: x })));
assert.equal(W.verdict('eye_spacing', sc([[.18, .2], [.25, .26], [.32, .31]])).result, 'yes', '차례대로 · 흔들림보다 큰 단계');
assert.equal(W.verdict('eye_spacing', sc([[.25, .2], [.24, .27], [.3, .26]])).result, 'weak', '끝과 끝만 흔들림보다 크다');
assert.equal(W.verdict('eye_spacing', sc([[.25, .2], [.21, .26], [.24, .22]])).result, 'no');
assert.equal(W.verdict('eye_spacing', sc([[.2], [.25], [.3]])).result, 'open', '반복이 없으면 흔들림을 모른다');
assert.equal(W.verdict('eye_spacing', []).result, 'open');
assert.equal(W.verdict('render', sc([[1, 1], [3, 3], [5, 4]])).result, 'yes', '눈 판정도 같은 셈');
assert.equal(W.verdict('render', sc([[2, 2], [2, 3], [2, 2]])).result, 'no', '세션이 늘 같은 화풍으로 그리면 안 됨');
const kd = W.verdict('face_shape', [{ level: 0, hit: 'yes' }, { level: 1, hit: 'yes' }, { level: 2, hit: 'yes' }, { level: 3, hit: 'maybe' }]);
assert.deepEqual([kd.result, kd.share, kd.total], ['yes', 75, 4]);
assert.equal(W.verdict('face_shape', [{ level: 0, hit: 'no' }, { level: 1, hit: 'maybe' }]).result, 'no');
assert.equal(W.verdict('face_shape', [{ level: 0 }]).result, 'open');
console.log('sweep ok — 항목 ' + W.ATTRS.length + ' · 지시문 한 줄만 바뀜 · 재기 · 판정');
