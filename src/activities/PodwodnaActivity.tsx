// Activity "Łódź Podwodna": a yellow submarine (a bear in the round window) hovers among 4 slow fish. Touch the submarine ->
// it swims / slows to a hover; touch the sand -> it glides down and rests there (touch it again to lift it); touch a fish ->
// the fish swims once round the submarine; touch a bubble -> it pops; touch the bear -> it waves. It never moves backwards
// while swimming. All motion is driven by one rAF loop (capped dt, paused when the tab is hidden) so it keeps working under
// the global prefers-reduced-motion rule that disables CSS animations. The submarine position is a loop fraction f
// (left edge = f * L - bw) so speed and resting spots stay valid after a resize / orientation change.
import { useEffect, useRef } from 'react';

var CROSS_S: any = 24;            // seconds for a full loop at cruise speed (crossing the visible width takes >= ~14 s)
var V: any = 1 / CROSS_S;         // cruise speed, loop fractions per second
var RAMP_S: any = 2.0;            // gentle start / slow-down
var BOB: any = 4;                 // bobbing amplitude in px (peak-to-peak 8px)
var VB_W: any = 240, VB_H: any = 130;  // submarine viewBox
var WAVE_S: any = 2.6, CIRCLE_S: any = 7, POP_S: any = 0.5;
var MAX_BUBBLES: any = 10, BUBBLE_LIFE: any = 4.5, BUBBLE_EVERY: any = 1.0;
var MAX_DT: any = 0.05;
var SEAWEED_X: any = [0.1, 0.46, 0.86];
var FISH: any = [
  { col: '#f7a8c9', fin: '#e98bb3', lane: 0.12, sp: 22, ph: 0.15 },
  { col: '#a8d8f0', fin: '#86c2e2', lane: 0.23, sp: 28, ph: 0.8 },
  { col: '#ffc9a0', fin: '#f0aa78', lane: 0.68, sp: 25, ph: 1.15 },
  { col: '#bfe6b4', fin: '#9fd193', lane: 0.77, sp: 20, ph: 1.6 }
];

function sm(u?: any) { return u * u * (3 - 2 * u); }
function wrap(x?: any) { return x - Math.floor(x); }
function clamp(x?: any, a?: any, b?: any) { return Math.max(a, Math.min(b, x)); }

function subSvg() {
  return '<svg viewBox="0 0 ' + VB_W + ' ' + VB_H + '" aria-hidden="true" focusable="false">' +
    '<rect x="128" y="2" width="5" height="22" rx="2.5" fill="#b8b2d6"/><rect x="128" y="2" width="20" height="5" rx="2.5" fill="#b8b2d6"/>' +
    '<rect x="92" y="16" width="64" height="32" rx="12" fill="#ffd98a"/>' +
    '<path d="M16 76Q16 36 120 36Q224 36 224 76Q224 116 120 116Q16 116 16 76z" fill="#ffe27a"/>' +
    '<path d="M22 96Q120 126 218 96Q210 116 120 116Q30 116 22 96z" fill="#f4c554"/>' +
    '<rect x="2" y="60" width="14" height="32" rx="7" fill="#b8b2d6"/>' +
    '<path d="M22 64L8 46L28 54z" fill="#f4c554"/><path d="M22 90L8 108L28 100z" fill="#f4c554"/>' +
    '<circle cx="52" cy="72" r="3.5" fill="#f4c554"/><circle cx="188" cy="72" r="3.5" fill="#f4c554"/>' +
    '<circle cx="212" cy="70" r="4" fill="#fff"/></svg>';
}

function bearSvg() {
  return '<svg viewBox="-28 -22 56 56" aria-hidden="true" focusable="false"><g transform="translate(0 6)">' +
    '<circle cx="-13" cy="-13" r="6" fill="#c99b72"/><circle cx="13" cy="-13" r="6" fill="#c99b72"/>' +
    '<circle cx="0" cy="0" r="16" fill="#c99b72"/><circle cx="-6" cy="-3" r="2" fill="#5b5675"/>' +
    '<circle cx="6" cy="-3" r="2" fill="#5b5675"/><ellipse cx="0" cy="5" rx="6" ry="4.5" fill="#f3dcc4"/>' +
    '<circle cx="0" cy="3.5" r="2" fill="#6b5a73"/></g></svg>';
}

function fishSvg(c?: any) {
  return '<svg viewBox="0 0 64 44" aria-hidden="true" focusable="false">' +
    '<path d="M8 22L2 10Q14 12 20 18z" fill="' + c.fin + '"/><path d="M8 22L2 34Q14 32 20 26z" fill="' + c.fin + '"/>' +
    '<ellipse cx="34" cy="22" rx="26" ry="16" fill="' + c.col + '"/><path d="M30 8Q38 2 44 10z" fill="' + c.fin + '"/>' +
    '<circle cx="48" cy="18" r="3.2" fill="#fff"/><circle cx="49" cy="18" r="1.8" fill="#5b5675"/>' +
    '<path d="M54 26q3 2 5 0" fill="none" stroke="#8a6a8f" stroke-width="2" stroke-linecap="round"/></svg>';
}

function weedSvg() {
  return '<svg viewBox="0 0 60 100" aria-hidden="true" focusable="false">' +
    '<path d="M14 100Q2 74 16 54Q26 38 14 14" fill="none" stroke="#9fd4a8" stroke-width="8" stroke-linecap="round"/>' +
    '<path d="M30 100Q20 70 34 48Q44 30 34 6" fill="none" stroke="#8cc99a" stroke-width="9" stroke-linecap="round"/>' +
    '<path d="M46 100Q58 78 46 60Q38 46 48 28" fill="none" stroke="#b3e0b8" stroke-width="7" stroke-linecap="round"/></svg>';
}

function mount(container: HTMLElement) {
  var scene: any = document.createElement('div');
  scene.className = 'pd';
  scene.setAttribute('role', 'group');
  scene.setAttribute('aria-label', 'Łódź Podwodna');
  var html: any = '<button class="pd-sand" type="button" aria-label="Piasek – posadź łódź podwodną"></button>';
  SEAWEED_X.forEach(function (_x?: any, i?: any) { html += '<div class="pd-weed pd-wd' + i + '">' + weedSvg() + '</div>'; });
  html += '<div class="pd-sub">' + subSvg() +
    '<button class="pd-hull" type="button" aria-label="Łódź podwodna – płyń lub zatrzymaj"></button>' +
    '<button class="pd-win" type="button" aria-label="Miś w okienku">' + bearSvg() + '</button></div>';
  FISH.forEach(function (c?: any, i?: any) {
    html += '<button class="pd-fish" type="button" aria-label="Rybka ' + (i + 1) + '">' + fishSvg(c) + '</button>';
  });
  for (var b: any = 0; b < MAX_BUBBLES; b++) {
    html += '<button class="pd-bub" type="button" tabindex="-1" aria-label="Bańka"><span></span></button>';
  }
  scene.innerHTML = html;
  container.appendChild(scene);

  var sand: any = scene.querySelector('.pd-sand');
  var sub: any = scene.querySelector('.pd-sub');
  var hull: any = scene.querySelector('.pd-hull');
  var win: any = scene.querySelector('.pd-win');
  var weeds: any = [].slice.call(scene.querySelectorAll('.pd-weed'));
  var fish: any = [].slice.call(scene.querySelectorAll('.pd-fish')).map(function (el?: any, i?: any) {
    return { el: el, i: i, ph: FISH[i].ph, x: 0, y: 0, fl: 1, circ: -1, th0: 0 };
  });
  var bubs: any = [].slice.call(scene.querySelectorAll('.pd-bub')).map(function (el?: any) {
    return { el: el, t: -1, pop: -1, x0: 0, y0: 0, sw: 0, x: 0, y: 0 };
  });

  var W: any = 0, H: any = 0, bw: any = 0, bh: any = 0, L: any = 1, sandH: any = 56, FS: any = 56, WS: any = 56, cruiseTop: any = 0, restTop: any = 0, spanX: any = 1; void spanX;
  var f: any = 0, v: any = 0, yk: any = 0, clock: any = 0, spawnT: any = 0.4, bubSeq: any = 0;
  var ramp: any = { v0: 0, vt: 0, t: RAMP_S, dur: RAMP_S };
  var glide: any = null;          // {f0, v0, f1, pc1, fwd, cur, y0, y1, t, T}
  var waveT: any = -1;
  var first: any = true;
  var raf: any = 0, last: any = 0;

  function fOfPc(pc?: any) { return (pc * Math.max(1, W - bw) + bw) / L; }

  function layout() {
    var pc: any = 0;
    var stationary: any = v === 0 && !glide;
    if (!first && stationary) { pc = (f * L - bw) / Math.max(1, W - bw); }
    W = scene.clientWidth || window.innerWidth;
    H = scene.clientHeight || window.innerHeight;
    bw = Math.min(clamp(W * 0.42, 200, 340), H * 0.55);
    bh = bw * VB_H / VB_W;
    L = W + bw;
    sandH = Math.max(56, H * 0.16);
    FS = clamp(Math.min(W, H) * 0.11, 56, 84);
    WS = Math.max(56, bw * 0.24);
    cruiseTop = H * 0.45 - bh / 2;
    restTop = (H - sandH * 0.62) - bh * 116 / 130;
    scene.style.setProperty('--sh', sandH.toFixed(1) + 'px');
    sub.style.width = bw.toFixed(1) + 'px';
    sub.style.height = bh.toFixed(1) + 'px';
    hull.style.left = (bw * 0.05).toFixed(1) + 'px';
    hull.style.top = (bh * 0.2).toFixed(1) + 'px';
    hull.style.width = (bw * 0.9).toFixed(1) + 'px';
    hull.style.height = (bh * 0.7).toFixed(1) + 'px';
    win.style.width = win.style.height = WS.toFixed(1) + 'px';
    win.style.left = (bw * 0.5 - WS / 2).toFixed(1) + 'px';
    win.style.top = (bh * 76 / 130 - WS / 2).toFixed(1) + 'px';
    var wh: any = clamp(H * 0.2, 70, 160);
    weeds.forEach(function (w?: any, i?: any) {
      w.style.width = (wh * 0.6).toFixed(1) + 'px';
      w.style.height = wh.toFixed(1) + 'px';
      w.style.left = (W * SEAWEED_X[i] - wh * 0.3).toFixed(1) + 'px';
      w.style.bottom = (sandH * 0.5).toFixed(1) + 'px';
    });
    fish.forEach(function (o?: any) { o.el.style.width = FS.toFixed(1) + 'px'; o.el.style.height = FS.toFixed(1) + 'px'; });
    if (first) { f = (0.06 * W + bw) / L; first = false; }
    else if (stationary) { f = fOfPc(clamp(pc, 0, 1)); }
    if (glide) { glide.f1 = fOfPc(glide.pc1) + glide.fwd; }
  }

  function subLeft() { return f * L - bw; }

  function startGlide(f1?: any, pc1?: any, fwd?: any, y1?: any, T?: any) {
    glide = { f0: f, v0: v, f1: f1, pc1: pc1, fwd: fwd, cur: f, y0: yk, y1: y1, t: 0, T: T };
  }

  function onSub() {
    var resting: any = (!glide && yk >= 1) || (glide && glide.y1 === 1);
    if (resting) {                                   // lift off the sand
      var pc: any = clamp((f * L - bw) / Math.max(1, W - bw), 0, 1);
      startGlide(f, pc, 0, 0, 2.2);
      ramp = { v0: 0, vt: 0, t: RAMP_S, dur: RAMP_S };
      return;
    }
    if (glide) { return; }                            // already lifting
    var halting: any = v > 0 && ramp.vt === 0;
    if (v === 0 || halting) { ramp = { v0: v, vt: V, t: 0, dur: RAMP_S }; }
    else { ramp = { v0: v, vt: 0, t: 0, dur: RAMP_S }; }
  }

  function onSand(e?: any) {
    var x: any = e && typeof e.clientX === 'number' && e.detail !== 0 ? e.clientX - scene.getBoundingClientRect().left : W / 2;
    var left: any = clamp(x - bw / 2, 0, Math.max(0, W - bw));
    var pc: any = left / Math.max(1, W - bw);
    var fwd: any = fOfPc(pc) < f ? 1 : 0;                 // never backwards: loop round past the right edge
    var f1: any = fOfPc(pc) + fwd;
    var T: any = clamp(2.5 + Math.abs(f1 - f) * L / W * 3, 2.5, 6);
    startGlide(f1, pc, fwd, 1, T);
    ramp = { v0: 0, vt: 0, t: RAMP_S, dur: RAMP_S };
  }

  function onWin() { if (waveT < 0) { waveT = 0; } }

  function onFish(o?: any) {
    if (o.circ >= 0) { return; }
    var cx: any = subLeft() + bw / 2, cy: any = cruiseTop + (restTop - cruiseTop) * yk + bh / 2;
    o.th0 = Math.atan2(o.y - cy, o.x - cx);
    o.circ = 0;
  }

  function onBub(b?: any) { if (b.t >= 0 && b.pop < 0) { b.pop = 0; } }

  function spawnBubble() {
    var b: any = null, i: any;
    for (i = 0; i < bubs.length; i++) { if (bubs[i].t < 0) { b = bubs[i]; break; } }
    if (!b) { return; }
    var top: any = cruiseTop + (restTop - cruiseTop) * yk;
    b.t = 0; b.pop = -1; b.sw = (bubSeq++ % 7) * 0.9;
    b.x0 = subLeft() + bw * (0.6 + 0.08 * (bubSeq % 3));
    b.y0 = top + bh * 0.1;
    b.el.classList.add('pd-on');
    b.el.style.opacity = '0';
  }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    last = now;
    clock += dt;

    if (glide) {
      var g: any = glide;
      g.t += dt;
      var u: any = Math.min(1, g.t / g.T), u2: any = u * u, u3: any = u2 * u;
      var fNew: any = (2 * u3 - 3 * u2 + 1) * g.f0 + (u3 - 2 * u2 + u) * g.T * g.v0 + (3 * u2 - 2 * u3) * g.f1;
      v = dt > 0 ? (fNew - g.cur) / dt : v;
      g.cur = fNew;
      f = wrap(fNew);
      yk = g.y0 + (g.y1 - g.y0) * sm(u);
      if (u >= 1) { f = wrap(g.f1); yk = g.y1; v = 0; glide = null; ramp = { v0: 0, vt: 0, t: RAMP_S, dur: RAMP_S }; }
    } else {
      ramp.t = Math.min(ramp.dur, ramp.t + dt);
      v = ramp.v0 + (ramp.vt - ramp.v0) * sm(ramp.t / ramp.dur);
      if (ramp.vt === 0 && ramp.t >= ramp.dur) { v = 0; }
      if (v < 0) { v = 0; }
      f = wrap(f + v * dt);
    }
    var calm: any = yk;
    var top: any = cruiseTop + (restTop - cruiseTop) * yk;
    var bob: any = Math.sin(clock * 2 * Math.PI / 3.6) * BOB * (1 - calm);
    var tilt: any = Math.sin(clock * 2 * Math.PI / 3.6 + 1) * 1.2 * (1 - calm);
    sub.style.transform = 'translate(' + subLeft().toFixed(1) + 'px,' + (top + bob).toFixed(1) + 'px) rotate(' + tilt.toFixed(2) + 'deg)';

    var swimming: any = !(glide && glide.y1 === 1) && yk < 0.999;
    if (swimming) {
      spawnT -= dt;
      if (spawnT <= 0) { spawnT = BUBBLE_EVERY; spawnBubble(); }
    }

    var rot: any = 0;
    if (waveT >= 0) {
      waveT += dt;
      if (waveT >= WAVE_S) { waveT = -1; }
      else { var w: any = waveT / WAVE_S; rot = Math.sin(w * Math.PI * 4) * 14 * Math.sin(w * Math.PI); }
    }
    win.firstChild.style.transform = 'rotate(' + rot.toFixed(1) + 'deg)';

    var cx: any = subLeft() + bw / 2, cy: any = top + bh / 2;
    var waterBottom: any = H - sandH * 0.8;
    var spanY: any = Math.max(1, waterBottom);
    fish.forEach(function (o?: any) {
      var Dx: any = Math.max(1, W - FS * 1.2);
      o.ph = (o.ph + FISH[o.i].sp * dt / Dx) % 2;
      var p: any = o.ph < 1 ? o.ph : 2 - o.ph;
      var bx: any = FS * 0.6 + p * Dx;
      var by: any = clamp(FISH[o.i].lane * spanY, FS * 0.4, waterBottom - FS * 0.4) + Math.sin(clock * 0.7 + o.i * 1.7) * 8;
      var px: any = bx, py: any = by;
      if (o.circ >= 0) {
        o.circ += dt;
        if (o.circ >= CIRCLE_S) { o.circ = -1; }
        else {
          var k: any = o.circ / CIRCLE_S;
          var e: any = sm(Math.min(1, o.circ / 1.3)) * sm(Math.min(1, (CIRCLE_S - o.circ) / 1.3));
          var th: any = o.th0 + 2 * Math.PI * k;
          var rx: any = Math.max(bw * 0.7, FS), ry: any = Math.max(bh * 0.8, FS);
          var qx: any = clamp(cx + Math.cos(th) * rx, FS * 0.6, W - FS * 0.6);
          var qy: any = clamp(cy + Math.sin(th) * ry, FS * 0.4, waterBottom - FS * 0.4);
          px = bx + (qx - bx) * e; py = by + (qy - by) * e;
        }
      }
      var dx: any = px - o.x;
      if (Math.abs(dx) > 0.05) { o.fl += ((dx > 0 ? 1 : -1) - o.fl) * Math.min(1, dt * 5); }
      o.x = px; o.y = py;
      o.el.style.transform = 'translate(' + (px - FS / 2).toFixed(1) + 'px,' + (py - FS / 2).toFixed(1) + 'px) scaleX(' + o.fl.toFixed(2) + ')';
    });

    bubs.forEach(function (b?: any) {
      if (b.t < 0) { return; }
      b.t += dt;
      var op: any;
      if (b.pop >= 0) {
        b.pop += dt;
        if (b.pop >= POP_S) { b.t = -1; b.el.classList.remove('pd-on'); b.el.style.opacity = '0'; return; }
        var q: any = b.pop / POP_S;
        op = 0.9 * (1 - sm(q));
        b.el.style.opacity = op.toFixed(3);
        b.el.style.transform = 'translate(' + (b.x - 28).toFixed(1) + 'px,' + (b.y - 28).toFixed(1) + 'px) scale(' + (1 + 0.5 * q).toFixed(3) + ')';
        return;
      }
      if (b.t >= BUBBLE_LIFE) { b.t = -1; b.el.classList.remove('pd-on'); b.el.style.opacity = '0'; return; }
      b.x = b.x0 + Math.sin(b.t * 1.6 + b.sw) * 10;
      b.y = b.y0 - 55 * b.t;
      op = 0.85 * Math.min(1, b.t / 0.4) * Math.min(1, (BUBBLE_LIFE - b.t) / 1.0);
      b.el.style.opacity = op.toFixed(3);
      b.el.style.transform = 'translate(' + (b.x - 28).toFixed(1) + 'px,' + (b.y - 28).toFixed(1) + 'px)';
    });
    if (!document.hidden) { raf = requestAnimationFrame(frame); }
  }

  function start() {
    if (raf || document.hidden) { return; }
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }

  var offs: any = [];
  function bind(node?: any, fn?: any) {
    var h: any = function (e?: any) { e.preventDefault(); fn(e); };
    var k: any = function (e?: any) { if (e.detail === 0) { fn(e); } };
    node.addEventListener('pointerdown', h);
    node.addEventListener('click', k);
    offs.push(function () { node.removeEventListener('pointerdown', h); node.removeEventListener('click', k); });
  }
  bind(hull, onSub);
  bind(sand, onSand);
  bind(win, onWin);
  fish.forEach(function (o?: any) { bind(o.el, function () { onFish(o); }); });
  bubs.forEach(function (b?: any) { bind(b.el, function () { onBub(b); }); });
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);
  document.addEventListener('visibilitychange', onVis);

  layout();
  fish.forEach(function (o?: any) { o.x = W / 2; o.y = H / 2; });
  start();

  return function () {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    offs.forEach(function (o?: any) { o(); });
    window.removeEventListener('resize', layout);
    window.removeEventListener('orientationchange', layout);
    document.removeEventListener('visibilitychange', onVis);
    if (scene.parentNode) { scene.parentNode.removeChild(scene); }
  };
}

export default function PodwodnaActivity() {
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
