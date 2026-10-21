/* 오늘 기록 — 공방 다섯이 한 출처(polos0117.github.io) 아래 있어 localStorage 를 같이 쓴다.
   판이 끝나면 게임이 제 방 열쇠로 한 칸 적고, 공방 지도(polos0117.github.io)가 읽어 그 방에 불을 켠다.
   모양의 약속은 polos0117.github.io/README.md 「오늘 기록」절에 있다 — 이 파일은 다섯 저장소에 같은 것을 복사해 둔다.

     atelier_today_v1:<방>  = {d:'2026-10-21', n:오늘 판 수, w:오늘 승 수, daily:오늘의 판을 끝냈나, at:마지막 판 시각, seen:마지막으로 다녀간 시각}
     방 열쇠: gundam · book · samguk · pokemon · myth (지도의 ROOMS 와 같다)

   오늘의 판 — 날짜 하나에 씨앗 하나(seed()). 주소에 ?daily 가 붙으면 그 씨앗으로 판을 연다(isDaily()).
   날이 바뀌면 n·w·daily 는 처음부터, seen 만 이어진다(지도의 "새 소식" 기준). 화면 말은 없다. */
(function (root) {
  'use strict';
  var PREFIX = 'atelier_today_v1:';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  /* 날짜(와 소금)에서 32비트 양수 하나 — FNV-1a */
  function seed(salt) {
    var s = today().replace(/-/g, '') + (salt || ''), h = 2166136261 >>> 0, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h || 1;
  }
  function fresh(seen) { return { d: today(), n: 0, w: 0, daily: false, at: 0, seen: seen || 0 }; }
  function read(room) {
    var v = null;
    try { v = JSON.parse(localStorage.getItem(PREFIX + room)); } catch (e) { v = null; }
    if (!v || typeof v !== 'object') return fresh(0);
    if (v.d === today()) { if (!('seen' in v)) v.seen = v.at || 0; return v; }
    return fresh(v.seen || v.at || 0);
  }
  function write(room, v) { try { localStorage.setItem(PREFIX + room, JSON.stringify(v)); } catch (e) {} return v; }
  /* 판이 끝났다 — n 을 더하고, 이겼으면 w, 오늘의 판이었으면 daily */
  function bump(room, o) {
    o = o || {};
    var v = read(room); v.n += 1; if (o.won) v.w += 1; if (o.daily) v.daily = true; v.at = v.seen = Date.now();
    return write(room, v);
  }
  /* 다녀갔다 — 판은 안 더하고 시각만 */
  function visit(room) { var v = read(room); v.seen = Date.now(); return write(room, v); }
  function isDaily() { return /[?&]daily(=[^&]*)?(&|$)/.test(typeof location !== 'undefined' ? location.search : ''); }
  var api = { KEY: PREFIX, today: today, seed: seed, read: read, bump: bump, visit: visit, isDaily: isDaily };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AtelierToday = api;
})(typeof window !== 'undefined' ? window : this);
