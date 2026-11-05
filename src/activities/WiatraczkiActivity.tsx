// Activity "Wiatraczki": a pastel meadow with 9 pinwheels (own colour + own centre shape, stems of different length), a
// windsock and grass. Touching a pinwheel sets it spinning slowly; sliding a finger across the meadow makes a soft gust
// that kicks the pinwheels near the path, stronger when closer and starting a little later the farther they are (a wave).
// Per pinwheel: `level` (0..1, the spin it is heading for) decays linearly (a single touch rests again in ~6 s) and the
// real speed `omega` eases toward it, so speed-ups and slow-downs are smooth, never negative and never above 1 turn/s
// (OMAX). A kick only raises the level to max(level, strength); a touch on a spinning pinwheel adds a small push, capped.
// The windsock and grass sway with a signed wind value that follows the last gust direction and settles within ~5 s.
// Board = fixed 400x300 space scaled by k; all pinwheels stay inside it, also after an orientation change. One rAF loop
// (capped dt, stopped when idle or the tab is hidden) drives everything, so reduced motion does not disable it.
// Nothing is scored or stored.
import { useEffect, useRef } from 'react';

var BW: any = 400, BH: any = 300;
var OMAX: any = 1;                                  // turns per second at full level
var TOUCH_LVL: any = 0.7, PUSH: any = 0.12, DECAY: any = 0.7 / 6, GUST_MAX: any = 0.55, RADIUS: any = 90, WAVE_V: any = 200;
var WIND_T: any = 5, MAX_DT: any = 0.05, STEP: any = 10;
var COLS: any = ['#f7a8c9', '#ffd98a', '#a8d8f0', '#c9b8f2', '#9ed8c6', '#f9b99a', '#b9e0a4', '#f5c6e8', '#8fd0e8'];
var NAMES: any = ['różowy', 'żółty', 'niebieski', 'fioletowy', 'miętowy', 'brzoskwiniowy', 'zielony', 'liliowy', 'turkusowy'];
// centre shapes (radius ~6): circle, square, triangle, diamond, star, hexagon, plus, droplet, pentagon
var CENTRES: any = [
  '<circle r="6"/>',
  '<rect x="-5.5" y="-5.5" width="11" height="11" rx="2"/>',
  '<path d="M0-7L7 5H-7Z" stroke-linejoin="round"/>',
  '<path d="M0-7L6 0L0 7L-6 0Z" stroke-linejoin="round"/>',
  '<path d="M0-7L2 -2.2L7-2L3 1.4L4.2 6.4L0 3.6L-4.2 6.4L-3 1.4L-7-2L-2-2.2Z" stroke-linejoin="round"/>',
  '<path d="M-3.5-6H3.5L7 0L3.5 6H-3.5L-7 0Z" stroke-linejoin="round"/>',
  '<path d="M-2.5-7H2.5V-2.5H7V2.5H2.5V7H-2.5V2.5H-7V-2.5H-2.5Z" stroke-linejoin="round"/>',
  '<path d="M0-7Q7 1 5 3.5A5.5 5.5 0 0 1-5 3.5Q-7 1 0-7Z" stroke-linejoin="round"/>',
  '<path d="M0-7L6.7-2.2L4.1 5.7H-4.1L-6.7-2.2Z" stroke-linejoin="round"/>'
];
// head positions and stem lengths in board units (rows back to front, alternate rows shifted)
var PW: any = [
  [100, 62, 52], [215, 56, 58], [330, 66, 50],
  [125, 142, 46], [240, 148, 44], [355, 138, 48],
  [100, 222, 50], [215, 216, 54], [330, 226, 48]
];
var SOCK_X: any = 28, SOCK_Y: any = 40;

function clamp(v?: any, a?: any, b?: any) { return v < a ? a : (v > b ? b : v); } void clamp;

function grassBlades() {
  var s: any = '', i: any, x: any, h: any;
  for (i = 0; i < 34; i++) {
    x = 6 + i * 11.6; h = 9 + ((i * 7) % 5) * 2;
    s += 'M' + x.toFixed(1) + ' 300q' + (-2 + (i % 3)) + ' ' + (-h * 0.6) + ' ' + ((i % 2) ? 3 : -3) + ' ' + (-h);
  }
  return s;
}

function scene() {
  var i: any, s: any = '<defs><linearGradient id="wi-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4ecf8"/><stop offset="1" stop-color="#f6f7e4"/></linearGradient></defs>' +
    '<rect width="400" height="300" fill="url(#wi-sky)"/>' +
    '<circle cx="352" cy="26" r="13" fill="#ffe9a8"/>' +
    '<path d="M0 96Q100 70 210 92T400 84V300H0z" fill="#cdebbb"/>' +
    '<path d="M0 180Q120 156 240 176T400 168V300H0z" fill="#bfe3ab"/>' +
    '<path d="M0 252Q130 232 250 248T400 242V300H0z" fill="#b1dba0"/>';
  // windsock pole (static) and sock (rotated about its top)
  s += '<rect x="' + (SOCK_X - 2.5) + '" y="' + SOCK_Y + '" width="5" height="' + (BH - SOCK_Y - 20) + '" rx="2.5" fill="#d9cfc2"/>' +
    '<circle cx="' + SOCK_X + '" cy="' + SOCK_Y + '" r="5" fill="#ffd98a" stroke="#8f7fd1" stroke-width="1.5"/>' +
    '<g class="wi-sock" transform="translate(' + SOCK_X + ' ' + SOCK_Y + ')">' +
    '<path d="M-8 3H8L6 15H-6Z" fill="#f7a8c9"/><path d="M-6 15H6L4.5 27H-4.5Z" fill="#fff"/><path d="M-4.5 27H4.5L3.5 39H-3.5Z" fill="#a8d8f0"/>' +
    '<path d="M-8 3H8L3.5 39H-3.5Z" fill="none" stroke="#8f7fd1" stroke-width="1.5" stroke-linejoin="round"/></g>';
  // grass layer (skewed with the wind, anchored on the bottom edge)
  s += '<g class="wi-grass"><path d="' + grassBlades() + '" fill="none" stroke="#9fd18a" stroke-width="2.4" stroke-linecap="round"/></g>';
  for (i = 0; i < PW.length; i++) {
    var p: any = PW[i], by: any = p[1] + p[2];
    s += '<path d="M' + p[0] + ' ' + by + 'V' + p[1] + '" stroke="#c5b6a0" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M' + (p[0] - 9) + ' ' + (by + 1) + 'q4 -9 9 -9q5 0 9 9M' + (p[0] - 4) + ' ' + (by + 1) + 'q2-12 4-14q3 2 4 14" fill="none" stroke="#9fd18a" stroke-width="2.4" stroke-linecap="round"/>';
  }
  for (i = 0; i < PW.length; i++) {
    var c: any = COLS[i], g: any = '';
    for (var b: any = 0; b < 4; b++) {
      g += '<path d="M0 0L0-25Q19-27 25-5Z" transform="rotate(' + (b * 90) + ')" fill="' + (b % 2 ? '#fff' : c) + '"' + (b % 2 ? ' fill-opacity=".8"' : '') + ' stroke="' + c + '" stroke-width="1.4" stroke-linejoin="round"/>';
    }
    s += '<g class="wi-head" transform="translate(' + PW[i][0] + ' ' + PW[i][1] + ')"><g class="wi-spin">' + g + '</g>' +
      '<g fill="#fff" stroke="#8f7fd1" stroke-width="1.6">' + CENTRES[i] + '</g></g>';
  }
  return s;
}

function mount(container: HTMLElement) {
  var root: any = document.createElement('div');
  root.className = 'wi';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Wiatraczki');
  var btns: any = '', i: any;
  for (i = 0; i < PW.length; i++) {
    btns += '<button type="button" class="wi-pw" aria-label="Wiatraczek ' + (i + 1) + ' – ' + NAMES[i] + ', zakręć"></button>';
  }
  root.innerHTML = '<div class="wi-board"><svg class="wi-bg" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + scene() + '</svg>' + btns + '</div>';
  container.appendChild(root);

  var board: any = root.querySelector('.wi-board');
  var btnEls: any = root.querySelectorAll('.wi-pw');
  var spinEls: any = root.querySelectorAll('.wi-spin');
  var sockEl: any = root.querySelector('.wi-sock');
  var grassEl: any = root.querySelector('.wi-grass');
  var k: any = 1;
  var pins: any = PW.map(function () { return { ang: 0, omega: 0, level: 0, pendAt: 0, pendLvl: 0 }; });
  var time: any = 0, wind: any = 0, dir: any = 1, sg: any = 0;           // wind magnitude 0..1, last gust direction, smoothed signed wind
  var raf: any = 0, last: any = 0, pid: any = null, px: any = 0, py: any = 0;

  function toUnits(e?: any) {
    var r: any = board.getBoundingClientRect();
    var s: any = r.width / BW || 1;
    return [(e.clientX - r.left) / s, (e.clientY - r.top) / s];
  }

  function touch(n?: any) {
    var p: any = pins[n];
    if (p.level > 0.05 || p.omega > 0.05) { p.level = Math.min(1, p.level + PUSH); }
    else { p.level = TOUCH_LVL; }
    start();
  }

  function gustAt(x?: any, y?: any) {
    for (var n: any = 0; n < PW.length; n++) {
      var dx: any = x - PW[n][0], dy: any = y - PW[n][1], d: any = Math.sqrt(dx * dx + dy * dy);
      if (d >= RADIUS) { continue; }
      var cand: any = GUST_MAX * (1 - d / RADIUS), p: any = pins[n];
      if (cand < 0.04 || cand <= p.level || cand <= p.pendLvl) { continue; }
      p.pendLvl = cand; p.pendAt = time + d / WAVE_V;
    }
  }

  function onDown(e?: any) {
    if (pid !== null) { return; }
    var u: any = toUnits(e);
    pid = e.pointerId; px = u[0]; py = u[1];
  }
  function onMove(e?: any) {
    if (e.pointerId !== pid) { return; }
    var u: any = toUnits(e), dx: any = u[0] - px, dy: any = u[1] - py, len: any = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) { return; }
    var steps: any = Math.min(40, Math.ceil(len / STEP)), j: any;
    for (j = 1; j <= steps; j++) { gustAt(px + dx * j / steps, py + dy * j / steps); }
    if (Math.abs(dx) > 0.5) { dir = dx > 0 ? 1 : -1; }
    wind = Math.max(wind, 0.85);
    px = u[0]; py = u[1];
    start();
  }
  function onUp(e?: any) { if (e.pointerId === pid) { pid = null; } }
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);
  Array.prototype.forEach.call(btnEls, function (b?: any, n?: any) { b.addEventListener('click', function () { touch(n); }); });

  function active() {
    if (wind > 0 || Math.abs(sg) > 0.001) { return true; }
    for (var n: any = 0; n < pins.length; n++) {
      var p: any = pins[n];
      if (p.omega > 0 || p.level > 0 || p.pendLvl > 0) { return true; }
    }
    return false;
  }

  function frame(now?: any) {
    var dt: any = Math.min((now - last) / 1000, MAX_DT), n: any;
    last = now; time += dt;
    for (n = 0; n < pins.length; n++) {
      var p: any = pins[n];
      if (p.pendLvl > 0 && time >= p.pendAt) { p.level = Math.max(p.level, p.pendLvl); p.pendLvl = 0; }
      p.level = Math.max(0, p.level - DECAY * dt);
      p.omega += (p.level - p.omega) * (1 - Math.exp(-2.4 * dt));
      if (p.omega < 0.002 && p.level <= 0) { p.omega = 0; }
      p.ang = (p.ang + 360 * OMAX * Math.min(1, p.omega) * dt) % 360;
    }
    wind = Math.max(0, wind - dt / WIND_T);
    sg += (dir * wind - sg) * (1 - Math.exp(-2.5 * dt));
    if (wind === 0 && Math.abs(sg) < 0.002) { sg = 0; }
    paint();
    if (active() || pid !== null) { raf = requestAnimationFrame(frame); } else { raf = 0; }
  }

  function paint() {
    var n: any;
    for (n = 0; n < pins.length; n++) { spinEls[n].setAttribute('transform', 'rotate(' + pins[n].ang.toFixed(1) + ')'); }
    var flutter: any = Math.abs(sg) * 4 * Math.sin(time * 3);
    sockEl.setAttribute('transform', 'translate(' + SOCK_X + ' ' + SOCK_Y + ') rotate(' + (-sg * 75 + flutter).toFixed(1) + ')');
    var sk: any = sg * 8 + Math.abs(sg) * 3 * Math.sin(time * 1.6);
    grassEl.setAttribute('transform', 'translate(0 ' + BH + ') skewX(' + sk.toFixed(2) + ') translate(0 -' + BH + ')');
  }

  function layout() {
    var w: any = board.clientWidth || window.innerWidth;
    k = w / BW;
    var bs: any = Math.max(56, 50 * k);
    for (var n: any = 0; n < PW.length; n++) {
      btnEls[n].style.width = bs.toFixed(1) + 'px'; btnEls[n].style.height = bs.toFixed(1) + 'px';
      btnEls[n].style.left = (PW[n][0] * k - bs / 2).toFixed(1) + 'px';
      btnEls[n].style.top = (PW[n][1] * k - bs / 2).toFixed(1) + 'px';
    }
    paint();
  }

  function start() {
    if (raf || document.hidden) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else if (active()) { start(); }
  }
  function onResize() { layout(); }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  layout();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function WiatraczkiActivity() {
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
