/* 세부 항목 시험 — 이미지 생성 도구가 얼굴 · 몸 · 화풍의 작은 차이를 얼마나 받아들이는지, 한 항목만 단계별로 바꾼 세션 지시문으로 시험한다(2026-11-04).
   화면은 sweep.html, 검사는 tests/sweep.cjs · tests/sweep-screen.cjs. 그림은 만들지 않는다 — 지시문을 만들고, 받은 그림을 놓고 재고, 판정한다.

   AtelierSweep.ATTRS            — 시험 항목(미간 · 얼굴 길이 · 얼굴형 · 코 크기 · 코 모양 · 눈 크기 · 눈 모양 · 머리 크기 · 목 길이 · 체형 · 2D↔실사)
                                    kind: 'scale'(차례가 있는 단계 — 점을 찍어 비율로 잰다) · 'kind'(갈래 — 맞음 · 애매 · 아님으로 본다)
   AtelierSweep.build(opt)       → 지시문 목록 [{id, attr, level, rep, file, text}] — opt {attrs, levels(단계 수 3 · 5), reps, wording('words' · 'numbers'), style}
   AtelierSweep.ratio(attr, pts) → 그 항목의 비율(점 차례는 ATTRS[].points)
   AtelierSweep.verdict(attr, cells) → {result: 'yes'|'weak'|'no'|'open', means, spread, steps, monotonic, hits} */
(function (root) {
  'use strict';

  /* 얼굴 · 몸의 기본값 — 시험하지 않는 칸은 늘 이 말로 고정한다(다른 칸이 같이 흔들리면 무엇이 먹혔는지 모른다) */
  var NEUTRAL = {
    eye_spacing: 'eyes set one eye-width apart',
    face_length: 'a balanced oval face about 1.3 times as long as it is wide',
    face_shape: 'an oval face',
    nose_size: 'a medium-sized nose',
    nose_shape: 'a straight nose',
    eye_size: 'medium-sized eyes',
    eye_shape: 'almond-shaped eyes with level outer corners',
    head_size: 'natural adult proportions, about 7.5 heads tall',
    neck_length: 'a neck of average length',
    body: 'a slim, average build'
  };
  var FACE_FRAME = 'Chest-up portrait, head and shoulders centred, facing the camera straight on, head level, neutral relaxed expression with lips closed, both eyes fully open looking at the camera. Plain mid-grey studio background, soft even front light, no strong shadows on the face.';
  var BODY_FRAME = 'Full-body front view, head and feet inside the frame with clear margins, standing straight facing the camera, arms relaxed at her sides, feet together. She wears a simple fitted dark grey long-sleeved bodysuit and flat shoes. Plain mid-grey studio background, soft even light.';

  /* 단계 — 다섯 단계를 적고, 셋으로 시험하면 1 · 3 · 5 번째를 쓴다. num 은 수치로 쓰는 판(없으면 말 판과 같다) */
  var ATTRS = [
    { key: 'eye_spacing', ko: '미간(눈 사이)', kind: 'scale', frame: 'face', metric: '눈 안쪽 끝 사이 ÷ 눈높이의 얼굴 폭',
      points: ['왼눈 안쪽 끝', '오른눈 안쪽 끝', '눈높이 얼굴 왼쪽 끝', '눈높이 얼굴 오른쪽 끝'],
      levels: [
        { ko: '아주 좁게', en: 'very close-set eyes, almost touching the bridge of the nose', num: 'eyes set only half an eye-width apart' },
        { ko: '좁게', en: 'close-set eyes', num: 'eyes set three quarters of an eye-width apart' },
        { ko: '보통', en: 'eyes set an average distance apart', num: 'eyes set exactly one eye-width apart' },
        { ko: '넓게', en: 'wide-set eyes', num: 'eyes set one and a quarter eye-widths apart' },
        { ko: '아주 넓게', en: 'very wide-set eyes, a broad space between them', num: 'eyes set one and a half eye-widths apart' }] },
    { key: 'face_length', ko: '얼굴 길이', kind: 'scale', frame: 'face', metric: '이마 머리선~턱끝 ÷ 광대 폭',
      points: ['이마 머리선 가운데', '턱끝', '광대 높이 얼굴 왼쪽 끝', '광대 높이 얼굴 오른쪽 끝'],
      levels: [
        { ko: '아주 짧게', en: 'a very short, round face', num: 'a face only 1.1 times as long as it is wide' },
        { ko: '짧게', en: 'a short face', num: 'a face 1.2 times as long as it is wide' },
        { ko: '보통', en: 'a face of balanced length', num: 'a face 1.3 times as long as it is wide' },
        { ko: '길게', en: 'a long face', num: 'a face 1.45 times as long as it is wide' },
        { ko: '아주 길게', en: 'a very long, narrow face', num: 'a face 1.6 times as long as it is wide' }] },
    { key: 'face_shape', ko: '얼굴형', kind: 'kind', frame: 'face',
      levels: [{ ko: '둥근', en: 'a round face with full cheeks and a rounded chin' }, { ko: '달걀', en: 'an oval face' }, { ko: '하트', en: 'a heart-shaped face — wide forehead, narrow pointed chin' },
        { ko: '각진', en: 'a square face with a strong, angular jaw' }, { ko: '다이아몬드', en: 'a diamond-shaped face — high, wide cheekbones, narrow forehead and chin' }] },
    { key: 'nose_size', ko: '코 크기', kind: 'scale', frame: 'face', metric: '콧방울 폭 ÷ 얼굴 폭',
      points: ['왼쪽 콧방울 끝', '오른쪽 콧방울 끝', '코 높이 얼굴 왼쪽 끝', '코 높이 얼굴 오른쪽 끝'],
      levels: [
        { ko: '아주 작게', en: 'a very small, delicate nose', num: 'a narrow nose, its width only half the distance between the eyes' },
        { ko: '작게', en: 'a small nose', num: 'a nose about three quarters as wide as the distance between the eyes' },
        { ko: '보통', en: 'a medium-sized nose', num: 'a nose as wide as the distance between the eyes' },
        { ko: '크게', en: 'a large nose', num: 'a nose a quarter wider than the distance between the eyes' },
        { ko: '아주 크게', en: 'a very large, prominent nose', num: 'a broad nose one and a half times the distance between the eyes' }] },
    { key: 'nose_shape', ko: '코 모양', kind: 'kind', frame: 'face',
      levels: [{ ko: '단추코', en: 'a small button nose' }, { ko: '곧은 코', en: 'a straight narrow nose' }, { ko: '매부리코', en: 'an aquiline nose with a high, slightly hooked bridge' },
        { ko: '들창코', en: 'an upturned nose with the tip pointing slightly up' }, { ko: '넓고 낮은 코', en: 'a wide nose with a low, flat bridge' }] },
    { key: 'eye_size', ko: '눈 크기', kind: 'scale', frame: 'face', metric: '한쪽 눈 가로 ÷ 눈높이의 얼굴 폭',
      points: ['왼눈 바깥 끝', '왼눈 안쪽 끝', '눈높이 얼굴 왼쪽 끝', '눈높이 얼굴 오른쪽 끝'],
      levels: [
        { ko: '아주 작게', en: 'very small eyes', num: 'small eyes, each about one sixth of the face width' },
        { ko: '작게', en: 'small eyes', num: 'eyes each about one fifth of the face width, slightly small' },
        { ko: '보통', en: 'medium-sized eyes', num: 'eyes each about one fifth of the face width' },
        { ko: '크게', en: 'large eyes', num: 'large eyes, each about one quarter of the face width' },
        { ko: '아주 크게', en: 'very large eyes', num: 'very large eyes, each nearly one third of the face width' }] },
    { key: 'eye_shape', ko: '눈 모양', kind: 'kind', frame: 'face',
      levels: [{ ko: '둥근 눈', en: 'round eyes' }, { ko: '아몬드 눈', en: 'almond-shaped eyes' }, { ko: '외꺼풀 가는 눈', en: 'narrow monolid eyes' },
        { ko: '올라간 눈', en: 'upturned cat-like eyes, outer corners lifted' }, { ko: '처진 눈', en: 'downturned eyes, outer corners drooping' }] },
    { key: 'head_size', ko: '머리 크기(등신)', kind: 'scale', frame: 'body', metric: '키 ÷ 머리 높이(몇 등신)',
      points: ['정수리', '턱끝', '발바닥'],
      levels: [
        { ko: '아주 작은 머리', en: 'a very small head and very long legs, fashion-illustration proportions', num: 'a small head, about 8.5 heads tall' },
        { ko: '작은 머리', en: 'a small head', num: 'about 8 heads tall' },
        { ko: '보통', en: 'natural adult proportions', num: 'about 7.5 heads tall' },
        { ko: '큰 머리', en: 'a slightly large head for her body', num: 'about 7 heads tall' },
        { ko: '아주 큰 머리', en: 'a large head and short legs, compact proportions', num: 'about 6.5 heads tall' }] },
    { key: 'neck_length', ko: '목 길이', kind: 'scale', frame: 'face', metric: '턱끝~목 아래 오목한 곳 ÷ 머리선~턱끝',
      points: ['이마 머리선 가운데', '턱끝', '목 아래 쇄골 사이 오목한 곳'],
      levels: [
        { ko: '아주 짧게', en: 'a very short neck', num: 'a short neck, only a third as long as her face' },
        { ko: '짧게', en: 'a short neck', num: 'a neck about two fifths as long as her face' },
        { ko: '보통', en: 'a neck of average length', num: 'a neck about half as long as her face' },
        { ko: '길게', en: 'a long, slender neck', num: 'a neck about three fifths as long as her face' },
        { ko: '아주 길게', en: 'a very long, swan-like neck', num: 'a long neck about three quarters as long as her face' }] },
    { key: 'body', ko: '세부 체형', kind: 'kind', frame: 'body',
      levels: [{ ko: '마른', en: 'a very slim, slender build' }, { ko: '탄탄한', en: 'a toned athletic build' }, { ko: '굴곡형', en: 'a curvy hourglass build with full bust and rounded hips' },
        { ko: '풍만한', en: 'a soft, full-figured build' }, { ko: '근육형', en: 'a muscular, strong build with defined shoulders and arms' }] },
    { key: 'render', ko: '2D ↔ 실사', kind: 'scale', frame: 'face', judge: true, metric: '눈으로 — 다섯 단계 중 어디로 보이는가(1~5)',
      levels: [
        { ko: '평면 2D', en: 'flat cel-shaded 2D anime illustration with bold outlines and one flat shadow tone' },
        { ko: '2.5D 키아트', en: 'polished 2.5D game key art with clean thin linework and layered soft shading' },
        { ko: '반실사 페인팅', en: 'semi-realistic digital painting with soft painterly rendering and natural facial volume' },
        { ko: '시네마틱 CGI', en: 'high-end cinematic 3D CGI render with realistic skin shading and studio lighting' },
        { ko: '사진', en: 'a photorealistic studio photograph of a real woman, natural skin texture' }] }
  ];
  var STYLES = [
    { key: 'keyart', ko: '2.5D 키아트(원소 v2 문장)', en: 'Polished 2.5D game key art with clean linework, anime facial design that keeps each character\'s own facial structure, eye proportions and skin tone instead of one house face, layered cel-to-soft shading. Campaign-quality lighting.' },
    { key: 'painted', ko: '반실사 페인팅', en: 'Semi-realistic digital painting with soft painterly rendering and natural facial volume.' },
    { key: 'none', ko: '화풍 줄 없음', en: '' }];
  var LEVEL3 = [0, 2, 4];

  function attr(k) { for (var i = 0; i < ATTRS.length; i++) if (ATTRS[i].key === k) return ATTRS[i]; return null; }
  function style(k) { for (var i = 0; i < STYLES.length; i++) if (STYLES[i].key === k) return STYLES[i]; return STYLES[0]; }
  /* 고른 단계 차례(0~4) */
  function levelIdx(n) { return n === 5 ? [0, 1, 2, 3, 4] : LEVEL3; }
  function phrase(a, lv, wording) { return wording === 'numbers' && lv.num ? lv.num : lv.en; }
  /* 시험하지 않는 칸의 고정 말 — 시험 항목 칸만 뺀다. 머리 크기 · 체형은 전신 컷에서만 의미가 있다 */
  function fixed(a) {
    var face = ['face_length', 'face_shape', 'eye_spacing', 'eye_size', 'eye_shape', 'nose_size', 'nose_shape', 'neck_length'];
    var skip = { face_length: ['face_shape'], face_shape: ['face_length'], eye_size: [], eye_shape: [], nose_size: ['nose_shape'], nose_shape: ['nose_size'] }[a.key] || [];
    var keys = a.frame === 'body' ? face.concat(['head_size', 'body']) : face;
    return keys.filter(function (k) { return k !== a.key && skip.indexOf(k) < 0; }).map(function (k) { return NEUTRAL[k]; });
  }
  function promptText(a, lv, opt) {
    var st = a.key === 'render' ? null : style(opt.style), lines = [];
    lines.push('Create one vertical 2:3 image (1024×1536). Text only — do not use or imitate any earlier image in this conversation.');
    lines.push('SUBJECT: one original adult woman in her mid-twenties — not a known character. Black shoulder-length straight hair tucked behind her ears, dark brown eyes, light warm skin, no makeup, no jewellery.');
    lines.push('FRAME: ' + (a.frame === 'body' ? BODY_FRAME : FACE_FRAME));
    if (a.key === 'render') lines.push('STYLE: ' + phrase(a, lv, opt.wording) + '.');
    else if (st.en) lines.push('STYLE: ' + st.en);
    if (a.key !== 'render') lines.push('TEST — ' + a.key.toUpperCase().replace('_', ' ') + ': ' + phrase(a, lv, opt.wording) + '. Make this feature clearly as described.');
    var f = fixed(a);
    if (f.length) lines.push('KEEP AVERAGE: ' + f.join('; ') + '.');
    lines.push('One person only. No text, logo, watermark or frame border. Natural adult anatomy.');
    return lines.join('\n\n');
  }
  function fileName(a, li, rep) { return 'sweep-' + a.key + '-L' + (li + 1) + '-r' + rep + '.png'; }
  function build(opt) {
    opt = opt || {};
    var attrs = (opt.attrs && opt.attrs.length ? opt.attrs : ATTRS.map(function (a) { return a.key; })).map(attr).filter(Boolean);
    var reps = Math.max(1, Math.min(5, opt.reps || 2)), idx = levelIdx(opt.levels), out = [];
    attrs.forEach(function (a) {
      idx.forEach(function (li, n) {
        for (var r = 1; r <= reps; r++) out.push({ id: a.key + '-' + (li + 1) + '-' + r, attr: a.key, level: li, step: n, rep: r, ko: a.ko + ' · ' + a.levels[li].ko + ' · ' + r + '번째', file: fileName(a, li, r), text: promptText(a, a.levels[li], opt) });
      });
    });
    return out;
  }
  /* 세션에 넘길 글 하나로 — 지시문마다 새 대화(또는 앞 그림을 안 쓰는 줄)로 넘기라는 안내가 앞에 붙는다 */
  function packText(list) {
    return list.map(function (p, i) { return '### ' + (i + 1) + '/' + list.length + ' · ' + p.ko + ' — 저장 이름 ' + p.file + '\n\n' + p.text; }).join('\n\n---\n\n');
  }

  /* ── 재기 ── 점은 그림 안 비율 좌표 {x, y}(0~1). 그림 가로세로가 다르므로 w · h 를 곱해 픽셀 거리로 */
  function dist(p, q, w, h) { var dx = (p.x - q.x) * (w || 1), dy = (p.y - q.y) * (h || 1); return Math.sqrt(dx * dx + dy * dy); }
  function ratio(key, pts, w, h) {
    var a = attr(key); if (!a || !a.points || !pts || pts.length < a.points.length) return null;
    var d = function (i, j) { return dist(pts[i], pts[j], w, h); };
    var r;
    if (key === 'head_size') r = d(0, 2) / d(0, 1);         /* 키 ÷ 머리 */
    else if (key === 'neck_length') r = d(1, 2) / d(0, 1);   /* 목 ÷ 얼굴 */
    else if (key === 'face_length') r = d(0, 1) / d(2, 3);   /* 길이 ÷ 폭 */
    else r = d(0, 1) / d(2, 3);                              /* 미간 · 코 · 눈 ÷ 얼굴 폭 */
    return isFinite(r) && r > 0 ? Math.round(r * 1000) / 1000 : null;
  }

  /* ── 판정 ── cells: [{level, value}] (scale — 비율 또는 눈 판정 1~5) · [{level, hit: 'yes'|'maybe'|'no'}] (kind)
     scale: 단계 평균이 차례대로 늘거나 줄고(monotonic), 이웃 단계 평균 차이의 가장 작은 것이 같은 단계 안 흔들림(범위의 평균)보다 크면 yes,
            끝과 끝 차이만 흔들림보다 크면 weak, 아니면 no. 단계마다 값이 둘 이상 없으면 open(아직 모름) */
  function verdict(key, cells) {
    var a = attr(key); if (!a) return null;
    cells = (cells || []).filter(function (c) { return c && c.level != null; });
    if (a.kind === 'kind') {
      var done = cells.filter(function (c) { return c.hit; });
      if (!done.length) return { result: 'open', hits: { yes: 0, maybe: 0, no: 0 }, total: 0 };
      var h = { yes: 0, maybe: 0, no: 0 }; done.forEach(function (c) { h[c.hit] = (h[c.hit] || 0) + 1; });
      var share = h.yes / done.length;
      return { result: share >= 0.75 ? 'yes' : share >= 0.4 ? 'weak' : 'no', hits: h, total: done.length, share: Math.round(share * 100) };
    }
    var by = {}; cells.forEach(function (c) { if (typeof c.value === 'number' && isFinite(c.value)) (by[c.level] = by[c.level] || []).push(c.value); });
    var lv = Object.keys(by).map(Number).sort(function (x, y) { return x - y; });
    if (lv.length < 2) return { result: 'open', means: [], spread: null };
    var means = lv.map(function (l) { var v = by[l]; return v.reduce(function (s, x) { return s + x; }, 0) / v.length; });
    var ranges = lv.map(function (l) { var v = by[l]; return v.length > 1 ? Math.max.apply(null, v) - Math.min.apply(null, v) : null; }).filter(function (x) { return x != null; });
    var spread = ranges.length ? ranges.reduce(function (s, x) { return s + x; }, 0) / ranges.length : null;
    var steps = []; for (var i = 1; i < means.length; i++) steps.push(means[i] - means[i - 1]);
    var up = steps.every(function (s) { return s > 0; }), down = steps.every(function (s) { return s < 0; });
    var minStep = Math.min.apply(null, steps.map(Math.abs)), span = Math.abs(means[means.length - 1] - means[0]);
    var r4 = function (x) { return x == null ? null : Math.round(x * 1000) / 1000; };
    var out = { levels: lv, means: means.map(r4), spread: r4(spread), steps: steps.map(r4), monotonic: up || down, span: r4(span) };
    if (spread == null) { out.result = 'open'; out.why = '같은 단계를 두 번 이상 재야 흔들림을 안다'; return out; }
    out.result = (up || down) && minStep > spread ? 'yes' : span > spread ? 'weak' : 'no';
    return out;
  }
  var RESULT_KO = { yes: '반영됨', weak: '약하게 반영', no: '반영 안 됨', open: '아직 모름' };

  var API = { ATTRS: ATTRS, STYLES: STYLES, NEUTRAL: NEUTRAL, RESULT_KO: RESULT_KO, attr: attr, style: style, levelIdx: levelIdx, build: build, packText: packText, promptText: promptText, fixed: fixed, ratio: ratio, verdict: verdict, fileName: fileName };
  if (typeof module === 'object' && module.exports) module.exports = API; else root.AtelierSweep = API;
})(this);
