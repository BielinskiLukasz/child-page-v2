// Activity "Koraliki": drag eight big beads from a bowl onto a string to make a necklace. No wrong answers:
// a bead released away from the string drifts back to the bowl; a bead on the string can be dragged off again.
// With all 8 threaded the necklace glows softly, waits, then the beads drift back to the bowl in a new order.
// One rAF loop (works under prefers-reduced-motion, pauses when the tab is hidden, stops when idle); fixed DOM
// of 8 beads + bowl/string buttons. The string runs in one row, or curves into two rows on narrow screens.
import { useEffect, useRef } from 'react';

var N: any = 8, GLOW_MS: any = 3000, WAIT_MS: any = 4000;
var DEFS: any = [
  { label: 'różowe kółko', color: '#f7a8c9', glow: '#f58fb8',
    path: '<circle cx="50" cy="50" r="40" fill="FILL"/>' },
  { label: 'niebieski kwadrat', color: '#a8d8f0', glow: '#8cc8ea',
    path: '<rect x="12" y="12" width="76" height="76" rx="20" fill="FILL"/>' },
  { label: 'zielony sześciokąt', color: '#bfe6b4', glow: '#9fd990',
    path: '<path d="M50 9 L85 29 L85 71 L50 91 L15 71 L15 29 Z" fill="FILL" stroke="FILL" stroke-width="8" stroke-linejoin="round"/>' },
  { label: 'fioletowy romb', color: '#c9b8f2', glow: '#b39cf0',
    path: '<path d="M50 8 L88 50 L50 92 L12 50 Z" fill="FILL" stroke="FILL" stroke-width="8" stroke-linejoin="round"/>' },
  { label: 'żółta gwiazdka', color: '#fff0a0', glow: '#ffe66b',
    path: '<path d="M50 10 L61 38 L91 38 L67 56 L76 87 L50 69 L24 87 L33 56 L9 38 L39 38 Z" fill="FILL" stroke="FILL" stroke-width="8" stroke-linejoin="round"/>' },
  { label: 'czerwone serduszko', color: '#f7b0b8', glow: '#f58f9c',
    path: '<path d="M50 86 C14 60 10 34 28 24 C40 18 48 26 50 34 C52 26 60 18 72 24 C90 34 86 60 50 86 Z" fill="FILL" stroke="FILL" stroke-width="6" stroke-linejoin="round"/>' },
  { label: 'pomarańczowy owal', color: '#ffc9a0', glow: '#ffb27a',
    path: '<ellipse cx="50" cy="50" rx="44" ry="30" fill="FILL"/>' },
  { label: 'miętowy kwiatek', color: '#a8e0d6', glow: '#82d2c4',
    path: '<g fill="FILL"><circle cx="50" cy="22" r="19"/><circle cx="76" cy="37" r="19"/><circle cx="76" cy="65" r="19"/><circle cx="50" cy="78" r="19"/><circle cx="24" cy="65" r="19"/><circle cx="24" cy="37" r="19"/><circle cx="50" cy="50" r="24"/></g>' }
];
var VB: any = 'viewBox="0 0 100 100" aria-hidden="true" focusable="false"';

function beadSvg(def?: any) {
  return '<svg ' + VB + '>' + def.path.replace(/FILL/g, def.color) +
    '<circle cx="50" cy="50" r="10" fill="rgba(255,255,255,.8)"/>' +
    '<ellipse cx="34" cy="30" rx="9" ry="5" transform="rotate(-35 34 30)" fill="rgba(255,255,255,.55)"/></svg>';
}
function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
function shuffled(n?: any, avoid?: any) {
  var a: any, tries: any = 0;
  do {
    a = [];
    for (var i: any = 0; i < n; i++) { a.push(i); }
    for (var j: any = n - 1; j > 0; j--) { var k: any = Math.floor(Math.random() * (j + 1)), t: any = a[j]; a[j] = a[k]; a[k] = t; }
    tries++;
  } while (avoid && tries < 20 && a.every(function (v?: any, i?: any) { return v === avoid[i]; }));
  return a;
}
function segDist(px?: any, py?: any, ax?: any, ay?: any, bx?: any, by?: any) {
  var dx: any = bx - ax, dy: any = by - ay, l2: any = dx * dx + dy * dy;
  var t: any = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var board: any = document.createElement('div');
  board.className = 'kr';
  board.innerHTML = '<div class="kr-glow"></div><div class="kr-field"><svg class="kr-deco" aria-hidden="true" focusable="false"></svg></div>';
  container.appendChild(board);
  var field: any = board.querySelector('.kr-field'), glowEl: any = board.querySelector('.kr-glow'), deco: any = board.querySelector('.kr-deco');

  var S: any = 64, fw: any = 0, fh: any = 0, pts: any = [], slots: any = [], homes: any = [], homeOrder: any = shuffled(N), string: any = [], selected: any = null;
  var raf: any = 0, last: any = 0, doneT: any = -1, doneGlow: any = 0;
  var beads: any = [];

  DEFS.forEach(function (def?: any, i?: any) {
    var el: any = document.createElement('button');
    el.type = 'button'; el.className = 'kr-bead';
    el.setAttribute('aria-pressed', 'false');
    el.innerHTML = beadSvg(def);
    field.appendChild(el);
    var b: any = { def: def, el: el, home: homeOrder[i], onString: false, mode: 'idle', pid: null, dx: 0, dy: 0,
      x: 0, y: 0, fx: 0, fy: 0, gx: 0, gy: 0, gt: 0, gd: 1, glow: 0 };
    beads.push(b);
    label(b);
    el.addEventListener('pointerdown', function (e?: any) { down(b, e); });
    el.addEventListener('pointermove', function (e?: any) { move(b, e); });
    el.addEventListener('pointerup', function (e?: any) { up(b, e); });
    el.addEventListener('pointercancel', function (e?: any) { up(b, e); });
    el.addEventListener('lostpointercapture', function (e?: any) { up(b, e); });
    el.addEventListener('click', function (e?: any) { if (e.detail === 0) { activate(b); } });
  });
  var strBtn: any = document.createElement('button');
  strBtn.type = 'button'; strBtn.className = 'kr-string';
  strBtn.setAttribute('aria-label', 'Nitka (wybierz koralik, potem nitkę)');
  field.appendChild(strBtn);
  strBtn.addEventListener('click', function () { if (selected) { threadIt(selected); } });

  function label(b?: any) {
    b.el.setAttribute('aria-label', 'Koralik: ' + b.def.label +
      (b.onString ? ' (na nitce, Enter zdejmuje)' : ' (Enter lub spacja, potem wybierz nitkę)'));
  }

  function layout() {
    var r: any = field.getBoundingClientRect();
    fw = r.width; fh = r.height;
    var m: any = 12, extra: any = 78; // side margin; knot + hook room
    var s1: any = (fw - 2 * m - extra) / (N * 1.04);
    var two: any = s1 < 56;
    var sw: any = two ? (fw - 2 * m - extra) / (4 * 1.04) : s1;
    var rows: any = two ? 2 : 1; void rows;
    // Bowl: one row of 8 when the screen is wide enough, otherwise 4x2 (keeps short landscape screens usable).
    var cols: any = fw - 2 * m >= 9 * Math.max(56, Math.min(84, sw)) ? N : 4;
    var sh: any = (fh - 8) / ((two ? 2.65 : 1.35) + 0.3 + (N / cols) * 1.12 + 0.5);
    S = Math.max(56, Math.min(84, sw, sh));
    field.style.setProperty('--kr-s', S + 'px');
    var pitch: any = S * 1.04, perRow: any = two ? 4 : N, y1: any = S * 0.85, y2: any = y1 + S * 1.3;
    var x0: any = (fw - perRow * pitch) / 2 + pitch / 2;
    slots = [];
    for (var i: any = 0; i < N; i++) {
      var row: any = two ? Math.floor(i / 4) : 0, c: any = two ? i % 4 : i;
      slots.push([x0 + c * pitch, row ? y2 : y1]);
    }
    var last: any = slots[N - 1];
    // Polyline of the string: knot, every slot, open end (used for drawing and for the "near the string" test).
    pts = [[slots[0][0] - pitch / 2 - 16, slots[0][1]]].concat(slots, [[last[0] + pitch / 2 + 22, last[1]]]);
    // Bowl: 4x2 resting places at the bottom.
    var hp: any = S * 1.12, bw: any = cols * hp + S * 0.5, bh: any = (N / cols) * hp + S * 0.5, bx: any = (fw - bw) / 2, by: any = fh - 6 - bh;
    homes = [];
    for (var h: any = 0; h < N; h++) { homes.push([bx + bw / 2 + ((h % cols) - (cols - 1) / 2) * hp, by + S * 0.25 + hp / 2 + Math.floor(h / cols) * hp + 2]); }
    drawDeco(bx, by, bw, bh);
    var top: any = Math.min(y1, y2) - S / 2 - 8, bot: any = (two ? y2 : y1) + S / 2 + 8;
    strBtn.style.cssText = 'left:0;top:' + top + 'px;width:' + fw + 'px;height:' + (bot - top) + 'px';
    glowEl.style.background = 'radial-gradient(ellipse ' + fw * 0.55 + 'px ' + (bot - top) * 0.9 + 'px at 50% ' +
      (field.getBoundingClientRect().top + (top + bot) / 2) + 'px, rgba(255,233,168,.8), rgba(255,233,168,0) 75%)';
    beads.forEach(function (b?: any) {
      if (b.mode === 'drag') { cancelDrag(b); }
      var t: any = target(b);
      if (b.mode === 'glide') { glideTo(b, t[0], t[1], true); } else { b.x = t[0]; b.y = t[1]; b.gx = t[0]; b.gy = t[1]; }
      place(b);
    });
  }
  function drawDeco(bx?: any, by?: any, bw?: any, bh?: any) {
    // CSS (.stage svg { 120px }) beats width/height attributes, so the size is set inline: one coordinate space with the field
    deco.style.width = fw + 'px'; deco.style.height = fh + 'px';
    deco.setAttribute('width', fw); deco.setAttribute('height', fh);
    deco.setAttribute('viewBox', '0 0 ' + fw + ' ' + fh);
    var d: any = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i: any = 1; i < pts.length; i++) {
      if (i === 5 && slots[4][1] !== slots[3][1]) { // string curves from the first row into the second
        var a: any = pts[4], b: any = pts[5];
        d += ' L' + a[0] + ' ' + a[1] + ' C' + (a[0] + S * 0.9) + ' ' + a[1] + ' ' + (b[0] - S * 0.9) + ' ' + b[1] + ' ' + b[0] + ' ' + b[1];
      } else { d += ' L' + pts[i][0] + ' ' + pts[i][1]; }
    }
    var ex: any = pts[pts.length - 1][0], ey: any = pts[pts.length - 1][1];
    deco.innerHTML =
      '<path d="M' + bx + ' ' + (by + S * 0.15) + ' Q' + (bx + bw / 2) + ' ' + (by + bh * 1.35) + ' ' + (bx + bw) + ' ' + (by + S * 0.15) +
      ' Z" fill="#fbe7c8" stroke="#e8cfa6" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="#c9a0c0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + pts[0][0] + '" cy="' + pts[0][1] + '" r="9" fill="#b58aad"/>' +
      '<path d="M' + (ex + 10) + ' ' + (ey - 18) + ' v22 a11 11 0 1 0 11 -11" fill="none" stroke="#9fb7d8" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="' + ex + '" cy="' + ey + '" r="4" fill="#c9a0c0"/>';
  }
  function target(b?: any) {
    return b.onString ? slots[string.indexOf(b)] : homes[b.home];
  }
  function place(b?: any) { b.el.style.transform = 'translate(' + (b.x - S / 2) + 'px,' + (b.y - S / 2) + 'px)'; }
  function paintGlow(b?: any) {
    var g: any = b.glow + doneGlow * 0.7;
    b.el.style.filter = g > 0.01 ? 'drop-shadow(0 0 ' + (4 + 14 * g) + 'px ' + b.def.glow + ')' : '';
  }

  // Glide: smoothstep from the current position; always re-startable from wherever the bead is.
  function glideTo(b?: any, x?: any, y?: any, quick?: any) {
    var d: any = Math.hypot(x - b.x, y - b.y);
    b.fx = b.x; b.fy = b.y; b.gx = x; b.gy = y; b.gt = 0;
    b.gd = quick ? 200 : (reduced() ? 300 : Math.min(1300, 600 + d * 0.9));
    b.mode = 'glide';
    b.el.style.zIndex = '2';
    start();
  }
  // Make every bead on the string glide to the slot matching its place (after a bead joined or left).
  function syncString() {
    string.forEach(function (b?: any, i?: any) {
      if (b.mode === 'drag') { return; }
      if (b.gx !== slots[i][0] || b.gy !== slots[i][1] || (b.mode === 'idle' && (b.x !== b.gx || b.y !== b.gy))) { glideTo(b, slots[i][0], slots[i][1]); }
    });
    doneT = -1;
  }
  function leaveString(b?: any) {
    var i: any = string.indexOf(b);
    if (i >= 0) { string.splice(i, 1); }
    b.onString = false; label(b);
  }
  function threadIt(b?: any) {
    select(null);
    if (b.mode === 'drag') { return; }
    if (!b.onString) { string.push(b); b.onString = true; label(b); }
    syncString();
  }
  function sendHome(b?: any) {
    leaveString(b);
    glideTo(b, homes[b.home][0], homes[b.home][1]);
    syncString();
  }

  function cancelDrag(b?: any) {
    if (b.pid !== null) { try { b.el.releasePointerCapture(b.pid); } catch (e: any) { /* already released */ } }
    b.pid = null; b.mode = 'idle'; sendHome(b);
  }
  function down(b?: any, e?: any) {
    if (b.pid !== null || (e.button !== undefined && e.button > 0)) { return; }
    var r: any = field.getBoundingClientRect();
    b.pid = e.pointerId; b.mode = 'drag';
    b.dx = b.x - (e.clientX - r.left); b.dy = b.y - (e.clientY - r.top);
    b.el.style.zIndex = '5';
    select(null);
    if (b.onString) { leaveString(b); syncString(); }
    try { b.el.setPointerCapture(e.pointerId); } catch (err: any) { /* synthetic pointer */ }
    e.preventDefault();
  }
  function move(b?: any, e?: any) {
    if (b.mode !== 'drag' || e.pointerId !== b.pid) { return; }
    var r: any = field.getBoundingClientRect();
    var px: any = e.clientX - r.left + b.dx, py: any = e.clientY - r.top + b.dy;
    // Keep the bead centre inside the visible screen so it can never be lost off-screen.
    b.x = Math.max(-r.left + S / 2, Math.min(window.innerWidth - r.left - S / 2, px));
    b.y = Math.max(-r.top + S / 2, Math.min(window.innerHeight - r.top - S / 2, py));
    place(b);
  }
  function nearString(b?: any) {
    for (var i: any = 1; i < pts.length; i++) {
      if (segDist(b.x, b.y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) < S * 0.9) { return true; }
    }
    return false;
  }
  function up(b?: any, e?: any) {
    if (b.mode !== 'drag' || e.pointerId !== b.pid) { return; }
    try { b.el.releasePointerCapture(b.pid); } catch (err: any) { /* already released */ }
    b.pid = null; b.mode = 'idle';
    if (string.length < N && nearString(b)) { threadIt(b); } else { sendHome(b); }
  }

  function select(b?: any) {
    selected = b && selected !== b && !b.onString ? b : null;
    beads.forEach(function (o?: any) {
      var on: any = o === selected;
      o.el.setAttribute('aria-pressed', on ? 'true' : 'false');
      o.el.classList.toggle('kr-selected', on);
    });
  }
  function activate(b?: any) {
    if (b.mode === 'drag') { return; }
    if (b.onString) { select(null); sendHome(b); } else { select(b); }
  }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min(now - last, 50); last = now;
    var busy: any = false, allIdle: any = true;
    beads.forEach(function (b?: any) {
      if (b.mode === 'glide') {
        b.gt += dt;
        var k: any = smooth(b.gt / b.gd);
        b.x = b.fx + (b.gx - b.fx) * k; b.y = b.fy + (b.gy - b.fy) * k;
        place(b);
        if (b.gt >= b.gd) { b.mode = 'idle'; b.x = b.gx; b.y = b.gy; place(b); b.el.style.zIndex = ''; }
        else { busy = true; }
      }
      if (b.mode !== 'idle') { allIdle = false; }
    });
    // Necklace complete: glow, wait, then the beads drift back to the bowl in a new order (time only advances while visible).
    if (string.length === N && allIdle && doneT < 0) { doneT = 0; }
    var tg: any = 0;
    if (doneT >= 0) {
      doneT += dt;
      tg = doneT < GLOW_MS ? 1 : 0;
      if (doneT >= GLOW_MS + WAIT_MS) {
        doneT = -1; tg = 0;
        var prev: any = beads.map(function (b?: any) { return b.home; }), order: any = shuffled(N, prev);
        string.slice().forEach(function (b?: any) { leaveString(b); });
        beads.forEach(function (b?: any, i?: any) { b.home = order[i]; glideTo(b, homes[b.home][0], homes[b.home][1]); });
      } else { busy = true; }
    }
    if (Math.abs(doneGlow - tg) > 0.005) { doneGlow += (tg - doneGlow) * Math.min(1, dt / 450); busy = true; }
    else { doneGlow = tg; }
    glowEl.style.opacity = String(doneGlow);
    beads.forEach(paintGlow);
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
  beads.forEach(paintGlow);

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (board.parentNode) { board.parentNode.removeChild(board); }
  };
}

export default function KoralikiActivity() {
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
