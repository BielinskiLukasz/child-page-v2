// Activity "Wyścig Piesków": a friendly dog race. Four different random breeds (window.Dogs) run left to right in four lanes, each at
// its own gentle base speed (a race takes 25-35 s) and keep going untouched. Tapping a dog gives it a smooth ~1 s speed boost (+40%,
// never more than +60%) with a small dust puff. The race is never decided: from half way the dogs' speeds are blended towards one common
// finishing time, so all four finish within ~3 s of each other. Finished dogs wag their tails (happy face, Polish breed name small underneath);
// when all are in, confetti falls for ~4 s and a new race with new breeds begins. Positions are fractions of the track (rotation-safe),
// speed changes are slew-limited, one capped-dt rAF loop (pauses while hidden, stops on cleanup). Keyboard: Tab to a dog, Enter/Space cheers.
// Legs: the four legs of the shared dog (dg-legs) are regrouped per leg at the start of a race and swung about the hip from the same frame
// loop (trot: diagonal pairs alternate, 2-5 steps/s proportional to the dog's speed, small body bob); a run factor eases the swing in and out
// (legs stand again within 0.35 s of finishing). Reduced motion: half the step rate and no bob.
// Nothing is scored or stored. Usage metrics: track('interaction', {variant: breed}) on each cheer, complete() when a race is finished.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';
import { Dogs } from '../utils/dogs';

var LANES: any = 4, T_MIN: any = 25, T_MAX: any = 35;
var BOOST_ADD: any = 0.4, BOOST_MAX: any = 0.6, BOOST_S: any = 1, BOOST_SLEW: any = 1.2;   // boost factor change per second
var ACC: any = 0.02;                       // slew limit of the speed, track fractions per second squared
var BLEND_FROM: any = 0.5, BLEND_TO: any = 0.9; // leader progress between which speeds are blended to a common finishing time
var END_GAP_S: any = 2.5;                  // after the first finish nobody needs longer than this for the rest
var CONFETTI: any = 36, CONFETTI_S: any = 4, FALL_S: any = 2.2, PUFFS: any = 12, PUFF_S: any = 0.55, SWAP_S: any = 0.7, WAG_HZ: any = 2.2;
var STEPS_PER_SPEED: any = 70, STEPS_MAX: any = 5;  // steps per second = speed (track fractions/s) * 70, never above 5
var RUN_IN_S: any = 0.3, RUN_OUT_S: any = 0.35;     // time for the leg swing to ease in at the start / out at the finish
var BOB: any = 0.03;                            // body bob height as a fraction of the dog height (limit 0.04)
var COLORS: any = ['#f7a8c9', '#ffd98a', '#a8d8f0', '#b6e0aa', '#c9b8f2', '#f4a261'];
var lastSet: any = '';

function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function report(fn?: any) { try { if (Analytics) { fn(Analytics); } } catch (e: any) { /* metrics must never break the activity */ } }

// Four different breeds in random order; never the same set as the previous race.
function pickBreeds() {
  var pick: any;
  do {
    var pool: any = Dogs.LIST.slice(), out: any = [];
    while (out.length < LANES) { out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); }
    pick = out;
  } while (pick.map(function (d?: any) { return d.id; }).sort().join() === lastSet);
  lastSet = pick.map(function (d?: any) { return d.id; }).sort().join();
  return pick;
}

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var board: any = document.createElement('div');
  board.className = 'wp';
  var html: any = '<div class="wp-field">';
  for (var i: any = 0; i < LANES; i++) {
    html += '<div class="wp-lane"><div class="wp-finish"></div><div class="wp-puffs"></div>' +
      '<button type="button" class="wp-dog"><span class="wp-art"></span><span class="wp-name"></span></button></div>';
  }
  html += '<div class="wp-confetti"></div></div>';
  board.innerHTML = html;
  container.appendChild(board);
  var field: any = board.querySelector('.wp-field'), confWrap: any = board.querySelector('.wp-confetti');
  var laneEls: any = board.querySelectorAll('.wp-lane');

  var runners: any = [], k: any;
  for (k = 0; k < LANES; k++) {
    var le: any = laneEls[k], r: any = { lane: le, btn: le.querySelector('.wp-dog'), art: le.querySelector('.wp-art'), nameEl: le.querySelector('.wp-name'),
      puffWrap: le.querySelector('.wp-puffs'), puffs: [], dog: null, p: 0, v: 0, base: 0, boost: 0, boostT: 0, boostTarget: 0,
      done: false, doneT: 0, wag: 0, happy: null, calm: null, tail: null, tailP: [0, 0], pw: 80, ph: 60, dh: 50, legs: [], run: 0, cyc: 0 };
    for (var q: any = 0; q < PUFFS; q++) {
      var pn: any = document.createElement('div');
      pn.className = 'wp-puff'; pn.style.display = 'none';
      r.puffWrap.appendChild(pn);
      r.puffs.push({ node: pn, age: -1, x: 0, y: 0 });
    }
    runners.push(r);
  }
  var conf: any = [];
  for (k = 0; k < CONFETTI; k++) {
    var cn: any = document.createElement('div');
    cn.className = 'wp-conf'; cn.style.display = 'none';
    cn.style.background = COLORS[k % COLORS.length];
    confWrap.appendChild(cn);
    conf.push({ node: cn, age: -1, x: 0, drift: 0, delay: 0, rot: 0 });
  }

  var alive: any = true, raf: any = 0, last: any = 0, phase: any = 'run', phaseT: any = 0, fieldOp: any = 1, firstDone: any = false, wasReported: any = false;
  var trackW: any = 300;
  var rmq: any = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  // Wrap each leg (rect + foot ellipse) of the shared dg-legs group in its own <g> so it can swing about the hip.
  function setupLegs(r?: any) {
    r.legs = [];
    var grp: any = r.art.querySelector('.dg-legs');
    if (!grp) { return; }
    var kids: any = [], c: any = grp.firstElementChild;
    while (c) { kids.push(c); c = c.nextElementSibling; }
    for (var i: any = 0; i + 1 < kids.length; i += 2) {
      var rect: any = kids[i], len: any = +rect.getAttribute('height') - 4;
      var g: any = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      grp.insertBefore(g, rect); g.appendChild(rect); g.appendChild(kids[i + 1]);
      // hip = top of the visible leg (the 4 units above it hide under the body); short legs swing wider to stay visible
      var amp: any = Math.max(18, Math.min(40, Math.asin(Math.min(1, 5 / Math.max(len, 1))) * 180 / Math.PI));
      r.legs.push({ g: g, px: +rect.getAttribute('x') + 4, py: +rect.getAttribute('y') + 4, amp: amp, sign: (i / 2 === 1 || i / 2 === 2) ? -1 : 1 });
    }
  }
  function poseLegs(r?: any, dt?: any) {
    var calm: any = !!(rmq && rmq.matches), speed: any = Math.min(STEPS_MAX, r.v * STEPS_PER_SPEED);
    r.run += (r.done ? -dt / RUN_OUT_S : dt / RUN_IN_S);
    r.run = r.run < 0 ? 0 : r.run > 1 ? 1 : r.run;
    if (r.run <= 0 && r.done) { if (r.legsOn) { r.legsOn = false; legsPose(r, 0, 0); } return; }
    r.cyc += dt * speed * (calm ? 0.25 : 0.5);   // 2 steps per cycle; reduced motion halves the rate
    if (r.cyc > 1e4) { r.cyc -= 1e4; }
    r.legsOn = true;
    legsPose(r, r.run * Math.sin(2 * Math.PI * r.cyc), calm ? 0 : r.run * Math.abs(Math.sin(2 * Math.PI * r.cyc)));
  }
  function legsPose(r?: any, s?: any, bob?: any) {
    for (var i: any = 0; i < r.legs.length; i++) {
      var l: any = r.legs[i];
      l.g.setAttribute('transform', s ? 'rotate(' + (s * l.sign * l.amp).toFixed(2) + ' ' + l.px + ' ' + l.py + ')' : '');
    }
    r.art.style.transform = bob ? 'translateY(' + (-bob * BOB * r.dh).toFixed(2) + 'px)' : '';
  }

  function setMood(r?: any, on?: any) {
    if (!r.happy) { return; }
    r.happy.setAttribute('display', on ? 'inline' : 'none');
    r.calm.setAttribute('display', on ? 'none' : 'inline');
  }
  function rotTail(r?: any, a?: any) { if (r.tail) { r.tail.setAttribute('transform', a ? 'rotate(' + a.toFixed(2) + ' ' + r.tailP[0] + ' ' + r.tailP[1] + ')' : ''); } }

  function newRace() {
    var breeds: any = pickBreeds();
    runners.forEach(function (r?: any, i?: any) {
      var d: any = breeds[i];
      r.dog = d;
      r.art.innerHTML = Dogs.draw(d.id);
      r.calm = r.art.querySelector('.dg-calm'); r.happy = r.art.querySelector('.dg-happy'); r.tail = r.art.querySelector('.dg-tail');
      r.tailP = r.tail ? [+r.tail.getAttribute('data-px'), +r.tail.getAttribute('data-py')] : [0, 0];
      setupLegs(r); r.run = 0; r.cyc = 0; r.legsOn = true; legsPose(r, 0, 0);
      setMood(r, false); rotTail(r, 0);
      r.nameEl.textContent = d.name;
      r.btn.setAttribute('aria-label', 'Piesek: ' + d.name + '. Dotknij lub naciśnij Enter, aby zachęcić do biegu.');
      r.base = 1 / (T_MIN + Math.random() * (T_MAX - T_MIN));
      r.p = 0; r.v = r.base; r.boost = 0; r.boostT = 0; r.boostTarget = 0; r.done = false; r.doneT = 0; r.wag = 0;
      r.puffs.forEach(function (pf?: any) { pf.age = -1; pf.node.style.display = 'none'; });
    });
    conf.forEach(function (c?: any) { c.age = -1; c.node.style.display = 'none'; });
    firstDone = false; wasReported = false; phaseT = 0;
    layout();
  }

  function puff(r?: any) {
    for (var j: any = 0; j < r.puffs.length; j++) {
      var pf: any = r.puffs[j];
      if (pf.age >= 0) { continue; }
      pf.age = 0; pf.x = r.p * (trackW - r.pw) + r.pw * 0.1; pf.y = r.ph * 0.78;
      pf.node.style.display = '';
      pf.node.style.left = pf.x + 'px'; pf.node.style.top = pf.y + 'px';
      return;
    }
  }
  function cheer(r?: any) {
    report(function (A?: any) { A.track('interaction', { variant: r.dog.id }); });
    if (r.done) { r.wag = 0.8; start(); return; }
    r.boostTarget = Math.min(BOOST_MAX, r.boostTarget + BOOST_ADD);
    r.boostT = BOOST_S;
    puff(r);
    start();
  }

  function startConfetti() {
    conf.forEach(function (c?: any, i?: any) {
      c.age = 0; c.x = Math.random(); c.drift = (Math.random() - 0.5) * 0.12; c.delay = (i / CONFETTI) * (CONFETTI_S - FALL_S - 0.3) * Math.random() * 1.0;
      c.rot = Math.random() * 360;
      c.node.style.display = '';
    });
  }
  function paintConfetti() {
    var h: any = field.clientHeight;
    conf.forEach(function (c?: any) {
      if (c.age < 0) { return; }
      var u: any = (c.age - c.delay) / FALL_S;
      if (u < 0) { c.node.style.opacity = '0'; return; }
      u = Math.min(1, u);
      c.node.style.left = ((c.x + c.drift * u) * 100).toFixed(2) + '%';
      c.node.style.top = (-10 + (h + 20) * u).toFixed(1) + 'px';
      c.node.style.opacity = (u < 0.85 ? 1 : (1 - u) / 0.15).toFixed(3);
      c.node.style.transform = 'rotate(' + (c.rot + 360 * u).toFixed(0) + 'deg)';
    });
  }
  function paint() {
    runners.forEach(function (r?: any) {
      r.btn.style.transform = 'translateX(' + (r.p * (trackW - r.pw)).toFixed(1) + 'px)';
    });
  }

  // One simulation step: target speed per dog, slew-limited speed, progress.
  function step(dt?: any) {
    var live: any = runners.filter(function (r?: any) { return !r.done; });
    var lead: any = 0;
    runners.forEach(function (r?: any) { if (r.p > lead) { lead = r.p; } });
    // boost: target holds for BOOST_S after the last cheer, then returns to 0; the factor follows it at a limited rate
    live.forEach(function (r?: any) {
      if (r.boostT > 0) { r.boostT -= dt; if (r.boostT <= 0) { r.boostT = 0; r.boostTarget = 0; } }
      var d: any = r.boostTarget - r.boost, m: any = BOOST_SLEW * dt;
      r.boost += d > m ? m : d < -m ? -m : d;
    });
    // raw speeds, their mean remaining time, and how strongly to pull everybody towards it
    var raw: any = live.map(function (r?: any) { return r.base * (1 + r.boost); });
    var tc: any = 0;
    live.forEach(function (r?: any, i?: any) { tc += (1 - r.p) / raw[i]; });
    tc = live.length ? tc / live.length : 1;
    var w: any = smooth((lead - BLEND_FROM) / (BLEND_TO - BLEND_FROM));
    live.forEach(function (r?: any, i?: any) {
      var common: any = (1 - r.p) / Math.max(tc, 0.5);
      var target: any = raw[i] + (common - raw[i]) * w;
      if (firstDone) { target = Math.max(target, (1 - r.p) / END_GAP_S); }
      var dv: any = target - r.v, m: any = ACC * dt;
      r.v += dv > m ? m : dv < -m ? -m : dv;
      r.p += r.v * dt;
      if (r.p >= 1) { r.p = 1; r.done = true; r.doneT = 0; firstDone = true; setMood(r, true); }
    });
  }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min((now - last) / 1000, 0.05); last = now;
    if (phase === 'run' || phase === 'party') {
      step(dt);
      runners.forEach(function (r?: any) {
        poseLegs(r, dt);
        if (r.done) {
          r.doneT += dt;
          if (r.wag > 0) { r.wag = Math.max(0, r.wag - dt / 0.8); }
          rotTail(r, 26 * (1 + 0.6 * r.wag) * Math.sin(2 * Math.PI * WAG_HZ * r.doneT));
        }
        r.puffs.forEach(function (pf?: any) {
          if (pf.age < 0) { return; }
          pf.age += dt;
          if (pf.age >= PUFF_S) { pf.age = -1; pf.node.style.display = 'none'; return; }
          var u: any = pf.age / PUFF_S;
          pf.node.style.opacity = (0.7 * (1 - u)).toFixed(3);
          pf.node.style.transform = 'translate(' + (-14 * u).toFixed(1) + 'px,' + (-8 * u).toFixed(1) + 'px) scale(' + (0.6 + 0.9 * u).toFixed(2) + ')';
        });
      });
      paint();
      if (phase === 'run' && runners.every(function (r?: any) { return r.done; })) {
        phase = 'party'; phaseT = 0; startConfetti();
        if (!wasReported) { wasReported = true; report(function (A?: any) { A.complete(); }); }
      }
      if (phase === 'party') {
        phaseT += dt;
        conf.forEach(function (c?: any) { if (c.age >= 0) { c.age += dt; } });
        paintConfetti();
        if (phaseT >= CONFETTI_S) { phase = 'out'; phaseT = 0; }
      }
    } else if (phase === 'out') {
      fieldOp = Math.max(0, fieldOp - dt / SWAP_S);
      field.style.opacity = fieldOp.toFixed(3);
      if (fieldOp <= 0) {
        newRace(); paint(); phase = 'in';
      }
    } else if (phase === 'in') {
      fieldOp = Math.min(1, fieldOp + dt / SWAP_S);
      field.style.opacity = fieldOp.toFixed(3);
      if (fieldOp >= 1) { phase = 'run'; }
    }
    if (alive && !raf && !document.hidden) { raf = requestAnimationFrame(frame); }
  }
  function start() {
    if (raf || document.hidden || !alive) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }

  function layout() {
    var fr: any = field.getBoundingClientRect();
    var laneH: any = Math.max(60, fr.height / LANES);
    trackW = Math.max(160, fr.width);
    var dh: any = Math.min(laneH - 20, 130), dw: any = dh * 6 / 5;
    dw = Math.min(dw, trackW * 0.34); dh = dw * 5 / 6;
    var bw: any = Math.max(56, dw); // button stays a 56px touch target; art is centred inside
    runners.forEach(function (r?: any) {
      r.lane.style.height = laneH + 'px';
      r.pw = bw; r.ph = dh + 18; r.dh = dh;
      r.btn.style.width = bw + 'px'; r.art.style.width = dw + 'px'; r.btn.style.height = (dh + 18) + 'px';
      r.art.style.height = dh + 'px';
    });
    paint();
  }
  function onResize() { layout(); }

  runners.forEach(function (r?: any) {
    r.btn.addEventListener('pointerdown', function (e?: any) { if (phase === 'out') { return; } cheer(r); e.preventDefault(); });
    r.btn.addEventListener('click', function (e?: any) { if (e.detail === 0 && phase !== 'out') { cheer(r); } });
  });
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  newRace();
  start();

  return function cleanup() {
    alive = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('visibilitychange', onVis);
    if (board.parentNode) { board.parentNode.removeChild(board); }
  };
}

export default function WyscigActivity() {
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
