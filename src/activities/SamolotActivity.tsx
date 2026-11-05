// Activity "Mały Samolot": touch the plane -> it takes off and flies a slow loop; touch it again -> it descends and lands
// on the runway (~4 s); touch a cloud while flying -> the plane curves toward it, circles it once and resumes its loop;
// touch the pilot -> a slow wave. All motion runs from one rAF loop (capped dt, paused when the tab is hidden) so it keeps
// working under the global prefers-reduced-motion rule that disables CSS animations.
// The plane is a kinematic body (position, heading, speed): it never moves tail first, heading changes are rate-limited
// and smoothed, the target is a lookahead point on the loop (or on a circle around the chosen cloud).
// Variety: on every launch the plane colour, airport, weather and pilot animal are picked independently (Rand.pickOne);
// nothing is stored. Weather is decoration only (thin, translucent, below the plane and the cloud buttons).
import { useEffect, useRef } from 'react';
import { Rand } from '../utils/rand';

var CROSS_S: any = 15;            // seconds to cross the screen width at cruise speed (>= 12 s)
var LAND_S: any = 4;              // descent + roll-out
var MAX_DT: any = 0.05;
var MAX_PUFFS: any = 8, PUFF_S: any = 2.6, PUFF_EVERY: any = 0.55;
var WAVE_S: any = 2.4;
var NUDGE_S: any = 2.6;
var TWO_PI: any = Math.PI * 2;

// Content pools (picked afresh on every launch)
var PLANES: any = [                         // body, wing/belly, tail
  { b: '#f7a8c9', w: '#8fc6e6', t: '#a8d8f0' },
  { b: '#9fdcc4', w: '#f7a8c9', t: '#c8ecde' },
  { b: '#f9d96e', w: '#8fc6e6', t: '#fbe9a6' },
  { b: '#c5b3ee', w: '#ffd08a', t: '#ddd2f6' },
  { b: '#f8b88a', w: '#9ed8c6', t: '#fbd5b8' },
  { b: '#8fc6e6', w: '#f7a8c9', t: '#b7dcf1' }
];
var AIRPORTS: any = [
  { id: 'tower', run: '#b3adc9', g1: '#a8d9a0', g2: '#bfe6b4', h1: '#cdeac3', h2: '#b6e0aa',
    svg: '<rect x="50" y="34" width="20" height="62" fill="#e9e4f5"/><rect x="42" y="14" width="36" height="22" rx="6" fill="#8fc6e6"/>' +
      '<rect x="46" y="18" width="28" height="12" rx="4" fill="#fdfbff"/><rect x="56" y="4" width="8" height="12" fill="#f7a8c9"/>' +
      '<rect x="20" y="68" width="80" height="28" rx="4" fill="#f3d9c4"/><rect x="28" y="76" width="14" height="10" fill="#fdfbff"/><rect x="78" y="76" width="14" height="10" fill="#fdfbff"/>' },
  { id: 'hangar', run: '#bdb2a8', g1: '#c9dc9a', g2: '#dbe8b0', h1: '#dfe9b4', h2: '#cfdf9c',
    svg: '<path d="M8 96V62Q8 26 60 26Q112 26 112 62V96z" fill="#f3b48a"/><path d="M8 62Q8 26 60 26Q112 26 112 62" fill="none" stroke="#e39a6c" stroke-width="5"/>' +
      '<rect x="36" y="58" width="48" height="38" rx="3" fill="#fdfbff"/><path d="M60 58V96M36 77H84" stroke="#d6cfe6" stroke-width="3"/>' },
  { id: 'terminal', run: '#a9b7cf', g1: '#b7e0c6', g2: '#cdeed8', h1: '#c3e8d2', h2: '#a9dcbd',
    svg: '<rect x="6" y="52" width="108" height="44" rx="6" fill="#c9b7ee"/><rect x="14" y="60" width="92" height="14" rx="4" fill="#e8f4fb"/>' +
      '<rect x="24" y="80" width="16" height="16" fill="#fdfbff"/><rect x="52" y="80" width="16" height="16" fill="#fdfbff"/><rect x="80" y="80" width="16" height="16" fill="#fdfbff"/>' +
      '<rect x="58" y="12" width="3" height="42" fill="#8a84a8"/><path d="M61 12L88 20L61 30z" fill="#f7a8c9"/>' }
];
var WEATHERS: any = ['sunny', 'cloudy', 'rain', 'snow'];
var PILOTS: any = [                         // name (genitive-free label), head colour, snout colour, ears markup
  { name: 'Miś', head: '#c99b72', snout: '#f3dcc4', nose: '#6b5a73',
    ears: '<circle cx="107" cy="38" r="5" fill="#c99b72"/><circle cx="131" cy="38" r="5" fill="#c99b72"/>' },
  { name: 'Zajączek', head: '#f4eaf0', snout: '#ffd6e4', nose: '#e58aa8',
    ears: '<ellipse cx="111" cy="27" rx="4" ry="10" fill="#f4eaf0"/><ellipse cx="127" cy="27" rx="4" ry="10" fill="#f4eaf0"/>' +
      '<ellipse cx="111" cy="27" rx="1.8" ry="7" fill="#ffc2d6"/><ellipse cx="127" cy="27" rx="1.8" ry="7" fill="#ffc2d6"/>' },
  { name: 'Kotek', head: '#b9b4c8', snout: '#ece8f4', nose: '#e58aa8',
    ears: '<path d="M105 42L106 28L116 36z" fill="#b9b4c8"/><path d="M133 42L132 28L122 36z" fill="#b9b4c8"/>' },
  { name: 'Piesek', head: '#e6c79c', snout: '#fbf0e0', nose: '#5b5675',
    ears: '<ellipse cx="105" cy="45" rx="5" ry="9" fill="#a9795a"/><ellipse cx="133" cy="45" rx="5" ry="9" fill="#a9795a"/>' },
  { name: 'Myszka', head: '#cfcad8', snout: '#f0edf6', nose: '#e58aa8',
    ears: '<circle cx="107" cy="36" r="7" fill="#cfcad8"/><circle cx="131" cy="36" r="7" fill="#cfcad8"/>' +
      '<circle cx="107" cy="36" r="4" fill="#ffc2d6"/><circle cx="131" cy="36" r="4" fill="#ffc2d6"/>' },
  { name: 'Lisek', head: '#f0a35c', snout: '#fdf3e6', nose: '#5b5675',
    ears: '<path d="M104 43L105 26L116 36z" fill="#f0a35c"/><path d="M134 43L133 26L122 36z" fill="#f0a35c"/>' }
];
var RAIN_N: any = 26, SNOW_N: any = 22;

function sm(u?: any) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }
function wrapPi(a?: any) { a = (a + Math.PI) % TWO_PI; if (a < 0) { a += TWO_PI; } return a - Math.PI; }
function clamp(v?: any, a?: any, b?: any) { return Math.max(a, Math.min(b, v)); }

function planeSvg(pc?: any, pl?: any) {
  return '<svg viewBox="0 0 200 100" aria-hidden="true" focusable="false">' +
    '<path d="M42 50L28 20Q34 15 44 20L66 44z" fill="' + pc.t + '"/>' +
    '<path d="M44 52L26 40Q22 44 28 50L50 58z" fill="' + pc.w + '"/>' +
    '<ellipse cx="100" cy="54" rx="72" ry="21" fill="' + pc.b + '"/>' +
    '<path d="M40 56Q100 74 170 58L168 64Q100 82 40 62z" fill="#fff" opacity=".5"/>' +
    '<circle cx="119" cy="45" r="17" fill="#fdfbff"/>' +
    '<g class="sa-pilot">' + pl.ears +
    '<circle cx="119" cy="46" r="12" fill="' + pl.head + '"/><ellipse cx="119" cy="51" rx="5.5" ry="4" fill="' + pl.snout + '"/>' +
    '<circle cx="114" cy="44" r="1.8" fill="#5b5675"/><circle cx="124" cy="44" r="1.8" fill="#5b5675"/>' +
    '<circle cx="119" cy="49.5" r="1.6" fill="' + pl.nose + '"/>' +
    '<path d="M107 40Q119 28 131 40" fill="none" stroke="#8a6a8f" stroke-width="3" stroke-linecap="round"/>' +
    '<g class="sa-paw"><circle cx="0" cy="0" r="5" fill="' + pl.head + '"/></g></g>' +
    '<path d="M96 60L136 60Q126 78 100 76Q88 70 96 60z" fill="' + pc.w + '"/>' +
    '<rect x="106" y="72" width="3" height="12" fill="#8a84a8"/><rect x="82" y="72" width="3" height="14" fill="#8a84a8"/>' +
    '<circle cx="83" cy="88" r="7" fill="#6b6585"/><circle cx="83" cy="88" r="3" fill="#cfc9e6"/>' +
    '<circle cx="108" cy="86" r="6" fill="#6b6585"/><circle cx="108" cy="86" r="2.6" fill="#cfc9e6"/>' +
    '<circle cx="172" cy="54" r="7" fill="#ffe08a"/>' +
    '<ellipse class="sa-disc" cx="175" cy="54" rx="4" ry="22" fill="#fff" opacity="0"/>' +
    '<g class="sa-prop"><ellipse cx="175" cy="54" rx="3.5" ry="21" fill="#7a748f"/></g></svg>';
}

function cloudSvg() {
  return '<svg viewBox="0 0 160 90" aria-hidden="true" focusable="false"><g fill="#fff" fill-opacity=".95">' +
    '<circle cx="48" cy="52" r="26"/><circle cx="82" cy="38" r="32"/><circle cx="116" cy="52" r="24"/>' +
    '<rect x="22" y="50" width="116" height="28" rx="14"/></g></svg>';
}

function hillsSvg(ap?: any) {
  return '<svg class="sa-hills" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    '<path d="M0 200V100Q160 20 330 90T640 80T1000 60V200z" fill="' + ap.h1 + '"/>' +
    '<path d="M0 200V150Q220 100 440 140T820 125T1000 140V200z" fill="' + ap.h2 + '"/></svg>';
}

function weatherDrops(kind?: any) {
  var h: any = '';
  var n: any = kind === 'rain' ? RAIN_N : kind === 'snow' ? SNOW_N : 0;
  for (var i: any = 0; i < n; i++) {
    h += '<i class="sa-' + (kind === 'rain' ? 'drop' : 'flake') + '" style="left:' + (Math.random() * 98).toFixed(1) + '%;top:' +
      (Math.random() * 100).toFixed(1) + '%;animation-delay:-' + (Math.random() * 3).toFixed(2) + 's;animation-duration:' +
      (kind === 'rain' ? 0.9 + Math.random() * 0.5 : 4 + Math.random() * 3).toFixed(2) + 's"></i>';
  }
  return h;
}

function mount(container: HTMLElement) {
  var pc: any = Rand.pickOne(PLANES, 'samolot-plane');
  var ap: any = Rand.pickOne(AIRPORTS, 'samolot-airport');
  var wx: any = Rand.pickOne(WEATHERS, 'samolot-weather');
  var pl: any = Rand.pickOne(PILOTS, 'samolot-pilot');
  var scene: any = document.createElement('div');
  scene.className = 'sa sa-w-' + wx;
  scene.style.setProperty('--rw', ap.run);
  scene.style.setProperty('--g1', ap.g1);
  scene.style.setProperty('--g2', ap.g2);
  scene.setAttribute('role', 'group');
  scene.setAttribute('aria-label', 'Mały samolot');
  scene.innerHTML =
    '<div class="sa-sun"></div>' + hillsSvg(ap) + '<div class="sa-wx" aria-hidden="true">' + weatherDrops(wx) + '</div>' +
    '<div class="sa-ground"></div>' +
    '<svg class="sa-apt" viewBox="0 0 120 100" aria-hidden="true" focusable="false">' + ap.svg + '</svg>' +
    '<div class="sa-runway"><div class="sa-dash"></div></div>' +
    '<button class="sa-cloud" type="button" data-i="0" aria-label="Chmurka 1 – samolot poleci wokół niej">' + cloudSvg() + '</button>' +
    '<button class="sa-cloud" type="button" data-i="1" aria-label="Chmurka 2 – samolot poleci wokół niej">' + cloudSvg() + '</button>' +
    '<button class="sa-cloud" type="button" data-i="2" aria-label="Chmurka 3 – samolot poleci wokół niej">' + cloudSvg() + '</button>' +
    '<div class="sa-puffs"></div>' +
    '<div class="sa-plane" role="button" tabindex="0" aria-label="Samolot – wzlatuj lub ląduj">' + planeSvg(pc, pl) +
    '<button class="sa-pbtn" type="button" aria-label="' + pl.name + ' pilot – pomachaj"></button></div>';
  container.appendChild(scene);

  var plane: any = scene.querySelector('.sa-plane');
  var pbtn: any = scene.querySelector('.sa-pbtn');
  var prop: any = scene.querySelector('.sa-prop');
  var disc: any = scene.querySelector('.sa-disc');
  var paw: any = scene.querySelector('.sa-paw');
  var puffLayer: any = scene.querySelector('.sa-puffs');
  var clouds: any = [].slice.call(scene.querySelectorAll('.sa-cloud'));
  var CF: any = [[0.2, 0.3], [0.5, 0.27], [0.8, 0.35]];   // cloud centres as screen fractions
  var cloudNudge: any = [-1, -1, -1];

  var W: any = 0, H: any = 0, pw: any = 170, ph: any = 85, sc: any = 40, Rt: any = 60, Om: any = 0.5, R: any = 70, yC: any = 0;
  var cx: any = 0, cy: any = 0, rx: any = 0, ry: any = 0;
  var st: any = 'parked';                      // parked | flying | landing
  var x: any = 0, y: any = 0, psi: any = 0, sy: any = 1, spd: any = 0, om: any = 0;
  var face: any = 1;                           // +1 facing right, -1 facing left (only while parked / landing)
  var dirP: any = 1;                           // +1 loop runs counter-clockwise on screen (right along the bottom)
  var orbit: any = null;                       // { i, swept, prev, t, engaged }
  var land: any = null;                        // Hermite landing plan
  var propA: any = 0, propW: any = 0;
  var puffs: any = [], puffT: any = 0;
  var waveT: any = -1;
  var clock: any = 0;
  var raf: any = 0, last: any = 0;
  var started: any = false;

  function cloudPos(i?: any) {
    var t: any = cloudNudge[i], nx: any = 0;
    if (t >= 0) { nx = Math.sin(Math.PI * Math.min(1, t / NUDGE_S)) * Math.min(W * 0.03, 26); }
    return {
      x: W * CF[i][0] + Math.sin(clock * 0.31 + i * 2.1) * Math.min(W * 0.012, 10) + nx,
      y: Math.max(H * CF[i][1], R + 10) + Math.sin(clock * 0.23 + i) * 4
    };
  }

  function layout() {
    var oW: any = W, oH: any = H;
    W = scene.clientWidth || window.innerWidth;
    H = scene.clientHeight || window.innerHeight;
    pw = clamp(Math.min(W * 0.42, H * 0.5), 170, 320);
    ph = pw / 2;
    sc = W / CROSS_S;
    Rt = Math.max(Math.min(W, H) * 0.12, pw * 0.3, sc / 0.7);
    Om = sc / Rt;
    R = Rt * 1.15;
    var runY: any = H * 0.86;
    yC = runY - ph * 0.43;
    cx = W / 2; cy = H * 0.4;
    rx = W * (W < H ? 0.3 : 0.34); ry = H * 0.22;
    var cw: any = clamp(W * 0.2, 96, 190);
    scene.style.setProperty('--pw', pw.toFixed(1) + 'px');
    scene.style.setProperty('--ph', ph.toFixed(1) + 'px');
    scene.style.setProperty('--cw', cw.toFixed(1) + 'px');
    scene.style.setProperty('--ry', runY.toFixed(1) + 'px');
    if (!started) {
      x = W * 0.3; y = yC; psi = 0; started = true;
    } else if (oW && oH) {
      x *= W / oW; y *= H / oH;
      if (land) {
        land.p0x *= W / oW; land.p1x *= W / oW; land.v0x *= W / oW;
        land.p0y *= H / oH; land.p1y = yC; land.v0y *= H / oH;
      }
      if (st === 'parked') { y = yC; }
    }
    if (land) { land.p1y = yC; }
    render();
  }

  function render() {
    var deg: any = psi * 57.2958;
    plane.style.transform = 'translate(' + (x - pw / 2).toFixed(1) + 'px,' + (y - ph / 2).toFixed(1) + 'px) rotate(' +
      deg.toFixed(2) + 'deg) scale(1,' + sy.toFixed(3) + ')';
    for (var i: any = 0; i < 3; i++) {
      var c: any = cloudPos(i);
      clouds[i].style.transform = 'translate(' + c.x.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px) translate(-50%,-50%)';
    }
  }

  function onPlane() {
    if (st === 'parked') {
      st = 'flying';
      dirP = face >= 0 ? 1 : -1;
      spd = 0; om = 0; orbit = null;
    } else if (st === 'flying') {
      startLanding();
    } else if (st === 'landing') {      // go-around: from the current motion back into a climb
      var vx: any = land.vx, vy: any = land.vy;
      spd = Math.max(0.2 * sc, Math.hypot(vx, vy));
      psi = Math.atan2(vy, vx);
      om = 0; land = null; orbit = null;
      dirP = face >= 0 ? 1 : -1;
      st = 'flying';
    }
  }

  function startLanding() {
    var cs: any = Math.cos(psi), sn: any = Math.sin(psi);
    var hd: any = Math.abs(cs) > 0.15 ? (cs > 0 ? 1 : -1) : face;
    var T: any = LAND_S;
    var dy: any = Math.max(0, yC - y);
    var dmin: any = Math.max(1.3 * dy, 0.5 * sc * T) + pw * 0.25;
    var margin: any = pw * 0.5;
    var room: any = hd > 0 ? W - margin - x : x - margin;
    face = room >= dmin * 0.8 ? hd : -hd;       // little room ahead: turn around and land the other way
    var x1: any = clamp(x + face * dmin, margin, W - margin);
    var D: any = Math.max(8, (x1 - x) * face);
    x1 = x + face * D;
    var v0h: any = clamp(spd * cs * face, -2.8 * D / T, 2.8 * D / T);
    var v0y: any = Math.min(spd * sn, 2.8 * dy / T);
    land = { t: 0, T: T, p0x: x, p0y: y, p1x: x1, p1y: yC, v0x: v0h * face, v0y: v0y, vx: v0h * face, vy: v0y };
    st = 'landing';
    orbit = null;
  }

  function onCloud(i?: any) {
    if (st === 'flying') {
      orbit = { i: i, swept: 0, prev: null, t: 0 };
    } else if (cloudNudge[i] < 0) {
      cloudNudge[i] = 0;
    }
  }

  function onPilot() { if (waveT < 0) { waveT = 0; } }

  function spawnPuff() {
    if (puffs.length >= MAX_PUFFS) { return; }
    var n: any = document.createElement('div');
    n.className = 'sa-puff';
    puffLayer.appendChild(n);
    puffs.push({ n: n, t: 0, x: x - Math.cos(psi) * pw * 0.44, y: y - Math.sin(psi) * pw * 0.44 });
  }

  function steer(tx?: any, ty?: any, gate?: any, dt?: any) {
    tx = clamp(tx, 0, W); ty = clamp(ty, 0, yC);
    var diff: any = wrapPi(Math.atan2(ty - y, tx - x) - psi);
    var want: any = clamp(diff * 1.5, -Om, Om) * gate;
    om += (want - om) * Math.min(1, dt * 2.5);
    psi += om * dt;
  }

  function updateFlying(dt?: any) {
    spd += (sc - spd) * (1 - Math.exp(-dt * 0.9));
    var gate: any = sm((spd / sc - 0.5) / 0.4);
    var tx: any, ty: any;
    if (orbit) {
      var C: any = cloudPos(orbit.i);
      var dx: any = x - C.x, dy: any = y - C.y, dist: any = Math.hypot(dx, dy);
      var phi: any = Math.atan2(dy, dx);
      orbit.t += dt;
      if (dist < R * 1.6) {
        if (orbit.prev !== null) { orbit.swept = Math.max(0, orbit.swept - dirP * wrapPi(phi - orbit.prev)); }
        orbit.prev = phi;
      } else { orbit.prev = null; }
      if (orbit.swept >= TWO_PI || orbit.t > 40) { orbit = null; }
      else {
        var a: any = phi - dirP * 0.7;
        tx = C.x + R * Math.cos(a); ty = C.y + R * Math.sin(a);
      }
    }
    if (!orbit) {
      var th: any = Math.atan2((y - cy) / ry, (x - cx) / rx) - dirP * 0.6;
      tx = cx + rx * Math.cos(th); ty = cy + ry * Math.sin(th);
    }
    steer(tx, ty, gate, dt);
    x += Math.cos(psi) * spd * dt;
    y += Math.sin(psi) * spd * dt;
    if (y > yC) { y = yC; }
    if (spd < 0.5 * sc && y >= yC - 0.5) { psi = face >= 0 ? 0 : Math.PI; }   // rolling on the runway: stay level
  }

  function updateLanding(dt?: any) {
    land.t = Math.min(land.T, land.t + dt);
    var u: any = land.t / land.T, u2: any = u * u, u3: any = u2 * u, T: any = land.T;
    var a: any = 2 * u3 - 3 * u2 + 1, b: any = u3 - 2 * u2 + u, c: any = -2 * u3 + 3 * u2;
    x = a * land.p0x + b * T * land.v0x + c * land.p1x;
    y = a * land.p0y + b * T * land.v0y + c * land.p1y;
    var da: any = 6 * u2 - 6 * u, db: any = 3 * u2 - 4 * u + 1, dc: any = -6 * u2 + 6 * u;
    land.vx = (da * land.p0x + db * T * land.v0x + dc * land.p1x) / T;
    land.vy = (da * land.p0y + db * T * land.v0y + dc * land.p1y) / T;
    if (y > yC) { y = yC; }
    spd = Math.hypot(land.vx, land.vy);
    var target: any = spd > 0.15 * sc ? Math.atan2(land.vy, land.vx) : (face >= 0 ? 0 : Math.PI);
    if (u > 0.85) { target = face >= 0 ? 0 : Math.PI; }
    psi += wrapPi(target - psi) * Math.min(1, dt * 3);
    if (land.t >= land.T) { x = land.p1x; y = yC; spd = 0; om = 0; psi = face >= 0 ? 0 : Math.PI; land = null; st = 'parked'; }
  }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    last = now;
    clock += dt;
    if (st === 'flying') { updateFlying(dt); }
    else if (st === 'landing') { updateLanding(dt); }

    // face the direction of travel without ever showing the plane upside down: smooth vertical flip
    var cs: any = Math.cos(psi);
    if (st !== 'parked' && Math.abs(cs) > 0.2) { face = cs > 0 ? 1 : -1; }
    sy += ((face >= 0 ? 1 : -1) - sy) * Math.min(1, dt * 4);

    // propeller: eases up with the speed, eases down when landed
    var pt: any = st === 'parked' ? 0 : Math.min(1, spd / sc + (st === 'flying' ? 0.2 : 0)) * 1.1;
    propW += (pt - propW) * Math.min(1, dt * 1.2);
    if (propW < 0.003 && pt === 0) { propW = 0; }
    propA += propW * TWO_PI * dt;
    prop.setAttribute('transform', 'translate(175 54) scale(1,' + (0.25 + 0.75 * Math.abs(Math.cos(propA))).toFixed(3) + ') translate(-175 -54)');
    disc.setAttribute('opacity', (0.28 * Math.min(1, propW)).toFixed(3));

    if (waveT >= 0) {
      waveT += dt;
      if (waveT >= WAVE_S) { waveT = -1; paw.setAttribute('transform', 'translate(140 44)'); paw.setAttribute('opacity', '0'); }
      else {
        var k: any = waveT / WAVE_S, e: any = Math.sin(k * Math.PI);
        paw.setAttribute('opacity', '1');
        paw.setAttribute('transform', 'translate(' + (140 + Math.sin(k * Math.PI * 4) * 4 * e).toFixed(2) + ' ' + (36 - 8 * e).toFixed(2) + ')');
      }
    }

    for (var i: any = 0; i < 3; i++) {
      if (cloudNudge[i] >= 0) { cloudNudge[i] += dt; if (cloudNudge[i] >= NUDGE_S) { cloudNudge[i] = -1; } }
    }

    // soft trail: bounded, nodes removed when finished
    if (st !== 'parked' && spd > 0.3 * sc) {
      puffT -= dt;
      if (puffT <= 0) { spawnPuff(); puffT = PUFF_EVERY; }
    } else { puffT = 0; }
    for (var j: any = puffs.length - 1; j >= 0; j--) {
      var p: any = puffs[j];
      p.t += dt;
      if (p.t >= PUFF_S) { if (p.n.parentNode) { p.n.parentNode.removeChild(p.n); } puffs.splice(j, 1); continue; }
      var q: any = p.t / PUFF_S, sz: any = ph * (0.14 + 0.2 * q);
      p.n.style.width = p.n.style.height = sz.toFixed(1) + 'px';
      p.n.style.opacity = (0.75 * (1 - q) * Math.min(1, q * 6)).toFixed(3);
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
    var k: any = function (e?: any) { if (stop) { e.stopPropagation(); } if (e.detail === 0) { fn(); } };
    node.addEventListener('pointerdown', h);
    node.addEventListener('click', k);
    offs.push(function () { node.removeEventListener('pointerdown', h); node.removeEventListener('click', k); });
  }
  bindTap(plane, onPlane, false);
  bindTap(pbtn, onPilot, true);
  clouds.forEach(function (c?: any, i?: any) { bindTap(c, function () { onCloud(i); }, true); });
  var onKey: any = function (e?: any) { if ((e.key === 'Enter' || e.key === ' ') && e.target === plane) { e.preventDefault(); onPlane(); } };
  plane.addEventListener('keydown', onKey);
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);
  document.addEventListener('visibilitychange', onVis);

  paw.setAttribute('transform', 'translate(140 44)');
  paw.setAttribute('opacity', '0');
  layout();
  start();

  return function () {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    offs.forEach(function (o?: any) { o(); });
    plane.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', layout);
    window.removeEventListener('orientationchange', layout);
    document.removeEventListener('visibilitychange', onVis);
    puffs.forEach(function (p?: any) { if (p.n.parentNode) { p.n.parentNode.removeChild(p.n); } });
    puffs = [];
    if (scene.parentNode) { scene.parentNode.removeChild(scene); }
  };
}

export default function SamolotActivity() {
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
