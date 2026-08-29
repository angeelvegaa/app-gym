import { el, clear, toast } from './components.js';
import { SEED_PLANS } from '../plan.js';
import * as state from '../state.js';

// Se muestra solo en un dispositivo genuinamente nuevo (sin rutinas
// guardadas y sin historial previo). Elegir una rutina de ejemplo la copia
// como la primera rutina de ESTE dispositivo (con su propio version local)
// y la activa; no hay nada compartido con otras instalaciones.
export function renderOnboarding(root, navigate) {
  clear(root);

  root.appendChild(el('h2', { text: 'Bienvenido a Gym Track' }));
  root.appendChild(el('p', { class: 'muted', text: 'Elige una rutina para empezar. Puedes cambiarla, editarla o crear otras más adelante desde Ajustes.' }));

  SEED_PLANS.forEach(seed => {
    const card = el('div', { class: 'card' }, [
      el('h3', { text: seed.name }),
      el('p', { class: 'muted', text: `${seed.days.length} días · ${seed.days.map(d => d.name).join(', ')}` })
    ]);
    if (seed.description) {
      card.appendChild(el('p', { class: 'muted onboarding-disclaimer', text: seed.description }));
    }
    card.appendChild(el('button', {
      class: 'btn btn--primary',
      text: 'Usar esta rutina',
      onClick: () => {
        state.createPlan({ name: seed.name, description: seed.description, days: seed.days });
        toast(`"${seed.name}" activada`);
        navigate('#/today');
      }
    }));
    root.appendChild(card);
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
}
