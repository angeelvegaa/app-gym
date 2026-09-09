// Vista de solo lectura, en texto plano, de los datos LOCALES de este
// dispositivo — pensada para que la lea una automatización externa (p. ej.
// un Atajo de iPhone), no una persona. Se activa solo con ?autoexport=1 en
// la URL (ver app.js: sin ese parámetro la app no cambia nada). Es una
// transformación pura sobre lo que ya devuelve state.js (misma fuente que
// usa el resto de la app): no toca la copia en la nube ni el cifrado, y no
// hace ninguna llamada de red.

import * as state from './state.js';
import { PHASE_LABELS } from './plan.js';
import { todayStr, getBlockPosition, getWeekType } from './schedule.js';

// ~5 semanas: de sobra para un resumen mensual sin cargar el histórico entero.
const EXPORT_WINDOW_DAYS = 34;

const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const STATUS_LABELS = {
  completed: 'Completado',
  partial: 'No al 100%',
  in_progress: 'A medias',
  pending: 'Sin empezar',
  skipped: 'No entrenado'
};

function weekdayName(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return WEEKDAY_NAMES[new Date(y, m - 1, d).getDay()];
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return todayStr(date);
}

function statusLabel(session) {
  if (session.status === 'skipped' && session.reason) return session.reason;
  return STATUS_LABELS[session.status] || session.status;
}

function formatSet(set, exercise) {
  if (set.status !== 'done') return null;
  const repUnit = exercise.repUnit || '';
  const reps = set.reps != null ? `${set.reps}${repUnit}` : '?';
  if (exercise.bodyweight) return reps;
  const weight = set.weight != null ? `${set.weight}${exercise.unit || 'kg'}` : '?';
  return `${weight}x${reps}`;
}

// Una línea legible por ejercicio ("Press banca: 60kgx8, 60kgx8 (RPE 7)"),
// o null si no aporta información (p. ej. serie sin registrar todavía).
function formatEntryLine(exercise, entry) {
  if (!entry) return null;
  if (exercise.type === 'checkbox' || exercise.type === 'warmup') {
    return `${exercise.name}: ${entry.done ? 'hecho' : 'no hecho'}`;
  }
  const sets = (entry.sets || []).map(s => formatSet(s, exercise)).filter(Boolean);
  if (!sets.length) return null;
  let line = `${exercise.name}: ${sets.join(', ')}`;
  if (entry.rpe != null) line += ` (RPE ${entry.rpe})`;
  if (entry.note) line += ` — nota: "${entry.note}"`;
  return line;
}

function formatSession(session) {
  const day = state.getPlan(session.planVersion)?.days.find(d => d.id === session.dayId);
  const dayName = day?.name || session.dayId;
  const header = `${session.date} (${weekdayName(session.date)}) — ${dayName} — ${statusLabel(session)}`;

  if (session.status === 'skipped' || session.status === 'pending' || !day) return header;

  const lines = [...day.warmup, ...day.exercises]
    .map(ex => formatEntryLine(ex, session.entries[ex.id]))
    .filter(Boolean)
    .map(line => `  ${line}`);

  return lines.length ? `${header}\n${lines.join('\n')}` : header;
}

function sessionVolume(session) {
  let vol = 0;
  Object.values(session.entries).forEach(entry => {
    if (!entry.sets) return;
    entry.sets.forEach(s => {
      if (s.status === 'done' && s.weight != null && s.reps != null) vol += s.weight * s.reps;
    });
  });
  return vol;
}

export function buildAutoExportText(now = new Date()) {
  const nowStr = todayStr(now);
  const cutoffStr = addDays(nowStr, -EXPORT_WINDOW_DAYS);

  const settings = state.getSettings();
  const plan = state.getActivePlan();
  const sessions = state.getSessionsSorted().filter(s => s.date >= cutoffStr); // desc por fecha

  const counts = {};
  let totalVolume = 0;
  sessions.forEach(s => {
    counts[s.status] = (counts[s.status] || 0) + 1;
    totalVolume += sessionVolume(s);
  });
  const summary = Object.entries(counts)
    .map(([k, v]) => `${v} ${STATUS_LABELS[k] || k}`)
    .join(', ');

  const lines = [];
  lines.push('=== GYM TRACK — EXPORT AUTOMÁTICO (SOLO LECTURA, DATOS LOCALES) ===');
  lines.push(`Generado: ${now.toISOString()}`);
  lines.push(`Rango: ${cutoffStr} a ${nowStr} (${Math.round(EXPORT_WINDOW_DAYS / 7)} semanas)`);

  if (plan) {
    lines.push(`Rutina activa: ${plan.name} (v${plan.version}) — Fase: ${PHASE_LABELS[settings.phase] || settings.phase}`);
    const pos = getBlockPosition(nowStr, settings.blockStart);
    lines.push(`Posición en el bloque: bloque ${pos.block}, semana ${pos.weekInBlock} de 4 (${getWeekType(pos.weekInBlock).label})`);
  } else {
    lines.push('Sin rutina configurada en este dispositivo.');
  }

  lines.push('');
  lines.push('RESUMEN');
  lines.push(`- Sesiones registradas: ${sessions.length}${summary ? ` (${summary})` : ''}`);
  lines.push(`- Volumen total (peso x reps, solo series completadas): ${Math.round(totalVolume)}kg`);
  lines.push('');

  if (!sessions.length) {
    lines.push('Sin sesiones registradas en este periodo.');
  } else {
    lines.push('SESIONES (de más reciente a más antigua)');
    lines.push('');
    sessions.forEach(s => {
      lines.push(formatSession(s));
      lines.push('');
    });
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function isAutoExportRequested(search = location.search) {
  return new URLSearchParams(search).get('autoexport') === '1';
}

// Sustituye TODO el contenido de la página por el texto plano: sin estilos,
// sin JS interactivo, para que una automatización lo lea directo.
export function renderAutoExport(target) {
  target.textContent = '';
  const pre = document.createElement('pre');
  // textContent, nunca innerHTML: las notas de entreno son texto libre del
  // usuario y no deben interpretarse como marcado.
  pre.textContent = buildAutoExportText();
  target.appendChild(pre);
}
