// Tres bugs reportados:
// 1. Progreso no juntaba las sesiones de un ejercicio repetido en más de
//    un día del plan (id distinto por día en el catálogo).
// 2. El selector de RPE al registrar una sesión no dejaba bajar de 5,
//    aunque hay ejercicios (p. ej. calentamientos) con objetivo 4.
// 3. Escribir en peso/reps y pulsar el check de "serie completada" sin
//    cerrar antes el teclado numérico (sin blur) perdía lo escrito.
import { test, expect } from '@playwright/test';
import { SEED_PLANS } from '../js/plan.js';
import { buildSettings, buildPlan, DAY_ID } from './helpers.js';

const PPL_SEED = SEED_PLANS.find(s => s.name === 'PPL + Upper/Lower');

function buildActivePplPlan() {
  return {
    schemaVersion: 1,
    plans: { 1: { version: 1, name: PPL_SEED.name, days: JSON.parse(JSON.stringify(PPL_SEED.days)) } },
    activeVersion: 1,
    nextVersion: 2
  };
}

function buildPplSettings(blockStart) {
  const weekdays = {};
  PPL_SEED.days.forEach(d => { weekdays[d.id] = d.weekday; });
  return { schemaVersion: 1, phase: 'definicion', blockStart, weekdays };
}

function doneSession(id, date, dayId, weight) {
  return [id, {
    id, date, dayId, planVersion: 1, block: 1, weekInBlock: 1, phase: 'definicion', status: 'completed',
    entries: { 'extension-cuadriceps-lig': { sets: [{ status: 'done', weight, reps: 15 }], rpe: 6 } },
    reason: null
  }];
}

test('bug 1: Progreso junta las sesiones de un ejercicio repetido en varios días del plan', async ({ page }) => {
  const sessions = Object.fromEntries([
    doneSession('2026-01-05_lower', '2026-01-05', 'lower', 20), // lunes
    doneSession('2026-01-10_legs', '2026-01-10', 'legs', 22)    // sábado, misma semana de bloque
  ]);
  await page.addInitScript(([p, s, se]) => {
    localStorage.setItem('gym.plans', JSON.stringify(p));
    localStorage.setItem('gym.settings', JSON.stringify(s));
    localStorage.setItem('gym.sessions', JSON.stringify({ schemaVersion: 1, sessions: se }));
  }, [buildActivePplPlan(), buildPplSettings('2026-01-05'), sessions]);

  await page.goto('/#/exercises');
  // Un único ejercicio "Extensión de cuádriceps ligera" en la lista, no dos
  // (uno por día), ahora que Lower y Legs comparten id.
  await expect(page.getByText('Extensión de cuádriceps ligera')).toHaveCount(1);

  await page.getByText('Extensión de cuádriceps ligera').click();
  const rows = page.locator('.detail-set-list li');
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: '2026-01-05' })).toHaveCount(1);
  await expect(rows.filter({ hasText: '2026-01-10' })).toHaveCount(1);
});

test('bug 2: el RPE se puede registrar por debajo de 5 (hasta 1)', async ({ page }) => {
  const plan = buildPlan();
  const exercise = plan.plans[1].days[0].exercises[0];
  exercise.rpe = 4; // calentamiento ligero, objetivo 4
  exercise.sets = 1; // el RPE del ejercicio solo se pide con todas las series hechas
  const settings = buildSettings('2026-01-05');
  await page.addInitScript(([p, s]) => {
    localStorage.setItem('gym.plans', JSON.stringify(p));
    localStorage.setItem('gym.settings', JSON.stringify(s));
  }, [plan, settings]);

  await page.clock.install({ time: new Date('2026-01-05T12:00:00') });
  await page.goto('/#/today');
  await page.getByRole('button', { name: 'Empezar entreno' }).click();
  await page.locator('.exercise-header').click();
  await page.locator('.set-check').click();

  const chips = await page.locator('.rpe-chips .chip').allTextContents();
  expect(chips).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);

  await page.locator('.rpe-chips .chip', { hasText: /^4$/ }).click();
  await expect(page.locator('.rpe-chips .chip--active')).toHaveText('4');
});

for (const browserName of ['chromium', 'webkit']) {
  test(`bug 3 (${browserName}): pulsar "serie completada" sin cerrar el teclado numérico no pierde el valor`, async ({ page, browserName: actual }) => {
    test.skip(actual !== browserName, 'una vez por navegador real');
    const plan = buildPlan();
    const settings = buildSettings('2026-01-05');
    await page.addInitScript(([p, s]) => {
      localStorage.setItem('gym.plans', JSON.stringify(p));
      localStorage.setItem('gym.settings', JSON.stringify(s));
    }, [plan, settings]);

    await page.clock.install({ time: new Date('2026-01-05T12:00:00') });
    await page.goto('/#/today');
    await page.getByRole('button', { name: 'Empezar entreno' }).click();
    await page.locator('.exercise-header').click();

    const weightInput = page.locator('.set-row').first().locator('.stepper-value').nth(0);
    const repsInput = page.locator('.set-row').first().locator('.stepper-value').nth(1);
    // Escribe carácter a carácter (como el teclado numérico móvil) y pulsa
    // el check directamente, SIN blur ni Enter antes.
    await weightInput.pressSequentially('62.5', { delay: 20 });
    await repsInput.pressSequentially('8', { delay: 20 });
    const checkBtn = page.locator('.set-check').first();
    await checkBtn.tap();

    await expect(weightInput).toHaveValue('62.5');
    await expect(repsInput).toHaveValue('8');
    await expect(checkBtn).toHaveClass(/set-check--done/);

    // Y queda persistido de verdad, no solo visualmente en el input.
    const saved = await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('gym.sessions'));
      return raw.sessions['2026-01-05_day1'].entries[Object.keys(raw.sessions['2026-01-05_day1'].entries)[0]].sets[0];
    });
    expect(saved).toEqual({ status: 'done', weight: 62.5, reps: 8 });
  });
}
