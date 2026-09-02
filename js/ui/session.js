import { el, clear, numberStepper, rpeChips, toast, formatRepRange } from './components.js';
import * as state from '../state.js';
import { getTargetRpe, getSuggestedSets, isDeloadWeek } from '../schedule.js';

// Un solo ejercicio expandido a la vez, guardado fuera del render para sobrevivir a redibujados.
let expandedId = null;

function lastEntryFor(exerciseId, currentSession) {
  const history = state.getExerciseHistory(exerciseId).filter(h => h.date !== currentSession.date);
  if (!history.length) return null;
  return history[history.length - 1];
}

export function renderSession(root, sessionId, navigate) {
  clear(root);
  const session = state.getSession(sessionId);
  if (!session) {
    root.appendChild(el('p', { text: 'Sesión no encontrada.' }));
    return;
  }
  const day = state.getDayById(session.dayId, session.planVersion);
  const settings = state.getSettings();

  root.appendChild(el('div', { class: 'session-header' }, [
    el('button', { class: 'btn btn--ghost btn--small', text: '← Hoy', onClick: () => navigate('#/today') }),
    el('h2', { text: day.name }),
    el('p', { class: 'muted', text: `Semana ${session.weekInBlock} de 4 · Bloque ${session.block}` })
  ]));

  if (session.status === 'skipped') {
    root.appendChild(el('div', { class: 'card' }, [
      el('p', { text: 'Este día está marcado como no entrenado.' }),
      el('button', {
        class: 'btn btn--ghost',
        text: 'Deshacer',
        onClick: () => { state.setSessionStatus(session.id, 'pending'); renderSession(root, sessionId, navigate); }
      })
    ]));
    return;
  }

  if (session.status === 'partial') {
    root.appendChild(el('div', { class: 'card card--partial' }, [
      el('p', { text: `Marcado como "no al 100%"${session.reason ? `: ${session.reason}` : ''}` }),
      el('button', {
        class: 'btn btn--ghost btn--small',
        text: 'Deshacer',
        onClick: () => { state.setSessionStatus(session.id, 'in_progress'); renderSession(root, sessionId, navigate); }
      })
    ]));
  }

  const list = el('div', { class: 'exercise-list' });
  root.appendChild(list);

  if (day.warmup.length) {
    list.appendChild(el('h3', { class: 'section-label', text: 'Calentamiento' }));
    day.warmup.forEach(w => list.appendChild(renderSimpleItem(session, w, () => renderSession(root, sessionId, navigate))));
  }

  list.appendChild(el('h3', { class: 'section-label', text: 'Ejercicios' }));
  day.exercises.forEach(ex => {
    if (ex.type === 'checkbox') {
      list.appendChild(renderSimpleItem(session, ex, () => renderSession(root, sessionId, navigate)));
    } else {
      list.appendChild(renderStrengthExercise(session, ex, () => renderSession(root, sessionId, navigate)));
    }
  });

  const total = day.exercises.length;
  const done = day.exercises.filter(ex => isExerciseComplete(session, ex)).length;

  root.appendChild(el('div', { class: 'partial-finish-row' }, [
    el('button', {
      class: 'btn btn--ghost btn--small',
      text: 'Hoy no seguí el plan al 100%',
      onClick: () => {
        const reason = prompt('¿Qué cambió respecto al plan? (opcional, se ve en el historial)');
        if (reason === null) return; // canceló, no hacemos nada
        state.setSessionStatus(session.id, 'partial', reason.trim() || null);
        toast('Entreno guardado como "no al 100%"');
        navigate('#/today');
      }
    })
  ]));

  const bar = el('div', { class: 'bottom-bar' }, [
    el('span', { class: 'bottom-bar-progress', text: `${done} / ${total} ejercicios` }),
    el('button', {
      class: 'btn btn--primary',
      text: 'Terminar entreno',
      onClick: () => {
        state.setSessionStatus(session.id, 'completed');
        toast('Entreno guardado');
        navigate('#/today');
      }
    })
  ]);
  root.appendChild(bar);

  if (expandedId) {
    const target = root.querySelector(`[data-exercise-id="${expandedId}"]`);
    if (target) setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
  }
}

function isExerciseComplete(session, ex) {
  const entry = session.entries[ex.id];
  if (ex.type === 'checkbox' || ex.type === 'warmup') return !!entry.done;
  return entry.sets.every(s => s.status !== 'pending');
}

function renderSimpleItem(session, item, onChange) {
  const entry = session.entries[item.id];
  const card = el('div', { class: `simple-item${entry.done ? ' simple-item--done' : ''}` }, [
    el('button', {
      class: 'btn btn--check btn--big',
      text: entry.done ? '✓ ' + item.name : item.name,
      onClick: () => {
        state.updateEntry(session.id, item.id, e => { e.done = !e.done; });
        onChange();
      }
    })
  ]);
  return card;
}

function renderStrengthExercise(session, ex, onChange) {
  const entry = session.entries[ex.id];
  const isExpanded = expandedId === ex.id;
  const complete = isExerciseComplete(session, ex);
  const targetRpe = getTargetRpe(ex.rpe, session.weekInBlock);
  const suggestedSets = getSuggestedSets(ex.sets, session.weekInBlock);
  const last = lastEntryFor(ex.id, session);

  const header = el('button', {
    class: `exercise-header${complete ? ' exercise-header--done' : ''}`,
    type: 'button',
    onClick: () => {
      expandedId = isExpanded ? null : ex.id;
      onChange();
    }
  }, [
    el('div', { class: 'exercise-header-main' }, [
      el('span', { class: 'exercise-name', text: ex.name }),
      el('span', { class: 'exercise-meta', text: summaryText(entry, ex) })
    ]),
    el('span', { class: 'exercise-caret', text: isExpanded ? '▲' : '▼' })
  ]);

  const wrap = el('div', { class: 'exercise-card', 'data-exercise-id': ex.id }, [header]);

  if (!isExpanded) return wrap;

  const body = el('div', { class: 'exercise-body' });

  const hints = [];
  if (isDeloadWeek(session.weekInBlock)) hints.push(`Deload: prueba con ${suggestedSets} series`);
  hints.push(`Objetivo: ${formatRepRange(ex)}${targetRpe != null ? ` · RPE ${targetRpe}` : ''}`);
  body.appendChild(el('p', { class: 'exercise-hint', text: hints.join(' · ') }));

  entry.sets.forEach((set, idx) => {
    body.appendChild(renderSetRow(session, ex, entry, idx, last, onChange));
  });

  body.appendChild(el('button', {
    class: 'btn btn--ghost btn--small add-set-btn',
    type: 'button',
    text: '+ Añadir serie extra',
    onClick: () => {
      state.updateEntry(session.id, ex.id, e => {
        e.sets.push({ status: 'pending', weight: null, reps: null });
      });
      onChange();
    }
  }));

  if (entry.sets.every(s => s.status !== 'pending')) {
    body.appendChild(el('div', { class: 'rpe-row' }, [
      el('span', { class: 'rpe-label', text: 'RPE del ejercicio' }),
      rpeChips({
        value: entry.rpe,
        onChange: (r) => {
          state.updateEntry(session.id, ex.id, e => { e.rpe = r; });
          onChange();
        }
      })
    ]));
  }

  wrap.appendChild(body);
  return wrap;
}

function summaryText(entry, ex) {
  const doneSets = entry.sets.filter(s => s.status === 'done');
  if (!doneSets.length) return `${entry.sets.length} series`;
  const weights = doneSets.map(s => s.weight).filter(w => w != null);
  const maxW = weights.length ? Math.max(...weights) : null;
  const rpeTxt = entry.rpe != null ? ` · RPE ${entry.rpe}` : '';
  return `${doneSets.length}/${entry.sets.length} series${maxW != null ? ` · ${maxW}${ex.unit}` : ''}${rpeTxt}`;
}

// El valor mostrado ahora mismo en un numberStepper (componentes.js),
// leyendo el <input> directamente en vez de fiarse del último 'change'
// que haya disparado.
function readStepperValue(stepperEl) {
  const input = stepperEl.querySelector('.stepper-value');
  return input.value === '' ? null : Number(input.value);
}

function renderSetRow(session, ex, entry, idx, last, onChange) {
  const set = entry.sets[idx];
  const lastSet = last && last.sets && last.sets[idx];
  const repLabel = ex.repUnit || 'reps';

  const weightDefault = set.weight != null ? set.weight : (lastSet ? lastSet.weight : null);
  const repsDefault = set.reps != null ? set.reps : (lastSet ? lastSet.reps : null);

  const weightStepper = numberStepper({
    value: weightDefault,
    step: ex.increment,
    unit: ex.unit,
    onChange: (v) => {
      state.updateEntry(session.id, ex.id, e => { e.sets[idx].weight = v; });
    }
  });
  const repsStepper = numberStepper({
    value: repsDefault,
    step: 1,
    unit: repLabel,
    onChange: (v) => {
      state.updateEntry(session.id, ex.id, e => { e.sets[idx].reps = v; });
    }
  });

  const isReference = set.weight == null && lastSet;
  if (isReference) {
    weightStepper.classList.add('stepper--reference');
    repsStepper.classList.add('stepper--reference');
  }

  const checkBtn = el('button', {
    class: `set-check${set.status === 'done' ? ' set-check--done' : ''}`,
    type: 'button',
    'aria-label': 'marcar serie hecha',
    text: set.status === 'done' ? '✓' : '',
    onClick: () => {
      // Lee el valor tal cual está en el campo AHORA, sin esperar a que su
      // propio 'change' se haya disparado antes (con teclado numérico
      // móvil, tocar este botón directamente sin cerrar antes el teclado
      // puede llegar antes que el blur/change del campo — sobre todo en
      // WebKit — y perder lo escrito si dependemos de ese evento).
      const liveWeight = readStepperValue(weightStepper);
      const liveReps = readStepperValue(repsStepper);
      state.updateEntry(session.id, ex.id, e => {
        const s = e.sets[idx];
        if (s.status === 'done') {
          s.status = 'pending';
        } else {
          s.weight = liveWeight;
          s.reps = liveReps;
          s.status = 'done';
        }
      });
      onChange();
    }
  });

  const skipBtn = el('button', {
    class: `set-skip${set.status === 'skipped' ? ' set-skip--active' : ''}`,
    type: 'button',
    text: set.status === 'skipped' ? 'Saltada' : 'Saltar',
    onClick: () => {
      state.updateEntry(session.id, ex.id, e => {
        e.sets[idx].status = e.sets[idx].status === 'skipped' ? 'pending' : 'skipped';
      });
      onChange();
    }
  });

  return el('div', { class: `set-row set-row--${set.status}` }, [
    el('div', { class: 'set-row-top' }, [
      el('span', { class: 'set-number', text: `#${idx + 1}` }),
      weightStepper,
      repsStepper
    ]),
    el('div', { class: 'set-row-bottom' }, [
      skipBtn,
      checkBtn
    ])
  ]);
}
