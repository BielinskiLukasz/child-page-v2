// Activity "Mały Pociąg": touch the train -> it starts / stops gently; touch the station -> it stops there;
// touch an animal in a wagon -> it nods. All motion is driven by one rAF loop (capped dt, paused when the tab is
// hidden) so it keeps working under the global prefers-reduced-motion rule that disables CSS animations.
// Train position is a fraction f of the loop (0 = just off the left edge, 1 = just off the right edge), so the speed
// and the station position stay valid when the screen size or orientation changes.
import { useEffect, useRef } from 'react';
import { Animals } from '../utils/animals';

var CROSS_S: any = 22;            // seconds for a full loop at cruise speed (the front crosses the visible width in >= ~12 s even on narrow screens)
var V: any = 1 / CROSS_S;         // cruise speed, loop fractions per second
var RAMP_S: any = 2;              // gentle start / stop
var MAX_DT: any = 0.05;
var MAX_PUFFS: any = 5, PUFF_S: any = 3.2;
var NOD_S: any = 1.8;

function sm(u?: any) { return u * u * (3 - 2 * u); }
function wrap(x?: any) { return x - Math.floor(x); }

function animalSvg(animal?: any, cx?: any) {
  return '<g class="tp-animal" data-cx="' + cx + '" transform="translate(' + cx + ' 50)">' + Animals.head(animal.id) + '</g>';
}

function trainSvg(picks?: any) {
  var s: any = '<svg viewBox="0 0 400 100" aria-hidden="true" focusable="false">';
  var colors: any = ['#f7a8c9', '#a9d6f2', '#ffd98a'];
  for (var i: any = 0; i < 3; i++) {
    var x: any = 4 + i * 100, cx: any = x + 46;
    s += '<rect x="' + (x + 90) + '" y="76" width="14" height="4" rx="2" fill="#8a84a8"/>' +
      '<rect x="' + x + '" y="18" width="92" height="62" rx="12" fill="' + colors[i] + '"/>' +
      '<rect x="' + x + '" y="62" width="92" height="6" fill="#fff" opacity=".45"/>' +
      '<circle cx="' + cx + '" cy="50" r="21" fill="#fdfbff"/>' + animalSvg(picks[i], cx) +
      '<path d="M' + (cx - 21) + ' 50a21 21 0 0 1 42 0z" fill="none"/>';
  }
  // locomotive: the train travels to the right, so the cab sits at the back (next to the carriages) and the boiler, chimney and headlight at the front
  s += '<rect x="326" y="30" width="60" height="50" rx="10" fill="#9ed8c6"/>' +
    '<rect x="304" y="14" width="46" height="66" rx="10" fill="#8cccb8"/>' +
    '<rect x="314" y="22" width="30" height="26" rx="8" fill="#fdfbff"/>' +
    '<rect x="356" y="8" width="16" height="26" rx="5" fill="#7a748f"/><rect x="352" y="4" width="24" height="8" rx="4" fill="#5b5675"/>' +
    '<circle cx="360" cy="58" r="7" fill="#ffe9a8"/><rect x="304" y="62" width="82" height="6" fill="#fff" opacity=".45"/>';
  // wheels (spokes rotate from JS)
  [30, 130, 230, 322, 362].forEach(function (wx?: any) {
    s += '<g class="tp-wheel" data-cx="' + wx + '"><circle cx="' + wx + '" cy="86" r="11" fill="#6b6585"/>' +
      '<circle cx="' + wx + '" cy="86" r="6" fill="#cfc9e6"/><path d="M' + wx + ' 80v12M' + (wx - 6) + ' 86h12" stroke="#6b6585" stroke-width="2.5"/></g>';
  });
  return s + '</svg>';
}

function stationSvg() {
  return '<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' +
    '<rect x="14" y="44" width="172" height="72" rx="8" fill="#fdf0d5"/>' +
    '<path d="M4 48L100 8l96 40z" fill="#f7b7a5"/>' +
    '<rect x="84" y="70" width="32" height="46" rx="8" fill="#b9b3e0"/>' +
    '<rect x="30" y="62" width="34" height="26" rx="6" fill="#cfeaf7"/><rect x="136" y="62" width="34" height="26" rx="6" fill="#cfeaf7"/>' +
    '<circle cx="100" cy="36" r="11" fill="#fff"/><path d="M100 36v-7M100 36l5 3" stroke="#5b5675" stroke-width="2.5" stroke-linecap="round"/></svg>';
}

function hillsSvg() {
  return '<svg class="tp-hills" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    '<path d="M0 200V110Q140 30 300 100T600 90T1000 70V200z" fill="#cdeac3"/>' +
    '<path d="M0 200V150Q200 90 420 140T800 120T1000 140V200z" fill="#b6e0aa"/></svg>';
}

function mount(container: HTMLElement) {
  var picks: any = Animals.pick(3); // a new random trio on every launch, nothing stored
  var scene: any = document.createElement('div');
  scene.className = 'tp';
  scene.setAttribute('role', 'group');
  scene.setAttribute('aria-label', 'Mały pociąg');
  scene.innerHTML =
    '<div class="tp-sun"></div>' + hillsSvg() + '<div class="tp-ground"></div><div class="tp-track"></div>' +
    '<button class="tp-station" type="button" aria-label="Stacja – zatrzymaj pociąg na stacji">' + stationSvg() + '</button>' +
    '<div class="tp-puffs"></div>' +
    '<div class="tp-train" role="button" tabindex="0" aria-label="Pociąg – ruszaj lub zatrzymaj">' + trainSvg(picks) +
    picks.map(function (a?: any, i?: any) { return '<button class="tp-ab" type="button" data-i="' + i + '" aria-label="' + a.name + ' w wagonie"></button>'; }).join('') + '</div>';
  container.appendChild(scene);

  var train: any = scene.querySelector('.tp-train');
  var station: any = scene.querySelector('.tp-station');
  var puffLayer: any = scene.querySelector('.tp-puffs');
  var animals: any = [].slice.call(scene.querySelectorAll('.tp-animal'));
  var wheels: any = [].slice.call(scene.querySelectorAll('.tp-wheel'));
  var abtns: any = [].slice.call(scene.querySelectorAll('.tp-ab'));
  var nods: any = animals.map(function () { return -1; });

  var W: any = 0, H: any = 0, tw: any = 0, th: any = 0, trackY: any = 0, L: any = 1, fs: any = 0.5;
  var f: any = 0, v: any = 0, odo: any = 0, f_unwrapped: any = 0, df: any = 0; void df;
  var ramp: any = { v0: 0, vt: 0, t: RAMP_S, dur: RAMP_S };
  var plan: any = null;
  var parked: any = true;
  var puffs: any = [], puffT: any = 0;
  var raf: any = 0, last: any = 0;

  function layout() {
    W = scene.clientWidth || window.innerWidth;
    H = scene.clientHeight || window.innerHeight;
    tw = Math.min(W * 0.8, 560, H * 1.6);
    th = tw / 4;
    trackY = H * 0.72;
    L = W + tw;
    fs = (tw + (W - tw) / 2) / L;
    scene.style.setProperty('--tw', tw.toFixed(1) + 'px');
    scene.style.setProperty('--th', th.toFixed(1) + 'px');
    scene.style.setProperty('--ty', trackY.toFixed(1) + 'px');
    if (parked) { f = fs; }
    else if (plan) { goStation(); }   // station moved: re-plan from the current speed so there is no snap at the end
    place();
  }

  function place() {
    train.style.transform = 'translate(' + (f * L - tw).toFixed(1) + 'px,' + (trackY - th * 0.9).toFixed(1) + 'px)';
  }

  function startRamp(vt?: any) {
    plan = null;
    ramp = { v0: v, vt: vt, t: 0, dur: RAMP_S };
  }

  function goStation() {
    if (parked) { return; }
    var D: any = wrap(fs - f);
    if (D < 0.002 && v < V * 0.05) { f = fs; v = 0; parked = true; plan = null; ramp = { v0: 0, vt: 0, t: RAMP_S, dur: RAMP_S }; place(); return; }
    // cubic Hermite from the current speed to a stop at the station: smooth, never backwards
    // T is capped at 2.85*D/v (Hermite with end speed 0 stays monotone while v*T <= 3D); a lap is added only when that would mean braking in < 2.5 s
    var T: any = Math.max(2.5, 1.2 * D / V);
    if (v > 0 && v * T > 2.85 * D) { T = 2.85 * D / v; }
    if (T < 2.5) { D += 1; T = Math.max(2.5, 1.2 * D / V); if (v * T > 2.85 * D) { T = 2.85 * D / v; } }
    plan = { D: D, T: T, v0: v, t: 0 };
    f_unwrapped = f;
    plan.f0 = f;
  }

  function onTrain() {
    var moving: any = plan || ramp.vt > 0;
    parked = false;
    startRamp(moving ? 0 : V);
  }

  function onAnimal(i?: any) { if (nods[i] < 0) { nods[i] = 0; } }

  function spawnPuff() {
    if (puffs.length >= MAX_PUFFS) { return; }
    var n: any = document.createElement('div');
    n.className = 'tp-puff';
    puffLayer.appendChild(n);
    puffs.push({ n: n, t: 0, x: f * L - tw + tw * 0.91, y: trackY - th * 0.9 + th * 0.02, dx: 6 + Math.random() * 6 });
  }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    last = now;
    var df: any = 0;
    if (plan) {
      plan.t += dt;
      var u: any = Math.min(1, plan.t / plan.T), s: any;
      var vT: any = plan.v0 * plan.T, u2: any = u * u, u3: any = u2 * u;
      s = vT * (u3 - 2 * u2 + u) + plan.D * (3 * u2 - 2 * u3);
      v = Math.max(0, (vT * (3 * u2 - 4 * u + 1) + plan.D * 6 * u * (1 - u)) / plan.T);
      if (u >= 1) { s = plan.D; v = 0; parked = true; ramp = { v0: 0, vt: 0, t: RAMP_S, dur: RAMP_S }; df = plan.f0 + s - f_unwrapped; plan = null; f = fs; f_unwrapped = f; }
      else { df = plan.f0 + s - f_unwrapped; f_unwrapped = plan.f0 + s; f = wrap(f_unwrapped); }
    } else {
      ramp.t = Math.min(ramp.dur, ramp.t + dt);
      v = ramp.v0 + (ramp.vt - ramp.v0) * sm(ramp.t / ramp.dur);
      if (v < 0) { v = 0; }
      df = v * dt;
      f = wrap(f + df);
      f_unwrapped = f;
    }
    odo += df * L;
    place();
    var ang: any = (odo / 11 * 57.2958) % 360;
    wheels.forEach(function (w?: any) { w.setAttribute('transform', 'rotate(' + ang.toFixed(1) + ' ' + w.getAttribute('data-cx') + ' 86)'); });

    animals.forEach(function (a?: any, i?: any) {
      var cx: any = a.getAttribute('data-cx');
      if (nods[i] < 0) { return; }
      nods[i] += dt;
      if (nods[i] >= NOD_S) { nods[i] = -1; a.setAttribute('transform', 'translate(' + cx + ' 50)'); return; }
      var k: any = nods[i] / NOD_S, e: any = Math.sin(k * Math.PI);
      var rot: any = Math.sin(k * Math.PI * 2) * 14 * e, dy: any = Math.sin(k * Math.PI * 2) * 3 * e;
      a.setAttribute('transform', 'translate(' + cx + ' ' + (50 + dy).toFixed(2) + ') rotate(' + rot.toFixed(2) + ')');
    });

    // soft steam: bounded pool, nodes removed when finished
    puffT -= dt;
    if (puffT <= 0) { spawnPuff(); puffT = v > 0.002 ? 1.1 : 2.4; }
    for (var i: any = puffs.length - 1; i >= 0; i--) {
      var p: any = puffs[i];
      p.t += dt;
      if (p.t >= PUFF_S) { if (p.n.parentNode) { p.n.parentNode.removeChild(p.n); } puffs.splice(i, 1); continue; }
      var k2: any = p.t / PUFF_S, sz: any = th * (0.18 + 0.3 * k2);
      p.n.style.width = p.n.style.height = sz.toFixed(1) + 'px';
      p.n.style.opacity = (0.8 * (1 - k2) * Math.min(1, k2 * 6)).toFixed(3);
      p.n.style.transform = 'translate(' + (p.x - sz / 2 - p.dx * k2).toFixed(1) + 'px,' + (p.y - th * 1.1 * k2 - sz / 2).toFixed(1) + 'px)';
    }
    if (!document.hidden) { raf = requestAnimationFrame(frame); }
  }
  var f_unwrapped: any = 0;

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
    var h: any = function (e?: any) { if (e.target.closest && e.target.closest('.tp-ab') && node === train) { return; } e.preventDefault(); fn(); };
    var k: any = function (e?: any) { if (e.detail === 0) { fn(); } };
    node.addEventListener('pointerdown', h);
    node.addEventListener('click', k);
    offs.push(function () { node.removeEventListener('pointerdown', h); node.removeEventListener('click', k); });
  }
  bind(train, onTrain);
  bind(station, goStation);
  abtns.forEach(function (b?: any, i?: any) {
    var h: any = function (e?: any) { e.stopPropagation(); e.preventDefault(); onAnimal(i); };
    var k: any = function (e?: any) { e.stopPropagation(); if (e.detail === 0) { onAnimal(i); } };
    b.addEventListener('pointerdown', h);
    b.addEventListener('click', k);
    offs.push(function () { b.removeEventListener('pointerdown', h); b.removeEventListener('click', k); });
  });
  var onKey: any = function (e?: any) { if ((e.key === 'Enter' || e.key === ' ') && e.target === train) { e.preventDefault(); onTrain(); } };
  train.addEventListener('keydown', onKey);
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);
  document.addEventListener('visibilitychange', onVis);

  layout();
  f_unwrapped = f;
  start();

  return function () {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    offs.forEach(function (o?: any) { o(); });
    train.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', layout);
    window.removeEventListener('orientationchange', layout);
    document.removeEventListener('visibilitychange', onVis);
    if (scene.parentNode) { scene.parentNode.removeChild(scene); }
  };
}

export default function PociagActivity() {
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
