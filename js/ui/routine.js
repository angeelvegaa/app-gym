import { el, clear } from './components.js';
import * as state from '../state.js';
import { getSettings, getPlan, getAllPlanVersions } from '../state.js';

// Solo lectura: consultar cualquier rutina guardada (activa o anterior) y
// sus días, sin ningún control de registro. Ver una rutina distinta a la
// activa aquí NO cambia cuál se usa para registrar entrenos — solo cambia
// qué versión estás mirando.

const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function planLabel(plan) {
  return plan.name || `Plan v${plan.version}`;
}

export function renderRoutineDays(root, navigate, versionParam) {
  clear(root);
  const activeVersion = state.getActivePlanVersion();
  const version = versionParam ? Number(versionParam) : activeVersion;
  const plan = getPlan(version);
  if (!plan) {
    root.appendChild(el('p', { text: 'No hay ninguna rutina guardada todavía.' }));
    return;
  }
  const isActive = version === activeVersion;
  const allVersions = getAllPlanVersions(); // más reciente primero

  root.appendChild(el('h2', { text: planLabel(plan) }));
  root.appendChild(el('p', { class: 'muted', text: isActive ? 'Rutina activa ahora mismo' : `Rutina anterior (versión ${plan.version}) · solo consulta` }));

  if (allVersions.length > 1) {
    const select = el('select', { class: 'settings-select' });
    allVersions.forEach(v => {
      const p = getPlan(v);
      select.appendChild(el('option', {
        value: v,
        selected: v === version ? 'selected' : null,
        text: `${planLabel(p)}${v === activeVersion ? ' (activa)' : ''}`
      }));
    });
    select.addEventListener('change', () => navigate(`#/routine/${select.value}`));
    root.appendChild(el('div', { class: 'card' }, [
      el('span', { class: 'muted', text: 'Ver rutina' }),
      select
    ]));
  }

  // Para la rutina activa, respeta los días de la semana que hayas
  // reasignado en Ajustes; para una rutina anterior, no hay una
  // reasignación "vigente" que aplicarle, así que se usa el día por
  // defecto con el que se definió.
  const settings = getSettings();
  const orderKey = (weekday) => (weekday === 0 ? 7 : weekday); // lunes(1)...domingo(7)
  const rows = plan.days
    .map(day => ({ day, weekday: isActive ? (settings.weekdays[day.id] ?? day.weekday) : day.weekday }))
    .sort((a, b) => orderKey(a.weekday) - orderKey(b.weekday));

  const list = el('div', { class: 'exercise-select-list' });
  rows.forEach(({ day, weekday }) => {
    list.appendChild(el('button', {
      class: 'list-row',
      type: 'button',
      onClick: () => navigate(`#/routine/${version}/${day.id}`)
    }, [
      el('span', { text: `${WEEKDAY_NAMES[weekday]} — ${day.name}` }),
      el('span', { class: 'muted', text: `${day.exercises.length} ejercicios` })
    ]));
  });
  root.appendChild(list);
}

export function renderRoutineDetail(root, navigate, versionParam, dayId) {
  clear(root);
  const version = versionParam ? Number(versionParam) : state.getActivePlanVersion();
  const plan = getPlan(version);
  const day = plan && plan.days.find(d => d.id === dayId);

  if (!day) {
    root.appendChild(el('p', { text: 'Día no encontrado en esta rutina.' }));
    return;
  }

  root.appendChild(el('div', { class: 'session-header' }, [
    el('button', { class: 'btn btn--ghost btn--small', text: '← Mi rutina', onClick: () => navigate(`#/routine/${version}`) }),
    el('h2', { text: day.name }),
    el('p', { class: 'muted', text: planLabel(plan) })
  ]));

  const card = el('div', { class: 'card' });

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
}

function formatExerciseDetail(ex) {
  if (ex.type === 'checkbox') return '';
  const perSide = ex.perSide ? ' por lado' : '';
  const sets = `${ex.sets} series${perSide}`;
  const reps = `${ex.repMin}-${ex.repMax}${ex.repUnit || ''}`;
  return `${sets} · ${reps} · RPE ${ex.rpe}`;
}
