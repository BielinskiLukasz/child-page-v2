// Activity "Gdzie jest Piłka?": a ball, an open box on a table and a small bunny friend. Four marked spots (in the box,
// on top of it, under the table, next to the box). Touch a spot and the ball glides there (~1.5 s, a critically damped
// spring so a new touch redirects it smoothly); drag the ball and it settles on the nearest spot. When it arrives the
// bunny does a small gentle reaction (looks in, hops, peeks under, waves) for ~2 s. No text, nothing happens by
// itself. One capped-dt rAF loop (works under prefers-reduced-motion, where the ball cross-fades instead of gliding;
// pauses when hidden, stops when idle); fixed DOM; nothing is stored. Each launch picks one of six predefined layouts
// (box position, which side "next to the box" is on, wall/table colours, and where the ball starts), never the same as
// the previous launch (Rand.pickOne).
import { useEffect, useRef } from 'react';
import { Rand } from '../utils/rand';

var W: any = 400, H: any = 300;                     // scene units
var LAYOUTS: any = [   // cx: box centre x, side: +1/-1 = "next to the box" spot on the right/left, start: spot the ball starts on
  { cx: 200, side: 1, start: 'in', wall: '#e9f3fb', top: '#e8c9a8', leg: '#d9b8a0', floor: '#cfe8c4' },
  { cx: 200, side: -1, start: 'on', wall: '#fbf1e1', top: '#e3c2d6', leg: '#cfa9be', floor: '#d8e8c0' },
  { cx: 150, side: 1, start: 'next', wall: '#eaf6ee', top: '#d9c3a1', leg: '#c2a888', floor: '#cfe0f0' },
  { cx: 250, side: -1, start: 'under', wall: '#f3ecfa', top: '#c8dcea', leg: '#aac4d8', floor: '#e6dcc4' },
  { cx: 175, side: 1, start: 'under', wall: '#fdf0ee', top: '#d6e6b8', leg: '#b9cf94', floor: '#f0dccb' },
  { cx: 225, side: -1, start: 'in', wall: '#e8f1f8', top: '#f0d6b0', leg: '#dcb98a', floor: '#d3ecd0' }
];
var LABELS: any = { in: 'w pudełku', on: 'na pudełku', under: 'pod stołem', next: 'obok pudełka' };
function spotsFor(L?: any) {
  return [
    { id: 'in', x: L.cx, y: 128 }, { id: 'on', x: L.cx, y: 56 },
    { id: 'under', x: L.cx, y: 240 }, { id: 'next', x: L.cx + L.side * 120, y: 156 }
  ];
}
var OMEGA: any = 3.4, REACT_S: any = 2, FADE_S: any = 0.15;
var STROKE: any = '#8f7fd1';
var SYMBOLS: any = {
  in: '<rect x="11" y="15" width="18" height="14" rx="3"/><circle cx="20" cy="21" r="3.5" fill="' + STROKE + '"/>',
  on: '<rect x="11" y="22" width="18" height="10" rx="3"/><circle cx="20" cy="13" r="4" fill="' + STROKE + '"/>',
  under: '<path d="M9 17H31"/><circle cx="20" cy="27" r="4" fill="' + STROKE + '"/>',
  next: '<rect x="7" y="16" width="13" height="13" rx="3"/><circle cx="31" cy="23" r="4" fill="' + STROKE + '"/>'
};

function sceneFor(L?: any) {
  var bx: any = L.cx - 75;
  return '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
    '<rect width="400" height="300" fill="' + L.wall + '"/><rect y="280" width="400" height="20" fill="' + L.floor + '"/>' +
    '<rect x="55" y="200" width="12" height="80" rx="4" fill="' + L.leg + '"/><rect x="333" y="200" width="12" height="80" rx="4" fill="' + L.leg + '"/>' +
    '<rect x="40" y="190" width="320" height="12" rx="6" fill="' + L.top + '"/>' +
    '<rect x="' + bx + '" y="90" width="150" height="100" rx="8" fill="#c9a98a"/><rect x="' + (bx + 8) + '" y="96" width="134" height="76" rx="6" fill="#a98b6c"/>' +
    '<rect x="' + bx + '" y="165" width="150" height="25" rx="8" fill="#e8c9a8"/><rect x="' + bx + '" y="84" width="150" height="10" rx="5" fill="#d9b185"/></svg>';
}
var BALL: any = '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="46" fill="#f7a8c9"/>' +
  '<path d="M8 44Q50 64 92 44" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="7"/>' +
  '<path d="M24 24a34 34 0 0 1 22-12" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="6" stroke-linecap="round"/></svg>';
var BUNNY: any = '<svg viewBox="0 0 64 68" aria-hidden="true" focusable="false"><g class="pk-all"><ellipse cx="32" cy="52" rx="18" ry="14" fill="#fbf7ff"/>' +
  '<g class="pk-head"><ellipse cx="24" cy="12" rx="5" ry="12" fill="#fbf7ff"/><ellipse cx="40" cy="12" rx="5" ry="12" fill="#fbf7ff"/>' +
  '<ellipse cx="24" cy="13" rx="2.2" ry="8" fill="#f7c9d6"/><ellipse cx="40" cy="13" rx="2.2" ry="8" fill="#f7c9d6"/>' +
  '<circle cx="32" cy="34" r="17" fill="#fbf7ff"/><circle cx="26" cy="32" r="2.6" fill="#5b5675"/><circle cx="38" cy="32" r="2.6" fill="#5b5675"/>' +
  '<ellipse cx="32" cy="38" rx="3" ry="2.2" fill="#e59aa8"/><path d="M27 42q5 4 10 0" fill="none" stroke="#5b5675" stroke-width="1.8" stroke-linecap="round"/></g>' +
  '<ellipse class="pk-arm" cx="51" cy="50" rx="5" ry="10" fill="#fbf7ff" stroke="#e8e0f2" stroke-width="1.2"/></g></svg>';

function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
function bump(u?: any) { return Math.sin(Math.PI * Math.min(1, Math.max(0, u))); }

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var L: any = Rand ? Rand.pickOne(LAYOUTS, 'pilka') : LAYOUTS[0];
  var SPOTS: any = spotsFor(L);
  var root: any = document.createElement('div');
  root.className = 'pk';
  root.innerHTML = '<div class="pk-field"><div class="pk-board">' + sceneFor(L) + '</div></div>';
  container.appendChild(root);
  var field: any = root.querySelector('.pk-field'), board: any = root.querySelector('.pk-board');

  function pct(x?: any, y?: any) { return 'left:' + (x / W * 100) + '%;top:' + (y / H * 100) + '%'; }
  var spotEls: any = SPOTS.map(function (sp?: any, i?: any) {
    var b: any = document.createElement('button');
    b.type = 'button'; b.className = 'pk-spot';
    b.setAttribute('aria-label', 'Miejsce: ' + LABELS[sp.id]);
    b.style.cssText = pct(sp.x, sp.y);
    b.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><g fill="none" stroke="' + STROKE + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="20" cy="20" r="18" stroke-dasharray="3 5" opacity=".8"/>' + SYMBOLS[sp.id] + '</g></svg>';
    board.appendChild(b);
    b.addEventListener('click', function () { goTo(i); });
    return b;
  }); void spotEls;
  var bunny: any = document.createElement('div');
  bunny.className = 'pk-bunny';
  bunny.style.cssText = pct(L.cx >= 200 ? 34 : 366, 240);
  bunny.innerHTML = BUNNY;
  board.appendChild(bunny);
  var bunnyAll: any = bunny.querySelector('.pk-all'), bunnyHead: any = bunny.querySelector('.pk-head'), bunnyArm: any = bunny.querySelector('.pk-arm');
  bunnyAll.style.transformOrigin = '32px 66px'; bunnyHead.style.transformOrigin = '32px 44px'; bunnyArm.style.transformOrigin = '51px 42px';
  var ballEl: any = document.createElement('button');
  ballEl.type = 'button'; ballEl.className = 'pk-ball';
  ballEl.setAttribute('aria-label', 'Piłka (Enter lub spacja: następne miejsce; przeciągnij na miejsce)');
  ballEl.innerHTML = BALL;
  board.appendChild(ballEl);

  var spot: any = 0;
  SPOTS.forEach(function (sp?: any, i?: any) { if (sp.id === L.start) { spot = i; } });
  var x: any = SPOTS[spot].x, y: any = SPOTS[spot].y, vx: any = 0, vy: any = 0, tx: any = x, ty: any = y, moving: any = false;
  var dragPid: any = null, react: any = null, fade: any = null, op: any = 1, raf: any = 0, last: any = 0;

  function paintBall() {
    ballEl.style.left = (x / W * 100) + '%'; ballEl.style.top = (y / H * 100) + '%'; ballEl.style.opacity = op.toFixed(3);
  }
  function nearest(px?: any, py?: any) {
    var best: any = 0, bd: any = 1e9;
    SPOTS.forEach(function (sp?: any, i?: any) { var d: any = Math.hypot(sp.x - px, sp.y - py); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function goTo(i?: any) {
    if (dragPid !== null) { return; }
    spot = i; tx = SPOTS[i].x; ty = SPOTS[i].y;
    react = null;
    if (reduced()) { if (!fade || fade.phase === 1) { fade = { t: (1 - op) * FADE_S, phase: 0 }; } moving = true; }  // soft cross-fade instead of a glide
    else { moving = true; }
    start();
  }
  function arrive() {
    moving = false; vx = vy = 0; x = tx; y = ty; fade = null; op = 1;
    react = { t: 0, type: SPOTS[spot].id };
  }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min((now - last) / 1000, 0.05); last = now;
    var busy: any = false;
    if (dragPid === null && moving) {
      if (fade) {
        fade.t += dt;
        if (fade.phase === 0) { op = Math.max(0, 1 - fade.t / FADE_S); if (fade.t >= FADE_S) { x = tx; y = ty; fade.phase = 1; fade.t = 0; } }
        else { op = Math.min(1, fade.t / FADE_S); if (fade.t >= FADE_S) { arrive(); } }
        busy = true;
      } else {
        // critically damped spring toward the target, integrated in small steps; a new target just changes tx/ty
        var steps: any = Math.max(1, Math.ceil(dt / 0.008)), h: any = dt / steps;
        for (var s: any = 0; s < steps; s++) {
          vx += (OMEGA * OMEGA * (tx - x) - 2 * OMEGA * vx) * h; vy += (OMEGA * OMEGA * (ty - y) - 2 * OMEGA * vy) * h;
          x += vx * h; y += vy * h;
        }
        if (Math.hypot(tx - x, ty - y) < 0.4 && Math.hypot(vx, vy) < 1.5) { arrive(); } else { busy = true; }
      }
    }
    if (react) {
      react.t += dt;
      var u: any = react.t / REACT_S, b: any = bump(u), rm: any = reduced();
      var all: any = '', head: any = '', arm: any = '';
      if (!rm) {
        if (react.type === 'in') { head = 'rotate(' + (14 * b).toFixed(1) + 'deg)'; all = 'translateX(' + (3 * b).toFixed(1) + 'px)'; }
        else if (react.type === 'on') { all = 'translateY(' + (-12 * Math.abs(Math.sin(u * Math.PI * 2))).toFixed(1) + 'px)'; }
        else if (react.type === 'under') { all = 'translateY(' + (4 * b).toFixed(1) + 'px) scaleY(' + (1 - 0.08 * b).toFixed(3) + ')'; head = 'rotate(' + (-16 * b).toFixed(1) + 'deg)'; }
        else { arm = 'rotate(' + (-30 * Math.sin(u * Math.PI * 6) * b).toFixed(1) + 'deg)'; }
      }
      bunnyAll.style.transform = all; bunnyHead.style.transform = head; bunnyArm.style.transform = arm;
      if (react.t >= REACT_S) { react = null; bunnyAll.style.transform = bunnyHead.style.transform = bunnyArm.style.transform = ''; }
      else { busy = true; }
    }
    paintBall();
    if (busy && !document.hidden) { raf = requestAnimationFrame(frame); }
  }
  function start() {
    if (raf || document.hidden) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }

  function toScene(e?: any) {
    var r: any = board.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
  }
  ballEl.addEventListener('pointerdown', function (e?: any) {
    if (dragPid !== null || (e.button !== undefined && e.button > 0)) { return; }
    dragPid = e.pointerId; moving = false; fade = null; op = 1; vx = vy = 0; react = null;
    try { ballEl.setPointerCapture(e.pointerId); } catch (err: any) { /* synthetic pointer */ }
    ballEl.style.zIndex = '5';
    e.preventDefault();
  });
  ballEl.addEventListener('pointermove', function (e?: any) {
    if (e.pointerId !== dragPid) { return; }
    var p: any = toScene(e);
    x = Math.max(34, Math.min(W - 34, p[0])); y = Math.max(34, Math.min(H - 20, p[1]));   // stays inside the scene
    paintBall();
  });
  function release(e?: any) {
    if (e.pointerId !== dragPid) { return; }
    try { ballEl.releasePointerCapture(dragPid); } catch (err: any) { /* already released */ }
    dragPid = null; ballEl.style.zIndex = '';
    goTo(nearest(x, y));
  }
  ballEl.addEventListener('pointerup', release);
  ballEl.addEventListener('pointercancel', release);
  ballEl.addEventListener('lostpointercapture', release);
  ballEl.addEventListener('click', function (e?: any) { if (e.detail === 0) { goTo((spot + 1) % SPOTS.length); } });

  function layout() {
    var r: any = field.getBoundingClientRect();
    var w: any = Math.max(240, Math.min(r.width, r.height * W / H));
    board.style.width = w + 'px'; board.style.height = (w * H / W) + 'px';
  }
  function onResize() { layout(); paintBall(); }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  layout();
  paintBall();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function PilkaActivity() {
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
