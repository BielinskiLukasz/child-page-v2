// Activity "Literki": one big letter (Aa) on a soft card with a friendly picture of something that starts with it.
// Touch the picture: it wiggles gently and its Polish word shows small underneath for ~3 s (for the parent to read);
// touch the letter: it glows softly. Arrows (or a gentle swipe) slide to the next / previous letter;
// all 32 Polish letters in a random order (each once per round, then a new round), with a random one of several
// pictures each time. No scores, no wrong answers, no sound; nothing changes by itself.
// All motion runs in one capped-dt rAF loop (so it works under prefers-reduced-motion, where wiggle/slide are replaced
// by a soft fade); the loop stops when idle and pauses while hidden. Nothing is stored.
import { useEffect, useRef } from 'react';
import { Analytics } from '../utils/analytics';
import { LITERKI_DATA } from '../data/literkiData';
import { Rand } from '../utils/rand';

var LETTERS: any = LITERKI_DATA || [];
var SLIDE_S: any = 0.5, WIGGLE_S: any = 0.8, WORD_S: any = 3, WORD_FADE_S: any = 0.5, GLOW_S: any = 1;

function picSvg(P?: any) { return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + P.svg + '</svg>'; }
function smooth(t?: any) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

function mount(container: HTMLElement) {
  container.style.display = 'block';
  var root: any = document.createElement('div');
  root.className = 'lt';
  root.innerHTML = '<div class="lt-field"><button type="button" class="lt-nav lt-prev" aria-label="Poprzednia litera"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5L8 12l7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    '<div class="lt-card"><button type="button" class="lt-letter"><span class="lt-lt"></span></button>' +
    '<div class="lt-picwrap"><button type="button" class="lt-pic"></button><div class="lt-word" aria-live="polite"></div></div></div>' +
    '<button type="button" class="lt-nav lt-next" aria-label="Następna litera"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>';
  container.appendChild(root);
  var card: any = root.querySelector('.lt-card'), letterBtn: any = root.querySelector('.lt-letter'),
    letterTxt: any = root.querySelector('.lt-lt'), picBtn: any = root.querySelector('.lt-pic'), wordEl: any = root.querySelector('.lt-word'),
    prev: any = root.querySelector('.lt-prev'), next: any = root.querySelector('.lt-next');

  var order: any = Rand.shuffle(LETTERS), idx: any = 0, slide: any = null, wiggle: any = -1, wordT: any = -1, glow: any = -1, raf: any = 0, last: any = 0;

  // Every letter once per round in random order; a new random round starts after the last letter (the first of a
  // new round is never the letter just shown). A random picture of the letter is drawn on each showing.
  function show(i?: any) {
    if (i >= order.length) {
      var lastL: any = order[order.length - 1];
      order = Rand.shuffle(LETTERS);
      if (order.length > 1 && order[0] === lastL) { order.push(order.shift()); }
      i = 0;
    }
    idx = (i + order.length) % order.length;
    var L: any = order[idx], P: any = Rand.pickOne(L.pics, 'literki-' + L.l);
    Analytics.levelStart(0, L.l);
    letterTxt.textContent = L.u + L.l;
    letterBtn.setAttribute('aria-label', 'Litera ' + L.u);
    picBtn.innerHTML = picSvg(P);
    picBtn.setAttribute('aria-label', 'Obrazek: ' + P.w);
    wordEl.textContent = P.c ? P.w + ' \u00b7 ' + L.l + ' w s\u0142owie' : P.w;
    wordEl.style.opacity = '0'; wordT = -1; wiggle = -1; glow = -1;
    picBtn.style.transform = ''; letterBtn.style.filter = '';
  }
  function go(dir?: any) {
    if (slide) { return; }          // very quick touches during the change are ignored
    slide = { t: 0, dir: dir, swapped: false };
    start();
  }
  function onPic() { Analytics.track('interaction', { variant: order[idx].l }); wiggle = 0; wordT = 0; start(); }
  function onLetter() { Analytics.track('interaction', { variant: order[idx].l }); glow = 0; start(); }

  function frame(now?: any) {
    raf = 0;
    var dt: any = Math.min((now - last) / 1000, 0.05); last = now;
    var busy: any = false, rm: any = reduced();
    if (slide) {
      slide.t += dt; busy = true;
      var u: any = slide.t / SLIDE_S, op: any, dx: any = 0;
      if (u < 0.5) { op = 1 - u * 2; dx = -slide.dir * smooth(u * 2) * 60; }
      else {
        if (!slide.swapped) { slide.swapped = true; show(idx + slide.dir); }
        op = (u - 0.5) * 2; dx = slide.dir * (1 - smooth((u - 0.5) * 2)) * 60;
      }
      card.style.opacity = Math.max(0, Math.min(1, op)).toFixed(3);
      card.style.transform = rm ? '' : 'translateX(' + dx.toFixed(1) + 'px)';
      if (u >= 1) { slide = null; card.style.opacity = '1'; card.style.transform = ''; }
    }
    if (wiggle >= 0) {
      wiggle += dt;
      var w: any = wiggle / WIGGLE_S;
      if (w >= 1 || rm) { picBtn.style.transform = ''; wiggle = -1; }
      else { picBtn.style.transform = 'rotate(' + (7 * Math.sin(w * Math.PI * 6) * (1 - w)).toFixed(2) + 'deg)'; busy = true; }
    }
    if (wordT >= 0) {
      wordT += dt; busy = wordT >= 0 || busy;
      var o: any = wordT < 0.25 ? wordT / 0.25 : wordT < WORD_S ? 1 : 1 - (wordT - WORD_S) / WORD_FADE_S;
      if (wordT >= WORD_S + WORD_FADE_S) { wordT = -1; o = 0; }
      wordEl.style.opacity = Math.max(0, Math.min(1, o)).toFixed(3);
    }
    if (glow >= 0) {
      glow += dt;
      var g: any = Math.sin(Math.PI * Math.min(1, glow / GLOW_S));
      letterBtn.style.filter = g > 0.01 ? 'drop-shadow(0 0 ' + (4 + 18 * g).toFixed(1) + 'px #ffe08a)' : '';
      if (glow >= GLOW_S) { glow = -1; letterBtn.style.filter = ''; } else { busy = true; }
    }
    if (busy && !document.hidden) { raf = requestAnimationFrame(frame); }
  }
  function start() {
    if (raf || document.hidden) { return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { start(); }
  }

  // gentle swipe on the card
  var sx: any = null;
  function sdown(e?: any) { sx = e.clientX; }
  function sup(e?: any) {
    if (sx === null) { return; }
    var dx: any = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 60) { go(dx < 0 ? 1 : -1); }
  }

  prev.addEventListener('click', function () { go(-1); });
  next.addEventListener('click', function () { go(1); });
  picBtn.addEventListener('click', onPic);
  letterBtn.addEventListener('click', onLetter);
  card.addEventListener('pointerdown', sdown);
  card.addEventListener('pointerup', sup);
  card.addEventListener('pointercancel', function () { sx = null; });
  document.addEventListener('visibilitychange', onVis);
  show(0);

  return function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    document.removeEventListener('visibilitychange', onVis);
    if (root.parentNode) { root.parentNode.removeChild(root); }
  };
}

export default function LiterkiActivity() {
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
