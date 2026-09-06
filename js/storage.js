// Adaptador de persistencia. Hoy es localStorage; si algún día hace falta
// cambiar a IndexedDB, este es el único archivo que hay que tocar.

const KEYS = {
  sessions: 'gym.sessions',
  settings: 'gym.settings',
  plans: 'gym.plans',
  weekBannerShown: 'gym.weekBannerShown'
};

// Claves que la copia en la nube (sync.js) puede sincronizar. Vive aquí, no
// en sync.js, para que no haya dos sitios con la lista de nombres de clave.
export const SYNCED_KEYS = [KEYS.sessions, KEYS.settings, KEYS.plans];

const SCHEMA_VERSION = 1;

// Sin sync.js activo estas listas están vacías y no cuesta nada: solo se
// suscribe alguien cuando la persona activa la copia en la nube.
const writeListeners = [];
const wipeListeners = [];

export function onWrite(fn) {
  writeListeners.push(fn);
  return () => {
    const i = writeListeners.indexOf(fn);
    if (i >= 0) writeListeners.splice(i, 1);
  };
}

export function onWipe(fn) {
  wipeListeners.push(fn);
  return () => {
    const i = wipeListeners.indexOf(fn);
    if (i >= 0) wipeListeners.splice(i, 1);
  };
}

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
    writeListeners.forEach(fn => fn(key));
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

// Rutinas guardadas en este dispositivo: { schemaVersion, plans: {v: planObj},
// activeVersion, nextVersion }. Cada dispositivo tiene las suyas, sin sincronizar.
export function loadPlans() {
  const data = readRaw(KEYS.plans);
  if (!data) return null;
  return data;
}

export function savePlans(data) {
  return writeRaw(KEYS.plans, { schemaVersion: SCHEMA_VERSION, ...data });
}

export function exportAll() {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    sessions: readRaw(KEYS.sessions),
    settings: readRaw(KEYS.settings),
    plans: readRaw(KEYS.plans)
  }, null, 2);
}

export function importAll(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object') throw new Error('JSON inválido');
  if (parsed.sessions) writeRaw(KEYS.sessions, parsed.sessions);
  if (parsed.settings) writeRaw(KEYS.settings, parsed.settings);
  if (parsed.plans) writeRaw(KEYS.plans, parsed.plans);
  return true;
}

// 'YYYY-MM-DD' de la última vez que se mostró el aviso de cambio de semana,
// para no repetirlo más de una vez el mismo día (raw, sin envolver: no hace
// falta versionar un simple string suelto).
export function loadWeekBannerShownDate() {
  return readRaw(KEYS.weekBannerShown);
}

export function saveWeekBannerShownDate(dateStr) {
  return writeRaw(KEYS.weekBannerShown, dateStr);
}

export function wipeAll() {
  localStorage.removeItem(KEYS.sessions);
  localStorage.removeItem(KEYS.settings);
  localStorage.removeItem(KEYS.plans);
  localStorage.removeItem(KEYS.weekBannerShown);
  wipeListeners.forEach(fn => fn());
}
