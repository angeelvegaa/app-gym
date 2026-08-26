import { renderToday } from './ui/today.js';
import { renderSession } from './ui/session.js';
import { renderHistoryMonths, renderHistoryWeeks, renderHistoryDays, renderSessionDetail } from './ui/history.js';
import { renderExerciseList, renderExerciseDetail } from './ui/exercise.js';
import { renderSettings } from './ui/settings.js';
import { renderRoutine } from './ui/routine.js';

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

  switch (section) {
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
      renderRoutine(root);
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
