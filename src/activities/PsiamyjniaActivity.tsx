// Activity "Psia Myjnia": a dog car wash. A muddy dog of a random breed (window.Dogs, never the same breed twice in a row) stands in
// the wash; dragging a finger over it scrubs the mud away (a persistent mud mask on a canvas in logical coordinates, so resize/rotation
// keeps the cleaned areas) and releases soap bubbles from a pool of 28. At ~90% clean the rest of the mud fades, the dog shakes for
// ~1 s with droplets, glows ~3 s with its Polish breed name shown small underneath, and ~4 s after being clean the next breed fades in.
// Keyboard: arrow keys move the brush, Enter/Space advance it along a zig-zag path. One capped-dt rAF loop (pauses while hidden,
// stops when idle); nothing is scored or stored. Usage metrics: track('interaction', {variant: breed}) on touches, complete() per dog.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';
import { Dogs } from '../utils/dogs';

var LW: any = 480, LH: any = 400;            // logical size of the mud mask (the dog box is 6:5, like the Dogs viewBox 120 x 100)
var MAX_BUBBLES: any = 28, BUBBLE_S: any = 1.8, SPAWN_GAP_S: any = 0.09;
var DROPS: any = 14, DROP_S: any = 1;
var DONE_AT: any = 0.9, FADE_MUD_S: any = 1.2, SHAKE_S: any = 1, GLOW_S: any = 3, NAME_S: any = 3, NEXT_AT_S: any = 4, SWAP_S: any = 0.7;
var SHAKE_DEG: any = 6, SHAKE_HZ: any = 3;
var IMG_CACHE: any = {}, lastId: any = null;

function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
function report(fn?: any) { try { if (Analytics) { fn(Analytics); } } catch (e: any) { /* metrics must never break the activity */ } }

// Next breed: random from the shared list, never the previous one.
function pickDog() {
  var pool: any = Dogs.LIST.filter(function (d?: any) { return d.id !== lastId; });
  var d: any = pool[Math.floor(Math.random() * pool.length)];
  lastId = d.id;
  return d;
}
// The dog as an Image (cached per breed) for the mud silhouette; a cached image calls back synchronously.
function dogImage(id?: any, cb?: any) {
  var img: any = IMG_CACHE[id];
  if (!img) {
    img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Dogs.draw(id).replace('<svg ', '<svg width="' + LW + '" height="' + LH + '" '));
    IMG_CACHE[id] = img;
  }
  if (img.complete && img.naturalWidth) { cb(img); } else { img.addEventListener('load', function () { cb(img); }, { once: true }); }
}

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var board: any = document.createElement('div');
  board.className = 'pj';
  board.innerHTML = '<div class="pj-field"><div class="pj-foam pj-f1"></div><div class="pj-foam pj-f2"></div><div class="pj-foam pj-f3"></div>' +
    '<div class="pj-box" tabindex="0" role="application" aria-label="Brudny piesek. Strzałki przesuwają szczotkę, Enter lub spacja szoruje dalej.">' +
    '<div class="pj-clean"></div><canvas class="pj-mud" width="' + LW + '" height="' + LH + '"></canvas>' +
    '<div class="pj-brush"></div><div class="pj-bubbles"></div><div class="pj-drops"></div></div>' +
    '<div class="pj-name"></div></div>';
  container.appendChild(board);
  var field: any = board.querySelector('.pj-field'), box: any = board.querySelector('.pj-box'), clean: any = board.querySelector('.pj-clean'),
    mud: any = board.querySelector('.pj-mud'), brushEl: any = board.querySelector('.pj-brush'), bubWrap: any = board.querySelector('.pj-bubbles'),
    dropWrap: any = board.querySelector('.pj-drops'), nameEl: any = board.querySelector('.pj-name');
  var ctx: any = mud.getContext('2d');
  var small: any = document.createElement('canvas');
  small.width = 48; small.height = 40;
  var sctx: any = small.getContext('2d', { willReadFrequently: true });

  var bubbles: any = [], drops: any = [], b: any;
  for (b = 0; b < MAX_BUBBLES; b++) {
    var bn: any = document.createElement('div');
    bn.className = 'pj-bub'; bn.style.display = 'none';
    bubWrap.appendChild(bn);
    bubbles.push({ node: bn, age: -1, x: 0, y: 0, dx: 0 });
  }
  for (b = 0; b < DROPS; b++) {
    var dn: any = document.createElement('div');
    dn.className = 'pj-drop'; dn.style.display = 'none';
    dropWrap.appendChild(dn);
    drops.push({ node: dn, age: -1, x: 0, y: 0, vx: 0, vy: 0 });
  }

  var dog: any = null, calm: any = null, happy: any = null, tail: any = null, tailP: any = [0, 0], token: any = 0, alive: any = true;
  var baseline: any = 1, boxW: any = 300, brushLogical: any = 40;
  var phase: any = 'wait', phaseT: any = 0, boxOp: any = 0, glow: any = 0, first: any = true;
  var pointers: any = {}, lastSpawn: any = 0, dirty: any = false, checkT: any = 0, kx: any = 0.15, ky: any = 0.35, kdir: any = 1, raf: any = 0, last: any = 0, clock: any = 0;

  function remaining() {
    sctx.clearRect(0, 0, 48, 40);
    sctx.drawImage(mud, 0, 0, 48, 40);
    var d: any = sctx.getImageData(0, 0, 48, 40).data, s: any = 0;
    for (var i: any = 3; i < d.length; i += 4) { s += d[i]; }
    return s;
  }
  function drawMud(img?: any) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, LW, LH);
    ctx.drawImage(img, 0, 0, LW, LH);
    ctx.globalCompositeOperation = 'source-in';       // mud only where the dog is
    ctx.fillStyle = '#b99a7a';
    ctx.fillRect(0, 0, LW, LH);
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
  function setMood(on?: any) {
    if (!happy) { return; }
    happy.setAttribute('display', on ? 'inline' : 'none');
    calm.setAttribute('display', on ? 'none' : 'inline');
  }
  function rotTail(a?: any) { if (tail) { tail.setAttribute('transform', a ? 'rotate(' + a.toFixed(2) + ' ' + tailP[0] + ' ' + tailP[1] + ')' : ''); } }

  // Bring in a new dog: the box stays hidden ('wait') until the silhouette image is ready, then fades in.
  function setDog(d?: any) {
    token++;
    var my: any = token;
    dog = d;
    clean.innerHTML = Dogs.draw(d.id);
    calm = clean.querySelector('.dg-calm'); happy = clean.querySelector('.dg-happy'); tail = clean.querySelector('.dg-tail');
    tailP = tail ? [+tail.getAttribute('data-px'), +tail.getAttribute('data-py')] : [0, 0];
    setMood(false);
    box.setAttribute('aria-label', 'Brudny piesek: ' + d.name + '. Strzałki przesuwają szczotkę, Enter lub spacja szoruje dalej.');
    nameEl.style.opacity = '0'; nameEl.textContent = '';
    box.style.filter = ''; box.style.transform = '';
    mud.style.opacity = '1';
    phase = 'wait'; phaseT = 0; glow = 0; kx = 0.15; ky = 0.35; kdir = 1; dirty = false; pointers = {};
    dogImage(d.id, function (img?: any) {
      if (!alive || my !== token) { return; }
      drawMud(img);
      boxOp = first ? 1 : 0; first = false;
      box.style.opacity = boxOp.toFixed(3);
      phase = boxOp >= 1 ? 'play' : 'in';
      start();
    });
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
      var r: any = 0.02 + Math.random() * 0.025;
      bb.age = 0; bb.x = lx / LW; bb.y = ly / LH; bb.dx = (Math.random() - 0.5) * 0.04;
      bb.node.style.display = '';
      bb.node.style.width = bb.node.style.height = (r * 200) + '%';
      return;
    }
  }
  function maybeSpawn(lx?: any, ly?: any) {
    if (clock - lastSpawn < SPAWN_GAP_S) { return; }
    lastSpawn = clock;
    spawnBubble(lx + (Math.random() - 0.5) * 30, ly + (Math.random() - 0.5) * 20);
  }
  function canScrub() { return phase === 'play' || phase === 'in' || phase === 'done'; }

  function down(e?: any) {
    if (!canScrub()) { return; }
    var p: any = toLogical(e);
    pointers[e.pointerId] = p;
    try { box.setPointerCapture(e.pointerId); } catch (err: any) { /* synthetic pointer */ }
    erase(p[0], p[1], p[0], p[1]);
    maybeSpawn(p[0], p[1]);
    report(function (A?: any) { A.track('interaction', { variant: dog.id }); });
    e.preventDefault();
    start();
  }
  function move(e?: any) {
    var prev: any = pointers[e.pointerId];
    if (!prev || !canScrub()) { return; }
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
    brushEl.style.left = (kx * 100) + '%'; brushEl.style.top = (ky * 100) + '%';
    if (!canScrub()) { return; }
    erase(x0, y0, kx * LW, ky * LH);
    maybeSpawn(kx * LW, ky * LH);
    start();
  }
  function onKey(e?: any) {
    var step: any = 0.07, handled: any = true;
    if (e.key === 'ArrowLeft') { brushTo(kx - step, ky); }
    else if (e.key === 'ArrowRight') { brushTo(kx + step, ky); }
    else if (e.key === 'ArrowUp') { brushTo(kx, ky - step); }
    else if (e.key === 'ArrowDown') { brushTo(kx, ky + step); }
    else if (e.key === 'Enter' || e.key === ' ') {
      // zig-zag across the dog in steps
      var nx: any = kx + kdir * step;
      if (nx > 0.96 || nx < 0.04) { kdir = -kdir; brushTo(kx, ky + 0.12 > 0.94 ? 0.06 : ky + 0.12); }
      else { brushTo(nx, ky); }
      report(function (A?: any) { A.track('interaction', { variant: dog.id }); });
    } else { handled = false; }
    if (handled) { e.preventDefault(); }
  }
  function onFocus() { brushEl.style.display = 'block'; brushEl.style.left = (kx * 100) + '%'; brushEl.style.top = (ky * 100) + '%'; }
  function onBlur() { brushEl.style.display = 'none'; }

  function startDrops() {
    drops.forEach(function (dr?: any, i?: any) {
      var a: any = Math.PI * (0.1 + 0.8 * (i + Math.random() * 0.5) / DROPS);   // fan out above and to the sides
      dr.age = 0; dr.x = 0.3 + 0.4 * Math.random(); dr.y = 0.35 + 0.2 * Math.random();
      dr.vx = Math.cos(a) * (i % 2 ? 0.55 : -0.55) * (0.5 + Math.random() * 0.5); dr.vy = -Math.sin(a) * 0.5;
      dr.node.style.display = '';
    });
  }
  function paintBubbles() {
    bubbles.forEach(function (bb?: any) {
      if (bb.age < 0) { return; }
      var u: any = bb.age / BUBBLE_S;
      bb.node.style.left = ((bb.x + bb.dx * u) * 100).toFixed(2) + '%';
      bb.node.style.top = ((bb.y - 0.18 * smooth(u)) * 100).toFixed(2) + '%';
      bb.node.style.opacity = (0.8 * (1 - u * u)).toFixed(3);
    });
  }
  function paintDrops() {
    drops.forEach(function (dr?: any) {
      if (dr.age < 0) { return; }
      var u: any = dr.age / DROP_S;
      dr.node.style.left = ((dr.x + dr.vx * u) * 100).toFixed(2) + '%';
      dr.node.style.top = ((dr.y + dr.vy * u + 0.7 * u * u) * 100).toFixed(2) + '%';
      dr.node.style.opacity = (0.9 * (1 - u)).toFixed(3);
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
    drops.forEach(function (dr?: any) {
      if (dr.age < 0) { return; }
      dr.age += dt;
      if (dr.age >= DROP_S) { dr.age = -1; dr.node.style.display = 'none'; } else { busy = true; }
    });
    paintBubbles(); paintDrops();
    if (phase === 'in') {
      boxOp = Math.min(1, boxOp + dt / SWAP_S); busy = true;
      box.style.opacity = boxOp.toFixed(3);
      if (boxOp >= 1) { phase = 'play'; }
    }
    if (dirty && phase === 'play') {
      checkT += dt;
      if (checkT >= 0.12) {
        checkT = 0; dirty = false;
        if (remaining() / baseline <= 1 - DONE_AT) {
          phase = 'done'; phaseT = 0;
          setMood(true);
          nameEl.textContent = dog.name; nameEl.style.opacity = '1';
          startDrops();
          for (var i: any = 0; i < 6; i++) { spawnBubble(LW * (0.2 + 0.12 * i), LH * (0.3 + 0.3 * Math.random())); }
          report(function (A?: any) { A.complete(); });
        }
      } else { busy = true; }
    } else if (dirty && phase === 'in') { busy = true; }
    if (phase === 'done') {
      phaseT += dt; busy = true;
      mud.style.opacity = (reduced() ? 0 : Math.max(0, 1 - phaseT / FADE_MUD_S)).toFixed(3);
      glow = phaseT < GLOW_S ? Math.min(1, phaseT / 0.5) : Math.max(0, 1 - (phaseT - GLOW_S) / 0.5);
      box.style.filter = glow > 0.01 ? 'drop-shadow(0 0 ' + (6 + 16 * glow) + 'px #ffe08a)' : '';
      if (phaseT < SHAKE_S && !reduced()) {
        var w: any = Math.sin(2 * Math.PI * SHAKE_HZ * phaseT) * (1 - phaseT / SHAKE_S);
        box.style.transform = 'rotate(' + (SHAKE_DEG * w).toFixed(2) + 'deg)';
        rotTail(25 * w);
      } else { box.style.transform = ''; rotTail(0); }
      if (phaseT >= NAME_S) { nameEl.style.opacity = '0'; }
      if (phaseT >= NEXT_AT_S) { phase = 'out'; phaseT = 0; pointers = {}; }
    } else if (phase === 'out') {
      phaseT += dt; busy = true;
      boxOp = Math.max(0, boxOp - dt / SWAP_S);
      box.style.opacity = boxOp.toFixed(3);
      if (boxOp <= 0) { box.style.filter = ''; setDog(pickDog()); busy = phase !== 'wait' || busy; }
    }
    if (busy && alive && !raf && !document.hidden) { raf = requestAnimationFrame(frame); }
  }
  function start() {
    if (raf || document.hidden || !alive) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }

  function layout() {
    var r: any = field.getBoundingClientRect();
    boxW = Math.max(120, Math.min(r.width * 0.96, (r.height - 28) * 6 / 5, 680));
    box.style.width = boxW + 'px'; box.style.height = (boxW * 5 / 6) + 'px';
    brushLogical = Math.max(56, boxW * 0.11) / boxW * LW;   // brush at least 56 CSS px wide
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
  setDog(pickDog());

  return function cleanup() {
    alive = false; token++;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (board.parentNode) { board.parentNode.removeChild(board); }
  };
}

export default function PsiamyjniaActivity() {
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
