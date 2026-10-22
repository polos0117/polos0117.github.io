/* 도트 재생기 v1 (2026-10-22) — 도트 인물 하나를 작은 공간에서 움직인다(대기·걷기·고르기 반응).
   원본은 polos0117.github.io/sprite-actor.js(모양은 sprite-actor.css) — 다섯 공방 저장소의 lib/ 에 글자 하나 다르지 않게 복사해 둔다
   (고치면 여섯 곳을 같이 — 각 저장소의 tests/sprite-actor-copy.cjs 가 옆에 받아 둔 원본과 견준다).
   약속(sprites.json 꼴 · API)은 polos0117.github.io/README.md 「도트 재생기」절. 인물의 그림은 도트 공방(dot.html)에서 만든다.
   의존 없음. window.AtelierSprite 를 단다. 화면 말은 없다 — 누르는 이름(label)은 부르는 쪽이 준다.

   지키는 것:
   - 그리기는 시트 한 장의 background-position 과 transform 뿐 — 루프 안에서 배치를 읽지 않는다(공간 폭은 ResizeObserver 가 미리).
   - 선명하게: 도트 한 칸 = 실제 화소의 정수배. CSS 크기는 devicePixelRatio 로 나눠 정하고, 자리도 실제 화소에 맞춘다.
   - 움직임 끔(AtelierMotion — scene-motion.js 의 atelier_motion_v1·동작 줄이기, 없으면 동작 줄이기만)이면 대기 첫 칸에 멈춰 선다. 고르기는 그래도 된다.
   - 숨은 탭·화면 밖·pause() 면 루프가 쉰다(대기 시간도 같이 멈춘다). 감상 창(dialog) 뒤에서 쉬게 하는 것은 부르는 쪽이 pause/resume.
   - 고르기는 반응이 끝나기를 기다리지 않는다 — onSelect 를 바로 부른다. 반응이 도는 동안 다시 누른 것은 버린다(두 번 열리지 않게).
   - 그림을 못 받으면 인물을 숨기고 onError 만 부른다 — 둘레 화면은 그대로 돈다. */
(function (root) {
  var doc = root.document;

  function motionOn() {
    var M = root.AtelierMotion;
    if (M && M.enabled) return M.enabled();
    try { return !(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return true; }
  }
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function picture(src) {
    return new Promise(function (ok) {
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () { ok(im); }; im.onerror = function () { ok(null); };
      im.src = src;
    });
  }
  function cssURL(src) { return 'url("' + String(src).replace(/["\\\n\r]/g, function (c) { return encodeURIComponent(c); }) + '")'; }

  var cache = {};
  function load(url) {
    url = url || 'data/sprites.json';
    if (!cache[url]) cache[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    return cache[url];
  }

  /* host — position:relative 인 공간. def — sprites.json 의 인물 하나. opts:
     base(그림 주소 앞), label(누르는 이름), points([왼쪽, 오른쪽] 공간 폭의 비율 0~1), start(처음 자리 0 또는 1),
     idleMs([최소, 최대] 걷기 전 서 있는 시간), seed, scale(도트 한 칸의 CSS 배율, 기본 def.scale), floor(공간 바닥에서 발까지 CSS px),
     fit(참이면 공간 높이에 들어가게 배율을 낮춘다 — 그래도 실제 화소 정수배),
     wander(false 면 저절로 걷지 않는다 — 부르는 쪽이 march·walkTo 로만),
     onSelect(actor), onError(), onState(name) */
  function create(host, def, opts) {
    opts = opts || {};
    var S = def.states, cell = def.cell, foot = def.foot || [cell[0] / 2, cell[1] - 2];
    var points = opts.points || [0.25, 0.75], idleMs = opts.idleMs || [3000, 6000], rand = rng(opts.seed || 7);
    var el = doc.createElement('button'), body = doc.createElement('span'), shadow = doc.createElement('span');
    el.type = 'button'; el.className = 'sprite-actor'; el.hidden = true;
    if (opts.label) { el.setAttribute('aria-label', opts.label); el.title = opts.label; }
    body.className = 'sprite-actor-body'; shadow.className = 'sprite-actor-shadow';
    shadow.setAttribute('aria-hidden', 'true'); body.setAttribute('aria-hidden', 'true');
    el.appendChild(shadow); el.appendChild(body); host.appendChild(el);

    var A = {
      el: el, failed: false, ready: false,
      state: 'idle', step: 0, frame: 0, elapsed: 0, wait: 0,
      at: opts.start ? 1 : 0, x: 0, target: null, march: 0, facing: def.facing || 'right',
      paused: {}, width: 0, unit: 1, dpr: 1, raf: 0, last: 0, dead: false, sheets: {}
    };
    var scale = opts.scale || def.scale || 2;

    function has(name) { return !!A.sheets[name]; }
    function order(name) { return (S[name] && S[name].order) || [0]; }
    function ms(name, i) { var m = S[name] && S[name].ms; return (m && m[i]) || 120; }
    function running() { return A.ready && !A.failed && !A.dead && motionOn() && !Object.keys(A.paused).length; }
    function snap(v) { return Math.round(v * A.dpr) / A.dpr; }

    /* 도트 한 칸의 CSS 크기 — 실제 화소로 정수(scale 에 가장 가까운) */
    function measure() {
      A.dpr = root.devicePixelRatio || 1;
      var n = Math.max(1, Math.round(scale * A.dpr)), room = opts.fit ? host.clientHeight - (opts.floor || 0) - 4 : Infinity;
      while (n > 1 && cell[1] * n / A.dpr > room) n -= 1;   // 낮은 공간(휴대폰 가로)에서는 들어가는 가장 큰 정수배로
      A.unit = n / A.dpr;
      el.style.setProperty('--sprite-px', A.unit + 'px');
      el.style.width = cell[0] * A.unit + 'px'; el.style.height = cell[1] * A.unit + 'px';
      body.style.width = cell[0] * A.unit + 'px'; body.style.height = cell[1] * A.unit + 'px';
      el.style.bottom = (opts.floor || 0) - (cell[1] - foot[1]) * A.unit + 'px';
      A.width = host.clientWidth;
      A.x = pointX(A.at); paint(true);
    }
    function pointX(i) {
      var half = foot[0] * A.unit, w = A.width || host.clientWidth;
      return Math.min(Math.max(half, w * points[i]), Math.max(half, w - (cell[0] - foot[0]) * A.unit));
    }
    var shown = '';
    function paint(force) {
      var name = has(A.state) ? A.state : 'still', st = S[name] || S.still, f = name === 'still' ? 0 : A.frame;
      var key = name + ':' + f + ':' + A.unit;
      if (force || key !== shown) {
        shown = key;
        if (body.dataset.sheet !== name || force) {
          body.style.backgroundImage = cssURL(A.sheets[name].src);
          body.style.backgroundSize = (st.frames || 1) * cell[0] * A.unit + 'px ' + cell[1] * A.unit + 'px';
          body.dataset.sheet = name;
        }
        body.style.backgroundPosition = -f * cell[0] * A.unit + 'px 0';
      }
      /* dy — 칸마다 위아래(도트 화소, + 는 아래): 걷기의 오르내림을 다리와 맞춘다(도트 공방이 셈 — rust/dot-core 의 bob). 그림자는 반대로 옮겨 땅에 둔다 */
      var dy = (st && st.dy && st.dy[f]) || 0;
      el.style.transform = 'translate3d(' + snap(A.x - foot[0] * A.unit) + 'px,' + snap(dy * A.unit) + 'px,0)';
      shadow.style.transform = dy ? 'translate(-50%,' + snap(-dy * A.unit) + 'px)' : '';
      el.dataset.state = A.state; el.dataset.facing = A.facing; el.dataset.frame = String(f);
    }
    function enter(name) {
      if (!has(name)) name = has('idle') ? 'idle' : 'still';
      A.state = name; A.step = 0; A.elapsed = 0;
      A.frame = order(name)[0];
      if (name === 'idle' || (name === 'still' && !has('idle'))) A.wait = idleMs[0] + rand() * (idleMs[1] - idleMs[0]);   // 대기 시트가 없으면 정지 도트로 서 있다가 걷는다
      if (opts.onState) try { opts.onState(name); } catch (e) {}
      paint();
    }
    /* 걷기 — 두 자리 사이. 가는 쪽을 보고, 닿으면 대기 */
    function walkTo(i) {
      if (!has('walk') || A.failed) return false;
      A.target = i; A.march = 0; A.facing = pointX(i) < A.x ? 'left' : 'right';
      if (!def.flip && A.facing !== (def.facing || 'right')) A.facing = def.facing || 'right';
      enter('walk'); kick(); return true;
    }
    function tick(now) {
      A.raf = 0;
      if (!running()) { A.last = 0; return; }
      var dt = A.last ? Math.min(100, now - A.last) : 0; A.last = now;
      var o = order(A.state);
      A.elapsed += dt;
      while (A.elapsed >= ms(A.state, A.step)) {
        A.elapsed -= ms(A.state, A.step); A.step += 1;
        if (A.step >= o.length) {
          if (A.state === 'react') { enter('idle'); o = order('idle'); break; }
          A.step = 0;
        }
        A.frame = o[A.step];
      }
      if (A.state === 'walk' && A.target === null && A.march > 0) {   // 제자리 걸음(march) — 시간이 다 되면 대기
        A.march -= dt; if (A.march <= 0) { A.march = 0; enter('idle'); }
      } else if (A.state === 'walk' && A.target !== null) {
        var to = pointX(A.target), v = (S.walk.speed || 30) * A.unit * dt / 1000, d = to - A.x;
        if (Math.abs(d) <= v) { A.x = to; A.at = A.target; A.target = null; enter('idle'); }
        else A.x += d > 0 ? v : -v;
      } else if (A.state === 'idle' || A.state === 'still') {
        A.wait -= dt;
        if (A.wait <= 0 && has('walk') && opts.wander !== false) walkTo(1 - A.at);
      }
      paint();
      A.raf = root.requestAnimationFrame(tick);
    }
    function kick() { if (!A.raf && running()) { A.last = 0; A.raf = root.requestAnimationFrame(tick); } }
    function still() {
      /* 움직임 끔 — 대기 첫 칸, 걷던 것은 그 자리에서 멈춘다 */
      if (A.raf) { root.cancelAnimationFrame(A.raf); A.raf = 0; }
      if (!motionOn() && A.ready) {
        if (A.state === 'walk') { A.target = null; A.march = 0; }
        A.state = has('idle') ? 'idle' : 'still'; A.step = 0; A.elapsed = 0; A.frame = order(A.state)[0];
        paint();
      }
    }
    function sync() { if (running()) kick(); else still(); }

    function select() {
      if (A.failed || A.dead || !A.ready) return false;
      if (A.state === 'react' && running()) return false;   // 반응 중 다시 누른 것은 버린다
      if (opts.onSelect) try { opts.onSelect(A.api); } catch (e) { setTimeout(function () { throw e; }); }
      if (running() && has('react')) { A.target = null; enter('react'); kick(); }
      return true;
    }
    function pause(reason) { A.paused[reason || 'manual'] = true; sync(); }
    function resume(reason) { delete A.paused[reason || 'manual']; sync(); }

    el.addEventListener('click', function (e) { e.preventDefault(); select(); });
    function onVisible() { if (doc.hidden) pause('hidden'); else resume('hidden'); }
    doc.addEventListener('visibilitychange', onVisible);
    var unsub = root.AtelierMotion && root.AtelierMotion.subscribe ? root.AtelierMotion.subscribe(sync) : null;
    var ro = root.ResizeObserver ? new ResizeObserver(function () { if (A.ready) measure(); }) : null;
    if (ro) ro.observe(host);
    var io = root.IntersectionObserver ? new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) resume('offscreen'); else pause('offscreen'); });
    }) : null;
    function onDpr() { if (A.ready) measure(); }
    root.addEventListener('resize', onDpr);

    function destroy() {
      A.dead = true; if (A.raf) root.cancelAnimationFrame(A.raf);
      doc.removeEventListener('visibilitychange', onVisible); root.removeEventListener('resize', onDpr);
      if (unsub) unsub(); if (ro) ro.disconnect(); if (io) io.disconnect();
      if (el.parentNode) el.parentNode.removeChild(el);
    }

    var base = opts.base || '';
    var names = Object.keys(S);
    var ready = Promise.all(names.map(function (n) {
      return picture(base + S[n].file).then(function (im) { if (im) A.sheets[n] = im; });
    })).then(function () {
      if (A.dead) return A.api;
      if (!has('still') && !has('idle')) {
        A.failed = true; el.hidden = true;
        if (opts.onError) try { opts.onError(); } catch (e) {}
        return A.api;
      }
      if (!has('still')) A.sheets.still = A.sheets.idle;
      A.ready = true; el.hidden = false;
      measure(); enter('idle'); onVisible();
      if (io) io.observe(el);
      sync();
      return A.api;
    });

    A.api = {
      el: el, ready: ready, select: select, pause: pause, resume: resume, destroy: destroy,
      walkTo: function (i) { return running() ? walkTo(i) : false; },
      /* 제자리에서 ms 동안 걷는다(자리는 그대로 — 공간 쪽이 움직여 보이게 할 때). 움직임 끔이면 false */
      march: function (ms) { if (!running() || !has('walk')) return false; A.target = null; A.march = ms; enter('walk'); kick(); return true; },
      play: function (name) { if (!running() || !has(name)) return false; if (name === 'walk') return walkTo(1 - A.at); A.target = null; enter(name); kick(); return true; },
      get running() { return running(); },
      get failed() { return A.failed; },
      /* 검사·예제용 — 지금 상태 */
      debug: function () { return { state: A.state, frame: A.frame, x: A.x, at: A.at, facing: A.facing, unit: A.unit, dpr: A.dpr, paused: Object.keys(A.paused), running: running(), ready: A.ready, failed: A.failed }; }
    };
    el.sprite = A.api;   // 단추에서 인물을 찾을 때(검사·부르는 쪽)
    return A.api;
  }

  root.AtelierSprite = { load: load, create: create };
})(typeof window !== 'undefined' ? window : this);
