// UI de "Copia en la nube": la tarjeta de Ajustes (activar/ver
// código/desactivar) y el asistente de activación en sí, reutilizado tal
// cual desde el onboarding para poder recuperar datos en un dispositivo
// genuinamente nuevo (ver onboarding.js) sin duplicar el flujo.
import { el, clear, toast } from './components.js';
import * as sync from '../sync.js';

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

  render();

  function render() {
    clear(container);
    container.appendChild(build());
  }

  function build() {
    const wrap = el('div', {});
    if (error) wrap.appendChild(el('p', { class: 'muted', text: `⚠ ${error}` }));

    if (step === 'auth') {
      const emailInput = el('input', { type: 'email', class: 'settings-date', placeholder: 'tu@email.com', value: email, autocomplete: 'email' });
      const passwordInput = el('input', { type: 'password', class: 'settings-date', placeholder: 'Contraseña', autocomplete: 'current-password' });
      emailInput.addEventListener('input', () => { email = emailInput.value; });

      wrap.appendChild(el('div', { class: 'settings-row' }, [el('span', { text: 'Email' }), emailInput]));
      wrap.appendChild(el('div', { class: 'settings-row' }, [el('span', { text: 'Contraseña' }), passwordInput]));

      const runAuth = async (fn) => {
        if (busy) return;
        if (!emailInput.value || !passwordInput.value) {
          error = 'Rellena email y contraseña.';
          render();
          return;
        }
        busy = true;
        error = null;
        render();
        try {
          const result = await fn(emailInput.value.trim(), passwordInput.value);
          busy = false;
          if (result.confirmEmailRequired) {
            error = 'Cuenta creada. Revisa tu email para confirmarla y luego vuelve aquí e inicia sesión.';
            render();
            return;
          }
          email = result.email;
          step = sync.hasEncryptionKey() ? 'ready' : 'key-choice';
          render();
        } catch (err) {
          busy = false;
          error = translateAuthError(err);
          render();
        }
      };

      wrap.appendChild(el('div', { class: 'plan-row-actions' }, [
        el('button', { class: 'btn btn--secondary btn--small', text: busy ? '...' : 'Crear cuenta', onClick: () => runAuth(sync.signUp) }),
        el('button', { class: 'btn btn--secondary btn--small', text: busy ? '...' : 'Iniciar sesión', onClick: () => runAuth(sync.signIn) })
      ]));
      wrap.appendChild(el('button', { class: 'btn btn--ghost btn--small', text: 'Cancelar', onClick: () => onCancel() }));
      return wrap;
    }

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
      wrap.appendChild(el('button', { class: 'btn btn--ghost btn--small', text: 'Cancelar', onClick: () => onCancel() }));
      return wrap;
    }

    if (step === 'show-code') {
      wrap.appendChild(el('p', {
        text: 'Guarda este código de recuperación en un sitio seguro (Notas, gestor de contraseñas) AHORA. Es la única forma de recuperar tus datos si borras los datos del navegador o cambias de dispositivo — nadie puede recuperarlo por ti.'
      }));
      wrap.appendChild(el('div', { class: 'recovery-code', text: generatedCode }));
      wrap.appendChild(el('button', { class: 'btn btn--primary', text: 'Ya lo he guardado, continuar', onClick: finish }));
      return wrap;
    }

    if (step === 'ready') {
      wrap.appendChild(el('p', { class: 'muted', text: 'Este dispositivo ya tiene una clave de cifrado configurada.' }));
      wrap.appendChild(el('button', { class: 'btn btn--primary', text: 'Continuar', onClick: finish }));
      return wrap;
    }

    return wrap;
  }

  async function finish() {
    try {
      await sync.finishActivation(email);
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
