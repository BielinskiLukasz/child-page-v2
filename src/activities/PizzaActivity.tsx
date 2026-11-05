// Activity "Pizza": the child makes a pizza in four calm stages and a friendly animal customer eats it. Nothing can be wrong or fail.
// 1) Dough: dragging a finger over the dough ball flattens it into a round base; it needs 40% of the screen width of dragging AND about 3 s of
//    dragging time (whichever is slower). Keyboard: arrows or Enter/Space roll it in 8 steps.
// 2) Sauce: dragging over the base paints red sauce; at 80% painted coverage the rest fades in. Keyboard: arrows move a brush ring and paint,
//    Enter/Space paints at the ring.
// 3) Toppings: six pictures (tomato, cheese, mushroom, olive, pepper, pineapple), 64 px, are dragged from the tray onto the pizza any number of
//    times, up to 12 in total. A topping pops in and spins once in place; one dropped outside the pizza drifts back to the tray in 0.5 s.
//    Keyboard: Enter/Space on a tray button places it on the next free spot.
// 4) After 3 toppings a big oven button (72 px) appears. Touching it slides the pizza into a glowing oven for 2 s, it comes out and a random
//    animal (window.Animals, never the same as the last customer) smiles and eats it over 3 s. 4 s after the last bite a new dough ball starts.
// Pizza state is kept as unit coordinates (0..200 board units) so layout()/rotation never loses anything; the layout is recomputed from the
// viewport only. One capped-dt rAF loop (paused while hidden, stopped when idle) drives every animation from JS, so every state is still
// reached under prefers-reduced-motion (only the pop, spin and chew are skipped). Nothing is scored or stored. One pointer at a time.
// Usage metrics: track('interaction', {variant: '<topping id>' | 'oven'}) per topping placement / oven touch; complete() per served pizza.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';
import { Animals } from '../utils/animals';

var NS: any = 'http://www.w3.org/2000/svg';
var RB: any = 88, RS: any = 74, C: any = 100; // base radius, sauce radius, board centre (viewBox 0 0 200 200)
var DOUGH_NEED_W: any = 0.4, DOUGH_TIME: any = 3, KEY_STEPS: any = 8;
var SAUCE_R: any = 16, SAUCE_KEY_R: any = 24, SAUCE_GOAL: any = 0.8, SAUCE_FADE: any = 0.5;
var MAX_TOP: any = 12, MIN_TOP_OVEN: any = 3, BACK_S: any = 0.5, POP_S: any = 0.35, SPIN_S: any = 1.6;
var OVEN_S: any = 2, EAT_S: any = 3, WAIT_S: any = 4, GRID: any = 24;
var TRAY_W: any = 204, TRAY_H: any = 132, OVEN_BTN: any = 72;
var lastCustomer: any = null; // last animal served in this page session

// id -> [Polish label for screen readers, picture in a 64 x 64 box]
var KINDS: any = [
  ['tomato', 'Pomidor', '<circle cx="32" cy="32" r="22" fill="#e8503f"/><circle cx="32" cy="32" r="16" fill="#f47c64"/><g fill="#fbd9a8"><ellipse cx="32" cy="20" rx="2.5" ry="4"/><ellipse cx="22" cy="34" rx="2.5" ry="4" transform="rotate(60 22 34)"/><ellipse cx="42" cy="34" rx="2.5" ry="4" transform="rotate(-60 42 34)"/></g><circle cx="32" cy="32" r="3" fill="#fff0d0"/>'],
  ['cheese', 'Ser', '<path d="M6 46L58 24V48Z" fill="#ffd54a" stroke="#e0a820" stroke-width="3" stroke-linejoin="round"/><circle cx="40" cy="38" r="4" fill="#f5b82e"/><circle cx="26" cy="43" r="3" fill="#f5b82e"/><circle cx="50" cy="40" r="2.5" fill="#f5b82e"/>'],
  ['mushroom', 'Pieczarka', '<path d="M8 36Q8 10 32 10Q56 10 56 36Z" fill="#d9b08a"/><rect x="24" y="35" width="16" height="19" rx="6" fill="#f5e8d6"/><circle cx="22" cy="24" r="3.5" fill="#f5e8d6"/><circle cx="38" cy="19" r="3" fill="#f5e8d6"/><circle cx="44" cy="30" r="2.5" fill="#f5e8d6"/>'],
  ['olive', 'Oliwka', '<ellipse cx="32" cy="32" rx="19" ry="23" fill="#3d3a4f"/><ellipse cx="32" cy="32" rx="7" ry="9" fill="#8a7f5a"/><ellipse cx="22" cy="22" rx="3" ry="5" fill="#fff" opacity=".35" transform="rotate(20 22 22)"/>'],
  ['pepper', 'Papryka', '<circle cx="32" cy="32" r="19" fill="none" stroke="#6fbf4a" stroke-width="11"/><circle cx="32" cy="32" r="19" fill="none" stroke="#a6e07c" stroke-width="3" stroke-dasharray="14 6"/>'],
  ['pineapple', 'Ananas', '<rect x="12" y="12" width="40" height="40" rx="8" fill="#ffe066" stroke="#f2b632" stroke-width="3"/><path d="M12 28L36 52M12 44L20 52M28 12L52 36M44 12L52 20M12 12L52 52" stroke="#f2b632" stroke-width="2.2" stroke-linecap="round"/>']
];
var SPOTS: any = []; // keyboard placement spots (board units): outer ring of 6, then inner ring of 6
(function () {
  var k: any, a: any;
  for (k = 0; k < 6; k++) { a = (k * 60 + 15) * Math.PI / 180; SPOTS.push([C + 50 * Math.cos(a), C + 50 * Math.sin(a)]); }
  for (k = 0; k < 6; k++) { a = (k * 60 + 45) * Math.PI / 180; SPOTS.push([C + 24 * Math.cos(a), C + 24 * Math.sin(a)]); }
})();

function clamp(v?: any, a?: any, b?: any) { return v < a ? a : v > b ? b : v; }
function ease(t?: any) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function report(fn?: any) { try { if (Analytics) { fn(Analytics); } } catch (e: any) { /* metrics must never break the activity */ } }
function reduced() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e: any) { return false; } }
function el(tag?: any, attrs?: any, parent?: any) {
  var n: any = document.createElementNS(NS, tag), k: any;
  for (k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) { n.setAttribute(k, attrs[k]); } }
  if (parent) { parent.appendChild(n); }
  return n;
}
function kindSvg(k?: any) { return '<svg class="pi-ico" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + k[2] + '</svg>'; }
function px(v?: any) { return Math.round(v) + 'px'; }

function mount(container: HTMLElement) {
  var root: any = document.createElement('div');
  root.className = 'pi';
  root.innerHTML =
    '<div class="pi-wrap">' +
      '<div class="pi-board" tabindex="0" role="application"></div>' +
      '<div class="pi-cust" aria-hidden="true"></div>' +
      '<div class="pi-tray"></div>' +
      '<button type="button" class="pi-oven" aria-label="Piekarnik. Naciśnij, aby upiec pizzę."></button>' +
    '</div>';
  container.appendChild(root);
  var wrap: any = root.querySelector('.pi-wrap'), board: any = root.querySelector('.pi-board'), custEl: any = root.querySelector('.pi-cust');
  var tray: any = root.querySelector('.pi-tray'), ovenBtn: any = root.querySelector('.pi-oven');
  ovenBtn.innerHTML = '<svg class="pi-ovsvg" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect x="6" y="8" width="52" height="48" rx="8" fill="#8d8aa3" stroke="#5b5675" stroke-width="3"/><rect x="13" y="24" width="38" height="25" rx="5" fill="#ffb347"/><rect x="16" y="27" width="32" height="19" rx="3" fill="#ff8a3d"/><circle cx="18" cy="16" r="3" fill="#f7a8c9"/><circle cx="29" cy="16" r="3" fill="#ffd98a"/><circle cx="40" cy="16" r="3" fill="#a8d8f0"/><path d="M20 50h24" stroke="#5b5675" stroke-width="3" stroke-linecap="round"/></svg>';

  // ---- board picture --------------------------------------------------------------------------------------------
  var svg: any = el('svg', { 'class': 'pi-svg', viewBox: '0 0 200 200', 'aria-hidden': 'true', focusable: 'false' }, board);
  var defs: any = el('defs', {}, svg);
  var clip: any = el('clipPath', { id: 'pi-clip' }, defs); el('circle', { cx: C, cy: C, r: RS }, clip);
  var mask: any = el('mask', { id: 'pi-mask', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 200, height: 200 }, defs);
  el('rect', { x: 0, y: 0, width: 200, height: 200, fill: '#fff' }, mask);
  var bite: any = el('path', { d: '', fill: '#000' }, mask);
  var grad: any = el('radialGradient', { id: 'pi-glow' }, defs);
  el('stop', { offset: '0', 'stop-color': '#ffd27a' }, grad); el('stop', { offset: '1', 'stop-color': '#ff7a3a' }, grad);
  el('circle', { cx: C, cy: C, r: 98, fill: '#e8cfa6' }, svg);
  var ovenG: any = el('g', { opacity: 0 }, svg);
  el('rect', { x: 4, y: 4, width: 192, height: 192, rx: 26, fill: '#6b4a3a' }, ovenG);
  var ovenGlow: any = el('rect', { x: 14, y: 14, width: 172, height: 172, rx: 18, fill: 'url(#pi-glow)', opacity: 0.5 }, ovenG);
  var pizzaG: any = el('g', { mask: 'url(#pi-mask)' }, svg);
  var crust: any = el('ellipse', { cx: C, cy: C, rx: 38, ry: 46, fill: '#e9c27f' }, pizzaG);
  var inner: any = el('ellipse', { cx: C, cy: C, rx: 36, ry: 44, fill: '#f6dba3' }, pizzaG);
  var sauceG: any = el('g', { 'clip-path': 'url(#pi-clip)' }, pizzaG);
  var sauceFullEl: any = el('circle', { cx: C, cy: C, r: RS, fill: '#d8422f', opacity: 0 }, sauceG);
  var sauceDots: any = el('g', {}, sauceG);
  var kbRing: any = el('circle', { cx: C, cy: C, r: SAUCE_KEY_R, fill: 'none', stroke: '#fff', 'stroke-width': 3, 'stroke-dasharray': '6 5', opacity: 0 }, svg);
  var topG: any = el('g', {}, pizzaG);

  // ---- state ----------------------------------------------------------------------------------------------------
  var alive: any = true, raf: any = 0, last: any = 0;
  var phase: any = 'dough'; // dough | sauce | top | oven | eat | wait
  var pTarget: any = 0, pShown: any = 0, dist: any = 0, dragTime: any = 0;
  var painted: any, inside: any, insideN: any, paintedN: any, sauceDone: any, sauceFull: any, lastDot: any, kbX: any, kbY: any, kbUsed: any;
  var tops: any = [], topsPlaced: any = 0;
  var phaseT: any = 0, drag: any = null, ghost: any = null, flying: any = [], customer: any = null, chewT: any = 0;
  var size: any = 280; void size;
  var trayBtns: any = [];

  function resetSauceGrid() {
    var i: any, j: any, x: any, y: any;
    painted = []; inside = []; insideN = 0; paintedN = 0;
    for (j = 0; j < GRID; j++) {
      for (i = 0; i < GRID; i++) {
        x = (i + 0.5) * 200 / GRID; y = (j + 0.5) * 200 / GRID;
        painted.push(false);
        if ((x - C) * (x - C) + (y - C) * (y - C) <= RS * RS) { inside.push(true); insideN++; } else { inside.push(false); }
      }
    }
  }
  function newRound() {
    phase = 'dough'; pTarget = 0; pShown = 0; dist = 0; dragTime = 0; sauceDone = false; sauceFull = 0; lastDot = null;
    kbX = C; kbY = C; kbUsed = false; topsPlaced = 0; phaseT = 0; customer = null; chewT = 0;
    while (sauceDots.firstChild) { sauceDots.removeChild(sauceDots.firstChild); }
    while (topG.firstChild) { topG.removeChild(topG.firstChild); }
    tops = [];
    resetSauceGrid();
    custEl.innerHTML = '';
    custEl.classList.remove('pi-in');
    bite.setAttribute('d', '');
    pizzaG.removeAttribute('transform'); pizzaG.setAttribute('visibility', 'visible');
    ovenG.setAttribute('opacity', 0);
    board.setAttribute('aria-label', 'Ciasto. Przeciągaj palcem po cieście albo naciskaj strzałki, aby je rozwałkować.');
    syncUi();
  }
  function syncUi() {
    var showTray: any = phase === 'top';
    tray.classList.toggle('pi-show', showTray);
    tray.classList.toggle('pi-full', topsPlaced >= MAX_TOP);
    var showOven: any = phase === 'top' && topsPlaced >= MIN_TOP_OVEN;
    ovenBtn.classList.toggle('pi-show', showOven);
    trayBtns.forEach(function (b?: any) { b.disabled = !showTray; });
    ovenBtn.disabled = !showOven;
    kbRing.setAttribute('opacity', phase === 'sauce' && kbUsed ? 0.9 : 0);
  }

  // ---- layout (viewport only; all state is in board units) -------------------------------------------------------
  function layout() {
    var W: any = wrap.clientWidth || root.clientWidth || 320, H: any = wrap.clientHeight || root.clientHeight || 480;
    var land: any = W > H, x: any, y: any, bs: any, tx: any, ty: any;
    if (land) {
      bs = Math.max(120, Math.min(H - 16, W - 72 - (TRAY_W + 20)));
      x = 72; y = (H - bs) / 2;
      tx = x + bs + 8; ty = Math.max(8, (H - (TRAY_H + 8 + OVEN_BTN)) / 2);
      ovenBtn.style.left = px(tx + (TRAY_W - OVEN_BTN) / 2); ovenBtn.style.top = px(ty + TRAY_H + 8);
    } else {
      bs = Math.max(120, Math.min(W - 16, H - 64 - (TRAY_H + 24)));
      x = (W - bs) / 2; y = 64;
      tx = Math.max(4, (W - (TRAY_W + 8 + OVEN_BTN)) / 2); ty = y + bs + 8;
      ovenBtn.style.left = px(tx + TRAY_W + 8); ovenBtn.style.top = px(ty + (TRAY_H - OVEN_BTN) / 2);
    }
    size = bs;
    board.style.left = px(x); board.style.top = px(y); board.style.width = px(bs); board.style.height = px(bs);
    tray.style.left = px(tx); tray.style.top = px(ty);
    var cs: any = Math.max(80, bs * 0.36);
    custEl.style.width = px(cs); custEl.style.height = px(cs); custEl.style.left = px(x); custEl.style.top = px(y + bs - cs);
  }

  // ---- rendering ------------------------------------------------------------------------------------------------
  function render() {
    var e: any = ease(pShown), rx: any = 38 + (RB - 38) * e, ry: any = 46 + (RB - 46) * e;
    crust.setAttribute('rx', rx.toFixed(2)); crust.setAttribute('ry', ry.toFixed(2));
    inner.setAttribute('rx', (rx - 2 - 10 * e).toFixed(2)); inner.setAttribute('ry', (ry - 2 - 10 * e).toFixed(2));
    sauceFullEl.setAttribute('opacity', sauceFull.toFixed(3));
    tops.forEach(function (t?: any) {
      var pop: any = reduced() ? 1 : ease(t.t / POP_S), s: any = 0.35 + 0.65 * pop + (reduced() ? 0 : 0.18 * Math.sin(Math.PI * clamp(t.t / POP_S, 0, 1)));
      var spin: any = reduced() ? 0 : 360 * (1 - ease(t.t / SPIN_S));
      t.node.setAttribute('transform', 'translate(' + t.x.toFixed(2) + ' ' + t.y.toFixed(2) + ') rotate(' + (t.rot + spin).toFixed(1) + ') scale(' + (0.5 * s).toFixed(3) + ') translate(-32 -32)');
    });
    if (phase === 'oven') {
      var o: any = phaseT, inV: any = ease(o / 0.4), outV: any = ease((o - (OVEN_S - 0.4)) / 0.4), ov: any = Math.min(inV, 1 - outV);
      var sc: any = 1 - 0.4 * ov;
      ovenG.setAttribute('opacity', ov.toFixed(3));
      ovenGlow.setAttribute('opacity', (0.45 + 0.4 * ov * (0.5 + 0.5 * Math.sin(o * 2 * Math.PI / 1.6))).toFixed(3));
      pizzaG.setAttribute('transform', 'translate(' + C + ' ' + C + ') scale(' + sc.toFixed(3) + ') translate(-' + C + ' -' + C + ')');
    } else if (phase === 'eat') {
      var p: any = clamp(phaseT / EAT_S, 0, 1), a0: any = -Math.PI / 2, a1: any = a0 + p * 2 * Math.PI;
      if (p >= 1) { pizzaG.setAttribute('visibility', 'hidden'); bite.setAttribute('d', ''); }
      else if (p > 0) {
        bite.setAttribute('d', 'M' + C + ' ' + C + 'L' + (C + 130 * Math.cos(a0)).toFixed(2) + ' ' + (C + 130 * Math.sin(a0)).toFixed(2) +
          'A130 130 0 ' + (p > 0.5 ? 1 : 0) + ' 1 ' + (C + 130 * Math.cos(a1)).toFixed(2) + ' ' + (C + 130 * Math.sin(a1)).toFixed(2) + 'Z');
      }
    }
    if (customer) {
      var bob: any = phase === 'eat' && !reduced() ? 2 * Math.sin(chewT * 2 * Math.PI * 0.8) : 0;
      custEl.firstChild.style.transform = 'translateY(' + bob.toFixed(1) + 'px)';
    }
  }
  function busy() {
    var i: any;
    if (phase === 'oven' || phase === 'eat' || phase === 'wait') { return true; }
    if (pShown < pTarget) { return true; }
    if (sauceDone && sauceFull < 1) { return true; }
    if (flying.length) { return true; }
    for (i = 0; i < tops.length; i++) { if (tops[i].t < SPIN_S) { return true; } }
    return false;
  }
  function step(dt?: any) {
    var i: any, f: any;
    if (pShown < pTarget) { pShown += (pTarget - pShown) * Math.min(1, dt * 6); if (pTarget - pShown < 0.002) { pShown = pTarget; } }
    if (sauceDone && sauceFull < 1) { sauceFull = Math.min(1, sauceFull + dt / SAUCE_FADE); }
    tops.forEach(function (t?: any) { if (t.t < SPIN_S) { t.t += dt; } });
    for (i = flying.length - 1; i >= 0; i--) {
      f = flying[i]; f.t += dt;
      var k: any = ease(f.t / BACK_S);
      f.node.style.transform = 'translate(' + (f.x0 + (f.x1 - f.x0) * k).toFixed(1) + 'px,' + (f.y0 + (f.y1 - f.y0) * k).toFixed(1) + 'px)';
      if (f.t >= BACK_S) { if (f.node.parentNode) { f.node.parentNode.removeChild(f.node); } flying.splice(i, 1); }
    }
    if (phase === 'oven') {
      phaseT += dt;
      if (phaseT >= OVEN_S) { startEat(); }
    } else if (phase === 'eat') {
      phaseT += dt; chewT += dt;
      if (phaseT >= EAT_S) {
        phaseT = 0; phase = 'wait';
        report(function (A?: any) { A.complete(); });
      }
    } else if (phase === 'wait') {
      phaseT += dt;
      if (phaseT >= WAIT_S) { newRound(); }
    }
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
  function redraw() { render(); start(); }

  // ---- stages ---------------------------------------------------------------------------------------------------
  function setDough(p?: any) {
    if (phase !== 'dough') { return; }
    pTarget = Math.max(pTarget, Math.min(1, p));
    if (pTarget >= 1) {
      phase = 'sauce';
      board.setAttribute('aria-label', 'Sos. Przeciągaj palcem po cieście albo używaj strzałek, aby rozsmarować sos.');
      syncUi();
    }
    redraw();
  }
  function paintAt(ux?: any, uy?: any, r?: any) {
    if (phase !== 'sauce') { return; }
    if (lastDot && Math.abs(lastDot[0] - ux) < 5 && Math.abs(lastDot[1] - uy) < 5 && r === SAUCE_R) { return; }
    lastDot = [ux, uy];
    el('circle', { cx: ux.toFixed(1), cy: uy.toFixed(1), r: r, fill: '#d8422f' }, sauceDots);
    el('circle', { cx: (ux - r * 0.3).toFixed(1), cy: (uy - r * 0.3).toFixed(1), r: r * 0.25, fill: '#ee6b55' }, sauceDots);
    var i: any, j: any, x: any, y: any, idx: any;
    for (j = 0; j < GRID; j++) {
      for (i = 0; i < GRID; i++) {
        idx = j * GRID + i;
        if (inside[idx] && !painted[idx]) {
          x = (i + 0.5) * 200 / GRID; y = (j + 0.5) * 200 / GRID;
          if ((x - ux) * (x - ux) + (y - uy) * (y - uy) <= r * r) { painted[idx] = true; paintedN++; }
        }
      }
    }
    if (!sauceDone && paintedN >= SAUCE_GOAL * insideN) {
      sauceDone = true; phase = 'top';
      board.setAttribute('aria-label', 'Pizza. Dodatki wybierz z tacki.');
      syncUi();
    }
    redraw();
  }
  function toUnits(cx?: any, cy?: any) {
    var r: any = board.getBoundingClientRect();
    return [(cx - r.left) / (r.width || 1) * 200, (cy - r.top) / (r.height || 1) * 200];
  }
  function place(kindIdx?: any, ux?: any, uy?: any) {
    if (phase !== 'top' || topsPlaced >= MAX_TOP) { return false; }
    var k: any = KINDS[kindIdx], d: any = Math.sqrt((ux - C) * (ux - C) + (uy - C) * (uy - C));
    if (d > 74) { ux = C + (ux - C) * 74 / d; uy = C + (uy - C) * 74 / d; }
    var node: any = el('g', {}, topG);
    node.innerHTML = k[2];
    tops.push({ node: node, x: ux, y: uy, rot: Math.round(Math.random() * 360), t: 0 });
    topsPlaced++;
    report(function (A?: any) { A.track('interaction', { variant: k[0] }); });
    syncUi(); redraw();
    return true;
  }
  function startOven() {
    if (phase !== 'top' || topsPlaced < MIN_TOP_OVEN) { return; }
    report(function (A?: any) { A.track('interaction', { variant: 'oven' }); });
    phase = 'oven'; phaseT = 0; syncUi(); redraw();
  }
  function startEat() {
    var pool: any = Animals ? Animals.pick(2) : [], a: any = null, i: any;
    for (i = 0; i < pool.length; i++) { if (!a && pool[i].id !== lastCustomer) { a = pool[i]; } }
    lastCustomer = a ? a.id : null;
    customer = a;
    ovenG.setAttribute('opacity', 0); pizzaG.removeAttribute('transform');
    custEl.innerHTML = a ? '<svg class="pi-csvg" viewBox="-24 -26 48 52" aria-hidden="true">' + Animals.head(a.id, { body: true }) +
      '<path d="M-6 8Q0 15 6 8" fill="none" stroke="#5b5675" stroke-width="1.8" stroke-linecap="round"/></svg>' : '';
    custEl.classList.add('pi-in');
    phase = 'eat'; phaseT = 0; chewT = 0; syncUi(); redraw();
  }

  // ---- input: dough and sauce on the board ----------------------------------------------------------------------
  function onBoardDown(e?: any) {
    if (drag || ghost || (phase !== 'dough' && phase !== 'sauce')) { return; }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, ts: e.timeStamp };
    try { board.setPointerCapture(e.pointerId); } catch (err: any) { /* unsupported */ }
    if (phase === 'sauce') { var u: any = toUnits(e.clientX, e.clientY); paintAt(u[0], u[1], SAUCE_R); }
    e.preventDefault();
  }
  function onBoardMove(e?: any) {
    if (!drag || e.pointerId !== drag.id) { return; }
    var dx: any = e.clientX - drag.x, dy: any = e.clientY - drag.y, d: any = Math.sqrt(dx * dx + dy * dy);
    if (phase === 'dough') {
      dist += d; dragTime += d > 0 ? Math.min(Math.max((e.timeStamp - drag.ts) / 1000, 0), 0.1) : 0;
      setDough(Math.min(dist / (DOUGH_NEED_W * (wrap.clientWidth || 320)), dragTime / DOUGH_TIME));
    } else if (phase === 'sauce') {
      var n: any = Math.max(1, Math.ceil(d / 6)), i: any, u: any;
      for (i = 1; i <= n; i++) { u = toUnits(drag.x + dx * i / n, drag.y + dy * i / n); paintAt(u[0], u[1], SAUCE_R); }
    }
    drag.x = e.clientX; drag.y = e.clientY; drag.ts = e.timeStamp;
  }
  function onBoardUp(e?: any) {
    if (!drag || e.pointerId !== drag.id) { return; }
    drag = null;
  }
  function onBoardKey(e?: any) {
    var k: any = e.key, dx: any = 0, dy: any = 0;
    if (phase === 'dough') {
      if (k === 'Enter' || k === ' ' || k === 'Spacebar' || k.indexOf('Arrow') === 0) { setDough((Math.floor(pTarget * KEY_STEPS + 1e-6) + 1) / KEY_STEPS); e.preventDefault(); }
    } else if (phase === 'sauce') {
      if (k === 'ArrowLeft') { dx = -14; } else if (k === 'ArrowRight') { dx = 14; } else if (k === 'ArrowUp') { dy = -14; } else if (k === 'ArrowDown') { dy = 14; }
      else if (k !== 'Enter' && k !== ' ' && k !== 'Spacebar') { return; }
      kbUsed = true;
      var nx: any = kbX + dx, ny: any = kbY + dy, d: any = Math.sqrt((nx - C) * (nx - C) + (ny - C) * (ny - C));
      if (d > RS - 4) { nx = C + (nx - C) * (RS - 4) / d; ny = C + (ny - C) * (RS - 4) / d; }
      kbX = nx; kbY = ny;
      kbRing.setAttribute('cx', kbX.toFixed(1)); kbRing.setAttribute('cy', kbY.toFixed(1));
      lastDot = null; paintAt(kbX, kbY, SAUCE_KEY_R);
      kbRing.setAttribute('opacity', phase === 'sauce' ? 0.9 : 0);
      e.preventDefault();
    }
  }

  // ---- input: toppings from the tray ----------------------------------------------------------------------------
  function endGhost(g?: any, cx?: any, cy?: any, accept?: any) {
    var u: any = toUnits(cx, cy), d: any = Math.sqrt((u[0] - C) * (u[0] - C) + (u[1] - C) * (u[1] - C));
    if (accept && phase === 'top' && topsPlaced < MAX_TOP && d <= RB) {
      if (g.node.parentNode) { g.node.parentNode.removeChild(g.node); }
      place(g.idx, u[0], u[1]);
      return;
    }
    var r: any = trayBtns[g.idx].getBoundingClientRect();
    flying.push({ node: g.node, x0: cx - 32, y0: cy - 32, x1: r.left + r.width / 2 - 32, y1: r.top + r.height / 2 - 32, t: 0 });
    start();
  }
  function cancelGhost() {
    if (ghost) { if (ghost.node.parentNode) { ghost.node.parentNode.removeChild(ghost.node); } ghost = null; }
    drag = null;
  }
  trayBtns = KINDS.map(function (k?: any, idx?: any) {
    var b: any = document.createElement('button');
    b.type = 'button'; b.className = 'pi-tb'; b.innerHTML = kindSvg(k);
    b.setAttribute('aria-label', k[1] + '. Przeciągnij na pizzę albo naciśnij Enter, aby dodać.');
    b.addEventListener('pointerdown', function (e?: any) {
      if (drag || ghost || phase !== 'top' || topsPlaced >= MAX_TOP) { return; }
      var g: any = document.createElement('div');
      g.className = 'pi-ghost'; g.innerHTML = kindSvg(k);
      root.appendChild(g);
      g.style.transform = 'translate(' + (e.clientX - 32) + 'px,' + (e.clientY - 32) + 'px)';
      ghost = { id: e.pointerId, idx: idx, node: g, x: e.clientX, y: e.clientY };
      drag = { id: e.pointerId };
      try { b.setPointerCapture(e.pointerId); } catch (err: any) { /* unsupported */ }
      e.preventDefault();
    });
    b.addEventListener('pointermove', function (e?: any) {
      if (!ghost || e.pointerId !== ghost.id) { return; }
      ghost.x = e.clientX; ghost.y = e.clientY;
      ghost.node.style.transform = 'translate(' + (e.clientX - 32) + 'px,' + (e.clientY - 32) + 'px)';
    });
    function up(e?: any, ok?: any) {
      if (!ghost || e.pointerId !== ghost.id) { return; }
      var g: any = ghost; ghost = null; drag = null;
      endGhost(g, e.clientX, e.clientY, ok);
    }
    b.addEventListener('pointerup', function (e?: any) { up(e, true); });
    b.addEventListener('pointercancel', function (e?: any) { up(e, false); });
    b.addEventListener('click', function (e?: any) {
      if (e.detail !== 0) { return; } // pointer clicks are handled by the drag; Enter/Space arrives with detail 0
      if (place(idx, SPOTS[topsPlaced % SPOTS.length][0], SPOTS[topsPlaced % SPOTS.length][1])) { e.preventDefault(); }
    });
    tray.appendChild(b);
    return b;
  });
  ovenBtn.addEventListener('click', function (e?: any) { startOven(); e.preventDefault(); });

  function onVis() {
    if (document.hidden) { cancelGhost(); if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }
  function onResize() { layout(); redraw(); }
  board.addEventListener('pointerdown', onBoardDown);
  board.addEventListener('pointermove', onBoardMove);
  board.addEventListener('pointerup', onBoardUp);
  board.addEventListener('pointercancel', onBoardUp);
  board.addEventListener('keydown', onBoardKey);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  newRound();
  layout();
  render();

  return function cleanup() {
    alive = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    cancelGhost();
    flying.forEach(function (f?: any) { if (f.node.parentNode) { f.node.parentNode.removeChild(f.node); } });
    flying = [];
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function PizzaActivity() {
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
