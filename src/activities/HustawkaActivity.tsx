// Activity "Huśtawka": a big tree, a swing hanging from its branch with a seated animal, grass and leaves.
// Touch the swing or the animal -> one gentle push (the animal also waves). Pushes raise a target amplitude in small
// steps (+8 deg, max 35 deg) that drains away on its own (~13 s); the real amplitude eases toward it, so the swing
// is a smooth pendulum (period 3.6 s) that never jerks and settles to rest in about 15 s. While the amplitude is above
// 20 deg up to 6 leaves at a time drift down slowly (5-7 s each) and are hidden again after their fall (pooled DOM).
// Touching the tree sways its crown once. Nothing is scored or stored.
// Board = fixed 400x300 coordinate space scaled by k = board width / 400, re-laid-out on resize/orientation change.
// One rAF loop (capped dt, paused when the tab is hidden, stopped when idle) so everything also works under the global
// prefers-reduced-motion rule that disables CSS animations.
import { useEffect, useRef } from 'react';
import { Animals } from '../utils/animals';

var BW: any = 400, BH: any = 300; void BH;
var PX: any = 260, PY: any = 112, ROPE: any = 118, ROPE_X: any = 26;     // pivot (under the branch) and rope length, board units
var PERIOD: any = 3.6, OMEGA: any = 2 * Math.PI / PERIOD;
var MAX_AMP: any = 35, STEP: any = 8, DRAIN: any = 2.7, EASE: any = 2;   // degrees, degrees, degrees per second, 1 / second
var LEAF_AMP: any = 20, MAX_LEAVES: any = 6, LEAF_GAP: any = 0.9;
var SWAY_T: any = 2.6, WAVE_T: any = 1.6;
var MAX_DT: any = 0.05;

function leafSvg(c?: any) {
  return '<svg viewBox="-8 -8 16 16" aria-hidden="true" focusable="false"><path d="M-7 3Q-6-6 6-7Q7 4-5 6Z" fill="' + c + '"/><path d="M-6 5L5-6" stroke="#fff" stroke-opacity=".6" stroke-width="1" fill="none"/></svg>';
}
var LEAF_COLS: any = ['#a9d98f', '#8fcf98', '#c8e38c', '#ffd98a', '#f4b78f', '#b7e0a0'];

function scene() {
  var leaves: any = [[40, 82, '#a9d98f'], [64, 40, '#8fcf98'], [96, 30, '#c8e38c'], [128, 44, '#a9d98f'], [158, 70, '#8fcf98'],
    [30, 112, '#8fcf98'], [78, 92, '#c8e38c'], [120, 100, '#a9d98f'], [150, 114, '#c8e38c'], [100, 62, '#ffd98a'], [52, 62, '#c8e38c']];
  var lv: any = '';
  leaves.forEach(function (l?: any) { lv += '<ellipse cx="' + l[0] + '" cy="' + l[1] + '" rx="9" ry="5.5" fill="' + l[2] + '" transform="rotate(-30 ' + l[0] + ' ' + l[1] + ')"/>'; });
  return '<defs><linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfeaf8"/><stop offset="1" stop-color="#f3f7e6"/></linearGradient></defs>' +
    '<rect width="400" height="300" fill="url(#hs-sky)"/>' +
    '<g fill="#fff" fill-opacity=".9"><circle cx="300" cy="34" r="12"/><circle cx="318" cy="28" r="16"/><circle cx="338" cy="35" r="11"/><rect x="288" y="36" width="62" height="11" rx="5.5"/></g>' +
    '<path d="M0 238Q80 214 170 236T330 228T400 234V300H0z" fill="#d4ecc8"/>' +
    '<rect y="252" width="400" height="48" fill="#c3e3b4"/>' +
    '<g fill="#a9d98f"><path d="M330 262q-3-10 0-14M335 262q1-9 5-12M340 262q4-8 9-9"/></g>' +
    // trunk and branch
    '<path d="M62 262Q70 200 74 150Q76 120 80 100L108 100Q110 130 112 150Q116 200 124 262Z" fill="#c79d75"/>' +
    '<path d="M104 112L286 108" stroke="#c79d75" stroke-width="13" stroke-linecap="round"/>' +
    '<path d="M104 106L286 102" stroke="#d9b48f" stroke-width="4" stroke-linecap="round"/>' +
    '<ellipse cx="93" cy="262" rx="40" ry="6" fill="#b3d9a3"/>';
}
function crown() {
  return '<circle cx="90" cy="86" r="52" fill="#b9e0a4"/><circle cx="46" cy="96" r="32" fill="#a9d98f"/><circle cx="138" cy="92" r="38" fill="#a9d98f"/>' +
    '<circle cx="92" cy="50" r="34" fill="#c4e8b0"/><circle cx="128" cy="62" r="26" fill="#b9e0a4"/>' +
    '<g>' + [[40, 82, '#8fcf98'], [64, 40, '#8fcf98'], [112, 34, '#c8e38c'], [150, 80, '#8fcf98'], [92, 96, '#c8e38c'], [60, 112, '#8fcf98'], [124, 110, '#a9d98f'], [100, 66, '#ffd98a']].map(function (l?: any) {
      return '<ellipse cx="' + l[0] + '" cy="' + l[1] + '" rx="10" ry="6" fill="' + l[2] + '" transform="rotate(-30 ' + l[0] + ' ' + l[1] + ')"/>';
    }).join('') + '</g>';
}
function swingSvg() {
  // viewBox x -50..50, y 0..ROPE+12: only the seat; the ropes are drawn in a fixed layer so their tops stay on the branch
  return '<svg viewBox="-50 0 100 ' + (ROPE + 12) + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    '<rect x="-34" y="' + ROPE + '" width="68" height="9" rx="4.5" fill="#f7a8c9"/><rect x="-30" y="' + ROPE + '" width="60" height="3.5" rx="1.7" fill="#ffd0e0"/>' +
    '</svg>';
}
function figure(def?: any) {
  var fur: any = def.fur;
  return '<svg viewBox="-30 -74 60 80" aria-hidden="true" focusable="false" overflow="visible">' +
    '<ellipse cx="-9" cy="-3" rx="6" ry="3.5" fill="' + fur + '"/><ellipse cx="9" cy="-3" rx="6" ry="3.5" fill="' + fur + '"/>' +
    '<g transform="translate(0,-36) scale(.85)">' + Animals.head(def.id, { body: true }) + '</g>' +
    '<circle class="hs-paw" cx="21" cy="-14" r="5" fill="' + fur + '"/></svg>';
}

function mount(container: HTMLElement) {
  var def: any = Animals.pick(1)[0];       // a new animal on every launch
  var root: any = document.createElement('div');
  root.className = 'hs';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Huśtawka');
  var leafHtml: any = '';
  for (var n: any = 0; n < MAX_LEAVES; n++) { leafHtml += '<span class="hs-leaf" style="display:none">' + leafSvg(LEAF_COLS[n]) + '</span>'; }
  root.innerHTML = '<div class="hs-board"><svg class="hs-bg" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    scene() + '<g class="hs-crown">' + crown() + '</g></svg>' +
    '<button type="button" class="hs-treebtn" aria-label="Drzewo – pokołysz"></button>' + leafHtml +
    '<svg class="hs-ropes" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    '<g stroke="#a8946f" stroke-width="3" stroke-linecap="round"><line class="hs-rl" x1="' + (PX - ROPE_X) + '" y1="' + (PY + 2) + '" x2="' + (PX - ROPE_X) + '" y2="' + (PY + ROPE + 2) + '"/>' +
    '<line class="hs-rr" x1="' + (PX + ROPE_X) + '" y1="' + (PY + 2) + '" x2="' + (PX + ROPE_X) + '" y2="' + (PY + ROPE + 2) + '"/></g>' +
    '<circle cx="' + (PX - ROPE_X) + '" cy="' + (PY + 3) + '" r="3.5" fill="#8f7fd1"/><circle cx="' + (PX + ROPE_X) + '" cy="' + (PY + 3) + '" r="3.5" fill="#8f7fd1"/></svg>' +
    '<div class="hs-swing">' + swingSvg() +
    '<button type="button" class="hs-seat" aria-label="Huśtawka – pchnij"></button>' +
    '<button type="button" class="hs-an" aria-label="' + def.name + ' – pchnij i pomachaj">' + figure(def) + '</button></div></div>';
  container.appendChild(root);

  var board: any = root.querySelector('.hs-board');
  var crownG: any = root.querySelector('.hs-crown');
  var treeBtn: any = root.querySelector('.hs-treebtn');
  var swing: any = root.querySelector('.hs-swing');
  var swingBg: any = swing.querySelector('svg');
  var ropeL: any = root.querySelector('.hs-rl'), ropeR: any = root.querySelector('.hs-rr');
  var seat: any = root.querySelector('.hs-seat');
  var an: any = root.querySelector('.hs-an');
  var anSvg: any = an.querySelector('svg');
  var paw: any = an.querySelector('.hs-paw');
  var leafEls: any = root.querySelectorAll('.hs-leaf');
  var k: any = 1, bw: any = 56, bh: any = 80;
  var amp: any = 0, target: any = 0, phase: any = 0, theta: any = 0;
  var swayT: any = -1, waveT: any = 0, sinceLeaf: any = LEAF_GAP;
  var leaves: any = [];
  var raf: any = 0, last: any = 0;

  function push(wave?: any) {
    if (amp < 0.01 && target < 0.01) { phase = 0; }
    target = Math.min(MAX_AMP, target + STEP);
    if (wave) { waveT = WAVE_T; }
    start();
  }
  seat.addEventListener('click', function () { push(false); });
  an.addEventListener('click', function () { push(true); });
  treeBtn.addEventListener('click', function () { swayT = 0; start(); });

  function spawnLeaf(el?: any) {
    leaves.push({ el: el, t: 0, dur: 5 + Math.random() * 2, x0: 40 + Math.random() * 120, y0: 70 + Math.random() * 50,
      drift: 10 + Math.random() * 26, sw: 8 + Math.random() * 8, ph: Math.random() * 6.28, rot: 40 + Math.random() * 80 });
    el.style.display = '';
  }

  function frame(now?: any) {
    var dt: any = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    var busy: any = false, i: any;

    target = Math.max(0, target - DRAIN * dt);
    amp += (target - amp) * (1 - Math.exp(-EASE * dt));
    if (amp < 0.08 && target <= 0) { amp = 0; theta = 0; phase = 0; }
    else { phase += OMEGA * dt; theta = amp * Math.sin(phase); busy = true; }

    if (swayT >= 0) {
      swayT += dt;
      if (swayT >= SWAY_T) { swayT = -1; } else { busy = true; }
    }
    if (waveT > 0) { waveT = Math.max(0, waveT - dt); if (waveT > 0) { busy = true; } }

    sinceLeaf += dt;
    if (amp > LEAF_AMP && leaves.length < MAX_LEAVES && sinceLeaf >= LEAF_GAP) {
      for (i = 0; i < leafEls.length; i++) {
        if (!leaves.some(function (l?: any) { return l.el === leafEls[i]; })) { spawnLeaf(leafEls[i]); sinceLeaf = 0; break; }
      }
    }
    for (i = leaves.length - 1; i >= 0; i--) {
      leaves[i].t += dt;
      if (leaves[i].t >= leaves[i].dur) { leaves[i].el.style.display = 'none'; leaves.splice(i, 1); }
    }
    if (leaves.length) { busy = true; }

    paint();
    if (busy) { raf = requestAnimationFrame(frame); } else { raf = 0; }
  }

  function paint() {
    swing.style.transform = 'rotate(' + theta.toFixed(2) + 'deg)';
    // Rope tops stay at their fixed points on the branch; the lower ends follow the rotated seat (same pivot and angle as the wrapper).
    var tr: any = theta * Math.PI / 180, cs: any = Math.cos(tr), sn: any = Math.sin(tr), by: any = ROPE + 2;
    ropeL.setAttribute('x2', (PX + (-ROPE_X) * cs - by * sn).toFixed(2)); ropeL.setAttribute('y2', (PY + (-ROPE_X) * sn + by * cs).toFixed(2));
    ropeR.setAttribute('x2', (PX + ROPE_X * cs - by * sn).toFixed(2)); ropeR.setAttribute('y2', (PY + ROPE_X * sn + by * cs).toFixed(2));
    var sw: any = 0, u: any, env: any, ang: any, i: any, l: any, p: any;
    if (swayT >= 0) { u = swayT / SWAY_T; sw = 2.2 * Math.sin(2 * Math.PI * u) * Math.sin(Math.PI * u); }
    crownG.setAttribute('transform', 'rotate(' + sw.toFixed(2) + ' 93 160)');
    if (waveT > 0) {
      u = (WAVE_T - waveT) / WAVE_T;
      env = Math.sin(Math.PI * Math.min(1, u * 1.15));
      ang = Math.sin(u * Math.PI * 2 * 3);
      paw.setAttribute('cx', (21 + 3 * ang * env).toFixed(1));
      paw.setAttribute('cy', (-14 - 22 * env).toFixed(1));
    } else {
      paw.setAttribute('cx', '21'); paw.setAttribute('cy', '-14');
    }
    for (i = 0; i < leaves.length; i++) {
      l = leaves[i]; p = l.t / l.dur;
      var x: any = l.x0 + l.drift * p + l.sw * Math.sin(l.ph + p * 9);
      var y: any = l.y0 + (250 - l.y0) * (0.25 * p + 0.75 * p * p * (3 - 2 * p));
      var op: any = Math.min(1, l.t / 0.6, (l.dur - l.t) / 1.2);
      l.el.style.transform = 'translate(' + (x * k - 9 * k).toFixed(1) + 'px,' + (y * k - 9 * k).toFixed(1) + 'px) rotate(' + (l.rot * p + 25 * Math.sin(l.ph + p * 7)).toFixed(1) + 'deg)';
      l.el.style.opacity = Math.max(0, op).toFixed(2);
    }
  }

  function layout() {
    var w: any = board.clientWidth || window.innerWidth;
    k = w / BW;
    var sw: any = Math.max(56, 100 * k);
    swing.style.width = sw.toFixed(1) + 'px';
    swing.style.height = ((ROPE + 12) * k).toFixed(1) + 'px';
    swing.style.left = (PX * k - sw / 2).toFixed(1) + 'px';
    swing.style.top = (PY * k).toFixed(1) + 'px';
    swingBg.style.width = (100 * k).toFixed(1) + 'px';
    swingBg.style.left = ((sw - 100 * k) / 2).toFixed(1) + 'px';
    var sh: any = Math.max(56, 50 * k);
    seat.style.width = sw.toFixed(1) + 'px';
    seat.style.height = sh.toFixed(1) + 'px';
    seat.style.top = ((ROPE + 4) * k - sh / 2).toFixed(1) + 'px';
    bw = Math.max(56, 60 * k); bh = Math.max(56, 80 * k);
    an.style.width = bw.toFixed(1) + 'px'; an.style.height = bh.toFixed(1) + 'px';
    an.style.left = ((sw - bw) / 2).toFixed(1) + 'px';
    an.style.top = (ROPE * k + 6 * k - bh).toFixed(1) + 'px';
    anSvg.style.width = (60 * k).toFixed(1) + 'px'; anSvg.style.height = (80 * k).toFixed(1) + 'px';
    var tx: any = 12 * k, ty: any = 14 * k;
    treeBtn.style.left = tx.toFixed(1) + 'px'; treeBtn.style.top = ty.toFixed(1) + 'px';
    treeBtn.style.width = (176 * k).toFixed(1) + 'px'; treeBtn.style.height = (262 * k - ty).toFixed(1) + 'px';
    treeBtn.style.clipPath = 'none';
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

export default function HustawkaActivity() {
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
