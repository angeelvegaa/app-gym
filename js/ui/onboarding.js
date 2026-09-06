import { el, clear, toast, seedPlanCard } from './components.js';
import { SEED_PLANS } from '../plan.js';
import * as state from '../state.js';
import { mountCloudSyncWizard } from './cloud-sync.js';

// Se muestra solo en un dispositivo genuinamente nuevo (sin rutinas
// guardadas y sin historial previo). Elegir una rutina de ejemplo la copia
// como la primera rutina de ESTE dispositivo (con su propio version local)
// y la activa; no hay nada compartido con otras instalaciones.
export function renderOnboarding(root, navigate) {
  clear(root);

  root.appendChild(el('h2', { text: 'Bienvenido a Gym Track' }));
  root.appendChild(el('p', { class: 'muted', text: 'Elige una rutina para empezar. Puedes cambiarla, editarla o crear otras más adelante desde Ajustes.' }));

  SEED_PLANS.forEach(seed => {
    root.appendChild(seedPlanCard(seed, {
      buttonLabel: 'Usar esta rutina',
      onPick: () => {
        state.createPlan({ name: seed.name, description: seed.description, days: seed.days });
        toast(`"${seed.name}" activada`);
        navigate('#/today');
      }
    }));
  });

  root.appendChild(el('div', { class: 'card' }, [
    el('h3', { text: 'Empezar en blanco' }),
    el('p', { class: 'muted', text: 'Crea tu propia rutina desde cero: días, ejercicios, series, reps y RPE.' }),
    el('button', {
      class: 'btn btn--secondary',
      text: 'Crear rutina propia',
      onClick: () => navigate('#/plan-editor/new')
    })
  ]));

  root.appendChild(renderRecoverCard(root, navigate));
}

// Para quien ya activó la copia en la nube en otro dispositivo: inicia
// sesión y recupera su rutina e historial en vez de crear uno nuevo.
function renderRecoverCard(root, navigate) {
  const card = el('div', { class: 'card' }, [
    el('h3', { text: '¿Ya tienes datos en la nube?' }),
    el('p', { class: 'muted', text: 'Si activaste la copia en la nube en otro dispositivo, inicia sesión aquí para recuperar tu rutina e historial en vez de crear uno nuevo.' })
  ]);
  const start = () => {
    const wizardContainer = el('div', {});
    clear(card);
    card.appendChild(el('h3', { text: '¿Ya tienes datos en la nube?' }));
    card.appendChild(wizardContainer);
    mountCloudSyncWizard(wizardContainer, {
      initialEmail: '',
      onCancel: () => renderOnboarding(root, navigate),
      onDone: () => navigate('#/today')
    });
  };
  card.appendChild(el('button', {
    class: 'btn btn--secondary',
    text: 'Recuperar mis datos de la nube',
    onClick: start
  }));
  return card;
}
