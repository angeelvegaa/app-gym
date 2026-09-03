// Dos cambios en el registro de sesión:
// 1. Nota opcional por ejercicio completo (entry.note), visible en el
//    detalle de sesión del Historial.
// 2. RPE por serie individual (set.rpe) en vez de un único RPE por
//    ejercicio. El motor de sugerencias (js/suggestions.js) usa ahora
//    `effectiveRpe()`: el promedio del RPE de las series completadas de la
//    sesión (con fallback al RPE único de las sesiones antiguas).
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

// Sesión de historial ya cerrada, con RPE por serie (o `rpe` a nivel de
// ejercicio para simular datos de antes de este cambio). weekInBlock fijo a
// 2 ("Subida", sin desplazamiento) en todos los fixtures de reglas para que
// el RPE objetivo se quede fijo en el 7 base del ejercicio de prueba.
function fixtureSession(date, sets, { legacyRpe = null, weekInBlock = 2, block = 1 } = {}) {
  const id = `${date}_${DAY_ID}`;
  const entry = { sets };
  if (legacyRpe != null) entry.rpe = legacyRpe;
  return [id, {
    id, date, dayId: DAY_ID, planVersion: 1, block, weekInBlock, phase: 'definicion',
    status: 'completed', entries: { [EXERCISE_ID]: entry }, reason: null
  }];
}

function done(weight, reps, rpe) {
  return { status: 'done', weight, reps, rpe };
}

function skipped() {
  return { status: 'skipped', weight: null, reps: null, rpe: null };
}

test('registrar una sesión con RPE distinto por serie y una nota de ejercicio, y verlos en el Historial', async ({ page }) => {
  await seed(page);
  await page.clock.install({ time: new Date('2026-01-05T12:00:00') });
  await page.goto('/#/today');
  await page.getByRole('button', { name: 'Empezar entreno' }).click();
  await page.locator('.exercise-header').click();

  const rpeValues = [6, 8, 9];
  for (let i = 0; i < 3; i++) {
    const row = page.locator('.set-row').nth(i);
    const weightInput = row.locator('.stepper-value').nth(0);
    const repsInput = row.locator('.stepper-value').nth(1);
    await weightInput.fill(String(50 + i * 2.5));
    await weightInput.blur();
    await repsInput.fill(String(8 + i));
    await repsInput.blur();
    await row.locator('.set-check').click();

    // El selector de RPE de esa serie solo aparece tras marcarla hecha.
    const rpeRow = page.locator('.set-row').nth(i).locator('.set-row-rpe');
    await expect(rpeRow).toBeVisible();
    await rpeRow.locator('.chip', { hasText: new RegExp(`^${rpeValues[i]}$`) }).click();
    await expect(rpeRow.locator('.chip--active')).toHaveText(String(rpeValues[i]));
  }

  await page.locator('.exercise-note-input').fill('hombro molestaba un poco');

  await page.getByRole('button', { name: 'Terminar entreno' }).click();
  await expect(page).toHaveURL(/#\/today$/);

  // Persistido: cada serie con su propio RPE, y la nota del ejercicio.
  const saved = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('gym.sessions'));
    return raw.sessions['2026-01-05_day1'].entries;
  });
  const entry = saved[Object.keys(saved)[0]];
  expect(entry.sets).toEqual([
    { status: 'done', weight: 50, reps: 8, rpe: 6 },
    { status: 'done', weight: 52.5, reps: 9, rpe: 8 },
    { status: 'done', weight: 55, reps: 10, rpe: 9 }
  ]);
  expect(entry.note).toBe('hombro molestaba un poco');

  // Y se ve bien en el detalle de sesión del Historial.
  await page.goto('/#/session-detail/2026-01-05_day1');
  const card = page.locator('.card').first();
  await expect(card.getByText('Serie 1: 50 × 8 · RPE 6')).toBeVisible();
  await expect(card.getByText('Serie 2: 52.5 × 9 · RPE 8')).toBeVisible();
  await expect(card.getByText('Serie 3: 55 × 10 · RPE 9')).toBeVisible();
  // Promedio (6+8+9)/3 = 7.666... -> "7.7".
  await expect(card.getByText('RPE medio: 7.7')).toBeVisible();
  await expect(card.getByText('Nota: hombro molestaba un poco')).toBeVisible();
});

test('R0 · sin datos suficientes: con una sola sesión no hay sugerencias todavía', async ({ page }) => {
  const sessions = Object.fromEntries([
    fixtureSession('2026-01-05', [done(50, 10, 5), done(50, 10, 6), done(50, 10, 7)])
  ]);
  await seed(page, sessions);
  await page.goto(`/#/exercise/${EXERCISE_ID}`);
  await expect(page.locator('.suggestion-list')).toContainText('Registra 2 sesiones para recibir sugerencias en este ejercicio.');
});

test('R1 · progreso: sube de peso con RPE medio bajo y reps al máximo', async ({ page }) => {
  const sets = [done(50, 10, 5), done(50, 10, 6), done(50, 10, 7)]; // media 6
  const sessions = Object.fromEntries([
    fixtureSession('2026-01-05', sets),
    fixtureSession('2026-01-12', sets)
  ]);
  await seed(page, sessions);
  await page.goto(`/#/exercise/${EXERCISE_ID}`);
  await expect(page.locator('.suggestion-list')).toContainText('Sube a 52.5kg en Press banca test.');
});

test('R2 · estancamiento: mismo peso y reps 4 sesiones seguidas', async ({ page }) => {
  const sets = [done(50, 8, 7), done(50, 8, 7), done(50, 8, 7)]; // media 7 = target, no dispara R5
  const sessions = Object.fromEntries([
    fixtureSession('2026-01-05', sets),
    fixtureSession('2026-01-12', sets),
    fixtureSession('2026-01-19', sets),
    fixtureSession('2026-01-26', sets)
  ]);
  await seed(page, sessions);
  await page.goto(`/#/exercise/${EXERCISE_ID}`);
  await expect(page.locator('.suggestion-list')).toContainText(
    'Mantener carga en definición ya es progreso; si quieres, prueba +1 rep.'
  );
});

test('R3 · retroceso: RPE medio alto y reps por debajo del mínimo', async ({ page }) => {
  const sets = [done(50, 4, 8), done(50, 4, 9), done(50, 4, 9)]; // media 8.67
  const sessions = Object.fromEntries([
    fixtureSession('2026-01-05', sets),
    fixtureSession('2026-01-12', sets)
  ]);
  await seed(page, sessions);
  await page.goto(`/#/exercise/${EXERCISE_ID}`);
  await expect(page.locator('.suggestion-list')).toContainText(
    'Normal en definición: ajusta expectativas o baja un 5-10%.'
  );
});

test('R4 · series saltadas: 2 o más series sin completar entre las 2 últimas sesiones', async ({ page }) => {
  const sessions = Object.fromEntries([
    fixtureSession('2026-01-05', [skipped(), skipped(), done(50, 8, 7)]),
    fixtureSession('2026-01-12', [done(50, 8, 7), done(50, 8, 7), done(50, 8, 7)])
  ]);
  await seed(page, sessions);
  await page.goto(`/#/exercise/${EXERCISE_ID}`);
  await expect(page.locator('.suggestion-list')).toContainText(
    'Llevas varias series sin completar en Press banca test: ¿demasiado volumen o poco descanso?'
  );
});

test('R5 · RPE objetivo bajo: RPE medio bajo pero sin llegar al máximo de reps (no dispara R1)', async ({ page }) => {
  const sets = [done(50, 8, 5), done(50, 8, 6), done(50, 8, 6)]; // media 5.67, reps 8 < repMax 10
  const sessions = Object.fromEntries([
    fixtureSession('2026-01-05', sets),
    fixtureSession('2026-01-12', sets)
  ]);
  await seed(page, sessions);
  await page.goto(`/#/exercise/${EXERCISE_ID}`);
  await expect(page.locator('.suggestion-list')).toContainText(
    'Podrías subir la RPE objetivo de 7 a 8 en Press banca test.'
  );
});

test('sesiones antiguas sin RPE por serie siguen usando su RPE único como respaldo', async ({ page }) => {
  // Formato de antes de este cambio: sin `rpe` en las series, solo a nivel
  // de ejercicio. effectiveRpe() debe caer de vuelta a ese valor.
  const legacySets = [
    { status: 'done', weight: 50, reps: 10 },
    { status: 'done', weight: 50, reps: 10 },
    { status: 'done', weight: 50, reps: 10 }
  ];
  const sessions = Object.fromEntries([
    fixtureSession('2026-01-05', legacySets, { legacyRpe: 6 }),
    fixtureSession('2026-01-12', legacySets, { legacyRpe: 6 })
  ]);
  await seed(page, sessions);
  await page.goto(`/#/exercise/${EXERCISE_ID}`);
  await expect(page.locator('.suggestion-list')).toContainText('Sube a 52.5kg en Press banca test.');
});
