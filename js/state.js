// CRUD de sesiones, ajustes y rutinas guardadas, sobre el adaptador de
// storage.js. Cada dispositivo tiene sus propias rutinas: no hay nada
// compartido ni sincronizado entre instalaciones.

import * as storage from './storage.js';
import { LEGACY_MIGRATION_PLAN } from './plan.js';
import { getBlockPosition, nextMonday, todayStr } from './schedule.js';

let _settings = null;
let _sessions = null;
let _plans = null;

function ensurePlans() {
  if (_plans !== null) return;
  const loaded = storage.loadPlans();
  if (loaded && loaded.plans && Object.keys(loaded.plans).length) {
    _plans = loaded;
    return;
  }

  const existingSessions = storage.loadSessions().sessions || {};
  if (Object.keys(existingSessions).length > 0) {
    // Dispositivo con historial de antes de tener rutinas guardadas en la
    // app: migra su plan fijo de entonces como su primera rutina, con los
    // mismos ids de día/ejercicio que ya usan sus sesiones, sin preguntar.
    _plans = {
      plans: { [LEGACY_MIGRATION_PLAN.version]: LEGACY_MIGRATION_PLAN },
      activeVersion: LEGACY_MIGRATION_PLAN.version,
      nextVersion: LEGACY_MIGRATION_PLAN.version + 1
    };
    storage.savePlans(_plans);
  } else {
    // Dispositivo nuevo de verdad: sin rutinas todavía. app.js muestra el
    // onboarding hasta que se cree o elija una.
    _plans = { plans: {}, activeVersion: null, nextVersion: 1 };
  }
}

function persistPlans() {
  storage.savePlans({ plans: _plans.plans, activeVersion: _plans.activeVersion, nextVersion: _plans.nextVersion });
}

function defaultSettings() {
  ensurePlans();
  const weekdays = {};
  const active = _plans.activeVersion != null ? _plans.plans[_plans.activeVersion] : null;
  if (active) active.days.forEach(d => { weekdays[d.id] = d.weekday; });
  return {
    phase: 'definicion',
    blockStart: nextMonday(),
    weekdays
  };
}

function ensureLoaded() {
  ensurePlans();
  if (_settings === null) {
    const loaded = storage.loadSettings();
    const defaults = defaultSettings();
    // `weekdays` se fusiona aparte (no solo el nivel superior): si cambias
    // de rutina activa y la nueva añade un día, necesita su día de la
    // semana por defecto aunque ya tuvieras ajustes guardados de otra —
    // si no, ese día nunca se encontraría en la pantalla Hoy.
    _settings = loaded
      ? { ...defaults, ...loaded, weekdays: { ...defaults.weekdays, ...loaded.weekdays } }
      : defaults;
  }
  if (_sessions === null) {
    _sessions = storage.loadSessions().sessions || {};
  }
}

// Limpia la caché en memoria (tras importar un backup o borrar todo), para
// que la próxima lectura recoja lo que se acaba de escribir en storage.
export function resetCache() {
  _settings = null;
  _sessions = null;
  _plans = null;
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

// --- Rutinas guardadas ---

function slugify(text) {
  return (text || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

// Da id estable a cada día/ejercicio de un borrador de rutina (a partir de
// su nombre), evitando choques dentro del mismo plan.
function assignIds(days) {
  const usedDayIds = new Set();
  return days.map(day => {
    let dayId = day.id || slugify(day.name);
    let base = dayId, n = 2;
    while (usedDayIds.has(dayId)) dayId = `${base}-${n++}`;
    usedDayIds.add(dayId);

    const usedExIds = new Set();
    const withId = (item) => {
      let id = item.id || slugify(item.name);
      let b = id, m = 2;
      while (usedExIds.has(id)) id = `${b}-${m++}`;
      usedExIds.add(id);
      return { ...item, id };
    };

    return {
      ...day,
      id: dayId,
      warmup: (day.warmup || []).map(withId),
      exercises: (day.exercises || []).map(withId)
    };
  });
}

export function hasAnyPlan() {
  ensurePlans();
  return _plans.activeVersion != null;
}

export function getActivePlanVersion() {
  ensurePlans();
  return _plans.activeVersion;
}

export function getActivePlan() {
  ensurePlans();
  return _plans.activeVersion != null ? _plans.plans[_plans.activeVersion] : null;
}

// Sin version, devuelve la rutina activa.
export function getPlan(version) {
  ensurePlans();
  const v = version ?? _plans.activeVersion;
  return (v != null && _plans.plans[v]) || null;
}

export function getAllPlans() {
  ensurePlans();
  return Object.values(_plans.plans).sort((a, b) => b.version - a.version);
}

export function getAllPlanVersions() {
  return getAllPlans().map(p => p.version);
}

export function getDayById(dayId, version) {
  const plan = getPlan(version);
  return (plan && plan.days.find(d => d.id === dayId)) || null;
}

// Todos los ejercicios de cualquier rutina guardada en este dispositivo,
// para el selector de Progreso: así se sigue consultando el histórico de un
// ejercicio aunque ya no esté en la rutina activa. Si el mismo id aparece
// en varias rutinas, se usa la definición de la más reciente.
export function getAllKnownExercises() {
  const map = new Map();
  getAllPlans().slice().reverse().forEach(plan => {
    plan.days.forEach(day => {
      day.exercises.forEach(ex => {
        map.set(ex.id, { ...ex, dayName: day.name, planVersion: plan.version });
      });
    });
  });
  return [...map.values()];
}

// Backfill de días de la semana para los días de `plan`, sin perder
// reasignaciones que ya tuvieras para ids que coincidan.
function mergeWeekdaysFor(plan) {
  const defaults = {};
  plan.days.forEach(d => { defaults[d.id] = d.weekday; });
  _settings = { ..._settings, weekdays: { ...defaults, ...(_settings.weekdays || {}) } };
  storage.saveSettings(_settings);
}

// Crea una rutina nueva a partir de un borrador { name, description?, days }
// (sin ids todavía; se asignan aquí). Si es la primera rutina del
// dispositivo, se activa sola. Devuelve su version.
export function createPlan({ name, description, days }) {
  ensureLoaded();
  const version = _plans.nextVersion;
  const plan = { version, name: (name || '').trim() || `Rutina ${version}`, days: assignIds(days) };
  if (description) plan.description = description;
  _plans.plans[version] = plan;
  _plans.nextVersion = version + 1;
  persistPlans();
  if (_plans.activeVersion == null) setActivePlanVersion(version);
  return version;
}

// Sustituye el contenido de una rutina ya existente (mismo version).
export function updatePlan(version, { name, description, days }) {
  ensureLoaded();
  if (!_plans.plans[version]) throw new Error(`Rutina desconocida: ${version}`);
  const plan = { version, name: (name || '').trim() || `Rutina ${version}`, days: assignIds(days) };
  if (description) plan.description = description;
  _plans.plans[version] = plan;
  persistPlans();
  if (_plans.activeVersion === version) mergeWeekdaysFor(plan);
}

// Cambia cuál es la rutina activa (la que se usa para registrar entrenos
// nuevos). No toca ni reescribe el histórico ya guardado.
export function setActivePlanVersion(version) {
  ensureLoaded();
  if (!_plans.plans[version]) throw new Error(`Rutina desconocida: ${version}`);
  _plans.activeVersion = version;
  persistPlans();
  mergeWeekdaysFor(_plans.plans[version]);
}

export function deletePlan(version) {
  ensureLoaded();
  if (_plans.activeVersion === version) throw new Error('No se puede borrar la rutina activa.');
  delete _plans.plans[version];
  persistPlans();
}

function emptyEntryFor(exercise) {
  if (exercise.type === 'checkbox' || exercise.type === 'warmup') {
    return { done: false, weight: null };
  }
  return {
    sets: Array.from({ length: exercise.sets }, () => ({ status: 'pending', weight: null, reps: null, rpe: null })),
    rpe: null,
    note: null
  };
}

// Crea (si no existe) y devuelve la sesión de una fecha+día concretos, con
// la rutina ACTIVA en ese momento.
export function getOrCreateSession(dateStr, dayId) {
  ensureLoaded();
  const id = sessionIdFor(dateStr, dayId);
  if (_sessions[id]) return _sessions[id];

  const activePlan = getActivePlan();
  if (!activePlan) throw new Error('No hay ninguna rutina activa.');
  const day = activePlan.days.find(d => d.id === dayId);
  if (!day) throw new Error(`Día desconocido: ${dayId}`);

  const { block, weekInBlock } = getBlockPosition(dateStr, _settings.blockStart);

  const entries = {};
  day.warmup.forEach(w => { entries[w.id] = emptyEntryFor(w); });
  day.exercises.forEach(e => { entries[e.id] = emptyEntryFor(e); });

  const session = {
    id,
    date: dateStr,
    dayId,
    planVersion: activePlan.version,
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
  const activePlan = getActivePlan();
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const skipped = [];
  const keptExisting = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = todayStr(d);
    const weekday = d.getDay();
    const day = activePlan.days.find(pd => _settings.weekdays[pd.id] === weekday);
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
