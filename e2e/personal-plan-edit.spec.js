// Añadir "Antebrazo en barra" a la copia YA ACTIVA de "PPL + Upper/Lower"
// (no a la plantilla del catálogo) usando el editor de rutinas real, tal
// como lo haría el usuario desde Ajustes > Mis rutinas > Editar. Verifica
// que se registra en segundos (no en reps), sin RPE objetivo fijo, al
// final de Martes (Pull) y Sábado (Legs), sin tocar el catálogo ni el
// historial ya existente.
import { test, expect } from '@playwright/test';
import { SEED_PLANS } from '../js/plan.js';
import { atNoon } from './helpers.js';

const PPL_SEED = SEED_PLANS.find(s => s.name === 'PPL + Upper/Lower');
const OLD_SESSION_DATE = '2026-01-05'; // lunes, día Push
const OLD_SESSION_ID = `${OLD_SESSION_DATE}_push`;

function buildActivePplPlan() {
  // Copia tal cual del catálogo, como si el dispositivo la hubiera elegido
  // en el onboarding — el propio JSON.parse/stringify evita que ambos
  // objetos compartan referencias con SEED_PLANS.
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

function buildOldPushSession() {
  return {
    id: OLD_SESSION_ID,
    date: OLD_SESSION_DATE,
    dayId: 'push',
    planVersion: 1,
    block: 1,
    weekInBlock: 1,
    phase: 'definicion',
    status: 'completed',
    entries: {},
    reason: null
  };
}

async function seedActivePpl(page) {
  await page.addInitScript(([plansData, settingsData, sessionsData]) => {
    localStorage.setItem('gym.plans', JSON.stringify(plansData));
    localStorage.setItem('gym.settings', JSON.stringify(settingsData));
    localStorage.setItem('gym.sessions', JSON.stringify({ schemaVersion: 1, sessions: sessionsData }));
  }, [buildActivePplPlan(), buildPplSettings(OLD_SESSION_DATE), { [OLD_SESSION_ID]: buildOldPushSession() }]);
}

async function addAntebrazoToDay(page, dayName) {
  const dayHeader = page.locator('.plan-editor-days > .exercise-card > .exercise-header').filter({ hasText: dayName });
  await dayHeader.click();
  await page.getByRole('button', { name: '+ Añadir ejercicio' }).click();

  const field = (label) => page.locator('.editor-field', { hasText: label }).locator('input');
  await field('Nombre del ejercicio').fill('Antebrazo en barra');
  await field('Nombre del ejercicio').blur();
  await field('Series').fill('3');
  await field('Series').blur();
  await field('Reps mínimas').fill('30');
  await field('Reps mínimas').blur();
  await field('Reps máximas').fill('30');
  await field('Reps máximas').blur();
  await field('RPE objetivo').fill('');
  await field('RPE objetivo').blur();
  await field('Unidad de la repetición').fill('s');
  await field('Unidad de la repetición').blur();
}

test('añade "Antebrazo en barra" a Martes y Sábado, se registra en segundos y no toca el historial anterior', async ({ page }) => {
  await seedActivePpl(page);
  await page.goto('/#/settings');

  await page.locator('.plan-row', { hasText: 'PPL + Upper/Lower' }).getByRole('button', { name: 'Editar' }).click();
  await addAntebrazoToDay(page, 'Pull');
  await addAntebrazoToDay(page, 'Legs (pesado)');
  await page.getByRole('button', { name: 'Guardar rutina' }).click();
  await expect(page).toHaveURL(/#\/settings$/);

  // "Mi rutina": al final de ambos días, "3 series · 30s", sin RPE.
  await page.goto('/#/routine');
  await page.getByRole('button', { name: /^Martes — Pull/ }).click();
  await expect(page.locator('.routine-item').last().locator('.routine-ex-name')).toHaveText('Antebrazo en barra');
  await expect(page.locator('.routine-item').last().locator('.routine-ex-detail')).toHaveText('3 series · 30s');
  await page.getByRole('button', { name: '← Mi rutina' }).click();

  await page.getByRole('button', { name: /^Sábado — Legs \(pesado\)/ }).click();
  await expect(page.locator('.routine-item').last().locator('.routine-ex-name')).toHaveText('Antebrazo en barra');
  await expect(page.locator('.routine-item').last().locator('.routine-ex-detail')).toHaveText('3 series · 30s');

  // Registrar una sesión de martes (Pull) con las 3 series en SEGUNDOS.
  await page.clock.install({ time: atNoon('2026-01-06') }); // martes
  await page.goto('/#/today');
  await page.getByRole('button', { name: 'Empezar entreno' }).click();

  const exCard = page.locator('.exercise-card', { has: page.locator('.exercise-name', { hasText: 'Antebrazo en barra' }) });
  await exCard.locator('.exercise-header').click();

  // La segunda columna de cada serie está en segundos ("s"), no en "reps".
  await expect(exCard.locator('.set-row').first().locator('.stepper-unit').nth(1)).toHaveText('s');

  for (let i = 0; i < 3; i++) {
    const row = exCard.locator('.set-row').nth(i);
    const weightInput = row.locator('.stepper-value').nth(0);
    const secondsInput = row.locator('.stepper-value').nth(1);
    await weightInput.fill('0');
    await weightInput.blur();
    await secondsInput.fill('30');
    await secondsInput.blur();
    await row.locator('.set-check').click();
  }

  await page.getByRole('button', { name: 'Terminar entreno' }).click();
  await expect(page).toHaveURL(/#\/today$/);

  // El historial anterior (Push del lunes) sigue exactamente igual.
  const oldSessionStillThere = await page.evaluate((id) => {
    const raw = JSON.parse(localStorage.getItem('gym.sessions'));
    return raw.sessions[id];
  }, OLD_SESSION_ID);
  expect(oldSessionStillThere).toMatchObject({ id: OLD_SESSION_ID, date: OLD_SESSION_DATE, dayId: 'push', status: 'completed' });

  // La sesión nueva quedó guardada con 3 series de 0kg × 30s.
  const newSession = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('gym.sessions'));
    return raw.sessions['2026-01-06_pull'];
  });
  expect(newSession.status).toBe('completed');
  expect(newSession.entries['antebrazo-en-barra'].sets).toEqual([
    { status: 'done', weight: 0, reps: 30 },
    { status: 'done', weight: 0, reps: 30 },
    { status: 'done', weight: 0, reps: 30 }
  ]);

  // Y también se ve en el historial de la app.
  await page.goto('/#/history');
  await page.getByRole('button', { name: /enero 2026/i }).click();
  await page.getByRole('button', { name: /semana 1 de 4/i }).click();
  await page.getByText('2026-01-06').click();
  await expect(page.getByText('Antebrazo en barra')).toBeVisible();
  await expect(page.getByText('Serie 1: 0 × 30')).toBeVisible();
});

test('la plantilla "PPL + Upper/Lower" del catálogo no se ve afectada', async ({ page }) => {
  // Contexto/página nuevos (sin nada seedeado): dispositivo genuinamente
  // nuevo, fuerza el onboarding con el catálogo tal cual.
  await page.goto('/');
  const card = page.locator('.card', { has: page.getByRole('heading', { name: 'PPL + Upper/Lower' }) });
  await card.getByRole('button', { name: 'Usar esta rutina' }).click();

  await page.goto('/#/routine');
  await page.getByRole('button', { name: /^Martes — Pull/ }).click();
  const pullRows = page.locator('.routine-item');
  await expect(pullRows).toHaveCount(5);
  await expect(pullRows.last().locator('.routine-ex-name')).toHaveText('Curl de bíceps');
  await page.getByRole('button', { name: '← Mi rutina' }).click();

  await page.getByRole('button', { name: /^Sábado — Legs \(pesado\)/ }).click();
  const legsRows = page.locator('.routine-item');
  await expect(legsRows).toHaveCount(9); // 1 calentamiento + 8 ejercicios
  await expect(legsRows.last().locator('.routine-ex-name')).toHaveText('Mi rutina de abs (5 min)');
});
