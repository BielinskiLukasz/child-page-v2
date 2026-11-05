// Anonymous, on-device usage metrics (TypeScript port of js/analytics.js).
// Stores only daily aggregates (last 90 days) plus running all-time totals in localStorage under 'swa.stats'.

import { ACTIVITIES } from '../data/activities';

const KEY = 'swa.stats';
const IDLE_MS = 60000;
const SESSION_GAP_MS = 30 * 60000;
const KEEP_DAYS = 90;
const MAX_TICK = 2000;
const QUICK_MS = 10000;
const FLUSH_MS = 5000;

const COMPLETABLE: Record<string, boolean> = {
  puzzle: true,
  pamiec: true,
  ksztalty: true,
  'policz-razem': true,
};

export type AnalyticsPeriod = 'session' | 'today' | '7d' | '30d' | 'all';

export interface ActivityAggregate {
  st: number;
  act: number;
  cmp: number;
  rc: number;
  rst: number;
  ex: number;
  qx: number;
  int: number;
  lc: number;
  lv: number;
  first: number;
  sh: Record<string, number>;
  tc: Record<string, number>;
}

export interface AnalyticsBucket {
  s: number;
  s0: number;
  s2: number;
  act: number;
  idle: number;
  hid: number;
  op: number;
  dist: number;
  t0: number;
  t1: number;
  acts: Record<string, ActivityAggregate>;
}

interface AnalyticsStore {
  v: 1;
  days: Record<string, AnalyticsBucket>;
  total: AnalyticsBucket;
  nDays: number;
}

interface SessionState {
  id: string;
  day: string;
  start: number;
  b: AnalyticsBucket;
  opened: number;
  seen: Record<string, 1>;
  seq: string[];
}

export interface RankingRow {
  rank: number;
  id: string;
  name: string;
  act: number;
  st: number;
  cmp: number;
  rc: number;
  rst: number;
  ex: number;
  qx: number;
  int: number;
  lv: number;
  lc: number;
  sh: Record<string, number>;
  tc: Record<string, number>;
  completable: boolean;
  pct: number;
  avg: number;
  rate: number | null;
}

export interface TrackPayload {
  activityId?: string | null;
  level?: number;
  variant?: string | number | null;
  duration?: number;
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
}

function newAct(): ActivityAggregate {
  return {
    st: 0,
    act: 0,
    cmp: 0,
    rc: 0,
    rst: 0,
    ex: 0,
    qx: 0,
    int: 0,
    lc: 0,
    lv: 0,
    first: 0,
    sh: {},
    tc: {},
  };
}

function newBucket(): AnalyticsBucket {
  return {
    s: 0,
    s0: 0,
    s2: 0,
    act: 0,
    idle: 0,
    hid: 0,
    op: 0,
    dist: 0,
    t0: 0,
    t1: 0,
    acts: {},
  };
}

function cleanMap(m: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (m && typeof m === 'object') {
    for (const k of Object.keys(m).slice(0, 80)) {
      out[String(k).slice(0, 8)] = num((m as Record<string, unknown>)[k]);
    }
  }
  return out;
}

function cleanBucket(raw: unknown): AnalyticsBucket {
  const b = newBucket();
  if (!raw || typeof raw !== 'object') return b;
  const r = raw as Record<string, unknown>;
  for (const k of ['s', 's0', 's2', 'act', 'idle', 'hid', 'op', 'dist', 't0', 't1'] as const) {
    b[k] = num(r[k]);
  }
  if (r.acts && typeof r.acts === 'object') {
    const actsObj = r.acts as Record<string, unknown>;
    for (const id of Object.keys(actsObj).slice(0, 200)) {
      const entry = actsObj[id];
      if (!entry || typeof entry !== 'object') continue;
      const e = entry as Record<string, unknown>;
      const a = newAct();
      for (const k of ['st', 'act', 'cmp', 'rc', 'rst', 'ex', 'qx', 'int', 'lc', 'lv', 'first'] as const) {
        a[k] = num(e[k]);
      }
      a.sh = cleanMap(e.sh);
      a.tc = cleanMap(e.tc);
      b.acts[String(id).slice(0, 40)] = a;
    }
  }
  return b;
}

function fresh(): AnalyticsStore {
  return { v: 1, days: {}, total: newBucket(), nDays: 0 };
}

function pad(n: number): string {
  return (n < 10 ? '0' : '') + n;
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function cutoffKey(daysBack: number): string {
  const d = new Date();
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysBack).getTime());
}

function prune(store: AnalyticsStore) {
  const cut = cutoffKey(KEEP_DAYS);
  for (const k of Object.keys(store.days)) {
    if (k < cut) delete store.days[k];
  }
}

let mem: AnalyticsStore | null = null;
let dirty = false;

function loadStore(): AnalyticsStore {
  const d = fresh();
  let raw: unknown = null;
  try {
    const str = window.localStorage.getItem(KEY);
    raw = str ? JSON.parse(str) : null;
  } catch {
    raw = mem;
  }
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (r.days && typeof r.days === 'object') {
      const daysObj = r.days as Record<string, unknown>;
      for (const k of Object.keys(daysObj)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
          d.days[k] = cleanBucket(daysObj[k]);
        }
      }
      d.total = cleanBucket(r.total);
      d.nDays = num(r.nDays);
    }
  }
  prune(d);
  return d;
}

let data: AnalyticsStore = typeof window !== 'undefined' ? loadStore() : fresh();
let sess: SessionState | null = null;
let cur: { id: string; t0: number; done: boolean } | null = null;
let lastTick = Date.now();
let lastInput = Date.now();
let hiddenAt = 0;
let lastFlush = 0;

function flush() {
  lastFlush = Date.now();
  if (!dirty) return;
  try {
    prune(data);
    mem = data;
    window.localStorage.setItem(KEY, JSON.stringify(data));
    dirty = false;
  } catch {
    /* kept in memory */
  }
}

function dayBucket(key: string): AnalyticsBucket {
  if (!data.days[key]) {
    data.days[key] = newBucket();
  }
  return data.days[key];
}

function actOf(b: AnalyticsBucket, id: string): ActivityAggregate {
  if (!b.acts[id]) {
    b.acts[id] = newAct();
  }
  return b.acts[id];
}

function each(fn: (b: AnalyticsBucket) => void, sessionScoped = false) {
  if (sess) fn(sess.b);
  fn(dayBucket(sessionScoped && sess ? sess.day : dayKey(Date.now())));
  fn(data.total);
  dirty = true;
}

function randomSessionId(): string {
  try {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    return Array.from(arr, (v) => (v < 16 ? '0' : '') + v.toString(16)).join('');
  } catch {
    let s = '';
    for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }
}

function startSession() {
  const now = Date.now();
  sess = {
    id: randomSessionId(),
    day: dayKey(now),
    start: now,
    b: newBucket(),
    opened: 0,
    seen: {},
    seq: [],
  };
  const newDay = !data.days[sess.day] || !data.days[sess.day].s;
  each((b) => {
    b.s++;
    b.s0++;
    if (!b.t0 || now < b.t0) b.t0 = now;
    b.t1 = Math.max(b.t1, now);
  }, true);
  if (newDay) data.nDays++;
  lastInput = now;
}

function endSession() {
  if (!sess) return;
  const now = Date.now();
  each((b) => {
    b.t1 = Math.max(b.t1, now);
  }, true);
  sess = null;
}

export function activityStart(id?: string | null) {
  if (!id) return;
  if (cur) activityEnd();
  if (!sess) startSession();
  const s = sess!;
  const now = Date.now();
  cur = { id, t0: now, done: false };
  s.opened++;
  s.seq.push(id);
  const again = Boolean(s.seen[id]);
  const firstEver = s.opened === 1;
  s.seen[id] = 1;
  each((b) => {
    const a = actOf(b, id);
    a.st++;
    b.op++;
    if (again) a.rst++;
    if (firstEver) a.first++;
  });
  each((b) => {
    if (s.opened === 1) b.s0 = Math.max(0, b.s0 - 1);
    if (s.opened === 2) b.s2++;
    if (!again) b.dist++;
  }, true);
}

export function activityEnd(duration?: number) {
  if (!cur) return;
  const c = cur;
  const id = c.id;
  const dur = Math.max(0, typeof duration === 'number' ? duration : Date.now() - c.t0);
  cur = null;
  each((b) => {
    const a = actOf(b, id);
    if (COMPLETABLE[id] && !c.done) a.ex++;
    if (dur <= QUICK_MS) a.qx++;
  });
  flush();
}

export function complete(level?: number) {
  if (!cur) return;
  const id = cur.id;
  const first = !cur.done;
  cur.done = true;
  const lv = typeof level === 'number' && Number.isFinite(level) && level > 0 ? level : 0;
  each((b) => {
    const a = actOf(b, id);
    a.cmp++;
    if (first) a.rc++;
    if (lv > a.lv) a.lv = lv;
  });
}

function bump(level?: number, variant?: string | number | null, completed = false) {
  if (!cur) return;
  const id = cur.id;
  const lv = typeof level === 'number' && Number.isFinite(level) && level > 0 ? level : 0;
  const v = variant === undefined || variant === null ? null : String(variant).slice(0, 8);
  each((b) => {
    const a = actOf(b, id);
    if (lv > a.lv) a.lv = lv;
    if (completed) a.lc++;
    if (v && !completed) a.sh[v] = (a.sh[v] || 0) + 1;
  });
}

export function track(type: string, d: TrackPayload = {}) {
  try {
    const actId = d.activityId || (cur && cur.id) || null;
    switch (type) {
      case 'session_start':
        if (!sess) startSession();
        break;
      case 'session_end':
        activityEnd();
        endSession();
        flush();
        break;
      case 'activity_start':
        activityStart(actId);
        break;
      case 'activity_end':
        activityEnd(d.duration);
        break;
      case 'activity_complete':
        complete(d.level);
        break;
      case 'activity_restart':
        if (cur) {
          const cid = cur.id;
          each((b) => {
            actOf(b, cid).rst++;
          });
        }
        break;
      case 'interaction':
        if (cur && d.variant !== undefined && d.variant !== null) {
          const v = String(d.variant).slice(0, 8);
          const cid = cur.id;
          each((b) => {
            const a = actOf(b, cid);
            a.tc[v] = (a.tc[v] || 0) + 1;
          });
        }
        break;
      case 'level_start':
        bump(d.level, d.variant, false);
        break;
      case 'level_complete':
        bump(d.level, null, true);
        break;
    }
  } catch {
    /* analytics must never break any activity */
  }
}

export function levelStart(level?: number, variant?: string | number | null) {
  track('level_start', { level, variant });
}

export function levelComplete(level?: number) {
  track('level_complete', { level });
}

export function recordStageTouch() {
  try {
    lastInput = Date.now();
    if (cur) {
      const id = cur.id;
      each((b) => {
        actOf(b, id).int++;
      });
    }
  } catch {
    /* ignore */
  }
}

function tick() {
  try {
    const now = Date.now();
    const dt = Math.max(0, Math.min(MAX_TICK, now - lastTick));
    lastTick = now;
    if (document.visibilityState !== 'visible') return;
    if (!sess) startSession();
    if (dt > 0) {
      const active = now - lastInput < IDLE_MS;
      const c = cur;
      each((b) => {
        if (active) {
          b.act += dt;
          if (c) actOf(b, c.id).act += dt;
        } else {
          b.idle += dt;
        }
      });
    }
    if (now - lastFlush >= FLUSH_MS) flush();
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const onInput = () => {
    lastInput = Date.now();
  };
  document.addEventListener('pointerdown', onInput, true);
  document.addEventListener('keydown', onInput, true);
  document.addEventListener('pointermove', onInput, true);
  document.addEventListener('touchstart', onInput, true);
  document.addEventListener('visibilitychange', () => {
    try {
      const now = Date.now();
      if (document.visibilityState === 'hidden') {
        hiddenAt = now;
        flush();
      } else {
        const gap = hiddenAt ? Math.max(0, now - hiddenAt) : 0;
        const seen = cur ? Math.max(0, hiddenAt - cur.t0) : 0;
        hiddenAt = 0;
        lastTick = now;
        lastInput = now;
        if (gap > SESSION_GAP_MS) {
          const open = cur && cur.id;
          activityEnd(seen);
          endSession();
          startSession();
          if (open) activityStart(open);
        } else if (gap > 0) {
          each((b) => {
            b.hid += gap;
          });
        }
      }
    } catch {
      /* ignore */
    }
  });
  window.addEventListener('pagehide', () => {
    try {
      activityEnd();
      endSession();
      flush();
    } catch {
      /* ignore */
    }
  });
  startSession();
  window.setInterval(tick, 1000);
}

function merge(list: readonly AnalyticsBucket[]): AnalyticsBucket {
  const o = newBucket();
  for (const b of list) {
    for (const k of ['s', 's0', 's2', 'act', 'idle', 'hid', 'op', 'dist'] as const) {
      o[k] += b[k];
    }
    if (b.t0 && (!o.t0 || b.t0 < o.t0)) o.t0 = b.t0;
    o.t1 = Math.max(o.t1, b.t1);
    for (const id of Object.keys(b.acts)) {
      const x = b.acts[id];
      const a = actOf(o, id);
      for (const k of ['st', 'act', 'cmp', 'rc', 'rst', 'ex', 'qx', 'int', 'lc', 'first'] as const) {
        a[k] += x[k];
      }
      a.lv = Math.max(a.lv, x.lv);
      for (const m of ['sh', 'tc'] as const) {
        for (const k of Object.keys(x[m])) {
          a[m][k] = (a[m][k] || 0) + x[m][k];
        }
      }
    }
  }
  return o;
}

export function period(name: AnalyticsPeriod): { b: AnalyticsBucket; days: number } {
  if (name === 'session') {
    return { b: merge(sess ? [sess.b] : []), days: sess ? 1 : 0 };
  }
  if (name === 'all') {
    return { b: merge([data.total]), days: data.nDays };
  }
  const key = name === 'today' ? cutoffKey(0) : cutoffKey(name === '7d' ? 6 : 29);
  const list = Object.keys(data.days)
    .filter((k) => k >= key && data.days[k].s > 0)
    .map((k) => data.days[k]);
  return { b: merge(list), days: list.length };
}

function nameOf(id: string): string {
  const found = ACTIVITIES.find((a) => a.id === id);
  return found ? found.name : id;
}

export function ranking(name: AnalyticsPeriod): {
  rows: RankingRow[];
  total: number;
  app: AnalyticsBucket;
  days: number;
} {
  const p = period(name);
  let total = 0;
  const rows: RankingRow[] = [];
  for (const id of Object.keys(p.b.acts)) {
    const a = p.b.acts[id];
    if (!a.st && !a.act) continue;
    total += a.act;
    rows.push({
      rank: 0,
      id,
      name: nameOf(id),
      act: a.act,
      st: a.st,
      cmp: a.cmp,
      rc: a.rc,
      rst: a.rst,
      ex: a.ex,
      qx: a.qx,
      int: a.int,
      lv: a.lv,
      lc: a.lc,
      sh: a.sh,
      tc: a.tc,
      completable: Boolean(COMPLETABLE[id]),
      pct: 0,
      avg: 0,
      rate: null,
    });
  }
  for (const r of rows) {
    r.pct = total ? (r.act / total) * 100 : 0;
    r.avg = r.st ? r.act / r.st : 0;
    r.rate = r.completable && r.st ? Math.min(1, r.rc / r.st) : null;
  }
  rows.sort((x, y) => y.act - x.act || y.st - x.st);
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return { rows, total, app: p.b, days: p.days };
}

export function secondary(name: AnalyticsPeriod) {
  const rows = ranking(name).rows;
  const top = (list: RankingRow[], key: 'st' | 'cmp' | 'rst') =>
    list
      .filter((r) => r[key] > 0)
      .sort((x, y) => y[key] - x[key] || y.act - x.act)
      .slice(0, 5);
  const comp = rows.filter((r) => r.completable);
  return {
    opened: top(rows, 'st'),
    completed: top(comp, 'cmp'),
    rate: comp
      .filter((r) => r.rate !== null && r.rate > 0)
      .sort((x, y) => (y.rate ?? 0) - (x.rate ?? 0) || y.st - x.st)
      .slice(0, 5),
    replayed: top(rows, 'rst'),
  };
}

export function exportData() {
  return {
    app: 'child-page',
    kind: 'usage-aggregates',
    version: 1,
    exportedAt: new Date().toISOString(),
    retentionDays: KEEP_DAYS,
    distinctDaysAllTime: data.nDays,
    days: data.days,
    total: data.total,
  };
}

export function reset() {
  const open = cur && cur.id;
  data = fresh();
  dirty = true;
  cur = null;
  sess = null;
  startSession();
  if (open) activityStart(open);
  flush();
}

export function sessionSequence(): string[] {
  return sess ? sess.seq.slice() : [];
}

export const Analytics = {
  track,
  levelStart,
  levelComplete,
  complete,
  activityStart,
  activityEnd,
  recordStageTouch,
  period,
  ranking,
  secondary,
  exportData,
  reset,
  sessionSequence,
};
