// Activity "Zjeżdżalnia": a pastel playground slide with a ladder, a soft mat, a bench and 3 different animals.
// Touch a waiting animal -> it climbs the ladder (3 s), pauses at the top (1 s), slides down slowly (4 s) and lands on
// the mat with a small squash, then walks back home and rests for ~3 s. Only one animal is on ladder/slide at a time,
// the others queue at the ladder foot in the order touched. Touching an animal that is already busy makes it wave
// (its path is never changed); touching the mat makes it bounce once (max 8 px). Nothing is scored or stored.
// Board = fixed 440x300 coordinate space ("units", feet-anchored sprites), scaled by k = board width / 440 and
// re-laid-out on resize/orientation change, so an animal mid-slide is simply redrawn on the new scale.
// One rAF loop (capped dt, paused when the tab is hidden, stopped when idle) so everything also works under the global
// prefers-reduced-motion rule that disables CSS animations. Fixed DOM: 3 animals + 1 mat button.
import { useEffect, useRef } from 'react';
import { Animals } from '../utils/animals';

var BW: any = 440, BH: any = 300; void BH;
var GY: any = 262;                         // ground line
var FOOT_X: any = 56, TOP_X: any = 96, TOP_Y: any = 96;
var QS: any = [116, 176];                  // queue spots next to the ladder while the slide is busy
var HOME: any = [149, 209, 269];
var P0: any = [96, 96], P1: any = [235, 175], P2: any = [335, 252];   // slide curve (quadratic Bezier), ends on the mat
var CLIMB_T: any = 3, TOP_T: any = 1, SLIDE_T: any = 4, LAND_T: any = 0.9, REST_T: any = 3, WAVE_T: any = 1.6, BOUNCE_T: any = 0.7;
var WALK: any = 55;                        // walking speed, units per second
var MAX_DT: any = 0.05;
var MAT_BOUNCE_PX: any = 6;                // peak mat bounce (<= 8 px)
var SLIDE_END: any = 0.9;                  // the slide band covers the curve up to here, the rest is a soft drop on the mat

function sm(u?: any) { return u * u * (3 - 2 * u); }
function bez(t?: any) {
  var a: any = (1 - t) * (1 - t), b: any = 2 * (1 - t) * t, c: any = t * t;
  return [a * P0[0] + b * P1[0] + c * P2[0], a * P0[1] + b * P1[1] + c * P2[1]];
}
function bezD(t?: any) {
  return [2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]), 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1])];
}

function scene() {
  var pts: any = [], n: any, p: any;
  for (n = 0; n <= 18; n++) { p = bez(SLIDE_END * n / 18); pts.push(p[0].toFixed(1) + ',' + (p[1] + 6).toFixed(1)); }
  var surf: any = pts.join(' ');
  var l1: any = bez(0.3), l2: any = bez(0.65);
  var cx: any = function (y?: any) { return FOOT_X + (TOP_X - FOOT_X) * (GY - y) / (GY - TOP_Y); };
  var rungs: any = '';
  for (var y: any = GY - 20; y > TOP_Y + 8; y -= 26) { rungs += '<line x1="' + (cx(y) - 17) + '" y1="' + y + '" x2="' + (cx(y) + 17) + '" y2="' + y + '"/>'; }
  return '<defs><linearGradient id="zj-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfeaf8"/><stop offset="1" stop-color="#f3f7e6"/></linearGradient></defs>' +
    '<rect width="440" height="300" fill="url(#zj-sky)"/>' +
    '<g fill="#fff" fill-opacity=".9"><circle cx="64" cy="40" r="14"/><circle cx="84" cy="34" r="18"/><circle cx="106" cy="42" r="12"/><rect x="52" y="42" width="66" height="12" rx="6"/>' +
    '<circle cx="340" cy="30" r="11"/><circle cx="358" cy="25" r="15"/><circle cx="377" cy="32" r="10"/><rect x="330" y="32" width="58" height="10" rx="5"/></g>' +
    '<path d="M0 232Q70 196 150 226T300 218T440 224V300H0z" fill="#d4ecc8"/>' +
    '<rect y="262" width="440" height="38" fill="#c3e3b4"/>' +
    // bench
    '<g><rect x="382" y="214" width="46" height="8" rx="4" fill="#d9b48f"/><rect x="382" y="234" width="46" height="9" rx="4" fill="#c79d75"/>' +
    '<rect x="386" y="243" width="5" height="19" rx="2" fill="#a8946f"/><rect x="419" y="243" width="5" height="19" rx="2" fill="#a8946f"/>' +
    '<rect x="386" y="222" width="4" height="12" fill="#a8946f"/><rect x="420" y="222" width="4" height="12" fill="#a8946f"/></g>' +
    // posts, slide legs
    '<g stroke="#b9b3e0" stroke-width="7" stroke-linecap="round"><line x1="110" y1="106" x2="110" y2="' + GY + '"/>' +
    '<line x1="' + l1[0].toFixed(1) + '" y1="' + (l1[1] + 8).toFixed(1) + '" x2="' + l1[0].toFixed(1) + '" y2="' + GY + '"/>' +
    '<line x1="' + l2[0].toFixed(1) + '" y1="' + (l2[1] + 8).toFixed(1) + '" x2="' + l2[0].toFixed(1) + '" y2="' + GY + '"/></g>' +
    // ladder
    '<g stroke="#a8d8f0" stroke-width="6" stroke-linecap="round"><line x1="' + (cx(GY) - 17) + '" y1="' + GY + '" x2="' + (cx(TOP_Y) - 17) + '" y2="' + TOP_Y + '"/>' +
    '<line x1="' + (cx(GY) + 17) + '" y1="' + GY + '" x2="' + (cx(TOP_Y) + 17) + '" y2="' + TOP_Y + '"/></g>' +
    '<g stroke="#8cc3e3" stroke-width="4" stroke-linecap="round">' + rungs + '</g>' +
    // deck and rail
    '<rect x="68" y="96" width="50" height="9" rx="4.5" fill="#ffd98a"/>' +
    '<g stroke="#ffd98a" stroke-width="4" stroke-linecap="round" fill="none"><path d="M72 96V66H100"/></g>' +
    // slide band
    '<polyline points="' + surf + '" fill="none" stroke="#f7a8c9" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<polyline points="' + surf + '" fill="none" stroke="#ffd0e0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,-2)"/>' +
    // mat
    '<g id="zj-mat"><ellipse cx="335" cy="262" rx="36" ry="9" fill="#9ed8c6"/><ellipse cx="335" cy="258" rx="36" ry="8" fill="#bfe9d9"/>' +
    '<ellipse cx="335" cy="258" rx="22" ry="4.5" fill="#d8f3e8"/></g>';
}

function figure(def?: any) {
  var fur: any = def.fur;
  return '<svg viewBox="-30 -74 60 80" aria-hidden="true" focusable="false" overflow="visible">' +
    '<ellipse cx="-9" cy="-3" rx="6" ry="3.5" fill="' + fur + '"/><ellipse cx="9" cy="-3" rx="6" ry="3.5" fill="' + fur + '"/>' +
    '<g transform="translate(0,-36) scale(.85)">' + Animals.head(def.id, { body: true }) + '</g>' +
    '<circle class="zj-paw" cx="21" cy="-14" r="5" fill="' + fur + '"/></svg>';
}

function mount(container: HTMLElement) {
  var defs: any = Animals.pick(3, { distinct: true });   // 3 different animals, new on every launch
  var root: any = document.createElement('div');
  root.className = 'zj';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Zjeżdżalnia');
  var btns: any = '';
  defs.forEach(function (d?: any, i?: any) {
    btns += '<button type="button" class="zj-an" data-i="' + i + '" aria-label="' + d.name + ' – wejdź na zjeżdżalnię">' + figure(d) + '</button>';
  });
  root.innerHTML = '<div class="zj-board"><svg class="zj-bg" viewBox="0 0 440 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    scene() + '</svg><button type="button" class="zj-matbtn" aria-label="Mata – podskocz"></button>' + btns + '</div>';
  container.appendChild(root);

  var board: any = root.querySelector('.zj-board');
  var matG: any = root.querySelector('#zj-mat');
  var matBtn: any = root.querySelector('.zj-matbtn');
  var k: any = 1, bw: any = 56, bh: any = 80;
  var animals: any = [], queue: any = [], active: any = null;
  var matT: any = -1, raf: any = 0, last: any = 0;

  defs.forEach(function (d?: any, i?: any) {
    var el: any = root.querySelectorAll('.zj-an')[i];
    var a: any = { i: i, def: d, el: el, svg: el.querySelector('svg'), paw: el.querySelector('.zj-paw'), state: 'ready',
      x: HOME[i], y: GY, t: 0, wv: 0, tilt: 0, sx: 1, sy: 1, bob: 0 };
    animals.push(a);
    el.addEventListener('click', function () { touch(a); });
  });
  matBtn.addEventListener('click', function () { matT = 0; start(); });

  function touch(a?: any) {
    if (a.state === 'ready') {
      a.state = 'queued'; queue.push(a);
    } else {
      a.wv = WAVE_T;                   // busy animals only wave; their path is never touched
    }
    start();
  }

  function slotX(j?: any) {
    if (active) { return QS[Math.min(j, QS.length - 1)]; }
    return j === 0 ? FOOT_X : QS[Math.min(j - 1, QS.length - 1)];
  }
  function walkTo(a?: any, tx?: any, ty?: any, dt?: any) {
    var dx: any = tx - a.x, dy: any = ty - a.y, d: any = Math.sqrt(dx * dx + dy * dy), s: any = WALK * dt;
    if (d <= s) { a.x = tx; a.y = ty; return true; }
    a.x += dx / d * s; a.y += dy / d * s; a.bob += dt;
    return false;
  }

  function frame(now?: any) {
    var dt: any = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    var busy: any = false;

    if (!active && queue.length) {
      var h: any = queue[0];
      if (h.x === FOOT_X && h.y === GY) { queue.shift(); active = h; h.state = 'climb'; h.t = 0; }
    }

    animals.forEach(function (a?: any) {
      var u: any, p: any, dd: any;
      a.tilt = 0; a.sx = 1; a.sy = 1;
      if (a.state === 'queued') {
        walkTo(a, slotX(queue.indexOf(a)), GY, dt);
        a.tilt = a.x === slotX(queue.indexOf(a)) ? 0 : Math.sin(a.bob * 7) * 3;
      } else if (a.state === 'climb') {
        a.t += dt; u = Math.min(a.t / CLIMB_T, 1);
        p = 0.6 * u + 0.4 * sm(u);
        a.x = FOOT_X + (TOP_X - FOOT_X) * p; a.y = GY + (TOP_Y - GY) * p;
        a.tilt = Math.sin(u * Math.PI * 2 * 6) * 3;
        if (a.t >= CLIMB_T) { a.state = 'top'; a.t = 0; a.x = TOP_X; a.y = TOP_Y; }
      } else if (a.state === 'top') {
        a.t += dt;
        if (a.t >= TOP_T) { a.state = 'slide'; a.t = 0; }
      } else if (a.state === 'slide') {
        a.t += dt; u = Math.min(a.t / SLIDE_T, 1);
        var q: any = 0.65 * u + 0.35 * sm(u);       // never faster than ~1.2x the mean speed, never stalls
        p = bez(q); dd = bezD(q);
        a.x = p[0]; a.y = p[1];
        a.tilt = Math.atan2(dd[1], dd[0]) * 180 / Math.PI * 0.5;
        if (a.t >= SLIDE_T) { a.state = 'land'; a.t = 0; matT = Math.max(matT, -2); a.x = P2[0]; a.y = P2[1]; }
      } else if (a.state === 'land') {
        a.t += dt; u = Math.min(a.t / LAND_T, 1);
        var s: any = Math.sin(Math.PI * u) * (1 - u * 0.2);
        a.sx = 1 + 0.12 * s; a.sy = 1 - 0.18 * s;
        if (a.t >= LAND_T) { a.state = 'walk'; a.t = 0; active = null; }
      } else if (a.state === 'walk') {
        if (walkTo(a, HOME[a.i], GY, dt)) { a.state = 'rest'; a.t = 0; }
        a.tilt = Math.sin(a.bob * 7) * 3;
      } else if (a.state === 'rest') {
        a.t += dt;
        if (a.t >= REST_T) { a.state = 'ready'; }
      }
      if (a.wv > 0) { a.wv = Math.max(0, a.wv - dt); }
      if (a.state !== 'ready' || a.wv > 0) { busy = true; }
    });

    if (matT >= 0) {
      matT += dt;
      if (matT >= BOUNCE_T) { matT = -1; }
      else { busy = true; }
    }
    paint();
    if (busy) { raf = requestAnimationFrame(frame); } else { raf = 0; }
  }

  function paint() {
    var i: any, a: any, u: any, env: any, ang: any;
    for (i = 0; i < animals.length; i++) {
      a = animals[i];
      var ax: any = a.x * k - bw / 2, ay: any = a.y * k - bh + 6 * k;
      a.el.style.transform = 'translate(' + ax.toFixed(1) + 'px,' + ay.toFixed(1) + 'px) rotate(' + a.tilt.toFixed(1) + 'deg) scale(' + a.sx.toFixed(3) + ',' + a.sy.toFixed(3) + ')';
      a.el.style.transformOrigin = (bw / 2).toFixed(1) + 'px ' + (bh - 6 * k).toFixed(1) + 'px';
      a.el.style.zIndex = a === active ? '6' : '4';
      if (a.wv > 0) {
        u = (WAVE_T - a.wv) / WAVE_T;
        env = Math.sin(Math.PI * Math.min(1, u * 1.15));
        ang = Math.sin(u * Math.PI * 2 * 3);
        a.paw.setAttribute('cx', (21 + 3 * ang * env).toFixed(1));
        a.paw.setAttribute('cy', (-14 - 22 * env).toFixed(1));
      } else {
        a.paw.setAttribute('cx', '21'); a.paw.setAttribute('cy', '-14');
      }
    }
    // mat: gentle bounce on touch (<= 8 px), small dip while an animal lands
    var dy: any = 0;
    if (matT >= 0) { dy -= MAT_BOUNCE_PX / k * Math.sin(Math.PI * matT / BOUNCE_T); }
    if (active && active.state === 'land') { dy += 3 / k * Math.sin(Math.PI * Math.min(1, active.t / LAND_T)); }
    matG.setAttribute('transform', 'translate(0,' + dy.toFixed(2) + ')');
  }

  function layout() {
    var w: any = board.clientWidth || window.innerWidth;
    k = w / BW;
    bw = Math.max(56, 60 * k); bh = Math.max(56, 80 * k);
    animals.forEach(function (a?: any) {
      a.el.style.width = bw.toFixed(1) + 'px'; a.el.style.height = bh.toFixed(1) + 'px';
      a.svg.style.width = (60 * k).toFixed(1) + 'px'; a.svg.style.height = (80 * k).toFixed(1) + 'px';
    });
    var mw: any = Math.max(56, 76 * k), mh: any = Math.max(56, 40 * k);
    matBtn.style.width = mw.toFixed(1) + 'px'; matBtn.style.height = mh.toFixed(1) + 'px';
    matBtn.style.left = (335 * k - mw / 2).toFixed(1) + 'px'; matBtn.style.top = (258 * k - mh / 2).toFixed(1) + 'px';
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

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function ZjezdzalniaActivity() {
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
