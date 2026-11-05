// Activity "Duże i Małe": drag big animals to the big house and small animals to the small house. No wrong answers:
// an animal released anywhere else floats back. One rAF loop (works under prefers-reduced-motion, pauses when the
// tab is hidden, stops when idle); fixed DOM of 2 houses + 4 animals (a big and a small version of 2 animal types).
// Each launch shuffles the animal pool: round r shows pool[2r], pool[2r+1] (wrapping), and two different house colours are picked. Layout is computed in px from the field size.
import { useEffect, useRef } from 'react';
import { Rand } from '../utils/rand';

var ATTR: any = 'viewBox="0 0 100 100" aria-hidden="true" focusable="false"';
var TYPES: any = [
  { id: 'bear', label: 'miś', glow: '#e0b890',
    art: '<circle cx="24" cy="28" r="13" fill="#d9b99b"/><circle cx="76" cy="28" r="13" fill="#d9b99b"/><circle cx="24" cy="28" r="6" fill="#f1d9c4"/><circle cx="76" cy="28" r="6" fill="#f1d9c4"/>' +
      '<circle cx="50" cy="55" r="36" fill="#d9b99b"/><ellipse cx="50" cy="67" rx="16" ry="12" fill="#f6e4d2"/><circle cx="38" cy="50" r="4" fill="#5b5675"/><circle cx="62" cy="50" r="4" fill="#5b5675"/><ellipse cx="50" cy="62" rx="5" ry="3.5" fill="#5b5675"/>' },
  { id: 'rabbit', label: 'króliczek', glow: '#f0b8d0',
    art: '<ellipse cx="34" cy="22" rx="9" ry="22" fill="#fbf7ff" stroke="#c9b8f2" stroke-width="3"/><ellipse cx="66" cy="22" rx="9" ry="22" fill="#fbf7ff" stroke="#c9b8f2" stroke-width="3"/><ellipse cx="34" cy="24" rx="4" ry="14" fill="#f7c4d8"/><ellipse cx="66" cy="24" rx="4" ry="14" fill="#f7c4d8"/>' +
      '<circle cx="50" cy="62" r="30" fill="#fbf7ff" stroke="#c9b8f2" stroke-width="3"/><circle cx="40" cy="58" r="3.5" fill="#5b5675"/><circle cx="60" cy="58" r="3.5" fill="#5b5675"/><ellipse cx="50" cy="68" rx="4.5" ry="3" fill="#f7a8c9"/>' },
  { id: 'cat', label: 'kotek', glow: '#ffcf9a',
    art: '<path d="M16 46 L20 12 L44 30 Z" fill="#ffc9a0"/><path d="M84 46 L80 12 L56 30 Z" fill="#ffc9a0"/><path d="M23 34 L24 22 L33 30 Z" fill="#f7a8c9"/><path d="M77 34 L76 22 L67 30 Z" fill="#f7a8c9"/>' +
      '<circle cx="50" cy="58" r="34" fill="#ffc9a0"/><circle cx="38" cy="54" r="4" fill="#5b5675"/><circle cx="62" cy="54" r="4" fill="#5b5675"/><path d="M45 64 h10 l-5 6 z" fill="#f7a8c9"/><path d="M12 62 h14 M12 70 h14 M74 62 h14 M74 70 h14" stroke="#b79a82" stroke-width="2" stroke-linecap="round"/>' },
  { id: 'duck', label: 'kaczuszka', glow: '#ffe28a',
    art: '<circle cx="50" cy="52" r="38" fill="#ffe28a"/><path d="M22 62 q-12-4-10-14 q10 2 14 10z" fill="#ffd25e"/><path d="M78 62 q12-4 10-14 q-10 2-14 10z" fill="#ffd25e"/>' +
      '<ellipse cx="50" cy="62" rx="15" ry="9" fill="#ffb27a"/><circle cx="38" cy="45" r="4" fill="#5b5675"/><circle cx="62" cy="45" r="4" fill="#5b5675"/>' },
  { id: 'pig', label: 'świnka', glow: '#f7b0c4',
    art: '<path d="M18 34 L22 12 L42 26 Z" fill="#f7b6c8"/><path d="M82 34 L78 12 L58 26 Z" fill="#f7b6c8"/>' +
      '<circle cx="50" cy="56" r="36" fill="#f9c6d4"/><ellipse cx="50" cy="66" rx="16" ry="12" fill="#f29fb8"/><circle cx="44" cy="66" r="2.6" fill="#b45a78"/><circle cx="56" cy="66" r="2.6" fill="#b45a78"/><circle cx="37" cy="48" r="4" fill="#5b5675"/><circle cx="63" cy="48" r="4" fill="#5b5675"/>' },
  { id: 'mouse', label: 'myszka', glow: '#d3d0e6',
    art: '<circle cx="22" cy="28" r="16" fill="#cfcbe3"/><circle cx="78" cy="28" r="16" fill="#cfcbe3"/><circle cx="22" cy="28" r="9" fill="#f7c4d8"/><circle cx="78" cy="28" r="9" fill="#f7c4d8"/>' +
      '<ellipse cx="50" cy="60" rx="32" ry="30" fill="#e2dff0"/><circle cx="39" cy="55" r="3.8" fill="#5b5675"/><circle cx="61" cy="55" r="3.8" fill="#5b5675"/><ellipse cx="50" cy="68" rx="5" ry="3.5" fill="#f7a8c9"/><path d="M14 66 h14 M14 74 h14 M72 66 h14 M72 74 h14" stroke="#a7a2c4" stroke-width="2" stroke-linecap="round"/>' },
  { id: 'frog', label: 'żabka', glow: '#b6e3a0',
    art: '<circle cx="28" cy="30" r="15" fill="#a8dc92"/><circle cx="72" cy="30" r="15" fill="#a8dc92"/><circle cx="28" cy="30" r="8" fill="#fff"/><circle cx="72" cy="30" r="8" fill="#fff"/><circle cx="28" cy="30" r="4" fill="#5b5675"/><circle cx="72" cy="30" r="4" fill="#5b5675"/>' +
      '<ellipse cx="50" cy="64" rx="38" ry="30" fill="#a8dc92"/><path d="M30 70 q20 16 40 0" fill="none" stroke="#5b8a52" stroke-width="3.5" stroke-linecap="round"/><circle cx="44" cy="56" r="2" fill="#5b8a52"/><circle cx="56" cy="56" r="2" fill="#5b8a52"/>' },
  { id: 'dog', label: 'piesek', glow: '#e6c9a8',
    art: '<ellipse cx="20" cy="46" rx="12" ry="26" fill="#a98467" transform="rotate(12 20 46)"/><ellipse cx="80" cy="46" rx="12" ry="26" fill="#a98467" transform="rotate(-12 80 46)"/>' +
      '<circle cx="50" cy="54" r="34" fill="#e6c9a8"/><ellipse cx="50" cy="66" rx="15" ry="11" fill="#f6e4d2"/><ellipse cx="50" cy="61" rx="6" ry="4" fill="#5b5675"/><circle cx="38" cy="48" r="4" fill="#5b5675"/><circle cx="62" cy="48" r="4" fill="#5b5675"/>' }
];
// Wall / roof / door colour sets; each launch picks two different ones for the big and the small house.
var HOUSE_COLOURS: any = [
  { wall: '#f6c9b0', roof: '#d9b99b', door: '#fbe7c8', glow: '#ffd9a8' },
  { wall: '#cfe3f7', roof: '#b9b3e0', door: '#f4f0ff', glow: '#c9d8ff' },
  { wall: '#cdeccf', roof: '#9fcf9f', door: '#f1fbe9', glow: '#bfe8b8' },
  { wall: '#fbe6a2', roof: '#e8c46a', door: '#fff6d8', glow: '#ffe9a0' },
  { wall: '#f4c6dc', roof: '#d99ab8', door: '#fff0f7', glow: '#f7bcd6' },
  { wall: '#d9cbf2', roof: '#b09ae0', door: '#f6f0ff', glow: '#d6c6ff' }
];
var GLOW_S: any = 2000, NEXT_S: any = 4000, FADE_MS: any = 700;

function animalSvg(t?: any) { return '<svg ' + ATTR + '>' + TYPES[t].art + '</svg>'; }
function houseSvg(wall?: any, roof?: any, door?: any) {
  return '<svg ' + ATTR + '><rect x="10" y="42" width="80" height="50" rx="8" fill="' + wall + '"/>' +
    '<path d="M3 46 L50 8 L97 46 Z" fill="' + roof + '" stroke="' + roof + '" stroke-width="6" stroke-linejoin="round"/>' +
    '<rect x="40" y="58" width="20" height="34" rx="9" fill="' + door + '"/>' +
    '<circle cx="50" cy="29" r="6" fill="#fff" fill-opacity=".7"/></svg>';
}
function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var board: any = document.createElement('div');
  board.className = 'dm';
  board.innerHTML = '<div class="dm-glow"></div><div class="dm-field"></div>';
  container.appendChild(board);
  var field: any = board.querySelector('.dm-field'), glowEl: any = board.querySelector('.dm-glow');

  var fw: any = 0, fh: any = 0, B: any = 96, Sm: any = 48, selected: any = null, round: any = 0;
  var raf: any = 0, last: any = 0, doneT: any = -1, doneGlow: any = 0, fade: any = 1, fadeDir: any = 0, phase: any = 'play';

  var hc: any = Rand.pick(HOUSE_COLOURS, 2), pool: any = Rand.shuffle(TYPES.map(function (_t?: any, i?: any) { return i; }));
  function hs(c?: any) { return houseSvg(c.wall, c.roof, c.door); }
  var houses: any = [
    { size: 'big', label: 'Duży domek', svg: hs(hc[0]), cx: 0, base: 0, w: 0, glow: hc[0].glow },
    { size: 'small', label: 'Mały domek', svg: hs(hc[1]), cx: 0, base: 0, w: 0, glow: hc[1].glow }
  ];
  houses.forEach(function (h?: any) {
    var el: any = document.createElement('button');
    el.type = 'button'; el.className = 'dm-house'; el.setAttribute('aria-label', h.label);
    el.innerHTML = h.svg;
    field.appendChild(el);
    el.addEventListener('click', function () { onHouse(h); });
    h.el = el;
  });
  var items: any = [];
  [0, 1, 2, 3].forEach(function (k?: any) {
    var el: any = document.createElement('button');
    el.type = 'button'; el.className = 'dm-animal';
    el.setAttribute('aria-pressed', 'false');
    field.appendChild(el);
    var it: any = { el: el, big: k < 2, k: k, type: 0, x: 0, y: 0, hx: 0, hy: 0, tx: 0, ty: 0, sz: 0, house: null,
      mode: 'idle', pid: null, dx: 0, dy: 0, placed: false, glow: 0, fx: 0, fy: 0, gt: 0, gd: 1, gx: 0, gy: 0 };
    items.push(it);
    el.addEventListener('pointerdown', function (e?: any) { down(it, e); });
    el.addEventListener('pointermove', function (e?: any) { move(it, e); });
    el.addEventListener('pointerup', function (e?: any) { up(it, e); });
    el.addEventListener('pointercancel', function (e?: any) { up(it, e); });
    el.addEventListener('lostpointercapture', function (e?: any) { up(it, e); });
    el.addEventListener('click', function (e?: any) { if (e.detail === 0) { select(it); } });
  });

  function setRound() {
    var n: any = pool.length, set: any = [pool[(2 * round) % n], pool[(2 * round + 1) % n]];
    items.forEach(function (it?: any) {
      it.type = set[it.k % 2];
      it.el.innerHTML = animalSvg(it.type);
      it.el.setAttribute('aria-label', (it.big ? 'Duży ' : 'Mały ') + TYPES[it.type].label + ' (Enter lub spacja, potem wybierz domek)');
      it.placed = false; it.mode = 'idle'; it.glow = 0;
      if (it.pid !== null) { try { it.el.releasePointerCapture(it.pid); } catch (e: any) { /* released */ } it.pid = null; }
    });
    shuffleRest();
  }
  // Random order of the 4 animals along the bottom row.
  var order: any = [0, 1, 2, 3];
  function shuffleRest() { order = Rand.shuffle(order); }

  function layout() {
    var r: any = field.getBoundingClientRect();
    fw = r.width; fh = r.height;
    B = Math.max(96, Math.min(180, Math.min(fw * 0.28, fh * 0.2)));
    Sm = B / 2;
    var restBottom: any = fh - 4, ground: any = restBottom - B - 14;
    var Hb: any = Math.max(60, Math.min(fw * 0.5, ground)), Hs: any = Hb / 2, gap: any = fw * 0.06;
    var left: any = (fw - (Hb + Hs + gap)) / 2;
    houses[0].w = Hb; houses[0].cx = left + Hb / 2; houses[0].base = ground;
    houses[1].w = Hs; houses[1].cx = left + Hb + gap + Hs / 2; houses[1].base = ground;
    houses.forEach(function (h?: any) {
      h.el.style.width = h.w + 'px'; h.el.style.height = h.w + 'px';
      h.el.style.transform = 'translate(' + (h.cx - h.w / 2) + 'px,' + (h.base - h.w) + 'px)';
    });
    // Resting row: widths in the shuffled order, centred.
    var widths: any = order.map(function (k?: any) { return items[k].big ? B : Sm; });
    var sum: any = widths.reduce(function (a?: any, b?: any) { return a + b; }, 0);
    var g: any = Math.max(4, Math.min(28, (fw * 0.96 - sum) / 3));
    var x: any = (fw - sum - 3 * g) / 2;
    order.forEach(function (k?: any, i?: any) {
      var it: any = items[k]; it.sz = widths[i];
      it.hx = x + it.sz / 2; it.hy = restBottom - it.sz / 2;
      x += it.sz + g;
      it.house = houses[it.big ? 0 : 1];
      var off: any = Math.min(it.sz * 0.5, it.house.w * 0.28) * (it.k % 2 ? 1 : -1);
      it.tx = it.house.cx + off; it.ty = it.house.base - it.sz / 2 - it.house.w * 0.03;
      it.el.style.width = it.sz + 'px'; it.el.style.height = it.sz + 'px';
      if (it.mode === 'drag') { cancelDrag(it); }
      if (it.mode === 'glide') { glideTo(it, it.placed ? it.tx : it.hx, it.placed ? it.ty : it.hy, true); }
      else if (it.placed) { it.x = it.tx; it.y = it.ty; }
      else { it.x = it.hx; it.y = it.hy; }
      place(it);
    });
  }
  function place(it?: any) { it.el.style.transform = 'translate(' + (it.x - it.sz / 2) + 'px,' + (it.y - it.sz / 2) + 'px)'; }
  function paint(it?: any) {
    var g: any = it.glow + doneGlow * 0.5;
    it.el.style.filter = g > 0.01 ? 'drop-shadow(0 0 ' + (6 + 14 * g) + 'px ' + TYPES[it.type].glow + ')' : '';
    it.el.style.opacity = String(fade);
  }
  function paintHouses() {
    houses.forEach(function (h?: any) {
      h.el.style.filter = doneGlow > 0.01 ? 'drop-shadow(0 0 ' + (8 + 22 * doneGlow) + 'px ' + h.glow + ')' : '';
    });
  }

  function glideTo(it?: any, x?: any, y?: any, quick?: any) {
    var d: any = Math.hypot(x - it.x, y - it.y);
    it.fx = it.x; it.fy = it.y; it.gx = x; it.gy = y; it.gt = 0;
    it.gd = quick ? 200 : (reduced() ? 300 : Math.min(1800, 800 + d * 1.0));
    it.mode = 'glide';
    it.el.style.zIndex = '2';
    start();
  }
  function sendHome(it?: any) { it.placed = false; glideTo(it, it.hx, it.hy); }
  function snap(it?: any) { it.placed = true; select(null); glideTo(it, it.tx, it.ty); }

  function cancelDrag(it?: any) {
    if (it.pid !== null) { try { it.el.releasePointerCapture(it.pid); } catch (e: any) { /* already released */ } }
    it.pid = null; it.mode = 'idle'; sendHome(it);
  }
  function down(it?: any, e?: any) {
    if (phase !== 'play' || it.placed || it.pid !== null || (e.button !== undefined && e.button > 0)) { return; }
    var r: any = field.getBoundingClientRect();
    it.pid = e.pointerId; it.mode = 'drag';
    it.dx = it.x - (e.clientX - r.left); it.dy = it.y - (e.clientY - r.top);
    it.el.style.zIndex = '5';
    try { it.el.setPointerCapture(e.pointerId); } catch (err: any) { /* synthetic pointer */ }
    e.preventDefault();
  }
  function move(it?: any, e?: any) {
    if (it.mode !== 'drag' || e.pointerId !== it.pid) { return; }
    var r: any = field.getBoundingClientRect(), h: any = it.sz / 2;
    var px: any = e.clientX - r.left + it.dx, py: any = e.clientY - r.top + it.dy;
    // Keep the centre inside the visible screen so an animal can never be lost off-screen.
    it.x = Math.max(-r.left + h, Math.min(window.innerWidth - r.left - h, px));
    it.y = Math.max(-r.top + h, Math.min(window.innerHeight - r.top - h, py));
    place(it);
  }
  // House under the animal's centre (nearest house centre wins at the edge between them), or null.
  function houseAt(it?: any) {
    var best: any = null, bd: any = 1e9;
    houses.forEach(function (h?: any) {
      var pad: any = h.w * 0.1;
      if (Math.abs(it.x - h.cx) <= h.w / 2 + pad && it.y >= h.base - h.w - pad && it.y <= h.base + pad) {
        var d: any = Math.abs(it.x - h.cx);
        if (d < bd) { bd = d; best = h; }
      }
    });
    return best;
  }
  function up(it?: any, e?: any) {
    if (it.mode !== 'drag' || e.pointerId !== it.pid) { return; }
    try { it.el.releasePointerCapture(it.pid); } catch (err: any) { /* already released */ }
    it.pid = null; it.mode = 'idle';
    if (houseAt(it) === it.house) { snap(it); } else { sendHome(it); }
  }

  function select(it?: any) {
    selected = selected === it ? null : it;
    if (it && it.placed) { selected = null; }
    items.forEach(function (o?: any) {
      var on: any = o === selected;
      o.el.setAttribute('aria-pressed', on ? 'true' : 'false');
      o.el.classList.toggle('dm-selected', on);
    });
  }
  function onHouse(h?: any) {
    if (!selected || selected.mode === 'drag' || phase !== 'play') { return; }
    var it: any = selected;
    select(null);
    if (it.house === h) { snap(it); } else { sendHome(it); }
  }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min(now - last, 50); last = now;
    var busy: any = false;
    items.forEach(function (it?: any) {
      if (it.mode === 'glide') {
        it.gt += dt;
        var k: any = smooth(it.gt / it.gd);
        it.x = it.fx + (it.gx - it.fx) * k; it.y = it.fy + (it.gy - it.fy) * k;
        place(it);
        if (it.gt >= it.gd) { it.mode = 'idle'; it.x = it.gx; it.y = it.gy; place(it); it.el.style.zIndex = ''; }
        else { busy = true; }
      }
      var tg: any = it.placed && it.mode === 'idle' ? 1 : 0;
      if (Math.abs(it.glow - tg) > 0.005) { it.glow += (tg - it.glow) * Math.min(1, dt / 250); busy = true; }
      else { it.glow = tg; }
      it.el.tabIndex = it.placed || phase !== 'play' ? -1 : 0;
      it.el.disabled = it.placed;
    });
    // Round finished: soft glow ~2 s, new round after ~4 s (time only advances while the tab is visible).
    if (phase === 'play' && doneT < 0 && items.every(function (it?: any) { return it.placed && it.mode === 'idle'; })) { doneT = 0; }
    if (doneT >= 0 && phase === 'play') {
      doneT += dt; busy = true;
      if (doneT >= NEXT_S) { phase = 'out'; fadeDir = -1; }
    }
    if (phase === 'out' || phase === 'in') {
      fade += fadeDir * dt / FADE_MS; busy = true;
      if (phase === 'out' && fade <= 0) {
        fade = 0; round++; doneT = -1; setRound(); layout(); phase = 'in'; fadeDir = 1;
      } else if (phase === 'in' && fade >= 1) { fade = 1; phase = 'play'; fadeDir = 0; }
    }
    var tgG: any = doneT >= 0 && doneT < GLOW_S && phase === 'play' ? 1 : 0;
    if (Math.abs(doneGlow - tgG) > 0.005) { doneGlow += (tgG - doneGlow) * Math.min(1, dt / 500); busy = true; }
    else { doneGlow = tgG; }
    glowEl.style.opacity = String(doneGlow);
    items.forEach(paint); paintHouses();
    if (busy) { raf = requestAnimationFrame(frame); }
  }
  function start() {
    if (raf || document.hidden) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }
  function onResize() { layout(); start(); }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  setRound(); layout();
  items.forEach(paint); paintHouses();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (board.parentNode) { board.parentNode.removeChild(board); }
  };
}

export default function DuzeIMaleActivity() {
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
