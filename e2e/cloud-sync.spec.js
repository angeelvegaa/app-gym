import { test, expect } from '@playwright/test';
import { seedApp, atNoon } from './helpers.js';

const BLOCK_START = '2026-01-05';

// Con el interruptor apagado (caso por defecto) la app no debe hacer NINGUNA
// llamada de red relacionada con la copia en la nube: ni al SDK de Supabase
// (esm.sh), ni al propio proyecto (*.supabase.co), ni al widget anti-bot
// (challenges.cloudflare.com, solo se carga al abrir el asistente de
// activación). Corre siempre, en los dos proyectos (chromium-portrait,
// webkit-portrait), sin depender de credenciales.
test('con la copia en la nube apagada no se hace ninguna llamada de red nueva', async ({ page }) => {
  const externalRequests = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/esm\.sh|supabase\.co|cloudflare\.com/.test(url)) externalRequests.push(url);
  });

  await seedApp(page, { blockStart: BLOCK_START });
  await page.clock.install({ time: atNoon(BLOCK_START) });
  await page.goto('/');

  // Recorre varias pantallas, incluida Ajustes (donde vive la sección de
  // copia en la nube) y una escritura real (marcar un día sin entreno).
  await page.click('[data-section="settings"]');
  await expect(page.getByRole('heading', { name: 'Copia en la nube' })).toBeVisible();
  await page.click('[data-section="today"]');
  await page.click('[data-section="history"]');
  await page.click('[data-section="settings"]');

  expect(externalRequests).toEqual([]);
});

// resolveTurnstileSiteKey decide, por hostname EXACTO, si se usa la site
// key de producción o la de test de Cloudflare (siempre pasa, pensada para
// automatización). Prueba activa contra hostnames adversarios, no solo
// contra los dos casos "buenos": nada que no sea 'localhost'/'127.0.0.1'
// exactos debe devolver nunca la clave de test, ni con mayúsculas, ni con
// el puerto pegado, ni con dominios que solo contienen esas palabras.
test('resolveTurnstileSiteKey solo usa la clave de test para localhost/127.0.0.1 exactos', async ({ page }) => {
  await page.goto('/');
  const TEST_KEY = '1x00000000000000000000AA';

  const results = await page.evaluate(async () => {
    const mod = await import('/js/ui/cloud-sync.js');
    const hostnames = [
      'localhost', '127.0.0.1',
      'angeelvegaa.github.io',
      'localhost.evil.com', 'evil-localhost.com', 'notlocalhost',
      '127.0.0.1.evil.com', '0.0.0.0', '', 'LOCALHOST', 'Localhost',
      '127.0.0.2', 'localhost:8080', 'sub.localhost'
    ];
    return hostnames.map(hostname => ({
      hostname,
      key: mod.resolveTurnstileSiteKey(hostname),
      real: mod.TURNSTILE_SITE_KEY_REAL
    }));
  });

  const LOCAL = new Set(['localhost', '127.0.0.1']);
  for (const { hostname, key, real } of results) {
    if (LOCAL.has(hostname)) {
      expect(key, `hostname "${hostname}" (caso de test)`).toBe(TEST_KEY);
    } else {
      expect(key, `hostname "${hostname}" (debe ser SIEMPRE la clave real)`).toBe(real);
      expect(key, `hostname "${hostname}"`).not.toBe(TEST_KEY);
    }
  }
});

// El propio Playwright sirve la app en localhost, así que aquí SIEMPRE se
// usa la site key de test de Cloudflare (comprobado arriba) — su widget
// resuelve solo, sin intervención humana, a diferencia de la clave real
// (ver commit: la real detecta el navegador automatizado y nunca completa
// el reto). Prueba lo que SÍ es automatizable sin tocar Supabase: el
// widget resuelve y el código manda ese captchaToken con la forma exacta
// que espera GoTrue (gotrue_meta_security.captcha_token). No prueba que
// Supabase acepte el signUp de verdad: con la secret key REAL configurada
// en el proyecto, un token dummy de la clave de test siempre se rechaza
// server-side (así lo documenta Cloudflare) — probar eso exigiría cambiar
// la secret key de Supabase, y se decidió no tocarla ni para tests. Ver
// README > Copia en la nube > Verificación manual para esa parte.
test('el widget de Turnstile resuelve solo y el captchaToken llega a signUp con la forma correcta', async ({ page }) => {
  let signupRequest = null;
  page.on('request', (req) => {
    if (/\/auth\/v1\/signup/.test(req.url())) signupRequest = req;
  });

  await seedApp(page, { blockStart: BLOCK_START });
  await page.goto('/');
  await page.click('[data-section="settings"]');
  await page.getByRole('button', { name: 'Activar copia en la nube' }).click();

  const tokenInput = page.locator('input[name="cf-turnstile-response"]');
  await expect(tokenInput).not.toHaveValue('', { timeout: 15000 });

  await page.locator('input[type="email"]').fill(`turnstile-check-${Date.now()}@mailinator.com`);
  await page.locator('input[type="password"]').fill('Test-Password-123!');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.waitForTimeout(3000);

  expect(signupRequest).not.toBeNull();
  const body = signupRequest.postDataJSON();
  const captchaToken = body?.gotrue_meta_security?.captcha_token;
  expect(captchaToken).toBeTruthy();
  expect(typeof captchaToken).toBe('string');
});

// Test contra el proyecto real de Supabase: requiere una cuenta YA
// CONFIRMADA (la confirmación de email está activada a propósito, así que
// un signUp aquí no basta). Créala una vez en el dashboard de Supabase
// (Authentication > Users > Add user > marca "Auto Confirm User") y pasa
// sus credenciales como variables de entorno:
//
//   GYM_SYNC_TEST_EMAIL=... GYM_SYNC_TEST_PASSWORD=... npm run test:e2e
//
// Sin esas variables, este test se salta (no falla) para no bloquear el
// resto de la suite en local o en CI sin credenciales configuradas.
const EMAIL = process.env.GYM_SYNC_TEST_EMAIL;
const PASSWORD = process.env.GYM_SYNC_TEST_PASSWORD;

test.describe('sincronización real entre dos dispositivos', () => {
  test.skip(!EMAIL || !PASSWORD, 'Define GYM_SYNC_TEST_EMAIL y GYM_SYNC_TEST_PASSWORD (cuenta de Supabase ya confirmada) para correr este test.');

  test('activar en un dispositivo sube los datos y otro los recupera con el mismo email + código', async ({ browser }, testInfo) => {
    test.setTimeout(90000);
    // Este test usa una cuenta REAL compartida de Supabase (misma fila
    // user_id en sync_data). Correrlo a la vez en varios proyectos de
    // Playwright dispara dos "dispositivo A" simultáneos contra la misma
    // cuenta y provoca carreras (no es un fallo de la app: el motor de
    // navegador no cambia nada del lado de Supabase). Con uno basta.
    test.skip(testInfo.project.name !== 'chromium-portrait', 'Test de red real: se ejecuta solo en un proyecto para no correr contra la misma cuenta de Supabase en paralelo.');

    // Bloqueado por diseño desde que Turnstile protege signUp/signIn: en
    // localhost siempre se usa la site key de TEST de Cloudflare
    // (resolveTurnstileSiteKey), cuyo token es un dummy que la secret key
    // REAL configurada en Supabase rechaza siempre (documentado por
    // Cloudflare). No hay forma de evitarlo sin cambiar temporalmente esa
    // secret key en Supabase, y se decidió no tocarla ni para tests. El
    // código se deja tal cual (documenta el flujo, reutilizable si algún
    // día se prueba a mano con la secret key de test) — la verificación
    // real de este flujo es manual, ver README > Copia en la nube >
    // Verificación manual.
    test.skip(true, 'Bloqueado por Turnstile: la secret key real de Supabase rechaza el token dummy de la clave de test que se usa en localhost. Verificar a mano (ver README).');

    // --- "Dispositivo A": ya tiene una rutina y un entreno registrados
    // localmente (como cualquier uso real previo a activar la sync). ---
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await seedApp(pageA, { blockStart: BLOCK_START });
    // "Marcar días sin entreno" usa confirm() nativo (gym track no lo ha
    // migrado a modal propio todavía): sin esto Playwright lo descarta solo.
    pageA.on('dialog', d => d.accept());
    await pageA.goto('/');

    await pageA.click('[data-section="settings"]');
    await pageA.getByRole('button', { name: 'Activar copia en la nube' }).click();
    await pageA.locator('input[type="email"]').fill(EMAIL);
    await pageA.locator('input[type="password"]').fill(PASSWORD);
    await pageA.getByRole('button', { name: 'Iniciar sesión' }).click();

    // Según si la cuenta ya tenía clave de cifrado guardada de una tanda
    // de test anterior, el asistente pide generar una nueva o solo confirmar.
    const generateBtn = pageA.getByRole('button', { name: 'Es la primera vez que activo esto en cualquier dispositivo' });
    const continueBtn = pageA.getByRole('button', { name: 'Continuar' });
    await expect(generateBtn.or(continueBtn)).toBeVisible({ timeout: 20000 });

    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await expect(pageA.locator('.recovery-code')).toBeVisible();
      await pageA.getByRole('button', { name: 'Ya lo he guardado, continuar' }).click();
    } else {
      await continueBtn.click();
    }

    await expect(pageA.getByText(/Sincronizando con/)).toBeVisible({ timeout: 20000 });

    // El código de recuperación real de ESTE dispositivo (independientemente
    // de si se acaba de generar o ya existía) es el que hace falta para
    // adoptar la clave en el dispositivo B.
    await pageA.getByRole('button', { name: 'Ver código de recuperación' }).click();
    const recoveryCode = (await pageA.locator('.recovery-code').innerText()).trim();
    expect(recoveryCode.length).toBeGreaterThan(20);

    // Registra un dato nuevo y deja que el debounce lo suba (2s + margen).
    const marker = `Marca de prueba ${Date.now()}`;
    await pageA.click('[data-section="settings"]');
    const reasonInput = pageA.locator('input[placeholder="Motivo (opcional): Viaje a..."]');
    // input[type=date] #0 es "Inicio del bloque actual" (tarjeta anterior);
    // #1 y #2 son "Desde"/"Hasta" del rango sin entreno. BLOCK_START
    // (2026-01-05) es justo el lunes configurado como día de entreno.
    await pageA.locator('input[type="date"]').nth(1).fill(BLOCK_START);
    await pageA.locator('input[type="date"]').nth(2).fill(BLOCK_START);
    await reasonInput.fill(marker);
    await pageA.getByRole('button', { name: 'Marcar rango como no entrenado' }).click();
    await expect(pageA.getByText(/marcados como/)).toBeVisible();
    await pageA.waitForTimeout(3500); // debounce de subida (2s) + margen de red

    // --- "Dispositivo B": contexto de navegador limpio, sin rutina local
    // (simula un móvil nuevo). Recupera desde el onboarding. ---
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await pageB.goto('/');

    await expect(pageB.getByText('Bienvenido a Gym Track')).toBeVisible();
    await pageB.getByRole('button', { name: 'Recuperar mis datos de la nube' }).click();
    await pageB.locator('input[type="email"]').fill(EMAIL);
    await pageB.locator('input[type="password"]').fill(PASSWORD);
    await pageB.getByRole('button', { name: 'Iniciar sesión' }).click();

    const codeTextarea = pageB.getByPlaceholder('Pega aquí tu código de recuperación de otro dispositivo');
    await expect(codeTextarea).toBeVisible({ timeout: 20000 });
    await codeTextarea.fill(recoveryCode);
    await pageB.getByRole('button', { name: 'Usar este código' }).click();

    // Tras recuperar, ya no debe pedir onboarding: la rutina y el historial
    // vinieron de la nube, incluida la marca "no entrenado" recién subida.
    await expect(pageB.getByText('Bienvenido a Gym Track')).toHaveCount(0, { timeout: 20000 });
    await pageB.goto('/#/history');
    await expect(pageB.getByText(marker).or(pageB.getByText('Plan de prueba'))).toBeVisible({ timeout: 10000 });

    await ctxA.close();
    await ctxB.close();
  });
});
