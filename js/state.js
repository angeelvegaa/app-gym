// CRUD de sesiones y ajustes, sobre el adaptador de storage.js.

import * as storage from './storage.js';
import { PLAN, getDayById } from './plan.js';
import { getBlockPosition, nextMonday, todayStr } from './schedule.js';

function defaultSettings() {
  const weekdays = {};
  PLAN.days.forEach(d => { weekdays[d.id] = d.weekday; });
  return {
    phase: 'definicion',
    blockStart: nextMonday(),
    weekdays
  };
}

let _settings = null;
let _sessions = null;

function ensureLoaded() {
  if (_settings === null) {
    const loaded = storage.loadSettings();
    const defaults = defaultSettings();
    // `weekdays` se fusiona aparte (no solo el nivel superior): si cambias
    // de plan y el nuevo añade un día, necesita su día de la semana por
    // defecto aunque ya tuvieras ajustes guardados de un plan anterior —
    // si no, ese día nunca se encontraría en la pantalla Hoy.
    _settings = loaded
      ? { ...defaults, ...loaded, weekdays: { ...defaults.weekdays, ...loaded.weekdays } }
      : defaults;
  }
  if (_sessions === null) {
    _sessions = storage.loadSessions().sessions || {};
  }
}

export function getSettings() {
  ensureLoaded();
  return _settings;
}

export function updateSettings(patch) {
  ensureLoaded();
  _settings = { ..._settings, ...patch };
  storage.saveSettings(_settings);
  return _settings;
}

function persistSessions() {
  storage.saveSessions({ sessions: _sessions });
}

export function getSession(sessionId) {
  ensureLoaded();
  return _sessions[sessionId] || null;
}

export function getAllSessions() {
  ensureLoaded();
  return _sessions;
}

export function sessionIdFor(dateStr, dayId) {
  return `${dateStr}_${dayId}`;
}

function emptyEntryFor(exercise) {
  if (exercise.type === 'checkbox' || exercise.type === 'warmup') {
    return { done: false, weight: null };
  }
  return {
    sets: Array.from({ length: exercise.sets }, () => ({ status: 'pending', weight: null, reps: null })),
    rpe: null
  };
}

// Crea (si no existe) y devuelve la sesión de una fecha+día concretos.
export function getOrCreateSession(dateStr, dayId) {
  ensureLoaded();
  const id = sessionIdFor(dateStr, dayId);
  if (_sessions[id]) return _sessions[id];

  const day = getDayById(dayId);
  if (!day) throw new Error(`Día desconocido: ${dayId}`);

  const { block, weekInBlock } = getBlockPosition(dateStr, _settings.blockStart);

  const entries = {};
  day.warmup.forEach(w => { entries[w.id] = emptyEntryFor(w); });
  day.exercises.forEach(e => { entries[e.id] = emptyEntryFor(e); });

  const session = {
    id,
    date: dateStr,
    dayId,
    planVersion: PLAN.version,
    block,
    weekInBlock,
    phase: _settings.phase,
    status: 'pending',
    entries,
    reason: null // motivo (skipped) o nota corta (partial)
  };

  _sessions[id] = session;
  persistSessions();
  return session;
}

export function updateEntry(sessionId, exerciseId, patchFn) {
  ensureLoaded();
  const session = _sessions[sessionId];
  if (!session) throw new Error(`Sesión desconocida: ${sessionId}`);
  const entry = session.entries[exerciseId];
  patchFn(entry);
  if (session.status === 'pending') session.status = 'in_progress';
  persistSessions();
  return session;
}

// reason: undefined = no tocar el motivo ya guardado; null o string = sobrescribirlo.
export function setSessionStatus(sessionId, status, reason = undefined) {
  ensureLoaded();
  const session = _sessions[sessionId];
  if (!session) throw new Error(`Sesión desconocida: ${sessionId}`);
  session.status = status;
  if (reason !== undefined) session.reason = reason || null;
  persistSessions();
  return session;
}

// Marca un día como "no entrenado" sin necesidad de abrir el entreno.
export function markDaySkipped(dateStr, dayId, reason = null) {
  const session = getOrCreateSession(dateStr, dayId);
  return setSessionStatus(session.id, 'skipped', reason);
}

function rangeDays(startDateStr, endDateStr) {
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const skipped = [];
  const keptExisting = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = todayStr(d);
    const weekday = d.getDay();
    const day = PLAN.days.find(pd => _settings.weekdays[pd.id] === weekday);
    if (!day) continue; // ese día de la semana no toca entrenar

    const id = sessionIdFor(dateStr, day.id);
    const existing = _sessions[id];
    const hasRealProgress = existing && !['pending', 'skipped'].includes(existing.status);
    if (hasRealProgress) {
      keptExisting.push({ date: dateStr, dayId: day.id, dayName: day.name });
    } else {
      skipped.push({ date: dateStr, dayId: day.id, dayName: day.name });
    }
  }
  return { skipped, keptExisting };
}

// Solo lectura: calcula qué días del rango [start, end] se marcarían como
// no entrenado y cuáles se dejarían tal cual por tener progreso ya
// registrado (in_progress, completed o partial), sin escribir nada
// todavía. Pensado para confirmar antes de aplicar con applyRangeSkipped.
export function previewRangeSkipped(startDateStr, endDateStr) {
  ensureLoaded();
  return rangeDays(startDateStr, endDateStr);
}

// Marca como "no entrenado" todos los días que tocaba entrenar (según los
// días de la semana configurados) dentro de un rango de fechas [start, end]
// inclusive, con un motivo común para todo el rango. No pisa sesiones que
// ya tengan progreso real (in_progress, completed o partial) — solo crea o
// actualiza huecos pendientes o ya saltados.
export function applyRangeSkipped(startDateStr, endDateStr, reason = null) {
  ensureLoaded();
  const { skipped, keptExisting } = rangeDays(startDateStr, endDateStr);
  skipped.forEach(({ date, dayId }) => {
    const session = getOrCreateSession(date, dayId);
    setSessionStatus(session.id, 'skipped', reason);
  });
  return { skipped, keptExisting };
}

// Elimina una sesión del histórico. No afecta al resto de sesiones.
export function deleteSession(sessionId) {
  ensureLoaded();
  if (!_sessions[sessionId]) return false;
  delete _sessions[sessionId];
  persistSessions();
  return true;
}

// Todas las sesiones de un ejercicio dado, ordenadas por fecha ascendente.
// Incluye las sesiones "skipped" como marcador de hueco (sin datos de series)
// y marca las "partial" (no seguidas al 100%) aparte: sí conservan sus datos
// reales (para verlos en el gráfico/histórico) pero quedan señaladas para
// que getSuggestions las excluya de las reglas de progresión igual que un
// hueco, sin tratarlas como una sesión de confianza completa.
export function getExerciseHistory(exerciseId) {
  ensureLoaded();
  return Object.values(_sessions)
    .filter(s => s.entries[exerciseId] && s.entries[exerciseId].sets)
    .filter(s => s.status === 'skipped' || s.entries[exerciseId].sets.some(set => set.status === 'done'))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({
      date: s.date,
      block: s.block,
      weekInBlock: s.weekInBlock,
      phase: s.phase,
      skipped: s.status === 'skipped',
      partial: s.status === 'partial',
      ...s.entries[exerciseId]
    }));
}

export function getSessionsSorted() {
  ensureLoaded();
  return Object.values(_sessions).sort((a, b) => b.date.localeCompare(a.date));
}
