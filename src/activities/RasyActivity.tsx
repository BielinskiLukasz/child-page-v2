// Activity "Rasy Piesków": one dog at a time, drawn large (window.Dogs) with its Polish breed name underneath. Two arrow buttons,
// a horizontal swipe and the arrow keys move to the previous/next breed (random order, each breed once per cycle, wrapping) with a
// 0.5 s cross-fade. The dog is alive: it blinks every 3-5 s, wags gently and every 8-12 s does one idle action (look around,
// sniff, scratch, sit). Touching it (or Enter/Space) plays one 2.5 s action, never the same twice in a row (wag, jump, spin,
// bark with a "Hau!" bubble, roll over, give a paw). Under prefers-reduced-motion an action is only the smile with a soft glow
// and the idle life is just the blink. One capped-dt rAF loop (pauses while hidden); nothing is scored or stored.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';
import { Dogs } from '../utils/dogs';
import { Rand } from '../utils/rand';

var ACT_S: any = 2.5, FADE_MS: any = 500, SWIPE_PX: any = 50;
var TOUCH: any = ['wag', 'jump', 'spin', 'bark', 'roll', 'paw'];
var IDLE: any = ['look', 'sniff', 'scratch', 'sit'];
var IDLE_DUR: any = { look: 2.4, sniff: 2.4, scratch: 3, sit: 3.6 };
var RX: any = 24, RY: any = 92; // pivot of the sit pose: the rear feet

function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
function report(fn?: any) { try { if (Analytics) { fn(Analytics); } } catch (e: any) { /* metrics must never break the activity */ } }
function clamp(v?: any, a?: any, b?: any) { return v < a ? a : v > b ? b : v; }
function smooth(w?: any) { w = clamp(w, 0, 1); return w * w * (3 - 2 * w); }
function rnd(a?: any, b?: any) { return a + Math.random() * (b - a); }
function svgEl(name?: any) { return document.createElementNS('http://www.w3.org/2000/svg', name); }
function wrap(parent?: any, kids?: any, cls?: any) { // moves the child elements into a new <g> placed where the first one was
  var g: any = svgEl('g');
  if (cls) { g.setAttribute('class', cls); }
  parent.insertBefore(g, kids[0]);
  kids.forEach(function (k?: any) { g.appendChild(k); });
  return g;
}
function rot(a?: any, x?: any, y?: any) { return 'rotate(' + a.toFixed(2) + ' ' + x + ' ' + y + ')'; }

// Pure pose of an action at time t (seconds): targets for the sit amount s, paw/rear-leg/head angles, head flip hs (smoothed by
// the renderer) and the direct values tail, ears, dy (jump, viewBox units), scx (spin), roll (degrees).
function pose(kind?: any, t?: any, dir?: any) {
  var p: any = { s: 0, pw: 0, rl: 0, hd: 0, hs: 1, tail: 0, ears: 0, dy: 0, scx: 1, roll: 0, say: false };
  var env: any = Math.sin(Math.PI * clamp(t / ACT_S, 0, 1)), ph: any = 2 * Math.PI * 2.2 * t, w: any;
  switch (kind) {
    case 'wag': p.tail = 18 * env * Math.sin(ph); p.ears = 5 * env * Math.sin(ph * 0.5); break;
    case 'jump': w = clamp((t - 0.5) / 1.5, 0, 1); p.dy = -16 * Math.sin(Math.PI * w); p.tail = 10 * env * Math.sin(ph); break;
    case 'spin': w = clamp((t - 0.2) / 2.1, 0, 1); p.scx = Math.cos(2 * Math.PI * w); p.tail = 8 * env * Math.sin(ph); break;
    case 'bark': p.hd = -8 - 4 * env * Math.sin(2 * Math.PI * 1.2 * t); p.say = t > 0.3 && t < 2.2; p.ears = 4 * env * Math.sin(ph * 0.5); break;
    case 'roll': w = clamp((t - 0.2) / 2.1, 0, 1); p.roll = 360 * smooth(w); break;
    case 'paw': p.s = t < 1.9 ? 1 : 0; p.pw = t > 0.6 && t < 1.9 ? -55 + 8 * Math.sin(2 * Math.PI * 1.5 * (t - 0.6)) : 0; p.tail = 8 * env * Math.sin(ph); break;
    case 'look': if (dir < 0) { p.hs = t > 0.2 && t < 2.2 ? -1 : 1; } else { p.hd = t > 0.2 && t < 2.2 ? -12 : 0; } break;
    case 'sniff': p.hd = t > 0.2 && t < 2.2 ? 26 + 4 * Math.sin(2 * Math.PI * 1.5 * t) : 0; break;
    case 'scratch': w = t > 0.6 && t < 2.4;
      p.s = w ? 0.7 : 0; p.hd = w ? 12 : 0; p.rl = w ? -70 + 10 * Math.sin(2 * Math.PI * 2.5 * (t - 0.6)) : 0; p.ears = w ? 4 * Math.sin(2 * Math.PI * 2.5 * t) : 0; break;
    case 'sit': p.s = t > 0.6 && t < 2.8 ? 1 : 0; break;
  }
  return p;
}

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var root: any = document.createElement('div');
  root.className = 'rp';
  var wrapEl: any = document.createElement('div');
  wrapEl.className = 'rp-wrap';
  root.appendChild(wrapEl);
  function arrow(cls?: any, label?: any, d?: any) {
    var b: any = document.createElement('button');
    b.type = 'button'; b.className = 'rp-arrow ' + cls; b.setAttribute('aria-label', label);
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    root.appendChild(b);
    return b;
  }
  var prevBtn: any = arrow('rp-prev', 'Poprzedni', 'M15 4L7 12L15 20');
  var nextBtn: any = arrow('rp-next', 'Następny', 'M9 4L17 12L9 20');
  container.appendChild(root);

  var order: any = Rand.shuffle(Dogs.LIST), idx: any = 0;
  var cur: any = null, old: any = [], timers: any = [], raf: any = 0, last: any = 0, clock: any = 0, alive: any = true, swiped: any = false;

  function makeView(d?: any) {
    var el: any = document.createElement('div');
    el.className = 'rp-view';
    var btn: any = document.createElement('button');
    btn.type = 'button'; btn.className = 'rp-dog'; btn.setAttribute('aria-label', d.name);
    btn.innerHTML = Dogs.draw(d.id, { scale: 1 });
    var bubble: any = document.createElement('span');
    bubble.className = 'rp-bubble'; bubble.setAttribute('aria-hidden', 'true'); bubble.textContent = 'Hau!';
    btn.appendChild(bubble);
    var label: any = document.createElement('div');
    label.className = 'rp-name'; label.textContent = d.name;
    el.appendChild(btn); el.appendChild(label);
    wrapEl.appendChild(el);

    var svg: any = btn.querySelector('svg'), tfg: any = svg.firstElementChild;
    var q: any = function (s?: any) { return btn.querySelector(s); };
    var tail: any = q('.dg-tail'), ears: any = q('.dg-ears'), headEl: any = q('.dg-head'), legs: any = q('.dg-legs');
    var kids: any = Array.prototype.slice.call(legs.children); // per leg: rect, paw; legs 0-1 are rear, 2-3 front
    var fr: any = kids[6], eyeC: any = headEl.querySelector('circle[r="2"]'), hl: any = eyeC.nextElementSibling, hc: any = headEl.querySelector('circle');
    var v: any = { d: d, el: el, btn: btn, bubble: bubble, calm: q('.dg-calm'), happy: q('.dg-happy'), tail: tail, ears: ears,
      tp: [+tail.getAttribute('data-px'), +tail.getAttribute('data-py')], ep: [+ears.getAttribute('data-px'), +ears.getAttribute('data-py')],
      hp: [+hc.getAttribute('cx'), +hc.getAttribute('cy')], eye: eyeC, hl: hl, ec: [+eyeC.getAttribute('cx'), +eyeC.getAttribute('cy')],
      fp: [+fr.getAttribute('x') + 4, +fr.getAttribute('y')], act: null, blink: 0, blinkT: rnd(3, 5), idleT: rnd(8, 12),
      C: { s: 0, pw: 0, rl: 0, hd: 0, hs: 1 }, idleKind: '' };
    // regroup the parts so each can be posed on its own: [all > [fl (front legs), rot (everything else)]], head + ears, near paw, rear leg
    v.rl = wrap(legs, [kids[2], kids[3]]);
    v.pw = wrap(legs, [kids[6], kids[7]]);
    var frontKids: any = [kids[4], kids[5], v.pw];
    var fl: any = svgEl('g');
    frontKids.forEach(function (k?: any) { fl.appendChild(k); });
    v.headg = wrap(tfg, [headEl, ears]);
    v.rot = wrap(tfg, Array.prototype.slice.call(tfg.children));
    v.all = wrap(tfg, [v.rot]);
    v.all.insertBefore(fl, v.rot);
    v.fl = fl;
    btn.addEventListener('click', function () { touch(v); });
    show(v, false);
    return v;
  }

  function show(v?: any, on?: any) {
    v.happy.setAttribute('display', on ? 'inline' : 'none');
    v.calm.setAttribute('display', on ? 'none' : 'inline');
    v.btn.classList.toggle('rp-on', on);
  }
  function render(v?: any, p?: any, blinkK?: any) {
    var C: any = v.C, a: any = -20 * C.s, ar: any = a * Math.PI / 180, px: any = v.fp[0], py: any = v.fp[1], dx: any = px - RX, dy: any = py - RY;
    var nx: any = RX + dx * Math.cos(ar) - dy * Math.sin(ar), ny: any = RY + dx * Math.sin(ar) + dy * Math.cos(ar);
    v.all.setAttribute('transform', p.dy || p.roll || p.scx !== 1 ? 'translate(0 ' + p.dy.toFixed(2) + ') translate(60 70) rotate(' + p.roll.toFixed(2) + ') scale(' + p.scx.toFixed(3) + ' 1) translate(-60 -70)' : '');
    v.rot.setAttribute('transform', a ? rot(a, RX, RY) : '');
    // front legs stay upright and reach the ground whatever the sit angle
    v.fl.setAttribute('transform', C.s > 0.001 ? 'translate(' + (nx - px).toFixed(2) + ' ' + (ny - py).toFixed(2) + ') translate(' + px + ' ' + py + ') scale(1 ' + ((92 - ny) / (92 - py)).toFixed(3) + ') translate(' + -px + ' ' + -py + ')' : '');
    v.pw.setAttribute('transform', Math.abs(C.pw) > 0.01 ? rot(C.pw, v.fp[0], v.fp[1]) : '');
    v.rl.setAttribute('transform', Math.abs(C.rl) > 0.01 ? rot(C.rl, +v.rl.firstElementChild.getAttribute('x') + 4, +v.rl.firstElementChild.getAttribute('y')) : '');
    v.headg.setAttribute('transform', Math.abs(C.hd) > 0.01 || Math.abs(C.hs - 1) > 0.001 ? 'translate(' + v.hp[0] + ' ' + v.hp[1] + ') rotate(' + C.hd.toFixed(2) + ') scale(' + C.hs.toFixed(3) + ' 1) translate(' + -v.hp[0] + ' ' + -v.hp[1] + ')' : '');
    v.tail.setAttribute('transform', p.tail ? rot(p.tail, v.tp[0], v.tp[1]) : '');
    v.ears.setAttribute('transform', p.ears ? rot(p.ears, v.ep[0], v.ep[1]) : '');
    v.eye.setAttribute('transform', blinkK < 1 ? 'translate(' + v.ec[0] + ' ' + v.ec[1] + ') scale(1 ' + blinkK.toFixed(2) + ') translate(' + -v.ec[0] + ' ' + -v.ec[1] + ')' : '');
    v.hl.setAttribute('display', blinkK < 0.6 ? 'none' : 'inline');
  }
  function reset(v?: any) { // back to the neutral calm pose, immediately
    v.act = null; v.C = { s: 0, pw: 0, rl: 0, hd: 0, hs: 1 };
    show(v, false); v.bubble.classList.remove('rp-say');
    render(v, pose('', 0, 1), 1);
  }

  function touch(v?: any) {
    if (swiped) { swiped = false; return; }
    if (v !== cur || (v.act && v.act.touch)) { return; }
    var r: any = reduced();
    v.act = { kind: r ? 'glow' : Rand.pickOne(TOUCH, 'rasy-touch'), t: 0, dur: ACT_S, touch: true };
    show(v, true);
    report(function (A?: any) { A.track('interaction', { variant: v.d.id }); });
    start();
  }
  function startIdle(v?: any) {
    var k: any = Rand.pickOne(IDLE, 'rasy-idle');
    v.act = { kind: k, t: 0, dur: IDLE_DUR[k], touch: false, dir: Math.random() < 0.5 ? -1 : 1 };
  }
  function update(v?: any, dt?: any) {
    var r: any = reduced(), p: any, A: any = v.act, C: any = v.C;
    v.blinkT -= dt;
    if (v.blinkT <= 0) { v.blink = 0.16; v.blinkT = rnd(3, 5); }
    var bk: any = 1;
    if (v.blink > 0) { v.blink -= dt; bk = 1 - 0.85 * Math.sin(Math.PI * clamp(1 - v.blink / 0.16, 0, 1)); }
    if (A) {
      A.t += dt;
      if (A.t >= A.dur) {
        if (A.touch) { show(v, false); v.bubble.classList.remove('rp-say'); }
        v.act = A = null; v.idleT = rnd(8, 12);
      }
    } else {
      v.idleT -= dt;
      if (v.idleT <= 0) { if (r) { v.idleT = rnd(8, 12); } else { startIdle(v); A = v.act; } }
    }
    p = A && !r ? pose(A.kind, A.t, A.dir) : pose('', 0, 1);
    if (!A && !r) { p.tail = 6 * Math.sin(2 * Math.PI * 1.3 * clock); }
    if (r) { p.tail = 0; }
    var k: any = 1 - Math.exp(-6 * dt);
    C.s += (p.s - C.s) * k; C.pw += (p.pw - C.pw) * k; C.rl += (p.rl - C.rl) * k; C.hd += (p.hd - C.hd) * k; C.hs += (p.hs - C.hs) * k;
    v.bubble.classList.toggle('rp-say', !!p.say);
    render(v, p, bk);
  }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    if (cur) { update(cur, dt); }
    if (alive && !document.hidden) { raf = requestAnimationFrame(frame); }
  }
  function start() {
    if (raf || document.hidden || !alive) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }

  function go(i?: any, fade?: any) {
    var from: any = cur, v: any = makeView(order[i]);
    if (from) {
      reset(from);
      from.el.classList.add('rp-out'); from.btn.tabIndex = -1;
      old.push(from);
      timers.push(setTimeout(function () {
        if (from.el.parentNode) { from.el.parentNode.removeChild(from.el); }
        old.splice(old.indexOf(from), 1);
      }, FADE_MS));
    }
    cur = v; idx = i;
    if (fade) {
      v.el.classList.add('rp-pre');
      void v.el.offsetWidth;
      v.el.classList.remove('rp-pre');
    }
    start();
  }
  function nav(step?: any) {
    go((idx + step + order.length) % order.length, true);
    report(function (A?: any) { A.track('interaction', { variant: cur.d.id }); });
  }
  prevBtn.addEventListener('click', function () { nav(-1); });
  nextBtn.addEventListener('click', function () { nav(1); });

  var sx: any = 0, sy: any = 0, down: any = false;
  function onDown(e?: any) { sx = e.clientX; sy = e.clientY; down = true; swiped = false; }
  function onUp(e?: any) {
    if (!down) { return; }
    down = false;
    var dx: any = e.clientX - sx, dy: any = e.clientY - sy;
    if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > 1.5 * Math.abs(dy)) { swiped = true; nav(dx < 0 ? 1 : -1); }
  }
  function onCancel() { down = false; }
  function onKey(e?: any) {
    if (e.key === 'ArrowLeft') { nav(-1); e.preventDefault(); } else if (e.key === 'ArrowRight') { nav(1); e.preventDefault(); }
  }
  wrapEl.addEventListener('pointerdown', onDown);
  wrapEl.addEventListener('pointerup', onUp);
  wrapEl.addEventListener('pointercancel', onCancel);
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);

  go(0, false);

  return function cleanup() {
    alive = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    timers.forEach(clearTimeout);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function RasyActivity() {
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
