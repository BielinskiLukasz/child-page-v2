// Activity "Aport": a park with a dog of a random breed (window.Dogs) and a ball. The child drags the ball and lets go; the ball lands
// in a short arc (0.8 s) at the release point (clamped inside the grass), the dog runs to it on a curved path (speed never above 60% of
// the screen width per second), picks it up and brings it back to its starting spot, where it sits and wags; one fetch takes 3-6 s.
// Throwing again while the dog is running redirects it smoothly (velocity is kept, only the target changes). Tapping the dog switches
// to another random breed with a sparkle. After 3 fetches in a row the dog spins happily and a heart rises (no counter).
// Positions are fractions of the grass area (rotation-safe); one capped-dt rAF loop that pauses while hidden and stops when idle.
// Keyboard: Tab to the ball, arrows move a ring, Enter/Space throws the ball to the ring; Tab to the dog, Enter/Space changes breed.
// Nothing is scored or stored. Usage metrics: track('interaction', {variant: breed}) per throw and per dog tap, complete() per fetch;
// the activity stays open-ended.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';
import { Dogs } from '../utils/dogs';

var FLY_S: any = 0.8, GRAB_S: any = 0.4, DROP_S: any = 0.3, SPIN_S: any = 0.9, HEART_S: any = 2.2, WAG_S: any = 2.5, SPARK_S: any = 0.6, SPARKS: any = 8;
var DIP_DEG: any = 30, CATCH_S: any = 0.2, HELD: any = 0.6;   // head dip at the catch, ball-to-mouth time, size of the held ball
var SPEED_CAP: any = 0.6;                 // of the grass width per second
var HOME: any = { x: 0.25, y: 0.76 };     // dog's starting spot (fractions of the grass)
var KEY_STEP: any = 0.06, FETCHES_FOR_REWARD: any = 3, BALL: any = 56, NAME_H: any = 18;
var lastBreed: any = '';

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
  root.className = 'ap';
  root.innerHTML =
    '<svg class="ap-sky" viewBox="0 0 400 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
    '<circle cx="340" cy="30" r="16" fill="#ffe27a"/><ellipse cx="90" cy="34" rx="34" ry="11" fill="#fff"/><ellipse cx="116" cy="28" rx="20" ry="10" fill="#fff"/>' +
    '<ellipse cx="250" cy="52" rx="26" ry="8" fill="#fff" fill-opacity=".85"/>' +
    '<rect x="30" y="66" width="6" height="34" rx="3" fill="#b98963"/><circle cx="33" cy="58" r="16" fill="#a9d98f"/>' +
    '<rect x="368" y="70" width="5" height="30" rx="2.5" fill="#b98963"/><circle cx="370" cy="64" r="13" fill="#b9e0a4"/></svg>' +
    '<div class="ap-grass"><div class="ap-shadow"></div>' +
    '<button type="button" class="ap-dog"><span class="ap-art"></span><span class="ap-name"></span></button>' +
    '<div class="ap-cur"></div>' +
    '<button type="button" class="ap-ball" aria-label="Piłka. Przeciągnij i puść, aby rzucić. Strzałki przesuwają kółko, Enter lub spacja rzuca."></button>' +
    '<div class="ap-fx"></div><div class="ap-heart"></div></div>';
  container.appendChild(root);
  var grass: any = root.querySelector('.ap-grass'), dogBtn: any = root.querySelector('.ap-dog'), art: any = root.querySelector('.ap-art');
  var nameEl: any = root.querySelector('.ap-name'), ballBtn: any = root.querySelector('.ap-ball'), shadow: any = root.querySelector('.ap-shadow');
  var cur: any = root.querySelector('.ap-cur'), fx: any = root.querySelector('.ap-fx'), heartEl: any = root.querySelector('.ap-heart');
  ballBtn.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#f7a8c9"/>' +
    '<path d="M5 17Q20 27 35 17" fill="none" stroke="#fff" stroke-width="3"/><circle cx="14" cy="12" r="4" fill="#fff" fill-opacity=".55"/></svg>';
  heartEl.innerHTML = '<svg viewBox="0 0 32 30" aria-hidden="true"><path d="M16 28C4 19 1 13 1 9a7 7 0 0 1 15-3a7 7 0 0 1 15 3c0 4-3 10-15 19z" fill="#f48aa8"/></svg>';
  var sparks: any = [], i: any;
  for (i = 0; i < SPARKS; i++) {
    var sp: any = document.createElement('div');
    sp.className = 'ap-spark'; sp.style.display = 'none';
    fx.appendChild(sp);
    sparks.push({ node: sp, ang: (i / SPARKS) * 6.2832 });
  }

  var W: any = 300, H: any = 400, dw: any = 90, dh: any = 75;
  var dog: any = { fx: HOME.x, fy: HOME.y, vx: 0, vy: 0, phase: 'sit', sx: 1, face: 1, breed: null, tx: 0, ty: 0, bias: 0.5, d0: 100, vmax: 100, vmaxT: 100,
    wagT: 0, wagPhase: 0, spinT: 0, runT: 0, happy: false, grabT: 0, grabDur: GRAB_S, fetchT: 0, fetches: 0, tail: null, tailP: [0, 0], calm: null, hap: null, head: null, dip: 0 };
  var ball: any = { fx: 0, fy: 0, mode: 'lying', rest: true, t: 0, x0: 0, y0: 0, x1: 0, y1: 0, h: 0, cx: 0, cy: 0, lift: 0, dropX: 0, dropY: 0 };
  var key: any = { fx: 0.7, fy: 0.55 };
  var sparkT: any = -1, sparkX: any = 0, sparkY: any = 0, heartT: any = -1, heartX: any = 0, heartY: any = 0;
  var alive: any = true, raf: any = 0, last: any = 0, dragId: any = null;

  // ---- geometry -------------------------------------------------------------------------------------------
  function ballClamp(px?: any, py?: any) { return [clamp(px, BALL / 2, W - BALL / 2), clamp(py, BALL - 10, H - 10)]; }
  function dogClampY(py?: any) { return clamp(py, dh + 4, H - NAME_H - 4); }
  function dogPx() { return [dog.fx * W, dog.fy * H]; }
  function restPx() { return ballClamp(HOME.x * W + dw * 0.62 + 30, HOME.y * H); }

  function setBreed(d?: any) {
    dog.breed = d; lastBreed = d.id;
    art.innerHTML = Dogs.draw(d.id);
    dog.calm = art.querySelector('.dg-calm'); dog.hap = art.querySelector('.dg-happy'); dog.tail = art.querySelector('.dg-tail'); dog.head = art.querySelector('.dg-head'); dog.lastTilt = NaN;
    dog.tailP = dog.tail ? [+dog.tail.getAttribute('data-px'), +dog.tail.getAttribute('data-py')] : [0, 0];
    nameEl.textContent = d.name;
    dogBtn.setAttribute('aria-label', 'Piesek: ' + d.name + '. Dotknij lub naciśnij Enter, aby zmienić rasę.');
    setMood(dog.happy); rotTail(0);
  }
  function setMood(on?: any) {
    dog.happy = on;
    if (dog.hap) { dog.hap.setAttribute('display', on ? 'inline' : 'none'); dog.calm.setAttribute('display', on ? 'none' : 'inline'); }
  }
  function rotTail(a?: any) { if (dog.tail) { dog.tail.setAttribute('transform', a ? 'rotate(' + a.toFixed(2) + ' ' + dog.tailP[0] + ' ' + dog.tailP[1] + ')' : ''); } }

  function layout() {
    var r: any = grass.getBoundingClientRect(), nw: any = Math.max(200, r.width), nh: any = Math.max(160, r.height);
    var kv: any = nw / W;
    dog.vx *= kv; dog.vy *= kv; dog.vmax *= kv; dog.vmaxT *= kv;
    W = nw; H = nh;
    dw = Math.min(W * 0.3, H * 0.41, 170); dh = dw * 5 / 6;
    var bw: any = Math.max(56, dw);
    dogBtn.style.width = bw + 'px'; dogBtn.style.height = (dh + NAME_H) + 'px';
    art.style.width = dw + 'px'; art.style.height = dh + 'px';
    dogBtn.dataset.bw = bw;
    if (ball.rest && ball.mode === 'lying') { var p: any = restPx(); ball.fx = p[0] / W; ball.fy = p[1] / H; }
    render();
  }

  // ---- rendering ------------------------------------------------------------------------------------------
  // Held-ball spot for a head tilt of deg (0 = level), in grass px: viewBox point -> art px -> mirrored by the current facing, plus bob.
  function mouthAt(deg?: any, sx?: any, bob?: any) {
    var m: any = Dogs.mouthPoint(dog.breed.id, deg), d: any = dogPx();
    return [d[0] + (m.x / 120 * dw - dw / 2) * sx, d[1] - dh * 0.3 + (m.y / 100 * dh - dh * 0.7) + bob];
  }
  function bobNow() { return dog.phase === 'run' || dog.phase === 'back' ? -Math.abs(Math.sin(dog.runT * 11)) * Math.min(1, Math.hypot(dog.vx, dog.vy) / 60) * 4 : 0; }
  function mouthPx() { return mouthAt(dog.dip, dog.sx, bobNow()); }
  function tiltHead(deg?: any) {
    if (!dog.head || deg === dog.lastTilt) { return; }
    dog.lastTilt = deg;
    var m: any = Dogs.mouthPoint(dog.breed.id, 0);
    dog.head.setAttribute('transform', deg ? 'rotate(' + deg.toFixed(2) + ' ' + m.px + ' ' + m.py + ')' : '');
  }
  function render() {
    var d: any = dogPx(), bw: any = +dogBtn.dataset.bw || 56;
    dogBtn.style.transform = 'translate(' + (d[0] - bw / 2).toFixed(1) + 'px,' + (d[1] - dh).toFixed(1) + 'px)';
    var bob: any = bobNow();
    tiltHead(dog.dip);
    var spin: any = dog.phase === 'spin' ? dog.spinT / SPIN_S : 0;
    var hop: any = spin ? -Math.sin(spin * Math.PI) * dh * 0.25 : 0;
    art.style.transform = 'translateY(' + (bob + hop).toFixed(1) + 'px) scaleX(' + dog.sx.toFixed(3) + ') rotate(' + ((dog.sx < 0 ? -1 : 1) * spin * 360).toFixed(1) + 'deg)';
    // ball
    var gx: any = ball.fx * W, gy: any = ball.fy * H, cx: any, cy: any, lift: any = 0, sh: any = 1, bs: any = 1;
    if (ball.mode === 'fly') {
      var u: any = clamp(ball.t / FLY_S, 0, 1);
      gx = ball.x0 + (ball.x1 - ball.x0) * u; gy = ball.y0 + (ball.y1 - ball.y0) * u; lift = ball.h * 4 * u * (1 - u);
    } else if (ball.mode === 'drag') { lift = 10; }
    if (ball.mode === 'carried') {
      var m: any = mouthPx(), g: any = ease(ball.t / CATCH_S);
      cx = gx + (m[0] - gx) * g; cy = (gy - BALL / 2) + (m[1] - (gy - BALL / 2)) * g; sh = 1 - g; bs = 1 - (1 - HELD) * g;
      if (ball.t >= CATCH_S) { cx = m[0]; cy = m[1]; sh = 0; bs = HELD; }
    } else if (ball.mode === 'drop') {
      var e: any = ease(ball.t / DROP_S), rp: any = restPx();
      cx = ball.dropX + (rp[0] - ball.dropX) * e; cy = ball.dropY + ((rp[1] - BALL / 2) - ball.dropY) * e - Math.sin(e * Math.PI) * 14;
      sh = e; bs = HELD + (1 - HELD) * e;
    } else { cx = gx; cy = gy - BALL / 2 - lift; }
    // while held the ball sits behind the dog's muzzle, so the front of the muzzle covers part of it
    dogBtn.style.zIndex = ball.mode === 'carried' || ball.mode === 'drop' ? '2' : '';
    ballBtn.style.transform = 'translate(' + (cx - BALL / 2).toFixed(1) + 'px,' + (cy - BALL / 2).toFixed(1) + 'px)' + (bs < 1 ? ' scale(' + bs.toFixed(3) + ')' : '');
    var sx: any = ball.mode === 'drop' ? restPx()[0] : gx, sy: any = ball.mode === 'drop' ? restPx()[1] : gy;
    shadow.style.opacity = (0.28 * sh * (1 - Math.min(0.7, lift / 160))).toFixed(3);
    shadow.style.transform = 'translate(' + (sx - 18).toFixed(1) + 'px,' + (sy - 5).toFixed(1) + 'px)';
    cur.style.transform = 'translate(' + (key.fx * W - 24).toFixed(1) + 'px,' + (key.fy * H - 24 - BALL / 2).toFixed(1) + 'px)';
    // sparkles and heart
    var s: any; void s;
    if (sparkT >= 0) {
      var su: any = sparkT / SPARK_S;
      sparks.forEach(function (p?: any) {
        var rr: any = 20 + 34 * ease(su);
        p.node.style.transform = 'translate(' + (sparkX + Math.cos(p.ang) * rr - 6).toFixed(1) + 'px,' + (sparkY + Math.sin(p.ang) * rr - 6).toFixed(1) + 'px) rotate(45deg) scale(' + (1 - su * 0.6).toFixed(2) + ')';
        p.node.style.opacity = (1 - su).toFixed(3);
      });
    }
    if (heartT >= 0) {
      var hu: any = heartT / HEART_S;
      heartEl.style.transform = 'translate(' + (heartX - 22).toFixed(1) + 'px,' + (heartY - 44 - 50 * ease(hu)).toFixed(1) + 'px) scale(' + (0.6 + 0.4 * Math.min(1, hu * 4)).toFixed(2) + ')';
      heartEl.style.opacity = (hu < 0.7 ? 1 : (1 - hu) / 0.3).toFixed(3);
    }
    ballBtn.classList.toggle('ap-off', !ballActive());
  }
  function ballActive() { return ball.mode === 'lying' && (dog.phase === 'sit' || dog.phase === 'run'); }

  // ---- behaviour ------------------------------------------------------------------------------------------
  function planSpeed() {
    var d: any = dogPx(), L: any = Math.hypot(dog.tx - d[0], dog.ty - d[1]) + Math.hypot(dog.tx - HOME.x * W, dog.ty - HOME.y * H);
    var T: any = clamp(1.6 + L / (0.3 * W), 3.6, 5.2);
    dog.vmaxT = Math.min(SPEED_CAP * W * 0.98, 1.1 * L / (T - 1.4));
    dog.vmaxT = Math.max(dog.vmaxT, 0.02 * W);
  }
  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function dipFor() { return reduced() ? 0 : DIP_DEG; }
  function aimAtBall() {
    var d: any = dogPx(), bx: any = ball.x1, by: any = ball.y1, dir: any = bx >= d[0] ? 1 : -1;
    dog.tx = clamp(bx - dir * (mouthAt(dipFor(), 1, 0)[0] - dogPx()[0]), dw * 0.4, W - dw * 0.4); dog.ty = dogClampY(by);
    dog.d0 = Math.max(60, Math.hypot(dog.tx - d[0], dog.ty - d[1]));
    dog.bias = (Math.random() < 0.5 ? -1 : 1) * 0.55;
    planSpeed();
  }
  function throwBall(x0?: any, y0?: any, x1?: any, y1?: any, _viaKey?: any) {
    if (ball.mode === 'carried') { var m: any = mouthPx(); x0 = m[0]; y0 = m[1] + BALL / 2; }
    var a: any = ballClamp(x1, y1);
    ball.rest = false; ball.mode = 'fly'; ball.t = 0; ball.x0 = x0; ball.y0 = y0; ball.x1 = a[0]; ball.y1 = a[1];
    ball.h = Math.min(130, H * 0.3);
    ball.fx = a[0] / W; ball.fy = a[1] / H;
    report(function (A?: any) { A.track('interaction', { variant: dog.breed.id }); });
    var first: any = dog.phase === 'sit';
    aimAtBall();
    if (dog.phase === 'grab' || dog.phase === 'back') {   // thrown away from the mouth: the dog lets go and runs to the new spot
      dog.phase = 'run'; dog.dip = 0; dog.vmax = Math.max(dog.vmax, Math.hypot(dog.vx, dog.vy)); setMood(false);
    }
    if (first) { dog.fetchT = 0; dog.phase = 'run'; dog.vmax = dog.vmaxT; dog.runT = 0; setMood(false); rotTail(0); }
    start();
  }
  function moveDog(tx?: any, ty?: any, dt?: any) {
    var d: any = dogPx(), dx: any = tx - d[0], dy: any = ty - d[1], dist: any = Math.hypot(dx, dy);
    var acc: any = dog.vmax * 2.5, spd: any = Math.hypot(dog.vx, dog.vy);
    if (dist < 1.5 && spd < 40) { dog.fx = tx / W; dog.fy = ty / H; dog.vx = dog.vy = 0; return true; }
    var a: any = Math.atan2(dy, dx) + dog.bias * Math.min(1, dist / (0.5 * dog.d0)) * (dist > 40 ? 1 : dist / 40);
    var s: any = Math.max(14, Math.min(dog.vmax, Math.sqrt(2 * acc * dist)));
    var wx: any = Math.cos(a) * s - dog.vx, wy: any = Math.sin(a) * s - dog.vy, wl: any = Math.hypot(wx, wy), m: any = acc * dt;
    if (wl > m) { wx *= m / wl; wy *= m / wl; }
    dog.vx += wx; dog.vy += wy;
    var nx: any = d[0] + dog.vx * dt, ny: any = d[1] + dog.vy * dt;
    // never overshoot the target within a frame
    if ((nx - tx) * (d[0] - tx) < 0 && (ny - ty) * (d[1] - ty) < 0 && Math.hypot(nx - tx, ny - ty) < 3) { nx = tx; ny = ty; }
    dog.fx = clamp(nx / W, 0.01, 0.99); dog.fy = clamp(ny / H, 0.01, 0.99);
    return false;
  }
  function startReward() { dog.phase = 'spin'; dog.spinT = 0; heartT = 0; var d: any = dogPx(); heartX = d[0]; heartY = d[1] - dh; setMood(true); }

  function step(dt?: any) {
    var spd: any;
    // ball
    if (ball.mode === 'fly') {
      ball.t += dt;
      if (ball.t >= FLY_S) { ball.mode = 'lying'; ball.t = 0; }
    } else if (ball.mode === 'carried') { ball.t = Math.min(ball.t + dt, CATCH_S); }
    else if (ball.mode === 'drop') { ball.t += dt; if (ball.t >= DROP_S) { ball.mode = 'lying'; ball.rest = true; var p: any = restPx(); ball.fx = p[0] / W; ball.fy = p[1] / H; } }
    // dog
    if (dog.phase === 'run') {
      dog.runT += dt; dog.fetchT += dt;
      dog.vmax += clamp(dog.vmaxT - dog.vmax, -0.25 * W * dt, 0.25 * W * dt);
      if (moveDog(dog.tx, dog.ty, dt) && ball.mode === 'lying') {
        dog.grabDur = clamp(3.6 - 2 * dog.fetchT, GRAB_S, 2.4);   // a very short throw still takes about 3 s
        dog.phase = 'grab'; dog.grabT = 0; dog.face = ball.x1 >= dog.fx * W ? 1 : -1; setMood(true);
        ball.mode = 'carried'; ball.t = 0; ball.rest = false;
        ball.fx = ball.x1 / W; ball.fy = ball.y1 / H;
      }
    } else if (dog.phase === 'grab') {
      dog.grabT += dt; dog.fetchT += dt;
      dog.dip = Math.sin(Math.PI * Math.min(1, dog.grabT / (2 * CATCH_S))) * dipFor();   // head lowers to the ball and comes up with it
      if (dog.grabT >= dog.grabDur) {
        dog.dip = 0;
        dog.phase = 'back'; dog.tx = HOME.x * W; dog.ty = HOME.y * H;
        var d0: any = dogPx(); dog.d0 = Math.max(60, Math.hypot(dog.tx - d0[0], dog.ty - d0[1])); dog.bias = -dog.bias;
      }
    } else if (dog.phase === 'back') {
      dog.runT += dt; dog.fetchT += dt;
      if (moveDog(HOME.x * W, HOME.y * H, dt)) {
        var m: any = mouthPx();
        ball.mode = 'drop'; ball.t = 0; ball.dropX = m[0]; ball.dropY = m[1];
        dog.fetches++;
        report(function (A?: any) { A.complete(); });
        if (dog.fetches >= FETCHES_FOR_REWARD) { dog.fetches = 0; startReward(); } else { dog.phase = 'sit'; dog.wagT = 0; }
      }
    } else if (dog.phase === 'spin') {
      dog.spinT += dt;
      if (dog.spinT >= SPIN_S) { dog.phase = 'sit'; dog.wagT = 0; art.style.transform = ''; }
    } else if (dog.phase === 'sit') {
      if (dog.wagT < WAG_S) {
        dog.wagT += dt; dog.wagPhase += dt;
        var env: any = dog.happy ? Math.min(1, (WAG_S - dog.wagT) / 0.4) : 0;
        rotTail(env * 26 * Math.sin(2 * Math.PI * 2.2 * dog.wagPhase));
        if (dog.wagT >= WAG_S) { rotTail(0); }
      }
    }
    spd = Math.hypot(dog.vx, dog.vy);
    if (spd > 20) { dog.face = dog.vx >= 0 ? 1 : -1; }
    var ts: any = dog.face, ds: any = 9 * dt;
    dog.sx += clamp(ts - dog.sx, -ds, ds);
    if (sparkT >= 0) { sparkT += dt; if (sparkT >= SPARK_S) { sparkT = -1; sparks.forEach(function (p?: any) { p.node.style.display = 'none'; }); } }
    if (heartT >= 0) { heartT += dt; if (heartT >= HEART_S) { heartT = -1; heartEl.style.opacity = '0'; } }
  }
  function busy() {
    return dog.phase !== 'sit' || dog.wagT < WAG_S || ball.mode !== 'lying' && ball.mode !== 'drag' || sparkT >= 0 || heartT >= 0 || Math.abs(dog.sx - dog.face) > 0.001;
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
  function localPt(e?: any) { var r: any = grass.getBoundingClientRect(); return ballClamp(e.clientX - r.left, e.clientY - r.top); }
  function moveDrag(e?: any) {
    if (dragId === null || e.pointerId !== dragId) { return; }
    var p: any = localPt(e); ball.fx = p[0] / W; ball.fy = p[1] / H; render();
  }
  function endDrag(e?: any) {
    if (dragId === null || e.pointerId !== dragId) { return; }
    dragId = null;
    try { ballBtn.releasePointerCapture(e.pointerId); } catch (x: any) { /* already released */ }
    var p: any = ballClamp(ball.fx * W, ball.fy * H);
    throwBall(p[0], p[1], p[0], p[1]);
  }
  ballBtn.addEventListener('pointerdown', function (e?: any) {
    if (!ballActive() || dragId !== null) { return; }
    dragId = e.pointerId; ball.mode = 'drag'; ball.rest = false;
    try { ballBtn.setPointerCapture(e.pointerId); } catch (x: any) { /* unsupported */ }
    moveDrag(e); start(); e.preventDefault();
  });
  ballBtn.addEventListener('pointermove', moveDrag);
  ballBtn.addEventListener('pointerup', endDrag);
  ballBtn.addEventListener('pointercancel', function (e?: any) {
    if (dragId === null || e.pointerId !== dragId) { return; }
    dragId = null; ball.mode = 'lying'; render(); start();
  });
  ballBtn.addEventListener('click', function (e?: any) {
    if (e.detail !== 0 || !(ballActive() || ball.mode === 'carried')) { return; }  // pointer taps are handled by pointerdown/up
    var p: any = ballClamp(ball.fx * W, ball.fy * H), t: any = ballClamp(key.fx * W, key.fy * H);
    throwBall(p[0], p[1], t[0], t[1], true);
  });
  ballBtn.addEventListener('keydown', function (e?: any) {
    var dx: any = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0, dy: any = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!dx && !dy) { return; }
    var p: any = ballClamp((key.fx + dx * KEY_STEP) * W, (key.fy + dy * KEY_STEP) * H);
    key.fx = p[0] / W; key.fy = p[1] / H; render(); e.preventDefault();
  });
  ballBtn.addEventListener('focus', function () { grass.classList.add('ap-kb'); render(); });
  ballBtn.addEventListener('blur', function () { grass.classList.remove('ap-kb'); });
  dogBtn.addEventListener('click', function () {
    report(function (A?: any) { A.track('interaction', { variant: dog.breed.id }); });
    if (ball.mode === 'carried') {   // the new dog sits at the start with the ball released beside it
      ball.mode = 'lying'; ball.rest = true; var rp: any = restPx(); ball.fx = rp[0] / W; ball.fy = rp[1] / H; ball.t = 0;
      dog.phase = 'sit'; dog.fx = HOME.x; dog.fy = HOME.y; dog.vx = dog.vy = 0; dog.dip = 0; dog.wagT = WAG_S; dog.grabT = 0;
    }
    setBreed(pickBreed(dog.breed.id));
    var d: any = dogPx(); sparkX = d[0]; sparkY = d[1] - dh * 0.5; sparkT = 0;
    sparks.forEach(function (p?: any) { p.node.style.display = ''; });
    render(); start();
  });

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('visibilitychange', onVis);
  setBreed(pickBreed(lastBreed));
  var p0: any = restPx();
  layout();
  p0 = restPx(); ball.fx = p0[0] / W; ball.fy = p0[1] / H;
  key.fx = 0.7; key.fy = 0.55;
  render();
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

export default function AportActivity() {
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
