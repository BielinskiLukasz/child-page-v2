// Activity "Mój Dzień": four tiles (sun, bowl, ball, moon) each play a 6 s scene of one random animal's day.
// Tiles can be touched in any order; a touch during a scene restarts it (one scene at a time). A scene counts as seen once
// it has been started; when all four have been seen and the current scene has played to the end, the tiles glow for 3 s while the animal waves, then a new animal and a new set begin.
// All motion comes from one capped-dt rAF loop (poses are pure functions of scene time), so it works under reduced motion.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';
import { Animals } from '../utils/animals';

var DUR: any = 6, FINALE: any = 3, BLEND: any = 0.35, SKY_S: any = 1;
var KINDS: any = ['morning', 'meal', 'play', 'night'];
var LABELS: any = ['Rano', 'Posiłek', 'Zabawa', 'Noc'];
var SKY: any = {
  idle: ['#cfe8f7', '#eef7fd'], morning: ['#b9dff5', '#ffe0bd'], meal: ['#9fd3f3', '#e4f3fb'],
  play: ['#a9d9f0', '#fff0c4'], night: ['#2f3b78', '#6f66ae']
};
var TILE_BG: any = ['#ffe9a8', '#f7c9d6', '#c9e8c0', '#b9b3e0'];
var TILE_SVG: any = [
  '<circle cx="32" cy="32" r="12" fill="#ffb938"/><g stroke="#ffb938" stroke-width="4" stroke-linecap="round"><path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l5.6 5.6M43.4 43.4L49 49M49 15l-5.6 5.6M20.6 43.4L15 49"/></g>',
  '<path d="M10 28h44q0 22-14 24H24Q10 50 10 28z" fill="#e8605a"/><path d="M10 28h44" stroke="#b9423d" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="22" r="5" fill="#c9a05a"/><circle cx="34" cy="19" r="5" fill="#d9b46a"/><circle cx="43" cy="23" r="4.5" fill="#c9a05a"/>',
  '<circle cx="32" cy="32" r="21" fill="#4fa3e0"/><path d="M12 26q20 10 40 0M12 40q20-10 40 0" fill="none" stroke="#fff" stroke-width="4"/><path d="M32 11v42" stroke="#f7d44a" stroke-width="4"/>',
  '<path d="M42 10A22 22 0 1 0 54 42A18 18 0 0 1 42 10z" fill="#ffe9a8" stroke="#e7c76a" stroke-width="2"/><circle cx="48" cy="16" r="2.4" fill="#fff6d0"/><circle cx="54" cy="28" r="1.8" fill="#fff6d0"/>'
];

function report(fn?: any) { try { if (Analytics) { fn(Analytics); } } catch (e: any) { /* metrics must never break the activity */ } }
function clamp(v?: any, a?: any, b?: any) { return v < a ? a : v > b ? b : v; }
function seg(t?: any, a?: any, b?: any) { return clamp((t - a) / (b - a), 0, 1); }
function sm(v?: any) { return v * v * (3 - 2 * v); }
function lerp(a?: any, b?: any, v?: any) { return a + (b - a) * v; }
function hex(c?: any) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5), 16)]; }
function rgb(c?: any) { return typeof c === 'string' ? hex(c) : c; }
function mix(a?: any, b?: any, v?: any) { var x: any = rgb(a), y: any = rgb(b); return [lerp(x[0], y[0], v), lerp(x[1], y[1], v), lerp(x[2], y[2], v)]; }
function css(c?: any) { return 'rgb(' + c.map(Math.round).join(',') + ')'; }
var lastAnimal: any = '';

function newAnimal() {
  var a: any, tries: any = 0;
  do { a = Animals.pick(1)[0]; tries++; } while (a.id === lastAnimal && tries < 8);
  lastAnimal = a.id;
  return a;
}

// Pose of the whole scene at time t (seconds since the scene start); kind -1 = idle, 4 = finale wave.
function pose(kind?: any, t?: any) {
  var p: any = { x: 100, y: 94, sx: 1, sy: 1, hx: 0, hy: 0, hr: 0, eyes: 1, mouth: 0, armL: 0, armR: 0, bed: 0, blanket: 0,
    sunY: 44, sun: 1, moon: 0, stars: 0, ball: 0, bx: 100, by: 104, bowl: 0, food: 1, zzz: 0, zy: 0, night: 0 };
  var e: any, k: any;
  if (kind === 0) {
    e = seg(t, 1, 3);
    k = Math.sin(Math.PI * seg(t, 3.6, 5.6));
    var arms: any = seg(t, 3, 4) * (1 - seg(t, 5, 6));
    p.bed = 1; p.y = 100; p.eyes = seg(t, 1, 2.5); p.sy = lerp(0.82, 1.1, sm(e)) - 0.1 * (1 - seg(t, 5, 6)) * seg(t, 3, 4);
    p.armL = arms * 160; p.armR = arms * 160; p.mouth = k; p.hy = -2 * k;
    p.sunY = lerp(108, 42, sm(seg(t, 0, DUR)));
  } else if (kind === 1) {
    var lean: any = sm(seg(t, 0.4, 1)) * (1 - sm(seg(t, 5.4, 6)));
    var chew: any = Math.abs(Math.sin(Math.PI * (t - 1) / 1.1));
    p.bowl = 1; p.food = 1 - seg(t, 1, 5.4);
    p.hx = 24 * lean; p.hy = lean * (10 + 4 * chew); p.hr = 12 * lean; p.mouth = lean * 0.45 * chew; p.sunY = 30;
  } else if (kind === 2) {
    var calm: any = 1 - sm(seg(t, 5, 6)), hop: any = Math.abs(Math.sin(Math.PI * t / 1.2 + 0.6));
    p.ball = seg(t, 0, 0.4) * (1 - seg(t, 5.6, 6));
    p.bx = 100 + 50 * Math.sin(t * 0.9) * calm;
    p.by = 104 - 46 * Math.abs(Math.sin(Math.PI * t / 1.2)) * calm;
    p.x = 100 + 38 * Math.sin(t * 0.9 - 0.5) * calm;
    p.y = 94 - 6 * hop * calm; p.hr = 10 * Math.cos(t * 0.9 - 0.5) * calm; p.mouth = 0.5 * calm; p.sunY = 48;
    p.armL = 40 * calm * hop; p.armR = 40 * calm * (1 - hop);
  } else if (kind === 3) {
    p.bed = 1; p.y = 100; p.sy = 0.85; p.eyes = 1 - seg(t, 0.8, 2.2); p.blanket = sm(seg(t, 1.5, 3.5));
    p.night = sm(seg(t, 0, 2.5)); p.sun = 1 - seg(t, 0, 2); p.moon = sm(seg(t, 0.5, 3)); p.stars = p.moon;
    p.sunY = lerp(44, 110, seg(t, 0, 2)); p.hr = -8 * seg(t, 1, 2.5); p.hy = 3 * seg(t, 1, 2.5);
    p.zzz = sm(seg(t, 3.5, 4.5)); p.zy = ((t * 7) % 18);
  } else if (kind === 4) {
    p.armR = 140 + 28 * Math.sin(t * 4.5); p.mouth = 0.5;
  }
  return p;
}

function sceneryHtml() {
  return '<svg class="md-svg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
    '<g class="md-sunwrap"><circle r="15" fill="#ffd45a"/><circle r="10" fill="#ffe58a"/></g>' +
    '<g class="md-moonwrap" opacity="0"><path d="M0 -14A14 14 0 1 0 12 12A11.5 11.5 0 0 1 0 -14z" fill="#ffe9a8"/></g>' +
    '<g class="md-stars" opacity="0" fill="#fff6d0"><circle cx="30" cy="22" r="1.6"/><circle cx="62" cy="40" r="1.2"/><circle cx="96" cy="16" r="1.6"/><circle cx="130" cy="38" r="1.2"/><circle cx="20" cy="60" r="1.2"/><circle cx="176" cy="70" r="1.4"/></g>' +
    '<rect x="-300" y="112" width="800" height="200" fill="#a8d8a0"/>' +
    '<rect class="md-dark" x="-300" y="-300" width="800" height="700" fill="#1f2a5c" opacity="0"/>' +
    '<g class="md-bed" opacity="0"><rect x="48" y="104" width="104" height="18" rx="6" fill="#c9a0c0"/><rect x="48" y="98" width="14" height="24" rx="5" fill="#b78fb0"/><rect x="56" y="96" width="30" height="12" rx="6" fill="#fdfbff"/></g>' +
    '<g class="md-ani"></g>' +
    '<g class="md-blanket" opacity="0"><path d="M60 96q40-10 82 2v20q0 5-5 5H65q-5 0-5-5z" fill="#a9c9ef"/><path d="M60 104q40-9 82 0" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/></g>' +
    '<g class="md-bowl" opacity="0"><ellipse cx="146" cy="116" rx="19" ry="5" fill="#000" opacity=".1"/><ellipse class="md-food" cx="146" cy="106" rx="13" ry="7" fill="#c9a05a"/><path d="M127 106h38q0 14-8 15h-22q-8-1-8-15z" fill="#e8605a"/><path d="M127 106h38" stroke="#b9423d" stroke-width="2" stroke-linecap="round"/></g>' +
    '<g class="md-ball" opacity="0"><circle r="8" fill="#4fa3e0"/><path d="M-8 -2q8 4 16 0M-7 4q7-3 14 0" fill="none" stroke="#fff" stroke-width="1.8"/></g>' +
    '<g class="md-zzz" opacity="0" fill="#fff" font-size="9" font-family="sans-serif"><text x="126" y="72" font-weight="bold">z</text><text x="136" y="62" font-size="7" font-weight="bold">z</text></g>' +
    '</svg>';
}

function animalHtml(a?: any) {
  var A: any = Animals, ec: any = A.eyeColor(a.id), pos: any = A.eyes(a.id), open: any = '', shut: any = '';
  pos.forEach(function (p?: any) {
    open += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2" fill="' + ec + '"/>';
    shut += '<path d="M' + (p[0] - 3.2) + ' ' + p[1] + 'q3.2 3 6.4 0"/>';
  });
  return '<g class="md-body"><ellipse cx="0" cy="22" rx="25" ry="18" fill="' + a.fur + '"/>' +
    '<g class="md-arml"><ellipse cx="0" cy="9" rx="5.5" ry="11" fill="' + a.fur + '"/></g>' +
    '<g class="md-armr"><ellipse cx="0" cy="9" rx="5.5" ry="11" fill="' + a.fur + '"/></g></g>' +
    '<g class="md-head"><g transform="scale(1.3)">' + A.head(a.id, { noEyes: true }) +
    '<g class="md-open">' + open + '</g>' +
    '<g class="md-shut" fill="none" stroke="' + ec + '" stroke-width="1.6" stroke-linecap="round" opacity="0">' + shut + '</g>' +
    '<ellipse class="md-mouth" cx="0" cy="9" rx="3.4" ry="0.1" fill="#8a3d4d" opacity="0"/></g></g>';
}

function mount(container: HTMLElement) {
  var root: any = document.createElement('div');
  root.className = 'md';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Mój dzień');
  var sky: any = document.createElement('div');
  sky.className = 'md-sky';
  sky.innerHTML = sceneryHtml();
  root.appendChild(sky);
  var tilesEl: any = document.createElement('div');
  tilesEl.className = 'md-tiles';
  root.appendChild(tilesEl);
  var tiles: any = KINDS.map(function (_kd?: any, i?: any) {
    var b: any = document.createElement('button');
    b.type = 'button';
    b.className = 'md-tile';
    b.setAttribute('aria-label', LABELS[i]);
    b.style.background = TILE_BG[i];
    b.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + TILE_SVG[i] + '</svg>';
    tilesEl.appendChild(b);
    return b;
  });
  container.appendChild(root);

  function q(sel?: any) { return sky.querySelector(sel); }
  var el: any = {
    sun: q('.md-sunwrap'), moon: q('.md-moonwrap'), stars: q('.md-stars'), dark: q('.md-dark'), bed: q('.md-bed'),
    ani: q('.md-ani'), blanket: q('.md-blanket'), bowl: q('.md-bowl'), food: q('.md-food'), ball: q('.md-ball'), zzz: q('.md-zzz')
  };
  var parts: any = {};
  var animal: any = newAnimal();
  function setAnimal(a?: any) {
    animal = a;
    el.ani.innerHTML = animalHtml(a);
    parts = { body: q('.md-body'), head: q('.md-head'), open: q('.md-open'), shut: q('.md-shut'), mouth: q('.md-mouth'),
      arml: q('.md-arml'), armr: q('.md-armr') };
  }
  setAnimal(animal);

  var kind: any = -1, t: any = 0, held: any = false, from: any = null, blendT: any = 1;
  var seen: any = [false, false, false, false];
  var glow: any = 0, glowT: any = 0, pendingNew: any = false;
  var skyFrom: any = SKY.idle, skyTo: any = SKY.idle, skyV: any = 1, skyNow: any = SKY.idle;
  var cur: any = pose(-1, 0);
  var raf: any = 0, last: any = 0;

  function paintSky() {
    skyNow = [mix(skyFrom[0], skyTo[0], sm(skyV)), mix(skyFrom[1], skyTo[1], sm(skyV))];
    sky.style.background = 'linear-gradient(' + css(skyNow[0]) + ',' + css(skyNow[1]) + ')';
  }
  function setOp(g?: any, v?: any) { g.setAttribute('opacity', clamp(v, 0, 1).toFixed(3)); }
  function paint(p?: any) {
    el.sun.setAttribute('transform', 'translate(160 ' + p.sunY.toFixed(2) + ')'); setOp(el.sun, p.sun);
    el.moon.setAttribute('transform', 'translate(160 38)'); setOp(el.moon, p.moon);
    setOp(el.stars, p.stars); setOp(el.dark, p.night * 0.3); setOp(el.bed, p.bed); setOp(el.blanket, p.blanket);
    el.blanket.setAttribute('transform', 'translate(0 ' + ((1 - p.blanket) * 14).toFixed(2) + ')');
    setOp(el.bowl, p.bowl); el.food.setAttribute('ry', (7 * p.food + 0.01).toFixed(3));
    el.food.setAttribute('cy', (112 - 6 * p.food).toFixed(2));
    setOp(el.ball, p.ball); el.ball.setAttribute('transform', 'translate(' + p.bx.toFixed(2) + ' ' + p.by.toFixed(2) + ')');
    setOp(el.zzz, p.zzz); el.zzz.setAttribute('transform', 'translate(0 ' + (-p.zy).toFixed(2) + ')');
    el.ani.setAttribute('transform', 'translate(' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ')');
    parts.body.setAttribute('transform', 'translate(0 ' + (22 * (1 - p.sy)).toFixed(2) + ') scale(1 ' + p.sy.toFixed(3) + ')');
    parts.head.setAttribute('transform', 'translate(' + p.hx.toFixed(2) + ' ' + p.hy.toFixed(2) + ') rotate(' + p.hr.toFixed(2) + ')');
    parts.arml.setAttribute('transform', 'translate(-23 14) rotate(' + p.armL.toFixed(2) + ')');
    parts.armr.setAttribute('transform', 'translate(23 14) rotate(' + (-p.armR).toFixed(2) + ')');
    setOp(parts.open, p.eyes); setOp(parts.shut, 1 - p.eyes);
    parts.mouth.setAttribute('ry', (0.1 + 4.6 * p.mouth).toFixed(3)); setOp(parts.mouth, p.mouth > 0.02 ? 1 : 0);
    cur = p;
  }
  function paintTiles() {
    tiles.forEach(function (b?: any) {
      b.style.boxShadow = glow > 0.001 ? '0 0 ' + (22 * glow).toFixed(1) + 'px ' + (8 * glow).toFixed(1) + 'px rgba(255,205,70,' + (0.9 * glow).toFixed(3) + ')' : '';
      b.style.transform = glow > 0.001 ? 'scale(' + (1 + 0.05 * glow).toFixed(3) + ')' : '';
    });
  }
  function frame() {
    var p: any = pose(kind, Math.min(t, kind === 4 ? FINALE : DUR));
    if (from && blendT < 1) {
      var b: any = sm(blendT);
      Object.keys(p).forEach(function (key?: any) { p[key] = from[key] + (p[key] - from[key]) * b; });
    }
    paint(p); paintSky(); paintTiles();
  }

  function setSky(name?: any) { skyFrom = skyNow; skyTo = SKY[name]; skyV = 0; }

  function startScene(k?: any) {
    if (pendingNew) { pendingNew = false; setAnimal(newAnimal()); }
    from = cur; blendT = 0; kind = k; t = 0; held = false; glowT = 0;
    seen[k] = true;
    setSky(KINDS[k]);
    report(function (A?: any) { A.track('interaction', { variant: KINDS[k] }); });
    kick();
  }
  function sceneDone() {
    if (kind >= 0 && kind <= 3) {
      if (seen.every(Boolean)) {
        seen = [false, false, false, false];
        pendingNew = true;
        from = cur; blendT = 0; kind = 4; t = 0; held = false; glowT = 1;
        setSky('idle');
        report(function (A?: any) { A.complete(); });
        return;
      }
    } else if (kind === 4) {
      glowT = 0;
      setAnimal(newAnimal());
      pendingNew = false;
      from = cur; blendT = 0; kind = -1; t = 0; held = true;
    }
  }

  function step(ts?: any) {
    raf = 0;
    var dt: any = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    if (kind >= 0 && !held) {
      t += dt;
      var limit: any = kind === 4 ? FINALE : DUR;
      if (t >= limit) { t = limit; held = true; frame(); sceneDone(); }
    }
    blendT = Math.min(1, blendT + dt / BLEND);
    skyV = Math.min(1, skyV + dt / SKY_S);
    if (glow !== glowT) { glow = glowT > glow ? Math.min(glowT, glow + dt / 0.6) : Math.max(glowT, glow - dt / 0.8); }
    frame();
    if ((kind >= 0 && !held) || blendT < 1 || skyV < 1 || glow !== glowT) { raf = requestAnimationFrame(step); }
    else { last = 0; }
  }
  function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(step); } }
  function onVis() { last = 0; }
  document.addEventListener('visibilitychange', onVis);

  var handlers: any = tiles.map(function (b?: any, i?: any) {
    var h: any = function () { startScene(i); };
    b.addEventListener('click', h);
    return h;
  });

  frame();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    document.removeEventListener('visibilitychange', onVis);
    tiles.forEach(function (b?: any, i?: any) { b.removeEventListener('click', handlers[i]); });
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function MojdzienActivity() {
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
