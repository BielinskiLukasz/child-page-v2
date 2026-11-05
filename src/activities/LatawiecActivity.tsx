// Activity "Latawiec": a pastel sky and hill, a small animal holding the kite string, a kite with a ribbon tail of 5 bows
// and 3 clouds. Touching/dragging the sky makes the kite follow the finger on a damped spring (speed capped at 110 board
// units/s, so crossing the 400-unit board takes >= 3.6 s). Lifting the finger lets it drift on and settle into a slow
// figure-eight (period 10 s) within ~4 s. The tail replays the kite's earlier path (bow i lags i*0.22 s) as a wave;
// the string is a sagging curve from the animal's paw to the kite. A cloud the kite touches puffs aside and returns once
// the kite has left; touching the animal makes it wave. Nothing is scored or stored.
// Board = fixed 400x300 coordinate space scaled by k = board width / 400; every point is clamped inside it, so the kite
// is always fully on screen, also after an orientation change. One rAF loop (capped dt, paused when the tab is hidden)
// drives everything, so it works under the global prefers-reduced-motion rule. Only the first pointer steers the kite.
import { useEffect, useRef } from 'react';
import { Animals } from '../utils/animals';
import { Rand } from '../utils/rand';

var BW: any = 400, BH: any = 300;
var KX0: any = 28, KX1: any = 372, KY0: any = 36, KY1: any = 140;      // kite centre bounds (kite is ~44 x 56 units)
var VMAX: any = 110, SK: any = 6, SD: any = 4.4;                   // speed cap, spring stiffness, damping
var HA: any = 26, HB: any = 11, HW: any = 2 * Math.PI / 10, SETTLE: any = 4;
var BOWS: any = 5, LAG: any = 0.22, MAX_DT: any = 0.05, WAVE_T: any = 1.6;
var AX: any = 70, AY: any = 234, AS: any = 0.9;                    // animal feet position and scale
var CLOUDS: any = [[84, 52, 1], [236, 38, 0.85], [334, 92, 1.05]];
var BOW_COLS: any = ['#f7a8c9', '#ffd98a', '#a8d8f0', '#c9b8f2', '#9ed8c6'];

function clamp(v?: any, a?: any, b?: any) { return v < a ? a : (v > b ? b : v); }

function cloudSvg() {
  return '<circle cx="-18" cy="4" r="12"/><circle cx="0" cy="-4" r="16"/><circle cx="19" cy="3" r="12"/><rect x="-30" y="4" width="60" height="12" rx="6"/>';
}


// Kite designs, all inside about 44 x 56 units around the centre (the tail hangs from y = 28): outline path + optional detail drawn on top.
var DESIGNS: any = [
  { id: 'diamond', d: 'M0-28L22-4L0 28L-22-4Z', detail: '<path d="M0-28V28M-22-4H22" stroke="#fff" stroke-opacity=".75" stroke-width="2" stroke-linecap="round"/>' },
  { id: 'dragon', d: 'M0-24L7-18L13-22L15-10L23-8L16 0L21 10L11 12L0 28L-11 12L-21 10L-16 0L-23-8L-15-10L-13-22L-7-18Z',
    detail: '<path d="M-6-22L-9-30L-2-24ZM6-22L9-30L2-24Z" fill="#8f7fd1"/><circle cx="-6" cy="-8" r="3.2" fill="#fff"/><circle cx="6" cy="-8" r="3.2" fill="#fff"/><circle cx="-6" cy="-8" r="1.5" fill="#5b5675"/><circle cx="6" cy="-8" r="1.5" fill="#5b5675"/><path d="M-6 4Q0 9 6 4" fill="none" stroke="#5b5675" stroke-width="1.8" stroke-linecap="round"/>' },
  { id: 'plane', d: 'M0-28Q5-22 5-10L5-4L26 10L26 17L5 10L5 20L12 25L12 28L0 25L-12 28L-12 25L-5 20L-5 10L-26 17L-26 10L-5-4L-5-10Q-5-22 0-28Z',
    detail: '<ellipse cx="0" cy="-16" rx="2.4" ry="4" fill="#fff" fill-opacity=".85"/>' },
  { id: 'butterfly', d: 'M0-6Q-8-30-22-24Q-26-6-3 0Q-24 6-16 22Q-6 26 0 8Q6 26 16 22Q24 6 3 0Q26-6 22-24Q8-30 0-6Z',
    detail: '<path d="M0-8V14" stroke="#8f7fd1" stroke-width="3" stroke-linecap="round"/><path d="M0-8Q-4-16-8-18M0-8Q4-16 8-18" fill="none" stroke="#8f7fd1" stroke-width="1.4" stroke-linecap="round"/>' },
  { id: 'star', d: 'M0-28L7-9L26-9L11 3L17 24L0 12L-17 24L-11 3L-26-9L-7-9Z', detail: '' },
  { id: 'heart', d: 'M0 28C-30 6-26-16-12-18C-5-19 0-14 0-10C0-14 5-19 12-18C26-16 30 6 0 28Z', detail: '' }
];
// Colour sets: [main, second, third]; patterns lay the second / third colour over the main one.
var PALETTES: any = [['#f7a8c9', '#ffd98a', '#a8d8f0'], ['#a8d8f0', '#fdfbff', '#f7a8c9'], ['#bfe6b4', '#ffd98a', '#c9b8f2'], ['#ffd98a', '#f7a8c9', '#9ed8c6'], ['#c9b8f2', '#a8d8f0', '#ffd98a']];
var PATTERNS: any = ['plain', 'quarters', 'stripes', 'dots'];

function kiteSvg(design?: any, pal?: any, pattern?: any) {
  var over: any = '';
  if (pattern === 'quarters') { over = '<g fill="' + pal[1] + '"><rect x="0" y="-32" width="32" height="32"/><rect x="-32" y="0" width="32" height="32"/></g>'; }
  else if (pattern === 'stripes') { over = '<g fill="' + pal[1] + '"><rect x="-32" y="-18" width="64" height="7"/><rect x="-32" y="-2" width="64" height="7"/><rect x="-32" y="14" width="64" height="7"/></g>'; }
  else if (pattern === 'dots') { over = '<g fill="' + pal[2] + '"><circle cx="-9" cy="-6" r="3.6"/><circle cx="9" cy="-6" r="3.6"/><circle cx="0" cy="8" r="3.6"/><circle cx="0" cy="-18" r="3"/><circle cx="-12" cy="14" r="3"/><circle cx="12" cy="14" r="3"/></g>'; }
  return '<clipPath id="lw-kclip"><path d="' + design.d + '"/></clipPath>' +
    '<path d="' + design.d + '" fill="' + pal[0] + '"/><g clip-path="url(#lw-kclip)">' + over + '</g>' + design.detail +
    '<path d="' + design.d + '" fill="none" stroke="#8f7fd1" stroke-width="2" stroke-linejoin="round"/>';
}

function scene(def?: any, kite?: any) {
  var fur: any = def.fur;
  var clouds: any = '';
  CLOUDS.forEach(function (c?: any, _i?: any) { clouds += '<g class="lw-cloud" fill="#fff" fill-opacity=".92" transform="translate(' + c[0] + ' ' + c[1] + ')">' + cloudSvg() + '</g>'; });
  var bows: any = '';
  for (var i: any = 0; i < BOWS; i++) {
    bows += '<path class="lw-bow" fill="' + BOW_COLS[i] + '" d="M0 0L-9-6L-9 6zM0 0L9-6L9 6z"/>';
  }
  return '<defs><linearGradient id="lw-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfeaf8"/><stop offset="1" stop-color="#f3f7e6"/></linearGradient></defs>' +
    '<rect width="400" height="300" fill="url(#lw-sky)"/>' +
    '<circle cx="360" cy="30" r="14" fill="#ffe9a8"/>' + clouds +
    '<path d="M0 250Q90 205 200 232T400 225V300H0z" fill="#c8e6b6"/>' +
    '<path d="M0 272Q120 250 240 268T400 262V300H0z" fill="#b3d9a3"/>' +
    '<g fill="#a9d98f"><path d="M300 262q-3-10 0-14M305 262q1-9 5-12M310 262q4-8 9-9"/></g>' +
    '<g class="lw-animal" transform="translate(' + AX + ' ' + AY + ') scale(' + AS + ')">' +
    '<ellipse cx="-9" cy="-3" rx="6" ry="3.5" fill="' + fur + '"/><ellipse cx="9" cy="-3" rx="6" ry="3.5" fill="' + fur + '"/>' +
    '<g transform="translate(0,-36) scale(.85)">' + Animals.head(def.id, { body: true }) + '</g>' +
    '<circle cx="-21" cy="-14" r="5" fill="' + fur + '"/><circle class="lw-paw" cx="21" cy="-14" r="5" fill="' + fur + '"/></g>' +
    '<path class="lw-string" d="M0 0" fill="none" stroke="#8f7fd1" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path class="lw-tail" d="M0 0" fill="none" stroke="#8f7fd1" stroke-width="1.6" stroke-linecap="round"/>' + bows +
    '<g class="lw-kite">' + kite + '</g>';
}

function mount(container: HTMLElement) {
  var def: any = Animals.pick(1)[0];       // a new animal on every launch
  // One random kite per launch: design x colour set x pattern (nothing stored)
  var design: any = Rand.pickOne(DESIGNS, 'latawiec-design'), palette: any = Rand.pickOne(PALETTES, 'latawiec-colours'),
    pattern: any = Rand.pickOne(PATTERNS, 'latawiec-pattern');
  var root: any = document.createElement('div');
  root.className = 'lw';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Latawiec');
  root.innerHTML = '<div class="lw-board"><svg class="lw-bg" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + scene(def, kiteSvg(design, palette, pattern)) + '</svg>' +
    '<button type="button" class="lw-an" aria-label="' + def.name + ' – pomachaj"></button>' +
    '<button type="button" class="lw-kb" aria-label="Latawiec – strzałki przesuwają latawiec"></button></div>';
  container.appendChild(root);

  var board: any = root.querySelector('.lw-board');
  var an: any = root.querySelector('.lw-an');
  var kb: any = root.querySelector('.lw-kb');
  var kiteG: any = root.querySelector('.lw-kite');
  var stringP: any = root.querySelector('.lw-string');
  var tailP: any = root.querySelector('.lw-tail');
  var bowEls: any = root.querySelectorAll('.lw-bow');
  var paw: any = root.querySelector('.lw-paw');
  var cloudEls: any = root.querySelectorAll('.lw-cloud');
  var k: any = 1, rect: any = null;
  var x: any = 200, y: any = 80, vx: any = 0, vy: any = 0, tilt: any = 0;
  var cx: any = 200, cy: any = 80, th: any = 0, tFree: any = SETTLE;       // hover centre, figure-eight phase, time since release
  var dragging: any = false, pid: any = null, tx: any = 200, ty: any = 80;
  var time: any = 0, waveT: any = 0, hist: any = [];
  var clouds: any = CLOUDS.map(function () { return { ox: 0, side: 0, away: false, pulse: 0 }; });
  var raf: any = 0, last: any = 0;

  function toUnits(e?: any) {
    rect = board.getBoundingClientRect();
    var s: any = rect.width / BW || 1;
    return [(e.clientX - rect.left) / s, (e.clientY - rect.top) / s];
  }
  function steer(e?: any) {
    var p: any = toUnits(e);
    tx = clamp(p[0], KX0, KX1); ty = clamp(p[1], KY0, KY1);
  }
  function onDown(e?: any) {
    if (pid !== null || (e.target.closest && e.target.closest('.lw-an'))) { return; }
    pid = e.pointerId; dragging = true; steer(e);
  }
  function onMove(e?: any) { if (dragging && e.pointerId === pid) { steer(e); } }
  function release() {
    dragging = false; pid = null;
    cx = clamp(x + vx * 0.5, KX0 + HA, KX1 - HA);
    cy = clamp(y + vy * 0.5, KY0 + HB, KY1 - HB);
    tFree = 0;
  }
  function onUp(e?: any) { if (dragging && e.pointerId === pid) { release(); } }
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);
  an.addEventListener('click', function () { waveT = WAVE_T; start(); });
  kb.addEventListener('keydown', function (e?: any) {
    var dx: any = e.key === 'ArrowLeft' ? -50 : (e.key === 'ArrowRight' ? 50 : 0);
    var dy: any = e.key === 'ArrowUp' ? -35 : (e.key === 'ArrowDown' ? 35 : 0);
    if (!dx && !dy) { return; }
    e.preventDefault();
    if (dragging) { return; }
    cx = clamp(cx + dx, KX0 + HA, KX1 - HA); cy = clamp(cy + dy, KY0 + HB, KY1 - HB);
    tFree = 0; start();
  });

  function histAt(t?: any) {
    var i: any = hist.length - 1;
    if (i < 0) { return [x, y]; }
    while (i > 0 && hist[i].t > t) { i--; }
    var a: any = hist[i], b: any = hist[Math.min(i + 1, hist.length - 1)];
    var u: any = b.t > a.t ? clamp((t - a.t) / (b.t - a.t), 0, 1) : 0;
    return [a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u];
  }

  function frame(now?: any) {
    var dt: any = Math.min((now - last) / 1000, MAX_DT), i: any;
    last = now; time += dt;
    var gx: any, gy: any;
    if (dragging) { gx = tx; gy = ty; }
    else {
      tFree += dt; th += HW * dt;
      var r: any = clamp(tFree / SETTLE, 0, 1); r = r * r * (3 - 2 * r);
      gx = cx + r * HA * Math.sin(th); gy = cy + r * HB * Math.sin(2 * th);
    }
    vx += (SK * (gx - x) - SD * vx) * dt;
    vy += (SK * (gy - y) - SD * vy) * dt;
    var sp: any = Math.sqrt(vx * vx + vy * vy);
    if (sp > VMAX) { vx *= VMAX / sp; vy *= VMAX / sp; }
    x += vx * dt; y += vy * dt;
    if (x < KX0 || x > KX1) { x = clamp(x, KX0, KX1); vx = 0; }
    if (y < KY0 || y > KY1) { y = clamp(y, KY0, KY1); vy = 0; }
    tilt += (clamp(vx * 0.2, -18, 18) + 3 * Math.sin(time * 0.9) - tilt) * (1 - Math.exp(-3 * dt));

    hist.push({ t: time, x: x, y: y });
    while (hist.length > 2 && hist[1].t < time - (BOWS * LAG + 0.5)) { hist.shift(); }

    for (i = 0; i < clouds.length; i++) {
      var c: any = clouds[i], cb: any = CLOUDS[i];
      var dx: any = x - (cb[0] + c.ox), dy: any = y - cb[1];
      var d: any = Math.sqrt(dx * dx + dy * dy);
      if (!c.away && d < 46 * cb[2]) { c.away = true; c.side = dx > 0 ? -1 : 1; c.pulse = 1; }
      else if (c.away && Math.abs(x - cb[0]) > 100) { c.away = false; }
      var want: any = c.away ? c.side * 46 : 0;
      want = clamp(cb[0] + want, 40, 360) - cb[0];
      c.ox += (want - c.ox) * (1 - Math.exp(-1.6 * dt));
      c.pulse = Math.max(0, c.pulse - dt / 1.2);
    }
    if (waveT > 0) { waveT = Math.max(0, waveT - dt); }
    paint();
    raf = requestAnimationFrame(frame);
  }

  function paint() {
    var i: any;
    kiteG.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + tilt.toFixed(1) + ')');
    var hx: any = AX - 21 * AS, hy: any = AY - 14 * AS;
    var mx: any = (hx + x) / 2, my: any = (hy + y) / 2 + 20;
    stringP.setAttribute('d', 'M' + hx.toFixed(1) + ' ' + hy.toFixed(1) + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1));
    var pts: any = [[x, y + 28]], p: any, h: any;
    for (i = 1; i <= BOWS; i++) {
      h = histAt(time - i * LAG);
      p = [x + (h[0] - x) + 4 * (i / BOWS) * Math.sin(time * 2.2 - i * 0.9), y + 28 + i * 15 + (h[1] - y)];
      pts.push([clamp(p[0], 8, BW - 8), clamp(p[1], 8, BH - 8)]);
    }
    var d: any = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (i = 1; i < pts.length - 1; i++) {
      d += 'Q' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ' + ((pts[i][0] + pts[i + 1][0]) / 2).toFixed(1) + ' ' + ((pts[i][1] + pts[i + 1][1]) / 2).toFixed(1);
    }
    d += 'L' + pts[pts.length - 1][0].toFixed(1) + ' ' + pts[pts.length - 1][1].toFixed(1);
    tailP.setAttribute('d', d);
    for (i = 1; i < pts.length; i++) {
      var ang: any = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]) * 180 / Math.PI + 90;
      bowEls[i - 1].setAttribute('transform', 'translate(' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ') rotate(' + ang.toFixed(1) + ')');
    }
    for (i = 0; i < cloudEls.length; i++) {
      var sc: any = CLOUDS[i][2] * (1 + 0.1 * Math.sin(Math.PI * (1 - clouds[i].pulse)) * (clouds[i].pulse > 0 ? 1 : 0));
      cloudEls[i].setAttribute('transform', 'translate(' + (CLOUDS[i][0] + clouds[i].ox).toFixed(1) + ' ' + CLOUDS[i][1] + ') scale(' + sc.toFixed(3) + ')');
    }
    if (waveT > 0) {
      var u: any = (WAVE_T - waveT) / WAVE_T, env: any = Math.sin(Math.PI * Math.min(1, u * 1.15)), ang2: any = Math.sin(u * Math.PI * 6);
      paw.setAttribute('cx', (21 + 3 * ang2 * env).toFixed(1)); paw.setAttribute('cy', (-14 - 22 * env).toFixed(1));
    } else { paw.setAttribute('cx', '21'); paw.setAttribute('cy', '-14'); }
    var s: any = k, bs: any = Math.max(56, 56 * s);
    kb.style.width = bs + 'px'; kb.style.height = bs + 'px';
    kb.style.transform = 'translate(' + (x * s - bs / 2).toFixed(1) + 'px,' + (y * s - bs / 2).toFixed(1) + 'px)';
  }

  function layout() {
    var w: any = board.clientWidth || window.innerWidth;
    k = w / BW;
    var bw: any = Math.max(56, 60 * k), bh: any = Math.max(56, 64 * k);
    an.style.width = bw.toFixed(1) + 'px'; an.style.height = bh.toFixed(1) + 'px';
    an.style.left = (AX * k - bw / 2).toFixed(1) + 'px';
    an.style.top = (AY * k - bh).toFixed(1) + 'px';
    paint();
  }

  function start() {
    if (raf || document.hidden) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }
  function onResize() { layout(); }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  layout();
  start();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function LatawiecActivity() {
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
