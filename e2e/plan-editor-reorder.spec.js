import { test, expect } from '@playwright/test';

const plan = {
  schemaVersion: 1,
  plans: { 1: { version: 1, name: 'Test', days: [
    { id: 'd1', name: 'Dia', weekday: 1, warmup: [], exercises: [
      { id: 'a', name: 'Ejercicio A', type: 'strength', sets: 3, repMin: 8, repMax: 12, rpe: 7, unit: 'kg', increment: 2.5 },
      { id: 'b', name: 'Ejercicio B', type: 'strength', sets: 3, repMin: 8, repMax: 12, rpe: 7, unit: 'kg', increment: 2.5 },
      { id: 'c', name: 'Ejercicio C', type: 'strength', sets: 3, repMin: 8, repMax: 12, rpe: 7, unit: 'kg', increment: 2.5 }
    ]}
  ]}},
  activeVersion: 1, nextVersion: 2
};
const settings = { schemaVersion: 1, phase: 'definicion', blockStart: '2026-01-05', weekdays: { d1: 1 } };

test('mover ejercicios arriba/abajo en el editor de rutina reordena la lista', async ({ page }) => {
  await page.addInitScript(([p, s]) => {
    localStorage.setItem('gym.plans', JSON.stringify(p));
    localStorage.setItem('gym.settings', JSON.stringify(s));
  }, [plan, settings]);

  await page.goto('/#/plan-editor/1');
  await page.locator('.plan-editor-days > .exercise-card > .exercise-header').click(); // abrir el día
  const order = () => page.locator('.plan-editor-days .exercise-body .exercise-name').allTextContents();
  await expect.poll(order).toEqual(['Ejercicio A', 'Ejercicio B', 'Ejercicio C']);

  // Expandir "Ejercicio C" (el último) y subirlo dos veces -> pasa a ser el primero.
  await page.locator('.exercise-name', { hasText: 'Ejercicio C' }).click();
  await page.getByRole('button', { name: '▲ Subir' }).click();
  await expect.poll(order).toEqual(['Ejercicio A', 'Ejercicio C', 'Ejercicio B']);
  await page.getByRole('button', { name: '▲ Subir' }).click();
  await expect.poll(order).toEqual(['Ejercicio C', 'Ejercicio A', 'Ejercicio B']);

  // Ya en el borde: subir otra vez no hace nada.
  await page.getByRole('button', { name: '▲ Subir' }).click();
  await expect.poll(order).toEqual(['Ejercicio C', 'Ejercicio A', 'Ejercicio B']);

  // Bajarlo una vez -> vuelve a la posición intermedia.
  await page.getByRole('button', { name: '▼ Bajar' }).click();
  await expect.poll(order).toEqual(['Ejercicio A', 'Ejercicio C', 'Ejercicio B']);

  // Se guarda: al recargar el editor, el orden persiste.
  await page.getByRole('button', { name: 'Guardar rutina' }).click();
  await page.goto('/#/plan-editor/1');
  await page.locator('.plan-editor-days > .exercise-card > .exercise-header').click();
  await expect.poll(order).toEqual(['Ejercicio A', 'Ejercicio C', 'Ejercicio B']);
});
