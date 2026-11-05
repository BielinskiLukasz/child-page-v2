// Activity "Przeciwieństwa": four big objects, drawn at random each launch from a pool of 12 pairs (door, cup, balloon,
// lamp, ball, pencil, thermometer, sky, flower, tree, dots, cloud). Touching one slowly turns it into its opposite
// (open, full, high, on) and touching it again turns it back. A small sparkle fades after each change; when all four are
// in their second state the scene glows softly. All changes are reversible; nothing is scored or stored.
// Fades run from one capped-dt rAF loop (not CSS transitions), so they still work under prefers-reduced-motion.
import { useEffect, useRef } from 'react';
import { Rand } from '../utils/rand';

var CHANGE_S: any = 1.5, SPARK_S: any = 1.6, GLOW_IN_S: any = 2, GLOW_OUT_S: any = 1.5;

function sparkSvg() {
  return '<g class="pw-spark" opacity="0"><path d="M84 8l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#ffe9a8" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></g>';
}

// Each object: build(id) -> inner svg markup, paint(svg, e) with e in 0..1 (0 = first state, 1 = opposite).
var OBJECTS: any = [
  { name: 'Drzwi', off: 'zamknięte', on: 'otwarte', bg: '#e6e0f7',
    build: function () {
      return '<rect x="18" y="8" width="64" height="86" rx="8" fill="#c9a98a"/>' +
        '<rect x="25" y="15" width="50" height="79" fill="#ffe9c4"/>' +
        '<path d="M25 94v-30l12-8 13 8v30z" fill="#f3d9a8" opacity=".7"/>' +
        '<polygon class="pw-panel" points="25,15 75,15 75,94 25,94" fill="#c9a0c0" stroke="#b78fb0" stroke-width="2" stroke-linejoin="round"/>' +
        '<circle class="pw-knob" cx="66" cy="56" r="4.5" fill="#ffe9a8"/>' + sparkSvg();
    },
    paint: function (s?: any, e?: any) {
      var rx: any = 75 - 41 * e, d: any = 8 * e;
      s.querySelector('.pw-panel').setAttribute('points',
        '25,15 ' + rx.toFixed(2) + ',' + (15 + d).toFixed(2) + ' ' + rx.toFixed(2) + ',' + (94 - d).toFixed(2) + ' 25,94');
      var k: any = s.querySelector('.pw-knob');
      k.setAttribute('cx', (rx - 9 + 3 * e).toFixed(2));
      k.setAttribute('r', (4.5 - 1.5 * e).toFixed(2));
    } },
  { name: 'Kubek', off: 'pusty', on: 'pełny', bg: '#dff1fb',
    build: function (n?: any) {
      var body: any = 'M26 30h48l-6 56q-1 7-8 7H40q-7 0-8-7z';
      return '<defs><clipPath id="pw-cup-clip-' + n + '"><path d="' + body + '"/></clipPath></defs>' +
        '<path d="M72 40q20 0 18 17t-20 17" fill="none" stroke="#fbf7ff" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="' + body + '" fill="#fbf7ff" fill-opacity=".7"/>' +
        '<g clip-path="url(#pw-cup-clip-' + n + ')"><rect class="pw-liquid" x="20" y="93" width="60" height="64" fill="#a9d6f2"/>' +
        '<path class="pw-wave" d="M20 93q10-4 20 0t20 0t20 0" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/></g>' +
        '<path d="' + body + '" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M24 94h52" stroke="#d6cdef" stroke-width="5" stroke-linecap="round"/>' + sparkSvg();
    },
    paint: function (s?: any, e?: any) {
      var y: any = 93 - 56 * e;
      s.querySelector('.pw-liquid').setAttribute('y', y.toFixed(2));
      s.querySelector('.pw-wave').setAttribute('transform', 'translate(0 ' + (y - 93).toFixed(2) + ')');
      s.querySelector('.pw-wave').setAttribute('opacity', Math.min(1, e * 4).toFixed(3));
    } },
  { name: 'Balon', off: 'nisko', on: 'wysoko', bg: '#fdf0d5',
    build: function () {
      return '<path d="M5 94q45-10 90 0v6H5z" fill="#cfeab4"/>' +
        '<path class="pw-string" d="M50 86Q44 90 50 90" fill="none" stroke="#8a84a8" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="50" cy="91" r="4.5" fill="#8a84a8"/>' +
        '<g class="pw-balloon"><ellipse cx="50" cy="32" rx="20" ry="22" fill="#f7a8c9"/>' +
        '<path d="M46 56l4 5 4-5z" fill="#f7a8c9"/><path d="M40 22q3-7 10-8" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/></g>' + sparkSvg();
    },
    paint: function (s?: any, e?: any) {
      var dy: any = 32 * (1 - e), top: any = 61 + dy, w: any = 6 * Math.sin(e * Math.PI);
      s.querySelector('.pw-balloon').setAttribute('transform', 'translate(0 ' + dy.toFixed(2) + ')');
      s.querySelector('.pw-string').setAttribute('d',
        'M50 ' + top.toFixed(2) + 'Q' + (50 - w).toFixed(2) + ' ' + ((top + 88) / 2).toFixed(2) + ' 50 88');
    } },
  { name: 'Lampa', off: 'wyłączona', on: 'włączona', bg: '#e3f1d9',
    build: function () {
      return '<path class="pw-cone" d="M32 44L8 92h84L68 44z" fill="#fff2b8" opacity="0"/>' +
        '<ellipse cx="50" cy="90" rx="20" ry="5" fill="#8a84a8"/><rect x="47" y="46" width="6" height="42" rx="3" fill="#8a84a8"/>' +
        '<circle cx="50" cy="48" r="7" fill="#d6cdef"/><circle class="pw-bulb" cx="50" cy="48" r="7" fill="#ffe9a8" opacity="0"/>' +
        '<path d="M30 42l8-28h24l8 28z" fill="#f7a8c9" stroke="#f7a8c9" stroke-width="5" stroke-linejoin="round"/>' +
        '<path class="pw-rays" d="M18 20l-7-5M82 20l7-5M50 8V1" stroke="#ffd98a" stroke-width="3" stroke-linecap="round" opacity="0"/>' + sparkSvg();
    },
    paint: function (s?: any, e?: any) {
      s.querySelector('.pw-cone').setAttribute('opacity', (0.85 * e).toFixed(3));
      s.querySelector('.pw-bulb').setAttribute('opacity', e.toFixed(3));
      s.querySelector('.pw-rays').setAttribute('opacity', e.toFixed(3));
    } },
  { name: 'Piłka', off: 'duża', on: 'mała', bg: '#fde3e3',
    build: function () {
      return '<path d="M8 90q42-8 84 0v8H8z" fill="#cfeab4"/>' +
        '<g class="pw-ball"><circle cx="50" cy="56" r="34" fill="#f28b82"/><path d="M26 42q8-12 22-14" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/></g>' + sparkSvg();
    },
    paint: function (s?: any, e?: any) {
      // r goes 34 -> 12, resting on the ground line (y 90)
      var r: any = 34 - 22 * e;
      var b: any = s.querySelector('.pw-ball');
      b.setAttribute('transform', 'translate(50 ' + (90 - r).toFixed(2) + ') scale(' + (r / 34).toFixed(3) + ') translate(-50 -56)');
    } },
  { name: 'Ołówek', off: 'długi', on: 'krótki', bg: '#fff3cf',
    build: function () {
      return '<rect x="10" y="40" width="14" height="20" rx="4" fill="#f7a8c9"/><rect x="22" y="40" width="6" height="20" fill="#c9c3dc"/>' +
        '<rect class="pw-body" x="28" y="40" width="58" height="20" fill="#ffd166"/>' +
        '<g class="pw-tip"><path d="M86 40l12 10-12 10z" fill="#f3d9a8"/><path d="M93 45l5 5-5 5z" fill="#6b6590"/></g>' + sparkSvg();
    },
    paint: function (s?: any, e?: any) {
      var w: any = 58 - 30 * e;
      s.querySelector('.pw-body').setAttribute('width', w.toFixed(2));
      s.querySelector('.pw-tip').setAttribute('transform', 'translate(' + (w - 58).toFixed(2) + ' 0)');
    } },
  { name: 'Termometr', off: 'zimny', on: 'gorący', bg: '#e4ecfb',
    build: function () {
      return '<rect x="42" y="8" width="16" height="70" rx="8" fill="#fbf7ff" stroke="#d6cdef" stroke-width="3"/>' +
        '<circle cx="50" cy="82" r="13" fill="#fbf7ff" stroke="#d6cdef" stroke-width="3"/>' +
        '<circle class="pw-merc-b" cx="50" cy="82" r="8" fill="#8ecae6"/>' +
        '<rect class="pw-merc" x="46" y="66" width="8" height="14" rx="4" fill="#8ecae6"/>' + sparkSvg();
    },
    paint: function (s?: any, e?: any) {
      var top: any = 66 - 46 * e;
      var col: any = 'rgb(' + Math.round(142 + 100 * e) + ',' + Math.round(202 - 63 * e) + ',' + Math.round(230 - 100 * e) + ')';
      var m: any = s.querySelector('.pw-merc');
      m.setAttribute('y', top.toFixed(2));
      m.setAttribute('height', (80 - top).toFixed(2));
      m.setAttribute('fill', col);
      s.querySelector('.pw-merc-b').setAttribute('fill', col);
    } },
  { name: 'Niebo', off: 'dzień', on: 'noc', bg: '#dceefb',
    build: function () {
      return '<rect class="pw-sky" x="8" y="8" width="84" height="84" rx="14" fill="#cfe8fb"/>' +
        '<g class="pw-stars" opacity="0" fill="#ffe9a8"><circle cx="24" cy="26" r="2.5"/><circle cx="70" cy="22" r="2"/><circle cx="78" cy="56" r="2.5"/><circle cx="30" cy="70" r="2"/></g>' +
        '<g class="pw-sun"><circle cx="50" cy="50" r="17" fill="#ffd166"/><path class="pw-rays" d="M50 22v-6M50 78v6M22 50h-6M78 50h6M30 30l-4-4M70 70l4 4M70 30l4-4M30 70l-4 4" stroke="#ffd166" stroke-width="4" stroke-linecap="round"/></g>' +
        '<g class="pw-moon" opacity="0"><path d="M58 30a22 22 0 1 0 12 38a18 18 0 1 1-12-38z" fill="#fff2b8"/></g>' + sparkSvg();
    },
    paint: function (s?: any, e?: any) {
      var c: any = 'rgb(' + Math.round(207 - 164 * e) + ',' + Math.round(232 - 185 * e) + ',' + Math.round(251 - 149 * e) + ')';
      s.querySelector('.pw-sky').setAttribute('fill', c);
      s.querySelector('.pw-sun').setAttribute('opacity', (1 - e).toFixed(3));
      s.querySelector('.pw-moon').setAttribute('opacity', e.toFixed(3));
      s.querySelector('.pw-stars').setAttribute('opacity', e.toFixed(3));
    } },
  { name: 'Kwiat', off: 'zamknięty', on: 'otwarty', bg: '#f3e6fa',
    build: function () {
      var petals: any = '';
      for (var i: any = 0; i < 6; i++) {
        petals += '<ellipse cx="50" cy="20" rx="9" ry="14" fill="#f7a8c9" transform="rotate(' + (i * 60) + ' 50 38)"/>';
      }
      return '<path d="M50 96V50" stroke="#7fc77f" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M50 80q-18-2-22-14q14-2 22 14z" fill="#9bd89b"/>' +
        '<g class="pw-petals">' + petals + '</g>' +
        '<circle cx="50" cy="38" r="9" fill="#ffd166"/>' + sparkSvg();
    },
    paint: function (s?: any, e?: any) {
      var k: any = 0.3 + 0.7 * e;
      s.querySelector('.pw-petals').setAttribute('transform',
        'translate(50 38) scale(' + k.toFixed(3) + ') translate(-50 -38)');
    } },
  { name: 'Drzewo', off: 'gruby', on: 'cienki', bg: '#e3f1d9',
    build: function () {
      return '<path d="M8 94q42-8 84 0v6H8z" fill="#cfeab4"/>' +
        '<rect class="pw-trunk" x="35" y="46" width="30" height="48" fill="#c9a98a"/>' +
        '<circle cx="50" cy="32" r="22" fill="#7fc77f"/><circle cx="36" cy="40" r="14" fill="#9bd89b"/><circle cx="64" cy="40" r="14" fill="#9bd89b"/>' + sparkSvg();
    },
    paint: function (s?: any, e?: any) {
      var w: any = 30 - 20 * e;
      var t: any = s.querySelector('.pw-trunk');
      t.setAttribute('width', w.toFixed(2));
      t.setAttribute('x', (50 - w / 2).toFixed(2));
    } },
  { name: 'Kropki', off: 'mało', on: 'dużo', bg: '#fde9d3',
    build: function () {
      var d: any = '', i: any, cols: any = ['#f28b82', '#ffd166', '#7fc77f', '#8ecae6', '#c9a0e6', '#f7a8c9'];
      for (i = 0; i < 6; i++) {
        d += '<circle class="pw-dot" cx="' + (24 + (i % 3) * 26) + '" cy="' + (36 + Math.floor(i / 3) * 30) + '" r="10" fill="' + cols[i] + '"/>';
      }
      return d + sparkSvg();
    },
    paint: function (s?: any, e?: any) {
      var dots: any = s.querySelectorAll('.pw-dot');
      for (var i: any = 0; i < dots.length; i++) {
        // first dot always visible; the others fade in one after another
        var v: any = i === 0 ? 1 : Math.max(0, Math.min(1, e * 6 - (i - 1)));
        dots[i].setAttribute('opacity', v.toFixed(3));
      }
    } },
  { name: 'Chmura', off: 'sucho', on: 'mokro', bg: '#e1e8f5',
    build: function () {
      return '<g class="pw-sun"><circle cx="72" cy="26" r="13" fill="#ffd166"/></g>' +
        '<g class="pw-drops" opacity="0" fill="#8ecae6"><path d="M30 66q-5 8 0 11t5-11z"/><path d="M50 72q-5 8 0 11t5-11z"/><path d="M70 66q-5 8 0 11t5-11z"/></g>' +
        '<path d="M24 58a14 14 0 0 1 4-27a18 18 0 0 1 34-4a16 16 0 0 1 14 31z" fill="#fbf7ff" stroke="#c9c3dc" stroke-width="3" stroke-linejoin="round"/>' + sparkSvg();
    },
    paint: function (s?: any, e?: any) {
      s.querySelector('.pw-sun').setAttribute('opacity', (1 - e).toFixed(3));
      var d: any = s.querySelector('.pw-drops');
      d.setAttribute('opacity', e.toFixed(3));
      d.setAttribute('transform', 'translate(0 ' + (6 * e - 6).toFixed(2) + ')');
    } }
];

function toward(v?: any, t?: any, step?: any) { return v < t ? Math.min(t, v + step) : Math.max(t, v - step); }
function smooth(v?: any) { return v * v * (3 - 2 * v); }

function mount(container: HTMLElement) {
  var reduced: any = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root: any = document.createElement('div');
  root.className = 'pw';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Przeciwieństwa');
  var board: any = document.createElement('div');
  board.className = 'pw-board';
  root.appendChild(board);
  var glowEl: any = document.createElement('div');
  glowEl.className = 'pw-glow';
  root.appendChild(glowEl);

  var items: any = [];
  var glow: any = 0, glowT: any = 0;
  var raf: any = 0, last: any = 0;

  // Four different pairs per launch (unique, random); nothing is stored.
  Rand.pick(OBJECTS, 4).forEach(function (o?: any) {
    var btn: any = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-btn';
    btn.style.background = o.bg;
    // Reduced motion: two static views (first state, opposite) cross-fade instead of moving.
    var views: any = reduced ? [0, 1] : [null];
    btn.innerHTML = views.map(function (_v?: any, vi?: any) {
      return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + o.build(vi) + '</svg>';
    }).join('');
    var svgs: any = btn.querySelectorAll('svg');
    if (reduced) {
      o.paint(svgs[0], 0);
      o.paint(svgs[1], 1);
      svgs[0].style.position = svgs[1].style.position = 'absolute';
      svgs[0].style.inset = svgs[1].style.inset = '6%';
      svgs[0].style.width = svgs[1].style.width = svgs[0].style.height = svgs[1].style.height = '88%';
    }
    var it: any = { o: o, btn: btn, svgs: svgs, v: 0, t: 0, spark: 1 };
    it.paint = function () {
      var e: any = smooth(it.v);
      if (reduced) {
        svgs[0].style.opacity = (1 - e).toFixed(3);
        svgs[1].style.opacity = e.toFixed(3);
      } else {
        o.paint(svgs[0], e);
      }
      var sp: any = it.spark < 1 ? Math.sin(Math.PI * it.spark) : 0;
      var g: any = svgs[reduced ? 1 : 0].querySelector('.pw-spark');
      g.setAttribute('opacity', sp.toFixed(3));
      g.setAttribute('transform', 'translate(0 ' + (-4 * it.spark).toFixed(2) + ')');
      if (reduced) { svgs[0].querySelector('.pw-spark').setAttribute('opacity', '0'); }
    };
    it.label = function () {
      btn.setAttribute('aria-label', o.name + ': ' + (it.t ? o.on : o.off) + ' – dotknij, aby zmienić');
    };
    items.push(it);
    board.appendChild(btn);
  });
  container.appendChild(root);

  function paintGlow() { glowEl.style.opacity = smooth(glow).toFixed(3); }

  function step(ts?: any) {
    raf = 0;
    var dt: any = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    var busy: any = false;
    items.forEach(function (it?: any) {
      var changed: any = false;
      if (it.v !== it.t) { it.v = toward(it.v, it.t, dt / CHANGE_S); changed = true; if (it.v !== it.t) { busy = true; } }
      if (it.spark < 1) { it.spark = Math.min(1, it.spark + dt / SPARK_S); changed = true; if (it.spark < 1) { busy = true; } }
      if (changed) { it.paint(); }
    });
    if (glow !== glowT) {
      glow = toward(glow, glowT, dt / (glowT > glow ? GLOW_IN_S : GLOW_OUT_S));
      paintGlow();
      if (glow !== glowT) { busy = true; }
    }
    if (busy) { raf = requestAnimationFrame(step); } else { last = 0; }
  }
  function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(step); } }

  // After a hidden tab, don't count the gap: rAF itself pauses, so just restart the clock.
  function onVis() { last = 0; }
  document.addEventListener('visibilitychange', onVis);

  var handlers: any = items.map(function (it?: any) {
    var h: any = function () {
      if (it.v !== it.t) { return; } // a change in progress is ignored until it ends
      it.t = it.t ? 0 : 1;
      it.spark = 0;
      it.label();
      glowT = items.every(function (x?: any) { return x.t === 1; }) ? 1 : 0;
      kick();
    };
    it.btn.addEventListener('click', h);
    return h;
  });

  items.forEach(function (it?: any) { it.paint(); it.label(); });
  paintGlow();

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    document.removeEventListener('visibilitychange', onVis);
    items.forEach(function (it?: any, i?: any) { it.btn.removeEventListener('click', handlers[i]); });
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function PrzeciwienstwaActivity() {
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
