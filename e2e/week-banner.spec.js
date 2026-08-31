import { test, expect } from '@playwright/test';
import { seedApp, atNoon, addDays } from './helpers.js';

const BLOCK_START = '2026-01-05'; // lunes: día 1 de la semana 1 del bloque

const WEEK_CASES = [
  { weekInBlock: 1, dateStr: BLOCK_START, message: 'Empieza el bloque — volumen base' },
  { weekInBlock: 2, dateStr: addDays(BLOCK_START, 7), message: 'Semana 2 — toca apretar un poco más' },
  { weekInBlock: 3, dateStr: addDays(BLOCK_START, 14), message: 'Semana 3 — semana de pico, dale caña' },
  { weekInBlock: 4, dateStr: addDays(BLOCK_START, 21), message: 'Semana 4 — deload, toca bajar el ritmo' }
];

for (const { weekInBlock, dateStr, message } of WEEK_CASES) {
  test(`muestra el aviso de semana ${weekInBlock} el día exacto en que arranca`, async ({ page }) => {
    await seedApp(page, { blockStart: BLOCK_START });
    await page.clock.install({ time: atNoon(dateStr) });

    await page.goto('/');

    const banner = page.locator('.week-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(message);
  });
}

test('no muestra ningún aviso un día que no es cambio de semana', async ({ page }) => {
  await seedApp(page, { blockStart: BLOCK_START });
  // Un día cualquiera a mitad de la semana 1 (no múltiplo de 7 desde el inicio del bloque).
  await page.clock.install({ time: atNoon(addDays(BLOCK_START, 3)) });

  await page.goto('/');

  await expect(page.locator('.week-banner')).toHaveCount(0);
});

test('el aviso solo aparece la primera vez que se abre la app ese día', async ({ page }) => {
  const weekTwo = addDays(BLOCK_START, 7);
  await seedApp(page, { blockStart: BLOCK_START });
  await page.clock.install({ time: atNoon(weekTwo) });

  await page.goto('/');
  await expect(page.locator('.week-banner')).toBeVisible();

  // Cerrar y "reabrir" la app (recarga) el mismo día: no debe volver a aparecer.
  await page.reload();
  await expect(page.locator('.week-banner')).toHaveCount(0);

  // Navegar dentro de la app tampoco debe reaparecerlo.
  await page.getByRole('button', { name: 'Historial' }).click();
  await expect(page.locator('.week-banner')).toHaveCount(0);
});

test('vuelve a aparecer al día siguiente si también es cambio de semana', async ({ page }) => {
  const weekTwo = addDays(BLOCK_START, 7);
  const weekThree = addDays(BLOCK_START, 14);
  await seedApp(page, { blockStart: BLOCK_START });
  await page.clock.install({ time: atNoon(weekTwo) });

  await page.goto('/');
  await expect(page.locator('.week-banner')).toContainText('Semana 2');

  await page.clock.setFixedTime(atNoon(weekThree));
  await page.reload();

  await expect(page.locator('.week-banner')).toContainText('Semana 3');
});

test('el aviso sigue apareciendo el día correcto tras el cambio de hora de primavera', async ({ page }) => {
  // Bloque arrancado antes del cambio de hora (29 marzo 2026 en España): al
  // restar fechas locales, esa hora que se pierde puede colar un día de
  // menos en el recuento y desplazar para siempre el día en que se dispara
  // el aviso. blockStart un lunes de marzo; la semana 4 empieza ya en abril,
  // con el cambio de hora de por medio.
  const dstBlockStart = '2026-03-02'; // lunes
  const blockTwoStart = addDays(dstBlockStart, 28); // 2026-03-30, justo tras el cambio de hora del día 29
  await seedApp(page, { blockStart: dstBlockStart });
  await page.clock.install({ time: atNoon(blockTwoStart) });

  await page.goto('/');

  const banner = page.locator('.week-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Empieza el bloque — volumen base');
});

test('se puede cerrar manualmente con la X', async ({ page }) => {
  const weekTwo = addDays(BLOCK_START, 7);
  await seedApp(page, { blockStart: BLOCK_START });
  await page.clock.install({ time: atNoon(weekTwo) });

  await page.goto('/');
  const banner = page.locator('.week-banner');
  await expect(banner).toBeVisible();

  await page.locator('.week-banner-close').click();
  await expect(banner).toHaveCount(0);
});
