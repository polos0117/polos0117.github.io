/* 꽉 채우기 몸통 — 화면 틀(preact) 없이 쓰는 몫(2026-11-25, 사용자 「그 우리 가로보기랑 크게보기 만든거 이거를 공방허브에 즐겨찾기 모음해놓은곳에도 적용해줘」).
   공방의 lib/fill-view.js(preact 훅 useFill)가 여기 셈 · 두 번 누르기를 가져다 쓰고, 공방 모음(polos0117.github.io)의 즐겨찾기 크게 보기는 attach 로 붙인다.
   원본은 style-atelier shared/lib/fill-core.js — 공방 사본은 손으로 고치지 않는다(node shared/sync.cjs 가 덮는다).

   · fitBox(stage, img, mode) — 맞춤 보기에서 그림이 받을 수 있는 칸(너비 × 높이).
       mode 'parent' = 칸이 그림 크기만큼 줄어드는 꼴(너비는 칸을 담은 부모의 안쪽 너비), 'stage' = 칸이 제 자리를 다 차지하는 꼴(칸의 안쪽 너비).
       높이는 그림의 max-height 가 px 이면 그것, 아니면(100% · none 따위) 칸의 안쪽 높이.
   · wide(nat, box) — 그림이 그 칸보다 뚜렷이 넓은가(가로세로 비가 칸의 비 × MARGIN 보다 클 때). 2:3 · 데스크톱 · 펼친 폴드 · 가로 화면은 아니다.
   · makeTap(toggle, hit) — 두 번 누르기. 손가락은 pointerup 두 번(350ms · 30px 안), 마우스는 dblclick(손가락 뒤 1초 안의 dblclick 은 버린다 —
       손가락으로 느리게 두 번 누르면 브라우저가 dblclick 을 또 쏘아 두 배 반 뒤에 켜졌다). hit(e) 가 참인 곳에서만 듣는다(기본: 그림 · 굴림 칸, 단추 빼고).
   · attach(stage, opt) — 화면 틀 없는 크게 보기에 붙인다. opt = { img: () => 맞춤 보기의 지금 그림, button: 단추(뜰 때만 보인다),
       labels: [펴기 말, 접기 말], box: 'stage' | 'parent', hit, before: 굴림 칸을 넣을 자리(그 앞에), onToggle(on) }.
       켜면 그림을 본뜬 그림 하나를 굴림 칸(.fill-scroll, 높이 --fill-h · 그림 너비 --fill-w)에 넣어 칸 위에 얹고 칸에 .is-fill — 가운데부터.
       돌려주는 것: { measure, toggle, reset, get on, get can, destroy }. 그림이 바뀌면 reset · measure(그림의 load 는 잡아채기로 스스로 잰다), 화면 크기가 바뀌면 맞춤으로. */
export const MARGIN = 1.4;
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
export function fitBox(stage, img, mode) {
  const par = mode === 'stage' ? stage : stage.parentElement || stage, pc = getComputedStyle(par), sc = getComputedStyle(stage);
  const w = par.clientWidth - num(pc.paddingLeft) - num(pc.paddingRight);
  const mh = getComputedStyle(img).maxHeight;
  const h = /px$/.test(mh) ? num(mh) : stage.clientHeight - num(sc.paddingTop) - num(sc.paddingBottom);
  return { w: Math.floor(w), h: Math.floor(h) };
}
export const wide = (nat, box) => !!(nat && box && box.w > 0 && box.h > 0 && nat.h > 0 && nat.w / nat.h > (box.w / box.h) * MARGIN);

const onImg = e => !!(e.target && e.target.closest && (e.target.tagName === 'IMG' || e.target.closest('.fill-scroll')) && !e.target.closest('button'));
export function makeTap(toggle, hit) {
  const T = { t: 0, x: 0, y: 0, touch: 0, up: 0 }, ok = hit || onImg;
  return {
    onPointerUp: e => {
      if (e.pointerType === 'touch') T.up = Date.now();
      if (e.pointerType !== 'touch' || !ok(e)) return;
      const now = Date.now();
      if (now - T.t < 350 && Math.hypot(e.clientX - T.x, e.clientY - T.y) < 30) { T.t = 0; T.touch = now; toggle(); }
      else { T.t = now; T.x = e.clientX; T.y = e.clientY; }
    },
    onPointerCancel: () => { T.t = 0; },
    onDblClick: e => { if (!ok(e) || Date.now() - Math.max(T.touch, T.up) < 1000 || (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents)) return; e.preventDefault(); toggle(); },
  };
}

export function attach(stage, opt) {
  const o = opt || {};
  let can = false, on = false, box = null, nat = null, scroll = null;
  const paint = () => {
    const b = o.button; if (!b) return;
    b.hidden = !(can || on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (o.labels) b.textContent = o.labels[on ? 1 : 0];
  };
  const measure = () => {
    if (on) return;
    const img = o.img && o.img();
    if (!img || !img.naturalWidth || !img.isConnected) { can = false; box = nat = null; paint(); return; }
    box = fitBox(stage, img, o.box); nat = { w: img.naturalWidth, h: img.naturalHeight }; can = wide(nat, box); paint();
  };
  const set = v => {
    if (v === on || (v && !(can && box && nat))) return;
    on = v;
    if (on) {
      const img = o.img(), hh = box.h, ww = Math.round(hh * nat.w / nat.h), im = new Image();
      im.src = img.currentSrc || img.src; im.alt = img.alt; im.decoding = 'async';
      scroll = document.createElement('div'); scroll.className = 'fill-scroll';
      scroll.style.setProperty('--fill-h', hh + 'px'); scroll.style.setProperty('--fill-w', ww + 'px');
      scroll.appendChild(im); stage.insertBefore(scroll, o.before && o.before.parentNode === stage ? o.before : null);
      stage.classList.add('is-fill');
      scroll.scrollLeft = Math.max(0, (scroll.scrollWidth - scroll.clientWidth) / 2);   /* 펴면 가운데부터 */
    } else {
      if (scroll) scroll.remove(); scroll = null;
      stage.classList.remove('is-fill');
    }
    paint();
    if (o.onToggle) o.onToggle(on);
    if (!on) measure();
  };
  const toggle = () => set(!on);
  const tap = makeTap(toggle, o.hit);
  const load = ev => { if (!scroll || !scroll.contains(ev.target)) measure(); };
  const resize = () => { if (on) set(false); else measure(); };
  stage.addEventListener('load', load, true);
  stage.addEventListener('pointerup', tap.onPointerUp); stage.addEventListener('pointercancel', tap.onPointerCancel); stage.addEventListener('dblclick', tap.onDblClick);
  addEventListener('resize', resize); addEventListener('orientationchange', resize);
  if (o.button) o.button.addEventListener('click', toggle);
  paint();
  return {
    measure, toggle, reset: () => set(false),
    get on() { return on; }, get can() { return can; },
    destroy() {
      set(false);
      stage.removeEventListener('load', load, true);
      stage.removeEventListener('pointerup', tap.onPointerUp); stage.removeEventListener('pointercancel', tap.onPointerCancel); stage.removeEventListener('dblclick', tap.onDblClick);
      removeEventListener('resize', resize); removeEventListener('orientationchange', resize);
      if (o.button) o.button.removeEventListener('click', toggle);
    },
  };
}
