import { renderToday } from './ui/today.js';
import { renderSession } from './ui/session.js';
import { renderHistoryMonths, renderHistoryWeeks, renderHistoryDays, renderSessionDetail } from './ui/history.js';
import { renderExerciseList, renderExerciseDetail } from './ui/exercise.js';
import { renderSettings } from './ui/settings.js';
import { renderRoutineDays, renderRoutineDetail } from './ui/routine.js';
import { renderOnboarding } from './ui/onboarding.js';
import { renderPlanEditor } from './ui/plan-editor.js';
import * as state from './state.js';
import * as storage from './storage.js';
import { todayStr, isWeekChangeDay, getBlockPosition, getWeekBannerMessage } from './schedule.js';

const root = document.getElementById('view');
const navButtons = document.querySelectorAll('.nav-btn');

function setActiveNav(section) {
  navButtons.forEach(btn => {
    btn.classList.toggle('nav-btn--active', btn.dataset.section === section);
  });
}

function navigate(hash) {
  if (location.hash === hash) {
    route();
  } else {
    location.hash = hash;
  }
}

function route() {
  const hash = location.hash || '#/today';
  const [, section, ...rest] = hash.split('/');
  const param = rest[0];

  window.scrollTo(0, 0);

  // Dispositivo sin ninguna rutina guardada todavía: fuerza la
  // configuración inicial, salvo que ya vayamos hacia el editor (p. ej.
  // "empezar en blanco" navega ahí antes de que exista ninguna rutina).
  if (!state.hasAnyPlan() && section !== 'onboarding' && section !== 'plan-editor') {
    document.body.classList.add('onboarding-active');
    setActiveNav('');
    renderOnboarding(root, navigate);
    return;
  }
  document.body.classList.remove('onboarding-active');

  switch (section) {
    case 'onboarding':
      setActiveNav('');
      renderOnboarding(root, navigate);
      break;
    case 'plan-editor':
      setActiveNav('settings');
      renderPlanEditor(root, navigate, param);
      break;
    case 'today':
      setActiveNav('today');
      renderToday(root, navigate);
      break;
    case 'session':
      setActiveNav('today');
      renderSession(root, param, navigate);
      break;
    case 'session-detail':
      setActiveNav('history');
      renderSessionDetail(root, param, navigate);
      break;
    case 'routine':
      setActiveNav('routine');
      if (rest.length < 2) renderRoutineDays(root, navigate, rest[0]);
      else renderRoutineDetail(root, navigate, rest[0], rest[1]);
      break;
    case 'history':
      setActiveNav('history');
      if (rest.length === 0) renderHistoryMonths(root, navigate);
      else if (rest.length === 1) renderHistoryWeeks(root, navigate, rest[0]);
      else renderHistoryDays(root, navigate, rest[0], rest[1]);
      break;
    case 'exercises':
      setActiveNav('exercises');
      renderExerciseList(root, navigate);
      break;
    case 'exercise':
      setActiveNav('exercises');
      renderExerciseDetail(root, param, navigate);
      break;
    case 'settings':
      setActiveNav('settings');
      renderSettings(root, navigate);
      break;
    default:
      setActiveNav('today');
      renderToday(root, navigate);
  }
}

navButtons.forEach(btn => {
  btn.addEventListener('click', () => navigate(`#/${btn.dataset.section}`));
});

window.addEventListener('hashchange', route);
route();
maybeShowWeekChangeBanner();

// Aviso de que hoy arranca una semana nueva del bloque, solo el día exacto
// en que cambia y solo la primera vez que se abre la app ese día (se
// recuerda en localStorage la última fecha en que ya se mostró).
function maybeShowWeekChangeBanner() {
  if (!state.hasAnyPlan()) return;
  const settings = state.getSettings();
  const dateStr = todayStr();
  if (!isWeekChangeDay(dateStr, settings.blockStart)) return;
  if (storage.loadWeekBannerShownDate() === dateStr) return;

  storage.saveWeekBannerShownDate(dateStr);
  const { weekInBlock } = getBlockPosition(dateStr, settings.blockStart);
  showWeekBanner(getWeekBannerMessage(weekInBlock));
}

function showWeekBanner(message) {
  const banner = document.createElement('div');
  banner.className = 'week-banner';
  banner.setAttribute('role', 'status');
  const text = document.createElement('span');
  text.textContent = message;
  const close = document.createElement('button');
  close.className = 'week-banner-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Cerrar aviso');
  close.textContent = '✕';
  close.addEventListener('click', () => banner.remove());
  banner.appendChild(text);
  banner.appendChild(close);
  document.body.appendChild(banner);
}

if ('serviceWorker' in navigator) {
  let reloadedAfterUpdate = false;
  // clients.claim() en el activate también dispara "controllerchange" la
  // primerísima vez que el SW reclama una página que aún no tenía
  // controlador (instalación inicial, no una actualización) — hay que
  // ignorar ese caso y recargar solo cuando ya había un controlador antes,
  // es decir, cuando el cambio viene de pulsar "Actualizar" de verdad.
  const hadControllerAtLoad = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadControllerAtLoad || reloadedAfterUpdate) return;
    reloadedAfterUpdate = true;
    location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      // Puede que la versión nueva ya terminara de instalar en una sesión
      // anterior (p. ej. con la app en segundo plano) y se quedara
      // esperando sin que llegara a mostrarse el aviso entonces.
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(reg);
          }
        });
      });

      // Las comprobaciones automáticas del navegador al navegar no siempre
      // son puntuales (sobre todo como PWA instalada en iOS); se refuerzan
      // con una comprobación propia de vez en cuando.
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(err => console.error('SW register failed', err));
  });
}

// `reg` recibe el aviso en producción para poder pedirle que active la
// versión nueva. Se puede omitir al invocarla directamente desde los tests
// e2e (disparar una actualización real de service worker no es viable con
// las herramientas de test disponibles): en ese caso recarga directamente.
export function showUpdateBanner(reg) {
  const banner = document.createElement('div');
  banner.className = 'update-banner';
  banner.setAttribute('role', 'status');
  const text = document.createElement('span');
  text.textContent = 'Hay una versión nueva disponible.';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'update-banner-btn';
  button.textContent = 'Actualizar';
  // Todo el banner reacciona, no solo el botón: en un aviso de una sola
  // línea el área táctil grande evita fallos de precisión al tocar.
  banner.addEventListener('click', () => {
    if (reg && reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
    else location.reload();
  });
  banner.appendChild(text);
  banner.appendChild(button);
  document.body.appendChild(banner);
}
