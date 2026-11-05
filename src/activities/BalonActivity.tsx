// Activity "Balon": a hot-air balloon with two animals in the basket rests on a meadow under a pastel sky with 4 clouds.
// Touch the balloon -> it rises slowly (drifting sideways) or, in the air, floats gently back down; touch a cloud -> it
// drifts aside by about one cloud width and returns over ~8 s; touch an animal -> it waves once.
// Everything is driven by one rAF loop (capped dt, paused when the tab is hidden), so it also works under the global
// prefers-reduced-motion rule that disables CSS animations. Altitude is a fraction a (0 = on the meadow, 1 = top) and
// its speed only ever changes through a limited acceleration, so there are no jerks.
import { useEffect, useRef } from 'react';

var VA: any = 1 / 15;            // cruise climb / descent speed, altitude fractions per second (top third takes >= 12 s)
var ACC: any = 0.04;             // max change of that speed per second (full speed in ~1.7 s)
var EASE: any = 0.12;            // slow down over the last 12 % of the way up or down
var VMIN: any = 0.006;           // creep speed so the end of the way is actually reached
var DRIFT_T: any = 40;           // seconds for one sideways drift cycle
var GLOW_HZ: any = 0.7;          // glow pulses per second while rising (< 1)
var CLOUD_T: any = 8, WAVE_S: any = 2.8;
var MAX_DT: any = 0.05;

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
  return '<ellipse cx="' + (cx - 12) + '" cy="' + (cy + 17) + '" rx="4.5" ry="5.5" fill="' + fur + '"/>' +
    '<g class="bn-head" data-cx="' + cx + '" data-cy="' + cy + '">' + ears +
    '<circle cx="' + cx + '" cy="' + cy + '" r="14" fill="' + fur + '"/>' +
    '<circle cx="' + (cx - 5) + '" cy="' + (cy - 3) + '" r="1.8" fill="#5b5675"/><circle cx="' + (cx + 5) + '" cy="' + (cy - 3) + '" r="1.8" fill="#5b5675"/>' + nose + '</g>' +
    '<g class="bn-paw" data-px="' + (cx + 12) + '" data-py="' + (cy + 22) + '"><ellipse cx="' + (cx + 12) + '" cy="' + (cy + 17) + '" rx="4.5" ry="5.5" fill="' + fur + '"/></g>';
}

function balloonSvg() {
  return '<svg viewBox="0 0 200 280" aria-hidden="true" focusable="false">' +
    '<path d="M72 168L36 226M128 168L164 226" stroke="#a79bb8" stroke-width="2.5" stroke-linecap="round"/>' +
    '<g class="bn-glow"><ellipse cx="100" cy="178" rx="30" ry="18" fill="#ffe9a8" opacity=".5"/><ellipse cx="100" cy="176" rx="16" ry="10" fill="#fff3c4"/></g>' +
    '<path d="M100 4C38 4 10 52 14 92C18 126 56 150 72 172H128C144 150 182 126 186 92C190 52 162 4 100 4Z" fill="#f7a8c9"/>' +
    '<path d="M100 4C66 28 52 120 72 172H128C148 120 134 28 100 4Z" fill="#fff3b0"/>' +
    '<path d="M100 4C84 40 82 120 90 172H110C118 120 116 40 100 4Z" fill="#a8d8f0"/>' +
    '<rect x="66" y="166" width="68" height="10" rx="5" fill="#cbb9e8"/>' +
    animalSvg('bear', 62, 204) + animalSvg('rabbit', 138, 204) +
    '<rect x="36" y="226" width="128" height="46" rx="12" fill="#d9b48f"/>' +
    '<rect x="36" y="226" width="128" height="9" rx="4.5" fill="#c79d75"/>' +
    '<path d="M44 248H156M44 260H156" stroke="#c79d75" stroke-width="2" stroke-linecap="round"/></svg>';
}

function cloudSvg() {
  return '<svg viewBox="0 0 120 60" aria-hidden="true" focusable="false"><g fill="#fff" fill-opacity=".92"><circle cx="38" cy="36" r="18"/>' +
    '<circle cx="62" cy="28" r="22"/><circle cx="86" cy="37" r="16"/><rect x="24" y="36" width="76" height="17" rx="8.5"/></g></svg>';
}

function mount(container: HTMLElement) {
  var scene: any = document.createElement('div');
  scene.className = 'bn';
  scene.setAttribute('role', 'group');
  scene.setAttribute('aria-label', 'Balon');
  var cl: any = '';
  for (var k: any = 0; k < 4; k++) { cl += '<button class="bn-cloud" type="button" aria-label="Chmurka">' + cloudSvg() + '</button>'; }
  scene.innerHTML = cl +
    '<svg class="bn-land" aria-hidden="true" focusable="false" preserveAspectRatio="none">' +
    '<rect class="bn-hill" fill="#cdeac3"/><rect class="bn-grass" fill="#b6e0aa"/></svg>' +
    '<div class="bn-ball">' + balloonSvg() +
    '<button class="bn-hull" type="button" aria-label="Balon – wznieś się lub opuść"></button>' +
    '<button class="bn-an" type="button" data-i="0" aria-label="Miś w koszu"></button>' +
    '<button class="bn-an" type="button" data-i="1" aria-label="Króliczek w koszu"></button></div>';
  container.appendChild(scene);

  var $: any = function (sel?: any) { return scene.querySelector(sel); };
  var clouds: any = [].slice.call(scene.querySelectorAll('.bn-cloud'));
  var ball: any = $('.bn-ball'), hull: any = $('.bn-hull'), glow: any = $('.bn-glow');
  var abtns: any = [].slice.call(scene.querySelectorAll('.bn-an'));
  var heads: any = [].slice.call(scene.querySelectorAll('.bn-head'));
  var paws: any = [].slice.call(scene.querySelectorAll('.bn-paw'));
  var land: any = $('.bn-land');

  var W: any = 0, H: any = 0, bw: any = 150, bh: any = 216, x0: any = 0, yGround: any = 0, yTop: any = 0, ampX: any = 0;
  var cloudW: any = 140;
  var cloudU: any = [0.12, 0.38, 0.62, 0.88], cloudSpd: any = [1 / 170, 1 / 130, 1 / 200, 1 / 150], cloudY: any = [0.07, 0.19, 0.31, 0.13];
  var cloudT: any = [-1, -1, -1, -1], cloudDir: any = [1, 1, 1, 1];

  var a: any = 0, v: any = 0, mode: any = 'ground';       // mode: 'ground' | 'up' | 'down'
  var ph: any = 0, glowAmt: any = 0, gp: any = 0;
  var waves: any = [-1, -1];
  var raf: any = 0, last: any = 0;

  function layout() {
    W = scene.clientWidth || window.innerWidth;
    H = scene.clientHeight || window.innerHeight;
    bh = Math.max(216, Math.min(380, 0.52 * H, 1.1 * W));
    bw = bh * 200 / 280;
    var gh: any = H * 0.13, gy: any = H - gh;
    land.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var hill: any = $('.bn-hill'), grass: any = $('.bn-grass');
    hill.setAttribute('x', -20); hill.setAttribute('y', gy - gh * 0.25); hill.setAttribute('width', W + 40); hill.setAttribute('height', gh * 0.6 + 20); hill.setAttribute('rx', 40);
    grass.setAttribute('x', -20); grass.setAttribute('y', gy); grass.setAttribute('width', W + 40); grass.setAttribute('height', gh + 20); grass.setAttribute('rx', 20);
    yGround = gy + gh * 0.55 - bh;                    // top of the balloon while the basket rests on the meadow
    yTop = Math.max(24, 0.05 * H);
    if (yTop > yGround) { yTop = yGround; }
    x0 = W / 2;
    ampX = Math.max(0, Math.min(0.28 * W, W / 2 - bw / 2 - 12));
    var s: any = bh / 280;
    ball.style.width = bw.toFixed(1) + 'px';
    ball.style.height = bh.toFixed(1) + 'px';
    hull.style.left = (10 * s).toFixed(1) + 'px'; hull.style.top = (4 * s).toFixed(1) + 'px';
    hull.style.width = (180 * s).toFixed(1) + 'px'; hull.style.height = (268 * s).toFixed(1) + 'px';
    [62, 138].forEach(function (cx?: any, i?: any) {
      abtns[i].style.left = (cx * s - 28).toFixed(1) + 'px';
      abtns[i].style.top = (204 * s - 28).toFixed(1) + 'px';
    });
    cloudW = Math.max(120, Math.min(220, 0.22 * W));
    clouds.forEach(function (c?: any, i?: any) {
      c.style.width = cloudW.toFixed(1) + 'px';
      c.style.height = (cloudW / 2).toFixed(1) + 'px';
      c.style.top = (cloudY[i] * H).toFixed(1) + 'px';
    });
    place();
  }

  function place() {
    var f: any = sm(Math.min(1, a / 0.3));
    var x: any = x0 + ampX * Math.sin(ph) * f;
    x = Math.max(bw / 2 + 4, Math.min(W - bw / 2 - 4, x));
    var y: any = yGround + (yTop - yGround) * a;
    var rot: any = 3 * Math.cos(ph) * f;
    ball.style.transform = 'translate(' + (x - bw / 2).toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + rot.toFixed(2) + 'deg)';
    glow.setAttribute('opacity', (glowAmt * (0.55 + 0.3 * Math.sin(gp))).toFixed(3));
    clouds.forEach(function (c?: any, i?: any) {
      var d: any = cloudT[i] < 0 ? 0 : cloudDir[i] * cloudW * Math.pow(Math.sin(Math.PI * cloudT[i] / CLOUD_T), 2);
      c.style.transform = 'translate(' + (cloudU[i] * (W + cloudW) - cloudW + d).toFixed(1) + 'px,0)';
    });
  }

  // ---- control -------------------------------------------------------------------------------------------------
  function onBalloon() {
    if (a <= 1e-4 && mode !== 'up') { mode = 'up'; return; }
    mode = mode === 'up' ? 'down' : 'up';
  }
  function onCloud(i?: any) {
    if (cloudT[i] >= 0) { return; }
    var cx: any = cloudU[i] * (W + cloudW) - cloudW / 2;
    cloudDir[i] = cx < W / 2 ? 1 : -1;     // drift towards the middle, where there is room
    cloudT[i] = 0;
  }
  function onAnimal(i?: any) { if (waves[i] < 0) { waves[i] = 0; } }

  // ---- loop ----------------------------------------------------------------------------------------------------
  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    last = now;

    var vt: any = 0;
    if (mode === 'up' && a < 1) { vt = Math.max(VMIN, VA * Math.min(1, (1 - a) / EASE)); }
    else if (mode === 'down') { vt = -Math.max(VMIN, VA * Math.min(1, a / EASE)); }
    v += Math.max(-ACC * dt, Math.min(ACC * dt, vt - v));
    a += v * dt;
    if (a >= 1) { a = 1; v = 0; }
    if (a <= 0) { a = 0; v = 0; if (mode === 'down') { mode = 'ground'; } }
    if (a > 0) { ph += dt * 2 * Math.PI / DRIFT_T; }

    var rising: any = mode === 'up' && a < 1 && v > 0.002;
    glowAmt += Math.max(-dt / 1.2, Math.min(dt / 1.2, (rising ? 1 : 0) - glowAmt));
    if (glowAmt > 0) { gp += dt * 2 * Math.PI * GLOW_HZ; }

    heads.forEach(function (h?: any, i?: any) {
      if (waves[i] < 0) { return; }
      var paw: any = paws[i];
      waves[i] += dt;
      var uw: any = waves[i] / WAVE_S, env: any = 0, ang: any = 0;
      if (uw >= 1) { waves[i] = -1; } else { env = Math.sin(Math.PI * uw); ang = -32 * env + 6 * env * Math.sin(2 * Math.PI * uw); }
      var cx: any = h.getAttribute('data-cx'), cy: any = h.getAttribute('data-cy');
      h.setAttribute('transform', env ? 'rotate(' + (3 * env).toFixed(2) + ' ' + cx + ' ' + (+cy + 14) + ')' : '');
      paw.setAttribute('transform', env ? 'rotate(' + ang.toFixed(2) + ' ' + paw.getAttribute('data-px') + ' ' + paw.getAttribute('data-py') + ')' : '');
    });
    clouds.forEach(function (_c?: any, i?: any) {
      cloudU[i] += cloudSpd[i] * dt;
      if (cloudU[i] >= 1) { cloudU[i] -= 1; }
      if (cloudT[i] >= 0) { cloudT[i] += dt; if (cloudT[i] >= CLOUD_T) { cloudT[i] = -1; } }
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
  bind(hull, onBalloon);
  clouds.forEach(function (c?: any, i?: any) { bind(c, function () { onCloud(i); }); });
  abtns.forEach(function (b?: any, i?: any) { bind(b, function () { onAnimal(i); }); });
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

export default function BalonActivity() {
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
