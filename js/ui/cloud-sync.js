// UI de "Copia en la nube": la tarjeta de Ajustes (activar/ver
// código/desactivar) y el asistente de activación en sí, reutilizado tal
// cual desde el onboarding para poder recuperar datos en un dispositivo
// genuinamente nuevo (ver onboarding.js) sin duplicar el flujo.
import { el, clear, toast } from './components.js';
import * as sync from '../sync.js';

// Ambas son públicas (site keys, no secretas — seguro exponerlas en el
// código): la real, y la de test oficial de Cloudflare ("visible widget,
// siempre pasa", ver developers.cloudflare.com/turnstile/troubleshooting/testing/).
// Las site keys de producción de Turnstile rechazan resolver el reto desde
// un navegador controlado por Playwright (detección de bot integrada en el
// propio widget) — no hay forma de probar el flujo end-to-end en CI/local
// contra la clave real, así que ahí se usa la de test.
export const TURNSTILE_SITE_KEY_REAL = '0x4AAAAAAEroqMIQUWfcnssE';
const TURNSTILE_SITE_KEY_TEST = '1x00000000000000000000AA';
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

// SOLO estos dos hostnames exactos (no prefijos, no "incluye"): son los
// únicos con los que Playwright sirve esta app en local (playwright.config.js,
// baseURL 'http://localhost:8080'). GitHub Pages nunca sirve la app real bajo
// el hostname literal "localhost"/"127.0.0.1" — son direcciones de loopback,
// no dominios enrutables — así que no hay forma de que un visitante real de
// la app en producción caiga aquí; solo alguien corriendo su propia copia
// local de los archivos, que no afecta ni protege al sitio real.
const LOCAL_TEST_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

export function resolveTurnstileSiteKey(hostname) {
  return LOCAL_TEST_HOSTNAMES.has(hostname) ? TURNSTILE_SITE_KEY_TEST : TURNSTILE_SITE_KEY_REAL;
}

const TURNSTILE_SITE_KEY = resolveTurnstileSiteKey(window.location.hostname);

// Cacheado a nivel de módulo: si el asistente se abre, se cancela y se
// vuelve a abrir, el script solo se inyecta una vez.
let turnstileScriptPromise = null;
function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar la verificación anti-bot.'));
      document.head.appendChild(script);
    });
  }
  return turnstileScriptPromise;
}

// Igual que templatesOpen en settings.js: se reinicia solo al salir de
// Ajustes, no hace falta persistirlo.
let wizardOpen = false;
let revealCode = false;
let confirmDisable = false;

export function renderCloudSyncCard(root, renderSettings, navigate) {
  const status = sync.getStatus();
  const wrap = el('div', { class: 'card' }, [
    el('h4', { text: 'Copia en la nube' })
  ]);

  if (!status.enabled) {
    wrap.appendChild(el('p', {
      class: 'muted',
      text: 'Opcional y apagada por defecto: si no la activas, la app sigue funcionando 100% local, sin conexión ninguna. Al activarla, tus datos se cifran en este dispositivo y se guardan en la nube para poder recuperarlos en otro.'
    }));

    if (!wizardOpen) {
      wrap.appendChild(el('button', {
        class: 'btn btn--secondary',
        text: 'Activar copia en la nube',
        onClick: () => {
          wizardOpen = true;
          renderSettings(root, navigate);
        }
      }));
    } else {
      const wizardContainer = el('div', {});
      wrap.appendChild(wizardContainer);
      mountCloudSyncWizard(wizardContainer, {
        initialEmail: status.email || '',
        onCancel: () => { wizardOpen = false; renderSettings(root, navigate); },
        onDone: () => {
          wizardOpen = false;
          toast('Copia en la nube activada');
          renderSettings(root, navigate);
        }
      });
    }
    return wrap;
  }

  wrap.appendChild(el('p', { text: `Sincronizando con ${status.email || 'tu cuenta'}.` }));

  wrap.appendChild(el('button', {
    class: 'btn btn--secondary btn--small',
    text: revealCode ? 'Ocultar código de recuperación' : 'Ver código de recuperación',
    onClick: () => {
      revealCode = !revealCode;
      renderSettings(root, navigate);
    }
  }));
  if (revealCode) {
    wrap.appendChild(el('p', {
      class: 'muted',
      text: 'Guárdalo en un sitio seguro (Notas, gestor de contraseñas). Es la única forma de recuperar tus datos ya sincronizados en un dispositivo nuevo — nadie puede recuperarlo por ti.'
    }));
    wrap.appendChild(el('div', { class: 'recovery-code', text: sync.getRecoveryCode() || '' }));
  }

  if (!confirmDisable) {
    wrap.appendChild(el('button', {
      class: 'btn btn--ghost btn--small',
      text: 'Desactivar copia en la nube',
      onClick: () => {
        confirmDisable = true;
        renderSettings(root, navigate);
      }
    }));
  } else {
    wrap.appendChild(el('p', { class: 'muted', text: 'Este dispositivo deja de sincronizar. Tus datos siguen tal cual en la nube y en este dispositivo.' }));
    wrap.appendChild(el('div', { class: 'plan-row-actions' }, [
      el('button', {
        class: 'btn btn--danger btn--small',
        text: 'Sí, desactivar',
        onClick: async () => {
          await sync.disable();
          confirmDisable = false;
          revealCode = false;
          toast('Copia en la nube desactivada');
          renderSettings(root, navigate);
        }
      }),
      el('button', {
        class: 'btn btn--secondary btn--small',
        text: 'Cancelar',
        onClick: () => {
          confirmDisable = false;
          renderSettings(root, navigate);
        }
      })
    ]));
  }

  return wrap;
}

// Asistente de 2-3 pasos (email+contraseña -> clave de cifrado -> listo),
// autocontenido: gestiona su propio estado y solo repinta `container`, así
// que sirve igual embebido en Ajustes que en el onboarding de un
// dispositivo nuevo (ver onboarding.js "Recuperar mis datos").
export function mountCloudSyncWizard(container, { initialEmail = '', onCancel, onDone }) {
  let step = 'auth'; // 'auth' | 'key-choice' | 'show-code' | 'ready'
  let email = initialEmail;
  let busy = false;
  let error = null;
  let generatedCode = null;
  let captchaToken = null;
  let turnstileWidgetId = null;

  // El widget de Turnstile vive en un nodo fijo, sibling del contenido que
  // sí se repinta en cada render() (topWrap/bottomWrap): si estuviera
  // dentro de ese contenido, cada tecla en el email/contraseña lo
  // destruiría y recrearía (clear() lo borra del DOM), reiniciando la
  // verificación. Solo se muestra durante el paso 'auth'.
  clear(container);
  const topWrap = el('div', {});
  const turnstileSlot = el('div', { class: 'turnstile-slot' });
  const bottomWrap = el('div', {});
  container.appendChild(topWrap);
  container.appendChild(turnstileSlot);
  container.appendChild(bottomWrap);

  mountTurnstile();
  render();

  async function mountTurnstile() {
    try {
      await loadTurnstileScript();
      if (turnstileWidgetId !== null) return;
      turnstileWidgetId = window.turnstile.render(turnstileSlot, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => { captchaToken = token; },
        'expired-callback': () => { captchaToken = null; },
        'error-callback': () => { captchaToken = null; }
      });
    } catch (err) {
      console.warn('turnstile: fallo al cargar la verificación anti-bot', err);
    }
  }

  function resetTurnstile() {
    captchaToken = null;
    if (turnstileWidgetId !== null && window.turnstile) {
      try { window.turnstile.reset(turnstileWidgetId); } catch { /* noop */ }
    }
  }

  function destroyTurnstile() {
    if (turnstileWidgetId !== null && window.turnstile) {
      try { window.turnstile.remove(turnstileWidgetId); } catch { /* noop */ }
      turnstileWidgetId = null;
    }
  }

  function render() {
    turnstileSlot.style.display = step === 'auth' ? '' : 'none';
    clear(topWrap);
    clear(bottomWrap);
    const built = build();
    topWrap.appendChild(built.top);
    bottomWrap.appendChild(built.bottom);
  }

  function build() {
    const top = el('div', {});
    const bottom = el('div', {});
    if (error) top.appendChild(el('p', { class: 'muted', text: `⚠ ${error}` }));

    if (step === 'auth') {
      const emailInput = el('input', { type: 'email', class: 'settings-date', placeholder: 'tu@email.com', value: email, autocomplete: 'email' });
      const passwordInput = el('input', { type: 'password', class: 'settings-date', placeholder: 'Contraseña', autocomplete: 'current-password' });
      emailInput.addEventListener('input', () => { email = emailInput.value; });

      top.appendChild(el('div', { class: 'settings-row' }, [el('span', { text: 'Email' }), emailInput]));
      top.appendChild(el('div', { class: 'settings-row' }, [el('span', { text: 'Contraseña' }), passwordInput]));

      const runAuth = async (fn) => {
        if (busy) return;
        if (!emailInput.value || !passwordInput.value) {
          error = 'Rellena email y contraseña.';
          render();
          return;
        }
        if (!captchaToken) {
          error = 'Completa la verificación anti-bot de arriba antes de continuar.';
          render();
          return;
        }
        busy = true;
        error = null;
        render();
        try {
          const result = await fn(emailInput.value.trim(), passwordInput.value, captchaToken);
          busy = false;
          if (result.confirmEmailRequired) {
            error = 'Cuenta creada. Revisa tu email para confirmarla y luego vuelve aquí e inicia sesión.';
            resetTurnstile();
            render();
            return;
          }
          email = result.email;
          step = sync.hasEncryptionKey() ? 'ready' : 'key-choice';
          render();
        } catch (err) {
          busy = false;
          error = translateAuthError(err);
          // El token de Turnstile es de un solo uso: hace falta uno nuevo
          // para reintentar tras un fallo (email/contraseña incorrectos...).
          resetTurnstile();
          render();
        }
      };

      bottom.appendChild(el('div', { class: 'plan-row-actions' }, [
        el('button', { class: 'btn btn--secondary btn--small', text: busy ? '...' : 'Crear cuenta', onClick: () => runAuth(sync.signUp) }),
        el('button', { class: 'btn btn--secondary btn--small', text: busy ? '...' : 'Iniciar sesión', onClick: () => runAuth(sync.signIn) })
      ]));
      bottom.appendChild(el('button', { class: 'btn btn--ghost btn--small', text: 'Cancelar', onClick: () => { destroyTurnstile(); onCancel(); } }));
      return { top, bottom };
    }

    const wrap = top; // pasos siguientes: todo el contenido va en `top`, sin turnstile.
    if (step === 'key-choice') {
      wrap.appendChild(el('p', {
        class: 'muted',
        text: 'Falta la clave de cifrado: tus datos se cifran en este dispositivo antes de subirlos, nadie más (ni el servidor) puede leerlos sin ella.'
      }));
      wrap.appendChild(el('button', {
        class: 'btn btn--secondary',
        text: 'Es la primera vez que activo esto en cualquier dispositivo',
        onClick: async () => {
          generatedCode = await sync.generateRecoveryCode();
          step = 'show-code';
          render();
        }
      }));
      const codeInput = el('textarea', { class: 'settings-date recovery-input', rows: 3, placeholder: 'Pega aquí tu código de recuperación de otro dispositivo' });
      wrap.appendChild(el('p', { class: 'muted', text: 'O, si ya activaste la sincronización antes en otro dispositivo, pega aquí ese código de recuperación:' }));
      wrap.appendChild(codeInput);
      wrap.appendChild(el('button', {
        class: 'btn btn--secondary',
        text: 'Usar este código',
        onClick: async () => {
          try {
            sync.adoptRecoveryCode(codeInput.value);
            error = null;
            await finish();
          } catch (err) {
            error = err.message;
            render();
          }
        }
      }));
      wrap.appendChild(el('button', { class: 'btn btn--ghost btn--small', text: 'Cancelar', onClick: () => { destroyTurnstile(); onCancel(); } }));
      return { top, bottom };
    }

    if (step === 'show-code') {
      wrap.appendChild(el('p', {
        text: 'Guarda este código de recuperación en un sitio seguro (Notas, gestor de contraseñas) AHORA. Es la única forma de recuperar tus datos si borras los datos del navegador o cambias de dispositivo — nadie puede recuperarlo por ti.'
      }));
      wrap.appendChild(el('div', { class: 'recovery-code', text: generatedCode }));
      wrap.appendChild(el('button', { class: 'btn btn--primary', text: 'Ya lo he guardado, continuar', onClick: finish }));
      return { top, bottom };
    }

    if (step === 'ready') {
      wrap.appendChild(el('p', { class: 'muted', text: 'Este dispositivo ya tiene una clave de cifrado configurada.' }));
      wrap.appendChild(el('button', { class: 'btn btn--primary', text: 'Continuar', onClick: finish }));
      return { top, bottom };
    }

    return { top, bottom };
  }

  async function finish() {
    try {
      await sync.finishActivation(email);
      destroyTurnstile();
      onDone();
    } catch (err) {
      error = err.message;
      render();
    }
  }
}

function translateAuthError(err) {
  const msg = (err && err.message) || '';
  if (/Invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos (o email sin confirmar todavía).';
  if (/User already registered/i.test(msg)) return 'Ya existe una cuenta con ese email. Usa "Iniciar sesión".';
  return msg || 'Ha ocurrido un error. Inténtalo de nuevo.';
}
