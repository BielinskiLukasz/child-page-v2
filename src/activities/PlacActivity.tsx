// Activity "Plac Budowy": a building site with 4 machines (crane, concrete mixer, roller, dump truck). The child taps (or presses Enter/Space on)
// a machine and it does its job in a short animation; every use plays a slightly different variant (3 variants per machine). The first time each
// DIFFERENT machine finishes its effect the little house grows one stage (foundation, walls, roof, finished house with a flag), so the stage
// equals the number of different machines used (1-4), in any order. A finished house glows 3 s while a child and a dog wave, and after 4 s the
// site resets with a new house colour. Operating a machine while it works restarts it smoothly (poses are blended). Nothing can fail.
// Keyboard: arrows select a machine, Enter/Space operates it. One capped-dt rAF loop drives every pose from JS (final states are never only in a
// CSS keyframe), paused while hidden and stopped when idle. Nothing is scored or stored.
// Usage metrics: track('interaction', {variant: 'crane' | 'mixer' | 'roller' | 'truck'}) per operation; the activity stays open-ended
// (the house resets by itself), so complete() is not called.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';

var NS: any = 'http://www.w3.org/2000/svg';
var HOUSE_COLORS: any = [['#f7a8c9', '#c25b87'], ['#a8d8f0', '#4f86b5'], ['#ffd98a', '#c9832a'], ['#b6e0aa', '#5a9a4c'], ['#c9b8f2', '#7a61c0']];
var GLOW_S: any = 3, RESET_S: any = 4, BLEND_S: any = 0.2, GROW_S: any = 0.5, EFFECT_AT: any = 0.4;
var DUR: any = { crane: 1.8, mixer: 1.6, roller: 1.8, truck: 1.7 };
var ORDER: any = ['crane', 'mixer', 'roller', 'truck'];
var LABELS: any = { crane: 'Dźwig', mixer: 'Betoniarka', roller: 'Walec', truck: 'Wywrotka' };

function clamp(v?: any, a?: any, b?: any) { return v < a ? a : v > b ? b : v; }
function ease(t?: any) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function bump(p?: any) { return Math.sin(Math.PI * clamp(p, 0, 1)); }
function report(fn?: any) { try { if (Analytics) { fn(Analytics); } } catch (e: any) { /* metrics must never break the activity */ } }
function el(tag?: any, attrs?: any, parent?: any) {
  var n: any = document.createElementNS(NS, tag), k: any;
  for (k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) { n.setAttribute(k, attrs[k]); } }
  if (parent) { parent.appendChild(n); }
  return n;
}
function reduced() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e: any) { return false; } }

// ---- machine pictures (viewBox 0 0 100 80) and their poses ---------------------------------------------------------------
function buildCrane(svg?: any) {
  var n: any = {};
  el('rect', { x: 0, y: 70, width: 100, height: 10, fill: '#cfa97b' }, svg);
  el('rect', { x: 8, y: 64, width: 36, height: 7, rx: 2, fill: '#4b4766' }, svg);
  el('path', { d: 'M20 64L26 20H32L38 64Z', fill: '#f4b942', stroke: '#c98a1f', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, svg);
  el('path', { d: 'M23 50H35M24 38H34M25 28H33', stroke: '#c98a1f', 'stroke-width': 1.5 }, svg);
  el('rect', { x: 10, y: 14, width: 84, height: 6, rx: 2, fill: '#f4b942', stroke: '#c98a1f', 'stroke-width': 1.5 }, svg);
  el('rect', { x: 12, y: 8, width: 12, height: 8, rx: 2, fill: '#8d8aa3' }, svg);
  n.trolley = el('g', {}, svg);
  el('rect', { x: -4, y: 20, width: 8, height: 4, rx: 1.5, fill: '#5b5675' }, n.trolley);
  n.rope = el('line', { x1: 0, y1: 24, x2: 0, y2: 40, stroke: '#5b5675', 'stroke-width': 1.5 }, n.trolley);
  n.beamG = el('g', {}, n.trolley);
  n.beam = el('rect', { x: -13, y: -2.5, width: 26, height: 5, rx: 1.5, fill: '#e8605a', stroke: '#5b5675', 'stroke-width': 1 }, n.beamG);
  el('path', { d: 'M-6 -2.5L0 -8L6 -2.5', fill: 'none', stroke: '#5b5675', 'stroke-width': 1.3 }, n.beamG);
  return n;
}
var BEAM_COLORS: any = ['#e8605a', '#4f9fd8', '#8fbf5a'];
function poseCrane(p?: any, v?: any) {
  var amp: any = [24, 30, 20][v], hold: any = [14, 18, 11][v], ltr: any = [1, -1, 1][v];
  var up: any = ease(p / 0.3) * (1 - ease((p - 0.7) / 0.3));
  return [70 - amp * bump(p) * (v === 2 ? 0.6 : 1), 40 - (40 - hold) * up, ltr * 7 * bump(p) * Math.sin(p * Math.PI * (2 + v)) * bump(p)];
}
function drawCrane(n?: any, a?: any, v?: any) {
  n.trolley.setAttribute('transform', 'translate(' + a[0].toFixed(2) + ' 0)');
  n.rope.setAttribute('y2', (24 + a[1] - 4).toFixed(2));
  n.beamG.setAttribute('transform', 'translate(0 ' + (24 + a[1]).toFixed(2) + ') rotate(' + a[2].toFixed(2) + ')');
  n.beam.setAttribute('fill', BEAM_COLORS[v]);
}

function buildMixer(svg?: any) {
  var n: any = {};
  el('rect', { x: 0, y: 70, width: 100, height: 10, fill: '#cfa97b' }, svg);
  n.puddle = el('ellipse', { cx: 90, cy: 69, rx: 0, ry: 0, fill: '#b9b4c8' }, svg);
  n.stream = el('rect', { x: 87, y: 52, width: 6, height: 0, rx: 2, fill: '#b9b4c8' }, svg);
  el('rect', { x: 4, y: 52, width: 62, height: 8, rx: 3, fill: '#4b4766' }, svg);
  el('rect', { x: 52, y: 36, width: 24, height: 20, rx: 4, fill: '#4f9fd8' }, svg);
  el('rect', { x: 58, y: 40, width: 12, height: 9, rx: 2, fill: '#dff1fb' }, svg);
  [16, 36, 62].forEach(function (cx?: any) { el('circle', { cx: cx, cy: 62, r: 7, fill: '#4b4766' }, svg); el('circle', { cx: cx, cy: 62, r: 3, fill: '#c9c4dc' }, svg); });
  n.chute = el('path', { d: 'M12 36L2 50L10 54L20 42Z', fill: '#8d8aa3', stroke: '#5b5675', 'stroke-width': 1 }, svg);
  n.drum = el('g', {}, svg);
  el('path', { d: 'M8 38Q8 22 28 20Q46 22 46 38L42 52H12Z', fill: '#f4b942', stroke: '#c98a1f', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, n.drum);
  el('path', { d: 'M12 44L44 34M10 36L40 26M16 51L46 42', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.7 }, n.drum);
  return n;
}
var CONC_COLORS: any = ['#b9b4c8', '#c9b79a', '#a9c2c9'];
function poseMixer(p?: any, v?: any) {
  var turns: any = [2, 3, 1.5][v] * (v === 1 ? -1 : 1);
  var pour: any = bump(clamp((p - 0.3) / 0.5, 0, 1)), puddle: any = pour * (1 - ease((p - 0.8) / 0.2));
  return [turns * 360 * ease(p), [8, 14, 4][v] * bump(p), pour, puddle];
}
function drawMixer(n?: any, a?: any, v?: any) {
  var c: any = CONC_COLORS[v];
  n.drum.setAttribute('transform', 'rotate(' + a[0].toFixed(1) + ' 27 42)');
  n.chute.setAttribute('transform', 'rotate(' + a[1].toFixed(2) + ' 14 40)');
  n.stream.setAttribute('height', (a[2] * 17).toFixed(2)); n.stream.setAttribute('fill', c);
  n.puddle.setAttribute('rx', (a[3] * 11).toFixed(2)); n.puddle.setAttribute('ry', (a[3] * 3).toFixed(2)); n.puddle.setAttribute('fill', c);
}

function buildRoller(svg?: any) {
  var n: any = {};
  el('rect', { x: 0, y: 70, width: 100, height: 10, fill: '#cfa97b' }, svg);
  el('rect', { x: 4, y: 64, width: 92, height: 8, rx: 3, fill: '#d6c5a5' }, svg);
  for (var i: any = 0; i < 9; i++) { el('circle', { cx: 9 + i * 10, cy: 66 + (i % 2) * 2.5, r: 2.2, fill: '#b59e78' }, svg); }
  n.flat = el('rect', { x: 4, y: 64, width: 0, height: 8, rx: 3, fill: '#8d8aa3', opacity: 1 }, svg);
  n.body = el('g', {}, svg);
  el('rect', { x: 4, y: 40, width: 40, height: 14, rx: 4, fill: '#f4b942', stroke: '#c98a1f', 'stroke-width': 1.5 }, n.body);
  el('rect', { x: 22, y: 26, width: 18, height: 16, rx: 3, fill: '#f9cf6a', stroke: '#c98a1f', 'stroke-width': 1.5 }, n.body);
  el('rect', { x: 25, y: 29, width: 10, height: 8, rx: 1.5, fill: '#dff1fb' }, n.body);
  el('path', { d: 'M8 54H44V58H8Z', fill: '#4b4766' }, n.body);
  n.big = el('g', {}, n.body);
  el('circle', { cx: 18, cy: 58, r: 13, fill: '#8d8aa3', stroke: '#5b5675', 'stroke-width': 1.5 }, n.big);
  el('path', { d: 'M18 58L18 46M18 58L29 64M18 58L7 64', stroke: '#5b5675', 'stroke-width': 1.5 }, n.big);
  n.small = el('g', {}, n.body);
  el('circle', { cx: 38, cy: 63, r: 7, fill: '#4b4766' }, n.small);
  el('circle', { cx: 38, cy: 63, r: 3, fill: '#c9c4dc' }, n.small);
  return n;
}
var ROAD_COLORS: any = ['#8d8aa3', '#7f9a86', '#a08f7a'];
function poseRoller(p?: any, v?: any) {
  var run: any = [38, 44, 30][v], x: any = run * bump(p);
  var shake: any = [0.6, 1.0, 0.3][v] * Math.sin(p * 60) * bump(p);
  return [x, shake, run * bump(Math.min(p, 0.5)), 1 - ease((p - 0.8) / 0.2)];
}
function drawRoller(n?: any, a?: any, v?: any) {
  n.body.setAttribute('transform', 'translate(' + a[0].toFixed(2) + ' ' + a[1].toFixed(2) + ')');
  var rot: any = a[0] * 4.4;
  n.big.setAttribute('transform', 'rotate(' + rot.toFixed(1) + ' 18 58)');
  n.small.setAttribute('transform', 'rotate(' + (rot * 1.8).toFixed(1) + ' 38 63)');
  n.flat.setAttribute('width', clamp(a[2] + 30, 0, 92).toFixed(2)); n.flat.setAttribute('opacity', a[3].toFixed(3));
  n.flat.setAttribute('fill', ROAD_COLORS[v]);
  if (a[2] < 0.5) { n.flat.setAttribute('width', 0); }
}

function buildTruck(svg?: any) {
  var n: any = {};
  el('rect', { x: 0, y: 70, width: 100, height: 10, fill: '#cfa97b' }, svg);
  n.heap = el('path', { d: 'M0 70', fill: '#e6c98a', stroke: '#d3b273', 'stroke-width': 1 }, svg);
  el('rect', { x: 20, y: 52, width: 64, height: 8, rx: 3, fill: '#4b4766' }, svg);
  var cab: any = el('path', { d: 'M62 52V30H74L84 40V52Z', fill: '#e8605a', stroke: '#a83d38', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, svg);
  cab.setAttribute('class', 'pb-cab');
  el('path', { d: 'M66 33H73L80 40H66Z', fill: '#dff1fb' }, svg);
  n.bed = el('g', {}, svg);
  el('path', { d: 'M14 28H60L56 50H18Z', fill: '#8a8099', stroke: '#5b5675', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, n.bed);
  n.sand = el('path', { d: 'M18 34Q38 26 56 34L55 40H19Z', fill: '#e6c98a' }, n.bed);
  n.fall = el('rect', { x: 8, y: 52, width: 5, height: 0, rx: 2, fill: '#e6c98a' }, svg);
  [[30, 62], [72, 62]].forEach(function (c?: any) { el('circle', { cx: c[0], cy: c[1], r: 8, fill: '#4b4766' }, svg); el('circle', { cx: c[0], cy: c[1], r: 3.5, fill: '#c9c4dc' }, svg); });
  return n;
}
var SAND_COLORS: any = ['#e6c98a', '#d9a86a', '#f0d8a0'];
function poseTruck(p?: any, v?: any) {
  var amp: any = [34, 42, 28][v], tilt: any = amp * ease(p / 0.3) * (1 - ease((p - 0.72) / 0.28));
  var out: any = clamp((tilt / amp - 0.55) / 0.45, 0, 1);
  var heap: any = ease((p - 0.4) / 0.35) * [1, 1.25, 0.8][v] * (1 - ease((p - 0.85) / 0.15));
  return [tilt, out * (1 - ease((p - 0.7) / 0.1)), heap];
}
function drawTruck(n?: any, a?: any, v?: any) {
  var c: any = SAND_COLORS[v];
  n.bed.setAttribute('transform', 'rotate(' + (-a[0]).toFixed(2) + ' 16 50)');
  n.sand.setAttribute('transform', 'translate(' + (-8 * a[0] / 34).toFixed(2) + ' ' + (a[0] * 0.5).toFixed(2) + ')');
  n.sand.setAttribute('fill', c);
  n.fall.setAttribute('height', (a[1] * 18).toFixed(2)); n.fall.setAttribute('y', 50); n.fall.setAttribute('fill', c);
  var h: any = a[2] * 12;
  n.heap.setAttribute('d', h < 0.3 ? 'M0 70' : 'M2 70Q10 ' + (70 - h) + ' 18 70Z');
  n.heap.setAttribute('fill', c);
}
var MACH: any = {
  crane: { build: buildCrane, pose: poseCrane, draw: drawCrane },
  mixer: { build: buildMixer, pose: poseMixer, draw: drawMixer },
  roller: { build: buildRoller, pose: poseRoller, draw: drawRoller },
  truck: { build: buildTruck, pose: poseTruck, draw: drawTruck }
};

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var root: any = document.createElement('div');
  root.className = 'pb';
  var sky: any = document.createElement('div');
  sky.className = 'pb-sky';
  root.appendChild(sky);
  var houseSvg: any = el('svg', { 'class': 'pb-house', 'aria-hidden': 'true', viewBox: '0 0 200 150' });
  houseSvg.style.position = 'absolute';
  root.appendChild(houseSvg);

  // ---- house (viewBox 200x150, ground at y = 128) -------------------------------------------------------------------
  var defs: any = el('defs', {}, houseSvg);
  var grad: any = el('radialGradient', { id: 'pb-glow' }, defs);
  el('stop', { offset: '0', 'stop-color': '#fff6b0', 'stop-opacity': 0.95 }, grad);
  el('stop', { offset: '1', 'stop-color': '#fff6b0', 'stop-opacity': 0 }, grad);
  el('rect', { x: 0, y: 128, width: 200, height: 22, fill: '#a9d98f' }, houseSvg);
  var glow: any = el('circle', { cx: 100, cy: 84, r: 96, fill: 'url(#pb-glow)', opacity: 0 }, houseSvg);
  var gFound: any = el('g', {}, houseSvg), gWalls: any = el('g', {}, houseSvg), gRoof: any = el('g', {}, houseSvg), gFlag: any = el('g', {}, houseSvg);
  el('rect', { x: 26, y: 120, width: 148, height: 10, rx: 2, fill: '#b9b4c8', stroke: '#8d8aa3', 'stroke-width': 1.5 }, gFound);
  el('path', { d: 'M40 125H70M96 125H130M150 125H164', stroke: '#8d8aa3', 'stroke-width': 1.5 }, gFound);
  var wallR: any = el('rect', { x: 38, y: 70, width: 124, height: 50, fill: '#f7a8c9', stroke: '#c25b87', 'stroke-width': 1.5 }, gWalls);
  el('rect', { x: 88, y: 88, width: 24, height: 32, rx: 3, fill: '#8d6847' }, gWalls);
  el('circle', { cx: 106, cy: 105, r: 2, fill: '#ffe08a' }, gWalls);
  el('rect', { x: 50, y: 82, width: 24, height: 20, rx: 2, fill: '#dff1fb', stroke: '#fff', 'stroke-width': 2 }, gWalls);
  el('rect', { x: 126, y: 82, width: 24, height: 20, rx: 2, fill: '#dff1fb', stroke: '#fff', 'stroke-width': 2 }, gWalls);
  var roofP: any = el('path', { d: 'M28 74L100 26L172 74Z', fill: '#c25b87', stroke: '#8f3f63', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, gRoof);
  el('rect', { x: 140, y: 34, width: 12, height: 26, fill: '#a8683f' }, gRoof);
  el('line', { x1: 100, y1: 26, x2: 100, y2: 4, stroke: '#5b5675', 'stroke-width': 2 }, gFlag);
  el('path', { d: 'M100 4L124 10L100 17Z', fill: '#e8605a' }, gFlag);
  var gKid: any = el('g', {}, houseSvg), gDog: any = el('g', {}, houseSvg);
  el('circle', { cx: 12, cy: 96, r: 6, fill: '#f3d2b3' }, gKid);
  el('circle', { cx: 10, cy: 95, r: 1, fill: '#5b5675' }, gKid); el('circle', { cx: 14, cy: 95, r: 1, fill: '#5b5675' }, gKid);
  el('path', { d: 'M9.5 98.5Q12 101 14.5 98.5', fill: 'none', stroke: '#5b5675', 'stroke-width': 1, 'stroke-linecap': 'round' }, gKid);
  el('rect', { x: 6, y: 103, width: 12, height: 17, rx: 4, fill: '#4f9fd8' }, gKid);
  var kidArm: any = el('line', { x1: 17, y1: 106, x2: 24, y2: 96, stroke: '#f3d2b3', 'stroke-width': 3, 'stroke-linecap': 'round' }, gKid);
  el('rect', { x: 164, y: 108, width: 22, height: 10, rx: 5, fill: '#e8c27a' }, gDog);
  el('rect', { x: 166, y: 114, width: 4, height: 8, rx: 2, fill: '#e8c27a' }, gDog); el('rect', { x: 180, y: 114, width: 4, height: 8, rx: 2, fill: '#e8c27a' }, gDog);
  el('circle', { cx: 163, cy: 106, r: 7, fill: '#e8c27a' }, gDog);
  el('ellipse', { cx: 158, cy: 108, rx: 4, ry: 3, fill: '#f3dcab' }, gDog);
  el('circle', { cx: 161, cy: 104, r: 1.2, fill: '#5b5675' }, gDog);
  el('path', { d: 'M159 109Q161 111 163 109', fill: 'none', stroke: '#5b5675', 'stroke-width': 1, 'stroke-linecap': 'round' }, gDog);
  el('ellipse', { cx: 168, cy: 102, rx: 2.5, ry: 5, fill: '#c9a05a' }, gDog);
  var tail: any = el('line', { x1: 185, y1: 110, x2: 193, y2: 102, stroke: '#e8c27a', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, gDog);

  // ---- machine buttons ----------------------------------------------------------------------------------------------
  var machines: any = {};
  ORDER.forEach(function (id?: any) {
    var btn: any = document.createElement('button');
    btn.type = 'button'; btn.className = 'pb-m pb-m-' + id;
    btn.setAttribute('aria-label', LABELS[id] + '. Enter lub spacja uruchamia maszynę.');
    var svg: any = el('svg', { 'class': 'pb-msvg', 'aria-hidden': 'true', viewBox: '0 0 100 80' });
    var nodes: any = MACH[id].build(svg);
    btn.appendChild(svg);
    root.appendChild(btn);
    machines[id] = { id: id, btn: btn, nodes: nodes, uses: 0, variant: 0, t: -1, dur: DUR[id], counted: true, blend: 1, from: null, cur: null };
    machines[id].cur = MACH[id].pose(0, 0);
    MACH[id].draw(nodes, machines[id].cur, 0);
  });
  container.appendChild(root);

  // ---- state ----------------------------------------------------------------------------------------------------
  var W: any = 320, H: any = 568, selected: any = 0;
  var used: any = {}, usedN: any = 0, shown: any = [0, 0, 0, 0], colorI: any = 0, phase: any = 'build', phaseT: any = 0, glowV: any = 0, waveV: any = 0, waveT: any = 0, recolor: any = false;
  var alive: any = true, raf: any = 0, last: any = 0;

  function setHouseColor() {
    var c: any = HOUSE_COLORS[colorI % HOUSE_COLORS.length];
    wallR.setAttribute('fill', c[0]); wallR.setAttribute('stroke', c[1]);
    roofP.setAttribute('fill', c[1]);
  }
  function layout() {
    var r: any = root.getBoundingClientRect();
    W = r.width || window.innerWidth || 320; H = r.height || window.innerHeight || 568;
    var portrait: any = H >= W, pad: any = 8, gap: any = 8, bw: any, bh: any, cols: any = portrait ? 2 : 4, rows: any = portrait ? 2 : 1;
    bw = Math.min(Math.floor((W - 2 * pad - (cols - 1) * gap) / cols), 230);
    bh = Math.round(bw * 0.8);
    var maxBh: any = Math.floor((H * (portrait ? 0.46 : 0.42) - (rows - 1) * gap) / rows);
    if (bh > maxBh) { bh = Math.max(maxBh, 72); bw = Math.max(Math.min(bw, Math.round(bh / 0.8)), 72); bh = Math.round(bw * 0.8); }
    var gridW: any = cols * bw + (cols - 1) * gap, gx: any = Math.round((W - gridW) / 2), gyTop: any = H - pad - (rows * bh + (rows - 1) * gap);
    ORDER.forEach(function (id?: any, i?: any) {
      var m: any = machines[id], c: any = i % cols, rw: any = Math.floor(i / cols), st: any = m.btn.style;
      st.width = bw + 'px'; st.height = bh + 'px';
      st.left = (gx + c * (bw + gap)) + 'px'; st.top = (gyTop + rw * (bh + gap)) + 'px';
    });
    var availH: any = Math.max(gyTop - pad * 2, 80), availW: any = W - 2 * pad, hw: any = Math.min(availW, availH * 200 / 150, 700), hh: any = hw * 150 / 200;
    houseSvg.style.width = hw + 'px'; houseSvg.style.height = hh + 'px';
    houseSvg.style.left = Math.round((W - hw) / 2) + 'px'; houseSvg.style.top = Math.round(pad + (availH - hh) / 2) + 'px';
  }

  // ---- logic ----------------------------------------------------------------------------------------------------
  function operate(id?: any) {
    var m: any = machines[id];
    m.from = m.cur.slice(); m.blend = reduced() ? 1 : 0;
    m.variant = m.uses % 3; m.uses++;
    m.t = 0; m.counted = false; m.dur = DUR[id] * (reduced() ? 0.5 : 1);
    report(function (A?: any) { A.track('interaction', { variant: id }); });
    start();
  }
  function addUse(id?: any) {
    if (phase !== 'build' || used[id]) { return; }
    used[id] = true; usedN++;
    if (usedN >= 4) { phase = 'glow'; phaseT = 0; }
  }
  function resetSite() {
    used = {}; usedN = 0; phase = 'build'; phaseT = 0; recolor = true; colorI = (colorI + 1 + Math.floor(Math.random() * (HOUSE_COLORS.length - 1))) % HOUSE_COLORS.length;
  }
  function step(dt?: any) {
    ORDER.forEach(function (id?: any) {
      var m: any = machines[id], target: any, a: any;
      if (m.t >= 0) {
        m.t += dt;
        var p: any = clamp(m.t / m.dur, 0, 1);
        if (!m.counted && p >= EFFECT_AT) { m.counted = true; addUse(id); }
        target = MACH[id].pose(p, m.variant);
        if (m.t >= m.dur) { m.t = -1; if (!m.counted) { m.counted = true; addUse(id); } }
      } else { target = MACH[id].pose(0, m.variant); }
      if (m.blend < 1 && m.from) {
        m.blend = Math.min(1, m.blend + dt / BLEND_S); a = ease(m.blend);
        m.cur = target.map(function (v?: any, k?: any) { return m.from[k] + (v - m.from[k]) * a; });
      } else { m.cur = target; }
      MACH[id].draw(m.nodes, m.cur, m.variant);
    });
    var targetStage: any = Math.min(usedN, 4), k: any;
    for (k = 0; k < 4; k++) { shown[k] = approach(shown[k], k < targetStage ? 1 : 0, dt / GROW_S); }
    if (recolor && shown[0] + shown[1] + shown[2] + shown[3] < 1e-3) { recolor = false; setHouseColor(); }
    if (phase === 'glow') {
      phaseT += dt;
      glowV = phaseT < GLOW_S ? Math.min(1, phaseT / 0.4) * (0.75 + 0.25 * Math.sin(phaseT * 5)) : Math.max(0, glowV - dt / 0.4);
      waveV = Math.min(1, waveV + dt / 0.3); waveT += dt;
      if (phaseT >= RESET_S) { phase = 'reset'; }
    } else {
      glowV = Math.max(0, glowV - dt / 0.4); waveV = Math.max(0, waveV - dt / 0.3);
      if (phase === 'reset') { resetSite(); }
    }
  }
  function approach(v?: any, t?: any, d?: any) { return v < t ? Math.min(t, v + d) : Math.max(t, v - d); }
  function render() {
    var parts: any = [gFound, gWalls, gRoof, gFlag], k: any, v: any;
    for (k = 0; k < 4; k++) {
      v = ease(shown[k]);
      parts[k].setAttribute('opacity', v.toFixed(3));
      parts[k].setAttribute('transform', 'translate(0 ' + ((1 - v) * -14).toFixed(2) + ')');
      parts[k].setAttribute('visibility', v < 0.01 ? 'hidden' : 'visible');
    }
    glow.setAttribute('opacity', glowV.toFixed(3));
    gKid.setAttribute('opacity', waveV.toFixed(3)); gDog.setAttribute('opacity', waveV.toFixed(3));
    var wv: any = reduced() ? 0 : Math.sin(waveT * 9);
    kidArm.setAttribute('transform', 'rotate(' + (wv * 22).toFixed(1) + ' 17 106)');
    tail.setAttribute('transform', 'rotate(' + (wv * 18).toFixed(1) + ' 185 110)');
  }
  function busy() {
    var i: any;
    if (recolor) { return true; }
    for (i = 0; i < ORDER.length; i++) { var m: any = machines[ORDER[i]]; if (m.t >= 0 || m.blend < 1) { return true; } }
    for (i = 0; i < 4; i++) { if (Math.abs(shown[i] - (i < usedN ? 1 : 0)) > 1e-3) { return true; } }
    return phase !== 'build' || glowV > 0.001 || waveV > 0.001;
  }
  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min((now - last) / 1000, 0.05); last = now;
    step(dt); render();
    if (alive && !document.hidden && busy() && !raf) { raf = requestAnimationFrame(frame); }
  }
  function start() {
    if (raf || document.hidden || !alive) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() { if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); } }
  function onResize() { layout(); start(); }

  // ---- input ----------------------------------------------------------------------------------------------------
  function select(i?: any) {
    selected = (i + 4) % 4;
    machines[ORDER[selected]].btn.focus();
  }
  ORDER.forEach(function (id?: any, i?: any) {
    var m: any = machines[id];
    m.btn.addEventListener('click', function (e?: any) { selected = i; operate(id); e.preventDefault(); });
    m.btn.addEventListener('focus', function () { selected = i; });
    m.btn.addEventListener('keydown', function (e?: any) {
      var k: any = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') { select(i + 1); e.preventDefault(); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp') { select(i - 1); e.preventDefault(); }
    });
  });
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  setHouseColor();
  layout();
  render();

  return function cleanup() {
    alive = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function PlacActivity() {
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
