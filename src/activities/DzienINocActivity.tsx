import { useEffect, useMemo, useRef } from 'react';

const MAX_CLOUDS = 7;
const AMBIENT = 3;
const TRANSITION_MS = 3500;
const REDUCED_MS = 1200;

const BIRD_SECONDS = 20;
const LOOP_SECONDS = 2.6;

const STAR_ADD_MIN = 15;
const STAR_ADD_MAX = 30;
const STAR_GROW_SECONDS = 8;
const STAR_CAP = 160;

const FLY_MIN = 20;
const FLY_MAX = 45;
const SAT_SECONDS = 18;
const PLANE_SECONDS = 12;
const BLINK_SECONDS = 0.7;

const CLOUD_SVG =
  '<svg viewBox="0 0 120 60" aria-hidden="true" focusable="false"><g fill="#fff"><circle cx="35" cy="38" r="20"/>' +
  '<circle cx="60" cy="28" r="26"/><circle cx="88" cy="38" r="20"/><rect x="35" y="38" width="53" height="20" rx="10"/></g></svg>';

const BIRD_SVG =
  '<svg viewBox="-30 -20 60 40" aria-hidden="true" focusable="false"><g fill="#7a7396">' +
  '<g class="dn-wing"><path d="M0 0Q-14 -16 -28 -6Q-14 -6 0 4z"/><path d="M0 0Q14 -16 28 -6Q14 -6 0 4z"/></g>' +
  '<ellipse cx="0" cy="3" rx="9" ry="5"/><circle cx="8" cy="0" r="4"/><path d="M11 -1l6 2-6 1z" fill="#ffd98a"/></g></svg>';

interface StarPoint {
  left: string;
  top: string;
  size: string;
  opacity: string;
}

function makeInitialStars(): StarPoint[] {
  const out: StarPoint[] = [];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  while (out.length < 100) {
    const bright = rnd() < 0.1;
    const sz = bright ? 3 + rnd() : 1.4 + rnd() * 1.3;
    const op = bright ? 0.9 : 0.4 + rnd() * 0.4;
    out.push({
      left: `${(2 + rnd() * 96).toFixed(1)}%`,
      top: `${(2 + rnd() * 94).toFixed(1)}%`,
      size: `${sz.toFixed(1)}px`,
      opacity: op.toFixed(2),
    });
  }
  return out;
}

interface CloudEntity {
  node: HTMLDivElement;
  x: number;
  speed: number;
  tapped: boolean;
}

interface BirdEntity {
  node: HTMLButtonElement;
  wing: SVGGElement | null;
  u: number;
  ltr: boolean;
  lane: number;
  secs: number;
  ph: number;
  loop: number;
}

interface GrowingStar {
  node: HTMLElement;
  t: number;
  target: number;
}

interface NightFlyer {
  node: HTMLDivElement;
  plane: boolean;
  u: number;
  t: number;
  ltr: boolean;
  y: number;
  slope: number;
}

function easeSmoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export default function DzienINocActivity() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const starBoxRef = useRef<HTMLDivElement>(null);
  const cloudBoxRef = useRef<HTMLDivElement>(null);
  const bodyBtnRef = useRef<HTMLButtonElement>(null);

  const initialStars = useMemo(() => makeInitialStars(), []);

  useEffect(() => {
    const scene = sceneRef.current;
    const starBox = starBoxRef.current;
    const cloudBox = cloudBoxRef.current;
    const bodyBtn = bodyBtnRef.current;
    if (!scene || !starBox || !cloudBox || !bodyBtn) return;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let progress = 0;
    let target = 0;
    let stepFrom = 0;
    let stepT = 0;
    let busy = false;
    let stepRaf = 0;
    let stepLast = 0;
    let hidden = document.hidden;

    const clouds: CloudEntity[] = [];
    const birds: BirdEntity[] = [];
    const timers: number[] = [];
    const addedStars: HTMLElement[] = [];

    const renderProgress = () => {
      scene.style.setProperty('--p', progress.toFixed(3));
      const isNight = progress >= 0.5;
      bodyBtn.setAttribute('aria-label', isNight ? 'Księżyc' : 'Słońce');
    };

    const stepTransition = (now: number) => {
      stepRaf = 0;
      const dt = Math.min(now - stepLast, 100);
      stepLast = now;
      const dur = reduced ? REDUCED_MS : TRANSITION_MS;
      stepT = Math.min(stepT + dt / dur, 1);
      progress = stepFrom + (target - stepFrom) * easeSmoothstep(stepT);
      renderProgress();
      if (stepT >= 1) {
        progress = target;
        busy = false;
        renderProgress();
        return;
      }
      stepRaf = requestAnimationFrame(stepTransition);
    };

    const toggleDayNight = () => {
      busy = true;
      stepFrom = progress;
      stepT = 0;
      target = progress < 0.5 ? 1 : 0;
      stepLast = performance.now();
      if (!hidden && !stepRaf) {
        stepRaf = requestAnimationFrame(stepTransition);
      }
    };

    // ── Clouds ──────────────────────────────────────────────────
    const placeCloud = (c: CloudEntity) => {
      c.node.style.transform = `translateX(${c.x.toFixed(2)}vw)`;
    };

    const removeCloud = (c: CloudEntity) => {
      const idx = clouds.indexOf(c);
      if (idx >= 0) clouds.splice(idx, 1);
      c.node.remove();
    };

    const addCloud = (x: number, y: number, speed: number, tapped: boolean): CloudEntity => {
      while (clouds.length >= MAX_CLOUDS) {
        removeCloud(clouds[0]);
      }
      const node = document.createElement('div');
      node.className = 'dn-cloud';
      node.innerHTML = CLOUD_SVG;
      node.style.top = `${y}%`;
      node.style.setProperty('--w', `${(18 + Math.random() * 12).toFixed(2)}vmin`);
      cloudBox.appendChild(node);
      const entity: CloudEntity = { node, x, speed, tapped };
      clouds.push(entity);
      placeCloud(entity);
      return entity;
    };

    const ensureAmbientClouds = () => {
      let ambientCount = clouds.filter((c) => !c.tapped).length;
      while (ambientCount < AMBIENT) {
        addCloud(
          ambientCount === 0 && clouds.length === 0 ? 10 : -25 - Math.random() * 20,
          8 + Math.random() * 40,
          1.6 + Math.random() * 0.8,
          false,
        );
        ambientCount++;
      }
    };

    [8, 42, 70].forEach((x, idx) => {
      addCloud(x, 10 + idx * 14, 1.6 + idx * 0.4, false);
    });

    // ── Birds ───────────────────────────────────────────────────
    const flockSize = 2 + Math.floor(Math.random() * 2);
    let respawnTimers: number[] = [];
    let flockOn = false;

    const removeBird = (b: BirdEntity) => {
      const idx = birds.indexOf(b);
      if (idx >= 0) birds.splice(idx, 1);
      b.node.remove();
    };

    const laneY = (b: BirdEntity, w: number, h: number, bh: number) => {
      const size = Math.min(Math.max(150, Math.min(w, h) * 0.38), 320);
      const top = h * 0.42 - size / 2;
      const bottom = h * 0.42 + size / 2;
      const R = Math.min(w, h) * 0.07;
      const m = h * 0.02 + 4;
      const t0 = m + R;
      const t1 = top - bh - m;
      const b0 = bottom + m;
      const b1 = h - bh - m - R;
      const lt = Math.max(t1 - t0, 0);
      const lb = Math.max(b1 - b0, 0);
      const tot = lt + lb;
      if (tot <= 0) return { y: Math.max(t0, 0), dir: 0 };
      const d = b.lane * tot;
      return d < lt ? { y: t0 + d, dir: -1 } : { y: b0 + (d - lt), dir: 1 };
    };

    const placeBird = (b: BirdEntity, dt: number) => {
      const w = scene.clientWidth;
      const h = scene.clientHeight;
      const bw = b.node.offsetWidth || 56;
      const bh = Math.max(b.node.offsetHeight || 56, 56);
      b.u += dt / b.secs;
      b.ph += dt * 2.4 * Math.PI;

      const ly = laneY(b, w, h, bh);
      let x = -bw + b.u * (w + 2 * bw);
      let y = ly.y + Math.sin(b.u * 5 + b.lane * 6) * h * 0.02;
      const R = Math.min(w, h) * 0.07;

      if (!b.ltr) {
        x = w - x - bw;
      }

      if (b.loop >= 0) {
        b.loop += dt / LOOP_SECONDS;
        if (b.loop >= 1) {
          b.loop = -1;
        } else {
          const a = b.loop * 2 * Math.PI;
          const env = Math.sin(b.loop * Math.PI);
          x += (b.ltr ? 1 : -1) * R * Math.sin(a) * env;
          y += (ly.dir || -1) * R * (1 - Math.cos(a)) * 0.5 * env;
        }
      }

      const flap = 0.55 + 0.45 * Math.cos(b.ph);
      b.wing?.setAttribute('transform', `scale(1 ${flap.toFixed(3)})`);
      b.node.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${b.ltr ? 1 : -1},1)`;
    };

    const spawnBird = (initialU: number) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'dn-bird';
      node.setAttribute('aria-label', 'Ptaszek');
      node.innerHTML = BIRD_SVG;
      scene.appendChild(node);

      const entity: BirdEntity = {
        node,
        wing: node.querySelector('.dn-wing'),
        u: initialU,
        ltr: Math.random() < 0.5,
        lane: Math.random(),
        secs: BIRD_SECONDS * (0.85 + Math.random() * 0.4),
        ph: Math.random() * 6.28,
        loop: -1,
      };
      birds.push(entity);
      placeBird(entity, 0);
    };

    const clearFlock = () => {
      birds.slice().forEach(removeBird);
      respawnTimers = [];
      flockOn = false;
    };

    const birdTick = (dt: number) => {
      if (progress >= 0.5) {
        if (birds.length > 0 || flockOn) clearFlock();
        return;
      }
      if (!flockOn) {
        if (!(progress < 0.05 && target === 0)) return;
        flockOn = true;
        for (let i = 0; i < flockSize; i++) {
          spawnBird(((i + Math.random() * 0.6) / flockSize) * 0.9);
        }
        return;
      }

      birds.slice().forEach((b) => {
        if (b.u >= 1) {
          removeBird(b);
          respawnTimers.push(Math.random() * 1.5);
        } else {
          placeBird(b, dt);
        }
      });

      respawnTimers = respawnTimers
        .map((t) => t - dt)
        .filter((t) => {
          if (t > 0 || birds.length >= flockSize) return t > 0;
          spawnBird(0);
          return false;
        });
    };

    const touchBird = (birdNode: Element) => {
      const found = birds.find((b) => b.node === birdNode);
      if (found && found.loop < 0) {
        found.loop = 0;
      }
    };

    // ── Slowly growing night stars ──────────────────────────────
    let starCount = 100;
    let starWait = STAR_ADD_MIN + Math.random() * (STAR_ADD_MAX - STAR_ADD_MIN);
    let growing: GrowingStar[] = [];

    const addNewStar = () => {
      const r = Math.random();
      const bright = r < 0.1;
      const targetSize = bright ? 3 + Math.random() : r < 0.35 ? 1 : 1.4 + Math.random() * 1.3;
      const node = document.createElement('i');
      const opacity = (bright ? 0.9 : 0.4 + Math.random() * 0.4).toFixed(2);
      node.style.cssText = `left:${(2 + Math.random() * 96).toFixed(1)}%;top:${(2 + Math.random() * 94).toFixed(1)}%;width:1px;height:1px;transform:translate(-50%,-50%);opacity:${opacity}`;
      starBox.appendChild(node);
      addedStars.push(node);
      starCount++;
      if (targetSize > 1) {
        growing.push({ node, t: 0, target: targetSize });
      }
    };

    const starTick = (dt: number) => {
      if (starCount < STAR_CAP) {
        starWait -= dt;
        if (starWait <= 0) {
          starWait = STAR_ADD_MIN + Math.random() * (STAR_ADD_MAX - STAR_ADD_MIN);
          addNewStar();
        }
      }
      growing = growing.filter((g) => {
        g.t = Math.min(g.t + dt / STAR_GROW_SECONDS, 1);
        const px = `${(1 + (g.target - 1) * easeSmoothstep(g.t)).toFixed(2)}px`;
        g.node.style.width = px;
        g.node.style.height = px;
        return g.t < 1;
      });
    };

    // ── Night flyer (satellite or plane) ────────────────────────
    let flyer: NightFlyer | null = null;
    let flyWait = FLY_MIN + Math.random() * (FLY_MAX - FLY_MIN);

    const removeFlyer = () => {
      flyer?.node.remove();
      flyer = null;
    };

    const placeFlyer = (dt: number) => {
      if (!flyer) return;
      flyer.u += dt / (flyer.plane ? PLANE_SECONDS : SAT_SECONDS);
      flyer.t += dt;
      const x = flyer.ltr ? -2 + flyer.u * 104 : 102 - flyer.u * 104;
      flyer.node.style.left = `${x.toFixed(2)}%`;
      flyer.node.style.top = `${(flyer.y + flyer.u * flyer.slope).toFixed(2)}%`;
      if (flyer.plane) {
        const pulse = 0.5 - 0.5 * Math.cos((2 * Math.PI * flyer.t) / BLINK_SECONDS);
        flyer.node.style.setProperty('--pulse', pulse.toFixed(3));
      }
    };

    const flyerTick = (dt: number) => {
      if (flyer) {
        if (progress < 0.5 || flyer.u >= 1) {
          removeFlyer();
        } else {
          placeFlyer(dt);
        }
      } else if (progress >= 0.95 && target === 1) {
        flyWait -= dt;
        if (flyWait <= 0) {
          flyWait = FLY_MIN + Math.random() * (FLY_MAX - FLY_MIN);
          const node = document.createElement('div');
          const plane = Math.random() < 0.5;
          node.className = `dn-fly${plane ? ' plane' : ''}`;
          starBox.appendChild(node);
          flyer = {
            node,
            plane,
            u: 0,
            t: 0,
            ltr: Math.random() < 0.5,
            y: 4 + Math.random() * 40,
            slope: (Math.random() - 0.5) * 12,
          };
          placeFlyer(0);
        }
      }
    };

    // ── Continuous ambient loop ─────────────────────────────────
    let ambientLast = performance.now();
    let ambientRaf = 0;

    const ambientTick = (now: number) => {
      ambientRaf = 0;
      const dt = Math.min(now - ambientLast, 100) / 1000;
      ambientLast = now;

      birdTick(dt);
      flyerTick(dt);
      starTick(dt);

      if (!reduced) {
        clouds.slice().forEach((c) => {
          c.x += c.speed * dt;
          if (c.x > 105) {
            removeCloud(c);
          } else {
            placeCloud(c);
          }
        });
        ensureAmbientClouds();
      }

      if (!hidden) {
        ambientRaf = requestAnimationFrame(ambientTick);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      const targetEl = event.target as Element | null;
      const birdNode = targetEl?.closest('.dn-bird');
      if (birdNode) {
        touchBird(birdNode);
        return;
      }
      if (busy) return;
      if (targetEl?.closest('.dn-body')) {
        toggleDayNight();
        return;
      }

      const rect = scene.getBoundingClientRect();
      const h = Math.max(rect.height, 1);
      const w = Math.max(rect.width, 1);
      const relY = ((event.clientY - rect.top) / h) * 100;
      const relX = ((event.clientX - rect.left) / w) * 100;
      const y = Math.min(Math.max(relY - 8, 2), 70);

      if (reduced) {
        const c = addCloud(Math.min(Math.max(relX - 12, 0), 75), y, 0, true);
        const timerId = window.setTimeout(() => {
          const i = timers.indexOf(timerId);
          if (i >= 0) timers.splice(i, 1);
          removeCloud(c);
        }, 6000);
        timers.push(timerId);
      } else {
        addCloud(-30, y, 3.2, true);
      }
    };

    const onClick = (event: MouseEvent) => {
      if (event.detail !== 0) return;
      const targetEl = event.target as Element | null;
      const birdNode = targetEl?.closest('.dn-bird');
      if (birdNode) {
        touchBird(birdNode);
        return;
      }
      if (busy || !targetEl?.closest('.dn-body')) return;
      toggleDayNight();
    };

    const onVisibility = () => {
      hidden = document.hidden;
      scene.classList.toggle('paused', hidden);
      if (!hidden) {
        stepLast = ambientLast = performance.now();
        if (busy && !stepRaf) {
          stepRaf = requestAnimationFrame(stepTransition);
        }
        if (!ambientRaf) {
          ambientRaf = requestAnimationFrame(ambientTick);
        }
      }
    };

    scene.addEventListener('pointerdown', onPointerDown);
    scene.addEventListener('click', onClick);
    document.addEventListener('visibilitychange', onVisibility);
    renderProgress();
    ambientRaf = requestAnimationFrame(ambientTick);

    return () => {
      if (stepRaf) cancelAnimationFrame(stepRaf);
      if (ambientRaf) cancelAnimationFrame(ambientRaf);
      timers.forEach((id) => window.clearTimeout(id));
      scene.removeEventListener('pointerdown', onPointerDown);
      scene.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibility);
      clouds.slice().forEach(removeCloud);
      clearFlock();
      removeFlyer();
      addedStars.forEach((el) => el.remove());
    };
  }, []);

  return (
    <div className="act-stage stage">
      <div ref={sceneRef} className="dn">
        <div className="dn-night" />

        <div ref={starBoxRef} className="dn-stars" aria-hidden="true">
          {initialStars.map((s, idx) => (
            <i
              key={idx}
              style={{
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                opacity: s.opacity,
              }}
            />
          ))}
        </div>

        <div ref={cloudBoxRef} className="dn-clouds" aria-hidden="true" />

        <button ref={bodyBtnRef} className="dn-body" type="button" aria-label="Słońce">
          <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <g className="dn-sun">
              <g stroke="#ffd96a" strokeWidth={5} strokeLinecap="round">
                <path d="M50 6v10M50 84v10M6 50h10M84 50h10M19 19l7 7M74 74l7 7M81 19l-7 7M26 74l-7 7" />
              </g>
              <circle cx="50" cy="50" r="27" fill="#ffe08a" />
            </g>
            <g className="dn-moon">
              <circle cx="50" cy="50" r="30" fill="#f4f1d8" />
              <circle cx="38" cy="58" r="5" fill="#e3ddb8" />
              <circle cx="62" cy="38" r="4" fill="#e3ddb8" />
              <path
                d="M36 48q5 5 10 0M54 48q5 5 10 0"
                fill="none"
                stroke="#8a84a8"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <path
                d="M44 60q6 4 12 0"
                fill="none"
                stroke="#8a84a8"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </g>
          </svg>
        </button>
      </div>
    </div>
  );
}
