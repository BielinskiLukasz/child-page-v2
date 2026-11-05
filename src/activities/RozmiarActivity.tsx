// Activity "Rozmiar": five nesting cups (or matryoshka dolls) of clearly different sizes lie scattered on a table.
// Drag one onto a bigger one and it slides inside with a soft click (a small squash, no sound); dropping it on a smaller
// one just drifts it back in 0.5 s. A nested item keeps its own contents, so any item lifts out (with what is inside it)
// and the smallest comes out alone. When all five are one stack it glows for 3 s, the animal in the biggest item waves,
// then a new random set (cups or dolls, new colours, never the same twice in a row) is laid out on the table.
// One capped-dt rAF loop (works under prefers-reduced-motion, pauses when hidden, stops when idle); nothing is stored.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';
import { Animals } from '../utils/animals';
import { Rand } from '../utils/rand';

var N: any = 5, RATIO: any = 1.28, BASE_H: any = 56, ASPECT: any = 0.76, RISE: any = 0.08;
var GLOW_MS: any = 3000, OUT_MS: any = 500, IN_MS: any = 600, DRIFT_MS: any = 500, NEST_MS: any = 450, PULSE_MS: any = 260, MOVE_PX: any = 6;
var SETS: any = [
  { id: 'cup0', kind: 'cup', c1: '#f7a8c9', c2: '#fdf6ec' }, { id: 'cup1', kind: 'cup', c1: '#a8d8f0', c2: '#ffd98a' },
  { id: 'cup2', kind: 'cup', c1: '#bfe6b4', c2: '#f9f1d0' }, { id: 'cup3', kind: 'cup', c1: '#c9b8f2', c2: '#fdf6ec' },
  { id: 'cup4', kind: 'cup', c1: '#ffc9a0', c2: '#a8d8f0' }, { id: 'cup5', kind: 'cup', c1: '#a8e6d4', c2: '#f7a8c9' },
  { id: 'doll0', kind: 'doll', c1: '#ee6a5f', c2: '#ffd98a' }, { id: 'doll1', kind: 'doll', c1: '#5fa8e0', c2: '#fdf6ec' },
  { id: 'doll2', kind: 'doll', c1: '#7fc58a', c2: '#ffe27a' }, { id: 'doll3', kind: 'doll', c1: '#b58ae0', c2: '#ffd98a' },
  { id: 'doll4', kind: 'doll', c1: '#f4a261', c2: '#fdf6ec' }, { id: 'doll5', kind: 'doll', c1: '#e88fb4', c2: '#a8e6d4' }
];
var FACE: any = '#fde4cf', INK: any = '#5b5675';

function itemSvg(set?: any) {
  var s: any;
  if (set.kind === 'cup') {
    s = '<path d="M8 14H68L60 94Q59 98 55 98H21Q17 98 16 94Z" fill="' + set.c1 + '"/>' +
      '<path d="M11 48H65L63 62H13Z" fill="' + set.c2 + '"/>' +
      '<rect x="3" y="8" width="70" height="11" rx="5.5" fill="' + set.c2 + '"/>' +
      '<path d="M16 28q-1 6 0 12" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/>';
  } else {
    s = '<path d="M38 4C56 4 66 22 66 44C66 70 72 80 68 90Q64 98 38 98Q12 98 8 90C4 80 10 70 10 44C10 22 20 4 38 4Z" fill="' + set.c1 + '"/>' +
      '<circle cx="38" cy="34" r="14" fill="' + FACE + '"/>' +
      '<path d="M14 36C12 8 64 8 62 36C56 22 20 22 14 36Z" fill="' + set.c2 + '"/>' +
      '<circle cx="33" cy="36" r="1.8" fill="' + INK + '"/><circle cx="43" cy="36" r="1.8" fill="' + INK + '"/>' +
      '<circle cx="38" cy="72" r="15" fill="' + set.c2 + '"/><circle cx="38" cy="72" r="5.5" fill="' + set.c1 + '"/>';
  }
  return '<svg class="rz-svg" viewBox="0 0 76 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' + s + '</svg>';
}
function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function report(fn?: any) { try { if (Analytics) { fn(Analytics); } } catch (e: any) { /* metrics must never break the activity */ } }
function shuffled(a?: any) {
  var r: any = a.slice(), i: any, j: any, t: any;
  for (i = r.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = r[i]; r[i] = r[j]; r[j] = t; }
  return r;
}

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var board: any = document.createElement('div');
  board.className = 'rz';
  board.innerHTML = '<div class="rz-field"></div>';
  container.appendChild(board);
  var field: any = board.querySelector('.rz-field');

  var fw: any = 0, fh: any = 0, k: any = 1, headSize: any = 0, headExtra: any = 0;
  var set: any = null, animalId: any = null;
  var phase: any = 'play', phaseT: any = 0, glow: any = 0, waveT: any = 0, alpha: any = 1;
  var raf: any = 0, last: any = 0;
  var dragIt: any = null, drag: any = null, kb: any = { sel: null, targets: [], ti: 0 };
  var items: any = [], TABLE: any = { table: true };

  for (var i: any = 0; i < N; i++) { items.push(makeItem(i)); }
  function makeItem(idx?: any) {
    var el: any = document.createElement('button');
    el.type = 'button'; el.className = 'rz-item';
    el.setAttribute('aria-pressed', 'false');
    var it: any = { i: idx, el: el, H: 0, W: 0, x: 0, y: 0, tx: 0, ty: 0, fx: 0, fy: 0, gt: 0, gd: 1, glide: false,
      inside: null, inner: null, fax: 0.5, fay: 0.5, pt: PULSE_MS, nestFlag: false, head: null };
    el.style.zIndex = String(1 + (N - 1 - idx));
    field.appendChild(el);
    el.addEventListener('pointerdown', function (e?: any) { down(it, e); });
    el.addEventListener('pointermove', function (e?: any) { move(it, e); });
    el.addEventListener('pointerup', function (e?: any) { up(it, e, false); });
    el.addEventListener('pointercancel', function (e?: any) { up(it, e, true); });
    el.addEventListener('click', function (e?: any) { if (e.detail === 0) { kbClick(it); } });
    return it;
  }

  function chainOf(r?: any) { var c: any = []; while (r) { c.push(r); r = r.inner; } return c; }
  function rootOf(it?: any) { while (it.inside) { it = it.inside; } return it; }

  function paintSet() {
    var noun: any = set.kind === 'cup' ? 'Kubek' : 'Matrioszka';
    items.forEach(function (it?: any) {
      var html: any = itemSvg(set);
      it.head = null;
      if (it.i === N - 1 && animalId && Animals) {
        html = '<span class="rz-head"><svg class="rz-hsvg" viewBox="-18 -18 36 36" aria-hidden="true" focusable="false">' +
          Animals.head(animalId) + '</svg></span>' + html;
      }
      it.el.innerHTML = html;
      it.head = it.el.querySelector('.rz-head');
      it.el.setAttribute('aria-label', noun + ' ' + (it.i + 1) + ' z ' + N + ' (Enter lub spacja, potem wybierz większy)');
    });
    sizeItems();
  }
  function sizeItems() {
    items.forEach(function (it?: any) {
      it.H = BASE_H * k * Math.pow(RATIO, it.i); it.W = Math.max(56, it.H * ASPECT);
      it.el.style.width = it.W + 'px'; it.el.style.height = it.H + 'px';
      if (it.head) {
        it.head.style.width = headSize + 'px'; it.head.style.height = headSize + 'px';
        it.head.style.left = ((it.W - headSize) / 2) + 'px'; it.head.style.top = (-headExtra) + 'px';
      }
    });
  }
  function newSet() {
    set = Rand.pickOne(SETS, 'rozmiar');
    var a: any = Animals ? Animals.pick(1) : null;
    animalId = a && a[0] ? a[0].id : null;
  }

  function clampRoot(r?: any) {
    var ax: any = r.fax * fw, ay: any = r.fay * fh;
    var top: any = r.H + (r.i === N - 1 ? headExtra : 0);
    ax = Math.max(r.W / 2 + 2, Math.min(fw - r.W / 2 - 2, ax));
    ay = Math.max(top + 2, Math.min(fh - 2, ay));
    r.fax = fw ? ax / fw : 0.5; r.fay = fh ? ay / fh : 0.5;
    return [ax, ay];
  }
  // Rest positions of every root and the items nested in it.
  function computeTargets() {
    items.forEach(function (r?: any) {
      if (r.inside) { return; }
      var p: any = clampRoot(r), bottom: any = p[1];
      chainOf(r).forEach(function (it?: any) {
        it.tx = p[0]; it.ty = bottom; bottom -= RISE * it.H;
      });
    });
  }
  function glideTo(it?: any, x?: any, y?: any, dur?: any) {
    it.fx = it.x; it.fy = it.y; it.tx = x; it.ty = y; it.gt = 0; it.gd = Math.max(1, dur); it.glide = true;
    start();
  }
  // Move every item that is not being dragged to its rest position (instantly when dur is 0).
  function settle(dur?: any) {
    computeTargets();
    items.forEach(function (it?: any) {
      if (it.drag) { return; }
      if (dur > 0 && Math.hypot(it.tx - it.x, it.ty - it.y) > 0.5) { glideTo(it, it.tx, it.ty, dur); }
      else if (!it.glide || dur === 0) { it.glide = false; it.x = it.tx; it.y = it.ty; }
    });
    paint();
  }
  function scatter() {
    var portrait: any = fh >= fw;
    var order: any = shuffled(items);
    var rows: any = portrait ? [order.slice(0, 2), order.slice(2, 4), order.slice(4)] : [order];
    var rh: any = rows.map(function (row?: any) {
      return row.reduce(function (m?: any, it?: any) { return Math.max(m, it.H + (it.i === N - 1 ? headExtra : 0)); }, 0);
    });
    var free: any = fh - rh.reduce(function (s?: any, v?: any) { return s + v; }, 0);
    var gap: any = Math.max(4, free / (rows.length + 1)), top: any = gap;
    rows.forEach(function (row?: any, ri?: any) {
      var sw: any = row.reduce(function (s?: any, it?: any) { return s + it.W; }, 0);
      var hg: any = Math.max(4, (fw - sw) / (row.length + 1)), x: any = hg;
      row.forEach(function (it?: any) {
        var jx: any = (Math.random() - 0.5) * hg * 0.5;
        var slack: any = rh[ri] - it.H - (it.i === N - 1 ? headExtra : 0);
        var by: any = top + rh[ri] - Math.random() * slack * 0.8;
        it.inside = null; it.inner = null;
        it.fax = (x + it.W / 2 + jx) / fw; it.fay = by / fh;
        x += it.W + hg;
      });
      top += rh[ri] + gap;
    });
    items.forEach(function (it?: any) { it.glide = false; });
    settle(0);
  }

  function layout() {
    var r: any = field.getBoundingClientRect();
    var ow: any = fw, oh: any = fh;
    fw = r.width; fh = r.height;
    var portrait: any = fh >= fw;
    k = Math.max(1, Math.min(1.4, fw / 330, portrait ? fh / 360 : fh / 240));
    var bigW: any = BASE_H * k * Math.pow(RATIO, N - 1) * ASPECT;
    headSize = bigW * 0.5; headExtra = headSize * 0.45;
    sizeItems();
    if (!ow || !oh) { scatter(); } else { settle(0); }
  }

  function place(it?: any) {
    var s: any = 1;
    if (it.pt < PULSE_MS) { s = 1 + 0.05 * Math.sin(Math.PI * it.pt / PULSE_MS); }
    it.el.style.transform = 'translate(' + (it.x - it.W / 2).toFixed(1) + 'px,' + (it.y - it.H).toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
  }
  function paint() {
    var full: any = chainOf(rootOf(items[N - 1])).length === N;
    items.forEach(function (it?: any) {
      place(it);
      it.el.style.opacity = alpha < 0.999 ? alpha.toFixed(3) : '';
      it.el.style.filter = full && glow > 0.01 ? 'drop-shadow(0 0 ' + (6 + 16 * glow).toFixed(1) + 'px #ffe08a)' : '';
      if (it.head) {
        it.head.style.transform = waveT > 0 && glow > 0.01 ? 'rotate(' + (16 * glow * Math.sin(waveT * 2 * Math.PI * 0.7)).toFixed(1) + 'deg)' : '';
      }
    });
  }

  // ---- nesting model -------------------------------------------------------------------------------------
  function detach(it?: any) {
    var c: any = it.inside;
    if (c) { c.inner = null; it.inside = null; }
    return c;
  }
  function nest(it?: any, B?: any) {
    var G: any = chainOf(it), contents: any = chainOf(B.inner);
    contents.forEach(function (c?: any) { c.inside = null; });
    B.inner = null;
    var merged: any = G.concat(contents).sort(function (a?: any, b?: any) { return b.i - a.i; });
    var prev: any = B;
    merged.forEach(function (m?: any) { prev.inner = m; m.inside = prev; m.inner = null; prev = m; });
    G.forEach(function (g?: any) { g.nestFlag = true; });
    report(function (A?: any) { A.track('interaction', { variant: 's' + (it.i + 1) }); });
    settle(NEST_MS);
    if (chainOf(rootOf(B)).length === N && phase === 'play') {
      report(function (A?: any) { A.complete(); });
      phase = 'pre'; phaseT = 0; start();
    }
  }
  function liftOut(it?: any) {
    var c: any = detach(it);
    if (!c) { return; }
    var side: any = c.x + c.W / 2 + it.W + 14 <= fw ? 1 : -1;
    var ax: any = c.x + side * (c.W / 2 + it.W / 2 + 14);
    it.fax = ax / fw; it.fay = c.y / fh;
    settle(NEST_MS);
  }

  // ---- pointer ---------------------------------------------------------------------------------------------
  function down(it?: any, e?: any) {
    if (phase !== 'play' || dragIt || (e.button !== undefined && e.button > 0)) { return; }
    clearKb();
    var r: any = field.getBoundingClientRect();
    var cont: any = it.inside;
    drag = { pid: e.pointerId, cont: cont, ofax: it.fax, ofay: it.fay, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0 };
    dragIt = it;
    if (cont) { detach(it); it.fax = it.x / fw; it.fay = it.y / fh; }
    drag.dx = it.x - (e.clientX - r.left); drag.dy = it.y - (e.clientY - r.top);
    chainOf(it).forEach(function (g?: any) { g.drag = true; g.glide = false; g.el.style.zIndex = String(20 + (N - g.i)); });
    try { it.el.setPointerCapture(e.pointerId); } catch (err: any) { /* synthetic pointer */ }
    settle(0);
    e.preventDefault();
  }
  function move(it?: any, e?: any) {
    if (it !== dragIt || e.pointerId !== drag.pid) { return; }
    var r: any = field.getBoundingClientRect();
    it.fax = (e.clientX - r.left + drag.dx) / fw; it.fay = (e.clientY - r.top + drag.dy) / fh;
    computeTargets();
    chainOf(it).forEach(function (g?: any) { g.x = g.tx; g.y = g.ty; });
    paint();
  }
  function endDrag() {
    chainOf(dragIt).forEach(function (g?: any) { g.drag = false; g.el.style.zIndex = String(1 + (N - 1 - g.i)); });
    try { dragIt.el.releasePointerCapture(drag.pid); } catch (err: any) { /* already released */ }
    dragIt = null;
  }
  function restore(it?: any, d?: any, dur?: any) {
    if (d.cont) {
      d.cont.inner = it; it.inside = d.cont;
    } else { it.fax = d.ofax; it.fay = d.ofay; }
    settle(dur);
  }
  function up(it?: any, e?: any, cancelled?: any) {
    if (it !== dragIt || e.pointerId !== drag.pid) { return; }
    var d: any = drag;
    endDrag();
    var moved: any = Math.hypot(e.clientX - d.sx, e.clientY - d.sy);
    if (cancelled || phase !== 'play') { restore(it, d, DRIFT_MS); return; }
    if (moved < MOVE_PX) { restore(it, d, 120); return; }
    var G: any = chainOf(it), cx: any = it.x, cy: any = it.y - it.H / 2, best: any = null, bd: any = 1e9, hitSmaller: any = false;
    items.forEach(function (B?: any) {
      if (G.indexOf(B) >= 0) { return; }
      if (Math.abs(cx - B.x) > B.W / 2 || cy > B.y || cy < B.y - B.H) { return; }
      if (B.i > it.i) {
        var dd: any = Math.hypot(cx - B.x, cy - (B.y - B.H / 2));
        if (dd < bd) { bd = dd; best = B; }
      } else { hitSmaller = true; }
    });
    if (best) { nest(it, best); }
    else if (hitSmaller) { restore(it, d, DRIFT_MS); }
    else { settle(DRIFT_MS); }
  }
  function cancelDrag() {
    if (!dragIt) { return; }
    var it: any = dragIt, d: any = drag;
    endDrag();
    restore(it, d, DRIFT_MS);
  }

  // ---- keyboard --------------------------------------------------------------------------------------------
  function targetsFor(sel?: any) {
    var list: any = sel.inside ? [TABLE] : [];
    items.forEach(function (B?: any) {
      if (B.i <= sel.i) { return; }
      for (var a: any = sel.inside; a; a = a.inside) { if (a === B) { return; } }
      list.push(B);
    });
    return list;
  }
  function paintKb() {
    var t: any = kb.sel ? kb.targets[kb.ti] : null;
    items.forEach(function (it?: any) {
      var on: any = it === kb.sel;
      it.el.setAttribute('aria-pressed', on ? 'true' : 'false');
      it.el.classList.toggle('rz-sel', on);
      it.el.classList.toggle('rz-tgt', !!t && t === it);
      it.el.classList.toggle('rz-lift', on && t === TABLE);
    });
  }
  function clearKb() { kb.sel = null; kb.targets = []; kb.ti = 0; paintKb(); }
  function commitKb() {
    var sel: any = kb.sel, t: any = kb.targets[kb.ti];
    clearKb();
    if (!sel || !t) { return; }
    if (t === TABLE) { liftOut(sel); } else { detach(sel); nest(sel, t); }
  }
  function kbClick(it?: any) {
    if (phase !== 'play' || dragIt) { return; }
    if (kb.sel && kb.sel !== it) {
      var ix: any = kb.targets.indexOf(it);
      if (ix >= 0) { kb.ti = ix; commitKb(); return; }
    }
    if (kb.sel === it) { commitKb(); return; }
    kb.sel = it; kb.targets = targetsFor(it); kb.ti = 0;
    if (!kb.targets.length) { kb.sel = null; }
    paintKb();
  }
  function onKey(e?: any) {
    if (!kb.sel) { return; }
    var key: any = e.key;
    if (key === 'Escape') { clearKb(); e.preventDefault(); return; }
    var n: any = kb.targets.length;
    if (key === 'ArrowRight' || key === 'ArrowDown') { kb.ti = (kb.ti + 1) % n; }
    else if (key === 'ArrowLeft' || key === 'ArrowUp') { kb.ti = (kb.ti + n - 1) % n; }
    else { return; }
    e.preventDefault();
    paintKb();
  }

  // ---- loop ------------------------------------------------------------------------------------------------
  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min(now - last, 50); last = now;
    var busy: any = false, gliding: any = false;
    items.forEach(function (it?: any) {
      if (it.glide) {
        it.gt += dt;
        var q: any = smooth(it.gt / it.gd);
        it.x = it.fx + (it.tx - it.fx) * q; it.y = it.fy + (it.ty - it.fy) * q;
        if (it.gt >= it.gd) {
          it.glide = false; it.x = it.tx; it.y = it.ty;
          if (it.nestFlag) { it.nestFlag = false; it.pt = 0; }
        } else { busy = true; gliding = true; }
      }
      if (it.pt < PULSE_MS) { it.pt += dt; busy = true; }
    });
    phaseT += dt;
    if (phase === 'pre') { if (!gliding) { phase = 'glow'; phaseT = 0; waveT = 0.001; } busy = true; }
    else if (phase === 'glow') {
      waveT += dt / 1000; busy = true;
      if (phaseT >= GLOW_MS) { phase = 'out'; phaseT = 0; }
    } else if (phase === 'out') {
      alpha = Math.max(0, 1 - phaseT / OUT_MS); busy = true;
      if (phaseT >= OUT_MS) {
        alpha = 0; waveT = 0; glow = 0;
        newSet(); paintSet(); scatter();
        phase = 'in'; phaseT = 0;
      }
    } else if (phase === 'in') {
      alpha = Math.min(1, phaseT / IN_MS); busy = true;
      if (phaseT >= IN_MS) { alpha = 1; phase = 'play'; }
    }
    var tg: any = phase === 'glow' ? 1 : 0;
    if (Math.abs(glow - tg) > 0.005) { glow += (tg - glow) * Math.min(1, dt / 300); busy = true; } else { glow = tg; }
    paint();
    if (busy) { raf = requestAnimationFrame(frame); }
  }
  function start() {
    if (raf || document.hidden) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { cancelDrag(); if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }
  function onResize() { cancelDrag(); layout(); start(); }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  board.addEventListener('keydown', onKey);
  newSet(); paintSet();
  layout();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    board.removeEventListener('keydown', onKey);
    if (board.parentNode) { board.parentNode.removeChild(board); }
  };
}

export default function RozmiarActivity() {
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
