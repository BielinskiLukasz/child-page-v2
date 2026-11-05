// Activity "Zbuduj Rakietę": the child assembles a rocket from 4 slots (nose, body, fins, engine), 3 variants each, shown as big
// pictures in a tray in a random order. Dragging a part onto its slot snaps it in (a wrong slot or anywhere else: it drifts back
// gently, no failure feedback; placing a slot again replaces the earlier part). When all 4 slots are full a big glowing launch button
// appears. Launch: numerals 3-2-1, then the rocket built from exactly the chosen parts flies up through the sky and stars (9 s),
// the Moon surface slides into view and the rocket lands (2 s); an astronaut appears and waves for 4 s, then the scene fades and a
// new empty assembly appears with the tray shuffled again.
// Under prefers-reduced-motion the numerals, flight and landing are shortened (0.5 s / 1.2 s / 0.4 s) and the astronaut only raises an arm,
// but every state is still reached. All visuals are driven from JS in one capped-dt rAF loop (final states never exist only in a CSS
// keyframe); the loop pauses while hidden and stops when idle. Keyboard: Tab to a part, Enter/Space places it in its slot; Tab to the
// launch button, Enter launches. Nothing is scored or stored. Usage metrics: track('interaction', {variant}) for each placed part and the
// launch; Analytics.complete() when the rocket has landed; the activity stays open-ended (a new round starts by itself).
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';
import { Rand } from '../utils/rand';

var COUNT_S: any = 1.0, FLY_S: any = 9.0, LAND_S: any = 2.0, ASTRO_S: any = 4.0, FADE_S: any = 0.5, BACK_S: any = 0.5, FLYIN_S: any = 0.2, POP_S: any = 0.3;
var RM_COUNT_S: any = 0.5, RM_FLY_S: any = 1.2, RM_LAND_S: any = 0.4;
var TOP_PAD: any = 56, MAX_DT: any = 0.05, SLOT_PAD: any = 20;
var TRAY_KINDS: any = ['nose', 'body', 'fins', 'engine'];   // tray group order, top of the rocket first
var ORDER: any = ['fins', 'engine', 'body', 'nose'];   // drawing order (fins behind the body)
// Slot rectangles in rocket units (the rocket is 120 x 240); a part's SVG uses its slot rectangle as viewBox.
var SLOTS: any = {
  nose: { vb: [20, 0, 80, 60], code: 'n' },
  body: { vb: [20, 56, 80, 112], code: 'b' },
  fins: { vb: [0, 120, 120, 84], code: 'f' },
  engine: { vb: [16, 164, 88, 76], code: 'e' }
};
var PARTS: any = {
  nose: [
    '<path d="M60 2Q84 26 100 58H20Q36 26 60 2z" fill="#f7a8c9"/><path d="M48 40Q52 24 60 14" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>',
    '<path d="M20 58Q20 6 60 6Q100 6 100 58z" fill="#ffd98a"/><path d="M34 40Q40 20 54 14" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>',
    '<path d="M60 0L92 58H28z" fill="#a8d8f0"/><circle cx="60" cy="38" r="6" fill="#fdfbff"/>'
  ],
  body: [
    '<rect x="24" y="56" width="72" height="112" rx="10" fill="#fdfbff"/><circle cx="60" cy="96" r="17" fill="#cfeaf7" stroke="#a8d8f0" stroke-width="5"/><rect x="24" y="128" width="72" height="8" fill="#f7a8c9"/>',
    '<rect x="24" y="56" width="72" height="112" rx="14" fill="#b8e6c9"/><circle cx="60" cy="88" r="12" fill="#fdfbff" stroke="#8fcfa8" stroke-width="4"/><circle cx="60" cy="126" r="12" fill="#fdfbff" stroke="#8fcfa8" stroke-width="4"/>',
    '<path d="M30 56H90L98 168H22z" fill="#ffd98a"/><path d="M26 130H94" stroke="#f4a261" stroke-width="8"/><path d="M60 68l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#fff"/>'
  ],
  fins: [
    '<path d="M30 124L4 200L30 178z" fill="#f7a8c9"/><path d="M90 124L116 200L90 178z" fill="#f7a8c9"/>',
    '<path d="M30 130Q0 150 6 200Q22 190 30 170z" fill="#a8d8f0"/><path d="M90 130Q120 150 114 200Q98 190 90 170z" fill="#a8d8f0"/>',
    '<path d="M30 136L10 158L22 204L30 178z" fill="#c9b8f2"/><path d="M90 136L110 158L98 204L90 178z" fill="#c9b8f2"/><path d="M52 150L60 204L68 150z" fill="#c9b8f2"/>'
  ],
  engine: [
    '<path d="M42 164H78L90 230H30z" fill="#8d8aa3"/><rect x="34" y="226" width="52" height="8" rx="4" fill="#6f6c85"/>',
    '<rect x="40" y="164" width="40" height="52" fill="#f4a261"/><rect x="40" y="180" width="40" height="6" fill="#e08a45"/><path d="M36 216H84L92 236H28z" fill="#e08a45"/>',
    '<path d="M44 164H76Q84 200 104 232H16Q36 200 44 164z" fill="#a8d8f0"/><path d="M30 232H90" stroke="#8fc6e6" stroke-width="6" stroke-linecap="round"/>'
  ]
};
var ASTRO_SVG: any = '<svg viewBox="0 0 60 90" aria-hidden="true" focusable="false">' +
  '<rect x="14" y="62" width="12" height="22" rx="6" fill="#fdfbff"/><rect x="32" y="62" width="12" height="22" rx="6" fill="#fdfbff"/>' +
  '<rect x="12" y="80" width="16" height="8" rx="4" fill="#c9b8f2"/><rect x="30" y="80" width="16" height="8" rx="4" fill="#c9b8f2"/>' +
  '<rect x="8" y="34" width="14" height="30" rx="6" fill="#a8d8f0"/>' +
  '<rect x="12" y="32" width="34" height="38" rx="14" fill="#fdfbff"/><rect x="21" y="44" width="16" height="10" rx="3" fill="#f7a8c9"/>' +
  '<g class="zr-arm"><rect x="-4" y="-5" width="28" height="10" rx="5" fill="#fdfbff"/><circle cx="24" cy="0" r="6" fill="#c9b8f2"/></g>' +
  '<rect x="7" y="38" width="12" height="10" rx="5" fill="#fdfbff"/>' +
  '<circle cx="29" cy="20" r="18" fill="#fdfbff" stroke="#c9b8f2" stroke-width="3"/><circle cx="29" cy="21" r="12.5" fill="#cfeaf7"/>' +
  '<circle cx="24.5" cy="19" r="1.8" fill="#5b5675"/><circle cx="33.5" cy="19" r="1.8" fill="#5b5675"/><path d="M24.5 25Q29 29 33.5 25" fill="none" stroke="#5b5675" stroke-width="1.8" stroke-linecap="round"/></svg>';
var LAUNCH_ICON: any = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="29" fill="#ffd98a" stroke="#f4a261" stroke-width="4"/>' +
  '<path d="M32 10Q46 22 44 40H20Q18 22 32 10z" fill="#fdfbff"/><circle cx="32" cy="27" r="5" fill="#a8d8f0"/><path d="M20 38L12 50L22 46zM44 38L52 50L42 46z" fill="#f7a8c9"/><path d="M26 42Q32 58 38 42z" fill="#f4a261"/></svg>';

function clamp(v?: any, a?: any, b?: any) { return v < a ? a : v > b ? b : v; }
function ease(t?: any) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function lerp(a?: any, b?: any, u?: any) { return a + (b - a) * u; }
function report(fn?: any) { try { if (Analytics) { fn(Analytics); } } catch (e: any) { /* metrics must never break the activity */ } }
function shuffled(list?: any) {
  if (Rand && Rand.shuffle) { return Rand.shuffle(list); }
  var a: any = list.slice(), i: any, j: any, t: any;
  for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function partSvg(kind?: any, idx?: any) {
  var v: any = SLOTS[kind].vb;
  return '<svg viewBox="' + v.join(' ') + '" aria-hidden="true" focusable="false">' + PARTS[kind][idx] + '</svg>';
}
function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var root: any = document.createElement('div');
  root.className = 'zr';
  var starHtml: any = '', i: any;
  for (i = 0; i < 40; i++) {
    starHtml += '<circle cx="' + (Math.random() * 100).toFixed(1) + '" cy="' + (Math.random() * 160 - 60).toFixed(1) + '" r="' + (0.35 + Math.random() * 0.5).toFixed(2) + '" fill="#fff4cf"/>';
  }
  var rocketInner: any = ORDER.map(function (k?: any) { return '<g class="zr-p zr-p-' + k + '"></g>'; }).join('');
  var ghosts: any = ORDER.map(function (k?: any) {
    var v: any = SLOTS[k].vb;
    return '<rect class="zr-ghost zr-ghost-' + k + '" x="' + (v[0] + 2) + '" y="' + (v[1] + 2) + '" width="' + (v[2] - 4) + '" height="' + (v[3] - 4) + '" rx="10" fill="rgba(255,255,255,.35)" stroke="#8f7fd1" stroke-width="3" stroke-dasharray="7 6"/>';
  }).join('');
  root.innerHTML =
    '<div class="zr-sky"></div><div class="zr-night"></div>' +
    '<svg class="zr-stars" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + starHtml + '</svg>' +
    '<div class="zr-moon"><i class="zr-cr zr-cr1"></i><i class="zr-cr zr-cr2"></i><i class="zr-cr zr-cr3"></i></div>' +
    '<div class="zr-ground"></div>' +
    '<div class="zr-tray"></div>' +
    '<div class="zr-rocket"><svg viewBox="0 0 120 240" aria-hidden="true" focusable="false">' +
    '<g class="zr-flame"><path d="M44 232Q60 306 76 232z" fill="#ffd98a"/><path d="M52 232Q60 272 68 232z" fill="#fff4cf"/></g>' + rocketInner + ghosts + '</svg></div>' +
    '<div class="zr-astro">' + ASTRO_SVG + '</div>' +
    '<button type="button" class="zr-launch" aria-label="Start rakiety. Naciśnij Enter, aby wystrzelić rakietę na Księżyc.">' + LAUNCH_ICON + '</button>' +
    '<div class="zr-count" aria-hidden="true"></div>' +
    '<div class="zr-veil"></div>';
  container.appendChild(root);
  var q: any = function (s?: any) { return root.querySelector(s); };
  var skyN: any = q('.zr-night'), starsEl: any = q('.zr-stars'), moon: any = q('.zr-moon'), ground: any = q('.zr-ground'), tray: any = q('.zr-tray');
  var rocket: any = q('.zr-rocket'), flame: any = q('.zr-flame'), astro: any = q('.zr-astro'), arm: any = q('.zr-arm');
  var launch: any = q('.zr-launch'), countEl: any = q('.zr-count'), veil: any = q('.zr-veil');
  var pEls: any = {}, gEls: any = {};
  ORDER.forEach(function (k?: any) { pEls[k] = q('.zr-p-' + k); gEls[k] = q('.zr-ghost-' + k); });

  var W: any = 320, H: any = 568, land: any = false, s: any = 80, trayH: any = 0, trayW: any = 0, trayX: any = 0, trayY: any = 0;
  var kB: any = 1, rcx: any = 160, bBot: any = 400, kF: any = 0.5, padBot: any = 450, flBot: any = 330, surfY: any = 400;
  var chosen: any = { nose: -1, body: -1, fins: -1, engine: -1 }, pop: any = { nose: 1, body: 1, fins: 1, engine: 1 };
  var phase: any = 'build', t: any = 0, lb: any = 0, trayA: any = 1, hot: any = '', rm: any = false;
  var alive: any = true, raf: any = 0, last: any = 0, drag: any = null;
  var items: any = [];

  // ---- tray ------------------------------------------------------------------------------------------------
  function buildTray() {
    items.forEach(function (it?: any) { if (it.node.parentNode) { it.node.parentNode.removeChild(it.node); } });
    items = [];
    var list: any = [];
    // Grouped by kind (tray column in portrait, row in landscape); the variants inside a group are shuffled.
    TRAY_KINDS.forEach(function (k?: any, g?: any) {
      var vs: any = shuffled([0, 1, 2]);
      for (var v: any = 0; v < 3; v++) { list.push({ kind: k, idx: vs[v], g: g, v: v }); }
    });
    list.forEach(function (d?: any) {
      var b: any = document.createElement('button');
      b.type = 'button'; b.className = 'zr-item'; b.innerHTML = partSvg(d.kind, d.idx);
      b.setAttribute('aria-label', 'Część rakiety: ' + ({ nose: 'dziób', body: 'kadłub', fins: 'stateczniki', engine: 'silnik' } as Record<string, string>)[d.kind] + ' ' + (d.idx + 1) + '. Przeciągnij na rakietę lub naciśnij Enter.');
      root.appendChild(b);
      var it: any = { kind: d.kind, idx: d.idx, node: b, hx: 0, hy: 0, x: 0, y: 0, x0: 0, y0: 0, mode: 'home', t: 0, scale: 1, g: d.g, v: d.v };
      items.push(it); wire(it);
    });
    layout();
  }

  // ---- geometry --------------------------------------------------------------------------------------------
  function layout() {
    var r: any = root.getBoundingClientRect();
    W = Math.max(280, r.width); H = Math.max(240, r.height);
    land = W > H * 1.05;
    var regionW: any, regionH: any, regionTop: any = TOP_PAD, cols: any, rows: any;
    if (land) {
      cols = 3; rows = 4; s = clamp(Math.floor((H - 16) / rows), 72, 104);
      trayW = cols * s + 16; trayH = rows * s + 12; trayX = W - trayW; trayY = Math.max(4, (H - trayH) / 2);
      regionW = trayX; regionH = H - TOP_PAD;
    } else {
      cols = 4; rows = 3; s = clamp(Math.floor((W - 16) / cols), 72, 120);
      trayW = cols * s + 16; trayH = rows * s + 12; trayX = (W - trayW) / 2; trayY = H - trayH - 4;
      regionW = W; regionH = trayY - TOP_PAD;
    }
    tray.style.cssText = 'left:' + trayX + 'px;top:' + trayY + 'px;width:' + trayW + 'px;height:' + trayH + 'px';
    kB = clamp(Math.min(regionH / 250, (regionW - 200) / 120, 1.8), 0.4, 1.8);
    rcx = regionW / 2; bBot = regionTop + (regionH - 240 * kB) / 2 + 240 * kB;
    kF = Math.min(kB, 0.4 * H / 240);
    padBot = H * 0.8; flBot = H * 0.58; surfY = H * 0.72;
    var side: any = (regionW - 120 * kB) / 2, lsz: any = clamp(side - 12, 72, 104);
    launch.dataset.size = String(lsz);
    launch.style.width = launch.style.height = lsz + 'px';
    launch.dataset.x = String(rcx + 60 * kB + side / 2 - lsz / 2);
    launch.dataset.y = String(bBot - 120 * kB - lsz / 2);
    items.forEach(function (it?: any) {
      var c: any = land ? it.v : it.g, rw: any = land ? it.g : it.v;
      it.hx = trayX + 8 + (c + 0.5) * s; it.hy = trayY + 6 + (rw + 0.5) * s;
      it.node.style.width = it.node.style.height = s + 'px';
      if (it.mode === 'home' || it.mode === 'back') { it.mode = 'home'; it.x = it.hx; it.y = it.hy; }
    });
    render();
  }
  // Rocket pose (centre x, bottom y, scale, flame scale) for the current phase.
  function pose() {
    var cs: any = rm ? RM_COUNT_S : COUNT_S, fs: any = rm ? RM_FLY_S : FLY_S, ls: any = rm ? RM_LAND_S : LAND_S;
    var b: any = { x: rcx, y: bBot, k: kB, f: 0 }, pad: any = { x: W / 2, y: padBot, k: kF, f: 0 };
    if (phase === 'build') { return b; }
    if (phase === 'count') {
      var u: any = ease(t / (cs * 0.9)), fl: any = clamp((t - cs * 2) / cs, 0, 1) * 0.5;
      return { x: lerp(b.x, pad.x, u), y: lerp(b.y, pad.y, u), k: lerp(b.k, pad.k, u), f: fl };
    }
    if (phase === 'fly') { var p: any = ease(t / fs); return { x: pad.x, y: lerp(pad.y, flBot, p), k: kF, f: 1 }; }
    if (phase === 'land') { return { x: pad.x, y: lerp(flBot, surfY + 8, ease(t / ls)), k: kF, f: 1 - ease(t / (ls * 0.8)) }; }
    if (phase === 'astro') { return { x: pad.x, y: surfY + 8, k: kF, f: 0 }; }
    if (phase === 'fadeout' || phase === 'fadein') { return { x: pad.x, y: surfY + 8, k: kF, f: 0 }; }
    return b;
  }
  function progress() {
    var fs: any = rm ? RM_FLY_S : FLY_S;
    if (phase === 'build') { return 0; }
    if (phase === 'count') { return 0; }
    if (phase === 'fly') { return clamp(t / fs, 0, 1); }
    return 1;
  }
  function slotRect(kind?: any, ps?: any) {
    var v: any = SLOTS[kind].vb, k: any = ps.k, x0: any = ps.x - 60 * k, y0: any = ps.y - 240 * k;
    return { l: x0 + v[0] * k - SLOT_PAD, t: y0 + v[1] * k - SLOT_PAD, r: x0 + (v[0] + v[2]) * k + SLOT_PAD, b: y0 + (v[1] + v[3]) * k + SLOT_PAD,
      cx: x0 + (v[0] + v[2] / 2) * k, cy: y0 + (v[1] + v[3] / 2) * k };
  }
  function allFull() { return ORDER.every(function (k?: any) { return chosen[k] >= 0; }); }

  // ---- rendering -------------------------------------------------------------------------------------------
  function render() {
    var ps: any = pose(), p: any = progress(), building: any = phase === 'build';
    rocket.style.transform = 'translate(' + (ps.x - 60 * ps.k).toFixed(1) + 'px,' + (ps.y - 240 * ps.k).toFixed(1) + 'px) scale(' + ps.k.toFixed(4) + ')';
    var fsc: any = ps.f > 0 ? ps.f * (1 + 0.12 * Math.sin(t * 22)) : 0;
    flame.setAttribute('transform', 'translate(0 232) scale(1 ' + fsc.toFixed(3) + ') translate(0 -232)');
    flame.setAttribute('display', fsc > 0.01 ? 'inline' : 'none');
    ORDER.forEach(function (k?: any) {
      var on: any = chosen[k] >= 0, pv: any = pop[k];
      pEls[k].setAttribute('opacity', on ? ease(pv).toFixed(3) : '0');
      gEls[k].setAttribute('display', building && !on ? 'inline' : 'none');
      var h: any = hot === k;
      gEls[k].setAttribute('stroke', h ? '#f4a261' : '#8f7fd1'); gEls[k].setAttribute('stroke-width', h ? '6' : '3');
      gEls[k].setAttribute('fill', h ? 'rgba(255,226,122,.7)' : 'rgba(255,255,255,.35)');
    });
    // sky, stars, ground and Moon follow the flight progress
    var night: any = ease((p - 0.2) / 0.45);   // blue sky first, then dark sky with stars, the Moon only after that
    skyN.style.opacity = night.toFixed(3);
    starsEl.style.opacity = night.toFixed(3);
    starsEl.style.transform = 'translateY(' + (p * H * 0.55).toFixed(1) + 'px)';
    var gy: any = padBot + H * 0.6 * ease(p / 0.45), gOp: any = building ? 0 : 1;
    if (phase === 'count') { gOp = ease(t / ((rm ? RM_COUNT_S : COUNT_S) * 0.8)); }
    ground.style.opacity = gOp.toFixed(3); ground.style.transform = 'translateY(' + gy.toFixed(1) + 'px)';
    var sy: any = lerp(-H * 1.35, surfY, ease((p - 0.7) / 0.3));   // starts fully above the screen
    moon.style.transform = 'translateY(' + sy.toFixed(1) + 'px)';
    // tray and launch button
    tray.style.opacity = trayA.toFixed(3); tray.style.visibility = trayA <= 0.001 ? 'hidden' : 'visible';
    var ls: any = ease(lb);
    launch.style.transform = 'translate(' + (+launch.dataset.x).toFixed(1) + 'px,' + (+launch.dataset.y).toFixed(1) + 'px) scale(' + ls.toFixed(3) + ')';
    launch.style.visibility = ls <= 0.001 ? 'hidden' : 'visible';
    launch.style.opacity = Math.min(1, ls * 1.5).toFixed(3);
    launch.disabled = !(building && allFull());
    items.forEach(function (it?: any) {
      it.node.style.transform = 'translate(' + (it.x - s / 2).toFixed(1) + 'px,' + (it.y - s / 2).toFixed(1) + 'px) scale(' + it.scale.toFixed(3) + ')';
      it.node.style.opacity = trayA.toFixed(3);
      it.node.style.visibility = trayA <= 0.001 ? 'hidden' : 'visible';
      it.node.disabled = !building;
      it.node.classList.toggle('zr-lift', it.mode === 'drag');
    });
    // count-down numeral
    var cs: any = rm ? RM_COUNT_S : COUNT_S;
    if (phase === 'count' && t < cs * 3) {
      var n: any = 3 - Math.floor(t / cs), local: any = (t % cs) / cs;
      if (countEl.textContent !== String(n)) { countEl.textContent = String(n); }
      countEl.style.opacity = (local < 0.8 ? 1 : (1 - local) / 0.2).toFixed(3);
      countEl.style.transform = 'translate(-50%,-50%) scale(' + (rm ? 1 : lerp(1.4, 1, ease(local * 3))).toFixed(3) + ')';
    } else { countEl.style.opacity = '0'; }
    // astronaut on the Moon
    var ah: any = Math.max(64, 100 * kF), aw: any = ah * 2 / 3, au: any = 0, wave: any = 0;
    if (phase === 'astro') { au = ease(t / 0.4); wave = rm ? -55 : -50 + 28 * Math.sin(t * 6.5); }
    else if (phase === 'fadeout' || phase === 'fadein') { au = 1; wave = -50; }
    astro.style.width = aw + 'px'; astro.style.height = ah + 'px';
    astro.style.opacity = au.toFixed(3); astro.style.visibility = au <= 0.001 ? 'hidden' : 'visible';
    astro.style.transform = 'translate(' + (W / 2 + 60 * kF + 8 + aw * 0.2).toFixed(1) + 'px,' + (surfY + 10 - ah * (0.8 + 0.2 * au)).toFixed(1) + 'px) scale(' + (0.7 + 0.3 * au).toFixed(3) + ')';
    arm.setAttribute('transform', 'translate(42 42) rotate(' + wave.toFixed(1) + ')');
    var vo: any = phase === 'fadeout' ? ease(t / FADE_S) : phase === 'fadein' ? 1 - ease(t / FADE_S) : 0;
    veil.style.opacity = vo.toFixed(3);
  }

  // ---- behaviour -------------------------------------------------------------------------------------------
  function place(it?: any) {
    chosen[it.kind] = it.idx; pop[it.kind] = 0;
    pEls[it.kind].innerHTML = PARTS[it.kind][it.idx];   // the part group is empty until a part is placed
    report(function (A?: any) { A.track('interaction', { variant: SLOTS[it.kind].code + (it.idx + 1) }); });
    if (allFull() && lb <= 0) { lb = 0.0001; }
  }
  function giveBack(it?: any) { it.mode = 'back'; it.t = 0; it.x0 = it.x; it.y0 = it.y; }
  function startLaunch() {
    if (phase !== 'build' || !allFull()) { return; }
    report(function (A?: any) { A.track('interaction', { variant: 'launch' }); });
    rm = reduced(); phase = 'count'; t = 0;
    if (drag) { drag.it.mode = 'home'; drag = null; }
    start();
  }
  function resetRound() {
    ORDER.forEach(function (k?: any) { chosen[k] = -1; pop[k] = 1; pEls[k].innerHTML = ''; });
    lb = 0; trayA = 0; hot = ''; buildTray();
  }
  function enter(ph?: any) { phase = ph; t = 0; }
  function step(dt?: any) {
    var cs: any = rm ? RM_COUNT_S : COUNT_S, fs: any = rm ? RM_FLY_S : FLY_S, ls: any = rm ? RM_LAND_S : LAND_S;
    t += dt;
    ORDER.forEach(function (k?: any) { if (pop[k] < 1) { pop[k] = Math.min(1, pop[k] + dt / POP_S); } });
    if (lb > 0 && lb < 1 && phase === 'build') { lb = Math.min(1, lb + dt / 0.3); }
    if (phase === 'build') { trayA = Math.min(1, trayA + dt / 0.3); }
    if (phase === 'count') {
      trayA = Math.max(0, trayA - dt / 0.4); lb = Math.max(0, lb - dt / 0.3);
      if (t >= cs * 3) { enter('fly'); }
    } else if (phase === 'fly') { if (t >= fs) { enter('land'); } }
    else if (phase === 'land') {
      if (t >= ls) { enter('astro'); report(function (A?: any) { A.complete(); }); }
    } else if (phase === 'astro') { if (t >= ASTRO_S) { enter('fadeout'); } }
    else if (phase === 'fadeout') {
      if (t >= FADE_S) { resetRound(); enter('fadein'); }
    } else if (phase === 'fadein') {
      trayA = 1;
      if (t >= FADE_S) { enter('build'); }
    }
    items.forEach(function (it?: any) {
      if (it.mode === 'back') {
        it.t += dt; var e: any = ease(it.t / BACK_S);
        it.x = lerp(it.x0, it.hx, e); it.y = lerp(it.y0, it.hy, e); it.scale = lerp(1.12, 1, e);
        if (it.t >= BACK_S) { it.mode = 'home'; it.x = it.hx; it.y = it.hy; it.scale = 1; }
      } else if (it.mode === 'fly') {
        it.t += dt; var f: any = ease(it.t / FLYIN_S), tg: any = slotRect(it.kind, pose());
        it.x = lerp(it.x0, tg.cx, f); it.y = lerp(it.y0, tg.cy, f); it.scale = lerp(1.12, 0.6, f);
        if (it.t >= FLYIN_S) { it.mode = 'home'; it.x = it.hx; it.y = it.hy; it.scale = 1; place(it); }
      }
    });
  }
  function busy() {
    if (phase !== 'build') { return true; }
    if (lb > 0 && lb < 1) { return true; }
    if (trayA < 1) { return true; }
    if (ORDER.some(function (k?: any) { return pop[k] < 1; })) { return true; }
    return items.some(function (it?: any) { return it.mode === 'back' || it.mode === 'fly'; });
  }
  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min((now - last) / 1000, MAX_DT); last = now;
    step(dt); render();
    if (alive && !document.hidden && busy() && !raf) { raf = requestAnimationFrame(frame); }
  }
  function start() {
    if (raf || document.hidden || !alive) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() { if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); } }
  function onResize() { layout(); start(); }

  // ---- input -----------------------------------------------------------------------------------------------
  function localPt(e?: any) { var r: any = root.getBoundingClientRect(); return [clamp(e.clientX - r.left, 0, W), clamp(e.clientY - r.top, 0, H)]; }
  function inSlot(it?: any, x?: any, y?: any) {
    var r: any = slotRect(it.kind, pose());
    return x >= r.l && x <= r.r && y >= r.t && y <= r.b;
  }
  function setHot(it?: any) {
    var h: any = it && it.mode === 'drag' && inSlot(it, it.x, it.y) ? it.kind : '';
    if (h !== hot) { hot = h; render(); }
  }
  function wire(it?: any) {
    var b: any = it.node;
    b.addEventListener('pointerdown', function (e?: any) {
      if (drag || phase !== 'build' || (it.mode !== 'home' && it.mode !== 'back')) { return; }
      drag = { id: e.pointerId, it: it };
      it.mode = 'drag'; it.scale = 1.12;
      try { b.setPointerCapture(e.pointerId); } catch (x: any) { /* unsupported */ }
      var p: any = localPt(e); it.x = p[0]; it.y = p[1]; setHot(it); render(); e.preventDefault();
    });
    b.addEventListener('pointermove', function (e?: any) {
      if (!drag || drag.it !== it || e.pointerId !== drag.id) { return; }
      var p: any = localPt(e); it.x = p[0]; it.y = p[1]; setHot(it); render();
    });
    b.addEventListener('pointerup', function (e?: any) {
      if (!drag || drag.it !== it || e.pointerId !== drag.id) { return; }
      drag = null;
      try { b.releasePointerCapture(e.pointerId); } catch (x: any) { /* already released */ }
      var ok: any = inSlot(it, it.x, it.y);
      hot = '';
      if (ok) { it.mode = 'fly'; it.t = 0; it.x0 = it.x; it.y0 = it.y; } else { giveBack(it); }
      render(); start();
    });
    b.addEventListener('pointercancel', function (e?: any) {
      if (!drag || drag.it !== it || e.pointerId !== drag.id) { return; }
      drag = null; hot = ''; giveBack(it); render(); start();
    });
    b.addEventListener('click', function (e?: any) {
      if (e.detail !== 0 || phase !== 'build' || (it.mode !== 'home' && it.mode !== 'back')) { return; }   // pointer taps are handled above
      it.mode = 'fly'; it.t = 0; it.x0 = it.x; it.y0 = it.y; it.scale = 1.12; start();
    });
  }
  launch.addEventListener('click', startLaunch);

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  buildTray();
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

export default function ZbudujActivity() {
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
