import { el, clear } from './components.js';
import { PLAN, PHASE_LABELS } from '../plan.js';
import * as state from '../state.js';
import { todayStr, getBlockPosition, getWeekType } from '../schedule.js';
import { getExerciseHistory } from '../state.js';
import { getSuggestions } from '../suggestions.js';
import { getTargetRpe } from '../schedule.js';

export function renderToday(root, navigate) {
  clear(root);
  const settings = state.getSettings();
  const date = new Date();
  const dateStr = todayStr(date);
  const weekday = date.getDay();
  const day = PLAN.days.find(d => settings.weekdays[d.id] === weekday) || null;
  const { block, weekInBlock } = getBlockPosition(dateStr, settings.blockStart);
  const weekType = getWeekType(weekInBlock);

  const header = el('div', { class: 'today-header' }, [
    el('div', { class: 'today-block-info', text: `Bloque ${block} · Semana ${weekInBlock} de 4 · ${weekType.label} · ${PHASE_LABELS[settings.phase]}` })
  ]);
  root.appendChild(header);

  if (!day) {
    root.appendChild(el('div', { class: 'card' }, [
      el('p', { text: 'Hoy no toca gimnasio. Día de descanso o carrera.' })
    ]));
    return;
  }

  const session = state.getOrCreateSession(dateStr, day.id);

  const statusLabel = {
    pending: 'Sin empezar',
    in_progress: 'En curso',
    completed: 'Completado',
    skipped: 'No entrenado'
  }[session.status];

  root.appendChild(el('div', { class: 'card card--today' }, [
    el('h2', { text: day.name }),
    el('p', { class: 'muted', text: statusLabel }),
    el('div', { class: 'today-actions' }, [
      el('button', {
        class: 'btn btn--primary btn--big',
        text: session.status === 'pending' ? 'Empezar entreno' : 'Continuar entreno',
        onClick: () => navigate(`#/session/${session.id}`)
      }),
      session.status !== 'completed' && session.status !== 'skipped'
        ? el('button', {
            class: 'btn btn--ghost',
            text: 'Marcar día como no entrenado',
            onClick: () => {
              if (confirm('¿Marcar hoy como no entrenado? Se guarda en el histórico sin romper la secuencia.')) {
                state.setSessionStatus(session.id, 'skipped');
                renderToday(root, navigate);
              }
            }
          })
        : null
    ])
  ]));

  // Resumen de las 3 sugerencias más relevantes entre todos los ejercicios de hoy.
  const allSuggestions = [];
  day.exercises.forEach(ex => {
    const history = getExerciseHistory(ex.id);
    const targetRpe = getTargetRpe(ex.rpe, weekInBlock);
    const sugs = getSuggestions(history, ex, settings.phase, targetRpe)
      .filter(s => s.id !== 'not-enough-data');
    sugs.forEach(s => allSuggestions.push(s));
  });
  allSuggestions.sort((a, b) => b.priority - a.priority);
  const top3 = allSuggestions.slice(0, 3);

  if (top3.length) {
    root.appendChild(el('div', { class: 'card' }, [
      el('h3', { text: 'Antes de empezar' }),
      el('ul', { class: 'suggestion-list' }, top3.map(s => el('li', { text: s.text })))
    ]));
  }
}
