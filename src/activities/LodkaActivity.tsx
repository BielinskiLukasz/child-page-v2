// Activity "Mała Łódka": a small sailboat with 2 animals floats along a calm river. Touch the boat -> it sails / slows to a
// halt; touch the jetty -> the boat glides there and moors (only the last intent counts); touch a duck -> it nods and a
// ripple ring spreads; touch an animal aboard -> it waves. The boat never moves backwards.
// All motion is driven by one rAF loop (capped dt, paused when the tab is hidden) so it keeps working under the global
// prefers-reduced-motion rule that disables CSS animations. The boat position is a loop fraction f (0 = just off the left
// edge, 1 = just off the right edge) so speed and the mooring spot stay valid after a resize / orientation change.
import { useEffect, useRef } from 'react';

var CROSS_S: any = 26;            // seconds for a full loop at cruise speed (the boat crosses the visible width in >= ~15 s)
var V: any = 1 / CROSS_S;         // cruise speed, loop fractions per second
var RAMP_S: any = 2.2;            // gentle start / slow-down
var NOD_S: any = 2.2, WAVE_S: any = 2.4, RING_S: any = 2.6;
var MAX_RINGS: any = 6;
var MAX_DT: any = 0.05;
var VB_W: any = 200, VB_H: any = 160;  // boat viewBox
var BOB: any = 3;                 // bobbing amplitude in px (peak-to-peak 6px)
var AN_X: any = [0.2, 0.5];       // animal centres across the boat width
var KINDS: any = ['bear', 'rabbit'];
var NAMES: any = ['Miś', 'Króliczek'];
var DUCK_POS: any = [[0.18, 0.74], [0.5, 0.85], [0.8, 0.76]];

function sm(u?: any) { return u * u * (3 - 2 * u); }
function wrap(x?: any) { return x - Math.floor(x); }
function clamp(x?: any, a?: any, b?: any) { return Math.max(a, Math.min(b, x)); }

function animalSvg(kind?: any) {
  var fur: any = kind === 'rabbit' ? '#f3ecf7' : '#c99b72';
  var ears: any = kind === 'rabbit'
    ? '<ellipse cx="-8" cy="-26" rx="4.5" ry="12" fill="' + fur + '"/><ellipse cx="8" cy="-26" rx="4.5" ry="12" fill="' + fur + '"/>' +
      '<ellipse cx="-8" cy="-26" rx="2" ry="8" fill="#f7b7cf"/><ellipse cx="8" cy="-26" rx="2" ry="8" fill="#f7b7cf"/>'
    : '<circle cx="-13" cy="-13" r="6" fill="' + fur + '"/><circle cx="13" cy="-13" r="6" fill="' + fur + '"/>';
  var nose: any = kind === 'bear'
    ? '<ellipse cx="0" cy="5" rx="6" ry="4.5" fill="#f3dcc4"/><circle cx="0" cy="3.5" r="2" fill="#6b5a73"/>'
    : '<circle cx="0" cy="4" r="2" fill="#e99bb5"/>';
  return '<svg viewBox="-28 -22 56 56" aria-hidden="true" focusable="false"><g transform="translate(0 6)">' + ears +
    '<circle cx="0" cy="0" r="16" fill="' + fur + '"/><circle cx="-6" cy="-3" r="2" fill="#5b5675"/>' +
    '<circle cx="6" cy="-3" r="2" fill="#5b5675"/>' + nose + '</g></svg>';
}

function boatSvg() {
  return '<svg viewBox="0 0 ' + VB_W + ' ' + VB_H + '" aria-hidden="true" focusable="false">' +
    '<rect x="150" y="14" width="4" height="96" rx="2" fill="#a8946f"/>' +
    '<path d="M156 18v22l16-10z" fill="#f7a8c9"/>' +
    '<path d="M152 34L196 100H152z" fill="#fdfbff"/><path d="M148 44L106 100H148z" fill="#ffe9a8"/>' +
    '<path d="M8 104H192Q184 146 150 150H50Q16 146 8 104z" fill="#f2a98f"/>' +
    '<path d="M8 104H192L190 114H10z" fill="#fbd3c4"/>' +
    '<circle cx="120" cy="130" r="6" fill="#fdfbff" stroke="#c9a090" stroke-width="2"/>' +
    '<circle cx="150" cy="130" r="6" fill="#fdfbff" stroke="#c9a090" stroke-width="2"/></svg>';
}

function duckSvg() {
  return '<svg viewBox="0 0 64 56" aria-hidden="true" focusable="false">' +
    '<ellipse cx="30" cy="38" rx="22" ry="14" fill="#ffe08a"/><path d="M14 36q10 12 24 2" fill="#f7cd6a"/>' +
    '<path d="M48 22l12 6-12 5z" fill="#ffb98a"/><circle cx="44" cy="22" r="11" fill="#ffe08a"/>' +
    '<circle cx="47" cy="19" r="2.2" fill="#5b5675"/><path d="M6 34l-4-6 10 3z" fill="#ffe08a"/></svg>';
}

function jettySvg() {
  return '<svg viewBox="0 0 220 80" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    '<rect x="0" y="0" width="220" height="16" rx="6" fill="#d9b99b"/>' +
    '<path d="M0 8H220" stroke="#c9a98a" stroke-width="2"/>' +
    '<rect x="14" y="14" width="12" height="62" rx="5" fill="#c4a483"/><rect x="104" y="14" width="12" height="62" rx="5" fill="#c4a483"/>' +
    '<rect x="194" y="14" width="12" height="62" rx="5" fill="#c4a483"/>' +
    '<circle cx="20" cy="2" r="0" fill="none"/></svg>';
}

function waveUrl(col?: any) {
  var s: any = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="24" viewBox="0 0 120 24"><path d="M0 12Q15 2 30 12T60 12T90 12T120 12V24H0z" fill="' + col + '"/></svg>';
  return 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")';
}

function mount(container: HTMLElement) {
  var scene: any = document.createElement('div');
  scene.className = 'ld';
  scene.setAttribute('role', 'group');
  scene.setAttribute('aria-label', 'Mała Łódka');
  var html: any = '<div class="ld-sun"></div><div class="ld-cloud ld-c1"></div><div class="ld-cloud ld-c2"></div>' +
    '<div class="ld-water"></div><div class="ld-bank"></div>' +
    '<div class="ld-wave ld-w1"></div>' +
    '<button class="ld-jetty" type="button" aria-label="Pomost – przycumuj łódkę">' + jettySvg() + '</button>';
  html += '<div class="ld-boat">' + boatSvg() +
    '<button class="ld-hull" type="button" aria-label="Łódka – płyń lub zatrzymaj"></button>';
  for (var k: any = 0; k < 2; k++) {
    html += '<button class="ld-an" type="button" data-i="' + k + '" aria-label="' + NAMES[k] + '">' + animalSvg(KINDS[k]) + '</button>';
  }
  html += '</div><div class="ld-wave ld-w2"></div>';
  for (var d: any = 0; d < 3; d++) {
    html += '<button class="ld-dk' + (d === 1 ? ' ld-flip' : '') + '" type="button" data-i="' + d + '" aria-label="Kaczka ' + (d + 1) + '">' + duckSvg() + '</button>';
  }
  for (var r: any = 0; r < MAX_RINGS; r++) { html += '<div class="ld-ring"></div>'; }
  scene.innerHTML = html;
  container.appendChild(scene);

  var boat: any = scene.querySelector('.ld-boat');
  var hull: any = scene.querySelector('.ld-hull');
  var jetty: any = scene.querySelector('.ld-jetty');
  var bank: any = scene.querySelector('.ld-bank');
  var w1: any = scene.querySelector('.ld-w1');
  var w2: any = scene.querySelector('.ld-w2');
  w1.style.backgroundImage = waveUrl('rgba(255,255,255,.55)');
  w2.style.backgroundImage = waveUrl('rgba(184,222,242,.9)');
  var animals: any = [].slice.call(scene.querySelectorAll('.ld-an')).map(function (el?: any, i?: any) { return { el: el, i: i, wave: -1 }; });
  var ducks: any = [].slice.call(scene.querySelectorAll('.ld-dk')).map(function (el?: any, i?: any) { return { el: el, i: i, nod: -1, x: 0, y: 0 }; });
  var rings: any = [].slice.call(scene.querySelectorAll('.ld-ring')).map(function (el?: any) { return { el: el, t: -1, x: 0, y: 0, age: 0 }; });
  var ringSeq: any = 0;

  var W: any = 0, H: any = 0, bw: any = 0, bh: any = 0, L: any = 1, AS: any = 56, DS: any = 56, wl: any = 0, boatTop: any = 0, fm: any = 0, jw: any = 100;
  var f: any = 0, v: any = 0, clock: any = 0;
  var ramp: any = { v0: 0, vt: 0, t: RAMP_S, dur: RAMP_S };
  var brake: any = null;          // {v0, T, t, f0, sPrev}
  var target: any = false;        // the child asked for the jetty (only the last intent counts)
  var skip: any = false;          // the jetty was too close to brake for: wait until the boat has gone round
  var moored: any = true;
  var raf: any = 0, last: any = 0;

  function layout() {
    W = scene.clientWidth || window.innerWidth;
    H = scene.clientHeight || window.innerHeight;
    bw = Math.min(clamp(W * 0.42, 200, 300), H * 0.55);
    bh = bw * VB_H / VB_W;
    L = W + bw;
    wl = H * 0.56;
    boatTop = wl - bh * 0.88;
    AS = clamp(bw * 0.24, 56, 72);
    DS = clamp(H * 0.11, 56, 76);
    jw = clamp(W * 0.28, 100, 220);
    var jh: any = Math.max(56, bh * 0.42), jtop: any = wl - bh * 0.28;
    var pj: any = W - jw;
    var cm: any = Math.max(bw / 2, pj - bw * 0.4);   // boat centre when moored: always fully on screen
    fm = (cm + bw / 2) / L;
    scene.style.setProperty('--wl', wl.toFixed(1) + 'px');
    boat.style.width = bw.toFixed(1) + 'px';
    boat.style.height = bh.toFixed(1) + 'px';
    hull.style.left = (bw * 0.02).toFixed(1) + 'px';
    hull.style.top = (bh * 0.5).toFixed(1) + 'px';
    hull.style.width = (bw * 0.96).toFixed(1) + 'px';
    hull.style.height = (bh * 0.5).toFixed(1) + 'px';
    animals.forEach(function (a?: any) {
      a.el.style.width = a.el.style.height = AS.toFixed(1) + 'px';
      a.el.style.left = (bw * AN_X[a.i] - AS / 2).toFixed(1) + 'px';
      a.el.style.top = (bh * 0.65 - AS * 0.2 - AS / 2).toFixed(1) + 'px';
    });
    jetty.style.left = pj.toFixed(1) + 'px';
    jetty.style.top = jtop.toFixed(1) + 'px';
    jetty.style.width = jw.toFixed(1) + 'px';
    jetty.style.height = jh.toFixed(1) + 'px';
    bank.style.left = (W - jw * 0.22).toFixed(1) + 'px';
    bank.style.top = (jtop - 6).toFixed(1) + 'px';
    bank.style.width = (jw * 0.22 + 4).toFixed(1) + 'px';
    bank.style.height = (jh + 20).toFixed(1) + 'px';
    var wh: any = Math.max(24, H * 0.05);
    [[w1, wl - wh * 0.7], [w2, wl + bh * 0.05]].forEach(function (p?: any) {
      p[0].style.top = p[1].toFixed(1) + 'px'; p[0].style.height = wh.toFixed(1) + 'px';
      p[0].style.backgroundSize = (wh * 5).toFixed(1) + 'px ' + wh.toFixed(1) + 'px';
    });
    ducks.forEach(function (d?: any) {
      d.x = W * DUCK_POS[d.i][0]; d.y = H * DUCK_POS[d.i][1];
      d.el.style.width = DS.toFixed(1) + 'px';
      d.el.style.height = DS.toFixed(1) + 'px';
    });
    if (moored && v === 0) { f = fm; }
    else if (brake) { brake = null; ramp = { v0: v, vt: V, t: 0, dur: RAMP_S }; }   // jetty moved: re-plan from the current speed, no snap
  }

  function onBoat() {
    var halting: any = !brake && v > 0 && ramp.vt === 0;
    if ((v === 0 && !brake) || halting) {
      target = false; skip = false;
      ramp = { v0: v, vt: V, t: 0, dur: RAMP_S };            // set sail gently
    } else {
      target = false; skip = false; brake = null;
      ramp = { v0: v, vt: 0, t: 0, dur: RAMP_S };            // slow down smoothly and halt where the boat is
    }
  }

  function onJetty() {
    if (moored && v === 0 && !brake) { return; }
    if (target) { return; }
    target = true;
    skip = false;
    if (v === 0 && !brake) { ramp = { v0: 0, vt: V, t: 0, dur: RAMP_S }; return; }
    if (brake) { return; }
    if (ramp.vt < V) { ramp = { v0: v, vt: V, t: 0, dur: RAMP_S }; }
    if (wrap(fm - f) < 1.25 * v) { skip = true; }   // just passed / too close to stop gently: it moors on the next loop
  }

  function onAnimal(a?: any) { if (a.wave < 0) { a.wave = 0; } }
  function onDuck(d?: any) {
    if (d.nod < 0) { d.nod = 0; }
    var r: any = null, i: any;
    for (i = 0; i < rings.length; i++) { if (rings[i].t < 0) { r = rings[i]; break; } }
    if (!r) { r = rings[0]; for (i = 1; i < rings.length; i++) { if (rings[i].age < r.age) { r = rings[i]; } } }   // recycle the oldest
    r.t = 0; r.x = d.x; r.y = d.y + DS * 0.38; r.age = ++ringSeq;
  }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    last = now;
    clock += dt;

    if (brake) {
      brake.t += dt;
      var u: any = Math.min(1, brake.t / brake.T);
      var s: any = brake.v0 * brake.T * (u - u * u * u + u * u * u * u / 2);
      v = brake.v0 * (1 - sm(u));
      f = wrap(brake.f0 + s); brake.sPrev = s;
      if (u >= 1) { v = 0; f = fm; moored = true; target = false; brake = null; ramp = { v0: 0, vt: 0, t: RAMP_S, dur: RAMP_S }; }
    } else {
      ramp.t = Math.min(ramp.dur, ramp.t + dt);
      v = ramp.v0 + (ramp.vt - ramp.v0) * sm(ramp.t / ramp.dur);
      if (ramp.vt === 0 && ramp.t >= ramp.dur) { v = 0; }
      if (v < 0) { v = 0; }
      f = wrap(f + v * dt);
      if (v > 0 && moored) { moored = false; }
      // start gliding in about 3 s before the jetty (never backwards)
      if (target && v > 0.002) {
        var D: any = wrap(fm - f);
        if (skip) { if (D > 0.9) { skip = false; } }
        else if (D <= 1.5 * v) { brake = { v0: v, T: 2 * D / v, t: 0, f0: f, sPrev: 0 }; }
      }
    }

    var bob: any = Math.sin(clock * 2 * Math.PI / 3.4) * BOB;
    var tilt: any = Math.sin(clock * 2 * Math.PI / 3.4 + 1) * 1.2;
    boat.style.transform = 'translate(' + (f * L - bw).toFixed(1) + 'px,' + (boatTop + bob).toFixed(1) + 'px) rotate(' + tilt.toFixed(2) + 'deg)';
    var ph: any = clock * 9;
    w1.style.backgroundPositionX = (-ph).toFixed(1) + 'px';
    w2.style.backgroundPositionX = (ph * 0.8).toFixed(1) + 'px';

    animals.forEach(function (a?: any) {
      var rot: any = 0;
      if (a.wave >= 0) {
        a.wave += dt;
        if (a.wave >= WAVE_S) { a.wave = -1; }
        else { var w: any = a.wave / WAVE_S; rot = Math.sin(w * Math.PI * 4) * 14 * Math.sin(w * Math.PI); }
      }
      a.el.style.transform = 'rotate(' + rot.toFixed(1) + 'deg)';
    });
    ducks.forEach(function (d?: any) {
      var dy: any = Math.sin(clock * 2 * Math.PI / 3.8 + d.i * 2) * 2, rot: any = 0;
      if (d.nod >= 0) {
        d.nod += dt;
        if (d.nod >= NOD_S) { d.nod = -1; }
        else { var n: any = Math.sin(d.nod / NOD_S * Math.PI); rot = Math.sin(n * Math.PI * 0.5) * 12; dy += n * 4; }
      }
      d.el.style.transform = 'translate(' + (d.x - DS / 2).toFixed(1) + 'px,' + (d.y - DS * 0.5 + dy).toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)';
    });
    rings.forEach(function (r?: any) {
      if (r.t < 0) { return; }
      r.t += dt;
      if (r.t >= RING_S) { r.t = -1; r.el.style.opacity = '0'; return; }
      var k: any = r.t / RING_S, e: any = sm(k);
      r.el.style.opacity = (0.7 * (1 - e)).toFixed(3);
      r.el.style.transform = 'translate(' + (r.x - 40).toFixed(1) + 'px,' + (r.y - 14).toFixed(1) + 'px) scale(' + (0.3 + 1.5 * e).toFixed(3) + ')';
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
    var h: any = function (e?: any) { e.preventDefault(); fn(); };
    var k: any = function (e?: any) { if (e.detail === 0) { fn(); } };
    node.addEventListener('pointerdown', h);
    node.addEventListener('click', k);
    offs.push(function () { node.removeEventListener('pointerdown', h); node.removeEventListener('click', k); });
  }
  bind(hull, onBoat);
  bind(jetty, onJetty);
  animals.forEach(function (a?: any) { bind(a.el, function () { onAnimal(a); }); });
  ducks.forEach(function (d?: any) { bind(d.el, function () { onDuck(d); }); });
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);
  document.addEventListener('visibilitychange', onVis);

  layout();
  f = fm;
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

export default function LodkaActivity() {
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
