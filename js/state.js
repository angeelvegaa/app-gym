// CRUD de sesiones y ajustes, sobre el adaptador de storage.js.

import * as storage from './storage.js';
import { PLAN, getDayById } from './plan.js';
import { getBlockPosition, nextMonday } from './schedule.js';

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
    _settings = loaded ? { ...defaultSettings(), ...loaded } : defaultSettings();
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
    notes: ''
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

export function setSessionStatus(sessionId, status) {
  ensureLoaded();
  const session = _sessions[sessionId];
  if (!session) throw new Error(`Sesión desconocida: ${sessionId}`);
  session.status = status;
  persistSessions();
  return session;
}

// Marca un día como "no entrenado" sin necesidad de abrir el entreno.
export function markDaySkipped(dateStr, dayId) {
  const session = getOrCreateSession(dateStr, dayId);
  return setSessionStatus(session.id, 'skipped');
}

// Todas las sesiones completadas/en curso de un ejercicio dado, ordenadas por fecha ascendente.
export function getExerciseHistory(exerciseId) {
  ensureLoaded();
  return Object.values(_sessions)
    .filter(s => s.status !== 'skipped' && s.entries[exerciseId] && s.entries[exerciseId].sets)
    .filter(s => s.entries[exerciseId].sets.some(set => set.status === 'done'))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({
      date: s.date,
      block: s.block,
      weekInBlock: s.weekInBlock,
      phase: s.phase,
      ...s.entries[exerciseId]
    }));
}

export function getSessionsSorted() {
  ensureLoaded();
  return Object.values(_sessions).sort((a, b) => b.date.localeCompare(a.date));
}
