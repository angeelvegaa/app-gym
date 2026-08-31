// Aviso de "hay una versión nueva, toca para actualizar". No se prueba a
// través del ciclo de vida real del service worker: las herramientas de
// Playwright no permiten interceptar la petición del propio script del SW
// (ni page.route ni context.route la capturan), así que se invoca
// directamente showUpdateBanner() -- exportada solo para esto -- lo que
// reproduce exactamente el mismo DOM/CSS que produce el flujo real.
import { test, expect } from '@playwright/test';
import { seedApp } from './helpers.js';

async function triggerUpdateBanner(page) {
  await page.evaluate(async () => {
    const mod = await import('/js/app.js');
    mod.showUpdateBanner();
  });
  return page.locator('.update-banner');
}

test('el botón de actualizar es visible y pulsable en vertical', async ({ page }) => {
  await seedApp(page, { blockStart: '2026-01-05' });
  await page.goto('/');

  const banner = await triggerUpdateBanner(page);
  await expect(banner).toBeVisible();

  const button = page.locator('.update-banner-btn');
  await expect(button).toBeVisible();

  // .click() falla si el elemento no es realmente accionable (fuera del
  // viewport, tapado por otro elemento, etc.), y esperar a que la página
  // recargue de verdad confirma que el tap llegó al manejador real, no solo
  // que el elemento existe en el DOM.
  await Promise.all([page.waitForEvent('load'), button.click()]);
});

test('el botón de actualizar sigue siendo pulsable en horizontal (referencia ya sabida buena)', async ({ page }) => {
  await seedApp(page, { blockStart: '2026-01-05' });
  const size = page.viewportSize();
  await page.setViewportSize({ width: size.height, height: size.width });
  await page.goto('/');

  const banner = await triggerUpdateBanner(page);
  await expect(banner).toBeVisible();
  await expect(page.locator('.update-banner-btn')).toBeVisible();
});

test('el botón queda por debajo del área segura superior (notch / isla dinámica) en vertical', async ({ page, context, browserName }) => {
  // El override numérico de env(safe-area-inset-top) solo existe vía CDP de
  // Chromium (Emulation.setSafeAreaInsetsOverride); WebKit no expone nada
  // equivalente en Playwright, así que la comprobación geométrica exacta
  // solo es automatizable en Chromium. El mecanismo (env() estándar de CSS
  // Env Variables) es el mismo motor de renderizado en ambos casos.
  test.skip(browserName !== 'chromium', 'Emulation.setSafeAreaInsetsOverride es solo de Chromium');

  await seedApp(page, { blockStart: '2026-01-05' });
  await page.goto('/');

  const session = await context.newCDPSession(page);
  const SAFE_AREA_TOP = 47; // representativo de isla dinámica / notch de iPhone
  await session.send('Emulation.setSafeAreaInsetsOverride', {
    insets: { top: SAFE_AREA_TOP, bottom: 0, left: 0, right: 0 }
  });

  const banner = await triggerUpdateBanner(page);
  await expect(banner).toBeVisible();

  const button = page.locator('.update-banner-btn');
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  // El botón entero debe quedar por debajo de la zona reservada por el
  // notch/isla dinámica, no solapado con ella.
  expect(box.y).toBeGreaterThanOrEqual(SAFE_AREA_TOP);

  await Promise.all([page.waitForEvent('load'), button.click()]);
});
