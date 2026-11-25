/* 일상컷 설명 — 공방 모음의 크게 보기(내 즐겨찾기 favorites.html · 전체 그림 찾기 search.html)가 같이 쓴다(2026-11-25).
   공방 크게 보기(공방마다 lib/casual-note.js — preact · 낱말 표)와 같은 꼴을 화면 틀 없이 글(HTML)로:
     첫 줄 갈래 · 옷 · 색(필수 · 코스프레 · 자유 설계 표시), 둘째 줄 장소 · 하는 일 · 구도, 「더 보기」 에 표정 · 시선 · … · 세계 · 시대 · 화면비(있는 칸만).
   우리 값은 한글(색인의 *Ko · s), GPT 가 지은 글(Outfit 줄 · 자유 설계 장면)은 영어 그대로(lang="en").
   자료는 공방의 data/casual-index.json 한 줄(rows[]) — 줄 끝 s 가 장면 풀이(공방 tools/casual-detail.cjs).

   AtelierCnote.rowFile(r) → 그 줄이 가리키는 그림 파일 이름
   AtelierCnote.html(r, open, listId) → 설명 HTML(보일 것이 없으면 빈 글). open = 더 보기 펼침, listId = 펼칠 칸의 id(aria-controls)
   펼침 기억은 부르는 쪽이 한다(공방 화면과 같은 열쇠 sessionStorage cnote-open). */
(function (root) {
  'use strict';
  var W = { req: '필수', gpt: 'GPT 고름', more: '더 보기', less: '접기', gptscene: 'GPT 설계', gptmade: 'GPT 가 설계',
    f: { ex: '표정', gz: '시선', bd: '몸 방향', cam: '카메라', ln: '렌즈', lt: '빛', tm: '시간대', ss: '계절', wt: '날씨', mo: '순간', cp: '화면 구성', si: '상황 노출', os: '옷 꾸밈', free: '자유 설계', world: '세계', era: '시대', ar: '화면비' } };
  var MORE = ['ex', 'gz', 'bd', 'cam', 'ln', 'lt', 'tm', 'ss', 'wt', 'mo', 'cp', 'si', 'os'], CUT = 90;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function join(l, s) { return l.filter(Boolean).join(s); }
  function rowFile(r) { return String(r.card).replace(/ /g, '_') + '_' + (r.world ? r.world + '_' : '') + r.style + '_f_casual' + r.n + '.webp'; }
  function html(r, open, listId) {
    if (!r) return '';
    var c = r.cosplay, f = r.free, s = r.s || {}, id = listId || 'cnote-list';
    var lead = '', rest = '', gpt = false, outfit = null;
    if (r.required === 'own') { lead = r.requiredKo || ''; rest = r.itemKo || ''; }
    else if (c) { lead = r.required ? join([W.req, r.requiredKo || r.familyKo], ' · ') : (r.familyKo || ''); rest = join([c.gameKo || c.game, c.characterKo || c.character, c.cutKo || r.itemKo], ' · '); gpt = c.by === 'gpt'; }
    else if (f) { lead = join([f.kindKo || f.kind, r.familyKo], ' · '); rest = join([r.itemKo, r.shadeKo], ' · '); outfit = f.outfit || null; }
    else { lead = r.required ? join([W.req, r.requiredKo], ' · ') : (r.familyKo || ''); rest = join([r.itemKo, r.shadeKo], ' · '); }
    var scene = join([s.pl, s.act, s.fr], ' · ');
    if (!lead && !rest && !outfit && !scene) return '';
    var more = MORE.filter(function (k) { return s[k]; }).map(function (k) { return [W.f[k], s[k]]; });
    if (f) more.push([W.f.free, join([f.kindKo || f.kind, W.gptmade], ' — ')]);
    var own = more.length;
    if (r.worldKo) more.push([W.f.world, r.worldKo]); if (s.era) more.push([W.f.era, s.era]); if (s.ar) more.push([W.f.ar, s.ar]);
    var list = own || s.era || s.ar ? more : [], cut = !!outfit && outfit.length > CUT, can = cut || list.length > 0;
    var o = outfit ? '<span lang="en">' + esc(cut && !open ? outfit.slice(0, CUT).replace(/\s+\S*$/, '') + ' …' : outfit) + '</span>' : '';
    return '<p class="cnote-l1">' + (lead ? '<b>' + esc(lead) + '</b>' : '') + (lead && (rest || o) ? ' — ' : '') + esc(rest) + (rest && o ? ' · ' : '') + o + (gpt ? '<small class="cnote-gpt">' + W.gpt + '</small>' : '') + '</p>' +
      (scene ? '<p class="cnote-l2">' + (s.en ? '<small class="cnote-tag">' + W.gptscene + '</small><span lang="en">' + esc(scene) + '</span>' : esc(scene)) + '</p>' : '') +
      (can ? '<button type="button" class="cnote-more" aria-expanded="' + !!open + '"' + (list.length ? ' aria-controls="' + esc(id) + '"' : '') + '>' + (open ? W.less : W.more) + '</button>' : '') +
      (list.length ? '<dl class="cnote-list" id="' + esc(id) + '"' + (open ? '' : ' hidden') + '>' + list.map(function (kv) { return '<div><dt>' + esc(kv[0]) + '</dt><dd>' + esc(kv[1]) + '</dd></div>'; }).join('') + '</dl>' : '');
  }
  var api = { rowFile: rowFile, html: html, esc: esc };
  root.AtelierCnote = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
