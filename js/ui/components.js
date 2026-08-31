// Helpers DOM reutilizables. Sin frameworks: crear elementos a mano.

// WebKit móvil (confirmado en Safari y en la PWA instalada, con pruebas
// automatizadas) puede despachar el 'click' de un tap sobre un elemento SIN
// listener propio (p. ej. un simple <p>) dirigido a otro botón cercano en
// vez de a él — y el retraso con el que llega es variable (se ha medido
// desde ~15ms hasta ~950ms en la misma app), así que no hay ventana de
// tiempo fiable para "esperar y descartar" ese click fantasma sin arriesgar
// bloquear también un click legítimo. `pointerup`/`touchend`, en cambio, SÍ
// resuelven bien el elemento realmente tocado en TODOS los casos probados
// (tap directo, tap tras redibujado, tap sobre elemento sin listener...),
// así que son el único evento del que nos fiamos para touch y ratón. El
// respaldo de teclado (Enter/Espacio) se maneja aparte, sin depender nunca
// de 'click'.
const DRAG_THRESHOLD_PX = 10;

function bindTap(node, handler) {
  let startX = 0;
  let startY = 0;
  let dragged = false;

  node.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    startY = e.clientY;
    dragged = false;
  });
  node.addEventListener('pointermove', (e) => {
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > DRAG_THRESHOLD_PX) dragged = true;
  });
  node.addEventListener('pointerup', (e) => {
    if (dragged) return;
    handler(e);
  });
  node.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.key === ' ') handler(e);
  });
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'onClick' && typeof value === 'function') {
      bindTap(node, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== null && value !== undefined) {
      node.setAttribute(key, value);
    }
  }
  (Array.isArray(children) ? children : [children]).forEach(child => {
    if (child === null || child === undefined) return;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

// Stepper numérico grande: -  [valor]  +. Tap en el valor abre teclado nativo.
export function numberStepper({ value, step, unit, onChange, min = 0 }) {
  const display = el('input', {
    class: 'stepper-value',
    type: 'number',
    inputmode: 'decimal',
    value: value ?? '',
    placeholder: '—'
  });
  display.addEventListener('change', () => {
    const v = display.value === '' ? null : Number(display.value);
    onChange(v);
  });

  const dec = el('button', {
    class: 'stepper-btn', type: 'button', 'aria-label': `restar ${step}`,
    text: '−',
    onClick: () => {
      const current = Number(display.value) || 0;
      const next = Math.max(min, roundStep(current - step));
      display.value = next;
      onChange(next);
    }
  });

  const inc = el('button', {
    class: 'stepper-btn', type: 'button', 'aria-label': `sumar ${step}`,
    text: '+',
    onClick: () => {
      const current = Number(display.value) || 0;
      const next = roundStep(current + step);
      display.value = next;
      onChange(next);
    }
  });

  const wrap = el('div', { class: 'stepper' }, [
    dec,
    el('div', { class: 'stepper-field' }, [
      display,
      unit ? el('span', { class: 'stepper-unit', text: unit }) : null
    ]),
    inc
  ]);
  return wrap;
}

function roundStep(n) {
  return Math.round(n * 100) / 100;
}

// Chips de RPE 5-10, un tap selecciona.
export function rpeChips({ value, onChange }) {
  const wrap = el('div', { class: 'rpe-chips' });
  for (let r = 5; r <= 10; r++) {
    const chip = el('button', {
      class: `chip${value === r ? ' chip--active' : ''}`,
      type: 'button',
      text: String(r),
      onClick: () => {
        wrap.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
        chip.classList.add('chip--active');
        onChange(r);
      }
    });
    wrap.appendChild(chip);
  }
  return wrap;
}

// Tarjeta de una rutina de ejemplo del catálogo (ver plan.js: SEED_PLANS),
// reutilizada tanto en el onboarding de dispositivo nuevo como en el
// selector de plantillas de Ajustes — mismo aspecto, solo cambia el texto
// del botón y qué pasa al elegirla.
export function seedPlanCard(seed, { buttonLabel, onPick }) {
  const card = el('div', { class: 'card' }, [
    el('h3', { text: seed.name }),
    el('p', { class: 'muted', text: `${seed.days.length} días · ${seed.days.map(d => d.name).join(', ')}` })
  ]);
  if (seed.description) {
    card.appendChild(el('p', { class: 'muted onboarding-disclaimer', text: seed.description }));
  }
  card.appendChild(el('button', {
    class: 'btn btn--primary',
    text: buttonLabel,
    onClick: () => onPick(seed)
  }));
  return card;
}

export function toast(message, ms = 2200) {
  const node = el('div', { class: 'toast', text: message });
  document.body.appendChild(node);
  requestAnimationFrame(() => node.classList.add('toast--visible'));
  setTimeout(() => {
    node.classList.remove('toast--visible');
    setTimeout(() => node.remove(), 250);
  }, ms);
}
