/* 통합 생성기 받침 — 공방마다 무엇을 싣고(조립 코드·자료), 대상·화풍을 어떻게 고르고, 일상컷 지시문을 어떻게 짓는가(2026-10-29).
   허브(prompt.html)는 화면과 단계만 맡는다. 지시문은 늘 그 공방의 조립 코드(/<공방>/lib/…)가 짓는다 — 공방 생성기와 같은 입력을 넘겨서
   옛 생성기와 같은 글이 나오게(tests/prompt-parity.cjs 가 견준다). 브라우저(window.AtelierHubAdapters)와 node(module.exports) 둘 다.
   받침 하나:
     key · repo · ko · libs(그 공방 파일, 차례대로) · data({이름: 자료 파일})
     subjects(d) → [{key, ko, sub}] · styles(d, S) → [{key, ko}] · defaultStyle(d, S)
     subject(d, key) → 트리가 보는 대상(장소의 해 거르기 — game 의 facts.year·era, pkm 의 gen)
     tables(S) → 선택지 표 {frames, lenses, poses, orients, exprs, axes:[{key, ko, options:[[값, 이름]]}]}
     build(w, d, key, style, scene) → 일상컷 지시문. w 는 그 공방 파일을 실은 창(window·node 의 맥락) */
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
  var casualOf = function (scene) {
    var sc = Object.assign(blank(), scene || {});
    sc.axes = Object.assign({}, FIXED, (scene || {}).axes || {});
    sc.preset = sc.preset || '';
    sc.randomLocks = { 'axes.overall_intensity': true, 'axes.skin_exposure': true, aspect: true };
    return sc;
  };
  /* game·book — 설계표의 편(권), 화풍 판(style.json), 시범 폼. 생성기 「기록 내보내기」 와 같은 상태(tools/casual-plan.cjs record) */
  function designAdapter(key, repo, ko, subjectKey, list, extra) {
    return {
      key: key, repo: repo, ko: ko,
      libs: ['lib/prompt-spec.js', 'lib/casual-tree.js', 'lib/prompt-' + key + '.js'],
      data: { design: 'data/' + key + '-design.json', style: 'data/style.json', tree: 'data/casual-tree.json' },
      subjects: function (d) { return d.design[list].map(function (g) { return { key: g.key, ko: g.title, sub: g.title_en || g.author || '' }; }); },
      styles: function (d) { return Object.keys(d.style.styles).map(function (k) { return { key: k, ko: d.style.styles[k].name }; }); },
      /* book 은 기본 화풍이 비어 있다(null) — 첫 화풍(tools/casual-plan.cjs 와 같게) */
      defaultStyle: function (d) { return d.style.default && d.style.styles[d.style.default] ? d.style.default : Object.keys(d.style.styles)[0]; },
      subject: function (d, k) { return d.design[list].filter(function (g) { return g.key === k; })[0] || null; },
      tables: tablesStd,
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
      libs: ['lib/prompt-spec.js', 'lib/casual-tree.js', 'lib/prompt-myth.js'],
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
      libs: ['lib/prompt-spec.js', 'lib/casual-tree.js', 'lib/prompt-anthro.js', 'lib/prompt-lifestyle.js'],
      data: { cards: 'data/card.json', tree: 'data/casual-tree.json' },
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
  var api = { ORDER: ['game', 'book', 'myth', 'pkm'], FIXED: FIXED, all: A, get: function (k) { return A[k] || null; } };
  root.AtelierHubAdapters = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
