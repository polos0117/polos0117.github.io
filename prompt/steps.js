/* 통합 생성기 — 일상컷 밖의 출력 갈래(폼·개방·초상·각성·저주·스킨)의 단계 표(2026-10-29).
   허브(prompt/hub.js)는 이 표를 받아 칩·판·랜덤·다음을 그리기만 한다. 공방마다 함수 하나: steps(out, x) → [단계].
   x = {A(받침), D(자료), S(그 공방 표), P(조립 코드), R(장면 랜덤), w(낱말 — 없으면 둘째 값), subject, g(대상 자료), card(고칠 카드 — 여기서 바로 고친다), rnd(목록 → 하나)}
   단계: {key, ko, shown() → 칩 글, parts: [조각], random()? — 「이 칸 랜덤」 · 「여기부터 다 랜덤」 이 부른다, next? — 「다음」 단추}
   조각: note {text} · facts {rows:[[이름, 값]]}
     pick {ko?, opts() → [{v, ko, sub, why, off}], get(), set(v), stay(v)? — 참이면 고르고도 이 단계에 남는다}
     check {ko, note, get(), set(참거짓)} · text {id, ko, multi, help, ph, get(), set(글)} · select {id, ko, opts:[[값, 이름]], help, get(), set(값)}
     params {groups:[{key, ko, note, defs:[{key, ko, opts:[[값, 이름]]}]}], get(열쇠), set(열쇠, 값), custom?: {get(열쇠), set(열쇠, 글)}}
     buttons {items:[{ko, run()}]}
   값을 고치는 모양은 그 공방 옛 생성기의 저장값 그대로 — 지시문은 받침(prompt/adapters.js buildCard)이 옛 생성기와 같은 입력으로 짓는다. */
(function (root) {
  'use strict';
  var auto = function (x) { return { v: '', ko: x.w('prompt.auto', '자동') }; };
  var rowsOf = function (list) { return (list || []).filter(function (r) { return r[0] && r[0] !== '__custom__' && String(r[0]).indexOf('auto_') !== 0; }); };
  var pickRow = function (opts, v, fb) { var r = opts.filter(function (o) { return o.v === (v || ''); })[0]; return r ? r.ko : fb; };
  /* 고르는 단계 하나 — 자동(빈 값) 줄, 이 칸 랜덤 */
  function pickStep(key, ko, opts, get, set, x, rand) {
    return { key: key, ko: ko, shown: function () { return pickRow(opts(), get(), get() || x.w('prompt.auto', '자동')); },
      parts: [{ type: 'pick', opts: opts, get: get, set: set }],
      random: rand ? function () { var o = opts().map(function (r) { return r.v; }).filter(function (v) { return v && v !== get(); }); if (o.length) set(x.rnd(o)); } : null };
  }

  /* 연출 → 표정 → 자세 → 방향 → 프레이밍 → 렌즈 → 화면 비율 → 덧붙임 — game·book 폼 초상과 pkm 액션이 같은 칸(옛 생성기도 같은 표) */
  function sceneSteps(x, sc, mode) {
    var S = x.S, w = x.w, R = x.R || root.AtelierSceneRandom;
    var cat = function () { return S.ACTION_CATEGORIES.filter(function (r) { return r.key === (sc.action || {}).category; })[0]; };
    var rows = function (list) { return [auto(x)].concat(rowsOf(list).map(function (r) { return { v: r[0], ko: r[1] }; })); };
    /* 장면 칸 랜덤 — 그 공방 lib/prompt-random.js 의 칸 목록(game·book 'form', pkm 'action') */
    var roll = function (fields) { fields.forEach(function (f) { Object.assign(sc, R.randomize(Object.assign({}, sc, { randomLocks: {} }), mode, f, Math.random)); delete sc.randomLocks; }); };
    var scenePick = function (key, ko, opts) {
      var s = pickStep(key, ko, opts, function () { return sc[key]; }, function (v) { sc[key] = v; }, x);
      if (R) s.random = function () { roll([key]); };
      return s;
    };
    return [{ key: 'action', ko: w('prompt.action.settings', '연출'), next: true, shown: function () { var a = cat(); return a ? a.label : w('prompt.auto', '자동'); },
      parts: [{ type: 'note', text: w('prompt.action.category.help', '') },
        { type: 'select', id: 'category', ko: w('prompt.action.category', '연출 갈래'), opts: [['', w('prompt.auto', '자동')]].concat(S.ACTION_CATEGORIES.map(function (r) { return [r.key, r.label]; })),
          help: (cat() || {}).description, get: function () { return (sc.action || {}).category || ''; }, set: function (v) { sc.action = Object.assign({}, sc.action, { category: v, example: '' }); } }]
        .concat(cat() ? [{ type: 'select', id: 'example', ko: w('prompt.action.example', '연출 장면 예시'), opts: [['', w('prompt.auto', '자동')]].concat(cat().examples.map(function (r) { return [r.key, r.label]; })),
          help: ((cat().examples.filter(function (r) { return r.key === sc.action.example; })[0]) || {}).description, get: function () { return sc.action.example || ''; }, set: function (v) { sc.action = Object.assign({}, sc.action, { example: v }); } }] : [])
        .concat(S.ACTION_CONTROLS.map(function (ctl) {
          return { type: 'select', id: ctl.key, ko: ctl.label, opts: [['', w('prompt.auto', '자동')]].concat(ctl.options.map(function (r) { return [r.key, r.label]; })),
            help: ((ctl.options.filter(function (r) { return r.key === (sc.action || {})[ctl.key]; })[0]) || {}).description || ctl.description,
            get: function () { return (sc.action || {})[ctl.key] || ''; }, set: function (v) { var a = Object.assign({}, sc.action); a[ctl.key] = v; sc.action = a; } };
        })),
      random: R ? function () { roll(Object.keys(R.fields(sc, mode)).filter(function (f) { return f.indexOf('action.') === 0; })); } : null },
      scenePick('expr', w('prompt.expression', '표정'), function () { return rows(S.EXPRESSION_OPTIONS); }),
      scenePick('pose', w('prompt.pose', '자세'), function () { return [auto(x)].concat(S.ACTION_POSES.map(function (r) { return { v: r.key, ko: r.label, sub: r.description }; })); }),
      scenePick('orient', w('prompt.orientation', '방향'), function () { return rows(S.ORIENTATION_OPTIONS); }),
      scenePick('frame', '프레이밍', function () { return rows(S.FRAME_OPTIONS); }),
      scenePick('lens', '렌즈', function () { return rows(S.LENS_OPTIONS); }),
      scenePick('aspect', w('prompt.aspect', '화면 비율'), function () { return ['2:3', '3:2', '1:1', '9:16', '16:9'].map(function (a) { return { v: a, ko: a }; }); }),
      { key: 'notes', ko: '덧붙임', next: true, shown: function () { var n = [sc.camera, sc.scene, sc.outfit, sc.custom].filter(function (t) { return t && t.trim(); }).length; return n ? n + '칸' : '없음'; },
        parts: [['camera', 'prompt.camera', '카메라·구도 추가 지시', false], ['scene', 'prompt.scene', '장소·상황', true], ['outfit', 'prompt.outfit', '의상·소품', true], ['custom', 'prompt.extra', '추가 연출 요청', true]].map(function (f) {
          return { type: 'text', id: f[0], ko: w(f[1], f[2]), multi: f[3], help: w('prompt.help.' + f[0], ''), get: function () { return sc[f[0]]; }, set: function (t) { sc[f[0]] = t; } };
        }) }];
  }

  /* 새 인물 외형 — game·book·pkm 이 같은 표(S.PARAM_DEFS · IDENTITY_GROUPS). designed(열쇠) 가 참이면 무작위가 비워 두어 설계가 채운다(옛 생성기 randomize) */
  function lookStep(x, c, designed, none) {
    var S = x.S, w = x.w, defs = S.PARAM_DEFS.filter(function (d) { return S.IDENTITY_GROUPS.indexOf(d.group) >= 0 && S.IDENTITY_EXCLUDED.indexOf(d.key) < 0; });
    return { key: 'look', ko: w('prompt.appearance', '외형'), next: true,
      shown: function () { var n = Object.keys(c.params).filter(function (k) { return c.params[k]; }).length; return n ? n + '칸 고름' : none; },
      parts: [{ type: 'note', text: w('prompt.appearance.note', '자동 항목은 설계표와 모델이 정한다.') },
        { type: 'buttons', items: [{ ko: w('prompt.random', '외형 무작위'), run: function () {
          defs.forEach(function (d) { if (c.locks[d.key] || designed(d.key)) return; var ch = d.options.filter(function (o) { return o[0] && o[0] !== '__custom__'; }); c.params[d.key] = ch.length ? x.rnd(ch)[0] : ''; });
        } }, { ko: w('prompt.reset', '외형 초기화'), run: function () { c.params = {}; } }] },
        { type: 'params', groups: S.IDENTITY_GROUPS.map(function (gk) { return { key: gk, ko: w('prompt.group.' + gk, gk), defs: defs.filter(function (d) { return d.group === gk; }).map(function (d) { return { key: d.key, ko: d.ko, opts: d.options.filter(function (o) { return o[0] !== '__custom__'; }) }; }) }; }),
          get: function (k) { return c.params[k] || ''; }, set: function (k, v) { if (v) c.params[k] = v; else delete c.params[k]; } }] };
  }

  /* ── game·book: 폼 초상 · 개방 ── 옛 생성기 lib/prompt-ui.js(Editor)의 칸 그대로 */
  function design(out, x) {
    var A = x.A, D = x.D, S = x.S, w = x.w, c = x.card, sc = c.scenes[out], p = A.pilot(D, x.subject);
    var forms = function () {
      return A.forms(D).map(function (f) {
        var fx = A.facts(D, x.subject, f.key), pilot = out === 'open' ? p.open === f.key : p.form === f.key;
        var none = out === 'open' && !fx.open;
        return { v: f.key, ko: f.stage + (pilot ? ' · ' + w('dex.pilot', '시범') : ''), sub: none ? '' : out === 'open' ? fx.open : fx.look, off: none, why: none ? '이 폼엔 개방 장면이 없다' : '' };
      });
    };
    var facts = function () {
      var fx = A.facts(D, x.subject, c.form), rows = [[w(A.key + '.persona', '한 줄 인격'), (x.g || {}).persona]];
      if (out === 'open') rows.push([w(A.key + '.open', '개방'), fx.open]);
      else rows.push([w(A.key + '.look', '모습'), fx.look], [w(A.key + '.pose', '자세'), fx.pose], [w(A.key + '.setting', '배경'), fx.setting], [w('prompt.role', '역할'), fx.role]);
      return rows;
    };
    var formStep = { key: 'form', ko: '폼', shown: function () { return pickRow(forms(), c.form, c.form); },
      parts: [{ type: 'note', text: w(out === 'open' ? 'prompt.open.note' : (c.identityMode === 'reference' ? 'prompt.reference.note' : 'prompt.create.note'), '') },
        { type: 'pick', opts: forms, get: function () { return c.form; }, set: function (v) { c.form = v; } }, { type: 'facts', rows: facts }] };
    if (out === 'open') {
      return [formStep, { key: 'notes', ko: '덧붙임', next: true, shown: function () { var n = [c.lookNote, sc.custom].filter(function (t) { return t && t.trim(); }).length; return n ? n + '칸' : '없음'; },
        parts: [{ type: 'text', id: 'lookNote', ko: w('prompt.open.override', '명장면 세부 요청'), multi: true, ph: w('prompt.open.override.ph', ''), get: function () { return c.lookNote; }, set: function (t) { c.lookNote = t; } },
          { type: 'text', id: 'custom', ko: w('prompt.extra', '추가 연출 요청'), multi: true, help: w('prompt.help.custom', ''), get: function () { return sc.custom; }, set: function (t) { sc.custom = t; } }] }];
    }
    var create = c.identityMode !== 'reference', baseOpts = function () { return A.forms(D).map(function (f) { return { v: f.key, ko: f.stage }; }); };
    var stageOf = function (k) { return (A.forms(D).filter(function (f) { return f.key === k; })[0] || {}).stage || k; };
    var vocab = function (o, pre) { return Object.keys(o || {}).filter(function (k) { return o[k]; }).map(function (k) { return w(A.key + '.' + pre + '.' + k, k) + ' · ' + (((S.VOCAB_EN || {})[k] || {})[o[k]] || o[k]); }).join('\n'); };
    var designed = function (k) { return (c.faceDesignOn && Object.keys(S.FACE_PARAM).some(function (f) { return S.FACE_PARAM[f] === k; })) || (c.silhouetteOn && Object.keys(S.SIL_PARAM).some(function (f) { return S.SIL_PARAM[f] === k; })); };
    var list = [formStep,
      { key: 'ident', ko: w('prompt.stage', '인물 기준'), shown: function () { return create ? '새 인물' : '이어가기 · ' + stageOf(c.baseForm); },
        parts: [{ type: 'pick', opts: function () { return [{ v: 'create', ko: w('prompt.create', '새 인물'), sub: w('prompt.create.note', '') }, { v: 'reference', ko: w('prompt.reference', '이어가기'), sub: w('prompt.reference.note', '') }]; },
          get: function () { return c.identityMode; }, set: function (v) { c.identityMode = v; if (v === 'reference' && !c.baseForm) c.baseForm = c.form; }, stay: function (v) { return v === 'reference'; } }]
          .concat(create ? [] : [{ type: 'pick', ko: w('prompt.base', '첨부할 확정 그림'), opts: baseOpts, get: function () { return c.baseForm; }, set: function (v) { c.baseForm = v; } },
            { type: 'note', text: w('prompt.anchor.note', '') }]) },
      { key: 'exposure', ko: w('prompt.exposure', '노출'), shown: function () { return w('prompt.exposure.' + (c.exposure || 'auto'), c.exposure || '자동'); },
        parts: [{ type: 'pick', opts: function () { return S.FORM_EXPOSURE_KEYS.map(function (k) { return { v: k, ko: w('prompt.exposure.' + (k || 'auto'), k || '자동'), sub: w('prompt.exposure.help.' + (k || 'auto'), '') }; }); },
          get: function () { return c.exposure; }, set: function (v) { c.exposure = v; } }] },
      { key: 'design', ko: '설계 줄', next: true,
        shown: function () { return [create && (c.silhouetteOn ? '실루엣' : '실루엣 끔'), create && (c.faceDesignOn ? '얼굴' : '얼굴 끔'), c.motifs && '모티프', c.lookNote && '폼 요청'].filter(Boolean).join(' · ') || '설계표대로'; },
        parts: (create ? [{ type: 'note', text: '새 인물(첫 그림)에만 실리는 줄 — 끄면 그 묶음을 빼고, 외형에서 직접 고른 항목이 그 묶음을 이긴다.' },
          { type: 'check', ko: w('prompt.sil.use', '실루엣 싣기'), note: c.silhouetteOn ? vocab((x.g || {}).silhouette, 'sil') : '', get: function () { return c.silhouetteOn; }, set: function (v) { c.silhouetteOn = v; } },
          { type: 'check', ko: w('prompt.face.use', '얼굴 설계 싣기'), note: c.faceDesignOn ? vocab((x.g || {}).face, 'face') : '', get: function () { return c.faceDesignOn; }, set: function (v) { c.faceDesignOn = v; } }] :
          [{ type: 'note', text: '이어가기 — 얼굴·머리·체형은 첨부한 그림이 쥔다.' }]).concat([
          { type: 'text', id: 'motifs', ko: w('prompt.motifs', '모티프'), help: w('prompt.help.motifs.form', ''), ph: w('prompt.motifs.ph', ''), get: function () { return c.motifs; }, set: function (t) { c.motifs = t; } },
          { type: 'text', id: 'lookNote', ko: w('prompt.override', '폼 세부 요청'), ph: w('prompt.override.ph', ''), get: function () { return c.lookNote; }, set: function (t) { c.lookNote = t; } }]) }];
    if (create) list.push(lookStep(x, c, designed, '설계표대로'));
    return list.concat(sceneSteps(x, sc, 'form'));
  }

  /* ── myth: 액션 한 장(초상) · 각성 · 저주 · 스킨 ── 옛 생성기 prompt.html(App)의 칸 그대로. 카드는 무기마다 하나(갈래끼리 같이 쓴다) */
  function myth(out, x) {
    var S = x.S, w = x.w, c = x.card, card = x.g || {};
    var notes = { key: 'notes', ko: '장면 메모', next: true, shown: function () { return (c.scene || '').trim() ? '있음' : '없음'; },
      parts: [{ type: 'note', text: out === 'awaken' ? w('prompt.awaken.note', '') : ((S.OUTPUTS[out] || {}).note || '') },
        { type: 'text', id: 'scene', ko: w('prompt.scene', '장면 메모'), ph: w('prompt.scene.hint', ''), get: function () { return c.scene; }, set: function (t) { c.scene = t; } }] };
    if (out === 'awaken' || out === 'cursed') return [notes];
    if (out === 'skin') {
      var skins = card.skins || [];
      if (!skins.length) return [{ key: 'skin', ko: w('prompt.skin', '스킨'), shown: function () { return '없음'; }, parts: [{ type: 'note', text: w('prompt.skin.none', '이 무기엔 스킨이 없다.') }] }];
      var cur = function () { return (skins.filter(function (k) { return k.key === c.skin; })[0] || skins[0]).key; };
      return [pickStep('skin', w('prompt.skin', '스킨'), function () { return skins.map(function (k) { return { v: k.key, ko: k.name, sub: k.look }; }); }, cur, function (v) { c.skin = v; }, x),
        pickStep('sstate', w('prompt.skin.state', '스킨 상태'), function () { return ['base', 'awaken', 'cursed'].map(function (k) { return { v: k, ko: w('prompt.skin.state.' + k, k) }; }); },
          function () { return c.skinState === 'awaken' || c.skinState === 'cursed' ? c.skinState : 'base'; }, function (v) { c.skinState = v; }, x),
        notes];
    }
    /* 초상 — 설계 언어·붙일 문단 → 자세 → 외형 → 장면 메모 */
    var acts = function () { return [{ v: '', ko: w('prompt.posture.none', '자동') }].concat((S.ACTIONS[card.kind] || []).map(function (a) { return { v: a[0], ko: a[1] }; })); };
    var custom = function (k) { return k + '_custom'; };
    return [
      { key: 'design', ko: w('prompt.design', '설계'), next: true,
        shown: function () { var d = (S.DESIGNS.filter(function (r) { return r[0] === (c.design || 'mecha'); })[0] || [])[1] || c.design; var n = Object.keys(c.extras || {}).filter(function (k) { return c.extras[k]; }).length; return d + (n ? ' · 문단 ' + n : ''); },
        parts: [{ type: 'note', text: w('prompt.design.note', '') },
          { type: 'pick', ko: w('prompt.design.kind', '설계 언어'), opts: function () { return S.DESIGNS.map(function (d) { return { v: d[0], ko: d[1], sub: d[2] }; }); }, get: function () { return c.design || 'mecha'; }, set: function (v) { c.design = v; }, stay: function () { return true; } }]
          .concat(S.EXTRAS.map(function (e) { return { type: 'check', ko: e[1], note: e[2], get: function () { return !!(c.extras || {})[e[0]]; }, set: function (v) { var x2 = Object.assign({}, c.extras); x2[e[0]] = v; c.extras = x2; } }; })) },
      pickStep('posture', w('prompt.posture', '자세'), acts, function () { return c.action || ''; }, function (v) { c.action = v; }, x, true),
      { key: 'look', ko: w('prompt.identity', '외형'), next: true,
        shown: function () { var n = Object.keys(c.params || {}).filter(function (k) { return c.params[k] && !/_custom$/.test(k); }).length; return n ? n + '칸 고름' : '자동'; },
        parts: [{ type: 'note', text: w('prompt.identity.note', '') },
          { type: 'params', groups: S.PARAM_GROUPS.map(function (g) { return { key: g[0], ko: g[1], note: g[2], defs: S.PARAMS.filter(function (p) { return p.group === g[0]; }).map(function (p) { return { key: p.key, ko: p.ko, opts: p.options }; }) }; }),
            get: function (k) { return (c.params || {})[k] || ''; }, set: function (k, v) { var p = Object.assign({}, c.params); if (v) p[k] = v; else delete p[k]; c.params = p; },
            custom: { get: function (k) { return (c.params || {})[custom(k)] || ''; }, set: function (k, t) { var p = Object.assign({}, c.params); p[custom(k)] = t; c.params = p; } } }] },
      notes];
  }

  /* ── pkm: 액션(경장·중장·고기동) · 개방(폭주) ── 옛 생성기 lib/prompt-ui.js(Editor)의 액션 칸 그대로. 카드는 포켓몬마다 하나 */
  function pkm(out, x) {
    var A = x.A, D = x.D, S = x.S, w = x.w, c = x.card, sc = c.scenes.action, ch = x.g || {}, P = x.P || root.AtelierPrompt;
    var face = A.face(D, ch), appearance = A.appearance(D, ch), formKo = function (f) { return w('form.' + f, f); };
    var texts = [{ type: 'text', id: 'formOverride', ko: w('prompt.override', '폼 세부 요청'), ph: w('prompt.override.ph', ''), get: function () { return c.formOverride; }, set: function (t) { c.formOverride = t; } },
      { type: 'text', id: 'motifs', ko: w('prompt.motifs', '원작 특징 입는 법 — 직접 쓰기'), help: w('prompt.help.motifs.auto', ''), ph: w('prompt.motifs.ph', ''), get: function () { return c.motifs; }, set: function (t) { c.motifs = t; } }];
    var textShown = function () { return [c.formOverride && '폼 요청', c.motifs && '입는 법'].filter(Boolean).join(' · '); };
    if (out === 'open') {
      return [{ key: 'base', ko: w('prompt.base', '폭주 기준 장갑'), shown: function () { return c.baseForm === 'reference' ? w('prompt.base.reference', '첨부한 그림의 장갑') : formKo(c.baseForm); },
          parts: [{ type: 'note', text: w('prompt.overdrive.note', '') },
            { type: 'pick', opts: function () { return A.FORMS.map(function (f) { return { v: f, ko: formKo(f), sub: w('prompt.' + f + '.note', '') }; }).concat([{ v: 'reference', ko: w('prompt.base.reference', '첨부한 그림의 장갑') }]); },
              get: function () { return c.baseForm; }, set: function (v) { c.baseForm = v; } }] },
        { key: 'design', ko: '폼 요청', next: true, shown: function () { return textShown() || '없음'; }, parts: texts },
        { key: 'notes', ko: '덧붙임', next: true, shown: function () { return (sc.custom || '').trim() ? '있음' : '없음'; },
          parts: [{ type: 'text', id: 'custom', ko: w('prompt.extra', '추가 연출 요청'), multi: true, help: w('prompt.help.custom', ''), get: function () { return sc.custom; }, set: function (t) { sc.custom = t; } }] }];
    }
    var create = c.identityMode !== 'reference';
    var head = S.HEAD_FEATURE_OPTIONS.map(function (r) { return [r[0], r[1]]; }), headCustom = !!c.headFeature && !head.some(function (o) { return o[0] === c.headFeature; });
    var label = function (k) { return S.PARAM_DEFS.filter(function (d) { return d.key === k; })[0] || { ko: k, options: [] }; };
    var ko = function (k, v) { var o = label(k).options.filter(function (o) { return o[0] === v; })[0]; return o ? o[1].split('— ').pop() : v; };
    var designParts = [];
    if (create) {
      var wear = P.wearClauses ? P.wearClauses({ sourceAppearance: appearance, headFeature: c.headFeature }) : [];
      var feats = appearance && P.sourceFeatures ? P.sourceFeatures({ sourceAppearance: appearance }).join(' · ') : '';
      designParts.push({ type: 'note', text: (appearance === undefined ? '원작 외형 자료를 받는 중이거나 못 받았다 — 받으면 자동 입는 법이 붙는다.' : feats) },
        { type: 'note', text: !c.motifs.trim() && wear.length ? w('prompt.wear.note', '자동으로 실리는 입는 법') + ':\n' + wear.join('\n') : '' },
        { type: 'select', id: 'headFeature', ko: w('prompt.head', '머리 특징 표현'), opts: head, help: w('prompt.head.help', ''), get: function () { return headCustom ? '__custom__' : c.headFeature; }, set: function (v) { c.headFeature = v; } });
      if (headCustom || c.headFeature === '__custom__') designParts.push({ type: 'text', id: 'headCustom', ko: w('prompt.custom', '직접 입력'), get: function () { return headCustom ? c.headFeature : ''; }, set: function (t) { c.headFeature = t || '__custom__'; } });
      if (face) designParts.push({ type: 'check', ko: w('prompt.face.use', '이 종의 얼굴·머리 설계 쓰기'),
        note: c.faceDesignOn ? S.FACE_KEYS.map(function (k) { return label(k).ko + ' · ' + ko(k, (face.face || {})[k]) + (c.params[k] ? ' — 직접 고른 값이 이긴다' : ''); })
          .concat(S.HAIR_KEYS.filter(function (k) { return (face.hair || {})[k]; }).map(function (k) { return label(k).ko + ' · ' + ko(k, face.hair[k]); })).join('\n') : '',
        get: function () { return c.faceDesignOn; }, set: function (v) { c.faceDesignOn = v; } });
    } else designParts.push({ type: 'note', text: '이어가기 — 얼굴·머리·체형은 첨부한 그림이 쥔다.' });
    var designed = function (k) { return !!(face && c.faceDesignOn && (S.FACE_KEYS.indexOf(k) >= 0 || (S.HAIR_KEYS.indexOf(k) >= 0 && (face.hair || {})[k]))); };
    var list = [
      { key: 'form', ko: w('prompt.form', '장갑 폼'), shown: function () { return formKo(c.form); },
        parts: [{ type: 'pick', opts: function () { return A.FORMS.map(function (f) { return { v: f, ko: formKo(f), sub: w('prompt.' + f + '.note', '') }; }); }, get: function () { return c.form; }, set: function (v) { c.form = v; } }] },
      { key: 'ident', ko: w('prompt.stage', '인물 기준'), shown: function () { return create ? '새 인물' : '이어가기'; },
        parts: [{ type: 'pick', opts: function () { return [{ v: 'create', ko: w('prompt.create', '새 인물'), sub: w('prompt.create.note', '') }, { v: 'reference', ko: w('prompt.reference', '이어가기'), sub: w('prompt.reference.note', '') }]; },
          get: function () { return c.identityMode; }, set: function (v) { c.identityMode = v; } }] },
      { key: 'design', ko: create ? w('prompt.wear.title', '원작 특징 — 의상으로') : '폼 요청', next: true,
        shown: function () { return [create && c.headFeature && '머리 ' + ((head.filter(function (o) { return o[0] === c.headFeature; })[0] || [])[1] || '직접').split(' — ')[0], create && face && (c.faceDesignOn ? '얼굴 설계' : '얼굴 설계 끔'), textShown()].filter(Boolean).join(' · ') || '자동'; },
        parts: designParts.concat(texts) }];
    if (create) list.push(lookStep(x, c, designed, '자동'));
    return list.concat(sceneSteps(x, sc, 'action'));
  }

  /* ── element: 세계 그림 ── 세계(판타지·스팀펑크·메카 — 주민은 사는 세계만) → 덧붙임. 지시문은 그 공방 lib/prompt-element.js build 가 짓는다 */
  function element(out, x) {
    var A = x.A, D = x.D, w = x.w, c = x.card, g = x.g || {}, n = g.nation || {};
    if (out !== 'world') return [];
    var WK = { fantasy: '판타지', steampunk: '스팀펑크', mecha: '메카' };
    var worlds = function () { return A.worlds(D, x.subject).map(function (k) { return { v: k, ko: w('world.' + k, WK[k] || k), sub: ((n.worlds || {})[k] || {}).ko || '' }; }); };
    return [
      { key: 'world', ko: '세계', shown: function () { return c.world ? w('world.' + c.world, WK[c.world] || c.world) : '—'; },
        parts: [{ type: 'note', text: g.tier === 'citizen' ? '주민은 사는 세계만. 얼굴·생김새·자세는 세계마다 따로 뽑는다.' : '얼굴·생김새·자세는 세계마다 따로 뽑는다.' },
          { type: 'pick', opts: worlds, get: function () { return c.world; }, set: function (v) { c.world = v; } }],
        random: function () { var o = worlds().map(function (r) { return r.v; }).filter(function (v) { return v !== c.world; }); if (o.length) c.world = x.rnd(o); } },
      { key: 'notes', ko: '덧붙임', next: true, shown: function () { var k = Object.keys(c.notes).filter(function (f) { return (c.notes[f] || '').trim(); }).length; return k ? k + '칸' : '없음'; },
        parts: [{ type: 'note', text: '비워도 된다 — 설계표가 지시문을 짓는다. 쓰면 그 글이 더해진다.' }].concat([['scene', 'studio.notes.scene', '장소·상황'], ['outfit', 'studio.notes.outfit', '의상·소품'], ['custom', 'studio.notes.custom', '추가 연출 요청']].map(function (f) {
          return { type: 'text', id: f[0], ko: w(f[1], f[2]), multi: true, get: function () { return c.notes[f[0]]; }, set: function (t) { var nn = Object.assign({}, c.notes); nn[f[0]] = t; c.notes = nn; } }; })) }];
  }

  root.AtelierHubSteps = { game: design, book: design, myth: myth, pkm: pkm, element: element };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.AtelierHubSteps;
})(typeof window !== 'undefined' ? window : globalThis);
