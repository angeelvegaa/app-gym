// Adaptador de persistencia. Hoy es localStorage; si algún día hace falta
// cambiar a IndexedDB, este es el único archivo que hay que tocar.

const KEYS = {
  sessions: 'gym.sessions',
  settings: 'gym.settings'
};

const SCHEMA_VERSION = 1;

function readRaw(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error(`storage: fallo al leer ${key}`, err);
    return null;
  }
}

function writeRaw(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`storage: fallo al guardar ${key}`, err);
    return false;
  }
}

export function loadSessions() {
  const data = readRaw(KEYS.sessions);
  if (!data) return { schemaVersion: SCHEMA_VERSION, sessions: {} };
  return data;
}

export function saveSessions(data) {
  return writeRaw(KEYS.sessions, { schemaVersion: SCHEMA_VERSION, sessions: data.sessions });
}

export function loadSettings() {
  const data = readRaw(KEYS.settings);
  if (!data) return null;
  return data;
}

export function saveSettings(settings) {
  return writeRaw(KEYS.settings, { schemaVersion: SCHEMA_VERSION, ...settings });
}

export function exportAll() {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    sessions: readRaw(KEYS.sessions),
    settings: readRaw(KEYS.settings)
  }, null, 2);
}

export function importAll(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object') throw new Error('JSON inválido');
  if (parsed.sessions) writeRaw(KEYS.sessions, parsed.sessions);
  if (parsed.settings) writeRaw(KEYS.settings, parsed.settings);
  return true;
}

export function wipeAll() {
  localStorage.removeItem(KEYS.sessions);
  localStorage.removeItem(KEYS.settings);
}
