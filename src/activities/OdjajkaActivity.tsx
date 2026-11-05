// Activity "Od Jajka do…": a calm life-cycle story. Three cycles (egg -> chick -> hen, egg -> caterpillar -> cocoon ->
// butterfly, seed -> sprout -> flower -> apple), 4 pastel stages each. Touching the big picture moves one stage on (a 1.5 s
// cross-fade with a small grow-in and a happy wiggle); four dots show the stage and jump back to any stage already reached.
// Without a touch nothing advances; the picture only sways slowly (3 s). At the last stage the picture glows for 3 s, a
// little bunny waves, and after 4 s the next cycle fades in (cycles come in shuffled order, each once before repeats).
// All stage states live in base CSS classes (opacity), the CSS animations only add motion, so reduced motion still reaches
// every state. State lives in the closure and layout is pure CSS, so rotation/resize never loses it. Nothing is scored or stored.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';
import { Rand } from '../utils/rand';

var FIN_GLOW: any = 3000, FIN_NEXT: any = 7000, FADE_OUT: any = 600, WIGGLE: any = 700;
var lastFirst: any = null;                          // first cycle of the previous launch (page session only)

function leafBg(sky?: any, ground?: any) {
  return '<rect width="300" height="300" rx="26" fill="' + sky + '"/>' +
    '<path d="M0 238Q70 222 150 234T300 230V300H0z" fill="' + ground + '"/>';
}

var CYCLES: any = [
  { id: 'chick',
    bg: leafBg('#fdf0d5', '#cfe8b0') +
      '<ellipse cx="150" cy="238" rx="78" ry="16" fill="#e5c48a"/><path d="M84 236q20-8 40 0M130 240q20-8 40 0M176 236q20-8 40 0" fill="none" stroke="#c9a468" stroke-width="3" stroke-linecap="round"/>',
    stages: [
      '<ellipse cx="150" cy="190" rx="42" ry="54" fill="#fff8ec" stroke="#e7d7b8" stroke-width="3"/>' +
      '<circle cx="136" cy="176" r="4" fill="#f3dcc0"/><circle cx="162" cy="198" r="5" fill="#f3dcc0"/><circle cx="144" cy="212" r="3.5" fill="#f3dcc0"/><circle cx="166" cy="170" r="3" fill="#f3dcc0"/>',
      '<circle cx="150" cy="160" r="19" fill="#ffe08a"/><circle cx="143" cy="157" r="2.8" fill="#5b5675"/><circle cx="157" cy="157" r="2.8" fill="#5b5675"/><path d="M146 165L154 165L150 172Z" fill="#f4a261"/>' +
      '<path d="M192 185L180 174L166 188L152 170L138 186L125 172L108 185A42 54 0 0 0 192 185Z" fill="#fff8ec" stroke="#e7d7b8" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M198 226l14-12l10 14z" fill="#fff8ec" stroke="#e7d7b8" stroke-width="3" stroke-linejoin="round"/>',
      '<circle cx="150" cy="192" r="44" fill="#ffe08a"/><circle cx="150" cy="140" r="30" fill="#ffe08a"/>' +
      '<ellipse cx="108" cy="194" rx="12" ry="22" fill="#ffd267" transform="rotate(14 108 194)"/><ellipse cx="192" cy="194" rx="12" ry="22" fill="#ffd267" transform="rotate(-14 192 194)"/>' +
      '<circle cx="139" cy="136" r="3.4" fill="#5b5675"/><circle cx="161" cy="136" r="3.4" fill="#5b5675"/><path d="M144 146L156 146L150 156Z" fill="#f4a261"/>' +
      '<circle cx="128" cy="148" r="5" fill="#f7a8c9" fill-opacity=".7"/><circle cx="172" cy="148" r="5" fill="#f7a8c9" fill-opacity=".7"/>' +
      '<path d="M138 234v6M162 234v6" stroke="#f4a261" stroke-width="4" stroke-linecap="round"/>',
      '<path d="M96 168Q60 130 78 112Q100 130 112 158Z" fill="#f5e7cf"/><path d="M96 180Q56 160 62 140Q90 146 108 170Z" fill="#fbf1dc"/>' +
      '<ellipse cx="150" cy="190" rx="62" ry="48" fill="#fffaf2" stroke="#eadfcb" stroke-width="3"/>' +
      '<ellipse cx="176" cy="160" rx="22" ry="30" fill="#fffaf2"/><circle cx="190" cy="128" r="24" fill="#fffaf2" stroke="#eadfcb" stroke-width="3"/>' +
      '<circle cx="183" cy="100" r="7" fill="#f28c8c"/><circle cx="193" cy="97" r="7.5" fill="#f28c8c"/><circle cx="203" cy="103" r="6.5" fill="#f28c8c"/>' +
      '<path d="M210 124L228 131L210 138Z" fill="#f4a261"/><ellipse cx="206" cy="146" rx="5" ry="8" fill="#f28c8c"/><circle cx="196" cy="122" r="3.2" fill="#5b5675"/>' +
      '<ellipse cx="140" cy="194" rx="32" ry="22" fill="#f3e4c8" transform="rotate(-10 140 194)"/>' +
      '<path d="M138 236v-10M164 236v-10" stroke="#f4a261" stroke-width="5" stroke-linecap="round"/>'
    ] },
  { id: 'butterfly',
    bg: leafBg('#e4f1fb', '#cfe8b0') +
      '<path d="M52 234Q150 150 248 234Q150 258 52 234Z" fill="#9ed8a0"/><path d="M62 236Q150 214 238 236" fill="none" stroke="#7fbf8f" stroke-width="3" stroke-linecap="round"/>',
    stages: [
      '<ellipse cx="124" cy="214" rx="9" ry="11" fill="#fff8d8" stroke="#e6d9a0" stroke-width="3"/><ellipse cx="150" cy="208" rx="9" ry="11" fill="#fff8d8" stroke="#e6d9a0" stroke-width="3"/><ellipse cx="176" cy="214" rx="9" ry="11" fill="#fff8d8" stroke="#e6d9a0" stroke-width="3"/>',
      '<circle cx="96" cy="212" r="15" fill="#b6e08a" stroke="#8cc063" stroke-width="3"/><circle cx="122" cy="208" r="17" fill="#c4eb9a" stroke="#8cc063" stroke-width="3"/>' +
      '<circle cx="150" cy="206" r="18" fill="#b6e08a" stroke="#8cc063" stroke-width="3"/><circle cx="178" cy="204" r="19" fill="#c4eb9a" stroke="#8cc063" stroke-width="3"/>' +
      '<circle cx="208" cy="196" r="22" fill="#ffd98a" stroke="#e8b85a" stroke-width="3"/><circle cx="200" cy="192" r="3.4" fill="#5b5675"/><circle cx="216" cy="192" r="3.4" fill="#5b5675"/>' +
      '<path d="M202 202q6 5 12 0" fill="none" stroke="#5b5675" stroke-width="2.4" stroke-linecap="round"/><path d="M200 176q-4-14-12-16M214 176q4-14 12-16" fill="none" stroke="#8cc063" stroke-width="3" stroke-linecap="round"/>',
      '<path d="M44 74Q150 60 256 74" fill="none" stroke="#b98963" stroke-width="9" stroke-linecap="round"/><path d="M150 76V108" stroke="#8d6847" stroke-width="3"/>' +
      '<ellipse cx="150" cy="166" rx="30" ry="58" fill="#c3b08a" stroke="#a99468" stroke-width="3"/>' +
      '<path d="M124 140Q150 150 176 140M121 166Q150 176 179 166M124 192Q150 202 176 192" fill="none" stroke="#a99468" stroke-width="3" stroke-linecap="round"/>',
      '<ellipse cx="110" cy="124" rx="40" ry="30" fill="#f7a8c9" transform="rotate(-28 110 124)"/><ellipse cx="190" cy="124" rx="40" ry="30" fill="#f7a8c9" transform="rotate(28 190 124)"/>' +
      '<ellipse cx="122" cy="172" rx="28" ry="22" fill="#c9b8f2" transform="rotate(24 122 172)"/><ellipse cx="178" cy="172" rx="28" ry="22" fill="#c9b8f2" transform="rotate(-24 178 172)"/>' +
      '<circle cx="104" cy="122" r="9" fill="#fff"/><circle cx="196" cy="122" r="9" fill="#fff"/><circle cx="120" cy="174" r="6" fill="#ffe08a"/><circle cx="180" cy="174" r="6" fill="#ffe08a"/>' +
      '<ellipse cx="150" cy="150" rx="8" ry="36" fill="#5b5675"/><circle cx="150" cy="110" r="9" fill="#5b5675"/>' +
      '<path d="M146 104Q138 86 128 84M154 104Q162 86 172 84" fill="none" stroke="#5b5675" stroke-width="3" stroke-linecap="round"/>'
    ] },
  { id: 'flower',
    bg: leafBg('#fdeaf2', '#cfe8b0') +
      '<path d="M0 252Q80 232 150 240T300 238V300H0z" fill="#cfa97b"/>',
    stages: [
      '<ellipse cx="150" cy="238" rx="13" ry="9" fill="#8d6847" transform="rotate(-18 150 238)"/><path d="M126 246q8-6 14 0M162 248q8-6 14 0" fill="none" stroke="#b98a5c" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M150 146q-12 16 0 26q12-10 0-26z" fill="#a8d8f0"/>',
      '<path d="M150 244V176" stroke="#7fbf8f" stroke-width="7" stroke-linecap="round"/>' +
      '<ellipse cx="130" cy="180" rx="22" ry="10" fill="#9ed8a0" transform="rotate(-30 130 180)"/><ellipse cx="170" cy="170" rx="22" ry="10" fill="#9ed8a0" transform="rotate(30 170 170)"/>',
      '<path d="M150 244V124" stroke="#7fbf8f" stroke-width="7" stroke-linecap="round"/>' +
      '<ellipse cx="124" cy="204" rx="26" ry="11" fill="#9ed8a0" transform="rotate(-28 124 204)"/><ellipse cx="176" cy="188" rx="26" ry="11" fill="#9ed8a0" transform="rotate(28 176 188)"/>' +
      '<circle cx="150" cy="92" r="19" fill="#f7c8dc"/><circle cx="174" cy="110" r="19" fill="#f7c8dc"/><circle cx="165" cy="138" r="0" fill="#f7c8dc"/><circle cx="126" cy="110" r="19" fill="#f7c8dc"/>' +
      '<circle cx="136" cy="134" r="19" fill="#f7c8dc"/><circle cx="164" cy="134" r="19" fill="#f7c8dc"/><circle cx="150" cy="116" r="15" fill="#ffe08a"/>',
      '<rect x="134" y="150" width="32" height="92" rx="8" fill="#b98963"/>' +
      '<circle cx="106" cy="128" r="44" fill="#9ed8a0"/><circle cx="194" cy="128" r="44" fill="#9ed8a0"/><circle cx="150" cy="92" r="50" fill="#a9e0aa"/><circle cx="150" cy="140" r="40" fill="#9ed8a0"/>' +
      '<circle cx="116" cy="110" r="12" fill="#ee6a5f"/><circle cx="184" cy="132" r="12" fill="#ee6a5f"/><circle cx="148" cy="152" r="12" fill="#ee6a5f"/><circle cx="154" cy="80" r="12" fill="#ee6a5f"/>' +
      '<path d="M116 98v-6M184 120v-6M148 140v-6M154 68v-6" stroke="#8d6847" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="112" cy="106" r="3" fill="#fff" fill-opacity=".7"/><circle cx="180" cy="128" r="3" fill="#fff" fill-opacity=".7"/>'
    ] }
];

var HELPER: any = '<g class="oj-helper" transform="translate(254 196)">' +
  '<ellipse cx="0" cy="40" rx="20" ry="25" fill="#fdfbff" stroke="#e4dff0" stroke-width="2.5"/>' +
  '<ellipse cx="-8" cy="-18" rx="5" ry="14" fill="#fdfbff" stroke="#e4dff0" stroke-width="2.5"/><ellipse cx="8" cy="-18" rx="5" ry="14" fill="#fdfbff" stroke="#e4dff0" stroke-width="2.5"/>' +
  '<ellipse cx="-8" cy="-17" rx="2.4" ry="9" fill="#f7c8dc"/><ellipse cx="8" cy="-17" rx="2.4" ry="9" fill="#f7c8dc"/>' +
  '<circle cx="0" cy="6" r="16" fill="#fdfbff" stroke="#e4dff0" stroke-width="2.5"/>' +
  '<circle cx="-6" cy="3" r="2.2" fill="#5b5675"/><circle cx="6" cy="3" r="2.2" fill="#5b5675"/><ellipse cx="0" cy="9" rx="2.6" ry="2" fill="#f2a0bd"/>' +
  '<g class="oj-arm"><ellipse cx="20" cy="22" rx="5" ry="14" fill="#fdfbff" stroke="#e4dff0" stroke-width="2.5" transform="rotate(-14 20 32)"/></g></g>';

function build(cyc?: any) {
  var i: any, s: any = '<svg class="oj-svg" viewBox="0 0 300 300" aria-hidden="true" focusable="false">' +
    '<defs><radialGradient id="oj-gl"><stop offset="0" stop-color="#fff6c4" stop-opacity=".95"/><stop offset="1" stop-color="#fff6c4" stop-opacity="0"/></radialGradient></defs>' + cyc.bg +
    '<circle class="oj-glow" cx="150" cy="160" r="150" fill="url(#oj-gl)"/>';
  for (i = 0; i < cyc.stages.length; i++) { s += '<g class="oj-st" data-s="' + i + '">' + cyc.stages[i] + '</g>'; }
  return s + HELPER + '</svg>';
}

function report(fn?: any) { try { if (Analytics) { fn(Analytics); } } catch (e: any) { /* metrics must never break the activity */ } }

function newOrder(prevLast?: any) {
  var o: any = Rand ? Rand.shuffle(CYCLES) : CYCLES.slice();
  if (prevLast && o[0] === prevLast && o.length > 1) { var t: any = o[0]; o[0] = o[1]; o[1] = t; }
  return o;
}

function mount(container: HTMLElement) {
  var root: any = document.createElement('div');
  root.className = 'oj';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Od Jajka do…');
  root.innerHTML = '<button type="button" class="oj-pic" aria-label="Dalej"></button><div class="oj-dots"></div>';
  container.appendChild(root);

  var pic: any = root.querySelector('.oj-pic'), dotsEl: any = root.querySelector('.oj-dots');
  var dots: any = [], d: any, n: any;
  for (n = 0; n < 4; n++) {
    d = document.createElement('button');
    d.type = 'button'; d.className = 'oj-dot'; d.setAttribute('aria-label', 'Etap ' + (n + 1));
    d.innerHTML = '<span class="oj-dotv"></span>';
    dotsEl.appendChild(d); dots.push(d);
  }

  var order: any = newOrder(lastFirst), oi: any = 0, cyc: any = order[0];
  lastFirst = cyc;
  var cur: any = 0, reached: any = 0, done: any = false;       // done: this cycle's last stage already reported
  var timers: any = [], wigT: any = 0, stEls: any = [];

  function later(fn?: any, ms?: any) {
    var t: any = setTimeout(function () { var k: any = timers.indexOf(t); if (k >= 0) { timers.splice(k, 1); } fn(); }, ms);
    timers.push(t); return t;
  }
  function clearTimers() { while (timers.length) { clearTimeout(timers.pop()); } }

  function paint() {
    var i: any;
    for (i = 0; i < stEls.length; i++) { stEls[i].classList.toggle('on', i === cur); }
    for (i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('cur', i === cur);
      dots[i].classList.toggle('got', i <= reached);
      dots[i].disabled = i > reached;
      if (i === cur) { dots[i].setAttribute('aria-current', 'step'); } else { dots[i].removeAttribute('aria-current'); }
    }
  }

  function show(c?: any, fadeIn?: any) {
    cyc = c; cur = 0; reached = 0; done = false;
    root.classList.remove('oj-fin', 'oj-glow-on', 'oj-help', 'oj-out');
    pic.innerHTML = build(c);
    stEls = pic.querySelectorAll('.oj-st');
    if (fadeIn) { root.classList.add('oj-in'); void root.offsetWidth; root.classList.remove('oj-in'); }
    paint();
  }

  function wiggle() {
    pic.classList.remove('oj-wig'); void pic.offsetWidth; pic.classList.add('oj-wig');
    if (wigT) { clearTimeout(wigT); }
    wigT = setTimeout(function () { wigT = 0; pic.classList.remove('oj-wig'); }, WIGGLE);
  }

  function nextCycle() {
    if (++oi >= order.length) { order = newOrder(cyc); oi = 0; }
    show(order[oi], true);
  }

  function finale() {
    clearTimers();
    root.classList.add('oj-fin', 'oj-glow-on', 'oj-help');
    later(function () { root.classList.remove('oj-glow-on'); }, FIN_GLOW);
    later(function () { root.classList.add('oj-out'); }, FIN_NEXT - FADE_OUT);
    later(nextCycle, FIN_NEXT);
    if (!done) { done = true; report(function (A?: any) { A.complete(); }); }
  }

  function goto(i?: any) {
    if (i === cur) { return; }
    clearTimers();
    root.classList.remove('oj-fin', 'oj-glow-on', 'oj-help', 'oj-out');
    cur = i; if (cur > reached) { reached = cur; }
    paint();
    if (cur === 3) { finale(); }
  }

  pic.addEventListener('click', function () {
    if (cur >= 3) { return; }
    goto(cur + 1);
    wiggle();
    var c: any = cyc.id, s: any = cur + 1;
    report(function (A?: any) { A.track('interaction', { variant: c + '-' + s }); });
  });
  dots.forEach(function (b?: any, i?: any) {
    b.addEventListener('click', function () { if (i <= reached) { goto(i); wiggle(); } });
  });

  show(cyc, false);

  return function cleanup() {
    clearTimers();
    if (wigT) { clearTimeout(wigT); wigT = 0; }
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function OdjajkaActivity() {
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
