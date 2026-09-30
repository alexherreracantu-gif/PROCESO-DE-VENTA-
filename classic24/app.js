'use strict';
/* CLASSIC 24 · preparación natural de Classic Physique en 24 semanas.
 * Guardado: siempre en este dispositivo (localStorage). Si la página corre dentro de claude.ai,
 * además se sincroniza con el espacio privado de tu cuenta (db → data/users/<id>/...):
 * un documento "core" (ajustes y check-ins) y uno por mes para días, comidas y entrenos.
 * Cada día guarda su hora de edición (_t) y gana la versión más reciente. */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const EMBED = !!window.C24_EMBED;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const round = (n, d = 1) => Number((+n || 0).toFixed(d));
const sum = (a, f = x => x) => a.reduce((t, x) => t + (+f(x) || 0), 0);
const avg = a => a.length ? sum(a) / a.length : 0;
const num = n => Math.round(+n || 0).toLocaleString('es-MX');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const parseNum = v => { const t = String(v ?? '').trim().replace(',', '.'); return t === '' ? NaN : +t; };

// ---------- Fechas (siempre hora local: en Monterrey, UTC cambiaría el día a las 6 pm) ----------
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const todayKey = () => keyOf(new Date());
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
const dowOf = k => parseKey(k).getDay();
const mondayOf = k => addDays(k, -((dowOf(k) + 6) % 7));
const weekDates = mon => Array.from({ length: 7 }, (_, i) => addDays(mon, i));
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DOW1 = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const DOWL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtShort = k => { const d = parseKey(k); return `${d.getDate()} ${MES[d.getMonth()]}`; };
const fmtDay = k => { const d = parseKey(k); return `${DOW[d.getDay()]} ${d.getDate()} ${MES[d.getMonth()]}`; };

// ---------- Programa ----------
// [ejercicio, series, reps mín, reps máx, RIR, descanso en segundos]
const PLAN = {
  1: { name: 'Espalda + hombro', short: 'Espalda', ex: [
    ['Dominadas o jalón neutro', 3, 6, 10, '1–2', 180], ['Jalón unilateral hacia cadera', 3, 8, 12, '1', 150],
    ['Remo pecho apoyado', 3, 6, 10, '1–2', 180], ['Remo cable agarre abierto', 2, 10, 15, '1', 120],
    ['Elevación lateral cable', 4, 12, 20, '1', 90], ['Reverse pec deck', 3, 15, 25, '0–1', 90],
    ['Curl predicador', 3, 8, 12, '1', 120]] },
  2: { name: 'Pierna A', short: 'Pierna A', ex: [
    ['Hack squat', 3, 6, 10, '1–2', 210], ['Prensa', 3, 10, 15, '1', 180], ['Extensión de cuádriceps', 2, 12, 20, '0–1', 90],
    ['Curl femoral sentado', 4, 8, 12, '1', 120], ['Gemelo de pie', 4, 6, 10, '1', 120], ['Gemelo sentado', 3, 10, 15, '1', 90],
    ['Crunch en cable', 3, 8, 15, '1', 90]] },
  3: { name: 'Recuperación', short: 'Recup.', ex: [] },
  4: { name: 'Pecho + deltoides', short: 'Pecho', ex: [
    ['Press inclinado 20–30°', 4, 6, 10, '1–2', 180], ['Press convergente máquina', 3, 8, 12, '1', 150],
    ['Fly cable bajo → alto', 3, 12, 20, '0–1', 90], ['Elevación lateral máquina', 4, 12, 20, '0–1', 90],
    ['Elevación lateral cable unilateral', 2, 15, 25, '0–1', 90], ['Deltoide posterior', 3, 15, 25, '0–1', 90],
    ['Extensión tríceps overhead', 3, 8, 12, '1', 120], ['Pushdown', 2, 10, 15, '0–1', 90]] },
  5: { name: 'Espalda + brazos', short: 'Esp+brazo', ex: [
    ['Remo T pecho apoyado', 3, 6, 10, '1', 180], ['Pulldown agarre medio', 3, 8, 12, '1', 150],
    ['Remo unilateral', 3, 8, 12, '1', 150], ['Pullover cable', 2, 12, 15, '0–1', 90], ['Reverse fly', 3, 15, 20, '0–1', 90],
    ['Curl inclinado', 3, 8, 12, '1', 120], ['Curl martillo', 2, 10, 15, '0–1', 90], ['Extensión tríceps', 3, 8, 12, '1', 120]] },
  6: { name: 'Pierna B + pecho superior', short: 'Pierna B', ex: [
    ['RDL', 3, 6, 10, '1–2', 210], ['Curl femoral sentado', 3, 8, 12, '1', 120], ['Curl femoral acostado', 2, 10, 15, '0–1', 90],
    ['Búlgara', 3, 8, 12, '1', 150], ['Extensión de cuádriceps', 2, 12, 20, '0–1', 90], ['Gemelo de pie', 4, 8, 12, '1', 120],
    ['Press inclinado máquina', 3, 8, 12, '1', 150], ['Elevaciones laterales', 3, 15, 25, '0–1', 90]] },
  0: { name: 'Descanso total', short: 'Descanso', ex: [] }
};
const TRAIN_DAYS = [1, 2, 4, 5, 6];
// Orden de prioridad si hay que recuperar sesiones: dorsal → deltoide → pecho superior → femoral → resto.
const PRIORITY = [1, 4, 6, 5, 2];
const KEY_LIFTS = [
  { name: 'Press inclinado', plan: 4, i: 0 }, { name: 'Jalón / dominada', plan: 1, i: 0 },
  { name: 'Remo pecho apoyado', plan: 1, i: 2 }, { name: 'Hack squat', plan: 2, i: 0 }, { name: 'RDL', plan: 6, i: 0 }
];

const PHASES = [
  { from: 1, to: 4, name: 'Arranque', loss: [0.7, 0.9], target: 'Bajar 3–4 kg manteniendo la fuerza.',
    items: ['≈2,600 kcal · 220 P / 70 G / 270 C', '10,000 pasos diarios', '3 × 30 min de cardio zona 2', '5 sesiones de pesas', 'Posing 15 min, 5 días por semana'] },
  { from: 5, to: 8, name: 'Consolidación', loss: [0.7, 0.9], target: 'Orientativo: 96–99 kg al final. Manda más la cintura que la báscula.',
    items: ['Si el promedio semanal no baja al menos ~0.6 kg: −150 kcal o +10 min en dos sesiones de cardio', 'Cambia una sola cosa a la vez'] },
  { from: 9, to: 12, name: 'Condición de culturismo', loss: [0.7, 0.9], target: 'Orientativo: 92–96 kg. Que el abdomen vuelva a aparecer y las piernas se empiecen a separar.',
    items: ['Mismo entrenamiento pesado', 'Cardio 3–4 veces por semana si hace falta', '10,000–12,000 pasos', 'Posing sube a 20–25 min desde la semana 12'] },
  { from: 13, to: 16, name: 'Preparación seria', loss: [0.5, 0.7], target: 'Orientativo: 89–93 kg. Prioridad absoluta: cargas, proteína y sueño.',
    items: ['Pérdida más controlada: 0.5–0.7% por semana', 'Ya no se bajan kilos a lo loco'] },
  { from: 17, to: 20, name: 'Condición de escenario', loss: [0.4, 0.6], target: 'Orientativo: 86–90 kg. Aquí mandan las fotos.',
    items: ['Si queda grasa clara en espalda baja, glúteo y abdomen, sigue el déficit', 'Posing 30 min casi diario'] },
  { from: 21, to: 23, name: 'Afinado', loss: [0.3, 0.5], target: 'Mantener masa y quitar los últimos puntos de grasa.',
    items: ['Cardio ajustado a lo estrictamente necesario', 'Posing diario'] },
  { from: 24, to: 24, name: 'Peak week', loss: [0, 0.3], target: 'Llegar lleno y seco sin trucos peligrosos.',
    items: ['Sin diuréticos ni laxantes', 'Sin dejar de beber agua', 'Sin cortar sal de forma extrema: agua y sodio estables', 'Entreno menos fatigante', 'Carga moderada de carbos solo si llegaste suficientemente seco'] }
];

// Porciones rápidas (valores aproximados de tablas USDA; ajusta si tu porción es distinta)
const FOODS = [
  ['Pechuga de pollo 200 g', 330, 62, 0, 7], ['Carne magra de res 200 g', 330, 52, 0, 13],
  ['Pescado blanco 200 g', 256, 52, 0, 5], ['Arroz cocido 250 g', 325, 7, 70, 1],
  ['Papa cocida 300 g', 261, 6, 60, 0], ['Avena 80 g', 303, 11, 54, 5],
  ['4 huevos enteros', 288, 25, 2, 19], ['Claras 250 g', 130, 27, 2, 0],
  ['Whey 1 scoop (30 g)', 120, 24, 3, 2], ['3 tortillas de maíz', 196, 5, 40, 3],
  ['Plátano mediano', 105, 1, 27, 0], ['Manzana mediana', 95, 0, 25, 0],
  ['Verduras 200 g', 70, 4, 12, 0], ['Aceite de oliva 10 g', 88, 0, 0, 10],
  ['Aguacate 50 g', 80, 1, 4, 7]
];
const MEALS = ['Desayuno', 'Comida', 'Pre-entreno', 'Cena', 'Snack'];
const POSES = ['Front double biceps', 'Side chest', 'Back double biceps', 'Abs & thigh', 'Pose Classic favorita', 'Transiciones y cuartos de giro'];

const DEFAULT_SETTINGS = { calories: 2600, protein: 220, fat: 70, carbs: 270, steps: 10000, cardioSessions: 3, cardioMinutes: 30, sleepTarget: 7, startWeight: 104, water: 3.5 };

// ---------- Estado ----------
const LS = 'classic24';
function freshState() {
  return { v: 2, settings: { ...DEFAULT_SETTINGS, competitionDate: addDays(todayKey(), 167) },
    daily: {}, nutrition: {}, workouts: {}, weekly: {}, createdAt: todayKey(), coreMod: 0, resetAt: 0 };
}
function normalize(x) {
  const st = freshState();
  if (!x || typeof x !== 'object') return st;
  const now = Date.now();
  Object.assign(st.settings, x.settings || {});
  delete st.settings.name;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(st.settings.competitionDate)) st.settings.competitionDate = addDays(todayKey(), 167);
  st.daily = x.daily && typeof x.daily === 'object' ? x.daily : {};
  st.nutrition = x.nutrition && typeof x.nutrition === 'object' ? x.nutrition : {};
  for (const k in st.nutrition) if (!Array.isArray(st.nutrition[k].foods)) st.nutrition[k].foods = [];
  st.workouts = x.v >= 2 && x.workouts ? x.workouts : {};
  st.weekly = x.weekly && typeof x.weekly === 'object' ? x.weekly : {};
  if (x.supplements) for (const k in x.supplements) { st.daily[k] = st.daily[k] || {}; st.daily[k].supp = x.supplements[k]; st.daily[k]._t = st.daily[k]._t || now; }
  if (/^\d{4}-\d{2}-\d{2}$/.test(x.createdAt || '')) st.createdAt = x.createdAt;
  st.coreMod = x.coreMod || 0;
  st.resetAt = x.resetAt || 0;
  return st;
}
function loadLocal() { try { const raw = localStorage.getItem(LS); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* sin almacenamiento */ } return freshState(); }
function saveLocal() { try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) { /* sin almacenamiento */ } }

let state = loadLocal();
let tab = 'today';
let view = todayKey();
let panelWeek = mondayOf(todayKey());
let mealSel = defaultMeal();

const S = () => state.settings;
const dayOf = k => state.daily[k] || {};
function editDay(k, fn) { const d = state.daily[k] || (state.daily[k] = {}); fn(d); d._t = Date.now(); commit('d-' + k.slice(0, 7)); }
function editFood(k, fn) { const n = state.nutrition[k] || (state.nutrition[k] = { foods: [] }); fn(n); n._t = Date.now(); commit('n-' + k.slice(0, 7)); }
function editWorkout(k, fn) { const w = state.workouts[k] || (state.workouts[k] = { plan: dowOf(k), log: {} }); w.log = w.log || {}; fn(w); w._t = Date.now(); commit('w-' + k.slice(0, 7)); }
function editCore(fn) { fn(state); state.coreMod = Date.now(); commit('core'); }
function commit(id) { saveLocal(); schedule(id); }

// ---------- Sincronización con tu cuenta (solo dentro de claude.ai) ----------
const Cloud = { col: null, status: 'local', pend: {}, timers: {}, chain: {}, last: {}, retried: {}, deferred: false };
const srcFor = id => ({ d: state.daily, n: state.nutrition, w: state.workouts })[id[0]];
function bucketBody(id) {
  if (id === 'core') return { mod: state.coreMod, resetAt: state.resetAt, data: { settings: state.settings, weekly: state.weekly, createdAt: state.createdAt } };
  const src = srcFor(id), ym = id.slice(2), data = {};
  for (const k in src) if (k.startsWith(ym) && src[k]._t) data[k] = src[k];
  return { data };
}
function localBucketIds() {
  const ids = new Set();
  for (const [p, src] of [['d', state.daily], ['n', state.nutrition], ['w', state.workouts]])
    for (const k in src) if (src[k] && src[k]._t) ids.add(p + '-' + k.slice(0, 7));
  return [...ids];
}
function schedule(id, wait = 800) {
  if (!Cloud.col) return;
  const my = (Cloud.pend[id] || 0) + 1;
  Cloud.pend[id] = my;
  clearTimeout(Cloud.timers[id]);
  Cloud.timers[id] = setTimeout(() => writeDoc(id, my), wait);
}
function writeDoc(id, my) {
  const json = JSON.stringify(bucketBody(id));
  const done = () => { if (Cloud.pend[id] === my) Cloud.pend[id] = 0; };
  if (json === Cloud.last[id]) { done(); return; }
  Cloud.chain[id] = (Cloud.chain[id] || Promise.resolve())
    .then(() => Cloud.col.doc(id).set(JSON.parse(json)))
    .then(() => { Cloud.last[id] = json; Cloud.retried[id] = false; setSync('cloud'); }, err => {
      setSync('error');
      if (err && err.code === 'quota_exceeded') toast('Tu espacio en la cuenta está lleno. Exporta un respaldo.');
      else if (err && err.code === 'unavailable' && !Cloud.retried[id]) { Cloud.retried[id] = true; setTimeout(() => schedule(id, 0), 1200 + Math.random() * 1500); }
    })
    .then(done);
}
function mergeDated(id, sdata) {
  const src = srcFor(id), ym = id.slice(2);
  let changed = false, newer = false;
  const keys = new Set([...Object.keys(sdata || {}), ...Object.keys(src).filter(k => k.startsWith(ym))]);
  for (const k of keys) {
    const s = sdata && sdata[k], l = src[k];
    const st = s && (s._t || 0) >= (state.resetAt || 0) ? (s._t || 0) : 0;
    const lt = l ? (l._t || 0) : 0;
    if (s && st > lt) { src[k] = clone(s); changed = true; } else if (l && lt > st) newer = true;
  }
  return { changed, newer };
}
function onServer(docs, first) {
  let changed = false;
  const core = docs.core;
  if (core && (core.resetAt || 0) > (state.resetAt || 0)) { state = freshState(); state.resetAt = core.resetAt; changed = true; }
  if (core && (core.mod || 0) > (state.coreMod || 0) && !Cloud.pend.core) {
    const d = core.data || {};
    state.settings = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
    state.weekly = d.weekly || {};
    if (d.createdAt) state.createdAt = d.createdAt;
    state.coreMod = core.mod;
    Cloud.last.core = JSON.stringify(bucketBody('core'));
    changed = true;
  }
  for (const id in docs) {
    if (!/^[dnw]-\d{4}-\d{2}$/.test(id)) continue;
    const r = mergeDated(id, docs[id].data || {});
    if (r.changed) changed = true;
    if (r.newer) schedule(id, 300);
  }
  if (first) {
    for (const id of localBucketIds()) if (!docs[id]) schedule(id, 0);
    if (state.coreMod && (!core || state.coreMod > (core.mod || 0))) schedule('core', 0);
  }
  if (changed) { saveLocal(); requestRender(); }
}
async function initCloud() {
  if (!window.claude || typeof window.claude.use !== 'function') return;
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const uid = await user.id();
    if (!uid) return;
    Cloud.col = db.collection('data/users/' + uid);
    let first = true;
    Cloud.col.onSnapshot(snap => {
      const docs = {};
      snap.docs.forEach(d => { if (d.exists) docs[d.id] = d.data(); });
      onServer(docs, first);
      first = false;
      setSync('cloud');
    }, () => setSync('error'));
  } catch (e) { setSync('error'); }
}
function setSync(s) {
  Cloud.status = s;
  const el = $('#syncState');
  if (!el) return;
  el.textContent = { local: 'Guardado en este dispositivo', cloud: 'Sincronizado con tu cuenta', error: 'Sin conexión · guardado en este dispositivo' }[s];
  el.className = 'subtitle ' + s;
}
function requestRender() {
  const a = document.activeElement;
  if ($('#modal').open || (a && a.closest && a.closest('#content') && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) { Cloud.deferred = true; return; }
  render();
}

// ---------- Cálculos ----------
function prepStart() { return addDays(S().competitionDate, -167); }
function weekOf(k = todayKey()) { return Math.floor(diffDays(prepStart(), k) / 7) + 1; }
function phaseOf(w) { const ww = clamp(w, 1, 24); return PHASES.find(p => ww >= p.from && ww <= p.to); }
function posingTarget(w) { return w < 12 ? 15 : w < 17 ? 20 : 30; }
function posingRequired(k) { const w = weekOf(k), d = dowOf(k); return w >= 17 ? d !== 0 : TRAIN_DAYS.includes(d); }
function daysToShow() { return diffDays(todayKey(), S().competitionDate); }
function macros(k) { const f = (state.nutrition[k] || {}).foods || []; return { kcal: sum(f, x => x.kcal), p: sum(f, x => x.p), c: sum(f, x => x.c), f: sum(f, x => x.f), n: f.length }; }
function planOf(k) { const w = state.workouts[k]; return w && PLAN[w.plan] ? +w.plan : dowOf(k); }
function totalSets(p) { return sum(PLAN[p].ex, e => e[1]); }
function doneSets(k) {
  const w = state.workouts[k]; if (!w) return 0;
  const p = planOf(k); let n = 0;
  PLAN[p].ex.forEach((e, i) => { const x = (w.log || {})[p + '_' + i]; if (x && x.sets) n += x.sets.filter(s => s && s.done).length; });
  return n;
}
function sessionDone(k) {
  const w = state.workouts[k]; if (!w) return false;
  const p = planOf(k); if (!PLAN[p].ex.length) return false;
  return !!w.manual || doneSets(k) / totalSets(p) >= 0.8;
}
function sessionsLogged() { return Object.keys(state.workouts).sort(); }
function lastSession(p, i, before) {
  const keys = sessionsLogged().filter(k => k < before).reverse();
  for (const k of keys) {
    const w = state.workouts[k];
    if (+w.plan !== p) continue;
    const x = (w.log || {})[p + '_' + i];
    if (x && x.sets && x.sets.some(s => s && (s.kg || s.reps))) return { date: k, sets: x.sets };
  }
  return null;
}
const e1rm = s => (+s.kg || 0) * (1 + (+s.reps || 0) / 30);
function liftHistory(p, i) {
  return sessionsLogged().map(k => {
    const w = state.workouts[k]; if (+w.plan !== p) return null;
    const x = (w.log || {})[p + '_' + i]; if (!x || !x.sets) return null;
    const valid = x.sets.filter(s => s && +s.kg > 0 && +s.reps > 0);
    if (!valid.length) return null;
    const best = valid.reduce((a, b) => e1rm(b) > e1rm(a) ? b : a);
    return { date: k, best, e: e1rm(best) };
  }).filter(Boolean);
}
function weightsBetween(a, b) { const out = []; for (const k in state.daily) if (k >= a && k <= b && +state.daily[k].weight > 0) out.push({ k, v: +state.daily[k].weight }); return out.sort((x, y) => x.k.localeCompare(y.k)); }
function weekAvg(end) { const w = weightsBetween(addDays(end, -6), end); return w.length >= 3 ? avg(w.map(x => x.v)) : null; }
function lossStats() {
  const t = todayKey(), a0 = weekAvg(t), a1 = weekAvg(addDays(t, -7)), a2 = weekAvg(addDays(t, -14));
  const r = { a0, a1, a2 };
  if (a0 && a1) { r.kg1 = a1 - a0; r.pct1 = r.kg1 / a1 * 100; }
  if (a1 && a2) { r.kg2 = a2 - a1; r.pct2 = r.kg2 / a2 * 100; }
  return r;
}
function waistTrend() {
  const ws = Object.entries(state.weekly).filter(([, v]) => +v.waist > 0).sort((a, b) => +a[0].slice(1) - +b[0].slice(1));
  if (ws.length < 2) return null;
  return +ws.at(-1)[1].waist - +ws.at(-2)[1].waist;
}
function strengthTrend() {
  let up = 0, n = 0;
  for (const L of KEY_LIFTS) { const h = liftHistory(L.plan, L.i); if (h.length >= 2) { n++; if (h.at(-1).e >= h.at(-2).e - 0.5) up++; } }
  return n ? { up, n } : null;
}

// ---------- Cumplimiento por día ----------
// status: ok · miss (día pasado sin cumplir) · pending (hoy, aún a tiempo) · na (no aplica)
function dayItems(k) {
  const t = todayKey(), past = k < t && k >= state.createdAt, d = dayOf(k), m = macros(k), s = S(), items = [];
  const st = cond => cond ? 'ok' : past ? 'miss' : 'pending';
  items.push({ id: 'weight', label: 'Pesaje matutino', status: st(+d.weight > 0), value: +d.weight > 0 ? `${d.weight} kg` : 'Sin registrar', pct: +d.weight > 0 ? 1 : 0 });
  let kcalStatus, kcalVal;
  if (!m.n) { kcalStatus = past ? 'miss' : 'pending'; kcalVal = 'Sin registro'; }
  else {
    const r = m.kcal / s.calories;
    kcalStatus = r >= 0.9 && r <= 1.1 ? 'ok' : (past || r > 1.1) ? 'miss' : 'pending';
    kcalVal = `${num(m.kcal)} / ${num(s.calories)}`;
  }
  items.push({ id: 'kcal', label: 'Calorías en rango', status: kcalStatus, value: kcalVal, pct: m.kcal / s.calories, over: m.kcal > s.calories * 1.1, under: m.n > 0 && m.kcal < s.calories * 0.9 });
  items.push({ id: 'protein', label: 'Proteína', status: st(m.p >= s.protein * 0.9), value: `${num(m.p)} / ${s.protein} g`, pct: m.p / s.protein });
  items.push({ id: 'steps', label: 'Pasos', status: st(+d.steps >= s.steps * 0.95), value: `${num(d.steps)} / ${num(s.steps)}`, pct: (+d.steps || 0) / s.steps, missing: Math.max(0, s.steps - (+d.steps || 0)) });
  const sched = dowOf(k);
  if (PLAN[sched].ex.length) {
    const doneAt = weekDates(mondayOf(k)).find(x => x <= t && planOf(x) === sched && sessionDone(x));
    items.push({ id: 'train', label: `Entreno · ${PLAN[sched].name}`, status: doneAt ? 'ok' : past ? 'miss' : 'pending',
      value: doneAt ? (doneAt === k ? 'Hecho' : `Hecho el ${DOWL[dowOf(doneAt)]}`) : k === t && doneSets(k) ? `${doneSets(k)} / ${totalSets(sched)} series` : 'Pendiente',
      pct: doneAt ? 1 : (planOf(k) === sched ? doneSets(k) / totalSets(sched) : 0), plan: sched });
  } else {
    items.push({ id: 'train', label: `Entreno · ${PLAN[sched].name}`, status: 'na', value: sessionDone(k) ? `Hiciste ${PLAN[planOf(k)].short}` : 'No toca pesas', pct: 1 });
  }
  const pt = posingTarget(weekOf(k));
  items.push({ id: 'posing', label: 'Posing', status: posingRequired(k) ? st(+d.posing >= pt) : 'na', value: `${num(d.posing)} / ${pt} min`, pct: (+d.posing || 0) / pt, missing: Math.max(0, pt - (+d.posing || 0)) });
  items.push({ id: 'sleep', label: 'Sueño', status: st(+d.sleep >= s.sleepTarget), value: +d.sleep > 0 ? `${d.sleep} h` : 'Sin registrar', pct: (+d.sleep || 0) / s.sleepTarget, short: +d.sleep > 0 && +d.sleep < 6 });
  items.push({ id: 'creatine', label: 'Creatina 5 g', status: st(!!(d.supp && d.supp.creatine)), value: d.supp && d.supp.creatine ? 'Tomada' : 'Pendiente', pct: d.supp && d.supp.creatine ? 1 : 0 });
  return items;
}
function dayScore(k) {
  const t = todayKey();
  if (k > t) return { kind: 'future' };
  if (k < state.createdAt) return { kind: 'none' };
  const it = dayItems(k).filter(x => x.status !== 'na');
  const ok = it.filter(x => x.status === 'ok').length;
  return { kind: k === t ? 'today' : 'past', ok, total: it.length, pct: it.length ? ok / it.length : 0, miss: it.filter(x => x.status === 'miss') };
}
const scoreColor = p => p >= 0.85 ? 'var(--volt)' : p >= 0.6 ? 'var(--mid)' : 'var(--red)';

function weekSummary(mon) {
  const t = todayKey(), dates = weekDates(mon).filter(k => k <= t && k >= state.createdAt);
  const agg = {}, order = [];
  let ok = 0, total = 0;
  for (const k of dates) for (const it of dayItems(k)) {
    const key = it.id === 'train' ? 'train' : it.id;
    if (!agg[key]) { agg[key] = { id: key, label: it.id === 'train' ? 'Entrenos' : it.label, ok: 0, total: 0, missed: [] }; order.push(key); }
    if (it.status === 'na' || it.status === 'pending') continue;
    agg[key].total++; total++;
    if (it.status === 'ok') { agg[key].ok++; ok++; } else agg[key].missed.push({ k, it });
  }
  const cardioDone = weekDates(mon).filter(k => +dayOf(k).cardio >= 20).length, cardioTarget = S().cardioSessions;
  const weekOver = addDays(mon, 6) < t;
  return { dates, items: order.map(k => agg[k]), ok, total, pct: total ? ok / total : null, cardioDone, cardioTarget, weekOver };
}

// ---------- Cómo recuperarlo ----------
function remainingDays(mon) { const t = todayKey(); return weekDates(mon).filter(k => k >= t); }
function flexDays(mon) {
  // Días que quedan en la semana sin pesas programadas y sin sesión hecha: ahí se recupera.
  return remainingDays(mon).filter(k => !PLAN[dowOf(k)].ex.length && !sessionDone(k));
}
function fixFor(id, ctx) {
  const s = S();
  switch (id) {
    case 'weight': return 'Pésate mañana al despertar, después del baño y antes de comer. El promedio semanal aguanta un día sin dato; no hay nada que reponer.';
    case 'kcal':
      if (ctx.over) return `Te pasaste (${ctx.value}). Vuelve al plan en tu siguiente comida: nada de ayunos ni cardio de castigo. Si fue más de 500 kcal, quita 150–200 kcal de carbos o grasa durante los próximos 2–3 días, sin tocar la proteína.`;
      if (ctx.under) return `Comiste de menos (${ctx.value}). Comer muy por debajo no acelera el corte: te cuesta músculo y fuerza. Mañana cumple tus macros normales; no hace falta "reponer" calorías.`;
      return 'No hay registro de comida. Si comiste según el plan, regístralo con "Repetir ayer" o las porciones rápidas. Sin registro no se puede ajustar bien.';
    case 'protein': return `La proteína no se acumula de un día para otro. Mañana llega a ${s.protein} g: agrega un scoop de whey (24 g) o 100 g más de pollo en la comida donde te quedes corto.`;
    case 'steps': return `Te faltaron ${num(ctx.missing)} pasos. Repártelos en los próximos 2–3 días: una caminata de 15–20 min después de comer suma 2,000–2,500. No intentes meter 20,000 en un día.`;
    case 'posing': return `Te faltaron ${num(ctx.missing)} min. Suma 5–10 min a tus próximas sesiones hasta reponerlos. El posing también es entrenamiento: sin él, llegar seco no alcanza.`;
    case 'sleep': return ctx.short
      ? 'Dormiste menos de 6 h. Hoy acuéstate 45 min antes y, si puedes, haz una siesta de 20 min. En el entreno deja 2 RIR en los compuestos y no busques récords.'
      : 'Hoy acuéstate 30–45 min antes: pantallas fuera, cuarto oscuro y fresco. El sueño es parte de conservar músculo en déficit.';
    case 'creatine': return 'Tómala hoy con normalidad (5 g). No dupliques la dosis; lo que cuenta es tomarla todos los días.';
    default: return '';
  }
}
function recoveryPlan(mon) {
  const ws = weekSummary(mon), out = [];
  const missedPlans = [];
  for (const it of ws.items) for (const m of it.missed) if (m.it.id === 'train') missedPlans.push({ k: m.k, plan: m.it.plan });
  if (missedPlans.length) {
    const flex = ws.weekOver ? [] : flexDays(mon);
    const sorted = [...missedPlans].sort((a, b) => PRIORITY.indexOf(a.plan) - PRIORITY.indexOf(b.plan));
    const lines = sorted.map((m, i) => flex[i]
      ? `Haz <b>${esc(PLAN[m.plan].name)}</b> el ${DOWL[dowOf(flex[i])]} ${fmtShort(flex[i])}: en Entreno elige esa sesión ese día.`
      : `Salta <b>${esc(PLAN[m.plan].name)}</b> esta semana. No la acumules ni hagas dos sesiones completas el mismo día.`);
    out.push({ title: `Entreno · ${missedPlans.length} ${missedPlans.length === 1 ? 'sesión perdida' : 'sesiones perdidas'}`,
      sub: missedPlans.map(m => `${fmtDay(m.k)} (${PLAN[m.plan].short})`).join(', '),
      text: (ws.weekOver ? 'Semana cerrada. No la persigas: sigue el split normal esta semana. Una sesión perdida no cambia el resultado; perder la constancia sí.' : lines.join('<br>')) + (flex.length < missedPlans.length && !ws.weekOver ? '<br>Si hay dos pendientes, prioriza espalda y hombro: es lo que más cambia tu silueta.' : ''), sev: 'bad' });
  }
  if (ws.cardioDone < ws.cardioTarget) {
    const left = ws.cardioTarget - ws.cardioDone, rem = remainingDays(mon);
    if (ws.weekOver) out.push({ title: `Cardio · ${ws.cardioDone}/${ws.cardioTarget} sesiones`, sub: 'Semana cerrada', text: 'No arrastres cardio a la semana siguiente. Retoma el objetivo normal y agenda tus sesiones desde el lunes.', sev: 'warn' });
    else if (rem.length) out.push({ title: `Cardio · te faltan ${left}`, sub: `Quedan ${rem.length} ${rem.length === 1 ? 'día' : 'días'} en la semana`,
      text: left > rem.length ? `No caben todas. Haz una sesión de ${S().cardioMinutes} min por día que quede y acepta la diferencia; no hagas doble cardio el mismo día.`
        : `Mete ${left === 1 ? 'la sesión' : 'las sesiones'} de ${S().cardioMinutes} min en zona 2 (bici, elíptica o caminadora inclinada) entre ${rem.map(k => DOWL[dowOf(k)]).join(', ')}. Una por día como máximo y, si puedes, lejos de pierna.`, sev: 'warn' });
  }
  for (const it of ws.items) {
    if (it.id === 'train' || !it.missed.length) continue;
    const lastMiss = it.missed.at(-1).it;
    const ctx = { ...lastMiss };
    if (it.id === 'steps' || it.id === 'posing') ctx.missing = sum(it.missed, m => m.it.missing);
    out.push({ title: `${it.label} · ${it.missed.length} ${it.missed.length === 1 ? 'día' : 'días'}`, sub: it.missed.map(m => fmtDay(m.k)).join(', '), text: esc(fixFor(it.id, ctx)), sev: it.missed.length >= 3 ? 'bad' : 'warn' });
  }
  return out;
}

// ---------- Ajuste semanal (la regla del programa) ----------
function decision() {
  const L = lossStats(), ph = phaseOf(weekOf()), ws = weekSummary(mondayOf(todayKey()));
  const prev = weekSummary(addDays(mondayOf(todayKey()), -7));
  const adherence = prev.pct != null ? prev.pct : ws.pct;
  if (L.pct1 == null) return { type: 'warn', text: 'Junta 2 semanas de pesajes (mínimo 3 por semana) para sugerir ajustes. No se cambia nada por un solo día.' };
  const slow = ph.from >= 13 ? 0.35 : 0.5;
  const pace = `Ritmo: ${round(L.kg1, 2)} kg (${round(L.pct1, 2)}%) en los últimos 7 días. Guía de esta fase: ${ph.loss[0]}–${ph.loss[1]}%.`;
  if (adherence != null && adherence < 0.8 && L.pct1 < ph.loss[0]) return { type: 'warn', text: `${pace} Antes de recortar calorías, sube tu cumplimiento: vas en ${Math.round(adherence * 100)}%. Revisa el panel de arriba.` };
  const wt = waistTrend(), stT = strengthTrend(), strengthDown = stT && stT.up < stT.n / 2;
  if (L.pct1 < slow && L.pct2 != null && L.pct2 < slow && !(wt != null && wt < 0))
    return { type: 'bad', text: `${pace} Dos semanas lentas y la cintura no baja. Cambia UNA cosa: −150 kcal (de carbos y grasa) o +10 min en dos sesiones de cardio.`, apply: -150 };
  if (L.pct1 < slow) return { type: 'warn', text: `${pace} Semana lenta. No cambies nada todavía: si se repite la próxima semana y la cintura tampoco baja, se ajusta.` };
  if ((L.pct1 > 1.1 && L.pct2 != null && L.pct2 > 1.1) || (L.kg1 > 1 && L.kg2 > 1 && strengthDown))
    return { type: 'bad', text: `${pace} Vas demasiado rápido${strengthDown ? ' y la fuerza está cayendo' : ''}. Sube 100–150 kcal y prioriza recuperación.`, apply: 150 };
  return { type: 'good', text: `${pace} Mantén calorías y cardio igual.` };
}
function safetyNote() {
  const L = lossStats();
  if (L.pct1 != null && L.pct1 > 1.2) return { type: 'bad', text: `Bajaste ${round(L.pct1, 2)}% en 7 días. Si se repite o cae tu fuerza, reduce la agresividad. Mareos, palpitaciones o desmayos: detén la preparación y busca atención médica.` };
  return null;
}

// ---------- Componentes ----------
// Identidad: monocromo (negro, blanco) con un solo acento "volt". Tipografía condensada gigante.
let animateNext = true;
const scoreClass = p => p >= 0.85 ? 'hi' : p >= 0.6 ? 'mid' : 'lo';
function donut(p, size, stroke, color, inner = '') {
  const r = (size - stroke) / 2, v = clamp(p || 0, 0, 1), cx = size / 2, c = 2 * Math.PI * r;
  return `<svg class="donut" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="${cx}" cy="${cx}" r="${r}" style="fill:none;stroke:var(--line);stroke-width:${stroke}"/>
    ${v > 0 ? `<circle cx="${cx}" cy="${cx}" r="${r}" style="fill:none;stroke:${color};stroke-width:${stroke}" stroke-dasharray="${(c * v).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${cx} ${cx})"/>` : ''}${inner}</svg>`;
}
function weekBars(mon) {
  const t = todayKey();
  return `<div class="wbars">${weekDates(mon).map(k => {
    const sc = dayScore(k), d = parseKey(k), on = sc.kind === 'past' || sc.kind === 'today', p = on ? sc.pct : 0;
    return `<button class="wbar ${k === t ? 'is-today' : ''} ${on ? (sc.kind === 'today' ? 'now' : scoreClass(p)) : 'off'}" data-act="daydetail" data-k="${k}" ${on ? '' : 'disabled'} aria-label="${fmtDay(k)}">
      <span class="wbar-pct">${on ? Math.round(p * 100) : '—'}</span>
      <span class="wbar-track"><i class="${animateNext ? 'grow' : ''}" style="height:${on ? Math.max(3, Math.round(p * 100)) : 0}%"></i></span>
      <span class="wbar-d">${DOW1[d.getDay()]}</span><span class="wbar-n">${d.getDate()}</span></button>`;
  }).join('')}</div>`;
}
const ICON = {
  check: '<path d="M5 12.5 10 17 19 7"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>'
};
const svgI = id => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[id] || ''}</svg>`;
function statusDot(s) {
  if (s === 'ok') return `<span class="st ok">${svgI('check')}</span>`;
  if (s === 'miss') return `<span class="st miss">${svgI('x')}</span>`;
  return `<span class="st ${s === 'na' ? 'na' : 'pending'}"></span>`;
}
function pageHead(title, kicker) { return `<header class="ph"><small>${kicker}</small><h1>${title}</h1></header>`; }
function datebar() {
  const t = todayKey();
  return `<div class="datebar"><button class="sq" data-act="day" data-n="-1" aria-label="Día anterior">${svgI('left')}</button>
    <b>${view === t ? 'Hoy' : view === addDays(t, -1) ? 'Ayer' : DOWL[dowOf(view)]}<small>${fmtDay(view)}</small></b>
    <button class="sq" data-act="day" data-n="1" ${view >= t ? 'disabled' : ''} aria-label="Día siguiente">${svgI('right')}</button></div>`;
}
function ticker(words) { const s = words.map(w => `<span>${w}</span>`).join(''); return `<div class="ticker" aria-hidden="true"><div class="ticker-in">${s}${s}${s}${s}</div></div>`; }
function footer() { return '<div class="footer-note">Herramienta de seguimiento deportivo; no sustituye atención médica. Sin diuréticos, laxantes, deshidratación ni sustancias: nada de eso está en este plan. Si tienes dolor en el pecho, desmayos, falta de aire o palpitaciones que no se quitan, detén la preparación y busca atención médica.</div>'; }
const kicker = () => { const d = parseKey(todayKey()), w = weekOf(); return `${DOWL[d.getDay()]} ${d.getDate()} ${MES[d.getMonth()]}${w >= 1 && w <= 24 ? ` — semana ${pad(w)}/24` : ''}`; };
const bar = (p, cls = '') => `<span class="bar ${cls}"><i style="width:${Math.round(clamp(p || 0, 0, 1) * 100)}%"></i></span>`;

// ---------- Pestañas ----------
function render() {
  Cloud.deferred = false;
  $$('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.tab === tab));
  ({ today: renderToday, training: renderTraining, nutrition: renderNutrition, progress: renderPanel, prep: renderPrep })[tab]();
  animateNext = false;
}

function tiles(k) {
  const d = dayOf(k), s = S(), it = Object.fromEntries(dayItems(k).map(x => [x.id, x])), m = macros(k), w = weekOf(k);
  const cardioWeek = weekSummary(mondayOf(k)).cardioDone;
  return [
    { id: 'weight', label: 'Peso', val: +d.weight > 0 ? round(d.weight, 1) : '—', unit: 'kg', sub: 'Al despertar', status: it.weight.status, p: +d.weight > 0 ? 1 : 0 },
    { id: 'kcal', label: 'Calorías', val: num(m.kcal), unit: 'kcal', sub: `Meta ${num(s.calories)}`, status: it.kcal.status, p: m.kcal / s.calories, over: m.kcal > s.calories * 1.1 },
    { id: 'protein', label: 'Proteína', val: num(m.p), unit: 'g', sub: `Meta ${s.protein} g`, status: it.protein.status, p: m.p / s.protein },
    { id: 'steps', label: 'Pasos', val: num(d.steps), unit: '', sub: `Meta ${num(s.steps)}`, status: it.steps.status, p: (+d.steps || 0) / s.steps },
    { id: 'sleep', label: 'Sueño', val: +d.sleep > 0 ? round(d.sleep, 1) : '—', unit: 'h', sub: `Mínimo ${s.sleepTarget} h`, status: it.sleep.status, p: (+d.sleep || 0) / s.sleepTarget },
    { id: 'posing', label: 'Posing', val: num(d.posing), unit: 'min', sub: posingRequired(k) ? `Meta ${posingTarget(w)} min` : 'Opcional hoy', status: it.posing.status, p: (+d.posing || 0) / posingTarget(w) },
    { id: 'cardio', label: 'Cardio Z2', val: num(d.cardio), unit: 'min', sub: `${cardioWeek}/${s.cardioSessions} en la semana`, status: +d.cardio >= 20 ? 'ok' : 'opt', p: (+d.cardio || 0) / s.cardioMinutes },
    { id: 'water', label: 'Agua', val: round(d.water || 0, 2), unit: 'L', sub: `Meta ${s.water} L`, status: +d.water >= s.water ? 'ok' : 'opt', p: (+d.water || 0) / s.water },
    { id: 'creatine', label: 'Creatina 5 g', val: d.supp && d.supp.creatine ? 'Tomada' : 'Pendiente', unit: '', sub: 'Toca para marcar', status: it.creatine.status, p: d.supp && d.supp.creatine ? 1 : 0, wide: true }
  ];
}
function tileHTML(t, i) {
  return `<button class="cell s-${t.status} ${t.wide ? 'wide' : ''}" data-act="item" data-id="${t.id}">
    <span class="cell-top"><span class="cell-n">${pad(i + 1)}</span><span class="cell-lbl">${t.label}</span>${statusDot(t.status)}</span>
    <span class="cell-val"><b>${t.val}</b>${t.unit ? `<small>${t.unit}</small>` : ''}</span>
    <span class="cell-sub">${t.sub}</span>${bar(t.p, t.over ? 'over' : t.status === 'ok' ? 'done' : '')}</button>`;
}
function renderToday() {
  const w = weekOf(), ph = phaseOf(w), dts = daysToShow(), sn = safetyNote(), sc = dayScore(view), s = S();
  const p = planOf(view), plan = PLAN[p], ts = plan.ex.length ? totalSets(p) : 0, ds = plan.ex.length ? doneSets(view) : 0;
  const dayN = clamp(diffDays(prepStart(), todayKey()) + 1, 1, 168), pct = Math.round((sc.pct || 0) * 100);
  $('#content').innerHTML = `
  <section class="hero">
    <div class="hero-bg" aria-hidden="true">CLASSIC</div>
    <div class="hero-k">${w < 1 ? 'Antes de la semana 1' : w > 24 ? 'Después del show' : `Semana ${pad(w)}/24 — ${esc(ph.name)}`}</div>
    <div class="hero-count"><b>${dts >= 0 ? dts : '0'}</b><span>Días<br>al show</span></div>
    <div class="hero-date">${fmtDay(s.competitionDate)} · día ${dayN} de 168</div>
    <div class="segs">${Array.from({ length: 24 }, (_, i) => `<i class="${i + 1 < w ? 'done' : i + 1 === w ? 'cur' : ''}"></i>`).join('')}</div>
  </section>
  ${ticker(['Peso', 'Pasos', 'Proteína', 'Entreno', 'Posing', 'Sueño', 'No se negocia'])}
  ${datebar()}
  <section class="score">
    <div class="score-top"><div><small>Metas del día</small><b>${pct}<em>%</em></b></div><span>${sc.ok ?? 0}/${sc.total ?? 0}<br>cumplidas</span></div>
    ${bar(sc.pct, 'thick')}
  </section>
  <button class="session" data-tab="training">
    <small>${plan.ex.length ? (view === todayKey() ? 'Hoy toca' : `${DOWL[dowOf(view)]} tocaba`) : 'Sin pesas'}</small>
    <b>${esc(plan.name)}</b>
    <span class="session-meta">${plan.ex.length ? `${plan.ex.length} ejercicios · ${ts} series · ${ds}/${ts} hechas` : p === 3 ? '10,000 pasos + zona 2 · buen día para recuperar una sesión' : 'Descanso total · también sirve para recuperar'}</span>
    <span class="session-go">${svgI('arrow')}</span>
  </button>
  <div class="board">${tiles(view).map(tileHTML).join('')}</div>
  <div class="section-title"><h2>Tu semana</h2><button class="link" data-tab="progress">Ver panel ${svgI('arrow')}</button></div>
  ${weekBars(mondayOf(todayKey()))}
  ${sn ? `<div class="alert ${sn.type} mt">${esc(sn.text)}</div>` : ''}
  ${footer()}`;
}

function renderTraining() {
  const p = planOf(view), plan = PLAN[p], w = state.workouts[view] || { log: {} }, sched = dowOf(view);
  const ts = plan.ex.length ? totalSets(p) : 0, ds = plan.ex.length ? doneSets(view) : 0;
  $('#content').innerHTML = `
  ${pageHead(esc(plan.name), p !== sched ? `Recuperando · hoy tocaba ${esc(PLAN[sched].short)}` : kicker())}
  ${datebar()}
  <div class="tabs" role="tablist">${[1, 2, 4, 5, 6, 3, 0].map(id => `<button class="tab ${id === p ? 'on' : ''} ${id === sched ? 'today' : ''}" data-act="plan" data-plan="${id}"><small>${DOW[id]}</small>${esc(PLAN[id].short)}</button>`).join('')}</div>
  ${plan.ex.length ? `<div class="stats3"><div><b>${plan.ex.length}</b><small>Ejercicios</small></div><div><b>${ds}<em>/${ts}</em></b><small>Series</small></div><div><b>${Math.round(ds / ts * 100)}<em>%</em></b><small>Completado</small></div></div>
    ${bar(ds / ts, 'thick volt')}
    <div class="ex-list">${plan.ex.map((e, i) => exHTML(p, i, e, w.log || {})).join('')}</div>
    <label class="check solo"><input type="checkbox" data-change="manual" ${w.manual ? 'checked' : ''}><span>Marcar como hecho sin registrar series</span></label>`
    : `<div class="card"><p style="margin:0">${p === 3 ? 'Sin pesas. 10,000 pasos y, si toca, 30–40 min de cardio zona 2 a intensidad moderada.' : 'Descanso total.'} ¿Perdiste una sesión esta semana? Elige arriba cuál vas a recuperar hoy.</p>
      <button class="btn full mt" data-act="item" data-id="cardio">Registrar cardio</button></div>`}
  <div class="section-title"><h2>Cómo ejecutar</h2></div>
  <div class="rules"><div><b>RIR</b><span>Compuestos a 2 → 1, a veces 0. Aislados 0–1 en las últimas series.</span></div>
    <div><b>Progresión</b><span>Mismo peso hasta llegar al tope del rango en todas las series. Luego sube: 80 kg 10/10/10 → 82.5 kg 8/8/7.</span></div>
    <div><b>Descanso</b><span>Compuestos 2.5–4 min, aislados 1.5–2.5 min. Al marcar una serie arranca el temporizador.</span></div></div>
  ${footer()}`;
}
function exHTML(p, i, e, log) {
  const [name, sets, min, max, rir, rest] = e, key = p + '_' + i, x = log[key] || {};
  const last = lastSession(p, i, view);
  const lastTop = last && last.sets.filter(s => s && +s.reps > 0).length >= sets && last.sets.slice(0, sets).every(s => s && +s.reps >= max);
  const rows = Array.from({ length: sets }, (_, j) => {
    const s = (x.sets && x.sets[j]) || {}, ls = (last && last.sets[j]) || {};
    return `<div class="set-row ${s.done ? 'is-done' : ''}"><div class="set-n">${j + 1}</div>
      <input inputmode="decimal" aria-label="Kilos serie ${j + 1}" placeholder="${esc(ls.kg || 'kg')}" value="${esc(s.kg || '')}" data-change="set" data-key="${key}" data-j="${j}" data-f="kg" data-n="${sets}">
      <input inputmode="numeric" aria-label="Repeticiones serie ${j + 1}" placeholder="${esc(ls.reps || `${min}–${max}`)}" value="${esc(s.reps || '')}" data-change="set" data-key="${key}" data-j="${j}" data-f="reps" data-n="${sets}">
      <input inputmode="decimal" aria-label="RIR serie ${j + 1}" placeholder="${esc(rir)}" value="${esc(s.rir || '')}" data-change="set" data-key="${key}" data-j="${j}" data-f="rir" data-n="${sets}">
      <label class="done-box"><input class="done" type="checkbox" aria-label="Serie ${j + 1} hecha" ${s.done ? 'checked' : ''} data-change="setdone" data-key="${key}" data-j="${j}" data-n="${sets}" data-rest="${rest}" data-name="${esc(name)}"><span>${svgI('check')}</span></label></div>`;
  }).join('');
  const allDone = x.sets && x.sets.length >= sets && x.sets.slice(0, sets).every(s => s && s.done);
  return `<div class="exercise ${allDone ? 'all-done' : ''}">
    <div class="ex-top"><span class="ex-n">${pad(i + 1)}</span><div class="ex-name"><b>${esc(name)}</b><small>${sets} × ${min}–${max} · RIR ${rir}</small></div>
      <button class="timer-chip" data-act="timer" data-sec="${rest}" data-name="${esc(name)}">${svgI('timer')}${round(rest / 60, 1)}′</button></div>
    <div class="last">${last ? `<span>Última · ${fmtShort(last.date)}</span> <b>${last.sets.slice(0, sets).map(s => s && s.kg && s.reps ? `${esc(s.kg)}×${esc(s.reps)}` : '—').join('  /  ')}</b>` : 'Primera vez: elige un peso que te deje en el RIR marcado.'}</div>
    ${lastTop ? `<div class="up-badge">Sube carga hoy ${svgI('arrow')}</div>` : ''}
    <div class="sets"><div class="set-row head"><div>#</div><div>KG</div><div>Reps</div><div>RIR</div><div>OK</div></div>${rows}</div>
    <input class="ex-note" placeholder="Notas: máquina, asiento, sensaciones" value="${esc(x.note || '')}" data-change="exnote" data-key="${key}" data-n="${sets}"></div>`;
}

function defaultMeal() { const h = new Date().getHours(); return h < 11 ? 'Desayuno' : h < 16 ? 'Comida' : h < 19 ? 'Pre-entreno' : 'Cena'; }
function renderNutrition() {
  const n = state.nutrition[view] || { foods: [] }, m = macros(view), s = S(), d = dayOf(view), supp = d.supp || {};
  const left = Math.round(s.calories - m.kcal);
  const byMeal = MEALS.map(ml => ({ ml, foods: n.foods.map((f, i) => ({ ...f, i })).filter(f => f.meal === ml) })).filter(g => g.foods.length);
  const mac = [['P', 'Proteína', m.p, s.protein], ['C', 'Carbos', m.c, s.carbs], ['G', 'Grasa', m.f, s.fat]];
  $('#content').innerHTML = `
  ${pageHead('Comida', kicker())}
  ${datebar()}
  <section class="fuel">
    <small>${left < 0 ? 'Kcal de más' : 'Kcal restantes'}</small>
    <b class="${left < 0 ? 'neg' : ''}">${num(Math.abs(left))}</b>
    <span>${num(m.kcal)} / ${num(s.calories)} consumidas</span>
    ${bar(m.kcal / s.calories, `thick ${left < 0 ? 'over' : 'volt'}`)}
    <div class="macros">${mac.map(([k, l, v, t]) => `<div><span class="mk">${k}</span><small>${l}</small><b>${num(v)}<em>/${t}g</em></b>${bar(v / t, v > t * 1.1 ? 'over' : '')}</div>`).join('')}</div>
  </section>
  <div class="section-title"><h2>Agregar</h2><span>toca una porción</span></div>
  <div class="tabs">${MEALS.map(ml => `<button class="tab ${ml === mealSel ? 'on' : ''}" data-act="meal" data-meal="${ml}">${ml}</button>`).join('')}</div>
  <div class="food-list">${FOODS.map((f, i) => `<button class="food-row" data-act="preset" data-i="${i}"><span><b>${esc(f[0])}</b><small>${f[1]} kcal · P${f[2]} · C${f[3]} · G${f[4]}</small></span><span class="add">+</span></button>`).join('')}</div>
  <div class="row mt"><button class="btn full" data-act="food-custom">Alimento propio</button><button class="btn full" data-act="food-repeat">Repetir ayer</button></div>
  <div class="section-title"><h2>Registrado</h2><span>${n.foods.length} ${n.foods.length === 1 ? 'alimento' : 'alimentos'}</span></div>
  <div class="card">${byMeal.length ? byMeal.map(g => `<div class="meal-h">${g.ml}<span>${num(sum(g.foods, f => f.kcal))} kcal</span></div>${g.foods.map(f => `<div class="check"><div style="min-width:0"><b>${esc(f.name)}</b><div class="tiny muted">${num(f.kcal)} kcal · P${num(f.p)} C${num(f.c)} G${num(f.f)}</div></div><button class="del" data-act="food-del" data-i="${f.i}" aria-label="Borrar">${svgI('x')}</button></div>`).join('')}`).join('')
    : '<p class="muted mini" style="margin:0">Todavía no registras comida este día. Toca una porción o usa "Repetir ayer".</p>'}</div>
  <div class="section-title"><h2>Suplementos</h2></div>
  <div class="card">${[['creatine', 'Creatina monohidratada 5 g (diaria)'], ['whey', 'Whey (solo si te falta proteína)'], ['caffeine', 'Cafeína antes de entrenar (opcional)']].map(([k, l]) =>
      `<div class="check"><label><input type="checkbox" data-change="supp" data-k="${k}" ${supp[k] ? 'checked' : ''}><span>${l}</span></label></div>`).join('')}</div>
  <div class="section-title"><h2>Guía</h2></div>
  <div class="rules"><div><b>4 comidas</b><span>50–55 g de proteína cada una (ej. 8:00, 13:00, 18:00, 22:00).</span></div>
    <div><b>Desayuno</b><span>4 huevos, 250 g claras, 80 g avena, fruta.</span></div>
    <div><b>Comida</b><span>200 g pollo, 250–300 g arroz, verduras, aceite de oliva.</span></div>
    <div><b>Pre-entreno</b><span>200 g carne magra o pollo, 300 g papa o arroz, fruta.</span></div>
    <div><b>Cena</b><span>200–250 g pescado, carne o pollo, arroz o papa, verdura.</span></div>
    <div><b>Regla</b><span>No recortes calorías porque un día pesaste más: se ajusta con el promedio semanal.</span></div></div>
  ${footer()}`;
}

function renderPanel() {
  const t = todayKey(), cur = mondayOf(t), ws = weekSummary(panelWeek), rp = recoveryPlan(panelWeek);
  const pct = ws.pct;
  const L = lossStats(), wt = waistTrend(), stT = strengthTrend(), dec = decision();
  const mark = [
    { l: 'Peso 7 días', v: L.kg1 != null ? `${L.kg1 >= 0 ? '−' : '+'}${round(Math.abs(L.kg1), 2)}` : '—', u: 'kg', good: L.kg1 != null ? L.kg1 > 0 : null },
    { l: 'Cintura', v: wt != null ? `${wt <= 0 ? '−' : '+'}${round(Math.abs(wt), 1)}` : '—', u: 'cm', good: wt != null ? wt < 0 : null },
    { l: 'Fuerza', v: stT ? `${stT.up}/${stT.n}` : '—', u: '=/↑', good: stT ? stT.up >= stT.n / 2 : null }
  ];
  const known = mark.filter(x => x.good != null);
  const verdict = known.length === 3 && known.every(x => x.good) ? { type: 'good', text: 'Peso baja, cintura baja y fuerza estable: el programa está funcionando, aunque la báscula vaya lenta.' }
    : known.length ? { type: 'warn', text: 'Lee las tres juntas. Un solo indicador malo durante una semana no es motivo para cambiar el plan.' }
    : { type: 'warn', text: 'Registra peso diario, cintura el domingo y tus series para ver el marcador.' };
  const lastWaist = (() => { const a = Object.values(state.weekly).filter(v => +v.waist > 0 && v.date).sort((x, y) => x.date.localeCompare(y.date)); return a.length ? round(a.at(-1).waist, 1) : '—'; })();
  $('#content').innerHTML = `
  ${pageHead('Progreso', kicker())}
  <div class="datebar"><button class="sq" data-act="pweek" data-n="-7" aria-label="Semana anterior">${svgI('left')}</button>
    <b>${panelWeek === cur ? 'Esta semana' : `Semana ${pad(weekOf(panelWeek))}`}<small>${fmtShort(panelWeek)} – ${fmtShort(addDays(panelWeek, 6))}</small></b>
    <button class="sq" data-act="pweek" data-n="7" ${panelWeek >= cur ? 'disabled' : ''} aria-label="Semana siguiente">${svgI('right')}</button></div>
  <section class="score big">
    <div class="score-top"><div><small>Cumplimiento semanal</small><b class="${pct == null ? '' : scoreClass(pct)}">${pct == null ? '—' : Math.round(pct * 100)}<em>%</em></b></div><span>${ws.ok}/${ws.total}<br>metas</span></div>
    ${weekBars(panelWeek)}
    <p class="tiny muted" style="margin:10px 0 0">Toca un día para ver qué faltó. <i class="k hi"></i>≥85% <i class="k mid"></i>60–84% <i class="k lo"></i>&lt;60%</p>
  </section>
  <div class="legend">${ws.items.filter(it => it.total).map(it => `<div class="lg"><span>${esc(it.label)}</span><b>${it.ok}/${it.total}</b>${bar(it.ok / it.total, it.ok === it.total ? 'volt' : it.ok / it.total < 0.6 ? 'over' : '')}</div>`).join('')}
    <div class="lg"><span>Cardio</span><b>${ws.cardioDone}/${ws.cardioTarget}</b>${bar(ws.cardioDone / ws.cardioTarget, ws.cardioDone >= ws.cardioTarget ? 'volt' : '')}</div></div>
  <div class="section-title"><h2>Cómo recuperarlo</h2><span>${rp.length ? `${rp.length} pendientes` : 'nada pendiente'}</span></div>
  ${rp.length ? rp.map(r => `<div class="fix ${r.sev}"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small><div>${r.text}</div></div>`).join('')
    : `<div class="alert good">${ws.total ? 'Semana limpia hasta ahora. Constancia sobre perfección.' : 'Aún no hay días registrados en esta semana.'}</div>`}
  <div class="section-title"><h2>Marcador</h2></div>
  <div class="board three">${mark.map((x, i) => `<div class="cell ${x.good == null ? '' : x.good ? 's-ok' : 's-miss'}"><span class="cell-top"><span class="cell-n">${pad(i + 1)}</span><span class="cell-lbl">${x.l}</span>${x.good == null ? '' : statusDot(x.good ? 'ok' : 'miss')}</span><span class="cell-val"><b>${x.v}</b><small>${x.u}</small></span></div>`).join('')}</div>
  <div class="alert ${verdict.type} mt">${esc(verdict.text)}</div>
  <div class="alert ${dec.type} mt">${esc(dec.text)}${dec.apply ? `<button class="btn primary full mt" data-act="apply" data-n="${dec.apply}">Aplicar ${dec.apply > 0 ? '+' : '−'}${Math.abs(dec.apply)} kcal (${S().calories} → ${S().calories + dec.apply})</button>` : ''}</div>
  <div class="section-title"><h2>Peso</h2><span class="big-inline">${L.a0 ? round(L.a0, 1) : '—'}<small> kg prom. 7 días</small></span></div>
  <div class="card chart-card"><canvas id="weightChart" class="chart"></canvas><div class="chart-label">Puntos: pesaje diario · línea: promedio de 7 días</div></div>
  <div class="section-title"><h2>Cintura</h2><span class="big-inline">${lastWaist}<small> cm</small></span></div>
  <div class="card chart-card"><canvas id="waistChart" class="chart"></canvas><div class="chart-label">Al ombligo, relajado, en ayunas, siempre igual</div></div>
  <div class="section-title"><h2>24 semanas</h2><span>cada cuadro es un día</span></div>
  <div class="card">${heatmap()}</div>
  <div class="section-title"><h2>Fuerza</h2><span>5 básicos</span></div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Ejercicio</th><th>Mejor serie</th><th>vs anterior</th></tr></thead><tbody>
    ${KEY_LIFTS.map(Lf => { const h = liftHistory(Lf.plan, Lf.i), a = h.at(-1), b = h.at(-2);
      const dlt = a && b ? a.e - b.e : null;
      return `<tr><td>${esc(Lf.name)}</td><td>${a ? `${esc(a.best.kg)} kg × ${esc(a.best.reps)}` : '—'}</td><td>${dlt == null ? '—' : `<span class="pill ${dlt >= -0.5 ? 'good' : 'bad'}">${dlt >= 0 ? '+' : ''}${round(dlt, 1)}</span>`}</td></tr>`; }).join('')}
  </tbody></table></div></div>
  <div class="section-title"><h2>Check-in</h2><button class="link" data-act="checkin">Registrar ${svgI('arrow')}</button></div>
  ${checkinSummary()}
  ${footer()}`;
  requestAnimationFrame(() => {
    const ws7 = weightsBetween('0000', todayKey());
    const roll = ws7.map((x, i) => { const from = addDays(x.k, -6); return { k: x.k, v: avg(ws7.slice(0, i + 1).filter(y => y.k >= from).map(y => y.v)) }; });
    lineChart('weightChart', [{ points: ws7, dots: true }, { points: roll, line: true, area: true }]);
    const wa = Object.entries(state.weekly).filter(([, v]) => +v.waist > 0 && v.date).map(([, v]) => ({ k: v.date, v: +v.waist })).sort((a, b) => a.k.localeCompare(b.k));
    lineChart('waistChart', [{ points: wa, dots: true, line: true, area: true }]);
  });
}
function heatmap() {
  const start = prepStart(), t = todayKey(), cw = weekOf(t);
  let cells = '';
  for (let r = 0; r < 7; r++) {
    cells += `<div class="heat-lbl">${DOW1[(r + 1) % 7]}</div>`;
    for (let wk = 0; wk < 24; wk++) {
      // columna = semana de la prep (días desde el inicio), fila = día de la semana natural
      const colStart = addDays(start, wk * 7), k = addDays(mondayOf(colStart), r);
      const inPrep = k >= start && k <= S().competitionDate;
      const sc = inPrep ? dayScore(k) : { kind: 'out' };
      const on = sc.kind === 'past' || sc.kind === 'today';
      cells += `<button class="heat ${sc.kind} ${on ? (sc.kind === 'today' ? 'now' : scoreClass(sc.pct)) : ''}" ${on ? `data-act="daydetail" data-k="${k}"` : 'disabled'} aria-label="${fmtDay(k)}"></button>`;
    }
  }
  const heads = Array.from({ length: 24 }, (_, i) => `<div class="heat-head ${i + 1 === cw ? 'cur' : ''}">${(i % 4 === 0 || i + 1 === cw) ? i + 1 : ''}</div>`).join('');
  return `<div class="heat-grid"><div></div>${heads}${cells}</div><p class="tiny muted" style="margin:12px 0 0"><i class="k hi"></i>≥85% <i class="k mid"></i>60–84% <i class="k lo"></i>&lt;60% <i class="k off"></i>sin datos</p>`;
}
function checkinSummary() {
  const key = 'W' + clamp(weekOf(), 1, 24), x = state.weekly[key];
  const L = lossStats(), mon = mondayOf(todayKey()), days = weekDates(addDays(mon, -7)).concat(weekDates(mon)).filter(k => k <= todayKey()).slice(-7);
  const steps = avg(days.map(k => +dayOf(k).steps).filter(v => v > 0)), sleep = avg(days.map(k => +dayOf(k).sleep).filter(v => v > 0));
  return `<div class="board three"><div class="cell"><span class="cell-top"><span class="cell-lbl">Peso prom.</span></span><span class="cell-val"><b>${L.a0 ? round(L.a0, 1) : '—'}</b><small>kg</small></span></div>
    <div class="cell"><span class="cell-top"><span class="cell-lbl">Pasos prom.</span></span><span class="cell-val"><b>${steps ? num(steps) : '—'}</b></span></div>
    <div class="cell"><span class="cell-top"><span class="cell-lbl">Sueño prom.</span></span><span class="cell-val"><b>${sleep ? round(sleep, 1) : '—'}</b><small>h</small></span></div></div>
    <p class="mini muted" style="margin:10px 2px 0">${x ? `${esc(key.replace('W', 'Semana '))}: cintura ${x.waist || '—'} cm · fotos ${['front', 'side', 'back'].filter(f => x.photos && x.photos[f]).length}/3${x.notes ? ' · ' + esc(x.notes) : ''}` : 'Cada domingo: cintura al ombligo y fotos frontal, lateral y espalda (guárdalas en tu carrete). Lo demás se calcula solo.'}</p>`;
}

function renderPrep() {
  const w = weekOf(), ph = phaseOf(w), pt = posingTarget(clamp(w, 1, 24)), d = dayOf(todayKey()), poses = d.poses || {}, dts = daysToShow();
  $('#content').innerHTML = `
  ${pageHead('Road to stage', kicker())}
  <section class="hero small">
    <div class="hero-bg" aria-hidden="true">STAGE</div>
    <div class="hero-k">${esc(ph.name)} · guía ${ph.loss[0]}–${ph.loss[1]}%/semana</div>
    <div class="hero-count"><b>${dts >= 0 ? dts : '0'}</b><span>Días<br>al show</span></div>
    <div class="segs">${Array.from({ length: 24 }, (_, i) => `<i class="${i + 1 < w ? 'done' : i + 1 === w ? 'cur' : ''}"></i>`).join('')}</div>
  </section>
  <div class="section-title"><h2>Posing</h2><span>${num(d.posing)} de ${pt} min hoy</span></div>
  <div class="card">${POSES.map((x, i) => `<div class="check"><label><input type="checkbox" data-change="pose" data-i="${i}" ${poses[i] ? 'checked' : ''}><span>${x}</span></label></div>`).join('')}
    <div class="row mt"><button class="btn primary full" data-act="posing-timer" data-min="${pt}">Timer ${pt} min</button><button class="btn full" data-act="item" data-id="posing">Registrar min</button></div></div>
  <div class="section-title"><h2>Las fases</h2><span>show: ${fmtShort(S().competitionDate)}</span></div>
  <div class="timeline">${PHASES.map((p, i) => `<div class="phase ${w >= p.from && w <= p.to ? 'current' : w > p.to ? 'past' : ''}">
    <span class="phase-n">${pad(i + 1)}</span>
    <div class="phase-body"><small>Semanas ${p.from === p.to ? p.from : `${p.from}–${p.to}`}</small><h3>${esc(p.name)}</h3><p>${esc(p.target)}</p>
    <ul>${p.items.map(it => `<li>${esc(it)}</li>`).join('')}</ul>
    <div class="week-list">${Array.from({ length: p.to - p.from + 1 }, (_, j) => p.from + j).map(n => `<div class="week-chip ${n < w ? 'done' : n === w ? 'current' : ''}">${pad(n)}</div>`).join('')}</div></div></div>`).join('')}</div>
  <div class="section-title"><h2>Reglas de ajuste</h2></div>
  <div class="rules"><div><b>Funciona</b><span>Peso ↓ + cintura ↓ + fuerza estable. No se toca nada.</span></div>
    <div><b>Estancado</b><span>2 semanas sin bajar peso ni cintura: −150 kcal o +10 min en dos sesiones de cardio. Una sola cosa.</span></div>
    <div><b>Muy rápido</b><span>Más de 1% por semana 2 semanas o fuerza cayendo: +100–150 kcal.</span></div>
    <div><b>Paciencia</b><span>No se cambia nada por una sola mala semana.</span></div></div>
  ${footer()}`;
}

// ---------- Gráficas ----------
function lineChart(id, series) {
  const c = document.getElementById(id); if (!c) return;
  const dpr = window.devicePixelRatio || 1, W = c.clientWidth || 320, H = c.clientHeight || 190;
  c.width = W * dpr; c.height = H * dpr;
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement), col = n => css.getPropertyValue(n).trim();
  const main = col('--volt'), ink = col('--ink');
  x.font = '700 10px Archivo, -apple-system, sans-serif';
  const pts = series.flatMap(s => s.points);
  if (pts.length < 1) { x.fillStyle = col('--muted'); x.fillText('SIN DATOS TODAVÍA', 14, H / 2); return; }
  const ks = pts.map(p => p.k).sort(), d0 = ks[0], d1 = ks.at(-1), span = Math.max(1, diffDays(d0, d1));
  let lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v));
  const padv = Math.max(0.5, (hi - lo) * 0.15); lo -= padv; hi += padv;
  const Lm = 4, R = 42, T = 10, B = 22;
  const X = k => Lm + (pts.length === 1 ? 0.5 : diffDays(d0, k) / span) * (W - Lm - R);
  const Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  x.strokeStyle = col('--line'); x.fillStyle = col('--muted'); x.lineWidth = 1;
  for (let i = 0; i <= 3; i++) { const v = lo + (hi - lo) * i / 3, y = Math.round(Y(v)) + .5; x.beginPath(); x.moveTo(Lm, y); x.lineTo(W - R + 4, y); x.stroke(); x.fillText(round(v, 1).toString(), W - R + 10, y + 4); }
  x.fillText(fmtShort(d0).toUpperCase(), Lm, H - 5);
  if (d1 !== d0) { const tw = x.measureText(fmtShort(d1).toUpperCase()).width; x.fillText(fmtShort(d1).toUpperCase(), W - R - tw, H - 5); }
  for (const s of series) {
    if (s.line && s.points.length > 1) {
      if (s.area) {
        const g = x.createLinearGradient(0, T, 0, H - B); g.addColorStop(0, main + '40'); g.addColorStop(1, main + '00');
        x.fillStyle = g; x.beginPath(); s.points.forEach((p, i) => i ? x.lineTo(X(p.k), Y(p.v)) : x.moveTo(X(p.k), Y(p.v)));
        x.lineTo(X(s.points.at(-1).k), H - B); x.lineTo(X(s.points[0].k), H - B); x.closePath(); x.fill();
      }
      x.strokeStyle = main; x.lineWidth = 3; x.lineJoin = 'miter'; x.beginPath(); s.points.forEach((p, i) => i ? x.lineTo(X(p.k), Y(p.v)) : x.moveTo(X(p.k), Y(p.v))); x.stroke();
    }
    if (s.dots) { x.fillStyle = s.line ? main : col('--dim'); s.points.forEach(p => { const r = s.line ? 3.5 : 2.5; x.fillRect(X(p.k) - r, Y(p.v) - r, r * 2, r * 2); }); }
  }
  const lastS = series.at(-1).points.at(-1);
  if (lastS) { x.fillStyle = ink; x.fillRect(X(lastS.k) - 5, Y(lastS.v) - 5, 10, 10); }
}

// ---------- Temporizador (usa la hora de fin: sigue bien aunque bloquees el iPhone) ----------
const Timer = { end: 0, int: null, ctx: null, hide: null };
function audioUnlock() {
  try { Timer.ctx = Timer.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (Timer.ctx.state === 'suspended') Timer.ctx.resume(); } catch (e) { Timer.ctx = null; }
}
function beep() {
  const a = Timer.ctx; if (!a) return;
  [0, 0.25, 0.5].forEach(t => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.25, a.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + t + 0.18); o.connect(g).connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.2); });
}
function startTimer(sec, label, onDone) {
  audioUnlock();
  clearInterval(Timer.int); clearTimeout(Timer.hide);
  Timer.end = Date.now() + sec * 1000; Timer.onDone = onDone || null;
  $('#timerLabel').textContent = label || 'Descanso';
  $('#timerBar').classList.remove('done'); $('#timerBar').hidden = false;
  tick(); Timer.int = setInterval(tick, 250);
}
function tick() {
  const left = Math.ceil((Timer.end - Date.now()) / 1000);
  $('#timerLeft').textContent = `${pad(Math.floor(Math.max(0, left) / 60))}:${pad(Math.max(0, left) % 60)}`;
  const ml = $('#modalTimer'); if (ml) ml.textContent = $('#timerLeft').textContent;
  if (left <= 0) {
    clearInterval(Timer.int); beep(); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { /* no vibra */ }
    $('#timerBar').classList.add('done'); $('#timerLabel').textContent = 'Listo · siguiente serie';
    if (Timer.onDone) { const f = Timer.onDone; Timer.onDone = null; f(); }
    Timer.hide = setTimeout(() => { $('#timerBar').hidden = true; }, 8000);
  }
}
function stopTimer() { clearInterval(Timer.int); Timer.onDone = null; $('#timerBar').hidden = true; }

// ---------- Modales ----------
function openModal(html) { $('#modalBody').innerHTML = html; if (!$('#modal').open) $('#modal').showModal(); }
function closeModal() { if ($('#modal').open) $('#modal').close(); }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 1900); }

const METRICS = {
  weight: { label: 'Peso', unit: 'kg', step: '0.1', hint: 'Al despertar, después del baño y antes de comer o beber.', mode: 'decimal' },
  sleep: { label: 'Sueño de anoche', unit: 'horas', step: '0.25', set: [6, 7, 7.5, 8], mode: 'decimal' },
  steps: { label: 'Pasos', unit: 'pasos', step: '1', add: [1000, 2500, 5000], hint: 'Copia el número de la app Salud o súmalo por partes.', mode: 'numeric' },
  cardio: { label: 'Cardio zona 2', unit: 'min', step: '1', add: [10, 20, 30, 40], hint: 'Cuenta como sesión desde 20 min. Bici, elíptica o caminadora inclinada.', mode: 'numeric' },
  posing: { label: 'Posing', unit: 'min', step: '1', add: [5, 10, 15, 30], mode: 'numeric' },
  water: { label: 'Agua', unit: 'L', step: '0.25', add: [0.5, 1], mode: 'decimal' }
};
function metricModal(what) {
  const m = METRICS[what], cur = dayOf(view)[what] || '';
  openModal(`<h2>${m.label} · ${view === todayKey() ? 'hoy' : fmtDay(view)}</h2>
    <input id="mv" class="big-input" type="text" inputmode="${m.mode}" autocomplete="off" value="${esc(cur)}" placeholder="0" aria-label="${m.label} en ${m.unit}">
    <div class="tiny muted" style="text-align:center;margin-top:4px">${m.unit}</div>
    ${m.add ? `<div class="stepper">${m.add.map(a => `<button class="btn small" data-act="mv-add" data-n="${a}">+${a < 10 ? a : num(a)}</button>`).join('')}</div>` : ''}
    ${m.set ? `<div class="stepper">${m.set.map(a => `<button class="btn small" data-act="mv-set" data-n="${a}">${a} h</button>`).join('')}</div>` : ''}
    ${m.hint ? `<p class="mini muted">${m.hint}</p>` : ''}
    <div class="row mt"><button class="btn full" data-act="close">Cancelar</button><button class="btn primary full" data-act="mv-save" data-what="${what}">Guardar</button></div>`);
}
function dayModal(k) {
  const items = dayItems(k), sc = dayScore(k);
  openModal(`<div class="row between"><h2 style="margin:0">${fmtDay(k)}</h2><button class="btn small" data-act="close">Cerrar</button></div>
    <div class="day-score"><b class="${scoreClass(sc.pct || 0)}">${Math.round((sc.pct || 0) * 100)}<em>%</em></b><span>${sc.ok} de ${sc.total} metas cumplidas${k === todayKey() ? ' hasta ahora' : ''}</span></div>
    ${bar(sc.pct, 'thick ' + (scoreClass(sc.pct || 0) === 'hi' ? 'volt' : scoreClass(sc.pct || 0) === 'lo' ? 'over' : ''))}
    <div class="mt">${items.map(it => `<div class="day-item">${statusDot(it.status)}<div style="min-width:0;flex:1"><div class="row between"><b class="mini">${esc(it.label)}</b><span class="tiny muted">${esc(it.value)}</span></div>
      ${it.status === 'miss' && it.id !== 'train' ? `<div class="tiny fix-text">${esc(fixFor(it.id, it))}</div>` : ''}
      ${it.status === 'miss' && it.id === 'train' ? `<div class="tiny fix-text">Recupérala en un día de recuperación o descanso de esa misma semana. Revisa "Cómo recuperarlo" en el panel.</div>` : ''}</div></div>`).join('')}</div>
    <p class="tiny muted">¿Sí lo hiciste pero no lo registraste? Corrígelo en el día.</p>
    <button class="btn primary full" data-act="goto-day" data-k="${k}">Ir a ${k === todayKey() ? 'hoy' : 'ese día'} y completar</button>`);
}
function checkinModal() {
  const key = 'W' + clamp(weekOf(), 1, 24), x = state.weekly[key] || {}, ph = x.photos || {};
  openModal(`<h2>Check-in · semana ${key.slice(1)}</h2>
    <div class="input-group"><label for="cw">Cintura a la altura del ombligo (cm)</label><input id="cw" type="text" inputmode="decimal" value="${esc(x.waist || '')}"></div>
    <div class="mt">${[['front', 'Foto frontal'], ['side', 'Foto lateral'], ['back', 'Foto espalda']].map(([k, l]) => `<div class="check"><label><input type="checkbox" id="cp-${k}" ${ph[k] ? 'checked' : ''}><span>${l} (en tu carrete)</span></label></div>`).join('')}</div>
    <div class="input-group mt"><label for="cn">Notas (hambre, energía, digestión)</label><textarea id="cn">${esc(x.notes || '')}</textarea></div>
    <div class="row mt"><button class="btn full" data-act="close">Cancelar</button><button class="btn primary full" data-act="checkin-save" data-key="${key}">Guardar</button></div>`);
}
function customFoodModal() {
  openModal(`<h2>Alimento propio · ${mealSel}</h2><div class="form-grid">
    <div class="input-group span2"><label for="fn">Nombre</label><input id="fn" placeholder="Ej. burrito de machaca"></div>
    <div class="input-group"><label for="fk">Kcal</label><input id="fk" type="number" inputmode="numeric"></div>
    <div class="input-group"><label for="fp">Proteína g</label><input id="fp" type="number" inputmode="numeric"></div>
    <div class="input-group"><label for="fc">Carbos g</label><input id="fc" type="number" inputmode="numeric"></div>
    <div class="input-group"><label for="ff">Grasa g</label><input id="ff" type="number" inputmode="numeric"></div></div>
    <p class="tiny muted">Si dejas las kcal vacías se calculan: P×4 + C×4 + G×9.</p>
    <div class="row mt"><button class="btn full" data-act="close">Cancelar</button><button class="btn primary full" data-act="food-save">Guardar</button></div>`);
}
function posingModal(min) {
  openModal(`<h2>Posing · ${min} min</h2><div id="modalTimer" class="big-input" style="border:0">${pad(min)}:00</div>
    <p class="mini muted">Poses obligatorias, respiración y transiciones. Calidad antes que aguantar por aguantar. Al terminar se registran los minutos.</p>
    <div class="row"><button class="btn full" data-act="close">Cerrar</button><button class="btn primary full" data-act="posing-start" data-min="${min}">Iniciar</button></div>`);
}
function settingsModal() {
  const s = S();
  openModal(`<div class="row between"><h2 style="margin:0">Ajustes</h2><button class="btn small" data-act="close">Cerrar</button></div>
    <div class="form-grid mt">
      <div class="input-group span2"><label for="s-date">Fecha de la competencia</label><input id="s-date" type="date" value="${s.competitionDate}"></div>
      <div class="input-group span2"><label for="s-start">Primer día de registro (antes no cuenta en el panel)</label><input id="s-start" type="date" value="${state.createdAt}"></div>
      <div class="input-group"><label for="s-kcal">Kcal</label><input id="s-kcal" type="number" inputmode="numeric" value="${s.calories}"></div>
      <div class="input-group"><label for="s-p">Proteína g</label><input id="s-p" type="number" inputmode="numeric" value="${s.protein}"></div>
      <div class="input-group"><label for="s-c">Carbos g</label><input id="s-c" type="number" inputmode="numeric" value="${s.carbs}"></div>
      <div class="input-group"><label for="s-f">Grasa g</label><input id="s-f" type="number" inputmode="numeric" value="${s.fat}"></div>
      <div class="input-group"><label for="s-steps">Pasos diarios</label><input id="s-steps" type="number" inputmode="numeric" value="${s.steps}"></div>
      <div class="input-group"><label for="s-sleep">Sueño mínimo (h)</label><input id="s-sleep" type="text" inputmode="decimal" value="${s.sleepTarget}"></div>
      <div class="input-group"><label for="s-cs">Cardio sesiones/sem</label><input id="s-cs" type="number" inputmode="numeric" value="${s.cardioSessions}"></div>
      <div class="input-group"><label for="s-cm">Cardio min/sesión</label><input id="s-cm" type="number" inputmode="numeric" value="${s.cardioMinutes}"></div>
    </div>
    <p class="tiny muted">Macros actuales = ${num(s.protein * 4 + s.carbs * 4 + s.fat * 9)} kcal.</p>
    <button class="btn primary full" data-act="settings-save">Guardar ajustes</button>
    <div class="divider"></div>
    <h3 style="margin:0 0 6px">Tus datos</h3>
    <p class="mini muted" style="margin:0 0 10px">${Cloud.col ? 'Se guardan en este dispositivo y en el espacio privado de tu cuenta de Claude: los ves igual en el iPhone y en la compu.' : 'Se guardan solo en este navegador. Exporta un respaldo cada semana.'}</p>
    <div class="row"><button class="btn full" data-act="export">Exportar respaldo</button><label class="btn full" for="importFile">Importar</label></div>
    <input id="importFile" class="visually-hidden" type="file" accept="application/json,.json" data-change="import">
    <div class="divider"></div>
    <h3 style="margin:0 0 6px">Instalar en el iPhone</h3>
    <p class="mini muted" style="margin:0">Abre la liga en Safari → botón Compartir → "Agregar a pantalla de inicio".</p>
    <div class="divider"></div>
    <button class="btn danger full" data-act="reset">Borrar todo y empezar de cero</button>`);
}

// ---------- Acciones ----------
function setTab(t) { tab = t; animateNext = true; if (t === 'progress') panelWeek = mondayOf(todayKey()); render(); window.scrollTo(0, 0); }
const ACT = {
  settings: () => settingsModal(),
  close: () => closeModal(),
  day: el => { const n = addDays(view, +el.dataset.n); if (n <= todayKey()) { view = n; render(); } },
  pweek: el => { const n = addDays(panelWeek, +el.dataset.n); if (n <= mondayOf(todayKey())) { panelWeek = n; render(); } },
  item: el => {
    const id = el.dataset.id;
    if (METRICS[id]) return metricModal(id);
    if (id === 'kcal' || id === 'protein') return setTab('nutrition');
    if (id === 'train') return setTab('training');
    if (id === 'creatine') { editDay(view, d => { d.supp = { ...(d.supp || {}), creatine: !(d.supp && d.supp.creatine) }; }); render(); toast(dayOf(view).supp.creatine ? 'Creatina registrada' : 'Creatina desmarcada'); }
  },
  'mv-add': el => { const i = $('#mv'), v = parseNum(i.value); i.value = round((isNaN(v) ? 0 : v) + +el.dataset.n, 2); },
  'mv-set': el => { $('#mv').value = el.dataset.n; },
  'mv-save': el => {
    const what = el.dataset.what, v = parseNum($('#mv').value);
    const n = isNaN(v) ? '' : round(v, 2);
    if ($('#mv').value.trim() && isNaN(v)) return toast('Escribe un número válido');
    if (n !== '' && (isNaN(n) || n < 0)) return toast('Escribe un número válido');
    if (what === 'weight' && n !== '' && (n < 40 || n > 250)) return toast('Revisa el peso: debe estar en kg');
    editDay(view, d => { d[what] = n; });
    closeModal(); render(); toast('Guardado');
  },
  daydetail: el => dayModal(el.dataset.k),
  'goto-day': el => { view = el.dataset.k; closeModal(); setTab('today'); },
  plan: el => { const p = +el.dataset.plan; editWorkout(view, w => { w.plan = p; }); render(); },
  timer: el => startTimer(+el.dataset.sec, el.dataset.name),
  'timer-add': el => { Timer.end += +el.dataset.n * 1000; tick(); },
  'timer-stop': () => stopTimer(),
  meal: el => { mealSel = el.dataset.meal; render(); },
  preset: el => {
    const f = FOODS[+el.dataset.i];
    editFood(view, n => n.foods.push({ name: f[0], meal: mealSel, kcal: f[1], p: f[2], c: f[3], f: f[4] }));
    render(); toast(`${f[0]} → ${mealSel}`);
  },
  'food-custom': () => customFoodModal(),
  'food-save': () => {
    const p = +$('#fp').value || 0, c = +$('#fc').value || 0, f = +$('#ff').value || 0;
    const kcal = +$('#fk').value || Math.round(p * 4 + c * 4 + f * 9);
    editFood(view, n => n.foods.push({ name: $('#fn').value.trim() || 'Alimento', meal: mealSel, kcal, p, c, f }));
    closeModal(); render(); toast('Guardado');
  },
  'food-del': el => { editFood(view, n => n.foods.splice(+el.dataset.i, 1)); render(); },
  'food-repeat': () => {
    for (let i = 1; i <= 7; i++) {
      const k = addDays(view, -i), src = state.nutrition[k];
      if (src && src.foods && src.foods.length) { editFood(view, n => n.foods.push(...clone(src.foods))); render(); return toast(`Copiado de ${fmtDay(k)}`); }
    }
    toast('No hay comidas en los últimos 7 días');
  },
  checkin: () => checkinModal(),
  'checkin-save': el => {
    const key = el.dataset.key;
    editCore(st => { st.weekly[key] = { waist: round(parseNum($('#cw').value) || 0, 1), photos: { front: $('#cp-front').checked, side: $('#cp-side').checked, back: $('#cp-back').checked }, notes: $('#cn').value.trim(), date: todayKey() }; });
    closeModal(); render(); toast('Check-in guardado');
  },
  apply: el => {
    const n = +el.dataset.n, dc = n > 0 ? 25 : -25, df = n > 0 ? 6 : -6;
    editCore(st => { st.settings.calories += n; st.settings.carbs += dc; st.settings.fat += df; });
    render(); toast(`Nuevo objetivo: ${S().calories} kcal · ${S().carbs} C / ${S().fat} G`);
  },
  'posing-timer': el => posingModal(+el.dataset.min),
  'posing-start': el => {
    const min = +el.dataset.min, k = todayKey();
    startTimer(min * 60, 'Posing', () => { editDay(k, d => { d.posing = Math.max(+d.posing || 0, 0) + min; }); toast(`Posing: +${min} min registrados`); if (!$('#modal').open) render(); });
  },
  'settings-save': () => {
    const date = $('#s-date').value, start = $('#s-start').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return toast('Elige la fecha de la competencia');
    editCore(st => {
      Object.assign(st.settings, { competitionDate: date, calories: +$('#s-kcal').value || st.settings.calories, protein: +$('#s-p').value || st.settings.protein,
        carbs: +$('#s-c').value || st.settings.carbs, fat: +$('#s-f').value || st.settings.fat, steps: +$('#s-steps').value || st.settings.steps,
        sleepTarget: parseNum($('#s-sleep').value) || st.settings.sleepTarget, cardioSessions: +$('#s-cs').value || st.settings.cardioSessions, cardioMinutes: +$('#s-cm').value || st.settings.cardioMinutes });
      if (/^\d{4}-\d{2}-\d{2}$/.test(start)) st.createdAt = start;
    });
    closeModal(); render(); toast('Ajustes guardados');
  },
  export: () => exportData(),
  reset: el => {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.textContent = 'Toca otra vez para borrar TODO'; setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.textContent = 'Borrar todo y empezar de cero'; } }, 4000); return; }
    const ids = new Set(localBucketIds());
    state = freshState(); state.resetAt = Date.now(); state.coreMod = Date.now();
    saveLocal(); schedule('core', 0); ids.forEach(id => schedule(id, 0));
    closeModal(); view = todayKey(); render(); toast('Datos borrados');
  }
};
const CHG = {
  set: el => {
    const { key, f } = el.dataset, j = +el.dataset.j, n = +el.dataset.n;
    editWorkout(view, w => { const x = w.log[key] || (w.log[key] = { sets: [] }); while (x.sets.length < n) x.sets.push({}); x.sets[j][f] = el.value.trim().replace(',', '.'); });
  },
  setdone: el => {
    const { key, name } = el.dataset, j = +el.dataset.j, n = +el.dataset.n, p = planOf(view);
    editWorkout(view, w => {
      const x = w.log[key] || (w.log[key] = { sets: [] }); while (x.sets.length < n) x.sets.push({});
      const s = x.sets[j]; s.done = el.checked;
      if (el.checked) { const last = lastSession(p, +key.split('_')[1], view), ls = last && last.sets[j]; if (!s.kg && ls && ls.kg) s.kg = ls.kg; if (!s.reps && ls && ls.reps) s.reps = ls.reps; }
    });
    el.closest('.set-row').classList.toggle('is-done', el.checked);
    const row = el.closest('.set-row'), w = state.workouts[view], s = w.log[key].sets[j];
    row.querySelectorAll('input[data-f]').forEach(i => { if (!i.value && s[i.dataset.f]) i.value = s[i.dataset.f]; });
    if (el.checked) {
      if (sessionDone(view) && doneSets(view) === totalSets(p)) { stopTimer(); toast('Entreno completo. Registra cardio si toca.'); }
      else if (view === todayKey()) startTimer(+el.dataset.rest, name);
    }
    const hdr = $('.section-title span'); if (hdr && p === dowOf(view)) hdr.textContent = `${doneSets(view)} / ${totalSets(p)} series`;
  },
  exnote: el => { const { key } = el.dataset, n = +el.dataset.n; editWorkout(view, w => { const x = w.log[key] || (w.log[key] = { sets: Array.from({ length: n }, () => ({})) }); x.note = el.value.trim(); }); },
  manual: el => { editWorkout(view, w => { w.manual = el.checked; }); toast(el.checked ? 'Entreno marcado como hecho' : 'Marca quitada'); },
  supp: el => { const k = el.dataset.k; editDay(view, d => { d.supp = { ...(d.supp || {}), [k]: el.checked }; }); },
  pose: el => { const i = el.dataset.i; editDay(todayKey(), d => { d.poses = { ...(d.poses || {}), [i]: el.checked }; }); },
  import: el => {
    const f = el.files && el.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result), now = Date.now(), st = normalize(data);
        for (const src of [st.daily, st.nutrition, st.workouts]) for (const k in src) src[k]._t = now;
        st.coreMod = now; st.resetAt = state.resetAt;
        state = st; saveLocal(); schedule('core', 0); localBucketIds().forEach(id => schedule(id, 0));
        closeModal(); render(); toast('Respaldo importado');
      } catch (e) { toast('Ese archivo no es un respaldo válido'); }
    };
    r.readAsText(f);
  }
};
async function exportData() {
  const data = JSON.stringify(state, null, 2), filename = `classic24-respaldo-${todayKey()}.json`;
  if (window.claude && typeof window.claude.use === 'function') {
    try {
      const dl = await window.claude.use('downloads');
      if (dl) { await dl.save({ filename, data }); toast('Respaldo guardado'); return; }
    } catch (e) { if (e && e.code === 'declined') return; }
  }
  if (EMBED) { toast('La descarga no está disponible aquí'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

document.addEventListener('click', e => {
  const tb = e.target.closest('[data-tab]');
  if (tb) { setTab(tb.dataset.tab); return; }
  const el = e.target.closest('[data-act]');
  if (el && !el.disabled && ACT[el.dataset.act]) ACT[el.dataset.act](el, e);
});
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && CHG[el.dataset.change]) CHG[el.dataset.change](el, e); });
$('#modal').addEventListener('click', e => { if (e.target === $('#modal')) closeModal(); });
$('#modal').addEventListener('close', () => { if (Cloud.deferred) render(); });
document.addEventListener('focusout', () => setTimeout(() => { if (Cloud.deferred) requestRender(); }, 60));
document.addEventListener('visibilitychange', () => {
  // Si la app estuvo abierta desde ayer, vuelve a "hoy" al regresar.
  if (document.visibilityState === 'visible' && view < todayKey() && !$('#modal').open && Date.now() - (window.__lastAct || 0) > 30 * 60e3) { view = todayKey(); render(); }
});
document.addEventListener('pointerdown', () => { window.__lastAct = Date.now(); });

if (!EMBED && 'serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
setSync('local');
saveLocal();
render();
initCloud();
