/* 공방 넘나드는 그림 자료(2026-11-25) — 공방 여덟의 그림 등록부(/<저장소>/data/img.json)와 일상컷 색인(/<저장소>/data/casual-index.json)을
   한 꼴의 줄(그림 한 장 = 한 줄)로 모은다. 사용자 「새기능중에 공방넘나드는 검색,도감 추가해줘」.
   화면(search.html 「전체 그림 찾기」)과 검사(tests/search.cjs)가 같은 파일을 쓰고, 뒤에 「오늘의 한 장」 · 통계판도 이것을 받아 쓴다 — DOM 을 만지지 않는다.

   AtelierGallery.ATELIERS — [{a(즐겨찾기의 공방 열쇠), repo, name, c(지도 색), index(일상컷 색인이 있나), link(card, file)}] — 이름 · 색은 지도 ROOMS · favorites.html ROOM 과 같다.
   AtelierGallery.normalize(def, doc, index, meta, lib) → 줄 목록. 줄 하나:
     {atelier, card, cardName, world, worldKo, form, formKo, style, styleKo, kind, n, file, thumb, full, link, added(YYYY-MM-DD), t(차례용 시각 글), aspect, sex, casual}
       kind — world(세계 · 폼 · 카드 그림) · casual(일상컷) · own(90번 — 캐릭터만의 컷) · vista(전경) · other(특별컷 · 연출컷)
       casual — 색인이 있는 일상컷만: {family, familyKo, item, itemKo, shade, shadeKo, required, requiredKo, design, cosplay, free, place, placeKo, placeGroup, placeGroupKo,
                act, actKo, frameKo, exprKo, en(장소 · 하는 일 · 구도가 GPT 영어), ar, raw(색인 한 줄 그대로 — 설명 cnote.js 가 읽는다)}
       thumb · full · link 는 읽을 때 짓는다(그 공방의 lib/img.js 주소 규칙 — 그림 저장소 여럿 · where) — 2만 7천 줄에 주소 글을 들고 있지 않게.
   img.json 의 꼴은 공방마다 다르다(삼국지 · 원소 · 도시 byForm=세계, 포켓몬 · 게임 · 책 byForm=폼, 신화 awaken · cursed · skin, 건담 화풍 없는 기본 몫 · m) —
   꼴을 하나하나 적지 않고 길을 따라 걸으며 길의 이름(byStyle · byForm · casual · extra · action · awaken · cursed · skin · vista)으로 가른다. 모르는 칸의 .webp 는 other.
   AtelierGallery.libFrom(src) — 공방의 lib/img.js 글을 따로 된 창에서 돌려 그 AtelierImg(imgURL · thumbURL · setShards)를 받는다. 못 하면 fallbackLib(BASES).
   AtelierGallery.FACETS · run(rows, sel, opt) → {list, counts, total} — 거르기(칸 안은 또는, 칸끼리는 그리고) · 칸마다 「이것을 고르면 몇 장」(그 칸만 빼고 거른 수) · 줄 세우기.
   AtelierGallery.parse(search) · query(sel) — 주소 ?a=samguk&a=city&fr=허리 위 … (값이 여럿이면 열쇠를 되풀이).
   AtelierGallery.Loader — 고른 공방만, 셋씩 나란히 받아 공방이 올 때마다 알린다. 받은 것은 이 쪽(메모리)에 둔다 — 합쳐 13MB 남짓이라 sessionStorage(5MB)에 넣지 않는다. */
(function (root) {
  'use strict';
  var G = 'https://polos0117.github.io';
  /* 공방 — 차례는 즐겨찾기(favorites.html ORDER)와 같다. imgRepos 는 lib/img.js 를 못 돌릴 때의 사본(tests/search.cjs 가 공방의 BASES 와 견준다) */
  var ATELIERS = [
    { a: 'gundam', repo: 'atelier', name: '건담 격납고', c: '#7fb3ff', bases: [G + '/atelier/img/'],
      link: function (card, file) { return '/atelier/dex.html?' + qs({ mech: card, pic: file }); } },
    { a: 'book', repo: 'book-atelier', name: '책의 서재', c: '#e39b6b', bases: [G + '/book-atelier-img/img/'],
      link: function (card, file) { return '/book-atelier/dex.html?' + qs({ book: card, pic: file }); } },
    { a: 'pkm', repo: 'pkm-atelier', name: '포켓몬 연구소', c: '#f4c542', index: true, bases: [1, 2, 3, 4, 5].map(function (i) { return G + '/pkm-atelier-img' + (i > 1 ? '-' + i : '') + '/img/'; }),
      link: function (card, file) { return '/pkm-atelier/dex.html?' + qs({ mech: card, pic: file }); } },
    { a: 'myth', repo: 'myth-atelier', name: '신화 무기 대장간', c: '#d9b45a', bases: [G + '/myth-atelier-img/img/'],
      link: function (card, file) { return '/myth-atelier/dex.html?' + qs({ card: card, pic: file }); } },
    { a: 'game', repo: 'game-atelier', name: '게임 오락실', c: '#ff6ad5', bases: [G + '/game-atelier-img/img/'],
      link: function (card, file) { return '/game-atelier/dex.html?' + qs({ game: card, pic: file }); } },
    { a: 'element', repo: 'element-atelier', name: '원소의 섬', c: '#5fd3e8', index: true, bases: [1, 2, 3].map(function (i) { return G + '/element-atelier-img' + (i > 1 ? '-' + i : '') + '/img/'; }),
      /* 원소는 주소가 층이다(lib/walk-core.js) — 나라 n = 카드 열쇠 앞 마디, 목록 층에서 그 카드 · 그 그림 */
      link: function (card, file) { return '/element-atelier/index.html?' + qs({ n: String(card).split('-')[0], mode: 'list', card: card, pic: file }); } },
    { a: 'samguk', repo: 'sam-atelier', name: '삼국지 군막', c: '#c9a227', index: true, bases: [1, 2, 3].map(function (i) { return G + '/sam-atelier-img' + (i > 1 ? '-' + i : '') + '/img/'; }),
      link: function (card, file) { return '/sam-atelier/dex.html?' + qs({ card: card, pic: file }); } },
    { a: 'city', repo: 'city-atelier', name: '도시공방', c: '#9fd3a8', index: true, bases: [G + '/city-atelier-img/img/'],
      /* 도시는 ?tab=dex&city=<도시>&card=<도시 또는 도시-명소>&pic= (lib/walk-core.js · city-view.js 즐겨찾기 link 와 같다) */
      link: function (card, file) { return '/city-atelier/index.html?' + qs({ tab: 'dex', city: String(card).split('-')[0], card: card, pic: file }); } }
  ];
  var BY = {}; ATELIERS.forEach(function (d) { BY[d.a] = d; });
  function qs(o) { var p = new URLSearchParams(); for (var k in o) p.set(k, o[k]); return p.toString(); }
  function enc(f) { return encodeURIComponent(f).replace(/'/g, '%27'); }

  /* ── 그림 주소 — 공방의 lib/img.js 를 그대로 쓴다(그림 저장소를 더하면 여기도 따라간다) ── */
  function libFrom(src) {
    if (!src) return null;
    try { var win = {}; (new Function('window', String(src)))(win); var L = win.AtelierImg; return L && typeof L.imgURL === 'function' && typeof L.thumbURL === 'function' ? L : null; } catch (e) { return null; }
  }
  function fallbackLib(bases) {
    var W = {};
    function base(f) { return bases[W[f]] || bases[0]; }
    return { BASES: bases, fallback: true,
      setShards: function (doc) { var w = (doc && doc.where) || {}, k; W = {}; for (k in w) if (w[k] > 0 && w[k] < bases.length && w[k] === Math.floor(w[k])) W[k] = w[k]; },
      imgURL: function (f) { return base(f) + enc(f); }, thumbURL: function (f) { return base(f) + 'thumb/' + enc(f); } };
  }

  /* ── 이름 ── */
  var KIND_KO = { world: '세계 · 폼 그림', casual: '일상컷', own: '90번 컷', vista: '전경', other: '특별컷' };
  var KIND_ORDER = ['world', 'casual', 'own', 'vista', 'other'];
  /* 세계 — 공방마다 조금 다른 한글(삼국지 「중세 판타지」 · 원소 「판타지」)을 거르기 칸에서는 하나로 */
  var WORLD_KO = { fantasy: '판타지', steampunk: '스팀펑크', cyberpunk: '사이버펑크', mecha: '메카', samguk: '삼국시대' };
  var DESIGN_KO = { req: '필수 갈래', cos: '게임 코스프레', free: '자유 설계', own: '캐릭터만의 컷', plain: '그 밖' };
  var DESIGN_ORDER = ['req', 'cos', 'free', 'own', 'plain'];
  var NEW_DAYS = ['1', '3', '7', '30'], NEW_KO = { 1: '오늘', 3: '3일', 7: '7일', 30: '30일' };
  var SLOT_KO = { awaken: '각성', cursed: '저주', skin: '스킨' };

  function formKo(k, forms) {
    if (!k) return '';
    forms = forms || {};
    if (forms[k]) return forms[k];
    var m = /^(.+)_(overdrive|open)$/.exec(k);
    if (m) return (forms[m[1]] || m[1]) + ' ' + (m[2] === 'open' ? '개방' : (forms.overdrive || '폭주'));
    return k;
  }
  /* 일상컷 색인 한 줄 → 그림 파일 이름(공방 lib/casual-note.js rowFile 과 같다 — pkm 은 세계가 비어 있다) */
  function rowFile(r) { return String(r.card).replace(/ /g, '_') + '_' + (r.world ? r.world + '_' : '') + r.style + '_f_casual' + r.n + '.webp'; }
  function designOf(r) {
    if (r.required === 'own') return 'own';
    if (r.cosplay) return 'cos';
    if (r.free) return 'free';
    if (r.required) return 'req';
    return 'plain';
  }
  function casualOf(r, places, groups) {
    var s = r.s || {}, en = !!s.en, pl = en ? '' : (s.pl || ''), g = pl && places ? places[pl] || '' : '';
    return {
      family: r.family || '', familyKo: r.familyKo || '', item: r.item || '', itemKo: r.itemKo || '', shade: r.shade || '', shadeKo: r.shadeKo || '',
      required: r.required || '', requiredKo: r.requiredKo || '', design: designOf(r), cosplay: r.cosplay || null, free: r.free || null,
      place: pl, placeKo: pl, placeGroup: pl ? (g || 'etc') : '', placeGroupKo: pl ? (g ? (groups && groups[g]) || g : '그 밖의 장소') : '',
      act: en ? '' : (s.act || ''), actKo: en ? '' : (s.act || ''), frameKo: en ? '' : (s.fr || ''), exprKo: s.ex || '', en: en, ar: s.ar || '', raw: r
    };
  }

  /* ── 한 공방의 등록부를 줄로 ── */
  var SLOTS = ['casual', 'extra', 'action', 'awaken', 'cursed', 'skin', 'vista'];
  function Pic() {}
  Object.defineProperty(Pic.prototype, 'thumb', { get: function () { return this.ctx.lib.thumbURL(this.file); } });
  Object.defineProperty(Pic.prototype, 'full', { get: function () { return this.ctx.lib.imgURL(this.file); } });
  Object.defineProperty(Pic.prototype, 'link', { get: function () { return this.ctx.def.link(this.card, this.file); } });
  Object.defineProperty(Pic.prototype, 'atelierName', { get: function () { return this.ctx.def.name; } });
  Object.defineProperty(Pic.prototype, 'color', { get: function () { return this.ctx.def.c; } });

  function normalize(def, doc, index, meta, lib) {
    if (typeof def === 'string') def = BY[def];
    doc = doc || {}; meta = meta || {};
    var am = (meta.ateliers && meta.ateliers[def.a]) || {}, names = am.names || {}, worlds = am.worlds || {}, forms = am.forms || {}, styles = meta.styles || {};
    lib = lib || fallbackLib(def.bases);
    if (lib.setShards) lib.setShards(doc);
    var ctx = { def: def, lib: lib };
    var ix = {}, ixName = {};
    var rows = index && Array.isArray(index.rows) ? index.rows : [];
    for (var i = 0; i < rows.length; i++) { var r = rows[i]; if (r && r.card && r.style && r.n) { ix[rowFile(r)] = r; if (r.name) ixName[r.card] = r.name; } }
    var added = doc.added || {}, addedAt = doc.added_at || {}, img = doc.img || {}, out = [], seen = {};
    function put(card, file, path) {
      if (seen[file]) return; seen[file] = 1;
      var style = '', form = '', slot = '', skin = '', sex = '', j;
      for (j = 0; j < path.length; j++) {
        if (path[j] === 'byStyle') style = path[++j];
        else if (path[j] === 'byForm') form = path[++j];
        else if (!slot && SLOTS.indexOf(path[j]) >= 0) { slot = path[j]; if (slot === 'skin') { skin = path[j + 2] || ''; } }
      }
      sex = path.indexOf('m') >= 0 ? 'm' : 'f';
      var p = new Pic(), mm = /_casual(\d+)\.webp$/.exec(file), isWorld = !!(form && (worlds[form] || WORLD_KO[form]));
      p.ctx = ctx; p.atelier = def.a; p.card = card; p.cardName = names[card] || ixName[card] || card; p.file = file; p.style = style || '';
      p.styleKo = styles[style] || style || '';
      p.world = isWorld ? form : ''; p.worldKo = isWorld ? (worlds[form] || WORLD_KO[form]) : '';
      p.form = isWorld ? '' : form; p.formKo = isWorld ? '' : formKo(form, forms);
      if (slot === 'awaken' || slot === 'cursed') { p.form = slot; p.formKo = SLOT_KO[slot]; }
      if (slot === 'skin') { var st = path[path.length - 1]; p.form = 'skin'; p.skin = skin; p.formKo = SLOT_KO.skin + (st && st !== 'base' && SLOT_KO[st] ? ' · ' + SLOT_KO[st] : ''); }
      p.n = mm ? +mm[1] : 0;
      p.kind = slot === 'casual' ? (p.n === 90 ? 'own' : 'casual') : slot === 'vista' ? 'vista' : (slot === 'extra' || slot === 'action') ? 'other' : (slot === '' || slot === 'awaken' || slot === 'cursed' || slot === 'skin') ? 'world' : 'other';
      var a = added[file]; p.added = typeof a === 'string' ? a.slice(0, 10) : ''; p.t = addedAt[file] || (typeof a === 'string' ? a : '');
      var row = ix[file];
      p.casual = row ? casualOf(row, am.places, meta.groups) : null;
      p.aspect = p.kind === 'vista' ? '3:2' : (p.kind === 'casual' || p.kind === 'own') ? (p.casual && p.casual.ar) || '' : '2:3';
      p.sex = sex;
      out.push(p);
    }
    function walk(card, v, path) {
      if (typeof v === 'string') { if (/\.webp$/i.test(v)) put(card, v, path); return; }
      if (!v || typeof v !== 'object') return;
      if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) walk(card, v[i], path); return; }
      for (var k in v) if (k !== 'face') walk(card, v[k], path.concat(k));
    }
    for (var card in img) walk(card, img[card], []);
    return out;
  }

  /* ── 거르기 칸 ── 값(of)이 빈 글이면 그 칸에 없는 그림(고르면 안 맞는다). label 은 값 → 보이는 말 */
  function cz(r) { return r.casual || {}; }
  var FACETS = [
    { key: 'a', ko: '공방', of: function (r) { return r.atelier; }, label: function (v) { return BY[v] ? BY[v].name : v; }, order: function (v) { return ATELIERS.indexOf(BY[v]); } },
    { key: 'k', ko: '종류', of: function (r) { return r.kind; }, label: function (v) { return KIND_KO[v] || v; }, order: function (v) { return KIND_ORDER.indexOf(v); } },
    { key: 'w', ko: '세계', of: function (r) { return r.world; }, label: function (v) { return WORLD_KO[v] || v; } },
    { key: 'fm', ko: '폼 · 상태', of: function (r) { return r.formKo; } },
    { key: 'st', ko: '화풍', of: function (r) { return r.style; }, label: function (v, meta) { return (meta && meta.styles && meta.styles[v]) || v; } },
    { key: 'd', ko: '일상컷 설계', casual: true, of: function (r) { return cz(r).design || ''; }, label: function (v) { return DESIGN_KO[v] || v; }, order: function (v) { return DESIGN_ORDER.indexOf(v); } },
    { key: 'fam', ko: '갈래', casual: true, of: function (r) { return cz(r).family || ''; }, label: function (v, meta, ko) { return ko || v; } , ko_of: function (r) { return cz(r).familyKo; } },
    { key: 'it', ko: '의상', casual: true, many: true, of: function (r) { return cz(r).itemKo || ''; } },
    { key: 'sh', ko: '색', casual: true, many: true, of: function (r) { return cz(r).shadeKo || ''; } },
    { key: 'cg', ko: '코스프레 게임', casual: true, many: true, of: function (r) { var c = cz(r).cosplay; return c ? c.gameKo || c.game || '' : ''; } },
    { key: 'pg', ko: '장소 묶음', casual: true, of: function (r) { return cz(r).placeGroup || ''; }, label: function (v, meta, ko) { return ko || v; }, ko_of: function (r) { return cz(r).placeGroupKo; } },
    { key: 'pl', ko: '장소', casual: true, many: true, of: function (r) { return cz(r).place || ''; } },
    { key: 'ac', ko: '하는 일', casual: true, many: true, of: function (r) { return cz(r).act || ''; } },
    { key: 'fr', ko: '구도', casual: true, of: function (r) { return cz(r).frameKo || ''; } },
    { key: 'ex', ko: '표정', casual: true, many: true, of: function (r) { return cz(r).exprKo || ''; } },
    { key: 'ar', ko: '화면비', of: function (r) { return r.aspect || '?'; }, label: function (v) { return v === '?' ? '모름' : v; }, order: function (v) { return ['2:3', '1:1', '3:2', '?'].indexOf(v); } }
  ];
  var FKEY = {}; FACETS.forEach(function (f) { FKEY[f.key] = f; });
  /* 고르는 칸이 아닌 것 — q(낱말) · new(최근 N일, 하나) · fav(즐겨찾기만) · sort(new · card · shuffle) · seed(섞기 씨앗) */
  var EXTRA = ['q', 'new', 'fav', 'sort', 'seed'];
  var SORTS = ['new', 'card', 'shuffle'], SORT_KO = { 'new': '새것 먼저', card: '공방 · 카드 차례', shuffle: '무작위' };

  function blank() { var s = { q: '', 'new': '', fav: '', sort: '', seed: '' }; FACETS.forEach(function (f) { s[f.key] = []; }); return s; }
  function parse(search) {
    var p = new URLSearchParams(search || ''), s = blank();
    FACETS.forEach(function (f) { var seen = {}; p.getAll(f.key).forEach(function (v) { v = String(v).trim(); if (v && !seen[v]) { seen[v] = 1; s[f.key].push(v); } }); });
    s.q = (p.get('q') || '').trim().slice(0, 100);
    s['new'] = NEW_DAYS.indexOf(p.get('new')) >= 0 ? p.get('new') : '';
    s.fav = p.get('fav') === '1' ? '1' : '';
    s.sort = SORTS.indexOf(p.get('sort')) >= 0 && p.get('sort') !== 'new' ? p.get('sort') : '';
    s.seed = s.sort === 'shuffle' && /^\d{1,10}$/.test(p.get('seed') || '') ? p.get('seed') : '';
    return s;
  }
  function query(s) {
    var p = new URLSearchParams();
    FACETS.forEach(function (f) { (s[f.key] || []).forEach(function (v) { p.append(f.key, v); }); });
    if (s.q) p.set('q', s.q);
    if (s['new']) p.set('new', s['new']);
    if (s.fav) p.set('fav', '1');
    if (s.sort && s.sort !== 'new') p.set('sort', s.sort);
    if (s.sort === 'shuffle' && s.seed) p.set('seed', s.seed);
    var t = p.toString();
    return t ? '?' + t : '';
  }
  function active(s) { var n = 0; FACETS.forEach(function (f) { n += (s[f.key] || []).length; }); return n + (s.q ? 1 : 0) + (s['new'] ? 1 : 0) + (s.fav ? 1 : 0); }

  /* 낱말 찾기 — 카드 이름 · 열쇠 · 의상 · 장소 · 하는 일 · 코스프레 · 세계 · 폼 · 화풍 · 공방 이름(작은 글자, 띄어 쓴 낱말 모두) */
  function hay(r) {
    if (r._hay) return r._hay;
    var c = r.casual || {}, co = c.cosplay || {}, f = c.free || {};
    return (r._hay = [r.cardName, r.card, r.file, r.worldKo, r.formKo, r.styleKo, r.ctx ? r.ctx.def.name : '', KIND_KO[r.kind], c.familyKo, c.itemKo, c.shadeKo, c.requiredKo,
      c.place, c.placeGroupKo, c.act, c.frameKo, c.exprKo, co.gameKo, co.game, co.characterKo, co.character, co.cutKo, f.kindKo, (c.raw && c.raw.s && c.raw.s.en) ? [c.raw.s.pl, c.raw.s.act].join(' ') : '']
      .filter(Boolean).join('\n').toLowerCase());
  }
  function dayNum(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : NaN; }
  function todayNum(now) { var d = new Date(now == null ? Date.now() : now); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5; }

  /* 섞기 — 씨앗이 같으면 같은 차례(주소에 남겨 다시 열어도 같게) */
  function rng(seed) { var a = (+seed || 1) >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function cmpNew(x, y) { return x.t < y.t ? 1 : x.t > y.t ? -1 : cmpCard(x, y); }
  function cmpCard(x, y) {
    var a = ATELIERS.indexOf(BY[x.atelier]) - ATELIERS.indexOf(BY[y.atelier]); if (a) return a;
    if (x.cardName !== y.cardName) return x.cardName < y.cardName ? -1 : 1;
    if (x.card !== y.card) return x.card < y.card ? -1 : 1;
    a = KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind); if (a) return a;
    if (x.world !== y.world) return x.world < y.world ? -1 : 1;
    if (x.n !== y.n) return x.n - y.n;
    return x.file < y.file ? -1 : x.file > y.file ? 1 : 0;
  }
  /* 줄 세우기 — 새것 · 카드 차례는 한 번 지어 두고(rows 가 바뀌면 새로) 거른 뒤에도 그 차례 그대로 */
  var sortCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function sorted(rows, mode) {
    var c = sortCache && sortCache.get(rows);
    if (!c || c.n !== rows.length) { c = { n: rows.length }; if (sortCache) sortCache.set(rows, c); }
    if (!c[mode]) c[mode] = rows.slice().sort(mode === 'card' ? cmpCard : cmpNew);
    return c[mode];
  }

  /* 거르기 — sel(parse 의 꼴), opt = {meta, fav(r) → 담겼나, now(오늘 셈)}
     counts[칸][값] = 그 칸만 빼고 다른 칸을 다 맞춘 그림 가운데 그 값의 수(고르면 몇 장이 되나 — 칸 안은 「또는」 이라) */
  function run(rows, sel, opt) {
    opt = opt || {}; sel = sel || blank();
    var mode = sel.sort === 'card' ? 'card' : 'new', base = sorted(rows || [], mode);
    var tests = [];
    FACETS.forEach(function (f) { var v = sel[f.key]; if (v && v.length) { var set = {}; v.forEach(function (x) { set[x] = 1; }); tests.push({ key: f.key, ok: function (r) { return !!set[f.of(r)]; } }); } });
    var words = (sel.q || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length) tests.push({ key: 'q', ok: function (r) { var h = hay(r); for (var i = 0; i < words.length; i++) if (h.indexOf(words[i]) < 0) return false; return true; } });
    var today = todayNum(opt.now), nd = +sel['new'] || 0;
    if (nd) tests.push({ key: 'new', ok: function (r) { return today - dayNum(r.added) < nd; } });
    var fav = opt.fav || function () { return false; };
    if (sel.fav) tests.push({ key: 'fav', ok: function (r) { return !!fav(r); } });
    var counts = {}, list = [];
    FACETS.forEach(function (f) { counts[f.key] = {}; });
    counts['new'] = {}; counts.fav = {};
    function tally(key, r) {
      if (key === 'new') { var age = today - dayNum(r.added); if (!(age >= 0)) return; for (var i = 0; i < NEW_DAYS.length; i++) if (age < +NEW_DAYS[i]) counts['new'][NEW_DAYS[i]] = (counts['new'][NEW_DAYS[i]] || 0) + 1; return; }
      if (key === 'fav') { if (fav(r)) counts.fav['1'] = (counts.fav['1'] || 0) + 1; return; }
      if (key === 'q') return;
      var v = FKEY[key].of(r); if (!v) return; var m = counts[key]; m[v] = (m[v] || 0) + 1;
    }
    var all = FACETS.map(function (f) { return f.key; }).concat(['new', 'fav']);
    for (var i = 0; i < base.length; i++) {
      var r = base[i], miss = null, n = 0;
      for (var j = 0; j < tests.length; j++) if (!tests[j].ok(r)) { n++; miss = tests[j].key; if (n > 1) break; }
      if (n === 0) { list.push(r); for (var k = 0; k < all.length; k++) tally(all[k], r); }
      else if (n === 1) tally(miss, r);
    }
    if (sel.sort === 'shuffle') { var rand = rng(sel.seed || 1); for (var x = list.length - 1; x > 0; x--) { var y = Math.floor(rand() * (x + 1)), t = list[x]; list[x] = list[y]; list[y] = t; } }
    return { list: list, counts: counts, total: (rows || []).length };
  }
  /* 칸의 값 목록 — [{v, label, n}] 많은 것부터(차례가 정해진 칸은 그 차례). 고른 값은 0장이어도 남긴다 */
  function values(key, counts, sel, meta, rows) {
    var f = FKEY[key], m = (counts && counts[key]) || {}, picked = (sel && sel[key]) || [], out = [], seen = {}, kos = {};
    if (f && f.ko_of && rows) for (var i = 0; i < rows.length && Object.keys(kos).length < 400; i++) { var r = rows[i], v = f.of(r); if (v && !kos[v]) kos[v] = f.ko_of(r) || ''; }
    function lab(v) { return f && f.label ? f.label(v, meta, kos[v]) : v; }
    for (var v in m) { seen[v] = 1; out.push({ v: v, label: lab(v), n: m[v] }); }
    picked.forEach(function (v) { if (!seen[v]) out.push({ v: v, label: lab(v), n: 0 }); });
    if (f && f.order) out.sort(function (x, y) { var a = f.order(x.v), b = f.order(y.v); return (a < 0 ? 99 : a) - (b < 0 ? 99 : b); });
    else out.sort(function (x, y) { return y.n - x.n || (x.label < y.label ? -1 : x.label > y.label ? 1 : 0); });
    return out;
  }

  /* ── 받기 ── Loader({base, fetch, concurrency, onAtelier(a, rows), onState(states)})
     load(['samguk', …]) — 아직 안 받은 공방만 줄을 세워 받는다. 공방마다 img.json + (있으면) casual-index.json + lib/img.js 를 나란히.
     states[a] = {state: idle · loading · done · error, n, error} */
  function Loader(o) {
    o = o || {};
    var base = o.base || '', F = o.fetch || (typeof fetch === 'function' ? fetch.bind(root) : null), max = o.concurrency || 3;
    var states = {}, queue = [], running = 0, metaP = null, rowsBy = {};
    ATELIERS.forEach(function (d) { states[d.a] = { state: 'idle', n: 0 }; });
    function get(url, as) { return F(base + url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(url + ' — ' + r.status); return as === 'text' ? r.text() : r.json(); }); }
    function meta() { if (!metaP) metaP = get('/data/search-meta.json').catch(function () { return {}; }); return metaP; }
    function tell() { if (o.onState) try { o.onState(states); } catch (e) {} }
    function one(a) {
      var d = BY[a], root_ = '/' + d.repo;
      states[a] = { state: 'loading', n: 0 }; tell();
      return Promise.all([meta(), get(root_ + '/data/img.json'), d.index ? get(root_ + '/data/casual-index.json').catch(function () { return null; }) : null, get(root_ + '/lib/img.js', 'text').catch(function () { return null; })])
        .then(function (x) {
          var rows = normalize(d, x[1], x[2], x[0], libFrom(x[3]) || fallbackLib(d.bases));
          rowsBy[a] = rows; states[a] = { state: 'done', n: rows.length, index: !!(x[2] && x[2].rows) }; tell();
          if (o.onAtelier) try { o.onAtelier(a, rows); } catch (e) {}
        }, function (e) { states[a] = { state: 'error', n: 0, error: String(e && e.message || e) }; tell(); });
    }
    function pump() {
      while (running < max && queue.length) { running++; one(queue.shift()).then(function () { running--; pump(); }); }
    }
    return {
      states: states, meta: meta,
      rows: function (list) { var out = []; (list || ATELIERS.map(function (d) { return d.a; })).forEach(function (a) { if (rowsBy[a]) out = out.concat(rowsBy[a]); }); return out; },
      load: function (list) { (list && list.length ? list : ATELIERS.map(function (d) { return d.a; })).forEach(function (a) { if (BY[a] && states[a].state !== 'done' && states[a].state !== 'loading' && queue.indexOf(a) < 0) { queue.push(a); states[a] = { state: 'queued', n: 0 }; } }); tell(); pump(); },
      retry: function (a) { if (states[a] && states[a].state === 'error') { states[a] = { state: 'idle', n: 0 }; this.load([a]); } }
    };
  }

  /* 즐겨찾기 한 칸(favorites.js 꼴) — a · key · file · title · sub · thumb · full · link */
  function favEntry(r) {
    var sub = [r.worldKo || r.formKo, r.kind === 'casual' || r.kind === 'own' ? '일상컷 ' + r.n : KIND_KO[r.kind] === KIND_KO.world ? '' : KIND_KO[r.kind]].filter(Boolean).join(' · ');
    return { a: r.atelier, key: r.card, file: r.file, title: r.cardName, sub: sub, thumb: r.thumb, full: r.full, link: r.link };
  }

  var api = { ATELIERS: ATELIERS, BY: BY, KIND_KO: KIND_KO, KIND_ORDER: KIND_ORDER, WORLD_KO: WORLD_KO, DESIGN_KO: DESIGN_KO, NEW_DAYS: NEW_DAYS, NEW_KO: NEW_KO, SORTS: SORTS, SORT_KO: SORT_KO,
    FACETS: FACETS, FKEY: FKEY, EXTRA: EXTRA, libFrom: libFrom, fallbackLib: fallbackLib, rowFile: rowFile, formKo: formKo, normalize: normalize,
    blank: blank, parse: parse, query: query, active: active, run: run, values: values, hay: hay, Loader: Loader, favEntry: favEntry, dayNum: dayNum, todayNum: todayNum };
  root.AtelierGallery = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
