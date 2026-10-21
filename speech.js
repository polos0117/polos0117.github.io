/* 말풍선 — 카드(책·무기·기체·장수)가 판에 들어오거나 판이 끝날 때 한 줄 한다.
   말의 재료는 자료(card.json 의 text, 설계표의 voice, LORE …)에서 오고 이 파일에는 화면 말이 없다.
   say(anchor, text, opt): anchor 는 요소나 {x, y}. 요소 위(자리가 없으면 아래)에 꼬리 달린 풍선을 띄우고 글 길이만큼 있다가 사라진다.
   같은 자리의 풍선은 바꿔 끼우고, 한 번에 둘까지만 둔다. 움직임 줄이기면 바로 떴다 바로 사라진다(animation 없이).
   다섯 저장소에 같은 파일을 복사해 둔다(원본은 polos0117.github.io/speech.js). */
(function (root) {
  'use strict';
  var CSS = '.atelier-speech{position:fixed;z-index:60;max-width:min(240px,70vw);padding:7px 11px;border-radius:12px;background:var(--speech-bg,#fffaf0);color:var(--speech-fg,#1b1710);font:600 12px/1.4 var(--sans,system-ui,sans-serif);word-break:keep-all;box-shadow:0 6px 20px #0008;pointer-events:none;opacity:0;transform:translate(-50%,4px) scale(.96);transition:opacity .18s,transform .18s}' +
    '.atelier-speech.in{opacity:1;transform:translate(-50%,0) scale(1)}' +
    '.atelier-speech::after{content:"";position:absolute;left:50%;width:10px;height:10px;background:inherit;transform:translateX(-50%) rotate(45deg)}' +
    '.atelier-speech[data-at="top"]::after{bottom:-4px}.atelier-speech[data-at="bottom"]::after{top:-4px}' +
    '.atelier-speech[data-who="foe"]{background:var(--speech-foe-bg,#2a2430);color:var(--speech-foe-fg,#f3ebe0)}' +
    '@media(prefers-reduced-motion:reduce){.atelier-speech{transition:none}}';
  var live = [], styled = false, MAX = 2;
  function style() { if (styled || typeof document === 'undefined') return; styled = true; var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  function drop(b) { var i = live.indexOf(b); if (i >= 0) live.splice(i, 1); b.classList.remove('in'); setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 200); }
  function place(b, anchor) {
    var r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
    var x = r ? r.left + r.width / 2 : anchor.x, top = r ? r.top : anchor.y, bottom = r ? r.bottom : anchor.y;
    var W = window.innerWidth, H = window.innerHeight;
    b.style.left = Math.max(120, Math.min(W - 120, x)) + 'px';
    if (top > 70 || bottom + 70 > H) { b.setAttribute('data-at', 'top'); b.style.top = ''; b.style.bottom = (H - top + 8) + 'px'; }
    else { b.setAttribute('data-at', 'bottom'); b.style.bottom = ''; b.style.top = (bottom + 8) + 'px'; }
  }
  /* 글을 띄운다. opt.ms 로 머무는 시간, opt.who 로 말투 색('me' | 'foe'), opt.key 로 같은 자리 바꿔 끼우기 */
  function say(anchor, text, opt) {
    if (!text || typeof document === 'undefined' || !anchor) return null;
    opt = opt || {}; style();
    var key = opt.key || (anchor.getBoundingClientRect ? anchor : String(text)), i;
    for (i = live.length - 1; i >= 0; i--) if (live[i]._key === key) drop(live[i]);
    while (live.length >= MAX) drop(live[0]);
    var b = document.createElement('div'); b.className = 'atelier-speech'; b.setAttribute('role', 'status'); b.setAttribute('data-who', opt.who || 'me');
    b.textContent = text; b._key = key; document.body.appendChild(b); place(b, anchor); live.push(b);
    requestAnimationFrame(function () { b.classList.add('in'); });
    var ms = opt.ms || Math.max(2000, Math.min(5200, 1600 + text.length * 55));
    b._timer = setTimeout(function () { drop(b); }, ms);
    return b;
  }
  function clear() { live.slice().forEach(drop); }
  if (typeof window !== 'undefined') { window.addEventListener('scroll', clear, true); window.addEventListener('resize', clear); }
  var api = { say: say, clear: clear };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AtelierSpeech = api;
})(typeof window !== 'undefined' ? window : this);
