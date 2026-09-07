# Gym Track

PWA instalable para registrar el entreno del gimnasio serie a serie. Todo se
guarda en el propio dispositivo (localStorage) y funciona offline, sin backend
ni cuenta — salvo que actives tú mismo la copia en la nube (opcional, apagada
por defecto, ver más abajo).

## Probar en local

Los módulos ES no cargan desde `file://`, hace falta un servidor:

```bash
cd "01"
python3 -m http.server 8080
```

Abrir `http://localhost:8080` en el ordenador. Para instalarla como PWA de verdad
hace falta HTTPS, así que en local solo sirve para revisar la interfaz.

## Desplegar en GitHub Pages

1. Crear un repositorio en GitHub y subir el contenido de esta carpeta.
2. En el repo: **Settings → Pages → Source**, elegir la rama (`main`) y la carpeta raíz (`/`).
3. GitHub genera una URL tipo `https://tu-usuario.github.io/tu-repo/`. Puede tardar
   un par de minutos en estar disponible tras el primer push.
4. Cada vez que hagas cambios: commit + push, y en unos segundos Pages se actualiza.
   Si el móvil no ve los cambios, sube `CACHE_VERSION` en `sw.js` (por ejemplo a
   `gym-v2`) para forzar que el service worker refresque la caché.

## Instalar en el móvil

- **Android (Chrome)**: abrir la URL, menú (⋮) → "Añadir a pantalla de inicio" /
  "Instalar app".
- **iPhone (Safari)**: abrir la URL, botón de compartir (□↑) → "Añadir a pantalla
  de inicio". Safari ignora parte del manifest, por eso el `index.html` incluye
  también las metas `apple-mobile-web-app-*`.

Una vez instalada, abre como una app normal, sin barra de navegador, y funciona
sin conexión.

## Generar los iconos

Los PNG de `icons/` se generan con Node puro (sin dependencias):

```bash
node tools/make-icons.mjs
```

Solo hace falta volver a ejecutarlo si se quiere cambiar el diseño del icono.

## Estructura

- `js/plan.js` — el plan de entrenamiento como datos (días, ejercicios, series objetivo).
- `js/state.js` / `js/storage.js` — sesiones y ajustes, persistidos en localStorage.
- `js/schedule.js` — bloques de 4 semanas, RPE objetivo por semana.
- `js/suggestions.js` — reglas de progresión sobre el historial.
- `js/ui/*.js` — las 4 pantallas (Hoy, Historial, Progreso, Ajustes) más la pantalla de entreno.

## Copia de seguridad

Los datos viven solo en este dispositivo. Desde Ajustes se puede exportar todo
a un JSON y volver a importarlo (por ejemplo al cambiar de móvil).

## Copia en la nube (opcional)

Apagada por defecto: quien no la active tiene la app 100% local, sin ninguna
llamada de red, exactamente igual que antes de que existiera esta función.

Quien la activa desde Ajustes → Copia en la nube:

- Inicia sesión con email + contraseña (Supabase Auth; la confirmación de
  email está activada a propósito, así que tras crear cuenta hay que
  confirmarla por email antes de poder iniciar sesión).
- Genera una clave de cifrado AES-GCM en el dispositivo (Web Crypto), que
  nunca sale de él — solo el dato ya cifrado sube a Supabase. La clave se
  muestra una vez como "código de recuperación": sin guardarlo aparte, no hay
  forma de recuperar los datos ya sincronizados en un dispositivo nuevo (ni
  nosotros podemos hacerlo).
- `js/sync.js` sube (con debounce) cada escritura de `gym.sessions`,
  `gym.settings` y `gym.plans`, y al abrir la app descarga y fusiona por
  "último cambio gana" (sin resolución de conflictos compleja).
- La tabla en Supabase (`sync_data`) tiene RLS: cada cuenta solo puede leer o
  escribir sus propias filas, verificado en la base de datos.
- El formulario de registro/login lleva un widget de Cloudflare Turnstile
  (`js/ui/cloud-sync.js`), para que un bot no pueda agotar la cuota de emails
  de Supabase. El token va como `captchaToken` en `signUp()`/
  `signInWithPassword()`.

Test e2e real contra el proyecto de Supabase (`e2e/cloud-sync.spec.js`):
requiere una cuenta ya confirmada (Dashboard → Authentication → Users → Add
user → "Auto Confirm User") y sus credenciales como variables de entorno:

```bash
GYM_SYNC_TEST_EMAIL=... GYM_SYNC_TEST_PASSWORD=... npm run test:e2e
```

Sin esas variables, ese test se salta solo (no falla el resto de la suite).
Con Turnstile activo, ese test concreto se salta SIEMPRE en local aunque
pongas las credenciales (ver "Verificación manual" abajo — el motivo es de
diseño, no un bug).

### Verificación manual (Turnstile)

`resolveTurnstileSiteKey()` en `js/ui/cloud-sync.js` usa la site key de
producción salvo que `location.hostname` sea exactamente `localhost` o
`127.0.0.1` (así sirve Playwright la app en local), en cuyo caso usa la site
key de test oficial de Cloudflare (siempre resuelve sola, pensada para
automatización). Dos cosas por diseño de Cloudflare/Supabase que ningún test
automatizado puede cubrir desde aquí:

1. **La site key real nunca resuelve sola en un navegador controlado por
   Playwright** (Turnstile detecta el propio user-agent de automatización
   como bot — es la protección funcionando, no un fallo). Por eso en local
   se usa la de test.
2. **El token "dummy" de la site key de test siempre lo rechaza la secret
   key real** configurada en Supabase (documentado por Cloudflare: las
   secret keys de producción solo aceptan tokens reales). Probar el
   `signUp`/`signIn` completo de verdad exigiría cambiar temporalmente esa
   secret key en Supabase por la de test — se decidió no tocarla, ni
   siquiera un momento.

Así que antes de confiar en el conjunto completo (Turnstile real + Supabase
real), hazlo tú mismo a mano, una vez, en la app ya desplegada en GitHub
Pages (no en `localhost`, ahí sale la de test):

1. Abre `https://angeelvegaa.github.io/app-gym/` en un navegador normal.
2. Ajustes → Copia en la nube → Activar. Confirma que ves el widget de
   Turnstile (un check o un cuadro de verificación) y que se resuelve solo o
   con un clic tuyo — no debería quedarse cargando indefinidamente.
3. Regístrate con un email de prueba real (necesitas poder leer su bandeja)
   y una contraseña. Debería decir "Cuenta creada, revisa tu email".
4. Confirma la cuenta desde el email que llegue (el enlace debe llevar a
   `https://angeelvegaa.github.io/app-gym/`, no a un 404 — si no, revisa
   `EMAIL_REDIRECT_TO` en `js/sync.js`).
5. Vuelve a la app, Ajustes → Copia en la nube → Iniciar sesión con ese
   mismo email/contraseña. Si entra y pasa al siguiente paso (clave de
   cifrado), Turnstile + Supabase están funcionando juntos de verdad.
6. Si quieres confirmar también que el CAPTCHA de verdad bloquea intentos
   sin resolver: abre las herramientas de red del navegador, bloquea
   manualmente las peticiones a `challenges.cloudflare.com` y comprueba que
   el registro/login ya no deja avanzar (queda en "Completa la verificación
   anti-bot").

## Ampliar el plan

Para añadir un día nuevo (por ejemplo boxeo) basta con añadir una entrada a
`PLAN.days` en `js/plan.js`. Si el tipo de registro es distinto (asaltos en vez
de series y reps), se añade un `type` nuevo y se gestiona en `js/ui/session.js`
junto a `strength`, `warmup` y `checkbox`. El motor de sugerencias solo mira
ejercicios `strength`, así que los tipos nuevos no lo rompen.
