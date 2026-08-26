import { el, clear } from './components.js';
import { PLAN } from '../plan.js';

// Solo lectura: el plan activo tal cual está en js/plan.js, sin ningún
// control de registro ni edición.
export function renderRoutine(root) {
  clear(root);
  root.appendChild(el('h2', { text: 'Mi rutina' }));
  root.appendChild(el('p', { class: 'muted', text: `Plan activo (versión ${PLAN.version})` }));

  PLAN.days.forEach(day => {
    const card = el('div', { class: 'card' }, [
      el('h3', { text: day.name })
    ]);

    if (day.warmup.length) {
      card.appendChild(el('p', { class: 'section-label routine-section-label', text: 'Calentamiento' }));
      card.appendChild(el('ul', { class: 'routine-list' }, day.warmup.map(w => el('li', { class: 'routine-item' }, [
        el('span', { class: 'routine-ex-name', text: w.name })
      ]))));
    }

    card.appendChild(el('p', { class: 'section-label routine-section-label', text: 'Ejercicios' }));
    card.appendChild(el('ul', { class: 'routine-list' }, day.exercises.map(ex => el('li', { class: 'routine-item' }, [
      el('span', { class: 'routine-ex-name', text: ex.name }),
      el('span', { class: 'routine-ex-detail', text: formatExerciseDetail(ex) })
    ]))));

    root.appendChild(card);
  });
}

function formatExerciseDetail(ex) {
  if (ex.type === 'checkbox') return '';
  const perSide = ex.perSide ? ' por lado' : '';
  const sets = `${ex.sets} series${perSide}`;
  const reps = `${ex.repMin}-${ex.repMax}${ex.repUnit || ''}`;
  return `${sets} · ${reps} · RPE ${ex.rpe}`;
}
