// Activity "Co nie Pasuje?": three large pictures, two of one kind and one different. Touching the odd one makes it
// glow and bounce while the other two fade a little; ~3s later the next set fades in. Touching a matching picture
// only wobbles it once. Touches are ignored while a set is changing. One rAF loop (capped dt, idle when nothing
// moves, paused when hidden) drives everything, so it works under prefers-reduced-motion. Nothing is stored.
// Fixed DOM: 3 buttons. Meaning is carried by silhouettes (not colour alone).
import { useEffect, useRef } from 'react';

var MAXDT: any = 0.05, WOBBLE: any = 0.7, BOUNCE: any = 0.9, GLOW: any = 3, FADE: any = 0.9;
var STROKE: any = ' stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
var GLOWC: any = '<circle class="cn-glow" cx="50" cy="50" r="50" fill="#fff3b8" opacity="0"/>';

// categories: 0 fruit, 1 vehicle, 2 animal, 3 toy; three pictures each
var PICS: any = [
  [
    { label: 'Jabłko', svg: '<path d="M50 32q0-12 8-16" fill="none" stroke="#9c8268" stroke-width="4" stroke-linecap="round"/><path d="M52 24q14-8 22 0q-10 10-22 0z" fill="#a8dba0"/><path d="M50 34c-10-8-32-4-32 22c0 22 16 36 32 32c16 4 32-10 32-32c0-26-22-30-32-22z" fill="#f7a8a8" stroke="#e58f8f"' + STROKE + '/>' },
    { label: 'Gruszka', svg: '<path d="M50 28q0-10 6-14" fill="none" stroke="#9c8268" stroke-width="4" stroke-linecap="round"/><path d="M52 22q12-6 18 2q-10 8-18-2z" fill="#a8dba0"/><path d="M50 26c-10 0-14 12-14 20c0 8-18 16-18 30c0 12 14 16 32 16s32-4 32-16c0-14-18-22-18-30c0-8-4-20-14-20z" fill="#d8eb9a" stroke="#bcd478"' + STROKE + '/>' },
    { label: 'Banan', svg: '<path d="M18 30q4 44 54 52q14 2 18-8q-30 0-48-26q-8-12-12-20q-8-4-12 2z" fill="#ffe08a" stroke="#f3cd66"' + STROKE + '/><path d="M18 30l-2-8" stroke="#9c8268" stroke-width="5" stroke-linecap="round"/>' }
  ],
  [
    { label: 'Samochód', svg: '<path d="M10 62v-10q0-6 6-8l14-2l10-14q2-3 6-3h22q4 0 6 3l8 14q8 2 8 8v12z" fill="#a8d8f0" stroke="#8cc4e2"' + STROKE + '/><path d="M36 30h12v12H28zM54 30h10l6 12H54z" fill="#fff" opacity=".8"/><circle cx="30" cy="66" r="10" fill="#6f6a8c"/><circle cx="72" cy="66" r="10" fill="#6f6a8c"/><circle cx="30" cy="66" r="4" fill="#d9d0ee"/><circle cx="72" cy="66" r="4" fill="#d9d0ee"/>' },
    { label: 'Łódka', svg: '<path d="M50 14v50" stroke="#9c8268" stroke-width="4" stroke-linecap="round"/><path d="M54 18l26 40H54z" fill="#f7b6c2" stroke="#e598a8"' + STROKE + '/><path d="M46 26l-24 32h24z" fill="#fff" stroke="#d9d0ee"' + STROKE + '/><path d="M10 64h80q-6 20-22 20H32q-16 0-22-20z" fill="#ffd98a" stroke="#f3c26a"' + STROKE + '/>' },
    { label: 'Samolot', svg: '<path d="M10 52q0-8 10-8h46q20 0 24 8q-4 8-24 8H20q-10 0-10-8z" fill="#e6e0f7" stroke="#c4b8e8"' + STROKE + '/><path d="M42 46L26 18h12l28 28z" fill="#c9b8f2"/><path d="M42 58L26 86h12l28-28z" fill="#c9b8f2"/><path d="M10 46L6 30h10l10 16z" fill="#c9b8f2"/><circle cx="74" cy="50" r="4" fill="#fff"/>' }
  ],
  [
    { label: 'Kotek', svg: '<path d="M22 44l2-26l18 14h16l18-14l2 26q4 6 4 14c0 18-14 28-32 28s-32-10-32-28q0-8 4-14z" fill="#f6c9b0" stroke="#e8ae90"' + STROKE + '/><circle cx="38" cy="56" r="3.5" fill="#4a4560"/><circle cx="62" cy="56" r="3.5" fill="#4a4560"/><path d="M46 66h8l-4 4z" fill="#e58f8f"/><path d="M50 70q-4 6-9 4M50 70q4 6 9 4" fill="none" stroke="#4a4560" stroke-width="2" stroke-linecap="round"/><path d="M20 62h14M66 62h14" stroke="#4a4560" stroke-width="1.6" stroke-linecap="round"/>' },
    { label: 'Kaczuszka', svg: '<ellipse cx="46" cy="68" rx="32" ry="20" fill="#ffe08a" stroke="#f3cd66"' + STROKE + '/><circle cx="62" cy="36" r="17" fill="#ffe08a" stroke="#f3cd66"' + STROKE + '/><path d="M76 38l16 4-16 6z" fill="#f9b872"/><circle cx="66" cy="32" r="2.8" fill="#4a4560"/><path d="M26 64q10 14 28 4" fill="none" stroke="#f3cd66" stroke-width="3" stroke-linecap="round"/>' },
    { label: 'Rybka', svg: '<ellipse cx="44" cy="50" rx="32" ry="22" fill="#a8d8f0" stroke="#8cc4e2"' + STROKE + '/><path d="M72 50l20-18v36z" fill="#a8d8f0" stroke="#8cc4e2"' + STROKE + '/><path d="M38 32q8-12 18-4" fill="#8cc4e2"/><circle cx="28" cy="44" r="3.4" fill="#4a4560"/><path d="M24 56q5 4 10 0" fill="none" stroke="#4a4560" stroke-width="2" stroke-linecap="round"/>' }
  ],
  [
    { label: 'Piłka', svg: '<circle cx="50" cy="50" r="36" fill="#f7a8c9" stroke="#e58fb4"' + STROKE + '/><path d="M16 42q34 14 68 0M16 60q34-14 68 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M50 14v72" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>' },
    { label: 'Klocek', svg: '<rect x="18" y="38" width="64" height="44" rx="6" fill="#c4e8a0" stroke="#a9d283"' + STROKE + '/><rect x="26" y="24" width="14" height="14" rx="4" fill="#c4e8a0" stroke="#a9d283"' + STROKE + '/><rect x="60" y="24" width="14" height="14" rx="4" fill="#c4e8a0" stroke="#a9d283"' + STROKE + '/><path d="M26 52h22" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>' },
    { label: 'Latawiec', svg: '<path d="M50 10L78 40L50 70L22 40z" fill="#c9b8f2" stroke="#b09ee0"' + STROKE + '/><path d="M50 10v60M22 40h56" stroke="#fff" stroke-width="3" opacity=".8"/><path d="M50 70q-10 8 0 14t0 12" fill="none" stroke="#9c8268" stroke-width="3" stroke-linecap="round"/><path d="M44 80l-8 4M56 90l8 2" stroke="#f7a8c9" stroke-width="5" stroke-linecap="round"/>' }
  ]
];
// each set: two pictures of one category [cat, i, j] and one odd picture [cat, i]
var SETS: any = [
  [[0, 0, 1], [1, 0]], [[0, 1, 2], [2, 0]], [[2, 0, 1], [0, 0]], [[2, 1, 2], [3, 0]],
  [[1, 0, 1], [2, 1]], [[1, 1, 2], [0, 1]], [[3, 0, 1], [2, 2]], [[3, 1, 2], [1, 1]],
  [[0, 0, 2], [3, 1]], [[2, 0, 2], [1, 2]]
];

function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var root: any = document.createElement('div');
  root.className = 'cn';
  root.innerHTML = '<div class="cn-row"></div>';
  container.appendChild(root);
  var row: any = root.firstChild;

  var cur: any = -1, phase: any = 'in', pt: any = 0, fade: any = 0, glow: any = 0, dim: any = 0, items: any = [], oddIdx: any = 0;

  function pick() {
    var n: any;
    do { n = Math.floor(Math.random() * SETS.length); } while (n === cur && SETS.length > 1);
    cur = n;
  }
  function build() {
    pick();
    var s: any = SETS[cur];
    var pics: any = [PICS[s[0][0]][s[0][1]], PICS[s[0][0]][s[0][2]], PICS[s[1][0]][s[1][1]]];
    oddIdx = Math.floor(Math.random() * 3);
    var order: any = [], k: any = 0, i: any;
    for (i = 0; i < 3; i++) { order.push(i === oddIdx ? pics[2] : pics[k++]); }
    row.innerHTML = '';
    items = [];
    order.forEach(function (p?: any, idx?: any) {
      var b: any = document.createElement('button');
      b.type = 'button'; b.className = 'cn-btn'; b.setAttribute('aria-label', p.label);
      b.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + GLOWC + '<g class="cn-fig">' + p.svg + '</g></svg>';
      row.appendChild(b);
      var o: any = { el: b, fig: b.querySelector('.cn-fig'), gl: b.querySelector('.cn-glow'), odd: idx === oddIdx, t: -1 };
      o.fig.style.transformOrigin = '50px 90px';
      b.addEventListener('click', function () { touch(o); });
      items.push(o);
    });
    glow = 0; dim = 0;
  }

  function touch(o?: any) {
    if (phase !== 'play') { return; }
    o.t = 0;
    if (o.odd) { phase = 'glow'; pt = 0; }
    wake();
  }

  var raf: any = 0, last: any = 0, noMotion: any = reduced();
  function frame(now?: any) {
    raf = 0;
    var dt: any = last ? Math.min((now - last) / 1000, MAXDT) : 0;
    last = now;
    var busy: any = phase !== 'play', i: any, o: any;
    if (phase === 'glow') {
      pt += dt;
      glow = pt < 0.5 ? smooth(pt / 0.5) : pt > GLOW - 0.5 ? smooth((GLOW - pt) / 0.5) : 1;
      dim = glow;
      if (pt >= GLOW) { phase = 'out'; pt = 0; }
    } else if (phase === 'out') {
      pt += dt; fade = 1 - smooth(pt / FADE);
      if (pt >= FADE) { build(); fade = 0; phase = 'in'; pt = 0; }
    } else if (phase === 'in') {
      pt += dt; fade = smooth(pt / FADE);
      if (pt >= FADE) { fade = 1; phase = 'play'; busy = false; }
    }
    row.style.opacity = fade;
    for (i = 0; i < items.length; i++) {
      o = items[i];
      var y: any = 0, rot: any = 0, sx: any = 1, sy: any = 1;
      if (o.t >= 0) {
        var dur: any = o.odd ? BOUNCE : WOBBLE;
        o.t += dt; busy = true;
        if (o.t >= dur) { o.t = -1; } else if (!noMotion) {
          var p: any = o.t / dur;
          if (o.odd) { var h: any = Math.abs(Math.sin(Math.PI * p * 2)) * (1 - p); y = -16 * h; sy = 1 + 0.05 * h; sx = 1 - 0.03 * h; }
          else { rot = 7 * Math.sin(Math.PI * p * 3) * (1 - p); }
        }
      }
      o.fig.style.transform = 'translateY(' + y + 'px) rotate(' + rot + 'deg) scale(' + sx + ',' + sy + ')';
      o.gl.setAttribute('opacity', o.odd ? glow * 0.9 : 0);
      o.el.style.opacity = o.odd ? 1 : 1 - 0.45 * dim;
    }
    if (busy && !document.hidden) { raf = requestAnimationFrame(frame); } else { last = 0; }
  }
  function wake() { if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } last = 0; }
    else { wake(); }
  }
  document.addEventListener('visibilitychange', onVis);
  build();
  wake();

  return function cleanup() {
    document.removeEventListener('visibilitychange', onVis);
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function CoNiePasujeActivity() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cleanup = mount(container);
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
      container.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} className="act-stage stage" />;
}
