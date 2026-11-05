// Activity "Myjnia": a muddy vehicle (6 types x 6 colours) or animal (6 kinds) in a car wash, V V A V V A ... in random order per launch. Dragging a finger over it scrubs the mud away
// (a persistent mud mask on a canvas in logical coordinates, so resize/rotation keeps the cleaned areas) and releases a
// few soap bubbles from a bounded pool. At ~90% clean the rest of the mud fades, the vehicle glows ~3 s, a few extra
// bubbles float up and ~4 s later a new muddy vehicle fades in. Keyboard: arrow keys move the brush, Enter/Space
// advance it along a zig-zag path. One capped-dt rAF loop (pauses while hidden, stops when idle); nothing is stored.
import { useEffect, useRef } from 'react';
import { Rand } from '../utils/rand';

var LW: any = 480, LH: any = 288;            // logical size of the mud mask (the vehicle box is 5:3)
var VB: any = 200;                      // vehicle drawings use a 200x120 viewBox
var MAX_BUBBLES: any = 28, BUBBLE_S: any = 1.8, SPAWN_GAP_S: any = 0.09;
var DONE_AT: any = 0.9, FADE_MUD_S: any = 1.2, GLOW_S: any = 3, NEXT_AT_S: any = 7, SWAP_S: any = 0.7;

function circ(cx?: any, cy?: any, r?: any) { return 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0Z'; }
function rrect(x?: any, y?: any, w?: any, h?: any, r?: any) {
  return 'M' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h - r) +
    'Q' + (x + w) + ' ' + (y + h) + ' ' + (x + w - r) + ' ' + (y + h) + 'H' + (x + r) + 'Q' + x + ' ' + (y + h) + ' ' + x + ' ' + (y + h - r) +
    'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'Z';
}
// Vehicle bodies use the placeholder fill 'BODY', replaced by one of COLOURS when an item is built.
var COLOURS: any = ['#f7a8c9', '#ffd98a', '#9fd0f0', '#a8dcb0', '#ffb98a', '#c9b4ec'];
var GLASS: any = '#dff1fb', TYRE: any = '#8a84a8', HUB: any = '#d9d4ec';
function wheel(cx?: any, cy?: any, r?: any) { return [{ d: circ(cx, cy, r), fill: TYRE }, { d: circ(cx, cy, r * 0.4), fill: HUB }]; }
function legs(a?: any, b?: any, y?: any, h?: any, fill?: any) { return { d: rrect(a, y, 20, h, 8) + rrect(b, y, 20, h, 8), fill: fill }; }
var VEHICLES: any = [
  { label: 'samochód', shapes: [
    { d: 'M14 84Q14 58 44 54L62 34Q68 28 80 28H124Q134 28 142 36L158 54Q188 58 188 84V92H14Z', fill: 'BODY' },
    { d: 'M70 36H98V54H60ZM104 36H126L142 54H104Z', fill: GLASS }
  ].concat(wheel(58, 94, 17), wheel(148, 94, 17), [{ d: 'M176 70h10v10h-10z', fill: '#fff0a8' }]) },
  { label: 'autobus', shapes: [
    { d: rrect(10, 22, 180, 72, 16), fill: 'BODY' },
    { d: rrect(22, 34, 26, 24, 5) + rrect(54, 34, 26, 24, 5) + rrect(86, 34, 26, 24, 5) + rrect(118, 34, 26, 24, 5), fill: GLASS },
    { d: rrect(152, 34, 28, 48, 6), fill: '#fbe7c8' }
  ].concat(wheel(48, 96, 16), wheel(150, 96, 16)) },
  { label: 'ciężarówka', shapes: [
    { d: rrect(8, 26, 116, 64, 8), fill: 'BODY' },
    { d: 'M128 46H154Q166 46 172 60L190 70V92H128Z', fill: '#f4efe6' },
    { d: 'M136 52H156Q162 52 166 60H136Z', fill: GLASS }
  ].concat(wheel(36, 96, 15), wheel(86, 96, 15), wheel(158, 96, 15)) },
  { label: 'furgonetka', shapes: [
    { d: 'M12 90V40Q12 26 28 26H132Q146 26 154 40L176 62Q190 68 190 82V90Z', fill: 'BODY' },
    { d: rrect(24, 36, 70, 24, 6), fill: GLASS },
    { d: 'M122 36H136Q142 36 148 46L156 58H122Z', fill: GLASS }
  ].concat(wheel(52, 94, 16), wheel(152, 94, 16)) },
  { label: 'traktor', shapes: [
    { d: rrect(70, 44, 90, 34, 10), fill: 'BODY' },
    { d: rrect(78, 18, 44, 40, 8), fill: 'BODY' },
    { d: rrect(86, 26, 28, 22, 5), fill: GLASS },
    { d: rrect(150, 30, 8, 22, 3), fill: '#8a84a8' }
  ].concat(wheel(86, 82, 28), wheel(156, 92, 18)) },
  { label: 'kamper', shapes: [
    { d: rrect(8, 24, 140, 68, 14), fill: 'BODY' },
    { d: 'M144 44H166Q182 44 190 64V92H144Z', fill: '#f4efe6' },
    { d: rrect(22, 36, 32, 24, 5) + rrect(64, 36, 32, 24, 5), fill: GLASS },
    { d: 'M152 52H168Q174 52 178 62H152Z', fill: GLASS }
  ].concat(wheel(46, 96, 16), wheel(150, 96, 16)) }
];
// Muddy animals (no 'BODY' placeholder; each has its own colours).
var ANIMALS: any = [
  { label: 'słoń', shapes: [
    { d: 'M46 52Q46 28 96 28Q148 28 150 56Q152 84 146 92H50Q44 84 46 52Z', fill: '#c9d6e8' },
    { d: circ(148, 50, 26), fill: '#c9d6e8' },
    { d: 'M170 56Q190 60 186 84Q184 98 172 96Q180 84 168 74Z', fill: '#c9d6e8' },
    { d: circ(128, 44, 18), fill: '#b4c4dc' },
    legs(54, 112, 80, 32, '#b4c4dc'),
    { d: circ(156, 44, 3.5), fill: '#5b5675' }] },
  { label: 'świnka', shapes: [
    { d: rrect(34, 38, 118, 56, 28), fill: '#f9b8c8' },
    { d: circ(158, 62, 25), fill: '#f9b8c8' },
    { d: 'M144 42l6-18 16 12zM166 38l12-14 6 18z', fill: '#f2a0b6' },
    { d: rrect(172, 58, 18, 14, 6), fill: '#f2a0b6' },
    legs(50, 112, 86, 24, '#f2a0b6'),
    { d: 'M34 56q-14-4-10-16', fill: '#f2a0b6' },
    { d: circ(160, 54, 3.5), fill: '#5b5675' }] },
  { label: 'krowa', shapes: [
    { d: rrect(30, 34, 122, 58, 22), fill: '#f4f1ea' },
    { d: rrect(146, 38, 40, 40, 14), fill: '#f4f1ea' },
    { d: circ(70, 56, 14) + circ(112, 70, 12), fill: '#6f6a85' },
    { d: 'M150 36l-6-12 14 6zM178 36l8-12 2 14z', fill: '#d9d4ec' },
    { d: rrect(166, 62, 20, 16, 7), fill: '#f6c3cf' },
    legs(44, 112, 84, 28, '#e6e1d6'),
    { d: circ(160, 52, 3.5), fill: '#5b5675' }] },
  { label: 'hipopotam', shapes: [
    { d: rrect(28, 36, 128, 56, 26), fill: '#b9b4d6' },
    { d: rrect(128, 40, 62, 46, 20), fill: '#b9b4d6' },
    { d: circ(142, 36, 8) + circ(170, 36, 8), fill: '#a39dc6' },
    { d: circ(176, 66, 3) + circ(162, 66, 3), fill: '#8a84a8' },
    legs(44, 104, 86, 24, '#a39dc6'),
    { d: circ(156, 52, 3.5), fill: '#5b5675' }] },
  { label: 'piesek', shapes: [
    { d: rrect(34, 44, 112, 48, 22), fill: '#f2c98c' },
    { d: circ(156, 52, 24), fill: '#f2c98c' },
    { d: 'M140 38Q128 50 138 70Q150 62 150 44Z', fill: '#b98a5a' },
    { d: circ(170, 60, 5), fill: '#5b5675' },
    { d: 'M38 54Q18 46 16 30Q30 34 40 46Z', fill: '#f2c98c' },
    legs(48, 108, 86, 26, '#e0b57a'),
    { d: circ(158, 48, 3.5), fill: '#5b5675' }] },
  { label: 'owieczka', shapes: [
    { d: circ(60, 62, 24) + circ(90, 50, 26) + circ(122, 58, 24) + circ(80, 76, 22) + circ(112, 78, 22), fill: '#f6f1e6' },
    { d: circ(156, 60, 20), fill: '#6f6a85' },
    { d: 'M140 46q-10 4-8 16q8-2 12-10z', fill: '#5b5675' },
    legs(66, 106, 84, 28, '#6f6a85'),
    { d: circ(162, 56, 3), fill: '#f4efe6' }] }
];

// Weighted pick of the next animal: the dog weighs 3, every other animal 1; never the previous animal (so the dog never repeats).
var DOG_WEIGHT: any = 3, lastAnimal: any = null;
function pickAnimal() {
  var pool: any = ANIMALS.filter(function (a?: any) { return a !== lastAnimal; });
  var w: any = pool.map(function (a?: any) { return a.label === 'piesek' ? DOG_WEIGHT : 1; });
  var r: any = Math.random() * w.reduce(function (x?: any, y?: any) { return x + y; }, 0), i: any = 0;
  while (i < pool.length - 1 && r >= w[i]) { r -= w[i]; i++; }
  lastAnimal = pool[i];
  return lastAnimal;
}

// Item n of a launch: a vehicle in a random type and colour, with an animal after every two vehicles (V V A V V A ...).
function makeItem(n?: any) {
  if (n % 3 === 2) {
    var an: any = pickAnimal();
    return { label: an.label, animal: true, shapes: an.shapes };
  }
  var v: any = Rand.pickOne(VEHICLES, 'myjnia-vehicle'), col: any = Rand.pickOne(COLOURS, 'myjnia-colour');
  return { label: v.label, animal: false, shapes: v.shapes.map(function (sh?: any) { return { d: sh.d, fill: sh.fill === 'BODY' ? col : sh.fill }; }) };
}

function svgFor(v?: any) {
  var s: any = '<svg viewBox="0 0 200 120" aria-hidden="true" focusable="false">' +
    '<ellipse cx="100" cy="110" rx="86" ry="6" fill="#000" fill-opacity=".08"/>';
  v.shapes.forEach(function (sh?: any) { s += '<path d="' + sh.d + '" fill="' + sh.fill + '"/>'; });
  return s + '<path d="M30 70Q34 56 52 54" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/></svg>';
}
function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var board: any = document.createElement('div');
  board.className = 'mj';
  board.innerHTML = '<div class="mj-field"><div class="mj-foam mj-f1"></div><div class="mj-foam mj-f2"></div><div class="mj-foam mj-f3"></div>' +
    '<div class="mj-box" tabindex="0" role="application" aria-label="Brudny pojazd. Strzałki przesuwają szczotkę, Enter lub spacja szoruje dalej.">' +
    '<div class="mj-clean"></div><canvas class="mj-mud" width="' + LW + '" height="' + LH + '"></canvas>' +
    '<div class="mj-brush"></div><div class="mj-bubbles"></div></div></div>';
  container.appendChild(board);
  var field: any = board.querySelector('.mj-field'), box: any = board.querySelector('.mj-box'), clean: any = board.querySelector('.mj-clean'),
    mud: any = board.querySelector('.mj-mud'), brushEl: any = board.querySelector('.mj-brush'), bubWrap: any = board.querySelector('.mj-bubbles');
  var ctx: any = mud.getContext('2d');
  var small: any = document.createElement('canvas');
  small.width = 48; small.height = 29;
  var sctx: any = small.getContext('2d', { willReadFrequently: true });

  var bubbles: any = [];
  for (var b: any = 0; b < MAX_BUBBLES; b++) {
    var bn: any = document.createElement('div');
    bn.className = 'mj-bub';
    bn.style.display = 'none';
    bubWrap.appendChild(bn);
    bubbles.push({ node: bn, age: -1, x: 0, y: 0, r: 0, dx: 0 });
  }

  var item: any = null, seq: any = 0, baseline: any = 1, boxW: any = 300, brushLogical: any = 40;
  var phase: any = 'play', phaseT: any = 0, mudOp: any = 1, glow: any = 0, boxOp: any = 1, swapDir: any = 0;
  var pointers: any = {}, lastSpawn: any = 0, dirty: any = false, checkT: any = 0, kx: any = 0.15, ky: any = 0.35, kdir: any = 1, raf: any = 0, last: any = 0, clock: any = 0;

  function remaining() {
    sctx.clearRect(0, 0, 48, 29);
    sctx.drawImage(mud, 0, 0, 48, 29);
    var d: any = sctx.getImageData(0, 0, 48, 29).data, s: any = 0;
    for (var i: any = 3; i < d.length; i += 4) { s += d[i]; }
    return s;
  }
  function drawMud() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, LW, LH);
    var k: any = LW / VB;
    ctx.save();
    ctx.scale(k, k);
    ctx.fillStyle = '#b99a7a';
    item.shapes.forEach(function (sh?: any) { ctx.fill(new Path2D(sh.d)); });
    ctx.restore();
    // darker blotches only where the mud is
    ctx.globalCompositeOperation = 'source-atop';
    for (var i: any = 0; i < 46; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(140,105,72,.32)' : 'rgba(210,180,140,.3)';
      ctx.beginPath();
      ctx.arc(Math.random() * LW, Math.random() * LH, 8 + Math.random() * 26, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    baseline = Math.max(1, remaining());
  }
  function setItem(it?: any) {
    item = it;
    clean.innerHTML = svgFor(item);
    box.setAttribute('aria-label', (item.animal ? 'Brudne zwierzę: ' : 'Brudny pojazd: ') + item.label + '. Strzałki przesuwają szczotkę, Enter lub spacja szoruje dalej.');
    drawMud();
    mudOp = 1; mud.style.opacity = '1';
    glow = 0; phase = 'play'; phaseT = 0; kx = 0.15; ky = 0.35; kdir = 1;
  }

  function erase(x0?: any, y0?: any, x1?: any, y1?: any) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = brushLogical;
    ctx.strokeStyle = '#000';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    dirty = true;
  }
  function toLogical(e?: any) {
    var r: any = box.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * LW, (e.clientY - r.top) / r.height * LH];
  }
  function spawnBubble(lx?: any, ly?: any) {
    for (var k: any = 0; k < bubbles.length; k++) {
      var bb: any = bubbles[k];
      if (bb.age >= 0) { continue; }
      bb.age = 0; bb.x = lx / LW; bb.y = ly / LH; bb.r = 0.02 + Math.random() * 0.025; bb.dx = (Math.random() - 0.5) * 0.04;
      bb.node.style.display = '';
      bb.node.style.width = bb.node.style.height = (bb.r * 200) + '%';
      return;
    }
  }
  function maybeSpawn(lx?: any, ly?: any) {
    if (clock - lastSpawn < SPAWN_GAP_S) { return; }
    lastSpawn = clock;
    spawnBubble(lx + (Math.random() - 0.5) * 30, ly + (Math.random() - 0.5) * 20);
  }

  function down(e?: any) {
    if (phase !== 'play' && phase !== 'done') { return; }
    var p: any = toLogical(e);
    pointers[e.pointerId] = p;
    try { box.setPointerCapture(e.pointerId); } catch (err: any) { /* synthetic pointer */ }
    erase(p[0], p[1], p[0], p[1]);
    maybeSpawn(p[0], p[1]);
    e.preventDefault();
    start();
  }
  function move(e?: any) {
    var prev: any = pointers[e.pointerId];
    if (!prev || phase === 'swap') { return; }
    var p: any = toLogical(e);
    erase(prev[0], prev[1], p[0], p[1]);
    maybeSpawn(p[0], p[1]);
    pointers[e.pointerId] = p;
    start();
  }
  function up(e?: any) { delete pointers[e.pointerId]; }

  function brushTo(nx?: any, ny?: any) {
    var x0: any = kx * LW, y0: any = ky * LH;
    kx = Math.max(0.04, Math.min(0.96, nx)); ky = Math.max(0.06, Math.min(0.94, ny));
    if (phase === 'swap') { return; }
    erase(x0, y0, kx * LW, ky * LH);
    maybeSpawn(kx * LW, ky * LH);
    brushEl.style.left = (kx * 100) + '%'; brushEl.style.top = (ky * 100) + '%';
    start();
  }
  function onKey(e?: any) {
    var step: any = 0.07, handled: any = true;
    if (e.key === 'ArrowLeft') { brushTo(kx - step, ky); }
    else if (e.key === 'ArrowRight') { brushTo(kx + step, ky); }
    else if (e.key === 'ArrowUp') { brushTo(kx, ky - step); }
    else if (e.key === 'ArrowDown') { brushTo(kx, ky + step); }
    else if (e.key === 'Enter' || e.key === ' ') {
      // zig-zag across the vehicle in steps
      var nx: any = kx + kdir * step;
      if (nx > 0.96 || nx < 0.04) { kdir = -kdir; brushTo(kx, ky + 0.12 > 0.94 ? 0.06 : ky + 0.12); }
      else { brushTo(nx, ky); }
    } else { handled = false; }
    if (handled) { e.preventDefault(); }
  }
  function onFocus() { brushEl.style.display = 'block'; brushEl.style.left = (kx * 100) + '%'; brushEl.style.top = (ky * 100) + '%'; }
  function onBlur() { brushEl.style.display = 'none'; }

  function paintBubbles() {
    bubbles.forEach(function (bb?: any) {
      if (bb.age < 0) { return; }
      var u: any = bb.age / BUBBLE_S;
      bb.node.style.left = ((bb.x + bb.dx * u) * 100).toFixed(2) + '%';
      bb.node.style.top = ((bb.y - 0.18 * smooth(u)) * 100).toFixed(2) + '%';
      bb.node.style.opacity = (0.8 * (1 - u * u)).toFixed(3);
    });
  }
  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min((now - last) / 1000, 0.05); last = now; clock += dt;
    var busy: any = false;
    bubbles.forEach(function (bb?: any) {
      if (bb.age < 0) { return; }
      bb.age += dt;
      if (bb.age >= BUBBLE_S) { bb.age = -1; bb.node.style.display = 'none'; } else { busy = true; }
    });
    paintBubbles();
    if (dirty && phase === 'play') {
      checkT += dt;
      if (checkT >= 0.12) {
        checkT = 0; dirty = false;
        if (remaining() / baseline <= 1 - DONE_AT) {
          phase = 'done'; phaseT = 0;
          for (var i: any = 0; i < 6; i++) { spawnBubble(LW * (0.2 + 0.12 * i), LH * (0.3 + 0.3 * Math.random())); }
        }
      } else { busy = true; }
    }
    if (phase === 'done') {
      phaseT += dt; busy = true;
      mudOp = reduced() ? 0 : Math.max(0, 1 - phaseT / FADE_MUD_S);
      mud.style.opacity = mudOp.toFixed(3);
      glow = phaseT < GLOW_S ? Math.min(1, phaseT / 0.5) : Math.max(0, 1 - (phaseT - GLOW_S) / 0.5);
      box.style.filter = glow > 0.01 ? 'drop-shadow(0 0 ' + (6 + 16 * glow) + 'px #ffe08a)' : '';
      if (phaseT >= NEXT_AT_S) { phase = 'swap'; phaseT = 0; swapDir = -1; pointers = {}; }
    } else if (phase === 'swap') {
      phaseT += dt; busy = true;
      boxOp += swapDir * dt / SWAP_S;
      if (swapDir < 0 && boxOp <= 0) { boxOp = 0; seq++; setItem(makeItem(seq)); phase = 'swap'; swapDir = 1; // (setVehicle resets the phase)
        box.style.filter = ''; }
      else if (swapDir > 0 && boxOp >= 1) { boxOp = 1; phase = 'play'; swapDir = 0; }
      box.style.opacity = boxOp.toFixed(3);
    }
    if (busy) { raf = requestAnimationFrame(frame); }
  }
  function start() {
    if (raf || document.hidden) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }

  function layout() {
    var r: any = field.getBoundingClientRect();
    boxW = Math.max(120, Math.min(r.width * 0.96, r.height * 0.9 * 5 / 3, 680));
    box.style.width = boxW + 'px'; box.style.height = (boxW * 3 / 5) + 'px';
    brushLogical = Math.max(44, boxW * 0.11) / boxW * LW;   // brush at least 44 CSS px wide
  }
  function onResize() { layout(); }

  box.addEventListener('pointerdown', down);
  box.addEventListener('pointermove', move);
  box.addEventListener('pointerup', up);
  box.addEventListener('pointercancel', up);
  box.addEventListener('lostpointercapture', up);
  box.addEventListener('keydown', onKey);
  box.addEventListener('focus', onFocus);
  box.addEventListener('blur', onBlur);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  layout();
  setItem(makeItem(0));

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (board.parentNode) { board.parentNode.removeChild(board); }
  };
}

export default function MyjniaActivity() {
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
