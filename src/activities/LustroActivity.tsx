// Activity "Lustro": a big outline (butterfly, house or tree) is split by a soft dashed centre line. A finger (or arrow keys + Enter/Space)
// paints on either half and the same stroke appears at once at the mirrored position (x -> 1 - x) in the same colour and width (at least 14 px).
// Paint is clipped to the outline and kept as strokes in coordinates relative to the board, so rotation / resize only redraws the canvas.
// Painted area is measured on a 40x40 grid of the outline's cells; at 70% the picture glows for 3 s, then the next outline (shuffled bag,
// each once before repeats) fades in on a clean canvas. A round "wipe" button clears the picture with a 0.5 s fade. Only the first pointer paints.
// One capped-dt rAF loop (running only while something fades) drives all fades, so it works under prefers-reduced-motion. Nothing is stored.
// Usage metrics: track('interaction', {variant: outline id}) per stroke; complete() when the glow starts; open-ended.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';

var NS: any = 'http://www.w3.org/2000/svg';
var GRID: any = 40, GOAL: any = 0.7, MIN_PX: any = 14, REL_W: any = 0.05, STEP: any = 0.03, MIN_STEP: any = 0.004;
var GLOW_S: any = 3, OUT_S: any = 0.3, IN_S: any = 0.5, WIPE_S: any = 0.5, MAX_DT: any = 0.05, MAX_PTS: any = 6000;
var COLORS: any = ['#e8605a', '#f4a63c', '#f2d13c', '#5cb85c', '#4a9fe0', '#9b6ad0'];
var COLOR_NAMES: any = ['czerwony', 'pomarańczowy', 'żółty', 'zielony', 'niebieski', 'fioletowy'];

function mirrorPath(d?: any) {   // absolute M/C/L/Z paths only: mirror every x about the centre line (x = 50)
  var n: any = 0;
  return d.replace(/-?\d+(\.\d+)?/g, function (m?: any) { return (n++ % 2 === 0) ? String(100 - parseFloat(m)) : m; });
}
function circle(cx?: any, cy?: any, r?: any) {
  return 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0Z';
}
var WING_R: any = 'M50 36C58 10 96 6 94 34C93 48 74 52 52 50Z M52 52C76 54 90 64 84 82C78 96 56 88 52 66Z';
var OUTLINES: any = [
  { id: 'butterfly',
    d: WING_R + mirrorPath(WING_R) + 'M50 28C57 28 57 40 55 56C54 72 54 82 50 86C46 82 46 72 45 56C43 40 43 28 50 28Z',
    deco: 'M50 28C48 18 44 12 40 9M50 28C52 18 56 12 60 9' },
  { id: 'house',
    d: 'M8 46L50 8L92 46Z M18 44H82V92H18Z',
    deco: 'M42 92V66H58V92 M66 56H76V68H66Z' },
  { id: 'tree',
    d: circle(50, 30, 22) + circle(30, 46, 16) + circle(70, 46, 16) + 'M42 50H58V92H42Z',
    deco: 'M50 92Q50 80 44 74' }
];

function report(fn?: any) { try { if (Analytics) { fn(Analytics); } } catch (e: any) { /* metrics must never break the activity */ } }
function clamp(v?: any, a?: any, b?: any) { return v < a ? a : v > b ? b : v; }
function el(tag?: any, cls?: any) { var e: any = document.createElement(tag); if (cls) { e.className = cls; } return e; }
function sv(tag?: any, attrs?: any) {
  var e: any = document.createElementNS(NS, tag);
  for (var k in attrs) { if (attrs.hasOwnProperty(k)) { e.setAttribute(k, attrs[k]); } }
  return e;
}

// Pattern cue for each colour dot (white marks over the colour): stripes, dots, zigzag, checks, waves, cross.
var CUES: any = [
  '<path d="M-6-10L-10-6M-6-2L-2-6M-6 6L6-6M2 8L10 0M6 10L10 6" stroke="#fff" stroke-width="2.4" fill="none"/>',
  '<circle cx="-6" cy="-5" r="2.6" fill="#fff"/><circle cx="6" cy="-5" r="2.6" fill="#fff"/><circle cx="0" cy="3" r="2.6" fill="#fff"/><circle cx="-7" cy="8" r="2.6" fill="#fff"/><circle cx="7" cy="8" r="2.6" fill="#fff"/>',
  '<path d="M-10 4L-5-4L0 4L5-4L10 4" stroke="#fff" stroke-width="2.6" fill="none" stroke-linejoin="round"/>',
  '<path d="M-8-8H-2V-2H-8ZM2-2H8V4H2ZM-8 4H-2V10H-8Z" fill="#fff"/>',
  '<path d="M-10-4Q-5-9 0-4T10-4M-10 4Q-5-1 0 4T10 4" stroke="#fff" stroke-width="2.4" fill="none"/>',
  '<path d="M0-9V9M-9 0H9" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'
];
var SPONGE: any = '<rect x="-12" y="-9" width="24" height="18" rx="6" fill="#f2d13c"/><circle cx="-5" cy="-3" r="2" fill="#d9a800"/><circle cx="4" cy="2" r="2.4" fill="#d9a800"/><circle cx="-2" cy="5" r="1.6" fill="#d9a800"/><circle cx="7" cy="-4" r="1.5" fill="#d9a800"/>';

function mount(container: HTMLElement) {
  var root: any = el('div', 'lu');
  var board: any = el('div', 'lu-board');
  board.tabIndex = 0;
  board.setAttribute('role', 'application');
  board.setAttribute('aria-label', 'Lustro: strzałki przesuwają pędzel, Enter lub spacja maluje, a druga połowa maluje to samo');
  var bg: any = sv('svg', { 'class': 'lu-svg lu-bg', viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' });
  var fillPath: any = sv('path', { fill: '#fffdf6', 'fill-rule': 'nonzero' });
  bg.appendChild(fillPath);
  var canvas: any = el('canvas', 'lu-canvas');
  var fg: any = sv('svg', { 'class': 'lu-svg lu-fg', viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' });
  var linePath: any = sv('path', { fill: 'none', stroke: '#8f7fd1', 'stroke-width': '1.6', 'stroke-linejoin': 'round' });
  var decoPath: any = sv('path', { fill: 'none', stroke: '#8f7fd1', 'stroke-width': '1.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '.7' });
  var centre: any = sv('line', { x1: '50', y1: '2', x2: '50', y2: '98', stroke: '#8f7fd1', 'stroke-width': '0.9', 'stroke-dasharray': '3 3', 'stroke-linecap': 'round', opacity: '.55' });
  fg.appendChild(linePath); fg.appendChild(decoPath); fg.appendChild(centre);
  var ring: any = el('div', 'lu-ring');
  board.appendChild(bg); board.appendChild(canvas); board.appendChild(fg); board.appendChild(ring);

  var ctrls: any = el('div', 'lu-ctrls');
  var dots: any = [];
  COLORS.forEach(function (c?: any, i?: any) {
    var b: any = el('button', 'lu-dot');
    b.type = 'button';
    b.setAttribute('aria-label', 'Kolor ' + COLOR_NAMES[i]);
    b.innerHTML = '<svg class="lu-dotsvg" viewBox="-16 -16 32 32" aria-hidden="true" focusable="false"><circle r="15" fill="' + c + '"/>' + CUES[i] + '</svg>';
    b.addEventListener('click', function () { selectColor(i); });
    ctrls.appendChild(b); dots.push(b);
  });
  var wipeBtn: any = el('button', 'lu-wipe');
  wipeBtn.type = 'button';
  wipeBtn.setAttribute('aria-label', 'Wytrzyj obrazek');
  wipeBtn.innerHTML = '<svg class="lu-dotsvg" viewBox="-16 -16 32 32" aria-hidden="true" focusable="false">' + SPONGE + '</svg>';
  ctrls.appendChild(wipeBtn);
  root.appendChild(board); root.appendChild(ctrls);
  container.appendChild(root);

  var ctx: any = canvas.getContext('2d');
  var strokes: any = [], cur: any = null, curColor: any = Math.floor(Math.random() * COLORS.length);
  var outlineIdx: any = -1, bag: any = [];
  var cells: any = null, covered: any = 0, total: any = 1;          // coverage grid
  var size: any = 0, dpr: any = 1, raf: any = 0, last: any = 0;
  var phase: any = 'paint', phaseT: any = 0, boardOp: any = 1, paintOp: any = 1;
  var mainPtr: any = null, keyDown: any = false, kx: any = 0.3, ky: any = 0.5, ptCount: any = 0;
  var scratch: any = document.createElement('canvas');
  scratch.width = 1; scratch.height = 1;
  var sctx: any = scratch.getContext && scratch.getContext('2d');

  function nextOutline() {
    if (!bag.length) {
      bag = [0, 1, 2];
      for (var i: any = bag.length - 1; i > 0; i--) { var j: any = Math.floor(Math.random() * (i + 1)); var t: any = bag[i]; bag[i] = bag[j]; bag[j] = t; }
      if (bag[bag.length - 1] === outlineIdx && bag.length > 1) { var s: any = bag[0]; bag[0] = bag[bag.length - 1]; bag[bag.length - 1] = s; }
    }
    return bag.pop();
  }
  function setOutline(idx?: any) {
    outlineIdx = idx;
    var o: any = OUTLINES[idx];
    fillPath.setAttribute('d', o.d); linePath.setAttribute('d', o.d); decoPath.setAttribute('d', o.deco);
    strokes = []; cur = null; ptCount = 0;
    buildGrid();
    clipAndRedraw();
  }
  function buildGrid() {
    cells = new Uint8Array(GRID * GRID); covered = 0; total = 0;
    var p: any = new Path2D(OUTLINES[outlineIdx].d);
    for (var y: any = 0; y < GRID; y++) {
      for (var x: any = 0; x < GRID; x++) {
        var inside: any = sctx && sctx.isPointInPath(p, (x + 0.5) * 100 / GRID, (y + 0.5) * 100 / GRID);
        cells[y * GRID + x] = inside ? 1 : 0;
        if (inside) { total++; }
      }
    }
    if (!total) { total = 1; }
  }
  function mark(x?: any, y?: any, rRel?: any) {   // x, y, rRel relative to the board; marks inside cells within the brush radius
    var r: any = rRel * GRID, cx: any = x * GRID, cy: any = y * GRID;
    var x0: any = Math.max(0, Math.floor(cx - r)), x1: any = Math.min(GRID - 1, Math.floor(cx + r));
    var y0: any = Math.max(0, Math.floor(cy - r)), y1: any = Math.min(GRID - 1, Math.floor(cy + r));
    for (var gy: any = y0; gy <= y1; gy++) {
      for (var gx: any = x0; gx <= x1; gx++) {
        var dx: any = gx + 0.5 - cx, dy: any = gy + 0.5 - cy;
        if (dx * dx + dy * dy <= r * r && cells[gy * GRID + gx] === 1) { cells[gy * GRID + gx] = 2; covered++; }
      }
    }
  }
  function markPoint(x?: any, y?: any, w?: any) { mark(x, y, w / 2); mark(1 - x, y, w / 2); }

  function lineW(s?: any) { return Math.max(MIN_PX, s.w * size); }
  function drawSeg(s?: any, i?: any) {   // draws point i of stroke s (dot for the first point, segment from the previous otherwise) and its mirror
    var a: any = s.pts[i], b: any = s.pts[i - 1] || a, k: any = size;
    ctx.strokeStyle = ctx.fillStyle = COLORS[s.c];
    ctx.lineWidth = lineW(s); ctx.lineCap = ctx.lineJoin = 'round';
    for (var m: any = 0; m < 2; m++) {
      var ax: any = (m ? 1 - a[0] : a[0]) * k, ay: any = a[1] * k, bx: any = (m ? 1 - b[0] : b[0]) * k, by: any = b[1] * k;
      if (i === 0) { ctx.beginPath(); ctx.arc(ax, ay, lineW(s) / 2, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ax, ay); ctx.stroke(); }
    }
  }
  function clipAndRedraw() {
    if (!size) { return; }
    canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    ctx.setTransform(size * dpr / 100, 0, 0, size * dpr / 100, 0, 0);
    ctx.clip(new Path2D(OUTLINES[outlineIdx].d));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (var i: any = 0; i < strokes.length; i++) { for (var j: any = 0; j < strokes[i].pts.length; j++) { drawSeg(strokes[i], j); } }
  }
  function layout() {
    var w: any = board.clientWidth || Math.min(window.innerWidth, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (Math.abs(w - size) > 0.5) { size = w; clipAndRedraw(); }
    placeRing();
  }

  // ---- painting
  function rel(e?: any) {
    var r: any = board.getBoundingClientRect(), s: any = r.width || size || 1;
    return [clamp((e.clientX - r.left) / s, 0, 1), clamp((e.clientY - r.top) / s, 0, 1)];
  }
  function canPaint() { return phase === 'paint' || phase === 'in'; }
  function beginStroke(p?: any) {
    if (!canPaint() || cur) { return; }
    var w: any = Math.max(MIN_PX, REL_W * size) / size;
    cur = { c: curColor, w: w, pts: [] };
    strokes.push(cur);
    report(function (A?: any) { A.track('interaction', { variant: OUTLINES[outlineIdx].id }); });
    addPoint(p);
  }
  function addPoint(p?: any) {
    if (!cur || ptCount > MAX_PTS) { return; }
    var q: any = cur.pts[cur.pts.length - 1];
    if (q) {
      var dx: any = p[0] - q[0], dy: any = p[1] - q[1], d: any = Math.sqrt(dx * dx + dy * dy);
      if (d < MIN_STEP) { return; }
      var n: any = Math.max(1, Math.ceil(d / 0.01));   // fast drags: fill the gap so the grid and the line have no holes
      for (var i: any = 1; i <= n; i++) { push([q[0] + dx * i / n, q[1] + dy * i / n]); }
    } else { push(p); }
    checkGoal();
  }
  function push(p?: any) {
    cur.pts.push(p); ptCount++;
    drawSeg(cur, cur.pts.length - 1);
    markPoint(p[0], p[1], cur.w);
  }
  function endStroke() { cur = null; }
  function checkGoal() {
    if (phase === 'glow' || !canPaint()) { return; }
    if (covered / total >= GOAL) {
      phase = 'glow'; phaseT = 0; endStroke();
      root.classList.add('lu-glow');
      report(function (A?: any) { A.complete(); });
      start();
    }
  }

  function onDown(e?: any) {
    if (mainPtr !== null) { return; }
    if (e.pointerType === 'mouse' && e.button !== 0) { return; }
    mainPtr = e.pointerId;
    try { board.setPointerCapture(e.pointerId); } catch (err: any) { /* ignore */ }
    e.preventDefault();
    beginStroke(rel(e));
  }
  function onMove(e?: any) { if (e.pointerId === mainPtr) { addPoint(rel(e)); } }
  function onUp(e?: any) { if (e.pointerId === mainPtr) { mainPtr = null; endStroke(); } }

  // ---- keyboard: arrows move the brush ring, Enter/Space paints while held
  function placeRing() {
    ring.style.left = (kx * 100) + '%'; ring.style.top = (ky * 100) + '%';
    ring.style.width = ring.style.height = Math.max(MIN_PX, REL_W * size) + 'px';
  }
  function onKey(e?: any) {
    var dx: any = 0, dy: any = 0;
    if (e.key === 'ArrowLeft') { dx = -STEP; } else if (e.key === 'ArrowRight') { dx = STEP; }
    else if (e.key === 'ArrowUp') { dy = -STEP; } else if (e.key === 'ArrowDown') { dy = STEP; }
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (!e.repeat && !keyDown) { keyDown = true; beginStroke([kx, ky]); }
      return;
    } else { return; }
    e.preventDefault();
    kx = clamp(kx + dx, 0, 1); ky = clamp(ky + dy, 0, 1);
    placeRing();
    if (keyDown) { addPoint([kx, ky]); }
  }
  function onKeyUp(e?: any) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { keyDown = false; endStroke(); }
  }
  function onBlur() { keyDown = false; if (mainPtr === null) { endStroke(); } }

  function selectColor(i?: any) {
    curColor = i;
    dots.forEach(function (b?: any, n?: any) { b.setAttribute('aria-pressed', n === i ? 'true' : 'false'); b.classList.toggle('lu-on', n === i); });
    if (cur && mainPtr === null && !keyDown) { endStroke(); }
  }

  // ---- fades
  function wipe() {
    if (phase !== 'paint') { return; }
    endStroke(); mainPtr = null; keyDown = false;
    phase = 'wipe'; phaseT = 0; start();
  }
  function clearPaint() {
    strokes = []; cur = null; ptCount = 0; buildGrid(); clipAndRedraw();
  }
  function apply() {
    board.style.opacity = boardOp.toFixed(2);
    canvas.style.opacity = paintOp.toFixed(2);
  }
  function frame(now?: any) {
    var dt: any = Math.min((now - last) / 1000, MAX_DT);
    last = now; phaseT += dt;
    if (phase === 'wipe') {
      paintOp = Math.max(0, 1 - phaseT / WIPE_S);
      if (phaseT >= WIPE_S) { clearPaint(); paintOp = 1; phase = 'paint'; }
    } else if (phase === 'glow') {
      if (phaseT >= GLOW_S) { phase = 'out'; phaseT = 0; }
    } else if (phase === 'out') {
      boardOp = Math.max(0, 1 - phaseT / OUT_S);
      if (phaseT >= OUT_S) {
        root.classList.remove('lu-glow');
        boardOp = 0; paintOp = 1;
        setOutline(nextOutline());
        phase = 'in'; phaseT = 0;
      }
    } else if (phase === 'in') {
      boardOp = Math.min(1, phaseT / IN_S);
      if (phaseT >= IN_S) { boardOp = 1; phase = 'paint'; }
    }
    apply();
    raf = phase === 'paint' ? 0 : requestAnimationFrame(frame);
  }
  function start() {
    if (raf || document.hidden) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } endStroke(); mainPtr = null; keyDown = false; }
    else if (phase !== 'paint') { start(); }
  }
  function onResize() { layout(); }

  board.addEventListener('pointerdown', onDown);
  board.addEventListener('pointermove', onMove);
  board.addEventListener('pointerup', onUp);
  board.addEventListener('pointercancel', onUp);
  board.addEventListener('lostpointercapture', onUp);
  board.addEventListener('keydown', onKey);
  board.addEventListener('keyup', onKeyUp);
  board.addEventListener('blur', onBlur);
  wipeBtn.addEventListener('click', wipe);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);

  selectColor(curColor);
  setOutline(nextOutline());
  layout();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function LustroActivity() {
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
