/* 즐겨찾기 v1 (2026-10-21) — 공방 넷(건담·포켓몬·신화·책)과 공방 모음이 한 출처(polos0117.github.io) 아래 있어 localStorage 를 같이 쓴다.
   각 공방의 도감 상세가 지금 보이는 그림 한 장을 담고, 공방 모음의 favorites.html 이 모아 보여 준다.
   원본은 polos0117.github.io/favorites.js — 네 저장소의 lib/favorites.js 에 글자 하나 다르지 않게 복사해 둔다(고치면 다섯 곳을 같이).
   약속은 polos0117.github.io/README.md 「즐겨찾기」절에 있다. 화면 말은 없다 — 말은 각 공방의 낱말 표(또는 화면)가 맡는다.

     atelier_favorites_v1 = [칸, …]   새것이 앞, 500칸까지(넘치면 오래된 것부터 빠진다)
     칸 = {a: 공방(book·pkm·myth·gundam), key: 카드 열쇠, file: 그림 파일 이름, title: 보이는 이름, sub: 짧은 이름표(폼·컷),
           thumb: 썸네일 절대 주소, full: 원본 절대 주소, link: 그 공방 도감에서 이 그림을 여는 절대 경로, at: 담은 때(ISO)}
     같은 그림 = 같은 (a, file). 한 카드의 다른 그림은 따로 담긴다.

   API(window.AtelierFavorites)
     has(a, file) → 참/거짓 · list() → 칸 목록(복사본) · count(a?) → 수
     toggle(칸) → 담겼으면 참, 빠졌거나 못 담았으면 거짓 · remove(a, file) → 뺐으면 참
     onChange(cb) → 그만두는 함수. 다른 탭(storage 사건)과 같은 탭(atelier-favorites 사건) 모두에서 cb(list()) 를 부른다
     available() → 이 브라우저가 저장을 허락하나(사생활 창·막힌 저장소면 거짓 — 화면은 "저장되지 않음" 을 보인다)
   저장이 막혀도 던지지 않는다 — 읽으면 빈 목록, 쓰면 아무 일도 없다. */
(function (root) {
  'use strict';
  var KEY = 'atelier_favorites_v1', MAX = 500, EVENT = 'atelier-favorites';
  var FIELDS = ['a', 'key', 'file', 'title', 'sub', 'thumb', 'full', 'link', 'at'];
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
  function write(list) {
    var s = store();
    if (!s) return false;
    try { s.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch (e) { return false; }
    try { root.dispatchEvent(new CustomEvent(EVENT)); } catch (e) {}
    return true;
  }
  function at(list, a, file) { for (var i = 0; i < list.length; i++) if (list[i].a === a && list[i].file === file) return i; return -1; }
  function has(a, file) { return at(read(), a, file) >= 0; }
  function list() { return read(); }
  function count(a) { var l = read(), n = 0, i; if (!a) return l.length; for (i = 0; i < l.length; i++) if (l[i].a === a) n++; return n; }
  function remove(a, file) {
    var l = read(), i = at(l, a, file);
    if (i < 0) return false;
    l.splice(i, 1);
    return write(l);
  }
  function toggle(entry) {
    if (!valid(entry)) return false;
    var l = read(), i = at(l, entry.a, entry.file);
    if (i >= 0) { l.splice(i, 1); write(l); return at(read(), entry.a, entry.file) >= 0; }
    var e = clean(entry); e.at = new Date().toISOString();
    l.unshift(e);
    if (!write(l)) return false;
    return at(read(), entry.a, entry.file) >= 0;
  }
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
  var api = { KEY: KEY, MAX: MAX, EVENT: EVENT, has: has, list: list, count: count, toggle: toggle, remove: remove, onChange: onChange, available: available };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AtelierFavorites = api;
})(typeof window !== 'undefined' ? window : this);
