// Botón "Compartir resumen" en Ajustes (js/ui/settings.js): dispara el
// mismo texto plano que ?autoexport=1, pero desde DENTRO de la app (datos
// reales) vía el share sheet nativo — pensado para que un Atajo de iPhone
// lo reciba como entrada de "Compartir", sin depender de abrir una URL (que
// en iOS aterriza en el almacenamiento aislado de Safari, no el de la PWA
// instalada — ver js/autoexport.js).
import { test, expect } from '@playwright/test';
import { seedApp, buildSession, atNoon } from './helpers.js';

const BLOCK_START = '2026-08-03'; // lunes

async function goToSettings(page) {
  await page.goto('/');
  await page.click('[data-section="settings"]');
  await expect(page.getByRole('heading', { name: 'Exportar para Atajos' })).toBeVisible();
}

test('con navigator.share disponible, comparte el resumen con los datos reales del dispositivo', async ({ page }) => {
  await seedApp(page, {
    blockStart: BLOCK_START,
    sessions: [buildSession('2026-08-31', 1, 1, 60)]
  });
  await page.clock.install({ time: atNoon('2026-08-31') });

  // Stub de navigator.share: captura lo que le pasa el botón, sin abrir de
  // verdad el share sheet nativo (no automatizable).
  await page.addInitScript(() => {
    window.__shareCalls = [];
    navigator.share = async (data) => { window.__shareCalls.push(data); };
  });

  await goToSettings(page);
  await page.click('button:has-text("Compartir resumen")');

  const calls = await page.evaluate(() => window.__shareCalls);
  expect(calls).toHaveLength(1);
  expect(calls[0].text).toContain('GYM TRACK — EXPORT AUTOMÁTICO');
  expect(calls[0].text).toContain('2026-08-31');
  expect(calls[0].text).toContain('Press banca test');
  expect(calls[0].text).toContain('60kgx8');
  expect(calls[0].text).toContain('Sesiones registradas: 1');
});

test('sin navigator.share disponible, cae a copiar al portapapeles', async ({ page }) => {
  await seedApp(page, {
    blockStart: BLOCK_START,
    sessions: [buildSession('2026-08-31', 1, 1, 60)]
  });
  await page.clock.install({ time: atNoon('2026-08-31') });

  await page.addInitScript(() => {
    // `delete navigator.share` no basta: en WebKit "share" vive en
    // Navigator.prototype, no como propiedad propia, así que delete no
    // encuentra nada que borrar (devuelve true igualmente) y el método
    // real del prototipo sigue ahí. Toca sombrearlo con una propia.
    navigator.share = undefined;
    window.__clipboardWrites = [];
    // navigator.clipboard es un getter no configurable en un contexto
    // seguro real (localhost): reemplazar el objeto entero no hace nada (el
    // assignment se ignora en silencio, sin lanzar). Se parchea solo el
    // método sobre la instancia existente en vez de sustituir el objeto.
    if (!navigator.clipboard) navigator.clipboard = {};
    navigator.clipboard.writeText = async (text) => { window.__clipboardWrites.push(text); };
  });

  await goToSettings(page);
  await page.click('button:has-text("Compartir resumen")');

  const writes = await page.evaluate(() => window.__clipboardWrites);
  expect(writes).toHaveLength(1);
  expect(writes[0]).toContain('Press banca test');
  await expect(page.getByText('copiado al portapapeles')).toBeVisible();
});
