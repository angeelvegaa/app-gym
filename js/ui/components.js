// Helpers DOM reutilizables. Sin frameworks: crear elementos a mano.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') {
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

export function toast(message, ms = 2200) {
  const node = el('div', { class: 'toast', text: message });
  document.body.appendChild(node);
  requestAnimationFrame(() => node.classList.add('toast--visible'));
  setTimeout(() => {
    node.classList.remove('toast--visible');
    setTimeout(() => node.remove(), 250);
  }, ms);
}
