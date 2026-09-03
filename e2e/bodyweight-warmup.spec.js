// "Six Way de hombro" y "Fondos en paralelas ligeros" (Push y Upper de PPL
// + Upper/Lower) pasan de calentamiento (hecho/no hecho) a ejercicios de
// peso corporal con series y reps, visibles en Progreso con su histórico
// de repeticiones — comparten id entre Push y Upper (mismo ejercicio).
import { test, expect } from '@playwright/test';
import { SEED_PLANS } from '../js/plan.js';

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

async function seedActivePpl(page) {
  await page.addInitScript(([p, s]) => {
    localStorage.setItem('gym.plans', JSON.stringify(p));
    localStorage.setItem('gym.settings', JSON.stringify(s));
  }, [buildActivePplPlan(), buildPplSettings('2026-01-05')]);
}

// Registra "Six Way de hombro" (1 serie) y "Fondos en paralelas ligeros"
// (2 series) en el día ya abierto (#/session/...), sin tocar peso.
async function logWarmupExercises(page, { sixWayReps, fondosReps }) {
  const sixWay = page.locator('.exercise-card', { has: page.locator('.exercise-name', { hasText: 'Six Way de hombro' }) });
  await sixWay.locator('.exercise-header').click();
  await expect(sixWay.locator('.set-row .stepper')).toHaveCount(1); // solo el de reps, sin peso
  const sixWayReps1 = sixWay.locator('.set-row').first().locator('.stepper-value');
  await sixWayReps1.fill(String(sixWayReps));
  await sixWayReps1.blur();
  await sixWay.locator('.set-check').click();

  const fondos = page.locator('.exercise-card', { has: page.locator('.exercise-name', { hasText: 'Fondos en paralelas ligeros' }) });
  await fondos.locator('.exercise-header').click();
  await expect(fondos.locator('.set-row')).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    const repsInput = fondos.locator('.set-row').nth(i).locator('.stepper-value');
    await expect(fondos.locator('.set-row').nth(i).locator('.stepper')).toHaveCount(1); // sin peso
    await repsInput.fill(String(fondosReps[i]));
    await repsInput.blur();
    await fondos.locator('.set-check').nth(i).click();
  }
}

test('registrar Six Way y Fondos en paralelas como series/reps sin peso, en Push y Upper, y ver su historial combinado en Progreso', async ({ page }) => {
  await seedActivePpl(page);

  // Push, lunes: 1 vuelta de Six Way, Fondos 9/8 reps.
  await page.clock.install({ time: new Date('2026-01-05T12:00:00') }); // lunes
  await page.goto('/#/today');
  await page.getByRole('button', { name: 'Empezar entreno' }).click();
  await logWarmupExercises(page, { sixWayReps: 1, fondosReps: [9, 8] });
  await page.getByRole('button', { name: 'Terminar entreno' }).click();

  // Upper, jueves: 2 vueltas de Six Way ese día, Fondos 10/9 reps.
  await page.clock.setFixedTime(new Date('2026-01-08T12:00:00')); // jueves
  await page.goto('/#/today');
  await page.getByRole('button', { name: 'Empezar entreno' }).click();
  await logWarmupExercises(page, { sixWayReps: 2, fondosReps: [10, 9] });
  await page.getByRole('button', { name: 'Terminar entreno' }).click();

  // Persistido sin peso (weight: null) y con las reps tal cual se escribieron.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gym.sessions')).sessions);
  expect(saved['2026-01-05_push'].entries['six-way'].sets).toEqual([{ status: 'done', weight: null, reps: 1 }]);
  expect(saved['2026-01-05_push'].entries['fondos-ligeros'].sets).toEqual([
    { status: 'done', weight: null, reps: 9 },
    { status: 'done', weight: null, reps: 8 }
  ]);
  expect(saved['2026-01-08_upper'].entries['six-way'].sets).toEqual([{ status: 'done', weight: null, reps: 2 }]);

  // Progreso: ambos aparecen en la lista (antes, tipo "warmup", no aparecían).
  await page.goto('/#/exercises');
  await expect(page.getByText('Six Way de hombro')).toHaveCount(1);
  await expect(page.getByText('Fondos en paralelas ligeros')).toHaveCount(1);

  // Six Way: mismo id en Push y Upper -> las 2 sesiones se juntan.
  await page.getByText('Six Way de hombro').click();
  const sixWayRows = page.locator('.detail-set-list li');
  await expect(sixWayRows).toHaveCount(2);
  await expect(sixWayRows.filter({ hasText: '2026-01-05' })).toContainText('1 reps');
  await expect(sixWayRows.filter({ hasText: '2026-01-08' })).toContainText('2 reps');
  // Con 2 sesiones ya hay gráfico (necesita al menos 2 puntos).
  await expect(page.locator('.progress-chart')).toBeVisible();

  await page.getByRole('button', { name: '← Ejercicios' }).click();
  await page.getByText('Fondos en paralelas ligeros').click();
  const fondosRows = page.locator('.detail-set-list li');
  await expect(fondosRows).toHaveCount(2);
  await expect(fondosRows.filter({ hasText: '2026-01-05' })).toContainText('9 reps'); // mejor serie: 9
  await expect(fondosRows.filter({ hasText: '2026-01-08' })).toContainText('10 reps');
});
