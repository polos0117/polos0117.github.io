/* 도트 공방 — dot/dot.wasm 싣개와 화면 없는 셈(상태 차림 · 생성 지시문 · 정리 기록 · sprites.json 칸 · 공방 그림 목록).
   dot.html 과 tests/dot.cjs 가 같이 쓴다. 브라우저에서는 window.AtelierDot, node 에서는 require.
   wasm 의 소스는 rust/dot-core · rust/dot-wasm — 셈은 book-atelier 의 파이썬 도트 도구(sprite-grid · sprite-sheet · sprite-bob)를
   옮긴 것이라 같은 원본·같은 인자면 화소 하나 다르지 않다(rust/README.md). 붙임 생성기 없이 포인터·길이만 손으로 잇는다. */
(function (root) {
  'use strict';

  var API = 3;   // 2 — frames_sheet(칸마다 따로 뽑은 원본) · 걷기 4칸 · 3 — still 이 칸 크기·격자 찾기 간격 범위를 받는다(4K)
  var CELL = [96, 128], FOOT = [48, 126];

  /* 상태 — 칸 수·생성 시트의 칸 배치·재생 차례와 칸마다 시간(book 서재 세 인물이 쓰는 값) */
  var STATES = {
    still: { frames: 1 },
    idle: { frames: 4, grid: [2, 2], order: [0, 1, 2, 3], ms: [700, 220, 140, 220] },
    walk: { frames: 6, grid: [3, 2], order: [0, 1, 2, 3, 4, 5], ms: [200, 200, 200, 200, 200, 200] },
    /* 걷기 4칸을 칸마다 따로 뽑는다(시험 — Layer layer-pixel-art 스킬의 요령: 한 장에 여러 칸을 그리면 칸마다 인물이 흔들린다).
       접지 · 지나감 · 거울 접지 · 거울 지나감. 정리본은 …_walk4.png, 공방 재생기에는 걷기(walk) 자리로 들어간다 */
    walk4: { frames: 4, separate: true, as: 'walk', order: [0, 1, 2, 3], ms: [250, 250, 250, 250] },
    react: { frames: 4, grid: [2, 2], order: [0, 1, 2, 3], ms: [120, 180, 320, 200] }
  };
  /* 정리 기본값 — 손자·춘향 때 굳힌 것: 정지는 121줄 고른 격자 + 바깥 윤곽(123줄), 시트는 정지 도트 키(121줄)에 맞춘다 */
  var CLEAN = {
    still: { colors: 24, rows: 121, outline: true },
    sheet: { rows: 121, speck: 40, cell: CELL, lo: 9, hi: 14, fixedPitch: 0 }
  };

  /* ── wasm ── */
  function load(src) {
    var get = typeof src === 'string'
      ? fetch(src).then(function (r) { if (!r.ok) throw new Error('dot.wasm ' + r.status); return r.arrayBuffer(); })
      : Promise.resolve(src);
    return get.then(function (buf) { return WebAssembly.instantiate(buf, {}); }).then(function (m) { return wrap(m.instance.exports); });
  }

  function wrap(X) {
    var dec = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
    function mem() { return new Uint8Array(X.memory.buffer); }
    function text(p, n) { var b = mem().slice(p, p + n); return dec ? dec.decode(b) : Buffer.from(b).toString('utf8'); }
    function err() { return new Error(text(X.err_ptr(), X.err_len())); }
    function json() { return JSON.parse(text(X.json_ptr(), X.json_len())); }
    function withBytes(bytes, f) {
      var n = bytes.length, p = X.alloc(n);
      mem().set(bytes, p);
      try { return f(p, n); } finally { X.dealloc(p, n); }
    }
    function id(v) { if (v < 0) throw err(); return v; }
    function ok(v) { if (v < 0) throw err(); }
    var D = {
      api: X.api_version(),
      hash: text(X.source_hash_ptr(), X.source_hash_len()),
      /* PNG 바이트 → 그림 번호 */
      decode: function (bytes) { return withBytes(bytes, function (p, n) { return id(X.decode(p, n)); }); },
      /* 브라우저가 푼 RGBA → 그림 번호 */
      put: function (rgba, w, h) { return withBytes(rgba, function (p) { return id(X.put(p, w, h)); }); },
      free: function (i) { X.free(i); },
      size: function (i) { return [X.img_w(i), X.img_h(i)]; },
      rgba: function (i) { var w = X.img_w(i), h = X.img_h(i), p = X.img_ptr(i); return { w: w, h: h, data: new Uint8ClampedArray(mem().slice(p, p + w * h * 4)) }; },
      png: function (i) { ok(X.encode(i)); var p = X.bytes_ptr(); return mem().slice(p, p + X.bytes_len()); },
      /* 정지 도트 한 장 → { id, info } */
      still: function (i, o) {
        o = Object.assign({}, CLEAN.still, o || {});
        var c = o.cell || [0, 0], pr = !o.rows && o.pitch ? o.pitch : [0, 0];
        var r = id(X.still(i, o.colors, o.rows || 0, o.outline ? 1 : 0, c[0], c[1], pr[0], pr[1]));
        return { id: r, info: json() };
      },
      /* 동작 시트 → { id, info }. stillId 는 정지 도트(팔레트를 거기서 뽑는다) */
      sheet: function (i, stillId, o) {
        o = Object.assign({}, CLEAN.sheet, o || {});
        var g = o.grid || [0, 0], c = o.cell || [0, 0];
        var r = id(X.sheet(i, stillId, o.frames, g[0], g[1], o.rows || 0, o.fixedPitch || 0, o.lo, o.hi, o.speck, c[0], c[1]));
        return { id: r, info: json() };
      },
      /* 칸마다 따로 뽑은 원본 여러 장 → { id, info } */
      framesSheet: function (ids, stillId, o) {
        o = Object.assign({}, CLEAN.sheet, o || {});
        var c = o.cell || [0, 0], n = ids.length, p = X.alloc(n * 4);
        try {
          new Int32Array(X.memory.buffer, p, n).set(ids);
          var r = id(X.frames_sheet(p, n, stillId, o.rows || 0, o.fixedPitch || 0, o.lo, o.hi, o.speck, c[0], c[1]));
          return { id: r, info: json() };
        } finally { X.dealloc(p, n * 4); }
      },
      bob: function (i, cw, amount) { ok(X.bob(i, cw || CELL[0], amount == null ? 1 : amount)); return json(); },
      stride: function (i, cw, ms) { ok(X.stride(i, cw || CELL[0], ms || 200)); return json(); }
    };
    if (D.api !== API) throw new Error('dot.wasm 내보내기 판이 다르다(' + D.api + ' ≠ ' + API + ') — dot.js 와 같이 다시 지어 올릴 것');
    return D;
  }

  /* 정리 인자 — 파이썬 도구와 같은 꼴(기록의 args, dot-cli 도 같다) */
  function args(state, o, paletteFile) {
    if (state === 'still') {
      o = Object.assign({}, CLEAN.still, o || {});
      /* 격자 찾기의 간격 범위·칸은 기본(9.5~14 · 96×128)과 다를 때만 — 앞선 기록의 인자 꼴을 그대로 두게 */
      return [String(o.colors)].concat(o.rows ? ['--rows', String(o.rows)] : o.pitch ? ['--pitch', o.pitch.join(',')] : []).concat(o.outline ? ['--outline'] : [])
        .concat(o.cell && (o.cell[0] !== CELL[0] || o.cell[1] !== CELL[1]) ? ['--cell', o.cell.join('x')] : []);
    }
    o = Object.assign({}, CLEAN.sheet, { frames: STATES[state].frames, grid: STATES[state].grid }, o || {});
    var a = (STATES[state].separate ? ['--separate'] : []).concat(['--frames', String(o.frames)]);
    if (STATES[state].separate) o.grid = null;   // 칸마다 따로 — 명령줄은 dot frames
    if (o.grid) a.push('--grid', o.grid.join('x'));
    a.push('--palette', paletteFile || '<정지 도트>');
    if (o.rows) a.push('--rows', String(o.rows));
    else if (o.fixedPitch) a.push('--fixed-pitch', String(o.fixedPitch));
    if (!o.rows) a.push('--pitch', o.lo + ',' + o.hi);
    a.push('--speck', String(o.speck));
    if (o.cell) a.push('--cell', o.cell.join('x'));
    return a;
  }

  /* ── 파일 이름 · 자리 (그림 저장소 sprites/ — img/ 밖이라 등록기·썸네일이 읽지 않는다) ── */
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
  function names(id, form, state, gen, version) {
    var stem = id + '_' + (form || 'base') + '_' + state, st = STATES[state] || {};
    var raws = st.separate ? st.order.map(function (_, k) { return 'sprites/' + id + '/raw/' + stem + '_' + (k + 1) + '_gen' + (gen || 1) + '.png'; }) : null;
    var n = {
      raw: raws ? raws[0] : 'sprites/' + id + '/raw/' + stem + '_gen' + (gen || 1) + '.png',
      cleaned: 'sprites/' + id + '/' + stem + (version ? '_' + version : '') + '.png',
      record: 'records/sprites/' + id + '/' + state + (version ? '_' + version : '') + '.json',
      x6: id + '_' + (form || 'base') + '_still_x6.png'
    };
    if (raws) n.raws = raws;   // 칸마다 따로 뽑는 상태 — 원본이 칸 수만큼
    return n;
  }

  /* ── 원본 번호 — 그림 저장소의 기록(records/sprites/<이름>/<상태>.json, 판 붙은 <상태>_v2.json …)에 적힌 원본 파일에서 가장 큰 gen.
     새 기록은 generation.file 또는 generation.files[].file(걷기 4칸), 앞선 book 기록은 generations[].file. 없으면 0 ── */
  var RECORD_VERSIONS = ['', '_v2', '_v3', '_v4', '_4k'];   // _4k — 4K 시험 한 벌(앨리스)
  function recordPaths(id, state) { return RECORD_VERSIONS.map(function (v) { return 'records/sprites/' + id + '/' + state + v + '.json'; }); }
  function recordedGen(docs, id, form, state) {
    var re = new RegExp('^' + id.replace(/[^a-z0-9_]/g, '') + '_' + (form || 'base').replace(/[^a-z0-9_]/g, '') + '_' + state + '(?:_[1-4])?_gen(\\d+)\\.png$'), top = 0;
    (docs || []).forEach(function (d) {
      if (!d || typeof d !== 'object') return;
      var files = [], g = d.generation;
      if (g && typeof g === 'object') { if (g.file) files.push(g.file); (g.files || []).forEach(function (f) { if (f && f.file) files.push(f.file); }); }
      (Array.isArray(d.generations) ? d.generations : []).forEach(function (f) { if (f && f.file) files.push(f.file); });
      files.forEach(function (f) { var m = re.exec(String(f).split('/').pop()); if (m) top = Math.max(top, +m[1]); });
    });
    return top;
  }

  /* ── 생성 지시문 (GPT 이미지 생성에 그대로) — book-atelier docs/ATELIER_PIXEL_ART_PLAN.md 11절에서 일반화 ── */
  var SUBJECTS = {
    woman: 'young woman', man: 'young man', person: 'character', mech: 'robot mecha', creature: 'creature'
  };
  /* 캔버스 크기 — 지시문의 화소 블록(정지·단칸)·시트 칸 블록·발 기준선이 따라간다. 4K 는 같은 121줄인데 블록이 두 배라 격자·색이 깨끗하다(값은 네 배쯤) */
  var CANVAS = {
    '1024x1536': { w: 1024, h: 1536, block: 12, sheet: 6, base: 40, name: '보통 1024×1536',
      clean: { still: { rows: 121, cell: [96, 128] }, sheet: { rows: 121, speck: 40, cell: [96, 128] }, foot: [48, 126], bob: 1 } },
    /* 4K 정리(2026-10-28 시험, docs/DOT_4K_PLAN.md): 모델은 지시한 25px 가 아니라 약 16px 블록으로 그린다 — 정지는 격자 찾기(간격 10~24, 14px 로 그려도 잡힌다)로
       원본 격자 그대로(앨리스 100×232), 칸 192×256. 시트는 정지 도트 키에 맞춘다(rows 'still' — 격자 찾기는 칸마다 키가 214~243 으로 흔들렸다), 쪼가리는 면적만큼 150 */
    '2160x3840': { w: 2160, h: 3840, block: 25, sheet: 13, base: 84, name: '4K 2160×3840 — 원본 격자 그대로(약 230줄 · 칸 192×256), 값 2.5배쯤',
      clean: { still: { rows: 0, pitch: [10, 24], cell: [192, 256] }, sheet: { rows: 'still', speck: 150, cell: [192, 256] }, foot: [96, 254], bob: 2 } }
  };
  var SIZE = '1024x1536';
  function canvasOf(o) { return CANVAS[o && o.size] || CANVAS[SIZE]; }
  var CLEAN_LINE = 'Hard edges only: no anti-aliasing, no blur, no gradients, no dithering noise.';
  var NO_EXTRA = 'Transparent background. No grid lines, no cell borders, no numbers, no labels, no text, no ground, no shadow, no motion lines, no extra characters.';

  function stillPrompt(o) {
    var who = SUBJECTS[o.subject] || o.subject || 'character', L = [];
    L.push('Pixel art game sprite of the SAME ' + who + ' shown in attached image 1. Copy the face, hair, skin tone, outfit and palette from image 1.');
    if (o.outfit) L.push('Attached image 2 shows the outfit to draw — take only the clothes from it.');
    var n = o.outfit ? 3 : 2;
    /* 본보기 — 같은 공방의 다른 인물(옷·색은 따르지 않는다) 또는 이 인물의 확정 도트(같은 인물이니 다 따른다). 둘 다면 이 인물 쪽 */
    if (o.sampleSelf) L.push('Attached image ' + n + ' is this same character\'s approved sprite: match its pixel size, outline, shading and proportions exactly.');
    else if (o.sample) L.push('Attached image ' + n + ' is a finished sprite of a different character from the same game: match its pixel size, outline, shading style and body proportions exactly, but NOT its outfit or colours.');
    if (o.identity) L.push(o.identity.trim());
    L.push('Do not draw any background, furniture, props or scenery from the attachments.', '');
    var C = canvasOf(o);
    L.push('Draw with very large chunky pixels (each sprite pixel a crisp ' + C.block + ' x ' + C.block + ' square), about 16 colours,',
      'about 4 heads tall (not chibi), and about half the decoration of image 1 — keep only the shapes that',
      'make the character recognisable at small size. One full-body character, standing idle on flat ground,',
      'three-quarter view turned slightly toward the viewer\'s right, arms relaxed, feet close together.',
      CLEAN_LINE + ' Dark selective outline,',
      'simple 2-3 tone shading lit from the upper left. Keep the face readable: two clear eyes, small mouth.',
      'Transparent background. If transparency is not possible, use one flat solid #00FF00 green with nothing else.',
      'No ground shadow, no floor, no text, no frame, no border, no second character.',
      'Portrait canvas ' + C.w + ' x ' + C.h + '.');
    return L.join('\n');
  }

  function sheetHead(o, title, refNo) {
    return [
      title + ' of the EXACT same character as attached image 1 — a finished pixel-art sprite.',
      'Copy it pixel for pixel in style: same very large chunky pixels, same 16-colour palette, same dark outline,',
      'same proportions (about 4 heads tall), same face.' + (o.identity ? ' ' + o.identity.trim() : ''),
      'Keep decoration as simple as image 1 — do not add new details. Image ' + refNo + ' is only a colour and face reference; do not copy its painterly style.'
    ];
  }
  function layout(o, cols, rows) {
    var C = canvasOf(o), cw = Math.floor(C.w / cols), ch = Math.floor(C.h / rows);
    return [
      'Sheet layout: portrait canvas ' + C.w + ' x ' + C.h + ', ' + (cols * rows) + ' frames in a ' + cols + ' x ' + rows + ' grid (cell ' + cw + ' x ' + ch + '), read left to right, top to bottom.',
      'In every cell the character is the same size (about 125 pixels tall on the sprite\'s own pixel grid, each sprite pixel',
      'drawn as a crisp ' + C.sheet + ' x ' + C.sheet + ' square), centred horizontally, with both feet on the same baseline near the bottom of the cell.',
      'Every frame faces the same direction as described below. ' + CLEAN_LINE,
      NO_EXTRA
    ];
  }

  var IDLE = [
    'IDLE animation, 4 frames. Same standing pose as image 1, three-quarter view turned slightly toward the viewer\'s right, arms relaxed.',
    'Changes between frames are tiny (1-2 sprite pixels): frame 1 = exactly image 1; frame 2 = slight breath in, shoulders and hair 1 pixel up;',
    'frame 3 = same as frame 2 but eyes closed (blink); frame 4 = back between frame 2 and frame 1.',
    'Feet never move. The loop 4 -> 1 must be seamless.'
  ];
  var REACT = [
    'REACT animation when selected, 4 frames. Starts and ends in the image 1 pose.',
    'frame 1 = image 1 pose; frame 2 = turns head and body toward the viewer with a small pleased expression;',
    'frame 3 = a small greeting that suits the character (a light bow, a curtsy or a small wave), knees slightly bent, body 2-3 pixels lower;',
    'frame 4 = rising back halfway toward the image 1 pose. Feet stay on the baseline.'
  ];
  var LEGS = [
    'LEGS — follow attached image 2 exactly, cell by cell (dark navy = the NEAR leg, the one closer to the viewer;',
    'grey = the FAR leg). Do not copy image 2\'s shapes or colours, only where each leg and foot is:',
    'frame 1 = contact: NEAR leg reaches forward, heel down; FAR leg stretched back, only its toe touching.',
    'frame 2 = down: weight on the NEAR leg, knee slightly bent, body 1 pixel lower; FAR foot lifting off behind.',
    'frame 3 = passing: NEAR leg straight under the body; FAR leg swings forward past it with the knee lifted; body 1 pixel higher.',
    'frame 4 = contact, the MIRROR of frame 1: FAR leg reaches forward, heel down; NEAR leg stretched BACK, only its toe touching.',
    'frame 5 = down: weight on the FAR leg; NEAR foot lifting off behind; body 1 pixel lower.',
    'frame 6 = passing: FAR leg straight under the body; NEAR leg swings forward past it with the knee lifted; body 1 pixel higher.',
    'Frames 1 and 4 must look clearly different: in frame 1 the near leg is in front, in frame 4 the near leg is behind.',
    'Arms swing opposite to the legs (near arm back when the near leg is forward). Head height changes by at most 1 sprite pixel',
    'except the rise and fall above. The loop 6 -> 1 must be seamless.'
  ];
  var SKIRT = [
    'LEGS: the legs are hidden by a long skirt or robe — follow attached image 2 only for where the two feet are and how the hem moves:',
    'frame 1 = NEAR foot forward peeking out in front of the hem, FAR foot behind (only its toe showing at the back of the hem); the hem pushes forward;',
    'frame 2 = feet close, hem settles, body 1 pixel lower; frame 3 = FAR foot swinging forward under the hem, body 1 pixel higher;',
    'frame 4 = the MIRROR of frame 1: FAR foot forward in front of the hem, NEAR foot behind; frame 5 = feet close, body 1 pixel lower;',
    'frame 6 = NEAR foot swinging forward under the hem, body 1 pixel higher. Frames 1 and 4 must clearly show a different foot in front.',
    'The hem sways opposite to the forward foot. The loop 6 -> 1 must be seamless.'
  ];

  /* 걷기 4칸 — 칸마다 따로. 칸 하나의 자세(가까운 다리 = 보는 사람 쪽 다리) */
  var WALK4 = [
    'frame 1 of 4 — CONTACT: the NEAR leg (the one closer to the viewer) reaches forward with the heel down; the FAR leg is stretched back with only its toe touching. Near arm swings back, far arm forward.',
    'frame 2 of 4 — PASSING: the weight is on the NEAR leg, straight under the body; the FAR leg swings forward past it with the knee lifted and the foot off the ground. Body 1 sprite pixel higher than frame 1. Arms close to the body.',
    'frame 3 of 4 — CONTACT, the MIRROR of frame 1: the FAR leg reaches forward with the heel down; the NEAR leg is stretched BACK with only its toe touching. Near arm swings forward, far arm back. It must look clearly different from frame 1: here the near leg is behind.',
    'frame 4 of 4 — PASSING, the mirror of frame 2: the weight is on the FAR leg, straight under the body; the NEAR leg swings forward past it with the knee lifted. Body 1 sprite pixel higher than frame 3. Arms close to the body.'
  ];
  var WALK4_SKIRT = [
    'frame 1 of 4 — the legs are hidden by a long skirt or robe: the NEAR foot peeks out forward in front of the hem, the FAR foot is behind (only its toe showing at the back of the hem); the hem pushes forward.',
    'frame 2 of 4 — feet close together under the hem, the FAR foot about to swing forward; the hem settles; body 1 sprite pixel higher than frame 1.',
    'frame 3 of 4 — the MIRROR of frame 1: the FAR foot peeks out forward in front of the hem, the NEAR foot is behind. It must clearly show a different foot in front than frame 1.',
    'frame 4 of 4 — feet close together under the hem, the NEAR foot about to swing forward; body 1 sprite pixel higher than frame 3.'
  ];
  function walk4Prompt(o) {
    var k = Math.min(4, Math.max(1, o.frame || 1)), ref = k === 1 ? 2 : 3, C = canvasOf(o);
    var L = sheetHead(o, 'Pixel art WALK CYCLE frame ' + k + ' of 4', ref);
    if (k > 1) L.push('Attached image 2 is frame 1 of this same walk cycle, already approved: match its character size, position on the canvas, foot baseline, facing and lighting exactly — change only the legs and arms as described below.');
    L.push('', 'Single frame: portrait canvas ' + C.w + ' x ' + C.h + ' with ONE character only (not a sheet, no other frames).',
      'Draw the character the same size as image 1: about 121 sprite pixels tall, each sprite pixel a crisp ' + C.block + ' x ' + C.block + ' square, centred horizontally,',
      'both feet on a baseline about ' + C.base + ' pixels above the bottom edge.',
      'Side three-quarter view walking toward the viewer\'s right, walking in place. ' + CLEAN_LINE,
      NO_EXTRA + ' If transparency is not possible, use one flat solid #00FF00 green with nothing else.', '',
      (o.skirt ? WALK4_SKIRT : WALK4)[k - 1],
      'Draw only this one pose. Head, face, hair and outfit identical to image 1.');
    return L.join('\n');
  }

  /* 지시문 + 첨부(차례대로). o: {state, subject, identity, outfit(bool), sample(bool), skirt(bool), frame(걷기 4칸의 몇째 칸)} */
  function prompt(o) {
    var s = o.state || 'still', attach;
    if (s === 'still') {
      attach = ['canonical'].concat(o.outfit ? ['outfit'] : []).concat(o.sampleSelf ? ['self_x6'] : o.sample ? ['sample_x6'] : []);
      return { text: stillPrompt(o), attach: attach };
    }
    if (s === 'walk') {
      var t = sheetHead(o, 'Pixel art WALK CYCLE sprite sheet', 3).concat([''], layout(o, 3, 2), [
        'Side three-quarter view walking toward the viewer\'s right, walking in place (the character does not travel across the cell).', ''
      ], o.skirt ? SKIRT : LEGS);
      return { text: t.join('\n'), attach: ['still_x6', 'leg_guide', 'canonical'] };
    }
    if (s === 'walk4') return { text: walk4Prompt(o), attach: (o.frame || 1) > 1 ? ['still_x6', 'walk4_f1', 'canonical'] : ['still_x6', 'canonical'] };
    var body = s === 'idle' ? IDLE : REACT;
    return { text: sheetHead(o, 'Pixel art sprite sheet', 2).concat([''], layout(o, 2, 2), [''], body).join('\n'), attach: ['still_x6', 'canonical'] };
  }

  var ATTACH = {
    canonical: '그 인물의 정본 그림',
    outfit: '입힐 옷이 보이는 그림',
    sample_x6: '같은 공방의 다 만든 정지 도트 6배 — 도트 크기·윤곽·비율 본보기(옷·색은 따르지 않는다)',
    self_x6: '이 인물의 확정 정지 도트 6배 — 도트 크기·윤곽·그늘·비율을 그대로 따른다',
    still_x6: '그 인물의 정지 도트 6배(576×768)',
    leg_guide: '다리 자세 안내 walk_leg_guide.png (남색 = 가까운 다리, 회색 = 먼 다리, 4칸은 1칸의 거울)',
    walk4_f1: '이 걷기 4칸의 1칸 원본(먼저 뽑아 확정한 것) — 크기·자리·발 기준선 본보기'
  };
  var STATE_NAME = { still: '정지 도트', idle: '대기 시트(4칸)', walk: '걷기 시트(6칸)', walk4: '걷기 4칸(칸마다 따로)', react: '반응 시트(4칸)' };

  /* GPT 세션에 보낼 요청문 — 사람이 그대로 붙여 넣는다 */
  function request(o) {
    var p = prompt(o), n = names(o.id, o.form, o.state, o.gen);
    var files = o.files || {}, k = o.frame || 1;
    var what = n.raws ? STATE_NAME[o.state] + ' 가운데 ' + k + '칸 한 장(4장을 따로 뽑는다 — 1칸을 먼저 확정하고 2~4칸은 그것을 붙인다)' : STATE_NAME[o.state] + ' 한 장';
    var L = [(o.atelierName || '') + ' 도트 — ' + (o.name || o.id) + '(' + o.id + ') ' + what + '.', '', '첨부 ' + p.attach.length + '장 (순서대로):'];
    p.attach.forEach(function (a, i) { L.push((i + 1) + '. ' + ATTACH[a] + (files[a] ? ' — ' + files[a] : '')); });
    L.push('', '지킬 것:',
      '- 한 번만 생성한다. 결과가 마음에 안 들어도 다시 뽑거나 고치지 말고 그대로 보여줘. 크롭·축소·보정 금지.',
      '- 저장소에 올리지 마. 원본 PNG 만 넘겨줘. 이름은 ' + (n.raws ? n.raws[k - 1] : n.raw).split('/').pop(),
      '- 기존 이미지 삭제, 강제 push, 이력 재작성 금지.', '', '프롬프트:', '', p.text);
    return L.join('\n');
  }

  /* ── 기록 · sprites.json 칸 ── */
  function record(o) {
    var st = STATES[o.state], n = names(o.id, o.form, o.state, o.gen, o.version);
    var r = {
      date: o.date, author: o.author || 'claude', atelier: o.atelier, id: o.id, form: o.form || 'base', state: o.state,
      plan: 'polos0117.github.io dot.html — 공용 도트 공방',
      generation: n.raws
        ? { files: n.raws.map(function (f, i) { return { file: f, sha256: (o.rawSha256 || [])[i] || null, received_as: (o.received || [])[i] || null }; }), by: 'gpt' }
        : { file: n.raw, sha256: o.rawSha256 || null, by: 'gpt' },
      cleaned: Object.assign({ file: n.cleaned, sha1: o.sha1 || null, tool: 'polos0117.github.io dot.html (rust/dot-core — book-atelier 파이썬 도구와 같은 셈)', args: o.args }, o.info || {})
    };
    if (o.state !== 'still') r.playback = Object.assign({ order: o.order || st.order, ms: o.ms || st.ms }, o.walk || {});
    /* 어느 크기로 그려 어떤 칸으로 정리했나 — 4K 는 칸이 192×256 */
    r.canvas = CANVAS[o.canvas] ? o.canvas : SIZE;
    r.cell = (o.cell || (o.info && o.info.cell) || CELL).slice();
    r.flip = { allowed: o.flip !== false };
    return r;
  }

  /* o.order·o.ms — 재생 차례를 손으로 고른 것(없으면 상태 기본). 앨리스 대기가 [0,3,0,2] 인 것처럼 */
  function spriteState(o) {
    var st = STATES[o.state], n = names(o.id, o.form, o.state, o.gen, o.version);
    var file = n.cleaned.replace(/^sprites\//, '');
    if (o.state === 'still') return { file: file, frames: 1 };
    var e = { file: file, frames: st.frames, order: (o.order || st.order).slice(), ms: (o.ms || st.ms).slice() };
    if (o.walk && o.walk.speed != null) e.speed = o.walk.speed;
    if (o.walk && o.walk.dy) e.dy = o.walk.dy;
    return e;
  }

  /* sprites.json 의 인물 칸 하나 — 가진 상태만. walk: {speed, dy}. orders: {상태: {order, ms}} 손으로 고른 재생 차례 */
  function actor(o) {
    var states = {}, ords = o.orders || {};
    /* 걷기 4칸(walk4)은 재생기의 걷기(walk) 자리로 — 둘 다 주면 뒤의 것(4칸) */
    (o.states || []).forEach(function (s) { states[(STATES[s] && STATES[s].as) || s] = spriteState({ state: s, id: o.id, form: o.form, walk: s === 'walk' || s === 'walk4' ? o.walk : null, order: ords[s] && ords[s].order, ms: ords[s] && ords[s].ms }); });
    /* card — 그 공방 그림 등록부의 열쇠(공용 재생기의 actorFor 가 이것으로 찾는다 — 도감 상세·캡슐·책 펼치기) */
    var cv = (CANVAS[o.canvas] || CANVAS[SIZE]).clean;
    var e = { id: o.id, form: o.form || 'base', cell: (o.cell || cv.sheet.cell).slice(), foot: (o.foot || cv.foot).slice(), scale: 1, flip: o.flip !== false, facing: 'right', states: states };
    /* dot — 칸이 보통(128줄)보다 크면 그만큼 잘게 찍은 것: 재생기 v3 가 화면 크기를 같게 맞춘다(4K 192×256 → 0.5) */
    if (e.cell[1] !== CELL[1]) e.dot = +(CELL[1] / e.cell[1]).toFixed(3);
    if (o.card) e = Object.assign({ card: o.card }, e);
    /* base — 그림이 sprites.json 의 base 와 다른 저장소에 있을 때(포켓몬: 새 인물은 img-3) */
    if (o.base) e.base = o.base;
    return e;
  }

  /* ── 다섯 공방의 그림 목록 — 같은 출처(polos0117.github.io)라 각 공방의 자료를 그대로 읽는다 ── */
  var ATELIERS = [
    /* put — 정리본을 올릴 그림 저장소(sprites/<이름>/)와 인물 칸을 넣을 자료(sprites.json 의 actors). base — 그 저장소가 sprites.json 의 base 와 다르면 인물 칸에 넣을 그림 주소 앞 */
    { key: 'book', name: '책', data: '/book-atelier/data/img.json', names: '/book-atelier/data/book-design.json', bases: ['/book-atelier-img/img/'], subject: 'woman', put: { repo: 'book-atelier-img', data: 'book-atelier/data/sprites.json' } },
    { key: 'pkm', name: '포켓몬', data: '/pkm-atelier/data/img.json', names: '/pkm-atelier/data/card.json', bases: ['/pkm-atelier-img/img/', '/pkm-atelier-img-2/img/', '/pkm-atelier-img-3/img/'], subject: 'woman', put: { repo: 'pkm-atelier-img-3', data: 'pkm-atelier/data/sprites.json', base: 'https://polos0117.github.io/pkm-atelier-img-3/sprites/' } },
    { key: 'myth', name: '신화 무기', data: '/myth-atelier/data/img.json', names: '/myth-atelier/data/card.json', bases: ['/myth-atelier-img/img/'], subject: 'woman', put: { repo: 'myth-atelier-img', data: 'myth-atelier/data/sprites.json' } },
    { key: 'gundam', name: '건담', data: '/atelier/data/img.json', bases: ['/atelier/img/'], subject: 'woman', put: { repo: 'atelier', data: 'atelier/data/sprites.json' } },
    { key: 'samguk', name: '삼국지', data: '/sam-atelier/images/manifest.json', bases: ['/sam-atelier/'], subject: 'person', noThumb: true, put: { repo: 'sam-atelier', data: 'sam-atelier/data/sprites.json' } }
  ];

  /* 자리 표시 — byStyle·byForm 같은 칸 이름과 화풍 이름은 빼고 폼·컷만("begin · f", "casual · f · 2") */
  function label(path) {
    var out = [];
    for (var i = 0; i < path.length; i++) {
      if (path[i] === 'byStyle') { i++; continue; }
      if (path[i] === 'byForm') continue;
      out.push(path[i]);
    }
    return out.join(' · ') || '기본';
  }

  /* 카드 하나 아래의 그림 파일 이름을 모두(자리 표시와 함께) — byStyle·byForm·casual 처럼 겹친 칸을 다 훑는다 */
  function filesOf(node, path, out) {
    out = out || [];
    if (typeof node === 'string') { if (/\.(webp|png|jpe?g)$/i.test(node)) out.push({ file: node, at: label(path) }); return out; }
    if (Array.isArray(node)) { node.forEach(function (v, i) { filesOf(v, path.concat(String(i + 1)), out); }); return out; }
    if (node && typeof node === 'object') Object.keys(node).forEach(function (k) { if (k !== 'face') filesOf(node[k], path.concat(k), out); });
    return out;
  }

  /* 그림 목록 → [{ key, name, id, files: [{file, at, url, thumb}] }] (이름 차례) */
  function cards(at, doc, namesDoc) {
    var A = typeof at === 'string' ? ATELIERS.filter(function (x) { return x.key === at; })[0] : at, out = [];
    var en = {}, title = {};
    if (namesDoc && namesDoc.books) namesDoc.books.forEach(function (b) { title[b.key] = b.title; en[b.key] = b.key; });
    /* 카드 자료의 영어 이름 — pkm 은 cards: {갈래: [카드]}, myth 는 cards: [카드] */
    var cs = namesDoc && namesDoc.cards, lists = Array.isArray(cs) ? [cs] : cs ? Object.keys(cs).map(function (k) { return cs[k]; }) : [];
    lists.forEach(function (l) { (Array.isArray(l) ? l : []).forEach(function (c) { if (c && c.name && c.en) en[c.name] = c.en; }); });
    if (A.key === 'samguk') {
      (Array.isArray(doc) ? doc : []).forEach(function (e) {
        var m = /^sam\/(images\/portraits\/(.+)\.(jpe?g|png|webp))$/i.exec(e.path || '');
        if (m) out.push({ key: m[2], name: m[2], id: '', files: [{ file: m[1], at: '초상', url: A.bases[0] + m[1].split('/').map(encodeURIComponent).join('/'), thumb: null }] });
      });
    } else {
      var img = (doc && doc.img) || {}, where = (doc && doc.where) || {};
      Object.keys(img).forEach(function (k) {
        var files = filesOf(img[k], []).map(function (f) {
          var base = A.bases[where[f.file]] || A.bases[0], e = encodeURIComponent(f.file);
          return { file: f.file, at: f.at, url: base + e, thumb: A.noThumb ? null : base + 'thumb/' + e };
        });
        if (files.length) out.push({ key: k, name: title[k] || k, id: slug(en[k] || (/^[\x00-\x7f]+$/.test(k) ? k : '')), files: files });
      });
    }
    return out.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
  }

  /* ── 그리기 — gpt 그림 API(images/edits)에 지시문과 첨부를 보내 원본 한 장을 받는다(도트 공방의 「그린다」).
     열쇠는 부르는 쪽이 준다(화면은 이 기기의 localStorage 에만 둔다). 첨부는 차례대로 image[] — 지시문의 "attached image N" 이 그 차례다.
     모델(2026-10-28): gpt-image-1 은 2026-10-23 에 끝났다(1.5·mini 는 12-01). 지금은 gpt-image-2.5-sunburst(기본 — 꼼꼼) · gpt-image-2.5-flare(빠름).
     2 세대부터 첨부는 늘 높은 충실도라 input_fidelity 를 안 보낸다(보내면 모르는 인자). background transparent + png — 지시문의 투명 바탕과 같은 말.
     값은 토큰제라 대략(한 장 1024×1536, 첨부 빼고): low $0.005 · medium $0.01 · high $0.04 · xhigh 그 위 — 모델 둘이 같은 값 ── */
  var GEN = { url: 'https://api.openai.com/v1/images/edits', size: SIZE, sizes: CANVAS,
    models: { 'gpt-image-2.5-sunburst': '꼼꼼 — 기본', 'gpt-image-2.5-flare': '빠름' }, model: 'gpt-image-2.5-sunburst',
    quality: { low: 0.005, medium: 0.01, high: 0.04, xhigh: 0.08 } };
  function genForm(o) {
    var f = new FormData();
    f.append('model', GEN.models[o.model] ? o.model : GEN.model); f.append('prompt', o.prompt); f.append('n', '1'); f.append('size', CANVAS[o.size] ? o.size : GEN.size);
    f.append('quality', GEN.quality[o.quality] ? o.quality : 'medium'); f.append('background', 'transparent'); f.append('output_format', 'png');
    (o.images || []).forEach(function (im) { f.append('image[]', new Blob([im.bytes], { type: im.type || 'image/png' }), im.name || 'image.png'); });
    return f;
  }
  function genError(status, j) {
    var m = j && j.error && j.error.message;
    if (status === 401) return '열쇠가 틀리거나 만료됐다(401)';
    if (status === 429) return '한도를 넘었다(429)' + (m ? ' — ' + m : '');
    if (m && /does not exist|do not have access|must be verified/i.test(m)) return '이 열쇠로는 그 모델을 못 쓴다(모델이 끝났거나 조직 확인이 필요하다) — ' + m;
    if (status === 400 && m && /safety|moderation|content policy|rejected/i.test(m)) return '안전 필터에 막혔다 — ' + m;
    return (status ? status + ' ' : '') + (m || '응답을 못 받았다');
  }
  function b64(s) {
    var bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary'), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  /* o: {prompt, images: [{bytes, name, type}], quality}. fetchFn 은 검사가 바꿔 끼운다 → Promise<{bytes(PNG), usage}> */
  function generate(key, o, fetchFn) {
    if (!key) return Promise.reject(new Error('열쇠가 없다'));
    return (fetchFn || fetch)(GEN.url, { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: genForm(o) }).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = JSON.parse(t); } catch (e) { j = null; }
        if (!r.ok) throw new Error(genError(r.status, j));
        var d = j && j.data && j.data[0];
        if (!d || !d.b64_json) throw new Error('응답에 그림이 없다');
        return { bytes: b64(d.b64_json), usage: j.usage || null };
      });
    }, function (e) { throw new Error('OpenAI 에 못 닿았다 — ' + (e && e.message || e)); });
  }

  var api = { API: API, CELL: CELL, FOOT: FOOT, STATES: STATES, CLEAN: CLEAN, SUBJECTS: SUBJECTS, ATTACH: ATTACH, STATE_NAME: STATE_NAME, ATELIERS: ATELIERS, GEN: GEN, CANVAS: CANVAS,
    load: load, wrap: wrap, args: args, slug: slug, names: names, recordPaths: recordPaths, recordedGen: recordedGen, prompt: prompt, request: request, record: record, spriteState: spriteState, actor: actor, filesOf: filesOf, cards: cards,
    genForm: genForm, genError: genError, generate: generate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AtelierDot = api;
})(typeof window !== 'undefined' ? window : this);
