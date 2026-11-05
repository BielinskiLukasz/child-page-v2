// Activity "Nakarm Pieska": a hungry dog of a random breed (window.Dogs) sits next to an empty bowl; six items lie on a table, drawn at random
// before each round from a pool of 9 dog-friendly foods and 5 unsuitable ones (always 4 + 2, never the same set twice in a row).
// Dragging a dog-friendly item to the dog or its bowl: it is eaten with a happy chew
// (1.5 s), then a heart rises and the dog wags (1 s). An unsuitable item is gently refused by a head shake and drifts back to the table in 0.5 s;
// so does any item dropped elsewhere or while the dog is busy. Each friendly item is given once per round; after 3 different items the
// dog yawns, lies down with a soft glow for 3 s, walks off and a new breed arrives (never the same twice in a row), a new table is dealt.
// Dragging over the dog or bowl shows a glowing outline (non-colour cue). Keyboard: Tab to an item, Enter/Space gives it to the dog.
// One capped-dt rAF loop (final states are set from JS, never only in CSS keyframes), pauses while hidden and stops when idle.
// Nothing is scored or stored. Usage metrics: track('interaction', {variant: breed}) per give attempt, complete() when the dog is full;
// the activity stays open-ended (a new round starts by itself).
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';
import { Dogs } from '../utils/dogs';

var CHEW_S: any = 1.5, WAG_S: any = 1.0, SHAKE_S: any = 0.9, YAWN_S: any = 1.0, LIE_S: any = 3.0, OUT_S: any = 0.5, IN_S: any = 0.7, BACK_S: any = 0.5, FLY_S: any = 0.3, FADE_S: any = 0.5;
var NAME_H: any = 18, ROUND_ITEMS: any = 3, YARD_TOP: any = 56;
// to: where a friendly item flies when given ('mouth' = held food, 'bowl' = poured into the bowl)
var KINDS: any = [
  { id: 'bone', label: 'Kość', ok: true, to: 'mouth' },
  { id: 'food', label: 'Miska karmy', ok: true, to: 'bowl' },
  { id: 'water', label: 'Woda', ok: true, to: 'bowl' },
  { id: 'meat', label: 'Mięso', ok: true, to: 'mouth' },
  { id: 'sausage', label: 'Kiełbaska', ok: true, to: 'mouth' },
  { id: 'biscuit', label: 'Herbatnik', ok: true, to: 'mouth' },
  { id: 'chicken', label: 'Udko', ok: true, to: 'mouth' },
  { id: 'fish', label: 'Rybka', ok: true, to: 'mouth' },
  { id: 'rice', label: 'Miska ryżu', ok: true, to: 'bowl' },
  { id: 'carrot', label: 'Marchewka', ok: false, to: 'mouth' },
  { id: 'chocolate', label: 'Czekolada', ok: false, to: 'mouth' },
  { id: 'onion', label: 'Cebula', ok: false, to: 'mouth' },
  { id: 'grapes', label: 'Winogrona', ok: false, to: 'mouth' },
  { id: 'cake', label: 'Ciasto', ok: false, to: 'mouth' }
];
var N_OK: any = 4, N_BAD: any = 2;
var ICONS: any = {
  bone: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M17 26a8 8 0 1 1 7-12l16 0a8 8 0 1 1 7 12 8 8 0 1 1-7 12l-16 0a8 8 0 1 1-7-12z" transform="rotate(-35 32 32) translate(0 6)" fill="#fbf1dc" stroke="#d9c49c" stroke-width="2.5"/></svg>',
  food: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M6 32h52q0 20-12 24H18Q6 52 6 32z" fill="#f7a8c9"/><path d="M8 32h48" stroke="#e58bb0" stroke-width="3"/><path d="M12 32q4-12 10-6t10-8 10 8 8-4q4 6 0 10z" fill="#b57b4d"/><circle cx="22" cy="24" r="3" fill="#8d5e38"/><circle cx="36" cy="20" r="3" fill="#8d5e38"/><circle cx="46" cy="26" r="3" fill="#8d5e38"/></svg>',
  water: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M6 32h52q0 20-12 24H18Q6 52 6 32z" fill="#9fd0f0"/><path d="M8 32h48" stroke="#6fb2e0" stroke-width="3"/><ellipse cx="32" cy="32" rx="25" ry="6" fill="#c9e8fb"/><path d="M32 6c7 9 10 14 10 19a10 10 0 0 1-20 0c0-5 3-10 10-19z" fill="#6fb8ec"/><path d="M27 24a5 5 0 0 0 3 6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
  carrot: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M36 20l16 24Q46 56 20 58 8 58 8 52q0-24 28-32z" transform="rotate(-20 32 36)" fill="#f4a261"/><path d="M24 40l6 2M30 32l6 2M20 50l6 1" stroke="#e08a45" stroke-width="2" stroke-linecap="round" transform="rotate(-20 32 36)"/><path d="M40 16q-4-9 2-12M44 18q4-8 10-6M46 22q8-2 10 4" fill="none" stroke="#7fc26b" stroke-width="4" stroke-linecap="round"/></svg>',
  meat: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 36q-2-16 14-20t26 4q10 8 2 20t-26 10Q12 52 10 36z" fill="#e0646c"/><path d="M14 34q2-10 12-12t18 2" fill="none" stroke="#f6a5aa" stroke-width="3" stroke-linecap="round"/><circle cx="40" cy="36" r="6" fill="#fbe9dd"/><circle cx="40" cy="36" r="2.5" fill="#d9c0ad"/></svg>',
  sausage: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="22" width="52" height="20" rx="10" transform="rotate(-20 32 32)" fill="#d9774f"/><path d="M16 36l30-14M14 42l36-16" stroke="#b9573a" stroke-width="2.5" stroke-linecap="round" opacity=".7"/><ellipse cx="22" cy="32" rx="6" ry="2.5" fill="#eba083" transform="rotate(-20 22 32)"/></svg>',
  biscuit: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22" fill="#e2b46f" stroke="#c18f47" stroke-width="2.5"/><circle cx="24" cy="26" r="2.6" fill="#a8742f"/><circle cx="38" cy="24" r="2.6" fill="#a8742f"/><circle cx="30" cy="36" r="2.6" fill="#a8742f"/><circle cx="42" cy="38" r="2.6" fill="#a8742f"/><circle cx="22" cy="40" r="2.6" fill="#a8742f"/></svg>',
  chicken: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 30q0-16 18-18t24 12q4 12-8 18-6 3-12 0l-8 8a6 6 0 1 1-8 0 6 6 0 1 1-4-8l8-8q-10-2-10-4z" transform="translate(2 2)" fill="#d98b4a"/><path d="M26 22q8-6 16 0" fill="none" stroke="#f1b97d" stroke-width="3" stroke-linecap="round"/><path d="M10 52l10-10" stroke="#fbf1dc" stroke-width="7" stroke-linecap="round"/><circle cx="9" cy="54" r="5" fill="#fbf1dc"/><circle cx="15" cy="58" r="4" fill="#fbf1dc"/></svg>',
  fish: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M6 32q14-18 34-10l12-8v36l-12-8Q20 50 6 32z" fill="#6fb2e0"/><path d="M40 22l12-8v36l-12-8z" fill="#4f95c9"/><circle cx="18" cy="29" r="3.2" fill="#fff"/><circle cx="18" cy="29" r="1.4" fill="#33506b"/><path d="M26 36q6 4 12 0M28 28q4 3 8 0" fill="none" stroke="#9fd0f0" stroke-width="2" stroke-linecap="round"/></svg>',
  rice: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M6 34h52q0 20-12 24H18Q6 54 6 34z" fill="#e8cf9c"/><path d="M8 34h48" stroke="#c9ae78" stroke-width="3"/><path d="M12 34q4-14 12-14t8-6 10 6 10 2q4 6 2 12z" fill="#fffaf0"/><path d="M20 28l3 2M30 24l3 2M40 28l3 2M26 32l3 1M36 31l3 1" stroke="#d8cdb6" stroke-width="2" stroke-linecap="round"/></svg>',
  chocolate: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="12" width="44" height="42" rx="5" fill="#7a4a2d"/><path d="M10 26h44M10 40h44M25 12v42M40 12v42" stroke="#5a3320" stroke-width="2.5"/><path d="M10 12h44v8H10z" fill="#d9d9e8"/><path d="M14 16h8M30 16h8" stroke="#b9b9cf" stroke-width="2" stroke-linecap="round"/><path d="M13 30l8 0" stroke="#9c6844" stroke-width="2" stroke-linecap="round"/></svg>',
  onion: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 10q2 8 0 12" fill="none" stroke="#b69a5b" stroke-width="4" stroke-linecap="round"/><path d="M32 18q-24 6-22 26 3 12 22 12t22-12q2-20-22-26z" fill="#d9a7d6"/><path d="M32 18q-10 10-8 38M32 18q10 10 8 38" fill="none" stroke="#b97fb6" stroke-width="2.5"/><path d="M32 18v38" stroke="#b97fb6" stroke-width="2.5"/></svg>',
  grapes: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 8q2 6 8 6" fill="none" stroke="#7fc26b" stroke-width="4" stroke-linecap="round"/><ellipse cx="46" cy="14" rx="8" ry="4" fill="#7fc26b"/><g fill="#8e6bbf"><circle cx="22" cy="24" r="8"/><circle cx="38" cy="24" r="8"/><circle cx="30" cy="34" r="8"/><circle cx="14" cy="36" r="8"/><circle cx="46" cy="36" r="8"/><circle cx="22" cy="46" r="8"/><circle cx="38" cy="46" r="8"/><circle cx="30" cy="56" r="7"/></g><g fill="#b89ae0"><circle cx="19" cy="21" r="2.5"/><circle cx="35" cy="21" r="2.5"/><circle cx="27" cy="31" r="2.5"/></g></svg>',
  cake: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="30" width="44" height="24" rx="4" fill="#f4c28a"/><path d="M10 34q6 8 11 0t11 0 11 0 11 0v-4a4 4 0 0 0-4-4H14a4 4 0 0 0-4 4z" fill="#f7a8c9"/><rect x="30" y="14" width="4" height="12" rx="2" fill="#7fc2e8"/><path d="M32 6q4 4 0 8-4-4 0-8z" fill="#ffd95a"/><circle cx="18" cy="44" r="2" fill="#fff"/><circle cx="32" cy="46" r="2" fill="#fff"/><circle cx="46" cy="44" r="2" fill="#fff"/></svg>'
};
var BOWL_SVG: any = '<svg viewBox="0 0 80 40" aria-hidden="true"><path d="M4 8h72q0 24-16 28H20Q4 32 4 8z" fill="#f2b8cf"/><ellipse cx="40" cy="8" rx="36" ry="6" fill="#f9d3e1"/><ellipse cx="40" cy="9" rx="28" ry="3.5" fill="#fbe7ef"/></svg>';
var lastBreed: any = '', lastSet: any = '';

function shuffled(list?: any) {
  var a: any = list.slice(), i: any, j: any, t: any;
  for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
// 4 dog-friendly + 2 unsuitable kinds in random order; the set (order ignored) differs from the previous round's
function dealKinds() {
  var oks: any = KINDS.filter(function (k?: any) { return k.ok; }), bads: any = KINDS.filter(function (k?: any) { return !k.ok; }), pick: any, key: any, n: any = 0;
  do {
    pick = shuffled(oks).slice(0, N_OK).concat(shuffled(bads).slice(0, N_BAD));
    key = pick.map(function (k?: any) { return k.id; }).sort().join(',');
  } while (key === lastSet && ++n < 20);
  lastSet = key;
  return shuffled(pick);
}

function clamp(v?: any, a?: any, b?: any) { return v < a ? a : v > b ? b : v; }
function ease(t?: any) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function report(fn?: any) { try { if (Analytics) { fn(Analytics); } } catch (e: any) { /* metrics must never break the activity */ } }
function pickBreed(except?: any) {
  var list: any = Dogs.LIST, d: any;
  do { d = list[Math.floor(Math.random() * list.length)]; } while (d.id === except && list.length > 1);
  return d;
}

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var root: any = document.createElement('div');
  root.className = 'nk';
  root.innerHTML =
    '<svg class="nk-sky" viewBox="0 0 400 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
    '<circle cx="330" cy="34" r="16" fill="#ffe27a"/><ellipse cx="80" cy="34" rx="34" ry="11" fill="#fff"/><ellipse cx="106" cy="28" rx="20" ry="10" fill="#fff"/>' +
    '<rect x="26" y="66" width="6" height="34" rx="3" fill="#b98963"/><circle cx="29" cy="58" r="16" fill="#a9d98f"/></svg>' +
    '<div class="nk-yard"></div><div class="nk-table"></div>' +
    '<div class="nk-glow"></div>' +
    '<button type="button" class="nk-dog"><span class="nk-art"></span><span class="nk-name"></span></button>' +
    '<div class="nk-bowl">' + BOWL_SVG + '</div>' +
    '<div class="nk-heart"></div>';
  container.appendChild(root);
  var yard: any = root.querySelector('.nk-yard'), table: any = root.querySelector('.nk-table'), glow: any = root.querySelector('.nk-glow');
  var dogBtn: any = root.querySelector('.nk-dog'), art: any = root.querySelector('.nk-art'), nameEl: any = root.querySelector('.nk-name');
  var bowl: any = root.querySelector('.nk-bowl'), heartEl: any = root.querySelector('.nk-heart');
  heartEl.innerHTML = '<svg viewBox="0 0 32 30" aria-hidden="true"><path d="M16 28C4 19 1 13 1 9a7 7 0 0 1 15-3a7 7 0 0 1 15 3c0 4-3 10-15 19z" fill="#f48aa8"/></svg>';
  dogBtn.setAttribute('tabindex', '-1');   // the dog is only a drop target; items are the keyboard stops

  var items: any = dealKinds().map(function (k?: any) {
    var b: any = document.createElement('button');
    b.type = 'button'; b.className = 'nk-item';
    root.appendChild(b);
    return { kind: k, node: b, hx: 0, hy: 0, x: 0, y: 0, mode: 'home', t: 0, x0: 0, y0: 0, given: false, alpha: 1, fade: 0, scale: 1 };
  });

  function setKind(it?: any, k?: any) {
    it.kind = k; it.node.innerHTML = ICONS[k.id];
    it.node.setAttribute('aria-label', k.label + '. Przeciągnij do pieska lub naciśnij Enter, aby go poczęstować.');
  }
  items.forEach(function (it?: any) { setKind(it, it.kind); });

  var W: any = 320, H: any = 568, dw: any = 150, dh: any = 125, isz: any = 64, bw: any = 70, bh: any = 56;
  var dog: any = { cx: 0, by: 0, breed: null, phase: 'wait', t: 0, off: 0, calm: null, hap: null, head: null, tail: null, tailP: [0, 0], headP: [0, 0],
    given: 0, happy: false, wag: 0, lastItem: null, glow: 0 };
  var heartT: any = -1, heartX: any = 0, heartY: any = 0;
  var alive: any = true, raf: any = 0, last: any = 0, drag: any = null;

  // ---- geometry -------------------------------------------------------------------------------------------
  function layout() {
    var r: any = root.getBoundingClientRect();
    W = Math.max(280, r.width); H = Math.max(240, r.height);
    var cols: any = W >= 6 * 78 ? items.length : 3, rows: any = Math.ceil(items.length / cols);
    isz = clamp(Math.min(W / (cols + 0.4), H * 0.3 / rows), 72, 100);
    var gap: any = rows > 1 ? 8 : 0, tH: any = rows * isz + (rows - 1) * gap + 40, yardH: any = H - tH - YARD_TOP;
    table.style.height = tH + 'px'; yard.style.top = YARD_TOP + 'px'; yard.style.bottom = tH + 'px';
    dw = Math.min(W * 0.52, (yardH - NAME_H - 24) * 1.2, 220); dh = dw * 5 / 6;
    bw = Math.max(64, dw * 0.46); bh = Math.max(56, bw * 0.5);
    var gw: any = dw + bw * 0.9, x0: any = (W - gw) / 2;
    dog.cx = x0 + dw / 2; dog.by = YARD_TOP + yardH - 6;
    dogBtn.style.width = Math.max(56, dw) + 'px'; dogBtn.style.height = (dh + NAME_H) + 'px';
    art.style.width = dw + 'px'; art.style.height = dh + 'px';
    bowl.style.width = bw + 'px'; bowl.style.height = bh + 'px';
    bowl.dataset.x = String(x0 + dw + bw * 0.45 - bw / 2 + bw * 0.1); bowl.dataset.y = String(dog.by - NAME_H - bh * 0.8);
    var slot: any = W / cols;
    items.forEach(function (it?: any, i?: any) {
      it.hx = slot * (i % cols + 0.5); it.hy = H - tH + 20 + isz / 2 + Math.floor(i / cols) * (isz + gap) - 4;
      it.node.style.width = it.node.style.height = isz + 'px';
      if (it.mode === 'home' || it.mode === 'back') { it.mode = 'home'; it.x = it.hx; it.y = it.hy; }
    });
    render();
  }
  function dogRect() {
    var w: any = Math.max(56, dw) + 24, left: any = dog.cx - w / 2 + dog.off, top: any = dog.by - NAME_H - dh - 12;
    return { l: left, t: top, r: left + w, b: dog.by + 12 };
  }
  function bowlRect() {
    var x: any = +bowl.dataset.x, y: any = +bowl.dataset.y;
    return { l: x - 14, t: y - 14, r: x + bw + 14, b: y + bh + 14 };
  }
  function inside(r?: any, x?: any, y?: any) { return x >= r.l && x <= r.r && y >= r.t && y <= r.b; }
  function overDog(x?: any, y?: any) { return inside(dogRect(), x, y) || inside(bowlRect(), x, y); }
  function mouthPt() { return [dog.cx + dw * 0.4 + dog.off, dog.by - NAME_H - dh * 0.3]; }
  function bowlPt() { return [+bowl.dataset.x + bw / 2, +bowl.dataset.y + bh * 0.3]; }
  function accepting() { return dog.phase === 'wait'; }

  // ---- dog look -------------------------------------------------------------------------------------------
  function setBreed(d?: any) {
    dog.breed = d; lastBreed = d.id;
    art.innerHTML = Dogs.draw(d.id);
    dog.calm = art.querySelector('.dg-calm'); dog.hap = art.querySelector('.dg-happy'); dog.tail = art.querySelector('.dg-tail');
    dog.head = art.querySelector('.dg-head'); var ears: any = art.querySelector('.dg-ears');
    dog.tailP = dog.tail ? [+dog.tail.getAttribute('data-px'), +dog.tail.getAttribute('data-py')] : [0, 0];
    dog.headP = ears ? [+ears.getAttribute('data-px') + 4, +ears.getAttribute('data-py') + 9] : [80, 50];
    nameEl.textContent = d.name;
    dogBtn.setAttribute('aria-label', 'Piesek: ' + d.name);
    setMood(false);
  }
  function setMood(on?: any) {
    dog.happy = on;
    if (dog.hap) { dog.hap.setAttribute('display', on ? 'inline' : 'none'); dog.calm.setAttribute('display', on ? 'none' : 'inline'); }
  }
  function rot(node?: any, a?: any, p?: any, dy?: any) {
    if (!node) { return; }
    node.setAttribute('transform', (dy ? 'translate(0 ' + dy.toFixed(2) + ') ' : '') + (a ? 'rotate(' + a.toFixed(2) + ' ' + p[0] + ' ' + p[1] + ')' : ''));
  }

  // ---- rendering ------------------------------------------------------------------------------------------
  function render() {
    var px: any = dog.cx + dog.off, w: any = Math.max(56, dw);
    dogBtn.style.transform = 'translate(' + (px - w / 2).toFixed(1) + 'px,' + (dog.by - NAME_H - dh).toFixed(1) + 'px)';
    bowl.style.transform = 'translate(' + (+bowl.dataset.x).toFixed(1) + 'px,' + (+bowl.dataset.y).toFixed(1) + 'px)';
    var tilt: any = 0, shakeA: any = 0, headA: any = 0, headDy: any = 0, tailA: any = 0, ph: any = dog.phase, t: any = dog.t; void shakeA; void tilt;
    if (ph === 'eat') { headDy = Math.abs(Math.sin(t * 9)) * 3; headA = 6 * Math.sin(t * 9); tailA = 14 * Math.sin(t * 12); }
    else if (ph === 'wag') { tailA = 26 * Math.sin(t * 14) * Math.min(1, (WAG_S - t) / 0.3 + 0.0001) ; }
    else if (ph === 'shake') { headA = 16 * Math.sin(t / SHAKE_S * Math.PI * 6) * (1 - t / SHAKE_S); }
    else if (ph === 'yawn') { headA = -16 * Math.sin(Math.min(1, t / YAWN_S) * Math.PI); }
    rot(dog.head, headA, dog.headP, headDy); rot(dog.tail, tailA, dog.tailP);
    var g: any = ph === 'lie' ? 1 : ph === 'yawn' ? ease(t / YAWN_S) * 0.4 : ph === 'out' ? 1 - ease(t / OUT_S) : 0;
    glow.style.opacity = g.toFixed(3);
    glow.style.width = (dw * 1.7).toFixed(0) + 'px'; glow.style.height = (dw * 1.2).toFixed(0) + 'px';
    glow.style.transform = 'translate(' + (px - dw * 0.85).toFixed(1) + 'px,' + (dog.by - dh * 1.05).toFixed(1) + 'px)';
    var o: any = ph === 'out' ? 1 - ease(t / OUT_S) : 1;
    dogBtn.style.opacity = o.toFixed(3); heartEl.style.opacity = '0';
    if (heartT >= 0) {
      var hu: any = heartT / (WAG_S + 0.6);
      heartEl.style.transform = 'translate(' + (heartX - 22).toFixed(1) + 'px,' + (heartY - 44 - 50 * ease(hu)).toFixed(1) + 'px) scale(' + (0.6 + 0.4 * Math.min(1, hu * 4)).toFixed(2) + ')';
      heartEl.style.opacity = (hu < 0.7 ? 1 : (1 - hu) / 0.3).toFixed(3);
    }
    // outline cue while dragging over the dog/bowl
    var over: any = !!(drag && accepting() && overDog(drag.it.x, drag.it.y));
    dogBtn.classList.toggle('nk-over', over); bowl.classList.toggle('nk-over', over);
    items.forEach(function (it?: any) {
      var a: any = it.alpha, s: any = it.scale;
      it.node.style.opacity = a.toFixed(3);
      it.node.style.visibility = a <= 0.001 ? 'hidden' : 'visible';
      it.node.style.transform = 'translate(' + (it.x - isz / 2).toFixed(1) + 'px,' + (it.y - isz / 2 - (it.mode === 'drag' ? 10 : 0)).toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
      it.node.classList.toggle('nk-lift', it.mode === 'drag');
      it.node.disabled = it.given && it.alpha <= 0.001;
    });
  }

  // ---- behaviour ------------------------------------------------------------------------------------------
  function giveBack(it?: any) { it.mode = 'back'; it.t = 0; it.x0 = it.x; it.y0 = it.y; }
  function give(it?: any) {
    report(function (A?: any) { A.track('interaction', { variant: dog.breed.id }); });
    if (!accepting() || it.given) { giveBack(it); start(); return; }
    if (!it.kind.ok) {
      giveBack(it); dog.phase = 'shake'; dog.t = 0; start(); return;
    }
    it.mode = 'fly'; it.t = 0; it.x0 = it.x; it.y0 = it.y; it.given = true; dog.lastItem = it;
    dog.phase = 'eat'; dog.t = -FLY_S; dog.given++; setMood(true);
    start();
  }
  function newRound() {
    var kinds: any = dealKinds();
    items.forEach(function (it?: any, i?: any) { setKind(it, kinds[i]); });
    items.forEach(function (it?: any) { it.given = false; it.mode = 'home'; it.x = it.hx; it.y = it.hy; it.scale = 1; it.alpha = 0; it.fade = 0.0001; it.node.disabled = false; });
    dog.given = 0;
  }

  function step(dt?: any) {
    var ph: any = dog.phase;
    dog.t += dt;
    if (ph === 'eat') {
      if (dog.t >= CHEW_S) { dog.phase = 'wag'; dog.t = 0; var d: any = mouthPt(); heartT = 0; heartX = d[0]; heartY = d[1] - dh * 0.3; }
    } else if (ph === 'wag') {
      if (dog.t >= WAG_S) {
        setMood(false);
        if (dog.given >= ROUND_ITEMS) { dog.phase = 'yawn'; dog.t = 0; setMood(true); report(function (A?: any) { A.complete(); }); }
        else { dog.phase = 'wait'; dog.t = 0; }
      }
    } else if (ph === 'shake') {
      if (dog.t >= SHAKE_S) { dog.phase = 'wait'; dog.t = 0; rot(dog.head, 0, dog.headP); }
    } else if (ph === 'yawn') {
      if (dog.t >= YAWN_S) { dog.phase = 'lie'; dog.t = 0; setMood(false); }
    } else if (ph === 'lie') {
      if (dog.t >= LIE_S) { dog.phase = 'out'; dog.t = 0; }
    } else if (ph === 'out') {
      dog.off = -W * 0.5 * ease(dog.t / OUT_S);
      if (dog.t >= OUT_S) { setBreed(pickBreed(dog.breed.id)); newRound(); dog.phase = 'in'; dog.t = 0; dog.off = -W * 0.5; }
    } else if (ph === 'in') {
      dog.off = -W * 0.5 * (1 - ease(dog.t / IN_S));
      if (dog.t >= IN_S) { dog.off = 0; dog.phase = 'wait'; dog.t = 0; }
    }
    items.forEach(function (it?: any) {
      if (it.mode === 'back') {
        it.t += dt; var e: any = ease(it.t / BACK_S);
        it.x = it.x0 + (it.hx - it.x0) * e; it.y = it.y0 + (it.hy - it.y0) * e;
        if (it.t >= BACK_S) { it.mode = 'home'; it.x = it.hx; it.y = it.hy; }
      } else if (it.mode === 'fly') {
        it.t += dt; var f: any = ease(it.t / FLY_S), tg: any = it.kind.to === 'mouth' ? mouthPt() : bowlPt();
        it.x = it.x0 + (tg[0] - it.x0) * f; it.y = it.y0 + (tg[1] - it.y0) * f; it.scale = 1 - 0.7 * f;
        if (it.t >= FLY_S) { it.mode = 'gone'; it.alpha = 0; it.scale = 1; }
      }
      if (it.fade > 0) { it.fade += dt; it.alpha = clamp(it.fade / FADE_S, 0, 1); if (it.fade >= FADE_S) { it.fade = 0; it.alpha = 1; } }
    });
    if (heartT >= 0) { heartT += dt; if (heartT >= WAG_S + 0.6) { heartT = -1; } }
  }
  function busy() {
    if (dog.phase !== 'wait' || heartT >= 0) { return true; }
    return items.some(function (it?: any) { return it.mode === 'back' || it.mode === 'fly' || it.fade > 0; });
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

  // ---- input ----------------------------------------------------------------------------------------------
  function localPt(e?: any) { var r: any = root.getBoundingClientRect(); return [clamp(e.clientX - r.left, 0, W), clamp(e.clientY - r.top, 0, H)]; }
  items.forEach(function (it?: any) {
    var b: any = it.node;
    b.addEventListener('pointerdown', function (e?: any) {
      if (drag || it.given || (it.mode !== 'home' && it.mode !== 'back')) { return; }
      drag = { id: e.pointerId, it: it, moved: false };
      it.mode = 'drag'; try { b.setPointerCapture(e.pointerId); } catch (x: any) { /* unsupported */ }
      var p: any = localPt(e); it.x = p[0]; it.y = p[1]; render(); e.preventDefault();
    });
    b.addEventListener('pointermove', function (e?: any) {
      if (!drag || drag.it !== it || e.pointerId !== drag.id) { return; }
      var p: any = localPt(e); it.x = p[0]; it.y = p[1]; drag.moved = true; render();
    });
    b.addEventListener('pointerup', function (e?: any) {
      if (!drag || drag.it !== it || e.pointerId !== drag.id) { return; }
      drag = null;
      try { b.releasePointerCapture(e.pointerId); } catch (x: any) { /* already released */ }
      if (overDog(it.x, it.y)) { give(it); } else { giveBack(it); start(); }
      render();
    });
    b.addEventListener('pointercancel', function (e?: any) {
      if (!drag || drag.it !== it || e.pointerId !== drag.id) { return; }
      drag = null; giveBack(it); render(); start();
    });
    b.addEventListener('click', function (e?: any) {
      if (e.detail !== 0 || it.given || (it.mode !== 'home' && it.mode !== 'back')) { return; }   // pointer taps are handled above
      var m: any = bowlPt(); it.x = m[0]; it.y = m[1] + 30; give(it); render();
    });
  });

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  setBreed(pickBreed(lastBreed));
  layout();
  start();

  return function cleanup() {
    alive = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function NakarmActivity() {
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
