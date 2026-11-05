// Activity "Wzorki": a string of 4 beads in a simple repeating pattern and an empty slot; two big choices below.
// The correct bead glides into the slot with a soft glow; the other one only wobbles gently and stays available.
// After 3 correct beads (7 on the string) the whole string glows ~2s, ~4s later a new pattern cross-fades in.
// Beads differ by shape and inner mark as well as colour. One rAF loop (capped dt, stops when idle or hidden)
// drives everything, so it works under prefers-reduced-motion. Nothing is stored. Fixed DOM: 7 beads, 2 choices.
import { useEffect, useRef } from 'react';
import { Rand } from '../utils/rand';

var MAXDT: any = 0.05, GLIDE: any = 0.8, GLOW: any = 2, WAIT: any = 4, FADE: any = 0.9, WOB: any = 0.55, N: any = 7, GIVEN: any = 4;
var NS: any = 'http://www.w3.org/2000/svg';
var STAR: any = (function () {
  var p: any = [], i: any, a: any, r: any;
  for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; r = i % 2 ? 19 : 42; p.push((50 + r * Math.cos(a)).toFixed(1) + ',' + (50 + r * Math.sin(a)).toFixed(1)); }
  return p.join(' ');
})();
// shape + inner mark + colour, so beads are told apart without colour
var TYPES: any = [
  { label: 'Różowe kółko', svg: '<circle cx="50" cy="50" r="40" fill="#f7a8c9" stroke="#e68fb4" stroke-width="3"/><circle cx="50" cy="50" r="11" fill="#fff" opacity=".85"/>' },
  { label: 'Niebieski kwadrat', svg: '<rect x="12" y="12" width="76" height="76" rx="16" fill="#a8d8f0" stroke="#8cc4e2" stroke-width="3"/><path d="M26 40h48M26 60h48" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".85"/>' },
  { label: 'Żółta gwiazdka', svg: '<polygon points="' + STAR + '" fill="#ffd98a" stroke="#f3c26a" stroke-width="3" stroke-linejoin="round"/>' },
  { label: 'Zielony romb', svg: '<path d="M50 8L92 50L50 92L8 50z" fill="#9ed8c6" stroke="#7dc4ae" stroke-width="3" stroke-linejoin="round"/><path d="M50 32L68 50L50 68L32 50z" fill="#fff" opacity=".8"/>' }
];
// symbols of the repeating pattern (12 sets): ABAB, AABAAB, ABCABC, ABBABB, AABB, ABCC, ABCD, AABC, ABBC, ABAC, AAAB, ABCB
var PATTERNS: any = [[0, 1], [0, 0, 1], [0, 1, 2], [0, 1, 1], [0, 0, 1, 1], [0, 1, 2, 2],
  [0, 1, 2, 3], [0, 0, 1, 2], [0, 1, 1, 2], [0, 1, 0, 2], [0, 0, 0, 1], [0, 1, 2, 1]];

function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function el(name?: any, attrs?: any, parent?: any) {
  var e: any = document.createElementNS(NS, name), k: any;
  for (k in attrs) { e.setAttribute(k, attrs[k]); }
  if (parent) { parent.appendChild(e); }
  return e;
}

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var root: any = document.createElement('div');
  root.className = 'wz';
  root.innerHTML = '<div class="wz-field"><svg class="wz-svg" aria-hidden="true" focusable="false"></svg>' +
    '<button type="button" class="wz-btn"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"></svg></button>' +
    '<button type="button" class="wz-btn"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"></svg></button></div>';
  container.appendChild(root);
  var field: any = root.firstChild, svg: any = field.firstChild, btns: any = [field.children[1], field.children[2]];

  var lines: any = [el('polyline', { fill: 'none', stroke: '#d9d0ee', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg),
    el('polyline', { fill: 'none', stroke: '#d9d0ee', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg)];
  var ring: any = el('circle', { fill: '#fff', 'fill-opacity': '.6', stroke: '#c9bde8', 'stroke-width': 3, 'stroke-dasharray': '6 7' }, svg);
  var beads: any = [], i: any;
  for (i = 0; i < N; i++) {
    var g: any = el('g', { opacity: 0 }, svg);
    var gl: any = el('circle', { cx: 50, cy: 50, r: 52, fill: '#fff3b8', opacity: 0 }, g);
    var body: any = el('g', {}, g);
    beads.push({ g: g, gl: gl, body: body, glow: 0 });
  }

  // sets in a fresh random order on every launch; each set once before any repeats (in memory only)
  var order: any = [], round: any = 0, seq: any = [], correct: any = 0, other: any = 0, side: any = 0, lastSides: any = [];
  var filled: any = GIVEN, phase: any = 'in', pt: any = 0, fade: any = 0, allGlow: any = 0, cf: any = 1, cfOn: any = false;
  var wob: any = [-1, -1], glide: any = null, lay: any = null, shown: any = [-1, -1], shownB: any = []; void shownB; void shown;

  function nextSet() {
    if (round % PATTERNS.length === 0) {
      var prev: any = order.length ? order[order.length - 1] : -1, idx: any = [], q: any;
      for (q = 0; q < PATTERNS.length; q++) { idx.push(q); }
      order = Rand.shuffle(idx);
      if (order[0] === prev) { q = order[0]; order[0] = order[order.length - 1]; order[order.length - 1] = q; }
    }
    return PATTERNS[order[round % PATTERNS.length]];
  }
  function paintBody(b?: any, type?: any) { b.body.innerHTML = TYPES[type].svg; }

  function chooseSide() {
    var s: any = Math.random() < 0.5 ? 0 : 1, n: any = lastSides.length;
    if (n >= 2 && lastSides[n - 1] === lastSides[n - 2]) { s = 1 - lastSides[n - 1]; }
    lastSides.push(s); if (lastSides.length > 3) { lastSides.shift(); }
    return s;
  }
  function newChoices() {
    var t: any = seq[filled];
    correct = t;
    other = (t + 1 + Math.floor(Math.random() * 3)) % 4;
    side = chooseSide();
    var types: any = [0, 0];
    types[side] = correct; types[1 - side] = other;
    for (var k: any = 0; k < 2; k++) {
      btns[k].querySelector('svg').innerHTML = TYPES[types[k]].svg;
      btns[k].setAttribute('aria-label', TYPES[types[k]].label);
      btns[k].dataset.type = types[k];
    }
    wob[0] = wob[1] = -1; cf = 0; cfOn = true;
  }
  function build() {
    var pat: any = nextSet(), k: any;
    seq = [];
    for (k = 0; k < N; k++) { seq.push(pat[k % pat.length]); }
    filled = GIVEN; glide = null; allGlow = 0;
    for (k = 0; k < N; k++) { beads[k].glow = 0; paintBody(beads[k], seq[k]); }
    newChoices();
    btns[0].disabled = btns[1].disabled = false;
  }

  function layout() {
    var W: any = field.clientWidth, H: any = field.clientHeight, S: any, single: any, cs: any;
    if (!W || !H) { return; }
    cs = Math.max(56, Math.min(H * 0.26, W * 0.3, 132));
    var topH: any = H - cs - 40;
    var S1: any = Math.min((W - 24) / 7.6, topH * 0.6, 110);
    single = S1 >= 62;
    S = single ? S1 : Math.max(56, Math.min((W - 24) / 4.5, (topH - 8) / 2.5, 110));
    var pos: any = [], rows: any = single ? 1 : 2, gap: any = S * 1.1;
    var blockH: any = rows === 1 ? S : S * 2.15, y0: any = Math.max(S / 2 + 4, (topH - blockH) / 2 + S / 2), k: any;
    for (k = 0; k < N; k++) {
      if (single) { pos.push([W / 2 + (k - 3) * gap, y0]); }
      else if (k < 4) { pos.push([W / 2 + (k - 1.5) * gap, y0]); }
      else { pos.push([W / 2 + (k - 5) * gap, y0 + S * 1.15]); }
    }
    var cy: any = H - cs / 2 - 14, off: any = cs * 0.78;
    lay = { W: W, H: H, S: S, single: single, pos: pos, cs: cs, cpos: [[W / 2 - off, cy], [W / 2 + off, cy]] };
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var pts: any = function (a?: any, b?: any) { var s: any = []; for (var q: any = a; q <= b; q++) { s.push(pos[q][0].toFixed(1) + ',' + pos[q][1].toFixed(1)); } return s.join(' '); };
    lines[0].setAttribute('points', single ? pts(0, N - 1) : pts(0, 3));
    lines[1].setAttribute('points', single ? '' : pts(4, N - 1));
    ring.setAttribute('r', S * 0.4);
    for (k = 0; k < 2; k++) {
      btns[k].style.width = btns[k].style.height = cs + 'px';
      btns[k].style.left = (lay.cpos[k][0] - cs / 2) + 'px';
      btns[k].style.top = (lay.cpos[k][1] - cs / 2) + 'px';
    }
  }

  function render() {
    if (!lay) { return; }
    var k: any, S: any = lay.S, sc: any = S / 100 * 0.9;
    field.style.opacity = fade;
    for (k = 0; k < N; k++) {
      var b: any = beads[k], x: any = lay.pos[k][0], y: any = lay.pos[k][1], vis: any = k < filled ? 1 : 0, gs: any = 1;
      if (glide && glide.idx === k) {
        var p: any = smooth(glide.t / GLIDE), c: any = lay.cpos[side];
        x = c[0] + (x - c[0]) * p; y = c[1] + (y - c[1]) * p - Math.sin(Math.PI * p) * S * 0.25;
        gs = (lay.cs / S) + (1 - lay.cs / S) * p; vis = 1;
      }
      b.g.setAttribute('opacity', vis);
      b.g.setAttribute('transform', 'translate(' + (x - 50 * sc * gs).toFixed(1) + ',' + (y - 50 * sc * gs).toFixed(1) + ') scale(' + (sc * gs).toFixed(3) + ')');
      b.gl.setAttribute('opacity', (Math.min(1, b.glow + allGlow) * 0.9).toFixed(3));
    }
    if (filled < N) {
      ring.setAttribute('cx', lay.pos[filled][0]); ring.setAttribute('cy', lay.pos[filled][1]);
      ring.setAttribute('opacity', glide ? 0 : 1);
    } else { ring.setAttribute('opacity', 0); }
    var show: any = (phase === 'play' || phase === 'glide') && cfOn ? smooth(cf) : 0;
    for (k = 0; k < 2; k++) {
      var w: any = wob[k] >= 0 ? Math.sin(wob[k] / WOB * Math.PI * 4) * (1 - wob[k] / WOB) * 9 : 0;
      btns[k].style.opacity = show;
      btns[k].style.visibility = show > 0 ? 'visible' : 'hidden';
      btns[k].style.transform = 'rotate(' + w.toFixed(2) + 'deg)';
    }
  }

  function onChoice(k?: any) {
    if (phase !== 'play' || cf < 1 || btns[k].disabled) { return; }
    if (Number(btns[k].dataset.type) === correct && k === side) {
      phase = 'glide'; glide = { idx: filled, t: 0 };
    } else if (wob[k] < 0) { wob[k] = 0; }
    wake();
  }
  btns[0].addEventListener('click', function () { onChoice(0); });
  btns[1].addEventListener('click', function () { onChoice(1); });

  var raf: any = 0, last: any = 0;
  function frame(now?: any) {
    raf = 0;
    var dt: any = last ? Math.min((now - last) / 1000, MAXDT) : 0, k: any, busy: any = false;
    last = now;
    for (k = 0; k < N; k++) { if (beads[k].glow > 0) { beads[k].glow = Math.max(0, beads[k].glow - dt / 1.4); busy = true; } }
    for (k = 0; k < 2; k++) { if (wob[k] >= 0) { wob[k] += dt; busy = true; if (wob[k] >= WOB) { wob[k] = -1; } } }
    if (cfOn && cf < 1) { cf = Math.min(1, cf + dt / 0.5); busy = true; }
    if (phase === 'glide') {
      glide.t += dt; busy = true;
      if (glide.t >= GLIDE) {
        beads[glide.idx].glow = 1; filled++; glide = null;
        if (filled >= N) {
          phase = 'glow'; pt = 0; btns[0].disabled = btns[1].disabled = true;
        } else { phase = 'play'; newChoices(); }
      }
    } else if (phase === 'glow' || phase === 'wait') {
      pt += dt; busy = true;
      if (phase === 'glow') {
        allGlow = pt < 0.5 ? smooth(pt / 0.5) : pt > GLOW - 0.5 ? smooth((GLOW - pt) / 0.5) : 1;
        if (pt >= GLOW) { phase = 'wait'; pt = 0; allGlow = 0; }
      } else if (pt >= WAIT) { phase = 'out'; pt = 0; }
    } else if (phase === 'out') {
      pt += dt; busy = true; fade = 1 - smooth(pt / FADE);
      if (pt >= FADE) { round++; build(); fade = 0; phase = 'in'; pt = 0; }
    } else if (phase === 'in') {
      pt += dt; busy = true; fade = smooth(pt / FADE);
      if (pt >= FADE) { fade = 1; phase = 'play'; }
    }
    render();
    if (busy && !document.hidden) { raf = requestAnimationFrame(frame); } else { last = 0; }
  }
  function wake() { if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } last = 0; } else { wake(); }
  }
  function onResize() { layout(); render(); }
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  build();
  layout();
  render();
  wake();

  return function cleanup() {
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function WzorkiActivity() {
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
