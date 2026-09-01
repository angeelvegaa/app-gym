import { el, clear, toast, formatRepRange } from './components.js';
import * as state from '../state.js';

// Editor de rutinas: crear una desde cero o editar una ya guardada, sin
// tocar código. Todo funcional, sin ánimo de ser bonito. Campos apilados
// (etiqueta arriba, input a todo lo ancho abajo) para que quepan bien en
// móvil en vertical, en vez de exprimirlos en una fila — ese error ya nos
// costó un bug serio una vez.

const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

let draft = null;
let draftKey = null; // identifica la sesión de edición actual (versionParam)
let expandedDayKey = null;
let expandedItemKey = null;
let keyCounter = 0;
function newKey() { return `k${++keyCounter}`; }

function blankExercise() {
  return { _key: newKey(), name: '', type: 'strength', sets: 3, repMin: 8, repMax: 12, rpe: 7, unit: 'kg', increment: 2.5 };
}
function blankWarmup() {
  return { _key: newKey(), name: '' };
}
function blankDay() {
  return { _key: newKey(), name: '', weekday: 1, warmup: [], exercises: [] };
}

function toDraft(plan) {
  return {
    name: plan ? plan.name : '',
    description: plan ? (plan.description || '') : '',
    days: plan ? plan.days.map(d => ({
      _key: newKey(),
      id: d.id,
      name: d.name,
      weekday: d.weekday,
      warmup: (d.warmup || []).map(w => ({ _key: newKey(), id: w.id, name: w.name })),
      exercises: (d.exercises || []).map(e => ({ _key: newKey(), ...e }))
    })) : []
  };
}

function field(labelText, inputEl) {
  return el('div', { class: 'editor-field' }, [
    el('label', { class: 'editor-field-label', text: labelText }),
    inputEl
  ]);
}

// Si onSet vuelve a dibujar la pantalla (clear + reconstrucción), hacerlo
// de forma síncrona dentro del propio 'change' de este input puede chocar
// con el manejo interno del navegador de ese mismo evento (blur asociado),
// tirando un "removeChild" de vez en cuando. Difiriéndolo al siguiente
// tick, el navegador ya ha terminado con el input antes de que lo borremos.
function textField(labelText, value, onSet) {
  const input = el('input', { type: 'text', class: 'settings-date', value: value ?? '' });
  input.addEventListener('change', () => { const v = input.value; setTimeout(() => onSet(v), 0); });
  return field(labelText, input);
}

function numberField(labelText, value, onSet, step = 1) {
  const input = el('input', { type: 'number', inputmode: 'decimal', class: 'settings-date', value: value ?? '', step });
  input.addEventListener('change', () => {
    const v = input.value === '' ? null : Number(input.value);
    setTimeout(() => onSet(v), 0);
  });
  return field(labelText, input);
}

export function renderPlanEditor(root, navigate, versionParam) {
  clear(root);

  if (draft === null || draftKey !== versionParam) {
    draftKey = versionParam;
    const existing = versionParam && versionParam !== 'new' ? state.getPlan(Number(versionParam)) : null;
    draft = toDraft(existing);
    expandedDayKey = null;
    expandedItemKey = null;
  }

  const rerender = () => renderPlanEditor(root, navigate, versionParam);
  const isNew = versionParam === 'new';

  root.appendChild(el('div', { class: 'session-header' }, [
    el('button', {
      class: 'btn btn--ghost btn--small',
      text: '← Ajustes',
      onClick: () => { draft = null; draftKey = null; navigate('#/settings'); }
    }),
    el('h2', { text: isNew ? 'Nueva rutina' : 'Editar rutina' })
  ]));

  root.appendChild(el('div', { class: 'card' }, [
    textField('Nombre de la rutina', draft.name, (v) => { draft.name = v; })
  ]));

  const list = el('div', { class: 'plan-editor-days' });
  draft.days.forEach(day => list.appendChild(renderDayCard(day, rerender)));
  root.appendChild(list);

  root.appendChild(el('button', {
    class: 'btn btn--secondary',
    text: '+ Añadir día',
    onClick: () => {
      const d = blankDay();
      draft.days.push(d);
      expandedDayKey = d._key;
      rerender();
    }
  }));

  root.appendChild(el('div', { class: 'bottom-bar' }, [
    el('span', { class: 'bottom-bar-progress', text: `${draft.days.length} día(s)` }),
    el('button', {
      class: 'btn btn--primary',
      text: 'Guardar rutina',
      onClick: () => saveDraft(navigate, versionParam)
    })
  ]));
}

function renderDayCard(day, rerender) {
  const isExpanded = expandedDayKey === day._key;
  const header = el('button', {
    class: 'exercise-header',
    type: 'button',
    onClick: () => { expandedDayKey = isExpanded ? null : day._key; rerender(); }
  }, [
    el('div', { class: 'exercise-header-main' }, [
      el('span', { class: 'exercise-name', text: day.name || '(día sin nombre)' }),
      el('span', { class: 'exercise-meta', text: `${WEEKDAY_NAMES[day.weekday]} · ${day.exercises.length} ejercicio(s)` })
    ]),
    el('span', { class: 'exercise-caret', text: isExpanded ? '▲' : '▼' })
  ]);

  const wrap = el('div', { class: 'exercise-card' }, [header]);
  if (!isExpanded) return wrap;

  const body = el('div', { class: 'exercise-body' });

  body.appendChild(textField('Nombre del día (ej. Piernas)', day.name, (v) => { day.name = v; rerender(); }));

  const weekdaySelect = el('select', { class: 'settings-select' });
  WEEKDAY_NAMES.forEach((name, idx) => {
    weekdaySelect.appendChild(el('option', { value: idx, selected: idx === day.weekday ? 'selected' : null, text: name }));
  });
  weekdaySelect.addEventListener('change', () => {
    day.weekday = Number(weekdaySelect.value);
    setTimeout(rerender, 0);
  });
  body.appendChild(field('Día de la semana', weekdaySelect));

  body.appendChild(el('p', { class: 'section-label routine-section-label', text: 'Calentamiento' }));
  day.warmup.forEach(w => body.appendChild(renderWarmupRow(day, w, rerender)));
  body.appendChild(el('button', {
    class: 'btn btn--ghost btn--small',
    text: '+ Añadir calentamiento',
    onClick: () => { day.warmup.push(blankWarmup()); rerender(); }
  }));

  body.appendChild(el('p', { class: 'section-label routine-section-label', text: 'Ejercicios' }));
  day.exercises.forEach(ex => body.appendChild(renderExerciseCard(day, ex, rerender)));
  body.appendChild(el('button', {
    class: 'btn btn--ghost btn--small',
    text: '+ Añadir ejercicio',
    onClick: () => {
      const e = blankExercise();
      day.exercises.push(e);
      expandedItemKey = e._key;
      rerender();
    }
  }));

  body.appendChild(el('button', {
    class: 'btn btn--danger btn--small',
    text: 'Eliminar día',
    onClick: () => {
      if (confirm(`¿Eliminar el día "${day.name || 'sin nombre'}"?`)) {
        draft.days = draft.days.filter(d => d._key !== day._key);
        if (expandedDayKey === day._key) expandedDayKey = null;
        rerender();
      }
    }
  }));

  wrap.appendChild(body);
  return wrap;
}

function renderWarmupRow(day, w, rerender) {
  const nameInput = el('input', { type: 'text', class: 'settings-date', placeholder: 'Nombre', value: w.name });
  nameInput.addEventListener('change', () => { w.name = nameInput.value; });
  return el('div', { class: 'settings-row' }, [
    nameInput,
    el('button', {
      class: 'btn btn--ghost btn--small',
      text: 'Eliminar',
      onClick: () => { day.warmup = day.warmup.filter(x => x._key !== w._key); rerender(); }
    })
  ]);
}

function summarizeDraftExercise(ex) {
  if (ex.type === 'checkbox') return 'Marcar hecho';
  const sets = ex.sets ?? '?';
  const reps = (ex.repMin != null && ex.repMax != null) ? formatRepRange(ex) : `${ex.repMin ?? '?'}-${ex.repMax ?? '?'}`;
  const rpe = ex.rpe != null ? `RPE ${ex.rpe}` : 'sin RPE fijo';
  return `${sets} series · ${reps} · ${rpe}`;
}

function renderExerciseCard(day, ex, rerender) {
  const isExpanded = expandedItemKey === ex._key;
  const header = el('button', {
    class: 'exercise-header',
    type: 'button',
    onClick: () => { expandedItemKey = isExpanded ? null : ex._key; rerender(); }
  }, [
    el('div', { class: 'exercise-header-main' }, [
      el('span', { class: 'exercise-name', text: ex.name || '(ejercicio sin nombre)' }),
      el('span', { class: 'exercise-meta', text: summarizeDraftExercise(ex) })
    ]),
    el('span', { class: 'exercise-caret', text: isExpanded ? '▲' : '▼' })
  ]);

  const wrap = el('div', { class: 'exercise-card' }, [header]);
  if (!isExpanded) return wrap;

  const body = el('div', { class: 'exercise-body' });

  body.appendChild(textField('Nombre del ejercicio', ex.name, (v) => { ex.name = v; rerender(); }));

  const typeSelect = el('select', { class: 'settings-select' });
  [['strength', 'Fuerza (series y reps)'], ['checkbox', 'Marcar hecho (sin series)']].forEach(([val, label]) => {
    typeSelect.appendChild(el('option', { value: val, selected: ex.type === val ? 'selected' : null, text: label }));
  });
  typeSelect.addEventListener('change', () => {
    ex.type = typeSelect.value;
    setTimeout(rerender, 0);
  });
  body.appendChild(field('Tipo', typeSelect));

  if (ex.type === 'strength') {
    body.appendChild(numberField('Series', ex.sets, (v) => { ex.sets = v; }));
    body.appendChild(numberField('Reps mínimas', ex.repMin, (v) => { ex.repMin = v; }));
    body.appendChild(numberField('Reps máximas', ex.repMax, (v) => { ex.repMax = v; }));
    body.appendChild(numberField('RPE objetivo (vacío = sin RPE fijo todavía)', ex.rpe, (v) => { ex.rpe = v; }, 0.5));
    body.appendChild(textField('Unidad de peso (kg, m...)', ex.unit ?? 'kg', (v) => { ex.unit = v || 'kg'; }));
    body.appendChild(numberField('Incremento sugerido', ex.increment, (v) => { ex.increment = v; }, 0.5));
    body.appendChild(textField('Unidad de la repetición (vacío = "reps"; o "s", "m"...)', ex.repUnit ?? '', (v) => { ex.repUnit = v || undefined; }));

    const perSideWrap = el('label', { class: 'editor-checkbox-row' });
    const perSideCheckbox = el('input', { type: 'checkbox' });
    perSideCheckbox.checked = !!ex.perSide;
    perSideCheckbox.addEventListener('change', () => { ex.perSide = perSideCheckbox.checked || undefined; });
    perSideWrap.appendChild(perSideCheckbox);
    perSideWrap.appendChild(document.createTextNode(' Es "por lado" (zancadas, step-up...)'));
    body.appendChild(perSideWrap);
  }

  body.appendChild(el('button', {
    class: 'btn btn--danger btn--small',
    text: 'Eliminar ejercicio',
    onClick: () => {
      day.exercises = day.exercises.filter(x => x._key !== ex._key);
      if (expandedItemKey === ex._key) expandedItemKey = null;
      rerender();
    }
  }));

  wrap.appendChild(body);
  return wrap;
}

function validateDraft() {
  if (!draft.name.trim()) return 'Ponle un nombre a la rutina.';
  if (!draft.days.length) return 'Añade al menos un día.';
  for (const day of draft.days) {
    if (!day.name.trim()) return 'Todos los días necesitan un nombre.';
    if (!day.exercises.length) return `El día "${day.name}" no tiene ningún ejercicio.`;
    for (const ex of day.exercises) {
      if (!ex.name.trim()) return `Hay un ejercicio sin nombre en "${day.name}".`;
      if (ex.type === 'strength') {
        // El RPE objetivo puede dejarse vacío (sin referencia todavía); el
        // resto de campos siguen siendo obligatorios.
        if (!ex.sets || !ex.repMin || !ex.repMax) {
          return `Revisa series/reps de "${ex.name}" en "${day.name}".`;
        }
      }
    }
  }
  return null;
}

function saveDraft(navigate, versionParam) {
  const error = validateDraft();
  if (error) { alert(error); return; }

  const days = draft.days.map(({ _key, ...day }) => ({
    ...day,
    warmup: day.warmup.map(({ _key, ...w }) => ({ ...w, type: 'warmup' })),
    exercises: day.exercises.map(({ _key, ...ex }) => ex)
  }));

  const isNew = versionParam === 'new';
  if (isNew) {
    state.createPlan({ name: draft.name, description: draft.description, days });
    toast('Rutina creada');
  } else {
    state.updatePlan(Number(versionParam), { name: draft.name, description: draft.description, days });
    toast('Rutina guardada');
  }
  draft = null;
  draftKey = null;
  navigate('#/settings');
}
