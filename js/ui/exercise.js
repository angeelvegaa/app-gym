import { el, clear } from './components.js';
import * as state from '../state.js';
import { getExerciseHistory } from '../state.js';
import { getSuggestions } from '../suggestions.js';
import { getTargetRpe } from '../schedule.js';

// Incluye ejercicios de cualquier rutina guardada en este dispositivo, para
// poder seguir consultando el progreso de algo que ya no está en la rutina
// activa (p. ej. tras cambiar de rutina).
function allExercises() {
  return state.getAllKnownExercises();
}

export function renderExerciseList(root, navigate) {
  clear(root);
  root.appendChild(el('h2', { text: 'Progreso por ejercicio' }));
  const activeVersion = state.getActivePlanVersion();
  const list = el('div', { class: 'exercise-select-list' });
  allExercises().forEach(ex => {
    const discontinued = ex.planVersion !== activeVersion;
    list.appendChild(el('button', {
      class: 'list-row',
      type: 'button',
      onClick: () => navigate(`#/exercise/${ex.id}`)
    }, [
      el('span', { text: ex.name }),
      el('span', { class: 'muted', text: discontinued ? `${ex.dayName} · plan anterior` : ex.dayName })
    ]));
  });
  root.appendChild(list);
}

function maxWeight(entry) {
  const done = entry.sets.filter(s => s.status === 'done' && s.weight != null);
  if (!done.length) return null;
  return Math.max(...done.map(s => s.weight));
}

function buildChart(history, exercise) {
  const points = history
    .map(h => ({ date: h.date, weight: maxWeight(h), weekInBlock: h.weekInBlock, rpe: h.rpe }))
    .filter(p => p.weight != null);
  if (points.length < 2) return null;

  const width = 320, height = 140, padX = 30, padY = 20;
  const weights = points.map(p => p.weight);
  const minW = Math.min(...weights), maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const xStep = (width - padX * 2) / (points.length - 1);
  const coords = points.map((p, i) => ({
    x: padX + i * xStep,
    y: height - padY - ((p.weight - minW) / range) * (height - padY * 2),
    ...p
  }));

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'progress-chart');

  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', pathD);
  path.setAttribute('class', 'progress-chart-line');
  svg.appendChild(path);

  coords.forEach(c => {
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', c.x);
    circle.setAttribute('cy', c.y);
    circle.setAttribute('r', c.weekInBlock === 4 ? 5 : 3.5);
    circle.setAttribute('class', c.weekInBlock === 4 ? 'progress-chart-point progress-chart-point--deload' : 'progress-chart-point');
    svg.appendChild(circle);

    const title = document.createElementNS(svgNS, 'title');
    title.textContent = `${c.date}: ${c.weight}${exercise.unit}${c.rpe != null ? ` · RPE ${c.rpe}` : ''}`;
    circle.appendChild(title);
  });

  return svg;
}

export function renderExerciseDetail(root, exerciseId, navigate) {
  clear(root);
  const exercise = allExercises().find(e => e.id === exerciseId);
  if (!exercise) {
    root.appendChild(el('p', { text: 'Ejercicio no encontrado.' }));
    return;
  }
  const settings = state.getSettings();
  const history = getExerciseHistory(exerciseId);

  root.appendChild(el('div', { class: 'session-header' }, [
    el('button', { class: 'btn btn--ghost btn--small', text: '← Ejercicios', onClick: () => navigate('#/exercises') }),
    el('h2', { text: exercise.name })
  ]));

  if (!history.length) {
    root.appendChild(el('div', { class: 'card' }, [el('p', { text: 'Todavía no hay registros de este ejercicio.' })]));
    return;
  }

  const chart = buildChart(history, exercise);
  if (chart) {
    root.appendChild(el('div', { class: 'card' }, [chart]));
  }

  const weights = history.map(maxWeight).filter(w => w != null);
  const best = weights.length ? Math.max(...weights) : null;
  const last4 = history.slice(-4);
  const volumes = last4.map(h => h.sets.reduce((sum, s) => s.status === 'done' && s.weight != null && s.reps != null ? sum + s.weight * s.reps : sum, 0));

  root.appendChild(el('div', { class: 'card' }, [
    el('h4', { text: 'Métricas' }),
    el('p', { text: `Mejor serie histórica: ${best != null ? best + exercise.unit : '—'}` }),
    el('p', { text: `Volumen últimas ${last4.length} sesiones: ${volumes.map(v => Math.round(v)).join(' → ')}` })
  ]));

  const targetRpe = getTargetRpe(exercise.rpe, history[history.length - 1].weekInBlock);
  const suggestions = getSuggestions(history, exercise, settings.phase, targetRpe);
  if (suggestions.length) {
    root.appendChild(el('div', { class: 'card' }, [
      el('h4', { text: 'Sugerencias' }),
      el('ul', { class: 'suggestion-list' }, suggestions.map(s => el('li', { text: `${s.text} (confianza: ${s.confidence})` })))
    ]));
  }

  root.appendChild(el('div', { class: 'card' }, [
    el('h4', { text: 'Sesiones' }),
    el('ul', { class: 'detail-set-list' }, history.slice().reverse().map(h => {
      const w = maxWeight(h);
      return el('li', { text: `${h.date} · S${h.weekInBlock} · ${w != null ? w + exercise.unit : '—'}${h.rpe != null ? ` · RPE ${h.rpe}` : ''}` });
    }))
  ]));
}
