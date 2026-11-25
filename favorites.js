/* 즐겨찾기 v1 (2026-10-21) — 공방들과 공방 모음이 한 출처(polos0117.github.io) 아래 있어 localStorage 를 같이 쓴다.
   각 공방의 도감 상세가 지금 보이는 그림 한 장을 담고, 공방 모음의 favorites.html 이 모아 보여 준다.
   원본은 style-atelier shared/lib/favorites.js(2026-11-25부터) — node shared/sync.cjs 가 공방 모음의 favorites.js 와 공방마다 lib/favorites.js 에 바이트 그대로 쓴다.
   공방 쪽 사본은 손으로 고치지 않는다(덮인다). 약속은 polos0117.github.io/README.md 「즐겨찾기」절.

     atelier_favorites_v1 = [칸, …]   새것이 앞, MAX(3000)칸까지 — 가득 차면 더 담지 않는다(오래된 것을 몰래 빼지 않는다).
       2026-11-25 사용자 「즐겨찾기 모음은 최대 한도가 500장인건가?」 — 전엔 500칸이었고 넘치면 오래된 것부터 소리 없이 빠졌다.
       칸 하나가 JSON 으로 약 500자(주소의 한글이 %XX 로 늘어서 — 실제 그림 2만여 장으로 잼, 95% 가 570자 아래) → 3000칸 ≈ 1.5M 자.
       localStorage 는 출처마다 약 5M 자(Chrome · Firefox · Safari)이고 같은 출처의 다른 열쇠(본 것 목록 · 판 기록 · 도트 · 검수 …)를 넉넉히 남긴다.
     칸 = {a: 공방(gundam·book·pkm·myth·game·element·samguk·city), key: 카드 열쇠, file: 그림 파일 이름, title: 보이는 이름, sub: 짧은 이름표(폼·컷),
           thumb: 썸네일 절대 주소, full: 원본 절대 주소, link: 그 공방 도감에서 이 그림을 여는 절대 경로, at: 담은 때(ISO)}
     같은 그림 = 같은 (a, file). 한 카드의 다른 그림은 따로 담긴다.

   API(window.AtelierFavorites)
     has(a, file) → 참/거짓 · list() → 칸 목록(복사본) · count(a?) → 수 · MAX · room() → 더 담을 수 있는 수
     toggle(칸) → 담겼으면 참, 빠졌거나 못 담았으면 거짓 · remove(a, file) → 뺐으면 참
     error() → 마지막 toggle · remove 가 못 한 까닭: '' · 'full'(MAX 칸이 다 찼다) · 'quota'(브라우저 저장 공간이 모자라다) · 'blocked'(저장이 막혔다)
     message(까닭?) → 'full' · 'quota' 일 때 알릴 말(한글), 아니면 '' — 'blocked' 말은 공방마다의 낱말 표(dex.fav.blocked)가 맡는다.
       화면은 sayFav(on ? 담았다 : 담겨 있었으면 뺐다 : (FAV.message() || 막혔다)) 꼴로 쓴다. 못 담아도 담아 둔 칸은 그대로다(저장은 통째로 바꾸거나 안 바꾼다).
     onChange(cb) → 그만두는 함수. 다른 탭(storage 사건)과 같은 탭(atelier-favorites 사건) 모두에서 cb(list()) 를 부른다
     available() → 이 브라우저가 저장을 허락하나(사생활 창·막힌 저장소면 거짓 — 화면은 "저장되지 않음" 을 보인다)
   저장이 막혀도 던지지 않는다 — 읽으면 빈 목록, 쓰면 아무 일도 없다. */
(function (root) {
  'use strict';
  var KEY = 'atelier_favorites_v1', MAX = 3000, EVENT = 'atelier-favorites';
  var FIELDS = ['a', 'key', 'file', 'title', 'sub', 'thumb', 'full', 'link', 'at'];
  var MESSAGES = {
    full: '즐겨찾기가 가득 찼어요(' + MAX + '장) — 공방 모음의 내 즐겨찾기에서 몇 장 빼면 다시 담을 수 있어요',
    quota: '이 브라우저의 저장 공간이 모자라 저장하지 못했어요 — 담아 둔 그림은 그대로예요'
  };
  var last = '';
  function store() { try { return root.localStorage || null; } catch (e) { return null; } }
  function valid(e) { return !!e && typeof e === 'object' && typeof e.a === 'string' && !!e.a && typeof e.file === 'string' && !!e.file; }
  function clean(e) {
    var out = {}, i, k;
    for (i = 0; i < FIELDS.length; i++) { k = FIELDS[i]; out[k] = e[k] == null ? '' : String(e[k]).slice(0, 2000); }
    if (!out.at) out.at = new Date().toISOString();
    return out;
  }
  function read() {
    var s = store(), v;
    if (!s) return [];
    try { v = JSON.parse(s.getItem(KEY) || '[]'); } catch (e) { return []; }
    if (!Array.isArray(v)) return [];
    var out = [], i;
    for (i = 0; i < v.length; i++) if (valid(v[i])) out.push(clean(v[i]));
    return out;
  }
  /* 저장 공간이 모자라다 — 브라우저마다 이름 · 번호가 다르다 */
  function quota(e) { return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014); }
  function write(list) {
    var s = store();
    if (!s) { last = 'blocked'; return false; }
    try { s.setItem(KEY, JSON.stringify(list)); } catch (e) { last = quota(e) ? 'quota' : 'blocked'; return false; }
    try { root.dispatchEvent(new CustomEvent(EVENT)); } catch (e) {}
    return true;
  }
  function at(list, a, file) { for (var i = 0; i < list.length; i++) if (list[i].a === a && list[i].file === file) return i; return -1; }
  function has(a, file) { return at(read(), a, file) >= 0; }
  function list() { return read(); }
  function count(a) { var l = read(), n = 0, i; if (!a) return l.length; for (i = 0; i < l.length; i++) if (l[i].a === a) n++; return n; }
  function room() { return Math.max(0, MAX - read().length); }
  function remove(a, file) {
    last = '';
    var l = read(), i = at(l, a, file);
    if (i < 0) return false;
    l.splice(i, 1);
    return write(l);
  }
  function toggle(entry) {
    last = '';
    if (!valid(entry)) return false;
    var l = read(), i = at(l, entry.a, entry.file);
    if (i >= 0) { l.splice(i, 1); write(l); return at(read(), entry.a, entry.file) >= 0; }
    if (!store()) { last = 'blocked'; return false; }
    if (l.length >= MAX) { last = 'full'; return false; }   /* 가득 — 오래된 것을 빼지 않고 담기를 거절한다 */
    var e = clean(entry); e.at = new Date().toISOString();
    l.unshift(e);
    if (!write(l)) return false;
    return at(read(), entry.a, entry.file) >= 0;
  }
  function error() { return last; }
  function message(why) { return MESSAGES[why === undefined ? last : why] || ''; }
  function available() {
    var s = store(), t = KEY + ':probe';
    if (!s) return false;
    try { s.setItem(t, '1'); s.removeItem(t); return true; } catch (e) { return false; }
  }
  function onChange(cb) {
    function fire() { try { cb(read()); } catch (e) {} }
    function onStorage(ev) { if (!ev || ev.key === KEY || ev.key === null) fire(); }
    root.addEventListener('storage', onStorage);
    root.addEventListener(EVENT, fire);
    return function () { root.removeEventListener('storage', onStorage); root.removeEventListener(EVENT, fire); };
  }
  var api = { KEY: KEY, MAX: MAX, EVENT: EVENT, has: has, list: list, count: count, room: room, toggle: toggle, remove: remove, error: error, message: message, onChange: onChange, available: available };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AtelierFavorites = api;
})(typeof window !== 'undefined' ? window : this);
