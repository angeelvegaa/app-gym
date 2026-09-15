// Cronómetro de descanso entre series: opt-in (interruptor en Ajustes,
// apagado por defecto). Con el interruptor apagado la app debe comportarse
// exactamente igual que antes de esta funcionalidad — sin rastro del
// cronómetro ni de la fila de edición de descanso en ningún sitio (ver el
// último test, el caso negativo).
import { test, expect } from '@playwright/test';
import { buildPlan, buildSettings, EXERCISE_ID, DAY_ID } from './helpers.js';

const BLOCK_START = '2026-01-05'; // lunes
const SESSION_ID = `${BLOCK_START}_${DAY_ID}`;

// Siembra localStorage SOLO si la clave está vacía todavía (comprobado
// dentro del propio init script, que se re-ejecuta en cada navegación,
// recarga incluida). Así la primera carga arranca con datos limpios, pero
// una recarga posterior no le pisa a la app lo que ella misma haya guardado
// mientras tanto (el toggle de ajustes, una serie marcada, un descanso
// editado...) — igual que le pasaría a un uso real, donde nada vuelve a
// sembrar el storage en cada arranque.
async function seed(page, { restTimerEnabled = false } = {}) {
  const plan = buildPlan();
  const settings = { ...buildSettings(BLOCK_START), restTimerEnabled };
  await page.addInitScript(([p, s]) => {
    if (!localStorage.getItem('gym.plans')) localStorage.setItem('gym.plans', JSON.stringify(p));
    if (!localStorage.getItem('gym.settings')) localStorage.setItem('gym.settings', JSON.stringify(s));
    if (!localStorage.getItem('gym.sessions')) {
      localStorage.setItem('gym.sessions', JSON.stringify({ schemaVersion: 1, sessions: {} }));
    }
  }, [plan, settings]);
}

// Va a Hoy, arranca la sesión del día de prueba y expande su único
// ejercicio (de fuerza), dejando visibles sus filas de serie.
async function startSessionExpanded(page) {
  await page.goto('/#/today');
  await page.getByRole('button', { name: 'Empezar entreno' }).click();
  await page.locator('.exercise-header').click();
}

test.describe('Cronómetro de descanso', () => {
  test('activar el interruptor en Ajustes persiste en localStorage', async ({ page }) => {
    await seed(page);
    await page.goto('/#/settings');

    const checkbox = page.getByLabel('activar cronómetro de descanso entre series');
    await expect(checkbox).not.toBeChecked();
    await checkbox.check();

    await page.reload();
    const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('gym.settings')));
    expect(settings.restTimerEnabled).toBe(true);
    await expect(page.getByLabel('activar cronómetro de descanso entre series')).toBeChecked();
  });

  test('marcar una serie como hecha arranca el cronómetro con cuenta atrás', async ({ page }) => {
    await seed(page, { restTimerEnabled: true });
    await page.clock.install({ time: new Date('2026-01-05T12:00:00') });
    await startSessionExpanded(page);

    // Antes de completar ninguna serie el cronómetro ni siquiera existe en
    // el DOM (rest-timer.js no crea el nodo hasta la primera start()).
    await expect(page.locator('.rest-timer')).toHaveCount(0);

    await page.locator('.set-row').first().locator('.set-check').click();

    const timer = page.locator('.rest-timer');
    await expect(timer).toHaveClass(/rest-timer--visible/);
    // repMax 10 (<=12) -> 120s de descanso por defecto (ver plan.js).
    await expect(timer.locator('.rest-timer-time')).toHaveText('2:00');

    await page.clock.fastForward('00:05');
    await expect(timer.locator('.rest-timer-time')).toHaveText('1:55');

    await page.clock.fastForward('02:00');
    await expect(timer).toHaveClass(/rest-timer--done/);
    await expect(timer.locator('.rest-timer-time')).toHaveText('¡Listo!');
    // "Pausar" no tiene nada que hacer con la cuenta atrás ya en 0.
    await expect(timer.locator('.rest-timer-btn').first()).toBeDisabled();
  });

  test('no deja guardar un descanso negativo escrito a mano', async ({ page }) => {
    await seed(page, { restTimerEnabled: true });
    await page.clock.install({ time: new Date('2026-01-05T12:00:00') });
    await startSessionExpanded(page);

    const restInput = page.locator('.rest-edit-row .stepper-value');
    await restInput.fill('-30');
    await restInput.blur();

    // El campo se corrige solo a 0, y "Guardar en el plan" ya no puede
    // colar el valor negativo que se llegó a escribir.
    await expect(restInput).toHaveValue('0');
    await page.getByRole('button', { name: 'Guardar en el plan' }).click();
    const planRestSeconds = await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('gym.plans'));
      return raw.plans[1].days[0].exercises[0].restSeconds;
    });
    expect(planRestSeconds).toBe(0);
  });

  test('editar el descanso puntual de un ejercicio persiste solo para hoy', async ({ page }) => {
    await seed(page, { restTimerEnabled: true });
    await page.clock.install({ time: new Date('2026-01-05T12:00:00') });
    await startSessionExpanded(page);

    const restInput = page.locator('.rest-edit-row .stepper-value');
    await restInput.fill('45');
    await restInput.blur();

    await page.reload();
    const restSeconds = await page.evaluate((sessionId) => {
      const raw = JSON.parse(localStorage.getItem('gym.sessions'));
      const entries = raw.sessions[sessionId].entries;
      return entries[Object.keys(entries)[0]].restSeconds;
    }, SESSION_ID);
    expect(restSeconds).toBe(45);

    // Cambio puntual: la rutina guardada no se ha tocado.
    const planRestSeconds = await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('gym.plans'));
      return raw.plans[1].days[0].exercises[0].restSeconds;
    });
    expect(planRestSeconds).toBeUndefined();
  });

  test('"Guardar en el plan" hace el cambio permanente', async ({ page }) => {
    await seed(page, { restTimerEnabled: true });
    await page.clock.install({ time: new Date('2026-01-05T12:00:00') });
    await startSessionExpanded(page);

    const restInput = page.locator('.rest-edit-row .stepper-value');
    await restInput.fill('150');
    await restInput.blur();

    await page.getByRole('button', { name: 'Guardar en el plan' }).click();
    await expect(page.locator('.toast')).toHaveText('Descanso guardado en el plan');

    const planRestSeconds = await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('gym.plans'));
      return raw.plans[1].days[0].exercises[0].restSeconds;
    });
    expect(planRestSeconds).toBe(150);
  });

  test('pausar, reanudar y cerrar el cronómetro manualmente', async ({ page }) => {
    await seed(page, { restTimerEnabled: true });
    await page.clock.install({ time: new Date('2026-01-05T12:00:00') });
    await startSessionExpanded(page);

    await page.locator('.set-row').first().locator('.set-check').click();
    const timer = page.locator('.rest-timer');
    await expect(timer).toHaveClass(/rest-timer--visible/);

    const pauseBtn = timer.locator('.rest-timer-btn').first();
    await expect(pauseBtn).toHaveText('Pausar');
    await pauseBtn.click();
    await expect(pauseBtn).toHaveText('Reanudar');

    // En pausa, el tiempo mostrado no avanza aunque pase el reloj.
    const pausedText = await timer.locator('.rest-timer-time').textContent();
    await page.clock.fastForward('00:10');
    await expect(timer.locator('.rest-timer-time')).toHaveText(pausedText);

    await pauseBtn.click();
    await expect(pauseBtn).toHaveText('Pausar');

    await timer.locator('.rest-timer-btn--close').click();
    await expect(timer).not.toHaveClass(/rest-timer--visible/);
  });

  test('con el interruptor desactivado no aparece ningún rastro del cronómetro', async ({ page }) => {
    await seed(page); // restTimerEnabled queda en false, el valor por defecto
    await page.clock.install({ time: new Date('2026-01-05T12:00:00') });
    await startSessionExpanded(page);

    await expect(page.locator('.rest-edit-row')).toHaveCount(0);

    await page.locator('.set-row').first().locator('.set-check').click();

    await expect(page.locator('.rest-timer')).toHaveCount(0);
  });
});
