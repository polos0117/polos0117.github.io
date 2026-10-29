/* 통합 생성기 화면(prompt.html) — 공방 → 화풍 → 대상 → 출력 갈래 → 갈래별 단계(2026-10-29, 사용자 「이미지 생성 공방 하나를 통합으로」).
   일상컷 단계: 시대 → 장소 → 하는 일 → 의상 계열 → 옷 → 프레이밍 → 렌즈 → 자세 → 방향 → 표정 → 세부 강도.
   폼 초상(2단계, game·book): 폼 → 인물 기준(새 인물·이어가기) → 노출 → 설계 줄 → 외형(새 인물만) → 연출 → 표정 → 자세 → 방향 → 프레이밍 → 렌즈 → 화면 비율 → 덧붙임.
   개방(2단계, game·book): 폼(개방 장면이 있는 것) → 덧붙임. 값은 옛 생성기 저장값의 카드 꼴(prompt/adapters.js card) 그대로 — 지시문도 같은 입력으로.
   고른 단계는 위 칩 한 줄로 접히고, 누르면 그 단계로 돌아간다. 앞을 바꾸면 맞지 않게 된 뒤 칸만 비워 다시 고르게 한다.
   선택지는 그 공방의 트리(/<공방>/data/casual-tree.json · lib/casual-tree.js)가 거른 것만. 단계마다 「해방」 을 켜면 트리 밖 선택지가
   흐리게 보이고 왜 빠졌는지 붙는다(CT.why) — 그것을 고르면 🔓 표시가 붙고 기록(unlocked)에 남는다(트리가 그 칸을 고치지 않는다).
   랜덤은 늘 트리 안에서만(폼은 그 공방 lib/prompt-random.js 의 폼 칸 목록). 지시문은 그 공방의 조립 코드가 짓는다(prompt/adapters.js). 고른 값은 이 기기에만(atelier_hub_prompt_v1).
   공방을 바꾸면 주소(?a=)를 바꿔 다시 연다 — 공방마다 같은 이름(window.AtelierSpec …)을 쓰는 코드라 한 창에 둘을 싣지 않는다. */
(function () {
  'use strict';
  var H = window.AtelierHubAdapters, STORE = 'atelier_hub_prompt_v1', $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var STEPS = [
    { key: 'era', ko: '시대', need: true }, { key: 'place', ko: '장소', need: true }, { key: 'act', ko: '하는 일', need: true }, { key: 'ofam', ko: '의상 계열', need: true },
    { key: 'item', ko: '옷' }, { key: 'frame', ko: '프레이밍', need: true }, { key: 'lens', ko: '렌즈', need: true }, { key: 'pose', ko: '자세' }, { key: 'orient', ko: '방향', need: true },
    { key: 'expr', ko: '표정' }, { key: 'axes', ko: '세부 강도' }, { key: 'notes', ko: '덧붙임' }];
  /* 일상컷 덧붙임 — 옛 생성기의 글 칸(계획기 컷은 여기에 계획의 옷 종류·드러내는 방식·장면 첫머리를 쓴다). 받침 casualTexts 가 공방마다 고른다 */
  var CTEXT = { outfit: ['prompt.tree.outfit', '옷 직접 쓰기', 'prompt.help.tree.outfit'], scene: ['prompt.scene', '장소·상황', 'prompt.help.scene'], custom: ['prompt.extra', '추가 요청', 'prompt.help.custom'] };
  var WHY = {
    unknown: '없는 값', era: '이 시대엔 없는 곳', year: '{year}년엔 없던 곳({since}년부터)', noact: '여기서 할 일이 없다', place: '이 장소에선 안 하는 일',
    outfit: '이 시대·장소에 입을 옷이 없다', act: '이 하는 일엔 안 맞는다', close: '가까운 컷에선 알아볼 데가 안 보이는 옷', banned: '이 공방 일상컷엔 안 쓴다',
    required: '필수 갈래 컷엔 안 쓴다(옷이 안 남는다)', wide: '가까운 컷엔 광각을 안 쓴다', family: '이 하는 일의 자세 계열에 없다', companion: '동료가 같이 있어야 하는 자세',
    seat: '앉는 자리가 다르다', hands: '하는 일이 손을 쓰고 있다', zone: '이 프레이밍에선 안 보이는 자세', profile: '가까운 컷에서만', frame: '이 프레이밍엔 안 맞는 방향',
    faces: '얼굴을 보여야 하는 자세', mood: '하는 일이 표정을 정한다', back: '등을 보이는 방향', path: '이 길에 없다'
  };
  var unl = function (sc, k) { return CT && CT.unlocked ? CT.unlocked(sc, k) : !!(sc[k] && (sc.unlocked || []).indexOf(k) >= 0); };
  var why = function (r) { return r ? (WHY[r.code] || WHY.path).replace('{year}', r.year || '').replace('{since}', r.since || '') : ''; };
  /* 그 공방 낱말(lib/words.js)이 있으면 옛 생성기와 같은 말, 없으면 여기 말 */
  var w = function (k, fb, vars) { var t = window.W ? window.W(k, vars) : ''; return t && t !== k ? t : fb; };

  function readStore() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }
  function writeStore(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) { /* 막힌 브라우저 — 이 화면에선 계속 쓴다 */ } }
  function q(k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } }
  function load(src) {
    return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { no(new Error(src)); }; document.head.appendChild(s); });
  }
  function getJSON(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }); }

  var A = null, D = null, S = null, CT = null, T = null, tree = null, saved = readStore();
  var st = { a: '', style: '', subject: '', out: 'casual', scene: { unlocked: [] }, card: null, open: 'a', unlock: {}, walked: {}, seen: {}, grpOpen: {}, menu: false, tab: {} };
  var renderedOpen = {};   // 그릴 때 open 으로 쓴 외형 묶음 — 그 뒤 처음 오는 toggle 은 브라우저가 그리며 낸 것(사람이 누른 게 아니다)
  /* 폰(폭 ≤ 768) — docs/PROMPT_MOBILE_PLAN.md ①: 칩 레일 한 줄 + 아래 고정 막대(#hbar). PC 는 판 밑 단추 그대로. 폭이 바뀌면 다시 그린다 */
  var mq = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;
  var mobile = function () { return !!(mq && mq.matches); };
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { render(); });
  /* 칩 글은 폰에선 한국어 머리만 — 「over shoulder — 뒤돌아보기」 → 「뒤돌아보기」 */
  var shortLabel = function (v) { v = String(v == null ? '' : v); var i = v.indexOf(' — '); return mobile() && i > 0 ? v.slice(i + 3) : v; };
  /* 출력 갈래 — 받침의 표(off 는 준비 중). 일상컷 밖은 카드 갈래(단계 표 prompt/steps.js) */
  var outList = function () { return A && A.outputs ? A.outputs(S, w) : [{ key: 'casual', ko: '일상컷' }]; };
  var outs = function () { return outList().filter(function (o) { return !o.off; }).map(function (o) { return o.key; }); };
  var formy = function () { return st.out !== 'casual'; };

  function boot() {
    var a = q('a') || '';
    if (!H.get(a)) { st.open = 'a'; render(); return; }
    A = H.get(a); st.a = a;
    var base = '/' + A.repo + '/';
    $('status').textContent = A.ko + ' 공방의 표와 조립 코드를 읽는 중…';
    A.libs.reduce(function (p, f) { return p.then(function () { return load(base + f + '?hub=1'); }); }, Promise.resolve()).then(function () {
      var names = Object.keys(A.data);
      return Promise.all(names.map(function (n) { return getJSON(base + A.data[n]); })).then(function (vals) { D = {}; names.forEach(function (n, i) { D[n] = vals[i]; }); });
    }).then(function () {
      S = window.AtelierSpec; CT = window.AtelierCasualTree; T = A.tables(S); tree = D.tree;
      var mine = (saved.by || {})[a] || {};
      st.style = mine.style && A.styles(D, S).some(function (x) { return x.key === mine.style; }) ? mine.style : A.defaultStyle(D, S);
      /* 대상 — ?s=, 또는 옛 pkm 생성기 주소 꼴(?mech=, 일상컷 계획기가 내는 주소) */
      var qs = q('s') || q('mech');
      st.subject = qs && A.subject(D, qs) ? qs : (mine.subject && A.subject(D, mine.subject) ? mine.subject : '');
      st.scene = Object.assign({ unlocked: [] }, mine.scene || {});
      st.scene.axes = Object.assign({}, H.FIXED, st.scene.axes || {});
      st.scene = repair(st.scene);
      /* 1단계 저장값은 walked 가 참/거짓 하나(일상컷) */
      st.walked = typeof mine.walked === 'object' && mine.walked ? mine.walked : { casual: !!mine.walked };
      var o = q('o') || mine.out; st.out = outs().indexOf(o) >= 0 ? o : 'casual';
      loadCard();
      st.open = !st.subject ? 'subject' : begin();
      $('status').textContent = '';
      takePlan();
      render();
    }).catch(function (e) { $('status').textContent = '읽지 못했다 — ' + e.message; });
  }
  function subj() { return st.subject ? A.subject(D, st.subject) : null; }
  /* 일상컷 계획기(pkm tools/casual-plan.cjs)의 주소 — ?a=pkm&mech=<카드>&casual=<선택값>. 옛 생성기처럼 값을 채우고 계획 칸(planned)은 랜덤이 안 바꾼다.
     장면·옷 글 칸은 새 컷이라 비운다(계획의 옷 종류·드러내는 방식대로 덧붙임에 쓴다). 한 번 받으면 주소에서 지운다(save) — 새로 고침이 손본 값을 덮지 않게 */
  function takePlan() {
    var raw = q('casual');
    if (!raw || !st.subject || !A.planFrom) return;
    var got = A.planFrom(window, D, raw, subj());
    if (!got) { $('status').textContent = '계획기 주소를 못 읽었다 — tools/casual-plan.cjs 로 다시 낸다.'; save(); return; }
    st.out = 'casual';
    st.scene = Object.assign({}, st.scene, got.scene, { scene: '', outfit: '', camera: '', custom: '', preset: '', unlocked: [], axes: Object.assign({}, got.scene.axes) });
    st.scene.planned = Object.keys(got.locks).filter(function (k) { return k.indexOf('axes.') !== 0 && k !== 'aspect'; });
    st.walked.casual = true;
    st.open = firstOpen();
    if (st.open === 'done') st.open = 'notes';   // 계획 컷은 덧붙임(옷·장면 첫머리)을 쓰고 끝낸다
    $('status').textContent = '일상컷 계획기 값으로 ' + Object.keys(got.locks).length + '칸 채웠다 — 계획 칸(📌)은 랜덤이 안 바꾼다. 덧붙임에 계획의 옷 종류·드러내는 방식·장면 첫머리를 쓴다.' +
      (got.bad.length ? ' 트리에 안 맞아 비운 칸: ' + got.bad.join(', ') + ' — tools/casual-plan.cjs 로 다시 정한다.' : '');
    save();
  }
  var planned = function (sc, k) { return (sc.planned || []).indexOf(k) >= 0; };
  /* 큰 자료(A.lazy)는 카드 갈래에 들어갈 때 한 번만 받는다 — 못 받으면 null(옛 생성기처럼 없이 짓는다) */
  var lazyState = '';
  function needLazy() {
    if (!A || !A.lazy || lazyState || !formy()) return;
    lazyState = 'loading';
    var base = '/' + A.repo + '/', names = Object.keys(A.lazy);
    $('status').textContent = '큰 자료(' + names.length + ')를 받는 중…';
    Promise.all(names.map(function (n) { return getJSON(base + A.lazy[n]).catch(function () { return null; }); })).then(function (vals) {
      names.forEach(function (n, i) { D[n] = vals[i]; });
      lazyState = 'done'; $('status').textContent = vals.some(function (v) { return !v; }) ? '큰 자료 일부를 못 받았다 — 그 몫 없이 짓는다' : '';
      /* 받기 전엔 지시문이 없어 첫 단계를 열었다 — 밟아 본 갈래면 이제 제자리(다 골랐다)로 */
      var first = (steps()[0] || {}).key;
      if (st.walked[st.out] && st.open === first) st.open = begin();
      render();
    });
  }
  /* 폼·개방 카드는 대상마다(옛 생성기도 게임·책마다 저장한다) */
  function loadCard() { st.card = A.card && st.subject ? A.card(D, st.subject, S, (((saved.by || {})[st.a] || {}).cards || {})[st.subject]) : null; }
  /* 앞을 바꾼 뒤 맞지 않게 된 칸은 비운다(꼭 있어야 하는 칸도 — 그 단계가 다시 열린다). 해방한 칸은 그대로 */
  function repair(sc) {
    var next = CT.repair(tree, sc, subj(), T.close, function () { return ''; });
    if (next.frame && !CT.frameOk(tree, next.act, next.frame, next) && !unl(next, 'frame')) next.frame = '';
    next.unlocked = (sc.unlocked || []).filter(function (k) { return next[k]; });
    return next;
  }
  function steps() {
    return formy() ? cardSteps() : STEPS;
  }
  var keysOf = function () { return steps().map(function (s) { return s.key; }); };
  /* 단계를 처음 밟을 때는 첫 단계부터 — 시대는 트리가 기본(지금)으로 채워 두지만 건너뛰지 않는다(2026-10-29 사용자 「시대는 선택 안되고 그냥 건너뛰어지네」).
     한 칸이라도 고른 뒤(walked)에는 비어 있는 첫 칸 또는 다 골랐다 */
  function begin() {
    var s = steps();
    /* 지시문이 안 나오는 카드 갈래(스킨 없는 무기 등)는 다 골랐다로 가지 않고 첫 단계 — 거기 까닭이 있다 */
    if (formy() && s.length && !prompt()) return s[0].key;
    return st.walked[st.out] || !s.length ? firstOpen() : s[0].key;
  }
  function firstOpen() {
    if (formy()) return 'done';
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].need && !st.scene[STEPS[i].key]) return STEPS[i].key;
    return 'done';
  }
  function save() {
    saved.last = st.a; saved.by = saved.by || {};
    var mine = saved.by[st.a] || {}, cards = Object.assign({}, mine.cards || {});
    if (st.card && st.subject) cards[st.subject] = st.card;
    saved.by[st.a] = { style: st.style, subject: st.subject, out: st.out, scene: st.scene, walked: st.walked, cards: cards, recent: mine.recent || [] };
    writeStore(saved);
    try { var u = new URLSearchParams(location.search); u.set('a', st.a); if (st.subject) u.set('s', st.subject); u.set('o', st.out); u.delete('casual'); u.delete('mech'); history.replaceState(null, '', location.pathname + '?' + u + location.hash); } catch (e) { /* 주소만 못 바꿨다 */ }
  }
  /* 다음 단계 — 늘 바로 다음 칸(앞에 비게 된 꼭 있어야 하는 칸이 있으면 그 칸). 다 고른 뒤 고쳐도 건너뛰지 않는다 —
     비어 있는 꼭 칸으로 뛰었더니 옷·프레이밍·렌즈·자세를 건너뛰었다(2026-10-29 사용자 「다다음이나 다다다음 칸으로 건너뛰어지는게 많네」).
     남은 단계를 건너뛰고 싶으면 단계마다 「다 골랐다로」(skipBtn) */
  function advance(key) {
    var ks = keysOf(), i = ks.indexOf(key);
    st.walked[st.out] = true;
    st.open = ks[i + 1] || 'done';
    var need = firstOpen(); if (need !== 'done' && ks.indexOf(need) < i) st.open = need;
  }

  /* 단계마다의 선택지 — [{v, ko, sub, why}] (why 가 있으면 트리 밖) */
  function label(list, v) { var r = (list || []).filter(function (x) { return x[0] === v; })[0]; return r ? r[1] : v; }
  function inTree(key) {
    var sc = st.scene, g = subj();
    switch (key) {
      case 'era': return CT.eras(tree).map(function (e) { var y = e.key === 'release' && CT.year(tree, g); return { v: e.key, ko: e.ko + (y ? ' · ' + y : ''), sub: e.en }; });
      case 'place': return CT.places(tree, sc.era, g).map(function (p) { return { v: p.key, ko: p.ko, sub: p.en, group: p.group }; });
      case 'act': return CT.acts(tree, sc.era, sc.place).map(function (a) { return { v: a.key, ko: a.ko, sub: a.en, tag: (tree.families[a.family] || {}).ko }; });
      case 'ofam': { var req = (tree.required || {}).outfits || []; return CT.outfitFamilies(tree, sc.era, sc.place, sc.act).map(function (o) { return { v: o.key, ko: o.ko + (req.indexOf(o.key) >= 0 ? ' ★' : ''), sub: o.en }; }); }
      case 'item': return [{ v: '', ko: '자동 — 계열 안에서 장면에 맞게' }].concat(CT.items(tree, sc.ofam, sc.frame).map(function (i) { return { v: i.key, ko: i.ko, sub: i.en }; }));
      case 'frame': return T.frames.filter(function (r) { return CT.frameOk(tree, sc.act, r[0], sc); }).map(function (r) { return { v: r[0], ko: r[1] }; });
      case 'lens': return T.lenses.filter(function (r) { return CT.lensOk(tree, sc.frame, r[0]); }).map(function (r) { return { v: r[0], ko: r[1] }; });
      case 'pose': { var ps = CT.poses(tree, sc.act, sc.frame); return [{ v: '', ko: '자동 — 하는 일대로' }].concat(T.poses.filter(function (r) { return ps.indexOf(r[0]) >= 0; }).map(function (r) { return { v: r[0], ko: r[1] }; })); }
      case 'orient': { var os = CT.orients(tree, sc.act, sc.frame, T.close, sc.pose); return T.orients.filter(function (r) { return os.indexOf(r[0]) >= 0; }).map(function (r) { return { v: r[0], ko: r[1] }; }); }
      case 'expr': return [{ v: '', ko: '자동' }].concat(CT.exprOk(tree, sc) ? T.exprs.map(function (r) { return { v: r[0], ko: r[1] }; }) : []);
    }
    return [];
  }
  /* 해방 — 트리 밖 선택지(흐리게)와 까닭 */
  function outTree(key) {
    var sc = st.scene, g = subj(), have = {}, univ;
    inTree(key).forEach(function (x) { have[x.v] = 1; });
    switch (key) {
      case 'era': univ = tree.eras.map(function (e) { return [e.key, e.ko]; }); break;
      case 'place': univ = tree.places.map(function (p) { return [p.key, p.ko, p.en, p.group]; }); break;
      case 'act': univ = tree.activities.map(function (a) { return [a.key, a.ko, a.en]; }); break;
      case 'ofam': univ = tree.outfits.map(function (o) { return [o.key, o.ko, o.en]; }); break;
      case 'item': univ = ((CT.family(tree, sc.ofam) || {}).items || []).map(function (i) { return [i.key, i.ko, i.en]; }); break;
      case 'frame': univ = T.frames; break;
      case 'lens': univ = T.lenses; break;
      case 'pose': univ = T.poses; break;
      case 'orient': univ = T.orients; break;
      case 'expr': univ = T.exprs; break;
      default: univ = [];
    }
    return univ.filter(function (r) { return r[0] && !have[r[0]]; }).map(function (r) {
      var c = CT.why ? CT.why(tree, sc, key, r[0], g, T.close) : null;
      return { v: r[0], ko: r[1], sub: r[2], group: r[3], why: why(c || { code: 'path' }), out: true };
    });
  }
  function shown(key, v) {
    if (v === '' || v == null) return key === 'pose' ? '하는 일대로' : '자동';
    switch (key) {
      case 'era': { var e = CT.era(tree, v); return e ? e.ko : v; }
      case 'place': { var p = CT.place(tree, v); return p ? p.ko : v; }
      case 'act': { var a = CT.act(tree, v); return a ? a.ko : v; }
      case 'ofam': { var f = CT.family(tree, v); return f ? f.ko : v; }
      case 'item': { var i = CT.item(tree, st.scene.ofam, v); return i ? i.ko : v; }
      case 'frame': return label(T.frames, v);
      case 'lens': return label(T.lenses, v);
      case 'pose': return label(T.poses, v);
      case 'orient': return label(T.orients, v);
      case 'expr': return label(T.exprs, v);
    }
    return v;
  }

  function choose(key, v, out) {
    var sc = Object.assign({}, st.scene), un = (sc.unlocked || []).filter(function (k) { return k !== key; });
    sc[key] = v; if (out && v) un.push(key); sc.unlocked = un;
    if (planned(sc, key)) sc.planned = sc.planned.filter(function (k) { return k !== key; });   // 손으로 바꾼 칸은 계획 칸이 아니다
    if (['era', 'place', 'act', 'ofam', 'item'].indexOf(key) >= 0) sc.preset = '';
    st.scene = repair(sc);
    advance(key);
    save(); render();
  }
  /* 랜덤 — 트리 안에서만. 이 칸 또는 이 칸부터 끝까지 */
  function rnd(list) { return list[Math.floor(Math.random() * list.length)]; }
  function randomFrom(key, all) {
    if (formy()) return randomCard(key, all);
    var keys = STEPS.map(function (s) { return s.key; }), i = keys.indexOf(key), sc = Object.assign({}, st.scene);
    (all ? keys.slice(i) : [key]).forEach(function (k) {
      if (k === 'axes' || k === 'notes' || unl(sc, k) || planned(sc, k)) return;
      st.scene = sc; var opts = inTree(k).map(function (x) { return x.v; }).filter(function (v) { return v !== sc[k]; });
      var nonEmpty = opts.filter(Boolean); if (nonEmpty.length) opts = nonEmpty;
      if (!opts.length) return;
      sc[k] = rnd(opts); sc = repair(sc);
    });
    st.walked.casual = true;
    st.scene = sc; st.open = all ? 'done' : (keys[i + 1] || 'done');
    var need = firstOpen(); if (need !== 'done') st.open = need;
    save(); render();
  }

  /* ── 카드 갈래(폼·개방·초상·각성·저주·스킨) ── 단계 표는 prompt/steps.js, 여기는 그리고 누르기만 */
  function rnd2(list) { return list[Math.floor(Math.random() * list.length)]; }
  function cardSteps() {
    var make = (window.AtelierHubSteps || {})[st.a];
    if (!make || !st.card) return [];
    return make(st.out, { A: A, D: D, S: S, P: window.AtelierPrompt, R: window.AtelierSceneRandom, w: w, subject: st.subject, g: subj(), card: st.card, rnd: rnd2 });
  }
  function stepOf(k) { return steps().filter(function (s) { return s.key === k; })[0]; }
  function partPick(stepKey, i, v) {
    var step = stepOf(stepKey), part = step && step.parts[i];
    if (!part || !part.set) return;
    part.set(v);
    if (!(part.stay && part.stay(v))) advance(stepKey);
    save(); render();
  }
  function randomCard(key, all) {
    var ks = keysOf(), i = ks.indexOf(key);
    (all ? ks.slice(i) : [key]).forEach(function (k) { var s = stepOf(k); if (s && s.random) s.random(); });   // 차례대로 — 앞 단계가 바뀌면 뒤 표도 바뀐다
    st.walked[st.out] = true;
    st.open = all ? 'done' : (ks[i + 1] || 'done');
    save(); render();
  }
  function partsHTML(step) {
    return step.parts.map(function (p, i) {
      var at = ' data-part="' + i + '"';
      switch (p.type) {
        case 'note': return p.text ? '<p class="note">' + esc(p.text).replace(/\n/g, '<br>') + '</p>' : '';
        case 'facts': { var rows = p.rows().filter(function (r) { return r[1]; }); return rows.length ? '<dl class="facts">' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' : ''; }
        case 'pick': return (p.ko ? '<h4>' + esc(p.ko) + '</h4>' : '') + optButtons(p.opts().map(function (o) { return Object.assign({}, o, { attr: at, out: !!o.off }); }), p.get());
        case 'check': return '<label class="unlock"><input type="checkbox"' + at + (p.get() ? ' checked' : '') + '> ' + esc(p.ko) + '</label>' + (p.note ? '<p class="note">' + esc(p.note).replace(/\n/g, '<br>') + '</p>' : '');
        case 'text': return field(p.id, p.ko, p.get(), p.multi, p.help, p.ph, at);
        case 'select': return '<label class="axis">' + esc(p.ko) + '<select data-sel="1"' + at + '>' + p.opts.map(function (o) {
          return '<option value="' + esc(o[0]) + '"' + (o[0] === (p.get() || '') ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>' + (p.help ? '<small>' + esc(p.help) + '</small>' : '') + '</label>';
        case 'buttons': return '<p class="rand">' + p.items.map(function (b, j) { return '<button type="button" class="btn"' + at + ' data-btn="' + j + '">' + esc(b.ko) + '</button>'; }).join('') + '</p>';
        case 'params': return p.groups.map(function (g, gi) {
          /* 연 묶음은 다시 그려도 열린 채(값을 바꿀 때마다 닫혔다) */
          /* 폰은 한 번에 하나만 — 다른 묶음을 열어 뒀으면 첫 묶음의 기본 열림을 끈다(둘이 열린 채 그려지면 toggle 이 서로 닫는다) */
          var anyOpen = mobile() && p.groups.some(function (o) { return st.grpOpen[o.key]; });
          var on = st.grpOpen[g.key] != null ? st.grpOpen[g.key] : (gi === 0 && !anyOpen);
          renderedOpen[g.key] = on;
          return '<details class="grp" data-grp="' + esc(g.key) + '"' + (on ? ' open' : '') + '><summary>' + esc(g.ko) + '</summary>' + (g.note ? '<p class="note">' + esc(g.note) + '</p>' : '') + g.defs.map(function (d) {
            var v = p.get(d.key), opts = d.opts.slice();
            if (v && !opts.some(function (o) { return o[0] === v; })) opts.push([v, v]);
            return '<label class="axis">' + esc(d.ko) + '<select' + at + ' data-param="' + esc(d.key) + '">' + opts.map(function (o) {
              return '<option value="' + esc(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[0] === '' ? w('prompt.auto', '자동') : o[1]) + '</option>'; }).join('') + '</select>' +
              (v === '__custom__' && p.custom ? '<input type="text"' + at + ' data-pcustom="' + esc(d.key) + '" value="' + esc(p.custom.get(d.key)) + '" aria-label="' + esc(d.ko) + ' · ' + esc(w('prompt.custom', '직접 입력')) + '" placeholder="' + esc(w('prompt.custom', '직접 입력')) + '">' : '') + '</label>';
          }).join('') + '</details>';
        }).join('');
      }
      return '';
    }).join('');
  }
  function cardPanel(k) {
    var step = stepOf(k);
    if (!step) return '';
    if (mobile()) return '<h3>' + esc(step.ko) + '</h3>' + partsHTML(step);   // 단추는 아래 막대에
    var tail = step.random ? randomBar(k) : '<span class="rand">' + skipBtn() + restartBtn(k) + '</span>';
    return '<h3>' + esc(step.ko) + '</h3>' + partsHTML(step) + (tail.indexOf('<button') >= 0 ? '<div class="bar"><span></span>' + tail + '</div>' : '') + (step.next ? nextBtn(k) : '');
  }

  /* ── 그리기 ── */
  function chip(key, ko, val, mark, plan) { return '<button type="button" class="hchip' + (st.open === key ? ' on' : '') + '" data-open="' + key + '"><small>' + esc(ko) + '</small> ' + esc(shortLabel(val)) + (mark ? ' <span class="lock" title="트리 밖에서 고른 값">🔓</span>' : '') + (plan ? ' <span class="lock" title="계획기 값 — 랜덤이 안 바꾼다">📌</span>' : '') + '</button>'; }
  /* 폰 — 아직 안 온 다음 한 칸을 미리(▸, 누를 수 없다 · data-open 이 아니다) */
  function chipNext(key, ko) { return mobile() ? '<span class="hchip next" data-next-chip="' + key + '" aria-hidden="true"><small>' + esc(ko) + '</small> ▸</span>' : ''; }
  /* 폰 — 공방·화풍·대상·출력은 칩 대신 경로 한 줄(포켓몬 › 글로시… › 피카츄 › 일상컷 · 6/12), 그 아래 단계 칩 레일(.hrail). PC 는 칩 한 줄에 다 */
  function crumbs(head, n) {
    return '<div class="hpath">' + head.map(function (c, i) { return (i ? '<i>›</i>' : '') + '<button type="button" class="hcrumb' + (st.open === c[0] ? ' on' : '') + '" data-open="' + c[0] + '" title="' + esc(c[1]) + '">' + esc(c[2]) + '</button>'; }).join('') +
      (n ? '<span class="n">' + n + '</span>' : '') + '</div>';
  }
  function chipsHTML() {
    var head = [['a', '공방', A ? A.ko : '—']];
    var wrap = function (headChips, stepChips, n) {
      if (!mobile()) return headChips.map(function (c) { return chip(c[0], c[1], c[2]); }).concat(stepChips).join('');
      return crumbs(headChips, n) + (stepChips.length ? '<div class="hrail">' + stepChips.join('') + '</div>' : '');
    };
    if (!A || !D) return wrap(head, []);
    head.push(['style', '화풍', (A.styles(D, S).filter(function (x) { return x.key === st.style; })[0] || {}).ko || st.style]);
    head.push(['subject', '대상', st.subject ? (A.subjects(D).filter(function (x) { return x.key === st.subject; })[0] || {}).ko : '—']);
    if (!st.subject) return wrap(head, []);
    head.push(['out', '출력', (outList().filter(function (o) { return o.key === st.out; })[0] || {}).ko]);
    var out = [];
    var keys = keysOf(), at = st.open === 'done' ? keys.length : keys.indexOf(st.open), seen = st.seen[st.out];
    var n = keys.length && at >= 0 ? Math.min(at + 1, keys.length) + '/' + keys.length : '';
    steps().forEach(function (s, idx) {
      /* 아직 안 온 단계는 칩을 안 띄운다. 한 번 다 골랐으면 다 띄운다 */
      /* 단계 밖(출력·대상 고르는 중)이고 아직 다 고른 적 없으면 단계 칩은 하나도 안 띄운다 */
      if (!seen && at < 0) return;
      if (formy()) { if (!seen && idx > at) { if (idx === at + 1) out.push(chipNext(s.key, s.ko)); return; } out.push(chip(s.key, s.ko, s.shown())); return; }
      if (!seen && idx > at && (s.key === 'axes' || !st.scene[s.key])) { if (idx === at + 1) out.push(chipNext(s.key, s.ko)); return; }
      if (s.key === 'axes') { out.push(chip('axes', s.ko, (T.axes.filter(function (a) { return a.key === 'skin_exposure'; })[0] ? '피부 노출 ' + label((T.axes.filter(function (a) { return a.key === 'skin_exposure'; })[0] || {}).options, st.scene.axes.skin_exposure) : '…'))); return; }
      if (s.key === 'notes') { var n = casualTexts().filter(function (f) { return (st.scene[f] || '').trim(); }).length; out.push(chip('notes', s.ko, n ? n + '칸' : '없음')); return; }
      out.push(chip(s.key, s.ko, shown(s.key, st.scene[s.key]), unl(st.scene, s.key), planned(st.scene, s.key)));
    });
    return wrap(head, out, n);
  }
  /* ── 폰 결과 — 다 고르면 판 첫 칸에 지시문(8줄, 펼치기), 단계 중엔 아래 막대의 「지시문 n낱말」이 시트(#hsheet)를 연다. #out(글 칸·복사)은 폰에선 숨기고 값만 쓴다 ── */
  function words(t) { return (t.match(/\S+/g) || []).length; }
  function hresHTML() {
    var t = prompt(); if (!t) return '';
    var un = formy() ? [] : (st.scene.unlocked || []);
    return '<section class="hres"><div class="h"><b>지시문</b><small>' + words(t) + '낱말</small></div><pre class="hres-text' + (st.outOpen ? ' open' : '') + '">' + esc(t) + '</pre>' +
      '<button type="button" class="more" data-act="more">' + (st.outOpen ? '접기 ▴' : '펼치기 ▾') + '</button>' +
      (un.length ? '<p class="note">🔓 트리 밖에서 고른 칸: ' + esc(un.map(function (k) { return (STEPS.filter(function (s) { return s.key === k; })[0] || {}).ko || k; }).join(' · ')) + '</p>' : '') + '</section>';
  }
  function recordJSON() {
    var rec = { version: 1, hub: 'polos0117.github.io/prompt.html', atelier: st.a, subject: st.subject, style: st.style, mode: st.out, at: new Date().toISOString(), prompt: prompt() };
    if (formy()) { rec.card = st.card; if (st.card && st.card.form) rec.form = st.card.form; } else { rec.scene = st.scene; rec.unlocked = st.scene.unlocked || []; if ((st.scene.planned || []).length) rec.planned = st.scene.planned; }
    return rec;
  }
  function sheetHTML() {
    if (!st.sheet) return '';
    var isRec = st.sheet === 'record', t = isRec ? JSON.stringify(recordJSON(), null, 1) : prompt();
    return '<div class="pane" role="dialog" aria-modal="true" aria-label="' + (isRec ? '기록 JSON' : '지시문') + '"><div class="h"><b>' + (isRec ? '기록 JSON' : '지시문') + '</b><small>' + (isRec ? '' : words(t) + '낱말') + '</small>' +
      '<button type="button" class="btn ico" data-act="sheet-close" aria-label="닫기">✕</button></div><textarea readonly aria-label="' + (isRec ? '기록' : '지시문') + '">' + esc(t) + '</textarea>' +
      '<p class="rand"><button type="button" class="btn pri" data-act="copy-sheet">📋 복사</button>' + (isRec ? '' : '<button type="button" class="btn" data-act="record">기록 JSON</button>') + '</p></div>';
  }
  function copyText(t, btn) {
    var done = function () { if (btn) { btn.textContent = '복사했다 ✓'; setTimeout(function () { btn.textContent = '📋 복사'; }, 1500); } };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () { if (btn) btn.textContent = '자동 복사가 안 된다'; });
  }
  /* 선택지 — list: [{v, ko, sub, tag, group, why, out, off, attr}]. tabKey(폰·묶음이 둘 이상일 때) 가 있으면 위에 묶음 탭(전체 · 집 · 거리…)을 두고 고른 묶음만 그린다(docs/PROMPT_MOBILE_PLAN.md ④).
     폰에선 칸이 1열 줄(제목 왼쪽 · 꼬리 오른쪽 한 줄) — 모양은 prompt.html 의 ≤768 CSS */
  function optButtons(list, cur, tabKey) {
    var groups = {}, order = [];
    list.forEach(function (x) { var g = x.group || ''; if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(x); });
    var tabs = '', show = order;
    if (mobile() && tabKey && order.length > 1) {
      var t = st.tab[tabKey] || '';
      if (t && !groups[t]) t = '';
      show = t ? [t] : order;
      tabs = '<div class="gtabs" role="tablist">' + [['', '전체', list.length]].concat(order.map(function (g) { return [g, (CT.group(tree, g) || {}).ko || g || '기타', groups[g].length]; })).map(function (r) {
        return '<button type="button" class="gtab' + (r[0] === t ? ' on' : '') + '" role="tab" aria-selected="' + (r[0] === t) + '" data-gtab="' + esc(r[0]) + '" data-gtab-key="' + esc(tabKey) + '">' + esc(r[1]) + ' <i>' + r[2] + '</i></button>';
      }).join('') + '</div>';
    }
    return tabs + show.map(function (g) {
      var head = g ? '<h4>' + esc((CT.group(tree, g) || {}).ko || g) + '</h4>' : '';
      return head + '<div class="opts">' + groups[g].map(function (x) {
        var tail = x.why ? '<span class="why">' + esc(x.why) + '</span>' : (mobile() && x.tag) ? '<span>' + esc(x.tag) + '</span>' : x.sub ? '<span>' + esc(x.sub) + '</span>' : '';
        return '<button type="button" class="opt' + (x.out ? ' out' : '') + '" data-pick="' + esc(x.v) + '"' + (x.out ? ' data-out="1"' : '') + (x.attr || '') + (x.off ? ' disabled' : '') + ' aria-pressed="' + (String(cur || '') === String(x.v) ? 'true' : 'false') + '">' +
          '<b>' + (x.out ? '🔓 ' : '') + esc(x.ko) + (x.tag ? ' <i>' + esc(x.tag) + '</i>' : '') + '</b>' + tail + '</button>';
      }).join('') + '</div>';
    }).join('');
  }
  /* 여기부터 다시 — 지금 단계 뒤의 칸을 다 비우고 이 단계부터 다시 고른다(2026-10-29 사용자). 비운 칸 수를 돌려준다 */
  function restartFrom(key) {
    var ks = keysOf(), i = ks.indexOf(key), later = ks.slice(i + 1), n = 0;
    if (i < 0) return 0;
    if (!formy()) {
      var sc = Object.assign({}, st.scene);
      later.forEach(function (k) {
        if (k === 'axes') { if (JSON.stringify(sc.axes) !== JSON.stringify(H.FIXED)) n++; sc.axes = Object.assign({}, H.FIXED); return; }
        if (k === 'notes') { casualTexts().forEach(function (f) { if ((sc[f] || '').trim()) n++; sc[f] = ''; }); return; }
        if (sc[k]) n++; delete sc[k];
      });
      sc.unlocked = (sc.unlocked || []).filter(function (k) { return later.indexOf(k) < 0; });
      if (sc.planned) sc.planned = sc.planned.filter(function (k) { return later.indexOf(k) < 0; });
      sc.preset = '';
      st.scene = repair(sc);
    } else {
      /* 카드 갈래 — 새 카드(기본값)의 같은 단계·같은 조각에서 값을 가져온다. 단계 표는 카드 값에 따라 달라지니 열쇠로 맞춘다 */
      var make = (window.AtelierHubSteps || {})[st.a], fresh = A.card ? A.card(D, st.subject, S, undefined) : null;
      if (!make || !fresh) return 0;
      var x = { A: A, D: D, S: S, P: window.AtelierPrompt, R: window.AtelierSceneRandom, w: w, subject: st.subject, g: subj(), rnd: rnd2 };
      later.forEach(function (k) {
        var cur = stepOf(k), fs = make(st.out, Object.assign({}, x, { card: fresh })).filter(function (s) { return s.key === k; })[0];
        if (!cur || !fs) return;
        cur.parts.forEach(function (p, pi) {
          var q = fs.parts[pi]; if (!q || q.type !== p.type) return;
          try {
            if (p.type === 'params') { p.groups.forEach(function (g) { g.defs.forEach(function (d) { if (p.get(d.key) !== q.get(d.key)) { n++; p.set(d.key, q.get(d.key)); } if (p.custom && q.custom) p.custom.set(d.key, q.custom.get(d.key)); }); }); }
            else if (p.set && q.get) { var a = p.get(), b = q.get(); if (JSON.stringify(a) !== JSON.stringify(b)) { n++; p.set(b); } }
          } catch (e) { /* 그 조각은 못 비웠다 — 나머지는 계속 */ }
        });
      });
    }
    st.seen[st.out] = false;   // 뒤 칸은 아직 안 온 단계 — 칩도 다시 숨는다
    st.open = key; st.menu = false;
    save(); render();
    $('status').textContent = n ? '여기부터 다시 — 뒤 ' + n + '칸을 비웠다. 이 단계부터 고른다.' : '여기부터 다시 — 뒤에 비울 칸이 없다.';
    return n;
  }
  function restartBtn(k) { var ks = keysOf(); return ks.indexOf(k) >= 0 && ks.indexOf(k) < ks.length - 1 ? '<button type="button" class="btn" data-restart="' + k + '" title="뒤 단계를 다 비우고 이 단계부터 다시">↺ 여기부터 다시</button>' : ''; }
  function panelHTML() {
    var k = st.open;
    if (k === 'a') return '<h3>공방</h3><p class="note">어느 공방의 인물인가. 고르면 그 공방의 표·조립 코드로 다시 연다.</p><div class="opts">' +
      H.ORDER.map(function (a) { return '<a class="opt" href="?a=' + a + '" aria-pressed="' + (st.a === a) + '"><b>' + esc(H.get(a).ko) + '</b><span>/' + esc(H.get(a).repo) + '/</span></a>'; }).join('') + '</div>';
    if (!D) return '';
    if (k === 'style') {
      var def = A.defaultStyle(D, S);
      return '<h3>화풍</h3><p class="note">그 공방의 기본 화풍으로 맞춰 두었다. 바꿀 수 있다.</p>' +
        optButtons(A.styles(D, S).map(function (x) { return { v: x.key, ko: x.ko + (x.key === def ? ' · 기본' : '') }; }), st.style);
    }
    if (k === 'subject') {
      return '<h3>대상</h3><div class="find"><input type="search" id="find" placeholder="이름으로 찾기" value="' + esc(st.find || '') + '" aria-label="대상 찾기"></div>' +
        '<div id="subjects">' + subjectsHTML() + '</div>';
    }
    if (k === 'out') {
      var list = outList(), any = list.some(function (o) { return o.off; });
      return '<h3>출력 갈래</h3><p class="note">일상컷은 트리대로, 나머지는 그 공방 설계대로 — 옛 생성기와 같은 지시문이다.' + (any ? ' 준비 중인 갈래는 다음 단계에서 연다.' : '') + '</p><div class="opts">' +
        list.map(function (o) { return '<button type="button" class="opt" data-out-mode="' + o.key + '"' + (o.off ? ' disabled' : '') + ' aria-pressed="' + (st.out === o.key) + '"><b>' + esc(o.ko) + '</b>' + (o.off ? '<span>준비 중</span>' : o.note ? '<span>' + esc(o.note) + '</span>' : '') + '</button>'; }).join('') + '</div>';
    }
    if (k === 'done') {
      var ss = steps(), canRand = !formy() || ss.some(function (x) { return x.random; });
      var plan = !formy() && (st.scene.planned || []).length;
      return (mobile() ? hresHTML() : '') + '<h3>다 골랐다</h3><p class="note">칩을 누르면 그 단계로 돌아간다. ' + (mobile() ? '위 지시문을 아래 「복사」로 쓴다.' : '아래 지시문을 복사해 쓴다.') + (formy() && canRand ? ' 랜덤은 랜덤 단추가 있는 단계만 — 나머지는 그대로.' : '') +
        (plan ? ' 📌 계획기 칸 ' + plan + '개는 랜덤이 안 바꾼다.' : '') + '</p>' +
        /* 폰에선 「처음부터 다 랜덤」이 아래 막대에 있다 — 여기엔 계획 칸 풀기만 */
        (canRand && ss.length ? '<span class="rand">' + (mobile() ? '' : '<button type="button" class="btn" data-rand-all="' + ss[0].key + '">처음부터 다 랜덤</button>') + (plan ? '<button type="button" class="btn" data-act="unplan">계획 칸 풀기</button>' : '') + '</span>' : '');
    }
    if (formy()) return cardPanel(k);
    if (k === 'axes') {
      return '<h3>세부 강도</h3><p class="note">전체 강도·피부 노출은 일상컷 고정값(가장 강함·많이)으로 맞춰 두었다.</p>' + T.axes.map(function (ax) {
        return '<label class="axis">' + esc(ax.ko) + '<select data-axis="' + ax.key + '"><option value="">자동</option>' + ax.options.map(function (o) {
          return '<option value="' + esc(o[0]) + '"' + (st.scene.axes[ax.key] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
      }).join('') + nextBtn('axes');
    }
    if (k === 'notes') {
      return '<h3>덧붙임</h3><p class="note">비워도 된다 — 트리의 옷·장소가 지시문을 짓는다. 쓰면 그 글이 더해진다(옷은 트리 옷을 대신한다).</p>' +
        casualTexts().map(function (f) { var t = CTEXT[f]; return field('c-' + f, w(t[0], t[1]), st.scene[f], true, w(t[2], ''), '', ' data-cfield="' + f + '"'); }).join('') + nextBtn('notes');
    }
    var step = STEPS.filter(function (s) { return s.key === k; })[0];
    if (!step) return '';
    var list = inTree(k), out = st.unlock[k] ? outTree(k) : [];
    var note = k === 'expr' && !CT.exprOk(tree, st.scene) ? '<p class="note">하는 일이 표정을 정하거나 등을 보이는 방향이라 표정은 고르지 않는다.</p>' : '';
    /* 폰 — 해방한 트리 밖 선택지는 따로 아래가 아니라 같은 목록(제 묶음) 안에 흐리게 끼운다(⑤) */
    if (mobile()) return '<h3>' + esc(step.ko) + '</h3>' + note + (out.length ? '<p class="note">🔓 흐린 것은 이 길에서 빠진 값 — 고르면 기록에 남고 트리가 그 칸을 고치지 않는다.</p>' : '') + optButtons(list.concat(out), st.scene[k], k);
    return '<h3>' + esc(step.ko) + '</h3>' + note + optButtons(list, st.scene[k]) +
      '<div class="bar"><label class="unlock"><input type="checkbox" id="unlock" ' + (st.unlock[k] ? 'checked' : '') + '> 해방 — 트리 밖 선택지도 보기(' + outTree(k).length + ')</label>' + randomBar(k) + '</div>' +
      (out.length ? '<p class="note">흐린 것은 이 길에서 빠진 값이다. 고르면 🔓 가 붙고 기록에 남는다 — 트리가 그 칸을 고치지 않는다.</p>' + optButtons(out, st.scene[k]) : '');
  }
  /* ── 폰 아래 고정 막대 — 이전 · 🔓 해방(n) · 🎲 랜덤 ▾(이 칸 · 여기부터 · 다 골랐다로) · 다음/건너뛰기 ›. 다 고르면 🎲 처음부터 · 기록 JSON · 📋 복사.
     단추의 data-* 는 판 밑 단추와 같다(검사도 같은 것을 누른다). 공방·화풍·대상·출력 단계엔 없다 ── */
  function hbarHTML() {
    if (!mobile() || !A || !D) return '';
    var k = st.open, ks = keysOf(), i = ks.indexOf(k);
    if (k === 'done') {
      var ss = steps(), canRand = !formy() || ss.some(function (x) { return x.random; });
      return (canRand && ss.length ? '<button type="button" class="btn" data-rand-all="' + ss[0].key + '">🎲 처음부터</button>' : '') +
        '<button type="button" class="btn" data-act="record">기록 JSON</button><button type="button" class="btn pri" data-act="copy">📋 복사</button>';
    }
    if (i < 0) return '';
    var cs = formy() ? stepOf(k) : STEPS[i], last = i === ks.length - 1;
    var hasNext = formy() ? !!(cs && cs.next) : (k === 'axes' || k === 'notes');
    var hasRand = formy() ? !!(cs && cs.random) : (k !== 'axes' && k !== 'notes');
    var showUnlock = !formy() && k !== 'axes' && k !== 'notes';
    var canSkip = !hasNext && !(cs && cs.need && !st.scene[k]);   // 꼭 있어야 하는 칸이 비었으면 못 건넌다
    var right = hasNext ? '<button type="button" class="btn pri" data-next="' + k + '">' + (last ? '다 골랐다' : '다음 ›') + '</button>'
      : canSkip ? '<button type="button" class="btn pri" data-skip="' + k + '">' + (last ? '다 골랐다' : '건너뛰기 ›') + '</button>'
      : (skipBtn() ? '<button type="button" class="btn pri" data-open="done">다 골랐다로</button>' : '');
    /* 메뉴 — 랜덤 둘 · 다 골랐다로 · 여기부터 다시. 랜덤이 없는 단계도 「여기부터 다시」는 있다 */
    var items = (hasRand ? '<button type="button" class="btn" data-rand="' + k + '">🎲 이 칸 랜덤</button><button type="button" class="btn" data-rand-all="' + k + '">🎲 여기부터 다 랜덤</button>' : '') + skipBtn() + restartBtn(k);
    var menu = st.menu && items ? '<div class="hmenu" role="menu">' + items + '</div>' : '';
    var pt = prompt();
    return '<button type="button" class="btn ico" data-prev="' + k + '" aria-label="이전 단계">‹</button>' +
      (pt ? '<button type="button" class="btn" data-act="sheet">지시문 ' + words(pt) + '</button>' : '') +   /* 카드 갈래는 처음부터 지시문이 있다 — 고치다 바로 본다 */
      (showUnlock ? '<label class="unlock"><input type="checkbox" id="unlock" ' + (st.unlock[k] ? 'checked' : '') + '><span>🔓 해방 <i>(' + outTree(k).length + ')</i></span></label>' : '') +
      (items ? '<button type="button" class="btn" data-menu="rand" aria-expanded="' + (st.menu ? 'true' : 'false') + '">' + (hasRand ? '🎲 랜덤' : '↺ 더') + ' ▾</button>' : '') + right + menu;
  }
  function casualTexts() { return (A && A.casualTexts) || ['outfit', 'scene', 'custom']; }
  function field(id, labelText, value, multi, help, ph, at) {
    at = at || '';
    return '<label class="axis" for="f-' + id + '">' + esc(labelText) + (multi ? '<textarea id="f-' + id + '" data-field="' + id + '"' + at + ' rows="3" placeholder="' + esc(ph || '') + '">' + esc(value || '') + '</textarea>' :
      '<input type="text" id="f-' + id + '" data-field="' + id + '"' + at + ' value="' + esc(value || '') + '" placeholder="' + esc(ph || '') + '">') + (help ? '<small>' + esc(help) + '</small>' : '') + '</label>';
  }
  /* 판 밑 단추(다음·랜덤) — 폰에선 아래 막대(hbarHTML)가 대신하니 비운다 */
  function nextBtn(k) { if (mobile()) return ''; var ks = keysOf(), n = ks[ks.indexOf(k) + 1]; return '<p class="rand"><button type="button" class="btn" data-next="' + k + '">' + (n ? '다음' : '다 골랐다') + '</button>' + (n ? skipBtn() + (formy() ? '' : restartBtn(k)) : '') + '</p>'; }
  /* 한 번 다 골랐고 지금도 다 찼으면 — 남은 단계를 건너뛰어 다 골랐다로 */
  function skipBtn() { return st.seen[st.out] && firstOpen() === 'done' && prompt() ? '<button type="button" class="btn" data-open="done">다 골랐다로</button>' : ''; }
  function randomBar(k) { if (mobile()) return ''; return '<span class="rand"><button type="button" class="btn" data-rand="' + k + '">이 칸 랜덤</button><button type="button" class="btn" data-rand-all="' + k + '">여기부터 다 랜덤</button>' + skipBtn() + restartBtn(k) + '</span>'; }
  /* 이름 첫 글자 — 한글은 초성(된소리는 예사소리로), 숫자는 #, 그 밖은 대문자. 대상 목록 건너뛰기 칩 */
  var CHO = ['ㄱ', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅂ', 'ㅅ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  function initial(s) {
    var c = String(s || '').trim().charCodeAt(0); if (!c) return '';
    if (c >= 0xAC00 && c <= 0xD7A3) return CHO[Math.floor((c - 0xAC00) / 588)];
    if (c >= 48 && c <= 57) return '#';
    return String.fromCharCode(c).toUpperCase();
  }
  function subjectBtn(x) { return '<button type="button" class="opt" data-subject="' + esc(x.key) + '" data-initial="' + esc(initial(x.ko)) + '" aria-pressed="' + (st.subject === x.key) + '"><b>' + esc(x.ko) + '</b><span>' + esc(x.sub) + '</span></button>'; }
  function subjectsHTML() {
    var f = (st.find || '').trim().toLowerCase(), all = A.subjects(D), list = all.filter(function (x) { return !f || (x.ko + ' ' + x.sub).toLowerCase().indexOf(f) >= 0; });
    var html = '';
    if (mobile() && !f) {
      /* 최근 고른 대상 다섯 · 첫 글자 건너뛰기(이름 차례가 아닐 수 있어 처음 나오는 자리로) */
      var rc = (((saved.by || {})[st.a] || {}).recent || []).map(function (k) { return all.filter(function (x) { return x.key === k; })[0]; }).filter(Boolean);
      if (rc.length) html += '<h4>최근</h4><div class="opts people">' + rc.map(subjectBtn).join('') + '</div>';
      var seen = {}, inits = []; list.forEach(function (x) { var i = initial(x.ko); if (i && !seen[i]) { seen[i] = 1; inits.push(i); } });
      if (inits.length > 3) html += '<div class="gtabs jump" aria-label="첫 글자로 건너뛰기">' + inits.map(function (i) { return '<button type="button" class="gtab" data-jump="' + esc(i) + '">' + esc(i) + '</button>'; }).join('') + '</div>';
    }
    /* 다 그린다(포켓몬 1025) — 앞 120 만 그렸더니 그 밑으로 못 내려갔다. 폰은 content-visibility 로 그리기를 미룬다(CSS) */
    return html + '<p class="note">' + list.length + '명</p><div class="opts people">' + list.map(subjectBtn).join('') + '</div>';
  }
  function prompt() {
    if (!A || !D || !st.subject) return '';
    try {
      if (formy()) return st.card && !(A.lazy && lazyState !== 'done') ? A.buildCard(window, D, st.subject, st.style, st.out, st.card) : '';
      if (firstOpen() !== 'done') return '';
      return A.build(window, D, st.subject, st.style, st.scene);
    } catch (e) { return '(지시문을 못 지었다 — ' + e.message + ')'; }
  }
  function renderOut() {
    var t = prompt();
    $('out').hidden = !t; $('prompt').value = t;
    $('count').textContent = t ? (t.match(/\S+/g) || []).length + '낱말' : '';
    var un = formy() ? [] : (st.scene.unlocked || []);
    $('unlocked-note').textContent = un.length ? '🔓 트리 밖에서 고른 칸: ' + un.map(function (k) { return (STEPS.filter(function (s) { return s.key === k; })[0] || {}).ko || k; }).join(' · ') : '';
  }
  function render() {
    needLazy();
    if (st.open === 'done') st.seen[st.out] = true;   /* 한 번 다 골랐으면 그 뒤 고침은 다 골랐다로 돌아온다(advance) */
    var was = st.shown; st.shown = st.open;
    if (was !== st.open) st.menu = false;
    /* 다시 그리기 전에 연 묶음을 읽어 둔다 — toggle 사건은 늦게 와서, 묶음을 열자마자 값을 바꾸면 닫힌 채 다시 그려졌다 */
    [].forEach.call(document.querySelectorAll('details[data-grp]'), function (d) { st.grpOpen[d.dataset.grp] = d.open; });
    $('chips').innerHTML = chipsHTML();
    $('panel').innerHTML = panelHTML();
    var hb = $('hbar'); if (hb) { hb.innerHTML = hbarHTML(); hb.hidden = !hb.innerHTML; }
    var sh = $('hsheet'); if (sh) { if (!mobile()) st.sheet = ''; sh.innerHTML = sheetHTML(); sh.hidden = !sh.innerHTML; document.body.classList.toggle('sheet', !!sh.innerHTML); }
    document.body.classList.toggle('help', !!st.help);
    if (mobile()) {
      /* 붙는 머리(경로+레일)의 높이를 CSS 에 알린다 — 묶음 이름·초성 칩이 그 바로 아래에 붙고, scrollIntoView 도 그 아래로 온다 */
      document.documentElement.style.setProperty('--hchips-h', $('chips').offsetHeight + 'px');
      /* 칩 레일 — 지금 칸을 가운데로(세로는 안 움직인다). 경로 줄도 지금 칸이 보이게 */
      var rail = $('chips').querySelector('.hrail') || $('chips'), on = rail.querySelector('.hchip.on');
      if (on) rail.scrollLeft = Math.max(0, on.offsetLeft - (rail.clientWidth - on.offsetWidth) / 2);
      var path = $('chips').querySelector('.hpath'), cr = path && path.querySelector('.hcrumb.on'); if (path) path.scrollLeft = cr ? Math.max(0, cr.offsetLeft - 24) : path.scrollWidth;   // 지금 칸이 없으면(단계·끝) 끝으로 — n/N 이 마지막 조각을 덮지 않게
      /* 단계가 바뀌면 새 단계 윗머리를 레일 바로 아래로 — 긴 목록 중간에서 골랐을 때 새 단계가 화면 밖에서 시작하지 않게 */
      if (was && was !== st.open) window.scrollTo({ top: Math.max(0, $('panel').getBoundingClientRect().top + window.scrollY - $('chips').offsetHeight - 8), behavior: 'auto' });
    } else if (was && was !== st.open && $('panel').getBoundingClientRect().top < 0) $('panel').scrollIntoView({ block: 'start' });   // PC — 윗머리가 화면 위로 갔을 때만
    renderOut();
  }

  /* ── 누름 ── */
  document.addEventListener('click', function (e) {
    if (e.target.id === 'hsheet') { st.sheet = ''; render(); return; }   // 시트 바깥(어두운 자리)을 누르면 닫힌다
    var b = e.target.closest('button,[data-open]'); if (!b) return;
    if (b.dataset.open) { st.open = b.dataset.open; st.sheet = ''; render(); return; }
    if (b.dataset.subject != null) {
      st.subject = b.dataset.subject; st.scene = repair(st.scene); loadCard(); st.open = 'out';
      /* 최근 고른 대상 다섯 — 대상 목록 맨 위에 */
      var mine0 = (saved.by || {})[st.a] || {}, rc = (mine0.recent || []).filter(function (k) { return k !== st.subject; }); rc.unshift(st.subject); mine0.recent = rc.slice(0, 5); saved.by = saved.by || {}; saved.by[st.a] = mine0;
      save(); render(); return;
    }
    if (b.dataset.outMode) { st.out = b.dataset.outMode; st.open = begin(); save(); render(); return; }
    if (b.dataset.rand) { randomFrom(b.dataset.rand, false); return; }
    if (b.dataset.randAll) { randomFrom(b.dataset.randAll, true); return; }
    if (b.dataset.next) { advance(b.dataset.next); save(); render(); return; }
    if (b.dataset.act === 'unplan') { st.scene.planned = []; save(); render(); return; }
    /* 폰 아래 막대 */
    if (b.dataset.prev) { var pk = keysOf(), pi = pk.indexOf(b.dataset.prev); st.open = pi > 0 ? pk[pi - 1] : 'out'; render(); return; }
    if (b.dataset.skip) { advance(b.dataset.skip); save(); render(); return; }
    if (b.dataset.restart) { restartFrom(b.dataset.restart); return; }
    if (b.dataset.gtab != null) { st.tab[b.dataset.gtabKey] = b.dataset.gtab; render(); return; }
    if (b.dataset.menu) { st.menu = !st.menu; var hb2 = $('hbar'); hb2.innerHTML = hbarHTML(); hb2.hidden = !hb2.innerHTML; return; }
    if (b.dataset.act === 'copy') { copyText($('prompt').value, b); return; }
    if (b.dataset.act === 'copy-sheet') { var ta = b.closest('.pane') && b.closest('.pane').querySelector('textarea'); copyText(ta ? ta.value : $('prompt').value, b); return; }
    if (b.dataset.act === 'record') { if (mobile()) { st.sheet = 'record'; render(); } else { $('record').click(); $('record-out').scrollIntoView({ block: 'start' }); } return; }
    if (b.dataset.act === 'sheet') { st.sheet = 'prompt'; render(); return; }
    if (b.dataset.act === 'sheet-close') { st.sheet = ''; render(); return; }
    if (b.dataset.act === 'more') { st.outOpen = !st.outOpen; render(); return; }
    if (b.dataset.jump != null) { var tgt = document.querySelector('#subjects .opt[data-initial="' + b.dataset.jump.replace(/"/g, '\\"') + '"]'); if (tgt) tgt.scrollIntoView({ block: 'start' }); return; }
    if (b.id === 'help') { st.help = !st.help; render(); return; }
    if (b.dataset.btn != null) { var bs = stepOf(st.open), bp = bs && bs.parts[+b.dataset.part]; if (bp) bp.items[+b.dataset.btn].run(); save(); render(); return; }
    if (b.dataset.pick != null) {
      if (st.open === 'style') { st.style = b.dataset.pick; st.open = st.subject ? begin() : 'subject'; save(); render(); return; }
      if (formy()) { partPick(st.open, +b.dataset.part, b.dataset.pick); return; }
      choose(st.open, b.dataset.pick, !!b.dataset.out); return;
    }
    if (b.id === 'copy') { navigator.clipboard && navigator.clipboard.writeText($('prompt').value).then(function () { $('copied').textContent = '복사했다'; }, function () { $('prompt').select(); $('copied').textContent = '자동 복사가 안 된다 — 글을 골라 두었다'; }); return; }
    if (b.id === 'record') { $('record-out').hidden = false; $('record-text').value = JSON.stringify(recordJSON(), null, 1); return; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'unlock') { st.unlock[st.open] = t.checked; render(); return; }
    if (t.dataset.axis) { st.scene.axes = Object.assign({}, st.scene.axes); if (t.value) st.scene.axes[t.dataset.axis] = t.value; else delete st.scene.axes[t.dataset.axis]; save(); render(); return; }
    /* 카드 갈래 조각 — 고르개·켜고 끄기·외형 */
    if (t.dataset.part != null && formy()) {
      var ps = stepOf(st.open), pp = ps && ps.parts[+t.dataset.part];
      if (!pp) return;
      if (t.dataset.param) pp.set(t.dataset.param, t.value);
      else if (t.dataset.pcustom) return;   // 직접 입력 글은 input 에서
      else if (pp.type === 'check') pp.set(t.checked);
      else if (pp.type === 'select') pp.set(t.value);
      else return;
      save(); render();
    }
  });
  document.addEventListener('toggle', function (e) {
    var d = e.target; if (!(d.dataset && d.dataset.grp && d.isConnected)) return;
    var k = d.dataset.grp, fromRender = renderedOpen[k]; renderedOpen[k] = false;   // 그리며 난 첫 toggle 은 사람이 아니다 — 그 사이 사람이 연 다른 묶음을 닫으면 안 된다
    st.grpOpen[k] = d.open;
    /* 폰 — 외형 묶음은 한 번에 하나만 연다(긴 쪽을 막는다) */
    if (mobile() && d.open && !fromRender) [].forEach.call(document.querySelectorAll('details[data-grp]'), function (o) { if (o !== d && o.open) { o.open = false; st.grpOpen[o.dataset.grp] = false; } });
  }, true);
  /* 폰 키보드가 올라오면(보이는 화면이 150px 넘게 줄면) 아래 막대를 숨긴다 — 글 칸과 겹치지 않게. 초점으로 숨기면 글을 쓰다 바로 「다음」을 못 누른다 */
  if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { document.body.classList.toggle('kb', window.visualViewport.height < window.innerHeight - 150); });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'find') { st.find = t.value; $('subjects').innerHTML = subjectsHTML(); return; }
    if (t.dataset.cfield && !formy()) { st.scene[t.dataset.cfield] = t.value; save(); $('chips').innerHTML = chipsHTML(); renderOut(); return; }
    /* 글 칸 — 다시 그리지 않고(쓰는 자리 유지) 값과 지시문·칩만 */
    if (t.dataset.part != null && formy() && (t.dataset.field || t.dataset.pcustom)) {
      var ps = stepOf(st.open), pp = ps && ps.parts[+t.dataset.part];
      if (!pp) return;
      if (t.dataset.pcustom) pp.custom.set(t.dataset.pcustom, t.value); else pp.set(t.value);
      save(); $('chips').innerHTML = chipsHTML(); renderOut();
    }
  });
  /* 검사(tests/prompt-screen.cjs)가 보는 곳 — 지금 상태, 지시문, 트리가 고칠 것이 남았나 */
  window.AtelierHubPrompt = { state: function () { return st; }, prompt: prompt, settled: function (sc) { var n = repair(sc); return STEPS.every(function (s) { return s.key === 'axes' || String(n[s.key] || '') === String(sc[s.key] || ''); }); } };
  boot();
})();
