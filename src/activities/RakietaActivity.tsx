// Activity "Rakieta": a small rocket with an animal astronaut drifts through a starry sky with three friendly planets.
// Touch the rocket -> it flies slowly along a smooth looping path; touch it again -> it slows to a hover (~2 s) and bobs.
// Touch a planet -> the rocket curves over to it (damped spring, rotated pull), hovers beside it for ~3 s while the planet
// glows softly, then resumes what it was doing. Touch a star -> one slow twinkle; touch the astronaut -> a slow wave.
// Each launch picks (Rand) one of 6 animal astronauts, one of 6 planet colour sets and one of 4 star/planet arrangements.
// All motion runs from one rAF loop (capped dt, paused when the tab is hidden) so it works under the global
// prefers-reduced-motion rule that disables CSS animations.
import { useEffect, useRef } from 'react';
import { Rand } from '../utils/rand';

var CROSS_S: any = 15;             // seconds to cross the screen width at cruise speed (>= 12 s)
var HOVER_TAU: any = 0.5;          // slow-down time constant (~2 s to stop)
var BOB_AMP: any = 4, BOB_W: any = 1.9; // bob <= ~4 px each way, one bob every ~3.3 s
var STAY_S: any = 3;               // time next to a planet
var MAX_DT: any = 0.05;
var MAX_PUFFS: any = 8, PUFF_S: any = 2.6, PUFF_EVERY: any = 0.6;
var WAVE_S: any = 2.4, TW_S: any = 2.4;
var K: any = 0.8, C: any = 1.8;         // spring stiffness and damping (about critical)
var TWO_PI: any = Math.PI * 2, UP: any = -Math.PI / 2;

// 4 arrangements: 15 star spots + 3 planet spots as fractions of the sky (checked to keep stars clear of planets).
var LAYOUTS: any = [
  { stars: [[0.07, 0.08], [0.30, 0.06], [0.50, 0.13], [0.72, 0.07], [0.93, 0.12], [0.38, 0.30], [0.14, 0.47], [0.90, 0.50], [0.48, 0.46], [0.28, 0.62], [0.75, 0.83], [0.92, 0.72], [0.42, 0.86], [0.06, 0.29], [0.59, 0.30]],
    planets: [[0.2, 0.2], [0.8, 0.32], [0.62, 0.68]] },
  { stars: [[0.06, 0.10], [0.28, 0.06], [0.50, 0.06], [0.70, 0.06], [0.94, 0.08], [0.08, 0.50], [0.38, 0.62], [0.30, 0.46], [0.70, 0.50], [0.94, 0.55], [0.06, 0.90], [0.30, 0.88], [0.57, 0.62], [0.90, 0.90], [0.70, 0.90]],
    planets: [[0.2, 0.7], [0.5, 0.3], [0.82, 0.74]] },
  { stars: [[0.10, 0.06], [0.35, 0.10], [0.62, 0.06], [0.90, 0.10], [0.06, 0.34], [0.30, 0.30], [0.50, 0.50], [0.68, 0.33], [0.94, 0.40], [0.10, 0.62], [0.30, 0.90], [0.52, 0.88], [0.90, 0.90], [0.50, 0.68], [0.70, 0.61]],
    planets: [[0.78, 0.2], [0.2, 0.5], [0.76, 0.8]] },
  { stars: [[0.06, 0.06], [0.30, 0.08], [0.50, 0.06], [0.70, 0.10], [0.94, 0.06], [0.06, 0.30], [0.51, 0.29], [0.94, 0.30], [0.30, 0.52], [0.70, 0.57], [0.06, 0.60], [0.94, 0.60], [0.30, 0.90], [0.50, 0.58], [0.70, 0.90]],
    planets: [[0.3, 0.3], [0.7, 0.35], [0.5, 0.8]] }
];
var PCOLS: any = [
  [['#f7c9a0', '#e9b184'], ['#c9b8f2', '#b3a0e6'], ['#a8d8f0', '#8fc6e6']],
  [['#f7a8c9', '#e68fb5'], ['#fff0a8', '#f0dc7c'], ['#b8e6c9', '#98d4ae']],
  [['#b3a0e6', '#9a86d6'], ['#f7c9a0', '#e9b184'], ['#fff0a8', '#f0dc7c']],
  [['#a8d8f0', '#8fc6e6'], ['#b8e6c9', '#98d4ae'], ['#f7a8c9', '#e68fb5']],
  [['#f9b8a6', '#ec9c88'], ['#c9b8f2', '#b3a0e6'], ['#b8e6c9', '#98d4ae']],
  [['#fff0a8', '#f0dc7c'], ['#a8d8f0', '#8fc6e6'], ['#f7a8c9', '#e68fb5']]
];
// astronauts: fur colour, muzzle colour, ears kind and ear colour (drawn locally, 6 animals)
var ASTROS: any = [
  { fur: '#c99b72', mz: '#f3dcc4', ears: 'round', ec: '#c99b72' },
  { fur: '#f2ece6', mz: '#f7c9d4', ears: 'long', ec: '#f2ece6' },
  { fur: '#e8a66a', mz: '#fbe6d0', ears: 'point', ec: '#e8a66a' },
  { fur: '#d9b48a', mz: '#f6e6d2', ears: 'flop', ec: '#8f6a4a' },
  { fur: '#8fd09a', mz: '#d9f2de', ears: 'frog', ec: '#8fd09a' },
  { fur: '#f7f4f0', mz: '#ffffff', ears: 'round', ec: '#4a4660', patch: true }
];

function sm(u?: any) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }
function wrapPi(a?: any) { a = (a + Math.PI) % TWO_PI; if (a < 0) { a += TWO_PI; } return a - Math.PI; }
function clamp(v?: any, a?: any, b?: any) { return Math.max(a, Math.min(b, v)); }

function astroSvg(a?: any) {
  var e: any = '', f: any = a.fur, ec: any = a.ec;
  if (a.ears === 'round') { e = '<circle cx="95" cy="40" r="5" fill="' + ec + '"/><circle cx="113" cy="40" r="5" fill="' + ec + '"/>'; }
  else if (a.ears === 'long') { e = '<ellipse cx="97" cy="36" rx="3.6" ry="7" fill="' + ec + '"/><ellipse cx="111" cy="36" rx="3.6" ry="7" fill="' + ec + '"/><ellipse cx="97" cy="37" rx="1.6" ry="4.5" fill="' + a.mz + '"/><ellipse cx="111" cy="37" rx="1.6" ry="4.5" fill="' + a.mz + '"/>'; }
  else if (a.ears === 'point') { e = '<path d="M91 46L93 34L102 41z" fill="' + ec + '"/><path d="M117 46L115 34L106 41z" fill="' + ec + '"/>'; }
  else if (a.ears === 'flop') { e = '<ellipse cx="91" cy="48" rx="4.5" ry="8" fill="' + ec + '"/><ellipse cx="117" cy="48" rx="4.5" ry="8" fill="' + ec + '"/>'; }
  else { e = '<circle cx="96" cy="40" r="5.5" fill="' + ec + '"/><circle cx="112" cy="40" r="5.5" fill="' + ec + '"/><circle cx="96" cy="40" r="2.6" fill="#fff"/><circle cx="112" cy="40" r="2.6" fill="#fff"/><circle cx="96" cy="40" r="1.3" fill="#5b5675"/><circle cx="112" cy="40" r="1.3" fill="#5b5675"/>'; }
  var eyes: any = a.ears === 'frog' ? '' : '<circle cx="99" cy="49" r="1.8" fill="#5b5675"/><circle cx="109" cy="49" r="1.8" fill="#5b5675"/>';
  var patch: any = a.patch ? '<ellipse cx="99" cy="49" rx="3.4" ry="4" fill="#4a4660"/><ellipse cx="109" cy="49" rx="3.4" ry="4" fill="#4a4660"/><circle cx="99" cy="49" r="1.4" fill="#fff"/><circle cx="109" cy="49" r="1.4" fill="#fff"/>' : '';
  return '<g class="rq-ast">' + e + '<circle cx="104" cy="51" r="12" fill="' + f + '"/><ellipse cx="104" cy="56" rx="5.5" ry="4" fill="' + a.mz + '"/>' +
    eyes + patch + '<circle cx="104" cy="54.5" r="1.6" fill="#6b5a73"/>' +
    '<g class="rq-paw"><circle cx="0" cy="0" r="4.5" fill="' + f + '"/></g></g>';
}

function rocketSvg(a?: any) {
  return '<svg viewBox="0 0 200 100" aria-hidden="true" focusable="false">' +
    '<g class="rq-flame"><path d="M44 50Q20 32 6 50Q20 68 44 50z" fill="#ffd98a"/><path d="M44 50Q28 41 18 50Q28 59 44 50z" fill="#fff4cf"/></g>' +
    '<path d="M70 28L50 6Q62 4 78 22z" fill="#a8d8f0"/><path d="M70 72L50 94Q62 96 78 78z" fill="#a8d8f0"/>' +
    '<path d="M40 32Q40 22 54 22L118 22Q160 28 180 50Q160 72 118 78L54 78Q40 78 40 68z" fill="#fdfbff"/>' +
    '<path d="M140 25Q166 32 180 50Q166 68 140 75Q150 50 140 25z" fill="#f7a8c9"/>' +
    '<rect x="48" y="40" width="10" height="20" rx="5" fill="#c9b8f2"/>' +
    '<circle cx="104" cy="50" r="19" fill="#cfeaf7" stroke="#a8d8f0" stroke-width="4"/>' +
    astroSvg(a) + '</svg>';
}

function starSvg() {
  return '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M20 3l4.6 11.6L37 15.6l-9.6 7.8L30.4 36 20 29l-10.4 7 3-12.6L3 15.6l12.4-1z" fill="#fff4cf" stroke="#fff4cf" stroke-width="3" stroke-linejoin="round"/></svg>';
}

function planetSvg(c?: any) {
  return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
    '<circle cx="50" cy="50" r="44" fill="' + c[0] + '"/>' +
    '<circle cx="24" cy="36" r="8" fill="' + c[1] + '"/><circle cx="78" cy="66" r="10" fill="' + c[1] + '"/><circle cx="66" cy="22" r="5" fill="' + c[1] + '"/>' +
    '<circle cx="39" cy="46" r="3.6" fill="#5b5675"/><circle cx="61" cy="46" r="3.6" fill="#5b5675"/>' +
    '<path d="M38 59Q50 70 62 59" fill="none" stroke="#6b5a73" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="31" cy="57" r="5" fill="#f7a8c9" opacity=".55"/><circle cx="69" cy="57" r="5" fill="#f7a8c9" opacity=".55"/></svg>';
}

function mount(container: HTMLElement) {
  var L: any = Rand.pickOne(LAYOUTS, 'rakieta-layout');
  var PCOL: any = Rand.pickOne(PCOLS, 'rakieta-colours');
  var ASTRO: any = Rand.pickOne(ASTROS, 'rakieta-astro');
  var STARS: any = L.stars, PLANETS: any = L.planets;
  var scene: any = document.createElement('div');
  scene.className = 'rq';
  scene.setAttribute('role', 'group');
  scene.setAttribute('aria-label', 'Rakieta');
  var html: any = '';
  var i: any;
  for (i = 0; i < STARS.length; i++) {
    html += '<button class="rq-star" type="button" data-i="' + i + '" aria-label="Gwiazdka ' + (i + 1) + ' – zamigocze">' + starSvg() + '</button>';
  }
  for (i = 0; i < PLANETS.length; i++) {
    html += '<button class="rq-planet" type="button" data-i="' + i + '" aria-label="Planeta ' + (i + 1) + ' – rakieta poleci do niej"><span class="rq-halo"></span>' + planetSvg(PCOL[i]) + '</button>';
  }
  html += '<div class="rq-puffs"></div>' +
    '<div class="rq-rocket">' + rocketSvg(ASTRO) +
    '<button class="rq-rbtn" type="button" aria-label="Rakieta – leć lub zawisnij"></button>' +
    '<button class="rq-abtn" type="button" aria-label="Astronauta – pomachaj"></button></div>';
  scene.innerHTML = html;
  container.appendChild(scene);

  var rocket: any = scene.querySelector('.rq-rocket');
  var rbtn: any = scene.querySelector('.rq-rbtn');
  var abtn: any = scene.querySelector('.rq-abtn');
  var flame: any = scene.querySelector('.rq-flame');
  var paw: any = scene.querySelector('.rq-paw');
  var puffLayer: any = scene.querySelector('.rq-puffs');
  var stars: any = [].slice.call(scene.querySelectorAll('.rq-star'));
  var planets: any = [].slice.call(scene.querySelectorAll('.rq-planet'));
  var halos: any = planets.map(function (p?: any) { return p.querySelector('.rq-halo'); });
  var twT: any = stars.map(function () { return -1; });
  var glow: any = planets.map(function () { return 0; });

  var W: any = 0, H: any = 0, pw: any = 160, ph: any = 80, m: any = 90, sc: any = 40, Rt: any = 40, Om: any = 1, pr: any = 80;
  var cx: any = 0, cy: any = 0, rx: any = 0, ry: any = 0;
  var st: any = 'hover', prev: any = 'hover';          // hover | fly | visit
  var x: any = 0, y: any = 0, hd: any = UP, spd: any = 0, om: any = 0;
  var ang: any = UP, sy: any = 1, face: any = 1;
  var vs: any = null;                             // visit: { i, phase, t, vx, vy, curve, tt }
  var puffs: any = [], puffT: any = 0, waveT: any = -1, clock: any = 0;
  var raf: any = 0, last: any = 0, started: any = false;

  function planetPos(i?: any) { return { x: W * PLANETS[i][0], y: H * PLANETS[i][1] }; }
  function spot(i?: any) {
    var p: any = planetPos(i), side: any = p.x < W / 2 ? 1 : -1;
    return { x: clamp(p.x + side * (pr / 2 + pw * 0.5 + 10), m, W - m), y: clamp(p.y, m, H - m) };
  }

  function layout() {
    var oW: any = W, oH: any = H;
    W = scene.clientWidth || window.innerWidth;
    H = scene.clientHeight || window.innerHeight;
    pw = clamp(Math.min(W * 0.3, H * 0.4), 150, 260);
    ph = pw / 2;
    m = pw * 0.5 + 6;
    pr = clamp(Math.min(W, H) * 0.2, 64, 140);
    sc = W / CROSS_S;
    Rt = Math.max(Math.min(W, H) * 0.09, 36);
    Om = sc / Rt;
    cx = W / 2; cy = H / 2;
    rx = Math.max(20, W / 2 - m); ry = Math.max(20, H / 2 - m);
    scene.style.setProperty('--pw', pw.toFixed(1) + 'px');
    scene.style.setProperty('--ph', ph.toFixed(1) + 'px');
    scene.style.setProperty('--pr', pr.toFixed(1) + 'px');
    planets.forEach(function (p?: any, k?: any) {
      var q: any = planetPos(k);
      p.style.left = q.x.toFixed(1) + 'px'; p.style.top = q.y.toFixed(1) + 'px';
    });
    stars.forEach(function (s?: any, k?: any) {
      s.style.left = (STARS[k][0] * W).toFixed(1) + 'px'; s.style.top = (STARS[k][1] * H).toFixed(1) + 'px';
    });
    if (!started) {
      x = Math.max(W * 0.16, m); y = Math.min(H * 0.82, H - m); started = true;
    } else if (oW && oH) {
      x *= W / oW; y *= H / oH;
      if (vs) { vs.vx *= W / oW; vs.vy *= H / oH; }
    }
    x = clamp(x, m, W - m); y = clamp(y, m, H - m);
    render();
  }

  function bobY() {
    var cur: any = st === 'visit' && vs ? Math.hypot(vs.vx, vs.vy) : spd;
    return Math.sin(clock * BOB_W) * BOB_AMP * (1 - sm(cur / (0.4 * sc)));
  }

  function render() {
    rocket.style.transform = 'translate(' + (x - pw / 2).toFixed(1) + 'px,' + (y + bobY() - ph / 2).toFixed(1) + 'px) rotate(' +
      (ang * 57.2958).toFixed(2) + 'deg) scale(1,' + sy.toFixed(3) + ')';
  }

  function endVisit(toState?: any) {
    if (vs) {
      var s: any = Math.hypot(vs.vx, vs.vy);
      if (s > 1) { hd = Math.atan2(vs.vy, vs.vx); }
      spd = s; om = 0; vs = null;
    }
    st = toState;
  }

  function onRocket() {
    if (st === 'visit') { prev = prev === 'fly' ? 'hover' : 'fly'; endVisit(prev); }
    else if (st === 'hover') { st = 'fly'; }
    else { st = 'hover'; }
  }

  function onPlanet(i?: any) {
    if (st !== 'visit') {
      prev = st;
      vs = { i: i, phase: 'go', t: 0, vx: Math.cos(hd) * spd, vy: Math.sin(hd) * spd, curve: x < W / 2 ? -1 : 1 };
      st = 'visit';
    } else { vs.i = i; vs.phase = 'go'; vs.t = 0; vs.curve = x < W / 2 ? -1 : 1; }
  }

  function onStar(i?: any) { if (twT[i] < 0) { twT[i] = 0; } }
  function onAstronaut() { if (waveT < 0) { waveT = 0; } }

  function spawnPuff() {
    if (puffs.length >= MAX_PUFFS) { return; }
    var n: any = document.createElement('div');
    n.className = 'rq-puff';
    puffLayer.appendChild(n);
    puffs.push({ n: n, t: 0, x: x - Math.cos(ang) * pw * 0.52, y: y + bobY() - Math.sin(ang) * pw * 0.52 });
  }

  function steer(tx?: any, ty?: any, gate?: any, dt?: any) {
    var diff: any = wrapPi(Math.atan2(ty - y, tx - x) - hd);
    var want: any = clamp(diff * 1.5, -Om, Om) * gate;
    om += (want - om) * Math.min(1, dt * 2.5);
    hd += om * dt;
  }

  function updateFly(dt?: any) {
    spd += (sc - spd) * (1 - Math.exp(-dt * 0.9));
    var gate: any = sm((spd / sc - 0.15) / 0.5);
    var th: any = Math.atan2((y - cy) / ry, (x - cx) / rx) + 0.6;
    steer(cx + rx * Math.cos(th), cy + ry * Math.sin(th), gate, dt);
    x += Math.cos(hd) * spd * dt;
    y += Math.sin(hd) * spd * dt;
  }

  function updateHover(dt?: any) {
    spd *= Math.exp(-dt / HOVER_TAU);
    if (spd < 0.01 * sc) { spd = 0; om = 0; }
    x += Math.cos(hd) * spd * dt;
    y += Math.sin(hd) * spd * dt;
  }

  function updateVisit(dt?: any) {
    var T: any = spot(vs.i), dx: any = T.x - x, dy: any = T.y - y, dist: any = Math.hypot(dx, dy);
    var a: any = vs.phase === 'go' ? vs.curve * 0.6 * sm(dist / (pw * 3)) : 0;
    var ca: any = Math.cos(a), sa: any = Math.sin(a);
    var ax: any = K * (dx * ca - dy * sa) - C * vs.vx, ay: any = K * (dx * sa + dy * ca) - C * vs.vy;
    vs.vx += ax * dt; vs.vy += ay * dt;
    var s: any = Math.hypot(vs.vx, vs.vy), cap: any = 1.1 * sc;
    if (s > cap) { vs.vx *= cap / s; vs.vy *= cap / s; s = cap; }
    x += vs.vx * dt; y += vs.vy * dt;
    vs.t += dt;
    if (vs.phase === 'go') {
      if ((dist < 10 && s < 0.15 * sc) || vs.t > 25) { vs.phase = 'stay'; vs.t = 0; }
    } else if (vs.t >= STAY_S) { endVisit(prev); }
  }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    last = now;
    clock += dt;
    if (st === 'fly') { updateFly(dt); }
    else if (st === 'hover') { updateHover(dt); }
    else { updateVisit(dt); }
    x = clamp(x, m, W - m); y = clamp(y, m, H - m);

    // displayed angle: nose along the travel direction when moving, upright when hovering; never abrupt
    var cur: any = st === 'visit' && vs ? Math.hypot(vs.vx, vs.vy) : spd;
    var dir: any = st === 'visit' && vs && cur > 1 ? Math.atan2(vs.vy, vs.vx) : hd;
    var k: any = sm((cur / sc - 0.25) / 0.6);
    var target: any = UP + wrapPi(dir - UP) * k;
    ang += wrapPi(target - ang) * Math.min(1, dt * 2.5);
    var cs: any = Math.cos(ang);
    if (Math.abs(cs) > 0.2) { face = cs > 0 ? 1 : -1; }
    sy += (face - sy) * Math.min(1, dt * 4);

    flame.setAttribute('transform', 'translate(44 50) scale(' + (0.75 + 0.15 * Math.sin(clock * 2.2) + 0.3 * Math.min(1, cur / sc)).toFixed(3) + ') translate(-44 -50)');

    if (waveT >= 0) {
      waveT += dt;
      if (waveT >= WAVE_S) { waveT = -1; paw.setAttribute('transform', 'translate(122 56)'); paw.setAttribute('opacity', '0'); }
      else {
        var q: any = waveT / WAVE_S, e: any = Math.sin(q * Math.PI);
        paw.setAttribute('opacity', '1');
        paw.setAttribute('transform', 'translate(' + (122 + Math.sin(q * Math.PI * 4) * 4 * e).toFixed(2) + ' ' + (56 - 16 * e).toFixed(2) + ')');
      }
    }

    for (var i: any = 0; i < stars.length; i++) {
      if (twT[i] >= 0) {
        twT[i] += dt;
        if (twT[i] >= TW_S) { twT[i] = -1; stars[i].firstChild.style.transform = ''; stars[i].firstChild.style.opacity = ''; }
        else {
          var u: any = Math.sin(Math.PI * twT[i] / TW_S);
          stars[i].firstChild.style.transform = 'scale(' + (1 + 0.7 * u).toFixed(3) + ')';
          stars[i].firstChild.style.opacity = (0.75 + 0.25 * u).toFixed(3);
        }
      }
    }

    for (var j: any = 0; j < planets.length; j++) {
      var want: any = st === 'visit' && vs && vs.i === j && vs.phase === 'stay' ? 1 : 0;
      glow[j] += (want - glow[j]) * Math.min(1, dt * 1.5);
      if (Math.abs(glow[j] - want) < 0.003) { glow[j] = want; }
      halos[j].style.opacity = glow[j].toFixed(3);
      halos[j].style.transform = 'scale(' + (0.9 + 0.2 * glow[j]).toFixed(3) + ')';
    }

    puffT -= dt;
    if (puffT <= 0) { spawnPuff(); puffT = PUFF_EVERY; }
    for (var n: any = puffs.length - 1; n >= 0; n--) {
      var p: any = puffs[n];
      p.t += dt;
      if (p.t >= PUFF_S) { if (p.n.parentNode) { p.n.parentNode.removeChild(p.n); } puffs.splice(n, 1); continue; }
      var f: any = p.t / PUFF_S, sz: any = ph * (0.16 + 0.22 * f);
      p.n.style.width = p.n.style.height = sz.toFixed(1) + 'px';
      p.n.style.opacity = (0.7 * (1 - f) * Math.min(1, f * 6)).toFixed(3);
      p.n.style.transform = 'translate(' + (p.x - sz / 2).toFixed(1) + 'px,' + (p.y - sz / 2).toFixed(1) + 'px)';
    }

    render();
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
  function bindTap(node?: any, fn?: any, stop?: any) {
    var h: any = function (e?: any) { if (stop) { e.stopPropagation(); } e.preventDefault(); fn(); };
    var kk: any = function (e?: any) { if (stop) { e.stopPropagation(); } if (e.detail === 0) { fn(); } };
    node.addEventListener('pointerdown', h);
    node.addEventListener('click', kk);
    offs.push(function () { node.removeEventListener('pointerdown', h); node.removeEventListener('click', kk); });
  }
  bindTap(rbtn, onRocket, false);
  bindTap(abtn, onAstronaut, true);
  stars.forEach(function (s?: any, k?: any) { bindTap(s, function () { onStar(k); }, true); });
  planets.forEach(function (p?: any, k?: any) { bindTap(p, function () { onPlanet(k); }, true); });
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);
  document.addEventListener('visibilitychange', onVis);

  paw.setAttribute('transform', 'translate(122 56)');
  paw.setAttribute('opacity', '0');
  layout();
  start();

  return function () {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    offs.forEach(function (o?: any) { o(); });
    window.removeEventListener('resize', layout);
    window.removeEventListener('orientationchange', layout);
    document.removeEventListener('visibilitychange', onVis);
    puffs.forEach(function (p?: any) { if (p.n.parentNode) { p.n.parentNode.removeChild(p.n); } });
    puffs = [];
    if (scene.parentNode) { scene.parentNode.removeChild(scene); }
  };
}

export default function RakietaActivity() {
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
