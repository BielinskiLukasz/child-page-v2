// Activity "Bańki Mydlane": touch blows a big soft bubble that floats up; touching a bubble splits it gently.
// Bubbles are pooled DOM divs driven by one rAF loop (JS motion, so it survives prefers-reduced-motion).
import { useEffect, useRef } from 'react';
import { Rand } from '../utils/rand';

var MAX: any = 25, MIN_R: any = 14, BIG_R: any = [46, 62], FADE_IN: any = 0.8, FADE_OUT: any = 1.6, SPLIT_MS: any = 700, GUARD_PAD: any = 12;
// Drawn background scenes (pure CSS gradients, so they fill any portrait/landscape size without stretching).
// All are mid/deep tones so the pale bubbles with their white highlight stay clearly visible on each.
var BACKS: any = [
  'radial-gradient(ellipse 60% 22% at 50% 100%, #3f9a6a 0 99%, transparent 100%), linear-gradient(#4a9fd8, #8fd0ee)', // sunny hills
  'radial-gradient(circle at 80% 18%, #ffe9a8 0 7%, rgba(255,233,168,0) 8%), linear-gradient(#3b3f8f, #7a5bb0 60%, #e58fa5)', // dusk
  'radial-gradient(ellipse 70% 18% at 30% 100%, #d8b36a 0 99%, transparent 100%), linear-gradient(#2a8fa8, #4fc3c9 75%)', // beach sea
  'radial-gradient(circle at 20% 22%, #fff 0 2%, rgba(255,255,255,0) 2.5%), radial-gradient(circle at 70% 40%, #fff 0 1.5%, rgba(255,255,255,0) 2%), linear-gradient(#1f2a6b, #3b4fa0)', // starry night
  'radial-gradient(ellipse 80% 20% at 70% 100%, #2f7d4f 0 99%, transparent 100%), linear-gradient(#e0828f, #f2b27a)', // sunrise meadow
  'radial-gradient(circle at 15% 85%, #3fb58c 0 10%, rgba(63,181,140,0) 11%), linear-gradient(#1e6f8f, #2a9d8f)' // underwater
];
var TINTS: any = [[255, 183, 213], [183, 222, 255], [200, 255, 226], [226, 205, 255], [255, 236, 186]];

function mount(container: HTMLElement) {
  var scene: any = document.createElement('div');
  scene.className = 'bm';
  scene.setAttribute('role', 'img');
  scene.setAttribute('aria-label', 'Bańki mydlane unoszące się w powietrzu');
  scene.style.background = Rand.pickOne(BACKS, 'banki-bg'); // new scene on every launch, never stored
  container.appendChild(scene);
  var W: any = 0, H: any = 0, raf: any = 0, last: any = 0, lastTrail: any = 0, bubbles: any = [], pool: any = [], dead: any = false;

  function size() { W = scene.clientWidth; H = scene.clientHeight; }
  size();

  function smooth(t?: any) { t = Math.min(Math.max(t, 0), 1); return t * t * (3 - 2 * t); }
  function rnd(a?: any, b?: any) { return a + Math.random() * (b - a); }

  function alive() { return bubbles.filter(function (b?: any) { return !b.fading; }).length; }

  function make(x?: any, y?: any, r?: any, vy?: any) {
    var el: any = pool.pop();
    if (!el) { el = document.createElement('div'); el.className = 'bm-b'; }
    var t: any = TINTS[Math.floor(Math.random() * TINTS.length)];
    el.style.setProperty('--c', t.join(','));
    el.style.width = el.style.height = (r * 2) + 'px';
    scene.appendChild(el);
    var b: any = { el: el, x: x, y: y, r: r, vy: vy, vx: 0, ph: rnd(0, 6.28), sw: rnd(0.25, 0.5), amp: rnd(6, 16),
      age: 0, fading: false, fade: 0, split: 0, tx: 0, ty: 0, a: 0 };
    bubbles.push(b);
    // Keep the population bounded: the oldest still-visible bubble fades out gently.
    while (alive() > MAX) {
      for (var i: any = 0; i < bubbles.length; i++) { if (!bubbles[i].fading) { bubbles[i].fading = true; break; } }
    }
    // Hard DOM bound under rapid tapping: bubbles that are already fading finish quickly.
    var over: any = bubbles.length - (MAX + 8);
    for (var j: any = 0; j < bubbles.length && over > 0; j++) {
      if (bubbles[j].fading && bubbles[j].fade < FADE_OUT * 0.85) { bubbles[j].fade = FADE_OUT * 0.85; over--; }
    }
    draw(b);
    return b;
  }

  function remove(b?: any) {
    var i: any = bubbles.indexOf(b);
    if (i >= 0) { bubbles.splice(i, 1); }
    if (b.el.parentNode) { b.el.parentNode.removeChild(b.el); }
    if (pool.length < MAX) { pool.push(b.el); }
  }

  function draw(b?: any) {
    var inA: any = smooth(b.age / FADE_IN);
    var out: any = b.fading ? 1 - smooth(b.fade / FADE_OUT) : 1;
    var sc: any = 1 + (b.split > 0 ? 0.08 * Math.sin(Math.min(b.split, 1) * 3.14) : 0);
    b.el.style.opacity = (inA * out).toFixed(3);
    b.el.style.transform = 'translate(' + (b.x - b.r).toFixed(1) + 'px,' + (b.y - b.r).toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
  }

  function blow(x?: any, y?: any, small?: any) {
    var r: any = small ? rnd(MIN_R, MIN_R + 8) : rnd(BIG_R[0], BIG_R[1]);
    return make(x, y, r, rnd(14, 24) * (small ? 1.1 : 1));
  }

  function splitBubble(b?: any) {
    var n: any = Math.random() < 0.5 ? 2 : 3, nr: any = b.r * (n === 2 ? 0.66 : 0.58);
    b.fading = true; b.fade = 0; b.split = 1; // the parent dissolves slowly while the children appear
    for (var i: any = 0; i < n; i++) {
      var ang: any = (i / n) * 6.28 + rnd(0, 1);
      var c: any = make(b.x + Math.cos(ang) * b.r * 0.3, b.y + Math.sin(ang) * b.r * 0.3, nr, b.vy);
      c.vx = Math.cos(ang) * 14; c.vy = b.vy + Math.sin(ang) * 8 - 4;
      c.small = nr < MIN_R * 1.2;
      if (c.small) { c.life = rnd(4, 7); } // the smallest bubbles drift a little, then fade gently
    }
  }

  function hit(x?: any, y?: any) {
    var best: any = null, bd: any = Infinity;
    bubbles.forEach(function (b?: any) {
      if (b.fading) { return; }
      var d: any = Math.hypot(b.x - x, b.y - y);
      if (d < b.r + 8 && d < bd) { bd = d; best = b; }
    });
    return best;
  }

  var down: any = false, dragged: any = false; void dragged;
  function onDown(e?: any) {
    e.preventDefault();
    down = true; dragged = false; lastTrail = performance.now();
    var r: any = scene.getBoundingClientRect();
    var x: any = e.clientX - r.left, y: any = e.clientY - r.top;
    var b: any = hit(x, y);
    if (b && b.r > MIN_R * 1.2) { splitBubble(b); }
    else if (b) { b.fading = true; b.fade = 0; } // a very small bubble answers the touch by fading away gently
    else { blow(x, y, false); }
    if (scene.setPointerCapture) { try { scene.setPointerCapture(e.pointerId); } catch (err: any) { /* ignore */ } }
  }
  function onMove(e?: any) {
    if (!down) { return; }
    var now: any = performance.now();
    if (now - lastTrail < 260) { return; } // gentle rate
    lastTrail = now; dragged = true;
    var r: any = scene.getBoundingClientRect();
    var x: any = e.clientX - r.left, y: any = e.clientY - r.top;
    if (!hit(x, y)) { blow(x, y, true); }
  }
  function onUp() { down = false; }
  scene.addEventListener('pointerdown', onDown);
  scene.addEventListener('pointermove', onMove);
  scene.addEventListener('pointerup', onUp);
  scene.addEventListener('pointercancel', onUp);

  for (var i: any = 0; i < 5; i++) {
    var s: any = make(W * rnd(0.1, 0.9), H * rnd(0.25, 0.9), rnd(16, 30), rnd(10, 18));
    s.age = FADE_IN;
  }

  function tick(now?: any) {
    if (dead) { return; }
    var dt: any = Math.min((now - (last || now)) / 1000, 0.1);
    last = now;
    var zones: any = guards();
    bubbles.slice().forEach(function (b?: any) {
      b.age += dt;
      b.ph += b.sw * dt;
      b.x += (b.vx + Math.cos(b.ph) * b.amp * b.sw) * dt;
      b.y -= b.vy * dt;
      b.vx *= Math.pow(0.5, dt); // splitting push eases off slowly
      if (b.vy > 26) { b.vy = 26; }
      if (b.x < b.r) { b.vx += 10 * dt; } else if (b.x > W - b.r) { b.vx -= 10 * dt; }
      if (b.life !== undefined) { b.life -= dt; if (b.life <= 0) { b.fading = true; } }
      // Near the top, or over the Back button / hourglass, the bubble fades out gently.
      if (!b.fading && (b.y < b.r + 4 || zones.some(function (z?: any) { return b.x > z.l && b.x < z.r && b.y > z.t && b.y < z.b; }))) { b.fading = true; }
      if (b.fading) { b.fade += dt; if (b.split > 0) { b.split = Math.max(0, b.split - dt / (SPLIT_MS / 1000)); } }
      if (b.fading && b.fade >= FADE_OUT) { remove(b); } else { draw(b); }
    });
    raf = requestAnimationFrame(tick);
  }
  // Keep-out zones: the Back button and the playtime hourglass (measured, so safe-area insets and sizes are honoured).
  function guards() {
    var sr: any = scene.getBoundingClientRect(), out: any = [];
    ['.back', '.hourglass'].forEach(function (sel?: any) {
      var el: any = document.querySelector(sel);
      if (!el) { return; }
      var r: any = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) { out.push({ l: r.left - sr.left - GUARD_PAD, t: r.top - sr.top - GUARD_PAD, r: r.right - sr.left + GUARD_PAD, b: r.bottom - sr.top + GUARD_PAD }); }
    });
    return out;
  }
  function start() { if (!raf && !dead) { last = 0; raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function onVis() { if (document.hidden) { stop(); } else { start(); } }
  function onResize() { size(); }
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  start();

  return function cleanup() {
    dead = true; stop();
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    if (scene.parentNode) { scene.parentNode.removeChild(scene); }
  };
}

export default function BankiActivity() {
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
