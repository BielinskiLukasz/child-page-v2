// Activity "Kulkowy Tor": four ramps the child turns (left / flat / right) steer a soft ball dropped from the top down to a
// basket with a friendly bear. Scripted, not full, physics in a fixed 400x360 board scaled by k:
//   - the ball is either falling straight down, sliding along the ramp it landed on, resting on the cushion or in the basket;
//   - a sliding ball follows the ramp's CURRENT target position (flat = slide to the nearer end), so turning a ramp under it
//     simply sends it the other way and it can never get stuck; falling and sliding use one constant speed (VEL), well under
//     the cap of 40% of the board height per second;
//   - every route ends in the basket or on the cushion; the cushion returns the ball to the top after 1 s and it falls again;
//   - the 3rd ball in the basket makes the track glow for 3 s and the ramps move to a new random arrangement
//     (never equal to the previous starting arrangement nor to the one they have just been left in).
// One rAF loop (capped dt, stopped when idle or the tab is hidden) drives everything, so reduced motion does not disable it.
// All state is in JS; layout only repositions the transparent buttons, so rotation / resize keeps the state.
// Nothing is scored or stored.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';

var BW: any = 400, BH: any = 360;
var HALF: any = 65, TILT: any = 22, THICK: any = 10;               // half ramp length (board units), tilt in degrees, ramp thickness
var BALL_R: any = 11, OFF: any = BALL_R + THICK / 2;          // ball radius; centre offset above the ramp's centre line
var VEL: any = 80;                                       // units/s (board height 360 -> 22% of the height per second)
var TURN_T: any = 0.4, CUSHION_T: any = 1, ENTER_T: any = 0.3, GLOW_T: any = 3, WAVE_T: any = 1.6, MAX_DT: any = 0.05;
var FLOOR: any = 336;                                    // top of the cushion
var DROP_X: any = 190, DROP_Y: any = 26;                      // dropper hatch: left of ramp 1's centre, so a flat ramp 1 leads left
var BASKET: any = { l: 250, r: 342, rim: 296 };          // opening and rim height (the ball is hidden below the rim)
var RAMPS: any = [
  { cx: 200, cy: 72, col: '#f7a8c9' },
  { cx: 95, cy: 152, col: '#a8d8f0' },
  { cx: 305, cy: 152, col: '#ffd98a' },
  { cx: 200, cy: 232, col: '#9ed8c6' }
];
var STATE_NAME: any = { '-1': 'w lewo', '0': 'płasko', '1': 'w prawo' };

function clamp(v?: any, a?: any, b?: any) { return v < a ? a : (v > b ? b : v); }
function ease(t?: any) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function rad(d?: any) { return d * Math.PI / 180; }

function report(fn?: any) { try { if (Analytics) { fn(Analytics); } } catch (e: any) { /* metrics must never break the activity */ } }

function scene() {
  var s: any = '<defs><linearGradient id="mt-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dff1fb"/><stop offset="1" stop-color="#f8f3e1"/></linearGradient></defs>' +
    '<rect width="400" height="360" fill="url(#mt-sky)"/>' +
    '<circle cx="360" cy="70" r="30" fill="#fff" fill-opacity=".55"/><circle cx="46" cy="190" r="22" fill="#fff" fill-opacity=".45"/>';
  // dropper hatch and funnel at the top
  s += '<path d="M168 0H212L204 14H176Z" fill="#c9b8f2" stroke="#8f7fd1" stroke-width="2" stroke-linejoin="round"/>' +
    '<rect x="178" y="12" width="24" height="5" rx="2.5" fill="#8f7fd1"/>';
  // ramps with their posts (posts are static; the ramp bars rotate)
  var i: any, r: any;
  s += '<g class="mt-track">';
  for (i = 0; i < RAMPS.length; i++) {
    r = RAMPS[i];
    s += '<rect x="' + (r.cx - 3) + '" y="' + r.cy + '" width="6" height="' + (FLOOR - r.cy) + '" fill="#d9cfc2" fill-opacity=".7"/>';
  }
  for (i = 0; i < RAMPS.length; i++) {
    r = RAMPS[i];
    s += '<g class="mt-ramp" transform="translate(' + r.cx + ' ' + r.cy + ')">' +
      '<rect x="' + (-HALF) + '" y="' + (-THICK / 2) + '" width="' + (2 * HALF) + '" height="' + THICK + '" rx="5" fill="' + r.col + '" stroke="#8f7fd1" stroke-width="2"/>' +
      '<path d="M-22 0H22M14 -3L22 0L14 3M-14 -3L-22 0L-14 3" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".9"/>' +
      '<circle r="6" fill="#fff" stroke="#8f7fd1" stroke-width="2"/></g>';
  }
  s += '</g>';
  // cushion along the bottom edge
  s += '<rect x="0" y="' + FLOOR + '" width="400" height="' + (BH - FLOOR) + '" fill="#f6c6dc"/>' +
    '<path d="M0 ' + FLOOR + 'H400" stroke="#f0a5c6" stroke-width="3"/>';
  for (i = 0; i < 12; i++) { s += '<circle cx="' + (18 + i * 33) + '" cy="' + (FLOOR + 14) + '" r="3" fill="#fff" fill-opacity=".8"/>'; }
  // basket back + bear
  s += '<path d="M' + (BASKET.l - 6) + ' ' + BASKET.rim + 'H' + (BASKET.r + 6) + 'L' + (BASKET.r + 2) + ' ' + FLOOR + 'H' + (BASKET.l + 4) + 'Z" fill="#c78f5a"/>';
  s += '<g class="mt-bear" transform="translate(' + ((BASKET.l + BASKET.r) / 2 + 22) + ' ' + (BASKET.rim - 10) + ')">' +
    '<circle cx="-16" cy="-22" r="7" fill="#b5784a"/><circle cx="16" cy="-22" r="7" fill="#b5784a"/>' +
    '<circle r="19" fill="#c78f5a"/><ellipse cy="6" rx="9" ry="7" fill="#f3dcab"/>' +
    '<circle cx="-7" cy="-4" r="2.4" fill="#5b5675"/><circle cx="7" cy="-4" r="2.4" fill="#5b5675"/>' +
    '<ellipse cy="3" rx="3" ry="2" fill="#5b5675"/><path d="M-4 8Q0 12 4 8" fill="none" stroke="#5b5675" stroke-width="1.6" stroke-linecap="round"/>' +
    '<g class="mt-paw" transform="translate(-19 14)"><circle r="6.5" fill="#b5784a"/></g>' +
    '<g class="mt-paw" transform="translate(19 14)"><circle r="6.5" fill="#b5784a"/></g></g>';
  s += '<g class="mt-ballLayer"></g>';
  // basket front hides the ball once it is inside
  s += '<path d="M' + (BASKET.l - 6) + ' ' + (BASKET.rim + 6) + 'H' + (BASKET.r + 6) + 'L' + (BASKET.r + 2) + ' ' + FLOOR + 'H' + (BASKET.l + 4) + 'Z" fill="#d9a066" stroke="#a8683f" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M' + (BASKET.l + 2) + ' ' + (BASKET.rim + 22) + 'H' + (BASKET.r + 3) + 'M' + (BASKET.l + 3) + ' ' + (BASKET.rim + 38) + 'H' + (BASKET.r + 2) + '" stroke="#a8683f" stroke-width="2" stroke-opacity=".6"/>' +
    '<rect x="' + (BASKET.l - 9) + '" y="' + (BASKET.rim - 1) + '" width="' + (BASKET.r - BASKET.l + 18) + '" height="9" rx="4.5" fill="#c78f5a" stroke="#a8683f" stroke-width="2.5"/>';
  // three picture pips: balls collected in the basket
  for (i = 0; i < 3; i++) {
    s += '<circle class="mt-pip" cx="' + (326 + i * 28) + '" cy="22" r="9" fill="#fff" fill-opacity=".6" stroke="#8f7fd1" stroke-width="2.5"/>';
  }
  return s;
}

function ballMarkup() {
  return '<g class="mt-ball"><circle r="' + BALL_R + '" fill="#ee6a5f" stroke="#c4473f" stroke-width="2"/>' +
    '<path d="M-6 -3Q-2 -8 3 -7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-opacity=".85"/></g>';
}

function mount(container: HTMLElement) {
  var root: any = document.createElement('div');
  root.className = 'mt';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Kulkowy Tor');
  var btns: any = '', i: any;
  for (i = 0; i < RAMPS.length; i++) {
    btns += '<button type="button" class="mt-rb" aria-label=""></button>';
  }
  root.innerHTML = '<div class="mt-board"><svg class="mt-svg" viewBox="0 0 400 360" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' + scene() + '</svg>' + btns + '</div>' +
    '<button type="button" class="mt-drop" aria-label="Wrzuć kulkę"><svg class="mt-dropsvg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
    '<circle cx="32" cy="32" r="22" fill="#ee6a5f" stroke="#c4473f" stroke-width="3"/><path d="M19 27Q26 17 37 19" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-opacity=".85"/>' +
    '<path d="M32 4V12M26 8L32 14L38 8" fill="none" stroke="#8f7fd1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
  container.appendChild(root);

  var board: any = root.querySelector('.mt-board');
  var rbs: any = root.querySelectorAll('.mt-rb');
  var dropBtn: any = root.querySelector('.mt-drop');
  var rampEls: any = root.querySelectorAll('.mt-ramp');
  var trackEl: any = root.querySelector('.mt-track'); void trackEl;
  var pawEls: any = root.querySelectorAll('.mt-paw');
  var pipEls: any = root.querySelectorAll('.mt-pip');
  var layer: any = root.querySelector('.mt-ballLayer');
  layer.innerHTML = ballMarkup();
  var ballEl: any = layer.firstChild;
  ballEl.setAttribute('visibility', 'hidden');

  var ramps: any = RAMPS.map(function () { return { st: 0, ang: 0, from: 0, to: 0, t: TURN_T }; });
  var ball: any = null;                                  // { x, y, mode, t, ramp }
  var inBasket: any = 0, glowT: any = 0, waveT: any = 0;
  var prevStart: any = null;
  var raf: any = 0, last: any = 0;

  function key() { return ramps.map(function (r?: any) { return r.st; }).join(','); }

  function setState(i?: any, st?: any) {
    var r: any = ramps[i];
    r.st = st; r.from = r.ang; r.to = st * TILT; r.t = 0;
    rbs[i].setAttribute('aria-label', 'Rampa ' + (i + 1) + ', ' + STATE_NAME[st] + ', obróć');
  }

  function newArrangement() {
    var cur: any = key(), n: any, st: any = [], j: any, cand: any; void n;
    do {
      st = [];
      for (j = 0; j < RAMPS.length; j++) { st.push(Math.floor(Math.random() * 3) - 1); }
      cand = st.join(',');
    } while (cand === cur || cand === prevStart);
    for (j = 0; j < RAMPS.length; j++) { setState(j, st[j]); }
    prevStart = cand;
  }

  function turn(i?: any) {
    var st: any = ramps[i].st + 1;
    if (st > 1) { st = -1; }
    setState(i, st);
    report(function (A?: any) { A.track('interaction', { variant: 'ramp' + (i + 1) }); });
    start();
  }

  function drop() {
    if (ball) { return; }
    ball = { x: DROP_X, y: DROP_Y, mode: 'fall', t: 0, ramp: -1 };
    report(function (A?: any) { A.track('interaction', { variant: 'ball' }); });
    start();
  }

  // surface height of ramp i at x (centre line) and its horizontal half span, from the CURRENT angle
  function surf(i?: any, x?: any) { return RAMPS[i].cy + (x - RAMPS[i].cx) * Math.tan(rad(ramps[i].ang)); }
  function span(i?: any) { return HALF * Math.cos(rad(ramps[i].ang)); }

  function stepBall(dt?: any) {
    var b: any = ball, i: any;
    b.t += dt;
    if (b.mode === 'enter') {
      if (b.t >= ENTER_T) { b.mode = 'fall'; b.t = 0; }
      return;
    }
    if (b.mode === 'fall') {
      var ny: any = b.y + VEL * dt;
      for (i = 0; i < RAMPS.length; i++) {
        if (Math.abs(b.x - RAMPS[i].cx) > span(i)) { continue; }
        var top: any = surf(i, b.x) - OFF;
        if (ny >= top && b.y <= top + 14) { b.mode = 'slide'; b.ramp = i; b.y = top; return; }
      }
      b.y = ny;
      if (b.y < FLOOR - BALL_R) { return; }
      if (b.x >= BASKET.l && b.x <= BASKET.r) {
        b.mode = 'basket'; b.t = 0;
        inBasket++;
        report(function (A?: any) { A.complete(); });
        waveT = WAVE_T;
        if (inBasket >= 3) { inBasket = 0; glowT = GLOW_T; newArrangement(); }
      } else {
        b.y = FLOOR - BALL_R; b.mode = 'cushion'; b.t = 0;
      }
      return;
    }
    if (b.mode === 'slide') {
      i = b.ramp;
      var st: any = ramps[i].st, dir: any = st !== 0 ? st : (b.x < RAMPS[i].cx ? -1 : 1);
      b.x += dir * VEL * Math.cos(rad(ramps[i].ang)) * dt;
      var edge: any = span(i);
      if (Math.abs(b.x - RAMPS[i].cx) > edge) {
        b.x = RAMPS[i].cx + dir * (edge + 1);
        b.mode = 'fall'; b.ramp = -1;
        return;
      }
      b.y = surf(i, b.x) - OFF;
      return;
    }
    if (b.mode === 'cushion') {
      if (b.t >= CUSHION_T) { b.x = DROP_X; b.y = DROP_Y; b.mode = 'enter'; b.t = 0; }
      return;
    }
    if (b.mode === 'basket') {
      b.y = Math.min(b.y + VEL * dt, FLOOR - BALL_R);
      if (b.t >= 0.7) { ball = null; }
    }
  }

  function frame(now?: any) {
    var dt: any = Math.min((now - last) / 1000, MAX_DT), i: any;
    last = now;
    for (i = 0; i < ramps.length; i++) {
      var r: any = ramps[i];
      if (r.t < TURN_T) {
        r.t = Math.min(TURN_T, r.t + dt);
        r.ang = r.from + (r.to - r.from) * ease(r.t / TURN_T);
      } else { r.ang = r.to; }
    }
    if (ball) { stepBall(dt); }
    if (glowT > 0) { glowT = Math.max(0, glowT - dt); }
    if (waveT > 0) { waveT = Math.max(0, waveT - dt); }
    paint();
    if (active()) { raf = requestAnimationFrame(frame); } else { raf = 0; }
  }

  function active() {
    if (ball || glowT > 0 || waveT > 0) { return true; }
    for (var i: any = 0; i < ramps.length; i++) { if (ramps[i].t < TURN_T) { return true; } }
    return false;
  }

  function paint() {
    var i: any, r: any;
    for (i = 0; i < ramps.length; i++) {
      r = RAMPS[i];
      rampEls[i].setAttribute('transform', 'translate(' + r.cx + ' ' + r.cy + ') rotate(' + ramps[i].ang.toFixed(2) + ')');
    }
    // bear paws: down at rest, up and waving while catching
    var wv: any = waveT > 0 ? Math.sin((WAVE_T - waveT) * 2 * Math.PI * 1.2) * 4 : 0;
    var up: any = waveT > 0 ? Math.min(1, Math.min(WAVE_T - waveT, waveT) / 0.25) : 0;
    pawEls[0].setAttribute('transform', 'translate(-19 ' + (14 - 34 * up + wv * up).toFixed(1) + ')');
    pawEls[1].setAttribute('transform', 'translate(19 ' + (14 - 34 * up - wv * up).toFixed(1) + ')');
    for (i = 0; i < pipEls.length; i++) {
      var on: any = glowT > 0 || i < inBasket;
      pipEls[i].setAttribute('fill', on ? '#ee6a5f' : '#fff');
      pipEls[i].setAttribute('fill-opacity', on ? '1' : '.6');
    }
    if (glowT > 0) { root.classList.add('mt-glow'); } else { root.classList.remove('mt-glow'); }
    if (!ball) { ballEl.setAttribute('visibility', 'hidden'); return; }
    var op: any = 1, sx: any = 1, sy: any = 1;
    if (ball.mode === 'cushion') {
      var q: any = Math.min(1, ball.t / 0.3);
      sx = 1 + 0.25 * q; sy = 1 - 0.25 * q;
      if (ball.t > 0.7) { op = Math.max(0, 1 - (ball.t - 0.7) / 0.3); }
    } else if (ball.mode === 'enter') { op = Math.min(1, ball.t / ENTER_T); }
    else if (ball.mode === 'basket' && ball.t > 0.4) { op = Math.max(0, 1 - (ball.t - 0.4) / 0.3); }
    ballEl.setAttribute('visibility', 'visible');
    ballEl.setAttribute('opacity', op.toFixed(2));
    ballEl.setAttribute('transform', 'translate(' + ball.x.toFixed(1) + ' ' + (ball.y + (1 - sy) * BALL_R).toFixed(1) + ') scale(' + sx.toFixed(2) + ' ' + sy.toFixed(2) + ')');
  }

  function layout() {
    var w: any = board.clientWidth || window.innerWidth, k: any = w / BW;
    var bh: any = Math.max(56, THICK * k * 2);
    for (var i: any = 0; i < RAMPS.length; i++) {
      var bw: any = Math.max(56, 2 * HALF * k);
      rbs[i].style.width = bw.toFixed(1) + 'px'; rbs[i].style.height = bh.toFixed(1) + 'px';
      rbs[i].style.left = (RAMPS[i].cx * k - bw / 2).toFixed(1) + 'px';
      rbs[i].style.top = (RAMPS[i].cy * k - bh / 2).toFixed(1) + 'px';
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

  Array.prototype.forEach.call(rbs, function (b?: any, n?: any) { b.addEventListener('click', function () { turn(n); }); });
  dropBtn.addEventListener('click', drop);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);

  newArrangement();
  for (i = 0; i < ramps.length; i++) { ramps[i].ang = ramps[i].to; ramps[i].t = TURN_T; }
  layout();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function KulkowyActivity() {
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
