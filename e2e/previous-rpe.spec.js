// RPE de referencia de la vez anterior, mostrado junto al peso/reps
// precargados de cada serie (sin persistir hasta que se confirma la serie
// actual). Casos:
// 1. RPE por serie en la sesión anterior -> se muestra ese valor exacto.
// 2. Sin ningún RPE previo (ni por serie ni legado) -> no aparece el nodo.
// 3. Solo RPE legado a nivel de sesión completa (formato antiguo, sin RPE
//    por serie) -> se usa como respaldo.
// 4. Serie sin equivalente por índice en la sesión anterior -> no aparece.
// 5. Igual que el caso 4 pero con RPE legado a nivel de sesión completa: el
//    respaldo legado NO debe aplicarse a una serie sin equivalente previo.
import { test, expect } from '@playwright/test';
import { buildPlan, buildSettings, EXERCISE_ID, DAY_ID } from './helpers.js';

const BLOCK_START = '2026-01-05'; // lunes

async function seed(page, sessions = {}) {
  const plan = buildPlan();
  const settings = buildSettings(BLOCK_START);
  await page.addInitScript(([p, s, se]) => {
    localStorage.setItem('gym.plans', JSON.stringify(p));
    localStorage.setItem('gym.settings', JSON.stringify(s));
    localStorage.setItem('gym.sessions', JSON.stringify({ schemaVersion: 1, sessions: se }));
  }, [plan, settings, sessions]);
}

function sessionWithSets(date, sets, { legacyRpe = null, weekInBlock = 2, block = 1 } = {}) {
  const id = `${date}_${DAY_ID}`;
  const entry = { sets };
  if (legacyRpe != null) entry.rpe = legacyRpe;
  return [id, {
    id, date, dayId: DAY_ID, planVersion: 1, block, weekInBlock, phase: 'definicion',
    status: 'completed', entries: { [EXERCISE_ID]: entry }, reason: null
  }];
}

function done(weight, reps, rpe = null) {
  return { status: 'done', weight, reps, rpe };
}

async function openExercise(page) {
  await page.clock.install({ time: new Date('2026-01-12T12:00:00') });
  await page.goto('/#/today');
  await page.getByRole('button', { name: 'Empezar entreno' }).click();
  await page.locator('.exercise-header').click();
}

test('RPE por serie de la sesión anterior se muestra como referencia', async ({ page }) => {
  const sessions = Object.fromEntries([
    sessionWithSets('2026-01-05', [
      done(50, 8, 8),
      done(52.5, 7, 9)
    ])
  ]);
  await seed(page, sessions);
  await openExercise(page);

  const row1 = page.locator('.set-row').nth(0);
  await expect(row1.locator('.set-row-last-rpe')).toHaveText('RPE ant. 8');

  const row2 = page.locator('.set-row').nth(1);
  await expect(row2.locator('.set-row-last-rpe')).toHaveText('RPE ant. 9');
});

test('sin RPE previo (ni por serie ni legado) no aparece ninguna referencia', async ({ page }) => {
  const sessions = Object.fromEntries([
    sessionWithSets('2026-01-05', [
      done(50, 8),
      done(50, 8)
    ])
  ]);
  await seed(page, sessions);
  await openExercise(page);

  const row1 = page.locator('.set-row').nth(0);
  await expect(row1.locator('.set-row-last-rpe')).toHaveCount(0);
});

test('respaldo legado: sin RPE por serie pero con RPE a nivel de sesión completa', async ({ page }) => {
  const sessions = Object.fromEntries([
    sessionWithSets('2026-01-05', [
      { status: 'done', weight: 50, reps: 8 },
      { status: 'done', weight: 50, reps: 8 }
    ], { legacyRpe: 6 })
  ]);
  await seed(page, sessions);
  await openExercise(page);

  const row1 = page.locator('.set-row').nth(0);
  await expect(row1.locator('.set-row-last-rpe')).toHaveText('RPE ant. 6');
});

test('serie sin equivalente por índice en la sesión anterior no muestra referencia', async ({ page }) => {
  // La sesión anterior solo tenía 1 serie; la serie #2 de hoy (idx 1) no
  // tiene lastSet con el que emparejar por posición.
  const sessions = Object.fromEntries([
    sessionWithSets('2026-01-05', [
      done(50, 8, 8)
    ])
  ]);
  await seed(page, sessions);
  await openExercise(page);

  const row1 = page.locator('.set-row').nth(0);
  await expect(row1.locator('.set-row-last-rpe')).toHaveText('RPE ant. 8');

  const row2 = page.locator('.set-row').nth(1);
  await expect(row2.locator('.set-row-last-rpe')).toHaveCount(0);
});

test('el respaldo de RPE legado no se aplica a una serie sin equivalente por índice', async ({ page }) => {
  // La sesión anterior (formato antiguo, sin RPE por serie) solo tenía 1
  // serie con `entry.rpe` legado; hoy el ejercicio tiene 2 series (p. ej.
  // se ampliaron en el plan). La serie #2 de hoy no existía la vez
  // anterior, así que NO debe heredar el RPE legado de la sesión completa.
  const sessions = Object.fromEntries([
    sessionWithSets('2026-01-05', [
      { status: 'done', weight: 50, reps: 8 }
    ], { legacyRpe: 6 })
  ]);
  await seed(page, sessions);
  await openExercise(page);

  const row1 = page.locator('.set-row').nth(0);
  await expect(row1.locator('.set-row-last-rpe')).toHaveText('RPE ant. 6');

  const row2 = page.locator('.set-row').nth(1);
  await expect(row2.locator('.set-row-last-rpe')).toHaveCount(0);
});
