import { el, clear, toast } from './components.js';
import * as state from '../state.js';
import { monthKeyOf, monthLabel, weekKeyOf } from '../schedule.js';

const { getDayById } = state;

// label = lo que se ve en la fila/badge. Para 'skipped' se sustituye por el
// motivo si existe (p. ej. "Viaje a Roma" en vez de "No entrenado").
const STATUS_META = {
  completed: { badge: 'Completado', singular: 'completado', plural: 'completados' },
  partial: { badge: 'No al 100%', singular: 'no al 100%', plural: 'no al 100%' },
  in_progress: { badge: 'A medias', singular: 'a medias', plural: 'a medias' },
  pending: { badge: 'Sin empezar', singular: 'sin empezar', plural: 'sin empezar' },
  skipped: { badge: 'No entrenado', singular: 'no entrenado', plural: 'no entrenados' }
};

function statusLabel(session) {
  if (session.status === 'skipped') return session.reason || STATUS_META.skipped.badge;
  return STATUS_META[session.status]?.badge || session.status;
}

// "3 completados · 1 no al 100% · 2 no entrenados", salvo que TODOS los
// saltados de un grupo compartan el mismo motivo — en ese caso se usa el
// motivo en vez de la etiqueta genérica también en el resumen ("2 Viaje a
// Roma" en vez de "2 no entrenados"), tal como en el listado de días.
function summarize(sessions) {
  const counts = {};
  sessions.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });

  const skippedSessions = sessions.filter(s => s.status === 'skipped');
  const skippedReasons = new Set(skippedSessions.map(s => s.reason || null));
  const commonSkippedReason = skippedReasons.size === 1 ? [...skippedReasons][0] : null;

  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => {
      if (k === 'skipped' && commonSkippedReason) return `${v} ${commonSkippedReason}`;
      return `${v} ${v === 1 ? STATUS_META[k]?.singular ?? k : STATUS_META[k]?.plural ?? k}`;
    })
    .join(' · ');
}

function sessionVolume(session) {
  let vol = 0;
  Object.values(session.entries).forEach(entry => {
    if (!entry.sets) return;
    entry.sets.forEach(s => {
      if (s.status === 'done' && s.weight != null && s.reps != null) vol += s.weight * s.reps;
    });
  });
  return Math.round(vol);
}

function emptyState(root, text) {
  root.appendChild(el('p', { class: 'muted', text }));
}

// Nivel 1: meses.
export function renderHistoryMonths(root, navigate) {
  clear(root);
  root.appendChild(el('h2', { text: 'Historial' }));

  const sessions = state.getSessionsSorted(); // desc por fecha
  if (!sessions.length) {
    emptyState(root, 'Todavía no hay entrenos registrados.');
    return;
  }

  const months = {};
  sessions.forEach(s => {
    const mk = monthKeyOf(s.date);
    (months[mk] = months[mk] || []).push(s);
  });
  const monthKeys = Object.keys(months).sort((a, b) => b.localeCompare(a));

  monthKeys.forEach(mk => {
    const list = months[mk];
    root.appendChild(el('button', {
      class: 'history-row',
      type: 'button',
      onClick: () => navigate(`#/history/${mk}`)
    }, [
      el('div', { class: 'history-row-main' }, [
        el('span', { class: 'history-day', text: monthLabel(mk) }),
        el('span', { class: 'history-date', text: `${list.length} entreno${list.length === 1 ? '' : 's'}` })
      ]),
      el('div', { class: 'history-row-meta' }, [
        el('span', { class: 'muted', text: summarize(list) })
      ])
    ]));
  });
}

// Nivel 2: semanas de bloque dentro de un mes.
export function renderHistoryWeeks(root, navigate, monthKey) {
  clear(root);
  const sessions = state.getSessionsSorted().filter(s => monthKeyOf(s.date) === monthKey);

  root.appendChild(el('div', { class: 'session-header' }, [
    el('button', { class: 'btn btn--ghost btn--small', text: '← Historial', onClick: () => navigate('#/history') }),
    el('h2', { text: monthLabel(monthKey) })
  ]));

  if (!sessions.length) {
    emptyState(root, 'Sin entrenos este mes.');
    return;
  }

  const weeks = {};
  sessions.forEach(s => {
    const wk = weekKeyOf(s);
    (weeks[wk] = weeks[wk] || []).push(s);
  });
  // Semanas ordenadas por la fecha más reciente de sus sesiones, descendente.
  const weekKeys = Object.keys(weeks).sort((a, b) => {
    const maxA = weeks[a].reduce((m, s) => (s.date > m ? s.date : m), '');
    const maxB = weeks[b].reduce((m, s) => (s.date > m ? s.date : m), '');
    return maxB.localeCompare(maxA);
  });

  weekKeys.forEach(wk => {
    const list = weeks[wk];
    const [block, weekInBlock] = wk.split('-');
    root.appendChild(el('button', {
      class: 'history-row',
      type: 'button',
      onClick: () => navigate(`#/history/${monthKey}/${wk}`)
    }, [
      el('div', { class: 'history-row-main' }, [
        el('span', { class: 'history-day', text: `Semana ${weekInBlock} de 4` }),
        el('span', { class: 'history-date', text: `Bloque ${block}` })
      ]),
      el('div', { class: 'history-row-meta' }, [
        el('span', { class: 'muted', text: summarize(list) })
      ])
    ]));
  });
}

// Nivel 3: días de esa semana.
export function renderHistoryDays(root, navigate, monthKey, weekKey) {
  clear(root);
  const [block, weekInBlock] = weekKey.split('-');
  const sessions = state.getSessionsSorted().filter(s => monthKeyOf(s.date) === monthKey && weekKeyOf(s) === weekKey);

  root.appendChild(el('div', { class: 'session-header' }, [
    el('button', { class: 'btn btn--ghost btn--small', text: `← ${monthLabel(monthKey)}`, onClick: () => navigate(`#/history/${monthKey}`) }),
    el('h2', { text: `Semana ${weekInBlock} de 4` }),
    el('p', { class: 'muted', text: `Bloque ${block}` })
  ]));

  if (!sessions.length) {
    emptyState(root, 'Sin entrenos esta semana.');
    return;
  }

  sessions.forEach(session => {
    const day = getDayById(session.dayId, session.planVersion);
    root.appendChild(el('button', {
      class: `history-row history-row--${session.status}`,
      type: 'button',
      onClick: () => navigate(`#/session-detail/${session.id}`)
    }, [
      el('div', { class: 'history-row-main' }, [
        el('span', { class: 'history-day', text: day ? day.name : session.dayId }),
        el('span', { class: 'history-date', text: session.date })
      ]),
      el('div', { class: 'history-row-meta' }, [
        el('span', { class: `badge badge--${session.status}`, text: statusLabel(session) }),
        session.status !== 'skipped' ? el('span', { class: 'muted', text: `${sessionVolume(session)} kg vol.` }) : null
      ])
    ]));
  });
}

export function renderSessionDetail(root, sessionId, navigate) {
  clear(root);
  const session = state.getSession(sessionId);
  if (!session) {
    root.appendChild(el('p', { text: 'Sesión no encontrada.' }));
    return;
  }
  const day = getDayById(session.dayId, session.planVersion);
  const monthKey = monthKeyOf(session.date);
  const weekKey = weekKeyOf(session);
  const backToDays = () => navigate(`#/history/${monthKey}/${weekKey}`);

  root.appendChild(el('div', { class: 'session-header' }, [
    el('button', { class: 'btn btn--ghost btn--small', text: '← Semana', onClick: backToDays }),
    el('h2', { text: day ? day.name : session.dayId }),
    el('p', { class: 'muted', text: `${session.date} · ${statusLabel(session)}` })
  ]));

  const deleteButton = (confirmText) => el('div', { class: 'card card--danger' }, [
    el('button', {
      class: 'btn btn--danger',
      text: 'Eliminar esta sesión',
      onClick: () => {
        if (confirm(confirmText)) {
          state.deleteSession(session.id);
          toast('Sesión eliminada');
          backToDays();
        }
      }
    })
  ]);

  if (session.status === 'skipped') {
    root.appendChild(el('div', { class: 'card' }, [
      el('p', { text: session.reason ? `Motivo: ${session.reason}` : 'Día no entrenado.' })
    ]));
    root.appendChild(deleteButton(`¿Eliminar el registro de "${statusLabel(session)}" del ${session.date}? No afecta al resto del histórico.`));
    return;
  }

  if (session.status === 'partial') {
    root.appendChild(el('div', { class: 'card card--partial' }, [
      el('p', { text: session.reason ? `No seguido al 100%: ${session.reason}` : 'No seguido al 100% del plan.' })
    ]));
  }

  Object.entries(session.entries).forEach(([exId, entry]) => {
    const exercise = findExercise(day, exId);
    const label = exercise ? exercise.name : exId;
    if (entry.sets) {
      root.appendChild(el('div', { class: 'card' }, [
        el('h4', { text: label }),
        el('ul', { class: 'detail-set-list' }, entry.sets.map((s, i) => el('li', {
          text: s.status === 'done'
            ? `Serie ${i + 1}: ${formatSetDone(s, exercise)}`
            : s.status === 'skipped' ? `Serie ${i + 1}: saltada` : `Serie ${i + 1}: sin hacer`
        }))),
        entry.rpe != null ? el('p', { class: 'muted', text: `RPE ${entry.rpe}` }) : null
      ]));
    } else {
      root.appendChild(el('div', { class: 'card' }, [
        el('p', { text: `${label}: ${entry.done ? 'hecho' : 'no hecho'}` })
      ]));
    }
  });

  root.appendChild(deleteButton(`¿Eliminar el entreno de ${day ? day.name : session.dayId} del ${session.date}? No afecta al resto del histórico.`));
}

function formatSetDone(s, exercise) {
  // De peso corporal: sin "— ×", solo las repeticiones.
  if (exercise && exercise.bodyweight) return `${s.reps ?? '—'} reps`;
  return `${s.weight ?? '—'} × ${s.reps ?? '—'}`;
}

function findExercise(day, exId) {
  if (!day) return null;
  const all = [...day.warmup, ...day.exercises];
  return all.find(e => e.id === exId) || null;
}
