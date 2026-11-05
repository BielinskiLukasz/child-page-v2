// Activity "Kolorowe Kształty": drag soft shapes onto their matching outlines; starts as 2x2, becomes 3x3 after 3
// completed layouts (per launch, nothing stored). Each layout draws fresh shapes, colours (unique) and positions. No wrong answers:
// a shape released anywhere else drifts back. One rAF loop (works under prefers-reduced-motion, pauses
// when the tab is hidden, stops when idle); DOM rebuilt for every layout. Portrait: outline grid above shape grid; landscape: side by side.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';
import { Rand } from '../utils/rand';

var SHAPES: any = [
  { id: 'circle', label: 'kółko', color: '#f7a8c9', glow: '#f7a8c9',
    path: '<circle cx="50" cy="50" r="40" fill="FILL" stroke="STROKE" stroke-width="SW" stroke-linejoin="round"/>' },
  { id: 'square', label: 'kwadrat', color: '#a8d8f0', glow: '#8cc8ea',
    path: '<rect x="12" y="12" width="76" height="76" rx="18" fill="FILL" stroke="STROKE" stroke-width="SW" stroke-linejoin="round"/>' },
  { id: 'triangle', label: 'trójkąt', color: '#ffd98a', glow: '#ffcf66',
    path: '<path d="M50 16 L86 80 L14 80 Z" fill="FILL" stroke="STROKE" stroke-width="SW" stroke-linejoin="round"/>' },
  { id: 'star', label: 'gwiazdka', color: '#fff0a0', glow: '#ffe66b',
    path: '<path d="M50 10 L61 38 L91 38 L67 56 L76 87 L50 69 L24 87 L33 56 L9 38 L39 38 Z" fill="FILL" stroke="STROKE" stroke-width="SW" stroke-linejoin="round"/>' },
  { id: 'heart', label: 'serduszko', color: '#f7b0b8', glow: '#f58f9c',
    path: '<path d="M50 84 C14 58 10 34 28 24 C40 18 48 26 50 34 C52 26 60 18 72 24 C90 34 86 58 50 84 Z" fill="FILL" stroke="STROKE" stroke-width="SW" stroke-linejoin="round"/>' },
  { id: 'diamond', label: 'romb', color: '#c9b8f2', glow: '#b39cf0',
    path: '<path d="M50 8 L88 50 L50 92 L12 50 Z" fill="FILL" stroke="STROKE" stroke-width="SW" stroke-linejoin="round"/>' },
  { id: 'hexagon', label: 'sześciokąt', color: '#bfe6b4', glow: '#9fd990',
    path: '<path d="M50 10 L84 30 L84 70 L50 90 L16 70 L16 30 Z" fill="FILL" stroke="STROKE" stroke-width="SW" stroke-linejoin="round"/>' },
  { id: 'oval', label: 'owal', color: '#ffc9a0', glow: '#ffb27a',
    path: '<ellipse cx="50" cy="50" rx="42" ry="28" fill="FILL" stroke="STROKE" stroke-width="SW" stroke-linejoin="round"/>' },
  { id: 'plus', label: 'krzyżyk', color: '#a8e0d6', glow: '#82d2c4',
    path: '<path d="M38 12 H62 V38 H88 V62 H62 V88 H38 V62 H12 V38 H38 Z" fill="FILL" stroke="STROKE" stroke-width="SW" stroke-linejoin="round"/>' }
];
// The nine existing colours (with a soft glow each), independent of the shape they are paired with.
var COLORS: any = SHAPES.map(function (d?: any) { return { color: d.color, glow: d.glow }; });
var WIN_AFTER: any = 3; // completed 2x2 layouts before the grid becomes 3x3
var RETURN_AFTER: any = 4000, SVGNS: any = 'viewBox="0 0 100 100" aria-hidden="true" focusable="false"';

function shapeSvg(def?: any, outline?: any) {
  var p: any = def.path.replace('FILL', outline ? 'rgba(255,255,255,.55)' : def.color)
    .replace('STROKE', def.color).replace('SW', outline ? '4' : '12');
  if (outline) { p = p.replace('<', '<g stroke-dasharray="3 8" stroke-linecap="round" opacity=".9"><').replace('/>', '/></g>'); }
  return '<svg ' + SVGNS + '>' + p + '</svg>';
}
function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var board: any = document.createElement('div');
  board.className = 'ks';
  board.innerHTML = '<div class="ks-glow"></div><div class="ks-field"></div>';
  container.appendChild(board);
  var field: any = board.querySelector('.ks-field'), glowEl: any = board.querySelector('.ks-glow');

  var S: any = 96, fw: any = 0, fh: any = 0, items: any = [], defs: any = [], selected: any = null, g: any = 2, completed: any = 0;
  var raf: any = 0, last: any = 0, doneT: any = -1, doneGlow: any = 0, doneActive: any = false;

  // Fresh layout: g*g unique shapes, g*g unique colours, random pairing; outlines and shapes both in random slots,
  // and no shape starts at its own outline's slot, so the match is a real (but gentle) choice.
  function newRound() {
    var n: any = g * g, i: any; void i;
    items.forEach(function (it?: any) { field.removeChild(it.el); });
    defs.forEach(function (def?: any) { field.removeChild(def.outlineEl); });
    selected = null; doneActive = false; doneT = -1;
    Analytics.levelStart(n);
    var shp: any = Rand.pick(SHAPES, n), col: any = Rand.pick(COLORS, n);
    defs = shp.map(function (sh?: any, k?: any) {
      return { id: sh.id, label: sh.label, path: sh.path, color: col[k].color, glow: col[k].glow };
    });
    var order: any;
    do { order = Rand.shuffle(defs.map(function (_d?: any, k?: any) { return k; })); }
    while (order.some(function (v?: any, k?: any) { return v === k; }));
    items = [];
    defs.forEach(function (def?: any, i?: any) {
      var o: any = document.createElement('button');
      o.type = 'button'; o.className = 'ks-item ks-outline';
      o.setAttribute('aria-label', 'Miejsce na ' + def.label);
      o.innerHTML = shapeSvg(def, true);
      field.appendChild(o);
      o.addEventListener('click', function () { onOutline(def); });
      def.outlineEl = o; def.index = i;
    });
    defs.forEach(function (def?: any, k?: any) {
      var el: any = document.createElement('button');
      el.type = 'button'; el.className = 'ks-item ks-shape';
      el.setAttribute('aria-label', def.label + ' (Enter lub spacja, potem wybierz miejsce)');
      el.setAttribute('aria-pressed', 'false');
      el.innerHTML = shapeSvg(def, false);
      field.appendChild(el);
      var it: any = { def: def, el: el, slot: order[k], x: 0, y: 0, hx: 0, hy: 0, tx: 0, ty: 0,
        mode: 'idle', pid: null, dx: 0, dy: 0, placed: false, glow: 0,
        fx: 0, fy: 0, gt: 0, gd: 1, gx: 0, gy: 0 };
      items.push(it);
      el.addEventListener('pointerdown', function (e?: any) { down(it, e); });
      el.addEventListener('pointermove', function (e?: any) { move(it, e); });
      el.addEventListener('pointerup', function (e?: any) { up(it, e); });
      el.addEventListener('pointercancel', function (e?: any) { up(it, e); });
      el.addEventListener('lostpointercapture', function (e?: any) { up(it, e); });
      el.addEventListener('click', function (e?: any) { if (e.detail === 0) { select(it); } });
    });
    layout();
    items.forEach(paintGlow);
  }

  function itemFor(def?: any) { for (var i: any = 0; i < items.length; i++) { if (items[i].def === def) { return items[i]; } } } void itemFor;

  function layout() {
    var r: any = field.getBoundingClientRect();
    fw = r.width; fh = r.height;
    // Two g x g grids: stacked in portrait (targets above, shapes below), side by side in landscape.
    var portrait: any = fh >= fw, rw: any = portrait ? fw : fw / 2, rh: any = portrait ? fh / 2 : fh;
    var cw: any = rw / g, ch: any = rh / g;
    S = Math.max(56, Math.min(140, Math.min(cw, ch) * 0.82));
    field.style.setProperty('--ks-s', S + 'px');
    function cell(slot?: any, region?: any) {
      var ox: any = portrait ? 0 : region * rw, oy: any = portrait ? region * rh : 0;
      return [ox + ((slot % g) + 0.5) * cw, oy + (Math.floor(slot / g) + 0.5) * ch];
    }
    defs.forEach(function (def?: any, i?: any) {
      var c: any = cell(i, 0);
      def.ox = c[0]; def.oy = c[1];
      def.outlineEl.style.transform = 'translate(' + (def.ox - S / 2) + 'px,' + (def.oy - S / 2) + 'px)';
    });
    items.forEach(function (it?: any) {
      var h: any = cell(it.slot, 1);
      it.hx = h[0]; it.hy = h[1];
      it.tx = it.def.ox; it.ty = it.def.oy;
      if (it.mode === 'drag') { cancelDrag(it); }
      if (it.mode === 'glide') { glideTo(it, it.placed ? it.tx : it.hx, it.placed ? it.ty : it.hy, true); }
      else if (it.placed) { it.x = it.tx; it.y = it.ty; }
      else { it.x = it.hx; it.y = it.hy; }
      place(it);
    });
  }
  function place(it?: any) {
    it.el.style.transform = 'translate(' + (it.x - S / 2) + 'px,' + (it.y - S / 2) + 'px)';
  }
  function paintGlow(it?: any) {
    var g: any = it.glow + doneGlow * 0.6;
    it.el.style.filter = g > 0.01 ? 'drop-shadow(0 0 ' + (6 + 14 * g) + 'px ' + it.def.glow + ')' : '';
    it.def.outlineEl.style.opacity = it.placed ? '0.35' : '1';
  }

  // Glide: smoothstep from the current position; always re-startable from wherever the shape is.
  function glideTo(it?: any, x?: any, y?: any, quick?: any) {
    var d: any = Math.hypot(x - it.x, y - it.y);
    it.fx = it.x; it.fy = it.y; it.gx = x; it.gy = y; it.gt = 0;
    it.gd = quick ? 200 : (reduced() ? 300 : Math.min(1400, 700 + d * 0.8));
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
    if (it.placed || it.pid !== null || (e.button !== undefined && e.button > 0)) { return; }
    var r: any = field.getBoundingClientRect();
    it.pid = e.pointerId; it.mode = 'drag';
    it.dx = it.x - (e.clientX - r.left); it.dy = it.y - (e.clientY - r.top);
    it.el.style.zIndex = '5';
    try { it.el.setPointerCapture(e.pointerId); } catch (err: any) { /* synthetic pointer */ }
    e.preventDefault();
  }
  function move(it?: any, e?: any) {
    if (it.mode !== 'drag' || e.pointerId !== it.pid) { return; }
    var r: any = field.getBoundingClientRect();
    var px: any = e.clientX - r.left + it.dx, py: any = e.clientY - r.top + it.dy;
    // Keep the shape centre inside the visible screen so it can never be lost off-screen.
    var minX: any = -r.left + S / 2, maxX: any = window.innerWidth - r.left - S / 2;
    var minY: any = -r.top + S / 2, maxY: any = window.innerHeight - r.top - S / 2;
    it.x = Math.max(minX, Math.min(maxX, px)); it.y = Math.max(minY, Math.min(maxY, py));
    place(it);
  }
  function up(it?: any, e?: any) {
    if (it.mode !== 'drag' || e.pointerId !== it.pid) { return; }
    try { it.el.releasePointerCapture(it.pid); } catch (err: any) { /* already released */ }
    it.pid = null; it.mode = 'idle';
    if (Math.hypot(it.x - it.tx, it.y - it.ty) < S * 0.75) { snap(it); } else { sendHome(it); }
  }

  function select(it?: any) {
    selected = selected === it ? null : it;
    if (it && it.placed) { selected = null; }
    items.forEach(function (o?: any) {
      var on: any = o === selected;
      o.el.setAttribute('aria-pressed', on ? 'true' : 'false');
      o.el.classList.toggle('ks-selected', on);
    });
  }
  function onOutline(def?: any) {
    if (!selected || selected.mode === 'drag') { return; }
    var it: any = selected;
    select(null);
    if (it.def === def) { snap(it); } else { sendHome(it); }
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
      paintGlow(it);
      it.el.tabIndex = it.placed ? -1 : 0;
      it.el.disabled = it.placed;
    });
    // Whole-picture glow, then drift back after RETURN_AFTER (time only advances while visible).
    var allIn: any = items.every(function (it?: any) { return it.placed && it.mode === 'idle'; });
    if (allIn && !doneActive) { doneActive = true; doneT = 0; Analytics.levelComplete(g * g); Analytics.complete(g * g); }
    if (doneActive) {
      doneT += dt;
      if (doneT >= RETURN_AFTER) {
        completed++;
        if (g === 2 && completed >= WIN_AFTER) { g = 3; }
        newRound();
        busy = true;
      } else { busy = true; }
    }
    var tgG: any = doneActive ? 1 : 0;
    if (Math.abs(doneGlow - tgG) > 0.005) { doneGlow += (tgG - doneGlow) * Math.min(1, dt / 500); busy = true; }
    else { doneGlow = tgG; }
    glowEl.style.opacity = String(doneGlow);
    items.forEach(paintGlow);
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
  newRound();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (board.parentNode) { board.parentNode.removeChild(board); }
  };
}

export default function KsztaltyActivity() {
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
