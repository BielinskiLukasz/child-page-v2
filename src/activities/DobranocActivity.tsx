// Activity "Dobranoc": a house at dusk. Tap a window to dim/relight it, tap an animal to tuck it in / wake it.
// When every light is off and every animal sleeps, stars and a sleeping moon fade in. All changes are reversible.
// Fades run from one capped-dt rAF loop (not CSS transitions), so they still work under prefers-reduced-motion.
import { useEffect, useRef } from 'react';
import { Animals } from '../utils/animals';

var LIGHT_S: any = 1.5, SLEEP_S: any = 1.2, GLOW_IN_S: any = 4, GLOW_OUT_S: any = 2;
// Positions in the 400x300 board, as the centre of each button.
var WINDOWS: any = [[140, 165], [260, 165], [140, 235], [260, 235]];
var WIN: any = 64, ANI: any = 72;
// Three random animals per launch (shared family, js/animals.js); slots and blankets are fixed.
var SLOTS: any = [
  { x: 52, y: 238, blanket: '#b9b3e0' },
  { x: 200, y: 240, blanket: '#f7a8c9' },
  { x: 348, y: 238, blanket: '#a9c9ef' }
];
var STARS: any = [[40, 40, 2.2], [90, 90, 1.6], [150, 30, 2], [215, 70, 1.6], [270, 28, 2.2], [310, 100, 1.6], [360, 130, 2],
  [25, 130, 1.6], [70, 175, 1.4], [235, 15, 1.4]];

function sceneryHtml() {
  return '<svg class="db-scene" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="db-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8c86c9"/>' +
    '<stop offset=".6" stop-color="#e9b9d0"/><stop offset="1" stop-color="#ffd9b8"/></linearGradient></defs>' +
    '<rect width="400" height="300" fill="url(#db-sky)"/>' +
    '<ellipse cx="200" cy="300" rx="260" ry="46" fill="#9fcf9f"/>' +
    '<rect x="100" y="125" width="200" height="150" rx="10" fill="#f6dcc8"/>' +
    '<path d="M86 132L200 60l114 72z" fill="#c9a0c0" stroke="#c9a0c0" stroke-width="8" stroke-linejoin="round"/>' +
    '<rect x="274" y="72" width="18" height="40" rx="3" fill="#b78fb0"/>' +
    '<path d="M170 275v-42a30 30 0 0 1 60 0v42z" fill="#b99a86"/></svg>';
}

function animalSvg(a?: any, blanket?: any) {
  var A: any = Animals, ec: any = A.eyeColor(a.id), pos: any = A.eyes(a.id), open: any = '', shut: any = '';
  pos.forEach(function (p?: any) {
    open += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2" fill="' + ec + '"/>';
    shut += '<path d="M' + (p[0] - 3.2) + ' ' + p[1] + 'q3.2 3 6.4 0"/>';
  });
  return '<svg viewBox="0 0 70 70" aria-hidden="true" focusable="false">' +
    '<ellipse cx="35" cy="54" rx="22" ry="15" fill="' + a.fur + '"/>' +
    '<g transform="translate(35 38)">' + A.head(a.id, { noEyes: true }) +
    '<g class="db-open">' + open + '</g>' +
    '<g class="db-shut" fill="none" stroke="' + ec + '" stroke-width="1.6" stroke-linecap="round" opacity="0">' + shut + '</g></g>' +
    '<g class="db-blanket" opacity="0"><path d="M10 50q25-10 50 0v12q0 6-6 6H16q-6 0-6-6z" fill="' + blanket + '"/>' +
    '<path d="M10 56q25-8 50 0" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/></g></svg>';
}

function windowSvg() {
  return '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
    '<rect x="4" y="4" width="56" height="56" rx="10" fill="#7d86b8"/>' +
    '<rect class="db-lit" x="4" y="4" width="56" height="56" rx="10" fill="#ffe9a8"/>' +
    '<path d="M32 4v56M4 32h56" stroke="#fff" stroke-opacity=".75" stroke-width="3"/>' +
    '<rect x="4" y="4" width="56" height="56" rx="10" fill="none" stroke="#fff" stroke-width="4"/></svg>';
}

function glowSvg() {
  var s: any = '<svg class="db-glow" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    '<rect width="400" height="300" fill="#2a3a74" opacity=".38"/>';
  STARS.forEach(function (p?: any) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '" fill="#fff6d0"/>'; });
  return s + '<path d="M336.14 28.03A24 24 0 1 0 354.86 65.47A21 21 0 0 1 336.14 28.03Z" fill="#ffe9a8"/>' +
    '<path d="M318 56q6 6 12 0" fill="none" stroke="#7a6f9f" stroke-width="2" stroke-linecap="round"/></svg>';
}

function toward(v?: any, t?: any, step?: any) { return v < t ? Math.min(t, v + step) : Math.max(t, v - step); }

function mount(container: HTMLElement) {
  var root: any = document.createElement('div');
  root.className = 'db';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Dom o zmierzchu');
  var board: any = document.createElement('div');
  board.className = 'db-board';
  board.innerHTML = sceneryHtml();
  root.appendChild(board);
  var glowWrap: any = document.createElement('div');
  glowWrap.className = 'db-glow-wrap';
  glowWrap.innerHTML = glowSvg();
  board.appendChild(glowWrap);

  var items: any = [];       // { v (0..1 progress), t (target), btn, paint(), speed }
  var glow: any = 0, glowT: any = 0;
  var raf: any = 0, last: any = 0;

  function place(btn?: any, x?: any, y?: any, size?: any) {
    btn.style.left = (x / 4).toFixed(3) + '%';
    btn.style.top = (y / 3).toFixed(3) + '%';
    btn.style.width = (size / 4).toFixed(3) + '%';
  }

  WINDOWS.forEach(function (p?: any, i?: any) {
    var btn: any = document.createElement('button');
    btn.type = 'button';
    btn.className = 'db-btn db-win';
    btn.innerHTML = windowSvg();
    place(btn, p[0], p[1], WIN);
    var lit: any = btn.querySelector('.db-lit');
    var it: any = { v: 1, t: 1, btn: btn, speed: 1 / LIGHT_S, kind: 'light',
      paint: function () { lit.setAttribute('opacity', it.v.toFixed(3)); },
      label: function () { btn.setAttribute('aria-label', 'Okno ' + (i + 1) + (it.t ? ' – zgaś światło' : ' – zapal światło')); } };
    items.push(it);
    board.appendChild(btn);
  });
  var picks: any = Animals.pick(SLOTS.length);
  SLOTS.forEach(function (slot?: any, si?: any) {
    var a: any = picks[si];
    var btn: any = document.createElement('button');
    btn.type = 'button';
    btn.className = 'db-btn db-ani';
    btn.innerHTML = animalSvg(a, slot.blanket);
    place(btn, slot.x, slot.y, ANI);
    var open: any = btn.querySelector('.db-open'), shut: any = btn.querySelector('.db-shut'), blanket: any = btn.querySelector('.db-blanket');
    var it: any = { v: 0, t: 0, btn: btn, speed: 1 / SLEEP_S, kind: 'sleep',
      paint: function () {
        var e: any = it.v * it.v * (3 - 2 * it.v); // smoothstep
        open.setAttribute('opacity', (1 - Math.min(1, e * 2.5)).toFixed(3));
        shut.setAttribute('opacity', Math.min(1, e * 2.5).toFixed(3));
        blanket.setAttribute('opacity', e.toFixed(3));
        blanket.setAttribute('transform', 'translate(0 ' + ((1 - e) * 10).toFixed(2) + ')');
      },
      label: function () { btn.setAttribute('aria-label', a.name + (it.t ? ' – obudź' : ' – połóż spać')); } };
    items.push(it);
    board.appendChild(btn);
  });
  container.appendChild(root);

  function paintGlow() {
    var e: any = glow * glow * (3 - 2 * glow);
    glowWrap.style.opacity = e.toFixed(3);
  }
  function paintAll() { items.forEach(function (it?: any) { it.paint(); it.label(); }); paintGlow(); }

  function allAsleep() {
    return items.every(function (it?: any) { return it.kind === 'light' ? it.t === 0 : it.t === 1; });
  }

  function step(ts?: any) {
    raf = 0;
    var dt: any = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    var busy: any = false;
    items.forEach(function (it?: any) {
      if (it.v !== it.t) { it.v = toward(it.v, it.t, it.speed * dt); it.paint(); if (it.v !== it.t) { busy = true; } }
    });
    if (glow !== glowT) {
      glow = toward(glow, glowT, dt / (glowT > glow ? GLOW_IN_S : GLOW_OUT_S));
      paintGlow();
      if (glow !== glowT) { busy = true; }
    }
    if (busy) { raf = requestAnimationFrame(step); } else { last = 0; }
  }
  function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(step); } }

  // After a hidden tab, don't count the gap: rAF itself pauses, so just restart the clock.
  function onVis() { last = 0; }
  document.addEventListener('visibilitychange', onVis);

  var handlers: any = items.map(function (it?: any) {
    var h: any = function () {
      it.t = it.t ? 0 : 1;
      it.label();
      glowT = allAsleep() ? 1 : 0; // nothing is automatic: only the player's own changes move the glow
      kick();
    };
    it.btn.addEventListener('click', h);
    return h;
  });

  paintAll();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    document.removeEventListener('visibilitychange', onVis);
    items.forEach(function (it?: any, i?: any) { it.btn.removeEventListener('click', handlers[i]); });
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function DobranocActivity() {
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
