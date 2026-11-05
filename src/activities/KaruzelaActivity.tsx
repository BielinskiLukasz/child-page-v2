// Activity "Karuzela": a merry-go-round with a striped roof, 4 animal seats and bunting. It only turns in place.
// Touch the carousel -> it speeds up to a slow full turn (18 s) over ~2 s; touch it while turning -> it slows to a stop
// over ~3 s. Drag around it -> it follows the finger (never faster than full speed), then coasts a little and stops.
// Touch an animal -> it hops or waves once, the rotation is unaffected.
// Everything is driven by one rAF loop (capped dt, paused when the tab is hidden), so it also works under the global
// prefers-reduced-motion rule that disables CSS animations. The turn angle th grows in one direction only; the seats
// sit on an ellipse in a 400x300 board (x = sin, depth = cos) and always stay upright.
import { useEffect, useRef } from 'react';
import { Animals } from '../utils/animals';

var WMAX: any = 2 * Math.PI / 18;     // full speed, rad/s (one turn in 18 s)
var T_UP: any = 2, T_DOWN: any = 3;        // seconds to reach full speed / to come to rest
var COAST_TAU: any = 0.9;             // momentum after a drag decays with this time constant
var BOB: any = 4;                     // seats rise and fall by at most 2*BOB = 8 px
var HOP: any = 8, REACT_S: any = 1.8;      // animal hop height (px) and reaction length (s)
var MAX_DT: any = 0.05;
var BW: any = 400, BH: any = 300;          // board units
var CX: any = 200, ORB_R: any = 118, ORB_Y: any = 214, ORB_D: any = 20;   // orbit: x = CX + R sin, feet y = ORB_Y + D cos
var N: any = 4, SEAT: any = 68;            // seat count, seat box in board units
var FRONT_DROP: any = 0.08;           // extra drop of an animal at the front-most point, as a fraction of its height
var VB: any = '-34 -44 68 86', FEET: any = 83 / 86;

function sm(u?: any) { return u * u * (3 - 2 * u); }

function roofSvg() {
  var s: any = '';
  var base: any = [[40, 100], [360, 100]];
  for (var i: any = 0; i < 8; i++) {
    var x0: any = 40 + i * 40, x1: any = x0 + 40;
    s += '<path d="M200 26L' + x0 + ' 100Q' + (x0 + 20) + ' 112 ' + x1 + ' 100z" fill="' + (i % 2 ? '#fdfbff' : '#f7a8c9') + '"/>';
  }
  return s + '<circle cx="200" cy="24" r="7" fill="#ffd98a"/>' +
    '<path d="M' + base[0][0] + ' 100Q200 90 ' + base[1][0] + ' 100" fill="none" stroke="#e58fb3" stroke-width="3" stroke-linecap="round" opacity=".5"/>';
}

function mount(container: HTMLElement) {
  var an: any = Animals.pick(N, { distinct: true });
  var scene: any = document.createElement('div');
  scene.className = 'kz';
  scene.setAttribute('role', 'group');
  scene.setAttribute('aria-label', 'Karuzela');

  var flags: any = '';
  var FL: any = 9, flagCol: any = ['#f7a8c9', '#ffe08a', '#a8d8f0', '#bfe6b4', '#c9b8f2'];
  for (var i: any = 0; i < FL; i++) {
    var u: any = (i + 0.5) / FL, fx: any = 20 + 360 * u, fy: any = 14 + 22 * Math.sin(Math.PI * u);
    flags += '<g class="kz-flag" data-x="' + fx.toFixed(1) + '" data-y="' + fy.toFixed(1) + '"><path d="M' + (fx - 9).toFixed(1) + ' ' + fy.toFixed(1) +
      'h18l-9 20z" fill="' + flagCol[i % 5] + '"/></g>';
  }
  var seats: any = '';
  for (var j: any = 0; j < N; j++) {
    var a: any = an[j], id: any = a.id;
    var paw: any = j % 2 ? '<g class="kz-paw"><ellipse cx="16" cy="24" rx="4.5" ry="6" fill="' + a.fur + '"/></g>' : '';
    seats += '<button class="kz-seat" type="button" data-i="' + j + '" aria-label="' + a.name + ' na karuzeli"><span class="kz-fig">' +
      '<svg viewBox="' + VB + '" aria-hidden="true" focusable="false">' + paw + Animals.head(id, { body: true }) + '</svg></span></button>';
  }
  scene.innerHTML =
    '<svg class="kz-bg" aria-hidden="true" focusable="false" preserveAspectRatio="none"><rect class="kz-hill" fill="#cdeac3"/><rect class="kz-grass" fill="#b6e0aa"/></svg>' +
    '<svg class="kz-flags" aria-hidden="true" focusable="false" viewBox="0 0 400 60"><path d="M20 14Q200 58 380 14" fill="none" stroke="#a79bb8" stroke-width="2"/>' + flags + '</svg>' +
    '<svg class="kz-base" aria-hidden="true" focusable="false" viewBox="0 0 ' + BW + ' ' + BH + '">' +
    '<ellipse cx="200" cy="262" rx="152" ry="26" fill="#000" opacity=".06"/>' +
    '<path d="M48 226v14q0 26 152 26t152-26v-14z" fill="#d9a7c4"/>' +
    '<ellipse cx="200" cy="226" rx="152" ry="36" fill="#f3d3e4"/><ellipse cx="200" cy="226" rx="120" ry="26" fill="#fdf0f7"/></svg>' +
    '<button class="kz-hull" type="button" aria-label="Karuzela – uruchom lub zatrzymaj"></button>' +
    seats +
    '<svg class="kz-top" aria-hidden="true" focusable="false" viewBox="0 0 ' + BW + ' ' + BH + '">' +
    '<rect x="193" y="96" width="14" height="140" rx="7" fill="#ffd98a"/><rect x="193" y="96" width="5" height="140" rx="2.5" fill="#fff3c4"/>' +
    roofSvg() + '</svg>';
  container.appendChild(scene);

  var $: any = function (sel?: any) { return scene.querySelector(sel); };
  var seatEls: any = [].slice.call(scene.querySelectorAll('.kz-seat'));
  var figs: any = [].slice.call(scene.querySelectorAll('.kz-fig'));
  var paws: any = seatEls.map(function (b?: any) { return b.querySelector('.kz-paw'); });
  var flagEls: any = [].slice.call(scene.querySelectorAll('.kz-flag'));
  var base: any = $('.kz-base'), top: any = $('.kz-top'), hull: any = $('.kz-hull'), flagSvg: any = $('.kz-flags'), bg: any = $('.kz-bg');

  var W: any = 0, H: any = 0, k: any = 1, ox: any = 0, oy: any = 0, seatPx: any = 56;
  var th: any = 0, om: any = 0;                              // angle (rad, grows one way) and angular speed
  var mode: any = 'rest';                               // rest | ramp | coast | drag
  var rf: any = 0, rt: any = 0, rd: any = 1, rto: any = 0;             // ramp: from, elapsed, duration, target
  var react: any = [-1, -1, -1, -1];
  var ph: any = 0, raf: any = 0, last: any = 0;

  // drag state
  var g: any = null, thF: any = 0, vEst: any = 0;

  function layout() {
    W = scene.clientWidth || window.innerWidth;
    H = scene.clientHeight || window.innerHeight;
    k = Math.max(0.3, Math.min(W / BW, (H * 0.9) / BH));
    ox = (W - BW * k) / 2;
    oy = Math.max(0, (H - BH * k) / 2 - 0.02 * H);
    var gh: any = H * 0.12, gy: any = H - gh;
    bg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var hill: any = $('.kz-hill'), grass: any = $('.kz-grass');
    hill.setAttribute('x', -20); hill.setAttribute('y', gy - gh * 0.25); hill.setAttribute('width', W + 40); hill.setAttribute('height', gh * 0.6 + 20); hill.setAttribute('rx', 40);
    grass.setAttribute('x', -20); grass.setAttribute('y', gy); grass.setAttribute('width', W + 40); grass.setAttribute('height', gh + 20); grass.setAttribute('rx', 20);
    [base, top].forEach(function (s?: any) {
      s.style.left = ox.toFixed(1) + 'px'; s.style.top = oy.toFixed(1) + 'px';
      s.style.width = (BW * k).toFixed(1) + 'px'; s.style.height = (BH * k).toFixed(1) + 'px';
    });
    flagSvg.style.left = ox.toFixed(1) + 'px'; flagSvg.style.top = Math.max(0, oy - 6 * k).toFixed(1) + 'px';
    flagSvg.style.width = (BW * k).toFixed(1) + 'px'; flagSvg.style.height = (60 * k).toFixed(1) + 'px';
    hull.style.left = (ox + 30 * k).toFixed(1) + 'px'; hull.style.top = (oy + 20 * k).toFixed(1) + 'px';
    hull.style.width = (340 * k).toFixed(1) + 'px'; hull.style.height = (250 * k).toFixed(1) + 'px';
    seatPx = Math.max(56, SEAT * k);
    seatEls.forEach(function (b?: any) { b.style.width = b.style.height = seatPx.toFixed(1) + 'px'; });
    place();
  }

  function place() {
    var amp: any = Math.min(1, Math.abs(om) / WMAX);
    seatEls.forEach(function (b?: any, i?: any) {
      var t: any = th + i * 2 * Math.PI / N;
      var s: any = Math.sin(t), c: any = Math.cos(t);
      var bob: any = BOB * amp * Math.sin(2 * th + i * 1.6);
      var fx: any = ox + (CX + ORB_R * s) * k, fy: any = oy + (ORB_Y + ORB_D * c) * k;
      var sc: any = 0.92 + 0.12 * c;
      var sink: any = FRONT_DROP * seatPx * (1 + c) / 2;      // smooth in the angle: 0 at the back, 8% of the animal's height at the very front
      var hop: any = 0;
      if (react[i] >= 0) { hop = (i % 2 ? 0 : HOP * Math.sin(Math.PI * react[i] / REACT_S)); }
      b.style.transform = 'translate(' + (fx - seatPx / 2).toFixed(1) + 'px,' + (fy - seatPx * FEET - hop).toFixed(1) + 'px)';
      b.style.zIndex = c > 0 ? 5 : 3;
      figs[i].style.transform = 'translateY(' + (sink - bob).toFixed(2) + 'px) scale(' + sc.toFixed(3) + ')';
      if (paws[i]) {
        var u: any = react[i] >= 0 ? react[i] / REACT_S : 1, env: any = u >= 1 ? 0 : Math.sin(Math.PI * u);
        paws[i].setAttribute('transform', env ? 'rotate(' + (-40 * env + 10 * env * Math.sin(4 * Math.PI * u)).toFixed(1) + ' 16 20)' : '');
      }
    });
    flagEls.forEach(function (f?: any, i?: any) {
      var a: any = 5 * Math.sin(ph + i * 0.9);
      f.setAttribute('transform', 'rotate(' + a.toFixed(2) + ' ' + f.getAttribute('data-x') + ' ' + f.getAttribute('data-y') + ')');
    });
  }

  // ---- control -------------------------------------------------------------------------------------------------
  function ramp(to?: any, dur?: any) { rf = om; rto = to; rt = 0; rd = dur; mode = 'ramp'; }
  function toggle() {
    if ((mode === 'ramp' && rto > 0) || mode === 'coast') { ramp(0, T_DOWN); }
    else { ramp(WMAX, T_UP); }
  }
  function onSeat(i?: any) { if (react[i] < 0) { react[i] = 0; } }

  function angleDelta(dx?: any, py?: any) {
    var cy: any = oy + ORB_Y * k;
    var f: any = Math.max(-1, Math.min(1, (py - cy) / (ORB_D * 2 * k)));
    if (Math.abs(f) < 0.5) { f = f < 0 ? -0.5 : 0.5; }
    return f * dx / (ORB_R * k);
  }
  function down(e?: any, src?: any) {
    if (g) { return; }
    e.preventDefault();
    g = { id: e.pointerId, src: src, x: e.clientX, sx: e.clientX, sy: e.clientY, drag: false };
    try { scene.setPointerCapture(e.pointerId); } catch (x: any) { /* ignore */ }
  }
  function move(e?: any) {
    if (!g || e.pointerId !== g.id) { return; }
    if (!g.drag) {
      if (Math.abs(e.clientX - g.sx) < 10 && Math.abs(e.clientY - g.sy) < 10) { return; }
      g.drag = true; mode = 'drag'; om = 0; vEst = 0; thF = th;
    }
    thF += angleDelta(e.clientX - g.x, e.clientY);
    g.x = e.clientX;
  }
  function up(e?: any) {
    if (!g || e.pointerId !== g.id) { return; }
    var gg: any = g; g = null;
    try { scene.releasePointerCapture(e.pointerId); } catch (x: any) { /* ignore */ }
    if (gg.drag) {
      om = Math.max(0, Math.min(WMAX, vEst));      // forward momentum only: the direction never reverses
      mode = om > 0.003 ? 'coast' : 'rest'; if (mode === 'rest') { om = 0; }
    } else if (gg.src >= 0) { onSeat(gg.src); }
    else { toggle(); }
  }
  function cancel(e?: any) {
    if (!g || e.pointerId !== g.id) { return; }
    g = null; if (mode === 'drag') { om = 0; mode = 'rest'; }
  }

  // ---- loop ----------------------------------------------------------------------------------------------------
  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    last = now;

    if (mode === 'ramp') {
      rt += dt;
      var u: any = Math.min(1, rt / rd);
      om = rf + (rto - rf) * sm(u);
      if (u >= 1) { om = rto; mode = rto > 0 ? 'ramp' : 'rest'; if (rto > 0) { rf = rto; rt = 0; rd = 1; } }
      th += om * dt;
    } else if (mode === 'coast') {
      om *= Math.exp(-dt / COAST_TAU);
      if (om < 0.003) { om = 0; mode = 'rest'; }
      th += om * dt;
    } else if (mode === 'drag') {
      var d: any = thF - th;
      if (Math.abs(d) > 0.6) { thF = th + (d > 0 ? 0.6 : -0.6); d = thF - th; }   // finger far ahead: shift the grip
      var step: any = Math.max(-WMAX * dt, Math.min(WMAX * dt, d));
      th += step;
      if (dt > 0) { vEst += (step / dt - vEst) * Math.min(1, dt / 0.15); }
      om = Math.abs(vEst);
    }
    ph += dt * 2 * Math.PI / 6;
    for (var i: any = 0; i < N; i++) {
      if (react[i] >= 0) { react[i] += dt; if (react[i] >= REACT_S) { react[i] = -1; } }
    }
    place();
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
  function on(node?: any, ev?: any, fn?: any) { node.addEventListener(ev, fn); offs.push(function () { node.removeEventListener(ev, fn); }); }
  on(hull, 'pointerdown', function (e?: any) { down(e, -1); });
  seatEls.forEach(function (b?: any, i?: any) {
    on(b, 'pointerdown', function (e?: any) { down(e, i); });
    on(b, 'click', function (e?: any) { if (e.detail === 0) { onSeat(i); } });
  });
  on(hull, 'click', function (e?: any) { if (e.detail === 0) { toggle(); } });
  on(scene, 'pointermove', move);
  on(scene, 'pointerup', up);
  on(scene, 'pointercancel', cancel);
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);
  document.addEventListener('visibilitychange', onVis);

  layout();
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

export default function KaruzelaActivity() {
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
