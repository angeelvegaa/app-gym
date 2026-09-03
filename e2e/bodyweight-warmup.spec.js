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

async function logBodyweightExercise(card, repsBySet) {
  await card.locator('.exercise-header').click();
  await expect(card.locator('.set-row')).toHaveCount(repsBySet.length);
  for (let i = 0; i < repsBySet.length; i++) {
    const repsInput = card.locator('.set-row').nth(i).locator('.stepper-value');
    await expect(card.locator('.set-row').nth(i).locator('.stepper')).toHaveCount(1); // solo reps, sin peso
    await repsInput.fill(String(repsBySet[i]));
    await repsInput.blur();
    await card.locator('.set-check').nth(i).click();
  }
}

// Registra "Six Way de hombro" (2 series) y "Fondos en paralelas ligeros"
// (2 series) en el día ya abierto (#/session/...), sin tocar peso.
async function logWarmupExercises(page, { sixWayReps, fondosReps }) {
  const sixWay = page.locator('.exercise-card', { has: page.locator('.exercise-name', { hasText: 'Six Way de hombro' }) });
  await logBodyweightExercise(sixWay, sixWayReps);

  const fondos = page.locator('.exercise-card', { has: page.locator('.exercise-name', { hasText: 'Fondos en paralelas ligeros' }) });
  await logBodyweightExercise(fondos, fondosReps);
}

test('registrar Six Way y Fondos en paralelas como series/reps sin peso, en Push y Upper, y ver su historial combinado en Progreso', async ({ page }) => {
  await seedActivePpl(page);

  // Push, lunes: Six Way 10/11 reps por vuelta, Fondos 9/8 reps.
  await page.clock.install({ time: new Date('2026-01-05T12:00:00') }); // lunes
  await page.goto('/#/today');
  await page.getByRole('button', { name: 'Empezar entreno' }).click();
  await logWarmupExercises(page, { sixWayReps: [10, 11], fondosReps: [9, 8] });
  await page.getByRole('button', { name: 'Terminar entreno' }).click();

  // Upper, jueves: Six Way 11/12 reps, Fondos 10/9 reps.
  await page.clock.setFixedTime(new Date('2026-01-08T12:00:00')); // jueves
  await page.goto('/#/today');
  await page.getByRole('button', { name: 'Empezar entreno' }).click();
  await logWarmupExercises(page, { sixWayReps: [11, 12], fondosReps: [10, 9] });
  await page.getByRole('button', { name: 'Terminar entreno' }).click();

  // Persistido sin peso (weight: null) y con las reps tal cual se escribieron.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gym.sessions')).sessions);
  expect(saved['2026-01-05_push'].entries['six-way'].sets).toEqual([
    { status: 'done', weight: null, reps: 10, rpe: null },
    { status: 'done', weight: null, reps: 11, rpe: null }
  ]);
  expect(saved['2026-01-05_push'].entries['fondos-ligeros'].sets).toEqual([
    { status: 'done', weight: null, reps: 9, rpe: null },
    { status: 'done', weight: null, reps: 8, rpe: null }
  ]);
  expect(saved['2026-01-08_upper'].entries['six-way'].sets).toEqual([
    { status: 'done', weight: null, reps: 11, rpe: null },
    { status: 'done', weight: null, reps: 12, rpe: null }
  ]);

  // Progreso: ambos aparecen en la lista (antes, tipo "warmup", no aparecían).
  await page.goto('/#/exercises');
  await expect(page.getByText('Six Way de hombro')).toHaveCount(1);
  await expect(page.getByText('Fondos en paralelas ligeros')).toHaveCount(1);

  // Six Way: mismo id en Push y Upper -> las 2 sesiones se juntan (mejor
  // serie de cada sesión: 11 el lunes, 12 el jueves).
  await page.getByText('Six Way de hombro').click();
  const sixWayRows = page.locator('.detail-set-list li');
  await expect(sixWayRows).toHaveCount(2);
  await expect(sixWayRows.filter({ hasText: '2026-01-05' })).toContainText('11 reps');
  await expect(sixWayRows.filter({ hasText: '2026-01-08' })).toContainText('12 reps');
  // Con 2 sesiones ya hay gráfico (necesita al menos 2 puntos).
  await expect(page.locator('.progress-chart')).toBeVisible();

  await page.getByRole('button', { name: '← Ejercicios' }).click();
  await page.getByText('Fondos en paralelas ligeros').click();
  const fondosRows = page.locator('.detail-set-list li');
  await expect(fondosRows).toHaveCount(2);
  await expect(fondosRows.filter({ hasText: '2026-01-05' })).toContainText('9 reps'); // mejor serie: 9
  await expect(fondosRows.filter({ hasText: '2026-01-08' })).toContainText('10 reps');
});
