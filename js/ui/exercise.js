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

// Rango a mostrar: ver todos los bloques presentes en el historial de este
// ejercicio, el más reciente, o los últimos 3.
const CHART_RANGES = [
  { id: 'block', label: 'Este bloque' },
  { id: 'last3', label: 'Últimos 3 bloques' },
  { id: 'all', label: 'Todo el historial' }
];

function filterHistoryByRange(history, rangeId) {
  if (rangeId === 'all') return history;
  const blocks = history.map(h => h.block).filter(b => b != null);
  if (!blocks.length) return history;
  const maxBlock = Math.max(...blocks);
  const minBlock = rangeId === 'block' ? maxBlock : maxBlock - 2;
  return history.filter(h => h.block >= minBlock);
}

function buildRangeSelector(current, onChange) {
  const wrap = el('div', { class: 'rpe-chips chart-range-selector' });
  CHART_RANGES.forEach(opt => {
    wrap.appendChild(el('button', {
      class: `chip chip--wide${current === opt.id ? ' chip--active' : ''}`,
      type: 'button',
      text: opt.label,
      onClick: () => onChange(opt.id)
    }));
  });
  return wrap;
}

function buildChart(history, exercise) {
  const points = history
    .map(h => ({ date: h.date, weight: maxWeight(h), weekInBlock: h.weekInBlock, block: h.block, rpe: h.rpe }))
    .filter(p => p.weight != null);
  if (points.length < 2) return null;

  const height = 140, padX = 30, padY = 20;
  const width = Math.max(320, points.length * 22);
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

  // Marca dónde empieza cada bloque nuevo (línea vertical + etiqueta "B{n}"),
  // para poder leer la progresión de varios bloques seguidos de un vistazo.
  for (let i = 1; i < coords.length; i++) {
    if (coords[i].block === coords[i - 1].block) continue;
    const lineX = (coords[i - 1].x + coords[i].x) / 2;

    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', lineX.toFixed(1));
    line.setAttribute('x2', lineX.toFixed(1));
    line.setAttribute('y1', padY - 8);
    line.setAttribute('y2', height - padY + 8);
    line.setAttribute('class', 'progress-chart-block-line');
    svg.appendChild(line);

    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', lineX.toFixed(1));
    label.setAttribute('y', padY - 10);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'progress-chart-block-label');
    label.textContent = `B${coords[i].block}`;
    svg.appendChild(label);
  }

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
    title.textContent = `${c.date}: ${c.weight}${exercise.unit} · B${c.block} S${c.weekInBlock}${c.rpe != null ? ` · RPE ${c.rpe}` : ''}${c.weekInBlock === 4 ? ' · deload' : ''}`;
    circle.appendChild(title);
  });

  return svg;
}

// Tarjeta con selector de rango (este bloque / últimos 3 / todo el
// historial) que se redibuja sola al cambiar, sin perder la selección ni
// recargar el resto de la pantalla.
function renderChartCard(history, exercise) {
  const card = el('div', { class: 'card' });
  let rangeId = 'all';

  function draw() {
    clear(card);
    card.appendChild(el('h4', { text: 'Progresión' }));
    card.appendChild(buildRangeSelector(rangeId, (id) => { rangeId = id; draw(); }));
    const chart = buildChart(filterHistoryByRange(history, rangeId), exercise);
    if (chart) {
      card.appendChild(chart);
    } else {
      card.appendChild(el('p', { class: 'muted', text: 'No hay suficientes datos en este rango.' }));
    }
  }

  draw();
  return card;
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

  root.appendChild(renderChartCard(history, exercise));

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
