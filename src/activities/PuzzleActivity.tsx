// Activity "Puzzle": a picture is cut into big pieces scattered in a tray next to (or below) an outline.
// Drag a piece near its place and it glides in. No wrong answers: a piece released elsewhere drifts back to the tray.
// Pictures come from js/puzzle-pictures.js in random order without repeats (reshuffled when all 25 are used); the grid
// grows after every 5 completed puzzles: 2x2, 2x3, 3x3, 3x4, 4x4 (stays at 4x4). Progress lives only in the mounted
// activity. A finished picture glows ~3 s, then after ~4 s more it cross-fades to the next one.
// One capped-dt rAF loop (works under prefers-reduced-motion, pauses when hidden, stops when idle).
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';
import { PUZZLE_PICTURES } from '../data/puzzlePictures';
import { Rand } from '../utils/rand';

var GLOW_S: any = 3000, NEXT_S: any = 7000, FADE_S: any = 700, PER_GRID: any = 5, GAP: any = 14, MIN_P: any = 56, MAX_P: any = 170;
var SVGNS: any = 'focusable="false" aria-hidden="true"';
// Grid sizes as [short side, long side]: the long side runs along the long axis of the screen.
var GRIDS: any = [[2, 2], [2, 3], [3, 3], [3, 4], [4, 4]];
var PICTURES: any = PUZZLE_PICTURES || [];

// Piece (c, r) of a cw x ch frame shows a unit square of a centred crop of the 200x200 picture.
function pieceSvg(pic?: any, c?: any, r?: any, cw?: any, ch?: any) {
  var rw: any = cw > ch ? 200 : 200 * cw / ch, rh: any = cw > ch ? 200 * ch / cw : 200;
  var u: any = rw / cw, x0: any = (200 - rw) / 2, y0: any = (200 - rh) / 2;
  return '<svg viewBox="' + (x0 + c * u) + ' ' + (y0 + r * u) + ' ' + u + ' ' + u + '" preserveAspectRatio="none" ' + SVGNS + '>' + PICTURES[pic] + '</svg>';
}
// Only the outer corners of the whole picture are rounded, so placed pieces look connected.
function radii(c?: any, r?: any, cw?: any, ch?: any) {
  var q: any = '20px';
  return [c === 0 && r === 0, c === cw - 1 && r === 0, c === cw - 1 && r === ch - 1, c === 0 && r === ch - 1]
    .map(function (on?: any) { return on ? q : '0'; }).join(' ');
}
function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
// Picture order: shuffled, each full cycle reshuffled so the last picture never opens the next cycle.
function makeOrder(prevLast?: any) {
  var ids: any = PICTURES.map(function (_?: any, i?: any) { return i; });
  var o: any = Rand.shuffle(ids);
  if (o.length > 1 && o[0] === prevLast) { var t: any = o[0]; o[0] = o[o.length - 1]; o[o.length - 1] = t; }
  return o;
}

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var board: any = document.createElement('div');
  board.className = 'pz';
  board.innerHTML = '<div class="pz-field"><div class="pz-frame"></div></div>';
  container.appendChild(board);
  var field: any = board.querySelector('.pz-field'), frame: any = board.querySelector('.pz-frame');

  var P: any = 100, fw: any = 0, fh: any = 0, portrait: any = true, fx: any = 0, fy: any = 0, selected: any = null;
  var order: any = makeOrder(-1), oi: any = 0, pic: any = order[0], done: any = 0;
  var cw: any = 2, ch: any = 2, N: any = 4, raf: any = 0, last: any = 0, doneT: any = -1, doneActive: any = false, glow: any = 0;
  var fade: any = 1, fadeDir: any = 0; // fadeDir: -1 out, +1 in, 0 steady
  var slots: any = [], pieces: any = [], cells: any = [], trayPos: any = [], flipGrid: any = Math.random() < 0.5; void trayPos;

  // Builds slots and pieces for the current picture and grid; the frame is cw x ch cells (tall or wide, random per puzzle).
  function build() {
    slots.forEach(function (s?: any) { if (s.parentNode) { s.parentNode.removeChild(s); } });
    pieces.forEach(function (p?: any) { if (p.el.parentNode) { p.el.parentNode.removeChild(p.el); } });
    slots = []; pieces = []; selected = null;
    var g: any = GRIDS[Math.min(GRIDS.length - 1, Math.floor(done / PER_GRID))];
    // Non-square grids: tall (cols < rows) or wide (cols > rows) is drawn at random per puzzle, whatever the screen orientation.
    var tall: any = portrait !== flipGrid;
    cw = tall ? g[0] : g[1]; ch = tall ? g[1] : g[0]; N = cw * ch;
    Analytics.levelStart(N);
    cells = Rand.shuffle(Array.apply(null, Array(N)).map(function (_?: any, i?: any) { return i; }));
    for (var i: any = 0; i < N; i++) {
      (function (i?: any) {
        var s: any = document.createElement('button');
        s.type = 'button'; s.className = 'pz-slot';
        s.setAttribute('aria-label', 'Miejsce ' + (i + 1));
        field.appendChild(s);
        s.addEventListener('click', function () { onSlot(i); });
        slots.push(s);
      })(i);
    }
    for (var k: any = 0; k < N; k++) {
      (function (k?: any) {
        var c: any = k % cw, r: any = Math.floor(k / cw);
        var el: any = document.createElement('button');
        el.type = 'button'; el.className = 'pz-piece';
        el.setAttribute('aria-label', 'Kawałek obrazka ' + (k + 1) + ' (Enter lub spacja, potem wybierz miejsce)');
        el.setAttribute('aria-pressed', 'false');
        el.style.borderRadius = radii(c, r, cw, ch);
        el.innerHTML = pieceSvg(pic, c, r, cw, ch);
        field.appendChild(el);
        var it: any = { i: k, el: el, cell: cells[k], x: 0, y: 0, hx: 0, hy: 0, tx: 0, ty: 0, mode: 'idle', pid: null, dx: 0, dy: 0,
          placed: false, fx: 0, fy: 0, gt: 0, gd: 1, gx: 0, gy: 0 };
        pieces.push(it);
        el.addEventListener('pointerdown', function (e?: any) { down(it, e); });
        el.addEventListener('pointermove', function (e?: any) { move(it, e); });
        el.addEventListener('pointerup', function (e?: any) { up(it, e); });
        el.addEventListener('pointercancel', function (e?: any) { up(it, e); });
        el.addEventListener('lostpointercapture', function (e?: any) { up(it, e); });
        el.addEventListener('click', function (e?: any) { if (e.detail === 0) { select(it); } });
      })(k);
    }
  }

  // Largest piece size P (MIN_P..MAX_P) for which frame + tray fit; tray below (portrait) or beside (landscape) first.
  function fit() {
    for (var p: any = MAX_P; p >= MIN_P; p--) {
      var fW: any = cw * p, fH: any = ch * p, tc: any, tr: any;
      var below: any = function () {
        tc = Math.max(1, Math.floor(fw / p)); tr = Math.ceil(N / tc);
        return Math.max(fW, tc * p) <= fw && fH + GAP + tr * p <= fh ? { side: false, tc: tc, tr: tr, p: p } : null;
      };
      var beside: any = function () {
        tr = Math.max(1, Math.floor(fh / p)); tc = Math.ceil(N / tr);
        return fW + GAP + tc * p <= fw && Math.max(fH, tr * p) <= fh ? { side: true, tc: tc, tr: tr, p: p } : null;
      };
      var f: any = portrait ? (below() || beside()) : (beside() || below());
      if (f) { return f; }
    }
    // Nothing fits at MIN_P: keep 56 px pieces and let the tray cells overlap.
    var sd: any = !portrait;
    var tcols: any = sd ? Math.max(1, Math.round(N / Math.max(1, Math.floor(fh / MIN_P)))) : Math.max(1, Math.floor(fw / MIN_P));
    return { side: sd, tc: tcols, tr: Math.ceil(N / tcols), p: MIN_P };
  }

  function layout() {
    var r: any = field.getBoundingClientRect();
    fw = r.width; fh = r.height;
    var np: any = fh >= fw;
    portrait = np;
    var f: any = fit();
    P = f.p;
    var fW: any = cw * P, fH: any = ch * P, tx0: any, ty0: any, tw: any, th: any;
    if (f.side) {
      fx = Math.max(0, (fw - fW - GAP - f.tc * P) / 2); fy = Math.max(0, (fh - fH) / 2);
      tx0 = fx + fW + GAP; ty0 = 0; tw = Math.max(P, fw - tx0); th = fh;
    } else {
      fx = Math.max(0, (fw - fW) / 2); fy = Math.max(0, (fh - fH - GAP - f.tr * P) / 2);
      tx0 = 0; ty0 = fy + fH + GAP; tw = fw; th = Math.max(P, fh - ty0);
    }
    // Tray cell step: full P when there is room, otherwise cells overlap a little.
    var sx: any = f.tc > 1 ? Math.min(P, (tw - P) / (f.tc - 1)) : 0, sy: any = f.tr > 1 ? Math.min(P, (th - P) / (f.tr - 1)) : 0;
    var ox: any = tx0 + (tw - (P + sx * (f.tc - 1))) / 2, oy: any = ty0 + (th - (P + sy * (f.tr - 1))) / 2;
    if (f.side) { oy = Math.max(0, oy); } else { ox = Math.max(0, ox); }
    field.style.setProperty('--pz-p', P + 'px');
    frame.style.width = fW + 'px'; frame.style.height = fH + 'px';
    frame.style.transform = 'translate(' + fx + 'px,' + fy + 'px)';
    slots.forEach(function (s?: any, i?: any) {
      s.style.transform = 'translate(' + (fx + (i % cw) * P) + 'px,' + (fy + Math.floor(i / cw) * P) + 'px)';
    });
    pieces.forEach(function (it?: any) {
      it.tx = fx + (it.i % cw + 0.5) * P; it.ty = fy + (Math.floor(it.i / cw) + 0.5) * P;
      it.hx = ox + (it.cell % f.tc) * sx + P / 2; it.hy = oy + Math.floor(it.cell / f.tc) * sy + P / 2;
      if (it.mode === 'drag') { cancelDrag(it); }
      if (it.mode === 'glide') { glideTo(it, it.placed ? it.tx : it.hx, it.placed ? it.ty : it.hy, true); }
      else if (it.placed) { it.x = it.tx; it.y = it.ty; }
      else { it.x = it.hx; it.y = it.hy; }
      place(it);
    });
  }
  function place(it?: any) { it.el.style.transform = 'translate(' + (it.x - P / 2) + 'px,' + (it.y - P / 2) + 'px)'; }
  function paint() {
    frame.style.opacity = String(fade);
    pieces.forEach(function (it?: any) {
      it.el.style.opacity = String(fade);
      it.el.style.filter = glow > 0.01 && it.placed ? 'drop-shadow(0 0 ' + (6 + 14 * glow) + 'px #ffe08a)' : '';
    });
  }

  function glideTo(it?: any, x?: any, y?: any, quick?: any) {
    var d: any = Math.hypot(x - it.x, y - it.y);
    it.fx = it.x; it.fy = it.y; it.gx = x; it.gy = y; it.gt = 0;
    it.gd = quick ? 200 : (reduced() ? 300 : Math.min(1500, 700 + d * 0.8));
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
    if (it.placed || it.pid !== null || fadeDir !== 0 || (e.button !== undefined && e.button > 0)) { return; }
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
    // Keep the piece centre inside the visible screen so it can never be lost off-screen.
    it.x = Math.max(-r.left + P / 2, Math.min(window.innerWidth - r.left - P / 2, px));
    it.y = Math.max(-r.top + P / 2, Math.min(window.innerHeight - r.top - P / 2, py));
    place(it);
  }
  function up(it?: any, e?: any) {
    if (it.mode !== 'drag' || e.pointerId !== it.pid) { return; }
    try { it.el.releasePointerCapture(it.pid); } catch (err: any) { /* already released */ }
    it.pid = null; it.mode = 'idle';
    if (Math.hypot(it.x - it.tx, it.y - it.ty) < P * 0.5) { snap(it); } else { sendHome(it); }
  }

  function select(it?: any) {
    selected = selected === it ? null : it;
    if (it && it.placed) { selected = null; }
    pieces.forEach(function (o?: any) {
      var on: any = o === selected;
      o.el.setAttribute('aria-pressed', on ? 'true' : 'false');
      o.el.classList.toggle('pz-selected', on);
    });
  }
  function onSlot(i?: any) {
    if (!selected || selected.mode === 'drag' || fadeDir !== 0) { return; }
    var it: any = selected;
    select(null);
    if (it.i === i) { snap(it); } else { sendHome(it); }
  }
  function nextPicture() {
    done++;
    oi++;
    if (oi >= order.length) { order = makeOrder(order[order.length - 1]); oi = 0; }
    pic = order[oi];
    flipGrid = Math.random() < 0.5;
    build();
    layout();
  }

  function frame_(now?: any) {
    raf = 0;
    var dt: any = Math.min(now - last, 50); last = now;
    var busy: any = false;
    pieces.forEach(function (it?: any) {
      if (it.mode === 'glide') {
        it.gt += dt;
        var k: any = smooth(it.gt / it.gd);
        it.x = it.fx + (it.gx - it.fx) * k; it.y = it.fy + (it.gy - it.fy) * k;
        if (it.gt >= it.gd) { it.mode = 'idle'; it.x = it.gx; it.y = it.gy; it.el.style.zIndex = ''; }
        else { busy = true; }
        place(it);
      }
      it.el.tabIndex = it.placed ? -1 : 0;
      it.el.disabled = it.placed;
    });
    var allIn: any = pieces.every(function (it?: any) { return it.placed && it.mode === 'idle'; });
    if (allIn && !doneActive && fadeDir === 0) { doneActive = true; doneT = 0; Analytics.levelComplete(N); Analytics.complete(N); }
    if (doneActive) {
      doneT += dt;
      if (doneT >= NEXT_S) { doneActive = false; doneT = -1; fadeDir = -1; }
      else { busy = true; }
    }
    if (fadeDir !== 0) {
      fade += fadeDir * dt / FADE_S;
      if (fadeDir < 0 && fade <= 0) { fade = 0; nextPicture(); fadeDir = 1; }
      else if (fadeDir > 0 && fade >= 1) { fade = 1; fadeDir = 0; }
      busy = true;
    }
    var tg: any = doneActive && doneT < GLOW_S ? 1 : 0;
    if (Math.abs(glow - tg) > 0.005) { glow += (tg - glow) * Math.min(1, dt / 400); busy = true; }
    else { glow = tg; }
    paint();
    if (busy) { raf = requestAnimationFrame(frame_); }
  }
  function start() {
    if (raf || document.hidden) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame_);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }
  function onResize() { layout(); start(); }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  layout();
  build();
  layout();
  paint();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (board.parentNode) { board.parentNode.removeChild(board); }
  };
}

export default function PuzzleActivity() {
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
