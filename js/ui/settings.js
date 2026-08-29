import { el, clear, toast } from './components.js';
import { PHASES, PHASE_LABELS, PLAN } from '../plan.js';
import * as state from '../state.js';
import * as storage from '../storage.js';

const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function renderSettings(root, navigate) {
  clear(root);
  root.appendChild(el('h2', { text: 'Ajustes' }));
  const settings = state.getSettings();

  // Rutina activa (solo información — cambiarla de verdad es una acción
  // aparte, ver "Mi rutina" > README para el flujo).
  root.appendChild(el('div', { class: 'card' }, [
    el('h4', { text: 'Rutina activa' }),
    el('p', { text: `${PLAN.name || 'Plan'} (versión ${PLAN.version})` }),
    el('p', { class: 'muted', text: 'Esta es la rutina que se usa al registrar un entreno nuevo. Puedes consultar cualquier rutina guardada, sin cambiar cuál está activa, desde "Mi rutina".' })
  ]));

  // Fase actual
  const phaseWrap = el('div', { class: 'card' }, [
    el('h4', { text: 'Fase actual' }),
    el('p', { class: 'muted', text: 'Afecta a las sesiones nuevas y a las sugerencias. Las sesiones pasadas conservan la fase que tenían.' })
  ]);
  const phaseChips = el('div', { class: 'rpe-chips' });
  PHASES.forEach(p => {
    phaseChips.appendChild(el('button', {
      class: `chip${settings.phase === p ? ' chip--active' : ''}`,
      type: 'button',
      text: PHASE_LABELS[p],
      onClick: () => {
        state.updateSettings({ phase: p });
        renderSettings(root, navigate);
      }
    }));
  });
  phaseWrap.appendChild(phaseChips);
  root.appendChild(phaseWrap);

  // Fecha de inicio de bloque
  const blockWrap = el('div', { class: 'card' }, [
    el('h4', { text: 'Inicio del bloque actual' }),
    el('p', { class: 'muted', text: 'Debe ser un lunes. Determina en qué semana del bloque de 4 estás.' })
  ]);
  const dateInput = el('input', {
    type: 'date',
    class: 'settings-date',
    value: settings.blockStart
  });
  dateInput.addEventListener('change', () => {
    if (!dateInput.value) return;
    state.updateSettings({ blockStart: dateInput.value });
    toast('Fecha de bloque actualizada');
  });
  blockWrap.appendChild(dateInput);
  root.appendChild(blockWrap);

  // Días de la semana
  const daysWrap = el('div', { class: 'card' }, [
    el('h4', { text: 'Días de entreno' })
  ]);
  PLAN.days.forEach(day => {
    const select = el('select', { class: 'settings-select' });
    WEEKDAY_NAMES.forEach((name, idx) => {
      select.appendChild(el('option', {
        value: idx,
        selected: idx === settings.weekdays[day.id] ? 'selected' : null,
        text: name
      }));
    });
    select.addEventListener('change', () => {
      const weekdays = { ...settings.weekdays, [day.id]: Number(select.value) };
      state.updateSettings({ weekdays });
      toast(`${day.name} movido a ${WEEKDAY_NAMES[Number(select.value)]}`);
    });
    daysWrap.appendChild(el('div', { class: 'settings-row' }, [
      el('span', { text: day.name }),
      select
    ]));
  });
  root.appendChild(daysWrap);

  // Marcar varios días sin entreno de golpe (viajes, lesiones...)
  const rangeWrap = el('div', { class: 'card' }, [
    el('h4', { text: 'Marcar días sin entreno' }),
    el('p', { class: 'muted', text: 'Para un viaje u otro parón: marca como "no entrenado" todos los días del rango en que tocaba ir al gimnasio. No pisa entrenos que ya tengan progreso registrado.' })
  ]);
  const fromInput = el('input', { type: 'date', class: 'settings-date' });
  const toInput = el('input', { type: 'date', class: 'settings-date' });
  const reasonInput = el('input', { type: 'text', class: 'settings-date', placeholder: 'Motivo (opcional): Viaje a...' });
  rangeWrap.appendChild(el('div', { class: 'settings-row' }, [el('span', { text: 'Desde' }), fromInput]));
  rangeWrap.appendChild(el('div', { class: 'settings-row' }, [el('span', { text: 'Hasta' }), toInput]));
  rangeWrap.appendChild(el('div', { class: 'settings-row' }, [el('span', { text: 'Motivo' }), reasonInput]));
  rangeWrap.appendChild(el('button', {
    class: 'btn btn--secondary',
    text: 'Marcar rango como no entrenado',
    onClick: () => {
      if (!fromInput.value || !toInput.value) {
        alert('Elige fecha de inicio y de fin.');
        return;
      }
      if (fromInput.value > toInput.value) {
        alert('La fecha "Desde" tiene que ser anterior a "Hasta".');
        return;
      }
      const reason = reasonInput.value.trim() || null;
      const preview = state.previewRangeSkipped(fromInput.value, toInput.value);
      if (!preview.skipped.length) {
        alert('Ningún día de entreno cae dentro de ese rango.');
        return;
      }
      const confirmed = confirm(
        `Se marcarán ${preview.skipped.length} día(s) como "${reason || 'no entrenado'}":\n\n` +
        preview.skipped.map(s => `${s.date} (${s.dayName})`).join('\n') +
        (preview.keptExisting.length
          ? `\n\n${preview.keptExisting.length} día(s) con progreso ya registrado se dejarán tal cual.`
          : '') +
        '\n\n¿Confirmar?'
      );
      if (!confirmed) return;
      const result = state.applyRangeSkipped(fromInput.value, toInput.value, reason);
      toast(`${result.skipped.length} día(s) marcados como "${reason || 'no entrenado'}"`);
      fromInput.value = '';
      toInput.value = '';
      reasonInput.value = '';
    }
  }));
  root.appendChild(rangeWrap);

  // Backup
  const backupWrap = el('div', { class: 'card' }, [
    el('h4', { text: 'Copia de seguridad' }),
    el('p', { class: 'muted', text: 'Los datos viven solo en este dispositivo. Exporta de vez en cuando.' }),
    el('button', {
      class: 'btn btn--secondary',
      text: 'Exportar datos (JSON)',
      onClick: () => downloadExport()
    }),
    el('label', { class: 'btn btn--secondary btn--file' }, [
      'Importar datos (JSON)',
      (() => {
        const input = el('input', { type: 'file', accept: 'application/json', class: 'hidden-file-input' });
        input.addEventListener('change', () => handleImport(input, () => renderSettings(root, navigate)));
        return input;
      })()
    ])
  ]);
  root.appendChild(backupWrap);

  // Borrado total
  const dangerWrap = el('div', { class: 'card card--danger' }, [
    el('h4', { text: 'Borrar todo' }),
    el('button', {
      class: 'btn btn--danger',
      text: 'Borrar todos los datos',
      onClick: () => {
        if (confirm('Esto borra todas las sesiones y ajustes de este dispositivo. ¿Seguro?')) {
          storage.wipeAll();
          location.reload();
        }
      }
    })
  ]);
  root.appendChild(dangerWrap);
}

function downloadExport() {
  const json = storage.exportAll();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gym-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function handleImport(input, onDone) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      storage.importAll(reader.result);
      toast('Datos importados');
      onDone();
    } catch (err) {
      alert('No se pudo importar el archivo: ' + err.message);
    }
  };
  reader.readAsText(file);
}
