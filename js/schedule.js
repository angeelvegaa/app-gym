// Puro: fecha -> posición en el bloque de 4 semanas, y ajuste de RPE objetivo.
// Sin estado, fácil de verificar a mano.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const WEEK_TYPES = {
  1: { label: 'Volumen base', rpeShift: -1 },
  2: { label: 'Subida', rpeShift: 0 },
  3: { label: 'Pico', rpeShift: 1 },
  4: { label: 'Deload', rpeShift: -2 }
};

function toDateOnly(dateStr) {
  // dateStr 'YYYY-MM-DD' -> epoch UTC del día, para restar fechas sin que el
  // cambio de hora (DST) meta o quite una hora entre medias y descuadre el
  // recuento de días (con new Date(y, m-1, d) local, cruzar el cambio de
  // primavera restaba 1h de más y el floor() perdía un día entero).
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// blockStart: 'YYYY-MM-DD' (debe ser un lunes). date: 'YYYY-MM-DD'.
export function getBlockPosition(dateStr, blockStartStr) {
  const date = toDateOnly(dateStr);
  const start = toDateOnly(blockStartStr);
  const diffDays = Math.floor((date - start) / DAY_MS);
  // Antes de que arranque el bloque configurado, se muestra como semana 1
  // en vez de envolver a un "deload" negativo que confundiría en Ajustes.
  if (diffDays < 0) return { block: 1, weekInBlock: 1 };
  const weeksSinceStart = Math.floor(diffDays / 7);
  const block = Math.floor(weeksSinceStart / 4) + 1;
  const weekInBlock = (weeksSinceStart % 4) + 1;
  return { block, weekInBlock };
}

export function getWeekType(weekInBlock) {
  return WEEK_TYPES[weekInBlock] || WEEK_TYPES[1];
}

// baseRpe puede ser .5 (p.ej. 7.5); se limita siempre a [4, 10].
export function getTargetRpe(baseRpe, weekInBlock) {
  const shift = getWeekType(weekInBlock).rpeShift;
  const value = baseRpe + shift;
  return Math.min(10, Math.max(4, value));
}

// En deload (semana 4) se sugiere una serie menos, mínimo 2.
export function getSuggestedSets(baseSets, weekInBlock) {
  if (weekInBlock === 4) return Math.max(2, baseSets - 1);
  return baseSets;
}

export function isDeloadWeek(weekInBlock) {
  return weekInBlock === 4;
}

const WEEK_BANNER_MESSAGES = {
  1: 'Empieza el bloque — volumen base',
  2: 'Semana 2 — toca apretar un poco más',
  3: 'Semana 3 — semana de pico, dale caña',
  4: 'Semana 4 — deload, toca bajar el ritmo'
};

export function getWeekBannerMessage(weekInBlock) {
  return WEEK_BANNER_MESSAGES[weekInBlock] || WEEK_BANNER_MESSAGES[1];
}

// true solo el día exacto en que arranca una semana nueva del bloque (el
// propio día de inicio del bloque incluido), para disparar el aviso una vez.
export function isWeekChangeDay(dateStr, blockStartStr) {
  const date = toDateOnly(dateStr);
  const start = toDateOnly(blockStartStr);
  const diffDays = Math.floor((date - start) / DAY_MS);
  return diffDays >= 0 && diffDays % 7 === 0;
}

// Próximo lunes a partir de hoy (o el propio hoy si ya es lunes).
export function nextMonday(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=domingo ... 1=lunes
  const diff = (8 - day) % 7; // días hasta el próximo lunes
  d.setDate(d.getDate() + (day === 1 ? 0 : diff));
  return todayStr(d);
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// 'YYYY-MM-DD' -> 'YYYY-MM', para agrupar sesiones por mes calendario.
export function monthKeyOf(dateStr) {
  return dateStr.slice(0, 7);
}

// 'YYYY-MM' -> 'Agosto 2026'.
export function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

// Clave estable para agrupar por semana de bloque, p.ej. "1-2" = bloque 1, semana 2.
export function weekKeyOf(session) {
  return `${session.block}-${session.weekInBlock}`;
}
