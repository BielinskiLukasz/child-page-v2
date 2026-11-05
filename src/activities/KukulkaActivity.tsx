// Activity "Zegar z Kukułką": a wooden cuckoo clock on a pastel wall with a clock face (2 hands), a swinging pendulum
// and 3 little doors (top, left, right). Touch a door -> it opens (1 s), its character (bird / mouse / bear) slides up
// out of it (0.6 s), waves slowly twice (1.8 s), slides back (0.6 s) and the door closes (1 s): 5 s in total. Touching
// a door that is already busy does nothing (no restart); different doors can be busy at the same time.
// Touch the hands -> the minute hand turns 90 degrees slowly (slew-limited speed, never backwards), the hour hand follows
// at 1/12 of that. Touch the pendulum -> it swings wider for 4 s and then eases back to its normal swing (period 2.4 s).
// Characters differ by shape: bird = beak and tuft, mouse = big round ears, thin tail and pointed snout, bear = small ears.
// Nothing is scored or stored. Board = fixed 400x300 coordinate space scaled by k = board width / 400, re-laid-out on
// resize/orientation change. One rAF loop (capped dt, paused when the tab is hidden) drives every motion, so all of it
// also works under the global prefers-reduced-motion rule that disables CSS animations.
import { useEffect, useRef } from 'react';

var BW: any = 400, BH: any = 300; void BH;
var FX: any = 200, FY: any = 150, FR: any = 46;                 // clock face centre and radius, board units
var PX: any = 200, PY: any = 204, PL: any = 58;                 // pendulum pivot and rod length
var PERIOD: any = 2.4, OMEGA: any = 2 * Math.PI / PERIOD;
var AMP0: any = 11, AMP1: any = 24, BOOST_T: any = 4, AMP_EASE: any = 1.6;   // degrees, degrees, seconds, 1 / second
var HAND_ACC: any = 45, HAND_MAX: any = 30;                // degrees / s^2 and degrees / s for the minute hand
var MIN0: any = 60, HOUR0: any = 305;                      // starting hand angles (about 10:10), degrees clockwise from 12
var T_OPEN: any = 1, T_OUT: any = 0.6, T_WAVE: any = 1.8, T_IN: any = 0.6, T_CLOSE: any = 1, T_ALL: any = T_OPEN + T_OUT + T_WAVE + T_IN + T_CLOSE;
var MAX_DT: any = 0.05;
var DOOR_MIN: any = 64;                               // px
// Feet height of an emerged character in door units: the ~43-unit body then fills the 56-unit opening (top at y = 13, below the
// upper edge at 8), standing just above the door's bottom edge where the sliding clip stays.
var UP: any = 56;
var DOORS: any = [
  { id: 'top', cx: 200, cy: 62, label: 'Górne drzwiczki – otwórz', who: 'bird', leaf: '#f7c8dc', hinge: 0 },
  { id: 'left', cx: 50, cy: 196, label: 'Lewe drzwiczki – otwórz', who: 'mouse', leaf: '#cfe6f7', hinge: 0 },
  { id: 'right', cx: 350, cy: 196, label: 'Prawe drzwiczki – otwórz', who: 'bear', leaf: '#ffe3a3', hinge: 1 }
];

function smooth(u?: any) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }

function characterSvg(who?: any) {
  var eyes: any = '<circle cx="-6" cy="-19" r="2" fill="#5b4a6b"/><circle cx="6" cy="-19" r="2" fill="#5b4a6b"/>';
  var g: any = '';
  if (who === 'bird') {
    g = '<ellipse cx="0" cy="-17" rx="18" ry="17" fill="#ffe08a"/>' +
      '<ellipse cx="-3" cy="-37" rx="3" ry="5" fill="#ffd05c"/><ellipse cx="3" cy="-38" rx="3" ry="5.5" fill="#ffd05c"/>' +
      '<ellipse cx="-17" cy="-12" rx="5" ry="8" fill="#ffd05c"/>' +
      '<circle cx="-7" cy="-21" r="2.2" fill="#5b4a6b"/><circle cx="7" cy="-21" r="2.2" fill="#5b4a6b"/>' +
      '<path d="M-6 -15L6 -15L0 -6Z" fill="#f4a261" stroke="#e08a45" stroke-width="1" stroke-linejoin="round"/>';
  } else if (who === 'mouse') {
    g = '<path d="M-15 -6Q-30 -4 -30 -17" fill="none" stroke="#e7a9be" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="-13" cy="-33" r="9.5" fill="#cfc6d9"/><circle cx="-13" cy="-33" r="5.5" fill="#f4b6cb"/>' +
      '<circle cx="13" cy="-33" r="9.5" fill="#cfc6d9"/><circle cx="13" cy="-33" r="5.5" fill="#f4b6cb"/>' +
      '<ellipse cx="0" cy="-15" rx="16" ry="16" fill="#cfc6d9"/>' + eyes +
      '<circle cx="0" cy="-11" r="3" fill="#f4829f"/>' +
      '<path d="M-5 -9L-20 -11M-5 -7L-20 -5M5 -9L20 -11M5 -7L20 -5" stroke="#8d7ea0" stroke-width="1" stroke-linecap="round"/>';
  } else {
    g = '<circle cx="-13" cy="-29" r="5.5" fill="#c4966c"/><circle cx="13" cy="-29" r="5.5" fill="#c4966c"/>' +
      '<ellipse cx="0" cy="-15" rx="18" ry="17" fill="#d2a67f"/>' + eyes +
      '<ellipse cx="0" cy="-9" rx="8" ry="6" fill="#ecd2b6"/><ellipse cx="0" cy="-11" rx="3" ry="2" fill="#6b4f3c"/>' +
      '<path d="M-3 -6Q0 -4 3 -6" stroke="#6b4f3c" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
  }
  var pawFill: any = who === 'bird' ? '#ffd05c' : (who === 'mouse' ? '#cfc6d9' : '#c4966c');
  return g + '<circle class="kk-paw" cx="17" cy="-12" r="5" fill="' + pawFill + '"/>';
}

function doorSvg(d?: any, i?: any) {
  var cp: any = 'kk-clip-' + i;
  var hx: any = d.hinge ? 64 : 8;
  return '<svg viewBox="0 0 72 72" aria-hidden="true" focusable="false" overflow="visible">' +
    '<defs><clipPath id="' + cp + '"><rect x="-40" y="-90" width="152" height="150"/></clipPath></defs>' +
    '<rect width="72" height="72" rx="14" fill="#d9b48f" stroke="#b88a5e" stroke-width="2"/>' +
    '<rect x="8" y="8" width="56" height="56" rx="10" fill="#7c5c48"/>' +
    '<g clip-path="url(#' + cp + ')"><g class="kk-ch" data-who="' + d.who + '" transform="translate(36 100)" style="display:none">' + characterSvg(d.who) + '</g></g>' +
    '<g class="kk-leaf" data-hx="' + hx + '"><rect x="8" y="8" width="56" height="56" rx="10" fill="' + d.leaf + '" stroke="#c9a47f" stroke-width="1.5"/>' +
    '<rect x="15" y="15" width="42" height="42" rx="7" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>' +
    '<circle cx="' + (d.hinge ? 20 : 52) + '" cy="36" r="3.5" fill="#a8946f"/></g></svg>';
}

function scene() {
  var dots: any = '';
  for (var r: any = 0; r < 4; r++) {
    for (var c: any = 0; c < 9; c++) {
      dots += '<circle cx="' + (22 + c * 44 + (r % 2) * 22) + '" cy="' + (30 + r * 60) + '" r="3" fill="#fff" fill-opacity=".55"/>';
    }
  }
  var ticks: any = '';
  for (var h: any = 0; h < 12; h++) {
    var a: any = h * Math.PI / 6;
    ticks += '<circle cx="' + (FX + 36 * Math.sin(a)).toFixed(1) + '" cy="' + (FY - 36 * Math.cos(a)).toFixed(1) + '" r="' + (h % 3 === 0 ? 3 : 1.8) + '" fill="#8f7fd1"/>';
  }
  return '<defs><linearGradient id="kk-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdeff3"/><stop offset="1" stop-color="#f3ecf9"/></linearGradient></defs>' +
    '<rect width="400" height="300" fill="url(#kk-wall)"/>' + dots +
    '<rect y="286" width="400" height="14" fill="#e6d3bd"/>' +
    // side shelves under the side doors
    '<rect x="6" y="234" width="88" height="8" rx="4" fill="#c79d75"/><rect x="306" y="234" width="88" height="8" rx="4" fill="#c79d75"/>' +
    // clock case: roof and body
    '<path d="M78 102L200 4L322 102Z" fill="#b98963" stroke="#a37550" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M96 100L200 16L304 100" fill="none" stroke="#d9b48f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<rect x="100" y="96" width="200" height="190" rx="12" fill="#d9b48f" stroke="#b88a5e" stroke-width="2"/>' +
    '<rect x="112" y="108" width="176" height="86" rx="10" fill="#e9cfae"/>' +
    '<circle cx="' + FX + '" cy="' + FY + '" r="' + FR + '" fill="#fff8e8" stroke="#b88a5e" stroke-width="4"/>' + ticks +
    '<rect x="146" y="200" width="108" height="78" rx="12" fill="#a17855"/>' +
    '<rect x="152" y="206" width="96" height="66" rx="8" fill="#8d6847"/>' +
    '<g class="kk-pend"><line x1="' + PX + '" y1="' + PY + '" x2="' + PX + '" y2="' + (PY + PL) + '" stroke="#e4c27a" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="' + PX + '" cy="' + (PY + PL + 2) + '" r="13" fill="#f2d28c" stroke="#d9b05c" stroke-width="2"/>' +
    '<circle cx="' + (PX - 4) + '" cy="' + (PY + PL - 2) + '" r="3.5" fill="#fff" fill-opacity=".6"/></g>' +
    '<circle cx="' + PX + '" cy="' + PY + '" r="3" fill="#a17855"/>' +
    '<g class="kk-hour"><line x1="' + FX + '" y1="' + FY + '" x2="' + FX + '" y2="' + (FY - 22) + '" stroke="#8f7fd1" stroke-width="5" stroke-linecap="round"/></g>' +
    '<g class="kk-min"><line x1="' + FX + '" y1="' + FY + '" x2="' + FX + '" y2="' + (FY - 33) + '" stroke="#f08fb5" stroke-width="3.5" stroke-linecap="round"/></g>' +
    '<circle cx="' + FX + '" cy="' + FY + '" r="4.5" fill="#fff8e8" stroke="#8f7fd1" stroke-width="2"/>';
}

function mount(container: HTMLElement) {
  var root: any = document.createElement('div');
  root.className = 'kk';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Zegar z Kukułką');
  var doorHtml: any = '';
  DOORS.forEach(function (d?: any, i?: any) {
    doorHtml += '<button type="button" class="kk-door" data-i="' + i + '" aria-label="' + d.label + '">' + doorSvg(d, i) + '</button>';
  });
  root.innerHTML = '<div class="kk-board"><svg class="kk-bg" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    scene() + '</svg>' +
    '<button type="button" class="kk-hands" aria-label="Wskazówki – przekręć"></button>' +
    '<button type="button" class="kk-pbtn" aria-label="Wahadło – pchnij"></button>' + doorHtml + '</div>';
  container.appendChild(root);

  var board: any = root.querySelector('.kk-board');
  var pendG: any = root.querySelector('.kk-pend');
  var hourG: any = root.querySelector('.kk-hour');
  var minG: any = root.querySelector('.kk-min');
  var handsBtn: any = root.querySelector('.kk-hands');
  var pBtn: any = root.querySelector('.kk-pbtn');
  var doorEls: any = root.querySelectorAll('.kk-door');
  var doors: any = [];
  DOORS.forEach(function (d?: any, i?: any) {
    var el: any = doorEls[i];
    doors.push({ def: d, el: el, t: -1, ch: el.querySelector('.kk-ch'), leaf: el.querySelector('.kk-leaf'),
      paw: el.querySelector('.kk-paw'), svg: el.querySelector('svg') });
    el.addEventListener('click', function () {
      var s: any = doors[i];
      if (s.t >= 0) { return; }           // already busy: nothing new, no restart
      s.t = 0; start();
    });
  });
  var k: any = 1;
  var minCur: any = MIN0, minTarget: any = MIN0, minVel: any = 0;
  var amp: any = AMP0, ampTarget: any = AMP0, boost: any = 0, phase: any = 0;
  var raf: any = 0, last: any = 0;

  handsBtn.addEventListener('click', function () { minTarget += 90; start(); });
  pBtn.addEventListener('click', function () { boost = BOOST_T; ampTarget = AMP1; start(); });

  function frame(now?: any) {
    var dt: any = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    var i: any, s: any, r: any, want: any;

    phase += OMEGA * dt;
    if (boost > 0) { boost = Math.max(0, boost - dt); if (boost === 0) { ampTarget = AMP0; } }
    amp += (ampTarget - amp) * (1 - Math.exp(-AMP_EASE * dt));

    r = minTarget - minCur;
    if (r > 0.001 || minVel > 0.001) {
      want = Math.min(HAND_MAX, Math.sqrt(2 * HAND_ACC * Math.max(0, r)));
      if (minVel < want) { minVel = Math.min(want, minVel + HAND_ACC * dt); } else { minVel = Math.max(want, minVel - HAND_ACC * dt); }
      minCur = Math.min(minTarget, minCur + minVel * dt);
      if (minTarget - minCur < 0.001) { minCur = minTarget; minVel = 0; }
    }

    for (i = 0; i < doors.length; i++) {
      s = doors[i];
      if (s.t >= 0) { s.t += dt; if (s.t >= T_ALL) { s.t = -1; } }
    }
    paint();
    raf = requestAnimationFrame(frame);
  }

  function paintDoor(s?: any) {
    var t: any = s.t, open: any = 0, base: any = 100, wave: any = 0, u: any;
    if (t >= 0) {
      if (t < T_OPEN) { open = smooth(t / T_OPEN); }
      else if (t < T_ALL - T_CLOSE) { open = 1; }
      else { open = 1 - smooth((t - (T_ALL - T_CLOSE)) / T_CLOSE); }
      var t1: any = T_OPEN, t2: any = t1 + T_OUT, t3: any = t2 + T_WAVE, t4: any = t3 + T_IN;
      if (t < t1) { base = 100; }
      else if (t < t2) { base = 100 - (100 - UP) * smooth((t - t1) / T_OUT); }
      else if (t < t3) { base = UP; wave = (t - t2) / T_WAVE; }
      else if (t < t4) { base = UP + (100 - UP) * smooth((t - t3) / T_IN); }
      else { base = 100; }
    }
    var hx: any = +s.leaf.getAttribute('data-hx');
    var sc: any = 1 - 0.92 * open;
    s.leaf.setAttribute('transform', 'translate(' + hx + ' 0) scale(' + sc.toFixed(3) + ' 1) translate(' + (-hx) + ' 0)');
    if (t >= 0 && base < 99) {
      s.ch.style.display = '';
      s.ch.setAttribute('transform', 'translate(36 ' + base.toFixed(1) + ')');
    } else {
      s.ch.style.display = 'none';
    }
    if (wave > 0) {
      u = Math.sin(Math.PI * Math.min(1, wave * 1.1));
      s.paw.setAttribute('cx', (17 + 4 * Math.sin(wave * Math.PI * 4) * u).toFixed(1));
      s.paw.setAttribute('cy', (-12 - 18 * u).toFixed(1));
    } else {
      s.paw.setAttribute('cx', '17'); s.paw.setAttribute('cy', '-12');
    }
  }

  function paint() {
    pendG.setAttribute('transform', 'rotate(' + (amp * Math.sin(phase)).toFixed(2) + ' ' + PX + ' ' + PY + ')');
    minG.setAttribute('transform', 'rotate(' + minCur.toFixed(2) + ' ' + FX + ' ' + FY + ')');
    hourG.setAttribute('transform', 'rotate(' + (HOUR0 + (minCur - MIN0) / 12).toFixed(2) + ' ' + FX + ' ' + FY + ')');
    for (var i: any = 0; i < doors.length; i++) { paintDoor(doors[i]); }
  }

  function place(el?: any, cx?: any, cy?: any, wpx?: any, hpx?: any) {
    el.style.width = wpx.toFixed(1) + 'px'; el.style.height = hpx.toFixed(1) + 'px';
    el.style.left = (cx * k - wpx / 2).toFixed(1) + 'px'; el.style.top = (cy * k - hpx / 2).toFixed(1) + 'px';
  }
  function layout() {
    var w: any = board.clientWidth || window.innerWidth;
    k = w / BW;
    var dpx: any = Math.max(DOOR_MIN, 72 * k);
    doors.forEach(function (s?: any) {
      place(s.el, s.def.cx, s.def.cy, dpx, dpx);
      s.svg.style.width = dpx.toFixed(1) + 'px'; s.svg.style.height = dpx.toFixed(1) + 'px';
    });
    var fd: any = Math.max(56, 2 * FR * k);
    place(handsBtn, FX, FY, fd, fd);
    var pw: any = Math.max(56, 96 * k), ph: any = Math.max(56, 76 * k);
    place(pBtn, PX, 240, pw, ph);
    paint();
  }

  function start() {
    if (raf || document.hidden) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }
  function onResize() { layout(); }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  layout();
  start();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function KukulkaActivity() {
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
