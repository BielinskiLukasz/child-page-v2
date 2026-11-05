// Activity "Kolorowe Kubeczki": drag six soft balls (2 per colour) into the cup of the same colour. No wrong answers:
// a ball released anywhere else floats slowly back. Colours also differ by pattern (plain / dots / stripes).
// One capped-dt rAF loop (works under prefers-reduced-motion, pauses when the tab is hidden, stops when idle);
// fixed DOM of 3 cups + 6 balls. A random colour/pattern combo is picked per launch. All state is in memory only.
import { useEffect, useRef } from 'react';
import { Rand } from '../utils/rand';

// Predefined colour + pattern combinations; one is picked at random each time the activity opens.
// Each combo has three cups; pattern (plain / dots / stripes) is the non-colour cue and is always distinct.
function combo(rows?: any) {
  return rows.map(function (r?: any, i?: any) {
    return { id: 'c' + i, label: r[0], color: r[1], glow: r[2], pat: r[3] };
  });
}
var COMBOS: any = [
  combo([['różowy', '#f7a8c9', '#f58fbb', 'plain'], ['żółty', '#ffd98a', '#ffcf66', 'dots'], ['niebieski', '#a8d8f0', '#8cc8ea', 'stripes']]),
  combo([['zielony', '#b5e3a8', '#9bd68c', 'stripes'], ['pomarańczowy', '#ffc99a', '#ffb877', 'plain'], ['fioletowy', '#d3b8f0', '#c29ae9', 'dots']]),
  combo([['czerwony', '#f4a3a3', '#ee8585', 'dots'], ['turkusowy', '#a3e3de', '#85d8d2', 'stripes'], ['żółty', '#ffe29a', '#ffd673', 'plain']]),
  combo([['niebieski', '#a8c8f4', '#8ab4ee', 'plain'], ['różowy', '#f7b5d6', '#f39cc7', 'stripes'], ['zielony', '#c1e8a0', '#aadd7e', 'dots']]),
  combo([['fioletowy', '#c9b3f2', '#b699ec', 'stripes'], ['żółty', '#ffdf8f', '#ffd266', 'dots'], ['zielony', '#a8e0bd', '#8ed6a8', 'plain']]),
  combo([['pomarańczowy', '#ffbf94', '#ffaa70', 'stripes'], ['niebieski', '#9fd3f0', '#82c4ea', 'dots'], ['różowy', '#f5a9c4', '#f08fb2', 'plain']]),
  combo([['turkusowy', '#98e0d6', '#7cd6c9', 'dots'], ['czerwony', '#f6a6a0', '#f18a82', 'plain'], ['fioletowy', '#d9b6ee', '#cb9ae6', 'stripes']]),
  combo([['zielony', '#bfe8a6', '#a8dd86', 'plain'], ['niebieski', '#a6cdf2', '#88baec', 'stripes'], ['pomarańczowy', '#ffcba0', '#ffb87c', 'dots']])
];
var GLOW_S: any = 2000, RESET_S: any = 4000;
var SVGNS: any = 'viewBox="0 0 100 100" aria-hidden="true" focusable="false"';

function ballSvg(c?: any) {
  var pat: any = c.pat === 'dots'
    ? '<g fill="#fff" fill-opacity=".75"><circle cx="38" cy="42" r="5"/><circle cx="62" cy="40" r="5"/><circle cx="50" cy="62" r="5"/></g>'
    : c.pat === 'stripes'
      ? '<g stroke="#fff" stroke-opacity=".75" stroke-width="6" stroke-linecap="round"><path d="M26 40H74M22 58H78"/></g>' : '';
  return '<svg ' + SVGNS + '><circle cx="50" cy="50" r="42" fill="' + c.color + '"/>' + pat +
    '<path d="M26 34a28 28 0 0 1 18-14" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round"/></svg>';
}
function cupSvg(c?: any) {
  var pat: any = c.pat === 'dots'
    ? '<g fill="#fff" fill-opacity=".75"><circle cx="38" cy="46" r="5"/><circle cx="62" cy="46" r="5"/><circle cx="50" cy="64" r="5"/><circle cx="38" cy="78" r="4"/><circle cx="62" cy="78" r="4"/></g>'
    : c.pat === 'stripes'
      ? '<g stroke="#fff" stroke-opacity=".75" stroke-width="5" stroke-linecap="round"><path d="M38 38V80M50 38V84M62 38V80"/></g>' : '';
  return '<svg ' + SVGNS + '><path d="M14 22H86L76 88Q75 94 69 94H31Q25 94 24 88Z" fill="' + c.color + '" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="10" y="14" width="80" height="12" rx="6" fill="' + c.color + '" stroke="#fff" stroke-opacity=".6" stroke-width="3"/>' + pat + '</svg>';
}
function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
function shuffled(n?: any, avoid?: any) {
  var a: any, same: any;
  do {
    a = []; for (var i: any = 0; i < n; i++) { a.push(i); }
    for (var j: any = n - 1; j > 0; j--) { var k: any = Math.floor(Math.random() * (j + 1)); var t: any = a[j]; a[j] = a[k]; a[k] = t; }
    same = avoid && a.every(function (v?: any, idx?: any) { return v === avoid[idx]; });
    // keep neighbours of one colour from always sitting together: ball i has colour i % 3
  } while (same);
  return a;
}

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var board: any = document.createElement('div');
  board.className = 'kc';
  board.innerHTML = '<div class="kc-field"></div>';
  container.appendChild(board);
  var field: any = board.querySelector('.kc-field');

  var B: any = 80, C: any = 110, fw: any = 0, fh: any = 0, rows: any = 1, selected: any = null;
  var raf: any = 0, last: any = 0, doneT: any = -1, doneActive: any = false, doneGlow: any = 0; void doneGlow;
  var cups: any = [], items: any = [];
  var COLORS: any = Rand.pickOne(COMBOS, 'kubeczki');
  var order: any = shuffled(6);   // order[k] = home slot of ball k

  COLORS.forEach(function (c?: any, i?: any) {
    var el: any = document.createElement('button');
    el.type = 'button'; el.className = 'kc-cup';
    el.setAttribute('aria-label', 'Kubeczek ' + c.label);
    el.innerHTML = cupSvg(c);
    field.appendChild(el);
    el.addEventListener('click', function () { onCup(cups[i]); });
    cups.push({ c: c, el: el, x: 0, y: 0, count: 0, glow: 0 });
  });
  for (var k: any = 0; k < 6; k++) {
    (function (k?: any) {
      var cup: any = cups[k % 3];
      var el: any = document.createElement('button');
      el.type = 'button'; el.className = 'kc-ball';
      el.setAttribute('aria-label', 'Piłeczka ' + cup.c.label + ' (Enter lub spacja, potem wybierz kubeczek)');
      el.setAttribute('aria-pressed', 'false');
      el.innerHTML = ballSvg(cup.c);
      field.appendChild(el);
      var it: any = { cup: cup, el: el, slot: order[k], x: 0, y: 0, s: 1, hx: 0, hy: 0, tx: 0, ty: 0, ts: 1, nest: 0,
        mode: 'idle', pid: null, dx: 0, dy: 0, placed: false, fx: 0, fy: 0, fs: 1, gt: 0, gd: 1, gx: 0, gy: 0, gs: 1 };
      items.push(it);
      el.addEventListener('pointerdown', function (e?: any) { down(it, e); });
      el.addEventListener('pointermove', function (e?: any) { move(it, e); });
      el.addEventListener('pointerup', function (e?: any) { up(it, e); });
      el.addEventListener('pointercancel', function (e?: any) { up(it, e); });
      el.addEventListener('lostpointercapture', function (e?: any) { up(it, e); });
      el.addEventListener('click', function (e?: any) { if (e.detail === 0) { select(it); } });
    })(k);
  }

  function layout() {
    var r: any = field.getBoundingClientRect();
    fw = r.width; fh = r.height;
    rows = fw / 6 >= 84 ? 1 : 2;
    var per: any = rows === 1 ? 6 : 3;
    B = Math.max(64, Math.min(120, (fw / per) * 0.86, fh * (rows === 1 ? 0.3 : 0.2)));
    C = Math.max(72, Math.min(fw / 3 * 0.86, fh - rows * (B + 10) - 24, 190));
    field.style.setProperty('--kc-b', B + 'px');
    field.style.setProperty('--kc-c', C + 'px');
    cups.forEach(function (cp?: any, i?: any) {
      cp.x = fw * (i + 0.5) / 3; cp.y = C / 2 + 6;
      cp.el.style.transform = 'translate(' + (cp.x - C / 2) + 'px,' + (cp.y - C / 2) + 'px)';
    });
    var ns: any = Math.min(1, C * 0.42 / B);
    items.forEach(function (it?: any) {
      var col: any = it.slot % per, row: any = Math.floor(it.slot / per);
      it.hx = fw * (col + 0.5) / per;
      it.hy = fh - B / 2 - 6 - (rows - 1 - row) * (B + 8);
      var cp: any = it.cup;
      it.ts = ns;
      it.tx = cp.x + (it.nest ? 1 : -1) * C * 0.18;
      it.ty = cp.y + C * 0.12;
      if (it.mode === 'drag') { cancelDrag(it); }
      if (it.mode === 'glide') { glideTo(it, it.placed ? it.tx : it.hx, it.placed ? it.ty : it.hy, it.placed ? it.ts : 1, true); }
      else if (it.placed) { it.x = it.tx; it.y = it.ty; it.s = it.ts; }
      else { it.x = it.hx; it.y = it.hy; it.s = 1; }
      place(it);
    });
  }
  function place(it?: any) {
    it.el.style.transform = 'translate(' + (it.x - B / 2) + 'px,' + (it.y - B / 2) + 'px) scale(' + it.s.toFixed(3) + ')';
  }
  function paint() {
    cups.forEach(function (cp?: any) {
      var g: any = cp.glow;
      cp.el.style.filter = g > 0.01 ? 'drop-shadow(0 0 ' + (6 + 16 * g) + 'px ' + cp.c.glow + ')' : '';
    });
  }

  // Glide: smoothstep from wherever the ball is now; always re-startable.
  function glideTo(it?: any, x?: any, y?: any, s?: any, quick?: any) {
    var d: any = Math.hypot(x - it.x, y - it.y);
    it.fx = it.x; it.fy = it.y; it.fs = it.s; it.gx = x; it.gy = y; it.gs = s; it.gt = 0;
    it.gd = quick ? 200 : (reduced() ? 300 : Math.min(1600, 800 + d * 0.9));
    it.mode = 'glide';
    it.el.style.zIndex = '2';
    start();
  }
  function sendHome(it?: any) {
    if (it.placed) { it.placed = false; it.cup.count--; }
    glideTo(it, it.hx, it.hy, 1);
  }
  function snap(it?: any) {
    if (!it.placed) {
      var taken: any = items.some(function (o?: any) { return o !== it && o.placed && o.cup === it.cup && o.nest === 1; });
      it.nest = taken ? 0 : 1; it.cup.count++;
    }
    it.placed = true; select(null);
    it.tx = it.cup.x + (it.nest ? 1 : -1) * C * 0.18;
    glideTo(it, it.tx, it.ty, it.ts);
    it.gd = Math.min(it.gd, 700); // a short fall into the cup, also when released high above it
  }
  function cancelDrag(it?: any) {
    if (it.pid !== null) { try { it.el.releasePointerCapture(it.pid); } catch (e: any) { /* already released */ } }
    it.pid = null; it.mode = 'idle'; sendHome(it);
  }
  function down(it?: any, e?: any) {
    if (it.placed || it.pid !== null || (e.button !== undefined && e.button > 0)) { return; }
    var r: any = field.getBoundingClientRect();
    it.pid = e.pointerId; it.mode = 'drag'; it.s = 1;
    it.dx = it.x - (e.clientX - r.left); it.dy = it.y - (e.clientY - r.top);
    it.el.style.zIndex = '5';
    try { it.el.setPointerCapture(e.pointerId); } catch (err: any) { /* synthetic pointer */ }
    e.preventDefault();
  }
  function move(it?: any, e?: any) {
    if (it.mode !== 'drag' || e.pointerId !== it.pid) { return; }
    var r: any = field.getBoundingClientRect();
    var px: any = e.clientX - r.left + it.dx, py: any = e.clientY - r.top + it.dy;
    // Keep the ball centre inside the visible screen so it can never be lost off-screen.
    it.x = Math.max(-r.left + B / 2, Math.min(window.innerWidth - r.left - B / 2, px));
    it.y = Math.max(-r.top + B / 2, Math.min(window.innerHeight - r.top - B / 2, py));
    place(it);
  }
  function up(it?: any, e?: any) {
    if (it.mode !== 'drag' || e.pointerId !== it.pid) { return; }
    try { it.el.releasePointerCapture(it.pid); } catch (err: any) { /* already released */ }
    it.pid = null; it.mode = 'idle';
    var cp: any = it.cup;
    // Anywhere in the column above the cup (its full width, from the cup's lower edge up to the top of the screen) counts;
    // above another colour's cup the ball drifts back as before.
    if (Math.abs(it.x - cp.x) < C * 0.5 && it.y < cp.y + C * 0.5) { snap(it); } else { sendHome(it); }
  }

  function select(it?: any) {
    selected = selected === it ? null : it;
    if (it && it.placed) { selected = null; }
    items.forEach(function (o?: any) {
      var on: any = o === selected;
      o.el.setAttribute('aria-pressed', on ? 'true' : 'false');
      o.el.classList.toggle('kc-selected', on);
    });
  }
  function onCup(cp?: any) {
    if (!selected || selected.mode === 'drag') { return; }
    var it: any = selected;
    select(null);
    if (it.cup === cp) { snap(it); } else { sendHome(it); }
  }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min(now - last, 50); last = now;
    var busy: any = false;
    items.forEach(function (it?: any) {
      if (it.mode === 'glide') {
        it.gt += dt;
        var k: any = smooth(it.gt / it.gd);
        it.x = it.fx + (it.gx - it.fx) * k; it.y = it.fy + (it.gy - it.fy) * k; it.s = it.fs + (it.gs - it.fs) * k;
        if (it.gt >= it.gd) { it.mode = 'idle'; it.x = it.gx; it.y = it.gy; it.s = it.gs; it.el.style.zIndex = ''; }
        else { busy = true; }
        place(it);
      }
      it.el.tabIndex = it.placed ? -1 : 0;
      it.el.disabled = it.placed;
    });
    // All balls in: cups glow ~2 s, then after ~4 s the balls drift out in a new mixed order.
    var allIn: any = items.every(function (it?: any) { return it.placed && it.mode === 'idle'; });
    if (allIn && !doneActive) { doneActive = true; doneT = 0; }
    if (doneActive) {
      doneT += dt;
      if (doneT >= RESET_S) {
        doneActive = false; doneT = -1;
        var prev: any = items.map(function (it?: any) { return it.slot; });
        var neu: any = shuffled(6, prev);
        items.forEach(function (it?: any, i?: any) { it.slot = neu[i]; });
        layout();
        items.forEach(sendHome);
      } else { busy = true; }
    }
    var tg: any = doneActive && doneT < GLOW_S ? 1 : 0;
    cups.forEach(function (cp?: any) {
      if (Math.abs(cp.glow - tg) > 0.005) { cp.glow += (tg - cp.glow) * Math.min(1, dt / 400); busy = true; }
      else { cp.glow = tg; }
    });
    paint();
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
  layout();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (board.parentNode) { board.parentNode.removeChild(board); }
  };
}

export default function KubeczkiActivity() {
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
