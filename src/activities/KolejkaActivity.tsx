// Activity "Kolejka Linowa": a gondola with two animals glides along a cable between a valley and a peak station.
// Touch the gondola -> start / stop; touch a station -> go there and wait (door opens); touch an animal -> it waves;
// touch a tree -> it sways once. Everything is driven by one rAF loop (capped dt, paused when the tab is hidden), so
// it also works under the global prefers-reduced-motion rule that disables CSS animations.
// The gondola position is a fraction p of the cable (0 = valley station, 1 = peak station), so it stays on the cable
// and keeps its place across resize / orientation changes. Speed is only ever changed by smooth ramps.
import { useEffect, useRef } from 'react';

var VC: any = 1 / 12;            // cruise speed, cable fractions per second (a full trip takes ~14 s with the ramps)
var RAMP: any = 2;               // seconds to get up to speed
var DWELL: any = 3;              // pause at a station while looping
var DOOR_S: any = 1.2;           // seconds to open or close the door
var HOLD_S: any = 1.5;           // door stays open this long after a touch on the station the gondola is already at
var SWAY_MAX: any = 3.2;         // degrees, gondola swaying while stopped on the cable (<= 4)
var MAX_DT: any = 0.05;
var WAVE_S: any = 2.6, TREE_S: any = 2;

function sm(u?: any) { return u * u * (3 - 2 * u); }

function animalSvg(kind?: any, cx?: any, cy?: any) {
  var fur: any = kind === 'bear' ? '#c99b72' : '#f3ecf7';
  var ears: any = kind === 'rabbit'
    ? '<ellipse cx="' + (cx - 7) + '" cy="' + (cy - 21) + '" rx="4" ry="10" fill="' + fur + '"/><ellipse cx="' + (cx + 7) + '" cy="' + (cy - 21) + '" rx="4" ry="10" fill="' + fur + '"/>' +
      '<ellipse cx="' + (cx - 7) + '" cy="' + (cy - 21) + '" rx="1.8" ry="7" fill="#f7b7cf"/><ellipse cx="' + (cx + 7) + '" cy="' + (cy - 21) + '" rx="1.8" ry="7" fill="#f7b7cf"/>'
    : '<circle cx="' + (cx - 12) + '" cy="' + (cy - 11) + '" r="5.5" fill="' + fur + '"/><circle cx="' + (cx + 12) + '" cy="' + (cy - 11) + '" r="5.5" fill="' + fur + '"/>';
  var nose: any = kind === 'bear'
    ? '<ellipse cx="' + cx + '" cy="' + (cy + 5) + '" rx="5.5" ry="4" fill="#f3dcc4"/><circle cx="' + cx + '" cy="' + (cy + 3.5) + '" r="1.8" fill="#6b5a73"/>'
    : '<circle cx="' + cx + '" cy="' + (cy + 4) + '" r="1.8" fill="#e99bb5"/>';
  return '<g class="kl-head" data-cx="' + cx + '" data-cy="' + cy + '">' + ears +
    '<circle cx="' + cx + '" cy="' + cy + '" r="14" fill="' + fur + '"/>' +
    '<circle cx="' + (cx - 5) + '" cy="' + (cy - 3) + '" r="1.8" fill="#5b5675"/><circle cx="' + (cx + 5) + '" cy="' + (cy - 3) + '" r="1.8" fill="#5b5675"/>' + nose + '</g>' +
    '<g class="kl-paw" data-px="' + (cx + 12) + '" data-py="' + (cy + 22) + '"><ellipse cx="' + (cx + 12) + '" cy="' + (cy + 17) + '" rx="4.5" ry="5.5" fill="' + fur + '"/></g>' +
    '<ellipse cx="' + (cx - 12) + '" cy="' + (cy + 17) + '" rx="4.5" ry="5.5" fill="' + fur + '"/>';
}

function carSvg() {
  return '<svg viewBox="0 0 160 150" aria-hidden="true" focusable="false">' +
    '<rect x="78" y="0" width="4" height="30" fill="#7a748f"/>' +
    '<rect x="62" y="24" width="36" height="10" rx="5" fill="#5b5675"/>' +
    '<rect x="14" y="34" width="132" height="108" rx="22" fill="#f7a8c9"/>' +
    '<rect x="10" y="30" width="140" height="18" rx="9" fill="#e48fb6"/>' +
    '<rect x="14" y="124" width="132" height="6" fill="#fff" opacity=".45"/>' +
    '<circle cx="46" cy="72" r="27" fill="#fdfbff"/><circle cx="46" cy="72" r="24" fill="#dff1fb"/>' +
    '<circle cx="114" cy="72" r="27" fill="#fdfbff"/><circle cx="114" cy="72" r="24" fill="#dff1fb"/>' +
    animalSvg('bear', 46, 74) + animalSvg('rabbit', 114, 74) +
    '<rect x="56" y="100" width="48" height="40" rx="8" fill="#7d78a3"/>' +
    '<rect class="kl-door" x="56" y="100" width="48" height="40" rx="8" fill="#fff3d6" stroke="#e2d6b3" stroke-width="2"/></svg>';
}

function stationSvg() {
  return '<svg viewBox="0 0 200 150" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    '<rect x="10" y="44" width="180" height="100" rx="10" fill="#fdf0d5"/>' +
    '<rect x="36" y="58" width="128" height="78" rx="12" fill="#ebe4f6"/>' +
    '<path d="M4 54L100 8l96 46z" fill="#f7b7a5" stroke="#f7b7a5" stroke-width="8" stroke-linejoin="round"/>' +
    '<circle cx="100" cy="32" r="7" fill="#5b5675"/>' +
    '<rect x="0" y="136" width="200" height="14" rx="7" fill="#cbb9e8"/></svg>';
}

function treeSvg() {
  return '<svg viewBox="0 0 60 90" aria-hidden="true" focusable="false">' +
    '<rect x="26" y="66" width="8" height="22" rx="3" fill="#b78c6a"/>' +
    '<path d="M30 8L50 34H10z" fill="#8fcf9b" stroke="#8fcf9b" stroke-width="6" stroke-linejoin="round"/>' +
    '<path d="M30 24L54 52H6z" fill="#7cc58a" stroke="#7cc58a" stroke-width="6" stroke-linejoin="round"/>' +
    '<path d="M30 42L56 70H4z" fill="#69b97a" stroke="#69b97a" stroke-width="6" stroke-linejoin="round"/></svg>';
}

function cloudSvg() {
  return '<svg viewBox="0 0 120 60" aria-hidden="true" focusable="false"><g fill="#fff" fill-opacity=".9"><circle cx="38" cy="36" r="18"/>' +
    '<circle cx="62" cy="28" r="22"/><circle cx="86" cy="37" r="16"/><rect x="24" y="36" width="76" height="17" rx="8.5"/></g></svg>';
}

function mount(container: HTMLElement) {
  var scene: any = document.createElement('div');
  scene.className = 'kl';
  scene.setAttribute('role', 'group');
  scene.setAttribute('aria-label', 'Kolejka linowa');
  scene.innerHTML =
    '<div class="kl-clouds"><div class="kl-cloud">' + cloudSvg() + '</div><div class="kl-cloud">' + cloudSvg() + '</div><div class="kl-cloud">' + cloudSvg() + '</div></div>' +
    '<svg class="kl-land" aria-hidden="true" focusable="false" preserveAspectRatio="none">' +
    '<path class="kl-mt" fill="#c9c3e6" stroke="#c9c3e6" stroke-width="30" stroke-linejoin="round"/>' +
    '<path class="kl-snow" fill="#fbf9ff"/>' +
    '<rect class="kl-hill" fill="#cdeac3"/><rect class="kl-grass" fill="#b6e0aa"/></svg>' +
    '<button class="kl-station" type="button" data-s="0" aria-label="Stacja w dolinie">' + stationSvg() + '</button>' +
    '<button class="kl-station" type="button" data-s="1" aria-label="Stacja na szczycie">' + stationSvg() + '</button>' +
    '<button class="kl-tree" type="button" aria-label="Choinka"><span class="kl-tsw">' + treeSvg() + '</span></button>' +
    '<button class="kl-tree" type="button" aria-label="Choinka"><span class="kl-tsw">' + treeSvg() + '</span></button>' +
    '<button class="kl-tree" type="button" aria-label="Choinka"><span class="kl-tsw">' + treeSvg() + '</span></button>' +
    '<svg class="kl-cable" aria-hidden="true" focusable="false"><line class="kl-line" stroke="#6f6a8c" stroke-width="3" stroke-linecap="round"/>' +
    '<circle class="kl-pa" r="8" fill="#5b5675"/><circle class="kl-pb" r="8" fill="#5b5675"/></svg>' +
    '<div class="kl-car">' + carSvg() +
    '<button class="kl-hull" type="button" aria-label="Kolejka – ruszaj lub zatrzymaj"></button>' +
    '<button class="kl-an" type="button" data-i="0" aria-label="Miś w kolejce"></button>' +
    '<button class="kl-an" type="button" data-i="1" aria-label="Króliczek w kolejce"></button></div>';
  container.appendChild(scene);

  var $: any = function (sel?: any) { return scene.querySelector(sel); };
  var clouds: any = [].slice.call(scene.querySelectorAll('.kl-cloud'));
  var stations: any = [].slice.call(scene.querySelectorAll('.kl-station'));
  var trees: any = [].slice.call(scene.querySelectorAll('.kl-tree'));
  var tsw: any = [].slice.call(scene.querySelectorAll('.kl-tsw'));
  var car: any = $('.kl-car'), hull: any = $('.kl-hull');
  var abtns: any = [].slice.call(scene.querySelectorAll('.kl-an'));
  var heads: any = [].slice.call(scene.querySelectorAll('.kl-head'));
  var paws: any = [].slice.call(scene.querySelectorAll('.kl-paw'));
  var doorEl: any = $('.kl-door');
  var land: any = $('.kl-land'), cable: any = $('.kl-cable');

  var W: any = 0, H: any = 0, g: any = 136, carH: any = 128;
  var xv: any = 0, xp: any = 0, ya: any = 0, yb: any = 0;
  var cloudU: any = [0.15, 0.5, 0.82], cloudSpd: any = [1 / 150, 1 / 120, 1 / 180], cloudY: any = [0.1, 0.2, 0.15], cloudW: any = 150;

  var p: any = 0, dir: any = 1, v: any = 0;
  var ramp: any = { v0: 0, vt: 0, t: RAMP, dur: RAMP };
  var plan: any = null;
  var loop: any = false, dest: any = -1;
  var dwellActive: any = false, dwellT: any = 0;
  var door: any = 0, doorTarget: any = 0, pulse: any = false, pulseT: any = 0, goAfterDoor: any = null;
  var swayAmp: any = 0, swayT: any = 0;
  var waves: any = [-1, -1], tsT: any = [-1, -1, -1];
  var raf: any = 0, last: any = 0;

  function isMoving() { return v > 0.0005 || !!plan || ramp.vt > 0; }
  function endIndex() {
    if (isMoving()) { return -1; }
    if (p <= 1e-6) { return 0; }
    if (p >= 1 - 1e-6) { return 1; }
    return -1;
  }
  function remaining() { return dir > 0 ? 1 - p : p; }

  function layout() {
    W = scene.clientWidth || window.innerWidth;
    H = scene.clientHeight || window.innerHeight;
    var m: any = Math.min(W, H);
    g = Math.max(136, Math.min(190, 0.22 * m));
    var s: any = g / 160;
    carH = 150 * s;
    var sw: any = 1.5 * g, sh: any = carH + 0.3 * g;
    var gh: any = H * 0.13, gy: any = H - gh;
    var plat: any = gy + gh * 0.4;
    var topM: any = Math.max(34, 0.09 * H);
    ya = plat - carH;
    yb = topM + 0.25 * g;
    xv = Math.max(sw / 2 + 8, 0.2 * W);
    xp = Math.min(W - sw / 2 - 8, 0.8 * W);

    // land: mountain with its summit just above the peak station
    var ay: any = topM - 0.12 * g;
    var hb: any = Math.max(0.95 * W, (gy - ay) * 0.85);
    land.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    $('.kl-mt').setAttribute('d', 'M' + (xp - hb) + ' ' + (gy + 20) + 'L' + xp + ' ' + ay + 'L' + (xp + hb) + ' ' + (gy + 20) + 'z');
    var r: any = hb / (gy - ay), ch: any = 0.2 * (gy - ay);
    $('.kl-snow').setAttribute('d', 'M' + xp + ' ' + ay + 'L' + (xp - r * ch) + ' ' + (ay + ch) + 'Q' + (xp - r * ch * 0.5) + ' ' + (ay + ch * 1.35) + ' ' + xp + ' ' + (ay + ch) +
      'Q' + (xp + r * ch * 0.5) + ' ' + (ay + ch * 1.35) + ' ' + (xp + r * ch) + ' ' + (ay + ch) + 'z');
    var hill: any = $('.kl-hill'), grass: any = $('.kl-grass');
    hill.setAttribute('x', -20); hill.setAttribute('y', gy - gh * 0.25); hill.setAttribute('width', W + 40); hill.setAttribute('height', gh * 0.6 + 20); hill.setAttribute('rx', 40);
    grass.setAttribute('x', -20); grass.setAttribute('y', gy); grass.setAttribute('width', W + 40); grass.setAttribute('height', gh + 20); grass.setAttribute('rx', 20);

    // cable
    cable.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var ln: any = $('.kl-line');
    ln.setAttribute('x1', xv); ln.setAttribute('y1', ya); ln.setAttribute('x2', xp); ln.setAttribute('y2', yb);
    $('.kl-pa').setAttribute('cx', xv); $('.kl-pa').setAttribute('cy', ya);
    $('.kl-pb').setAttribute('cx', xp); $('.kl-pb').setAttribute('cy', yb);

    // stations
    [[xv, ya], [xp, yb]].forEach(function (c?: any, i?: any) {
      var st: any = stations[i];
      st.style.width = sw.toFixed(1) + 'px';
      st.style.height = sh.toFixed(1) + 'px';
      st.style.transform = 'translate(' + (c[0] - sw / 2).toFixed(1) + 'px,' + (c[1] - 0.25 * g).toFixed(1) + 'px)';
    });

    // car
    car.style.width = g.toFixed(1) + 'px';
    car.style.height = carH.toFixed(1) + 'px';
    hull.style.left = (14 * s).toFixed(1) + 'px'; hull.style.top = (34 * s).toFixed(1) + 'px';
    hull.style.width = (132 * s).toFixed(1) + 'px'; hull.style.height = (108 * s).toFixed(1) + 'px';
    [46, 114].forEach(function (cx?: any, i?: any) {
      abtns[i].style.left = (cx * s - 28).toFixed(1) + 'px';
      abtns[i].style.top = (74 * s - 28).toFixed(1) + 'px';
    });

    // trees (3, in front of the stations, on the grass)
    var tw: any = Math.max(56, Math.min(96, 0.1 * m)), th: any = tw * 1.5, gap: any = tw + 4;
    var tx: any = [0.5 * W, 0.73 * W, 0.93 * W];
    tx[2] = Math.min(tx[2], W - tw / 2 - 4);
    tx[1] = Math.min(tx[1], tx[2] - gap);
    tx[0] = Math.min(tx[0], tx[1] - gap);
    var base: any = gy + gh * 0.9;
    trees.forEach(function (t?: any, i?: any) {
      t.style.width = tw.toFixed(1) + 'px'; t.style.height = th.toFixed(1) + 'px';
      t.style.transform = 'translate(' + (tx[i] - tw / 2).toFixed(1) + 'px,' + (base - th).toFixed(1) + 'px)';
    });

    cloudW = Math.max(100, Math.min(200, 0.22 * W));
    clouds.forEach(function (c?: any, i?: any) {
      c.style.width = cloudW.toFixed(1) + 'px';
      c.style.height = (cloudW / 2).toFixed(1) + 'px';
      c.style.top = (cloudY[i] * H).toFixed(1) + 'px';
    });
    place();
  }

  function place() {
    var cx: any = xv + p * (xp - xv), cy: any = ya + p * (yb - ya);
    var ang: any = swayAmp * Math.sin(swayT * 2 * Math.PI / 4.5);
    car.style.transform = 'translate(' + (cx - g / 2).toFixed(1) + 'px,' + cy.toFixed(1) + 'px) rotate(' + ang.toFixed(2) + 'deg)';
    var sx: any = 1 - 0.88 * sm(door);
    doorEl.setAttribute('transform', 'translate(56 100) scale(' + sx.toFixed(3) + ' 1) translate(-56 -100)');
    clouds.forEach(function (c?: any, i?: any) {
      c.style.transform = 'translate(' + (cloudU[i] * (W + cloudW) - cloudW).toFixed(1) + 'px,0)';
    });
  }

  // ---- control -------------------------------------------------------------------------------------------------
  function startMove(d?: any) {
    dir = d; plan = null;
    ramp = { v0: v, vt: VC, t: 0, dur: RAMP };
  }
  function depart(d?: any) {
    if (door > 0.001) {
      doorTarget = 0; pulse = false;
      goAfterDoor = function () { startMove(d); };
    } else { startMove(d); }
  }
  function brakeStop() {
    if (v < 0.0008) { v = 0; plan = null; ramp = { v0: 0, vt: 0, t: RAMP, dur: RAMP }; return; }
    var rem: any = remaining(), D: any = Math.min(v * 1.0, rem);
    plan = { D: D, T: 2 * D / v, v0: v, t: 0, p0: p, st: D >= rem - 1e-4 };
    if (D < 1e-5) { finishPlan(); }
  }
  function finishPlan() {
    var st: any = plan && plan.st;
    plan = null; v = 0;
    ramp = { v0: 0, vt: 0, t: RAMP, dur: RAMP };
    if (st) { p = dir > 0 ? 1 : 0; arrive(dir > 0 ? 1 : 0); }
    else if (dest >= 0) { startMove(dest === 1 ? 1 : -1); }
  }
  function arrive(e?: any) {
    if (dest >= 0 && dest !== e) { dir = e === 1 ? -1 : 1; startMove(dir); return; }   // just passing through
    dest = -1;
    doorTarget = 1;
    if (loop) { dwellActive = true; dwellT = 0; }
  }

  function onCar() {
    if (isMoving()) {
      loop = false; dest = -1; dwellActive = false;
      if (!plan) { brakeStop(); }
      return;
    }
    if (goAfterDoor) { goAfterDoor = null; loop = false; dest = -1; if (endIndex() >= 0) { doorTarget = 1; } return; }
    if (dwellActive) { dwellActive = false; loop = false; doorTarget = 1; return; }
    loop = true; dest = -1; pulse = false;
    var e: any = endIndex();
    depart(e === 0 ? 1 : e === 1 ? -1 : dir);
  }

  function onStation(s?: any) {
    var e: any = endIndex();
    if (e === s) {                       // already here: the door opens and closes, nothing else
      goAfterDoor = null; loop = false; dwellActive = false; dest = -1;
      pulse = true; pulseT = 0; doorTarget = 1;
      return;
    }
    loop = false; dwellActive = false; pulse = false; dest = s;
    var d: any = s === 1 ? 1 : -1;
    if (isMoving()) {
      if (plan) { return; }              // already slowing down; arrive() / finishPlan() carry on to dest
      if ((s === 1) === (dir > 0)) {
        if (ramp.vt !== VC) { ramp = { v0: v, vt: VC, t: 0, dur: RAMP }; }
      } else { brakeStop(); }
      return;
    }
    if (goAfterDoor) { goAfterDoor = function () { startMove(d); }; return; }
    depart(d);
  }

  function onAnimal(i?: any) { if (waves[i] < 0) { waves[i] = 0; } }
  function onTree(i?: any) { if (tsT[i] < 0) { tsT[i] = 0; } }

  // ---- loop ----------------------------------------------------------------------------------------------------
  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    last = now;
    swayT += dt;

    // door, dwell, delayed departure
    if (pulse && door >= 1) {
      pulseT += dt;
      if (pulseT >= HOLD_S) { pulse = false; doorTarget = 0; }
    }
    if (dwellActive) {
      dwellT += dt;
      doorTarget = dwellT < DWELL - DOOR_S ? 1 : 0;
      if (dwellT >= DWELL && door <= 0.001) {
        dwellActive = false;
        startMove(p >= 0.5 ? -1 : 1);
      }
    }
    if (doorTarget > door) { door = Math.min(1, door + dt / DOOR_S); }
    else if (doorTarget < door) { door = Math.max(0, door - dt / DOOR_S); }
    if (goAfterDoor && door <= 0.001) { var go: any = goAfterDoor; goAfterDoor = null; go(); }

    // motion
    if (plan) {
      plan.t += dt;
      var u: any = Math.min(1, plan.t / plan.T);
      var s: any = 2 * plan.D * (u - u * u * u + u * u * u * u / 2);
      v = plan.v0 * (1 - sm(u));
      p = Math.max(0, Math.min(1, plan.p0 + dir * s));
      if (u >= 1) { finishPlan(); }
    } else {
      ramp.t = Math.min(ramp.dur, ramp.t + dt);
      v = ramp.v0 + (ramp.vt - ramp.v0) * sm(ramp.t / ramp.dur);
      if (v < 0) { v = 0; }
      if (v > 0) {
        p = Math.max(0, Math.min(1, p + dir * v * dt));
        var rem: any = remaining();
        if (ramp.vt > 0 && v > 0.0005 && rem <= v * 1.0 + 1e-5) {
          plan = { D: rem, T: 2 * rem / v, v0: v, t: 0, p0: p, st: true };
          if (rem < 1e-5) { finishPlan(); }
        }
      }
    }

    // gentle sway only while stopped on the cable
    var onCable: any = !isMoving() && p > 1e-6 && p < 1 - 1e-6;
    var target: any = onCable ? SWAY_MAX : 0;
    swayAmp += Math.max(-2 * dt, Math.min(2 * dt, target - swayAmp));

    // animal waves and tree sways
    heads.forEach(function (h?: any, i?: any) {
      var paw: any = paws[i];
      if (waves[i] < 0) { return; }
      waves[i] += dt;
      var uw: any = waves[i] / WAVE_S, env: any = 0, a: any = 0;
      if (uw >= 1) { waves[i] = -1; } else { env = Math.sin(Math.PI * uw); a = -55 * env + 10 * env * Math.sin(2 * Math.PI * 2 * uw); }
      var cx: any = h.getAttribute('data-cx'), cy: any = h.getAttribute('data-cy');
      h.setAttribute('transform', env ? 'rotate(' + (4 * env).toFixed(2) + ' ' + cx + ' ' + (+cy + 14) + ')' : '');
      paw.setAttribute('transform', env ? 'rotate(' + a.toFixed(2) + ' ' + paw.getAttribute('data-px') + ' ' + paw.getAttribute('data-py') + ')' : '');
    });
    tsw.forEach(function (t?: any, i?: any) {
      if (tsT[i] < 0) { return; }
      tsT[i] += dt;
      var ut: any = tsT[i] / TREE_S, ang: any = 0;
      if (ut >= 1) { tsT[i] = -1; } else { ang = 7 * Math.sin(2 * Math.PI * 1.5 * ut) * (1 - ut); }
      t.style.transform = ang ? 'rotate(' + ang.toFixed(2) + 'deg)' : '';
    });
    clouds.forEach(function (_c?: any, i?: any) {
      cloudU[i] += cloudSpd[i] * dt;
      if (cloudU[i] >= 1) { cloudU[i] -= 1; }
    });

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
  function bind(node?: any, fn?: any) {
    var h: any = function (e?: any) { e.preventDefault(); fn(e); };
    var k: any = function (e?: any) { if (e.detail === 0) { fn(e); } };
    node.addEventListener('pointerdown', h);
    node.addEventListener('click', k);
    offs.push(function () { node.removeEventListener('pointerdown', h); node.removeEventListener('click', k); });
  }
  bind(hull, onCar);
  stations.forEach(function (st?: any, i?: any) { bind(st, function () { onStation(i); }); });
  abtns.forEach(function (b?: any, i?: any) { bind(b, function () { onAnimal(i); }); });
  trees.forEach(function (t?: any, i?: any) { bind(t, function () { onTree(i); }); });
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

export default function KolejkaActivity() {
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
