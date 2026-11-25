/* 전체 그림 찾기(search.html) 화면 — 자료는 gallery-data.js(AtelierGallery), 크게 보기 몸통은 fill-core.js · cnote.js · favorites.js. 2026-11-25.
   차례: 주소 → 거르기(sel) → 고른 공방만 받기(Loader, 셋씩) → 공방이 올 때마다 run(줄 · 칸마다 수) → 거르기 칸 · 고른 것 · 수 · 격자(보이는 줄만).
   거르기를 바꾸면 주소에 남기고(pushState — 뒤로 가기가 앞 거르기로), 찾기 낱말은 replaceState. 크게 보기는 기록 한 칸(뒤로 가기가 닫는다). */
import { attach } from './fill-core.js?v=1';

const G = window.AtelierGallery, F = window.AtelierFavorites, CN = window.AtelierCnote;
const $ = s => document.querySelector(s);
const esc = CN.esc, fmt = n => Number(n || 0).toLocaleString('ko-KR');
const okStore = !!F && F.available();
const grid = $('#grid'), panel = $('#panel'), viewer = $('#viewer');

/* ── 상태 ── */
let sel = G.parse(location.search), meta = {}, rows = [], res = { list: [], counts: {}, total: 0 }, favSet = new Set(), rowsN = -1;
function readFav() { favSet = new Set((okStore ? F.list() : []).map(e => e.a + '\n' + e.file)); }
const isFav = r => favSet.has(r.atelier + '\n' + r.file);
readFav();
const wanted = () => (sel.a.length ? sel.a : G.ATELIERS.map(d => d.a));

const loader = G.Loader({ onState: () => later(), onAtelier: () => later() });
loader.meta().then(m => { meta = m || {}; later(); });
loader.load(wanted());

let tick = 0;
function later() { if (!tick) tick = requestAnimationFrame(() => { tick = 0; update(false); }); }
function update(scrollTop) {
  const all = loader.rows();
  if (all.length !== rowsN) { rows = all; rowsN = all.length; }
  res = G.run(rows, sel, { fav: isFav, meta });
  paintLoad(); paintFacets(); paintActive(); paintCount();
  layout(); paintGrid(true);
  if (scrollTop) { const top = grid.getBoundingClientRect().top + scrollY - $('.bar').offsetHeight - 70; if (scrollY > top) scrollTo(0, Math.max(0, top)); }
}

/* 거르기를 바꾼다 — 주소에 남기고 다시 그린다 */
function commit(push) {
  const url = location.pathname + G.query(sel);
  try { history[push ? 'pushState' : 'replaceState']({ search: 1 }, '', url); } catch (e) {}
  loader.load(wanted());
  update(true);
}

/* ── 받는 중 ── */
function paintLoad() {
  const st = loader.states, want = wanted(), done = want.filter(a => st[a].state === 'done').length, err = want.filter(a => st[a].state === 'error');
  const n = loader.rows(want).length, box = $('#load');
  if (done === want.length && !err.length) { box.innerHTML = ''; return; }
  box.innerHTML = (done + err.length < want.length ? `<span class="meter" aria-hidden="true"><i style="width:${Math.round(done / want.length * 100)}%"></i></span><span>공방 ${done}/${want.length} 받음 · 그림 ${fmt(n)}장</span>` : '')
    + err.map(a => `<span class="err">${esc(G.BY[a].name)}을(를) 못 받았어요<button type="button" data-retry="${a}">다시</button></span>`).join('');
}
$('#load').addEventListener('click', ev => { const b = ev.target.closest('[data-retry]'); if (b) { loader.retry(b.dataset.retry); later(); } });

/* ── 거르기 칸 ── 그림(공방 · 종류 · 세계 · 폼 · 화풍 · 화면비 · 새 그림 · 즐겨찾기) / 일상컷(설계 · 갈래 · 의상 · 색 · 코스프레 게임 · 장소 묶음 · 장소 · 하는 일 · 구도 · 표정) */
const GROUPS = [
  ['그림', '', ['a', 'k', 'w', 'fm', 'st', 'ar', 'new', 'fav']],
  ['일상컷', '일상컷 색인이 있는 공방(삼국지 · 원소 · 포켓몬 · 도시)의 일상컷만 걸린다', ['d', 'fam', 'it', 'sh', 'cg', 'pg', 'pl', 'ac', 'fr', 'ex']],
];
const KO = Object.assign({ 'new': '새 그림', fav: '즐겨찾기' }, Object.fromEntries(G.FACETS.map(f => [f.key, f.ko])));
const OPEN = new Set(['a', 'k', 'w', 'ar', 'fam', 'pg', 'fr', 'new']);
const MANY = new Set(G.FACETS.filter(f => f.many).map(f => f.key)), LIMIT = 24, LIMIT_ALL = 300;
const more = new Set(), find = {};
$('#facets').innerHTML = GROUPS.map(([g, note, keys]) => `<p class="group">${g}${note ? `<small>${note}</small>` : ''}</p>` + keys.map(k =>
  `<details class="facet" data-f="${k}"${OPEN.has(k) ? ' open' : ''}><summary>${KO[k]} <b class="fsel"></b></summary><div class="fbody">`
  + (MANY.has(k) ? `<input type="search" class="fsearch" data-f="${k}" placeholder="${KO[k]} 찾기" aria-label="${KO[k]} 찾기" autocomplete="off">` : '')
  + `<div class="fchips" role="group" aria-label="${KO[k]}"></div></div></details>`).join('')).join('');
function chip(k, v, label, n, on, o = {}) {
  return `<button type="button" class="fc${o.dot ? ' dot' : ''}${!n && !o.wait ? ' zero' : ''}${o.wait ? ' wait' : ''}" data-f="${k}" data-v="${esc(v)}" aria-pressed="${on}"${o.c ? ` style="--c:${o.c}"` : ''}><span>${esc(label)}</span><b>${o.wait || fmt(n)}</b></button>`;
}
function paintFacets() {
  const c = res.counts, focus = document.activeElement && document.activeElement.closest && document.activeElement.closest('.fc');
  const fk = focus && [focus.dataset.f, focus.dataset.v];
  for (const det of document.querySelectorAll('#facets .facet')) {
    const k = det.dataset.f, box = det.querySelector('.fchips');
    let html = '', has = true;
    if (k === 'a') {
      html = G.ATELIERS.map(d => { const st = loader.states[d.a].state, on = sel.a.includes(d.a);
        const wait = st === 'done' ? '' : st === 'error' ? '못 받음' : st === 'idle' ? '—' : '받는 중';
        return chip('a', d.a, d.name, (c.a || {})[d.a] || 0, on, { dot: true, c: d.c, wait }); }).join('');
    } else if (k === 'new') {
      html = G.NEW_DAYS.map(d => chip('new', d, G.NEW_KO[d], (c.new || {})[d] || 0, sel.new === d)).join('');
    } else if (k === 'fav') {
      html = okStore ? chip('fav', '1', '♥ 담은 그림만', (c.fav || {})['1'] || 0, !!sel.fav) : '<p class="group"><small>이 브라우저는 저장을 막아 두어 즐겨찾기를 못 읽어요</small></p>';
    } else {
      let vals = G.values(k, c, sel, meta, rows);
      has = vals.length > 0;
      const q = (find[k] || '').trim().toLowerCase();
      if (q) vals = vals.filter(x => x.label.toLowerCase().includes(q) || sel[k].includes(x.v));
      const cap = MANY.has(k) ? (more.has(k) ? LIMIT_ALL : LIMIT) : 999;
      const picked = vals.filter(x => sel[k].includes(x.v)), rest = vals.filter(x => !sel[k].includes(x.v));
      const show = picked.concat(rest.slice(0, Math.max(0, cap - picked.length)));
      html = show.map(x => chip(k, x.v, x.label, x.n, sel[k].includes(x.v))).join('')
        + (rest.length + picked.length > show.length ? `<button type="button" class="fmore" data-more="${k}">모두 보기 (${fmt(vals.length)})</button>` : more.has(k) && vals.length > LIMIT ? `<button type="button" class="fmore" data-more="${k}">줄이기</button>` : '')
        + (!show.length && q ? '<small class="group">맞는 값이 없어요</small>' : '');
    }
    box.innerHTML = html;
    det.hidden = !has && !(sel[k] || []).length;
    const n = k === 'new' ? (sel.new ? 1 : 0) : k === 'fav' ? (sel.fav ? 1 : 0) : (sel[k] || []).length;
    det.querySelector('.fsel').textContent = n ? String(n) : '';
  }
  if (fk) { const b = document.querySelector(`#facets .fc[data-f="${fk[0]}"][data-v="${CSS.escape(fk[1])}"]`); if (b) b.focus({ preventScroll: true }); }
  $('#nact').textContent = G.active(sel) ? String(G.active(sel)) : '';
  $('#p-done').textContent = fmt(res.list.length) + '장 보기';
  $('#p-clear').disabled = !G.active(sel);
}
$('#facets').addEventListener('click', ev => {
  const m = ev.target.closest('.fmore'); if (m) { const k = m.dataset.more; if (more.has(k)) more.delete(k); else more.add(k); paintFacets(); return; }
  const b = ev.target.closest('.fc'); if (!b) return;
  const k = b.dataset.f, v = b.dataset.v;
  if (k === 'new') sel.new = sel.new === v ? '' : v;
  else if (k === 'fav') sel.fav = sel.fav ? '' : '1';
  else { const l = sel[k], i = l.indexOf(v); if (i >= 0) l.splice(i, 1); else l.push(v); }
  commit(true);
});
$('#facets').addEventListener('input', ev => { const t = ev.target; if (!t.classList.contains('fsearch')) return; find[t.dataset.f] = t.value; paintFacets(); });

/* ── 고른 것 — 누르면 빠진다 ── */
function labelOf(f, v) {
  let ko = '';
  if (f.ko_of) { const r = rows.find(x => f.of(x) === v); ko = r ? f.ko_of(r) : ''; }
  return f.label ? f.label(v, meta, ko) : v;
}
function picks() {
  const out = [];
  for (const f of G.FACETS) for (const v of sel[f.key]) out.push({ k: f.key, v, label: labelOf(f, v) });
  if (sel.new) out.push({ k: 'new', v: sel.new, label: '최근 ' + G.NEW_KO[sel.new] });
  if (sel.fav) out.push({ k: 'fav', v: '1', label: '♥ 담은 그림만' });
  if (sel.q) out.push({ k: 'q', v: sel.q, label: '「' + sel.q + '」' });
  return out;
}
function paintActive() {
  const p = picks();
  $('#active').innerHTML = p.map(x => `<button type="button" class="ac" data-f="${x.k}" data-v="${esc(x.v)}" aria-label="${esc(KO[x.k] || '찾기')} ${esc(x.label)} 빼기"><small>${esc(KO[x.k] || '찾기')}</small><span>${esc(x.label)}</span><i aria-hidden="true">✕</i></button>`).join('')
    + (p.length > 1 ? '<button type="button" class="ac" data-clear="1"><span>모두 지우기</span></button>' : '');
}
function clearAll() { const s = G.blank(); s.sort = sel.sort; s.seed = sel.seed; sel = s; $('#q').value = ''; commit(true); }
$('#active').addEventListener('click', ev => {
  const b = ev.target.closest('.ac'); if (!b) return;
  if (b.dataset.clear) return clearAll();
  const k = b.dataset.f, v = b.dataset.v;
  if (k === 'new') sel.new = ''; else if (k === 'fav') sel.fav = ''; else if (k === 'q') { sel.q = ''; $('#q').value = ''; } else sel[k] = sel[k].filter(x => x !== v);
  commit(true);
});
$('#p-clear').addEventListener('click', clearAll);

function paintCount() {
  const want = wanted(), loading = want.some(a => loader.states[a].state !== 'done' && loader.states[a].state !== 'error');
  const n = res.list.length;
  $('#count').innerHTML = rows.length || !loading ? `<b>${fmt(n)}</b>장${loading ? ' — 더 받는 중' : ''}${G.active(sel) ? ` · 받은 그림 ${fmt(rows.length)}장 가운데` : ''}` : '그림 목록을 받는 중…';
  $('#note').innerHTML = !n && !loading ? `<section class="empty" id="empty"><h2>맞는 그림이 없어요</h2><p>고른 것을 하나씩 빼 보세요 — 거르기 칸의 숫자가 「고르면 몇 장」이에요.</p>${G.active(sel) ? '<button type="button" class="p-btn main" id="empty-clear">모두 지우기</button>' : ''}</section>` : '';
}
$('#note').addEventListener('click', ev => { if (ev.target.closest('#empty-clear')) clearAll(); });

/* ── 찾기 낱말 · 차례 ── */
$('#q').value = sel.q;
let qT = 0;
$('#q').addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(() => { sel.q = $('#q').value.trim().slice(0, 100); commit(false); }, 220); });
$('#q').addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); clearTimeout(qT); sel.q = $('#q').value.trim().slice(0, 100); commit(false); $('#q').blur(); } });
$('#sort').innerHTML = G.SORTS.map(s => `<option value="${s}">${G.SORT_KO[s]}</option>`).join('');
function paintSort() { $('#sort').value = sel.sort || 'new'; $('#reshuffle').hidden = sel.sort !== 'shuffle'; }
const seed = () => String(1 + Math.floor(Math.random() * 2147483646));
$('#sort').addEventListener('change', () => { const v = $('#sort').value; sel.sort = v === 'new' ? '' : v; sel.seed = v === 'shuffle' ? seed() : ''; paintSort(); commit(true); });
$('#reshuffle').addEventListener('click', () => { sel.seed = seed(); commit(true); });
paintSort();

/* ── 휴대폰 — 거르기 시트 ── */
const phone = matchMedia('(max-width: 999.98px)');
let panelBack = null;
function openPanel() { panelBack = document.activeElement; panel.classList.add('open'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); document.body.classList.add('sheet'); $('#p-close').focus(); }
function closePanel() { if (!panel.classList.contains('open')) return; panel.classList.remove('open'); panel.removeAttribute('role'); panel.removeAttribute('aria-modal'); document.body.classList.remove('sheet'); if (panelBack && panelBack.focus) panelBack.focus(); }
$('#open-panel').addEventListener('click', openPanel);
$('#p-close').addEventListener('click', closePanel);
$('#p-done').addEventListener('click', closePanel);
(phone.addEventListener ? phone.addEventListener.bind(phone, 'change') : phone.addListener.bind(phone))(() => { if (!phone.matches) closePanel(); });

/* ── 격자 — 보이는 줄(± 두 줄)만 그린다. 칸 자리는 계산(줄 높이 = 칸 너비 × 1.5 + 이름 두 줄 + 틈) ── */
let L = { cols: 3, cw: 100, rowH: 200, gap: 8 };
const live = new Map();
function layout() {
  const W = grid.clientWidth || 300, small = W < 600, gap = small ? 8 : 14, min = small ? 104 : 160;
  const cols = Math.max(2, Math.floor((W + gap) / (min + gap))), cw = (W - gap * (cols - 1)) / cols, rowH = cw * 1.5 + 40 + gap + (small ? 4 : 8);
  L = { cols, cw, rowH, gap };
  const n = res.list.length;
  grid.style.height = (n ? Math.ceil(n / cols) * rowH - gap : 0) + 'px';
}
const kindShort = r => r.kind === 'casual' ? '일상컷 ' + r.n : r.kind === 'own' ? '90번 컷' : r.kind === 'vista' ? '전경' : r.kind === 'other' ? '특별컷' : r.worldKo ? '세계 그림' : r.formKo ? '' : '기본 그림';
const subOf = r => [r.worldKo || r.formKo, kindShort(r)].filter(Boolean).join(' · ');
function tileHTML(r, i) {
  const sub = subOf(r), ar = r.aspect && r.aspect !== '2:3' && r.aspect !== '?' ? r.aspect : '';
  return `<button type="button" class="tile" data-i="${i}" data-ar="${esc(r.aspect || '?')}" style="--c:${r.color}" aria-label="${esc(r.cardName)}${sub ? ' · ' + esc(sub) : ''} · ${esc(r.atelierName)} — 크게 보기">`
    + `<span class="face"><img src="${esc(r.thumb)}" data-full="${esc(r.full)}" alt="" loading="lazy" decoding="async" width="341" height="512">${isFav(r) ? '<span class="heart" aria-hidden="true">♥</span>' : ''}${ar ? `<span class="badge">${ar}</span>` : ''}</span>`
    + `<span class="cap"><b>${esc(r.cardName)}</b><i><span>${esc([sub, r.atelierName].filter(Boolean).join(' · '))}</span></i></span></button>`;
}
function paintGrid(reset) {
  if (reset) { for (const li of live.values()) li.remove(); live.clear(); }
  const n = res.list.length; if (!n) return;
  const top = -grid.getBoundingClientRect().top, buf = L.rowH * 2, rowsN_ = Math.ceil(n / L.cols);
  const r0 = Math.max(0, Math.floor((top - buf) / L.rowH)), r1 = Math.min(rowsN_, Math.ceil((top + innerHeight + buf) / L.rowH));
  const a = r0 * L.cols, b = Math.min(n, r1 * L.cols);
  for (const [i, li] of live) if (i < a || i >= b) { li.remove(); live.delete(i); }
  const frag = document.createDocumentFragment();
  for (let i = a; i < b; i++) {
    if (live.has(i)) continue;
    const li = document.createElement('li'), row = Math.floor(i / L.cols), col = i % L.cols;
    li.style.width = L.cw + 'px'; li.style.transform = `translate(${Math.round(col * (L.cw + L.gap))}px, ${Math.round(row * L.rowH)}px)`;
    li.setAttribute('aria-posinset', i + 1); li.setAttribute('aria-setsize', n);
    li.innerHTML = tileHTML(res.list[i], i);
    live.set(i, li); frag.appendChild(li);
  }
  grid.appendChild(frag);
}
let sT = 0;
addEventListener('scroll', () => { if (!sT) sT = requestAnimationFrame(() => { sT = 0; paintGrid(false); }); }, { passive: true });
let rW = innerWidth;
addEventListener('resize', () => { if (innerWidth === rW && live.size) { paintGrid(false); return; } rW = innerWidth; layout(); paintGrid(true); });
/* 썸네일이 없으면 원본, 그것도 없으면 이름만 */
grid.addEventListener('error', ev => { const img = ev.target; if (!(img instanceof HTMLImageElement)) return;
  if (img.dataset.full && img.src !== img.dataset.full && !img.dataset.tried) { img.dataset.tried = '1'; img.src = img.dataset.full; return; }
  img.replaceWith(Object.assign(document.createElement('span'), { className: 'ph', textContent: '그림을 불러오지 못했어요' })); }, true);
grid.addEventListener('click', ev => { const b = ev.target.closest('.tile'); if (b) openViewer(+b.dataset.i, b); });

/* ── 크게 보기 ── */
let at = -1, back = null, layer = 0, pushed = false, closing = false;
const imgs = [$('#v-a'), $('#v-b')];
function show(i) {
  const L_ = res.list; if (!L_.length) return closeViewer();
  at = (i + L_.length) % L_.length;
  fill.reset();
  const r = L_[at], next = imgs[1 - layer], cur = imgs[layer];
  next.onerror = () => { if (next.src !== r.thumb) next.src = r.thumb; };
  next.src = r.full; next.alt = r.cardName + ' · ' + subOf(r);
  next.dataset.file = r.file;
  next.classList.add('on'); cur.classList.remove('on'); cur.alt = '';
  layer = 1 - layer;
  $('#v-room').style.setProperty('--c', r.color); $('#v-room span').textContent = r.atelierName;
  $('#v-count').textContent = fmt(at + 1) + ' / ' + fmt(L_.length);
  $('#v-title').textContent = r.cardName;
  $('#v-sub').textContent = [subOf(r), r.styleKo, r.added].filter(Boolean).join(' · ');
  cnPaint(r);
  favPaint(r);
  $('#v-link').href = r.link; $('#v-link').style.setProperty('--c', r.color);
  $('#v-prev').disabled = $('#v-next').disabled = L_.length < 2;
  const n = L_[(at + 1) % L_.length]; if (n) { const pre = new Image(); pre.src = n.full; }
}
function openViewer(i, from) {
  back = from || document.activeElement;
  viewer.hidden = false; document.body.style.overflow = 'hidden';
  show(i);
  if (!pushed) { try { history.pushState({ view: 1 }, '', location.href); pushed = true; } catch (e) {} }
  $('#v-close').focus();
}
function closeViewer(fromPop) {
  if (viewer.hidden) return;
  fill.reset();
  viewer.hidden = true; document.body.style.overflow = '';
  for (const im of imgs) { im.classList.remove('on'); im.removeAttribute('src'); }
  if (pushed && !fromPop) { pushed = false; closing = true; try { history.back(); } catch (e) { closing = false; } } else pushed = false;
  /* 보던 그림이 격자 밖이면 그 줄로 굴려 놓고 초점을 준다 */
  let t = back && back.isConnected && +back.dataset.i === at ? back : grid.querySelector(`.tile[data-i="${at}"]`);
  if (!t && at >= 0) { const row = Math.floor(at / L.cols); scrollTo(0, grid.getBoundingClientRect().top + scrollY + row * L.rowH - 120); paintGrid(false); t = grid.querySelector(`.tile[data-i="${at}"]`); }
  if (t && t.focus) t.focus({ preventScroll: false });
}
addEventListener('popstate', () => {
  if (closing) { closing = false; return; }
  if (!viewer.hidden) { closeViewer(true); return; }
  sel = G.parse(location.search); $('#q').value = sel.q; paintSort();
  loader.load(wanted()); update(false);
});
const step = d => show(at + d);
$('#v-prev').addEventListener('click', () => step(-1));
$('#v-next').addEventListener('click', () => step(1));
$('#v-close').addEventListener('click', () => closeViewer());
document.addEventListener('keydown', ev => {
  if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
  if (viewer.hidden) { if (ev.key === 'Escape' && panel.classList.contains('open')) { ev.preventDefault(); closePanel(); } return; }
  if (ev.key === 'Escape') { ev.preventDefault(); closeViewer(); return; }
  if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { ev.preventDefault(); step(ev.key === 'ArrowRight' ? 1 : -1); return; }
  if (ev.key === 'Tab') {
    const f = [...viewer.querySelectorAll('button:not(:disabled), a[href]')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    if (!viewer.contains(document.activeElement)) { ev.preventDefault(); f[0].focus(); return; }
    const first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  }
});
/* 꽉 채우기 — 휴대폰 세로에서 1:1 · 3:2 그림(fill-core.js, 즐겨찾기와 같은 몸통) */
const fill = attach($('#v-stage'), { img: () => imgs[layer], button: $('#v-fill'), labels: ['⤢ 꽉 채우기', '⤡ 맞춰 보기'], box: 'stage', before: $('#v-prev'),
  hit: e => !(e.target.closest && e.target.closest('button')) });
/* 밀어 넘기기 — 가로로 40px 넘게, 세로보다 확실히. 꽉 채운 동안은 넘기지 않는다 */
let touch = null;
$('#v-stage').addEventListener('pointerdown', ev => { if (ev.target.closest('button') || fill.on) return; touch = { x: ev.clientX, y: ev.clientY }; });
$('#v-stage').addEventListener('pointerup', ev => { if (!touch || fill.on) { touch = null; return; } const dx = ev.clientX - touch.x, dy = ev.clientY - touch.y; touch = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1); });
$('#v-stage').addEventListener('pointercancel', () => { touch = null; });

/* 일상컷 설명 — 색인이 있는 일상컷만(cnote.js). 펼침은 공방 화면과 같은 열쇠(sessionStorage cnote-open) */
let cnOpen = (() => { try { return sessionStorage.getItem('cnote-open') === '1'; } catch (e) { return false; } })();
function cnPaint(r) { const box = $('#v-cnote'), raw = r && r.casual && r.casual.raw, h = raw ? CN.html(raw, cnOpen, 'v-cnote-list') : ''; box.innerHTML = h; box.hidden = !h; }
$('#v-cnote').addEventListener('click', ev => {
  if (!ev.target.closest('.cnote-more')) return;
  cnOpen = !cnOpen; try { sessionStorage.setItem('cnote-open', cnOpen ? '1' : '0'); } catch (e) { /* 이 쪽 안에서만 */ }
  cnPaint(res.list[at]); const b = $('#v-cnote .cnote-more'); if (b) b.focus();
});

/* 즐겨찾기 — 공방 도감과 같은 칸(favorites.js) */
function favPaint(r) { const on = !!r && isFav(r), b = $('#v-fav'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? '♥ 담았어요' : '♡ 즐겨찾기'; b.disabled = !okStore; b.title = okStore ? '' : '이 브라우저는 저장을 막아 두었어요'; }
$('#v-fav').addEventListener('click', () => {
  const r = res.list[at]; if (!r || !F) return;
  const was = isFav(r), on = F.toggle(G.favEntry(r));
  toast(on ? '즐겨찾기에 담았어요 · ' + r.cardName : was && !on && !F.error() ? '즐겨찾기에서 뺐어요' : (F.message() || '저장이 막혀 담지 못했어요'));
});
if (F) F.onChange(() => {
  readFav(); paintFav();
  const cur = !viewer.hidden && res.list[at];
  res = G.run(rows, sel, { fav: isFav, meta }); paintFacets(); paintActive(); paintCount(); layout(); paintGrid(true);
  if (viewer.hidden) return;
  if (!res.list.length) return closeViewer();
  const k = cur ? res.list.findIndex(r => r.atelier === cur.atelier && r.file === cur.file) : -1;
  if (k >= 0) { at = k; favPaint(res.list[k]); $('#v-count').textContent = fmt(at + 1) + ' / ' + fmt(res.list.length); } else show(Math.min(at, res.list.length - 1));
});
function paintFav() { const n = okStore ? F.count() : 0; $('#fav-link').textContent = n ? `내 즐겨찾기 ${fmt(n)}` : '내 즐겨찾기'; }
paintFav();

let toastT = 0;
function toast(s) { const t = $('#toast'); t.textContent = s; clearTimeout(toastT); toastT = setTimeout(() => { t.textContent = ''; }, 2200); }

/* 검사 · 뒤에 붙을 쪽(오늘의 한 장 · 통계판)이 같은 자료를 볼 수 있게 */
window.AtelierSearch = { get sel() { return sel; }, get result() { return res; }, get rows() { return rows; }, loader, layout: () => L };
update(false);
