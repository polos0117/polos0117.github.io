/* 통합 생성기 받침 — 공방마다 무엇을 싣고(조립 코드·자료), 대상·화풍을 어떻게 고르고, 일상컷 지시문을 어떻게 짓는가(2026-10-29).
   허브(prompt.html)는 화면과 단계만 맡는다. 지시문은 늘 그 공방의 조립 코드(/<공방>/lib/…)가 짓는다 — 공방 생성기와 같은 입력을 넘겨서
   옛 생성기와 같은 글이 나오게(tests/prompt-parity.cjs 가 견준다). 브라우저(window.AtelierHubAdapters)와 node(module.exports) 둘 다.
   받침 하나:
     key · repo · ko · libs(그 공방 파일, 차례대로) · data({이름: 자료 파일})
     subjects(d) → [{key, ko, sub}] · styles(d, S) → [{key, ko}] · defaultStyle(d, S)
     subject(d, key) → 트리가 보는 대상(장소의 해 거르기 — game 의 facts.year·era, pkm 의 gen)
     tables(S) → 선택지 표 {frames, lenses, poses, orients, exprs, axes:[{key, ko, options:[[값, 이름]]}]}
     build(w, d, key, style, scene) → 일상컷 지시문. w 는 그 공방 파일을 실은 창(window·node 의 맥락)
     outputs(S) → [{key, ko, note, off}] 출력 갈래(off 는 준비 중). 'casual' 은 일상컷 트리, 나머지는 카드 갈래 — 단계 표는 prompt/steps.js.
     카드 갈래를 여는 받침(2단계 game·book 폼·개방, 3단계 myth 초상·각성·저주·스킨)은 더:
       card(d, key, S, saved) → 카드(옛 생성기 저장값 꼴 — 없는 값은 기본으로). 갈래끼리 같이 쓴다(옛 생성기도 대상마다 하나)
       buildCard(w, d, key, style, 갈래, card) → 지시문(옛 생성기와 같은 입력)
     game·book 은 또 forms(d) → [{key, stage}] · pilot(d, key) → {form, open}(폼 열쇠) · facts(d, key, 폼) → {look, pose, setting, role, open}
     casualTexts — 일상컷 덧붙임 글 칸(없으면 옷·장소·추가 요청). planFrom(w, d, raw, 대상) — 일상컷 계획기 주소를 받는 공방(pkm)만.
     planHome(대상, raw) — 버전2 계획 컷(treeV 2)을 넘길 그 공방 생성기 주소(허브 단계가 버전1 칸이라).
     lazy({이름: 자료 파일}) — 카드 갈래에 들어갈 때만 받는 큰 자료(pkm 원작 외형·종별 얼굴, 2MB 넘게). 없으면 null(옛 생성기도 못 받으면 없이 짓는다) */
(function (root) {
  'use strict';
  var FIXED = { overall_intensity: 'strong', skin_exposure: 'bold' };   /* 일상컷 고정값 — 네 공방 생성기가 처음부터 잠그는 값 */
  var rows = function (list) { return (list || []).filter(function (r) { return r[0] && r[0] !== '__custom__' && String(r[0]).indexOf('auto_') !== 0; }).map(function (r) { return [r[0], r[1]]; }); };
  var axesStd = function (S) {
    return (S.LOCAL_AXES || []).map(function (k) {
      return { key: k, ko: (S.ADVANCED_LABELS[k] || [k, k])[1], options: (S.ADVANCED_OPTIONS[k] || []).filter(function (v) { return v && v !== 'AUTO'; }).map(function (v) { return [v, ((S.ADV_VAL || {})[k] || {})[v] || v]; }) };
    });
  };
  var tablesStd = function (S) {
    return { frames: rows(S.FRAME_OPTIONS), lenses: rows(S.LENS_OPTIONS), poses: rows(S.POSE_OPTIONS), orients: rows(S.ORIENTATION_OPTIONS), exprs: rows(S.EXPRESSION_OPTIONS), axes: axesStd(S), close: S.CLOSE_FRAMES || [] };
  };
  /* 장면 → 공방 생성기 저장값의 일상컷 칸(빈 칸은 자동) */
  var blank = function () { return { expr: '', pose: '', orient: '', scene: '', outfit: '', frame: '', lens: '', camera: '', custom: '', aspect: '2:3', axes: {}, action: {}, randomLocks: {} }; };
  /* 폼·개방 장면 칸 — 옛 생성기 blankScene 의 폼 몫 */
  var formBlank = function () { return { expr: '', pose: '', orient: '', scene: '', outfit: '', frame: '', lens: '', camera: '', custom: '', aspect: '2:3', action: {} }; };
  var obj = function (x) { return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; };
  var casualOf = function (scene) {
    var sc = Object.assign(blank(), scene || {});
    sc.axes = Object.assign({}, FIXED, (scene || {}).axes || {});
    sc.preset = sc.preset || '';
    sc.randomLocks = { 'axes.overall_intensity': true, 'axes.skin_exposure': true, aspect: true };
    return sc;
  };
  /* game·book — 설계표의 편(권), 화풍 판(style.json), 시범 폼. 생성기 「기록 내보내기」 와 같은 상태(tools/casual-plan.cjs record) */
  function designAdapter(key, repo, ko, subjectKey, list, extra) {
    var stageOf = function (d, fk) { var m = d.design.vocab.form_key; return Object.keys(m).filter(function (s) { return m[s] === fk; })[0] || ''; };
    return {
      key: key, repo: repo, ko: ko,
      outputs: function () { return [{ key: 'casual', ko: '일상컷' }, { key: 'form', ko: '폼 초상' }, { key: 'open', ko: '개방·각성' }]; },
      /* 낱말(lib/words.js)은 폼 단계 이름을 옛 생성기와 같게 쓰려고, 랜덤(lib/prompt-random.js)은 폼 장면 칸 목록 */
      libs: ['lib/words.js', 'lib/prompt-spec.js', 'lib/casual-tree.js', 'lib/prompt-' + key + '.js', 'lib/prompt-random.js'],
      data: { design: 'data/' + key + '-design.json', style: 'data/style.json', tree: 'data/casual-tree.json' },
      subjects: function (d) { return d.design[list].map(function (g) { return { key: g.key, ko: g.title, sub: g.title_en || g.author || '' }; }); },
      styles: function (d) { return Object.keys(d.style.styles).map(function (k) { return { key: k, ko: d.style.styles[k].name }; }); },
      /* book 은 기본 화풍이 비어 있다(null) — 첫 화풍(tools/casual-plan.cjs 와 같게) */
      defaultStyle: function (d) { return d.style.default && d.style.styles[d.style.default] ? d.style.default : Object.keys(d.style.styles)[0]; },
      subject: function (d, k) { return d.design[list].filter(function (g) { return g.key === k; })[0] || null; },
      tables: tablesStd,
      forms: function (d) { var m = d.design.vocab.form_key; return Object.keys(m).map(function (s) { return { key: m[s], stage: s }; }); },
      pilot: function (d, k) { var g = this.subject(d, k), p = obj(g && g.pilot), m = d.design.vocab.form_key; return { form: m[p.form] || '', open: m[p.open] || '' }; },
      facts: function (d, k, fk) {
        var g = this.subject(d, k) || {}, s = stageOf(d, fk), f = obj(obj(g.forms)[s]), o = obj(obj(g.opens)[s]);
        return { stage: s, look: f.look || '', pose: f.pose || '', setting: f.setting || '', role: f.role || '', open: o.scene || '' };
      },
      /* 옛 생성기 normalize 의 폼 몫 — 처음 여는 대상은 시범 폼에서 */
      card: function (d, k, S, saved) {
        var x = obj(saved), keys = this.forms(d).map(function (f) { return f.key; }), first = this.pilot(d, k).form || keys[0];
        var c = { form: first, identityMode: 'create', baseForm: first, exposure: S.FORM_EXPOSURE_DEFAULT, motifs: '', lookNote: '', faceDesignOn: true, silhouetteOn: true, params: {}, locks: {} };
        Object.keys(c).forEach(function (f) { if (x[f] !== undefined) c[f] = x[f]; });
        if (keys.indexOf(c.form) < 0) c.form = first;
        if (keys.indexOf(c.baseForm) < 0) c.baseForm = first;
        if (['create', 'reference'].indexOf(c.identityMode) < 0) c.identityMode = 'create';
        if (S.FORM_EXPOSURE_KEYS.indexOf(c.exposure) < 0) c.exposure = S.FORM_EXPOSURE_DEFAULT;
        ['motifs', 'lookNote'].forEach(function (f) { if (typeof c[f] !== 'string') c[f] = ''; });
        ['faceDesignOn', 'silhouetteOn'].forEach(function (f) { if (typeof c[f] !== 'boolean') c[f] = true; });
        c.params = Object.assign({}, obj(c.params)); c.locks = Object.assign({}, obj(c.locks));
        c.scenes = {};
        ['form', 'open'].forEach(function (m) { var sc = Object.assign(formBlank(), obj(obj(x.scenes)[m])); sc.action = Object.assign({}, obj(sc.action)); c.scenes[m] = sc; });
        return c;
      },
      buildCard: function (w, d, k, style, mode, card) {
        var S = w.AtelierSpec, P = w.AtelierPrompt, g = this.subject(d, k);
        if (!g || ['form', 'open'].indexOf(mode) < 0) return '';
        if (!d.style.styles[style]) style = this.defaultStyle(d);
        var st = d.style.styles[style], ver = st.versions.filter(function (v) { return v.v === st.current; })[0];
        var c = this.card(d, k, S, card), scene = c.scenes[mode];
        /* 옛 생성기 lib/prompt-ui.js 의 result — {...카드, ...장면, 대상, 트리, 폼, 기준 폼, 화풍 글, …}. 첨부 화풍 그림은 허브에선 안 쓴다 */
        var input = Object.assign({}, c, { style: style, version: st.current, mode: mode, casualN: 1, attachStyleRef: false }, scene, { tree: d.tree, stage: stageOf(d, c.form), baseStage: stageOf(d, c.baseForm),
          styleText: ver.text, styleCheck: ver.check || '', styleRef: false, outputMode: mode, identityMode: mode !== 'form' || c.identityMode === 'reference' ? 'reference' : 'create',
          params: Object.keys(c.params).map(function (p) { return [p, c.params[p]]; }) }, extra(ver));
        input[subjectKey] = g;
        return P.buildPrompt(input);
      },
      build: function (w, d, k, style, scene) {
        var S = w.AtelierSpec, P = w.AtelierPrompt, g = this.subject(d, k);
        if (!g) return '';
        if (!d.style.styles[style]) style = this.defaultStyle(d);
        var st = d.style.styles[style], ver = st.versions.filter(function (v) { return v.v === st.current; })[0];
        var forms = d.design.vocab.form_key, pilot = forms[(g.pilot || {}).form] || Object.keys(forms).map(function (x) { return forms[x]; })[0];
        var stage = Object.keys(forms).filter(function (x) { return forms[x] === pilot; })[0];
        var card = { style: style, version: st.current, identityMode: 'create', form: pilot, baseForm: pilot, casualN: 1, exposure: S.FORM_EXPOSURE_DEFAULT,
          attachStyleRef: false, motifs: '', lookNote: '', faceDesignOn: true, silhouetteOn: true, params: {}, locks: {}, mode: 'casual' };
        var input = Object.assign({}, card, casualOf(scene), { tree: d.tree, stage: stage, baseStage: stage, styleText: ver.text, styleCheck: ver.check || '', styleRef: false,
          outputMode: 'casual', identityMode: 'reference', params: [] }, extra(ver));
        input[subjectKey] = g;
        return P.buildCasual(input);
      }
    };
  }
  var A = {
    game: designAdapter('game', 'game-atelier', '게임', 'game', 'games', function (ver) { return { styleCasual: ver.casual || '' }; }),
    book: designAdapter('book', 'book-atelier', '책', 'book', 'books', function () { return {}; }),
    myth: {
      key: 'myth', repo: 'myth-atelier', ko: '신화 무기',
      casualTexts: ['outfit', 'scene'],   // 옛 생성기 일상컷 글 칸은 옷·장면 둘
      /* 낱말(lib/words.js) — 단계 이름을 옛 생성기와 같게 */
      libs: ['lib/words.js', 'lib/prompt-spec.js', 'lib/casual-tree.js', 'lib/prompt-myth.js'],
      /* 옛 생성기 출력 고르개 차례(S.OUTPUTS) 그대로 — 액션 한 장 · 각성 · 저주 · 일상컷 · 스킨 */
      outputs: function (S) { return Object.keys(S.OUTPUTS).map(function (k) { return { key: k, ko: S.OUTPUTS[k].name, note: S.OUTPUTS[k].note }; }); },
      /* 옛 생성기 DEFAULT 의 일상컷 밖 몫 — 무기마다 하나, 갈래끼리 같이 쓴다 */
      card: function (d, k, S, saved) {
        var x = obj(saved), c = { action: '', scene: '', params: {}, design: 'mecha', extras: {}, skin: '', skinState: 'base' };
        Object.keys(c).forEach(function (f) { if (x[f] !== undefined) c[f] = x[f]; });
        ['action', 'scene', 'skin', 'skinState', 'design'].forEach(function (f) { if (typeof c[f] !== 'string') c[f] = ''; });
        if (!c.design) c.design = 'mecha';
        if (!c.skinState) c.skinState = 'base';
        c.params = Object.assign({}, obj(c.params)); c.extras = Object.assign({}, obj(c.extras));
        return c;
      },
      buildCard: function (w, d, k, style, out, card) {
        var S = w.AtelierSpec;
        if (!S.OUTPUTS[out] || out === 'casual') return '';
        /* 옛 생성기: {...DEFAULT(), ...store[무기], card} — 일상컷 칸은 이 갈래들에 안 쓰인다 */
        var st = Object.assign({ style: S.DEFAULT_STYLE, output: 'portrait', action: '', casualIndex: 1, scene: '', params: {} }, this.card(d, k, S, card), { card: k, style: style, output: out });
        return w.AtelierPrompt.build(st, { cards: d.cards.cards, group: d.group, skills: d.skill.skills, tree: d.tree });
      },
      data: { cards: 'data/card.json', group: 'data/group.json', skill: 'data/skill.json', tree: 'data/casual-tree.json' },
      subjects: function (d) { return d.cards.cards.map(function (c) { return { key: c.name, ko: c.name, sub: c.en }; }); },
      styles: function (d, S) { return S.STYLES.map(function (r) { return { key: r[0], ko: r[1] }; }); },
      defaultStyle: function (d, S) { return S.DEFAULT_STYLE; },
      subject: function (d, k) { return d.cards.cards.filter(function (c) { return c.name === k; })[0] || null; },
      tables: function (S) {
        return { frames: rows(S.CASUAL_FRAMES), lenses: rows(S.CASUAL_LENSES), poses: rows(S.CASUAL_POSES), orients: rows(S.CASUAL_ORIENTS), exprs: rows(S.CASUAL_EXPRESSIONS), close: S.CLOSE_FRAMES || [],
          axes: S.CASUAL_AXES.map(function (k) { return { key: k, ko: (S.CASUAL_AXIS_LABELS[k] || [k, k])[1], options: (S.CASUAL_AXIS_OPTIONS[k] || []).filter(function (v) { return v && v !== 'AUTO'; }).map(function (v) { return [v, v]; }) }; }) };
      },
      build: function (w, d, k, style, scene) {
        var sc = Object.assign({ era: 'now', place: '', act: '', ofam: '', item: '', frame: '', lens: '', pose: '', orient: '', expr: '', outfit: '', scene: '', preset: '' }, scene || {});
        sc.axes = Object.assign({}, FIXED, (scene || {}).axes || {}); sc.locks = {};
        return w.AtelierPrompt.build({ card: k, style: style, output: 'casual', casualIndex: 1, scene: '', params: {}, casual: sc },
          { cards: d.cards.cards, group: d.group, skills: d.skill.skills, tree: d.tree });
      }
    },
    pkm: {
      key: 'pkm', repo: 'pkm-atelier', ko: '포켓몬',
      /* 옛 생성기는 액션 한 갈래에 폼 넷(경장·중장·고기동·폭주). 허브는 game·book 처럼 둘로 — 액션(경장·중장·고기동) · 개방(폭주 + 기준 장갑) */
      outputs: function (S, w) { return [{ key: 'casual', ko: '일상컷' }, { key: 'action', ko: w ? w('prompt.action', '액션') : '액션', note: w ? w('prompt.action.note', '') : '' },
        { key: 'open', ko: (w ? w('form.overdrive', '폭주') : '폭주') + ' · 개방', note: w ? w('prompt.overdrive.note', '') : '' }]; },
      /* 낱말(lib/words.js) — 단계 이름을 옛 생성기와 같게, 랜덤(lib/prompt-random.js) — 액션 장면 칸 목록 */
      libs: ['lib/words.js', 'lib/prompt-spec.js', 'lib/casual-tree.js', 'lib/prompt-anthro.js', 'lib/prompt-lifestyle.js', 'lib/prompt-random.js', 'lib/casual-plan.js'],
      /* 일상컷 계획기 주소(tools/casual-plan.cjs — ?mech=&casual=)를 받는다. 옛 생성기 lib/prompt-ui.js planned 와 같은 몫: 트리 위의 값만 {scene, locks, bad} */
      /* 버전2 계획 컷은 허브 단계가 아직 못 받는다 — pkm 생성기(lib/prompt-state.js plannedV2 가 잠근다)로 같은 값을 넘긴다 */
      planHome: function (mech, raw) { return '/pkm-atelier/prompt.html?mech=' + encodeURIComponent(mech) + '&casual=' + encodeURIComponent(raw); },
      planFrom: function (w, d, raw, c) { var CP = w.AtelierCasualPlan; return CP && c ? CP.fromQuery(w.AtelierSpec, raw, d.tree, { gen: c.gen }) : null; },
      data: { cards: 'data/card.json', tree: 'data/casual-tree.json' },
      lazy: { appearance: 'data/source-appearance.json', faces: 'data/face-design.json' },
      FORMS: ['light', 'heavy', 'mobility'],
      appearance: function (d, c) { return d.appearance ? (d.appearance.entries || {})[String(c.no)] : undefined; },
      face: function (d, c) { return d.faces ? (d.faces.faces || {})[String(c.no)] || null : null; },
      /* 옛 생성기 normalize 의 액션 몫. 폭주는 개방 갈래가 붙이니 카드의 폼은 경장·중장·고기동 하나 */
      card: function (d, k, S, saved) {
        var x = obj(saved), c = { identityMode: 'create', form: 'light', baseForm: 'light', motifs: '', formOverride: '', headFeature: '', faceDesignOn: true, params: {}, locks: {} };
        Object.keys(c).forEach(function (f) { if (x[f] !== undefined) c[f] = x[f]; });
        if (this.FORMS.indexOf(c.form) < 0) c.form = 'light';
        if (['create', 'reference'].indexOf(c.identityMode) < 0) c.identityMode = 'create';
        if (['reference', 'light', 'heavy', 'mobility'].indexOf(c.baseForm) < 0) c.baseForm = 'light';
        ['motifs', 'formOverride', 'headFeature'].forEach(function (f) { if (typeof c[f] !== 'string') c[f] = ''; });
        if (typeof c.faceDesignOn !== 'boolean') c.faceDesignOn = true;
        c.params = Object.assign({}, obj(c.params)); c.locks = Object.assign({}, obj(c.locks));
        var sc = Object.assign(formBlank(), obj(obj(x.scenes).action)); sc.action = Object.assign({}, obj(sc.action));
        c.scenes = { action: sc };
        return c;
      },
      buildCard: function (w, d, k, style, out, card) {
        var P = w.AtelierPrompt, ch = this.subject(d, k);
        if (!ch || ['action', 'open'].indexOf(out) < 0) return '';
        var c = this.card(d, k, w.AtelierSpec, card), od = out === 'open';
        if (od) c.form = 'overdrive';
        /* 옛 생성기 lib/prompt-ui.js 의 result — 개방은 늘 그 폼 그림을 첨부한다(이어가기) */
        var input = Object.assign({}, c, { style: style, mode: 'action' }, c.scenes.action, { mech: ch.name, sourceName: ch.en, sourceAppearance: this.appearance(d, ch), faceDesign: this.face(d, ch), tree: d.tree, gen: ch.gen,
          series: [ch.element, ch.element2].filter(Boolean).join(' / '), outputMode: 'action', identityMode: od || c.identityMode === 'reference' ? 'reference' : 'create',
          params: Object.keys(c.params).map(function (p) { return [p, c.params[p]]; }) });
        return P.buildPrompt(input);
      },
      subjects: function (d) { return d.cards.cards.character.map(function (c) { return { key: c.name, ko: c.name, sub: String(c.no).padStart(4, '0') + ' · ' + c.en }; }); },
      styles: function (d, S) { return S.ART_STYLES.map(function (r) { return { key: r[0], ko: r[1] }; }); },
      defaultStyle: function (d, S) { return S.DEFAULT_STYLE; },
      subject: function (d, k) { return d.cards.cards.character.filter(function (c) { return c.name === k; })[0] || null; },
      tables: tablesStd,
      build: function (w, d, k, style, scene) {
        var c = this.subject(d, k);
        if (!c) return '';
        /* 생성기 화면(lib/prompt-ui.js)의 입력과 같게 — 첨부한 그림이 인물을 쥐니 외형 값은 안 쓴다 */
        return w.AtelierLifestyle.buildSingle(Object.assign({ style: style, identityMode: 'reference', form: 'light', baseForm: 'light', motifs: '', formOverride: '', headFeature: '',
          faceDesignOn: true, params: [], locks: {}, mode: 'casual' }, casualOf(scene), { mech: c.name, sourceName: c.en, series: [c.element, c.element2].filter(Boolean).join(' / '),
          tree: d.tree, gen: c.gen, outputMode: 'casual' }));
      }
    }
  };
  /* 대상 → 트리가 보는 것(장소의 해 거르기). pkm 은 세대 — 카드 그대로 넘기면 gen 을 읽는다 */
  var api = { ORDER: ['game', 'book', 'myth', 'pkm'], FIXED: FIXED, formBlank: formBlank, all: A, get: function (k) { return A[k] || null; } };
  root.AtelierHubAdapters = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
