// Activity "Buźki": a big friendly face and a small random animal copy the same calm expression. Touch the face to cycle
// happy -> sleepy -> surprised -> calm (about 1 s of easing); touch the eyes (slow blink), the cheeks (soft pink
// glow) or the mouth (gentle smile or yawn) for about 1.5 s. Touches are ignored while something is changing.
// Only an idle blink every ~5 s happens by itself. No angry/sad/crying faces, no red; expressions differ by the
// shape of eyes and mouth. One capped-dt rAF loop drives everything (so it works under prefers-reduced-motion and
// pauses while the tab is hidden); fixed DOM; nothing is stored.
import { useEffect, useRef } from 'react';
import { Animals } from '../utils/animals';

// ex/ey: eye radii; mw: mouth half-width; ms: smile depth (upper lip); mo: mouth opening.
var EXPR: any = [
  { ex: 6.5, ey: 8, mw: 22, ms: 8, mo: 3 },     // happy: open eyes, wide smile
  { ex: 7, ey: 3.2, mw: 8, ms: -1, mo: 3 },     // sleepy: half-closed eyes, small mouth
  { ex: 9, ey: 12, mw: 9, ms: -8, mo: 16 },     // surprised: round eyes, round mouth
  { ex: 7, ey: 1.3, mw: 14, ms: 5, mo: 0.6 }    // calm: closed eyes, soft smile
];
var SMILE: any = { mw: 20, ms: 8, mo: 2 }, YAWN: any = { mw: 12, ms: 0, mo: 16 };
var CHANGE_S: any = 1, EFFECT_S: any = 1.5, BLINK_S: any = 0.8, IDLE_BLINK_S: any = 5;
var EYE: any = '#5b5675', MOUTH: any = '#8a6a8f';

function lerp(a?: any, b?: any, t?: any) { return a + (b - a) * t; }
function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function bump(u?: any) { return Math.sin(Math.PI * Math.min(1, Math.max(0, u))); }
function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

// kind: 'face' (the big smiley) or a shared animal (js/animals.js) drawn as a smaller head: the animal is scaled so
// its ears stay near the box, and the same eye/cheek/mouth parts are laid over it at the same relative positions.
function headSvg(kind?: any) {
  var animal: any = kind !== 'face', k: any = 1, ec: any = animal ? Animals.eyeColor(kind.id) : EYE; // white eyes on the panda's dark patches
  var base: any = animal
    ? '<g transform="translate(50 58) scale(' + (k = Math.min(0.85, Math.max(0.62, 48 / (kind.top * 2.5)))) * 2.5 + ')">' +
      Animals.head(kind.id, { bare: true }) + '</g>'
    : '<circle cx="50" cy="50" r="46" fill="#ffe9a8"/><path d="M20 28a34 34 0 0 1 20-14" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round"/>';
  var inner: any = '<ellipse class="bz-ch" cx="24" cy="60" rx="9" ry="6" fill="#f7a8c9" opacity=".3"/><ellipse class="bz-ch" cx="76" cy="60" rx="9" ry="6" fill="#f7a8c9" opacity=".3"/>' +
    '<ellipse class="bz-eye" cx="34" cy="43" rx="6" ry="8" fill="' + ec + '" stroke="' + ec + '" stroke-width="1.6"/>' +
    '<ellipse class="bz-eye" cx="66" cy="43" rx="6" ry="8" fill="' + ec + '" stroke="' + ec + '" stroke-width="1.6"/>' +
    '<path class="bz-mouth" d="" fill="' + MOUTH + '" stroke="' + MOUTH + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
  // animal expression: same parts, scaled about the head centre so they sit on the smaller face
  var wrap: any = animal ? '<g transform="translate(50 58) scale(' + k + ') translate(-50 -55)">' : '<g>';
  return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + base + wrap + inner + '</g></svg>';
}

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var board: any = document.createElement('div');
  board.className = 'bz';
  board.innerHTML = '<div class="bz-field"></div>';
  container.appendChild(board);
  var field: any = board.querySelector('.bz-field');

  function box(cls?: any, parent?: any, label?: any, onClick?: any) {
    var b: any = document.createElement('button');
    b.type = 'button'; b.className = cls;
    b.setAttribute('aria-label', label);
    parent.appendChild(b);
    b.addEventListener('click', onClick);
    return b;
  }
  var face: any = document.createElement('div');
  face.className = 'bz-face';
  face.innerHTML = headSvg('face');
  field.appendChild(face);
  var cat: any = document.createElement('div');
  cat.className = 'bz-cat';
  var buddy: any = Animals.pick(1)[0]; // one random animal per launch, nothing stored
  cat.innerHTML = headSvg(buddy);
  field.appendChild(cat);
  box('bz-hit bz-all', face, 'Buźka: zmień minę', nextExpr);
  box('bz-hit bz-eyes', face, 'Oczy', function () { effect('blink'); });
  box('bz-hit bz-cheek bz-cl', face, 'Lewy policzek', function () { effect('cheeks'); });
  box('bz-hit bz-cheek bz-cr', face, 'Prawy policzek', function () { effect('cheeks'); });
  box('bz-hit bz-mouth', face, 'Buzia', function () { effect('mouth'); });
  box('bz-hit bz-all', cat, buddy.name + ': zmień minę', nextExpr);

  function grab(root?: any) {
    return { eyes: [].slice.call(root.querySelectorAll('.bz-eye')), cheeks: [].slice.call(root.querySelectorAll('.bz-ch')),
      mouth: root.querySelector('.bz-mouth') };
  }
  var parts: any = [grab(face), grab(cat)];

  var cur: any = 0, from: any = EXPR[0], changeT: any = -1, fx: any = null;       // fx: { type, t, d }
  var idleBlink: any = null, idleTimer: any = 0, raf: any = 0, last: any = 0;

  function busy() { return changeT >= 0 || fx !== null; }
  function nextExpr() {
    if (busy()) { return; }
    from = currentParams();
    cur = (cur + 1) % EXPR.length;
    changeT = 0;
    start();
  }
  function effect(type?: any) {
    if (busy()) { return; }
    fx = { type: type, t: 0, d: EFFECT_S };
    start();
  }
  function currentParams() {
    var p: any = { ex: from.ex, ey: from.ey, mw: from.mw, ms: from.ms, mo: from.mo };
    if (changeT >= 0) {
      var u: any = changeT / (reduced() ? CHANGE_S * 0.4 : CHANGE_S), k: any = smooth(u), to: any = EXPR[cur];
      p = { ex: lerp(from.ex, to.ex, k), ey: lerp(from.ey, to.ey, k), mw: lerp(from.mw, to.mw, k), ms: lerp(from.ms, to.ms, k), mo: lerp(from.mo, to.mo, k) };
      if (cur === 1 && !reduced()) { p.mo += 12 * bump(u); p.mw += 4 * bump(u); } // slow yawn while falling asleep
    } else {
      var t: any = EXPR[cur];
      p = { ex: t.ex, ey: t.ey, mw: t.mw, ms: t.ms, mo: t.mo };
    }
    return p;
  }

  function paint() {
    var p: any = currentParams(), blink: any = 0, cheek: any = 0, g: any = 0, gest: any = null;
    if (fx) {
      var b: any = bump(fx.t / fx.d);
      if (fx.type === 'blink') { blink = b; }
      else if (fx.type === 'cheeks') { cheek = b; }
      else { g = b * 0.85; gest = cur === 1 ? YAWN : SMILE; }
    }
    if (idleBlink) { blink = Math.max(blink, bump(idleBlink.t / BLINK_S)); }
    var ey: any = Math.max(1.3, p.ey * (1 - blink * 0.92));
    var mw: any = lerp(p.mw, gest ? gest.mw : p.mw, g), ms: any = lerp(p.ms, gest ? gest.ms : p.ms, g), mo: any = lerp(p.mo, gest ? gest.mo : p.mo, g);
    var d: any = 'M' + (50 - mw) + ' 66Q50 ' + (66 + 2 * ms) + ' ' + (50 + mw) + ' 66Q50 ' + (66 + 2 * (ms + mo)) + ' ' + (50 - mw) + ' 66Z';
    parts.forEach(function (pt?: any) {
      pt.eyes.forEach(function (e?: any) { e.setAttribute('rx', p.ex.toFixed(2)); e.setAttribute('ry', ey.toFixed(2)); });
      pt.cheeks.forEach(function (c?: any) { c.setAttribute('opacity', (0.3 + 0.6 * cheek).toFixed(2)); });
      pt.mouth.setAttribute('d', d);
    });
  }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min((now - last) / 1000, 0.05); last = now;
    if (changeT >= 0) {
      changeT += dt;
      if (changeT >= (reduced() ? CHANGE_S * 0.4 : CHANGE_S)) { changeT = -1; from = EXPR[cur]; }
    }
    if (fx) { fx.t += dt; if (fx.t >= fx.d) { fx = null; } }
    if (idleBlink) { idleBlink.t += dt; if (idleBlink.t >= BLINK_S) { idleBlink = null; } }
    paint();
    if (document.hidden) { return; }
    if (busy() || idleBlink) { raf = requestAnimationFrame(frame); }
    else { armIdle(); }              // nothing animating: stop the loop, wake for the next idle blink
  }
  function armIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { idleTimer = 0; idleBlink = { t: 0 }; start(); }, IDLE_BLINK_S * 1000);
  }
  function start() {
    clearTimeout(idleTimer); idleTimer = 0;
    if (raf || document.hidden) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } clearTimeout(idleTimer); idleTimer = 0; } else { start(); }
  }

  function layout() {
    var r: any = field.getBoundingClientRect(), fw: any = r.width, fh: any = r.height;
    var portrait: any = fh >= fw, F: any, C: any, fx0: any, fy0: any, cx0: any, cy0: any;
    if (portrait) {
      F = Math.min(fw * 0.94, fh * 0.66); C = Math.min(fw * 0.4, fh - F - 12, 130);
      C = Math.max(C, 64);
      fx0 = (fw - F) / 2; fy0 = 4; cx0 = fw - C - 4; cy0 = fh - C - 4;
    } else {
      F = Math.min(fh * 0.98, fw * 0.6); C = Math.max(64, Math.min(F * 0.45, 130));
      fx0 = Math.max(0, (fw - F - C - 16) / 2); fy0 = (fh - F) / 2; cx0 = fx0 + F + 16; cy0 = fh - C - 4;
    }
    face.style.width = face.style.height = F + 'px';
    face.style.transform = 'translate(' + fx0 + 'px,' + fy0 + 'px)';
    cat.style.width = cat.style.height = C + 'px';
    cat.style.transform = 'translate(' + cx0 + 'px,' + cy0 + 'px)';
  }
  function onResize() { layout(); }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  layout();
  paint();
  start();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    clearTimeout(idleTimer); idleTimer = 0;
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (board.parentNode) { board.parentNode.removeChild(board); }
  };
}

export default function BuzkiActivity() {
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
