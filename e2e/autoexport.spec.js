// ?autoexport=1: vista de solo lectura en texto plano para una
// automatización externa (ver js/autoexport.js). Comprueba que:
// 1. Sin el parámetro, la app se comporta exactamente igual que siempre.
// 2. Con el parámetro, se sustituye toda la interfaz por un <pre> con el
//    resumen y no se dispara ninguna llamada de red nueva (ni al service
//    worker ni a la copia en la nube).
import { test, expect } from '@playwright/test';
import { seedApp, buildSession, atNoon } from './helpers.js';

const BLOCK_START = '2026-08-03'; // lunes

test.describe('autoexport', () => {
  test('sin ?autoexport=1 la app funciona como siempre', async ({ page }) => {
    await seedApp(page, {
      blockStart: BLOCK_START,
      sessions: [buildSession('2026-08-31', 1, 1, 60)]
    });
    await page.clock.install({ time: atNoon('2026-08-31') });
    await page.goto('/');

    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeVisible();
    await expect(page.locator('pre')).toHaveCount(0);
  });

  test('con ?autoexport=1 se muestra solo texto plano con el resumen local', async ({ page }) => {
    await seedApp(page, {
      blockStart: BLOCK_START,
      sessions: [buildSession('2026-08-31', 1, 1, 60)]
    });
    await page.clock.install({ time: atNoon('2026-08-31') });

    const requests = [];
    page.on('request', req => requests.push(req.url()));

    await page.goto('/?autoexport=1');

    // Ni cabecera, ni navegación, ni interfaz normal.
    await expect(page.locator('.app-header')).toHaveCount(0);
    await expect(page.locator('.bottom-nav')).toHaveCount(0);

    const pre = page.locator('pre');
    await expect(pre).toBeVisible();
    const text = await pre.textContent();

    expect(text).toContain('GYM TRACK — EXPORT AUTOMÁTICO');
    expect(text).toContain('2026-08-31');
    expect(text).toContain('Press banca test');
    expect(text).toContain('60kgx8');
    expect(text).toContain('Sesiones registradas: 1');

    // Sin llamadas de red nuevas: ni service worker ni nada externo,
    // solo los propios recursos estáticos de la página (html/css/js).
    const unexpected = requests.filter(url => !url.startsWith('http://localhost:8080/'));
    expect(unexpected).toEqual([]);
    expect(requests.some(url => url.includes('sw.js'))).toBe(false);
  });

  test('?autoexport=1 sin datos locales no rompe y lo indica', async ({ page }) => {
    await page.goto('/?autoexport=1');
    const text = await page.locator('pre').textContent();
    expect(text).toContain('Sin sesiones registradas en este periodo');
  });
});
