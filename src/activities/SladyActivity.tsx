// Activity "Ślady na Piasku": a sand beach or a snowy field (alternating, never the same twice in a row) hides a picture
// (shell, starfish, snowman, tree). A finger (or arrows + Enter/Space) leaves tracks that dig through the surface canvas:
// paw prints every 40 px, footprints every 48 px (alternating left/right) or a wavy line 16 px wide. Tracks are kept in coordinates
// relative to the board, so rotation / resize only redraws the canvas. Uncovered area is measured on a 40x40 grid of the cells inside
// the picture; at 70% the rest of the surface fades over 1 s, the picture glows for 3 s and a tiny animal appears, then a new scene starts.
// One capped-dt rAF loop (running only during the fade/glow) drives all of it, so it works under prefers-reduced-motion. Nothing is stored.
// Usage metrics: track('interaction', {variant: track type}) per stroke start; complete() when the picture is uncovered.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';

var NS: any = 'http://www.w3.org/2000/svg';
var GRID: any = 40, GOAL: any = 0.7, FADE_S: any = 1, GLOW_S: any = 3, MAX_DT: any = 0.05, MAX_ITEMS: any = 5000;
var PAW_GAP: any = 40, FOOT_GAP: any = 48, LINE_W: any = 16, LINE_STEP: any = 6, WAVE_LEN: any = 56, WAVE_AMP: any = 9;
var R_PX: any = { paw: 17, foot: 15, line: LINE_W / 2 };
var TYPES: any = ['paw', 'foot', 'line'];
var TYPE_NAMES: any = { paw: 'Łapki', foot: 'Stópki', line: 'Wężyk' };

function circle(cx?: any, cy?: any, r?: any) {
  return 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0Z';
}
function star() {
  var pts: any = [];
  for (var i: any = 0; i < 10; i++) {
    var r: any = i % 2 ? 19 : 46, a: any = -Math.PI / 2 + i * Math.PI / 5;
    pts.push((50 + r * Math.cos(a)).toFixed(1) + ' ' + (52 + r * Math.sin(a)).toFixed(1));
  }
  return 'M' + pts.join('L') + 'Z';
}
var SHELL: any = 'M50 90C20 82 6 54 18 34C30 14 70 14 82 34C94 54 80 82 50 90Z';
var STAR: any = star();
var SNOWMAN: any = circle(50, 70, 24) + circle(50, 33, 17);
var TREE: any = 'M50 6L78 40H62L88 68H12L38 40H22Z M43 68H57V92H43Z';
// body = coverage path and fill; deco = extra drawing on top (not counted).
var PICTURES: any = {
  shell: { scene: 'sand', d: SHELL, fill: '#f6b6a0', deco: '<path d="M50 88L50 26M50 88L28 32M50 88L72 32M50 88L16 46M50 88L84 46" stroke="#c97a62" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M34 90H66" stroke="#c97a62" stroke-width="3" stroke-linecap="round"/>' },
  starfish: { scene: 'sand', d: STAR, fill: '#f4a259', deco: '<circle cx="50" cy="52" r="4" fill="#d9772a"/><circle cx="50" cy="30" r="2.4" fill="#d9772a"/><circle cx="71" cy="46" r="2.4" fill="#d9772a"/><circle cx="63" cy="70" r="2.4" fill="#d9772a"/><circle cx="37" cy="70" r="2.4" fill="#d9772a"/><circle cx="29" cy="46" r="2.4" fill="#d9772a"/>' },
  snowman: { scene: 'snow', d: SNOWMAN, fill: '#ffffff', deco: '<circle cx="44" cy="30" r="2.4" fill="#3d3a4f"/><circle cx="56" cy="30" r="2.4" fill="#3d3a4f"/><path d="M50 35L64 38L50 41Z" fill="#f08a3c"/><circle cx="50" cy="62" r="2.6" fill="#3d3a4f"/><circle cx="50" cy="72" r="2.6" fill="#3d3a4f"/><circle cx="50" cy="82" r="2.6" fill="#3d3a4f"/><path d="M36 20H64M41 20V6H59V20" stroke="#5b5675" stroke-width="4" fill="#5b5675" stroke-linejoin="round"/><path d="M26 60L12 48M74 60L88 48" stroke="#8d6847" stroke-width="3" stroke-linecap="round"/>' },
  tree: { scene: 'snow', d: TREE, fill: '#5fae6e', deco: '<circle cx="42" cy="56" r="3" fill="#ee6a5f"/><circle cx="62" cy="58" r="3" fill="#f4d03f"/><circle cx="50" cy="28" r="3" fill="#a8d8f0"/><path d="M50 4L52 9L57 9L53 12L55 17L50 14L45 17L47 12L43 9L48 9Z" fill="#f4d03f"/>' }
};
var SCENES: any = {
  sand: { names: ['shell', 'starfish'], surface: '#f1dca4', speck: '#d9be80', bed: '#c9a468', animal: 'crab' },
  snow: { names: ['snowman', 'tree'], surface: '#f6f9fd', speck: '#cfdcf0', bed: '#c3d4ea', animal: 'penguin' }
};
var ANIMALS: any = {
  crab: '<ellipse cx="50" cy="56" rx="26" ry="18" fill="#ee6a5f"/><circle cx="40" cy="38" r="6" fill="#fff"/><circle cx="60" cy="38" r="6" fill="#fff"/><circle cx="40" cy="38" r="3" fill="#3d3a4f"/><circle cx="60" cy="38" r="3" fill="#3d3a4f"/><path d="M26 50Q10 44 12 30Q22 32 28 42M74 50Q90 44 88 30Q78 32 72 42" fill="#ee6a5f" stroke="#c9453d" stroke-width="3"/><path d="M30 70L20 82M42 74L38 88M58 74L62 88M70 70L80 82" stroke="#c9453d" stroke-width="4" stroke-linecap="round"/>',
  penguin: '<ellipse cx="50" cy="56" rx="26" ry="34" fill="#3d3a4f"/><ellipse cx="50" cy="62" rx="16" ry="24" fill="#fff"/><circle cx="42" cy="38" r="3" fill="#fff"/><circle cx="58" cy="38" r="3" fill="#fff"/><circle cx="42" cy="38" r="1.5" fill="#3d3a4f"/><circle cx="58" cy="38" r="1.5" fill="#3d3a4f"/><path d="M44 46L56 46L50 54Z" fill="#f4a63c"/><path d="M38 88H48M52 88H62" stroke="#f4a63c" stroke-width="5" stroke-linecap="round"/>'
};
// Button pictures: a paw, a shoe sole and a wavy line, each a distinct shape.
var PAW_SVG: any = '<ellipse cx="0" cy="5" rx="8" ry="6.5" fill="#8d6847"/><ellipse cx="-9" cy="-3" rx="3.4" ry="4.4" fill="#8d6847"/><ellipse cx="-3.4" cy="-9" rx="3.4" ry="4.4" fill="#8d6847"/><ellipse cx="3.4" cy="-9" rx="3.4" ry="4.4" fill="#8d6847"/><ellipse cx="9" cy="-3" rx="3.4" ry="4.4" fill="#8d6847"/>';
var FOOT_SVG: any = '<ellipse cx="0" cy="-4" rx="7" ry="10" fill="#5b5675"/><ellipse cx="0" cy="10" rx="5" ry="5.4" fill="#5b5675"/>';
var LINE_SVG: any = '<path d="M-12 4Q-8-8-4 0T4 0T12-4" stroke="#2f8f6a" stroke-width="5" fill="none" stroke-linecap="round"/>';
var BTN_SVG: any = { paw: PAW_SVG, foot: FOOT_SVG, line: LINE_SVG };

function report(fn?: any) { try { if (Analytics) { fn(Analytics); } } catch (e: any) { /* metrics must never break the activity */ } }
function clamp(v?: any, a?: any, b?: any) { return v < a ? a : v > b ? b : v; }
function el(tag?: any, cls?: any) { var e: any = document.createElement(tag); if (cls) { e.className = cls; } return e; }
function sv(tag?: any, attrs?: any) {
  var e: any = document.createElementNS(NS, tag);
  for (var k in attrs) { if (attrs.hasOwnProperty(k)) { e.setAttribute(k, attrs[k]); } }
  return e;
}

function mount(container: HTMLElement) {
  var root: any = el('div', 'sp');
  var board: any = el('div', 'sp-board');
  board.tabIndex = 0;
  board.setAttribute('role', 'application');
  board.setAttribute('aria-label', 'Ślady na piasku: strzałki przesuwają kółko, Enter lub spacja zostawia ślad');
  var under: any = sv('svg', { 'class': 'sp-svg sp-under', viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' });
  var bed: any = sv('rect', { x: '0', y: '0', width: '100', height: '100' });
  var picG: any = sv('g', {});
  under.appendChild(bed); under.appendChild(picG);
  var canvas: any = el('canvas', 'sp-canvas');
  var animal: any = sv('svg', { 'class': 'sp-svg sp-animal', viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' });
  var animalG: any = sv('g', {});
  animal.appendChild(animalG);
  var ring: any = el('div', 'sp-ring');
  board.appendChild(under); board.appendChild(canvas); board.appendChild(animal); board.appendChild(ring);

  var ctrls: any = el('div', 'sp-ctrls');
  var btns: any = {};
  TYPES.forEach(function (t?: any) {
    var b: any = el('button', 'sp-btn');
    b.type = 'button';
    b.setAttribute('aria-label', TYPE_NAMES[t]);
    b.innerHTML = '<svg class="sp-btnsvg" viewBox="-16 -16 32 32" aria-hidden="true" focusable="false">' + BTN_SVG[t] + '</svg>';
    b.addEventListener('click', function () { selectType(t); });
    ctrls.appendChild(b); btns[t] = b;
  });
  root.appendChild(board); root.appendChild(ctrls);
  container.appendChild(root);

  var ctx: any = canvas.getContext('2d');
  var scratch: any = document.createElement('canvas');
  scratch.width = 1; scratch.height = 1;
  var sctx: any = scratch.getContext && scratch.getContext('2d');
  var type: any = TYPES[Math.floor(Math.random() * TYPES.length)];
  var sceneKey: any = Math.random() < 0.5 ? 'sand' : 'snow', picName: any = null, lastPic: any = null;
  var items: any = [], specks: any = [], cells: any = null, covered: any = 0, total: any = 1;
  var cur: any = null, mainPtr: any = null, keyDown: any = false, kx: any = 0.3, ky: any = 0.5, kang: any = -Math.PI / 2;
  var size: any = 0, dpr: any = 1, raf: any = 0, last: any = 0, phase: any = 'play', phaseT: any = 0, surfOp: any = 1, animOp: any = 0;

  function pickPicture() {
    var names: any = SCENES[sceneKey].names;
    var n: any = names[Math.floor(Math.random() * names.length)];
    if (n === lastPic && names.length > 1) { n = names[0] === n ? names[1] : names[0]; }
    lastPic = n; return n;
  }
  function setScene(key?: any) {
    sceneKey = key;
    var sc: any = SCENES[key], pic: any = PICTURES[picName = pickPicture()];
    bed.setAttribute('fill', sc.bed);
    picG.innerHTML = '';
    picG.appendChild(sv('path', { d: pic.d, fill: pic.fill, stroke: 'rgba(91,86,117,.45)', 'stroke-width': '1.4', 'stroke-linejoin': 'round' }));
    var deco: any = sv('g', {}); deco.innerHTML = pic.deco; picG.appendChild(deco);
    animalG.innerHTML = ANIMALS[sc.animal];
    root.classList.remove('sp-glow');
    root.setAttribute('data-scene', key);
    specks = [];
    for (var i: any = 0; i < 160; i++) { specks.push([Math.random(), Math.random(), 0.004 + Math.random() * 0.006]); }
    items = []; cur = null; surfOp = 1; animOp = 0;
    buildGrid(); redraw(); apply();
  }
  function buildGrid() {
    cells = new Uint8Array(GRID * GRID); covered = 0; total = 0;
    var p: any = new Path2D(PICTURES[picName].d);
    for (var y: any = 0; y < GRID; y++) {
      for (var x: any = 0; x < GRID; x++) {
        var inside: any = sctx && sctx.isPointInPath(p, (x + 0.5) * 100 / GRID, (y + 0.5) * 100 / GRID);
        cells[y * GRID + x] = inside ? 1 : 0;
        if (inside) { total++; }
      }
    }
    if (!total) { total = 1; }
  }
  function mark(x?: any, y?: any, rRel?: any) {
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

  // ---- drawing: the surface is painted, then tracks dig holes (destination-out) through it
  function paintSurface() {
    var sc: any = SCENES[sceneKey], k: any = size;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = sc.surface; ctx.fillRect(0, 0, k, k);
    ctx.fillStyle = sc.speck;
    for (var i: any = 0; i < specks.length; i++) {
      ctx.beginPath(); ctx.arc(specks[i][0] * k, specks[i][1] * k, specks[i][2] * k, 0, Math.PI * 2); ctx.fill();
    }
  }
  function stampShape(it?: any) {   // draws a paw or foot at it (relative pos + angle), in the current fill
    var k: any = size, x: any = it.x * k, y: any = it.y * k;
    ctx.save(); ctx.translate(x, y); ctx.rotate(it.a + Math.PI / 2);
    if (it.t === 'paw') {
      var s: any = R_PX.paw / 17;
      ctx.scale(s, s);
      ctx.beginPath(); ctx.ellipse(0, 6, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
      [[-11, -4], [-4.2, -11], [4.2, -11], [11, -4]].forEach(function (q?: any) {
        ctx.beginPath(); ctx.ellipse(q[0], q[1], 4.2, 5.4, 0, 0, Math.PI * 2); ctx.fill();
      });
    } else {
      var f: any = R_PX.foot / 15;
      ctx.scale(f, f);
      ctx.beginPath(); ctx.ellipse(it.side * 2, -5, 7.5, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(it.side * 2, 11, 5.4, 5.8, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function digItem(it?: any, from?: any) {   // from: index of the first line point to draw (incremental), 0 for a full replay
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = ctx.strokeStyle = '#000';
    if (it.t === 'line') {
      var k: any = size, pts: any = it.pts;
      ctx.lineWidth = LINE_W; ctx.lineCap = ctx.lineJoin = 'round';
      if (pts.length === 1) {
        ctx.beginPath(); ctx.arc(pts[0][0] * k, pts[0][1] * k, LINE_W / 2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(pts[Math.max(0, from - 1)][0] * k, pts[Math.max(0, from - 1)][1] * k);
        for (var i: any = Math.max(1, from); i < pts.length; i++) { ctx.lineTo(pts[i][0] * k, pts[i][1] * k); }
        ctx.stroke();
      }
    } else { stampShape(it); }
    ctx.globalCompositeOperation = 'source-over';
  }
  function redraw() {
    if (!size) { return; }
    canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintSurface();
    for (var i: any = 0; i < items.length; i++) { digItem(items[i], 0); }
  }
  function layout() {
    var w: any = board.clientWidth || Math.min(window.innerWidth, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (Math.abs(w - size) > 0.5) { size = w; redraw(); }
    placeRing();
  }

  // ---- tracks
  function canPlay() { return phase === 'play'; }
  function stamp(t?: any, x?: any, y?: any, a?: any) {
    if (items.length >= MAX_ITEMS) { return; }
    var it: any = { t: t, x: x, y: y, a: a, side: cur ? cur.side : 1 };
    if (cur) { cur.side = -cur.side; }
    items.push(it);
    digItem(it, 0);
    mark(x, y, R_PX[t] / size);
  }
  function lineAdd(x?: any, y?: any) {   // append a point to the current wavy line and dig the new piece
    if (!cur.item || cur.item.pts.length > MAX_ITEMS) { return; }
    var it: any = cur.item;
    it.pts.push([x, y]);
    digItem(it, it.pts.length - 1);
    mark(x, y, R_PX.line / size);
  }
  function wavePoint(x?: any, y?: any, a?: any, dist?: any) {
    var off: any = Math.sin(dist / WAVE_LEN * Math.PI * 2) * WAVE_AMP / size;
    return [clamp(x - Math.sin(a) * off, 0, 1), clamp(y + Math.cos(a) * off, 0, 1)];
  }
  function beginStroke(p?: any, ang?: any) {
    if (!canPlay() || cur) { return; }
    cur = { t: type, x: p[0], y: p[1], a: ang, acc: 0, dist: 0, side: 1, item: null };
    report(function (A?: any) { A.track('interaction', { variant: type }); });
    if (type === 'line') {
      cur.item = { t: 'line', pts: [] }; items.push(cur.item);
      var q: any = wavePoint(p[0], p[1], ang, 0); lineAdd(q[0], q[1]);
    } else { offsetStamp(p[0], p[1], ang); cur.acc = 0; }
    checkGoal();
  }
  function offsetStamp(x?: any, y?: any, a?: any) {   // footprints alternate left/right of the path; paws stay on it
    if (cur.t === 'foot') {
      var o: any = cur.side * 9 / size;
      stamp('foot', clamp(x - Math.sin(a) * o, 0, 1), clamp(y + Math.cos(a) * o, 0, 1), a);
    } else { stamp('paw', x, y, a); }
  }
  function strokeTo(p?: any) {
    if (!cur) { return; }
    var dx: any = (p[0] - cur.x) * size, dy: any = (p[1] - cur.y) * size, d: any = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.5) { return; }
    var a: any = Math.atan2(dy, dx), step: any = cur.t === 'line' ? LINE_STEP : (cur.t === 'paw' ? PAW_GAP : FOOT_GAP);
    var pos: any = 0, sx: any = cur.x, sy: any = cur.y;
    while (pos < d && canPlay()) {
      var need: any = step - cur.acc, left: any = d - pos;
      if (need > left) { cur.acc += left; pos = d; break; }
      pos += need; cur.acc = 0; cur.dist += step;
      var x: any = sx + dx / size * pos / d, y: any = sy + dy / size * pos / d;
      if (cur.t === 'line') { var q: any = wavePoint(x, y, a, cur.dist); lineAdd(q[0], q[1]); } else { offsetStamp(x, y, a); }
      if (checkGoal()) { break; }
    }
    if (cur) { cur.x = p[0]; cur.y = p[1]; cur.a = a; }
  }
  function checkGoal() {
    if (phase !== 'play') { return true; }
    if (covered / total >= GOAL) {
      phase = 'fade'; phaseT = 0; cur = null; mainPtr = null; keyDown = false;
      report(function (A?: any) { A.complete(); });
      start();
      return true;
    }
    return false;
  }
  function rel(e?: any) {
    var r: any = board.getBoundingClientRect(), s: any = r.width || size || 1;
    return [clamp((e.clientX - r.left) / s, 0, 1), clamp((e.clientY - r.top) / s, 0, 1)];
  }
  function onDown(e?: any) {
    if (mainPtr !== null || !canPlay()) { return; }
    if (e.pointerType === 'mouse' && e.button !== 0) { return; }
    mainPtr = e.pointerId;
    try { board.setPointerCapture(e.pointerId); } catch (err: any) { /* ignore */ }
    e.preventDefault();
    beginStroke(rel(e), -Math.PI / 2);
  }
  function onMove(e?: any) { if (e.pointerId === mainPtr) { strokeTo(rel(e)); } }
  function onUp(e?: any) { if (e.pointerId === mainPtr) { mainPtr = null; cur = null; } }

  // ---- keyboard: arrows move the ring, Enter/Space leaves a track (held + arrows draws along)
  var KSTEP: any = 0.03;
  function placeRing() {
    ring.style.left = (kx * 100) + '%'; ring.style.top = (ky * 100) + '%';
    ring.style.width = ring.style.height = '56px';
  }
  function onKey(e?: any) {
    var dx: any = 0, dy: any = 0;
    if (e.key === 'ArrowLeft') { dx = -KSTEP; } else if (e.key === 'ArrowRight') { dx = KSTEP; }
    else if (e.key === 'ArrowUp') { dy = -KSTEP; } else if (e.key === 'ArrowDown') { dy = KSTEP; }
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (!e.repeat && !keyDown && canPlay() && mainPtr === null) { keyDown = true; beginStroke([kx, ky], kang); }
      return;
    } else { return; }
    e.preventDefault();
    kang = Math.atan2(dy, dx);
    kx = clamp(kx + dx, 0, 1); ky = clamp(ky + dy, 0, 1);
    placeRing();
    if (keyDown) { strokeTo([kx, ky]); }
  }
  function onKeyUp(e?: any) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { if (keyDown) { keyDown = false; cur = null; } }
  }
  function onBlur() { keyDown = false; if (mainPtr === null) { cur = null; } }

  function selectType(t?: any) {
    type = t;
    TYPES.forEach(function (n?: any) { btns[n].setAttribute('aria-pressed', n === t ? 'true' : 'false'); btns[n].classList.toggle('sp-on', n === t); });
    if (mainPtr === null && !keyDown) { cur = null; }
  }

  // ---- fade, glow, next scene
  function apply() {
    canvas.style.opacity = surfOp.toFixed(2);
    animal.style.opacity = animOp.toFixed(2);
  }
  function frame(now?: any) {
    var dt: any = Math.min((now - last) / 1000, MAX_DT);
    last = now; phaseT += dt;
    if (phase === 'fade') {
      surfOp = Math.max(0, 1 - phaseT / FADE_S);
      if (phaseT >= FADE_S) { surfOp = 0; phase = 'glow'; phaseT = 0; root.classList.add('sp-glow'); animOp = 1; }
    } else if (phase === 'glow') {
      if (phaseT >= GLOW_S) { setScene(sceneKey === 'sand' ? 'snow' : 'sand'); phase = 'play'; }
    }
    apply();
    raf = phase === 'play' ? 0 : requestAnimationFrame(frame);
  }
  function start() {
    if (raf || document.hidden) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } cur = null; mainPtr = null; keyDown = false; }
    else if (phase !== 'play') { start(); }
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
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);

  selectType(type);
  setScene(sceneKey);
  layout();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function SladyActivity() {
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
