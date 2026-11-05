// Activity "Ścieżka": drag a finger along a wide curvy path; a small figure follows it slowly to the goal.
// The figure chases the finger's nearest point on the path (only forward, at a capped gentle speed: the whole path
// takes ~7 s); if the finger leaves the path or lifts, it waits. At the goal: soft glow ~3 s, ~4 s later the scene
// fades to the next path (4 paths with 4 figures cycle). One rAF loop (capped dt, stops when idle or hidden) drives
// everything, so it works under prefers-reduced-motion. Nothing is stored. Fixed DOM per scene.
import { useEffect, useRef } from 'react';

var MAXDT: any = 0.05, CROSS: any = 7, GLOW: any = 3, WAIT: any = 4, FADE: any = 0.9;
var PATH_W: any = 68, TOL: any = PATH_W / 2 + 24, WINDOW: any = 0.5, KEY_STEP: any = 0.07;
// Control points in landscape [0..1] coordinates (start -> goal); portrait is the same shape rotated a quarter turn.
var PATHS: any = [
  [[.14, .78], [.3, .8], [.44, .62], [.34, .4], [.5, .22], [.68, .28], [.72, .52], [.88, .6]],
  [[.14, .24], [.34, .2], [.46, .4], [.3, .6], [.48, .8], [.68, .7], [.7, .42], [.88, .26]],
  [[.14, .5], [.28, .26], [.42, .5], [.56, .74], [.7, .5], [.84, .24]],
  [[.14, .8], [.24, .5], [.14, .24], [.4, .2], [.52, .46], [.66, .78], [.86, .5]]
];
var FIGURES: any = [
  // snail
  '<ellipse cx="0" cy="22" rx="30" ry="9" fill="#c9e8b8"/><circle cx="-4" cy="2" r="18" fill="#f3c7a6" stroke="#e4ae88" stroke-width="2"/><path d="M-4 2m-9 0a9 9 0 1 1 9 9a5 5 0 0 1 0-10" fill="none" stroke="#e4ae88" stroke-width="2.5" stroke-linecap="round"/><path d="M12 22q14 0 18-6q2-10-6-10q-6 2-12 16z" fill="#cdbbea"/><path d="M26 10l3-12M30 12l8-9" stroke="#b7a3dc" stroke-width="2.5" stroke-linecap="round"/><circle cx="29" cy="-3" r="2.6" fill="#4a4560"/><circle cx="38" cy="3" r="2.6" fill="#4a4560"/>',
  // car
  '<rect x="-30" y="-2" width="60" height="22" rx="9" fill="#a8d8f0"/><path d="M-16 -2q4-16 14-16h8q10 0 14 16z" fill="#bfe3f5"/><rect x="-10" y="-13" width="9" height="9" rx="2" fill="#fff"/><rect x="2" y="-13" width="9" height="9" rx="2" fill="#fff"/><circle cx="-16" cy="22" r="8" fill="#6f6a8c"/><circle cx="16" cy="22" r="8" fill="#6f6a8c"/><circle cx="-16" cy="22" r="3" fill="#e8e3f5"/><circle cx="16" cy="22" r="3" fill="#e8e3f5"/>',
  // ladybird (soft coral, not red)
  '<ellipse cx="0" cy="22" rx="26" ry="6" fill="#c9e8b8"/><circle cx="26" cy="4" r="10" fill="#5b5675"/><ellipse cx="0" cy="6" rx="26" ry="20" fill="#f8b0a0" stroke="#eb9a89" stroke-width="2"/><path d="M0 -14v40" stroke="#5b5675" stroke-width="2.5"/><g fill="#5b5675"><circle cx="-10" cy="0" r="4"/><circle cx="-8" cy="14" r="3.4"/><circle cx="10" cy="-1" r="4"/><circle cx="9" cy="14" r="3.4"/></g><circle cx="30" cy="2" r="2" fill="#fff"/>',
  // bee
  '<ellipse cx="-4" cy="4" rx="26" ry="17" fill="#ffe08a" stroke="#f3cd66" stroke-width="2"/><path d="M-12 -12q-4 18 0 32M2 -13q-4 18 0 34" fill="none" stroke="#5b5675" stroke-width="5"/><ellipse cx="-6" cy="-18" rx="11" ry="8" fill="#fff" fill-opacity=".85" stroke="#cfe6f5" stroke-width="2"/><circle cx="26" cy="2" r="11" fill="#ffe08a" stroke="#f3cd66" stroke-width="2"/><circle cx="30" cy="-1" r="2.6" fill="#4a4560"/>'
];
var GOALS: any = [
  // pink flower
  '<path d="M0 6v40" stroke="#8fcf9f" stroke-width="5" stroke-linecap="round"/><g fill="#f7b6d2"><circle cx="0" cy="-22" r="14"/><circle cx="21" cy="-7" r="14"/><circle cx="13" cy="17" r="14"/><circle cx="-13" cy="17" r="14"/><circle cx="-21" cy="-7" r="14"/></g><circle cx="0" cy="0" r="12" fill="#ffe9a8"/>',
  // house
  '<rect x="-26" y="-4" width="52" height="38" rx="5" fill="#f6dcc8"/><path d="M-32 -2L0 -30l32 28z" fill="#c9a0c0"/><rect x="-7" y="12" width="14" height="22" rx="3" fill="#fbe7c8"/><rect x="-21" y="4" width="10" height="10" rx="2" fill="#ffe9a8"/><rect x="11" y="4" width="10" height="10" rx="2" fill="#ffe9a8"/>',
  // yellow daisy
  '<path d="M0 6v40" stroke="#8fcf9f" stroke-width="5" stroke-linecap="round"/><g fill="#fff"><circle cx="0" cy="-22" r="12"/><circle cx="21" cy="-7" r="12"/><circle cx="13" cy="17" r="12"/><circle cx="-13" cy="17" r="12"/><circle cx="-21" cy="-7" r="12"/></g><circle cx="0" cy="0" r="13" fill="#ffd98a"/>',
  // blue flower
  '<path d="M0 6v40" stroke="#8fcf9f" stroke-width="5" stroke-linecap="round"/><g fill="#b7c8f2"><circle cx="0" cy="-22" r="14"/><circle cx="21" cy="-7" r="14"/><circle cx="13" cy="17" r="14"/><circle cx="-13" cy="17" r="14"/><circle cx="-21" cy="-7" r="14"/></g><circle cx="0" cy="0" r="12" fill="#ffe9a8"/>'
];
var LABELS: any = ['Ślimaczek', 'Samochodzik', 'Biedronka', 'Pszczółka'];

function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }

// Catmull-Rom through pts (viewBox px) -> dense polyline with cumulative lengths.
function sample(pts?: any) {
  var out: any = [], i: any, j: any, n: any = pts.length;
  for (i = 0; i < n - 1; i++) {
    var p0: any = pts[Math.max(0, i - 1)], p1: any = pts[i], p2: any = pts[i + 1], p3: any = pts[Math.min(n - 1, i + 2)];
    for (j = 0; j < 16; j++) {
      var t: any = j / 16, t2: any = t * t, t3: any = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
      ]);
    }
  }
  out.push(pts[n - 1].slice());
  var cum: any = [0];
  for (i = 1; i < out.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  }
  return { pts: out, cum: cum, len: cum[cum.length - 1] };
}

function geometry(index?: any, portrait?: any) {
  var W: any = portrait ? 300 : 400, H: any = portrait ? 400 : 300;
  var pts: any = PATHS[index % PATHS.length].map(function (p?: any) {
    var x: any = portrait ? p[1] : p[0], y: any = portrait ? 1 - p[0] : p[1];
    return [x * W, y * H];
  });
  var g: any = sample(pts);
  g.W = W; g.H = H;
  return g;
}

// Position on the polyline at arc length s.
function at(g?: any, s?: any) {
  var c: any = g.cum, lo: any = 0, hi: any = c.length - 1;
  if (s <= 0) { return g.pts[0]; }
  if (s >= g.len) { return g.pts[hi]; }
  while (hi - lo > 1) { var m: any = (lo + hi) >> 1; if (c[m] <= s) { lo = m; } else { hi = m; } }
  var f: any = (s - c[lo]) / (c[hi] - c[lo] || 1);
  return [g.pts[lo][0] + (g.pts[hi][0] - g.pts[lo][0]) * f, g.pts[lo][1] + (g.pts[hi][1] - g.pts[lo][1]) * f];
}

// Arc length of the point of the path (within [from, to]) nearest to (x, y), or -1 when farther than TOL.
function nearest(g?: any, x?: any, y?: any, from?: any, to?: any) {
  var best: any = -1, bd: any = TOL * TOL, i: any;
  for (i = 0; i < g.pts.length; i++) {
    if (g.cum[i] < from || g.cum[i] > to) { continue; }
    var dx: any = g.pts[i][0] - x, dy: any = g.pts[i][1] - y, d: any = dx * dx + dy * dy;
    if (d <= bd) { bd = d; best = g.cum[i]; }
  }
  return best;
}

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var root: any = document.createElement('div');
  root.className = 'sc';
  root.innerHTML = '<div class="sc-board" tabindex="0" role="application" ' +
    'aria-label="Ścieżka: przeciągnij palcem po ścieżce albo naciskaj strzałki, Enter lub spację"></div>';
  container.appendChild(root);
  var board: any = root.querySelector('.sc-board');

  var si: any = 0, portrait: any = false, g: any, phase: any = 'play', pt: any = 0, fade: any = 1, glow: any = 0;
  var p: any = 0, target: any = 0, flip: any = 1, pid: any = null;
  var svg: any, trail: any, figEl: any, goalEl: any, glowEl: any, glowAt: any = [0, 0]; void glowAt; void goalEl;

  function build(keepFrac?: any) {
    var frac: any = keepFrac && g ? p / g.len : 0;
    portrait = root.clientHeight > root.clientWidth;
    board.className = 'sc-board' + (portrait ? ' portrait' : '');
    g = geometry(si, portrait);
    var d: any = 'M' + g.pts.map(function (q?: any) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L');
    var end: any = g.pts[g.pts.length - 1], k: any = si % PATHS.length;
    board.innerHTML = '<svg viewBox="0 0 ' + g.W + ' ' + g.H + '" aria-hidden="true" focusable="false">' +
      '<rect width="' + g.W + '" height="' + g.H + '" fill="#e6f3e0"/>' +
      '<circle cx="' + (g.W - 34) + '" cy="30" r="18" fill="#fff0c4"/>' +
      '<path d="' + d + '" fill="none" stroke="#f6e8c8" stroke-width="' + (PATH_W + 10) + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="#fbf3dc" stroke-width="' + PATH_W + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path class="sc-trail" d="' + d + '" fill="none" stroke="#f9d6e4" stroke-width="' + (PATH_W - 14) + '" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0 99999"/>' +
      '<circle class="sc-glow" cx="' + end[0].toFixed(1) + '" cy="' + end[1].toFixed(1) + '" r="52" fill="#fff3b8" opacity="0"/>' +
      '<g class="sc-goal" transform="translate(' + end[0].toFixed(1) + ' ' + end[1].toFixed(1) + ') scale(.85)">' + GOALS[k] + '</g>' +
      '<g class="sc-fig"><g class="sc-flip">' + FIGURES[k] + '</g></g></svg>';
    svg = board.firstChild;
    trail = svg.querySelector('.sc-trail');
    glowEl = svg.querySelector('.sc-glow');
    figEl = svg.querySelector('.sc-fig');
    board.setAttribute('data-figure', LABELS[k]);
    p = frac * g.len; target = p; glow = 0; pid = null;
    place();
  }

  function place() {
    var q: any = at(g, p), a: any = at(g, Math.max(0, p - 6)), b: any = at(g, Math.min(g.len, p + 6));
    var dx: any = b[0] - a[0], n: any = Math.hypot(dx, b[1] - a[1]) || 1;
    if (dx / n > 0.3) { flip = 1; } else if (dx / n < -0.3) { flip = -1; }
    figEl.setAttribute('transform', 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ') scale(' + (0.85 * flip) + ' 0.85)');
    trail.setAttribute('stroke-dasharray', p.toFixed(1) + ' 99999');
    trail.setAttribute('opacity', p > 0.5 ? 1 : 0);
    glowEl.setAttribute('opacity', (glow * 0.9).toFixed(3));
  }

  function toBoard(e?: any) {
    var r: any = board.getBoundingClientRect();
    return [(e.clientX - r.left) * g.W / r.width, (e.clientY - r.top) * g.H / r.height];
  }
  function follow(e?: any) {
    var c: any = toBoard(e), s: any = nearest(g, c[0], c[1], p, Math.min(g.len, p + WINDOW * g.len));
    target = s < 0 ? p : Math.max(p, s);
    return s >= 0;
  }
  board.addEventListener('pointerdown', function (e?: any) {
    if (phase !== 'play' || pid !== null) { return; }
    if (!follow(e)) { target = p; return; }
    pid = e.pointerId;
    try { board.setPointerCapture(pid); } catch (err: any) { /* ignore */ }
    e.preventDefault();
    wake();
  });
  board.addEventListener('pointermove', function (e?: any) {
    if (e.pointerId !== pid || phase !== 'play') { return; }
    follow(e); wake();
  });
  function end(e?: any) {
    if (e.pointerId !== pid) { return; }
    pid = null; target = p;
  }
  board.addEventListener('pointerup', end);
  board.addEventListener('pointercancel', end);
  board.addEventListener('lostpointercapture', end);
  board.addEventListener('keydown', function (e?: any) {
    var k: any = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'ArrowUp' || k === 'ArrowLeft' || k === 'Enter' || k === ' ' || k === 'Spacebar') {
      e.preventDefault();
      if (phase !== 'play') { return; }
      target = Math.min(g.len, Math.max(target, p) + KEY_STEP * g.len);
      wake();
    }
  });

  var raf: any = 0, last: any = 0;
  function frame(now?: any) {
    raf = 0;
    var dt: any = last ? Math.min((now - last) / 1000, MAXDT) : 0;
    last = now;
    var busy: any = false;
    if (phase === 'play') {
      if (p < target) {
        p = Math.min(target, p + g.len / CROSS * dt);
        busy = true;
      } else if (pid !== null) { busy = true; }
      if (p >= g.len - 0.5) { p = g.len; target = g.len; phase = 'glow'; pt = 0; }
    }
    if (phase === 'glow' || phase === 'wait') {
      busy = true; pt += dt;
      if (phase === 'glow') {
        glow = pt < 0.6 ? smooth(pt / 0.6) : pt > GLOW - 0.6 ? smooth((GLOW - pt) / 0.6) : 1;
        if (pt >= GLOW) { phase = 'wait'; pt = 0; glow = 0; }
      } else if (pt >= WAIT) { phase = 'out'; pt = 0; }
    } else if (phase === 'out') {
      busy = true; pt += dt; fade = 1 - smooth(pt / FADE);
      if (pt >= FADE) { si++; build(false); fade = 0; phase = 'in'; pt = 0; }
    } else if (phase === 'in') {
      busy = true; pt += dt; fade = smooth(pt / FADE);
      if (pt >= FADE) { fade = 1; phase = 'play'; busy = false; }
    }
    svg.style.opacity = fade;
    place();
    if (busy && !document.hidden) { raf = requestAnimationFrame(frame); } else { last = 0; }
  }
  function wake() { if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } last = 0; }
    else { wake(); }
  }
  function onResize() {
    var wasPortrait: any = portrait;
    if ((root.clientHeight > root.clientWidth) !== wasPortrait) {
      var f: any = fade;
      build(true); svg.style.opacity = f;
    }
  }
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  build(false);
  wake();

  return function cleanup() {
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function SciezkaActivity() {
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
