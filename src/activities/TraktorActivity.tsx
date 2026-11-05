// Activity "Traktor": touch the tractor -> it starts / stops gently; it drives a closed serpentine loop over 3 field rows
// (row 1, 2, 3, 2, ...) with smooth U-turns and leaves tiny sprouts behind that slowly grow into flowers / vegetables.
// Touch a plant -> it wiggles once; touch the barn -> the tractor drives there and parks; touch the animal driver -> wave.
// All motion is driven by one rAF loop (capped dt, paused when the tab is hidden) so it keeps working under the global
// prefers-reduced-motion rule that disables CSS animations; the grown state of a plant is set from JS, never a keyframe.
import { useEffect, useRef } from 'react';
import { Rand } from '../utils/rand';

var CROSS_S: any = 12;            // seconds to cross the visible width at cruise speed (>= 10)
var RAMP_S: any = 2;              // gentle start / stop
var MAX_DT: any = 0.05;
var SLOTS: any = 12, GROW_S: any = 3, WIG_S: any = 1.2, WAVE_S: any = 2.4;
var FULL_WAIT_S: any = 1.5, FADE_S: any = 3;
var TURN_N: any = 24;

function sm(u?: any) { return u * u * (3 - 2 * u); }
function mod(a?: any, b?: any) { return a - Math.floor(a / b) * b; }

// Driver animals (drawn locally, 6): head fragment centred at (38,40) in the cab window; arm = wave colour.
function ears(c?: any, dx?: any, dy?: any, r?: any) {
  return '<circle cx="' + (38 - dx) + '" cy="' + dy + '" r="' + r + '" fill="' + c + '"/><circle cx="' + (38 + dx) + '" cy="' + dy + '" r="' + r + '" fill="' + c + '"/>';
}
function eyes() { return '<circle cx="34" cy="38" r="1.7" fill="#5b5675"/><circle cx="42" cy="38" r="1.7" fill="#5b5675"/>'; }
var DRIVERS: any = [
  { arm: '#c99b72', svg: ears('#c99b72', 7, 33, 4) + '<circle cx="38" cy="40" r="10" fill="#c99b72"/>' + eyes() +
    '<ellipse cx="38" cy="44" rx="4" ry="3" fill="#f3dcc4"/><circle cx="38" cy="43" r="1.4" fill="#6b6585"/>' },
  { arm: '#f2e6ef', svg: '<ellipse cx="32" cy="29" rx="3" ry="8" fill="#f2e6ef"/><ellipse cx="44" cy="29" rx="3" ry="8" fill="#f2e6ef"/>' +
    '<circle cx="38" cy="40" r="10" fill="#f2e6ef"/>' + eyes() + '<circle cx="38" cy="43" r="1.6" fill="#f3a8b8"/>' },
  { arm: '#f0b27a', svg: '<path d="M28 36l1-10 7 6zM48 36l-1-10-7 6z" fill="#f0b27a"/><circle cx="38" cy="40" r="10" fill="#f0b27a"/>' + eyes() +
    '<path d="M36 43l2 2 2-2z" fill="#e58aa0"/><path d="M26 42h6M44 42h6" stroke="#8a7a96" stroke-width="1"/>' },
  { arm: '#f6b9c8', svg: ears('#f6b9c8', 8, 32, 4) + '<circle cx="38" cy="40" r="10" fill="#f6b9c8"/>' + eyes() +
    '<ellipse cx="38" cy="44" rx="5" ry="3.5" fill="#f08fa8"/><circle cx="36.3" cy="44" r="1" fill="#8a4a60"/><circle cx="39.7" cy="44" r="1" fill="#8a4a60"/>' },
  { arm: '#b99572', svg: '<ellipse cx="29" cy="36" rx="3.5" ry="7" fill="#8f6f50" transform="rotate(15 29 36)"/><ellipse cx="47" cy="36" rx="3.5" ry="7" fill="#8f6f50" transform="rotate(-15 47 36)"/>' +
    '<circle cx="38" cy="40" r="10" fill="#b99572"/>' + eyes() + '<ellipse cx="38" cy="44" rx="4" ry="3" fill="#ecd9c3"/><circle cx="38" cy="43" r="1.5" fill="#4d4764"/>' },
  { arm: '#cfc9d6', svg: ears('#cfc9d6', 8, 32, 5.5) + ears('#f3c6d2', 8, 32, 3) + '<circle cx="38" cy="40" r="10" fill="#cfc9d6"/>' + eyes() +
    '<circle cx="38" cy="44" r="1.6" fill="#e58aa0"/>' }
];

function tractorSvg(d?: any) {
  return '<svg viewBox="0 0 120 84" aria-hidden="true" focusable="false">' +
    '<rect x="60" y="32" width="54" height="26" rx="9" fill="#9ed8c6"/>' +
    '<rect x="62" y="48" width="50" height="5" fill="#fff" opacity=".45"/>' +
    '<rect x="102" y="20" width="6" height="14" rx="3" fill="#7a748f"/>' +
    '<circle cx="112" cy="44" r="4" fill="#ffe9a8"/>' +
    '<rect x="14" y="16" width="48" height="44" rx="10" fill="#8cccb8"/>' +
    '<rect x="20" y="22" width="36" height="30" rx="8" fill="#fdfbff"/>' + d.svg +
    '<g class="tk-wave" transform="rotate(0 50 50)"><ellipse cx="50" cy="46" rx="3.5" ry="6" fill="' + d.arm + '"/></g>' +
    '<g class="tk-wheel" data-cx="32" data-cy="64"><circle cx="32" cy="64" r="19" fill="#6b6585"/><circle cx="32" cy="64" r="10" fill="#cfc9e6"/><path d="M32 52v24M20 64h24" stroke="#6b6585" stroke-width="3"/></g>' +
    '<g class="tk-wheel" data-cx="94" data-cy="70"><circle cx="94" cy="70" r="13" fill="#6b6585"/><circle cx="94" cy="70" r="7" fill="#cfc9e6"/><path d="M94 63v14M87 70h14" stroke="#6b6585" stroke-width="2.5"/></g>' +
    '</svg>';
}

function barnSvg() {
  return '<svg viewBox="0 0 120 104" aria-hidden="true" focusable="false">' +
    '<rect x="10" y="38" width="100" height="62" rx="6" fill="#f7b7a5"/>' +
    '<path d="M2 42L60 6l58 36z" fill="#d9a3b8"/>' +
    '<rect x="38" y="58" width="44" height="42" rx="6" fill="#fdf0d5"/>' +
    '<path d="M38 58l44 42M82 58L38 100" stroke="#e3c9a6" stroke-width="3"/>' +
    '<circle cx="60" cy="30" r="7" fill="#fdf0d5"/></svg>';
}

var KINDS: any = [
  '<circle cx="20" cy="14" r="7" fill="#f7a8c9"/><circle cx="20" cy="14" r="3" fill="#ffe08a"/>',
  '<circle cx="20" cy="14" r="7" fill="#ffd98a"/><circle cx="20" cy="14" r="3" fill="#f3b0a0"/>'
];
var CAR_TOP: any = 30; // y of the carrot's stem anchor: the root hangs from here and grows downward
function plantSvg(k?: any) {
  if (k % 3 === 2) {
    // carrot: green stem + leaves stay fixed; the orange root (.tk-car) scales down from the anchor line
    return '<svg viewBox="0 0 40 60" aria-hidden="true" focusable="false">' +
      '<g class="tk-hd"><path d="M20 ' + CAR_TOP + 'V20" stroke="#7fbf7a" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M20 22l-5-9M20 22l5-9M20 22v-12" stroke="#8fc98a" stroke-width="2.8" stroke-linecap="round"/></g>' +
      '<g class="tk-car"><path d="M12 ' + CAR_TOP + 'q8-4 16 0q-2 16-8 28q-6-12-8-28z" fill="#f3a35c"/>' +
      '<path d="M15 38h4M21 44h4" stroke="#e08a40" stroke-width="1.6" stroke-linecap="round"/></g></svg>';
  }
  return '<svg viewBox="0 0 40 60" aria-hidden="true" focusable="false">' +
    '<path d="M20 58V24" stroke="#7fbf7a" stroke-width="3.5" stroke-linecap="round"/>' +
    '<ellipse cx="13" cy="44" rx="7" ry="3.5" fill="#8fd08a" transform="rotate(-25 13 44)"/>' +
    '<ellipse cx="27" cy="40" rx="7" ry="3.5" fill="#8fd08a" transform="rotate(25 27 40)"/>' +
    '<g class="tk-hd" transform="translate(0 6)">' + KINDS[k % 3] + '</g></svg>';
}

function mount(container: HTMLElement) {
  var scene: any = document.createElement('div');
  scene.className = 'tk';
  scene.setAttribute('role', 'group');
  scene.setAttribute('aria-label', 'Traktor');
  var html: any = '<div class="tk-sun"></div><div class="tk-field"></div>' +
    '<div class="tk-furrows"><i></i><i></i><i></i></div>' +
    '<button class="tk-barn" type="button" aria-label="Stodoła – traktor jedzie do stodoły">' + barnSvg() + '</button>' +
    '<div class="tk-plants">';
  for (var r: any = 0; r < 3; r++) {
    for (var k: any = 0; k < SLOTS; k++) {
      html += '<div class="tk-pl" aria-hidden="true"><div class="tk-pi">' + plantSvg(k + r) + '</div></div>';
    }
  }
  html += '</div><div class="tk-tr" role="button" tabindex="0" aria-label="Traktor – ruszaj lub zatrzymaj">' + tractorSvg(Rand.pickOne(DRIVERS, 'traktor')) +
    '<button class="tk-dr" type="button" aria-label="Zwierzak za kierownicą – pomacha"></button></div>';
  scene.innerHTML = html;
  container.appendChild(scene);

  var tr: any = scene.querySelector('.tk-tr');
  var barn: any = scene.querySelector('.tk-barn');
  var driver: any = scene.querySelector('.tk-dr');
  var wave: any = scene.querySelector('.tk-wave');
  var wheels: any = [].slice.call(scene.querySelectorAll('.tk-wheel'));
  var furrows: any = [].slice.call(scene.querySelectorAll('.tk-furrows i'));
  var layer: any = scene.querySelector('.tk-plants');
  var plants: any = [].slice.call(scene.querySelectorAll('.tk-pl')).map(function (n?: any, i?: any) {
    return { n: n, pi: n.firstChild, hd: n.querySelector('.tk-hd'), car: n.querySelector('.tk-car'), row: Math.floor(i / SLOTS), k: i % SLOTS, age: -1, wig: -1 };
  });

  var W: any = 0, H: any = 0, tw: any = 0, th: any = 0, rh: any = 0, ps: any = 0, V: any = 1, Ltot: any = 1;
  var pieces: any = [], rowY: any = [], xl: any = 0, xr: any = 0, slotX: any = [], slotS: any = []; void slotS;
  var s: any = 0, v: any = 0, odo: any = 0, sUn: any = 0;
  var ramp: any = { v0: 0, vt: 0, t: RAMP_S, dur: RAMP_S };
  var plan: any = null, parked: any = true;
  var waveT: any = -1;
  var fullT: any = 0, fadeT: any = -1;
  var raf: any = 0, last: any = 0;

  function turnTable(rx?: any, dy?: any) {
    var t: any = [0], i: any, prev: any = [0, 0];
    for (i = 1; i <= TURN_N; i++) {
      var th2: any = Math.PI * i / TURN_N;
      var x: any = rx * Math.sin(th2), y: any = Math.abs(dy) * (1 - Math.cos(th2)) / 2;
      t.push(t[i - 1] + Math.sqrt((x - prev[0]) * (x - prev[0]) + (y - prev[1]) * (y - prev[1])));
      prev = [x, y];
    }
    return t;
  }

  function layout() {
    var oq: any = s / Ltot;
    W = scene.clientWidth || window.innerWidth;
    H = scene.clientHeight || window.innerHeight;
    var fieldTop: any = H * 0.3;
    rh = Math.min((H - fieldTop - 8) / 2.85, W * 0.28);
    var fTop: any = H - rh * 2.85 - 6;
    fieldTop = Math.max(H * 0.2, Math.min(fieldTop, fTop));
    tw = Math.min(rh * 1.6, W * 0.3, 230);
    th = tw * 84 / 120;
    var rx: any = rh * 0.35;
    ps = Math.max(26, Math.min(rh * 0.5, (W / SLOTS) * 1.6));
    xl = tw / 2 + rx + 6; xr = W - xl;
    var contact: any = rh * 0.3;
    rowY = [0, 1, 2].map(function (i?: any) { return fieldTop + rh * (i + 0.5); });
    var order: any = [[0, 1], [1, -1], [2, 1], [1, -1]];
    pieces = [];
    var acc: any = 0, i: any;
    var turns: any = [[1, 0, 1], [-1, 1, 2], [1, 2, 1], [-1, 1, 0]];
    for (i = 0; i < 4; i++) {
      var o: any = order[i], len: any = xr - xl;
      pieces.push({ k: 'row', s0: acc, len: len, row: o[0], dir: o[1], y: rowY[o[0]] });
      acc += len;
      var tt: any = turns[i], dy: any = rowY[tt[2]] - rowY[tt[1]];
      var tab: any = turnTable(rx, dy);
      pieces.push({ k: 'turn', s0: acc, len: tab[TURN_N], tab: tab, side: tt[0], ya: rowY[tt[1]], dy: dy,
        xe: tt[0] > 0 ? xr : xl, rx: rx });
      acc += tab[TURN_N];
    }
    Ltot = acc;
    var ratio: any = (W / CROSS_S) / V;
    V = W / CROSS_S;
    if (v) { v *= ratio; ramp.v0 *= ratio; ramp.vt *= ratio; }
    s = parked ? 0 : mod(oq * Ltot, Ltot);
    sUn = s;
    slotX = []; slotS = [];
    for (var k: any = 0; k < SLOTS; k++) { slotX.push(xl + (k + 0.5) / SLOTS * (xr - xl)); }
    // s of every slot on each straight piece
    pieces.forEach(function (p?: any) {
      if (p.k !== 'row') { return; }
      p.slotS = slotX.map(function (x?: any) { return p.s0 + (p.dir > 0 ? x - xl : xr - x); });
    });
    scene.style.setProperty('--tk-ft', fieldTop.toFixed(1) + 'px');
    scene.style.setProperty('--tk-tw', tw.toFixed(1) + 'px');
    scene.style.setProperty('--tk-th', th.toFixed(1) + 'px');
    furrows.forEach(function (f?: any, j?: any) {
      f.style.top = (rowY[j] + contact - rh * 0.3).toFixed(1) + 'px';
      f.style.height = (rh * 0.55).toFixed(1) + 'px';
    });
    var bw: any = Math.min(W * 0.34, (fieldTop + 4) * 1.15 * 0.95, 200);
    barn.style.width = bw.toFixed(1) + 'px';
    barn.style.height = (bw * 104 / 120).toFixed(1) + 'px';
    barn.style.left = (W * 0.04).toFixed(1) + 'px';
    barn.style.top = (fieldTop + 6 - bw * 104 / 120).toFixed(1) + 'px';
    plants.forEach(function (p?: any) {
      var x: any = slotX[p.k], y: any = rowY[p.row] + contact;
      p.n.style.left = (x - 28).toFixed(1) + 'px';
      p.n.style.top = (y - 56).toFixed(1) + 'px';
      p.pi.style.width = ps.toFixed(1) + 'px';
      p.pi.style.height = (ps * 1.5).toFixed(1) + 'px';
      p.pi.style.left = (28 - ps / 2).toFixed(1) + 'px';
      p.pi.style.top = (56 - ps * 1.5).toFixed(1) + 'px';
    });
    if (plan) { goBarn(); }
    place();
  }

  function pointAt(q?: any) {
    q = mod(q, Ltot);
    for (var i: any = 0; i < pieces.length; i++) {
      var p: any = pieces[i];
      if (q >= p.s0 && q < p.s0 + p.len || i === pieces.length - 1) {
        var u: any = q - p.s0;
        if (p.k === 'row') { return { x: p.dir > 0 ? xl + u : xr - u, y: p.y, nx: p.dir }; }
        var j: any = 0;
        while (j < TURN_N - 1 && p.tab[j + 1] < u) { j++; }
        var f: any = (u - p.tab[j]) / Math.max(1e-6, p.tab[j + 1] - p.tab[j]);
        var th2: any = Math.PI * (j + Math.min(1, Math.max(0, f))) / TURN_N;
        return { x: p.xe + p.side * p.rx * Math.sin(th2), y: p.ya + p.dy * (1 - Math.cos(th2)) / 2,
          nx: Math.max(-1, Math.min(1, p.side * Math.cos(th2) * 3)) };
      }
    }
    return { x: xl, y: rowY[0], nx: 1 };
  }

  function place() {
    var pt: any = pointAt(s);
    var contact: any = rh * 0.3;
    tr.style.transform = 'translate(' + (pt.x - tw / 2).toFixed(1) + 'px,' + (pt.y + contact - th).toFixed(1) + 'px) scale(' + pt.nx.toFixed(3) + ',1)';
  }

  function startRamp(vt?: any) { plan = null; ramp = { v0: v, vt: vt, t: 0, dur: RAMP_S }; }

  function goBarn() {
    if (parked) { return; }
    var D: any = mod(Ltot - s, Ltot);
    if (D < 1 && v < V * 0.05) { s = 0; sUn = 0; v = 0; parked = true; plan = null; ramp = { v0: 0, vt: 0, t: RAMP_S, dur: RAMP_S }; place(); return; }
    var T: any = Math.max(2.5, 1.2 * D / V);
    if (v > 0 && v * T > 2.85 * D) { T = 2.85 * D / v; }
    if (T < 2.5) { D += Ltot; T = Math.max(2.5, 1.2 * D / V); if (v * T > 2.85 * D) { T = 2.85 * D / v; } }
    plan = { D: D, T: T, v0: v, t: 0, s0: s };
    sUn = s;
  }

  function onTractor() {
    var moving: any = plan || ramp.vt > 0;
    parked = false;
    startRamp(moving ? 0 : V);
  }
  function onBarn() {
    if (parked) { return; }
    goBarn();
  }
  function onDriver() { if (waveT < 0) { waveT = 0; } }
  function onPlant(p?: any) { if (p.age >= 0 && p.wig < 0) { p.wig = 0; } }

  function paintPlant(p?: any) {
    var g: any = sm(Math.min(1, p.age / GROW_S));
    var sc: any = p.car ? 1 : 0.3 + 0.7 * g;
    var rot: any = 0;
    if (p.wig >= 0) { var k: any = p.wig / WIG_S; rot = Math.sin(k * Math.PI * 2) * 10 * (1 - k); }
    p.pi.style.transform = 'scale(' + sc.toFixed(3) + ') rotate(' + rot.toFixed(2) + 'deg)';
    if (p.car) {
      // stem anchor stays put; the root extends downward from it (set from JS, not a keyframe)
      p.hd.setAttribute('opacity', Math.max(0, Math.min(1, g / 0.2)).toFixed(3));
      p.car.setAttribute('transform', 'translate(0 ' + CAR_TOP + ') scale(1 ' + Math.max(0.02, g).toFixed(3) + ') translate(0 -' + CAR_TOP + ')');
      return;
    }
    p.hd.setAttribute('opacity', Math.max(0, Math.min(1, (g - 0.25) / 0.6)).toFixed(3));
  }

  function plant(p?: any) {
    p.age = 0; p.wig = -1;
    p.n.style.visibility = 'visible';
    paintPlant(p);
  }

  function crossings(sPrev?: any, delta?: any) {
    if (delta <= 0 || fadeT >= 0 || fullT > 0) { return; }
    pieces.forEach(function (pc?: any) {
      if (pc.k !== 'row') { return; }
      for (var k: any = 0; k < SLOTS; k++) {
        if (mod(pc.slotS[k] - sPrev, Ltot) <= delta) {
          var p: any = plants[pc.row * SLOTS + k];
          if (p.age < 0) { plant(p); }
        }
      }
    });
  }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    last = now;
    var df: any = 0;
    if (plan) {
      plan.t += dt;
      var u: any = Math.min(1, plan.t / plan.T), ss: any;
      var vT: any = plan.v0 * plan.T, u2: any = u * u, u3: any = u2 * u;
      ss = vT * (u3 - 2 * u2 + u) + plan.D * (3 * u2 - 2 * u3);
      v = Math.max(0, (vT * (3 * u2 - 4 * u + 1) + plan.D * 6 * u * (1 - u)) / plan.T);
      if (u >= 1) { ss = plan.D; v = 0; parked = true; ramp = { v0: 0, vt: 0, t: RAMP_S, dur: RAMP_S }; df = plan.s0 + ss - sUn; plan = null; }
      else { df = plan.s0 + ss - sUn; }
      var sPrev: any = s;
      sUn += df;
      s = parked ? 0 : mod(sUn, Ltot);
      if (parked) { sUn = 0; }
      crossings(sPrev, df);
    } else {
      ramp.t = Math.min(ramp.dur, ramp.t + dt);
      v = ramp.v0 + (ramp.vt - ramp.v0) * sm(ramp.t / ramp.dur);
      if (v < 0) { v = 0; }
      df = v * dt;
      var sp: any = s;
      s = mod(s + df, Ltot);
      sUn = s;
      crossings(sp, df);
    }
    odo += df;
    place();
    var ang: any = odo / 15 * 57.2958;
    wheels.forEach(function (w?: any, i?: any) {
      var a: any = i === 0 ? ang * 0.8 : ang * 1.2;
      w.setAttribute('transform', 'rotate(' + (a % 360).toFixed(1) + ' ' + w.getAttribute('data-cx') + ' ' + w.getAttribute('data-cy') + ')');
    });

    if (waveT >= 0) {
      waveT += dt;
      if (waveT >= WAVE_S) { waveT = -1; wave.setAttribute('transform', 'rotate(0 50 50)'); }
      else {
        var k: any = waveT / WAVE_S, e: any = Math.sin(k * Math.PI);
        wave.setAttribute('transform', 'rotate(' + (-70 * e + Math.sin(k * Math.PI * 4) * 18 * e).toFixed(2) + ' 50 50)');
      }
    }

    var full: any = true, any: any = false;
    plants.forEach(function (p?: any) {
      if (p.age < 0) { full = false; return; }
      any = true;
      var dirty: any = false;
      if (p.age < GROW_S) { p.age = Math.min(GROW_S, p.age + dt); dirty = true; }
      if (p.age < GROW_S) { full = false; }
      if (p.wig >= 0) { p.wig += dt; if (p.wig >= WIG_S) { p.wig = -1; } dirty = true; }
      if (dirty) { paintPlant(p); }
    });
    if (fadeT < 0) {
      if (full && any) {
        fullT += dt;
        if (fullT >= FULL_WAIT_S) { fadeT = 0; }
      }
    } else {
      fadeT += dt;
      if (fadeT >= FADE_S) {
        plants.forEach(function (p?: any) { p.age = -1; p.wig = -1; p.n.style.visibility = 'hidden'; });
        layer.style.opacity = '1';
        fadeT = -1; fullT = 0;
      } else { layer.style.opacity = (1 - sm(fadeT / FADE_S)).toFixed(3); }
    }
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
  function bind(node?: any, fn?: any, guard?: any) {
    var h: any = function (e?: any) { if (guard && guard(e)) { return; } e.preventDefault(); e.stopPropagation(); fn(); };
    var kk: any = function (e?: any) { if (e.detail === 0) { fn(); } };
    node.addEventListener('pointerdown', h);
    node.addEventListener('click', kk);
    offs.push(function () { node.removeEventListener('pointerdown', h); node.removeEventListener('click', kk); });
  }
  bind(tr, onTractor, function (e?: any) { return e.target.closest && e.target.closest('.tk-dr'); });
  bind(barn, onBarn);
  bind(driver, onDriver);
  plants.forEach(function (p?: any) { bind(p.n, function () { onPlant(p); }); });
  var onKey: any = function (e?: any) { if ((e.key === 'Enter' || e.key === ' ') && e.target === tr) { e.preventDefault(); onTractor(); } };
  tr.addEventListener('keydown', onKey);
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);
  document.addEventListener('visibilitychange', onVis);

  layout();
  start();

  return function () {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    offs.forEach(function (o?: any) { o(); });
    tr.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', layout);
    window.removeEventListener('orientationchange', layout);
    document.removeEventListener('visibilitychange', onVis);
    if (scene.parentNode) { scene.parentNode.removeChild(scene); }
  };
}

export default function TraktorActivity() {
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
