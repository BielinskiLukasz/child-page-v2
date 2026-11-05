// Activity "Latarka": a dark pastel room (about 85% dim) explored with a torch. The beam is a soft circle (radius >= 90 px or 18% of the
// shorter side) that follows the finger with a damped lag and a speed cap, so crossing the screen takes at least 1.5 s. Six things hide in the
// dark: three random animals (window.Animals) and three toys, at new random places on every launch and every new room (never the same layout
// twice in a row). An item is lit gradually while more than half of it is inside the beam, stays visible while lit and fades out 2 s after the
// light leaves. A revealed animal waves (a small tilt) and a toy bounces, once per reveal. When all six were revealed at least once the room
// lights up slowly (3 s), then darkens again with a new random arrangement. Keyboard: Tab focuses the room, arrows move the beam by 8% of the
// width, Enter/Space reveals what is under the beam. One capped-dt rAF loop sets every state from JS (nothing lives only in a CSS keyframe);
// it rests while nothing moves or fades and while the tab is hidden, and restarts on input, resize and visibility. Nothing is lit or reported before the first input of a room. Nothing is scored or stored.
// Usage metrics: track('interaction', {variant: item id}) on the first reveal of each item in a room; complete() for each fully lit room.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';
import { Animals } from '../utils/animals';
import { Rand } from '../utils/rand';

var DIM: any = 0.85;                  // darkness alpha outside the beam
var FOLLOW: any = 6;                  // damping rate (1/s)
var CROSS_S: any = 1.6;               // the beam never crosses the screen width faster than this
var LIGHT_S: any = 0.45, HOLD_S: any = 2, FADE_S: any = 0.6;
var GLOW_S: any = 3, DARKEN_S: any = 1.5;
var ACT_S: any = 1.2;                 // wave / bounce length
var KEY_STEP: any = 0.08;             // of the width
var SAMPLES: any = 25;                // points tested per item for the "more than half inside" rule
var TOYS: any = [
  { id: 'pilka', name: 'Piłka', svg: '<circle cx="32" cy="32" r="24" fill="#f7a8c9"/><path d="M10 26q22 10 44 0M10 40q22-10 44 0" fill="none" stroke="#fff" stroke-width="5"/><path d="M20 12q-6 10-2 24" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>' },
  { id: 'klocek', name: 'Klocek', svg: '<path d="M10 22L32 12l22 10v24L32 56 10 46z" fill="#ffd98a"/><path d="M10 22l22 10 22-10M32 32v24" fill="none" stroke="#e0a93e" stroke-width="3" stroke-linejoin="round"/><circle cx="32" cy="22" r="4" fill="#fff" fill-opacity=".7"/>' },
  { id: 'samochod', name: 'Samochodzik', svg: '<rect x="6" y="28" width="52" height="16" rx="7" fill="#4f9fd8"/><path d="M16 28l6-12h20l8 12z" fill="#8cc4ec"/><rect x="24" y="20" width="7" height="8" fill="#e8f4fb"/><rect x="34" y="20" width="7" height="8" fill="#e8f4fb"/><circle cx="18" cy="46" r="7" fill="#5b5675"/><circle cx="46" cy="46" r="7" fill="#5b5675"/><circle cx="18" cy="46" r="3" fill="#dcd8ea"/><circle cx="46" cy="46" r="3" fill="#dcd8ea"/>' },
  { id: 'beben', name: 'Bębenek', svg: '<ellipse cx="32" cy="22" rx="22" ry="8" fill="#f2b8cf"/><path d="M10 22v22q22 14 44 0V22q-22 12-44 0z" fill="#ee6a5f"/><path d="M10 30l11 10 11-10 11 10 11-10" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M40 6l-8 14M24 6l8 14" stroke="#c9a05a" stroke-width="3" stroke-linecap="round"/>' },
  { id: 'gwiazdka', name: 'Gwiazdka', svg: '<path d="M32 6l7.5 16.5 18 2-13.5 12 4 17.5L32 44.5 16 54l4-17.5-13.5-12 18-2z" fill="#ffd54f" stroke="#e0a93e" stroke-width="2.5" stroke-linejoin="round"/>' },
  { id: 'lodka', name: 'Łódeczka', svg: '<path d="M8 40h48q-6 14-20 14H28Q14 54 8 40z" fill="#f08a5d"/><path d="M32 8v32" stroke="#8d6847" stroke-width="3"/><path d="M34 10l16 24H34z" fill="#fdfbff"/><path d="M30 16L18 34h12z" fill="#a8d8f0"/>' }
];
var TOY_BY_ID: any = {};
TOYS.forEach(function (t?: any) { TOY_BY_ID[t.id] = t; });
var lastKey: any = '';                // layout of the previous room (this page session only)

function clamp(v?: any, a?: any, b?: any) { return v < a ? a : v > b ? b : v; }
function ease(t?: any) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function report(fn?: any) { try { if (Analytics) { fn(Analytics); } } catch (e: any) { /* metrics must never break the activity */ } }
function shuffle(list?: any) {
  if (Rand && Rand.shuffle) { return Rand.shuffle(list); }
  var a: any = list.slice(), i: any, j: any, t: any;
  for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function animalSvg(id?: any) {
  return '<svg viewBox="-32 -42 64 74" aria-hidden="true" focusable="false">' + Animals.head(id, { body: true }) + '</svg>';
}
function toySvg(t?: any) { return '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + t.svg + '</svg>'; }

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var root: any = document.createElement('div');
  root.className = 'fl';
  root.tabIndex = 0;
  root.setAttribute('role', 'application');
  root.setAttribute('aria-label', 'Latarka. Strzałki przesuwają światło, Enter lub spacja pokazuje to, co jest w świetle.');
  var items: any = [];                // { id, kind, el, fx, fy, lit, hold, revealed, inside, actT, size }
  var itemLayer: any = document.createElement('div'); itemLayer.className = 'fl-items';
  var dark: any = document.createElement('div'); dark.className = 'fl-dark';
  root.appendChild(dark);
  root.appendChild(itemLayer);
  container.appendChild(root);

  var W: any = 1, H: any = 1, R: any = 90, SZ: any = 64;
  var beam: any = { x: 0, y: 0 }, aim: any = { x: 0, y: 0 };
  var phase: any = 'play', phaseT: any = 0, darkA: any = DIM;
  var pid: any = null, alive: any = true, raf: any = 0, last: any = 0;
  var touched: any = false;           // nothing is lit or reported before the first pointer / key input of a room
  var busy: any = true;               // false when the loop can rest (see step)
  var offs: any = [];                 // sample offsets inside a unit disc
  (function () {
    var i: any, a: any = Math.PI * (3 - Math.sqrt(5));
    for (i = 0; i < SAMPLES; i++) { var r: any = Math.sqrt((i + 0.5) / SAMPLES); offs.push([r * Math.cos(i * a), r * Math.sin(i * a)]); }
  })();

  function dims() {
    var w: any = root.clientWidth || window.innerWidth || 1, h: any = root.clientHeight || window.innerHeight || 1;
    return { w: w, h: h };
  }
  function pos(it?: any) {
    var ax0: any = SZ / 2 + 8, ax1: any = Math.max(ax0, W - SZ / 2 - 8);
    var ay0: any = 64 + SZ / 2, ay1: any = Math.max(ay0, H - SZ / 2 - 8);   // below the Back button row
    return { x: ax0 + it.fx * (ax1 - ax0), y: ay0 + it.fy * (ay1 - ay0) };
  }
  function layout() {
    var d: any = dims(), ow: any = W, oh: any = H;
    W = d.w; H = d.h;
    var m: any = Math.min(W, H);
    R = Math.max(90, 0.18 * m);
    SZ = clamp(m * 0.17, 64, 110);
    if (ow > 1 && oh > 1) { beam.x *= W / ow; beam.y *= H / oh; aim.x *= W / ow; aim.y *= H / oh; }
    else { beam.x = aim.x = W / 2; beam.y = aim.y = H / 2; }
    root.style.setProperty('--fl-r', R + 'px');
    items.forEach(function (it?: any) {
      it.el.style.width = SZ + 'px'; it.el.style.height = SZ + 'px';
      var p: any = pos(it); it.px = p.x; it.py = p.y;
      it.el.style.left = (p.x - SZ / 2) + 'px'; it.el.style.top = (p.y - SZ / 2) + 'px';
    });
  }

  // ---- a new room: 3 animals + 3 toys at random places, never the previous layout --------------------------
  function newRoom() {
    var key: any, ids: any, tries: any = 0, set: any;
    do {
      var animals: any = Animals.pick(3).map(function (a?: any) { return a.id; });
      var toys: any = shuffle(TOYS).slice(0, 3).map(function (t?: any) { return t.id; });
      ids = animals.map(function (a?: any) { return { id: a, kind: 'animal' }; }).concat(toys.map(function (t?: any) { return { id: t, kind: 'toy' }; }));
      set = place(ids);
      key = set.map(function (s?: any) { return s.id + '@' + Math.round(s.fx * 100) + ',' + Math.round(s.fy * 100); }).join('|');
      tries++;
    } while (key === lastKey && tries < 10);
    lastKey = key;
    itemLayer.innerHTML = '';
    items = set.map(function (s?: any) {
      var el: any = document.createElement('div');
      el.className = 'fl-item fl-' + s.kind;
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = s.kind === 'animal' ? animalSvg(s.id) : toySvg(TOY_BY_ID[s.id]);
      el.style.opacity = '0';
      itemLayer.appendChild(el);
      return { id: s.id, kind: s.kind, el: el, fx: s.fx, fy: s.fy, lit: 0, hold: 0, revealed: false, inside: false, actT: -1, px: 0, py: 0 };
    });
    touched = pid !== null;
    layout();
  }
  // Random fractions with a minimum spacing (in item sizes) measured in the current layout; relaxes when the room is small.
  function place(list?: any) {
    var d: any = dims(), w: any = d.w, h: any = d.h, m: any = Math.min(w, h), sz: any = clamp(m * 0.17, 64, 110);
    var ax: any = Math.max(1, w - sz - 16), ay: any = Math.max(1, h - 64 - sz - 16);
    var out: any = [], minD: any = sz * 1.25, i: any, tries: any;
    for (i = 0; i < list.length; i++) {
      var best: any = null, bestD: any = -1;
      for (tries = 0; tries < 60; tries++) {
        var fx: any = Math.random(), fy: any = Math.random(), dmin: any = 1e9, k: any;
        for (k = 0; k < out.length; k++) {
          var dx: any = (fx - out[k].fx) * ax, dy: any = (fy - out[k].fy) * ay;
          dmin = Math.min(dmin, Math.sqrt(dx * dx + dy * dy));
        }
        if (dmin > bestD) { bestD = dmin; best = { fx: fx, fy: fy }; }
        if (dmin >= minD) { break; }
      }
      out.push({ id: list[i].id, kind: list[i].kind, fx: best.fx, fy: best.fy });
    }
    return out;
  }

  // ---- beam and reveal rule ------------------------------------------------------------------------------
  function insideFrac(it?: any, bx?: any, by?: any) {
    var r: any = SZ * 0.45, n: any = 0, i: any, dx: any, dy: any;
    for (i = 0; i < offs.length; i++) {
      dx = it.px + offs[i][0] * r - bx; dy = it.py + offs[i][1] * r - by;
      if (dx * dx + dy * dy <= R * R) { n++; }
    }
    return n / offs.length;
  }
  function setAim(x?: any, y?: any) { touched = true; aim.x = clamp(x, 0, W); aim.y = clamp(y, 0, H); }
  function reveal(it?: any) {
    if (!it.revealed) {
      it.revealed = true;
      report(function (A?: any) { A.track('interaction', { variant: it.id }); });
    }
  }
  function allRevealed() { return items.length > 0 && items.every(function (it?: any) { return it.revealed; }); }

  function step(dt?: any) {
    // the beam: damped follow, capped speed
    var dx: any = aim.x - beam.x, dy: any = aim.y - beam.y, k: any = 1 - Math.exp(-FOLLOW * dt);
    var sx: any = dx * k, sy: any = dy * k, len: any = Math.sqrt(sx * sx + sy * sy), cap: any = (W / CROSS_S) * dt;
    if (len > cap) { sx *= cap / len; sy *= cap / len; }
    beam.x += sx; beam.y += sy;

    // phases
    phaseT += dt;
    if (phase === 'play') {
      darkA = DIM;
      if (allRevealed()) { phase = 'glow'; phaseT = 0; report(function (A?: any) { A.complete(); }); busy = true; }
    } else if (phase === 'glow') {
      darkA = DIM * (1 - ease(phaseT / GLOW_S));
      if (phaseT >= GLOW_S) { darkA = 0; phase = 'darken'; phaseT = 0; newRoom(); }
    } else {                       // darken: the new arrangement fades in with the dark
      darkA = DIM * ease(phaseT / DARKEN_S);
      if (phaseT >= DARKEN_S) { darkA = DIM; phase = 'play'; phaseT = 0; }
    }

    var moving: any = Math.abs(aim.x - beam.x) > 0.3 || Math.abs(aim.y - beam.y) > 0.3;
    busy = phase !== 'play' || moving;
    items.forEach(function (it?: any) {
      var frac: any = insideFrac(it, beam.x, beam.y);
      var inBeam: any = phase === 'play' && touched ? frac > 0.5 : false;
      if (phase === 'glow') { it.lit = 1; it.hold = 0; }
      else if (inBeam) {
        if (it.lit <= 0.02) { it.actT = 0; }          // one friendly action per reveal
        it.lit = Math.min(1, it.lit + dt / LIGHT_S); it.hold = 0;
        if (it.lit >= 0.5) { reveal(it); }
      } else if (it.lit > 0) {
        it.hold += dt;
        if (it.hold > HOLD_S) { it.lit = Math.max(0, it.lit - dt / FADE_S); }
      }
      it.inside = inBeam;
      if (it.actT >= 0 || (inBeam ? it.lit < 1 : it.lit > 0)) { busy = true; }
      if (it.actT >= 0) { it.actT += dt; if (it.actT > ACT_S) { it.actT = -1; } }
      var t: any = it.actT < 0 ? 0 : it.actT / ACT_S, tr: any = '';
      if (it.actT >= 0) {
        if (it.kind === 'animal') { tr = 'rotate(' + (Math.sin(t * Math.PI * 4) * 10 * (1 - t)).toFixed(2) + 'deg)'; }
        else { tr = 'translateY(' + (-Math.abs(Math.sin(t * Math.PI)) * SZ * 0.3).toFixed(1) + 'px)'; }
      }
      it.el.style.transform = tr;
      it.el.style.opacity = String(Math.round(it.lit * 100) / 100);
    });

    root.style.setProperty('--fl-x', beam.x.toFixed(1) + 'px');
    root.style.setProperty('--fl-y', beam.y.toFixed(1) + 'px');
    root.style.setProperty('--fl-a', darkA.toFixed(3));
  }

  function frame(ts?: any) {
    raf = 0;
    if (!alive) { return; }
    var dt: any = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
    last = ts;
    step(dt);
    if (busy && !raf) { raf = requestAnimationFrame(frame); }
  }
  function start() { if (!raf && alive && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }

  // ---- input ---------------------------------------------------------------------------------------------
  function pt(e?: any) { var r: any = root.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function onDown(e?: any) {
    if (pid !== null) { return; }                       // a second finger is ignored
    pid = e.pointerId;
    try { root.setPointerCapture(e.pointerId); } catch (err: any) { /* not supported for synthetic events */ }
    var p: any = pt(e); setAim(p.x, p.y);
    start();
  }
  function onMove(e?: any) {
    if (pid !== null ? e.pointerId !== pid : e.pointerType !== 'mouse') { return; }
    var p: any = pt(e); setAim(p.x, p.y);
  }
  function onUp(e?: any) { if (e.pointerId === pid) { pid = null; } }
  function onKey(e?: any) {
    var k: any = e.key, st: any = KEY_STEP * W;
    if (k === 'Enter' || k === ' ' || k === 'Spacebar') { touched = true; }
    if (k === 'ArrowLeft') { setAim(aim.x - st, aim.y); }
    else if (k === 'ArrowRight') { setAim(aim.x + st, aim.y); }
    else if (k === 'ArrowUp') { setAim(aim.x, aim.y - st); }
    else if (k === 'ArrowDown') { setAim(aim.x, aim.y + st); }
    else if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
      if (phase === 'play') {
        items.forEach(function (it?: any) {
          if (insideFrac(it, aim.x, aim.y) > 0.5) {
            if (it.lit <= 0.02) { it.actT = 0; }
            it.lit = 1; it.hold = 0; reveal(it); busy = true;
          }
        });
      }
    } else { return; }
    e.preventDefault(); start();
  }
  function onResize() { layout(); start(); }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }

  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);
  root.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  layout();
  newRoom();
  step(0);
  start();

  return function cleanup() {
    alive = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    root.removeEventListener('pointerdown', onDown);
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerup', onUp);
    root.removeEventListener('pointercancel', onUp);
    root.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function LatarkaActivity() {
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
