// Cronómetro de descanso entre series: singleton colgado de document.body
// (fuera del árbol que gestiona el router — ver session.js/app.js), igual
// que toast() y el week-banner en app.js, para sobrevivir a los
// clear(root)+reconstrucción de cada redibujado de pantalla.
//
// La cuenta atrás se calcula siempre desde una marca de tiempo absoluta
// (`endsAt = Date.now() + segundos*1000`), nunca acumulando ticks: así no
// se desincroniza si la pestaña pasa a segundo plano y el navegador limita
// los timers (lo hace tanto Chrome como Safari en iOS).

import { el } from './ui/components.js';

const STEP_MS = 30000; // "+30s"

let node = null;
let timeEl = null;
let pauseBtn = null;
let endsAt = null; // marca absoluta a la que llega a 0; null = parado
let remainingMs = null; // solo mientras está en pausa
let paused = false;
let intervalId = null;

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    // Sin soporte o bloqueado por el navegador: no pasa nada.
  }
}

function stopInterval() {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function finish() {
  stopInterval();
  timeEl.textContent = '¡Listo!';
  node.classList.add('rest-timer--done');
  // Pausar no tiene sentido con la cuenta atrás ya en 0 (togglePause() lo
  // ignora mientras esté --done) — se deshabilita para no dejar un botón
  // que parece pulsable pero no hace nada.
  pauseBtn.disabled = true;
  vibrate(200);
}

function tick() {
  const remaining = endsAt - Date.now();
  if (remaining <= 0) {
    finish();
    return;
  }
  timeEl.textContent = formatTime(remaining);
}

function ensureNode() {
  if (node) return;

  timeEl = el('span', { class: 'rest-timer-time', text: '0:00' });

  pauseBtn = el('button', {
    class: 'rest-timer-btn',
    type: 'button',
    text: 'Pausar',
    'aria-label': 'pausar cronómetro de descanso',
    onClick: () => togglePause()
  });

  const addBtn = el('button', {
    class: 'rest-timer-btn',
    type: 'button',
    text: '+30s',
    'aria-label': 'añadir 30 segundos al descanso',
    onClick: () => addSeconds(30)
  });

  const skipBtn = el('button', {
    class: 'rest-timer-btn rest-timer-btn--close',
    type: 'button',
    text: '✕',
    'aria-label': 'saltar descanso',
    onClick: () => stop()
  });

  node = el('div', { class: 'rest-timer' }, [
    timeEl,
    el('div', { class: 'rest-timer-actions' }, [pauseBtn, addBtn, skipBtn])
  ]);
  document.body.appendChild(node);
}

function togglePause() {
  if (!node || !node.classList.contains('rest-timer--visible')) return;
  if (node.classList.contains('rest-timer--done')) return;

  if (paused) {
    // Reanudar: recalcula endsAt desde lo que quedaba.
    endsAt = Date.now() + remainingMs;
    remainingMs = null;
    paused = false;
    pauseBtn.textContent = 'Pausar';
    tick();
    intervalId = setInterval(tick, 250);
  } else {
    remainingMs = Math.max(0, endsAt - Date.now());
    endsAt = null;
    paused = true;
    pauseBtn.textContent = 'Reanudar';
    stopInterval();
  }
}

function addSeconds(extra) {
  if (!node || !node.classList.contains('rest-timer--visible')) return;
  if (node.classList.contains('rest-timer--done')) {
    // Llegó a 0 y se pide más descanso: reinicia desde ahora.
    node.classList.remove('rest-timer--done');
    endsAt = Date.now() + extra * 1000;
    paused = false;
    pauseBtn.disabled = false;
    tick();
    intervalId = setInterval(tick, 250);
    return;
  }
  if (paused) {
    remainingMs += extra * 1000;
    timeEl.textContent = formatTime(remainingMs);
  } else {
    endsAt += extra * 1000;
    tick();
  }
}

export function start(seconds) {
  ensureNode();
  stopInterval();
  paused = false;
  remainingMs = null;
  endsAt = Date.now() + seconds * 1000;
  pauseBtn.textContent = 'Pausar';
  pauseBtn.disabled = false;
  node.classList.remove('rest-timer--done');
  node.classList.add('rest-timer--visible');
  tick();
  intervalId = setInterval(tick, 250);
}

export function stop() {
  stopInterval();
  paused = false;
  endsAt = null;
  remainingMs = null;
  if (node) {
    node.classList.remove('rest-timer--visible', 'rest-timer--done');
    timeEl.textContent = '0:00';
  }
}

export function isRunning() {
  return !!node && node.classList.contains('rest-timer--visible');
}
