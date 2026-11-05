// Activity "Zabawa w chowanego": a garden with 4 hiding places (bush, box, tree, barrel); 3 hide an animal that
// peeks out (rabbit, cat, bear), the 4th hides a flower. Touch a place to lift its cover slowly (~1.5 s) and reveal
// what is behind it; touch it again to close it. When every place has been opened once they glow ~2 s, close slowly
// and the animals move to new places. While all are closed the animals sometimes quietly swap places.
// No wrong answers, no sound. One capped-dt rAF loop (works under prefers-reduced-motion, where covers fade instead
// of moving; pauses while hidden); fixed DOM of 4 buttons; nothing is stored.
import { useEffect, useRef } from 'react';
import { Animals } from '../utils/animals';
import { Rand } from '../utils/rand';

var MOVE_S: any = 1.5, GLOW_S: any = 2, HOP_S: any = 0.7, SWAP_IDLE_S: any = 7, FADE_S: any = 0.9;
var PLACES: any = [
  { label: 'krzak', ox: 0,
    cover: '<g fill="#9fd4a8"><circle cx="30" cy="66" r="22"/><circle cx="55" cy="56" r="26"/><circle cx="77" cy="68" r="19"/><rect x="12" y="70" width="80" height="26" rx="12"/></g>' +
      '<g fill="#bfe6b4"><circle cx="40" cy="52" r="5"/><circle cx="64" cy="46" r="4"/><circle cx="26" cy="74" r="4"/><circle cx="80" cy="76" r="4"/></g>' },
  { label: 'pudło', ox: 0,
    cover: '<rect x="14" y="40" width="72" height="56" rx="8" fill="#e8c9a0"/><rect x="10" y="34" width="80" height="14" rx="6" fill="#d9b185"/>' +
      '<path d="M22 62H78M22 78H78" stroke="#c9a070" stroke-width="3" stroke-linecap="round"/>' },
  // the tree is wide enough to hide a whole animal (crown + thick trunk), so only a gentle rustle tells the child where to look
  { label: 'drzewo', ox: 0, rustle: true,
    cover: '<rect x="22" y="58" width="56" height="38" rx="10" fill="#c9a98a"/><circle cx="50" cy="46" r="41" fill="#9fd4a8"/>' +
      '<circle cx="28" cy="50" r="6" fill="#bfe6b4"/><circle cx="62" cy="22" r="6" fill="#bfe6b4"/><circle cx="72" cy="56" r="5" fill="#bfe6b4"/><ellipse cx="50" cy="78" rx="7" ry="10" fill="#a98b6c"/>' },
  { label: 'beczka', ox: 0,
    cover: '<rect x="16" y="40" width="68" height="56" rx="16" fill="#d9b8e8"/><path d="M16 56H84M16 80H84" stroke="#b894cc" stroke-width="5"/>' +
      '<path d="M26 44q-6 24 0 48" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4" stroke-linecap="round"/>' }
];
// Four random animals per launch (shared family, js/animals.js); three of them hide behind the places at a time
// and the fourth waits in turn, so every picked animal shows up while the game goes on.
function animalSvg(a?: any) {
  return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g transform="translate(50 58) scale(1.3)">' +
    '<ellipse cx="0" cy="24" rx="20" ry="12.3" fill="' + a.fur + '"/>' + Animals.head(a.id) + '</g></svg>';
}
var FLOWER: any = '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M50 92V64" stroke="#7fbf8f" stroke-width="5" stroke-linecap="round"/>' +
  '<path d="M50 84q-14-2-16-14 13 1 16 14z" fill="#9fd4a8"/><g fill="#f7a8c9"><circle cx="50" cy="48" r="9"/><circle cx="38" cy="58" r="9"/><circle cx="62" cy="58" r="9"/><circle cx="41" cy="45" r="9"/><circle cx="59" cy="45" r="9"/></g>' +
  '<circle cx="50" cy="54" r="7" fill="#ffe9a8"/></svg>';

function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
// occupant per place: animal index 0..3 or -1 (flower); exactly one empty place and three of the four animals out.
function arrangement(avoid?: any) {
  var a: any;
  do {
    var empty: any = Math.floor(Math.random() * 4), an: any = Rand.pick([0, 1, 2, 3], 3);
    a = []; for (var i: any = 0; i < 4; i++) { a.push(i === empty ? -1 : an.pop()); }
  } while (avoid && a.every(function (v?: any, i?: any) { return v === avoid[i]; }));
  return a;
}

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var board: any = document.createElement('div');
  board.className = 'hd';
  board.innerHTML = '<div class="hd-field"></div>';
  container.appendChild(board);
  var field: any = board.querySelector('.hd-field');

  var ANIMALS: any = Animals.pick(4), occ: any = arrangement(null), spots: any = [];
  var phase: any = 'play', phaseT: any = 0, idleT: any = 0, glow: any = 0, fadeJob: any = null, raf: any = 0, last: any = 0, clock: any = 0;

  PLACES.forEach(function (pl?: any, i?: any) {
    var el: any = document.createElement('button');
    el.type = 'button'; el.className = 'hd-spot';
    el.setAttribute('aria-label', 'Kryjówka: ' + pl.label);
    el.setAttribute('aria-expanded', 'false');
    el.innerHTML = '<span class="hd-flower">' + FLOWER + '</span><span class="hd-ani"></span>' +
      '<svg class="hd-cov" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<ellipse cx="50" cy="96" rx="44" ry="5" fill="#000" fill-opacity=".07"/>' + pl.cover + '</svg>';
    field.appendChild(el);
    var s: any = { i: i, el: el, ani: el.querySelector('.hd-ani'), flower: el.querySelector('.hd-flower'), cov: el.querySelector('.hd-cov'),
      o: 0, t: 0, opened: false, hop: -1, op: 1, shown: -2 };
    spots.push(s);
    el.addEventListener('click', function () { toggle(s); });
  });

  function setAnimal(s?: any) {
    if (s.shown === occ[s.i]) { return; }
    s.shown = occ[s.i];
    s.ani.innerHTML = s.shown >= 0 ? animalSvg(ANIMALS[s.shown]) : '';
  }
  function moving(s?: any) { return s.o !== s.t; }
  function toggle(s?: any) {
    if (phase !== 'play' || moving(s)) { return; } // touches during a movement (or the glow/close phases) are ignored
    s.t = s.t ? 0 : 1;
    s.el.setAttribute('aria-expanded', s.t ? 'true' : 'false');
    s.el.style.zIndex = '2';
    idleT = 0;
    start();
  }

  function paintSpot(s?: any) {
    var u: any = smooth(s.o), rm: any = reduced();
    s.cov.style.transform = rm ? '' : 'translateY(' + (-38 * u).toFixed(1) + '%)';
    var cop: any = rm ? 1 - u : 1 - 0.6 * u;
    if (PLACES[s.i].rustle && occ[s.i] >= 0 && s.o === 0) {
      // gentle rustling cue while an animal hides behind the closed tree: a soft pulse every ~7 s (opacity only when motion is reduced)
      var env: any = Math.pow(Math.max(0, Math.sin(clock * 0.9)), 2);
      if (rm) { cop = 1 - 0.14 * env; }
      else { s.cov.style.transformOrigin = '50% 100%'; s.cov.style.transform = 'rotate(' + (env * 2.6 * Math.sin(clock * 11)).toFixed(2) + 'deg)'; }
    }
    s.cov.style.opacity = cop.toFixed(3);
    s.flower.style.opacity = occ[s.i] < 0 ? u.toFixed(3) : '0';
    var hop: any = s.hop >= 0 && !rm ? Math.sin(Math.PI * Math.min(1, s.hop / HOP_S)) * 7 : 0;
    s.ani.style.transform = 'translate(' + (PLACES[s.i].ox) + '%,' + (-hop).toFixed(1) + '%)';
    s.ani.style.opacity = s.op.toFixed(3);
    s.el.style.filter = glow > 0.01 ? 'drop-shadow(0 0 ' + (6 + 14 * glow) + 'px #ffe08a)' : '';
  }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min((now - last) / 1000, 0.05); last = now; clock += dt;
    var rate: any = dt / (reduced() ? MOVE_S * 0.5 : MOVE_S);
    spots.forEach(function (s?: any) {
      if (s.o !== s.t) {
        s.o += s.t > s.o ? rate : -rate;
        if ((s.t && s.o >= 1) || (!s.t && s.o <= 0)) {
          s.o = s.t;
          if (s.t) { s.opened = true; s.hop = 0; } else { s.el.style.zIndex = ''; }
        }
      }
      if (s.hop >= 0) { s.hop += dt; if (s.hop >= HOP_S) { s.hop = -1; } }
    });
    if (fadeJob) {
      fadeJob.t += dt;
      var u: any = fadeJob.t / FADE_S;
      if (u >= 0.5 && !fadeJob.done) { fadeJob.done = true; fadeJob.apply(); }
      var op: any = u >= 1 ? 1 : u < 0.5 ? 1 - u * 2 : (u - 0.5) * 2;
      fadeJob.set.forEach(function (i?: any) { spots[i].op = op; });
      if (u >= 1) { fadeJob = null; }
    }
    var anyMoving: any = spots.some(moving);
    if (phase === 'play') {
      if (!anyMoving && spots.every(function (s?: any) { return s.opened; })) { phase = 'glow'; phaseT = 0; }
      else if (!anyMoving && !fadeJob && spots.every(function (s?: any) { return s.o === 0; })) {
        idleT += dt;
        if (idleT >= SWAP_IDLE_S) { idleT = 0; swapTwo(); }
      } else { idleT = 0; }
    } else if (phase === 'glow') {
      phaseT += dt;
      if (phaseT >= GLOW_S) { phase = 'close'; spots.forEach(function (s?: any) { s.t = 0; s.el.setAttribute('aria-expanded', 'false'); }); }
    } else if (phase === 'close') {
      if (!anyMoving && !fadeJob) {
        var old: any = occ.slice();
        fadeJob = { t: 0, done: false, set: [0, 1, 2, 3], apply: function () { occ = arrangement(old); spots.forEach(setAnimal); } };
        spots.forEach(function (s?: any) { s.opened = false; });
        phase = 'play'; idleT = 0;
      }
    }
    var tg: any = phase === 'glow' ? 1 : 0;
    glow += (tg - glow) * Math.min(1, dt / 0.4);
    if (Math.abs(glow - tg) < 0.005) { glow = tg; }
    spots.forEach(paintSpot);
    if (!document.hidden) { raf = requestAnimationFrame(frame); }
  }
  function swapTwo() {
    var pairs: any = [];
    for (var a: any = 0; a < 4; a++) { for (var b: any = a + 1; b < 4; b++) { if (occ[a] !== occ[b]) { pairs.push([a, b]); } } }
    if (!pairs.length) { return; }
    var p: any = pairs[Math.floor(Math.random() * pairs.length)];
    fadeJob = { t: 0, done: false, set: p, apply: function () {
      var t: any = occ[p[0]]; occ[p[0]] = occ[p[1]]; occ[p[1]] = t; setAnimal(spots[p[0]]); setAnimal(spots[p[1]]);
    } };
  }
  function start() {
    if (raf || document.hidden) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }

  function layout() {
    var r: any = field.getBoundingClientRect(), fw: any = r.width, fh: any = r.height;
    var portrait: any = fh >= fw, cols: any = portrait ? 2 : 4, rows: any = portrait ? 2 : 1;
    var S: any = Math.max(64, Math.min(200, fw / cols * 0.92, (fh / (rows + 0.4)) * 0.92));
    var cw: any = fw / cols, top: any = Math.max(0, (fh - (rows * S + 0.4 * S)) / 2) + 0.4 * S;
    field.style.setProperty('--hd-s', S + 'px');
    spots.forEach(function (s?: any, i?: any) {
      var col: any = i % cols, row: any = Math.floor(i / cols);
      s.el.style.transform = 'translate(' + (cw * (col + 0.5) - S / 2) + 'px,' + (top + row * S) + 'px)';
    });
  }
  function onResize() { layout(); }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  spots.forEach(setAnimal);
  layout();
  spots.forEach(paintSpot);
  start();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (board.parentNode) { board.parentNode.removeChild(board); }
  };
}

export default function ChowanyActivity() {
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
