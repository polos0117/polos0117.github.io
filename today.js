/* 오늘 기록 — 공방 다섯이 한 출처(polos0117.github.io) 아래 있어 localStorage 를 같이 쓴다.
   판이 끝나면 게임이 제 방 열쇠로 한 칸 적고, 공방 지도(polos0117.github.io)가 읽어 그 방에 불을 켠다.
   모양의 약속은 polos0117.github.io/README.md 「오늘 기록」절에 있다 — 이 파일은 다섯 저장소에 같은 것을 복사해 둔다.

     atelier_today_v1:<방>   = {d:'2026-10-21', n:오늘 판 수, w:오늘 승 수, daily:오늘의 판을 끝냈나, at:마지막 판 시각, seen:마지막으로 다녀간 시각}
     atelier_record_v1:<방>  = {n:통산 판, w:통산 승, streak:지금 연승, best:최고 연승, days:판을 둔 날 수, lastDay:마지막으로 둔 날,
                                dstreak:오늘의 판 연속 일수, dbest:최고 연속, lastDaily:마지막으로 오늘의 판을 끝낸 날}
     방 열쇠: gundam · book · samguk · pokemon · myth (지도의 ROOMS 와 같다)

   오늘의 판 — 날짜 하나에 씨앗 하나(seed()). 주소에 ?daily 가 붙으면 그 씨앗으로 판을 연다(isDaily()).
   날이 바뀌면 n·w·daily 는 처음부터, seen 만 이어진다(지도의 "새 소식" 기준). 통산(record)은 bump 가 같이 쌓는다 — 게임은 bump 하나만 부르면 된다. 화면 말은 없다. */
(function (root) {
  'use strict';
  var PREFIX = 'atelier_today_v1:', RECORD = 'atelier_record_v1:';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return dateOf(new Date()); }
  function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); return dateOf(d); }
  /* 날짜(와 소금)에서 32비트 양수 하나 — FNV-1a */
  function seed(salt) {
    var s = today().replace(/-/g, '') + (salt || ''), h = 2166136261 >>> 0, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h || 1;
  }
  function get(key) { try { var v = JSON.parse(localStorage.getItem(key)); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }
  function put(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} return v; }
  function fresh(seen) { return { d: today(), n: 0, w: 0, daily: false, at: 0, seen: seen || 0 }; }
  function read(room) {
    var v = get(PREFIX + room);
    if (!v) return fresh(0);
    if (v.d === today()) { if (!('seen' in v)) v.seen = v.at || 0; return v; }
    return fresh(v.seen || v.at || 0);
  }
  /* 통산 — 없으면 0 에서 */
  function record(room) {
    var r = get(RECORD + room) || {};
    return { n: r.n | 0, w: r.w | 0, streak: r.streak | 0, best: r.best | 0, days: r.days | 0, lastDay: r.lastDay || '',
      dstreak: r.dstreak | 0, dbest: r.dbest | 0, lastDaily: r.lastDaily || '' };
  }
  /* 판이 끝났다 — 오늘 칸에 n 을 더하고, 이겼으면 w, 오늘의 판이었으면 daily. 통산도 같이: 연승·판을 둔 날·오늘의 판 연속 일수 */
  function bump(room, o) {
    o = o || {};
    var v = read(room); v.n += 1; if (o.won) v.w += 1; if (o.daily) v.daily = true; v.at = v.seen = Date.now();
    put(PREFIX + room, v);
    var r = record(room), t = today();
    r.n += 1; if (o.won) { r.w += 1; r.streak += 1; if (r.streak > r.best) r.best = r.streak; } else r.streak = 0;
    if (r.lastDay !== t) { r.days += 1; r.lastDay = t; }
    if (o.daily && r.lastDaily !== t) { r.dstreak = r.lastDaily === yesterday() ? r.dstreak + 1 : 1; if (r.dstreak > r.dbest) r.dbest = r.dstreak; r.lastDaily = t; }
    put(RECORD + room, r);
    return v;
  }
  /* 다녀갔다 — 판은 안 더하고 시각만 */
  function visit(room) { var v = read(room); v.seen = Date.now(); return put(PREFIX + room, v); }
  function isDaily() { return /[?&]daily(=[^&]*)?(&|$)/.test(typeof location !== 'undefined' ? location.search : ''); }
  /* 오늘의 판 연속이 아직 살아 있나 — 어제나 오늘 끝냈으면 산 것(지도가 "연속 n일" 을 보일 때 쓴다) */
  function dailyAlive(room) { var r = record(room); return r.lastDaily === today() || r.lastDaily === yesterday(); }
  var api = { KEY: PREFIX, RECORD: RECORD, today: today, seed: seed, read: read, record: record, bump: bump, visit: visit, isDaily: isDaily, dailyAlive: dailyAlive };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AtelierToday = api;
})(typeof window !== 'undefined' ? window : this);
