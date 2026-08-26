import { el, clear, toast } from './components.js';
import { getDayById } from '../plan.js';
import * as state from '../state.js';

const STATUS_LABEL = {
  pending: 'Sin empezar',
  in_progress: 'A medias',
  completed: 'Completado',
  skipped: 'No entrenado'
};

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

export function renderHistory(root, navigate) {
  clear(root);
  root.appendChild(el('h2', { text: 'Historial' }));

  const sessions = state.getSessionsSorted();
  if (!sessions.length) {
    root.appendChild(el('p', { class: 'muted', text: 'Todavía no hay entrenos registrados.' }));
    return;
  }

  const grouped = {};
  sessions.forEach(s => {
    const key = `Bloque ${s.block} · Semana ${s.weekInBlock}`;
    (grouped[key] = grouped[key] || []).push(s);
  });

  Object.entries(grouped).forEach(([label, list]) => {
    root.appendChild(el('h3', { class: 'section-label', text: label }));
    list.forEach(session => {
      const day = getDayById(session.dayId);
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
          el('span', { class: `badge badge--${session.status}`, text: STATUS_LABEL[session.status] }),
          session.status !== 'skipped' ? el('span', { class: 'muted', text: `${sessionVolume(session)} kg vol.` }) : null
        ])
      ]));
    });
  });
}

export function renderSessionDetail(root, sessionId, navigate) {
  clear(root);
  const session = state.getSession(sessionId);
  if (!session) {
    root.appendChild(el('p', { text: 'Sesión no encontrada.' }));
    return;
  }
  const day = getDayById(session.dayId);

  root.appendChild(el('div', { class: 'session-header' }, [
    el('button', { class: 'btn btn--ghost btn--small', text: '← Historial', onClick: () => navigate('#/history') }),
    el('h2', { text: day ? day.name : session.dayId }),
    el('p', { class: 'muted', text: `${session.date} · ${STATUS_LABEL[session.status]}` })
  ]));

  if (session.status === 'skipped') {
    root.appendChild(el('div', { class: 'card' }, [el('p', { text: 'Día no entrenado.' })]));
    root.appendChild(el('div', { class: 'card card--danger' }, [
      el('button', {
        class: 'btn btn--danger',
        text: 'Eliminar esta sesión',
        onClick: () => {
          if (confirm(`¿Eliminar el registro de "no entrenado" de ${session.date}? No afecta al resto del histórico.`)) {
            state.deleteSession(session.id);
            toast('Sesión eliminada');
            navigate('#/history');
          }
        }
      })
    ]));
    return;
  }

  Object.entries(session.entries).forEach(([exId, entry]) => {
    const label = findExerciseName(day, exId);
    if (entry.sets) {
      root.appendChild(el('div', { class: 'card' }, [
        el('h4', { text: label }),
        el('ul', { class: 'detail-set-list' }, entry.sets.map((s, i) => el('li', {
          text: s.status === 'done'
            ? `Serie ${i + 1}: ${s.weight ?? '—'} × ${s.reps ?? '—'}`
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

  root.appendChild(el('div', { class: 'card card--danger' }, [
    el('button', {
      class: 'btn btn--danger',
      text: 'Eliminar esta sesión',
      onClick: () => {
        if (confirm(`¿Eliminar el entreno de ${day ? day.name : session.dayId} del ${session.date}? No afecta al resto del histórico.`)) {
          state.deleteSession(session.id);
          toast('Sesión eliminada');
          navigate('#/history');
        }
      }
    })
  ]));
}

function findExerciseName(day, exId) {
  if (!day) return exId;
  const all = [...day.warmup, ...day.exercises];
  const found = all.find(e => e.id === exId);
  return found ? found.name : exId;
}
