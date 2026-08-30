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
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });
    }).catch(err => console.error('SW register failed', err));
  });
}

function showUpdateBanner() {
  const banner = document.createElement('div');
  banner.className = 'update-banner';
  banner.textContent = 'Hay una versión nueva disponible. Toca para actualizar.';
  banner.addEventListener('click', () => location.reload());
  document.body.appendChild(banner);
}
